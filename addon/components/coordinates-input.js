import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { get, computed, action } from '@ember/object';
import { isBlank } from '@ember/utils';

const DEFAULT_LATITUDE = 1.3521;
const DEFAULT_LONGITUDE = 103.8198;

export default class CoordinatesInputComponent extends Component {
    @service fetch;
    @service currentUser;
    @tracked latitude;
    @tracked longitude;
    @tracked mapLat;
    @tracked mapLng;
    @tracked lookupQuery;
    @tracked isLoading = false;

    constructor() {
        super(...arguments);

        this.setInitialMapCoordinates();
        this.setInitialValueFromPoint(this.args.value);

        if (typeof this.args.onInit === 'function') {
            this.args.onInit(this);
        }
    }

    @action setInitialValueFromPoint(point) {
        console.log('setInitialValueFromPoint() #point', point);
        if (typeof point === 'object' && !isBlank(point.type) && point.type === 'Point') {
            const [longitude, latitude] = point.coordinates;

            this.updateCoordinates(latitude, longitude, false);
        }
    }

    @action setInitialMapCoordinates() {
        const whois = this.currentUser.getOption('whois');

        this.mapLat = whois.latitude ?? DEFAULT_LATITUDE;
        this.mapLng = whois.longitude ?? DEFAULT_LONGITUDE;
    }

    @action updateCoordinates(latitude, longitude, fireCallback = true) {
        this.latitude = this.mapLat = latitude;
        this.longitude = this.mapLng = longitude;

        if (fireCallback && typeof this.args.onChange === 'function') {
            this.args.onChange({ latitude, longitude });
        }
    }

    @action setCoordinatesFromMap({ target }) {
        const { lat, lng } = target.getCenter();

        this.updateCoordinates(lat, lng);
    }

    @action async reverseLookup() {
        const { onGeocode } = this.args;
        const query = this.lookupQuery;

        if (isBlank(query)) {
            return;
        }

        this.isLoading = true;

        this.fetch
            .get('geocoder/query', { query, single: true })
            .then((place) => {
                if (isBlank(place)) {
                    return;
                }

                const [longitude, latitude] = place.location.coordinates;

                this.updateCoordinates(latitude, longitude);

                if (typeof onGeocode === 'function') {
                    onGeocode(place);
                }
            })
            .catch((error) => {
                console.log(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
