import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { scheduleOnce } from '@ember/runloop';
import { createCalendar, destroyCalendar, ResourceTimeline, ResourceTimeGrid, TimeGrid, DayGrid, List, Interaction } from '@event-calendar/core';
import '@event-calendar/core/index.css';

/**
 * EventCalendar component wrapping @event-calendar/core (MIT licensed).
 *
 * This is the preferred calendar component for resource-timeline views in
 * Fleetbase. It replaces the need for FullCalendar Premium plugins
 * (@fullcalendar/resource-timeline etc.) which carry a commercial license
 * incompatible with Fleetbase's dual AGPL v3 / commercial licensing model.
 *
 * @see https://github.com/vkurko/calendar
 *
 * Supported views (all MIT, no license key required):
 *   - resourceTimelineDay / resourceTimelineWeek / resourceTimelineMonth
 *   - resourceTimeGridDay / resourceTimeGridWeek
 *   - timeGridDay / timeGridWeek
 *   - dayGridMonth / dayGridWeek / dayGridDay
 *   - listDay / listWeek / listMonth / listYear
 *
 * Usage:
 * ```hbs
 * <EventCalendar
 *   @view="resourceTimelineDay"
 *   @resources={{this.calendarResources}}
 *   @events={{this.calendarEvents}}
 *   @editable={{true}}
 *   @droppable={{true}}
 *   @onEventDrop={{this.handleEventDrop}}
 *   @onEventReceive={{this.handleEventReceive}}
 *   @onEventClick={{this.handleEventClick}}
 *   @onDateClick={{this.handleDateClick}}
 *   @resourceLabelContent={{this.renderResourceLabel}}
 *   @eventContent={{this.renderEventContent}}
 *   @onCalendarReady={{this.onCalendarReady}}
 *   @options={{this.extraCalendarOptions}}
 * />
 * ```
 *
 * The `@options` arg is merged last, allowing full override of any option.
 *
 * Callback args:
 *   @onEventDrop(info)        — info.event, info.oldResource, info.newResource, info.revert
 *   @onEventReceive(info)     — info.event, info.revert (external drop)
 *   @onEventClick(info)       — info.event, info.el, info.jsEvent
 *   @onDateClick(info)        — info.date, info.resource, info.jsEvent
 *   @onEventResize(info)      — info.event, info.revert
 *   @onEventMouseEnter(info)  — info.event, info.el, info.jsEvent
 *   @onEventMouseLeave(info)  — info.event, info.el, info.jsEvent
 *   @onDatesSet(info)         — info.start, info.end, info.view
 *   @onLoading(isLoading)     — boolean
 *
 * Render hook args (no 'on' prefix — these return content descriptors):
 *   @eventContent             — function(info) returning { html } or { domNodes }
 *   @resourceLabelContent     — function(info) returning { html } or { domNodes }
 *   @dayCellContent           — function(info) returning { html } or { domNodes }
 *   @slotLabelContent         — function(info) returning { html } or { domNodes }
 */
export default class EventCalendarComponent extends Component {
    /**
     * All plugins enabled by default. Consumers can override via @plugins.
     * @type {Array}
     */
    defaultPlugins = [ResourceTimeline, ResourceTimeGrid, TimeGrid, DayGrid, List, Interaction];

    /**
     * Reference to the DOM element the calendar is mounted on.
     * @type {HTMLElement}
     */
    @tracked calendarEl = null;

    /**
     * The EventCalendar instance returned by createCalendar().
     * Exposes .setOption(name, value) and .getOption(name).
     * @type {Object}
     */
    @tracked calendar = null;

    /**
     * Callback arg names that map to @event-calendar/core event options.
     * Each entry is the raw option name; the corresponding @arg is prefixed
     * with 'on' (e.g. 'eventDrop' → @onEventDrop).
     * @type {string[]}
     */
    callbackOptions = [
        'eventClick',
        'eventDrop',
        'eventResize',
        'eventReceive',
        'eventLeave',
        'eventMouseEnter',
        'eventMouseLeave',
        'dateClick',
        'datesSet',
        'loading',
        'viewDidMount',
        'eventDidMount',
        'eventWillUnmount',
        'select',
        'unselect',
    ];

    /**
     * Render hook option names. These are passed directly (no 'on' prefix)
     * because they return content descriptors, not fire-and-forget callbacks.
     * @type {string[]}
     */
    renderHooks = ['eventContent', 'resourceLabelContent', 'resourceLabelDidMount', 'dayCellContent', 'dayCellDidMount', 'slotLabelContent', 'slotLabelDidMount', 'nowIndicatorContent'];

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Initialises the EventCalendar instance on the container element.
     * Called via {{did-insert this.setup}} in the template.
     *
     * @param {HTMLElement} el
     */
    @action setup(el) {
        this.calendarEl = el;
        const plugins = this.args.plugins ?? this.defaultPlugins;
        const options = this._buildOptions();
        this.calendar = createCalendar(el, plugins, options);

        if (typeof this.args.onCalendarReady === 'function') {
            this.args.onCalendarReady(this.calendar);
        }
    }

    /**
     * Responds to tracked arg changes and updates the calendar options.
     * Called via {{did-update this.update ...watchedArgs}} in the template.
     */
    @action update() {
        if (!this.calendar) {
            return;
        }
        scheduleOnce('afterRender', this, this._applyDynamicOptions);
    }

    /**
     * Destroys the EventCalendar instance when the component is torn down.
     * Called via {{will-destroy this.teardown}} in the template.
     */
    @action teardown() {
        if (this.calendar) {
            destroyCalendar(this.calendar);
        }
        this.calendar = null;
        this.calendarEl = null;
    }

    // -------------------------------------------------------------------------
    // Public API helpers (callable by parent via @onCalendarReady)
    // -------------------------------------------------------------------------

    /**
     * Programmatically change the view type.
     * @param {string} viewName  e.g. 'resourceTimelineWeek'
     */
    @action changeView(viewName) {
        this._setOption('view', viewName);
    }

    /**
     * Navigate the calendar to today.
     */
    @action today() {
        this._setOption('date', new Date());
    }

    /**
     * Refetch events from the events source.
     */
    @action refetchEvents() {
        this._setOption('events', this.args.events ?? []);
    }

    /**
     * Refetch resources from the resources source.
     */
    @action refetchResources() {
        this._setOption('resources', this.args.resources ?? []);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Build the full options object passed to createCalendar().
     * @returns {Object}
     */
    _buildOptions() {
        const {
            view,
            resources,
            events,
            editable,
            droppable,
            selectable,
            nowIndicator,
            slotMinTime,
            slotMaxTime,
            slotDuration,
            slotLabelInterval,
            slotWidth,
            firstDay,
            height,
            headerToolbar,
            locale,
            scrollTime,
            date,
            options: extraOptions,
        } = this.args;

        const base = {
            view: view ?? 'resourceTimelineDay',
            resources: resources ?? [],
            events: events ?? [],
            editable: editable !== false,
            droppable: droppable !== false,
            selectable: selectable ?? false,
            nowIndicator: nowIndicator !== false,
            slotMinTime: slotMinTime ?? '00:00:00',
            slotMaxTime: slotMaxTime ?? '24:00:00',
            firstDay: firstDay ?? 0,
            height: height ?? '100%',
            headerToolbar: headerToolbar ?? {
                start: 'prev,next today',
                center: 'title',
                end: 'resourceTimelineDay,resourceTimelineWeek',
            },
            locale: locale ?? 'en',
            scrollTime: scrollTime ?? '06:00:00',
        };

        if (slotDuration !== undefined) base.slotDuration = slotDuration;
        if (slotLabelInterval !== undefined) base.slotLabelInterval = slotLabelInterval;
        if (slotWidth !== undefined) base.slotWidth = slotWidth;
        if (date !== undefined) base.date = date;

        // Wire up callback args (@onEventDrop → eventDrop option)
        for (const name of this.callbackOptions) {
            const argName = `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;
            if (typeof this.args[argName] === 'function') {
                base[name] = this.args[argName];
            }
        }

        // Wire up render hooks (passed directly, no 'on' prefix)
        for (const hook of this.renderHooks) {
            if (typeof this.args[hook] === 'function') {
                base[hook] = this.args[hook];
            }
        }

        // Merge extra options last — allows full override of any option
        return { ...base, ...(extraOptions ?? {}) };
    }

    /**
     * Re-apply all dynamic options to the live calendar instance.
     * Batched via scheduleOnce('afterRender') to coalesce multiple arg changes.
     */
    _applyDynamicOptions() {
        if (!this.calendar) {
            return;
        }

        const dynamicKeys = [
            'view',
            'resources',
            'events',
            'editable',
            'droppable',
            'selectable',
            'slotMinTime',
            'slotMaxTime',
            'slotDuration',
            'height',
            'headerToolbar',
            'locale',
            'scrollTime',
            'nowIndicator',
            'date',
        ];

        for (const key of dynamicKeys) {
            if (this.args[key] !== undefined) {
                this._setOption(key, this.args[key]);
            }
        }

        // Re-wire render hooks in case they changed
        for (const hook of this.renderHooks) {
            if (typeof this.args[hook] === 'function') {
                this._setOption(hook, this.args[hook]);
            }
        }

        // Re-wire callback options in case they changed
        for (const name of this.callbackOptions) {
            const argName = `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;
            if (typeof this.args[argName] === 'function') {
                this._setOption(name, this.args[argName]);
            }
        }

        // Merge any extra options override
        if (this.args.options) {
            for (const [key, value] of Object.entries(this.args.options)) {
                this._setOption(key, value);
            }
        }
    }

    /**
     * Safely call calendar.setOption().
     * @param {string} key
     * @param {*}      value
     */
    _setOption(key, value) {
        if (this.calendar && typeof this.calendar.setOption === 'function') {
            this.calendar.setOption(key, value);
        }
    }
}
