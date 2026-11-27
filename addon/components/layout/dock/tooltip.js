import Component from '@glimmer/component';
import { action } from '@ember/object';

/** Gap between a dock item and its tooltip, in px. */
export const TOOLTIP_GAP = 10;

/**
 * `Layout::Dock::Tooltip` — the module's name, ⌘ shortcut and status, shown to
 * the right of the hovered or focused dock item (`@anchor`). It is fixed
 * positioned so the dock's own overflow never clips it, and the item points at
 * it with `aria-describedby`.
 */
export default class LayoutDockTooltipComponent extends Component {
    @action place(element) {
        const rect = this.args.anchor.getBoundingClientRect();
        element.style.setProperty('top', `${rect.top + rect.height / 2}px`);
        element.style.setProperty('left', `${rect.right + TOOLTIP_GAP}px`);
    }
}
