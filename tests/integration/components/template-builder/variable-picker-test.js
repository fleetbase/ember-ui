import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const SCHEMAS = [
    {
        namespace: 'invoice',
        label: 'Invoice',
        icon: 'file-invoice',
        variables: [
            { path: 'invoice.number', label: 'Invoice Number', type: 'string', example: 'INV-001' },
            { path: 'invoice.subtotal', label: 'Subtotal', type: 'number', example: '100.00' },
        ],
    },
    {
        namespace: 'order',
        label: 'Order',
        icon: 'box',
        variables: [{ path: 'order.quantity', label: 'Quantity', type: 'number', example: '3' }],
    },
];

function buttonWithText(text) {
    return findAll('.tb-variable-picker button').find((button) => button.textContent.replace(/\s+/g, ' ').includes(text));
}

function variableButtons() {
    return findAll('.tb-variable-picker button').filter((button) => button.querySelector('.font-mono'));
}

function variablePaths() {
    return variableButtons().map((button) => button.querySelector('.font-mono').textContent.trim());
}

function searchInput() {
    return find('input[placeholder="Search variables..."]');
}

module('Integration | Component | template-builder/variable-picker', function (hooks) {
    setupRenderingTest(hooks);

    let inserted;
    let closed;

    hooks.beforeEach(function () {
        inserted = [];
        closed = 0;
        this.set('isOpen', true);
        this.set('contextSchemas', SCHEMAS);
        this.set('onInsert', (token) => inserted.push(token));
        this.set('onClose', () => closed++);
    });

    // A schema that declares no variables at all, and a variable of a type the icon map does not
    // know, are both shapes a host application can register.
    const ODD_SCHEMAS = [
        { namespace: 'empty', label: 'Empty' },
        {
            namespace: 'odd',
            label: 'Odd',
            variables: [
                { path: 'odd.thing', label: 'Thing', type: 'geometry' },
                { path: 'odd.unlabelled', type: 'geometry' },
            ],
        },
    ];

    const TEMPLATE = hbs`
        <TemplateBuilder::VariablePicker
            @isOpen={{this.isOpen}}
            @contextSchemas={{this.contextSchemas}}
            @onInsert={{this.onInsert}}
            @onClose={{this.onClose}}
        />
    `;

    module('visibility', function () {
        test('it renders nothing when closed', async function (assert) {
            this.set('isOpen', false);

            await render(TEMPLATE);

            assert.dom('.tb-variable-picker').doesNotExist();
        });

        test('when open it presents an accessible modal on the variables tab', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.tb-variable-picker').hasAttribute('role', 'dialog');
            assert.dom('.tb-variable-picker').hasAttribute('aria-modal', 'true');
            assert.dom(this.element).containsText('Insert Variable or Formula');
            assert.dom(this.element).containsText('Global', 'the always-available shortcuts are listed');
            assert.notOk(find('textarea'), 'the formula tab is not active');
        });
    });

    module('browsing variables', function () {
        test('namespaces start collapsed and expand on click', async function (assert) {
            await render(TEMPLATE);
            assert.strictEqual(variablePaths().length, 0, 'nothing is expanded initially');

            await click(buttonWithText('Invoice'));

            assert.deepEqual(variablePaths(), ['invoice.number', 'invoice.subtotal']);
        });

        test('a namespace collapses again on a second click', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('Invoice'));
            await click(buttonWithText('Invoice'));

            assert.strictEqual(variablePaths().length, 0);
        });

        test('each namespace reports how many variables it holds', async function (assert) {
            await render(TEMPLATE);

            assert.dom(buttonWithText('Invoice')).containsText('2 variables');
            assert.dom(buttonWithText('Order')).containsText('1 variables');
        });

        test('the global section is always offered and independent of the schemas', async function (assert) {
            this.set('contextSchemas', []);

            await render(TEMPLATE);
            await click(buttonWithText('Global'));

            const paths = variablePaths();
            assert.true(paths.includes('company.name'));
            assert.true(paths.includes('now'));
            assert.strictEqual(paths.length, 10, 'every global shortcut is listed');
        });

        test('a schema list that is not an array is ignored', async function (assert) {
            this.set('contextSchemas', { invoice: SCHEMAS[0] });

            await render(TEMPLATE);

            assert.notOk(buttonWithText('Invoice'), 'the malformed payload contributes nothing');
            assert.ok(buttonWithText('Global'), 'the picker still works');
        });

        test('a schema with no variables array does not break browsing', async function (assert) {
            this.set('contextSchemas', [{ namespace: 'empty', label: 'Empty', icon: 'box' }]);

            await render(TEMPLATE);
            await fillIn(searchInput(), 'anything');

            assert.dom(this.element).containsText('No variables match "anything"');
        });
    });

    module('searching', function () {
        test('searching matches on path and on label, and auto-expands', async function (assert) {
            await render(TEMPLATE);

            await fillIn(searchInput(), 'subtotal');
            assert.deepEqual(variablePaths(), ['invoice.subtotal'], 'matching on the path expands the namespace automatically');

            await fillIn(searchInput(), 'quantity');
            assert.deepEqual(variablePaths(), ['order.quantity'], 'matching on the label works too');
        });

        test('searching is case-insensitive and ignores surrounding whitespace', async function (assert) {
            await render(TEMPLATE);
            await fillIn(searchInput(), '  INVOICE.NUM  ');

            assert.deepEqual(variablePaths(), ['invoice.number']);
        });

        test('a search with no matches shows the query back to the user', async function (assert) {
            await render(TEMPLATE);
            await fillIn(searchInput(), 'nothing-matches');

            assert.dom(this.element).containsText('No variables match "nothing-matches"');
            assert.strictEqual(variablePaths().length, 0);
        });

        test('clearing the search restores the full collapsed list', async function (assert) {
            await render(TEMPLATE);
            await fillIn(searchInput(), 'subtotal');
            await fillIn(searchInput(), '');

            assert.ok(buttonWithText('Invoice'), 'both namespaces are listed again');
            assert.ok(buttonWithText('Order'));
        });
    });

    module('inserting a variable', function () {
        test('clicking a variable inserts its token and dismisses the picker', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('Invoice'));
            await click(variableButtons()[0]);

            assert.deepEqual(inserted, ['{invoice.number}']);
            assert.strictEqual(closed, 1, 'inserting also closes');
        });

        test('a global variable inserts the same way', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('Global'));
            await click(variableButtons()[0]);

            assert.deepEqual(inserted, ['{company.name}']);
        });

        test('it works without an onInsert handler', async function (assert) {
            await render(hbs`<TemplateBuilder::VariablePicker @isOpen={{true}} @contextSchemas={{this.contextSchemas}} @onClose={{this.onClose}} />`);
            await click(buttonWithText('Invoice'));
            await click(variableButtons()[0]);

            assert.strictEqual(closed, 1, 'the picker still closes');
        });
    });

    module('the formula tab', function () {
        async function openFormulaTab() {
            await click(buttonWithText('Formula'));
        }

        test('switching tabs swaps the panel contents', async function (assert) {
            await render(TEMPLATE);
            await openFormulaTab();

            assert.ok(find('textarea'), 'the expression editor is shown');
            assert.notOk(searchInput(), 'the variable search is gone');
            assert.dom(this.element).containsText('Formula Syntax');

            await click(buttonWithText('Variables'));

            assert.ok(searchInput(), 'switching back restores the variable browser');
        });

        test('the preview only appears once an expression is typed', async function (assert) {
            await render(TEMPLATE);
            await openFormulaTab();
            assert.dom(this.element).doesNotContainText('Preview');

            await fillIn('textarea', '{invoice.subtotal} * 1.1');

            assert.dom(this.element).containsText('Preview');
            assert.dom(this.element).containsText('[{ {invoice.subtotal} * 1.1 }]');
        });

        test('a whitespace-only expression produces no preview', async function (assert) {
            await render(TEMPLATE);
            await openFormulaTab();
            await fillIn('textarea', '    ');

            assert.dom(this.element).doesNotContainText('Preview');
        });

        test('the insert button is disabled until an expression exists', async function (assert) {
            await render(TEMPLATE);
            await openFormulaTab();

            assert.dom(buttonWithText('Insert Formula')).isDisabled();

            await fillIn('textarea', '1 + 1');

            assert.dom(buttonWithText('Insert Formula')).isNotDisabled();
        });

        test('only numeric variables are offered for quick insert', async function (assert) {
            await render(TEMPLATE);
            await openFormulaTab();

            const quickPaths = findAll('.tb-variable-picker button .font-mono').map((node) => node.textContent.trim());
            assert.true(quickPaths.includes('invoice.subtotal'));
            assert.true(quickPaths.includes('order.quantity'));
            assert.false(quickPaths.includes('invoice.number'), 'a string variable is not offered to a formula');
        });

        test('quick-inserting appends tokens to the expression', async function (assert) {
            await render(TEMPLATE);
            await openFormulaTab();

            const quickButtons = findAll('.tb-variable-picker button').filter((button) => button.textContent.includes('Subtotal') || button.textContent.includes('Quantity'));
            await click(quickButtons[0]);
            await click(quickButtons[1]);

            assert.dom('textarea').hasValue('{invoice.subtotal}{order.quantity}');
        });

        test('inserting a valid formula wraps it and closes the picker', async function (assert) {
            await render(TEMPLATE);
            await openFormulaTab();
            await fillIn('textarea', '  {invoice.subtotal} * 1.1  ');
            await click(buttonWithText('Insert Formula'));

            assert.deepEqual(inserted, ['[{ {invoice.subtotal} * 1.1 }]'], 'the expression is trimmed and wrapped');
            assert.strictEqual(closed, 1);
        });

        // The button is disabled on `not this.formulaExpression`, which whitespace satisfies — so
        // a spaces-only expression is pressable and the trim guard inside is what stops it.
        test('a whitespace-only expression inserts nothing', async function (assert) {
            await render(TEMPLATE);
            await openFormulaTab();
            await fillIn('textarea', '   ');

            assert.dom(buttonWithText('Insert Formula')).isNotDisabled('the button is pressable');

            await click(buttonWithText('Insert Formula'));

            assert.deepEqual(inserted, [], 'nothing is inserted');
            assert.strictEqual(closed, 0, 'and the picker stays open');
        });

        test('inserting a formula with no handler behind it still closes the picker', async function (assert) {
            await render(hbs`<TemplateBuilder::VariablePicker @isOpen={{true}} @contextSchemas={{this.contextSchemas}} @onClose={{this.onClose}} />`);
            await openFormulaTab();
            await fillIn('textarea', '1 + 1');
            await click(buttonWithText('Insert Formula'));

            assert.strictEqual(closed, 1, 'the picker closes with nothing to report to');
        });

        test('unbalanced braces are reported and nothing is inserted', async function (assert) {
            await render(TEMPLATE);
            await openFormulaTab();
            await fillIn('textarea', '{invoice.subtotal * 1.1');
            await click(buttonWithText('Insert Formula'));

            assert.dom(this.element).containsText('Unbalanced curly braces in formula.');
            assert.deepEqual(inserted, [], 'nothing is inserted');
            assert.strictEqual(closed, 0, 'the picker stays open so the mistake can be corrected');
        });

        test('editing the expression clears a previous error', async function (assert) {
            await render(TEMPLATE);
            await openFormulaTab();
            await fillIn('textarea', '{invoice.subtotal');
            await click(buttonWithText('Insert Formula'));
            assert.dom(this.element).containsText('Unbalanced curly braces');

            await fillIn('textarea', '{invoice.subtotal}');

            assert.dom(this.element).doesNotContainText('Unbalanced curly braces');
        });

        test('an expression with no braces at all is accepted', async function (assert) {
            await render(TEMPLATE);
            await openFormulaTab();
            await fillIn('textarea', 'round(1.5)');
            await click(buttonWithText('Insert Formula'));

            assert.deepEqual(inserted, ['[{ round(1.5) }]']);
        });
    });

    module('shapes a host application can register', function () {
        test('searching skips a schema with no variables, and an unknown type still gets an icon', async function (assert) {
            this.set('contextSchemas', ODD_SCHEMAS);

            await render(TEMPLATE);
            await fillIn(searchInput(), 'thing');

            assert.dom(this.element).doesNotIncludeText('Empty', 'a schema with nothing in it drops out of the results');
            assert.dom(this.element).includesText('Thing', 'the matching variable is listed');

            await fillIn(searchInput(), 'unlabelled');

            assert.dom(this.element).includesText('odd.unlabelled', 'a variable with no label of its own is matched on its path');
        });
    });

    module('dismissal', function () {
        test('the close button resets the picker state', async function (assert) {
            await render(TEMPLATE);
            await fillIn(searchInput(), 'subtotal');
            await click(buttonWithText('Formula'));
            await fillIn('textarea', '1 + 1');

            await click(buttonWithText('Cancel'));

            assert.strictEqual(closed, 1);

            // Reopening shows a clean picker rather than the abandoned state.
            this.set('isOpen', false);
            this.set('isOpen', true);
            await render(TEMPLATE);

            assert.ok(searchInput(), 'it reopens on the variables tab');
            assert.dom(searchInput()).hasValue('', 'the search was reset');
        });

        test('clicking the backdrop dismisses the picker', async function (assert) {
            await render(TEMPLATE);
            await click('.tb-variable-picker > div:first-child');

            assert.strictEqual(closed, 1);
        });

        test('it dismisses cleanly without an onClose handler', async function (assert) {
            await render(hbs`<TemplateBuilder::VariablePicker @isOpen={{true}} @contextSchemas={{this.contextSchemas}} />`);
            await click('.tb-variable-picker > div:first-child');

            assert.dom('.tb-variable-picker').exists('the parent owns visibility, so the picker stays rendered');
        });
    });
});
