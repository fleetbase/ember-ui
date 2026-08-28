import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectChoose, getDropdownItems } from 'ember-power-select/test-support';

const OPTIONS = [
    { label: 'Active', value: 'active' },
    { label: 'Pending', value: 'pending' },
];

module('Integration | Component | multi-select', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('options', OPTIONS);
        // PowerSelectMultiple is controlled: the caller owns @selected, so feed the new
        // selection back or the next choice replaces rather than accumulates.
        this.set('onChange', (selection) => {
            changes.push(selection);
            this.set('selected', selection);
        });
    });

    const TEMPLATE = hbs`
        <MultiSelect
            @options={{this.options}}
            @selected={{this.selected}}
            @placeholder={{this.placeholder}}
            @selectClass={{this.selectClass}}
            @onChange={{this.onChange}}
            as |option|
        >
            {{option.label}}
        </MultiSelect>
    `;

    function selectedLabels() {
        return findAll('.ember-power-select-multiple-option').map((node) => node.textContent.replace(/[×✕]\s*/g, '').trim());
    }

    test('it renders every option through the block', async function (assert) {
        await render(TEMPLATE);

        const items = await getDropdownItems('.ember-power-select-trigger');
        assert.deepEqual(items, ['Active', 'Pending']);
    });

    test('a placeholder is shown when nothing is selected', async function (assert) {
        this.set('placeholder', 'Any status');

        await render(TEMPLATE);

        assert.dom('.ember-power-select-placeholder').hasText('Any status');
    });

    test('a select class is applied', async function (assert) {
        this.set('selectClass', 'my-select');

        await render(TEMPLATE);

        assert.dom('.ember-power-select-trigger').hasClass('my-select');
    });

    test('choosing options accumulates them and reports the selection', async function (assert) {
        await render(TEMPLATE);

        await selectChoose('.ember-power-select-trigger', 'Active');
        assert.deepEqual(changes[0], [OPTIONS[0]]);

        await selectChoose('.ember-power-select-trigger', 'Pending');
        assert.deepEqual(changes[1], [OPTIONS[0], OPTIONS[1]]);
    });

    test('a preselected list is rendered as chips', async function (assert) {
        this.set('selected', [OPTIONS[0]]);

        await render(TEMPLATE);

        assert.deepEqual(selectedLabels(), ['Active']);
    });

    test('with no options it offers nothing', async function (assert) {
        this.set('options', []);

        await render(TEMPLATE);

        const items = await getDropdownItems('.ember-power-select-trigger');
        assert.deepEqual(items, ['No results found']);
    });
});
