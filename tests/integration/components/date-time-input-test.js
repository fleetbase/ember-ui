import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { fillIn, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | date-time-input', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        await render(hbs`<DateTimeInput />`);

        assert.dom(this.element).hasText('');
    });

    test('it renders a date instance value', async function (assert) {
        this.set('value', new Date(2026, 5, 18, 18, 47));

        await render(hbs`<DateTimeInput @value={{this.value}} />`);

        assert.dom('[aria-label="Date Input"]').hasValue('2026-06-18');
        assert.dom('[aria-label="Time Input"]').hasValue('18:47');
    });

    test('it renders a persisted date-time string value', async function (assert) {
        this.set('value', '2026-06-18 18:47');

        await render(hbs`<DateTimeInput @value={{this.value}} />`);

        assert.dom('[aria-label="Date Input"]').hasValue('2026-06-18');
        assert.dom('[aria-label="Time Input"]').hasValue('18:47');
    });

    test('it renders an iso date-time string value', async function (assert) {
        this.set('value', '2026-07-03T15:00:00+08:00');

        await render(hbs`<DateTimeInput @value={{this.value}} />`);

        assert.dom('[aria-label="Date Input"]').hasValue('2026-07-03');
        assert.dom('[aria-label="Time Input"]').hasValue('15:00');
    });

    test('it renders empty inputs for an invalid date-time string value', async function (assert) {
        this.set('value', 'not a date');

        await render(hbs`<DateTimeInput @value={{this.value}} />`);

        assert.dom('[aria-label="Date Input"]').hasValue('');
        assert.dom('[aria-label="Time Input"]').hasValue('');
    });

    test('it calls onUpdate with a date instance and formatted date-time string', async function (assert) {
        assert.expect(4);

        this.set('value', '2026-06-18 18:47');
        this.set('onUpdate', (dateTimeInstance, dateTime) => {
            assert.true(dateTimeInstance instanceof Date);
            assert.strictEqual(dateTimeInstance.getFullYear(), 2026);
            assert.strictEqual(dateTimeInstance.getMonth(), 5);
            assert.strictEqual(dateTime, '2026-06-19 18:47');
        });

        await render(hbs`<DateTimeInput @value={{this.value}} @onUpdate={{this.onUpdate}} />`);
        await fillIn('[aria-label="Date Input"]', '2026-06-19');
    });

    test('it calls onUpdate when the time input changes', async function (assert) {
        assert.expect(4);

        this.set('value', '2026-06-18 18:47');
        this.set('onUpdate', (dateTimeInstance, dateTime) => {
            assert.true(dateTimeInstance instanceof Date);
            assert.strictEqual(dateTimeInstance.getFullYear(), 2026);
            assert.strictEqual(dateTimeInstance.getMonth(), 5);
            assert.strictEqual(dateTime, '2026-06-18 19:12');
        });

        await render(hbs`<DateTimeInput @value={{this.value}} @onUpdate={{this.onUpdate}} />`);
        await fillIn('[aria-label="Time Input"]', '19:12');
    });

    test('it keeps the latest date when changing time after date', async function (assert) {
        assert.expect(2);

        const changes = [];
        this.set('value', '2026-06-18 18:47');
        this.set('onUpdate', (_dateTimeInstance, dateTime) => {
            changes.push(dateTime);
        });

        await render(hbs`<DateTimeInput @value={{this.value}} @onUpdate={{this.onUpdate}} />`);
        await fillIn('[aria-label="Date Input"]', '2026-06-19');
        await fillIn('[aria-label="Time Input"]', '19:12');

        assert.strictEqual(changes[0], '2026-06-19 18:47');
        assert.strictEqual(changes[1], '2026-06-19 19:12');
    });

    test('it calls onChange for legacy callers', async function (assert) {
        assert.expect(2);

        this.set('value', '2026-06-18 18:47');
        this.set('onChange', (dateTimeInstance, dateTime) => {
            assert.true(dateTimeInstance instanceof Date);
            assert.strictEqual(dateTime, '2026-06-18 19:12');
        });

        await render(hbs`<DateTimeInput @value={{this.value}} @onChange={{this.onChange}} />`);
        await fillIn('[aria-label="Time Input"]', '19:12');
    });

    test('it does not reset while controlled by a parent value', async function (assert) {
        assert.expect(4);

        this.set('value', '2026-06-18 18:47');
        this.set('onUpdate', (dateTimeInstance) => {
            this.set('value', dateTimeInstance);
        });

        await render(hbs`<DateTimeInput @value={{this.value}} @onUpdate={{this.onUpdate}} />`);

        await fillIn('[aria-label="Date Input"]', '2026-06-19');

        assert.dom('[aria-label="Date Input"]').hasValue('2026-06-19');
        assert.dom('[aria-label="Time Input"]').hasValue('18:47');

        await fillIn('[aria-label="Time Input"]', '19:12');

        assert.dom('[aria-label="Date Input"]').hasValue('2026-06-19');
        assert.dom('[aria-label="Time Input"]').hasValue('19:12');
    });

    test('it does not emit null while native inputs are incomplete', async function (assert) {
        assert.expect(1);

        this.set('value', '2026-06-18 18:47');
        this.set('onUpdate', () => {
            assert.ok(false, 'onUpdate should not be called for incomplete input');
        });

        await render(hbs`<DateTimeInput @value={{this.value}} @onUpdate={{this.onUpdate}} />`);
        await fillIn('[aria-label="Date Input"]', '');

        assert.dom('[aria-label="Date Input"]').hasValue('');
    });
});
