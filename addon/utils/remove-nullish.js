/* eslint-disable no-unused-vars */
export default function removeNullish(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== null && value !== undefined));
}
