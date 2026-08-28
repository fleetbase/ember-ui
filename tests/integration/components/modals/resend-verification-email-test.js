import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/resend-verification-email', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Modals::ResendVerificationEmail @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it explains what will happen', async function (assert) {
        this.set('options', { email: 'ron@example.test' });

        await render(TEMPLATE);

        assert.dom(this.element).containsText('Verify your email address.');
        assert.dom(this.element).containsText('click Send to continue');
    });

    test('it offers an email field seeded from the options', async function (assert) {
        this.set('options', { email: 'ron@example.test' });

        await render(TEMPLATE);

        assert.dom('input').hasValue('ron@example.test');
        assert.dom('input').hasAttribute('type', 'email');
    });

    test('editing writes the address back to the options', async function (assert) {
        const options = { email: 'ron@example.test' };
        this.set('options', options);

        await render(TEMPLATE);
        await fillIn('input', 'new@example.test');

        assert.strictEqual(options.email, 'new@example.test');
    });

    test('it renders with no email yet', async function (assert) {
        this.set('options', {});

        await render(TEMPLATE);

        assert.ok(find('input'), 'an empty field is offered');
        assert.dom('input').hasValue('');
    });
});
