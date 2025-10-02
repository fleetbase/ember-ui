import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class KanbanColumnBodyComponent extends Component {
    @service intl;

    /**
     * Virtual scrolling state
     */
    @tracked visibleStartIndex = 0;
    @tracked visibleEndIndex = 20;
    @tracked itemHeight = 120;
    @tracked containerHeight = 0;

    /**
     * Selection state
     */
    @tracked selectedCards = new Set();

    /**
     * Get visible cards for virtual scrolling
     */
    get visibleCards() {
        const cards = this.args.cards || [];

        // For small lists, show all cards
        if (cards.length <= 50) {
            return cards;
        }

        // Virtual scrolling for large lists
        return cards.slice(this.visibleStartIndex, this.visibleEndIndex);
    }

    /**
     * Get total height for virtual scrolling
     */
    get totalHeight() {
        const cardCount = (this.args.cards || []).length;
        return cardCount * this.itemHeight;
    }

    /**
     * Get offset for virtual scrolling
     */
    get offsetY() {
        return this.visibleStartIndex * this.itemHeight;
    }

    /**
     * Check if virtual scrolling is enabled
     */
    get isVirtualScrolling() {
        return (this.args.cards || []).length > 50;
    }

    /**
     * Handle scroll for virtual scrolling
     */
    @action
    onScroll(event) {
        if (!this.isVirtualScrolling) return;

        const scrollTop = event.target.scrollTop;
        const containerHeight = event.target.clientHeight;

        // Calculate visible range
        const startIndex = Math.floor(scrollTop / this.itemHeight);
        const endIndex = Math.min(
            this.args.cards.length,
            startIndex + Math.ceil(containerHeight / this.itemHeight) + 5 // Buffer
        );

        this.visibleStartIndex = Math.max(0, startIndex - 5); // Buffer
        this.visibleEndIndex = endIndex;
        this.containerHeight = containerHeight;
    }

    /**
     * Handle card selection
     */
    @action
    onCardSelect(card, event) {
        if (event.ctrlKey || event.metaKey) {
            // Multi-select
            const newSelection = new Set(this.selectedCards);
            if (newSelection.has(card.id)) {
                newSelection.delete(card.id);
            } else {
                newSelection.add(card.id);
            }
            this.selectedCards = newSelection;
        } else if (event.shiftKey && this.selectedCards.size > 0) {
            // Range select
            const cards = this.args.cards || [];
            const lastSelected = Array.from(this.selectedCards)[this.selectedCards.size - 1];
            const lastIndex = cards.findIndex((c) => c.id === lastSelected);
            const currentIndex = cards.findIndex((c) => c.id === card.id);

            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                const rangeCards = cards.slice(start, end + 1);

                const newSelection = new Set(this.selectedCards);
                rangeCards.forEach((c) => newSelection.add(c.id));
                this.selectedCards = newSelection;
            }
        } else {
            // Single select
            this.selectedCards = new Set([card.id]);
        }
    }

    /**
     * Clear selection
     */
    @action
    clearSelection() {
        this.selectedCards = new Set();
    }

    /**
     * Handle card drag start
     */
    @action
    onCardDragStart(card, event) {
        // Clear selection if dragging non-selected card
        if (!this.selectedCards.has(card.id)) {
            this.selectedCards = new Set([card.id]);
        }

        if (this.args.onCardDragStart) {
            this.args.onCardDragStart(card, event);
        }
    }

    /**
     * Handle card drag end
     */
    @action
    onCardDragEnd(card, event) {
        if (this.args.onCardDragEnd) {
            this.args.onCardDragEnd(card, event);
        }
    }

    /**
     * Handle card update
     */
    @action
    onCardUpdate(card, updates) {
        if (this.args.onUpdateCard) {
            this.args.onUpdateCard(card, updates);
        }
    }

    /**
     * Handle card deletion
     */
    @action
    onCardDelete(card) {
        // Remove from selection
        const newSelection = new Set(this.selectedCards);
        newSelection.delete(card.id);
        this.selectedCards = newSelection;

        if (this.args.onDeleteCard) {
            this.args.onDeleteCard(card);
        }
    }

    /**
     * Handle bulk card operations
     */
    @action
    onBulkOperation(operation) {
        const selectedCardIds = Array.from(this.selectedCards);
        const selectedCards = (this.args.cards || []).filter((card) => selectedCardIds.includes(card.id));

        switch (operation) {
            case 'delete':
                if (confirm(`Delete ${selectedCards.length} selected cards?`)) {
                    selectedCards.forEach((card) => this.onCardDelete(card));
                }
                break;
            case 'archive':
                selectedCards.forEach((card) => {
                    this.onCardUpdate(card, { archived: true });
                });
                this.clearSelection();
                break;
            case 'duplicate':
                selectedCards.forEach((card) => {
                    const duplicatedCard = {
                        ...card,
                        id: undefined, // Will be generated
                        title: `${card.title} (Copy)`,
                        position: card.position + 1,
                    };
                    if (this.args.onCreateCard) {
                        this.args.onCreateCard(this.args.column.id, duplicatedCard);
                    }
                });
                this.clearSelection();
                break;
        }
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
                case 'a':
                    event.preventDefault();
                    this.selectAllCards();
                    break;
                case 'd':
                    event.preventDefault();
                    this.onBulkOperation('duplicate');
                    break;
            }
        }

        // Handle Delete key
        if (key === 'Delete' && this.selectedCards.size > 0) {
            event.preventDefault();
            this.onBulkOperation('delete');
        }

        // Handle Escape key
        if (key === 'Escape') {
            this.clearSelection();
        }

        // Handle arrow key navigation
        if (['ArrowUp', 'ArrowDown'].includes(key)) {
            this.handleArrowNavigation(event);
        }
    }

    /**
     * Select all cards
     */
    selectAllCards() {
        const allCardIds = (this.args.cards || []).map((card) => card.id);
        this.selectedCards = new Set(allCardIds);
    }

    /**
     * Handle arrow key navigation between cards
     */
    handleArrowNavigation(event) {
        const { key } = event;
        const cards = this.args.cards || [];
        const focusedElement = document.activeElement;
        const currentCard = focusedElement.closest('.kanban-card');

        if (!currentCard) return;

        const currentCardId = currentCard.dataset.cardId;
        const currentIndex = cards.findIndex((card) => card.id === currentCardId);

        if (currentIndex === -1) return;

        let targetIndex;
        if (key === 'ArrowUp') {
            targetIndex = Math.max(0, currentIndex - 1);
        } else {
            targetIndex = Math.min(cards.length - 1, currentIndex + 1);
        }

        const targetCard = cards[targetIndex];
        if (targetCard) {
            const targetElement = document.querySelector(`[data-card-id="${targetCard.id}"]`);
            if (targetElement) {
                const focusableElement = targetElement.querySelector('[tabindex="0"], button, input, [href]');
                if (focusableElement) {
                    focusableElement.focus();
                    event.preventDefault();

                    // Update selection if shift is held
                    if (event.shiftKey) {
                        this.onCardSelect(targetCard, event);
                    }
                }
            }
        }
    }

    /**
     * Setup intersection observer for virtual scrolling
     */
    @action
    setupVirtualScrolling(element) {
        if (!this.isVirtualScrolling) return;

        // Setup intersection observer for better performance
        if (window.IntersectionObserver) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            // Card is visible, ensure it's rendered
                            const cardId = entry.target.dataset.cardId;
                            // Additional logic for dynamic loading if needed
                        }
                    });
                },
                {
                    root: element,
                    rootMargin: '50px',
                }
            );

            // Observe all card elements
            element.querySelectorAll('.kanban-card').forEach((card) => {
                observer.observe(card);
            });

            this.intersectionObserver = observer;
        }
    }

    /**
     * Cleanup observers
     */
    willDestroy() {
        super.willDestroy();
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
    }
}
