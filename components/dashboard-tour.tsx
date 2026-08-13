"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_TOUR_STEPS, MEMBER_TOUR_STEPS, type TourStep } from "@/lib/onboarding-steps";
import { advanceOnboardingStep, completeOnboarding } from "@/lib/actions/onboarding";

type TourContextValue = {
  reportAction: (type: string, detail?: unknown) => void;
  pendingEditModeRequest: boolean;
};

const TourContext = createContext<TourContextValue>({
  reportAction: () => {},
  pendingEditModeRequest: false,
});

// Von DashboardGrid/KpiManager genutzt, um der Tour eine ausgefuehrte Aktion zu
// melden (Kachel verschoben/vergroessert, Kennzahl erstellt/aufs Dashboard
// geholt) bzw. um beim Mounten zu pruefen, ob der aktuell fortgesetzte
// Tour-Schritt den Bearbeiten-Modus vorab benoetigt.
export function useTour() {
  return useContext(TourContext);
}

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(target: string): HTMLElement | null {
  if (target === "kpi-dashboard-toggle") {
    // Kann mehrfach im DOM vorkommen: einmal pro Kennzahlen-Zeile, und seit den
    // responsiven Mobile-/Desktop-Varianten von KpiRow zusaetzlich doppelt pro
    // Zeile (nur eine der beiden per CSS sichtbar). offsetParent ist null bei
    // display:none -- so landet der Spotlight zuverlaessig auf der zuletzt
    // gerenderten UND tatsaechlich sichtbaren Variante, nicht auf einer
    // ausgeblendeten.
    const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`));
    const visible = all.filter((el) => el.offsetParent !== null);
    const pool = visible.length ? visible : all;
    return pool.length ? pool[pool.length - 1] : null;
  }
  return document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
}

function sameRect(a: Rect | null, b: Rect | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

export function TourProvider({
  variant,
  initialStep,
  active,
  children,
}: {
  variant: "admin" | "member";
  initialStep: number;
  active: boolean;
  children: React.ReactNode;
}) {
  const steps = variant === "admin" ? ADMIN_TOUR_STEPS : MEMBER_TOUR_STEPS;
  const [stepIndex, setStepIndex] = useState(() => Math.min(Math.max(initialStep, 0), steps.length - 1));
  const [visible, setVisible] = useState(active);
  const pathname = usePathname();
  const router = useRouter();

  const currentStep: TourStep | null = visible ? steps[stepIndex] ?? null : null;

  function finish() {
    setVisible(false);
    completeOnboarding().catch(() => {});
  }

  function advance() {
    const next = stepIndex + 1;
    if (next >= steps.length) {
      finish();
      return;
    }
    setStepIndex(next);
    advanceOnboardingStep(next).catch(() => {});
  }

  function reportAction(type: string) {
    if (!currentStep || !currentStep.requiredEvent) return;
    if (currentStep.requiredEvent === type) advance();
  }

  // Mitarbeiter-Tour: Seitenwechsel selbst ist die Aktion. Nicht fuer Schritte
  // mit eigenem cta-Button (der Klick darauf loest advance() bereits aus).
  useEffect(() => {
    if (!currentStep || currentStep.requiredEvent || !currentStep.target || currentStep.cta) return;
    if (pathname === currentStep.route) advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, currentStep?.id]);

  function handleCta() {
    if (!currentStep) return;
    if (currentStep.id === "goto-einblicke") router.push("/einblicke");
    if (currentStep.id === "done" && variant === "admin") router.push("/heute");
    advance();
  }

  const value: TourContextValue = {
    reportAction,
    pendingEditModeRequest: !!currentStep?.requiresEditMode,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      {currentStep && <TourBubbleOverlay step={currentStep} pathname={pathname} router={router} onCta={handleCta} />}
    </TourContext.Provider>
  );
}

function TourBubbleOverlay({
  step,
  pathname,
  router,
  onCta,
}: {
  step: TourStep;
  pathname: string | null;
  router: ReturnType<typeof useRouter>;
  onCta: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const scrolledForStepRef = useRef<string | null>(null);

  useEffect(() => setMounted(true), []);

  const onWrongPage = !!step.target && pathname !== step.route;

  useEffect(() => {
    if (!step.target || onWrongPage) {
      setRect(null);
      return;
    }
    // Kein requestAnimationFrame: das feuert nur, solange der Tab tatsaechlich
    // compositet (pausiert z.B. im Hintergrund-Tab oder in Headless-Kontexten)
    // -- ein Intervall haengt nur am JS-Event-Loop und bleibt zuverlaessiger.
    // 150ms genuegt fuer ein weitgehend statisches Zielelement voellig.
    function tick() {
      const el = findTarget(step.target!);
      if (el) {
        const r = el.getBoundingClientRect();
        const next = { top: r.top, left: r.left, width: r.width, height: r.height };
        setRect((prev) => (sameRect(prev, next) ? prev : next));
        if (scrolledForStepRef.current !== step.id) {
          scrolledForStepRef.current = step.id;
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      } else {
        setRect(null);
      }
    }
    tick();
    const interval = setInterval(tick, 150);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, onWrongPage]);

  if (!mounted) return null;

  if (onWrongPage) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
        <TourCard title={step.title} body="Weiter geht's auf einer anderen Seite." cta="Weiter" onCta={() => router.push(step.route)} />
      </div>
    );
  }

  if (!step.target) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
        <TourCard title={step.title} body={step.body} cta={step.cta ?? "Weiter"} onCta={onCta} />
      </div>
    );
  }

  if (!rect) {
    // Zielelement (noch) nicht im DOM -- z.B. Bearbeiten-Modus noch nicht aktiv,
    // oder (Kennzahl-Schritt) das Zielelement selbst wurde durch den Klick
    // darauf ersetzt (Button -> Formular). Bewusst NICHTS rendern statt eines
    // Vollflaechen-Dims: ein blockierendes Overlay ohne Erklaerung wuerde genau
    // die Eingabe verhindern, die als Naechstes noetig ist. Die Tour taucht
    // automatisch wieder auf, sobald das Zielelement erneut gefunden wird oder
    // die erforderliche Aktion (reportAction) den Schritt abschliesst.
    return null;
  }

  const pad = 6;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = Math.max(0, rect.top - pad);
  const left = Math.max(0, rect.left - pad);
  const right = Math.min(vw, rect.left + rect.width + pad);
  const bottom = Math.min(vh, rect.top + rect.height + pad);

  return (
    <>
      <div className="fixed z-[100] bg-black/60" style={{ top: 0, left: 0, width: "100%", height: Math.max(0, top) }} />
      <div className="fixed z-[100] bg-black/60" style={{ top: bottom, left: 0, width: "100%", height: Math.max(0, vh - bottom) }} />
      <div className="fixed z-[100] bg-black/60" style={{ top, left: 0, width: Math.max(0, left), height: Math.max(0, bottom - top) }} />
      <div className="fixed z-[100] bg-black/60" style={{ top, left: right, width: Math.max(0, vw - right), height: Math.max(0, bottom - top) }} />
      <div
        className="fixed z-[101] pointer-events-none rounded-lg ring-2 ring-brand-500"
        style={{ top, left, width: right - left, height: bottom - top }}
      />
      <TourBubble rect={{ top, left, width: right - left, height: bottom - top }} step={step} onCta={step.cta ? onCta : undefined} />
    </>
  );
}

function TourCard({
  title,
  body,
  cta,
  onCta,
}: {
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="w-full max-w-sm rounded-card bg-surface border border-ink-100 shadow-cardHover p-5 space-y-3 transition-opacity duration-150">
      <h3 className="font-display font-semibold text-ink-900">{title}</h3>
      <p className="text-sm text-ink-500">{body}</p>
      <button
        onClick={onCta}
        className="w-full rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 transition-colors"
      >
        {cta}
      </button>
    </div>
  );
}

function TourBubble({ rect, step, onCta }: { rect: Rect; step: TourStep; onCta?: () => void }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mobile = vw < 640;
  const bubbleW = Math.min(300, vw - 32);
  const estHeight = 150;
  const gap = 14;
  const bottomReserve = mobile ? 90 : 16;

  const spaceBelow = vh - (rect.top + rect.height) - bottomReserve;
  const spaceAbove = rect.top - 16;
  const spaceRight = vw - (rect.left + rect.width) - 16;
  const spaceLeft = rect.left - 16;

  let placement: "top" | "bottom" | "left" | "right" = "bottom";
  if (spaceBelow > estHeight) placement = "bottom";
  else if (spaceAbove > estHeight) placement = "top";
  else if (!mobile && spaceRight > bubbleW) placement = "right";
  else if (!mobile && spaceLeft > bubbleW) placement = "left";
  else placement = spaceBelow >= spaceAbove ? "bottom" : "top";

  let top = 0;
  let left = 0;
  if (placement === "bottom") {
    top = rect.top + rect.height + gap;
    left = rect.left + rect.width / 2 - bubbleW / 2;
  } else if (placement === "top") {
    top = rect.top - gap - estHeight;
    left = rect.left + rect.width / 2 - bubbleW / 2;
  } else if (placement === "right") {
    left = rect.left + rect.width + gap;
    top = rect.top + rect.height / 2 - estHeight / 2;
  } else {
    left = rect.left - gap - bubbleW;
    top = rect.top + rect.height / 2 - estHeight / 2;
  }

  left = Math.min(Math.max(16, left), vw - bubbleW - 16);
  top = Math.min(Math.max(16, top), vh - bottomReserve - 40);

  const arrowLeft = Math.min(Math.max(16, rect.left + rect.width / 2 - left), bubbleW - 16);
  const arrowTop = Math.min(Math.max(16, rect.top + rect.height / 2 - top), estHeight - 16);

  return (
    <div
      className="fixed z-[102] transition-opacity duration-150"
      style={{ top, left, width: bubbleW }}
    >
      <div className="relative rounded-card bg-surface border border-ink-100 shadow-cardHover p-4 space-y-2.5">
        {placement === "bottom" && (
          <div
            className="absolute w-3 h-3 bg-surface border-l border-t border-ink-100 rotate-45"
            style={{ top: -6, left: arrowLeft - 6 }}
          />
        )}
        {placement === "top" && (
          <div
            className="absolute w-3 h-3 bg-surface border-r border-b border-ink-100 rotate-45"
            style={{ bottom: -6, left: arrowLeft - 6 }}
          />
        )}
        {placement === "right" && (
          <div
            className="absolute w-3 h-3 bg-surface border-l border-b border-ink-100 rotate-45"
            style={{ left: -6, top: arrowTop - 6 }}
          />
        )}
        {placement === "left" && (
          <div
            className="absolute w-3 h-3 bg-surface border-r border-t border-ink-100 rotate-45"
            style={{ right: -6, top: arrowTop - 6 }}
          />
        )}
        <h3 className="font-display font-semibold text-sm text-ink-900">{step.title}</h3>
        <p className="text-xs text-ink-500">{step.body}</p>
        {onCta && (
          <button
            onClick={onCta}
            className="w-full rounded-lg bg-brand-500 text-white text-xs font-medium px-3 py-1.5 hover:bg-brand-600 transition-colors"
          >
            {step.cta}
          </button>
        )}
      </div>
    </div>
  );
}
