(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/main", "@angular/compiler-cli/ngcc/src/logging/console_logger"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var main_1 = require("@angular/compiler-cli/ngcc/src/main");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    exports.ConsoleLogger = console_logger_1.ConsoleLogger;
    exports.LogLevel = console_logger_1.LogLevel;
    function process() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        // Recreate the file system on each call to reset the cache
        file_system_1.setFileSystem(new file_system_1.CachedFileSystem(new file_system_1.NodeJSFileSystem()));
        return main_1.mainNgcc.apply(void 0, tslib_1.__spread(args));
    }
    exports.process = process;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBMkY7SUFFM0YsNERBQW9DO0lBQ3BDLHdGQUFxRTtJQUE3RCx5Q0FBQSxhQUFhLENBQUE7SUFBRSxvQ0FBQSxRQUFRLENBQUE7SUFLL0IsU0FBZ0IsT0FBTztRQUFDLGNBQW9DO2FBQXBDLFVBQW9DLEVBQXBDLHFCQUFvQyxFQUFwQyxJQUFvQztZQUFwQyx5QkFBb0M7O1FBQzFELDJEQUEyRDtRQUMzRCwyQkFBYSxDQUFDLElBQUksOEJBQWdCLENBQUMsSUFBSSw4QkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RCxPQUFPLGVBQVEsZ0NBQUksSUFBSSxHQUFFO0lBQzNCLENBQUM7SUFKRCwwQkFJQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q2FjaGVkRmlsZVN5c3RlbSwgTm9kZUpTRmlsZVN5c3RlbSwgc2V0RmlsZVN5c3RlbX0gZnJvbSAnLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHttYWluTmdjY30gZnJvbSAnLi9zcmMvbWFpbic7XG5leHBvcnQge0NvbnNvbGVMb2dnZXIsIExvZ0xldmVsfSBmcm9tICcuL3NyYy9sb2dnaW5nL2NvbnNvbGVfbG9nZ2VyJztcbmV4cG9ydCB7TG9nZ2VyfSBmcm9tICcuL3NyYy9sb2dnaW5nL2xvZ2dlcic7XG5leHBvcnQge05nY2NPcHRpb25zfSBmcm9tICcuL3NyYy9tYWluJztcbmV4cG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuL3NyYy91dGlscyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBwcm9jZXNzKC4uLmFyZ3M6IFBhcmFtZXRlcnM8dHlwZW9mIG1haW5OZ2NjPikge1xuICAvLyBSZWNyZWF0ZSB0aGUgZmlsZSBzeXN0ZW0gb24gZWFjaCBjYWxsIHRvIHJlc2V0IHRoZSBjYWNoZVxuICBzZXRGaWxlU3lzdGVtKG5ldyBDYWNoZWRGaWxlU3lzdGVtKG5ldyBOb2RlSlNGaWxlU3lzdGVtKCkpKTtcbiAgcmV0dXJuIG1haW5OZ2NjKC4uLmFyZ3MpO1xufVxuIl19