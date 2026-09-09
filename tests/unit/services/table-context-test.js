import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import TableContextService from '@fleetbase/ember-ui/services/table-context';

// @fleetbase/ember-core ships its own `app/services/table-context.js`, which
// shadows this addon's re-export — `owner.lookup('service:table-context')`
// resolves to ember-core's older, non-null-safe copy. Register this addon's
// class under its own name so these tests exercise (and cover) our source.
module('Unit | Service | table-context', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:ui-table-context', TableContextService);
        this.service = this.owner.lookup('service:ui-table-context');
    });

    test('it starts with no node and no table', function (assert) {
        assert.strictEqual(this.service.node, undefined);
        assert.strictEqual(this.service.table, undefined);
    });

    test('getSelectedIds returns an empty array when no table is registered', function (assert) {
        assert.deepEqual(this.service.getSelectedIds(), [], 'a missing table is not an error');
    });

    test('getSelectedRows returns an empty array when no table is registered', function (assert) {
        assert.deepEqual(this.service.getSelectedRows(), []);
    });

    test('untoggleSelectAll is a no-op when no table is registered', function (assert) {
        assert.strictEqual(this.service.untoggleSelectAll(), undefined);
    });

    test('getSelectedIds maps the ids of the selected rows', function (assert) {
        this.service.table = { selectedRows: [{ id: 'a' }, { id: 'b' }] };

        assert.deepEqual(this.service.getSelectedIds(), ['a', 'b']);
    });

    test('getSelectedIds returns an empty array when the table has no selectedRows', function (assert) {
        this.service.table = {};

        assert.deepEqual(this.service.getSelectedIds(), []);
    });

    test('getSelectedIds preserves undefined ids rather than dropping rows', function (assert) {
        this.service.table = { selectedRows: [{ id: 'a' }, {}] };

        assert.deepEqual(this.service.getSelectedIds(), ['a', undefined], 'the mapping is 1:1 with the rows');
    });

    test('getSelectedRows returns the live selection', function (assert) {
        const selectedRows = [{ id: 'a' }];
        this.service.table = { selectedRows };

        assert.strictEqual(this.service.getSelectedRows(), selectedRows, 'the same array instance is handed back');
    });

    test('getSelectedRows falls back to an empty array when selectedRows is absent', function (assert) {
        this.service.table = {};

        assert.deepEqual(this.service.getSelectedRows(), []);
    });

    test('untoggleSelectAll delegates to the registered table', function (assert) {
        let calls = 0;
        this.service.table = { untoggleSelectAll: () => ++calls };

        const result = this.service.untoggleSelectAll();

        assert.strictEqual(calls, 1, 'the table method is invoked');
        assert.strictEqual(result, 1, 'its return value is passed through');
    });

    test('untoggleSelectAll is safe when the table does not implement it', function (assert) {
        this.service.table = {};

        assert.strictEqual(this.service.untoggleSelectAll(), undefined);
    });

    test('node and table are tracked and can be reassigned', function (assert) {
        const node = document.createElement('table');
        this.service.node = node;
        this.service.table = { selectedRows: [{ id: 'x' }] };

        assert.strictEqual(this.service.node, node);
        assert.deepEqual(this.service.getSelectedIds(), ['x']);

        this.service.table = { selectedRows: [] };
        assert.deepEqual(this.service.getSelectedIds(), [], 'replacing the table replaces the selection');
    });

    test('the service is a singleton within one owner', function (assert) {
        assert.strictEqual(this.owner.lookup('service:ui-table-context'), this.service);
    });
});
