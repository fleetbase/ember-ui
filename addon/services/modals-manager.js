import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { assert } from '@ember/debug';
import { isArray } from '@ember/array';
import RSVP, { defer } from 'rsvp';

export default class ModalsManagerService extends Service {
  @tracked modalIsOpened = false;
  @tracked modalDefer = null;
  @tracked componentToRender = null;
  @tracked options = {};
  @tracked defaultOptions = {
    title: ' ',
    body: ' ',
    footer: ' ',
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
    declineButtonType: 'secondary',
    declineIconActive: '',
    declineIconInactive: '',
    modalClass: '',
  };

  /**
   * @throws {Error} if some modal is already opened
   * @param componentToRender Component's child-class represents needed modal
   * @param options options passed to the rendered modal
   */
  @action show(componentToRender, options) {
    assert(
      'Only one modal may be opened in the same time!',
      !this.modalIsOpened
    );
    const component = componentToRender;
    const opts = Object.assign({}, this.defaultOptions, options);
    this.componentToRender = component;
    this.modalIsOpened = true;
    this.options = opts;
    const modalDefer = defer();
    this.modalDefer = modalDefer;
    return modalDefer.promise;
  }

  /**
   * @category Default Modals
   */
  @action alert(options) {
    return this.show(AlertModal, options);
  }

  /**
   * @category Default Modals
   */
  @action confirm(options) {
    return this.show(ConfirmModal, options);
  }

  /**
   * @category Default Modals
   */
  @action prompt(options) {
    return this.show(PromptModal, options);
  }

  /**
   * @category Default Modals
   * @throws {Error} if `options.promptValue` is not provided
   */
  @action promptConfirm(options) {
    assert(
      '"options.promptValue" must be defined and not empty',
      !!options.promptValue
    );
    return this.show(PromptConfirmModal, options);
  }

  /**
   * @category Default Modals
   */
  @action checkConfirm(options) {
    return this.show(CheckConfirmModal, options);
  }

  /**
   * @category Default Modals
   * @throws {Error} if `options.promises` is not an array
   */
  @action progress(options) {
    assert(
      '`options.promises` must be an array',
      options && isArray(options.promises)
    );
    return this.show(ProgressModal, options);
  }

  /**
   * @category Default Modals
   * @throws {Error} if `options.process` is not defined
   */
  @action process(options) {
    assert(
      '`options.process` must be defined',
      !!(options && options?.process)
    );
    return this.show(ProcessModal, options);
  }

  /**
   * @category Action Handlers
   */
  @action onConfirmClick(v) {
    this.modalIsOpened = false;
    this.modalDefer && this.modalDefer.resolve(v);
    this.clearOptions();
  }

  /**
   * @category Action Handlers
   */
  @action onDeclineClick(v) {
    this.modalIsOpened = false;
    // eslint-disable-next-line ember/no-array-prototype-extensions
    this.modalDefer && this.modalDefer.reject(v);
    this.clearOptions();
  }

  @action clearOptions() {
    this.options = {};
  }
}
