# HANDOFF — everything still open on `test/coverage-campaign`

Compiled 2026-08-26 for review and for the session that picks this up. Every item below is either
a decision only Ron can make, a diagnostic task with a written method, or an environment fact worth
knowing before it wastes an afternoon.

Sources consolidated here: `DEFECTS.md`, `BLOCKERS.md`, `NEED_INFO.md`. Those files stay
authoritative — this document points at them rather than replacing them.

---

> **UPDATE 2026-08-28 — all five decisions received from Ron and implemented.**
> 1.1 → implement the arrow (option a) · 1.2 → require `path` from the provider (option 1) ·
> 1.3 → gate the conditions panel on selected columns (option b) · 1.4 → `reloadComments` is
> published API, kept (option a) · 1.5 → a "Change Report" control was added (option 1).
> The item descriptions below are kept as they were compiled; the FIXED/DECIDED entries in
> `DEFECTS.md` and `NEED_INFO.md` record what actually shipped. Still open: the #18 measurement
> note (§3) and the environment facts (§4).

---

## Where things stand

The coverage gate passes **in CI**, which is the only place the claim means anything:

    Run 32938940906 · commit a210ac1 · branch test/coverage-campaign

    Statements   : 100% ( 8456/8456 )
    Branches     : 100% ( 5963/5963 )
    Functions    : 100% ( 2234/2234 )
    Lines        : 100% ( 8015/8015 )
    # tests 5396 / # pass 5396 / # fail 0
    Coverage gate passed: 100% statements, branches, functions and lines across all addon files.

Branch head `e35b732` is also green. PR
[#143](https://github.com/fleetbase/ember-ui/pull/143) is open, mergeable, awaiting review —
+70,127 / −5,687 across 693 files, 109 commits ahead of `main`.

**Nothing on this list blocks the gate or the merge.** All six open items are either product
decisions, one measurement question, or an environment note.

---

## 1. Decisions only you can make

Five items. Each was traced to the file and line before being written down, and each has the real
alternatives laid out — not a recommendation dressed as a question. Work continued past all of them.

### 1.1 `floating.js` — `@arrow` renders an arrow that is never positioned

`DEFECTS.md` #31 · **product decision · the fix is a feature, not a repair**

`<Attach::Popover @arrow={{true}} />` renders the arrow element and its CSS, and the arrow is never
placed against the target — it sits wherever the stylesheet leaves it. Two independent causes, and
fixing either alone does nothing:

- `floating.js:94` — `element.closest('[x-arrow]')` searches the element and its **ancestors**, but
  the arrow (`<div x-arrow>` in `attach/popover.hbs`) is a **descendant**. The lookup never finds
  it, so floating-ui's arrow middleware is never installed.
- `floating.js:141` — `computePosition()` destructures only `{ x, y }` and never reads
  `middlewareData.arrow`, which is the only thing the arrow middleware produces. So even a
  successful lookup would feed a result nothing consumes.

**The decision:** implementing this changes what every popover with an arrow looks like. It needs
`querySelector` instead of `closest` *and* applying `middlewareData.arrow`'s `x`/`y` after each
computation. That is building the feature.

**Options:** (a) implement it and accept the visual change across every arrowed popover; (b) remove
`@arrow` and its CSS so the component stops advertising something it does not do; (c) leave it
logged.

### 1.2 `layout/sidebar/navigator.js` — a search result with children cannot be opened

`DEFECTS.md` #26 · **design decision**

A `@searchProvider` returning a result with `children` looks openable and then does nothing visible:
the panel closes and the navigator returns to the top level. Providers returning leaf results — the
common case, and what every existing test uses — are unaffected.

`navigator.js:386` appends the item to the stack via `result.path ?? [...this.currentStack, item]`.
But `currentStack` (`:114-131`) is not stored — it is rebuilt on every read by walking `viewStack`
and matching each entry against `this.items`, breaking at the first entry it cannot find. A provider
result is not in `@items`, so the entry that fallback appends is discarded on the very next read.

**Options, and they are not equivalent:**
1. **Require `path` from the provider** for anything navigable, and keep provider results out of
   the stack entirely.
2. **Let `currentStack` hold items that are not in `@items`** — which changes what "the current
   stack" means and affects the transition and breadcrumb code that reads it.

**Meanwhile:** a test pins the *current* behaviour and names this entry, so the two move together.

### 1.3 `query-builder.js` — the `columns` getter's work is thrown away

`DEFECTS.md` #21 · **behaviour decision**

`query-builder.js:25-56` walks the selected table and every join and composes a fully-labelled entry
per available column. That list reaches `query-builder/conditions` as `@columns`, which mentions it
exactly once — `conditions.hbs:15`, `{{#if @columns}}`. Nothing else reads it. Every field the panel
actually offers comes from `availableColumns` (`conditions.js:36`), which reads
`@allSelectedColumns` falling back to `@selectedColumns`, with the explicit comment *"This ensures
conditions can only be applied to selected columns."*

**Two small costs:** the label composition is dead work on every recompute, and the panel's
visibility is gated on the columns a query *could* use rather than the ones it does — so choosing a
table opens the conditions panel with an empty field dropdown.

**Options:** (a) make `@columns` drive the field list — contradicts the stated rule that conditions
apply only to selected columns; (b) change the gate to `@allSelectedColumns` — changes when the
panel appears; (c) delete the label composition and keep the gate. All three are product calls.

### 1.4 `comment-thread` — is the yielded `reloadComments` published API?

`NEED_INFO.md` #2 · **API decision**

`comment-thread.js` yields `reloadComments` on the `contextApi` handed to `comment-thread/comment`.
Nothing in this addon calls it: `comment-thread/comment` reloads its own replies with
`this.comment.reload()`, and the thread-level reload only ever runs from `comment-thread.js`'s own
tasks.

**The question is about consumers this repo cannot see.** Is it part of the published API that host
apps call from their own block-form templates — keep it, and the `istanbul ignore` covering it
stands — or is it leftover, and both go?

### 1.5 `widget/report` — configure-once, or add a "change report" control?

`NEED_INFO.md` #3 · **visible change to a published widget**

`report.hbs` renders the "Select Report" button inside the `{{else}}` arm — the empty state. Once
`this.report` is set that arm stops rendering, and `selectReport` has no other caller: it is a plain
`@action`, not yielded, not registered through any API, and the dashboard does not reach into the
component. So `selectedReports`, which exists solely to preselect the current report in the picker,
can only ever return `[]`.

**Options:** (1) add a control to the loaded state — which is what `selectedReports` was clearly
written for, but this addon has no established reconfigure affordance to copy (`widget/count` and
`widget/query-params` have none); (2) leave it configure-once and delete `selectedReports`.

**Meanwhile:** the getter is kept, its dead branch carries an ignore naming this entry. **If option
1 is taken, that ignore must come out** — the branch becomes reachable.

---

## 2. Already decided, but reversible — flag if wrong

### `dashboard/widget-card` — two label getters were deleted

`NEED_INFO.md` · **DECIDED without an answer so the campaign could finish**

`addLabel` and `addedBadgeText` both reported `[0,0]` — never evaluated — and `grep -rn` across
`addon/` and `app/` found no reference outside their own definitions. Unlike three earlier findings
of this shape, these were not unwired UI but *superseded* UI:

- `addLabel` returned the keys `'add'` / `'add-another'` for a button label. The card has no button
  — the whole card is the click target (`role="button"` on the outer div), so there is nowhere for
  a label to go.
- `addedBadgeText` returned `On dashboard ×N`. The card already renders that information from
  `addedShortBadge` as `Added ×N`, and that getter *is* wired.

The copy is not lost, only a second wording of it. **To reverse:** restore both getters and render
`addedBadgeText` in place of `addedShortBadge`. `addLabel` additionally needs an explicit add button
in the template — a design change, not a restore.

---

## 3. One measurement question — a task, not a decision

### `DEFECTS.md` #18 — branch totals varied by ±1 between identical runs

**Status: open, but not observed since the gate reached 100%.** Three consecutive full runs at 5,395
tests all reported an identical 5963/5963. The denominator is far smaller now than when this was
found (6255), because a large number of unreachable branches carry traced ignores rather than
sitting in it — so there is less surface to flap on.

Treat it as unresolved rather than fixed: the mechanism was never located. **A run that comes back
at 5962/5963 is this, not a regression in the code.**

**Method if it recurs** — this is the part worth keeping: capture `coverage-final.json` from two
runs that disagree and diff the per-file branch counts to name the file, then read the site. **Do
not reason about the mechanism first.** The identical earlier bug (#4) cost two wrong diagnoses that
way, and the artifact named the answer in one step.

---

## 4. Environment — not a code problem, but it will cost you a run

### Chrome intermittently fails to start under machine contention

`BLOCKERS.md` · still live, nothing to fix in this repo

Running the full suite while another session is also running `ember test` produces a single
synthetic failure that reads like a broken suite:

    not ok 1 Chrome - error
      Error: Browser failed to connect within 120s. testem.js not loaded?

An `EADDRINUSE` collision presents similarly as `# tests 1 / # pass 0 / # fail 1`. Re-run; it
succeeds on a quiet machine.

**Do NOT `pkill -f "ember test"` to clear it.** Other sessions and dev servers share this machine,
and a blanket kill has already taken out someone else's run once.

**Tell the two timeout failures apart — this matters more than it sounds.** A
`Browser timeout exceeded: 120s` that names a **specific test** is a completely different thing
wearing the same clothes: the page navigated away and testem lost the browser. That is what kept CI
red on this branch for its entire life, and it was misfiled as contention for longer than it should
have been.

| Message | Cause |
|---|---|
| `Browser failed to connect within 120s`, before any test ran | contention — re-run |
| `Error while executing test: <name>` | that test navigated the page away |

For the second, check whether the test clicks a real `<LinkTo>` or anything with an `href`.

---

## 5. What the next session needs to know before touching anything

### Hard constraints

- **Never lower a coverage threshold, exclude integration tests, or hand-edit `pnpm-lock.yaml`.**
- **Coverage exclusions only for demonstrably unreachable code.** Line-specific
  `/* istanbul ignore … -- reason */`, and the reason must name *the specific thing* that makes it
  unreachable — the caller that always passes the argument, the template that renders the control
  `disabled`, the constructor that assigns the field first. An ignore without that trace is a bug
  waiting to be reintroduced.
- **Never leave a test whose assertion cannot fail.** Verify by breaking the code and watching the
  test go red.
- **Report only numbers read from a generated artifact**, never from the fact that a run passed.
- **Never delete defensive code to win coverage.** Genuinely dead *state* may be deleted.
- **Earn every defect claim** by tracing callers and consumers first. "Not referenced by a template"
  is not "dead code" is not "broken", and current behaviour is often deliberate — two entries in the
  original set were wrong exactly there.

### Running the suite

Port 7357 is used exclusively by other sessions on this machine. Always:

```bash
node scripts/stamp-coverage-run.js && COVERAGE=true pnpm exec ember test --port=7399
```

Then the gate:

```bash
pnpm run coverage:check
```

The stamp script clears `coverage/` and marks freshness, so a stale or missing artifact fails loudly
instead of passing quietly. A full run is roughly 15 minutes.

`pnpm run test:ci` runs exactly what CI runs — self-test, suite, gate — but its `test:coverage` step
takes no port argument, so it lands on the default 7357. Use the two commands above locally and let
CI run `test:ci`.

### The four conventions that cost the most to learn

1. **A local pass is not a CI pass.** The gate passed locally for some time before it ever passed in
   CI — the suite had never once reached the gate step there. Check CI before reporting a gate.
2. **Headless Linux Chrome never gives the page focus; macOS Chrome does.** Everything downstream of
   focus differs. Coverage that arrives *incidentally* — from an event the browser happened to send,
   like the `blur` fired as a focused input is torn down — is precisely the coverage that disappears
   in CI. Cover the path deliberately instead.
3. **An `istanbul ignore` inside a method body does not ignore the method.** The statement stops
   counting, but the function still has to be *called* to count as covered. Put the comment above
   the method when the method itself is what cannot run.
4. **Coverage line numbers are SOURCE or SOURCE+2 depending on the file.** Do not assume one.
   Disambiguate by matching the branch *type* against the source text, or by reading
   `loc.start.column`. This cost time twice.

And the one that underlies all of them: **a green test proves nothing about which branch ran.**
Always confirm against `coverage/coverage-final.json`.

### Where the remaining ignores come from

`DEFECTS.md` has a full section on this ("Why the remaining coverage gaps are where they are"), with
seven categories that account for essentially every ignored site. The two most common:

- **Guards whose only entry point is already disabled** — the button that calls them carries
  `disabled={{…}}` for exactly that condition, and an existing test asserts the disabled state. By
  far the most frequent shape in this codebase.
- **Defaults on signatures only the framework calls.** Glimmer always invokes
  `compute(positional, named)` with both arguments, so `named = {}` can never take its default. **A
  default on a plain function or a service method is real, reachable surface** — chasing those
  produced 24 tests in one iteration. The two are indistinguishable in istanbul's branch map; only
  the call site tells them apart.

### One piece of tooling worth reading before optimising anything

`DEFECTS.md` → "Coverage collection: the trade this repo is balanced on". Both failure modes there
were live bugs pulling in opposite directions, and the current settings are the balance point.
Short version: the `/write-coverage` POST is several megabytes because a per-file 100% gate needs
`forceModulesToBeLoaded()`; posting from `QUnit.done` loses the report silently, so
`tests/test-helper.js` posts from `Testem.afterTests` and `testem.js` carries
`browser_disconnect_timeout: 120` to outlast the upload.

If the payload grows, the lever is `forceModulesToBeLoaded(filterFunction)` — we currently
force-load and transmit coverage for workspace siblings like `@fleetbase/ember-core` that
`scripts/check-coverage.js` then discards.

---

## 6. Settled — recorded so they are not "fixed" again

Four things were reported as broken and are not:

- **Sticky table columns work.** `is-sticky` is applied imperatively from `table/td.js:60` and
  `table/th.js:97` inside `setupTableCellNode`, not from any template, and `table.js:282/306` reads
  it back. The original report was wrong.
- **`layout/resource/panel`'s save task is deliberately unwired.** Wiring `this.save` as a default
  `@saveTask` would force a save button onto every panel, including read-only ones. Requiring the
  consumer to pass `@saveTask` is what keeps it opt-in.
- **The panel's `onPressEdit` / `onTabChange` / `onViewDetails` were removed on purpose.** No Edit
  button, no tabs, nothing could fire them, no consumer in 45 monorepo source directories passes
  them — and `onViewDetails` referenced `this.vendor` rather than `this.resource`, a copy-paste
  leftover from a vendor-specific panel.
- **`custom-fields-manager` accepts a bounded staleness window.** A subject cached by the registry
  is not refetched on tab change. Edits inside the manager update local state directly; only
  out-of-band changes go stale. That trade was made deliberately over refetching on every tab switch.

---

## Summary

| # | Item | Type | Status (2026-08-28) |
|---|---|---|---|
| 1.1 | `floating.js` — `@arrow` never positioned | product decision | decided: implemented |
| 1.2 | `navigator.js` — search result with children | design decision | decided: `path` required |
| 1.3 | `query-builder.js` — discarded label work | behaviour decision | decided: gate on selected columns |
| 1.4 | `comment-thread` — is `reloadComments` API? | API decision | decided: published API, kept |
| 1.5 | `widget/report` — configure-once? | product decision | decided: change control added |
| 2 | `widget-card` label getters deleted | decided, reversible | stands |
| 3 | ±1 branch flake (#18) | diagnostic task | still open |
| 4 | Chrome contention | environment | still live |

Five decisions, one confirmation, one diagnostic task with a written method, one environment fact.
The gate is green in CI and the branch is mergeable.
