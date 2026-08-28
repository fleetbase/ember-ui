import { module, test } from 'qunit';
import { visit, find, click } from '@ember/test-helpers';
import { setupApplicationTest } from 'dummy/tests/helpers';

/**
 * The playground has to render components the way a consuming application does, and it has to be
 * usable as an ordinary page. Both of these were broken and are easy to break again, because both
 * depend on what the HOST application contributes rather than on anything in a component.
 */
module('Acceptance | playground | styling', function (hooks) {
    setupApplicationTest(hooks);

    module('the addon stylesheet reaches the preview', function () {
        test('a previewed Button carries the addon classes and their computed styles', async function (assert) {
            await visit('/components/button');

            const button = find('[data-test-preview] button.btn');

            assert.ok(button, 'a real addon button is rendered');
            assert.dom(button).hasClass('btn-default', 'the type class is applied');
            assert.dom(button).hasClass('btn-sm', 'the size class is applied');

            const styles = window.getComputedStyle(button);

            // `.btn-default` supplies the border and background; `.btn-sm` the radius. If the addon
            // stylesheet were missing, these would be the user agent's defaults instead.
            assert.strictEqual(styles.borderTopWidth, '1px', '.btn-default border width applied');
            assert.strictEqual(styles.backgroundColor, 'rgb(255, 255, 255)', '.btn-default background applied');
            assert.strictEqual(styles.borderTopLeftRadius, '6px', '.btn-sm radius applied');
        });

        test('the base layer normalises the button, so it does not keep the user agent text colour', async function (assert) {
            // Regression: `addon/styles/addon.css` deliberately ships no `@tailwind base` — an
            // addon must not emit preflight. The HOST application supplies it, and here the
            // playground is the host. Without it a <button> keeps `color: buttontext` (pure black)
            // rather than inheriting, and the previews looked unstyled when only the layer
            // underneath them was missing.
            await visit('/components/button');

            const styles = window.getComputedStyle(find('[data-test-preview] button.btn'));

            assert.notStrictEqual(styles.color, 'rgb(0, 0, 0)', 'the button is not falling back to the UA button colour');
        });
    });

    module('dark theme reaches the previewed components', function () {
        test('the theme is mirrored onto <body>, which is what the addon styles key off', async function (assert) {
            // Regression: 1094 of the addon's rules are scoped to `body[data-theme='dark']`
            // specifically, not to any ancestor. Setting the attribute only on the playground's own
            // container themed the chrome and left every previewed component in its light colours —
            // in dark mode that meant near-black text on a dark surface.
            await visit('/components/button');

            assert.strictEqual(document.body.getAttribute('data-theme'), 'light', 'it starts light');

            await click('[data-test-theme-toggle]');

            assert.strictEqual(document.body.getAttribute('data-theme'), 'dark', 'the addon sees the dark theme');
            assert.dom('[data-test-playground-host="button"]').hasAttribute('data-test-theme', 'dark');
        });

        test('the embed mirrors it too', async function (assert) {
            await visit('/embed/button');

            assert.strictEqual(document.body.getAttribute('data-theme'), 'light');

            await click('[data-test-theme-toggle]');

            assert.strictEqual(document.body.getAttribute('data-theme'), 'dark');
        });
    });

    module('the page is an ordinary scrollable document', function () {
        test('neither html nor body is locked to the viewport', async function (assert) {
            // Regression: the addon's shipped CSS contains
            // `body, html { height: 100vh; overflow: hidden }` for the console shell, which
            // manages its own scroll regions. Inheriting it made everything below the fold
            // unreachable in the playground.
            await visit('/components');

            for (const element of [document.documentElement, document.body]) {
                const styles = window.getComputedStyle(element);

                assert.notStrictEqual(styles.overflowY, 'hidden', `${element.tagName.toLowerCase()} does not clip vertically`);
                assert.notStrictEqual(styles.maxHeight, '100%', `${element.tagName.toLowerCase()} is not capped to the viewport`);
            }
        });

        test('nothing between the catalog and the document clips it to a fixed height', async function (assert) {
            // Comparing `body.scrollHeight` to `window.innerHeight` would be a test of the test
            // runner's container, not of the playground — the suite renders into `#ember-testing`,
            // which is not the browser viewport. What actually broke was an ancestor combining a
            // fixed height with hidden overflow, so that is what is asserted.
            await visit('/components');

            const clipping = [];

            for (let node = find('[data-test-catalog]'); node && node !== document; node = node.parentElement ?? document) {
                const styles = window.getComputedStyle(node);
                const clipsVertically = styles.overflowY === 'hidden' || styles.overflow === 'hidden';
                const fixedHeight = styles.height !== 'auto' && styles.maxHeight !== 'none';

                if (clipsVertically && fixedHeight) {
                    clipping.push(`${node.tagName.toLowerCase()}${node.id ? '#' + node.id : ''} (height ${styles.height}, max-height ${styles.maxHeight})`);
                }

                if (node === document.documentElement) {
                    break;
                }
            }

            assert.deepEqual(clipping, [], 'no ancestor caps the catalog and hides the overflow');
        });
    });
});
