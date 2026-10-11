import Component from '@glimmer/component';

/**
 * A resource card while its model loads: title row, media region, two body lines and a
 * footer with a badge and meta values — the `Layout::Resource::Card` anatomy.
 * `@mediaHeight` (px or CSS length) sizes the media region; `@hideMedia` drops it.
 */
export default class SkeletonCardComponent extends Component {
    get mediaHeight() {
        return this.args.mediaHeight ?? 160;
    }
}
