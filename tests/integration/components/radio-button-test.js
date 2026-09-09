import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const INPUT = 'input[type="radio"]';

module('Integration | Component | radio-button', function (hooks) {
    setupRenderingTest(hooks);

    module('without a block', function () {
        test('it renders a bare radio input', async function (assert) {
            this.set('selected', 'b');

            await render(hbs`<RadioButton @value="a" @groupValue={{this.selected}} />`);

            assert.dom(INPUT).exists('the input renders');
            assert.dom('label').doesNotExist('with no wrapping label');
            assert.dom(INPUT).hasValue('a');
            assert.dom(INPUT).isNotChecked('a value that is not the group value is unchecked');
        });

        test('it is checked when its value is the group value', async function (assert) {
            this.set('selected', 'a');

            await render(hbs`<RadioButton @value="a" @groupValue={{this.selected}} />`);

            assert.dom(INPUT).isChecked();
            assert.dom(INPUT).hasAttribute('aria-checked', 'true');
        });

        test('aria-checked is omitted when there is no group value to compare', async function (assert) {
            await render(hbs`<RadioButton @value="a" />`);

            assert.dom(INPUT).hasAttribute('aria-checked', 'false', 'an absent group value is simply not a match');
        });
    });

    module('with a block', function () {
        test('it wraps the input and the block in a label', async function (assert) {
            this.set('selected', 'a');

            await render(hbs`<RadioButton @value="a" @groupValue={{this.selected}} @radioId="opt-a">Option A</RadioButton>`);

            assert.dom('label.ember-radio-button').exists('the label carries the base class');
            assert.dom('label').hasAttribute('for', 'opt-a', 'and points at the input');
            assert.dom('label').containsText('Option A', 'the block is rendered');
            assert.dom(`label ${INPUT}`).exists('with the input inside it');
        });

        test('the label gains a checked class only while checked', async function (assert) {
            this.set('selected', 'b');

            await render(hbs`<RadioButton @value="a" @groupValue={{this.selected}}>A</RadioButton>`);
            assert.dom('label').doesNotHaveClass('checked');

            this.set('selected', 'a');
            assert.dom('label').hasClass('checked', 'the default checked class is applied');
        });

        test('the checked class can be overridden', async function (assert) {
            await render(hbs`<RadioButton @value="a" @groupValue="a" @checkedClass="is-selected">A</RadioButton>`);

            assert.dom('label').hasClass('is-selected');
            assert.dom('label').doesNotHaveClass('checked', 'the default is replaced, not added to');
        });

        test('extra class names are accepted as a string or an array', async function (assert) {
            this.set('classNames', 'one two');
            await render(hbs`<RadioButton @value="a" @groupValue="b" @classNames={{this.classNames}}>A</RadioButton>`);
            assert.dom('label').hasClass('one');
            assert.dom('label').hasClass('two');

            this.set('classNames', ['three', 'four']);
            assert.dom('label').hasClass('three', 'an array is joined');
            assert.dom('label').hasClass('four');
        });
    });

    module('reporting a selection', function () {
        test('choosing an unselected button reports its value', async function (assert) {
            const changes = [];
            this.set('selected', 'a');
            this.set('changed', (value) => changes.push(value));

            await render(hbs`
                <RadioButton @value="a" @groupValue={{this.selected}} @name="letter" @changed={{this.changed}} />
                <RadioButton @value="b" @groupValue={{this.selected}} @name="letter" @changed={{this.changed}} />
            `);

            await click(findAll(INPUT)[1]);

            assert.deepEqual(changes, ['b'], 'the newly selected value is reported once');
        });

        test('the already-selected button reports nothing', async function (assert) {
            const changes = [];
            this.set('changed', (value) => changes.push(value));

            await render(hbs`<RadioButton @value="a" @groupValue="a" @name="letter" @changed={{this.changed}} />`);
            await click(INPUT);

            assert.deepEqual(changes, [], 're-selecting the current value is not a change');
        });

        test('a button with no changed handler is still selectable', async function (assert) {
            await render(hbs`<RadioButton @value="a" @groupValue="b" @name="letter" />`);
            await click(INPUT);

            assert.dom(INPUT).isChecked('the handler is optional');
        });

        test('selection drives the group when the handler updates it', async function (assert) {
            this.set('selected', 'a');
            this.set('changed', (value) => this.set('selected', value));

            await render(hbs`
                <RadioButton @value="a" @groupValue={{this.selected}} @name="letter" @changed={{this.changed}}>A</RadioButton>
                <RadioButton @value="b" @groupValue={{this.selected}} @name="letter" @changed={{this.changed}}>B</RadioButton>
            `);

            await click(findAll(INPUT)[1]);

            assert.strictEqual(this.selected, 'b');
            assert.deepEqual(
                findAll('label').map((label) => label.classList.contains('checked')),
                [false, true],
                'the checked class follows the group value'
            );
        });
    });

    module('forwarded attributes', function () {
        test('identity, class and input attributes reach the input', async function (assert) {
            await render(hbs`<RadioButton @value="a" @groupValue="b" @radioId="opt-a" @radioClass="form-radio" @name="letter" @tabindex="3" @required={{true}} />`);

            assert.dom(INPUT).hasAttribute('id', 'opt-a');
            assert.dom(INPUT).hasClass('form-radio');
            assert.dom(INPUT).hasAttribute('name', 'letter');
            assert.dom(INPUT).hasAttribute('tabindex', '3');
            assert.dom(INPUT).isRequired();
        });

        test('a disabled button cannot be chosen', async function (assert) {
            const changes = [];
            this.set('changed', (value) => changes.push(value));

            await render(hbs`<RadioButton @value="a" @groupValue="b" @disabled={{true}} @changed={{this.changed}} />`);

            assert.dom(INPUT).isDisabled();
            assert.deepEqual(changes, [], 'nothing is reported');
        });

        test('aria relationships are forwarded', async function (assert) {
            await render(hbs`<RadioButton @value="a" @groupValue="b" @ariaLabelledby="label-1" @ariaDescribedby="hint-1" />`);

            assert.dom(INPUT).hasAttribute('aria-labelledby', 'label-1');
            assert.dom(INPUT).hasAttribute('aria-describedby', 'hint-1');
        });
    });

    test('non-string values are compared by identity', async function (assert) {
        const alpha = { id: 1 };
        const beta = { id: 2 };
        this.setProperties({ alpha, beta, selected: alpha });

        await render(hbs`
            <RadioButton @value={{this.alpha}} @groupValue={{this.selected}} @name="obj" />
            <RadioButton @value={{this.beta}} @groupValue={{this.selected}} @name="obj" />
        `);

        assert.true(find(INPUT).checked, 'the identical object matches');
        assert.false(findAll(INPUT)[1].checked, 'a different object with the same shape does not');
    });
    // `<RadioButtonInput>` is re-exported too, so it can be used on its own. `<RadioButton>` always
    // hands it a boolean `@checked`; a direct caller need not.
    module('the input used on its own', function () {
        test('a non-boolean checked leaves aria-checked off', async function (assert) {
            await render(hbs`<RadioButtonInput @value="a" />`);

            assert.dom(INPUT).exists();
            assert.dom(INPUT).doesNotHaveAttribute('aria-checked', 'nothing is asserted about a state it was not given');
        });

        // Clicking an already-checked radio fires no change event, so the guard's other arm is
        // only reachable when the input's checked state disagrees with the group value — which a
        // direct caller can produce and the wrapper cannot.
        test('a change on an input that already holds the group value reports nothing', async function (assert) {
            const changes = [];
            this.set('changed', (value) => changes.push(value));

            await render(hbs`<RadioButtonInput @value="a" @groupValue="a" @checked={{false}} @changed={{this.changed}} />`);
            await click(INPUT);

            assert.dom(INPUT).isChecked('the click still selects it');
            assert.deepEqual(changes, [], 'but there is no new value to report');
        });

        test('it reports a selection like the wrapper does', async function (assert) {
            const changes = [];
            this.set('changed', (value) => changes.push(value));

            await render(hbs`<RadioButtonInput @value="a" @groupValue="b" @checked={{false}} @changed={{this.changed}} />`);
            await click(INPUT);

            assert.deepEqual(changes, ['a']);
            assert.dom(INPUT).hasAttribute('aria-checked', 'false', 'a boolean checked is rendered');
        });
    });
});
