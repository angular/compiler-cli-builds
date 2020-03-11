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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJFQUEyRjtJQUUzRiw0REFBb0Y7SUFDcEYsd0ZBQTJEO0lBQW5ELHlDQUFBLGFBQWEsQ0FBQTtJQUNyQix3RUFBc0Q7SUFBOUMsNEJBQUEsUUFBUSxDQUFBO0lBTWhCLFNBQWdCLE9BQU8sQ0FBQyxPQUFvQjtRQUMxQywyREFBMkQ7UUFDM0QsMkJBQWEsQ0FBQyxJQUFJLDhCQUFnQixDQUFDLElBQUksOEJBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxlQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUpELDBCQUlDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtDYWNoZWRGaWxlU3lzdGVtLCBOb2RlSlNGaWxlU3lzdGVtLCBzZXRGaWxlU3lzdGVtfSBmcm9tICcuLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuXG5pbXBvcnQge0FzeW5jTmdjY09wdGlvbnMsIE5nY2NPcHRpb25zLCBTeW5jTmdjY09wdGlvbnMsIG1haW5OZ2NjfSBmcm9tICcuL3NyYy9tYWluJztcbmV4cG9ydCB7Q29uc29sZUxvZ2dlcn0gZnJvbSAnLi9zcmMvbG9nZ2luZy9jb25zb2xlX2xvZ2dlcic7XG5leHBvcnQge0xvZ0xldmVsLCBMb2dnZXJ9IGZyb20gJy4vc3JjL2xvZ2dpbmcvbG9nZ2VyJztcbmV4cG9ydCB7QXN5bmNOZ2NjT3B0aW9ucywgTmdjY09wdGlvbnMsIFN5bmNOZ2NjT3B0aW9uc30gZnJvbSAnLi9zcmMvbWFpbic7XG5leHBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi9zcmMvdXRpbHMnO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJvY2VzcyhvcHRpb25zOiBBc3luY05nY2NPcHRpb25zKTogUHJvbWlzZTx2b2lkPjtcbmV4cG9ydCBmdW5jdGlvbiBwcm9jZXNzKG9wdGlvbnM6IFN5bmNOZ2NjT3B0aW9ucyk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gcHJvY2VzcyhvcHRpb25zOiBOZ2NjT3B0aW9ucyk6IHZvaWR8UHJvbWlzZTx2b2lkPiB7XG4gIC8vIFJlY3JlYXRlIHRoZSBmaWxlIHN5c3RlbSBvbiBlYWNoIGNhbGwgdG8gcmVzZXQgdGhlIGNhY2hlXG4gIHNldEZpbGVTeXN0ZW0obmV3IENhY2hlZEZpbGVTeXN0ZW0obmV3IE5vZGVKU0ZpbGVTeXN0ZW0oKSkpO1xuICByZXR1cm4gbWFpbk5nY2Mob3B0aW9ucyk7XG59XG4iXX0=