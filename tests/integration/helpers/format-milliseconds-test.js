import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | format-milliseconds', function (hooks) {
    setupRenderingTest(hooks);

    test('sub-one values are rendered as milliseconds', async function (assert) {
        await render(hbs`<span id="half">{{format-milliseconds 0.5}}</span><span id="quarter">{{format-milliseconds 0.25}}</span>`);

        assert.dom('#half').hasText('500ms');
        assert.dom('#quarter').hasText('250ms');
    });

    test('millisecond output is padded to three digits', async function (assert) {
        await render(hbs`<span id="tiny">{{format-milliseconds 0.001}}</span><span id="small">{{format-milliseconds 0.012}}</span>`);

        assert.dom('#tiny').hasText('001ms', 'the value is taken from a fixed 3-decimal string');
        assert.dom('#small').hasText('012ms');
    });

    test('values of one or more are rendered as seconds with three decimals', async function (assert) {
        await render(hbs`<span id="a">{{format-milliseconds 1.5}}</span><span id="b">{{format-milliseconds 1000}}</span><span id="c">{{format-milliseconds 1234.5678}}</span>`);

        assert.dom('#a').hasText('1.500s');
        assert.dom('#b').hasText('1000.000s');
        assert.dom('#c').hasText('1234.568s', 'the seconds value is rounded to 3 decimals');
    });

    test('zero renders the dash placeholder', async function (assert) {
        await render(hbs`{{format-milliseconds 0}}`);

        assert.dom(this.element).hasText('-');
    });

    test('missing values render the dash placeholder', async function (assert) {
        this.set('nothing', undefined);
        this.set('empty', null);

        await render(
            hbs`<span id="undef">{{format-milliseconds this.nothing}}</span><span id="null">{{format-milliseconds this.empty}}</span><span id="none">{{format-milliseconds}}</span>`
        );

        assert.dom('#undef').hasText('-');
        assert.dom('#null').hasText('-');
        assert.dom('#none').hasText('-');
    });

    test('non-numeric values render the dash placeholder', async function (assert) {
        this.set('stringValue', '1234');
        this.set('boolValue', true);

        await render(hbs`<span id="str">{{format-milliseconds this.stringValue}}</span><span id="bool">{{format-milliseconds this.boolValue}}</span>`);

        assert.dom('#str').hasText('-', 'numeric strings are rejected, only real numbers are formatted');
        assert.dom('#bool').hasText('-');
    });

    test('NaN renders the dash placeholder', async function (assert) {
        this.set('notANumber', Number.NaN);

        await render(hbs`{{format-milliseconds this.notANumber}}`);

        assert.dom(this.element).hasText('-');
    });

    test('negative values are treated as seconds because their string form starts with a sign', async function (assert) {
        this.set('negative', -0.5);

        await render(hbs`{{format-milliseconds this.negative}}`);

        assert.dom(this.element).hasText('-0.500s');
    });
});
