import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/resource/card/header', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('model', { id: 'ord_1', name: 'Order 123' });
    });

    test('it yields the model inside a bordered header', async function (assert) {
        await render(hbs`<Layout::Resource::Card::Header @model={{this.model}} as |model|><span class="name">{{model.name}}</span></Layout::Resource::Card::Header>`);

        assert.dom('.name').hasText('Order 123');
        assert.true(find('.name').parentElement.classList.contains('border-b'), 'the header keeps its bottom border');
    });

    test('a class argument is appended to the base styling', async function (assert) {
        await render(hbs`<Layout::Resource::Card::Header @model={{this.model}} @class="my-header"><span class="inside">h</span></Layout::Resource::Card::Header>`);

        const wrapper = find('.inside').parentElement;
        assert.true(wrapper.classList.contains('border-b'));
        assert.true(wrapper.classList.contains('my-header'));
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Layout::Resource::Card::Header @model={{this.model}} data-test-header="yes" />`);

        assert.dom('[data-test-header="yes"]').exists();
    });
});
