import Service from '@ember/service';

/**
 * Stub of the host console's `events` analytics service.
 * `trackEvent` records to `calls` and sends nothing anywhere.
 */
export default class EventsService extends Service {
    calls = [];

    trackEvent(eventName, ...args) {
        this.calls.push({ method: 'trackEvent', args: [eventName, ...args] });
    }
}
