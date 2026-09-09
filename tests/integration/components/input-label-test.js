import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | input-label', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the label text', async function (assert) {
        await render(hbs`<InputLabel @labelText="Driver name" />`);

        assert.dom('label').hasText('Driver name');
        assert.dom('label').doesNotHaveClass('required');
    });

    test('a required field is marked', async function (assert) {
        await render(hbs`<InputLabel @labelText="Driver name" @required={{true}} />`);

        assert.dom('label').hasClass('required');
    });

    test('no help icon is shown without help text', async function (assert) {
        await render(hbs`<InputLabel @labelText="Driver name" />`);

        assert.strictEqual(find('svg'), null, 'nothing extra is rendered');
    });

    test('help text adds an icon', async function (assert) {
        await render(hbs`<InputLabel @labelText="Driver name" @helpText="The name shown on the manifest" />`);

        assert.ok(find('svg'), 'an info icon is offered');
        assert.dom('svg').hasClass('fa-circle-info', 'the default info icon is used');
    });

    test('the help icon can be replaced', async function (assert) {
        await render(hbs`<InputLabel @labelText="Driver name" @helpText="Help" @icon="circle-question" @iconClass="text-red-500" />`);

        assert.dom('svg').hasClass('fa-circle-question');
        assert.dom('svg').hasClass('text-red-500');
    });

    test('the wrapper accepts extra classes and the label takes splattributes', async function (assert) {
        await render(hbs`<InputLabel @labelText="Driver name" @wrapperClass="mb-4" for="driver-name" />`);

        assert.dom('div.mb-4').exists('the wrapper is styled');
        assert.dom('label').hasAttribute('for', 'driver-name');
    });

    test('it renders with no arguments at all', async function (assert) {
        await render(hbs`<InputLabel />`);

        assert.dom('label').hasText('');
        assert.strictEqual(find('svg'), null);
    });
});
