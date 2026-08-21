# ember-ui defects

Defects found while driving this package to 100% test coverage. Lives in the repo (rather than the
monorepo root, where the previous tracker sat untracked) so it is versioned with the code and shows
up in pull-request diffs.

**History:** entries 1–166 from the first phase of the campaign are in
`../../DEFECTS-ember-ui.md` — 100 of them fixed, the rest either settled or carried below. That file
drifted into three heading styles; this one uses a single format. Numbering here restarts at 1 and
does not correspond to the old file's.

## Format

Every entry uses the same shape so the file stays greppable:

```
## N. `path/to/file.js` — one-line summary
**Status:** OPEN | FIXED (commit) | WONTFIX (reason) | NEEDS DECISION
**Found:** what surfaced it
**Evidence:** the specific code, and how it was verified — traced callers, template references,
consumer greps, coverage artifact. Never "appears unused".
**Impact:** what a user or developer actually experiences.
**Fix:** what was done, or what should be.
```

**Before writing an entry, prove the claim.** "Not referenced by a template" is not "dead code" and
is not "broken" — those are three different findings with three different owners. Trace the callers,
grep the consuming packages, and check whether the current behaviour is deliberate before calling
anything a defect. Two claims in the first phase were wrong on exactly this point: sticky table
columns were reported broken when the class is applied imperatively from `td.js`/`th.js`, and the
resource panel's unwired save task was reported as a missing default when leaving it unwired is what
keeps the save button off read-only panels.

---

## 1. `addon/components/chat-window/attachment.js` — a filename with no extension crashes the component

**Status:** OPEN
**Found:** writing a test for the `extensionMatch ? extensionMatch[1] : null` fallback.
**Evidence:** `getExtension` returns `null` for a filename with no dot; `getIcon` passes that
straight to `getWithDefault`, which asserts `The key provided to get must be a string or number`.
Confirmed by test: the component throws during render rather than falling back.
`addon/components/file-icon.js` guards the identical case with `if (!extension) return 'file-alt';`.
**Impact:** an attachment named `README`, `Dockerfile` or `LICENSE` cannot render at all.
**Fix:** the same guard, or pass `this.extension ?? 'file-alt'` as the key. The false arm stays
uncovered until then — the only test that reaches it asserts a crash, which would pin behaviour that
should change.

## 2. `addon/components/overlay/header.js` — `useEllipsis` is referenced by no template

**Status:** NEEDS DECISION
**Evidence:** `grep -rn useEllipsis addon app` returns only the definition. `overlay/header.hbs`
gates the truncated title on `@overlay.isMinimized` instead.
**Impact:** the 15-character threshold the getter encodes has no effect anywhere — a minimized
overlay always truncates however short the title, and a non-minimized one never does.
**Fix:** delete the getter, or wire it if the threshold is the intended behaviour. Product call.

## 3. `addon/components/report-builder/condition-value.js` — `isBoolean` is referenced by no template

**Status:** NEEDS DECISION
**Evidence:** `condition-value.hbs` branches on `isDate`, `isDateTime`, `isNumber`, `isJSON`, then
falls through to a text input. There is no boolean arm.
**Impact:** a column typed `boolean` gets a free-text field.
**Fix:** either a stale getter to delete, or a missing editor to build. Product call — more likely
the latter.

## 4. `addon/components/layout/sidebar.js` — makes the coverage total nondeterministic

**Status:** OPEN
**Evidence:** two `test:coverage` runs on identical code, both fully green, reported 8479 vs 8477
covered statements. A per-file diff of the two `coverage-final.json` artifacts names this file alone
(201 vs 199); every other file is byte-identical between runs.
**Impact:** ±0.03%. The gate targets exactly 100%, so a wobble can pass and fail on alternating CI
runs with no code change. This is a blocker for the gate, not a cosmetic issue.
**Fix:** the racing statements are spread across `later`, `next` and resize observation (see the old
tracker's #129 for why deterministic scheduling there carries behavioural risk). Must be resolved,
or the racing lines proven irrelevant, before the 100% gate can be trusted.

## 5. `addon/components/layout/resource/panel.hbs:5` — `@onToggle` points at an action that does not exist

**Status:** OPEN
**Evidence:** the template wires `@onToggle={{this.onToggle}}`; `panel.js` defines no `onToggle`.
**Impact:** `undefined` is passed to `<Overlay>`. Harmless today because the overlay guards it, but
it means the panel silently cannot forward a toggle.
**Fix:** define the action, or drop the wiring.

## 6. `addon/components/chat-tray.js` — `getUnreadCount` is a second, unwired implementation

**Status:** NEEDS DECISION
**Found:** the whole task reported as never invoked while covering chat-tray.
**Evidence:** `grep -rn getUnreadCount addon/` returns only the declaration — nothing performs it. The
unread badge is NOT broken: `chat-tray.js:294` (`countUnread`) already sets `this.unreadCount` by
summing `unread_count` across the loaded channels, and `chat-tray.hbs:11` renders from that.
**Impact:** none today. The two implementations differ, though: `countUnread` sums only the channels
currently loaded, while `getUnreadCount` fetches `chat-channels/unread-count`, which is presumably
authoritative across channels that are not loaded or are paginated away. If channel loading is ever
paginated, the badge under-reports.
**Fix:** decide which is authoritative. Either delete the task, or perform it on insert and let the
server value win. Not a bug fix either way — it is a choice about where the number comes from.
Blocks the 100% gate while it exists: dead code cannot be covered, and excluding it would hide the
question rather than answer it.

## 7. `addon/components/metadata-editor.js` — the `label` getter is referenced by no template, so its default never applies

**Status:** NEEDS DECISION
**Found:** the getter reported as never invoked — `[0,0]`, meaning it is not called at all.
**Evidence:** `metadata-editor.hbs:3-4` reads the argument directly:
```hbs
{{#if @label}}
    <h3 ...>{{@label}}</h3>
{{/if}}
```
`grep -rn 'this.label' addon/` returns nothing. The getter's `this.args.label ?? 'Metadata'` is
therefore unreachable.
**Impact:** unlike the other two dead getters (#2, #3) this one has a visible consequence. The
getter says the section should be titled "Metadata" when the caller supplies no label; the template
renders **no heading at all** in that case. So the intended default is silently not applied.
**Fix:** either use `{{this.label}}` in the template — which would start rendering a "Metadata"
heading everywhere a caller omits the argument, a visible change — or delete the getter and accept
that the heading is opt-in. Product call.
Blocks the gate while it exists: an uncalled getter cannot be covered.

## 8. `addon/components/countdown.js` — `restartCountdown` is never called

**Status:** NEEDS DECISION
**Found:** the whole method reported as never invoked.
**Evidence:** `grep -rn restartCountdown addon/` returns only the declaration and its docblock. It
is not an `@action`, not referenced by `countdown.hbs`, and not called from anywhere in the class.
**Impact:** none today — the countdown starts from the constructor and ticks correctly. But there is
no way to restart one without re-rendering the component, which is presumably what the method was
written for.
**Fix:** either delete it, or expose it (as an `@action`, or via a `@onRestart`-style yield) so
consumers can restart a countdown in place. Same family as #6 and the dead getters #2/#3/#7: code
written for an intent the wiring never delivered.
Blocks the gate while it exists — an uncalled method cannot be covered.

## 9. `addon/components/table/cell/dropdown.js` — `onDropdownItemClick` is orphaned, duplicating ActionItem

**Status:** NEEDS DECISION
**Found:** the whole method reported as never invoked (`[0,0]` on both its guards).
**Evidence:** `dropdown.hbs:23-25` renders each action through
`<Table::Cell::Dropdown::ActionItem …>`, which carries its own `@action onClick(columnAction, row, dd)`
doing the same two things (close the dropdown, run the action). Nothing references the parent's
`onDropdownItemClick`. Note the name IS live elsewhere — `content-panel` and `layout/sidebar/item`
both wire their own copies from their templates — so a grep for the name alone is misleading; this
particular one is orphaned.
**Impact:** none. Clicking an action works, via ActionItem.
**Fix:** delete it. Same shape as #6: a second implementation of something already handled, left
behind when the work moved into a child component.
Blocks the gate while it exists.

## 10. `addon/components/pagination.js` — `pageNumbers` is a superseded page-list implementation

**Status:** NEEDS DECISION
**Found:** the getter reported as never evaluated (`[0,0]`).
**Evidence:** `grep -rn pageNumbers addon/ app/` returns only the declaration. `pagination.hbs:69`
iterates `this.pageItems` instead. The getter's `dots: page === 12` / `slice(0, 12)` logic looks like
an earlier hard-coded truncation, superseded by `pageItems` and the `truncate-pages` utility.
**Impact:** none — pagination renders and truncates correctly through `pageItems`.
**Fix:** delete it. Third instance of the same shape as #6 and #9: a superseded implementation left
in place beside the one that actually runs.
Blocks the gate while it exists.

---

## Settled — not defects, recorded so they are not "fixed" again

- **Sticky table columns work.** `is-sticky` is applied imperatively from `table/td.js:60` and
  `table/th.js:97` inside `setupTableCellNode`, not from any template, and `table.js:282/306` reads
  it back. Reported broken during the first phase; that report was wrong.
- **`layout/resource/panel`'s save task is deliberately unwired.** Wiring `this.save` as a default
  `@saveTask` would force a save button onto every panel, including read-only ones. Requiring the
  consumer to pass `@saveTask` is what keeps it opt-in.
- **The panel's `onPressEdit` / `onTabChange` / `onViewDetails` callbacks were removed on purpose.**
  The panel has no Edit button and no tabs, nothing could fire them, no consumer in 45 monorepo
  source directories passes them, and `onViewDetails` referenced `this.vendor` rather than
  `this.resource` — a copy-paste leftover from a vendor-specific panel.
- **`custom-fields-manager` accepts a bounded staleness window.** A subject cached by the registry is
  not refetched on tab change. Edits made inside the manager update local state directly; only
  out-of-band changes go stale, and that trade was accepted deliberately over refetching on every
  tab switch.
