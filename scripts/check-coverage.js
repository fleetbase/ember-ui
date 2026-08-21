'use strict';

/**
 * Coverage gate for @fleetbase/ember-ui.
 *
 * Reads the json-summary report produced by ember-cli-code-coverage and fails
 * (exit code 1) unless:
 *
 *   1. Global statements, branches, functions and lines are each exactly 100%.
 *   2. Every file entry in the report is at 100% for all four metrics.
 *   3. Every eligible first-party source file under addon/ appears in the
 *      report — so untested/unimported files can never silently drop out of
 *      the denominator.
 */

const fs = require('fs');
const path = require('path');

const METRICS = ['statements', 'branches', 'functions', 'lines'];

function listSourceFiles(sourceRoot) {
    const results = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
                results.push(fullPath);
            }
        }
    };
    walk(sourceRoot);
    return results.sort();
}

/**
 * Whether a coverage metric counts as fully covered.
 *
 * Compares covered/total rather than reading `pct`, because istanbul reports a
 * file with no executable code (an empty Glimmer component class, for example)
 * as 0/0 with `pct: 0`. Such a file is vacuously covered — there is nothing in
 * it that a test could execute — and 30 addon files are in exactly that shape,
 * so a pct-based check could never reach 100%.
 *
 * @param {{covered: number, total: number}} metric
 * @returns {boolean}
 */
function isFullyCovered(metric) {
    if (!metric || typeof metric.total !== 'number' || typeof metric.covered !== 'number') {
        return false;
    }

    return metric.covered === metric.total;
}

function normalize(filePath, projectRoot) {
    return path.relative(projectRoot, path.resolve(projectRoot, filePath)).split(path.sep).join('/');
}

function checkCoverage({ summaryPath, sourceRoot, projectRoot }) {
    const failures = [];

    if (!fs.existsSync(summaryPath)) {
        return { ok: false, failures: [`coverage summary not found at ${summaryPath} — run the coverage suite first`] };
    }

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

    const total = summary.total;
    if (!total) {
        failures.push(`coverage summary at ${summaryPath} has no "total" entry`);
        return { ok: false, failures };
    }

    const reported = new Map();
    for (const [key, entry] of Object.entries(summary)) {
        if (key === 'total') {
            continue;
        }

        const relative = normalize(key, projectRoot);

        // Only gate on THIS package's own source. A pnpm workspace link (e.g. @fleetbase/ember-core)
        // is instrumented by the same build and lands in the report as `../ember-core/...`; holding
        // a sibling package to this package's threshold buries the real signal in hundreds of
        // foreign failures.
        if (relative.startsWith('../')) {
            continue;
        }

        reported.set(relative, entry);
    }

    // Global totals recomputed from first-party entries only. `summary.total` is istanbul's,
    // which sums every instrumented file including workspace-linked siblings.
    for (const metric of METRICS) {
        let covered = 0;
        let count = 0;
        for (const entry of reported.values()) {
            covered += entry[metric].covered;
            count += entry[metric].total;
        }
        const pct = count === 0 ? 100 : Math.round((covered / count) * 10000) / 100;
        if (covered !== count) {
            failures.push(`global ${metric} coverage is ${pct}% (${covered}/${count}) — must be 100%`);
        }
    }

    for (const [file, entry] of reported) {
        for (const metric of METRICS) {
            if (!isFullyCovered(entry[metric])) {
                failures.push(`${file}: ${metric} at ${entry[metric].pct}% (${entry[metric].covered}/${entry[metric].total}) — must be 100%`);
            }
        }
    }

    for (const sourceFile of listSourceFiles(sourceRoot)) {
        const relative = normalize(sourceFile, projectRoot);
        if (!reported.has(relative)) {
            failures.push(`${relative} is missing from the coverage report — every eligible addon file must be instrumented`);
        }
    }

    return { ok: failures.length === 0, failures };
}

function main(argv) {
    const projectRoot = process.cwd();
    const summaryPath = path.resolve(projectRoot, argv[2] || 'coverage/coverage-summary.json');
    const sourceRoot = path.resolve(projectRoot, argv[3] || 'addon');

    const { ok, failures } = checkCoverage({ summaryPath, sourceRoot, projectRoot });

    if (!ok) {
        console.error(`Coverage gate failed with ${failures.length} problem(s):`);
        for (const failure of failures) {
            console.error(`  - ${failure}`);
        }
        return 1;
    }

    console.log('Coverage gate passed: 100% statements, branches, functions and lines across all addon files.');
    return 0;
}

module.exports = { checkCoverage, listSourceFiles, isFullyCovered, METRICS };

if (require.main === module) {
    process.exitCode = main(process.argv);
}
