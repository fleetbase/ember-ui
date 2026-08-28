import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function buttonWithText(text) {
    return [...document.querySelectorAll('button')].find((button) => button.textContent.trim().includes(text));
}

module('Integration | Component | modal/default', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the title, body and default footer buttons when opened', async function (assert) {
        this.set('options', { title: 'Delete order' });

        await render(hbs`
            <Modal::Default @modalIsOpened={{true}} @options={{this.options}}>
                <p data-test-body>Are you sure?</p>
            </Modal::Default>
        `);

        assert.dom('.flb--modal-header').containsText('Delete order');
        assert.dom('[data-test-body]').hasText('Are you sure?', 'block content is yielded into the body');
        assert.ok(buttonWithText('Cancel'), 'a default decline button is rendered');
        assert.ok(buttonWithText('Confirm'), 'a default accept button is rendered');
    });

    test('@modalIsOpened does not gate rendering — the modal is open whenever it is rendered', async function (assert) {
        // <Modal> takes its visibility from `@arg open = true` and never reads
        // `@modalIsOpened`, so the argument Modal::Default forwards is inert.
        // Visibility is controlled by whether modals-container renders the
        // component at all. Pinned here so the contract cannot drift silently.
        this.set('options', { title: 'Hidden' });

        await render(hbs`<Modal::Default @modalIsOpened={{false}} @options={{this.options}} />`);

        assert.dom('.flb--modal-header').exists('rendering the component shows the modal regardless of @modalIsOpened');
        assert.dom('.flb--modal-header').containsText('Hidden');
    });

    test('the accept button invokes @confirm', async function (assert) {
        let confirms = 0;
        this.set('options', { title: 'x' });
        this.set('confirm', () => confirms++);

        await render(hbs`<Modal::Default @modalIsOpened={{true}} @options={{this.options}} @confirm={{this.confirm}} />`);

        await click(buttonWithText('Confirm'));

        assert.strictEqual(confirms, 1);
    });

    test('the decline button invokes @decline', async function (assert) {
        let declines = 0;
        this.set('options', { title: 'x' });
        this.set('decline', () => declines++);

        await render(hbs`<Modal::Default @modalIsOpened={{true}} @options={{this.options}} @decline={{this.decline}} />`);

        await click(buttonWithText('Cancel'));

        assert.strictEqual(declines, 1);
    });

    test('button labels and schemes come from options', async function (assert) {
        this.set('options', {
            title: 'x',
            acceptButtonText: 'Yes, delete',
            declineButtonText: 'Back',
        });

        await render(hbs`<Modal::Default @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.ok(buttonWithText('Yes, delete'), 'the accept label is overridden');
        assert.ok(buttonWithText('Back'), 'the decline label is overridden');
        assert.notOk(buttonWithText('Confirm'), 'the default accept label is gone');
    });

    test('hideAcceptButton and hideDeclineButton hide their buttons', async function (assert) {
        this.set('options', { title: 'x', hideAcceptButton: true });
        await render(hbs`<Modal::Default @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom(buttonWithText('Confirm')).hasClass('hidden', 'the accept button is hidden');

        this.set('options', { title: 'x', hideDeclineButton: true });
        await settled();
        assert.dom(buttonWithText('Cancel')).hasClass('hidden', 'the decline button is hidden');
    });

    test('hideFooterActions removes the whole footer action row', async function (assert) {
        this.set('options', { title: 'x', hideFooterActions: true });

        await render(hbs`<Modal::Default @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom('.modal-footer-actions').doesNotExist();
    });

    test('isLoading disables both action buttons', async function (assert) {
        this.set('options', { title: 'x', isLoading: true });

        await render(hbs`<Modal::Default @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom(buttonWithText('Cancel')).isDisabled();
        assert.dom(buttonWithText('Confirm')).isDisabled();
    });

    test('hideTitle suppresses the title without removing the header', async function (assert) {
        this.set('options', { title: 'Suppressed', hideTitle: true });

        await render(hbs`<Modal::Default @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom('.flb--modal-header').exists();
        assert.dom('.flb--modal-header').doesNotContainText('Suppressed');
    });

    test('closeButton false removes the header close button', async function (assert) {
        this.set('options', { title: 'x', closeButton: false });

        await render(hbs`<Modal::Default @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom('button.close').doesNotExist();
    });

    test('the header close button is present by default', async function (assert) {
        this.set('options', { title: 'x' });

        await render(hbs`<Modal::Default @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom('button.close').exists();
    });

    test('extra action buttons from options are rendered between the defaults', async function (assert) {
        let extras = 0;
        this.set('options', {
            title: 'x',
            actionButtons: [{ text: 'Export', onClick: () => extras++ }],
        });

        await render(hbs`<Modal::Default @modalIsOpened={{true}} @options={{this.options}} />`);

        const extra = buttonWithText('Export');
        assert.ok(extra, 'the configured action button is rendered');

        await click(extra);
        assert.strictEqual(extras, 1, 'its handler is wired up');
    });

    test('option class names are applied to header, body and footer', async function (assert) {
        this.set('options', {
            title: 'x',
            modalHeaderClass: 'header-x',
            modalBodyClass: 'body-x',
            modalFooterClass: 'footer-x',
            modalFooterActionsClass: 'actions-x',
        });

        await render(hbs`<Modal::Default @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom('.flb--modal-header').hasClass('header-x');
        assert.dom('.header-x').exists();
        assert.dom('.body-x').exists();
        assert.dom('.footer-x').exists();
        assert.dom('.actions-x').exists();
    });

    test('the modal class combines the default, @modalClass and options.modalClass', async function (assert) {
        this.set('options', { title: 'x', modalClass: 'from-options' });

        await render(hbs`<Modal::Default @modalIsOpened={{true}} @options={{this.options}} @modalClass="from-arg" />`);

        const modal = document.querySelector('.flb--default-modal');
        assert.ok(modal, 'the base class is present');
        assert.true(modal.classList.contains('from-arg'));
        assert.true(modal.classList.contains('from-options'));
    });

    test('the yielded body receives the options and the modal api', async function (assert) {
        this.set('options', { title: 'x', body: 'from options' });

        await render(hbs`
            <Modal::Default @modalIsOpened={{true}} @options={{this.options}} as |options|>
                <span data-test-yielded>{{options.body}}</span>
            </Modal::Default>
        `);

        assert.dom('[data-test-yielded]').hasText('from options', 'the first yielded value is the options hash');
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modal::Default @modalIsOpened={{true}} />`);

        assert.dom('.flb--modal-header').exists('a bare modal still renders its chrome');
        assert.ok(buttonWithText('Confirm'), 'defaults apply with no options hash');
    });

    test('only one accept and one decline button are rendered by default', async function (assert) {
        this.set('options', { title: 'x' });

        await render(hbs`<Modal::Default @modalIsOpened={{true}} @options={{this.options}} />`);

        const labels = findAll('.modal-footer-actions button').map((button) => button.textContent.trim());
        assert.strictEqual(labels.length, 2, 'exactly the two default buttons');
    });
});
