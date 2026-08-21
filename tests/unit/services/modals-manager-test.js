import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import Service from '@ember/service';
import { settled } from '@ember/test-helpers';

module('Unit | Service | modals-manager', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.manager = this.owner.lookup('service:modals-manager');
    });

    function open(manager, options = {}) {
        manager.show('modal/layouts/alert', options);

        return manager.getTopModal();
    }

    module('stack basics', function () {
        test('it starts empty', function (assert) {
            assert.deepEqual(this.manager.modals, []);
            assert.false(this.manager.modalIsOpened);
            assert.strictEqual(this.manager.getTopModal(), null);
            assert.strictEqual(this.manager.componentToRender, null);
            assert.deepEqual(this.manager.options, {});
            assert.strictEqual(this.manager.modalDefer, null);
        });

        test('show pushes a modal and reports it as opened', function (assert) {
            this.manager.show('my-component', { title: 'Hello' });

            assert.true(this.manager.modalIsOpened);
            assert.strictEqual(this.manager.modals.length, 1);
            assert.strictEqual(this.manager.componentToRender, 'my-component');
            assert.strictEqual(this.manager.options.title, 'Hello');
            assert.ok(this.manager.modalDefer, 'a deferred is attached');
        });

        test('show returns a promise that resolves when the modal is done', async function (assert) {
            const promise = this.manager.show('my-component');
            const modal = this.manager.getTopModal();

            await this.manager.done(modal.id);
            const resolved = await promise;

            assert.strictEqual(resolved, this.manager, 'the promise resolves with the service');
        });

        test('options merge over the defaults', function (assert) {
            this.manager.show('c', { title: 'Custom', size: 'lg' });

            assert.strictEqual(this.manager.options.title, 'Custom', 'the caller wins');
            assert.strictEqual(this.manager.options.size, 'lg');
            assert.true(this.manager.options.backdrop, 'untouched defaults are preserved');
            assert.strictEqual(this.manager.options.confirmButtonDefaultText, 'Yes');
        });

        test('modals stack and the top modal is the most recent', function (assert) {
            this.manager.show('first');
            this.manager.show('second');

            assert.strictEqual(this.manager.modals.length, 2);
            assert.strictEqual(this.manager.componentToRender, 'second');
        });

        test('each stacked modal gets a higher z-index', function (assert) {
            this.manager.show('first');
            this.manager.show('second');
            this.manager.show('third');

            const [a, b, c] = this.manager.modals;
            assert.strictEqual(a.options._zIndex, 1060);
            assert.strictEqual(b.options._zIndex, 1070);
            assert.strictEqual(c.options._zIndex, 1080);
        });

        test('getModalZIndex reflects stack position', function (assert) {
            this.manager.show('first');
            this.manager.show('second');
            const [a, b] = this.manager.modals;

            assert.strictEqual(this.manager.getModalZIndex(a.id), 1060);
            assert.strictEqual(this.manager.getModalZIndex(b.id), 1070);
            assert.strictEqual(this.manager.getModalZIndex('nope'), 1060, 'an unknown id falls back to the base z-index');
        });

        test('modals get distinct ids and a creation timestamp', function (assert) {
            this.manager.show('a');
            this.manager.show('b');
            const [a, b] = this.manager.modals;

            assert.notStrictEqual(a.id, b.id);
            assert.true(a.createdAt instanceof Date);
            assert.true(a.isOpen);
        });

        test('getModalById finds a modal or returns null', function (assert) {
            const modal = open(this.manager);

            assert.strictEqual(this.manager.getModalById(modal.id), modal);
            assert.strictEqual(this.manager.getModalById('missing'), null);
        });
    });

    module('convenience dialogs', function () {
        test('confirm renders the confirm layout with its modal class', function (assert) {
            this.manager.confirm({ title: 'Sure?' });

            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/confirm');
            assert.strictEqual(this.manager.options.modalClass, 'flb--confirm-modal modal-sm');
            assert.true(this.manager.options.hideTitle);
        });

        test('confirm appends a caller-supplied modal class', function (assert) {
            this.manager.confirm({ modalClass: 'extra' });

            assert.strictEqual(this.manager.options.modalClass, 'flb--confirm-modal extra');
        });

        test('confirm works with no options', function (assert) {
            this.manager.confirm();

            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/confirm');
        });

        test('alert hides the accept button and relabels decline', function (assert) {
            this.manager.alert({ title: 'Heads up' });

            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/alert');
            assert.true(this.manager.options.hideAcceptButton);
            assert.strictEqual(this.manager.options.declineButtonText, 'OK');
            assert.strictEqual(this.manager.options.modalClass, 'flb--alert-modal modal-sm');
        });

        test('alert appends a caller-supplied modal class', function (assert) {
            this.manager.alert({ modalClass: 'extra' });

            assert.strictEqual(this.manager.options.modalClass, 'flb--alert-modal extra');
        });

        test('prompt and bulk render their layouts', function (assert) {
            this.manager.prompt({ title: 'Name?' });
            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/prompt');

            this.manager.bulk({ title: 'Bulk' });
            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/bulk-action');
        });

        test('progress requires an array of promises', function (assert) {
            this.manager.progress({ promises: [Promise.resolve()] });
            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/progress');

            assert.throws(() => this.manager.progress({}), /`options.promises` must be an array/);
            assert.throws(() => this.manager.progress({ promises: 'nope' }), /`options.promises` must be an array/);
        });

        test('process requires a process option', function (assert) {
            this.manager.process({ process: () => {} });
            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/process');

            assert.throws(() => this.manager.process({}), /`options.process` must be defined/);
        });

        test('displayLoader closes any open modal then shows the loader', async function (assert) {
            this.manager.show('something-else');

            await this.manager.displayLoader();

            assert.strictEqual(this.manager.modals.length, 1, 'the previous modal was closed first');
            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/loading');
            assert.strictEqual(this.manager.options.title, 'Loading...');
        });

        test('displayLoader accepts a custom title', async function (assert) {
            await this.manager.displayLoader({ title: 'Crunching' });

            assert.strictEqual(this.manager.options.title, 'Crunching');
        });

        test('loader is an alias for displayLoader', async function (assert) {
            await this.manager.loader({ title: 'Via alias' });

            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/loading');
            assert.strictEqual(this.manager.options.title, 'Via alias');
        });
    });

    module('userSelectOption', function () {
        test('confirming resolves with the selected value', async function (assert) {
            const promise = this.manager.userSelectOption('Pick', ['a', 'b']);
            await settled();

            const modal = this.manager.getTopModal();
            assert.strictEqual(modal.options.title, 'Pick');
            assert.deepEqual(modal.options.promptOptions, ['a', 'b']);

            modal.options.selectOption({ target: { value: 'b' } });
            modal.options.confirm();

            assert.strictEqual(await promise, 'b');
            assert.strictEqual(this.manager.modals.length, 0, 'the modal is closed');
        });

        test('declining resolves with null', async function (assert) {
            const promise = this.manager.userSelectOption('Pick', ['a']);
            await settled();

            this.manager.getTopModal().options.decline();

            assert.strictEqual(await promise, null);
            assert.strictEqual(this.manager.modals.length, 0);
        });

        test('confirming without choosing resolves with the initial null selection', async function (assert) {
            const promise = this.manager.userSelectOption('Pick', ['a']);
            await settled();

            this.manager.getTopModal().options.confirm();

            assert.strictEqual(await promise, null);
        });

        test('extra modal options are merged in', async function (assert) {
            this.manager.userSelectOption('Pick', ['a'], { modalClass: 'custom' });
            await settled();

            assert.strictEqual(this.manager.getTopModal().options.modalClass, 'custom');
        });
    });

    module('confirm and decline handlers', function () {
        test('onClickConfirmWithDone closes the modal when there is no confirm handler', async function (assert) {
            const modal = open(this.manager);

            await this.manager.onClickConfirmWithDone(modal.id);

            assert.strictEqual(this.manager.modals.length, 0);
        });

        test('onClickConfirmWithDone is a no-op for an unknown modal id', function (assert) {
            open(this.manager);

            assert.strictEqual(this.manager.onClickConfirmWithDone('nope'), undefined);
            assert.strictEqual(this.manager.modals.length, 1, 'nothing is closed');
        });

        test('a synchronous confirm handler runs and leaves closing to it', function (assert) {
            const calls = [];
            const modal = open(this.manager, { confirm: (manager, done) => calls.push([manager, done]) });

            this.manager.onClickConfirmWithDone(modal.id);

            assert.strictEqual(calls.length, 1);
            assert.strictEqual(calls[0][0], this.manager, 'the handler receives the service');
            assert.strictEqual(typeof calls[0][1], 'function', 'and a done callback');
            assert.strictEqual(this.manager.modals.length, 1, 'a sync handler must close the modal itself');
        });

        test('the done callback handed to a confirm handler closes the modal', async function (assert) {
            let doneFn;
            const modal = open(this.manager, { confirm: (manager, done) => (doneFn = done) });

            this.manager.onClickConfirmWithDone(modal.id);
            await doneFn();

            assert.strictEqual(this.manager.modals.length, 0);
        });

        test('a promise-returning confirm handler closes the modal when it settles', async function (assert) {
            const modal = open(this.manager, { confirm: () => Promise.resolve('ok') });

            await this.manager.onClickConfirmWithDone(modal.id);

            assert.strictEqual(this.manager.modals.length, 0);
        });

        test('a rejected confirm promise still closes the modal', async function (assert) {
            const modal = open(this.manager, { confirm: () => Promise.reject(new Error('nope')) });

            try {
                await this.manager.onClickConfirmWithDone(modal.id);
            } catch {
                // the rejection propagates through finally; the modal must still close
            }
            await settled();

            assert.strictEqual(this.manager.modals.length, 0, 'finally() closes regardless of outcome');
        });

        test('keepOpen prevents the modal closing after confirm', async function (assert) {
            const modal = open(this.manager, { keepOpen: true, confirm: () => Promise.resolve() });

            await this.manager.onClickConfirmWithDone(modal.id);
            await settled();

            assert.strictEqual(this.manager.modals.length, 1, 'the dialog is held open deliberately');
        });

        test('onClickDeclineWithDone closes when there is no decline handler', async function (assert) {
            const modal = open(this.manager);

            await this.manager.onClickDeclineWithDone(modal.id);

            assert.strictEqual(this.manager.modals.length, 0);
        });

        test('onClickDeclineWithDone is a no-op for an unknown modal id', function (assert) {
            open(this.manager);

            assert.strictEqual(this.manager.onClickDeclineWithDone('nope'), undefined);
            assert.strictEqual(this.manager.modals.length, 1);
        });

        test('a synchronous decline handler runs and leaves closing to it', function (assert) {
            let called = 0;
            const modal = open(this.manager, { decline: () => called++ });

            this.manager.onClickDeclineWithDone(modal.id);

            assert.strictEqual(called, 1);
            assert.strictEqual(this.manager.modals.length, 1);
        });

        test('a promise-returning decline handler closes the modal when it settles', async function (assert) {
            const modal = open(this.manager, { decline: () => Promise.resolve() });

            await this.manager.onClickDeclineWithDone(modal.id);

            assert.strictEqual(this.manager.modals.length, 0);
        });

        test('keepOpen prevents the modal closing after decline', async function (assert) {
            const modal = open(this.manager, { keepOpen: true, decline: () => Promise.resolve() });

            await this.manager.onClickDeclineWithDone(modal.id);
            await settled();

            assert.strictEqual(this.manager.modals.length, 1);
        });
    });

    module('done and closing', function () {
        test('done closes the top modal when no id is given', async function (assert) {
            this.manager.show('first');
            this.manager.show('second');

            await this.manager.done();

            assert.strictEqual(this.manager.modals.length, 1);
            assert.strictEqual(this.manager.componentToRender, 'first', 'the top modal was the one closed');
        });

        test('done closes a specific modal from the middle of the stack', async function (assert) {
            this.manager.show('first');
            this.manager.show('second');
            const [first] = this.manager.modals;

            await this.manager.done(first.id);

            assert.strictEqual(this.manager.modals.length, 1);
            assert.strictEqual(this.manager.componentToRender, 'second');
        });

        test('done resolves true when there is nothing to close', async function (assert) {
            assert.true(await this.manager.done());
            assert.true(await this.manager.done('missing'));
        });

        test('done invokes the named action callback with the options', async function (assert) {
            const calls = [];
            const modal = open(this.manager, { onConfirm: (options) => calls.push(options) });

            await this.manager.done(modal.id, 'onConfirm');

            assert.strictEqual(calls.length, 1);
            assert.strictEqual(calls[0], modal.options, 'the callback receives the modal options');
            assert.true(calls[0].backdrop, 'the options include the merged defaults');
        });

        test('done invokes onFinish regardless of the action', async function (assert) {
            let finished = 0;
            const modal = open(this.manager, { onFinish: () => finished++ });

            await this.manager.done(modal.id);

            assert.strictEqual(finished, 1);
        });

        test('done runs both the action callback and onFinish', async function (assert) {
            const order = [];
            const modal = open(this.manager, {
                onDecline: () => order.push('action'),
                onFinish: () => order.push('finish'),
            });

            await this.manager.done(modal.id, 'onDecline');

            assert.deepEqual(order, ['action', 'finish']);
        });

        test('closeAll empties the stack', async function (assert) {
            this.manager.show('a');
            this.manager.show('b');
            this.manager.show('c');

            this.manager.closeAll();
            await settled();

            assert.strictEqual(this.manager.modals.length, 0);
        });

        test('closeTop closes only the top modal', async function (assert) {
            this.manager.show('a');
            this.manager.show('b');

            this.manager.closeTop();
            await settled();

            assert.strictEqual(this.manager.modals.length, 1);
            assert.strictEqual(this.manager.componentToRender, 'a');
        });

        test('closeTop is a no-op on an empty stack', async function (assert) {
            this.manager.closeTop();
            await settled();

            assert.strictEqual(this.manager.modals.length, 0);
        });
    });

    module('option access', function () {
        test('getOption reads from the top modal', function (assert) {
            open(this.manager, { title: 'Top' });

            assert.strictEqual(this.manager.getOption('title'), 'Top');
        });

        test('getOption returns the default for a missing key', function (assert) {
            open(this.manager);

            assert.strictEqual(this.manager.getOption('nope', 'fallback'), 'fallback');
            assert.strictEqual(this.manager.getOption('nope'), null, 'the default default is null');
        });

        test('getOption returns the default when there is no modal', function (assert) {
            assert.strictEqual(this.manager.getOption('title', 'fallback'), 'fallback');
        });

        test('getOption with an array key delegates to getOptions', function (assert) {
            open(this.manager, { title: 'T', size: 'lg' });

            assert.deepEqual(this.manager.getOption(['title', 'size']), { title: 'T', size: 'lg' });
        });

        test('getOptionForModal targets a specific modal', function (assert) {
            const first = open(this.manager, { title: 'First' });
            open(this.manager, { title: 'Second' });

            assert.strictEqual(this.manager.getOptionForModal(first.id, 'title'), 'First');
            assert.strictEqual(this.manager.getOption('title'), 'Second', 'the top modal is unaffected');
        });

        test('getOptions returns the whole options hash when given no keys', function (assert) {
            const modal = open(this.manager, { title: 'T' });

            assert.strictEqual(this.manager.getOptions([]), modal.options);
        });

        test('getOptions returns an empty object when there is no modal', function (assert) {
            assert.deepEqual(this.manager.getOptions(['title']), {});
        });

        test('setOption updates the top modal', function (assert) {
            open(this.manager, { title: 'Before' });

            this.manager.setOption('title', 'After');

            assert.strictEqual(this.manager.getOption('title'), 'After');
        });

        test('setOption is a no-op when there is no modal', function (assert) {
            this.manager.setOption('title', 'x');

            assert.strictEqual(this.manager.modals.length, 0, 'nothing is created');
        });

        test('setOptionForModal targets a specific modal', function (assert) {
            const first = open(this.manager, { title: 'First' });
            open(this.manager, { title: 'Second' });

            this.manager.setOptionForModal(first.id, 'title', 'Changed');

            assert.strictEqual(this.manager.getOptionForModal(first.id, 'title'), 'Changed');
            assert.strictEqual(this.manager.getOption('title'), 'Second');
        });

        test('setOptions updates several keys at once', function (assert) {
            open(this.manager, { title: 'T' });

            this.manager.setOptions({ title: 'New', size: 'sm' });

            assert.strictEqual(this.manager.getOption('title'), 'New');
            assert.strictEqual(this.manager.getOption('size'), 'sm');
        });

        test('setOptions is a no-op when there is no modal', function (assert) {
            this.manager.setOptions({ title: 'x' });

            assert.strictEqual(this.manager.modals.length, 0);
        });

        test('clearOptions empties the options of the target modal', function (assert) {
            const modal = open(this.manager, { title: 'T' });

            this.manager.clearOptions(modal.id);

            assert.deepEqual(modal.options, {});
        });

        test('clearOptions defaults to the top modal and is safe when empty', function (assert) {
            const modal = open(this.manager, { title: 'T' });
            this.manager.clearOptions();
            assert.deepEqual(modal.options, {});

            this.manager.modals = [];
            this.manager.clearOptions();
            assert.strictEqual(this.manager.modals.length, 0, 'no modal to clear is not an error');
        });
    });

    module('invoke and loading', function () {
        test('invoke calls a function stored in the options', function (assert) {
            open(this.manager, { doThing: (a, b) => a + b });

            assert.strictEqual(this.manager.invoke('doThing', null, 2, 3), 5);
        });

        test('invoke returns null when the option is not a function', function (assert) {
            open(this.manager, { notAFunction: 'x' });

            assert.strictEqual(this.manager.invoke('notAFunction'), null);
            assert.strictEqual(this.manager.invoke('missing'), null);
        });

        test('invoke returns null when there is no modal', function (assert) {
            assert.strictEqual(this.manager.invoke('anything'), null);
        });

        test('invoke can target a specific modal', function (assert) {
            const first = open(this.manager, { doThing: () => 'from first' });
            open(this.manager, { doThing: () => 'from second' });

            assert.strictEqual(this.manager.invoke('doThing', first.id), 'from first');
        });

        test('startLoading and stopLoading toggle the flag on the top modal', function (assert) {
            open(this.manager);

            this.manager.startLoading();
            assert.true(this.manager.getOption('isLoading'));

            this.manager.stopLoading();
            assert.false(this.manager.getOption('isLoading'));
        });

        test('the ForModal loading aliases target a specific modal', function (assert) {
            const first = open(this.manager);
            open(this.manager);

            this.manager.startLoadingForModal(first.id);
            assert.true(this.manager.getOptionForModal(first.id, 'isLoading'));
            assert.strictEqual(this.manager.getOption('isLoading'), null, 'the top modal is untouched');

            this.manager.stopLoadingForModal(first.id);
            assert.false(this.manager.getOptionForModal(first.id, 'isLoading'));
        });
    });

    module('keyboard', function () {
        test('Escape closes the top modal', async function (assert) {
            this.manager.show('a');

            this.manager.handleKeyboardEvent({ key: 'Escape' });
            await settled();

            assert.strictEqual(this.manager.modals.length, 0);
        });

        test('Escape is ignored when the modal opts out of keyboard handling', async function (assert) {
            open(this.manager, { keyboard: false });

            this.manager.handleKeyboardEvent({ key: 'Escape' });
            await settled();

            assert.strictEqual(this.manager.modals.length, 1);
        });

        test('other keys do nothing', async function (assert) {
            this.manager.show('a');

            this.manager.handleKeyboardEvent({ key: 'Enter' });
            await settled();

            assert.strictEqual(this.manager.modals.length, 1);
        });

        test('Escape on an empty stack is safe', async function (assert) {
            this.manager.handleKeyboardEvent({ key: 'Escape' });
            await settled();

            assert.strictEqual(this.manager.modals.length, 0);
        });
    });

    module('events integration', function (hooks) {
        let tracked;

        hooks.beforeEach(function () {
            tracked = [];
            this.owner.register(
                'service:events',
                class extends Service {
                    trackEvent(...args) {
                        tracked.push(args);
                    }
                }
            );
            this.manager = this.owner.lookup('service:modals-manager');
        });

        test('opening a modal is tracked', function (assert) {
            this.manager.show('my-component', { title: 'T' });

            assert.strictEqual(tracked.length, 1);
            assert.strictEqual(tracked[0][0], 'ui.modal.opened');
            assert.strictEqual(tracked[0][1], 'my-component');
        });

        test('closing a modal is tracked with the action', async function (assert) {
            const modal = open(this.manager);
            tracked.length = 0;

            await this.manager.done(modal.id, 'onConfirm');

            assert.strictEqual(tracked.length, 1);
            assert.strictEqual(tracked[0][0], 'ui.modal.closed');
            assert.strictEqual(tracked[0][2], 'onConfirm');
        });

        test('the service works when no events service is registered', function (assert) {
            this.owner.unregister('service:events');
            const manager = this.owner.lookup('service:modals-manager');

            manager.show('c');

            assert.strictEqual(manager.modals.length, 1, 'tracking is optional');
        });
    });
    // Every one of these takes a defaulted `options = {}`; a caller that passes nothing is the
    // only way those defaults run.
    module('the convenience dialogs with no options at all', function () {
        test('alert, prompt and bulk each render their own layout', function (assert) {
            this.manager.alert();
            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/alert');
            assert.strictEqual(this.manager.options.modalClass, 'flb--alert-modal modal-sm', 'the base class is applied');

            this.manager.prompt();
            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/prompt');

            this.manager.bulk();
            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/bulk-action');
        });

        test('progress and process still refuse to open', function (assert) {
            assert.throws(() => this.manager.progress(), /`options.promises` must be an array/);
            assert.throws(() => this.manager.process(), /`options.process` must be defined/);
        });

        test('loader opens the loading layout', async function (assert) {
            await this.manager.loader();

            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/loading');
        });
    });

    module('userSelectOption callbacks', function () {
        test('it offers the prompt with no options and resolves null when declined', async function (assert) {
            const selection = this.manager.userSelectOption('Pick a warehouse');
            await settled();

            assert.strictEqual(this.manager.componentToRender, 'modal/layouts/option-prompt');
            assert.strictEqual(this.manager.options.title, 'Pick a warehouse');
            assert.deepEqual(this.manager.options.promptOptions, [], 'an empty option list is the default');
            assert.strictEqual(this.manager.options.selected, null);

            this.manager.options.decline();

            assert.strictEqual(await selection, null, 'declining resolves with nothing selected');
        });

        test('choosing an option records it and confirming resolves it', async function (assert) {
            const selection = this.manager.userSelectOption('Pick a warehouse', ['north', 'south']);
            await settled();

            assert.deepEqual(this.manager.options.promptOptions, ['north', 'south']);

            this.manager.options.selectOption({ target: { value: 'south' } });
            assert.strictEqual(this.manager.options.selected, 'south', 'the choice is stored on the modal');

            this.manager.options.confirm();

            assert.strictEqual(await selection, 'south');
        });

        test('caller-supplied modal options override the defaults', async function (assert) {
            this.manager.userSelectOption('Pick a warehouse', ['north'], { title: 'Override', acceptButtonText: 'Go' });
            await settled();

            assert.strictEqual(this.manager.options.title, 'Override', 'the spread happens last');
            assert.strictEqual(this.manager.options.acceptButtonText, 'Go');
        });
    });

    module('reading and writing options by modal', function () {
        test('getOptions with no arguments returns every option of the top modal', function (assert) {
            open(this.manager, { title: 'Top', size: 'lg' });

            const options = this.manager.getOptions();

            assert.strictEqual(options.title, 'Top');
            assert.strictEqual(options.size, 'lg');
        });

        test('getOptions returns nothing when there is no modal at all', function (assert) {
            assert.deepEqual(this.manager.getOptions(), {}, 'with no arguments');
            assert.deepEqual(this.manager.getOptions(['title']), {}, 'and with props');
        });

        test('getOptions can be pointed at a modal that is no longer on top', function (assert) {
            const first = open(this.manager, { title: 'First' });
            open(this.manager, { title: 'Second' });

            assert.strictEqual(this.manager.getOptions(['title']).title, 'Second', 'the top modal by default');
            assert.strictEqual(this.manager.getOptions(['title'], first.id).title, 'First', 'and an explicit id wins');
            assert.deepEqual(this.manager.getOptions(['title'], 'no-such-modal'), {}, 'an unknown id answers empty');
        });

        test('setOptions writes to the top modal, or to the one named', function (assert) {
            const first = open(this.manager, { title: 'First' });
            const second = open(this.manager, { title: 'Second' });

            this.manager.setOptions({ title: 'Renamed' });
            assert.strictEqual(second.options.title, 'Renamed', 'the top modal is the default target');
            assert.strictEqual(first.options.title, 'First', 'and the one below is untouched');

            this.manager.setOptions({ title: 'Also renamed' }, first.id);
            assert.strictEqual(first.options.title, 'Also renamed');
        });

        test('setOptions with nothing to write is harmless', function (assert) {
            const modal = open(this.manager, { title: 'Top' });

            this.manager.setOptions();

            assert.strictEqual(modal.options.title, 'Top', 'the modal is left alone');

            this.manager.setOptions({ title: 'Ignored' }, 'no-such-modal');

            assert.strictEqual(modal.options.title, 'Top', 'and an unknown id writes nowhere');
        });
    });
});
