(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_linker_selector", ["require", "exports", "tslib", "semver", "@angular/compiler-cli/linker/src/file_linker/get_source_file", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PartialLinkerSelector = exports.declarationFunctions = exports.ɵɵngDeclareComponent = exports.ɵɵngDeclareDirective = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var semver_1 = require("semver");
    var get_source_file_1 = require("@angular/compiler-cli/linker/src/file_linker/get_source_file");
    var partial_component_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1");
    var partial_directive_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1");
    exports.ɵɵngDeclareDirective = 'ɵɵngDeclareDirective';
    exports.ɵɵngDeclareComponent = 'ɵɵngDeclareComponent';
    exports.declarationFunctions = [exports.ɵɵngDeclareDirective, exports.ɵɵngDeclareComponent];
    /**
     * A helper that selects the appropriate `PartialLinker` for a given declaration.
     *
     * The selection is made from a database of linker instances, chosen if their given semver range
     * satisfies the version found in the code to be linked.
     *
     * Note that the ranges are checked in order, and the first matching range will be selected, so
     * ranges should be most restrictive first.
     *
     * Also, ranges are matched to include "pre-releases", therefore if the range is `>=11.1.0-next.1`
     * then this includes `11.1.0-next.2` and also `12.0.0-next.1`.
     *
     * Finally, note that we always start with the current version (i.e. `11.1.0`). This
     * allows the linker to work on local builds effectively.
     */
    var PartialLinkerSelector = /** @class */ (function () {
        function PartialLinkerSelector(environment, sourceUrl, code) {
            this.linkers = this.createLinkerMap(environment, sourceUrl, code);
        }
        /**
         * Returns true if there are `PartialLinker` classes that can handle functions with this name.
         */
        PartialLinkerSelector.prototype.supportsDeclaration = function (functionName) {
            return this.linkers[functionName] !== undefined;
        };
        /**
         * Returns the `PartialLinker` that can handle functions with the given name and version.
         * Throws an error if there is none.
         */
        PartialLinkerSelector.prototype.getLinker = function (functionName, version) {
            var e_1, _a;
            var versions = this.linkers[functionName];
            if (versions === undefined) {
                throw new Error("Unknown partial declaration function " + functionName + ".");
            }
            try {
                for (var versions_1 = tslib_1.__values(versions), versions_1_1 = versions_1.next(); !versions_1_1.done; versions_1_1 = versions_1.next()) {
                    var _b = versions_1_1.value, range = _b.range, linker = _b.linker;
                    if (semver_1.satisfies(version, range, { includePrerelease: true })) {
                        return linker;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (versions_1_1 && !versions_1_1.done && (_a = versions_1.return)) _a.call(versions_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            throw new Error("Unsupported partial declaration version " + version + " for " + functionName + ".\n" +
                'Valid version ranges are:\n' + versions.map(function (v) { return " - " + v.range; }).join('\n'));
        };
        PartialLinkerSelector.prototype.createLinkerMap = function (environment, sourceUrl, code) {
            var _a;
            var partialDirectiveLinkerVersion1 = new partial_directive_linker_1_1.PartialDirectiveLinkerVersion1(sourceUrl, code);
            var partialComponentLinkerVersion1 = new partial_component_linker_1_1.PartialComponentLinkerVersion1(environment, get_source_file_1.createGetSourceFile(sourceUrl, code, environment.sourceFileLoader), sourceUrl, code);
            return _a = {},
                _a[exports.ɵɵngDeclareDirective] = [
                    { range: '11.1.0', linker: partialDirectiveLinkerVersion1 },
                    { range: '>=11.1.0-next.1', linker: partialDirectiveLinkerVersion1 },
                ],
                _a[exports.ɵɵngDeclareComponent] = [
                    { range: '11.1.0', linker: partialComponentLinkerVersion1 },
                    { range: '>=11.1.0-next.1', linker: partialComponentLinkerVersion1 },
                ],
                _a;
        };
        return PartialLinkerSelector;
    }());
    exports.PartialLinkerSelector = PartialLinkerSelector;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9saW5rZXJfc2VsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9saW5rZXJfc2VsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlDQUFpQztJQUdqQyxnR0FBdUQ7SUFHdkQsc0lBQTRFO0lBQzVFLHNJQUE0RTtJQUcvRCxRQUFBLG9CQUFvQixHQUFHLHNCQUFzQixDQUFDO0lBQzlDLFFBQUEsb0JBQW9CLEdBQUcsc0JBQXNCLENBQUM7SUFDOUMsUUFBQSxvQkFBb0IsR0FBRyxDQUFDLDRCQUFvQixFQUFFLDRCQUFvQixDQUFDLENBQUM7SUFFakY7Ozs7Ozs7Ozs7Ozs7O09BY0c7SUFDSDtRQUdFLCtCQUNJLFdBQXVELEVBQUUsU0FBeUIsRUFDbEYsSUFBWTtZQUNkLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFRDs7V0FFRztRQUNILG1EQUFtQixHQUFuQixVQUFvQixZQUFvQjtZQUN0QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssU0FBUyxDQUFDO1FBQ2xELENBQUM7UUFFRDs7O1dBR0c7UUFDSCx5Q0FBUyxHQUFULFVBQVUsWUFBb0IsRUFBRSxPQUFlOztZQUM3QyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzVDLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtnQkFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBd0MsWUFBWSxNQUFHLENBQUMsQ0FBQzthQUMxRTs7Z0JBQ0QsS0FBOEIsSUFBQSxhQUFBLGlCQUFBLFFBQVEsQ0FBQSxrQ0FBQSx3REFBRTtvQkFBN0IsSUFBQSx1QkFBZSxFQUFkLEtBQUssV0FBQSxFQUFFLE1BQU0sWUFBQTtvQkFDdkIsSUFBSSxrQkFBUyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUFFO3dCQUN4RCxPQUFPLE1BQU0sQ0FBQztxQkFDZjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FDWCw2Q0FBMkMsT0FBTyxhQUFRLFlBQVksUUFBSztnQkFDM0UsNkJBQTZCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLFFBQU0sQ0FBQyxDQUFDLEtBQU8sRUFBZixDQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyRixDQUFDO1FBRU8sK0NBQWUsR0FBdkIsVUFDSSxXQUF1RCxFQUFFLFNBQXlCLEVBQ2xGLElBQVk7O1lBQ2QsSUFBTSw4QkFBOEIsR0FBRyxJQUFJLDJEQUE4QixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMzRixJQUFNLDhCQUE4QixHQUFHLElBQUksMkRBQThCLENBQ3JFLFdBQVcsRUFBRSxxQ0FBbUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLFNBQVMsRUFDMUYsSUFBSSxDQUFDLENBQUM7WUFFVjtnQkFDRSxHQUFDLDRCQUFvQixJQUFHO29CQUN0QixFQUFDLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxNQUFNLEVBQUUsOEJBQThCLEVBQUM7b0JBQ3BFLEVBQUMsS0FBSyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sRUFBRSw4QkFBOEIsRUFBQztpQkFDbkU7Z0JBQ0QsR0FBQyw0QkFBb0IsSUFBRztvQkFDdEIsRUFBQyxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLDhCQUE4QixFQUFDO29CQUNwRSxFQUFDLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxNQUFNLEVBQUUsOEJBQThCLEVBQUM7aUJBQ25FO21CQUNEO1FBQ0osQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQXRERCxJQXNEQztJQXREWSxzREFBcUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7c2F0aXNmaWVzfSBmcm9tICdzZW12ZXInO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtjcmVhdGVHZXRTb3VyY2VGaWxlfSBmcm9tICcuLi9nZXRfc291cmNlX2ZpbGUnO1xuaW1wb3J0IHtMaW5rZXJFbnZpcm9ubWVudH0gZnJvbSAnLi4vbGlua2VyX2Vudmlyb25tZW50JztcblxuaW1wb3J0IHtQYXJ0aWFsQ29tcG9uZW50TGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9jb21wb25lbnRfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9kaXJlY3RpdmVfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsTGlua2VyfSBmcm9tICcuL3BhcnRpYWxfbGlua2VyJztcblxuZXhwb3J0IGNvbnN0IMm1ybVuZ0RlY2xhcmVEaXJlY3RpdmUgPSAnybXJtW5nRGVjbGFyZURpcmVjdGl2ZSc7XG5leHBvcnQgY29uc3QgybXJtW5nRGVjbGFyZUNvbXBvbmVudCA9ICfJtcm1bmdEZWNsYXJlQ29tcG9uZW50JztcbmV4cG9ydCBjb25zdCBkZWNsYXJhdGlvbkZ1bmN0aW9ucyA9IFvJtcm1bmdEZWNsYXJlRGlyZWN0aXZlLCDJtcm1bmdEZWNsYXJlQ29tcG9uZW50XTtcblxuLyoqXG4gKiBBIGhlbHBlciB0aGF0IHNlbGVjdHMgdGhlIGFwcHJvcHJpYXRlIGBQYXJ0aWFsTGlua2VyYCBmb3IgYSBnaXZlbiBkZWNsYXJhdGlvbi5cbiAqXG4gKiBUaGUgc2VsZWN0aW9uIGlzIG1hZGUgZnJvbSBhIGRhdGFiYXNlIG9mIGxpbmtlciBpbnN0YW5jZXMsIGNob3NlbiBpZiB0aGVpciBnaXZlbiBzZW12ZXIgcmFuZ2VcbiAqIHNhdGlzZmllcyB0aGUgdmVyc2lvbiBmb3VuZCBpbiB0aGUgY29kZSB0byBiZSBsaW5rZWQuXG4gKlxuICogTm90ZSB0aGF0IHRoZSByYW5nZXMgYXJlIGNoZWNrZWQgaW4gb3JkZXIsIGFuZCB0aGUgZmlyc3QgbWF0Y2hpbmcgcmFuZ2Ugd2lsbCBiZSBzZWxlY3RlZCwgc29cbiAqIHJhbmdlcyBzaG91bGQgYmUgbW9zdCByZXN0cmljdGl2ZSBmaXJzdC5cbiAqXG4gKiBBbHNvLCByYW5nZXMgYXJlIG1hdGNoZWQgdG8gaW5jbHVkZSBcInByZS1yZWxlYXNlc1wiLCB0aGVyZWZvcmUgaWYgdGhlIHJhbmdlIGlzIGA+PTExLjEuMC1uZXh0LjFgXG4gKiB0aGVuIHRoaXMgaW5jbHVkZXMgYDExLjEuMC1uZXh0LjJgIGFuZCBhbHNvIGAxMi4wLjAtbmV4dC4xYC5cbiAqXG4gKiBGaW5hbGx5LCBub3RlIHRoYXQgd2UgYWx3YXlzIHN0YXJ0IHdpdGggdGhlIGN1cnJlbnQgdmVyc2lvbiAoaS5lLiBgMC4wLjAtUExBQ0VIT0xERVJgKS4gVGhpc1xuICogYWxsb3dzIHRoZSBsaW5rZXIgdG8gd29yayBvbiBsb2NhbCBidWlsZHMgZWZmZWN0aXZlbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBQYXJ0aWFsTGlua2VyU2VsZWN0b3I8VFN0YXRlbWVudCwgVEV4cHJlc3Npb24+IHtcbiAgcHJpdmF0ZSByZWFkb25seSBsaW5rZXJzOiBSZWNvcmQ8c3RyaW5nLCB7cmFuZ2U6IHN0cmluZywgbGlua2VyOiBQYXJ0aWFsTGlua2VyPFRFeHByZXNzaW9uPn1bXT47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBlbnZpcm9ubWVudDogTGlua2VyRW52aXJvbm1lbnQ8VFN0YXRlbWVudCwgVEV4cHJlc3Npb24+LCBzb3VyY2VVcmw6IEFic29sdXRlRnNQYXRoLFxuICAgICAgY29kZTogc3RyaW5nKSB7XG4gICAgdGhpcy5saW5rZXJzID0gdGhpcy5jcmVhdGVMaW5rZXJNYXAoZW52aXJvbm1lbnQsIHNvdXJjZVVybCwgY29kZSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIHRoZXJlIGFyZSBgUGFydGlhbExpbmtlcmAgY2xhc3NlcyB0aGF0IGNhbiBoYW5kbGUgZnVuY3Rpb25zIHdpdGggdGhpcyBuYW1lLlxuICAgKi9cbiAgc3VwcG9ydHNEZWNsYXJhdGlvbihmdW5jdGlvbk5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmxpbmtlcnNbZnVuY3Rpb25OYW1lXSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGBQYXJ0aWFsTGlua2VyYCB0aGF0IGNhbiBoYW5kbGUgZnVuY3Rpb25zIHdpdGggdGhlIGdpdmVuIG5hbWUgYW5kIHZlcnNpb24uXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiB0aGVyZSBpcyBub25lLlxuICAgKi9cbiAgZ2V0TGlua2VyKGZ1bmN0aW9uTmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcpOiBQYXJ0aWFsTGlua2VyPFRFeHByZXNzaW9uPiB7XG4gICAgY29uc3QgdmVyc2lvbnMgPSB0aGlzLmxpbmtlcnNbZnVuY3Rpb25OYW1lXTtcbiAgICBpZiAodmVyc2lvbnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHBhcnRpYWwgZGVjbGFyYXRpb24gZnVuY3Rpb24gJHtmdW5jdGlvbk5hbWV9LmApO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHtyYW5nZSwgbGlua2VyfSBvZiB2ZXJzaW9ucykge1xuICAgICAgaWYgKHNhdGlzZmllcyh2ZXJzaW9uLCByYW5nZSwge2luY2x1ZGVQcmVyZWxlYXNlOiB0cnVlfSkpIHtcbiAgICAgICAgcmV0dXJuIGxpbmtlcjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVW5zdXBwb3J0ZWQgcGFydGlhbCBkZWNsYXJhdGlvbiB2ZXJzaW9uICR7dmVyc2lvbn0gZm9yICR7ZnVuY3Rpb25OYW1lfS5cXG5gICtcbiAgICAgICAgJ1ZhbGlkIHZlcnNpb24gcmFuZ2VzIGFyZTpcXG4nICsgdmVyc2lvbnMubWFwKHYgPT4gYCAtICR7di5yYW5nZX1gKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUxpbmtlck1hcChcbiAgICAgIGVudmlyb25tZW50OiBMaW5rZXJFbnZpcm9ubWVudDxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4sIHNvdXJjZVVybDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBjb2RlOiBzdHJpbmcpIHtcbiAgICBjb25zdCBwYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjEgPSBuZXcgUGFydGlhbERpcmVjdGl2ZUxpbmtlclZlcnNpb24xKHNvdXJjZVVybCwgY29kZSk7XG4gICAgY29uc3QgcGFydGlhbENvbXBvbmVudExpbmtlclZlcnNpb24xID0gbmV3IFBhcnRpYWxDb21wb25lbnRMaW5rZXJWZXJzaW9uMShcbiAgICAgICAgZW52aXJvbm1lbnQsIGNyZWF0ZUdldFNvdXJjZUZpbGUoc291cmNlVXJsLCBjb2RlLCBlbnZpcm9ubWVudC5zb3VyY2VGaWxlTG9hZGVyKSwgc291cmNlVXJsLFxuICAgICAgICBjb2RlKTtcblxuICAgIHJldHVybiB7XG4gICAgICBbybXJtW5nRGVjbGFyZURpcmVjdGl2ZV06IFtcbiAgICAgICAge3JhbmdlOiAnMC4wLjAtUExBQ0VIT0xERVInLCBsaW5rZXI6IHBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uMX0sXG4gICAgICAgIHtyYW5nZTogJz49MTEuMS4wLW5leHQuMScsIGxpbmtlcjogcGFydGlhbERpcmVjdGl2ZUxpbmtlclZlcnNpb24xfSxcbiAgICAgIF0sXG4gICAgICBbybXJtW5nRGVjbGFyZUNvbXBvbmVudF06IFtcbiAgICAgICAge3JhbmdlOiAnMC4wLjAtUExBQ0VIT0xERVInLCBsaW5rZXI6IHBhcnRpYWxDb21wb25lbnRMaW5rZXJWZXJzaW9uMX0sXG4gICAgICAgIHtyYW5nZTogJz49MTEuMS4wLW5leHQuMScsIGxpbmtlcjogcGFydGlhbENvbXBvbmVudExpbmtlclZlcnNpb24xfSxcbiAgICAgIF0sXG4gICAgfTtcbiAgfVxufVxuIl19