import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { guidFor } from '@ember/object/internals';
import { activateItem, moveFocus } from '../../utils/shell';

const FOCUSABLE = '[role^="menuitem"], button, input, select, a[href], [tabindex]:not([tabindex="-1"])';

/**
 * `Layout::ChromeMenu` — a small popover menu for the floating chrome: menu
 * crumbs and chips in the context bar, the organization switcher and the
 * account menu in the top bar.
 *
 * ```hbs
 * <Layout::ChromeMenu @label="Orders" @items={{this.items}} />
 *
 * <Layout::ChromeMenu @ariaLabel="Account" @align="right">
 *     <:trigger>RR</:trigger>
 *     <:panel as |menu|>… <button {{on "click" menu.close}}>Done</button></:panel>
 * </Layout::ChromeMenu>
 * ```
 *
 * Items are `{ label, route?, models?, query?, action?, checked?, disabled?, description? }`.
 * Choosing one closes the menu, then calls `@onSelect(item)` when given, or the
 * item's own action, or transitions to its route.
 *
 * Opening moves focus into the menu; ↑/↓ (and Home/End) move between items,
 * Escape and a click outside close it and Escape returns focus to the trigger.
 */
export default class LayoutChromeMenuComponent extends Component {
    @service router;
    @tracked isOpen = false;

    id = guidFor(this);
    element = null;

    get menuId() {
        return `${this.id}-menu`;
    }

    get items() {
        return this.args.items || [];
    }

    @action registerElement(element) {
        this.element = element;
    }

    @action toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        document.addEventListener('mousedown', this.closeOnOutsidePointer, true);
    }

    @action close() {
        this.isOpen = false;
        document.removeEventListener('mousedown', this.closeOnOutsidePointer, true);
    }

    @action closeOnOutsidePointer(event) {
        if (!this.element.contains(event.target)) {
            this.close();
        }
    }

    @action focusFirst(menuElement) {
        moveFocus(menuElement.querySelectorAll(FOCUSABLE), -Infinity);
    }

    @action onKeydown(event) {
        if (event.key === 'Escape' && this.isOpen) {
            event.preventDefault();
            event.stopPropagation();
            this.close();
            this.element.querySelector('.fb-chrome-menu-trigger').focus();
            return;
        }

        const menuElement = this.element.querySelector('.fb-chrome-menu-panel');
        if (!menuElement) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                this.open();
            }
            return;
        }

        const steps = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity };
        if (event.key in steps && !['INPUT', 'SELECT'].includes(event.target.tagName)) {
            event.preventDefault();
            moveFocus(menuElement.querySelectorAll('[role^="menuitem"]'), steps[event.key]);
        }
    }

    @action select(item) {
        this.close();
        if (typeof this.args.onSelect === 'function') {
            return this.args.onSelect(item);
        }

        return activateItem(this.router, item);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        document.removeEventListener('mousedown', this.closeOnOutsidePointer, true);
    }
}
