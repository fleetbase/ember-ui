import EmberRouter from '@ember/routing/router';
import config from 'dummy/config/environment';

export default class Router extends EmberRouter {
    location = config.locationType;
    rootURL = config.rootURL;
}

// The addon ships components that <LinkTo> host-application routes. Those routes must
// exist here or rendering the component raises "The route ... was not found", which
// surfaces as an uncaught global error and aborts the whole test run.
Router.map(function () {
    this.route('console', function () {
        this.route('notifications');
        // A route WITH a dynamic segment, so tab-navigation's `_isMenuItem` branch (which sets
        // `model` from the tab's slug and `query` from its view) has somewhere to link to.
        this.route('menu-item', { path: '/menu-item/:slug' });
    });
});
