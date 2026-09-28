import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class ComponentsController extends Controller {
    /**
     * Catalog search and category filter live in the URL so a filtered catalog is linkable.
     */
    queryParams = ['q', 'category'];

    @tracked q = '';
    @tracked category = '';
}
