import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, focus, settled, triggerEvent, triggerKeyEvent, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { SHEET_WIDTHS, SPINE_WIDTH, RESIZE_STEP } from '@fleetbase/ember-ui/components/sheet';

function cssVar(selector, name) {
    return find(selector).style.getPropertyValue(name);
}

module('Integration | Component | sheet', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.calls = [];
        this.onClose = () => this.calls.push('close');
        this.onPark = () => this.calls.push('park');
        this.onActivate = () => this.calls.push('activate');
        this.onResize = (width) => this.calls.push(['resize', width]);
    });

    module('rendering', function () {
        test('by default it is a 440px sheet on the right, titled and labelled by its heading', async function (assert) {
            await render(hbs`<Sheet @title="CEN-01"><p class="content">Vehicle</p></Sheet>`);

            const sheet = find('.fb-sheet');
            assert.dom(sheet).hasClass('is-right').hasClass('is-top').hasAttribute('role', 'dialog').hasAttribute('aria-modal', 'false').hasAttribute('data-depth', '0');
            assert.dom(sheet).doesNotHaveAttribute('aria-hidden');
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), `${SHEET_WIDTHS.md}px`);
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-offset'), '0px');
            assert.dom('h2.fb-sheet-title').hasText('CEN-01');
            assert.dom(sheet).hasAttribute('aria-labelledby', find('h2.fb-sheet-title').id);
            assert.dom(sheet).doesNotHaveAttribute('aria-label');
            assert.dom('.fb-sheet-body .content').hasText('Vehicle');
            assert.dom('.fb-sheet-controls').doesNotExist('no close or park without handlers');
            assert.dom('.fb-sheet-footer').doesNotExist();
            assert.dom('.fb-sheet-resize').doesNotExist();
            assert.dom('.fb-sheet-spine').doesNotExist();
            assert.false(find('.fb-sheet-panel').inert);
            assert.strictEqual(find('.fb-sheet').offsetWidth, SHEET_WIDTHS.md);
        });

        test('header, body and footer blocks', async function (assert) {
            await render(hbs`
                <Sheet @title="CEN-01" @onClose={{this.onClose}} @onPark={{this.onPark}}>
                    <:header as |sheet|><strong class="custom-header" data-top={{if sheet.isTop "yes"}}>Custom</strong><button type="button" class="header-close" {{on "click" sheet.close}}>x</button><button type="button" class="header-park" {{on "click" sheet.park}}>_</button></:header>
                    <:body as |sheet|><p class="body" data-top={{if sheet.isTop "yes"}}>Body</p></:body>
                    <:footer as |sheet|><button type="button" class="footer-close" {{on "click" sheet.close}}>Done</button></:footer>
                </Sheet>
            `);

            assert.dom('.fb-sheet-header .custom-header').hasText('Custom').hasAttribute('data-top', 'yes');
            assert.dom('.fb-sheet-title').doesNotExist('the header block replaces the title');
            assert.dom('.fb-sheet').hasAttribute('aria-label', 'CEN-01', 'a custom header names the sheet from @title');
            assert.dom('.fb-sheet').doesNotHaveAttribute('aria-labelledby');
            assert.dom('.fb-sheet-body .body').hasAttribute('data-top', 'yes');
            assert.dom('.fb-sheet-footer .footer-close').exists();

            await click('.header-close');
            await click('.header-park');
            await click('.footer-close');
            assert.deepEqual(this.calls, ['close', 'park', 'close']);
        });

        test('the default block yields the sheet too', async function (assert) {
            await render(hbs`<Sheet @title="A" @onClose={{this.onClose}} as |sheet|><button type="button" class="inner" {{on "click" sheet.close}}>x</button></Sheet>`);
            await click('.inner');
            assert.deepEqual(this.calls, ['close']);
        });

        test('yielded actions without handlers do nothing', async function (assert) {
            await render(
                hbs`<Sheet @title="A" as |sheet|><button type="button" class="inner-close" {{on "click" sheet.close}}>x</button><button type="button" class="inner-park" {{on "click" sheet.park}}>_</button></Sheet>`
            );
            await click('.inner-close');
            await click('.inner-park');
            assert.dom('.fb-sheet').exists();
        });

        test('@label names the sheet', async function (assert) {
            await render(hbs`<Sheet @title="CEN-01" @label="Vehicle CEN-01" />`);
            assert.dom('.fb-sheet').hasAttribute('aria-label', 'Vehicle CEN-01').doesNotHaveAttribute('aria-labelledby');
        });

        test('@side="left" docks it on the left', async function (assert) {
            await render(hbs`<Sheet @title="Filters" @side="left" />`);
            assert.dom('.fb-sheet').hasClass('is-left').hasAttribute('data-side', 'left');
        });

        const WIDTHS = [
            ['sm', `${SHEET_WIDTHS.sm}px`],
            ['lg', `${SHEET_WIDTHS.lg}px`],
            [500, '500px'],
            ['550px', '550px'],
            ['600', '600px'],
            ['40vw', '40vw'],
        ];
        for (const [width, css] of WIDTHS) {
            test(`@width=${JSON.stringify(width)} sets the width to ${css}`, async function (assert) {
                this.width = width;
                await render(hbs`<Sheet @title="A" @width={{this.width}} />`);
                assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), css);
            });
        }

        test('close and park buttons call their handlers; @showClose={{false}} hides close', async function (assert) {
            this.showClose = true;
            await render(hbs`<Sheet @title="CEN-01" @onClose={{this.onClose}} @onPark={{this.onPark}} @showClose={{this.showClose}} />`);

            assert.dom('.fb-sheet-park').hasAttribute('aria-label', 'Park CEN-01');
            assert.dom('.fb-sheet-close').hasAttribute('aria-label', 'Close CEN-01');
            await click('.fb-sheet-park');
            await click('.fb-sheet-close');
            assert.deepEqual(this.calls, ['park', 'close']);

            this.set('showClose', false);
            assert.dom('.fb-sheet-close').doesNotExist();
            assert.dom('.fb-sheet-park').exists();
        });

        test('@onOpen receives the sheet once it is mounted', async function (assert) {
            this.onOpen = (sheet) => (this.opened = sheet);
            await render(hbs`<Sheet @title="A" @onOpen={{this.onOpen}} @onClose={{this.onClose}} />`);

            assert.strictEqual(this.opened.element, find('.fb-sheet'));
            this.opened.close();
            this.opened.park();
            this.opened.activate();
            assert.deepEqual(this.calls, ['close']);
        });
    });

    module('stacking', function () {
        test('sheets behind the top one become spines, pushed in and inert', async function (assert) {
            await render(hbs`
                <Sheet @title="CEN-01" @stackIndex={{0}} @stackSize={{3}} @onActivate={{this.onActivate}} class="one"><button type="button" class="in-one">one</button></Sheet>
                <Sheet @title="Amara Chen" @stackIndex={{1}} @stackSize={{3}} class="two" />
                <Sheet @title="FLE9883" @stackIndex={{2}} @stackSize={{3}} @resizable={{true}} class="three" />
            `);

            assert.dom('.one').hasAttribute('data-depth', '2').hasClass('is-spine').doesNotHaveClass('is-top');
            assert.dom('.two').hasAttribute('data-depth', '1').hasClass('is-spine');
            assert.dom('.three').hasAttribute('data-depth', '0').hasClass('is-top').doesNotHaveClass('is-spine');
            assert.strictEqual(cssVar('.one', '--fb-sheet-offset'), `${2 * SPINE_WIDTH}px`);
            assert.strictEqual(cssVar('.two', '--fb-sheet-offset'), `${SPINE_WIDTH}px`);
            assert.strictEqual(cssVar('.three', '--fb-sheet-offset'), '0px');
            assert.true(find('.one .fb-sheet-panel').inert, 'content behind the top sheet is inert');
            assert.dom('.one .in-one').exists('but still mounted');
            assert.false(find('.three .fb-sheet-panel').inert);
            assert.dom('.one .fb-sheet-spine').hasAttribute('aria-label', 'Show CEN-01').hasText('CEN-01');
            assert.dom('.three .fb-sheet-spine').doesNotExist();
            assert.dom('.one .fb-sheet-resize').doesNotExist();
            assert.dom('.three .fb-sheet-resize').exists('only the top sheet can be resized');

            const zIndex = (selector) => Number(getComputedStyle(find(selector)).zIndex);
            assert.true(zIndex('.three') > zIndex('.two'), 'the top sheet is in front');
            assert.true(zIndex('.two') > zIndex('.one'), 'and each spine in front of the one behind it');

            await click('.one .fb-sheet-spine');
            await click('.two .fb-sheet-spine');
            assert.deepEqual(this.calls, ['activate'], 'a spine calls @onActivate, when given');
        });

        test('more than three sheets behind the top one are hidden, not removed', async function (assert) {
            await render(hbs`
                <Sheet @title="Deep" @stackIndex={{0}} @stackSize={{5}} class="deep"><p class="deep-content">kept</p></Sheet>
                <Sheet @title="Top" @stackIndex={{4}} @stackSize={{5}} />
            `);

            assert.dom('.deep').hasClass('is-hidden').hasAttribute('aria-hidden', 'true').doesNotHaveClass('is-spine');
            assert.strictEqual(getComputedStyle(find('.deep')).visibility, 'hidden');
            assert.strictEqual(cssVar('.deep', '--fb-sheet-offset'), `${3 * SPINE_WIDTH}px`);
            assert.dom('.deep .deep-content').exists();
        });

        test('a stack position out of range is clamped', async function (assert) {
            await render(hbs`
                <Sheet @title="A" @stackIndex={{9}} @stackSize={{2}} class="over" />
                <Sheet @title="B" @stackIndex={{-3}} @stackSize={{2}} class="under" />
                <Sheet @title="C" @stackIndex="x" @stackSize={{0}} class="bad" />
            `);

            assert.dom('.over').hasAttribute('data-depth', '0');
            assert.dom('.under').hasAttribute('data-depth', '1');
            assert.dom('.bad').hasAttribute('data-depth', '0');
        });
    });

    module('keyboard and focus', function () {
        test('Escape closes only the top sheet', async function (assert) {
            this.closeBottom = () => this.calls.push('bottom');
            this.closeTop = () => this.calls.push('top');
            await render(hbs`
                <Sheet @title="Bottom" @stackIndex={{0}} @stackSize={{2}} @onClose={{this.closeBottom}} />
                <Sheet @title="Top" @stackIndex={{1}} @stackSize={{2}} @onClose={{this.closeTop}} class="top"><input class="field" /></Sheet>
            `);

            await triggerKeyEvent('.top .field', 'keydown', 'Escape');
            assert.deepEqual(this.calls, ['top']);
        });

        test('Escape is ignored when @closeOnEscape is false or there is no @onClose', async function (assert) {
            this.closeOnEscape = false;
            await render(hbs`<Sheet @title="A" @onClose={{this.onClose}} @closeOnEscape={{this.closeOnEscape}} />`);

            await triggerKeyEvent('.fb-sheet', 'keydown', 'Escape');
            assert.deepEqual(this.calls, []);

            await render(hbs`<Sheet @title="B" />`);
            await triggerKeyEvent('.fb-sheet', 'keydown', 'Escape');
            assert.dom('.fb-sheet').exists();
        });

        test('opening moves focus into the sheet, and closing returns it', async function (assert) {
            this.open = false;
            await render(hbs`
                <button type="button" class="opener">open</button>
                {{#if this.open}}<Sheet @title="A"><button type="button" class="inside">inside</button></Sheet>{{/if}}
            `);

            await focus('.opener');
            this.set('open', true);
            await settled();
            assert.strictEqual(document.activeElement, find('.fb-sheet'), 'the sheet takes focus');

            await focus('.inside');
            this.set('open', false);
            await settled();
            assert.strictEqual(document.activeElement, find('.opener'), 'focus goes back to the opener');
        });

        test('focus is not pulled back when it moved elsewhere, or when the opener is gone', async function (assert) {
            this.open = false;
            this.showOpener = true;
            await render(hbs`
                {{#if this.showOpener}}<button type="button" class="opener">open</button>{{/if}}
                <button type="button" class="elsewhere">elsewhere</button>
                {{#if this.open}}<Sheet @title="A" />{{/if}}
            `);

            await focus('.opener');
            this.set('open', true);
            await settled();
            await focus('.elsewhere');
            this.set('open', false);
            await settled();
            assert.strictEqual(document.activeElement, find('.elsewhere'));

            await focus('.opener');
            this.set('open', true);
            await settled();
            this.set('showOpener', false);
            this.set('open', false);
            await settled();
            assert.dom('.opener').doesNotExist();
        });

        test('@autofocus={{false}} leaves focus where it is', async function (assert) {
            this.open = false;
            await render(hbs`
                <button type="button" class="opener">open</button>
                {{#if this.open}}<Sheet @title="A" @autofocus={{false}} />{{/if}}
            `);

            await focus('.opener');
            this.set('open', true);
            await settled();
            assert.strictEqual(document.activeElement, find('.opener'));
            this.set('open', false);
            await settled();
            assert.strictEqual(document.activeElement, find('.opener'));
        });

        test('Tab and Shift+Tab cycle inside the top sheet', async function (assert) {
            await render(hbs`
                <Sheet @title="A" @onClose={{this.onClose}}>
                    <button type="button" class="first-body">first</button>
                    <button type="button" class="hidden-button" hidden>hidden</button>
                    <div inert><button type="button" class="inert-button">inert</button></div>
                    <input class="last" />
                </Sheet>
            `);

            await focus('.last');
            await triggerKeyEvent('.last', 'keydown', 'Tab');
            assert.strictEqual(document.activeElement, find('.fb-sheet-close'), 'Tab on the last control wraps to the first');

            await triggerKeyEvent('.fb-sheet-close', 'keydown', 'Tab', { shiftKey: true });
            assert.strictEqual(document.activeElement, find('.last'), 'Shift+Tab on the first wraps to the last, skipping hidden and inert ones');

            await focus('.fb-sheet');
            await triggerKeyEvent('.fb-sheet', 'keydown', 'Tab', { shiftKey: true });
            assert.strictEqual(document.activeElement, find('.last'), 'Shift+Tab from the sheet itself goes to the last control');

            await focus('.first-body');
            await triggerKeyEvent('.first-body', 'keydown', 'Tab');
            await triggerKeyEvent('.first-body', 'keydown', 'Tab', { shiftKey: true });
            await triggerKeyEvent('.first-body', 'keydown', 'Enter');
            assert.strictEqual(document.activeElement, find('.first-body'), 'Tab in the middle is left to the browser');
        });

        test('Tab in a sheet with nothing focusable keeps focus on the sheet', async function (assert) {
            await render(hbs`<Sheet @title="A" />`);

            await focus('.fb-sheet');
            await triggerKeyEvent('.fb-sheet', 'keydown', 'Tab');
            assert.strictEqual(document.activeElement, find('.fb-sheet'));
        });

        test('a sheet behind the top one does not trap Tab', async function (assert) {
            await render(hbs`
                <Sheet @title="Back" @stackIndex={{0}} @stackSize={{2}} @onActivate={{this.onActivate}} class="back" />
                <Sheet @title="Front" @stackIndex={{1}} @stackSize={{2}} />
            `);

            await focus('.back .fb-sheet-spine');
            await triggerKeyEvent('.back .fb-sheet-spine', 'keydown', 'Tab');
            assert.strictEqual(document.activeElement, find('.back .fb-sheet-spine'));
        });
    });

    module('resizing', function () {
        test('dragging the handle of a right-hand sheet widens it to the left, within its limits', async function (assert) {
            await render(hbs`<Sheet @title="A" @resizable={{true}} @onResize={{this.onResize}} />`);

            assert
                .dom('.fb-sheet-resize')
                .hasAttribute('role', 'separator')
                .hasAttribute('aria-valuenow', String(SHEET_WIDTHS.md))
                .hasAttribute('aria-valuemin', '320')
                .hasAttribute('aria-valuemax', '960');

            await triggerEvent('.fb-sheet-resize', 'pointerdown', { clientX: 500, button: 0 });
            await triggerEvent(window, 'pointermove', { clientX: 400 });
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), `${SHEET_WIDTHS.md + 100}px`);
            assert.dom('.fb-sheet-resize').hasAttribute('aria-valuenow', String(SHEET_WIDTHS.md + 100));

            await triggerEvent(window, 'pointermove', { clientX: -2000 });
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), '960px', 'clamped to the maximum');

            await triggerEvent(window, 'pointermove', { clientX: 5000 });
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), '320px', 'clamped to the minimum');

            await triggerEvent(window, 'pointermove', { clientX: 5001 });
            await triggerEvent(window, 'pointerup');
            await triggerEvent(window, 'pointermove', { clientX: 400 });
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), '320px', 'moves after pointerup are ignored');
            assert.deepEqual(
                this.calls,
                [
                    ['resize', 540],
                    ['resize', 960],
                    ['resize', 320],
                ],
                'onResize fires only on a change'
            );
        });

        test('a left-hand sheet widens to the right, and its limits can be set', async function (assert) {
            await render(hbs`<Sheet @title="A" @side="left" @width="sm" @resizable={{true}} @minWidth={{300}} @maxWidth={{400}} />`);

            await triggerEvent('.fb-sheet-resize', 'pointerdown', { clientX: 100 });
            await triggerEvent(window, 'pointermove', { clientX: 130 });
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), `${SHEET_WIDTHS.sm + 30}px`);
            await triggerEvent(window, 'pointermove', { clientX: 900 });
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), '400px');
            await triggerEvent(window, 'pointercancel');
        });

        test('only the main button starts a drag, and a drag ends when the sheet goes', async function (assert) {
            this.open = true;
            await render(hbs`{{#if this.open}}<Sheet @title="A" @resizable={{true}} />{{/if}}`);

            await triggerEvent('.fb-sheet-resize', 'pointerdown', { clientX: 500, button: 2 });
            await triggerEvent(window, 'pointermove', { clientX: 400 });
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), `${SHEET_WIDTHS.md}px`);

            await triggerEvent('.fb-sheet-resize', 'pointerdown', { clientX: 500, button: 0 });
            this.set('open', false);
            await settled();
            await triggerEvent(window, 'pointermove', { clientX: 400 });
            assert.dom('.fb-sheet').doesNotExist();
        });

        test('the handle resizes with the keyboard', async function (assert) {
            await render(hbs`<Sheet @title="A" @resizable={{true}} />`);

            await triggerKeyEvent('.fb-sheet-resize', 'keydown', 'ArrowLeft');
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), `${SHEET_WIDTHS.md + RESIZE_STEP}px`);
            await triggerKeyEvent('.fb-sheet-resize', 'keydown', 'ArrowRight');
            await triggerKeyEvent('.fb-sheet-resize', 'keydown', 'ArrowRight');
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), `${SHEET_WIDTHS.md - RESIZE_STEP}px`);
            await triggerKeyEvent('.fb-sheet-resize', 'keydown', 'End');
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), '960px');
            await triggerKeyEvent('.fb-sheet-resize', 'keydown', 'Home');
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), '320px');
            await triggerKeyEvent('.fb-sheet-resize', 'keydown', 'Enter');
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), '320px');
        });

        test('on the left the arrows are mirrored, and a width in other units resizes from its rendered size', async function (assert) {
            await render(hbs`<Sheet @title="A" @side="left" @width="30em" @resizable={{true}} />`);

            assert.dom('.fb-sheet-resize').hasAttribute('aria-valuenow', '320', 'an unmeasured width reports the minimum');
            const rendered = find('.fb-sheet').offsetWidth;

            await triggerKeyEvent('.fb-sheet-resize', 'keydown', 'ArrowRight');
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), `${Math.min(rendered + RESIZE_STEP, 960)}px`);
            await triggerKeyEvent('.fb-sheet-resize', 'keydown', 'ArrowLeft');
            assert.strictEqual(cssVar('.fb-sheet', '--fb-sheet-width'), `${Math.min(rendered + RESIZE_STEP, 960) - RESIZE_STEP}px`);
        });
    });
});
