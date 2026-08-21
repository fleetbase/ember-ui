import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectChoose, getDropdownItems } from 'ember-power-select/test-support';

const ORDERS = {
    name: 'orders',
    label: 'Orders',
    description: 'Every dispatched order',
    columns: [{ name: 'status' }, { name: 'total' }],
    relationships: { customer: {}, driver: {} },
};

const PRODUCTS = {
    name: 'products',
    label: 'Products',
    description: 'Catalogue items',
    columns: [{ name: 'sku' }],
};

module('Integration | Component | query-builder/table-select', function (hooks) {
    setupRenderingTest(hooks);

    let chosen;

    hooks.beforeEach(function () {
        chosen = [];
        this.set('tables', [ORDERS, PRODUCTS]);
        this.set('onChange', (table) => chosen.push(table));
    });

    const TEMPLATE = hbs`<QueryBuilder::TableSelect @tables={{this.tables}} @table={{this.table}} @onChange={{this.onChange}} />`;

    test('with nothing selected it says so and hides the table information', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.query-builder-panel-title').containsText('Data Source');
        assert.dom('.query-builder-panel-header').containsText('No source selected');
        assert.dom(this.element).doesNotContainText('Table Information');
    });

    test('it offers every table with its description', async function (assert) {
        await render(TEMPLATE);

        const options = await getDropdownItems('.query-builder-panel-content');
        assert.strictEqual(options.length, 2);
        assert.true(options.some((option) => option.includes('Orders') && option.includes('Every dispatched order')));
    });

    test('selecting a table reports it and summarises it', async function (assert) {
        await render(TEMPLATE);
        await selectChoose('.query-builder-panel-content', 'Orders');

        assert.deepEqual(chosen, [ORDERS]);
        assert.dom('.query-builder-panel-header').containsText('Orders');
        assert.dom(this.element).containsText('Table Information');
        assert.dom(this.element).containsText('Columns:');
        assert.dom(this.element).containsText('2');
        assert.dom(this.element).containsText('Relationships:');
    });

    test('a table with no relationships omits the relationship count', async function (assert) {
        await render(TEMPLATE);
        await selectChoose('.query-builder-panel-content', 'Products');

        assert.dom(this.element).containsText('Table Information');
        assert.dom(this.element).doesNotContainText('Relationships:');
    });

    test('a preselected table is shown without any interaction', async function (assert) {
        this.set('table', ORDERS);

        await render(TEMPLATE);

        assert.dom('.query-builder-panel-header').containsText('Orders');
        assert.dom(this.element).containsText('Table Information');
    });

    test('it works without an onChange handler', async function (assert) {
        await render(hbs`<QueryBuilder::TableSelect @tables={{this.tables}} />`);
        await selectChoose('.query-builder-panel-content', 'Orders');

        assert.dom('.query-builder-panel-header').containsText('Orders', 'the selection is still applied locally');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<QueryBuilder::TableSelect data-test-table-select="yes" />`);

        assert.dom('.query-builder-panel').hasAttribute('data-test-table-select', 'yes');
    });
});
