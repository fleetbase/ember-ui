import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import Service from '@ember/service';
import { DOCK_PREFERENCES_KEY, DOCK_PREFERENCE_DEFAULTS } from '@fleetbase/ember-ui/services/dock-preferences';

function currentUserWith(saved) {
    return class CurrentUserStub extends Service {
        options = { [DOCK_PREFERENCES_KEY]: saved };
        writes = [];

        getOption(key, defaultValue) {
            return key in this.options ? this.options[key] : defaultValue;
        }

        setOption(key, value) {
            this.writes.push([key, value]);
            this.options[key] = value;
        }
    };
}

module('Unit | Service | dock-preferences', function (hooks) {
    setupTest(hooks);

    function setup(owner, saved) {
        owner.unregister('service:current-user');
        owner.register('service:current-user', currentUserWith(saved));
        return { service: owner.lookup('service:dock-preferences'), currentUser: owner.lookup('service:current-user') };
    }

    test('with nothing saved it uses the defaults', function (assert) {
        const { service } = setup(this.owner, null);
        assert.deepEqual(service.toJSON(), { ...DOCK_PREFERENCE_DEFAULTS });
    });

    test('it reads valid saved values and ignores the rest', function (assert) {
        const { service } = setup(this.owner, { showBadges: false, openOnHover: 'yes', pinRail: true, position: 'top', size: 'compact', extra: true });

        assert.deepEqual(service.toJSON(), { showBadges: false, openOnHover: false, pinRail: true, position: 'left', size: 'compact' });
    });

    test('update sets and saves, and ignores unknown keys and invalid values', function (assert) {
        const { service, currentUser } = setup(this.owner, undefined);

        service.update('position', 'right');
        service.update('position', 'diagonal');
        service.update('size', 'huge');
        service.update('flair', true);
        service.update('pinRail', 'on');

        assert.strictEqual(service.position, 'right');
        assert.strictEqual(currentUser.writes.length, 1, 'only the valid update is saved');
        assert.deepEqual(currentUser.writes[0], [DOCK_PREFERENCES_KEY, { ...DOCK_PREFERENCE_DEFAULTS, position: 'right' }]);
    });

    test('toggle flips a boolean', function (assert) {
        const { service } = setup(this.owner, {});
        service.toggle('openOnHover');
        assert.true(service.openOnHover);
        service.toggle('openOnHover');
        assert.false(service.openOnHover);
    });

    test('reset restores the defaults and saves them', function (assert) {
        const { service, currentUser } = setup(this.owner, { pinRail: true, size: 'compact' });
        service.reset();

        assert.deepEqual(service.toJSON(), { ...DOCK_PREFERENCE_DEFAULTS });
        assert.deepEqual(currentUser.writes, [[DOCK_PREFERENCES_KEY, { ...DOCK_PREFERENCE_DEFAULTS }]]);
    });
});
