import StubEventedService from '../utils/stub-evented-service';

/**
 * Stub of the host console's `hostRouter` (a RouterService proxy). Router-shaped surface:
 * `currentRouteName`/`currentURL`/`currentRoute`, `transitionTo`/`replaceWith` resolve
 * immediately, `on`/`off` support `routeDidChange`/`routeWillChange` listeners.
 */
export default class HostRouterService extends StubEventedService {
    calls = [];

    currentRouteName = 'index';
    currentURL = '/';
    currentRoute = { name: 'index', params: {}, queryParams: {} };
    rootURL = '/';

    transitionTo(...args) {
        this.calls.push({ method: 'transitionTo', args });
        return Promise.resolve();
    }

    replaceWith(...args) {
        this.calls.push({ method: 'replaceWith', args });
        return Promise.resolve();
    }

    urlFor(routeName) {
        this.calls.push({ method: 'urlFor', args: [routeName] });
        return `/${String(routeName).replace(/\./g, '/')}`;
    }

    isActive(routeName) {
        this.calls.push({ method: 'isActive', args: [routeName] });
        return routeName === this.currentRouteName;
    }

    refresh() {
        this.calls.push({ method: 'refresh', args: [] });
        return Promise.resolve();
    }
}
