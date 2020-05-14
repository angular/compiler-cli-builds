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
     * Copyright Google Inc. All Rights Reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBeUU7SUFFekUsNERBQW9DO0lBR3BDLHdGQUEyRDtJQUFuRCwrR0FBQSxhQUFhLE9BQUE7SUFDckIsd0VBQXNEO0lBQXRDLGtHQUFBLFFBQVEsT0FBQTtJQU14QixTQUFnQixPQUFPLENBQUMsT0FBeUM7UUFDL0QsMkJBQWEsQ0FBQyxJQUFJLDhCQUFnQixFQUFFLENBQUMsQ0FBQztRQUN0QyxPQUFPLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBSEQsMEJBR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge05vZGVKU0ZpbGVTeXN0ZW0sIHNldEZpbGVTeXN0ZW19IGZyb20gJy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7bWFpbk5nY2N9IGZyb20gJy4vc3JjL21haW4nO1xuaW1wb3J0IHtBc3luY05nY2NPcHRpb25zLCBTeW5jTmdjY09wdGlvbnN9IGZyb20gJy4vc3JjL25nY2Nfb3B0aW9ucyc7XG5cbmV4cG9ydCB7Q29uc29sZUxvZ2dlcn0gZnJvbSAnLi9zcmMvbG9nZ2luZy9jb25zb2xlX2xvZ2dlcic7XG5leHBvcnQge0xvZ2dlciwgTG9nTGV2ZWx9IGZyb20gJy4vc3JjL2xvZ2dpbmcvbG9nZ2VyJztcbmV4cG9ydCB7QXN5bmNOZ2NjT3B0aW9ucywgTmdjY09wdGlvbnMsIFN5bmNOZ2NjT3B0aW9uc30gZnJvbSAnLi9zcmMvbmdjY19vcHRpb25zJztcbmV4cG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuL3NyYy9wYXRoX21hcHBpbmdzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3M8VCBleHRlbmRzIEFzeW5jTmdjY09wdGlvbnN8U3luY05nY2NPcHRpb25zPihvcHRpb25zOiBUKTpcbiAgICBUIGV4dGVuZHMgQXN5bmNOZ2NjT3B0aW9ucyA/IFByb21pc2U8dm9pZD46IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gcHJvY2VzcyhvcHRpb25zOiBBc3luY05nY2NPcHRpb25zfFN5bmNOZ2NjT3B0aW9ucyk6IHZvaWR8UHJvbWlzZTx2b2lkPiB7XG4gIHNldEZpbGVTeXN0ZW0obmV3IE5vZGVKU0ZpbGVTeXN0ZW0oKSk7XG4gIHJldHVybiBtYWluTmdjYyhvcHRpb25zKTtcbn1cbiJdfQ==