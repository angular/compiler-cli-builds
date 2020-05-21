#!/usr/bin/env node
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
        define("@angular/compiler-cli/src/extract_i18n", ["require", "exports", "tslib", "reflect-metadata", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/main", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.mainXi18n = void 0;
    var tslib_1 = require("tslib");
    /**
     * Extract i18n messages from source code
     */
    // Must be imported first, because Angular decorators throw on load.
    require("reflect-metadata");
    var api = require("@angular/compiler-cli/src/transformers/api");
    var main_1 = require("@angular/compiler-cli/src/main");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    function mainXi18n(args, consoleError) {
        if (consoleError === void 0) { consoleError = console.error; }
        var config = readXi18nCommandLineAndConfiguration(args);
        return main_1.main(args, consoleError, config, undefined, undefined, undefined);
    }
    exports.mainXi18n = mainXi18n;
    function readXi18nCommandLineAndConfiguration(args) {
        var options = {};
        var parsedArgs = require('minimist')(args);
        if (parsedArgs.outFile)
            options.i18nOutFile = parsedArgs.outFile;
        if (parsedArgs.i18nFormat)
            options.i18nOutFormat = parsedArgs.i18nFormat;
        if (parsedArgs.locale)
            options.i18nOutLocale = parsedArgs.locale;
        var config = main_1.readCommandLineAndConfiguration(args, options, [
            'outFile',
            'i18nFormat',
            'locale',
        ]);
        // only emit the i18nBundle but nothing else.
        return tslib_1.__assign(tslib_1.__assign({}, config), { emitFlags: api.EmitFlags.I18nBundle });
    }
    // Entry point
    if (require.main === module) {
        var args = process.argv.slice(2);
        // We are running the real compiler so run against the real file-system
        file_system_1.setFileSystem(new file_system_1.NodeJSFileSystem());
        process.exitCode = mainXi18n(args);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdF9pMThuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9leHRyYWN0X2kxOG4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSDs7T0FFRztJQUNILG9FQUFvRTtJQUNwRSw0QkFBMEI7SUFDMUIsZ0VBQTBDO0lBRTFDLHVEQUE2RDtJQUM3RCwyRUFBb0U7SUFFcEUsU0FBZ0IsU0FBUyxDQUNyQixJQUFjLEVBQUUsWUFBbUQ7UUFBbkQsNkJBQUEsRUFBQSxlQUFzQyxPQUFPLENBQUMsS0FBSztRQUNyRSxJQUFNLE1BQU0sR0FBRyxvQ0FBb0MsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxRCxPQUFPLFdBQUksQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFKRCw4QkFJQztJQUVELFNBQVMsb0NBQW9DLENBQUMsSUFBYztRQUMxRCxJQUFNLE9BQU8sR0FBd0IsRUFBRSxDQUFDO1FBQ3hDLElBQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLFVBQVUsQ0FBQyxPQUFPO1lBQUUsT0FBTyxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDO1FBQ2pFLElBQUksVUFBVSxDQUFDLFVBQVU7WUFBRSxPQUFPLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUM7UUFDekUsSUFBSSxVQUFVLENBQUMsTUFBTTtZQUFFLE9BQU8sQ0FBQyxhQUFhLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztRQUVqRSxJQUFNLE1BQU0sR0FBRyxzQ0FBK0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQzVELFNBQVM7WUFDVCxZQUFZO1lBQ1osUUFBUTtTQUNULENBQUMsQ0FBQztRQUNILDZDQUE2QztRQUM3Qyw2Q0FBVyxNQUFNLEtBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxJQUFFO0lBQzFELENBQUM7SUFFRCxjQUFjO0lBQ2QsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtRQUMzQixJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyx1RUFBdUU7UUFDdkUsMkJBQWEsQ0FBQyxJQUFJLDhCQUFnQixFQUFFLENBQUMsQ0FBQztRQUN0QyxPQUFPLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNwQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLyoqXG4gKiBFeHRyYWN0IGkxOG4gbWVzc2FnZXMgZnJvbSBzb3VyY2UgY29kZVxuICovXG4vLyBNdXN0IGJlIGltcG9ydGVkIGZpcnN0LCBiZWNhdXNlIEFuZ3VsYXIgZGVjb3JhdG9ycyB0aHJvdyBvbiBsb2FkLlxuaW1wb3J0ICdyZWZsZWN0LW1ldGFkYXRhJztcbmltcG9ydCAqIGFzIGFwaSBmcm9tICcuL3RyYW5zZm9ybWVycy9hcGknO1xuaW1wb3J0IHtQYXJzZWRDb25maWd1cmF0aW9ufSBmcm9tICcuL3BlcmZvcm1fY29tcGlsZSc7XG5pbXBvcnQge21haW4sIHJlYWRDb21tYW5kTGluZUFuZENvbmZpZ3VyYXRpb259IGZyb20gJy4vbWFpbic7XG5pbXBvcnQge3NldEZpbGVTeXN0ZW0sIE5vZGVKU0ZpbGVTeXN0ZW19IGZyb20gJy4vbmd0c2MvZmlsZV9zeXN0ZW0nO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFpblhpMThuKFxuICAgIGFyZ3M6IHN0cmluZ1tdLCBjb25zb2xlRXJyb3I6IChtc2c6IHN0cmluZykgPT4gdm9pZCA9IGNvbnNvbGUuZXJyb3IpOiBudW1iZXIge1xuICBjb25zdCBjb25maWcgPSByZWFkWGkxOG5Db21tYW5kTGluZUFuZENvbmZpZ3VyYXRpb24oYXJncyk7XG4gIHJldHVybiBtYWluKGFyZ3MsIGNvbnNvbGVFcnJvciwgY29uZmlnLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbn1cblxuZnVuY3Rpb24gcmVhZFhpMThuQ29tbWFuZExpbmVBbmRDb25maWd1cmF0aW9uKGFyZ3M6IHN0cmluZ1tdKTogUGFyc2VkQ29uZmlndXJhdGlvbiB7XG4gIGNvbnN0IG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMgPSB7fTtcbiAgY29uc3QgcGFyc2VkQXJncyA9IHJlcXVpcmUoJ21pbmltaXN0JykoYXJncyk7XG4gIGlmIChwYXJzZWRBcmdzLm91dEZpbGUpIG9wdGlvbnMuaTE4bk91dEZpbGUgPSBwYXJzZWRBcmdzLm91dEZpbGU7XG4gIGlmIChwYXJzZWRBcmdzLmkxOG5Gb3JtYXQpIG9wdGlvbnMuaTE4bk91dEZvcm1hdCA9IHBhcnNlZEFyZ3MuaTE4bkZvcm1hdDtcbiAgaWYgKHBhcnNlZEFyZ3MubG9jYWxlKSBvcHRpb25zLmkxOG5PdXRMb2NhbGUgPSBwYXJzZWRBcmdzLmxvY2FsZTtcblxuICBjb25zdCBjb25maWcgPSByZWFkQ29tbWFuZExpbmVBbmRDb25maWd1cmF0aW9uKGFyZ3MsIG9wdGlvbnMsIFtcbiAgICAnb3V0RmlsZScsXG4gICAgJ2kxOG5Gb3JtYXQnLFxuICAgICdsb2NhbGUnLFxuICBdKTtcbiAgLy8gb25seSBlbWl0IHRoZSBpMThuQnVuZGxlIGJ1dCBub3RoaW5nIGVsc2UuXG4gIHJldHVybiB7Li4uY29uZmlnLCBlbWl0RmxhZ3M6IGFwaS5FbWl0RmxhZ3MuSTE4bkJ1bmRsZX07XG59XG5cbi8vIEVudHJ5IHBvaW50XG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgY29uc3QgYXJncyA9IHByb2Nlc3MuYXJndi5zbGljZSgyKTtcbiAgLy8gV2UgYXJlIHJ1bm5pbmcgdGhlIHJlYWwgY29tcGlsZXIgc28gcnVuIGFnYWluc3QgdGhlIHJlYWwgZmlsZS1zeXN0ZW1cbiAgc2V0RmlsZVN5c3RlbShuZXcgTm9kZUpTRmlsZVN5c3RlbSgpKTtcbiAgcHJvY2Vzcy5leGl0Q29kZSA9IG1haW5YaTE4bihhcmdzKTtcbn1cbiJdfQ==