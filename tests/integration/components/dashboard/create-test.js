import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

function widget(id, overrides = {}) {
    return {
        id,
        component: 'widget/count',
        options: { title: `Widget ${id}` },
        grid_options: { x: 0, y: 0, w: 4, h: 4 },
        updateProperties() {
            this.updated = (this.updated ?? 0) + 1;
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
