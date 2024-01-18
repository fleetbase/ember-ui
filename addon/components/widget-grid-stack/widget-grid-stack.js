import GridStackComponent from 'ember-gridstack/components/grid-stack';
import { action } from '@ember/object';

export default class WidgetGridStackComponent extends GridStackComponent {
    @action
    setup(elm) {
        super.setup(elm);
    }

    @action
    customAction() {
        // Your custom action logic
    }
}
