import Component from '@glimmer/component';
import { setupConsoleLayout } from 'dummy/playground/host-stubs';
import { MENU_ITEMS } from 'dummy/playground/fixtures';

/**
 * The mobile navbar only renders under a mobile `media` service, so the preview registers one.
 */
export default class PlaygroundExampleLayoutMobileNavbarComponent extends Component {
    menuItems = MENU_ITEMS;

    constructor() {
        super(...arguments);

        setupConsoleLayout(this, { mobile: true });
    }
}
