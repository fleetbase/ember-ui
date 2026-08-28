import Component from '@glimmer/component';
import { DRIVERS } from 'dummy/playground/fixtures';

/**
 * Pill renders a resource, so the adapter builds one from the control values rather than passing
 * scalars — that is how a consumer actually uses it.
 */
export default class PlaygroundExamplePillComponent extends Component {
    get resource() {
        return {
            ...DRIVERS[0],
            name: this.args.values.title,
            subtitle: this.args.values.subtitle,
            online: true,
        };
    }
}
