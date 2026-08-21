import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modal/header/close', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders an accessible close button', async function (assert) {
        await render(hbs`<Modal::Header::Close />`);

        assert.dom('button').exists();
        assert.dom('button').hasAttribute('type', 'button', 'it never submits an enclosing form');
        assert.dom('button').hasAttribute('aria-label', 'Close', 'it is labelled for assistive tech');
        assert.dom('button').hasClass('close');
    });

    test('the times glyph is hidden from assistive tech', async function (assert) {
        await render(hbs`<Modal::Header::Close />`);

        assert.dom('button span').hasAttribute('aria-hidden', 'true', 'the decorative glyph is not announced');
        assert.dom('button span').hasText('×');
    });

    test('clicking invokes onClick', async function (assert) {
        let clicks = 0;
        this.set('onClick', () => clicks++);

        await render(hbs`<Modal::Header::Close @onClick={{this.onClick}} />`);
        await click('button');

        assert.strictEqual(clicks, 1);
    });

    test('clicking without an onClick is a safe no-op', async function (assert) {
        await render(hbs`<Modal::Header::Close />`);
        await click('button');

        assert.dom('button').exists('the noop fallback keeps the click from throwing');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Modal::Header::Close data-test-close="yes" class="extra" />`);

        assert.dom('button').hasAttribute('data-test-close', 'yes');
        assert.dom('button').hasClass('extra');
        assert.dom('button').hasClass('close', 'the base class is preserved alongside the passed one');
    });

    test('repeated clicks each invoke the handler', async function (assert) {
        let clicks = 0;
        this.set('onClick', () => clicks++);

        await render(hbs`<Modal::Header::Close @onClick={{this.onClick}} />`);
        await click('button');
        await click('button');
        await click('button');

        assert.strictEqual(clicks, 3);
    });
});
