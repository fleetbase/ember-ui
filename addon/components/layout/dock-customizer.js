import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import { guidFor } from '@ember/object/internals';
import { hasMethod, modifierKeyLabel, optionalService } from '../../utils/shell';

export const PERSONAL = 'personal';

/**
 * `Layout::DockCustomizer` — choose, order and lock the dock's modules (K6).
 *
 * People reorder the dock (drag, the ↑/↓ buttons, or Alt+↑/↓ on a row), remove
 * modules to "All apps" and add them back. Changes are a draft until Done;
 * Cancel and Escape discard them. Locked modules — set by an admin for the
 * person's role — cannot be removed.
 *
 * When `dock.canManageRoles`, a role picker switches the draft from "Just for
 * me" to a role's default dock (`dock.roleDefaults(roleId)` →
 * `{ order, locked }`), where each module also gets a lock toggle; Done saves it
 * with `dock.setRoleDefaults(roleId, { order, locked })`. Roles come from
 * `@roles` (`[{ id, name }]`) or `dock.roles`.
 *
 * The behaviour toggles (badges, open on hover, pinned rail, position, size)
 * belong to `dock-preferences` and apply immediately, so the dock behind the
 * dialog previews them.
 *
 * Everything that changes the dock itself needs ember-core's `dock` service;
 * without it the dialog says so and offers only the behaviour toggles.
 */
export default class LayoutDockCustomizerComponent extends Component {
    @service dockPreferences;

    @tracked mode = PERSONAL;
    // Filled by load() from the constructor; read only when the dock service exists.
    @tracked order;
    @tracked locked;
    @tracked dragId = null;

    id = guidFor(this);
    initialOrder = [];

    constructor() {
        super(...arguments);
        this.load();
    }

    get dock() {
        return optionalService(getOwner(this), 'dock');
    }

    get titleId() {
        return `${this.id}-title`;
    }

    get isRoleMode() {
        return this.mode !== PERSONAL;
    }

    get canManageRoles() {
        return Boolean(this.dock && this.dock.canManageRoles);
    }

    get roles() {
        return this.args.roles || (this.dock && this.dock.roles) || [];
    }

    get firstShortcut() {
        return `${modifierKeyLabel()}1`;
    }

    get allAppsShortcut() {
        return `${modifierKeyLabel()}0`;
    }

    get canReset() {
        return !this.isRoleMode && hasMethod(this.dock, 'resetToDefault');
    }

    /** Every module the dock knows about, visible or hidden, by id. */
    get modules() {
        const modules = new Map();
        for (const item of [...(this.dock.items || []), ...(this.dock.hiddenItems || [])]) {
            modules.set(item.id, item);
        }
        return modules;
    }

    get inDock() {
        const modules = this.modules;
        const modifierKey = modifierKeyLabel();

        return this.order
            .filter((id) => modules.has(id))
            .map((id, index, ids) => ({
                id,
                item: modules.get(id),
                shortcut: index < 9 ? `${modifierKey}${index + 1}` : null,
                isLocked: this.locked.includes(id),
                isFirst: index === 0,
                isLast: index === ids.length - 1,
                isDragging: this.dragId === id,
            }));
    }

    get available() {
        return [...this.modules.values()].filter((item) => !this.order.includes(item.id));
    }

    /** (Re)reads the draft from the dock: the person's own dock, or the selected role's default. */
    load() {
        if (!this.dock) {
            return;
        }

        if (this.isRoleMode) {
            // A role's saved default may name modules that are no longer installed.
            const modules = this.modules;
            const defaults = (hasMethod(this.dock, 'roleDefaults') && this.dock.roleDefaults(this.mode)) || {};
            this.order = (defaults.order || []).filter((id) => modules.has(id));
            this.locked = (defaults.locked || []).filter((id) => modules.has(id));
        } else {
            this.order = (this.dock.items || []).map((item) => item.id);
            this.locked = [...(this.dock.lockedIds || [])];
        }

        this.initialOrder = [...this.order];
    }

    @action selectMode(event) {
        this.mode = event.target.value;
        this.load();
    }

    @action focusFirst(element) {
        element.querySelector('button, select, input').focus();
    }

    move(id, offset) {
        const order = [...this.order];
        const from = order.indexOf(id);
        const to = Math.min(Math.max(from + offset, 0), order.length - 1);
        order.splice(from, 1);
        order.splice(to, 0, id);
        this.order = order;
    }

    @action moveUp(id) {
        this.move(id, -1);
    }

    @action moveDown(id) {
        this.move(id, 1);
    }

    @action onRowKeydown(id, event) {
        if (!event.altKey) {
            return;
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            this.move(id, event.key === 'ArrowUp' ? -1 : 1);
        }
    }

    @action remove(id) {
        if (!this.isRoleMode && this.locked.includes(id)) {
            return;
        }

        this.order = this.order.filter((candidate) => candidate !== id);
        this.locked = this.locked.filter((candidate) => candidate !== id);
    }

    @action add(id) {
        this.order = [...this.order, id];
    }

    @action toggleLock(id) {
        this.locked = this.locked.includes(id) ? this.locked.filter((candidate) => candidate !== id) : [...this.locked, id];
    }

    @action dragStart(id, event) {
        this.dragId = id;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', id);
        }
    }

    @action dragOver(event) {
        event.preventDefault();
    }

    @action drop(targetId, event) {
        event.preventDefault();
        const dragId = this.dragId;
        this.dragId = null;
        if (!dragId || dragId === targetId) {
            return;
        }

        const order = this.order.filter((id) => id !== dragId);
        order.splice(order.indexOf(targetId) + (this.order.indexOf(dragId) < this.order.indexOf(targetId) ? 1 : 0), 0, dragId);
        this.order = order;
    }

    @action dragEnd() {
        this.dragId = null;
    }

    @action setPreference(key, value) {
        this.dockPreferences.update(key, value);
    }

    @action togglePreference(key) {
        this.dockPreferences.toggle(key);
    }

    @action reset() {
        this.dock.resetToDefault();
        this.load();
    }

    @action save() {
        if (this.dock) {
            if (this.isRoleMode) {
                this.dock.setRoleDefaults(this.mode, { order: [...this.order], locked: [...this.locked] });
            } else {
                for (const id of this.order.filter((candidate) => !this.initialOrder.includes(candidate))) {
                    this.dock.show(id);
                }
                for (const id of this.initialOrder.filter((candidate) => !this.order.includes(candidate))) {
                    this.dock.hide(id);
                }
                this.dock.reorder([...this.order]);
            }
        }

        this.close();
    }

    @action close() {
        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }

    @action onKeydown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.close();
        }
    }
}
