import Service from '@ember/service';

/**
 * Stub of the host console's socketcluster `socket` service. `listen` records and never fires.
 * `instance()` returns a fake socket whose channels resolve their `subscribe` listener
 * immediately and yield no messages (async iteration completes at once).
 */
export default class SocketService extends Service {
    calls = [];

    listen(channelId, callback) {
        this.calls.push({ method: 'listen', args: [channelId, callback] });
    }

    instance() {
        this.calls.push({ method: 'instance', args: [] });
        return {
            subscribe: (channelId) => this._createFakeChannel(channelId),
            unsubscribe: () => {},
            closeChannel: () => {},
        };
    }

    _createFakeChannel(channelId) {
        return {
            channelId,
            listener: () => ({
                once: () => Promise.resolve({ channelId }),
            }),
            close: () => {},
            unsubscribe: () => {},
            [Symbol.asyncIterator]() {
                return {
                    next: () => Promise.resolve({ done: true, value: undefined }),
                };
            },
        };
    }
}
