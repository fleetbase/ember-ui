'use strict';

/**
 * The dummy application is also the component playground (see PLAYGROUND.md).
 *
 * A GitHub Pages deploy needs two things a normal dev build does not: every asset resolved under
 * a sub-path (`/ember-ui/`), and hash routing, because Pages cannot rewrite deep links onto
 * index.html. Both are opt-in through the environment so `ember build`, `ember serve` and the
 * test suite are completely unaffected.
 *
 * `PLAYGROUND_ROOT_URL` is deliberately a variable rather than a constant so moving the
 * playground to a custom domain later is a CI change, not a code change.
 */
const PLAYGROUND_BUILD = process.env.PLAYGROUND === 'true';
const PLAYGROUND_ROOT_URL = process.env.PLAYGROUND_ROOT_URL || '/ember-ui/';

module.exports = function (environment) {
    const ENV = {
        modulePrefix: 'dummy',
        environment,
        rootURL: PLAYGROUND_BUILD ? PLAYGROUND_ROOT_URL : '/',
        locationType: PLAYGROUND_BUILD ? 'hash' : 'history',
        EmberENV: {
            EXTEND_PROTOTYPES: false,
            FEATURES: {
                // Here you can enable experimental features on an ember canary build
                // e.g. EMBER_NATIVE_DECORATOR_SUPPORT: true
            },
        },

        APP: {
            // Here you can pass flags/options to your application instance
            // when it is created

            // Whether the suite was launched with `ember test --server` / `-s`.
            // tests/test-helper.js needs this to choose how coverage is posted: testem's
            // afterTests hook is the reliable path in CI mode but does not fire in server mode.
            // See https://github.com/ember-cli-code-coverage/ember-cli-code-coverage/issues/420
            isRunningWithServerArgs: process.argv.includes('--server') || process.argv.includes('-s'),
        },

        playground: {
            isPagesBuild: PLAYGROUND_BUILD,
            rootURL: PLAYGROUND_BUILD ? PLAYGROUND_ROOT_URL : '/',
        },
    };

    if (environment === 'development') {
        // ENV.APP.LOG_RESOLVER = true;
        // ENV.APP.LOG_ACTIVE_GENERATION = true;
        // ENV.APP.LOG_TRANSITIONS = true;
        // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
        // ENV.APP.LOG_VIEW_LOOKUPS = true;
    }

    if (environment === 'test') {
        // Testem prefers this...
        ENV.locationType = 'none';

        // keep test console output quieter
        ENV.APP.LOG_ACTIVE_GENERATION = false;
        ENV.APP.LOG_VIEW_LOOKUPS = false;

        ENV.APP.rootElement = '#ember-testing';
        ENV.APP.autoboot = false;
    }

    if (environment === 'production') {
        // here you can enable a production-specific feature
    }

    return ENV;
};
