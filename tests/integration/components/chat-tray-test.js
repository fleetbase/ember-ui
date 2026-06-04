import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, fillIn, render } from '@ember/test-helpers';
import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | chat-tray', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const channels = [
            {
                id: 'chat-1',
                public_id: 'chat_public_1',
                title: 'Dispatch Team',
                name: 'Dispatch Team',
                unread_count: 2,
                updated_at: new Date('2026-05-31T02:00:00Z'),
                created_at: new Date('2026-05-31T01:00:00Z'),
                updatedAgo: '5 minutes',
                createdAgo: '1 hour',
                created_by_uuid: 'user-current',
                participants: [
                    {
                        id: 'participant-1',
                        user_uuid: 'user-current',
                        name: 'Current User',
                        avatar_url: null,
                    },
                    {
                        id: 'participant-2',
                        user_uuid: 'user-2',
                        name: 'Alex Driver',
                        email: 'alex@example.test',
                        avatar_url: null,
                    },
                ],
                last_message: {
                    content: 'Arrived at loading dock',
                    createdAgo: '5 minutes ago',
                    sender: {
                        name: 'Alex Driver',
                    },
                    attachments: [],
                },
            },
        ];

        class ChatStub extends Service {
            openChannels = [];
            createdChatArgs;
            openedChannel;
            loadChannels = {
                isIdle: true,
                perform: ({ withChannels } = {}) => {
                    if (typeof withChannels === 'function') {
                        withChannels(channels);
                    }

                    return Promise.resolve(channels);
                },
            };

            openChannel(channel) {
                this.openedChannel = channel;
            }

            closeChannel() {}

            deleteChatChannel() {
                return Promise.resolve();
            }

            createChatChannel(name, participants) {
                this.createdChatArgs = { name, participants };
                return Promise.resolve(channels[0]);
            }
        }

        class SocketStub extends Service {
            listen() {}
        }

        class FetchStub extends Service {
            get(path) {
                if (path === 'chat-channels/available-participants') {
                    return Promise.resolve([
                        {
                            id: 'user-2',
                            name: 'Alex Driver',
                            email: 'alex@example.test',
                            avatar_url: null,
                            is_online: true,
                        },
                    ]);
                }

                return Promise.resolve({ unreadCount: 2 });
            }
        }

        class CurrentUserStub extends Service {
            id = 'user-current';
        }

        class MediaStub extends Service.extend(Evented) {
            isMobile = false;
        }

        class ModalsManagerStub extends Service {
            confirm() {}
        }

        class NotificationsStub extends Service {
            error() {}
        }

        this.owner.register('service:chat', ChatStub);
        this.owner.register('service:socket', SocketStub);
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:current-user', CurrentUserStub);
        this.owner.register('service:media', MediaStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);
        this.owner.register('service:notifications', NotificationsStub);
    });

    test('opens a conversation inbox overlay from the tray button', async function (assert) {
        await render(hbs`<ChatTray />`);

        assert.dom('.chat-inbox-panel').doesNotExist();

        await click('[aria-label="Open chat inbox"]');

        assert.dom('.chat-inbox-panel').exists();
        assert.dom('.chat-inbox-conversation-title').hasText('Dispatch Team');
        assert.dom('.chat-inbox-conversation-preview').includesText('Arrived at loading dock');
        assert.dom('.chat-inbox-unread-badge').hasText('2');
    });

    test('creates a participant-backed chat from the compose overlay', async function (assert) {
        await render(hbs`<ChatTray />`);

        await click('[aria-label="Open chat inbox"]');
        await click('.chat-inbox-panel-actions .btn-primary');

        assert.dom('.chat-compose-panel').exists();
        assert.dom('.chat-compose-contact-name').hasText('Alex Driver');

        await click('.chat-compose-contact-row');
        await fillIn('#chat-compose-name', 'Dock handoff');
        await click('.chat-compose-footer .btn-primary');

        const chat = this.owner.lookup('service:chat');
        assert.deepEqual(chat.createdChatArgs, { name: 'Dock handoff', participants: ['user-2'] });
        assert.strictEqual(chat.openedChannel.id, 'chat-1');
    });
});
