import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { debug } from '@ember/debug';
import { task } from 'ember-concurrency';
import { Point } from '@fleetbase/fleetops-data/utils/geojson';

export default class ModelCoordinatesInputComponent extends Component {
    @service fetch;
    @tracked coordinatesInput;

    @task({ restartable: true }) *reverseGeocode({ latitude, longitude }) {
        try {
            const result = yield this.fetch.get('geocoder/reverse', { coordinates: `${latitude},${longitude}`, single: true });
            this.args.model.setProperties({ ...(result ?? {}) });

            if (typeof this.args.onReverseGeocode === 'function') {
                this.args.onReverseGeocode(...arguments);
            }
        } catch (err) {
            debug('Error performing reverse geocoding: ' + err.message);
        }
    }

    @action onAutocomplete(selected) {
        if (this.args.autocomplete === 'location') {
            const { location } = selected;
            const key = this.args.locationProperty ?? 'location';
            this.args.model.setProperties({ [key]: location });
        }

        if (this.args.autocomplete === 'all' || this.args.autocomplete === true) {
            this.args.model.setProperties({ ...selected });
        }

        if (this.coordinatesInput) {
            this.coordinatesInput.updateCoordinates(selected.location);
        }

        if (typeof this.args.onAutocomplete === 'function') {
            this.args.onAutocomplete(...arguments);
        }
    }

    @action setCoordinatesInput(coordinatesInput) {
        this.coordinatesInput = coordinatesInput;

        later(
            this,
            () => {
                if (typeof this.args.onInputReady === 'function') {
                    this.args.onInputReady(coordinatesInput);
                }
            },
            0
        );
    }

    @action updateCoordinates({ latitude, longitude }) {
        const location = new Point(longitude, latitude);
        const key = this.args.locationProperty ?? 'location';

        this.args.model.setProperties({ [key]: location });

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(...arguments);
        }
    }
}
