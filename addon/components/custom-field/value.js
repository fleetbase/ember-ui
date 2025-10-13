import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { equal } from '@ember/object/computed';

export default class CustomFieldValueComponent extends Component {
    @tracked customField;
    @tracked value;
    @tracked subject;
    @equal('args.customField.type', 'boolean') isBoolean;

    constructor(owner, { customField, subject }) {
        super(...arguments);
        this.customField = customField;
        this.value = this.#getValueFromSubject(customField, subject);
        this.subject = subject;
    }

    #getValueFromSubject(customField, subject) {
        const cfValue = (subject.get('custom_field_values') ?? []).find((cfv) => cfv.custom_field_uuid === customField.id);
        if (cfValue) return cfValue.value;
        return null;
    }
}
