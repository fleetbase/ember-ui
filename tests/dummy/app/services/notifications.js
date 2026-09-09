import Service from '@ember/service';

/**
 * Stub of the host console's `notifications` flash-message service.
 * Records every message on `calls` for assertions; renders nothing.
 */
export default class NotificationsService extends Service {
    calls = [];

    success(message, options) {
        this.calls.push({ method: 'success', args: [message, options] });
    }

    error(message, options) {
        this.calls.push({ method: 'error', args: [message, options] });
    }

    warning(message, options) {
        this.calls.push({ method: 'warning', args: [message, options] });
    }

    info(message, options) {
        this.calls.push({ method: 'info', args: [message, options] });
    }

    serverError(error, fallbackMessage, options) {
        this.calls.push({ method: 'serverError', args: [error, fallbackMessage, options] });
    }

    clearAll() {
        this.calls.push({ method: 'clearAll', args: [] });
        return this;
    }
}
