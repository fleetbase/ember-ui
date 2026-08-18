import Component from '@glimmer/component';
import { action } from '@ember/object';
import { registerDestructor } from '@ember/destroyable';

/** How close to the bottom of the list counts as "scrolled to the end", in pixels. */
const LOAD_MORE_THRESHOLD = 32;

/**
 * The dropdown's option list, with infinite scroll.
 *
 * This used to render ember-infinity's `<InfinityLoader>` against an `@infiniteModel` that was
 * never assigned — and ember-infinity was not even a dependency, so the component would not have
 * resolved had the loader ever been reached. Paging is native now: when the dropdown is scrolled
 * to the bottom and there is another page to fetch, `@onLoadMore` is called.
 */
export default class ModelSelectOptionsComponent extends Component {
    scrollable = null;

    constructor() {
        super(...arguments);
        registerDestructor(this, () => this.#stopWatching());
    }

    /** The spinner shows while a further page is on its way. */
    get showLoader() {
        return Boolean(this.args.infiniteScroll && this.args.isLoadingMore);
    }

    @action watchForScrollEnd(element) {
        // ember-basic-dropdown scrolls its content element, not this list. power-select only ever
        // renders this component inside that element, so in practice the lookup always resolves —
        // the null guards below are defensive and are not reachable from a rendered dropdown.
        this.scrollable = element.closest('.ember-basic-dropdown-content');

        if (this.scrollable) {
            this.scrollable.addEventListener('scroll', this.onScroll, { passive: true });
        }
    }

    @action onScroll() {
        if (!this.args.infiniteScroll || typeof this.args.onLoadMore !== 'function') {
            return;
        }

        const { scrollTop, clientHeight, scrollHeight } = this.scrollable;

        if (scrollHeight - scrollTop - clientHeight <= LOAD_MORE_THRESHOLD) {
            this.args.onLoadMore();
        }
    }

    #stopWatching() {
        if (this.scrollable) {
            this.scrollable.removeEventListener('scroll', this.onScroll);
            this.scrollable = null;
        }
    }
}
