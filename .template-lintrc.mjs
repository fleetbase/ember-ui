import NoUnguardedHandlerArgument from './lint/no-unguarded-handler-argument.mjs';

export default {
    plugins: [
        {
            name: 'fleetbase-ember-ui',
            rules: {
                'no-unguarded-handler-argument': NoUnguardedHandlerArgument,
            },
        },
    ],
    extends: 'recommended',
    rules: {
        // `{{on "click" @arg}}` and `{{fn @arg …}}` THROW while rendering when the argument is
        // absent — they are not no-ops. Thirteen bindings across five components were fixed for
        // this; the rule keeps them from coming back.
        'no-unguarded-handler-argument': true,
        'no-invalid-interactive': 'off',
        'no-yield-only': 'off',
        'no-pointer-down-event-binding': 'off',
        'table-groups': 'off',
        'link-href-attributes': 'off',
        'require-input-label': 'off',
        'no-array-prototype-extensions': 'off',
        'no-unsupported-role-attributes': 'off',
        // These are addon helpers, not components. The rule cannot tell them
        // apart on its own and its own error message asks for this list.
        'no-curly-component-invocation': {
            allow: ['avatar-url', 'format-currency', 'format-milliseconds', 'get-default-value', 'is-bool-value', 'is-dark-mode', 'json-hash', 'string-starts-with', 'ui-is-array'],
        },
    },
    overrides: [
        {
            // Test fixtures always supply the handlers they bind — the template is written
            // alongside the arguments it needs. The rule exists to protect the addon's shipped
            // components, where the caller is someone else.
            files: ['tests/**/*-test.js'],
            rules: {
                'no-unguarded-handler-argument': false,
            },
        },
        {
            // Modifier tests set inline styles on their fixtures because the
            // element's own style is exactly what the modifier under test reads
            // and writes. The rule stays fully enforced for every addon template.
            files: ['tests/integration/modifiers/**/*-test.js'],
            rules: {
                'no-inline-styles': 'off',
            },
        },
    ],
};
