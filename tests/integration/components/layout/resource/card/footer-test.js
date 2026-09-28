import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/resource/card/footer', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('model', { id: 'ord_1', name: 'Order 123' });
    });

    test('it yields the model inside a bordered footer', async function (assert) {
        await render(hbs`<Layout::Resource::Card::Footer @model={{this.model}} as |model|><span class="name">{{model.name}}</span></Layout::Resource::Card::Footer>`);

        assert.dom('.name').hasText('Order 123');
        assert.true(find('.name').parentElement.classList.contains('border-t'), 'the footer keeps its top border');
    });

    test('a class argument is appended to the base styling', async function (assert) {
        await render(hbs`<Layout::Resource::Card::Footer @model={{this.model}} @class="my-footer"><span class="inside">f</span></Layout::Resource::Card::Footer>`);

        const wrapper = find('.inside').parentElement;
        assert.true(wrapper.classList.contains('border-t'));
        assert.true(wrapper.classList.contains('my-footer'));
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Layout::Resource::Card::Footer @model={{this.model}} data-test-footer="yes" />`);

        assert.dom('[data-test-footer="yes"]').exists();
    });
});
