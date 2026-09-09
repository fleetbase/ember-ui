import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, triggerEvent, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const COLUMN = {
    id: 'col_todo',
    title: 'To Do',
    position: 0,
    cards: [
        { id: 'card_1', title: 'Collect the pallet', columnId: 'col_todo', position: 0 },
        { id: 'card_2', title: 'Dispatch the driver', columnId: 'col_todo', position: 1 },
    ],
};

// A minimal stand-in for the browser's DataTransfer, enough for the handlers under test.
function dataTransfer(payload) {
    return {
        dropEffect: null,
        getData: () => (payload === undefined ? '' : payload),
        setData() {},
    };
}

function cardPayload(overrides = {}) {
    return JSON.stringify({ type: 'card', cardId: 'card_1', sourceColumnId: 'col_todo', ...overrides });
}

function column() {
    return find('.kanban-column');
}

function indicators() {
    return findAll('.kanban-drop-indicator');
}

module('Integration | Component | kanban/column', function (hooks) {
    setupRenderingTest(hooks);

    let calls;

    hooks.beforeEach(function () {
        calls = [];
        this.set('column', COLUMN);
        this.set('onCardDrop', (...args) => calls.push(['cardDrop', ...args]));
        this.set('onColumnDrop', (...args) => calls.push(['columnDrop', ...args]));
        this.set('onCreateCard', (...args) => calls.push(['createCard', ...args]));
        this.set('onColumnDragStart', (...args) => calls.push(['columnDragStart', ...args]));
        this.set('onColumnDragEnd', (...args) => calls.push(['columnDragEnd', ...args]));
    });

    const TEMPLATE = hbs`
        <Kanban::Column
            @column={{this.column}}
            @draggedCard={{this.draggedCard}}
            @readonly={{this.readonly}}
            @disabled={{this.disabled}}
            @subject={{this.subject}}
            @onCardDrop={{this.onCardDrop}}
            @onColumnDrop={{this.onColumnDrop}}
            @onCreateCard={{this.onCreateCard}}
            @onColumnDragStart={{this.onColumnDragStart}}
            @onColumnDragEnd={{this.onColumnDragEnd}}
        />
    `;

    module('rendering', function () {
        test('it renders the title, the card count and the cards', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.kanban-column-title').hasText('To Do');
            assert.dom('.kanban-column-count').hasText('2');
            assert.strictEqual(findAll('.kanban-card').length, 2);
            assert.dom(column()).hasAttribute('data-column-id', 'col_todo');
        });

        test('a column with no title falls back to a placeholder', async function (assert) {
            this.set('column', { id: 'col_x', cards: [] });

            await render(TEMPLATE);

            assert.dom('.kanban-column-title').hasText('Untitled Column');
        });

        test('a missing column renders an empty, titled placeholder', async function (assert) {
            this.set('column', undefined);

            await render(TEMPLATE);

            assert.dom('.kanban-column-title').hasText('Untitled Column');
            assert.dom('.kanban-column-count').hasText('0');
            assert.dom('.kanban-column-empty').exists();
        });

        test('an empty column explains itself, pluralising the subject', async function (assert) {
            this.set('column', { id: 'col_x', title: 'Empty', cards: [] });

            await render(TEMPLATE);
            assert.dom('.kanban-empty-text').hasText('No cards yet');

            this.set('subject', 'delivery');
            assert.dom('.kanban-empty-text').hasText('No deliveries yet');
        });

        test('the add button is labelled by the subject and hidden when readonly', async function (assert) {
            await render(TEMPLATE);
            assert.dom('.kanban-add-card-button').hasText('+ Add a card');

            this.set('subject', 'delivery');
            assert.dom('.kanban-add-card-button').hasText('+ Add a delivery');

            this.set('readonly', true);
            assert.dom('.kanban-column-footer').doesNotExist();
        });

        test('the add button is disabled when the board is disabled', async function (assert) {
            this.set('disabled', true);

            await render(TEMPLATE);

            assert.dom('.kanban-add-card-button').isDisabled();
        });

        test('a block replaces the default card rendering and is given the card and index', async function (assert) {
            await render(hbs`
                <Kanban::Column @column={{this.column}} as |Card card index|>
                    <div class="custom-card">{{index}}:{{card.title}}</div>
                </Kanban::Column>
            `);

            const rendered = findAll('.custom-card').map((node) => node.textContent.trim());
            assert.deepEqual(rendered, ['0:Collect the pallet', '1:Dispatch the driver']);
        });
    });

    module('creating a card', function () {
        test('the add button reports the column it belongs to', async function (assert) {
            await render(TEMPLATE);
            await click('.kanban-add-card-button');

            assert.deepEqual(calls, [['createCard', 'col_todo']]);
        });

        test('it is inert without a handler', async function (assert) {
            await render(hbs`<Kanban::Column @column={{this.column}} />`);
            await click('.kanban-add-card-button');

            assert.dom('.kanban-column').exists('clicking is a no-op');
        });
    });

    module('drag feedback', function () {
        test('dragging a card over the column highlights it', async function (assert) {
            this.set('draggedCard', COLUMN.cards[0]);

            await render(TEMPLATE);
            await triggerEvent(column(), 'dragover', { dataTransfer: dataTransfer(), clientY: 0 });

            assert.dom(column()).hasClass('drag-over');
        });

        test('dragging over with nothing in hand does not highlight', async function (assert) {
            await render(TEMPLATE);
            await triggerEvent(column(), 'dragover', { dataTransfer: dataTransfer(), clientY: 0 });

            assert.dom(column()).doesNotHaveClass('drag-over');
            assert.strictEqual(indicators().length, 0);
        });

        test('the drop indicator lands before the card the cursor is above', async function (assert) {
            this.set('draggedCard', COLUMN.cards[0]);

            await render(TEMPLATE);
            const firstCard = find('.kanban-card').getBoundingClientRect();
            await triggerEvent(column(), 'dragover', { dataTransfer: dataTransfer(), clientY: firstCard.top });

            assert.strictEqual(indicators().length, 1);
            assert.strictEqual(find('.kanban-column-body').firstElementChild, indicators()[0], 'the indicator is above the first card');
        });

        test('dragging below every card puts the indicator at the end', async function (assert) {
            this.set('draggedCard', COLUMN.cards[0]);

            await render(TEMPLATE);
            await triggerEvent(column(), 'dragover', { dataTransfer: dataTransfer(), clientY: 100000 });

            assert.strictEqual(indicators().length, 1);
            assert.strictEqual(find('.kanban-column-body').lastElementChild, indicators()[0], 'the indicator is after the last card');
        });

        test('leaving the column clears the highlight', async function (assert) {
            this.set('draggedCard', COLUMN.cards[0]);

            await render(TEMPLATE);
            await triggerEvent(column(), 'dragover', { dataTransfer: dataTransfer(), clientY: 0 });
            assert.dom(column()).hasClass('drag-over');

            await triggerEvent(column(), 'dragleave', { relatedTarget: document.body });

            assert.dom(column()).doesNotHaveClass('drag-over');
            assert.strictEqual(indicators().length, 0);
        });

        // A drag started from the keyboard, or synthesised by an automation harness, carries no
        // DataTransfer at all; the handler has to survive that rather than throw on dropEffect.
        test('a dragover carrying no data transfer still tracks the position', async function (assert) {
            this.set('draggedCard', COLUMN.cards[0]);

            await render(TEMPLATE);
            await triggerEvent(column(), 'dragover', { clientY: 100000 });

            assert.dom(column()).hasClass('drag-over');
            assert.strictEqual(indicators().length, 1, 'the drop indicator is still placed');
        });

        test('moving between elements inside the column keeps the highlight', async function (assert) {
            this.set('draggedCard', COLUMN.cards[0]);

            await render(TEMPLATE);
            await triggerEvent(column(), 'dragover', { dataTransfer: dataTransfer(), clientY: 0 });
            await triggerEvent(column(), 'dragleave', { relatedTarget: find('.kanban-column-body') });

            assert.dom(column()).hasClass('drag-over', 'an inner element is not a real departure');
        });
    });

    module('dropping', function () {
        test('dropping a card reports the target column and position', async function (assert) {
            this.set('draggedCard', COLUMN.cards[0]);

            await render(TEMPLATE);
            await triggerEvent(column(), 'dragover', { dataTransfer: dataTransfer(), clientY: 100000 });
            await triggerEvent(column(), 'drop', { dataTransfer: dataTransfer(cardPayload()) });

            assert.strictEqual(calls[0][0], 'cardDrop');
            assert.strictEqual(calls[0][1], 'col_todo', 'the column id is reported');
            assert.strictEqual(calls[0][2], 2, 'the calculated position is reported');
            assert.dom(column()).doesNotHaveClass('drag-over', 'the highlight is cleared');
        });

        test('dropping between two cards reports the indicator position, not the end', async function (assert) {
            this.set('draggedCard', COLUMN.cards[0]);

            await render(TEMPLATE);
            const firstCard = find('.kanban-card').getBoundingClientRect();
            await triggerEvent(column(), 'dragover', { dataTransfer: dataTransfer(), clientY: firstCard.top });
            await triggerEvent(column(), 'drop', { dataTransfer: dataTransfer(cardPayload()) });

            assert.strictEqual(calls[0][2], 0, 'the position the indicator was showing is the position reported');
        });

        test('a drop with no preceding dragover falls back to the end of the column', async function (assert) {
            await render(TEMPLATE);
            await triggerEvent(column(), 'drop', { dataTransfer: dataTransfer(cardPayload()) });

            assert.strictEqual(calls[0][2], COLUMN.cards.length, 'with no tracked position the card lands last');
        });

        test('dropping a column reports that column position instead', async function (assert) {
            await render(TEMPLATE);
            await triggerEvent(column(), 'drop', { dataTransfer: dataTransfer(JSON.stringify({ type: 'column' })) });

            assert.strictEqual(calls[0][0], 'columnDrop');
            assert.strictEqual(calls[0][1], 0);
        });

        test('a drop with no payload is ignored', async function (assert) {
            await render(TEMPLATE);
            await triggerEvent(column(), 'drop', { dataTransfer: dataTransfer('') });

            assert.deepEqual(calls, []);
        });

        test('a drop carrying unparseable data is ignored', async function (assert) {
            await render(TEMPLATE);
            await triggerEvent(column(), 'drop', { dataTransfer: dataTransfer('not json at all') });

            assert.deepEqual(calls, [], 'the malformed payload does not throw');
        });

        test('a drop of an unrecognised type is ignored', async function (assert) {
            await render(TEMPLATE);
            await triggerEvent(column(), 'drop', { dataTransfer: dataTransfer(JSON.stringify({ type: 'something-else' })) });

            assert.deepEqual(calls, []);
        });

        test('a card drop with no handler is ignored', async function (assert) {
            await render(hbs`<Kanban::Column @column={{this.column}} />`);
            await triggerEvent(column(), 'drop', { dataTransfer: dataTransfer(cardPayload()) });

            assert.dom('.kanban-column').exists('the drop is absorbed');
        });
    });

    module('dragging the column itself', function () {
        test('a column is draggable only when a drag-start handler is given', async function (assert) {
            await render(TEMPLATE);
            assert.dom(column()).hasAttribute('draggable', 'true');

            await render(hbs`<Kanban::Column @column={{this.column}} />`);
            assert.dom(column()).doesNotHaveAttribute('draggable');
        });

        test('readonly and disabled both make the column undraggable', async function (assert) {
            this.set('readonly', true);
            await render(TEMPLATE);
            assert.dom(column()).hasAttribute('draggable', 'false');

            this.set('readonly', false);
            this.set('disabled', true);
            assert.dom(column()).hasAttribute('draggable', 'false');
        });

        test('drag start and drag end report the column', async function (assert) {
            await render(TEMPLATE);

            await triggerEvent(column(), 'dragstart', { dataTransfer: dataTransfer() });
            assert.strictEqual(calls[0][0], 'columnDragStart');
            assert.strictEqual(calls[0][1], COLUMN);

            await triggerEvent(column(), 'dragend', { dataTransfer: dataTransfer() });
            assert.strictEqual(calls[1][0], 'columnDragEnd');
            assert.strictEqual(calls[1][1], COLUMN);
        });

        test('drag start and drag end are inert without handlers', async function (assert) {
            await render(hbs`<Kanban::Column @column={{this.column}} />`);

            await triggerEvent(column(), 'dragstart', { dataTransfer: dataTransfer() });
            await triggerEvent(column(), 'dragend', { dataTransfer: dataTransfer() });

            assert.dom('.kanban-column').exists('no handler is required');
        });
    });
});
