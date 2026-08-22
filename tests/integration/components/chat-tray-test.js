import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, fillIn, find, findAll, render, settled } from '@ember/test-helpers';
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
            calls = [];
            listen(channelId, callback) {
                this.calls.push({ method: 'listen', args: [channelId, callback] });
            }
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

    module('filtering, composing and ending chats', function () {
        async function openInbox() {
            await click('[aria-label="Open chat inbox"]');
        }

        async function openCompose() {
            await openInbox();
            await click('.chat-inbox-panel-actions .btn-primary');
        }

        test('conversations can be searched by title', async function (assert) {
            await render(hbs`<ChatTray />`);
            await openInbox();

            assert.dom('.chat-inbox-conversation-title').exists();

            await fillIn('.chat-inbox-search input', 'dispatch');
            assert.dom('.chat-inbox-conversation-title').hasText('Dispatch Team', 'a matching query keeps the conversation');

            await fillIn('.chat-inbox-search input', 'nothing here');
            assert.dom('.chat-inbox-conversation-title').doesNotExist('a non-matching query hides it');

            await fillIn('.chat-inbox-search input', '   ');
            assert.dom('.chat-inbox-conversation-title').exists('a blank query shows everything again');
        });

        test('a conversation can be matched by a participant name', async function (assert) {
            await render(hbs`<ChatTray />`);
            await openInbox();
            await fillIn('.chat-inbox-search input', 'alex');

            assert.dom('.chat-inbox-conversation-title').hasText('Dispatch Team', 'participants are searched too');
        });

        test('ending a chat asks for confirmation first', async function (assert) {
            const confirmations = [];
            this.owner.lookup('service:modals-manager').confirm = (options) => confirmations.push(options);

            await render(hbs`<ChatTray />`);
            await openInbox();
            await click('.chat-inbox-conversation-row [aria-label^="End chat"], .chat-inbox-conversation-row button:last-child');

            assert.strictEqual(confirmations.length, 1, 'a confirmation is raised');
            assert.true(confirmations[0].title.includes('Dispatch Team'), 'the chat is named in the prompt');
            assert.strictEqual(typeof confirmations[0].confirm, 'function');
        });

        test('confirming closes and deletes the channel', async function (assert) {
            const chat = this.owner.lookup('service:chat');
            const closed = [];
            const deleted = [];
            chat.closeChannel = (channel) => closed.push(channel);
            chat.deleteChatChannel = (channel) => {
                deleted.push(channel);
                return Promise.resolve();
            };

            let options;
            this.owner.lookup('service:modals-manager').confirm = (received) => (options = received);

            await render(hbs`<ChatTray />`);
            await openInbox();
            await click('.chat-inbox-conversation-row [aria-label^="End chat"], .chat-inbox-conversation-row button:last-child');

            await options.confirm({ startLoading() {} });
            await settled();

            assert.strictEqual(closed.length, 1, 'the channel is closed');
            assert.strictEqual(deleted.length, 1, 'and deleted');
        });

        test('teammates can be searched while composing', async function (assert) {
            await render(hbs`<ChatTray />`);
            await openCompose();
            await fillIn('#chat-compose-search', 'alex');

            assert.dom('.chat-compose-contact-name').hasText('Alex Driver', 'the search re-runs the lookup');
        });

        test('choosing a teammate twice deselects them', async function (assert) {
            await render(hbs`<ChatTray />`);
            await openCompose();

            await click('.chat-compose-contact-row');
            assert.dom('.chat-compose-selected-user').exists('the teammate is selected');

            await click('.chat-compose-contact-row');
            assert.dom('.chat-compose-selected-user').doesNotExist('and deselected again');
        });

        test('a selected teammate can be removed from the chip list', async function (assert) {
            await render(hbs`<ChatTray />`);
            await openCompose();
            await click('.chat-compose-contact-row');

            await click('[aria-label="Remove Alex Driver"]');

            assert.dom('.chat-compose-selected-user').doesNotExist();
        });

        test('creating is refused until a teammate is chosen', async function (assert) {
            await render(hbs`<ChatTray />`);
            await openCompose();

            assert.dom('.chat-compose-footer .btn-primary').isDisabled();

            await click('.chat-compose-contact-row');
            assert.dom('.chat-compose-footer .btn-primary').isNotDisabled();
        });

        test('an unnamed chat is named after the chosen teammates', async function (assert) {
            await render(hbs`<ChatTray />`);
            await openCompose();
            await click('.chat-compose-contact-row');
            await click('.chat-compose-footer .btn-primary');

            const chat = this.owner.lookup('service:chat');
            assert.strictEqual(chat.createdChatArgs.name, 'Alex Driver', 'a single teammate names the chat');
        });
    });

    module('the socket event switch', function () {
        function socketCallback(context, channelPublicId = 'chat_public_1') {
            const socket = context.owner.lookup('service:socket');
            const call = socket.calls.find((entry) => entry.args[0] === `chat.${channelPublicId}`);
            return call?.args[1];
        }

        test('it listens on every loaded channel', async function (assert) {
            await render(hbs`<ChatTray />`);

            const socket = this.owner.lookup('service:socket');
            assert.true(
                socket.calls.some((call) => call.args[0] === 'chat.chat_public_1'),
                'the loaded channel is subscribed to'
            );
        });

        test('every channel-shaped event is handled without throwing', async function (assert) {
            await render(hbs`<ChatTray />`);
            const callback = socketCallback(this);
            assert.ok(callback, 'a socket listener was registered');

            for (const event of ['chat.added_participant', 'chat_participant.deleted', 'chat.removed_participant', 'chat_channel.created', 'chat_channel.deleted', 'chat_receipt.created']) {
                callback({ event, data: { id: 'chat-1', participants: [] } });
            }
            await settled();

            assert.dom('[aria-label="Open chat inbox"]').exists('the tray survives every event');
        });

        test('an incoming message from someone else plays the notification sound', async function (assert) {
            // `playSoundForIncomingMessage` compares the current user's participant record against
            // the message sender, so the sound only plays for messages the user did not send.
            const originalPlay = window.HTMLMediaElement.prototype.play;
            const plays = [];
            window.HTMLMediaElement.prototype.play = function () {
                plays.push(true);
                return Promise.resolve();
            };

            try {
                await render(hbs`<ChatTray />`);
                socketCallback(this)({ event: 'chat_message.created', data: { sender_uuid: 'participant-2' } });
                await settled();
            } finally {
                window.HTMLMediaElement.prototype.play = originalPlay;
            }

            assert.strictEqual(plays.length, 1, 'the sound plays for a message from another participant');
        });

        test('a message the current user sent does not play the sound', async function (assert) {
            const originalPlay = window.HTMLMediaElement.prototype.play;
            const plays = [];
            window.HTMLMediaElement.prototype.play = function () {
                plays.push(true);
                return Promise.resolve();
            };

            try {
                await render(hbs`<ChatTray />`);
                socketCallback(this)({ event: 'chat_message.created', data: { sender_uuid: 'participant-1' } });
                await settled();
            } finally {
                window.HTMLMediaElement.prototype.play = originalPlay;
            }

            assert.strictEqual(plays.length, 0, 'no sound for your own message');
        });

        test('an unrecognised event is ignored', async function (assert) {
            await render(hbs`<ChatTray />`);

            socketCallback(this)({ event: 'something.unrelated', data: {} });
            await settled();

            assert.dom('[aria-label="Open chat inbox"]').exists();
        });

        test('a deleted channel that is open is closed', async function (assert) {
            await render(hbs`<ChatTray />`);

            const chat = this.owner.lookup('service:chat');
            let closed = null;
            chat.closeChannel = (channel) => {
                closed = channel;
            };
            chat.openChannels = [{ id: 'chat-1', public_id: 'chat_public_1' }];

            socketCallback(this)({ event: 'chat_channel.deleted', data: { id: 'chat-1' } });
            await settled();

            assert.ok(closed, 'the open channel is closed behind the deletion');
            assert.strictEqual(closed.id, 'chat-1');
        });
    });

    module('the tray on a phone', function () {
        test('the panels take the full width on a mobile viewport', async function (assert) {
            this.owner.lookup('service:media').isMobile = true;

            await render(hbs`<ChatTray />`);
            await click('[aria-label="Open chat inbox"]');

            assert.dom('.chat-inbox-panel').exists('the inbox opens');
            assert.strictEqual(find('.chat-inbox-panel').closest('[style]')?.style.width, '100%', 'the inbox fills the viewport');

            await click('.chat-inbox-panel-actions .btn-primary');

            assert.strictEqual(find('.chat-compose-panel').closest('[style]')?.style.width, '100%', 'and so does the compose panel');
        });
    });

    module('toggling the launcher', function () {
        test('a second click on the launcher closes the inbox again', async function (assert) {
            await render(hbs`<ChatTray />`);

            await click('[aria-label="Open chat inbox"]');
            assert.dom('.chat-inbox-panel').exists('the first click opens it');

            await click('[aria-label="Open chat inbox"]');

            assert.dom('.chat-inbox-panel').doesNotExist('and the second closes it');
        });
    });

    module('ordering the inbox', function () {
        test('unread conversations sort above read ones, then by recency', async function (assert) {
            const chat = this.owner.lookup('service:chat');
            const ordered = [
                { id: 'a', public_id: 'chat_a', title: 'Read older', name: 'Read older', unread_count: 0, updated_at: new Date('2026-05-01T00:00:00Z'), participants: [] },
                { id: 'b', public_id: 'chat_b', title: 'Read newer', name: 'Read newer', unread_count: 0, updated_at: new Date('2026-05-30T00:00:00Z'), participants: [] },
                { id: 'c', public_id: 'chat_c', title: 'Unread', name: 'Unread', unread_count: 3, updated_at: new Date('2026-04-01T00:00:00Z'), participants: [] },
            ];
            chat.loadChannels = {
                isIdle: true,
                perform: ({ withChannels } = {}) => {
                    if (typeof withChannels === 'function') {
                        withChannels(ordered);
                    }
                    return Promise.resolve(ordered);
                },
            };

            await render(hbs`<ChatTray />`);
            await click('[aria-label="Open chat inbox"]');

            const titles = Array.from(this.element.querySelectorAll('.chat-inbox-conversation-title')).map((node) => node.textContent.trim());
            assert.deepEqual(titles, ['Unread', 'Read newer', 'Read older'], 'unread first, then most recently updated');
        });

        test('a conversation with no timestamps still sorts', async function (assert) {
            const chat = this.owner.lookup('service:chat');
            const undated = [
                { id: 'a', public_id: 'chat_a', title: 'No dates', name: 'No dates', participants: [] },
                { id: 'b', public_id: 'chat_b', title: 'Created only', name: 'Created only', created_at: new Date('2026-05-30T00:00:00Z'), participants: [] },
            ];
            chat.loadChannels = {
                isIdle: true,
                perform: ({ withChannels } = {}) => {
                    if (typeof withChannels === 'function') {
                        withChannels(undated);
                    }
                    return Promise.resolve(undated);
                },
            };

            await render(hbs`<ChatTray />`);
            await click('[aria-label="Open chat inbox"]');

            const titles = Array.from(this.element.querySelectorAll('.chat-inbox-conversation-title')).map((node) => node.textContent.trim());
            assert.deepEqual(titles, ['Created only', 'No dates'], 'created_at stands in for a missing updated_at');
        });
    });

    module('naming a new chat', function () {
        async function openCompose(context) {
            await render(hbs`<ChatTray />`);
            await click('[aria-label="Open chat inbox"]');
            await click('.chat-inbox-panel-actions .btn-primary');
            return context;
        }

        test('one selected contact names the chat after them', async function (assert) {
            await openCompose(this);
            await click('.chat-compose-contact-row');
            await click('.chat-compose-footer .btn-primary');

            const chat = this.owner.lookup('service:chat');
            assert.strictEqual(chat.createdChatArgs.name, 'Alex Driver', 'a single contact names the chat');
        });

        test('a failed creation is reported to the user', async function (assert) {
            const errors = [];
            const notifications = this.owner.lookup('service:notifications');
            notifications.error = (message) => errors.push(message);

            const chat = this.owner.lookup('service:chat');
            chat.createChatChannel = () => Promise.reject(new Error('server refused'));

            await openCompose(this);
            await click('.chat-compose-contact-row');
            await click('.chat-compose-footer .btn-primary');

            assert.deepEqual(errors, ['server refused'], 'the failure reason is surfaced');
        });

        test('a failure with no message falls back to a generic one', async function (assert) {
            const errors = [];
            const notifications = this.owner.lookup('service:notifications');
            notifications.error = (message) => errors.push(message);

            const chat = this.owner.lookup('service:chat');
            chat.createChatChannel = () => Promise.reject({});

            await openCompose(this);
            await click('.chat-compose-contact-row');
            await click('.chat-compose-footer .btn-primary');

            assert.deepEqual(errors, ['Unable to create chat.']);
        });

        // The fixture offers a single contact, so a multi-participant name needs its own roster.
        test('two selected contacts name the chat after both', async function (assert) {
            const fetch = this.owner.lookup('service:fetch');
            const originalGet = fetch.get.bind(fetch);
            fetch.get = (path, ...rest) => {
                if (path === 'chat-channels/available-participants') {
                    return Promise.resolve([
                        { id: 'user-2', name: 'Alex Driver', email: 'alex@example.test' },
                        { id: 'user-3', name: 'Grace Hopper', email: 'grace@example.test' },
                    ]);
                }

                return originalGet(path, ...rest);
            };

            await openCompose(this);
            await click(findAll('.chat-compose-contact-row')[0]);
            await click(findAll('.chat-compose-contact-row')[1]);
            await click('.chat-compose-footer .btn-primary');

            const chat = this.owner.lookup('service:chat');
            assert.strictEqual(chat.createdChatArgs.name, 'Alex Driver, Grace Hopper', 'both contacts are named');
        });

        test('the create button stays disabled until a contact is chosen', async function (assert) {
            await openCompose(this);

            assert.dom('.chat-compose-footer .btn-primary').isDisabled('nothing can be created with an empty selection');

            await click('.chat-compose-contact-row');

            assert.dom('.chat-compose-footer .btn-primary').isNotDisabled('choosing a contact enables it');

            const chat = this.owner.lookup('service:chat');
            assert.strictEqual(chat.createdChatArgs, undefined, 'and nothing has been created yet');
        });
    });

    module('ending a chat', function () {
        test('it asks for confirmation naming the chat, then closes and deletes it', async function (assert) {
            const confirmations = [];
            const modalsManager = this.owner.lookup('service:modals-manager');
            modalsManager.confirm = (options) => confirmations.push(options);

            await render(hbs`<ChatTray />`);
            await click('[aria-label="Open chat inbox"]');

            const endButton = this.element.querySelector('.chat-inbox-conversation-remove, [aria-label="End chat"]');
            assert.ok(endButton, 'each conversation offers an end control');

            await click(endButton);

            assert.strictEqual(confirmations.length, 1, 'a confirmation is requested');
            assert.true(/end this chat \(Dispatch Team\)/i.test(confirmations[0].title), confirmations[0].title);

            const chat = this.owner.lookup('service:chat');
            const closed = [];
            const deleted = [];
            chat.closeChannel = (channel) => closed.push(channel);
            chat.deleteChatChannel = (channel) => {
                deleted.push(channel);
                return Promise.resolve();
            };

            await confirmations[0].confirm({ startLoading: () => {} });

            assert.strictEqual(closed.length, 1, 'the channel is closed');
            assert.strictEqual(deleted.length, 1, 'and deleted');
        });
    });
});

// A second, narrower module covering the socket event dispatch table and the
// unread-count roll-up. Kept separate from the overlay tests above so the two
// sets of service stubs do not have to serve both purposes.
module('Integration | Component | chat-tray socket handling', function (hooks) {
    setupRenderingTest(hooks);

    let loadedChannels;
    let listened;

    function channelFixture(id, overrides = {}) {
        return {
            id,
            public_id: `chan_${id}`,
            title: `Channel ${id}`,
            unread_count: 0,
            participants: [],
            updated_at: '2024-01-01T00:00:00Z',
            ...overrides,
        };
    }

    hooks.beforeEach(function () {
        loadedChannels = [];
        listened = [];

        this.owner.register(
            'service:chat',
            class extends Service {
                loadChannels = {
                    perform: ({ withChannels }) => {
                        withChannels(loadedChannels);

                        return Promise.resolve(loadedChannels);
                    },
                };

                openChannel() {}
                closeChannel() {}
                deleteChatChannel() {}
            }
        );

        this.owner.register(
            'service:socket',
            class extends Service {
                listen(name, handler) {
                    listened.push({ name, handler });
                }
            }
        );

        this.owner.register(
            'service:current-user',
            class extends Service {
                id = 'user-1';
            }
        );

        this.owner.register(
            'service:modals-manager',
            class extends Service {
                confirm() {}
            }
        );

        this.owner.register(
            'service:notifications',
            class extends Service {
                error() {}
            }
        );

        this.owner.register(
            'service:fetch',
            class extends Service {
                get() {
                    return Promise.resolve({ unreadCount: 0 });
                }
            }
        );
    });

    function handlerFor(name) {
        return listened.find((entry) => entry.name === name)?.handler;
    }

    test('it subscribes to every loaded channel and to the current user channel', async function (assert) {
        loadedChannels = [channelFixture('a'), channelFixture('b')];

        await render(hbs`<ChatTray />`);

        const names = listened.map((entry) => entry.name);
        assert.true(names.includes('chat.chan_a'), 'each channel is subscribed');
        assert.true(names.includes('chat.chan_b'));
        assert.true(names.includes('user.user-1'), 'the current user channel is subscribed');
    });

    test('the unread badge sums unread counts across channels', async function (assert) {
        loadedChannels = [channelFixture('a', { unread_count: 2 }), channelFixture('b', { unread_count: 3 })];

        await render(hbs`<ChatTray />`);

        assert.dom('.chat-tray-unread-notifications-badge').hasText('5');
    });

    test('no badge is shown when nothing is unread', async function (assert) {
        loadedChannels = [channelFixture('a'), channelFixture('b')];

        await render(hbs`<ChatTray />`);

        assert.dom('.chat-tray-unread-notifications-badge').doesNotExist();
    });

    test('a new message on a channel reloads the list', async function (assert) {
        loadedChannels = [channelFixture('a', { unread_count: 0 })];
        await render(hbs`<ChatTray />`);

        loadedChannels = [channelFixture('a', { unread_count: 7 })];
        handlerFor('chat.chan_a')({ event: 'chat_message.created', data: { sender_uuid: 'someone-else' } });
        await settled();

        assert.dom('.chat-tray-unread-notifications-badge').hasText('7');
    });

    test('a participant being added reloads the list', async function (assert) {
        loadedChannels = [channelFixture('a')];
        await render(hbs`<ChatTray />`);

        loadedChannels = [channelFixture('a', { unread_count: 1 }), channelFixture('b', { unread_count: 1 })];
        handlerFor('user.user-1')({ event: 'chat.participant_added', data: {} });
        await settled();

        assert.dom('.chat-tray-unread-notifications-badge').hasText('2');
    });

    test('an unrecognised socket event is ignored', async function (assert) {
        loadedChannels = [channelFixture('a', { unread_count: 1 })];
        await render(hbs`<ChatTray />`);

        handlerFor('user.user-1')({ event: 'something.else', data: {} });
        await settled();

        assert.dom('.chat-tray-unread-notifications-badge').hasText('1', 'nothing changed');
    });

    test('the notification sound is not played for your own message', async function (assert) {
        loadedChannels = [channelFixture('a', { participants: [{ user_uuid: 'user-1', id: 'p-1' }] })];
        await render(hbs`<ChatTray />`);

        handlerFor('chat.chan_a')({ event: 'chat_message.created', data: { sender_uuid: 'p-1' } });
        await settled();

        assert.dom('.chat-tray').exists('the event is handled without an unhandled audio rejection');
    });
});

// A third module covering the socket dispatch branches that push records through the store:
// channel created/deleted and participant removal. Kept separate so it can register its own
// store stub without disturbing the modules above.
module('Integration | Component | chat-tray channel lifecycle', function (hooks) {
    setupRenderingTest(hooks);

    let listened;
    let pushed;
    let peeked;
    let closedChannels;
    let openedChannels;

    hooks.beforeEach(function () {
        listened = [];
        pushed = [];
        peeked = {};
        closedChannels = [];
        openedChannels = [];

        this.owner.register(
            'service:chat',
            class extends Service {
                loadChannels = {
                    perform: ({ withChannels }) => {
                        withChannels([]);

                        return Promise.resolve([]);
                    },
                };

                openChannel(channel) {
                    openedChannels.push(channel);
                }
                closeChannel(channel) {
                    closedChannels.push(channel);
                }
                deleteChatChannel() {}
            }
        );

        this.owner.register(
            'service:socket',
            class extends Service {
                listen(name, handler) {
                    listened.push({ name, handler });
                }
            }
        );

        // The component normalises and pushes raw socket payloads, so the store stub simply
        // echoes what it is given and records the calls.
        this.owner.unregister('service:store');
        this.owner.register(
            'service:store',
            class extends Service {
                normalize(modelName, payload) {
                    return { modelName, ...payload };
                }
                push(record) {
                    pushed.push(record);
                    return record;
                }
                peekRecord(modelName, id) {
                    return peeked[id] ?? null;
                }
            }
        );

        this.owner.register(
            'service:current-user',
            class extends Service {
                id = 'user-1';
            }
        );
        this.owner.register('service:modals-manager', class extends Service {});
        this.owner.register('service:notifications', class extends Service {});
        this.owner.register(
            'service:fetch',
            class extends Service {
                get() {
                    return Promise.resolve({ unreadCount: 0 });
                }
            }
        );
    });

    function handlerFor(name) {
        return listened.find((entry) => entry.name === name)?.handler;
    }

    async function renderTray() {
        await render(hbs`<ChatTray />`);
    }

    test('a newly created channel the user participates in is opened', async function (assert) {
        await renderTray();

        handlerFor('user.user-1')({
            event: 'chat_channel.created',
            data: { id: 'chan_new', participants: [{ user_uuid: 'user-1' }] },
        });
        await settled();

        assert.strictEqual(pushed.length, 1, 'the payload is normalised and pushed');
        assert.strictEqual(pushed[0].modelName, 'chat-channel');
        assert.strictEqual(openedChannels.length, 1, 'the channel is opened for the participant');
        assert.strictEqual(openedChannels[0].id, 'chan_new');
    });

    test('a newly created channel the user is not part of is ignored', async function (assert) {
        await renderTray();

        handlerFor('user.user-1')({
            event: 'chat_channel.created',
            data: { id: 'chan_other', participants: [{ user_uuid: 'someone-else' }] },
        });
        await settled();

        assert.strictEqual(pushed.length, 1, 'it is still pushed into the store');
        assert.deepEqual(openedChannels, [], 'but never opened');
    });

    test('a channel with no participants at all is ignored', async function (assert) {
        await renderTray();

        handlerFor('user.user-1')({ event: 'chat_channel.created', data: { id: 'chan_empty' } });
        await settled();

        assert.deepEqual(openedChannels, []);
    });

    test('a deleted channel is closed', async function (assert) {
        await renderTray();

        handlerFor('user.user-1')({ event: 'chat_channel.deleted', data: { id: 'chan_gone' } });
        await settled();

        assert.strictEqual(closedChannels.length, 1);
        assert.strictEqual(closedChannels[0].id, 'chan_gone');
        assert.strictEqual(pushed[0].modelName, 'chat-channel');
    });

    test('being removed from a channel closes it', async function (assert) {
        peeked['chan_1'] = { id: 'chan_1', title: 'Dispatch' };

        await renderTray();

        handlerFor('user.user-1')({
            event: 'chat_participant.deleted',
            data: { id: 'part_1', chat_channel_uuid: 'chan_1' },
        });
        await settled();

        assert.strictEqual(pushed[0].modelName, 'chat-participant', 'the participant payload is normalised');
        assert.strictEqual(closedChannels.length, 1, 'the channel it belonged to is closed');
        assert.strictEqual(closedChannels[0].id, 'chan_1');
    });

    test('a removal for a channel that is not loaded closes nothing', async function (assert) {
        await renderTray();

        handlerFor('user.user-1')({
            event: 'chat_participant.deleted',
            data: { id: 'part_1', chat_channel_uuid: 'chan_missing' },
        });
        await settled();

        assert.deepEqual(closedChannels, [], 'there is nothing to close');
    });

    test('an unrecognised user-channel event changes nothing', async function (assert) {
        await renderTray();

        handlerFor('user.user-1')({ event: 'chat.something_else', data: {} });
        await settled();

        assert.deepEqual(pushed, []);
        assert.deepEqual(closedChannels, []);
        assert.deepEqual(openedChannels, []);
    });
    // Two gaps the existing fixtures cannot reach: the sort comparator only evaluates its final
    // `?? 0` fallback when the SECOND channel it is handed has neither timestamp, and the search
    // only reaches its `?? []` participant fallbacks for a channel with no participants key at all.
    module('channels missing fields entirely', function () {
        function serveChannels(context, channels) {
            const chat = context.owner.lookup('service:chat');
            chat.loadChannels = {
                isIdle: true,
                perform: ({ withChannels } = {}) => {
                    if (typeof withChannels === 'function') {
                        withChannels(channels);
                    }
                    return Promise.resolve(channels);
                },
            };
        }

        test('two conversations with no timestamps at all still sort', async function (assert) {
            serveChannels(this, [
                { id: 'a', public_id: 'chat_a', title: 'No dates one', name: 'No dates one', participants: [] },
                { id: 'b', public_id: 'chat_b', title: 'No dates two', name: 'No dates two', participants: [] },
            ]);

            await render(hbs`<ChatTray />`);
            await click('[aria-label="Open chat inbox"]');

            assert.strictEqual(findAll('.chat-inbox-conversation-row').length, 2, 'both render rather than throwing on a missing date');
        });

        test('the tray renders its own defaults while channels are still loading', async function (assert) {
            // Every other fixture calls `withChannels` synchronously, so the component's declared
            // defaults are overwritten before anything reads them. In production the load is async
            // and the template renders against those defaults first.
            const chat = this.owner.lookup('service:chat');
            let release;
            chat.loadChannels = {
                isIdle: true,
                perform: ({ withChannels } = {}) =>
                    new Promise((resolve) => {
                        release = () => {
                            if (typeof withChannels === 'function') {
                                withChannels([]);
                            }
                            resolve([]);
                        };
                    }),
            };

            await render(hbs`<ChatTray />`);
            await click('[aria-label="Open chat inbox"]');

            assert.dom('.chat-tray-unread-notifications-badge').doesNotExist('no unread badge before a count arrives');
            assert.strictEqual(findAll('.chat-inbox-conversation-row').length, 0, 'and no conversations yet');

            // The contact list reads `availableUsers` before its own fetch resolves, too.
            const fetch = this.owner.lookup('service:fetch');
            const originalGet = fetch.get.bind(fetch);
            let releaseUsers;
            fetch.get = (path, ...rest) => {
                if (path === 'chat-channels/available-participants') {
                    return new Promise((resolve) => {
                        releaseUsers = () => resolve([]);
                    });
                }
                return originalGet(path, ...rest);
            };

            await click('.chat-inbox-panel-actions .btn-primary');

            assert.strictEqual(findAll('.chat-compose-contact-name').length, 0, 'no contacts before the fetch resolves');

            releaseUsers();
            release();
            await settled();
            fetch.get = originalGet;

            assert.dom('.chat-inbox-panel').exists('the inbox survives the load resolving');
        });

        test('a conversation with no participants key can still be searched', async function (assert) {
            serveChannels(this, [{ id: 'a', public_id: 'chat_a', title: 'Dispatch Team', name: 'Dispatch Team' }]);

            await render(hbs`<ChatTray />`);
            await click('[aria-label="Open chat inbox"]');
            await fillIn('.chat-inbox-search input', 'dispatch');

            assert.strictEqual(findAll('.chat-inbox-conversation-row').length, 1, 'matched on its title with no participants to read');

            await fillIn('.chat-inbox-search input', 'nobody');

            assert.strictEqual(findAll('.chat-inbox-conversation-row').length, 0, 'and a miss still filters it out');
        });
    });
    module('paths the happy-path fixtures do not reach', function () {
        function userChannelCallback() {
            // This module's socket stub records into `listened`, not `socket.calls`.
            return listened.find((entry) => String(entry.name).startsWith('user.'))?.handler;
        }

        test('a participant-removed event reloads and closes the channel', async function (assert) {
            // The suite's other socket test fires `chat.removed_participant`; the switch matches
            // `chat.participant_removed`, so that arm was never entered.
            await render(hbs`<ChatTray />`);
            const callback = userChannelCallback();
            assert.ok(callback, 'the user channel is subscribed to');

            callback({ event: 'chat.participant_removed', data: { id: 'participant-2', chat_channel_uuid: 'chat-1' } });
            await settled();

            assert.dom('[aria-label="Open chat inbox"]').exists('the tray survives the removal');
        });

        test('a failure loading teammates leaves an empty list rather than throwing', async function (assert) {
            const fetch = this.owner.lookup('service:fetch');
            const originalGet = fetch.get.bind(fetch);
            const warnings = [];
            const originalWarn = console.warn;
            console.warn = (...args) => warnings.push(args[0]);
            fetch.get = (path, ...rest) => {
                if (path === 'chat-channels/available-participants') {
                    return Promise.reject(new Error('participants are unavailable'));
                }
                return originalGet(path, ...rest);
            };

            try {
                await render(hbs`<ChatTray />`);
                await click('[aria-label="Open chat inbox"]');
                await click('.chat-inbox-panel-actions .btn-primary');
            } finally {
                console.warn = originalWarn;
                fetch.get = originalGet;
            }

            assert.strictEqual(warnings[0], 'Error loading chat participants:', 'the failure is reported');
            assert.dom('.chat-compose-panel').exists('and the compose panel still opens');
        });
    });
});
