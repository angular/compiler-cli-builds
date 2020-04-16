#!/usr/bin/env node
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/main-ngcc", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/main", "@angular/compiler-cli/ngcc/src/command_line_options"], factory);
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
    var command_line_options_1 = require("@angular/compiler-cli/ngcc/src/command_line_options");
    // CLI entry point
    if (require.main === module) {
        process.title = 'ngcc';
        var startTime_1 = Date.now();
        file_system_1.setFileSystem(new file_system_1.CachedFileSystem(new file_system_1.NodeJSFileSystem()));
        var options_1 = command_line_options_1.parseCommandLineOptions(process.argv.slice(2));
        (function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var duration, e_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, main_1.mainNgcc(options_1)];
                    case 1:
                        _a.sent();
                        if (options_1.logger) {
                            duration = Math.round((Date.now() - startTime_1) / 1000);
                            options_1.logger.debug("Run ngcc in " + duration + "s.");
                        }
                        process.exitCode = 0;
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _a.sent();
                        console.error(e_1.stack || e_1.message);
                        process.exit(1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); })();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1uZ2NjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2MvbWFpbi1uZ2NjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFDQTs7Ozs7O09BTUc7SUFDSCwyRUFBMkY7SUFDM0YsNERBQW9DO0lBQ3BDLDRGQUFtRTtJQUVuRSxrQkFBa0I7SUFDbEIsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtRQUMzQixPQUFPLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztRQUN2QixJQUFNLFdBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDN0IsMkJBQWEsQ0FBQyxJQUFJLDhCQUFnQixDQUFDLElBQUksOEJBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUQsSUFBTSxTQUFPLEdBQUcsOENBQXVCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvRCxDQUFDOzs7Ozs7d0JBRUcscUJBQU0sZUFBUSxDQUFDLFNBQU8sQ0FBQyxFQUFBOzt3QkFBdkIsU0FBdUIsQ0FBQzt3QkFDeEIsSUFBSSxTQUFPLENBQUMsTUFBTSxFQUFFOzRCQUNaLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFdBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDOzRCQUM3RCxTQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxpQkFBZSxRQUFRLE9BQUksQ0FBQyxDQUFDO3lCQUNuRDt3QkFDRCxPQUFPLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQzs7Ozt3QkFFckIsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFDLENBQUMsS0FBSyxJQUFJLEdBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDcEMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzs7Ozs7YUFFbkIsQ0FBQyxFQUFFLENBQUM7S0FDTiIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7c2V0RmlsZVN5c3RlbSwgQ2FjaGVkRmlsZVN5c3RlbSwgTm9kZUpTRmlsZVN5c3RlbX0gZnJvbSAnLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7bWFpbk5nY2N9IGZyb20gJy4vc3JjL21haW4nO1xuaW1wb3J0IHtwYXJzZUNvbW1hbmRMaW5lT3B0aW9uc30gZnJvbSAnLi9zcmMvY29tbWFuZF9saW5lX29wdGlvbnMnO1xuXG4vLyBDTEkgZW50cnkgcG9pbnRcbmlmIChyZXF1aXJlLm1haW4gPT09IG1vZHVsZSkge1xuICBwcm9jZXNzLnRpdGxlID0gJ25nY2MnO1xuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICBzZXRGaWxlU3lzdGVtKG5ldyBDYWNoZWRGaWxlU3lzdGVtKG5ldyBOb2RlSlNGaWxlU3lzdGVtKCkpKTtcbiAgY29uc3Qgb3B0aW9ucyA9IHBhcnNlQ29tbWFuZExpbmVPcHRpb25zKHByb2Nlc3MuYXJndi5zbGljZSgyKSk7XG4gIChhc3luYyAoKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IG1haW5OZ2NjKG9wdGlvbnMpO1xuICAgICAgaWYgKG9wdGlvbnMubG9nZ2VyKSB7XG4gICAgICAgIGNvbnN0IGR1cmF0aW9uID0gTWF0aC5yb3VuZCgoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDAwKTtcbiAgICAgICAgb3B0aW9ucy5sb2dnZXIuZGVidWcoYFJ1biBuZ2NjIGluICR7ZHVyYXRpb259cy5gKTtcbiAgICAgIH1cbiAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSAwO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZS5zdGFjayB8fCBlLm1lc3NhZ2UpO1xuICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIH1cbiAgfSkoKTtcbn1cbiJdfQ==