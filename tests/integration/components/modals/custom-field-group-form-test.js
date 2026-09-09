import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/custom-field-group-form', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Modals::CustomFieldGroupForm @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it offers a name field seeded from the group', async function (assert) {
        this.set('options', { customFieldGroup: { name: 'Delivery details' } });

        await render(TEMPLATE);

        assert.dom(this.element).containsText('Field Group Name');
        assert.dom('input').hasValue('Delivery details');
    });

    test('typing writes the name back onto the group record', async function (assert) {
        const customFieldGroup = { name: '' };
        this.set('options', { customFieldGroup });

        await render(TEMPLATE);
        await fillIn('input', 'Pickup details');

        assert.strictEqual(customFieldGroup.name, 'Pickup details');
    });

    test('it renders for a brand new group', async function (assert) {
        this.set('options', { customFieldGroup: {} });

        await render(TEMPLATE);

        assert.ok(find('input'), 'an empty field is offered');
        assert.dom('input').hasValue('');
    });
});
