import { module, test } from 'qunit';
import { visit, currentURL, click, fillIn, find, findAll } from '@ember/test-helpers';
import { setupApplicationTest } from 'dummy/tests/helpers';

/**
 * Button is the playground's reference vertical slice, so this suite checks the WIRING rather than
 * Button's own behaviour. `tests/integration/components/button-test.js` already owns the component
 * contract — clicks, disabled state, permissions, analytics — and none of that is repeated here.
 *
 * What is asserted here is that each control reaches the real <Button>: if an adapter stops
 * forwarding a value, one of these fails.
 */
module('Acceptance | playground | button', function (hooks) {
    setupApplicationTest(hooks);

    const PAGE = '/components/button';

    function preview() {
        return find('[data-test-preview]');
    }

    function button() {
        return find('[data-test-preview] button.btn');
    }

    async function setControl(key, value) {
        await fillIn(`[data-test-control-input="${key}"]`, value);
    }

    module('rendering', function () {
        test('the page renders the real Button through the registry adapter', async function (assert) {
            await visit(PAGE);

            assert.strictEqual(currentURL(), PAGE, 'the route resolved');
            assert.dom('[data-test-component-title]').hasText('Button');
            assert.dom('[data-test-preview] [data-test-example-button]').exists('the example adapter rendered');
            assert.dom(button()).exists('a real addon button is in the preview');
            assert.dom(button()).hasText('Save changes', 'it starts from the documented default');
        });

        test('it reports the component identity, source and tests', async function (assert) {
            await visit(PAGE);

            assert.dom('[data-test-component-identifier]').hasText('<Button />');
            assert.dom('[data-test-source-path]').hasText('addon/components/button.hbs');
            assert.dom('[data-test-test-path]').hasText('tests/integration/components/button-test.js');
        });

        test('the official documentation link is correct', async function (assert) {
            await visit(PAGE);

            assert.dom('[data-test-docs-link]').hasAttribute('href', 'https://fleetbase.io/docs/ui/actions/button');
        });
    });

    module('controls drive the real component', function () {
        test('changing the text updates the button', async function (assert) {
            await visit(PAGE);
            await setControl('text', 'Dispatch order');

            assert.dom(button()).hasText('Dispatch order');
        });

        test('changing the type changes the rendered presentation', async function (assert) {
            await visit(PAGE);

            assert.dom(button()).hasClass('btn-default', 'the documented default type');

            await setControl('type', 'danger');

            assert.dom(button()).hasClass('btn-danger');
            assert.dom(button()).doesNotHaveClass('btn-default');
        });

        test('changing the size changes the rendered presentation', async function (assert) {
            await visit(PAGE);

            assert.dom(button()).hasClass('btn-sm');

            await setControl('size', 'lg');

            assert.dom(button()).hasClass('btn-lg');
        });

        test('the loading control puts the button in its loading state', async function (assert) {
            await visit(PAGE);

            assert.dom('[data-test-preview] .btn-loading-icon-wrapper').doesNotExist();

            await click('[data-test-control-input="isLoading"]');

            assert.dom(button()).hasClass('btn-is-loading');
            assert.dom('[data-test-preview] .btn-loading-icon-wrapper').exists('the spinner replaced the icon');
            assert.dom(button()).isDisabled('a loading button is disabled');
        });

        test('the disabled control disables the button', async function (assert) {
            await visit(PAGE);

            assert.dom(button()).isNotDisabled();

            await click('[data-test-control-input="disabled"]');

            assert.dom(button()).isDisabled();
        });

        test('the visible control removes the button entirely', async function (assert) {
            await visit(PAGE);

            assert.dom(button()).exists();

            await click('[data-test-control-input="visible"]');

            assert.dom('[data-test-preview] button.btn').doesNotExist('a hidden button renders nothing');
        });

        test('the icon control renders an icon beside the text', async function (assert) {
            await visit(PAGE);

            assert.dom('[data-test-preview] .btn-icon-wrapper').doesNotExist();

            await setControl('icon', 'trash');

            assert.dom('[data-test-preview] .btn-icon-wrapper').exists();
        });

        test('the outline control applies the outline treatment', async function (assert) {
            await visit(PAGE);

            await click('[data-test-control-input="outline"]');

            assert.dom(button()).hasClass('btn-outline');
        });

        test('help text is offered as a tooltip', async function (assert) {
            await visit(PAGE);

            // Attach::Tooltip renders through a wormhole at the document root rather than inside
            // the preview element, so this is asserted unscoped — as button-test.js does.
            assert.dom('.ember-attacher').doesNotExist();

            await setControl('helpText', 'Saves and notifies the driver.');

            assert.dom('.ember-attacher').exists('a tooltip was attached');
        });
    });

    module('presets and reset', function () {
        test('selecting a preset writes documented values into the controls', async function (assert) {
            await visit(PAGE);

            await fillIn('[data-test-scenario]', 'danger');

            assert.dom(button()).hasClass('btn-danger');
            assert.dom(button()).hasText('Delete order');
            assert.dom('[data-test-control-input="type"]').hasValue('danger', 'the control reflects the preset');
        });

        test('reset restores the documented defaults', async function (assert) {
            await visit(PAGE);

            await setControl('text', 'Changed');
            await click('[data-test-control-input="disabled"]');

            assert.dom(button()).hasText('Changed');
            assert.dom(button()).isDisabled();

            await click('[data-test-reset]');

            assert.dom(button()).hasText('Save changes', 'text is back to its default');
            assert.dom(button()).isNotDisabled('disabled is back to its default');
        });
    });

    module('event log', function () {
        test('clicking the button records an event', async function (assert) {
            await visit(PAGE);

            // Button fires @onInsert as it enters the DOM, so the log is not empty on arrival —
            // that lifecycle callback is itself forwarded and worth showing.
            assert.dom('[data-test-event="onInsert"]').exists('the insert callback was recorded');
            assert.dom('[data-test-event="onClick"]').doesNotExist('nothing has been clicked yet');

            await click(button());

            assert.dom('[data-test-event-log]').exists();
            assert.dom('[data-test-event="onClick"]').exists('the click was recorded');
        });

        test('the log can be cleared', async function (assert) {
            await visit(PAGE);

            await click(button());
            assert.dom('[data-test-event="onClick"]').exists();

            await click('[data-test-clear-events]');

            assert.dom('[data-test-event-log]').doesNotExist();
            assert.dom('[data-test-events-empty]').exists();
        });
    });

    module('shareable state', function () {
        test('changing a control puts encoded state in the URL', async function (assert) {
            await visit(PAGE);
            await setControl('text', 'Encoded');

            assert.ok(currentURL().includes('state='), `state is in the URL: ${currentURL()}`);
        });

        test('encoded state survives revisiting the route', async function (assert) {
            await visit(PAGE);
            await setControl('text', 'Survives a revisit');
            await setControl('type', 'primary');

            const shared = currentURL();

            await visit('/components');
            await visit(shared);

            assert.dom(button()).hasText('Survives a revisit', 'the shared text came back');
            assert.dom(button()).hasClass('btn-primary', 'the shared type came back');
        });

        test('malformed state falls back to defaults with a warning', async function (assert) {
            await visit(`${PAGE}?state=%21%21not-real%21%21`);

            assert.dom(button()).hasText('Save changes', 'defaults were used');
            assert.dom('[data-test-state-warnings]').exists('the fallback is reported, not silent');
        });

        test('an unknown control key in the URL is ignored', async function (assert) {
            const encoded = btoa(JSON.stringify({ text: 'Kept', notAControl: 'dropped' }))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            await visit(`${PAGE}?state=${encoded}`);

            assert.dom(button()).hasText('Kept', 'known keys still applied');
            assert.dom('[data-test-state-warnings]').containsText('notAControl', 'the unknown key was reported');
        });
    });

    module('embed mode', function () {
        test('the embed route renders the same state with no catalog chrome', async function (assert) {
            await visit(PAGE);
            await setControl('text', 'Embedded');

            const encoded = new URL(`http://x${currentURL()}`).searchParams.get('state');

            await visit(`/embed/button?state=${encoded}`);

            assert.dom('[data-test-embed="button"]').exists('the embed route rendered');
            assert.dom(button()).hasText('Embedded', 'the same state was applied');
            assert.dom('[data-test-brand]').doesNotExist('no application header');
            assert.dom('[data-test-catalog]').doesNotExist('no catalog navigation');
        });

        test('controls still work inside the embed', async function (assert) {
            await visit('/embed/button');

            await setControl('text', 'Changed in embed');

            assert.dom(button()).hasText('Changed in embed');
        });

        test('the embed marks itself as the embedded layout', async function (assert) {
            await visit('/embed/button');

            assert.dom('[data-test-playground-host="button"]').hasClass('pg-host--embedded');
        });
    });

    module('theme', function () {
        test('the theme toggle switches the preview theme', async function (assert) {
            await visit(PAGE);

            assert.dom('[data-test-playground-host="button"]').hasAttribute('data-test-theme', 'light');

            await click('[data-test-theme-toggle]');

            assert.dom('[data-test-playground-host="button"]').hasAttribute('data-test-theme', 'dark');
        });
    });

    module('control validation', function () {
        test('an out-of-range number is reported and does not break the preview', async function (assert) {
            await visit('/components/progress-bar');

            await fillIn('[data-test-control-input="percent"]', '5000');

            assert.dom('[data-test-control-error="percent"]').exists('the invalid value is reported');
            assert.dom('[data-test-control-input="percent"]').hasAttribute('aria-invalid', 'true');
            assert.dom('[data-test-preview]').exists('the preview survived');
        });
    });

    module('scope', function () {
        test('an undocumented public component is not exposed', async function (assert) {
            // `activity-log` is documented; `aside-item-scroller` is a real public export that the
            // documentation does not cover, so it must NOT get a playground page.
            await visit('/components/aside-item-scroller');

            assert.dom('[data-test-not-found]').exists('an undocumented component lands on not-found');
            assert.dom('[data-test-component-page]').doesNotExist();
        });
    });

    test('findAll sanity: the page renders exactly one preview surface', async function (assert) {
        await visit(PAGE);

        assert.strictEqual(findAll('[data-test-preview]').length, 1);
        assert.ok(preview(), 'the preview surface exists');
    });
});
