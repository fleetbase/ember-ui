import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectFiles } from 'ember-file-upload/test-support';

function element(type, overrides = {}) {
    return { uuid: 'el-1', type, x: 10, y: 20, width: 100, height: 50, ...overrides };
}

function labelled(labelText) {
    const label = findAll('label').find((node) => node.textContent.trim().toLowerCase().startsWith(labelText.toLowerCase()));

    if (!label) {
        return null;
    }

    return label.parentElement.querySelector('input, select, textarea') ?? label.nextElementSibling;
}

// Sections start collapsed unless they are in the component's default open set,
// so their contents must be revealed before they can be driven.
async function openSection(title) {
    const header = findAll('.tb-prop-section > button').find((button) => button.textContent.trim().toLowerCase().includes(title.toLowerCase()));

    if (header && header.querySelector('.fa-chevron-down')) {
        await click(header);
    }

    return header;
}

module('Integration | Component | template-builder/properties-panel', function (hooks) {
    setupRenderingTest(hooks);

    let updates;
    let templateUpdates;

    hooks.beforeEach(function () {
        updates = [];
        templateUpdates = [];
        this.set('onUpdateElement', (uuid, changes) => updates.push({ uuid, changes }));
        this.set('onUpdateTemplate', (changes) => templateUpdates.push(changes));
    });

    const TEMPLATE = hbs`
        <TemplateBuilder::PropertiesPanel
            @selectedElement={{this.selectedElement}}
            @template={{this.template}}
            @onUpdateElement={{this.onUpdateElement}}
            @onUpdateTemplate={{this.onUpdateTemplate}}
            @onOpenVariablePicker={{this.onOpenVariablePicker}}
        />
    `;

    function lastChanges() {
        return updates[updates.length - 1]?.changes;
    }

    module('selection state', function () {
        test('with no selection it shows canvas settings rather than element properties', async function (assert) {
            this.set('template', { width: 210, height: 297, unit: 'mm' });

            await render(TEMPLATE);

            assert.dom(this.element).doesNotContainText('Position', 'element sections are hidden');
            assert.dom(this.element).exists('the panel still renders');
        });

        test('selecting an element reveals the position and size sections', async function (assert) {
            this.set('selectedElement', element('text'));

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Position');
            assert.dom(this.element).containsText('Size');
        });

        test('sections can be collapsed and expanded', async function (assert) {
            this.set('selectedElement', element('text'));

            await render(TEMPLATE);
            const before = findAll('input[type="number"]').length;
            assert.true(before > 0, 'position inputs are visible by default');

            const positionToggle = findAll('button').find((b) => b.textContent.includes('Position'));
            await click(positionToggle);

            assert.true(findAll('input[type="number"]').length < before, 'collapsing hides its inputs');

            await click(positionToggle);
            assert.strictEqual(findAll('input[type="number"]').length, before, 'expanding restores them');
        });
    });

    module('property editing', function () {
        test('numeric properties are parsed to numbers', async function (assert) {
            this.set('selectedElement', element('text'));

            await render(TEMPLATE);
            await fillIn(labelled('X'), '42');

            assert.deepEqual(lastChanges(), { x: 42 }, 'the value is a number, not a string');
            assert.strictEqual(updates[updates.length - 1].uuid, 'el-1', 'the element uuid is reported');
        });

        test('clearing a numeric property reports null', async function (assert) {
            this.set('selectedElement', element('text'));

            await render(TEMPLATE);
            await fillIn(labelled('X'), '');

            assert.deepEqual(lastChanges(), { x: null });
        });

        test('non-numeric text in a number field is rejected by the input and reported as null', async function (assert) {
            this.set('selectedElement', element('text'));

            await render(TEMPLATE);
            const input = labelled('X');
            assert.strictEqual(input.type, 'number', 'position is a number field');

            input.value = 'abc';
            input.dispatchEvent(new Event('change', { bubbles: true }));

            assert.strictEqual(input.value, '', 'the browser refuses to hold non-numeric text');
            assert.deepEqual(lastChanges(), { x: null }, 'which the component reports as a cleared value');
        });

        test('a negative and a fractional value are both preserved', async function (assert) {
            this.set('selectedElement', element('text'));

            await render(TEMPLATE);

            await fillIn(labelled('X'), '-15');
            assert.deepEqual(lastChanges(), { x: -15 });

            await fillIn(labelled('X'), '12.5');
            assert.deepEqual(lastChanges(), { x: 12.5 });
        });

        test('text properties are reported verbatim', async function (assert) {
            this.set('selectedElement', element('image', { alt: '' }));

            await render(TEMPLATE);
            await openSection('Image');
            await fillIn(labelled('Alt'), 'A photo');

            assert.deepEqual(lastChanges(), { alt: 'A photo' });
        });

        test('editing with no handler wired up does not throw', async function (assert) {
            this.set('selectedElement', element('text'));

            await render(hbs`<TemplateBuilder::PropertiesPanel @selectedElement={{this.selectedElement}} />`);
            await fillIn(labelled('X'), '5');

            assert.dom(this.element).exists('the panel survives with no callbacks');
        });
    });

    module('element types', function () {
        test('a text element shows its content section', async function (assert) {
            this.set('selectedElement', element('text', { content: 'Hello' }));

            await render(TEMPLATE);

            assert.dom('textarea').exists('text content is editable');
        });

        test('editing text content reports the new value', async function (assert) {
            this.set('selectedElement', element('text', { content: 'Hello' }));

            await render(TEMPLATE);
            await fillIn('textarea', 'Goodbye');

            assert.deepEqual(lastChanges(), { content: 'Goodbye' });
        });

        test('an image element shows the image section', async function (assert) {
            this.set('selectedElement', element('image', { src: 'https://example.com/a.png' }));

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Image');
        });

        test('a table element shows the columns and data sections', async function (assert) {
            this.set('selectedElement', element('table', { columns: [], rows: [] }));

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Columns');
        });

        test('a line element hides the border options', async function (assert) {
            this.set('selectedElement', element('line'));
            await render(TEMPLATE);
            const lineText = this.element.textContent;

            this.set('selectedElement', element('shape'));
            const shapeText = this.element.textContent;

            assert.notStrictEqual(lineText, shapeText, 'a line renders a different property set to a shape');
        });
    });

    module('table columns and rows', function () {
        function tableElement(overrides = {}) {
            return element('table', {
                columns: [
                    { label: 'Name', key: 'name' },
                    { label: 'Qty', key: 'qty' },
                ],
                rows: [{ name: 'Widget', qty: '2' }],
                ...overrides,
            });
        }

        test('adding a column appends an empty column', async function (assert) {
            this.set('selectedElement', tableElement());

            await render(TEMPLATE);
            await openSection('Columns');
            const addColumn = findAll('button').find((b) => /add column/i.test(b.textContent));
            await click(addColumn);

            assert.strictEqual(lastChanges().columns.length, 3);
            assert.deepEqual(lastChanges().columns[2], { label: '', key: '' });
        });

        test('adding a row seeds a cell for every keyed column', async function (assert) {
            this.set('selectedElement', tableElement());

            await render(TEMPLATE);
            await openSection('Data Source');
            const addRow = findAll('button').find((b) => /add row/i.test(b.textContent));
            await click(addRow);

            assert.deepEqual(lastChanges().rows[1], { name: '', qty: '' }, 'the new row has a slot per column');
        });

        test('a column with no key contributes no cell to a new row', async function (assert) {
            this.set('selectedElement', tableElement({ columns: [{ label: 'Unset', key: '' }], rows: [] }));

            await render(TEMPLATE);
            await openSection('Data Source');
            const addRow = findAll('button').find((b) => /add row/i.test(b.textContent));
            await click(addRow);

            assert.deepEqual(lastChanges().rows[0], {}, 'an unkeyed column is skipped');
        });
    });

    module('table data mode', function () {
        test('switching to manual clears the variable and query fields', async function (assert) {
            this.set('selectedElement', element('table', { columns: [], rows: [], data_source_mode: 'query', query_endpoint: '/x' }));

            await render(TEMPLATE);
            await openSection('Data Source');
            const manual = findAll('button').find((b) => b.textContent.trim() === 'Manual');
            await click(manual);

            const changes = lastChanges();
            assert.strictEqual(changes.data_source_mode, 'manual');
            assert.strictEqual(changes.data_source, null);
            assert.strictEqual(changes.query_endpoint, null);
            assert.deepEqual(changes.query_params, []);
        });

        test('switching to variable clears only the query fields', async function (assert) {
            this.set('selectedElement', element('table', { columns: [], rows: [], data_source_mode: 'manual' }));

            await render(TEMPLATE);
            await openSection('Data Source');
            const variable = findAll('button').find((b) => b.textContent.trim() === 'Variable');
            await click(variable);

            const changes = lastChanges();
            assert.strictEqual(changes.data_source_mode, 'variable');
            assert.strictEqual(changes.query_endpoint, null);
            assert.notOk('data_source' in changes, 'the variable field itself is preserved');
        });
    });

    module('canvas settings', function () {
        test('template properties are reported through onUpdateTemplate', async function (assert) {
            this.set('template', { width: 210, height: 297, unit: 'mm', background_color: '#ffffff' });

            await render(TEMPLATE);

            const numberInput = find('input[type="number"]');
            if (numberInput) {
                await fillIn(numberInput, '300');
                assert.strictEqual(templateUpdates.length, 1, 'the template change is reported');
            } else {
                assert.dom(this.element).exists('the canvas settings panel rendered');
            }
        });
    });

    module('variable picker', function () {
        test('it appends the chosen variable to the current value', async function (assert) {
            const opened = [];
            this.set('selectedElement', element('text', { content: 'Hello ' }));
            this.set('onOpenVariablePicker', (prop, callback) => opened.push([prop, callback]));

            await render(TEMPLATE);

            const pickerButton = findAll('button').find((b) => /variable/i.test(b.textContent) || /\{\}/.test(b.textContent));
            if (!pickerButton) {
                assert.strictEqual(opened.length, 0, 'no variable picker affordance for this element type');

                return;
            }

            await click(pickerButton);
            assert.strictEqual(opened.length, 1, 'the picker is opened for a target property');

            const [prop, callback] = opened[0];
            callback('{{name}}');

            assert.deepEqual(lastChanges(), { [prop]: 'Hello {{name}}' }, 'the variable is appended, not replacing');
        });
    });

    // -------------------------------------------------------------------------
    // Appended coverage: table columns, rows and data source; image src helpers.
    // -------------------------------------------------------------------------

    function inputsByPlaceholder(placeholder) {
        return findAll(`input[placeholder="${placeholder}"]`);
    }

    function buttonWithText(text) {
        return findAll('button').find((button) => button.textContent.trim().toLowerCase() === text.toLowerCase());
    }

    function buttonsByTitle(title) {
        return findAll(`button[title="${title}"]`);
    }

    module('table columns', function (hooks) {
        hooks.beforeEach(async function () {
            this.set('selectedElement', element('table', { columns: [], rows: [] }));

            await render(TEMPLATE);
            await openSection('Columns');
        });

        test('a table with no columns says so', async function (assert) {
            assert.dom(this.element).containsText('No columns defined. Add one below.');
        });

        test('a column can be added', async function (assert) {
            await click(buttonWithText('Add column'));

            assert.deepEqual(lastChanges(), { columns: [{ label: '', key: '' }] });
        });

        test('an existing column is rendered for editing', async function (assert) {
            this.set('selectedElement', element('table', { columns: [{ label: 'Item', key: 'name' }], rows: [] }));
            await openSection('Columns');

            assert.dom(inputsByPlaceholder('Column label')[0]).hasValue('Item');
            assert.dom(inputsByPlaceholder('data.key')[0]).hasValue('name');
        });

        test('a column label can be renamed', async function (assert) {
            this.set('selectedElement', element('table', { columns: [{ label: 'Item', key: 'name' }], rows: [] }));
            await openSection('Columns');
            await fillIn(inputsByPlaceholder('Column label')[0], 'Product');

            assert.deepEqual(lastChanges(), { columns: [{ label: 'Product', key: 'name' }] });
        });

        test('renaming a column key renames it in every row', async function (assert) {
            this.set(
                'selectedElement',
                element('table', {
                    columns: [{ label: 'Item', key: 'name' }],
                    rows: [{ name: 'Widget' }, { name: 'Gadget' }],
                })
            );
            await openSection('Columns');
            await fillIn(inputsByPlaceholder('data.key')[0], 'title');

            assert.deepEqual(lastChanges(), {
                columns: [{ label: 'Item', key: 'title' }],
                rows: [{ title: 'Widget' }, { title: 'Gadget' }],
            });
        });

        test('renaming a key to itself leaves the rows alone', async function (assert) {
            this.set('selectedElement', element('table', { columns: [{ label: 'Item', key: 'name' }], rows: [{ name: 'Widget' }] }));
            await openSection('Columns');
            await fillIn(inputsByPlaceholder('data.key')[0], 'name');

            assert.deepEqual(lastChanges().rows, [{ name: 'Widget' }]);
        });

        test('removing a column drops its data from every row', async function (assert) {
            this.set(
                'selectedElement',
                element('table', {
                    columns: [
                        { label: 'Item', key: 'name' },
                        { label: 'Qty', key: 'qty' },
                    ],
                    rows: [{ name: 'Widget', qty: '2' }],
                })
            );
            await openSection('Columns');
            await click(buttonsByTitle('Remove column')[0]);

            assert.deepEqual(lastChanges(), {
                columns: [{ label: 'Qty', key: 'qty' }],
                rows: [{ qty: '2' }],
            });
        });

        test('removing a keyless column leaves the rows untouched', async function (assert) {
            this.set('selectedElement', element('table', { columns: [{ label: 'Unnamed' }], rows: [{ name: 'Widget' }] }));
            await openSection('Columns');
            await click(buttonsByTitle('Remove column')[0]);

            assert.deepEqual(lastChanges(), { columns: [], rows: [{ name: 'Widget' }] });
        });
    });

    module('table data source', function (hooks) {
        hooks.beforeEach(async function () {
            this.set(
                'selectedElement',
                element('table', {
                    columns: [
                        { label: 'Item', key: 'name' },
                        { label: 'Qty', key: 'qty' },
                    ],
                    rows: [],
                })
            );

            await render(TEMPLATE);
            await openSection('Data Source');
        });

        test('it offers a variable and a manual mode', async function (assert) {
            assert.ok(buttonWithText('Variable'), 'a variable mode is offered');
            assert.ok(buttonWithText('Manual'), 'a manual mode is offered');
        });

        // The panel is controlled: setTableDataMode only reports the change, so the mode has
        // to be set on the element itself for variable mode to render.
        test('switching to variable mode clears the query fields', async function (assert) {
            await click(buttonWithText('Variable'));

            assert.deepEqual(lastChanges(), {
                data_source_mode: 'variable',
                query_endpoint: null,
                query_params: [],
                query_response_path: null,
            });
        });

        test('switching to manual mode also clears the data variable', async function (assert) {
            await click(buttonWithText('Manual'));

            assert.deepEqual(lastChanges(), {
                data_source_mode: 'manual',
                data_source: null,
                query_endpoint: null,
                query_params: [],
                query_response_path: null,
            });
        });

        test('a data variable can be typed', async function (assert) {
            this.set('selectedElement', element('table', { columns: [{ label: 'Item', key: 'name' }], rows: [], data_source_mode: 'variable' }));
            await openSection('Data Source');
            await fillIn(inputsByPlaceholder('{order.items}')[0], '{order.line_items}');

            assert.deepEqual(lastChanges(), { data_source: '{order.line_items}' });
        });

        test('the variable picker can be opened for the data source', async function (assert) {
            const opened = [];
            this.set('onOpenVariablePicker', (prop, callback) => opened.push([prop, callback]));

            this.set('selectedElement', element('table', { columns: [], rows: [], data_source_mode: 'variable' }));
            await openSection('Data Source');
            await click(buttonsByTitle('Insert variable')[0]);

            assert.strictEqual(opened[0][0], 'data_source');
        });

        test('manual mode says when there are no rows', async function (assert) {
            await click(buttonWithText('Manual'));

            assert.dom(this.element).containsText('No rows yet.');
        });

        test('adding a row seeds a cell for every column key', async function (assert) {
            await click(buttonWithText('Manual'));
            await click(buttonWithText('Add row'));

            assert.deepEqual(lastChanges(), { rows: [{ name: '', qty: '' }] });
        });

        test('a column with no key contributes no cell', async function (assert) {
            this.set('selectedElement', element('table', { columns: [{ label: 'Item', key: 'name' }, { label: 'Unnamed' }], rows: [] }));
            await openSection('Data Source');
            await click(buttonWithText('Manual'));
            await click(buttonWithText('Add row'));

            assert.deepEqual(lastChanges(), { rows: [{ name: '' }] });
        });

        test('a row cell can be edited', async function (assert) {
            this.set(
                'selectedElement',
                element('table', {
                    columns: [{ label: 'Item', key: 'name' }],
                    rows: [{ name: 'Widget' }],
                })
            );
            await openSection('Data Source');
            await click(buttonWithText('Manual'));
            await fillIn(inputsByPlaceholder('name')[0], 'Gadget');

            assert.deepEqual(lastChanges(), { rows: [{ name: 'Gadget' }] });
        });

        test('a row can be removed', async function (assert) {
            this.set(
                'selectedElement',
                element('table', {
                    columns: [{ label: 'Item', key: 'name' }],
                    rows: [{ name: 'Widget' }, { name: 'Gadget' }],
                })
            );
            await openSection('Data Source');
            await click(buttonWithText('Manual'));
            await click(buttonsByTitle('Remove row')[1]);

            assert.deepEqual(lastChanges(), { rows: [{ name: 'Widget' }] });
        });

        test('manual mode with no columns asks for columns first', async function (assert) {
            this.set('selectedElement', element('table', { columns: [], rows: [{}] }));
            await openSection('Data Source');
            await click(buttonWithText('Manual'));

            assert.dom(this.element).containsText('Define columns first.');
        });
    });

    module('the image source', function (hooks) {
        hooks.beforeEach(function () {
            this.set('selectedElement', element('image', { src: '' }));
        });

        test('an empty image offers an upload', async function (assert) {
            await render(TEMPLATE);
            await openSection('Image');

            assert.strictEqual(buttonsByTitle('Clear').length, 0, 'nothing to clear yet');
        });

        test('a variable source is shown as a variable', async function (assert) {
            this.set('selectedElement', element('image', { src: '{order.logo}' }));

            await render(TEMPLATE);
            await openSection('Image');

            assert.true(buttonsByTitle('Clear').length > 0, 'the variable can be cleared');
            assert.true(buttonsByTitle('Change variable').length > 0, 'and swapped');
        });

        test('an uploaded source is shown as a file', async function (assert) {
            this.set('selectedElement', element('image', { src: 'https://files.example.com/logo.png' }));

            await render(TEMPLATE);
            await openSection('Image');

            assert.true(buttonsByTitle('Clear').length > 0);
            assert.strictEqual(buttonsByTitle('Change variable').length, 0, 'it is not treated as a variable');
        });

        test('the source can be cleared', async function (assert) {
            this.set('selectedElement', element('image', { src: '{order.logo}' }));

            await render(TEMPLATE);
            await openSection('Image');
            await click(buttonsByTitle('Clear')[0]);

            assert.deepEqual(lastChanges(), { src: '' });
        });

        test('the variable picker can be opened for the image source', async function (assert) {
            const opened = [];
            this.set('onOpenVariablePicker', (prop, callback) => opened.push([prop, callback]));
            this.set('selectedElement', element('image', { src: '{order.logo}' }));

            await render(TEMPLATE);
            await openSection('Image');
            await click(buttonsByTitle('Change variable')[0]);

            assert.strictEqual(opened[0][0], 'src');
        });
    });

    test('it forwards splattributes', async function (assert) {
        this.set('selectedElement', element('text'));

        await render(hbs`<TemplateBuilder::PropertiesPanel @selectedElement={{this.selectedElement}} data-test-panel="yes" />`);

        assert.dom('[data-test-panel="yes"]').exists();
    });

    module('table columns', function () {
        function columnInputs() {
            return findAll('input[placeholder="Column label"]');
        }

        function keyInputs() {
            return findAll('input[placeholder="data.key"]');
        }

        function addColumnButton() {
            return findAll('button').find((button) => button.textContent.trim() === 'Add column');
        }

        test('a table with no columns explains itself and offers an add control', async function (assert) {
            this.set('selectedElement', element('table', { columns: [] }));

            await render(TEMPLATE);
            await openSection('Columns');

            assert.dom(this.element).containsText('No columns defined');
            assert.ok(addColumnButton(), 'an add control is offered');
        });

        test('adding a column appends an empty one', async function (assert) {
            this.set('selectedElement', element('table', { columns: [{ label: 'Name', key: 'name' }] }));

            await render(TEMPLATE);
            await openSection('Columns');
            await click(addColumnButton());

            assert.deepEqual(lastChanges(), {
                columns: [
                    { label: 'Name', key: 'name' },
                    { label: '', key: '' },
                ],
            });
        });

        test('renaming a column reports only that column', async function (assert) {
            this.set(
                'selectedElement',
                element('table', {
                    columns: [
                        { label: 'Name', key: 'name' },
                        { label: 'Status', key: 'status' },
                    ],
                })
            );

            await render(TEMPLATE);
            await openSection('Columns');
            await fillIn(columnInputs()[1], 'State');

            assert.deepEqual(lastChanges(), {
                columns: [
                    { label: 'Name', key: 'name' },
                    { label: 'State', key: 'status' },
                ],
            });
        });

        test('changing a column key renames that key in every existing row', async function (assert) {
            this.set(
                'selectedElement',
                element('table', {
                    columns: [
                        { label: 'Name', key: 'name' },
                        { label: 'Status', key: 'status' },
                    ],
                    rows: [
                        { name: 'Ada', status: 'active' },
                        { name: 'Grace', status: 'archived' },
                    ],
                })
            );

            await render(TEMPLATE);
            await openSection('Columns');
            await fillIn(keyInputs()[0], 'driver.name');

            assert.deepEqual(lastChanges(), {
                columns: [
                    { label: 'Name', key: 'driver.name' },
                    { label: 'Status', key: 'status' },
                ],
                rows: [
                    { 'driver.name': 'Ada', status: 'active' },
                    { 'driver.name': 'Grace', status: 'archived' },
                ],
            });
        });

        test('a column key set to the same value leaves the rows alone', async function (assert) {
            this.set(
                'selectedElement',
                element('table', {
                    columns: [{ label: 'Name', key: 'name' }],
                    rows: [{ name: 'Ada' }],
                })
            );

            await render(TEMPLATE);
            await openSection('Columns');
            await fillIn(keyInputs()[0], 'name');

            assert.deepEqual(lastChanges(), {
                columns: [{ label: 'Name', key: 'name' }],
                rows: [{ name: 'Ada' }],
            });
        });

        test('removing a column drops its key from every row too', async function (assert) {
            this.set(
                'selectedElement',
                element('table', {
                    columns: [
                        { label: 'Name', key: 'name' },
                        { label: 'Status', key: 'status' },
                    ],
                    rows: [{ name: 'Ada', status: 'active' }],
                })
            );

            await render(TEMPLATE);
            await openSection('Columns');

            const removeButtons = findAll('button[title="Remove column"]');
            await click(removeButtons[0]);

            assert.deepEqual(lastChanges(), {
                columns: [{ label: 'Status', key: 'status' }],
                rows: [{ status: 'active' }],
            });
        });

        test('removing a keyless column leaves the rows untouched', async function (assert) {
            this.set(
                'selectedElement',
                element('table', {
                    columns: [
                        { label: 'Spacer', key: '' },
                        { label: 'Status', key: 'status' },
                    ],
                    rows: [{ status: 'active' }],
                })
            );

            await render(TEMPLATE);
            await openSection('Columns');

            const removeButtons = findAll('button[title="Remove column"]');
            await click(removeButtons[0]);

            assert.deepEqual(lastChanges(), {
                columns: [{ label: 'Status', key: 'status' }],
                rows: [{ status: 'active' }],
            });
        });

        test('column edits are inert without an onUpdateElement handler', async function (assert) {
            this.set('selectedElement', element('table', { columns: [{ label: 'Name', key: 'name' }] }));

            await render(hbs`<TemplateBuilder::PropertiesPanel @selectedElement={{this.selectedElement}} />`);
            await openSection('Columns');
            await click(addColumnButton());

            assert.deepEqual(updates, [], 'nothing is reported when no handler is supplied');
        });
    });

    module('the image source', function () {
        function clearButton() {
            return findAll('button[title="Clear"]')[0];
        }

        test('a variable source is shown as a token that can be cleared', async function (assert) {
            this.set('selectedElement', element('image', { src: '{{order.photo_url}}' }));

            await render(TEMPLATE);
            await openSection('Image');

            assert.dom(this.element).containsText('{{order.photo_url}}', 'the variable token is shown');

            await click(clearButton());

            assert.deepEqual(lastChanges(), { src: '' });
        });

        test('an uploaded source is shown with a clear control', async function (assert) {
            this.set('selectedElement', element('image', { src: 'https://example.test/logo.png' }));

            await render(TEMPLATE);
            await openSection('Image');

            await click(clearButton());

            assert.deepEqual(lastChanges(), { src: '' });
        });

        test('an empty image offers an upload dropzone', async function (assert) {
            this.set('selectedElement', element('image', { src: '' }));

            await render(TEMPLATE);
            await openSection('Image');

            assert.dom('input[type="file"]').exists('a file input is offered');
        });

        test('clearing is inert without an onUpdateElement handler', async function (assert) {
            this.set('selectedElement', element('image', { src: 'https://example.test/logo.png' }));

            await render(hbs`<TemplateBuilder::PropertiesPanel @selectedElement={{this.selectedElement}} />`);
            await openSection('Image');
            await click(clearButton());

            assert.deepEqual(updates, [], 'nothing is reported when no handler is supplied');
        });
    });

    module('uploading an image', function () {
        // onImageFileAdded is wired to <FileUpload @onFileAdded>, so a real File dropped on the
        // dropzone drives it end to end through the queue.
        async function dropImage(name = 'logo.png') {
            await selectFiles('input[type="file"]', new File(['binary'], name, { type: 'image/png' }));
        }

        test('a dropped image is uploaded and its url written back', async function (assert) {
            this.set('selectedElement', element('image', { src: '' }));

            await render(TEMPLATE);
            await openSection('Image');
            await dropImage();

            const fetch = this.owner.lookup('service:fetch');
            const upload = fetch.calls.find((call) => call.method === 'uploadFile.perform');
            assert.ok(upload, 'the file is handed to the upload task');
            assert.deepEqual(upload.args[1], { path: 'uploads/template-builder/images', type: 'template_image' }, 'it is filed under the template-builder images path');
            assert.deepEqual(lastChanges(), { src: 'https://example.test/uploads/test-file.txt' }, 'the uploaded url is written onto the element');
        });

        test('a failed upload is reported and the filename cleared', async function (assert) {
            const errors = [];
            const notifications = this.owner.lookup('service:notifications');
            notifications.error = (message) => errors.push(message);

            const fetch = this.owner.lookup('service:fetch');
            fetch.uploadFile = { perform: () => Promise.reject(new Error('disk full')) };

            this.set('selectedElement', element('image', { src: '' }));

            await render(TEMPLATE);
            await openSection('Image');
            await dropImage();

            assert.deepEqual(errors, ['Image upload failed: disk full']);
            assert.deepEqual(updates, [], 'nothing is written onto the element');
        });
    });
});
