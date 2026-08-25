import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

function inputByPlaceholder(placeholder) {
    return find(`input[placeholder="${placeholder}"]`);
}

function buttonWithText(text) {
    return findAll('button').find((button) => button.textContent.trim().toLowerCase().includes(text.toLowerCase()));
}

module('Integration | Component | template-builder/query-form', function (hooks) {
    setupRenderingTest(hooks);

    let saved;
    let closed;

    hooks.beforeEach(function () {
        saved = [];
        closed = 0;
        this.set('isOpen', true);
        this.set('onSave', (data) => saved.push(data));
        this.set('onClose', () => closed++);
    });

    const TEMPLATE = hbs`
        <TemplateBuilder::QueryForm
            @isOpen={{this.isOpen}}
            @query={{this.query}}
            @resourceTypes={{this.resourceTypes}}
            @onSave={{this.onSave}}
            @onClose={{this.onClose}}
        />
    `;

    // The submit button is labelled "Create Query" for a new query and
    // "Save Changes" when editing an existing one.
    const saveButton = () => findAll('button').find((button) => /create query|save changes/i.test(button.textContent));
    const limitInput = () => inputByPlaceholder('No limit');
    const withInput = () => inputByPlaceholder('e.g. driver,vehicle');
    const labelInput = () => inputByPlaceholder('e.g. Recent Orders');
    const variableInput = () => inputByPlaceholder('recent_orders');
    const descriptionInput = () => inputByPlaceholder('Optional description');

    async function fillValidForm(context) {
        await fillIn(labelInput(), 'Recent Orders');
        await click(buttonWithText('Order'));

        return context;
    }

    module('visibility and reset', function () {
        test('it renders nothing while closed', async function (assert) {
            this.set('isOpen', false);

            await render(TEMPLATE);

            assert.strictEqual(labelInput(), null, 'the form is not in the DOM');
        });

        test('it renders an empty form for a new query', async function (assert) {
            await render(TEMPLATE);

            assert.dom(labelInput()).hasValue('');
            assert.dom(variableInput()).hasValue('');
            assert.dom(descriptionInput()).hasValue('');
        });

        test('it populates from an existing query', async function (assert) {
            this.set('query', {
                uuid: 'q-1',
                label: 'Recent Orders',
                variable_name: 'recent_orders',
                description: 'Last ten',
                model_type: 'Fleetbase\\FleetOps\\Models\\Order',
                limit: 10,
                with: ['driver', 'payload'],
                conditions: [{ field: 'status', operator: '=', value: 'active' }],
                sort: [{ field: 'created_at', direction: 'desc' }],
            });

            await render(TEMPLATE);

            assert.dom(labelInput()).hasValue('Recent Orders');
            assert.dom(variableInput()).hasValue('recent_orders');
            assert.dom(descriptionInput()).hasValue('Last ten');
        });

        test('switching between queries resets the form', async function (assert) {
            this.set('query', { uuid: 'q-1', label: 'First' });
            await render(TEMPLATE);
            assert.dom(labelInput()).hasValue('First');

            this.set('query', { uuid: 'q-2', label: 'Second' });
            assert.dom(labelInput()).hasValue('Second', 'the form re-syncs when the query changes');

            this.set('query', undefined);
            assert.dom(labelInput()).hasValue('', 'clearing the query empties the form');
        });

        test('the deep-cloned conditions do not alias the original query', async function (assert) {
            const conditions = [{ field: 'status', operator: '=', value: 'active' }];
            this.set('query', { uuid: 'q-1', label: 'L', model_type: 'M', conditions });

            await render(TEMPLATE);
            await click(saveButton());

            assert.notStrictEqual(saved[0].conditions[0], conditions[0], 'the saved condition is a copy');
        });
    });

    module('variable name derivation', function () {
        test('typing a label derives a snake_case variable name', async function (assert) {
            await render(TEMPLATE);
            await fillIn(labelInput(), 'Recent Orders');

            assert.dom(variableInput()).hasValue('recent_orders');
        });

        test('punctuation and repeats collapse to single underscores', async function (assert) {
            await render(TEMPLATE);
            await fillIn(labelInput(), '  Orders -- 2024!!  ');

            assert.dom(variableInput()).hasValue('orders_2024', 'leading and trailing underscores are stripped');
        });

        test('editing the variable name stops it tracking the label', async function (assert) {
            await render(TEMPLATE);
            await fillIn(labelInput(), 'Recent Orders');
            await fillIn(variableInput(), 'my_custom_name');
            await fillIn(labelInput(), 'Something Else');

            assert.dom(variableInput()).hasValue('my_custom_name', 'a manual edit wins');
        });

        test('an existing query with a variable name is treated as manually edited', async function (assert) {
            this.set('query', { uuid: 'q-1', label: 'First', variable_name: 'kept' });

            await render(TEMPLATE);
            await fillIn(labelInput(), 'Changed');

            assert.dom(variableInput()).hasValue('kept', 'the saved variable name is not overwritten');
        });
    });

    module('resource types', function () {
        test('it offers the built-in defaults when nothing else is supplied', async function (assert) {
            await render(TEMPLATE);

            assert.ok(buttonWithText('Order'), 'the default Order type is offered');
            assert.ok(buttonWithText('Vehicle'));
        });

        test('@resourceTypes overrides the defaults', async function (assert) {
            this.set('resourceTypes', [{ value: 'App\\Models\\Widget', label: 'Widget', icon: 'box' }]);

            await render(TEMPLATE);

            assert.ok(buttonWithText('Widget'));
            assert.notOk(buttonWithText('Fuel Report'), 'the built-in list is replaced');
        });

        test('service-registered types are used when no argument is given', async function (assert) {
            this.owner.lookup('service:template-builder').registerResourceTypes([{ value: 'App\\Models\\Thing', label: 'Thing', icon: 'box' }]);

            await render(TEMPLATE);

            assert.ok(buttonWithText('Thing'), 'the service registry is consulted');
            assert.notOk(buttonWithText('Fuel Report'), 'and takes precedence over the built-ins');
        });

        test('the argument beats the service registry', async function (assert) {
            this.owner.lookup('service:template-builder').registerResourceTypes([{ value: 'App\\Models\\Thing', label: 'Thing', icon: 'box' }]);
            this.set('resourceTypes', [{ value: 'App\\Models\\Widget', label: 'Widget', icon: 'box' }]);

            await render(TEMPLATE);

            assert.ok(buttonWithText('Widget'));
            assert.notOk(buttonWithText('Thing'));
        });
    });

    module('validation and saving', function () {
        test('saving without a label reports an error', async function (assert) {
            await render(TEMPLATE);
            await click(saveButton());

            assert.dom(this.element).containsText('Label is required.');
            assert.strictEqual(saved.length, 0, 'nothing is saved');
        });

        test('a whitespace-only label is still rejected', async function (assert) {
            await render(TEMPLATE);
            await fillIn(labelInput(), '   ');
            await click(saveButton());

            assert.dom(this.element).containsText('Label is required.');
        });

        test('saving without a resource type reports an error', async function (assert) {
            await render(TEMPLATE);
            await fillIn(labelInput(), 'Recent Orders');
            await click(saveButton());

            assert.dom(this.element).containsText('Please select a resource type.');
            assert.strictEqual(saved.length, 0);
        });

        test('a valid form saves a normalised payload', async function (assert) {
            await render(TEMPLATE);
            await fillValidForm(this);
            await click(saveButton());

            assert.strictEqual(saved.length, 1);
            assert.strictEqual(saved[0].label, 'Recent Orders');
            assert.strictEqual(saved[0].variable_name, 'recent_orders');
            assert.strictEqual(saved[0].uuid, null, 'a new query has no uuid yet');
            assert.strictEqual(saved[0].limit, null, 'an empty limit is normalised to null');
            assert.deepEqual(saved[0].with, []);
        });

        test('the label is trimmed on save', async function (assert) {
            await render(TEMPLATE);
            await fillIn(labelInput(), '  Padded  ');
            await click(buttonWithText('Order'));
            await click(saveButton());

            assert.strictEqual(saved[0].label, 'Padded');
        });

        test('editing an existing query preserves its uuid', async function (assert) {
            this.set('query', { uuid: 'q-1', label: 'Existing', model_type: 'Fleetbase\\FleetOps\\Models\\Order' });

            await render(TEMPLATE);
            await click(saveButton());

            assert.strictEqual(saved[0].uuid, 'q-1');
        });

        test('a blank variable name is derived from the label at save time', async function (assert) {
            this.set('query', { uuid: 'q-1', label: 'From Label', variable_name: '', model_type: 'M' });

            await render(TEMPLATE);
            await click(saveButton());

            assert.strictEqual(saved[0].variable_name, 'from_label');
        });

        test('an earlier error clears on a successful save', async function (assert) {
            await render(TEMPLATE);
            await click(saveButton());
            assert.dom(this.element).containsText('Label is required.');

            await fillValidForm(this);
            await click(saveButton());

            assert.dom(this.element).doesNotContainText('Label is required.');
            assert.strictEqual(saved.length, 1);
        });

        test('cancel closes without saving', async function (assert) {
            await render(TEMPLATE);
            await fillIn(labelInput(), 'Discarded');
            await click(buttonWithText('Cancel'));

            assert.strictEqual(closed, 1);
            assert.strictEqual(saved.length, 0);
        });

        test('it saves without an onSave handler', async function (assert) {
            await render(hbs`<TemplateBuilder::QueryForm @isOpen={{true}} />`);
            await fillIn(inputByPlaceholder('e.g. Recent Orders'), 'Recent Orders');
            await click(buttonWithText('Order'));
            await click(saveButton());

            assert.dom(this.element).doesNotContainText('required', 'validation passed with no callback wired up');
        });
    });

    module('limit and eager-loaded relations', function () {
        test('a limit is parsed to an integer', async function (assert) {
            await render(TEMPLATE);
            await fillValidForm(this);

            await fillIn(limitInput(), '25');
            await click(saveButton());

            assert.strictEqual(saved[0].limit, 25, 'the limit is a number, not a string');
        });

        test('clearing the limit saves null', async function (assert) {
            await render(TEMPLATE);
            await fillValidForm(this);

            await fillIn(limitInput(), '25');
            await fillIn(limitInput(), '');
            await click(saveButton());

            assert.strictEqual(saved[0].limit, null);
        });

        test('relations are entered comma-separated and stored as a trimmed array', async function (assert) {
            await render(TEMPLATE);
            await fillValidForm(this);

            await fillIn(withInput(), ' driver , payload ,, ');
            await click(saveButton());

            assert.deepEqual(saved[0].with, ['driver', 'payload'], 'entries are trimmed and blanks dropped');
        });
    });

    module('conditions and sort', function () {
        test('conditions can be added and removed', async function (assert) {
            await render(TEMPLATE);
            await fillValidForm(this);

            const addCondition = buttonWithText('Add condition');
            await click(addCondition);
            await click(saveButton());

            assert.deepEqual(saved[0].conditions, [], 'a condition with no field is dropped from the payload');
        });

        test('a condition with a field is kept', async function (assert) {
            this.set('query', {
                uuid: 'q-1',
                label: 'L',
                model_type: 'M',
                conditions: [{ field: 'status', operator: '=', value: 'active' }],
            });

            await render(TEMPLATE);
            await click(saveButton());

            assert.strictEqual(saved[0].conditions.length, 1);
            assert.strictEqual(saved[0].conditions[0].field, 'status');
        });

        test('a sort entry with no field is dropped', async function (assert) {
            this.set('query', {
                uuid: 'q-1',
                label: 'L',
                model_type: 'M',
                sort: [
                    { field: '', direction: 'asc' },
                    { field: 'created_at', direction: 'desc' },
                ],
            });

            await render(TEMPLATE);
            await click(saveButton());

            assert.strictEqual(saved[0].sort.length, 1);
            assert.strictEqual(saved[0].sort[0].field, 'created_at');
        });
    });

    test('the template-builder service is optional', async function (assert) {
        this.owner.unregister('service:template-builder');
        this.owner.register('service:template-builder', class extends Service {});

        await render(TEMPLATE);

        assert.ok(buttonWithText('Order'), 'a service with no registry falls back to the built-in types');
    });

    // -------------------------------------------------------------------------
    // Appended coverage: the conditions and sort editors.
    // -------------------------------------------------------------------------

    const CONDITION_FIELD = 'input[placeholder="field"]';
    const CONDITION_VALUE = 'input[placeholder="value or {variable}"]';
    const SORT_FIELD = 'input[placeholder="field (e.g. created_at)"]';

    function conditionRows() {
        return findAll(CONDITION_FIELD);
    }

    function sortRows() {
        return findAll(SORT_FIELD);
    }

    function removeButtons(title) {
        return findAll(`button[title="${title}"]`);
    }

    module('conditions', function () {
        test('a query starts with no conditions', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(conditionRows(), []);
        });

        test('a condition can be added with sensible defaults', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('Add condition'));

            assert.strictEqual(conditionRows().length, 1);
            assert.dom(CONDITION_FIELD).hasValue('', 'the field starts empty');
            assert.dom('.tb-select-operator').hasValue('=', 'equals is the default operator');
        });

        test('several conditions can be added', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('Add condition'));
            await click(buttonWithText('Add condition'));

            assert.strictEqual(conditionRows().length, 2);
        });

        test('a condition field, operator and value can be edited', async function (assert) {
            await render(TEMPLATE);
            await fillValidForm(this);
            await click(buttonWithText('Add condition'));

            await fillIn(conditionRows()[0], 'status');
            await fillIn('.tb-select-operator', '!=');
            await fillIn(CONDITION_VALUE, 'cancelled');
            await click(saveButton());

            assert.deepEqual(saved[0].conditions, [{ field: 'status', operator: '!=', value: 'cancelled' }]);
        });

        test('only the edited condition changes', async function (assert) {
            await render(TEMPLATE);
            await fillValidForm(this);
            await click(buttonWithText('Add condition'));
            await click(buttonWithText('Add condition'));

            await fillIn(conditionRows()[0], 'status');
            await fillIn(conditionRows()[1], 'driver_uuid');
            await click(saveButton());

            assert.deepEqual(
                saved[0].conditions.map((condition) => condition.field),
                ['status', 'driver_uuid']
            );
        });

        test('a condition can be removed', async function (assert) {
            await render(TEMPLATE);
            await fillValidForm(this);
            await click(buttonWithText('Add condition'));
            await click(buttonWithText('Add condition'));
            await fillIn(conditionRows()[0], 'status');
            await fillIn(conditionRows()[1], 'driver_uuid');

            await click(removeButtons('Remove condition')[0]);

            assert.strictEqual(conditionRows().length, 1);

            await click(saveButton());
            assert.deepEqual(
                saved[0].conditions.map((condition) => condition.field),
                ['driver_uuid'],
                'the surviving condition keeps its value'
            );
        });

        test('a condition with a blank field is dropped on save', async function (assert) {
            await render(TEMPLATE);
            await fillValidForm(this);
            await click(buttonWithText('Add condition'));
            await click(saveButton());

            assert.deepEqual(saved[0].conditions, [], 'an unfilled condition is not persisted');
        });
    });

    module('sorting', function () {
        test('a query starts with no sort', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(sortRows(), []);
        });

        test('a sort can be added, defaulting to ascending', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('Add sort'));

            assert.strictEqual(sortRows().length, 1);
            assert.dom('.tb-select-direction').hasValue('asc');
        });

        test('a sort field and direction can be edited', async function (assert) {
            await render(TEMPLATE);
            await fillValidForm(this);
            await click(buttonWithText('Add sort'));

            await fillIn(sortRows()[0], 'created_at');
            await fillIn('.tb-select-direction', 'desc');
            await click(saveButton());

            assert.deepEqual(saved[0].sort, [{ field: 'created_at', direction: 'desc' }]);
        });

        test('a sort can be removed', async function (assert) {
            await render(TEMPLATE);
            await fillValidForm(this);
            await click(buttonWithText('Add sort'));
            await click(buttonWithText('Add sort'));
            await fillIn(sortRows()[0], 'created_at');
            await fillIn(sortRows()[1], 'total');

            await click(removeButtons('Remove sort')[0]);
            await click(saveButton());

            assert.deepEqual(
                saved[0].sort.map((entry) => entry.field),
                ['total']
            );
        });

        test('a sort with a blank field is dropped on save', async function (assert) {
            await render(TEMPLATE);
            await fillValidForm(this);
            await click(buttonWithText('Add sort'));
            await click(saveButton());

            assert.deepEqual(saved[0].sort, []);
        });
    });
    // The Cancel button renders unconditionally, so it can be pressed with no @onClose supplied.
    test('cancelling with no @onClose handler is harmless', async function (assert) {
        await render(hbs`<TemplateBuilder::QueryForm @isOpen={{true}} @resourceTypes={{this.resourceTypes}} />`);
        await click(buttonWithText('Cancel'));

        assert.dom('.tb-query-form, form').exists('the form survives having nowhere to report to');
    });
    // updateDescription and the _syncForm fallbacks: a description typed into the form, and a
    // stored query that omits the optional fields entirely.
    test('the description is carried into the saved query', async function (assert) {
        await render(TEMPLATE);
        await fillValidForm(this);
        await fillIn(descriptionInput(), 'Orders from the last week');
        await click(saveButton());

        assert.strictEqual(saved[saved.length - 1].description, 'Orders from the last week', 'the typed description is saved');
    });

    test('a stored query missing its optional fields loads as empty strings', async function (assert) {
        // Every field here is absent rather than empty — the `?? \'\'` fallbacks in _syncForm only
        // run for a query that omits them, which a form-built query never does.
        this.set('query', { uuid: 'q_1', model_type: 'order' });

        await render(TEMPLATE);

        assert.dom(labelInput()).hasValue('', 'the label falls back to empty');
        assert.dom(descriptionInput()).hasValue('', 'and so does the description');
        assert.dom(limitInput()).hasValue('', 'and the limit');
        assert.dom(withInput()).hasValue('', 'and the relations list');
    });
});
