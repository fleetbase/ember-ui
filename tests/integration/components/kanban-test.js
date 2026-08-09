import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, triggerEvent, triggerKeyEvent, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const CARD_A = { id: 'card_a', title: 'Collect the pallet', columnId: 'col_todo', position: 0 };
const CARD_B = { id: 'card_b', title: 'Dispatch the driver', columnId: 'col_todo', position: 1 };

const COLUMNS = [
    { id: 'col_todo', title: 'To Do', position: 0, cards: [CARD_A, CARD_B] },
    { id: 'col_done', title: 'Done', position: 1, cards: [] },
];

// A minimal stand-in for the browser's DataTransfer, enough for the handlers under test.
function makeDataTransfer(payload) {
    const store = {};
    return {
        effectAllowed: null,
        dropEffect: null,
        setData: (type, value) => (store[type] = value),
        getData: (type) => (payload !== undefined ? payload : (store[type] ?? '')),
    };
}

function board() {
    return find('.kanban-board');
}

function columnTitles() {
    return findAll('.kanban-column-title').map((node) => node.textContent.trim());
}

module('Integration | Component | kanban', function (hooks) {
    setupRenderingTest(hooks);

    let calls;

    hooks.beforeEach(function () {
        calls = [];
        this.set('columns', COLUMNS);
        this.set('onCardMove', (...args) => calls.push(['cardMove', ...args]));
        this.set('onColumnMove', (...args) => calls.push(['columnMove', ...args]));
        this.set('onCardDragStart', (...args) => calls.push(['cardDragStart', ...args]));
        this.set('onCardDragEnd', (...args) => calls.push(['cardDragEnd', ...args]));
    });

    const TEMPLATE = hbs`
        <Kanban
            @columns={{this.columns}}
            @title={{this.title}}
            @headerOffset={{this.headerOffset}}
            @columnIdPath={{this.columnIdPath}}
            @onCardMove={{this.onCardMove}}
            @onColumnMove={{this.onColumnMove}}
            @onCardDragStart={{this.onCardDragStart}}
            @onCardDragEnd={{this.onCardDragEnd}}
        />
    `;

    module('rendering', function () {
        test('it renders a column per column', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.kanban-board').hasAttribute('role', 'application');
            assert.deepEqual(columnTitles(), ['To Do', 'Done']);
            assert.strictEqual(findAll('.kanban-card').length, 2, 'the cards of each column are rendered');
        });

        test('with no columns it renders an empty board', async function (assert) {
            this.set('columns', undefined);

            await render(TEMPLATE);

            assert.dom('.kanban-columns-container').exists();
            assert.strictEqual(columnTitles().length, 0);
        });

        test('the board is labelled generically until a title is given', async function (assert) {
            await render(TEMPLATE);
            assert.dom(board()).hasAttribute('aria-label', 'Kanban Board');
            assert.dom('.kanban-board-header').doesNotExist();

            this.set('title', 'Dispatch Board');

            assert.dom(board()).hasAttribute('aria-label', 'Dispatch Board');
            assert.dom('.kanban-board-title').hasText('Dispatch Board');
        });

        test('the board height accounts for the header offset', async function (assert) {
            await render(TEMPLATE);
            // The browser rewrites the calc() expression, so assert on its parts.
            assert.true(board().style.height.includes('100vh'));
            assert.true(board().style.height.includes('0px'));

            this.set('headerOffset', 64);

            assert.true(board().style.height.includes('64px'), 'the offset is subtracted from the viewport height');
        });

        test('a block replaces the default column rendering', async function (assert) {
            await render(hbs`
                <Kanban @columns={{this.columns}} as |Column column|>
                    <div class="custom-column">{{column.title}}</div>
                </Kanban>
            `);

            const rendered = findAll('.custom-column').map((node) => node.textContent.trim());
            assert.deepEqual(rendered, ['To Do', 'Done']);
            assert.strictEqual(findAll('.kanban-column').length, 0, 'the default columns are not also rendered');
        });
    });

    module('dragging a card', function () {
        async function dragCard(assert) {
            const dataTransfer = makeDataTransfer();
            await triggerEvent(findAll('.kanban-card')[0], 'dragstart', { dataTransfer });
            assert.ok(dataTransfer.getData('application/json'), 'the drag carries a payload');
            return dataTransfer;
        }

        test('drag start records the card and describes it on the event', async function (assert) {
            await render(TEMPLATE);
            const dataTransfer = await dragCard(assert);

            const payload = JSON.parse(dataTransfer.getData('application/json'));
            assert.deepEqual(payload, { type: 'card', cardId: 'card_a', sourceColumnId: 'col_todo' });
            assert.strictEqual(dataTransfer.effectAllowed, 'move');
            assert.strictEqual(calls[0][0], 'cardDragStart', 'the parent is told');
        });

        test('the source column can be read from a custom path', async function (assert) {
            this.set('columnIdPath', 'id');

            await render(TEMPLATE);
            const dataTransfer = await dragCard(assert);

            const payload = JSON.parse(dataTransfer.getData('application/json'));
            assert.strictEqual(payload.sourceColumnId, 'card_a', 'the configured path is used instead of columnId');
        });

        test('a drag start with no dataTransfer is ignored', async function (assert) {
            await render(TEMPLATE);
            await triggerEvent(findAll('.kanban-card')[0], 'dragstart', {});

            assert.deepEqual(calls, [], 'nothing is recorded and nothing throws');
        });

        test('dropping a card on another column reports the move', async function (assert) {
            await render(TEMPLATE);
            await dragCard(assert);

            const doneColumn = findAll('.kanban-column')[1];
            await triggerEvent(doneColumn, 'drop', { dataTransfer: makeDataTransfer(JSON.stringify({ type: 'card' })) });

            const move = calls.find(([name]) => name === 'cardMove');
            assert.ok(move, 'the move is reported');
            assert.strictEqual(move[1], CARD_A, 'the card that moved');
            assert.strictEqual(move[2], 'col_done', 'the target column');
            assert.strictEqual(move[4], 'col_todo', 'the source column');
        });

        test('dropping a card back where it started is not a move', async function (assert) {
            // With one card and no dragover, the target position resolves to cards.length (1),
            // so a card already at position 1 in this column has not moved at all.
            const stationary = { id: 'card_c', title: 'Stay put', columnId: 'col_todo', position: 1 };
            this.set('columns', [{ id: 'col_todo', title: 'To Do', position: 0, cards: [stationary] }]);

            await render(TEMPLATE);
            await triggerEvent(findAll('.kanban-card')[0], 'dragstart', { dataTransfer: makeDataTransfer() });
            await triggerEvent(findAll('.kanban-column')[0], 'drop', { dataTransfer: makeDataTransfer(JSON.stringify({ type: 'card' })) });

            assert.notOk(
                calls.find(([name]) => name === 'cardMove'),
                'no move is reported for an unchanged position'
            );
        });

        test('a drop with nothing being dragged is ignored', async function (assert) {
            await render(TEMPLATE);
            await triggerEvent(findAll('.kanban-column')[1], 'drop', { dataTransfer: makeDataTransfer(JSON.stringify({ type: 'card' })) });

            assert.deepEqual(calls, []);
        });

        test('drag end clears the dragged card and tells the parent', async function (assert) {
            await render(TEMPLATE);
            await dragCard(assert);
            await triggerEvent(findAll('.kanban-card')[0], 'dragend', { dataTransfer: makeDataTransfer() });

            assert.strictEqual(calls[calls.length - 1][0], 'cardDragEnd');

            await triggerEvent(findAll('.kanban-column')[1], 'drop', { dataTransfer: makeDataTransfer(JSON.stringify({ type: 'card' })) });
            assert.notOk(
                calls.find(([name]) => name === 'cardMove'),
                'the finished drag can no longer be dropped'
            );
        });

        test('escape during a drag cancels it', async function (assert) {
            await render(TEMPLATE);
            await dragCard(assert);

            await triggerKeyEvent(board(), 'keydown', 'Escape');

            assert.strictEqual(calls[calls.length - 1][0], 'cardDragEnd', 'the drag is ended');
        });

        test('escape when nothing is being dragged does nothing', async function (assert) {
            await render(TEMPLATE);
            await triggerKeyEvent(board(), 'keydown', 'Escape');

            assert.deepEqual(calls, []);
        });

        test('another key during a drag is ignored', async function (assert) {
            await render(TEMPLATE);
            await dragCard(assert);
            const beforeKey = calls.length;

            await triggerKeyEvent(board(), 'keydown', 'Enter');

            assert.strictEqual(calls.length, beforeKey);
        });

        test('it drags without any card callbacks', async function (assert) {
            await render(hbs`<Kanban @columns={{this.columns}} />`);

            await triggerEvent(findAll('.kanban-card')[0], 'dragstart', { dataTransfer: makeDataTransfer() });
            await triggerEvent(findAll('.kanban-column')[1], 'drop', { dataTransfer: makeDataTransfer(JSON.stringify({ type: 'card' })) });
            await triggerEvent(findAll('.kanban-card')[0], 'dragend', { dataTransfer: makeDataTransfer() });

            assert.dom('.kanban-board').exists('the whole drag completes without handlers');
        });
    });

    module('dragging a column', function () {
        test('a column drop is ignored while no column is being dragged', async function (assert) {
            await render(TEMPLATE);
            await triggerEvent(findAll('.kanban-column')[1], 'drop', { dataTransfer: makeDataTransfer(JSON.stringify({ type: 'column' })) });

            assert.notOk(
                calls.find(([name]) => name === 'columnMove'),
                'nothing is reported'
            );
        });

        test('a column drag end is reported and clears the dragged column', async function (assert) {
            this.set('onColumnDragEnd', (...args) => calls.push(['columnDragEnd', ...args]));

            await render(hbs`<Kanban @columns={{this.columns}} @onColumnDragEnd={{this.onColumnDragEnd}} />`);
            await triggerEvent(findAll('.kanban-column')[0], 'dragend', { dataTransfer: makeDataTransfer() });

            assert.strictEqual(calls[0][0], 'columnDragEnd');
            assert.strictEqual(calls[0][1], COLUMNS[0]);
        });

        test('a column drag end is inert without a handler', async function (assert) {
            await render(hbs`<Kanban @columns={{this.columns}} />`);
            await triggerEvent(findAll('.kanban-column')[0], 'dragend', { dataTransfer: makeDataTransfer() });

            assert.dom('.kanban-board').exists();
        });

        // Until DEFECTS.md #14 was fixed, `kanban.js` defined no `onColumnDragStart`, so
        // `column.js`'s `isDraggable` getter was permanently falsy and this whole path was
        // unreachable: columns were never draggable, `draggedColumn` was never set, and
        // `onColumnDrop` always early-returned.
        test('columns are draggable', async function (assert) {
            await render(TEMPLATE);

            assert.dom(findAll('.kanban-column')[0]).hasAttribute('draggable', 'true');
        });

        test('readonly and disabled each make the columns undraggable', async function (assert) {
            // `draggable` is an ENUMERATED attribute, so Glimmer serialises false as the string
            // "false" rather than omitting it.
            await render(hbs`<Kanban @columns={{this.columns}} @onColumnMove={{this.onColumnMove}} @readonly={{true}} />`);
            assert.dom(findAll('.kanban-column')[0]).hasAttribute('draggable', 'false', 'readonly wins');

            await render(hbs`<Kanban @columns={{this.columns}} @onColumnMove={{this.onColumnMove}} @disabled={{true}} />`);
            assert.dom(findAll('.kanban-column')[0]).hasAttribute('draggable', 'false', 'so does disabled');
        });

        test('dragging a column records it and a drop on another column reports the move', async function (assert) {
            await render(TEMPLATE);

            const [source, target] = findAll('.kanban-column');
            await triggerEvent(source, 'dragstart', { dataTransfer: makeDataTransfer() });
            await triggerEvent(target, 'drop', { dataTransfer: makeDataTransfer(JSON.stringify({ type: 'column', columnId: 'col_todo' })) });

            const move = calls.find(([name]) => name === 'columnMove');
            assert.ok(move, 'the move is reported');
            assert.strictEqual(move[1], COLUMNS[0], 'the dragged column is handed back');
            assert.strictEqual(move[2], 1, 'along with the target position');
        });

        test('a column drop after the drag ended reports nothing', async function (assert) {
            await render(TEMPLATE);

            const [source, target] = findAll('.kanban-column');
            await triggerEvent(source, 'dragstart', { dataTransfer: makeDataTransfer() });
            await triggerEvent(source, 'dragend', { dataTransfer: makeDataTransfer() });
            await triggerEvent(target, 'drop', { dataTransfer: makeDataTransfer(JSON.stringify({ type: 'column', columnId: 'col_todo' })) });

            assert.notOk(
                calls.find(([name]) => name === 'columnMove'),
                'the drag end cleared the dragged column'
            );
        });

        test('a column drag start is reported to the caller', async function (assert) {
            this.set('onColumnDragStart', (...args) => calls.push(['columnDragStart', ...args]));

            await render(hbs`<Kanban @columns={{this.columns}} @onColumnMove={{this.onColumnMove}} @onColumnDragStart={{this.onColumnDragStart}} />`);
            await triggerEvent(findAll('.kanban-column')[0], 'dragstart', { dataTransfer: makeDataTransfer() });

            assert.strictEqual(calls[0][0], 'columnDragStart');
            assert.strictEqual(calls[0][1], COLUMNS[0], 'the column comes first');
        });
    });
});
