import Component from '@glimmer/component';
import titleize from 'ember-cli-string-helpers/utils/titleize';

export default class LayoutResourcePanelHeaderActionsComponent extends Component {
    get modelName() {
        if (this.args.modelName) return this.args.modelName;
        const model = this.args.resource;
        const modelName = model?.constructor?.modelName ?? model?._internalModel?.modelName;
        if (!modelName) {
            return 'Resource';
        }

        const normalized = modelName.replace(/[-_]/g, ' ');
        return titleize(normalized);
    }
}
