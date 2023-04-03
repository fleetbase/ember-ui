export default function removeUrlParam(key) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.delete(key);
}
