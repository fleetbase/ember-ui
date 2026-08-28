import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | is-object', function (hooks) {
    setupRenderingTest(hooks);

    test('it is true for a plain object', async function (assert) {
        this.set('subject', { name: 'Fleetbase' });

        await render(hbs`{{is-object this.subject}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is true for an empty object', async function (assert) {
        this.set('subject', {});

        await render(hbs`{{is-object this.subject}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is true for an object built from a template hash', async function (assert) {
        await render(hbs`{{is-object (hash a=1 b=2)}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is true for a class instance', async function (assert) {
        class Waypoint {
            constructor() {
                this.id = 'wp_1';
            }
        }
        this.set('subject', new Waypoint());

        await render(hbs`{{is-object this.subject}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is true for a null prototype object', async function (assert) {
        this.set('subject', Object.create(null));

        await render(hbs`{{is-object this.subject}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is false for arrays', async function (assert) {
        this.set('subject', [{ a: 1 }]);

        await render(hbs`{{is-object this.subject}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false for other built in object types', async function (assert) {
        this.set('date', new Date(0));
        this.set('map', new Map());
        this.set('regex', /abc/);

        await render(hbs`{{is-object this.date}}|{{is-object this.map}}|{{is-object this.regex}}`);

        assert.dom(this.element).hasText('false|false|false');
    });

    test('it is false for truthy primitives', async function (assert) {
        this.set('string', 'Fleetbase');
        this.set('number', 42);
        this.set('bool', true);

        await render(hbs`{{is-object this.string}}|{{is-object this.number}}|{{is-object this.bool}}`);

        assert.dom(this.element).hasText('false|false|false');
    });

    test('it returns the falsy input itself for null and undefined so nothing is rendered', async function (assert) {
        this.set('subject', null);

        await render(hbs`{{is-object this.subject}}{{is-object this.missing}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it does not render for an empty string input', async function (assert) {
        this.set('subject', '');

        await render(hbs`{{is-object this.subject}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it is usable as a conditional guard', async function (assert) {
        this.set('subject', ['not', 'an', 'object']);

        await render(hbs`
            {{#if (is-object this.subject)}}
                <span class="object">object</span>
            {{else}}
                <span class="not-object">not object</span>
            {{/if}}
        `);

        assert.dom('.not-object').exists();
        assert.dom('.object').doesNotExist();
    });
});
