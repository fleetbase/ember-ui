import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class EnforceNotificationComponent extends Component {
    @action
    handleClick() {
        console.log('Component clicked');
    }
}
