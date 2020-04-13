(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/main", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/logging/logger"], factory);
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
    var main_1 = require("@angular/compiler-cli/ngcc/src/main");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    exports.ConsoleLogger = console_logger_1.ConsoleLogger;
    var logger_1 = require("@angular/compiler-cli/ngcc/src/logging/logger");
    exports.LogLevel = logger_1.LogLevel;
    function process(options) {
        // Recreate the file system on each call to reset the cache
        file_system_1.setFileSystem(new file_system_1.CachedFileSystem(new file_system_1.NodeJSFileSystem()));
        return main_1.mainNgcc(options);
    }
    exports.process = process;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJFQUEyRjtJQUUzRiw0REFBb0Y7SUFFcEYsd0ZBQTJEO0lBQW5ELHlDQUFBLGFBQWEsQ0FBQTtJQUNyQix3RUFBc0Q7SUFBdEMsNEJBQUEsUUFBUSxDQUFBO0lBTXhCLFNBQWdCLE9BQU8sQ0FBQyxPQUFvQjtRQUMxQywyREFBMkQ7UUFDM0QsMkJBQWEsQ0FBQyxJQUFJLDhCQUFnQixDQUFDLElBQUksOEJBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxlQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUpELDBCQUlDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtDYWNoZWRGaWxlU3lzdGVtLCBOb2RlSlNGaWxlU3lzdGVtLCBzZXRGaWxlU3lzdGVtfSBmcm9tICcuLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuXG5pbXBvcnQge0FzeW5jTmdjY09wdGlvbnMsIG1haW5OZ2NjLCBOZ2NjT3B0aW9ucywgU3luY05nY2NPcHRpb25zfSBmcm9tICcuL3NyYy9tYWluJztcblxuZXhwb3J0IHtDb25zb2xlTG9nZ2VyfSBmcm9tICcuL3NyYy9sb2dnaW5nL2NvbnNvbGVfbG9nZ2VyJztcbmV4cG9ydCB7TG9nZ2VyLCBMb2dMZXZlbH0gZnJvbSAnLi9zcmMvbG9nZ2luZy9sb2dnZXInO1xuZXhwb3J0IHtBc3luY05nY2NPcHRpb25zLCBOZ2NjT3B0aW9ucywgU3luY05nY2NPcHRpb25zfSBmcm9tICcuL3NyYy9tYWluJztcbmV4cG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuL3NyYy91dGlscyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBwcm9jZXNzKG9wdGlvbnM6IEFzeW5jTmdjY09wdGlvbnMpOiBQcm9taXNlPHZvaWQ+O1xuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3Mob3B0aW9uczogU3luY05nY2NPcHRpb25zKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBwcm9jZXNzKG9wdGlvbnM6IE5nY2NPcHRpb25zKTogdm9pZHxQcm9taXNlPHZvaWQ+IHtcbiAgLy8gUmVjcmVhdGUgdGhlIGZpbGUgc3lzdGVtIG9uIGVhY2ggY2FsbCB0byByZXNldCB0aGUgY2FjaGVcbiAgc2V0RmlsZVN5c3RlbShuZXcgQ2FjaGVkRmlsZVN5c3RlbShuZXcgTm9kZUpTRmlsZVN5c3RlbSgpKSk7XG4gIHJldHVybiBtYWluTmdjYyhvcHRpb25zKTtcbn1cbiJdfQ==