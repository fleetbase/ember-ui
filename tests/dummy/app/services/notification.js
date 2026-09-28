import NotificationsService from './notifications';

/**
 * Stub of the host console's singular `notification` service (same surface as `notifications`).
 * Used by e.g. addon/services/dashboard.js (`this.notification.serverError(error)`).
 */
export default class NotificationService extends NotificationsService {}
