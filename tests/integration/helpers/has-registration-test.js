import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import Component from '@glimmer/component';

module('Integration | Helper | has-registration', function (hooks) {
    setupRenderingTest(hooks);

    test('a fully qualified name that exists resolves to true', async function (assert) {
        await render(hbs`{{has-registration "helper:has-registration"}}`);

        assert.dom(this.element).hasText('true');
    });

    test('a fully qualified name that does not exist resolves to false', async function (assert) {
        await render(hbs`{{has-registration "component:definitely-not-a-real-component"}}`);

        assert.dom(this.element).hasText('false');
    });

    test('the type can be supplied as a second argument instead of a prefix', async function (assert) {
        await render(hbs`<span id="prefixed">{{has-registration "service:store"}}</span><span id="split">{{has-registration "store" "service"}}</span>`);

        assert.dom('#prefixed').hasText('true');
        assert.dom('#split').hasText('true', 'name and type are joined with a colon');
    });

    test('the type argument is applied when checking for missing registrations', async function (assert) {
        await render(hbs`{{has-registration "totally-missing" "service"}}`);

        assert.dom(this.element).hasText('false');
    });

    test('a name without a type never matches a registration', async function (assert) {
        await render(hbs`{{has-registration "store"}}`);

        assert.dom(this.element).hasText('false', 'an unqualified name is not resolvable');
    });

    test('it sees registrations made on the owner at runtime', async function (assert) {
        this.owner.register('service:my-runtime-service', class extends Service {});
        this.owner.register('component:my-runtime-component', class extends Component {});

        await render(hbs`<span id="service">{{has-registration "my-runtime-service" "service"}}</span><span id="component">{{has-registration "component:my-runtime-component"}}</span>`);

        assert.dom('#service').hasText('true');
        assert.dom('#component').hasText('true');
    });

    test('it distinguishes between types for the same name', async function (assert) {
        this.owner.register('service:ambiguous-name', class extends Service {});

        await render(hbs`<span id="service">{{has-registration "ambiguous-name" "service"}}</span><span id="component">{{has-registration "ambiguous-name" "component"}}</span>`);

        assert.dom('#service').hasText('true');
        assert.dom('#component').hasText('false', 'the type is part of the lookup key');
    });
});
