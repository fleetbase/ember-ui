import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import Component from '@glimmer/component';
import { setComponentTemplate } from '@ember/component';
import ExtensionComponent from '@fleetbase/ember-core/contracts/extension-component';

class WidgetComponent extends Component {}
setComponentTemplate(hbs`<span class="engine-widget">Loaded {{@params.label}}</span>`, WidgetComponent);

// A stand-in engine instance exposing only what the component actually calls.
function fakeEngine({ registered = {}, factory = undefined } = {}) {
    const engine = {
        registrations: { ...registered },
        registered: [],
        hasRegistration(key) {
            return key in this.registrations;
        },
        register(key, value) {
            this.registered.push(key);
            this.registrations[key] = value;
        },
        factoryFor(key) {
            if (factory !== undefined) {
                return factory;
            }
            return this.registrations[key] ? { class: this.registrations[key] } : null;
        },
    };
    return engine;
}

module('Integration | Component | lazy-engine-component', function (hooks) {
    setupRenderingTest(hooks);

    let loadedEngines;
    let engineInstance;

    hooks.beforeEach(function () {
        loadedEngines = [];
        engineInstance = fakeEngine();

        this.owner.unregister('service:universe/extension-manager');
        this.owner.register(
            'service:universe/extension-manager',
            class extends Service {
                ensureEngineLoaded(engineName) {
                    loadedEngines.push(engineName);
                    return Promise.resolve(engineInstance);
                }
            }
        );

        this.owner.register('component:engine-widget', WidgetComponent);
    });

    const TEMPLATE = hbs`<LazyEngineComponent @component={{this.component}} @params={{this.params}} />`;

    module('components given directly', function () {
        test('a component name is rendered as-is without loading an engine', async function (assert) {
            this.set('component', 'engine-widget');
            this.set('params', { label: 'alpha' });

            await render(TEMPLATE);

            assert.dom('.engine-widget').hasText('Loaded alpha');
            assert.deepEqual(loadedEngines, [], 'no engine is loaded for a plain name');
        });

        test('a component class is rendered as-is', async function (assert) {
            this.set('component', WidgetComponent);
            this.set('params', { label: 'beta' });

            await render(TEMPLATE);

            assert.dom('.engine-widget').hasText('Loaded beta');
            assert.deepEqual(loadedEngines, []);
        });

        test('with no component nothing is rendered', async function (assert) {
            await render(hbs`<LazyEngineComponent />`);

            assert.strictEqual(find('.engine-widget'), null);
        });

        test('a block renders the resolved component itself', async function (assert) {
            this.set('component', 'engine-widget');
            this.set('params', { label: 'gamma' });

            await render(hbs`
                <LazyEngineComponent @component={{this.component}} @params={{this.params}} as |resolved params|>
                    <span class="yielded">{{params.label}}</span>
                </LazyEngineComponent>
            `);

            assert.dom('.yielded').hasText('gamma');
            assert.strictEqual(find('.engine-widget'), null, 'the component is not also rendered');
        });
    });

    module('components loaded from an engine', function () {
        test('a component path is looked up in the loaded engine', async function (assert) {
            engineInstance = fakeEngine({ registered: { 'component:admin/widget': WidgetComponent } });
            this.set('component', new ExtensionComponent('@fleetbase/fleetops-engine', 'components/admin/widget'));
            this.set('params', { label: 'from engine' });

            await render(TEMPLATE);

            assert.deepEqual(loadedEngines, ['@fleetbase/fleetops-engine'], 'the engine is loaded on demand');
            assert.dom('.engine-widget').hasText('Loaded from engine');
        });

        test('a component class is registered into the engine and rendered', async function (assert) {
            this.set('component', new ExtensionComponent('@fleetbase/fleetops-engine', WidgetComponent));
            this.set('params', { label: 'registered' });

            await render(TEMPLATE);

            assert.deepEqual(loadedEngines, ['@fleetbase/fleetops-engine']);
            assert.deepEqual(engineInstance.registered, ['component:widget-component', 'component:WidgetComponent'], 'the class is registered under both a dasherized and its original name');
            assert.dom('.engine-widget').hasText('Loaded registered');
        });

        test('an already registered class is not registered twice', async function (assert) {
            engineInstance = fakeEngine({ registered: { 'component:widget-component': WidgetComponent } });
            this.set('component', new ExtensionComponent('@fleetbase/fleetops-engine', WidgetComponent));

            await render(TEMPLATE);

            assert.deepEqual(engineInstance.registered, [], 'nothing is re-registered');
            assert.dom('.engine-widget').exists('and the component still renders');
        });

        test('the string shorthand names an engine and a component', async function (assert) {
            engineInstance = fakeEngine({ registered: { 'component:admin/widget': WidgetComponent } });
            this.set('component', '#extension-component:@fleetbase/fleetops-engine:admin/widget');
            this.set('params', { label: 'shorthand' });

            await render(TEMPLATE);

            assert.deepEqual(loadedEngines, ['@fleetbase/fleetops-engine']);
            assert.dom('.engine-widget').hasText('Loaded shorthand');
        });
    });

    module('failures', function () {
        test('an engine that will not load renders nothing', async function (assert) {
            this.owner.unregister('service:universe/extension-manager');
            this.owner.register(
                'service:universe/extension-manager',
                class extends Service {
                    ensureEngineLoaded() {
                        return Promise.resolve(null);
                    }
                }
            );
            this.set('component', new ExtensionComponent('@fleetbase/missing-engine', 'components/admin/widget'));

            await render(TEMPLATE);

            assert.strictEqual(find('.engine-widget'), null, 'nothing is rendered');
        });

        test('an unregistered component path renders nothing', async function (assert) {
            this.set('component', new ExtensionComponent('@fleetbase/fleetops-engine', 'components/admin/missing'));

            await render(TEMPLATE);

            assert.strictEqual(find('.engine-widget'), null);
        });

        test('a component with no factory renders nothing', async function (assert) {
            engineInstance = fakeEngine({ registered: { 'component:admin/widget': WidgetComponent }, factory: null });
            this.set('component', new ExtensionComponent('@fleetbase/fleetops-engine', 'components/admin/widget'));

            await render(TEMPLATE);

            assert.strictEqual(find('.engine-widget'), null);
        });

        test('a factory with no class renders nothing', async function (assert) {
            engineInstance = fakeEngine({ registered: { 'component:admin/widget': WidgetComponent }, factory: {} });
            this.set('component', new ExtensionComponent('@fleetbase/fleetops-engine', 'components/admin/widget'));

            await render(TEMPLATE);

            assert.strictEqual(find('.engine-widget'), null);
        });

        test('an extension component with neither a path nor a class renders nothing', async function (assert) {
            this.set('component', { engine: '@fleetbase/fleetops-engine' });

            await render(TEMPLATE);

            assert.deepEqual(loadedEngines, ['@fleetbase/fleetops-engine'], 'the engine is still loaded');
            assert.strictEqual(find('.engine-widget'), null);
        });

        test('a definition with no engine renders nothing', async function (assert) {
            this.set('component', { path: 'components/admin/widget' });

            await render(TEMPLATE);

            assert.deepEqual(loadedEngines, [], 'no engine is loaded');
            assert.strictEqual(find('.engine-widget'), null);
        });
    });

    module('reacting to changes', function () {
        test('a new component is resolved when the argument changes', async function (assert) {
            this.set('component', 'engine-widget');
            this.set('params', { label: 'first' });

            await render(TEMPLATE);
            assert.dom('.engine-widget').hasText('Loaded first');

            engineInstance = fakeEngine({ registered: { 'component:admin/widget': WidgetComponent } });
            // Both arguments must change in one go: `did-update` fires once per revalidation.
            this.setProperties({
                component: new ExtensionComponent('@fleetbase/fleetops-engine', 'components/admin/widget'),
                params: { label: 'second' },
            });
            await settled();

            assert.deepEqual(loadedEngines, ['@fleetbase/fleetops-engine'], 'the engine is loaded on the change');
            assert.dom('.engine-widget').hasText('Loaded second');
        });

        test('a change with no params falls back to an empty hash', async function (assert) {
            this.set('component', 'engine-widget');
            this.set('params', { label: 'first' });

            await render(TEMPLATE);

            this.set('params', undefined);
            await settled();

            assert.dom('.engine-widget').hasText('Loaded', 'the component renders without params');
        });
    });
});
