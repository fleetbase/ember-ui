import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modal/header', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the title and a close button by default', async function (assert) {
        await render(hbs`<Modal::Header @title="Confirm deletion" />`);

        assert.dom('.flb--modal-header').exists();
        assert.dom('.flb--modal-header').containsText('Confirm deletion');
        assert.dom('button.close').exists('a close button is shown unless suppressed');
    });

    test('it renders an empty header when no title is given', async function (assert) {
        await render(hbs`<Modal::Header />`);

        assert.dom('.flb--modal-header').exists();
        assert.dom('button.close').exists();
    });

    test('@closeButton={{false}} suppresses the close button', async function (assert) {
        await render(hbs`<Modal::Header @title="Locked" @closeButton={{false}} />`);

        assert.dom('button.close').doesNotExist();
        assert.dom('.flb--modal-header').containsText('Locked', 'the title is still rendered');
    });

    test('any value other than false keeps the close button', async function (assert) {
        await render(hbs`<Modal::Header @closeButton={{true}} />`);
        assert.dom('button.close').exists();

        await render(hbs`<Modal::Header />`);
        assert.dom('button.close').exists('undefined is not false');
    });

    test('the close button invokes onClose', async function (assert) {
        let closes = 0;
        this.set('onClose', () => closes++);

        await render(hbs`<Modal::Header @title="x" @onClose={{this.onClose}} />`);
        await click('button.close');

        assert.strictEqual(closes, 1);
    });

    test('block content replaces the default title but keeps the close button', async function (assert) {
        await render(hbs`
            <Modal::Header @title="Ignored">
                <span data-test-custom>Custom header</span>
            </Modal::Header>
        `);

        assert.dom('[data-test-custom]').hasText('Custom header');
        assert.dom('.flb--modal-header').doesNotContainText('Ignored');
        assert.dom('button.close').exists('the close button sits outside the block branch, so a plain block keeps it');
    });

    test('a plain block still honours @closeButton={{false}}', async function (assert) {
        await render(hbs`
            <Modal::Header @closeButton={{false}}>
                <span data-test-custom>Custom header</span>
            </Modal::Header>
        `);

        assert.dom('[data-test-custom]').exists();
        assert.dom('button.close').doesNotExist('opting out still works alongside a custom block');
    });

    test('a block with params yields title and close components', async function (assert) {
        let closes = 0;
        this.set('onClose', () => closes++);

        await render(hbs`
            <Modal::Header @onClose={{this.onClose}} as |header|>
                <header.title>Yielded title</header.title>
                <header.close />
            </Modal::Header>
        `);

        assert.dom('.flb--modal-header').containsText('Yielded title');

        await click('button.close');
        assert.strictEqual(closes, 1, 'the yielded close component is pre-wired to onClose');
    });

    test('it forwards splattributes to the header element', async function (assert) {
        await render(hbs`<Modal::Header @title="x" data-test-header="yes" class="extra" />`);

        assert.dom('.flb--modal-header').hasAttribute('data-test-header', 'yes');
        assert.dom('.flb--modal-header').hasClass('extra');
    });
});
