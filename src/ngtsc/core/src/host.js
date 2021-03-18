/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
    exports.NgCompilerHost = exports.DelegatingCompilerHost = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var entry_point_1 = require("@angular/compiler-cli/src/ngtsc/entry_point");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var typecheck_1 = require("@angular/compiler-cli/src/ngtsc/typecheck");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    // A persistent source of bugs in CompilerHost delegation has been the addition by TS of new,
    // optional methods on ts.CompilerHost. Since these methods are optional, it's not a type error that
    // the delegating host doesn't implement or delegate them. This causes subtle runtime failures. No
    // more. This infrastructure ensures that failing to delegate a method is a compile-time error.
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
        function NgCompilerHost(delegate, inputFiles, rootDirs, shimAdapter, shimTagger, entryPoint, factoryTracker, diagnostics) {
            var _this = _super.call(this, delegate) || this;
            _this.shimAdapter = shimAdapter;
            _this.shimTagger = shimTagger;
            _this.factoryTracker = null;
            _this.entryPoint = null;
            _this.factoryTracker = factoryTracker;
            _this.entryPoint = entryPoint;
            _this.constructionDiagnostics = diagnostics;
            _this.inputFiles = tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(inputFiles)), tslib_1.__read(shimAdapter.extraInputFiles));
            _this.rootDirs = rootDirs;
            if (_this.resolveModuleNames === undefined) {
                // In order to reuse the module resolution cache during the creation of the type-check
                // program, we'll need to provide `resolveModuleNames` if the delegate did not provide one.
                _this.resolveModuleNames = _this.createCachedResolveModuleNamesFunction();
            }
            return _this;
        }
        Object.defineProperty(NgCompilerHost.prototype, "ignoreForEmit", {
            /**
             * Retrieves a set of `ts.SourceFile`s which should not be emitted as JS files.
             *
             * Available after this host is used to create a `ts.Program` (which causes all the files in the
             * program to be enumerated).
             */
            get: function () {
                return this.shimAdapter.ignoreForEmit;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NgCompilerHost.prototype, "shimExtensionPrefixes", {
            /**
             * Retrieve the array of shim extension prefixes for which shims were created for each original
             * file.
             */
            get: function () {
                return this.shimAdapter.extensionPrefixes;
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Performs cleanup that needs to happen after a `ts.Program` has been created using this host.
         */
        NgCompilerHost.prototype.postProgramCreationCleanup = function () {
            this.shimTagger.finalize();
        };
        /**
         * Create an `NgCompilerHost` from a delegate host, an array of input filenames, and the full set
         * of TypeScript and Angular compiler options.
         */
        NgCompilerHost.wrap = function (delegate, inputFiles, options, oldProgram) {
            var e_1, _a;
            // TODO(alxhub): remove the fallback to allowEmptyCodegenFiles after verifying that the rest of
            // our build tooling is no longer relying on it.
            var allowEmptyCodegenFiles = options.allowEmptyCodegenFiles || false;
            var shouldGenerateFactoryShims = options.generateNgFactoryShims !== undefined ?
                options.generateNgFactoryShims :
                allowEmptyCodegenFiles;
            var shouldGenerateSummaryShims = options.generateNgSummaryShims !== undefined ?
                options.generateNgSummaryShims :
                allowEmptyCodegenFiles;
            var topLevelShimGenerators = [];
            var perFileShimGenerators = [];
            if (shouldGenerateSummaryShims) {
                // Summary generation.
                perFileShimGenerators.push(new shims_1.SummaryGenerator());
            }
            var factoryTracker = null;
            if (shouldGenerateFactoryShims) {
                var factoryGenerator = new shims_1.FactoryGenerator();
                perFileShimGenerators.push(factoryGenerator);
                factoryTracker = factoryGenerator;
            }
            var rootDirs = typescript_1.getRootDirs(delegate, options);
            perFileShimGenerators.push(new typecheck_1.TypeCheckShimGenerator());
            var diagnostics = [];
            var normalizedTsInputFiles = [];
            try {
                for (var inputFiles_1 = tslib_1.__values(inputFiles), inputFiles_1_1 = inputFiles_1.next(); !inputFiles_1_1.done; inputFiles_1_1 = inputFiles_1.next()) {
                    var inputFile = inputFiles_1_1.value;
                    if (!typescript_1.isNonDeclarationTsPath(inputFile)) {
                        continue;
                    }
                    normalizedTsInputFiles.push(file_system_1.resolve(inputFile));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (inputFiles_1_1 && !inputFiles_1_1.done && (_a = inputFiles_1.return)) _a.call(inputFiles_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var entryPoint = null;
            if (options.flatModuleOutFile != null && options.flatModuleOutFile !== '') {
                entryPoint = entry_point_1.findFlatIndexEntryPoint(normalizedTsInputFiles);
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
                    topLevelShimGenerators.push(flatIndexGenerator);
                }
            }
            var shimAdapter = new shims_1.ShimAdapter(delegate, normalizedTsInputFiles, topLevelShimGenerators, perFileShimGenerators, oldProgram);
            var shimTagger = new shims_1.ShimReferenceTagger(perFileShimGenerators.map(function (gen) { return gen.extensionPrefix; }));
            return new NgCompilerHost(delegate, inputFiles, rootDirs, shimAdapter, shimTagger, entryPoint, factoryTracker, diagnostics);
        };
        /**
         * Check whether the given `ts.SourceFile` is a shim file.
         *
         * If this returns false, the file is user-provided.
         */
        NgCompilerHost.prototype.isShim = function (sf) {
            return shims_1.isShim(sf);
        };
        NgCompilerHost.prototype.getSourceFile = function (fileName, languageVersion, onError, shouldCreateNewSourceFile) {
            // Is this a previously known shim?
            var shimSf = this.shimAdapter.maybeGenerate(file_system_1.resolve(fileName));
            if (shimSf !== null) {
                // Yes, so return it.
                return shimSf;
            }
            // No, so it's a file which might need shims (or a file which doesn't exist).
            var sf = this.delegate.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
            if (sf === undefined) {
                return undefined;
            }
            this.shimTagger.tag(sf);
            return sf;
        };
        NgCompilerHost.prototype.fileExists = function (fileName) {
            // Consider the file as existing whenever
            //  1) it really does exist in the delegate host, or
            //  2) at least one of the shim generators recognizes it
            // Note that we can pass the file name as branded absolute fs path because TypeScript
            // internally only passes POSIX-like paths.
            //
            // Also note that the `maybeGenerate` check below checks for both `null` and `undefined`.
            return this.delegate.fileExists(fileName) ||
                this.shimAdapter.maybeGenerate(file_system_1.resolve(fileName)) != null;
        };
        Object.defineProperty(NgCompilerHost.prototype, "unifiedModulesHost", {
            get: function () {
                return this.fileNameToModuleName !== undefined ? this : null;
            },
            enumerable: false,
            configurable: true
        });
        NgCompilerHost.prototype.createCachedResolveModuleNamesFunction = function () {
            var _this = this;
            var moduleResolutionCache = ts.createModuleResolutionCache(this.getCurrentDirectory(), this.getCanonicalFileName.bind(this));
            return function (moduleNames, containingFile, reusedNames, redirectedReference, options) {
                return moduleNames.map(function (moduleName) {
                    var module = ts.resolveModuleName(moduleName, containingFile, options, _this, moduleResolutionCache, redirectedReference);
                    return module.resolvedModule;
                });
            };
        };
        return NgCompilerHost;
    }(DelegatingCompilerHost));
    exports.NgCompilerHost = NgCompilerHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZS9zcmMvaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBRWpDLDJFQUF5RDtJQUN6RCwyRUFBOEU7SUFDOUUsMkVBQTBEO0lBQzFELCtEQUF5RztJQUV6Ryx1RUFBdUQ7SUFDdkQsc0VBQXdEO0lBQ3hELGtGQUFtRztJQUduRyw2RkFBNkY7SUFDN0Ysb0dBQW9HO0lBQ3BHLGtHQUFrRztJQUNsRywrRkFBK0Y7SUFFL0Y7Ozs7OztPQU1HO0lBQ0g7UUFFRSxnQ0FBc0IsUUFBZ0M7WUFBaEMsYUFBUSxHQUFSLFFBQVEsQ0FBd0I7WUFRdEQsa0dBQWtHO1lBQ2xHLFNBQVM7WUFDVCxlQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMvQyxvQkFBZSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUN6RCx5QkFBb0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDbkUseUJBQW9CLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ25FLHlCQUFvQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUNuRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDakUsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ3JFLDBCQUFxQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUNyRSxtQkFBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUN2RCwyQkFBc0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFDdkUsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQzNFLGVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQy9DLHlCQUFvQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUNuRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDakUsa0JBQWEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3JELGFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzNDLGlCQUFZLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNuRCxhQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMzQyx1QkFBa0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDL0QsbUNBQThCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1lBQ3ZGLDJCQUFzQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUN2RSxVQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyQyw4QkFBeUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFDN0UsY0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUM7UUFqQ1ksQ0FBQztRQUVsRCwrQ0FBYyxHQUF0QixVQUErRCxJQUFPO1lBRXBFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNsRCxTQUFTLENBQUM7UUFDdkQsQ0FBQztRQTRCSCw2QkFBQztJQUFELENBQUMsQUFwQ0QsSUFvQ0M7SUFwQ1ksd0RBQXNCO0lBc0NuQzs7Ozs7Ozs7OztPQVVHO0lBQ0g7UUFBb0MsMENBQXNCO1FBVXhELHdCQUNJLFFBQWdDLEVBQUUsVUFBaUMsRUFDbkUsUUFBdUMsRUFBVSxXQUF3QixFQUNqRSxVQUErQixFQUFFLFVBQStCLEVBQ3hFLGNBQW1DLEVBQUUsV0FBNEI7WUFKckUsWUFLRSxrQkFBTSxRQUFRLENBQUMsU0FhaEI7WUFoQm9ELGlCQUFXLEdBQVgsV0FBVyxDQUFhO1lBQ2pFLGdCQUFVLEdBQVYsVUFBVSxDQUFxQjtZQVhsQyxvQkFBYyxHQUF3QixJQUFJLENBQUM7WUFDM0MsZ0JBQVUsR0FBd0IsSUFBSSxDQUFDO1lBYzlDLEtBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1lBQ3JDLEtBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1lBQzdCLEtBQUksQ0FBQyx1QkFBdUIsR0FBRyxXQUFXLENBQUM7WUFDM0MsS0FBSSxDQUFDLFVBQVUsa0VBQU8sVUFBVSxtQkFBSyxXQUFXLENBQUMsZUFBZSxFQUFDLENBQUM7WUFDbEUsS0FBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7WUFFekIsSUFBSSxLQUFJLENBQUMsa0JBQWtCLEtBQUssU0FBUyxFQUFFO2dCQUN6QyxzRkFBc0Y7Z0JBQ3RGLDJGQUEyRjtnQkFDM0YsS0FBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUksQ0FBQyxzQ0FBc0MsRUFBRSxDQUFDO2FBQ3pFOztRQUNILENBQUM7UUFRRCxzQkFBSSx5Q0FBYTtZQU5qQjs7Ozs7ZUFLRztpQkFDSDtnQkFDRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDO1lBQ3hDLENBQUM7OztXQUFBO1FBTUQsc0JBQUksaURBQXFCO1lBSnpCOzs7ZUFHRztpQkFDSDtnQkFDRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUM7WUFDNUMsQ0FBQzs7O1dBQUE7UUFFRDs7V0FFRztRQUNILG1EQUEwQixHQUExQjtZQUNFLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDN0IsQ0FBQztRQUVEOzs7V0FHRztRQUNJLG1CQUFJLEdBQVgsVUFDSSxRQUF5QixFQUFFLFVBQWlDLEVBQUUsT0FBMEIsRUFDeEYsVUFBMkI7O1lBQzdCLCtGQUErRjtZQUMvRixnREFBZ0Q7WUFDaEQsSUFBTSxzQkFBc0IsR0FBRyxPQUFPLENBQUMsc0JBQXNCLElBQUksS0FBSyxDQUFDO1lBQ3ZFLElBQU0sMEJBQTBCLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUM3RSxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztnQkFDaEMsc0JBQXNCLENBQUM7WUFFM0IsSUFBTSwwQkFBMEIsR0FBRyxPQUFPLENBQUMsc0JBQXNCLEtBQUssU0FBUyxDQUFDLENBQUM7Z0JBQzdFLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUNoQyxzQkFBc0IsQ0FBQztZQUczQixJQUFNLHNCQUFzQixHQUE0QixFQUFFLENBQUM7WUFDM0QsSUFBTSxxQkFBcUIsR0FBMkIsRUFBRSxDQUFDO1lBRXpELElBQUksMEJBQTBCLEVBQUU7Z0JBQzlCLHNCQUFzQjtnQkFDdEIscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksd0JBQWdCLEVBQUUsQ0FBQyxDQUFDO2FBQ3BEO1lBRUQsSUFBSSxjQUFjLEdBQXdCLElBQUksQ0FBQztZQUMvQyxJQUFJLDBCQUEwQixFQUFFO2dCQUM5QixJQUFNLGdCQUFnQixHQUFHLElBQUksd0JBQWdCLEVBQUUsQ0FBQztnQkFDaEQscUJBQXFCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBRTdDLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQzthQUNuQztZQUVELElBQU0sUUFBUSxHQUFHLHdCQUFXLENBQUMsUUFBUSxFQUFFLE9BQTZCLENBQUMsQ0FBQztZQUV0RSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxrQ0FBc0IsRUFBRSxDQUFDLENBQUM7WUFFekQsSUFBSSxXQUFXLEdBQW9CLEVBQUUsQ0FBQztZQUV0QyxJQUFNLHNCQUFzQixHQUFxQixFQUFFLENBQUM7O2dCQUNwRCxLQUF3QixJQUFBLGVBQUEsaUJBQUEsVUFBVSxDQUFBLHNDQUFBLDhEQUFFO29CQUEvQixJQUFNLFNBQVMsdUJBQUE7b0JBQ2xCLElBQUksQ0FBQyxtQ0FBc0IsQ0FBQyxTQUFTLENBQUMsRUFBRTt3QkFDdEMsU0FBUztxQkFDVjtvQkFDRCxzQkFBc0IsQ0FBQyxJQUFJLENBQUMscUJBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2lCQUNqRDs7Ozs7Ozs7O1lBRUQsSUFBSSxVQUFVLEdBQXdCLElBQUksQ0FBQztZQUMzQyxJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsSUFBSSxJQUFJLElBQUksT0FBTyxDQUFDLGlCQUFpQixLQUFLLEVBQUUsRUFBRTtnQkFDekUsVUFBVSxHQUFHLHFDQUF1QixDQUFDLHNCQUFzQixDQUFDLENBQUM7Z0JBQzdELElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtvQkFDdkIsMkZBQTJGO29CQUMzRiwwRkFBMEY7b0JBQzFGLHVGQUF1RjtvQkFDdkYsdUZBQXVGO29CQUN2RixTQUFTO29CQUNULEVBQUU7b0JBQ0Ysd0ZBQXdGO29CQUN4RixxREFBcUQ7b0JBQ3JELFdBQVcsQ0FBQyxJQUFJLENBQUM7d0JBQ2YsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO3dCQUNyQyxJQUFJLEVBQUUseUJBQVcsQ0FBQyx1QkFBUyxDQUFDLDJCQUEyQixDQUFDO3dCQUN4RCxJQUFJLEVBQUUsU0FBUzt3QkFDZixLQUFLLEVBQUUsU0FBUzt3QkFDaEIsTUFBTSxFQUFFLFNBQVM7d0JBQ2pCLFdBQVcsRUFDUCxzR0FBc0c7cUJBQzNHLENBQUMsQ0FBQztpQkFDSjtxQkFBTTtvQkFDTCxJQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQztvQkFDbEQsSUFBTSxpQkFBaUIsR0FBRywwQkFBbUIsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztvQkFDekUsSUFBTSxrQkFBa0IsR0FDcEIsSUFBSSxnQ0FBa0IsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLENBQUM7b0JBQ3hFLHNCQUFzQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2lCQUNqRDthQUNGO1lBRUQsSUFBTSxXQUFXLEdBQUcsSUFBSSxtQkFBVyxDQUMvQixRQUFRLEVBQUUsc0JBQXNCLEVBQUUsc0JBQXNCLEVBQUUscUJBQXFCLEVBQy9FLFVBQVUsQ0FBQyxDQUFDO1lBQ2hCLElBQU0sVUFBVSxHQUNaLElBQUksMkJBQW1CLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLGVBQWUsRUFBbkIsQ0FBbUIsQ0FBQyxDQUFDLENBQUM7WUFDbkYsT0FBTyxJQUFJLGNBQWMsQ0FDckIsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUNuRixXQUFXLENBQUMsQ0FBQztRQUNuQixDQUFDO1FBRUQ7Ozs7V0FJRztRQUNILCtCQUFNLEdBQU4sVUFBTyxFQUFpQjtZQUN0QixPQUFPLGNBQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwQixDQUFDO1FBRUQsc0NBQWEsR0FBYixVQUNJLFFBQWdCLEVBQUUsZUFBZ0MsRUFDbEQsT0FBK0MsRUFDL0MseUJBQTZDO1lBQy9DLG1DQUFtQztZQUNuQyxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxxQkFBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDakUsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO2dCQUNuQixxQkFBcUI7Z0JBQ3JCLE9BQU8sTUFBTSxDQUFDO2FBQ2Y7WUFFRCw2RUFBNkU7WUFDN0UsSUFBTSxFQUFFLEdBQ0osSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQztZQUMvRixJQUFJLEVBQUUsS0FBSyxTQUFTLEVBQUU7Z0JBQ3BCLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEIsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO1FBRUQsbUNBQVUsR0FBVixVQUFXLFFBQWdCO1lBQ3pCLHlDQUF5QztZQUN6QyxvREFBb0Q7WUFDcEQsd0RBQXdEO1lBQ3hELHFGQUFxRjtZQUNyRiwyQ0FBMkM7WUFDM0MsRUFBRTtZQUNGLHlGQUF5RjtZQUN6RixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztnQkFDckMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMscUJBQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQztRQUNoRSxDQUFDO1FBRUQsc0JBQUksOENBQWtCO2lCQUF0QjtnQkFDRSxPQUFPLElBQUksQ0FBQyxvQkFBb0IsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQTBCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNyRixDQUFDOzs7V0FBQTtRQUVPLCtEQUFzQyxHQUE5QztZQUFBLGlCQVdDO1lBVkMsSUFBTSxxQkFBcUIsR0FBRyxFQUFFLENBQUMsMkJBQTJCLENBQ3hELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUV0RSxPQUFPLFVBQUMsV0FBVyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsbUJBQW1CLEVBQUUsT0FBTztnQkFDNUUsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQUEsVUFBVTtvQkFDL0IsSUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUMvQixVQUFVLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxLQUFJLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztvQkFDM0YsT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDO2dCQUMvQixDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQztRQUNKLENBQUM7UUFDSCxxQkFBQztJQUFELENBQUMsQUEzTUQsQ0FBb0Msc0JBQXNCLEdBMk16RDtJQTNNWSx3Q0FBYyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2ZpbmRGbGF0SW5kZXhFbnRyeVBvaW50LCBGbGF0SW5kZXhHZW5lcmF0b3J9IGZyb20gJy4uLy4uL2VudHJ5X3BvaW50JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIHJlc29sdmV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RmFjdG9yeUdlbmVyYXRvciwgaXNTaGltLCBTaGltQWRhcHRlciwgU2hpbVJlZmVyZW5jZVRhZ2dlciwgU3VtbWFyeUdlbmVyYXRvcn0gZnJvbSAnLi4vLi4vc2hpbXMnO1xuaW1wb3J0IHtGYWN0b3J5VHJhY2tlciwgUGVyRmlsZVNoaW1HZW5lcmF0b3IsIFRvcExldmVsU2hpbUdlbmVyYXRvcn0gZnJvbSAnLi4vLi4vc2hpbXMvYXBpJztcbmltcG9ydCB7VHlwZUNoZWNrU2hpbUdlbmVyYXRvcn0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcbmltcG9ydCB7bm9ybWFsaXplU2VwYXJhdG9yc30gZnJvbSAnLi4vLi4vdXRpbC9zcmMvcGF0aCc7XG5pbXBvcnQge2dldFJvb3REaXJzLCBpc05vbkRlY2xhcmF0aW9uVHNQYXRoLCBSZXF1aXJlZERlbGVnYXRpb25zfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7RXh0ZW5kZWRUc0NvbXBpbGVySG9zdCwgTmdDb21waWxlckFkYXB0ZXIsIE5nQ29tcGlsZXJPcHRpb25zLCBVbmlmaWVkTW9kdWxlc0hvc3R9IGZyb20gJy4uL2FwaSc7XG5cbi8vIEEgcGVyc2lzdGVudCBzb3VyY2Ugb2YgYnVncyBpbiBDb21waWxlckhvc3QgZGVsZWdhdGlvbiBoYXMgYmVlbiB0aGUgYWRkaXRpb24gYnkgVFMgb2YgbmV3LFxuLy8gb3B0aW9uYWwgbWV0aG9kcyBvbiB0cy5Db21waWxlckhvc3QuIFNpbmNlIHRoZXNlIG1ldGhvZHMgYXJlIG9wdGlvbmFsLCBpdCdzIG5vdCBhIHR5cGUgZXJyb3IgdGhhdFxuLy8gdGhlIGRlbGVnYXRpbmcgaG9zdCBkb2Vzbid0IGltcGxlbWVudCBvciBkZWxlZ2F0ZSB0aGVtLiBUaGlzIGNhdXNlcyBzdWJ0bGUgcnVudGltZSBmYWlsdXJlcy4gTm9cbi8vIG1vcmUuIFRoaXMgaW5mcmFzdHJ1Y3R1cmUgZW5zdXJlcyB0aGF0IGZhaWxpbmcgdG8gZGVsZWdhdGUgYSBtZXRob2QgaXMgYSBjb21waWxlLXRpbWUgZXJyb3IuXG5cbi8qKlxuICogRGVsZWdhdGVzIGFsbCBtZXRob2RzIG9mIGBFeHRlbmRlZFRzQ29tcGlsZXJIb3N0YCB0byBhIGRlbGVnYXRlLCB3aXRoIHRoZSBleGNlcHRpb24gb2ZcbiAqIGBnZXRTb3VyY2VGaWxlYCBhbmQgYGZpbGVFeGlzdHNgIHdoaWNoIGFyZSBpbXBsZW1lbnRlZCBpbiBgTmdDb21waWxlckhvc3RgLlxuICpcbiAqIElmIGEgbmV3IG1ldGhvZCBpcyBhZGRlZCB0byBgdHMuQ29tcGlsZXJIb3N0YCB3aGljaCBpcyBub3QgZGVsZWdhdGVkLCBhIHR5cGUgZXJyb3Igd2lsbCBiZVxuICogZ2VuZXJhdGVkIGZvciB0aGlzIGNsYXNzLlxuICovXG5leHBvcnQgY2xhc3MgRGVsZWdhdGluZ0NvbXBpbGVySG9zdCBpbXBsZW1lbnRzXG4gICAgT21pdDxSZXF1aXJlZERlbGVnYXRpb25zPEV4dGVuZGVkVHNDb21waWxlckhvc3Q+LCAnZ2V0U291cmNlRmlsZSd8J2ZpbGVFeGlzdHMnPiB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBkZWxlZ2F0ZTogRXh0ZW5kZWRUc0NvbXBpbGVySG9zdCkge31cblxuICBwcml2YXRlIGRlbGVnYXRlTWV0aG9kPE0gZXh0ZW5kcyBrZXlvZiBFeHRlbmRlZFRzQ29tcGlsZXJIb3N0PihuYW1lOiBNKTpcbiAgICAgIEV4dGVuZGVkVHNDb21waWxlckhvc3RbTV0ge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlW25hbWVdICE9PSB1bmRlZmluZWQgPyAodGhpcy5kZWxlZ2F0ZVtuYW1lXSBhcyBhbnkpLmJpbmQodGhpcy5kZWxlZ2F0ZSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBFeGNsdWRlZCBhcmUgJ2dldFNvdXJjZUZpbGUnIGFuZCAnZmlsZUV4aXN0cycsIHdoaWNoIGFyZSBhY3R1YWxseSBpbXBsZW1lbnRlZCBieSBOZ0NvbXBpbGVySG9zdFxuICAvLyBiZWxvdy5cbiAgY3JlYXRlSGFzaCA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2NyZWF0ZUhhc2gnKTtcbiAgZGlyZWN0b3J5RXhpc3RzID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZGlyZWN0b3J5RXhpc3RzJyk7XG4gIGZpbGVOYW1lVG9Nb2R1bGVOYW1lID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZmlsZU5hbWVUb01vZHVsZU5hbWUnKTtcbiAgZ2V0Q2FuY2VsbGF0aW9uVG9rZW4gPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXRDYW5jZWxsYXRpb25Ub2tlbicpO1xuICBnZXRDYW5vbmljYWxGaWxlTmFtZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2dldENhbm9uaWNhbEZpbGVOYW1lJyk7XG4gIGdldEN1cnJlbnREaXJlY3RvcnkgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXRDdXJyZW50RGlyZWN0b3J5Jyk7XG4gIGdldERlZmF1bHRMaWJGaWxlTmFtZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2dldERlZmF1bHRMaWJGaWxlTmFtZScpO1xuICBnZXREZWZhdWx0TGliTG9jYXRpb24gPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXREZWZhdWx0TGliTG9jYXRpb24nKTtcbiAgZ2V0RGlyZWN0b3JpZXMgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXREaXJlY3RvcmllcycpO1xuICBnZXRFbnZpcm9ubWVudFZhcmlhYmxlID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0RW52aXJvbm1lbnRWYXJpYWJsZScpO1xuICBnZXRNb2RpZmllZFJlc291cmNlRmlsZXMgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXRNb2RpZmllZFJlc291cmNlRmlsZXMnKTtcbiAgZ2V0TmV3TGluZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2dldE5ld0xpbmUnKTtcbiAgZ2V0UGFyc2VkQ29tbWFuZExpbmUgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXRQYXJzZWRDb21tYW5kTGluZScpO1xuICBnZXRTb3VyY2VGaWxlQnlQYXRoID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0U291cmNlRmlsZUJ5UGF0aCcpO1xuICByZWFkRGlyZWN0b3J5ID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgncmVhZERpcmVjdG9yeScpO1xuICByZWFkRmlsZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ3JlYWRGaWxlJyk7XG4gIHJlYWRSZXNvdXJjZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ3JlYWRSZXNvdXJjZScpO1xuICByZWFscGF0aCA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ3JlYWxwYXRoJyk7XG4gIHJlc29sdmVNb2R1bGVOYW1lcyA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ3Jlc29sdmVNb2R1bGVOYW1lcycpO1xuICByZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdyZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMnKTtcbiAgcmVzb3VyY2VOYW1lVG9GaWxlTmFtZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ3Jlc291cmNlTmFtZVRvRmlsZU5hbWUnKTtcbiAgdHJhY2UgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCd0cmFjZScpO1xuICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgndXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcycpO1xuICB3cml0ZUZpbGUgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCd3cml0ZUZpbGUnKTtcbn1cblxuLyoqXG4gKiBBIHdyYXBwZXIgYXJvdW5kIGB0cy5Db21waWxlckhvc3RgIChwbHVzIGFueSBleHRlbnNpb24gbWV0aG9kcyBmcm9tIGBFeHRlbmRlZFRzQ29tcGlsZXJIb3N0YCkuXG4gKlxuICogSW4gb3JkZXIgZm9yIGEgY29uc3VtZXIgdG8gaW5jbHVkZSBBbmd1bGFyIGNvbXBpbGF0aW9uIGluIHRoZWlyIFR5cGVTY3JpcHQgY29tcGlsZXIsIHRoZVxuICogYHRzLlByb2dyYW1gIG11c3QgYmUgY3JlYXRlZCB3aXRoIGEgaG9zdCB0aGF0IGFkZHMgQW5ndWxhci1zcGVjaWZpYyBmaWxlcyAoZS5nLiBmYWN0b3JpZXMsXG4gKiBzdW1tYXJpZXMsIHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGZpbGUsIGV0YykgdG8gdGhlIGNvbXBpbGF0aW9uLiBgTmdDb21waWxlckhvc3RgIGlzIHRoZVxuICogaG9zdCBpbXBsZW1lbnRhdGlvbiB3aGljaCBzdXBwb3J0cyB0aGlzLlxuICpcbiAqIFRoZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25zIGhlcmUgZW5zdXJlIHRoYXQgYE5nQ29tcGlsZXJIb3N0YCBmdWxseSBkZWxlZ2F0ZXMgdG9cbiAqIGBFeHRlbmRlZFRzQ29tcGlsZXJIb3N0YCBtZXRob2RzIHdoZW5ldmVyIHByZXNlbnQuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ0NvbXBpbGVySG9zdCBleHRlbmRzIERlbGVnYXRpbmdDb21waWxlckhvc3QgaW1wbGVtZW50c1xuICAgIFJlcXVpcmVkRGVsZWdhdGlvbnM8RXh0ZW5kZWRUc0NvbXBpbGVySG9zdD4sIEV4dGVuZGVkVHNDb21waWxlckhvc3QsIE5nQ29tcGlsZXJBZGFwdGVyIHtcbiAgcmVhZG9ubHkgZmFjdG9yeVRyYWNrZXI6IEZhY3RvcnlUcmFja2VyfG51bGwgPSBudWxsO1xuICByZWFkb25seSBlbnRyeVBvaW50OiBBYnNvbHV0ZUZzUGF0aHxudWxsID0gbnVsbDtcbiAgcmVhZG9ubHkgY29uc3RydWN0aW9uRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXTtcblxuICByZWFkb25seSBpbnB1dEZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz47XG4gIHJlYWRvbmx5IHJvb3REaXJzOiBSZWFkb25seUFycmF5PEFic29sdXRlRnNQYXRoPjtcblxuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgZGVsZWdhdGU6IEV4dGVuZGVkVHNDb21waWxlckhvc3QsIGlucHV0RmlsZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgICAgIHJvb3REaXJzOiBSZWFkb25seUFycmF5PEFic29sdXRlRnNQYXRoPiwgcHJpdmF0ZSBzaGltQWRhcHRlcjogU2hpbUFkYXB0ZXIsXG4gICAgICBwcml2YXRlIHNoaW1UYWdnZXI6IFNoaW1SZWZlcmVuY2VUYWdnZXIsIGVudHJ5UG9pbnQ6IEFic29sdXRlRnNQYXRofG51bGwsXG4gICAgICBmYWN0b3J5VHJhY2tlcjogRmFjdG9yeVRyYWNrZXJ8bnVsbCwgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSkge1xuICAgIHN1cGVyKGRlbGVnYXRlKTtcblxuICAgIHRoaXMuZmFjdG9yeVRyYWNrZXIgPSBmYWN0b3J5VHJhY2tlcjtcbiAgICB0aGlzLmVudHJ5UG9pbnQgPSBlbnRyeVBvaW50O1xuICAgIHRoaXMuY29uc3RydWN0aW9uRGlhZ25vc3RpY3MgPSBkaWFnbm9zdGljcztcbiAgICB0aGlzLmlucHV0RmlsZXMgPSBbLi4uaW5wdXRGaWxlcywgLi4uc2hpbUFkYXB0ZXIuZXh0cmFJbnB1dEZpbGVzXTtcbiAgICB0aGlzLnJvb3REaXJzID0gcm9vdERpcnM7XG5cbiAgICBpZiAodGhpcy5yZXNvbHZlTW9kdWxlTmFtZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gSW4gb3JkZXIgdG8gcmV1c2UgdGhlIG1vZHVsZSByZXNvbHV0aW9uIGNhY2hlIGR1cmluZyB0aGUgY3JlYXRpb24gb2YgdGhlIHR5cGUtY2hlY2tcbiAgICAgIC8vIHByb2dyYW0sIHdlJ2xsIG5lZWQgdG8gcHJvdmlkZSBgcmVzb2x2ZU1vZHVsZU5hbWVzYCBpZiB0aGUgZGVsZWdhdGUgZGlkIG5vdCBwcm92aWRlIG9uZS5cbiAgICAgIHRoaXMucmVzb2x2ZU1vZHVsZU5hbWVzID0gdGhpcy5jcmVhdGVDYWNoZWRSZXNvbHZlTW9kdWxlTmFtZXNGdW5jdGlvbigpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgYSBzZXQgb2YgYHRzLlNvdXJjZUZpbGVgcyB3aGljaCBzaG91bGQgbm90IGJlIGVtaXR0ZWQgYXMgSlMgZmlsZXMuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBhZnRlciB0aGlzIGhvc3QgaXMgdXNlZCB0byBjcmVhdGUgYSBgdHMuUHJvZ3JhbWAgKHdoaWNoIGNhdXNlcyBhbGwgdGhlIGZpbGVzIGluIHRoZVxuICAgKiBwcm9ncmFtIHRvIGJlIGVudW1lcmF0ZWQpLlxuICAgKi9cbiAgZ2V0IGlnbm9yZUZvckVtaXQoKTogU2V0PHRzLlNvdXJjZUZpbGU+IHtcbiAgICByZXR1cm4gdGhpcy5zaGltQWRhcHRlci5pZ25vcmVGb3JFbWl0O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIHRoZSBhcnJheSBvZiBzaGltIGV4dGVuc2lvbiBwcmVmaXhlcyBmb3Igd2hpY2ggc2hpbXMgd2VyZSBjcmVhdGVkIGZvciBlYWNoIG9yaWdpbmFsXG4gICAqIGZpbGUuXG4gICAqL1xuICBnZXQgc2hpbUV4dGVuc2lvblByZWZpeGVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gdGhpcy5zaGltQWRhcHRlci5leHRlbnNpb25QcmVmaXhlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtcyBjbGVhbnVwIHRoYXQgbmVlZHMgdG8gaGFwcGVuIGFmdGVyIGEgYHRzLlByb2dyYW1gIGhhcyBiZWVuIGNyZWF0ZWQgdXNpbmcgdGhpcyBob3N0LlxuICAgKi9cbiAgcG9zdFByb2dyYW1DcmVhdGlvbkNsZWFudXAoKTogdm9pZCB7XG4gICAgdGhpcy5zaGltVGFnZ2VyLmZpbmFsaXplKCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGBOZ0NvbXBpbGVySG9zdGAgZnJvbSBhIGRlbGVnYXRlIGhvc3QsIGFuIGFycmF5IG9mIGlucHV0IGZpbGVuYW1lcywgYW5kIHRoZSBmdWxsIHNldFxuICAgKiBvZiBUeXBlU2NyaXB0IGFuZCBBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbnMuXG4gICAqL1xuICBzdGF0aWMgd3JhcChcbiAgICAgIGRlbGVnYXRlOiB0cy5Db21waWxlckhvc3QsIGlucHV0RmlsZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiwgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsXG4gICAgICBvbGRQcm9ncmFtOiB0cy5Qcm9ncmFtfG51bGwpOiBOZ0NvbXBpbGVySG9zdCB7XG4gICAgLy8gVE9ETyhhbHhodWIpOiByZW1vdmUgdGhlIGZhbGxiYWNrIHRvIGFsbG93RW1wdHlDb2RlZ2VuRmlsZXMgYWZ0ZXIgdmVyaWZ5aW5nIHRoYXQgdGhlIHJlc3Qgb2ZcbiAgICAvLyBvdXIgYnVpbGQgdG9vbGluZyBpcyBubyBsb25nZXIgcmVseWluZyBvbiBpdC5cbiAgICBjb25zdCBhbGxvd0VtcHR5Q29kZWdlbkZpbGVzID0gb3B0aW9ucy5hbGxvd0VtcHR5Q29kZWdlbkZpbGVzIHx8IGZhbHNlO1xuICAgIGNvbnN0IHNob3VsZEdlbmVyYXRlRmFjdG9yeVNoaW1zID0gb3B0aW9ucy5nZW5lcmF0ZU5nRmFjdG9yeVNoaW1zICE9PSB1bmRlZmluZWQgP1xuICAgICAgICBvcHRpb25zLmdlbmVyYXRlTmdGYWN0b3J5U2hpbXMgOlxuICAgICAgICBhbGxvd0VtcHR5Q29kZWdlbkZpbGVzO1xuXG4gICAgY29uc3Qgc2hvdWxkR2VuZXJhdGVTdW1tYXJ5U2hpbXMgPSBvcHRpb25zLmdlbmVyYXRlTmdTdW1tYXJ5U2hpbXMgIT09IHVuZGVmaW5lZCA/XG4gICAgICAgIG9wdGlvbnMuZ2VuZXJhdGVOZ1N1bW1hcnlTaGltcyA6XG4gICAgICAgIGFsbG93RW1wdHlDb2RlZ2VuRmlsZXM7XG5cblxuICAgIGNvbnN0IHRvcExldmVsU2hpbUdlbmVyYXRvcnM6IFRvcExldmVsU2hpbUdlbmVyYXRvcltdID0gW107XG4gICAgY29uc3QgcGVyRmlsZVNoaW1HZW5lcmF0b3JzOiBQZXJGaWxlU2hpbUdlbmVyYXRvcltdID0gW107XG5cbiAgICBpZiAoc2hvdWxkR2VuZXJhdGVTdW1tYXJ5U2hpbXMpIHtcbiAgICAgIC8vIFN1bW1hcnkgZ2VuZXJhdGlvbi5cbiAgICAgIHBlckZpbGVTaGltR2VuZXJhdG9ycy5wdXNoKG5ldyBTdW1tYXJ5R2VuZXJhdG9yKCkpO1xuICAgIH1cblxuICAgIGxldCBmYWN0b3J5VHJhY2tlcjogRmFjdG9yeVRyYWNrZXJ8bnVsbCA9IG51bGw7XG4gICAgaWYgKHNob3VsZEdlbmVyYXRlRmFjdG9yeVNoaW1zKSB7XG4gICAgICBjb25zdCBmYWN0b3J5R2VuZXJhdG9yID0gbmV3IEZhY3RvcnlHZW5lcmF0b3IoKTtcbiAgICAgIHBlckZpbGVTaGltR2VuZXJhdG9ycy5wdXNoKGZhY3RvcnlHZW5lcmF0b3IpO1xuXG4gICAgICBmYWN0b3J5VHJhY2tlciA9IGZhY3RvcnlHZW5lcmF0b3I7XG4gICAgfVxuXG4gICAgY29uc3Qgcm9vdERpcnMgPSBnZXRSb290RGlycyhkZWxlZ2F0ZSwgb3B0aW9ucyBhcyB0cy5Db21waWxlck9wdGlvbnMpO1xuXG4gICAgcGVyRmlsZVNoaW1HZW5lcmF0b3JzLnB1c2gobmV3IFR5cGVDaGVja1NoaW1HZW5lcmF0b3IoKSk7XG5cbiAgICBsZXQgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgY29uc3Qgbm9ybWFsaXplZFRzSW5wdXRGaWxlczogQWJzb2x1dGVGc1BhdGhbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgaW5wdXRGaWxlIG9mIGlucHV0RmlsZXMpIHtcbiAgICAgIGlmICghaXNOb25EZWNsYXJhdGlvblRzUGF0aChpbnB1dEZpbGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbm9ybWFsaXplZFRzSW5wdXRGaWxlcy5wdXNoKHJlc29sdmUoaW5wdXRGaWxlKSk7XG4gICAgfVxuXG4gICAgbGV0IGVudHJ5UG9pbnQ6IEFic29sdXRlRnNQYXRofG51bGwgPSBudWxsO1xuICAgIGlmIChvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlICE9IG51bGwgJiYgb3B0aW9ucy5mbGF0TW9kdWxlT3V0RmlsZSAhPT0gJycpIHtcbiAgICAgIGVudHJ5UG9pbnQgPSBmaW5kRmxhdEluZGV4RW50cnlQb2ludChub3JtYWxpemVkVHNJbnB1dEZpbGVzKTtcbiAgICAgIGlmIChlbnRyeVBvaW50ID09PSBudWxsKSB7XG4gICAgICAgIC8vIFRoaXMgZXJyb3IgbWVzc2FnZSB0YWxrcyBzcGVjaWZpY2FsbHkgYWJvdXQgaGF2aW5nIGEgc2luZ2xlIC50cyBmaWxlIGluIFwiZmlsZXNcIi4gSG93ZXZlclxuICAgICAgICAvLyB0aGUgYWN0dWFsIGxvZ2ljIGlzIGEgYml0IG1vcmUgcGVybWlzc2l2ZS4gSWYgYSBzaW5nbGUgZmlsZSBleGlzdHMsIHRoYXQgd2lsbCBiZSB0YWtlbixcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBoaWdoZXN0IGxldmVsIChzaG9ydGVzdCBwYXRoKSBcImluZGV4LnRzXCIgZmlsZSB3aWxsIGJlIHVzZWQgYXMgdGhlIGZsYXRcbiAgICAgICAgLy8gbW9kdWxlIGVudHJ5IHBvaW50IGluc3RlYWQuIElmIG5laXRoZXIgb2YgdGhlc2UgY29uZGl0aW9ucyBhcHBseSwgdGhlIGVycm9yIGJlbG93IGlzXG4gICAgICAgIC8vIGdpdmVuLlxuICAgICAgICAvL1xuICAgICAgICAvLyBUaGUgdXNlciBpcyBub3QgaW5mb3JtZWQgYWJvdXQgdGhlIFwiaW5kZXgudHNcIiBvcHRpb24gYXMgdGhpcyBiZWhhdmlvciBpcyBkZXByZWNhdGVkIC1cbiAgICAgICAgLy8gYW4gZXhwbGljaXQgZW50cnlwb2ludCBzaG91bGQgYWx3YXlzIGJlIHNwZWNpZmllZC5cbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBjb2RlOiBuZ0Vycm9yQ29kZShFcnJvckNvZGUuQ09ORklHX0ZMQVRfTU9EVUxFX05PX0lOREVYKSxcbiAgICAgICAgICBmaWxlOiB1bmRlZmluZWQsXG4gICAgICAgICAgc3RhcnQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgICAgICBtZXNzYWdlVGV4dDpcbiAgICAgICAgICAgICAgJ0FuZ3VsYXIgY29tcGlsZXIgb3B0aW9uIFwiZmxhdE1vZHVsZU91dEZpbGVcIiByZXF1aXJlcyBvbmUgYW5kIG9ubHkgb25lIC50cyBmaWxlIGluIHRoZSBcImZpbGVzXCIgZmllbGQuJyxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmbGF0TW9kdWxlSWQgPSBvcHRpb25zLmZsYXRNb2R1bGVJZCB8fCBudWxsO1xuICAgICAgICBjb25zdCBmbGF0TW9kdWxlT3V0RmlsZSA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMob3B0aW9ucy5mbGF0TW9kdWxlT3V0RmlsZSk7XG4gICAgICAgIGNvbnN0IGZsYXRJbmRleEdlbmVyYXRvciA9XG4gICAgICAgICAgICBuZXcgRmxhdEluZGV4R2VuZXJhdG9yKGVudHJ5UG9pbnQsIGZsYXRNb2R1bGVPdXRGaWxlLCBmbGF0TW9kdWxlSWQpO1xuICAgICAgICB0b3BMZXZlbFNoaW1HZW5lcmF0b3JzLnB1c2goZmxhdEluZGV4R2VuZXJhdG9yKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzaGltQWRhcHRlciA9IG5ldyBTaGltQWRhcHRlcihcbiAgICAgICAgZGVsZWdhdGUsIG5vcm1hbGl6ZWRUc0lucHV0RmlsZXMsIHRvcExldmVsU2hpbUdlbmVyYXRvcnMsIHBlckZpbGVTaGltR2VuZXJhdG9ycyxcbiAgICAgICAgb2xkUHJvZ3JhbSk7XG4gICAgY29uc3Qgc2hpbVRhZ2dlciA9XG4gICAgICAgIG5ldyBTaGltUmVmZXJlbmNlVGFnZ2VyKHBlckZpbGVTaGltR2VuZXJhdG9ycy5tYXAoZ2VuID0+IGdlbi5leHRlbnNpb25QcmVmaXgpKTtcbiAgICByZXR1cm4gbmV3IE5nQ29tcGlsZXJIb3N0KFxuICAgICAgICBkZWxlZ2F0ZSwgaW5wdXRGaWxlcywgcm9vdERpcnMsIHNoaW1BZGFwdGVyLCBzaGltVGFnZ2VyLCBlbnRyeVBvaW50LCBmYWN0b3J5VHJhY2tlcixcbiAgICAgICAgZGlhZ25vc3RpY3MpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgdGhlIGdpdmVuIGB0cy5Tb3VyY2VGaWxlYCBpcyBhIHNoaW0gZmlsZS5cbiAgICpcbiAgICogSWYgdGhpcyByZXR1cm5zIGZhbHNlLCB0aGUgZmlsZSBpcyB1c2VyLXByb3ZpZGVkLlxuICAgKi9cbiAgaXNTaGltKHNmOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGlzU2hpbShzZik7XG4gIH1cblxuICBnZXRTb3VyY2VGaWxlKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQsXG4gICAgICBvbkVycm9yPzogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCxcbiAgICAgIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGU/OiBib29sZWFufHVuZGVmaW5lZCk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICAvLyBJcyB0aGlzIGEgcHJldmlvdXNseSBrbm93biBzaGltP1xuICAgIGNvbnN0IHNoaW1TZiA9IHRoaXMuc2hpbUFkYXB0ZXIubWF5YmVHZW5lcmF0ZShyZXNvbHZlKGZpbGVOYW1lKSk7XG4gICAgaWYgKHNoaW1TZiAhPT0gbnVsbCkge1xuICAgICAgLy8gWWVzLCBzbyByZXR1cm4gaXQuXG4gICAgICByZXR1cm4gc2hpbVNmO1xuICAgIH1cblxuICAgIC8vIE5vLCBzbyBpdCdzIGEgZmlsZSB3aGljaCBtaWdodCBuZWVkIHNoaW1zIChvciBhIGZpbGUgd2hpY2ggZG9lc24ndCBleGlzdCkuXG4gICAgY29uc3Qgc2YgPVxuICAgICAgICB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUsIGxhbmd1YWdlVmVyc2lvbiwgb25FcnJvciwgc2hvdWxkQ3JlYXRlTmV3U291cmNlRmlsZSk7XG4gICAgaWYgKHNmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5zaGltVGFnZ2VyLnRhZyhzZik7XG4gICAgcmV0dXJuIHNmO1xuICB9XG5cbiAgZmlsZUV4aXN0cyhmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgLy8gQ29uc2lkZXIgdGhlIGZpbGUgYXMgZXhpc3Rpbmcgd2hlbmV2ZXJcbiAgICAvLyAgMSkgaXQgcmVhbGx5IGRvZXMgZXhpc3QgaW4gdGhlIGRlbGVnYXRlIGhvc3QsIG9yXG4gICAgLy8gIDIpIGF0IGxlYXN0IG9uZSBvZiB0aGUgc2hpbSBnZW5lcmF0b3JzIHJlY29nbml6ZXMgaXRcbiAgICAvLyBOb3RlIHRoYXQgd2UgY2FuIHBhc3MgdGhlIGZpbGUgbmFtZSBhcyBicmFuZGVkIGFic29sdXRlIGZzIHBhdGggYmVjYXVzZSBUeXBlU2NyaXB0XG4gICAgLy8gaW50ZXJuYWxseSBvbmx5IHBhc3NlcyBQT1NJWC1saWtlIHBhdGhzLlxuICAgIC8vXG4gICAgLy8gQWxzbyBub3RlIHRoYXQgdGhlIGBtYXliZUdlbmVyYXRlYCBjaGVjayBiZWxvdyBjaGVja3MgZm9yIGJvdGggYG51bGxgIGFuZCBgdW5kZWZpbmVkYC5cbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5maWxlRXhpc3RzKGZpbGVOYW1lKSB8fFxuICAgICAgICB0aGlzLnNoaW1BZGFwdGVyLm1heWJlR2VuZXJhdGUocmVzb2x2ZShmaWxlTmFtZSkpICE9IG51bGw7XG4gIH1cblxuICBnZXQgdW5pZmllZE1vZHVsZXNIb3N0KCk6IFVuaWZpZWRNb2R1bGVzSG9zdHxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5maWxlTmFtZVRvTW9kdWxlTmFtZSAhPT0gdW5kZWZpbmVkID8gdGhpcyBhcyBVbmlmaWVkTW9kdWxlc0hvc3QgOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVDYWNoZWRSZXNvbHZlTW9kdWxlTmFtZXNGdW5jdGlvbigpOiB0cy5Db21waWxlckhvc3RbJ3Jlc29sdmVNb2R1bGVOYW1lcyddIHtcbiAgICBjb25zdCBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUgPSB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUoXG4gICAgICAgIHRoaXMuZ2V0Q3VycmVudERpcmVjdG9yeSgpLCB0aGlzLmdldENhbm9uaWNhbEZpbGVOYW1lLmJpbmQodGhpcykpO1xuXG4gICAgcmV0dXJuIChtb2R1bGVOYW1lcywgY29udGFpbmluZ0ZpbGUsIHJldXNlZE5hbWVzLCByZWRpcmVjdGVkUmVmZXJlbmNlLCBvcHRpb25zKSA9PiB7XG4gICAgICByZXR1cm4gbW9kdWxlTmFtZXMubWFwKG1vZHVsZU5hbWUgPT4ge1xuICAgICAgICBjb25zdCBtb2R1bGUgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShcbiAgICAgICAgICAgIG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLCBvcHRpb25zLCB0aGlzLCBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUsIHJlZGlyZWN0ZWRSZWZlcmVuY2UpO1xuICAgICAgICByZXR1cm4gbW9kdWxlLnJlc29sdmVkTW9kdWxlO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufVxuIl19