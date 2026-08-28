import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | model-select/spinner', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders an svg spinner', async function (assert) {
        await render(hbs`<ModelSelect::Spinner />`);

        assert.dom('svg.ember-model-select__spinner').exists();
        assert.dom('svg.ember-model-select__spinner').hasAttribute('viewBox', '0 0 38 38');
    });

    test('it draws a track circle and an arc', async function (assert) {
        await render(hbs`<ModelSelect::Spinner />`);

        assert.dom('svg circle').hasAttribute('r', '17', 'the track is drawn');
        assert.dom('svg path').exists('the moving arc is drawn');
    });

    test('the fill is suppressed so only the stroke shows', async function (assert) {
        await render(hbs`<ModelSelect::Spinner />`);

        assert.true(find('svg').getAttribute('style').includes('fill:none'));
    });
});
