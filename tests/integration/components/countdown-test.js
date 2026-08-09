import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, clearRender, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | countdown', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the countdown container with the normal state before any tick', async function (assert) {
        await render(hbs`<Countdown @seconds={{30}} />`);

        assert.dom('.countdown-container').exists();
        assert.dom('.countdown-container p').hasClass('remaining-normal');
    });

    test('it applies custom container and countdown classes', async function (assert) {
        await render(hbs`<Countdown @seconds={{30}} @countdownContainerClass="my-countdown-container" @countdownClass="my-countdown" />`);

        assert.dom('.countdown-container').hasClass('my-countdown-container');
        assert.dom('.countdown-container p').hasClass('my-countdown');
    });

    test('it accepts an expiry date and a display list without error', async function (assert) {
        this.set('expiry', new Date(Date.now() + 10 * 60 * 1000));

        await render(hbs`<Countdown @expiry={{this.expiry}} @display="minutes,seconds" />`);

        assert.dom('.countdown-container').exists();
        assert.dom('.countdown-container p').hasClass('remaining-normal');
    });

    test('it cleans up its interval when destroyed', async function (assert) {
        await render(hbs`<Countdown @seconds={{5}} />`);
        assert.dom('.countdown-container').exists();

        await clearRender();
        assert.dom('.countdown-container').doesNotExist('component tears down without error');
    });

    // -------------------------------------------------------------------------
    // Appended coverage: the ticking loop. The component drives itself with a
    // 1000ms setInterval, so the interval is captured and stepped manually rather
    // than waiting in real time.
    // -------------------------------------------------------------------------

    module('ticking down', function (hooks) {
        let tick;
        let originalSetInterval;
        let originalClearInterval;
        let cleared;

        hooks.beforeEach(function () {
            tick = null;
            cleared = [];
            originalSetInterval = window.setInterval;
            originalClearInterval = window.clearInterval;

            // Ember and QUnit both use timers, so only the component's own 1000ms interval is
            // intercepted — everything else passes straight through.
            window.setInterval = function (callback, delay, ...rest) {
                if (delay === 1000 && tick === null) {
                    tick = callback;
                    return 4242;
                }

                return originalSetInterval.call(window, callback, delay, ...rest);
            };
            window.clearInterval = function (id) {
                if (id === 4242) {
                    cleared.push(id);
                    return;
                }

                return originalClearInterval.call(window, id);
            };
        });

        hooks.afterEach(function () {
            window.setInterval = originalSetInterval;
            window.clearInterval = originalClearInterval;
        });

        // The interval id is only recorded, never really cancelled, so stepping has to respect
        // the component's own clearInterval or the callback would keep firing past zero.
        async function step(times = 1) {
            for (let i = 0; i < times; i++) {
                if (cleared.includes(4242)) {
                    return;
                }

                tick();
                await settled();
            }
        }

        function remaining() {
            return find('.countdown-container p').textContent.trim();
        }

        test('the first tick renders the remaining time', async function (assert) {
            await render(hbs`<Countdown @minutes={{1}} @seconds={{30}} />`);

            assert.ok(tick, 'the countdown starts a ticking interval');

            await step();

            assert.true(remaining().length > 0, 'a duration is rendered');
            assert.true(/minute|second/i.test(remaining()), remaining());
        });

        test('each tick decrements the seconds', async function (assert) {
            await render(hbs`<Countdown @seconds={{5}} />`);

            await step();
            const first = remaining();

            await step();
            const second = remaining();

            assert.notStrictEqual(first, second, 'the rendered time moves');
        });

        test('reaching zero stops the interval and reports the end', async function (assert) {
            const ended = [];
            this.set('onCountdownEnd', () => ended.push('countdown-end'));
            this.set('onEnd', () => ended.push('end'));

            await render(hbs`<Countdown @seconds={{1}} @onCountdownEnd={{this.onCountdownEnd}} @onEnd={{this.onEnd}} />`);

            await step(3);

            assert.deepEqual(ended, ['countdown-end', 'end'], 'both end callbacks fire, in order');
            assert.true(cleared.includes(4242), 'the interval is cleared');
        });

        test('it finishes happily without any end handlers', async function (assert) {
            await render(hbs`<Countdown @seconds={{1}} />`);

            await step(3);

            assert.true(cleared.includes(4242), 'the interval is still cleared');
        });

        test('a seconds-only countdown collapses the whole duration into seconds', async function (assert) {
            await render(hbs`<Countdown @minutes={{2}} @seconds={{5}} @onlyDisplaySeconds={{true}} />`);

            await step();

            assert.true(/second/i.test(remaining()), remaining());
            assert.false(/minute/i.test(remaining()), 'minutes are folded into the seconds total');
            assert.true(remaining().includes('125'), 'two minutes and five seconds is 125 seconds');
        });

        test('every duration unit contributes to the seconds total', async function (assert) {
            await render(hbs`<Countdown @days={{1}} @hours={{1}} @minutes={{1}} @seconds={{1}} @onlyDisplaySeconds={{true}} />`);

            await step();

            const expected = 24 * 60 * 60 + 60 * 60 + 60 + 1;
            assert.true(remaining().includes(String(expected)), `${expected} seconds, got ${remaining()}`);
        });
    });
});
