import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const DIALOG = '.flb--modal';
const BACKDROP = '.flb--modal-backdrop';

function dialog() {
    return find(DIALOG);
}

function buttonWithText(text) {
    return findAll('button').find((button) => button.textContent.trim().toLowerCase().includes(text.toLowerCase()));
}

module('Integration | Component | modal', function (hooks) {
    setupRenderingTest(hooks);

    hooks.afterEach(function () {
        // The modal toggles a class on <body>; make sure a failure cannot leak it.
        document.body.classList.remove('flb--modal-open');
    });

    module('rendering', function () {
        test('an open modal renders a dialog and a backdrop', async function (assert) {
            await render(hbs`<Modal @renderInPlace={{true}} @fade={{false}}>body content</Modal>`);

            assert.ok(dialog(), 'the dialog renders');
            assert.dom(DIALOG).containsText('body content');
            assert.ok(find(BACKDROP), 'a backdrop renders behind it');
        });

        test('a closed modal renders nothing', async function (assert) {
            await render(hbs`<Modal @open={{false}} @renderInPlace={{true}}>body content</Modal>`);

            assert.strictEqual(dialog(), null, 'no dialog is mounted');
            assert.strictEqual(find(BACKDROP), null, 'and no backdrop');
        });

        test('the backdrop can be switched off', async function (assert) {
            await render(hbs`<Modal @renderInPlace={{true}} @fade={{false}} @backdrop={{false}}>body</Modal>`);

            assert.ok(dialog(), 'the dialog still renders');
            assert.strictEqual(find(BACKDROP), null, 'without a backdrop');
        });

        // `addBodyClass` only marks <body> when the modalsManager reports exactly one open
        // modal, so a bare <Modal> render never sets it.
        test('a bare modal does not mark the document', async function (assert) {
            await render(hbs`<Modal @renderInPlace={{true}} @fade={{false}}>body</Modal>`);

            assert.false(document.body.classList.contains('flb--modal-open'), 'the scroll lock is driven by the modals manager, not the component alone');
        });

        test('the dialog takes splattributes', async function (assert) {
            await render(hbs`<Modal @renderInPlace={{true}} @fade={{false}} data-test-modal="yes">body</Modal>`);

            assert.dom('[data-test-modal="yes"]').exists();
        });

        test('a modal can be sized and centred', async function (assert) {
            await render(hbs`<Modal @renderInPlace={{true}} @fade={{false}} @size="lg" @position="center">body</Modal>`);

            assert.ok(dialog(), 'the sized dialog renders');
            assert.ok(find('.flb--modal-dialog'), 'a dialog wrapper is present');
        });
    });

    module('the yielded contextual components', function (hooks) {
        const TEMPLATE = hbs`
            <Modal @renderInPlace={{true}} @fade={{false}} @onClose={{this.onClose}} @onHide={{this.onHide}} @onSubmit={{this.onSubmit}} as |modal|>
                <modal.header>Confirm</modal.header>
                <modal.body>
                    <form class="modal-form" {{on "submit" this.onFormSubmit}}>
                        <input type="text" name="reason" />
                    </form>
                </modal.body>
                <modal.footer @submitTitle="Save" />
            </Modal>
        `;

        hooks.beforeEach(function () {
            this.set('onFormSubmit', (event) => event.preventDefault());
        });

        test('it yields a header, body and footer', async function (assert) {
            await render(TEMPLATE);

            assert.dom(DIALOG).containsText('Confirm', 'the header renders');
            assert.ok(find('.modal-form'), 'the body renders its block');
            assert.ok(buttonWithText('Ok'), 'the footer renders a close control');
            assert.ok(buttonWithText('Save'), 'and a submit control');
        });

        test('closing reports through both onHide and onClose', async function (assert) {
            const events = [];
            this.set('onHide', () => events.push('hide'));
            this.set('onClose', () => events.push('close'));

            await render(TEMPLATE);
            await click(findAll(`${DIALOG} button`)[0]);

            assert.deepEqual(events, ['hide', 'close'], 'both callbacks fire, hide first');
        });

        test('closing tears the dialog down', async function (assert) {
            await render(hbs`<Modal @renderInPlace={{true}} @fade={{false}} as |modal|><modal.header>Confirm</modal.header></Modal>`);

            assert.ok(dialog(), 'the dialog is open');

            await click(findAll(`${DIALOG} button`)[0]);

            assert.strictEqual(dialog(), null, 'the dialog is removed');
        });

        test('submitting reports through onSubmit and dispatches submit to body forms', async function (assert) {
            const submits = [];
            this.set('onSubmit', () => submits.push('submit'));
            this.set('onFormSubmit', (event) => {
                event.preventDefault();
                submits.push('form');
            });

            await render(TEMPLATE);

            await click(buttonWithText('Save'));

            assert.deepEqual(submits, ['submit', 'form'], 'the callback runs, then every body form is submitted');
        });

        test('it closes and submits happily without handlers', async function (assert) {
            await render(hbs`
                <Modal @renderInPlace={{true}} @fade={{false}} as |modal|>
                    <modal.body>no handlers</modal.body>
                    <modal.footer @submitTitle="Save" />
                </Modal>
            `);

            await click(buttonWithText('Save'));

            assert.ok(dialog(), 'submitting without an onSubmit handler leaves the dialog intact');
        });
    });

    module('the document scroll lock', function () {
        // `addBodyClass`/`removeBodyClass` both consult the modals manager rather than the
        // component, so the class only appears when the manager reports exactly one open modal.
        test('the body is marked while the manager reports a single modal', async function (assert) {
            const modalsManager = this.owner.lookup('service:modals-manager');
            modalsManager.modals = [{ id: 'test-modal' }];
            this.set('open', true);

            try {
                await render(hbs`<Modal @open={{this.open}} @renderInPlace={{true}} @fade={{false}}>body</Modal>`);
                assert.true(document.body.classList.contains('flb--modal-open'), 'opening locks the document');

                this.set('open', false);
                await settled();

                assert.true(document.body.classList.contains('flb--modal-open'), 'and the lock survives, because the manager still reports an open modal');
            } finally {
                modalsManager.modals = [];
            }
        });

        // `checkScrollbar` compares the body's client width against the window's, so a narrowed
        // body reads as "overflowing" and the modal compensates with padding.
        test('an overflowing body is padded while the modal is open and restored after', async function (assert) {
            this.set('open', true);

            try {
                document.body.style.width = '100px';

                await render(hbs`<Modal @open={{this.open}} @renderInPlace={{true}} @fade={{false}}>body</Modal>`);
                assert.strictEqual(document.body.style.paddingRight, '0px', 'the measured scrollbar width is written onto the body');

                this.set('open', false);
                await settled();

                assert.strictEqual(document.body.style.paddingRight, '', 'closing restores the original padding');
            } finally {
                document.body.style.width = '';
                document.body.style.paddingRight = '';
            }
        });
    });

    module('reacting to the open argument', function () {
        test('opening reports through onOpen', async function (assert) {
            const opens = [];
            this.set('open', false);
            this.set('onOpen', () => opens.push('open'));

            await render(hbs`<Modal @open={{this.open}} @renderInPlace={{true}} @fade={{false}} @onOpen={{this.onOpen}}>body</Modal>`);
            assert.deepEqual(opens, [], 'a modal that starts closed does not report an open');

            this.set('open', true);
            await settled();

            assert.deepEqual(opens, ['open'], 'opening reports once');
        });

        // `hideBackdrop` returns before it ever looks for a backdrop element; without that
        // guard closing a backdrop-less modal would assert on the missing element.
        test('a backdrop-less modal closes cleanly', async function (assert) {
            this.set('open', true);

            await render(hbs`<Modal @open={{this.open}} @renderInPlace={{true}} @fade={{false}} @backdrop={{false}}>body</Modal>`);
            assert.ok(dialog(), 'it opens without a backdrop');

            this.set('open', false);
            await settled();

            assert.strictEqual(dialog(), null, 'and closes without one');
        });

        test('it mounts and unmounts as @open changes', async function (assert) {
            this.set('open', false);

            await render(hbs`<Modal @open={{this.open}} @renderInPlace={{true}} @fade={{false}}>body</Modal>`);
            assert.strictEqual(dialog(), null, 'closed to begin with');

            this.set('open', true);
            await settled();
            assert.ok(dialog(), 'opening mounts the dialog');

            this.set('open', false);
            await settled();
            assert.strictEqual(dialog(), null, 'closing removes it again');
        });
    });
    // The decorator reads `this.args[prop]`, so it had been pointed at the `_fade` getter and
    // `this.args._fade` was always undefined — @fade={{false}} never disabled anything.
    test('@fade={{false}} renders without the fade class', async function (assert) {
        await render(hbs`<Modal @open={{true}} @fade={{false}} />`);

        assert.dom('.flb--modal-backdrop').doesNotHaveClass('fade', 'the backdrop is not faded in');
        assert.dom('.flb--modal-backdrop').hasClass('show', 'and is shown straight away');
    });

    test('the backdrop fades by default', async function (assert) {
        await render(hbs`<Modal @open={{true}} />`);

        assert.dom('.flb--modal-backdrop').hasClass('fade');
    });
});
