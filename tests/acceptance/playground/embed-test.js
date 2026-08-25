import { module, test } from 'qunit';
import { visit, click, fillIn, find } from '@ember/test-helpers';
import { setupApplicationTest } from 'dummy/tests/helpers';

/**
 * The embed route is what the documentation site puts in an iframe: no catalog navigation, no
 * application header, preview first, then controls, then the event log.
 */
module('Acceptance | playground | embed', function (hooks) {
    setupApplicationTest(hooks);

    module('layout', function () {
        test('it renders the component with no playground chrome', async function (assert) {
            await visit('/embed/badge');

            assert.dom('[data-test-embed="badge"]').exists();
            assert.dom('[data-test-playground-host="badge"]').hasClass('pg-host--embedded');
            assert.dom('[data-test-preview]').exists('the preview rendered');

            assert.dom('[data-test-brand]').doesNotExist('no application header');
            assert.dom('[data-test-catalog]').doesNotExist('no catalog');
            assert.dom('[data-test-back]').doesNotExist('no breadcrumb');
            assert.dom('[data-test-component-page]').doesNotExist('not the full component page');
        });

        test('the preview comes before the controls in document order', async function (assert) {
            await visit('/embed/badge');

            const host = find('[data-test-playground-host="badge"]');
            const preview = host.querySelector('[data-test-preview]');
            const controls = host.querySelector('[data-test-control]');

            assert.ok(preview.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING, 'preview first, controls below');
        });

        test('an undocumented component has no embed either', async function (assert) {
            await visit('/embed/chat-container');

            assert.dom('[data-test-not-found]').exists();
        });
    });

    module('shared state and controls', function () {
        test('controls work inside the embed', async function (assert) {
            await visit('/embed/badge');

            await fillIn('[data-test-control-input="text"]', 'Delivered');

            assert.dom('[data-test-preview]').containsText('Delivered');
        });

        test('the embed and the full page share the same encoded state', async function (assert) {
            await visit('/components/badge');
            await fillIn('[data-test-control-input="text"]', 'Shared value');

            const encoded = find('[data-test-embed-url]').textContent.split('state=')[1];

            assert.ok(encoded, 'the component page offers an embed URL carrying the state');

            await visit(`/embed/badge?state=${encoded}`);

            assert.dom('[data-test-preview]').containsText('Shared value', 'the embed restored the same preview');
        });

        test('reset works inside the embed', async function (assert) {
            await visit('/embed/badge');

            await fillIn('[data-test-control-input="text"]', 'Changed');
            assert.dom('[data-test-preview]').containsText('Changed');

            await click('[data-test-reset]');

            assert.dom('[data-test-control-input="text"]').hasValue('', 'the documented default came back');
        });

        test('malformed state in an embed URL falls back safely', async function (assert) {
            await visit('/embed/badge?state=%21%21broken%21%21');

            assert.dom('[data-test-preview]').exists('the embed still rendered');
            assert.dom('[data-test-state-warnings]').exists('and said so');
        });
    });

    module('resize messaging', function () {
        test('it posts its height to the parent, and only its height', async function (assert) {
            const messages = [];
            const original = window.parent.postMessage;

            // The playground only posts when it is framed; in a test the frame is the test window,
            // so the call is intercepted here rather than simulated.
            window.parent.postMessage = function (payload, target) {
                messages.push({ payload, target });
            };

            try {
                await visit('/embed/badge');

                const resizes = messages.filter((message) => message.payload?.type === 'fleetbase:ember-ui-playground:resize');

                assert.ok(resizes.length > 0, 'a resize message was posted');

                const [{ payload }] = resizes;

                assert.strictEqual(payload.slug, 'badge', 'it names the component');
                assert.strictEqual(typeof payload.height, 'number', 'it carries a numeric height');
                assert.deepEqual(Object.keys(payload).sort(), ['height', 'slug', 'type'], 'height, slug and type — nothing else leaves the frame');
            } finally {
                window.parent.postMessage = original;
            }
        });

        test('the full component page does not post resize messages', async function (assert) {
            const messages = [];
            const original = window.parent.postMessage;

            window.parent.postMessage = function (payload, target) {
                messages.push({ payload, target });
            };

            try {
                await visit('/components/badge');

                const resizes = messages.filter((message) => message.payload?.type === 'fleetbase:ember-ui-playground:resize');

                assert.strictEqual(resizes.length, 0, 'only the embed reports its height');
            } finally {
                window.parent.postMessage = original;
            }
        });
    });
});
