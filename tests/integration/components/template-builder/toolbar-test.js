import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const ELEMENT_TYPES = ['Text', 'Image', 'Table', 'Line', 'Shape', 'QR Code', 'Barcode'];

function buttonByTitle(title) {
    return document.querySelector(`button[title="${title}"]`);
}

module('Integration | Component | template-builder/toolbar', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a button for every element type', async function (assert) {
        await render(hbs`<TemplateBuilder::Toolbar />`);

        for (const label of ELEMENT_TYPES) {
            assert.ok(buttonByTitle(`Add ${label}`), `an "Add ${label}" button is present`);
        }
    });

    test('clicking an element type reports that type', async function (assert) {
        const added = [];
        this.set('onAddElement', (type) => added.push(type));

        await render(hbs`<TemplateBuilder::Toolbar @onAddElement={{this.onAddElement}} />`);
        await click(buttonByTitle('Add Text'));
        await click(buttonByTitle('Add QR Code'));

        assert.deepEqual(added, ['text', 'qr_code'], 'the machine-readable type is reported, not the label');
    });

    test('adding an element without a handler does not throw', async function (assert) {
        await render(hbs`<TemplateBuilder::Toolbar />`);
        await click(buttonByTitle('Add Text'));

        assert.ok(buttonByTitle('Add Text'), 'the toolbar survives a click with nothing wired up');
    });

    test('the zoom level is shown as a whole percentage', async function (assert) {
        this.set('zoom', 1);
        await render(hbs`<TemplateBuilder::Toolbar @zoom={{this.zoom}} />`);
        assert.dom(this.element).containsText('100%');

        this.set('zoom', 0.5);
        assert.dom(this.element).containsText('50%');

        this.set('zoom', 1.755);
        assert.dom(this.element).containsText('176%', 'the percentage is rounded, not truncated');
    });

    test('zoom defaults to 100% when not supplied', async function (assert) {
        await render(hbs`<TemplateBuilder::Toolbar />`);

        assert.dom(this.element).containsText('100%');
    });

    test('the zoom controls report their actions', async function (assert) {
        const calls = [];
        this.set('onZoomIn', () => calls.push('in'));
        this.set('onZoomOut', () => calls.push('out'));
        this.set('onZoomReset', () => calls.push('reset'));

        await render(hbs`<TemplateBuilder::Toolbar @onZoomIn={{this.onZoomIn}} @onZoomOut={{this.onZoomOut}} @onZoomReset={{this.onZoomReset}} />`);
        await click(buttonByTitle('Zoom out'));
        await click(buttonByTitle('Zoom in'));

        assert.deepEqual(calls, ['out', 'in']);
    });

    test('undo and redo report their actions', async function (assert) {
        const calls = [];
        this.set('onUndo', () => calls.push('undo'));
        this.set('onRedo', () => calls.push('redo'));

        await render(hbs`<TemplateBuilder::Toolbar @canUndo={{true}} @canRedo={{true}} @onUndo={{this.onUndo}} @onRedo={{this.onRedo}} />`);
        await click(buttonByTitle('Undo'));
        await click(buttonByTitle('Redo'));

        assert.deepEqual(calls, ['undo', 'redo']);
    });

    test('preview reports its action', async function (assert) {
        let previews = 0;
        this.set('onPreview', () => previews++);

        await render(hbs`<TemplateBuilder::Toolbar @onPreview={{this.onPreview}} />`);
        await click(buttonByTitle('Preview template'));

        assert.strictEqual(previews, 1);
    });

    test('save reports its action', async function (assert) {
        let saves = 0;
        this.set('onSave', () => saves++);

        await render(hbs`<TemplateBuilder::Toolbar @onSave={{this.onSave}} />`);

        const save = findAll('button').find((button) => button.textContent.trim().toLowerCase().includes('save'));
        await click(save);

        assert.strictEqual(saves, 1);
    });

    test('the reset-zoom control reports its action', async function (assert) {
        let resets = 0;
        this.set('onZoomReset', () => resets++);

        await render(hbs`<TemplateBuilder::Toolbar @onZoomReset={{this.onZoomReset}} />`);
        await click(buttonByTitle('Reset zoom'));

        assert.strictEqual(resets, 1);
    });

    test('the close button only appears when @onClose is supplied', async function (assert) {
        await render(hbs`<TemplateBuilder::Toolbar />`);
        assert.notOk(buttonByTitle('Close'), 'no close affordance by default');

        this.set('onClose', () => {});
        await render(hbs`<TemplateBuilder::Toolbar @onClose={{this.onClose}} />`);
        assert.ok(buttonByTitle('Close'), 'supplying a handler reveals the close button');
    });

    test('the close button reports its action', async function (assert) {
        let closes = 0;
        this.set('onClose', () => closes++);

        await render(hbs`<TemplateBuilder::Toolbar @onClose={{this.onClose}} />`);
        await click(buttonByTitle('Close'));

        assert.strictEqual(closes, 1);
    });

    test('the close button uses the supplied label and icon', async function (assert) {
        this.set('onClose', () => {});

        await render(hbs`<TemplateBuilder::Toolbar @onClose={{this.onClose}} @closeLabel="Back to templates" @closeIcon="xmark" />`);

        assert.ok(buttonByTitle('Back to templates'), 'the label becomes the button title');
        assert.dom('.fa-xmark').exists('the configured icon is used');
    });

    test('the rotation controls are present but disabled until an element is selected', async function (assert) {
        this.set('onRotateElement', () => {});
        this.set('selectedElement', null);

        await render(hbs`<TemplateBuilder::Toolbar @selectedElement={{this.selectedElement}} @onRotateElement={{this.onRotateElement}} />`);
        assert.dom(buttonByTitle('Rotate left 90°')).isDisabled('rotation is unavailable without a selection');
        assert.dom(buttonByTitle('Rotate right 90°')).isDisabled();

        this.set('selectedElement', { uuid: 'el-1' });
        assert.dom(buttonByTitle('Rotate left 90°')).isNotDisabled('selecting an element enables rotation');
        assert.dom(buttonByTitle('Rotate right 90°')).isNotDisabled();
    });

    test('rotating reports the selected uuid and the signed delta', async function (assert) {
        const rotations = [];
        this.set('selectedElement', { uuid: 'el-1' });
        this.set('onRotateElement', (uuid, delta) => rotations.push([uuid, delta]));

        await render(hbs`<TemplateBuilder::Toolbar @selectedElement={{this.selectedElement}} @onRotateElement={{this.onRotateElement}} />`);

        await click(buttonByTitle('Rotate left 90°'));
        await click(buttonByTitle('Rotate right 90°'));

        assert.deepEqual(rotations, [
            ['el-1', -90],
            ['el-1', 90],
        ]);
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<TemplateBuilder::Toolbar data-test-toolbar="yes" class="extra" />`);

        assert.dom('.tb-toolbar').hasAttribute('data-test-toolbar', 'yes');
        assert.dom('.tb-toolbar').hasClass('extra');
    });
    // Every toolbar action guards its optional callback. The buttons are all enabled here —
    // undo/redo need @canUndo/@canRedo and the rotate pair needs a @selectedElement — but no
    // callback is supplied, which is the only way to reach the other side of those guards.
    test('every control is inert when its callback is not supplied', async function (assert) {
        this.set('selectedElement', { uuid: 'el_1' });
        await render(hbs`<TemplateBuilder::Toolbar @canUndo={{true}} @canRedo={{true}} @selectedElement={{this.selectedElement}} />`);

        for (const title of ['Zoom out', 'Reset zoom', 'Zoom in', 'Rotate left 90°', 'Rotate right 90°', 'Undo', 'Redo', 'Preview template']) {
            await click(buttonByTitle(title));
        }
        await click(findAll('button').find((button) => button.textContent.trim().toLowerCase().includes('save')));

        assert.ok(buttonByTitle('Zoom in'), 'the toolbar survives a click on every unwired control');
    });
});
