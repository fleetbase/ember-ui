import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | combo-box', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders options and selections into their respective lists with labels', async function (assert) {
        this.set('options', ['Apple', 'Banana', 'Cherry']);
        this.set('selected', ['Durian']);

        await render(hbs`<ComboBox @options={{this.options}} @selected={{this.selected}} @optionBoxLabel="Available" @selectionBoxLabel="Chosen" />`);

        assert.dom('.ui-combo-box').exists();
        assert.dom('.options-list .combo-box-option').exists({ count: 3 });
        assert.dom('.selected-list .combo-box-option').exists({ count: 1 });
        assert.dom('.options-list').containsText('Apple');
        assert.dom('.options-list').containsText('Banana');
        assert.dom('.options-list').containsText('Cherry');
        assert.dom('.selected-list').containsText('Durian');
        assert.dom('.ui-combo-box').containsText('Available');
        assert.dom('.ui-combo-box').containsText('Chosen');
    });

    test('it filters already selected options out of the options list', async function (assert) {
        this.set('options', ['Apple', 'Banana']);
        this.set('selected', ['Apple']);

        await render(hbs`<ComboBox @options={{this.options}} @selected={{this.selected}} />`);

        assert.dom('.options-list .combo-box-option').exists({ count: 1 });
        assert.dom('.options-list').containsText('Banana');
        assert.dom('.selected-list .combo-box-option').exists({ count: 1 });
        assert.dom('.selected-list').containsText('Apple');
    });

    test('it supports object options with @optionLabel and @comparator', async function (assert) {
        this.set('options', [
            { id: 1, name: 'Apple' },
            { id: 2, name: 'Banana' },
        ]);
        this.set('selected', [{ id: 1, name: 'Apple' }]);

        await render(hbs`<ComboBox @options={{this.options}} @selected={{this.selected}} @optionLabel="name" @comparator="id" />`);

        assert.dom('.options-list .combo-box-option').exists({ count: 1 });
        assert.dom('.options-list').containsText('Banana');
        assert.dom('.selected-list .combo-box-option').exists({ count: 1 });
        assert.dom('.selected-list').containsText('Apple');
    });

    test('it marks pending options when clicked and unmarks them when clicked again', async function (assert) {
        this.set('options', ['Apple', 'Banana']);
        this.set('selected', []);

        await render(hbs`<ComboBox @options={{this.options}} @selected={{this.selected}} />`);

        await click('.options-list .combo-box-option:first-child');
        assert.dom('.options-list .combo-box-option:first-child').hasClass('selected');

        await click('.options-list .combo-box-option:first-child');
        assert.dom('.options-list .combo-box-option:first-child').doesNotHaveClass('selected');
    });

    test('it moves pending options into the selection and fires @onChange', async function (assert) {
        const changes = [];
        this.set('options', ['Apple', 'Banana', 'Cherry']);
        this.set('selected', []);
        this.set('onChange', (selected) => changes.push([...selected]));

        await render(hbs`<ComboBox @options={{this.options}} @selected={{this.selected}} @onChange={{this.onChange}} />`);

        await click('.options-list .combo-box-option:first-child');
        await click('.controls button:first-child');

        assert.dom('.options-list .combo-box-option').exists({ count: 2 });
        assert.dom('.options-list').doesNotContainText('Apple');
        assert.dom('.selected-list .combo-box-option').exists({ count: 1 });
        assert.dom('.selected-list').containsText('Apple');
        assert.deepEqual(changes, [['Apple']], 'onChange called once with the new selection');
    });

    test('it moves unpending selections back into the options and fires @onChange', async function (assert) {
        const changes = [];
        this.set('options', ['Banana']);
        this.set('selected', ['Apple', 'Cherry']);
        this.set('onChange', (selected) => changes.push([...selected]));

        await render(hbs`<ComboBox @options={{this.options}} @selected={{this.selected}} @onChange={{this.onChange}} />`);

        await click('.selected-list .combo-box-option:first-child');
        assert.dom('.selected-list .combo-box-option:first-child').hasClass('selected');

        await click('.controls button:last-child');

        assert.dom('.selected-list .combo-box-option').exists({ count: 1 });
        assert.dom('.selected-list').containsText('Cherry');
        assert.dom('.options-list .combo-box-option').exists({ count: 2 });
        assert.dom('.options-list').containsText('Apple');
        assert.deepEqual(changes, [['Cherry']], 'onChange called once with the remaining selection');
    });

    test('confirming with nothing pending keeps lists intact', async function (assert) {
        this.set('options', ['Apple']);
        this.set('selected', ['Banana']);

        await render(hbs`<ComboBox @options={{this.options}} @selected={{this.selected}} />`);

        await click('.controls button:first-child');
        await click('.controls button:last-child');

        assert.dom('.options-list .combo-box-option').exists({ count: 1 });
        assert.dom('.selected-list .combo-box-option').exists({ count: 1 });
        assert.dom('.options-list').containsText('Apple');
        assert.dom('.selected-list').containsText('Banana');
    });
});
