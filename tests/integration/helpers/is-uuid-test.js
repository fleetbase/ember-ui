import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | is-uuid', function (hooks) {
    setupRenderingTest(hooks);

    test('it is true for a version 4 uuid', async function (assert) {
        this.set('value', '3f2504e0-4f89-41d3-9a0c-0305e82c3301');

        await render(hbs`{{is-uuid this.value}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is case insensitive', async function (assert) {
        this.set('value', '3F2504E0-4F89-41D3-9A0C-0305E82C3301');

        await render(hbs`{{is-uuid this.value}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it accepts every supported version digit', async function (assert) {
        this.set('values', ['3f2504e0-4f89-11d3-9a0c-0305e82c3301', '3f2504e0-4f89-21d3-aa0c-0305e82c3301', '3f2504e0-4f89-31d3-b90c-0305e82c3301', '3f2504e0-4f89-51d3-8a0c-0305e82c3301']);

        await render(hbs`
            {{#each this.values as |value|}}
                <span class="result">{{is-uuid value}}</span>
            {{/each}}
        `);

        assert.dom(this.element).hasText('true true true true');
    });

    test('it is false for the nil uuid because the version digit is zero', async function (assert) {
        this.set('value', '00000000-0000-0000-0000-000000000000');

        await render(hbs`{{is-uuid this.value}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false for an unsupported version digit', async function (assert) {
        this.set('value', '3f2504e0-4f89-71d3-9a0c-0305e82c3301');

        await render(hbs`{{is-uuid this.value}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false for an invalid variant digit', async function (assert) {
        this.set('value', '3f2504e0-4f89-41d3-1a0c-0305e82c3301');

        await render(hbs`{{is-uuid this.value}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false when the uuid is wrapped, padded or surrounded by other text', async function (assert) {
        this.set('braced', '{3f2504e0-4f89-41d3-9a0c-0305e82c3301}');
        this.set('padded', ' 3f2504e0-4f89-41d3-9a0c-0305e82c3301 ');
        this.set('suffixed', '3f2504e0-4f89-41d3-9a0c-0305e82c3301-extra');

        await render(hbs`{{is-uuid this.braced}}|{{is-uuid this.padded}}|{{is-uuid this.suffixed}}`);

        assert.dom(this.element).hasText('false|false|false');
    });

    test('it is false for unhyphenated and truncated forms', async function (assert) {
        this.set('unhyphenated', '3f2504e04f8941d39a0c0305e82c3301');
        this.set('truncated', '3f2504e0-4f89-41d3-9a0c-0305e82c33');

        await render(hbs`{{is-uuid this.unhyphenated}}|{{is-uuid this.truncated}}`);

        assert.dom(this.element).hasText('false|false');
    });

    test('it is false for non hex characters', async function (assert) {
        this.set('value', '3g2504e0-4f89-41d3-9a0c-0305e82c3301');

        await render(hbs`{{is-uuid this.value}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false for empty, null, undefined and non string input', async function (assert) {
        this.set('empty', '');
        this.set('nullValue', null);
        this.set('number', 12345);

        await render(hbs`{{is-uuid this.empty}}|{{is-uuid this.nullValue}}|{{is-uuid this.missing}}|{{is-uuid this.number}}`);

        assert.dom(this.element).hasText('false|false|false|false');
    });
});
