import { module, test } from 'qunit';
import { visit, currentURL, find, setupOnerror, resetOnerror } from '@ember/test-helpers';
import { setupApplicationTest } from 'dummy/tests/helpers';
import REGISTRY from 'dummy/playground/registry';

/**
 * Allowlist-wide smoke coverage: every registered component route must actually render.
 *
 * This is the test that stops a registry entry from pointing at an adapter that throws. It walks
 * the registry rather than a hand-written list, so a component added to the allowlist is covered
 * the moment it is registered.
 *
 * Uncaught render errors are captured per route rather than allowed to abort the run, so one bad
 * adapter reports as one failing route instead of taking the suite down.
 */
module('Acceptance | playground | route smoke', function (hooks) {
    setupApplicationTest(hooks);

    let errors;

    hooks.beforeEach(function () {
        errors = [];

        setupOnerror((error) => {
            errors.push(error);
        });
    });

    hooks.afterEach(function () {
        resetOnerror();
    });

    for (const entry of REGISTRY) {
        test(`/components/${entry.slug} renders`, async function (assert) {
            await visit(`/components/${entry.slug}`);

            // Asserted first, so a render failure reports its actual message rather than being
            // masked by a later "nothing rendered" assertion.
            assert.deepEqual(
                errors.map((error) => error.message),
                [],
                'no uncaught rendering failure'
            );

            assert.strictEqual(currentURL(), `/components/${entry.slug}`, 'the route settled here rather than redirecting');
            assert.dom(`[data-test-component-page="${entry.slug}"]`).exists('the page rendered');
            assert.dom('[data-test-component-title]').hasText(entry.name, 'the title is the documented display name');
            assert.dom(`[data-test-playground-host="${entry.slug}"]`).exists('the readiness marker is present');
            assert.dom('[data-test-preview]').exists('the preview surface rendered');
            assert.dom('[data-test-docs-link]').hasAttribute('href', entry.docsUrl, 'the documentation link is correct');

            // The adapter resolved and produced something: an empty preview means the example
            // silently failed to render.
            assert.ok(find('[data-test-preview]').children.length > 0, 'the example adapter rendered content');

            assert.deepEqual(
                errors.map((error) => error.message),
                [],
                'no uncaught rendering failure'
            );
        });
    }

    for (const entry of REGISTRY) {
        test(`/embed/${entry.slug} renders`, async function (assert) {
            await visit(`/embed/${entry.slug}`);

            assert.deepEqual(
                errors.map((error) => error.message),
                [],
                'no uncaught rendering failure'
            );

            assert.dom(`[data-test-embed="${entry.slug}"]`).exists('the embed rendered');
            assert.dom(`[data-test-playground-host="${entry.slug}"]`).exists('the readiness marker is present');
            assert.dom('[data-test-preview]').exists('the preview surface rendered');
            assert.dom('[data-test-brand]').doesNotExist('the embed carries no catalog navigation');

            assert.deepEqual(
                errors.map((error) => error.message),
                [],
                'no uncaught rendering failure'
            );
        });
    }
});
