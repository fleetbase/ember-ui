import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { getOwner } from '@ember/application';
import { cancel, later } from '@ember/runloop';
import { resourceComponentName } from '../../utils/resource-registry';

/**
 * The lazy host for a resource's hover summary.
 *
 * Stage 0 renders a hidden anchor and listens on its target (the element
 * matching `@targetSelector`, else the anchor's parent) for hover and focus.
 * Only after `@armDelay` of continuous hover does stage 1 render an
 * interactive Attach::Popover with the resource's summary component, so a
 * table of a hundred rows costs a hundred listeners and nothing more until
 * someone actually pauses on a row. When the popover hides, the host drops
 * back to stage 0.
 *
 * Devices without hover (`(hover: none)`) never arm.
 */
export default class ResourceHoverCardComponent extends Component {
    @tracked armed = false;
    @tracked target = null;

    anchor = null;
    timer = null;
    bound = [];

    get armDelay() {
        return this.args.armDelay ?? 350;
    }

    get showDelay() {
        return this.args.showDelay ?? 0;
    }

    get hideDelay() {
        return this.args.hideDelay ?? 150;
    }

    get placement() {
        return this.args.placement ?? 'top-start';
    }

    get offset() {
        return this.args.offset ?? 8;
    }

    get summaryComponent() {
        return this.args.summaryComponent ?? resourceComponentName(getOwner(this), 'summary', this.args.resource) ?? resourceComponentName(getOwner(this), 'summary', this.args.resourceType);
    }

    get isTouchDevice() {
        try {
            return window.matchMedia?.('(hover: none)')?.matches === true;
        } catch {
            return false;
        }
    }

    get isEnabled() {
        return Boolean(this.args.resource) && !this.args.disabled && Boolean(this.summaryComponent) && !this.isTouchDevice;
    }

    @action setup(element) {
        this.anchor = element;

        if (!this.isEnabled) {
            return;
        }

        this.target = this.findTarget(element);

        if (this.target) {
            this.bind();
        }
    }

    @action teardown() {
        this.cancelTimer();
        this.unbind();
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.teardown();
    }

    findTarget(element) {
        const { targetSelector } = this.args;

        if (typeof targetSelector === 'string' && targetSelector !== '') {
            return element.closest(targetSelector) ?? element.parentElement?.querySelector(targetSelector) ?? null;
        }

        /* istanbul ignore next -- the anchor is a rendered <span>, so it always has a parent
           element; the fallback only guards a caller that has not been written. */
        return element.parentElement ?? null;
    }

    bind() {
        /* istanbul ignore if -- bind() is only reached from setup() (which returns early when
           there is no target) and from disarm() (which always follows an arm() that unbound
           first), so neither guard is reachable in practice. They keep a double-bind from
           silently doubling every listener if a future caller breaks that ordering. */
        if (!this.target || this.bound.length) {
            return;
        }

        const pairs = [
            ['mouseenter', this.onEnter],
            ['focusin', this.onEnter],
            ['mouseleave', this.onLeave],
            ['focusout', this.onLeave],
        ];

        pairs.forEach(([event, handler]) => this.target.addEventListener(event, handler));
        this.bound = pairs;
    }

    unbind() {
        if (this.target) {
            this.bound.forEach(([event, handler]) => this.target.removeEventListener(event, handler));
        }

        this.bound = [];
    }

    cancelTimer() {
        if (this.timer) {
            cancel(this.timer);
            this.timer = null;
        }
    }

    @action onEnter() {
        this.cancelTimer();
        this.timer = later(this, this.arm, this.armDelay);
    }

    @action onLeave() {
        this.cancelTimer();
    }

    @action arm() {
        this.timer = null;

        /* istanbul ignore if -- arm() only runs from the `later()` timer, which Ember does not
           run against a destroyed target, and onEnter cancels any pending timer before
           scheduling another, so it can never fire while already armed. */
        if (this.isDestroyed || this.isDestroying || this.armed) {
            return;
        }

        // The popover binds its own show and hide listeners on the target from
        // here on; ours would only double up.
        this.unbind();
        this.armed = true;
    }

    /** Back to stage 0 once the popover has hidden. */
    @action onPopoverChange(visible) {
        if (!visible) {
            this.disarm();
        }
    }

    @action disarm() {
        /* istanbul ignore if -- disarm() is called from the popover's onChange and from the
           summary's onClose, both of which are torn down with this component, so it is never
           reached after destruction. */
        if (this.isDestroyed || this.isDestroying) {
            return;
        }

        this.armed = false;
        this.bind();
    }
}
