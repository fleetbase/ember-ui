import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, blur, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const INPUT = 'input';

module('Integration | Component | key-input', function (hooks) {
    setupRenderingTest(hooks);

    let changes;
    let blurs;

    hooks.beforeEach(function () {
        changes = [];
        blurs = [];
        this.set('onChange', (value) => changes.push(value));
        this.set('onBlur', (value) => blurs.push(value));
    });

    const TEMPLATE = hbs`
        <KeyInput
            @name={{this.name}}
            @value={{this.value}}
            @type={{this.type}}
            @placeholder={{this.placeholder}}
            @required={{this.required}}
            @disabled={{this.disabled}}
            @inputClass={{this.inputClass}}
            @onChange={{this.onChange}}
            @onBlur={{this.onBlur}}
        />
    `;

    module('rendering', function () {
        test('it renders a text field with a generated id', async function (assert) {
            await render(TEMPLATE);

            assert.dom(INPUT).exists();
            assert.dom(INPUT).hasAttribute('type', 'text');
            assert.dom(INPUT).hasClass('form-input');
            assert.ok(find(INPUT).id, 'the field is addressable by a label');
        });

        test('two fields get different ids', async function (assert) {
            await render(hbs`<KeyInput /><KeyInput />`);

            const [first, second] = document.querySelectorAll('#ember-testing input');
            assert.notStrictEqual(first.id, second.id);
        });

        test('the field is prompted by its name', async function (assert) {
            this.set('name', 'API key');

            await render(TEMPLATE);

            assert.dom(INPUT).hasAttribute('placeholder', 'API key');
        });

        test('an explicit placeholder wins over the name', async function (assert) {
            this.setProperties({ name: 'API key', placeholder: 'e.g. order_status' });

            await render(TEMPLATE);

            assert.dom(INPUT).hasAttribute('placeholder', 'e.g. order_status');
        });

        test('an incoming value is shown', async function (assert) {
            this.set('value', 'order_status');

            await render(TEMPLATE);

            assert.dom(INPUT).hasValue('order_status');
        });

        test('the field type can be changed', async function (assert) {
            this.set('type', 'password');

            await render(TEMPLATE);

            assert.dom(INPUT).hasAttribute('type', 'password');
        });

        test('required and disabled states are applied', async function (assert) {
            this.setProperties({ required: true, disabled: true });

            await render(TEMPLATE);

            assert.dom(INPUT).isRequired();
            assert.dom(INPUT).isDisabled();
        });

        test('extra classes and splattributes are forwarded', async function (assert) {
            await render(hbs`<KeyInput @inputClass="my-input" data-test-key="yes" />`);

            assert.dom(INPUT).hasClass('my-input');
            assert.dom(INPUT).hasAttribute('data-test-key', 'yes');
        });
    });

    module('normalising the key', function () {
        test('typing normalises the value to an underscored key', async function (assert) {
            await render(TEMPLATE);
            await fillIn(INPUT, 'Order Status');

            assert.deepEqual(changes, ['order_status'], 'the caller receives a usable key');
        });

        test('dashes and camel case are underscored too', async function (assert) {
            await render(TEMPLATE);
            await fillIn(INPUT, 'order-status');
            await fillIn(INPUT, 'orderStatus');

            assert.deepEqual(changes, ['order_status', 'order_status']);
        });

        test('leaving the field reports the normalised key separately', async function (assert) {
            await render(TEMPLATE);
            await fillIn(INPUT, 'Order Status');
            await blur(INPUT);

            assert.deepEqual(blurs, ['order_status']);
        });

        test('it normalises happily without handlers', async function (assert) {
            await render(hbs`<KeyInput />`);
            await fillIn(INPUT, 'Order Status');
            await blur(INPUT);

            assert.dom(INPUT).exists('the field survives');
        });
    });
});
