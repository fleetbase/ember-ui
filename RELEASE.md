> v0.4.3 ~ "Shared sign-in page buttons"

---
## Highlights

- **`btn-auth`, a neutral button style for sign-in pages** — an opt-in wrapper class (`@wrapperClass="btn-block btn-auth"`) that gives the console's "Continue with ..." provider buttons and the extension buttons below them (Customer Portal, Track Order) one look: white with a gray-300 border in light mode, gray-900 with a gray-700 border in dark, and a hover that shifts the background and strengthens the border. It replaces each extension's own styling, whose hover faded the button to half opacity. Colours are custom properties on the wrapper, so a single button can be re-coloured, a provider's brand colour say, and keep the same border, hover and transition.
- **`<OauthProviderButton>`, a "Continue with …" button for sign-in providers** — a btn-auth block button with the provider's logo at the far left, re-coloured where a provider's guidelines call for it: Google and Microsoft on white with their full-colour logos (Google does not allow a single-colour "G"), Apple black, GitHub near-black, and every provider on gray-900 in dark mode, where Google's "G" sits on the white disc Google requires. It moves the console's provider buttons into ember-ui so the Fleetbase Cloud sign-up page can use the same ones. `<OauthProviderLogo>` renders a provider's logo on its own.
- **Fix: the `<CoordinatesInput>` map picker said "API key required"**: its map used CARTO tiles, which now need an API key, and Stadia Maps for one dark variant, which needs a key outside localhost. Every theme now uses OpenStreetMap's keyless tiles, as Fleet-Ops does, with OpenStreetMap's attribution shown. Passing an `https://` tile URL still uses that URL instead.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
---
