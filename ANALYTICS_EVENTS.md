# Analytics Events in ember-ui

This document describes the analytics-agnostic events emitted by ember-ui components through the `events` service from `@fleetbase/ember-core`.

## Overview

ember-ui components emit generic events that can be consumed by any analytics system (PostHog, Google Analytics, Mixpanel, etc.). These events follow a dot notation naming convention and are emitted through the `events` service, which provides a **dual event system**:

1. **Events service** - Local listeners via `events.on()`
2. **Universe service** - Cross-engine listeners via `universe.on()`

## Event Naming Convention

All UI events follow the pattern: `ui.{component}.{action}`

Examples:
- `ui.button.clicked`
- `ui.modal.opened`
- `ui.modal.closed`
- `ui.filter.applied`
- `ui.filter.cleared`

## Dual Event System

When a component tracks an event using `this.events.trackEvent()`, the event is emitted on **both** event buses:

```javascript
// Component code
this.events.trackEvent('ui.button.clicked', 'save_order', orderId);

// This triggers events on BOTH:
// 1. events service: events.trigger('ui.button.clicked', ...)
// 2. universe service: universe.trigger('ui.button.clicked', ...)
```

**Benefits:**
- **Local listeners** can subscribe via `events.on()` for in-app functionality
- **Cross-engine listeners** can subscribe via `universe.on()` for analytics (e.g., internals → PostHog)

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
- Uses `this.events.trackEvent(eventName, ...eventArgs)`

**Example event:**
```javascript
// Emitted on both events and universe services
events.trigger('ui.button.clicked', 'save_order', 'order-123');
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

// Events emitted on both buses:
events.trigger('ui.modal.opened', 'modals/create-order', { title: 'New Order', ... });
universe.trigger('ui.modal.opened', 'modals/create-order', { title: 'New Order', ... });

// When modal closes:
events.trigger('ui.modal.closed', 'modals/create-order', 'onConfirm', { ... });
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
- Uses `this.events.trackEvent(eventName, ...eventArgs)`

**Example event:**
```javascript
// Emitted on both events and universe services
events.trigger('ui.dropdown.opened', 'order_actions');
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
// When filters are applied (emitted on both buses):
events.trigger('ui.filter.applied', [
  { param: 'status', filterValue: 'active', ... },
  { param: 'type', filterValue: 'order', ... }
]);
universe.trigger('ui.filter.applied', [...]);

// When filters are cleared:
events.trigger('ui.filter.cleared');
universe.trigger('ui.filter.cleared');
```

---

## Consuming Events

### Option 1: Local Listeners (events.on)

For in-app functionality, debugging, or UI updates:

```javascript
// In a component or service
@service events;

constructor() {
  super(...arguments);
  
  this.events.on('ui.button.clicked', (buttonName, ...args) => {
    console.log('Button clicked:', buttonName);
    this.refreshDashboard();
  });
}
```

### Option 2: Cross-Engine Listeners (universe.on)

For analytics tracking in proprietary engines (e.g., internals):

```javascript
// In internals/addon/instance-initializers/analytics-listener.js
export function initialize(owner) {
  const universe = owner.lookup('service:universe');
  const posthog = owner.lookup('service:posthog');

  // Button clicks
  universe.on('ui.button.clicked', (buttonName, ...args) => {
    posthog.trackEvent('button_clicked', {
      button_name: buttonName,
      additional_args: args
    });
  });

  // Modal events
  universe.on('ui.modal.opened', (componentName, options) => {
    posthog.trackEvent('modal_opened', {
      modal_name: componentName,
      modal_title: options.title
    });
  });

  universe.on('ui.modal.closed', (componentName, action, options) => {
    posthog.trackEvent('modal_closed', {
      modal_name: componentName,
      close_action: action
    });
  });

  // Filter events
  universe.on('ui.filter.applied', (activeFilters) => {
    posthog.trackEvent('filter_applied', {
      filter_count: activeFilters.length,
      filters: activeFilters.map(f => f.param)
    });
  });

  universe.on('ui.filter.cleared', () => {
    posthog.trackEvent('filter_cleared');
  });
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

### 5. Choose the Right Event Bus
- **Local listeners** (`events.on`) - For UI updates, debugging, in-app functionality
- **Cross-engine listeners** (`universe.on`) - For analytics, logging, cross-engine communication

### 6. Translation Layer
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

### 3. Dual Event System
Provides both local (`events.on`) and cross-engine (`universe.on`) event buses for maximum flexibility.

### 4. Extensible
Easy to add event support to new components following the same pattern.

### 5. Flexible
Consumers can choose which events to track, which bus to listen on, and how to transform them for their analytics system.

### 6. Non-Breaking
All event tracking is opt-in or automatic. Existing applications continue to work without changes.

## Implementation Notes

- All components use `@service events` to inject the events service from `@fleetbase/ember-core`
- Events are emitted using `this.events.trackEvent(eventName, ...args)`
- The `events` service automatically emits on both `events` and `universe` buses
- Components check for `events` service availability before emitting events
- Events are synchronous and non-blocking
- Failed event emissions do not break component functionality

## Dependencies

Requires:
- `@fleetbase/ember-core` with `events` service
- `@fleetbase/internals` with analytics-listener (for PostHog tracking in cloud)
