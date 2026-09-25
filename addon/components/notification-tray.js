import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import { action } from '@ember/object';
import calculatePosition from 'ember-basic-dropdown/utils/calculate-position';
import noop from '../utils/noop';

function uniqBy(arr, key) {
    return arr.reduce((unique, item) => {
        if (!unique.some((existingItem) => existingItem[key] === item[key])) {
            unique.push(item);
        }
        return unique;
    }, []);
}

/**
 * NotificationTrayComponent is a Glimmer component for handling notifications.
 *
 * @class NotificationTrayComponent
 * @extends Component
 */
export default class NotificationTrayComponent extends Component {
    @service socket;
    @service store;
    @service fetch;
    @service currentUser;
    @service universe;
    @service notification;
    @service media;

    /**
     * An array to store notifications.
     *
     * @memberof NotificationTrayComponent
     * @type {Array}
     */
    @tracked notifications = [];

    /**
     * A reference to the notification sound.
     *
     * @memberof NotificationTrayComponent
     * @type {Audio}
     */
    @tracked notificationSound = new Audio('/sounds/notification-sound.mp3');

    get renderInPlace() {
        if (this.media.isMobile) return false;
        if (typeof this.args.renderInPlace === 'boolean') {
            return this.args.renderInPlace;
        }

        return false;
    }

    /**
     * Creates an instance of the NotificationTrayComponent
     */
    constructor() {
        super(...arguments);
        this.listenForNotificationFrom(`user.${this.currentUser.id}`);
        this.listenForNotificationFrom(`company.${this.currentUser.companyId}`);
        this.fetchNotificationsFromStore();

        if (typeof this.args.onInitialize === 'function') {
            this.args.onInitialize(this.context);
        }

        // listen for notifications deleted
        this.universe.on('notifications.deleted', (notifications) => {
            this.removeNotifications(notifications);
        });

        // listen for notifications read
        this.universe.on('notifications.read', () => {
            this.fetchNotificationsFromStore();
        });

        // listen if all notifications read
        this.universe.on('notifications.all_read', () => {
            this.fetchNotificationsFromStore();
        });
    }

    /**
     * Calculate dropdown content position.
     *
     * @param {HTMLElement} trigger
     * @param {HTMLElement} content
     * @return {Object}
     * @memberof NotificationTrayComponent
     */
    @action calculatePosition(trigger, content) {
        if (this.media.isMobile) {
            content.classList.add('is-mobile');
            const triggerRect = trigger.getBoundingClientRect();
            const top = triggerRect.height + triggerRect.top;

            return { style: { left: '0px', right: '0px', top, padding: '0 0.5rem', width: '100%' } };
        }

        return calculatePosition(...arguments);
    }

    /**
     * Handles the click event on a notification.
     *
     * @param {NotificationModel} notification - The clicked notification.
     * @returns {Promise} A promise that resolves after marking the notification as read.
     * @memberof NotificationTrayComponent
     */
    @action onClickNotification(notification) {
        notification.setProperties({
            read_at: new Date(),
            _isRemoving: true,
        });

        return notification.save().then(() => {
            this.removeNotifications([notification]);
        });
    }

    /**
     * Registers the dropdown API.
     *
     * @param {DropdownApi} dropdownApi - The dropdown API instance.
     * @memberof NotificationTrayComponent
     */
    @action registerAPI(dropdownApi) {
        this.dropdownApi = dropdownApi;

        if (typeof this.args.registerAPI === 'function') {
            this.args.registerAPI(...arguments);
        }
    }

    /**
     * Handler for when "View all notifications" link is pressed in footer
     *
     * @returns {void}
     * @memberof NotificationTrayComponent
     */
    @action onPressViewAllNotifications() {
        if (typeof this.args.onPressViewAllNotifications === 'function') {
            this.args.onPressViewAllNotifications();
        }
    }

    /**
     * Listens for notifications from a specific channel.
     *
     * @param {string} channelId - The channel to listen to.
     * @memberof NotificationTrayComponent
     */
    async listenForNotificationFrom(channelId) {
        // setup socket
        const socket = this.socket.instance();

        // listen on company channel
        const channel = socket.subscribe(channelId);

        // listen to channel for events
        await channel.listener('subscribe').once();

        // get incoming data and console out
        (async () => {
            for await (let incomingNotification of channel) {
                if (typeof incomingNotification === 'object' && typeof incomingNotification.notification_id === 'string') {
                    this.onReceivedNotification(incomingNotification);
                }
            }
        })();
    }

    /**
     * Handles a received notification by fetching the notification record and processing it.
     *
     * @param {Object} notificationData - The received notification data.
     * @param {string} notificationData.id - The unique identifier of the notification.
     * @returns {Promise} A promise that resolves after processing the notification.
     * @memberof NotificationTrayComponent
     */
    onReceivedNotification({ id }) {
        return this.getNotificationRecordUsingId(id).then((notification) => {
            // add to notifications array
            this.insertNotifications(notification);

            // trigger notification sound
            this.ping();

            // handle callback
            if (typeof this.args.onReceivedNotification === 'function') {
                this.args.onReceivedNotification(notification);
            }

            // trigger universe event
            this.universe.trigger('notification.received', notification);
        });
    }

    /**
     * Inserts one or more notifications into the notifications array, ensuring uniqueness.
     *
     * @param {Array|Object} notifications - The notification(s) to insert into the array.
     * @memberof NotificationTrayComponent
     */
    insertNotifications(notifications) {
        let _notifications = [...this.notifications];

        /* istanbul ignore if -- the only caller is onReceivedNotification, which passes the one
           record it just resolved */
        if (isArray(notifications)) {
            _notifications.push(...notifications);
        } else {
            _notifications.push(notifications);
        }

        this.mutateNotifications(_notifications);
    }

    /**
     * Removes notifications from the tracked notifications array.
     *
     * @param {Array} notifications
     * @memberof NotificationTrayComponent
     */
    removeNotifications(notifications) {
        const doomed = new Set(isArray(notifications) ? notifications : [notifications]);
        const _notifications = [...this.notifications].filter((notification) => !doomed.has(notification));

        this.mutateNotifications(_notifications);
    }

    /**
     * mutates the tracked property with a filtered notifications array.
     *
     * @param {Array} notifications
     * @memberof NotificationTrayComponent
     */
    mutateNotifications(notifications) {
        this.notifications = uniqBy(
            notifications.filter(({ read_at }) => !read_at),
            'id'
        );
    }

    /**
     * Fetches a notification record using its unique identifier.
     *
     * @param {string} id - The unique identifier of the notification.
     * @returns {Promise} A promise that resolves with the notification record.
     * @memberof NotificationTrayComponent
     */
    getNotificationRecordUsingId(id) {
        return this.store.findRecord('notification', id);
    }

    /**
     * Fetches notifications from the store.
     *
     * @memberof NotificationTrayComponent
     */
    fetchNotificationsFromStore() {
        this.store.query('notification', { sort: '-created_at', limit: 20, unread: true }).then((notifications) => {
            // this.insertNotifications(notifications);
            this.notifications = uniqBy(
                notifications.filter(({ read_at }) => !read_at),
                'id'
            );

            if (typeof this.args.onNotificationsLoaded === 'function') {
                this.args.onNotificationsLoaded(this.notifications);
            }
        });
    }

    /**
     * Plays the notification sound.
     *
     * @memberof NotificationTrayComponent
     */
    ping() {
        // `play()` returns a promise that rejects whenever autoplay is blocked (no user
        // gesture yet) or the asset is missing — without this every incoming notification
        // produced an unhandled rejection. Same guard chat-tray already uses.
        this.notificationSound.play().catch(noop);
    }
}
