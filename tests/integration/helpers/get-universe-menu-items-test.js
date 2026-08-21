import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

class StubUniverse extends Service {
    requested = [];
    registry = {};

    getMenuItemsFromRegistry(registryName) {
        this.requested.push(registryName);
        return this.registry[registryName] ?? [];
    }
}

module('Integration | Helper | get-universe-menu-items', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:universe', StubUniverse);
        this.universe = this.owner.lookup('service:universe');
    });

    test('it renders the menu items registered under the requested registry', async function (assert) {
        this.universe.registry['header-menu'] = [
            { title: 'Orders', route: 'orders.index' },
            { title: 'Drivers', route: 'drivers.index' },
        ];

        await render(hbs`{{#each (get-universe-menu-items "header-menu") as |item|}}<a class="item" href={{item.route}}>{{item.title}}</a>{{/each}}`);

        assert.dom('.item').exists({ count: 2 });
        assert.deepEqual(
            [...this.element.querySelectorAll('.item')].map((element) => element.textContent),
            ['Orders', 'Drivers']
        );
        assert.dom(this.element.querySelector('.item')).hasAttribute('href', 'orders.index');
    });

    test('the registry name is forwarded to the universe service', async function (assert) {
        await render(hbs`{{#each (get-universe-menu-items "user-menu") as |item|}}<span class="item">{{item.title}}</span>{{/each}}`);

        assert.deepEqual(this.universe.requested, ['user-menu']);
    });

    test('an unknown registry renders nothing', async function (assert) {
        await render(hbs`{{#each (get-universe-menu-items "no-such-menu") as |item|}}<span class="item">{{item.title}}</span>{{/each}}`);

        assert.dom('.item').doesNotExist();
    });

    test('a missing registry name yields no menu items', async function (assert) {
        await render(hbs`{{#each (get-universe-menu-items) as |item|}}<span class="item">{{item.title}}</span>{{/each}}`);

        assert.deepEqual(this.universe.requested, [undefined]);
        assert.dom('.item').doesNotExist();
    });

    test('menu items keep the order the registry returned them in', async function (assert) {
        this.universe.registry.ordered = [{ title: 'first' }, { title: 'second' }, { title: 'third' }];

        await render(hbs`{{#each (get-universe-menu-items "ordered") as |item|}}<span class="item">{{item.title}}</span>{{/each}}`);

        assert.deepEqual(
            [...this.element.querySelectorAll('.item')].map((element) => element.textContent),
            ['first', 'second', 'third']
        );
    });
});
