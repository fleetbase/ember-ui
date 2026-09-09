import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { tracked } from '@glimmer/tracking';

class FakeRecord {
    @tracked hasDirtyAttributes = false;
}

module('Integration | Helper | resource-context-panel-save-disabled', function (hooks) {
    setupRenderingTest(hooks);

    test('an explicit saveDisabled true wins over everything else', async function (assert) {
        this.set('overlay', { saveDisabled: true, model: { hasDirtyAttributes: true } });

        await render(hbs`{{resource-context-panel-save-disabled this.overlay}}`);

        assert.dom(this.element).hasText('true');
    });

    test('an explicit saveDisabled false wins over a pristine model', async function (assert) {
        this.set('overlay', { saveDisabled: false, model: { hasDirtyAttributes: false } });

        await render(hbs`{{resource-context-panel-save-disabled this.overlay}}`);

        assert.dom(this.element).hasText('false');
    });

    test('a pristine ember data style model disables saving', async function (assert) {
        this.set('overlay', { model: { hasDirtyAttributes: false } });

        await render(hbs`{{resource-context-panel-save-disabled this.overlay}}`);

        assert.dom(this.element).hasText('true');
    });

    test('a dirty ember data style model enables saving', async function (assert) {
        this.set('overlay', { model: { hasDirtyAttributes: true } });

        await render(hbs`{{resource-context-panel-save-disabled this.overlay}}`);

        assert.dom(this.element).hasText('false');
    });

    test('a plain object model is always saveable', async function (assert) {
        this.set('overlay', { model: { name: 'Fleetbase' } });

        await render(hbs`{{resource-context-panel-save-disabled this.overlay}}`);

        assert.dom(this.element).hasText('false');
    });

    test('a model with a non boolean hasDirtyAttributes is treated as a plain object', async function (assert) {
        this.set('overlay', { model: { hasDirtyAttributes: 'yes' } });

        await render(hbs`{{resource-context-panel-save-disabled this.overlay}}`);

        assert.dom(this.element).hasText('false');
    });

    test('a missing overlay, model or null model is saveable', async function (assert) {
        this.set('nullOverlay', null);
        this.set('emptyOverlay', {});
        this.set('nullModel', { model: null });

        await render(
            hbs`{{resource-context-panel-save-disabled this.nullOverlay}}|{{resource-context-panel-save-disabled this.missing}}|{{resource-context-panel-save-disabled this.emptyOverlay}}|{{resource-context-panel-save-disabled this.nullModel}}`
        );

        assert.dom(this.element).hasText('false|false|false|false');
    });

    test('a truthy but non boolean saveDisabled falls through to the model check', async function (assert) {
        this.set('overlay', { saveDisabled: 'yes', model: { hasDirtyAttributes: false } });

        await render(hbs`{{resource-context-panel-save-disabled this.overlay}}`);

        assert.dom(this.element).hasText('true');
    });

    test('a falsy but non boolean saveDisabled falls through to the model check', async function (assert) {
        this.set('overlay', { saveDisabled: 0, model: { hasDirtyAttributes: true } });

        await render(hbs`{{resource-context-panel-save-disabled this.overlay}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it recomputes when the model becomes dirty', async function (assert) {
        const model = new FakeRecord();
        this.set('overlay', { model });

        await render(hbs`
            <button type="button" class="save" disabled={{resource-context-panel-save-disabled this.overlay}}>Save</button>
        `);

        assert.dom('.save').isDisabled('a pristine model leaves the save button disabled');

        model.hasDirtyAttributes = true;
        await settled();

        assert.dom('.save').isNotDisabled('an edited model enables the save button');
    });
});
