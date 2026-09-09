import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/verify-by-sms', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Modals::VerifyBySms @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it explains what will happen', async function (assert) {
        this.set('options', { phone: '+15550100' });

        await render(TEMPLATE);

        assert.dom(this.element).containsText("Let's verify your phone number instead.");
        assert.dom(this.element).containsText('receive a verification code by SMS');
    });

    test('it offers a phone field seeded from the options', async function (assert) {
        this.set('options', { phone: '+15550100' });

        await render(TEMPLATE);

        assert.dom(this.element).containsText('Verify your phone number');
        assert.ok(find('input'), 'a phone field is rendered');
    });

    test('it explains why the number should be checked', async function (assert) {
        this.set('options', { phone: '+15550100' });

        await render(TEMPLATE);

        assert.dom(this.element).containsText('confirm your phone number is correct');
    });

    test('it renders with no phone number yet', async function (assert) {
        this.set('options', {});

        await render(TEMPLATE);

        assert.ok(find('input'), 'an empty field is offered');
    });
});
