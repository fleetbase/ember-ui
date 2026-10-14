> v0.4.6 ~ "Skeleton loading components and a report widget that runs live"

---
## Highlights

- **Skeleton loading components.** `Skeleton` draws text, title, circle, avatar, rect, button, badge and input shapes, and `Skeleton::Text`, `Skeleton::Table`, `Skeleton::Card`, `Skeleton::CardsGrid`, `Skeleton::Panel`, `Skeleton::Form`, `Skeleton::StatTiles`, `Skeleton::PageHeader` and `Skeleton::Tabs` build on it. `Skeleton::Page` is the composite for route `loading.hbs` templates: its `@view` is table, cards, form, dashboard or panel, or a block replaces the body. Boxes are `aria-hidden`, the page announces once through `role="status" aria-busy="true"` with `@label` (falls back to `common.loading`), and the shimmer honours `prefers-reduced-motion`. ([#189](https://github.com/fleetbase/ember-ui/pull/189))
  - Skeletons follow the page they stand in for. The table card takes `@tabs`, `@toolbar`, `@checkbox`, `@footer` and `@identityColumn`; the header takes `@borderlessHeader`; cards take `@mediaFirst`, `@avatar`, `@subtitle`, `@status`, `@lines`, `@footerActions`, `@footerBadge` and `@footerLines`; the cards grid uses the `Layout::Resource::CardsGrid` breakpoints so it never shows fewer columns than the page. Every argument is optional and the defaults draw what they drew before.
  - Loading substates in an engine only render when the console's application route lets the `loading` event bubble. fleetbase/fleetbase v0.7.69 does.
- **Dark resource card tier.** `Layout::Resource::Card` gets hook classes (`resource-card`, `-header`, `-body`, `-footer`) and an opaque surface with hairline inner borders and a raised footer, replacing the half-transparent fill. Buttons and inputs are unchanged from 0.4.5.
- **The report widget runs the report.** The dashboard `Widget::Report` showed the results stored on the report record, so the tile went stale. It now runs the report through `POST reports/{id}/execute` after loading it, shows "Running report…" then "Last run", and has a Refresh button. Results are capped at 100 rows with a note. A failed run shows an inline error and keeps the last good result. Polling is off by default; `options.refreshInterval` (minutes, minimum 5) turns it on and stops when the widget is destroyed. ([#188](https://github.com/fleetbase/ember-ui/pull/188))
- **Fix: notes on contacts save.** The comment thread sends `subject_uuid` for a subject keyed by uuid; the console's comment serializer drops `subject_id`, so those notes were inserted without a subject.
- **Fix: the date picker always shows the value in its date format.** A consumer that stored the picked `Date` saw its full `toString()` in the field.
- **Fix: `CoordinatesInput` treats a null value as empty** instead of throwing while the component is created.
- **Badges and buttons.** A `delivery` badge status uses the violet tone, and the dark-mode success button hover is green-600, so it reads as a hover.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
---
