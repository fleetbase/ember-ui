# Component Playground

An interactive companion to the official component documentation at
<https://fleetbase.io/docs/ui>. Every documented component gets a route where you can change its
arguments and watch the real addon component react, plus a minimal embeddable view the
documentation site can put in an iframe.

The playground is the addon's existing Ember dummy application. It is not a second workspace, not
Storybook, and not a copy of any component — it renders the real components through normal Ember
resolution, with the real addon styles.

---

## Scope is documentation-driven

**The scope authority is <https://fleetbase.io/docs/ui>, not `app/components`.**

The addon exports **275** public components. The official documentation covers **63** of them.
Only those 63 get playground pages.

This matters because it is the difference between a useful complement to the documentation and a
second, exhaustive API browser that nobody maintains. An existing-but-undocumented public
component resolves to the playground's deliberate not-found page rather than being exposed
automatically.

The allowlist lives in [`tests/dummy/app/playground/allowlist.js`](tests/dummy/app/playground/allowlist.js).
Each entry records the Ember resolution path, the display name, the documentation category, and
the official documentation URL.

`path` is the **resolution path**, not a lowercased display name:

| Display name                | Resolution path            |
| --------------------------- | -------------------------- |
| `Layout::Resource::Tabular` | `layout/resource/tabular`  |
| `Attach::Tooltip`           | `attach/tooltip`           |
| `Modal::Layouts::Confirm`   | `modal/layouts/confirm`    |
| `RegistryYield`             | `registry-yield`           |

### The 63 documented components

| Category | Components |
| --- | --- |
| Layout & Structure (17) | `Layout::Container`, `Layout::Header`, `Layout::Sidebar`, `Layout::Main`, `Layout::Section`, `Layout::MobileNavbar`, `ContentPanel`, `Overlay`, `Drawer`, `Layout::Resource::Tabular`, `Layout::Resource::Card`, `Layout::Resource::CardsGrid`, `Layout::Resource::Panel`, `Floating`, `Attach::Tooltip`, `Attach::Popover`, `Spacer` |
| Navigation (3) | `TabNavigation`, `Tabs`, `DropdownButton` |
| Buttons & Actions (3) | `Button`, `ClickToCopy`, `ClickToReveal` |
| Forms & Inputs (15) | `InputGroup`, `Checkbox`, `Toggle`, `Select`, `MultiSelect`, `ComboBox`, `ModelSelect`, `DatePicker`, `DateTimeInput`, `PhoneInput`, `CoordinatesInput`, `ModelCoordinatesInput`, `UnitInput`, `MoneyInput`, `FileUpload` |
| Data Display (9) | `Table`, `Badge`, `Pill`, `ProgressBar`, `Spinner`, `Timeline`, `ActivityLog`, `File`, `CommentThread` |
| Calendars & Boards (3) | `FullCalendar`, `EventCalendar`, `Kanban` |
| Modals (9) | `Modal::Default`, `Modal::Layouts::Confirm`, `::Alert`, `::Prompt`, `::BulkAction`, `::Progress`, `::Process`, `::Loading`, `::OptionPrompt` |
| Dashboard (1) | `Dashboard` |
| Builders (2) | `ReportBuilder`, `TemplateBuilder` |
| Registry & Slots (1) | `RegistryYield` |

Several components share a documentation page — the six `Layout::*` scaffolding components are
documented on `/layout/overview`, the four resource layouts on `/layout/resource-tabular`, and the
eight modal layouts on `/modals/modal-layouts`. Repeated `docsUrl` values are expected.

### Explicitly out of scope

Undocumented public components, internal implementation components, table cells, modal internals,
chat components, template-builder and report-builder sub-components, widget internals, helpers,
modifiers, services, initializers, and utility functions. Services may back an example — the
`modals-manager` service is how the modal layouts are demonstrated — but they get no page.

### Updating the allowlist when the documentation changes

1. Re-read the navigation at <https://fleetbase.io/docs/ui>.
2. Add, remove or re-categorise entries in `allowlist.js`, including the `docsUrl`.
3. Update the expected count in `tests/unit/playground/allowlist-test.js`.
4. Add a registry entry and an example adapter for anything new (see *Adding an example*).
5. Run `pnpm run test:ember` — the scope-completeness tests fail in both directions until the
   allowlist, the registry and the adapters agree.

---

## Documentation / runtime discrepancies

### ScheduleCalendar (documentation is stale)

`/docs/ui/scheduling/event-calendar` is titled **"EventCalendar / ScheduleCalendar"**, but
`ScheduleCalendar` and `ScheduleItemCard` no longer exist in this addon — they were removed as
dead code.

The playground therefore:

- includes **`EventCalendar`**, which exists;
- does **not** restore `ScheduleCalendar` or `ScheduleItemCard`, and does not invent replacements;
- does **not** create a broken route to match stale prose.

The discrepancy is recorded in `allowlist.js` as `REMOVED_FROM_ADDON_STILL_IN_DOCS` and asserted in
`tests/unit/playground/allowlist-test.js`, so it stays visible rather than being quietly forgotten.

**Recommendation:** correct the official documentation separately — the page should describe
`EventCalendar` only. That change belongs to the documentation site, whose source is not in this
repository.

### Argument surfaces were read from the implementation

Registry controls were derived from the current `addon/components/*.hbs` and `*.js`, not from the
documentation prose. Where the two disagree, the implementation wins, because it is what actually
runs. Two consequences worth stating:

- **`Layout::Resource::Panel` has no save button unless you pass `@saveTask`.** This is
  deliberate: wiring a default would force a save button onto read-only panels. The playground
  passes a local no-op task so the button is demonstrable.
- **`Spinner` takes `@message`, `@size`, `@width`/`@height`.** Several arguments named in passing
  in the prose are not read by the component.
- **`InputGroup`'s label comes from `@name`, not `@labelText`.** `@labelText` is not read by the
  component at all — `input-group.hbs:3` passes `@name` through to `<InputLabel>`, and
  `@placeholder` falls back to `@name` as well. The existing integration tests use `@name`
  throughout. The playground control is therefore labelled `Label (@name)` and bound to `@name`;
  binding `@labelText` would have produced a control that silently did nothing.

---

## Architecture

Everything lives under `tests/dummy/`. No playground runtime code was added to `addon/`, because
none of it is useful to addon consumers.

```
tests/dummy/app/
  playground/
    allowlist.js        the 63 documented components — the scope authority
    registry.js         one entry per documented component, built from the allowlist
    controls.js         control types, coercion and validation
    state-codec.js      encode/decode the shareable `state` query parameter
    event-sanitizer.js  turn callback arguments into something safe to display
    controlled.js       base class for controlled input adapters
    host-stubs.js       host-app dependencies the console layout components need
    fixtures/index.js   deterministic fixtures — no clock, no network
  components/playground/
    host.{js,hbs}       preview + controls + event log; shared by both routes
    catalog.{js,hbs}    searchable, categorized catalog
    control.{js,hbs}    renders one control by type
    examples/           63 example adapters, one per documented component
    widgets/            small safe components for the Dashboard and RegistryYield examples
  modifiers/playground/
    resize-reporter.js  one-way postMessage height reporting for iframes
```

### Routes

| Route | Purpose |
| --- | --- |
| `/` | Redirects to the catalog |
| `/components` | Searchable, categorized catalog (`q` and `category` in the URL) |
| `/components/:slug` | Full interactive component page |
| `/embed/:slug` | Minimal iframe view |
| anything else | The playground's deliberate not-found page |

Catalog and detail are **sibling** routes rather than parent/child, so each owns its own model and
query parameters without the catalog rendering behind every component page.

In production the app uses **hash routing**, because GitHub Pages cannot rewrite deep links onto
`index.html`:

```
https://fleetbase.github.io/ember-ui/#/components/button
https://fleetbase.github.io/ember-ui/#/embed/button?state=…
```

---

## What the host application has to supply

The addon ships component styles, not a document. A consuming application supplies the layer
underneath them, and the playground — being that application here — has to supply it too. Three
rules in `tests/dummy/app/styles/app.css` do that, and each is load-bearing.

**1. Element normalisation.** `addon/styles/addon.css` contains no `@tailwind base`, by design: an
addon that emitted preflight would clobber the styles of every application consuming it. Its
component rules are `@apply`-generated and assume the elements underneath are already normalised.
Without that layer a `<button>` keeps the user agent's `buttontext` colour rather than inheriting,
and form controls keep user agent fonts.

Emitting `@tailwind base` here is not the answer: it would load *after* the addon's stylesheet and
win on equal specificity, overriding deliberate rules such as the console's `* { cursor: default }`.
A consuming application loads preflight *before* the addon, and that ordering cannot be reproduced
from inside the dummy application.

Instead only the normalisation the previews need is applied, scoped to `.pg-host` with the ancestor
inside `:where()` so it contributes no specificity. The rules then weigh exactly what preflight's
own element selectors weigh (0,0,1), so `.btn-sm` and friends still win, and nothing outside the
playground is affected.

**2. Theme on `<body>`.** The addon's dark and light rules are scoped to `body[data-theme='dark']`
and `body[data-theme='light']` specifically, not to any ancestor. A `playground/theme-body` modifier
mirrors the current theme onto `<body>` so the previewed components theme along with the chrome.

**3. Opting out of the viewport lock.** The shipped CSS contains
`body, html { height: 100vh; overflow: hidden }`. That suits the Fleetbase console, which fills the
viewport and scrolls its sidebar and main pane independently, but the playground is an ordinary
document that grows past the fold. `app.css` restores `height: auto` and `overflow-y: auto`;
`tests/dummy` loads after the addon stylesheet, so a same-specificity rule is enough — no
`!important` and no selector hacks.

Typography is set on `.pg-app` and `.pg-embed` rather than on `body`, because `#ember-testing` is
inside the same document and a base font size there would reach every component integration test.

`tests/acceptance/playground/styling-test.js` covers all of this: it asserts the computed styles of
a previewed Button, that the theme reaches `<body>`, and that nothing between the catalog and the
document clips it.

---

## Local commands

```bash
pnpm install --frozen-lockfile

# Serve the playground at http://localhost:4200
pnpm start

# The whole suite, playground included
pnpm run test:ember

# Just the playground
pnpm exec ember test --filter="playground"

# Build the static GitHub Pages artifact into playground-dist/
pnpm run build:playground

# …under a different base path, for a custom domain
node scripts/build-playground.js --base-path /custom/
```

> If another Ember suite is already running on this machine, testem's default port is taken. Pass
> `--test-port 7500` (or any free port) rather than killing the other run.

---

## Registry schema

Each entry in `registry.js` carries:

| Field | Meaning |
| --- | --- |
| `slug` | URL segment, derived from the path (`layout/resource/tabular` → `layout-resource-tabular`) |
| `name` | Documented display name |
| `category` | Documentation navigation category |
| `description` | One line, written for the playground |
| `docsUrl` | The official documentation page |
| `component` | Public component identifier (`Layout::Resource::Tabular`) |
| `path` | Ember resolution path |
| `sourcePath` | `addon/components/<path>.hbs` |
| `testPaths` | The existing integration test(s) that own this component's behaviour |
| `example` | The example adapter component |
| `controls` | Control definitions |
| `scenarios` | Presets and fixture scenarios |
| `events` | Callbacks forwarded to the event log |
| `notes` | Fixture, service or parent-composition constraints |

`tests/unit/playground/registry-test.js` fails when an allowlisted component has no entry, an entry
is not allowlisted, a slug is duplicated, a component or adapter does not resolve, metadata is
missing, or a control is invalid. It never compares the registry against all of `app/components` —
that is precisely the comparison the playground exists to avoid.

---

## Adding an example

1. Confirm the component is documented at `/docs/ui`. If it is not, it does not belong here.
2. Add it to `DOCUMENTED_COMPONENTS` in `allowlist.js`, with its `docsUrl`.
3. Add a definition to `DEFINITIONS` in `registry.js`: description, controls, scenarios, events,
   notes.
4. Create `tests/dummy/app/components/playground/examples/<slug>.hbs` (plus a `.js` if it needs
   fixtures or local state).
5. Bump the expected count in the allowlist test.
6. Run `pnpm exec ember test --filter="playground"`.

### The example adapter contract

Adapters receive a stable interface:

| Argument | Meaning |
| --- | --- |
| `@values` | Current control values, keyed by control key |
| `@scenario` | Selected scenario id |
| `@onEvent` | `(name, ...args)` — forwards a callback to the event log |
| `@setControl` | `(key, value)` — lets the preview write back into a control |
| `@embedded` | Whether this is the iframe view |

Every argument is bound **explicitly** to the real component:

```hbs
<Button
    @text={{@values.text}}
    @type={{@values.type}}
    @onClick={{fn (or @onEvent (noop)) "onClick"}}
/>
```

Explicitness is the point: if an adapter stops forwarding a value, the application test for that
control fails. There is no argument spreading, and deliberately so — Ember has no supported way to
splat a dynamic hash onto named arguments, and faking it would hide exactly the breakage the tests
are there to catch.

`@onEvent` is guarded with `(or @onEvent (noop))` because `{{fn}}` **throws** while rendering when
its argument is absent. The repo's own `no-unguarded-handler-argument` template rule enforces this.

The playground never uses `eval`, `new Function`, visitor-supplied JavaScript, runtime template
compilation, or unsafe HTML.

### Components needing a parent

Render the smallest valid composition and explain it in `notes`. `Layout::Container`'s default
scenario composes a header, sidebar and main region, because a container that yields nothing shows
nothing useful.

### Components needing services

Use the dummy service stubs where they exist; add narrowly scoped fixtures where they do not.
**No example may call a live API or persist anything.**

- `ActivityLog` and `ModelSelect` seed the dummy `store` stub.
- The modal layouts go through the real `modals-manager` service, which is how the documentation
  tells consumers to use them.
- `RegistryYield` primes the dummy universe registry with two safe local components under a
  playground-only namespace.
- `Layout::Header` / `Layout::MobileNavbar` need `<LinkToExternal>` (ember-engines) and a `media`
  service. `playground/host-stubs.js` registers them **from the adapter**, so existing component
  integration tests — which register their own stubs — are unaffected.

---

## Controls and presets

Supported types: `boolean`, `text`, `number`, `select`, `color`, `date`, `datetime`, `json`.

Each control declares a `key`, `label`, `type`, `default`, its options or bounds, and whether it is
serializable. Invalid input shows an accessible message (`aria-invalid` plus `role="alert"`) and
falls back to the documented default — **an invalid control never takes the preview down**.

Scenarios do double duty:

- **Presets** carry `values` and write them into the controls, so a preset is an editable starting
  point rather than a locked mode (Button's `Primary`, `Danger`, `Loading`, …).
- **Fixture scenarios** are read by the adapter off `@scenario` to pick data (Table's
  `Five orders` vs `Empty state`).

Visual class arguments are exposed as curated presets rather than free-form class text, so the
playground cannot be used to inject arbitrary styling.

---

## State URLs

One declared query parameter, `state`, carries the whole control state as base64url-encoded JSON.

- Only values that **differ from their documented default** are encoded, so links stay short and a
  default that later changes is picked up rather than pinned.
- Decoding validates against the selected component's control schema. Unknown keys are ignored,
  wrong types fall back per control, and malformed encoding falls back entirely — each with a
  **non-fatal warning** shown on the page rather than a silent substitution.
- Functions, services, records, `File` objects, `Date`s, `Error`s and any non-plain object are
  **never** serialized. Neither are controls marked `serializable: false`, in either direction.

The full and embed routes share the same codec, the same host component and the same adapters, so
"the embed shows the same thing" is true by construction rather than by duplication.

---

## Event log

Every forwarded callback is recorded with its name, a safe argument summary, a sequence number and
a timestamp, newest first, and can be cleared.

Arguments are sanitized before they are stored:

| Value | Shown as |
| --- | --- |
| DOM event | `type`, `key`, `button`, modifier keys, and `target.value` / `target.checked` only |
| DOM node | `<tagname>` |
| `File` | name, type, size — **never** contents |
| `Error` | name and message |
| ember-data record | `modelName:id` — attributes and relationships are never walked |
| service | `(service)` |
| cyclic structure | `(circular)` |

Depth, array length, object width and string length are all bounded. A value whose getters throw is
reported as unavailable rather than propagating. The log never renders a live object graph, and
never exposes tokens, credentials or full records.

---

## Iframe integration

Embed a component with:

```html
<iframe
    src="https://fleetbase.github.io/ember-ui/#/embed/button"
    title="Interactive Button example"
    width="100%"
    height="420"
    loading="lazy"
    sandbox="allow-scripts allow-same-origin"
    style="border: 1px solid #e2e8f0; border-radius: 8px"
></iframe>
```

`allow-scripts` is required — it is an Ember application. `allow-same-origin` is required for the
resize message. Do not add `allow-top-navigation`; the playground never navigates its parent.

Append `?state=…` after the slug to embed a specific configuration:

```
https://fleetbase.github.io/ember-ui/#/embed/button?state=eyJ0eXBlIjoicHJpbWFyeSJ9
```

### Resize messaging

The embed reports its rendered height to the parent whenever it changes:

```js
window.addEventListener('message', (event) => {
    if (event.origin !== 'https://fleetbase.github.io') return;
    if (event.data?.type !== 'fleetbase:ember-ui-playground:resize') return;

    const frame = document.querySelector(`iframe[src*="/embed/${event.data.slug}"]`);
    if (frame) frame.height = event.data.height;
});
```

```js
{ type: 'fleetbase:ember-ui-playground:resize', slug: 'button', height: 420 }
```

This is deliberately **one-way**. The playground posts height updates and installs no incoming
`message` handler — an embedded page that listens to its parent is a much larger trust surface than
this feature needs. Height is the only thing ever sent.

The message is posted whether or not the page is framed. Un-framed, `window.parent` is the page
itself and nothing listens, so it is inert — and the behaviour is then identical everywhere, which
is what makes it testable rather than dependent on how the test runner hosts the page.

### Content-Security-Policy

The documentation site will need to allow the frame:

```
frame-src https://fleetbase.github.io;
```

---

## GitHub Pages

`pnpm run build:playground` produces `playground-dist/`:

- production build, `/ember-ui/` base path, hash routing;
- `index.html` at the artifact root, with `404.html` copied from it so mistyped deep links stay
  inside the playground;
- `.nojekyll`, so Pages does not drop `_`-prefixed paths;
- addon and vendor CSS/JS included;
- test output, testem config and coverage artifacts explicitly excluded.

The base path is a flag, not a constant, so moving to a custom domain later is a CI argument rather
than a code change.

Deployment is `.github/workflows/playground-pages.yml`, using `actions/configure-pages`,
`actions/upload-pages-artifact` and `actions/deploy-pages`, with `contents: read`, `pages: write`,
`id-token: write`, the `github-pages` environment and a `pages` concurrency group.

**Pull request heads are never deployed.** A PR from a fork would otherwise be able to publish
arbitrary content to the project's Pages site. The workflow triggers on pushes to `main` and on
`workflow_dispatch`.

Release branches (`dev-v*`) are deliberately not listed. `main` alone owns the Pages site, so two
branches can never overwrite it unpredictably — a release publishes the playground when it merges.
To publish before then, run the workflow manually from the branch you want:

```bash
gh workflow run playground-pages.yml --ref dev-v0.4.0
```

### Required repository setting

One thing is **not** done by this repository and needs a human with repository access:

**Set Pages source to "GitHub Actions"** in Settings → Pages. Until then the workflow builds and
uploads the artifact successfully but has nothing to publish to, and
<https://fleetbase.github.io/ember-ui/> returns 404. This repository setting was deliberately not
mutated from here.

---

## Testing

The playground uses the repository's existing QUnit + Ember Test Helpers + Testem + headless Chrome
setup. **No second browser-testing framework was added** — no Playwright, Puppeteer, Selenium,
Cypress or Storybook. There is no reason to: `setupApplicationTest` already drives real routes in
real Chrome, and adding another runner would mean a second CI lane, a second set of flakes and a
second thing to keep in step with the coverage lifecycle.

Three layers:

1. **Existing component integration tests** (`tests/integration/components/`) remain the source of
   truth for component behaviour. The playground adds nothing to them and changes none of them.
2. **Playground unit tests** (`tests/unit/playground/`) cover the allowlist, registry, controls,
   state codec and event sanitizer.
3. **Playground application tests** (`tests/acceptance/playground/`) visit real routes and interact
   with them.

The split matters: playground tests assert **wiring**, not component contracts. The Button suite
does not re-test that a disabled button refuses clicks — `button-test.js` owns that. It tests that
the `disabled` control reaches the real `<Button>`.

`route-smoke-test.js` walks the registry and visits every component and embed route, asserting each
settles, renders its readiness marker and title, resolves its adapter, produces content, and raises
no uncaught error. A component added to the allowlist is covered the moment it is registered.

---

## Coverage

The coverage gate scopes to first-party `addon/` source, and the playground lives entirely under
`tests/dummy/`, so none of it enters the coverage denominator. Adding a playground page therefore
never moves the coverage numbers.
