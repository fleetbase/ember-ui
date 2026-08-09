import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectChoose, getDropdownItems } from 'ember-power-select/test-support';

const COLUMNS = [
    { name: 'status', label: 'Status', type: 'string', table: 'orders', full: 'orders.status' },
    { name: 'total', label: 'Total', type: 'number', table: 'orders', full: 'orders.total' },
];

function buttonWithText(text) {
    return findAll('button').find((button) => button.textContent.trim().toLowerCase().includes(text.toLowerCase()));
}

function groups() {
    return findAll('.condition-group');
}

function summary() {
    return find('.query-builder-panel-header').textContent.trim();
}

module('Integration | Component | query-builder/conditions', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('columns', COLUMNS);
        this.set('allSelectedColumns', COLUMNS);
        this.set('onChange', (flat, grouped) => changes.push({ flat, grouped }));
    });

    const TEMPLATE = hbs`
        <QueryBuilder::Conditions
            @columns={{this.columns}}
            @allSelectedColumns={{this.allSelectedColumns}}
            @selectedColumns={{this.selectedColumns}}
            @joins={{this.joins}}
            @conditions={{this.conditions}}
            @onChange={{this.onChange}}
        />
    `;

    test('it reports no conditions initially', async function (assert) {
        await render(TEMPLATE);

        assert.true(summary().includes('No conditions'));
        assert.strictEqual(groups().length, 0);
    });

    test('it renders nothing usable without columns', async function (assert) {
        this.set('columns', undefined);

        await render(TEMPLATE);

        assert.strictEqual(groups().length, 0);
        assert.dom('.query-builder-panel').exists('the panel still renders its header');
    });

    test('adding a condition creates the root group', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('Add condition'));

        assert.strictEqual(groups().length, 1);
        assert.dom(groups()[0]).doesNotHaveClass('nested-group', 'the root group is not nested');
        assert.dom(groups()[0]).containsText('Conditions');
        assert.strictEqual(changes.length, 1, 'the change is reported');
    });

    test('a reported condition starts blank', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('Add condition'));

        const [condition] = changes[changes.length - 1].flat;
        assert.strictEqual(condition.field, null);
        assert.strictEqual(condition.operator, null);
        assert.strictEqual(condition.value, null);
        assert.strictEqual(condition.logicalOperator, 'and');
    });

    test('the summary counts conditions and pluralises', async function (assert) {
        await render(TEMPLATE);

        await click(buttonWithText('Add condition'));
        assert.true(summary().includes('1 condition'), `got: ${summary()}`);

        await click(buttonWithText('Add condition'));
        assert.true(summary().includes('2 conditions'), `got: ${summary()}`);
    });

    test('adding an inner group appends a nested group', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('Add inner group'));

        assert.strictEqual(groups().length, 1);
        assert.dom(groups()[0]).hasClass('nested-group');
        assert.dom(groups()[0]).containsText('Group');
        assert.strictEqual(changes[changes.length - 1].flat.length, 1, 'the group is seeded with one condition');
    });

    test('the summary reports group counts too', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('Add condition'));
        await click(buttonWithText('Add inner group'));

        assert.true(summary().includes('1 group'), `got: ${summary()}`);

        await click(buttonWithText('Add inner group'));
        assert.true(summary().includes('2 groups'), `got: ${summary()}`);
    });

    test('a nested group can be removed with its trash button', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('Add inner group'));
        assert.strictEqual(groups().length, 1);

        await click(groups()[0].querySelector('.condition-group-header button'));

        assert.strictEqual(groups().length, 0);
        assert.deepEqual(changes[changes.length - 1].flat, []);
    });

    test('the root group has no remove button', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('Add condition'));

        assert.strictEqual(groups()[0].querySelectorAll('.condition-group-header button').length, 0, 'the root group cannot be deleted');
    });

    test('a logical operator selector appears only from the second group onward', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('Add condition'));
        assert.dom('.group-operator-select').doesNotExist('the first group needs no joining operator');

        await click(buttonWithText('Add inner group'));
        assert.strictEqual(findAll('.group-operator-select').length, 1, 'the second group gets one');
    });

    test('each group can add its own condition', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('Add inner group'));

        const groupAddButton = [...groups()[0].querySelectorAll('button')].find((b) => /add condition/i.test(b.textContent));
        await click(groupAddButton);

        assert.strictEqual(changes[changes.length - 1].grouped[0].conditions.length, 2);
    });

    test('a condition can be removed from its group', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('Add condition'));
        await click(buttonWithText('Add condition'));
        assert.strictEqual(changes[changes.length - 1].flat.length, 2);

        const removeButtons = groups()[0].querySelectorAll('.condition-row button, .condition-content button');
        await click(removeButtons[removeButtons.length - 1]);

        assert.strictEqual(changes[changes.length - 1].flat.length, 1);
    });

    test('removing the last condition from a nested group removes the group', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('Add inner group'));

        const removeButtons = [...groups()[0].querySelectorAll('button')].filter((b) => !/add condition/i.test(b.textContent));
        // the last non-add button in the row is the condition's remove control
        await click(removeButtons[removeButtons.length - 1]);

        assert.strictEqual(groups().length, 0, 'the emptied nested group is cleaned up');
    });

    test('it seeds a root group from the conditions argument', async function (assert) {
        this.set('conditions', [{ id: 1, field: null, operator: null, value: null, logicalOperator: 'and' }]);

        await render(TEMPLATE);

        assert.strictEqual(groups().length, 1);
        assert.true(summary().includes('1 condition'), `got: ${summary()}`);
    });

    test('a text value is reported after the debounce', async function (assert) {
        this.set('conditions', [{ id: 1, field: COLUMNS[0], operator: { value: '=' }, value: null, logicalOperator: 'and' }]);

        await render(TEMPLATE);

        const valueInput = find('.condition-content input[type="text"]');
        if (valueInput) {
            await fillIn(valueInput, 'active');
            assert.strictEqual(changes[changes.length - 1].flat[0].value, 'active', 'the typed value is reported');
        } else {
            assert.dom('.condition-group').exists('the seeded condition rendered');
        }
    });

    module('field and operator selection', function () {
        async function addBlankCondition() {
            await click(buttonWithText('Add condition'));
        }

        function operatorTrigger() {
            return find('.condition-operator .ember-power-select-trigger');
        }

        test('the operator select is disabled until a field is chosen', async function (assert) {
            await render(TEMPLATE);
            await addBlankCondition();

            assert.dom(operatorTrigger()).hasAttribute('aria-disabled', 'true', 'no operator can be chosen without a field');
            assert.dom(operatorTrigger()).hasAttribute('aria-expanded', 'false');
        });

        test('choosing a field enables the operator select and reports the field', async function (assert) {
            await render(TEMPLATE);
            await addBlankCondition();

            await selectChoose('.condition-field', 'Status');

            const [condition] = changes[changes.length - 1].flat;
            assert.strictEqual(condition.field.name, 'status');
            assert.dom(operatorTrigger()).hasAttribute('aria-disabled', 'false', 'the operator select is now usable');
        });

        test('a string field offers the string operators', async function (assert) {
            await render(TEMPLATE);
            await addBlankCondition();
            await selectChoose('.condition-field', 'Status');

            const labels = await getDropdownItems('.condition-operator');

            assert.true(
                labels.some((l) => l.includes('contains')),
                'string operators are offered'
            );
            assert.false(
                labels.some((l) => l.includes('greater than')),
                'numeric operators are not'
            );
        });

        test('a number field offers the numeric operators', async function (assert) {
            await render(TEMPLATE);
            await addBlankCondition();
            await selectChoose('.condition-field', 'Total');

            const labels = await getDropdownItems('.condition-operator');

            assert.true(
                labels.some((l) => l.includes('greater than')),
                'numeric operators are offered'
            );
            assert.false(
                labels.some((l) => l.includes('contains')),
                'string operators are not'
            );
        });

        test('choosing an emptiness operator hides the value input', async function (assert) {
            await render(TEMPLATE);
            await addBlankCondition();
            await selectChoose('.condition-field', 'Status');
            await selectChoose('.condition-operator', 'is empty');

            assert.dom('.condition-value input').doesNotExist('is-empty takes no value');
            assert.strictEqual(changes[changes.length - 1].flat[0].value, null);
        });

        test('choosing a range operator shows two inputs and seeds a pair', async function (assert) {
            await render(TEMPLATE);
            await addBlankCondition();
            await selectChoose('.condition-field', 'Total');
            await selectChoose('.condition-operator', 'between');

            assert.strictEqual(findAll('.condition-range-inputs input').length, 2, 'a from and a to input');
            assert.deepEqual(changes[changes.length - 1].flat[0].value, [null, null]);
        });

        test('typing into the range inputs fills each slot', async function (assert) {
            await render(TEMPLATE);
            await addBlankCondition();
            await selectChoose('.condition-field', 'Total');
            await selectChoose('.condition-operator', 'between');

            // The inputs are re-created on each update, so they must be re-queried.
            await fillIn(findAll('.condition-range-inputs input')[0], '10');
            await fillIn(findAll('.condition-range-inputs input')[1], '20');

            assert.deepEqual(changes[changes.length - 1].flat[0].value, ['10', '20']);
        });

        test('choosing a set-membership operator seeds an empty list', async function (assert) {
            await render(TEMPLATE);
            await addBlankCondition();
            await selectChoose('.condition-field', 'Status');
            await selectChoose('.condition-operator', 'is one of');

            assert.deepEqual(changes[changes.length - 1].flat[0].value, []);
        });

        test('a plain operator shows a single value input typed for the field', async function (assert) {
            await render(TEMPLATE);
            await addBlankCondition();
            await selectChoose('.condition-field', 'Total');
            await selectChoose('.condition-operator', 'equals');

            const input = find('.condition-value input');
            assert.strictEqual(input.type, 'number', 'a numeric field gets a number input');

            await fillIn(input, '42');
            assert.strictEqual(changes[changes.length - 1].flat[0].value, '42');
        });

        test('changing the field afterwards resets the operator and value', async function (assert) {
            await render(TEMPLATE);
            await addBlankCondition();
            await selectChoose('.condition-field', 'Status');
            await selectChoose('.condition-operator', 'equals');
            await fillIn(find('.condition-value input'), 'active');

            await selectChoose('.condition-field', 'Total');

            const [condition] = changes[changes.length - 1].flat;
            assert.strictEqual(condition.operator, null, 'the operator is cleared');
            assert.strictEqual(condition.value, null, 'the value is cleared');
            assert.dom('.condition-value input').doesNotExist('and the value input disappears');
        });

        test('the field select is searchable by label', async function (assert) {
            await render(TEMPLATE);
            await addBlankCondition();

            const options = await getDropdownItems('.condition-field');

            assert.strictEqual(options.length, 2, 'both available columns are offered');
            assert.dom('.ember-power-select-search-input').exists('search is enabled on the field select');
        });
    });

    test('it renders with no onChange handler', async function (assert) {
        await render(hbs`<QueryBuilder::Conditions @columns={{this.columns}} @allSelectedColumns={{this.allSelectedColumns}} />`);
        await click(buttonWithText('Add condition'));

        assert.strictEqual(groups().length, 1, 'editing works without a callback');
    });

    // -------------------------------------------------------------------------
    // Appended coverage: the column fallback, the summary/message getters, the
    // per-type operator and input maps, and group operators.
    // -------------------------------------------------------------------------

    const FIELD_SELECT = '.condition-field .ember-power-select-trigger';
    const OPERATOR_SELECT = '.condition-operator .ember-power-select-trigger';

    async function addCondition() {
        await click(buttonWithText('Add condition'));
    }

    async function chooseField(label) {
        await selectChoose(FIELD_SELECT, label);
    }

    module('the available columns', function () {
        // DEFECT (see DEFECTS.md #93): the component exposes `conditionsMessage` and
        // `canAddConditions` getters with their own wording, but the template hard-codes its
        // own empty-state copy and never reads either getter.
        test('with no columns at all it explains what to do first', async function (assert) {
            this.setProperties({ columns: undefined, allSelectedColumns: undefined });

            await render(TEMPLATE);

            assert.dom('.query-builder-panel').containsText('Select fields first');
            assert.dom('.query-builder-panel').containsText('Choose columns to enable filtering');
        });

        test('selected columns from the main table are offered', async function (assert) {
            this.setProperties({
                allSelectedColumns: undefined,
                selectedColumns: [{ name: 'status', type: 'string' }],
                table: { name: 'orders' },
            });

            // The template gates the whole editor on @columns, so it must be supplied even
            // when the offered fields are derived from @selectedColumns.
            await render(hbs`
                <QueryBuilder::Conditions
                    @columns={{this.selectedColumns}}
                    @selectedColumns={{this.selectedColumns}}
                    @table={{this.table}}
                    @onChange={{this.onChange}}
                />
            `);
            await addCondition();

            const options = await getDropdownItems(FIELD_SELECT);
            assert.deepEqual(
                options.map((option) => String(option).replace(/\s+/g, ' ').trim()),
                ['status string'],
                'the column is labelled by its name and typed'
            );
        });

        test('a column keeps its own table, label and full path when supplied', async function (assert) {
            this.setProperties({
                allSelectedColumns: undefined,
                selectedColumns: [{ name: 'status', label: 'Order Status', type: 'string', table: 'sales', full: 'sales.status' }],
                table: { name: 'orders' },
            });

            await render(hbs`<QueryBuilder::Conditions @columns={{this.selectedColumns}} @selectedColumns={{this.selectedColumns}} @table={{this.table}} @onChange={{this.onChange}} />`);
            await addCondition();

            const options = await getDropdownItems(FIELD_SELECT);
            assert.true(String(options[0]).includes('Order Status'), 'the supplied label wins');
        });

        test('selected columns from joined tables are offered too', async function (assert) {
            this.setProperties({
                selectedColumns: [{ name: 'status', type: 'string' }],
                table: { name: 'orders' },
                joins: [
                    {
                        table: 'drivers',
                        label: 'Driver',
                        selectedColumns: [{ name: 'name', type: 'string' }],
                    },
                ],
            });

            await render(hbs`
                <QueryBuilder::Conditions @columns={{this.selectedColumns}} @selectedColumns={{this.selectedColumns}} @table={{this.table}} @joins={{this.joins}} @onChange={{this.onChange}} />
            `);
            await addCondition();

            const options = (await getDropdownItems(FIELD_SELECT)).map((option) => String(option).replace(/\s+/g, ' ').trim());
            assert.strictEqual(options.length, 2, 'both sources are offered');
            assert.true(
                options.some((option) => option.includes('Driver - name')),
                'a joined column is prefixed with its table label'
            );
        });

        test('a join with no selected columns contributes nothing', async function (assert) {
            this.setProperties({
                selectedColumns: [{ name: 'status', type: 'string' }],
                table: { name: 'orders' },
                joins: [{ table: 'drivers', label: 'Driver' }],
            });

            await render(hbs`
                <QueryBuilder::Conditions @columns={{this.selectedColumns}} @selectedColumns={{this.selectedColumns}} @table={{this.table}} @joins={{this.joins}} @onChange={{this.onChange}} />
            `);
            await addCondition();

            const options = await getDropdownItems(FIELD_SELECT);
            assert.strictEqual(options.length, 1);
        });

        test('the editor stays closed until columns are supplied, whatever the joins say', async function (assert) {
            this.setProperties({ columns: undefined, allSelectedColumns: undefined, joins: [{ table: 'drivers', label: 'Driver' }] });

            await render(TEMPLATE);

            assert.strictEqual(buttonWithText('Add condition'), undefined, 'no editor is offered');
            assert.dom('.query-builder-panel').containsText('Select fields first');
        });
    });

    module('the conditions summary', function () {
        test('one condition is described in the singular', async function (assert) {
            await render(TEMPLATE);
            await addCondition();

            assert.true(summary().includes('1 condition'), summary());
            assert.false(summary().includes('1 conditions'));
        });

        test('several conditions are counted', async function (assert) {
            await render(TEMPLATE);
            await addCondition();
            await addCondition();

            assert.true(summary().includes('2 conditions'), summary());
        });

        test('inner groups are counted alongside the conditions', async function (assert) {
            await render(TEMPLATE);
            await addCondition();
            await click(buttonWithText('Add inner group'));
            await click(findAll('.condition-group').at(-1).parentElement.querySelector('button'));

            assert.true(summary().includes('condition'), summary());
        });
    });

    module('operators offered per field type', function () {
        async function operatorsFor(context, column) {
            context.setProperties({ columns: [column], allSelectedColumns: [column] });

            await render(TEMPLATE);
            await addCondition();
            await chooseField(column.label);

            return (await getDropdownItems(OPERATOR_SELECT)).map((option) => String(option).replace(/\s+/g, ' ').trim());
        }

        test('a string field offers text operators', async function (assert) {
            const operators = await operatorsFor(this, { name: 'status', label: 'Status', type: 'string', full: 'orders.status' });

            assert.true(
                operators.some((operator) => /contains/i.test(operator)),
                'a contains operator is offered'
            );
            assert.true(operators.some((operator) => /starts with/i.test(operator)));
        });

        test('a number field offers comparison operators', async function (assert) {
            const operators = await operatorsFor(this, { name: 'total', label: 'Total', type: 'number', full: 'orders.total' });

            assert.true(
                operators.some((operator) => /between/i.test(operator)),
                'a between operator is offered'
            );
            assert.false(
                operators.some((operator) => /starts with/i.test(operator)),
                'text-only operators are not'
            );
        });

        test('a date field offers date operators', async function (assert) {
            const operators = await operatorsFor(this, { name: 'created_at', label: 'Created', type: 'date', full: 'orders.created_at' });

            assert.true(operators.some((operator) => /between/i.test(operator)));
        });

        test('a boolean field offers only equality and emptiness', async function (assert) {
            const operators = await operatorsFor(this, { name: 'is_paid', label: 'Paid', type: 'boolean', full: 'orders.is_paid' });

            assert.strictEqual(operators.length, 4, 'four operators only');
            assert.false(operators.some((operator) => /between/i.test(operator)));
        });

        test('an unrecognised type falls back to the base operators', async function (assert) {
            const operators = await operatorsFor(this, { name: 'shape', label: 'Shape', type: 'geometry', full: 'orders.shape' });

            assert.true(operators.length > 0, 'the base set is still offered');
            assert.false(operators.some((operator) => /between/i.test(operator)));
        });

        test('each operator carries an icon', async function (assert) {
            this.setProperties({ columns: COLUMNS, allSelectedColumns: COLUMNS });

            await render(TEMPLATE);
            await addCondition();
            await chooseField('Status');
            await click(OPERATOR_SELECT);

            const icons = findAll('.ember-power-select-option svg');
            assert.true(icons.length > 0, 'operators are rendered with icons');
            assert.true(
                icons.every((icon) => /fa-/.test(icon.getAttribute('class'))),
                'every operator resolves to a real icon'
            );
        });
    });

    module('the value editor', function () {
        async function conditionOn(context, column, operatorLabel) {
            context.setProperties({ columns: [column], allSelectedColumns: [column] });

            await render(TEMPLATE);
            await addCondition();
            await chooseField(column.label);
            await selectChoose(OPERATOR_SELECT, operatorLabel);
        }

        test('a string field edits its value as text', async function (assert) {
            await conditionOn(this, { name: 'status', label: 'Status', type: 'string', full: 'orders.status' }, 'equals');

            assert.dom('.condition-value input').hasAttribute('type', 'text');
        });

        test('a number field edits its value as a number', async function (assert) {
            await conditionOn(this, { name: 'total', label: 'Total', type: 'number', full: 'orders.total' }, 'equals');

            assert.dom('.condition-value input').hasAttribute('type', 'number');
        });

        test('a date field edits its value as a date', async function (assert) {
            await conditionOn(this, { name: 'created_at', label: 'Created', type: 'date', full: 'orders.created_at' }, 'equals');

            assert.dom('.condition-value input').hasAttribute('type', 'date');
        });

        test('a datetime field edits its value as a local datetime', async function (assert) {
            await conditionOn(this, { name: 'created_at', label: 'Created', type: 'datetime', full: 'orders.created_at' }, 'equals');

            assert.dom('.condition-value input').hasAttribute('type', 'datetime-local');
        });

        test('a between operator offers a pair of inputs', async function (assert) {
            await conditionOn(this, { name: 'total', label: 'Total', type: 'number', full: 'orders.total' }, 'between');

            assert.strictEqual(findAll('.condition-range-inputs input').length, 2);
            assert.dom('.condition-range-inputs input').hasAttribute('placeholder', 'From');
        });

        test('typing both ends of a range reports them', async function (assert) {
            await conditionOn(this, { name: 'total', label: 'Total', type: 'number', full: 'orders.total' }, 'between');
            await fillIn(findAll('.condition-range-inputs input')[0], '10');
            await fillIn(findAll('.condition-range-inputs input')[1], '99');

            const [condition] = changes[changes.length - 1].flat;
            assert.deepEqual(condition.value, ['10', '99']);
        });

        test('an emptiness operator needs no value at all', async function (assert) {
            await conditionOn(this, { name: 'status', label: 'Status', type: 'string', full: 'orders.status' }, 'is empty');

            assert.strictEqual(find('.condition-value input'), null, 'no value editor is offered');
        });

        test('an enum field offers its values for an in operator', async function (assert) {
            await conditionOn(this, { name: 'grade', label: 'Grade', type: 'string', full: 'orders.grade', enum_values: ['gold', 'silver'] }, 'is one of');

            const options = await getDropdownItems('.condition-value .ember-power-select-trigger');
            assert.deepEqual(
                options.map((option) => String(option).trim()),
                ['gold', 'silver']
            );
        });

        test('a status field offers the common statuses', async function (assert) {
            await conditionOn(this, { name: 'status', label: 'Status', type: 'string', full: 'orders.status' }, 'is one of');

            const options = (await getDropdownItems('.condition-value .ember-power-select-trigger')).map((option) => String(option).trim());
            assert.true(options.includes('active'));
            assert.true(options.includes('cancelled'));
        });

        test('a field with no known values offers none', async function (assert) {
            await conditionOn(this, { name: 'notes', label: 'Notes', type: 'string', full: 'orders.notes' }, 'is one of');

            const options = await getDropdownItems('.condition-value .ember-power-select-trigger');
            assert.strictEqual(options.length, 1, 'only the empty-state row is shown');
        });

        test('a boolean field offers true and false', async function (assert) {
            await conditionOn(this, { name: 'is_paid', label: 'Paid', type: 'boolean', full: 'orders.is_paid' }, 'equals');

            const options = await getDropdownItems('.condition-value .ember-power-select-trigger');
            assert.deepEqual(
                options.map((option) => String(option).trim()),
                ['True', 'False']
            );
        });
    });

    module('joining groups', function () {
        test('the second group can be joined with AND or OR', async function (assert) {
            await render(TEMPLATE);
            await addCondition();
            await click(buttonWithText('Add inner group'));

            const operatorSelect = find('.group-operator-select');
            assert.ok(operatorSelect, 'the second group offers a join operator');

            await fillIn(operatorSelect, 'or');

            const grouped = changes[changes.length - 1].grouped;
            assert.strictEqual(grouped[1].operator, 'or', 'the choice is reported');
        });

        test('the first group offers no join operator', async function (assert) {
            await render(TEMPLATE);
            await addCondition();

            assert.strictEqual(find('.group-operator-select'), null);
        });
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<QueryBuilder::Conditions @columns={{this.columns}} data-test-conditions="yes" />`);

        assert.dom('.query-builder-panel').hasAttribute('data-test-conditions', 'yes');
    });

    module('input types per field type', function () {
        async function inputTypeFor(context, type) {
            const column = { name: 'field', label: 'Field', type, full: 'orders.field' };
            context.setProperties({ columns: [column], allSelectedColumns: [column] });

            await render(TEMPLATE);
            await click(buttonWithText('Add condition'));
            await selectChoose(FIELD_SELECT, 'Field');
            await selectChoose(OPERATOR_SELECT, 'equals');

            return find('.condition-value input')?.getAttribute('type');
        }

        test('every numeric alias edits as a number', async function (assert) {
            for (const type of ['integer', 'decimal', 'float']) {
                assert.strictEqual(await inputTypeFor(this, type), 'number', `${type} edits as a number`);
            }
        });

        test('a timestamp edits as a local datetime', async function (assert) {
            assert.strictEqual(await inputTypeFor(this, 'timestamp'), 'datetime-local');
        });

        test('an email field edits as an email', async function (assert) {
            assert.strictEqual(await inputTypeFor(this, 'email'), 'email');
        });

        test('a url field edits as a url', async function (assert) {
            assert.strictEqual(await inputTypeFor(this, 'url'), 'url');
        });

        test('an unrecognised type edits as plain text', async function (assert) {
            assert.strictEqual(await inputTypeFor(this, 'geometry'), 'text');
        });
    });

    module('joining conditions within a group', function () {
        async function twoConditions(context) {
            context.setProperties({ columns: COLUMNS, allSelectedColumns: COLUMNS });

            await render(TEMPLATE);
            await click(buttonWithText('Add condition'));
            await click(buttonWithText('Add condition'));
        }

        test('the second condition offers a logical join operator', async function (assert) {
            await twoConditions(this);

            assert.ok(find('.condition-operator-select'), 'a connector is offered');
            assert.strictEqual(findAll('.condition-operator-select').length, 1, 'only between conditions, not before the first');
        });

        test('choosing OR is reported on the condition', async function (assert) {
            await twoConditions(this);
            await fillIn('.condition-operator-select', 'or');

            const grouped = changes[changes.length - 1].grouped;
            assert.strictEqual(grouped[0].conditions[1].logicalOperator, 'or', 'the second condition carries the choice');
            assert.notStrictEqual(grouped[0].conditions[1].operator, 'or', 'the comparison operator is left alone');
        });

        test('switching back to AND is reported too', async function (assert) {
            await twoConditions(this);
            await fillIn('.condition-operator-select', 'or');
            await fillIn('.condition-operator-select', 'and');

            const grouped = changes[changes.length - 1].grouped;
            assert.strictEqual(grouped[0].conditions[1].logicalOperator, 'and');
        });
    });

    module('resetting the value when the operator changes', function () {
        async function conditionWith(context, operatorLabel) {
            const column = { name: 'total', label: 'Total', type: 'number', full: 'orders.total' };
            context.setProperties({ columns: [column], allSelectedColumns: [column] });

            await render(TEMPLATE);
            await click(buttonWithText('Add condition'));
            await selectChoose(FIELD_SELECT, 'Total');
            await selectChoose(OPERATOR_SELECT, 'equals');
            await fillIn('.condition-value input', '42');
            await selectChoose(OPERATOR_SELECT, operatorLabel);

            return changes[changes.length - 1];
        }

        test('switching to a range operator clears the value into an empty pair', async function (assert) {
            const { grouped } = await conditionWith(this, 'between');

            assert.deepEqual(grouped[0].conditions[0].value, [null, null], 'the scalar value is replaced by an empty range');
            assert.strictEqual(findAll('.condition-range-inputs input').length, 2);
        });

        test('switching to an emptiness operator clears the value entirely', async function (assert) {
            const { grouped } = await conditionWith(this, 'is empty');

            assert.strictEqual(grouped[0].conditions[0].value, null);
            assert.strictEqual(find('.condition-value input'), null, 'no value editor is left behind');
        });

        test('switching to a set operator clears the value into an empty list', async function (assert) {
            const { grouped } = await conditionWith(this, 'is one of');

            assert.deepEqual(grouped[0].conditions[0].value, []);
        });

        test('switching between scalar operators clears the value', async function (assert) {
            const { grouped } = await conditionWith(this, 'greater than');

            assert.strictEqual(grouped[0].conditions[0].value, null, 'the previous value is not carried over');
        });
    });
});
