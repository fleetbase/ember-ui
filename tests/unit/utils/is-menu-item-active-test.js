import isMenuItemActive from 'dummy/utils/is-menu-item-active';
import { module, test } from 'qunit';
import { setupWindowMock } from 'ember-window-mock/test-support';
import window from 'ember-window-mock';

// Every decision this helper makes comes from the current URL, so each test states the path it is
// answering for.
function at(path) {
    window.location.href = `http://localhost${path}`;
}

module('Unit | Utility | is-menu-item-active', function (hooks) {
    setupWindowMock(hooks);

    test('with no arguments at all it reports nothing active', function (assert) {
        at('/fleet-ops/orders');

        assert.false(isMenuItemActive(), 'an undefined slug is not in the path');
    });

    module('a section and a slug', function () {
        test('both must appear in the path', function (assert) {
            at('/storefront/products');

            assert.true(isMenuItemActive('storefront', 'products'), 'the section leads and the slug follows');
            assert.false(isMenuItemActive('storefront', 'orders'), 'a slug that is not there fails');
            assert.false(isMenuItemActive('iam', 'products'), 'and so does the wrong section');
        });

        test('the section must be the first segment, not merely present', function (assert) {
            at('/storefront/products/iam');

            assert.false(isMenuItemActive('iam', 'products'), 'iam appears in the path but does not lead it');
        });
    });

    module('the fleet-ops three-segment path', function () {
        test('the leading fleet-ops segment is dropped before matching', function (assert) {
            at('/fleet-ops/operations/orders');

            assert.true(isMenuItemActive('operations', 'orders'), 'the section is matched against the second segment');
            assert.false(isMenuItemActive('fleet-ops', 'orders'), 'and no longer against fleet-ops itself');
        });

        test('a two-segment fleet-ops path is left alone', function (assert) {
            at('/fleet-ops/orders');

            assert.true(isMenuItemActive('fleet-ops', 'orders'), 'the hack only applies at three segments');
        });

        test('a three-segment path under another extension is left alone', function (assert) {
            at('/storefront/operations/orders');

            assert.true(isMenuItemActive('storefront', 'orders'));
            assert.false(isMenuItemActive('operations', 'orders'), 'only fleet-ops is stripped');
        });
    });

    module('a slug that is also its own section', function () {
        test('with no view it only has to appear in the path', function (assert) {
            at('/dashboard/widgets');

            assert.true(isMenuItemActive('dashboard', 'dashboard'), 'the section leads the path');
        });

        // `slugOnly` is defined as `… && view === null`, so asking for a view takes the
        // section-and-view path instead — see DEFECTS.md #152.
        test('asking for a view falls through to the section rules', function (assert) {
            at('/dashboard/analytics');

            assert.true(isMenuItemActive('dashboard', 'dashboard', 'analytics'), 'the section, slug and view all appear');
            assert.false(isMenuItemActive('dashboard', 'dashboard', 'reports'), 'a view that is absent still fails');
        });
    });

    module('a view', function () {
        test('it can be satisfied by a path segment', function (assert) {
            at('/storefront/products/grid');

            assert.true(isMenuItemActive('storefront', 'products', 'grid'));
            assert.false(isMenuItemActive('storefront', 'products', 'list'), 'a different view does not match');
        });

        test('with no section the slug and the view are both still required', function (assert) {
            at('/storefront/products/grid');

            assert.true(isMenuItemActive(null, 'products', 'grid'));
            assert.false(isMenuItemActive(null, 'orders', 'grid'), 'the slug still has to be there');
            assert.false(isMenuItemActive(null, 'products', 'list'), 'and so does the view');
        });
    });

    test('with neither a section nor a view only the slug matters', function (assert) {
        at('/storefront/products/grid');

        assert.true(isMenuItemActive(null, 'grid'));
        assert.false(isMenuItemActive(null, 'invoices'));
    });
});
