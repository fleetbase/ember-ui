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

module('Integration | Helper | cannot-action', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders false when the action is permitted', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('model', new OrderModel({ isNew: false }));

        await render(hbs`{{cannot-action "approve" this.model}}`);

        assert.dom(this.element).hasText('false');
        assert.strictEqual(abilities.checks[0].permission, 'fleet-ops approve order');
    });

    test('it renders true when the action is denied', async function (assert) {
        const abilities = useStubAbilities(this);
        abilities.allowed = false;
        this.set('model', new OrderModel({ isNew: false }));

        await render(hbs`{{cannot-action "approve" this.model}}`);

        assert.dom(this.element).hasText('true');
    });

    test('named resource and subject are honoured', async function (assert) {
        const abilities = useStubAbilities(this);
        const model = new OrderModel({ isNew: false });
        this.set('model', model);
        abilities.allowed = false;

        await render(hbs`{{cannot-action "archive" resource="IntegratedVendor" subject=this.model schema="storefront"}}`);

        assert.strictEqual(abilities.checks[0].permission, 'storefront archive integrated-vendor');
        assert.strictEqual(abilities.checks[0].subject, model);
        assert.dom(this.element).hasText('true');
    });

    test('a missing action renders true by default', async function (assert) {
        const abilities = useStubAbilities(this);
        this.set('noAction', null);
        this.set('model', new OrderModel({ isNew: false }));

        await render(hbs`{{cannot-action this.noAction this.model}}`);

        assert.dom(this.element).hasText('true');
        assert.strictEqual(abilities.checks.length, 0);
    });

    test('defaultWhenUnknown=true flips the missing action case to false', async function (assert) {
        useStubAbilities(this);
        this.set('noAction', null);
        this.set('model', new OrderModel({ isNew: false }));

        await render(hbs`{{cannot-action this.noAction this.model defaultWhenUnknown=true}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is the exact inverse of can-action for the same input', async function (assert) {
        useStubAbilities(this);
        this.set('model', new OrderModel({ isNew: false }));

        await render(hbs`<span id="can">{{can-action "approve" this.model}}</span><span id="cannot">{{cannot-action "approve" this.model}}</span>`);

        assert.dom('#can').hasText('true');
        assert.dom('#cannot').hasText('false');
    });
    test('a string second argument is treated as the resource, not the model', async function (assert) {
        const abilities = useStubAbilities(this);
        abilities.allowed = false;

        await render(hbs`{{if (cannot-action "archive" "integrated-vendor") "denied" "allowed"}}`);

        assert.dom(this.element).hasText('denied');
        assert.true(
            abilities.checks.some((check) => check.permission.includes('integrated-vendor')),
            `the string is used as the resource (${JSON.stringify(abilities.checks)})`
        );
    });
});
