import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | is-bool-value', function (hooks) {
    setupRenderingTest(hooks);

    test('real booleans are boolean values', async function (assert) {
        this.set('yes', true);
        this.set('no', false);

        await render(hbs`<span id="true">{{is-bool-value this.yes}}</span><span id="false">{{is-bool-value this.no}}</span>`);

        assert.dom('#true').hasText('true');
        assert.dom('#false').hasText('true', 'false is still a boolean value');
    });

    test('the four recognised boolean-ish strings are accepted', async function (assert) {
        await render(
            hbs`<span id="t">{{is-bool-value "true"}}</span><span id="f">{{is-bool-value "false"}}</span><span id="one">{{is-bool-value "1"}}</span><span id="zero">{{is-bool-value "0"}}</span>`
        );

        assert.dom('#t').hasText('true');
        assert.dom('#f').hasText('true');
        assert.dom('#one').hasText('true');
        assert.dom('#zero').hasText('true');
    });

    test('string matching is case sensitive', async function (assert) {
        await render(hbs`<span id="upper">{{is-bool-value "TRUE"}}</span><span id="title">{{is-bool-value "False"}}</span>`);

        assert.dom('#upper').hasText('false');
        assert.dom('#title').hasText('false');
    });

    test('surrounding whitespace is not trimmed', async function (assert) {
        await render(hbs`{{is-bool-value " true"}}`);

        assert.dom(this.element).hasText('false');
    });

    test('numeric 1 and 0 are not boolean values', async function (assert) {
        await render(hbs`<span id="one">{{is-bool-value 1}}</span><span id="zero">{{is-bool-value 0}}</span>`);

        assert.dom('#one').hasText('false', 'only the string "1" is recognised');
        assert.dom('#zero').hasText('false');
    });

    test('other strings are not boolean values', async function (assert) {
        await render(hbs`<span id="yes">{{is-bool-value "yes"}}</span><span id="on">{{is-bool-value "on"}}</span><span id="empty">{{is-bool-value ""}}</span>`);

        assert.dom('#yes').hasText('false');
        assert.dom('#on').hasText('false');
        assert.dom('#empty').hasText('false');
    });

    test('null, undefined and missing arguments are not boolean values', async function (assert) {
        this.set('nullish', null);
        this.set('nothing', undefined);

        await render(hbs`<span id="null">{{is-bool-value this.nullish}}</span><span id="undef">{{is-bool-value this.nothing}}</span><span id="none">{{is-bool-value}}</span>`);

        assert.dom('#null').hasText('false');
        assert.dom('#undef').hasText('false');
        assert.dom('#none').hasText('false');
    });

    test('objects and arrays are not boolean values', async function (assert) {
        this.set('list', ['true']);

        await render(hbs`<span id="hash">{{is-bool-value (hash value=true)}}</span><span id="array">{{is-bool-value this.list}}</span>`);

        assert.dom('#hash').hasText('false');
        assert.dom('#array').hasText('false');
    });
});
