import { modifier } from 'ember-modifier';

export default modifier(function setContainerDimensions(
    element,
    [
        options = {
            containerEl: null,
            verticalTopPadding: 0,
            verticalBottomPadding: 0,
            horizontalLeftPadding: 0,
            horizontalRightPadding: 0,
        },
    ]
) {
    const { containerEl } = options;
    let container = typeof containerEl === 'string' ? document.querySelector(containerEl) : containerEl instanceof HTMLElement ? containerEl : element.parentNode;

    if (!(container instanceof HTMLElement)) {
        container = element.parentNode;
    }

    element.style.width = `${container.offsetWidth - (options.horizontalLeftPadding || 0) - (options.horizontalRightPadding || 0)}px`;
    element.style.height = `${container.offsetHeight - (options.verticalTopPadding || 0) - (options.verticalBottomPadding || 0)}px`;
});
