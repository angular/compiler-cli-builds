(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_linker_selector", ["require", "exports", "tslib", "semver", "@angular/compiler-cli/linker/src/file_linker/get_source_file", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_injector_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_ng_module_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_pipe_linker_1"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PartialLinkerSelector = exports.declarationFunctions = exports.ɵɵngDeclarePipe = exports.ɵɵngDeclareNgModule = exports.ɵɵngDeclareInjector = exports.ɵɵngDeclareComponent = exports.ɵɵngDeclareDirective = void 0;
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
    var partial_injector_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_injector_linker_1");
    var partial_ng_module_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_ng_module_linker_1");
    var partial_pipe_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_pipe_linker_1");
    exports.ɵɵngDeclareDirective = 'ɵɵngDeclareDirective';
    exports.ɵɵngDeclareComponent = 'ɵɵngDeclareComponent';
    exports.ɵɵngDeclareInjector = 'ɵɵngDeclareInjector';
    exports.ɵɵngDeclareNgModule = 'ɵɵngDeclareNgModule';
    exports.ɵɵngDeclarePipe = 'ɵɵngDeclarePipe';
    exports.declarationFunctions = [
        exports.ɵɵngDeclareDirective, exports.ɵɵngDeclareComponent, exports.ɵɵngDeclareInjector, exports.ɵɵngDeclareNgModule,
        exports.ɵɵngDeclarePipe
    ];
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
     * Finally, note that we always start with the current version (i.e. `12.0.0-next.4+38.sha-e88a9c6`). This
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
            return this.linkers.has(functionName);
        };
        /**
         * Returns the `PartialLinker` that can handle functions with the given name and version.
         * Throws an error if there is none.
         */
        PartialLinkerSelector.prototype.getLinker = function (functionName, version) {
            var e_1, _a;
            if (!this.linkers.has(functionName)) {
                throw new Error("Unknown partial declaration function " + functionName + ".");
            }
            var versions = this.linkers.get(functionName);
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
            var partialDirectiveLinkerVersion1 = new partial_directive_linker_1_1.PartialDirectiveLinkerVersion1(sourceUrl, code);
            var partialComponentLinkerVersion1 = new partial_component_linker_1_1.PartialComponentLinkerVersion1(environment, get_source_file_1.createGetSourceFile(sourceUrl, code, environment.sourceFileLoader), sourceUrl, code);
            var partialInjectorLinkerVersion1 = new partial_injector_linker_1_1.PartialInjectorLinkerVersion1();
            var partialNgModuleLinkerVersion1 = new partial_ng_module_linker_1_1.PartialNgModuleLinkerVersion1(environment.options.linkerJitMode);
            var partialPipeLinkerVersion1 = new partial_pipe_linker_1_1.PartialPipeLinkerVersion1();
            var linkers = new Map();
            linkers.set(exports.ɵɵngDeclareDirective, [
                { range: '12.0.0-next.4+38.sha-e88a9c6', linker: partialDirectiveLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialDirectiveLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclareComponent, [
                { range: '12.0.0-next.4+38.sha-e88a9c6', linker: partialComponentLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialComponentLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclareInjector, [
                { range: '12.0.0-next.4+38.sha-e88a9c6', linker: partialInjectorLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialInjectorLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclareNgModule, [
                { range: '12.0.0-next.4+38.sha-e88a9c6', linker: partialNgModuleLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialNgModuleLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclarePipe, [
                { range: '12.0.0-next.4+38.sha-e88a9c6', linker: partialPipeLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialPipeLinkerVersion1 },
            ]);
            return linkers;
        };
        return PartialLinkerSelector;
    }());
    exports.PartialLinkerSelector = PartialLinkerSelector;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9saW5rZXJfc2VsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9saW5rZXJfc2VsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlDQUFpQztJQUdqQyxnR0FBdUQ7SUFHdkQsc0lBQTRFO0lBQzVFLHNJQUE0RTtJQUM1RSxvSUFBMEU7SUFFMUUsc0lBQTJFO0lBQzNFLDRIQUFrRTtJQUVyRCxRQUFBLG9CQUFvQixHQUFHLHNCQUFzQixDQUFDO0lBQzlDLFFBQUEsb0JBQW9CLEdBQUcsc0JBQXNCLENBQUM7SUFDOUMsUUFBQSxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQztJQUM1QyxRQUFBLG1CQUFtQixHQUFHLHFCQUFxQixDQUFDO0lBQzVDLFFBQUEsZUFBZSxHQUFHLGlCQUFpQixDQUFDO0lBQ3BDLFFBQUEsb0JBQW9CLEdBQUc7UUFDbEMsNEJBQW9CLEVBQUUsNEJBQW9CLEVBQUUsMkJBQW1CLEVBQUUsMkJBQW1CO1FBQ3BGLHVCQUFlO0tBQ2hCLENBQUM7SUFPRjs7Ozs7Ozs7Ozs7Ozs7T0FjRztJQUNIO1FBR0UsK0JBQ0ksV0FBdUQsRUFBRSxTQUF5QixFQUNsRixJQUFZO1lBQ2QsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUVEOztXQUVHO1FBQ0gsbURBQW1CLEdBQW5CLFVBQW9CLFlBQW9CO1lBQ3RDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDeEMsQ0FBQztRQUVEOzs7V0FHRztRQUNILHlDQUFTLEdBQVQsVUFB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QixFQUFFLE1BQU0sRUFBRSx5QkFBeUIsRUFBQztnQkFDL0QsRUFBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLHlCQUF5QixFQUFDO2FBQzlELENBQUMsQ0FBQztZQUNILE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFDSCw0QkFBQztJQUFELENBQUMsQUF0RUQsSUFzRUM7SUF0RVksc0RBQXFCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge3NhdGlzZmllc30gZnJvbSAnc2VtdmVyJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Y3JlYXRlR2V0U291cmNlRmlsZX0gZnJvbSAnLi4vZ2V0X3NvdXJjZV9maWxlJztcbmltcG9ydCB7TGlua2VyRW52aXJvbm1lbnR9IGZyb20gJy4uL2xpbmtlcl9lbnZpcm9ubWVudCc7XG5cbmltcG9ydCB7UGFydGlhbENvbXBvbmVudExpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfY29tcG9uZW50X2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbERpcmVjdGl2ZUxpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfZGlyZWN0aXZlX2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbEluamVjdG9yTGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9pbmplY3Rvcl9saW5rZXJfMSc7XG5pbXBvcnQge1BhcnRpYWxMaW5rZXJ9IGZyb20gJy4vcGFydGlhbF9saW5rZXInO1xuaW1wb3J0IHtQYXJ0aWFsTmdNb2R1bGVMaW5rZXJWZXJzaW9uMX0gZnJvbSAnLi9wYXJ0aWFsX25nX21vZHVsZV9saW5rZXJfMSc7XG5pbXBvcnQge1BhcnRpYWxQaXBlTGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9waXBlX2xpbmtlcl8xJztcblxuZXhwb3J0IGNvbnN0IMm1ybVuZ0RlY2xhcmVEaXJlY3RpdmUgPSAnybXJtW5nRGVjbGFyZURpcmVjdGl2ZSc7XG5leHBvcnQgY29uc3QgybXJtW5nRGVjbGFyZUNvbXBvbmVudCA9ICfJtcm1bmdEZWNsYXJlQ29tcG9uZW50JztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlSW5qZWN0b3IgPSAnybXJtW5nRGVjbGFyZUluamVjdG9yJztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlTmdNb2R1bGUgPSAnybXJtW5nRGVjbGFyZU5nTW9kdWxlJztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlUGlwZSA9ICfJtcm1bmdEZWNsYXJlUGlwZSc7XG5leHBvcnQgY29uc3QgZGVjbGFyYXRpb25GdW5jdGlvbnMgPSBbXG4gIMm1ybVuZ0RlY2xhcmVEaXJlY3RpdmUsIMm1ybVuZ0RlY2xhcmVDb21wb25lbnQsIMm1ybVuZ0RlY2xhcmVJbmplY3RvciwgybXJtW5nRGVjbGFyZU5nTW9kdWxlLFxuICDJtcm1bmdEZWNsYXJlUGlwZVxuXTtcblxuaW50ZXJmYWNlIExpbmtlclJhbmdlPFRFeHByZXNzaW9uPiB7XG4gIHJhbmdlOiBzdHJpbmc7XG4gIGxpbmtlcjogUGFydGlhbExpbmtlcjxURXhwcmVzc2lvbj47XG59XG5cbi8qKlxuICogQSBoZWxwZXIgdGhhdCBzZWxlY3RzIHRoZSBhcHByb3ByaWF0ZSBgUGFydGlhbExpbmtlcmAgZm9yIGEgZ2l2ZW4gZGVjbGFyYXRpb24uXG4gKlxuICogVGhlIHNlbGVjdGlvbiBpcyBtYWRlIGZyb20gYSBkYXRhYmFzZSBvZiBsaW5rZXIgaW5zdGFuY2VzLCBjaG9zZW4gaWYgdGhlaXIgZ2l2ZW4gc2VtdmVyIHJhbmdlXG4gKiBzYXRpc2ZpZXMgdGhlIHZlcnNpb24gZm91bmQgaW4gdGhlIGNvZGUgdG8gYmUgbGlua2VkLlxuICpcbiAqIE5vdGUgdGhhdCB0aGUgcmFuZ2VzIGFyZSBjaGVja2VkIGluIG9yZGVyLCBhbmQgdGhlIGZpcnN0IG1hdGNoaW5nIHJhbmdlIHdpbGwgYmUgc2VsZWN0ZWQsIHNvXG4gKiByYW5nZXMgc2hvdWxkIGJlIG1vc3QgcmVzdHJpY3RpdmUgZmlyc3QuXG4gKlxuICogQWxzbywgcmFuZ2VzIGFyZSBtYXRjaGVkIHRvIGluY2x1ZGUgXCJwcmUtcmVsZWFzZXNcIiwgdGhlcmVmb3JlIGlmIHRoZSByYW5nZSBpcyBgPj0xMS4xLjAtbmV4dC4xYFxuICogdGhlbiB0aGlzIGluY2x1ZGVzIGAxMS4xLjAtbmV4dC4yYCBhbmQgYWxzbyBgMTIuMC4wLW5leHQuMWAuXG4gKlxuICogRmluYWxseSwgbm90ZSB0aGF0IHdlIGFsd2F5cyBzdGFydCB3aXRoIHRoZSBjdXJyZW50IHZlcnNpb24gKGkuZS4gYDAuMC4wLVBMQUNFSE9MREVSYCkuIFRoaXNcbiAqIGFsbG93cyB0aGUgbGlua2VyIHRvIHdvcmsgb24gbG9jYWwgYnVpbGRzIGVmZmVjdGl2ZWx5LlxuICovXG5leHBvcnQgY2xhc3MgUGFydGlhbExpbmtlclNlbGVjdG9yPFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPiB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbGlua2VyczogTWFwPHN0cmluZywgTGlua2VyUmFuZ2U8VEV4cHJlc3Npb24+W10+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgZW52aXJvbm1lbnQ6IExpbmtlckVudmlyb25tZW50PFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPiwgc291cmNlVXJsOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIGNvZGU6IHN0cmluZykge1xuICAgIHRoaXMubGlua2VycyA9IHRoaXMuY3JlYXRlTGlua2VyTWFwKGVudmlyb25tZW50LCBzb3VyY2VVcmwsIGNvZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiB0aGVyZSBhcmUgYFBhcnRpYWxMaW5rZXJgIGNsYXNzZXMgdGhhdCBjYW4gaGFuZGxlIGZ1bmN0aW9ucyB3aXRoIHRoaXMgbmFtZS5cbiAgICovXG4gIHN1cHBvcnRzRGVjbGFyYXRpb24oZnVuY3Rpb25OYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5saW5rZXJzLmhhcyhmdW5jdGlvbk5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGBQYXJ0aWFsTGlua2VyYCB0aGF0IGNhbiBoYW5kbGUgZnVuY3Rpb25zIHdpdGggdGhlIGdpdmVuIG5hbWUgYW5kIHZlcnNpb24uXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiB0aGVyZSBpcyBub25lLlxuICAgKi9cbiAgZ2V0TGlua2VyKGZ1bmN0aW9uTmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcpOiBQYXJ0aWFsTGlua2VyPFRFeHByZXNzaW9uPiB7XG4gICAgaWYgKCF0aGlzLmxpbmtlcnMuaGFzKGZ1bmN0aW9uTmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwYXJ0aWFsIGRlY2xhcmF0aW9uIGZ1bmN0aW9uICR7ZnVuY3Rpb25OYW1lfS5gKTtcbiAgICB9XG4gICAgY29uc3QgdmVyc2lvbnMgPSB0aGlzLmxpbmtlcnMuZ2V0KGZ1bmN0aW9uTmFtZSkhO1xuICAgIGZvciAoY29uc3Qge3JhbmdlLCBsaW5rZXJ9IG9mIHZlcnNpb25zKSB7XG4gICAgICBpZiAoc2F0aXNmaWVzKHZlcnNpb24sIHJhbmdlLCB7aW5jbHVkZVByZXJlbGVhc2U6IHRydWV9KSkge1xuICAgICAgICByZXR1cm4gbGlua2VyO1xuICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBVbnN1cHBvcnRlZCBwYXJ0aWFsIGRlY2xhcmF0aW9uIHZlcnNpb24gJHt2ZXJzaW9ufSBmb3IgJHtmdW5jdGlvbk5hbWV9LlxcbmAgK1xuICAgICAgICAnVmFsaWQgdmVyc2lvbiByYW5nZXMgYXJlOlxcbicgKyB2ZXJzaW9ucy5tYXAodiA9PiBgIC0gJHt2LnJhbmdlfWApLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlTGlua2VyTWFwKFxuICAgICAgZW52aXJvbm1lbnQ6IExpbmtlckVudmlyb25tZW50PFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPiwgc291cmNlVXJsOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIGNvZGU6IHN0cmluZyk6IE1hcDxzdHJpbmcsIExpbmtlclJhbmdlPFRFeHByZXNzaW9uPltdPiB7XG4gICAgY29uc3QgcGFydGlhbERpcmVjdGl2ZUxpbmtlclZlcnNpb24xID0gbmV3IFBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uMShzb3VyY2VVcmwsIGNvZGUpO1xuICAgIGNvbnN0IHBhcnRpYWxDb21wb25lbnRMaW5rZXJWZXJzaW9uMSA9IG5ldyBQYXJ0aWFsQ29tcG9uZW50TGlua2VyVmVyc2lvbjEoXG4gICAgICAgIGVudmlyb25tZW50LCBjcmVhdGVHZXRTb3VyY2VGaWxlKHNvdXJjZVVybCwgY29kZSwgZW52aXJvbm1lbnQuc291cmNlRmlsZUxvYWRlciksIHNvdXJjZVVybCxcbiAgICAgICAgY29kZSk7XG4gICAgY29uc3QgcGFydGlhbEluamVjdG9yTGlua2VyVmVyc2lvbjEgPSBuZXcgUGFydGlhbEluamVjdG9yTGlua2VyVmVyc2lvbjEoKTtcbiAgICBjb25zdCBwYXJ0aWFsTmdNb2R1bGVMaW5rZXJWZXJzaW9uMSA9XG4gICAgICAgIG5ldyBQYXJ0aWFsTmdNb2R1bGVMaW5rZXJWZXJzaW9uMShlbnZpcm9ubWVudC5vcHRpb25zLmxpbmtlckppdE1vZGUpO1xuICAgIGNvbnN0IHBhcnRpYWxQaXBlTGlua2VyVmVyc2lvbjEgPSBuZXcgUGFydGlhbFBpcGVMaW5rZXJWZXJzaW9uMSgpO1xuXG4gICAgY29uc3QgbGlua2VycyA9IG5ldyBNYXA8c3RyaW5nLCBMaW5rZXJSYW5nZTxURXhwcmVzc2lvbj5bXT4oKTtcbiAgICBsaW5rZXJzLnNldCjJtcm1bmdEZWNsYXJlRGlyZWN0aXZlLCBbXG4gICAgICB7cmFuZ2U6ICcwLjAuMC1QTEFDRUhPTERFUicsIGxpbmtlcjogcGFydGlhbERpcmVjdGl2ZUxpbmtlclZlcnNpb24xfSxcbiAgICAgIHtyYW5nZTogJz49MTEuMS4wLW5leHQuMScsIGxpbmtlcjogcGFydGlhbERpcmVjdGl2ZUxpbmtlclZlcnNpb24xfSxcbiAgICBdKTtcbiAgICBsaW5rZXJzLnNldCjJtcm1bmdEZWNsYXJlQ29tcG9uZW50LCBbXG4gICAgICB7cmFuZ2U6ICcwLjAuMC1QTEFDRUhPTERFUicsIGxpbmtlcjogcGFydGlhbENvbXBvbmVudExpbmtlclZlcnNpb24xfSxcbiAgICAgIHtyYW5nZTogJz49MTEuMS4wLW5leHQuMScsIGxpbmtlcjogcGFydGlhbENvbXBvbmVudExpbmtlclZlcnNpb24xfSxcbiAgICBdKTtcbiAgICBsaW5rZXJzLnNldCjJtcm1bmdEZWNsYXJlSW5qZWN0b3IsIFtcbiAgICAgIHtyYW5nZTogJzAuMC4wLVBMQUNFSE9MREVSJywgbGlua2VyOiBwYXJ0aWFsSW5qZWN0b3JMaW5rZXJWZXJzaW9uMX0sXG4gICAgICB7cmFuZ2U6ICc+PTExLjEuMC1uZXh0LjEnLCBsaW5rZXI6IHBhcnRpYWxJbmplY3RvckxpbmtlclZlcnNpb24xfSxcbiAgICBdKTtcbiAgICBsaW5rZXJzLnNldCjJtcm1bmdEZWNsYXJlTmdNb2R1bGUsIFtcbiAgICAgIHtyYW5nZTogJzAuMC4wLVBMQUNFSE9MREVSJywgbGlua2VyOiBwYXJ0aWFsTmdNb2R1bGVMaW5rZXJWZXJzaW9uMX0sXG4gICAgICB7cmFuZ2U6ICc+PTExLjEuMC1uZXh0LjEnLCBsaW5rZXI6IHBhcnRpYWxOZ01vZHVsZUxpbmtlclZlcnNpb24xfSxcbiAgICBdKTtcbiAgICBsaW5rZXJzLnNldCjJtcm1bmdEZWNsYXJlUGlwZSwgW1xuICAgICAge3JhbmdlOiAnMC4wLjAtUExBQ0VIT0xERVInLCBsaW5rZXI6IHBhcnRpYWxQaXBlTGlua2VyVmVyc2lvbjF9LFxuICAgICAge3JhbmdlOiAnPj0xMS4xLjAtbmV4dC4xJywgbGlua2VyOiBwYXJ0aWFsUGlwZUxpbmtlclZlcnNpb24xfSxcbiAgICBdKTtcbiAgICByZXR1cm4gbGlua2VycztcbiAgfVxufVxuIl19