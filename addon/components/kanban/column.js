import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { guidFor } from '@ember/object/internals';

export default class KanbanColumnComponent extends Component {
    @service intl;

    /**
     * Unique identifier for this column
     */
    columnId = guidFor(this);

    /**
     * Column state
     */
    @tracked isEditing = false;
    @tracked isCollapsed = false;
    @tracked editingTitle = '';

    /**
     * Drag and drop state
     */
    @tracked dragOverCard = null;
    @tracked dragOverPosition = null;
    @tracked isDragOver = false;

    /**
     * Get column with computed properties
     */
    get column() {
        const column = this.args.column || {};
        return {
            ...column,
            cardCount: column.cards?.length || 0,
            isOverWipLimit: column.wipLimit && (column.cards?.length || 0) > column.wipLimit,
            wipLimitPercentage: column.wipLimit ? Math.min(100, ((column.cards?.length || 0) / column.wipLimit) * 100) : 0,
        };
    }

    /**
     * Get sorted cards
     */
    get sortedCards() {
        const cards = this.column.cards || [];
        return cards.sort((a, b) => (a.position || 0) - (b.position || 0));
    }

    /**
     * Check if column is empty
     */
    get isEmpty() {
        return this.sortedCards.length === 0;
    }

    /**
     * Get column accessibility label
     */
    get columnAriaLabel() {
        const { title, cardCount, wipLimit } = this.column;
        let label = `${title}, ${cardCount} cards`;

        if (wipLimit) {
            label += `, WIP limit ${wipLimit}`;
            if (this.column.isOverWipLimit) {
                label += ', over limit';
            }
        }

        return label;
    }

    /**
     * Get WIP limit status
     */
    get wipLimitStatus() {
        const { cardCount, wipLimit } = this.column;

        if (!wipLimit) return null;

        if (cardCount > wipLimit) {
            return 'over';
        } else if (cardCount === wipLimit) {
            return 'at';
        } else if (cardCount >= wipLimit * 0.8) {
            return 'near';
        }

        return 'under';
    }

    /**
     * Handle column drag start
     */
    @action
    onDragStart(event) {
        if (this.args.readonly) return;

        event.dataTransfer.setData('text/plain', this.column.id);
        event.dataTransfer.effectAllowed = 'move';

        // Add visual feedback
        event.target.classList.add('dragging');

        if (this.args.onDragStart) {
            this.args.onDragStart(this.column, event);
        }
    }

    /**
     * Handle column drag end
     */
    @action
    onDragEnd(event) {
        event.target.classList.remove('dragging');
        this.isDragOver = false;
    }

    /**
     * Handle card drag over
     */
    @action
    onCardDragOver(event) {
        if (this.args.readonly) return;

        event.preventDefault();
        event.stopPropagation();

        // Check WIP limit
        if (this.column.wipLimit && this.column.cardCount >= this.column.wipLimit) {
            event.dataTransfer.dropEffect = 'none';
            return;
        }

        event.dataTransfer.dropEffect = 'move';
        this.isDragOver = true;

        // Calculate drop position
        const cardElements = Array.from(event.currentTarget.querySelectorAll('.kanban-card'));
        const afterElement = this.getDragAfterElement(event.currentTarget, event.clientY);

        if (afterElement) {
            const afterCard = this.sortedCards.find((card) => card.id === afterElement.dataset.cardId);
            this.dragOverCard = afterCard;
            this.dragOverPosition = 'before';
        } else {
            this.dragOverCard = null;
            this.dragOverPosition = 'after';
        }

        if (this.args.onDragOver) {
            this.args.onDragOver(event);
        }
    }

    /**
     * Handle card drag leave
     */
    @action
    onCardDragLeave(event) {
        // Only clear if leaving the column entirely
        if (!event.currentTarget.contains(event.relatedTarget)) {
            this.isDragOver = false;
            this.dragOverCard = null;
            this.dragOverPosition = null;
        }
    }

    /**
     * Handle card drop
     */
    @action
    onCardDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        if (this.args.readonly) return;

        // Check WIP limit
        if (this.column.wipLimit && this.column.cardCount >= this.column.wipLimit) {
            return;
        }

        let targetPosition;

        if (this.dragOverCard) {
            targetPosition = this.dragOverPosition === 'before' ? this.dragOverCard.position : this.dragOverCard.position + 1;
        } else {
            targetPosition = this.sortedCards.length;
        }

        if (this.args.onDrop) {
            this.args.onDrop(this.column, targetPosition, event);
        }

        this.isDragOver = false;
        this.dragOverCard = null;
        this.dragOverPosition = null;
    }

    /**
     * Get element after drag position
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];

        return draggableElements.reduce(
            (closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;

                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            },
            { offset: Number.NEGATIVE_INFINITY }
        ).element;
    }

    /**
     * Start editing column title
     */
    @action
    startEditing() {
        if (this.args.readonly) return;

        this.editingTitle = this.column.title || '';
        this.isEditing = true;

        // Focus input after render
        setTimeout(() => {
            const input = document.querySelector(`#${this.columnId}-title-input`);
            if (input) {
                input.focus();
                input.select();
            }
        }, 10);
    }

    /**
     * Save column title
     */
    @action
    saveTitle() {
        const newTitle = this.editingTitle.trim();

        if (newTitle && newTitle !== this.column.title) {
            if (this.args.onUpdateColumn) {
                this.args.onUpdateColumn(this.column, { title: newTitle });
            }
        }

        this.isEditing = false;
        this.editingTitle = '';
    }

    /**
     * Cancel editing
     */
    @action
    cancelEditing() {
        this.isEditing = false;
        this.editingTitle = '';
    }

    /**
     * Handle title input keydown
     */
    @action
    onTitleKeyDown(event) {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                this.saveTitle();
                break;
            case 'Escape':
                event.preventDefault();
                this.cancelEditing();
                break;
        }
    }

    /**
     * Toggle column collapse
     */
    @action
    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
    }

    /**
     * Handle column deletion
     */
    @action
    onDeleteColumn() {
        if (this.args.readonly) return;

        if (this.column.cardCount > 0) {
            // Show confirmation for non-empty columns
            if (!confirm(`Delete column "${this.column.title}"? This will also delete ${this.column.cardCount} cards.`)) {
                return;
            }
        }

        if (this.args.onDeleteColumn) {
            this.args.onDeleteColumn(this.column);
        }
    }

    /**
     * Handle card creation
     */
    @action
    onCreateCard(cardData = {}) {
        if (this.args.readonly) return;

        // Check WIP limit
        if (this.column.wipLimit && this.column.cardCount >= this.column.wipLimit) {
            alert(`Cannot add card. Column has reached WIP limit of ${this.column.wipLimit}.`);
            return;
        }

        const newCard = {
            title: 'New Card',
            position: this.sortedCards.length,
            ...cardData,
        };

        if (this.args.onCreateCard) {
            this.args.onCreateCard(this.column.id, newCard);
        }
    }

    /**
     * Handle WIP limit update
     */
    @action
    onWipLimitChange(newLimit) {
        if (this.args.readonly) return;

        const wipLimit = newLimit ? parseInt(newLimit, 10) : null;

        if (this.args.onUpdateColumn) {
            this.args.onUpdateColumn(this.column, { wipLimit });
        }
    }

    /**
     * Handle keyboard navigation
     */
    @action
    onKeyDown(event) {
        const { key, target } = event;

        // Handle Enter/Space on column header for editing
        if ((key === 'Enter' || key === ' ') && target.matches('.column-title-button')) {
            event.preventDefault();
            this.startEditing();
        }

        // Handle arrow key navigation between cards
        if (key === 'ArrowUp' || key === 'ArrowDown') {
            const cards = Array.from(event.currentTarget.querySelectorAll('.kanban-card'));
            const currentIndex = cards.indexOf(target.closest('.kanban-card'));

            if (currentIndex !== -1) {
                let targetIndex;
                if (key === 'ArrowUp') {
                    targetIndex = Math.max(0, currentIndex - 1);
                } else {
                    targetIndex = Math.min(cards.length - 1, currentIndex + 1);
                }

                const targetCard = cards[targetIndex];
                if (targetCard) {
                    const focusableElement = targetCard.querySelector('[tabindex="0"], button, input, [href]');
                    if (focusableElement) {
                        focusableElement.focus();
                        event.preventDefault();
                    }
                }
            }
        }
    }
}
