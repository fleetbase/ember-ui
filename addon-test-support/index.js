import { render } from '@ember/test-helpers';

/**
 * Test helpers for the Map-Canvas+ shell (`Layout::Canvas` and the pieces that
 * float over it). Import from `@fleetbase/ember-ui/test-support`.
 *
 * The shell's colours are CSS variables from `styles/tokens.css`, switched by
 * the nearest `data-theme` attribute. These helpers set that attribute on
 * <body> (where the console sets it) and put it back afterwards, so a test can
 * render the same template in both themes without leaking a theme into the
 * next test.
 *
 * @example
 *   import { setupShellTheme, renderShell, eachShellTheme, shellToken } from '@fleetbase/ember-ui/test-support';
 *
 *   module('Integration | Component | my-chrome', function (hooks) {
 *       setupRenderingTest(hooks);
 *       setupShellTheme(hooks);
 *
 *       eachShellTheme((theme) => {
 *           test(`it renders in ${theme}`, async function (assert) {
 *               const canvas = await renderShell(hbs`<Layout::Canvas />`, { theme });
 *               assert.strictEqual(shellToken('canvas-bg', canvas), theme === 'dark' ? '#0b1220' : '#eef1f5');
 *           });
 *       });
 *   });
 */

/** The themes the shell supports, in the order tests should cover them. */
export const SHELL_THEMES = Object.freeze(['light', 'dark']);

/**
 * Sets the shell theme on <body>.
 *
 * @param {'light'|'dark'} theme
 * @throws {Error} for anything other than a supported theme, so a typo fails loudly instead of rendering light
 */
export function setShellTheme(theme) {
    if (!SHELL_THEMES.includes(theme)) {
        throw new Error(`Unknown shell theme "${theme}"; expected one of: ${SHELL_THEMES.join(', ')}`);
    }

    document.body.setAttribute('data-theme', theme);
}

/**
 * Records <body>'s current `data-theme` and returns a function that restores
 * it exactly, removing the attribute if there was none.
 *
 * @returns {() => void}
 */
export function snapshotShellTheme() {
    const previous = document.body.getAttribute('data-theme');

    return function restoreShellTheme() {
        if (previous === null) {
            document.body.removeAttribute('data-theme');
        } else {
            document.body.setAttribute('data-theme', previous);
        }
    };
}

/**
 * Restores <body>'s `data-theme` after every test in the module.
 *
 * @param {object} hooks QUnit module hooks
 */
export function setupShellTheme(hooks) {
    let restore;

    hooks.beforeEach(function () {
        restore = snapshotShellTheme();
    });

    hooks.afterEach(function () {
        restore();
    });
}

/**
 * Calls `callback` once per supported theme. Use it to declare one test per
 * theme, so a failure names the theme it happened in.
 *
 * @param {(theme: 'light'|'dark') => void} callback
 */
export function eachShellTheme(callback) {
    SHELL_THEMES.forEach((theme) => callback(theme));
}

/**
 * Sets the theme, renders `template` and returns the rendered canvas root
 * (`.fb-canvas`), or `null` when the template renders no canvas.
 *
 * @param {object} template a compiled template (`hbs`...``)
 * @param {{theme?: 'light'|'dark'}} [options]
 * @returns {Promise<HTMLElement|null>}
 */
export async function renderShell(template, { theme = 'light' } = {}) {
    setShellTheme(theme);
    await render(template);

    return document.querySelector('#ember-testing .fb-canvas');
}

/**
 * Reads a shell token's resolved value, e.g. `shellToken('canvas-bg')`.
 *
 * @param {string} name the token name without the `--fb-` prefix
 * @param {Element} [element] where to resolve it; defaults to <body>
 * @returns {string} the trimmed value, or '' when the token is not defined
 */
export function shellToken(name, element = document.body) {
    return getComputedStyle(element).getPropertyValue(`--fb-${name}`).trim();
}
