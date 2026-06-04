import { helper } from '@ember/component/helper';
import placeAddress from '../utils/place-address';

export default helper(function placeAddressHelper([place], hash = {}) {
    return placeAddress(place, hash);
});
