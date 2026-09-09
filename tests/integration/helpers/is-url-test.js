import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | is-url', function (hooks) {
    setupRenderingTest(hooks);

    test('it is true for an absolute http url', async function (assert) {
        this.set('value', 'https://fleetbase.io/path?query=1#hash');

        await render(hbs`{{is-url this.value}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is true for uppercase protocols and non http schemes', async function (assert) {
        this.set('upper', 'HTTP://FLEETBASE.IO');
        this.set('mailto', 'mailto:hello@fleetbase.io');
        this.set('data', 'data:text/plain,hello');

        await render(hbs`{{is-url this.upper}}|{{is-url this.mailto}}|{{is-url this.data}}`);

        assert.dom(this.element).hasText('true|true|true');
    });

    test('it is true for urls containing unicode and encoded characters', async function (assert) {
        this.set('unicode', 'https://fleetbase.io/städte/日本');
        this.set('encoded', 'https://fleetbase.io/a%20b?q=%E2%9C%93');

        await render(hbs`{{is-url this.unicode}}|{{is-url this.encoded}}`);

        assert.dom(this.element).hasText('true|true');
    });

    test('it is false for a bare domain without a protocol', async function (assert) {
        this.set('value', 'fleetbase.io');

        await render(hbs`{{is-url this.value}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false for a protocol relative url', async function (assert) {
        this.set('value', '//fleetbase.io/logo.png');

        await render(hbs`{{is-url this.value}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false for a relative path', async function (assert) {
        this.set('value', '/orders/1');

        await render(hbs`{{is-url this.value}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false for an empty string and for arbitrary text', async function (assert) {
        this.set('empty', '');
        this.set('text', 'not a url at all');

        await render(hbs`{{is-url this.empty}}|{{is-url this.text}}`);

        assert.dom(this.element).hasText('false|false');
    });

    test('it renders nothing for non string input', async function (assert) {
        this.set('number', 1234);
        this.set('object', { href: 'https://fleetbase.io' });
        this.set('nullValue', null);

        await render(hbs`{{is-url this.number}}{{is-url this.object}}{{is-url this.nullValue}}{{is-url this.missing}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it distinguishes valid from invalid urls in a conditional', async function (assert) {
        this.set('value', 'ftp://files.fleetbase.io/report.csv');

        await render(hbs`
            {{#if (is-url this.value)}}
                <a class="link" href={{this.value}}>download</a>
            {{else}}
                <span class="plain">{{this.value}}</span>
            {{/if}}
        `);

        assert.dom('.link').exists();
        assert.dom('.plain').doesNotExist();
    });
});
