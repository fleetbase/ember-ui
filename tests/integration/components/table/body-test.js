import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function rows() {
    return [
        { id: 'ord_1', name: 'Order 123', status: 'created', checked: false, expanded: false },
        { id: 'ord_2', name: 'Order 456', status: 'dispatched', checked: false, expanded: false },
    ];
}

function cellText() {
    return findAll('tbody tr').map((row) =>
        Array.from(row.querySelectorAll('td'))
            .map((cell) => cell.textContent.trim())
            .filter(Boolean)
            .join('|')
    );
}

module('Integration | Component | table/body', function (hooks) {
    setupRenderingTest(hooks);

    let clicks;

    hooks.beforeEach(function () {
        clicks = [];
        this.set('rows', rows());
        this.set('columns', [
            { label: 'Name', valuePath: 'name' },
            { label: 'Status', valuePath: 'status' },
        ]);
        this.set('onRowClick', (row) => clicks.push(row));
    });

    const TEMPLATE = hbs`
        <table><Table::Body @rows={{this.rows}} @columns={{this.columns}} @selectable={{this.selectable}} @canExpand={{this.canExpand}} @onRowClick={{this.onRowClick}} /></table>
    `;

    test('it renders a row per record with a cell per column', async function (assert) {
        await render(TEMPLATE);

        assert.dom('tbody').exists();
        assert.deepEqual(cellText(), ['Order 123|created', 'Order 456|dispatched']);
    });

    test('clicking a row reports the record', async function (assert) {
        await render(TEMPLATE);
        await click(findAll('tbody tr')[1]);

        assert.deepEqual(clicks, [this.rows[1]]);
    });

    test('a selectable table renders a checkbox per row', async function (assert) {
        this.set('selectable', true);

        await render(TEMPLATE);

        assert.strictEqual(findAll('tbody input[type="checkbox"]').length, 2);
    });

    test('an expandable table renders expand arrows and expands on click', async function (assert) {
        this.set('canExpand', true);

        await render(TEMPLATE);

        assert.strictEqual(findAll('tbody tr.is-expandable').length, 2);

        await click(findAll('tbody tr.is-expandable')[0]);
        assert.dom(findAll('tbody tr')[0]).hasClass('is-expanded');
        assert.true(this.rows[0].expanded);
    });

    test('an expandable selectable table renders both controls', async function (assert) {
        this.setProperties({ canExpand: true, selectable: true });

        await render(TEMPLATE);

        assert.strictEqual(findAll('tbody input[type="checkbox"]').length, 2);
        assert.strictEqual(findAll('tbody tr.is-expandable').length, 2);
    });

    test('a block replaces the default rendering and yields the rows', async function (assert) {
        await render(hbs`
            <table>
                <Table::Body @rows={{this.rows}} @columns={{this.columns}} as |body|>
                    {{#each body.rows as |row|}}
                        <tr class="custom"><td>{{row.name}}</td></tr>
                    {{/each}}
                </Table::Body>
            </table>
        `);

        assert.deepEqual(
            findAll('tbody tr.custom td').map((cell) => cell.textContent.trim()),
            ['Order 123', 'Order 456']
        );
    });

    test('a block on an expandable table yields an expanded-row component', async function (assert) {
        await render(hbs`
            <table>
                <Table::Body @rows={{this.rows}} @columns={{this.columns}} @canExpand={{true}} as |body|>
                    <body.expanded-row><span class="detail">detail</span></body.expanded-row>
                </Table::Body>
            </table>
        `);

        assert.strictEqual(findAll('tbody tr.is-expandable').length, 2, 'the default expandable rows are still rendered');
        assert.strictEqual(findAll('tbody tr.expanded-row').length, 2, 'each row gets an expandable detail row');
    });

    test('no rows renders an empty body', async function (assert) {
        this.set('rows', []);

        await render(TEMPLATE);

        assert.dom('tbody').exists();
        assert.strictEqual(findAll('tbody tr').length, 0);
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<table><Table::Body @rows={{this.rows}} @columns={{this.columns}} class="striped" data-test-body="yes" /></table>`);

        assert.dom('tbody').hasClass('striped');
        assert.dom('tbody').hasAttribute('data-test-body', 'yes');
    });
});
