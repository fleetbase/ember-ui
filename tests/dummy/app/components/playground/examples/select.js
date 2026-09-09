import ControlledExample from 'dummy/playground/controlled';
import { STATUS_OPTIONS, LABELLED_OPTIONS } from 'dummy/playground/fixtures';

export default class PlaygroundExampleSelectComponent extends ControlledExample {
    /** Two shapes, because Select supports both bare values and label/value objects. */
    get options() {
        return this.args.scenario === 'objects' ? LABELLED_OPTIONS : STATUS_OPTIONS;
    }

    get optionLabel() {
        return this.args.scenario === 'objects' ? 'label' : null;
    }

    get optionValue() {
        return this.args.scenario === 'objects' ? 'value' : null;
    }
}
