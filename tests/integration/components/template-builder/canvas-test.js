import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function styleValue(style, property) {
    const match = new RegExp(`${property}:\\s*([^;]+)`).exec(style);

    return match ? match[1].trim() : undefined;
}

module('Integration | Component | template-builder/canvas', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders an A4 page by default when no template is given', async function (assert) {
        await render(hbs`<TemplateBuilder::Canvas />`);

        const style = find('.tb-canvas').getAttribute('style');
        assert.strictEqual(styleValue(style, 'width'), '794px', 'A4 width in pixels');
        assert.strictEqual(styleValue(style, 'height'), '1123px', 'A4 height in pixels');
    });

    test('it converts millimetres to pixels at 96 PPI', async function (assert) {
        this.set('template', { width: 210, height: 297, unit: 'mm' });

        await render(hbs`<TemplateBuilder::Canvas @template={{this.template}} />`);

        const style = find('.tb-canvas').getAttribute('style');
        assert.strictEqual(styleValue(style, 'width'), '794px');
        assert.strictEqual(styleValue(style, 'height'), '1123px');
    });

    test('it converts centimetres to pixels', async function (assert) {
        this.set('template', { width: 2.54, height: 5.08, unit: 'cm' });

        await render(hbs`<TemplateBuilder::Canvas @template={{this.template}} />`);

        const style = find('.tb-canvas').getAttribute('style');
        assert.strictEqual(styleValue(style, 'width'), '96px', '1 inch');
        assert.strictEqual(styleValue(style, 'height'), '192px', '2 inches');
    });

    test('it converts inches to pixels', async function (assert) {
        this.set('template', { width: 8.5, height: 11, unit: 'in' });

        await render(hbs`<TemplateBuilder::Canvas @template={{this.template}} />`);

        const style = find('.tb-canvas').getAttribute('style');
        assert.strictEqual(styleValue(style, 'width'), '816px');
        assert.strictEqual(styleValue(style, 'height'), '1056px');
    });

    test('pixels pass through unchanged, and an unknown unit is treated as pixels', async function (assert) {
        this.set('template', { width: 500, height: 400, unit: 'px' });
        await render(hbs`<TemplateBuilder::Canvas @template={{this.template}} />`);
        assert.strictEqual(styleValue(find('.tb-canvas').getAttribute('style'), 'width'), '500px');

        this.set('template', { width: 500, height: 400, unit: 'furlongs' });
        assert.strictEqual(styleValue(find('.tb-canvas').getAttribute('style'), 'width'), '500px', 'an unrecognised unit falls back to px');
    });

    test('a template without explicit dimensions falls back to A4 millimetres', async function (assert) {
        this.set('template', {});

        await render(hbs`<TemplateBuilder::Canvas @template={{this.template}} />`);

        const style = find('.tb-canvas').getAttribute('style');
        assert.strictEqual(styleValue(style, 'width'), '794px');
        assert.strictEqual(styleValue(style, 'height'), '1123px');
    });

    test('zoom scales the rendered canvas but not the logical size', async function (assert) {
        this.set('template', { width: 100, height: 200, unit: 'px' });

        await render(hbs`<TemplateBuilder::Canvas @template={{this.template}} @zoom={{2}} />`);

        const style = find('.tb-canvas').getAttribute('style');
        assert.strictEqual(styleValue(style, 'width'), '200px');
        assert.strictEqual(styleValue(style, 'height'), '400px');
    });

    test('zoom defaults to 1', async function (assert) {
        this.set('template', { width: 100, height: 200, unit: 'px' });

        await render(hbs`<TemplateBuilder::Canvas @template={{this.template}} />`);

        assert.strictEqual(styleValue(find('.tb-canvas').getAttribute('style'), 'width'), '100px');
    });

    test('the background colour comes from the template and defaults to white', async function (assert) {
        this.set('template', { width: 10, height: 10, unit: 'px' });
        await render(hbs`<TemplateBuilder::Canvas @template={{this.template}} />`);
        assert.strictEqual(styleValue(find('.tb-canvas').getAttribute('style'), 'background'), '#ffffff');

        this.set('template', { width: 10, height: 10, unit: 'px', background_color: '#ff0000' });
        assert.strictEqual(styleValue(find('.tb-canvas').getAttribute('style'), 'background'), '#ff0000');
    });

    test('the canvas gets a unique id', async function (assert) {
        await render(hbs`<TemplateBuilder::Canvas />`);

        const id = find('.tb-canvas').id;
        assert.ok(id.startsWith('tb-canvas-'), `expected a namespaced id, got ${id}`);
    });

    test('it renders no elements when the template has no content', async function (assert) {
        this.set('template', { width: 10, height: 10, unit: 'px' });

        await render(hbs`<TemplateBuilder::Canvas @template={{this.template}} />`);

        assert.strictEqual(find('.tb-canvas').children.length, 0);
    });

    // The canvas forwards a tap on an element straight to @onSelectElement. interact.js listens
    // for real pointer events, so this drives it the way a browser would.
    module('selecting an element', function () {
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

        async function tap(node) {
            const box = node.getBoundingClientRect();
            const at = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
            pointer('pointerdown', at.x, at.y, node);
            pointer('pointerup', at.x, at.y, node);
            await settled();
        }

        const WITH_ELEMENT = {
            width: 200,
            height: 200,
            unit: 'px',
            content: [{ uuid: 'el_1', type: 'text', x: 10, y: 10, width: 100, height: 40, z_index: 1, props: { content: 'Hello' } }],
        };

        test('tapping an element reports it to the parent', async function (assert) {
            const selected = [];
            this.set('template', WITH_ELEMENT);
            this.set('onSelectElement', (element) => selected.push(element));

            await render(hbs`<TemplateBuilder::Canvas @template={{this.template}} @onSelectElement={{this.onSelectElement}} />`);
            await tap(find('.tb-element'));

            assert.deepEqual(
                selected.map((element) => element.uuid),
                ['el_1'],
                'the element the parent needs to select is handed up'
            );
        });

        test('tapping an element with no handler above is harmless', async function (assert) {
            this.set('template', WITH_ELEMENT);

            await render(hbs`<TemplateBuilder::Canvas @template={{this.template}} />`);
            await tap(find('.tb-element'));

            assert.dom('.tb-element').exists('the canvas survives a tap with nothing listening');
        });
    });

    test('clicking the canvas background deselects', async function (assert) {
        let deselects = 0;
        this.set('onDeselectAll', () => deselects++);

        await render(hbs`<TemplateBuilder::Canvas @onDeselectAll={{this.onDeselectAll}} />`);
        await click('.tb-canvas');

        assert.strictEqual(deselects, 1);
    });

    test('a click that bubbles from a child does not deselect', async function (assert) {
        let deselects = 0;
        this.set('onDeselectAll', () => deselects++);
        this.set('template', { width: 200, height: 200, unit: 'px' });

        await render(hbs`
            <TemplateBuilder::Canvas @template={{this.template}} @onDeselectAll={{this.onDeselectAll}}>
                <button type="button" data-test-child>child</button>
            </TemplateBuilder::Canvas>
        `);

        // The canvas does not yield, so append a child directly to exercise the bubbling case.
        const canvas = find('.tb-canvas');
        const inner = document.createElement('span');
        canvas.appendChild(inner);

        await click(inner);

        assert.strictEqual(deselects, 0, 'a click that merely bubbles through does not clear the selection');
    });

    test('clicking the background without a handler does not throw', async function (assert) {
        await render(hbs`<TemplateBuilder::Canvas />`);
        await click('.tb-canvas');

        assert.dom('.tb-canvas').exists();
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<TemplateBuilder::Canvas data-test-canvas="yes" class="extra" />`);

        assert.dom('.tb-canvas').hasAttribute('data-test-canvas', 'yes');
        assert.dom('.tb-canvas').hasClass('extra');
    });

    test('dimensions update when the template changes', async function (assert) {
        this.set('template', { width: 100, height: 100, unit: 'px' });

        await render(hbs`<TemplateBuilder::Canvas @template={{this.template}} />`);
        assert.strictEqual(styleValue(find('.tb-canvas').getAttribute('style'), 'width'), '100px');

        this.set('template', { width: 300, height: 100, unit: 'px' });
        assert.strictEqual(styleValue(find('.tb-canvas').getAttribute('style'), 'width'), '300px');
    });
});
