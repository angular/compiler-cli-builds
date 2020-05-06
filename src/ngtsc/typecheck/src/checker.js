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
        function TemplateTypeChecker(originalProgram, typeCheckingStrategy, typeCheckAdapter, config, refEmitter, reflector, compilerHost, priorBuild) {
            this.originalProgram = originalProgram;
            this.typeCheckingStrategy = typeCheckingStrategy;
            this.typeCheckAdapter = typeCheckAdapter;
            this.config = config;
            this.refEmitter = refEmitter;
            this.reflector = reflector;
            this.compilerHost = compilerHost;
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
            var ctx = new context_1.TypeCheckContext(this.config, this.compilerHost, this.refEmitter, this.reflector);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUlILDJFQUErRjtJQUkvRiwrREFBbUM7SUFFbkMseUVBQWtGO0lBQ2xGLGlGQUFtRjtJQUNuRix5RkFBMEU7SUFVMUU7Ozs7T0FJRztJQUNIO1FBR0UsNkJBQ1ksZUFBMkIsRUFDM0Isb0JBQWlELEVBQ2pELGdCQUF5QyxFQUFVLE1BQTBCLEVBQzdFLFVBQTRCLEVBQVUsU0FBeUIsRUFDL0QsWUFBNkIsRUFDN0IsVUFBMkQ7WUFMM0Qsb0JBQWUsR0FBZixlQUFlLENBQVk7WUFDM0IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUE2QjtZQUNqRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXlCO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBb0I7WUFDN0UsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMvRCxpQkFBWSxHQUFaLFlBQVksQ0FBaUI7WUFDN0IsZUFBVSxHQUFWLFVBQVUsQ0FBaUQ7WUFSL0QsVUFBSyxHQUFHLElBQUksR0FBRyxFQUF3QyxDQUFDO1FBUVUsQ0FBQztRQUUzRTs7O1dBR0c7UUFDSCxxQ0FBTyxHQUFQOztZQUNFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7WUFFbkIsSUFBTSxHQUFHLEdBQ0wsSUFBSSwwQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7O2dCQUUxRiwyQkFBMkI7Z0JBQzNCLEtBQWlCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMs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c2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGgsIGdldFNvdXJjZUZpbGVPckVycm9yfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1JlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtJbmNyZW1lbnRhbEJ1aWxkfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9hcGknO1xuaW1wb3J0IHtSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge2lzU2hpbX0gZnJvbSAnLi4vLi4vc2hpbXMnO1xuXG5pbXBvcnQge1R5cGVDaGVja2luZ0NvbmZpZywgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LCBVcGRhdGVNb2RlfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0ZpbGVUeXBlQ2hlY2tpbmdEYXRhLCBUeXBlQ2hlY2tDb250ZXh0LCBUeXBlQ2hlY2tSZXF1ZXN0fSBmcm9tICcuL2NvbnRleHQnO1xuaW1wb3J0IHtzaG91bGRSZXBvcnREaWFnbm9zdGljLCB0cmFuc2xhdGVEaWFnbm9zdGljfSBmcm9tICcuL2RpYWdub3N0aWNzJztcblxuLyoqXG4gKiBJbnRlcmZhY2UgdG8gdHJpZ2dlciBnZW5lcmF0aW9uIG9mIHR5cGUtY2hlY2tpbmcgY29kZSBmb3IgYSBwcm9ncmFtIGdpdmVuIGEgbmV3XG4gKiBgVHlwZUNoZWNrQ29udGV4dGAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXIge1xuICB0eXBlQ2hlY2soc2Y6IHRzLlNvdXJjZUZpbGUsIGN0eDogVHlwZUNoZWNrQ29udGV4dCk6IHZvaWQ7XG59XG5cbi8qKlxuICogUHJpbWFyeSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGVuZ2luZSwgd2hpY2ggcGVyZm9ybXMgdHlwZS1jaGVja2luZyB1c2luZyBhXG4gKiBgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5YCBmb3IgdHlwZS1jaGVja2luZyBwcm9ncmFtIG1haW50ZW5hbmNlLCBhbmQgdGhlXG4gKiBgUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXJgIGZvciBnZW5lcmF0aW9uIG9mIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgY29kZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlVHlwZUNoZWNrZXIge1xuICBwcml2YXRlIGZpbGVzID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRmlsZVR5cGVDaGVja2luZ0RhdGE+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIG9yaWdpbmFsUHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIHByaXZhdGUgdHlwZUNoZWNraW5nU3RyYXRlZ3k6IFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSxcbiAgICAgIHByaXZhdGUgdHlwZUNoZWNrQWRhcHRlcjogUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXIsIHByaXZhdGUgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgY29tcGlsZXJIb3N0OiB0cy5Db21waWxlckhvc3QsXG4gICAgICBwcml2YXRlIHByaW9yQnVpbGQ6IEluY3JlbWVudGFsQnVpbGQ8dW5rbm93biwgRmlsZVR5cGVDaGVja2luZ0RhdGE+KSB7fVxuXG4gIC8qKlxuICAgKiBSZXNldCB0aGUgaW50ZXJuYWwgdHlwZS1jaGVja2luZyBwcm9ncmFtIGJ5IGdlbmVyYXRpbmcgdHlwZS1jaGVja2luZyBjb2RlIGZyb20gdGhlIHVzZXInc1xuICAgKiBwcm9ncmFtLlxuICAgKi9cbiAgcmVmcmVzaCgpOiBUeXBlQ2hlY2tSZXF1ZXN0IHtcbiAgICB0aGlzLmZpbGVzLmNsZWFyKCk7XG5cbiAgICBjb25zdCBjdHggPVxuICAgICAgICBuZXcgVHlwZUNoZWNrQ29udGV4dCh0aGlzLmNvbmZpZywgdGhpcy5jb21waWxlckhvc3QsIHRoaXMucmVmRW1pdHRlciwgdGhpcy5yZWZsZWN0b3IpO1xuXG4gICAgLy8gVHlwZWNoZWNrIGFsbCB0aGUgZmlsZXMuXG4gICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLm9yaWdpbmFsUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUgfHwgaXNTaGltKHNmKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcHJldmlvdXNSZXN1bHRzID0gdGhpcy5wcmlvckJ1aWxkLnByaW9yVHlwZUNoZWNraW5nUmVzdWx0c0ZvcihzZik7XG4gICAgICBpZiAocHJldmlvdXNSZXN1bHRzID09PSBudWxsKSB7XG4gICAgICAgIC8vIFByZXZpb3VzIHJlc3VsdHMgd2VyZSBub3QgYXZhaWxhYmxlLCBzbyBnZW5lcmF0ZSBuZXcgdHlwZS1jaGVja2luZyBjb2RlIGZvciB0aGlzIGZpbGUuXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQWRhcHRlci50eXBlQ2hlY2soc2YsIGN0eCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBQcmV2aW91cyByZXN1bHRzIHdlcmUgYXZhaWxhYmxlLCBhbmQgY2FuIGJlIGFkb3B0ZWQgaW50byB0aGUgY3VycmVudCBidWlsZC5cbiAgICAgICAgY3R4LmFkb3B0UHJpb3JSZXN1bHRzKHNmLCBwcmV2aW91c1Jlc3VsdHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdHMgPSBjdHguZmluYWxpemUoKTtcbiAgICB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LnVwZGF0ZUZpbGVzKHJlc3VsdHMudXBkYXRlcywgVXBkYXRlTW9kZS5Db21wbGV0ZSk7XG4gICAgZm9yIChjb25zdCBbZmlsZSwgZmlsZURhdGFdIG9mIHJlc3VsdHMucGVyRmlsZURhdGEpIHtcbiAgICAgIHRoaXMuZmlsZXMuc2V0KGZpbGUsIGZpbGVEYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0eXBlLWNoZWNraW5nIGRpYWdub3N0aWNzIGZyb20gdGhlIGdpdmVuIGB0cy5Tb3VyY2VGaWxlYCB1c2luZyB0aGUgbW9zdCByZWNlbnRcbiAgICogdHlwZS1jaGVja2luZyBwcm9ncmFtLlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBwYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgaWYgKCF0aGlzLmZpbGVzLmhhcyhwYXRoKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCByZWNvcmQgPSB0aGlzLmZpbGVzLmdldChwYXRoKSE7XG5cbiAgICBjb25zdCB0eXBlQ2hlY2tQcm9ncmFtID0gdGhpcy50eXBlQ2hlY2tpbmdTdHJhdGVneS5nZXRQcm9ncmFtKCk7XG4gICAgY29uc3QgdHlwZUNoZWNrU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcih0eXBlQ2hlY2tQcm9ncmFtLCByZWNvcmQudHlwZUNoZWNrRmlsZSk7XG4gICAgY29uc3QgcmF3RGlhZ25vc3RpY3MgPSBbXTtcbiAgICByYXdEaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyh0eXBlQ2hlY2tTZikpO1xuICAgIGlmIChyZWNvcmQuaGFzSW5saW5lcykge1xuICAgICAgY29uc3QgaW5saW5lU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcih0eXBlQ2hlY2tQcm9ncmFtLCBwYXRoKTtcbiAgICAgIHJhd0RpYWdub3N0aWNzLnB1c2goLi4udHlwZUNoZWNrUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGlubGluZVNmKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJhd0RpYWdub3N0aWNzXG4gICAgICAgIC5tYXAoZGlhZyA9PiB7XG4gICAgICAgICAgaWYgKCFzaG91bGRSZXBvcnREaWFnbm9zdGljKGRpYWcpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRyYW5zbGF0ZURpYWdub3N0aWMoZGlhZywgcmVjb3JkLnNvdXJjZVJlc29sdmVyKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmZpbHRlcigoZGlhZzogdHMuRGlhZ25vc3RpY3xudWxsKTogZGlhZyBpcyB0cy5EaWFnbm9zdGljID0+IGRpYWcgIT09IG51bGwpXG4gICAgICAgIC5jb25jYXQocmVjb3JkLmdlbmVzaXNEaWFnbm9zdGljcyk7XG4gIH1cbn1cbiJdfQ==