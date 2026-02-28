import Component from '@glimmer/component';
import { action } from '@ember/object';

/**
 * `Layout::Header::SmartNavMenu::Dropdown`
 *
 * The "More" overflow dropdown panel.  Each item mirrors the same dual-branch
 * pattern used by SmartNavMenu::Item: if the item defines an `onClick` handler
 * it is invoked directly; otherwise a `<LinkToExternal />` route link is
 * rendered — identical behaviour to the original next-catalog-menu-items.
 *
 * Args:
 *   @items            {MenuItem[]} Items to render in the dropdown.
 *   @top              {Number}     Fixed-position top coordinate in px.
 *   @left             {Number}     Fixed-position left coordinate in px.
 *   @onClose          {Function}  Called when the dropdown should close.
 *   @onOpenCustomizer {Function}  Called when the customiser should open.
 *
 * @class LayoutHeaderSmartNavMenuDropdownComponent
 * @extends Component
 */
export default class LayoutHeaderSmartNavMenuDropdownComponent extends Component {
    /**
     * Handle a custom onClick item: invoke the item's handler then close the
     * dropdown.  Receives the full `menuItem` object so we can call
     * `menuItem.onClick(menuItem)` matching the pattern used elsewhere in the
     * Fleetbase console.
     *
     * @param {Object} menuItem
     * @param {Event}  event
     */
    @action handleItemClick(menuItem, event) {
        event?.preventDefault();
        if (menuItem && typeof menuItem.onClick === 'function') {
            menuItem.onClick(menuItem);
        }
        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }
}
