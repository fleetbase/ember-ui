import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function queries() {
    return [
        { uuid: 'qry_1', label: 'Recent orders', variable_name: 'recent_orders', model_type: 'order' },
        { uuid: '_new_123', label: 'Draft query', variable_name: 'draft' },
    ];
}

function rows() {
    return findAll('.tb-query-row');
}

function rowLabels() {
    return rows().map((row) => row.querySelector('span.font-medium').textContent.trim());
}

function addButton() {
    return find('button[title="Add query"]');
}

function saveButton() {
    return findAll('button').find((button) => /create query|save changes/i.test(button.textContent));
}

// The form refuses to save until a resource type is chosen.
function resourceTypeButton(text) {
    return findAll('button').find((button) => button.textContent.trim().toLowerCase().includes(text.toLowerCase()));
}

// The form's dismiss control is the only untitled icon button in the modal header.
function closeFormButton() {
    return findAll('button').find((button) => !button.hasAttribute('title') && !button.textContent.trim());
}

module('Integration | Component | template-builder/queries-panel', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('queries', queries());
        this.set('onQueriesChange', (updated) => changes.push(updated));
    });

    const TEMPLATE = hbs`<TemplateBuilder::QueriesPanel @queries={{this.queries}} @onQueriesChange={{this.onQueriesChange}} />`;

    module('listing queries', function () {
        test('it lists every query with its variable name', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.tb-queries-panel').exists();
            assert.deepEqual(rowLabels(), ['Recent orders', 'Draft query']);
            assert.dom(rows()[0]).containsText('{recent_orders}', 'the interpolation name is shown');
        });

        test('a query with a model type shows it', async function (assert) {
            await render(TEMPLATE);

            assert.dom(rows()[0]).containsText('order');
            assert.dom(rows()[1]).doesNotContainText('order', 'a query without a model type shows none');
        });

        test('an unsaved query is badged', async function (assert) {
            await render(TEMPLATE);

            assert.dom(rows()[1]).containsText('unsaved', 'the client-side query is marked');
            assert.dom(rows()[0]).doesNotContainText('unsaved', 'a persisted query is not');
        });

        test('with no queries it explains what queries are for', async function (assert) {
            this.set('queries', []);

            await render(TEMPLATE);

            assert.strictEqual(rows().length, 0);
            assert.dom('.tb-queries-panel').containsText('No queries yet.');
            assert.dom('.tb-queries-panel').containsText('Queries load data from Fleetbase models');
        });

        test('with no queries argument at all it renders the empty state', async function (assert) {
            await render(hbs`<TemplateBuilder::QueriesPanel />`);

            assert.dom('.tb-queries-panel').containsText('No queries yet.');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<TemplateBuilder::QueriesPanel data-test-queries="yes" />`);

            assert.dom('.tb-queries-panel').hasAttribute('data-test-queries', 'yes');
        });
    });

    module('the query form', function () {
        test('the form is closed to begin with', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(saveButton(), undefined, 'no form is shown');
        });

        test('adding opens an empty form', async function (assert) {
            await render(TEMPLATE);
            await click(addButton());

            assert.ok(saveButton(), 'the form opens');
            assert.dom(saveButton()).hasText('Create Query', 'as a new query');
            assert.dom('input[placeholder="e.g. Recent Orders"]').hasValue('');
        });

        test('editing opens the form seeded with that query', async function (assert) {
            await render(TEMPLATE);
            await click(rows()[0].querySelector('button[title="Edit query"]'));

            assert.dom(saveButton()).hasText('Save Changes');
            assert.dom('input[placeholder="e.g. Recent Orders"]').hasValue('Recent orders');
        });

        test('the form can be dismissed without changing anything', async function (assert) {
            await render(TEMPLATE);
            await click(addButton());

            assert.ok(saveButton(), 'the form is open');

            await click(closeFormButton());

            assert.strictEqual(saveButton(), undefined, 'the form closes');
            assert.deepEqual(changes, [], 'nothing is reported');
        });

        test('the form reopens empty after an edit is dismissed', async function (assert) {
            await render(TEMPLATE);
            await click(rows()[0].querySelector('button[title="Edit query"]'));
            await click(closeFormButton());
            await click(addButton());

            assert.dom('input[placeholder="e.g. Recent Orders"]').hasValue('', 'the edited query is forgotten');
        });
    });

    module('mutating queries', function () {
        test('saving a new query appends it with a temporary id and closes the form', async function (assert) {
            await render(TEMPLATE);
            await click(addButton());
            await fillIn('input[placeholder="e.g. Recent Orders"]', 'Pending deliveries');
            await click(resourceTypeButton('Order'));
            await click(saveButton());

            assert.strictEqual(changes.length, 1, 'the parent is told once');
            const updated = changes[0];
            assert.strictEqual(updated.length, 3, 'the query is appended');
            assert.strictEqual(updated[2].label, 'Pending deliveries');
            assert.true(updated[2].uuid.startsWith('_new_'), 'it carries a client-side id until the template is saved');
            assert.strictEqual(saveButton(), undefined, 'the form closes');
        });

        test('saving an existing query replaces it in place', async function (assert) {
            await render(TEMPLATE);
            await click(rows()[0].querySelector('button[title="Edit query"]'));
            await fillIn('input[placeholder="e.g. Recent Orders"]', 'Renamed orders');
            await click(resourceTypeButton('Order'));
            await click(saveButton());

            const updated = changes[0];
            assert.strictEqual(updated.length, 2, 'nothing is appended');
            assert.strictEqual(updated[0].uuid, 'qry_1');
            assert.strictEqual(updated[0].label, 'Renamed orders');
            assert.strictEqual(updated[1].label, 'Draft query', 'the other query is untouched');
        });

        test('a query can be deleted', async function (assert) {
            await render(TEMPLATE);
            await click(rows()[1].querySelector('button[title="Delete query"]'));

            assert.strictEqual(changes.length, 1);
            assert.deepEqual(
                changes[0].map((query) => query.uuid),
                ['qry_1'],
                'only the chosen query is removed'
            );
        });

        test('it mutates happily without an onQueriesChange handler', async function (assert) {
            await render(hbs`<TemplateBuilder::QueriesPanel @queries={{this.queries}} />`);
            await click(rows()[1].querySelector('button[title="Delete query"]'));

            assert.strictEqual(rows().length, 2, 'the panel survives and stays controlled by its argument');
        });
    });
});
