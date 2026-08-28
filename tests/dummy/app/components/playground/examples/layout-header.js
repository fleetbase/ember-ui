import Component from '@glimmer/component';
import { setupConsoleLayout } from 'dummy/playground/host-stubs';

/**
 * Layout::Header expects host-application pieces (`<LinkToExternal>`, a `media` service and an
 * extension registry). They are registered here so the preview renders the real component rather
 * than a stripped-down imitation. Menu data comes from the dummy universe service stub.
 */
export default class PlaygroundExampleLayoutHeaderComponent extends Component {
    constructor() {
        super(...arguments);

        setupConsoleLayout(this);
    }
}
