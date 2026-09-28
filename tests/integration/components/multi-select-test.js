import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, findAll, fillIn } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectChoose, getDropdownItems } from 'ember-power-select/test-support';
import { clickTrigger } from 'ember-power-select/test-support/helpers';

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

    module('forwarding power-select options', function (nested) {
        nested.beforeEach(function () {
            this.set('noop', () => {});
        });

        test('it renders options and forwards the selected item component', async function (assert) {
            this.owner.register('template:components/test-selected', hbs`<span data-test-selected>{{@option.name}}</span>`);
            this.set('options', [{ name: 'Ada' }, { name: 'Bob' }]);
            this.set('selected', [this.options[0]]);

            await render(hbs`
                <MultiSelect @options={{this.options}} @selected={{this.selected}} @onChange={{this.noop}} @selectedItemComponent={{component "test-selected"}} as |option|>
                    {{option.name}}
                </MultiSelect>
            `);

            assert.dom('[data-test-selected]').hasText('Ada');
        });

        test('it forwards the search field, position and placeholder', async function (assert) {
            this.set('options', [{ name: 'Ada' }, { name: 'Bob' }]);
            this.set('selected', []);

            await render(hbs`
                <MultiSelect
                    @options={{this.options}}
                    @selected={{this.selected}}
                    @onChange={{this.noop}}
                    @searchEnabled={{true}}
                    @searchField="name"
                    @searchFieldPosition="before-options"
                    @searchPlaceholder="Find a person"
                    as |option|
                >
                    {{option.name}}
                </MultiSelect>
            `);

            await clickTrigger();
            assert.dom('.ember-power-select-search-input').hasAttribute('placeholder', 'Find a person');

            await fillIn('.ember-power-select-search-input', 'bo');
            assert.dom('.ember-power-select-option').exists({ count: 1 });
            assert.dom('.ember-power-select-option').hasText('Bob');
        });
    });
});
