import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { debug } from '@ember/debug';
import { isArray } from '@ember/array';
import { capitalize } from '@ember/string';
import { htmlSafe } from '@ember/template';
import { task } from 'ember-concurrency';
import { parseISO, isDate, isValid, format, formatDistanceToNow } from 'date-fns';
import smartHumanize from '../utils/smart-humanize';

export default class ActivityLogComponent extends Component {
    @service store;
    @tracked activities = [];
    @tracked expanded = new Set();
    @tracked dateFilter = null;
    @tracked query = null;

    // Optional style “knobs” (you can pass in from the parent)
    get density() {
        return this.args.density ?? 'compact';
    } // 'cozy'|'compact'
    get showAvatars() {
        return this.args.showAvatars ?? true;
    }
    get showBadges() {
        return this.args.showBadges ?? true;
    }

    get groups() {
        const activities = isArray(this.activities) ? this.activities : [];

        const normalized = activities.map((a, i) => this.#normalizeActivity(a, i)).sort((a, b) => (b.timestamp?.dateMs ?? 0) - (a.timestamp?.dateMs ?? 0));

        const byDay = new Map();
        for (const item of normalized) {
            const key = item.dayKey ?? 'unknown';
            if (!byDay.has(key)) byDay.set(key, { dateLabel: item.dayLabel ?? key, items: [] });
            byDay.get(key).items.push(item);
        }
        return [...byDay.values()];
    }

    constructor() {
        super(...arguments);
        this.loadActivities.perform();
    }

    // ── Data ────────────────────────────────────────────────────────────────────
    @task *loadActivities() {
        try {
            const params = {};
            if (this.args.subjectId) params.subject_id = this.args.subjectId;
            if (this.args.causerId) params.causer_id = this.args.causerId;
            if (this.dateFilter) params.created_at = this.dateFilter;

            const activities = yield this.store.query('activity', params);
            this.activities = activities.toArray();
        } catch (err) {
            debug('Failed to load activities: ' + err.message);
        }
    }

    @action reload() {
        this.loadActivities.perform();
    }

    @action setDateFilter({ formattedDate }) {
        this.dateFilter = formattedDate;
        this.loadActivities.perform();
    }

    @action onCauserClick(causer) {
        if (typeof this.args.onCauserClick === 'function') this.args.onCauserClick(causer);
    }

    @action onSubjectClick(subject) {
        if (typeof this.args.onSubjectClick === 'function') this.args.onSubjectClick(subject);
    }

    @action toggleAdvanced(itemKey) {
        const next = new Set(this.expanded);
        next.has(itemKey) ? next.delete(itemKey) : next.add(itemKey);
        this.expanded = next;
    }

    // ── Normalize & Phrase ──────────────────────────────────────────────────────
    #normalizeActivity(activity, idx = 0) {
        const createdISO = activity?.created_at ?? null;
        const updatedISO = activity?.updated_at ?? null;
        const tsISO = createdISO ?? updatedISO ?? null;

        const d = this.#parseDate(tsISO);
        const dateMs = d ? d.getTime() : 0;
        const dayKey = d ? format(d, 'yyyy-MM-dd') : 'unknown';
        const dayLabel = d ? format(d, 'EEE, MMM dd, yyyy') : 'Unknown date';
        const exactLocal = d ? format(d, 'PP p') : '';
        const relative = d ? formatDistanceToNow(d, { addSuffix: true }) : '';

        const causer = activity?.causer ?? {};
        const subject = activity?.subject ?? {};
        const subjectTypeLabel = activity?.humanized_subject_type ?? this.#subjectTypeLabel(activity?.subject_type);
        const subjectDisplay = this.#subjectDisplay(subject);
        const event = String(activity?.event || '').toLowerCase();

        const eventLabel = capitalize(event || 'updated');
        const verb = this.#eventToVerb(event, activity?.description);

        // Diffs → split into simple vs advanced, and also build a human inline sentence
        const allChanges = this.#computeChanges(activity?.properties);
        const simpleChanges = [];
        const advancedChanges = [];

        for (const c of allChanges) {
            if (this.#isAdvancedValue(c.fromRaw, c.toRaw) || this.#isLikelyUuidKey(c.key)) {
                advancedChanges.push(c);
            } else {
                simpleChanges.push(c);
            }
        }

        const inlineSummary = this.#summarizeSimple(simpleChanges);

        const sentence = `${causer?.name ?? 'Someone'} ${verb} ${subjectTypeLabel} (${subjectDisplay})`;

        // Event → badge style (Fleetbase-ish accent mapping)
        const badge = this.#eventBadge(event);

        return {
            key: `${dayKey}-${idx}`,
            actor: {
                name: causer?.name ?? 'Unknown',
                avatarUrl: causer?.avatar_url ?? null,
                raw: causer,
            },
            subject,
            causer,
            verb,
            event,
            eventLabel,
            badge, // {text, class}
            subjectTypeLabel,
            subjectDisplay,
            sentence,
            inlineSummary, // "set color to red; status to live"
            timestamp: {
                iso: tsISO,
                exactLocal,
                relative,
                dateMs,
            },
            dayKey,
            dayLabel,
            simpleChanges,
            advancedChanges,
            raw: activity,
        };
    }

    #summarizeSimple(simpleChanges) {
        if (!simpleChanges?.length) return '';

        const parts = [];
        for (const c of simpleChanges) {
            const k = c.key.replace(/_/g, ' ');

            if (c.from !== 'null' && c.from !== undefined && c.from !== '' && c.from !== c.to) {
                parts.push(
                    `<span class="activity-change">changed <span class="activity-change-prop highlight-gray ${this.args.activityChangePropClass ?? ''}">${k}</span> from <span class="activity-change-prop highlight-gray ${this.args.activityPreviousValueClass ?? ''}">${this.#code(c.from)}</span> to <span class="activity-change-prop highlight-blue ${this.args.activityNewValueClass ?? ''}">${this.#code(c.to)}</span></span>`
                );
            } else {
                parts.push(
                    `<span class="activity-change">set <span class="activity-change-prop highlight-gray ${this.args.activityChangePropClass ?? ''}">${k}</span> to <span class="activity-change-prop highlight-blue ${this.args.activityNewValueClass ?? ''}">${this.#code(c.to)}</span></span>`
                );
            }
        }

        // Make the entire thing safe once at the end
        return htmlSafe(parts.join(', '));
    }

    #code(v) {
        // lightweight backtick wrapper for inline emphasis
        return this.args.backtickValues ? `\`${String(v)}\`` : v;
    }

    #eventToVerb(event, description) {
        if (description && typeof description === 'string') return description;
        switch (event) {
            case 'created':
                return 'created';
            case 'deleted':
                return 'deleted';
            case 'restored':
                return 'restored';
            default:
                return 'updated';
        }
    }

    #eventBadge(event) {
        // Tailwind classes set to feel like Fleetbase pills
        switch (event) {
            case 'created':
                return { text: 'Created', class: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/20 dark:text-green-300 dark:ring-green-800' };
            case 'deleted':
                return { text: 'Deleted', class: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800' };
            case 'restored':
                return { text: 'Restored', class: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800' };
            default:
                return { text: 'Updated', class: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:ring-indigo-800' };
        }
    }

    // ── Changes & formatting ─────────────────────────────────────────────────────
    #computeChanges(properties) {
        const attrs = properties?.attributes ?? {};
        const old = properties?.old ?? {};
        const keys = new Set([...Object.keys(attrs), ...Object.keys(old)]);
        const out = [];

        for (const key of keys) {
            const next = attrs[key];
            const prev = old[key];
            const same = next === prev || (next == null && prev == null) || (this.#isPlainObject(next) && this.#isPlainObject(prev) && JSON.stringify(next) === JSON.stringify(prev));
            if (same) continue;

            out.push({
                key,
                from: this.#formatValue(prev),
                to: this.#formatValue(next),
                fromRaw: prev,
                toRaw: next,
            });
        }

        const priority = ['status', 'scheduled_at', 'name', 'title', 'color', 'plate_number', 'updated_at', 'created_at'];
        out.sort((a, b) => {
            const ai = priority.indexOf(a.key);
            const bi = priority.indexOf(b.key);
            if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            return a.key.localeCompare(b.key);
        });

        return out;
    }

    #isAdvancedValue(a, b) {
        const isComplex = (v) => this.#isPlainObject(v) || isArray(v) || (typeof v === 'string' && (this.#looksLikeUuid(v) || v.length > 32));
        return isComplex(a) || isComplex(b);
    }

    #isLikelyUuidKey(key) {
        return typeof key === 'string' && (key.endsWith('_uuid') || key === 'uuid' || key.endsWith('Id') || key.endsWith('_id'));
    }

    #looksLikeUuid(v) {
        return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
    }

    #parseDate(input) {
        if (!input) return null;
        if (isDate(input)) return isValid(input) ? input : null;
        try {
            const d = parseISO(String(input));
            return isValid(d) ? d : null;
        } catch {
            return null;
        }
    }

    #subjectTypeLabel(subjectType) {
        if (!subjectType || typeof subjectType !== 'string') return '';
        const parts = subjectType.split('\\').filter(Boolean);
        let lastSegment = parts[parts.length - 1];
        if (lastSegment) {
            return smartHumanize(lastSegment);
        }

        return subjectType;
    }

    #subjectDisplay(subject) {
        if (!subject) return 'Unknown';
        return subject.display_name || subject.name || subject.title || subject.address || subject.tracking || subject.public_id || subject.uuid || 'Unknown';
    }

    #isPlainObject(v) {
        return v && typeof v === 'object' && !isArray(v);
    }

    #formatValue(v) {
        if (v === null || v === undefined) return 'null';
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        if (isArray(v)) return v.length ? JSON.stringify(v) : '[]';
        if (this.#isPlainObject(v)) {
            if (v.type === 'Point' && isArray(v.coordinates)) {
                const [lng, lat] = v.coordinates;
                return `Point(${lat}, ${lng})`;
            }
            return JSON.stringify(v);
        }
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
            const d = this.#parseDate(v);
            if (d) return format(d, 'PP p');
        }
        return String(v);
    }
}
