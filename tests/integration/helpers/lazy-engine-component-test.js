import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import Component from '@glimmer/component';

// A minimal stand-in for an engine instance's container API.
function fakeEngineInstance(registrations = {}) {
    const registry = { ...registrations };

    return {
        registry,
        hasRegistration(key) {
            return key in registry;
        },
        register(key, value) {
            registry[key] = value;
        },
        factoryFor(key) {
            const value = registry[key];

            return value ? { class: value } : undefined;
        },
    };
}

class DemoComponent extends Component {}
const DEMO_TEMPLATE = hbs`<span class="demo">resolved</span>`;

module('Integration | Helper | lazy-engine-component', function (hooks) {
    setupRenderingTest(hooks);

    let ensureCalls;
    let engines;
    let resolveEnsure;
    let consoleErrors;
    let originalConsoleError;

    hooks.beforeEach(function () {
        ensureCalls = [];
        engines = {};
        consoleErrors = [];
        originalConsoleError = console.error;
        console.error = (...args) => consoleErrors.push(args.join(' '));

        this.owner.register(
            'service:universe/extension-manager',
            class extends Service {
                getEngineInstance(name) {
                    return engines[name];
                }

                ensureEngineLoaded(name) {
                    ensureCalls.push(name);

                    return new Promise((resolve) => {
                        resolveEnsure = resolve;
                    });
                }
            }
        );

        this.owner.register('component:demo-component', DemoComponent);
        this.owner.register('template:components/demo-component', DEMO_TEMPLATE);
    });

    hooks.afterEach(function () {
        console.error = originalConsoleError;
    });

    // Renders whatever the helper resolves, so assertions stay on observable output.
    const TEMPLATE = hbs`
        {{#let (lazy-engine-component this.def) as |Resolved|}}
            {{#if Resolved}}<span data-test-resolved>{{Resolved}}</span>{{else}}<span data-test-null>none</span>{{/if}}
        {{/let}}
    `;

    test('a plain string component name passes straight through', async function (assert) {
        this.set('def', 'demo-component');

        await render(TEMPLATE);

        assert.dom('[data-test-resolved]').hasText('demo-component', 'strings are returned unchanged');
        assert.deepEqual(ensureCalls, [], 'no engine loading is attempted for a plain string');
    });

    test('a function component definition passes straight through', async function (assert) {
        this.set('def', DemoComponent);

        await render(TEMPLATE);

        assert.dom('[data-test-resolved]').exists('a class is returned unchanged');
    });

    test('an invalid definition logs an error and resolves to null', async function (assert) {
        this.set('def', { notAnEngine: true });

        await render(TEMPLATE);

        assert.dom('[data-test-null]').exists();
        assert.ok(
            consoleErrors.some((message) => message.includes('Invalid component definition')),
            'the caller is told why nothing resolved'
        );
    });

    test('a nullish definition resolves to null', async function (assert) {
        this.set('def', null);

        await render(TEMPLATE);

        assert.dom('[data-test-null]').exists();
    });

    test('an unloaded engine triggers loading and resolves to null for now', async function (assert) {
        this.set('def', { engine: '@fleetbase/fleetops-engine', path: 'components/order-panel' });

        await render(TEMPLATE);

        assert.dom('[data-test-null]').exists('nothing renders while the engine loads');
        assert.deepEqual(ensureCalls, ['@fleetbase/fleetops-engine'], 'loading is kicked off exactly once');
    });

    test('it recomputes once the engine finishes loading', async function (assert) {
        this.set('def', { engine: 'engine-a', path: 'components/demo-component' });

        await render(TEMPLATE);
        assert.dom('[data-test-null]').exists('precondition: not resolved yet');

        // The engine becomes available, then the pending load settles.
        engines['engine-a'] = fakeEngineInstance({ 'component:demo-component': DemoComponent });
        resolveEnsure();
        await settled();

        assert.dom('[data-test-resolved]').exists('the helper recomputed and resolved the component');
    });

    test('a loaded engine resolves a registered component path immediately', async function (assert) {
        engines['engine-a'] = fakeEngineInstance({ 'component:demo-component': DemoComponent });
        this.set('def', { engine: 'engine-a', path: 'components/demo-component' });

        await render(TEMPLATE);

        assert.dom('[data-test-resolved]').exists();
        assert.deepEqual(ensureCalls, [], 'an already-loaded engine is not reloaded');
    });

    test('the components/ prefix is optional in the path', async function (assert) {
        engines['engine-a'] = fakeEngineInstance({ 'component:demo-component': DemoComponent });
        this.set('def', { engine: 'engine-a', path: 'demo-component' });

        await render(TEMPLATE);

        assert.dom('[data-test-resolved]').exists();
    });

    test('an unregistered component path logs an error and resolves to null', async function (assert) {
        engines['engine-a'] = fakeEngineInstance();
        this.set('def', { engine: 'engine-a', path: 'components/missing' });

        await render(TEMPLATE);

        assert.dom('[data-test-null]').exists();
        assert.ok(
            consoleErrors.some((message) => message.includes("Component 'missing' is not registered")),
            'the missing component and engine are named'
        );
    });

    test('a registration whose factory has no class logs an error and resolves to null', async function (assert) {
        const engine = fakeEngineInstance({ 'component:demo-component': DemoComponent });
        engine.factoryFor = () => ({ class: undefined });
        engines['engine-a'] = engine;
        this.set('def', { engine: 'engine-a', path: 'components/demo-component' });

        await render(TEMPLATE);

        assert.dom('[data-test-null]').exists();
        assert.ok(
            consoleErrors.some((message) => message.includes('is undefined in engine')),
            'the undefined class is reported'
        );
    });

    test('a missing factory logs an error and resolves to null', async function (assert) {
        const engine = fakeEngineInstance({ 'component:demo-component': DemoComponent });
        engine.factoryFor = () => undefined;
        engines['engine-a'] = engine;
        this.set('def', { engine: 'engine-a', path: 'components/demo-component' });

        await render(TEMPLATE);

        assert.dom('[data-test-null]').exists();
        assert.ok(
            consoleErrors.some((message) => message.includes('factory for')),
            'the missing factory is reported'
        );
    });

    test('a class-form definition registers the class under both names', async function (assert) {
        const engine = fakeEngineInstance();
        engines['engine-a'] = engine;
        this.set('def', { engine: 'engine-a', isClass: true, class: DemoComponent });

        await render(TEMPLATE);

        assert.dom('[data-test-resolved]').exists('the class is resolved directly');
        assert.true(engine.hasRegistration('component:demo-component'), 'the dasherized name is registered');
        assert.true(engine.hasRegistration(`component:${DemoComponent.name}`), 'the original class name is registered too');
    });

    test('a class already registered is not registered again', async function (assert) {
        const engine = fakeEngineInstance({ 'component:demo-component': DemoComponent });
        let registrations = 0;
        engine.register = () => registrations++;
        engines['engine-a'] = engine;
        this.set('def', { engine: 'engine-a', isClass: true, class: DemoComponent });

        await render(TEMPLATE);

        assert.strictEqual(registrations, 0, 'an existing registration is left alone');
    });

    test('an engine definition with neither path nor class logs an error', async function (assert) {
        engines['engine-a'] = fakeEngineInstance();
        this.set('def', { engine: 'engine-a' });

        await render(TEMPLATE);

        assert.dom('[data-test-null]').exists();
        assert.ok(
            consoleErrors.some((message) => message.includes('requires either a path or class')),
            'the contract violation is reported'
        );
    });

    test('the #extension-component string form is parsed into engine and path', async function (assert) {
        engines['engine-a'] = fakeEngineInstance({ 'component:demo-component': DemoComponent });
        this.set('def', '#extension-component:engine-a:demo-component');

        await render(TEMPLATE);

        assert.dom('[data-test-resolved]').exists('the shorthand resolves through the engine');
    });

    test('the shorthand for an unloaded engine triggers loading', async function (assert) {
        this.set('def', '#extension-component:engine-b:demo-component');

        await render(TEMPLATE);

        assert.dom('[data-test-null]').exists();
        assert.deepEqual(ensureCalls, ['engine-b']);
    });

    test('a string that is not the extension shorthand is treated as a component name', async function (assert) {
        this.set('def', 'plain-name');

        await render(TEMPLATE);

        assert.dom('[data-test-resolved]').hasText('plain-name');
        assert.deepEqual(ensureCalls, [], 'it is not mistaken for an engine reference');
    });
});
