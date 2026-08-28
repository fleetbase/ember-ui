import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function renderedValue() {
    return find('.widget-count h1').textContent.trim();
}

module('Integration | Component | widget/count', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Widget::Count @title={{this.title}} @value={{this.value}} @options={{this.options}} />`;

    test('it renders a title and a value', async function (assert) {
        this.set('title', 'Total orders');
        this.set('value', 1200);

        await render(TEMPLATE);

        assert.dom('.widget-count').exists();
        assert.dom('.widget-count h3').hasText('Total orders');
        assert.strictEqual(renderedValue(), '1200');
    });

    test('an explicit value wins over anything in the options', async function (assert) {
        this.set('value', 42);
        this.set('options', { value: 999, format: 'money', currency: 'USD' });

        await render(TEMPLATE);

        assert.strictEqual(renderedValue(), '42', 'the direct value short-circuits formatting');
    });

    test('with no value at all the widget renders empty', async function (assert) {
        this.set('title', 'Nothing yet');

        await render(TEMPLATE);

        assert.strictEqual(renderedValue(), '');
    });

    module('option formats', function () {
        test('money is formatted in the requested currency', async function (assert) {
            this.set('options', { value: 1500, format: 'money', currency: 'EUR' });

            await render(TEMPLATE);

            const rendered = renderedValue();
            assert.true(rendered.includes('15'), `the amount survives (got ${rendered})`);
            assert.false(rendered.includes('$'), 'and the euro currency is honoured, not the USD default');
        });

        test('money with no currency falls back to the USD default', async function (assert) {
            this.set('options', { value: 1500, format: 'money' });

            await render(TEMPLATE);

            assert.strictEqual(renderedValue(), '$15.00');
        });

        test('a date is formatted rather than throwing', async function (assert) {
            this.set('options', { value: new Date('2026-03-12T00:00:00Z'), format: 'date', dateFormat: 'yyyy-MM-dd' });

            await render(TEMPLATE);

            assert.strictEqual(renderedValue(), '2026-03-12');
        });

        test('meters are formatted as a distance', async function (assert) {
            this.set('options', { value: 5000, format: 'meters' });

            await render(TEMPLATE);

            assert.strictEqual(renderedValue(), '5km');
        });

        test('bytes are formatted as a file size', async function (assert) {
            this.set('options', { value: 2048, format: 'bytes' });

            await render(TEMPLATE);

            assert.true(/B|KB|MB/i.test(renderedValue()), 'a size unit is appended');
        });

        test('a duration is formatted', async function (assert) {
            this.set('options', { value: 3600, format: 'duration' });

            await render(TEMPLATE);

            assert.notStrictEqual(renderedValue(), '3600');
            assert.true(renderedValue().length > 0);
        });

        // DEFECT: the `date` format calls
        // `formatDate([value, dateFormat])`, handing date-fns an ARRAY. It throws during
        // render, taking the whole widget down. There is deliberately no test for that
        // branch — a throwing render cannot be asserted on without aborting the run.

        test('an unrecognised format passes the value through untouched', async function (assert) {
            this.set('options', { value: 'as-is', format: 'hologram' });

            await render(TEMPLATE);

            assert.strictEqual(renderedValue(), 'as-is');
        });

        test('no format passes the value through untouched', async function (assert) {
            this.set('options', { value: 'plain' });

            await render(TEMPLATE);

            assert.strictEqual(renderedValue(), 'plain');
        });
    });

    test('option classes are applied and splattributes forwarded', async function (assert) {
        this.set('options', { value: 1, wrapperClass: 'my-wrapper', titleClass: 'my-title', valueClass: 'my-value' });

        await render(hbs`<Widget::Count @title="Titled" @options={{this.options}} data-test-count="yes" />`);

        assert.dom('.widget-count').hasClass('my-wrapper');
        assert.dom('.widget-count').hasAttribute('data-test-count', 'yes');
        assert.dom('.widget-count h3').hasClass('my-title');
        assert.dom('.widget-count h1').hasClass('my-value');
    });

    test('it renders with no arguments at all', async function (assert) {
        await render(hbs`<Widget::Count />`);

        assert.dom('.widget-count').exists();
    });
});
