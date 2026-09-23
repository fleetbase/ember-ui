> v0.4.3 ~ "An interactive component playground, signature pad, verified 100% test coverage, and shared sign-in page buttons"

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
- **`btn-auth`, a neutral button style for sign-in pages** — an opt-in wrapper class (`@wrapperClass="btn-block btn-auth"`) that gives the console's "Continue with ..." provider buttons and the extension buttons below them (Customer Portal, Track Order) one look: white with a gray-300 border in light mode, gray-900 with a gray-700 border in dark, and a hover that shifts the background and strengthens the border. It replaces each extension's own styling, whose hover faded the button to half opacity. Colours are custom properties on the wrapper, so a single button can be re-coloured, a provider's brand colour say, and keep the same border, hover and transition.
- **`<OauthProviderButton>`, a "Continue with …" button for sign-in providers** — a btn-auth block button with the provider's logo at the far left, re-coloured where a provider's guidelines call for it: Google and Microsoft on white with their full-colour logos (Google does not allow a single-colour "G"), Apple black, GitHub near-black, and every provider on gray-900 in dark mode, where Google's "G" sits on the white disc Google requires. It moves the console's provider buttons into ember-ui so the Fleetbase Cloud sign-up page can use the same ones. `<OauthProviderLogo>` renders a provider's logo on its own.
- **Fix: the `<CoordinatesInput>` map picker said "API key required"**: its map used CARTO tiles, which now need an API key, and Stadia Maps for one dark variant, which needs a key outside localhost. Every theme now uses OpenStreetMap's keyless tiles, as Fleet-Ops does, with OpenStreetMap's attribution shown. Passing an `https://` tile URL still uses that URL instead.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
---
