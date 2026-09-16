> v0.4.2 ~ "Restore the hidden state of tooltips and popovers in production builds"

---
## Highlights

- **Fix: every tooltip and popover rendered visible in production** — v0.4.1 started forwarding the host's browser targets to `postcss-preset-env`, which then skipped flattening CSS nesting for browsers that support it natively. The attacher styles that hold an `Attach::Tooltip` or `Attach::Popover` at `opacity: 0` until it is shown are written nested, and ember-cli's production minifier (clean-css) cannot parse nesting: it emitted those rules as top-level `& > …` selectors that match nothing, so every attachment appeared at full opacity without a hover. Development builds were unaffected because the browser parsed the nested block itself. The preset now always flattens nesting, whatever the targets.
- **Regression test** — `tests/node/postcss-build-test.cjs` compiles the attacher styles for the console's targets, asserts the flat hide rule is present, and minifies the result with clean-css to prove it survives a production build.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
