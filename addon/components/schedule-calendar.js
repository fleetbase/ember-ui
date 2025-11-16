import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

/**
 * ScheduleCalendar Component
 *
 * A reusable calendar component for displaying and managing schedules.
 * Uses FullCalendar for rendering and supports drag-and-drop, resource views,
 * and custom event rendering.
 *
 * @example
 * <ScheduleCalendar
 *   @resources={{this.drivers}}
 *   @items={{this.scheduleItems}}
 *   @view="resourceTimeline"
 *   @onItemClick={{this.handleItemClick}}
 *   @onItemDrop={{this.handleItemDrop}}
 *   @onDateClick={{this.handleDateClick}}
 * >
 *   <:item as |item|>
 *     <div class="schedule-item-content">
 *       {{item.title}}
 *     </div>
 *   </:item>
 * </ScheduleCalendar>
 */
export default class ScheduleCalendarComponent extends Component {
    @service scheduling;
    @service notifications;

    @tracked calendarApi = null;
    @tracked selectedDate = null;
    @tracked selectedItem = null;

    /**
     * Get calendar options
     */
    get calendarOptions() {
        return {
            initialView: this.args.view || 'resourceTimeline',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth',
            },
            editable: this.args.editable !== false,
            droppable: this.args.droppable !== false,
            resources: this.resources,
            events: this.events,
            eventClick: this.handleEventClick,
            eventDrop: this.handleEventDrop,
            dateClick: this.handleDateClick,
            ...this.args.calendarOptions,
        };
    }

    /**
     * Transform resources for FullCalendar
     */
    get resources() {
        if (!this.args.resources) {
            return [];
        }

        return this.args.resources.map((resource) => ({
            id: resource.id,
            title: resource.name || resource.title,
            extendedProps: resource,
        }));
    }

    /**
     * Transform schedule items to FullCalendar events
     */
    get events() {
        if (!this.args.items) {
            return [];
        }

        return this.args.items.map((item) => ({
            id: item.id,
            resourceId: item.assignee_uuid,
            title: item.title || 'Scheduled Item',
            start: item.start_at,
            end: item.end_at,
            backgroundColor: this.getEventColor(item),
            extendedProps: item,
        }));
    }

    /**
     * Get event color based on status
     */
    getEventColor(item) {
        const statusColors = {
            pending: '#FFA500',
            confirmed: '#4CAF50',
            in_progress: '#2196F3',
            completed: '#9E9E9E',
            cancelled: '#F44336',
            no_show: '#FF5722',
        };

        return statusColors[item.status] || '#4CAF50';
    }

    /**
     * Handle event click
     */
    @action
    handleEventClick(info) {
        this.selectedItem = info.event.extendedProps;

        if (this.args.onItemClick) {
            this.args.onItemClick(info.event.extendedProps);
        }
    }

    /**
     * Handle event drop (drag and drop)
     */
    @action
    async handleEventDrop(info) {
        const item = info.event.extendedProps;
        const newStart = info.event.start;
        const newEnd = info.event.end;
        const newResourceId = info.event.getResources()[0]?.id;

        try {
            if (this.args.onItemDrop) {
                await this.args.onItemDrop(item, {
                    start_at: newStart,
                    end_at: newEnd,
                    assignee_uuid: newResourceId,
                });
            }
        } catch (error) {
            info.revert();
            this.notifications.error('Failed to update schedule item');
        }
    }

    /**
     * Handle date click
     */
    @action
    handleDateClick(info) {
        this.selectedDate = info.date;

        if (this.args.onDateClick) {
            this.args.onDateClick(info.date, info.resource);
        }
    }

    /**
     * Refresh calendar
     */
    @action
    refresh() {
        if (this.calendarApi) {
            this.calendarApi.refetchEvents();
        }
    }
}
