import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modal/layouts/option-prompt', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a radio button per prompt option', async function (assert) {
        this.set('options', { title: 'Pick one', promptOptions: ['first_choice', 'second_choice'] });

        await render(hbs`<Modal::Layouts::OptionPrompt @options={{this.options}} />`);

        assert.strictEqual(findAll('input[type="radio"]').length, 2);
    });

    test('it humanizes each option label', async function (assert) {
        this.set('options', { title: 'Pick one', promptOptions: ['first_choice'] });

        await render(hbs`<Modal::Layouts::OptionPrompt @options={{this.options}} />`);

        assert.dom(this.element).containsText('First choice', 'the raw enum value is humanized to sentence case for display');
        assert.dom(this.element).doesNotContainText('first_choice');
    });

    test('the radios share a group name so only one can be chosen', async function (assert) {
        this.set('options', { title: 'x', promptOptions: ['a', 'b'] });

        await render(hbs`<Modal::Layouts::OptionPrompt @options={{this.options}} />`);

        const names = findAll('input[type="radio"]').map((input) => input.name);
        assert.deepEqual(names, ['option', 'option'], 'both radios belong to one group');
    });

    test('each radio gets an index-based id', async function (assert) {
        this.set('options', { title: 'x', promptOptions: ['a', 'b'] });

        await render(hbs`<Modal::Layouts::OptionPrompt @options={{this.options}} />`);

        const ids = findAll('input[type="radio"]').map((input) => input.id);
        assert.deepEqual(ids, ['option_0', 'option_1']);
    });

    test('the option matching options.selected is checked', async function (assert) {
        this.set('options', { title: 'x', promptOptions: ['a', 'b'], selected: 'b' });

        await render(hbs`<Modal::Layouts::OptionPrompt @options={{this.options}} />`);

        const radios = findAll('input[type="radio"]');
        assert.dom(radios[0]).isNotChecked();
        assert.dom(radios[1]).isChecked('the pre-selected value is reflected');
    });

    test('nothing is checked when selected does not match an option', async function (assert) {
        this.set('options', { title: 'x', promptOptions: ['a', 'b'], selected: 'not-present' });

        await render(hbs`<Modal::Layouts::OptionPrompt @options={{this.options}} />`);

        for (const radio of findAll('input[type="radio"]')) {
            assert.dom(radio).isNotChecked();
        }
    });

    test('choosing an option writes it back to options.selected', async function (assert) {
        this.set('options', { title: 'x', promptOptions: ['a', 'b'] });

        await render(hbs`<Modal::Layouts::OptionPrompt @options={{this.options}} />`);
        await click(findAll('input[type="radio"]')[1]);

        assert.strictEqual(this.options.selected, 'b', 'the selection is written through the mut binding');
    });

    test('changing the selection replaces the previous one', async function (assert) {
        this.set('options', { title: 'x', promptOptions: ['a', 'b'], selected: 'a' });

        await render(hbs`<Modal::Layouts::OptionPrompt @options={{this.options}} />`);
        await click(findAll('input[type="radio"]')[1]);

        assert.strictEqual(this.options.selected, 'b');
        assert.dom(findAll('input[type="radio"]')[0]).isNotChecked('the previous choice is cleared');
    });

    test('it renders no radios when promptOptions is empty or missing', async function (assert) {
        this.set('options', { title: 'x', promptOptions: [] });
        await render(hbs`<Modal::Layouts::OptionPrompt @options={{this.options}} />`);
        assert.dom('input[type="radio"]').doesNotExist('an empty list renders no radios');

        this.set('options', { title: 'x' });
        assert.dom('input[type="radio"]').doesNotExist('a missing list is treated as empty');
    });

    test('it still renders the surrounding modal chrome', async function (assert) {
        this.set('options', { title: 'Pick one', promptOptions: ['a'] });

        await render(hbs`<Modal::Layouts::OptionPrompt @options={{this.options}} />`);

        assert.dom('.flb--default-modal').exists();
        assert.dom('.flb--modal-header').containsText('Pick one');
    });
});
