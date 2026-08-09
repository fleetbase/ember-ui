import Application from 'dummy/app';
import config from 'dummy/config/environment';
import * as QUnit from 'qunit';
import { setApplication } from '@ember/test-helpers';
import { setup } from 'qunit-dom';
import { start } from 'ember-qunit';
import { forceModulesToBeLoaded, sendCoverage } from 'ember-cli-code-coverage/test-support';

setApplication(Application.create(config.APP));

setup(QUnit.assert);

// When running with COVERAGE=true, evaluate every bundled module after the
// suite finishes so files no test imported still appear in the coverage
// denominator, then post the collected coverage to the reporting middleware.
QUnit.done(async function () {
    forceModulesToBeLoaded();
    await sendCoverage();
});

start();
