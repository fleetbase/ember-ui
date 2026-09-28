import Component from '@glimmer/component';
import { setupConsoleLayout } from 'dummy/playground/host-stubs';

/**
 * The default scenario composes the container with a real header and sidebar, which need the same
 * host-application registrations the header preview does.
 */
export default class PlaygroundExampleLayoutContainerComponent extends Component {
    constructor() {
        super(...arguments);

        setupConsoleLayout(this);
    }
}
