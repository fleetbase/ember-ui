import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class LayoutResourceTabularActionsComponent extends Component {
    @service filters;
}
