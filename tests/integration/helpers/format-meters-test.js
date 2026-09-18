import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | format-meters', function (hooks) {
    setupRenderingTest(hooks);

    test('it converts meters to whole kilometers', async function (assert) {
        await render(hbs`{{format-meters 1000}}`);

        assert.dom(this.element).hasText('1km');
    });

    test('zero renders 0km', async function (assert) {
        await render(hbs`{{format-meters 0}}`);

        assert.dom(this.element).hasText('0km');
    });

    test('it rounds to the nearest kilometer', async function (assert) {
        await render(hbs`<span id="down">{{format-meters 1499}}</span><span id="up">{{format-meters 1500}}</span><span id="big">{{format-meters 12750}}</span>`);

        assert.dom('#down').hasText('1km', '1499m rounds down');
        assert.dom('#up').hasText('2km', 'exact halves round up');
        assert.dom('#big').hasText('13km');
    });

    test('sub-kilometer distances collapse to 0km or 1km', async function (assert) {
        await render(hbs`<span id="low">{{format-meters 499}}</span><span id="half">{{format-meters 500}}</span>`);

        assert.dom('#low').hasText('0km', 'no fractional kilometers are rendered');
        assert.dom('#half').hasText('1km');
    });

    test('negative distances round toward positive infinity like Math.round', async function (assert) {
        this.set('backwards', -1500);
        this.set('furtherBackwards', -1600);

        await render(hbs`<span id="neg">{{format-meters this.backwards}}</span><span id="neg2">{{format-meters this.furtherBackwards}}</span>`);

        assert.dom('#neg').hasText('-1km');
        assert.dom('#neg2').hasText('-2km');
    });

    test('numeric strings are coerced before dividing', async function (assert) {
        this.set('meters', '2400');

        await render(hbs`{{format-meters this.meters}}`);

        assert.dom(this.element).hasText('2km');
    });
});
