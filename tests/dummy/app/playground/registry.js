/**
 * The playground registry: one entry per documented component.
 *
 * Built *from* the documentation allowlist, never from `app/components`. Every allowlisted
 * component must have an entry here and every entry must be allowlisted — `tests/unit/playground/
 * registry-test.js` enforces both directions, plus slug uniqueness, source existence, adapter
 * resolvability and control validity.
 *
 * Argument surfaces below were read off the current `addon/components/*.hbs` and `*.js`, not off
 * the documentation prose. Where the two disagree, the implementation wins and the discrepancy is
 * recorded in PLAYGROUND.md.
 */

import { DOCUMENTED_COMPONENTS, slugFor } from './allowlist';
import { control } from './controls';

/** Button/badge palettes shared by several components. */
const BUTTON_TYPES = ['default', 'primary', 'secondary', 'success', 'danger', 'warning', 'black', 'magic', 'link'];
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'];
const PLACEMENTS = ['top', 'bottom', 'left', 'right'];
const STATUSES = ['success', 'info', 'warning', 'danger', 'pending', 'completed'];

/**
 * Per-component definitions, keyed by Ember resolution path.
 *
 * `controls`   — editable arguments, bound explicitly by the example adapter.
 * `scenarios`  — named fixture/composition presets for components that need more than scalars.
 * `events`     — callbacks the adapter forwards to the event log.
 * `notes`      — fixture, service, or parent-composition constraints worth stating on the page.
 */
const DEFINITIONS = {
    // ================================================================ Layout & Structure
    'layout/container': {
        description: 'The outermost application shell. Wraps a header, sidebar and main region into the standard Fleetbase console frame.',
        controls: [control('bodyText', 'text', { label: 'Body text', default: 'Main content area' })],
        scenarios: [
            { id: 'default', label: 'Header + sidebar + main' },
            { id: 'bare', label: 'Container only' },
        ],
        notes: 'Rendered with a minimal header/sidebar/main composition — the container yields the frame rather than any content of its own.',
    },
    'layout/header': {
        description: 'The console top bar: brand, navigation items, notification tray and user menu.',
        controls: [
            control('showSidebarToggle', 'boolean', { label: 'Show sidebar toggle', default: true }),
            control('size', 'select', { options: SIZES, default: 'sm' }),
            control('maxVisibleNavItems', 'number', { label: 'Max visible nav items', default: 4, min: 0, max: 12 }),
        ],
        events: ['onSidebarToggle', 'onClickNotification'],
        notes: 'Backed by the dummy universe menu, current-user and notifications service stubs; no network calls are made.',
    },
    'layout/sidebar': {
        description: 'The resizable console sidebar, with collapse-below-width behaviour and panel slots.',
        controls: [
            control('placement', 'select', { options: ['left', 'right'], default: 'left' }),
            control('minResizeWidth', 'number', { label: 'Min width', default: 200, min: 80, max: 400 }),
            control('maxResizeWidth', 'number', { label: 'Max width', default: 400, min: 200, max: 900 }),
            control('collapseBelowWidth', 'number', { label: 'Collapse below', default: 0, min: 0, max: 1200 }),
        ],
        notes: 'Uses the dummy `sidebar` context from the addon; width changes are local to the preview.',
    },
    'layout/main': {
        description: 'The main content region inside a Layout::Container. Template-only.',
        controls: [control('bodyText', 'text', { label: 'Body text', default: 'Main region content' })],
        notes: 'Template-only component (no backing class); it exists to yield the main content slot.',
    },
    'layout/section': {
        description: 'A titled content section used to divide a main region. Template-only.',
        controls: [control('bodyText', 'text', { label: 'Body text', default: 'Section content' })],
        notes: 'Template-only component.',
    },
    'layout/mobile-navbar': {
        description: 'The compact navigation bar shown on small viewports.',
        controls: [control('size', 'select', { options: SIZES, default: 'sm' })],
        events: ['onSetup'],
        notes: 'Fed by the dummy universe menu service; resize the preview to see its responsive behaviour.',
    },
    'content-panel': {
        description: 'A collapsible titled panel with an optional status dot, action buttons and dropdown menu.',
        controls: [
            control('title', 'text', { default: 'Shipment details' }),
            control('subtitle', 'text', { default: 'Updated moments ago' }),
            control('open', 'boolean', { default: true }),
            control('pad', 'boolean', { default: true }),
            control('titleStatus', 'select', { label: 'Title status', options: [null, ...STATUSES], default: 'success' }),
            control('hideStatusDot', 'boolean', { label: 'Hide status dot', default: false }),
            control('isLoading', 'boolean', { label: 'Is loading', default: false }),
        ],
        events: ['onToggle', 'onClickPanelTitle', 'onClickCaret'],
    },
    overlay: {
        description: 'A slide-in side panel anchored to an edge of the viewport, with optional resize and maximise controls.',
        controls: [
            control('isOpen', 'boolean', { label: 'Is open', default: true }),
            control('position', 'select', { options: ['right', 'left', 'top', 'bottom'], default: 'right' }),
            control('width', 'number', { default: 400, min: 200, max: 900, step: 20 }),
            control('noBackdrop', 'boolean', { label: 'No backdrop', default: true }),
            control('isResizable', 'boolean', { label: 'Is resizable', default: false }),
            control('isMinimizable', 'boolean', { label: 'Is minimizable', default: false }),
            control('isMaximizable', 'boolean', { label: 'Is maximizable', default: false }),
            control('fullHeight', 'boolean', { label: 'Full height', default: false }),
        ],
        events: ['onOpen', 'onClose', 'onToggle', 'onMaximize', 'onMinimize'],
        notes: 'Renders in place inside the preview frame rather than at the document root, so it stays inside the panel.',
    },
    drawer: {
        description: 'A bottom-anchored tray with an optional drag notch.',
        controls: [
            control('notchEnabled', 'boolean', { label: 'Notch enabled', default: true }),
            control('fullHeight', 'boolean', { label: 'Full height', default: false }),
            control('bodyText', 'text', { label: 'Body text', default: 'Drawer content' }),
        ],
        events: ['onOpen', 'onClose', 'onLoad'],
    },
    'layout/resource/tabular': {
        description: 'The standard resource index: toolbar, search, filters, bulk actions and a paginated table.',
        controls: [
            control('title', 'text', { default: 'Orders' }),
            control('selectable', 'boolean', { default: true }),
            control('isLoading', 'boolean', { label: 'Is loading', default: false }),
            control('isFiltered', 'boolean', { label: 'Is filtered', default: false }),
            control('withoutHeader', 'boolean', { label: 'Without header', default: false }),
            control('hideColumnsPicker', 'boolean', { label: 'Hide columns picker', default: false }),
        ],
        scenarios: [
            { id: 'rows', label: 'Five orders' },
            { id: 'empty', label: 'Empty state' },
        ],
        events: ['onSearch', 'onSort', 'onRowClick', 'onPageChange', 'onPressNew', 'onReload'],
        notes: 'Uses a deterministic five-row local fixture and static pagination meta. No store or network access.',
    },
    'layout/resource/card': {
        description: 'A single resource rendered as a card, for grid layouts.',
        controls: [control('index', 'number', { default: 0, min: 0, max: 4 })],
        scenarios: [{ id: 'order', label: 'Order resource' }],
        notes: 'Bound to one row of the shared local resource fixture.',
    },
    'layout/resource/cards-grid': {
        description: 'A paginated grid of resource cards with an empty state and create action.',
        controls: [
            control('columns', 'number', { default: 3, min: 1, max: 6 }),
            control('gap', 'number', { default: 4, min: 0, max: 12 }),
            control('showPagination', 'boolean', { label: 'Show pagination', default: true }),
            control('emptyStateText', 'text', { label: 'Empty state text', default: 'No resources yet' }),
        ],
        scenarios: [
            { id: 'grid', label: 'Five resources' },
            { id: 'empty', label: 'Empty state' },
        ],
        events: ['onClick', 'onCreateNew', 'onPageChange'],
    },
    'layout/resource/panel': {
        description: 'A resource detail panel with a header, body slot and opt-in save action.',
        controls: [
            control('title', 'text', { default: 'Order details' }),
            control('width', 'number', { default: 460, min: 240, max: 900, step: 20 }),
            control('isResizable', 'boolean', { label: 'Is resizable', default: false }),
            control('saveDisabled', 'boolean', { label: 'Save disabled', default: false }),
        ],
        events: ['onClose', 'onPressCancel', 'onToggle'],
        notes: 'The save task is deliberately unwired unless a consumer passes `@saveTask` — see DEFECTS.md. The preview passes a local no-op task so the button appears.',
    },
    floating: {
        description: 'Floating-UI positioning primitive: anchors arbitrary content to a target element.',
        controls: [
            control('placement', 'select', { options: ['top', 'bottom', 'left', 'right', 'top-start', 'bottom-end'], default: 'top' }),
            control('offset', 'number', { default: 8, min: 0, max: 40 }),
            control('arrow', 'boolean', { default: true }),
        ],
        notes: 'Anchored to a button rendered inside the preview.',
    },
    'attach/tooltip': {
        description: 'A tooltip attached to its parent element.',
        controls: [
            control('text', 'text', { default: 'Helpful explanation' }),
            control('placement', 'select', { options: PLACEMENTS, default: 'top' }),
            control('animation', 'select', { options: ['scale', 'fade', 'shift'], default: 'scale' }),
            control('isShown', 'boolean', { label: 'Force shown', default: true }),
            control('interactive', 'boolean', { default: false }),
            control('showDelay', 'number', { label: 'Show delay (ms)', default: 0, min: 0, max: 2000, step: 50 }),
        ],
        notes: 'Force shown is on by default so the tooltip is visible without hovering; turn it off to test hover behaviour.',
    },
    'attach/popover': {
        description: 'A popover attached to its parent element, opened on click by default.',
        controls: [
            control('placement', 'select', { options: PLACEMENTS, default: 'bottom' }),
            control('showOn', 'select', { label: 'Show on', options: ['click', 'hover', 'manual'], default: 'click' }),
            control('arrow', 'boolean', { default: true }),
            control('bodyText', 'text', { label: 'Body text', default: 'Popover content' }),
        ],
    },
    spacer: {
        description: 'A fixed-size spacing element.',
        controls: [control('height', 'number', { default: 24, min: 0, max: 200, step: 4 })],
        notes: 'Rendered between two marker blocks so the gap is visible.',
    },

    // ================================================================ Navigation
    'tab-navigation': {
        description: 'Route-driven tab bar with optional add and close actions.',
        controls: [control('size', 'select', { options: SIZES, default: 'sm' }), control('activeTabId', 'text', { label: 'Active tab id', default: 'overview' })],
        scenarios: [{ id: 'three', label: 'Three tabs' }],
        events: ['onTabChange', 'onAddTab', 'onClose'],
        notes: 'Tabs link to the dummy `console.menu-item` route so LinkTo resolves; navigation stays inside the playground.',
    },
    tabs: {
        description: 'A simple tab strip yielding tab and panel slots. Template-only.',
        controls: [control('tagContentClass', 'text', { label: 'Content class', default: '' })],
        notes: 'Template-only component; the preview supplies its own tab list and panels.',
    },
    'dropdown-button': {
        description: 'A button that opens a dropdown menu of actions.',
        controls: [
            control('text', 'text', { default: 'Actions' }),
            control('type', 'select', { options: BUTTON_TYPES, default: 'default' }),
            control('size', 'select', { options: SIZES, default: 'sm' }),
            control('icon', 'text', { default: 'ellipsis-h' }),
            control('disabled', 'boolean', { default: false }),
            control('isLoading', 'boolean', { label: 'Is loading', default: false }),
        ],
        events: ['onOpen', 'onClose'],
    },

    // ================================================================ Buttons & Actions
    button: {
        description: 'The primary action control: types, sizes, icons, loading and permission-aware disabling.',
        controls: [
            control('text', 'text', { default: 'Save changes' }),
            control('type', 'select', { options: BUTTON_TYPES, default: 'default' }),
            control('size', 'select', { options: SIZES, default: 'sm' }),
            control('buttonType', 'select', { label: 'Button type (HTML)', options: ['button', 'submit', 'reset'], default: 'button' }),
            control('disabled', 'boolean', { default: false }),
            control('visible', 'boolean', { default: true }),
            control('isLoading', 'boolean', { label: 'Is loading', default: false }),
            control('outline', 'boolean', { default: false }),
            control('responsive', 'boolean', { default: false }),
            control('icon', 'text', { default: '', help: 'A Font Awesome icon name, e.g. floppy-disk.' }),
            control('iconPrefix', 'select', { label: 'Icon prefix', options: [null, 'fas', 'far', 'fab'], default: null }),
            control('helpText', 'text', { label: 'Help text', default: '', help: 'Shown as a tooltip beside the button.' }),
        ],
        // Button's scenarios are argument presets: selecting one writes these values into the
        // controls, so the preset is a starting point you can then edit rather than a fixed mode.
        scenarios: [
            { id: 'default', label: 'Default', values: { type: 'default', text: 'Save changes' } },
            { id: 'primary', label: 'Primary', values: { type: 'primary', text: 'Save changes' } },
            { id: 'secondary', label: 'Secondary', values: { type: 'secondary', text: 'Cancel' } },
            { id: 'danger', label: 'Danger', values: { type: 'danger', text: 'Delete order', icon: 'trash' } },
            { id: 'icon-only', label: 'Icon only', values: { text: '', icon: 'gear', type: 'default' } },
            { id: 'loading', label: 'Loading', values: { isLoading: true, text: 'Saving…' } },
            { id: 'disabled', label: 'Disabled', values: { disabled: true, text: 'Save changes' } },
            { id: 'help', label: 'Help tooltip', values: { helpText: 'Saves the order and notifies the driver.', text: 'Save changes' } },
        ],
        events: ['onClick', 'onInsert'],
    },
    'click-to-copy': {
        description: 'Copies a value to the clipboard when pressed.',
        controls: [control('value', 'text', { default: 'FLB-2043-XX' }), control('labelText', 'text', { label: 'Label', default: 'Tracking number' })],
        notes: 'Clipboard writes are attempted for real; browsers may refuse without a user gesture or permission.',
    },
    'click-to-reveal': {
        description: 'Hides a sensitive value until pressed.',
        controls: [
            control('value', 'text', { default: 'sk_live_2f8a…' }),
            control('text', 'text', { label: 'Prompt text', default: 'Click to reveal' }),
            control('buttonText', 'text', { label: 'Button text', default: 'Reveal' }),
            control('size', 'select', { options: SIZES, default: 'sm' }),
            control('isLoading', 'boolean', { label: 'Is loading', default: false }),
        ],
        events: ['onClick'],
        notes: 'The value here is a fixture string, not a real credential.',
    },

    // ================================================================ Forms & Inputs
    'input-group': {
        description: 'A labelled input wrapper with help text and required marking.',
        // The label comes from `@name`, not `@labelText` — `@labelText` is not read by the
        // component at all (input-group.hbs:3). See PLAYGROUND.md.
        controls: [
            control('name', 'text', { label: 'Label (@name)', default: 'Reference' }),
            control('value', 'text', { default: '' }),
            control('placeholder', 'text', { default: 'Enter a reference' }),
            control('helpText', 'text', { label: 'Help text', default: 'Shown beside the label.' }),
            control('required', 'boolean', { default: false }),
            control('disabled', 'boolean', { default: false }),
            control('hideLabel', 'boolean', { label: 'Hide label', default: false }),
        ],
        // InputGroup exposes no change callback of its own, so the adapter listens to the native
        // input event through splattributes. See PLAYGROUND.md.
        events: ['onChange'],
    },
    checkbox: {
        description: 'A labelled checkbox with optional help tooltip.',
        controls: [
            control('label', 'text', { default: 'Send a notification' }),
            control('checked', 'boolean', { default: false }),
            control('disabled', 'boolean', { default: false }),
            control('helpText', 'text', { label: 'Help text', default: '' }),
        ],
        events: ['onChange'],
    },
    toggle: {
        description: 'A switch control with label and optional help tooltip.',
        controls: [
            control('label', 'text', { default: 'Enable tracking' }),
            control('isToggled', 'boolean', { label: 'Is toggled', default: false }),
            control('disabled', 'boolean', { default: false }),
            control('size', 'select', { options: SIZES, default: 'sm' }),
            control('helpText', 'text', { label: 'Help text', default: '' }),
        ],
        events: ['onToggle'],
    },
    select: {
        description: 'A native select bound to an options array.',
        controls: [
            control('placeholder', 'text', { default: 'Choose a status' }),
            control('value', 'text', { default: '' }),
            control('humanize', 'boolean', { default: true }),
            control('unstyled', 'boolean', { default: false }),
        ],
        scenarios: [
            { id: 'statuses', label: 'Status strings' },
            { id: 'objects', label: 'Label/value objects' },
        ],
        events: ['onChange', 'onSelect'],
    },
    'multi-select': {
        description: 'A power-select based multiple-choice control. Template-only wrapper.',
        controls: [
            control('placeholder', 'text', { default: 'Choose statuses' }),
            control('searchEnabled', 'boolean', { label: 'Search enabled', default: true }),
            control('allowClear', 'boolean', { label: 'Allow clear', default: true }),
        ],
        scenarios: [{ id: 'statuses', label: 'Status options' }],
        events: ['onChange'],
        notes: 'Template-only component wrapping ember-power-select; selection state is held by the preview.',
    },
    'combo-box': {
        description: 'A combined text input and option list.',
        controls: [
            control('optionLabel', 'text', { label: 'Option label path', default: 'label' }),
            control('selectionBoxLabel', 'text', { label: 'Selection box label', default: 'Selected' }),
            control('optionBoxLabel', 'text', { label: 'Option box label', default: 'Options' }),
            control('icon', 'text', { default: 'list' }),
        ],
        scenarios: [{ id: 'options', label: 'Six options' }],
        events: ['onChange'],
    },
    'model-select': {
        description: 'A power-select that loads records from the store by model name.',
        controls: [
            control('placeholder', 'text', { default: 'Select a driver' }),
            control('searchEnabled', 'boolean', { label: 'Search enabled', default: true }),
            control('allowClear', 'boolean', { label: 'Allow clear', default: true }),
            control('disabled', 'boolean', { default: false }),
            control('optionLabel', 'text', { label: 'Option label path', default: 'name' }),
        ],
        scenarios: [{ id: 'drivers', label: 'Local driver fixtures' }],
        events: ['onChange', 'onClear'],
        notes: 'Backed by the dummy store stub returning a fixed set of driver records. No API request is issued.',
    },
    'date-picker': {
        description: 'A calendar date picker.',
        controls: [control('value', 'date', { default: '2026-03-14' }), control('placeholder', 'text', { default: 'Pick a date' })],
        events: ['onChange', 'onDateChanged', 'onSelect'],
        notes: 'The default date is a fixed fixture so the preview is deterministic.',
    },
    'date-time-input': {
        description: 'A combined date and time input with min/max bounds.',
        controls: [
            control('value', 'datetime', { default: '2026-03-14T09:30' }),
            control('minDate', 'date', { label: 'Min date', default: '' }),
            control('maxDate', 'date', { label: 'Max date', default: '' }),
        ],
        events: ['onChange'],
    },
    'phone-input': {
        description: 'An international telephone input with country selection.',
        controls: [control('value', 'text', { default: '+1 415 555 0134' })],
        events: ['onInit', 'onCountryChange'],
    },
    'coordinates-input': {
        description: 'A latitude/longitude input with an optional map picker.',
        controls: [
            control('lat', 'number', { label: 'Latitude', default: 1.3521, step: 0.0001 }),
            control('lng', 'number', { label: 'Longitude', default: 103.8198, step: 0.0001 }),
            control('zoom', 'number', { default: 12, min: 1, max: 20 }),
            control('disabled', 'boolean', { default: false }),
            control('isLoading', 'boolean', { label: 'Is loading', default: false }),
        ],
        events: ['onChange', 'onGeocode', 'onGeocodeError', 'onMoveend'],
        notes: 'Geocoding callbacks are wired to the event log only — the preview issues no geocoding or tile requests.',
    },
    'model-coordinates-input': {
        description: 'A coordinates input bound to a record’s location property.',
        controls: [
            control('locationProperty', 'text', { label: 'Location property', default: 'location' }),
            control('disabled', 'boolean', { default: false }),
            control('autocomplete', 'boolean', { default: false }),
        ],
        scenarios: [{ id: 'place', label: 'Local place record' }],
        events: ['onChange', 'onGeocode', 'onReverseGeocode', 'onUpdatedFromMap'],
        notes: 'Bound to a plain local fixture object standing in for a record; no store or geocoding service is contacted.',
    },
    'unit-input': {
        description: 'A number input with a unit selector driven by a measurement type.',
        controls: [
            control('value', 'number', { default: 12, step: 0.5 }),
            control('measurement', 'select', { options: ['length', 'weight', 'volume'], default: 'weight' }),
            control('canSelectUnit', 'boolean', { label: 'Can select unit', default: true }),
            control('disabled', 'boolean', { default: false }),
            control('readonly', 'boolean', { default: false }),
        ],
        events: ['onChange', 'onUnitChange'],
    },
    'money-input': {
        description: 'A currency-aware amount input.',
        controls: [
            control('value', 'number', { default: 4200, step: 100, help: 'Minor units, as the component expects.' }),
            control('currency', 'select', { options: ['USD', 'EUR', 'GBP', 'SGD', 'JPY'], default: 'USD' }),
            control('canSelectCurrency', 'boolean', { label: 'Can select currency', default: true }),
        ],
        events: ['onChange'],
    },
    'file-upload': {
        description: 'A file input with upload lifecycle callbacks. Template-only wrapper.',
        controls: [
            control('accept', 'text', { default: 'image/*' }),
            control('multiple', 'boolean', { default: false }),
            control('disabled', 'boolean', { default: false }),
            control('labelClass', 'text', { label: 'Label class', default: '' }),
        ],
        events: ['onFileAdded', 'onFileRemoved', 'onUploadStarted', 'onUploadSucceeded', 'onUploadFailed'],
        notes: 'Nothing is uploaded. Selected files are summarized in the event log by name, type and size only — never contents.',
    },

    // ================================================================ Data Display
    table: {
        description: 'The data table: sortable, selectable, resizable columns with pagination and an empty state.',
        controls: [
            control('selectable', 'boolean', { default: true }),
            control('canSelectAll', 'boolean', { label: 'Can select all', default: true }),
            control('sortable', 'boolean', { default: true }),
            control('resizable', 'boolean', { default: false }),
            control('pagination', 'boolean', { default: true }),
            control('page', 'number', { default: 1, min: 1, max: 3 }),
            control('isFiltered', 'boolean', { label: 'Is filtered', default: false }),
        ],
        scenarios: [
            { id: 'orders', label: 'Five orders' },
            { id: 'empty', label: 'Empty state' },
        ],
        events: ['onSort', 'onRowClick', 'onPageChange'],
        notes: 'Deterministic five-row fixture with fixed pagination meta.',
    },
    badge: {
        description: 'A status badge with humanized text, status dot and optional icon.',
        controls: [
            control('status', 'select', { options: STATUSES, default: 'success' }),
            control('text', 'text', { default: '', help: 'Overrides the humanized status when set.' }),
            control('size', 'select', { options: SIZES, default: 'sm' }),
            control('hideStatusDot', 'boolean', { label: 'Hide status dot', default: false }),
            control('hideIcon', 'boolean', { label: 'Hide icon', default: false }),
            control('roundedFull', 'boolean', { label: 'Rounded full', default: false }),
            control('disableHumanize', 'boolean', { label: 'Disable humanize', default: false }),
            control('helpText', 'text', { label: 'Help text', default: '' }),
        ],
    },
    pill: {
        description: 'A compact resource chip with avatar, title, subtitle and online indicator.',
        controls: [
            control('title', 'text', { default: 'Alex Mercer' }),
            control('subtitle', 'text', { default: 'Driver' }),
            control('size', 'select', { options: SIZES, default: 'sm' }),
            control('showOnlineIndicator', 'boolean', { label: 'Show online indicator', default: true }),
            control('noTooltip', 'boolean', { label: 'No tooltip', default: false }),
        ],
        events: ['onClick'],
        notes: 'Uses a local fallback avatar; no remote image is requested.',
    },
    'progress-bar': {
        description: 'A determinate progress bar.',
        controls: [control('percent', 'number', { default: 45, min: 0, max: 100 }), control('title', 'text', { default: 'Uploading' })],
    },
    spinner: {
        description: 'A loading spinner with an optional message.',
        controls: [
            control('message', 'text', { default: 'Loading…' }),
            control('wrapperClass', 'text', { label: 'Wrapper class', default: '' }),
            control('iconClass', 'text', { label: 'Icon class', default: '' }),
        ],
    },
    timeline: {
        description: 'A horizontal activity timeline with scroll controls.',
        controls: [control('wrapperClass', 'text', { label: 'Wrapper class', default: '' })],
        scenarios: [{ id: 'shipment', label: 'Shipment progress' }],
        notes: 'Uses a fixed four-step local activity fixture.',
    },
    'activity-log': {
        description: 'A filterable log of activity records with avatars, badges and controls.',
        controls: [
            control('density', 'select', { options: ['comfortable', 'compact'], default: 'comfortable' }),
            control('showHeader', 'boolean', { label: 'Show header', default: true }),
            control('showControls', 'boolean', { label: 'Show controls', default: true }),
            control('showAvatars', 'boolean', { label: 'Show avatars', default: true }),
            control('showBadges', 'boolean', { label: 'Show badges', default: true }),
            control('isLoading', 'boolean', { label: 'Is loading', default: false }),
            control('maxVisibleActivities', 'number', { label: 'Max visible', default: 5, min: 1, max: 20 }),
        ],
        events: ['onSelect', 'onCauserClick', 'onSubjectClick'],
        notes: 'Fed by a local activity fixture; the component’s own fetch task is not invoked and nothing is persisted.',
    },
    file: {
        description: 'A file chip with preview, download and delete actions.',
        controls: [
            control('size', 'select', { options: SIZES, default: 'sm' }),
            control('hideExtension', 'boolean', { label: 'Hide extension', default: false }),
            control('dropdownButtonText', 'text', { label: 'Menu label', default: '' }),
        ],
        scenarios: [{ id: 'pdf', label: 'PDF document' }],
        events: ['onPreview', 'onDownload', 'onDelete'],
        notes: 'The file is a plain fixture object; download and delete callbacks only report to the event log.',
    },
    'comment-thread': {
        description: 'A comment thread with publish, reply, edit and delete callbacks.',
        controls: [control('disabled', 'boolean', { default: false }), control('buttonType', 'select', { label: 'Button type', options: BUTTON_TYPES, default: 'primary' })],
        scenarios: [{ id: 'thread', label: 'Three comments' }],
        events: ['onPublishComment', 'onPublishReply', 'onUpdateComment', 'onDeleteComment', 'onReloadComments'],
        notes: 'Comments are local fixtures. Publishing appends to local state and reports to the event log; nothing is persisted.',
    },

    // ================================================================ Calendars & Boards
    'full-calendar': {
        description: 'A FullCalendar wrapper for month/week/day event display.',
        controls: [],
        scenarios: [{ id: 'events', label: 'Four fixed events' }],
        events: ['onInit'],
        notes: 'Events are a fixed local fixture anchored to a constant date, so the preview never depends on today’s date or a calendar service.',
    },
    'event-calendar': {
        description: 'A scheduling calendar with views, drag/resize editing and resource rows.',
        controls: [
            control('view', 'select', { options: ['dayGridMonth', 'timeGridWeek', 'timeGridDay', 'listWeek'], default: 'dayGridMonth' }),
            control('editable', 'boolean', { default: false }),
            control('selectable', 'boolean', { default: false }),
            control('nowIndicator', 'boolean', { label: 'Now indicator', default: false }),
            control('height', 'number', { default: 520, min: 300, max: 900, step: 20 }),
        ],
        scenarios: [{ id: 'events', label: 'Four fixed events' }],
        events: ['onEventClick', 'onDateClick', 'onEventDrop', 'onEventResize', 'onDatesSet', 'onCalendarReady'],
        notes: 'The documentation page for this component also names ScheduleCalendar, which no longer exists in the addon — see PLAYGROUND.md. Events are fixed local fixtures.',
    },
    kanban: {
        description: 'A drag-and-drop board of columns and cards.',
        controls: [
            control('title', 'text', { default: 'Dispatch board' }),
            control('readonly', 'boolean', { default: false }),
            control('disabled', 'boolean', { default: false }),
            control('columnIdPath', 'text', { label: 'Column id path', default: 'id' }),
        ],
        scenarios: [{ id: 'board', label: 'Three columns' }],
        events: ['onCardDrop', 'onCardMove', 'onCardUpdate', 'onCardDelete', 'onCreateCard', 'onColumnDrop', 'onColumnMove'],
        notes: 'A deterministic three-column board held in local state; drags mutate the preview only.',
    },

    // ================================================================ Modals
    'modal/default': {
        description: 'The default modal chrome: title, body slot, confirm and decline buttons.',
        controls: [
            control('title', 'text', { default: 'Confirm action' }),
            control('bodyText', 'text', { label: 'Body text', default: 'This is the modal body.' }),
            control('acceptButtonText', 'text', { label: 'Confirm text', default: 'Confirm' }),
            control('declineButtonText', 'text', { label: 'Decline text', default: 'Cancel' }),
            control('modalIsOpened', 'boolean', { label: 'Is opened', default: true }),
        ],
        events: ['onSubmit', 'onClose'],
        notes: 'Rendered in place inside the preview rather than at the document root.',
    },
    ...modalLayout('confirm', 'A confirmation dialog with confirm and decline actions.', 'confirm()'),
    ...modalLayout('alert', 'An acknowledgement dialog with a single confirm action.', 'alert()'),
    ...modalLayout('prompt', 'A dialog that collects a single text value before confirming.', 'prompt()'),
    ...modalLayout('bulk-action', 'A dialog confirming an action across many selected records.', 'bulk()'),
    ...modalLayout('progress', 'A dialog showing determinate progress across steps.', 'progress()'),
    ...modalLayout('process', 'A dialog showing a multi-step process and its current stage.', 'process()'),
    ...modalLayout('loading', 'A blocking dialog shown while work is in flight.', 'loader()'),
    ...modalLayout('option-prompt', 'A dialog asking the user to choose one of several options.', 'userSelectOption()'),

    // ================================================================ Dashboard
    dashboard: {
        description: 'A widget dashboard with edit mode and a widget picker.',
        controls: [
            control('isEdit', 'boolean', { label: 'Edit mode', default: false }),
            control('stickyHeader', 'boolean', { label: 'Sticky header', default: false }),
            control('isSystemDashboard', 'boolean', { label: 'System dashboard', default: false }),
        ],
        scenarios: [{ id: 'widgets', label: 'Three local widgets' }],
        events: ['onLoad', 'onClose'],
        notes: 'Backed by a local dashboard fixture and three safe example widgets registered in the dummy registry. The dashboard service is not asked to persist anything.',
    },

    // ================================================================ Builders
    'report-builder': {
        description: 'A query and report composition surface.',
        controls: [
            control('title', 'text', { default: 'Deliveries by status' }),
            control('isLoading', 'boolean', { label: 'Is loading', default: false }),
            control('open', 'boolean', { default: true }),
        ],
        scenarios: [{ id: 'starter', label: 'Starter report' }],
        events: ['onChange', 'onQueryConfigChanged'],
        notes: 'A starter scenario with a static table list and initial query. No query is executed and no write is performed.',
    },
    'template-builder': {
        description: 'A drag-and-drop document template composer.',
        controls: [
            control('isOpen', 'boolean', { label: 'Is open', default: true }),
            control('isSaving', 'boolean', { label: 'Is saving', default: false }),
            control('zoom', 'number', { default: 100, min: 25, max: 200, step: 25 }),
        ],
        scenarios: [{ id: 'starter', label: 'Starter template' }],
        events: ['onSave', 'onAddElement', 'onSelectElement', 'onUpdateElement', 'onDeleteElement', 'onClose'],
        notes: 'A small local template fixture. Saving reports to the event log only; no API access.',
    },

    // ================================================================ Registry & Slots
    'registry-yield': {
        description: 'Renders components other extensions have registered into a named registry slot.',
        controls: [control('registryName', 'text', { label: 'Registry name', default: 'playground:demo' })],
        scenarios: [{ id: 'two', label: 'Two registered components' }],
        notes: 'Uses the dummy universe registry service with two safe local example components registered under a playground-only namespace.',
    },
};

/**
 * The eight modal layouts share an argument surface (`options`, `confirm`, `decline`,
 * `modalIsOpened`, `onConfirm`, `onDecline`) and are all reached through modals-manager, so their
 * entries are generated rather than repeated.
 */
function modalLayout(name, description, serviceMethod) {
    return {
        [`modal/layouts/${name}`]: {
            description,
            controls: [
                control('title', 'text', { default: titleize(name) }),
                control('body', 'text', { default: 'This dialog is rendered through the modals-manager service.' }),
                control('acceptButtonText', 'text', { label: 'Confirm text', default: 'Confirm' }),
                control('declineButtonText', 'text', { label: 'Decline text', default: 'Cancel' }),
            ],
            events: ['onConfirm', 'onDecline'],
            notes: `Shown the way the documentation instructs consumers to use it — through \`modalsManager.${serviceMethod}\`, not by rendering the layout directly.`,
            serviceMethod,
        },
    };
}

function titleize(name) {
    return name
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

/**
 * Public component identifier: `layout/resource/tabular` -> `Layout::Resource::Tabular`.
 */
function componentIdentifier(path) {
    return path
        .split('/')
        .map((segment) =>
            segment
                .split('-')
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join('')
        )
        .join('::');
}

/**
 * The registry, assembled from the allowlist. Order follows the documentation navigation.
 */
export const REGISTRY = DOCUMENTED_COMPONENTS.map((documented) => {
    const definition = DEFINITIONS[documented.path] ?? {};

    return {
        slug: slugFor(documented.path),
        path: documented.path,
        name: documented.name,
        category: documented.category,
        docsUrl: documented.docsUrl,
        component: componentIdentifier(documented.path),
        description: definition.description ?? '',
        sourcePath: `addon/components/${documented.path}.hbs`,
        testPaths: [`tests/integration/components/${documented.path}-test.js`],
        example: `playground/examples/${slugFor(documented.path)}`,
        controls: definition.controls ?? [],
        scenarios: definition.scenarios ?? [],
        events: definition.events ?? [],
        notes: definition.notes ?? '',
        serviceMethod: definition.serviceMethod ?? null,
    };
});

const BY_SLUG = new Map(REGISTRY.map((entry) => [entry.slug, entry]));

export function findBySlug(slug) {
    return BY_SLUG.get(slug) ?? null;
}

export function categories() {
    return REGISTRY.reduce((list, entry) => (list.includes(entry.category) ? list : [...list, entry.category]), []);
}

export default REGISTRY;
