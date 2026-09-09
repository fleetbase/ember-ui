import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class ComponentController extends Controller {
    /**
     * One declared, encoded query parameter carries the whole control state, so a component page
     * and its embed URL restore the same preview. See `playground/state-codec`.
     */
    queryParams = ['state'];

    @tracked state = null;
}
