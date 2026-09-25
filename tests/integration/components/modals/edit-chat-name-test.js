import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/edit-chat-name', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Modals::EditChatName @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it renders a labelled input seeded with the current channel name', async function (assert) {
        this.set('options', { channelName: 'Dispatch Team' });

        await render(TEMPLATE);

        assert.dom('.modal-body-container').exists();
        assert.dom(this.element).containsText('Channel Name');
        assert.dom('input').hasValue('Dispatch Team');
    });

    test('it explains what the field is for', async function (assert) {
        this.set('options', { channelName: 'Dispatch Team' });

        await render(TEMPLATE);

        assert.dom(this.element).containsText('Input a new name for your chat channel.');
    });

    test('typing updates the option the modal will confirm with', async function (assert) {
        const options = { channelName: 'Dispatch Team' };
        this.set('options', options);

        await render(TEMPLATE);
        await fillIn('input', 'Night Shift');

        assert.strictEqual(options.channelName, 'Night Shift', 'the new name is written back to the options');
    });

    test('it renders with no channel name yet', async function (assert) {
        this.set('options', {});

        await render(TEMPLATE);

        assert.ok(find('input'), 'an empty field is offered');
        assert.dom('input').hasValue('');
    });
});
