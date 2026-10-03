> v0.4.5 ~ "Tables and panels render extension-registered columns, actions and buttons"

---
## Highlights

- **Resource view registries.** Layout components merge what extensions register when given `@registry`, a surface prefix such as `ledger:table:invoice`. This pairs with fleetbase/ember-core v0.3.25.
  - `Layout::Resource::Tabular`: columns, row actions, bulk actions and toolbar buttons.
  - `Layout::Resource::TabularActions`: toolbar buttons and bulk actions.
  - `Layout::Resource::Panel` and `resourceContextPanel.open({ registry })`: header buttons, plus "…" menu items.
  - Table cells, filters and action-button components may be `ExtensionComponent`s, rendered from the extension's own engine.
  - With an older ember-core, views render exactly as before.
- **Shared header components.** The three copies of the header-button and bulk-action markup are now `Layout::Resource::ActionButtons` and `Layout::Resource::BulkActions`.
- **Tabular arguments.** Tabular forwards `@searchDisabled` and takes a `<:header>` block for extra header controls.
- **Fix: Tabular ignored column changes after first render.** It copied `@columns` once. It now derives them, and the column picker's choices survive recomputes.
- **Fix: Tabular's bulk actions ignored `permission`.** They now honour it.
- **Fix: a dropdown item without a handler threw from `dropdown-fn`.** It now renders and does nothing.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
---
