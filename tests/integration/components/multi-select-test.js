import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { clickTrigger } from 'ember-power-select/test-support/helpers';

module('Integration | Component | multi-select', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders options and forwards the selected item component', async function (assert) {
        this.owner.register('template:components/test-selected', hbs`<span data-test-selected>{{@option.name}}</span>`);
        this.set('options', [{ name: 'Ada' }, { name: 'Bob' }]);
        this.set('selected', [this.options[0]]);

        await render(hbs`
            <MultiSelect @options={{this.options}} @selected={{this.selected}} @selectedItemComponent={{component "test-selected"}} as |option|>
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
                @searchEnabled={{true}}
                @searchField="name"
                @searchFieldPosition="before-options"
                @searchPlaceholder="Find a person"
                as |option|
            >
                {{option.name}}
            </MultiSelect>
        `);

        await clickTrigger('.ember-power-select-trigger');
        assert.dom('.ember-power-select-search-input').hasAttribute('placeholder', 'Find a person');

        await fillIn('.ember-power-select-search-input', 'bo');
        await settled();
        assert.dom('.ember-power-select-option').exists({ count: 1 });
        assert.dom('.ember-power-select-option').hasText('Bob');
    });
});
