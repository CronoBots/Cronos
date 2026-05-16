# Workflow rules

## After every functional change

1. **Update `HOME_UPDATES`** in `index.html` with a new entry at the top of the array. Format: `{ date, type ('improvement' | 'feature'), title, text }`. Match the tone and length of existing entries — one short paragraph that an end user can parse.

2. **Open a PR** from a fresh branch off `origin/main`. **One PR per user message**, not one PR per modification — if a single user message lists several changes to make, they all go in the SAME PR. Branch naming: `claude/<short-task-name>`.

   Once the PR for a user message is opened, do not push follow-up commits to its branch — the user merges PRs within seconds, so later commits land on a closed branch and never reach `main`. If a follow-up request comes in (a NEW user message), **first `git fetch origin` and check the live PR / `main` state on GitHub** (some of your previous PRs may have been merged in the interim, making part of the new work redundant), then open a fresh branch + fresh PR. This was the root cause of multiple lost-commit incidents (#109→#110, #112→#120, #115→#117→#119, #124→#126→#128).

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
