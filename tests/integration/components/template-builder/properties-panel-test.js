import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectFiles } from 'ember-file-upload/test-support';
import Service from '@ember/service';

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

            const nameInput = find('input[type="text"].tb-input');
            assert.ok(nameInput, 'the canvas settings panel offers a template name field');

            await fillIn(nameInput, 'Invoice A4');

            assert.strictEqual(templateUpdates.length, 1, 'the template change is reported');
            assert.strictEqual(templateUpdates[0].name, 'Invoice A4', 'with the new value');
        });
    });

    module('variable picker', function () {
        test('it appends the chosen variable to the current value', async function (assert) {
            const opened = [];
            this.set('selectedElement', element('text', { content: 'Hello ' }));
            this.set('onOpenVariablePicker', (prop, callback) => opened.push([prop, callback]));

            await render(TEMPLATE);

            const pickerButton = findAll('button').find((b) => /variable/i.test(b.textContent) || /\{\}/.test(b.textContent));
            assert.ok(pickerButton, 'a text element offers a variable picker affordance');

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

    // Query mode fetches an arbitrary Fleetbase API path. It is deliberately a
    // different mechanism from the saved queries the queries panel manages —
    // those are reached through Variable mode, under `__queries__`.
    module('table query mode', function (hooks) {
        let requests;
        let respond;

        function queryElement(overrides = {}) {
            return element('table', {
                columns: [],
                rows: [],
                data_source_mode: 'query',
                query_endpoint: 'int/v1/orders',
                ...overrides,
            });
        }

        hooks.beforeEach(function () {
            requests = [];
            respond = () => [];

            this.owner.unregister('service:fetch');
            this.owner.register(
                'service:fetch',
                class extends Service {
                    get(path, params, options) {
                        requests.push({ path, params, options });
                        return Promise.resolve(respond(path, params));
                    }
                }
            );
        });

        async function renderQueryMode(context, overrides = {}) {
            context.set('selectedElement', queryElement(overrides));
            await render(TEMPLATE);
            await openSection('Data Source');
        }

        function testButton() {
            return find('.tb-query-test');
        }

        module('the mode toggle', function () {
            test('the data source toggle offers a query mode', async function (assert) {
                await renderQueryMode(this);

                assert.ok(buttonWithText('Query'), 'a query mode is offered alongside variable and manual');
            });

            test('switching to query clears the data variable and seeds the params array', async function (assert) {
                this.set('selectedElement', element('table', { columns: [], rows: [], data_source_mode: 'variable', data_source: '{order.items}' }));
                await render(TEMPLATE);
                await openSection('Data Source');
                await click(buttonWithText('Query'));

                assert.deepEqual(lastChanges(), {
                    data_source_mode: 'query',
                    data_source: null,
                    query_params: [],
                });
            });

            test('switching to query leaves params that are already there alone', async function (assert) {
                this.set('selectedElement', element('table', { columns: [], rows: [], data_source_mode: 'manual', query_params: [{ key: 'status', value: 'completed' }] }));
                await render(TEMPLATE);
                await openSection('Data Source');
                await click(buttonWithText('Query'));

                assert.deepEqual(lastChanges(), { data_source_mode: 'query', data_source: null }, 'no query_params key, so the existing ones survive');
            });

            test('query mode is what the panel shows for a query-backed table', async function (assert) {
                await renderQueryMode(this);

                assert.ok(find('.tb-query-endpoint'), 'the endpoint field is shown');
                assert.notOk(inputsByPlaceholder('{order.items}').length, 'the variable field is not');
            });
        });

        module('the endpoint field', function () {
            test('an endpoint can be typed', async function (assert) {
                await renderQueryMode(this, { query_endpoint: '' });
                await fillIn('.tb-query-endpoint', 'int/v1/reports/revenue');

                assert.deepEqual(lastChanges(), { query_endpoint: 'int/v1/reports/revenue' });
            });

            test('a relative path is accepted without complaint', async function (assert) {
                await renderQueryMode(this, { query_endpoint: 'int/v1/orders' });

                assert.notOk(find('.tb-query-endpoint-error'), 'no error is shown');
                assert.dom(this.element).containsText('A path on the Fleetbase API');
            });

            test('a full URL is rejected, because the request would carry the session', async function (assert) {
                await renderQueryMode(this, { query_endpoint: 'https://evil.example.com/orders' });

                assert.dom('.tb-query-endpoint-error').containsText('not a full URL');
                assert.dom('.tb-query-endpoint-error').containsText('session credentials');
            });

            test('a protocol-relative URL is rejected too', async function (assert) {
                await renderQueryMode(this, { query_endpoint: '//evil.example.com/orders' });

                assert.dom('.tb-query-endpoint-error').exists('a leading // is still another host');
            });

            test('an empty endpoint is not reported as an error until it is tested', async function (assert) {
                await renderQueryMode(this, { query_endpoint: '   ' });

                assert.notOk(find('.tb-query-endpoint-error'), 'nothing to correct yet');
            });
        });

        module('query parameters', function () {
            test('an element with no params says so', async function (assert) {
                await renderQueryMode(this);

                assert.dom(this.element).containsText('No parameters.');
            });

            test('a parameter can be added', async function (assert) {
                await renderQueryMode(this);
                await click(buttonWithText('Add parameter'));

                assert.deepEqual(lastChanges(), { query_params: [{ key: '', value: '' }] });
            });

            test('a parameter is appended to the ones already there', async function (assert) {
                await renderQueryMode(this, { query_params: [{ key: 'status', value: 'completed' }] });
                await click(buttonWithText('Add parameter'));

                assert.deepEqual(lastChanges(), {
                    query_params: [
                        { key: 'status', value: 'completed' },
                        { key: '', value: '' },
                    ],
                });
            });

            test('a parameter key can be edited', async function (assert) {
                await renderQueryMode(this, { query_params: [{ key: 'status', value: 'completed' }] });
                await fillIn(findAll('.tb-query-param-key')[0], 'state');

                assert.deepEqual(lastChanges(), { query_params: [{ key: 'state', value: 'completed' }] });
            });

            test('a parameter value can be edited', async function (assert) {
                await renderQueryMode(this, { query_params: [{ key: 'status', value: 'completed' }] });
                await fillIn(findAll('.tb-query-param-value')[0], '{order.status}');

                assert.deepEqual(lastChanges(), { query_params: [{ key: 'status', value: '{order.status}' }] });
            });

            test('editing one parameter leaves the others alone', async function (assert) {
                await renderQueryMode(this, {
                    query_params: [
                        { key: 'status', value: 'completed' },
                        { key: 'limit', value: '10' },
                    ],
                });
                await fillIn(findAll('.tb-query-param-value')[1], '25');

                assert.deepEqual(lastChanges(), {
                    query_params: [
                        { key: 'status', value: 'completed' },
                        { key: 'limit', value: '25' },
                    ],
                });
            });

            test('a parameter can be removed', async function (assert) {
                await renderQueryMode(this, {
                    query_params: [
                        { key: 'status', value: 'completed' },
                        { key: 'limit', value: '10' },
                    ],
                });
                await click(buttonsByTitle('Remove parameter')[0]);

                assert.deepEqual(lastChanges(), { query_params: [{ key: 'limit', value: '10' }] });
            });
        });

        module('the response path field', function () {
            test('a response path can be typed', async function (assert) {
                await renderQueryMode(this);
                await fillIn('.tb-query-response-path', 'data.results');

                assert.deepEqual(lastChanges(), { query_response_path: 'data.results' });
            });
        });

        module('testing the query', function () {
            test('a successful test reports the row count', async function (assert) {
                respond = () => [{ id: 1 }, { id: 2 }];
                await renderQueryMode(this);
                await click(testButton());

                assert.dom('.tb-query-test-result').containsText('Returned 2 rows.');
            });

            test('a single row is reported in the singular', async function (assert) {
                respond = () => [{ id: 1 }];
                await renderQueryMode(this);
                await click(testButton());

                assert.dom('.tb-query-test-result').containsText('Returned 1 row.');
            });

            test('the endpoint is sent to the fetch service with its leading slash stripped', async function (assert) {
                await renderQueryMode(this, { query_endpoint: '  /int/v1/orders  ' });
                await click(testButton());

                assert.strictEqual(requests.length, 1, 'exactly one request is made');
                assert.strictEqual(requests[0].path, 'int/v1/orders');
            });

            test('named parameters are sent as the query string', async function (assert) {
                await renderQueryMode(this, {
                    query_params: [
                        { key: ' status ', value: 'completed' },
                        { key: 'limit', value: '10' },
                    ],
                });
                await click(testButton());

                assert.deepEqual(requests[0].params, { status: 'completed', limit: '10' });
            });

            test('a parameter with no key is not sent', async function (assert) {
                await renderQueryMode(this, {
                    query_params: [{ key: '', value: 'blank' }, { value: 'keyless' }, { key: '   ', value: 'whitespace' }, { key: 'limit', value: '10' }],
                });
                await click(testButton());

                assert.deepEqual(requests[0].params, { limit: '10' });
            });

            test('a parameter with no value at all is sent as an empty string', async function (assert) {
                await renderQueryMode(this, { query_params: [{ key: 'status' }] });
                await click(testButton());

                assert.deepEqual(requests[0].params, { status: '' });
            });

            test('a parameter still holding a variable token is left out and named', async function (assert) {
                await renderQueryMode(this, {
                    query_params: [
                        { key: 'order', value: '{order.uuid}' },
                        { key: 'limit', value: '10' },
                    ],
                });
                await click(testButton());

                assert.deepEqual(requests[0].params, { limit: '10' }, 'the token cannot be resolved here, so it is not sent');
                assert.dom('.tb-query-test-skipped').containsText('order');
            });

            test('a test with nothing skipped says nothing about skipping', async function (assert) {
                await renderQueryMode(this, { query_params: [{ key: 'limit', value: '10' }] });
                await click(testButton());

                assert.notOk(find('.tb-query-test-skipped'));
            });

            test('testing an empty endpoint asks for one rather than firing a request', async function (assert) {
                await renderQueryMode(this, { query_endpoint: '' });
                await click(testButton());

                assert.dom('.tb-query-test-error').containsText('Enter an API endpoint');
                assert.strictEqual(requests.length, 0, 'no request is made');
            });

            test('testing an element that has never had an endpoint asks for one too', async function (assert) {
                await renderQueryMode(this, { query_endpoint: undefined });
                await click(testButton());

                assert.dom('.tb-query-test-error').containsText('Enter an API endpoint');
                assert.strictEqual(requests.length, 0);
            });

            test('testing a full URL refuses rather than firing a request', async function (assert) {
                await renderQueryMode(this, { query_endpoint: 'https://evil.example.com/orders' });
                await click(testButton());

                assert.dom('.tb-query-test-error').containsText('not a full URL');
                assert.strictEqual(requests.length, 0, 'the session is never sent to another host');
            });

            test('the button reports that a test is in flight', async function (assert) {
                let release;
                respond = () => new Promise((resolve) => (release = resolve));

                await renderQueryMode(this);
                await click(testButton());

                assert.dom('.tb-query-test').containsText('Testing');
                assert.dom('.tb-query-test').isDisabled();

                release([{ id: 1 }]);
                await settled();

                assert.dom('.tb-query-test').containsText('Test query', 'and stops when it lands');
                assert.dom('.tb-query-test').isNotDisabled();
            });

            test('a rejected request is reported with its message', async function (assert) {
                respond = () => Promise.reject(new Error('403 Forbidden'));
                await renderQueryMode(this);
                await click(testButton());

                assert.dom('.tb-query-test-error').containsText('The request failed: 403 Forbidden');
                assert.dom('.tb-query-test').isNotDisabled('the in-flight state is cleared');
            });

            test('a rejection with no message still reports a failure', async function (assert) {
                respond = () => Promise.reject(new Error(''));
                await renderQueryMode(this);
                await click(testButton());

                assert.dom('.tb-query-test-error').hasText('The request failed.');
            });

            test('a rejection that is not an error at all still reports a failure', async function (assert) {
                respond = () => Promise.reject();
                await renderQueryMode(this);
                await click(testButton());

                assert.dom('.tb-query-test-error').hasText('The request failed.');
            });

            test('a later test replaces the earlier error', async function (assert) {
                respond = () => Promise.reject(new Error('boom'));
                await renderQueryMode(this);
                await click(testButton());
                assert.dom('.tb-query-test-error').exists();

                respond = () => [{ id: 1 }];
                await click(testButton());

                assert.notOk(find('.tb-query-test-error'), 'the stale error is gone');
                assert.dom('.tb-query-test-result').containsText('Returned 1 row.');
            });
        });

        module('resolving the response path', function () {
            test('a dotted path is walked into the response', async function (assert) {
                respond = () => ({ data: { results: [{ id: 1 }, { id: 2 }, { id: 3 }] } });
                await renderQueryMode(this, { query_response_path: 'data.results' });
                await click(testButton());

                assert.dom('.tb-query-test-result').containsText('Returned 3 rows.');
            });

            test('surrounding whitespace in the path is ignored', async function (assert) {
                respond = () => ({ data: { results: [{ id: 1 }] } });
                await renderQueryMode(this, { query_response_path: '  data . results  ' });
                await click(testButton());

                assert.dom('.tb-query-test-result').containsText('Returned 1 row.');
            });

            test('a missing segment is named', async function (assert) {
                respond = () => ({ data: {} });
                await renderQueryMode(this, { query_response_path: 'data.results' });
                await click(testButton());

                assert.dom('.tb-query-test-error').containsText('no "results" under "data"');
            });

            test('a missing first segment says it is missing from the response', async function (assert) {
                respond = () => ({ other: [] });
                await renderQueryMode(this, { query_response_path: 'data' });
                await click(testButton());

                assert.dom('.tb-query-test-error').containsText('no "data" in the response');
            });

            test('a path that runs into a primitive says where it stopped', async function (assert) {
                respond = () => ({ data: 'nope' });
                await renderQueryMode(this, { query_response_path: 'data.results' });
                await click(testButton());

                assert.dom('.tb-query-test-error').containsText('"data" is a string, not an object');
            });

            test('a path against a null response body says so', async function (assert) {
                respond = () => null;
                await renderQueryMode(this, { query_response_path: 'data' });
                await click(testButton());

                assert.dom('.tb-query-test-error').containsText('the response body is null, not an object');
            });

            test('a path against an empty response body says so', async function (assert) {
                respond = () => undefined;
                await renderQueryMode(this, { query_response_path: 'data' });
                await click(testButton());

                assert.dom('.tb-query-test-error').containsText('the response body is nothing, not an object');
            });

            test('a path that lands on something other than an array is named', async function (assert) {
                respond = () => ({ data: { count: 4 } });
                await renderQueryMode(this, { query_response_path: 'data' });
                await click(testButton());

                assert.dom('.tb-query-test-error').containsText('Expected an array of rows at "data", got an object.');
            });

            test('a response that is not an array, with no path, is named too', async function (assert) {
                respond = () => ({ count: 4 });
                await renderQueryMode(this, { query_response_path: '' });
                await click(testButton());

                assert.dom('.tb-query-test-error').containsText('Expected an array of rows in the response, got an object.');
            });

            test('an element with no response path at all treats the body as the rows', async function (assert) {
                respond = () => [{ id: 1 }, { id: 2 }];
                await renderQueryMode(this);
                await click(testButton());

                assert.dom('.tb-query-test-result').containsText('Returned 2 rows.');
            });
        });

        module('discovered columns', function () {
            test('the keys of the returned rows are listed', async function (assert) {
                respond = () => [{ id: 1, name: 'Widget' }];
                await renderQueryMode(this);
                await click(testButton());

                assert.dom('.tb-query-test-keys').containsText('id, name');
            });

            test('keys are the union across rows, in the order first seen', async function (assert) {
                respond = () => [{ id: 1 }, { id: 2, name: 'Widget' }, { name: 'Gadget', qty: 3 }];
                await renderQueryMode(this);
                await click(testButton());

                assert.dom('.tb-query-test-keys').containsText('id, name, qty');
            });

            test('rows that are not plain objects contribute no keys', async function (assert) {
                respond = () => ['a string', null, ['nested'], { id: 1 }];
                await renderQueryMode(this);
                await click(testButton());

                assert.dom('.tb-query-test-keys').hasText('Keys: id');
            });

            test('only the first twenty rows are scanned for keys', async function (assert) {
                const rows = Array.from({ length: 21 }, (_, index) => (index === 20 ? { late: true } : { id: index }));
                respond = () => rows;
                await renderQueryMode(this);
                await click(testButton());

                assert.dom('.tb-query-test-result').containsText('Returned 21 rows.');
                assert.dom('.tb-query-test-keys').hasText('Keys: id', 'the twenty-first row is past the scan limit');
            });

            test('rows with no keys at all offer nothing to apply', async function (assert) {
                respond = () => [{}, {}];
                await renderQueryMode(this);
                await click(testButton());

                assert.dom('.tb-query-test-result').containsText('Returned 2 rows.');
                assert.notOk(find('.tb-query-apply-columns'), 'there is nothing to turn into a column');
            });

            test('an empty result offers nothing to apply', async function (assert) {
                respond = () => [];
                await renderQueryMode(this);
                await click(testButton());

                assert.dom('.tb-query-test-result').containsText('Returned 0 rows.');
                assert.notOk(find('.tb-query-apply-columns'));
            });

            test('the discovered keys can be applied as the table columns', async function (assert) {
                respond = () => [{ id: 1, total_amount: 20, createdAt: 'today' }];
                await renderQueryMode(this);
                await click(testButton());
                await click('.tb-query-apply-columns');

                assert.deepEqual(lastChanges(), {
                    columns: [
                        { label: 'Id', key: 'id' },
                        { label: 'Total Amount', key: 'total_amount' },
                        { label: 'Created At', key: 'createdAt' },
                    ],
                });
            });

            test('applying columns replaces the ones already defined', async function (assert) {
                respond = () => [{ id: 1 }];
                await renderQueryMode(this, { columns: [{ label: 'Old', key: 'old' }] });
                await click(testButton());
                await click('.tb-query-apply-columns');

                assert.deepEqual(lastChanges(), { columns: [{ label: 'Id', key: 'id' }] });
            });
        });

        module('test results and the selection', function () {
            test('switching data mode discards the results', async function (assert) {
                respond = () => [{ id: 1 }];
                await renderQueryMode(this);
                await click(testButton());
                assert.dom('.tb-query-test-result').exists();

                await click(buttonWithText('Query'));

                assert.notOk(find('.tb-query-test-result'), 'the results belonged to the previous configuration');
            });

            test("one element's results are not shown against another", async function (assert) {
                respond = () => [{ id: 1 }];
                await renderQueryMode(this);
                await click(testButton());
                assert.dom('.tb-query-test-result').exists();

                this.set('selectedElement', { ...queryElement(), uuid: 'el-2' });
                await settled();

                assert.notOk(find('.tb-query-test-result'), 'the second table has not been tested');
            });

            test("one element's error is not shown against another", async function (assert) {
                respond = () => Promise.reject(new Error('boom'));
                await renderQueryMode(this);
                await click(testButton());
                assert.dom('.tb-query-test-error').exists();

                this.set('selectedElement', { ...queryElement(), uuid: 'el-2' });
                await settled();

                assert.notOk(find('.tb-query-test-error'));
            });
        });

        module('without an update handler', function () {
            const UNWIRED = hbs`<TemplateBuilder::PropertiesPanel @selectedElement={{this.selectedElement}} />`;

            async function renderUnwired(context, overrides = {}) {
                context.set('selectedElement', queryElement(overrides));
                await render(UNWIRED);
                await openSection('Data Source');
            }

            test('switching mode is inert', async function (assert) {
                await renderUnwired(this);
                await click(buttonWithText('Manual'));

                assert.deepEqual(updates, []);
            });

            test('adding a parameter is inert', async function (assert) {
                await renderUnwired(this);
                await click(buttonWithText('Add parameter'));

                assert.deepEqual(updates, []);
            });

            test('editing a parameter is inert', async function (assert) {
                await renderUnwired(this, { query_params: [{ key: 'status', value: 'completed' }] });
                await fillIn(findAll('.tb-query-param-key')[0], 'state');

                assert.deepEqual(updates, []);
            });

            test('removing a parameter is inert', async function (assert) {
                await renderUnwired(this, { query_params: [{ key: 'status', value: 'completed' }] });
                await click(buttonsByTitle('Remove parameter')[0]);

                assert.deepEqual(updates, []);
            });

            test('applying discovered columns is inert', async function (assert) {
                respond = () => [{ id: 1 }];
                await renderUnwired(this);
                await click(testButton());

                assert.dom('.tb-query-test-result').containsText('Returned 1 row.', 'the query can still be tested');

                await click('.tb-query-apply-columns');

                assert.deepEqual(updates, []);
            });

            test('testing with nothing selected does nothing at all', async function (assert) {
                this.set('selectedElement', queryElement());
                await render(UNWIRED);
                await openSection('Data Source');

                this.set('selectedElement', null);
                await settled();

                assert.notOk(find('.tb-query-test'), 'there is no panel to test from');
                assert.strictEqual(requests.length, 0);
            });
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

    module('table column editing', function () {
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

    module('the image source picker', function () {
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
    // Every table editing action opens with the same guard, and the only way to reach the other
    // side of it is to render the panel with a selection but no @onUpdateElement — the controls
    // are all present and clickable, they just have nowhere to report to.
    module('the table editors without an update handler', function () {
        function buttonWithText(text) {
            return findAll('button').find((button) => button.textContent.trim() === text);
        }

        test('every table control is inert when no handler is supplied', async function (assert) {
            this.set(
                'selectedElement',
                element('table', {
                    columns: [{ label: 'Name', key: 'name' }],
                    rows: [{ name: 'Ada' }],
                })
            );

            await render(hbs`<TemplateBuilder::PropertiesPanel @selectedElement={{this.selectedElement}} />`);

            await openSection('Columns');
            await click(buttonWithText('Add column'));
            await fillIn('input[placeholder="Column label"]', 'Renamed');
            await fillIn('input[placeholder="data.key"]', 'renamed_key');
            await click(find('button[title="Remove column"]'));

            await openSection('Data');
            await click(buttonWithText('Variable'));
            await click(buttonWithText('Manual'));
            await click(buttonWithText('Add row'));
            await click(find('button[title="Remove row"]'));
            const cell = findAll('input[placeholder="name"]')[0];
            if (cell) {
                await fillIn(cell, 'Grace');
            }

            assert.deepEqual(updates, [], 'not one of them reported a change');
        });
    });
    // The remaining guards all sit in front of an optional callback. Each of these renders the
    // panel with the control present but the callback missing, which is the only way to reach
    // the other side of the guard.
    module('the element editors without their handlers', function () {
        test('text and numeric edits are inert without an onUpdateElement handler', async function (assert) {
            this.set('selectedElement', element('text', { content: 'Hello' }));

            await render(hbs`<TemplateBuilder::PropertiesPanel @selectedElement={{this.selectedElement}} />`);
            await openSection('Position');
            await fillIn(labelled('X'), '42');
            await openSection('Content');
            await fillIn('textarea', 'Goodbye');

            assert.deepEqual(updates, [], 'neither edit is reported');
        });

        test('canvas settings are inert without an onUpdateTemplate handler', async function (assert) {
            this.set('template', { width: 210, height: 297, unit: 'mm' });

            await render(hbs`<TemplateBuilder::PropertiesPanel @template={{this.template}} />`);
            const select = find('select');
            if (select) {
                await fillIn(select, select.options[select.options.length - 1].value);
            }

            assert.deepEqual(templateUpdates, [], 'nothing is reported to the template');
        });

        test('the variable buttons are inert without an onOpenVariablePicker handler', async function (assert) {
            this.set('selectedElement', element('text', { content: 'Hello' }));

            await render(hbs`<TemplateBuilder::PropertiesPanel @selectedElement={{this.selectedElement}} @onUpdateElement={{this.onUpdateElement}} />`);
            await openSection('Content');
            await click(findAll('button').find((button) => button.textContent.includes('Insert variable')));

            assert.deepEqual(updates, [], 'no picker is opened and nothing is written');
        });

        test('a variable chosen from the picker is dropped when there is no update handler', async function (assert) {
            let opened = null;
            this.set('selectedElement', element('text', { content: 'Hello ' }));
            this.set('onOpenVariablePicker', (targetProp, callback) => {
                opened = targetProp;
                callback('{{order.id}}');
            });

            await render(hbs`<TemplateBuilder::PropertiesPanel @selectedElement={{this.selectedElement}} @onOpenVariablePicker={{this.onOpenVariablePicker}} />`);
            await openSection('Content');
            await click(findAll('button').find((button) => button.textContent.includes('Insert variable')));

            assert.strictEqual(opened, 'content', 'the picker is still asked to open');
            assert.deepEqual(updates, [], 'but the chosen variable has nowhere to go');
        });

        test('an uploaded image url is dropped when there is no update handler', async function (assert) {
            this.set('selectedElement', element('image', { src: '' }));

            await render(hbs`<TemplateBuilder::PropertiesPanel @selectedElement={{this.selectedElement}} />`);
            await openSection('Image');
            await selectFiles('input[type="file"]', new File(['binary'], 'logo.png', { type: 'image/png' }));

            const fetch = this.owner.lookup('service:fetch');
            assert.ok(
                fetch.calls.find((call) => call.method === 'uploadFile.perform'),
                'the upload still happens'
            );
            assert.deepEqual(updates, [], 'the returned url has nowhere to go');
        });
    });
    module('the line and shape editors', function () {
        test('a line element offers its stroke styles', async function (assert) {
            this.set('selectedElement', element('line', { line_style: 'dashed', line_width: 2 }));

            await render(TEMPLATE);
            await openSection('Line');

            const styles = findAll('select option').map((option) => option.textContent.trim());
            assert.true(styles.includes('Solid'), 'solid is offered');
            assert.true(styles.includes('Dashed'));
            assert.true(styles.includes('Dotted'));
        });

        test('a shape element offers rectangle and circle', async function (assert) {
            this.set('selectedElement', element('shape', { shape: 'circle' }));

            await render(TEMPLATE);
            await openSection('Shape');

            const shapes = findAll('select option').map((option) => option.textContent.trim());
            assert.true(shapes.includes('Rectangle'));
            assert.true(shapes.includes('Circle'));
        });
    });

    module('the remaining table-editing edge cases', function () {
        test('renaming a key on a row that never had it seeds an empty cell', async function (assert) {
            this.set(
                'selectedElement',
                element('table', {
                    columns: [{ label: 'Name', key: 'name' }],
                    rows: [{ other: 'unrelated' }],
                })
            );

            await render(TEMPLATE);
            await openSection('Columns');
            await fillIn('input[placeholder="data.key"]', 'full_name');

            assert.deepEqual(lastChanges().rows, [{ other: 'unrelated', full_name: '' }], 'the row gains the new key rather than undefined');
        });

        test('editing one row leaves the others untouched', async function (assert) {
            this.set(
                'selectedElement',
                element('table', {
                    columns: [{ label: 'Name', key: 'name' }],
                    rows: [{ name: 'Ada' }, { name: 'Grace' }],
                })
            );

            await render(TEMPLATE);
            await openSection('Data');
            await fillIn(findAll('input[placeholder="name"]')[1], 'Hopper');

            assert.deepEqual(lastChanges().rows, [{ name: 'Ada' }, { name: 'Hopper' }], 'only the edited row changes');
        });

        test('inserting a variable into an empty property starts from nothing', async function (assert) {
            this.set('selectedElement', element('text'));
            this.set('onOpenVariablePicker', (targetProp, callback) => callback('{{order.id}}'));

            await render(TEMPLATE);
            await openSection('Content');
            await click(findAll('button').find((button) => button.textContent.includes('Insert variable')));

            assert.deepEqual(lastChanges(), { content: '{{order.id}}' }, 'the variable is the whole value');
        });
    });
});
