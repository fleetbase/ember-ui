import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, fillIn, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const STATUSES = ['created', 'in_transit', 'completed'];
const DRIVERS = [
    { id: 'drv_1', name: 'Alex Driver' },
    { id: 'drv_2', name: 'Blair Hauler' },
];

function optionLabels() {
    return findAll('option').map((option) => option.textContent.trim());
}

function optionValues() {
    return findAll('option').map((option) => option.value);
}

module('Integration | Component | select', function (hooks) {
    setupRenderingTest(hooks);

    let selections;
    let changes;

    hooks.beforeEach(function () {
        selections = [];
        changes = [];
        this.set('options', STATUSES);
        this.set('onSelect', (value) => selections.push(value));
        this.set('onChange', (event, value) => changes.push(value));
    });

    const TEMPLATE = hbs`
        <Select
            @options={{this.options}}
            @value={{this.value}}
            @placeholder={{this.placeholder}}
            @disabled={{this.disabled}}
            @optionLabel={{this.optionLabel}}
            @optionValue={{this.optionValue}}
            @humanize={{this.humanize}}
            @onSelect={{this.onSelect}}
            @onChange={{this.onChange}}
        />
    `;

    module('plain options', function () {
        test('it renders one option per value', async function (assert) {
            await render(TEMPLATE);

            assert.dom('select').exists();
            assert.deepEqual(optionLabels(), STATUSES);
            assert.deepEqual(optionValues(), STATUSES);
        });

        test('option labels can be humanized', async function (assert) {
            this.set('humanize', true);

            await render(TEMPLATE);

            assert.deepEqual(optionLabels(), ['Created', 'In transit', 'Completed']);
            assert.deepEqual(optionValues(), STATUSES, 'the underlying values are untouched');
        });

        test('the incoming value is preselected', async function (assert) {
            this.set('value', 'in_transit');

            await render(TEMPLATE);

            assert.dom('select').hasValue('in_transit');
        });

        test('no options renders an empty select', async function (assert) {
            await render(hbs`<Select />`);

            assert.dom('select').exists();
            assert.deepEqual(optionLabels(), []);
        });
    });

    module('record options', function (hooks) {
        hooks.beforeEach(function () {
            this.set('options', DRIVERS);
            this.set('optionLabel', 'name');
            this.set('optionValue', 'id');
        });

        test('records are labelled and valued by the nominated paths', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(optionLabels(), ['Alex Driver', 'Blair Hauler']);
            assert.deepEqual(optionValues(), ['drv_1', 'drv_2']);
        });

        test('the incoming value preselects the matching record', async function (assert) {
            this.set('value', 'drv_2');

            await render(TEMPLATE);

            assert.dom('select').hasValue('drv_2');
        });

        test('record labels can be humanized', async function (assert) {
            this.set('options', [{ id: 'a', name: 'in_transit' }]);
            this.set('humanize', true);

            await render(TEMPLATE);

            assert.deepEqual(optionLabels(), ['In transit']);
        });

        test('a record with no label falls back to its value', async function (assert) {
            this.set('options', [{ id: 'drv_1' }]);

            await render(TEMPLATE);

            assert.deepEqual(optionLabels(), ['drv_1']);
        });
    });

    module('the placeholder', function () {
        test('no placeholder option is rendered unless asked for', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(findAll('option[disabled]').length, 0);
        });

        test('a placeholder is rendered first and cannot be chosen', async function (assert) {
            this.set('placeholder', 'Choose a status');

            await render(TEMPLATE);

            assert.dom('option:first-child').hasText('Choose a status');
            assert.dom('option:first-child').isDisabled();
            assert.dom('select').hasClass('has--placeholder', 'the select is styled as unfilled');
        });

        test('a select with a value is styled as filled', async function (assert) {
            this.set('value', 'created');

            await render(TEMPLATE);

            assert.dom('select').hasClass('has--selection');
        });
    });

    module('choosing', function () {
        test('choosing an option reports it', async function (assert) {
            await render(TEMPLATE);
            await fillIn('select', 'completed');

            assert.deepEqual(selections, ['completed']);
            assert.deepEqual(changes, ['completed']);
        });

        test('choosing a record reports its value', async function (assert) {
            this.setProperties({ options: DRIVERS, optionLabel: 'name', optionValue: 'id' });

            await render(TEMPLATE);
            await fillIn('select', 'drv_2');

            assert.deepEqual(selections, ['drv_2']);
        });

        test('it chooses happily without handlers', async function (assert) {
            await render(hbs`<Select @options={{this.options}} />`);
            await fillIn('select', 'completed');

            assert.dom('select').hasValue('completed');
        });
    });

    module('styling and state', function () {
        test('a disabled select cannot be used', async function (assert) {
            this.set('disabled', true);

            await render(TEMPLATE);

            assert.dom('select').isDisabled();
            assert.dom('select').hasClass('disabled');
        });

        test('the default styling can be dropped', async function (assert) {
            await render(hbs`<Select @options={{this.options}} @defaultStylingDisabled={{true}} />`);

            assert.dom('select').doesNotHaveClass('form-select');
            assert.dom('select').hasClass('has--placeholder');
        });

        test('all styling can be dropped', async function (assert) {
            await render(hbs`<Select @options={{this.options}} @unstyled={{true}} />`);

            assert.dom('select').hasAttribute('class', '');
        });

        test('option classes can be supplied', async function (assert) {
            await render(hbs`<Select @options={{this.options}} @optionLabel="name" @optionClass="my-option" />`);

            assert.dom('option').hasClass('my-option');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<Select @options={{this.options}} name="status" />`);

            assert.dom('select').hasAttribute('name', 'status');
        });
    });

    module('blocks', function () {
        test('a block renders each option itself', async function (assert) {
            await render(hbs`<Select @options={{this.options}} as |status|>Status: {{status}}</Select>`);

            assert.deepEqual(optionLabels(), ['Status: created', 'Status: in_transit', 'Status: completed']);
        });

        test('a block over records yields the labelled value', async function (assert) {
            await render(hbs`<Select @options={{this.options}} @optionLabel="name" @optionValue="id" as |name|>{{name}}</Select>`);
            this.set('options', DRIVERS);

            assert.deepEqual(optionLabels(), ['Alex Driver', 'Blair Hauler']);
        });

        test('fetched options given as an object are keyed', async function (assert) {
            this.set('options', { a: 'created', b: 'completed' });

            await render(hbs`<Select @options={{this.options}} @fetched={{true}} as |value key|>{{key}}: {{value}}</Select>`);

            assert.deepEqual(optionLabels(), ['a: created', 'b: completed']);
        });

        test('fetched options given as a list are rendered directly', async function (assert) {
            await render(hbs`<Select @options={{this.options}} @fetched={{true}} as |status|>{{status}}</Select>`);

            assert.deepEqual(optionLabels(), STATUSES);
        });

        test('fetched records are labelled by the nominated path', async function (assert) {
            this.set('options', DRIVERS);

            await render(hbs`<Select @options={{this.options}} @fetched={{true}} @optionLabel="name" @optionValue="id" as |name|>{{name}}</Select>`);

            assert.deepEqual(optionLabels(), ['Alex Driver', 'Blair Hauler']);
            assert.deepEqual(optionValues(), ['drv_1', 'drv_2']);
        });

        test('fetched object records are labelled by the nominated path', async function (assert) {
            this.set('options', { first: DRIVERS[0], second: DRIVERS[1] });

            await render(hbs`<Select @options={{this.options}} @fetched={{true}} @optionLabel="name" @optionValue="id" as |name key|>{{key}}/{{name}}</Select>`);

            assert.deepEqual(optionLabels(), ['first/Alex Driver', 'second/Blair Hauler']);
        });
    });

    test('a changed value is picked up', async function (assert) {
        this.set('value', 'created');

        await render(TEMPLATE);
        assert.dom('select').hasValue('created');

        this.set('value', 'completed');

        assert.dom('select').hasValue('completed', 'the selection follows the argument');
    });

    test('a changed placeholder is picked up', async function (assert) {
        this.set('placeholder', 'Choose');

        await render(TEMPLATE);
        assert.dom('option:first-child').hasText('Choose');

        this.set('placeholder', 'Pick one');

        assert.dom('option:first-child').hasText('Pick one');
    });
});
