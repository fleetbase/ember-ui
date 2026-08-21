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
        const current = isArray(this.args.model[attr]) ? this.args.model[attr] : [];

        // Plain assignment rather than `pushObject`: with Ember 5's array prototype extensions
        // off, a freshly created `[]` has no `pushObject`, so the first tag on an untagged
        // record used to throw.
        this.args.model.set(attr, [...current, tag]);
    }

    /**
     * Remove a tag from the issue tags.
     *
     * @param {Number} index
     * @memberof IssueFormPanelComponent
     */
    @action removeTag(index) {
        const attr = this.args.attr ?? 'tags';
        /* istanbul ignore next -- a non-array attribute renders no tags, so there is no remove
           control to reach this from. */
        const current = isArray(this.args.model[attr]) ? this.args.model[attr] : [];

        this.args.model.set(
            attr,
            current.filter((_, position) => position !== index)
        );
    }
}
