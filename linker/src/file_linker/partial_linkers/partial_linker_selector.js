(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_linker_selector", ["require", "exports", "tslib", "semver", "@angular/compiler-cli/linker/src/file_linker/get_source_file", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_factory_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_injector_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_ng_module_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_pipe_linker_1"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PartialLinkerSelector = exports.declarationFunctions = exports.ɵɵngDeclarePipe = exports.ɵɵngDeclareNgModule = exports.ɵɵngDeclareInjector = exports.ɵɵngDeclareFactory = exports.ɵɵngDeclareComponent = exports.ɵɵngDeclareDirective = void 0;
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
    var partial_factory_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_factory_linker_1");
    var partial_injector_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_injector_linker_1");
    var partial_ng_module_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_ng_module_linker_1");
    var partial_pipe_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_pipe_linker_1");
    exports.ɵɵngDeclareDirective = 'ɵɵngDeclareDirective';
    exports.ɵɵngDeclareComponent = 'ɵɵngDeclareComponent';
    exports.ɵɵngDeclareFactory = 'ɵɵngDeclareFactory';
    exports.ɵɵngDeclareInjector = 'ɵɵngDeclareInjector';
    exports.ɵɵngDeclareNgModule = 'ɵɵngDeclareNgModule';
    exports.ɵɵngDeclarePipe = 'ɵɵngDeclarePipe';
    exports.declarationFunctions = [
        exports.ɵɵngDeclareDirective, exports.ɵɵngDeclareComponent, exports.ɵɵngDeclareFactory, exports.ɵɵngDeclareInjector,
        exports.ɵɵngDeclareNgModule, exports.ɵɵngDeclarePipe
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
     * Finally, note that we always start with the current version (i.e. `12.0.0-next.6+24.sha-5167030`). This
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
            var partialFactoryLinkerVersion1 = new partial_factory_linker_1_1.PartialFactoryLinkerVersion1();
            var partialInjectorLinkerVersion1 = new partial_injector_linker_1_1.PartialInjectorLinkerVersion1();
            var partialNgModuleLinkerVersion1 = new partial_ng_module_linker_1_1.PartialNgModuleLinkerVersion1(environment.options.linkerJitMode);
            var partialPipeLinkerVersion1 = new partial_pipe_linker_1_1.PartialPipeLinkerVersion1();
            var linkers = new Map();
            linkers.set(exports.ɵɵngDeclareDirective, [
                { range: '12.0.0-next.6+24.sha-5167030', linker: partialDirectiveLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialDirectiveLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclareComponent, [
                { range: '12.0.0-next.6+24.sha-5167030', linker: partialComponentLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialComponentLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclareFactory, [
                { range: '12.0.0-next.6+24.sha-5167030', linker: partialFactoryLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialFactoryLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclareInjector, [
                { range: '12.0.0-next.6+24.sha-5167030', linker: partialInjectorLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialInjectorLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclareNgModule, [
                { range: '12.0.0-next.6+24.sha-5167030', linker: partialNgModuleLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialNgModuleLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclarePipe, [
                { range: '12.0.0-next.6+24.sha-5167030', linker: partialPipeLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialPipeLinkerVersion1 },
            ]);
            return linkers;
        };
        return PartialLinkerSelector;
    }());
    exports.PartialLinkerSelector = PartialLinkerSelector;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9saW5rZXJfc2VsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9saW5rZXJfc2VsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlDQUFpQztJQUdqQyxnR0FBdUQ7SUFHdkQsc0lBQTRFO0lBQzVFLHNJQUE0RTtJQUM1RSxrSUFBd0U7SUFDeEUsb0lBQTBFO0lBRTFFLHNJQUEyRTtJQUMzRSw0SEFBa0U7SUFFckQsUUFBQSxvQkFBb0IsR0FBRyxzQkFBc0IsQ0FBQztJQUM5QyxRQUFBLG9CQUFvQixHQUFHLHNCQUFzQixDQUFDO0lBQzlDLFFBQUEsa0JBQWtCLEdBQUcsb0JBQW9CLENBQUM7SUFDMUMsUUFBQSxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQztJQUM1QyxRQUFBLG1CQUFtQixHQUFHLHFCQUFxQixDQUFDO0lBQzVDLFFBQUEsZUFBZSxHQUFHLGlCQUFpQixDQUFDO0lBQ3BDLFFBQUEsb0JBQW9CLEdBQUc7UUFDbEMsNEJBQW9CLEVBQUUsNEJBQW9CLEVBQUUsMEJBQWtCLEVBQUUsMkJBQW1CO1FBQ25GLDJCQUFtQixFQUFFLHVCQUFlO0tBQ3JDLENBQUM7SUFPRjs7Ozs7Ozs7Ozs7Ozs7T0FjRztJQUNIO1FBR0UsK0JBQ0ksV0FBdUQsRUFBRSxTQUF5QixFQUNsRixJQUFZO1lBQ2QsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUVEOztXQUVHO1FBQ0gsbURBQW1CLEdBQW5CLFVBQW9CLFlBQW9CO1lBQ3RDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENB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QUFFLE1BQU0sRUFBRSw2QkFBNkIsRUFBQzthQUNsRSxDQUFDLENBQUM7WUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUFtQixFQUFFO2dCQUMvQixFQUFDLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxNQUFNLEVBQUUsNkJBQTZCLEVBQUM7Z0JBQ25FLEVBQUMsS0FBSyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sRUFBRSw2QkFBNkIsRUFBQzthQUNsRSxDQUFDLENBQUM7WUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUFlLEVBQUU7Z0JBQzNCLEVBQUMsS0FBSyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sRUFBRSx5QkFBeUIsRUFBQztnQkFDL0QsRUFBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLHlCQUF5QixFQUFDO2FBQzlELENBQUMsQ0FBQztZQUNILE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFDSCw0QkFBQztJQUFELENBQUMsQUEzRUQsSUEyRUM7SUEzRVksc0RBQXFCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge3NhdGlzZmllc30gZnJvbSAnc2VtdmVyJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Y3JlYXRlR2V0U291cmNlRmlsZX0gZnJvbSAnLi4vZ2V0X3NvdXJjZV9maWxlJztcbmltcG9ydCB7TGlua2VyRW52aXJvbm1lbnR9IGZyb20gJy4uL2xpbmtlcl9lbnZpcm9ubWVudCc7XG5cbmltcG9ydCB7UGFydGlhbENvbXBvbmVudExpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfY29tcG9uZW50X2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbERpcmVjdGl2ZUxpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfZGlyZWN0aXZlX2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbEZhY3RvcnlMaW5rZXJWZXJzaW9uMX0gZnJvbSAnLi9wYXJ0aWFsX2ZhY3RvcnlfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsSW5qZWN0b3JMaW5rZXJWZXJzaW9uMX0gZnJvbSAnLi9wYXJ0aWFsX2luamVjdG9yX2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbExpbmtlcn0gZnJvbSAnLi9wYXJ0aWFsX2xpbmtlcic7XG5pbXBvcnQge1BhcnRpYWxOZ01vZHVsZUxpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfbmdfbW9kdWxlX2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbFBpcGVMaW5rZXJWZXJzaW9uMX0gZnJvbSAnLi9wYXJ0aWFsX3BpcGVfbGlua2VyXzEnO1xuXG5leHBvcnQgY29uc3QgybXJtW5nRGVjbGFyZURpcmVjdGl2ZSA9ICfJtcm1bmdEZWNsYXJlRGlyZWN0aXZlJztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlQ29tcG9uZW50ID0gJ8m1ybVuZ0RlY2xhcmVDb21wb25lbnQnO1xuZXhwb3J0IGNvbnN0IMm1ybVuZ0RlY2xhcmVGYWN0b3J5ID0gJ8m1ybVuZ0RlY2xhcmVGYWN0b3J5JztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlSW5qZWN0b3IgPSAnybXJtW5nRGVjbGFyZUluamVjdG9yJztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlTmdNb2R1bGUgPSAnybXJtW5nRGVjbGFyZU5nTW9kdWxlJztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlUGlwZSA9ICfJtcm1bmdEZWNsYXJlUGlwZSc7XG5leHBvcnQgY29uc3QgZGVjbGFyYXRpb25GdW5jdGlvbnMgPSBbXG4gIMm1ybVuZ0RlY2xhcmVEaXJlY3RpdmUsIMm1ybVuZ0RlY2xhcmVDb21wb25lbnQsIMm1ybVuZ0RlY2xhcmVGYWN0b3J5LCDJtcm1bmdEZWNsYXJlSW5qZWN0b3IsXG4gIMm1ybVuZ0RlY2xhcmVOZ01vZHVsZSwgybXJtW5nRGVjbGFyZVBpcGVcbl07XG5cbmludGVyZmFjZSBMaW5rZXJSYW5nZTxURXhwcmVzc2lvbj4ge1xuICByYW5nZTogc3RyaW5nO1xuICBsaW5rZXI6IFBhcnRpYWxMaW5rZXI8VEV4cHJlc3Npb24+O1xufVxuXG4vKipcbiAqIEEgaGVscGVyIHRoYXQgc2VsZWN0cyB0aGUgYXBwcm9wcmlhdGUgYFBhcnRpYWxMaW5rZXJgIGZvciBhIGdpdmVuIGRlY2xhcmF0aW9uLlxuICpcbiAqIFRoZSBzZWxlY3Rpb24gaXMgbWFkZSBmcm9tIGEgZGF0YWJhc2Ugb2YgbGlua2VyIGluc3RhbmNlcywgY2hvc2VuIGlmIHRoZWlyIGdpdmVuIHNlbXZlciByYW5nZVxuICogc2F0aXNmaWVzIHRoZSB2ZXJzaW9uIGZvdW5kIGluIHRoZSBjb2RlIHRvIGJlIGxpbmtlZC5cbiAqXG4gKiBOb3RlIHRoYXQgdGhlIHJhbmdlcyBhcmUgY2hlY2tlZCBpbiBvcmRlciwgYW5kIHRoZSBmaXJzdCBtYXRjaGluZyByYW5nZSB3aWxsIGJlIHNlbGVjdGVkLCBzb1xuICogcmFuZ2VzIHNob3VsZCBiZSBtb3N0IHJlc3RyaWN0aXZlIGZpcnN0LlxuICpcbiAqIEFsc28sIHJhbmdlcyBhcmUgbWF0Y2hlZCB0byBpbmNsdWRlIFwicHJlLXJlbGVhc2VzXCIsIHRoZXJlZm9yZSBpZiB0aGUgcmFuZ2UgaXMgYD49MTEuMS4wLW5leHQuMWBcbiAqIHRoZW4gdGhpcyBpbmNsdWRlcyBgMTEuMS4wLW5leHQuMmAgYW5kIGFsc28gYDEyLjAuMC1uZXh0LjFgLlxuICpcbiAqIEZpbmFsbHksIG5vdGUgdGhhdCB3ZSBhbHdheXMgc3RhcnQgd2l0aCB0aGUgY3VycmVudCB2ZXJzaW9uIChpLmUuIGAwLjAuMC1QTEFDRUhPTERFUmApLiBUaGlzXG4gKiBhbGxvd3MgdGhlIGxpbmtlciB0byB3b3JrIG9uIGxvY2FsIGJ1aWxkcyBlZmZlY3RpdmVseS5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhcnRpYWxMaW5rZXJTZWxlY3RvcjxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4ge1xuICBwcml2YXRlIHJlYWRvbmx5IGxpbmtlcnM6IE1hcDxzdHJpbmcsIExpbmtlclJhbmdlPFRFeHByZXNzaW9uPltdPjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIGVudmlyb25tZW50OiBMaW5rZXJFbnZpcm9ubWVudDxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4sIHNvdXJjZVVybDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBjb2RlOiBzdHJpbmcpIHtcbiAgICB0aGlzLmxpbmtlcnMgPSB0aGlzLmNyZWF0ZUxpbmtlck1hcChlbnZpcm9ubWVudCwgc291cmNlVXJsLCBjb2RlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlcmUgYXJlIGBQYXJ0aWFsTGlua2VyYCBjbGFzc2VzIHRoYXQgY2FuIGhhbmRsZSBmdW5jdGlvbnMgd2l0aCB0aGlzIG5hbWUuXG4gICAqL1xuICBzdXBwb3J0c0RlY2xhcmF0aW9uKGZ1bmN0aW9uTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubGlua2Vycy5oYXMoZnVuY3Rpb25OYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBgUGFydGlhbExpbmtlcmAgdGhhdCBjYW4gaGFuZGxlIGZ1bmN0aW9ucyB3aXRoIHRoZSBnaXZlbiBuYW1lIGFuZCB2ZXJzaW9uLlxuICAgKiBUaHJvd3MgYW4gZXJyb3IgaWYgdGhlcmUgaXMgbm9uZS5cbiAgICovXG4gIGdldExpbmtlcihmdW5jdGlvbk5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nKTogUGFydGlhbExpbmtlcjxURXhwcmVzc2lvbj4ge1xuICAgIGlmICghdGhpcy5saW5rZXJzLmhhcyhmdW5jdGlvbk5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcGFydGlhbCBkZWNsYXJhdGlvbiBmdW5jdGlvbiAke2Z1bmN0aW9uTmFtZX0uYCk7XG4gICAgfVxuICAgIGNvbnN0IHZlcnNpb25zID0gdGhpcy5saW5rZXJzLmdldChmdW5jdGlvbk5hbWUpITtcbiAgICBmb3IgKGNvbnN0IHtyYW5nZSwgbGlua2VyfSBvZiB2ZXJzaW9ucykge1xuICAgICAgaWYgKHNhdGlzZmllcyh2ZXJzaW9uLCByYW5nZSwge2luY2x1ZGVQcmVyZWxlYXNlOiB0cnVlfSkpIHtcbiAgICAgICAgcmV0dXJuIGxpbmtlcjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVW5zdXBwb3J0ZWQgcGFydGlhbCBkZWNsYXJhdGlvbiB2ZXJzaW9uICR7dmVyc2lvbn0gZm9yICR7ZnVuY3Rpb25OYW1lfS5cXG5gICtcbiAgICAgICAgJ1ZhbGlkIHZlcnNpb24gcmFuZ2VzIGFyZTpcXG4nICsgdmVyc2lvbnMubWFwKHYgPT4gYCAtICR7di5yYW5nZX1gKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUxpbmtlck1hcChcbiAgICAgIGVudmlyb25tZW50OiBMaW5rZXJFbnZpcm9ubWVudDxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4sIHNvdXJjZVVybDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBjb2RlOiBzdHJpbmcpOiBNYXA8c3RyaW5nLCBMaW5rZXJSYW5nZTxURXhwcmVzc2lvbj5bXT4ge1xuICAgIGNvbnN0IHBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uMSA9IG5ldyBQYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjEoc291cmNlVXJsLCBjb2RlKTtcbiAgICBjb25zdCBwYXJ0aWFsQ29tcG9uZW50TGlua2VyVmVyc2lvbjEgPSBuZXcgUGFydGlhbENvbXBvbmVudExpbmtlclZlcnNpb24xKFxuICAgICAgICBlbnZpcm9ubWVudCwgY3JlYXRlR2V0U291cmNlRmlsZShzb3VyY2VVcmwsIGNvZGUsIGVudmlyb25tZW50LnNvdXJjZUZpbGVMb2FkZXIpLCBzb3VyY2VVcmwsXG4gICAgICAgIGNvZGUpO1xuICAgIGNvbnN0IHBhcnRpYWxGYWN0b3J5TGlua2VyVmVyc2lvbjEgPSBuZXcgUGFydGlhbEZhY3RvcnlMaW5rZXJWZXJzaW9uMSgpO1xuICAgIGNvbnN0IHBhcnRpYWxJbmplY3RvckxpbmtlclZlcnNpb24xID0gbmV3IFBhcnRpYWxJbmplY3RvckxpbmtlclZlcnNpb24xKCk7XG4gICAgY29uc3QgcGFydGlhbE5nTW9kdWxlTGlua2VyVmVyc2lvbjEgPVxuICAgICAgICBuZXcgUGFydGlhbE5nTW9kdWxlTGlua2VyVmVyc2lvbjEoZW52aXJvbm1lbnQub3B0aW9ucy5saW5rZXJKaXRNb2RlKTtcbiAgICBjb25zdCBwYXJ0aWFsUGlwZUxpbmtlclZlcnNpb24xID0gbmV3IFBhcnRpYWxQaXBlTGlua2VyVmVyc2lvbjEoKTtcblxuICAgIGNvbnN0IGxpbmtlcnMgPSBuZXcgTWFwPHN0cmluZywgTGlua2VyUmFuZ2U8VEV4cHJlc3Npb24+W10+KCk7XG4gICAgbGlua2Vycy5zZXQoybXJtW5nRGVjbGFyZURpcmVjdGl2ZSwgW1xuICAgICAge3JhbmdlOiAnMC4wLjAtUExBQ0VIT0xERVInLCBsaW5rZXI6IHBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uMX0sXG4gICAgICB7cmFuZ2U6ICc+PTExLjEuMC1uZXh0LjEnLCBsaW5rZXI6IHBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uMX0sXG4gICAgXSk7XG4gICAgbGlua2Vycy5zZXQoybXJtW5nRGVjbGFyZUNvbXBvbmVudCwgW1xuICAgICAge3JhbmdlOiAnMC4wLjAtUExBQ0VIT0xERVInLCBsaW5rZXI6IHBhcnRpYWxDb21wb25lbnRMaW5rZXJWZXJzaW9uMX0sXG4gICAgICB7cmFuZ2U6ICc+PTExLjEuMC1uZXh0LjEnLCBsaW5rZXI6IHBhcnRpYWxDb21wb25lbnRMaW5rZXJWZXJzaW9uMX0sXG4gICAgXSk7XG4gICAgbGlua2Vycy5zZXQoybXJtW5nRGVjbGFyZUZhY3RvcnksIFtcbiAgICAgIHtyYW5nZTogJzAuMC4wLVBMQUNFSE9MREVSJywgbGlua2VyOiBwYXJ0aWFsRmFjdG9yeUxpbmtlclZlcnNpb24xfSxcbiAgICAgIHtyYW5nZTogJz49MTEuMS4wLW5leHQuMScsIGxpbmtlcjogcGFydGlhbEZhY3RvcnlMaW5rZXJWZXJzaW9uMX0sXG4gICAgXSk7XG4gICAgbGlua2Vycy5zZXQoybXJtW5nRGVjbGFyZUluamVjdG9yLCBbXG4gICAgICB7cmFuZ2U6ICcwLjAuMC1QTEFDRUhPTERFUicsIGxpbmtlcjogcGFydGlhbEluamVjdG9yTGlua2VyVmVyc2lvbjF9LFxuICAgICAge3JhbmdlOiAnPj0xMS4xLjAtbmV4dC4xJywgbGlua2VyOiBwYXJ0aWFsSW5qZWN0b3JMaW5rZXJWZXJzaW9uMX0sXG4gICAgXSk7XG4gICAgbGlua2Vycy5zZXQoybXJtW5nRGVjbGFyZU5nTW9kdWxlLCBbXG4gICAgICB7cmFuZ2U6ICcwLjAuMC1QTEFDRUhPTERFUicsIGxpbmtlcjogcGFydGlhbE5nTW9kdWxlTGlua2VyVmVyc2lvbjF9LFxuICAgICAge3JhbmdlOiAnPj0xMS4xLjAtbmV4dC4xJywgbGlua2VyOiBwYXJ0aWFsTmdNb2R1bGVMaW5rZXJWZXJzaW9uMX0sXG4gICAgXSk7XG4gICAgbGlua2Vycy5zZXQoybXJtW5nRGVjbGFyZVBpcGUsIFtcbiAgICAgIHtyYW5nZTogJzAuMC4wLVBMQUNFSE9MREVSJywgbGlua2VyOiBwYXJ0aWFsUGlwZUxpbmtlclZlcnNpb24xfSxcbiAgICAgIHtyYW5nZTogJz49MTEuMS4wLW5leHQuMScsIGxpbmtlcjogcGFydGlhbFBpcGVMaW5rZXJWZXJzaW9uMX0sXG4gICAgXSk7XG4gICAgcmV0dXJuIGxpbmtlcnM7XG4gIH1cbn1cbiJdfQ==