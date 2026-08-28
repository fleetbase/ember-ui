'use strict';

module.exports = {
    test_page: 'tests/index.html?hidepassed',
    disable_watching: true,
    launch_in_ci: ['Chrome'],
    launch_in_dev: ['Chrome'],
    browser_start_timeout: 120,
    // The coverage upload runs inside Testem.afterTests, which testem waits for (see
    // tests/test-helper.js and DEFECTS.md #16). That payload is several megabytes once every
    // module is force-loaded, and the default 10s disconnect timeout is not enough for it — testem
    // kills the browser mid-upload and reports `Browser timeout exceeded: 10s` as a test error,
    // failing the run even though every test passed and the report was written. DEFECTS.md #19.
    browser_disconnect_timeout: 120,
    browser_args: {
        Chrome: {
            ci: [
                // --no-sandbox is needed when running Chrome inside a container
                process.env.CI ? '--no-sandbox' : null,
                '--headless',
                '--disable-dev-shm-usage',
                '--disable-software-rasterizer',
                '--mute-audio',
                '--remote-debugging-port=0',
                '--window-size=1440,900',
            ].filter(Boolean),
        },
    },
};
