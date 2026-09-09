import Service from '@ember/service';

/**
 * Stub of the host console's `filters` service used by layout/resource tabular components
 * (`apply`, `reset`, `clear`, `set` passed as template actions). All no-ops, recorded on `calls`.
 */
export default class FiltersService extends Service {
    calls = [];

    apply = (controller) => {
        this.calls.push({ method: 'apply', args: [controller] });
    };

    reset = (controller) => {
        this.calls.push({ method: 'reset', args: [controller] });
    };

    clear = (...args) => {
        this.calls.push({ method: 'clear', args });
    };

    set = (...args) => {
        this.calls.push({ method: 'set', args });
    };
}
