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

    test('a countdown given only minutes starts from a whole number of them', async function (assert) {
        await render(hbs`<Countdown @minutes={{2}} @display="minutes,seconds" />`);

        assert.dom('.countdown-container').exists('the unspecified units fall back to nought');
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

        // DEFECTS #8. restartCountdown() existed but nothing could reach it — not an @action, not
        // referenced by the template, never called from the class — so a countdown could only be
        // restarted by re-rendering the component. Both end callbacks now receive it as
        // `restartFn`.
        test('both end callbacks receive a restartFn', async function (assert) {
            const payloads = [];
            this.set('onCountdownEnd', (payload) => payloads.push(payload));
            this.set('onEnd', (payload) => payloads.push(payload));

            await render(hbs`<Countdown @seconds={{1}} @onCountdownEnd={{this.onCountdownEnd}} @onEnd={{this.onEnd}} />`);
            await step(3);

            assert.strictEqual(payloads.length, 2, 'both callbacks fired');
            assert.strictEqual(typeof payloads[0].restartFn, 'function', 'onCountdownEnd gets one');
            assert.strictEqual(typeof payloads[1].restartFn, 'function', 'and so does onEnd');
        });

        // The outer stub only captures the FIRST 1000ms interval, so a restart would fall through
        // to the real timer and leak into the rest of the run. Capture it locally instead, which
        // also gives the assertion something concrete: a restart schedules a fresh interval.
        async function captureRestart(restart) {
            const scheduled = [];
            const previousSetInterval = window.setInterval;

            window.setInterval = function (callback, delay, ...rest) {
                if (delay === 1000) {
                    scheduled.push(delay);
                    return 9999;
                }

                return previousSetInterval.call(window, callback, delay, ...rest);
            };

            try {
                restart();
                await settled();
            } finally {
                window.setInterval = previousSetInterval;
            }

            return scheduled;
        }

        test('calling restartFn starts the countdown over', async function (assert) {
            let restart;
            this.set('onEnd', ({ restartFn }) => {
                restart = restartFn;
            });

            await render(hbs`<Countdown @seconds={{1}} @onEnd={{this.onEnd}} />`);
            await step(3);

            assert.true(cleared.includes(4242), 'the first run cleared its interval');

            const scheduled = await captureRestart(restart);

            assert.deepEqual(scheduled, [1000], 'a fresh ticking interval is scheduled');
            assert.dom('.countdown-container').exists('and the component is still rendering');
        });

        // Restarting rebuilds the duration from the arguments; a countdown given only minutes has
        // to fall back to nought for the units it was not given.
        test('restarting a countdown with no seconds argument falls back to nought', async function (assert) {
            let restart;
            this.set('onEnd', ({ restartFn }) => {
                restart = restartFn;
            });

            this.set('seconds', 1);

            await render(hbs`<Countdown @seconds={{this.seconds}} @onEnd={{this.onEnd}} />`);
            await step(3);

            // The restart rebuilds the duration from whatever the arguments say NOW.
            this.set('seconds', undefined);
            await settled();

            const scheduled = await captureRestart(restart);

            assert.deepEqual(scheduled, [1000], 'a fresh interval is scheduled');
            assert.dom('.countdown-container').exists();
        });

        test('restartFn is bound, so it works detached from the component', async function (assert) {
            let restart;
            this.set('onEnd', (payload) => {
                restart = payload.restartFn;
            });

            await render(hbs`<Countdown @seconds={{1}} @onEnd={{this.onEnd}} />`);
            await step(3);

            // Called as a bare function, exactly as a consumer's `handleEnd({ restartFn })` would.
            const detached = restart;
            const scheduled = await captureRestart(detached);

            assert.deepEqual(scheduled, [1000], 'no `this` binding error — the restart really ran');
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
    // @display is normalised three ways: a comma string is split, an array is taken as-is, and
    // anything else is ignored. Only the comma-string path had a test.
    test('a plain display string is ignored rather than split', async function (assert) {
        await render(hbs`<Countdown @seconds={{30}} @display="seconds" />`);

        assert.dom('.countdown-container').exists('the countdown still renders');
    });

    test('an array display is used as given', async function (assert) {
        this.set('display', ['minutes', 'seconds']);

        await render(hbs`<Countdown @minutes={{2}} @display={{this.display}} />`);

        assert.dom('.countdown-container').exists();
    });
});
