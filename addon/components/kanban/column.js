import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { debug } from '@ember/debug';

/**
 * Kanban Column Component
 *
 * Usage:
 * <Kanban::Column @column={{column}} as |Card|>
 *   <Card @card={{card}} />
 * </Kanban::Column>
 *
 * Or auto-render:
 * <Kanban::Column @column={{column}} />
 */
export default class KanbanColumnComponent extends Component {
    @tracked isDragOver = false;
    @tracked dragOverPosition = null;

    /**
     * Handle drag over column
     */
    @action
    onDragOver(event) {
        event.preventDefault();

        // Guard the dataTransfer like kanban.js's own drag handlers already do — a synthetic
        // or keyboard-driven dragover has none.
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }

        // Instead of checking drag data, check if there's a dragged card
        if (this.args.draggedCard) {
            this.isDragOver = true;
            this.calculateDropPosition(event);
        } else {
            debug('No dragged card found');
        }
    }

    /**
     * Handle drop on column
     */
    @action
    onDrop(event) {
        event.preventDefault();

        // The position comes from the last `dragover`, not from the drop event — and
        // `calculateTargetPosition()` reads `dragOverPosition`, so it has to run BEFORE the
        // reset below. Clearing first made the fallback (`cards.length`) fire on every drop,
        // so a card dropped between two cards always landed at the end of the column.
        const targetPosition = this.calculateTargetPosition();

        this.isDragOver = false;
        this.dragOverPosition = null;

        const dragData = this.getDragData(event);
        if (!dragData) return;

        if (dragData.type === 'card' && this.args.onCardDrop) {
            this.args.onCardDrop(this.args.column.id, targetPosition, event);
        } else if (dragData.type === 'column' && this.args.onColumnDrop) {
            this.args.onColumnDrop(this.args.column.position, event);
        }
    }

    /**
     * Handle drag leave
     */
    @action
    onDragLeave(event) {
        // Only remove drag over if we're actually leaving the column
        if (!event.currentTarget.contains(event.relatedTarget)) {
            this.isDragOver = false;
            this.dragOverPosition = null;
        }
    }

    /**
     * Handle column drag start
     */
    @action
    onColumnDragStart(event) {
        if (this.args.onColumnDragStart) {
            this.args.onColumnDragStart(this.args.column, event);
        }
    }

    /**
     * Handle column drag end
     */
    @action
    onColumnDragEnd(event) {
        if (this.args.onColumnDragEnd) {
            this.args.onColumnDragEnd(this.args.column, event);
        }
    }

    /**
     * Handle create card
     */
    @action
    onCreateCard() {
        if (this.args.onCreateCard) {
            this.args.onCreateCard(this.args.column.id);
        }
    }

    /**
     * Get drag data from event
     */
    getDragData(event) {
        try {
            const data = event.dataTransfer.getData('application/json');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Calculate drop position based on mouse position
     */
    calculateDropPosition(event) {
        const columnBody = event.currentTarget.querySelector('.kanban-column-body');
        /* istanbul ignore next -- the column template always renders a `.kanban-column-body`, and
           this only runs with the column element as currentTarget. */
        if (!columnBody) return;

        const cards = columnBody.querySelectorAll('.kanban-card');
        const mouseY = event.clientY;

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const rect = card.getBoundingClientRect();
            const cardMiddle = rect.top + rect.height / 2;

            if (mouseY < cardMiddle) {
                this.dragOverPosition = i;
                return;
            }
        }

        // If we get here, drop at the end
        this.dragOverPosition = cards.length;
    }

    /**
     * Calculate target position for drop
     */
    calculateTargetPosition() {
        return this.dragOverPosition !== null ? this.dragOverPosition : this.cards.length;
    }

    /**
     * Get column cards
     */
    get cards() {
        return this.args.column?.cards || [];
    }

    /**
     * Get column title
     */
    get title() {
        return this.args.column?.title || 'Untitled Column';
    }

    /**
     * Check if column is draggable
     */
    get isDraggable() {
        return !this.args.readonly && !this.args.disabled && this.args.onColumnDragStart;
    }
}
