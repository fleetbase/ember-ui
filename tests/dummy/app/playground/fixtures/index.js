/**
 * Deterministic fixtures for the playground.
 *
 * Every value here is fixed and local. Nothing reads the clock, nothing calls an API, and nothing
 * is persisted — a playground page must render the same way on every run, in every timezone, and
 * must never reach a production service.
 *
 * Dates are constant strings rather than `new Date()` for the same reason.
 */

/** A fixed reference date, so calendar previews never depend on today. */
export const REFERENCE_DATE = '2026-03-16';

export const ORDER_COLUMNS = [
    { label: 'Order', valuePath: 'reference', sortable: true },
    { label: 'Customer', valuePath: 'customer', sortable: true },
    { label: 'Status', valuePath: 'status', sortable: true },
    { label: 'Total', valuePath: 'total', sortable: true },
];

export const ORDERS = [
    { id: '1', reference: 'FLB-1001', customer: 'Acme Freight', status: 'completed', total: '$1,240.00', city: 'Singapore' },
    { id: '2', reference: 'FLB-1002', customer: 'Northwind Ltd', status: 'pending', total: '$430.50', city: 'Kuala Lumpur' },
    { id: '3', reference: 'FLB-1003', customer: 'Globex', status: 'success', total: '$2,980.00', city: 'Jakarta' },
    { id: '4', reference: 'FLB-1004', customer: 'Initech', status: 'warning', total: '$118.75', city: 'Bangkok' },
    { id: '5', reference: 'FLB-1005', customer: 'Umbrella Co', status: 'danger', total: '$675.20', city: 'Manila' },
];

export const PAGINATION_META = { total: 5, current_page: 1, last_page: 1, per_page: 25, from: 1, to: 5 };

export const STATUS_OPTIONS = ['pending', 'dispatched', 'completed', 'canceled'];

export const LABELLED_OPTIONS = [
    { label: 'Pending', value: 'pending' },
    { label: 'Dispatched', value: 'dispatched' },
    { label: 'Completed', value: 'completed' },
    { label: 'Canceled', value: 'canceled' },
    { label: 'On hold', value: 'on-hold' },
    { label: 'Failed', value: 'failed' },
];

export const DRIVERS = [
    { id: 'drv_1', name: 'Alex Mercer', phone: '+65 8123 4567' },
    { id: 'drv_2', name: 'Priya Nair', phone: '+60 12 345 6789' },
    { id: 'drv_3', name: 'Tomas Vieira', phone: '+62 812 3456 789' },
];

export const PLACE = {
    id: 'plc_1',
    name: 'Central Depot',
    location: { type: 'Point', coordinates: [103.8198, 1.3521] },
    latitude: 1.3521,
    longitude: 103.8198,
};

export const TIMELINE_ACTIVITY = [
    { id: 't1', status: 'created', code: 'created', details: 'Order created', humanized: 'Created' },
    { id: 't2', status: 'dispatched', code: 'dispatched', details: 'Assigned to a driver', humanized: 'Dispatched' },
    { id: 't3', status: 'en_route', code: 'en_route', details: 'Driver en route', humanized: 'En route' },
    { id: 't4', status: 'completed', code: 'completed', details: 'Delivered and signed for', humanized: 'Completed' },
];

export const ACTIVITIES = [
    { id: 'a1', description: 'created the order', event: 'created', created_at: '2026-03-16T08:04:00Z', causer: { name: 'Alex Mercer' }, subject: { name: 'FLB-1001' } },
    { id: 'a2', description: 'assigned a driver', event: 'updated', created_at: '2026-03-16T08:31:00Z', causer: { name: 'Priya Nair' }, subject: { name: 'FLB-1001' } },
    { id: 'a3', description: 'marked the order dispatched', event: 'updated', created_at: '2026-03-16T09:12:00Z', causer: { name: 'Priya Nair' }, subject: { name: 'FLB-1001' } },
    { id: 'a4', description: 'uploaded a proof of delivery', event: 'created', created_at: '2026-03-16T13:45:00Z', causer: { name: 'Tomas Vieira' }, subject: { name: 'FLB-1001' } },
    { id: 'a5', description: 'completed the order', event: 'updated', created_at: '2026-03-16T14:02:00Z', causer: { name: 'Tomas Vieira' }, subject: { name: 'FLB-1001' } },
];

export const COMMENTS = [
    { id: 'c1', content: 'Customer asked for an earlier window.', created_at: '2026-03-16T08:10:00Z', author: { name: 'Alex Mercer' }, replies: [] },
    { id: 'c2', content: 'Rescheduled to the 09:00 slot.', created_at: '2026-03-16T08:22:00Z', author: { name: 'Priya Nair' }, replies: [] },
    { id: 'c3', content: 'Driver confirmed pickup.', created_at: '2026-03-16T09:05:00Z', author: { name: 'Tomas Vieira' }, replies: [] },
];

export const FILE_RECORD = {
    id: 'f1',
    original_filename: 'proof-of-delivery.pdf',
    filename: 'proof-of-delivery.pdf',
    extension: 'pdf',
    content_type: 'application/pdf',
    file_size: 284_512,
    url: 'about:blank',
};

/** Fixed calendar events, anchored to REFERENCE_DATE rather than to today. */
export const CALENDAR_EVENTS = [
    { id: 'e1', title: 'Depot loading', start: `${REFERENCE_DATE}T08:00:00`, end: `${REFERENCE_DATE}T09:30:00` },
    { id: 'e2', title: 'City deliveries', start: `${REFERENCE_DATE}T10:00:00`, end: `${REFERENCE_DATE}T14:00:00` },
    { id: 'e3', title: 'Vehicle service', start: '2026-03-17T09:00:00', end: '2026-03-17T11:00:00' },
    { id: 'e4', title: 'Driver briefing', start: '2026-03-18T07:30:00', end: '2026-03-18T08:00:00' },
];

export const KANBAN_BOARD = [
    {
        id: 'col_pending',
        title: 'Pending',
        cards: [
            { id: 'k1', title: 'FLB-1002 · Northwind Ltd', description: 'Awaiting dispatch' },
            { id: 'k2', title: 'FLB-1004 · Initech', description: 'Address unconfirmed' },
        ],
    },
    {
        id: 'col_active',
        title: 'In progress',
        cards: [{ id: 'k3', title: 'FLB-1003 · Globex', description: 'Driver en route' }],
    },
    {
        id: 'col_done',
        title: 'Completed',
        cards: [{ id: 'k4', title: 'FLB-1001 · Acme Freight', description: 'Delivered 14:02' }],
    },
];

export const DASHBOARD = {
    id: 'dsh_1',
    name: 'Operations',
    is_system: false,
    widgets: [
        { id: 'w1', name: 'Orders today', component: 'playground/widgets/metric', grid_options: { w: 4, h: 2, x: 0, y: 0 }, options: { label: 'Orders today', value: '128' } },
        { id: 'w2', name: 'On-time rate', component: 'playground/widgets/metric', grid_options: { w: 4, h: 2, x: 4, y: 0 }, options: { label: 'On-time rate', value: '96%' } },
        { id: 'w3', name: 'Active drivers', component: 'playground/widgets/metric', grid_options: { w: 4, h: 2, x: 8, y: 0 }, options: { label: 'Active drivers', value: '14' } },
    ],
};

export const REPORT_TABLES = [
    {
        name: 'orders',
        label: 'Orders',
        columns: [
            { name: 'status', label: 'Status' },
            { name: 'total', label: 'Total' },
        ],
    },
    { name: 'drivers', label: 'Drivers', columns: [{ name: 'name', label: 'Name' }] },
];

export const REPORT_QUERY = { table: 'orders', columns: ['status', 'total'], conditions: [], limit: 25 };

export const TEMPLATE_ELEMENTS = [
    { id: 'el1', type: 'text', content: 'Delivery receipt', x: 24, y: 24, width: 300, height: 40 },
    { id: 'el2', type: 'text', content: 'Order {{reference}}', x: 24, y: 80, width: 300, height: 28 },
];

export const TEMPLATE = { id: 'tpl_1', name: 'Delivery receipt', elements: TEMPLATE_ELEMENTS };

export const TABS = [
    { id: 'overview', title: 'Overview', slug: 'overview' },
    { id: 'activity', title: 'Activity', slug: 'activity' },
    { id: 'files', title: 'Files', slug: 'files' },
];

export const MENU_ITEMS = [
    { id: 'm1', title: 'Dashboard', icon: 'gauge', route: 'console' },
    { id: 'm2', title: 'Orders', icon: 'box', route: 'console' },
    { id: 'm3', title: 'Drivers', icon: 'user', route: 'console' },
];

export const DROPDOWN_ITEMS = [
    { text: 'Edit', icon: 'pen' },
    { text: 'Duplicate', icon: 'copy' },
    { text: 'Delete', icon: 'trash' },
];

/**
 * Some addon components call `.toArray()` on a store result unconditionally (activity-log does,
 * at activity-log.js:72). The dummy store returns plain arrays, so wrap fixtures destined for
 * `store.queryResults` in something that answers both shapes.
 */
export function storeResult(items) {
    const result = [...items];

    result.toArray = () => [...items];

    return result;
}
