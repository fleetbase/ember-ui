'use strict';

/**
 * Self-test for scripts/check-coverage.js. Run with:
 *
 *   node scripts/check-coverage-test.js
 *
 * Verifies the gate passes on a fully-covered summary and fails on partial
 * coverage, missing files, and a missing summary.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { checkCoverage, isFullyCovered } = require('./check-coverage');

function emptyMetric() {
    // How istanbul reports a file with no executable code: 0/0 with pct 0.
    return { total: 0, covered: 0, skipped: 0, pct: 0 };
}

function emptyEntry() {
    return { statements: emptyMetric(), branches: emptyMetric(), functions: emptyMetric(), lines: emptyMetric() };
}

function metric(covered, total) {
    return { total, covered, skipped: 0, pct: total === 0 ? 100 : Math.round((covered / total) * 10000) / 100 };
}

function fullEntry() {
    return { statements: metric(4, 4), branches: metric(2, 2), functions: metric(1, 1), lines: metric(4, 4) };
}

function partialEntry() {
    return { statements: metric(2, 4), branches: metric(1, 2), functions: metric(1, 1), lines: metric(2, 4) };
}

function withFixture(callback) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-gate-'));
    try {
        fs.mkdirSync(path.join(root, 'addon', 'utils'), { recursive: true });
        fs.writeFileSync(path.join(root, 'addon', 'utils', 'covered.js'), 'export default 1;\n');
        callback(root);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

function writeSummary(root, summary) {
    const summaryPath = path.join(root, 'coverage-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary));
    return summaryPath;
}

function runCase(root, summary) {
    return checkCoverage({
        summaryPath: writeSummary(root, summary),
        sourceRoot: path.join(root, 'addon'),
        projectRoot: root,
    });
}

// 1. Fully covered summary that includes every source file → passes.
withFixture((root) => {
    const result = runCase(root, { total: fullEntry(), 'addon/utils/covered.js': fullEntry() });
    assert.strictEqual(result.ok, true, `expected pass, got failures: ${result.failures.join('; ')}`);
});

// 2. Global totals are RECOMPUTED from first-party files, so a partial file drives the global
//    failure and istanbul's own `total` (which counts workspace siblings too) is ignored.
withFixture((root) => {
    const result = runCase(root, { total: fullEntry(), 'addon/utils/covered.js': partialEntry() });
    assert.strictEqual(result.ok, false, 'expected a partial first-party file to fail the global check');
    assert.ok(
        result.failures.some((failure) => failure.includes('global statements coverage is 50%')),
        `expected a global statements failure, got: ${result.failures.join('; ')}`
    );
    assert.ok(
        result.failures.some((failure) => failure.includes('global branches coverage is 50%')),
        `expected a global branches failure, got: ${result.failures.join('; ')}`
    );
});

// 3. A single file below 100% → fails per-file even if rounding hid it globally.
withFixture((root) => {
    const result = runCase(root, { total: fullEntry(), 'addon/utils/covered.js': partialEntry() });
    assert.strictEqual(result.ok, false, 'expected per-file partial coverage to fail');
    assert.ok(
        result.failures.some((failure) => failure.startsWith('addon/utils/covered.js: statements at 50%')),
        `expected a per-file failure, got: ${result.failures.join('; ')}`
    );
});

// 4. Source file absent from the report → fails the denominator check.
withFixture((root) => {
    const result = runCase(root, { total: fullEntry() });
    assert.strictEqual(result.ok, false, 'expected missing source file to fail');
    assert.ok(
        result.failures.some((failure) => failure.includes('addon/utils/covered.js is missing from the coverage report')),
        `expected a missing-file failure, got: ${result.failures.join('; ')}`
    );
});

// 5. Missing summary file → fails with guidance instead of throwing.
withFixture((root) => {
    const result = checkCoverage({
        summaryPath: path.join(root, 'does-not-exist.json'),
        sourceRoot: path.join(root, 'addon'),
        projectRoot: root,
    });
    assert.strictEqual(result.ok, false, 'expected missing summary to fail');
    assert.ok(result.failures[0].includes('coverage summary not found'), `unexpected failure: ${result.failures[0]}`);
});

// 6. Absolute report keys (as emitted by some reporters) still match sources.
withFixture((root) => {
    const absoluteKey = path.join(root, 'addon', 'utils', 'covered.js');
    const result = runCase(root, { total: fullEntry(), [absoluteKey]: fullEntry() });
    assert.strictEqual(result.ok, true, `expected absolute keys to pass, got: ${result.failures.join('; ')}`);
});

// 7. A file with no executable code (0/0, which istanbul reports as pct 0) is
//    vacuously covered and must not fail the gate.
withFixture((root) => {
    const result = runCase(root, { total: fullEntry(), 'addon/utils/covered.js': emptyEntry() });
    assert.strictEqual(result.ok, true, `expected an empty file to pass, got: ${result.failures.join('; ')}`);
});

// 8. isFullyCovered compares covered/total rather than trusting pct.
assert.strictEqual(isFullyCovered({ total: 0, covered: 0, pct: 0 }), true, '0/0 is fully covered');
assert.strictEqual(isFullyCovered({ total: 4, covered: 4, pct: 100 }), true, '4/4 is fully covered');
assert.strictEqual(isFullyCovered({ total: 4, covered: 3, pct: 75 }), false, '3/4 is not fully covered');
assert.strictEqual(isFullyCovered(undefined), false, 'a missing metric is not fully covered');
assert.strictEqual(isFullyCovered({}), false, 'a malformed metric is not fully covered');

// 9. A zero-total global entry still fails when a file below it is partial, so
//    the empty-file allowance cannot be used to hide real gaps.
withFixture((root) => {
    const result = runCase(root, { total: fullEntry(), 'addon/utils/covered.js': partialEntry() });
    assert.strictEqual(result.ok, false, 'a partial file still fails alongside empty ones');
});

// 10. A workspace-linked sibling package (`../ember-core/...`) is instrumented by the same
//     build. It must not be gated, and must not pollute the recomputed global total.
withFixture((root) => {
    const result = runCase(root, {
        total: partialEntry(),
        'addon/utils/covered.js': fullEntry(),
        '../ember-core/addon/abilities/dynamic.js': partialEntry(),
    });
    assert.strictEqual(result.ok, true, 'a partial sibling package neither fails the gate nor drags the global total down');
    assert.strictEqual(result.failures.filter((f) => f.includes('ember-core')).length, 0, 'and it is never named in the failures');
});

console.log('check-coverage self-test passed (10 cases).');
