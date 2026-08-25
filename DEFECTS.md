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

## 11. `addon/components/filters-picker.js` — the `onColumn` hook has no caller that supplies it

**Status:** NEEDS DECISION
**Found:** `if (typeof onColumn === 'function')` reads `[0,86]` — the guard ran 86 times and the
callback never once.
**Evidence:** `onColumn` is a parameter of the private `#rebuildFilters(onColumn)`. All three call
sites — the constructor (line 38), the route handler (line 41) and `refresh` (line 58) — invoke it
as `#rebuildFilters()` with no argument, so the parameter is always undefined. No consumer package
references `onColumn` either.
**Impact:** none. It is a per-column hook that nothing can subscribe to.
**Fix:** delete the parameter and its guard — the cheapest of the dead-code items, since removing it
touches one private method and no public surface. Alternatively supply it from a real caller if the
per-column callback was intended to be exposed.
Blocks the gate while it exists.

## 12. `addon/components/country-select.js` — the `changed` action is wired to nothing

**Status:** NEEDS DECISION
**Found:** the whole action reported as never invoked (`[0,0]` on its only branch).
**Evidence:** `country-select.hbs` wires `handleChange` (as `{{did-update this.handleChange @value}}`)
and `selectCountry` (as PowerSelect's `@onChange`). It never references `changed`, and the template
yields nothing, so no consumer can reach it either.
**Impact:** none. `changed` duplicates what `selectCountry` already does — look the country up by
iso2 and select it — minus the `@onChange` notification.
**Fix:** delete it. Fourth instance of the shape in #6, #9 and #10: a second implementation left
beside the one the template actually uses.
Blocks the gate while it exists.

## 13. `addon/components/query-builder/conditions.js` — a multi-value condition kept only the last value picked

**Status:** FIXED (this branch)
**Found:** writing the first real test for the `is one of` editor. Selecting `active` then `pending`
reported `['pending']`, not `['active', 'pending']`.
**Evidence:** `updateConditionValue` mutated `cond.value` on the existing condition object and then
called `notifyDebounced` — it never replaced any container, so Glimmer had nothing to invalidate.
`PowerSelectMultiple`'s `@selected={{condition.value}}` therefore kept rendering the value it was
first given (`null`), and every subsequent pick was treated as the first. The component's own
`updateCondition()` helper documents the fix in a comment — "clone containers (so Glimmer sees a
change)" — and `updateConditionRangeValue` already routes through it; `updateConditionValue` was the
one value writer that did not.
**Impact:** user-visible. Any `is one of` / `is not one of` filter could only ever carry one value,
and the boolean editor's trigger showed a stale selection. The reported payload was correct on the
first pick, so the bug looked like the UI "not keeping up".
**Fix:** applied — `updateConditionValue` now clones the group and its conditions array before
notifying, matching `updateCondition()`. It keeps the debounce (the free-text editor types through
this same action). Covered by *an "in" condition collects the selected values as an array*, which
fails against the old code.

## 14. `addon/components/template-builder/properties-panel.hbs:73` — `value="target.value"` on `{{fn}}` does nothing

**Status:** NEEDS DECISION (cosmetic; no behaviour change either way)
**Found:** chasing the uncovered `event?.target ? event.target.value : event` branch in `updateProp`.
The only call site that looks like it passes a raw value is this one.
**Evidence:** `{{on "input" (fn this.updateProp "content" value="target.value")}}`. `value=` is an
option of the classic `{{action}}` helper, which unwraps the event for you. `{{fn}}` has no such
option — it treats `value` as an ordinary named argument and ignores it, so `updateProp` still
receives the DOM event and takes the `event.target.value` path like every other caller.
**Impact:** none today. It is misleading rather than broken: it reads as if the handler receives a
string, and the `: event` fallback in `updateProp` exists to serve a call shape that never occurs.
**Fix:** drop the `value=` argument. Whether the `: event` fallback in `updateProp`,
`updateNumericProp` and `updateTemplateProp` should stay is a separate call — it is currently
unreachable from this template and is documented as such.

## 15. `addon/components/template-builder/properties-panel.js:219` — the table's `query` data mode has no control

**Status:** NEEDS DECISION
**Found:** `else if (mode === 'query')` reports `[0,0]` — never evaluated either way.
**Evidence:** `setTableDataMode` handles three modes and clears the other modes' fields for each.
The template offers a two-button toggle, Variable and Manual (`properties-panel.hbs:258` and `:266`);
nothing anywhere calls it with `'query'`. `data_source_mode` appears in exactly three places in the
whole monorepo, all of them in this one file, so no consumer sets it either. The element fields the
branch manages — `query_endpoint`, `query_params`, `query_response_path` — are likewise written only
by this action and read by nothing.
**Impact:** none at runtime. This is scaffolding for a data mode the panel does not offer, not dead
code in the usual sense: `TemplateBuilder::QueryForm` and the queries panel exist, so a query-backed
table looks like an intended feature that stopped short of the properties panel.
**Fix:** either finish it (a third toggle button and the query fields) or remove the branch and the
three fields it manages. Not a call to make from the coverage side.

## 16. Coverage collection itself is unreliable, which the 100% gate cannot tolerate

**Status:** OPEN — blocks the gate, alongside #4
**Found:** repeatedly, while verifying single files.
**Evidence:** three distinct failure modes, all observed in one session:
1. A run reports `# tests 77 / # pass 77 / # fail 0` and leaves `coverage/coverage-final.json`
   untouched — the *previous* run's artifact stays in place. Reading it credited a handler with 0
   hits long after the test reaching it worked, and would just as easily credit coverage that never
   happened.
2. A run writes `coverage-summary.json` and the HTML report but no `coverage-final.json`.
3. NOT A REPO DEFECT — recorded so it is not mistaken for one. `pnpm exec ember test` sometimes
   builds successfully and then dies before launching a browser with
   `require() of ES Module .../execa@9.6.1/index.js from .../testem@3.20.0/...`. The cause is the
   Node version, not the dependency pair: `/usr/local/bin/node` is v18.15.0, which cannot
   `require()` an ESM module at all, while nvm's v22.22.2 (which does) is only on PATH in shells
   that source the profile. Runs that picked up Node 18 died here; runs that picked up Node 22
   passed. Use a pinned Node 22 for every run.
**Impact:** a hard `coverage:check` gate turns any of these into a red build with no code change,
and (1) is worse than a red build because it fails silently in the direction of over-reporting.
**Fix:** (1) and (2) need `coverage:check` to refuse a stale or missing artifact rather than read
whatever is on disk: stamp the run and compare, or delete the folder before the run and fail if
nothing is written. (3) needs an `engines` field and an `.nvmrc` so the required Node is declared
rather than assumed — CI would hit the same wall on a Node 18 image.

## 17. `addon/components/full-calendar.js` — every event listener leaks, and the obvious fix does not work

**Status:** OPEN — NEEDS DECISION (the fix is not a one-liner; see below)
**Note on numbering:** commit `8410e7e` refers to this as "#13". The entry was never written to
this file, and #13 was later taken by the query-builder fix. This is the entry that commit means.
**Found:** five of full-calendar's remaining coverage gaps are the whole body of
`destroyCalendarEventListeners`, which reports as never invoked.
**Evidence:** the component has no `willDestroy`, no `registerDestructor`, and nothing in
`full-calendar.hbs` invokes it. `createCalendarEventListeners` pushes an entry onto `this._listeners`
for every `on<Event>` argument the consumer supplies and registers it with `this.calendar.on(...)`;
nothing ever unregisters them.
**Impact:** real, and it costs users. A calendar on a route navigated in and out of accumulates
listeners on the FullCalendar instance for the lifetime of the page.
**Fix — and why it is not the obvious one:** calling `destroyCalendarEventListeners` from a
destructor is necessary but NOT sufficient. The method does:

    this.calendar.off(eventName, this.triggerCalendarEvent.bind(this, callbackName));

`.bind()` returns a NEW function every time, so the reference passed to `.off()` can never equal the
one `.on()` was given, and FullCalendar removes nothing. Wiring the call up as-is would look like a
fix, pass a test that only asserts the method ran, and leak exactly as before. The real fix is to
store the bound handler on `_listeners` at registration and pass that same reference to `.off()` —
which changes the shape of `_listeners`, so it wants a decision rather than a drive-by edit.

---

## Tests that pass for a reason other than the one they name

A separate category from the dead code above, and arguably more dangerous: these tests are green,
assert a real outcome, and would KEEP passing if the behaviour they describe broke — because the
behaviour they describe is not what produces the outcome. None of them can be found from a passing
suite; they surface only by reading branch counts against test intent.

**Fixed here:** `coordinates-input` — "a geocoder response with no place reports nothing" primed
`fetch.responses['geocoder/query'] = null`, but the dummy fetch service resolves
`responses[path] ?? []`, so `place` was a TRUTHY empty array. `if (place)` was taken,
`place.location.coordinates` threw, and the catch swallowed it. `onGeocode` was not called — for the
opposite reason to the one asserted, and the guard under test never ran. Now overrides `get` to
resolve null and asserts the null comes back uncoerced.

**Benign, left alone:** `filters-picker` — "an empty url value is treated as no value at all" is
accurate about the behaviour; it is simply implemented in `getUrlParam` rather than in the component
line it appears to exercise.

**Worth a look:** `chat-tray` — "every channel-shaped event is handled without throwing" fires event
names including `chat.added_participant` and `chat.removed_participant` at the USER-channel listener,
whose switch matches `chat.participant_added` / `chat.participant_removed`. Unmatched names fall
through, so the test passes trivially. It is not wrong — the component does survive them — but it
proves less than its name suggests. See the socket event-name inconsistency noted with #6.

**The general lesson:** `fetch.responses[path] ?? []` in the dummy service means a stub can never
express "resolved with nothing". Any test that needs a falsy response must override `get` directly.
Two tests in this repo primed a null response and silently got `[]`.

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
