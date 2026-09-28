import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// <Select> here receives no @optionLabel/@optionValue, so its contract is plain values.
const FORMATS = ['csv', 'json', 'xlsx'];

module('Integration | Component | modals/export-report', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('options', { rowCount: 250, formatOptions: FORMATS });
    });

    const TEMPLATE = hbs`<Modals::ExportReport @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it reports how many rows will be exported', async function (assert) {
        await render(TEMPLATE);

        assert.dom(this.element).containsText('Export');
        assert.dom(this.element).containsText('250');
        assert.dom(this.element).containsText('rows of data in your preferred format');
    });

    test('it offers a required format picker listing every format', async function (assert) {
        await render(TEMPLATE);

        assert.dom(this.element).containsText('Export Format');

        const labels = findAll('option').map((option) => option.textContent.trim());
        assert.true(labels.includes('Select export format...'));
        assert.true(labels.includes('csv'));
        assert.true(labels.includes('json'));
    });

    test('it offers a file name field with a hint about the extension', async function (assert) {
        await render(TEMPLATE);

        assert.dom(this.element).containsText('File Name');
        assert.dom('input').hasAttribute('placeholder', 'report-export');
        assert.dom(this.element).containsText('File extension will be added automatically');
    });

    test('typing a file name writes it back to the options', async function (assert) {
        const options = { rowCount: 10, formatOptions: FORMATS };
        this.set('options', options);

        await render(TEMPLATE);
        await fillIn('input', 'quarterly-orders');

        assert.strictEqual(options.fileName, 'quarterly-orders');
    });

    module('format guidance', function () {
        test('no guidance is shown before a format is chosen', async function (assert) {
            await render(TEMPLATE);

            assert.dom(this.element).doesNotContainText('CSV Export Options');
            assert.dom(this.element).doesNotContainText('JSON Export Options');
        });

        test('choosing csv explains the spreadsheet format', async function (assert) {
            this.set('options', { rowCount: 10, formatOptions: FORMATS, format: 'csv' });

            await render(TEMPLATE);

            assert.dom(this.element).containsText('CSV Export Options');
            assert.dom(this.element).containsText('comma-separated values');
            assert.dom(this.element).doesNotContainText('JSON Export Options');
        });

        test('choosing json explains the structured format', async function (assert) {
            this.set('options', { rowCount: 10, formatOptions: FORMATS, format: 'json' });

            await render(TEMPLATE);

            assert.dom(this.element).containsText('JSON Export Options');
            assert.dom(this.element).containsText('suitable for API consumption');
            assert.dom(this.element).doesNotContainText('CSV Export Options');
        });

        test('a format with no guidance shows neither panel', async function (assert) {
            this.set('options', { rowCount: 10, formatOptions: FORMATS, format: 'xlsx' });

            await render(TEMPLATE);

            assert.dom(this.element).doesNotContainText('CSV Export Options');
            assert.dom(this.element).doesNotContainText('JSON Export Options');
        });
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modals::ExportReport />`);

        assert.ok(find('select'), 'the format picker still renders');
        assert.dom(this.element).doesNotContainText('undefined');
    });
});
