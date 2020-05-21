/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/cluster/utils", ["require", "exports", "cluster"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.sendMessageToWorker = exports.sendMessageToMaster = exports.Deferred = void 0;
    /// <reference types="node" />
    var cluster = require("cluster");
    /** Expose a `Promise` instance as well as APIs for resolving/rejecting it. */
    var Deferred = /** @class */ (function () {
        function Deferred() {
            var _this = this;
            /** The `Promise` instance associated with this deferred. */
            this.promise = new Promise(function (resolve, reject) {
                _this.resolve = resolve;
                _this.reject = reject;
            });
        }
        return Deferred;
    }());
    exports.Deferred = Deferred;
    /**
     * Send a message to the cluster master.
     * (This function should be invoked from cluster workers only.)
     *
     * @param msg The message to send to the cluster master.
     * @return A promise that is resolved once the message has been sent.
     */
    exports.sendMessageToMaster = function (msg) {
        if (cluster.isMaster) {
            throw new Error('Unable to send message to the master process: Already on the master process.');
        }
        return new Promise(function (resolve, reject) {
            if (process.send === undefined) {
                // Theoretically, this should never happen on a worker process.
                throw new Error('Unable to send message to the master process: Missing `process.send()`.');
            }
            process.send(msg, function (err) { return (err === null) ? resolve() : reject(err); });
        });
    };
    /**
     * Send a message to a cluster worker.
     * (This function should be invoked from the cluster master only.)
     *
     * @param workerId The ID of the recipient worker.
     * @param msg The message to send to the worker.
     * @return A promise that is resolved once the message has been sent.
     */
    exports.sendMessageToWorker = function (workerId, msg) {
        if (!cluster.isMaster) {
            throw new Error('Unable to send message to worker process: Sender is not the master process.');
        }
        var worker = cluster.workers[workerId];
        if ((worker === undefined) || worker.isDead() || !worker.isConnected()) {
            throw new Error('Unable to send message to worker process: Recipient does not exist or has disconnected.');
        }
        return new Promise(function (resolve, reject) {
            worker.send(msg, function (err) { return (err === null) ? resolve() : reject(err); });
        });
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2NsdXN0ZXIvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOEJBQThCO0lBRTlCLGlDQUFtQztJQU1uQyw4RUFBOEU7SUFDOUU7UUFBQTtZQUFBLGlCQXNCQztZQUxDLDREQUE0RDtZQUM1RCxZQUFPLEdBQUcsSUFBSSxPQUFPLENBQUksVUFBQyxPQUFPLEVBQUUsTUFBTTtnQkFDdkMsS0FBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7Z0JBQ3ZCLEtBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1lBQ3ZCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUFELGVBQUM7SUFBRCxDQUFDLEFBdEJELElBc0JDO0lBdEJZLDRCQUFRO0lBd0JyQjs7Ozs7O09BTUc7SUFDVSxRQUFBLG1CQUFtQixHQUFHLFVBQUMsR0FBc0I7UUFDeEQsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO1lBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsOEVBQThFLENBQUMsQ0FBQztTQUNqRztRQUVELE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUNqQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO2dCQUM5QiwrREFBK0Q7Z0JBQy9ELE1BQU0sSUFBSSxLQUFLLENBQUMseUVBQXlFLENBQUMsQ0FBQzthQUM1RjtZQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFVBQUMsR0FBZSxJQUFLLE9BQUEsQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQXhDLENBQXdDLENBQUMsQ0FBQztRQUNuRixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztJQUVGOzs7Ozs7O09BT0c7SUFDVSxRQUFBLG1CQUFtQixHQUFHLFVBQUMsUUFBZ0IsRUFBRSxHQUFvQjtRQUN4RSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRTtZQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLDZFQUE2RSxDQUFDLENBQUM7U0FDaEc7UUFFRCxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXpDLElBQUksQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQ3RFLE1BQU0sSUFBSSxLQUFLLENBQ1gseUZBQXlGLENBQUMsQ0FBQztTQUNoRztRQUVELE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUNqQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFDLEdBQWUsSUFBSyxPQUFBLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUF4QyxDQUF3QyxDQUFDLENBQUM7UUFDbEYsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmltcG9ydCAqIGFzIGNsdXN0ZXIgZnJvbSAnY2x1c3Rlcic7XG5cbmltcG9ydCB7TWVzc2FnZUZyb21Xb3JrZXIsIE1lc3NhZ2VUb1dvcmtlcn0gZnJvbSAnLi9hcGknO1xuXG5cblxuLyoqIEV4cG9zZSBhIGBQcm9taXNlYCBpbnN0YW5jZSBhcyB3ZWxsIGFzIEFQSXMgZm9yIHJlc29sdmluZy9yZWplY3RpbmcgaXQuICovXG5leHBvcnQgY2xhc3MgRGVmZXJyZWQ8VD4ge1xuICAvKipcbiAgICogUmVzb2x2ZSB0aGUgYXNzb2NpYXRlZCBwcm9taXNlIHdpdGggdGhlIHNwZWNpZmllZCB2YWx1ZS5cbiAgICogSWYgdGhlIHZhbHVlIGlzIGEgcmVqZWN0aW9uIChjb25zdHJ1Y3RlZCB3aXRoIGBQcm9taXNlLnJlamVjdCgpYCksIHRoZSBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWRcbiAgICogaW5zdGVhZC5cbiAgICpcbiAgICogQHBhcmFtIHZhbHVlIFRoZSB2YWx1ZSB0byByZXNvbHZlIHRoZSBwcm9taXNlIHdpdGguXG4gICAqL1xuICByZXNvbHZlITogKHZhbHVlOiBUKSA9PiB2b2lkO1xuXG4gIC8qKlxuICAgKiBSZWplY3RzIHRoZSBhc3NvY2lhdGVkIHByb21pc2Ugd2l0aCB0aGUgc3BlY2lmaWVkIHJlYXNvbi5cbiAgICpcbiAgICogQHBhcmFtIHJlYXNvbiBUaGUgcmVqZWN0aW9uIHJlYXNvbi5cbiAgICovXG4gIHJlamVjdCE6IChyZWFzb246IGFueSkgPT4gdm9pZDtcblxuICAvKiogVGhlIGBQcm9taXNlYCBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggdGhpcyBkZWZlcnJlZC4gKi9cbiAgcHJvbWlzZSA9IG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB0aGlzLnJlc29sdmUgPSByZXNvbHZlO1xuICAgIHRoaXMucmVqZWN0ID0gcmVqZWN0O1xuICB9KTtcbn1cblxuLyoqXG4gKiBTZW5kIGEgbWVzc2FnZSB0byB0aGUgY2x1c3RlciBtYXN0ZXIuXG4gKiAoVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgaW52b2tlZCBmcm9tIGNsdXN0ZXIgd29ya2VycyBvbmx5LilcbiAqXG4gKiBAcGFyYW0gbXNnIFRoZSBtZXNzYWdlIHRvIHNlbmQgdG8gdGhlIGNsdXN0ZXIgbWFzdGVyLlxuICogQHJldHVybiBBIHByb21pc2UgdGhhdCBpcyByZXNvbHZlZCBvbmNlIHRoZSBtZXNzYWdlIGhhcyBiZWVuIHNlbnQuXG4gKi9cbmV4cG9ydCBjb25zdCBzZW5kTWVzc2FnZVRvTWFzdGVyID0gKG1zZzogTWVzc2FnZUZyb21Xb3JrZXIpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgaWYgKGNsdXN0ZXIuaXNNYXN0ZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBzZW5kIG1lc3NhZ2UgdG8gdGhlIG1hc3RlciBwcm9jZXNzOiBBbHJlYWR5IG9uIHRoZSBtYXN0ZXIgcHJvY2Vzcy4nKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKHByb2Nlc3Muc2VuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBUaGVvcmV0aWNhbGx5LCB0aGlzIHNob3VsZCBuZXZlciBoYXBwZW4gb24gYSB3b3JrZXIgcHJvY2Vzcy5cbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHNlbmQgbWVzc2FnZSB0byB0aGUgbWFzdGVyIHByb2Nlc3M6IE1pc3NpbmcgYHByb2Nlc3Muc2VuZCgpYC4nKTtcbiAgICB9XG5cbiAgICBwcm9jZXNzLnNlbmQobXNnLCAoZXJyOiBFcnJvcnxudWxsKSA9PiAoZXJyID09PSBudWxsKSA/IHJlc29sdmUoKSA6IHJlamVjdChlcnIpKTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIFNlbmQgYSBtZXNzYWdlIHRvIGEgY2x1c3RlciB3b3JrZXIuXG4gKiAoVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgaW52b2tlZCBmcm9tIHRoZSBjbHVzdGVyIG1hc3RlciBvbmx5LilcbiAqXG4gKiBAcGFyYW0gd29ya2VySWQgVGhlIElEIG9mIHRoZSByZWNpcGllbnQgd29ya2VyLlxuICogQHBhcmFtIG1zZyBUaGUgbWVzc2FnZSB0byBzZW5kIHRvIHRoZSB3b3JrZXIuXG4gKiBAcmV0dXJuIEEgcHJvbWlzZSB0aGF0IGlzIHJlc29sdmVkIG9uY2UgdGhlIG1lc3NhZ2UgaGFzIGJlZW4gc2VudC5cbiAqL1xuZXhwb3J0IGNvbnN0IHNlbmRNZXNzYWdlVG9Xb3JrZXIgPSAod29ya2VySWQ6IG51bWJlciwgbXNnOiBNZXNzYWdlVG9Xb3JrZXIpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgaWYgKCFjbHVzdGVyLmlzTWFzdGVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gc2VuZCBtZXNzYWdlIHRvIHdvcmtlciBwcm9jZXNzOiBTZW5kZXIgaXMgbm90IHRoZSBtYXN0ZXIgcHJvY2Vzcy4nKTtcbiAgfVxuXG4gIGNvbnN0IHdvcmtlciA9IGNsdXN0ZXIud29ya2Vyc1t3b3JrZXJJZF07XG5cbiAgaWYgKCh3b3JrZXIgPT09IHVuZGVmaW5lZCkgfHwgd29ya2VyLmlzRGVhZCgpIHx8ICF3b3JrZXIuaXNDb25uZWN0ZWQoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1VuYWJsZSB0byBzZW5kIG1lc3NhZ2UgdG8gd29ya2VyIHByb2Nlc3M6IFJlY2lwaWVudCBkb2VzIG5vdCBleGlzdCBvciBoYXMgZGlzY29ubmVjdGVkLicpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB3b3JrZXIuc2VuZChtc2csIChlcnI6IEVycm9yfG51bGwpID0+IChlcnIgPT09IG51bGwpID8gcmVzb2x2ZSgpIDogcmVqZWN0KGVycikpO1xuICB9KTtcbn07XG4iXX0=