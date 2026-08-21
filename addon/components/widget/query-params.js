import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class WidgetQueryParamsComponent extends Component {
    @tracked changedParams = {};

    @action onChange(param, value, selection) {
        const component = this.args.params[param].component;

        if (component === 'date-picker') {
            // date-picker's @onChange hands over the raw Date first; `formattedDate` lives on
            // the AirDatepicker selection that follows it, not on the Date.
            value = selection?.formattedDate ?? value;
        }

        this.changedParams = { ...this.changedParams, [param]: value };

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(this.changedParams);
        }
    }
}
