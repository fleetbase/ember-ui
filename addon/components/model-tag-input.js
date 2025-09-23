import Component from '@glimmer/component';
import { action } from '@ember/object';
import { isArray } from '@ember/array';

export default class ModelTagInputComponent extends Component {
    /**
     * Add a tag to the issue
     *
     * @param {String} tag
     * @memberof IssueFormPanelComponent
     */
    @action addTag(tag) {
        const attr = this.args.attr ?? 'tags';
        if (!isArray(this.args.model[attr])) {
            this.args.model.set(attr, []);
        }

        this.args.model[attr].pushObject(tag);
    }

    /**
     * Remove a tag from the issue tags.
     *
     * @param {Number} index
     * @memberof IssueFormPanelComponent
     */
    @action removeTag(index) {
        const attr = this.args.attr ?? 'tags';
        this.args.model[attr].removeAt(index);
    }
}
