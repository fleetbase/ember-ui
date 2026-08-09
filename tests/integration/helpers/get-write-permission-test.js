import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

class VehicleModel {
    constructor(props = {}) {
        Object.assign(this, props);
    }
}
VehicleModel.modelName = 'vehicle';

module('Integration | Helper | get-write-permission', function (hooks) {
    setupRenderingTest(hooks);

    test('a persisted record maps to an update permission', async function (assert) {
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`{{get-write-permission this.model}}`);

        assert.dom(this.element).hasText('fleet-ops update vehicle');
    });

    test('an unsaved record maps to a create permission', async function (assert) {
        this.set('model', new VehicleModel({ isNew: true }));

        await render(hbs`{{get-write-permission this.model}}`);

        assert.dom(this.element).hasText('fleet-ops create vehicle');
    });

    test('the schema defaults to fleet-ops and can be overridden positionally', async function (assert) {
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`{{get-write-permission this.model "telematics"}}`);

        assert.dom(this.element).hasText('telematics update vehicle');
    });

    test('a missing isNew flag is treated as persisted', async function (assert) {
        this.set('model', new VehicleModel());

        await render(hbs`{{get-write-permission this.model}}`);

        assert.dom(this.element).hasText('fleet-ops update vehicle');
    });

    test('it falls back to the legacy _internalModel model name', async function (assert) {
        this.set('model', { isNew: true, _internalModel: { modelName: 'legacy-thing' } });

        await render(hbs`{{get-write-permission this.model}}`);

        assert.dom(this.element).hasText('fleet-ops create legacy-thing');
    });

    test('the model name is not transformed', async function (assert) {
        class ApiCredentialModel {}
        ApiCredentialModel.modelName = 'apiCredential';
        this.set('model', new ApiCredentialModel());

        await render(hbs`{{get-write-permission this.model}}`);

        assert.dom(this.element).hasText('fleet-ops update apiCredential', 'the raw model name is interpolated as-is');
    });

    test('it recomputes when the record transitions from new to persisted', async function (assert) {
        this.set('model', new VehicleModel({ isNew: true }));

        await render(hbs`{{get-write-permission this.model}}`);
        assert.dom(this.element).hasText('fleet-ops create vehicle');

        this.set('model', new VehicleModel({ isNew: false }));
        await settled();

        assert.dom(this.element).hasText('fleet-ops update vehicle');
    });
});
