import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, triggerEvent, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function attacher() {
    return document.querySelector('#ember-testing .ember-attacher');
}

function tooltip() {
    return document.querySelector('#ember-testing .ember-attacher-tooltip');
}

function isShown() {
    return attacher()?.getAttribute('aria-hidden') === 'false';
}

function isHidden() {
    return attacher()?.getAttribute('aria-hidden') === 'true';
}

module('Integration | Component | attach/tooltip', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a tooltip attachment with the tooltip role and default placement', async function (assert) {
        await render(hbs`
            <div class="tooltip-target">
                Hover me
                <Attach::Tooltip @renderInPlace={{true}}>Vehicle is offline</Attach::Tooltip>
            </div>
        `);

        assert.dom('.tooltip-target .ember-attacher').exists({ count: 1 }, 'the tooltip renders next to its target');
        assert.dom('.ember-attacher').hasAttribute('role', 'tooltip', 'tooltips always announce themselves with the tooltip role');
        assert.dom('.ember-attacher').hasAttribute('x-placement', 'right', 'the default placement is right');
        assert.dom(tooltip()).exists('the attachment carries the tooltip class name');
        assert.dom(tooltip()).hasText('Vehicle is offline', 'block content is yielded through to the popover');
        assert.dom(tooltip()).hasClass('ember-attacher-hide', 'the tooltip starts hidden');
    });

    test('it uses a string @placement verbatim', async function (assert) {
        await render(hbs`
            <div class="tooltip-target">
                Hover me
                <Attach::Tooltip @renderInPlace={{true}} @placement="bottom-start">Details</Attach::Tooltip>
            </div>
        `);

        assert.dom('.ember-attacher').hasAttribute('x-placement', 'bottom-start');
    });

    test('it falls back to the right placement when @placement is not a string', async function (assert) {
        this.set('placement', undefined);

        await render(hbs`
            <div class="tooltip-target">
                Hover me
                <Attach::Tooltip @renderInPlace={{true}} @placement={{this.placement}}>Details</Attach::Tooltip>
            </div>
        `);

        assert.dom('.ember-attacher').hasAttribute('x-placement', 'right', 'an undefined placement falls back to right');

        this.set('placement', 42);

        await render(hbs`
            <div class="tooltip-target">
                Hover me
                <Attach::Tooltip @renderInPlace={{true}} @placement={{this.placement}}>Details</Attach::Tooltip>
            </div>
        `);

        assert.dom('.ember-attacher').hasAttribute('x-placement', 'right', 'a non-string placement falls back to right');
    });

    test('it forwards presentation arguments to the underlying popover', async function (assert) {
        await render(hbs`
            <div class="tooltip-target">
                Hover me
                <Attach::Tooltip @renderInPlace={{true}} @animation="scale" @arrow={{true}}>Details</Attach::Tooltip>
            </div>
        `);

        assert.dom(tooltip()).hasClass('ember-attacher-scale', '@animation is forwarded');
        assert.dom(tooltip()).hasClass('ember-attacher-with-arrow', '@arrow is forwarded');
        assert.dom('.ember-attacher [x-arrow]').exists();
    });

    test('it shows on hover and hides again on mouseleave', async function (assert) {
        await render(hbs`
            <div class="tooltip-target">
                Hover me
                <Attach::Tooltip @renderInPlace={{true}} @hideDuration={{0}}>Vehicle is offline</Attach::Tooltip>
            </div>
        `);

        assert.false(isShown(), 'the tooltip is not shown before hovering');

        await triggerEvent('.tooltip-target', 'mouseenter');
        await waitUntil(isShown);

        assert.dom(tooltip()).hasClass('ember-attacher-show', 'hovering the target reveals the tooltip');

        await triggerEvent('.tooltip-target', 'mouseleave');
        await waitUntil(isHidden);

        assert.dom(tooltip()).hasClass('ember-attacher-hide', 'leaving the target hides the tooltip');
    });

    test('it forwards @showOn and @lazyRender to the popover', async function (assert) {
        await render(hbs`
            <div class="tooltip-target">
                Click me
                <Attach::Tooltip @renderInPlace={{true}} @showOn="click" @lazyRender={{true}}>Lazy details</Attach::Tooltip>
            </div>
        `);

        assert.dom('.ember-attacher').doesNotExist('@lazyRender defers rendering the tooltip');

        await triggerEvent('.tooltip-target', 'mouseenter');

        assert.dom('.ember-attacher').doesNotExist('mouseenter does not show a click-triggered tooltip');

        await click('.tooltip-target');
        await waitUntil(isShown);

        assert.dom(tooltip()).hasText('Lazy details', 'clicking renders and shows the tooltip');
    });
});
