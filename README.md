<h1 align="center">Fleetbase Ember UI</h1>

<p align="center">
  The component library behind the Fleetbase console — layout, data, forms, calendars and modals
  for Ember applications and Fleetbase extensions.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@fleetbase/ember-ui"><img alt="npm" src="https://img.shields.io/npm/v/@fleetbase/ember-ui.svg?color=1c6cc7"></a>
  <a href="https://github.com/fleetbase/ember-ui/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/fleetbase/ember-ui/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://codecov.io/gh/fleetbase/ember-ui"><img alt="Coverage" src="https://codecov.io/gh/fleetbase/ember-ui/graph/badge.svg?flag=ember-ui"></a>
  <a href="https://www.npmjs.com/package/@fleetbase/ember-ui"><img alt="Downloads" src="https://img.shields.io/npm/dm/@fleetbase/ember-ui.svg?color=1c6cc7"></a>
  <a href="LICENSE.md"><img alt="License" src="https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg"></a>
</p>

<p align="center">
  <a href="https://fleetbase.io/docs/ui"><strong>Documentation</strong></a> ·
  <a href="https://fleetbase.github.io/ember-ui/">Playground</a> ·
  <a href="PLAYGROUND.md">Playground guide</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## Documentation

The reference documentation lives at **[fleetbase.io/docs/ui](https://fleetbase.io/docs/ui)** — every
argument, every yielded block, and the guidance on when to reach for which component.

The **[playground](https://fleetbase.github.io/ember-ui/)** is its interactive companion: each
documented component has a page where you change arguments and watch the real component react.

> The playground deploys from this repository to GitHub Pages. Until the Pages source is switched
> on for the repository (Settings → Pages → "GitHub Actions"), that link will 404 — run it locally
> with `pnpm start` in the meantime.

## Installation

```bash
pnpm add @fleetbase/ember-ui
# or
npm install @fleetbase/ember-ui
```

Requires Node 18 or newer. The addon brings its own styles; no additional CSS import is needed.

## Usage

Components resolve like any other Ember component once the addon is installed:

```hbs
<Layout::Container>
    <Layout::Header />
    <Layout::Sidebar />
    <Layout::Main>
        <ContentPanel @title="Orders" @open={{true}}>
            <Table @columns={{this.columns}} @rows={{this.orders}} @selectable={{true}} />
        </ContentPanel>

        <Button @type="primary" @text="New order" @icon="plus" @onClick={{this.createOrder}} />
    </Layout::Main>
</Layout::Container>
```

Services are injected the usual way:

```js
import { inject as service } from '@ember/service';

export default class OrdersController extends Controller {
    @service modalsManager;

    @action confirmDelete(order) {
        return this.modalsManager.confirm({
            title: 'Delete this order?',
            body: `${order.reference} will be removed permanently.`,
            confirm: () => order.destroyRecord(),
        });
    }
}
```

## Components

The documented surface is **63 components**. Each links to its reference page and to a live,
editable example.

<details>
<summary><strong>Layout & Structure</strong> — 17 components</summary>

| Component | Docs | Playground |
| --- | --- | --- |
| `<Layout::Container />` | [docs](https://fleetbase.io/docs/ui/layout/overview) | [try it](https://fleetbase.github.io/ember-ui/#/components/layout-container) |
| `<Layout::Header />` | [docs](https://fleetbase.io/docs/ui/layout/overview) | [try it](https://fleetbase.github.io/ember-ui/#/components/layout-header) |
| `<Layout::Sidebar />` | [docs](https://fleetbase.io/docs/ui/layout/overview) | [try it](https://fleetbase.github.io/ember-ui/#/components/layout-sidebar) |
| `<Layout::Main />` | [docs](https://fleetbase.io/docs/ui/layout/overview) | [try it](https://fleetbase.github.io/ember-ui/#/components/layout-main) |
| `<Layout::Section />` | [docs](https://fleetbase.io/docs/ui/layout/overview) | [try it](https://fleetbase.github.io/ember-ui/#/components/layout-section) |
| `<Layout::MobileNavbar />` | [docs](https://fleetbase.io/docs/ui/layout/overview) | [try it](https://fleetbase.github.io/ember-ui/#/components/layout-mobile-navbar) |
| `<ContentPanel />` | [docs](https://fleetbase.io/docs/ui/layout/content-panel) | [try it](https://fleetbase.github.io/ember-ui/#/components/content-panel) |
| `<Overlay />` | [docs](https://fleetbase.io/docs/ui/layout/overlay) | [try it](https://fleetbase.github.io/ember-ui/#/components/overlay) |
| `<Drawer />` | [docs](https://fleetbase.io/docs/ui/layout/drawer) | [try it](https://fleetbase.github.io/ember-ui/#/components/drawer) |
| `<Layout::Resource::Tabular />` | [docs](https://fleetbase.io/docs/ui/layout/resource-tabular) | [try it](https://fleetbase.github.io/ember-ui/#/components/layout-resource-tabular) |
| `<Layout::Resource::Card />` | [docs](https://fleetbase.io/docs/ui/layout/resource-tabular) | [try it](https://fleetbase.github.io/ember-ui/#/components/layout-resource-card) |
| `<Layout::Resource::CardsGrid />` | [docs](https://fleetbase.io/docs/ui/layout/resource-tabular) | [try it](https://fleetbase.github.io/ember-ui/#/components/layout-resource-cards-grid) |
| `<Layout::Resource::Panel />` | [docs](https://fleetbase.io/docs/ui/layout/resource-tabular) | [try it](https://fleetbase.github.io/ember-ui/#/components/layout-resource-panel) |
| `<Floating />` | [docs](https://fleetbase.io/docs/ui/layout/floating) | [try it](https://fleetbase.github.io/ember-ui/#/components/floating) |
| `<Attach::Tooltip />` | [docs](https://fleetbase.io/docs/ui/layout/attach-tooltip) | [try it](https://fleetbase.github.io/ember-ui/#/components/attach-tooltip) |
| `<Attach::Popover />` | [docs](https://fleetbase.io/docs/ui/layout/attach-popover) | [try it](https://fleetbase.github.io/ember-ui/#/components/attach-popover) |
| `<Spacer />` | [docs](https://fleetbase.io/docs/ui/layout/spacer) | [try it](https://fleetbase.github.io/ember-ui/#/components/spacer) |

</details>

<details>
<summary><strong>Navigation</strong> — 3 components</summary>

| Component | Docs | Playground |
| --- | --- | --- |
| `<TabNavigation />` | [docs](https://fleetbase.io/docs/ui/navigation/tab-navigation) | [try it](https://fleetbase.github.io/ember-ui/#/components/tab-navigation) |
| `<Tabs />` | [docs](https://fleetbase.io/docs/ui/navigation/tabs) | [try it](https://fleetbase.github.io/ember-ui/#/components/tabs) |
| `<DropdownButton />` | [docs](https://fleetbase.io/docs/ui/navigation/dropdown-button) | [try it](https://fleetbase.github.io/ember-ui/#/components/dropdown-button) |

</details>

<details>
<summary><strong>Buttons & Actions</strong> — 3 components</summary>

| Component | Docs | Playground |
| --- | --- | --- |
| `<Button />` | [docs](https://fleetbase.io/docs/ui/actions/button) | [try it](https://fleetbase.github.io/ember-ui/#/components/button) |
| `<ClickToCopy />` | [docs](https://fleetbase.io/docs/ui/actions/click-to-copy) | [try it](https://fleetbase.github.io/ember-ui/#/components/click-to-copy) |
| `<ClickToReveal />` | [docs](https://fleetbase.io/docs/ui/actions/click-to-reveal) | [try it](https://fleetbase.github.io/ember-ui/#/components/click-to-reveal) |

</details>

<details>
<summary><strong>Forms & Inputs</strong> — 15 components</summary>

| Component | Docs | Playground |
| --- | --- | --- |
| `<InputGroup />` | [docs](https://fleetbase.io/docs/ui/inputs/input-group) | [try it](https://fleetbase.github.io/ember-ui/#/components/input-group) |
| `<Checkbox />` | [docs](https://fleetbase.io/docs/ui/inputs/checkbox) | [try it](https://fleetbase.github.io/ember-ui/#/components/checkbox) |
| `<Toggle />` | [docs](https://fleetbase.io/docs/ui/inputs/toggle) | [try it](https://fleetbase.github.io/ember-ui/#/components/toggle) |
| `<Select />` | [docs](https://fleetbase.io/docs/ui/inputs/select) | [try it](https://fleetbase.github.io/ember-ui/#/components/select) |
| `<MultiSelect />` | [docs](https://fleetbase.io/docs/ui/inputs/multi-select) | [try it](https://fleetbase.github.io/ember-ui/#/components/multi-select) |
| `<ComboBox />` | [docs](https://fleetbase.io/docs/ui/inputs/combo-box) | [try it](https://fleetbase.github.io/ember-ui/#/components/combo-box) |
| `<ModelSelect />` | [docs](https://fleetbase.io/docs/ui/inputs/model-select) | [try it](https://fleetbase.github.io/ember-ui/#/components/model-select) |
| `<DatePicker />` | [docs](https://fleetbase.io/docs/ui/inputs/date-picker) | [try it](https://fleetbase.github.io/ember-ui/#/components/date-picker) |
| `<DateTimeInput />` | [docs](https://fleetbase.io/docs/ui/inputs/date-time-input) | [try it](https://fleetbase.github.io/ember-ui/#/components/date-time-input) |
| `<PhoneInput />` | [docs](https://fleetbase.io/docs/ui/inputs/phone-input) | [try it](https://fleetbase.github.io/ember-ui/#/components/phone-input) |
| `<CoordinatesInput />` | [docs](https://fleetbase.io/docs/ui/inputs/coordinates-input) | [try it](https://fleetbase.github.io/ember-ui/#/components/coordinates-input) |
| `<ModelCoordinatesInput />` | [docs](https://fleetbase.io/docs/ui/inputs/model-coordinates-input) | [try it](https://fleetbase.github.io/ember-ui/#/components/model-coordinates-input) |
| `<UnitInput />` | [docs](https://fleetbase.io/docs/ui/inputs/unit-input) | [try it](https://fleetbase.github.io/ember-ui/#/components/unit-input) |
| `<MoneyInput />` | [docs](https://fleetbase.io/docs/ui/inputs/money-input) | [try it](https://fleetbase.github.io/ember-ui/#/components/money-input) |
| `<FileUpload />` | [docs](https://fleetbase.io/docs/ui/inputs/file-upload) | [try it](https://fleetbase.github.io/ember-ui/#/components/file-upload) |

</details>

<details>
<summary><strong>Data Display</strong> — 9 components</summary>

| Component | Docs | Playground |
| --- | --- | --- |
| `<Table />` | [docs](https://fleetbase.io/docs/ui/display/table) | [try it](https://fleetbase.github.io/ember-ui/#/components/table) |
| `<Badge />` | [docs](https://fleetbase.io/docs/ui/display/badge) | [try it](https://fleetbase.github.io/ember-ui/#/components/badge) |
| `<Pill />` | [docs](https://fleetbase.io/docs/ui/display/pill) | [try it](https://fleetbase.github.io/ember-ui/#/components/pill) |
| `<ProgressBar />` | [docs](https://fleetbase.io/docs/ui/display/progress-bar) | [try it](https://fleetbase.github.io/ember-ui/#/components/progress-bar) |
| `<Spinner />` | [docs](https://fleetbase.io/docs/ui/display/spinner) | [try it](https://fleetbase.github.io/ember-ui/#/components/spinner) |
| `<Timeline />` | [docs](https://fleetbase.io/docs/ui/display/timeline) | [try it](https://fleetbase.github.io/ember-ui/#/components/timeline) |
| `<ActivityLog />` | [docs](https://fleetbase.io/docs/ui/display/activity-log) | [try it](https://fleetbase.github.io/ember-ui/#/components/activity-log) |
| `<File />` | [docs](https://fleetbase.io/docs/ui/display/file) | [try it](https://fleetbase.github.io/ember-ui/#/components/file) |
| `<CommentThread />` | [docs](https://fleetbase.io/docs/ui/display/comment-thread) | [try it](https://fleetbase.github.io/ember-ui/#/components/comment-thread) |

</details>

<details>
<summary><strong>Calendars & Boards</strong> — 3 components</summary>

| Component | Docs | Playground |
| --- | --- | --- |
| `<FullCalendar />` | [docs](https://fleetbase.io/docs/ui/scheduling/full-calendar) | [try it](https://fleetbase.github.io/ember-ui/#/components/full-calendar) |
| `<EventCalendar />` | [docs](https://fleetbase.io/docs/ui/scheduling/event-calendar) | [try it](https://fleetbase.github.io/ember-ui/#/components/event-calendar) |
| `<Kanban />` | [docs](https://fleetbase.io/docs/ui/scheduling/kanban) | [try it](https://fleetbase.github.io/ember-ui/#/components/kanban) |

</details>

<details>
<summary><strong>Modals</strong> — 9 components</summary>

| Component | Docs | Playground |
| --- | --- | --- |
| `<Modal::Default />` | [docs](https://fleetbase.io/docs/ui/modals/overview) | [try it](https://fleetbase.github.io/ember-ui/#/components/modal-default) |
| `<Modal::Layouts::Confirm />` | [docs](https://fleetbase.io/docs/ui/modals/modal-layouts) | [try it](https://fleetbase.github.io/ember-ui/#/components/modal-layouts-confirm) |
| `<Modal::Layouts::Alert />` | [docs](https://fleetbase.io/docs/ui/modals/modal-layouts) | [try it](https://fleetbase.github.io/ember-ui/#/components/modal-layouts-alert) |
| `<Modal::Layouts::Prompt />` | [docs](https://fleetbase.io/docs/ui/modals/modal-layouts) | [try it](https://fleetbase.github.io/ember-ui/#/components/modal-layouts-prompt) |
| `<Modal::Layouts::BulkAction />` | [docs](https://fleetbase.io/docs/ui/modals/modal-layouts) | [try it](https://fleetbase.github.io/ember-ui/#/components/modal-layouts-bulk-action) |
| `<Modal::Layouts::Progress />` | [docs](https://fleetbase.io/docs/ui/modals/modal-layouts) | [try it](https://fleetbase.github.io/ember-ui/#/components/modal-layouts-progress) |
| `<Modal::Layouts::Process />` | [docs](https://fleetbase.io/docs/ui/modals/modal-layouts) | [try it](https://fleetbase.github.io/ember-ui/#/components/modal-layouts-process) |
| `<Modal::Layouts::Loading />` | [docs](https://fleetbase.io/docs/ui/modals/modal-layouts) | [try it](https://fleetbase.github.io/ember-ui/#/components/modal-layouts-loading) |
| `<Modal::Layouts::OptionPrompt />` | [docs](https://fleetbase.io/docs/ui/modals/modal-layouts) | [try it](https://fleetbase.github.io/ember-ui/#/components/modal-layouts-option-prompt) |

</details>

<details>
<summary><strong>Dashboard</strong> — 1 component</summary>

| Component | Docs | Playground |
| --- | --- | --- |
| `<Dashboard />` | [docs](https://fleetbase.io/docs/ui/dashboard/overview) | [try it](https://fleetbase.github.io/ember-ui/#/components/dashboard) |

</details>

<details>
<summary><strong>Builders</strong> — 2 components</summary>

| Component | Docs | Playground |
| --- | --- | --- |
| `<ReportBuilder />` | [docs](https://fleetbase.io/docs/ui/builders/report-builder) | [try it](https://fleetbase.github.io/ember-ui/#/components/report-builder) |
| `<TemplateBuilder />` | [docs](https://fleetbase.io/docs/ui/builders/template-builder) | [try it](https://fleetbase.github.io/ember-ui/#/components/template-builder) |

</details>

<details>
<summary><strong>Registry & Slots</strong> — 1 component</summary>

| Component | Docs | Playground |
| --- | --- | --- |
| `<RegistryYield />` | [docs](https://fleetbase.io/docs/ui/registry/registry-yield) | [try it](https://fleetbase.github.io/ember-ui/#/components/registry-yield) |

</details>

The addon exports more components than this — table cells, chat internals, builder sub-components
and other implementation details. Those are deliberately undocumented: they are internal to the
components above and are not covered by the documentation, the playground, or any compatibility
promise.

## Playground

Built from this addon's own dummy application, so it renders the real components through normal
Ember resolution with the real addon styles.

```bash
pnpm start                    # http://localhost:4200
pnpm run build:playground     # static GitHub Pages artifact into playground-dist/
```

| Route | Purpose |
| --- | --- |
| `/components` | Searchable, categorized catalog |
| `/components/:slug` | Full page: controls, presets, event log, usage snippet |
| `/embed/:slug` | Minimal iframe view, embedded by the documentation site |

Argument state is carried in one encoded query parameter, so a configured example is a shareable
link and the embed shows exactly what the full page shows.

See **[PLAYGROUND.md](PLAYGROUND.md)** for the architecture, the registry schema, how to add an
example, iframe integration and resize messaging, and how to update the documented allowlist when
fleetbase.io/docs/ui changes.

## Development

```bash
pnpm install --frozen-lockfile

pnpm start                # serve the playground / dummy app
pnpm test                 # lint + the full suite
pnpm run test:ember       # the suite on its own
pnpm run lint             # eslint, ember-template-lint, stylelint
pnpm run build            # production build
```

Run a subset while working on one component:

```bash
pnpm exec ember test --filter="Integration | Component | button"
```

## Testing and coverage

The suite runs in headless Chrome through Testem. Coverage is gated at **100% of first-party
`addon/` source** — statements, branches, functions and lines — and enforced in CI:

```bash
pnpm run coverage:selftest   # prove the gate itself works
pnpm run test:coverage       # run the suite with coverage
pnpm run coverage:check      # enforce the gate
```

The gate deliberately fails on a stale or missing artifact rather than reporting the previous run's
numbers. `DEFECTS.md` records why the coverage lifecycle is shaped the way it is, and what is still
open.

## Contributing

See the [Contributing](CONTRIBUTING.md) guide.

## License

Licensed under the [GNU Affero General Public License v3.0 or later](LICENSE.md).
