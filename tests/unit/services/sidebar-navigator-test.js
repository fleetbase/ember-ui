import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import Service from '@ember/service';

class AbilitiesStub extends Service {
    denied = new Set();
    throwFor = new Set();

    can(permission) {
        if (this.throwFor.has(permission)) {
            throw new Error(`Permission check failed for ${permission}`);
        }

        return !this.denied.has(permission);
    }
}

module('Unit | Service | sidebar-navigator', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:abilities', AbilitiesStub);
        this.service = this.owner.lookup('service:sidebar-navigator');
    });

    // Every method takes defaulted parameters. A component test always supplies them; calling the
    // service directly with no arguments at all is the only way those defaults run.
    module('called with no arguments at all', function () {
        test('every entry point answers safely', function (assert) {
            assert.deepEqual(this.service.normalizeItems(), [], 'normalizeItems');
            assert.true(this.service.isVisible(), 'isVisible treats a missing item as visible');
            assert.false(this.service.hasVisibleTarget(), 'hasVisibleTarget');
            assert.true(this.service.hasRequiredVisibleChildren(), 'hasRequiredVisibleChildren');
            assert.deepEqual(this.service.flattenItems(), [], 'flattenItems');
            assert.deepEqual(this.service.searchItems(), [], 'searchItems');
            assert.deepEqual(this.service.normalizeSearchResults(), [], 'normalizeSearchResults');
            assert.deepEqual(this.service.activePath(), [], 'activePath');
            assert.false(this.service.isActive(), 'isActive');
            assert.strictEqual(this.service.breadcrumb(), '', 'breadcrumb');
        });
    });

    module('normalizeItems', function () {
        test('anything that is not an array is normalised to an empty one', function (assert) {
            assert.deepEqual(this.service.normalizeItems('not an array'), []);
            assert.deepEqual(this.service.normalizeItems(null), []);
            assert.deepEqual(this.service.normalizeItems({ label: 'Orders' }), []);
        });

        test('an item with no navigable target is dropped', function (assert) {
            const items = this.service.normalizeItems([{ label: 'Orders', route: 'console.orders' }, { label: 'Nowhere' }]);

            assert.deepEqual(
                items.map((item) => item.label),
                ['Orders']
            );
        });

        test('a url, an onClick or children each count as a target', function (assert) {
            const items = this.service.normalizeItems([
                { label: 'Docs', url: 'https://example.test' },
                { label: 'Invite', onClick() {} },
                { label: 'Settings', children: [{ label: 'General', route: 'console.settings' }] },
            ]);

            assert.deepEqual(
                items.map((item) => item.label),
                ['Docs', 'Invite', 'Settings']
            );
        });

        test('children are normalised recursively', function (assert) {
            const [settings] = this.service.normalizeItems([
                {
                    label: 'Settings',
                    children: [{ label: 'General', route: 'console.settings' }, { label: 'Nowhere' }],
                },
            ]);

            assert.deepEqual(
                settings.children.map((child) => child.label),
                ['General'],
                'the targetless child is dropped too'
            );
        });

        test('an item marked not visible is dropped', function (assert) {
            const items = this.service.normalizeItems([{ label: 'Orders', route: 'console.orders', visible: false }]);

            assert.deepEqual(items, []);
        });

        test('requiresVisibleChildren keeps a branch only when it has a non-hub child', function (assert) {
            const items = this.service.normalizeItems([
                {
                    label: 'Hub only',
                    requiresVisibleChildren: true,
                    children: [{ label: 'Hub', isNavigationHub: true, route: 'console.hub' }],
                },
                {
                    label: 'Has content',
                    requiresVisibleChildren: true,
                    children: [
                        { label: 'Hub', isNavigationHub: true, route: 'console.hub' },
                        { label: 'Orders', route: 'console.orders' },
                    ],
                },
            ]);

            assert.deepEqual(
                items.map((item) => item.label),
                ['Has content']
            );
        });
    });

    module('permissions', function () {
        test('a denied visiblePermission hides the item', function (assert) {
            const abilities = this.owner.lookup('service:abilities');
            abilities.denied.add('see orders');

            assert.false(this.service.isVisible({ label: 'Orders', visiblePermission: 'see orders' }));
            assert.true(this.service.isVisible({ label: 'Orders', visiblePermission: 'see drivers' }));
        });

        test('an explicit permission decides visibility on its own', function (assert) {
            const abilities = this.owner.lookup('service:abilities');
            abilities.denied.add('list orders');

            assert.false(this.service.isVisible({ label: 'Orders', permission: 'list orders' }));
            assert.true(this.service.isVisible({ label: 'Orders', permission: 'list drivers' }));
        });

        test('a permission check that throws fails closed', function (assert) {
            const abilities = this.owner.lookup('service:abilities');
            abilities.throwFor.add('list orders');

            assert.false(this.service.can('list orders'), 'the error is swallowed as a refusal');
            assert.false(this.service.isVisible({ label: 'Orders', permission: 'list orders' }));
        });
    });

    module('searchItems', function () {
        const ITEMS = [
            {
                label: 'Settings',
                children: [{ label: 'Service Rates', description: 'Pricing rules', keywords: ['pricing'] }],
            },
            { title: 'Reports', url: '/reports' },
        ];

        test('a blank query matches nothing rather than everything', function (assert) {
            assert.deepEqual(this.service.searchItems(ITEMS, ''), [], 'an empty query');
            assert.deepEqual(this.service.searchItems(ITEMS, '   '), [], 'and whitespace alone');
        });

        test('it matches a label, a title, a description, a url and a keyword', function (assert) {
            const labelsFor = (query) => this.service.searchItems(ITEMS, query).map(({ item }) => item.label ?? item.title);

            assert.deepEqual(labelsFor('service'), ['Service Rates'], 'by label');
            assert.deepEqual(labelsFor('reports'), ['Reports'], 'by title');
            assert.deepEqual(labelsFor('pricing rules'), ['Service Rates'], 'by description');
            assert.deepEqual(labelsFor('/reports'), ['Reports'], 'by url');
            assert.deepEqual(labelsFor('pricing'), ['Service Rates'], 'by keyword');
        });

        test('a child is found through its ancestor label', function (assert) {
            const found = this.service.searchItems(ITEMS, 'settings').map(({ item }) => item.label);

            assert.true(found.includes('Service Rates'), 'the parent name reaches its children');
        });

        test('each result carries the path that leads to it', function (assert) {
            const [result] = this.service.searchItems(ITEMS, 'service rates');

            assert.deepEqual(
                result.path.map((item) => item.label),
                ['Settings', 'Service Rates']
            );
        });
    });

    module('normalizeSearchResults', function () {
        test('anything that is not an array becomes an empty one', function (assert) {
            assert.deepEqual(this.service.normalizeSearchResults('nope'), []);
            assert.deepEqual(this.service.normalizeSearchResults(null), []);
        });

        test('empty entries are dropped', function (assert) {
            const results = this.service.normalizeSearchResults([null, undefined, { label: 'Kept' }]);

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].label, 'Kept');
        });

        test('a bare result becomes its own item and falls back to its title', function (assert) {
            const [result] = this.service.normalizeSearchResults([{ title: 'Tyler Demo' }]);

            assert.strictEqual(result.label, 'Tyler Demo', 'the title stands in for a missing label');
            assert.deepEqual(result.item, { title: 'Tyler Demo' }, 'and the result is its own item');
            assert.strictEqual(result.type, 'Result', 'with a default type');
        });

        test('an explicit item, label and type are all kept', function (assert) {
            const item = { id: 'user_1' };
            const [result] = this.service.normalizeSearchResults([{ item, label: 'Ada', type: 'User', breadcrumb: 'People > Ada' }]);

            assert.strictEqual(result.item, item);
            assert.strictEqual(result.label, 'Ada');
            assert.strictEqual(result.type, 'User', 'a supplied type overrides the default');
            assert.strictEqual(result.breadcrumb, 'People > Ada');
        });
    });

    module('isActive and activePath', function () {
        test('a route matches by prefix', function (assert) {
            assert.true(this.service.isActive({ route: 'console.orders' }, 'console.orders.index'));
            assert.false(this.service.isActive({ route: 'console.orders' }, 'console.drivers.index'));
            assert.false(this.service.isActive({ route: 'console.orders' }, undefined), 'with no current route, nothing is active');
        });

        test('a url matches exactly', function (assert) {
            assert.true(this.service.isActive({ url: '/reports' }, undefined, '/reports'));
            assert.false(this.service.isActive({ url: '/reports' }, undefined, '/reports/daily'), 'a url is not a prefix match');
        });

        test('an activeWhen predicate wins when it returns true', function (assert) {
            const item = { route: 'console.orders', activeWhen: () => true };

            assert.true(this.service.isActive(item, 'somewhere.else'), 'the predicate decides');
        });

        test('a predicate returning false falls through to the route match', function (assert) {
            const item = { route: 'console.orders', activeWhen: () => false };

            assert.true(this.service.isActive(item, 'console.orders.index'), 'the route still matches');
            assert.false(this.service.isActive(item, 'console.drivers.index'), 'and still fails when it should');
        });

        test('a predicate that throws falls through rather than failing', function (assert) {
            const item = {
                route: 'console.orders',
                activeWhen: () => {
                    throw new Error('the host application blew up deciding');
                },
            };

            assert.true(this.service.isActive(item, 'console.orders.index'), 'the route match takes over');
        });

        test('activePath returns the trail down to the active descendant', function (assert) {
            const items = [
                { label: 'Orders', route: 'console.orders' },
                {
                    label: 'Settings',
                    children: [{ label: 'General', route: 'console.settings.general' }],
                },
            ];

            const path = this.service.activePath(items, 'console.settings.general.index');

            assert.deepEqual(
                path.map((item) => item.label),
                ['Settings', 'General']
            );
        });

        test('activePath is empty when nothing matches', function (assert) {
            const items = [{ label: 'Orders', route: 'console.orders' }];

            assert.deepEqual(this.service.activePath(items, 'console.drivers.index'), []);
        });
    });

    module('flattenItems and breadcrumb', function () {
        test('an item with no children flattens to itself', function (assert) {
            const flattened = this.service.flattenItems([{ label: 'Orders' }]);

            assert.strictEqual(flattened.length, 1);
            assert.deepEqual(
                flattened[0].path.map((item) => item.label),
                ['Orders']
            );
        });

        test('a breadcrumb joins the labels, falling back to titles and skipping blanks', function (assert) {
            const path = [{ label: 'Settings' }, { title: 'Service Rates' }, { icon: 'gear' }];

            assert.strictEqual(this.service.breadcrumb(path), 'Settings > Service Rates');
        });
    });
});
