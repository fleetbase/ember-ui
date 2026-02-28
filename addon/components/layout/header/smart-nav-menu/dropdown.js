import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

/**
 * `Layout::Header::SmartNavMenu::Dropdown`
 *
 * The "More" overflow dropdown panel.  Displays all extension items that
 * could not fit in the visible bar, plus a footer link to open the
 * customiser panel.
 *
 * Args:
 *   @items            {MenuItem[]} Items to render in the dropdown.
 *   @onClose          {Function}  Called when the dropdown should close.
 *   @onOpenCustomizer {Function}  Called when the customiser should open.
 *
 * @class LayoutHeaderSmartNavMenuDropdownComponent
 * @extends Component
 */
export default class LayoutHeaderSmartNavMenuDropdownComponent extends Component {
    @service router;
    @service hostRouter;

    /**
     * Handle a custom onClick item and close the dropdown.
     * Receives the full `menuItem` object so we can call `menuItem.onClick`.
     *
     * @param {Object} menuItem
     */
    @action handleItemClick(menuItem) {
        if (menuItem && typeof menuItem.onClick === 'function') {
            menuItem.onClick(menuItem);
        }
        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }
}
