import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// Chrome re-serialises `calc(100vw - Npx)` (e.g. as `calc(0px + 100vw)`), so assert on
// the operands rather than the exact string the browser chose to emit.
function assertViewportMinus(assert, element, pixels, message) {
    const width = element.style.width;
    assert.true(width.startsWith('calc('), `${message} (a calc expression is applied)`);
    assert.true(width.includes('100vw'), `${message} (relative to the viewport)`);
    assert.true(width.includes(`${pixels}px`), `${message} (reserving ${pixels}px)`);
}

// Wait for a ResizeObserver delivery (which happens after layout, before paint).
async function nextFrames(frames = 2) {
    for (let i = 0; i < frames; i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    await settled();
}

module('Integration | Modifier | constrain-view-section-width', function (hooks) {
    setupRenderingTest(hooks);

    let sidebar;
    let section;

    hooks.beforeEach(function () {
        // fixed + off-screen so these fixtures never influence the page width
        sidebar = document.createElement('nav');
        sidebar.className = 'next-sidebar';
        sidebar.style.cssText = 'position: fixed; top: -9999px; left: 0; box-sizing: border-box; width: 200px; height: 10px;';
        document.body.appendChild(sidebar);

        section = document.createElement('section');
        section.className = 'next-view-section';
        section.style.cssText = 'position: fixed; top: -9999px; left: 0; height: 10px;';
        document.body.appendChild(section);
    });

    hooks.afterEach(function () {
        sidebar.remove();
        section.remove();
    });

    test('it constrains the view section and the tablist to the space beside the sidebar', async function (assert) {
        await render(hbs`
            <div data-test-container {{constrain-view-section-width}}>
                <div role="tablist" data-test-tablist></div>
            </div>
        `);

        const pageWidth = document.body.offsetWidth;
        assert.ok(pageWidth > 200, 'sanity: the page is wider than the fixture sidebar');
        assertViewportMinus(assert, section, 200, 'the view section reserves the sidebar width');
        assert.strictEqual(find('[data-test-tablist]').style.maxWidth, `${pageWidth - 200}px`, 'the tablist max width is the page width minus the sidebar width');
    });

    test('it recalculates on window resize', async function (assert) {
        await render(hbs`
            <div data-test-container {{constrain-view-section-width}}>
                <div role="tablist" data-test-tablist></div>
            </div>
        `);

        const tablist = find('[data-test-tablist]');
        const initialMaxWidth = parseInt(tablist.style.maxWidth, 10);
        assertViewportMinus(assert, section, 200, 'initial section width applied');

        sidebar.style.width = '120px';
        window.dispatchEvent(new Event('resize'));
        await settled();

        assertViewportMinus(assert, section, 120, 'the section width follows the new sidebar width');
        assert.strictEqual(parseInt(tablist.style.maxWidth, 10) - initialMaxWidth, 80, 'the tablist gained exactly the 80px the sidebar lost');
    });

    test('it recalculates when the sidebar itself is resized', async function (assert) {
        await render(hbs`
            <div data-test-container {{constrain-view-section-width}}>
                <div role="tablist" data-test-tablist></div>
            </div>
        `);

        const tablist = find('[data-test-tablist]');
        const initialMaxWidth = parseInt(tablist.style.maxWidth, 10);

        sidebar.style.width = '260px';
        await nextFrames();

        assertViewportMinus(assert, section, 260, 'the resize observer picked up the sidebar width change');
        assert.strictEqual(initialMaxWidth - parseInt(tablist.style.maxWidth, 10), 60, 'the tablist lost exactly the 60px the sidebar gained');
    });

    test('it treats a missing sidebar as zero width', async function (assert) {
        sidebar.remove();

        await render(hbs`
            <div data-test-container {{constrain-view-section-width}}>
                <div role="tablist" data-test-tablist></div>
            </div>
        `);

        assertViewportMinus(assert, section, 0, 'the section takes the full viewport width');
        assert.strictEqual(find('[data-test-tablist]').style.maxWidth, `${document.body.offsetWidth}px`, 'the tablist takes the full page width');
    });

    test('it only touches the tablist inside its own element', async function (assert) {
        await render(hbs`
            <div data-test-outside role="tablist"></div>
            <div data-test-container {{constrain-view-section-width}}></div>
        `);

        assert.strictEqual(find('[data-test-outside]').style.maxWidth, '', 'a tablist outside the modified element is untouched');
        assertViewportMinus(assert, section, 200, 'the section is still constrained when there is no tablist to size');
    });

    test('it removes its resize listener and observer when destroyed', async function (assert) {
        this.set('show', true);

        await render(hbs`
            {{#if this.show}}
                <div data-test-container {{constrain-view-section-width}}>
                    <div role="tablist" data-test-tablist></div>
                </div>
            {{/if}}
        `);

        assertViewportMinus(assert, section, 200, 'the section was constrained while rendered');

        this.set('show', false);
        await settled();

        assert.dom('[data-test-container]').doesNotExist('the modified element was torn down');

        sidebar.style.width = '50px';
        window.dispatchEvent(new Event('resize'));
        await nextFrames();

        assertViewportMinus(assert, section, 200, 'no listener or observer is left behind after teardown');
    });
    test('with no view section on the page only the tablist is constrained', async function (assert) {
        section.remove();

        await render(hbs`
            <div data-test-container {{constrain-view-section-width}}>
                <div role="tablist" data-test-tablist></div>
            </div>
        `);

        const pageWidth = document.body.offsetWidth;
        assert.strictEqual(find('[data-test-tablist]').style.maxWidth, `${pageWidth - 200}px`, 'the tablist is still sized');
        assert.strictEqual(section.style.width, '', 'and the detached section is left untouched');

        document.body.appendChild(section);
    });
});
