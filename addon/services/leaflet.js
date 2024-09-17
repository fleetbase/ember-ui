import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { debug } from '@ember/debug';

export default class LeafletService extends Service {
    @tracked instances = [];
    @tracked initialized = false;
    @tracked instance;
    @tracked initializationId;

    load() {
        let intervals = 0;
        this.initializationId = setInterval(() => {
            const Leaflet = window.L || window.leaflet;
            // Check if Leaflet global object `L` is present
            if (Leaflet && typeof Leaflet === 'object') {
                if (!this.initialized) {
                    // First initialization
                    debug('Leaflet has been initialized.');
                    if (this.instance === undefined) {
                        this.instance = Leaflet;
                        window.L = Leaflet;
                    }
                    this.initialized = true;
                } else if (Leaflet !== this.instance && !this.instances.includes(Leaflet)) {
                    // Subsequent re-initializations
                    debug('Leaflet has been re-initialized!');
                    this.instances.push(window.L);
                }
            }

            intervals++;
            if (intervals === 5) {
                clearTimeout(this.initializationId);
            }
        }, 100);
    }

    getInstance() {
        return this.instance || window.L || window.leaflet;
    }
}
