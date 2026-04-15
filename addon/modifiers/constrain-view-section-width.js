import { modifier } from 'ember-modifier';

const SIDEBAR_SELECTOR = 'nav.next-sidebar';
const SECTION_SELECTOR = 'section.next-view-section';
const TABLIST_SELECTOR = '[role="tablist"]';

function getSidebarWidth() {
    return document.querySelector(SIDEBAR_SELECTOR)?.offsetWidth ?? 0;
}

function updateTablistMaxWidth(container, sidebarWidth) {
    const tablist = container.querySelector(TABLIST_SELECTOR);

    if (!tablist) {
        return;
    }

    const pageWidth = document.body.offsetWidth;
    tablist.style.maxWidth = `${Math.max(0, pageWidth - sidebarWidth)}px`;
}

function updateSectionWidth(sidebarWidth) {
    const section = document.querySelector(SECTION_SELECTOR);

    if (!section) {
        return;
    }

    section.style.width = `calc(100vw - ${sidebarWidth}px)`;
}

function updateLayout(container) {
    const sidebarWidth = getSidebarWidth();

    updateTablistMaxWidth(container, sidebarWidth);
    updateSectionWidth(sidebarWidth);
}

export default modifier(function constrainViewSectionWidth(element) {
    const applyLayout = () => updateLayout(element);

    applyLayout();

    window.addEventListener('resize', applyLayout);

    const sidebar = document.querySelector(SIDEBAR_SELECTOR);
    const observer = new ResizeObserver(applyLayout);

    if (sidebar) {
        observer.observe(sidebar);
    }

    return () => {
        window.removeEventListener('resize', applyLayout);
        observer.disconnect();
    };
});
