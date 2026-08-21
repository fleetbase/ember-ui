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
