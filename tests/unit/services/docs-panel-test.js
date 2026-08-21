import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

module('Unit | Service | docs-panel', function (hooks) {
    setupTest(hooks);

    test('it normalizes documentation slugs and urls', function (assert) {
        const service = this.owner.lookup('service:docs-panel');

        assert.strictEqual(service.normalizeUrl(), 'https://www.fleetbase.io/docs/?embed=console');
        assert.strictEqual(service.normalizeUrl('fleet-ops/resources/vehicles/overview'), 'https://www.fleetbase.io/docs/fleet-ops/resources/vehicles/overview?embed=console');
        assert.strictEqual(service.normalizeUrl('/docs/fleet-ops/resources/vehicles/overview'), 'https://www.fleetbase.io/docs/fleet-ops/resources/vehicles/overview?embed=console');
        assert.strictEqual(service.normalizeUrl('docs/fleet-ops/resources/vehicles/overview'), 'https://www.fleetbase.io/docs/fleet-ops/resources/vehicles/overview?embed=console');
        assert.strictEqual(
            service.normalizeUrl('https://www.fleetbase.io/docs/fleet-ops/resources/vehicles/overview'),
            'https://www.fleetbase.io/docs/fleet-ops/resources/vehicles/overview?embed=console'
        );
        assert.strictEqual(service.normalizeUrl('https://example.com/help'), 'https://example.com/help');
    });

    test('it appends theme only to Fleetbase docs urls', function (assert) {
        const service = this.owner.lookup('service:docs-panel');

        assert.strictEqual(
            service.normalizeUrl('fleet-ops/resources/vehicles/overview', { theme: 'light' }),
            'https://www.fleetbase.io/docs/fleet-ops/resources/vehicles/overview?embed=console&theme=light'
        );
        assert.strictEqual(
            service.normalizeUrl('https://www.fleetbase.io/docs/fleet-ops/resources/vehicles/overview?foo=bar', { theme: 'dark' }),
            'https://www.fleetbase.io/docs/fleet-ops/resources/vehicles/overview?foo=bar&embed=console&theme=dark'
        );
        assert.strictEqual(service.normalizeUrl('https://example.com/help', { theme: 'light' }), 'https://example.com/help');
    });

    test('it can embed normalized Fleetbase docs urls', function (assert) {
        const service = this.owner.lookup('service:docs-panel');

        service.open('fleet-ops/resources/vehicles/overview', { title: 'Vehicles guide' });

        assert.strictEqual(service.url, 'https://www.fleetbase.io/docs/fleet-ops/resources/vehicles/overview?embed=console&theme=light');
        assert.strictEqual(service.title, 'Vehicles guide');
        assert.true(service.canEmbed);
        assert.true(service.isIframeLoading);
    });

    test('it tracks loading state for iframe lifecycle', function (assert) {
        const service = this.owner.lookup('service:docs-panel');

        service.open('fleet-ops/resources/vehicles/overview');
        assert.true(service.isIframeLoading, 'docs iframe starts loading');

        service.markIframeLoaded();
        assert.false(service.isIframeLoading, 'load clears loading state');

        service.open('https://example.com/help');
        assert.false(service.isIframeLoading, 'external fallback does not keep loading');

        service.open('fleet-ops/resources/vehicles/overview');
        service.markIframeFailed();
        assert.false(service.isIframeLoading, 'error clears loading state');
    });

    module('opening and closing', function () {
        test('opening records the title, source and open state', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            service.open('fleet-ops/overview', { title: 'Fleet Ops', source: 'user-menu' });

            assert.true(service.isOpen);
            assert.strictEqual(service.title, 'Fleet Ops');
            assert.strictEqual(service.source, 'user-menu');
            assert.false(service.iframeFailed);
        });

        test('opening without options falls back to a generic title and no source', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            service.open('fleet-ops/overview');

            assert.strictEqual(service.title, 'Documentation');
            assert.strictEqual(service.source, null);
        });

        test('reopening clears a previous failure', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            service.open('fleet-ops/overview');
            service.markIframeFailed();
            assert.true(service.iframeFailed);

            service.open('fleet-ops/overview');
            assert.false(service.iframeFailed, 'the new document starts clean');
        });

        test('closing clears the open and loading state but keeps the url', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            service.open('fleet-ops/overview');
            service.close();

            assert.false(service.isOpen);
            assert.false(service.isIframeLoading);
            assert.strictEqual(service.url, 'https://www.fleetbase.io/docs/fleet-ops/overview?embed=console&theme=light', 'the url survives so the panel can be reopened');
        });
    });

    module('embedding', function () {
        test('nothing is embeddable before a document is opened', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            assert.false(service.canEmbed);
        });

        test('every official docs host is embeddable', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            for (const url of ['https://www.fleetbase.io/docs/a', 'https://fleetbase.io/docs/a', 'https://docs.fleetbase.io/anything']) {
                service.url = url;
                assert.true(service.canEmbed, `${url} is embeddable`);
            }
        });

        test('an official host outside /docs is not embeddable', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            service.url = 'https://www.fleetbase.io/pricing';

            assert.false(service.canEmbed, 'only the docs path is embeddable on the marketing host');
        });

        test('a third-party url is not embeddable', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            service.url = 'https://example.com/help';

            assert.false(service.canEmbed);
        });

        test('an unparseable url is not embeddable', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            service.url = 'http://[::bad::]/docs';

            assert.false(service.canEmbed, 'a malformed url is rejected rather than throwing');
        });
    });

    module('theming', function () {
        test('the theme drives the body wrapper class', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            service.open('fleet-ops/overview', { theme: 'dark' });
            assert.true(service.isIframeThemeDark);
            assert.strictEqual(service.bodyWrapperClass, 'fleetbase-docs-panel-body fleetbase-docs-panel-body-dark');

            service.open('fleet-ops/overview', { theme: 'light' });
            assert.false(service.isIframeThemeDark);
            assert.strictEqual(service.bodyWrapperClass, 'fleetbase-docs-panel-body fleetbase-docs-panel-body-light');
        });

        test('an unsupported theme falls back to the theme service', function (assert) {
            const themeService = this.owner.lookup('service:theme');
            themeService.currentTheme = 'dark';
            const service = this.owner.lookup('service:docs-panel');

            service.open('fleet-ops/overview', { theme: 'neon' });

            assert.strictEqual(service.iframeTheme, 'dark', 'the console theme wins over an unrecognised value');
        });

        test('with no theme at all the theme service is consulted', function (assert) {
            const themeService = this.owner.lookup('service:theme');
            themeService.currentTheme = 'dark';
            const service = this.owner.lookup('service:docs-panel');

            service.open('fleet-ops/overview');

            assert.strictEqual(service.iframeTheme, 'dark');
            assert.true(service.url.includes('theme=dark'));
        });

        test('a theme service reporting nothing usable falls back to light', function (assert) {
            const themeService = this.owner.lookup('service:theme');
            themeService.currentTheme = undefined;
            const service = this.owner.lookup('service:docs-panel');

            service.open('fleet-ops/overview');

            assert.strictEqual(service.iframeTheme, 'light');
        });

        test('sanitizeTheme accepts only the supported themes', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            assert.strictEqual(service.sanitizeTheme('light'), 'light');
            assert.strictEqual(service.sanitizeTheme('dark'), 'dark');
            assert.strictEqual(service.sanitizeTheme('neon'), undefined);
            assert.strictEqual(service.sanitizeTheme(undefined), undefined);
        });
    });

    module('url classification', function () {
        test('isOfficialDocsUrl recognises the docs hosts', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            assert.true(service.isOfficialDocsUrl('https://www.fleetbase.io/docs/a'));
            assert.true(service.isOfficialDocsUrl('https://fleetbase.io/docs/a'));
            assert.true(service.isOfficialDocsUrl('https://docs.fleetbase.io/a'));
            assert.false(service.isOfficialDocsUrl('https://www.fleetbase.io/pricing'));
            assert.false(service.isOfficialDocsUrl('https://example.com/docs/a'));
            assert.false(service.isOfficialDocsUrl('http://[::bad::]/docs'), 'a malformed url is rejected rather than throwing');
        });

        test('withDocsEmbedParams leaves third-party urls untouched', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            assert.strictEqual(service.withDocsEmbedParams('https://example.com/help', 'dark'), 'https://example.com/help');
        });

        test('withDocsEmbedParams omits the theme when none is given', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            const url = service.withDocsEmbedParams('https://www.fleetbase.io/docs/a', undefined);

            assert.true(url.includes('embed=console'));
            assert.false(url.includes('theme='), 'no theme parameter is added');
        });

        test('withDocsEmbedParams returns a malformed url unchanged', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            assert.strictEqual(service.withDocsEmbedParams('http://[::bad::]/docs', 'light'), 'http://[::bad::]/docs');
        });

        test('a protocol-relative url is left alone', function (assert) {
            const service = this.owner.lookup('service:docs-panel');

            assert.strictEqual(service.normalizeUrl('//example.com/help'), '//example.com/help');
        });
    });

    test('openExternal opens the current url in a docs window', function (assert) {
        const service = this.owner.lookup('service:docs-panel');
        const opened = [];
        const originalOpen = window.open;
        window.open = (...args) => opened.push(args);

        try {
            service.openExternal();
            assert.deepEqual(opened, [], 'with no url nothing is opened');

            service.open('fleet-ops/overview');
            service.openExternal();

            assert.strictEqual(opened.length, 1);
            assert.strictEqual(opened[0][0], service.url);
            assert.strictEqual(opened[0][1], '_docs', 'it reuses a named docs window');
        } finally {
            window.open = originalOpen;
        }
    });
    // `resolveTheme` asks the owner whether a theme service exists before looking it up, so a host
    // application that ships none falls back to light rather than throwing.
    test('with no theme service registered the iframe theme falls back to light', function (assert) {
        this.owner.unregister('service:theme');
        const service = this.owner.lookup('service:docs-panel');

        assert.strictEqual(service.resolveTheme(), 'light', 'the registration check short-circuits the lookup');
        assert.strictEqual(service.resolveTheme('dark'), 'dark', 'an explicit theme still wins');
    });
});
