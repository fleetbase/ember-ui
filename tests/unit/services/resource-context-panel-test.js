import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import Service from '@ember/service';

function contentOverlay(overrides = {}) {
    return { content: 'my-panel', ...overrides };
}

function tabbedOverlay(overrides = {}) {
    return {
        tabs: [
            { key: 'details', title: 'Details', component: 'panel/details' },
            { key: 'history', label: 'History', render: () => 'history' },
        ],
        ...overrides,
    };
}

module('Unit | Service | resource-context-panel', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const routerEvents = [];
        const transitions = [];

        this.routerEvents = routerEvents;
        this.transitions = transitions;

        // Local router stub so no real transition is ever attempted.
        this.owner.register(
            'service:router',
            class RouterStub extends Service {
                on(eventName, handler) {
                    routerEvents.push(['on', eventName, handler]);
                }

                off(eventName, handler) {
                    routerEvents.push(['off', eventName, handler]);
                }

                transitionTo(options) {
                    transitions.push(options);
                }
            }
        );

        this.service = this.owner.lookup('service:resource-context-panel');
    });

    module('initial state', function () {
        test('it starts with no overlays and no active tabs', function (assert) {
            assert.deepEqual(this.service.overlays, []);
            assert.deepEqual(this.service.activeTabs, {});
            assert.strictEqual(this.service.getActive(), null);
            assert.false(this.service.isOpen(), 'nothing is open');
            assert.false(this.service.isOpen('anything'));
            assert.deepEqual(this.service.stack(), []);
            assert.strictEqual(this.service.getById('missing'), null);
            assert.strictEqual(this.service.getActiveTab('missing'), null);
        });

        test('stack() returns a defensive copy', function (assert) {
            this.service.open(contentOverlay({ id: 'a' }));

            const stack = this.service.stack();
            stack.push('junk');

            assert.strictEqual(this.service.overlays.length, 1, 'mutating the returned array does not affect the service');
        });
    });

    module('open', function () {
        test('it pushes the overlay and returns its id', function (assert) {
            const id = this.service.open(contentOverlay({ id: 'panel-1' }));

            assert.strictEqual(id, 'panel-1');
            assert.strictEqual(this.service.overlays.length, 1);
            assert.true(this.service.isOpen('panel-1'));
            assert.true(this.service.isOpen());
            assert.strictEqual(this.service.getById('panel-1').content, 'my-panel');
        });

        test('it generates an id and defaults the size when omitted', function (assert) {
            const definition = contentOverlay();
            const id = this.service.open(definition);

            assert.true(id.startsWith('overlay-'), `generated id ${id} is namespaced`);
            assert.strictEqual(definition.id, id, 'the definition is mutated in place with its id');
            assert.strictEqual(definition.size, 'sm', 'size defaults to sm');
        });

        test('generated ids are unique per overlay', function (assert) {
            const first = this.service.open(contentOverlay());
            const second = this.service.open(contentOverlay());

            assert.notStrictEqual(first, second);
            assert.strictEqual(this.service.overlays.length, 2);
        });

        test('an explicit size is preserved', function (assert) {
            const definition = contentOverlay({ size: 'lg' });
            this.service.open(definition);

            assert.strictEqual(definition.size, 'lg');
        });

        test('overlays stack in open order and getActive returns the top-most', function (assert) {
            this.service.open(contentOverlay({ id: 'a' }));
            this.service.open(contentOverlay({ id: 'b' }));

            assert.deepEqual(
                this.service.overlays.map((overlay) => overlay.id),
                ['a', 'b']
            );
            assert.strictEqual(this.service.getActive().id, 'b', 'the last opened overlay is active');
        });

        test('it replaces the overlays array rather than mutating it (tracking safety)', function (assert) {
            const before = this.service.overlays;
            this.service.open(contentOverlay({ id: 'a' }));

            assert.notStrictEqual(this.service.overlays, before, 'a new array instance is assigned');
            assert.strictEqual(before.length, 0, 'the previous array is left untouched');
        });

        test('a tabbed overlay activates its first tab', function (assert) {
            this.service.open(tabbedOverlay({ id: 'tabbed' }));

            assert.strictEqual(this.service.getActiveTab('tabbed'), 'details');
            assert.deepEqual(this.service.activeTabs, { tabbed: 'details' });
        });

        test('initialTab overrides the first tab', function (assert) {
            this.service.open(tabbedOverlay({ id: 'tabbed', initialTab: 'history' }));

            assert.strictEqual(this.service.getActiveTab('tabbed'), 'history');
        });

        test('a content overlay registers no active tab', function (assert) {
            this.service.open(contentOverlay({ id: 'plain' }));

            assert.deepEqual(this.service.activeTabs, {});
            assert.strictEqual(this.service.getActiveTab('plain'), null);
        });

        test('the onOpen hook receives the resource, model and a close callback', async function (assert) {
            const resource = { id: 'record-1' };
            let received;

            this.service.open(
                contentOverlay({
                    id: 'hooked',
                    resource,
                    onOpen(context) {
                        received = context;
                    },
                })
            );

            assert.strictEqual(received.resource, resource);
            assert.strictEqual(received.model, resource, 'model mirrors resource when only resource is given');
            assert.strictEqual(typeof received.close, 'function');

            await received.close();
            assert.false(this.service.isOpen('hooked'), 'the provided close callback closes this overlay');
        });

        test('onOpen falls back to the model when no resource is given', function (assert) {
            const model = { id: 'model-1' };
            let received;

            this.service.open(contentOverlay({ id: 'hooked', model, onOpen: (context) => (received = context) }));

            assert.strictEqual(received.resource, model);
            assert.strictEqual(received.model, model);
        });

        test('onOpen runs only after the overlay is on the stack', function (assert) {
            let openCountAtHookTime;

            this.service.open(contentOverlay({ id: 'hooked', onOpen: () => (openCountAtHookTime = this.service.overlays.length) }));

            assert.strictEqual(openCountAtHookTime, 1);
        });
    });

    module('validation', function () {
        test('an overlay with neither tabs nor content is rejected', function (assert) {
            assert.throws(() => this.service.open({ id: 'bad' }), /must have either tabs or content/);
            assert.strictEqual(this.service.overlays.length, 0, 'nothing is added on a failed open');
        });

        test('an overlay with both tabs and content is rejected', function (assert) {
            assert.throws(() => this.service.open(tabbedOverlay({ id: 'bad', content: 'x' })), /cannot have both tabs and content/);
        });

        test('an empty tabs array is rejected', function (assert) {
            assert.throws(() => this.service.open({ id: 'bad', tabs: [] }), /Tabs must be a non-empty array/);
        });

        test('a non-array tabs value is rejected', function (assert) {
            assert.throws(() => this.service.open({ id: 'bad', tabs: { key: 'x' } }), /Tabs must be a non-empty array/);
        });

        test('a tab without a title or label is rejected', function (assert) {
            assert.throws(() => this.service.open({ id: 'bad', tabs: [{ component: 'x' }] }), /Each tab must have/);
        });

        test('a tab without a component or render is rejected', function (assert) {
            assert.throws(() => this.service.open({ id: 'bad', tabs: [{ title: 'Details' }] }), /Each tab must have/);
        });

        test('label plus render is an acceptable tab', function (assert) {
            this.service.open({ id: 'ok', tabs: [{ label: 'Details', render: () => 'x' }] });

            assert.true(this.service.isOpen('ok'));
        });
    });

    module('update', function () {
        test('it merges the partial into the existing overlay', function (assert) {
            this.service.open(contentOverlay({ id: 'a', size: 'sm' }));
            this.service.update('a', { size: 'lg', title: 'Updated' });

            const overlay = this.service.getById('a');
            assert.strictEqual(overlay.size, 'lg');
            assert.strictEqual(overlay.title, 'Updated');
            assert.strictEqual(overlay.content, 'my-panel', 'untouched keys survive');
        });

        test('it preserves stack position', function (assert) {
            this.service.open(contentOverlay({ id: 'a' }));
            this.service.open(contentOverlay({ id: 'b' }));
            this.service.update('a', { size: 'lg' });

            assert.deepEqual(
                this.service.overlays.map((overlay) => overlay.id),
                ['a', 'b'],
                'updating does not reorder the stack'
            );
        });

        test('it replaces the overlay object rather than mutating it', function (assert) {
            const definition = contentOverlay({ id: 'a' });
            this.service.open(definition);
            this.service.update('a', { size: 'lg' });

            assert.notStrictEqual(this.service.getById('a'), definition, 'a new object is stored');
            assert.strictEqual(definition.size, 'sm', 'the original definition is not mutated by update');
        });

        test('it throws for an unknown id', function (assert) {
            assert.throws(() => this.service.update('nope', { size: 'lg' }), /Overlay with ID nope not found/);
        });

        test('it revalidates the merged definition', function (assert) {
            this.service.open(contentOverlay({ id: 'a' }));

            assert.throws(() => this.service.update('a', { tabs: [{ title: 'T', component: 'c' }] }), /cannot have both tabs and content/);
        });
    });

    module('close', function () {
        test('it removes the overlay by id', async function (assert) {
            this.service.open(contentOverlay({ id: 'a' }));
            this.service.open(contentOverlay({ id: 'b' }));

            await this.service.close('a');

            assert.deepEqual(
                this.service.overlays.map((overlay) => overlay.id),
                ['b']
            );
            assert.false(this.service.isOpen('a'));
        });

        test('without an id it closes the top-most overlay', async function (assert) {
            this.service.open(contentOverlay({ id: 'a' }));
            this.service.open(contentOverlay({ id: 'b' }));

            await this.service.close();

            assert.deepEqual(
                this.service.overlays.map((overlay) => overlay.id),
                ['a'],
                'the most recently opened overlay is closed'
            );
        });

        test('closing an unknown id is a no-op', async function (assert) {
            this.service.open(contentOverlay({ id: 'a' }));

            await this.service.close('does-not-exist');

            assert.strictEqual(this.service.overlays.length, 1, 'nothing is removed and nothing throws');
        });

        test('closing with an empty stack is a no-op', async function (assert) {
            await this.service.close();

            assert.deepEqual(this.service.overlays, []);
        });

        test('it clears the active tab entry for the closed overlay only', async function (assert) {
            this.service.open(tabbedOverlay({ id: 'a' }));
            this.service.open(tabbedOverlay({ id: 'b' }));

            await this.service.close('a');

            assert.deepEqual(this.service.activeTabs, { b: 'details' });
        });

        test('it awaits an async onClose hook before removing the overlay', async function (assert) {
            const order = [];

            this.service.open(
                contentOverlay({
                    id: 'a',
                    async onClose() {
                        order.push('hook-start');
                        await Promise.resolve();
                        order.push('hook-end');
                    },
                })
            );

            await this.service.close('a');
            order.push('closed');

            assert.deepEqual(order, ['hook-start', 'hook-end', 'closed'], 'the hook completes before close resolves');
            assert.false(this.service.isOpen('a'));
        });

        test('the onClose hook receives the model and a close callback', async function (assert) {
            const model = { id: 1 };
            let received;

            this.service.open(contentOverlay({ id: 'a', model, onClose: (context) => (received = context) }));
            await this.service.close('a');

            assert.strictEqual(received.model, model);
            assert.strictEqual(typeof received.close, 'function');
        });

        test('closeAll empties the stack and the tab map', async function (assert) {
            this.service.open(tabbedOverlay({ id: 'a' }));
            this.service.open(contentOverlay({ id: 'b' }));
            this.service.open(contentOverlay({ id: 'c' }));

            await this.service.closeAll();

            assert.deepEqual(this.service.overlays, []);
            assert.deepEqual(this.service.activeTabs, {});
            assert.false(this.service.isOpen());
        });

        test('closeAll closes from the top of the stack down', async function (assert) {
            const closed = [];
            const track = (id) => contentOverlay({ id, onClose: () => closed.push(id) });

            this.service.open(track('a'));
            this.service.open(track('b'));
            this.service.open(track('c'));

            await this.service.closeAll();

            assert.deepEqual(closed, ['c', 'b', 'a']);
        });

        test('closeAll on an empty stack resolves without error', async function (assert) {
            await this.service.closeAll();

            assert.deepEqual(this.service.overlays, []);
        });
    });

    module('setActiveTab', function () {
        test('it switches the active tab', function (assert) {
            this.service.open(tabbedOverlay({ id: 'a' }));
            this.service.setActiveTab('a', 'history');

            assert.strictEqual(this.service.getActiveTab('a'), 'history');
        });

        test('it matches a tab by id as well as by key', function (assert) {
            this.service.open({
                id: 'a',
                tabs: [
                    { key: 'one', title: 'One', component: 'c' },
                    { id: 'two', title: 'Two', component: 'c' },
                ],
            });
            this.service.setActiveTab('a', 'two');

            assert.strictEqual(this.service.getActiveTab('a'), 'two');
        });

        test('it throws for an unknown overlay, a tabless overlay and an unknown tab', function (assert) {
            this.service.open(contentOverlay({ id: 'plain' }));
            this.service.open(tabbedOverlay({ id: 'tabbed' }));

            assert.throws(() => this.service.setActiveTab('nope', 'details'), /Overlay with ID nope not found/);
            assert.throws(() => this.service.setActiveTab('plain', 'details'), /does not have tabs/);
            assert.throws(() => this.service.setActiveTab('tabbed', 'nope'), /Tab with key nope not found/);
            assert.strictEqual(this.service.getActiveTab('tabbed'), 'details', 'the active tab is unchanged after a failed switch');
        });

        test('a beforeLeave guard returning false blocks the switch', function (assert) {
            this.service.open({
                id: 'a',
                tabs: [
                    { key: 'one', title: 'One', component: 'c', beforeLeave: () => false },
                    { key: 'two', title: 'Two', component: 'c' },
                ],
            });

            this.service.setActiveTab('a', 'two');

            assert.strictEqual(this.service.getActiveTab('a'), 'one', 'the guard prevented the change');
        });

        test('a beforeLeave guard returning true allows the switch and receives context', function (assert) {
            let received;
            this.service.open({
                id: 'a',
                model: { id: 7 },
                tabs: [
                    {
                        key: 'one',
                        title: 'One',
                        component: 'c',
                        beforeLeave(context) {
                            received = context;
                            return true;
                        },
                    },
                    { key: 'two', title: 'Two', component: 'c' },
                ],
            });

            this.service.setActiveTab('a', 'two');

            assert.strictEqual(this.service.getActiveTab('a'), 'two');
            assert.strictEqual(received.model.id, 7);
            assert.strictEqual(typeof received.close, 'function');
        });

        test('an async beforeLeave defers the switch until it resolves', async function (assert) {
            let resolveGuard;
            this.service.open({
                id: 'a',
                tabs: [
                    { key: 'one', title: 'One', component: 'c', beforeLeave: () => new Promise((resolve) => (resolveGuard = resolve)) },
                    { key: 'two', title: 'Two', component: 'c' },
                ],
            });

            this.service.setActiveTab('a', 'two');
            assert.strictEqual(this.service.getActiveTab('a'), 'one', 'the tab does not change while the guard is pending');

            resolveGuard(true);
            await Promise.resolve();
            await Promise.resolve();

            assert.strictEqual(this.service.getActiveTab('a'), 'two', 'it switches once the guard resolves truthy');
        });

        test('an async beforeLeave resolving false keeps the current tab', async function (assert) {
            this.service.open({
                id: 'a',
                tabs: [
                    { key: 'one', title: 'One', component: 'c', beforeLeave: () => Promise.resolve(false) },
                    { key: 'two', title: 'Two', component: 'c' },
                ],
            });

            this.service.setActiveTab('a', 'two');
            await Promise.resolve();
            await Promise.resolve();

            assert.strictEqual(this.service.getActiveTab('a'), 'one');
        });

        test('the guard is skipped when re-selecting the already active tab', function (assert) {
            let guardCalls = 0;
            this.service.open({
                id: 'a',
                tabs: [
                    {
                        key: 'one',
                        title: 'One',
                        component: 'c',
                        beforeLeave() {
                            guardCalls++;
                            return false;
                        },
                    },
                    { key: 'two', title: 'Two', component: 'c' },
                ],
            });

            this.service.setActiveTab('a', 'one');

            assert.strictEqual(guardCalls, 0, 'no guard runs when the tab does not change');
            assert.strictEqual(this.service.getActiveTab('a'), 'one');
        });

        test('other overlays keep their own active tab', function (assert) {
            this.service.open(tabbedOverlay({ id: 'a' }));
            this.service.open(tabbedOverlay({ id: 'b' }));

            this.service.setActiveTab('b', 'history');

            assert.strictEqual(this.service.getActiveTab('a'), 'details');
            assert.strictEqual(this.service.getActiveTab('b'), 'history');
        });
    });

    module('bringToFront', function () {
        test('it moves the overlay to the end of the stack', function (assert) {
            this.service.open(contentOverlay({ id: 'a' }));
            this.service.open(contentOverlay({ id: 'b' }));
            this.service.open(contentOverlay({ id: 'c' }));

            this.service.bringToFront('a');

            assert.deepEqual(
                this.service.overlays.map((overlay) => overlay.id),
                ['b', 'c', 'a']
            );
            assert.strictEqual(this.service.getActive().id, 'a');
        });

        test('bringing the front overlay forward is a no-op', function (assert) {
            this.service.open(contentOverlay({ id: 'a' }));
            this.service.open(contentOverlay({ id: 'b' }));
            const before = this.service.overlays;

            this.service.bringToFront('b');

            assert.strictEqual(this.service.overlays, before, 'the array is not even reassigned');
        });

        test('it throws for an unknown id', function (assert) {
            assert.throws(() => this.service.bringToFront('nope'), /Overlay with ID nope not found/);
        });
    });

    module('closeOnTransition', function () {
        test('it subscribes to routeWillChange when requested', function (assert) {
            this.service.open(contentOverlay({ id: 'a', closeOnTransition: true }));

            const subscriptions = this.routerEvents.filter(([kind, event]) => kind === 'on' && event === 'routeWillChange');
            assert.strictEqual(subscriptions.length, 1, 'exactly one listener is attached');
        });

        test('it does not subscribe otherwise', function (assert) {
            this.service.open(contentOverlay({ id: 'a' }));
            this.service.open(contentOverlay({ id: 'b', closeOnTransition: false }));

            assert.strictEqual(this.routerEvents.length, 0);
        });

        test('firing the handler closes the overlay and detaches the listener', async function (assert) {
            this.service.open(contentOverlay({ id: 'a', closeOnTransition: true }));
            const [, , handler] = this.routerEvents[0];

            handler();
            await Promise.resolve();

            assert.false(this.service.isOpen('a'), 'the overlay closed on transition');
            assert.true(
                this.routerEvents.some(([kind, , fn]) => kind === 'off' && fn === handler),
                'the same handler is detached'
            );
        });

        test('closing normally detaches the transition listener', async function (assert) {
            this.service.open(contentOverlay({ id: 'a', closeOnTransition: true }));
            const [, , handler] = this.routerEvents[0];

            await this.service.close('a');

            assert.deepEqual(
                this.routerEvents.filter(([kind]) => kind === 'off').map(([, , fn]) => fn),
                [handler],
                'the listener is unregistered exactly once'
            );
        });
    });

    module('routeSync', function () {
        test('opening a synced overlay writes the panel id to query params', function (assert) {
            this.service.open(contentOverlay({ id: 'a', routeSync: true }));

            assert.deepEqual(this.transitions, [{ queryParams: { panel_id: 'a' } }]);
        });

        test('opening a synced tabbed overlay includes the active tab', function (assert) {
            this.service.open(tabbedOverlay({ id: 'a', routeSync: true }));

            assert.deepEqual(this.transitions, [{ queryParams: { panel_id: 'a', panel_tab: 'details' } }]);
        });

        test('switching tabs on a synced overlay updates the query params', function (assert) {
            this.service.open(tabbedOverlay({ id: 'a', routeSync: true }));
            this.transitions.length = 0;

            this.service.setActiveTab('a', 'history');

            assert.deepEqual(this.transitions, [{ queryParams: { panel_id: 'a', panel_tab: 'history' } }]);
        });

        test('closing a synced overlay clears the query params', async function (assert) {
            this.service.open(contentOverlay({ id: 'a', routeSync: true }));
            this.transitions.length = 0;

            await this.service.close('a');

            assert.deepEqual(this.transitions, [{ queryParams: { panel_id: null, panel_tab: null } }]);
        });

        test('an unsynced overlay never touches the router', async function (assert) {
            this.service.open(tabbedOverlay({ id: 'a' }));
            this.service.setActiveTab('a', 'history');
            await this.service.close('a');

            assert.deepEqual(this.transitions, [], 'no transitions are attempted');
        });
    });

    test('the service survives a full open/close/reopen cycle', async function (assert) {
        const id = this.service.open(tabbedOverlay());

        this.service.setActiveTab(id, 'history');
        await this.service.close(id);

        assert.deepEqual(this.service.overlays, []);
        assert.deepEqual(this.service.activeTabs, {});

        const second = this.service.open(tabbedOverlay());

        assert.notStrictEqual(second, id, 'a fresh id is generated');
        assert.strictEqual(this.service.getActiveTab(second), 'details', 'tab state is rebuilt from scratch');
        assert.strictEqual(this.service.overlays.length, 1);
    });

    module('route synchronisation', function () {
        test('opening a route-synced overlay writes its id to the query params', function (assert) {
            const id = this.service.open(contentOverlay({ id: 'panel-1', routeSync: true }));

            assert.strictEqual(id, 'panel-1');
            assert.deepEqual(this.transitions, [{ queryParams: { panel_id: 'panel-1' } }], 'only the id is synced for a content overlay');
        });

        test('a route-synced tabbed overlay also writes its active tab', function (assert) {
            this.service.open(tabbedOverlay({ id: 'panel-2', routeSync: true }));

            assert.deepEqual(this.transitions, [{ queryParams: { panel_id: 'panel-2', panel_tab: 'details' } }]);
        });

        test('a route-synced overlay opened on a named initial tab syncs that tab', function (assert) {
            this.service.open(tabbedOverlay({ id: 'panel-3', routeSync: true, initialTab: 'history' }));

            assert.deepEqual(this.transitions, [{ queryParams: { panel_id: 'panel-3', panel_tab: 'history' } }]);
        });

        test('updating a route-synced overlay re-syncs it', function (assert) {
            this.service.open(contentOverlay({ id: 'panel-4', routeSync: true }));
            this.transitions.length = 0;

            this.service.update('panel-4', { title: 'Renamed' });

            assert.deepEqual(this.transitions, [{ queryParams: { panel_id: 'panel-4' } }]);
            assert.strictEqual(this.service.getById('panel-4').title, 'Renamed');
        });

        test('updating an overlay that is not route-synced transitions nothing', function (assert) {
            this.service.open(contentOverlay({ id: 'panel-5' }));

            this.service.update('panel-5', { title: 'Renamed' });

            assert.deepEqual(this.transitions, []);
        });

        test('changing tab on a route-synced overlay syncs the new tab', function (assert) {
            this.service.open(tabbedOverlay({ id: 'panel-6', routeSync: true }));
            this.transitions.length = 0;

            this.service.setActiveTab('panel-6', 'history');

            assert.deepEqual(this.transitions, [{ queryParams: { panel_id: 'panel-6', panel_tab: 'history' } }]);
            assert.strictEqual(this.service.getActiveTab('panel-6'), 'history');
        });

        test('changing tab on an unsynced overlay transitions nothing', function (assert) {
            this.service.open(tabbedOverlay({ id: 'panel-7' }));

            this.service.setActiveTab('panel-7', 'history');

            assert.deepEqual(this.transitions, []);
            assert.strictEqual(this.service.getActiveTab('panel-7'), 'history');
        });

        test('closing a route-synced overlay clears both query params', async function (assert) {
            this.service.open(contentOverlay({ id: 'panel-8', routeSync: true }));
            this.transitions.length = 0;

            await this.service.close('panel-8');

            assert.deepEqual(this.transitions, [{ queryParams: { panel_id: null, panel_tab: null } }]);
        });

        test('closing an unsynced overlay clears nothing', async function (assert) {
            this.service.open(contentOverlay({ id: 'panel-9' }));

            await this.service.close('panel-9');

            assert.deepEqual(this.transitions, []);
        });
    });

    module('asynchronous hooks', function () {
        test('close waits for a promise-returning onClose before removing the overlay', async function (assert) {
            const order = [];
            let release;
            const gate = new Promise((resolve) => {
                release = resolve;
            });

            this.service.open(
                contentOverlay({
                    id: 'panel-async',
                    onClose: () => {
                        order.push('onClose');
                        return gate;
                    },
                })
            );

            const closing = this.service.close('panel-async');

            assert.deepEqual(order, ['onClose'], 'the hook has been called');
            assert.strictEqual(this.service.overlays.length, 1, 'but the overlay is still open while the hook is pending');

            release();
            await closing;

            assert.deepEqual(this.service.overlays, [], 'it is removed once the hook settles');
        });

        test('onClose receives the model and a working close callback', async function (assert) {
            const received = [];
            const model = { id: 'ord_1' };

            this.service.open(contentOverlay({ id: 'panel-hook', model, onClose: (context) => received.push(context) }));

            await this.service.close('panel-hook');

            assert.strictEqual(received.length, 1);
            assert.strictEqual(received[0].model, model);
            assert.strictEqual(typeof received[0].close, 'function');
        });

        test('an async beforeLeave guard switches the tab once it resolves true', async function (assert) {
            let release;
            const gate = new Promise((resolve) => {
                release = resolve;
            });

            this.service.open({
                id: 'panel-guard',
                tabs: [
                    { key: 'details', title: 'Details', component: 'panel/details', beforeLeave: () => gate },
                    { key: 'history', title: 'History', component: 'panel/history' },
                ],
            });

            this.service.setActiveTab('panel-guard', 'history');
            assert.strictEqual(this.service.getActiveTab('panel-guard'), 'details', 'the tab does not change while the guard is pending');

            release(true);
            await gate;

            assert.strictEqual(this.service.getActiveTab('panel-guard'), 'history', 'it changes once the guard allows it');
        });

        test('an async beforeLeave guard resolving false keeps the current tab', async function (assert) {
            this.service.open({
                id: 'panel-blocked',
                tabs: [
                    { key: 'details', title: 'Details', component: 'panel/details', beforeLeave: () => Promise.resolve(false) },
                    { key: 'history', title: 'History', component: 'panel/history' },
                ],
            });

            this.service.setActiveTab('panel-blocked', 'history');
            await Promise.resolve();
            await Promise.resolve();

            assert.strictEqual(this.service.getActiveTab('panel-blocked'), 'details', 'the guard refused the change');
        });

        test('an async guard on a route-synced overlay syncs only after it resolves', async function (assert) {
            let release;
            const gate = new Promise((resolve) => {
                release = resolve;
            });

            this.service.open({
                id: 'panel-guard-sync',
                routeSync: true,
                tabs: [
                    { key: 'details', title: 'Details', component: 'panel/details', beforeLeave: () => gate },
                    { key: 'history', title: 'History', component: 'panel/history' },
                ],
            });
            this.transitions.length = 0;

            this.service.setActiveTab('panel-guard-sync', 'history');
            assert.deepEqual(this.transitions, [], 'nothing is synced while the guard is pending');

            release(true);
            await gate;

            assert.deepEqual(this.transitions, [{ queryParams: { panel_id: 'panel-guard-sync', panel_tab: 'history' } }]);
        });
    });
    // The route-sync helpers all begin `if (!this.router) return;`. That guard exists for hosts
    // that never inject a router, and every test so far has had one.
    module('with no router injected', function (hooks) {
        hooks.beforeEach(function () {
            this.service = this.owner.lookup('service:resource-context-panel');
            this.service.router = null;
        });

        test('opening a route-synced overlay still records it and reports no transition', function (assert) {
            const id = this.service.open(contentOverlay({ id: 'panel-1', title: 'Details', routeSync: true }));

            assert.strictEqual(id, 'panel-1', 'the overlay is opened');
            assert.strictEqual(this.service.overlays.length, 1);
            assert.deepEqual(this.transitions, [], 'nothing is pushed into the URL');
        });

        test('setting the active tab still records it', function (assert) {
            const id = this.service.open(tabbedOverlay({ id: 'panel-2', routeSync: true }));

            this.service.setActiveTab(id, 'history');

            assert.strictEqual(this.service.getActiveTab(id), 'history');
            assert.deepEqual(this.transitions, []);
        });

        test('closing still removes the overlay', async function (assert) {
            const id = this.service.open(contentOverlay({ id: 'panel-3', routeSync: true }));

            await this.service.close(id);

            assert.strictEqual(this.service.overlays.length, 0);
            assert.deepEqual(this.transitions, []);
        });
    });
    // Both hooks are handed a `close` callback so they can dismiss the overlay themselves; neither
    // callback had ever been invoked.
    module('the close callback handed to the lifecycle hooks', function () {
        test('onClose receives one that closes the overlay it belongs to', async function (assert) {
            const service = this.owner.lookup('service:resource-context-panel');
            let handed;

            const id = service.open(
                contentOverlay({
                    id: 'panel-close',
                    onClose: ({ close }) => {
                        handed = close;
                    },
                })
            );

            await service.close(id);

            assert.strictEqual(typeof handed, 'function', 'the hook is given a close callback');
            assert.strictEqual(service.overlays.length, 0, 'the overlay is already gone');

            handed();

            assert.strictEqual(service.overlays.length, 0, 'calling it again is harmless');
        });

        test('a tab beforeLeave guard receives one that closes the overlay', function (assert) {
            const service = this.owner.lookup('service:resource-context-panel');
            let handed;

            const id = service.open({
                id: 'panel-tabs',
                tabs: [
                    {
                        key: 'details',
                        title: 'Details',
                        component: 'panel/details',
                        beforeLeave: ({ close }) => {
                            handed = close;
                            return true;
                        },
                    },
                    { key: 'history', title: 'History', component: 'panel/history' },
                ],
            });

            service.setActiveTab(id, 'history');

            assert.strictEqual(typeof handed, 'function', 'the guard is given a close callback');
            assert.strictEqual(service.getActiveTab(id), 'history', 'and the tab change went ahead');

            handed();

            assert.strictEqual(service.overlays.length, 0, 'invoking it dismisses the overlay');
        });
    });
});
