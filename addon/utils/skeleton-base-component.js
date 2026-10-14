import Component from '@glimmer/component';

/**
 * Shared by the composite skeletons: turns a count argument into an iterable, with a
 * default and a ceiling so a bad argument never draws thousands of boxes.
 */
export default class SkeletonBaseComponent extends Component {
    static MAX_ITEMS = 100;

    range(value, fallback) {
        const count = parseInt(value, 10);
        const length = Number.isFinite(count) && count >= 0 ? Math.min(count, SkeletonBaseComponent.MAX_ITEMS) : fallback;

        return Array.from({ length }, (_, index) => index);
    }
}
