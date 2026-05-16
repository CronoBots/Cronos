# Workflow rules

## After every functional change

1. **Update `HOME_UPDATES`** in `index.html` with a new entry at the top of the array. Format: `{ date, type ('improvement' | 'feature'), title, text }`. Match the tone and length of existing entries — one short paragraph that an end user can parse.

2. **Open a PR** from a fresh branch off `origin/main`. One PR per modification — do not bundle unrelated changes. Branch naming: `claude/<short-task-name>`.

   **Each new request = new PR.** Once a PR is opened (whether merged or not), don't push follow-up commits to its branch — open a fresh branch + a fresh PR for the next request. The user merges PRs quickly, so later commits on an already-opened branch often miss the merge window and never reach `main` (this was the root cause of PRs #109 → #110, #112 → #120, #115 → #117 → #119, #124 → #126 — every time a second commit landed on a still-open branch, it got orphaned when the PR was merged).

3. **PR description in French** when summarising user-facing changes, with a `## Summary` and a `## Test plan`.

## HOME_UPDATES is a public feed

Never mention admin-only / staff-only features in `HOME_UPDATES` entries. Examples of features that must NOT appear there:
- Anything gated to `getCurrentUser().username === 'unscoop'`
- Debug consoles, internal dashboards, analytics views reserved to the site owner

Public-facing changes (chat polish, UI tweaks, new collections featured, etc.) DO go in HOME_UPDATES.

## Git operations

- Develop on `claude/<task-name>`, push, open PR — never push directly to `main`.
- After a PR is merged remotely, rebase / branch from fresh `origin/main` for the next task — don't carry stale state across PRs.
- Force-push only to feature branches we own, never to `main`. Ask before any `reset --hard` or destructive operation.

## Project structure note

`index.html` is a single-file webapp with ~25 inline `<script>` blocks. Each block has its own closure scope — **functions defined in one `<script>` are NOT accessible from another** unless explicitly attached to `window`. When sharing helpers across blocks (e.g. `timeAgo` formatter), either inline a local copy in the consuming scope or expose via `window.helperName = ...`. A bug from this exact pattern was the cause of PR #117 (empty admin sidebar).
