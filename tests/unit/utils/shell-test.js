import { module, test } from 'qunit';
import {
    optionalService,
    hasMethod,
    routeTarget,
    activateItem,
    isRouteActive,
    modifierKeyLabel,
    hasCommandModifier,
    isTypingTarget,
    normalizeTone,
    dockEntry,
    modulePages,
    filterGroups,
    moveFocus,
    initials,
} from '@fleetbase/ember-ui/utils/shell';

function routerStub(currentRouteName) {
    return {
        currentRouteName,
        transitions: [],
        transitionTo(...args) {
            this.transitions.push(args);
            return 'transitioned';
        },
    };
}

module('Unit | Utility | shell', function () {
    test('optionalService returns the service, or null when it is not registered', function (assert) {
        const owner = { lookup: (name) => (name === 'service:dock' ? 'dock' : undefined) };

        assert.strictEqual(optionalService(owner, 'dock'), 'dock');
        assert.strictEqual(optionalService(owner, 'context-bar'), null);
    });

    test('hasMethod', function (assert) {
        assert.true(hasMethod({ run() {} }, 'run'));
        assert.false(hasMethod({ run: 1 }, 'run'));
        assert.false(hasMethod(null, 'run'));
    });

    module('routeTarget', function () {
        test('the shell shape: route, models and query', function (assert) {
            assert.deepEqual(routeTarget({ route: 'console.fleet-ops.orders', models: [1], query: { page: 2 } }), {
                route: 'console.fleet-ops.orders',
                models: [1],
                queryParams: { page: 2 },
            });
        });

        test('ember-core menu items: routeParams and queryParams', function (assert) {
            assert.deepEqual(routeTarget({ route: 'a.b', routeParams: ['x'], queryParams: { q: 1 } }), { route: 'a.b', models: ['x'], queryParams: { q: 1 } });
        });

        test('virtual routes take the slug as their model, and the view as a query param', function (assert) {
            assert.deepEqual(routeTarget({ route: 'console.virtual', slug: 'drivers', view: 'map', routeParams: [] }), {
                route: 'console.virtual',
                models: ['drivers'],
                queryParams: { view: 'map' },
            });
        });

        test('a slug on an ordinary route is not a model', function (assert) {
            assert.deepEqual(routeTarget({ route: 'console.home', slug: 'home' }), { route: 'console.home', models: [], queryParams: {} });
        });
    });

    module('activateItem', function () {
        test('an action wins over everything else', function (assert) {
            const item = { action: (received) => received, onClick: () => 'click', route: 'x' };
            assert.strictEqual(activateItem(routerStub(), item), item);
        });

        test('then onClick', function (assert) {
            assert.strictEqual(activateItem(routerStub(), { onClick: () => 'click', route: 'x' }), 'click');
        });

        test('then a transition to the route', function (assert) {
            const router = routerStub();
            assert.strictEqual(activateItem(router, { route: 'a.b', models: [1, 2], query: { z: 1 } }), 'transitioned');
            assert.deepEqual(router.transitions, [['a.b', 1, 2, { queryParams: { z: 1 } }]]);
        });

        test('an item with none does nothing', function (assert) {
            const router = routerStub();
            assert.strictEqual(activateItem(router, { label: 'Plain' }), undefined);
            assert.deepEqual(router.transitions, []);
        });
    });

    test('isRouteActive matches the route and its children', function (assert) {
        assert.true(isRouteActive(routerStub('console.fleet-ops.orders'), 'console.fleet-ops'));
        assert.false(isRouteActive(routerStub('console.ledger'), 'console.fleet-ops'));
        assert.false(isRouteActive(routerStub('console.fleet-ops'), undefined), 'no route is never active');
        assert.false(isRouteActive(routerStub(null), 'console'), 'a router that has not routed yet');
    });

    test('modifierKeyLabel', function (assert) {
        assert.strictEqual(modifierKeyLabel('MacIntel'), '⌘');
        assert.strictEqual(modifierKeyLabel('iPhone'), '⌘');
        assert.strictEqual(modifierKeyLabel('Win32'), 'Ctrl ');
        assert.strictEqual(modifierKeyLabel(), modifierKeyLabel(window.navigator.platform), 'defaults to the browser platform');
    });

    test('hasCommandModifier', function (assert) {
        assert.true(hasCommandModifier({ metaKey: true, ctrlKey: false }));
        assert.true(hasCommandModifier({ metaKey: false, ctrlKey: true }));
        assert.false(hasCommandModifier({ metaKey: false, ctrlKey: false }));
    });

    test('isTypingTarget', function (assert) {
        assert.true(isTypingTarget(document.createElement('input')));
        assert.true(isTypingTarget(document.createElement('textarea')));
        assert.true(isTypingTarget({ tagName: 'DIV', isContentEditable: true }));
        assert.false(isTypingTarget(document.createElement('button')));
        assert.false(isTypingTarget(null));
        assert.false(isTypingTarget({}));
    });

    test('normalizeTone keeps known tones and maps anything else to info', function (assert) {
        assert.deepEqual(['info', 'warn', 'ok', 'error', 'menu'].map(normalizeTone), ['info', 'warn', 'ok', 'error', 'menu']);
        assert.strictEqual(normalizeTone('loud'), 'info');
        assert.strictEqual(normalizeTone(undefined), 'info');
    });

    module('dockEntry', function () {
        test('an item with every dock field', function (assert) {
            const item = {
                id: 'fleet-ops',
                title: 'Fleet-Ops',
                icon: 'route',
                iconPrefix: 'fas',
                color: '#3b82f6',
                status: { tone: 'warn', text: '2 stale GPS' },
                badge: 2,
                shortcut: '⌘F',
                group: 'Operations',
                route: 'console.fleet-ops',
            };
            const entry = dockEntry(item, 0, { lockedIds: ['fleet-ops'], modifierKey: '⌘' });

            assert.strictEqual(entry.item, item);
            assert.deepEqual(
                { ...entry, item: undefined },
                {
                    item: undefined,
                    id: 'fleet-ops',
                    title: 'Fleet-Ops',
                    icon: 'route',
                    iconPrefix: 'fas',
                    iconComponent: undefined,
                    iconComponentOptions: undefined,
                    color: '#3b82f6',
                    status: { tone: 'warn', text: '2 stale GPS' },
                    badge: '2',
                    shortcut: '⌘F',
                    keyShortcuts: 'Meta+1 Control+1',
                    group: 'Operations',
                    route: 'console.fleet-ops',
                    locked: true,
                    label: 'Fleet-Ops, 2 stale GPS',
                }
            );
        });

        test('an item registered before the dock fields existed', function (assert) {
            const entry = dockEntry({ id: 'iam', title: 'IAM', route: 'console.iam' }, 2, { modifierKey: 'Ctrl ' });

            assert.strictEqual(entry.icon, 'circle-dot');
            assert.strictEqual(entry.color, null);
            assert.strictEqual(entry.status, null);
            assert.strictEqual(entry.badge, null);
            assert.strictEqual(entry.group, null);
            assert.strictEqual(entry.shortcut, 'Ctrl 3', 'the shortcut follows dock order');
            assert.false(entry.locked);
            assert.strictEqual(entry.label, 'IAM');
        });

        test('an unknown status tone becomes info and a null badge stays empty', function (assert) {
            const entry = dockEntry({ id: 'x', title: 'X', status: { tone: 'shouty', text: 'Hi' }, badge: null }, 0);
            assert.deepEqual(entry.status, { tone: 'info', text: 'Hi' });
            assert.strictEqual(entry.badge, null);
            assert.strictEqual(entry.shortcut, `${modifierKeyLabel()}1`, 'the modifier defaults to the platform');
        });

        test('only the first nine modules get a shortcut', function (assert) {
            assert.strictEqual(dockEntry({ id: 'x', title: 'X' }, 8, { modifierKey: '⌘' }).shortcut, '⌘9');
            assert.strictEqual(dockEntry({ id: 'x', title: 'X' }, 9, { modifierKey: '⌘' }).shortcut, null);
            assert.strictEqual(dockEntry({ id: 'x', title: 'X' }, 8).keyShortcuts, 'Meta+9 Control+9');
            assert.strictEqual(dockEntry({ id: 'x', title: 'X' }, 9).keyShortcuts, null);
        });
    });

    module('modulePages', function () {
        test('menu panels become titled groups, loose items an untitled one', function (assert) {
            const universe = {
                menuService: {
                    getMenuPanels(registry) {
                        assert.strictEqual(registry, 'engine:fleet-ops');
                        return [{ title: 'Operations', items: [{ title: 'Orders' }] }, { items: undefined }];
                    },
                    getMenuItems() {
                        return [{ title: 'Orders', _isPanelItem: true }, { title: 'Settings' }];
                    },
                },
            };

            assert.deepEqual(modulePages(universe, 'fleet-ops'), [
                { title: 'Operations', items: [{ title: 'Orders' }] },
                { title: null, items: [] },
                { title: null, items: [{ title: 'Settings' }] },
            ]);
        });

        test('a module with nothing registered, or no menu service at all', function (assert) {
            const empty = { menuService: { getMenuPanels: () => null, getMenuItems: () => null } };
            assert.deepEqual(modulePages(empty, 'x'), []);
            assert.deepEqual(modulePages({ menuService: { getMenuItems: () => [] } }, 'x'), []);
            assert.deepEqual(modulePages({}, 'x'), []);
            assert.deepEqual(modulePages(null, 'x'), []);
        });
    });

    test('filterGroups', function (assert) {
        const groups = [
            { title: 'A', items: [{ title: 'Orders' }, { title: 'Drivers' }] },
            { title: 'B', items: [{ title: 'Vehicles' }] },
        ];

        assert.strictEqual(filterGroups(groups, ''), groups, 'an empty query changes nothing');
        assert.strictEqual(filterGroups(groups, undefined), groups);
        assert.deepEqual(filterGroups(groups, ' ORD '), [{ title: 'A', items: [{ title: 'Orders' }] }], 'case-insensitive, trimmed, empty groups dropped');
    });

    module('moveFocus', function (hooks) {
        hooks.beforeEach(function () {
            this.root = document.createElement('div');
            this.root.innerHTML = '<button>a</button><button>b</button><button>c</button>';
            document.getElementById('ember-testing').appendChild(this.root);
            this.buttons = this.root.querySelectorAll('button');
        });

        hooks.afterEach(function () {
            this.root.remove();
        });

        test('from nothing focused it starts at the first or the last', function (assert) {
            assert.strictEqual(moveFocus(this.buttons, 1).textContent, 'a');
            document.activeElement.blur();
            assert.strictEqual(moveFocus(this.buttons, -1).textContent, 'c');
        });

        test('it steps and wraps', function (assert) {
            this.buttons[2].focus();
            assert.strictEqual(moveFocus(this.buttons, 1).textContent, 'a');
            assert.strictEqual(moveFocus(this.buttons, -1).textContent, 'c');
            assert.strictEqual(moveFocus(this.buttons, -1).textContent, 'b');
        });

        test('Infinity jumps to the ends', function (assert) {
            assert.strictEqual(moveFocus(this.buttons, Infinity).textContent, 'c');
            assert.strictEqual(moveFocus(this.buttons, -Infinity).textContent, 'a');
        });

        test('nothing to focus', function (assert) {
            assert.strictEqual(moveFocus([], 1), null);
        });
    });

    test('initials', function (assert) {
        assert.strictEqual(initials('Ronald  Richardson Jr'), 'RR');
        assert.strictEqual(initials('fleetbase'), 'F');
        assert.strictEqual(initials(''), '');
        assert.strictEqual(initials(undefined), '');
    });
});
