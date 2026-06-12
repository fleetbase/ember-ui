import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | floating', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Floating />`);

        assert.dom(this.element).hasText('');

        // Template block usage:
        await render(hbs`
      <Floating>
        template block text
      </Floating>
    `);

        assert.dom(this.element).hasText('template block text');
    });

    test('offset does not accumulate when position is recomputed', async function (assert) {
        this.registerAPI = (api) => {
            this.api = api;
        };

        await render(hbs`
            <div class="floating-target">Target</div>
            <Floating
                @target=".floating-target"
                @placement="bottom-start"
                @offset={{8}}
                @registerAPI={{this.registerAPI}}
                class="floating-panel"
            >
                Panel
            </Floating>
        `);

        await waitUntil(() => this.api?.floatingElement?.style.transform);
        const initialTransform = this.api.floatingElement.style.transform;

        this.api.computePosition(this.api.floatingTarget, this.api.floatingElement);
        await waitForFrame();

        this.api.computePosition(this.api.floatingTarget, this.api.floatingElement);
        await waitForFrame();

        assert.strictEqual(this.api.floatingElement.style.transform, initialTransform, 'transform remains stable across repeated position calculations');
    });
});

function waitForFrame() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
}
