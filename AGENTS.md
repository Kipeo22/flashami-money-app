# Repository Guidelines

## Expo SDK 56

Expo has changed. Before writing or changing Expo / React Native code, read the exact versioned docs:

https://docs.expo.dev/versions/v56.0.0/

Use SDK 56-compatible APIs and package versions. Do not rely on older Expo examples without checking the v56 docs first.

## Product Specs And Design

Treat these local docs as the source of truth while developing:

- Product requirements and implementation steps: `docs/spec.md`
- UI / design direction: `docs/DESIGN.md`

The `docs/` directory is intentionally ignored by this app repository and is expected to be managed in a separate documentation repository. Do not add files under `docs/` to Git in this repository.

## Branch And PR Workflow

- Do not work directly on `main`.
- Do not commit directly to `develop`.
- Create feature/fix branches from the latest `develop`.
- Open pull requests from feature/fix branches into `develop`.
- Only the repository owner merges `develop` into `main`.
- Do not open feature/fix pull requests directly into `main`.
- Do not create pull requests into `main` by default.
- Create a `develop -> main` release PR only when the user explicitly asks for it.

Branch protection / rulesets are configured so `main` and `develop` require PR-based changes.

## Commit Guidelines

- Commit in small, meaningful units.
- Keep unrelated changes in separate commits.
- Do not mix formatting-only changes with behavioral changes unless the formatter is part of the setup work.
- Use clear commit messages such as:
  - `chore: configure expo project tooling`
  - `feat: add room list screen`
  - `fix: validate receiptless expense fields`

## Implementation Order

Follow `docs/spec.md` step-by-step unless the user explicitly changes priority.

Recommended order:

1. Step 0: project setup
2. Step 1: Supabase DB schema
3. Step 2: auth
4. Step 3: room list
5. Step 4: room creation and members
6. Step 5: expense form
7. Step 6: receipt upload
8. Step 7: expense list/detail
9. Step 8: approval/rejection
10. Step 9: Discord webhook
11. Step 10: Google Sheets integration
12. Step 11: RLS and permissions
13. Step 12: MVP release

## Validation

Before opening a PR, run the relevant checks for the change. For app code, prefer:

- `npm run typecheck`
- `npm run lint`
- `npm run format:check`

For web-renderable UI changes, also verify an Expo web bundle when practical:

- `npx expo export --platform web --output-dir /private/tmp/flashami-money-app-web-export`

If a check cannot be run, state the reason clearly in the PR body.

## Environment

- Use `.env.example` as the public template.
- Keep real secrets out of Git.
- Supabase public Expo variables use `EXPO_PUBLIC_` prefixes.

## Notes For Agents

- Preserve user changes. Do not reset or discard work unless the user explicitly asks.
- Keep implementation notes out of this repository's tracked files unless the user asks for a committed note.
- When a task needs documentation updates, update the separate docs repository or tell the user what should be updated there.
