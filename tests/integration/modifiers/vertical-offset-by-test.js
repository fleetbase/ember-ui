import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Modifier | vertical-offset-by', function (hooks) {
    setupRenderingTest(hooks);

    test('it offsets the given direction by a numeric offset', async function (assert) {
        await render(hbs`<div data-test-el style="position: absolute;" {{vertical-offset-by "bottom" offset=20}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.bottom, '20px', 'bottom is offset by the given amount');
    });

    test('it offsets the top when top is the direction', async function (assert) {
        await render(hbs`<div data-test-el style="position: absolute;" {{vertical-offset-by "top" offset=35}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.top, '35px', 'top is offset by the given amount');
        assert.strictEqual(element.style.bottom, '', 'the other direction is untouched');
    });

    test('it strips units from a string offset', async function (assert) {
        await render(hbs`<div data-test-el style="position: absolute;" {{vertical-offset-by "bottom" offset="45px"}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.bottom, '45px', 'a px string offset is normalized to pixels');
    });

    test('it adds the height of an element matched by a selector', async function (assert) {
        await render(hbs`
            <div id="vob-header" style="box-sizing: border-box; height: 30px;"></div>
            <div data-test-el style="position: absolute;" {{vertical-offset-by "bottom" offset=10 elements="#vob-header"}}></div>
        `);

        assert.strictEqual(find('[data-test-el]').style.bottom, '40px', 'offset is the base offset plus the matched element height');
    });

    test('it sums the heights of comma separated selectors', async function (assert) {
        await render(hbs`
            <div id="vob-header" style="box-sizing: border-box; height: 30px;"></div>
            <div id="vob-subheader" style="box-sizing: border-box; height: 20px;"></div>
            <div data-test-el style="position: absolute;" {{vertical-offset-by "bottom" elements="#vob-header,#vob-subheader"}}></div>
        `);

        assert.strictEqual(find('[data-test-el]').style.bottom, '50px', 'both matched element heights are summed');
    });

    test('it sums the heights of pipe separated selectors', async function (assert) {
        await render(hbs`
            <div id="vob-header" style="box-sizing: border-box; height: 30px;"></div>
            <div id="vob-subheader" style="box-sizing: border-box; height: 20px;"></div>
            <div data-test-el style="position: absolute;" {{vertical-offset-by "bottom" offset=5 elements="#vob-header|#vob-subheader"}}></div>
        `);

        assert.strictEqual(find('[data-test-el]').style.bottom, '55px', 'pipe separated selectors are summed with the base offset');
    });

    test('it accepts an array of element references', async function (assert) {
        this.set('elements', null);

        await render(hbs`
            <div id="vob-header" style="box-sizing: border-box; height: 30px;"></div>
            <div id="vob-subheader" style="box-sizing: border-box; height: 20px;"></div>
            <div data-test-el style="position: absolute;" {{vertical-offset-by "bottom" elements=this.elements}}></div>
        `);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.bottom, '', 'nothing is applied while there are no elements');

        this.set('elements', [find('#vob-header'), find('#vob-subheader')]);
        await settled();

        assert.strictEqual(element.style.bottom, '50px', 'a plain array of html elements is measured');
    });

    test('it ignores array entries that are neither elements nor selectors', async function (assert) {
        this.set('elements', null);

        await render(hbs`
            <div id="vob-header" style="box-sizing: border-box; height: 30px;"></div>
            <div data-test-el style="position: absolute;" {{vertical-offset-by "bottom" elements=this.elements}}></div>
        `);

        this.set('elements', [find('#vob-header'), 42, '#vob-does-not-exist', null]);
        await settled();

        assert.strictEqual(find('[data-test-el]').style.bottom, '30px', 'only the real element contributes to the offset');
    });

    test('it does nothing when both offset and elements are blank', async function (assert) {
        await render(hbs`<div data-test-el style="position: absolute; bottom: 7px;" {{vertical-offset-by "bottom"}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.bottom, '7px', 'the existing bottom value is left alone');
    });

    test('it recalculates when the offset changes', async function (assert) {
        this.set('offset', 10);

        await render(hbs`
            <div id="vob-header" style="box-sizing: border-box; height: 30px;"></div>
            <div data-test-el style="position: absolute;" {{vertical-offset-by "bottom" offset=this.offset elements="#vob-header"}}></div>
        `);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.bottom, '40px', 'initial offset applied');

        this.set('offset', 100);
        await settled();

        assert.strictEqual(element.style.bottom, '130px', 'offset tracks the updated argument');
    });

    test('it applies the offset as a real layout position', async function (assert) {
        await render(hbs`
            <div style="position: relative; box-sizing: border-box; width: 200px; height: 200px;">
                <div data-test-el style="position: absolute; left: 0; width: 10px; height: 10px;" {{vertical-offset-by "bottom" offset=40}}></div>
            </div>
        `);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.bottom, '40px', 'bottom offset is applied');
        assert.strictEqual(element.offsetTop, 150, 'the element is positioned 40px above the bottom of its 200px container');
    });
    test('with no direction at all it offsets from the bottom', async function (assert) {
        await render(hbs`<div data-test-el style="position: absolute;" {{vertical-offset-by offset=25}}></div>`);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.bottom, '25px', 'bottom is the default direction');
        assert.strictEqual(element.style.top, '', 'and the top is left alone');
    });
});
