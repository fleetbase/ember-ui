import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, doubleClick, fillIn, blur, triggerKeyEvent, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function elements() {
    return [
        { uuid: 'el_1', type: 'text', label: 'Heading', z_index: 1 },
        { uuid: 'el_2', type: 'image', z_index: 3 },
        { uuid: 'el_3', type: 'qr_code', z_index: 2 },
    ];
}

function rows() {
    return findAll('.tb-layer-row');
}

function labels() {
    return findAll('.tb-layer-row span[title="Double-click to rename"]').map((span) => span.textContent.trim());
}

function rowLabel(index) {
    return rows()[index].querySelector('span[title="Double-click to rename"]');
}

function renameField() {
    return find('input[type="text"]');
}

function rowActions(index, title) {
    return rows()[index].querySelector(`button[title="${title}"]`);
}

module('Integration | Component | template-builder/layers-panel', function (hooks) {
    setupRenderingTest(hooks);

    let selected;
    let updated;
    let deleted;
    let reordered;

    hooks.beforeEach(function () {
        selected = [];
        updated = [];
        deleted = [];
        reordered = [];
        this.set('elements', elements());
        this.set('onSelectElement', (element) => selected.push(element.uuid));
        this.set('onUpdateElement', (uuid, changes) => updated.push([uuid, changes]));
        this.set('onDeleteElement', (uuid) => deleted.push(uuid));
        this.set('onReorderElement', (uuid, direction) => reordered.push([uuid, direction]));
    });

    const TEMPLATE = hbs`
        <TemplateBuilder::LayersPanel
            @elements={{this.elements}}
            @selectedElement={{this.selectedElement}}
            @onSelectElement={{this.onSelectElement}}
            @onUpdateElement={{this.onUpdateElement}}
            @onDeleteElement={{this.onDeleteElement}}
            @onReorderElement={{this.onReorderElement}}
        />
    `;

    module('listing the layers', function () {
        test('it lists every element, topmost layer first', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.tb-layers-panel').exists();
            assert.strictEqual(rows().length, 3);
            assert.deepEqual(labels(), ['Image', 'QR Code', 'Heading'], 'highest z-index sits at the top');
        });

        test('it counts the layers in the header', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.tb-layers-panel > div:first-child').containsText('Layers');
            assert.dom('.tb-layers-panel > div:first-child').containsText('3');
        });

        test('an element without a z-index sinks to the default layer', async function (assert) {
            this.set('elements', [
                { uuid: 'el_1', type: 'text', label: 'Bottom' },
                { uuid: 'el_2', type: 'text', label: 'Top', z_index: 5 },
            ]);

            await render(TEMPLATE);

            assert.deepEqual(labels(), ['Top', 'Bottom']);
        });

        test('an explicit label wins over the type name', async function (assert) {
            await render(TEMPLATE);

            assert.true(labels().includes('Heading'), 'the authored label is shown');
        });

        test('every element type gets a readable name', async function (assert) {
            this.set('elements', [
                { uuid: 'a', type: 'text' },
                { uuid: 'b', type: 'image' },
                { uuid: 'c', type: 'table' },
                { uuid: 'd', type: 'line' },
                { uuid: 'e', type: 'shape' },
                { uuid: 'f', type: 'qr_code' },
                { uuid: 'g', type: 'barcode' },
                { uuid: 'h', type: 'something-new' },
            ]);

            await render(TEMPLATE);

            assert.deepEqual(labels(), ['Text', 'Image', 'Table', 'Line', 'Shape', 'QR Code', 'Barcode', 'Element']);
        });

        test('an unknown element type still gets a layer icon', async function (assert) {
            this.set('elements', [{ uuid: 'a', type: 'something-new' }]);

            await render(TEMPLATE);

            assert.ok(find('.tb-layer-row svg'), 'a fallback icon is rendered');
        });

        test('with no elements it explains how to add one', async function (assert) {
            this.set('elements', []);

            await render(TEMPLATE);

            assert.strictEqual(rows().length, 0);
            assert.dom('.tb-layers-panel').containsText('No elements yet.');
            assert.dom('.tb-layers-panel').containsText('Use the toolbar to add elements.');
        });

        test('with no elements argument at all it renders the empty state', async function (assert) {
            await render(hbs`<TemplateBuilder::LayersPanel />`);

            assert.dom('.tb-layers-panel').containsText('No elements yet.');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<TemplateBuilder::LayersPanel data-test-layers="yes" />`);

            assert.dom('.tb-layers-panel').hasAttribute('data-test-layers', 'yes');
        });
    });

    module('selecting', function () {
        test('clicking a row selects that element', async function (assert) {
            await render(TEMPLATE);
            await click(rows()[0]);

            assert.deepEqual(selected, ['el_2'], 'the topmost layer is the second element');
        });

        test('the selected element is highlighted', async function (assert) {
            this.set('selectedElement', this.elements[2]);

            await render(TEMPLATE);

            assert.dom(rows()[1]).hasClass('bg-blue-50', 'the QR code row is marked');
            assert.dom(rows()[0]).doesNotHaveClass('bg-blue-50');
        });

        test('nothing is highlighted when nothing is selected', async function (assert) {
            await render(TEMPLATE);

            rows().forEach((row) => assert.dom(row).doesNotHaveClass('bg-blue-50'));
        });

        test('it selects happily without a handler', async function (assert) {
            await render(hbs`<TemplateBuilder::LayersPanel @elements={{this.elements}} />`);
            await click(rows()[0]);

            assert.strictEqual(rows().length, 3, 'the panel survives');
        });
    });

    module('visibility', function () {
        test('a visible element offers to be hidden', async function (assert) {
            await render(TEMPLATE);
            await click(rowActions(0, 'Hide element'));

            assert.deepEqual(updated, [['el_2', { visible: false }]]);
        });

        test('a hidden element is dimmed and offers to be shown', async function (assert) {
            this.set('elements', [{ uuid: 'el_1', type: 'text', label: 'Heading', visible: false }]);

            await render(TEMPLATE);

            assert.dom('.tb-layer-row span[title="Double-click to rename"]').hasClass('opacity-40');

            await click(rowActions(0, 'Show element'));
            assert.deepEqual(updated, [['el_1', { visible: true }]]);
        });

        test('toggling does not also select the element', async function (assert) {
            await render(TEMPLATE);
            await click(rowActions(0, 'Hide element'));

            assert.deepEqual(selected, [], 'the click does not reach the row');
        });

        test('it toggles happily without a handler', async function (assert) {
            await render(hbs`<TemplateBuilder::LayersPanel @elements={{this.elements}} />`);
            await click(rowActions(0, 'Hide element'));

            assert.strictEqual(rows().length, 3);
        });
    });

    module('reordering and deleting', function () {
        test('a layer can be moved up', async function (assert) {
            await render(TEMPLATE);
            await click(rowActions(2, 'Move layer up'));

            assert.deepEqual(reordered, [['el_1', 'up']]);
            assert.deepEqual(selected, [], 'reordering does not select');
        });

        test('a layer can be moved down', async function (assert) {
            await render(TEMPLATE);
            await click(rowActions(0, 'Move layer down'));

            assert.deepEqual(reordered, [['el_2', 'down']]);
        });

        test('a layer can be deleted', async function (assert) {
            await render(TEMPLATE);
            await click(rowActions(1, 'Delete element'));

            assert.deepEqual(deleted, ['el_3']);
            assert.deepEqual(selected, [], 'deleting does not select');
        });

        test('it reorders and deletes happily without handlers', async function (assert) {
            await render(hbs`<TemplateBuilder::LayersPanel @elements={{this.elements}} />`);
            await click(rowActions(0, 'Move layer up'));
            await click(rowActions(0, 'Move layer down'));
            await click(rowActions(0, 'Delete element'));

            assert.strictEqual(rows().length, 3, 'the panel survives');
        });
    });

    module('renaming a layer', function () {
        const TEMPLATE = hbs`<TemplateBuilder::LayersPanel @elements={{this.elements}} @onUpdateElement={{this.onUpdateElement}} />`;

        test('double-clicking a label opens a rename field seeded with the current name', async function (assert) {
            await render(TEMPLATE);
            const before = labels()[0];
            await doubleClick(rowLabel(0));

            assert.ok(renameField(), 'the rename field is shown');
            assert.dom(renameField()).hasValue(before, 'seeded with the label it replaced');
        });

        test('typing a new name and blurring reports the rename', async function (assert) {
            await render(TEMPLATE);
            await doubleClick(rowLabel(0));
            await fillIn(renameField(), 'Header band');
            await blur(renameField());

            assert.strictEqual(updated.length, 1, 'exactly one rename is reported');
            assert.deepEqual(updated[0][1], { label: 'Header band' });
            assert.notOk(renameField(), 'the field closes again');
        });

        test('enter commits the rename', async function (assert) {
            await render(TEMPLATE);
            await doubleClick(rowLabel(0));
            await fillIn(renameField(), 'Committed');
            await triggerKeyEvent(renameField(), 'keydown', 'Enter');

            assert.deepEqual(
                updated.map(([, changes]) => changes),
                [{ label: 'Committed' }]
            );
        });

        test('escape abandons the rename', async function (assert) {
            await render(TEMPLATE);
            await doubleClick(rowLabel(1));
            await fillIn(renameField(), 'Abandoned');
            await triggerKeyEvent(renameField(), 'keydown', 'Escape');

            assert.deepEqual(updated, [], 'nothing is reported');
            assert.notOk(renameField(), 'and the field closes');
        });

        test('a blank name is not committed', async function (assert) {
            await render(TEMPLATE);
            await doubleClick(rowLabel(0));
            await fillIn(renameField(), '   ');
            await blur(renameField());

            assert.deepEqual(updated, [], 'whitespace alone is refused');
        });
    });
});
