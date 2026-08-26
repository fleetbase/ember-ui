# DEFECTS

Findings from the test-coverage campaign that need a decision or a fix. Fixed entries are removed
once they ship — this file is a worklist, not a changelog. Git history is the changelog.

**Archive.** Entries #1–#17 were all fixed and have been removed. They are preserved in full, with
their evidence and reasoning, at
[DEFECTS.md as of `c9bc486`](https://github.com/fleetbase/ember-ui/blob/c9bc48676f1c12ddc603559d44c85993f9ed48fe/DEFECTS.md).
Anything in this repo that cites an old defect number resolves there.

## Format

```
## N. `path/to/file.js` — one-line summary

**Status:** OPEN | FIXED (where) | WONTFIX (reason) | NEEDS DECISION
**Found:** how it surfaced
**Evidence:** what proves it, traced — callers, branch counts, grep results. Never "appears unused".
**Impact:** what it costs a user, or none
**Fix:** what to do, and what makes it more than a one-liner if it is
```

Earn the claim before writing it down. "Not referenced by a template" is not "dead code" is not
"broken", and current behaviour is often deliberate — two entries in the original set were wrong
exactly there.

---

# Status

The coverage gate passes **in CI** — run
[32938940906](https://github.com/fleetbase/ember-ui/actions/runs/32938940906), commit `a210ac1`:

    Statements   : 100% ( 8456/8456 )
    Branches     : 100% ( 5963/5963 )
    Functions    : 100% ( 2234/2234 )
    Lines        : 100% ( 8015/8015 )
    # tests 5396 / # pass 5396 / # fail 0
    Coverage gate passed: 100% statements, branches, functions and lines across all addon files.

That qualifier is the point. The gate passed locally for some time before it ever passed in CI, and
the difference was not noise — see the two conventions below.

What remains below is the worklist that outlived the campaign: findings that need a product
decision rather than a fix (#21, #26, #31), and #18, which is about the measurement rather than the
code. Everything else in the numbered range shipped and was removed.

Two conventions worth knowing before adding to this file:

- **Every `istanbul ignore` in the addon carries a reason naming the specific thing that makes the
  code unreachable** — the caller that always passes the argument, the template that disables the
  control, the constructor that assigns the field first. An ignore without that trace is a bug
  waiting to be reintroduced, not a coverage exemption.
- **`istanbul ignore next` does not attach to an object-property value or to a destructured
  parameter in some positions.** Where it will not take, hoist the expression into a local `const`
  and put the comment above that.
- **An ignore inside a method body does not ignore the method.** The statement stops counting, but
  the function still has to be *called* to count as covered. `tip-tap-editor`'s `onFocus`/`onBlur`
  sat at 46/47 functions in CI and 47/47 locally for exactly this reason. Put the comment above the
  method when the method itself is what cannot run.
- **A local pass is not a CI pass, and the gap is usually window focus.** Headless Linux Chrome
  never gives the page focus and macOS Chrome does, so anything downstream of focus differs: tiptap
  calls `onFocus`/`onBlur` locally and not in CI, and the browser fires `blur` as a focused input is
  torn down locally and not in CI. Coverage that arrives *incidentally*, from an event the browser
  happened to send, is the coverage that disappears in CI. Cover the path on purpose instead —
  `layers-panel`'s re-entrancy guard is now covered by two blurs dispatched in the same tick, which
  no platform gets a vote on.
- **`Browser timeout exceeded: 120s` naming a specific test is usually navigation, not a hang.**
  Clicking a real `<LinkTo>` in a rendering test either starts a transition the test app cannot
  service, or — for a modifier-held click, which Ember deliberately hands back to the browser — lets
  the page follow the `href` and navigate away from the test harness. testem then loses the browser
  and the whole run dies. Hold the modifier *and* suppress the default action. This one kept the
  suite from ever reaching the gate step in CI.

# Open

## 31. `addon/components/floating.js` — `@arrow` renders an arrow that is never positioned

**Status:** OPEN — logged, not changed; a real fix is a feature, not a repair
**Found:** the `if (arrowNode instanceof Element)` guard that installs floating-ui's arrow
middleware has no coverage, and tracing why turned up two independent reasons it can never work.
**Evidence:**

    :94  const arrowNode = element.closest('[x-arrow]');
    :96  if (arrowNode instanceof Element) { middleware.push(arrow(arrowNode)); }

`element` is the floating element, and the arrow — `<div x-arrow>` in `attach/popover.hbs` — is a
*descendant* of it. `closest()` searches the element and its ancestors, so it never finds one and
the middleware is never installed.

And even if it were, nothing would come of it: `computePosition()` (`:141`) destructures only
`{ x, y }` from the result and never reads `middlewareData.arrow`, which is the only thing the
arrow middleware produces.

**Impact:** `<Attach::Popover @arrow={{true}} />` renders the arrow element and its CSS, and the
arrow is never placed against the target — it sits wherever the stylesheet leaves it.

**Fix — not applied.** Making it work needs both halves: `querySelector` instead of `closest`, and
applying `middlewareData.arrow`'s `x`/`y` to the arrow element after each computation. That is
implementing the feature, not correcting a slip, and it changes what every popover with an arrow
looks like. Fixing only the lookup would install middleware whose output is discarded.

## 30. `addon/components/basic-dropdown-hover.js` — a zero delay was read as no delay at all

**Status:** FIXED
**Found:** the `else` arms of `if (openDelay)` and `if (closeDelay)` — the branches that open and
close without a timer — had no coverage, and a test asking for `@openDelay={{0}}` did not reach
them.
**Evidence:** `getDelay()` picked its answer by truthiness:

    if (this.args[`${action}Delay`]) { return this.args[`${action}Delay`]; }
    if (this.args.delay) { return this.args.delay; }
    return defaultDelay;   // 300

`0` is falsy, so `@openDelay={{0}}` fell through both checks and became 300ms. The function could
therefore never return a falsy delay, which is why the immediate-open and immediate-close arms
below it were unreachable.

**Impact:** a consumer asking for a hover dropdown with no delay got the default 300ms one — in
both directions, and for `@delay={{0}}` as well.

**Fix — applied:** both checks compare against `undefined` rather than testing truthiness. `0` now
means what it says, and the two arms it unlocks are covered by a test that opens and closes with
no timer in between.

## 29. `addon/components/aside-item-scroller.js` — an item with no title throws before its guard

**Status:** FIXED
**Found:** the `continue` inside `itemsGroupByTitleLetter` had no coverage, and the reason turned
out to be that it cannot be reached.
**Evidence:**

    const title = get(item, titleKey);
    const firstLetter = title[0];        // ← throws first

    if (!title || !firstLetter) {
        continue;
    }

An item whose `titleKey` resolves to undefined dies on `title[0]` — `Cannot read properties of
undefined (reading '0')` — one line before the guard written to skip it. The same shape as the
`@item` guard in `layout/header/dropdown/item.js`, which was fixed earlier for the same reason.

**Impact:** a single untitled item takes the whole grouped list down, and the getter is read
straight from the template, so the component renders nothing at all.

**Fix — applied:** the `!title` check moved above the dereference. `!firstLetter` went with it: a
non-empty string always has a first character, so that half could never have been the reason to
skip.

## 28. `addon/components/model-select.js` — one unusable record empties the whole dropdown

**Status:** FIXED
**Found:** writing a test for the `catch { return null; }` inside the custom-search-endpoint
mapper. The test did not fail on its assertion — it failed inside ember-power-select:

    TypeError: Cannot read properties of null (reading 'disabled')
        at walk (ember-power-select/utils/group-utils.js)

**Evidence:** `fetchPage()`'s custom-endpoint branch maps each result through
`this.store.push(this.store.normalize(...))` and returns `null` for any the store refuses. Those
nulls stayed in the array, which was resolved to power-select as the option list. Power-select's
option walker dereferences every entry, so a single un-normalisable record throws while the
dropdown renders — taking every other result with it.

**Impact:** a search against a `@customSearchEndpoint` that returns one malformed record shows an
error instead of the records that were fine.

**Fix — applied:** `resolve(records.filter(Boolean))`. The `catch` already meant "drop this one";
now it does.

## 27. `addon/components/array-input.hbs` — typing writes the keyboard event into the array

**Status:** FIXED
**Found:** `onChange` and `onPaste` were the only two functions in array-input.js with no coverage,
which meant nothing in the suite had ever fired a keyup or a paste on a row.
**Evidence:** the row input bound three handlers, and one of them was wired to the wrong method:

    {{on "change" (fn this.onChange index)}}   → onChange reads event.target.value
    {{on "paste"  (fn this.onPaste index)}}    → onPaste reads event.target.value
    {{on "keyup"  (fn this.inputDatum index)}} → inputDatum(index, input) stores `input` as-is

`inputDatum`'s second parameter is the *value*, not an event. Bound to keyup it received the
KeyboardEvent, so `this.data[index] = event`. Confirmed with a probe: after one keyup, the first
element of the array reported to `@onDataChanged` had `typeof === 'object'`.

**Impact:** every keystroke in an array row reported an array with a KeyboardEvent in it to
`@onDataChanged`. The field's own `change` event overwrites it with the real value on blur, so the
damage is limited to consumers that act on the value as it is typed — and to anything that
serialises what it is handed.

**Fix — applied:** keyup now goes through `onChange`, the same handler the change event uses, which
reads `event.target.value`. Covered by a test asserting the typed value rather than the event, plus
tests for paste (with and without a value) and for editing with no handler at all.

## 26. `addon/components/layout/sidebar/navigator.js` — a search result with children cannot be opened

**Status:** OPEN — logged, not changed; the fix is a design decision (see below)
**Found:** covering the `result.path ?? [...this.currentStack, item]` fallback, which only a search
provider's result can reach — provider results carry no path through the item tree.
**Evidence:** `openSearchResult()` descends into a result that has children:

    :386  this.transitionToStack(result.path ?? [...this.currentStack, item], 'forward');

`currentStack` (`:114-131`) is not stored — it is rebuilt every time by walking `viewStack` and
matching each entry against `this.items` with `findMatchingItem`, breaking at the first entry it
cannot find. A provider result is not in `@items`, so the entry appended by that fallback is
dropped on the very next read and the navigator falls back to its root.

**Impact:** a `@searchProvider` that returns a result with `children` looks like it can be opened
and then does nothing visible — the panel closes and the navigator returns to the top level. A
provider returning leaf results (the common case, and what every existing test uses) is unaffected.

**Fix — not applied.** Two shapes are plausible and they are not equivalent: keep provider results
out of the stack entirely and require a provider to supply `path` for anything navigable, or let
`currentStack` hold items that are not in `@items` — which changes what "the current stack" means
and affects the transition and breadcrumb code that reads it. That is a design call.

Covered by a test that pins the current behaviour rather than the intended one, and names this
entry so the two move together.

## 25. `addon/components/kanban/card.hbs` — `@onCardUpdate` and `@onCardDelete` could never fire

**Status:** FIXED — the card's actions are handed to a custom card template
**Found:** `onUpdate` and `onDelete` on `kanban/card.js` were the only two functions in the file
never invoked, in either coverage or the tests.
**Evidence:** the callbacks are wired the whole way down and then dropped on the last step:

    kanban.hbs:24-25       onCardUpdate=@onCardUpdate  onCardDelete=@onCardDelete
    column.hbs:33-34,58-59 onUpdate=(fn (or @onCardUpdate (noop)) card)  …
    card.js:47,57          @action onUpdate(updates) { if (this.args.onUpdate) … }
    card.hbs               — no reference to either, and no edit or delete control

The default card body renders a title and a description. There is no control that calls
`this.onUpdate` or `this.onDelete`, and the card yields nothing, so no consumer could call them
either. `@template` — the documented way to supply your own card body — received only `card`.

**Impact:** two arguments `<Kanban>` accepts, documents and threads through two components can never
be called. A consumer wiring `@onCardUpdate` gets silence.

**Fix — applied:** `card.hbs` now passes the card's own actions to the custom template:

    {{component @template card=this.card onUpdate=this.onUpdate onDelete=this.onDelete}}

Additive — an existing custom template that ignores them is unaffected — and it makes the
callbacks reachable by the route the API already implies. The guards inside the two actions matter
now too: a custom template can be rendered by a `<Kanban::Card>` with no handlers behind it, and
both cases are covered.

## 24. `addon/components/modal.js` — `showBackdrop()` asserts on a modal that was torn down

**Status:** FIXED
**Found:** writing a test that opens a modal and removes it from its parent template in the same
tick. The suite went red with a global failure, not a test failure.
**Evidence:**

    Error: Assertion Failed: Backdrop element should be in DOM
        at wrapperClass.showBackdrop
        at async wrapperClass.show

`showBackdrop()` sets `shouldShowBackdrop`, awaits `nextRunloop()`, and then asserts the backdrop
element is present. Inside that runloop the component can be destroyed — and the backdrop is
rendered by the component, so it goes with it. `hideBackdrop()` already guards its own teardown
this way (`if (this.isDestroyed) return`); `showBackdrop()` had no guard on the way in.

**Impact:** a dev-build assertion — so a hard failure in development and tests — from an ordinary
sequence: open a modal and navigate away, or open one inside a block that stops rendering. In
production builds the assert is stripped and `transitionEnd(undefined, ...)` rejects instead,
leaving `_isOpen` true and the body class attached.

**Fix — applied:** the same `isDestroyed || isDestroying` guard, immediately after the await.

Also worth recording, because it cost the most time here: `utils/transition-end.js` forces every
duration to 0 while `Ember.testing` is true, which collapses `show()` and `hide()` into a single
tick and closes every window between their awaits. Tests that need those windows have to call the
exported `skipTransition(false)` first and restore it afterwards.

## 23. `addon/components/attach/popover.js` — `@flip`, `@modifiers` and `@floatingOptions` are inert

**Status:** FIXED — the three fields are removed
**Found:** their `@tracked` initializers were the only statements in the class body never executed,
which in this codebase means the field is never read.
**Evidence:** `flip`, `modifiers` and `floatingOptions` were declared `@tracked`, assigned by
`setDefaultOptions()` like every other argument, and then read by nothing — not the component, not
`popover.hbs`, not `Floating`. They are Popper-era options that did not survive the move to
floating-ui; the positioning arguments this component actually forwards are `@offset` and
`@shiftOptions`.

**Impact:** small but real — a consumer passing `@flip={{false}}` gets silence, not an error.
Removing the fields does not change behaviour either way (`setDefaultOptions` still sets a plain
property), but it stops the class advertising three options it cannot honour.

Also removed: `debouncedHideIfMouseOutsideTargetOrAttachment`, an `@action` with no caller anywhere
in the addon, the template, or the tests. The TODO above `hideOnMouseLeaveTarget` explains why the
mousemove listener uses the undebounced handler directly.

## 22. `addon/components/attach/popover.js` — `hide()` spins requestAnimationFrame forever

**Status:** FIXED
**Found:** chasing the uncovered `!floatingElement` retry in `hide()`. The matching retry in
`setIsVisibleAfterDelay()` was covered, which was the tell: the two have the same shape but only one
of them is ever preceded by something that will render the element.
**Evidence:** with `@lazyRender={{true}}` the attachment is not in the DOM until it is first shown:

    popover.hbs:2  {{#if (and this.currentTarget (or (not this.lazyRender) this.mustRender))}}

The hide listeners, however, are attached during setup, from `initializeAttacher()`. So a
`mouseleave` on a lazily-rendered popover that has never been shown reaches `hide()` with
`mustRender` still false and no `floatingElement`. `hide()` answers that by scheduling itself on the
next frame — and nothing in that path ever sets `mustRender`, so the next frame finds exactly the
same state. `setIsVisibleAfterDelay()`'s identical retry is safe only because its caller, `show()`,
sets `mustRender = true` first.

**Impact:** an unbounded `requestAnimationFrame` loop for the lifetime of the page, started by
nothing more than moving the mouse across a lazily-rendered popover's target. It survives the
component's own destruction: the queued callback re-enters `hide()` on a torn-down component and
schedules another frame.

**Fix — applied:** `hide()` bails when there is nothing to hide and nothing on its way, marking
itself hidden:

    if (!this.mustRender || this.isDestroyed || this.isDestroying) {
        this.isHidden = true;
        return;
    }

The retry is kept for the case it was written for — a hide landing in the window between
`mustRender` becoming true and the element being rendered — and that window now has a test too.
The regression test counts frames rather than asserting on the DOM: it holds
`window.requestAnimationFrame`, triggers the hide, and asserts no frame was queued. Verified to
fail (5 frames instead of 0) with the guard removed.

## 21. `addon/components/query-builder.js` — the `columns` getter's work is thrown away

**Status:** OPEN — logged, not changed; the fix is a behaviour decision (see below)
**Found:** chasing the uncovered `join.table?.columns` else-branch and the two `label || name`
fallbacks inside the getter.
**Evidence:** `query-builder.js:25-56` walks the selected table and every join and composes a
fully-labelled entry per available column (`label: `${join.table.label || join.table.name} - ...``).
That list is handed to the conditions panel as `@columns`, on both the block form
(`query-builder.hbs:31`) and the flat form (`:75`). `query-builder/conditions.hbs` mentions
`@columns` exactly once:

    :15  {{#if @columns}}

Nothing else reads it. Every field the panel actually offers comes from `availableColumns`
(`conditions.js:36`), which reads `@allSelectedColumns`, falling back to `@selectedColumns` — with
the explicit comment "This ensures conditions can only be applied to selected columns."

**Impact:** two things, both small. The label composition is dead work on every recompute. And the
panel body's visibility is gated on the columns a query *could* use rather than the ones it does,
so choosing a table opens the conditions panel with an empty field dropdown.

**Fix — not applied.** Making `@columns` drive the field list would contradict the stated rule that
conditions apply only to selected columns, and changing the gate to `@allSelectedColumns` changes
when the panel appears. Both are product calls, not repairs. The getter is now covered by three
tests in `query-builder-test.js` that pin the gate — the only observable it still drives — including
the joins-with-no-columns case that leaves it closed.

## 20. `addon/components/attach/popover.js` — document listeners are added and never removed

**Status:** FIXED — `willDestroy()` now calls `removeEventListeners()`
**Found:** chasing the uncovered body of `removeEventListeners()` while closing coverage gaps.
**Evidence:** the component registers listeners on `document`, not just on its target:

    :294  document.addEventListener(clickoutEvent, this.hideOnClickOut, this.useCapture);
    :299  document.addEventListener('keydown', this.hideOnEscapeKey, this.useCapture);
    :327  document.addEventListener('mousemove', this.hideIfMouseOutsideTargetOrAttachment, ...);

`removeEventListeners()` exists and does the right thing, but its only caller is the first line of
`initializeAttacher()` (`:124`), which runs once from `{{did-insert this.setupComponent}}`. At that
moment the listener maps are still empty, so the removal loops never execute — which is why they
show as uncovered. There is no `willDestroy`, no `registerDestructor`, and no template reference.

**Impact:** real. Every popover that is rendered and then destroyed leaves a `click`/`touchend`
handler and — when `hideOn` includes `escapekey`, which is the default — a `keydown` handler on
`document` for the lifetime of the page. A route that renders many popovers accumulates them, and
each surviving handler still runs `hideOnClickOut` against a destroyed component.

**Fix — applied:** `removeEventListeners()` is called from `willDestroy()`. Unlike the full-calendar
leak, the method itself was already correct — it stores each handler on `hideListenersOnDocumentByEvent` /
`hideListenersOnTargetByEvent` and passes the stored reference to `removeEventListener`, so the
references match. This is the wiring, not the logic.

`this.useCapture` is the same tracked value at add and remove time — the component reads it once
into `lastUseCaptureArgumentValue` and never re-registers — so the removal matches. Covered by two
tests that dispatch the click and escape events a leaked handler would answer, after the component
is gone, rather than asserting the method ran.

## 18. Coverage branch totals still vary by ±1 between identical runs

**Status:** OPEN — but it has not been observed since the gate reached 100%. Three consecutive full
runs at 5395 tests all report an identical 5963/5963 branches. The denominator is far smaller now
than when this was found (6255), because a large number of unreachable branches have been ignored
with traces rather than left in it — so there is simply less surface for it to flap on. Treat the
entry as unresolved rather than fixed: the mechanism was never located, and a run that comes back
at 5962/5963 is this, not a regression in the code.

**Original finding below.**

**Was:** same class of blocker as #4 was, and the last one known
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

# Reference

## Coverage collection: the trade this repo is balanced on

Not a defect — the current settings, and why they are what they are. Both failure modes here were
live bugs (former #16 and #19 in the archive) and they pull in opposite directions.

The `/write-coverage` POST carries several megabytes, because a per-file 100% gate needs
`forceModulesToBeLoaded()` to evaluate every module so untested files stay in the denominator.

- **Post from `QUnit.done`** and nothing waits for the upload. Testem tears the browser down, the
  upload truncates mid-body, `raw-body` logs `BadRequestError: request aborted`, and **no report is
  written at all**. Silent — the previous run's artifact stays on disk and looks current. This is
  [upstream #420](https://github.com/ember-cli-code-coverage/ember-cli-code-coverage/issues/420).
- **Post from `Testem.afterTests`** (what `tests/test-helper.js` does now) and testem waits — but
  its `browser_disconnect_timeout` then has to outlast the upload, or the run exits 1 with
  `Browser timeout exceeded`, naming neither coverage nor the upload. Hence
  `browser_disconnect_timeout: 120` in `testem.js`.

If the payload keeps growing, the lever is `forceModulesToBeLoaded(filterFunction)` — the README's
custom filter. We currently force-load and transmit coverage for workspace siblings such as
`@fleetbase/ember-core` that `scripts/check-coverage.js` then discards, so there is real payload to
reclaim without touching the denominator that matters.

`scripts/stamp-coverage-run.js` and the freshness check in `scripts/check-coverage.js` exist because
of the first failure mode: they make a missing or stale artifact fail loudly rather than pass
quietly. Keep them regardless of how the upload is tuned.

## Why the remaining coverage gaps are where they are

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

---

## Habits that paid for themselves

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
