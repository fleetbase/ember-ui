import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, triggerKeyEvent, triggerEvent } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const DIALOG = '[role="dialog"]';

module('Integration | Component | modal/dialog', function (hooks) {
    setupRenderingTest(hooks);

    let closes;

    hooks.beforeEach(function () {
        closes = [];
        this.set('onClose', () => closes.push('close'));
    });

    module('rendering', function () {
        test('it renders an accessible dialog wrapping its block', async function (assert) {
            await render(hbs`<Modal::Dialog @onClose={{this.onClose}}><p class="inside">Body</p></Modal::Dialog>`);

            assert.dom(DIALOG).exists();
            assert.dom(DIALOG).hasClass('flb--modal');
            assert.dom(DIALOG).hasAttribute('tabindex', '-1');
            assert.dom('.flb--modal-dialog').exists();
            assert.dom('.flb--modal-content .inside').hasText('Body');
        });

        test('the fade, show and in-dom flags drive the modal classes', async function (assert) {
            await render(hbs`<Modal::Dialog @fade={{true}} @showModal={{true}} @inDom={{true}} />`);

            assert.dom(DIALOG).hasClass('fade');
            assert.dom(DIALOG).hasClass('show');
            assert.dom(DIALOG).hasClass('block');
            assert.strictEqual(find(DIALOG).style.display, 'block');
        });

        test('a hidden dialog has no display style', async function (assert) {
            await render(hbs`<Modal::Dialog />`);

            assert.dom(DIALOG).doesNotHaveClass('block');
            assert.strictEqual(find(DIALOG).style.display, '');
        });

        test('the scrollbar padding is applied', async function (assert) {
            await render(hbs`<Modal::Dialog @paddingLeft={{15}} @paddingRight={{20}} />`);

            assert.strictEqual(find(DIALOG).style.paddingLeft, '15px');
            assert.strictEqual(find(DIALOG).style.paddingRight, '20px');
        });

        test('a size becomes a size class', async function (assert) {
            await render(hbs`<Modal::Dialog @size="lg" />`);

            assert.dom('.flb--modal-dialog').hasClass('flb--modal-lg');
        });

        test('no size leaves the dialog unsized', async function (assert) {
            await render(hbs`<Modal::Dialog />`);

            const classes = find('.flb--modal-dialog').className;
            assert.false(/flb--modal-(sm|lg|xl)/.test(classes), `"${classes}" carries no size class`);
        });

        test('centered and scrollable are opt-in', async function (assert) {
            await render(hbs`<Modal::Dialog @centered={{true}} @scrollable={{true}} />`);

            assert.dom('.flb--modal-dialog').hasClass('flb--modal-dialog-centered');
            assert.dom('.flb--modal-dialog').hasClass('flb--modal-dialog-scrollable');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<Modal::Dialog class="flb-resource-modal" data-test-dialog="yes" />`);

            assert.dom(DIALOG).hasClass('flb-resource-modal');
            assert.dom(DIALOG).hasAttribute('data-test-dialog', 'yes');
        });
    });

    module('the accessible title', function () {
        test('a title with no id of its own is given one and labels the dialog', async function (assert) {
            await render(hbs`<Modal::Dialog><h5 class="flb--modal-title">Delete order</h5></Modal::Dialog>`);

            const titleId = find('.flb--modal-title').id;
            assert.ok(titleId, 'the title is given an id');
            assert.dom(DIALOG).hasAttribute('aria-labelledby', titleId);
        });

        test('a title with its own id keeps it', async function (assert) {
            await render(hbs`<Modal::Dialog><h5 id="my-title" class="flb--modal-title">Delete order</h5></Modal::Dialog>`);

            assert.dom(DIALOG).hasAttribute('aria-labelledby', 'my-title');
        });

        test('a dialog with no title is not labelled', async function (assert) {
            await render(hbs`<Modal::Dialog><p>No title here</p></Modal::Dialog>`);

            assert.dom(DIALOG).doesNotHaveAttribute('aria-labelledby');
        });
    });

    test('an autofocus element inside a visible dialog is focused', async function (assert) {
        // The autofocus attribute is the input this test exercises: setInitialFocus() looks for
        // `[autofocus]`. Disabled for this template only.
        await render(hbs`
            {{! template-lint-disable no-autofocus-attribute }}
            <Modal::Dialog @inDom={{true}} @showModal={{true}}><input type="text" class="first" autofocus /></Modal::Dialog>
        `);

        assert.dom('input.first').isFocused();
    });

    test('a dialog with nothing to autofocus leaves focus alone', async function (assert) {
        await render(hbs`<Modal::Dialog @inDom={{true}} @showModal={{true}}><p>No fields</p></Modal::Dialog>`);

        assert.dom('input').doesNotExist();
        assert.dom('p').hasText('No fields');
    });

    module('closing', function () {
        test('escape closes the dialog when the keyboard is enabled', async function (assert) {
            await render(hbs`<Modal::Dialog @keyboard={{true}} @onClose={{this.onClose}} />`);
            await triggerKeyEvent(DIALOG, 'keydown', 27);

            assert.deepEqual(closes, ['close']);
        });

        test('escape is ignored when the keyboard is disabled', async function (assert) {
            await render(hbs`<Modal::Dialog @onClose={{this.onClose}} />`);
            await triggerKeyEvent(DIALOG, 'keydown', 27);

            assert.deepEqual(closes, []);
        });

        test('another key never closes the dialog', async function (assert) {
            await render(hbs`<Modal::Dialog @keyboard={{true}} @onClose={{this.onClose}} />`);
            await triggerKeyEvent(DIALOG, 'keydown', 13);

            assert.deepEqual(closes, []);
        });

        test('escape with no handler does not throw', async function (assert) {
            await render(hbs`<Modal::Dialog @keyboard={{true}} />`);
            await triggerKeyEvent(DIALOG, 'keydown', 27);

            assert.dom(DIALOG).exists('the dialog survives');
        });

        test('clicking the backdrop closes the dialog when that is allowed', async function (assert) {
            await render(hbs`<Modal::Dialog @backdropClose={{true}} @onClose={{this.onClose}} />`);
            await click(DIALOG);

            assert.deepEqual(closes, ['close']);
        });

        test('clicking the backdrop is ignored when that is not allowed', async function (assert) {
            await render(hbs`<Modal::Dialog @onClose={{this.onClose}} />`);
            await click(DIALOG);

            assert.deepEqual(closes, []);
        });

        test('clicking inside the dialog never closes it', async function (assert) {
            await render(hbs`<Modal::Dialog @backdropClose={{true}} @onClose={{this.onClose}}><button type="button" class="inside">Do</button></Modal::Dialog>`);
            await click('.inside');

            assert.deepEqual(closes, [], 'only the backdrop itself closes the dialog');
        });

        test('a drag that starts inside and ends on the backdrop does not close it', async function (assert) {
            await render(hbs`<Modal::Dialog @backdropClose={{true}} @onClose={{this.onClose}}><input type="text" class="inside" /></Modal::Dialog>`);

            // Select text inside the dialog and release the button over the backdrop.
            await triggerEvent('.inside', 'mousedown');
            await triggerEvent(DIALOG, 'mouseup');
            await click(DIALOG);

            assert.deepEqual(closes, [], 'the stray backdrop click is swallowed');
        });

        test('the swallowed click only applies once', async function (assert) {
            await render(hbs`<Modal::Dialog @backdropClose={{true}} @onClose={{this.onClose}}><input type="text" class="inside" /></Modal::Dialog>`);

            await triggerEvent('.inside', 'mousedown');
            await triggerEvent(DIALOG, 'mouseup');
            await click(DIALOG);
            assert.deepEqual(closes, []);

            await click(DIALOG);
            assert.deepEqual(closes, ['close'], 'the next genuine backdrop click closes the dialog');
        });

        test('a mouseup that did not start inside leaves the backdrop click alone', async function (assert) {
            await render(hbs`<Modal::Dialog @backdropClose={{true}} @onClose={{this.onClose}} />`);

            await triggerEvent(DIALOG, 'mousedown');
            await triggerEvent(DIALOG, 'mouseup');
            await click(DIALOG);

            assert.deepEqual(closes, ['close']);
        });
    });
});
