import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | format-bytes', function (hooks) {
    setupRenderingTest(hooks);

    test('zero renders the special "0 Bytes" label', async function (assert) {
        await render(hbs`{{format-bytes 0}}`);

        assert.dom(this.element).hasText('0 Bytes');
    });

    test('values below one kibibyte stay in bytes', async function (assert) {
        await render(hbs`<span id="one">{{format-bytes 1}}</span><span id="half">{{format-bytes 512}}</span><span id="edge">{{format-bytes 1023}}</span>`);

        assert.dom('#one').hasText('1 Bytes', 'the unit is not singularised');
        assert.dom('#half').hasText('512 Bytes');
        assert.dom('#edge').hasText('1023 Bytes', '1023 is the last value expressed in bytes');
    });

    test('it steps up a unit at each power of 1024', async function (assert) {
        await render(hbs`<span id="kb">{{format-bytes 1024}}</span><span id="mb">{{format-bytes 1048576}}</span><span id="gb">{{format-bytes 1073741824}}</span>`);

        assert.dom('#kb').hasText('1 KB');
        assert.dom('#mb').hasText('1 MB');
        assert.dom('#gb').hasText('1 GB');
    });

    test('it uses binary (1024) units rather than decimal ones', async function (assert) {
        await render(hbs`{{format-bytes 1000}}`);

        assert.dom(this.element).hasText('1000 Bytes', '1000 bytes is not yet a kilobyte');
    });

    test('it rounds to two decimals by default and trims insignificant zeros', async function (assert) {
        await render(hbs`<span id="a">{{format-bytes 1536}}</span><span id="b">{{format-bytes 1234567}}</span><span id="c">{{format-bytes 2048}}</span>`);

        assert.dom('#a').hasText('1.5 KB', 'a trailing zero from toFixed(2) is trimmed');
        assert.dom('#b').hasText('1.18 MB');
        assert.dom('#c').hasText('2 KB', 'whole numbers render without a decimal part');
    });

    test('the decimals argument controls precision', async function (assert) {
        await render(hbs`<span id="zero">{{format-bytes 1536 0}}</span><span id="three">{{format-bytes 1080 3}}</span>`);

        assert.dom('#zero').hasText('2 KB', 'zero decimals rounds 1.5 up to 2');
        assert.dom('#three').hasText('1.055 KB');
    });

    test('negative decimals are clamped to zero', async function (assert) {
        this.set('decimals', -4);

        await render(hbs`{{format-bytes 1536 this.decimals}}`);

        assert.dom(this.element).hasText('2 KB');
    });

    test('it scales all the way to yobibytes', async function (assert) {
        this.set('yotta', Math.pow(1024, 8));

        await render(hbs`{{format-bytes this.yotta}}`);

        assert.dom(this.element).hasText('1 YB');
    });
});
