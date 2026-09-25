import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const TRIGGER = '.ember-basic-dropdown-trigger';

function columns() {
    return [{ label: 'Name', valuePath: 'name', hidden: false }, { label: 'Status', valuePath: 'status', hidden: true }, { valuePath: 'internal_id' }];
}

function checkboxes() {
    return findAll('.customize-columns-dropdown-body input[type="checkbox"]');
}

function checkboxLabels() {
    return findAll('.customize-columns-dropdown-body label').map((label) => label.textContent.trim());
}

module('Integration | Component | visible-column-picker', function (hooks) {
    setupRenderingTest(hooks);

    let changes;
    let applied;

    hooks.beforeEach(function () {
        changes = [];
        applied = [];
        this.set('columns', columns());
        this.set('onChange', (cols) => changes.push(cols.map((column) => `${column.valuePath}:${column.hidden ? 'hidden' : 'shown'}`)));
        this.set('onApply', (cols) => applied.push(cols.length));
    });

    const TEMPLATE = hbs`
        <VisibleColumnPicker
            @columns={{this.columns}}
            @text={{this.text}}
            @icon={{this.icon}}
            @iconOnly={{this.iconOnly}}
            @dropdownHeaderText={{this.dropdownHeaderText}}
            @renderInPlace={{true}}
            @onChange={{this.onChange}}
            @onApply={{this.onApply}}
        />
    `;

    module('the trigger', function () {
        test('it renders a labelled trigger with a default icon', async function (assert) {
            await render(TEMPLATE);

            assert.ok(find(TRIGGER), 'the picker renders');
            assert.dom(`${TRIGGER} svg`).hasClass('fa-sliders');
        });

        test('the trigger text and icon can be replaced', async function (assert) {
            this.setProperties({ text: 'Choose fields', icon: 'table-columns' });

            await render(TEMPLATE);

            assert.dom(TRIGGER).containsText('Choose fields');
            assert.dom(`${TRIGGER} svg`).hasClass('fa-table-columns');
        });

        test('the trigger can be reduced to an icon', async function (assert) {
            this.setProperties({ text: 'Choose fields', iconOnly: true });

            await render(TEMPLATE);

            assert.dom(TRIGGER).doesNotContainText('Choose fields');
            assert.ok(find(`${TRIGGER} svg`), 'only the icon remains');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<VisibleColumnPicker @columns={{this.columns}} @renderInPlace={{true}} data-test-picker="yes" />`);

            assert.dom('[data-test-picker="yes"]').exists();
        });
    });

    module('the column list', function () {
        test('only labelled columns are offered', async function (assert) {
            await render(TEMPLATE);
            await click(TRIGGER);

            assert.deepEqual(checkboxLabels(), ['Name', 'Status'], 'the unlabelled column is skipped');
        });

        test('each checkbox reflects whether the column is shown', async function (assert) {
            await render(TEMPLATE);
            await click(TRIGGER);

            assert.dom(checkboxes()[0]).isChecked('a visible column is ticked');
            assert.dom(checkboxes()[1]).isNotChecked('a hidden column is not');
        });

        test('the dropdown carries a heading', async function (assert) {
            await render(TEMPLATE);
            await click(TRIGGER);

            assert.dom('.customize-columns-dropdown-header h4').exists();
        });

        test('the heading can be replaced', async function (assert) {
            this.set('dropdownHeaderText', 'Pick your columns');

            await render(TEMPLATE);
            await click(TRIGGER);

            assert.dom('.customize-columns-dropdown-header h4').hasText('Pick your columns');
        });

        test('a picker with no columns renders an empty list', async function (assert) {
            this.set('columns', []);

            await render(TEMPLATE);
            await click(TRIGGER);

            assert.deepEqual(checkboxes(), []);
            assert.dom('.customize-columns-dropdown-body').exists('the body still renders');
        });
    });

    module('changing visibility', function () {
        test('unticking a column hides it and reports every column', async function (assert) {
            await render(TEMPLATE);
            await click(TRIGGER);
            await click(checkboxes()[0]);

            assert.notStrictEqual(this.columns[0].hidden, false, 'the column is now hidden');
            assert.true(this.columns[0].hidden);
            assert.deepEqual(changes, [['name:hidden', 'status:hidden', 'internal_id:shown']]);
        });

        test('ticking a column shows it again', async function (assert) {
            await render(TEMPLATE);
            await click(TRIGGER);
            await click(checkboxes()[1]);

            assert.false(this.columns[1].hidden);
            assert.deepEqual(changes, [['name:shown', 'status:shown', 'internal_id:shown']]);
        });

        test('it changes visibility happily without an onChange handler', async function (assert) {
            await render(hbs`<VisibleColumnPicker @columns={{this.columns}} @renderInPlace={{true}} />`);
            await click(TRIGGER);
            await click(checkboxes()[0]);

            assert.true(this.columns[0].hidden, 'the column is still hidden');
        });
    });

    module('applying', function () {
        test('done reports the columns and closes the dropdown', async function (assert) {
            await render(TEMPLATE);
            await click(TRIGGER);
            await click('.visible-column-picker-done-btn button');

            assert.deepEqual(applied, [3], 'every column is handed back');
            assert.strictEqual(find('.customize-columns-dropdown-container'), null, 'the dropdown closes');
        });

        test('it applies happily without an onApply handler', async function (assert) {
            await render(hbs`<VisibleColumnPicker @columns={{this.columns}} @renderInPlace={{true}} />`);
            await click(TRIGGER);
            await click('.visible-column-picker-done-btn button');

            assert.strictEqual(find('.customize-columns-dropdown-container'), null, 'the dropdown still closes');
        });
    });
});
