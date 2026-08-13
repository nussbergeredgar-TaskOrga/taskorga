import { getInvitePreview } from "@/lib/actions/signup";
import { RegistrierenForm } from "@/components/registrieren-form";

const DEFAULT_TRIAL_DAYS = 14;

export default async function RegistrierenPage({
  searchParams,
}: {
  searchParams: { invite?: string };
}) {
  const token = searchParams.invite?.trim() || null;
  const preview = token ? await getInvitePreview(token) : null;

  return (
    <RegistrierenForm
      inviteToken={token && preview ? token : null}
      inviteEmail={preview?.email ?? null}
      inviteInvalid={!!token && !preview}
      trialDays={preview?.trialDays ?? DEFAULT_TRIAL_DAYS}
    />
  );
}
