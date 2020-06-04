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
    exports.process = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var main_1 = require("@angular/compiler-cli/ngcc/src/main");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    Object.defineProperty(exports, "ConsoleLogger", { enumerable: true, get: function () { return console_logger_1.ConsoleLogger; } });
    var logger_1 = require("@angular/compiler-cli/ngcc/src/logging/logger");
    Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return logger_1.LogLevel; } });
    function process(options) {
        file_system_1.setFileSystem(new file_system_1.NodeJSFileSystem());
        return main_1.mainNgcc(options);
    }
    exports.process = process;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBeUU7SUFFekUsNERBQW9DO0lBR3BDLHdGQUEyRDtJQUFuRCwrR0FBQSxhQUFhLE9BQUE7SUFDckIsd0VBQXNEO0lBQXRDLGtHQUFBLFFBQVEsT0FBQTtJQU14QixTQUFnQixPQUFPLENBQUMsT0FBeUM7UUFDL0QsMkJBQWEsQ0FBQyxJQUFJLDhCQUFnQixFQUFFLENBQUMsQ0FBQztRQUN0QyxPQUFPLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBSEQsMEJBR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Tm9kZUpTRmlsZVN5c3RlbSwgc2V0RmlsZVN5c3RlbX0gZnJvbSAnLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHttYWluTmdjY30gZnJvbSAnLi9zcmMvbWFpbic7XG5pbXBvcnQge0FzeW5jTmdjY09wdGlvbnMsIFN5bmNOZ2NjT3B0aW9uc30gZnJvbSAnLi9zcmMvbmdjY19vcHRpb25zJztcblxuZXhwb3J0IHtDb25zb2xlTG9nZ2VyfSBmcm9tICcuL3NyYy9sb2dnaW5nL2NvbnNvbGVfbG9nZ2VyJztcbmV4cG9ydCB7TG9nZ2VyLCBMb2dMZXZlbH0gZnJvbSAnLi9zcmMvbG9nZ2luZy9sb2dnZXInO1xuZXhwb3J0IHtBc3luY05nY2NPcHRpb25zLCBOZ2NjT3B0aW9ucywgU3luY05nY2NPcHRpb25zfSBmcm9tICcuL3NyYy9uZ2NjX29wdGlvbnMnO1xuZXhwb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4vc3JjL3BhdGhfbWFwcGluZ3MnO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJvY2VzczxUIGV4dGVuZHMgQXN5bmNOZ2NjT3B0aW9uc3xTeW5jTmdjY09wdGlvbnM+KG9wdGlvbnM6IFQpOlxuICAgIFQgZXh0ZW5kcyBBc3luY05nY2NPcHRpb25zID8gUHJvbWlzZTx2b2lkPjogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBwcm9jZXNzKG9wdGlvbnM6IEFzeW5jTmdjY09wdGlvbnN8U3luY05nY2NPcHRpb25zKTogdm9pZHxQcm9taXNlPHZvaWQ+IHtcbiAgc2V0RmlsZVN5c3RlbShuZXcgTm9kZUpTRmlsZVN5c3RlbSgpKTtcbiAgcmV0dXJuIG1haW5OZ2NjKG9wdGlvbnMpO1xufVxuIl19