import { module, test } from 'qunit';
import buildCoreResourceDescriptors, { fileExtension, isImageFile, fileIcon } from '@fleetbase/ember-ui/utils/resource-descriptors/core';

function descriptor(key) {
    return buildCoreResourceDescriptors().find((entry) => entry.key === key);
}

function fact(descriptorKey, record, label) {
    return descriptor(descriptorKey)
        .facts(record)
        .find((entry) => entry.label === label);
}

function factValue(descriptorKey, record, label) {
    return fact(descriptorKey, record, label)?.value ?? null;
}

module('Unit | Utility | resource-descriptors/core', function () {
    module('the file helpers', function () {
        test('fileExtension reads the first present name path', function (assert) {
            assert.strictEqual(fileExtension({ original_filename: 'report.PDF' }), 'pdf', 'the extension is lowercased');
            assert.strictEqual(fileExtension({ url: 'https://example.test/a/b/photo.jpeg' }), 'jpeg', 'the url is used when there is no filename');
            assert.strictEqual(fileExtension({ path: 'folder/notes.md' }), 'md', 'the path is the last resort');
            assert.strictEqual(fileExtension({ original_filename: '  ', url: 'x/y.zip' }), 'zip', 'a blank name is not "present" and falls through');
        });

        test('fileExtension ignores a query string', function (assert) {
            assert.strictEqual(fileExtension({ url: 'https://example.test/photo.png?signature=abc.def' }), 'png', 'the extension comes from the path, not the query');
        });

        test('fileExtension answers null when there is no usable name', function (assert) {
            assert.strictEqual(fileExtension({}), null, 'nothing to read');
            assert.strictEqual(fileExtension(null), null, 'a missing file is not an error');
            assert.strictEqual(fileExtension(undefined), null);
            assert.strictEqual(fileExtension({ original_filename: 'no-extension' }), null, 'a name without a suffix has no extension');
            assert.strictEqual(fileExtension({ original_filename: 12345 }), null, 'a non-string name is not parsed');
        });

        test('isImageFile trusts the content type when there is one', function (assert) {
            assert.true(isImageFile({ content_type: 'image/png' }));
            assert.false(isImageFile({ content_type: 'application/pdf' }));
            assert.false(isImageFile({ content_type: 'application/pdf', original_filename: 'actually.png' }), 'the declared type wins over the extension');
        });

        test('isImageFile falls back to the extension without a content type', function (assert) {
            assert.true(isImageFile({ original_filename: 'photo.PNG' }));
            assert.true(isImageFile({ url: 'a/b.avif' }));
            assert.false(isImageFile({ original_filename: 'report.pdf' }));
            assert.false(isImageFile({}), 'nothing to go on is not an image');
            assert.false(isImageFile(null));
        });

        test('fileIcon maps known extensions and falls back to a plain file', function (assert) {
            assert.strictEqual(fileIcon({ original_filename: 'sheet.xlsx' }), 'file-excel');
            assert.strictEqual(fileIcon({ original_filename: 'data.csv' }), 'file-csv');
            assert.strictEqual(fileIcon({ original_filename: 'letter.docx' }), 'file-word');
            assert.strictEqual(fileIcon({ original_filename: 'report.pdf' }), 'file-pdf');
            assert.strictEqual(fileIcon({ original_filename: 'deck.pptx' }), 'file-powerpoint');
            assert.strictEqual(fileIcon({ original_filename: 'bundle.tar' }), 'file-zipper');
            assert.strictEqual(fileIcon({ original_filename: 'clip.mov' }), 'file-video');
            assert.strictEqual(fileIcon({ original_filename: 'song.wav' }), 'file-audio');
            assert.strictEqual(fileIcon({ original_filename: 'notes.txt' }), 'file-lines');
            assert.strictEqual(fileIcon({ original_filename: 'data.json' }), 'file-code');
            assert.strictEqual(fileIcon({ original_filename: 'thing.unknown' }), 'file', 'an unknown extension gets the generic icon');
            assert.strictEqual(fileIcon({}), 'file', 'so does a file with no name at all');
        });
    });

    module('the user descriptor', function () {
        test('it titles the user by name, then email, then public id', function (assert) {
            const { title } = descriptor('user');

            assert.strictEqual(title({ name: 'Ada', email: 'ada@example.test', public_id: 'u_1' }), 'Ada');
            assert.strictEqual(title({ email: 'ada@example.test', public_id: 'u_1' }), 'ada@example.test');
            assert.strictEqual(title({ public_id: 'u_1' }), 'u_1');
            assert.strictEqual(title({}), null);
        });

        test('it identifies the user by email, then phone', function (assert) {
            const { identifier } = descriptor('user');

            assert.strictEqual(identifier({ email: 'ada@example.test', phone: '+1' }), 'ada@example.test');
            assert.strictEqual(identifier({ phone: '+1' }), '+1');
            assert.strictEqual(identifier({}), null);
        });

        test('it takes the avatar as a round image', function (assert) {
            assert.deepEqual(descriptor('user').image({ avatar_url: '/img/ada.png' }), { url: '/img/ada.png', shape: 'round' });
        });

        test('online reads is_online first, then online, and only booleans count', function (assert) {
            const { online } = descriptor('user');

            assert.true(online({ is_online: true, online: false }), 'is_online wins');
            assert.false(online({ online: false }), 'online is used when is_online is absent');
            assert.strictEqual(online({}), undefined, 'nothing known means undefined, not false');
            assert.strictEqual(online({ is_online: 'yes' }), undefined, 'a non-boolean is not an answer');
        });

        test('status and selectDetails read their paths', function (assert) {
            const user = { status: 'active', email: 'ada@example.test', phone: '+1' };

            assert.strictEqual(descriptor('user').status(user), 'active');
            assert.strictEqual(descriptor('user').status({ session_status: 'idle' }), 'idle', 'the session status is the fallback');
            assert.deepEqual(descriptor('user').selectDetails(user), ['ada@example.test', '+1']);
            assert.deepEqual(descriptor('user').selectDetails({}), [null, null]);
        });

        test('its facts cover the contact, role, company, last seen and status', function (assert) {
            const user = {
                email: 'ada@example.test',
                phone: '+1',
                role_name: 'Admin',
                company_name: 'Fleetbase',
                last_seen_at: '2026-01-01',
                status: 'active',
            };

            assert.strictEqual(factValue('user', user, 'Email'), 'ada@example.test');
            assert.strictEqual(factValue('user', user, 'Phone'), '+1');
            assert.strictEqual(factValue('user', user, 'Role'), 'Admin');
            assert.strictEqual(factValue('user', user, 'Company'), 'Fleetbase');
            assert.strictEqual(factValue('user', user, 'Last seen'), '2026-01-01');
            assert.strictEqual(fact('user', user, 'Last seen').format, 'date');
            assert.strictEqual(factValue('user', user, 'Status'), 'active');
            assert.strictEqual(fact('user', user, 'Status').format, 'humanize');
        });

        test('its facts fall through the nested and dated alternatives', function (assert) {
            const user = { 'role.name': undefined, role: { name: 'Nested role' }, company: { name: 'Nested co' }, last_login: '2025-12-31' };

            assert.strictEqual(factValue('user', user, 'Role'), 'Nested role', 'the related role name is read by path');
            assert.strictEqual(factValue('user', user, 'Company'), 'Nested co');
            assert.strictEqual(factValue('user', user, 'Last seen'), '2025-12-31', 'last_login stands in for last_seen_at');
            assert.strictEqual(factValue('user', { created_at: '2025-01-01' }, 'Last seen'), '2025-01-01', 'and created_at is the last resort');
        });
    });

    module('the company descriptor', function () {
        test('it titles and identifies the company', function (assert) {
            assert.strictEqual(descriptor('company').title({ name: 'Fleetbase' }), 'Fleetbase');
            assert.strictEqual(descriptor('company').title({ public_id: 'co_1' }), 'co_1');
            assert.strictEqual(descriptor('company').identifier({ public_id: 'company_abc' }), 'company_abc');
            assert.strictEqual(descriptor('company').identifier({ slug: 'fleetbase' }), 'fleetbase', 'the slug stands in for a public id');
        });

        test('a uuid identifier is withheld rather than shown', function (assert) {
            assert.strictEqual(descriptor('company').identifier({ public_id: '9d2c6c5e-1b2a-4c3d-8e4f-1234567890ab' }), null, 'safeIdentifier drops a raw uuid');
        });

        test('it takes the logo as a square image', function (assert) {
            assert.deepEqual(descriptor('company').image({ logo_url: '/img/logo.png' }), { url: '/img/logo.png', shape: 'square' });
        });

        test('status and selectDetails read their paths', function (assert) {
            assert.strictEqual(descriptor('company').status({ status: 'active' }), 'active');
            assert.deepEqual(descriptor('company').selectDetails({ country: 'SG', timezone: 'Asia/Singapore' }), ['SG', 'Asia/Singapore']);
        });

        test('its facts carry the owner as a related user and count the members', function (assert) {
            const company = { owner: { name: 'Ada' }, owner_name: 'Ada', users_count: 12, country: 'SG', timezone: 'Asia/Singapore', status: 'active' };

            assert.deepEqual(fact('company', company, 'Owner').related, { name: 'Ada' }, 'the owner record travels with the fact');
            assert.strictEqual(fact('company', company, 'Owner').relatedType, 'user');
            assert.strictEqual(factValue('company', company, 'Owner'), 'Ada');
            assert.strictEqual(factValue('company', company, 'Members'), 12, 'the count path is used when it is a number');
            assert.strictEqual(factValue('company', company, 'Country'), 'SG');
            assert.strictEqual(factValue('company', company, 'Timezone'), 'Asia/Singapore');
            assert.strictEqual(factValue('company', company, 'Status'), 'active');
        });

        test('members fall back to the length of the relation, then to nothing', function (assert) {
            assert.strictEqual(factValue('company', { users: [{}, {}, {}] }, 'Members'), 3, 'the loaded relation is counted');
            assert.strictEqual(factValue('company', {}, 'Members'), null, 'with neither a count nor a relation there is no number');
            assert.strictEqual(factValue('company', { users_count: 'many' }, 'Members'), null, 'a non-numeric count is not a count');
        });
    });

    module('the group descriptor', function () {
        test('it titles the group and pluralises its member count', function (assert) {
            assert.strictEqual(descriptor('group').title({ name: 'Dispatch' }), 'Dispatch');
            assert.strictEqual(descriptor('group').title({ public_id: 'grp_1' }), 'grp_1');
            assert.strictEqual(descriptor('group').identifier({ users_count: 1 }), '1 member', 'one member is singular');
            assert.strictEqual(descriptor('group').identifier({ users_count: 4 }), '4 members');
            assert.strictEqual(descriptor('group').identifier({ users: [] }), '0 members', 'an empty relation still counts');
            assert.strictEqual(descriptor('group').identifier({}), null, 'nothing to count means no identifier');
        });

        test('it always uses the group icon', function (assert) {
            assert.deepEqual(descriptor('group').image({}), { icon: 'users' });
        });

        test('selectDetails and facts read the description, members and created date', function (assert) {
            const group = { description: 'The dispatch team', users_count: 4, created_at: '2026-01-01' };

            assert.deepEqual(descriptor('group').selectDetails(group), ['The dispatch team']);
            assert.strictEqual(factValue('group', group, 'Description'), 'The dispatch team');
            assert.strictEqual(factValue('group', group, 'Members'), 4);
            assert.strictEqual(factValue('group', group, 'Created'), '2026-01-01');
            assert.strictEqual(fact('group', group, 'Created').format, 'date');
        });
    });

    module('the role descriptor', function () {
        test('it titles and identifies the role', function (assert) {
            assert.strictEqual(descriptor('role').title({ name: 'Administrator' }), 'Administrator');
            assert.strictEqual(descriptor('role').title({ public_id: 'role_1' }), 'role_1');
            assert.strictEqual(descriptor('role').identifier({ guard_name: 'web' }), 'web');
            assert.strictEqual(descriptor('role').identifier({ type: 'system' }), 'system', 'the type stands in for the guard');
            assert.strictEqual(descriptor('role').identifier({}), null);
        });

        test('it always uses the role icon', function (assert) {
            assert.deepEqual(descriptor('role').image({}), { icon: 'user-shield' });
        });

        test('selectDetails and facts read the description, guard and counts', function (assert) {
            const role = { description: 'Full access', guard_name: 'web', policies_count: 3, permissions: [{}, {}] };

            assert.deepEqual(descriptor('role').selectDetails(role), ['Full access', 'web']);
            assert.strictEqual(factValue('role', role, 'Description'), 'Full access');
            assert.strictEqual(factValue('role', role, 'Guard'), 'web');
            assert.strictEqual(factValue('role', role, 'Policies'), 3);
            assert.strictEqual(factValue('role', role, 'Permissions'), 2, 'the loaded relation is counted');
        });
    });

    module('the file descriptor', function () {
        test('it titles and identifies the file', function (assert) {
            assert.strictEqual(descriptor('file').title({ original_filename: 'report.pdf' }), 'report.pdf');
            assert.strictEqual(descriptor('file').title({ caption: 'The report' }), 'The report');
            assert.strictEqual(descriptor('file').title({ url: 'a/b.pdf' }), 'a/b.pdf');
            assert.strictEqual(descriptor('file').title({ public_id: 'file_1' }), 'file_1');
            assert.strictEqual(descriptor('file').identifier({ content_type: 'application/pdf' }), 'application/pdf');
            assert.strictEqual(descriptor('file').identifier({ type: 'document' }), 'document');
        });

        test('an image with a url is shown, anything else gets an icon', function (assert) {
            assert.deepEqual(descriptor('file').image({ content_type: 'image/png', url: '/img/a.png' }), { url: '/img/a.png', shape: 'square' });
            assert.deepEqual(descriptor('file').image({ content_type: 'image/png' }), { icon: 'file' }, 'an image with no url falls back to an icon');
            assert.deepEqual(descriptor('file').image({ original_filename: 'report.pdf', url: '/a.pdf' }), { icon: 'file-pdf' }, 'a non-image gets its type icon');
        });

        test('selectDetails drops the parts that are not there', function (assert) {
            assert.deepEqual(descriptor('file').selectDetails({ content_type: 'application/pdf', file_size: 2048 }), ['application/pdf', 2048]);
            assert.deepEqual(descriptor('file').selectDetails({ content_type: 'application/pdf' }), ['application/pdf'], 'a missing size is dropped');
            assert.deepEqual(descriptor('file').selectDetails({ content_type: 'application/pdf', file_size: 'big' }), ['application/pdf'], 'a non-numeric size is not a size');
            assert.deepEqual(descriptor('file').selectDetails({}), []);
        });

        test('its facts carry the type, size and uploader', function (assert) {
            const file = { content_type: 'application/pdf', file_size: 2048, uploader: { name: 'Ada' }, uploader_name: 'Ada', created_at: '2026-01-01' };

            assert.strictEqual(factValue('file', file, 'Type'), 'application/pdf');
            assert.strictEqual(factValue('file', file, 'Size'), 2048);
            assert.strictEqual(fact('file', file, 'Size').format, 'bytes');
            assert.deepEqual(fact('file', file, 'Uploaded by').related, { name: 'Ada' });
            assert.strictEqual(fact('file', file, 'Uploaded by').relatedType, 'user');
            assert.strictEqual(factValue('file', file, 'Uploaded'), '2026-01-01');
        });

        test('a file can be opened only when it has a url', function (assert) {
            assert.true(descriptor('file').canOpen({ url: 'https://example.test/a.pdf' }));
            assert.false(descriptor('file').canOpen({}));
            assert.false(descriptor('file').canOpen({ url: '   ' }), 'a blank url is not a url');
            assert.false(descriptor('file').canOpen(null), 'a missing file is not an error');
        });

        test('opening a file opens its url in a new tab', function (assert) {
            const opened = [];
            const nativeOpen = window.open;
            window.open = (...args) => opened.push(args);

            try {
                assert.true(descriptor('file').open({ url: 'https://example.test/a.pdf' }), 'it reports that it handled the open');
                assert.deepEqual(opened, [['https://example.test/a.pdf', '_blank', 'noopener']]);

                assert.false(descriptor('file').open({}), 'with no url there is nothing to open');
                assert.strictEqual(opened.length, 1, 'and no window was opened');
            } finally {
                window.open = nativeOpen;
            }
        });
    });

    module('the category descriptor', function () {
        test('it titles and identifies the category', function (assert) {
            assert.strictEqual(descriptor('category').title({ name: 'Parts' }), 'Parts');
            assert.strictEqual(descriptor('category').title({ slug: 'parts' }), 'parts');
            assert.strictEqual(descriptor('category').title({ public_id: 'cat_1' }), 'cat_1');
            assert.strictEqual(descriptor('category').identifier({ for: 'vehicle' }), 'vehicle');
            assert.strictEqual(descriptor('category').identifier({ slug: 'parts' }), 'parts');
        });

        test('its image prefers an icon, then an icon url, then the folder default', function (assert) {
            assert.deepEqual(descriptor('category').image({ icon: 'wrench', icon_url: '/img/a.png' }), { icon: 'wrench' }, 'a named icon wins');
            assert.deepEqual(descriptor('category').image({ icon_url: '/img/a.png' }), { url: '/img/a.png', shape: 'square' });
            assert.deepEqual(descriptor('category').image({}), { icon: 'folder' });
            assert.deepEqual(descriptor('category').image({ icon: '  ' }), { icon: 'folder' }, 'a blank icon is not an icon');
        });

        test('selectDetails and facts read the parent, scope, icon and description', function (assert) {
            const category = { parent: { name: 'Tools' }, parent_name: 'Tools', for: 'vehicle', icon: 'wrench', icon_color: 'red', description: 'Spare parts' };

            assert.deepEqual(descriptor('category').selectDetails(category), ['vehicle', 'Spare parts']);
            assert.deepEqual(fact('category', category, 'Parent').related, { name: 'Tools' });
            assert.strictEqual(fact('category', category, 'Parent').relatedType, 'category');
            assert.strictEqual(factValue('category', category, 'Parent'), 'Tools');
            assert.strictEqual(factValue('category', category, 'For'), 'vehicle');
            assert.strictEqual(factValue('category', { owner_type: 'Fleet' }, 'For'), 'Fleet', 'the owner type stands in');
            assert.strictEqual(factValue('category', category, 'Icon'), 'wrench');
            assert.strictEqual(factValue('category', category, 'Colour'), 'red');
            assert.strictEqual(factValue('category', category, 'Description'), 'Spare parts');
        });
    });

    test('every core descriptor is registered under a distinct key with a label and an icon', function (assert) {
        const descriptors = buildCoreResourceDescriptors();
        const keys = descriptors.map((entry) => entry.key);

        assert.deepEqual(keys, ['user', 'company', 'group', 'role', 'file', 'category']);
        assert.strictEqual(new Set(keys).size, keys.length, 'the keys are distinct');

        descriptors.forEach((entry) => {
            assert.ok(entry.labelKey, `${entry.key} carries a translation key`);
            assert.ok(entry.icon, `${entry.key} carries an icon`);
            assert.true(Array.isArray(entry.modelNames), `${entry.key} carries a model name list`);
            assert.ok(entry.modelNames.length, `${entry.key} names its models`);
            assert.true(Array.isArray(entry.polymorphicTypes), `${entry.key} carries a polymorphic type list`);
            assert.ok(entry.polymorphicTypes.length, `${entry.key} names its polymorphic types`);
        });
    });
});
