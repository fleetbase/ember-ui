import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import { run } from '@ember/runloop';
import { settled } from '@ember/test-helpers';

module('Unit | Service | shell', function (hooks) {
    setupTest(hooks);

    test('it starts in the classic layout', function (assert) {
        const shell = this.owner.lookup('service:shell');

        assert.strictEqual(shell.layout, 'classic');
        assert.true(shell.isClassic);
        assert.false(shell.isCanvas);
    });

    test('setLayout switches layouts and falls back to classic for anything unknown', function (assert) {
        const shell = this.owner.lookup('service:shell');

        shell.setLayout('canvas');
        assert.strictEqual(shell.layout, 'canvas');
        assert.true(shell.isCanvas);

        shell.setLayout('sidebar');
        assert.strictEqual(shell.layout, 'classic');
    });

    test('a mounted canvas makes the layout canvas until the last one unmounts', async function (assert) {
        const shell = this.owner.lookup('service:shell');

        run(() => {
            shell.canvasDidMount();
            shell.canvasDidMount();
        });
        assert.strictEqual(shell.layout, 'canvas');

        run(() => shell.canvasWillUnmount());
        assert.strictEqual(shell.layout, 'canvas', 'one canvas is still mounted');

        run(() => shell.canvasWillUnmount());
        assert.strictEqual(shell.layout, 'classic');

        run(() => shell.canvasWillUnmount());
        assert.strictEqual(shell.mountedCanvases, 0, 'the count never goes negative');
        await settled();
    });

    test('a count change scheduled after the service is destroyed is dropped', async function (assert) {
        const shell = this.owner.lookup('service:shell');

        run(() => {
            shell.canvasDidMount();
            shell.destroy();
        });
        await settled();

        assert.strictEqual(shell.mountedCanvases, 0);
    });
});
