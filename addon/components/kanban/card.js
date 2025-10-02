import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { guidFor } from '@ember/object/internals';

export default class KanbanCardComponent extends Component {
    @service intl;

    /**
     * Unique identifier for this card
     */
    cardId = guidFor(this);

    /**
     * Card state
     */
    @tracked isEditing = false;
    @tracked editingField = null;
    @tracked editingValue = '';
    @tracked showActions = false;
    @tracked isExpanded = false;

    /**
     * Get card with computed properties
     */
    get card() {
        const card = this.args.card || {};
        const now = new Date();

        return {
            ...card,
            isOverdue: card.dueDate && new Date(card.dueDate) < now,
            isDueSoon: card.dueDate && this.isDueSoon(new Date(card.dueDate), now),
            hasAssignee: !!card.assignee,
            hasTags: !!(card.tags && card.tags.length > 0),
            hasDescription: !!(card.description && card.description.trim()),
            priorityColor: this.getPriorityColor(card.priority),
            formattedDueDate: card.dueDate ? this.formatDueDate(new Date(card.dueDate)) : null,
        };
    }

    /**
     * Check if card is due soon (within 24 hours)
     */
    isDueSoon(dueDate, now) {
        const timeDiff = dueDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);
        return hoursDiff > 0 && hoursDiff <= 24;
    }

    /**
     * Get priority color class
     */
    getPriorityColor(priority) {
        switch (priority) {
            case 'high':
                return 'text-red-600 dark:text-red-400';
            case 'medium':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'low':
                return 'text-green-600 dark:text-green-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    }

    /**
     * Format due date for display
     */
    formatDueDate(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const cardDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        const diffTime = cardDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Tomorrow';
        } else if (diffDays === -1) {
            return 'Yesterday';
        } else if (diffDays > 1 && diffDays <= 7) {
            return `In ${diffDays} days`;
        } else if (diffDays < -1 && diffDays >= -7) {
            return `${Math.abs(diffDays)} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * Get card accessibility label
     */
    get cardAriaLabel() {
        const { card } = this;
        let label = `Card: ${card.title}`;

        if (card.hasAssignee) {
            label += `, assigned to ${card.assignee.name}`;
        }

        if (card.priority) {
            label += `, ${card.priority} priority`;
        }

        if (card.dueDate) {
            label += `, due ${card.formattedDueDate}`;
            if (card.isOverdue) {
                label += ', overdue';
            }
        }

        if (card.hasTags) {
            label += `, tags: ${card.tags.map((tag) => tag.name).join(', ')}`;
        }

        return label;
    }

    /**
     * Handle card drag start
     */
    @action
    onDragStart(event) {
        if (this.args.readonly) return;

        event.dataTransfer.setData('text/plain', this.card.id);
        event.dataTransfer.effectAllowed = 'move';

        // Add visual feedback
        event.target.classList.add('dragging');

        if (this.args.onDragStart) {
            this.args.onDragStart(this.card, event);
        }
    }

    /**
     * Handle card drag end
     */
    @action
    onDragEnd(event) {
        event.target.classList.remove('dragging');

        if (this.args.onDragEnd) {
            this.args.onDragEnd(this.card, event);
        }
    }

    /**
     * Handle card click/selection
     */
    @action
    onCardClick(event) {
        // Don't select if clicking on interactive elements
        if (event.target.matches('button, input, select, textarea, a, [contenteditable]')) {
            return;
        }

        if (this.args.onSelect) {
            this.args.onSelect(this.card, event);
        }
    }

    /**
     * Handle card double click for editing
     */
    @action
    onCardDoubleClick(event) {
        if (this.args.readonly) return;

        event.preventDefault();
        this.startEditing('title');
    }

    /**
     * Start editing a field
     */
    @action
    startEditing(field) {
        if (this.args.readonly) return;

        this.isEditing = true;
        this.editingField = field;
        this.editingValue = this.card[field] || '';

        // Focus input after render
        setTimeout(() => {
            const input = document.querySelector(`#${this.cardId}-${field}-input`);
            if (input) {
                input.focus();
                if (input.select) {
                    input.select();
                }
            }
        }, 10);
    }

    /**
     * Save edited field
     */
    @action
    saveEdit() {
        const value = this.editingValue.trim();
        const field = this.editingField;

        if (value !== this.card[field]) {
            if (this.args.onUpdate) {
                this.args.onUpdate({ [field]: value });
            }
        }

        this.cancelEdit();
    }

    /**
     * Cancel editing
     */
    @action
    cancelEdit() {
        this.isEditing = false;
        this.editingField = null;
        this.editingValue = '';
    }

    /**
     * Handle edit input keydown
     */
    @action
    onEditKeyDown(event) {
        switch (event.key) {
            case 'Enter':
                if (!event.shiftKey) {
                    event.preventDefault();
                    this.saveEdit();
                }
                break;
            case 'Escape':
                event.preventDefault();
                this.cancelEdit();
                break;
        }
    }

    /**
     * Toggle card actions menu
     */
    @action
    toggleActions() {
        this.showActions = !this.showActions;
    }

    /**
     * Toggle card expansion
     */
    @action
    toggleExpansion() {
        this.isExpanded = !this.isExpanded;
    }

    /**
     * Handle card deletion
     */
    @action
    onDelete() {
        if (this.args.readonly) return;

        if (confirm(`Delete card "${this.card.title}"?`)) {
            if (this.args.onDelete) {
                this.args.onDelete(this.card);
            }
        }
    }

    /**
     * Handle card duplication
     */
    @action
    onDuplicate() {
        if (this.args.readonly) return;

        const duplicatedCard = {
            ...this.card,
            id: undefined, // Will be generated
            title: `${this.card.title} (Copy)`,
            position: this.card.position + 1,
        };

        if (this.args.onDuplicate) {
            this.args.onDuplicate(duplicatedCard);
        }
    }

    /**
     * Handle priority change
     */
    @action
    onPriorityChange(priority) {
        if (this.args.readonly) return;

        if (this.args.onUpdate) {
            this.args.onUpdate({ priority });
        }
    }

    /**
     * Handle assignee change
     */
    @action
    onAssigneeChange(assignee) {
        if (this.args.readonly) return;

        if (this.args.onUpdate) {
            this.args.onUpdate({ assignee });
        }
    }

    /**
     * Handle due date change
     */
    @action
    onDueDateChange(dueDate) {
        if (this.args.readonly) return;

        if (this.args.onUpdate) {
            this.args.onUpdate({ dueDate });
        }
    }

    /**
     * Handle tags change
     */
    @action
    onTagsChange(tags) {
        if (this.args.readonly) return;

        if (this.args.onUpdate) {
            this.args.onUpdate({ tags });
        }
    }

    /**
     * Handle keyboard navigation
     */
    @action
    onKeyDown(event) {
        const { key } = event;

        switch (key) {
            case 'Enter':
            case ' ':
                if (!this.isEditing && event.target === event.currentTarget) {
                    event.preventDefault();
                    this.onCardClick(event);
                }
                break;
            case 'Delete':
                if (!this.isEditing) {
                    event.preventDefault();
                    this.onDelete();
                }
                break;
            case 'F2':
                if (!this.isEditing) {
                    event.preventDefault();
                    this.startEditing('title');
                }
                break;
            case 'Escape':
                if (this.showActions) {
                    this.showActions = false;
                }
                break;
        }
    }

    /**
     * Handle click outside to close menus
     */
    @action
    onClickOutside(event) {
        const card = event.target.closest('.kanban-card');
        if (!card || card.dataset.cardId !== this.card.id) {
            this.showActions = false;
        }
    }

    /**
     * Get truncated description
     */
    get truncatedDescription() {
        const description = this.card.description || '';
        const maxLength = this.isExpanded ? Infinity : 100;

        if (description.length <= maxLength) {
            return description;
        }

        return description.substring(0, maxLength) + '...';
    }

    /**
     * Check if description is truncated
     */
    get isDescriptionTruncated() {
        const description = this.card.description || '';
        return !this.isExpanded && description.length > 100;
    }
}
