import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { debug } from '@ember/debug';
import { isArray } from '@ember/array';
import { capitalize } from '@ember/string';
import { task } from 'ember-concurrency';
import { parseISO, isDate, isValid, format, formatDistanceToNow } from 'date-fns';
import smartHumanize from '../utils/smart-humanize';

export default class ActivityLogComponent extends Component {
    @service store;
    @tracked activities = [];
    @tracked dateFilter = null;

    get density() {
        return this.args.density ?? 'compact';
    }

    get showAvatars() {
        return this.args.showAvatars ?? true;
    }

    get showBadges() {
        return this.args.showBadges ?? false;
    }

    get showHeader() {
        return this.args.showHeader ?? true;
    }

    get showControls() {
        return this.args.showControls ?? true;
    }

    get showAttributePreviousValues() {
        return this.args.showAttributePreviousValues ?? true;
    }

    get items() {
        const activities = isArray(this.activities) ? this.activities : [];
        const normalized = activities.map((activity, index) => this.#normalizeActivity(activity, index)).sort((a, b) => (b.timestamp?.dateMs ?? 0) - (a.timestamp?.dateMs ?? 0));
        const limit = Number(this.args.maxVisibleActivities);

        if (Number.isFinite(limit) && limit > 0) {
            return normalized.slice(0, limit);
        }

        return normalized;
    }

    get hasItems() {
        return this.items.length > 0;
    }

    constructor() {
        super(...arguments);
        this.loadActivities.perform();
    }

    // ── Data ────────────────────────────────────────────────────────────────────
    @task *loadActivities() {
        try {
            const params = {};
            if (this.args.companyUuid) params.company_uuid = this.args.companyUuid;
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

    // ── Normalize & Phrase ──────────────────────────────────────────────────────
    #normalizeActivity(activity, idx = 0) {
        const createdISO = activity?.created_at ?? null;
        const updatedISO = activity?.updated_at ?? null;
        const tsISO = createdISO ?? updatedISO ?? null;

        const d = this.#parseDate(tsISO);
        const dateMs = d ? d.getTime() : 0;
        const dayKey = d ? format(d, 'yyyy-MM-dd') : 'unknown';
        const exactLocal = d ? format(d, 'PP p') : '';
        const relative = d ? formatDistanceToNow(d, { addSuffix: true }) : '';

        const causer = activity?.causer ?? {};
        const subject = activity?.subject ?? {};
        const subjectTypeLabel = activity?.humanized_subject_type ?? this.#subjectTypeLabel(activity?.subject_type);
        const event = String(activity?.event || '').toLowerCase();
        const changes = this.#computeChanges(activity?.properties);
        const changeCount = changes.length;
        const verb = this.#eventToVerb(event, activity?.description, changeCount);
        const hasMultipleChanges = changeCount > 1;
        const inlineChange = changeCount === 1 ? this.#inlineChangeSummary(changes[0]) : null;
        const objectLabel = this.#objectLabel(activity, subjectTypeLabel);
        const actorName = causer?.name ?? 'Someone';

        const badge = this.#eventBadge(event);

        return {
            key: `${dayKey}-${idx}`,
            actor: {
                name: causer?.name ?? 'Unknown',
                avatarUrl: causer?.avatar_url ?? null,
                initial: this.#initial(actorName),
                raw: causer,
            },
            subject,
            causer,
            verb,
            event,
            eventLabel: capitalize(event || 'updated'),
            badge,
            subjectTypeLabel,
            objectLabel,
            changes,
            changeCount,
            hasChanges: changeCount > 0,
            hasMultipleChanges,
            inlineChange,
            timestamp: {
                iso: tsISO,
                exactLocal,
                relative,
                dateMs,
            },
            dayKey,
            raw: activity,
        };
    }

    #inlineChangeSummary(change) {
        if (!change) return null;
        if (this.#isAdvancedValue(change.fromRaw, change.toRaw) || this.#isLikelyUuidKey(change.key)) return null;
        if (change.from !== 'null' && change.from !== undefined && change.from !== '' && change.from !== change.to) {
            return {
                attribute: change.label,
                from: change.from,
                to: change.to,
                hasPreviousValue: true,
            };
        }

        return {
            attribute: change.label,
            to: change.to,
            hasPreviousValue: false,
        };
    }

    #eventToVerb(event, description, changeCount = 0) {
        if (description && typeof description === 'string') return description;
        if (changeCount > 0 && (!event || event === 'updated')) return 'changed';
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
                label: this.#attributeLabel(key),
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

    #attributeLabel(key) {
        return smartHumanize(String(key).replace(/_/g, ' '));
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

    #objectLabel(activity, subjectTypeLabel) {
        const subjectDisplay = this.#subjectDisplay(activity?.subject);
        return subjectDisplay !== 'Unknown' ? subjectDisplay : subjectTypeLabel;
    }

    #initial(name) {
        return String(name || 'S')
            .trim()
            .charAt(0)
            .toUpperCase();
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
