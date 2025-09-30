import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';

export default class LayoutResourceCardGridComponent extends Component {
    @tracked currentPage = this.args.currentPage || 1;
    @tracked totalPages = this.args.totalPages || 1;

    get models() {
        return this.args.models || [];
    }

    get columns() {
        return this.args.columns || 3;
    }

    get gap() {
        const gapMap = {
            xs: 'gap-1',
            sm: 'gap-2',
            md: 'gap-4',
            lg: 'gap-6',
            xl: 'gap-8',
        };
        return gapMap[this.args.gap] || 'gap-4';
    }

    get gridCols() {
        const colsMap = {
            1: 'grid-cols-1',
            2: 'grid-cols-1 md:grid-cols-2',
            3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
            4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
            5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
            6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
        };
        return colsMap[this.columns] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }

    get containerClass() {
        const baseClasses = `grid ${this.gridCols} ${this.gap}`;
        return this.args.containerClass ? `${baseClasses} ${this.args.containerClass}` : baseClasses;
    }

    get cardClass() {
        const baseClasses = 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200';
        return this.args.cardClass ? `${baseClasses} ${this.args.cardClass}` : baseClasses;
    }

    get showPagination() {
        return this.args.showPagination && this.totalPages > 1;
    }

    get hasModels() {
        return this.models && this.models.length > 0;
    }

    @action
    handlePageChange(page) {
        this.currentPage = page;

        if (this.args.onPageChange) {
            this.args.onPageChange(page);
        }
    }

    @action
    previousPage() {
        if (this.currentPage > 1) {
            this.handlePageChange(this.currentPage - 1);
        }
    }

    @action
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.handlePageChange(this.currentPage + 1);
        }
    }

    @action
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.handlePageChange(page);
        }
    }

    get paginationInfo() {
        const start = (this.currentPage - 1) * (this.args.perPage || 10) + 1;
        const end = Math.min(this.currentPage * (this.args.perPage || 10), this.args.total || this.models.length);
        const total = this.args.total || this.models.length;

        return { start, end, total };
    }

    get pageNumbers() {
        const pages = [];
        const current = this.currentPage;
        const total = this.totalPages;

        // Always show first page
        if (total > 0) {
            pages.push(1);
        }

        // Add ellipsis if needed
        if (current > 4) {
            pages.push('...');
        }

        // Add pages around current
        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);

        for (let i = start; i <= end; i++) {
            if (!pages.includes(i)) {
                pages.push(i);
            }
        }

        // Add ellipsis if needed
        if (current < total - 3) {
            pages.push('...');
        }

        // Always show last page
        if (total > 1 && !pages.includes(total)) {
            pages.push(total);
        }

        return pages;
    }
}
