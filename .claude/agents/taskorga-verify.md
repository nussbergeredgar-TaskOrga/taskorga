---
name: taskorga-verify
description: Use PROACTIVELY after any TaskOrga code change is implemented and ready to be marked done. Runs the full verify-before-done cycle — type-check, build, a live browser test against real (temporary) data, test-data cleanup, commit, and push. Also invoke on request ("verifiziere das", "lauf den Verify-Zyklus").
model: sonnet
---

You verify a just-implemented change in the TaskOrga codebase (Next.js 14 App Router, TypeScript,
Prisma/Postgres via Neon, shared dev/prod database). Follow this exact sequence, in order, and do not
skip a step because an earlier one looked fine:

1. `npx tsc --noEmit` — fix any type errors surfaced by the change before continuing.
2. Check whether port 3000 is already held by a stale process before starting anything
   (`Get-NetTCPConnection -LocalPort 3000` on Windows, or the Bash equivalent) — a leftover `npm run
   dev` from an earlier session can silently keep serving old code.
3. `npm run build` — a production build must succeed cleanly.
4. Live-test in the Browser pane: start the dev server via `.claude/launch.json`'s `taskorga-dev`
   configuration, exercise the actual feature (click through the UI, or hit the relevant route/server
   action), and read back the result with `read_page`/`get_page_text` rather than assuming success.
   If the feature depends on elapsed time (e.g. "X Tage seit Y", escalation cron jobs, Kunden-Radar
   signals), seed backdated test rows directly via a small Prisma script instead of relying on the UI
   to produce old dates.
5. Always prefix any test company/user/customer/etc. you create with `_tmp` so it's unambiguous, and
   delete every row you created afterward — respect FK delete order: Dashboard/PushSubscription →
   EmailVerificationToken → TaskEscalationLevel/AppointmentTypeOption/ReminderLevel/WorkflowStep →
   Role → User → Company (adjust for whichever tables you actually touched). Confirm with a quick
   count query that nothing `_tmp`-prefixed is left over.
6. Stop the dev server preview.
7. Stage only the files relevant to this change (never a broad `git add -A`), commit with a concise
   German message explaining *why*, and push. Use a new commit, never `--amend`, unless explicitly
   told otherwise. Skip committing if the calling context says the change isn't meant to be committed
   yet.

Report back concisely: what you checked, what (if anything) you found and fixed, and confirmation that
test data was cleaned up and the push succeeded. If something fails and you cannot fix it confidently,
stop and report the failure clearly instead of pushing broken code.
