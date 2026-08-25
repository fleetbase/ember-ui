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

## `dashboard/widget-card` — two label getters nothing renders

**Evidence:** `addLabel` (`widget-card.js:29`) and `addedBadgeText` (`:33`) report `[0,0]` — never
evaluated. `grep -rn` across `addon/` and `app/` finds no reference outside their own definitions;
`widget-card.hbs` reads `this.isAdded` directly at `:16` and `:48` and never calls either getter.

**Why it is not mine to decide:** this is the same shape as three earlier findings, and in all three
the answer was that the getter encoded intended UI that was never wired up — #2 (`useEllipsis`, wired
up as `@titleEllipsis`), #3 (`isBoolean`, which became the boolean editor) and #7 (`label`, whose
'Metadata' default is now rendered). Deleting them would discard designed wording; wiring them
changes what every widget card displays. Both are product decisions.

**Options:**
1. **Wire them.** `addLabel` distinguishes "add" from "add-another" for a widget already on the
   dashboard; `addedBadgeText` reads "On dashboard ×N" for duplicates. Both look like deliberate
   copy for a state the card can be in but never announces.
2. **Delete them.** The card already shows `isAdded` state via the template, so nothing is broken
   without them.

**Meanwhile:** left in place and uncovered rather than ignored — an `istanbul ignore` here would
document a decision that has not been made. The file's other gaps were covered normally.

