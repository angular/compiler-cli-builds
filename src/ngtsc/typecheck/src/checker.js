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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/checker", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/typecheck/src/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/context", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/api");
    var context_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/context");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    /**
     * Primary template type-checking engine, which performs type-checking using a
     * `TypeCheckingProgramStrategy` for type-checking program maintenance, and the
     * `ProgramTypeCheckAdapter` for generation of template type-checking code.
     */
    var TemplateTypeChecker = /** @class */ (function () {
        function TemplateTypeChecker(originalProgram, typeCheckingStrategy, typeCheckAdapter, config, refEmitter, reflector, priorBuild) {
            this.originalProgram = originalProgram;
            this.typeCheckingStrategy = typeCheckingStrategy;
            this.typeCheckAdapter = typeCheckAdapter;
            this.config = config;
            this.refEmitter = refEmitter;
            this.reflector = reflector;
            this.priorBuild = priorBuild;
            this.files = new Map();
        }
        /**
         * Reset the internal type-checking program by generating type-checking code from the user's
         * program.
         */
        TemplateTypeChecker.prototype.refresh = function () {
            var e_1, _a, e_2, _b;
            this.files.clear();
            var ctx = new context_1.TypeCheckContext(this.config, this.originalProgram, this.refEmitter, this.reflector);
            try {
                // Typecheck all the files.
                for (var _c = tslib_1.__values(this.originalProgram.getSourceFiles()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var sf = _d.value;
                    if (sf.isDeclarationFile || shims_1.isShim(sf)) {
                        continue;
                    }
                    var previousResults = this.priorBuild.priorTypeCheckingResultsFor(sf);
                    if (previousResults === null) {
                        // Previous results were not available, so generate new type-checking code for this file.
                        this.typeCheckAdapter.typeCheck(sf, ctx);
                    }
                    else {
                        // Previous results were available, and can be adopted into the current build.
                        ctx.adoptPriorResults(sf, previousResults);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var results = ctx.finalize();
            this.typeCheckingStrategy.updateFiles(results.updates, api_1.UpdateMode.Complete);
            try {
                for (var _e = tslib_1.__values(results.perFileData), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var _g = tslib_1.__read(_f.value, 2), file = _g[0], fileData = _g[1];
                    this.files.set(file, fileData);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return results;
        };
        /**
         * Retrieve type-checking diagnostics from the given `ts.SourceFile` using the most recent
         * type-checking program.
         */
        TemplateTypeChecker.prototype.getDiagnosticsForFile = function (sf) {
            var path = file_system_1.absoluteFromSourceFile(sf);
            if (!this.files.has(path)) {
                return [];
            }
            var record = this.files.get(path);
            var typeCheckProgram = this.typeCheckingStrategy.getProgram();
            var typeCheckSf = file_system_1.getSourceFileOrError(typeCheckProgram, record.typeCheckFile);
            var rawDiagnostics = [];
            rawDiagnostics.push.apply(rawDiagnostics, tslib_1.__spread(typeCheckProgram.getSemanticDiagnostics(typeCheckSf)));
            if (record.hasInlines) {
                var inlineSf = file_system_1.getSourceFileOrError(typeCheckProgram, path);
                rawDiagnostics.push.apply(rawDiagnostics, tslib_1.__spread(typeCheckProgram.getSemanticDiagnostics(inlineSf)));
            }
            return rawDiagnostics
                .map(function (diag) {
                if (!diagnostics_1.shouldReportDiagnostic(diag)) {
                    return null;
                }
                return diagnostics_1.translateDiagnostic(diag, record.sourceResolver);
            })
                .filter(function (diag) { return diag !== null; })
                .concat(record.genesisDiagnostics);
        };
        return TemplateTypeChecker;
    }());
    exports.TemplateTypeChecker = TemplateTypeChecker;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUlILDJFQUErRjtJQUkvRiwrREFBbUM7SUFFbkMseUVBQWtGO0lBQ2xGLGlGQUFtRjtJQUNuRix5RkFBMEU7SUFVMUU7Ozs7T0FJRztJQUNIO1FBR0UsNkJBQ1ksZUFBMkIsRUFDM0Isb0JBQWlELEVBQ2pELGdCQUF5QyxFQUFVLE1BQTBCLEVBQzdFLFVBQTRCLEVBQVUsU0FBeUIsRUFDL0QsVUFBMkQ7WUFKM0Qsb0JBQWUsR0FBZixlQUFlLENBQVk7WUFDM0IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUE2QjtZQUNqRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXlCO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBb0I7WUFDN0UsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMvRCxlQUFVLEdBQVYsVUFBVSxDQUFpRDtZQVAvRCxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXdDLENBQUM7UUFPVSxDQUFDO1FBRTNFOzs7V0FHRztRQUNILHFDQUFPLEdBQVA7O1lBQ0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUVuQixJQUFNLEdBQUcsR0FDTCxJQUFJLDBCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzs7Z0JBRTdGLDJCQUEyQjtnQkFDM0IsS0FBaUIsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7b0JBQW5ELElBQU0sRUFBRSxXQUFBO29CQUNYLElBQUksRUFBRSxDQUFDLGlCQUFpQixJQUFJLGNBQU0sQ0FBQyxFQUFFLENBQUMsRUFBRTt3QkFDdEMsU0FBUztxQkFDVjtvQkFFRCxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN4RSxJQUFJLGVBQWUsS0FBSyxJQUFJLEVBQUU7d0JBQzVCLHlGQUF5Rjt3QkFDekYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7cUJBQzFDO3lCQUFNO3dCQUNMLDhFQUE4RTt3QkFDOUUsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQztxQkFDNUM7aUJBQ0Y7Ozs7Ozs7OztZQUVELElBQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsZ0JBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQzs7Z0JBQzVFLEtBQStCLElBQUEsS0FBQSxpQkFBQSxPQUFPLENBQUMsV0FBVyxDQUFBLGdCQUFBLDRCQUFFO29CQUF6QyxJQUFBLGdDQUFnQixFQUFmLFlBQUksRUFBRSxnQkFBUTtvQkFDeEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2lCQUNoQzs7Ozs7Ozs7O1lBRUQsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUVEOzs7V0FHRztRQUNILG1EQUFxQixHQUFyQixVQUFzQixFQUFpQjtZQUNyQyxJQUFNLElBQUksR0FBRyxvQ0FBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3pCLE9BQU8sRUFBRSxDQUFDO2FBQ1g7WUFDRCxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQztZQUVyQyxJQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNoRSxJQUFNLFdBQVcsR0FBRyxrQ0FBb0IsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDakYsSUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDO1lBQzFCLGNBQWMsQ0FBQyxJQUFJLE9BQW5CLGNBQWMsbUJBQVMsZ0JBQWdCLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLEdBQUU7WUFDN0UsSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFO2dCQUNyQixJQUFNLFFBQVEsR0FBRyxrQ0FBb0IsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDOUQsY0FBYyxDQUFDLElBQUksT0FBbkIsY0FBYyxtQkFBUyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsR0FBRTthQUMzRTtZQUVELE9BQU8sY0FBYztpQkFDaEIsR0FBRyxDQUFDLFVBQUEsSUFBSTtnQkFDUCxJQUFJLENBQUMsb0NBQXNCLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2pDLE9BQU8sSUFBSSxDQUFDO2lCQUNiO2dCQUNELE9BQU8saUNBQW1CLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUMxRCxDQUFDLENBQUM7aUJBQ0QsTUFBTSxDQUFDLFVBQUMsSUFBd0IsSUFBNEIsT0FBQSxJQUFJLEtBQUssSUFBSSxFQUFiLENBQWEsQ0FBQztpQkFDMUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFDSCwwQkFBQztJQUFELENBQUMsQUEzRUQsSUEyRUM7SUEzRVksa0RBQW1CIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aCwgZ2V0U291cmNlRmlsZU9yRXJyb3J9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0luY3JlbWVudGFsQnVpbGR9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL2FwaSc7XG5pbXBvcnQge1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7aXNTaGltfSBmcm9tICcuLi8uLi9zaGltcyc7XG5cbmltcG9ydCB7VHlwZUNoZWNraW5nQ29uZmlnLCBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksIFVwZGF0ZU1vZGV9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7RmlsZVR5cGVDaGVja2luZ0RhdGEsIFR5cGVDaGVja0NvbnRleHQsIFR5cGVDaGVja1JlcXVlc3R9IGZyb20gJy4vY29udGV4dCc7XG5pbXBvcnQge3Nob3VsZFJlcG9ydERpYWdub3N0aWMsIHRyYW5zbGF0ZURpYWdub3N0aWN9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuXG4vKipcbiAqIEludGVyZmFjZSB0byB0cmlnZ2VyIGdlbmVyYXRpb24gb2YgdHlwZS1jaGVja2luZyBjb2RlIGZvciBhIHByb2dyYW0gZ2l2ZW4gYSBuZXdcbiAqIGBUeXBlQ2hlY2tDb250ZXh0YC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQcm9ncmFtVHlwZUNoZWNrQWRhcHRlciB7XG4gIHR5cGVDaGVjayhzZjogdHMuU291cmNlRmlsZSwgY3R4OiBUeXBlQ2hlY2tDb250ZXh0KTogdm9pZDtcbn1cblxuLyoqXG4gKiBQcmltYXJ5IHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgZW5naW5lLCB3aGljaCBwZXJmb3JtcyB0eXBlLWNoZWNraW5nIHVzaW5nIGFcbiAqIGBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3lgIGZvciB0eXBlLWNoZWNraW5nIHByb2dyYW0gbWFpbnRlbmFuY2UsIGFuZCB0aGVcbiAqIGBQcm9ncmFtVHlwZUNoZWNrQWRhcHRlcmAgZm9yIGdlbmVyYXRpb24gb2YgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBjb2RlLlxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVUeXBlQ2hlY2tlciB7XG4gIHByaXZhdGUgZmlsZXMgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBGaWxlVHlwZUNoZWNraW5nRGF0YT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgb3JpZ2luYWxQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgcHJpdmF0ZSB0eXBlQ2hlY2tpbmdTdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LFxuICAgICAgcHJpdmF0ZSB0eXBlQ2hlY2tBZGFwdGVyOiBQcm9ncmFtVHlwZUNoZWNrQWRhcHRlciwgcHJpdmF0ZSBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZyxcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJpdmF0ZSBwcmlvckJ1aWxkOiBJbmNyZW1lbnRhbEJ1aWxkPHVua25vd24sIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPikge31cblxuICAvKipcbiAgICogUmVzZXQgdGhlIGludGVybmFsIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbSBieSBnZW5lcmF0aW5nIHR5cGUtY2hlY2tpbmcgY29kZSBmcm9tIHRoZSB1c2VyJ3NcbiAgICogcHJvZ3JhbS5cbiAgICovXG4gIHJlZnJlc2goKTogVHlwZUNoZWNrUmVxdWVzdCB7XG4gICAgdGhpcy5maWxlcy5jbGVhcigpO1xuXG4gICAgY29uc3QgY3R4ID1cbiAgICAgICAgbmV3IFR5cGVDaGVja0NvbnRleHQodGhpcy5jb25maWcsIHRoaXMub3JpZ2luYWxQcm9ncmFtLCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yKTtcblxuICAgIC8vIFR5cGVjaGVjayBhbGwgdGhlIGZpbGVzLlxuICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy5vcmlnaW5hbFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlIHx8IGlzU2hpbShzZikpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHByZXZpb3VzUmVzdWx0cyA9IHRoaXMucHJpb3JCdWlsZC5wcmlvclR5cGVDaGVja2luZ1Jlc3VsdHNGb3Ioc2YpO1xuICAgICAgaWYgKHByZXZpb3VzUmVzdWx0cyA9PT0gbnVsbCkge1xuICAgICAgICAvLyBQcmV2aW91cyByZXN1bHRzIHdlcmUgbm90IGF2YWlsYWJsZSwgc28gZ2VuZXJhdGUgbmV3IHR5cGUtY2hlY2tpbmcgY29kZSBmb3IgdGhpcyBmaWxlLlxuICAgICAgICB0aGlzLnR5cGVDaGVja0FkYXB0ZXIudHlwZUNoZWNrKHNmLCBjdHgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gUHJldmlvdXMgcmVzdWx0cyB3ZXJlIGF2YWlsYWJsZSwgYW5kIGNhbiBiZSBhZG9wdGVkIGludG8gdGhlIGN1cnJlbnQgYnVpbGQuXG4gICAgICAgIGN0eC5hZG9wdFByaW9yUmVzdWx0cyhzZiwgcHJldmlvdXNSZXN1bHRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHRzID0gY3R4LmZpbmFsaXplKCk7XG4gICAgdGhpcy50eXBlQ2hlY2tpbmdTdHJhdGVneS51cGRhdGVGaWxlcyhyZXN1bHRzLnVwZGF0ZXMsIFVwZGF0ZU1vZGUuQ29tcGxldGUpO1xuICAgIGZvciAoY29uc3QgW2ZpbGUsIGZpbGVEYXRhXSBvZiByZXN1bHRzLnBlckZpbGVEYXRhKSB7XG4gICAgICB0aGlzLmZpbGVzLnNldChmaWxlLCBmaWxlRGF0YSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgdHlwZS1jaGVja2luZyBkaWFnbm9zdGljcyBmcm9tIHRoZSBnaXZlbiBgdHMuU291cmNlRmlsZWAgdXNpbmcgdGhlIG1vc3QgcmVjZW50XG4gICAqIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbS5cbiAgICovXG4gIGdldERpYWdub3N0aWNzRm9yRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgcGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgIGlmICghdGhpcy5maWxlcy5oYXMocGF0aCkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgcmVjb3JkID0gdGhpcy5maWxlcy5nZXQocGF0aCkhO1xuXG4gICAgY29uc3QgdHlwZUNoZWNrUHJvZ3JhbSA9IHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpO1xuICAgIGNvbnN0IHR5cGVDaGVja1NmID0gZ2V0U291cmNlRmlsZU9yRXJyb3IodHlwZUNoZWNrUHJvZ3JhbSwgcmVjb3JkLnR5cGVDaGVja0ZpbGUpO1xuICAgIGNvbnN0IHJhd0RpYWdub3N0aWNzID0gW107XG4gICAgcmF3RGlhZ25vc3RpY3MucHVzaCguLi50eXBlQ2hlY2tQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3ModHlwZUNoZWNrU2YpKTtcbiAgICBpZiAocmVjb3JkLmhhc0lubGluZXMpIHtcbiAgICAgIGNvbnN0IGlubGluZVNmID0gZ2V0U291cmNlRmlsZU9yRXJyb3IodHlwZUNoZWNrUHJvZ3JhbSwgcGF0aCk7XG4gICAgICByYXdEaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhpbmxpbmVTZikpO1xuICAgIH1cblxuICAgIHJldHVybiByYXdEaWFnbm9zdGljc1xuICAgICAgICAubWFwKGRpYWcgPT4ge1xuICAgICAgICAgIGlmICghc2hvdWxkUmVwb3J0RGlhZ25vc3RpYyhkaWFnKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0cmFuc2xhdGVEaWFnbm9zdGljKGRpYWcsIHJlY29yZC5zb3VyY2VSZXNvbHZlcik7XG4gICAgICAgIH0pXG4gICAgICAgIC5maWx0ZXIoKGRpYWc6IHRzLkRpYWdub3N0aWN8bnVsbCk6IGRpYWcgaXMgdHMuRGlhZ25vc3RpYyA9PiBkaWFnICE9PSBudWxsKVxuICAgICAgICAuY29uY2F0KHJlY29yZC5nZW5lc2lzRGlhZ25vc3RpY3MpO1xuICB9XG59XG4iXX0=