# Cloud Agent: ALE-21

Launch a Cloud Agent against **https://github.com/alex-zakoor/grafana** on branch **`main`**.

The repo ships `.cursor/environment.json` and `.cursor/Dockerfile` (frontend-only Node image — no Go download during build). Cursor builds the image, runs `yarn install`, and the agent runs Jest tests without needing a running Grafana server.

## Launch

**From Cursor:** Agents → New Cloud Agent → select `alex-zakoor/grafana` / `main` → paste the prompt below.

**From Linear:** Open [ALE-21](https://linear.app/anysphere/issue/ALE-21) → delegate to Cursor (or attach this repo and branch if your integration supports it).

Do **not** use the dashboard "Set up agent" wizard for this repo if you want the committed Dockerfile to apply. A saved snapshot overrides the Dockerfile.

## Agent prompt

```text
Implement ALE-21: warn before discarding unsaved preferences on Profile → Preferences.

Read AGENTS.md and .cursor/cloud-agent/ale-21.md for verification commands.

Inspect SharedPreferencesFunctional.tsx, SharedPreferencesFunctional.test.tsx, and existing FormPrompt usages in provisioning and auth forms.

When local preference state differs from the last loaded prefs, block in-app navigation with the existing FormPrompt. Continue editing must preserve edits. Discard must reset to loaded prefs and restore any previewed theme before navigation proceeds.

Compare the complete preference shape, including nested query-history and navbar fields. Do not migrate to react-hook-form.

Add focused tests, then run:

yarn jest --no-watch public/app/core/components/SharedPreferences/SharedPreferencesFunctional.test.tsx
yarn eslint public/app/core/components/SharedPreferences/SharedPreferencesFunctional.tsx public/app/core/components/SharedPreferences/SharedPreferencesFunctional.test.tsx

Keep the change frontend-only and limited to two or three files. Open a PR when done.
```

## What the environment provides

| Need | How |
|---|---|
| Node 24 + Yarn | Official `node:24.11.0-bookworm` base + `yarn install` |
| Unit tests | MSW mocks — no running server required |
| Manual browser check | Not required for ALE-21; use `Dockerfile.full` in environment.json if needed later |

## Expected agent output

- PR against `alex-zakoor/grafana` with changes to `SharedPreferencesFunctional.tsx` and its test file (optionally a small helper).
- Passing targeted Jest + ESLint from the prompt above.

## If the agent skips manual verification

That is acceptable for this ticket. The RTL tests with MSW are the primary acceptance signal. Manual verification is optional follow-up: change Week start without saving, navigate away, confirm the Leave page prompt.
