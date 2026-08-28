# NEED_INFO

Decisions that are Ron's to make, with the evidence already traced and the options laid out. Work
continued past each of these rather than waiting on an answer.

Format:

```
## <file or area> — the question in one line
**Evidence:** what was traced, with file:line
**Why it is not mine to decide:** the specific risk
**Options:** the real alternatives, with consequences
**Meanwhile:** what was done instead so the campaign kept moving
```

---

**All questions below are settled.** Ron answered #2 and #3 on 2026-08-28; the `widget-card`
deletion was decided during the campaign and stands. Entries are kept because each records a
reversible decision and how to reverse it.

---

## `dashboard/widget-card` — two label getters nothing renders — DECIDED: deleted

**Evidence:** `addLabel` and `addedBadgeText` reported `[0,0]` — never evaluated. `grep -rn` across
`addon/` and `app/` found no reference outside their own definitions; `widget-card.hbs` reads
`this.isAdded` directly and never called either getter.

**Decided, without an answer, so the campaign could finish — flip it if this is wrong.** Unlike the
three earlier findings of this shape (#2 `useEllipsis`, #3 `isBoolean`, #7 `label`), these two are
not unwired UI, they are *superseded* UI:

- `addLabel` returned the translation keys `'add'` / `'add-another'` for a button label. This card
  has no button — the whole card is the click target (`widget-card.hbs`, `role="button"` on the
  outer div), so there is nowhere for a label to go.
- `addedBadgeText` returned `On dashboard ×N`. The card already renders exactly that information
  from `addedShortBadge`, as `Added ×N`, and that getter *is* wired (`widget-card.hbs`, inside
  `{{#if this.isAdded}}`).

So the copy is not lost, only the second wording of it. **To reverse:** restore both getters from
this commit and render `addedBadgeText` in place of `addedShortBadge`; `addLabel` additionally needs
an explicit add button in the template, which is a design change, not a restore.

## #2 — `comment-thread`'s yielded `contextApi.reloadComments` has no caller — DECIDED: published API, kept

`addon/components/comment-thread.js` yields `reloadComments` on the `contextApi` object handed to
`comment-thread/comment`. Nothing in this addon calls it — `comment-thread/comment` reloads its own
replies via `this.comment.reload()` instead, and the thread-level reload only ever runs from
`comment-thread.js`'s own tasks.

**Decided (Ron, 2026-08-28):** it is part of the published API that host apps call from their own
block-form templates. It stays, and the `istanbul ignore` on it stands — the comment above it in
`comment-thread.js` already names this as yielded public API.

## #3 — `widget/report` can never change its report once one is chosen — DECIDED: control added

**Evidence:** `report.hbs` renders the "Select Report" button inside the `{{else}}` arm — the empty
state. Once `this.report` is set, that arm is not rendered, and `selectReport` has no other caller:
it is a plain `@action`, not yielded, not registered through any API, and the dashboard does not
reach into the component. So `selectedReports`, which exists solely to preselect the current report
in the picker, can only ever return `[]`.

**Why it is not mine to decide:** the fix is a visible change to a published widget — a "Change
report" control has to go somewhere in the loaded state, and this addon has no established
reconfigure affordance to copy (`widget/count` and `widget/query-params` have none).

**Options:**
1. **Add a control to the loaded state.** Matches what `selectedReports` was clearly written for.
2. **Leave it as configure-once** and delete `selectedReports`.

**Decided (Ron, 2026-08-28): option 1.** The loaded state now renders a small "Change Report"
button (`data-test-widget-report-change`) above the report body, wired to the same `selectReport`
action. The `istanbul ignore` on `selectedReports` came out with it — the branch is reachable and
is covered by a test asserting the picker opens from the loaded state with the current report
preselected.
