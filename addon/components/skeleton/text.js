import SkeletonBaseComponent from '../../utils/skeleton-base-component';

/** A paragraph: `@lines` lines of text, the last one short. */
export default class SkeletonTextComponent extends SkeletonBaseComponent {
    get lines() {
        const lines = this.range(this.args.lines, 3);
        return lines.map((index) => ({ index, isLast: lines.length > 1 && index === lines.length - 1 }));
    }
}
