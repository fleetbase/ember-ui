import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { helper } from '@ember/component/helper';

/**
 * The helper transitions through `router:main`, so record the calls on the real router instance
 * instead of letting it attempt a routing transition inside a rendering test.
 */
function stubRouter(owner) {
    const calls = [];
    // eslint-disable-next-line ember/no-private-routing-service -- the helper under test transitions through `router:main` itself
    const router = owner.lookup('router:main');
    router.transitionTo = function (...args) {
        calls.push(args);
    };

    return calls;
}

module('Integration | Helper | transition-to', function (hooks) {
    setupRenderingTest(hooks);

    test('it does not transition until the returned closure is invoked', async function (assert) {
        const calls = stubRouter(this.owner);

        await render(hbs`<button type="button" class="go" {{on "click" (transition-to "orders")}}>Go</button>`);

        assert.deepEqual(calls, [], 'rendering alone does not transition');

        await click('.go');

        assert.deepEqual(calls, [['orders']], 'clicking transitions to the route');
    });

    test('it forwards dynamic segments as positional arguments', async function (assert) {
        const calls = stubRouter(this.owner);
        this.set('id', 'order_1');

        await render(hbs`<button type="button" class="go" {{on "click" (transition-to "orders.view" this.id "activity")}}>Go</button>`);
        await click('.go');

        assert.deepEqual(calls, [['orders.view', 'order_1', 'activity']], 'every positional argument is forwarded');
    });

    test('it appends query params as a trailing options object', async function (assert) {
        const calls = stubRouter(this.owner);

        await render(hbs`<button type="button" class="go" {{on "click" (transition-to "orders" queryParams=(hash page=2 status="active"))}}>Go</button>`);
        await click('.go');

        assert.strictEqual(calls.length, 1, 'one transition happened');
        assert.strictEqual(calls[0][0], 'orders', 'the route name is first');
        assert.deepEqual(calls[0][1], { queryParams: { page: 2, status: 'active' } }, 'the query params are passed as the trailing options');
    });

    test('it appends query params after dynamic segments', async function (assert) {
        const calls = stubRouter(this.owner);

        await render(hbs`<button type="button" class="go" {{on "click" (transition-to "orders.view" "order_1" queryParams=(hash tab="activity"))}}>Go</button>`);
        await click('.go');

        assert.deepEqual(calls[0], ['orders.view', 'order_1', { queryParams: { tab: 'activity' } }], 'segments come before the query params');
    });

    test('it can be invoked more than once', async function (assert) {
        const calls = stubRouter(this.owner);

        await render(hbs`<button type="button" class="go" {{on "click" (transition-to "orders")}}>Go</button>`);
        await click('.go');
        await click('.go');

        assert.strictEqual(calls.length, 2, 'each invocation transitions again');
    });

    test('it prefixes the route with the owner mount point when mounted in an engine', async function (assert) {
        const calls = stubRouter(this.owner);
        this.owner.mountPoint = 'console.fleet-ops';

        await render(hbs`<button type="button" class="go" {{on "click" (transition-to "orders.index")}}>Go</button>`);
        await click('.go');

        assert.deepEqual(calls, [['console.fleet-ops.orders.index']], 'the mount point prefixes the route name');
    });

    test('it maps the application route to the mount point itself', async function (assert) {
        const calls = stubRouter(this.owner);
        this.owner.mountPoint = 'console.fleet-ops';

        await render(hbs`<button type="button" class="go" {{on "click" (transition-to "application")}}>Go</button>`);
        await click('.go');

        assert.deepEqual(calls, [['console.fleet-ops']], 'the application route resolves to the mount point');
    });

    test('it ignores a blank mount point', async function (assert) {
        const calls = stubRouter(this.owner);
        this.owner.mountPoint = '   ';

        await render(hbs`<button type="button" class="go" {{on "click" (transition-to "orders")}}>Go</button>`);
        await click('.go');

        assert.deepEqual(calls, [['orders']], 'a blank mount point does not prefix the route name');
    });

    test('it reads the route name lazily so the latest argument value is used', async function (assert) {
        const calls = stubRouter(this.owner);
        this.set('route', 'orders');

        await render(hbs`<button type="button" class="go" {{on "click" (transition-to this.route)}}>Go</button>`);
        await click('.go');

        this.set('route', 'places');
        await settled();
        await click('.go');

        assert.deepEqual(calls, [['orders'], ['places']], 'the second click uses the updated route name');
    });
    // The closure is captured and called directly: thrown from inside `{{on "click"}}` the
    // assertion escapes as an uncaught global error that assert.throws cannot intercept.
    test('a non-string route name is rejected rather than interpolated', async function (assert) {
        const calls = stubRouter(this.owner);
        this.owner.mountPoint = 'console.fleet-ops';
        this.set('route', 404);

        const captured = [];
        this.owner.register(
            'helper:capture-value',
            helper(function ([value]) {
                captured.push(value);
                return '';
            })
        );

        await render(hbs`{{capture-value (transition-to this.route)}}`);

        assert.throws(captured[0], /propValue argument must be an string/, 'the caller is told about its own bug');
        assert.deepEqual(calls, [], 'and no transition is attempted');
    });
});
