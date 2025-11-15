# Scheduling Components for Ember UI

This package provides reusable scheduling components for the Fleetbase platform.

## Components

### ScheduleCalendar

A full-featured calendar component for displaying and managing schedules.

**Usage:**
```handlebars
<ScheduleCalendar
  @resources={{this.drivers}}
  @items={{this.scheduleItems}}
  @view="resourceTimeline"
  @onItemClick={{this.handleItemClick}}
  @onItemDrop={{this.handleItemDrop}}
  @onDateClick={{this.handleDateClick}}
>
  <:item as |item|>
    <div class="custom-event-content">
      {{item.title}}
    </div>
  </:item>
</ScheduleCalendar>
```

**Arguments:**
- `@resources` - Array of resources (e.g., drivers, vehicles)
- `@items` - Array of schedule items to display
- `@view` - Calendar view type (default: 'resourceTimeline')
- `@editable` - Enable drag-and-drop editing (default: true)
- `@onItemClick` - Callback when an item is clicked
- `@onItemDrop` - Callback when an item is dragged and dropped
- `@onDateClick` - Callback when a date is clicked

**Named Blocks:**
- `:item` - Custom rendering for schedule items
- `:header` - Custom header content
- `:footer` - Custom footer content

### ScheduleItemCard

Displays a schedule item in a card format.

**Usage:**
```handlebars
<ScheduleItemCard @item={{this.scheduleItem}} @onClick={{this.handleClick}}>
  <:content as |ctx|>
    <div class="custom-content">
      {{ctx.item.title}}
    </div>
  </:content>
  <:actions as |ctx|>
    <button {{on "click" (fn this.edit ctx.item)}}>Edit</button>
    <button {{on "click" (fn this.delete ctx.item)}}>Delete</button>
  </:actions>
</ScheduleItemCard>
```

**Arguments:**
- `@item` - The schedule item to display
- `@onClick` - Callback when the card is clicked

**Named Blocks:**
- `:content` - Custom content rendering
- `:actions` - Custom action buttons

### AvailabilityEditor

Allows users to set and manage availability windows.

**Usage:**
```handlebars
<AvailabilityEditor
  @subjectType="driver"
  @subjectUuid={{@driver.id}}
  @onSave={{this.handleAvailabilitySave}}
/>
```

**Arguments:**
- `@subjectType` - Type of the subject (e.g., 'driver', 'vehicle')
- `@subjectUuid` - UUID of the subject
- `@onSave` - Callback when availability is saved

## Models

### Schedule

Represents a master schedule.

**Attributes:**
- `name` - Schedule name
- `description` - Schedule description
- `start_date` - Start date
- `end_date` - End date
- `timezone` - Timezone
- `status` - Status (draft, published, active, paused, archived)
- `subject_uuid` - UUID of the subject
- `subject_type` - Type of the subject

**Relationships:**
- `items` - hasMany schedule-item
- `company` - belongsTo company

### ScheduleItem

Represents an individual scheduled item.

**Attributes:**
- `start_at` - Start datetime
- `end_at` - End datetime
- `duration` - Duration in minutes
- `status` - Status (pending, confirmed, in_progress, completed, cancelled, no_show)
- `assignee_uuid` - UUID of the assignee
- `assignee_type` - Type of the assignee
- `resource_uuid` - UUID of the resource
- `resource_type` - Type of the resource

**Relationships:**
- `schedule` - belongsTo schedule

### ScheduleTemplate

Represents a reusable schedule template.

**Attributes:**
- `name` - Template name
- `description` - Template description
- `start_time` - Start time
- `end_time` - End time
- `duration` - Duration in minutes
- `break_duration` - Break duration in minutes
- `rrule` - RFC 5545 recurrence rule

### ScheduleAvailability

Represents availability windows for resources.

**Attributes:**
- `subject_uuid` - UUID of the subject
- `subject_type` - Type of the subject
- `start_at` - Start datetime
- `end_at` - End datetime
- `is_available` - Availability flag
- `preference_level` - Preference strength (1-5)
- `reason` - Reason for unavailability
- `notes` - Additional notes
- `rrule` - RFC 5545 recurrence rule

### ScheduleConstraint

Represents scheduling constraints.

**Attributes:**
- `name` - Constraint name
- `description` - Constraint description
- `type` - Constraint type (hos, labor, business, capacity)
- `category` - Constraint category (compliance, optimization)
- `constraint_key` - Constraint key
- `constraint_value` - Constraint value
- `jurisdiction` - Jurisdiction (e.g., US-Federal, US-CA)
- `priority` - Priority (higher = more important)
- `is_active` - Active flag

## Service

### Scheduling Service

Provides methods for interacting with the scheduling API.

**Methods:**

- `loadSchedule(scheduleId)` - Load a schedule by ID
- `createSchedule(data)` - Create a new schedule
- `createScheduleItem(data)` - Create a new schedule item
- `updateScheduleItem(item, data)` - Update a schedule item
- `deleteScheduleItem(item)` - Delete a schedule item
- `getScheduleItemsForAssignee(assigneeType, assigneeUuid, filters)` - Get items for an assignee
- `checkAvailability(subjectType, subjectUuid, startAt, endAt)` - Check availability
- `setAvailability(data)` - Set availability
- `loadConstraints(subjectType, subjectUuid)` - Load constraints
- `validateScheduleItem(item)` - Validate an item against constraints

**Usage:**
```javascript
import { inject as service } from '@ember/service';

export default class MyComponent extends Component {
  @service scheduling;

  async loadDriverSchedule(driverId) {
    const items = await this.scheduling.getScheduleItemsForAssignee.perform(
      'driver',
      driverId,
      { start_at: '2025-11-15', end_at: '2025-11-22' }
    );
    return items;
  }
}
```

## Styling

All components follow Fleetbase UI styling standards:
- Minimal padding and spacing
- Tailwind CSS framework
- Dark mode support
- Consistent with existing ember-ui components

## Dependencies

The ScheduleCalendar component requires FullCalendar to be installed:

```bash
pnpm add @fullcalendar/core @fullcalendar/resource-timeline @fullcalendar/interaction
```

## Future Enhancements

- TimeOffForm component for time-off requests
- ScheduleTemplateBuilder component for creating templates
- Conflict detection UI
- RRULE editor for recurring patterns
- Multi-timezone support improvements
- Real-time updates via WebSockets
