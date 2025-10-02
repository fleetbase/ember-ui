import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class KanbanBoardToolbarComponent extends Component {
    @service intl;

    /**
     * Toolbar visibility state
     */
    @tracked isExpanded = false;
    @tracked showFilters = false;
    @tracked showSortOptions = false;

    /**
     * Available sort options
     */
    get sortOptions() {
        return [
            { value: 'position', label: 'Position' },
            { value: 'title', label: 'Title' },
            { value: 'priority', label: 'Priority' },
            { value: 'dueDate', label: 'Due Date' },
            { value: 'assignee', label: 'Assignee' },
        ];
    }

    /**
     * Available priority options
     */
    get priorityOptions() {
        return [
            { value: null, label: 'All Priorities' },
            { value: 'high', label: 'High Priority' },
            { value: 'medium', label: 'Medium Priority' },
            { value: 'low', label: 'Low Priority' },
        ];
    }

    /**
     * Check if any filters are active
     */
    get hasActiveFilters() {
        const { filters } = this.args;
        return !!(filters?.assignee || filters?.priority || filters?.tags?.length > 0 || filters?.dueDate);
    }

    /**
     * Get active filter count
     */
    get activeFilterCount() {
        const { filters } = this.args;
        let count = 0;

        if (filters?.assignee) count++;
        if (filters?.priority) count++;
        if (filters?.tags?.length > 0) count++;
        if (filters?.dueDate) count++;

        return count;
    }

    /**
     * Handle search input
     */
    @action
    onSearchInput(event) {
        if (this.args.onSearchInput) {
            this.args.onSearchInput(event);
        }
    }

    /**
     * Handle search clear
     */
    @action
    clearSearch() {
        const searchInput = document.querySelector(`#${this.args.boardId}-search`);
        if (searchInput) {
            searchInput.value = '';
            const event = new Event('input', { bubbles: true });
            searchInput.dispatchEvent(event);
        }
    }

    /**
     * Toggle filter panel visibility
     */
    @action
    toggleFilters() {
        this.showFilters = !this.showFilters;
        this.showSortOptions = false;
    }

    /**
     * Toggle sort options visibility
     */
    @action
    toggleSortOptions() {
        this.showSortOptions = !this.showSortOptions;
        this.showFilters = false;
    }

    /**
     * Handle filter changes
     */
    @action
    onFilterChange(filterType, value) {
        if (this.args.onFilterChange) {
            this.args.onFilterChange(filterType, value);
        }
    }

    /**
     * Handle sort changes
     */
    @action
    onSortChange(sortBy) {
        const currentDirection = this.args.sortDirection || 'asc';
        const newDirection = this.args.sortBy === sortBy && currentDirection === 'asc' ? 'desc' : 'asc';

        if (this.args.onSortChange) {
            this.args.onSortChange(sortBy, newDirection);
        }

        this.showSortOptions = false;
    }

    /**
     * Clear all filters
     */
    @action
    clearAllFilters() {
        if (this.args.onClearFilters) {
            this.args.onClearFilters();
        }
        this.showFilters = false;
    }

    /**
     * Handle create column action
     */
    @action
    onCreateColumn() {
        if (this.args.onCreateColumn) {
            this.args.onCreateColumn({
                title: 'New Column',
                position: 999, // Will be adjusted by parent
            });
        }
    }

    /**
     * Handle assignee filter change
     */
    @action
    onAssigneeFilterChange(assigneeId) {
        this.onFilterChange('assignee', assigneeId);
    }

    /**
     * Handle priority filter change
     */
    @action
    onPriorityFilterChange(priority) {
        this.onFilterChange('priority', priority);
    }

    /**
     * Handle tags filter change
     */
    @action
    onTagsFilterChange(tags) {
        this.onFilterChange('tags', tags);
    }

    /**
     * Handle due date filter change
     */
    @action
    onDueDateFilterChange(date) {
        this.onFilterChange('dueDate', date);
    }

    /**
     * Handle keyboard shortcuts in toolbar
     */
    @action
    onKeyDown(event) {
        const { key } = event;

        switch (key) {
            case 'Escape':
                this.showFilters = false;
                this.showSortOptions = false;
                break;
            case 'Enter':
                if (event.target.matches('.toolbar-action-button')) {
                    event.target.click();
                }
                break;
        }
    }

    /**
     * Close dropdowns when clicking outside
     */
    @action
    onClickOutside(event) {
        const toolbar = event.target.closest('.kanban-toolbar');
        if (!toolbar) {
            this.showFilters = false;
            this.showSortOptions = false;
        }
    }
}
