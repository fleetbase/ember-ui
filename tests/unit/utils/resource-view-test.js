import { module, test } from 'qunit';
import lookupResourceView, { mergeHeaderButtons } from '@fleetbase/ember-ui/utils/resource-view';
import { ResourceViewStub } from 'dummy/tests/helpers/resource-view-stubs';

module('Unit | Utility | resource-view', function () {
    test('lookupResourceView returns the service, or null when there is none', function (assert) {
        const service = {};
        assert.strictEqual(lookupResourceView({ lookup: () => service }), service);
        assert.strictEqual(lookupResourceView({ lookup: () => undefined }), null);
        assert.strictEqual(lookupResourceView(null), null);
        assert.strictEqual(
            lookupResourceView({
                lookup() {
                    throw new Error('module missing');
                },
            }),
            null,
            'a lookup that throws is treated as no service'
        );
    });

    test('mergeHeaderButtons leaves the buttons alone without a service or registry', function (assert) {
        const buttons = [{ id: 'edit' }];
        assert.strictEqual(mergeHeaderButtons(null, 'ledger:invoice:details', buttons), buttons);
        assert.strictEqual(mergeHeaderButtons(new ResourceViewStub(), null, buttons), buttons);
        assert.deepEqual(mergeHeaderButtons(null, null, undefined), []);
    });

    test('mergeHeaderButtons merges actions, and menu items only when asked', function (assert) {
        const views = new ResourceViewStub();
        views.add('ledger:invoice:details:actions', { id: 'print' });
        views.add('ledger:invoice:details:menu', { id: 'acme' });

        assert.deepEqual(
            mergeHeaderButtons(views, 'ledger:invoice:details', [{ id: 'edit' }]).map((b) => b.id),
            ['edit', 'print'],
            'table toolbars take no menu'
        );

        const dropdown = { id: 'more', items: [{ id: 'void' }] };
        const merged = mergeHeaderButtons(views, 'ledger:invoice:details', [{ id: 'edit' }, dropdown], {}, { withMenu: true });
        assert.deepEqual(
            merged.map((b) => b.id),
            ['edit', 'more', 'print']
        );
        assert.deepEqual(
            merged[1].items.map((i) => i.id),
            ['void', 'acme']
        );
        assert.deepEqual(
            dropdown.items.map((i) => i.id),
            ['void'],
            'the given dropdown is not modified'
        );

        const appended = mergeHeaderButtons(views, 'ledger:invoice:details', [], {}, { withMenu: true });
        assert.deepEqual(
            appended.map((b) => b.id),
            ['print', 'registered-menu']
        );
        assert.deepEqual(
            appended[1].items.map((i) => i.id),
            ['acme']
        );

        assert.deepEqual(mergeHeaderButtons(new ResourceViewStub(), 'ledger:invoice:details', [], {}, { withMenu: true }), [], 'no dropdown is added for an empty menu');
    });
});
