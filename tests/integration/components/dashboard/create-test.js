import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, settled, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

function widget(id, overrides = {}) {
    return {
        id,
        component: 'widget/count',
        options: { title: `Widget ${id}` },
        grid_options: { x: 0, y: 0, w: 4, h: 4 },
        updateProperties(properties) {
            this.updated = (this.updated ?? 0) + 1;
            this.lastProperties = properties;
            return true;
        },
        ...overrides,
    };
}

module('Integration | Component | dashboard/create', function (hooks) {
    setupRenderingTest(hooks);

    let serverErrors;
    let removals;
    let removeResult;

    hooks.beforeEach(function () {
        serverErrors = [];
        removals = [];
        removeResult = () => Promise.resolve();

        this.owner.unregister('service:notifications');
        this.owner.register(
            'service:notifications',
            class extends Service {
                serverError(error) {
                    serverErrors.push(error);
                }
            }
        );

        this.set('dashboard', {
            id: 'dash_1',
            widgets: [widget('w1'), widget('w2')],
            removeWidget: (id) => {
                removals.push(id);
                return removeResult();
            },
        });
    });

    const TEMPLATE = hbs`<Dashboard::Create @dashboard={{this.dashboard}} @isEdit={{this.isEdit}} />`;

    module('rendering', function () {
        test('it renders a grid for the dashboard', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.fleetbase-dashboard-grid').exists();
            assert.dom('[data-id="dash_1"]').exists('the grid is keyed to the dashboard id');
        });

        test('with no dashboard it still renders an empty grid', async function (assert) {
            this.set('dashboard', undefined);

            await render(TEMPLATE);

            assert.dom('.fleetbase-dashboard-grid').exists();
            assert.dom('[data-id="__empty__"]').exists('a placeholder key is used');
        });

        test('changing dashboard re-keys the grid', async function (assert) {
            await render(TEMPLATE);
            assert.dom('[data-id="dash_1"]').exists();

            this.set('dashboard', { id: 'dash_2', widgets: [], removeWidget: () => Promise.resolve() });
            await settled();

            assert.dom('[data-id="dash_2"]').exists('the subtree is rebuilt for the new dashboard');
            assert.dom('[data-id="dash_1"]').doesNotExist();
        });

        test('remove buttons only appear while editing', async function (assert) {
            await render(TEMPLATE);
            assert.strictEqual(findAll('.fleetbase-dashboard-grid button').length, 0, 'no controls outside edit mode');

            this.set('isEdit', true);
            await settled();

            assert.true(findAll('.fleetbase-dashboard-grid button').length > 0, 'each widget gains a remove control');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<Dashboard::Create @dashboard={{this.dashboard}} data-test-grid="yes" />`);

            assert.dom('.fleetbase-dashboard-grid').hasAttribute('data-test-grid', 'yes');
        });
    });

    // GridStack announces moves and resizes as a DOM `change` event on its own element, carrying
    // the affected widgets in `detail`. Dispatching one directly is the only way to drive this
    // without a real drag, and it is what gridstack itself does.
    module('persisting grid changes', function (hooks) {
        hooks.beforeEach(function () {
            this.set('isEdit', true);
        });

        function announceChange(...items) {
            find('.grid-stack').dispatchEvent(new CustomEvent('change', { detail: items }));

            return settled();
        }

        test('a moved widget has its new position written back, keeping its other grid options', async function (assert) {
            this.dashboard.widgets[0].grid_options = { x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 4 };

            await render(TEMPLATE);
            await announceChange({ id: 'w1', x: 1, y: 2, w: 3, h: 4 });

            const [first, second] = this.dashboard.widgets;
            assert.strictEqual(first.updated, 1, 'the moved widget is updated');
            assert.deepEqual(first.lastProperties, { grid_options: { x: 1, y: 2, w: 3, h: 4, minW: 3, minH: 4 } }, 'minimum sizes survive the move');
            assert.strictEqual(second.updated, undefined, 'and only that one');
        });

        test('a widget that is not on the dashboard is skipped', async function (assert) {
            await render(TEMPLATE);
            await announceChange({ id: 'not-a-widget', x: 0, y: 0, w: 1, h: 1 });

            assert.deepEqual(
                this.dashboard.widgets.map((widget) => widget.updated),
                [undefined, undefined],
                'nothing is written back'
            );
        });

        // Every drop is a change to keep: the old handler remembered a widget after its first
        // write and ignored every later move, so a dashboard reloaded to an early layout.
        test('a widget moved again is written back again', async function (assert) {
            await render(TEMPLATE);
            await announceChange({ id: 'w1', x: 1, y: 2, w: 3, h: 4 });
            await announceChange({ id: 'w1', x: 5, y: 6, w: 7, h: 8 });

            const [first] = this.dashboard.widgets;
            assert.strictEqual(first.updated, 2, 'both moves are written');
            assert.deepEqual(first.lastProperties, { grid_options: { x: 5, y: 6, w: 7, h: 8 } }, 'the last position stands');
        });

        test('a change that leaves the position as stored is not written back', async function (assert) {
            await render(TEMPLATE);
            await announceChange({ id: 'w1', x: 0, y: 0, w: 4, h: 4 });

            assert.strictEqual(this.dashboard.widgets[0].updated, undefined);
        });

        // gridstack reports `change` while laying the grid out at load and whenever it is
        // re-created; writing those back overwrote the saved layout with a reflowed one.
        test('changes reported outside edit mode are not persisted', async function (assert) {
            this.set('isEdit', false);

            await render(TEMPLATE);
            await announceChange({ id: 'w1', x: 1, y: 2, w: 3, h: 4 });

            assert.strictEqual(this.dashboard.widgets[0].updated, undefined, 'a reflow at load is not the user saving a layout');
        });

        test('a failed write is reported', async function (assert) {
            this.dashboard.widgets[0].updateProperties = () => Promise.reject(new Error('save failed'));

            await render(TEMPLATE);
            await announceChange({ id: 'w1', x: 1, y: 2, w: 3, h: 4 });

            assert.strictEqual(serverErrors.length, 1);
            assert.strictEqual(serverErrors[0].message, 'save failed');
        });

        test('leaving edit mode writes back every widget as the grid has it', async function (assert) {
            await render(TEMPLATE);
            // Stand in for gridstack's engine: w1 was placed by gridstack (never reported), w2 is unchanged.
            find('.grid-stack').gridstack = { engine: { nodes: [{ id: 'w1', x: 8, y: 0, w: 4, h: 4 }, { id: 'w2', x: 0, y: 0, w: 4, h: 4 }] } };

            this.set('isEdit', false);
            await settled();

            const [first, second] = this.dashboard.widgets;
            assert.deepEqual(first.lastProperties, { grid_options: { x: 8, y: 0, w: 4, h: 4 } }, 'the auto-placed widget is stored where the grid put it');
            assert.strictEqual(second.updated, undefined, 'an unchanged widget is left alone');
        });

        test('entering edit mode writes nothing back', async function (assert) {
            this.set('isEdit', false);

            await render(TEMPLATE);
            find('.grid-stack').gridstack = { engine: { nodes: [{ id: 'w1', x: 8, y: 0, w: 4, h: 4 }] } };
            this.set('isEdit', true);
            await settled();

            assert.strictEqual(this.dashboard.widgets[0].updated, undefined);
        });

        test('leaving edit mode with no dashboard or no grid instance is harmless', async function (assert) {
            this.set('dashboard', null);

            await render(TEMPLATE);
            this.set('isEdit', false);
            await settled();

            this.set('dashboard', { id: 'dash_2', widgets: [widget('w1')], removeWidget: () => Promise.resolve() });
            this.set('isEdit', true);
            await settled();
            const root = find('.grid-stack');
            root.gridstack = undefined;
            this.set('isEdit', false);
            await settled();

            assert.strictEqual(this.dashboard.widgets[0].updated, undefined, 'nothing to read from means nothing written');
        });
    });

    module('removing a widget', function (hooks) {
        hooks.beforeEach(function () {
            this.set('isEdit', true);
        });

        test('the remove control asks the dashboard to drop that widget', async function (assert) {
            await render(TEMPLATE);

            await click(findAll('.fleetbase-dashboard-grid button')[0]);

            assert.deepEqual(removals, ['w1']);
            assert.deepEqual(serverErrors, []);
        });

        test('a failed removal is reported', async function (assert) {
            const failure = new Error('could not remove');
            removeResult = () => Promise.reject(failure);

            await render(TEMPLATE);
            await click(findAll('.fleetbase-dashboard-grid button')[0]);

            assert.deepEqual(serverErrors, [failure]);
        });
    });
});
