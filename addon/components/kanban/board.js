import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { guidFor } from '@ember/object/internals';
import { debounce } from '@ember/runloop';

export default class KanbanBoardComponent extends Component {
    @service intl;

    /**
     * Unique identifier for this board instance
     */
    boardId = guidFor(this);

    /**
     * Current search query for filtering cards
     */
    @tracked searchQuery = '';

    /**
     * Current filter settings
     */
    @tracked filters = {
        assignee: null,
        priority: null,
        tags: [],
        dueDate: null,
    };

    /**
     * Current sort settings
     */
    @tracked sortBy = 'position';
    @tracked sortDirection = 'asc';

    /**
     * Drag and drop state
     */
    @tracked isDragging = false;
    @tracked draggedCard = null;
    @tracked draggedColumn = null;
    @tracked dropTarget = null;

    /**
     * UI state
     */
    @tracked isLoading = false;
    @tracked error = null;
    @tracked selectedCards = new Set();

    /**
     * Accessibility state
     */
    @tracked announceText = '';
    @tracked focusedElement = null;

    /**
     * Get filtered and sorted columns
     */
    get processedColumns() {
        const columns = this.args.columns || [];

        return columns
            .map((column) => ({
                ...column,
                cards: this.getFilteredCards(column.cards || []),
            }))
            .sort((a, b) => {
                return (a.position || 0) - (b.position || 0);
            });
    }

    /**
     * Get total card count across all columns
     */
    get totalCardCount() {
        return this.processedColumns.reduce((total, column) => {
            return total + (column.cards?.length || 0);
        }, 0);
    }

    /**
     * Check if board has any data
     */
    get isEmpty() {
        return this.totalCardCount === 0;
    }

    /**
     * Get accessibility label for the board
     */
    get boardAriaLabel() {
        const title = this.args.title || 'Kanban Board';
        const columnCount = this.processedColumns.length;
        const cardCount = this.totalCardCount;

        return `${title}, ${columnCount} columns, ${cardCount} cards`;
    }

    /**
     * Filter cards based on current search and filter criteria
     */
    getFilteredCards(cards) {
        let filtered = [...cards];

        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter((card) => {
                return (
                    card.title?.toLowerCase().includes(query) ||
                    card.description?.toLowerCase().includes(query) ||
                    card.assignee?.name?.toLowerCase().includes(query) ||
                    card.tags?.some((tag) => tag.name?.toLowerCase().includes(query))
                );
            });
        }

        // Apply assignee filter
        if (this.filters.assignee) {
            filtered = filtered.filter((card) => card.assignee?.id === this.filters.assignee);
        }

        // Apply priority filter
        if (this.filters.priority) {
            filtered = filtered.filter((card) => card.priority === this.filters.priority);
        }

        // Apply tags filter
        if (this.filters.tags.length > 0) {
            filtered = filtered.filter((card) => {
                return this.filters.tags.some((tagId) => card.tags?.some((tag) => tag.id === tagId));
            });
        }

        // Apply due date filter
        if (this.filters.dueDate) {
            const filterDate = new Date(this.filters.dueDate);
            filtered = filtered.filter((card) => {
                if (!card.dueDate) return false;
                const cardDate = new Date(card.dueDate);
                return cardDate <= filterDate;
            });
        }

        // Apply sorting
        return this.sortCards(filtered);
    }

    /**
     * Sort cards based on current sort criteria
     */
    sortCards(cards) {
        return cards.sort((a, b) => {
            let aValue, bValue;

            switch (this.sortBy) {
                case 'title':
                    aValue = a.title || '';
                    bValue = b.title || '';
                    break;
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    aValue = priorityOrder[a.priority] || 0;
                    bValue = priorityOrder[b.priority] || 0;
                    break;
                case 'dueDate':
                    aValue = a.dueDate ? new Date(a.dueDate) : new Date(0);
                    bValue = b.dueDate ? new Date(b.dueDate) : new Date(0);
                    break;
                case 'assignee':
                    aValue = a.assignee?.name || '';
                    bValue = b.assignee?.name || '';
                    break;
                default:
                    aValue = a.position || 0;
                    bValue = b.position || 0;
            }

            if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Handle search input with debouncing
     */
    @action
    onSearchInput(event) {
        const query = event.target.value;
        debounce(this, this.updateSearchQuery, query, 300);
    }

    /**
     * Update search query
     */
    updateSearchQuery(query) {
        this.searchQuery = query;
        this.announceSearchResults();
    }

    /**
     * Handle filter changes
     */
    @action
    onFilterChange(filterType, value) {
        this.filters = {
            ...this.filters,
            [filterType]: value,
        };
        this.announceFilterResults();
    }

    /**
     * Handle sort changes
     */
    @action
    onSortChange(sortBy, direction = 'asc') {
        this.sortBy = sortBy;
        this.sortDirection = direction;
        this.announceSortChange();
    }

    /**
     * Clear all filters and search
     */
    @action
    clearFilters() {
        this.searchQuery = '';
        this.filters = {
            assignee: null,
            priority: null,
            tags: [],
            dueDate: null,
        };
        this.announceText = 'All filters cleared';
    }

    /**
     * Handle card drag start
     */
    @action
    onCardDragStart(card, event) {
        this.isDragging = true;
        this.draggedCard = card;

        // Set drag data for accessibility
        if (event.dataTransfer) {
            event.dataTransfer.setData('text/plain', card.id);
            event.dataTransfer.effectAllowed = 'move';
        }

        // Announce drag start
        this.announceText = `Started dragging card: ${card.title}`;

        // Call parent handler if provided
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
        this.dropTarget = null;

        // Announce drag end
        this.announceText = `Finished dragging card: ${card.title}`;

        // Call parent handler if provided
        if (this.args.onCardDragEnd) {
            this.args.onCardDragEnd(card, event);
        }
    }

    /**
     * Handle card drop
     */
    @action
    onCardDrop(targetColumn, targetPosition, event) {
        if (!this.draggedCard) return;

        const sourceCard = this.draggedCard;
        const targetColumnId = targetColumn.id;

        // Prevent dropping on same position
        if (sourceCard.columnId === targetColumnId && sourceCard.position === targetPosition) {
            return;
        }

        // Announce drop
        this.announceText = `Moved card "${sourceCard.title}" to column "${targetColumn.title}"`;

        // Call parent handler
        if (this.args.onCardMove) {
            this.args.onCardMove(sourceCard, targetColumnId, targetPosition);
        }

        // Reset drag state
        this.isDragging = false;
        this.draggedCard = null;
        this.dropTarget = null;
    }

    /**
     * Handle column drag start
     */
    @action
    onColumnDragStart(column, event) {
        this.isDragging = true;
        this.draggedColumn = column;

        if (event.dataTransfer) {
            event.dataTransfer.setData('text/plain', column.id);
            event.dataTransfer.effectAllowed = 'move';
        }

        this.announceText = `Started dragging column: ${column.title}`;

        if (this.args.onColumnDragStart) {
            this.args.onColumnDragStart(column, event);
        }
    }

    /**
     * Handle column drop
     */
    @action
    onColumnDrop(targetPosition, event) {
        if (!this.draggedColumn) return;

        const sourceColumn = this.draggedColumn;

        if (sourceColumn.position === targetPosition) {
            return;
        }

        this.announceText = `Moved column "${sourceColumn.title}" to position ${targetPosition + 1}`;

        if (this.args.onColumnMove) {
            this.args.onColumnMove(sourceColumn, targetPosition);
        }

        this.isDragging = false;
        this.draggedColumn = null;
    }

    /**
     * Handle keyboard navigation
     */
    @action
    onKeyDown(event) {
        const { key, ctrlKey, metaKey, shiftKey } = event;

        // Handle keyboard shortcuts
        if (ctrlKey || metaKey) {
            switch (key) {
                case 'f':
                    event.preventDefault();
                    this.focusSearchInput();
                    break;
                case 'a':
                    event.preventDefault();
                    this.selectAllCards();
                    break;
            }
        }

        // Handle arrow key navigation
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            this.handleArrowKeyNavigation(event);
        }
    }

    /**
     * Focus the search input
     */
    focusSearchInput() {
        const searchInput = document.querySelector(`#${this.boardId}-search`);
        if (searchInput) {
            searchInput.focus();
        }
    }

    /**
     * Select all visible cards
     */
    selectAllCards() {
        const allCards = this.processedColumns.flatMap((column) => column.cards);
        this.selectedCards = new Set(allCards.map((card) => card.id));
        this.announceText = `Selected ${allCards.length} cards`;
    }

    /**
     * Handle arrow key navigation
     */
    handleArrowKeyNavigation(event) {
        // Implementation for keyboard navigation between cards and columns
        // This would involve managing focus and providing audio feedback
        event.preventDefault();
        // TODO: Implement detailed keyboard navigation logic
    }

    /**
     * Announce search results for screen readers
     */
    announceSearchResults() {
        const resultCount = this.totalCardCount;
        this.announceText = `Search results: ${resultCount} cards found`;
    }

    /**
     * Announce filter results for screen readers
     */
    announceFilterResults() {
        const resultCount = this.totalCardCount;
        this.announceText = `Filter applied: ${resultCount} cards shown`;
    }

    /**
     * Announce sort change for screen readers
     */
    announceSortChange() {
        this.announceText = `Cards sorted by ${this.sortBy} in ${this.sortDirection}ending order`;
    }

    /**
     * Handle card creation
     */
    @action
    onCreateCard(columnId, cardData) {
        if (this.args.onCreateCard) {
            this.args.onCreateCard(columnId, cardData);
        }
    }

    /**
     * Handle card update
     */
    @action
    onUpdateCard(card, updates) {
        if (this.args.onUpdateCard) {
            this.args.onUpdateCard(card, updates);
        }
    }

    /**
     * Handle card deletion
     */
    @action
    onDeleteCard(card) {
        if (this.args.onDeleteCard) {
            this.args.onDeleteCard(card);
        }
    }

    /**
     * Handle column creation
     */
    @action
    onCreateColumn(columnData) {
        if (this.args.onCreateColumn) {
            this.args.onCreateColumn(columnData);
        }
    }

    /**
     * Handle column update
     */
    @action
    onUpdateColumn(column, updates) {
        if (this.args.onUpdateColumn) {
            this.args.onUpdateColumn(column, updates);
        }
    }

    /**
     * Handle column deletion
     */
    @action
    onDeleteColumn(column) {
        if (this.args.onDeleteColumn) {
            this.args.onDeleteColumn(column);
        }
    }

    /**
     * Handle error states
     */
    @action
    onError(error) {
        this.error = error;
        this.announceText = `Error: ${error.message}`;

        if (this.args.onError) {
            this.args.onError(error);
        }
    }

    /**
     * Clear error state
     */
    @action
    clearError() {
        this.error = null;
    }
}
