import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const DRAGGABLE = '.fleetbase-full-calendar-draggable';

module('Integration | Component | full-calendar/draggable', function (hooks) {
    setupRenderingTest(hooks);

    let ready;
    let dragReady;

    hooks.beforeEach(function () {
        ready = [];
        dragReady = [];
        this.set('onReady', (...args) => ready.push(args));
        this.set('onDragReady', (...args) => dragReady.push(args));
    });

    test('it renders an enabled draggable wrapping its block', async function (assert) {
        await render(hbs`<FullCalendar::Draggable><span class="inside">Pickup</span></FullCalendar::Draggable>`);

        assert.dom(DRAGGABLE).exists();
        assert.dom(`${DRAGGABLE} .inside`).hasText('Pickup');
        assert.dom(DRAGGABLE).doesNotHaveClass('draggable-disabled');
        assert.dom(DRAGGABLE).doesNotHaveAttribute('data-disabled', 'a false flag is dropped entirely');
    });

    test('a disabled draggable is marked', async function (assert) {
        await render(hbs`<FullCalendar::Draggable @disabled={{true}} />`);

        assert.dom(DRAGGABLE).hasClass('draggable-disabled');
        // Glimmer renders a `true` attribute value as a valueless attribute.
        assert.dom(DRAGGABLE).hasAttribute('data-disabled', '', 'the disabled flag is exposed');
    });

    test('the event payload is serialised onto the element', async function (assert) {
        this.set('eventData', JSON.stringify({ title: 'Pickup', duration: '01:00' }));

        await render(hbs`<FullCalendar::Draggable @eventData={{this.eventData}} />`);

        assert.dom(DRAGGABLE).hasAttribute('data-event', this.eventData);
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<FullCalendar::Draggable class="my-card" data-test-draggable="yes" />`);

        assert.dom(DRAGGABLE).hasClass('my-card');
        assert.dom(DRAGGABLE).hasAttribute('data-test-draggable', 'yes');
    });

    module('lifecycle callbacks', function () {
        test('onReady and onDragReady both fire for an enabled draggable', async function (assert) {
            await render(hbs`<FullCalendar::Draggable @onReady={{this.onReady}} @onDragReady={{this.onDragReady}} />`);

            assert.strictEqual(ready.length, 1, 'onReady fires once');
            assert.strictEqual(ready[0][0], find(DRAGGABLE), 'onReady receives the element');
            assert.strictEqual(dragReady.length, 1, 'onDragReady fires once');
            assert.strictEqual(typeof dragReady[0][0].destroy, 'function', 'onDragReady receives the Draggable');
        });

        test('a disabled draggable reports ready but never becomes draggable', async function (assert) {
            await render(hbs`<FullCalendar::Draggable @disabled={{true}} @onReady={{this.onReady}} @onDragReady={{this.onDragReady}} />`);

            assert.strictEqual(ready.length, 1, 'onReady still fires');
            assert.deepEqual(dragReady, [], 'no Draggable is created');
        });

        test('it renders with no callbacks at all', async function (assert) {
            await render(hbs`<FullCalendar::Draggable />`);

            assert.dom(DRAGGABLE).exists('neither callback is required');
        });
    });

    module('reacting to the disabled argument', function () {
        test('disabling it after render tears the draggable down', async function (assert) {
            this.set('disabled', false);

            await render(hbs`<FullCalendar::Draggable @disabled={{this.disabled}} @onReady={{this.onReady}} @onDragReady={{this.onDragReady}} />`);
            assert.strictEqual(dragReady.length, 1, 'it starts out draggable');

            this.set('disabled', true);
            await settled();

            assert.dom(DRAGGABLE).hasClass('draggable-disabled');
            assert.strictEqual(ready.length, 2, 'the element is re-prepared');
            assert.strictEqual(dragReady.length, 1, 'but no new Draggable is created');
        });

        test('enabling it after render makes it draggable again', async function (assert) {
            this.set('disabled', true);

            await render(hbs`<FullCalendar::Draggable @disabled={{this.disabled}} @onReady={{this.onReady}} @onDragReady={{this.onDragReady}} />`);
            assert.deepEqual(dragReady, [], 'it starts out disabled');

            this.set('disabled', false);
            await settled();

            assert.dom(DRAGGABLE).doesNotHaveClass('draggable-disabled');
            assert.strictEqual(dragReady.length, 1, 'a Draggable is created');
        });
    });
});
