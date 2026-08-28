import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/resource/card/body', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('model', { id: 'ord_1', name: 'Order 123' });
    });

    test('it yields the model', async function (assert) {
        await render(hbs`<Layout::Resource::Card::Body @model={{this.model}} as |model|><span class="name">{{model.name}}</span></Layout::Resource::Card::Body>`);

        assert.dom('.name').hasText('Order 123');
    });

    test('a class argument is applied to the wrapper', async function (assert) {
        await render(hbs`<Layout::Resource::Card::Body @model={{this.model}} @class="my-body"><span class="inside">b</span></Layout::Resource::Card::Body>`);

        assert.true(find('.inside').parentElement.classList.contains('my-body'));
    });

    test('with no class argument the wrapper is unstyled', async function (assert) {
        await render(hbs`<Layout::Resource::Card::Body @model={{this.model}} data-test-body="yes" />`);

        assert.dom('[data-test-body="yes"]').exists('splattributes are forwarded');
    });
});
