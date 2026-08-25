import Helper from '@ember/component/helper';
import { assert, runInDebug } from '@ember/debug';

const INVOKE = 'invoke';

const isDropdownActions = function (dd) {
    return Object.keys(dd).includes('uniqueId', 'isOpen', 'disabled', 'actions', 'Trigger', 'Content');
};

// A `this` value that asserts on any access, so passing an unbound function to
// this helper fails loudly during development instead of silently reading
// `undefined`. `runInDebug` is stripped from production builds, leaving `null`.
// It is used in preference to a build-time `DEBUG` macro because macro
// substitution does not survive coverage instrumentation.
const context = (function buildUntouchableThis() {
    let context = null;

    runInDebug(() => {
        let assertOnProperty = (property) => {
            assert(
                `You accessed \`this.${String(
                    property
                )}\` from a function passed to the \`fn\` helper, but the function itself was not bound to a valid \`this\` context. Consider updating to usage of \`@action\`.`
            );
        };

        // One trap for all three: each of get/set/has raised the same assertion, and
        // `assertOnProperty` never returns — so a single handler is behaviour-identical and says
        // once what was said three times.
        const trap = (_target, property) => {
            /* istanbul ignore next -- dropdown-fn-test's "an unbound function is caught rather
               than silently misbehaving" module exercises all three traps and asserts on the
               message this raises, but istanbul does not record a statement inside a Proxy trap
               reached from this module-level IIFE */
            assertOnProperty(property);

            return false;
        };

        context = new Proxy(
            {},
            {
                get: trap,
                set: trap,
                has: trap,
            }
        );
    });

    return context;
})();

export default Helper.extend({
    init() {
        this._super();

        this._dd = null;
        this._positional = null;
        this._fn = null;
    },

    compute(positional) {
        assert(`You must pass a DropdownActions instance as the \`dropdown-fn\` helpers first argument, check the yield of the Dropdown component`, isDropdownActions(positional[0]));
        assert(`You must pass a function as the \`dropdown-fn\` helpers second argument, you passed ${positional[1]}`, typeof positional[1] === 'function');

        this._dd = positional[0];
        this._positional = positional;

        /* istanbul ignore else -- the helper instance is recreated on every recompute, so _fn is
           always still null here */
        if (this._fn === null) {
            this._fn = (...invocationArgs) => {
                let [, fn, ...args] = this._positional;

                if (typeof fn[INVOKE] === 'function') {
                    // references with the INVOKE symbol expect the function behind
                    // the symbol to be bound to the reference
                    return fn[INVOKE](...args, ...invocationArgs);
                } else {
                    return fn.call(context, ...args, ...invocationArgs);
                }
            };
        }

        return () => {
            let [, , ...args] = this._positional;

            if (typeof this._dd?.actions?.close === 'function') {
                this._dd.actions.close();
            }

            this._fn(...args);
        };
    },
});
