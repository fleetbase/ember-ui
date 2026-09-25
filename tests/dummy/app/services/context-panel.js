import Service from '@ember/service';

/**
 * Stub of the host console's `contextPanel` service (`focus(resource, intent)` opens a panel
 * in the host app). Recorded no-ops only.
 */
export default class ContextPanelService extends Service {
    calls = [];

    focus(resource, intent, options = {}) {
        this.calls.push({ method: 'focus', args: [resource, intent, options] });
    }

    clear() {
        this.calls.push({ method: 'clear', args: [] });
    }
}
