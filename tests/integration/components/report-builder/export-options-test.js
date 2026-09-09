import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectChoose, getDropdownItems } from 'ember-power-select/test-support';

const TRIGGER = '.ember-power-select-trigger';

function exportButton() {
    return findAll('button').find((button) => /export/i.test(button.textContent));
}

module('Integration | Component | report-builder/export-options', function (hooks) {
    setupRenderingTest(hooks);

    let exports;

    hooks.beforeEach(function () {
        exports = [];
        this.set('onExport', (format) => exports.push(format));
    });

    const TEMPLATE = hbs`<ReportBuilder::ExportOptions @disabled={{this.disabled}} @onExport={{this.onExport}} />`;

    module('rendering', function () {
        test('it offers a format picker and an export button', async function (assert) {
            await render(TEMPLATE);

            assert.ok(find(TRIGGER), 'the format picker renders');
            assert.dom(exportButton()).containsText('Export');
            assert.dom(exportButton().querySelector('svg')).hasClass('fa-download');
        });

        test('it offers csv, excel and json', async function (assert) {
            await render(TEMPLATE);

            const options = await getDropdownItems(TRIGGER);
            assert.deepEqual(
                options.map((option) => String(option).trim()),
                ['CSV', 'Excel (XLSX)', 'JSON']
            );
        });

        test('the picker shows the CSV default before anything is chosen', async function (assert) {
            await render(TEMPLATE);

            assert.dom(TRIGGER).hasText('CSV');
        });

        test('a chosen format is shown', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(TRIGGER, 'JSON');

            assert.dom(TRIGGER).containsText('JSON');
        });

        test('the export button can be disabled', async function (assert) {
            this.set('disabled', true);

            await render(TEMPLATE);

            assert.dom(exportButton()).isDisabled();
        });
    });

    module('exporting', function () {
        test('exporting after choosing a format reports that format', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(TRIGGER, 'Excel (XLSX)');
            await click(exportButton());

            assert.deepEqual(exports, ['xlsx']);
        });

        test('every format can be exported', async function (assert) {
            await render(TEMPLATE);

            await selectChoose(TRIGGER, 'CSV');
            await click(exportButton());

            await selectChoose(TRIGGER, 'JSON');
            await click(exportButton());

            assert.deepEqual(exports, ['csv', 'json']);
        });

        test('exporting without touching the picker reports the CSV default', async function (assert) {
            await render(TEMPLATE);
            await click(exportButton());

            assert.deepEqual(exports, ['csv']);
        });

        test('a disabled exporter reports nothing', async function (assert) {
            this.set('disabled', true);

            await render(TEMPLATE);

            assert.dom(exportButton()).isDisabled('the control cannot be pressed');
            assert.deepEqual(exports, []);
        });

        test('it exports happily without an onExport handler', async function (assert) {
            await render(hbs`<ReportBuilder::ExportOptions />`);
            await selectChoose(TRIGGER, 'CSV');
            await click(exportButton());

            assert.dom(TRIGGER).containsText('CSV', 'the picker survives');
        });
    });
});
