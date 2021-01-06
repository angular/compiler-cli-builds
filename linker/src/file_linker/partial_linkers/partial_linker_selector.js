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
    var partial_component_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1");
    var partial_directive_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1");
    exports.ɵɵngDeclareDirective = 'ɵɵngDeclareDirective';
    exports.ɵɵngDeclareComponent = 'ɵɵngDeclareComponent';
    exports.declarationFunctions = [exports.ɵɵngDeclareDirective, exports.ɵɵngDeclareComponent];
    var PartialLinkerSelector = /** @class */ (function () {
        function PartialLinkerSelector(options) {
            var _a;
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
             * Finally, note that we always start with the current version (i.e. `11.1.0-next.3+72.sha-c81d5bf`). This
             * allows the linker to work on local builds effectively.
             */
            this.linkers = (_a = {},
                _a[exports.ɵɵngDeclareDirective] = [
                    { range: '11.1.0-next.3+72.sha-c81d5bf', linker: new partial_directive_linker_1_1.PartialDirectiveLinkerVersion1() },
                    { range: '>=11.1.0-next.1', linker: new partial_directive_linker_1_1.PartialDirectiveLinkerVersion1() },
                ],
                _a[exports.ɵɵngDeclareComponent] = [
                    { range: '11.1.0-next.3+72.sha-c81d5bf', linker: new partial_component_linker_1_1.PartialComponentLinkerVersion1(this.options) },
                    { range: '>=11.1.0-next.1', linker: new partial_component_linker_1_1.PartialComponentLinkerVersion1(this.options) },
                ],
                _a);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9saW5rZXJfc2VsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9saW5rZXJfc2VsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlDQUFpQztJQUdqQyxzSUFBNEU7SUFDNUUsc0lBQTRFO0lBRy9ELFFBQUEsb0JBQW9CLEdBQUcsc0JBQXNCLENBQUM7SUFDOUMsUUFBQSxvQkFBb0IsR0FBRyxzQkFBc0IsQ0FBQztJQUM5QyxRQUFBLG9CQUFvQixHQUFHLENBQUMsNEJBQW9CLEVBQUUsNEJBQW9CLENBQUMsQ0FBQztJQUVqRjtRQTBCRSwrQkFBb0IsT0FBc0I7O1lBQXRCLFlBQU8sR0FBUCxPQUFPLENBQWU7WUF6QjFDOzs7Ozs7Ozs7Ozs7ZUFZRztZQUNLLFlBQU87Z0JBQ2IsR0FBQyw0QkFBb0IsSUFBRztvQkFDdEIsRUFBQyxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLElBQUksMkRBQThCLEVBQUUsRUFBQztvQkFDMUUsRUFBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLElBQUksMkRBQThCLEVBQUUsRUFBQztpQkFDekU7Z0JBQ0QsR0FBQyw0QkFBb0IsSUFDakI7b0JBQ0UsRUFBQyxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLElBQUksMkRBQThCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFDO29CQUN0RixFQUFDLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxNQUFNLEVBQUUsSUFBSSwyREFBOEIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUM7aUJBQ3JGO29CQUNMO1FBRTJDLENBQUM7UUFFOUM7O1dBRUc7UUFDSCxtREFBbUIsR0FBbkIsVUFBb0IsWUFBb0I7WUFDdEMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxLQUFLLFNBQVMsQ0FBQztRQUNsRCxDQUFDO1FBRUQ7OztXQUdHO1FBQ0gseUNBQVMsR0FBVCxVQUFVLFlBQW9CLEVBQUUsT0FBZTs7WUFDN0MsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM1QyxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUU7Z0JBQzFCLE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQXdDLFlBQVksTUFBRyxDQUFDLENBQUM7YUFDMUU7O2dCQUNELEtBQThCLElBQUEsYUFBQSxpQkFBQSxRQUFRLENBQUEsa0NBQUEsd0RBQUU7b0JBQTdCLElBQUEsdUJBQWUsRUFBZCxLQUFLLFdBQUEsRUFBRSxNQUFNLFlBQUE7b0JBQ3ZCLElBQUksa0JBQVMsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFDLENBQUMsRUFBRTt3QkFDeEQsT0FBTyxNQUFNLENBQUM7cUJBQ2Y7aUJBQ0Y7Ozs7Ozs7OztZQUNELE1BQU0sSUFBSSxLQUFLLENBQ1gsNkNBQTJDLE9BQU8sYUFBUSxZQUFZLFFBQUs7Z0JBQzNFLDZCQUE2QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxRQUFNLENBQUMsQ0FBQyxLQUFPLEVBQWYsQ0FBZSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckYsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQXJERCxJQXFEQztJQXJEWSxzREFBcUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7c2F0aXNmaWVzfSBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHtMaW5rZXJPcHRpb25zfSBmcm9tICcuLi9saW5rZXJfb3B0aW9ucyc7XG5cbmltcG9ydCB7UGFydGlhbENvbXBvbmVudExpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfY29tcG9uZW50X2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbERpcmVjdGl2ZUxpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfZGlyZWN0aXZlX2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbExpbmtlcn0gZnJvbSAnLi9wYXJ0aWFsX2xpbmtlcic7XG5cbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlRGlyZWN0aXZlID0gJ8m1ybVuZ0RlY2xhcmVEaXJlY3RpdmUnO1xuZXhwb3J0IGNvbnN0IMm1ybVuZ0RlY2xhcmVDb21wb25lbnQgPSAnybXJtW5nRGVjbGFyZUNvbXBvbmVudCc7XG5leHBvcnQgY29uc3QgZGVjbGFyYXRpb25GdW5jdGlvbnMgPSBbybXJtW5nRGVjbGFyZURpcmVjdGl2ZSwgybXJtW5nRGVjbGFyZUNvbXBvbmVudF07XG5cbmV4cG9ydCBjbGFzcyBQYXJ0aWFsTGlua2VyU2VsZWN0b3I8VEV4cHJlc3Npb24+IHtcbiAgLyoqXG4gICAqIEEgZGF0YWJhc2Ugb2YgbGlua2VyIGluc3RhbmNlcyB0aGF0IHNob3VsZCBiZSB1c2VkIGlmIHRoZWlyIGdpdmVuIHNlbXZlciByYW5nZSBzYXRpc2ZpZXMgdGhlXG4gICAqIHZlcnNpb24gZm91bmQgaW4gdGhlIGNvZGUgdG8gYmUgbGlua2VkLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhlIHJhbmdlcyBhcmUgY2hlY2tlZCBpbiBvcmRlciwgYW5kIHRoZSBmaXJzdCBtYXRjaGluZyByYW5nZSB3aWxsIGJlIHNlbGVjdGVkLCBzb1xuICAgKiByYW5nZXMgc2hvdWxkIGJlIG1vc3QgcmVzdHJpY3RpdmUgZmlyc3QuXG4gICAqXG4gICAqIEFsc28sIHJhbmdlcyBhcmUgbWF0Y2hlZCB0byBpbmNsdWRlIFwicHJlLXJlbGVhc2VzXCIsIHRoZXJlZm9yZSBpZiB0aGUgcmFuZ2UgaXMgYD49MTEuMS4wLW5leHQuMWBcbiAgICogdGhlbiB0aGlzIGluY2x1ZGVzIGAxMS4xLjAtbmV4dC4yYCBhbmQgYWxzbyBgMTIuMC4wLW5leHQuMWAuXG4gICAqXG4gICAqIEZpbmFsbHksIG5vdGUgdGhhdCB3ZSBhbHdheXMgc3RhcnQgd2l0aCB0aGUgY3VycmVudCB2ZXJzaW9uIChpLmUuIGAwLjAuMC1QTEFDRUhPTERFUmApLiBUaGlzXG4gICAqIGFsbG93cyB0aGUgbGlua2VyIHRvIHdvcmsgb24gbG9jYWwgYnVpbGRzIGVmZmVjdGl2ZWx5LlxuICAgKi9cbiAgcHJpdmF0ZSBsaW5rZXJzOiBSZWNvcmQ8c3RyaW5nLCB7cmFuZ2U6IHN0cmluZywgbGlua2VyOiBQYXJ0aWFsTGlua2VyPFRFeHByZXNzaW9uPn1bXT4gPSB7XG4gICAgW8m1ybVuZ0RlY2xhcmVEaXJlY3RpdmVdOiBbXG4gICAgICB7cmFuZ2U6ICcwLjAuMC1QTEFDRUhPTERFUicsIGxpbmtlcjogbmV3IFBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uMSgpfSxcbiAgICAgIHtyYW5nZTogJz49MTEuMS4wLW5leHQuMScsIGxpbmtlcjogbmV3IFBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uMSgpfSxcbiAgICBdLFxuICAgIFvJtcm1bmdEZWNsYXJlQ29tcG9uZW50XTpcbiAgICAgICAgW1xuICAgICAgICAgIHtyYW5nZTogJzAuMC4wLVBMQUNFSE9MREVSJywgbGlua2VyOiBuZXcgUGFydGlhbENvbXBvbmVudExpbmtlclZlcnNpb24xKHRoaXMub3B0aW9ucyl9LFxuICAgICAgICAgIHtyYW5nZTogJz49MTEuMS4wLW5leHQuMScsIGxpbmtlcjogbmV3IFBhcnRpYWxDb21wb25lbnRMaW5rZXJWZXJzaW9uMSh0aGlzLm9wdGlvbnMpfSxcbiAgICAgICAgXSxcbiAgfTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG9wdGlvbnM6IExpbmtlck9wdGlvbnMpIHt9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiB0aGVyZSBhcmUgYFBhcnRpYWxMaW5rZXJgIGNsYXNzZXMgdGhhdCBjYW4gaGFuZGxlIGZ1bmN0aW9ucyB3aXRoIHRoaXMgbmFtZS5cbiAgICovXG4gIHN1cHBvcnRzRGVjbGFyYXRpb24oZnVuY3Rpb25OYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5saW5rZXJzW2Z1bmN0aW9uTmFtZV0gIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBgUGFydGlhbExpbmtlcmAgdGhhdCBjYW4gaGFuZGxlIGZ1bmN0aW9ucyB3aXRoIHRoZSBnaXZlbiBuYW1lIGFuZCB2ZXJzaW9uLlxuICAgKiBUaHJvd3MgYW4gZXJyb3IgaWYgdGhlcmUgaXMgbm9uZS5cbiAgICovXG4gIGdldExpbmtlcihmdW5jdGlvbk5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nKTogUGFydGlhbExpbmtlcjxURXhwcmVzc2lvbj4ge1xuICAgIGNvbnN0IHZlcnNpb25zID0gdGhpcy5saW5rZXJzW2Z1bmN0aW9uTmFtZV07XG4gICAgaWYgKHZlcnNpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwYXJ0aWFsIGRlY2xhcmF0aW9uIGZ1bmN0aW9uICR7ZnVuY3Rpb25OYW1lfS5gKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCB7cmFuZ2UsIGxpbmtlcn0gb2YgdmVyc2lvbnMpIHtcbiAgICAgIGlmIChzYXRpc2ZpZXModmVyc2lvbiwgcmFuZ2UsIHtpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZX0pKSB7XG4gICAgICAgIHJldHVybiBsaW5rZXI7XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFVuc3VwcG9ydGVkIHBhcnRpYWwgZGVjbGFyYXRpb24gdmVyc2lvbiAke3ZlcnNpb259IGZvciAke2Z1bmN0aW9uTmFtZX0uXFxuYCArXG4gICAgICAgICdWYWxpZCB2ZXJzaW9uIHJhbmdlcyBhcmU6XFxuJyArIHZlcnNpb25zLm1hcCh2ID0+IGAgLSAke3YucmFuZ2V9YCkuam9pbignXFxuJykpO1xuICB9XG59XG4iXX0=