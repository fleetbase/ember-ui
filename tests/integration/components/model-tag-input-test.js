import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, triggerKeyEvent } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import EmberObject from '@ember/object';
import { A } from '@ember/array';

const NEW_TAG_INPUT = '.js-ember-tag-input-new';
const ENTER = 13;

function tagLabels() {
    return findAll('.emberTagInput-tag').map((tag) => tag.textContent.trim());
}

async function typeTag(text) {
    await fillIn(NEW_TAG_INPUT, text);
    await triggerKeyEvent(NEW_TAG_INPUT, 'keydown', ENTER);
}

module('Integration | Component | model-tag-input', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // The component writes through `model.set(...)` and `pushObject`, so the record must
        // be a real Ember object holding a real Ember array.
        this.set('model', EmberObject.create({ tags: A(['urgent', 'fragile']) }));
    });

    // The component renders each tag through `{{yield tag}}`, so a block is required for the
    // tag text to appear at all.
    const TEMPLATE = hbs`
        <ModelTagInput @model={{this.model}} @attr={{this.attr}} @placeholder={{this.placeholder}} @disabled={{this.disabled}} as |tag|>{{tag}}</ModelTagInput>
    `;

    module('rendering', function () {
        test('it lists the tags already on the record', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(tagLabels(), ['urgent', 'fragile']);
        });

        test('a record with no tags renders an empty field', async function (assert) {
            this.set('model', EmberObject.create({}));

            await render(TEMPLATE);

            assert.deepEqual(tagLabels(), []);
            assert.dom(NEW_TAG_INPUT).exists('a tag can still be typed');
        });

        test('a different attribute can be tagged', async function (assert) {
            this.set('model', EmberObject.create({ labels: A(['red']) }));
            this.set('attr', 'labels');

            await render(TEMPLATE);

            assert.deepEqual(tagLabels(), ['red']);
        });

        test('a placeholder can be supplied', async function (assert) {
            this.set('placeholder', 'Add a tag');

            await render(TEMPLATE);

            assert.dom(NEW_TAG_INPUT).hasAttribute('placeholder', 'Add a tag');
        });

        test('a disabled field cannot be edited', async function (assert) {
            this.set('disabled', true);

            await render(TEMPLATE);

            assert.dom(NEW_TAG_INPUT).isDisabled();
            assert.dom('.emberTagInput').hasClass('emberTagInput--readOnly');
        });

        test('without a block each tag renders its own text', async function (assert) {
            await render(hbs`<ModelTagInput @model={{this.model}} />`);

            assert.strictEqual(findAll('.emberTagInput-tag').length, 2, 'both chips are rendered');
            assert.deepEqual(tagLabels(), ['urgent', 'fragile'], 'and both are labelled');
        });

        test('a block renders each tag itself', async function (assert) {
            await render(hbs`<ModelTagInput @model={{this.model}} as |tag|><span class="tag-label">#{{tag}}</span></ModelTagInput>`);

            assert.deepEqual(
                findAll('.tag-label').map((label) => label.textContent.trim()),
                ['#urgent', '#fragile']
            );
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<ModelTagInput @model={{this.model}} data-test-tags="yes" />`);

            assert.dom('[data-test-tags="yes"]').exists();
        });
    });

    module('editing the record', function () {
        test('adding a tag writes it onto the record', async function (assert) {
            await render(TEMPLATE);
            await typeTag('heavy');

            assert.deepEqual(this.model.tags.slice(), ['urgent', 'fragile', 'heavy']);
            assert.deepEqual(tagLabels(), ['urgent', 'fragile', 'heavy']);
        });

        test('the first tag on a record with no tags attribute is written', async function (assert) {
            this.set('model', EmberObject.create({}));

            await render(TEMPLATE);
            await typeTag('urgent');

            assert.deepEqual(this.model.tags.slice(), ['urgent']);
            assert.deepEqual(tagLabels(), ['urgent']);
        });

        test('a non-array attribute value is replaced rather than pushed onto', async function (assert) {
            this.set('model', EmberObject.create({ tags: 'not-an-array' }));

            await render(TEMPLATE);
            await typeTag('urgent');

            assert.deepEqual(this.model.tags.slice(), ['urgent'], 'the bad value is discarded');
        });

        test('a record holding a plain array still accepts a tag', async function (assert) {
            this.set('model', EmberObject.create({ tags: ['urgent'] }));

            await render(TEMPLATE);
            await typeTag('fragile');

            assert.deepEqual(this.model.tags.slice(), ['urgent', 'fragile']);
        });

        test('a tag containing spaces is kept whole', async function (assert) {
            await render(TEMPLATE);
            await typeTag('handle with care');

            assert.deepEqual(this.model.tags.slice(), ['urgent', 'fragile', 'handle with care']);
        });

        test('removing a tag takes it off the record', async function (assert) {
            await render(TEMPLATE);
            await click(findAll('.emberTagInput-remove')[0]);

            assert.deepEqual(this.model.tags.slice(), ['fragile']);
            assert.deepEqual(tagLabels(), ['fragile']);
        });

        test('a different attribute is edited in place', async function (assert) {
            this.set('model', EmberObject.create({ labels: A(['red']) }));
            this.set('attr', 'labels');

            await render(TEMPLATE);
            await typeTag('blue');

            assert.deepEqual(this.model.labels.slice(), ['red', 'blue']);
        });
    });
});
