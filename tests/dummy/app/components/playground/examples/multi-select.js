import ControlledExample from 'dummy/playground/controlled';
import { tracked } from '@glimmer/tracking';
import { STATUS_OPTIONS } from 'dummy/playground/fixtures';

export default class PlaygroundExampleMultiSelectComponent extends ControlledExample {
    options = STATUS_OPTIONS;

    @tracked selected = [];
}
