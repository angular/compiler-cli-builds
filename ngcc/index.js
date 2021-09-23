(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/main", "@angular/compiler-cli/src/ngtsc/logging", "@angular/compiler-cli/ngcc/src/ngcc_options"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.process = exports.clearTsConfigCache = exports.LogLevel = exports.ConsoleLogger = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var main_1 = require("@angular/compiler-cli/ngcc/src/main");
    var logging_1 = require("@angular/compiler-cli/src/ngtsc/logging");
    Object.defineProperty(exports, "ConsoleLogger", { enumerable: true, get: function () { return logging_1.ConsoleLogger; } });
    Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return logging_1.LogLevel; } });
    var ngcc_options_1 = require("@angular/compiler-cli/ngcc/src/ngcc_options");
    Object.defineProperty(exports, "clearTsConfigCache", { enumerable: true, get: function () { return ngcc_options_1.clearTsConfigCache; } });
    function process(options) {
        (0, file_system_1.setFileSystem)(new file_system_1.NodeJSFileSystem());
        return (0, main_1.mainNgcc)(options);
    }
    exports.process = process;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBeUU7SUFFekUsNERBQW9DO0lBR3BDLG1FQUFxRTtJQUE3RCx3R0FBQSxhQUFhLE9BQUE7SUFBVSxtR0FBQSxRQUFRLE9BQUE7SUFDdkMsNEVBQXNHO0lBQTVFLGtIQUFBLGtCQUFrQixPQUFBO0lBSzVDLFNBQWdCLE9BQU8sQ0FBQyxPQUF5QztRQUMvRCxJQUFBLDJCQUFhLEVBQUMsSUFBSSw4QkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFDdEMsT0FBTyxJQUFBLGVBQVEsRUFBQyxPQUFPLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBSEQsMEJBR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Tm9kZUpTRmlsZVN5c3RlbSwgc2V0RmlsZVN5c3RlbX0gZnJvbSAnLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHttYWluTmdjY30gZnJvbSAnLi9zcmMvbWFpbic7XG5pbXBvcnQge0FzeW5jTmdjY09wdGlvbnMsIFN5bmNOZ2NjT3B0aW9uc30gZnJvbSAnLi9zcmMvbmdjY19vcHRpb25zJztcblxuZXhwb3J0IHtDb25zb2xlTG9nZ2VyLCBMb2dnZXIsIExvZ0xldmVsfSBmcm9tICcuLi9zcmMvbmd0c2MvbG9nZ2luZyc7XG5leHBvcnQge0FzeW5jTmdjY09wdGlvbnMsIGNsZWFyVHNDb25maWdDYWNoZSwgTmdjY09wdGlvbnMsIFN5bmNOZ2NjT3B0aW9uc30gZnJvbSAnLi9zcmMvbmdjY19vcHRpb25zJztcbmV4cG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuL3NyYy9wYXRoX21hcHBpbmdzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3M8VCBleHRlbmRzIEFzeW5jTmdjY09wdGlvbnN8U3luY05nY2NPcHRpb25zPihvcHRpb25zOiBUKTpcbiAgICBUIGV4dGVuZHMgQXN5bmNOZ2NjT3B0aW9ucyA/IFByb21pc2U8dm9pZD46IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gcHJvY2VzcyhvcHRpb25zOiBBc3luY05nY2NPcHRpb25zfFN5bmNOZ2NjT3B0aW9ucyk6IHZvaWR8UHJvbWlzZTx2b2lkPiB7XG4gIHNldEZpbGVTeXN0ZW0obmV3IE5vZGVKU0ZpbGVTeXN0ZW0oKSk7XG4gIHJldHVybiBtYWluTmdjYyhvcHRpb25zKTtcbn1cbiJdfQ==