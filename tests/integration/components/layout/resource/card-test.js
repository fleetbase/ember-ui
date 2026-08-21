import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const BASE_CARD_CLASS = 'rounded-md';

module('Integration | Component | layout/resource/card', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('model', { id: 'ord_1', name: 'Order 123' });
    });

    test('it yields the model and its index', async function (assert) {
        await render(hbs`
            <Layout::Resource::Card @model={{this.model}} @index={{2}} as |card|>
                <span class="name">{{card.model.name}}</span>
                <span class="index">{{card.index}}</span>
            </Layout::Resource::Card>
        `);

        assert.dom('.name').hasText('Order 123');
        assert.dom('.index').hasText('2');
    });

    test('the card carries its base styling and any extra class', async function (assert) {
        await render(hbs`<Layout::Resource::Card @model={{this.model}} @class="my-card" />`);

        const card = find('div');
        assert.true(card.classList.contains(BASE_CARD_CLASS), 'the base styling is kept');
        assert.true(card.classList.contains('my-card'), 'the extra class is appended');
    });

    test('the yielded header, body and footer render the model', async function (assert) {
        await render(hbs`
            <Layout::Resource::Card @model={{this.model}} as |card|>
                <card.header as |model|><span class="h">{{model.name}}</span></card.header>
                <card.body as |model|><span class="b">{{model.id}}</span></card.body>
                <card.footer as |model|><span class="f">{{model.name}}</span></card.footer>
            </Layout::Resource::Card>
        `);

        assert.dom('.h').hasText('Order 123');
        assert.dom('.b').hasText('ord_1');
        assert.dom('.f').hasText('Order 123');
    });

    test('per-section classes reach the yielded sections', async function (assert) {
        await render(hbs`
            <Layout::Resource::Card @model={{this.model}} @headerClass="my-header" @bodyClass="my-body" @footerClass="my-footer" as |card|>
                <card.header><span class="h">h</span></card.header>
                <card.body><span class="b">b</span></card.body>
                <card.footer><span class="f">f</span></card.footer>
            </Layout::Resource::Card>
        `);

        assert.dom('.h').hasNoClass('my-header');
        assert.true(find('.h').parentElement.classList.contains('my-header'), 'the header class is applied');
        assert.true(find('.b').parentElement.classList.contains('my-body'), 'the body class is applied');
        assert.true(find('.f').parentElement.classList.contains('my-footer'), 'the footer class is applied');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Layout::Resource::Card @model={{this.model}} data-test-card="yes" />`);

        assert.dom('[data-test-card="yes"]').exists();
    });
});
