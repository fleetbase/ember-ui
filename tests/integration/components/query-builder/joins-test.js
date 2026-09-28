import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const RELATIONSHIPS = {
    driver: {
        label: 'Driver',
        type: 'left',
        columns: [
            { name: 'name', label: 'Name' },
            { name: 'phone', label: 'Phone' },
        ],
    },
    vehicle: {
        label: 'Vehicle',
        type: 'inner',
        columns: [{ name: 'plate', label: 'Plate' }],
    },
};

function relationshipCards() {
    return findAll('.relationship-card');
}

function cardFor(label) {
    return relationshipCards().find((card) => card.textContent.includes(label));
}

function checkboxIn(card) {
    return card.querySelector('input[type="checkbox"]');
}

module('Integration | Component | query-builder/joins', function (hooks) {
    setupRenderingTest(hooks);

    let changes;
    let allColumnChanges;

    hooks.beforeEach(function () {
        changes = [];
        allColumnChanges = [];
        this.set('relationships', RELATIONSHIPS);
        this.set('onChange', (joins) => changes.push(joins));
        this.set('onAllColumnsChange', (columns) => allColumnChanges.push(columns));
    });

    const TEMPLATE = hbs`
        <QueryBuilder::Joins
            @relationships={{this.relationships}}
            @joins={{this.joins}}
            @selectedColumns={{this.selectedColumns}}
            @onChange={{this.onChange}}
            @onAllColumnsChange={{this.onAllColumnsChange}}
        />
    `;

    test('it lists every available relationship', async function (assert) {
        await render(TEMPLATE);

        assert.strictEqual(relationshipCards().length, 2);
        assert.dom(this.element).containsText('Driver');
        assert.dom(this.element).containsText('Vehicle');
    });

    test('the relationship key is used as the table name', async function (assert) {
        await render(TEMPLATE);

        assert.dom(cardFor('Driver')).containsText('driver', 'the object key becomes the table');
    });

    test('the join type is shown in upper case', async function (assert) {
        await render(TEMPLATE);

        assert.dom(cardFor('Driver')).containsText('LEFT JOIN');
        assert.dom(cardFor('Vehicle')).containsText('INNER JOIN');
    });

    test('it renders nothing when there are no relationships', async function (assert) {
        this.set('relationships', undefined);

        await render(TEMPLATE);

        assert.strictEqual(relationshipCards().length, 0);
    });

    test('it reports no joins initially', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.query-builder-panel-header').containsText('No joins');
    });

    test('joining a relationship marks the card selected and reports the change', async function (assert) {
        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));

        assert.dom(cardFor('Driver')).hasClass('selected');
        assert.strictEqual(changes.length, 1, 'onChange fired');
        assert.strictEqual(changes[0].length, 1);
        assert.strictEqual(changes[0][0].key, 'driver');
        assert.deepEqual(changes[0][0].selectedColumns, [], 'a new join starts with no columns');
    });

    test('the header pluralises the join count', async function (assert) {
        await render(TEMPLATE);

        await click(checkboxIn(cardFor('Driver')));
        assert.dom('.query-builder-panel-header').containsText('1 join');

        await click(checkboxIn(cardFor('Vehicle')));
        assert.dom('.query-builder-panel-header').containsText('2 joins');
    });

    test('toggling a joined relationship removes it', async function (assert) {
        await render(TEMPLATE);

        await click(checkboxIn(cardFor('Driver')));
        await click(checkboxIn(cardFor('Driver')));

        assert.dom(cardFor('Driver')).doesNotHaveClass('selected');
        assert.deepEqual(changes[changes.length - 1], [], 'the join list is emptied');
    });

    test('it starts from the joins passed in', async function (assert) {
        this.set('joins', [{ key: 'driver', label: 'Driver', selectedColumns: [], columnAliases: {} }]);

        await render(TEMPLATE);

        assert.dom(cardFor('Driver')).hasClass('selected');
        assert.dom('.query-builder-panel-header').containsText('1 join');
    });

    test('selecting a column records its full path and composed label', async function (assert) {
        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));

        const columnCheckbox = cardFor('Driver').querySelectorAll('input[type="checkbox"]')[1];
        await click(columnCheckbox);

        const [join] = changes[changes.length - 1];
        assert.strictEqual(join.selectedColumns.length, 1);
        assert.strictEqual(join.selectedColumns[0].full, 'driver.name');
        assert.strictEqual(join.selectedColumns[0].table, 'driver');
        assert.strictEqual(join.selectedColumns[0].label, 'Driver - Name', 'the label is namespaced by relationship');
    });

    test('deselecting a column removes it again', async function (assert) {
        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));

        const columnCheckbox = () => cardFor('Driver').querySelectorAll('input[type="checkbox"]')[1];
        await click(columnCheckbox());
        await click(columnCheckbox());

        const [join] = changes[changes.length - 1];
        assert.deepEqual(join.selectedColumns, []);
    });

    test('select-all picks every column of that relationship', async function (assert) {
        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));

        const selectAll = [...cardFor('Driver').querySelectorAll('button')].find((b) => /all/i.test(b.textContent));
        await click(selectAll);

        const [join] = changes[changes.length - 1];
        assert.deepEqual(
            join.selectedColumns.map((c) => c.full),
            ['driver.name', 'driver.phone']
        );
    });

    test('select-none clears the columns and aliases', async function (assert) {
        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));

        const buttons = () => [...cardFor('Driver').querySelectorAll('button')];
        await click(buttons().find((b) => /all/i.test(b.textContent)));
        await click(buttons().find((b) => /none/i.test(b.textContent)));

        const [join] = changes[changes.length - 1];
        assert.deepEqual(join.selectedColumns, []);
        assert.deepEqual(join.columnAliases, {});
    });

    test('typing an alias records it against the column', async function (assert) {
        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));
        await click(cardFor('Driver').querySelectorAll('input[type="checkbox"]')[1]);

        await fillIn(find('.column-alias-input'), 'driver_name');

        const [join] = changes[changes.length - 1];
        assert.strictEqual(join.columnAliases.name, 'driver_name');
        assert.strictEqual(join.selectedColumns[0].alias, 'driver_name', 'the alias is mirrored onto the column');
    });

    test('an alias is trimmed, and clearing it removes the entry', async function (assert) {
        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));
        await click(cardFor('Driver').querySelectorAll('input[type="checkbox"]')[1]);

        await fillIn(find('.column-alias-input'), '  spaced  ');
        assert.strictEqual(changes[changes.length - 1][0].columnAliases.name, 'spaced', 'whitespace is trimmed');

        await fillIn(find('.column-alias-input'), '   ');
        const [join] = changes[changes.length - 1];
        assert.notOk(join.columnAliases.name, 'a blank alias is removed');
        assert.strictEqual(join.selectedColumns[0].alias, null, 'and cleared from the column');
    });

    test('the alias input shows the stored alias', async function (assert) {
        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));
        await click(cardFor('Driver').querySelectorAll('input[type="checkbox"]')[1]);

        await fillIn(find('.column-alias-input'), 'shown');

        assert.dom('.column-alias-input').hasValue('shown');
    });

    test('onAllColumnsChange combines main-table and joined columns', async function (assert) {
        this.set('selectedColumns', [{ name: 'id', full: 'orders.id' }]);

        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));
        await click(cardFor('Driver').querySelectorAll('input[type="checkbox"]')[1]);

        const latest = allColumnChanges[allColumnChanges.length - 1];
        assert.deepEqual(
            latest.map((c) => c.full),
            ['orders.id', 'driver.name'],
            'main table columns come first, then joined ones'
        );
    });

    test('onAllColumnsChange works with no main-table columns', async function (assert) {
        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));

        assert.deepEqual(allColumnChanges[allColumnChanges.length - 1], [], 'an unjoined-column join contributes nothing');
    });

    test('it works with no change handlers wired up', async function (assert) {
        await render(hbs`<QueryBuilder::Joins @relationships={{this.relationships}} />`);
        await click(checkboxIn(cardFor('Driver')));

        assert.dom(cardFor('Driver')).hasClass('selected', 'toggling still works without callbacks');
    });

    test('the selected-column count is shown per relationship', async function (assert) {
        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));

        assert.dom(cardFor('Driver')).containsText('0 selected');

        await click(cardFor('Driver').querySelectorAll('input[type="checkbox"]')[1]);
        assert.dom(cardFor('Driver')).containsText('1 selected');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<QueryBuilder::Joins @relationships={{this.relationships}} data-test-joins="yes" />`);

        assert.dom('.query-builder-panel').hasAttribute('data-test-joins', 'yes');
    });
    test('unselecting an aliased column drops its alias too', async function (assert) {
        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));

        const columnCheckbox = () => cardFor('Driver').querySelectorAll('input[type="checkbox"]')[1];
        await click(columnCheckbox());
        await fillIn(find('.column-alias-input'), 'driver_name');

        assert.strictEqual(changes[changes.length - 1][0].columnAliases.name, 'driver_name', 'the alias is recorded');

        await click(columnCheckbox());

        const [join] = changes[changes.length - 1];
        assert.deepEqual(join.selectedColumns, [], 'the column is gone');
        assert.deepEqual(join.columnAliases, {}, 'and so is the alias it left behind');
    });

    test('aliasing one column leaves the others untouched', async function (assert) {
        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));

        const columnCheckboxes = () => [...cardFor('Driver').querySelectorAll('input[type="checkbox"]')].slice(1);
        await click(columnCheckboxes()[0]);
        await click(columnCheckboxes()[1]);

        await fillIn(findAll('.column-alias-input')[1], 'driver_phone');

        const [join] = changes[changes.length - 1];
        assert.deepEqual(
            join.selectedColumns.map((column) => [column.name, column.alias ?? null]),
            [
                ['name', null],
                ['phone', 'driver_phone'],
            ],
            'only the aliased column is rewritten'
        );
    });

    // A join handed in through @joins is not built by `toggleJoin`, so it may arrive without the
    // `columnAliases` bookkeeping object the component normally creates.
    test('a supplied join with no columnAliases gets one when an alias is typed', async function (assert) {
        this.set('joins', [
            {
                key: 'driver',
                label: 'Driver',
                type: 'left',
                columns: RELATIONSHIPS.driver.columns,
                selectedColumns: [{ name: 'name', label: 'Name', table: 'driver', full: 'driver.name' }],
            },
        ]);

        await render(TEMPLATE);
        await fillIn(find('.column-alias-input'), 'driver_name');

        const [join] = changes[changes.length - 1];
        assert.deepEqual(join.columnAliases, { name: 'driver_name' }, 'the bookkeeping object is created on demand');
        assert.strictEqual(join.selectedColumns[0].alias, 'driver_name');
    });

    test('a relationship column with no label is described by its name', async function (assert) {
        this.set('relationships', {
            driver: { label: 'Driver', type: 'left', columns: [{ name: 'internal_ref' }] },
        });

        await render(TEMPLATE);
        await click(checkboxIn(cardFor('Driver')));
        await click(cardFor('Driver').querySelectorAll('input[type="checkbox"]')[1]);

        assert.strictEqual(changes[changes.length - 1][0].selectedColumns[0].label, 'Driver - internal_ref', 'the column name stands in for the missing label');

        const selectAll = [...cardFor('Driver').querySelectorAll('button')].find((button) => /all/i.test(button.textContent));
        await click(selectAll);

        assert.strictEqual(changes[changes.length - 1][0].selectedColumns[0].label, 'Driver - internal_ref', 'and select-all uses the same fallback');
    });
});
