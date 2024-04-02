import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class LayoutSidebarPanelComponent extends Component {
    @tracked dropdownButtonRenderInPlace = true;

    constructor(owner, { dropdownButtonRenderInPlace = true }) {
        super(...arguments);
        this.dropdownButtonRenderInPlace = dropdownButtonRenderInPlace;
    }
}
