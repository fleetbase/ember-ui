import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, triggerEvent } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// A bubbling `error` event reaches window.onerror, which QUnit reports as an uncaught
// global failure. The component's handler is bound directly to the img, so a
// non-bubbling event exercises it without tripping QUnit.
async function triggerLoadFailure(selector = 'img.flb--img') {
    return triggerEvent(selector, 'error', { bubbles: false });
}

// 1x1 transparent GIF / 1x1 red GIF -- inline data URIs so nothing ever hits the network.
const PRIMARY_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const FALLBACK_SRC = 'data:image/gif;base64,R0lGODlhAQABAIABAP8AAP///yH5BAEAAAEALAAAAAABAAEAAAICTAEAOw==';
const ALTERNATE_FALLBACK_SRC = 'data:image/gif;base64,R0lGODlhAQABAIABAAAA/wAAACH5BAEAAAEALAAAAAABAAEAAAICTAEAOw==';

module('Integration | Component | image', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders an img with the flb--img class and passes attributes through', async function (assert) {
        this.src = PRIMARY_SRC;

        await render(hbs`<Image src={{this.src}} alt="Company logo" width="24" height="24" class="rounded-full" data-test-logo />`);

        assert.dom('img.flb--img').exists('renders a single img element with the base class');
        assert.dom('img.flb--img').hasAttribute('src', PRIMARY_SRC, 'the src attribute is passed through via ...attributes');
        assert.dom('img.flb--img').hasAttribute('alt', 'Company logo', 'the alt text is preserved for accessibility');
        assert.dom('img.flb--img').hasAttribute('width', '24');
        assert.dom('img.flb--img').hasAttribute('height', '24');
        assert.dom('img.flb--img').hasClass('rounded-full', 'consumer classes are merged with the component class');
        assert.dom('img.flb--img').hasAttribute('data-test-logo');
    });

    test('it reflects @fallbackSrc on the data-fallback-src attribute and omits it when absent', async function (assert) {
        this.src = PRIMARY_SRC;
        this.fallbackSrc = FALLBACK_SRC;

        await render(hbs`<Image src={{this.src}} @fallbackSrc={{this.fallbackSrc}} alt="With fallback" />`);
        assert.dom('img.flb--img').hasAttribute('data-fallback-src', FALLBACK_SRC, 'exposes the fallback source on the element');

        await render(hbs`<Image src={{this.src}} alt="No fallback" />`);
        assert.dom('img.flb--img').doesNotHaveAttribute('data-fallback-src', 'no fallback attribute is rendered when @fallbackSrc is not given');
    });

    test('an image load failure swaps the src for @fallbackSrc', async function (assert) {
        this.src = PRIMARY_SRC;
        this.fallbackSrc = FALLBACK_SRC;

        await render(hbs`<Image src={{this.src}} @fallbackSrc={{this.fallbackSrc}} alt="Broken" />`);
        assert.dom('img.flb--img').hasAttribute('src', PRIMARY_SRC, 'starts out on the primary source');

        await triggerLoadFailure();

        assert.dom('img.flb--img').hasAttribute('src', FALLBACK_SRC, 'the error handler substitutes the fallback source');
        assert.dom('img.flb--img').hasAttribute('alt', 'Broken', 'the alt text survives the fallback swap');
    });

    test('an image load failure without @fallbackSrc leaves the src untouched', async function (assert) {
        this.src = PRIMARY_SRC;

        await render(hbs`<Image src={{this.src}} alt="Broken, no fallback" />`);

        await triggerLoadFailure();

        assert.dom('img.flb--img').hasAttribute('src', PRIMARY_SRC, 'the src is not cleared or mutated when there is nothing to fall back to');
    });

    test('a repeated load failure does not re-swap once the fallback is in place', async function (assert) {
        this.src = PRIMARY_SRC;
        this.fallbackSrc = FALLBACK_SRC;

        await render(hbs`<Image src={{this.src}} @fallbackSrc={{this.fallbackSrc}} alt="Broken twice" />`);

        await triggerLoadFailure();
        await triggerLoadFailure();

        assert.dom('img.flb--img').hasAttribute('src', FALLBACK_SRC, 'stays on the fallback source, it does not loop or blank out');
    });

    test('a blank src is replaced by @fallbackSrc on insert', async function (assert) {
        this.fallbackSrc = FALLBACK_SRC;

        await render(hbs`<Image @fallbackSrc={{this.fallbackSrc}} alt="Placeholder" />`);

        assert.dom('img.flb--img').hasAttribute('src', FALLBACK_SRC, 'setupComponent fills in the fallback when no src was supplied');
    });

    test('a provided src is never overwritten by @fallbackSrc on insert', async function (assert) {
        this.src = PRIMARY_SRC;
        this.fallbackSrc = FALLBACK_SRC;

        await render(hbs`<Image src={{this.src}} @fallbackSrc={{this.fallbackSrc}} alt="Has src" />`);

        assert.dom('img.flb--img').hasAttribute('src', PRIMARY_SRC, 'the explicit src wins over the fallback');
    });

    test('a blank src with no @fallbackSrc renders without a src attribute', async function (assert) {
        await render(hbs`<Image alt="Nothing at all" />`);

        assert.dom('img.flb--img').exists('tolerates being rendered with neither src nor fallback');
        assert.dom('img.flb--img').doesNotHaveAttribute('src', 'no src is fabricated');
        assert.dom('img.flb--img').hasAttribute('alt', 'Nothing at all');
    });

    test('the rendered src tracks a changing @fallbackSrc through the error handler', async function (assert) {
        this.src = PRIMARY_SRC;
        this.fallbackSrc = ALTERNATE_FALLBACK_SRC;

        await render(hbs`<Image src={{this.src}} @fallbackSrc={{this.fallbackSrc}} alt="Swappable" />`);

        this.set('fallbackSrc', FALLBACK_SRC);
        assert.dom('img.flb--img').hasAttribute('data-fallback-src', FALLBACK_SRC, 'the data attribute is reactive to @fallbackSrc');

        await triggerLoadFailure();
        assert.dom('img.flb--img').hasAttribute('src', FALLBACK_SRC, 'the handler reads the latest @fallbackSrc value, not the one from render time');
    });
});
