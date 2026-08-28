import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | report/data', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Report::Data @resource={{this.resource}} />`;

    function headers() {
        return findAll('th').map((cell) => cell.textContent.trim());
    }

    function rows() {
        return findAll('tbody tr').map((row) => Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent.trim()));
    }

    test('it renders a column per result column and a row per record', async function (assert) {
        this.set('resource', {
            result_columns: [
                { name: 'status', label: 'Status' },
                { name: 'total', label: 'Total' },
            ],
            data: [
                { status: 'active', total: '120' },
                { status: 'pending', total: '80' },
            ],
        });

        await render(TEMPLATE);

        assert.deepEqual(headers(), ['Status', 'Total']);
        assert.deepEqual(rows(), [
            ['active', '120'],
            ['pending', '80'],
        ]);
    });

    test('a missing cell value renders a not-available marker', async function (assert) {
        this.set('resource', {
            result_columns: [{ name: 'status', label: 'Status' }],
            data: [{}],
        });

        await render(TEMPLATE);

        assert.strictEqual(rows().length, 1);
        assert.notStrictEqual(rows()[0][0], '', 'an empty cell is filled with a placeholder');
    });

    test('columns with no data render headers and no rows', async function (assert) {
        this.set('resource', { result_columns: [{ name: 'status', label: 'Status' }] });

        await render(TEMPLATE);

        assert.deepEqual(headers(), ['Status']);
        assert.deepEqual(rows(), []);
    });

    test('without result columns it invites the user to run the report', async function (assert) {
        this.set('resource', {});

        await render(TEMPLATE);

        assert.dom('table').doesNotExist();
        assert.dom(this.element).containsText('No report preview');
        assert.dom(this.element).containsText('press the execute button to preview the results');
    });

    test('with no resource at all it shows the empty state', async function (assert) {
        await render(hbs`<Report::Data />`);

        assert.dom(this.element).containsText('No report preview');
    });
});
