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
});
