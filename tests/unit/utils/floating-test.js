import floating, { Tooltip } from '@fleetbase/ember-ui/utils/floating';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';

function mountTarget() {
    const el = document.createElement('button');
    el.textContent = 'trigger';
    el.style.cssText = 'position: absolute; top: 50px; left: 50px; width: 40px; height: 20px;';
    document.body.appendChild(el);

    return el;
}

function tooltipEls() {
    return [...document.body.querySelectorAll('[role="tooltip"]')];
}

module('Unit | Utility | floating', function (hooks) {
    let mountEl;
    let tooltip;

    hooks.beforeEach(function () {
        mountEl = mountTarget();
    });

    hooks.afterEach(function () {
        tooltip?.destroy();
        tooltip = undefined;
        mountEl.remove();
        // Belt and braces: no tooltip may outlive its test.
        tooltipEls().forEach((el) => el.remove());
    });

    test('createTooltip returns a Tooltip and mounts it on the body', function (assert) {
        tooltip = floating.createTooltip(mountEl, { text: 'Hello' });

        assert.true(tooltip instanceof Tooltip);
        assert.strictEqual(tooltip.tooltipEl.parentNode, document.body, 'the tooltip is mounted on the body, not inside the trigger');
        assert.strictEqual(tooltip.mountEl, mountEl);
    });

    test('it renders the text and the tooltip role', function (assert) {
        tooltip = new Tooltip(mountEl, { text: 'Save changes' });

        assert.strictEqual(tooltip.tooltipEl.textContent, 'Save changes');
        assert.strictEqual(tooltip.tooltipEl.getAttribute('role'), 'tooltip', 'assistive tech can identify it');
    });

    test('it starts hidden and non-interactive', function (assert) {
        tooltip = new Tooltip(mountEl, { text: 'Hi' });

        assert.strictEqual(tooltip.tooltipEl.style.opacity, '0', 'it is transparent until hovered');
        assert.strictEqual(tooltip.tooltipEl.style.pointerEvents, 'none', 'it never swallows pointer events');
        assert.strictEqual(tooltip.tooltipEl.style.position, 'absolute');
    });

    test('it always carries the base classes', function (assert) {
        tooltip = new Tooltip(mountEl, { text: 'Hi' });

        assert.true(tooltip.tooltipEl.classList.contains('ui-input-info'));
        assert.true(tooltip.tooltipEl.classList.contains('text-xs'));
    });

    test('it accepts extra class names as an array', function (assert) {
        tooltip = new Tooltip(mountEl, { text: 'Hi', classNames: ['a', 'b'] });

        assert.true(tooltip.tooltipEl.classList.contains('a'));
        assert.true(tooltip.tooltipEl.classList.contains('b'));
    });

    test('it accepts extra class names as a space-separated string', function (assert) {
        tooltip = new Tooltip(mountEl, { text: 'Hi', classNames: 'c d' });

        assert.true(tooltip.tooltipEl.classList.contains('c'));
        assert.true(tooltip.tooltipEl.classList.contains('d'));
    });

    test('it renders with no options at all', function (assert) {
        tooltip = new Tooltip(mountEl);

        assert.strictEqual(tooltip.tooltipEl.textContent, '', 'missing text renders empty rather than "undefined"');
        assert.true(tooltip.tooltipEl.classList.contains('ui-input-info'));
    });

    test('hovering positions the tooltip and reveals it', async function (assert) {
        tooltip = new Tooltip(mountEl, { text: 'Hi' });

        mountEl.dispatchEvent(new MouseEvent('mouseenter'));
        await settled();

        assert.strictEqual(tooltip.tooltipEl.style.opacity, '1', 'it becomes visible');
        assert.notStrictEqual(tooltip.tooltipEl.style.left, '', 'a computed left offset was applied');
        assert.notStrictEqual(tooltip.tooltipEl.style.top, '', 'a computed top offset was applied');
    });

    test('leaving the trigger hides it again', async function (assert) {
        tooltip = new Tooltip(mountEl, { text: 'Hi' });

        mountEl.dispatchEvent(new MouseEvent('mouseenter'));
        await settled();
        mountEl.dispatchEvent(new MouseEvent('mouseleave'));

        assert.strictEqual(tooltip.tooltipEl.style.opacity, '0');
    });

    test('focus and blur mirror hover, so it is keyboard accessible', async function (assert) {
        tooltip = new Tooltip(mountEl, { text: 'Hi' });

        mountEl.dispatchEvent(new FocusEvent('focus'));
        await settled();
        assert.strictEqual(tooltip.tooltipEl.style.opacity, '1', 'focus shows the tooltip');

        mountEl.dispatchEvent(new FocusEvent('blur'));
        assert.strictEqual(tooltip.tooltipEl.style.opacity, '0', 'blur hides it');
    });

    test('it honours an explicit placement and offset', async function (assert) {
        tooltip = new Tooltip(mountEl, { text: 'Hi', placement: 'bottom', offset: 20 });

        mountEl.dispatchEvent(new MouseEvent('mouseenter'));
        await settled();

        const triggerRect = mountEl.getBoundingClientRect();
        assert.true(parseFloat(tooltip.tooltipEl.style.top) > triggerRect.top, 'a bottom placement sits below the trigger');
    });

    test('destroy removes the element and detaches every listener', async function (assert) {
        const instance = new Tooltip(mountEl, { text: 'Hi' });
        const { tooltipEl } = instance;

        instance.destroy();

        assert.strictEqual(tooltipEl.parentNode, null, 'the element is removed from the body');
        assert.deepEqual(instance.cleanupFns, [], 'the cleanup list is emptied');

        mountEl.dispatchEvent(new MouseEvent('mouseenter'));
        await settled();

        assert.strictEqual(tooltipEl.style.opacity, '0', 'the detached listeners no longer reveal it');
    });

    test('destroy is idempotent', function (assert) {
        const instance = new Tooltip(mountEl, { text: 'Hi' });

        instance.destroy();
        instance.destroy();

        assert.deepEqual(instance.cleanupFns, [], 'a second destroy is a no-op rather than an error');
    });

    test('multiple tooltips on one trigger are independent', function (assert) {
        const first = new Tooltip(mountEl, { text: 'One' });
        const second = new Tooltip(mountEl, { text: 'Two' });

        try {
            assert.strictEqual(tooltipEls().length, 2, 'both are mounted');

            first.destroy();

            assert.strictEqual(tooltipEls().length, 1, 'destroying one leaves the other');
            assert.strictEqual(tooltipEls()[0].textContent, 'Two');
        } finally {
            second.destroy();
        }
    });
});
