import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

// The table renders an empty-state row when there is no data, so data rows are
// identified by having a key input rather than by position.
function rows() {
    return findAll('tbody tr').filter((row) => row.querySelector('td:first-child input'));
}

function keyInputs() {
    return rows().map((row) => row.querySelector('td:first-child input'));
}

function buttonWithText(text) {
    return findAll('button').find((button) => button.textContent.trim().toLowerCase().includes(text));
}

// The preview button is icon-only, so it is located by its icon.
function previewButton() {
    return findAll('button').find((button) => button.querySelector('.fa-eye'));
}

function filterInput() {
    return find('input[placeholder="Filter keys…"]');
}

module('Integration | Component | metadata-editor', function (hooks) {
    setupRenderingTest(hooks);

    let changes;
    let shown;

    hooks.beforeEach(function () {
        changes = [];
        shown = [];
        this.set('onChange', (output) => changes.push(output));

        this.owner.unregister('service:modals-manager');
        this.owner.register(
            'service:modals-manager',
            class extends Service {
                show(component, options) {
                    shown.push([component, options]);
                }
            }
        );
    });

    const TEMPLATE = hbs`<MetadataEditor @value={{this.value}} @label={{this.label}} @allowBoolean={{this.allowBoolean}} @onChange={{this.onChange}} />`;

    test('it renders an empty-state row when there is no value', async function (assert) {
        await render(TEMPLATE);

        assert.strictEqual(rows().length, 0, 'no editable rows');
        assert.dom(this.element).containsText('No metadata. Click Add to create one.');
        assert.dom(this.element).containsText('Key');
        assert.dom(this.element).containsText('Value');
    });

    test('it seeds a row per primitive entry', async function (assert) {
        this.set('value', { colour: 'red', count: 3, active: true });

        await render(TEMPLATE);

        assert.strictEqual(rows().length, 3);
        assert.deepEqual(
            keyInputs().map((input) => input.value),
            ['colour', 'count', 'active']
        );
    });

    test('it infers the type from each seeded value', async function (assert) {
        this.set('value', { colour: 'red', count: 3, active: true });

        await render(TEMPLATE);

        const types = rows().map((row) => row.querySelector('select').value);
        assert.deepEqual(types, ['text', 'number', 'boolean']);
    });

    test('non-primitive entries are preserved but not shown as rows', async function (assert) {
        this.set('value', { colour: 'red', nested: { a: 1 }, list: [1, 2] });

        await render(TEMPLATE);
        assert.strictEqual(rows().length, 1, 'only the primitive is editable');

        await click(buttonWithText('add'));
        const output = changes[changes.length - 1];
        assert.deepEqual(output.nested, { a: 1 }, 'the nested object survives a round trip');
        assert.deepEqual(output.list, [1, 2]);
    });

    // The template used to gate on {{#if @label}} and render @label directly, so the component's
    // own `label` getter — and the 'Metadata' default it encodes — was never consulted. It reads
    // {{this.label}} now, which is what makes that default reachable. (DEFECTS #7)
    test('the heading falls back to Metadata when no label is supplied', async function (assert) {
        await render(TEMPLATE);

        assert.dom('h3').hasText('Metadata', 'the default the getter always encoded now applies');
    });

    test('an explicit label wins over the default', async function (assert) {
        this.set('label', 'Custom attributes');

        await render(TEMPLATE);

        assert.dom('h3').hasText('Custom attributes');
    });

    test('an empty label suppresses the heading entirely', async function (assert) {
        this.set('label', '');

        await render(TEMPLATE);

        // `?? 'Metadata'` is nullish-coalescing, so an empty string is kept rather than defaulted,
        // and {{#if this.label}} then renders nothing. Passing '' is the way to opt out of the
        // heading now that omitting the argument no longer does.
        assert.dom('h3').doesNotExist();
    });

    test('adding a row appends an empty row and reports the change', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('add'));

        assert.strictEqual(rows().length, 1);
        assert.strictEqual(changes.length, 1, 'onChange fired');
    });

    test('an empty key is flagged as required', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('add'));

        assert.dom(this.element).containsText('Key is required');
    });

    test('keys are coerced to snake_case as you type', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('add'));
        await fillIn(keyInputs()[0], 'My Fancy Key');

        assert.strictEqual(keyInputs()[0].value, 'my_fancy_key', 'the input itself is rewritten');
        assert.deepEqual(changes[changes.length - 1], { my_fancy_key: '' });
    });

    test('a key starting with a digit is prefixed so it stays valid', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('add'));
        await fillIn(keyInputs()[0], '2fast');

        assert.strictEqual(keyInputs()[0].value, 'k_2fast');
        assert.dom(this.element).doesNotContainText('Must be snake_case');
    });

    test('duplicate keys are reported', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('add'));
        await click(buttonWithText('add'));

        await fillIn(keyInputs()[0], 'same');
        await fillIn(keyInputs()[1], 'same');

        assert.dom(this.element).containsText('Key must be unique');
    });

    test('resolving a duplicate clears the error', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('add'));
        await click(buttonWithText('add'));
        await fillIn(keyInputs()[0], 'same');
        await fillIn(keyInputs()[1], 'same');

        await fillIn(keyInputs()[1], 'different');

        assert.dom(this.element).doesNotContainText('Key must be unique');
    });

    test('invalid rows are excluded from the output', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('add'));

        assert.deepEqual(changes[changes.length - 1], {}, 'a row with no key contributes nothing');
    });

    test('editing a text value reports it', async function (assert) {
        this.set('value', { colour: 'red' });

        await render(TEMPLATE);
        await fillIn(rows()[0].querySelector('td:nth-child(2) input'), 'blue');

        assert.deepEqual(changes[changes.length - 1], { colour: 'blue' });
    });

    test('a number value is coerced to a number', async function (assert) {
        this.set('value', { count: 1 });

        await render(TEMPLATE);
        await fillIn(rows()[0].querySelector('td:nth-child(2) input'), '42');

        assert.strictEqual(changes[changes.length - 1].count, 42);
    });

    test('a non-numeric entry in a number field becomes empty', async function (assert) {
        this.set('value', { count: 1 });

        await render(TEMPLATE);
        await fillIn(rows()[0].querySelector('td:nth-child(2) input'), 'abc');

        assert.strictEqual(changes[changes.length - 1].count, '');
    });

    test('a boolean value is driven by a checkbox', async function (assert) {
        this.set('value', { active: false });

        await render(TEMPLATE);
        await click(rows()[0].querySelector('input[type="checkbox"]'));

        assert.true(changes[changes.length - 1].active);
    });

    test('changing the type coerces the existing value', async function (assert) {
        this.set('value', { count: '7' });

        await render(TEMPLATE);
        const select = rows()[0].querySelector('select');
        await fillIn(select, 'number');

        assert.strictEqual(changes[changes.length - 1].count, 7, 'the string is converted to a number');
    });

    test('switching a non-numeric value to number empties it', async function (assert) {
        this.set('value', { thing: 'abc' });

        await render(TEMPLATE);
        await fillIn(rows()[0].querySelector('select'), 'number');

        assert.strictEqual(changes[changes.length - 1].thing, '');
    });

    test('switching to boolean coerces truthiness', async function (assert) {
        this.set('value', { thing: 'yes' });

        await render(TEMPLATE);
        await fillIn(rows()[0].querySelector('select'), 'boolean');

        assert.true(changes[changes.length - 1].thing);
    });

    test('boolean rows are omitted from the output when allowBoolean is false', async function (assert) {
        this.set('value', { colour: 'red', active: true });
        this.set('allowBoolean', false);

        await render(TEMPLATE);
        await click(buttonWithText('add'));

        const output = changes[changes.length - 1];
        assert.strictEqual(output.colour, 'red');
        assert.notOk('active' in output, 'boolean rows are filtered out');
    });

    test('removing a row drops it from the output', async function (assert) {
        this.set('value', { colour: 'red', count: 2 });

        await render(TEMPLATE);
        const removeButton = rows()[0].querySelector('button');
        await click(removeButton);

        assert.strictEqual(rows().length, 1);
        assert.notOk('colour' in changes[changes.length - 1]);
    });

    test('filtering narrows the visible rows by key', async function (assert) {
        this.set('value', { colour: 'red', count: 2, category: 'x' });

        await render(TEMPLATE);
        await fillIn(filterInput(), 'co');

        assert.strictEqual(rows().length, 2, 'colour and count match');

        await fillIn(filterInput(), 'cat');
        assert.strictEqual(rows().length, 1);
    });

    test('filtering is case insensitive and clearing it restores every row', async function (assert) {
        this.set('value', { Colour: 'red', count: 2 });

        await render(TEMPLATE);
        await fillIn(filterInput(), 'COLOUR');
        assert.strictEqual(rows().length, 1);

        await fillIn(filterInput(), '');
        assert.strictEqual(rows().length, 2);
    });

    test('filtering does not change the output', async function (assert) {
        this.set('value', { colour: 'red', count: 2 });

        await render(TEMPLATE);
        await fillIn(filterInput(), 'colour');
        await click(buttonWithText('add'));

        const output = changes[changes.length - 1];
        assert.strictEqual(output.count, 2, 'a filtered-out row is still emitted');
    });

    test('clear all empties the table and the output', async function (assert) {
        this.set('value', { colour: 'red', count: 2 });

        await render(TEMPLATE);
        await click(buttonWithText('clear'));

        assert.strictEqual(rows().length, 0);
        assert.deepEqual(changes[changes.length - 1], {});
    });

    test('clear all keeps preserved non-primitive data', async function (assert) {
        this.set('value', { colour: 'red', nested: { a: 1 } });

        await render(TEMPLATE);
        await click(buttonWithText('clear'));

        assert.deepEqual(changes[changes.length - 1], { nested: { a: 1 } });
    });

    test('preview opens the raw metadata modal with the current output', async function (assert) {
        this.set('value', { colour: 'red' });

        await render(TEMPLATE);
        await click(previewButton());

        assert.strictEqual(shown.length, 1);
        assert.strictEqual(shown[0][0], 'modals/view-raw-metadata');
        assert.deepEqual(shown[0][1].metadata, { colour: 'red' });
        assert.strictEqual(shown[0][1].acceptButtonText, 'Done');
        assert.true(shown[0][1].hideDeclineButton);
    });

    test('it works with no onChange handler', async function (assert) {
        await render(hbs`<MetadataEditor />`);
        await click(buttonWithText('add'));

        assert.strictEqual(rows().length, 1, 'editing still works without a callback');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<MetadataEditor data-test-editor="yes" />`);

        assert.dom('[data-test-editor="yes"]').exists();
    });
    // Paths the seeded fixtures never produce: a key cleared back to empty, and a null value.
    test('clearing a key back to empty is handled rather than throwing', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('add'));
        await fillIn(keyInputs()[0], 'my_key');

        await fillIn(keyInputs()[0], '');

        assert.strictEqual(keyInputs()[0].value, '', 'the input is left empty');
        assert.dom(this.element).containsText('Key is required', 'and the row is flagged again');
    });
});
