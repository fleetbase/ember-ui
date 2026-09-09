import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// Same-origin urls keep the test off the network; the images are lazy loaded from an
// off-screen wrapper and every "error" is dispatched synthetically (non bubbling, exactly
// like a real image load failure) so nothing is ever fetched.
const FALLBACK = `${window.location.origin}/fleetbase-fallback.png`;
const OTHER_FALLBACK = `${window.location.origin}/fleetbase-other-fallback.png`;

module('Integration | Modifier | fallback-img-src', function (hooks) {
    setupRenderingTest(hooks);

    test('it swaps in the fallback url when the image errors', async function (assert) {
        this.set('fallback', FALLBACK);

        await render(hbs`
            <div style="position: fixed; top: -9999px; left: 0;">
                <img data-test-img alt="" loading="lazy" {{fallback-img-src this.fallback}} />
            </div>
        `);

        const image = find('[data-test-img]');
        assert.strictEqual(image.getAttribute('src'), null, 'no src is applied before an error occurs');
        assert.strictEqual(image.getAttribute('fallback-url'), null, 'no fallback marker before an error occurs');

        image.dispatchEvent(new Event('error'));
        await settled();

        assert.strictEqual(image.getAttribute('src'), FALLBACK, 'the fallback url is applied as the src');
        assert.strictEqual(image.getAttribute('fallback-url'), FALLBACK, 'the fallback-url attribute records the fallback');
    });

    test('it normalizes the fallback url before applying it', async function (assert) {
        this.set('fallback', `${window.location.origin}/images/../fleetbase-fallback.png`);

        await render(hbs`
            <div style="position: fixed; top: -9999px; left: 0;">
                <img data-test-img alt="" loading="lazy" {{fallback-img-src this.fallback}} />
            </div>
        `);

        const image = find('[data-test-img]');
        image.dispatchEvent(new Event('error'));
        await settled();

        assert.strictEqual(image.getAttribute('src'), FALLBACK, 'the url is normalized through the URL constructor');
    });

    test('it uses the updated fallback url after the argument changes', async function (assert) {
        this.set('fallback', FALLBACK);

        await render(hbs`
            <div style="position: fixed; top: -9999px; left: 0;">
                <img data-test-img alt="" loading="lazy" {{fallback-img-src this.fallback}} />
            </div>
        `);

        const image = find('[data-test-img]');
        image.dispatchEvent(new Event('error'));
        await settled();
        assert.strictEqual(image.getAttribute('fallback-url'), FALLBACK, 'the original fallback is applied first');

        this.set('fallback', OTHER_FALLBACK);
        await settled();
        image.dispatchEvent(new Event('error'));
        await settled();

        assert.strictEqual(image.getAttribute('src'), OTHER_FALLBACK, 'the src uses the updated fallback');
        assert.strictEqual(image.getAttribute('fallback-url'), OTHER_FALLBACK, 'the fallback-url attribute uses the updated fallback');
    });

    test('it ignores fallback urls that are not http or https', async function (assert) {
        this.set('fallback', 'ftp://example.com/fleetbase-fallback.png');

        await render(hbs`
            <div style="position: fixed; top: -9999px; left: 0;">
                <img data-test-img alt="" loading="lazy" {{fallback-img-src this.fallback}} />
            </div>
        `);

        const image = find('[data-test-img]');
        image.dispatchEvent(new Event('error'));
        await settled();

        assert.strictEqual(image.getAttribute('src'), null, 'a non http(s) fallback is never applied as a src');
        assert.strictEqual(image.getAttribute('fallback-url'), null, 'a non http(s) fallback does not set the marker attribute');
    });

    test('it ignores fallback values that are not strings', async function (assert) {
        this.set('fallback', null);

        await render(hbs`
            <div style="position: fixed; top: -9999px; left: 0;">
                <img data-test-img alt="" loading="lazy" {{fallback-img-src this.fallback}} />
            </div>
        `);

        const image = find('[data-test-img]');
        image.dispatchEvent(new Event('error'));
        await settled();

        assert.strictEqual(image.getAttribute('src'), null, 'a null fallback is a no-op');
        assert.strictEqual(image.getAttribute('fallback-url'), null, 'a null fallback does not set the marker attribute');
    });

    test('it removes the error listener when the element is destroyed', async function (assert) {
        this.set('fallback', FALLBACK);
        this.set('show', true);

        await render(hbs`
            <div style="position: fixed; top: -9999px; left: 0;">
                {{#if this.show}}
                    <img data-test-img alt="" loading="lazy" {{fallback-img-src this.fallback}} />
                {{/if}}
            </div>
        `);

        const image = find('[data-test-img]');

        this.set('show', false);
        await settled();

        assert.dom('[data-test-img]').doesNotExist('the image was torn down');

        image.dispatchEvent(new Event('error'));
        await settled();

        assert.strictEqual(image.getAttribute('src'), null, 'the detached image no longer receives the fallback src');
        assert.strictEqual(image.getAttribute('fallback-url'), null, 'the error listener was removed on teardown');
    });
});
