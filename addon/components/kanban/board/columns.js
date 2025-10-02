import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class KanbanBoardColumnsComponent extends Component {
    @service intl;

    /**
     * Drag and drop state
     */
    @tracked dragOverColumn = null;
    @tracked dragOverPosition = null;

    /**
     * Scroll state for horizontal scrolling
     */
    @tracked canScrollLeft = false;
    @tracked canScrollRight = false;

    /**
     * Get columns with computed properties
     */
    get processedColumns() {
        return (this.args.columns || []).map((column, index) => ({
            ...column,
            index,
            isFirst: index === 0,
            isLast: index === this.args.columns.length - 1,
            cardCount: column.cards?.length || 0,
            isOverWipLimit: column.wipLimit && (column.cards?.length || 0) > column.wipLimit,
        }));
    }

    /**
     * Check if board is empty
     */
    get isEmpty() {
        return this.processedColumns.length === 0;
    }

    /**
     * Handle column drag over
     */
    @action
    onColumnDragOver(column, event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        this.dragOverColumn = column;

        // Calculate drop position based on mouse position
        const rect = event.currentTarget.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        this.dragOverPosition = event.clientX < midpoint ? 'before' : 'after';
    }

    /**
     * Handle column drag leave
     */
    @action
    onColumnDragLeave() {
        this.dragOverColumn = null;
        this.dragOverPosition = null;
    }

    /**
     * Handle column drop
     */
    @action
    onColumnDrop(targetColumn, event) {
        event.preventDefault();

        if (!this.args.draggedColumn) return;

        const sourceColumn = this.args.draggedColumn;
        const targetIndex = targetColumn.index;
        const adjustment = this.dragOverPosition === 'after' ? 1 : 0;
        const newPosition = targetIndex + adjustment;

        // Don't drop on same position
        if (sourceColumn.index === newPosition) {
            this.dragOverColumn = null;
            this.dragOverPosition = null;
            return;
        }

        if (this.args.onColumnDrop) {
            this.args.onColumnDrop(newPosition, event);
        }

        this.dragOverColumn = null;
        this.dragOverPosition = null;
    }

    /**
     * Handle card drag over column
     */
    @action
    onCardDragOverColumn(column, event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        // Check WIP limit
        if (column.wipLimit && column.cardCount >= column.wipLimit) {
            event.dataTransfer.dropEffect = 'none';
            return;
        }

        this.dragOverColumn = column;
    }

    /**
     * Handle card drop on column
     */
    @action
    onCardDropOnColumn(column, event) {
        event.preventDefault();

        if (!this.args.draggedCard) return;

        // Check WIP limit
        if (column.wipLimit && column.cardCount >= column.wipLimit) {
            return;
        }

        const targetPosition = column.cards?.length || 0;

        if (this.args.onCardDrop) {
            this.args.onCardDrop(column, targetPosition, event);
        }

        this.dragOverColumn = null;
    }

    /**
     * Handle horizontal scrolling
     */
    @action
    onScroll(event) {
        const container = event.target;
        this.canScrollLeft = container.scrollLeft > 0;
        this.canScrollRight = container.scrollLeft < container.scrollWidth - container.clientWidth;
    }

    /**
     * Scroll columns left
     */
    @action
    scrollLeft() {
        const container = document.querySelector('.kanban-columns-container');
        if (container) {
            container.scrollBy({ left: -300, behavior: 'smooth' });
        }
    }

    /**
     * Scroll columns right
     */
    @action
    scrollRight() {
        const container = document.querySelector('.kanban-columns-container');
        if (container) {
            container.scrollBy({ left: 300, behavior: 'smooth' });
        }
    }

    /**
     * Handle keyboard navigation between columns
     */
    @action
    onKeyDown(event) {
        const { key, target } = event;

        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            const currentColumn = target.closest('.kanban-column');
            if (!currentColumn) return;

            const columns = Array.from(document.querySelectorAll('.kanban-column'));
            const currentIndex = columns.indexOf(currentColumn);

            let targetIndex;
            if (key === 'ArrowLeft') {
                targetIndex = Math.max(0, currentIndex - 1);
            } else {
                targetIndex = Math.min(columns.length - 1, currentIndex + 1);
            }

            const targetColumn = columns[targetIndex];
            if (targetColumn) {
                const focusableElement = targetColumn.querySelector('[tabindex="0"], button, input, [href]');
                if (focusableElement) {
                    focusableElement.focus();
                    event.preventDefault();
                }
            }
        }
    }

    /**
     * Setup scroll indicators
     */
    @action
    setupScrollIndicators(element) {
        // Initial scroll state check
        this.onScroll({ target: element });

        // Setup resize observer to update scroll indicators
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                this.onScroll({ target: element });
            });
            resizeObserver.observe(element);

            // Cleanup on destroy
            this.resizeObserver = resizeObserver;
        }
    }

    /**
     * Cleanup observers
     */
    willDestroy() {
        super.willDestroy();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}
