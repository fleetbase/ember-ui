import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, findAll, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const CALENDAR = '#fleetbase-full-calendar';

function events() {
    return [
        { id: 'evt_1', title: 'Pickup', start: '2024-02-01' },
        { id: 'evt_2', title: 'Delivery', start: '2024-02-02' },
    ];
}

module('Integration | Component | full-calendar', function (hooks) {
    setupRenderingTest(hooks);

    let calendar;

    hooks.beforeEach(function () {
        calendar = undefined;
        this.set('onInit', (instance) => {
            calendar = instance;
        });
    });

    hooks.afterEach(function () {
        // FullCalendar attaches document-level listeners; destroying it keeps a later test in the
        // same run from inheriting them (the failure mode logged as DEFECTS.md #94 for Leaflet).
        calendar?.destroy();
    });

    test('it renders a month calendar', async function (assert) {
        await render(hbs`<FullCalendar @onInit={{this.onInit}} />`);

        assert.dom(CALENDAR).exists();
        assert.dom(CALENDAR).hasClass('fleetbase-full-calendar');
        // FullCalendar adds its own classes to the container it is handed rather than nesting a
        // wrapper inside it.
        assert.dom(CALENDAR).hasClass('fc');
        assert.dom(CALENDAR).hasClass('fc-theme-standard');
        assert.strictEqual(calendar.view.type, 'dayGridMonth', 'the month grid is the initial view');
    });

    test('it renders the prev, next and today controls', async function (assert) {
        await render(hbs`<FullCalendar @onInit={{this.onInit}} />`);

        const buttons = findAll(`${CALENDAR} .fc-header-toolbar button`).map((button) => button.className);
        assert.true(
            buttons.some((className) => className.includes('fc-prev-button')),
            'a previous button is rendered'
        );
        assert.true(
            buttons.some((className) => className.includes('fc-next-button')),
            'a next button is rendered'
        );
        assert.true(
            buttons.some((className) => className.includes('fc-today-button')),
            'a today button is rendered'
        );
        assert.dom(`${CALENDAR} .fc-toolbar-title`).exists('the title sits in the centre');
    });

    test('supplied events are rendered', async function (assert) {
        this.set('events', events());

        await render(hbs`<FullCalendar @events={{this.events}} @onInit={{this.onInit}} />`);

        assert.deepEqual(
            calendar.getEvents().map((event) => event.title),
            ['Pickup', 'Delivery']
        );
    });

    test('no events renders an empty calendar', async function (assert) {
        await render(hbs`<FullCalendar @onInit={{this.onInit}} />`);

        assert.deepEqual(calendar.getEvents(), []);
        assert.dom(`${CALENDAR} .fc-daygrid`).exists('the month grid still renders');
    });

    test('the calendar is editable', async function (assert) {
        await render(hbs`<FullCalendar @onInit={{this.onInit}} />`);

        assert.true(calendar.getOption('editable'));
    });

    module('event callbacks', function () {
        test('a registered callback is wired up and fires', async function (assert) {
            const clicks = [];
            this.set('onEventClick', (...args) => clicks.push(args));
            this.set('events', events());

            await render(hbs`<FullCalendar @events={{this.events}} @onEventClick={{this.onEventClick}} @onInit={{this.onInit}} />`);

            calendar.trigger('eventClick', { event: { id: 'evt_1' } });
            await settled();

            assert.strictEqual(clicks.length, 1, 'the click callback is invoked');
            assert.deepEqual(clicks[0][0], { event: { id: 'evt_1' } }, 'the payload is handed through untouched');
        });

        test('every documented event can be subscribed to', async function (assert) {
            const fired = [];
            const handler = (name) => () => fired.push(name);
            this.setProperties({
                onDateClick: handler('dateClick'),
                onDrop: handler('drop'),
                onEventReceive: handler('eventReceive'),
                onEventClick: handler('eventClick'),
                onEventDragStop: handler('eventDragStop'),
                onEventDrop: handler('eventDrop'),
                onEventAdd: handler('eventAdd'),
                onEventChange: handler('eventChange'),
                onEventRemove: handler('eventRemove'),
            });

            await render(hbs`
                <FullCalendar
                    @onInit={{this.onInit}}
                    @onDateClick={{this.onDateClick}}
                    @onDrop={{this.onDrop}}
                    @onEventReceive={{this.onEventReceive}}
                    @onEventClick={{this.onEventClick}}
                    @onEventDragStop={{this.onEventDragStop}}
                    @onEventDrop={{this.onEventDrop}}
                    @onEventAdd={{this.onEventAdd}}
                    @onEventChange={{this.onEventChange}}
                    @onEventRemove={{this.onEventRemove}}
                />
            `);

            for (const eventName of ['dateClick', 'drop', 'eventReceive', 'eventClick', 'eventDragStop', 'eventDrop', 'eventAdd', 'eventChange', 'eventRemove']) {
                calendar.trigger(eventName, {});
            }
            await settled();

            assert.deepEqual(fired, ['dateClick', 'drop', 'eventReceive', 'eventClick', 'eventDragStop', 'eventDrop', 'eventAdd', 'eventChange', 'eventRemove']);
        });

        test('an unsubscribed event fires nothing', async function (assert) {
            const clicks = [];
            this.set('onEventClick', (...args) => clicks.push(args));

            await render(hbs`<FullCalendar @onEventClick={{this.onEventClick}} @onInit={{this.onInit}} />`);

            calendar.trigger('dateClick', {});
            await settled();

            assert.deepEqual(clicks, [], 'only the subscribed callback is wired up');
        });

        test('a calendar with no callbacks at all still renders', async function (assert) {
            await render(hbs`<FullCalendar @onInit={{this.onInit}} />`);

            calendar.trigger('eventClick', {});
            await settled();

            assert.dom(`${CALENDAR} .fc-daygrid`).exists('triggering an unsubscribed event is harmless');
        });
    });
    test('it renders with no @onInit handler', async function (assert) {
        // Every other case supplies @onInit, so its guard had only ever been taken.
        await render(hbs`<FullCalendar />`);

        assert.dom('.fc').exists('the calendar still initialises and renders');
    });
    // The leak these cover (DEFECTS #17): nothing ever called destroyCalendarEventListeners, and
    // even when called it re-bound the handler, so `off()` was handed a function `on()` had never
    // seen and FullCalendar removed nothing. Both tests fail against the pre-fix component — the
    // callback still fires after the component is gone.
    module('tearing down', function () {
        test('a destroyed calendar stops firing its callbacks', async function (assert) {
            const clicks = [];
            this.set('show', true);
            this.set('onEventClick', () => clicks.push('click'));

            await render(hbs`
                {{#if this.show}}
                    <FullCalendar @onEventClick={{this.onEventClick}} @onInit={{this.onInit}} />
                {{/if}}
            `);

            calendar.trigger('eventClick', {});
            await settled();
            assert.strictEqual(clicks.length, 1, 'the callback fires while the component is alive');

            this.set('show', false);
            await settled();

            calendar.trigger('eventClick', {});
            await settled();

            assert.strictEqual(clicks.length, 1, 'and not once the component is gone');
        });

        test('every subscribed event is unsubscribed, not just the first', async function (assert) {
            const fired = [];
            this.set('show', true);
            this.setProperties({
                onDateClick: () => fired.push('dateClick'),
                onEventClick: () => fired.push('eventClick'),
                onEventDrop: () => fired.push('eventDrop'),
            });

            await render(hbs`
                {{#if this.show}}
                    <FullCalendar
                        @onInit={{this.onInit}}
                        @onDateClick={{this.onDateClick}}
                        @onEventClick={{this.onEventClick}}
                        @onEventDrop={{this.onEventDrop}}
                    />
                {{/if}}
            `);

            this.set('show', false);
            await settled();

            for (const eventName of ['dateClick', 'eventClick', 'eventDrop']) {
                calendar.trigger(eventName, {});
            }
            await settled();

            assert.deepEqual(fired, [], 'no listener survives the teardown');
        });
    });
});
