import Component from '@glimmer/component';

export default class LayoutResourceCardGridComponent extends Component {
    get data() {
        return this.args.data || [];
    }

    get columns() {
        return this.args.columns || 4;
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
            4: 'grid-cols-1 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4',
            5: 'grid-cols-1 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5',
            6: 'grid-cols-1 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-6',
        };
        return colsMap[parseInt(this.columns)] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }

    get containerClass() {
        const baseClasses = `grid ${this.gridCols} ${this.gap}`;
        return this.args.containerClass ? `${baseClasses} ${this.args.containerClass}` : baseClasses;
    }

    get cardClass() {
        const baseClasses = 'bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200';
        return this.args.cardClass ? `${baseClasses} ${this.args.cardClass}` : baseClasses;
    }

    get showPagination() {
        return this.args.showPagination;
    }

    get hasData() {
        return this.data && this.data.length > 0;
    }
}
