import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { registerResourceDescriptors } from '@fleetbase/ember-ui/utils/resource-registry';

module('Integration | Helper | resource-type, resource-component, resource-relation', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        registerResourceDescriptors(this.owner, [{ key: 'vehicle', aliases: ['attachable-vehicle'] }]);
        this.owner.register('template:components/vehicle/pill', hbs`<span data-test-vehicle-pill>{{@resource.name}}</span>`);
    });

    test('resource-type resolves a key and yields nothing for unknown input', async function (assert) {
        this.set('record', { resourceType: 'attachable-vehicle' });

        await render(hbs`[{{resource-type this.record}}][{{resource-type "vehicle"}}][{{resource-type "nothing"}}]`);

        assert.dom(this.element).hasText('[vehicle][vehicle][]');
    });

    test('resource-component names a renderable component or nothing', async function (assert) {
        this.set('record', { resourceType: 'vehicle', name: 'Truck 1' });

        await render(hbs`
            {{#let (resource-component "pill" this.record) as |pill|}}
                {{#if pill}}{{component pill resource=this.record}}{{else}}<span data-test-fallback>text</span>{{/if}}
            {{/let}}
            {{#let (resource-component "summary" this.record) as |summary|}}
                {{#if summary}}{{component summary}}{{else}}<span data-test-no-summary>no summary</span>{{/if}}
            {{/let}}
        `);

        assert.dom('[data-test-vehicle-pill]').hasText('Truck 1');
        assert.dom('[data-test-fallback]').doesNotExist();
        assert.dom('[data-test-no-summary]').exists();
    });

    test('resource-relation reads a relation without a proxy', async function (assert) {
        const driver = { name: 'Ada' };
        this.set('record', {
            belongsTo(name) {
                return { value: () => (name === 'driver' ? driver : null) };
            },
        });

        await render(hbs`[{{get (resource-relation this.record "driver") "name"}}][{{if (resource-relation this.record "vendor") "vendor" "none"}}]`);

        assert.dom(this.element).hasText('[Ada][none]');
    });
});
