// components/custom-grid-stack-item.js
import GridStackItemComponent from 'ember-gridstack/components/grid-stack-item';
import { action } from '@ember/object';

export default class WidgetGridStackItemComponent extends GridStackItemComponent {
    @action
    setup(elm) {
        super.setup(elm);
    }

    @action
    customAction() {}
}
