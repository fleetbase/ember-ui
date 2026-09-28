import Service from '@ember/service';

/**
 * Stub of the host console's `currentUser` service with fixed, deterministic identity data.
 * `getOption`/`setOption` back onto a plain `options` object.
 */
export default class CurrentUserService extends Service {
    calls = [];

    id = 'test-user-1';
    name = 'Test User';
    email = 'test.user@example.test';
    phone = '+15555550100';
    companyId = 'test-company-1';
    companyName = 'Test Company';
    roleName = 'Administrator';
    isAdmin = true;
    avatarUrl = '/images/no-avatar.png';
    organizations = [];

    options = {};

    company = {
        id: 'test-company-1',
        public_id: 'company_test',
        name: 'Test Company',
    };

    getOption(key, defaultValue = null) {
        this.calls.push({ method: 'getOption', args: [key, defaultValue] });
        return this.options[key] ?? defaultValue;
    }

    setOption(key, value) {
        this.calls.push({ method: 'setOption', args: [key, value] });
        this.options[key] = value;
        return value;
    }

    getCompany() {
        this.calls.push({ method: 'getCompany', args: [] });
        return this.company;
    }

    loadCompany() {
        this.calls.push({ method: 'loadCompany', args: [] });
        return Promise.resolve(this.company);
    }
}
