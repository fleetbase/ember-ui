import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled, waitUntil, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const TEMPLATE = hbs`
    <LoadEngine @engineName={{this.engineName}} as |engine isLoading error|>
        <div class="engine-name">{{engine.engineName}}</div>
        <div class="loading">{{if isLoading "loading" "idle"}}</div>
        <div class="error">{{error}}</div>
    </LoadEngine>
`;

module('Integration | Component | load-engine', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.extensionManager = this.owner.lookup('service:universe/extension-manager');
        this.set('engineName', '@fleetbase/fleetops-engine');
    });

    test('it asks the extension manager for the engine and yields the instance', async function (assert) {
        await render(TEMPLATE);

        const calls = this.extensionManager.calls.filter((call) => call.method === 'ensureEngineLoaded');
        assert.deepEqual(calls[0].args, ['@fleetbase/fleetops-engine'], 'the named engine is requested');
        assert.dom('.engine-name').hasText('@fleetbase/fleetops-engine', 'and the loaded instance is yielded');
        assert.dom('.error').hasText('', 'with nothing to report');
        assert.dom('.loading').hasText('idle', 'and the load is finished');
    });

    test('it yields a loading flag while the engine is still resolving', async function (assert) {
        let release;
        this.extensionManager.ensureEngineLoaded = () =>
            new Promise((resolve) => {
                release = () => resolve({ engineName: 'late-engine' });
            });

        render(TEMPLATE);
        await waitUntil(() => find('.loading'));

        assert.dom('.loading').hasText('loading', 'the flag is raised while the task runs');
        assert.dom('.engine-name').hasText('', 'and nothing is yielded yet');

        release();
        await settled();

        assert.dom('.loading').hasText('idle');
        assert.dom('.engine-name').hasText('late-engine');
    });

    // The component treats a null result as a failure of its own rather than yielding nothing.
    test('an extension manager that resolves nothing is reported as an error', async function (assert) {
        this.extensionManager.ensureEngineLoaded = () => Promise.resolve(null);

        await render(TEMPLATE);

        assert.dom('.error').hasText("Failed to load engine '@fleetbase/fleetops-engine'");
        assert.dom('.engine-name').hasText('', 'and no instance is yielded');
    });

    test('a rejected load is reported through the yielded error', async function (assert) {
        this.extensionManager.ensureEngineLoaded = () => Promise.reject(new Error('the bundle is missing'));

        await render(TEMPLATE);

        assert.dom('.error').hasText('the bundle is missing');
        assert.dom('.loading').hasText('idle', 'and the component stops loading');
    });

    test('a failure leaves the block renderable rather than tearing it down', async function (assert) {
        this.extensionManager.ensureEngineLoaded = () => Promise.reject(new Error('nope'));

        await render(TEMPLATE);

        assert.ok(find('.loading'), 'the block still renders around the failure');
    });
});
