import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

class StubAbilities extends Service {
    checks = [];
    allowed = true;

    can(permission, subject) {
        this.checks.push({ permission, subject });
        return this.allowed;
    }
}

class VehicleModel {
    static modelName = 'vehicle';

    constructor(props = {}) {
        Object.assign(this, props);
    }
}

function useStubAbilities(context) {
    context.owner.register('service:abilities', StubAbilities);
    return context.owner.lookup('service:abilities');
}

module('Integration | Helper | can-delete', function (hooks) {
    setupRenderingTest(hooks);

    test('it builds a delete permission from the model name', async function (assert) {
        const abilities = useStubAbilities(this);
        const model = new VehicleModel({ isNew: false });
        this.set('model', model);

        await render(hbs`{{can-delete this.model}}`);

        assert.dom(this.element).hasText('true');
        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops delete vehicle');
        assert.strictEqual(abilities.checks[0].subject, model);
    });

    test('the delete action does not depend on isNew', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', new VehicleModel({ isNew: true }));

        await render(hbs`{{can-delete this.model}}`);

        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops delete vehicle', 'unsaved records still use the delete action');
    });

    test('a positional resource string works without any subject', async function (assert) {
        const abilities = useStubAbilities(this);

        await render(hbs`{{can-delete "integrated-vendor"}}`);

        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops delete integrated-vendor');
        assert.dom(this.element).hasText('true');
    });

    test('the resource named argument overrides the model name', async function (assert) {
        const abilities = useStubAbilities(this);
        const model = new VehicleModel({ isNew: false });
        this.set('model', model);

        await render(hbs`{{can-delete this.model resource="fuel-report"}}`);

        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops delete fuel-report');
        assert.strictEqual(abilities.checks[0].subject, model, 'the original model is still passed as the subject');
    });

    test('the schema named argument replaces the default prefix', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`{{can-delete this.model schema="storefront"}}`);

        assert.strictEqual(abilities.checks[0].permission, 'storefront delete vehicle');
    });

    test('it renders false when the abilities service denies', async function (assert) {
        const abilities = useStubAbilities(this);
        abilities.allowed = false;
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`{{can-delete this.model}}`);

        assert.dom(this.element).hasText('false');
    });

    test('a model without a resolvable name denies and skips the check', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', { id: 1 });

        await render(hbs`{{can-delete this.model}}`);

        assert.dom(this.element).hasText('false');
        assert.strictEqual(abilities.checks.length, 0);
    });

    test('defaultWhenUnknown is used when no resource can be resolved', async function (assert) {
        useStubAbilities(this);
        this.set('model', { id: 1 });

        await render(hbs`{{can-delete this.model defaultWhenUnknown=true}}`);

        assert.dom(this.element).hasText('true');
    });

    test('an abilities service without can() or cannot() denies', async function (assert) {
        this.owner.register('service:abilities', class extends Service {});
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`{{can-delete this.model}}`);

        assert.dom(this.element).hasText('false', 'an unusable abilities service never grants permission');
    });
});
