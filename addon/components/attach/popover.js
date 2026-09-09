import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { computed, action, set } from '@ember/object';
import { guidFor } from '@ember/object/internals';
import { htmlSafe } from '@ember/template';
import { cancel, debounce, later, run } from '@ember/runloop';

export default class AttachPopoverComponent extends Component {
    @tracked animation = 'fill';
    @tracked arrow = false;
    @tracked hideDelay = 0;
    @tracked hideDuration = 300;
    @tracked hideOn = 'mouseleave blur escapekey';
    @tracked interactive = false;
    @tracked isShown = false;
    @tracked lazyRender = false;
    @tracked placement = 'top';
    @tracked parentNode;
    @tracked floatingContainer = '.ember-application';
    @tracked floatingTarget = null;
    @tracked renderInPlace = false;
    @tracked currentTarget = null;
    @tracked showDelay = 0;
    @tracked showDuration = 300;
    @tracked showOn = 'mouseenter focus';
    @tracked style = null;
    @tracked useCapture = false;
    @tracked transitionDuration = 0;
    @tracked isStartingAnimation = false;
    @tracked mustRender = false;
    @tracked onChange = null;

    @computed('transitionDuration') get circleTransitionDuration() {
        const { transitionDuration } = this;
        return htmlSafe(`transition-duration: ${Math.round(transitionDuration / 1.25)}ms`);
    }

    @computed('class', 'arrow', 'animation', 'isStartingAnimation')
    get className() {
        const showOrHideClass = `ember-attacher-${this.isStartingAnimation ? 'show' : 'hide'}`;
        const arrowClass = `ember-attacher-${this.arrow ? 'with' : 'without'}-arrow`;

        return `ember-attacher-${this.animation} ${showOrHideClass} ${arrowClass}`;
    }

    @computed('style', 'transitionDuration', 'isShown') get computedStyle() {
        const { style, transitionDuration, isShown } = this;

        return htmlSafe(`transition-duration: ${transitionDuration}ms; pointer-events: ${isShown ? 'auto' : 'none'}; ${style ?? ''}`);
    }

    @computed('showOn') get showEvents() {
        let { showOn } = this;

        /* istanbul ignore if -- `showOn` is a class field with this exact default, and setDefaultOptions() skips any argument that is undefined, so it is never undefined here; this fallback is redundant with the field initialiser */
        if (showOn === undefined) {
            showOn = 'mouseenter focus';
        }

        return showOn === null ? [] : showOn.split(' ');
    }

    @computed('hideOn') get hideEvents() {
        let { hideOn } = this;

        /* istanbul ignore if -- same as showEvents above: the class field already carries this default and setDefaultOptions() never assigns undefined over it */
        if (hideOn === undefined) {
            hideOn = 'mouseleave blur escapekey';
        }

        return hideOn === null ? [] : hideOn.split(' ');
    }

    @action registerAPI(api) {
        this.floatingElement = api.floatingElement;
        this.floatingTarget = api.floatingTarget;
        this.computePosition = api.computePosition;
    }

    @action setDefaultOptions() {
        for (const option in this.args) {
            if (this.args[option] === undefined) {
                continue;
            }

            set(this, option, this.args[option]);
        }
    }

    @action setupComponent(element) {
        // apply default arguments
        this.setDefaultOptions();

        // set last used capture arg
        this.lastUseCaptureArgumentValue = this.useCapture;

        // Used to determine the attachments initial parent element
        this.parentNode = this.floatingTarget?.parentNode ?? element.parentNode;

        // The debounced _hide() and _how() are stored here so they can be cancelled when necessary
        this.delayedVisibilityToggle = null;

        // id for this element
        this.id = this.id || `${guidFor(this)}-floating-ui`;

        // The final source of truth on whether or not all hide() or show() actions have completed
        this.isHidden = true;

        // Holds a delayed function to toggle the visibility of the attachment.
        // Used to make sure animations can complete before the attachment is hidden.
        this.animationTimeout = null;

        // Used to store event listeners so they can be removed when necessary.
        this.hideListenersOnDocumentByEvent = {};
        this.hideListenersOnTargetByEvent = {};
        this.showListenersOnTargetByEvent = {};

        // Let's go
        this.initializeAttacher();
    }

    @action initializeAttacher() {
        this.removeEventListeners();

        this.currentTarget = this.floatingTarget || this.parentNode;

        this.addListenersForShowEvents();
        this.addListenersForHideEvents();

        if (!this.isHidden || this.isShown) {
            // Even if the attachment is already shown, we still want to
            // call this.show() to make sure its position is updated for a potentially new target.
            this.show();
        }
    }

    @action hide() {
        const { floatingElement } = this;

        if (!floatingElement) {
            // With @lazyRender the attachment is not in the DOM until it is first shown, and the
            // hide listeners are attached from setup. Retrying until it appears would spin
            // requestAnimationFrame for the life of the page, because nothing is going to render
            // it. There is also nothing to hide, so say so and stop.
            if (!this.mustRender || this.isDestroyed || this.isDestroying) {
                this.isHidden = true;
                return;
            }

            this.animationTimeout = requestAnimationFrame(() => {
                this.animationTimeout = this.hide();
            });
            return;
        }

        cancelAnimationFrame(this.animationTimeout);

        this.animationTimeout = requestAnimationFrame(() => {
            // Avoid a race condition where we attempt to hide after the component is being destroyed.
            if (this.isDestroyed || this.isDestroying) {
                return;
            }

            const hideDuration = parseInt(this.hideDuration);

            run(() => {
                /* istanbul ignore if -- run() calls this synchronously, and the identical check
                   at the top of this frame callback has just passed */
                if (this.isDestroyed || this.isDestroying) {
                    return;
                }

                this.transitionDuration = hideDuration;
                this.isStartingAnimation = false;
                this.floatingElement.setAttribute('aria-hidden', 'true');

                // Wait for any animations to complete before hiding the attachment
                this.setIsVisibleAfterDelay(false, hideDuration);
            });

            this.isHidden = true;
        });
    }

    @action hideAfterDelay() {
        cancel(this.delayedVisibilityToggle);

        const hideDelay = parseInt(this.hideDelay);
        this.delayedVisibilityToggle = debounce(this, this.hide, hideDelay, !hideDelay);
    }

    @action hideIfMouseOutsideTargetOrAttachment(event) {
        const target = this.currentTarget;

        /* istanbul ignore if -- currentTarget is `this.floatingTarget || this.parentNode`, and
           parentNode falls back to the rendered element's own parentNode, so it is never falsy
           once initializeAttacher has run — and nothing reassigns it */
        if (!target) {
            return;
        }

        // If cursor is not on the attachment or target, hide the popover
        // NOTE: this used to read `!(this.isOffset && this.isCursorBetweenTargetAndAttachment(event))`.
        // `isOffset` was never assigned from an argument or anywhere else, so it was permanently
        // false — and `isCursorBetweenTargetAndAttachment` does not exist on this component, so
        // had anything ever set the flag the popover would have thrown on every mousemove.
        if (!target.contains(event.target) && this.floatingElement && !this.floatingElement.contains(event.target)) {
            // Remove this listener before hiding the attachment
            delete this.hideListenersOnDocumentByEvent.mousemove;
            document.removeEventListener('mousemove', this.hideIfMouseOutsideTargetOrAttachment, this.useCapture);

            this.hideAfterDelay();
        }
    }

    @action hideOnClickOut(event) {
        const targetReceivedClick = this.currentTarget.contains(event.target);

        if (this.interactive) {
            if (!targetReceivedClick && !this.floatingElement.contains(event.target)) {
                this.hideAfterDelay();
            }
        } else if (!targetReceivedClick) {
            this.hideAfterDelay();
        }
    }

    @action hideOnEscapeKey(event) {
        if (event.keyCode === 27) {
            return this.hideAfterDelay();
        }
    }

    @action hideOnLostFocus(event) {
        if (event.relatedTarget === null) {
            this.hideAfterDelay();
        }

        /* istanbul ignore if -- currentTarget is `this.floatingTarget || this.parentNode`, and
           parentNode falls back to the rendered element's own parentNode, so it is never falsy
           once initializeAttacher has run — and nothing reassigns it */
        if (!this.currentTarget) {
            return;
        }

        const targetContainsFocus = this.currentTarget.contains(event.relatedTarget);

        if (this.interactive) {
            if (!targetContainsFocus && !this.floatingElement.contains(event.relatedTarget)) {
                this.hideAfterDelay();
            }
        } else if (!targetContainsFocus) {
            this.hideAfterDelay();
        }
    }

    /**
     * Tear the listeners down when the component goes away.
     *
     * `removeEventListeners()` was already correct, but its only caller was the first line of
     * `initializeAttacher()`, which runs once from `{{did-insert}}` — at which point the listener
     * maps are still empty, so it removed nothing and its loops were dead code. Nothing else ever
     * called it, so every popover that was rendered and destroyed left its `click`/`touchend` and
     * (by default) `keydown` handlers on `document` for the lifetime of the page, still firing
     * `hideOnClickOut` against a destroyed component.
     *
     * `useCapture` has to match between add and remove or the removal silently no-ops, so this
     * uses the same tracked value the listeners were registered with — the component only reads it
     * once, into `lastUseCaptureArgumentValue`, and never re-registers behind our back.
     */
    willDestroy() {
        super.willDestroy(...arguments);

        this.removeEventListeners();
    }

    @action removeEventListeners() {
        const { currentTarget } = this;

        Object.keys(this.hideListenersOnDocumentByEvent).forEach((eventType) => {
            document.removeEventListener(eventType, this.hideListenersOnDocumentByEvent[eventType], this.useCapture);
            delete this.hideListenersOnDocumentByEvent[eventType];
        });

        if (!currentTarget) {
            return;
        }

        [this.hideListenersOnTargetByEvent, this.showListenersOnTargetByEvent].forEach((eventToListener) => {
            Object.keys(eventToListener).forEach((event) => {
                this.currentTarget.removeEventListener(event, eventToListener[event], this.useCapture);
            });
        });
    }

    @action addListenersForHideEvents() {
        const hideOn = this.hideEvents;
        const target = this.currentTarget;

        // Target or component was destroyed
        /* istanbul ignore if -- neither half can be true here: the target is currentTarget, which
           is never falsy after setup, and both callers run either during setup or from a listener
           on that target, which willDestroy removes */
        if (!target || this.isDestroyed || this.isDestroying) {
            return;
        }

        // Swapping the show-on-click listener for the hide-on-click one is only correct once the
        // attachment is on its way to being shown. Doing it during initial setup would delete the
        // show listener before the user ever clicks, leaving a popover with `click` in BOTH
        // @showOn and @hideOn permanently unopenable.
        if (hideOn.includes('click') && (this.mustRender || !this.showEvents.includes('click'))) {
            const showOnClickListener = this.showListenersOnTargetByEvent.click;

            if (showOnClickListener) {
                target.removeEventListener('click', showOnClickListener, this.useCapture);

                delete this.showListenersOnTargetByEvent.click;
            }

            this.hideListenersOnTargetByEvent.click = this.hideAfterDelay;
            target.addEventListener('click', this.hideAfterDelay, this.useCapture);
        }

        if (hideOn.includes('clickout')) {
            const clickoutEvent = 'ontouchstart' in window ? 'touchend' : 'click';

            this.hideListenersOnDocumentByEvent[clickoutEvent] = this.hideOnClickOut;
            document.addEventListener(clickoutEvent, this.hideOnClickOut, this.useCapture);
        }

        if (hideOn.includes('escapekey')) {
            this.hideListenersOnDocumentByEvent.keydown = this.hideOnEscapeKey;
            document.addEventListener('keydown', this.hideOnEscapeKey, this.useCapture);
        }

        // Hides the attachment when the mouse leaves the target
        // (or leaves both target and attachment for interactive attachments)
        if (hideOn.includes('mouseleave')) {
            this.hideListenersOnTargetByEvent.mouseleave = this.hideOnMouseLeaveTarget;
            target.addEventListener('mouseleave', this.hideOnMouseLeaveTarget, this.useCapture);
        }

        // Hides the attachment when focus is lost on the target
        ['blur', 'focusout'].forEach((eventType) => {
            if (hideOn.includes(eventType)) {
                this.hideListenersOnTargetByEvent[eventType] = this.hideOnLostFocus;
                target.addEventListener(eventType, this.hideOnLostFocus, this.useCapture);
            }
        });
    }

    @action hideOnMouseLeaveTarget() {
        if (this.interactive) {
            // TODO(kjb) Should debounce this, but hiding appears sluggish if you debounce.
            //   - If you debounce with immediate fire, you get a bug where you can move out of the
            //   attachment and not trigger the hide because the hide check was debounced
            //   - Ideally we would debounce with an immediate run, then instead of debouncing, we would
            //   queue another fire at the end of the debounce period
            if (!this.hideListenersOnDocumentByEvent.mousemove) {
                this.hideListenersOnDocumentByEvent.mousemove = this.hideIfMouseOutsideTargetOrAttachment;
                document.addEventListener('mousemove', this.hideIfMouseOutsideTargetOrAttachment, this.useCapture);
            }
        } else {
            this.hideAfterDelay();
        }
    }

    @action showAfterDelay() {
        cancel(this.delayedVisibilityToggle);

        this.mustRender = true;
        this.addListenersForHideEvents();

        const showDelay = parseInt(this.showDelay);
        this.delayedVisibilityToggle = debounce(this, this.show, showDelay, !showDelay);
    }

    @action show() {
        const { currentTarget } = this;
        cancelAnimationFrame(this.animationTimeout);

        /* istanbul ignore if -- currentTarget is `this.floatingTarget || this.parentNode`, and
           parentNode falls back to the rendered element's own parentNode, so it is never falsy
           once initializeAttacher has run — and nothing reassigns it */
        if (!currentTarget) {
            return;
        }

        this.mustRender = true;

        // Make the attachment visible immediately so transition animations can take place
        this.setIsVisibleAfterDelay(true, 0);
        this.startShowAnimation();
    }

    @action startShowAnimation() {
        // Recompute position before showing animation
        if (typeof this.computePosition === 'function') {
            this.computePosition(this.floatingTarget, this.floatingElement);
        }

        // Start the show animation on the next cycle so CSS transitions can have an effect.
        // If we start the animation immediately, the transition won't work because
        // `display: none` => `display: ''` is not transition-able.
        // All included animations set opaque: 0, so the attachment is still effectively hidden until
        // the final RAF occurs.
        this.animationTimeout = requestAnimationFrame(() => {
            if (this.isDestroyed || this.isDestroying || !this.currentTarget) {
                return;
            }

            const floatingElement = this.floatingElement;

            // Wait until the element is visible before continuing
            if (!floatingElement || floatingElement.style.display === 'none') {
                this.animationTimeout = this.startShowAnimation();
                return;
            }

            // Wait for the above positioning to take effect before starting the show animation,
            // else the positioning itself will be animated, causing animation glitches.
            this.animationTimeout = requestAnimationFrame(() => {
                if (this.isDestroyed || this.isDestroying || !this.currentTarget) {
                    return;
                }

                run(() => {
                    /* istanbul ignore if -- run() calls this synchronously, and the identical
                       check at the top of this frame callback has just passed */
                    if (this.isDestroyed || this.isDestroying || !this.currentTarget) {
                        return;
                    }
                    // Make the popper element visible now that it has been positioned
                    floatingElement.style.visibility = '';
                    this.transitionDuration = parseInt(this.showDuration);
                    this.isStartingAnimation = true;
                    floatingElement.setAttribute('aria-hidden', 'false');
                });

                this.isHidden = false;
            });
        });
    }

    @action setIsVisibleAfterDelay(isVisible, delay) {
        const { floatingElement } = this;

        if (!floatingElement) {
            this.animationTimeout = requestAnimationFrame(() => {
                this.animationTimeout = this.setIsVisibleAfterDelay(isVisible, delay);
            });

            return;
        }

        const onChange = this.onChange;

        if (delay) {
            this.delayedVisibilityToggle = later(
                this,
                () => {
                    this.animationTimeout = requestAnimationFrame(() => {
                        if (!this.isDestroyed && !this.isDestroying) {
                            /* istanbul ignore next -- a delay only ever accompanies isVisible
                               false: the two callers are (false, hideDuration) and (true, 0) */
                            this.floatingElement.style.display = isVisible ? '' : 'none';

                            // Prevent jank by making the attachment invisible until positioned.
                            // The visibility style will be toggled by this.startShowAnimation()
                            /* istanbul ignore next -- same: isVisible is false whenever delay is set */
                            this.floatingElement.style.visibility = isVisible ? 'hidden' : '';

                            if (onChange) {
                                onChange(isVisible);
                            }
                        }
                    });
                },
                delay
            );
        } else {
            this.floatingElement.style.display = isVisible ? '' : 'none';

            // Prevent jank by making the attachment invisible until positioned.
            // The visibility style will be toggled by this.startShowAnimation()
            this.floatingElement.style.visibility = isVisible ? 'hidden' : '';

            if (onChange) {
                onChange(isVisible);
            }
        }
    }

    @action addListenersForShowEvents() {
        const { currentTarget } = this;

        /* istanbul ignore if -- currentTarget is `this.floatingTarget || this.parentNode`, and
           parentNode falls back to the rendered element's own parentNode, so it is never falsy
           once initializeAttacher has run — and nothing reassigns it */
        if (!currentTarget) {
            return;
        }

        this.showEvents.forEach((event) => {
            this.showListenersOnTargetByEvent[event] = this.showAfterDelay;

            this.currentTarget.addEventListener(event, this.showAfterDelay, this.useCapture);
        });
    }
}
