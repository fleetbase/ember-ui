import Component from '@glimmer/component';
import { action } from '@ember/object';

/**
 * Kanban Card Component
 *
 * Usage:
 * <Kanban::Card @card={{card}} />
 *
 * With custom template:
 * <Kanban::Card @card={{card}} @template={{component "my-custom-card"}} />
 */
export default class KanbanCardComponent extends Component {
    /**
     * Handle card drag start
     */
    @action
    onDragStart(event) {
        if (this.args.onDragStart) {
            this.args.onDragStart(this.card, event);
        }
    }

    /**
     * Handle card drag end
     */
    @action
    onDragEnd(event) {
        if (this.args.onDragEnd) {
            this.args.onDragEnd(event);
        }
    }

    /**
     * Handle card click
     */
    @action
    onClick(event) {
        if (this.args.onClick) {
            this.args.onClick(this.args.card, event);
        }
    }

    /**
     * Handle card update
     */
    @action
    onUpdate(updates) {
        if (this.args.onUpdate) {
            this.args.onUpdate(updates);
        }
    }

    /**
     * Handle card delete
     */
    @action
    onDelete() {
        if (this.args.onDelete) {
            this.args.onDelete();
        }
    }

    /**
     * Get card data
     */
    get card() {
        return this.args.card || {};
    }

    /**
     * Check if card is draggable
     */
    get isDraggable() {
        return !this.args.readonly && !this.args.disabled;
    }

    /**
     * Get card classes
     */
    get cardClasses() {
        let classes = 'kanban-card';

        if (this.args.isDragging) {
            classes += ' dragging';
        }

        if (this.card.priority) {
            classes += ` priority-${this.card.priority}`;
        }

        return classes;
    }
}
