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

module('Integration | Helper | cannot-write', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders false when the write permission is granted', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`{{cannot-write this.model}}`);

        assert.dom(this.element).hasText('false');
        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops update vehicle');
    });

    test('it renders true when the write permission is denied', async function (assert) {
        const abilities = useStubAbilities(this);
        abilities.allowed = false;
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`{{cannot-write this.model}}`);

        assert.dom(this.element).hasText('true');
    });

    test('an unsaved record is checked against a create permission', async function (assert) {
        const abilities = useStubAbilities(this);
        abilities.allowed = false;
        this.set('model', new VehicleModel({ isNew: true }));

        await render(hbs`{{cannot-write this.model schema="storefront"}}`);

        assert.strictEqual(abilities.checks[0].permission, 'storefront create vehicle');
        assert.dom(this.element).hasText('true');
    });

    test('an unresolvable permission renders true by default', async function (assert) {
        const abilities = useStubAbilities(this);

        await render(hbs`{{cannot-write "integrated-vendor"}}`);

        assert.dom(this.element).hasText('true', 'unknown permissions are treated as not allowed, so cannot-write is true');
        assert.strictEqual(abilities.checks.length, 0);
    });

    test('defaultWhenUnknown=true flips the unresolvable case to false', async function (assert) {
        useStubAbilities(this);

        await render(hbs`{{cannot-write "integrated-vendor" defaultWhenUnknown=true}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is the exact inverse of can-write for the same input', async function (assert) {
        useStubAbilities(this);
        this.set('model', new VehicleModel({ isNew: false }));

        await render(hbs`<span id="can">{{can-write this.model}}</span><span id="cannot">{{cannot-write this.model}}</span>`);

        assert.dom('#can').hasText('true');
        assert.dom('#cannot').hasText('false');
    });
});
