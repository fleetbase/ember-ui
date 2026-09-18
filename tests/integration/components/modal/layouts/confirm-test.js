import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function buttonWithText(text) {
    return [...document.querySelectorAll('button')].find((button) => button.textContent.trim().includes(text));
}

module('Integration | Component | modal/layouts/confirm', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the title inside the confirmation body', async function (assert) {
        this.set('options', { title: 'Delete this order?' });

        await render(hbs`<Modal::Layouts::Confirm @options={{this.options}} />`);

        assert.dom('#modal-headline').hasText('Delete this order?', 'the headline is labelled for the dialog');
    });

    test('it omits the body paragraph when no body is given', async function (assert) {
        this.set('options', { title: 'Delete?' });

        await render(hbs`<Modal::Layouts::Confirm @options={{this.options}} />`);

        assert.dom('#modal-headline + .mt-2').doesNotExist('no body block is rendered');
    });

    test('it renders the body text when supplied', async function (assert) {
        this.set('options', { title: 'Delete?', body: 'This cannot be undone.' });

        await render(hbs`<Modal::Layouts::Confirm @options={{this.options}} />`);

        assert.dom(this.element).containsText('This cannot be undone.');
    });

    test('the layout aligns to the top when there is a body and centers when there is not', async function (assert) {
        this.set('options', { title: 'Delete?' });
        await render(hbs`<Modal::Layouts::Confirm @options={{this.options}} />`);
        assert.dom('.flb--default-modal .items-center').exists('a title-only dialog is vertically centered');

        this.set('options', { title: 'Delete?', body: 'Careful.' });
        assert.dom('.flb--default-modal .items-start').exists('adding a body switches to top alignment');
    });

    test('it shows the default warning glyph when no icon is configured', async function (assert) {
        this.set('options', { title: 'Delete?' });

        await render(hbs`<Modal::Layouts::Confirm @options={{this.options}} />`);

        assert.dom('svg.text-red-600').exists('the built-in warning triangle is used');
    });

    test('a configured icon replaces the default glyph', async function (assert) {
        this.set('options', { title: 'Delete?', icon: 'trash', iconClass: 'text-red-500' });

        await render(hbs`<Modal::Layouts::Confirm @options={{this.options}} />`);

        assert.dom('.fa-trash').exists('the configured icon is rendered');
        assert.dom('svg.text-red-600').doesNotExist('the default glyph is replaced, not added to');
        assert.dom('.fa-trash').hasClass('text-red-500');
    });

    test('@onConfirm is wired to the accept button', async function (assert) {
        let confirms = 0;
        this.set('options', { title: 'x' });
        this.set('onConfirm', () => confirms++);

        await render(hbs`<Modal::Layouts::Confirm @options={{this.options}} @onConfirm={{this.onConfirm}} />`);
        await click(buttonWithText('Confirm'));

        assert.strictEqual(confirms, 1);
    });

    test('@onDecline is wired to the decline button', async function (assert) {
        let declines = 0;
        this.set('options', { title: 'x' });
        this.set('onDecline', () => declines++);

        await render(hbs`<Modal::Layouts::Confirm @options={{this.options}} @onDecline={{this.onDecline}} />`);
        await click(buttonWithText('Cancel'));

        assert.strictEqual(declines, 1);
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modal::Layouts::Confirm />`);

        assert.dom('.flb--default-modal').exists();
        assert.dom('#modal-headline').hasText('', 'a missing title renders an empty headline rather than crashing');
    });
});
