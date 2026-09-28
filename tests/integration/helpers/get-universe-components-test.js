import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

class StubUniverse extends Service {
    requested = [];
    registry = {};

    getRenderableComponentsFromRegistry(registryName) {
        this.requested.push(registryName);
        return this.registry[registryName] ?? [];
    }
}

module('Integration | Helper | get-universe-components', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:universe', StubUniverse);
        this.universe = this.owner.lookup('service:universe');
    });

    test('it renders the components registered under the requested registry', async function (assert) {
        this.universe.registry['dashboard:widgets'] = [{ name: 'alpha' }, { name: 'beta' }];

        await render(hbs`{{#each (get-universe-components "dashboard:widgets") as |component|}}<span class="component">{{component.name}}</span>{{/each}}`);

        assert.dom('.component').exists({ count: 2 });
        assert.deepEqual(
            [...this.element.querySelectorAll('.component')].map((element) => element.textContent),
            ['alpha', 'beta']
        );
    });

    test('the registry name is forwarded to the universe service', async function (assert) {
        await render(hbs`{{#each (get-universe-components "engine:fleet-ops:panels") as |component|}}<span class="component">{{component.name}}</span>{{/each}}`);

        assert.deepEqual(this.universe.requested, ['engine:fleet-ops:panels']);
    });

    test('an unknown registry renders nothing', async function (assert) {
        await render(hbs`{{#each (get-universe-components "nothing-here") as |component|}}<span class="component">{{component.name}}</span>{{/each}}`);

        assert.dom('.component').doesNotExist();
    });

    test('a missing registry name is still forwarded and yields no components', async function (assert) {
        await render(hbs`{{#each (get-universe-components) as |component|}}<span class="component">{{component.name}}</span>{{/each}}`);

        assert.deepEqual(this.universe.requested, [undefined]);
        assert.dom('.component').doesNotExist();
    });

    test('components keep the order the registry returned them in', async function (assert) {
        this.universe.registry.ordered = [{ name: 'one' }, { name: 'two' }, { name: 'three' }];

        await render(hbs`{{#each (get-universe-components "ordered") as |component|}}<span class="component">{{component.name}}</span>{{/each}}`);

        assert.deepEqual(
            [...this.element.querySelectorAll('.component')].map((element) => element.textContent),
            ['one', 'two', 'three']
        );
    });
});
