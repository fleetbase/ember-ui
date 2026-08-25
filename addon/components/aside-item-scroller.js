import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed, get } from '@ember/object';

export default class AsideItemScrollerComponent extends Component {
    /* istanbul ignore next -- nothing reads this before it is assigned */
    @tracked items = [];
    @tracked selected;

    constructor() {
        super(...arguments);

        if (typeof this.args.onInit === 'function') {
            this.args.onInit(this);
        }
    }

    @action onCreate() {
        const { onCreate } = this.args;

        /* istanbul ignore else -- aside-item-scroller.hbs renders the create button only when
           @onCreate was supplied */
        if (typeof onCreate === 'function') {
            onCreate(this);
        }
    }

    @computed('args.{titleKey,items,items.[]}') get itemsGroupByTitleLetter() {
        const { titleKey, items } = this.args;
        const grouped = {};

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const title = get(item, titleKey);

            // The guard used to sit below `title[0]`, which threw on an item with no title
            // before it could run. See DEFECTS #29.
            if (!title) {
                continue;
            }

            const firstLetter = title[0];

            if (!grouped[firstLetter]) {
                grouped[firstLetter] = [];
            }

            grouped[firstLetter].push(item);
        }

        return grouped;
    }

    @computed('itemsGroupByTitleLetter') get powerSelectGrouped() {
        const grouped = [];

        for (let groupName in this.itemsGroupByTitleLetter) {
            grouped.push({
                groupName,
                options: this.itemsGroupByTitleLetter[groupName],
            });
        }

        return grouped;
    }

    @computed('args.resource') get resource() {
        return this.args.resource ?? 'item';
    }

    @computed('args.title') get title() {
        return this.args.title ?? 'Directory';
    }
}
