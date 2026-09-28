import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | input-group', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a labelled text input', async function (assert) {
        await render(hbs`<InputGroup @name="Tracking number" />`);

        assert.dom('.input-group').exists();
        assert.dom('label').containsText('Tracking number');
        assert.dom('input').hasAttribute('type', 'text');
        assert.dom('input').hasAttribute('placeholder', 'Tracking number', 'the name doubles as the placeholder');
        assert.strictEqual(find('label').getAttribute('for'), find('input').id, 'the label is wired to the input');
    });

    test('the generated id is derived from the name', async function (assert) {
        await render(hbs`<InputGroup @name="Order.reference/number" />`);

        assert.true(find('input').id.startsWith('orderreferencenumber_'), `${find('input').id} is camelized from the name`);
    });

    test('a group without a name still generates a usable id', async function (assert) {
        await render(hbs`<InputGroup @value="x" />`);

        assert.true(find('input').id.startsWith('_ember'), 'the id falls back to the component guid');
        assert.dom('label').doesNotExist('no name means no label');
    });

    test('the label can be hidden', async function (assert) {
        await render(hbs`<InputGroup @name="Tracking number" @hideLabel={{true}} />`);

        assert.dom('label').doesNotExist();
        assert.dom('input').exists('the input is still rendered');
    });

    test('the input type and placeholder can be overridden', async function (assert) {
        await render(hbs`<InputGroup @name="Email" @type="email" @placeholder="you@example.com" />`);

        assert.dom('input').hasAttribute('type', 'email');
        assert.dom('input').hasAttribute('placeholder', 'you@example.com');
    });

    test('typing writes back to the bound value', async function (assert) {
        this.set('value', '');

        await render(hbs`<InputGroup @name="Tracking number" @value={{this.value}} />`);
        await fillIn('input', 'TRK-9001');

        assert.strictEqual(this.value, 'TRK-9001');
    });

    test('required, disabled and autocomplete are forwarded', async function (assert) {
        await render(hbs`<InputGroup @name="Email" @required={{true}} @disabled={{true}} @autocomplete="email" />`);

        assert.dom('input').isRequired();
        assert.dom('input').isDisabled();
        assert.dom('input').hasAttribute('autocomplete', 'email');
    });

    test('help text is passed through to the label', async function (assert) {
        await render(hbs`<InputGroup @name="Email" @helpText="We never share it" />`);

        assert.dom('.ember-attacher').exists('the label renders a help tooltip');
    });

    test('a block replaces the default input and receives the id and name', async function (assert) {
        await render(hbs`
            <InputGroup @name="Currency" as |id name|>
                <select id={{id}} class="custom"><option>{{name}}</option></select>
            </InputGroup>
        `);

        assert.dom('input').doesNotExist('the default input is skipped');
        assert.dom('select.custom option').hasText('Currency');
        assert.strictEqual(find('label').getAttribute('for'), find('select.custom').id, 'the yielded id matches the label');
    });

    test('every class hook is applied', async function (assert) {
        await render(hbs`<InputGroup @name="Email" @wrapperClass="my-wrapper" @inputClass="my-input" @labelClass="my-label" @labelWrapperClass="my-label-wrapper" />`);

        assert.dom('.input-group').hasClass('my-wrapper');
        assert.dom('input').hasClass('my-input');
        assert.dom('label').hasClass('my-label');
        assert.dom('.my-label-wrapper').exists();
    });

    test('splattributes reach the default input', async function (assert) {
        await render(hbs`<InputGroup @name="Email" data-test-input="yes" />`);

        assert.dom('input').hasAttribute('data-test-input', 'yes');
    });
});
