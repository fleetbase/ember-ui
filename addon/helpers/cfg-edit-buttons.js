import { helper } from '@ember/component/helper';

export default helper(function cfgEditButtons([cfg], { permission, disabled, onClick }) {
    return [
        {
            type: 'default',
            text: 'Edit',
            icon: 'pencil',
            iconPrefix: 'fas',
            permission,
            disabled,
            onClick: () => {
                if (typeof onClick === 'function') {
                    return onClick(cfg);
                }
                // default fallback
                cfg.isEditing = true;
            },
        },
    ];
});
