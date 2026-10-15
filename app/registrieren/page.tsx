import { getInvitePreview, getInviteCodePreview } from "@/lib/actions/signup";
import { RegistrierenForm } from "@/components/registrieren-form";

const DEFAULT_TRIAL_DAYS = 14;

export default async function RegistrierenPage({
  searchParams,
}: {
  searchParams: { invite?: string; code?: string };
}) {
  const token = searchParams.invite?.trim() || null;
  const preview = token ? await getInvitePreview(token) : null;

  // Pilot-Link: nur wenn keine persoenliche E-Mail-Einladung vorliegt.
  const code = !token ? searchParams.code?.trim() || null : null;
  const codePreview = code ? await getInviteCodePreview(code) : null;

  return (
    <RegistrierenForm
      inviteToken={token && preview ? token : null}
      inviteEmail={preview?.email ?? null}
      inviteCode={code && codePreview ? code : null}
      inviteInvalid={!!token && !preview ? true : !!code && !codePreview}
      pilot={!!codePreview?.trialDays}
      trialDays={preview?.trialDays ?? codePreview?.trialDays ?? DEFAULT_TRIAL_DAYS}
    />
  );
}
