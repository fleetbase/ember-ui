import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';

export default class CustomFieldOptionsInputComponent extends Component {
    @tracked options = {};
    @tracked _options = {};

    /**
     * Constructs a new CustomFieldFormPanelOptionsInputComponent instance, initializing the custom field and options tracking.
     * @param {Object} owner - The owner of the component.
     * @param {Object} customField - The custom field object to be managed.
     */
    constructor(owner, { customField }) {
        super(...arguments);
        this.trackOptions(this.createOptionsObjectFromArray(customField.options));
    }

    /**
     * Converts an array of options into an object format for easier tracking and manipulation.
     * @param {Array} options - The array of options to be converted.
     * @returns {Object} The options object.
     */
    createOptionsObjectFromArray(options = []) {
        const optionsObject = {};
        if (isArray(options)) {
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                optionsObject[i] = option;
            }
        }

        return optionsObject;
    }

    /**
     * Tracks the given options object, setting both the primary and temporary options states.
     * @param {Object} options - The options object to track.
     */
    trackOptions(options = {}) {
        this.options = options;
        this._options = options;
    }

    /**
     * Adds a new option to the options object.
     */
    @action addOption() {
        // Key off the highest existing index rather than the count: removing
        // leading options leaves gaps, and a count-based key can collide with
        // a key that is still in use and silently overwrite that option.
        const indexes = Object.keys(this.options).map(Number);
        const index = indexes.length === 0 ? 0 : Math.max(...indexes) + 1;

        this.trackOptions({
            ...this.options,
            [index]: '',
        });
    }

    /**
     * Updates the value of an option at the specified index.
     * @param {number} index - The index of the option to update.
     * @param {Event} event - The input event containing the new value.
     */
    @action updateOptionValue(index, event) {
        let value = event.target.value;
        this._options = {
            ...this.options,
            [index]: value,
        };
    }

    /**
     * Removes an option at the specified index.
     * @param {number} index - The index of the option to remove.
     */
    @action removeOption(index) {
        const options = { ...this.options };
        delete options[index];
        this.trackOptions(options);
        this.onOptionsChanges();
    }

    /**
     * Updates the primary options object with changes made to the temporary options object.
     */
    @action updateOptions() {
        // The blur handler also fires when the browser tears down a focused
        // input — which happens *while* the {{#each-in}} above is syncing after
        // an earlier commit. Re-assigning `options` there would dirty a tag that
        // the in-flight render already consumed and throw a backtracking-
        // rerender assertion, so only commit when something actually changed.
        if (!this.hasPendingOptionChanges()) {
            return;
        }

        this.options = {
            ...this._options,
        };
        this.onOptionsChanges();
    }

    /**
     * Whether the staged options differ from the committed options.
     * @returns {boolean} True when there is an edit waiting to be committed.
     */
    hasPendingOptionChanges() {
        const committed = this.options;
        const staged = this._options;
        const committedKeys = Object.keys(committed);
        const stagedKeys = Object.keys(staged);

        if (committedKeys.length !== stagedKeys.length) {
            return true;
        }

        return stagedKeys.some((key) => committed[key] !== staged[key]);
    }

    /**
     * Handles changes to the options, updating the customField and calling the onChange callback if provided.
     */
    @action onOptionsChanges() {
        const options = Object.values(this.options);
        this.args.customField.set('options', options);
        if (typeof this.args.onChange === 'function') {
            this.args.onChange(options, this.args.customField);
        }
    }
}
