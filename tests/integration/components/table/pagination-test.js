import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const COLUMNS = [{ label: 'Name' }, { label: 'Status' }, { label: 'Notes' }];
const META = { current_page: 2, last_page: 5, from: 11, to: 20, total: 50 };

module('Integration | Component | table/pagination', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('columns', COLUMNS);
        this.set('meta', META);
        this.set('page', 2);
        this.set('onPageChange', (page) => changes.push(page));
    });

    const TEMPLATE = hbs`
        <table><tbody>
            <Table::Pagination @columns={{this.columns}} @meta={{this.meta}} @page={{this.page}} @onPageChange={{this.onPageChange}} />
        </tbody></table>
    `;

    test('it renders a footer row spanning every column', async function (assert) {
        await render(TEMPLATE);

        assert.dom('tr.next-pagination-row').exists();
        assert.dom('td.next-pagination-column').hasAttribute('colspan', '3');
    });

    test('it renders the pagination control inside the row', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.next-pagination-wrapper #fleetbase-pagination').exists();
        assert.dom('.next-pagination-wrapper').containsText('50', 'the totals are shown');
    });

    test('changing page is reported to the caller', async function (assert) {
        await render(TEMPLATE);

        const pages = findAll('.page-item');
        await click(pages[pages.length - 1]);

        assert.deepEqual(changes, [5]);
    });

    test('with no columns the row spans nothing', async function (assert) {
        this.set('columns', []);

        await render(TEMPLATE);

        assert.dom('td.next-pagination-column').hasAttribute('colspan', '0');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`
            <table><tbody>
                <Table::Pagination @columns={{this.columns}} @meta={{this.meta}} @page={{this.page}} data-test-pagination-row="yes" />
            </tbody></table>
        `);

        assert.dom('tr.next-pagination-row').hasAttribute('data-test-pagination-row', 'yes');
    });
});
