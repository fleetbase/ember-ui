import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { scheduleOnce } from '@ember/runloop';
import { inject as service } from '@ember/service';
import { coerce, defaultsFor } from 'dummy/playground/controls';
import { decodeState, encodeState } from 'dummy/playground/state-codec';
import { summarizeArguments } from 'dummy/playground/event-sanitizer';

/**
 * The shared playground host.
 *
 * Both `/components/:slug` and `/embed/:slug` render this, with the same control state, the same
 * example adapter and the same event log — the embed route only asks for less chrome. Keeping one
 * implementation is what makes "the embed shows the same thing" true by construction rather than
 * by duplication.
 */
export default class PlaygroundHostComponent extends Component {
    @service router;
    @service theme;

    /** Current control values, keyed by control key. */
    @tracked values = {};

    /** Per-control validation messages, keyed by control key. */
    @tracked errors = {};

    /** Non-fatal notices from decoding a shared URL. */
    @tracked warnings = [];

    /** Recorded callback invocations, oldest first. */
    @tracked events = [];

    /** Selected scenario id, or null when the entry declares none. */
    @tracked scenario = null;

    /** Preview theme — 'light' or 'dark'. Local to the playground. */
    @tracked activeTheme = 'light';

    /**
     * The `state` value these values were decoded from. Not tracked: it exists to tell an
     * externally-changed URL apart from one this component just wrote.
     */
    lastAppliedState;

    seq = 0;

    /** Events recorded during a render pass, appended once it finishes. */
    pending = [];

    constructor() {
        super(...arguments);

        // Decode once, up front. Decoding inside a getter would mean assigning tracked state
        // during render, which Ember rejects as a backtracking re-render.
        this.applyState(this.args.state);
    }

    get entry() {
        return this.args.entry;
    }

    get embedded() {
        return this.args.embedded ?? false;
    }

    get currentValues() {
        return this.values;
    }

    /**
     * Adopt an incoming `state` parameter: decode it against this component's control schema and
     * replace the local values wholesale.
     */
    applyState(state) {
        const { values, warnings } = decodeState(this.args.entry.controls, state);

        this.lastAppliedState = state;
        this.values = values;
        this.warnings = warnings;
        this.errors = {};
        this.scenario = this.args.entry.scenarios?.[0]?.id ?? null;
    }

    /**
     * Re-decode only when the URL changed underneath us — a back/forward navigation or a pasted
     * link. State this component itself just wrote is ignored, so typing in a control does not
     * round-trip through the codec on every keystroke.
     */
    @action onStateChanged() {
        if (this.args.state !== this.lastAppliedState) {
            this.applyState(this.args.state);
        }
    }

    get hasControls() {
        return this.entry.controls.length > 0;
    }

    get hasScenarios() {
        return (this.entry.scenarios?.length ?? 0) > 0;
    }

    get hasEvents() {
        return (this.entry.events?.length ?? 0) > 0;
    }

    /** Controls decorated with their current value and error, for the template. */
    get controlModels() {
        const values = this.currentValues;

        return this.entry.controls.map((definition) => ({
            definition,
            value: values[definition.key],
            error: this.errors[definition.key] ?? null,
        }));
    }

    /** Newest-first view of the event log. */
    get recentEvents() {
        return [...this.events].reverse();
    }

    get encodedState() {
        return encodeState(this.entry.controls, this.currentValues);
    }

    /** The iframe URL a documentation page would embed. */
    get embedUrl() {
        const base = `${window.location.origin}${window.location.pathname}`;
        const encoded = this.encodedState;
        const hash = `#/embed/${this.entry.slug}${encoded ? `?state=${encoded}` : ''}`;

        return `${base}${hash}`;
    }

    /** A copy-pasteable invocation reflecting the non-default values currently set. */
    get usageExample() {
        const values = this.currentValues;
        const args = this.entry.controls
            .filter((definition) => !deepEqual(values[definition.key], definition.default))
            .filter((definition) => values[definition.key] !== '' && values[definition.key] !== null)
            .map((definition) => formatArg(definition, values[definition.key]));

        if (args.length === 0) {
            return `<${this.entry.component} />`;
        }

        return `<${this.entry.component}\n    ${args.join('\n    ')}\n/>`;
    }

    // ---------------------------------------------------------------- actions

    @action setControl(key, raw) {
        const definition = this.entry.controls.find((c) => c.key === key);

        if (!definition) {
            return;
        }

        const { value, error } = coerce(definition, raw);

        this.values = { ...this.values, [key]: value };
        this.errors = { ...this.errors, [key]: error };

        this.syncUrl();
    }

    /**
     * Scenarios do double duty. Fixture scenarios ("Empty state") are read by the adapter off
     * `@scenario`; preset scenarios additionally carry `values`, which are written into the
     * controls so the preset is an editable starting point rather than a locked mode.
     */
    @action setScenario(id) {
        this.scenario = id;

        const scenario = this.entry.scenarios?.find((s) => s.id === id);

        if (scenario?.values) {
            // Start from the documented defaults so switching presets does not accumulate
            // leftovers from the previously selected one.
            this.values = { ...defaultsFor(this.entry.controls), ...scenario.values };
            this.errors = {};

            this.syncUrl();
        }
    }

    @action reset() {
        this.values = defaultsFor(this.entry.controls);
        this.errors = {};
        this.warnings = [];
        this.scenario = this.entry.scenarios?.[0]?.id ?? null;

        this.syncUrl();
    }

    /**
     * Adapters call this for every component callback they forward. Arguments are summarized
     * before they are stored — the log never holds a live DOM event, record or File.
     */
    @action recordEvent(name, ...args) {
        this.seq += 1;

        // Summarize now — the arguments are only guaranteed to be meaningful at call time — but
        // append after render. Some components invoke callbacks from their constructor
        // (`layout/mobile-navbar` calls `@onSetup` there), and assigning tracked state mid-render
        // is a backtracking re-render error that takes the whole page down.
        this.pending.push({
            seq: this.seq,
            name,
            args: summarizeArguments(args),
            at: new Date().toLocaleTimeString(),
        });

        scheduleOnce('afterRender', this, this.flushEvents);
    }

    flushEvents() {
        if (this.pending.length === 0) {
            return;
        }

        this.events = [...this.events, ...this.pending];
        this.pending = [];
    }

    @action clearEvents() {
        this.events = [];
        this.pending = [];
        this.seq = 0;
    }

    @action toggleTheme() {
        this.activeTheme = this.activeTheme === 'light' ? 'dark' : 'light';
        this.theme.setTheme(this.activeTheme);
    }

    /**
     * Push the encoded control state into the URL so the page is shareable and survives a revisit.
     * `replace` keeps control fiddling out of the browser's back history.
     */
    syncUrl() {
        const state = this.encodedState;

        this.lastAppliedState = state;

        try {
            this.router.replaceWith({ queryParams: { state } });
        } catch {
            // A transition can be rejected mid-teardown; the preview is still correct without it.
        }
    }
}

function deepEqual(a, b) {
    if (a === b) {
        return true;
    }

    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch {
        return false;
    }
}

function formatArg(definition, value) {
    if (typeof value === 'boolean' || typeof value === 'number') {
        return `@${definition.key}={{${value}}}`;
    }

    if (value === null) {
        return `@${definition.key}={{null}}`;
    }

    if (typeof value === 'object') {
        return `@${definition.key}={{this.${definition.key}}}`;
    }

    return `@${definition.key}=${JSON.stringify(String(value))}`;
}
