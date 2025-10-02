import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class KanbanColumnHeaderComponent extends Component {
    @service intl;

    /**
     * Header state
     */
    @tracked showActions = false;
    @tracked showWipLimitEditor = false;
    @tracked wipLimitValue = '';

    /**
     * Get WIP limit display color
     */
    get wipLimitColor() {
        switch (this.args.wipLimitStatus) {
            case 'over':
                return 'text-red-600 dark:text-red-400';
            case 'at':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'near':
                return 'text-orange-600 dark:text-orange-400';
            default:
                return 'text-green-600 dark:text-green-400';
        }
    }

    /**
     * Get WIP limit progress percentage
     */
    get wipLimitProgress() {
        const { column } = this.args;
        if (!column.wipLimit) return 0;
        return Math.min(100, (column.cardCount / column.wipLimit) * 100);
    }

    /**
     * Toggle actions menu
     */
    @action
    toggleActions() {
        this.showActions = !this.showActions;
        this.showWipLimitEditor = false;
    }

    /**
     * Toggle WIP limit editor
     */
    @action
    toggleWipLimitEditor() {
        this.showWipLimitEditor = !this.showWipLimitEditor;
        this.showActions = false;

        if (this.showWipLimitEditor) {
            this.wipLimitValue = this.args.column.wipLimit?.toString() || '';

            // Focus input after render
            setTimeout(() => {
                const input = document.querySelector(`#${this.args.columnId}-wip-limit-input`);
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 10);
        }
    }

    /**
     * Save WIP limit
     */
    @action
    saveWipLimit() {
        const value = this.wipLimitValue.trim();
        const wipLimit = value ? parseInt(value, 10) : null;

        if (isNaN(wipLimit) && value) {
            alert('WIP limit must be a number');
            return;
        }

        if (wipLimit !== null && wipLimit < 0) {
            alert('WIP limit must be positive');
            return;
        }

        if (this.args.onWipLimitChange) {
            this.args.onWipLimitChange(wipLimit);
        }

        this.showWipLimitEditor = false;
        this.wipLimitValue = '';
    }

    /**
     * Cancel WIP limit editing
     */
    @action
    cancelWipLimitEdit() {
        this.showWipLimitEditor = false;
        this.wipLimitValue = '';
    }

    /**
     * Handle WIP limit input keydown
     */
    @action
    onWipLimitKeyDown(event) {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                this.saveWipLimit();
                break;
            case 'Escape':
                event.preventDefault();
                this.cancelWipLimitEdit();
                break;
        }
    }

    /**
     * Handle title input change
     */
    @action
    onTitleInput(event) {
        if (this.args.onTitleInput) {
            this.args.onTitleInput(event.target.value);
        }
    }

    /**
     * Handle click outside to close menus
     */
    @action
    onClickOutside(event) {
        const header = event.target.closest('.kanban-column-header');
        if (!header) {
            this.showActions = false;
            this.showWipLimitEditor = false;
        }
    }

    /**
     * Handle keyboard navigation in header
     */
    @action
    onKeyDown(event) {
        const { key } = event;

        switch (key) {
            case 'Escape':
                this.showActions = false;
                this.showWipLimitEditor = false;
                break;
            case 'Enter':
            case ' ':
                if (event.target.matches('.column-title-button')) {
                    event.preventDefault();
                    this.args.onStartEditing();
                }
                break;
        }
    }

    /**
     * Get accessibility label for card count
     */
    get cardCountLabel() {
        const count = this.args.column.cardCount;
        return count === 1 ? '1 card' : `${count} cards`;
    }

    /**
     * Get accessibility label for WIP limit
     */
    get wipLimitLabel() {
        const { column } = this.args;
        if (!column.wipLimit) return '';

        const status = this.args.wipLimitStatus;
        let label = `WIP limit ${column.wipLimit}`;

        switch (status) {
            case 'over':
                label += ', over limit';
                break;
            case 'at':
                label += ', at limit';
                break;
            case 'near':
                label += ', near limit';
                break;
        }

        return label;
    }
}
