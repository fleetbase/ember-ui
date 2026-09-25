import ControlledExample from 'dummy/playground/controlled';
import { tracked } from '@glimmer/tracking';
import { LABELLED_OPTIONS } from 'dummy/playground/fixtures';

export default class PlaygroundExampleComboBoxComponent extends ControlledExample {
    options = LABELLED_OPTIONS;

    /** ComboBox renders a selected list, so this must be an array from the first render. */
    @tracked selected = [];
}
