import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { Ability } from 'ember-can';

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

class FuelReportModel {
    static modelName = 'fuelReport';

    constructor(props = {}) {
        Object.assign(this, props);
    }
}

function useStubAbilities(context) {
    context.owner.register('service:abilities', StubAbilities);
    return context.owner.lookup('service:abilities');
}

module('Integration | Helper | can-write', function (hooks) {
    setupRenderingTest(hooks);

    test('a persisted record is checked against an "update" permission', async function (assert) {
        const abilities = useStubAbilities(this);
        const model = new VehicleModel({ isNew: false });
        this.set('model', model);

        await render(hbs`{{can-write this.model}}`);

        assert.dom(this.element).hasText('true');
        assert.strictEqual(abilities.checks.length, 1, 'the abilities service is consulted exactly once');
        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops update vehicle');
        assert.strictEqual(abilities.checks[0].subject, model, 'the model is forwarded as the ability subject');
    });

    test('an unsaved record is checked against a "create" permission', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', new VehicleModel({ isNew: true }));

        await render(hbs`{{can-write this.model}}`);

        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops create vehicle');
    });

    test('the schema named argument replaces the default fleet-ops prefix', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`{{can-write this.model schema="telematics"}}`);

        assert.strictEqual(abilities.checks[0].permission, 'telematics update vehicle');
    });

    test('a camelCased model name is dasherized into the permission string', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', new FuelReportModel({ isNew: false }));

        await render(hbs`{{can-write this.model}}`);

        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops update fuel-report');
    });

    test('a positional resource string is dasherized and the subject supplies isNew', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', new VehicleModel({ isNew: true }));

        await render(hbs`{{can-write "IntegratedVendor" subject=this.model}}`);

        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops create integrated-vendor');
    });

    test('it renders false when the abilities service denies the permission', async function (assert) {
        const abilities = useStubAbilities(this);
        abilities.allowed = false;
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`{{can-write this.model}}`);

        assert.dom(this.element).hasText('false');
    });

    test('an unresolvable action denies without consulting the abilities service', async function (assert) {
        const abilities = useStubAbilities(this);

        await render(hbs`{{can-write "integrated-vendor"}}`);

        assert.dom(this.element).hasText('false', 'isNew cannot be inferred without a subject');
        assert.strictEqual(abilities.checks.length, 0, 'no permission check is attempted');
    });

    test('defaultWhenUnknown controls the result when the permission cannot be built', async function (assert) {
        useStubAbilities(this);

        await render(hbs`{{can-write "integrated-vendor" defaultWhenUnknown=true}}`);

        assert.dom(this.element).hasText('true');
    });

    test('a missing resource denies even when the action is known', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', { isNew: false });

        await render(hbs`{{can-write this.model}}`);

        assert.dom(this.element).hasText('false', 'a plain object has no model name to build a resource from');
        assert.strictEqual(abilities.checks.length, 0);
    });

    test('an abilities service that only exposes cannot() is inverted correctly', async function (assert) {
        const asked = [];
        this.owner.register(
            'service:abilities',
            class extends Service {
                cannot(permission) {
                    asked.push(permission);
                    return true;
                }
            }
        );
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`{{can-write this.model}}`);

        assert.deepEqual(asked, ['fleet-ops update vehicle']);
        assert.dom(this.element).hasText('false', 'cannot() === true means the write is not allowed');
    });

    test('it works end to end against a real ember-can ability', async function (assert) {
        this.owner.register(
            'ability:vehicle',
            class extends Ability {
                get canFleetOpsUpdate() {
                    return true;
                }

                get canFleetOpsCreate() {
                    return false;
                }
            }
        );

        this.set('persisted', new VehicleModel({ isNew: false }));
        this.set('unsaved', new VehicleModel({ isNew: true }));

        await render(hbs`<span id="update">{{can-write this.persisted}}</span><span id="create">{{can-write this.unsaved}}</span>`);

        assert.dom('#update').hasText('true');
        assert.dom('#create').hasText('false');
    });
});
