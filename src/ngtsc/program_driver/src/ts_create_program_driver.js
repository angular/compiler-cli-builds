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
        define("@angular/compiler-cli/src/ngtsc/program_driver/src/ts_create_program_driver", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/program_driver/src/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TsCreateProgramDriver = exports.DelegatingCompilerHost = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/program_driver/src/api");
    /**
     * Delegates all methods of `ts.CompilerHost` to a delegate, with the exception of
     * `getSourceFile`, `fileExists` and `writeFile` which are implemented in `TypeCheckProgramHost`.
     *
     * If a new method is added to `ts.CompilerHost` which is not delegated, a type error will be
     * generated for this class.
     */
    var DelegatingCompilerHost = /** @class */ (function () {
        function DelegatingCompilerHost(delegate) {
            this.delegate = delegate;
            // Excluded are 'getSourceFile', 'fileExists' and 'writeFile', which are actually implemented by
            // `TypeCheckProgramHost` below.
            this.createHash = this.delegateMethod('createHash');
            this.directoryExists = this.delegateMethod('directoryExists');
            this.getCancellationToken = this.delegateMethod('getCancellationToken');
            this.getCanonicalFileName = this.delegateMethod('getCanonicalFileName');
            this.getCurrentDirectory = this.delegateMethod('getCurrentDirectory');
            this.getDefaultLibFileName = this.delegateMethod('getDefaultLibFileName');
            this.getDefaultLibLocation = this.delegateMethod('getDefaultLibLocation');
            this.getDirectories = this.delegateMethod('getDirectories');
            this.getEnvironmentVariable = this.delegateMethod('getEnvironmentVariable');
            this.getNewLine = this.delegateMethod('getNewLine');
            this.getParsedCommandLine = this.delegateMethod('getParsedCommandLine');
            this.getSourceFileByPath = this.delegateMethod('getSourceFileByPath');
            this.readDirectory = this.delegateMethod('readDirectory');
            this.readFile = this.delegateMethod('readFile');
            this.realpath = this.delegateMethod('realpath');
            this.resolveModuleNames = this.delegateMethod('resolveModuleNames');
            this.resolveTypeReferenceDirectives = this.delegateMethod('resolveTypeReferenceDirectives');
            this.trace = this.delegateMethod('trace');
            this.useCaseSensitiveFileNames = this.delegateMethod('useCaseSensitiveFileNames');
        }
        DelegatingCompilerHost.prototype.delegateMethod = function (name) {
            return this.delegate[name] !== undefined ? this.delegate[name].bind(this.delegate) :
                undefined;
        };
        return DelegatingCompilerHost;
    }());
    exports.DelegatingCompilerHost = DelegatingCompilerHost;
    /**
     * A `ts.CompilerHost` which augments source files.
     */
    var UpdatedProgramHost = /** @class */ (function (_super) {
        (0, tslib_1.__extends)(UpdatedProgramHost, _super);
        function UpdatedProgramHost(sfMap, originalProgram, delegate, shimExtensionPrefixes) {
            var _this = _super.call(this, delegate) || this;
            _this.originalProgram = originalProgram;
            _this.shimExtensionPrefixes = shimExtensionPrefixes;
            /**
             * The `ShimReferenceTagger` responsible for tagging `ts.SourceFile`s loaded via this host.
             *
             * The `UpdatedProgramHost` is used in the creation of a new `ts.Program`. Even though this new
             * program is based on a prior one, TypeScript will still start from the root files and enumerate
             * all source files to include in the new program.  This means that just like during the original
             * program's creation, these source files must be tagged with references to per-file shims in
             * order for those shims to be loaded, and then cleaned up afterwards. Thus the
             * `UpdatedProgramHost` has its own `ShimReferenceTagger` to perform this function.
             */
            _this.shimTagger = new shims_1.ShimReferenceTagger(_this.shimExtensionPrefixes);
            _this.sfMap = sfMap;
            return _this;
        }
        UpdatedProgramHost.prototype.getSourceFile = function (fileName, languageVersion, onError, shouldCreateNewSourceFile) {
            // Try to use the same `ts.SourceFile` as the original program, if possible. This guarantees
            // that program reuse will be as efficient as possible.
            var delegateSf = this.originalProgram.getSourceFile(fileName);
            if (delegateSf === undefined) {
                // Something went wrong and a source file is being requested that's not in the original
                // program. Just in case, try to retrieve it from the delegate.
                delegateSf = this.delegate.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
            }
            if (delegateSf === undefined) {
                return undefined;
            }
            // Look for replacements.
            var sf;
            if (this.sfMap.has(fileName)) {
                sf = this.sfMap.get(fileName);
                (0, shims_1.copyFileShimData)(delegateSf, sf);
            }
            else {
                sf = delegateSf;
            }
            // TypeScript doesn't allow returning redirect source files. To avoid unforeseen errors we
            // return the original source file instead of the redirect target.
            sf = (0, typescript_1.toUnredirectedSourceFile)(sf);
            this.shimTagger.tag(sf);
            return sf;
        };
        UpdatedProgramHost.prototype.postProgramCreationCleanup = function () {
            this.shimTagger.finalize();
        };
        UpdatedProgramHost.prototype.writeFile = function () {
            throw new Error("TypeCheckProgramHost should never write files");
        };
        UpdatedProgramHost.prototype.fileExists = function (fileName) {
            return this.sfMap.has(fileName) || this.delegate.fileExists(fileName);
        };
        return UpdatedProgramHost;
    }(DelegatingCompilerHost));
    /**
     * Updates a `ts.Program` instance with a new one that incorporates specific changes, using the
     * TypeScript compiler APIs for incremental program creation.
     */
    var TsCreateProgramDriver = /** @class */ (function () {
        function TsCreateProgramDriver(originalProgram, originalHost, options, shimExtensionPrefixes) {
            this.originalProgram = originalProgram;
            this.originalHost = originalHost;
            this.options = options;
            this.shimExtensionPrefixes = shimExtensionPrefixes;
            /**
             * A map of source file paths to replacement `ts.SourceFile`s for those paths.
             *
             * Effectively, this tracks the delta between the user's program (represented by the
             * `originalHost`) and the template type-checking program being managed.
             */
            this.sfMap = new Map();
            this.program = this.originalProgram;
            this.supportsInlineOperations = true;
        }
        TsCreateProgramDriver.prototype.getProgram = function () {
            return this.program;
        };
        TsCreateProgramDriver.prototype.updateFiles = function (contents, updateMode) {
            var e_1, _a;
            if (contents.size === 0) {
                // No changes have been requested. Is it safe to skip updating entirely?
                // If UpdateMode is Incremental, then yes. If UpdateMode is Complete, then it's safe to skip
                // only if there are no active changes already (that would be cleared by the update).
                if (updateMode !== api_1.UpdateMode.Complete || this.sfMap.size === 0) {
                    // No changes would be made to the `ts.Program` anyway, so it's safe to do nothing here.
                    return;
                }
            }
            if (updateMode === api_1.UpdateMode.Complete) {
                this.sfMap.clear();
            }
            try {
                for (var _b = (0, tslib_1.__values)(contents.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = (0, tslib_1.__read)(_c.value, 2), filePath = _d[0], _e = _d[1], newText = _e.newText, originalFile = _e.originalFile;
                    var sf = ts.createSourceFile(filePath, newText, ts.ScriptTarget.Latest, true);
                    if (originalFile !== null) {
                        sf[api_1.NgOriginalFile] = originalFile;
                    }
                    this.sfMap.set(filePath, sf);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var host = new UpdatedProgramHost(this.sfMap, this.originalProgram, this.originalHost, this.shimExtensionPrefixes);
            var oldProgram = this.program;
            // Retag the old program's `ts.SourceFile`s with shim tags, to allow TypeScript to reuse the
            // most data.
            (0, shims_1.retagAllTsFiles)(oldProgram);
            this.program = ts.createProgram({
                host: host,
                rootNames: this.program.getRootFileNames(),
                options: this.options,
                oldProgram: oldProgram,
            });
            host.postProgramCreationCleanup();
            // And untag them afterwards. We explicitly untag both programs here, because the oldProgram
            // may still be used for emit and needs to not contain tags.
            (0, shims_1.untagAllTsFiles)(this.program);
            (0, shims_1.untagAllTsFiles)(oldProgram);
        };
        return TsCreateProgramDriver;
    }());
    exports.TsCreateProgramDriver = TsCreateProgramDriver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfY3JlYXRlX3Byb2dyYW1fZHJpdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9wcm9ncmFtX2RyaXZlci9zcmMvdHNfY3JlYXRlX3Byb2dyYW1fZHJpdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFHakMsK0RBQW9HO0lBQ3BHLGtGQUF3RjtJQUV4Riw4RUFBNkc7SUFFN0c7Ozs7OztPQU1HO0lBQ0g7UUFFRSxnQ0FBc0IsUUFBeUI7WUFBekIsYUFBUSxHQUFSLFFBQVEsQ0FBaUI7WUFPL0MsZ0dBQWdHO1lBQ2hHLGdDQUFnQztZQUNoQyxlQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMvQyxvQkFBZSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUN6RCx5QkFBb0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDbkUseUJBQW9CLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ25FLHdCQUFtQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUNqRSwwQkFBcUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDckUsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ3JFLG1CQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3ZELDJCQUFzQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUN2RSxlQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMs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QixFQUFFO2dCQUMxQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87Z0JBQ3JCLFVBQVUsWUFBQTthQUNYLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBRWxDLDRGQUE0RjtZQUM1Riw0REFBNEQ7WUFDNUQsSUFBQSx1QkFBZSxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM5QixJQUFBLHVCQUFlLEVBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQWxFRCxJQWtFQztJQWxFWSxzREFBcUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Y29weUZpbGVTaGltRGF0YSwgcmV0YWdBbGxUc0ZpbGVzLCBTaGltUmVmZXJlbmNlVGFnZ2VyLCB1bnRhZ0FsbFRzRmlsZXN9IGZyb20gJy4uLy4uL3NoaW1zJztcbmltcG9ydCB7UmVxdWlyZWREZWxlZ2F0aW9ucywgdG9VbnJlZGlyZWN0ZWRTb3VyY2VGaWxlfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtGaWxlVXBkYXRlLCBNYXliZVNvdXJjZUZpbGVXaXRoT3JpZ2luYWxGaWxlLCBOZ09yaWdpbmFsRmlsZSwgUHJvZ3JhbURyaXZlciwgVXBkYXRlTW9kZX0gZnJvbSAnLi9hcGknO1xuXG4vKipcbiAqIERlbGVnYXRlcyBhbGwgbWV0aG9kcyBvZiBgdHMuQ29tcGlsZXJIb3N0YCB0byBhIGRlbGVnYXRlLCB3aXRoIHRoZSBleGNlcHRpb24gb2ZcbiAqIGBnZXRTb3VyY2VGaWxlYCwgYGZpbGVFeGlzdHNgIGFuZCBgd3JpdGVGaWxlYCB3aGljaCBhcmUgaW1wbGVtZW50ZWQgaW4gYFR5cGVDaGVja1Byb2dyYW1Ib3N0YC5cbiAqXG4gKiBJZiBhIG5ldyBtZXRob2QgaXMgYWRkZWQgdG8gYHRzLkNvbXBpbGVySG9zdGAgd2hpY2ggaXMgbm90IGRlbGVnYXRlZCwgYSB0eXBlIGVycm9yIHdpbGwgYmVcbiAqIGdlbmVyYXRlZCBmb3IgdGhpcyBjbGFzcy5cbiAqL1xuZXhwb3J0IGNsYXNzIERlbGVnYXRpbmdDb21waWxlckhvc3QgaW1wbGVtZW50c1xuICAgIE9taXQ8UmVxdWlyZWREZWxlZ2F0aW9uczx0cy5Db21waWxlckhvc3Q+LCAnZ2V0U291cmNlRmlsZSd8J2ZpbGVFeGlzdHMnfCd3cml0ZUZpbGUnPiB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBkZWxlZ2F0ZTogdHMuQ29tcGlsZXJIb3N0KSB7fVxuXG4gIHByaXZhdGUgZGVsZWdhdGVNZXRob2Q8TSBleHRlbmRzIGtleW9mIHRzLkNvbXBpbGVySG9zdD4obmFtZTogTSk6IHRzLkNvbXBpbGVySG9zdFtNXSB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGVbbmFtZV0gIT09IHVuZGVmaW5lZCA/ICh0aGlzLmRlbGVnYXRlW25hbWVdIGFzIGFueSkuYmluZCh0aGlzLmRlbGVnYXRlKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIEV4Y2x1ZGVkIGFyZSAnZ2V0U291cmNlRmlsZScsICdmaWxlRXhpc3RzJyBhbmQgJ3dyaXRlRmlsZScsIHdoaWNoIGFyZSBhY3R1YWxseSBpbXBsZW1lbnRlZCBieVxuICAvLyBgVHlwZUNoZWNrUHJvZ3JhbUhvc3RgIGJlbG93LlxuICBjcmVhdGVIYXNoID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnY3JlYXRlSGFzaCcpO1xuICBkaXJlY3RvcnlFeGlzdHMgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdkaXJlY3RvcnlFeGlzdHMnKTtcbiAgZ2V0Q2FuY2VsbGF0aW9uVG9rZW4gPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXRDYW5jZWxsYXRpb25Ub2tlbicpO1xuICBnZXRDYW5vbmljYWxGaWxlTmFtZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2dldENhbm9uaWNhbEZpbGVOYW1lJyk7XG4gIGdldEN1cnJlbnREaXJlY3RvcnkgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXRDdXJyZW50RGlyZWN0b3J5Jyk7XG4gIGdldERlZmF1bHRMaWJGaWxlTmFtZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2dldERlZmF1bHRMaWJGaWxlTmFtZScpO1xuICBnZXREZWZhdWx0TGliTG9jYXRpb24gPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXREZWZhdWx0TGliTG9jYXRpb24nKTtcbiAgZ2V0RGlyZWN0b3JpZXMgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXREaXJlY3RvcmllcycpO1xuICBnZXRFbnZpcm9ubWVudFZhcmlhYmxlID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0RW52aXJvbm1lbnRWYXJpYWJsZScpO1xuICBnZXROZXdMaW5lID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgnZ2V0TmV3TGluZScpO1xuICBnZXRQYXJzZWRDb21tYW5kTGluZSA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ2dldFBhcnNlZENvbW1hbmRMaW5lJyk7XG4gIGdldFNvdXJjZUZpbGVCeVBhdGggPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdnZXRTb3VyY2VGaWxlQnlQYXRoJyk7XG4gIHJlYWREaXJlY3RvcnkgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdyZWFkRGlyZWN0b3J5Jyk7XG4gIHJlYWRGaWxlID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgncmVhZEZpbGUnKTtcbiAgcmVhbHBhdGggPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdyZWFscGF0aCcpO1xuICByZXNvbHZlTW9kdWxlTmFtZXMgPSB0aGlzLmRlbGVnYXRlTWV0aG9kKCdyZXNvbHZlTW9kdWxlTmFtZXMnKTtcbiAgcmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgncmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzJyk7XG4gIHRyYWNlID0gdGhpcy5kZWxlZ2F0ZU1ldGhvZCgndHJhY2UnKTtcbiAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcyA9IHRoaXMuZGVsZWdhdGVNZXRob2QoJ3VzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMnKTtcbn1cblxuLyoqXG4gKiBBIGB0cy5Db21waWxlckhvc3RgIHdoaWNoIGF1Z21lbnRzIHNvdXJjZSBmaWxlcy5cbiAqL1xuY2xhc3MgVXBkYXRlZFByb2dyYW1Ib3N0IGV4dGVuZHMgRGVsZWdhdGluZ0NvbXBpbGVySG9zdCB7XG4gIC8qKlxuICAgKiBNYXAgb2Ygc291cmNlIGZpbGUgbmFtZXMgdG8gYHRzLlNvdXJjZUZpbGVgIGluc3RhbmNlcy5cbiAgICovXG4gIHByaXZhdGUgc2ZNYXA6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+O1xuXG4gIC8qKlxuICAgKiBUaGUgYFNoaW1SZWZlcmVuY2VUYWdnZXJgIHJlc3BvbnNpYmxlIGZvciB0YWdnaW5nIGB0cy5Tb3VyY2VGaWxlYHMgbG9hZGVkIHZpYSB0aGlzIGhvc3QuXG4gICAqXG4gICAqIFRoZSBgVXBkYXRlZFByb2dyYW1Ib3N0YCBpcyB1c2VkIGluIHRoZSBjcmVhdGlvbiBvZiBhIG5ldyBgdHMuUHJvZ3JhbWAuIEV2ZW4gdGhvdWdoIHRoaXMgbmV3XG4gICAqIHByb2dyYW0gaXMgYmFzZWQgb24gYSBwcmlvciBvbmUsIFR5cGVTY3JpcHQgd2lsbCBzdGlsbCBzdGFydCBmcm9tIHRoZSByb290IGZpbGVzIGFuZCBlbnVtZXJhdGVcbiAgICogYWxsIHNvdXJjZSBmaWxlcyB0byBpbmNsdWRlIGluIHRoZSBuZXcgcHJvZ3JhbS4gIFRoaXMgbWVhbnMgdGhhdCBqdXN0IGxpa2UgZHVyaW5nIHRoZSBvcmlnaW5hbFxuICAgKiBwcm9ncmFtJ3MgY3JlYXRpb24sIHRoZXNlIHNvdXJjZSBmaWxlcyBtdXN0IGJlIHRhZ2dlZCB3aXRoIHJlZmVyZW5jZXMgdG8gcGVyLWZpbGUgc2hpbXMgaW5cbiAgICogb3JkZXIgZm9yIHRob3NlIHNoaW1zIHRvIGJlIGxvYWRlZCwgYW5kIHRoZW4gY2xlYW5lZCB1cCBhZnRlcndhcmRzLiBUaHVzIHRoZVxuICAgKiBgVXBkYXRlZFByb2dyYW1Ib3N0YCBoYXMgaXRzIG93biBgU2hpbVJlZmVyZW5jZVRhZ2dlcmAgdG8gcGVyZm9ybSB0aGlzIGZ1bmN0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBzaGltVGFnZ2VyID0gbmV3IFNoaW1SZWZlcmVuY2VUYWdnZXIodGhpcy5zaGltRXh0ZW5zaW9uUHJlZml4ZXMpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgc2ZNYXA6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+LCBwcml2YXRlIG9yaWdpbmFsUHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIGRlbGVnYXRlOiB0cy5Db21waWxlckhvc3QsIHByaXZhdGUgc2hpbUV4dGVuc2lvblByZWZpeGVzOiBzdHJpbmdbXSkge1xuICAgIHN1cGVyKGRlbGVnYXRlKTtcbiAgICB0aGlzLnNmTWFwID0gc2ZNYXA7XG4gIH1cblxuICBnZXRTb3VyY2VGaWxlKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQsXG4gICAgICBvbkVycm9yPzogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCxcbiAgICAgIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGU/OiBib29sZWFufHVuZGVmaW5lZCk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICAvLyBUcnkgdG8gdXNlIHRoZSBzYW1lIGB0cy5Tb3VyY2VGaWxlYCBhcyB0aGUgb3JpZ2luYWwgcHJvZ3JhbSwgaWYgcG9zc2libGUuIFRoaXMgZ3VhcmFudGVlc1xuICAgIC8vIHRoYXQgcHJvZ3JhbSByZXVzZSB3aWxsIGJlIGFzIGVmZmljaWVudCBhcyBwb3NzaWJsZS5cbiAgICBsZXQgZGVsZWdhdGVTZjogdHMuU291cmNlRmlsZXx1bmRlZmluZWQgPSB0aGlzLm9yaWdpbmFsUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICBpZiAoZGVsZWdhdGVTZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTb21ldGhpbmcgd2VudCB3cm9uZyBhbmQgYSBzb3VyY2UgZmlsZSBpcyBiZWluZyByZXF1ZXN0ZWQgdGhhdCdzIG5vdCBpbiB0aGUgb3JpZ2luYWxcbiAgICAgIC8vIHByb2dyYW0uIEp1c3QgaW4gY2FzZSwgdHJ5IHRvIHJldHJpZXZlIGl0IGZyb20gdGhlIGRlbGVnYXRlLlxuICAgICAgZGVsZWdhdGVTZiA9IHRoaXMuZGVsZWdhdGUuZ2V0U291cmNlRmlsZShcbiAgICAgICAgICBmaWxlTmFtZSwgbGFuZ3VhZ2VWZXJzaW9uLCBvbkVycm9yLCBzaG91bGRDcmVhdGVOZXdTb3VyY2VGaWxlKSE7XG4gICAgfVxuICAgIGlmIChkZWxlZ2F0ZVNmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gTG9vayBmb3IgcmVwbGFjZW1lbnRzLlxuICAgIGxldCBzZjogdHMuU291cmNlRmlsZTtcbiAgICBpZiAodGhpcy5zZk1hcC5oYXMoZmlsZU5hbWUpKSB7XG4gICAgICBzZiA9IHRoaXMuc2ZNYXAuZ2V0KGZpbGVOYW1lKSE7XG4gICAgICBjb3B5RmlsZVNoaW1EYXRhKGRlbGVnYXRlU2YsIHNmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2YgPSBkZWxlZ2F0ZVNmO1xuICAgIH1cbiAgICAvLyBUeXBlU2NyaXB0IGRvZXNuJ3QgYWxsb3cgcmV0dXJuaW5nIHJlZGlyZWN0IHNvdXJjZSBmaWxlcy4gVG8gYXZvaWQgdW5mb3Jlc2VlbiBlcnJvcnMgd2VcbiAgICAvLyByZXR1cm4gdGhlIG9yaWdpbmFsIHNvdXJjZSBmaWxlIGluc3RlYWQgb2YgdGhlIHJlZGlyZWN0IHRhcmdldC5cbiAgICBzZiA9IHRvVW5yZWRpcmVjdGVkU291cmNlRmlsZShzZik7XG5cbiAgICB0aGlzLnNoaW1UYWdnZXIudGFnKHNmKTtcbiAgICByZXR1cm4gc2Y7XG4gIH1cblxuICBwb3N0UHJvZ3JhbUNyZWF0aW9uQ2xlYW51cCgpOiB2b2lkIHtcbiAgICB0aGlzLnNoaW1UYWdnZXIuZmluYWxpemUoKTtcbiAgfVxuXG4gIHdyaXRlRmlsZSgpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBUeXBlQ2hlY2tQcm9ncmFtSG9zdCBzaG91bGQgbmV2ZXIgd3JpdGUgZmlsZXNgKTtcbiAgfVxuXG4gIGZpbGVFeGlzdHMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNmTWFwLmhhcyhmaWxlTmFtZSkgfHwgdGhpcy5kZWxlZ2F0ZS5maWxlRXhpc3RzKGZpbGVOYW1lKTtcbiAgfVxufVxuXG5cbi8qKlxuICogVXBkYXRlcyBhIGB0cy5Qcm9ncmFtYCBpbnN0YW5jZSB3aXRoIGEgbmV3IG9uZSB0aGF0IGluY29ycG9yYXRlcyBzcGVjaWZpYyBjaGFuZ2VzLCB1c2luZyB0aGVcbiAqIFR5cGVTY3JpcHQgY29tcGlsZXIgQVBJcyBmb3IgaW5jcmVtZW50YWwgcHJvZ3JhbSBjcmVhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIFRzQ3JlYXRlUHJvZ3JhbURyaXZlciBpbXBsZW1lbnRzIFByb2dyYW1Ecml2ZXIge1xuICAvKipcbiAgICogQSBtYXAgb2Ygc291cmNlIGZpbGUgcGF0aHMgdG8gcmVwbGFjZW1lbnQgYHRzLlNvdXJjZUZpbGVgcyBmb3IgdGhvc2UgcGF0aHMuXG4gICAqXG4gICAqIEVmZmVjdGl2ZWx5LCB0aGlzIHRyYWNrcyB0aGUgZGVsdGEgYmV0d2VlbiB0aGUgdXNlcidzIHByb2dyYW0gKHJlcHJlc2VudGVkIGJ5IHRoZVxuICAgKiBgb3JpZ2luYWxIb3N0YCkgYW5kIHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHByb2dyYW0gYmVpbmcgbWFuYWdlZC5cbiAgICovXG4gIHByaXZhdGUgc2ZNYXAgPSBuZXcgTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4oKTtcblxuICBwcml2YXRlIHByb2dyYW06IHRzLlByb2dyYW0gPSB0aGlzLm9yaWdpbmFsUHJvZ3JhbTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgb3JpZ2luYWxQcm9ncmFtOiB0cy5Qcm9ncmFtLCBwcml2YXRlIG9yaWdpbmFsSG9zdDogdHMuQ29tcGlsZXJIb3N0LFxuICAgICAgcHJpdmF0ZSBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMsIHByaXZhdGUgc2hpbUV4dGVuc2lvblByZWZpeGVzOiBzdHJpbmdbXSkge31cblxuICByZWFkb25seSBzdXBwb3J0c0lubGluZU9wZXJhdGlvbnMgPSB0cnVlO1xuXG4gIGdldFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMucHJvZ3JhbTtcbiAgfVxuXG4gIHVwZGF0ZUZpbGVzKGNvbnRlbnRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVVcGRhdGU+LCB1cGRhdGVNb2RlOiBVcGRhdGVNb2RlKTogdm9pZCB7XG4gICAgaWYgKGNvbnRlbnRzLnNpemUgPT09IDApIHtcbiAgICAgIC8vIE5vIGNoYW5nZXMgaGF2ZSBiZWVuIHJlcXVlc3RlZC4gSXMgaXQgc2FmZSB0byBza2lwIHVwZGF0aW5nIGVudGlyZWx5P1xuICAgICAgLy8gSWYgVXBkYXRlTW9kZSBpcyBJbmNyZW1lbnRhbCwgdGhlbiB5ZXMuIElmIFVwZGF0ZU1vZGUgaXMgQ29tcGxldGUsIHRoZW4gaXQncyBzYWZlIHRvIHNraXBcbiAgICAgIC8vIG9ubHkgaWYgdGhlcmUgYXJlIG5vIGFjdGl2ZSBjaGFuZ2VzIGFscmVhZHkgKHRoYXQgd291bGQgYmUgY2xlYXJlZCBieSB0aGUgdXBkYXRlKS5cblxuICAgICAgaWYgKHVwZGF0ZU1vZGUgIT09IFVwZGF0ZU1vZGUuQ29tcGxldGUgfHwgdGhpcy5zZk1hcC5zaXplID09PSAwKSB7XG4gICAgICAgIC8vIE5vIGNoYW5nZXMgd291bGQgYmUgbWFkZSB0byB0aGUgYHRzLlByb2dyYW1gIGFueXdheSwgc28gaXQncyBzYWZlIHRvIGRvIG5vdGhpbmcgaGVyZS5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh1cGRhdGVNb2RlID09PSBVcGRhdGVNb2RlLkNvbXBsZXRlKSB7XG4gICAgICB0aGlzLnNmTWFwLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbZmlsZVBhdGgsIHtuZXdUZXh0LCBvcmlnaW5hbEZpbGV9XSBvZiBjb250ZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgIGNvbnN0IHNmID0gdHMuY3JlYXRlU291cmNlRmlsZShmaWxlUGF0aCwgbmV3VGV4dCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG4gICAgICBpZiAob3JpZ2luYWxGaWxlICE9PSBudWxsKSB7XG4gICAgICAgIChzZiBhcyBNYXliZVNvdXJjZUZpbGVXaXRoT3JpZ2luYWxGaWxlKVtOZ09yaWdpbmFsRmlsZV0gPSBvcmlnaW5hbEZpbGU7XG4gICAgICB9XG4gICAgICB0aGlzLnNmTWFwLnNldChmaWxlUGF0aCwgc2YpO1xuICAgIH1cblxuICAgIGNvbnN0IGhvc3QgPSBuZXcgVXBkYXRlZFByb2dyYW1Ib3N0KFxuICAgICAgICB0aGlzLnNmTWFwLCB0aGlzLm9yaWdpbmFsUHJvZ3JhbSwgdGhpcy5vcmlnaW5hbEhvc3QsIHRoaXMuc2hpbUV4dGVuc2lvblByZWZpeGVzKTtcbiAgICBjb25zdCBvbGRQcm9ncmFtID0gdGhpcy5wcm9ncmFtO1xuXG4gICAgLy8gUmV0YWcgdGhlIG9sZCBwcm9ncmFtJ3MgYHRzLlNvdXJjZUZpbGVgcyB3aXRoIHNoaW0gdGFncywgdG8gYWxsb3cgVHlwZVNjcmlwdCB0byByZXVzZSB0aGVcbiAgICAvLyBtb3N0IGRhdGEuXG4gICAgcmV0YWdBbGxUc0ZpbGVzKG9sZFByb2dyYW0pO1xuXG4gICAgdGhpcy5wcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbSh7XG4gICAgICBob3N0LFxuICAgICAgcm9vdE5hbWVzOiB0aGlzLnByb2dyYW0uZ2V0Um9vdEZpbGVOYW1lcygpLFxuICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgb2xkUHJvZ3JhbSxcbiAgICB9KTtcbiAgICBob3N0LnBvc3RQcm9ncmFtQ3JlYXRpb25DbGVhbnVwKCk7XG5cbiAgICAvLyBBbmQgdW50YWcgdGhlbSBhZnRlcndhcmRzLiBXZSBleHBsaWNpdGx5IHVudGFnIGJvdGggcHJvZ3JhbXMgaGVyZSwgYmVjYXVzZSB0aGUgb2xkUHJvZ3JhbVxuICAgIC8vIG1heSBzdGlsbCBiZSB1c2VkIGZvciBlbWl0IGFuZCBuZWVkcyB0byBub3QgY29udGFpbiB0YWdzLlxuICAgIHVudGFnQWxsVHNGaWxlcyh0aGlzLnByb2dyYW0pO1xuICAgIHVudGFnQWxsVHNGaWxlcyhvbGRQcm9ncmFtKTtcbiAgfVxufVxuIl19