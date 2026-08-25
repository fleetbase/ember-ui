import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed, defineProperty } from '@ember/object';
import { alias, gt, not } from '@ember/object/computed';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';
import PaginationItems from '../utils/pagination/items';

export default class PaginationComponent extends Component {
    /**
     * Whether to truncate pages items
     *
     * @var {Boolean}
     */
    @tracked truncatePages = true;

    /**
     * Whether to show first and last buttons on pagination
     *
     * @var {Boolean}
     */
    @tracked showFL = false;

    /**
     * The maximum number of pages to show in the pagination
     *
     * @var {Integer}
     */
    @tracked numPagesToShow = 10;

    /**
     * The current page of the pagination.
     *
     * @var {Integer}
     */
    @tracked currentPage = 1;

    /**
     * Get the page from, if none use a default of 1
     *
     * @var {Integer}
     */
    get from() {
        return this.args.meta?.from || 1;
    }

    /**
     * Get the page from, if none use a default of 1
     *
     * @var {Integer}
     */
    get to() {
        return this.args.meta?.to || 1;
    }

    /**
     * The total pages from the pagination meta
     *
     * @var {Integer}
     */
    @alias('args.meta.last_page') totalPages;

    /**
     * The total number of results
     *
     * @var {Integer}
     */
    @alias('args.meta.total') totalResults;

    /**
     * True if the pagination meta has more than one page
     *
     * @var {Integer}
     */
    @gt('args.meta.last_page', 1) hasPages;

    /**
     * Determines if user can step backwards
     *
     * @var {Boolean}
     */
    @gt('args.meta.current_page', 1) canStepBackward;

    /**
     * Determines if user can step forward
     *
     * @var {Boolean}
     */
    @computed('args.meta.current_page', 'totalPages') get canStepForward() {
        return this.args.meta?.current_page < this.totalPages;
    }

    /**
     * Alias of canStepBackward inverse
     *
     * @var {Boolean}
     */
    @not('canStepBackward') cannotStepBackward;

    /**
     * Alias of canStepForward inverse
     *
     * @var {Boolean}
     */
    @not('canStepForward') cannotStepForward;

    /**
     * The pagination page items object
     *
     * @var {Object}
     */
    @computed('currentPage', 'totalPages', 'truncatePages', 'numPagesToShow', 'showFL')
    get pageItemsObj() {
        const result = PaginationItems.create({
            parent: this,
        });

        // Alias the component's OWN tracked `currentPage`, not `args.currentPage`. The
        // constructor defaults it to 1 and `incrementPage`/`goToPage` move it, so aliasing the
        // raw argument meant the page list collapsed to a single ellipsis when the caller
        // passed no `@currentPage`, and the highlight never moved unless the parent fed the
        // new value back down.
        defineProperty(result, 'currentPage', alias('parent.currentPage'));
        defineProperty(result, 'totalPages', alias('parent.totalPages'));
        defineProperty(result, 'truncatePages', alias('parent.truncatePages'));
        defineProperty(result, 'numPagesToShow', alias('parent.numPagesToShow'));
        defineProperty(result, 'showFL', alias('parent.showFL'));

        return result;
    }

    /**
     * The pageItems computed property
     *
     * @var {Object}
     */
    @computed('pageItemsObj.pageItems', 'pageItemsObj') get pageItems() {
        return this.pageItemsObj.pageItems;
    }

    /**
     * Generate page numbers from range
     *
     * @var {Array}
     */
    /**
     * Create instance of PaginationComponent
     */
    constructor() {
        super(...arguments);

        this.numPagesToShow = getWithDefault(this.args, 'numPagesToShow', 10);
        this.currentPage = getWithDefault(this.args, 'currentPage', 1);
        this.showFL = getWithDefault(this.args, 'showFL', false);
        this.truncatePages = getWithDefault(this.args, 'truncatePages', true);
    }

    /**
     * Increments the page
     *
     * @void
     */
    /* istanbul ignore next -- every call site in pagination.hbs passes an explicit step
       (`(fn this.incrementPage 1)` or `-1`), so the default never applies. */
    @action incrementPage(step = 1) {
        const currentPage = Number(this.currentPage);
        const totalPages = Number(this.totalPages);

        if (currentPage === totalPages && step === 1) {
            return false;
        }

        if (currentPage <= 1 && step === -1) {
            return false;
        }

        this.currentPage = this.currentPage + step;

        if (typeof this.args.onPageChange === 'function') {
            this.args.onPageChange(this.currentPage);
        }
    }

    /**
     * Increments the page
     *
     * @void
     */
    @action goToPage(page) {
        if (page === this.currentPage) {
            return;
        }
        this.currentPage = page;
        if (typeof this.args.onPageChange === 'function') {
            this.args.onPageChange(this.currentPage);
        }
    }
}
