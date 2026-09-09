import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, triggerEvent, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// The resizer positions itself against its parent cell and the owning <table>, so it has
// to be rendered inside a real table.
// Sized with presentational attributes rather than inline styles: the template linter
// forbids `style=` in .hbs, and the component needs a real table height and cell width.
const IN_TABLE = hbs`
    <table height="120">
        <thead>
            <tr>
                <th class="target-cell" width="200">
                    Name
                    <Table::Cell::Resizer />
                </th>
                <th>Status</th>
            </tr>
        </thead>
    </table>
`;

function resizer() {
    return find('.resizer');
}

function cell() {
    return find('.target-cell');
}

module('Integration | Component | table/cell/resizer', function (hooks) {
    setupRenderingTest(hooks);

    hooks.afterEach(async function () {
        // A drag attaches document-level listeners that are only removed on mouseup.
        await triggerEvent(document, 'mouseup', {});
    });

    module('setup', function () {
        test('it renders a resize handle', async function (assert) {
            await render(IN_TABLE);

            assert.dom('.resizer').exists();
        });

        test('it makes the owning cell sticky and non-wrapping', async function (assert) {
            await render(IN_TABLE);

            assert.dom(cell()).hasStyle({ position: 'sticky' });
            assert.dom(cell()).hasAttribute('nowrap');
        });

        test('it stretches the handle to the full height of the table', async function (assert) {
            await render(IN_TABLE);

            const table = find('table');
            assert.strictEqual(resizer().style.height, `${table.offsetHeight}px`);
            assert.true(table.offsetHeight > 0, 'the table has a real height to match');
        });

        test('outside a table the handle takes no explicit height', async function (assert) {
            await render(hbs`<div class="not-a-table"><Table::Cell::Resizer /></div>`);

            assert.dom('.resizer').exists();
            assert.strictEqual(resizer().style.height, '', 'no owner table means no height is imposed');
        });
    });

    module('dragging', function () {
        test('pressing the handle marks it as resizing', async function (assert) {
            await render(IN_TABLE);

            await triggerEvent(resizer(), 'mousedown', { clientX: 300 });

            assert.dom(resizer()).hasClass('resizing');
        });

        test('dragging right widens the cell by the travelled distance', async function (assert) {
            await render(IN_TABLE);
            const startWidth = parseInt(window.getComputedStyle(cell()).width, 10);

            await triggerEvent(resizer(), 'mousedown', { clientX: 300 });
            await triggerEvent(document, 'mousemove', { clientX: 360 });

            assert.strictEqual(cell().style.width, `${startWidth + 60}px`);

            await triggerEvent(document, 'mouseup', {});
        });

        test('dragging left narrows the cell', async function (assert) {
            await render(IN_TABLE);
            const startWidth = parseInt(window.getComputedStyle(cell()).width, 10);

            await triggerEvent(resizer(), 'mousedown', { clientX: 300 });
            await triggerEvent(document, 'mousemove', { clientX: 260 });

            assert.strictEqual(cell().style.width, `${startWidth - 40}px`);

            await triggerEvent(document, 'mouseup', {});
        });

        test('releasing clears the resizing state', async function (assert) {
            await render(IN_TABLE);

            await triggerEvent(resizer(), 'mousedown', { clientX: 300 });
            await triggerEvent(document, 'mouseup', {});

            assert.dom(resizer()).doesNotHaveClass('resizing');
        });

        test('movement after release no longer resizes the cell', async function (assert) {
            await render(IN_TABLE);

            await triggerEvent(resizer(), 'mousedown', { clientX: 300 });
            await triggerEvent(document, 'mousemove', { clientX: 360 });
            const afterDrag = cell().style.width;

            await triggerEvent(document, 'mouseup', {});
            await triggerEvent(document, 'mousemove', { clientX: 500 });

            assert.strictEqual(cell().style.width, afterDrag, 'the listener was removed');
        });

        test('a second drag starts from the new width', async function (assert) {
            await render(IN_TABLE);

            await triggerEvent(resizer(), 'mousedown', { clientX: 300 });
            await triggerEvent(document, 'mousemove', { clientX: 350 });
            await triggerEvent(document, 'mouseup', {});
            const widthAfterFirst = parseInt(cell().style.width, 10);

            await triggerEvent(resizer(), 'mousedown', { clientX: 400 });
            await triggerEvent(document, 'mousemove', { clientX: 430 });
            await triggerEvent(document, 'mouseup', {});

            assert.strictEqual(cell().style.width, `${widthAfterFirst + 30}px`);
        });
    });
});
