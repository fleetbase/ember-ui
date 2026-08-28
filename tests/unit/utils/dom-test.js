import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { settled } from '@ember/test-helpers';
import { setOwner } from '@ember/application';
import {
    findElementById,
    findElemementByIdInShadowDom,
    getDOM,
    getDestinationElement,
    unwrapChildren,
    afterRender,
    afterPaint,
    renderCompleted,
    waitForInsertedAndSized,
    createElement,
} from '@fleetbase/ember-ui/utils/dom';

// A minimal stand-in for a SimpleDOM document: it has no getElementById, so
// findElementById has to walk the tree by hand.
function documentWithoutGetElementById(rootChildren) {
    return { firstChild: rootChildren };
}

function fakeNode(id, { children = null, next = null, hasGetAttribute = true } = {}) {
    const node = { firstChild: children, nextSibling: next };

    if (hasGetAttribute) {
        node.getAttribute = (name) => (name === 'id' ? id : null);
    }

    return node;
}

module('Unit | Utility | dom', function (hooks) {
    // A rendering test is used throughout because several of these helpers
    // resolve their document through the owner and its root element.
    setupRenderingTest(hooks);

    // Build a plain object that Ember's getOwner() can resolve, so the
    // owner-dependent helpers can be exercised without a real component.
    function ownedContext(owner, properties = {}) {
        const context = { ...properties };
        setOwner(context, owner);

        return context;
    }

    module('findElementById', function () {
        test('it delegates to getElementById when the document supports it', function (assert) {
            const el = document.createElement('div');
            el.id = 'find-me';
            document.body.appendChild(el);

            try {
                assert.strictEqual(findElementById(document, 'find-me'), el);
            } finally {
                el.remove();
            }
        });

        test('it returns null from getElementById for a missing id', function (assert) {
            assert.strictEqual(findElementById(document, 'definitely-not-present'), null);
        });

        test('it walks the tree when the document has no getElementById', function (assert) {
            const target = fakeNode('wanted');
            const doc = documentWithoutGetElementById(fakeNode('outer', { children: target }));

            assert.strictEqual(findElementById(doc, 'wanted'), target, 'the nested node is found depth-first');
        });

        test('it skips nodes without getAttribute while walking', function (assert) {
            const target = fakeNode('wanted');
            const textish = fakeNode(null, { hasGetAttribute: false, next: target });
            const doc = documentWithoutGetElementById(textish);

            assert.strictEqual(findElementById(doc, 'wanted'), target, 'text nodes do not abort the walk');
        });

        test('it returns undefined when the walk exhausts the tree', function (assert) {
            const doc = documentWithoutGetElementById(fakeNode('a', { next: fakeNode('b') }));

            assert.strictEqual(findElementById(doc, 'missing'), undefined);
        });

        test('it returns undefined for a document with no children at all', function (assert) {
            assert.strictEqual(findElementById(documentWithoutGetElementById(null), 'anything'), undefined);
        });
    });

    module('getDOM', function () {
        test('it returns the document from a renderer that already exposes _dom', function (assert) {
            const stubDocument = { marker: 'from-renderer' };
            const context = { renderer: { _dom: { document: stubDocument } } };

            assert.strictEqual(getDOM(context), stubDocument);
        });

        test('it falls back to the -document service when the renderer has no _dom', function (assert) {
            const stubDocument = { marker: 'from-service' };
            this.owner.unregister('service:-document');
            this.owner.register('service:-document', stubDocument, { instantiate: false });

            assert.strictEqual(getDOM(ownedContext(this.owner, { renderer: undefined })), stubDocument);
        });

        test('it looks up renderer:-dom when there is no -document service', function (assert) {
            const stubDocument = { marker: 'from-renderer-lookup' };
            this.owner.unregister('service:-document');
            this.owner.unregister('renderer:-dom');
            this.owner.register('renderer:-dom', { _dom: { document: stubDocument } }, { instantiate: false });

            assert.strictEqual(getDOM(ownedContext(this.owner, { renderer: null })), stubDocument);
        });

        test('it throws when the looked-up renderer has no document either', function (assert) {
            this.owner.unregister('service:-document');
            this.owner.unregister('renderer:-dom');
            this.owner.register('renderer:-dom', { _dom: {} }, { instantiate: false });

            assert.throws(() => getDOM(ownedContext(this.owner, { renderer: null })), /Could not get DOM/);
        });

        test('it prefers the context renderer over any owner lookup', function (assert) {
            const stubDocument = { marker: 'from-renderer' };
            this.owner.unregister('service:-document');
            this.owner.register('service:-document', { marker: 'from-service' }, { instantiate: false });

            const context = ownedContext(this.owner, { renderer: { _dom: { document: stubDocument } } });

            assert.strictEqual(getDOM(context), stubDocument, 'the owner is never consulted when the renderer already has a _dom');
        });

        test('it throws when nothing can provide a document', function (assert) {
            const context = { renderer: { _dom: {} } };

            assert.throws(() => getDOM(context), /Could not get DOM/);
        });
    });

    module('findElemementByIdInShadowDom', function () {
        // The helper searches owner.rootElement directly, so these tests swap in
        // a real element for the duration of the test and restore it afterwards.
        function withRootElement(owner, element, callback) {
            const original = owner.rootElement;
            owner.rootElement = element;

            try {
                return callback();
            } finally {
                owner.rootElement = original;
            }
        }

        test('it finds an element by id inside the owner root element', function (assert) {
            const root = document.createElement('div');
            const target = document.createElement('span');
            target.id = 'shadow-target';
            root.appendChild(target);

            withRootElement(this.owner, root, () => {
                assert.strictEqual(findElemementByIdInShadowDom(ownedContext(this.owner), 'shadow-target'), target);
            });
        });

        test('it returns null when the id is not inside the root element', function (assert) {
            withRootElement(this.owner, document.createElement('div'), () => {
                assert.strictEqual(findElemementByIdInShadowDom(ownedContext(this.owner), 'nowhere-to-be-found'), null);
            });
        });

        test('it scopes the search to the root element rather than the whole document', function (assert) {
            const outside = document.createElement('span');
            outside.id = 'outside-the-root';
            document.body.appendChild(outside);

            try {
                withRootElement(this.owner, document.createElement('div'), () => {
                    assert.strictEqual(findElemementByIdInShadowDom(ownedContext(this.owner), 'outside-the-root'), null, 'elements elsewhere in the document are not matched');
                });
            } finally {
                outside.remove();
            }
        });

        test('it yields undefined when the root element is a selector string rather than an element', function (assert) {
            // This is the guard the implementation makes explicit with
            // `rootElement.querySelector && ...` — a string root has no
            // querySelector, so the shadow-DOM lookup is skipped entirely.
            withRootElement(this.owner, '#ember-testing', () => {
                assert.strictEqual(findElemementByIdInShadowDom(ownedContext(this.owner), 'anything'), undefined);
            });
        });
    });

    module('unwrapChildren', function () {
        test('it hoists every child into the parent and removes the wrapper', function (assert) {
            const parent = document.createElement('div');
            const wrapper = document.createElement('section');
            wrapper.innerHTML = '<b>one</b><i>two</i>';
            parent.appendChild(document.createElement('hr'));
            parent.appendChild(wrapper);

            unwrapChildren(wrapper);

            assert.strictEqual(wrapper.parentNode, null, 'the wrapper is detached');
            assert.strictEqual(wrapper.childNodes.length, 0, 'the wrapper keeps none of its children');
            assert.strictEqual(parent.innerHTML, '<hr><b>one</b><i>two</i>', 'children keep their order and land where the wrapper was');
        });

        test('it removes an empty wrapper without error', function (assert) {
            const parent = document.createElement('div');
            const wrapper = document.createElement('section');
            parent.appendChild(wrapper);

            unwrapChildren(wrapper);

            assert.strictEqual(parent.childNodes.length, 0, 'nothing is left behind');
        });
    });

    module('render timing helpers', function () {
        test('afterRender resolves on the afterRender queue', async function (assert) {
            let resolved = false;

            const promise = afterRender().then(() => (resolved = true));
            assert.false(resolved, 'it does not resolve synchronously');

            await promise;
            await settled();
            assert.true(resolved);
        });

        test('afterPaint resolves on the next animation frame', async function (assert) {
            let resolved = false;

            const promise = afterPaint().then(() => (resolved = true));
            assert.false(resolved, 'it does not resolve synchronously');

            await promise;
            assert.true(resolved);
        });

        test('renderCompleted waits for both render and paint', async function (assert) {
            let paintDone = false;
            requestAnimationFrame(() => (paintDone = true));

            await renderCompleted();
            await settled();

            assert.true(paintDone, 'a frame elapsed before renderCompleted resolved');
        });
    });

    module('waitForInsertedAndSized', function () {
        test('it resolves immediately for an element that is already sized', async function (assert) {
            const el = document.createElement('div');
            el.style.cssText = 'width: 10px; height: 10px;';
            document.body.appendChild(el);

            try {
                assert.strictEqual(await waitForInsertedAndSized(el), el);
            } finally {
                el.remove();
            }
        });

        test('it accepts a getter function as well as an element', async function (assert) {
            const el = document.createElement('div');
            el.style.cssText = 'width: 10px; height: 10px;';
            document.body.appendChild(el);

            try {
                assert.strictEqual(await waitForInsertedAndSized(() => el), el);
            } finally {
                el.remove();
            }
        });

        test('it resolves once a later insertion gives the element a size', async function (assert) {
            const el = document.createElement('div');
            el.style.cssText = 'width: 10px; height: 10px;';

            const promise = waitForInsertedAndSized(() => el, { timeoutMs: 2000 });
            document.body.appendChild(el);

            try {
                assert.strictEqual(await promise, el, 'the mutation observer picked up the insertion');
            } finally {
                el.remove();
            }
        });

        // A negative timeout means "wait indefinitely": no timer is armed, so there is none for
        // cleanup to clear either.
        test('a negative timeout arms no deadline', async function (assert) {
            const el = document.createElement('div');
            el.style.cssText = 'width: 10px; height: 10px;';

            const promise = waitForInsertedAndSized(() => el, { timeoutMs: -1 });
            document.body.appendChild(el);

            try {
                assert.strictEqual(await promise, el, 'it still resolves once the element is there');
            } finally {
                el.remove();
            }
        });

        test('it rejects when the element never becomes sized', async function (assert) {
            const el = document.createElement('div');
            document.body.appendChild(el);

            try {
                await waitForInsertedAndSized(el, { timeoutMs: 50 });
                assert.true(false, 'expected a rejection');
            } catch (error) {
                assert.strictEqual(error.message, 'Element was not inserted/sized in time');
            } finally {
                el.remove();
            }
        });

        test('it treats a zero-sized but present element as not ready', async function (assert) {
            const el = document.createElement('div');
            el.style.cssText = 'width: 0; height: 0;';
            document.body.appendChild(el);

            try {
                await waitForInsertedAndSized(el, { timeoutMs: 50 });
                assert.true(false, 'expected a rejection');
            } catch (error) {
                assert.strictEqual(error.message, 'Element was not inserted/sized in time');
            } finally {
                el.remove();
            }
        });

        test('it rejects when the getter never returns an element', async function (assert) {
            try {
                await waitForInsertedAndSized(() => null, { timeoutMs: 50 });
                assert.true(false, 'expected a rejection');
            } catch (error) {
                assert.strictEqual(error.message, 'Element was not inserted/sized in time');
            }
        });

        test('it rejects for a sized element that is detached from the document', async function (assert) {
            const el = document.createElement('div');
            el.style.cssText = 'width: 10px; height: 10px;';

            try {
                await waitForInsertedAndSized(el, { timeoutMs: 50 });
                assert.true(false, 'expected a rejection');
            } catch (error) {
                assert.strictEqual(error.message, 'Element was not inserted/sized in time', 'being in the document is required, not just having a size');
            }
        });
    });

    module('createElement', function () {
        test('it creates a bare element with no options', function (assert) {
            const el = createElement('span');

            assert.strictEqual(el.tagName, 'SPAN');
            assert.strictEqual(el.attributes.length, 0, 'no attributes are added');
            assert.strictEqual(el.childNodes.length, 0);
        });

        test('it accepts class names as an array or a space-separated string', function (assert) {
            assert.deepEqual([...createElement('div', { classNames: ['a', 'b'] }).classList], ['a', 'b']);
            assert.deepEqual([...createElement('div', { classNames: 'a b' }).classList], ['a', 'b']);
        });

        test('it drops empty class name segments', function (assert) {
            assert.deepEqual([...createElement('div', { classNames: 'a  b ' }).classList], ['a', 'b'], 'double spaces do not produce empty classes');
        });

        test('it applies styles', function (assert) {
            const el = createElement('div', { styles: { color: 'rgb(1, 2, 3)', zIndex: '5' } });

            assert.strictEqual(el.style.color, 'rgb(1, 2, 3)');
            assert.strictEqual(el.style.zIndex, '5');
        });

        test('it ignores a non-object styles option', function (assert) {
            assert.strictEqual(createElement('div', { styles: 'color: red' }).getAttribute('style'), null);
        });

        test('it sets attributes and renders true as an empty value', function (assert) {
            const el = createElement('input', { attrs: { type: 'text', disabled: true, role: 'textbox' } });

            assert.strictEqual(el.getAttribute('type'), 'text');
            assert.strictEqual(el.getAttribute('disabled'), '', 'true becomes a valueless attribute');
            assert.strictEqual(el.getAttribute('role'), 'textbox');
        });

        test('it omits attributes that are false, null or undefined', function (assert) {
            const el = createElement('input', { attrs: { disabled: false, hidden: null, title: undefined } });

            assert.false(el.hasAttribute('disabled'));
            assert.false(el.hasAttribute('hidden'));
            assert.false(el.hasAttribute('title'));
        });

        test('it keeps a zero or empty-string attribute value', function (assert) {
            const el = createElement('div', { attrs: { tabindex: 0, 'data-empty': '' } });

            assert.strictEqual(el.getAttribute('tabindex'), '0', 'zero is not treated as absent');
            assert.strictEqual(el.getAttribute('data-empty'), '');
        });

        test('it writes dataset entries', function (assert) {
            const el = createElement('div', { dataset: { testId: 'x', count: 2 } });

            assert.strictEqual(el.dataset.testId, 'x');
            assert.strictEqual(el.getAttribute('data-test-id'), 'x', 'camelCase becomes dash-case');
            assert.strictEqual(el.dataset.count, '2');
        });

        test('it attaches event listeners and ignores non-function handlers', function (assert) {
            let clicks = 0;
            const el = createElement('button', { on: { click: () => clicks++, focus: 'not-a-function' } });

            el.dispatchEvent(new MouseEvent('click'));
            assert.strictEqual(clicks, 1);

            el.dispatchEvent(new FocusEvent('focus'));
            assert.strictEqual(clicks, 1, 'the string handler was skipped rather than throwing');
        });

        test('it sets text content, escaping markup', function (assert) {
            const el = createElement('div', { text: '<b>hi</b>' });

            assert.strictEqual(el.textContent, '<b>hi</b>');
            assert.strictEqual(el.querySelector('b'), null, 'text is not parsed as html');
        });

        test('it accepts innerText as an alias for text', function (assert) {
            assert.strictEqual(createElement('div', { innerText: 'aliased' }).textContent, 'aliased');
        });

        test('it sets html content via html or innerHTML', function (assert) {
            assert.strictEqual(createElement('div', { html: '<b>bold</b>' }).querySelector('b').textContent, 'bold');
            assert.strictEqual(createElement('div', { innerHTML: '<i>it</i>' }).querySelector('i').textContent, 'it');
        });

        test('it throws when both text and html are supplied', function (assert) {
            assert.throws(() => createElement('div', { text: 'a', html: '<b>b</b>' }), /use either text OR html, not both/);
        });

        test('it treats an empty string as content rather than as absent', function (assert) {
            const el = createElement('div', { text: '' }, 'child-should-be-ignored');

            assert.strictEqual(el.textContent, '', 'text: "" wins over children because it is not null');
        });

        test('it appends string, node and nested-array children', function (assert) {
            const node = document.createElement('b');
            node.textContent = 'B';
            const el = createElement('div', {}, ['A', node, ['C', 'D']]);

            assert.strictEqual(el.textContent, 'ABCD', 'nested arrays are flattened in order');
        });

        test('it stringifies non-node children', function (assert) {
            assert.strictEqual(createElement('div', {}, [0, false, 'x']).textContent, '0falsex', 'zero and false are rendered, not skipped');
        });

        test('it skips null and undefined children', function (assert) {
            assert.strictEqual(createElement('div', {}, [null, 'a', undefined]).textContent, 'a');
        });

        test('it accepts a single non-array child', function (assert) {
            assert.strictEqual(createElement('div', {}, 'solo').textContent, 'solo');
        });

        test('it mounts into an element target', function (assert) {
            const host = document.createElement('div');
            document.body.appendChild(host);

            try {
                const el = createElement('span', { mount: host });
                assert.strictEqual(el.parentNode, host);
            } finally {
                host.remove();
            }
        });

        test('it mounts into a selector target', function (assert) {
            const host = document.createElement('div');
            host.id = 'mount-host';
            document.body.appendChild(host);

            try {
                const el = createElement('span', { mount: '#mount-host' });
                assert.strictEqual(el.parentNode, host);
            } finally {
                host.remove();
            }
        });

        test('it warns and stays detached when the mount target cannot be found', function (assert) {
            const originalWarn = console.warn;
            const warnings = [];
            console.warn = (...args) => warnings.push(args);

            try {
                const el = createElement('span', { mount: '#no-such-host' });

                assert.strictEqual(el.parentNode, null, 'the element is returned unmounted');
                assert.strictEqual(warnings.length, 1, 'the caller is warned');
                assert.strictEqual(warnings[0][0], 'createElement: mount target not found');
            } finally {
                console.warn = originalWarn;
            }
        });
    });

    module('getDestinationElement', function () {
        test('it returns the wormhole element when one exists in the document', function (assert) {
            const wormhole = document.createElement('div');
            wormhole.id = 'ember-bootstrap-wormhole';
            document.body.appendChild(wormhole);

            try {
                const context = ownedContext(this.owner, { renderer: { _dom: { document } } });
                assert.strictEqual(getDestinationElement(context), wormhole);
            } finally {
                wormhole.remove();
            }
        });

        test('it falls back to the test root element when no wormhole exists', function (assert) {
            assert.dom('#ember-bootstrap-wormhole').doesNotExist('precondition: no wormhole is present');

            const context = ownedContext(this.owner, { renderer: { _dom: { document } } });
            const destination = getDestinationElement(context);

            assert.strictEqual(destination, document.querySelector('#ember-testing'), 'the test container stands in for the wormhole');
        });
    });
    test('waitForInsertedAndSized can be asked never to time out', async function (assert) {
        const element = document.createElement('div');
        element.style.width = '10px';
        element.style.height = '10px';
        document.getElementById('ember-testing').appendChild(element);

        // A negative timeout skips the timer entirely; the element is already sized, so the
        // fast path resolves immediately and nothing is left pending.
        const resolved = await waitForInsertedAndSized(element, { timeoutMs: -1 });

        assert.strictEqual(resolved, element);

        element.remove();
    });
});
