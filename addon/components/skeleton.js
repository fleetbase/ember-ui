import Component from '@glimmer/component';

/**
 * The block every skeleton is drawn with. One grey shimmering box whose shape is the
 * shape of the content it stands in for, so a loading page keeps the layout of the page
 * it becomes. Composites (`Skeleton::Table`, `Skeleton::Card`, `Skeleton::Page`, …)
 * arrange these; this one only draws.
 *
 * Variants: `text` (one line of body copy), `title`, `circle`, `avatar` (rounded square),
 * `rect`, `button`, `badge`, `input`.
 */
export const SKELETON_VARIANTS = ['text', 'title', 'circle', 'avatar', 'rect', 'button', 'badge', 'input'];

export default class SkeletonComponent extends Component {
    get variant() {
        const { variant } = this.args;
        return SKELETON_VARIANTS.includes(variant) ? variant : 'text';
    }
}
