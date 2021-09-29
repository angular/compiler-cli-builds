(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_linker_selector", ["require", "exports", "tslib", "semver", "@angular/compiler-cli/linker/src/file_linker/get_source_file", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_class_metadata_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_factory_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_injectable_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_injector_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_ng_module_linker_1", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_pipe_linker_1"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PartialLinkerSelector = exports.createLinkerMap = exports.declarationFunctions = exports.ɵɵngDeclarePipe = exports.ɵɵngDeclareNgModule = exports.ɵɵngDeclareInjector = exports.ɵɵngDeclareInjectable = exports.ɵɵngDeclareFactory = exports.ɵɵngDeclareComponent = exports.ɵɵngDeclareClassMetadata = exports.ɵɵngDeclareDirective = void 0;
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
    var partial_class_metadata_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_class_metadata_linker_1");
    var partial_component_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1");
    var partial_directive_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1");
    var partial_factory_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_factory_linker_1");
    var partial_injectable_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_injectable_linker_1");
    var partial_injector_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_injector_linker_1");
    var partial_ng_module_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_ng_module_linker_1");
    var partial_pipe_linker_1_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_pipe_linker_1");
    exports.ɵɵngDeclareDirective = 'ɵɵngDeclareDirective';
    exports.ɵɵngDeclareClassMetadata = 'ɵɵngDeclareClassMetadata';
    exports.ɵɵngDeclareComponent = 'ɵɵngDeclareComponent';
    exports.ɵɵngDeclareFactory = 'ɵɵngDeclareFactory';
    exports.ɵɵngDeclareInjectable = 'ɵɵngDeclareInjectable';
    exports.ɵɵngDeclareInjector = 'ɵɵngDeclareInjector';
    exports.ɵɵngDeclareNgModule = 'ɵɵngDeclareNgModule';
    exports.ɵɵngDeclarePipe = 'ɵɵngDeclarePipe';
    exports.declarationFunctions = [
        exports.ɵɵngDeclareDirective, exports.ɵɵngDeclareClassMetadata, exports.ɵɵngDeclareComponent, exports.ɵɵngDeclareFactory,
        exports.ɵɵngDeclareInjectable, exports.ɵɵngDeclareInjector, exports.ɵɵngDeclareNgModule, exports.ɵɵngDeclarePipe
    ];
    /**
     * Create a mapping between partial-declaration call name and collections of partial-linkers.
     *
     * Each collection of partial-linkers will contain a version range that will be matched against the
     * `minVersion` of the partial-declaration. (Additionally, a partial-linker may modify its behaviour
     * internally based on the `version` property of the declaration.)
     *
     * Versions should be sorted in ascending order. The most recent partial-linker will be used as the
     * fallback linker if none of the other version ranges match. For example:
     *
     * ```
     * {range: getRange('<=', '13.0.0'), linker PartialDirectiveLinkerVersion2(...) },
     * {range: getRange('<=', '13.1.0'), linker PartialDirectiveLinkerVersion3(...) },
     * {range: getRange('<=', '14.0.0'), linker PartialDirectiveLinkerVersion4(...) },
     * {range: LATEST_VERSION_RANGE, linker: new PartialDirectiveLinkerVersion1(...)},
     * ```
     *
     * If the `LATEST_VERSION_RANGE` is `<=15.0.0` then the fallback linker would be
     * `PartialDirectiveLinkerVersion1` for any version greater than `15.0.0`.
     *
     * When there is a change to a declaration interface that requires a new partial-linker, the
     * `minVersion` of the partial-declaration should be updated, the new linker implementation should
     * be added to the end of the collection, and the version of the previous linker should be updated.
     */
    function createLinkerMap(environment, sourceUrl, code) {
        var linkers = new Map();
        var LATEST_VERSION_RANGE = getRange('<=', '13.0.0-next.8+22.sha-51149ab.with-local-changes');
        linkers.set(exports.ɵɵngDeclareDirective, [
            { range: LATEST_VERSION_RANGE, linker: new partial_directive_linker_1_1.PartialDirectiveLinkerVersion1(sourceUrl, code) },
        ]);
        linkers.set(exports.ɵɵngDeclareClassMetadata, [
            { range: LATEST_VERSION_RANGE, linker: new partial_class_metadata_linker_1_1.PartialClassMetadataLinkerVersion1() },
        ]);
        linkers.set(exports.ɵɵngDeclareComponent, [
            {
                range: LATEST_VERSION_RANGE,
                linker: new partial_component_linker_1_1.PartialComponentLinkerVersion1((0, get_source_file_1.createGetSourceFile)(sourceUrl, code, environment.sourceFileLoader), sourceUrl, code)
            },
        ]);
        linkers.set(exports.ɵɵngDeclareFactory, [
            { range: LATEST_VERSION_RANGE, linker: new partial_factory_linker_1_1.PartialFactoryLinkerVersion1() },
        ]);
        linkers.set(exports.ɵɵngDeclareInjectable, [
            { range: LATEST_VERSION_RANGE, linker: new partial_injectable_linker_1_1.PartialInjectableLinkerVersion1() },
        ]);
        linkers.set(exports.ɵɵngDeclareInjector, [
            { range: LATEST_VERSION_RANGE, linker: new partial_injector_linker_1_1.PartialInjectorLinkerVersion1() },
        ]);
        linkers.set(exports.ɵɵngDeclareNgModule, [
            {
                range: LATEST_VERSION_RANGE,
                linker: new partial_ng_module_linker_1_1.PartialNgModuleLinkerVersion1(environment.options.linkerJitMode)
            },
        ]);
        linkers.set(exports.ɵɵngDeclarePipe, [
            { range: LATEST_VERSION_RANGE, linker: new partial_pipe_linker_1_1.PartialPipeLinkerVersion1() },
        ]);
        return linkers;
    }
    exports.createLinkerMap = createLinkerMap;
    /**
     * A helper that selects the appropriate `PartialLinker` for a given declaration.
     *
     * The selection is made from a database of linker instances, chosen if their given semver range
     * satisfies the `minVersion` of the partial declaration to be linked.
     *
     * Note that the ranges are checked in order, and the first matching range will be selected. So
     * ranges should be most restrictive first. In practice, since ranges are always `<=X.Y.Z` this
     * means that ranges should be in ascending order.
     *
     * Note that any "pre-release" versions are stripped from ranges. Therefore if a `minVersion` is
     * `11.1.0-next.1` then this would match `11.1.0-next.2` and also `12.0.0-next.1`. (This is
     * different to standard semver range checking, where pre-release versions do not cross full version
     * boundaries.)
     */
    var PartialLinkerSelector = /** @class */ (function () {
        function PartialLinkerSelector(linkers, logger, unknownDeclarationVersionHandling) {
            this.linkers = linkers;
            this.logger = logger;
            this.unknownDeclarationVersionHandling = unknownDeclarationVersionHandling;
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
        PartialLinkerSelector.prototype.getLinker = function (functionName, minVersion, version) {
            var e_1, _a;
            if (!this.linkers.has(functionName)) {
                throw new Error("Unknown partial declaration function " + functionName + ".");
            }
            var linkerRanges = this.linkers.get(functionName);
            if (version === '13.0.0-next.8+22.sha-51149ab.with-local-changes') {
                // Special case if the `version` is the same as the current compiler version.
                // This helps with compliance tests where the version placeholders have not been replaced.
                return linkerRanges[linkerRanges.length - 1].linker;
            }
            var declarationRange = getRange('>=', minVersion);
            try {
                for (var linkerRanges_1 = (0, tslib_1.__values)(linkerRanges), linkerRanges_1_1 = linkerRanges_1.next(); !linkerRanges_1_1.done; linkerRanges_1_1 = linkerRanges_1.next()) {
                    var _b = linkerRanges_1_1.value, linkerRange = _b.range, linker = _b.linker;
                    if ((0, semver_1.intersects)(declarationRange, linkerRange)) {
                        return linker;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (linkerRanges_1_1 && !linkerRanges_1_1.done && (_a = linkerRanges_1.return)) _a.call(linkerRanges_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var message = "This application depends upon a library published using Angular version " + version + ", " +
                ("which requires Angular version " + minVersion + " or newer to work correctly.\n") +
                "Consider upgrading your application to use a more recent version of Angular.";
            if (this.unknownDeclarationVersionHandling === 'error') {
                throw new Error(message);
            }
            else if (this.unknownDeclarationVersionHandling === 'warn') {
                this.logger.warn(message + "\nAttempting to continue using this version of Angular.");
            }
            // No linker was matched for this declaration, so just use the most recent one.
            return linkerRanges[linkerRanges.length - 1].linker;
        };
        return PartialLinkerSelector;
    }());
    exports.PartialLinkerSelector = PartialLinkerSelector;
    /**
     * Compute a semver Range from the `version` and comparator.
     *
     * The range is computed as any version greater/less than or equal to the given `versionStr`
     * depending upon the `comparator` (ignoring any prerelease versions).
     *
     * @param comparator a string that determines whether the version specifies a minimum or a maximum
     *     range.
     * @param versionStr the version given in the partial declaration
     * @returns A semver range for the provided `version` and comparator.
     */
    function getRange(comparator, versionStr) {
        var version = new semver_1.SemVer(versionStr);
        // Wipe out any prerelease versions
        version.prerelease = [];
        return new semver_1.Range("" + comparator + version.format());
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9saW5rZXJfc2VsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9saW5rZXJfc2VsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlDQUFpRDtJQUlqRCxnR0FBdUQ7SUFHdkQsZ0pBQXFGO0lBQ3JGLHNJQUE0RTtJQUM1RSxzSUFBNEU7SUFDNUUsa0lBQXdFO0lBQ3hFLHdJQUE4RTtJQUM5RSxvSUFBMEU7SUFFMUUsc0lBQTJFO0lBQzNFLDRIQUFrRTtJQUVyRCxRQUFBLG9CQUFvQixHQUFHLHNCQUFzQixDQUFDO0lBQzlDLFFBQUEsd0JBQXdCLEdBQUcsMEJBQTBCLENBQUM7SUFDdEQsUUFBQSxvQkFBb0IsR0FBRyxzQkFBc0IsQ0FBQztJQUM5QyxRQUFBLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDO0lBQzFDLFFBQUEscUJBQXFCLEdBQUcsdUJBQXVCLENBQUM7SUFDaEQsUUFBQSxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQztJQUM1QyxRQUFBLG1CQUFtQixHQUFHLHFCQUFxQixDQUFDO0lBQzVDLFFBQUEsZUFBZSxHQUFHLGlCQUFpQixDQUFDO0lBQ3BDLFFBQUEsb0JBQW9CLEdBQUc7UUFDbEMsNEJBQW9CLEVBQUUsZ0NBQXdCLEVBQUUsNEJBQW9CLEVBQUUsMEJBQWtCO1FBQ3hGLDZCQUFxQixFQUFFLDJCQUFtQixFQUFFLDJCQUFtQixFQUFFLHVCQUFlO0tBQ2pGLENBQUM7SUFPRjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0F1Qkc7SUFDSCxTQUFnQixlQUFlLENBQzNCLFdBQXVELEVBQUUsU0FBeUIsRUFDbEYsSUFBWTtRQUNkLElBQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFz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LGNBQUssQ0FBQyxLQUFHLFVBQVUsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFJLENBQUMsQ0FBQztJQUN2RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2ludGVyc2VjdHMsIFJhbmdlLCBTZW1WZXJ9IGZyb20gJ3NlbXZlcic7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vLi4vLi4vLi4vc3JjL25ndHNjL2xvZ2dpbmcnO1xuaW1wb3J0IHtjcmVhdGVHZXRTb3VyY2VGaWxlfSBmcm9tICcuLi9nZXRfc291cmNlX2ZpbGUnO1xuaW1wb3J0IHtMaW5rZXJFbnZpcm9ubWVudH0gZnJvbSAnLi4vbGlua2VyX2Vudmlyb25tZW50JztcblxuaW1wb3J0IHtQYXJ0aWFsQ2xhc3NNZXRhZGF0YUxpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfY2xhc3NfbWV0YWRhdGFfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsQ29tcG9uZW50TGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9jb21wb25lbnRfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9kaXJlY3RpdmVfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsRmFjdG9yeUxpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfZmFjdG9yeV9saW5rZXJfMSc7XG5pbXBvcnQge1BhcnRpYWxJbmplY3RhYmxlTGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9pbmplY3RhYmxlX2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbEluamVjdG9yTGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9pbmplY3Rvcl9saW5rZXJfMSc7XG5pbXBvcnQge1BhcnRpYWxMaW5rZXJ9IGZyb20gJy4vcGFydGlhbF9saW5rZXInO1xuaW1wb3J0IHtQYXJ0aWFsTmdNb2R1bGVMaW5rZXJWZXJzaW9uMX0gZnJvbSAnLi9wYXJ0aWFsX25nX21vZHVsZV9saW5rZXJfMSc7XG5pbXBvcnQge1BhcnRpYWxQaXBlTGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9waXBlX2xpbmtlcl8xJztcblxuZXhwb3J0IGNvbnN0IMm1ybVuZ0RlY2xhcmVEaXJlY3RpdmUgPSAnybXJtW5nRGVjbGFyZURpcmVjdGl2ZSc7XG5leHBvcnQgY29uc3QgybXJtW5nRGVjbGFyZUNsYXNzTWV0YWRhdGEgPSAnybXJtW5nRGVjbGFyZUNsYXNzTWV0YWRhdGEnO1xuZXhwb3J0IGNvbnN0IMm1ybVuZ0RlY2xhcmVDb21wb25lbnQgPSAnybXJtW5nRGVjbGFyZUNvbXBvbmVudCc7XG5leHBvcnQgY29uc3QgybXJtW5nRGVjbGFyZUZhY3RvcnkgPSAnybXJtW5nRGVjbGFyZUZhY3RvcnknO1xuZXhwb3J0IGNvbnN0IMm1ybVuZ0RlY2xhcmVJbmplY3RhYmxlID0gJ8m1ybVuZ0RlY2xhcmVJbmplY3RhYmxlJztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlSW5qZWN0b3IgPSAnybXJtW5nRGVjbGFyZUluamVjdG9yJztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlTmdNb2R1bGUgPSAnybXJtW5nRGVjbGFyZU5nTW9kdWxlJztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlUGlwZSA9ICfJtcm1bmdEZWNsYXJlUGlwZSc7XG5leHBvcnQgY29uc3QgZGVjbGFyYXRpb25GdW5jdGlvbnMgPSBbXG4gIMm1ybVuZ0RlY2xhcmVEaXJlY3RpdmUsIMm1ybVuZ0RlY2xhcmVDbGFzc01ldGFkYXRhLCDJtcm1bmdEZWNsYXJlQ29tcG9uZW50LCDJtcm1bmdEZWNsYXJlRmFjdG9yeSxcbiAgybXJtW5nRGVjbGFyZUluamVjdGFibGUsIMm1ybVuZ0RlY2xhcmVJbmplY3RvciwgybXJtW5nRGVjbGFyZU5nTW9kdWxlLCDJtcm1bmdEZWNsYXJlUGlwZVxuXTtcblxuZXhwb3J0IGludGVyZmFjZSBMaW5rZXJSYW5nZTxURXhwcmVzc2lvbj4ge1xuICByYW5nZTogUmFuZ2U7XG4gIGxpbmtlcjogUGFydGlhbExpbmtlcjxURXhwcmVzc2lvbj47XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgbWFwcGluZyBiZXR3ZWVuIHBhcnRpYWwtZGVjbGFyYXRpb24gY2FsbCBuYW1lIGFuZCBjb2xsZWN0aW9ucyBvZiBwYXJ0aWFsLWxpbmtlcnMuXG4gKlxuICogRWFjaCBjb2xsZWN0aW9uIG9mIHBhcnRpYWwtbGlua2VycyB3aWxsIGNvbnRhaW4gYSB2ZXJzaW9uIHJhbmdlIHRoYXQgd2lsbCBiZSBtYXRjaGVkIGFnYWluc3QgdGhlXG4gKiBgbWluVmVyc2lvbmAgb2YgdGhlIHBhcnRpYWwtZGVjbGFyYXRpb24uIChBZGRpdGlvbmFsbHksIGEgcGFydGlhbC1saW5rZXIgbWF5IG1vZGlmeSBpdHMgYmVoYXZpb3VyXG4gKiBpbnRlcm5hbGx5IGJhc2VkIG9uIHRoZSBgdmVyc2lvbmAgcHJvcGVydHkgb2YgdGhlIGRlY2xhcmF0aW9uLilcbiAqXG4gKiBWZXJzaW9ucyBzaG91bGQgYmUgc29ydGVkIGluIGFzY2VuZGluZyBvcmRlci4gVGhlIG1vc3QgcmVjZW50IHBhcnRpYWwtbGlua2VyIHdpbGwgYmUgdXNlZCBhcyB0aGVcbiAqIGZhbGxiYWNrIGxpbmtlciBpZiBub25lIG9mIHRoZSBvdGhlciB2ZXJzaW9uIHJhbmdlcyBtYXRjaC4gRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiB7cmFuZ2U6IGdldFJhbmdlKCc8PScsICcxMy4wLjAnKSwgbGlua2VyIFBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uMiguLi4pIH0sXG4gKiB7cmFuZ2U6IGdldFJhbmdlKCc8PScsICcxMy4xLjAnKSwgbGlua2VyIFBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uMyguLi4pIH0sXG4gKiB7cmFuZ2U6IGdldFJhbmdlKCc8PScsICcxNC4wLjAnKSwgbGlua2VyIFBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uNCguLi4pIH0sXG4gKiB7cmFuZ2U6IExBVEVTVF9WRVJTSU9OX1JBTkdFLCBsaW5rZXI6IG5ldyBQYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjEoLi4uKX0sXG4gKiBgYGBcbiAqXG4gKiBJZiB0aGUgYExBVEVTVF9WRVJTSU9OX1JBTkdFYCBpcyBgPD0xNS4wLjBgIHRoZW4gdGhlIGZhbGxiYWNrIGxpbmtlciB3b3VsZCBiZVxuICogYFBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uMWAgZm9yIGFueSB2ZXJzaW9uIGdyZWF0ZXIgdGhhbiBgMTUuMC4wYC5cbiAqXG4gKiBXaGVuIHRoZXJlIGlzIGEgY2hhbmdlIHRvIGEgZGVjbGFyYXRpb24gaW50ZXJmYWNlIHRoYXQgcmVxdWlyZXMgYSBuZXcgcGFydGlhbC1saW5rZXIsIHRoZVxuICogYG1pblZlcnNpb25gIG9mIHRoZSBwYXJ0aWFsLWRlY2xhcmF0aW9uIHNob3VsZCBiZSB1cGRhdGVkLCB0aGUgbmV3IGxpbmtlciBpbXBsZW1lbnRhdGlvbiBzaG91bGRcbiAqIGJlIGFkZGVkIHRvIHRoZSBlbmQgb2YgdGhlIGNvbGxlY3Rpb24sIGFuZCB0aGUgdmVyc2lvbiBvZiB0aGUgcHJldmlvdXMgbGlua2VyIHNob3VsZCBiZSB1cGRhdGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTGlua2VyTWFwPFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPihcbiAgICBlbnZpcm9ubWVudDogTGlua2VyRW52aXJvbm1lbnQ8VFN0YXRlbWVudCwgVEV4cHJlc3Npb24+LCBzb3VyY2VVcmw6IEFic29sdXRlRnNQYXRoLFxuICAgIGNvZGU6IHN0cmluZyk6IE1hcDxzdHJpbmcsIExpbmtlclJhbmdlPFRFeHByZXNzaW9uPltdPiB7XG4gIGNvbnN0IGxpbmtlcnMgPSBuZXcgTWFwPHN0cmluZywgTGlua2VyUmFuZ2U8VEV4cHJlc3Npb24+W10+KCk7XG4gIGNvbnN0IExBVEVTVF9WRVJTSU9OX1JBTkdFID0gZ2V0UmFuZ2UoJzw9JywgJzAuMC4wLVBMQUNFSE9MREVSJyk7XG5cbiAgbGlua2Vycy5zZXQoybXJtW5nRGVjbGFyZURpcmVjdGl2ZSwgW1xuICAgIHtyYW5nZTogTEFURVNUX1ZFUlNJT05fUkFOR0UsIGxpbmtlcjogbmV3IFBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uMShzb3VyY2VVcmwsIGNvZGUpfSxcbiAgXSk7XG4gIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVDbGFzc01ldGFkYXRhLCBbXG4gICAge3JhbmdlOiBMQVRFU1RfVkVSU0lPTl9SQU5HRSwgbGlua2VyOiBuZXcgUGFydGlhbENsYXNzTWV0YWRhdGFMaW5rZXJWZXJzaW9uMSgpfSxcbiAgXSk7XG4gIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVDb21wb25lbnQsIFtcbiAgICB7XG4gICAgICByYW5nZTogTEFURVNUX1ZFUlNJT05fUkFOR0UsXG4gICAgICBsaW5rZXI6IG5ldyBQYXJ0aWFsQ29tcG9uZW50TGlua2VyVmVyc2lvbjEoXG4gICAgICAgICAgY3JlYXRlR2V0U291cmNlRmlsZShzb3VyY2VVcmwsIGNvZGUsIGVudmlyb25tZW50LnNvdXJjZUZpbGVMb2FkZXIpLCBzb3VyY2VVcmwsIGNvZGUpXG4gICAgfSxcbiAgXSk7XG4gIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVGYWN0b3J5LCBbXG4gICAge3JhbmdlOiBMQVRFU1RfVkVSU0lPTl9SQU5HRSwgbGlua2VyOiBuZXcgUGFydGlhbEZhY3RvcnlMaW5rZXJWZXJzaW9uMSgpfSxcbiAgXSk7XG4gIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVJbmplY3RhYmxlLCBbXG4gICAge3JhbmdlOiBMQVRFU1RfVkVSU0lPTl9SQU5HRSwgbGlua2VyOiBuZXcgUGFydGlhbEluamVjdGFibGVMaW5rZXJWZXJzaW9uMSgpfSxcbiAgXSk7XG4gIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVJbmplY3RvciwgW1xuICAgIHtyYW5nZTogTEFURVNUX1ZFUlNJT05fUkFOR0UsIGxpbmtlcjogbmV3IFBhcnRpYWxJbmplY3RvckxpbmtlclZlcnNpb24xKCl9LFxuICBdKTtcbiAgbGlua2Vycy5zZXQoybXJtW5nRGVjbGFyZU5nTW9kdWxlLCBbXG4gICAge1xuICAgICAgcmFuZ2U6IExBVEVTVF9WRVJTSU9OX1JBTkdFLFxuICAgICAgbGlua2VyOiBuZXcgUGFydGlhbE5nTW9kdWxlTGlua2VyVmVyc2lvbjEoZW52aXJvbm1lbnQub3B0aW9ucy5saW5rZXJKaXRNb2RlKVxuICAgIH0sXG4gIF0pO1xuICBsaW5rZXJzLnNldCjJtcm1bmdEZWNsYXJlUGlwZSwgW1xuICAgIHtyYW5nZTogTEFURVNUX1ZFUlNJT05fUkFOR0UsIGxpbmtlcjogbmV3IFBhcnRpYWxQaXBlTGlua2VyVmVyc2lvbjEoKX0sXG4gIF0pO1xuXG4gIHJldHVybiBsaW5rZXJzO1xufVxuXG4vKipcbiAqIEEgaGVscGVyIHRoYXQgc2VsZWN0cyB0aGUgYXBwcm9wcmlhdGUgYFBhcnRpYWxMaW5rZXJgIGZvciBhIGdpdmVuIGRlY2xhcmF0aW9uLlxuICpcbiAqIFRoZSBzZWxlY3Rpb24gaXMgbWFkZSBmcm9tIGEgZGF0YWJhc2Ugb2YgbGlua2VyIGluc3RhbmNlcywgY2hvc2VuIGlmIHRoZWlyIGdpdmVuIHNlbXZlciByYW5nZVxuICogc2F0aXNmaWVzIHRoZSBgbWluVmVyc2lvbmAgb2YgdGhlIHBhcnRpYWwgZGVjbGFyYXRpb24gdG8gYmUgbGlua2VkLlxuICpcbiAqIE5vdGUgdGhhdCB0aGUgcmFuZ2VzIGFyZSBjaGVja2VkIGluIG9yZGVyLCBhbmQgdGhlIGZpcnN0IG1hdGNoaW5nIHJhbmdlIHdpbGwgYmUgc2VsZWN0ZWQuIFNvXG4gKiByYW5nZXMgc2hvdWxkIGJlIG1vc3QgcmVzdHJpY3RpdmUgZmlyc3QuIEluIHByYWN0aWNlLCBzaW5jZSByYW5nZXMgYXJlIGFsd2F5cyBgPD1YLlkuWmAgdGhpc1xuICogbWVhbnMgdGhhdCByYW5nZXMgc2hvdWxkIGJlIGluIGFzY2VuZGluZyBvcmRlci5cbiAqXG4gKiBOb3RlIHRoYXQgYW55IFwicHJlLXJlbGVhc2VcIiB2ZXJzaW9ucyBhcmUgc3RyaXBwZWQgZnJvbSByYW5nZXMuIFRoZXJlZm9yZSBpZiBhIGBtaW5WZXJzaW9uYCBpc1xuICogYDExLjEuMC1uZXh0LjFgIHRoZW4gdGhpcyB3b3VsZCBtYXRjaCBgMTEuMS4wLW5leHQuMmAgYW5kIGFsc28gYDEyLjAuMC1uZXh0LjFgLiAoVGhpcyBpc1xuICogZGlmZmVyZW50IHRvIHN0YW5kYXJkIHNlbXZlciByYW5nZSBjaGVja2luZywgd2hlcmUgcHJlLXJlbGVhc2UgdmVyc2lvbnMgZG8gbm90IGNyb3NzIGZ1bGwgdmVyc2lvblxuICogYm91bmRhcmllcy4pXG4gKi9cbmV4cG9ydCBjbGFzcyBQYXJ0aWFsTGlua2VyU2VsZWN0b3I8VEV4cHJlc3Npb24+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGxpbmtlcnM6IE1hcDxzdHJpbmcsIExpbmtlclJhbmdlPFRFeHByZXNzaW9uPltdPixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgbG9nZ2VyOiBMb2dnZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHVua25vd25EZWNsYXJhdGlvblZlcnNpb25IYW5kbGluZzogJ2lnbm9yZSd8J3dhcm4nfCdlcnJvcicpIHt9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiB0aGVyZSBhcmUgYFBhcnRpYWxMaW5rZXJgIGNsYXNzZXMgdGhhdCBjYW4gaGFuZGxlIGZ1bmN0aW9ucyB3aXRoIHRoaXMgbmFtZS5cbiAgICovXG4gIHN1cHBvcnRzRGVjbGFyYXRpb24oZnVuY3Rpb25OYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5saW5rZXJzLmhhcyhmdW5jdGlvbk5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGBQYXJ0aWFsTGlua2VyYCB0aGF0IGNhbiBoYW5kbGUgZnVuY3Rpb25zIHdpdGggdGhlIGdpdmVuIG5hbWUgYW5kIHZlcnNpb24uXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiB0aGVyZSBpcyBub25lLlxuICAgKi9cbiAgZ2V0TGlua2VyKGZ1bmN0aW9uTmFtZTogc3RyaW5nLCBtaW5WZXJzaW9uOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZyk6IFBhcnRpYWxMaW5rZXI8VEV4cHJlc3Npb24+IHtcbiAgICBpZiAoIXRoaXMubGlua2Vycy5oYXMoZnVuY3Rpb25OYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHBhcnRpYWwgZGVjbGFyYXRpb24gZnVuY3Rpb24gJHtmdW5jdGlvbk5hbWV9LmApO1xuICAgIH1cbiAgICBjb25zdCBsaW5rZXJSYW5nZXMgPSB0aGlzLmxpbmtlcnMuZ2V0KGZ1bmN0aW9uTmFtZSkhO1xuXG4gICAgaWYgKHZlcnNpb24gPT09ICcwLjAuMC1QTEFDRUhPTERFUicpIHtcbiAgICAgIC8vIFNwZWNpYWwgY2FzZSBpZiB0aGUgYHZlcnNpb25gIGlzIHRoZSBzYW1lIGFzIHRoZSBjdXJyZW50IGNvbXBpbGVyIHZlcnNpb24uXG4gICAgICAvLyBUaGlzIGhlbHBzIHdpdGggY29tcGxpYW5jZSB0ZXN0cyB3aGVyZSB0aGUgdmVyc2lvbiBwbGFjZWhvbGRlcnMgaGF2ZSBub3QgYmVlbiByZXBsYWNlZC5cbiAgICAgIHJldHVybiBsaW5rZXJSYW5nZXNbbGlua2VyUmFuZ2VzLmxlbmd0aCAtIDFdLmxpbmtlcjtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvblJhbmdlID0gZ2V0UmFuZ2UoJz49JywgbWluVmVyc2lvbik7XG4gICAgZm9yIChjb25zdCB7cmFuZ2U6IGxpbmtlclJhbmdlLCBsaW5rZXJ9IG9mIGxpbmtlclJhbmdlcykge1xuICAgICAgaWYgKGludGVyc2VjdHMoZGVjbGFyYXRpb25SYW5nZSwgbGlua2VyUmFuZ2UpKSB7XG4gICAgICAgIHJldHVybiBsaW5rZXI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbWVzc2FnZSA9XG4gICAgICAgIGBUaGlzIGFwcGxpY2F0aW9uIGRlcGVuZHMgdXBvbiBhIGxpYnJhcnkgcHVibGlzaGVkIHVzaW5nIEFuZ3VsYXIgdmVyc2lvbiAke3ZlcnNpb259LCBgICtcbiAgICAgICAgYHdoaWNoIHJlcXVpcmVzIEFuZ3VsYXIgdmVyc2lvbiAke21pblZlcnNpb259IG9yIG5ld2VyIHRvIHdvcmsgY29ycmVjdGx5LlxcbmAgK1xuICAgICAgICBgQ29uc2lkZXIgdXBncmFkaW5nIHlvdXIgYXBwbGljYXRpb24gdG8gdXNlIGEgbW9yZSByZWNlbnQgdmVyc2lvbiBvZiBBbmd1bGFyLmA7XG5cbiAgICBpZiAodGhpcy51bmtub3duRGVjbGFyYXRpb25WZXJzaW9uSGFuZGxpbmcgPT09ICdlcnJvcicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMudW5rbm93bkRlY2xhcmF0aW9uVmVyc2lvbkhhbmRsaW5nID09PSAnd2FybicpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oYCR7bWVzc2FnZX1cXG5BdHRlbXB0aW5nIHRvIGNvbnRpbnVlIHVzaW5nIHRoaXMgdmVyc2lvbiBvZiBBbmd1bGFyLmApO1xuICAgIH1cblxuICAgIC8vIE5vIGxpbmtlciB3YXMgbWF0Y2hlZCBmb3IgdGhpcyBkZWNsYXJhdGlvbiwgc28ganVzdCB1c2UgdGhlIG1vc3QgcmVjZW50IG9uZS5cbiAgICByZXR1cm4gbGlua2VyUmFuZ2VzW2xpbmtlclJhbmdlcy5sZW5ndGggLSAxXS5saW5rZXI7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wdXRlIGEgc2VtdmVyIFJhbmdlIGZyb20gdGhlIGB2ZXJzaW9uYCBhbmQgY29tcGFyYXRvci5cbiAqXG4gKiBUaGUgcmFuZ2UgaXMgY29tcHV0ZWQgYXMgYW55IHZlcnNpb24gZ3JlYXRlci9sZXNzIHRoYW4gb3IgZXF1YWwgdG8gdGhlIGdpdmVuIGB2ZXJzaW9uU3RyYFxuICogZGVwZW5kaW5nIHVwb24gdGhlIGBjb21wYXJhdG9yYCAoaWdub3JpbmcgYW55IHByZXJlbGVhc2UgdmVyc2lvbnMpLlxuICpcbiAqIEBwYXJhbSBjb21wYXJhdG9yIGEgc3RyaW5nIHRoYXQgZGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSB2ZXJzaW9uIHNwZWNpZmllcyBhIG1pbmltdW0gb3IgYSBtYXhpbXVtXG4gKiAgICAgcmFuZ2UuXG4gKiBAcGFyYW0gdmVyc2lvblN0ciB0aGUgdmVyc2lvbiBnaXZlbiBpbiB0aGUgcGFydGlhbCBkZWNsYXJhdGlvblxuICogQHJldHVybnMgQSBzZW12ZXIgcmFuZ2UgZm9yIHRoZSBwcm92aWRlZCBgdmVyc2lvbmAgYW5kIGNvbXBhcmF0b3IuXG4gKi9cbmZ1bmN0aW9uIGdldFJhbmdlKGNvbXBhcmF0b3I6ICc8PSd8Jz49JywgdmVyc2lvblN0cjogc3RyaW5nKTogUmFuZ2Uge1xuICBjb25zdCB2ZXJzaW9uID0gbmV3IFNlbVZlcih2ZXJzaW9uU3RyKTtcbiAgLy8gV2lwZSBvdXQgYW55IHByZXJlbGVhc2UgdmVyc2lvbnNcbiAgdmVyc2lvbi5wcmVyZWxlYXNlID0gW107XG4gIHJldHVybiBuZXcgUmFuZ2UoYCR7Y29tcGFyYXRvcn0ke3ZlcnNpb24uZm9ybWF0KCl9YCk7XG59XG4iXX0=