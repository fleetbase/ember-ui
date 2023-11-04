import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import { action } from '@ember/object';

/**
 * NotificationTrayComponent is a Glimmer component for handling notifications.
 *
 * @class NotificationTrayComponent
 * @extends Component
 */
export default class NotificationTrayComponent extends Component {
    /**
     * Inject the `socket` service.
     *
     * @memberof NotificationTrayComponent
     * @type {SocketService}
     */
    @service socket;

    /**
     * Inject the `store` service.
     *
     * @memberof NotificationTrayComponent
     * @type {StoreService}
     */
    @service store;

    /**
     * Inject the `fetch` service.
     *
     * @memberof NotificationTrayComponent
     * @type {FetchService}
     */
    @service fetch;

    /**
     * Inject the `currentUser` service.
     *
     * @memberof NotificationTrayComponent
     * @type {CurrentUserService}
     */
    @service currentUser;

    /**
     * Inject the `universe` service.
     *
     * @memberof NotificationTrayComponent
     * @type {UniverseService}
     */
    @service universe;

    /**
     * Inject the `notification` service.
     *
     * @memberof NotificationTrayComponent
     * @type {NotificationService}
     */
    @service notification;

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
    notificationSound = new Audio('/sounds/notification-sound.mp3');

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

        if (isArray(notifications)) {
            _notifications.pushObjects(notifications);
        } else {
            _notifications.pushObject(notifications);
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
        let _notifications = [...this.notifications];

        if (isArray(notifications)) {
            _notifications.removeObjects(notifications);
        } else {
            _notifications.removeObject(notifications);
        }

        this.mutateNotifications(_notifications);
    }

    /**
     * mutates the tracked property with a filtered notifications array.
     *
     * @param {Array} notifications
     * @memberof NotificationTrayComponent
     */
    mutateNotifications(notifications) {
        this.notifications = notifications.filter(({ read_at }) => !read_at).uniqBy('id');
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
            this.notifications = notifications.filter(({ read_at }) => !read_at).uniqBy('id');

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
        this.notificationSound.play();
    }
}
