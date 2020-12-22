(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_linker_selector", ["require", "exports", "tslib", "semver", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PartialLinkerSelector = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var semver_1 = require("semver");
    var partial_component_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1");
    var partial_directive_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1");
    var PartialLinkerSelector = /** @class */ (function () {
        function PartialLinkerSelector(options) {
            this.options = options;
            /**
             * A database of linker instances that should be used if their given semver range satisfies the
             * version found in the code to be linked.
             *
             * Note that the ranges are checked in order, and the first matching range will be selected, so
             * ranges should be most restrictive first.
             *
             * Also, ranges are matched to include "pre-releases", therefore if the range is `>=11.1.0-next.1`
             * then this includes `11.1.0-next.2` and also `12.0.0-next.1`.
             *
             * Finally, note that we always start with the current version (i.e. `11.1.0-next.3+25.sha-12cb39c`). This
             * allows the linker to work on local builds effectively.
             */
            this.linkers = {
                'ɵɵngDeclareDirective': [
                    { range: '11.1.0-next.3+25.sha-12cb39c', linker: new partial_directive_linker_1_1.PartialDirectiveLinkerVersion1() },
                    { range: '>=11.1.0-next.1', linker: new partial_directive_linker_1_1.PartialDirectiveLinkerVersion1() },
                ],
                'ɵɵngDeclareComponent': [
                    { range: '11.1.0-next.3+25.sha-12cb39c', linker: new partial_component_linker_1_1.PartialComponentLinkerVersion1(this.options) },
                    { range: '>=11.1.0-next.1', linker: new partial_component_linker_1_1.PartialComponentLinkerVersion1(this.options) },
                ],
            };
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
        return PartialLinkerSelector;
    }());
    exports.PartialLinkerSelector = PartialLinkerSelector;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9saW5rZXJfc2VsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9saW5rZXJfc2VsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlDQUFpQztJQUdqQyxzSUFBNEU7SUFDNUUsc0lBQTRFO0lBRzVFO1FBMEJFLCtCQUFvQixPQUFzQjtZQUF0QixZQUFPLEdBQVAsT0FBTyxDQUFlO1lBekIxQzs7Ozs7Ozs7Ozs7O2VBWUc7WUFDSyxZQUFPLEdBQTBFO2dCQUN2RixzQkFBc0IsRUFBRTtvQkFDdEIsRUFBQyxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLElBQUksMkRBQThCLEVBQUUsRUFBQztvQkFDMUUsRUFBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLElBQUksMkRBQThCLEVBQUUsRUFBQztpQkFDekU7Z0JBQ0Qsc0JBQXNCLEVBQ2xCO29CQUNFLEVBQUMsS0FBSyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxJQUFJLDJEQUE4QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBQztvQkFDdEYsRUFBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLElBQUksMkRBQThCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFDO2lCQUNyRjthQUNOLENBQUM7UUFFMkMsQ0FBQztRQUU5Qzs7V0FFRztRQUNILG1EQUFtQixHQUFuQixVQUFvQixZQUFvQjtZQUN0QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssU0FBUyxDQUFDO1FBQ2xELENBQUM7UUFFRDs7O1dBR0c7UUFDSCx5Q0FBUyxHQUFULFVBQVUsWUFBb0IsRUFBRSxPQUFlOztZQUM3QyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzVDLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtnQkFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBd0MsWUFBWSxNQUFHLENBQUMsQ0FBQzthQUMxRTs7Z0JBQ0QsS0FBOEIsSUFBQSxhQUFBLGlCQUFBLFFBQVEsQ0FBQSxrQ0FBQSx3REFBRTtvQkFBN0IsSUFBQSx1QkFBZSxFQUFkLEtBQUssV0FBQSxFQUFFLE1BQU0sWUFBQTtvQkFDdkIsSUFBSSxrQkFBUyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUFFO3dCQUN4RCxPQUFPLE1BQU0sQ0FBQztxQkFDZjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FDWCw2Q0FBMkMsT0FBTyxhQUFRLFlBQVksUUFBSztnQkFDM0UsNkJBQTZCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLFFBQU0sQ0FBQyxDQUFDLEtBQU8sRUFBZixDQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyRixDQUFDO1FBQ0gsNEJBQUM7SUFBRCxDQUFDLEFBckRELElBcURDO0lBckRZLHNEQUFxQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtzYXRpc2ZpZXN9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQge0xpbmtlck9wdGlvbnN9IGZyb20gJy4uL2xpbmtlcl9vcHRpb25zJztcblxuaW1wb3J0IHtQYXJ0aWFsQ29tcG9uZW50TGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9jb21wb25lbnRfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9kaXJlY3RpdmVfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsTGlua2VyfSBmcm9tICcuL3BhcnRpYWxfbGlua2VyJztcblxuZXhwb3J0IGNsYXNzIFBhcnRpYWxMaW5rZXJTZWxlY3RvcjxURXhwcmVzc2lvbj4ge1xuICAvKipcbiAgICogQSBkYXRhYmFzZSBvZiBsaW5rZXIgaW5zdGFuY2VzIHRoYXQgc2hvdWxkIGJlIHVzZWQgaWYgdGhlaXIgZ2l2ZW4gc2VtdmVyIHJhbmdlIHNhdGlzZmllcyB0aGVcbiAgICogdmVyc2lvbiBmb3VuZCBpbiB0aGUgY29kZSB0byBiZSBsaW5rZWQuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGUgcmFuZ2VzIGFyZSBjaGVja2VkIGluIG9yZGVyLCBhbmQgdGhlIGZpcnN0IG1hdGNoaW5nIHJhbmdlIHdpbGwgYmUgc2VsZWN0ZWQsIHNvXG4gICAqIHJhbmdlcyBzaG91bGQgYmUgbW9zdCByZXN0cmljdGl2ZSBmaXJzdC5cbiAgICpcbiAgICogQWxzbywgcmFuZ2VzIGFyZSBtYXRjaGVkIHRvIGluY2x1ZGUgXCJwcmUtcmVsZWFzZXNcIiwgdGhlcmVmb3JlIGlmIHRoZSByYW5nZSBpcyBgPj0xMS4xLjAtbmV4dC4xYFxuICAgKiB0aGVuIHRoaXMgaW5jbHVkZXMgYDExLjEuMC1uZXh0LjJgIGFuZCBhbHNvIGAxMi4wLjAtbmV4dC4xYC5cbiAgICpcbiAgICogRmluYWxseSwgbm90ZSB0aGF0IHdlIGFsd2F5cyBzdGFydCB3aXRoIHRoZSBjdXJyZW50IHZlcnNpb24gKGkuZS4gYDAuMC4wLVBMQUNFSE9MREVSYCkuIFRoaXNcbiAgICogYWxsb3dzIHRoZSBsaW5rZXIgdG8gd29yayBvbiBsb2NhbCBidWlsZHMgZWZmZWN0aXZlbHkuXG4gICAqL1xuICBwcml2YXRlIGxpbmtlcnM6IFJlY29yZDxzdHJpbmcsIHtyYW5nZTogc3RyaW5nLCBsaW5rZXI6IFBhcnRpYWxMaW5rZXI8VEV4cHJlc3Npb24+fVtdPiA9IHtcbiAgICAnybXJtW5nRGVjbGFyZURpcmVjdGl2ZSc6IFtcbiAgICAgIHtyYW5nZTogJzAuMC4wLVBMQUNFSE9MREVSJywgbGlua2VyOiBuZXcgUGFydGlhbERpcmVjdGl2ZUxpbmtlclZlcnNpb24xKCl9LFxuICAgICAge3JhbmdlOiAnPj0xMS4xLjAtbmV4dC4xJywgbGlua2VyOiBuZXcgUGFydGlhbERpcmVjdGl2ZUxpbmtlclZlcnNpb24xKCl9LFxuICAgIF0sXG4gICAgJ8m1ybVuZ0RlY2xhcmVDb21wb25lbnQnOlxuICAgICAgICBbXG4gICAgICAgICAge3JhbmdlOiAnMC4wLjAtUExBQ0VIT0xERVInLCBsaW5rZXI6IG5ldyBQYXJ0aWFsQ29tcG9uZW50TGlua2VyVmVyc2lvbjEodGhpcy5vcHRpb25zKX0sXG4gICAgICAgICAge3JhbmdlOiAnPj0xMS4xLjAtbmV4dC4xJywgbGlua2VyOiBuZXcgUGFydGlhbENvbXBvbmVudExpbmtlclZlcnNpb24xKHRoaXMub3B0aW9ucyl9LFxuICAgICAgICBdLFxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgb3B0aW9uczogTGlua2VyT3B0aW9ucykge31cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIHRoZXJlIGFyZSBgUGFydGlhbExpbmtlcmAgY2xhc3NlcyB0aGF0IGNhbiBoYW5kbGUgZnVuY3Rpb25zIHdpdGggdGhpcyBuYW1lLlxuICAgKi9cbiAgc3VwcG9ydHNEZWNsYXJhdGlvbihmdW5jdGlvbk5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmxpbmtlcnNbZnVuY3Rpb25OYW1lXSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGBQYXJ0aWFsTGlua2VyYCB0aGF0IGNhbiBoYW5kbGUgZnVuY3Rpb25zIHdpdGggdGhlIGdpdmVuIG5hbWUgYW5kIHZlcnNpb24uXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiB0aGVyZSBpcyBub25lLlxuICAgKi9cbiAgZ2V0TGlua2VyKGZ1bmN0aW9uTmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcpOiBQYXJ0aWFsTGlua2VyPFRFeHByZXNzaW9uPiB7XG4gICAgY29uc3QgdmVyc2lvbnMgPSB0aGlzLmxpbmtlcnNbZnVuY3Rpb25OYW1lXTtcbiAgICBpZiAodmVyc2lvbnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHBhcnRpYWwgZGVjbGFyYXRpb24gZnVuY3Rpb24gJHtmdW5jdGlvbk5hbWV9LmApO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHtyYW5nZSwgbGlua2VyfSBvZiB2ZXJzaW9ucykge1xuICAgICAgaWYgKHNhdGlzZmllcyh2ZXJzaW9uLCByYW5nZSwge2luY2x1ZGVQcmVyZWxlYXNlOiB0cnVlfSkpIHtcbiAgICAgICAgcmV0dXJuIGxpbmtlcjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVW5zdXBwb3J0ZWQgcGFydGlhbCBkZWNsYXJhdGlvbiB2ZXJzaW9uICR7dmVyc2lvbn0gZm9yICR7ZnVuY3Rpb25OYW1lfS5cXG5gICtcbiAgICAgICAgJ1ZhbGlkIHZlcnNpb24gcmFuZ2VzIGFyZTpcXG4nICsgdmVyc2lvbnMubWFwKHYgPT4gYCAtICR7di5yYW5nZX1gKS5qb2luKCdcXG4nKSk7XG4gIH1cbn1cbiJdfQ==