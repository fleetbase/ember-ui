import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const MIN_NUMBER = '.filter-range-input-group:first-child input[type="number"]';
const MAX_NUMBER = '.filter-range-input-group:last-child input[type="number"]';
const MIN_SLIDER = '.filter-range-slider-min';
const MAX_SLIDER = '.filter-range-slider-max';

module('Integration | Component | filter/range', function (hooks) {
    setupRenderingTest(hooks);

    let changes;
    let cleared;

    hooks.beforeEach(function () {
        changes = [];
        cleared = [];
        this.set('filter', { key: 'weight', min: 0, max: 100 });
        this.set('onChange', (filter, value) => changes.push([filter.key, value]));
        this.set('onClear', (filter) => cleared.push(filter.key));
    });

    const TEMPLATE = hbs`<Filter::Range @filter={{this.filter}} @value={{this.value}} @onChange={{this.onChange}} @onClear={{this.onClear}} />`;

    module('rendering', function () {
        test('it renders a labelled pair of number fields and sliders', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.filter-range').exists();
            assert.deepEqual(
                findAll('.filter-range-label').map((label) => label.textContent.trim()),
                ['Min', 'Max'],
                'the bounds are labelled by default'
            );
            assert.strictEqual(findAll('input[type="range"]').length, 2, 'both ends are draggable');
            assert.dom('.filter-range-separator').hasText('-');
        });

        test('the labels can be renamed', async function (assert) {
            this.set('filter', { ...this.filter, minLabel: 'From', maxLabel: 'To' });

            await render(TEMPLATE);

            assert.deepEqual(
                findAll('.filter-range-label').map((label) => label.textContent.trim()),
                ['From', 'To']
            );
        });

        test('the filter bounds and step are applied to every control', async function (assert) {
            this.set('filter', { key: 'weight', min: 5, max: 250, step: 5 });

            await render(TEMPLATE);

            findAll('input').forEach((input) => {
                assert.dom(input).hasAttribute('min', '5');
                assert.dom(input).hasAttribute('max', '250');
                assert.dom(input).hasAttribute('step', '5');
            });
        });

        test('a filter with no bounds falls back to nought and a hundred', async function (assert) {
            this.set('filter', { key: 'weight' });

            await render(TEMPLATE);

            assert.dom(MIN_NUMBER).hasValue('0');
            assert.dom(MAX_NUMBER).hasValue('100');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<Filter::Range @filter={{this.filter}} data-test-range="yes" />`);

            assert.dom('.filter-range').hasAttribute('data-test-range', 'yes');
        });
    });

    module('reading the incoming value', function () {
        test('a comma separated pair seeds both ends', async function (assert) {
            this.set('value', '20,80');

            await render(TEMPLATE);

            assert.dom(MIN_NUMBER).hasValue('20');
            assert.dom(MAX_NUMBER).hasValue('80');
            assert.dom(MIN_SLIDER).hasValue('20');
            assert.dom(MAX_SLIDER).hasValue('80');
        });

        test('surrounding whitespace and decimals are tolerated', async function (assert) {
            this.set('value', ' 12.5 , 87.5 ');

            await render(TEMPLATE);

            assert.dom(MIN_NUMBER).hasValue('12.5');
            assert.dom(MAX_NUMBER).hasValue('87.5');
        });

        test('an unparseable half falls back to that bound', async function (assert) {
            this.set('value', 'abc,80');

            await render(TEMPLATE);

            assert.dom(MIN_NUMBER).hasValue('0', 'the filter minimum is used');
            assert.dom(MAX_NUMBER).hasValue('80');
        });

        test('a value with no comma is ignored entirely', async function (assert) {
            this.set('value', '42');

            await render(TEMPLATE);

            assert.dom(MIN_NUMBER).hasValue('0');
            assert.dom(MAX_NUMBER).hasValue('100');
        });

        test('a non-string value is ignored entirely', async function (assert) {
            this.set('value', 42);

            await render(TEMPLATE);

            assert.dom(MIN_NUMBER).hasValue('0');
            assert.dom(MAX_NUMBER).hasValue('100');
        });
    });

    module('narrowing the range', function () {
        test('typing a minimum reports the pair', async function (assert) {
            await render(TEMPLATE);
            await fillIn(MIN_NUMBER, '25');

            assert.deepEqual(changes, [['weight', '25,100']]);
        });

        test('typing a maximum reports the pair', async function (assert) {
            await render(TEMPLATE);
            await fillIn(MAX_NUMBER, '75');

            assert.deepEqual(changes, [['weight', '0,75']]);
        });

        test('dragging the minimum slider reports the pair', async function (assert) {
            await render(TEMPLATE);
            await fillIn(MIN_SLIDER, '30');

            assert.deepEqual(changes, [['weight', '30,100']]);
        });

        test('dragging the maximum slider reports the pair', async function (assert) {
            await render(TEMPLATE);
            await fillIn(MAX_SLIDER, '60');

            assert.deepEqual(changes, [['weight', '0,60']]);
        });

        test('pushing the minimum past the maximum drags the maximum with it', async function (assert) {
            this.set('value', '10,50');

            await render(TEMPLATE);
            await fillIn(MIN_NUMBER, '70');

            assert.deepEqual(changes, [['weight', '70,70']], 'the range never inverts');
            assert.dom(MAX_NUMBER).hasValue('70');
        });

        test('pushing the maximum below the minimum drags the minimum with it', async function (assert) {
            this.set('value', '40,90');

            await render(TEMPLATE);
            await fillIn(MAX_NUMBER, '20');

            assert.deepEqual(changes, [['weight', '20,20']]);
            assert.dom(MIN_NUMBER).hasValue('20');
        });

        test('it narrows happily without an onChange handler', async function (assert) {
            await render(hbs`<Filter::Range @filter={{this.filter}} />`);
            await fillIn(MIN_NUMBER, '25');

            assert.dom(MIN_NUMBER).hasValue('25', 'the field still tracks the value');
        });
    });

    module('clearing', function () {
        test('clearing restores the filter bounds and reports it', async function (assert) {
            this.set('value', '20,80');

            await render(TEMPLATE);
            await click('.clear-button');

            assert.dom(MIN_NUMBER).hasValue('0');
            assert.dom(MAX_NUMBER).hasValue('100');
            assert.deepEqual(cleared, ['weight']);
        });

        test('clearing a filter with no bounds falls back to nought and a hundred', async function (assert) {
            this.set('filter', { key: 'weight' });
            this.set('value', '20,80');

            await render(TEMPLATE);
            await click('.clear-button');

            assert.dom(MIN_NUMBER).hasValue('0');
            assert.dom(MAX_NUMBER).hasValue('100');
        });

        test('an unparseable upper half falls back to the filter maximum', async function (assert) {
            this.set('value', '20,abc');

            await render(TEMPLATE);

            assert.dom(MIN_NUMBER).hasValue('20');
            assert.dom(MAX_NUMBER).hasValue('100', 'the filter maximum is used');
        });

        // Every use in range.hbs defends with `or @filter.min 0`, so the component has to stand up
        // without a @filter of its own too.
        test('it renders, changes and clears with no @filter at all', async function (assert) {
            await render(hbs`<Filter::Range @value={{this.value}} />`);

            assert.dom(MIN_NUMBER).hasValue('0', 'the bounds fall back to nought and a hundred');
            assert.dom(MAX_NUMBER).hasValue('100');

            await fillIn(MIN_NUMBER, '30');
            await fillIn(MAX_NUMBER, '70');

            assert.dom(MIN_NUMBER).hasValue('30', 'both changes land with nothing to report them to');
            assert.dom(MAX_NUMBER).hasValue('70');

            await click('.clear-button');

            assert.dom(MIN_NUMBER).hasValue('0', 'and clearing returns to the default bounds');
        });

        test('it clears happily without an onClear handler', async function (assert) {
            this.set('value', '20,80');

            await render(hbs`<Filter::Range @filter={{this.filter}} />`);
            await click('.clear-button');

            assert.dom(MIN_NUMBER).hasValue('0');
        });
    });
});
