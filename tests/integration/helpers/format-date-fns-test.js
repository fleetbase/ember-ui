import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { format } from 'date-fns';

// A fixed local-time date: constructing with numeric parts keeps the expectations
// independent of the machine timezone.
const FIXED_DATE = new Date(2021, 0, 15, 13, 45, 30);

module('Integration | Helper | format-date-fns', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('date', FIXED_DATE);
    });

    test('a Date is formatted with the default "yyyy-MM-dd HH:mm" pattern', async function (assert) {
        await render(hbs`{{format-date-fns this.date}}`);

        assert.dom(this.element).hasText('2021-01-15 13:45');
    });

    test('the second positional argument overrides the format pattern', async function (assert) {
        await render(hbs`<span id="ymd">{{format-date-fns this.date "yyyy-MM-dd"}}</span><span id="time">{{format-date-fns this.date "HH:mm:ss"}}</span>`);

        assert.dom('#ymd').hasText('2021-01-15');
        assert.dom('#time').hasText('13:45:30');
    });

    test('an empty format string falls back to the default pattern', async function (assert) {
        await render(hbs`{{format-date-fns this.date ""}}`);

        assert.dom(this.element).hasText('2021-01-15 13:45');
    });

    test('an ISO string without a zone designator is parsed as local time', async function (assert) {
        this.set('iso', '2021-01-15T13:45:30');

        await render(hbs`{{format-date-fns this.iso}}`);

        assert.dom(this.element).hasText('2021-01-15 13:45');
    });

    test('a date-only ISO string is parsed', async function (assert) {
        this.set('iso', '2021-01-15');

        await render(hbs`{{format-date-fns this.iso "yyyy-MM-dd"}}`);

        assert.dom(this.element).hasText('2021-01-15');
    });

    test('a numeric value in the seconds range is scaled to milliseconds', async function (assert) {
        this.set('seconds', 1600000000);

        await render(hbs`{{format-date-fns this.seconds}}`);

        assert.dom(this.element).hasText(format(new Date(1600000000 * 1000), 'yyyy-MM-dd HH:mm'), 'unix seconds are multiplied by 1000');
    });

    test('a numeric value already in milliseconds is not scaled again', async function (assert) {
        this.set('millis', 1600000000000);

        await render(hbs`{{format-date-fns this.millis}}`);

        assert.dom(this.element).hasText(format(new Date(1600000000000), 'yyyy-MM-dd HH:mm'));
    });

    test('a numeric string is treated as a timestamp', async function (assert) {
        this.set('numericString', '1600000000');

        await render(hbs`{{format-date-fns this.numericString}}`);

        assert.dom(this.element).hasText(format(new Date(1600000000 * 1000), 'yyyy-MM-dd HH:mm'));
    });

    test('unix=true forces a millisecond-range value to be scaled anyway', async function (assert) {
        this.set('millis', 1600000000000);

        await render(hbs`<span id="auto">{{format-date-fns this.millis "yyyy"}}</span><span id="forced">{{format-date-fns this.millis "yyyy" unix=true}}</span>`);

        assert.dom('#auto').hasText(format(new Date(1600000000000), 'yyyy'), 'without the flag the value is left in milliseconds');
        assert.dom('#forced').hasText(format(new Date(1600000000000 * 1000), 'yyyy'), 'the flag forces another x1000 conversion');
    });

    test('inputFormat is used to parse non-ISO strings', async function (assert) {
        this.set('euro', '15/01/2021');

        await render(hbs`{{format-date-fns this.euro "yyyy-MM-dd" inputFormat="dd/MM/yyyy"}}`);

        assert.dom(this.element).hasText('2021-01-15');
    });

    test('null and undefined render the empty fallback', async function (assert) {
        this.set('nullish', null);
        this.set('nothing', undefined);

        await render(hbs`<span id="null">{{format-date-fns this.nullish}}</span><span id="undef">{{format-date-fns this.nothing}}</span>`);

        assert.dom('#null').hasNoText();
        assert.dom('#undef').hasNoText();
    });

    test('the fallback named argument is rendered for missing values', async function (assert) {
        this.set('nullish', null);

        await render(hbs`{{format-date-fns this.nullish fallback="—"}}`);

        assert.dom(this.element).hasText('—');
    });

    test('an unparseable string renders the fallback', async function (assert) {
        this.set('garbage', 'not-a-real-date');

        await render(hbs`{{format-date-fns this.garbage fallback="N/A"}}`);

        assert.dom(this.element).hasText('N/A');
    });

    test('an empty string renders the fallback', async function (assert) {
        this.set('blank', '   ');

        await render(hbs`{{format-date-fns this.blank fallback="N/A"}}`);

        assert.dom(this.element).hasText('N/A');
    });

    test('unsupported value types render the fallback', async function (assert) {
        this.set('boolValue', true);
        this.set('objectValue', { year: 2021 });

        await render(hbs`<span id="bool">{{format-date-fns this.boolValue fallback="N/A"}}</span><span id="obj">{{format-date-fns this.objectValue fallback="N/A"}}</span>`);

        assert.dom('#bool').hasText('N/A');
        assert.dom('#obj').hasText('N/A');
    });

    test('an invalid Date instance renders the fallback', async function (assert) {
        this.set('invalid', new Date('nope'));

        await render(hbs`{{format-date-fns this.invalid fallback="N/A"}}`);

        assert.dom(this.element).hasText('N/A');
    });

    test('an invalid format token renders the fallback instead of throwing', async function (assert) {
        await render(hbs`{{format-date-fns this.date "J" fallback="N/A"}}`);

        assert.dom(this.element).hasText('N/A', 'date-fns throws on unescaped unknown tokens and the helper swallows it');
    });
});
