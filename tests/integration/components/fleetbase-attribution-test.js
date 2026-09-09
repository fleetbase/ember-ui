import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import config from 'ember-get-config';

const NOTICE = '.fleetbase-attribution-notice';

module('Integration | Component | fleetbase-attribution', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a link to fleetbase.io and a legal button', async function (assert) {
        await render(hbs`<FleetbaseAttribution />`);

        assert.dom(NOTICE).exists();
        assert.dom('.fleetbase-attribution-link').hasAttribute('href', 'https://www.fleetbase.io');
        assert.dom('.fleetbase-attribution-link').hasAttribute('target', '_blank');
        assert.dom('.fleetbase-attribution-link').hasAttribute('rel', 'noopener noreferrer');
        assert.dom('.fleetbase-attribution-legal-link').hasText('Legal');
    });

    test('it is styled standalone unless a placement is given', async function (assert) {
        await render(hbs`<FleetbaseAttribution />`);
        assert.dom(NOTICE).hasClass('fleetbase-attribution-notice--standalone');

        await render(hbs`<FleetbaseAttribution @placement="sidebar" />`);
        assert.dom(NOTICE).hasClass('fleetbase-attribution-notice--sidebar');
    });

    test('the powered-by prefix is opt-in', async function (assert) {
        await render(hbs`<FleetbaseAttribution />`);
        assert.dom('.fleetbase-attribution-link').hasText('Fleetbase');

        await render(hbs`<FleetbaseAttribution @showPoweredBy={{true}} />`);
        assert.dom('.fleetbase-attribution-link').hasText('Powered by Fleetbase');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<FleetbaseAttribution data-test-attribution="yes" />`);

        assert.dom('[data-test-attribution="yes"]').exists();
    });

    // The version is read from the build-time config, so drive the config rather than an argument.
    test('the app version is shown when the build declares one', async function (assert) {
        const original = config.version;

        try {
            config.version = '1.2.3';
            await render(hbs`<FleetbaseAttribution />`);
            assert.dom('.fleetbase-attribution-version').hasText('v1.2.3');

            config.version = undefined;
            await render(hbs`<FleetbaseAttribution />`);
            assert.dom('.fleetbase-attribution-version').doesNotExist('and omitted when it does not');
        } finally {
            config.version = original;
        }
    });

    test('the whole notice can be disabled from the app config', async function (assert) {
        const original = config.APP?.disableFleetbaseAttribution;

        try {
            config.APP.disableFleetbaseAttribution = true;
            await render(hbs`<FleetbaseAttribution />`);

            assert.dom(NOTICE).doesNotExist('nothing is rendered at all');
        } finally {
            config.APP.disableFleetbaseAttribution = original;
        }
    });

    test('the legal button opens the legal-notice modal', async function (assert) {
        await render(hbs`<FleetbaseAttribution />`);
        await click('.fleetbase-attribution-legal-link');

        const modalsManager = this.owner.lookup('service:modals-manager');
        const [modal] = modalsManager.modals;

        assert.ok(modal, 'a modal is opened');
        assert.strictEqual(modal.options.title, 'Fleetbase Legal Notices');
        assert.strictEqual(modal.options.acceptButtonText, 'Done');
        assert.true(modal.options.hideDeclineButton, 'there is nothing to decline');
    });
});
