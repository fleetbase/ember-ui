import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class SidebarService extends Service {
    @tracked state = 'visible';
    @tracked enabled = true;
    @tracked previousState = 'visible';
    @tracked context;

    get isVisible() {
        return this.state !== 'hidden';
    }

    get isHidden() {
        return this.state === 'hidden';
    }

    get isMinimized() {
        return this.state === 'minimized';
    }

    get isEnabled() {
        return this.enabled === true;
    }

    get isDisabled() {
        return this.enabled === false;
    }

    get hasContext() {
        return this.context !== undefined;
    }

    setVisualState(state = 'visible') {
        this.state = state;
    }

    setEnabled(enabled = true) {
        this.enabled = enabled;
    }

    registerContext(context) {
        this.context = context;
    }

    clearContext(context) {
        if (context && this.context !== context) {
            return;
        }

        this.context = undefined;
    }

    syncContextToState(state = this.state, options = {}) {
        const immediate = options.immediate === true;

        if (state === 'minimized') {
            this.context?.minimize();
            return;
        }

        if (state === 'hidden') {
            this.context?.hide(immediate);
            return;
        }

        this.context?.show();
    }

    transitionTo(state = 'visible', options = {}) {
        const allowWhenDisabled = options.allowWhenDisabled === true;

        if (this.isDisabled && !allowWhenDisabled) {
            return;
        }

        this.setVisualState(state);
        this.syncContextToState(state, options);
    }

    @action enable(state = this.previousState ?? 'visible') {
        this.setEnabled(true);
        this.transitionTo(state, { immediate: state === 'hidden' });
    }

    @action disable() {
        if (this.isDisabled) {
            return;
        }

        this.previousState = this.state;
        this.setEnabled(false);
        this.transitionTo('hidden', { immediate: true, allowWhenDisabled: true });
    }

    @action show() {
        this.transitionTo('visible');
    }

    @action hide(options = {}) {
        const immediate = typeof options === 'boolean' ? options : options.immediate === true;
        const preserveDisabled = typeof options === 'object' && options.preserveDisabled === true;

        if (!preserveDisabled && this.isDisabled) {
            this.setEnabled(true);
        }

        this.transitionTo('hidden', { immediate, allowWhenDisabled: true });
    }

    @action hideNow() {
        this.hide({ immediate: true });
    }

    @action minimize() {
        this.transitionTo('minimized');
    }

    @action toggle() {
        if (this.isDisabled) {
            return;
        }

        if (this.isVisible) {
            return this.hideNow();
        }

        return this.show();
    }

    getComponent() {
        return this.context?.component;
    }

    getElement() {
        return this.context?.component?.sidebarNode;
    }

    getGutterElement() {
        return this.context?.component?.gutterNode;
    }
}
