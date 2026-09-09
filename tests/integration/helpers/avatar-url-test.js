import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const DEFAULT_AVATAR = 'https://s3.ap-southeast-1.amazonaws.com/flb-assets/static/no-avatar.png';

module('Integration | Helper | avatar-url', function (hooks) {
    setupRenderingTest(hooks);

    test('it returns a string url untouched', async function (assert) {
        this.set('url', 'https://cdn.example.com/avatars/jane.png');

        await render(hbs`{{avatar-url this.url}}`);

        assert.dom(this.element).hasText('https://cdn.example.com/avatars/jane.png');
    });

    test('it falls back to the built-in placeholder when the url is null', async function (assert) {
        this.set('url', null);

        await render(hbs`{{avatar-url this.url}}`);

        assert.dom(this.element).hasText(DEFAULT_AVATAR);
    });

    test('it falls back to the built-in placeholder when no argument is supplied', async function (assert) {
        await render(hbs`{{avatar-url}}`);

        assert.dom(this.element).hasText(DEFAULT_AVATAR);
    });

    test('it falls back to the built-in placeholder for non-string values', async function (assert) {
        this.set('numeric', 42);
        this.set('objectValue', { url: 'https://cdn.example.com/nope.png' });

        await render(hbs`<span id="numeric">{{avatar-url this.numeric}}</span><span id="object">{{avatar-url this.objectValue}}</span>`);

        assert.dom('#numeric').hasText(DEFAULT_AVATAR, 'numbers are not treated as urls');
        assert.dom('#object').hasText(DEFAULT_AVATAR, 'objects are not treated as urls');
    });

    test('an empty string counts as a string and is returned as-is', async function (assert) {
        this.set('url', '');

        await render(hbs`{{avatar-url this.url}}`);

        assert.dom(this.element).hasNoText('an empty string short-circuits the default url');
    });

    test('it honours a caller supplied default url', async function (assert) {
        this.set('url', undefined);

        await render(hbs`{{avatar-url this.url "/assets/fallback.png"}}`);

        assert.dom(this.element).hasText('/assets/fallback.png');
    });

    test('the caller supplied default is ignored when a real url is present', async function (assert) {
        this.set('url', 'https://cdn.example.com/real.png');

        await render(hbs`{{avatar-url this.url "/assets/fallback.png"}}`);

        assert.dom(this.element).hasText('https://cdn.example.com/real.png');
    });
});
