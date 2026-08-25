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

## #2 — `comment-thread`'s yielded `contextApi.reloadComments` has no caller

`addon/components/comment-thread.js` yields `reloadComments` on the `contextApi` object handed to
`comment-thread/comment`. Nothing in this addon calls it — `comment-thread/comment` reloads its own
replies via `this.comment.reload()` instead, and the thread-level reload only ever runs from
`comment-thread.js`'s own tasks. It is covered by an `istanbul ignore` for now.

**Decision needed:** is it part of the published API that host apps call from their own block-form
templates (keep it, and the ignore stands), or is it leftover (drop it, and the ignore goes with it)?

## #3 — `widget/report` can never change its report once one is chosen

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

**Meanwhile:** the getter is kept and its dead branch carries an `istanbul ignore` naming this
entry. If option 1 is taken, that ignore should come out with it — the branch becomes reachable.
