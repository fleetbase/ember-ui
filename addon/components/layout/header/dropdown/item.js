import Component from '@glimmer/component';
import { computed } from '@ember/object';
import { isBlank } from '@ember/utils';
import { bool } from '@ember/object/computed';
import { ExtensionComponent } from '@fleetbase/ember-core/contracts';
import isMenuItemActive from '../../../../utils/is-menu-item-active';

export default class LayoutHeaderDropdownItemComponent extends Component {
    @bool('args.item.onClick') isInteractive;
    @bool('args.item.href') isAnchor;
    @bool('args.item.seperator') isSeperator;

    @computed('args.item.{route,onClick}') get isLink() {
        return this.args.item && typeof this.args.item.route === 'string' && typeof this.args.item.onClick !== 'function';
    }

    @computed('args.item.{component,onClick}') get isComponent() {
        // The `item &&` guard was on the SECOND line, after the first had already dereferenced
        // `this.args.item.component` — rendering with no @item threw. `isTextOnly` defends
        // against exactly this.
        const { item } = this.args;

        if (!item) {
            return false;
        }

        if (item.component instanceof ExtensionComponent && typeof item.onClick !== 'function') {
            return true;
        }

        return typeof item.component === 'string' && typeof item.onClick !== 'function';
    }

    @computed('args.item.text', 'isAnchor', 'isLink', 'isComponent', 'isSeperator', 'isInteractive')
    get isTextOnly() {
        const { isAnchor, isLink, isComponent, isSeperator, isInteractive } = this;
        const { text } = this.args.item ?? { text: null };

        return [isAnchor, isLink, isComponent, isSeperator, isInteractive].every((prop) => prop === false) && text;
    }

    // `active` is read from exactly one place: the `isInteractive` branch of item.hbs. That
    // branch renders only when `item.onClick` is truthy, which also makes `item` non-blank — so
    // the old `currentRouteName.startsWith(@route)` fallback below it could never run. It went
    // with the dead `onClick` dispatcher (see DEFECTS.md #95 and #116).
    @computed('args.item.{section,slug,view}', 'isInteractive')
    get active() {
        const { item } = this.args;

        /* istanbul ignore else -- see above: `active` is only read from the isInteractive branch
           of item.hbs, which renders only for an item that is neither blank nor inert */
        if (this.isInteractive && !isBlank(item)) {
            return isMenuItemActive(item.section, item.slug, item.view);
        }

        /* istanbul ignore next -- see above */
        return false;
    }
}
