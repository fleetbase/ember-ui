import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { getOwner } from '@ember/application';
import { resourceComponentName } from '../../utils/resource-registry';

export default class FilterModelComponent extends Component {
    @tracked selectedModel;

    constructor() {
        super(...arguments);
        this.selectedModel = this.args.value;
    }

    get optionLabel() {
        return this.args.filter?.modelNamePath ?? 'name';
    }

    /**
     * The component that renders each option and the selected item: the
     * column's own `filterOptionComponent`, else the select-option registered
     * for the filtered model, else nothing (the label path is shown as text).
     */
    get optionComponent() {
        const { filter } = this.args;

        if (filter?.filterOptionComponent) {
            return filter.filterOptionComponent;
        }

        return resourceComponentName(getOwner(this), 'select-option', filter?.model);
    }

    @action onChange(selectedModel) {
        const { onChange, filter } = this.args;

        this.selectedModel = selectedModel;

        // The select's own clear control arrives here as a change to null, but ModelSelect
        // already reports it through @onClear (which is `this.clear` below). Calling clear()
        // again here would fire the caller's @onClear twice for a single clear, so stop.
        if (!selectedModel) {
            return;
        }

        if (typeof onChange === 'function') {
            onChange(filter, selectedModel.id);
        }
    }

    @action clear() {
        const { onClear, filter } = this.args;

        this.selectedModel = null;

        if (typeof onClear === 'function') {
            onClear(filter);
        }
    }
}
