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
        define("@angular/compiler-cli/src/ngtsc/core/src/host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/entry_point", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/util/src/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var entry_point_1 = require("@angular/compiler-cli/src/ngtsc/entry_point");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var typecheck_1 = require("@angular/compiler-cli/src/ngtsc/typecheck");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    /**
     * Delegates all methods of `ExtendedTsCompilerHost` to a delegate, with the exception of
     * `getSourceFile` and `fileExists` which are implemented in `NgCompilerHost`.
     *
     * If a new method is added to `ts.CompilerHost` which is not delegated, a type error will be
     * generated for this class.
     */
    var DelegatingCompilerHost = /** @class */ (function () {
        function DelegatingCompilerHost(delegate) {
            this.delegate = delegate;
            // Excluded are 'getSourceFile' and 'fileExists', which are actually implemented by NgCompilerHost
            // below.
            this.createHash = this.delegateMethod('createHash');
            this.directoryExists = this.delegateMethod('directoryExists');
            this.fileNameToModuleName = this.delegateMethod('fileNameToModuleName');
            this.getCancellationToken = this.delegateMethod('getCancellationToken');
            this.getCanonicalFileName = this.delegateMethod('getCanonicalFileName');
            this.getCurrentDirectory = this.delegateMethod('getCurrentDirectory');
            this.getDefaultLibFileName = this.delegateMethod('getDefaultLibFileName');
            this.getDefaultLibLocation = this.delegateMethod('getDefaultLibLocation');
            this.getDirectories = this.delegateMethod('getDirectories');
            this.getEnvironmentVariable = this.delegateMethod('getEnvironmentVariable');
            this.getModifiedResourceFiles = this.delegateMethod('getModifiedResourceFiles');
            this.getNewLine = this.delegateMethod('getNewLine');
            this.getParsedCommandLine = this.delegateMethod('getParsedCommandLine');
            this.getSourceFileByPath = this.delegateMethod('getSourceFileByPath');
            this.readDirectory = this.delegateMethod('readDirectory');
            this.readFile = this.delegateMethod('readFile');
            this.readResource = this.delegateMethod('readResource');
            this.realpath = this.delegateMethod('realpath');
            this.resolveModuleNames = this.delegateMethod('resolveModuleNames');
            this.resolveTypeReferenceDirectives = this.delegateMethod('resolveTypeReferenceDirectives');
            this.resourceNameToFileName = this.delegateMethod('resourceNameToFileName');
            this.trace = this.delegateMethod('trace');
            this.useCaseSensitiveFileNames = this.delegateMethod('useCaseSensitiveFileNames');
            this.writeFile = this.delegateMethod('writeFile');
        }
        DelegatingCompilerHost.prototype.delegateMethod = function (name) {
            return this.delegate[name] !== undefined ? this.delegate[name].bind(this.delegate) :
                undefined;
        };
        return DelegatingCompilerHost;
    }());
    exports.DelegatingCompilerHost = DelegatingCompilerHost;
    /**
     * A wrapper around `ts.CompilerHost` (plus any extension methods from `ExtendedTsCompilerHost`).
     *
     * In order for a consumer to include Angular compilation in their TypeScript compiler, the
     * `ts.Program` must be created with a host that adds Angular-specific files (e.g. factories,
     * summaries, the template type-checking file, etc) to the compilation. `NgCompilerHost` is the
     * host implementation which supports this.
     *
     * The interface implementations here ensure that `NgCompilerHost` fully delegates to
     * `ExtendedTsCompilerHost` methods whenever present.
     */
    var NgCompilerHost = /** @class */ (function (_super) {
        tslib_1.__extends(NgCompilerHost, _super);
        function NgCompilerHost(delegate, inputFiles, rootDirs, shims, entryPoint, typeCheckFile, factoryFiles, summaryFiles, factoryTracker, diagnostics) {
            var _this = _super.call(this, delegate) || this;
            _this.shims = shims;
            _this.factoryTracker = null;
            _this.entryPoint = null;
            _this.factoryTracker = factoryTracker;
            _this.entryPoint = entryPoint;
            _this.typeCheckFile = typeCheckFile;
            _this.factoryFiles = factoryFiles;
            _this.summaryFiles = summaryFiles;
            _this.diagnostics = diagnostics;
            _this.inputFiles = inputFiles;
            _this.rootDirs = rootDirs;
            return _this;
        }
        /**
         * Create an `NgCompilerHost` from a delegate host, an array of input filenames, and the full set
         * of TypeScript and Angular compiler options.
         */
        NgCompilerHost.wrap = function (delegate, inputFiles, options) {
            // TODO(alxhub): remove the fallback to allowEmptyCodegenFiles after verifying that the rest of
            // our build tooling is no longer relying on it.
            var allowEmptyCodegenFiles = options.allowEmptyCodegenFiles || false;
            var shouldGenerateFactoryShims = options.generateNgFactoryShims !== undefined ?
                options.generateNgFactoryShims :
                allowEmptyCodegenFiles;
            var shouldGenerateSummaryShims = options.generateNgSummaryShims !== undefined ?
                options.generateNgSummaryShims :
                allowEmptyCodegenFiles;
            var rootFiles = tslib_1.__spread(inputFiles);
            var normalizedInputFiles = inputFiles.map(function (n) { return file_system_1.resolve(n); });
            var generators = [];
            var summaryGenerator = null;
            var summaryFiles;
            if (shouldGenerateSummaryShims) {
                // Summary generation.
                summaryGenerator = shims_1.SummaryGenerator.forRootFiles(normalizedInputFiles);
                generators.push(summaryGenerator);
                summaryFiles = summaryGenerator.getSummaryFileNames();
            }
            else {
                summaryFiles = [];
            }
            var factoryTracker = null;
            var factoryFiles;
            if (shouldGenerateFactoryShims) {
                // Factory generation.
                var factoryGenerator = shims_1.FactoryGenerator.forRootFiles(normalizedInputFiles);
                var factoryFileMap = factoryGenerator.factoryFileMap;
                factoryFiles = Array.from(factoryFileMap.keys());
                rootFiles.push.apply(rootFiles, tslib_1.__spread(factoryFiles));
                generators.push(factoryGenerator);
                factoryTracker = new shims_1.FactoryTracker(factoryGenerator);
            }
            else {
                factoryFiles = [];
            }
            // Done separately to preserve the order of factory files before summary files in rootFiles.
            // TODO(alxhub): validate that this is necessary.
            rootFiles.push.apply(rootFiles, tslib_1.__spread(summaryFiles));
            var rootDirs = typescript_1.getRootDirs(delegate, options);
            var typeCheckFile = typecheck_1.typeCheckFilePath(rootDirs);
            generators.push(new shims_1.TypeCheckShimGenerator(typeCheckFile));
            rootFiles.push(typeCheckFile);
            var diagnostics = [];
            var entryPoint = null;
            if (options.flatModuleOutFile != null && options.flatModuleOutFile !== '') {
                entryPoint = entry_point_1.findFlatIndexEntryPoint(normalizedInputFiles);
                if (entryPoint === null) {
                    // This error message talks specifically about having a single .ts file in "files". However
                    // the actual logic is a bit more permissive. If a single file exists, that will be taken,
                    // otherwise the highest level (shortest path) "index.ts" file will be used as the flat
                    // module entry point instead. If neither of these conditions apply, the error below is
                    // given.
                    //
                    // The user is not informed about the "index.ts" option as this behavior is deprecated -
                    // an explicit entrypoint should always be specified.
                    diagnostics.push({
                        category: ts.DiagnosticCategory.Error,
                        code: diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.CONFIG_FLAT_MODULE_NO_INDEX),
                        file: undefined,
                        start: undefined,
                        length: undefined,
                        messageText: 'Angular compiler option "flatModuleOutFile" requires one and only one .ts file in the "files" field.',
                    });
                }
                else {
                    var flatModuleId = options.flatModuleId || null;
                    var flatModuleOutFile = path_1.normalizeSeparators(options.flatModuleOutFile);
                    var flatIndexGenerator = new entry_point_1.FlatIndexGenerator(entryPoint, flatModuleOutFile, flatModuleId);
                    generators.push(flatIndexGenerator);
                    rootFiles.push(flatIndexGenerator.flatIndexPath);
                }
            }
            return new NgCompilerHost(delegate, rootFiles, rootDirs, generators, entryPoint, typeCheckFile, factoryFiles, summaryFiles, factoryTracker, diagnostics);
        };
        NgCompilerHost.prototype.getSourceFile = function (fileName, languageVersion, onError, shouldCreateNewSourceFile) {
            var _this = this;
            for (var i = 0; i < this.shims.length; i++) {
                var generator = this.shims[i];
                // TypeScript internal paths are guaranteed to be POSIX-like absolute file paths.
                var absoluteFsPath = file_system_1.resolve(fileName);
                if (generator.recognize(absoluteFsPath)) {
                    var readFile = function (originalFile) {
                        return _this.delegate.getSourceFile(originalFile, languageVersion, onError, shouldCreateNewSourceFile) ||
                            null;
                    };
                    return generator.generate(absoluteFsPath, readFile) || undefined;
                }
            }
            return this.delegate.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
        };
        NgCompilerHost.prototype.fileExists = function (fileName) {
            // Consider the file as existing whenever
            //  1) it really does exist in the delegate host, or
            //  2) at least one of the shim generators recognizes it
            // Note that we can pass the file name as branded absolute fs path because TypeScript
            // internally only passes POSIX-like paths.
            return this.delegate.fileExists(fileName) ||
                this.shims.some(function (shim) { return shim.recognize(file_system_1.resolve(fileName)); });
        };
        Object.defineProperty(NgCompilerHost.prototype, "unifiedModulesHost", {
            get: function () {
                return this.fileNameToModuleName !== undefined ? this : null;
            },
            enumerable: true,
            configurable: true
        });
        return NgCompilerHost;
    }(DelegatingCompilerHost));
    exports.NgCompilerHost = NgCompilerHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZS9zcmMvaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsMkVBQXlEO0lBQ3pELDJFQUE4RTtJQUM5RSwyRUFBMEQ7SUFDMUQsK0RBQXNIO0lBQ3RILHVFQUFrRDtJQUNsRCxzRUFBd0Q7SUFDeEQsa0ZBQXNEO0lBa0J0RDs7Ozs7O09BTUc7SUFDSDtRQUVFLGdDQUFzQixRQUFnQztZQUFoQyxhQUFRLEdBQVIsUUFBUSxDQUF3QjtZQVF0RCxrR0FBa0c7WUFDbEcsU0FBUztZQUNULGVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQy9DLG9CQUFlLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3pELHlCQUFvQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUNuRSx5QkFBb0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDbkUseUJBQW9CLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ25FLHdCQUFtQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUNqRSwwQkFBcUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDckUsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ3JFLG1CQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3ZELDJCQUFzQixHQUFHLElBQUksQ0FBQyxjQUFj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b0JBQ3ZDLElBQU0sUUFBUSxHQUFHLFVBQUMsWUFBb0I7d0JBQ3BDLE9BQU8sS0FBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQ3ZCLFlBQVksRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixDQUFDOzRCQUN6RSxJQUFJLENBQUM7b0JBQ1gsQ0FBQyxDQUFDO29CQUVGLE9BQU8sU0FBUyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLElBQUksU0FBUyxDQUFDO2lCQUNsRTthQUNGO1lBRUQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FDOUIsUUFBUSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBRUQsbUNBQVUsR0FBVixVQUFXLFFBQWdCO1lBQ3pCLHlDQUF5QztZQUN6QyxvREFBb0Q7WUFDcEQsd0RBQXdEO1lBQ3hELHFGQUFxRjtZQUNyRiwyQ0FBMkM7WUFDM0MsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQWpDLENBQWlDLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQsc0JBQUksOENBQWtCO2lCQUF0QjtnQkFDRSxPQUFPLElBQUksQ0FBQyxvQkFBb0IsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQTBCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNyRixDQUFDOzs7V0FBQTtRQUNILHFCQUFDO0lBQUQsQ0FBQyxBQXRLRCxDQUFvQyxzQkFBc0IsR0FzS3pEO0lBdEtZLHdDQUFjIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ZsYXRJbmRleEdlbmVyYXRvciwgZmluZEZsYXRJbmRleEVudHJ5UG9pbnR9IGZyb20gJy4uLy4uL2VudHJ5X3BvaW50JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIHJlc29sdmV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RmFjdG9yeUdlbmVyYXRvciwgRmFjdG9yeVRyYWNrZXIsIFNoaW1HZW5lcmF0b3IsIFN1bW1hcnlHZW5lcmF0b3IsIFR5cGVDaGVja1NoaW1HZW5lcmF0b3J9IGZyb20gJy4uLy4uL3NoaW1zJztcbmltcG9ydCB7dHlwZUNoZWNrRmlsZVBhdGh9IGZyb20gJy4uLy4uL3R5cGVjaGVjayc7XG5pbXBvcnQge25vcm1hbGl6ZVNlcGFyYXRvcnN9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3BhdGgnO1xuaW1wb3J0IHtnZXRSb290RGlyc30gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5pbXBvcnQge0V4dGVuZGVkVHNDb21waWxlckhvc3QsIE5nQ29tcGlsZXJPcHRpb25zLCBVbmlmaWVkTW9kdWxlc0hvc3R9IGZyb20gJy4uL2FwaSc7XG5cblxuLy8gQSBwZXJzaXN0ZW50IHNvdXJjZSBvZiBidWdzIGluIENvbXBpbGVySG9zdCBkZWxlZ2F0aW9uIGhhcyBiZWVuIHRoZSBhZGRpdGlvbiBieSBUUyBvZiBuZXcsXG4vLyBvcHRpb25hbCBtZXRob2RzIG9uIHRzLkNvbXBpbGVySG9zdC4gU2luY2UgdGhlc2UgbWV0aG9kcyBhcmUgb3B0aW9uYWwsIGl0J3Mgbm90IGEgdHlwZSBlcnJvciB0aGF0XG4vLyB0aGUgZGVsZWdhdGluZyBob3N0IGRvZXNuJ3QgaW1wbGVtZW50IG9yIGRlbGVnYXRlIHRoZW0uIFRoaXMgY2F1c2VzIHN1YnRsZSBydW50aW1lIGZhaWx1cmVzLiBOb1xuLy8gbW9yZS4gVGhpcyBpbmZyYXN0cnVjdHVyZSBlbnN1cmVzIHRoYXQgZmFpbGluZyB0byBkZWxlZ2F0ZSBhIG1ldGhvZCBpcyBhIGNvbXBpbGUtdGltZSBlcnJvci5cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBgRXh0ZW5kZWRUc0NvbXBpbGVySG9zdGAgaW50ZXJmYWNlLCB3aXRoIGEgdHJhbnNmb3JtYXRpb24gYXBwbGllZCB0aGF0IHR1cm5zIGFsbFxuICogbWV0aG9kcyAoZXZlbiBvcHRpb25hbCBvbmVzKSBpbnRvIHJlcXVpcmVkIGZpZWxkcyAod2hpY2ggbWF5IGJlIGB1bmRlZmluZWRgLCBpZiB0aGUgbWV0aG9kIHdhc1xuICogb3B0aW9uYWwpLlxuICovXG5leHBvcnQgdHlwZSBSZXF1aXJlZENvbXBpbGVySG9zdERlbGVnYXRpb25zID0ge1xuICBbTSBpbiBrZXlvZiBSZXF1aXJlZDxFeHRlbmRlZFRzQ29tcGlsZXJIb3N0Pl06IEV4dGVuZGVkVHNDb21waWxlckhvc3RbTV07XG59O1xuXG4vKipcbiAqIERlbGVnYXRlcyBhbGwgbWV0aG9kcyBvZiBgRXh0ZW5kZWRUc0NvbXBpbGVySG9zdGAgdG8gYSBkZWxlZ2F0ZSwgd2l0aCB0aGUgZXhjZXB0aW9uIG9mXG4gKiBgZ2V0U291cmNlRmlsZWAgYW5kIGBmaWxlRXhpc3RzYCB3aGljaCBhcmUgaW1wbGVtZW50ZWQgaW4gYE5nQ29tcGlsZXJIb3N0YC5cbiAqXG4gKiBJZiBhIG5ldyBtZXRob2QgaXMgYWRkZWQgdG8gYHRzLkNvbXBpbGVySG9zdGAgd2hpY2ggaXMgbm90IGRlbGVnYXRlZCwgYSB0eXBlIGVycm9yIHdpbGwgYmVcbiAqIGdlbmVyYXRlZCBmb3IgdGhpcyBjbGFzcy5cbiAqL1xuZXhwb3J0IGNsYXNzIERlbGVnYXRpbmdDb21waWxlckhvc3QgaW1wbGVtZW50c1xuICAgIE9taXQ8UmVxdWlyZWRDb21waWxlckhvc3REZWxlZ2F0aW9ucywgJ2dldFNvdXJjZUZpbGUnfCdmaWxlRXhpc3RzJz4ge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZGVsZWdhdGU6IEV4dGVuZGVkVHNDb21waWxlckhvc3QpIHt9XG5cbiAgcHJpdmF0ZSBkZWxlZ2F0ZU1ldGhvZDxNIGV4dGVuZHMga2V5b2YgRXh0ZW5kZWRUc0NvbXBpbGVySG9zdD4obmFtZTogTSk6XG4gICAgICBFeHRlbmRlZFRzQ29tcGlsZXJIb3N0W01dIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZVtuYW1lXSAhPT0gdW5kZWZpbmVkID8gKHRoaXMuZGVsZWdhdGVbbmFtZV0gYXMgYW55KS5iaW5kKHRoaXMuZGVsZWdhdGUpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gRXhjbHVkZWQgYXJlICdnZXRTb3VyY2VGaWxlJyBhbmQgJ2ZpbGVFeGlzdHMnLCB3aGljaCBhcmUgYWN0dWFsbHkgaW1wbGVtZW50ZWQgYnkgTmdDb21waWxlckhvc3RcbiAgLy8gYmVsb3cuXG4gIGNyZWF0ZUhhc2ggPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdjcmVhdGVIYXNoJyk7XG4gIGRpcmVjdG9yeUV4aXN0cyA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2RpcmVjdG9yeUV4aXN0cycpO1xuICBmaWxlTmFtZVRvTW9kdWxlTmFtZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2ZpbGVOYW1lVG9Nb2R1bGVOYW1lJyk7XG4gIGdldENhbmNlbGxhdGlvblRva2VuID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0Q2FuY2VsbGF0aW9uVG9rZW4nKTtcbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWUgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXRDYW5vbmljYWxGaWxlTmFtZScpO1xuICBnZXRDdXJyZW50RGlyZWN0b3J5ID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0Q3VycmVudERpcmVjdG9yeScpO1xuICBnZXREZWZhdWx0TGliRmlsZU5hbWUgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXREZWZhdWx0TGliRmlsZU5hbWUnKTtcbiAgZ2V0RGVmYXVsdExpYkxvY2F0aW9uID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0RGVmYXVsdExpYkxvY2F0aW9uJyk7XG4gIGdldERpcmVjdG9yaWVzID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0RGlyZWN0b3JpZXMnKTtcbiAgZ2V0RW52aXJvbm1lbnRWYXJpYWJsZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2dldEVudmlyb25tZW50VmFyaWFibGUnKTtcbiAgZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzJyk7XG4gIGdldE5ld0xpbmUgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXROZXdMaW5lJyk7XG4gIGdldFBhcnNlZENvbW1hbmRMaW5lID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0UGFyc2VkQ29tbWFuZExpbmUnKTtcbiAgZ2V0U291cmNlRmlsZUJ5UGF0aCA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2dldFNvdXJjZUZpbGVCeVBhdGgnKTtcbiAgcmVhZERpcmVjdG9yeSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ3JlYWREaXJlY3RvcnknKTtcbiAgcmVhZEZpbGUgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdyZWFkRmlsZScpO1xuICByZWFkUmVzb3VyY2UgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdyZWFkUmVzb3VyY2UnKTtcbiAgcmVhbHBhdGggPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdyZWFscGF0aCcpO1xuICByZXNvbHZlTW9kdWxlTmFtZXMgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdyZXNvbHZlTW9kdWxlTmFtZXMnKTtcbiAgcmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgncmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzJyk7XG4gIHJlc291cmNlTmFtZVRvRmlsZU5hbWUgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdyZXNvdXJjZU5hbWVUb0ZpbGVOYW1lJyk7XG4gIHRyYWNlID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgndHJhY2UnKTtcbiAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcyA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ3VzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMnKTtcbiAgd3JpdGVGaWxlID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnd3JpdGVGaWxlJyk7XG59XG5cbi8qKlxuICogQSB3cmFwcGVyIGFyb3VuZCBgdHMuQ29tcGlsZXJIb3N0YCAocGx1cyBhbnkgZXh0ZW5zaW9uIG1ldGhvZHMgZnJvbSBgRXh0ZW5kZWRUc0NvbXBpbGVySG9zdGApLlxuICpcbiAqIEluIG9yZGVyIGZvciBhIGNvbnN1bWVyIHRvIGluY2x1ZGUgQW5ndWxhciBjb21waWxhdGlvbiBpbiB0aGVpciBUeXBlU2NyaXB0IGNvbXBpbGVyLCB0aGVcbiAqIGB0cy5Qcm9ncmFtYCBtdXN0IGJlIGNyZWF0ZWQgd2l0aCBhIGhvc3QgdGhhdCBhZGRzIEFuZ3VsYXItc3BlY2lmaWMgZmlsZXMgKGUuZy4gZmFjdG9yaWVzLFxuICogc3VtbWFyaWVzLCB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBmaWxlLCBldGMpIHRvIHRoZSBjb21waWxhdGlvbi4gYE5nQ29tcGlsZXJIb3N0YCBpcyB0aGVcbiAqIGhvc3QgaW1wbGVtZW50YXRpb24gd2hpY2ggc3VwcG9ydHMgdGhpcy5cbiAqXG4gKiBUaGUgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9ucyBoZXJlIGVuc3VyZSB0aGF0IGBOZ0NvbXBpbGVySG9zdGAgZnVsbHkgZGVsZWdhdGVzIHRvXG4gKiBgRXh0ZW5kZWRUc0NvbXBpbGVySG9zdGAgbWV0aG9kcyB3aGVuZXZlciBwcmVzZW50LlxuICovXG5leHBvcnQgY2xhc3MgTmdDb21waWxlckhvc3QgZXh0ZW5kcyBEZWxlZ2F0aW5nQ29tcGlsZXJIb3N0IGltcGxlbWVudHNcbiAgICBSZXF1aXJlZENvbXBpbGVySG9zdERlbGVnYXRpb25zLFxuICAgIEV4dGVuZGVkVHNDb21waWxlckhvc3Qge1xuICByZWFkb25seSBmYWN0b3J5VHJhY2tlcjogRmFjdG9yeVRyYWNrZXJ8bnVsbCA9IG51bGw7XG4gIHJlYWRvbmx5IGVudHJ5UG9pbnQ6IEFic29sdXRlRnNQYXRofG51bGwgPSBudWxsO1xuICByZWFkb25seSBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdO1xuXG4gIHJlYWRvbmx5IGlucHV0RmlsZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbiAgcmVhZG9ubHkgcm9vdERpcnM6IFJlYWRvbmx5QXJyYXk8QWJzb2x1dGVGc1BhdGg+O1xuICByZWFkb25seSB0eXBlQ2hlY2tGaWxlOiBBYnNvbHV0ZUZzUGF0aDtcbiAgcmVhZG9ubHkgZmFjdG9yeUZpbGVzOiBBYnNvbHV0ZUZzUGF0aFtdO1xuICByZWFkb25seSBzdW1tYXJ5RmlsZXM6IEFic29sdXRlRnNQYXRoW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBkZWxlZ2F0ZTogRXh0ZW5kZWRUc0NvbXBpbGVySG9zdCwgaW5wdXRGaWxlczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICAgICAgcm9vdERpcnM6IFJlYWRvbmx5QXJyYXk8QWJzb2x1dGVGc1BhdGg+LCBwcml2YXRlIHNoaW1zOiBTaGltR2VuZXJhdG9yW10sXG4gICAgICBlbnRyeVBvaW50OiBBYnNvbHV0ZUZzUGF0aHxudWxsLCB0eXBlQ2hlY2tGaWxlOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIGZhY3RvcnlGaWxlczogQWJzb2x1dGVGc1BhdGhbXSwgc3VtbWFyeUZpbGVzOiBBYnNvbHV0ZUZzUGF0aFtdLFxuICAgICAgZmFjdG9yeVRyYWNrZXI6IEZhY3RvcnlUcmFja2VyfG51bGwsIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10pIHtcbiAgICBzdXBlcihkZWxlZ2F0ZSk7XG5cbiAgICB0aGlzLmZhY3RvcnlUcmFja2VyID0gZmFjdG9yeVRyYWNrZXI7XG4gICAgdGhpcy5lbnRyeVBvaW50ID0gZW50cnlQb2ludDtcbiAgICB0aGlzLnR5cGVDaGVja0ZpbGUgPSB0eXBlQ2hlY2tGaWxlO1xuICAgIHRoaXMuZmFjdG9yeUZpbGVzID0gZmFjdG9yeUZpbGVzO1xuICAgIHRoaXMuc3VtbWFyeUZpbGVzID0gc3VtbWFyeUZpbGVzO1xuICAgIHRoaXMuZGlhZ25vc3RpY3MgPSBkaWFnbm9zdGljcztcbiAgICB0aGlzLmlucHV0RmlsZXMgPSBpbnB1dEZpbGVzO1xuICAgIHRoaXMucm9vdERpcnMgPSByb290RGlycztcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gYE5nQ29tcGlsZXJIb3N0YCBmcm9tIGEgZGVsZWdhdGUgaG9zdCwgYW4gYXJyYXkgb2YgaW5wdXQgZmlsZW5hbWVzLCBhbmQgdGhlIGZ1bGwgc2V0XG4gICAqIG9mIFR5cGVTY3JpcHQgYW5kIEFuZ3VsYXIgY29tcGlsZXIgb3B0aW9ucy5cbiAgICovXG4gIHN0YXRpYyB3cmFwKFxuICAgICAgZGVsZWdhdGU6IHRzLkNvbXBpbGVySG9zdCwgaW5wdXRGaWxlczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICAgICAgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMpOiBOZ0NvbXBpbGVySG9zdCB7XG4gICAgLy8gVE9ETyhhbHhodWIpOiByZW1vdmUgdGhlIGZhbGxiYWNrIHRvIGFsbG93RW1wdHlDb2RlZ2VuRmlsZXMgYWZ0ZXIgdmVyaWZ5aW5nIHRoYXQgdGhlIHJlc3Qgb2ZcbiAgICAvLyBvdXIgYnVpbGQgdG9vbGluZyBpcyBubyBsb25nZXIgcmVseWluZyBvbiBpdC5cbiAgICBjb25zdCBhbGxvd0VtcHR5Q29kZWdlbkZpbGVzID0gb3B0aW9ucy5hbGxvd0VtcHR5Q29kZWdlbkZpbGVzIHx8IGZhbHNlO1xuICAgIGNvbnN0IHNob3VsZEdlbmVyYXRlRmFjdG9yeVNoaW1zID0gb3B0aW9ucy5nZW5lcmF0ZU5nRmFjdG9yeVNoaW1zICE9PSB1bmRlZmluZWQgP1xuICAgICAgICBvcHRpb25zLmdlbmVyYXRlTmdGYWN0b3J5U2hpbXMgOlxuICAgICAgICBhbGxvd0VtcHR5Q29kZWdlbkZpbGVzO1xuXG4gICAgY29uc3Qgc2hvdWxkR2VuZXJhdGVTdW1tYXJ5U2hpbXMgPSBvcHRpb25zLmdlbmVyYXRlTmdTdW1tYXJ5U2hpbXMgIT09IHVuZGVmaW5lZCA/XG4gICAgICAgIG9wdGlvbnMuZ2VuZXJhdGVOZ1N1bW1hcnlTaGltcyA6XG4gICAgICAgIGFsbG93RW1wdHlDb2RlZ2VuRmlsZXM7XG5cbiAgICBsZXQgcm9vdEZpbGVzID0gWy4uLmlucHV0RmlsZXNdO1xuICAgIGxldCBub3JtYWxpemVkSW5wdXRGaWxlcyA9IGlucHV0RmlsZXMubWFwKG4gPT4gcmVzb2x2ZShuKSk7XG5cbiAgICBjb25zdCBnZW5lcmF0b3JzOiBTaGltR2VuZXJhdG9yW10gPSBbXTtcbiAgICBsZXQgc3VtbWFyeUdlbmVyYXRvcjogU3VtbWFyeUdlbmVyYXRvcnxudWxsID0gbnVsbDtcbiAgICBsZXQgc3VtbWFyeUZpbGVzOiBBYnNvbHV0ZUZzUGF0aFtdO1xuXG4gICAgaWYgKHNob3VsZEdlbmVyYXRlU3VtbWFyeVNoaW1zKSB7XG4gICAgICAvLyBTdW1tYXJ5IGdlbmVyYXRpb24uXG4gICAgICBzdW1tYXJ5R2VuZXJhdG9yID0gU3VtbWFyeUdlbmVyYXRvci5mb3JSb290RmlsZXMobm9ybWFsaXplZElucHV0RmlsZXMpO1xuICAgICAgZ2VuZXJhdG9ycy5wdXNoKHN1bW1hcnlHZW5lcmF0b3IpO1xuICAgICAgc3VtbWFyeUZpbGVzID0gc3VtbWFyeUdlbmVyYXRvci5nZXRTdW1tYXJ5RmlsZU5hbWVzKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1bW1hcnlGaWxlcyA9IFtdO1xuICAgIH1cblxuICAgIGxldCBmYWN0b3J5VHJhY2tlcjogRmFjdG9yeVRyYWNrZXJ8bnVsbCA9IG51bGw7XG4gICAgbGV0IGZhY3RvcnlGaWxlczogQWJzb2x1dGVGc1BhdGhbXTtcbiAgICBpZiAoc2hvdWxkR2VuZXJhdGVGYWN0b3J5U2hpbXMpIHtcbiAgICAgIC8vIEZhY3RvcnkgZ2VuZXJhdGlvbi5cbiAgICAgIGNvbnN0IGZhY3RvcnlHZW5lcmF0b3IgPSBGYWN0b3J5R2VuZXJhdG9yLmZvclJvb3RGaWxlcyhub3JtYWxpemVkSW5wdXRGaWxlcyk7XG4gICAgICBjb25zdCBmYWN0b3J5RmlsZU1hcCA9IGZhY3RvcnlHZW5lcmF0b3IuZmFjdG9yeUZpbGVNYXA7XG5cbiAgICAgIGZhY3RvcnlGaWxlcyA9IEFycmF5LmZyb20oZmFjdG9yeUZpbGVNYXAua2V5cygpKTtcbiAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLmZhY3RvcnlGaWxlcyk7XG4gICAgICBnZW5lcmF0b3JzLnB1c2goZmFjdG9yeUdlbmVyYXRvcik7XG5cbiAgICAgIGZhY3RvcnlUcmFja2VyID0gbmV3IEZhY3RvcnlUcmFja2VyKGZhY3RvcnlHZW5lcmF0b3IpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmYWN0b3J5RmlsZXMgPSBbXTtcbiAgICB9XG5cbiAgICAvLyBEb25lIHNlcGFyYXRlbHkgdG8gcHJlc2VydmUgdGhlIG9yZGVyIG9mIGZhY3RvcnkgZmlsZXMgYmVmb3JlIHN1bW1hcnkgZmlsZXMgaW4gcm9vdEZpbGVzLlxuICAgIC8vIFRPRE8oYWx4aHViKTogdmFsaWRhdGUgdGhhdCB0aGlzIGlzIG5lY2Vzc2FyeS5cbiAgICByb290RmlsZXMucHVzaCguLi5zdW1tYXJ5RmlsZXMpO1xuXG5cbiAgICBjb25zdCByb290RGlycyA9IGdldFJvb3REaXJzKGRlbGVnYXRlLCBvcHRpb25zIGFzIHRzLkNvbXBpbGVyT3B0aW9ucyk7XG5cbiAgICBjb25zdCB0eXBlQ2hlY2tGaWxlID0gdHlwZUNoZWNrRmlsZVBhdGgocm9vdERpcnMpO1xuICAgIGdlbmVyYXRvcnMucHVzaChuZXcgVHlwZUNoZWNrU2hpbUdlbmVyYXRvcih0eXBlQ2hlY2tGaWxlKSk7XG4gICAgcm9vdEZpbGVzLnB1c2godHlwZUNoZWNrRmlsZSk7XG5cbiAgICBsZXQgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgbGV0IGVudHJ5UG9pbnQ6IEFic29sdXRlRnNQYXRofG51bGwgPSBudWxsO1xuICAgIGlmIChvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlICE9IG51bGwgJiYgb3B0aW9ucy5mbGF0TW9kdWxlT3V0RmlsZSAhPT0gJycpIHtcbiAgICAgIGVudHJ5UG9pbnQgPSBmaW5kRmxhdEluZGV4RW50cnlQb2ludChub3JtYWxpemVkSW5wdXRGaWxlcyk7XG4gICAgICBpZiAoZW50cnlQb2ludCA9PT0gbnVsbCkge1xuICAgICAgICAvLyBUaGlzIGVycm9yIG1lc3NhZ2UgdGFsa3Mgc3BlY2lmaWNhbGx5IGFib3V0IGhhdmluZyBhIHNpbmdsZSAudHMgZmlsZSBpbiBcImZpbGVzXCIuIEhvd2V2ZXJcbiAgICAgICAgLy8gdGhlIGFjdHVhbCBsb2dpYyBpcyBhIGJpdCBtb3JlIHBlcm1pc3NpdmUuIElmIGEgc2luZ2xlIGZpbGUgZXhpc3RzLCB0aGF0IHdpbGwgYmUgdGFrZW4sXG4gICAgICAgIC8vIG90aGVyd2lzZSB0aGUgaGlnaGVzdCBsZXZlbCAoc2hvcnRlc3QgcGF0aCkgXCJpbmRleC50c1wiIGZpbGUgd2lsbCBiZSB1c2VkIGFzIHRoZSBmbGF0XG4gICAgICAgIC8vIG1vZHVsZSBlbnRyeSBwb2ludCBpbnN0ZWFkLiBJZiBuZWl0aGVyIG9mIHRoZXNlIGNvbmRpdGlvbnMgYXBwbHksIHRoZSBlcnJvciBiZWxvdyBpc1xuICAgICAgICAvLyBnaXZlbi5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVGhlIHVzZXIgaXMgbm90IGluZm9ybWVkIGFib3V0IHRoZSBcImluZGV4LnRzXCIgb3B0aW9uIGFzIHRoaXMgYmVoYXZpb3IgaXMgZGVwcmVjYXRlZCAtXG4gICAgICAgIC8vIGFuIGV4cGxpY2l0IGVudHJ5cG9pbnQgc2hvdWxkIGFsd2F5cyBiZSBzcGVjaWZpZWQuXG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgY29kZTogbmdFcnJvckNvZGUoRXJyb3JDb2RlLkNPTkZJR19GTEFUX01PRFVMRV9OT19JTkRFWCksXG4gICAgICAgICAgZmlsZTogdW5kZWZpbmVkLFxuICAgICAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgICAgICdBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbiBcImZsYXRNb2R1bGVPdXRGaWxlXCIgcmVxdWlyZXMgb25lIGFuZCBvbmx5IG9uZSAudHMgZmlsZSBpbiB0aGUgXCJmaWxlc1wiIGZpZWxkLicsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZmxhdE1vZHVsZUlkID0gb3B0aW9ucy5mbGF0TW9kdWxlSWQgfHwgbnVsbDtcbiAgICAgICAgY29uc3QgZmxhdE1vZHVsZU91dEZpbGUgPSBub3JtYWxpemVTZXBhcmF0b3JzKG9wdGlvbnMuZmxhdE1vZHVsZU91dEZpbGUpO1xuICAgICAgICBjb25zdCBmbGF0SW5kZXhHZW5lcmF0b3IgPVxuICAgICAgICAgICAgbmV3IEZsYXRJbmRleEdlbmVyYXRvcihlbnRyeVBvaW50LCBmbGF0TW9kdWxlT3V0RmlsZSwgZmxhdE1vZHVsZUlkKTtcbiAgICAgICAgZ2VuZXJhdG9ycy5wdXNoKGZsYXRJbmRleEdlbmVyYXRvcik7XG4gICAgICAgIHJvb3RGaWxlcy5wdXNoKGZsYXRJbmRleEdlbmVyYXRvci5mbGF0SW5kZXhQYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IE5nQ29tcGlsZXJIb3N0KFxuICAgICAgICBkZWxlZ2F0ZSwgcm9vdEZpbGVzLCByb290RGlycywgZ2VuZXJhdG9ycywgZW50cnlQb2ludCwgdHlwZUNoZWNrRmlsZSwgZmFjdG9yeUZpbGVzLFxuICAgICAgICBzdW1tYXJ5RmlsZXMsIGZhY3RvcnlUcmFja2VyLCBkaWFnbm9zdGljcyk7XG4gIH1cblxuICBnZXRTb3VyY2VGaWxlKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQsXG4gICAgICBvbkVycm9yPzogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCxcbiAgICAgIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGU/OiBib29sZWFufHVuZGVmaW5lZCk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2hpbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGdlbmVyYXRvciA9IHRoaXMuc2hpbXNbaV07XG4gICAgICAvLyBUeXBlU2NyaXB0IGludGVybmFsIHBhdGhzIGFyZSBndWFyYW50ZWVkIHRvIGJlIFBPU0lYLWxpa2UgYWJzb2x1dGUgZmlsZSBwYXRocy5cbiAgICAgIGNvbnN0IGFic29sdXRlRnNQYXRoID0gcmVzb2x2ZShmaWxlTmFtZSk7XG4gICAgICBpZiAoZ2VuZXJhdG9yLnJlY29nbml6ZShhYnNvbHV0ZUZzUGF0aCkpIHtcbiAgICAgICAgY29uc3QgcmVhZEZpbGUgPSAob3JpZ2luYWxGaWxlOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXRTb3VyY2VGaWxlKFxuICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxGaWxlLCBsYW5ndWFnZVZlcnNpb24sIG9uRXJyb3IsIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGUpIHx8XG4gICAgICAgICAgICAgIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGdlbmVyYXRvci5nZW5lcmF0ZShhYnNvbHV0ZUZzUGF0aCwgcmVhZEZpbGUpIHx8IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXRTb3VyY2VGaWxlKFxuICAgICAgICBmaWxlTmFtZSwgbGFuZ3VhZ2VWZXJzaW9uLCBvbkVycm9yLCBzaG91bGRDcmVhdGVOZXdTb3VyY2VGaWxlKTtcbiAgfVxuXG4gIGZpbGVFeGlzdHMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIENvbnNpZGVyIHRoZSBmaWxlIGFzIGV4aXN0aW5nIHdoZW5ldmVyXG4gICAgLy8gIDEpIGl0IHJlYWxseSBkb2VzIGV4aXN0IGluIHRoZSBkZWxlZ2F0ZSBob3N0LCBvclxuICAgIC8vICAyKSBhdCBsZWFzdCBvbmUgb2YgdGhlIHNoaW0gZ2VuZXJhdG9ycyByZWNvZ25pemVzIGl0XG4gICAgLy8gTm90ZSB0aGF0IHdlIGNhbiBwYXNzIHRoZSBmaWxlIG5hbWUgYXMgYnJhbmRlZCBhYnNvbHV0ZSBmcyBwYXRoIGJlY2F1c2UgVHlwZVNjcmlwdFxuICAgIC8vIGludGVybmFsbHkgb25seSBwYXNzZXMgUE9TSVgtbGlrZSBwYXRocy5cbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5maWxlRXhpc3RzKGZpbGVOYW1lKSB8fFxuICAgICAgICB0aGlzLnNoaW1zLnNvbWUoc2hpbSA9PiBzaGltLnJlY29nbml6ZShyZXNvbHZlKGZpbGVOYW1lKSkpO1xuICB9XG5cbiAgZ2V0IHVuaWZpZWRNb2R1bGVzSG9zdCgpOiBVbmlmaWVkTW9kdWxlc0hvc3R8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZmlsZU5hbWVUb01vZHVsZU5hbWUgIT09IHVuZGVmaW5lZCA/IHRoaXMgYXMgVW5pZmllZE1vZHVsZXNIb3N0IDogbnVsbDtcbiAgfVxufVxuIl19