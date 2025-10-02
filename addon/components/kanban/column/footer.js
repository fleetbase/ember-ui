import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class KanbanColumnFooterComponent extends Component {
    @service intl;

    /**
     * Quick add state
     */
    @tracked isQuickAdding = false;
    @tracked quickAddTitle = '';

    /**
     * Check if column is at WIP limit
     */
    get isAtWipLimit() {
        const { column } = this.args;
        return column.wipLimit && column.cardCount >= column.wipLimit;
    }

    /**
     * Get add card button text
     */
    get addCardButtonText() {
        if (this.isAtWipLimit) {
            return 'WIP Limit Reached';
        }
        return this.args.column.cardCount === 0 ? 'Add first card' : 'Add card';
    }

    /**
     * Get add card button help text
     */
    get addCardButtonHelpText() {
        if (this.isAtWipLimit) {
            return `Cannot add card. Column has reached WIP limit of ${this.args.column.wipLimit}.`;
        }
        return 'Add a new card to this column';
    }

    /**
     * Start quick add mode
     */
    @action
    startQuickAdd() {
        if (this.args.readonly || this.isAtWipLimit) return;

        this.isQuickAdding = true;
        this.quickAddTitle = '';

        // Focus input after render
        setTimeout(() => {
            const input = document.querySelector(`#${this.args.columnId}-quick-add-input`);
            if (input) {
                input.focus();
            }
        }, 10);
    }

    /**
     * Cancel quick add
     */
    @action
    cancelQuickAdd() {
        this.isQuickAdding = false;
        this.quickAddTitle = '';
    }

    /**
     * Save quick add card
     */
    @action
    saveQuickAdd() {
        const title = this.quickAddTitle.trim();

        if (!title) {
            this.cancelQuickAdd();
            return;
        }

        const cardData = {
            title,
            description: '',
            position: this.args.column.cardCount,
        };

        if (this.args.onCreateCard) {
            this.args.onCreateCard(cardData);
        }

        // Reset for next card
        this.quickAddTitle = '';

        // Keep quick add open for rapid card creation
        setTimeout(() => {
            const input = document.querySelector(`#${this.args.columnId}-quick-add-input`);
            if (input) {
                input.focus();
            }
        }, 10);
    }

    /**
     * Handle quick add input keydown
     */
    @action
    onQuickAddKeyDown(event) {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                this.saveQuickAdd();
                break;
            case 'Escape':
                event.preventDefault();
                this.cancelQuickAdd();
                break;
        }
    }

    /**
     * Handle quick add input blur
     */
    @action
    onQuickAddBlur() {
        // Small delay to allow for button clicks
        setTimeout(() => {
            if (this.isQuickAdding && this.quickAddTitle.trim()) {
                this.saveQuickAdd();
            } else {
                this.cancelQuickAdd();
            }
        }, 150);
    }

    /**
     * Handle create card with template
     */
    @action
    onCreateCardWithTemplate(template) {
        if (this.args.readonly || this.isAtWipLimit) return;

        const cardData = {
            title: template.title || 'New Card',
            description: template.description || '',
            priority: template.priority || null,
            tags: template.tags || [],
            position: this.args.column.cardCount,
        };

        if (this.args.onCreateCard) {
            this.args.onCreateCard(cardData);
        }
    }

    /**
     * Handle advanced card creation
     */
    @action
    onCreateAdvancedCard() {
        if (this.args.readonly || this.isAtWipLimit) return;

        // This would typically open a modal or detailed form
        // For now, create a basic card
        const cardData = {
            title: 'New Card',
            description: '',
            priority: null,
            assignee: null,
            tags: [],
            dueDate: null,
            position: this.args.column.cardCount,
        };

        if (this.args.onCreateCard) {
            this.args.onCreateCard(cardData);
        }
    }

    /**
     * Get card templates (if provided)
     */
    get cardTemplates() {
        return this.args.cardTemplates || [];
    }

    /**
     * Check if templates are available
     */
    get hasTemplates() {
        return this.cardTemplates.length > 0;
    }
}
