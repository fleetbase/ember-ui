import { module, test } from 'qunit';
import { resetShellState, setupShellState } from '@fleetbase/ember-ui/test-support';
import { shellState } from '@fleetbase/ember-ui/services/shell';
import { sheetStack } from '@fleetbase/ember-ui/utils/sheet-stack';

module('Unit | test-support | shell state', function () {
    test('resetShellState puts the layout back to classic and empties the sheet stack', function (assert) {
        shellState.explicitLayout = 'canvas';
        shellState.mountedCanvases = 2;
        sheetStack.register({ depth: 0, escape: () => false });

        resetShellState();

        assert.strictEqual(shellState.layout, 'classic');
        assert.strictEqual(shellState.mountedCanvases, 0);
        assert.deepEqual(sheetStack.sheets, []);
    });

    module('setupShellState', function (hooks) {
        shellState.explicitLayout = 'canvas';
        setupShellState(hooks);

        test('resets before each test', function (assert) {
            assert.strictEqual(shellState.layout, 'classic');
        });
    });
});
