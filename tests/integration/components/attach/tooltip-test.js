import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { find, render, settled, triggerEvent, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function attacher() {
    return document.querySelector('.ember-attacher');
}

async function waitForShown() {
    await waitUntil(() => attacher()?.getAttribute('aria-hidden') === 'false', { timeout: 2000 });
    await settled();
}

module('Integration | Component | attach/tooltip', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders its block as a tooltip', async function (assert) {
        await render(hbs`<button type="button" id="target">Target <Attach::Tooltip @isShown={{true}}>tooltip text</Attach::Tooltip></button>`);
        await waitForShown();

        assert.dom(attacher()).includesText('tooltip text');
        assert.dom('.ember-attacher > div').hasClass('ember-attacher-tooltip');
        assert.dom(attacher()).hasAttribute('role', 'tooltip');
    });

    test('it forwards class, style, delays, target, container and onChange to the popover', async function (assert) {
        const changes = [];
        this.set('onChange', (visible) => changes.push(visible));
        await render(hbs`
            <div id="container"></div>
            <button type="button" id="target">Target</button>
            <div id="holder">
                <Attach::Tooltip
                    @class="clean"
                    @style="min-width: 123px"
                    @hideDelay={{5}}
                    @hideDuration={{7}}
                    @floatingTarget={{this.target}}
                    @floatingContainer="#container"
                    @isShown={{true}}
                    @onChange={{this.onChange}}
                >
                    forwarded
                </Attach::Tooltip>
            </div>
        `);
        await waitForShown();

        assert.dom(attacher()).hasClass('clean');
        assert.ok(document.querySelector('.ember-attacher > div').getAttribute('style').includes('min-width: 123px'), 'style is applied');
        assert.ok(document.querySelector('#container .ember-attacher'), 'rendered into the requested container');
        assert.deepEqual(changes, [true], 'onChange reported the tooltip becoming visible');
    });

    test('it targets the element given as @floatingTarget', async function (assert) {
        this.set('target', null);
        await render(hbs`
            <button type="button" id="target">Target</button>
            <div id="holder">
                {{#if this.target}}
                    <Attach::Tooltip @floatingTarget={{this.target}} @showDuration={{0}}>targeted</Attach::Tooltip>
                {{/if}}
            </div>
        `);
        this.set('target', find('#target'));
        await settled();

        await triggerEvent('#target', 'mouseenter');
        await waitForShown();

        assert.dom(attacher()).includesText('targeted');
    });
});
