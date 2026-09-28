import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | safe-dasherize', function (hooks) {
    setupRenderingTest(hooks);

    test('it dasherizes camel case strings', async function (assert) {
        this.set('value', 'HelloWorld');

        await render(hbs`{{safe-dasherize this.value}}`);

        assert.dom(this.element).hasText('hello-world');
    });

    test('it dasherizes underscores and spaces', async function (assert) {
        this.set('underscored', 'first_name');
        this.set('spaced', 'Hello World');

        await render(hbs`{{safe-dasherize this.underscored}}|{{safe-dasherize this.spaced}}`);

        assert.dom(this.element).hasText('first-name|hello-world');
    });

    test('it lowercases fully uppercase input', async function (assert) {
        this.set('value', 'ORDER_ID');

        await render(hbs`{{safe-dasherize this.value}}`);

        assert.dom(this.element).hasText('order-id');
    });

    test('it handles mixed camel case, digits and acronyms', async function (assert) {
        this.set('value', 'apiKeyV2');

        await render(hbs`{{safe-dasherize this.value}}`);

        assert.dom(this.element).hasText('api-key-v2');
    });

    test('it leaves an already dasherized string unchanged', async function (assert) {
        this.set('value', 'already-dasherized');

        await render(hbs`{{safe-dasherize this.value}}`);

        assert.dom(this.element).hasText('already-dasherized');
    });

    test('it converts each consecutive separator into its own dash', async function (assert) {
        this.set('value', 'a  b');

        await render(hbs`{{safe-dasherize this.value}}`);

        assert.strictEqual(this.element.textContent.trim(), 'a--b');
    });

    test('it coerces undefined and null to their string form instead of throwing', async function (assert) {
        this.set('nullValue', null);

        await render(hbs`{{safe-dasherize this.missing}}|{{safe-dasherize this.nullValue}}`);

        assert.dom(this.element).hasText('undefined|null');
    });

    test('it coerces numbers and booleans', async function (assert) {
        this.set('zero', 0);
        this.set('negative', -12);
        this.set('bool', true);

        await render(hbs`{{safe-dasherize this.zero}}|{{safe-dasherize this.negative}}|{{safe-dasherize this.bool}}`);

        assert.dom(this.element).hasText('0|-12|true');
    });

    test('it renders nothing for an empty string', async function (assert) {
        this.set('value', '');

        await render(hbs`{{safe-dasherize this.value}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it preserves unicode characters while dasherizing', async function (assert) {
        this.set('value', 'Städte Straße');

        await render(hbs`{{safe-dasherize this.value}}`);

        assert.dom(this.element).hasText('städte-straße');
    });

    test('it is usable inside a class attribute', async function (assert) {
        this.set('value', 'Order Status');

        await render(hbs`<span class="badge {{safe-dasherize this.value}}"></span>`);

        assert.dom('.badge').hasClass('order-status');
    });
});
