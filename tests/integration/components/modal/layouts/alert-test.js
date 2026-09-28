import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function buttonWithText(text) {
    return [...document.querySelectorAll('button')].find((button) => button.textContent.trim().includes(text));
}

// alert is a pass-through layout: it renders Modal::Default with the options
// and the confirm/decline handlers and adds no chrome of its own. These tests
// pin that delegation rather than re-testing Modal::Default's internals.
module('Integration | Component | modal/layouts/alert', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the title from options through Modal::Default', async function (assert) {
        this.set('options', { title: 'Something went wrong' });

        await render(hbs`<Modal::Layouts::Alert @options={{this.options}} />`);

        assert.dom('.flb--default-modal').exists('it delegates to the default modal chrome');
        assert.dom('.flb--modal-header').containsText('Something went wrong');
    });

    test('it renders the default action buttons', async function (assert) {
        this.set('options', { title: 'x' });

        await render(hbs`<Modal::Layouts::Alert @options={{this.options}} />`);

        assert.ok(buttonWithText('Confirm'), 'an accept button is present');
        assert.ok(buttonWithText('Cancel'), 'a decline button is present');
    });

    test('@onConfirm is wired to the accept button', async function (assert) {
        let confirms = 0;
        this.set('options', { title: 'x' });
        this.set('onConfirm', () => confirms++);

        await render(hbs`<Modal::Layouts::Alert @options={{this.options}} @onConfirm={{this.onConfirm}} />`);
        await click(buttonWithText('Confirm'));

        assert.strictEqual(confirms, 1);
    });

    test('@onDecline is wired to the decline button', async function (assert) {
        let declines = 0;
        this.set('options', { title: 'x' });
        this.set('onDecline', () => declines++);

        await render(hbs`<Modal::Layouts::Alert @options={{this.options}} @onDecline={{this.onDecline}} />`);
        await click(buttonWithText('Cancel'));

        assert.strictEqual(declines, 1);
    });

    test('option-driven button labels are honoured', async function (assert) {
        this.set('options', { title: 'x', acceptButtonText: 'Proceed', declineButtonText: 'Abort' });

        await render(hbs`<Modal::Layouts::Alert @options={{this.options}} />`);

        assert.ok(buttonWithText('Proceed'));
        assert.ok(buttonWithText('Abort'));
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modal::Layouts::Alert />`);

        assert.dom('.flb--default-modal').exists('a bare layout still renders');
    });
});
