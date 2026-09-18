import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modal/footer', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a single primary dismiss button by default', async function (assert) {
        await render(hbs`<Modal::Footer />`);

        assert.dom('.flb--modal-footer').exists();
        assert.strictEqual(findAll('button').length, 1, 'only a dismiss button is shown without a submit title');
        assert.dom('button').hasText('Ok', 'the default dismiss label is Ok');
    });

    test('@closeTitle renames the dismiss button', async function (assert) {
        await render(hbs`<Modal::Footer @closeTitle="Dismiss" />`);

        assert.dom('button').hasText('Dismiss');
    });

    test('@submitTitle adds a second, primary submit button', async function (assert) {
        await render(hbs`<Modal::Footer @submitTitle="Save" />`);

        const buttons = findAll('button');
        assert.strictEqual(buttons.length, 2);
        assert.dom(buttons[0]).hasText('Ok', 'the dismiss button comes first');
        assert.dom(buttons[1]).hasText('Save');
    });

    test('the dismiss button invokes onClose', async function (assert) {
        let closes = 0;
        this.set('onClose', () => closes++);

        await render(hbs`<Modal::Footer @onClose={{this.onClose}} />`);
        await click('button');

        assert.strictEqual(closes, 1);
    });

    test('the submit button invokes onSubmit and the dismiss button invokes onClose', async function (assert) {
        const calls = [];
        this.set('onClose', () => calls.push('close'));
        this.set('onSubmit', () => calls.push('submit'));

        await render(hbs`<Modal::Footer @submitTitle="Save" @onClose={{this.onClose}} @onSubmit={{this.onSubmit}} />`);

        const buttons = findAll('button');
        await click(buttons[1]);
        await click(buttons[0]);

        assert.deepEqual(calls, ['submit', 'close']);
    });

    test('@submitDisabled disables the submit button', async function (assert) {
        await render(hbs`<Modal::Footer @submitTitle="Save" @submitDisabled={{true}} />`);

        assert.dom(findAll('button')[1]).isDisabled();
    });

    test('the submit button is enabled by default', async function (assert) {
        await render(hbs`<Modal::Footer @submitTitle="Save" />`);

        assert.dom(findAll('button')[1]).isNotDisabled();
    });

    test('block content replaces both default buttons', async function (assert) {
        await render(hbs`
            <Modal::Footer @submitTitle="Ignored">
                <button type="button" data-test-custom>Only mine</button>
            </Modal::Footer>
        `);

        const buttons = findAll('button');
        assert.strictEqual(buttons.length, 1);
        assert.dom('[data-test-custom]').hasText('Only mine');
    });

    test('it forwards splattributes to the footer element', async function (assert) {
        await render(hbs`<Modal::Footer data-test-footer="yes" class="extra" />`);

        assert.dom('.flb--modal-footer').hasAttribute('data-test-footer', 'yes');
        assert.dom('.flb--modal-footer').hasClass('extra');
    });

    test('it renders without throwing when no handlers are supplied', async function (assert) {
        await render(hbs`<Modal::Footer @submitTitle="Save" />`);

        await click(findAll('button')[1]);
        await click(findAll('button')[0]);

        assert.dom('.flb--modal-footer').exists('clicking with no handlers is inert');
    });
});
