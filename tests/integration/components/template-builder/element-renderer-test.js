import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function element(overrides = {}) {
    return { uuid: 'el_1', type: 'text', x: 10, y: 20, width: 200, height: 40, ...overrides };
}

function wrapper() {
    return find('.tb-element');
}

function styleOf(selector) {
    return find(selector).getAttribute('style') ?? '';
}

module('Integration | Component | template-builder/element-renderer', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('templateElement', element());
    });

    const TEMPLATE = hbs`
        <TemplateBuilder::ElementRenderer
            @element={{this.templateElement}}
            @isSelected={{this.isSelected}}
            @zoom={{this.zoom}}
            @canvasWidth={{this.canvasWidth}}
            @canvasHeight={{this.canvasHeight}}
            @onSelect={{this.onSelect}}
            @onMove={{this.onMove}}
            @onResize={{this.onResize}}
        />
    `;

    module('the wrapper', function () {
        test('it renders an absolutely positioned box carrying the element identity', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.tb-element').exists();
            assert.dom(wrapper()).hasAttribute('data-element-type', 'text');
            assert.dom(wrapper()).hasAttribute('data-element-uuid', 'el_1');

            const style = styleOf('.tb-element');
            assert.true(style.includes('position: absolute'));
            assert.true(style.includes('left: 0'));
            assert.true(style.includes('top: 0'));
            assert.true(style.includes('width: 200px'));
            assert.true(style.includes('height: 40px'));
            assert.true(style.includes('z-index: 1'), 'a default z-index is applied');
            // wrapperStyle itself omits the transform; did-insert writes it onto the
            // element's inline style afterwards, which is why it shows up here.
            assert.true(style.includes('cursor: move'));
        });

        test('width, height and z-index fall back to defaults', async function (assert) {
            this.set('templateElement', { uuid: 'el_1', type: 'text' });

            await render(TEMPLATE);

            const style = styleOf('.tb-element');
            assert.true(style.includes('width: 100px'));
            assert.true(style.includes('height: 30px'));
            assert.true(style.includes('z-index: 1'));
        });

        test('an explicit z-index and opacity are applied', async function (assert) {
            this.set('templateElement', element({ z_index: 7, opacity: 0.5 }));

            await render(TEMPLATE);

            const style = styleOf('.tb-element');
            assert.true(style.includes('z-index: 7'));
            assert.true(style.includes('opacity: 0.5'));
        });

        test('an opacity of zero is still applied', async function (assert) {
            this.set('templateElement', element({ opacity: 0 }));

            await render(TEMPLATE);

            assert.true(styleOf('.tb-element').includes('opacity: 0'), 'zero is a real opacity, not a missing one');
        });

        test('no opacity is emitted when none is set', async function (assert) {
            await render(TEMPLATE);

            assert.false(styleOf('.tb-element').includes('opacity'));
        });

        test('the initial position is applied as a transform', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(wrapper().dataset.x, '10');
            assert.strictEqual(wrapper().dataset.y, '20');
            assert.strictEqual(wrapper().style.transform, 'translate(10px, 20px)');
        });

        test('a rotated element carries the rotation in its transform', async function (assert) {
            this.set('templateElement', element({ rotation: 45 }));

            await render(TEMPLATE);

            assert.strictEqual(wrapper().style.transform, 'translate(10px, 20px) rotate(45deg)');
            assert.strictEqual(wrapper().dataset.rotation, '45');
        });

        test('an element with no position starts at the origin', async function (assert) {
            this.set('templateElement', { uuid: 'el_1', type: 'text' });

            await render(TEMPLATE);

            assert.strictEqual(wrapper().style.transform, 'translate(0px, 0px)');
        });

        test('the transform survives a re-render of the element', async function (assert) {
            await render(TEMPLATE);
            assert.strictEqual(wrapper().style.transform, 'translate(10px, 20px)');

            this.set('templateElement', element({ z_index: 9, rotation: 90 }));
            await settled();

            assert.strictEqual(wrapper().style.transform, 'translate(10px, 20px) rotate(90deg)', 'position is preserved and the new rotation applied');
            assert.true(styleOf('.tb-element').includes('z-index: 9'));
        });
    });

    module('selection', function () {
        test('an unselected element offers a hover affordance and no handles', async function (assert) {
            await render(TEMPLATE);

            assert.dom(wrapper()).hasClass('hover:ring-1');
            assert.strictEqual(findAll('.tb-element-handle').length, 0);
        });

        test('a selected element is ringed and grows four resize handles', async function (assert) {
            this.set('isSelected', true);

            await render(TEMPLATE);

            assert.dom(wrapper()).hasClass('ring-2');
            assert.dom(wrapper()).hasClass('ring-blue-500');
            assert.deepEqual(
                findAll('.tb-element-handle').map((handle) => handle.className.split(' ')[1]),
                ['tb-handle-nw', 'tb-handle-ne', 'tb-handle-sw', 'tb-handle-se']
            );
        });
    });

    module('text elements', function () {
        test('the content is rendered', async function (assert) {
            this.set('templateElement', element({ content: 'Invoice total' }));

            await render(TEMPLATE);

            assert.dom('.tb-element-text').containsText('Invoice total');
        });

        test('an element with no content renders an empty box', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.tb-element-text').exists();
            assert.dom('.tb-element-text').hasText('');
        });

        test('every typographic property reaches the style', async function (assert) {
            this.set(
                'templateElement',
                element({
                    content: 'Styled',
                    font_size: 18,
                    font_family: 'Inter',
                    font_weight: 'bold',
                    font_style: 'italic',
                    text_align: 'center',
                    text_decoration: 'underline',
                    line_height: 1.4,
                    letter_spacing: 2,
                    color: 'rgb(1, 2, 3)',
                    background_color: 'rgb(4, 5, 6)',
                    padding: 8,
                })
            );

            await render(TEMPLATE);

            const style = styleOf('.tb-element-text');
            for (const fragment of [
                'font-size: 18px',
                'font-family: Inter',
                'font-weight: bold',
                'font-style: italic',
                'text-align: center',
                'text-decoration: underline',
                'line-height: 1.4',
                'letter-spacing: 2px',
                'color: rgb(1, 2, 3)',
                'background-color: rgb(4, 5, 6)',
                'padding: 8px',
            ]) {
                assert.true(style.includes(fragment), `${fragment} is applied`);
            }
        });

        test('borders are applied with their defaults', async function (assert) {
            this.set('templateElement', element({ content: 'Bordered', border_width: 2, border_radius: 4 }));

            await render(TEMPLATE);

            const style = styleOf('.tb-element-text');
            assert.true(style.includes('border: 2px solid rgb(0, 0, 0)') || style.includes('border: 2px solid #000000'), 'default style and colour are used');
            assert.true(style.includes('border-radius: 4px'));
        });

        test('an explicit border style and colour win', async function (assert) {
            this.set('templateElement', element({ content: 'Bordered', border_width: 3, border_style: 'dashed', border_color: 'rgb(9, 9, 9)' }));

            await render(TEMPLATE);

            assert.true(styleOf('.tb-element-text').includes('dashed'));
        });

        test('an unstyled text element emits no typographic declarations', async function (assert) {
            await render(TEMPLATE);

            const style = styleOf('.tb-element-text');
            assert.false(style.includes('font-size'));
            assert.false(style.includes('color:'));
            assert.true(style.includes('overflow: hidden'), 'but the structural styles are always present');
        });
    });

    module('image elements', function () {
        test('an image with a source is rendered', async function (assert) {
            this.set('templateElement', element({ type: 'image', src: '/logo.png', alt: 'Company logo' }));

            await render(TEMPLATE);

            assert.dom('img').hasAttribute('src', '/logo.png');
            assert.dom('img').hasAttribute('alt', 'Company logo');
        });

        test('object fit and radius are applied', async function (assert) {
            this.set('templateElement', element({ type: 'image', src: '/logo.png', object_fit: 'contain', border_radius: 6 }));

            await render(TEMPLATE);

            const style = find('img').getAttribute('style');
            assert.true(style.includes('object-fit: contain'));
            assert.true(style.includes('border-radius: 6px'));
        });

        test('an image with no source shows a placeholder instead', async function (assert) {
            this.set('templateElement', element({ type: 'image' }));

            await render(TEMPLATE);

            assert.dom('img').doesNotExist();
            assert.dom('.tb-element svg').exists('a placeholder icon is shown');
        });

        test('an image with no alt text still renders', async function (assert) {
            this.set('templateElement', element({ type: 'image', src: '/logo.png' }));

            await render(TEMPLATE);

            assert.dom('img').hasAttribute('alt', '');
        });
    });

    module('table elements', function () {
        test('columns and rows are rendered', async function (assert) {
            this.set(
                'templateElement',
                element({
                    type: 'table',
                    columns: [{ label: 'Item' }, { label: 'Qty' }],
                    rows: [['Widget', '2']],
                })
            );

            await render(TEMPLATE);

            assert.deepEqual(
                findAll('th').map((cell) => cell.textContent.trim()),
                ['Item', 'Qty']
            );
            assert.strictEqual(findAll('tbody tr').length, 1);
        });

        test('with columns but no rows a placeholder grid is shown', async function (assert) {
            this.set('templateElement', element({ type: 'table', columns: [{ label: 'Item' }] }));

            await render(TEMPLATE);

            assert.strictEqual(findAll('tbody tr').length, 3, 'three placeholder rows');
            assert.dom('tbody td').hasText('—');
        });

        test('with no columns at all it says so', async function (assert) {
            this.set('templateElement', element({ type: 'table' }));

            await render(TEMPLATE);

            assert.dom('.tb-element').containsText('No columns defined');
        });

        test('header, cell and border styling is applied', async function (assert) {
            this.set(
                'templateElement',
                element({
                    type: 'table',
                    columns: [{ label: 'Item' }],
                    rows: [['Widget']],
                    border_color: 'rgb(1, 1, 1)',
                    header_background: 'rgb(2, 2, 2)',
                    header_color: 'rgb(3, 3, 3)',
                    header_font_size: 14,
                    header_font_weight: 'bold',
                    cell_padding: 5,
                    cell_font_size: 11,
                })
            );

            await render(TEMPLATE);

            assert.true(find('table').getAttribute('style').includes('border-color: rgb(1, 1, 1)'));

            const header = find('th').getAttribute('style');
            assert.true(header.includes('background-color: rgb(2, 2, 2)'));
            assert.true(header.includes('color: rgb(3, 3, 3)'));
            assert.true(header.includes('font-size: 14px'));
            assert.true(header.includes('font-weight: bold'));

            const cell = find('tbody td').getAttribute('style');
            assert.true(cell.includes('padding: 5px'));
            assert.true(cell.includes('font-size: 11px'));
            assert.true(cell.includes('border-color: rgb(1, 1, 1)'));
        });

        test('an unstyled table emits no border colour', async function (assert) {
            this.set('templateElement', element({ type: 'table', columns: [{ label: 'Item' }] }));

            await render(TEMPLATE);

            assert.strictEqual(find('table').getAttribute('style'), '');
        });
    });

    module('line elements', function () {
        test('a line uses its defaults', async function (assert) {
            this.set('templateElement', element({ type: 'line' }));

            await render(TEMPLATE);

            const inner = find('.tb-element-line div').getAttribute('style');
            assert.true(inner.includes('border-top: 1px solid'), 'a one-pixel solid line by default');
        });

        test('line width, style and colour are applied', async function (assert) {
            this.set('templateElement', element({ type: 'line', line_width: 3, line_style: 'dotted', color: 'rgb(7, 7, 7)' }));

            await render(TEMPLATE);

            const inner = find('.tb-element-line div').getAttribute('style');
            assert.true(inner.includes('border-top: 3px dotted rgb(7, 7, 7)'));
        });
    });

    module('shape elements', function () {
        test('a bare shape fills its box', async function (assert) {
            this.set('templateElement', element({ type: 'shape' }));

            await render(TEMPLATE);

            assert.dom('.tb-element-shape').exists();
            assert.true(styleOf('.tb-element-shape').includes('width: 100%'));
        });

        test('background, border and radius are applied', async function (assert) {
            this.set('templateElement', element({ type: 'shape', background_color: 'rgb(8, 8, 8)', border_width: 2, border_radius: 10 }));

            await render(TEMPLATE);

            const style = styleOf('.tb-element-shape');
            assert.true(style.includes('background-color: rgb(8, 8, 8)'));
            assert.true(style.includes('border: 2px solid'));
            assert.true(style.includes('border-radius: 10px'));
        });

        test('a circle shape is fully rounded regardless of radius', async function (assert) {
            this.set('templateElement', element({ type: 'shape', shape: 'circle', border_radius: 4 }));

            await render(TEMPLATE);

            const style = styleOf('.tb-element-shape');
            assert.true(style.includes('border-radius: 50%'), 'the circle rule is appended last so it wins');
        });
    });

    module('code elements', function () {
        test('a qr code without a value is labelled generically', async function (assert) {
            this.set('templateElement', element({ type: 'qr_code' }));

            await render(TEMPLATE);

            assert.dom('.tb-element').containsText('QR Code');
        });

        test('a barcode without a value is labelled generically', async function (assert) {
            this.set('templateElement', element({ type: 'barcode' }));

            await render(TEMPLATE);

            assert.dom('.tb-element').containsText('Barcode');
        });

        test('a value replaces the generic label', async function (assert) {
            this.set('templateElement', element({ type: 'qr_code', value: '{order.tracking}' }));

            await render(TEMPLATE);

            assert.dom('.tb-element').containsText('{order.tracking}');
            assert.dom('.tb-element').doesNotContainText('QR Code');
        });
    });

    module('unknown types', function () {
        test('an element with no type is treated as text', async function (assert) {
            this.set('templateElement', { uuid: 'el_1', content: 'Untyped' });

            await render(TEMPLATE);

            assert.dom(wrapper()).hasAttribute('data-element-type', 'text');
            assert.dom('.tb-element-text').containsText('Untyped');
        });

        test('an unrecognised type renders the wrapper but no body', async function (assert) {
            this.set('templateElement', element({ type: 'hologram' }));

            await render(TEMPLATE);

            assert.dom(wrapper()).hasAttribute('data-element-type', 'hologram');
            assert.dom('.tb-element-text').doesNotExist();
            assert.dom('.tb-element-shape').doesNotExist();
        });
    });

    test('it renders and tears down cleanly without any callbacks', async function (assert) {
        this.set('show', true);

        await render(hbs`{{#if this.show}}<TemplateBuilder::ElementRenderer @element={{this.templateElement}} />{{/if}}`);
        assert.dom('.tb-element').exists();

        this.set('show', false);
        await settled();

        assert.dom('.tb-element').doesNotExist('the interact.js instance is torn down without error');
    });
});
