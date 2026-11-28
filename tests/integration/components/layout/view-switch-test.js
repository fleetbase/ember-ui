import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, focus, settled, triggerKeyEvent, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupShellStubs } from '../../../helpers/shell-stubs';

function labels() {
    return findAll('[role="radio"]').map((radio) => radio.textContent.trim().replace(/\s+/g, ' '));
}

function checked() {
    return findAll('[role="radio"][aria-checked="true"]').map((radio) => radio.dataset.view);
}

module('Integration | Component | layout/view-switch', function (hooks) {
    setupRenderingTest(hooks);
    setupShellStubs(hooks);

    hooks.beforeEach(function () {
        this.changes = [];
        this.onChange = (id, view) => this.changes.push([id, view.label]);
    });

    test('without @views it offers Map, Table and Board, the first selected', async function (assert) {
        await render(hbs`<Layout::ViewSwitch />`);

        assert.dom('.fb-view-switch [role="radiogroup"]').hasAttribute('aria-label', 'View');
        assert.deepEqual(labels(), ['Map', 'Table', 'Board']);
        assert.deepEqual(checked(), ['map']);
        assert.dom('[data-view="map"]').hasAttribute('tabindex', '0').hasClass('is-selected');
        assert.dom('[data-view="table"]').hasAttribute('tabindex', '-1');
        assert.dom('.fb-view-switch-primary').doesNotExist();
        assert.dom('.fb-view-switch-divider').doesNotExist();
    });

    test('it sits top-centre in the chrome', async function (assert) {
        await render(hbs`<div class="host"><Layout::ViewSwitch /></div>`);
        const host = find('.host');
        host.style.setProperty('position', 'relative');
        host.style.setProperty('width', '800px');
        host.style.setProperty('height', '200px');

        const pill = find('.fb-view-switch');
        assert.strictEqual(getComputedStyle(pill).position, 'absolute');
        assert.strictEqual(pill.offsetTop, 12);
        const hostRect = host.getBoundingClientRect();
        const pillRect = pill.getBoundingClientRect();
        assert.true(Math.abs(hostRect.left + hostRect.width / 2 - (pillRect.left + pillRect.width / 2)) < 1, 'centred horizontally');
    });

    test('views show their counts, and @selected picks one', async function (assert) {
        this.views = [
            { id: 'map', label: 'Map' },
            { id: 'table', label: 'Table', count: 57 },
            { id: 'board', label: 'Board', count: 0 },
        ];
        await render(hbs`<Layout::ViewSwitch @views={{this.views}} @selected="table" @label="Orders view" />`);

        assert.deepEqual(labels(), ['Map', 'Table 57', 'Board 0']);
        assert.deepEqual(checked(), ['table']);
        assert.dom('[role="radiogroup"]').hasAttribute('aria-label', 'Orders view');
    });

    test('clicking a view calls @onChange with its id', async function (assert) {
        this.selected = 'map';
        this.setView = (id, view) => {
            this.changes.push([id, view.label]);
            this.set('selected', id);
        };
        await render(hbs`<Layout::ViewSwitch @selected={{this.selected}} @onChange={{this.setView}} />`);

        await click('[data-view="board"]');
        assert.deepEqual(this.changes, [['board', 'Board']]);
        assert.deepEqual(checked(), ['board']);
    });

    test('without @selected or @onChange it remembers the last view clicked', async function (assert) {
        await render(hbs`<Layout::ViewSwitch />`);

        await click('[data-view="table"]');
        assert.deepEqual(checked(), ['table']);
    });

    test('a remembered view that is no longer offered falls back to the first', async function (assert) {
        this.views = [
            { id: 'map', label: 'Map' },
            { id: 'table', label: 'Table' },
        ];
        await render(hbs`<Layout::ViewSwitch @views={{this.views}} />`);
        await click('[data-view="table"]');

        this.set('views', [
            { id: 'map', label: 'Map' },
            { id: 'board', label: 'Board' },
        ]);
        await settled();
        assert.deepEqual(checked(), ['map']);
    });

    test('views with routes follow the current route, most specific first, and navigate when clicked', async function (assert) {
        this.views = [
            { id: 'map', label: 'Map', route: 'console.fleet-ops.operations.orders.index' },
            { id: 'table', label: 'Table', route: 'console.fleet-ops.operations.orders.index', query: { layout: 'table' } },
            { id: 'board', label: 'Board', route: 'console.fleet-ops.operations.orders.index.board' },
        ];
        this.router.currentRouteName = 'console.fleet-ops.operations.orders.index.board';
        await render(hbs`<Layout::ViewSwitch @views={{this.views}} />`);

        assert.deepEqual(checked(), ['board']);

        await click('[data-view="table"]');
        assert.deepEqual(this.router.transitions, [['console.fleet-ops.operations.orders.index', { queryParams: { layout: 'table' } }]]);
    });

    test('a view with neither a route nor @onChange only selects', async function (assert) {
        await render(hbs`<Layout::ViewSwitch />`);
        await click('[data-view="board"]');
        assert.deepEqual(this.router.transitions, []);
    });

    test('arrow keys, Home and End move the selection and focus, wrapping around', async function (assert) {
        await render(hbs`<Layout::ViewSwitch @onChange={{this.onChange}} />`);
        await focus('[data-view="map"]');

        await triggerKeyEvent('[data-view="map"]', 'keydown', 'ArrowRight');
        assert.deepEqual(checked(), ['table']);
        assert.strictEqual(document.activeElement, find('[data-view="table"]'));

        await triggerKeyEvent('[data-view="table"]', 'keydown', 'ArrowDown');
        await triggerKeyEvent('[data-view="board"]', 'keydown', 'ArrowRight');
        assert.deepEqual(checked(), ['map'], 'wraps past the end');

        await triggerKeyEvent('[data-view="map"]', 'keydown', 'ArrowLeft');
        assert.deepEqual(checked(), ['board'], 'wraps past the start');

        await triggerKeyEvent('[data-view="board"]', 'keydown', 'ArrowUp');
        await triggerKeyEvent('[data-view="table"]', 'keydown', 'Home');
        assert.deepEqual(checked(), ['map']);

        await triggerKeyEvent('[data-view="map"]', 'keydown', 'End');
        assert.deepEqual(checked(), ['board']);

        await triggerKeyEvent('[data-view="board"]', 'keydown', 'Enter');
        assert.deepEqual(checked(), ['board'], 'other keys do nothing');
        assert.deepEqual(
            this.changes.map(([id]) => id),
            ['table', 'board', 'map', 'board', 'table', 'map', 'board']
        );
    });

    test('a primary action renders after a divider and runs its handler', async function (assert) {
        this.created = 0;
        this.primary = { label: 'New order', icon: 'plus', onClick: () => this.created++ };
        await render(hbs`<Layout::ViewSwitch @primaryAction={{this.primary}} />`);

        assert.dom('.fb-view-switch-divider').exists();
        assert.dom('.fb-view-switch-primary').hasText('New order');
        assert.dom('.fb-view-switch-primary svg').exists('with its icon');

        await click('.fb-view-switch-primary');
        assert.strictEqual(this.created, 1);
    });

    test('a primary action can navigate, needs a label, and may have no icon', async function (assert) {
        this.primary = { label: 'New order', route: 'console.fleet-ops.operations.orders.index.new' };
        await render(hbs`<Layout::ViewSwitch @primaryAction={{this.primary}} />`);

        assert.dom('.fb-view-switch-primary svg').doesNotExist();
        await click('.fb-view-switch-primary');
        assert.deepEqual(this.router.transitions, [['console.fleet-ops.operations.orders.index.new', { queryParams: {} }]]);

        this.set('primary', { icon: 'plus' });
        assert.dom('.fb-view-switch-primary').doesNotExist();
    });

    test('an actions block replaces the primary action', async function (assert) {
        this.primary = { label: 'New order' };
        await render(hbs`
            <Layout::ViewSwitch @primaryAction={{this.primary}}>
                <:actions><button type="button" class="custom-action">Import</button></:actions>
            </Layout::ViewSwitch>
        `);

        assert.dom('.fb-view-switch-divider').exists();
        assert.dom('.custom-action').hasText('Import');
        assert.dom('.fb-view-switch-primary').doesNotExist();
    });

    test('it forwards attributes', async function (assert) {
        await render(hbs`<Layout::ViewSwitch class="orders-switch" data-test-switch />`);
        assert.dom('.fb-view-switch').hasClass('orders-switch').hasAttribute('data-test-switch');
    });
});
