export const secondsToTime = (secs) => {
    const value = Number(secs);
    const totalSeconds = Number.isFinite(value) ? Math.max(0, Math.ceil(value)) : 0;
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
        d: days,
        h: hours,
        m: minutes,
        s: seconds,
    };
};

export default function formatDuration(secs) {
    const time = secondsToTime(secs);
    const parts = [];

    if (time.d) {
        parts.push(`${time.d}d`);
    }

    if (time.h) {
        parts.push(`${time.h}h`);
    }

    if (!time.d && time.m) {
        parts.push(`${time.m}m`);
    }

    if (!time.d && !time.h && parts.length < 2 && time.s) {
        parts.push(`${time.s}s`);
    }

    return parts.length ? parts.join(' ') : '0s';
}
