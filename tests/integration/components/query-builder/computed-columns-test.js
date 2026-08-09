import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import ModalsManagerService from '@fleetbase/ember-ui/services/modals-manager';

function computedColumn(overrides = {}) {
    return {
        name: 'days_open',
        label: 'Days Open',
        expression: 'DATEDIFF(closed_at, opened_at)',
        type: 'integer',
        ...overrides,
    };
}

function items() {
    return findAll('.computed-column-item');
}

function itemLabels() {
    return items().map((item) => item.querySelector('.font-medium').textContent.trim());
}

function buttonWithText(text) {
    return findAll('button').find((button) => button.textContent.trim().toLowerCase().includes(text.toLowerCase()));
}

// The edit/remove controls are icon-only Buttons rendered in declaration order.
function itemButtons(index) {
    return items()[index].querySelectorAll('button');
}

module('Integration | Component | query-builder/computed-columns', function (hooks) {
    setupRenderingTest(hooks);

    let shown;
    let changes;

    hooks.beforeEach(function () {
        shown = [];
        changes = [];
        this.set('onChange', (columns) => changes.push(columns.slice()));

        this.owner.unregister('service:modalsManager');
        this.owner.register(
            'service:modalsManager',
            class extends ModalsManagerService {
                show(name, options) {
                    shown.push({ name, options });
                    return Promise.resolve();
                }
            }
        );
    });

    const TEMPLATE = hbs`
        <QueryBuilder::ComputedColumns
            @computedColumns={{this.computedColumns}}
            @tableName={{this.tableName}}
            @table={{this.table}}
            @onChange={{this.onChange}}
        />
    `;

    // A stand-in for the modal the manager would open, plus the editor instance it publishes.
    function fakeModal({ isValid = true, saved = computedColumn() } = {}) {
        const calls = { startLoading: 0, stopLoading: 0, done: 0 };

        return {
            calls,
            startLoading() {
                calls.startLoading++;
            },
            stopLoading() {
                calls.stopLoading++;
            },
            done() {
                calls.done++;
            },
            getOption(key) {
                if (key !== 'modalComponentInstance') {
                    return undefined;
                }

                return {
                    validateExpression: () => Promise.resolve(isValid),
                    save: () => saved,
                };
            },
        };
    }

    module('listing', function () {
        test('with no columns it explains what they are for', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(items(), []);
            assert.dom('.query-builder-computed-columns').containsText('No computed columns defined yet');
            assert.dom('.query-builder-computed-columns').containsText('calculated fields using SQL expressions');
            assert.ok(buttonWithText('Add the first computed column'), 'an inline add control is offered');
        });

        test('incoming columns are listed with their name, type and expression', async function (assert) {
            this.set('computedColumns', [computedColumn()]);

            await render(TEMPLATE);

            assert.deepEqual(itemLabels(), ['Days Open']);
            assert.dom('.computed-column-item').containsText('days_open');
            assert.dom('.computed-column-item').containsText('Integer', 'the type is labelled');
            assert.dom('.computed-column-item code').hasText('DATEDIFF(closed_at, opened_at)');
        });

        test('every supported type gets a label and an icon', async function (assert) {
            this.set('computedColumns', [
                computedColumn({ name: 'a', label: 'A', type: 'string' }),
                computedColumn({ name: 'b', label: 'B', type: 'integer' }),
                computedColumn({ name: 'c', label: 'C', type: 'decimal' }),
                computedColumn({ name: 'd', label: 'D', type: 'date' }),
                computedColumn({ name: 'e', label: 'E', type: 'datetime' }),
                computedColumn({ name: 'f', label: 'F', type: 'boolean' }),
            ]);

            await render(TEMPLATE);

            const badges = items().map((item) => item.querySelector('.rounded.text-xs').textContent.trim());
            assert.deepEqual(badges, ['Text', 'Integer', 'Decimal', 'Date', 'Date & Time', 'Boolean']);
            assert.strictEqual(findAll('.computed-column-item svg').length >= 6, true, 'each row carries a type icon');
        });

        test('an unrecognised type falls back to a question icon and no label', async function (assert) {
            this.set('computedColumns', [computedColumn({ type: 'geometry' })]);

            await render(TEMPLATE);

            assert.dom('.computed-column-item svg').hasClass('fa-question');
            assert.dom('.computed-column-item .rounded.text-xs').hasText('');
        });

        test('a description is shown when present', async function (assert) {
            this.set('computedColumns', [computedColumn({ description: 'How long the order was open' })]);

            await render(TEMPLATE);

            assert.dom('.computed-column-item').containsText('How long the order was open');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<QueryBuilder::ComputedColumns data-test-computed="yes" />`);

            assert.dom('.query-builder-computed-columns').hasAttribute('data-test-computed', 'yes');
        });
    });

    module('opening the editor', function () {
        test('adding opens an empty editor for the named table', async function (assert) {
            this.set('tableName', 'orders');

            await render(TEMPLATE);
            await click(buttonWithText('Add the first computed column'));

            assert.strictEqual(shown.length, 1);
            assert.strictEqual(shown[0].name, 'modals/query-builder-computed-column-editor');
            assert.strictEqual(shown[0].options.title, 'Add Computed Column');
            assert.strictEqual(shown[0].options.acceptButtonText, 'Add');
            assert.strictEqual(shown[0].options.computedColumn, null, 'nothing is being edited');
            assert.strictEqual(shown[0].options.tableName, 'orders');
            assert.true(shown[0].options.keepOpen, 'the modal stays open while validating');
        });

        test('the table name falls back to the supplied table', async function (assert) {
            this.set('table', { name: 'invoices' });

            await render(TEMPLATE);
            await click(buttonWithText('Add the first computed column'));

            assert.strictEqual(shown[0].options.tableName, 'invoices');
        });

        test('editing opens the editor seeded with that column', async function (assert) {
            const column = computedColumn();
            this.set('computedColumns', [column]);

            await render(TEMPLATE);
            await click(itemButtons(0)[0]);

            assert.strictEqual(shown[0].options.title, 'Edit Computed Column');
            assert.strictEqual(shown[0].options.acceptButtonText, 'Update');
            assert.strictEqual(shown[0].options.computedColumn, column);
        });

        test('the header add button opens the editor too', async function (assert) {
            this.set('computedColumns', [computedColumn()]);

            await render(TEMPLATE);
            await click(buttonWithText('Add Computed Column'));

            assert.strictEqual(shown.length, 1);
            assert.strictEqual(shown[0].options.computedColumn, null);
        });
    });

    module('confirming the editor', function () {
        test('a valid expression is saved and the modal closes', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('Add the first computed column'));

            const modal = fakeModal();
            await shown[0].options.confirm(modal);

            assert.strictEqual(modal.calls.startLoading, 1, 'the modal shows progress while validating');
            assert.strictEqual(modal.calls.done, 1, 'and closes on success');
            assert.strictEqual(modal.calls.stopLoading, 0);
            assert.deepEqual(
                changes.at(-1).map((column) => column.name),
                ['days_open'],
                'the column is reported to the parent'
            );
        });

        test('an invalid expression leaves the modal open', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('Add the first computed column'));

            const modal = fakeModal({ isValid: false });
            await shown[0].options.confirm(modal);

            assert.strictEqual(modal.calls.done, 0, 'the modal is not closed');
            assert.strictEqual(modal.calls.stopLoading, 1, 'progress is stopped so the user can correct it');
            assert.deepEqual(changes, [], 'nothing is saved');
        });

        test('a modal with no editor instance stops loading and saves nothing', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('Add the first computed column'));

            const modal = fakeModal();
            modal.getOption = () => undefined;
            await shown[0].options.confirm(modal);

            assert.strictEqual(modal.calls.done, 0);
            assert.strictEqual(modal.calls.stopLoading, 1);
            assert.deepEqual(changes, []);
        });

        test('saving a column with an existing name replaces it', async function (assert) {
            this.set('computedColumns', [computedColumn({ label: 'Old label' })]);

            await render(TEMPLATE);
            await click(itemButtons(0)[0]);

            await shown[0].options.confirm(fakeModal({ saved: computedColumn({ label: 'New label' }) }));

            assert.strictEqual(changes.at(-1).length, 1, 'nothing is appended');
            assert.strictEqual(changes.at(-1)[0].label, 'New label');
        });

        test('saving a column with a new name appends it', async function (assert) {
            this.set('computedColumns', [computedColumn()]);

            await render(TEMPLATE);
            await click(buttonWithText('Add Computed Column'));

            await shown[0].options.confirm(fakeModal({ saved: computedColumn({ name: 'total_value', label: 'Total Value' }) }));
            // confirm() is invoked directly rather than through a test helper, so the render
            // it triggers has to be flushed before asserting on the DOM.
            await settled();

            assert.deepEqual(
                changes.at(-1).map((column) => column.name),
                ['days_open', 'total_value']
            );
            assert.deepEqual(itemLabels(), ['Days Open', 'Total Value'], 'and the list re-renders');
        });

        test('it saves happily without an onChange handler', async function (assert) {
            await render(hbs`<QueryBuilder::ComputedColumns />`);
            await click(buttonWithText('Add the first computed column'));

            await shown[0].options.confirm(fakeModal());
            await settled();

            assert.deepEqual(itemLabels(), ['Days Open'], 'the column still appears');
        });
    });

    module('removing', function () {
        test('a column can be removed', async function (assert) {
            this.set('computedColumns', [computedColumn(), computedColumn({ name: 'total_value', label: 'Total Value' })]);

            await render(TEMPLATE);
            await click(itemButtons(0)[1]);

            assert.deepEqual(itemLabels(), ['Total Value']);
            assert.deepEqual(
                changes.at(-1).map((column) => column.name),
                ['total_value']
            );
        });

        test('removing the last column restores the empty state', async function (assert) {
            this.set('computedColumns', [computedColumn()]);

            await render(TEMPLATE);
            await click(itemButtons(0)[1]);

            assert.deepEqual(items(), []);
            assert.dom('.query-builder-computed-columns').containsText('No computed columns defined yet');
        });

        test('it removes happily without an onChange handler', async function (assert) {
            this.set('computedColumns', [computedColumn()]);

            await render(hbs`<QueryBuilder::ComputedColumns @computedColumns={{this.computedColumns}} />`);
            await click(itemButtons(0)[1]);

            assert.deepEqual(items(), []);
        });
    });

    test('the incoming column list is copied, not mutated', async function (assert) {
        const columns = [computedColumn()];
        this.set('computedColumns', columns);

        await render(TEMPLATE);
        await click(itemButtons(0)[1]);

        assert.strictEqual(columns.length, 1, 'the caller-supplied array is left alone');
    });
});
