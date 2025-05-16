export default function getUrlParam(key) {
    const params = new URLSearchParams(window.location.search);

    // tag=a&tag=b -> ['a','b']
    const all = params.getAll(key);
    if (all.length > 1) {
        return all;
    }

    // tag[]=a&tag[]=b support
    const allBrackets = params.getAll(`${key}[]`);
    if (allBrackets.length > 1) {
        return allBrackets;
    }

    // Single-value cases
    const single = params.get(key) ?? params.get(`${key}[]`);

    return single === '' || single === null ? undefined : single;
}
