import Service from '@ember/service';

/**
 * Stub of the host console's `scheduling` service.
 * `setAvailability` is a pseudo ember-concurrency task echoing back the given data.
 */
export default class SchedulingService extends Service {
    calls = [];

    setAvailability = {
        isRunning: false,
        isIdle: true,
        perform: (data) => {
            this.calls.push({ method: 'setAvailability.perform', args: [data] });
            return Promise.resolve(data);
        },
    };
}
