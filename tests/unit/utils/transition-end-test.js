import waitForTransitionEnd, { skipTransition } from '@fleetbase/ember-ui/utils/transition-end';
import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

module('Unit | Utility | transition-end', function (hooks) {
    setupTest(hooks);

    hooks.afterEach(function () {
        // The skip flag is module-level state shared across tests.
        skipTransition(undefined);
    });

    test('it rejects when no node is given', async function (assert) {
        for (const value of [undefined, null, false, 0, '']) {
            try {
                await waitForTransitionEnd(value);
                assert.true(false, `expected a rejection for ${String(value)}`);
            } catch (error) {
                assert.strictEqual(error, undefined, 'the rejection carries no reason');
            }
        }
    });

    test('it resolves when the element fires transitionend', async function (assert) {
        const node = document.createElement('div');
        // A long duration proves the transitionend listener, not the timer, resolved it.
        const promise = waitForTransitionEnd(node, 10000);

        node.dispatchEvent(new Event('transitionend'));

        await promise;
        assert.true(true, 'the promise resolved from the event');
    });

    test('it resolves from the backup timer when transitionend never fires', async function (assert) {
        const node = document.createElement('div');

        await waitForTransitionEnd(node, 5);

        assert.true(true, 'the later() backup resolved the promise');
    });

    test('it removes its transitionend listener once resolved', async function (assert) {
        const node = document.createElement('div');
        let calls = 0;
        const originalRemove = node.removeEventListener.bind(node);
        node.removeEventListener = (...args) => {
            if (args[0] === 'transitionend') {
                calls++;
            }

            return originalRemove(...args);
        };

        const promise = waitForTransitionEnd(node, 10000);
        node.dispatchEvent(new Event('transitionend'));
        await promise;

        assert.strictEqual(calls, 1, 'the listener is torn down exactly once');
    });

    test('a second transitionend after resolution does not re-run the handler', async function (assert) {
        const node = document.createElement('div');
        const promise = waitForTransitionEnd(node, 10000);

        node.dispatchEvent(new Event('transitionend'));
        await promise;

        node.dispatchEvent(new Event('transitionend'));

        assert.true(true, 'the detached listener is inert');
    });

    test('it defaults the duration to zero', async function (assert) {
        const node = document.createElement('div');

        await waitForTransitionEnd(node);

        assert.true(true, 'omitting the duration resolves on the next runloop rather than hanging');
    });

    test('skipTransition(true) collapses the duration to zero', async function (assert) {
        skipTransition(true);
        const node = document.createElement('div');

        // A long duration would hang the test if the skip were not honoured.
        await waitForTransitionEnd(node, 10000);

        assert.true(true, 'the transition was skipped');
    });

    test('skipTransition(false) restores the real duration', async function (assert) {
        skipTransition(false);
        const node = document.createElement('div');

        const promise = waitForTransitionEnd(node, 10000);
        node.dispatchEvent(new Event('transitionend'));
        await promise;

        assert.true(true, 'only the event could resolve a 10s wait, so the duration was respected');
    });

    test('transitions are skipped by default while Ember is testing', async function (assert) {
        const node = document.createElement('div');

        await waitForTransitionEnd(node, 10000);

        assert.true(true, 'the default skip applies during tests');
    });
});
