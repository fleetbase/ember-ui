import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// The modal passes formatOptions straight to <Select> with no @optionLabel/@optionValue,
// so the contract is a list of plain values.
const FORMATS = ['csv', 'xlsx'];

module('Integration | Component | modals/export-form', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Modals::ExportForm @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it offers a labelled format picker', async function (assert) {
        this.set('options', { formatOptions: FORMATS });

        await render(TEMPLATE);

        assert.dom('.modal-body-container label').hasText('Format');
        assert.ok(find('select'), 'a picker is rendered');
    });

    test('every format option is listed alongside the placeholder', async function (assert) {
        this.set('options', { formatOptions: FORMATS });

        await render(TEMPLATE);

        const labels = findAll('option').map((option) => option.textContent.trim());
        assert.true(labels.includes('Select export format...'));
        assert.true(labels.includes('csv'));
        assert.true(labels.includes('xlsx'));
    });

    test('the currently chosen format is selected', async function (assert) {
        this.set('options', { formatOptions: FORMATS, format: 'xlsx' });

        await render(TEMPLATE);

        assert.dom('select').hasValue('xlsx');
    });

    test('it renders with no format options', async function (assert) {
        this.set('options', {});

        await render(TEMPLATE);

        assert.ok(find('select'), 'the picker still renders');
    });
});
