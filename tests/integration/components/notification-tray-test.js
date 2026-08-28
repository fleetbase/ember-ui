import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, triggerEvent, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import Evented from '@ember/object/evented';

const CURRENT_USER = { id: 'usr_1', companyId: 'cmp_1' };

function notificationFixture(id, overrides = {}) {
    return {
        id,
        data: { subject: `Subject ${id}`, message: `Message ${id}` },
        createdAgo: '5 minutes',
        read_at: null,
        setProperties(properties) {
            Object.assign(this, properties);
        },
        save() {
            this.saved = true;
            return Promise.resolve(this);
        },
        ...overrides,
    };
}

// A minimal stand-in for a socketcluster channel: awaitable subscription plus a queue
// the test can push incoming messages onto.
function makeChannel(name) {
    const queue = [];
    let resolveNext = null;

    return {
        name,
        push(value) {
            if (resolveNext) {
                const resolve = resolveNext;
                resolveNext = null;
                resolve({ value, done: false });
            } else {
                queue.push(value);
            }
        },
        listener() {
            return { once: () => Promise.resolve() };
        },
        [Symbol.asyncIterator]() {
            return {
                next: () => (queue.length ? Promise.resolve({ value: queue.shift(), done: false }) : new Promise((resolve) => (resolveNext = resolve))),
            };
        },
    };
}

module('Integration | Component | notification-tray', function (hooks) {
    setupRenderingTest(hooks);

    let channels;
    let stored;
    let universeEvents;
    let universeTriggers;
    let findRecordResponses;
    let originalPlay;
    let playCount;

    hooks.beforeEach(function () {
        channels = new Map();
        stored = [];
        universeEvents = [];
        universeTriggers = [];
        findRecordResponses = new Map();
        playCount = 0;

        // The tray constructs a real Audio element; keep it silent and, critically, keep
        // play() from producing an unhandled rejection.
        originalPlay = window.HTMLMediaElement.prototype.play;
        window.HTMLMediaElement.prototype.play = function () {
            playCount++;
            return Promise.resolve();
        };

        this.owner.unregister('service:socket');
        this.owner.register(
            'service:socket',
            class extends Service {
                instance() {
                    return {
                        subscribe(channelId) {
                            const channel = makeChannel(channelId);
                            channels.set(channelId, channel);
                            return channel;
                        },
                    };
                }
            }
        );

        this.owner.unregister('service:store');
        this.owner.register(
            'service:store',
            class extends Service {
                query() {
                    return Promise.resolve(stored);
                }
                findRecord(modelName, id) {
                    return Promise.resolve(findRecordResponses.get(id) ?? notificationFixture(id));
                }
            }
        );

        this.owner.unregister('service:currentUser');
        this.owner.register(
            'service:currentUser',
            class extends Service {
                id = CURRENT_USER.id;
                companyId = CURRENT_USER.companyId;
            }
        );

        this.owner.unregister('service:universe');
        this.owner.register(
            'service:universe',
            class extends Service {
                on(name, handler) {
                    universeEvents.push({ name, handler });
                }
                trigger(name, payload) {
                    universeTriggers.push({ name, payload });
                }
            }
        );
    });

    hooks.afterEach(function () {
        window.HTMLMediaElement.prototype.play = originalPlay;
    });

    const TEMPLATE = hbs`
        <NotificationTray
            @onInitialize={{this.onInitialize}}
            @onNotificationsLoaded={{this.onNotificationsLoaded}}
            @onReceivedNotification={{this.onReceivedNotification}}
            @onPressViewAllNotifications={{this.onPressViewAllNotifications}}
            @registerAPI={{this.registerAPI}}
        />
    `;

    function items() {
        return findAll('.notification-item');
    }

    // The view-all control is a real <LinkTo>, which makes a click on it two problems at once.
    //
    // A plain click is one Ember handles: it starts a real transition, and a rendering test has no
    // application route to service it — "Attempted to resolve `welcome-page`".
    //
    // A modifier-held click is one Ember deliberately hands back to the browser, so the transition
    // is skipped — but the anchor's default action is not, and the test page navigates to the
    // href. macOS Chrome swallows that; headless Linux Chrome follows it, testem loses the browser
    // and the run dies with "Browser timeout exceeded: 120s". That is why this only ever failed in
    // CI.
    //
    // So: hold a modifier to keep Ember out of it, and suppress the default action outright rather
    // than trusting either platform. The component's own {{on "click"}} still runs, which is what
    // these tests are about.
    async function clickWithoutNavigating(node) {
        const suppress = (event) => event.preventDefault();

        document.addEventListener('click', suppress, true);

        try {
            await triggerEvent(node, 'click', { metaKey: true });
        } finally {
            document.removeEventListener('click', suppress, true);
        }
    }

    function badge() {
        return find('.notification-tray-unread-notifications-badge');
    }

    function fireUniverse(name, payload) {
        universeEvents.filter((entry) => entry.name === name).forEach((entry) => entry.handler(payload));
    }

    module('loading', function () {
        test('unread notifications from the store populate the tray', async function (assert) {
            stored = [notificationFixture('n1'), notificationFixture('n2')];

            await render(TEMPLATE);

            assert.dom(badge()).hasText('2');

            await click('.ember-basic-dropdown-trigger');
            assert.strictEqual(items().length, 2);
            assert.dom(items()[0]).containsText('Subject n1');
            assert.dom(items()[0]).containsText('Message n1');
            assert.dom(items()[0]).containsText('Received: 5 minutes');
            assert.dom(this.element).containsText('2 Unread Notifications', 'the header pluralises the count');
        });

        test('already-read notifications are filtered out', async function (assert) {
            stored = [notificationFixture('n1'), notificationFixture('n2', { read_at: '2026-01-01' })];

            await render(TEMPLATE);

            assert.dom(badge()).hasText('1');
        });

        test('duplicates are collapsed by id', async function (assert) {
            stored = [notificationFixture('n1'), notificationFixture('n1')];

            await render(TEMPLATE);

            assert.dom(badge()).hasText('1');
        });

        test('with nothing unread no badge is shown', async function (assert) {
            await render(TEMPLATE);

            assert.notOk(badge(), 'the badge is hidden when there is nothing to report');
        });

        test('the loaded set is handed to the caller', async function (assert) {
            const loaded = [];
            stored = [notificationFixture('n1')];
            this.set('onNotificationsLoaded', (notifications) => loaded.push(notifications));

            await render(TEMPLATE);

            assert.strictEqual(loaded.length, 1);
            assert.strictEqual(loaded[0].length, 1);
        });

        test('it renders without any callbacks', async function (assert) {
            stored = [notificationFixture('n1')];

            await render(hbs`<NotificationTray />`);

            assert.dom(badge()).hasText('1');
        });
    });

    module('subscriptions', function () {
        test('it subscribes to the user and company channels', async function (assert) {
            await render(TEMPLATE);

            assert.true(channels.has('user.usr_1'), 'the current user channel is subscribed');
            assert.true(channels.has('company.cmp_1'), 'the company channel is subscribed');
        });

        test('an incoming notification is fetched, shown, sounded and announced', async function (assert) {
            const received = [];
            this.set('onReceivedNotification', (notification) => received.push(notification));
            findRecordResponses.set('n9', notificationFixture('n9'));

            await render(TEMPLATE);
            channels.get('user.usr_1').push({ notification_id: 'n9', id: 'n9' });
            await settled();

            assert.dom(badge()).hasText('1');
            assert.strictEqual(playCount, 1, 'the notification sound is played');
            assert.strictEqual(received.length, 1, 'the caller is told');
            assert.deepEqual(
                universeTriggers.map((entry) => entry.name),
                ['notification.received'],
                'and so is the rest of the app'
            );
        });

        test('a socket message that is not a notification is ignored', async function (assert) {
            await render(TEMPLATE);

            channels.get('user.usr_1').push({ something: 'else' });
            channels.get('user.usr_1').push('a bare string');
            await settled();

            assert.notOk(badge(), 'nothing is added');
            assert.strictEqual(playCount, 0, 'and nothing is sounded');
        });

        test('an incoming notification is deduplicated against what is already shown', async function (assert) {
            stored = [notificationFixture('n1')];
            findRecordResponses.set('n1', notificationFixture('n1'));

            await render(TEMPLATE);
            channels.get('user.usr_1').push({ notification_id: 'n1', id: 'n1' });
            await settled();

            assert.dom(badge()).hasText('1', 'the same notification is not counted twice');
        });
    });

    // On a phone the dropdown is a full-width sheet under the trigger rather than a floating
    // panel, and it is never rendered in place.
    module('on a mobile viewport', function (hooks) {
        hooks.beforeEach(function () {
            this.owner.unregister('service:media');
            this.owner.register(
                'service:media',
                class extends Service.extend(Evented) {
                    isMobile = true;
                }
            );
        });

        test('the dropdown is laid out as a full-width sheet', async function (assert) {
            stored = [notificationFixture('n1')];

            await render(hbs`<NotificationTray @renderInPlace={{true}} />`);
            await click('.ember-basic-dropdown-trigger');

            const content = document.querySelector('.ember-basic-dropdown-content');
            assert.ok(content, 'the dropdown opened');
            assert.dom(content).hasClass('is-mobile', 'it is marked as the mobile layout');
            assert.strictEqual(content.style.width, '100%', 'and stretched across the viewport');
        });

        test('@renderInPlace is refused on mobile', async function (assert) {
            await render(hbs`<NotificationTray @renderInPlace={{true}} />`);

            assert.dom('.ember-basic-dropdown-trigger').exists('the tray still renders');
            assert.strictEqual(document.querySelector('.ember-basic-dropdown-content'), null, 'and nothing is rendered in place before it opens');
        });
    });

    test('an explicit @renderInPlace is honoured on a desktop viewport', async function (assert) {
        await render(hbs`<NotificationTray @renderInPlace={{true}} />`);
        await click('.ember-basic-dropdown-trigger');

        assert.ok(document.querySelector('.ember-basic-dropdown-content'), 'the dropdown opens');
    });

    module('universe events', function () {
        test('deleted notifications are removed from the tray', async function (assert) {
            const first = notificationFixture('n1');
            stored = [first, notificationFixture('n2')];

            await render(TEMPLATE);
            assert.dom(badge()).hasText('2');

            fireUniverse('notifications.deleted', [first]);
            await settled();

            assert.dom(badge()).hasText('1');
        });

        test('a single deleted notification is removed too', async function (assert) {
            const first = notificationFixture('n1');
            stored = [first, notificationFixture('n2')];

            await render(TEMPLATE);
            assert.dom(badge()).hasText('2');

            // The event carries one record rather than a list.
            fireUniverse('notifications.deleted', first);
            await settled();

            assert.dom(badge()).hasText('1');
        });

        test('a read event reloads from the store', async function (assert) {
            stored = [notificationFixture('n1'), notificationFixture('n2')];

            await render(TEMPLATE);
            assert.dom(badge()).hasText('2');

            stored = [notificationFixture('n2')];
            fireUniverse('notifications.read');
            await settled();

            assert.dom(badge()).hasText('1');
        });

        test('an all-read event reloads from the store', async function (assert) {
            stored = [notificationFixture('n1')];

            await render(TEMPLATE);
            assert.dom(badge()).hasText('1');

            stored = [];
            fireUniverse('notifications.all_read');
            await settled();

            assert.notOk(badge());
        });
    });

    module('interacting', function () {
        test('clicking a notification marks it read and drops it from the tray', async function (assert) {
            const notification = notificationFixture('n1');
            stored = [notification];

            await render(TEMPLATE);
            await click('.ember-basic-dropdown-trigger');
            await click('.notification-item');

            assert.ok(notification.read_at instanceof Date, 'it is stamped as read');
            assert.true(notification.saved, 'and persisted');
            assert.notOk(badge(), 'and removed from the tray');
        });

        test('the dropdown api is handed to the caller', async function (assert) {
            let api;
            this.set('registerAPI', (registered) => (api = registered));

            await render(TEMPLATE);

            assert.ok(api, 'the api is registered');
        });

        test('the view-all link reports the press', async function (assert) {
            let pressed = 0;
            this.set('onPressViewAllNotifications', () => pressed++);
            stored = [notificationFixture('n1')];

            await render(TEMPLATE);
            await click('.ember-basic-dropdown-trigger');

            const link = find('.notification-tray-view-all-link');
            assert.ok(link, 'the link is offered');
            assert.dom(link).hasText('View all notifications');

            await clickWithoutNavigating(link);
            assert.strictEqual(pressed, 1, 'the callback fires');
        });

        test('the view-all link is clickable without a handler', async function (assert) {
            stored = [notificationFixture('n1')];

            await render(hbs`<NotificationTray @renderInPlace={{true}} />`);
            await click('.ember-basic-dropdown-trigger');
            await clickWithoutNavigating(find('.notification-tray-view-all-link'));

            assert.dom('.notification-tray-view-all-link').exists('no handler is required');
        });

        test('an empty tray says so', async function (assert) {
            await render(TEMPLATE);
            await click('.ember-basic-dropdown-trigger');

            assert.dom(this.element).containsText('No unread notifications');
        });

        test('onInitialize is called as the tray comes up', async function (assert) {
            let initialized = 0;
            this.set('onInitialize', () => initialized++);

            await render(TEMPLATE);

            assert.strictEqual(initialized, 1);
        });
    });
});
