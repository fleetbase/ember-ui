# Contributing

Thanks for helping improve Fleetbase Ember UI.

## Getting set up

```bash
git clone https://github.com/fleetbase/ember-ui.git
cd ember-ui
pnpm install --frozen-lockfile
```

Node 18 or newer is required. This repository uses **pnpm**; the lockfile is committed and CI
installs with `--frozen-lockfile`, so please do not introduce another package manager.

## Running the playground

The playground doubles as the development application — it renders the real components through
normal Ember resolution:

```bash
pnpm start
```

Then visit <http://localhost:4200>. See [PLAYGROUND.md](PLAYGROUND.md) for its architecture and for
how to add an example when you add a component.

## Tests

```bash
pnpm run test:ember      # the full suite in headless Chrome
pnpm test                # lint and the full suite
```

Run a subset while working on one component:

```bash
pnpm exec ember test --filter="Integration | Component | button"
pnpm exec ember test --server   # watch mode
```

Compatibility across supported Ember versions:

```bash
pnpm exec ember try:each
```

## Coverage

Coverage is gated at 100% of first-party `addon/` source and enforced in CI:

```bash
pnpm run test:coverage
pnpm run coverage:check
```

A pull request that adds behaviour is expected to add the tests that cover it.

## Linting

```bash
pnpm run lint            # eslint, ember-template-lint and stylelint
pnpm run lint:fix
```

## Opening a pull request

- Keep the change focused, and describe what it does and why.
- Add or update tests alongside the change.
- Make sure `pnpm test` passes locally before pushing; CI runs lint, the full suite with coverage,
  and a production build.

For more on ember-cli itself, see the [ember-cli documentation](https://cli.emberjs.com/release/).
