import Component from '@glimmer/component';
import { PLACE } from 'dummy/playground/fixtures';

/**
 * Bound to a plain local object standing in for a place record. No store lookup, no geocoding.
 */
export default class PlaygroundExampleModelCoordinatesInputComponent extends Component {
    model = { ...PLACE };
}
