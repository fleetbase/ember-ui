import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class DocsPanelComponent extends Component {
    @service docsPanel;

    @action
    close() {
        this.docsPanel.close();
    }

    @action
    markIframeFailed() {
        this.docsPanel.markIframeFailed();
    }

    @action
    openExternal() {
        this.docsPanel.openExternal();
    }
}
