import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled, clearRender, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { DayGrid } from '@event-calendar/core';

const RESOURCES = [
    { id: 'drv_1', title: 'Alex Driver' },
    { id: 'drv_2', title: 'Blair Hauler' },
];

const EVENTS = [{ id: 'ord_1', resourceId: 'drv_1', title: 'Delivery', start: '2026-03-12T09:00:00', end: '2026-03-12T10:00:00' }];

module('Integration | Component | event-calendar', function (hooks) {
    setupRenderingTest(hooks);

    let calendar;
    let readyCount;

    hooks.beforeEach(function () {
        calendar = null;
        readyCount = 0;
        this.set('onCalendarReady', (instance) => {
            calendar = instance;
            readyCount += 1;
        });
    });

    function option(key) {
        return calendar.getOption(key);
    }

    // The library normalises time-ish options into a duration object.
    function seconds(key) {
        return calendar.getOption(key).seconds;
    }

    const TEMPLATE = hbs`
        <EventCalendar
            @view={{this.view}}
            @resources={{this.resources}}
            @events={{this.events}}
            @editable={{this.editable}}
            @selectable={{this.selectable}}
            @nowIndicator={{this.nowIndicator}}
            @slotMinTime={{this.slotMinTime}}
            @slotMaxTime={{this.slotMaxTime}}
            @slotDuration={{this.slotDuration}}
            @slotLabelInterval={{this.slotLabelInterval}}
            @slotWidth={{this.slotWidth}}
            @firstDay={{this.firstDay}}
            @height={{this.height}}
            @headerToolbar={{this.headerToolbar}}
            @locale={{this.locale}}
            @scrollTime={{this.scrollTime}}
            @date={{this.date}}
            @options={{this.options}}
            @onEventClick={{this.onEventClick}}
            @onDateClick={{this.onDateClick}}
            @eventContent={{this.eventContent}}
            @onCalendarReady={{this.onCalendarReady}}
        />
    `;

    module('setup', function () {
        test('it mounts a calendar and hands the instance to the parent', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.fleetbase-event-calendar').exists();
            assert.strictEqual(readyCount, 1, 'the parent is told exactly once');
            assert.ok(calendar, 'a calendar instance is handed over');
            assert.ok(find('.fleetbase-event-calendar .ec'), 'the calendar renders into the container');
        });

        test('it renders without an onCalendarReady handler', async function (assert) {
            await render(hbs`<EventCalendar />`);

            assert.dom('.fleetbase-event-calendar').exists();
            assert.ok(find('.fleetbase-event-calendar .ec'));
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<EventCalendar data-test-calendar="yes" />`);

            assert.dom('.fleetbase-event-calendar').hasAttribute('data-test-calendar', 'yes');
        });
    });

    module('default options', function () {
        test('it opens on a resource timeline day with sensible defaults', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(option('view'), 'resourceTimelineDay');
            assert.deepEqual(option('resources'), []);
            assert.deepEqual(option('events'), []);
            assert.strictEqual(seconds('slotMinTime'), 0, 'midnight');
            assert.strictEqual(seconds('slotMaxTime'), 24 * 3600, 'through to midnight');
            assert.strictEqual(seconds('scrollTime'), 6 * 3600, 'scrolled to 6am');
            assert.strictEqual(option('locale'), 'en');
            assert.strictEqual(option('height'), '100%');
            assert.strictEqual(option('firstDay'), 0);
        });

        test('dragging and the now indicator are on, selection is off, by default', async function (assert) {
            await render(TEMPLATE);

            assert.true(option('editable'), 'events can be dragged');
            assert.true(option('nowIndicator'));
            assert.false(option('selectable'));
        });

        test('the default toolbar offers navigation and both timeline views', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(option('headerToolbar'), {
                start: 'prev,next today',
                center: 'title',
                end: 'resourceTimelineDay,resourceTimelineWeek',
            });
        });

        test('the library keeps its own defaults for options the component does not set', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(option('slotWidth'), 32, 'the library default slot width is untouched');
            assert.ok(option('date'), 'the calendar opens on today by default');
        });
    });

    module('supplied options', function () {
        test('the view, resources and events are used', async function (assert) {
            this.setProperties({ view: 'resourceTimelineWeek', resources: RESOURCES, events: EVENTS });

            await render(TEMPLATE);

            assert.strictEqual(option('view'), 'resourceTimelineWeek');
            assert.strictEqual(option('resources').length, 2);
            assert.strictEqual(option('events').length, 1);
        });

        test('dragging, dropping and selection can be switched', async function (assert) {
            this.setProperties({ editable: false, selectable: true, nowIndicator: false });

            await render(TEMPLATE);

            assert.false(option('editable'));
            assert.true(option('selectable'));
            assert.false(option('nowIndicator'));
            // `droppable` is not an option @event-calendar/core understands; the component no
            // longer accepts or forwards it (external drag-and-drop is the Interaction plugin's
            // job, configured through `editable`).
            assert.strictEqual(option('droppable'), undefined, 'no phantom droppable option is set');
        });

        test('the visible time window and scroll position can be set', async function (assert) {
            this.setProperties({ slotMinTime: '06:00:00', slotMaxTime: '18:00:00', scrollTime: '08:00:00' });

            await render(TEMPLATE);

            assert.strictEqual(seconds('slotMinTime'), 6 * 3600);
            assert.strictEqual(seconds('slotMaxTime'), 18 * 3600);
            assert.strictEqual(seconds('scrollTime'), 8 * 3600);
        });

        test('the optional slot options are applied only when given', async function (assert) {
            this.setProperties({ slotDuration: '00:30:00', slotLabelInterval: '01:00:00', slotWidth: 72 });

            await render(TEMPLATE);

            assert.strictEqual(seconds('slotDuration'), 30 * 60);
            assert.strictEqual(seconds('slotLabelInterval'), 3600);
            assert.strictEqual(option('slotWidth'), 72);
        });

        test('an explicit date is applied', async function (assert) {
            this.set('date', '2026-03-12');

            await render(TEMPLATE);

            assert.strictEqual(new Date(option('date')).getUTCFullYear(), 2026, 'the calendar opens on the given date');
        });

        test('the first day, height, locale and toolbar can be replaced', async function (assert) {
            this.setProperties({
                firstDay: 1,
                height: '640px',
                locale: 'fr',
                headerToolbar: { start: 'title', center: '', end: 'today' },
            });

            await render(TEMPLATE);

            assert.strictEqual(option('firstDay'), 1);
            assert.strictEqual(option('height'), '640px');
            assert.strictEqual(option('locale'), 'fr');
            assert.deepEqual(option('headerToolbar'), { start: 'title', center: '', end: 'today' });
        });

        test('a custom plugin list replaces the defaults', async function (assert) {
            this.set('plugins', [DayGrid]);

            await render(hbs`<EventCalendar @plugins={{this.plugins}} @view="dayGridMonth" @onCalendarReady={{this.onCalendarReady}} />`);

            assert.ok(calendar, 'the calendar is still created');
            assert.strictEqual(option('view'), 'dayGridMonth');
            assert.ok(find('.ec-day-grid'), 'the day grid view renders');
        });
    });

    module('callbacks and render hooks', function () {
        test('callback arguments are wired to their calendar options', async function (assert) {
            const clicked = () => {};
            this.setProperties({ onEventClick: clicked, onDateClick: () => {} });

            await render(TEMPLATE);

            assert.strictEqual(option('eventClick'), clicked, '@onEventClick becomes the eventClick option');
            assert.strictEqual(typeof option('dateClick'), 'function');
        });

        test('render hooks are passed through unprefixed', async function (assert) {
            const renderEvent = () => ({ html: '<b>x</b>' });
            this.set('eventContent', renderEvent);

            await render(TEMPLATE);

            assert.strictEqual(option('eventContent'), renderEvent);
        });

        test('a non-function callback argument is ignored', async function (assert) {
            this.set('onEventClick', 'not-a-function');

            await render(TEMPLATE);

            assert.notStrictEqual(option('eventClick'), 'not-a-function', 'only functions are wired up');
        });
    });

    module('extra options', function () {
        test('extra options are merged in', async function (assert) {
            this.set('options', { dayMaxEvents: 3 });

            await render(TEMPLATE);

            assert.strictEqual(option('dayMaxEvents'), 3);
        });

        test('extra options override the built ones', async function (assert) {
            this.setProperties({ locale: 'en', options: { locale: 'de', height: '200px' } });

            await render(TEMPLATE);

            assert.strictEqual(option('locale'), 'de', 'the override wins');
            assert.strictEqual(option('height'), '200px');
        });
    });

    module('reacting to changes', function () {
        test('changed resources and events are pushed to the live calendar', async function (assert) {
            this.setProperties({ resources: [], events: [] });

            await render(TEMPLATE);
            assert.deepEqual(option('resources'), []);

            this.setProperties({ resources: RESOURCES, events: EVENTS });
            await settled();

            assert.strictEqual(option('resources').length, 2, 'the resources are updated in place');
            assert.strictEqual(option('events').length, 1);
            assert.strictEqual(readyCount, 1, 'the calendar is not rebuilt');
        });

        test('a changed view is pushed to the live calendar', async function (assert) {
            this.set('view', 'resourceTimelineDay');

            await render(TEMPLATE);

            this.set('view', 'resourceTimelineWeek');
            await settled();

            assert.strictEqual(option('view'), 'resourceTimelineWeek');
        });

        test('changed render hooks and callbacks are re-wired', async function (assert) {
            this.setProperties({ eventContent: () => ({ html: 'a' }), onEventClick: () => {} });

            await render(TEMPLATE);

            const nextHook = () => ({ html: 'b' });
            const nextClick = () => {};
            this.setProperties({ eventContent: nextHook, onEventClick: nextClick });
            await settled();

            assert.strictEqual(option('eventContent'), nextHook);
            assert.strictEqual(option('eventClick'), nextClick);
        });

        test('changed extra options are re-applied', async function (assert) {
            this.set('options', { dayMaxEvents: 3 });

            await render(TEMPLATE);

            this.set('options', { dayMaxEvents: 5 });
            await settled();

            assert.strictEqual(option('dayMaxEvents'), 5);
        });
    });

    test('the calendar is destroyed with the component', async function (assert) {
        await render(TEMPLATE);

        assert.ok(find('.fleetbase-event-calendar .ec'), 'the calendar is mounted');

        await clearRender();

        assert.strictEqual(find('.fleetbase-event-calendar'), null, 'the container is gone');
    });
});
