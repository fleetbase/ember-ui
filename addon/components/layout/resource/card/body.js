import Component from '@glimmer/component';

export default class LayoutResourceCardBodyComponent extends Component {
    get model() {
        return this.args.model;
    }

    get bodyClass() {
        const baseClasses = '';
        return this.args.class ? `${baseClasses} ${this.args.class}` : baseClasses;
    }
}
