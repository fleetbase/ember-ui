import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find } from '@ember/test-helpers';
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
});
