import Component from '@glimmer/component';
import { action } from '@ember/object';

/**
 * Collapsible section wrapper for the properties panel.
 *
 * @argument {String}   title    - Section title
 * @argument {String}   icon     - FontAwesome icon name
 * @argument {Boolean}  isOpen   - Whether the section is expanded
 * @argument {Function} onToggle - Called when the header is clicked
 */
export default class TemplateBuilderPropertiesPanelSectionComponent extends Component {
    @action
    toggle() {
        if (this.args.onToggle) {
            this.args.onToggle();
        }
    }
}
