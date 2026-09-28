import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function headerLabels() {
    return findAll('thead th').map((cell) => cell.textContent.trim());
}

module('Integration | Component | table/head', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('columns', [
            { label: 'Name', valuePath: 'name' },
            { label: 'Status', valuePath: 'status' },
        ]);
    });

    test('it renders a header cell per column', async function (assert) {
        await render(hbs`<table><Table::Head @columns={{this.columns}} /></table>`);

        assert.dom('thead').exists();
        assert.deepEqual(headerLabels(), ['Name', 'Status']);
    });

    test('an expandable table gains a leading spacer column', async function (assert) {
        await render(hbs`<table><Table::Head @columns={{this.columns}} @canExpand={{true}} /></table>`);

        assert.deepEqual(headerLabels(), ['', 'Name', 'Status']);
    });

    test('a selectable table gains a select-all checkbox', async function (assert) {
        let toggled = [];
        this.set('selectAllRows', (value) => toggled.push(value));

        await render(hbs`<table><Table::Head @columns={{this.columns}} @canSelectAll={{true}} @allRowsToggled={{false}} @selectAllRows={{this.selectAllRows}} /></table>`);

        assert.dom('thead input[type="checkbox"]').exists();
        await click('thead input[type="checkbox"]');

        assert.deepEqual(toggled, [true], 'toggling the header checkbox selects every row');
    });

    test('a block replaces the default header row and yields the columns', async function (assert) {
        await render(hbs`
            <table>
                <Table::Head @columns={{this.columns}} as |head|>
                    <tr><th class="custom">{{head.columns.length}} columns</th></tr>
                </Table::Head>
            </table>
        `);

        assert.dom('thead th.custom').hasText('2 columns');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<table><Table::Head @columns={{this.columns}} class="sticky-head" data-test-head="yes" /></table>`);

        assert.dom('thead').hasClass('sticky-head');
        assert.dom('thead').hasAttribute('data-test-head', 'yes');
    });

    test('no columns renders an empty header row', async function (assert) {
        await render(hbs`<table><Table::Head /></table>`);

        assert.dom('thead tr').exists();
        assert.deepEqual(headerLabels(), []);
    });
});
