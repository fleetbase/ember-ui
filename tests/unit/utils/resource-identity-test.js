import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import ObjectProxy from '@ember/object/proxy';
import { hbs } from 'ember-cli-htmlbars';
import { registerResourceDescriptor } from '@fleetbase/ember-ui/utils/resource-registry';
import {
    DEFAULT_STATUS_TONES,
    unwrapRecord,
    resourceTitle,
    resourceIdentifier,
    resourceImage,
    resourceOnline,
    resourceStatus,
    statusToneClass,
    resourceBadges,
    formatFactValue,
    resourceFacts,
    resourceSelectDetails,
    makeTranslator,
} from '@fleetbase/ember-ui/utils/resource-identity';

module('Unit | Utility | resource-identity', function (hooks) {
    setupTest(hooks);

    module('unwrapRecord', function () {
        test('it passes plain values through and nullifies the absent ones', function (assert) {
            const record = { name: 'Ada' };

            assert.strictEqual(unwrapRecord(record), record, 'a plain object is itself');
            assert.strictEqual(unwrapRecord('a string'), 'a string');
            assert.strictEqual(unwrapRecord(0), 0, 'zero is a value, not an absence');
            assert.strictEqual(unwrapRecord(null), null);
            assert.strictEqual(unwrapRecord(undefined), null, 'undefined comes back as null');
            assert.false(unwrapRecord(false), 'a falsey non-object is returned as it is; only null and undefined become null');
        });

        test('it peels an ObjectProxy', function (assert) {
            const content = { name: 'Ada' };

            assert.strictEqual(unwrapRecord(ObjectProxy.create({ content })), content);
            assert.strictEqual(unwrapRecord(ObjectProxy.create({ content: null })), null, 'an unresolved proxy is null');
        });

        test('it peels a promise proxy without ever awaiting it', function (assert) {
            const content = { name: 'Ada' };

            assert.strictEqual(unwrapRecord({ then: () => {}, content }), content);
            assert.strictEqual(unwrapRecord({ then: () => {}, content: undefined }), null);

            const thenableWithoutContent = { then: () => {} };
            assert.strictEqual(unwrapRecord(thenableWithoutContent), thenableWithoutContent, 'a thenable with no content key is left alone');
        });
    });

    module('resourceTitle', function () {
        test('the descriptor title wins when it has something to say', function (assert) {
            const descriptor = { title: (record) => record.nickname };

            assert.strictEqual(resourceTitle(descriptor, { nickname: 'Ace', name: 'Ada' }), 'Ace');
        });

        test('it falls through the title paths in order', function (assert) {
            assert.strictEqual(resourceTitle(null, { name: 'Ada', display_name: 'D' }), 'Ada');
            assert.strictEqual(resourceTitle(null, { display_name: 'D', displayName: 'C' }), 'D');
            assert.strictEqual(resourceTitle(null, { displayName: 'C', title: 'T' }), 'C');
            assert.strictEqual(resourceTitle(null, { title: 'T', tracking: 'TRK' }), 'T');
            assert.strictEqual(resourceTitle(null, { tracking: 'TRK', public_id: 'p_1' }), 'TRK');
            assert.strictEqual(resourceTitle(null, { public_id: 'p_1' }), 'p_1');
        });

        test('a blank descriptor title falls through to the paths', function (assert) {
            assert.strictEqual(resourceTitle({ title: () => '   ' }, { name: 'Ada' }), 'Ada', 'whitespace is not a title');
            assert.strictEqual(resourceTitle({ title: () => null }, { name: 'Ada' }), 'Ada');
        });

        test('a descriptor whose title throws falls through rather than failing', function (assert) {
            assert.strictEqual(
                resourceTitle(
                    {
                        title: () => {
                            throw new Error('nope');
                        },
                    },
                    { name: 'Ada' }
                ),
                'Ada'
            );
        });

        test('the fallback is used when there is nothing else, and null when there is no fallback', function (assert) {
            assert.strictEqual(resourceTitle(null, {}, 'No driver'), 'No driver');
            assert.strictEqual(resourceTitle(null, {}), null);
            assert.strictEqual(resourceTitle(null, null, 'No driver'), 'No driver', 'no record at all still shows the fallback');
            assert.strictEqual(resourceTitle(null, null), null);
        });
    });

    module('resourceIdentifier', function () {
        test('it reads the descriptor and withholds uuids', function (assert) {
            assert.strictEqual(resourceIdentifier({ identifier: () => 'ada@example.test' }, {}), 'ada@example.test');
            assert.strictEqual(resourceIdentifier({ identifier: () => '9d2c6c5e-1b2a-4c3d-8e4f-1234567890ab' }, {}), null, 'a raw uuid is not shown');
            assert.strictEqual(resourceIdentifier({ identifier: () => '  ' }, {}), null);
            assert.strictEqual(resourceIdentifier(null, {}), null, 'no descriptor means no identifier');
            assert.strictEqual(resourceIdentifier({ identifier: () => 'x' }, null), null, 'no record means no identifier');
        });
    });

    module('resourceImage', function () {
        test('it normalises a descriptor image object', function (assert) {
            const image = resourceImage({ image: () => ({ url: '/a.png', shape: 'square', icon: 'user', iconClass: 'text-red-500', fallback: '/f.png', component: 'a/b' }) }, {});

            assert.deepEqual(image, { url: '/a.png', fallback: '/f.png', shape: 'square', icon: 'user', iconClass: 'text-red-500', component: 'a/b' });
        });

        test('a descriptor may return the url as a bare string', function (assert) {
            assert.strictEqual(resourceImage({ image: () => '/a.png' }, {}).url, '/a.png');
        });

        test('without a descriptor it looks for the usual image paths', function (assert) {
            assert.strictEqual(resourceImage(null, { photo_url: '/p.png', avatar_url: '/a.png' }).url, '/p.png');
            assert.strictEqual(resourceImage(null, { avatar_url: '/a.png' }).url, '/a.png');
            assert.strictEqual(resourceImage(null, { logo_url: '/l.png' }).url, '/l.png');
            assert.strictEqual(resourceImage(null, { icon_url: '/i.png' }).url, '/i.png');
            assert.strictEqual(resourceImage(null, {}).url, null, 'nothing to show is null, not undefined');
        });

        test('overrides win over everything', function (assert) {
            const image = resourceImage(
                { image: () => ({ url: '/from-descriptor.png', shape: 'square', icon: 'user' }) },
                {},
                { url: '/override.png', shape: 'round', icon: 'car', fallback: '/of.png' }
            );

            assert.strictEqual(image.url, '/override.png');
            assert.strictEqual(image.shape, 'round');
            assert.strictEqual(image.icon, 'car');
            assert.strictEqual(image.fallback, '/of.png');
        });

        test('it defaults to a round image with nothing else set', function (assert) {
            assert.deepEqual(resourceImage(null, null), { url: null, fallback: null, shape: 'round', icon: null, iconClass: null, component: null });
        });
    });

    module('resourceOnline and resourceStatus', function () {
        test('online comes from the descriptor when there is one', function (assert) {
            assert.true(resourceOnline({ online: () => true }, {}));
            assert.false(resourceOnline({ online: () => false }, {}));
            assert.strictEqual(resourceOnline({ online: () => undefined }, { online: true }), undefined, 'a descriptor that answers undefined is not second-guessed');
        });

        test('without a descriptor online reads the record, and only booleans count', function (assert) {
            assert.true(resourceOnline(null, { online: true }));
            assert.false(resourceOnline(null, { online: false }));
            assert.true(resourceOnline(null, { is_online: true }), 'is_online is the fallback path');
            assert.strictEqual(resourceOnline(null, { online: 'yes' }), undefined, 'a non-boolean is not an answer');
            assert.strictEqual(resourceOnline(null, {}), undefined);
            assert.strictEqual(resourceOnline(null, null), undefined, 'no record means no answer');
        });

        test('status comes from the descriptor, else the record', function (assert) {
            assert.strictEqual(resourceStatus({ status: () => 'active' }, {}), 'active');
            assert.strictEqual(resourceStatus(null, { status: 'pending' }), 'pending');
            assert.strictEqual(resourceStatus(null, {}), undefined);
            assert.strictEqual(resourceStatus(null, null), undefined);
            assert.strictEqual(resourceStatus({ status: () => undefined }, { status: 'pending' }), undefined, 'a descriptor that answers undefined is not second-guessed');
        });
    });

    module('statusToneClass', function () {
        test('a boolean is green or amber', function (assert) {
            assert.strictEqual(statusToneClass(true), 'text-green-500');
            assert.strictEqual(statusToneClass(false), 'text-yellow-200');
        });

        test('nothing at all is grey', function (assert) {
            assert.strictEqual(statusToneClass(undefined), 'text-gray-400');
            assert.strictEqual(statusToneClass(null), 'text-gray-400');
            assert.strictEqual(statusToneClass(''), 'text-gray-400');
        });

        test('known statuses carry their tone, whatever their case', function (assert) {
            assert.strictEqual(statusToneClass('active'), 'text-green-500');
            assert.strictEqual(statusToneClass('ACTIVE'), 'text-green-500', 'the lowercase form of the map is the fallback');
            assert.strictEqual(statusToneClass('pending'), 'text-yellow-500');
            assert.strictEqual(statusToneClass('inactive'), 'text-gray-400');
            assert.strictEqual(statusToneClass('failed'), 'text-red-500');
            assert.strictEqual(statusToneClass('not-a-known-status'), 'text-gray-400', 'an unknown status is grey');
        });

        test('supplied tones override and extend the defaults', function (assert) {
            assert.strictEqual(statusToneClass('active', { active: 'text-blue-500' }), 'text-blue-500');
            assert.strictEqual(statusToneClass('bespoke', { bespoke: 'text-purple-500' }), 'text-purple-500');
            assert.strictEqual(statusToneClass('pending', { active: 'text-blue-500' }), 'text-yellow-500', 'the defaults still apply to everything else');
        });

        test('the default tone map is exported for callers that extend it', function (assert) {
            assert.strictEqual(DEFAULT_STATUS_TONES.active, 'text-green-500');
            assert.strictEqual(DEFAULT_STATUS_TONES.cancelled, 'text-red-500');
            assert.strictEqual(DEFAULT_STATUS_TONES.canceled, 'text-red-500', 'both spellings are carried');
        });
    });

    module('resourceBadges', function () {
        test('it returns the descriptor badges that have something to show', function (assert) {
            const badges = resourceBadges({ badges: () => [{ label: 'Trailer' }, { label: '   ' }, { label: null }, null, { label: 'Vendor' }] }, {});

            assert.deepEqual(
                badges.map((badge) => badge.label),
                ['Trailer', 'Vendor'],
                'blank and missing labels are dropped'
            );
        });

        test('a badge pointing back at the row itself is dropped', function (assert) {
            const descriptor = {
                badges: () => [
                    { label: 'Itself', relatedId: 'abc' },
                    { label: 'Another', relatedId: 'def' },
                ],
            };

            assert.deepEqual(
                resourceBadges(descriptor, {}, { selfId: 'abc' }).map((badge) => badge.label),
                ['Another']
            );
            assert.deepEqual(
                resourceBadges(descriptor, {}, {}).map((badge) => badge.label),
                ['Itself', 'Another'],
                'with no selfId nothing is self-referential'
            );
        });

        test('it copes with no record, no descriptor and a non-list', function (assert) {
            assert.deepEqual(resourceBadges(null, null), []);
            assert.deepEqual(resourceBadges(null, {}), []);
            assert.deepEqual(resourceBadges({ badges: () => 'not a list' }, {}), []);
        });
    });

    module('formatFactValue', function () {
        test('empty values have nothing to format', function (assert) {
            assert.strictEqual(formatFactValue(undefined), null);
            assert.strictEqual(formatFactValue(null), null);
            assert.strictEqual(formatFactValue(''), null);
        });

        test('a function format is used, and a throwing one is swallowed', function (assert) {
            assert.strictEqual(
                formatFactValue(5, (value) => `${value} items`),
                '5 items'
            );
            assert.strictEqual(
                formatFactValue(5, () => {
                    throw new Error('nope');
                }),
                null,
                'a formatter that throws leaves the fact out rather than breaking the summary'
            );
        });

        test('dates are formatted, whether asked for by format or by type', function (assert) {
            const formatted = formatFactValue('2026-01-02T03:04:00.000Z', 'date');
            assert.ok(/2026/.test(formatted), `${formatted} carries the year`);

            const fromDate = formatFactValue(new Date('2026-01-02T03:04:00.000Z'));
            assert.ok(/2026/.test(fromDate), 'a Date instance is formatted without being asked');
        });

        test('an unparseable date comes back as its own text', function (assert) {
            assert.strictEqual(formatFactValue('not a date', 'date'), 'not a date');
        });

        test('bytes and humanize have their own formats', function (assert) {
            assert.strictEqual(formatFactValue(1024, 'bytes'), formatFactValue(1024, 'bytes'), 'bytes formatting is stable');
            assert.ok(String(formatFactValue(1024, 'bytes')).length > 0);
            assert.strictEqual(formatFactValue('in_progress', 'humanize'), 'In Progress');
        });

        test('booleans read as yes or no, and everything else as text', function (assert) {
            assert.strictEqual(formatFactValue(true), 'Yes');
            assert.strictEqual(formatFactValue(false), 'No', 'false is a value worth reporting, not an absence');
            assert.strictEqual(formatFactValue(42), '42');
            assert.strictEqual(formatFactValue('plain'), 'plain');
        });
    });

    module('resourceFacts', function (hooks) {
        hooks.beforeEach(function () {
            this.owner.register('template:components/user/pill', hbs`<span data-test-user-pill>{{@resource.name}}</span>`);
        });

        test('it copes with no record and a non-list', function (assert) {
            assert.deepEqual(resourceFacts(this.owner, null, null), []);
            assert.deepEqual(resourceFacts(this.owner, { facts: () => 'not a list' }, {}), []);
            assert.deepEqual(resourceFacts(this.owner, null, {}), []);
        });

        test('it skips empty facts and formats the rest', function (assert) {
            const descriptor = {
                facts: () => [null, { label: 'Email', value: 'ada@example.test' }, { label: 'Phone', value: null }, { label: 'Size', value: 2048, format: 'bytes' }],
            };

            const facts = resourceFacts(this.owner, descriptor, {});

            assert.deepEqual(
                facts.map((fact) => fact.label),
                ['Email', 'Size'],
                'a fact with no value is left out'
            );
            assert.strictEqual(facts[0].value, 'ada@example.test');
        });

        test('a related record renders as its pill when the owner can render one', function (assert) {
            registerResourceDescriptor(this.owner, { key: 'user', modelNames: ['user'] });

            const related = { name: 'Ada' };
            const facts = resourceFacts(this.owner, { facts: () => [{ label: 'Owner', related, relatedType: 'user', value: 'Ada' }] }, {});

            assert.strictEqual(facts[0].pillComponent, 'user/pill', 'the pill component is named');
            assert.strictEqual(facts[0].related, related, 'and the record travels with it');
            assert.strictEqual(facts[0].relatedType, 'user');
        });

        test('a related record with no pill falls back to its title', function (assert) {
            const facts = resourceFacts(this.owner, { facts: () => [{ label: 'Owner', related: { name: 'Ada' }, relatedType: 'nothing-registered', value: 'ignored' }] }, {});

            assert.strictEqual(facts[0].pillComponent, null);
            assert.strictEqual(facts[0].value, 'Ada', 'the related record is titled instead');
        });

        test('a related proxy is unwrapped before it is used', function (assert) {
            const content = { name: 'Ada' };
            const facts = resourceFacts(this.owner, { facts: () => [{ label: 'Owner', related: ObjectProxy.create({ content }), relatedType: 'nothing-registered' }] }, {});

            assert.strictEqual(facts[0].related, content);
            assert.strictEqual(facts[0].value, 'Ada');
        });

        test('a fact kept only by its pill may have no value at all', function (assert) {
            registerResourceDescriptor(this.owner, { key: 'user', modelNames: ['user'] });

            const facts = resourceFacts(this.owner, { facts: () => [{ label: 'Owner', related: { name: 'Ada' }, relatedType: 'user', value: null }] }, {});

            assert.strictEqual(facts.length, 1, 'the pill is reason enough to keep the fact');
            assert.strictEqual(facts[0].pillComponent, 'user/pill');
        });

        test('labels come from the fact, then the translator, then the humanized key', function (assert) {
            const translate = (key) => (key === 'known.key' ? 'Translated' : null);
            const descriptor = {
                facts: () => [{ label: 'Explicit', value: 'a' }, { labelKey: 'known.key', value: 'b' }, { labelKey: 'resource-summary.facts.last-seen', value: 'c' }, { value: 'd' }],
            };

            const facts = resourceFacts(this.owner, descriptor, {}, { translate });

            assert.deepEqual(
                facts.map((fact) => fact.label),
                ['Explicit', 'Translated', 'Last Seen', 'Value'],
                'an untranslated key is humanized from its last segment'
            );
        });

        test('without a translator the keys are humanized', function (assert) {
            const facts = resourceFacts(this.owner, { facts: () => [{ labelKey: 'resource-summary.facts.phone', value: '+1' }] }, {});

            assert.strictEqual(facts[0].label, 'Phone');
        });

        test('a related fact with no relatedType is typed by the record itself', function (assert) {
            registerResourceDescriptor(this.owner, { key: 'user', modelNames: ['user'] });

            const related = { resourceType: 'user', name: 'Ada' };
            const [fact] = resourceFacts(this.owner, { facts: () => [{ label: 'Owner', related }] }, {});

            assert.strictEqual(fact.pillComponent, 'user/pill', 'the record is resolved for its own pill');
            assert.strictEqual(fact.relatedType, null, 'no type was declared on the fact');
        });

        test('a related fact with no relatedType and no pill is titled from the record', function (assert) {
            const [fact] = resourceFacts(this.owner, { facts: () => [{ label: 'Owner', related: { name: 'Unregistered' } }] }, {});

            assert.strictEqual(fact.pillComponent, null);
            assert.strictEqual(fact.value, 'Unregistered', 'the record titles itself');
        });

        test('it stops at the limit', function (assert) {
            const descriptor = { facts: () => Array.from({ length: 10 }, (unused, index) => ({ label: `Fact ${index}`, value: index + 1 })) };

            assert.strictEqual(resourceFacts(this.owner, descriptor, {}).length, 6, 'six by default');
            assert.strictEqual(resourceFacts(this.owner, descriptor, {}, { limit: 2 }).length, 2);
        });
    });

    module('resourceSelectDetails', function () {
        test('a list is used as given', function (assert) {
            assert.deepEqual(resourceSelectDetails({ selectDetails: () => ['a', 'b'] }, {}), ['a', 'b']);
            assert.deepEqual(resourceSelectDetails({ selectDetails: () => [] }, {}), [], 'an empty list is still an answer');
        });

        test('a single value is wrapped', function (assert) {
            assert.deepEqual(resourceSelectDetails({ selectDetails: () => 'only one' }, {}), ['only one']);
        });

        test('without details it falls back to the identifier', function (assert) {
            assert.deepEqual(resourceSelectDetails({ identifier: () => 'ada@example.test' }, {}), ['ada@example.test']);
            assert.deepEqual(resourceSelectDetails(null, {}), [null], 'with nothing at all the single detail is null');
        });

        test('no record means no details', function (assert) {
            assert.deepEqual(resourceSelectDetails({ selectDetails: () => ['a'] }, null), []);
        });
    });

    module('makeTranslator', function () {
        test('it translates a key the intl service knows', function (assert) {
            const translate = makeTranslator({
                lookup: () => ({ exists: (key) => key === 'known', t: (key) => `translated:${key}` }),
            });

            assert.strictEqual(translate('known'), 'translated:known');
            assert.strictEqual(translate('unknown'), null, 'a key intl does not have is not translated');
        });

        test('an intl service without an exists check is trusted', function (assert) {
            const translate = makeTranslator({ lookup: () => ({ t: (key) => `t:${key}` }) });

            assert.strictEqual(translate('anything'), 't:anything');
        });

        test('it answers null when there is no usable intl service', function (assert) {
            assert.strictEqual(makeTranslator(null)('a.key'), null, 'no owner');
            assert.strictEqual(makeTranslator({})('a.key'), null, 'an owner that cannot look up');
            assert.strictEqual(makeTranslator({ lookup: () => null })('a.key'), null, 'no intl service');
            assert.strictEqual(makeTranslator({ lookup: () => ({}) })('a.key'), null, 'an intl service that cannot translate');
        });

        test('a lookup that throws is not an error', function (assert) {
            const translate = makeTranslator({
                lookup: () => {
                    throw new Error('no such service');
                },
            });

            assert.strictEqual(translate('a.key'), null);
        });

        test('a translation that throws is not an error', function (assert) {
            const translate = makeTranslator({
                lookup: () => ({
                    t: () => {
                        throw new Error('bad key');
                    },
                }),
            });

            assert.strictEqual(translate('a.key'), null);
        });

        test('an exists check that throws is not an error', function (assert) {
            const translate = makeTranslator({
                lookup: () => ({
                    exists: () => {
                        throw new Error('bad key');
                    },
                    t: (key) => key,
                }),
            });

            assert.strictEqual(translate('a.key'), null);
        });
    });
});
