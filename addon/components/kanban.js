import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * Main Kanban Board Component
 *
 * Usage:
 * <Kanban @columns={{this.columns}} @onCardMove={{this.handleCardMove}} as |Column|>
 *   <Column @column={{column}} as |Card|>
 *     <Card @card={{card}} />
 *   </Column>
 * </Kanban>
 *
 * Or auto-render:
 * <Kanban @columns={{this.columns}} @onCardMove={{this.handleCardMove}} />
 */
export default class KanbanComponent extends Component {
    @tracked draggedCard = null;
    @tracked draggedColumn = null;
    @tracked isDragging = false;

    get calculatedHeight() {
        const offset = this.args.headerOffset ?? 0;
        return `calc(100vh - ${offset}px)`;
    }

    /**
     * Handle card drag start
     */
    @action
    onCardDragStart(card, event) {
        const dt = event?.dataTransfer;
        if (!dt) return;

        this.isDragging = true;
        this.draggedCard = card;

        const dragData = JSON.stringify({
            type: 'card',
            cardId: card.id,
            sourceColumnId: this.args.columnIdPath ? card[this.args.columnIdPath] : card.columnId,
        });

        dt.setData('application/json', dragData);
        dt.setData('text/plain', dragData);
        dt.effectAllowed = 'move';

        // Call parent callback if provided
        if (this.args.onCardDragStart) {
            this.args.onCardDragStart(card, event);
        }
    }

    /**
     * Handle card drag end
     */
    @action
    onCardDragEnd(card, event) {
        this.isDragging = false;
        this.draggedCard = null;

        // Call parent callback if provided
        if (this.args.onCardDragEnd) {
            this.args.onCardDragEnd(card, event);
        }
    }

    /**
     * Handle card drop on column
     */
    @action
    onCardDrop(targetColumnId, targetPosition = null) {
        if (!this.draggedCard) return;

        const card = this.draggedCard;
        const columnIdPath = this.args.columnIdPath;
        const sourceColumnId = columnIdPath ? card[columnIdPath] : card.columnId;

        // Don't do anything if dropping in same position
        if (sourceColumnId === targetColumnId && targetPosition === card.position) {
            return;
        }

        // Call parent callback
        if (this.args.onCardMove) {
            this.args.onCardMove(card, targetColumnId, targetPosition, sourceColumnId);
        }

        this.isDragging = false;
        this.draggedCard = null;
    }

    /**
     * Handle column drag end
     */
    @action
    onColumnDragEnd(column, event) {
        this.draggedColumn = null;

        // Call parent callback if provided
        if (this.args.onColumnDragEnd) {
            this.args.onColumnDragEnd(column, event);
        }
    }

    /**
     * Handle column drop
     */
    @action
    onColumnDrop(targetPosition) {
        if (!this.draggedColumn) return;

        const column = this.draggedColumn;

        // Call parent callback
        if (this.args.onColumnMove) {
            this.args.onColumnMove(column, targetPosition);
        }
    }

    /**
     * Handle keyboard navigation
     */
    @action
    onKeyDown(event) {
        if (event.key === 'Escape' && this.isDragging) {
            this.onCardDragEnd(this.draggedCard, event);
        }
    }

    /**
     * Get columns array
     */
    get columns() {
        return this.args.columns || [];
    }
}
