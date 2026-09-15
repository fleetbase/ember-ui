> v0.4.1 ~ "Resource identity: pills, one-line identity cells, hover summaries and select options"

---
## Highlights

- **Resource descriptor registry** — `utils/resource-registry` stores one descriptor per kind of record (title, identifier, image, status, badges, facts, how it opens) in the shared `universe/registry-service`, so the host and every engine read one set. `resolveResourceKey` accepts a record, an identity stub, a model name or alias, a `prefix:key` string, a PHP class name or a polymorphic type; `openResource` unwraps proxies and stubs, swaps a subtype for its canonical record and never throws. The `resource-type`, `resource-component` and `resource-relation` helpers and the `resource-registry` service expose it to templates and engines.
- **Resource::Pill, Resource::Summary, Resource::HoverCard** — a descriptor-driven pill that opens its record and shows a compact summary card on hover (photo or icon, name and identifier, status and online state, a handful of facts and one View action). The card is lazy: nothing renders until the pointer has rested on the target, and it hydrates only then.
- **Table::Cell::Identity** — a one-line identity cell: a small image with the status dot, the name and up to two inline badges, no status badge. It opens the record on click, disables on `column.permission`, and never fires the row action as well.
- **Resource::SelectOption** — the option row for record pickers, with a compact variant for the closed trigger. `filter/model` renders options through it and the new `filter/model-multiple` filter selects several records.
- **Core resource families** — pills, summaries, select options and identity cells for user, company, group, role, file and category, registered by an instance-initializer in the host.
- **Fixes** — `Attach::Popover` applies `@class`, keeps an interactive popover enterable while shown, follows later changes to `@isShown` and removes its listeners on destroy; `Attach::Tooltip` forwards `hideDelay`, `hideDuration`, `@class`, `@style`, `floatingTarget`, `floatingContainer` and `onChange`; `Pill` renders a static span when it has nothing to do and hands its tooltip component the resource; `MultiSelect` forwards `@selectedItemComponent`, `@searchField` and `@searchPlaceholder`; `table/cell/resource-identity` no longer renders an empty meta row.
- **Dummy app** — `@fleetbase/ember-core` is declared as a dependency so the components that import it can render in tests.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
