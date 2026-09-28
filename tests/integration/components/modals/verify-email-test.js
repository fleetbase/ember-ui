import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/verify-email', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Modals::VerifyEmail @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it explains what will happen', async function (assert) {
        this.set('options', { email: 'ron@example.test' });

        await render(TEMPLATE);

        assert.dom(this.element).containsText('Verify your email address.');
        assert.dom(this.element).containsText('click Send to continue');
    });

    test('before sending it asks for the email address', async function (assert) {
        this.set('options', { email: 'ron@example.test' });

        await render(TEMPLATE);

        assert.dom('input').hasAttribute('type', 'email');
        assert.dom('input').hasValue('ron@example.test');
        assert.dom(this.element).containsText('confirm your email address is correct');
    });

    test('once sent it asks for the verification code instead', async function (assert) {
        this.set('options', { email: 'ron@example.test', sent: true, code: '' });

        await render(TEMPLATE);

        assert.dom('input').hasAttribute('type', 'tel');
        assert.dom(this.element).containsText('Enter verification code');
        assert.dom(this.element).containsText('please check spam if not in inbox');
        assert.dom(this.element).doesNotContainText('confirm your email address is correct');
    });

    test('editing the address writes it back to the options', async function (assert) {
        const options = { email: 'ron@example.test' };
        this.set('options', options);

        await render(TEMPLATE);
        await fillIn('input', 'new@example.test');

        assert.strictEqual(options.email, 'new@example.test');
    });

    test('editing the code writes it back to the options', async function (assert) {
        const options = { sent: true, code: '' };
        this.set('options', options);

        await render(TEMPLATE);
        await fillIn('input', '123456');

        assert.strictEqual(options.code, '123456');
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modals::VerifyEmail />`);

        assert.ok(find('input'), 'the email step is shown by default');
    });
});
