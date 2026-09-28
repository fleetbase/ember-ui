import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import ObjectProxy from '@ember/object/proxy';
import EmberObject from '@ember/object';

// Resolved through the module loader so the test file does not need a build-time
// dependency on ember-data, which the helper only reaches through @fleetbase/ember-core.
function getModelClass() {
    return require('@ember-data/model').default;
}

module('Integration | Helper | is-model', function (hooks) {
    setupRenderingTest(hooks);

    test('it is true for an ember-data model instance', async function (assert) {
        const Model = getModelClass();
        this.set('subject', Object.create(Model.prototype));

        await render(hbs`{{is-model this.subject}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is true for an ObjectProxy', async function (assert) {
        this.set('subject', ObjectProxy.create({ content: { name: 'Order' } }));

        await render(hbs`{{is-model this.subject}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is false for a plain object that merely looks like a model', async function (assert) {
        this.set('subject', { id: '1', hasDirtyAttributes: false, save() {} });

        await render(hbs`{{is-model this.subject}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false for a plain EmberObject', async function (assert) {
        this.set('subject', EmberObject.create({ id: '1' }));

        await render(hbs`{{is-model this.subject}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false for null', async function (assert) {
        this.set('subject', null);

        await render(hbs`{{is-model this.subject}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false for undefined', async function (assert) {
        await render(hbs`{{is-model this.missing}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false for primitives and arrays', async function (assert) {
        this.set('subjects', ['order', 0, false, [], {}]);

        await render(hbs`
            {{#each this.subjects as |subject|}}
                <span class="result">{{is-model subject}}</span>
            {{/each}}
        `);

        assert.dom(this.element).hasText('false false false false false');
    });
});
