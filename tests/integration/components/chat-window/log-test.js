import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | chat-window/log', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the log content and timestamp', async function (assert) {
        this.set('record', {
            id: 'log-1',
            resolved_content: 'Alex Driver joined the chat',
            createdAgo: '2 minutes ago',
        });

        await render(hbs`<ChatWindow::Log @record={{this.record}} />`);

        assert.dom('.chat-log-container').exists();
        assert.dom('.chat-log-content-bubble').hasText('Alex Driver joined the chat');
        assert.dom('.chat-log-created-at').hasText('2 minutes ago');
    });

    test('it renders empty when no record is provided', async function (assert) {
        await render(hbs`<ChatWindow::Log />`);

        assert.dom('.chat-log-container').exists('log container still renders');
        assert.dom('.chat-log-content-bubble').hasText('', 'no content is rendered without a record');
    });
});
