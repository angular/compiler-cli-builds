(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/unlocker", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    var util_1 = require("@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/util");
    /// <reference types="node" />
    // This file is an entry-point for the child-process that is started by `LockFileWithChildProcess`
    // to ensure that the lock-file is removed when the primary process exits unexpectedly.
    // We have no choice but to use the node.js file-system here since we are in a separate process
    // from the main ngcc run, which may be running a mock file-system from within a test.
    var fs = new file_system_1.NodeJSFileSystem();
    // We create a logger that has the same logging level as the parent process, since it should have
    // been passed through as one of the args
    var logLevel = parseInt(process.argv.pop(), 10);
    var logger = new console_logger_1.ConsoleLogger(logLevel);
    // We must store the parent PID now as it changes if the parent process is killed early
    var ppid = process.ppid.toString();
    // The path to the lock-file to remove should have been passed as one of the args
    var lockFilePath = fs.resolve(process.argv.pop());
    logger.debug("Starting unlocker at process " + process.pid + " on behalf of process " + ppid);
    logger.debug("The lock-file path is " + lockFilePath);
    /**
     * When the parent process exits (for whatever reason) remove the loc-file if it exists and as long
     * as it was one that was created by the parent process.
     */
    process.on('disconnect', function () { util_1.removeLockFile(fs, logger, lockFilePath, ppid); });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5sb2NrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvbG9ja2luZy9sb2NrX2ZpbGVfd2l0aF9jaGlsZF9wcm9jZXNzL3VubG9ja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQW1FO0lBQ25FLHdGQUEyRDtJQUMzRCxpR0FBc0M7SUFFdEMsOEJBQThCO0lBRTlCLGtHQUFrRztJQUNsRyx1RkFBdUY7SUFFdkYsK0ZBQStGO0lBQy9GLHNGQUFzRjtJQUN0RixJQUFNLEVBQUUsR0FBRyxJQUFJLDhCQUFnQixFQUFFLENBQUM7SUFFbEMsaUdBQWlHO0lBQ2pHLHlDQUF5QztJQUN6QyxJQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNwRCxJQUFNLE1BQU0sR0FBRyxJQUFJLDhCQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFM0MsdUZBQXVGO0lBQ3ZGLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7SUFFckMsaUZBQWlGO0lBQ2pGLElBQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUksQ0FBQyxDQUFDO0lBRXRELE1BQU0sQ0FBQyxLQUFLLENBQUMsa0NBQWdDLE9BQU8sQ0FBQyxHQUFHLDhCQUF5QixJQUFNLENBQUMsQ0FBQztJQUN6RixNQUFNLENBQUMsS0FBSyxDQUFDLDJCQUF5QixZQUFjLENBQUMsQ0FBQztJQUV0RDs7O09BR0c7SUFDSCxPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxjQUFRLHFCQUFjLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Tm9kZUpTRmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q29uc29sZUxvZ2dlcn0gZnJvbSAnLi4vLi4vbG9nZ2luZy9jb25zb2xlX2xvZ2dlcic7XG5pbXBvcnQge3JlbW92ZUxvY2tGaWxlfSBmcm9tICcuL3V0aWwnO1xuXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuXG4vLyBUaGlzIGZpbGUgaXMgYW4gZW50cnktcG9pbnQgZm9yIHRoZSBjaGlsZC1wcm9jZXNzIHRoYXQgaXMgc3RhcnRlZCBieSBgTG9ja0ZpbGVXaXRoQ2hpbGRQcm9jZXNzYFxuLy8gdG8gZW5zdXJlIHRoYXQgdGhlIGxvY2stZmlsZSBpcyByZW1vdmVkIHdoZW4gdGhlIHByaW1hcnkgcHJvY2VzcyBleGl0cyB1bmV4cGVjdGVkbHkuXG5cbi8vIFdlIGhhdmUgbm8gY2hvaWNlIGJ1dCB0byB1c2UgdGhlIG5vZGUuanMgZmlsZS1zeXN0ZW0gaGVyZSBzaW5jZSB3ZSBhcmUgaW4gYSBzZXBhcmF0ZSBwcm9jZXNzXG4vLyBmcm9tIHRoZSBtYWluIG5nY2MgcnVuLCB3aGljaCBtYXkgYmUgcnVubmluZyBhIG1vY2sgZmlsZS1zeXN0ZW0gZnJvbSB3aXRoaW4gYSB0ZXN0LlxuY29uc3QgZnMgPSBuZXcgTm9kZUpTRmlsZVN5c3RlbSgpO1xuXG4vLyBXZSBjcmVhdGUgYSBsb2dnZXIgdGhhdCBoYXMgdGhlIHNhbWUgbG9nZ2luZyBsZXZlbCBhcyB0aGUgcGFyZW50IHByb2Nlc3MsIHNpbmNlIGl0IHNob3VsZCBoYXZlXG4vLyBiZWVuIHBhc3NlZCB0aHJvdWdoIGFzIG9uZSBvZiB0aGUgYXJnc1xuY29uc3QgbG9nTGV2ZWwgPSBwYXJzZUludChwcm9jZXNzLmFyZ3YucG9wKCkgISwgMTApO1xuY29uc3QgbG9nZ2VyID0gbmV3IENvbnNvbGVMb2dnZXIobG9nTGV2ZWwpO1xuXG4vLyBXZSBtdXN0IHN0b3JlIHRoZSBwYXJlbnQgUElEIG5vdyBhcyBpdCBjaGFuZ2VzIGlmIHRoZSBwYXJlbnQgcHJvY2VzcyBpcyBraWxsZWQgZWFybHlcbmNvbnN0IHBwaWQgPSBwcm9jZXNzLnBwaWQudG9TdHJpbmcoKTtcblxuLy8gVGhlIHBhdGggdG8gdGhlIGxvY2stZmlsZSB0byByZW1vdmUgc2hvdWxkIGhhdmUgYmVlbiBwYXNzZWQgYXMgb25lIG9mIHRoZSBhcmdzXG5jb25zdCBsb2NrRmlsZVBhdGggPSBmcy5yZXNvbHZlKHByb2Nlc3MuYXJndi5wb3AoKSAhKTtcblxubG9nZ2VyLmRlYnVnKGBTdGFydGluZyB1bmxvY2tlciBhdCBwcm9jZXNzICR7cHJvY2Vzcy5waWR9IG9uIGJlaGFsZiBvZiBwcm9jZXNzICR7cHBpZH1gKTtcbmxvZ2dlci5kZWJ1ZyhgVGhlIGxvY2stZmlsZSBwYXRoIGlzICR7bG9ja0ZpbGVQYXRofWApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBhcmVudCBwcm9jZXNzIGV4aXRzIChmb3Igd2hhdGV2ZXIgcmVhc29uKSByZW1vdmUgdGhlIGxvYy1maWxlIGlmIGl0IGV4aXN0cyBhbmQgYXMgbG9uZ1xuICogYXMgaXQgd2FzIG9uZSB0aGF0IHdhcyBjcmVhdGVkIGJ5IHRoZSBwYXJlbnQgcHJvY2Vzcy5cbiAqL1xucHJvY2Vzcy5vbignZGlzY29ubmVjdCcsICgpID0+IHsgcmVtb3ZlTG9ja0ZpbGUoZnMsIGxvZ2dlciwgbG9ja0ZpbGVQYXRoLCBwcGlkKTsgfSk7XG4iXX0=