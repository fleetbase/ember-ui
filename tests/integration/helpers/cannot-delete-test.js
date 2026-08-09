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

module('Integration | Helper | cannot-delete', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders false when the delete permission is granted', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`{{cannot-delete this.model}}`);

        assert.dom(this.element).hasText('false');
        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops delete vehicle');
    });

    test('it renders true when the delete permission is denied', async function (assert) {
        const abilities = useStubAbilities(this);
        abilities.allowed = false;
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`{{cannot-delete this.model}}`);

        assert.dom(this.element).hasText('true');
    });

    test('a positional resource string is dasherized', async function (assert) {
        const abilities = useStubAbilities(this);
        abilities.allowed = false;

        await render(hbs`{{cannot-delete "IntegratedVendor"}}`);

        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops delete integrated-vendor');
        assert.dom(this.element).hasText('true');
    });

    test('an unresolvable resource renders true by default', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', {});

        await render(hbs`{{cannot-delete this.model}}`);

        assert.dom(this.element).hasText('true');
        assert.strictEqual(abilities.checks.length, 0);
    });

    test('defaultWhenUnknown=true flips the unresolvable case to false', async function (assert) {
        useStubAbilities(this);
        this.set('model', {});

        await render(hbs`{{cannot-delete this.model defaultWhenUnknown=true}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is the exact inverse of can-delete for the same input', async function (assert) {
        const abilities = useStubAbilities(this);
        abilities.allowed = false;
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`<span id="can">{{can-delete this.model}}</span><span id="cannot">{{cannot-delete this.model}}</span>`);

        assert.dom('#can').hasText('false');
        assert.dom('#cannot').hasText('true');
    });
});
