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
    exports.PartialLinkerSelector = exports.declarationFunctions = exports.ɵɵngDeclarePipe = exports.ɵɵngDeclareNgModule = exports.ɵɵngDeclareInjector = exports.ɵɵngDeclareInjectable = exports.ɵɵngDeclareFactory = exports.ɵɵngDeclareComponent = exports.ɵɵngDeclareClassMetadata = exports.ɵɵngDeclareDirective = void 0;
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
     * Finally, note that we always start with the current version (i.e. `12.0.0-next.8+74.sha-f7e391a`). This
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
            var partialClassMetadataLinkerVersion1 = new partial_class_metadata_linker_1_1.PartialClassMetadataLinkerVersion1();
            var partialComponentLinkerVersion1 = new partial_component_linker_1_1.PartialComponentLinkerVersion1(get_source_file_1.createGetSourceFile(sourceUrl, code, environment.sourceFileLoader), sourceUrl, code);
            var partialFactoryLinkerVersion1 = new partial_factory_linker_1_1.PartialFactoryLinkerVersion1();
            var partialInjectableLinkerVersion1 = new partial_injectable_linker_1_1.PartialInjectableLinkerVersion1();
            var partialInjectorLinkerVersion1 = new partial_injector_linker_1_1.PartialInjectorLinkerVersion1();
            var partialNgModuleLinkerVersion1 = new partial_ng_module_linker_1_1.PartialNgModuleLinkerVersion1(environment.options.linkerJitMode);
            var partialPipeLinkerVersion1 = new partial_pipe_linker_1_1.PartialPipeLinkerVersion1();
            var linkers = new Map();
            linkers.set(exports.ɵɵngDeclareDirective, [
                { range: '12.0.0-next.8+74.sha-f7e391a', linker: partialDirectiveLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialDirectiveLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclareClassMetadata, [
                { range: '12.0.0-next.8+74.sha-f7e391a', linker: partialClassMetadataLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialClassMetadataLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclareComponent, [
                { range: '12.0.0-next.8+74.sha-f7e391a', linker: partialComponentLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialComponentLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclareFactory, [
                { range: '12.0.0-next.8+74.sha-f7e391a', linker: partialFactoryLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialFactoryLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclareInjectable, [
                { range: '12.0.0-next.8+74.sha-f7e391a', linker: partialInjectableLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialInjectableLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclareInjector, [
                { range: '12.0.0-next.8+74.sha-f7e391a', linker: partialInjectorLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialInjectorLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclareNgModule, [
                { range: '12.0.0-next.8+74.sha-f7e391a', linker: partialNgModuleLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialNgModuleLinkerVersion1 },
            ]);
            linkers.set(exports.ɵɵngDeclarePipe, [
                { range: '12.0.0-next.8+74.sha-f7e391a', linker: partialPipeLinkerVersion1 },
                { range: '>=11.1.0-next.1', linker: partialPipeLinkerVersion1 },
            ]);
            return linkers;
        };
        return PartialLinkerSelector;
    }());
    exports.PartialLinkerSelector = PartialLinkerSelector;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9saW5rZXJfc2VsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9saW5rZXJfc2VsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlDQUFpQztJQUdqQyxnR0FBdUQ7SUFHdkQsZ0pBQXFGO0lBQ3JGLHNJQUE0RTtJQUM1RSxzSUFBNEU7SUFDNUUsa0lBQXdFO0lBQ3hFLHdJQUE4RTtJQUM5RSxvSUFBMEU7SUFFMUUsc0lBQTJFO0lBQzNFLDRIQUFrRTtJQUVyRCxRQUFBLG9CQUFvQixHQUFHLHNCQUFzQixDQUFDO0lBQzlDLFFBQUEsd0JBQXdCLEdBQUcsMEJBQTBCLENBQUM7SUFDdEQsUUFBQSxvQkFBb0IsR0FBRyxzQkFBc0IsQ0FBQztJQUM5QyxRQUFBLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDO0lBQzFDLFFBQUEscUJBQXFCLEdBQUcsdUJBQXVCLENBQUM7SUFDaEQsUUFBQSxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQztJQUM1QyxRQUFBLG1CQUFtQixHQUFHLHFCQUFxQixDQUFDO0lBQzVDLFFBQUEsZUFBZSxHQUFHLGlCQUFpQixDQUFDO0lBQ3BDLFFBQUEsb0JBQW9CLEdBQUc7UUFDbEMsNEJBQW9CLEVBQUUsZ0NBQXdCLEVBQUUsNEJBQW9CLEVBQUUsMEJBQWtCO1FBQ3hGLDZCQUFxQixFQUFFLDJCQUFtQixFQUFFLDJCQUFtQixFQUFFLHVCQUFlO0tBQ2pGLENBQUM7SUFPRjs7Ozs7Ozs7Ozs7Ozs7T0FjRztJQUNIO1FBR0UsK0JBQ0ksV0FBdUQsRUFBRSxTQUF5QixFQUNsRixJQUFZO1lBQ2QsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcs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O1lBQ0gsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQXBGRCxJQW9GQztJQXBGWSxzREFBcUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7c2F0aXNmaWVzfSBmcm9tICdzZW12ZXInO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtjcmVhdGVHZXRTb3VyY2VGaWxlfSBmcm9tICcuLi9nZXRfc291cmNlX2ZpbGUnO1xuaW1wb3J0IHtMaW5rZXJFbnZpcm9ubWVudH0gZnJvbSAnLi4vbGlua2VyX2Vudmlyb25tZW50JztcblxuaW1wb3J0IHtQYXJ0aWFsQ2xhc3NNZXRhZGF0YUxpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfY2xhc3NfbWV0YWRhdGFfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsQ29tcG9uZW50TGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9jb21wb25lbnRfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9kaXJlY3RpdmVfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsRmFjdG9yeUxpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfZmFjdG9yeV9saW5rZXJfMSc7XG5pbXBvcnQge1BhcnRpYWxJbmplY3RhYmxlTGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9pbmplY3RhYmxlX2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbEluamVjdG9yTGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9pbmplY3Rvcl9saW5rZXJfMSc7XG5pbXBvcnQge1BhcnRpYWxMaW5rZXJ9IGZyb20gJy4vcGFydGlhbF9saW5rZXInO1xuaW1wb3J0IHtQYXJ0aWFsTmdNb2R1bGVMaW5rZXJWZXJzaW9uMX0gZnJvbSAnLi9wYXJ0aWFsX25nX21vZHVsZV9saW5rZXJfMSc7XG5pbXBvcnQge1BhcnRpYWxQaXBlTGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9waXBlX2xpbmtlcl8xJztcblxuZXhwb3J0IGNvbnN0IMm1ybVuZ0RlY2xhcmVEaXJlY3RpdmUgPSAnybXJtW5nRGVjbGFyZURpcmVjdGl2ZSc7XG5leHBvcnQgY29uc3QgybXJtW5nRGVjbGFyZUNsYXNzTWV0YWRhdGEgPSAnybXJtW5nRGVjbGFyZUNsYXNzTWV0YWRhdGEnO1xuZXhwb3J0IGNvbnN0IMm1ybVuZ0RlY2xhcmVDb21wb25lbnQgPSAnybXJtW5nRGVjbGFyZUNvbXBvbmVudCc7XG5leHBvcnQgY29uc3QgybXJtW5nRGVjbGFyZUZhY3RvcnkgPSAnybXJtW5nRGVjbGFyZUZhY3RvcnknO1xuZXhwb3J0IGNvbnN0IMm1ybVuZ0RlY2xhcmVJbmplY3RhYmxlID0gJ8m1ybVuZ0RlY2xhcmVJbmplY3RhYmxlJztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlSW5qZWN0b3IgPSAnybXJtW5nRGVjbGFyZUluamVjdG9yJztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlTmdNb2R1bGUgPSAnybXJtW5nRGVjbGFyZU5nTW9kdWxlJztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlUGlwZSA9ICfJtcm1bmdEZWNsYXJlUGlwZSc7XG5leHBvcnQgY29uc3QgZGVjbGFyYXRpb25GdW5jdGlvbnMgPSBbXG4gIMm1ybVuZ0RlY2xhcmVEaXJlY3RpdmUsIMm1ybVuZ0RlY2xhcmVDbGFzc01ldGFkYXRhLCDJtcm1bmdEZWNsYXJlQ29tcG9uZW50LCDJtcm1bmdEZWNsYXJlRmFjdG9yeSxcbiAgybXJtW5nRGVjbGFyZUluamVjdGFibGUsIMm1ybVuZ0RlY2xhcmVJbmplY3RvciwgybXJtW5nRGVjbGFyZU5nTW9kdWxlLCDJtcm1bmdEZWNsYXJlUGlwZVxuXTtcblxuaW50ZXJmYWNlIExpbmtlclJhbmdlPFRFeHByZXNzaW9uPiB7XG4gIHJhbmdlOiBzdHJpbmc7XG4gIGxpbmtlcjogUGFydGlhbExpbmtlcjxURXhwcmVzc2lvbj47XG59XG5cbi8qKlxuICogQSBoZWxwZXIgdGhhdCBzZWxlY3RzIHRoZSBhcHByb3ByaWF0ZSBgUGFydGlhbExpbmtlcmAgZm9yIGEgZ2l2ZW4gZGVjbGFyYXRpb24uXG4gKlxuICogVGhlIHNlbGVjdGlvbiBpcyBtYWRlIGZyb20gYSBkYXRhYmFzZSBvZiBsaW5rZXIgaW5zdGFuY2VzLCBjaG9zZW4gaWYgdGhlaXIgZ2l2ZW4gc2VtdmVyIHJhbmdlXG4gKiBzYXRpc2ZpZXMgdGhlIHZlcnNpb24gZm91bmQgaW4gdGhlIGNvZGUgdG8gYmUgbGlua2VkLlxuICpcbiAqIE5vdGUgdGhhdCB0aGUgcmFuZ2VzIGFyZSBjaGVja2VkIGluIG9yZGVyLCBhbmQgdGhlIGZpcnN0IG1hdGNoaW5nIHJhbmdlIHdpbGwgYmUgc2VsZWN0ZWQsIHNvXG4gKiByYW5nZXMgc2hvdWxkIGJlIG1vc3QgcmVzdHJpY3RpdmUgZmlyc3QuXG4gKlxuICogQWxzbywgcmFuZ2VzIGFyZSBtYXRjaGVkIHRvIGluY2x1ZGUgXCJwcmUtcmVsZWFzZXNcIiwgdGhlcmVmb3JlIGlmIHRoZSByYW5nZSBpcyBgPj0xMS4xLjAtbmV4dC4xYFxuICogdGhlbiB0aGlzIGluY2x1ZGVzIGAxMS4xLjAtbmV4dC4yYCBhbmQgYWxzbyBgMTIuMC4wLW5leHQuMWAuXG4gKlxuICogRmluYWxseSwgbm90ZSB0aGF0IHdlIGFsd2F5cyBzdGFydCB3aXRoIHRoZSBjdXJyZW50IHZlcnNpb24gKGkuZS4gYDAuMC4wLVBMQUNFSE9MREVSYCkuIFRoaXNcbiAqIGFsbG93cyB0aGUgbGlua2VyIHRvIHdvcmsgb24gbG9jYWwgYnVpbGRzIGVmZmVjdGl2ZWx5LlxuICovXG5leHBvcnQgY2xhc3MgUGFydGlhbExpbmtlclNlbGVjdG9yPFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPiB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbGlua2VyczogTWFwPHN0cmluZywgTGlua2VyUmFuZ2U8VEV4cHJlc3Npb24+W10+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgZW52aXJvbm1lbnQ6IExpbmtlckVudmlyb25tZW50PFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPiwgc291cmNlVXJsOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIGNvZGU6IHN0cmluZykge1xuICAgIHRoaXMubGlua2VycyA9IHRoaXMuY3JlYXRlTGlua2VyTWFwKGVudmlyb25tZW50LCBzb3VyY2VVcmwsIGNvZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiB0aGVyZSBhcmUgYFBhcnRpYWxMaW5rZXJgIGNsYXNzZXMgdGhhdCBjYW4gaGFuZGxlIGZ1bmN0aW9ucyB3aXRoIHRoaXMgbmFtZS5cbiAgICovXG4gIHN1cHBvcnRzRGVjbGFyYXRpb24oZnVuY3Rpb25OYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5saW5rZXJzLmhhcyhmdW5jdGlvbk5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGBQYXJ0aWFsTGlua2VyYCB0aGF0IGNhbiBoYW5kbGUgZnVuY3Rpb25zIHdpdGggdGhlIGdpdmVuIG5hbWUgYW5kIHZlcnNpb24uXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiB0aGVyZSBpcyBub25lLlxuICAgKi9cbiAgZ2V0TGlua2VyKGZ1bmN0aW9uTmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcpOiBQYXJ0aWFsTGlua2VyPFRFeHByZXNzaW9uPiB7XG4gICAgaWYgKCF0aGlzLmxpbmtlcnMuaGFzKGZ1bmN0aW9uTmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwYXJ0aWFsIGRlY2xhcmF0aW9uIGZ1bmN0aW9uICR7ZnVuY3Rpb25OYW1lfS5gKTtcbiAgICB9XG4gICAgY29uc3QgdmVyc2lvbnMgPSB0aGlzLmxpbmtlcnMuZ2V0KGZ1bmN0aW9uTmFtZSkhO1xuICAgIGZvciAoY29uc3Qge3JhbmdlLCBsaW5rZXJ9IG9mIHZlcnNpb25zKSB7XG4gICAgICBpZiAoc2F0aXNmaWVzKHZlcnNpb24sIHJhbmdlLCB7aW5jbHVkZVByZXJlbGVhc2U6IHRydWV9KSkge1xuICAgICAgICByZXR1cm4gbGlua2VyO1xuICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBVbnN1cHBvcnRlZCBwYXJ0aWFsIGRlY2xhcmF0aW9uIHZlcnNpb24gJHt2ZXJzaW9ufSBmb3IgJHtmdW5jdGlvbk5hbWV9LlxcbmAgK1xuICAgICAgICAnVmFsaWQgdmVyc2lvbiByYW5nZXMgYXJlOlxcbicgKyB2ZXJzaW9ucy5tYXAodiA9PiBgIC0gJHt2LnJhbmdlfWApLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlTGlua2VyTWFwKFxuICAgICAgZW52aXJvbm1lbnQ6IExpbmtlckVudmlyb25tZW50PFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPiwgc291cmNlVXJsOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIGNvZGU6IHN0cmluZyk6IE1hcDxzdHJpbmcsIExpbmtlclJhbmdlPFRFeHByZXNzaW9uPltdPiB7XG4gICAgY29uc3QgcGFydGlhbERpcmVjdGl2ZUxpbmtlclZlcnNpb24xID0gbmV3IFBhcnRpYWxEaXJlY3RpdmVMaW5rZXJWZXJzaW9uMShzb3VyY2VVcmwsIGNvZGUpO1xuICAgIGNvbnN0IHBhcnRpYWxDbGFzc01ldGFkYXRhTGlua2VyVmVyc2lvbjEgPSBuZXcgUGFydGlhbENsYXNzTWV0YWRhdGFMaW5rZXJWZXJzaW9uMSgpO1xuICAgIGNvbnN0IHBhcnRpYWxDb21wb25lbnRMaW5rZXJWZXJzaW9uMSA9IG5ldyBQYXJ0aWFsQ29tcG9uZW50TGlua2VyVmVyc2lvbjEoXG4gICAgICAgIGNyZWF0ZUdldFNvdXJjZUZpbGUoc291cmNlVXJsLCBjb2RlLCBlbnZpcm9ubWVudC5zb3VyY2VGaWxlTG9hZGVyKSwgc291cmNlVXJsLCBjb2RlKTtcbiAgICBjb25zdCBwYXJ0aWFsRmFjdG9yeUxpbmtlclZlcnNpb24xID0gbmV3IFBhcnRpYWxGYWN0b3J5TGlua2VyVmVyc2lvbjEoKTtcbiAgICBjb25zdCBwYXJ0aWFsSW5qZWN0YWJsZUxpbmtlclZlcnNpb24xID0gbmV3IFBhcnRpYWxJbmplY3RhYmxlTGlua2VyVmVyc2lvbjEoKTtcbiAgICBjb25zdCBwYXJ0aWFsSW5qZWN0b3JMaW5rZXJWZXJzaW9uMSA9IG5ldyBQYXJ0aWFsSW5qZWN0b3JMaW5rZXJWZXJzaW9uMSgpO1xuICAgIGNvbnN0IHBhcnRpYWxOZ01vZHVsZUxpbmtlclZlcnNpb24xID1cbiAgICAgICAgbmV3IFBhcnRpYWxOZ01vZHVsZUxpbmtlclZlcnNpb24xKGVudmlyb25tZW50Lm9wdGlvbnMubGlua2VySml0TW9kZSk7XG4gICAgY29uc3QgcGFydGlhbFBpcGVMaW5rZXJWZXJzaW9uMSA9IG5ldyBQYXJ0aWFsUGlwZUxpbmtlclZlcnNpb24xKCk7XG5cbiAgICBjb25zdCBsaW5rZXJzID0gbmV3IE1hcDxzdHJpbmcsIExpbmtlclJhbmdlPFRFeHByZXNzaW9uPltdPigpO1xuICAgIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVEaXJlY3RpdmUsIFtcbiAgICAgIHtyYW5nZTogJzAuMC4wLVBMQUNFSE9MREVSJywgbGlua2VyOiBwYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjF9LFxuICAgICAge3JhbmdlOiAnPj0xMS4xLjAtbmV4dC4xJywgbGlua2VyOiBwYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjF9LFxuICAgIF0pO1xuICAgIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVDbGFzc01ldGFkYXRhLCBbXG4gICAgICB7cmFuZ2U6ICcwLjAuMC1QTEFDRUhPTERFUicsIGxpbmtlcjogcGFydGlhbENsYXNzTWV0YWRhdGFMaW5rZXJWZXJzaW9uMX0sXG4gICAgICB7cmFuZ2U6ICc+PTExLjEuMC1uZXh0LjEnLCBsaW5rZXI6IHBhcnRpYWxDbGFzc01ldGFkYXRhTGlua2VyVmVyc2lvbjF9LFxuICAgIF0pO1xuICAgIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVDb21wb25lbnQsIFtcbiAgICAgIHtyYW5nZTogJzAuMC4wLVBMQUNFSE9MREVSJywgbGlua2VyOiBwYXJ0aWFsQ29tcG9uZW50TGlua2VyVmVyc2lvbjF9LFxuICAgICAge3JhbmdlOiAnPj0xMS4xLjAtbmV4dC4xJywgbGlua2VyOiBwYXJ0aWFsQ29tcG9uZW50TGlua2VyVmVyc2lvbjF9LFxuICAgIF0pO1xuICAgIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVGYWN0b3J5LCBbXG4gICAgICB7cmFuZ2U6ICcwLjAuMC1QTEFDRUhPTERFUicsIGxpbmtlcjogcGFydGlhbEZhY3RvcnlMaW5rZXJWZXJzaW9uMX0sXG4gICAgICB7cmFuZ2U6ICc+PTExLjEuMC1uZXh0LjEnLCBsaW5rZXI6IHBhcnRpYWxGYWN0b3J5TGlua2VyVmVyc2lvbjF9LFxuICAgIF0pO1xuICAgIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVJbmplY3RhYmxlLCBbXG4gICAgICB7cmFuZ2U6ICcwLjAuMC1QTEFDRUhPTERFUicsIGxpbmtlcjogcGFydGlhbEluamVjdGFibGVMaW5rZXJWZXJzaW9uMX0sXG4gICAgICB7cmFuZ2U6ICc+PTExLjEuMC1uZXh0LjEnLCBsaW5rZXI6IHBhcnRpYWxJbmplY3RhYmxlTGlua2VyVmVyc2lvbjF9LFxuICAgIF0pO1xuICAgIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVJbmplY3RvciwgW1xuICAgICAge3JhbmdlOiAnMC4wLjAtUExBQ0VIT0xERVInLCBsaW5rZXI6IHBhcnRpYWxJbmplY3RvckxpbmtlclZlcnNpb24xfSxcbiAgICAgIHtyYW5nZTogJz49MTEuMS4wLW5leHQuMScsIGxpbmtlcjogcGFydGlhbEluamVjdG9yTGlua2VyVmVyc2lvbjF9LFxuICAgIF0pO1xuICAgIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVOZ01vZHVsZSwgW1xuICAgICAge3JhbmdlOiAnMC4wLjAtUExBQ0VIT0xERVInLCBsaW5rZXI6IHBhcnRpYWxOZ01vZHVsZUxpbmtlclZlcnNpb24xfSxcbiAgICAgIHtyYW5nZTogJz49MTEuMS4wLW5leHQuMScsIGxpbmtlcjogcGFydGlhbE5nTW9kdWxlTGlua2VyVmVyc2lvbjF9LFxuICAgIF0pO1xuICAgIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVQaXBlLCBbXG4gICAgICB7cmFuZ2U6ICcwLjAuMC1QTEFDRUhPTERFUicsIGxpbmtlcjogcGFydGlhbFBpcGVMaW5rZXJWZXJzaW9uMX0sXG4gICAgICB7cmFuZ2U6ICc+PTExLjEuMC1uZXh0LjEnLCBsaW5rZXI6IHBhcnRpYWxQaXBlTGlua2VyVmVyc2lvbjF9LFxuICAgIF0pO1xuICAgIHJldHVybiBsaW5rZXJzO1xuICB9XG59XG4iXX0=