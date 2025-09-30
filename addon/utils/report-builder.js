export const DEFAULT_LIMIT = 100;
export const DEFAULT_PAGE = 1;
export const EMPTY_QUERY = Object.freeze({
    select: [],
    from: null,
    joins: [],
    where: [],
    groupBy: [],
    having: [],
    orderBy: [],
    limit: DEFAULT_LIMIT,
});

export const AGGREGATE_FUNCTIONS = [
    { value: null, label: 'None' },
    { value: 'COUNT', label: 'Count' },
    { value: 'SUM', label: 'Sum' },
    { value: 'AVG', label: 'Average' },
    { value: 'MIN', label: 'Minimum' },
    { value: 'MAX', label: 'Maximum' },
];

export const JOIN_TYPES = [
    { value: 'inner', label: 'Inner' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'full', label: 'Full' },
];

export const OPERATORS = [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: '>', label: '>' },
    { value: '>=', label: '>=' },
    { value: '<', label: '<' },
    { value: '<=', label: '<=' },
    { value: 'LIKE', label: 'LIKE' },
    { value: 'NOT LIKE', label: 'NOT LIKE' },
    { value: 'IN', label: 'IN' },
    { value: 'NOT IN', label: 'NOT IN' },
    { value: 'IS NULL', label: 'IS NULL' },
    { value: 'IS NOT NULL', label: 'IS NOT NULL' },
];

export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj ?? {}));
}

export function emptyJoin() {
    return { type: 'inner', table: null, alias: null, on: [{ left: null, operator: '=', right: null }] };
}

export function emptyWhere() {
    return { column: null, operator: '=', value: '', type: 'string', logic: 'AND' };
}

export function emptyOrder() {
    return { column: null, direction: 'asc' };
}

export default function reportBuilder() {
    return true;
}
