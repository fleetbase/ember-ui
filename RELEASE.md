> v0.4.4 ~ "An interactive component playground, signature pad, verified 100% test coverage, and a report builder for order reporting"

---
## Highlights

- **Interactive component playground** — every component documented at
  [fleetbase.io/docs/ui](https://fleetbase.io/docs/ui) now has a page where you can change its
  arguments and watch the real component react, plus a minimal view the documentation site embeds
  in an iframe. Argument state travels in the URL, so a configured example is a shareable link.
  Built from the addon's own dummy application, so the previews are the real components with the
  real styles — see [PLAYGROUND.md](PLAYGROUND.md).
- **Signature pad** — a new `<SignaturePad>` component and a matching custom field
  type for capturing signatures.
- **Verified 100% test coverage** — 5,400 tests now cover every statement, branch,
  function and line in the addon, enforced by a coverage gate in CI with Codecov
  upload. Every remaining `istanbul ignore` carries a reason naming the specific
  thing that makes its code unreachable.
- **Defects fixed along the way** — the coverage work surfaced and fixed real bugs,
  including: popover arrows are now actually positioned against their target,
  popover's `hide()` no longer spins requestAnimationFrame forever, the conditions
  panel in the query builder opens only when there are selected columns to filter
  on, sidebar search results from a `@searchProvider` can open nested sections via
  `result.path`, report widgets can change their report after the first pick,
  kanban card update/delete actions fire, array inputs no longer write the
  KeyboardEvent into the array, and `@openDelay={{0}}` means zero.
- **Documentation refreshed** — the README now points at the official documentation site and the
  playground instead of 79 links to files that no longer existed, and reports the correct
  AGPL-3.0-or-later licence.
- **Report builder for order reporting** — goes with fleetbase/core-api v1.6.64 and fleetbase/fleetops v0.6.70:
  - Group By, Sort and Conditions offer computed columns, so a report can group by a month bucket or sort by a calculated value.
  - A grouped report can be sorted by its aggregates, such as "Sum of Quantity", and Count Distinct is a new aggregate.
  - Summary columns such as Total Orders get their own "Summaries" section in the column picker, with a note on what they return.
  - The computed column editor lists the JSON, `DATE` and `DECIMAL` helpers, with examples for reading a value from `meta`, bucketing by month and referencing a related column. The column name defaults to the label.
- **Default dashboard order** — widgets on the default dashboard are laid out by a numeric `order` on the widget definition (lowest first), so extensions can place their widgets together without depending on registration order.
- **Fix: report builder condition values lost focus after every keystroke**, including both ends of a range.
- **Fix: a field removed through a "Selected Fields" chip stayed checked**, because `<Checkbox>` did not follow `@checked`. A field loaded from a saved report was also added twice when toggled.
- **Fix: the computed column editor added an empty column** when the name was blank, and renaming a column while editing added a copy. Saved reports now keep their computed columns when reopened.
- **Fix: tall modals** can grow and the overlay scrolls with its margins intact, and the modals manager forwards its size, position and scrollable options to the modal.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
---
