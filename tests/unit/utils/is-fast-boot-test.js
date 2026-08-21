import isFastBoot from '@fleetbase/ember-ui/utils/is-fastboot';
import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import { setOwner } from '@ember/application';
import Service from '@ember/service';

function ownedContext(owner) {
    const context = {};
    setOwner(context, owner);

    return context;
}

module('Unit | Utility | is-fastboot', function (hooks) {
    setupTest(hooks);

    test('it returns false when no fastboot service is registered', function (assert) {
        assert.false(isFastBoot(ownedContext(this.owner)), 'a browser app has no fastboot service');
    });

    test('it reports true when the fastboot service says so', function (assert) {
        this.owner.register(
            'service:fastboot',
            class extends Service {
                isFastBoot = true;
            }
        );

        assert.true(isFastBoot(ownedContext(this.owner)));
    });

    test('it reports false when the fastboot service says so', function (assert) {
        this.owner.register(
            'service:fastboot',
            class extends Service {
                isFastBoot = false;
            }
        );

        assert.false(isFastBoot(ownedContext(this.owner)));
    });

    test('it reads the flag through get, so a computed value is honoured', function (assert) {
        this.owner.register(
            'service:fastboot',
            class extends Service {
                get isFastBoot() {
                    return true;
                }
            }
        );

        assert.true(isFastBoot(ownedContext(this.owner)));
    });

    test('it returns undefined when the service exists but exposes no flag', function (assert) {
        this.owner.register('service:fastboot', class extends Service {});

        assert.strictEqual(isFastBoot(ownedContext(this.owner)), undefined, 'the service is trusted to define the flag');
    });

    test('it accepts any owner-bearing object as its context', function (assert) {
        this.owner.register(
            'service:fastboot',
            class extends Service {
                isFastBoot = true;
            }
        );

        const service = this.owner.lookup('service:fastboot');

        assert.true(isFastBoot(service), 'a real owned object works as the context');
    });
});
