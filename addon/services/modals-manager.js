import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, set, get, getProperties, setProperties } from '@ember/object';
import { assert } from '@ember/debug';
import { isArray } from '@ember/array';
import { defer } from 'rsvp';
import { guidFor } from '@ember/object/internals';

const { assign } = Object;

export default class ModalsManagerService extends Service {
    @tracked modals = [];
    @tracked defaultOptions = {
        title: null,
        body: null,
        footer: null,
        confirmButtonDefaultText: 'Yes',
        confirmButtonFulfilledText: 'Yes',
        confirmButtonPendingText: 'Yes',
        confirmButtonRejectedText: 'Yes',
        declineButtonDefaultText: 'No',
        declineButtonFulfilledText: 'No',
        declineButtonPendingText: 'No',
        declineButtonRejectedText: 'No',
        cancel: 'Cancel',
        backdrop: true,
        backdropClose: true,
        backdropTransitionDuration: 150,
        fade: true,
        keyboard: true,
        position: 'top',
        renderInPlace: false,
        scrollable: false,
        size: null,
        transitionDuration: 300,
        confirmIsActive: false,
        confirmButtonSize: 'md',
        confirmButtonType: 'primary',
        confirmIconActive: '',
        confirmIconInactive: '',
        declineIsActive: false,
        declineButtonSize: 'md',
        declineButtonType: 'default',
        declineIconActive: '',
        declineIconInactive: '',
        modalClass: '',
    };

    // Computed properties for backward compatibility
    get modalIsOpened() {
        return this.modals.length > 0;
    }

    get componentToRender() {
        const topModal = this.getTopModal();
        return topModal ? topModal.componentToRender : null;
    }

    get options() {
        const topModal = this.getTopModal();
        return topModal ? topModal.options : {};
    }

    get modalDefer() {
        const topModal = this.getTopModal();
        return topModal ? topModal.defer : null;
    }

    /**
     * Get the top-most (most recently opened) modal
     * @return {Object|null}
     */
    getTopModal() {
        return this.modals.length > 0 ? this.modals[this.modals.length - 1] : null;
    }

    /**
     * Get modal by ID
     * @param {String} modalId
     * @return {Object|null}
     */
    getModalById(modalId) {
        return this.modals.find((modal) => modal.id === modalId) || null;
    }

    /**
     * Get the z-index for a modal based on its position in the stack
     * @param {String} modalId
     * @return {Number}
     */
    getModalZIndex(modalId) {
        const index = this.modals.findIndex((modal) => modal.id === modalId);
        return index >= 0 ? 1060 + index * 10 : 1060;
    }

    /**
     * @param componentToRender Component's child-class represents needed modal
     * @param options options passed to the rendered modal
     */
    @action show(componentToRender, options) {
        const component = componentToRender;
        const opts = assign({}, this.defaultOptions, options, { _zIndex: 1060 + this.modals.length * 10 });
        const modalId = guidFor({}) + '-' + Date.now(); // Generate unique ID
        const modalDefer = defer();

        const modal = {
            id: modalId,
            componentToRender: component,
            options: opts,
            defer: modalDefer,
            isOpen: true,
            createdAt: new Date(),
        };

        // Add modal to the stack
        this.modals = [...this.modals, modal];

        return modalDefer.promise;
    }

    /**
     * Shows a confirmation dialog
     *
     * @method confirm
     * @param {object} options
     * @return {RSVP.Promise}
     */
    @action confirm(options = {}) {
        let modalClass = 'flb--confirm-modal modal-sm';

        if (typeof options.modalClass === 'string') {
            modalClass = `flb--confirm-modal ${options.modalClass}`;
        }

        options = assign(options, {
            hideTitle: true,
            modalClass,
        });
        return this.show('modal/layouts/confirm', options);
    }

    /**
     * Shows a alert dialog
     */
    @action alert(options = {}) {
        let modalClass = 'flb--alert-modal modal-sm';

        if (typeof options.modalClass === 'string') {
            modalClass = `flb--alert-modal ${options.modalClass}`;
        }

        options = assign(options, {
            hideTitle: true,
            hideAcceptButton: true,
            declineButtonText: 'OK',
            modalClass,
        });

        return this.show('modal/layouts/alert', options);
    }

    /**
     * Shows a prompt dialog
     */
    @action prompt(options = {}) {
        return this.show('modal/layouts/prompt', options);
    }

    /**
     * Shows a bulk action dialog
     */
    @action bulk(options = {}) {
        return this.show('modal/layouts/bulk-action', options);
    }

    /**
     * Shows a progress dialog
     * @category Default Modals
     * @throws {Error} if `options.promises` is not an array
     */
    @action progress(options = {}) {
        assert('`options.promises` must be an array', options && isArray(options.promises));
        return this.show('modal/layouts/progress', options);
    }

    /**
     * Shows a process dialog
     * @category Default Modals
     * @throws {Error} if `options.process` is not defined
     */
    @action process(options = {}) {
        assert('`options.process` must be defined', !!(options && options?.process));
        return this.show('modal/layouts/process', options);
    }

    /**
     * Shows a loading dialog
     *
     * @method confirm
     * @param {object} options
     * @return {RSVP.Promise}
     */
    @action async displayLoader(options = {}) {
        await this.done();

        this.show('modal/layouts/loading', { title: 'Loading...', ...options });
    }

    /**
     * Alias for showing a loading dialog
     *
     * @method confirm
     * @param {object} options
     * @return {RSVP.Promise}
     */
    @action async loader(options = {}) {
        return this.displayLoader(options);
    }

    /**
     * Shows a dialog that allows user to select options from prompt
     *
     * @method confirm
     * @param {object} options
     * @return {RSVP.Promise}
     */
    @action async userSelectOption(title, promptOptions = [], modalOptions = {}) {
        await this.done();

        return new Promise((resolve) => {
            const selected = null;

            this.show('modal/layouts/option-prompt', {
                title,
                promptOptions,
                selected,
                selectOption: (event) => {
                    const { value } = event.target;
                    const topModal = this.getTopModal();
                    if (topModal) {
                        this.setOptionForModal(topModal.id, 'selected', value);
                    }
                },
                confirm: () => {
                    const topModal = this.getTopModal();
                    if (topModal) {
                        this.startLoadingForModal(topModal.id);
                        const selected = this.getOptionForModal(topModal.id, 'selected');
                        this.done(topModal.id);
                        resolve(selected);
                    }
                },
                decline: () => {
                    const topModal = this.getTopModal();
                    if (topModal) {
                        this.done(topModal.id);
                    }
                    resolve(null);
                },
                ...modalOptions,
            });
        });
    }

    /**
     * Same as onClickConfirm but allows a handler to run then resolve by user
     *
     * @param {String} modalId
     */
    @action onClickConfirmWithDone(modalId) {
        const modal = this.getModalById(modalId);
        if (!modal) return;

        const done = this.done.bind(this, modalId, 'onConfirm');
        const { confirm, keepOpen } = modal.options;

        if (typeof confirm === 'function') {
            const response = confirm(this, done);

            // hack keep dialog open until hold is true
            if (keepOpen === true) {
                return;
            }

            if (response && typeof response.then === 'function') {
                return response.finally(() => {
                    return done();
                });
            }
            return;
        }

        return done();
    }

    /**
     * Same as onClickDecline but allows a handler to run then resolve by user
     *
     * @param {String} modalId
     */
    @action onClickDeclineWithDone(modalId) {
        const modal = this.getModalById(modalId);
        if (!modal) return;

        const done = this.done.bind(this, modalId, 'onDecline');
        const { decline, keepOpen } = modal.options;

        if (typeof decline === 'function') {
            const response = decline(this, done);

            // hack keep dialog open until hold is true
            if (keepOpen === true) {
                return;
            }

            if (response && typeof response.then === 'function') {
                return response.finally(() => {
                    return done();
                });
            }
            return;
        }

        return done();
    }

    /**
     * Closes the modal and cleans up
     *
     * @param {String} modalId - ID of the modal to close, if not provided closes the top modal
     * @param {String} action - The action that triggered the close
     */
    @action done(modalId, action) {
        return new Promise((resolve) => {
            let modal;

            if (modalId) {
                modal = this.getModalById(modalId);
            } else {
                // If no modalId provided, close the top modal (backward compatibility)
                modal = this.getTopModal();
            }

            if (!modal) {
                resolve(true);
                return;
            }

            const callback = get(modal.options, `${action}`);
            const onFinish = modal.options.onFinish;

            // Remove modal from the stack
            this.modals = this.modals.filter((m) => m.id !== modal.id);

            // Resolve the modal's promise
            modal.defer?.resolve(this);

            if (typeof callback === 'function') {
                callback(modal.options);
            }

            if (typeof onFinish === 'function') {
                onFinish(modal.options);
            }

            resolve(true);
        });
    }

    /**
     * Close all modals
     */
    @action closeAll() {
        const modalsCopy = [...this.modals];
        modalsCopy.forEach((modal) => {
            this.done(modal.id);
        });
    }

    /**
     * Close the top-most modal
     */
    @action closeTop() {
        const topModal = this.getTopModal();
        if (topModal) {
            this.done(topModal.id);
        }
    }

    /**
     * Retrieves an option from the top modal or a specific modal
     *
     * @param {String} key
     * @param {Mixed} defaultValue
     * @param {String} modalId - Optional modal ID, defaults to top modal
     * @return {Mixed}
     */
    @action getOption(key, defaultValue = null, modalId = null) {
        if (isArray(key)) {
            return this.getOptions(key, modalId);
        }

        const modal = modalId ? this.getModalById(modalId) : this.getTopModal();
        if (!modal) return defaultValue;

        const value = get(modal.options, key);
        if (value === undefined) {
            return defaultValue;
        }

        return value;
    }

    /**
     * Retrieves an option from a specific modal
     *
     * @param {String} modalId
     * @param {String} key
     * @param {Mixed} defaultValue
     * @return {Mixed}
     */
    @action getOptionForModal(modalId, key, defaultValue = null) {
        return this.getOption(key, defaultValue, modalId);
    }

    /**
     * Allows multiple options to be get
     *
     * @param {Array} props
     * @param {String} modalId - Optional modal ID, defaults to top modal
     */
    @action getOptions(props = [], modalId = null) {
        const modal = modalId ? this.getModalById(modalId) : this.getTopModal();
        if (!modal) return {};

        if (props?.length === 0) {
            return modal.options ?? {};
        }

        return getProperties(modal.options, props);
    }

    /**
     * Updates an option in the top modal or a specific modal
     *
     * @param {String} key
     * @param {Mixed} value
     * @param {String} modalId - Optional modal ID, defaults to top modal
     */
    @action setOption(key, value, modalId = null) {
        const modal = modalId ? this.getModalById(modalId) : this.getTopModal();
        if (modal) {
            set(modal.options, key, value);
        }
    }

    /**
     * Updates an option in a specific modal
     *
     * @param {String} modalId
     * @param {String} key
     * @param {Mixed} value
     */
    @action setOptionForModal(modalId, key, value) {
        this.setOption(key, value, modalId);
    }

    /**
     * Allows multiple options to be updated
     *
     * @param {Object} options
     * @param {String} modalId - Optional modal ID, defaults to top modal
     */
    @action setOptions(options = {}, modalId = null) {
        const modal = modalId ? this.getModalById(modalId) : this.getTopModal();
        if (modal) {
            setProperties(modal.options, options);
        }
    }

    /**
     * Executes a function passed in options
     *
     * @param {String} fn
     * @param {String} modalId - Optional modal ID, defaults to top modal
     * @param {...any} params
     */
    @action invoke(fn, modalId = null, ...params) {
        const modal = modalId ? this.getModalById(modalId) : this.getTopModal();
        if (!modal) return null;

        const callable = get(modal.options, fn);

        if (typeof callable === 'function') {
            return callable(...params);
        }

        return null;
    }

    /**
     * Alias to start loading indicator on modal
     *
     * @param {String} modalId - Optional modal ID, defaults to top modal
     */
    @action startLoading(modalId = null) {
        this.setOption('isLoading', true, modalId);
    }

    /**
     * Alias to start loading indicator on a specific modal
     *
     * @param {String} modalId
     */
    @action startLoadingForModal(modalId) {
        this.startLoading(modalId);
    }

    /**
     * Alias to stop loading indicator on modal
     *
     * @param {String} modalId - Optional modal ID, defaults to top modal
     */
    @action stopLoading(modalId = null) {
        this.setOption('isLoading', false, modalId);
    }

    /**
     * Alias to stop loading indicator on a specific modal
     *
     * @param {String} modalId
     */
    @action stopLoadingForModal(modalId) {
        this.stopLoading(modalId);
    }

    /**
     * Clear modalsManager options for a specific modal or top modal.
     *
     * @param {String} modalId - Optional modal ID, defaults to top modal
     */
    @action clearOptions(modalId = null) {
        const modal = modalId ? this.getModalById(modalId) : this.getTopModal();
        if (modal) {
            modal.options = {};
        }
    }

    /**
     * Handle keyboard events (like ESC key) for the top modal
     *
     * @param {KeyboardEvent} event
     */
    @action handleKeyboardEvent(event) {
        if (event.key === 'Escape') {
            const topModal = this.getTopModal();
            if (topModal && topModal.options.keyboard !== false) {
                this.done(topModal.id);
            }
        }
    }
}
