import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';
import { isArray } from '@ember/array';
import { computePosition, flip, shift, offset, arrow } from '@floating-ui/dom';

const { assign } = Object;

export default class FloatingComponent extends Component {
    @tracked element;
    @tracked target;
    arrowNode;

    @computed('args.shiftOptions') get defaultOptions() {
        const { shiftOptions } = this.args;

        return {
            placement: 'bottom',
            strategy: 'absolute',
            middleware: [flip(), shift(shiftOptions)],
        };
    }

    @computed('args.{container,target}', 'target') get floatingContainer() {
        const { container, target } = this.args;
        const trackedTarget = this.target;

        if (container === undefined && target === undefined) {
            return trackedTarget instanceof Element ? trackedTarget.parentNode : trackedTarget;
        }

        let floatingContainer = document.body;

        if (container === undefined && target instanceof Element) {
            /* istanbul ignore next -- target is an Element in the document, so it always has a
               parentNode and the closest() fallbacks behind it are never reached */
            floatingContainer = target.parentNode || target.closest('section') || target.closest('main') || target.closest('body');
        }

        if (container instanceof Element) {
            floatingContainer = container;
        } else if (typeof container === 'string') {
            const selector = container;
            const possibleContainers = document.querySelectorAll(selector);

            floatingContainer = possibleContainers[0];
        }

        return floatingContainer;
    }

    @action resolveTarget(element) {
        const { target } = this.args;

        if (this.target instanceof Element) {
            return this.target;
        }

        /* istanbul ignore next -- resolveTarget is called with the floating element itself, from
           {{did-insert}}, so it is always an Element */
        let possibleTarget = element instanceof Element ? element.parentNode : document.body;

        if (target instanceof Element) {
            possibleTarget = target;
        } else if (typeof target === 'string') {
            const selector = target;
            const possibleTargets = self.document.querySelectorAll(selector);

            possibleTarget = possibleTargets[0];
        }

        return possibleTarget;
    }

    @action findParent(parentFinderNode) {
        const { container, target } = this.args;

        if (container === undefined && target === undefined) {
            // set target from parent finder node and remove
            this.target = parentFinderNode.parentNode;
        }

        parentFinderNode.remove();
    }

    @action getMiddleware(element) {
        const { defaultOptions } = this;
        const mware = this.args.middleware;
        const offsetBy = this.args.offset;
        const displayArrow = this.args.arrow;

        const middleware = isArray(mware) ? [...mware] : [...defaultOptions.middleware];

        if (typeof offsetBy === 'number') {
            middleware.push(offset(offsetBy));
        }

        this.arrowNode = null;

        if (displayArrow === true) {
            const arrowNode = element.querySelector('[x-arrow]');

            if (arrowNode instanceof Element) {
                this.arrowNode = arrowNode;
                middleware.push(arrow({ element: arrowNode }));
            }
        }

        return middleware;
    }

    @action getOptions(element) {
        const { defaultOptions } = this;
        const { placement, strategy } = this.args;
        const middleware = this.getMiddleware(element);

        return {
            placement: placement || defaultOptions.placement,
            strategy: strategy || defaultOptions.strategy,
            middleware,
        };
    }

    @action setupComponent(element) {
        const { registerAPI } = this.args;
        const target = (this.target = this.resolveTarget(element));

        if (typeof registerAPI === 'function') {
            registerAPI({
                floatingElement: element,
                floatingTarget: target,
                computePosition: this.computePosition.bind(this),
            });
        }

        return this.computePosition(target, element);
    }

    @action computePosition(target, element) {
        const { onPositionComputed } = this.args;
        const { placement, strategy, middleware } = this.getOptions(element);

        assign(element.style, { position: strategy });

        computePosition(target, element, {
            placement,
            strategy,
            middleware,
        }).then(({ x, y, middlewareData }) => {
            assign(element.style, {
                position: 'absolute',
                pointerEvents: 'none',
                willChange: 'transform',
                top: '0',
                left: '0',
                transform: `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`,
            });

            if (middlewareData.arrow) {
                // The arrow middleware reports only the cross-axis coordinate: x for top/bottom
                // placements, y for left/right. The static-side inset and rotation stay with the
                // [x-placement] rules in attacher.css.
                const { x: arrowX, y: arrowY } = middlewareData.arrow;

                assign(this.arrowNode.style, {
                    left: typeof arrowX === 'number' ? `${arrowX}px` : '',
                    top: typeof arrowY === 'number' ? `${arrowY}px` : '',
                });
            }

            if (typeof onPositionComputed === 'function') {
                onPositionComputed({
                    floatingElement: element,
                    floatingTarget: target,
                    computePosition: this.computePosition.bind(this),
                    x,
                    y,
                });
            }
        });
    }
}
