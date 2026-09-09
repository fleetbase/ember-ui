import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Component from '@glimmer/component';

module('Integration | Helper | component-resolvable', function (hooks) {
    setupRenderingTest(hooks);

    test('a component name that exists in the container resolves', async function (assert) {
        await render(hbs`{{component-resolvable "button"}}`);

        assert.dom(this.element).hasText('true');
    });

    test('a component name that does not exist does not resolve', async function (assert) {
        await render(hbs`{{component-resolvable "definitely-not-a-real-component"}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it picks up components registered on the owner at runtime', async function (assert) {
        await render(hbs`{{component-resolvable "locally-registered-widget"}}`);
        assert.dom(this.element).hasText('false', 'not resolvable before registration');

        this.owner.register('component:locally-registered-widget', class extends Component {});

        await render(hbs`{{component-resolvable "locally-registered-widget"}}`);
        assert.dom(this.element).hasText('true', 'resolvable once registered');
    });

    test('falsy values are never resolvable', async function (assert) {
        this.set('nothing', undefined);
        this.set('nullish', null);
        this.set('zero', 0);

        await render(
            hbs`<span id="empty">{{component-resolvable ""}}</span><span id="undef">{{component-resolvable this.nothing}}</span><span id="null">{{component-resolvable this.nullish}}</span><span id="zero">{{component-resolvable this.zero}}</span>`
        );

        assert.dom('#empty').hasText('false');
        assert.dom('#undef').hasText('false');
        assert.dom('#null').hasText('false');
        assert.dom('#zero').hasText('false');
    });

    test('objects and functions are treated as already-renderable definitions', async function (assert) {
        this.set('fn', function () {});
        this.set('componentClass', class extends Component {});

        await render(
            hbs`<span id="hash">{{component-resolvable (hash a=1)}}</span><span id="fn">{{component-resolvable this.fn}}</span><span id="class">{{component-resolvable this.componentClass}}</span>`
        );

        assert.dom('#hash').hasText('true');
        assert.dom('#fn').hasText('true');
        assert.dom('#class').hasText('true');
    });

    test('primitives that are neither strings nor objects are not resolvable', async function (assert) {
        this.set('number', 42);
        this.set('boolean', true);

        await render(hbs`<span id="number">{{component-resolvable this.number}}</span><span id="boolean">{{component-resolvable this.boolean}}</span>`);

        assert.dom('#number').hasText('false');
        assert.dom('#boolean').hasText('false');
    });
});
