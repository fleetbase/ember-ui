import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import EmberObject, { computed } from '@ember/object';

module('Integration | Helper | safe-has', function (hooks) {
    setupRenderingTest(hooks);

    test('it reads a shallow property', async function (assert) {
        this.set('subject', { name: 'Fleetbase' });

        await render(hbs`{{safe-has this.subject "name"}}`);

        assert.dom(this.element).hasText('Fleetbase');
    });

    test('it reads a nested property path', async function (assert) {
        this.set('subject', { driver: { user: { name: 'Ron' } } });

        await render(hbs`{{safe-has this.subject "driver.user.name"}}`);

        assert.dom(this.element).hasText('Ron');
    });

    test('it renders nothing when the path is missing', async function (assert) {
        this.set('subject', { name: 'Fleetbase' });

        await render(hbs`{{safe-has this.subject "driver.user.name"}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it renders falsy leaf values rather than swallowing them', async function (assert) {
        this.set('subject', { count: 0, active: false, label: '' });

        await render(hbs`{{safe-has this.subject "count"}}|{{safe-has this.subject "active"}}|{{safe-has this.subject "label"}}|`);

        assert.strictEqual(this.element.textContent.trim(), '0|false||');
    });

    test('it returns undefined for a destroyed object', async function (assert) {
        this.set('subject', { name: 'Fleetbase', isDestroyed: true, isDestroying: false });

        await render(hbs`{{safe-has this.subject "name"}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it returns undefined for an object that is being destroyed', async function (assert) {
        this.set('subject', { name: 'Fleetbase', isDestroyed: false, isDestroying: true });

        await render(hbs`{{safe-has this.subject "name"}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it reads from an object that is neither destroyed nor destroying', async function (assert) {
        this.set('subject', { name: 'Fleetbase', isDestroyed: false, isDestroying: false });

        await render(hbs`{{safe-has this.subject "name"}}`);

        assert.dom(this.element).hasText('Fleetbase');
    });

    test('it renders nothing for null and undefined subjects', async function (assert) {
        this.set('subject', null);

        await render(hbs`{{safe-has this.subject "name"}}{{safe-has this.missing "name"}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it reads computed properties from an EmberObject', async function (assert) {
        const Person = EmberObject.extend({
            fullName: computed('first', 'last', function () {
                return `${this.first} ${this.last}`;
            }),
        });
        this.set('subject', Person.create({ first: 'Ada', last: 'Lovelace' }));

        await render(hbs`{{safe-has this.subject "fullName"}}`);

        assert.dom(this.element).hasText('Ada Lovelace');
    });

    test('it reads array indices and length through the path', async function (assert) {
        this.set('subject', { items: ['first', 'second'] });

        await render(hbs`{{safe-has this.subject "items.0"}}|{{safe-has this.subject "items.length"}}`);

        assert.dom(this.element).hasText('first|2');
    });

    test('it reads through nested empty objects without throwing', async function (assert) {
        this.set('subject', { meta: {} });

        await render(hbs`{{safe-has this.subject "meta.missing.deep"}}`);

        assert.dom(this.element).hasNoText();
    });
});
