import { helper } from '@ember/component/helper';

export default helper(function joinColumnList([selectedColumns, tableName]) {
    if (!selectedColumns || !selectedColumns.length) {
        return 'No columns selected';
    }

    return selectedColumns
        .map((column) => {
            let columnStr = `${tableName}.${column.name}`;
            if (column.alias) {
                columnStr += ` AS ${column.alias}`;
            }
            return columnStr;
        })
        .join(', ');
});
