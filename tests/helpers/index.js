import { setupApplicationTest as upstreamSetupApplicationTest, setupRenderingTest as upstreamSetupRenderingTest, setupTest as upstreamSetupTest } from 'ember-qunit';

// This file exists to provide wrappers around ember-qunit's
// test setup functions. This way, you can easily extend the setup that is
// needed per test type.

function setupApplicationTest(hooks, options) {
    upstreamSetupApplicationTest(hooks, options);

    // Additional setup for application tests can be done here.
    //
    // For example, if you need an authenticated session for each
    // application test, you could do:
    //
    // hooks.beforeEach(async function () {
    //   await authenticateSession(); // ember-simple-auth
    // });
    //
    // This is also a good place to call test setup functions coming
    // from other addons:
    //
    // setupIntl(hooks); // ember-intl
    // setupMirage(hooks); // ember-cli-mirage
}

function setupRenderingTest(hooks, options) {
    upstreamSetupRenderingTest(hooks, options);

    // Additional setup for rendering tests can be done here.
}

function setupTest(hooks, options) {
    upstreamSetupTest(hooks, options);

    // Additional setup for unit tests can be done here.
}

/**
 * Pins the browser's answer to `(hover: none)` to "this device can hover".
 *
 * `Resource::HoverCard` deliberately never arms on a touch device, and a
 * headless Chrome reports `(hover: none)` as matching while a local windowed
 * one does not — so hover tests pass locally and time out in CI. Tests that
 * are about arming behaviour rather than device detection use this so they
 * run the same way in both places; the tests that cover the touch-device
 * branch stub `matchMedia` themselves and are unaffected.
 *
 * Only the hover query is answered here: everything else is delegated to the
 * real `matchMedia`, so unrelated queries keep working.
 */
function setupPointerDevice(hooks) {
    let nativeMatchMedia;

    hooks.beforeEach(function () {
        nativeMatchMedia = window.matchMedia;

        window.matchMedia = function (query) {
            if (typeof query === 'string' && query.replace(/\s+/g, '').includes('hover:none')) {
                return {
                    matches: false,
                    media: query,
                    onchange: null,
                    addEventListener() {},
                    removeEventListener() {},
                    addListener() {},
                    removeListener() {},
                    dispatchEvent: () => false,
                };
            }

            return nativeMatchMedia.call(window, query);
        };
    });

    hooks.afterEach(function () {
        window.matchMedia = nativeMatchMedia;
    });
}

export { setupApplicationTest, setupRenderingTest, setupTest, setupPointerDevice };
