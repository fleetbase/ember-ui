import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const LOADER = '.fleetbase-loader';

function loaderSize() {
    const loader = find(LOADER);

    return [loader.style.width, loader.style.height];
}

module('Integration | Component | spinner', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a loader at the default size', async function (assert) {
        await render(hbs`<Spinner />`);

        assert.dom('.fleetbase-loader-wrapper').exists();
        assert.dom(LOADER).exists();
        assert.deepEqual(loaderSize(), ['16px', '16px'], 'medium is the default');
    });

    test('an explicit height and width are used', async function (assert) {
        await render(hbs`<Spinner @height={{40}} @width={{30}} />`);

        assert.deepEqual(loaderSize(), ['30px', '40px']);
    });

    test('every named size maps to its dimensions', async function (assert) {
        const expected = { xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '20px', '2xl': '22px', '3xl': '24px' };

        for (const [size, px] of Object.entries(expected)) {
            this.set('size', size);
            await render(hbs`<Spinner @size={{this.size}} />`);

            assert.deepEqual(loaderSize(), [px, px], `${size} renders at ${px}`);
        }
    });

    test('an unknown named size falls back to medium', async function (assert) {
        await render(hbs`<Spinner @size="enormous" />`);

        assert.deepEqual(loaderSize(), ['16px', '16px']);
    });

    test('a numeric size is used for both dimensions', async function (assert) {
        await render(hbs`<Spinner @size={{32}} />`);

        assert.deepEqual(loaderSize(), ['32px', '32px']);
    });

    test('a loading message can be supplied three ways', async function (assert) {
        await render(hbs`<Spinner @text="Loading orders" />`);
        assert.dom('.loading-message').hasText('Loading orders');

        await render(hbs`<Spinner @loadingMessage="Please wait" />`);
        assert.dom('.loading-message').hasText('Please wait');

        await render(hbs`<Spinner @message="Nearly there" />`);
        assert.dom('.loading-message').hasText('Nearly there');
    });

    test('a block replaces the message', async function (assert) {
        await render(hbs`<Spinner @text="ignored"><b class="custom">Custom</b></Spinner>`);

        assert.dom('.loading-message .custom').hasText('Custom');
        assert.dom('.loading-message').doesNotContainText('ignored');
    });

    test('extra classes and splattributes are applied', async function (assert) {
        await render(hbs`<Spinner @wrapperClass="my-wrapper" @iconClass="my-icon" @loadingMessageClass="my-message" data-test-spinner="yes" />`);

        assert.dom('.fleetbase-loader-wrapper').hasClass('my-wrapper');
        assert.dom('.fleetbase-loader-wrapper').hasAttribute('data-test-spinner', 'yes');
        assert.dom(LOADER).hasClass('my-icon');
        assert.dom('.loading-message').hasClass('my-message');
    });
});
