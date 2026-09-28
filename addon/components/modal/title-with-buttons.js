import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class ModalTitleWithButtonsComponent extends Component {
    @action handler(option, dd) {
        /* istanbul ignore next -- the template only ever calls this as `(fn this.handler option dd)`
           from inside a DropdownButton, so `dd` always has its actions. */
        if (typeof dd?.actions?.close === 'function') {
            dd.actions.close();
        }

        if (typeof option.action === 'function') {
            option.action();
        }
    }
}
