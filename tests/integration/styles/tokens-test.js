import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { setupShellTheme, setShellTheme, eachShellTheme, shellToken } from '@fleetbase/ember-ui/test-support';

// The values each theme must resolve, as written in addon/styles/tokens.css.
const THEMED = {
    surface: ['#ffffff', '#0f1726'],
    subtle: ['#f4f6f9', '#182235'],
    border: ['#e3e8ef', '#2a3852'],
    text: ['#0f172a', '#e7ecf4'],
    muted: ['#526077', '#9aa7bd'],
    accent: ['#2563eb', '#3b82f6'],
    'accent-fg': ['#ffffff', '#ffffff'],
    focus: ['#2563eb', '#60a5fa'],
    chrome: ['rgba(255, 255, 255, 0.92)', 'rgba(15, 23, 38, 0.9)'],
    'chrome-border': ['rgba(15, 23, 42, 0.09)', 'rgba(148, 163, 184, 0.22)'],
    info: ['#1d4ed8', '#bfdbfe'],
    'info-subtle': ['#e8f0fe', '#172b4d'],
    warn: ['#92400e', '#fde68a'],
    'warn-subtle': ['#fef3c7', '#422006'],
    ok: ['#166534', '#bbf7d0'],
    'ok-subtle': ['#dcfce7', '#052e16'],
    critical: ['#b91c1c', '#fecaca'],
    'critical-subtle': ['#fee2e2', '#450a0a'],
    'map-land': ['#edf0f4', '#1b2333'],
    'map-water': ['#c9daec', '#13233a'],
    'map-road': ['#ffffff', '#2b3750'],
    'map-route': ['#2563eb', '#60a5fa'],
    'canvas-bg': ['#eef1f5', '#0b1220'],
    'canvas-dot': ['#b8c3d1', '#26344f'],
    'shadow-chrome': ['0 8px 24px rgba(15, 23, 42, 0.1)', '0 10px 30px rgba(0, 0, 0, 0.45)'],
    'shadow-sheet': ['0 16px 40px rgba(15, 23, 42, 0.14)', '0 18px 44px rgba(0, 0, 0, 0.5)'],
};

// Geometry is shared by both themes.
const SHARED = {
    'canvas-grid': '22px',
    'canvas-dot-size': '1px',
    'radius-control': '8px',
    'radius-card': '12px',
    'radius-chrome': '14px',
    'radius-dock': '18px',
    'inset-left': '82px',
    'inset-top': '64px',
    'inset-bottom': '80px',
    'inset-right': '12px',
};

module('Integration | Styles | tokens', function (hooks) {
    setupRenderingTest(hooks);
    setupShellTheme(hooks);

    test('without data-theme every token resolves to its light value', function (assert) {
        document.body.removeAttribute('data-theme');

        for (const [name, [light]] of Object.entries(THEMED)) {
            assert.strictEqual(shellToken(name), light, name);
        }
    });

    eachShellTheme((theme) => {
        test(`every token resolves in the ${theme} theme`, function (assert) {
            setShellTheme(theme);
            const index = theme === 'dark' ? 1 : 0;

            for (const [name, values] of Object.entries(THEMED)) {
                assert.strictEqual(shellToken(name), values[index], name);
            }
            for (const [name, value] of Object.entries(SHARED)) {
                assert.strictEqual(shellToken(name), value, name);
            }
        });
    });
});
