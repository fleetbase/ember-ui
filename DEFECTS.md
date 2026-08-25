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

**Status:** FIXED (PR #163)
**Found:** writing a test for the `extensionMatch ? extensionMatch[1] : null` fallback.
**Evidence:** `getExtension` returns `null` for a filename with no dot; `getIcon` passes that
straight to `getWithDefault`, which asserts `The key provided to get must be a string or number`.
Confirmed by test: the component throws during render rather than falling back.
`addon/components/file-icon.js` guards the identical case with `if (!extension) return 'file-alt';`.
**Impact:** an attachment named `README`, `Dockerfile` or `LICENSE` cannot render at all.
**Fix:** the same guard, or pass `this.extension ?? 'file-alt'` as the key. The false arm stays
uncovered until then — the only test that reaches it asserts a crash, which would pin behaviour that
should change.

**Applied:** `getIcon` returns `'file-alt'` when there is no extension, the same guard
`file-icon.js` already used. Covered by *a filename with no extension renders rather than throwing*
and *a dotfile with no extension also renders*.

## 2. `addon/components/overlay/header.js` — `useEllipsis` is referenced by no template

**Status:** FIXED (PR #163)
**Evidence:** `grep -rn useEllipsis addon app` returns only the definition. `overlay/header.hbs`
gates the truncated title on `@overlay.isMinimized` instead.
**Impact:** the 15-character threshold the getter encodes has no effect anywhere — a minimized
overlay always truncates however short the title, and a non-minimized one never does.
**Fix:** delete the getter, or wire it if the threshold is the intended behaviour. Product call.

**Applied:** `@titleEllipsis` opts a non-minimized header into truncation, and
`@titleEllipsisLength` sets the threshold (default 15, the value the getter always encoded).
A minimized overlay still truncates regardless, so no existing call site changes behaviour.
The misspelled internal getter is now `titleWithEllipsis`, and `isTitleTruncated` holds the
decision. Eight tests, including a length of 0 and the exclusive threshold.

## 3. `addon/components/report-builder/condition-value.js` — `isBoolean` is referenced by no template

**Status:** FIXED (PR #163)
**Evidence:** `condition-value.hbs` branches on `isDate`, `isDateTime`, `isNumber`, `isJSON`, then
falls through to a text input. There is no boolean arm.
**Impact:** a column typed `boolean` gets a free-text field.
**Fix:** either a stale getter to delete, or a missing editor to build. Product call — more likely
the latter.

**Applied:** a True/False radio group, using the addon's own `<RadioButton>`. It reports real
booleans, normalises values that round-tripped as `'true'`/`1`, selects neither option for an
unrecognised value, and gives each rendered editor its own group name via `guidFor` so two boolean
conditions cannot clear each other. Eight tests.

## 4. `addon/components/layout/sidebar.js` — makes the coverage total nondeterministic

**Status:** FIXED (PR #163)
**Evidence:** two `test:coverage` runs on identical code, both fully green, reported 8479 vs 8477
covered statements. A per-file diff of the two `coverage-final.json` artifacts names this file alone
(201 vs 199); every other file is byte-identical between runs.
**Impact:** ±0.03%. The gate targets exactly 100%, so a wobble can pass and fail on alternating CI
runs with no code change. This is a blocker for the gate, not a cosmetic issue.
**Fix:** the racing statements are spread across `later`, `next` and resize observation (see the old
tracker's #129 for why deterministic scheduling there carries behavioural risk). Must be resolved,
or the racing lines proven irrelevant, before the 100% gate can be trusted.

**Applied — and the first diagnosis was wrong.** The racing statements are NOT the
`requestAnimationFrame` callback, which runs reliably. They are the *cancel* branches in
`flushResizeFrame()` (187-188) and `teardown()` (368-369), reached only when a frame is still
pending — which depended on whether the browser painted first. An earlier attempt that awaited the
frame before releasing the gutter made it strictly worse, permanently closing the only path to
187-188.

The fix is two tests that dispatch synchronously, with no `await` between the events, so no paint
can intervene and a pending frame is a certainty. That idiom was already in use a few tests earlier
in the same file. `sidebar.js` went from 199/215 to 203/215 — exactly those four statements — and
the value no longer depends on timing.

## 5. `addon/components/layout/resource/panel.hbs:5` — `@onToggle` points at an action that does not exist

**Status:** FIXED (PR #163)
**Evidence:** the template wires `@onToggle={{this.onToggle}}`; `panel.js` defines no `onToggle`.
**Impact:** `undefined` is passed to `<Overlay>`. Harmless today because the overlay guards it, but
it means the panel silently cannot forward a toggle.
**Fix:** define the action, or drop the wiring.

**Applied:** `onToggle` is defined and forwards through `contextComponentCallback`, matching
`onOpen` and `onClose`. Two tests.

## 6. `addon/components/chat-tray.js` — `getUnreadCount` is a second, unwired implementation

**Status:** FIXED (PR #163)
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

**Decision:** the server is authoritative. `getUnreadCount` is performed after `countUnread` on
both load and reload, so the summed count shows immediately and the server total replaces it.
The task is `restartable` (a slow earlier response cannot overwrite a newer one) and failures are
caught, leaving the summed count rather than blanking the badge. Four tests.

## 7. `addon/components/metadata-editor.js` — the `label` getter is referenced by no template, so its default never applies

**Status:** FIXED (PR #163)
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

**Decision:** the template reads `{{this.label}}`, so the 'Metadata' default now applies. Note
`?? 'Metadata'` is nullish-coalescing, so passing `@label=""` is the way to opt out of the heading
now that omitting the argument no longer does. Three tests.

## 8. `addon/components/countdown.js` — `restartCountdown` is never called

**Status:** FIXED (PR #163)
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

**Decision:** exposed rather than deleted. `restartCountdown` is an `@action` and both
`@onCountdownEnd` and `@onEnd` receive `{ restartFn }`, so a consumer writes
`handleEnd({ restartFn }) { restartFn(); }`. Existing consumers that declare no parameters are
unaffected. Three tests.

## 9. `addon/components/table/cell/dropdown.js` — `onDropdownItemClick` is orphaned, duplicating ActionItem

**Status:** FIXED (PR #163) — deleted
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

**Status:** FIXED (PR #163) — deleted
**Found:** the getter reported as never evaluated (`[0,0]`).
**Evidence:** `grep -rn pageNumbers addon/ app/` returns only the declaration. `pagination.hbs:69`
iterates `this.pageItems` instead. The getter's `dots: page === 12` / `slice(0, 12)` logic looks like
an earlier hard-coded truncation, superseded by `pageItems` and the `truncate-pages` utility.
**Impact:** none — pagination renders and truncates correctly through `pageItems`.
**Fix:** delete it. Third instance of the same shape as #6 and #9: a superseded implementation left
in place beside the one that actually runs.
Blocks the gate while it exists.

## 11. `addon/components/filters-picker.js` — the `onColumn` hook has no caller that supplies it

**Status:** FIXED (PR #163)
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

**Decision:** the hook was meant to be the consumer's. `#rebuildFilters` reads
`this.args.onColumn` and the unused parameter is gone. Three tests.

## 12. `addon/components/country-select.js` — the `changed` action is wired to nothing

**Status:** FIXED (PR #163) — deleted
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

**Status:** FIXED (PR #161)
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

**Status:** FIXED (PR #163)
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

**Applied:** the `value=` argument is dropped. The `: event` fallbacks in `updateProp`,
`updateNumericProp` and `updateTemplateProp` remain unreachable from this template and stay
documented as such.

## 15. `addon/components/template-builder/properties-panel.js:219` — the table's `query` data mode has no control

**Status:** DEFERRED — a later update, by decision. Kickoff brief in Appendix D.
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
**Fix:** finish it. Confirmed as intended behaviour — fetch from a url with params — and deferred to
its own session rather than half-built here. What it needs before anyone starts: an endpoint
contract, an auth story, loading and error states, a defined shape for `query_response_path`, and
something on the render side that consumes a query-backed table (nothing does today). It also has to
be reconciled with the `__queries__` variable route, which already solves the same problem by
exposing saved queries as variables — otherwise the panel ends up with two competing mechanisms.

Until then the branch stays uncovered rather than suppressed: an `istanbul ignore` here would have
to sit on the opening `if`, and `ignore else` there also swallows the `variable` branch, which real
tests cover.

## 16. Coverage collection itself is unreliable, which the 100% gate cannot tolerate

**Status:** FIXED — cause found and fixed; the freshness gate stays as a backstop
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
**What CI already does, and where it falls short.** `.github/workflows/ci.yml` pins
`NODE_VERSION: 22.x`, so (3) cannot bite CI — it is a local-development trap only, and an `engines`
field plus an `.nvmrc` would declare the requirement rather than leave it to whichever Node a shell
happens to resolve. The workflow also runs `test -s coverage/lcov.info` after the gate, which
catches the crudest form of (2). But that check looks at `lcov.info`, not `coverage-final.json`, and
it tests only for existence — a stale artifact left by a previous run passes it.

**Fix:** (1) and (2) need `coverage:check` to refuse an artifact it cannot prove is fresh, rather
than reading whatever is on disk. Either stamp the run and require the artifact to be newer, or
delete `coverage/` before the run and fail loudly if nothing is written. Locally, `rm -rf coverage`
before a run has produced a complete set every time, where deleting only `coverage-final.json`
has not.

**Applied — detection.** `scripts/stamp-coverage-run.js` clears `coverage/` and records when the
run started; `test:coverage` runs it first. `checkArtifactFreshness` in the gate now rejects a
missing stamp, an unreadable one, an artifact older than the run, and a `coverage-final.json` that
was never written — before it reads a single percentage. The self-test grew from 10 cases to 17,
including the dangerous one: a green suite that leaves the previous artifact in place.

**Still open — the cause.** Collection itself keeps failing. Measured across this session: 7 of 9
fast filtered runs produced no `coverage/` directory at all, while every full run produced one.
That points at the addon POSTing `window.__coverage__` from the browser at test end and a short run
tearing down before the request completes. It is therefore a local-development tax rather than a CI
risk — CI runs the full suite — but it makes per-file verification unreliable, which is how most of
this campaign's work gets checked.

**Correcting two earlier claims in this entry's history:** `rm -rf coverage` before a run does NOT
make collection reliable (it was the first thing tried, and the 7-of-9 figure above is *with* it),
and the Node 18 ESM failure is unrelated to this and cannot affect CI, which pins Node 22.

### RESOLVED — the cause, and the fix

**Cause.** `sendCoverage()` POSTs the coverage payload to `/write-coverage` from `QUnit.done`. For
this addon that payload is **~1.9 MB across 401 instrumented files**, because a per-file 100% gate
requires `forceModulesToBeLoaded()` to evaluate everything so untested files stay in the
denominator. In CI mode testem tears the browser down as soon as QUnit reports the run finished,
truncating the upload mid-body; `raw-body` aborts and nothing is written at all.

It is size- and timing-dependent, which is exactly why it looked like flakiness: after 139 tests
testem has almost nothing to serialize and kills the browser in milliseconds, while after 5,130
tests emitting the results buys the upload enough time to land.

**This is a known upstream bug, not something peculiar to this repo.**
- https://github.com/ember-cli-code-coverage/ember-cli-code-coverage/issues/420 — identical
  `BadRequestError: request aborted` at `raw-body/index.js:245`, reported August 2024, coverage
  written only under `ember test -s`.
- https://github.com/ember-cli-code-coverage/ember-cli-code-coverage/issues/421 — same silent
  failure after upgrading past 1.0.3.
- https://github.com/testem/testem/issues/1577 — the testem side.

**Fix (`tests/test-helper.js`).** `Testem.afterTests` hands testem a callback it *waits for*, so the
upload completes before teardown. It does not fire under `--server`, hence the branch on
`config.APP.isRunningWithServerArgs`. Measured: 2 of 2 fast filtered runs produced an artifact with
no abort, against a 2-of-9 baseline; the full suite is unchanged at 5130 pass / 0 fail.

Our measurements were added to upstream #420.

### Three hypotheses tried and ruled out, kept so nobody retries them

**The `parallel` option — ruled out by reading the source, not by running it.**
`ember-cli-code-coverage/lib/attach-middleware.js` `reportCoverage()` does this when
`config.parallel` is set:

    config.coverageFolder = config.coverageFolder + '_' + crypto.randomBytes(4).toString('hex');

It renames the output folder and forces the `json` reporter, requiring a separate `ember
coverage-merge` step. It does not change how coverage travels from the browser to disk — same POST,
same race — so it would break the current setup without touching the cause.

**Moving `forceModulesToBeLoaded()` off the teardown path — tried, and it did not help.**
`tests/test-helper.js` calls it inside the `QUnit.done` hook, before `await sendCoverage()`. The
theory was that on a filtered run almost nothing is loaded yet, so force-loading is a large
synchronous burst that delays the POST past the window testem leaves before killing the browser —
and that full runs escape it because they have already loaded nearly everything. That explains the
direction of the correlation, which no other theory here does.

Moving it to `QUnit.begin` produced **0 artifacts in 3 runs** (the run was interrupted before the
planned 6). The suite still passed at 139, so the move is harmless, but there is no evidence it
helps and it was reverted rather than committed unproven. Note 0-of-3 does not *disprove* it either
— against a ~22% baseline, three misses in a row happens about half the time — so if anyone wants to
retry it, do so with at least ten runs.

### Measured: the POST never reaches the server

Instrumented `coverageHandler` in `ember-cli-code-coverage/lib/attach-middleware.js` with four log
points and ran the fast filter three times (`--port=7399`, to avoid colliding with another session):

    run 1: 139 pass, NO-ARTIFACT   zero probe lines
    run 2: 139 pass, ARTIFACT      all four probe lines
    run 3: 139 pass, NO-ARTIFACT   zero probe lines

**On a failing run the middleware is never entered.** That eliminates every server-side
explanation — it is not "sent, and the write died" — and locates the fault in the browser, between
`fetch('/write-coverage')` being called and the request completing. It also explains why moving
`forceModulesToBeLoaded()` changed nothing: the problem is not delay *before* the POST.

### The surviving explanation, and why it fits the run-length asymmetry

QUnit 2.25 runs `done` callbacks as a **serial promise chain in registration order**
(`runLoggingCallbacks`). Testem's adapter registers its handler before the app's `tests/test-helper.js`
does, so testem learns the run has ended — and begins closing the browser — while `sendCoverage()`
is still in flight.

After a 139-test run testem has almost nothing to serialize, so the browser dies within
milliseconds and the fetch is aborted. After a 5130-test run, emitting thousands of results buys the
fetch enough time to land. That is the asymmetry that made this look like random flakiness, and it
is the first explanation consistent with every observation.

**Fix candidates, in order of promise:**
1. `navigator.sendBeacon('/write-coverage', blob)` in place of `fetch`. It exists precisely for
   delivery during page teardown and is not cancelled when the page goes away. The response cannot
   be read, but the only thing the response feeds is an on-screen coverage badge. Can be done in
   `tests/test-helper.js` without patching the addon.
2. Register the coverage `done` handler before testem's, if the test page's load order allows it.
3. Keep a `keepalive: true` flag on the existing fetch — the same underlying mechanism as
   sendBeacon, and a one-word change worth trying first.

Whichever is chosen, verify it the same way: ten fast filtered runs, counting artifacts against the
~22% baseline.

## 17. `addon/components/full-calendar.js` — every event listener leaks, and the obvious fix does not work

**Status:** FIXED (PR #161)
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
destructor is necessary but NOT sufficient. The method did:

    this.calendar.off(eventName, this.triggerCalendarEvent.bind(this, callbackName));

`.bind()` returns a NEW function every time, so the reference passed to `.off()` can never equal the
one `.on()` was given, and FullCalendar removes nothing. Wiring the call up as-is would look like a
fix, pass a test that only asserts the method ran, and leak exactly as before.

**Applied:** `createCalendarEventListeners` now binds once, stores the resulting function on the
`_listeners` entry, and hands that same reference to both `.on()` and `.off()`; `willDestroy` calls
`destroyCalendarEventListeners`, which also empties `_listeners`. Covered by *a destroyed calendar
stops firing its callbacks* and *every subscribed event is unsubscribed, not just the first*, which
assert the observable behaviour — trigger the event after teardown and require no callback — rather
than that the method ran. Both were confirmed to FAIL against the `.bind()` mismatch with
`willDestroy` already wired, which is the version that looks fixed and is not.
full-calendar.js is now at 100% statements, branches, functions and lines.

**Still open, and deliberately out of scope here:** the component never calls
`this.calendar.destroy()`, so the FullCalendar instance and the document-level handlers it installs
outlive the component. That is a separate and probably larger leak than the one above — the
integration tests work around it with an `afterEach` that destroys the captured calendar. Fixing it
changes what a consumer's `@onInit` reference points at after teardown, so it needs its own decision.

## 18. Coverage branch totals still vary by ±1 between identical runs

**Status:** OPEN — same class of blocker as #4 was, and the last one known
**Found:** verifying the #16 fix. Three full runs, all 5130 tests passing, all with identical
statement totals (8366/8702) and an identical `layout/sidebar.js` (203/215) — but **branches differ**:

    run 1: 5826 / 6255   93.14%
    run 2: 5826 / 6255   93.14%
    run 3: 5825 / 6255   93.12%

**Impact:** a hard 100% gate flaps on this with no code change, exactly as #4 did before it was
fixed. It is smaller than #4 (±1 branch rather than ±2 statements) and is not in `sidebar.js`,
whose statement count is now stable.
**Fix:** unknown — the culprit has not been located. Finding it is the same exercise that worked for
#4: capture `coverage-final.json` from two runs that disagree and diff the per-file branch counts to
name the file, then read the site. Do NOT reason about the mechanism first; #4 cost two wrong
diagnoses that way, and the artifact named the answer in one step.

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

---

## Appendix A — the earlier numbering (#25–#160), and why references to it are stale

Before this file existed, findings were recorded as numbered comments on PR #143 under a different
scheme that ran to #160. That numbering survives in a few source comments — `full-calendar-test.js`
cites "DEFECTS.md #94 for Leaflet", for instance — and those references now point at nothing, because
this file restarted at #1.

**Every finding in that older set has since been resolved.** Verified against the current source on
2026-08-25 before the PR comments were retired; each line below names the evidence:

| old # | finding | outcome |
|---|---|---|
| #146 | `filter/multi-option`'s `search` called an `@task` as a function, and mutated `this.options` | fixed — `this.fetchOptions.perform(...)`, with the old bug described inline |
| #150 | `overlay.resize` clamped on width and returned before the `isHorizontal` fork, so a bottom drawer could never resize | fixed — `minSize = isHorizontal ? minResizeWidth : minResizeHeight` |
| #143 | `custom-field/form`'s `save` task assigned to `this.args` and called a misnamed callback | resolved by deletion — `addon/components/custom-field/form.js` no longer exists |
| #160(a) | `set-height` turned `'auto'` / `'100%'` into the invalid string `"px"` | fixed — keyword values take the `calculated` path |
| #160(b) | `services/leaflet` never set `initialized` when an instance was preset, so the poll ran forever | fixed — `initialized = true` hoisted out of the `instance === undefined` check |
| #156 | `transition-to` asserted the same condition as the `if` it sat inside, so it could never fire | fixed — `=== 'string'` |
| #154 | `resource-context-panel.open()` read the definition before validating it | resolved — the component was restructured; no `open()` or validate path remains |
| #152 | `is-menu-item-active`'s contradictory `slugOnly && view` | resolved — the helper no longer exists |
| #139 | `custom-field/input`'s money arm could never run, and disagreed with the raw arm | fixed — the arm was removed, with the reasoning inline |
| #141 | `dashboard/widget-panel`'s `hoveredWidget` / `onHover` / `onUnhover` | resolved — no occurrence anywhere in `addon/` |
| #147 | `custom-field/yield`'s `resolveSubject` and `toggleGroupEdit` | resolved — both gone |
| #149 | `custom-field/options-input`'s `addMetaOption` | resolved — gone |
| #151 | `smart-nav-menu/customizer`'s `unpinnedItems` | resolved — gone (`reorderPinned` stayed and is now covered) |
| #148 | the three `query-builder` `validate*` actions were never performed, so a panel kept sorting and grouping by deselected columns | fixed — all three are wired to `{{did-update}}` on the column list (`conditions.hbs:3`, `group-by.hbs:3`, `sort-by.hbs:3`) |
| #128 | `attach/popover`'s `@isOffset` guarded on a field nothing assigned | fixed, with the old behaviour described inline |
| #120 | `modal`'s `@fade={{false}}` did not disable transitions | fixed — the `_fade` getter |
| #105 | `model-select`'s infinite scroll was inert | fixed (PR #151) |
| #108 | `table/cell/resource-identity` hard-coded its compact padding | fixed (PR #152) |
| #26 | `translations-editor` backtracking assertion | fixed (PR #149, rebuilt around stable rows) |
| — | the scheduling cluster (`availability-editor`, `schedule-calendar`, `schedule-item-card`) | resolved — none of the three remains |
| — | adopt `eslint-plugin-qunit`; add a lint rule for unguarded handler arguments | done (PR #148) |

If you meet an old-scheme reference in a source comment, this table is where it resolves to. The
`#94` in `full-calendar-test.js` is the Leaflet-state-leak finding, fixed long ago; the `afterEach`
it justifies is still doing real work for the reason given in #17.

## Appendix B — why the remaining gaps are where they are

Kept from the PR #143 write-up because it is the most reusable thing that came out of this work.
Seven categories account for essentially every site the gate still names.

**1. Defaults on signatures only the framework calls.** Glimmer always invokes
`compute(args.positional, args.named)` with both arguments, passing an empty object when the
template supplies none; ember-modifier does the same. So `named = {}` / `positional = []` can never
take their default. Affects the six ability helpers, `now`, `place-address`, `get-model-name`,
`set-model-attr`, `format-date-fns`, `json-stringify`, `background-url`.

The distinction that costs the most time: **a default on a plain function or a service method is
real, reachable surface** — chasing those produced 24 tests in a single iteration across
`modals-manager`, `dashboard`, `services/sidebar` and `sidebar-navigator`. A default on a
framework-invoked signature is dead. They are indistinguishable in istanbul's branch map; only the
call site tells them apart. Positional destructuring like `[direction = 'bottom']` *is* reachable,
because the positional array can be shorter.

**2. Resolver-provided services that cannot be removed.** `is-dark-mode`,
`get-universe-components`, `get-universe-menu-items` and `sidebar-navigator`'s
`lookupService('router') ?? lookupService('host-router')` all guard on `if (service)`. Reaching the
else needs `lookup` to answer nothing, and `owner.unregister('service:theme')` does not achieve
that: the dummy app provides these through the *resolver*, and `unregister` only removes explicit
registrations. You can shadow a resolver factory by registering over it; you cannot make it vanish.

**3. `@tracked` initializers a constructor pre-empts.** `@tracked x = false` compiles to a lazy
initializer. When the constructor assigns before anything reads — the prevailing style here — the
initializer never runs and the field declaration reports as uncovered forever. The fix is dropping
the redundant initializer, not adding a test.

**4. Statements after a `throw`.** `dropdown-fn`'s two `return false` lines.

**5. Guards whose only entry point is already disabled.** In each case the button that calls them
carries `disabled={{…}}` for exactly that condition and an existing test asserts the disabled state.
This turned out to be the single most common unreachable shape in the codebase.

**6. Comparator early-return halves.** `to-power-select-groups` and `truncate-pages` — `if (A < B)` /
`if (A > B)` pairs where one side stays unvisited for any array a test can construct.

**7. Genuine harness questions — mostly disproven since.** This category was the largest, and most of
it did not survive contact: the `template-builder` files were said to be blocked on
interact.js/drag-sort DOM measurement, and both libraries turned out to be drivable (see #16's
neighbours and PR #161). Treat anything in this category as unverified until someone has actually
tried it.

## Appendix C — habits that paid for themselves

**A green test is not evidence that the branch you aimed at ran.** Five tests written during the
original work passed while covering nothing: three re-asserted an outcome another test already
covered, and two fed already-sorted input so the comparator never took the branch they were aimed
at. Only the next coverage report caught them. This has recurred in every phase since.

**A test that fails against production code is a finding, not a broken test.** Seven were deleted
rather than weakened for this reason, and each deletion was a defect report.

**A fully-populated fixture hides every fallback.** `activity-log`'s `#normalizeActivity` is fifteen
consecutive defaulting expressions and every fixture was a complete activity, so all fifteen
right-hand sides were dead in the suite while being exactly what a trimmed API response hits. One
`{}` took that file from 29 partial branches to 9. Same story in `dashboard/widget-panel`,
`chat-tray` and `place-address`.

**A module reached only through its consumer is only ever called the way that consumer calls it.**
`sidebar-navigator`'s ten defaulted parameters had never defaulted; one unit test file closed 20 of
its 21 partial branches.

**Ranking by absolute uncovered counts hides small modules.** The component-heavy ranking buried a
tier of small utils and services — including two still carrying generated "it works" stubs — behind
a handful of large components. The per-file percentage view surfaced them and produced the largest
single-iteration branch gain of the effort.

## Appendix D — kickoff brief for #15, the table's `query` data mode

Written at the end of the sweep session so the next one does not have to rediscover the terrain.
Everything below was verified against the source on 2026-08-25.

### What exists today

**The mode switch.** `properties-panel.js:199` `setTableDataMode(mode)` handles `manual`, `variable`
and `query`, clearing the other modes' fields for each. The template
(`properties-panel.hbs:251-268`) offers a **two**-button toggle, Variable and Manual. Nothing calls
it with `'query'`, so that branch reports `[0,0]`.

**The fields the query branch manages** — `query_endpoint`, `query_params`, `query_response_path` —
appear in exactly four places across every package in the monorepo, and all four are the *clearing*
assignments in the `manual` and `variable` branches. Nothing writes a value to them and nothing
reads them.

**A working query system already ships, by a different route.** `TemplateBuilder::QueryForm` builds
a saved query — `{ uuid, label, variable_name, description, model_type, conditions, sort, limit,
with }` — and hands it to the parent via `@onSave`; it makes no API calls itself.
`TemplateBuilder::QueriesPanel` does the CRUD and notifies through `@onQueriesChange`.
`template-builder.js:453` `handleQueriesChange` keeps `this.queries` current, `:157`
`enrichedContextSchemas` exposes each saved query as a variable under a `__queries__` namespace, and
`:141` includes `queries` in the save payload so the backend can upsert them with the template.

So a query-backed table is built **today** by choosing Variable mode and pointing Data Variable at a
query variable. That is why Variable mode's clearing branch bothers to null the query fields.

### The fact that shapes the whole design

**Nothing in this addon resolves a data source at render time.** `element-renderer.js:329-334` reads
`element.columns` and `element.rows` directly — the manual arm and nothing else. A variable-mode
table renders no rows in the canvas either. The builder stores *intent*; something downstream (the
backend renderer, or the consuming app) resolves it.

Decide early whether `query` mode is also store-only intent, or whether the panel is expected to
fetch and preview. Those are very different pieces of work, and the second one is the one that needs
an auth story.

### What has to be settled before writing code

1. **Endpoint contract.** What does `query_endpoint` hold — a bare path, a full url, a named
   endpoint? Who validates it?
2. **Auth.** If the panel fetches, it goes through the `fetch` service and inherits its
   session handling. If it does not fetch, this question disappears — another reason to settle the
   point above first.
3. **`query_params` shape.** `[{ key, value }]` matching the existing param editors, or a plain
   object? The clearing branch seeds `[]`, which implies an array.
4. **`query_response_path`.** Dotted path into the response (`data.results`)? What happens when it
   does not resolve?
5. **Loading and error states** in the panel, if it fetches.
6. **Reconciliation with `__queries__`.** This is the one that matters most. Saved queries already
   solve "get rows from the server into a table". Adding a per-element endpoint creates a second
   mechanism that does the same job with less structure — no `variable_name`, no reuse across
   elements, no participation in the save payload. Either make `query` mode meaningfully different
   (arbitrary external endpoints the query builder cannot express?) or drop it and delete the three
   fields. Do not build a parallel path by default.

### Ground rules for that session

- The panel is a shared component: adding a third toggle button changes UI for every consumer.
- Tests before merge, and one that fails against the current code — that is the campaign's standard.
- The `query` branch stays uncovered rather than suppressed. An `istanbul ignore` here has to sit on
  the opening `if`, and `ignore else` there also swallows the `variable` branch, which real tests
  cover. So the coverage gate will keep pointing at this until it is built or deleted — which is the
  intended behaviour, not an obstacle to work around.
- Read `Appendix B` first if you plan to chase the coverage number afterwards.
