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

class OrderModel {
    static modelName = 'order';

    constructor(props = {}) {
        Object.assign(this, props);
    }
}

function useStubAbilities(context) {
    context.owner.register('service:abilities', StubAbilities);
    return context.owner.lookup('service:abilities');
}

module('Integration | Helper | can-action', function (hooks) {
    setupRenderingTest(hooks);

    test('it composes schema, action and model name into the permission', async function (assert) {
        const abilities = useStubAbilities(this);
        const model = new OrderModel({ isNew: false });
        this.set('model', model);

        await render(hbs`{{can-action "approve" this.model}}`);

        assert.dom(this.element).hasText('true');
        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops approve order');
        assert.strictEqual(abilities.checks[0].subject, model);
    });

    test('the second positional argument may be a resource string', async function (assert) {
        const abilities = useStubAbilities(this);

        await render(hbs`{{can-action "archive" "IntegratedVendor"}}`);

        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops archive integrated-vendor');
    });

    test('resource and subject may be supplied as named arguments', async function (assert) {
        const abilities = useStubAbilities(this);
        const model = new OrderModel({ isNew: false });
        this.set('model', model);

        await render(hbs`{{can-action "archive" resource="integrated-vendor" subject=this.model}}`);

        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops archive integrated-vendor');
        assert.strictEqual(abilities.checks[0].subject, model, 'the named subject is used for the policy check');
    });

    test('the named resource wins over the model name', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', new OrderModel({ isNew: false }));

        await render(hbs`{{can-action "approve" this.model resource="fuel-report"}}`);

        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops approve fuel-report');
    });

    test('the schema named argument replaces the default prefix', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', new OrderModel({ isNew: false }));

        await render(hbs`{{can-action "approve" this.model schema="telematics"}}`);

        assert.strictEqual(abilities.checks[0].permission, 'telematics approve order');
    });

    test('a missing action denies without consulting the abilities service', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('noAction', null);
        this.set('model', new OrderModel({ isNew: false }));

        await render(hbs`{{can-action this.noAction this.model}}`);

        assert.dom(this.element).hasText('false', 'a custom check requires an explicit action');
        assert.strictEqual(abilities.checks.length, 0);
    });

    test('defaultWhenUnknown applies when the action is missing', async function (assert) {
        useStubAbilities(this);
        this.set('noAction', undefined);
        this.set('model', new OrderModel({ isNew: false }));

        await render(hbs`{{can-action this.noAction this.model defaultWhenUnknown=true}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it renders false when the abilities service denies', async function (assert) {
        const abilities = useStubAbilities(this);
        abilities.allowed = false;
        this.set('model', new OrderModel({ isNew: false }));

        await render(hbs`{{can-action "approve" this.model}}`);

        assert.dom(this.element).hasText('false');
    });

    test('multi-word actions are passed through verbatim', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', new OrderModel({ isNew: false }));

        await render(hbs`{{can-action "cancel-and-refund" this.model}}`);

        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops cancel-and-refund order');
    });
});
