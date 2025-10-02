import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { equal } from '@ember/object/computed';

export default class CustomFieldValueComponent extends Component {
    @service fetch;
    @equal('args.metaField.type', 'text') isTextInput;
    @equal('args.metaField.type', 'select') isSelectInput;
    @equal('args.metaField.type', 'vessel') isVesselInput;
    @equal('args.metaField.type', 'port') isPortInput;
    @equal('args.metaField.type', 'datetime') isDateTimeInput;
    @equal('args.metaField.type', 'boolean') isBooleanInput;

    @computed('args.metaField.type') get isTextDisplay() {
        const { type } = this.args.metaField;

        return ['text', 'select', 'vessel', 'port', 'datetime'].includes(type);
    }
}
