/**
 * The documented component surface of https://fleetbase.io/docs/ui.
 *
 * This list — not `app/components` — is the playground's scope authority. The addon exports
 * 275 public components; the official documentation covers 63 of them. Only what is documented
 * gets an interactive page, so the playground stays a complement to the documentation rather
 * than a second, exhaustive API browser.
 *
 * `path` is the Ember resolution path (what `app/components/<path>.js` re-exports), NOT a
 * display name lowercased: `Layout::Resource::Tabular` resolves through `layout/resource/tabular`
 * and `RegistryYield` through `registry-yield`.
 *
 * Grouped documentation pages are expected: the six `Layout::*` scaffolding components share
 * `/layout/overview`, the four resource layouts share `/layout/resource-tabular`, and the eight
 * modal layouts share `/modals/modal-layouts`. Several components therefore point at the same URL.
 *
 * When fleetbase.io/docs/ui changes, update this file first — `tests/unit/playground/allowlist-test.js`
 * and the registry validation test are what hold the rest of the playground to it. See PLAYGROUND.md.
 */

export const DOCS_ROOT = 'https://fleetbase.io/docs/ui';

const docs = (suffix) => `${DOCS_ROOT}/${suffix}`;

/**
 * Categories, in the order the official documentation navigation presents them.
 */
export const CATEGORIES = [
    'Layout & Structure',
    'Navigation',
    'Buttons & Actions',
    'Forms & Inputs',
    'Data Display',
    'Calendars & Boards',
    'Modals',
    'Dashboard',
    'Builders',
    'Registry & Slots',
];

/**
 * Turn an Ember resolution path into a playground slug: `layout/resource/tabular` -> `layout-resource-tabular`.
 */
export function slugFor(path) {
    return path.replace(/\//g, '-');
}

export const DOCUMENTED_COMPONENTS = [
    // ---------------------------------------------------------------- Layout & Structure
    { path: 'layout/container', name: 'Layout::Container', category: 'Layout & Structure', docsUrl: docs('layout/overview') },
    { path: 'layout/header', name: 'Layout::Header', category: 'Layout & Structure', docsUrl: docs('layout/overview') },
    { path: 'layout/sidebar', name: 'Layout::Sidebar', category: 'Layout & Structure', docsUrl: docs('layout/overview') },
    { path: 'layout/main', name: 'Layout::Main', category: 'Layout & Structure', docsUrl: docs('layout/overview') },
    { path: 'layout/section', name: 'Layout::Section', category: 'Layout & Structure', docsUrl: docs('layout/overview') },
    { path: 'layout/mobile-navbar', name: 'Layout::MobileNavbar', category: 'Layout & Structure', docsUrl: docs('layout/overview') },
    { path: 'content-panel', name: 'ContentPanel', category: 'Layout & Structure', docsUrl: docs('layout/content-panel') },
    { path: 'overlay', name: 'Overlay', category: 'Layout & Structure', docsUrl: docs('layout/overlay') },
    { path: 'drawer', name: 'Drawer', category: 'Layout & Structure', docsUrl: docs('layout/drawer') },
    { path: 'layout/resource/tabular', name: 'Layout::Resource::Tabular', category: 'Layout & Structure', docsUrl: docs('layout/resource-tabular') },
    { path: 'layout/resource/card', name: 'Layout::Resource::Card', category: 'Layout & Structure', docsUrl: docs('layout/resource-tabular') },
    { path: 'layout/resource/cards-grid', name: 'Layout::Resource::CardsGrid', category: 'Layout & Structure', docsUrl: docs('layout/resource-tabular') },
    { path: 'layout/resource/panel', name: 'Layout::Resource::Panel', category: 'Layout & Structure', docsUrl: docs('layout/resource-tabular') },
    { path: 'floating', name: 'Floating', category: 'Layout & Structure', docsUrl: docs('layout/floating') },
    { path: 'attach/tooltip', name: 'Attach::Tooltip', category: 'Layout & Structure', docsUrl: docs('layout/attach-tooltip') },
    { path: 'attach/popover', name: 'Attach::Popover', category: 'Layout & Structure', docsUrl: docs('layout/attach-popover') },
    { path: 'spacer', name: 'Spacer', category: 'Layout & Structure', docsUrl: docs('layout/spacer') },

    // ---------------------------------------------------------------- Navigation
    { path: 'tab-navigation', name: 'TabNavigation', category: 'Navigation', docsUrl: docs('navigation/tab-navigation') },
    { path: 'tabs', name: 'Tabs', category: 'Navigation', docsUrl: docs('navigation/tabs') },
    { path: 'dropdown-button', name: 'DropdownButton', category: 'Navigation', docsUrl: docs('navigation/dropdown-button') },

    // ---------------------------------------------------------------- Buttons & Actions
    { path: 'button', name: 'Button', category: 'Buttons & Actions', docsUrl: docs('actions/button') },
    { path: 'click-to-copy', name: 'ClickToCopy', category: 'Buttons & Actions', docsUrl: docs('actions/click-to-copy') },
    { path: 'click-to-reveal', name: 'ClickToReveal', category: 'Buttons & Actions', docsUrl: docs('actions/click-to-reveal') },

    // ---------------------------------------------------------------- Forms & Inputs
    { path: 'input-group', name: 'InputGroup', category: 'Forms & Inputs', docsUrl: docs('inputs/input-group') },
    { path: 'checkbox', name: 'Checkbox', category: 'Forms & Inputs', docsUrl: docs('inputs/checkbox') },
    { path: 'toggle', name: 'Toggle', category: 'Forms & Inputs', docsUrl: docs('inputs/toggle') },
    { path: 'select', name: 'Select', category: 'Forms & Inputs', docsUrl: docs('inputs/select') },
    { path: 'multi-select', name: 'MultiSelect', category: 'Forms & Inputs', docsUrl: docs('inputs/multi-select') },
    { path: 'combo-box', name: 'ComboBox', category: 'Forms & Inputs', docsUrl: docs('inputs/combo-box') },
    { path: 'model-select', name: 'ModelSelect', category: 'Forms & Inputs', docsUrl: docs('inputs/model-select') },
    { path: 'date-picker', name: 'DatePicker', category: 'Forms & Inputs', docsUrl: docs('inputs/date-picker') },
    { path: 'date-time-input', name: 'DateTimeInput', category: 'Forms & Inputs', docsUrl: docs('inputs/date-time-input') },
    { path: 'phone-input', name: 'PhoneInput', category: 'Forms & Inputs', docsUrl: docs('inputs/phone-input') },
    { path: 'coordinates-input', name: 'CoordinatesInput', category: 'Forms & Inputs', docsUrl: docs('inputs/coordinates-input') },
    { path: 'model-coordinates-input', name: 'ModelCoordinatesInput', category: 'Forms & Inputs', docsUrl: docs('inputs/model-coordinates-input') },
    { path: 'unit-input', name: 'UnitInput', category: 'Forms & Inputs', docsUrl: docs('inputs/unit-input') },
    { path: 'money-input', name: 'MoneyInput', category: 'Forms & Inputs', docsUrl: docs('inputs/money-input') },
    { path: 'file-upload', name: 'FileUpload', category: 'Forms & Inputs', docsUrl: docs('inputs/file-upload') },

    // ---------------------------------------------------------------- Data Display
    { path: 'table', name: 'Table', category: 'Data Display', docsUrl: docs('display/table') },
    { path: 'badge', name: 'Badge', category: 'Data Display', docsUrl: docs('display/badge') },
    { path: 'pill', name: 'Pill', category: 'Data Display', docsUrl: docs('display/pill') },
    { path: 'progress-bar', name: 'ProgressBar', category: 'Data Display', docsUrl: docs('display/progress-bar') },
    { path: 'spinner', name: 'Spinner', category: 'Data Display', docsUrl: docs('display/spinner') },
    { path: 'timeline', name: 'Timeline', category: 'Data Display', docsUrl: docs('display/timeline') },
    { path: 'activity-log', name: 'ActivityLog', category: 'Data Display', docsUrl: docs('display/activity-log') },
    { path: 'file', name: 'File', category: 'Data Display', docsUrl: docs('display/file') },
    { path: 'comment-thread', name: 'CommentThread', category: 'Data Display', docsUrl: docs('display/comment-thread') },

    // ---------------------------------------------------------------- Calendars & Boards
    { path: 'full-calendar', name: 'FullCalendar', category: 'Calendars & Boards', docsUrl: docs('scheduling/full-calendar') },
    { path: 'event-calendar', name: 'EventCalendar', category: 'Calendars & Boards', docsUrl: docs('scheduling/event-calendar') },
    { path: 'kanban', name: 'Kanban', category: 'Calendars & Boards', docsUrl: docs('scheduling/kanban') },

    // ---------------------------------------------------------------- Modals
    { path: 'modal/default', name: 'Modal::Default', category: 'Modals', docsUrl: docs('modals/overview') },
    { path: 'modal/layouts/confirm', name: 'Modal::Layouts::Confirm', category: 'Modals', docsUrl: docs('modals/modal-layouts') },
    { path: 'modal/layouts/alert', name: 'Modal::Layouts::Alert', category: 'Modals', docsUrl: docs('modals/modal-layouts') },
    { path: 'modal/layouts/prompt', name: 'Modal::Layouts::Prompt', category: 'Modals', docsUrl: docs('modals/modal-layouts') },
    { path: 'modal/layouts/bulk-action', name: 'Modal::Layouts::BulkAction', category: 'Modals', docsUrl: docs('modals/modal-layouts') },
    { path: 'modal/layouts/progress', name: 'Modal::Layouts::Progress', category: 'Modals', docsUrl: docs('modals/modal-layouts') },
    { path: 'modal/layouts/process', name: 'Modal::Layouts::Process', category: 'Modals', docsUrl: docs('modals/modal-layouts') },
    { path: 'modal/layouts/loading', name: 'Modal::Layouts::Loading', category: 'Modals', docsUrl: docs('modals/modal-layouts') },
    { path: 'modal/layouts/option-prompt', name: 'Modal::Layouts::OptionPrompt', category: 'Modals', docsUrl: docs('modals/modal-layouts') },

    // ---------------------------------------------------------------- Dashboard
    { path: 'dashboard', name: 'Dashboard', category: 'Dashboard', docsUrl: docs('dashboard/overview') },

    // ---------------------------------------------------------------- Builders
    { path: 'report-builder', name: 'ReportBuilder', category: 'Builders', docsUrl: docs('builders/report-builder') },
    { path: 'template-builder', name: 'TemplateBuilder', category: 'Builders', docsUrl: docs('builders/template-builder') },

    // ---------------------------------------------------------------- Registry & Slots
    { path: 'registry-yield', name: 'RegistryYield', category: 'Registry & Slots', docsUrl: docs('registry/registry-yield') },
];

/**
 * `ScheduleCalendar` is still named on /docs/ui/scheduling/event-calendar, but it and
 * `ScheduleItemCard` were deleted from this addon as confirmed dead code (commit e6a3903,
 * during PR #143). They are deliberately absent here: the playground documents what exists.
 * The official documentation is what needs correcting. See PLAYGROUND.md.
 */
export const REMOVED_FROM_ADDON_STILL_IN_DOCS = ['ScheduleCalendar', 'ScheduleItemCard'];

export default DOCUMENTED_COMPONENTS;
