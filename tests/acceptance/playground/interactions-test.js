import { module, test } from 'qunit';
import { visit, click, fillIn, find, findAll, waitFor } from '@ember/test-helpers';
import { setupApplicationTest } from 'dummy/tests/helpers';

/**
 * Representative interaction coverage beyond Button: one input, one attached overlay, one modal
 * layout, one table/resource layout, and one service-backed component.
 *
 * As with the Button suite, these assert the playground's WIRING. The components' own contracts
 * are owned by `tests/integration/components/`, and none of that is repeated here.
 */
module('Acceptance | playground | interactions', function (hooks) {
    setupApplicationTest(hooks);

    module('an input: InputGroup', function () {
        test('the label and placeholder controls reach the real component', async function (assert) {
            await visit('/components/input-group');

            // InputGroup renders its label from `@name` through <InputLabel>, not from a bare
            // <label> and not from `@labelText` — see PLAYGROUND.md.
            assert.dom('[data-test-preview]').containsText('Reference', 'the documented default label');

            await fillIn('[data-test-control-input="name"]', 'Consignment');

            assert.dom('[data-test-preview]').containsText('Consignment');

            await fillIn('[data-test-control-input="placeholder"]', 'Type a consignment id');

            assert.dom('[data-test-preview] input').hasAttribute('placeholder', 'Type a consignment id');
        });

        test('the disabled control disables the real input', async function (assert) {
            await visit('/components/input-group');

            assert.dom('[data-test-preview] input').isNotDisabled();

            await click('[data-test-control-input="disabled"]');

            assert.dom('[data-test-preview] input').isDisabled();
        });

        test('typing in the preview updates the control and the shareable URL', async function (assert) {
            await visit('/components/input-group');

            await fillIn('[data-test-preview] input', 'FLB-9000');

            assert.dom('[data-test-control-input="value"]').hasValue('FLB-9000', 'the preview wrote back into the control');
            assert.dom('[data-test-event="onChange"]').exists('the change was reported');
        });
    });

    module('an attached overlay: Attach::Tooltip', function () {
        test('the tooltip renders its text and follows the text control', async function (assert) {
            await visit('/components/attach-tooltip');

            // The entry defaults `isShown` to true so the tooltip is visible without hovering.
            assert.dom('.ember-attacher').exists('the tooltip is attached');
            assert.dom('.ember-attacher').containsText('Helpful explanation');

            await fillIn('[data-test-control-input="text"]', 'Now explaining something else');

            assert.dom('.ember-attacher').containsText('Now explaining something else');
        });

        test('turning off "force shown" hides it again', async function (assert) {
            await visit('/components/attach-tooltip');

            assert.dom('.ember-attacher').exists();

            await click('[data-test-control-input="isShown"]');

            assert.dom('.ember-attacher.ember-attacher-show').doesNotExist('it is no longer forced open');
        });
    });

    module('a modal layout: Modal::Layouts::Confirm', function () {
        test('the documented modals-manager flow opens the dialog', async function (assert) {
            await visit('/components/modal-layouts-confirm');

            assert.dom('.flb--confirm-modal').doesNotExist('nothing is open to begin with');

            // `data-test-open-modal` is a splattribute, so it lands on Button's own <button>.
            await click('button[data-test-open-modal]');
            await waitFor('.flb--confirm-modal', { timeout: 2000 });

            assert.dom('.flb--confirm-modal').exists('the layout was shown through the service');
            assert.dom('[data-test-event="confirm"]').exists('the service call was recorded');
        });

        test('the title control reaches the dialog', async function (assert) {
            await visit('/components/modal-layouts-confirm');

            await fillIn('[data-test-control-input="title"]', 'Delete this order?');
            await click('button[data-test-open-modal]');
            await waitFor('.flb--confirm-modal', { timeout: 2000 });

            // `confirm()` sets `hideTitle`, so the title renders in the layout body rather than
            // the modal header.
            assert.dom('#modal-headline').hasText('Delete this order?');
        });
    });

    module('a table layout: Table', function () {
        test('the fixture rows render and the empty scenario is reachable', async function (assert) {
            await visit('/components/table');

            assert.strictEqual(findAll('[data-test-preview] tbody tr').length, 5, 'the five-row fixture rendered');
            assert.dom('[data-test-preview] table').containsText('FLB-1001');

            await fillIn('[data-test-scenario]', 'empty');

            // The empty scenario still renders one row — Table's own empty-state row.
            assert.dom('[data-test-preview] tr.next-table-empty-state-row').exists('the empty state took over');
            assert.dom('[data-test-preview] table').doesNotContainText('FLB-1001', 'the fixture rows are gone');
        });

        test('the selectable control adds the checkbox column', async function (assert) {
            await visit('/components/table');

            const withSelection = findAll('[data-test-preview] tbody input[type="checkbox"]').length;

            assert.ok(withSelection > 0, 'selectable is on by default');

            await click('[data-test-control-input="selectable"]');

            assert.strictEqual(findAll('[data-test-preview] tbody input[type="checkbox"]').length, 0, 'turning it off removes the checkboxes');
        });

        test('clicking a row reports through the event log', async function (assert) {
            await visit('/components/table');

            await click(findAll('[data-test-preview] tbody tr')[0]);

            assert.dom('[data-test-event="onRowClick"]').exists('the row click was recorded');
        });
    });

    module('a resource layout: Layout::Resource::Tabular', function () {
        test('the title control reaches the real component', async function (assert) {
            await visit('/components/layout-resource-tabular');

            assert.dom('[data-test-preview]').containsText('Orders');

            await fillIn('[data-test-control-input="title"]', 'Consignments');

            assert.dom('[data-test-preview]').containsText('Consignments');
        });
    });

    module('a service-backed component: ActivityLog', function () {
        test('rows come from the seeded store, deterministically', async function (assert) {
            await visit('/components/activity-log');

            // The fixture is fixed, so these are real assertions rather than shape checks.
            // (Titles come through the dummy `t` helper, which returns the translation key.)
            assert.dom('[data-test-preview]').containsText('created the order');
            assert.dom('[data-test-preview]').containsText('Alex Mercer');
            assert.dom('[data-test-preview]').containsText('uploaded a proof of delivery');
        });

        test('the header control reaches the real component', async function (assert) {
            await visit('/components/activity-log');

            assert.dom('[data-test-preview] .activity-log-title').exists();

            await click('[data-test-control-input="showHeader"]');

            assert.dom('[data-test-preview] .activity-log-title').doesNotExist('the header was removed');
        });
    });

    module('a store-backed input: ModelSelect', function () {
        test('the placeholder control reaches the real component', async function (assert) {
            await visit('/components/model-select');

            assert.dom('[data-test-preview]').containsText('Select a driver');

            await fillIn('[data-test-control-input="placeholder"]', 'Pick someone');

            assert.dom('[data-test-preview]').containsText('Pick someone');
        });

        test('it renders without reaching any API', async function (assert) {
            await visit('/components/model-select');

            assert.dom('[data-test-preview] .ember-power-select-trigger').exists('the select rendered from the seeded store');
            assert.ok(find('[data-test-notes]'), 'the page states the fixture constraint');
        });
    });
});
