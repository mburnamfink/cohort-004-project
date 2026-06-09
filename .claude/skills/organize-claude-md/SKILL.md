---
name: organize-claude-md
description: Reorganize a bloated root CLAUDE.md into progressive-disclosure nested CLAUDE.md files (app/routes, app/components, app/db) so domain rules load only when working in that area. Use when CLAUDE.md is getting long, rules feel unsorted, or the user asks to split/organize/clean up CLAUDE.md or apply progressive disclosure.
---

# Organize CLAUDE.md (progressive disclosure)

Claude Code always loads the root `CLAUDE.md`, but auto-loads a subdirectory's
`CLAUDE.md` **only when you read or edit a file inside that subtree**. Use that:
keep the root lean and global, push domain rules down to where they apply.

## Workflow

1. **Inventory.** Read the root `CLAUDE.md`. Each rule is a block separated by `---`.
   List every rule. Keep each rule's code example attached to it.
2. **Tag each rule** with one domain using the heuristic below.
3. **Place rules** into the target files (create dirs/files as needed):
   - Global → stays in root `CLAUDE.md`
   - `routes` → `app/routes/CLAUDE.md`
   - `frontend` → `app/components/CLAUDE.md`
   - `database` → `app/db/CLAUDE.md`
4. **Rewrite the root** so it contains only global rules, followed by a short index
   pointing to the nested files (so a human skimming knows they exist).
5. **Verify (do not skip):** every original rule lands in exactly one file; nothing
   dropped; nothing duplicated. If the original had a duplicate rule, dedupe it.
   Diff the set of rules before vs after.

## Placement heuristic

- **Global (root)** — applies repo-wide regardless of what you're editing:
  TS/style conventions, import aliases, `any` ban, the service→test requirement,
  the `{ ok: true } | { ok: false, error }` service result pattern, test setup/db-mock.
- **Domain (nested)** — only matters when editing files in that one directory.
- **Ambiguous rule** (spans two areas, e.g. a value stored in the DB but formatted in
  the UI): give it ONE home in the directory where it's most often acted on. Do not
  copy a rule into two files — a single source of truth beats sync drift.

## This project's mapping

Apply this when the rules match; adapt for new rules.

| Rule (by topic) | File |
| --- | --- |
| Object param for same-type args; `~/*` import alias; no `any`; service→`.test.ts`; `{ ok }` service result pattern; vitest globals + db mock setup | root `CLAUDE.md` |
| React Router v7 file routing & no business logic in routes; `parseFormData`/`parseParams`/`parseJsonBody`; `intent` discriminated unions; cookie auth via `getCurrentUserId` | `app/routes/CLAUDE.md` |
| `cn()` for tailwind; shadcn in `components/ui`, custom in `components/`; `formatPrice()` display | `app/components/CLAUDE.md` |
| Autoincrement integer ids; ISO-string timestamps; boolean-as-integer; soft-delete `deleted_at`; price stored in cents; SQLite/Drizzle db instance & WAL | `app/db/CLAUDE.md` |

Note: testing conventions (db mock) stay global because services live across the repo;
if a dedicated `app/services/CLAUDE.md` is wanted later, that's its natural home.

## Root index format

End the rewritten root `CLAUDE.md` with:

```md
## Where conventions live

Detailed rules auto-load when you work in these directories:
- `app/routes/` — routing, validation, auth
- `app/components/` — UI, tailwind, shadcn
- `app/db/` — schema, columns, Drizzle/SQLite
```

Keep the `---` separator style and the existing voice. Don't add change-narration
comments to the files (no "moved from root", "see plan", etc.).
