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
        define("@angular/compiler-cli/ngcc/src/execution/cluster/lock_file_with_child_process", ["require", "exports", "tslib", "cluster", "@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/index"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var cluster = require("cluster");
    var lock_file_with_child_process_1 = require("@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/index");
    /**
     * A `LockFileWithChildProcess` that is `cluster`-aware and does not spawn unlocker processes from
     * worker processes (only from the master process, which does the locking).
     */
    var ClusterLockFileWithChildProcess = /** @class */ (function (_super) {
        tslib_1.__extends(ClusterLockFileWithChildProcess, _super);
        function ClusterLockFileWithChildProcess() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ClusterLockFileWithChildProcess.prototype.write = function () {
            if (!cluster.isMaster) {
                // This is a worker process:
                // This method should only be on the master process.
                throw new Error('Tried to create a lock-file from a worker process.');
            }
            return _super.prototype.write.call(this);
        };
        ClusterLockFileWithChildProcess.prototype.createUnlocker = function (path) {
            if (cluster.isMaster) {
                // This is the master process:
                // Create the unlocker.
                return _super.prototype.createUnlocker.call(this, path);
            }
            return null;
        };
        return ClusterLockFileWithChildProcess;
    }(lock_file_with_child_process_1.LockFileWithChildProcess));
    exports.ClusterLockFileWithChildProcess = ClusterLockFileWithChildProcess;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ja19maWxlX3dpdGhfY2hpbGRfcHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9leGVjdXRpb24vY2x1c3Rlci9sb2NrX2ZpbGVfd2l0aF9jaGlsZF9wcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUtILGlDQUFtQztJQUduQywwSEFBb0Y7SUFHcEY7OztPQUdHO0lBQ0g7UUFBcUQsMkRBQXdCO1FBQTdFOztRQW9CQSxDQUFDO1FBbkJDLCtDQUFLLEdBQUw7WUFDRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRTtnQkFDckIsNEJBQTRCO2dCQUM1QixvREFBb0Q7Z0JBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMsb0RBQW9ELENBQUMsQ0FBQzthQUN2RTtZQUVELE9BQU8saUJBQU0sS0FBSyxXQUFFLENBQUM7UUFDdkIsQ0FBQztRQUVTLHdEQUFjLEdBQXhCLFVBQXlCLElBQW9CO1lBQzNDLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRTtnQkFDcEIsOEJBQThCO2dCQUM5Qix1QkFBdUI7Z0JBQ3ZCLE9BQU8saUJBQU0sY0FBYyxZQUFDLElBQUksQ0FBQyxDQUFDO2FBQ25DO1lBRUQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0gsc0NBQUM7SUFBRCxDQUFDLEFBcEJELENBQXFELHVEQUF3QixHQW9CNUU7SUFwQlksMEVBQStCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuXG5pbXBvcnQge0NoaWxkUHJvY2Vzc30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2NrRmlsZVdpdGhDaGlsZFByb2Nlc3N9IGZyb20gJy4uLy4uL2xvY2tpbmcvbG9ja19maWxlX3dpdGhfY2hpbGRfcHJvY2Vzcyc7XG5cblxuLyoqXG4gKiBBIGBMb2NrRmlsZVdpdGhDaGlsZFByb2Nlc3NgIHRoYXQgaXMgYGNsdXN0ZXJgLWF3YXJlIGFuZCBkb2VzIG5vdCBzcGF3biB1bmxvY2tlciBwcm9jZXNzZXMgZnJvbVxuICogd29ya2VyIHByb2Nlc3NlcyAob25seSBmcm9tIHRoZSBtYXN0ZXIgcHJvY2Vzcywgd2hpY2ggZG9lcyB0aGUgbG9ja2luZykuXG4gKi9cbmV4cG9ydCBjbGFzcyBDbHVzdGVyTG9ja0ZpbGVXaXRoQ2hpbGRQcm9jZXNzIGV4dGVuZHMgTG9ja0ZpbGVXaXRoQ2hpbGRQcm9jZXNzIHtcbiAgd3JpdGUoKTogdm9pZCB7XG4gICAgaWYgKCFjbHVzdGVyLmlzTWFzdGVyKSB7XG4gICAgICAvLyBUaGlzIGlzIGEgd29ya2VyIHByb2Nlc3M6XG4gICAgICAvLyBUaGlzIG1ldGhvZCBzaG91bGQgb25seSBiZSBvbiB0aGUgbWFzdGVyIHByb2Nlc3MuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RyaWVkIHRvIGNyZWF0ZSBhIGxvY2stZmlsZSBmcm9tIGEgd29ya2VyIHByb2Nlc3MuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1cGVyLndyaXRlKCk7XG4gIH1cblxuICBwcm90ZWN0ZWQgY3JlYXRlVW5sb2NrZXIocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBDaGlsZFByb2Nlc3N8bnVsbCB7XG4gICAgaWYgKGNsdXN0ZXIuaXNNYXN0ZXIpIHtcbiAgICAgIC8vIFRoaXMgaXMgdGhlIG1hc3RlciBwcm9jZXNzOlxuICAgICAgLy8gQ3JlYXRlIHRoZSB1bmxvY2tlci5cbiAgICAgIHJldHVybiBzdXBlci5jcmVhdGVVbmxvY2tlcihwYXRoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIl19