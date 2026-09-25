import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';

module('Integration | Component | modals/resource', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('component:test-resource-body', setComponentTemplate(hbs`<div class="resource-body">{{@resource.name}}</div>`, templateOnly()));
    });

    const TEMPLATE = hbs`<Modals::Resource @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it renders the component named by options.render with the resource', async function (assert) {
        this.set('options', { render: 'test-resource-body', resource: { name: 'Order 123' } });

        await render(TEMPLATE);

        assert.dom('.resource-body').hasText('Order 123');
    });

    test('options.component is accepted as an alternative', async function (assert) {
        this.set('options', { component: 'test-resource-body', resource: { name: 'Order 456' } });

        await render(TEMPLATE);

        assert.dom('.resource-body').hasText('Order 456');
    });

    test('render wins when both are supplied', async function (assert) {
        this.owner.register('component:other-body', setComponentTemplate(hbs`<div class="other-body">other</div>`, templateOnly()));
        this.set('options', { render: 'test-resource-body', component: 'other-body', resource: { name: 'Order 789' } });

        await render(TEMPLATE);

        assert.dom('.resource-body').exists();
        assert.dom('.other-body').doesNotExist();
    });

    test('with neither it renders an empty body', async function (assert) {
        this.set('options', { resource: { name: 'Order 123' } });

        await render(TEMPLATE);

        assert.dom('.resource-body').doesNotExist();
        assert.dom(this.element).doesNotContainText('Order 123');
    });

    test('a wrapper class from the options is applied', async function (assert) {
        this.set('options', { render: 'test-resource-body', wrapperClass: 'my-wrapper', resource: {} });

        await render(TEMPLATE);

        assert.dom('.my-wrapper').exists();
    });
});
