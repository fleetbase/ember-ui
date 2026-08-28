> v0.4.0 ~ "An interactive component playground, signature pad, and verified 100% test coverage"

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
- **Defects fixed along the way** — the campaign surfaced and fixed real bugs,
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

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
