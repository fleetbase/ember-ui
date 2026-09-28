import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const PHOTO = 'https://cdn.fleetbase.test/photo.png';
const OTHER_PHOTO = 'https://cdn.fleetbase.test/other.png';

module('Integration | Modifier | background-url', function (hooks) {
    setupRenderingTest(hooks);

    test('it sets the background image from the url and defaults the size to cover', async function (assert) {
        this.set('url', PHOTO);

        await render(hbs`<div data-test-el {{background-url this.url}}></div>`);

        const element = find('[data-test-el]');

        assert.strictEqual(element.style.backgroundImage, `url("${PHOTO}")`, 'background image is the provided url');
        assert.strictEqual(element.style.backgroundSize, 'cover', 'background size defaults to cover');
        assert.notOk(element.style.backgroundImage.includes('linear-gradient'), 'no overlay gradient is applied by default');
    });

    test('it honors the size option', async function (assert) {
        this.set('url', PHOTO);

        await render(hbs`<div data-test-el {{background-url this.url size="contain"}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.backgroundSize, 'contain', 'background size uses the provided size option');
    });

    test('it layers the gradient overlay above the url when overlay is true', async function (assert) {
        this.set('url', PHOTO);
        this.set('gradient', 'linear-gradient(rgb(255, 0, 0), rgb(0, 0, 255))');

        await render(hbs`<div data-test-el {{background-url this.url overlay=true gradient=this.gradient}}></div>`);

        const backgroundImage = find('[data-test-el]').style.backgroundImage;

        assert.ok(backgroundImage.includes('linear-gradient'), `overlay gradient is applied (got "${backgroundImage}")`);
        assert.ok(backgroundImage.includes(`url("${PHOTO}")`), 'url is still applied alongside the gradient');
        assert.ok(backgroundImage.indexOf('linear-gradient') < backgroundImage.indexOf('url('), 'gradient is layered above the image');
        assert.ok(backgroundImage.includes('rgb(255, 0, 0)'), 'the custom gradient value is used');
    });

    test('it uses the default overlay gradient when only overlay is passed', async function (assert) {
        this.set('url', PHOTO);

        await render(hbs`<div data-test-el {{background-url this.url overlay=true}}></div>`);

        const backgroundImage = find('[data-test-el]').style.backgroundImage;

        assert.ok(backgroundImage.includes('linear-gradient'), 'default gradient is applied');
        assert.ok(backgroundImage.includes('rgba(0, 0, 0, 0.3)'), `default gradient uses the black 30% overlay (got "${backgroundImage}")`);
    });

    test('it updates the background when the url changes', async function (assert) {
        this.set('url', PHOTO);

        await render(hbs`<div data-test-el {{background-url this.url}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.backgroundImage, `url("${PHOTO}")`, 'initial url is applied');

        this.set('url', OTHER_PHOTO);
        await settled();

        assert.strictEqual(element.style.backgroundImage, `url("${OTHER_PHOTO}")`, 'background image tracks the updated url');
    });

    test('it does not produce a url() for null, undefined or empty urls', async function (assert) {
        this.set('url', null);

        await render(hbs`<div data-test-el {{background-url this.url}}></div>`);

        const element = find('[data-test-el]');

        assert.strictEqual(element.style.backgroundImage, '', 'no background image is set for a null url');
        assert.notOk(element.style.background.includes('null'), 'the literal string "null" is never used as a url');
        assert.strictEqual(element.style.backgroundSize, 'cover', 'background size is still applied');

        this.set('url', '');
        await settled();
        assert.strictEqual(element.style.backgroundImage, '', 'no background image is set for an empty url');

        this.set('url', '   ');
        await settled();
        assert.strictEqual(element.style.backgroundImage, '', 'no background image is set for a whitespace only url');
    });

    test('it clears the background image when the url is removed', async function (assert) {
        this.set('url', PHOTO);

        await render(hbs`<div data-test-el {{background-url this.url}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.backgroundImage, `url("${PHOTO}")`, 'initial url is applied');

        this.set('url', undefined);
        await settled();

        assert.strictEqual(element.style.backgroundImage, '', 'background image is cleared when the url goes away');
        assert.notOk(element.style.background.includes('undefined'), 'the literal string "undefined" is never used as a url');
    });
});
