import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, triggerKeyEvent, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';

/*
 * The resource-context-panel stack in the canvas layout, against the real
 * service: every overlay is a Sheet, earlier ones stack as spines (B3).
 */
module('Integration | Component | resource-context-panel (canvas layout)', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.panels = this.owner.lookup('service:resource-context-panel');
        this.owner.lookup('service:shell').setLayout('canvas');
        this.owner.register('component:test-sheet-content', setComponentTemplate(hbs`<input class="content-input" aria-label={{@resource.name}} />`, templateOnly()));
    });

    function open(panels, id, overrides = {}) {
        return panels.open({ id, resource: { name: id }, content: 'test-sheet-content', ...overrides });
    }

    function depths() {
        return findAll('.fb-sheet').map((sheet) => [sheet.getAttribute('aria-label'), sheet.dataset.depth]);
    }

    test('each overlay renders as a sheet, and earlier ones stack behind the newest as spines', async function (assert) {
        open(this.panels, 'CEN-01');
        open(this.panels, 'Amara Chen');
        open(this.panels, 'FLE9883');
        await render(hbs`<ResourceContextPanel />`);

        assert.dom('.next-content-overlay').doesNotExist();
        assert.deepEqual(depths(), [
            ['CEN-01', '2'],
            ['Amara Chen', '1'],
            ['FLE9883', '0'],
        ]);
        assert.dom('.fb-sheet.is-top .content-input').hasAttribute('aria-label', 'FLE9883');
        assert.dom('.fb-sheet-spine').exists({ count: 2 });
    });

    test('clicking a spine brings that panel to the front without re-creating any sheet', async function (assert) {
        open(this.panels, 'CEN-01');
        open(this.panels, 'Amara Chen');
        await render(hbs`<ResourceContextPanel />`);

        const before = findAll('.fb-sheet');
        find('.fb-sheet.is-spine .content-input').dataset.typed = 'kept';

        await click('.fb-sheet.is-spine .fb-sheet-spine');

        assert.deepEqual(
            this.panels.overlays.map((overlay) => overlay.id),
            ['Amara Chen', 'CEN-01']
        );
        assert.deepEqual(depths(), [
            ['Amara Chen', '1'],
            ['CEN-01', '0'],
        ]);
        const after = findAll('.fb-sheet');
        assert.strictEqual(after[0], before[1], 'the sheets are moved, not re-created');
        assert.strictEqual(after[1], before[0]);
        assert.dom('.fb-sheet.is-top .content-input').hasAttribute('data-typed', 'kept');
    });

    test('opening another panel keeps the open sheets mounted', async function (assert) {
        open(this.panels, 'CEN-01');
        await render(hbs`<ResourceContextPanel />`);
        const first = find('.fb-sheet');

        open(this.panels, 'Amara Chen');
        await settled();

        assert.strictEqual(findAll('.fb-sheet')[0], first);
    });

    test('Escape closes only the top panel, even when it is dismissible', async function (assert) {
        open(this.panels, 'CEN-01', { dismissible: true });
        open(this.panels, 'Amara Chen', { dismissible: true });
        await render(hbs`<ResourceContextPanel />`);

        assert.dom('.resource-context-panel-backdrop').doesNotExist('no click-away backdrop over the map');

        await triggerKeyEvent('.fb-sheet.is-top .content-input', 'keydown', 'Escape');

        assert.deepEqual(
            this.panels.overlays.map((overlay) => overlay.id),
            ['CEN-01']
        );
        assert.deepEqual(depths(), [['CEN-01', '0']]);

        await triggerKeyEvent('.fb-sheet', 'keydown', 'Escape');
        assert.deepEqual(this.panels.overlays, []);
        assert.dom('.fb-sheet').doesNotExist();
    });

    test('sizes map to sheet presets and an explicit width wins', async function (assert) {
        open(this.panels, 'tiny', { size: 'xxs' });
        open(this.panels, 'large', { size: 'xl' });
        open(this.panels, 'custom', { width: '500px' });
        open(this.panels, 'odd', { size: 'enormous' });
        await render(hbs`<ResourceContextPanel />`);

        const widths = findAll('.fb-sheet').map((sheet) => sheet.style.getPropertyValue('--fb-sheet-width'));
        assert.deepEqual(widths, ['360px', '640px', '500px', '440px']);
    });

    test('the park button appears once parking is enabled, and parks the panel', async function (assert) {
        open(this.panels, 'CEN-01');
        await render(hbs`<ResourceContextPanel />`);
        assert.dom('.fb-sheet-park').doesNotExist();

        this.panels.enableParking();
        await settled();

        const parked = [];
        this.panels.on('overlay.parked', (overlay) => parked.push(overlay.id));
        await click('.fb-sheet-park');

        assert.deepEqual(parked, ['CEN-01']);
        assert.dom('.fb-sheet').doesNotExist();
        assert.true(this.panels.isParked('CEN-01'));
    });

    test('@layout="classic" keeps the classic overlay even when the shell is in canvas', async function (assert) {
        open(this.panels, 'CEN-01', { dismissible: true });
        await render(hbs`<ResourceContextPanel @layout="classic" />`);

        assert.dom('.next-content-overlay').exists();
        assert.dom('.fb-sheet').doesNotExist();
        assert.dom('.resource-context-panel-backdrop').exists();
    });
});
