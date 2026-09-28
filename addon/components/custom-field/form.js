import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { dasherize, camelize } from '@ember/string';
import { next } from '@ember/runloop';
import isObject from '@fleetbase/ember-core/utils/is-object';
import getCustomFieldTypeMap from '../../utils/get-custom-field-type-map';

export default class CustomFieldFormComponent extends Component {
    @tracked currentFieldMap;
    @tracked colSpanSizeOptions = [1, 2, 3];
    customFieldTypeMap = getCustomFieldTypeMap();

    constructor(owner, { resource }) {
        super(...arguments);
        // Deferred a tick: selectFieldMap writes to the resource, which may already be rendered.
        next(() => this.selectFieldMap(resource.type));
    }

    /**
     * Action method to set the name of the custom field. Converts the name to a dasherized string.
     * @param {Event} event - The event object containing the new field name.
     * @action
     */
    @action setCustomFieldName(event) {
        const value = event.target.value;
        this.args.resource.name = dasherize(value);
    }

    /**
     * Action method for selecting the custom field type. It updates the field type
     * and selects the corresponding field map.
     * @param {Event} event - The event object containing the selected field type.
     * @action
     */
    @action onSelectCustomFieldType(event) {
        const value = event.target.value;
        const type = dasherize(value);
        this.args.resource.type = type;
        this.selectFieldMap(type);
    }

    /**
     * Action method for selecting a model type for the custom field.
     * @param {Event} event - The event object containing the selected model type.
     * @action
     */
    // No entry in getCustomFieldTypeMap declares allowedModels (modelSelect is commented out
    // there), so the template never renders the model-type select that fires this.
    /* istanbul ignore next */
    @action onSelectModelType(event) {
        const value = event.target.value;
        const modelName = dasherize(value);
        this.setCustomFieldMetaProperty('modelName', modelName);
    }

    /**
     * Action method to set a metadata property for the custom field.
     * Initializes the metadata object if it doesn't exist.
     * @param {string} key - The key of the metadata property.
     * @param {*} value - The value to set for the property.
     * @action
     */
    @action setCustomFieldMetaProperty(key, value) {
        const currentMeta = isObject(this.args.resource.meta) ? this.args.resource.meta : {};
        this.args.resource.set('meta', { ...currentMeta, [key]: value });
    }

    /**
     * Selects the field map based on the given field type.
     * Updates the current field map and the component for the custom field.
     * @param {string} type - The type of the custom field.
     */
    selectFieldMap(type) {
        if (!type) return;
        const fieldKey = camelize(type);
        const fieldMap = this.customFieldTypeMap[fieldKey];
        if (fieldMap) {
            this.currentFieldMap = fieldMap;
            this.args.resource.component = fieldMap.component;
        }
    }
}
