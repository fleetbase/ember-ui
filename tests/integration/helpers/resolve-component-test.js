import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { helper } from '@ember/component/helper';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';
import { ExtensionComponent } from '@fleetbase/ember-core/contracts';

function registerCapture(owner, sink) {
    owner.register(
        'helper:capture-value',
        helper(function ([value]) {
            sink.push(value);
            return '';
        })
    );
}

module('Integration | Helper | resolve-component', function (hooks) {
    setupRenderingTest(hooks);

    test('it builds an ExtensionComponent from the extension component string form', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('value', '#extension-component:@fleetbase/fleetops-engine:components/admin/navigator-app');

        await render(hbs`{{capture-value (resolve-component this.value)}}`);

        const resolved = captured[0];
        assert.true(resolved instanceof ExtensionComponent, 'an ExtensionComponent contract is returned');
        assert.strictEqual(resolved.engine, '@fleetbase/fleetops-engine', 'the engine name is parsed from the string');
        assert.strictEqual(resolved.path, 'components/admin/navigator-app', 'the component path is parsed from the string');
    });

    test('it passes an ordinary component name string through untouched', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('value', 'ui-button');

        await render(hbs`{{capture-value (resolve-component this.value)}}`);

        assert.strictEqual(captured[0], 'ui-button', 'the resolver is left to handle plain names');
    });

    test('it returns an extension component definition object as is', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        const definition = { engine: '@fleetbase/storefront-engine', path: 'components/product-card' };
        this.set('value', definition);

        await render(hbs`{{capture-value (resolve-component this.value)}}`);

        assert.strictEqual(captured[0], definition, 'the lazy loading definition is preserved by identity');
    });

    test('it unwraps a nested component property', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('value', { component: 'ui-button', someOtherOption: true });

        await render(hbs`{{capture-value (resolve-component this.value)}}`);

        assert.strictEqual(captured[0], 'ui-button', 'the inner component definition is resolved');
    });

    test('it recurses through a component property holding the extension string form', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('value', { component: '#extension-component:@fleetbase/pallet-engine:components/inventory' });

        await render(hbs`{{capture-value (resolve-component this.value)}}`);

        assert.true(captured[0] instanceof ExtensionComponent, 'the nested string form is resolved recursively');
        assert.strictEqual(captured[0].engine, '@fleetbase/pallet-engine');
        assert.strictEqual(captured[0].path, 'components/inventory');
    });

    test('it returns null for values that cannot be rendered', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('nullValue', null);
        this.set('number', 42);
        this.set('bool', false);

        await render(
            hbs`{{capture-value (resolve-component this.nullValue)}}{{capture-value (resolve-component this.missing)}}{{capture-value (resolve-component this.number)}}{{capture-value (resolve-component this.bool)}}`
        );

        assert.deepEqual(captured, [null, null, null, null], 'null, undefined, numbers and booleans are not renderable');
    });

    test('it returns a component class that can be invoked in a template', async function (assert) {
        const TestComponent = setComponentTemplate(hbs`<span class="resolved">resolved component</span>`, templateOnly());
        this.set('value', TestComponent);

        await render(hbs`
            {{#let (resolve-component this.value) as |Resolved|}}
                <Resolved />
            {{/let}}
        `);

        assert.dom('.resolved').exists('the resolved class renders');
        assert.dom('.resolved').hasText('resolved component');
    });

    test('it resolves the component class held on a component property', async function (assert) {
        const TestComponent = setComponentTemplate(hbs`<span class="nested">nested component</span>`, templateOnly());
        this.set('value', { component: TestComponent });

        await render(hbs`
            {{#let (resolve-component this.value) as |Resolved|}}
                <Resolved />
            {{/let}}
        `);

        assert.dom('.nested').hasText('nested component');
    });

    test('it treats an empty string as a component name rather than a definition', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('value', '');

        await render(hbs`{{capture-value (resolve-component this.value)}}`);

        assert.strictEqual(captured[0], '', 'the empty string is returned unchanged');
    });
});
