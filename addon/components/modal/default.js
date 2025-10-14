import Component from '@glimmer/component';

export default class ModalDefaultComponent extends Component {
    get modalZIndex() {
        return this.args.options?._zIndex ?? this.args.zIndex ?? 1060;
    }
}
