import GridStackComponent from 'ember-gridstack/components/grid-stack';
import { action } from '@ember/object';

export default class WidgetGridStackComponent extends GridStackComponent {
    @action
    setup(elm) {
        super.setup(elm);
        console.log('This: ', this, super.options());
    }
}
