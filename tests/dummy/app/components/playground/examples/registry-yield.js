import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

/**
 * RegistryYield renders whatever other extensions registered into a named slot. The adapter
 * primes the dummy registry service with two safe, local example components under a
 * playground-only namespace — nothing from a real extension is loaded.
 */
export default class PlaygroundExampleRegistryYieldComponent extends Component {
    @service('universe/registry-service') registryService;

    constructor() {
        super(...arguments);

        this.registryService.renderableComponents[this.args.values.registryName] = [
            { component: 'playground/widgets/metric', options: { label: 'Registered widget', value: 'A' } },
            { component: 'playground/widgets/note', options: { text: 'Registered by a playground extension' } },
        ];
    }
}
