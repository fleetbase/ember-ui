import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

module('Integration | Component | registry-yield', function (hooks) {
    setupRenderingTest(hooks);

    let menuItems;
    let components;
    let universeMenuItems;
    let universeComponents;

    function registerServices(owner, { withMenuService = true, withRegistryService = true, withUniverseFallbacks = true } = {}) {
        owner.unregister('service:universe/menu-service');
        if (withMenuService) {
            owner.register(
                'service:universe/menu-service',
                class extends Service {
                    getMenuItems(registry) {
                        return menuItems[registry] ?? [];
                    }
                }
            );
        }

        owner.unregister('service:universe/registry-service');
        if (withRegistryService) {
            owner.register(
                'service:universe/registry-service',
                class extends Service {
                    getRenderableComponents(registry) {
                        return components[registry] ?? [];
                    }
                }
            );
        }

        owner.unregister('service:universe');
        owner.register(
            'service:universe',
            withUniverseFallbacks
                ? class extends Service {
                      getMenuItemsFromRegistry(registry) {
                          return universeMenuItems[registry] ?? [];
                      }
                      getRenderableComponentsFromRegistry(registry) {
                          return universeComponents[registry] ?? [];
                      }
                  }
                : class extends Service {}
        );
    }

    hooks.beforeEach(function () {
        menuItems = {};
        components = {};
        universeMenuItems = {};
        universeComponents = {};
    });

    const TEMPLATE = hbs`
        <RegistryYield @registry={{this.registry}} @type={{this.type}} as |item|>
            <span class="yielded">{{item.title}}</span>
        </RegistryYield>
    `;

    function yielded() {
        return findAll('.yielded').map((node) => node.textContent.trim());
    }

    module('menu items', function () {
        for (const type of ['buttons', 'menu', 'menuItems', 'menu-item']) {
            test(`type "${type}" yields menu items from the menu service`, async function (assert) {
                menuItems = { header: [{ title: 'Orders' }, { title: 'Settings' }] };
                registerServices(this.owner);
                this.set('registry', 'header');
                this.set('type', type);

                await render(TEMPLATE);

                assert.deepEqual(yielded(), ['Orders', 'Settings']);
            });
        }

        test('it falls back to the universe service when the menu service has nothing', async function (assert) {
            menuItems = { header: [] };
            universeMenuItems = { header: [{ title: 'From universe' }] };
            registerServices(this.owner);
            this.set('registry', 'header');
            this.set('type', 'menu');

            await render(TEMPLATE);

            assert.deepEqual(yielded(), ['From universe']);
        });

        test('with neither source it yields nothing', async function (assert) {
            registerServices(this.owner, { withUniverseFallbacks: false });
            this.set('registry', 'header');
            this.set('type', 'menu');

            await render(TEMPLATE);

            assert.deepEqual(yielded(), []);
        });

        test('with no menu service at all the universe answers instead', async function (assert) {
            universeMenuItems = { header: [{ title: 'From universe' }] };
            registerServices(this.owner, { withMenuService: false });
            this.set('registry', 'header');
            this.set('type', 'menu');

            await render(TEMPLATE);

            assert.deepEqual(yielded(), ['From universe']);
        });

        // A universe that answers with nothing at all rather than an empty list.
        test('a universe fallback that returns undefined yields nothing', async function (assert) {
            menuItems = { header: [] };
            registerServices(this.owner);
            this.owner.unregister('service:universe');
            this.owner.register(
                'service:universe',
                class extends Service {
                    getMenuItemsFromRegistry() {
                        return undefined;
                    }
                    getRenderableComponentsFromRegistry() {
                        return undefined;
                    }
                }
            );
            this.set('registry', 'header');
            this.set('type', 'menu');

            await render(TEMPLATE);

            assert.deepEqual(yielded(), []);
        });
    });

    module('components', function () {
        test('an unknown type yields renderable components from the registry service', async function (assert) {
            components = { panels: [{ title: 'Panel one' }] };
            registerServices(this.owner);
            this.set('registry', 'panels');
            this.set('type', 'components');

            await render(TEMPLATE);

            assert.deepEqual(yielded(), ['Panel one']);
        });

        test('no type at all is also treated as components', async function (assert) {
            components = { panels: [{ title: 'Panel one' }] };
            registerServices(this.owner);
            this.set('registry', 'panels');

            await render(TEMPLATE);

            assert.deepEqual(yielded(), ['Panel one']);
        });

        test('it falls back to the universe service when the registry service has nothing', async function (assert) {
            components = { panels: [] };
            universeComponents = { panels: [{ title: 'From universe' }] };
            registerServices(this.owner);
            this.set('registry', 'panels');

            await render(TEMPLATE);

            assert.deepEqual(yielded(), ['From universe']);
        });

        test('with neither source it yields nothing', async function (assert) {
            registerServices(this.owner, { withUniverseFallbacks: false });
            this.set('registry', 'panels');

            await render(TEMPLATE);

            assert.deepEqual(yielded(), []);
        });

        test('with no registry service at all the universe answers instead', async function (assert) {
            universeComponents = { widgets: [{ title: 'From universe' }] };
            registerServices(this.owner, { withRegistryService: false });
            this.set('registry', 'widgets');
            this.set('type', 'components');

            await render(TEMPLATE);

            assert.deepEqual(yielded(), ['From universe']);
        });

        test('a universe component fallback that returns undefined yields nothing', async function (assert) {
            components = { widgets: [] };
            registerServices(this.owner);
            this.owner.unregister('service:universe');
            this.owner.register(
                'service:universe',
                class extends Service {
                    getMenuItemsFromRegistry() {
                        return undefined;
                    }
                    getRenderableComponentsFromRegistry() {
                        return undefined;
                    }
                }
            );
            this.set('registry', 'widgets');
            this.set('type', 'components');

            await render(TEMPLATE);

            assert.deepEqual(yielded(), []);
        });

        // With nothing to yield there is no first item to inspect, so the component cannot be
        // treated as a component registry either.
        test('an empty registry is not treated as a component registry', async function (assert) {
            registerServices(this.owner, { withUniverseFallbacks: false });
            this.set('registry', 'panels');
            this.set('type', 'components');

            await render(TEMPLATE);

            assert.deepEqual(yielded(), [], 'nothing is yielded');
            assert.dom('.registry-yield-component').doesNotExist('and nothing is rendered as a component');
        });

        test('an unknown registry yields nothing', async function (assert) {
            components = { panels: [{ title: 'Panel one' }] };
            registerServices(this.owner);
            this.set('registry', 'nothing-here');

            await render(TEMPLATE);

            assert.deepEqual(yielded(), []);
        });
    });
});
