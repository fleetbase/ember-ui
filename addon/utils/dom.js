import { getOwner } from '@ember/application';
import { DEBUG } from '@glimmer/env';
import { warn } from '@ember/debug';
import { schedule } from '@ember/runloop';
import { isArray } from '@ember/array';
import { all } from 'rsvp';
import requirejs from 'require';

function childNodesOfElement(element) {
    let children = [];
    let child = element.firstChild;
    while (child) {
        children.push(child);
        child = child.nextSibling;
    }
    return children;
}

export function findElementById(doc, id) {
    if (doc.getElementById) {
        return doc.getElementById(id);
    }

    let nodes = childNodesOfElement(doc);
    let node;

    while (nodes.length) {
        node = nodes.shift();

        if (node.getAttribute && node.getAttribute('id') === id) {
            return node;
        }
        nodes = childNodesOfElement(node).concat(nodes);
    }
}

// Private Ember API usage. Get the dom implementation used by the current
// renderer, be it native browser DOM or Fastboot SimpleDOM
export function getDOM(context) {
    let { renderer } = context;
    if (!renderer?._dom) {
        // pre glimmer2
        let container = getOwner ? getOwner(context) : context.container;
        let documentService = container.lookup('service:-document');

        if (documentService) {
            return documentService;
        }

        renderer = container.lookup('renderer:-dom');
    }

    if (renderer._dom && renderer._dom.document) {
        return renderer._dom.document;
    } else {
        throw new Error('Could not get DOM');
    }
}

export function getDestinationElement(context) {
    let dom = getDOM(context);
    const id = 'ember-bootstrap-wormhole';
    let destinationElement = findElementById(dom, id) || findElemementByIdInShadowDom(context, id);

    if (DEBUG && !destinationElement) {
        let config = getOwner(context).resolveRegistration('config:environment');
        if (config.environment === 'test' && typeof FastBoot === 'undefined') {
            let id;
            if (requirejs.has('@ember/test-helpers/dom/get-root-element')) {
                try {
                    id = requirejs('@ember/test-helpers/dom/get-root-element').default().id;
                } catch (ex) {
                    // no op
                }
            }
            if (!id) {
                return document.querySelector('#ember-testing');
            }
            return document.getElementById(id);
        }

        warn(
            `No wormhole destination element found for component ${context}. If you have set \`insertEmberWormholeElementToDom\` to false, you should insert a \`div#ember-bootstrap-wormhole\` manually!`,
            false,
            { id: 'ember-bootstrap.no-destination-element' }
        );
    }

    return destinationElement;
}

export function findElemementByIdInShadowDom(context, id) {
    const owner = getOwner(context);
    return owner.rootElement.querySelector && owner.rootElement.querySelector(`[id="${id}"]`);
}

export function unwrapChildren(context) {
    const fragment = document.createDocumentFragment();

    while (context.firstChild) {
        fragment.appendChild(context.firstChild);
    }

    context.parentNode.insertBefore(fragment, context);
    context.parentNode.removeChild(context);
}

export function afterRender() {
    return new Promise((resolve) => schedule('afterRender', null, resolve));
}

export function afterPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function renderCompleted() {
    return all([afterRender, afterPaint]);
}

export function waitForInsertedAndSized(getElOrEl, { timeoutMs = 4000 } = {}) {
    const getEl = typeof getElOrEl === 'function' ? getElOrEl : () => getElOrEl;

    return new Promise((resolve, reject) => {
        const ok = (el) => {
            if (!el) return false;
            const inDoc = document.documentElement.contains(el);
            if (!inDoc) return false;
            const r = el.getBoundingClientRect?.();
            return !!r && r.width > 0 && r.height > 0;
        };

        let toId = 0;
        let mo = null;

        const check = () => {
            const el = getEl();
            if (ok(el)) {
                cleanup();
                resolve(el);
            }
        };

        function cleanup() {
            if (mo) mo.disconnect();
            if (toId) clearTimeout(toId);
        }

        // fast path
        if (ok(getEl())) return resolve(getEl());

        // observe the whole doc for insertions/attribute tweaks that would affect layout
        mo = new MutationObserver(check);
        mo.observe(document.documentElement, {
            childList: true,
            attributes: true,
            subtree: true,
        });

        // one immediate tick to catch “already there but styles settling”
        requestAnimationFrame(check);

        if (timeoutMs >= 0) {
            toId = setTimeout(() => {
                cleanup();
                reject(new Error('Element was not inserted/sized in time'));
            }, timeoutMs);
        }
    });
}

/**
 * Create a DOM element with declarative options.
 *
 * @param {string} tag
 * @param {Object} [options]
 * @param {string|string[]|Node|Node[]} [children]
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}, children = null) {
    const el = document.createElement(tag);

    // ---------- Classes ----------
    if (options.classNames) {
        const classes = isArray(options.classNames) ? options.classNames : options.classNames.split(' ');
        el.classList.add(...classes.filter(Boolean));
    }

    // ---------- Styles ----------
    if (options.styles && typeof options.styles === 'object') {
        Object.assign(el.style, options.styles);
    }

    // ---------- Attributes ----------
    if (options.attrs && typeof options.attrs === 'object') {
        for (const [key, value] of Object.entries(options.attrs)) {
            if (value !== false && value != null) {
                el.setAttribute(key, value === true ? '' : value);
            }
        }
    }

    // ---------- Dataset ----------
    if (options.dataset && typeof options.dataset === 'object') {
        for (const [key, value] of Object.entries(options.dataset)) {
            el.dataset[key] = value;
        }
    }

    // ---------- Event listeners ----------
    if (options.on && typeof options.on === 'object') {
        for (const [event, handler] of Object.entries(options.on)) {
            if (typeof handler === 'function') {
                el.addEventListener(event, handler);
            }
        }
    }

    // ---------- Text / HTML (exclusive) ----------
    const hasText = options.text != null || options.innerText != null;
    const hasHtml = options.html != null || options.innerHTML != null;

    if (hasText && hasHtml) {
        throw new Error('createElement: use either text OR html, not both.');
    }

    if (hasText) {
        el.textContent = options.text ?? options.innerText;
    } else if (hasHtml) {
        el.innerHTML = options.html ?? options.innerHTML;
    } else {
        // ---------- Children ----------
        const append = (child) => {
            if (child == null) return;
            if (Array.isArray(child)) return child.forEach(append);
            if (child instanceof Node) el.appendChild(child);
            else el.appendChild(document.createTextNode(String(child)));
        };

        append(children);
    }

    // ---------- Mount ----------
    if (options.mount) {
        let mountTarget = options.mount;

        if (typeof mountTarget === 'string') {
            mountTarget = document.querySelector(mountTarget);
        }

        if (mountTarget instanceof Element) {
            mountTarget.appendChild(el);
        } else {
            console.warn('createElement: mount target not found', options.mount);
        }
    }

    return el;
}
