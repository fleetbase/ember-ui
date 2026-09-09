import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, triggerKeyEvent } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const NEW_TAG_INPUT = '.js-ember-tag-input-new';
const ENTER = 13;

function tagLabels() {
    return findAll('.emberTagInput-tag').map((tag) => tag.textContent.trim());
}

async function typeTag(text) {
    await fillIn(NEW_TAG_INPUT, text);
    await triggerKeyEvent(NEW_TAG_INPUT, 'keydown', ENTER);
}

module('Integration | Component | filter/multi-input', function (hooks) {
    setupRenderingTest(hooks);

    let changes;
    let cleared;

    hooks.beforeEach(function () {
        changes = [];
        cleared = [];
        this.set('filter', { key: 'status' });
        this.set('onChange', (filter, value) => changes.push([filter.key, value]));
        this.set('onClear', (filter) => cleared.push(filter.key));
    });

    const TEMPLATE = hbs`<Filter::MultiInput @filter={{this.filter}} @value={{this.value}} @placeholder={{this.placeholder}} @onChange={{this.onChange}} @onClear={{this.onClear}} />`;

    module('rendering', function () {
        test('it renders an empty tag field with a default prompt', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.filter-multi-input').exists();
            assert.dom(NEW_TAG_INPUT).hasAttribute('placeholder', 'Add values...');
            assert.deepEqual(tagLabels(), [], 'nothing is selected yet');
        });

        test('the prompt can be replaced', async function (assert) {
            this.set('placeholder', 'Pick a status');

            await render(TEMPLATE);

            assert.dom(NEW_TAG_INPUT).hasAttribute('placeholder', 'Pick a status');
        });

        test('clearing is refused while nothing is selected', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.clear-button').isDisabled();
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<Filter::MultiInput @filter={{this.filter}} data-test-multi="yes" />`);

            assert.dom('.filter-multi-input').hasAttribute('data-test-multi', 'yes');
        });
    });

    module('reading the incoming value', function () {
        test('a list of values seeds the tags', async function (assert) {
            this.set('value', ['open', 'closed']);

            await render(TEMPLATE);

            assert.deepEqual(tagLabels(), ['open', 'closed']);
        });

        test('a comma separated string is split apart and trimmed', async function (assert) {
            this.set('value', 'open, closed , pending');

            await render(TEMPLATE);

            assert.deepEqual(tagLabels(), ['open', 'closed', 'pending']);
        });

        test('empty segments are dropped', async function (assert) {
            this.set('value', 'open,,closed,');

            await render(TEMPLATE);

            assert.deepEqual(tagLabels(), ['open', 'closed']);
        });

        test('a lone value becomes a single tag', async function (assert) {
            this.set('value', 'open');

            await render(TEMPLATE);

            assert.deepEqual(tagLabels(), ['open']);
        });

        test('a blank value selects nothing', async function (assert) {
            this.set('value', '');

            await render(TEMPLATE);

            assert.deepEqual(tagLabels(), []);
        });
    });

    module('choosing values', function () {
        test('typing a value adds it and reports the joined list', async function (assert) {
            await render(TEMPLATE);
            await typeTag('open');

            assert.deepEqual(tagLabels(), ['open']);
            assert.deepEqual(changes, [['status', 'open']]);
        });

        test('values accumulate', async function (assert) {
            await render(TEMPLATE);
            await typeTag('open');
            await typeTag('closed');

            assert.deepEqual(tagLabels(), ['open', 'closed']);
            assert.deepEqual(changes, [
                ['status', 'open'],
                ['status', 'open,closed'],
            ]);
        });

        test('a value containing spaces is kept whole', async function (assert) {
            await render(TEMPLATE);
            await typeTag('in transit');

            assert.deepEqual(tagLabels(), ['in transit']);
        });

        test('a value can be removed again', async function (assert) {
            this.set('value', ['open', 'closed', 'pending']);

            await render(TEMPLATE);
            await click(findAll('.emberTagInput-remove')[1]);

            assert.deepEqual(tagLabels(), ['open', 'pending']);
            assert.deepEqual(changes, [['status', 'open,pending']]);
        });

        test('removing the last value reports an empty list', async function (assert) {
            this.set('value', ['open']);

            await render(TEMPLATE);
            await click('.emberTagInput-remove');

            assert.deepEqual(tagLabels(), []);
            assert.deepEqual(changes, [['status', '']]);
        });

        test('it adds and removes happily without an onChange handler', async function (assert) {
            await render(hbs`<Filter::MultiInput @filter={{this.filter}} />`);
            await typeTag('open');

            assert.deepEqual(tagLabels(), ['open']);

            await click('.emberTagInput-remove');
            assert.deepEqual(tagLabels(), []);
        });
    });

    module('clearing', function () {
        test('clearing drops every value and reports it', async function (assert) {
            this.set('value', ['open', 'closed']);

            await render(TEMPLATE);
            await click('.clear-button');

            assert.deepEqual(tagLabels(), []);
            assert.deepEqual(cleared, ['status']);
            assert.dom('.clear-button').isDisabled('and clearing is refused again');
        });

        test('it clears happily without an onClear handler', async function (assert) {
            this.set('value', ['open']);

            await render(hbs`<Filter::MultiInput @filter={{this.filter}} @value={{this.value}} />`);
            await click('.clear-button');

            assert.deepEqual(tagLabels(), []);
        });
    });
});
