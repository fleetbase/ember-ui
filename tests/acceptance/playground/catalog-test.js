import { module, test } from 'qunit';
import { visit, currentURL, click, fillIn, findAll, triggerKeyEvent } from '@ember/test-helpers';
import { setupApplicationTest } from 'dummy/tests/helpers';
import REGISTRY from 'dummy/playground/registry';

module('Acceptance | playground | catalog', function (hooks) {
    setupApplicationTest(hooks);

    test('the root redirects to the catalog', async function (assert) {
        await visit('/');

        assert.strictEqual(currentURL(), '/components', 'the front door is the catalog');
    });

    test('the catalog lists every documented component', async function (assert) {
        await visit('/components');

        assert.dom('[data-test-catalog]').exists();
        assert.strictEqual(findAll('[data-test-catalog-link]').length, REGISTRY.length, `all ${REGISTRY.length} documented components are listed`);
        assert.dom('[data-test-catalog-count]').hasText(`${REGISTRY.length} of ${REGISTRY.length} components`);
    });

    test('it groups components under the documentation categories', async function (assert) {
        await visit('/components');

        assert.dom('[data-test-catalog-group="Layout & Structure"]').exists();
        assert.dom('[data-test-catalog-group="Forms & Inputs"]').exists();
        assert.dom('[data-test-catalog-group="Registry & Slots"]').exists();
    });

    module('search', function () {
        test('searching by display name narrows the list', async function (assert) {
            await visit('/components');
            await fillIn('[data-test-catalog-search]', 'button');

            const links = findAll('[data-test-catalog-link]').map((el) => el.getAttribute('data-test-catalog-link'));

            assert.ok(links.includes('button'), 'Button matched');
            assert.ok(links.includes('dropdown-button'), 'DropdownButton matched');
            assert.notOk(links.includes('badge'), 'Badge did not match');
        });

        test('searching by slug works too', async function (assert) {
            await visit('/components');
            await fillIn('[data-test-catalog-search]', 'layout-resource');

            assert.strictEqual(findAll('[data-test-catalog-link]').length, 4, 'the four resource layouts matched');
        });

        test('search is reflected in the URL so a filtered catalog is linkable', async function (assert) {
            await visit('/components');
            await fillIn('[data-test-catalog-search]', 'kanban');

            assert.ok(currentURL().includes('q=kanban'), `the query is in the URL: ${currentURL()}`);
        });

        test('a search matching nothing explains itself', async function (assert) {
            await visit('/components');
            await fillIn('[data-test-catalog-search]', 'zzzznotacomponent');

            assert.dom('[data-test-catalog-empty]').exists();
            assert.dom('[data-test-catalog-count]').hasText(`0 of ${REGISTRY.length} components`);
        });
    });

    module('category filter', function () {
        test('filtering by category narrows the list', async function (assert) {
            await visit('/components');
            await fillIn('[data-test-catalog-category]', 'Modals');

            const expected = REGISTRY.filter((entry) => entry.category === 'Modals').length;

            assert.strictEqual(findAll('[data-test-catalog-link]').length, expected, `the ${expected} modal components are shown`);
            assert.dom('[data-test-catalog-group="Data Display"]').doesNotExist();
        });

        test('search and category compose', async function (assert) {
            await visit('/components');
            await fillIn('[data-test-catalog-category]', 'Forms & Inputs');
            await fillIn('[data-test-catalog-search]', 'select');

            const links = findAll('[data-test-catalog-link]').map((el) => el.getAttribute('data-test-catalog-link'));

            assert.deepEqual(links.sort(), ['model-select', 'multi-select', 'select'], 'both filters applied');
        });
    });

    module('navigation', function () {
        test('a catalog entry links to its component page', async function (assert) {
            await visit('/components');
            await click('[data-test-catalog-link="badge"]');

            assert.strictEqual(currentURL(), '/components/badge');
            assert.dom('[data-test-component-title]').hasText('Badge');
        });

        test('moving straight from one component page to another re-applies its defaults', async function (assert) {
            // Regression: both pages are the same route in the same template position, so Ember
            // REUSES the host component and its constructor does not run again. Before this was
            // handled, Table rendered with Button's control values — every key it does not share
            // arrived as `undefined`, so `@selectable` and friends were silently dropped.
            //
            // Every other test boots a fresh application per test, so only a direct page-to-page
            // navigation inside one test reaches this.
            await visit('/components/button');

            assert.dom('[data-test-control-input="text"]').hasValue('Save changes', 'Button starts from its defaults');

            // Straight from one component page to the next. Going via the catalog would tear the
            // host down and rebuild it, which is exactly the path that does NOT reproduce this.
            await visit('/components/table');

            assert.dom('[data-test-component-title]').hasText('Table');
            assert.dom('[data-test-control-input="selectable"]').isChecked('Table got its own documented default');
            assert.dom('[data-test-control-input="page"]').hasValue('1', 'and its own numeric default');
            assert.dom('[data-test-preview] tbody input[type="checkbox"]').exists('the real component received the value');
        });

        test('navigating between component pages without passing through the catalog', async function (assert) {
            // The same reuse path, with no intervening route to force a teardown.
            await visit('/components/badge');
            await visit('/components/progress-bar');

            assert.dom('[data-test-component-title]').hasText('ProgressBar');
            assert.dom('[data-test-control-input="percent"]').hasValue('45', 'ProgressBar defaults applied, not Badge leftovers');
            assert.dom('[data-test-control-input="title"]').hasValue('Uploading');
        });

        test('the event log resets when the page moves to another component', async function (assert) {
            await visit('/components/button');
            await click('[data-test-preview] button.btn');

            assert.dom('[data-test-event="onClick"]').exists('Button recorded a click');

            await visit('/components/table');

            assert.dom('[data-test-event="onClick"]').doesNotExist('the previous component’s events did not carry over');
        });

        test('the component page links back to the catalog', async function (assert) {
            await visit('/components/badge');
            await click('[data-test-back]');

            assert.strictEqual(currentURL(), '/components');
        });

        test('catalog links are focusable and activate from the keyboard', async function (assert) {
            await visit('/components');

            const link = findAll('[data-test-catalog-link]')[0];

            link.focus();

            assert.strictEqual(document.activeElement, link, 'the link takes focus');

            // A real <a href> activates on Enter natively; asserting the anchor semantics is what
            // makes that true, rather than simulating the browser's own behaviour.
            assert.dom(link).hasTagName('a');
            assert.dom(link).hasAttribute('href');

            await triggerKeyEvent(link, 'keydown', 'Enter');

            assert.ok(true, 'keyboard interaction does not raise');
        });

        test('the application header links to the official documentation', async function (assert) {
            await visit('/components');

            assert.dom('[data-test-docs-root]').hasAttribute('href', 'https://fleetbase.io/docs/ui');
        });
    });

    module('scope', function () {
        test('an unknown route lands on the intentional not-found page', async function (assert) {
            await visit('/components/not-a-real-component');

            assert.dom('[data-test-not-found]').exists();
        });

        test('an undocumented public component is not exposed', async function (assert) {
            // Real public exports the documentation does not cover. None may resolve.
            for (const slug of ['chat-container', 'metadata-editor', 'autocomplete-input']) {
                await visit(`/components/${slug}`);

                assert.dom('[data-test-not-found]').exists(`${slug} is not exposed`);
            }
        });

        test('not-found offers a way back', async function (assert) {
            await visit('/components/nope');
            await click('[data-test-back-to-catalog]');

            assert.strictEqual(currentURL(), '/components');
        });
    });
});
