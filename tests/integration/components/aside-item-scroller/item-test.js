import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | aside-item-scroller/item', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the @text inside a heading when no block is provided', async function (assert) {
        await render(hbs`<AsideItemScroller::Item @text="Fleet Ops" />`);

        assert.dom('a.aside-item-link').exists({ count: 1 }, 'the item renders as a single anchor');
        assert.dom('a.aside-item-link').hasAttribute('href', 'javascript:;', 'the anchor is inert without a real destination');
        assert.dom('a.aside-item-link').hasClass('cursor-pointer');
        assert.dom('a.aside-item-link').hasClass('flex');
        assert.dom('a.aside-item-link').hasClass('w-full');
        assert.dom('a.aside-item-link h4').hasText('Fleet Ops', 'the fallback heading shows @text');
    });

    test('it yields @item to the block instead of rendering the fallback heading', async function (assert) {
        this.set('item', { id: 'vehicle-1', name: 'Truck 42' });

        await render(hbs`
            <AsideItemScroller::Item @item={{this.item}} @text="unused fallback" as |item|>
                <span class="yielded-name">{{item.name}}</span>
            </AsideItemScroller::Item>
        `);

        assert.dom('.yielded-name').hasText('Truck 42', 'the block receives the @item');
        assert.dom('a.aside-item-link h4').doesNotExist('the fallback heading is skipped when a block is present');
        assert.dom('a.aside-item-link').doesNotContainText('unused fallback', '@text is ignored when a block is present');
    });

    test('it applies the wrapper, inner and content class arguments to their elements', async function (assert) {
        await render(hbs`<AsideItemScroller::Item @text="Routes" @wrapperClass="wrapper-custom" @innerClass="inner-custom" @contentClass="content-custom" />`);

        assert.dom('a.aside-item-link').hasClass('wrapper-custom', '@wrapperClass lands on the anchor');
        assert.dom('a.aside-item-link > div').hasClass('inner-custom', '@innerClass lands on the inner row');
        assert.dom('a.aside-item-link > div > div').hasClass('content-custom', '@contentClass lands on the content element');
    });

    test('it forwards splattributes to the anchor element', async function (assert) {
        await render(hbs`<AsideItemScroller::Item @text="Drivers" data-test-aside-item="drivers" aria-label="Drivers section" />`);

        assert.dom('a.aside-item-link').hasAttribute('data-test-aside-item', 'drivers');
        assert.dom('a.aside-item-link').hasAttribute('aria-label', 'Drivers section');
    });

    test('it invokes @onClick with the click event when clicked', async function (assert) {
        const calls = [];
        this.set('onClick', (...args) => calls.push(args));

        await render(hbs`<AsideItemScroller::Item @text="Drivers" @onClick={{this.onClick}} />`);
        await click('a.aside-item-link');

        assert.strictEqual(calls.length, 1, '@onClick is invoked once per click');
        assert.strictEqual(calls[0][0]?.type, 'click', 'the click event is forwarded as the first argument');
        assert.strictEqual(calls[0][0]?.target?.closest('a'), this.element.querySelector('a.aside-item-link'), 'the event originates from the anchor');

        await click('a.aside-item-link');

        assert.strictEqual(calls.length, 2, 'every click dispatches the handler again');
    });

    test('it tolerates a missing or non-callable @onClick', async function (assert) {
        await render(hbs`<AsideItemScroller::Item @text="Places" />`);
        await click('a.aside-item-link');

        assert.dom('a.aside-item-link h4').hasText('Places', 'clicking without a handler leaves the item rendered');

        this.set('notAFunction', 'nope');
        await render(hbs`<AsideItemScroller::Item @text="Places" @onClick={{this.notAFunction}} />`);
        await click('a.aside-item-link');

        assert.dom('a.aside-item-link h4').hasText('Places', 'a non-callable @onClick is ignored rather than invoked');
    });
});
