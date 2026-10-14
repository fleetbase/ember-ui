import SkeletonBaseComponent from '../../utils/skeleton-base-component';

const LINE_WIDTHS = ['70%', '45%', '60%', '35%', '55%'];

/**
 * One resource card while it loads, in the card anatomy: header, media, body lines and a
 * footer. It follows the card it stands in for: `@mediaFirst` when the image leads the card,
 * `@hideMedia` without one, `@avatar` for a header that is an identity (avatar, name and a
 * subtitle), `@subtitle` for a title with a muted line under it, `@hideHeader` when the title
 * sits in the body, `@status` as "badge", a dot (the default) or false, `@lines` body lines
 * (2 by default), `@footerActions` icon buttons in the footer, led by a badge when
 * `@footerBadge` is set, and `@footerLines` meta lines under that row.
 */
export default class SkeletonCardComponent extends SkeletonBaseComponent {
    get mediaHeight() {
        return this.args.mediaHeight ?? 160;
    }

    get showMediaFirst() {
        return !this.args.hideMedia && Boolean(this.args.mediaFirst);
    }

    get showMediaAfterHeader() {
        return !this.args.hideMedia && !this.args.mediaFirst;
    }

    get lines() {
        return this.range(this.args.lines, 2).map((index) => ({ index, width: LINE_WIDTHS[index % LINE_WIDTHS.length] }));
    }

    get footerActions() {
        return this.range(this.args.footerActions, 0);
    }

    get footerLines() {
        return this.range(this.args.footerLines, 0).map((index) => ({ index, width: LINE_WIDTHS[(index + 2) % LINE_WIDTHS.length] }));
    }
}
