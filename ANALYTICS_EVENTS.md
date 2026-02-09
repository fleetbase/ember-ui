# Analytics Events in ember-ui

This document describes the analytics-agnostic events emitted by ember-ui components through the `universe` service.

## Overview

ember-ui components emit generic events that can be consumed by any analytics system (PostHog, Google Analytics, Mixpanel, etc.). These events follow a dot notation naming convention and are emitted through the `universe` service's `Evented` interface.

## Event Naming Convention

All UI events follow the pattern: `ui.{component}.{action}`

Examples:
- `ui.button.clicked`
- `ui.modal.opened`
- `ui.modal.closed`
- `ui.filter.applied`
- `ui.filter.cleared`

## Components with Event Support

### 1. Button Component

**Event:** Custom event via `@eventName` argument

**Usage:**
```hbs
<Button
  @text="Save Order"
  @eventName="ui.button.clicked"
  @eventArgs={{array "save_order" @order.id}}
  @onClick={{this.saveOrder}}
/>
```

**How it works:**
- Opt-in via `@eventName` argument
- Optionally pass `@eventArgs` array for event payload
- Event is triggered before `@onClick` callback
- Event is NOT triggered if button is disabled

**Example event:**
```javascript
universe.trigger('ui.button.clicked', 'save_order', 'order-123');
```

---

### 2. Modal Manager Service

**Events:**
- `ui.modal.opened` - When a modal is shown
- `ui.modal.closed` - When a modal is closed

**Payload:**
- `ui.modal.opened`: `(componentName, options)`
- `ui.modal.closed`: `(componentName, action, options)`

**Automatic tracking:**
All modals opened via `modalsManager.show()` automatically emit these events.

**Example:**
```javascript
// When you call:
this.modalsManager.show('modals/create-order', { title: 'New Order' });

// Event emitted:
universe.trigger('ui.modal.opened', 'modals/create-order', { title: 'New Order', ... });

// When modal closes:
universe.trigger('ui.modal.closed', 'modals/create-order', 'onConfirm', { ... });
```

**Action types:**
- `onConfirm` - User confirmed/accepted
- `onDecline` - User declined/cancelled
- `undefined` - Modal closed programmatically

---

### 3. Dropdown Button Component

**Event:** Custom event via `@eventName` argument

**Usage:**
```hbs
<DropdownButton
  @text="Actions"
  @eventName="ui.dropdown.opened"
  @eventArgs={{array "order_actions"}}
>
  <div class="next-dd-menu">
    <!-- dropdown content -->
  </div>
</DropdownButton>
```

**How it works:**
- Opt-in via `@eventName` argument
- Event is triggered when dropdown opens
- Optionally pass `@eventArgs` for event payload

**Example event:**
```javascript
universe.trigger('ui.dropdown.opened', 'order_actions');
```

---

### 4. Filters Picker Component

**Events:**
- `ui.filter.applied` - When filters are applied
- `ui.filter.cleared` - When all filters are cleared

**Payload:**
- `ui.filter.applied`: `(activeFilters)` - Array of active filter objects
- `ui.filter.cleared`: (no payload)

**Automatic tracking:**
These events are automatically emitted when users interact with the filters picker.

**Example:**
```javascript
// When filters are applied:
universe.trigger('ui.filter.applied', [
  { param: 'status', filterValue: 'active', ... },
  { param: 'type', filterValue: 'order', ... }
]);

// When filters are cleared:
universe.trigger('ui.filter.cleared');
```

---

## Consuming Events (in internals or other engines)

To track these events in your analytics system, subscribe to them using `universe.on()`:

```javascript
// In an initializer or service
export default class AnalyticsListener {
  @service universe;
  @service posthog; // or your analytics service

  constructor() {
    super(...arguments);
    this.setupListeners();
  }

  setupListeners() {
    // Button clicks
    this.universe.on('ui.button.clicked', (buttonName, ...args) => {
      this.posthog.trackEvent('button_clicked', {
        button_name: buttonName,
        additional_args: args
      });
    });

    // Modal events
    this.universe.on('ui.modal.opened', (componentName, options) => {
      this.posthog.trackEvent('modal_opened', {
        modal_name: componentName,
        modal_title: options.title
      });
    });

    this.universe.on('ui.modal.closed', (componentName, action, options) => {
      this.posthog.trackEvent('modal_closed', {
        modal_name: componentName,
        close_action: action
      });
    });

    // Filter events
    this.universe.on('ui.filter.applied', (activeFilters) => {
      this.posthog.trackEvent('filter_applied', {
        filter_count: activeFilters.length,
        filters: activeFilters.map(f => f.param)
      });
    });

    this.universe.on('ui.filter.cleared', () => {
      this.posthog.trackEvent('filter_cleared');
    });
  }
}
```

## Best Practices

### 1. Opt-in Event Tracking
Components that support custom events (Button, DropdownButton) require explicit `@eventName` argument. This prevents unnecessary event noise.

### 2. Descriptive Event Names
Use descriptive event names that indicate the user action:
- ✅ `ui.button.clicked` with args `['save_order', orderId]`
- ❌ `button_click` with no context

### 3. Consistent Naming
Follow the dot notation pattern: `ui.{component}.{action}`

### 4. Event Payload
Keep event payloads simple and serializable:
- ✅ Strings, numbers, arrays of primitives
- ❌ Ember objects, complex models

### 5. Translation Layer
Use a dedicated analytics listener service to translate generic UI events into analytics-specific events with proper naming conventions.

## Future Components

The following components are candidates for event support in future updates:

- **Table components** - Row clicks, sorting, pagination
- **Search components** - Search queries, result clicks
- **File upload** - Upload started, completed, failed
- **Navigation** - Tab changes, menu item clicks
- **Input components** - Value changes (with debouncing)

## Architecture Benefits

### 1. Analytics-Agnostic
ember-ui remains independent of any specific analytics provider. Events are generic and can be consumed by any system.

### 2. OSS-Friendly
No proprietary code in the OSS ember-ui library. Analytics integration happens in proprietary engines like `internals`.

### 3. Extensible
Easy to add event support to new components following the same pattern.

### 4. Flexible
Consumers can choose which events to track and how to transform them for their analytics system.

### 5. Non-Breaking
All event tracking is opt-in or automatic. Existing applications continue to work without changes.

## Implementation Notes

- All components check for `universe` service availability before emitting events
- Events are emitted using `this.universe.trigger(eventName, ...args)`
- Components use `@service universe` to inject the service
- Events are synchronous and non-blocking
- Failed event emissions do not break component functionality
