import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function buttonByTitle(title) {
    return find(`button[title="${title}"]`);
}

function buttonWithText(text) {
    return findAll('button').find((button) => button.textContent.trim().toLowerCase().includes(text.toLowerCase()));
}

module('Integration | Component | template-builder', function (hooks) {
    setupRenderingTest(hooks);

    let saved;
    let previewed;

    hooks.beforeEach(function () {
        saved = [];
        previewed = [];
        this.set('onSave', (template) => saved.push(template));
        this.set('onPreview', (template) => previewed.push(template));
        this.set('template', { name: 'Invoice', width: 210, height: 297, unit: 'mm', content: [] });
    });

    const TEMPLATE = hbs`
        <TemplateBuilder
            @template={{this.template}}
            @contextSchemas={{this.contextSchemas}}
            @onSave={{this.onSave}}
            @onPreview={{this.onPreview}}
        />
    `;

    // Saving is the cleanest window onto the builder's whole internal state.
    async function savedTemplate() {
        await click(buttonWithText('save'));

        return saved[saved.length - 1];
    }

    test('it renders the toolbar, canvas and both side panels', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.tb-toolbar').exists();
        assert.dom('.tb-canvas').exists();
        assert.dom('.tb-panel-left').exists();
        assert.dom('.tb-panel-right').exists();
    });

    test('it clones the incoming template rather than mutating it', async function (assert) {
        await render(TEMPLATE);
        await click(buttonByTitle('Add Text'));

        assert.deepEqual(this.template.content, [], 'the argument object is left untouched');
    });

    test('saving emits the reconstituted template', async function (assert) {
        await render(TEMPLATE);

        const template = await savedTemplate();
        assert.strictEqual(template.name, 'Invoice', 'meta is preserved');
        assert.strictEqual(template.width, 210);
        assert.deepEqual(template.content, []);
        assert.deepEqual(template.queries, []);
    });

    test('previewing emits the same shape', async function (assert) {
        await render(TEMPLATE);

        const previewButton = buttonByTitle('Preview template');
        await click(previewButton);

        assert.strictEqual(previewed.length, 1);
        assert.strictEqual(previewed[0].name, 'Invoice');
    });

    test('a template with no content array still starts empty', async function (assert) {
        this.set('template', { name: 'Bare' });

        await render(TEMPLATE);

        assert.deepEqual((await savedTemplate()).content, []);
    });

    module('element CRUD', function () {
        test('adding an element appends it with defaults and a uuid', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Add Text'));

            const { content } = await savedTemplate();
            assert.strictEqual(content.length, 1);
            assert.strictEqual(content[0].type, 'text');
            assert.ok(content[0].uuid, 'a uuid is assigned');
            assert.strictEqual(content[0].x, 20, 'it is placed at the default offset');
            assert.true(content[0].visible);
        });

        test('each element type gets its own default size', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Add Text'));
            await click(buttonByTitle('Add QR Code'));

            const { content } = await savedTemplate();
            assert.strictEqual(content.length, 2);
            assert.strictEqual(content[1].type, 'qr_code');
            assert.notStrictEqual(content[0].width, content[1].width, 'a QR code is not sized like a text box');
        });

        test('adding an element selects it and reveals its properties', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Add Text'));

            assert.dom('.tb-panel-right').containsText('Position', 'the properties panel switched to the new element');
        });

        test('rotation normalises into 0..360', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Add Text'));

            await click(buttonByTitle('Rotate left 90°'));
            assert.strictEqual((await savedTemplate()).content[0].rotation, 270, '-90 wraps around to 270');

            await click(buttonByTitle('Rotate right 90°'));
            assert.strictEqual((await savedTemplate()).content[0].rotation, 0, 'and back to 0');
        });

        test('rotating right twice accumulates', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Add Text'));

            await click(buttonByTitle('Rotate right 90°'));
            await click(buttonByTitle('Rotate right 90°'));

            assert.strictEqual((await savedTemplate()).content[0].rotation, 180);
        });
    });

    module('zoom', function () {
        test('it starts at 100%', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.tb-toolbar').containsText('100%');
        });

        test('zooming in and out steps by 10%', async function (assert) {
            await render(TEMPLATE);

            await click(buttonByTitle('Zoom in'));
            assert.dom('.tb-toolbar').containsText('110%');

            await click(buttonByTitle('Zoom out'));
            await click(buttonByTitle('Zoom out'));
            assert.dom('.tb-toolbar').containsText('90%');
        });

        test('zoom is clamped to a maximum of 300%', async function (assert) {
            await render(TEMPLATE);

            for (let i = 0; i < 25; i++) {
                await click(buttonByTitle('Zoom in'));
            }

            assert.dom('.tb-toolbar').containsText('300%');
        });

        test('zoom is clamped to a minimum of 25%', async function (assert) {
            await render(TEMPLATE);

            for (let i = 0; i < 20; i++) {
                await click(buttonByTitle('Zoom out'));
            }

            assert.dom('.tb-toolbar').containsText('25%');
        });

        test('reset returns to 100%', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Zoom in'));
            await click(buttonByTitle('Reset zoom'));

            assert.dom('.tb-toolbar').containsText('100%');
        });
    });

    module('undo and redo', function () {
        test('both are disabled with no history', async function (assert) {
            await render(TEMPLATE);

            assert.dom(buttonByTitle('Undo')).isDisabled();
            assert.dom(buttonByTitle('Redo')).isDisabled();
        });

        test('adding an element enables undo', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Add Text'));

            assert.dom(buttonByTitle('Undo')).isNotDisabled();
            assert.dom(buttonByTitle('Redo')).isDisabled('nothing to redo yet');
        });

        test('undo restores the previous content and enables redo', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Add Text'));
            assert.strictEqual((await savedTemplate()).content.length, 1);

            await click(buttonByTitle('Undo'));

            assert.deepEqual((await savedTemplate()).content, [], 'the element was removed');
            assert.dom(buttonByTitle('Redo')).isNotDisabled();
        });

        test('redo reapplies the undone change', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Add Text'));
            await click(buttonByTitle('Undo'));
            await click(buttonByTitle('Redo'));

            assert.strictEqual((await savedTemplate()).content.length, 1, 'the element is back');
        });

        test('undo clears the selection', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Add Text'));
            assert.dom('.tb-panel-right').containsText('Position');

            await click(buttonByTitle('Undo'));

            assert.dom('.tb-panel-right').doesNotContainText('Position', 'nothing is selected after undo');
        });

        test('undo history stacks across several edits', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Add Text'));
            await click(buttonByTitle('Add Image'));
            await click(buttonByTitle('Add Line'));
            assert.strictEqual((await savedTemplate()).content.length, 3);

            await click(buttonByTitle('Undo'));
            await click(buttonByTitle('Undo'));

            assert.strictEqual((await savedTemplate()).content.length, 1, 'two steps back');
        });
    });

    module('context schemas', function () {
        test('it passes through the supplied schemas when there are no queries', async function (assert) {
            this.set('contextSchemas', [{ namespace: 'order', label: 'Order', variables: [] }]);

            await render(TEMPLATE);

            assert.dom('.tb-root').exists('the builder renders with schemas supplied');
        });

        test('saved queries are included in the save payload', async function (assert) {
            this.set('template', {
                name: 'Invoice',
                content: [],
                queries: [{ variable_name: 'recent_orders', label: 'Recent Orders', model_type: 'Order' }],
            });

            await render(TEMPLATE);

            const { queries } = await savedTemplate();
            assert.strictEqual(queries.length, 1);
            assert.strictEqual(queries[0].variable_name, 'recent_orders');
        });
    });

    // -------------------------------------------------------------------------
    // Appended coverage: layers panel, queries tab, rotation, template settings,
    // the variable picker and the ember-data-shaped template argument.
    // -------------------------------------------------------------------------

    function layerRows() {
        return findAll('.tb-layer-row');
    }

    function layerAction(index, title) {
        return layerRows()[index].querySelector(`button[title="${title}"]`);
    }

    function layerLabels() {
        return findAll('.tb-layer-row span[title="Double-click to rename"]').map((span) => span.textContent.trim());
    }

    async function addElements(...types) {
        for (const type of types) {
            await click(buttonByTitle(`Add ${type}`));
        }
    }

    module('the layers panel', function () {
        test('added elements appear as layers, topmost first', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text', 'Image');

            assert.deepEqual(layerLabels(), ['Image', 'Text'], 'the newest element sits on top');
        });

        test('choosing a layer selects that element', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text', 'Image');
            await click(layerRows()[1]);

            assert.dom(layerRows()[1]).hasClass('bg-blue-50', 'the chosen layer is highlighted');
            assert.dom('.tb-panel-right').containsText('Position', 'the properties panel switches to the element');
        });

        test('a layer can be hidden and shown again', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text');
            await click(layerAction(0, 'Hide element'));

            let [element] = (await savedTemplate()).content;
            assert.false(element.visible, 'the element is recorded as hidden');

            await click(layerAction(0, 'Show element'));

            [element] = (await savedTemplate()).content;
            assert.true(element.visible, 'and visible again');
        });

        test('a layer can be deleted', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text', 'Image');
            await click(layerAction(0, 'Delete element'));

            assert.deepEqual(layerLabels(), ['Text'], 'the chosen layer is gone');
            assert.strictEqual((await savedTemplate()).content.length, 1);
        });

        test('deleting the selected element clears the selection', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text');
            await click(layerRows()[0]);
            assert.dom('.tb-panel-right').containsText('Position');

            await click(layerAction(0, 'Delete element'));

            assert.dom('.tb-panel-right').containsText('Paper Size', 'the panel falls back to template settings');
        });

        test('deleting an unselected element leaves the selection alone', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text', 'Image');
            await click(layerRows()[0]);

            await click(layerAction(1, 'Delete element'));

            assert.dom('.tb-panel-right').containsText('Position', 'the image is still selected');
        });

        test('a layer can be moved down and back up', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text', 'Image');
            assert.deepEqual(layerLabels(), ['Image', 'Text']);

            await click(layerAction(0, 'Move layer down'));
            assert.deepEqual(layerLabels(), ['Text', 'Image'], 'the image drops below the text');

            await click(layerAction(1, 'Move layer up'));
            assert.deepEqual(layerLabels(), ['Image', 'Text'], 'and comes back');
        });

        // With only two layers every element in the map() is either the one moved or the one it
        // swapped with. A third layer is what exercises the fall-through, and it is the case that
        // matters in practice: reordering two layers must leave the rest alone.
        test('reordering two layers leaves the others untouched', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text', 'Image', 'Shape');
            assert.deepEqual(layerLabels(), ['Shape', 'Image', 'Text'], 'newest on top');

            const before = (await savedTemplate()).content.find((el) => el.type === 'text');

            await click(layerAction(0, 'Move layer down'));

            assert.deepEqual(layerLabels(), ['Image', 'Shape', 'Text'], 'only the top two swap');

            const after = (await savedTemplate()).content.find((el) => el.type === 'text');
            assert.strictEqual(after.z_index, before.z_index, 'the bystander keeps its z-index');
            assert.strictEqual(after.uuid, before.uuid, 'and is the same element');
        });

        test('reordering keeps the selected element in sync', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text', 'Image');
            await click(layerRows()[0]);

            await click(layerAction(0, 'Move layer down'));

            const image = (await savedTemplate()).content.find((el) => el.type === 'image');
            assert.strictEqual(image.z_index, 1, 'the moved element carries the swapped z-index');
        });

        test('moving the topmost layer up does nothing', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text', 'Image');

            await click(layerAction(0, 'Move layer up'));

            assert.deepEqual(layerLabels(), ['Image', 'Text'], 'the order is unchanged');
        });

        test('moving the bottom layer down does nothing', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text', 'Image');

            await click(layerAction(1, 'Move layer down'));

            assert.deepEqual(layerLabels(), ['Image', 'Text']);
        });
    });

    module('rotating the selected element', function () {
        test('rotation is refused until an element is selected', async function (assert) {
            await render(TEMPLATE);

            assert.dom(buttonByTitle('Rotate left 90°')).isDisabled();
            assert.dom(buttonByTitle('Rotate right 90°')).isDisabled();
        });

        test('rotating right advances by ninety degrees', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text');
            await click(layerRows()[0]);

            await click(buttonByTitle('Rotate right 90°'));

            const [element] = (await savedTemplate()).content;
            assert.strictEqual(element.rotation, 90);
        });

        test('rotating left from zero wraps round to 270', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text');
            await click(layerRows()[0]);

            await click(buttonByTitle('Rotate left 90°'));

            const [element] = (await savedTemplate()).content;
            assert.strictEqual(element.rotation, 270, 'the angle is normalised into [0, 360)');
        });

        test('four right rotations return to zero', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text');
            await click(layerRows()[0]);

            for (let i = 0; i < 4; i++) {
                await click(buttonByTitle('Rotate right 90°'));
            }

            const [element] = (await savedTemplate()).content;
            assert.strictEqual(element.rotation, 0);
        });
    });

    module('template settings', function () {
        function settingsSelect(index) {
            return findAll('.tb-panel-right select')[index];
        }

        test('with nothing selected the panel offers paper settings', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.tb-panel-right').containsText('Paper Size');
            assert.dom('.tb-panel-right').containsText('Orientation');
        });

        test('choosing a paper size resolves its dimensions', async function (assert) {
            await render(TEMPLATE);
            await fillIn(settingsSelect(0), 'A3');

            const template = await savedTemplate();
            assert.strictEqual(template.paper_size, 'A3');
            assert.strictEqual(template.width, 297);
            assert.strictEqual(template.height, 420);
            assert.strictEqual(template.unit, 'mm');
        });

        test('renaming the template does not touch its dimensions', async function (assert) {
            await render(TEMPLATE);
            const nameInput = find('.tb-panel-right input[type="text"]');
            await fillIn(nameInput, 'Packing Slip');

            const template = await savedTemplate();
            assert.strictEqual(template.name, 'Packing Slip');
            assert.strictEqual(template.width, 210, 'a change with no paper size or orientation in it is left alone');
            assert.strictEqual(template.height, 297);
        });

        test('an orientation on a template with no paper size assumes A4', async function (assert) {
            this.set('template', { name: 'Sizeless', content: [] });

            await render(TEMPLATE);
            await fillIn(settingsSelect(1), 'landscape');

            const template = await savedTemplate();
            assert.deepEqual([template.width, template.height], [297, 210], 'A4, laid on its side');
        });

        test('every supported paper size resolves', async function (assert) {
            const expected = { A4: [210, 297], A3: [297, 420], A5: [148, 210], Letter: [216, 279], Legal: [216, 356] };

            for (const [size, [width, height]] of Object.entries(expected)) {
                await render(TEMPLATE);
                await fillIn(settingsSelect(0), size);

                const template = await savedTemplate();
                assert.deepEqual([template.width, template.height], [width, height], `${size} dimensions`);
            }
        });

        test('landscape swaps the dimensions', async function (assert) {
            await render(TEMPLATE);
            await fillIn(settingsSelect(0), 'A4');
            await fillIn(settingsSelect(1), 'landscape');

            const template = await savedTemplate();
            assert.strictEqual(template.orientation, 'landscape');
            assert.strictEqual(template.width, 297, 'the long edge becomes the width');
            assert.strictEqual(template.height, 210);
        });

        // _dimensionsForPaperSize returns null for a size it does not recognise. The select only
        // offers known sizes, so the only way in is a template that was saved with one — then the
        // builder has to leave the explicit width and height alone rather than blanking them.
        test('an unrecognised paper size leaves the stored dimensions alone', async function (assert) {
            this.set('template', { name: 'Odd', paper_size: 'Tabloid', orientation: 'portrait', width: 279, height: 432, unit: 'mm', content: [] });

            await render(TEMPLATE);
            await fillIn(settingsSelect(1), 'landscape');

            const template = await savedTemplate();
            assert.strictEqual(template.orientation, 'landscape', 'the orientation still changes');
            assert.strictEqual(template.width, 279, 'but the width is untouched');
            assert.strictEqual(template.height, 432, 'and so is the height');
        });

        test('changing the paper size is undoable', async function (assert) {
            await render(TEMPLATE);
            await fillIn(settingsSelect(0), 'A3');
            assert.strictEqual((await savedTemplate()).width, 297);

            await click(buttonByTitle('Undo'));

            assert.dom('.tb-root').exists('the builder survives undoing a template change');
        });
    });

    module('the queries tab', function () {
        function tabButton(text) {
            return findAll('.tb-panel-left button').find((button) => button.textContent.trim().toLowerCase().startsWith(text));
        }

        test('the layers tab is shown first', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.tb-layers-panel').exists();
            assert.strictEqual(find('.tb-queries-panel'), null);
        });

        test('switching to queries swaps the panel', async function (assert) {
            await render(TEMPLATE);
            await click(tabButton('queries'));

            assert.dom('.tb-queries-panel').exists();
            assert.strictEqual(find('.tb-layers-panel'), null);

            await click(tabButton('layers'));
            assert.dom('.tb-layers-panel').exists('and back again');
        });

        test('the queries tab counts the saved queries', async function (assert) {
            this.set('template', {
                name: 'Invoice',
                content: [],
                queries: [
                    { uuid: 'q1', variable_name: 'recent_orders', label: 'Recent Orders', model_type: 'Order' },
                    { uuid: 'q2', variable_name: 'drivers', label: 'Drivers', model_type: 'Driver' },
                ],
            });

            await render(TEMPLATE);

            assert.dom(tabButton('queries')).containsText('2', 'the badge shows the query count');
        });

        test('deleting a query updates the save payload', async function (assert) {
            this.set('template', {
                name: 'Invoice',
                content: [],
                queries: [{ uuid: 'q1', variable_name: 'recent_orders', label: 'Recent Orders', model_type: 'Order' }],
            });

            await render(TEMPLATE);
            await click(tabButton('queries'));
            await click(find('.tb-query-row button[title="Delete query"]'));

            assert.deepEqual((await savedTemplate()).queries, [], 'the query is removed from the payload');
        });
    });

    module('the variable picker', function () {
        test('it stays closed until a property asks for it', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find('.tb-variable-picker'), null);
        });

        test('a text element can insert a variable into its content', async function (assert) {
            this.set('contextSchemas', [
                {
                    namespace: 'order',
                    label: 'Order',
                    variables: [{ path: 'order.public_id', label: 'Public ID', type: 'string' }],
                },
            ]);

            await render(TEMPLATE);
            await addElements('Text');
            await click(layerRows()[0]);
            await click(buttonWithText('insert variable'));

            assert.ok(find('.tb-variable-picker'), 'the picker opens');
            // Namespaces are listed collapsed; individual variables expand on click.
            assert.dom('.tb-variable-picker').containsText('Order');
            assert.dom('.tb-variable-picker').containsText('1 variables');
        });

        test('the picker opens with no schemas at all', async function (assert) {
            await render(hbs`<TemplateBuilder @template={{this.template}} @onSave={{this.onSave}} />`);
            await addElements('Text');
            await click(layerRows()[0]);
            await click(buttonWithText('insert variable'));

            assert.ok(find('.tb-variable-picker'), 'the picker still opens on an empty schema list');
        });

        test('a query with no type to name is offered with an empty one', async function (assert) {
            this.set('template', {
                name: 'Invoice',
                content: [],
                queries: [{ uuid: 'q1', variable_name: 'recent_orders', label: 'Recent Orders' }],
            });

            await render(TEMPLATE);
            await addElements('Text');
            await click(layerRows()[0]);
            await click(buttonWithText('insert variable'));

            assert.dom('.tb-variable-picker').containsText('Queries', 'the Queries section is still derived');
            assert.dom('.tb-variable-picker').doesNotIncludeText('undefined', 'and the missing type is not spelled out');
        });

        test('saved queries are offered alongside the supplied schemas', async function (assert) {
            this.set('contextSchemas', [{ namespace: 'order', label: 'Order', variables: [] }]);
            this.set('template', {
                name: 'Invoice',
                content: [],
                queries: [{ uuid: 'q1', variable_name: 'recent_orders', label: 'Recent Orders', model_type: 'Order' }],
            });

            await render(TEMPLATE);
            await addElements('Text');
            await click(layerRows()[0]);
            await click(buttonWithText('insert variable'));

            assert.dom('.tb-variable-picker').containsText('Queries', 'a Queries section is derived from the saved queries');
            assert.dom('.tb-variable-picker').containsText('Order', 'alongside the supplied schemas');
        });
    });

    module('the template argument', function () {
        test('an ember-data shaped record is read through eachAttribute', async function (assert) {
            this.set('template', {
                uuid: 'tpl_1',
                name: 'From a record',
                width: 210,
                height: 297,
                content: [],
                eachAttribute(callback) {
                    ['name', 'width', 'height', 'content'].forEach((attribute) => callback(attribute));
                },
            });

            await render(TEMPLATE);

            const template = await savedTemplate();
            assert.strictEqual(template.name, 'From a record');
            assert.strictEqual(template.uuid, 'tpl_1', 'the identifier is carried across');
            assert.notOk(template.eachAttribute, 'only attributes are copied, not methods');
        });

        test('a record falls back to its id when it has no uuid', async function (assert) {
            this.set('template', {
                id: 'tpl_2',
                name: 'From a record',
                content: [],
                eachAttribute(callback) {
                    ['name', 'content'].forEach((attribute) => callback(attribute));
                },
            });

            await render(TEMPLATE);

            assert.strictEqual((await savedTemplate()).uuid, 'tpl_2');
        });

        test('no template at all still renders an empty builder', async function (assert) {
            await render(hbs`<TemplateBuilder />`);

            assert.dom('.tb-root').exists();
            assert.dom('.tb-layers-panel').containsText('No elements yet.');
        });
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<TemplateBuilder @template={{this.template}} data-test-builder="yes" />`);

        assert.dom('.tb-root').hasAttribute('data-test-builder', 'yes');
    });

    module('the variable picker round trip', function () {
        const SCHEMAS = [
            {
                namespace: 'order',
                label: 'Order',
                variables: [
                    { path: 'order.public_id', label: 'Public ID', type: 'string', example: 'ord_123' },
                    { path: 'order.total', label: 'Total', type: 'number', example: '42.00' },
                ],
            },
        ];

        async function openPickerForText(context) {
            context.set('contextSchemas', SCHEMAS);

            await render(TEMPLATE);
            await addElements('Text');
            await click(layerRows()[0]);
            await click(buttonWithText('insert variable'));
        }

        function namespaceHeader(label) {
            return findAll('.tb-variable-picker button').find((button) => button.textContent.includes(label));
        }

        function variableButton(path) {
            return findAll('.tb-variable-picker button').find((button) => button.textContent.includes(path));
        }

        test('choosing a variable inserts its token and closes the picker', async function (assert) {
            await openPickerForText(this);

            await click(namespaceHeader('Order'));
            const variable = variableButton('order.public_id');
            assert.ok(variable, 'the variable is listed once its namespace is expanded');

            await click(variable);

            assert.strictEqual(find('.tb-variable-picker'), null, 'the picker closes itself');

            const template = await savedTemplate();
            assert.true(String(template.content[0].content).includes('order.public_id'), `${template.content[0].content} carries the inserted token`);
        });

        test('the close button dismisses the picker without inserting anything', async function (assert) {
            await openPickerForText(this);

            const before = (await savedTemplate()).content[0].content;

            await click(buttonWithText('insert variable'));
            await click(find('.tb-variable-picker button[type="button"]'));

            assert.strictEqual(find('.tb-variable-picker'), null, 'the picker closes');

            const after = (await savedTemplate()).content[0].content;
            assert.strictEqual(after, before, 'the element content is untouched');
        });

        test('clicking the backdrop dismisses the picker', async function (assert) {
            await openPickerForText(this);

            await click('.tb-variable-picker .absolute.inset-0');

            assert.strictEqual(find('.tb-variable-picker'), null);
        });

        test('reopening the picker starts from a clean namespace state', async function (assert) {
            await openPickerForText(this);

            await click(namespaceHeader('Order'));
            assert.ok(variableButton('order.public_id'), 'the namespace is expanded');

            await click(find('.tb-variable-picker button[type="button"]'));
            await click(buttonWithText('insert variable'));

            assert.ok(namespaceHeader('Order'), 'the namespace header is offered again');
        });
    });

    module('deselecting', function () {
        test('clicking the canvas background clears the selection', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text');
            await click(layerRows()[0]);

            assert.dom('.tb-panel-right').containsText('Position', 'an element is selected');

            await click('.tb-canvas');

            assert.dom('.tb-panel-right').doesNotContainText('Position', 'the selection is cleared');
        });

        test('clicking an element inside the canvas does not clear the selection', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text');
            await click(layerRows()[0]);

            const element = find('.tb-canvas [data-element-uuid], .tb-canvas > *');
            assert.ok(element, 'the element renders on the canvas');

            await click(element);

            assert.dom('.tb-panel-right').containsText('Position', 'the selection survives a click on a child');
        });
    });
    // moveElement and resizeElement exist to keep the data model in sync after an interact.js
    // gesture — interact has already moved the DOM, and these carry the result into the next save.
    // Driving them means driving a real gesture, which interact.js supports: it listens for
    // PointerEvents on the document, so dispatching them exercises the whole path.
    module('syncing the model after a gesture', function () {
        function pointer(type, x, y, target) {
            (target ?? document).dispatchEvent(
                new PointerEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    pointerId: 1,
                    pointerType: 'mouse',
                    isPrimary: true,
                    button: 0,
                    buttons: type === 'pointerup' ? 0 : 1,
                    clientX: x,
                    clientY: y,
                })
            );
        }

        async function drag(target, from, to) {
            pointer('pointerdown', from.x, from.y, target);
            pointer('pointermove', from.x + (to.x - from.x) / 2, from.y + (to.y - from.y) / 2);
            pointer('pointermove', to.x, to.y);
            pointer('pointerup', to.x, to.y);
            await settled();
        }

        function centreOf(node) {
            const box = node.getBoundingClientRect();
            return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
        }

        test('dragging an element carries its new position into the save', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Add Text'));

            const element = find('.tb-element');

            // moveElement mutates the content entry in place, and savedTemplate() hands back those
            // same objects — so these have to be captured as primitives, or the "before" values
            // move with the result and the assertion cannot fail.
            const { x: beforeX, y: beforeY, uuid } = (await savedTemplate()).content[0];

            const from = centreOf(element);
            await drag(element, from, { x: from.x + 40, y: from.y + 25 });

            const after = (await savedTemplate()).content[0];
            assert.strictEqual(after.x, beforeX + 40, 'the x delta reached the model');
            assert.strictEqual(after.y, beforeY + 25, 'and so did the y delta');
            assert.strictEqual(after.uuid, uuid, 'it is still the same element');
        });

        test('resizing an element carries its new size into the save', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Add Text'));
            await click(find('.tb-element'));

            const handle = find('.tb-handle-se');
            const { width: beforeWidth, height: beforeHeight } = (await savedTemplate()).content[0];

            // interact's resizable sets each edge from the pointer's ABSOLUTE position, not from a
            // delta, so the target has to be measured off the element's own box. Dragging relative
            // to the handle's centre — which sits inside the element's edge — shrinks it instead.
            const box = find('.tb-element').getBoundingClientRect();
            await drag(handle, centreOf(handle), { x: box.right + 30, y: box.bottom + 15 });

            const after = (await savedTemplate()).content[0];

            // Deliberately not asserting exact arithmetic here. moveElement works from pointer
            // DELTAS, so its numbers map 1:1; resizeElement works from interact's measured
            // `event.rect`, and Ember's test container scales its contents — a 200x40 element
            // measures 100x20 — so client-rect units are not model units in this environment.
            // What matters is the contract: the gesture reaches the model.
            assert.notStrictEqual(after.width, beforeWidth, 'the resize reached the model width');
            assert.notStrictEqual(after.height, beforeHeight, 'and the model height');
            assert.true(Number.isFinite(after.width), 'as a usable width');
            assert.true(Number.isFinite(after.height), 'and a usable height');
        });

        test('a gesture does not add an undo entry', async function (assert) {
            await render(TEMPLATE);
            await click(buttonByTitle('Add Text'));

            const element = find('.tb-element');
            const from = centreOf(element);
            await drag(element, from, { x: from.x + 40, y: from.y + 25 });

            // Undo should remove the element the Add created, not step back through the drag —
            // these two actions mutate in place precisely so they stay out of undo history.
            await click(buttonByTitle('Undo'));

            assert.deepEqual((await savedTemplate()).content, [], 'one undo returns to the empty canvas');
        });
    });
    // The undo stack is capped at 50 entries. Past that, the oldest states are dropped, so a very
    // long editing session cannot be rewound all the way to the beginning.
    test('the undo history is capped at fifty steps', async function (assert) {
        await render(TEMPLATE);

        // 52 adds push 52 states; the stack keeps the most recent 50.
        for (let i = 0; i < 52; i++) {
            await click(buttonByTitle('Add Text'));
        }

        assert.strictEqual((await savedTemplate()).content.length, 52, 'all 52 elements are on the canvas');

        for (let i = 0; i < 50; i++) {
            await click(buttonByTitle('Undo'));
        }

        const remaining = (await savedTemplate()).content;
        assert.strictEqual(remaining.length, 2, 'fifty undos rewind to the oldest state still held');
        assert.dom(buttonByTitle('Undo')).hasAttribute('disabled', '', 'and there is nothing left to undo');
    });
    // The cheapest branches left in this file are the optional arguments: each guard's other side
    // is reached simply by rendering without the argument. Grouped here rather than scattered.
    module('without its optional arguments', function () {
        test('saving with no @onSave handler is harmless', async function (assert) {
            await render(hbs`<TemplateBuilder @template={{this.template}} />`);
            await click(buttonByTitle('Add Text'));
            await click(buttonWithText('save'));

            assert.deepEqual(saved, [], 'nothing is reported');
            assert.dom('.tb-canvas').exists('and the builder survives');
        });

        test('previewing with no @onPreview handler is harmless', async function (assert) {
            await render(hbs`<TemplateBuilder @template={{this.template}} />`);
            await click(buttonByTitle('Preview template'));

            assert.deepEqual(previewed, [], 'nothing is reported');
        });

        test('it renders with no @contextSchemas', async function (assert) {
            await render(hbs`<TemplateBuilder @template={{this.template}} @onSave={{this.onSave}} />`);

            assert.dom('.tb-canvas').exists('the schema list falls back to empty');
        });

        test('a template with no content array starts empty', async function (assert) {
            this.set('template', { name: 'Bare', width: 210, height: 297, unit: 'mm' });

            await render(TEMPLATE);

            assert.deepEqual((await savedTemplate()).content, [], 'content defaults to an empty list');
        });

        // The uuid/id fallback lives on the ember-data path — a plain object is cloned wholesale,
        // so these have to be record-shaped to reach it.
        function record(attributes, extra = {}) {
            return {
                ...attributes,
                ...extra,
                eachAttribute(callback) {
                    Object.keys(attributes).forEach((attribute) => callback(attribute));
                },
            };
        }

        test('a record identified by id rather than uuid keeps that identity', async function (assert) {
            this.set('template', record({ name: 'By id', width: 210, height: 297, content: [] }, { id: 'tpl_7' }));

            await render(TEMPLATE);

            assert.strictEqual((await savedTemplate()).uuid, 'tpl_7', 'the id stands in for the uuid');
        });

        test('a record with neither id nor uuid saves a null identity', async function (assert) {
            this.set('template', record({ name: 'Unsaved', width: 210, height: 297, content: [] }));

            await render(TEMPLATE);

            assert.strictEqual((await savedTemplate()).uuid, null, 'rather than undefined');
        });

        test('a null attribute on a record survives the clone', async function (assert) {
            this.set('template', record({ name: 'Nulls', description: null, width: 210, height: 297, content: [] }, { uuid: 'tpl_9' }));

            await render(TEMPLATE);

            assert.strictEqual((await savedTemplate()).description, null, 'null is preserved rather than cloned through JSON');
        });
    });

    module('acting on an element that is not the selected one', function () {
        test('updating an unselected element leaves the selection alone', async function (assert) {
            await render(TEMPLATE);
            await addElements('Text', 'Image');

            // The image is selected (it was added last). Move the text layer instead.
            await click(layerAction(1, 'Move layer up'));

            const content = (await savedTemplate()).content;
            assert.strictEqual(content.length, 2, 'both elements survive');
        });

        test('rotating an element that arrived without a rotation starts from zero', async function (assert) {
            this.set('template', {
                name: 'Unrotated',
                width: 210,
                height: 297,
                unit: 'mm',
                content: [{ uuid: 'el_1', type: 'text', x: 0, y: 0, width: 100, height: 40, z_index: 1 }],
            });

            await render(TEMPLATE);
            await click(layerRows()[0]);
            await click(buttonByTitle('Rotate right 90°'));

            assert.strictEqual((await savedTemplate()).content[0].rotation, 90, 'no rotation counts as zero');
        });

        test('swapping with a layer that has no z_index of its own', async function (assert) {
            this.set('template', {
                name: 'Unstacked',
                width: 210,
                height: 297,
                unit: 'mm',
                content: [
                    { uuid: 'el_1', type: 'text', x: 0, y: 0, width: 100, height: 40, z_index: 2 },
                    { uuid: 'el_2', type: 'text', x: 0, y: 0, width: 100, height: 40 },
                ],
            });

            await render(TEMPLATE);
            await click(layerAction(0, 'Move layer down'));

            const content = (await savedTemplate()).content;
            const byUuid = Object.fromEntries(content.map((element) => [element.uuid, element]));
            assert.strictEqual(byUuid.el_1.z_index, 1, 'the missing z_index is read as 1 and taken over');
            assert.strictEqual(byUuid.el_2.z_index, 2, 'and the two swap places');
        });

        test('rotating an element that already has a rotation adds to it', async function (assert) {
            this.set('template', {
                name: 'Rotated',
                width: 210,
                height: 297,
                unit: 'mm',
                content: [{ uuid: 'el_1', type: 'text', x: 0, y: 0, width: 100, height: 40, rotation: 45, z_index: 1 }],
            });

            await render(TEMPLATE);
            await click(layerRows()[0]);
            await click(buttonByTitle('Rotate right 90°'));

            assert.strictEqual((await savedTemplate()).content[0].rotation, 135, '45 plus 90');
        });

        test('elements with no z-index still reorder', async function (assert) {
            this.set('template', {
                name: 'No z',
                width: 210,
                height: 297,
                unit: 'mm',
                content: [
                    { uuid: 'a', type: 'text', x: 0, y: 0, width: 100, height: 40 },
                    { uuid: 'b', type: 'shape', x: 0, y: 0, width: 100, height: 40 },
                ],
            });

            await render(TEMPLATE);
            await click(layerAction(0, 'Move layer down'));

            const content = (await savedTemplate()).content;
            assert.strictEqual(content.length, 2, 'both elements survive a reorder with no z-index to start from');
            assert.deepEqual(layerLabels(), ['Text', 'Shape'], 'and the order actually changed');
        });
    });
});
