import { Rule } from 'ember-template-lint';

/**
 * Flags `{{on "event" @handler}}` and `{{fn @handler …}}` where the handler position holds a BARE
 * argument.
 *
 * These are not no-ops when the argument is absent — Glimmer throws while rendering:
 *
 *   {{on "click" @onFoo}}   → "You must pass a function as the second argument to the `on` modifier"
 *   {{fn @onFoo item}}      → "You must pass a function as the `fn` helper's first argument"
 *
 * so a component with an unguarded binding cannot be rendered at all without that argument. Five
 * components in this addon were untestable for exactly this reason.
 *
 * Guarded forms are accepted:
 *   {{on "click" (or @onFoo (noop))}}      — the pattern this codebase settled on
 *   {{#if @item.onClick}}{{on "click" @item.onClick}}{{/if}}
 *   {{on "click" this.handler}}            — a component's own action always exists
 */
export default class NoUnguardedHandlerArgument extends Rule {
    logNode({ node, message }) {
        this.log({ message, node });
    }

    /** Is this node a bare `@arg` / `@arg.path` reference? */
    isBareArgument(node) {
        return node && node.type === 'PathExpression' && node.head && node.head.type === 'AtHead';
    }

    /** Walk out to see whether an enclosing `{{#if}}`/`{{#unless}}` already tests this argument. */
    isGuardedByBlock(argumentName) {
        return this.guardStack.some((guard) => guard === argumentName || argumentName.startsWith(`${guard}.`));
    }

    static pathName(node) {
        return node.original || '';
    }

    visitor() {
        this.guardStack = [];

        const enterBlock = (node) => {
            const name = node.path && node.path.original;
            if (name !== 'if' && name !== 'unless') {
                return;
            }
            const [condition] = node.params;
            if (this.isBareArgument(condition)) {
                this.guardStack.push(NoUnguardedHandlerArgument.pathName(condition));
            } else {
                this.guardStack.push(null);
            }
        };

        const exitBlock = (node) => {
            const name = node.path && node.path.original;
            if (name === 'if' || name === 'unless') {
                this.guardStack.pop();
            }
        };

        const check = (node, position, describe) => {
            const candidate = node.params[position];
            if (!this.isBareArgument(candidate)) {
                return;
            }
            const argumentName = NoUnguardedHandlerArgument.pathName(candidate);
            if (this.isGuardedByBlock(argumentName)) {
                return;
            }
            this.logNode({
                node: candidate,
                message:
                    `${describe} receives the bare argument \`${argumentName}\`, which throws while rendering when the ` +
                    `argument is absent. Guard it — \`(or ${argumentName} (noop))\` — or wrap the binding in ` +
                    `\`{{#if ${argumentName}}}\`.`,
            });
        };

        return {
            BlockStatement: { enter: enterBlock, exit: exitBlock },

            ElementModifierStatement(node) {
                // {{on "click" @onFoo}} — the handler is the second parameter
                if (node.path && node.path.original === 'on' && node.params.length >= 2) {
                    check(node, 1, 'The `on` modifier');
                }
            },

            SubExpression(node) {
                // (fn @onFoo item) — the function is the first parameter
                if (node.path && node.path.original === 'fn' && node.params.length >= 1) {
                    check(node, 0, 'The `fn` helper');
                }
            },

            MustacheStatement(node) {
                if (node.path && node.path.original === 'fn' && node.params.length >= 1) {
                    check(node, 0, 'The `fn` helper');
                }
            },
        };
    }
};
