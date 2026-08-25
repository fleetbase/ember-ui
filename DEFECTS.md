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

# Open

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
