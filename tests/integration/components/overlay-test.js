import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, find, render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function overlay() {
    return find('.next-content-overlay');
}

function panel() {
    return find('.next-content-overlay-panel');
}

function gutter() {
    return find('.gutter');
}

function mouse(type, target, { clientX = 0, clientY = 0 } = {}) {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX, clientY }));
}

module('Integration | Component | overlay', function (hooks) {
    setupRenderingTest(hooks);

    let events;

    hooks.beforeEach(function () {
        events = [];
        for (const name of ['onLoad', 'onOpen', 'onClose', 'onToggle', 'onResize', 'onResizeStart', 'onResizeEnd']) {
            this.set(name, (payload) => events.push([name, payload]));
        }
    });

    hooks.afterEach(function () {
        // resize handlers attach to document; make sure nothing leaks between tests
        document.body.style.removeProperty('cursor');
    });

    function named(name) {
        return events.filter(([eventName]) => eventName === name);
    }

    test('it renders a dialog positioned right by default', async function (assert) {
        await render(hbs`<Overlay />`);

        assert.dom('[role="dialog"]').exists();
        assert.dom('[role="dialog"]').hasAttribute('aria-modal', 'true', 'it is announced as a modal dialog');
        assert.true(overlay().classList.contains('next-content-overlay-pos-right'));
    });

    test('the position argument drives the position class', async function (assert) {
        this.set('position', 'left');
        await render(hbs`<Overlay @position={{this.position}} />`);
        assert.true(overlay().classList.contains('next-content-overlay-pos-left'));

        this.set('position', 'bottom');
        assert.true(overlay().classList.contains('next-content-overlay-pos-bottom'));
    });

    test('it opens itself on insert and reports onLoad', async function (assert) {
        await render(hbs`<Overlay @onLoad={{this.onLoad}} @onOpen={{this.onOpen}} />`);

        assert.true(overlay().classList.contains('is-open'), 'an overlay opens by default');
        assert.strictEqual(named('onLoad').length, 1, 'onLoad fires once');
        assert.strictEqual(named('onOpen').length, 1);
    });

    test('@isOpen={{false}} keeps it closed on insert', async function (assert) {
        await render(hbs`<Overlay @isOpen={{false}} @onOpen={{this.onOpen}} @onLoad={{this.onLoad}} />`);

        assert.false(overlay().classList.contains('is-open'));
        assert.strictEqual(named('onOpen').length, 0, 'it never opened');
        assert.strictEqual(named('onLoad').length, 1, 'onLoad still fires');
    });

    test('changing @isOpen opens and closes it', async function (assert) {
        this.set('isOpen', false);
        await render(hbs`<Overlay @isOpen={{this.isOpen}} @onOpen={{this.onOpen}} @onClose={{this.onClose}} />`);

        this.set('isOpen', true);
        await settled();
        assert.true(overlay().classList.contains('is-open'));
        assert.strictEqual(named('onOpen').length, 1);

        this.set('isOpen', false);
        await settled();
        assert.false(overlay().classList.contains('is-open'));
        assert.strictEqual(named('onClose').length, 1);
    });

    test('the yielded context can open, close and toggle', async function (assert) {
        await render(hbs`
            <Overlay @isOpen={{false}} @onOpen={{this.onOpen}} @onClose={{this.onClose}} @onToggle={{this.onToggle}} as |overlay|>
                <button type="button" data-test-open {{on "click" overlay.open}}>open</button>
                <button type="button" data-test-close {{on "click" overlay.close}}>close</button>
                <button type="button" data-test-toggle {{on "click" overlay.toggle}}>toggle</button>
            </Overlay>
        `);

        find('[data-test-open]').click();
        await settled();
        assert.true(overlay().classList.contains('is-open'));

        find('[data-test-close]').click();
        await settled();
        assert.false(overlay().classList.contains('is-open'));

        find('[data-test-toggle]').click();
        await settled();
        assert.true(overlay().classList.contains('is-open'), 'toggle opens from closed');
        assert.strictEqual(named('onToggle').length, 1, 'onToggle fires only for toggle');
    });

    test('toggling closed reports onClose as well as onToggle', async function (assert) {
        await render(hbs`
            <Overlay @onClose={{this.onClose}} @onToggle={{this.onToggle}} as |overlay|>
                <button type="button" data-test-toggle {{on "click" overlay.toggle}}>toggle</button>
            </Overlay>
        `);

        find('[data-test-toggle]').click();
        await settled();

        assert.false(overlay().classList.contains('is-open'));
        assert.strictEqual(named('onClose').length, 1);
        assert.strictEqual(named('onToggle').length, 1);
    });

    test('optional class arguments are applied', async function (assert) {
        await render(hbs`<Overlay @noBackdrop={{true}} @outView={{true}} @fullHeight={{true}} @overlayClass="extra" @containerClass="container-extra" />`);

        const classes = overlay().classList;
        assert.true(classes.contains('no-backdrop'));
        assert.true(classes.contains('outview'));
        assert.true(classes.contains('full-height'));
        assert.true(classes.contains('extra'));
        assert.dom('.next-content-overlay-panel-container').hasClass('container-extra');
    });

    test('the gutter only renders when resizable', async function (assert) {
        await render(hbs`<Overlay />`);
        assert.dom('.gutter').doesNotExist();

        await render(hbs`<Overlay @isResizable={{true}} />`);
        assert.dom('.gutter').exists();
    });

    test('maximizing sets the panel width and marks the overlay maximized', async function (assert) {
        await render(hbs`
            <Overlay as |overlay|>
                <button type="button" data-test-max {{on "click" overlay.maximize}}>max</button>
            </Overlay>
        `);

        find('[data-test-max]').click();
        await settled();

        assert.true(overlay().classList.contains('maximized'));
        assert.notStrictEqual(panel().style.width, '', 'a width was applied for a horizontal overlay');
    });

    test('maximizing twice restores the panel', async function (assert) {
        await render(hbs`
            <Overlay as |overlay|>
                <button type="button" data-test-max {{on "click" overlay.maximize}}>max</button>
            </Overlay>
        `);

        find('[data-test-max]').click();
        await settled();
        find('[data-test-max]').click();
        await settled();

        assert.false(overlay().classList.contains('maximized'));
        assert.strictEqual(panel().style.width, '', 'the inline width is removed');
    });

    test('a vertical overlay maximizes by height', async function (assert) {
        await render(hbs`
            <Overlay @position="bottom" as |overlay|>
                <button type="button" data-test-max {{on "click" overlay.maximize}}>max</button>
            </Overlay>
        `);

        find('[data-test-max]').click();
        await settled();

        assert.notStrictEqual(panel().style.height, '', 'height is used instead of width');

        find('[data-test-max]').click();
        await settled();
        assert.strictEqual(panel().style.height, '', 'and removed again');
    });

    test('minimizing translates the panel and marks it minimized', async function (assert) {
        await render(hbs`
            <Overlay as |overlay|>
                <button type="button" data-test-min {{on "click" overlay.minimize}}>min</button>
            </Overlay>
        `);

        find('[data-test-min]').click();
        await settled();

        assert.true(overlay().classList.contains('minimized'));
        assert.true(panel().style.transform.startsWith('translateX'), `expected a horizontal translate, got ${panel().style.transform}`);
    });

    test('a vertical overlay minimizes with a Y translate', async function (assert) {
        await render(hbs`
            <Overlay @position="bottom" as |overlay|>
                <button type="button" data-test-min {{on "click" overlay.minimize}}>min</button>
            </Overlay>
        `);

        find('[data-test-min]').click();
        await settled();

        assert.true(panel().style.transform.startsWith('translateY'), `expected a vertical translate, got ${panel().style.transform}`);
    });

    test('minimizing twice restores the panel', async function (assert) {
        await render(hbs`
            <Overlay as |overlay|>
                <button type="button" data-test-min {{on "click" overlay.minimize}}>min</button>
            </Overlay>
        `);

        find('[data-test-min]').click();
        await settled();
        find('[data-test-min]').click();
        await settled();

        assert.false(overlay().classList.contains('minimized'));
        assert.strictEqual(panel().style.transform, '', 'the transform is removed');
    });

    test('minimizing a maximized overlay undoes the maximize first', async function (assert) {
        await render(hbs`
            <Overlay as |overlay|>
                <button type="button" data-test-max {{on "click" overlay.maximize}}>max</button>
                <button type="button" data-test-min {{on "click" overlay.minimize}}>min</button>
            </Overlay>
        `);

        find('[data-test-max]').click();
        await settled();
        find('[data-test-min]').click();
        await settled();

        assert.false(overlay().classList.contains('maximized'));
        assert.true(overlay().classList.contains('minimized'));
        assert.strictEqual(panel().style.width, '', 'the maximize width was cleared');
    });

    test('maximizing a minimized overlay undoes the minimize first', async function (assert) {
        await render(hbs`
            <Overlay as |overlay|>
                <button type="button" data-test-max {{on "click" overlay.maximize}}>max</button>
                <button type="button" data-test-min {{on "click" overlay.minimize}}>min</button>
            </Overlay>
        `);

        find('[data-test-min]').click();
        await settled();
        find('[data-test-max]').click();
        await settled();

        assert.false(overlay().classList.contains('minimized'));
        assert.true(overlay().classList.contains('maximized'));
        assert.strictEqual(panel().style.transform, '', 'the minimize transform was cleared');
    });

    test('dragging the gutter resizes the panel and reports the lifecycle', async function (assert) {
        await render(hbs`
            <Overlay
                @isResizable={{true}}
                @onResizeStart={{this.onResizeStart}}
                @onResize={{this.onResize}}
                @onResizeEnd={{this.onResizeEnd}}
            />
        `);

        // Dragging right grows the panel: width = (clientX - startX) + panelWidth.
        mouse('mousedown', gutter(), { clientX: 0 });
        assert.strictEqual(named('onResizeStart').length, 1, 'the drag start is reported');

        mouse('mousemove', document, { clientX: 700 });
        assert.strictEqual(named('onResize').length, 1, 'movement inside the clamp range is reported');
        assert.strictEqual(panel().style.width, '700px', 'the panel follows the pointer');

        mouse('mouseup', document, { clientX: 700 });
        assert.strictEqual(named('onResizeEnd').length, 1, 'the drag end is reported');
        assert.strictEqual(document.body.style.cursor, '', 'the resize cursor is cleared');
    });

    test('resizing stops once the drag ends', async function (assert) {
        await render(hbs`<Overlay @isResizable={{true}} @onResize={{this.onResize}} />`);

        mouse('mousedown', gutter(), { clientX: 0 });
        mouse('mousemove', document, { clientX: 700 });
        const during = named('onResize').length;

        mouse('mouseup', document, { clientX: 700 });
        mouse('mousemove', document, { clientX: 750 });

        assert.strictEqual(named('onResize').length, during, 'the document listener was removed');
    });

    test('resizing clamps to the minimum width', async function (assert) {
        await render(hbs`<Overlay @isResizable={{true}} @minResizeWidth={{400}} @onResize={{this.onResize}} />`);

        // Dragging left shrinks the panel past zero, so the minimum clamp applies.
        mouse('mousedown', gutter(), { clientX: 1000 });
        mouse('mousemove', document, { clientX: 0 });

        assert.strictEqual(panel().style.width, '400px', 'the panel never shrinks past the minimum');
        assert.strictEqual(named('onResize').length, 0, 'a clamped move is not reported');

        mouse('mouseup', document, { clientX: 0 });
    });

    test('resizing clamps to the maximum width', async function (assert) {
        await render(hbs`<Overlay @isResizable={{true}} @minResizeWidth={{10}} @maxResizeWidth={{500}} @onResize={{this.onResize}} />`);

        // Dragging far right would exceed the maximum, so the clamp applies.
        mouse('mousedown', gutter(), { clientX: 0 });
        mouse('mousemove', document, { clientX: 5000 });

        assert.strictEqual(panel().style.width, '500px', 'the panel never grows past the maximum');

        mouse('mouseup', document, { clientX: 5000 });
    });

    test('resizing is refused when not resizable or explicitly disabled', async function (assert) {
        await render(hbs`<Overlay @isResizable={{true}} @disableResize={{true}} @onResizeStart={{this.onResizeStart}} />`);

        mouse('mousedown', gutter(), { clientX: 100 });

        assert.strictEqual(named('onResizeStart').length, 0, 'disableResize wins over isResizable');
    });

    test('the yielded context exposes the minimize and maximize affordance flags', async function (assert) {
        await render(hbs`
            <Overlay @isMinimizable={{true}} @isMaximizable={{true}} as |overlay|>
                <span data-test-min-flag>{{if overlay.onMinimize "yes" "no"}}</span>
                <span data-test-max-flag>{{if overlay.onMaximize "yes" "no"}}</span>
            </Overlay>
        `);

        assert.dom('[data-test-min-flag]').hasText('yes', 'isMinimizable stands in for an onMinimize handler');
        assert.dom('[data-test-max-flag]').hasText('yes');
    });

    test('it forwards splattributes to the panel', async function (assert) {
        await render(hbs`<Overlay data-test-overlay="yes" />`);

        assert.dom('.next-content-overlay-panel').hasAttribute('data-test-overlay', 'yes');
    });
    module('resizing in the other directions', function () {
        test('a right-positioned overlay grows as the pointer moves left', async function (assert) {
            await render(hbs`<Overlay @position="right" @isResizable={{true}} @onResize={{this.onResize}} />`);

            mouse('mousedown', gutter(), { clientX: 1000 });
            mouse('mousemove', document, { clientX: 300 });

            assert.strictEqual(panel().style.width, '700px', 'the drag direction is inverted for a right-hand panel');
            assert.strictEqual(document.body.style.cursor, 'col-resize');

            mouse('mouseup', document, { clientX: 300 });
        });

        test('@disableResize refuses the drag outright', async function (assert) {
            await render(hbs`<Overlay @isResizable={{true}} @disableResize={{true}} @onResize={{this.onResize}} />`);

            mouse('mousedown', gutter(), { clientX: 0 });
            mouse('mousemove', document, { clientX: 700 });

            assert.deepEqual(named('onResize'), [], 'nothing is reported');
            assert.strictEqual(panel().style.width, '', 'and the panel keeps its size');

            mouse('mouseup', document, { clientX: 700 });
        });

        test('a resize with no onResize handler still moves the panel', async function (assert) {
            await render(hbs`<Overlay @isResizable={{true}} />`);

            mouse('mousedown', gutter(), { clientX: 0 });
            mouse('mousemove', document, { clientX: 700 });

            assert.strictEqual(panel().style.width, '700px');

            mouse('mouseup', document, { clientX: 700 });
        });
    });
    test('a bottom-positioned overlay resizes by height', async function (assert) {
        await render(hbs`<Overlay @position="bottom" @isResizable={{true}} @onResize={{this.onResize}} />`);

        const startingHeight = panel().getBoundingClientRect().height;

        // Dragging a bottom panel upward grows it: the multiplier is inverted.
        mouse('mousedown', gutter(), { clientY: 0 });
        mouse('mousemove', document, { clientY: -700 });

        assert.strictEqual(named('onResize').length, 1, 'the movement is reported');
        assert.strictEqual(panel().style.height, `${startingHeight + 700}px`, 'the drag distance is added to the starting height');
        assert.strictEqual(panel().style.width, '', 'and its width is left alone by a vertical drag');
        assert.strictEqual(document.body.style.cursor, 'row-resize');

        mouse('mouseup', document, { clientY: -700 });
    });

    test('a vertical resize clamps on height, not on width', async function (assert) {
        await render(hbs`<Overlay @position="bottom" @isResizable={{true}} @maxResizeHeight={{400}} @onResize={{this.onResize}} />`);

        mouse('mousedown', gutter(), { clientY: 0 });
        mouse('mousemove', document, { clientY: -5000 });

        assert.strictEqual(panel().style.height, '400px', 'the height clamp applies');
        assert.strictEqual(panel().style.width, '', 'the width clamp does not fire on a vertical drag');

        mouse('mouseup', document, { clientY: -5000 });
    });
    // Every case above supplies the handlers. All three call sites guard them, and none of
    // those guards had been skipped.
    test('opening, closing and toggling with no handlers at all', async function (assert) {
        await render(hbs`
            <Overlay @isOpen={{false}} as |overlay|>
                <button type="button" data-test-open {{on "click" overlay.open}}>open</button>
                <button type="button" data-test-close {{on "click" overlay.close}}>close</button>
                <button type="button" data-test-toggle {{on "click" overlay.toggle}}>toggle</button>
            </Overlay>
        `);

        await click('[data-test-open]');
        assert.true(overlay().classList.contains('is-open'), 'it opens with nothing listening');

        await click('[data-test-close]');
        assert.false(overlay().classList.contains('is-open'), 'and closes');

        await click('[data-test-toggle]');
        assert.true(overlay().classList.contains('is-open'), 'toggle opens it again');

        await click('[data-test-toggle]');
        assert.false(overlay().classList.contains('is-open'), 'and toggles it shut');
    });
});
