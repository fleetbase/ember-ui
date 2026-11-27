import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import { activateItem, normalizeTone, optionalService } from '../../utils/shell';

/**
 * `Layout::ContextBar` — the canvas shell's top-left bar: logo, breadcrumbs and
 * context chips.
 *
 * Crumbs and chips come from ember-core's `context-bar` service (`crumbs`,
 * `chips`), which routes fill with `setCrumbs()` / `setChips()`. `@crumbs` and
 * `@chips` override the service, and the bar renders the logo alone when
 * neither is available.
 *
 * A crumb is `{ label, route?, models?, query?, menu?, split?, color? }`:
 * - a `menu` array renders the crumb as a menu button listing those items;
 * - `split` marks the second half of a split view, separated by ⧉ instead of ›;
 * - `color` (or the first crumb's module colour) tints the leading dot.
 * The last crumb is the current page. Earlier crumbs with a route are buttons
 * that navigate to it.
 *
 * A chip is `{ label, tone }` with tone `info`, `warn`, `ok` or `menu`; a menu
 * chip takes a `menu` array like a crumb.
 *
 * The bar keeps the classic header's `#view-header-left-content-a` and `-b`
 * mount points so content wormholed into them still lands.
 */
export default class LayoutContextBarComponent extends Component {
    @service router;

    get contextBar() {
        return optionalService(getOwner(this), 'context-bar');
    }

    get crumbs() {
        const crumbs = this.args.crumbs || (this.contextBar && this.contextBar.crumbs) || [];
        return crumbs.map((crumb, index) => ({
            ...crumb,
            isFirst: index === 0,
            isCurrent: index === crumbs.length - 1,
            isMenu: Array.isArray(crumb.menu),
            isLink: Boolean(crumb.route) && index !== crumbs.length - 1,
        }));
    }

    get chips() {
        const chips = this.args.chips || (this.contextBar && this.contextBar.chips) || [];
        return chips.map((chip) => {
            const tone = normalizeTone(chip.tone);
            return { ...chip, tone, isMenu: tone === 'menu' };
        });
    }

    @action navigate(crumb) {
        return activateItem(this.router, crumb);
    }
}
