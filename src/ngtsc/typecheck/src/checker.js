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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/checker", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/context", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/source", "@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TemplateTypeCheckerImpl = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var context_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/context");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    var source_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/source");
    var template_symbol_builder_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder");
    /**
     * Primary template type-checking engine, which performs type-checking using a
     * `TypeCheckingProgramStrategy` for type-checking program maintenance, and the
     * `ProgramTypeCheckAdapter` for generation of template type-checking code.
     */
    var TemplateTypeCheckerImpl = /** @class */ (function () {
        function TemplateTypeCheckerImpl(originalProgram, typeCheckingStrategy, typeCheckAdapter, config, refEmitter, reflector, compilerHost, priorBuild, componentScopeReader) {
            this.originalProgram = originalProgram;
            this.typeCheckingStrategy = typeCheckingStrategy;
            this.typeCheckAdapter = typeCheckAdapter;
            this.config = config;
            this.refEmitter = refEmitter;
            this.reflector = reflector;
            this.compilerHost = compilerHost;
            this.priorBuild = priorBuild;
            this.componentScopeReader = componentScopeReader;
            this.state = new Map();
            this.isComplete = false;
        }
        TemplateTypeCheckerImpl.prototype.resetOverrides = function () {
            var e_1, _a;
            try {
                for (var _b = tslib_1.__values(this.state.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var fileRecord = _c.value;
                    if (fileRecord.templateOverrides !== null) {
                        fileRecord.templateOverrides = null;
                        fileRecord.shimData.clear();
                        fileRecord.isComplete = false;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        TemplateTypeCheckerImpl.prototype.getTemplate = function (component) {
            var templateData = this.getTemplateData(component);
            if (templateData === null) {
                return null;
            }
            return templateData.template;
        };
        TemplateTypeCheckerImpl.prototype.getTemplateData = function (component) {
            this.ensureShimForComponent(component);
            var sf = component.getSourceFile();
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            var shimPath = this.typeCheckingStrategy.shimPathForComponent(component);
            var fileRecord = this.getFileData(sfPath);
            if (!fileRecord.shimData.has(shimPath)) {
                return null;
            }
            var templateId = fileRecord.sourceManager.getTemplateId(component);
            var shimRecord = fileRecord.shimData.get(shimPath);
            if (!shimRecord.templates.has(templateId)) {
                return null;
            }
            return shimRecord.templates.get(templateId);
        };
        TemplateTypeCheckerImpl.prototype.overrideComponentTemplate = function (component, template) {
            var _a = compiler_1.parseTemplate(template, 'override.html', {
                preserveWhitespaces: true,
                leadingTriviaChars: [],
            }), nodes = _a.nodes, errors = _a.errors;
            if (errors !== null) {
                return { nodes: nodes, errors: errors };
            }
            var filePath = file_system_1.absoluteFromSourceFile(component.getSourceFile());
            var fileRecord = this.getFileData(filePath);
            var id = fileRecord.sourceManager.getTemplateId(component);
            if (fileRecord.templateOverrides === null) {
                fileRecord.templateOverrides = new Map();
            }
            fileRecord.templateOverrides.set(id, nodes);
            // Clear data for the shim in question, so it'll be regenerated on the next request.
            var shimFile = this.typeCheckingStrategy.shimPathForComponent(component);
            fileRecord.shimData.delete(shimFile);
            fileRecord.isComplete = false;
            this.isComplete = false;
            return { nodes: nodes };
        };
        /**
         * Retrieve type-checking diagnostics from the given `ts.SourceFile` using the most recent
         * type-checking program.
         */
        TemplateTypeCheckerImpl.prototype.getDiagnosticsForFile = function (sf, optimizeFor) {
            var e_2, _a;
            switch (optimizeFor) {
                case api_1.OptimizeFor.WholeProgram:
                    this.ensureAllShimsForAllFiles();
                    break;
                case api_1.OptimizeFor.SingleFile:
                    this.ensureAllShimsForOneFile(sf);
                    break;
            }
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            var fileRecord = this.state.get(sfPath);
            var typeCheckProgram = this.typeCheckingStrategy.getProgram();
            var diagnostics = [];
            if (fileRecord.hasInlines) {
                var inlineSf = file_system_1.getSourceFileOrError(typeCheckProgram, sfPath);
                diagnostics.push.apply(diagnostics, tslib_1.__spread(typeCheckProgram.getSemanticDiagnostics(inlineSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); })));
            }
            try {
                for (var _b = tslib_1.__values(fileRecord.shimData), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = tslib_1.__read(_c.value, 2), shimPath = _d[0], shimRecord = _d[1];
                    var shimSf = file_system_1.getSourceFileOrError(typeCheckProgram, shimPath);
                    diagnostics.push.apply(diagnostics, tslib_1.__spread(typeCheckProgram.getSemanticDiagnostics(shimSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); })));
                    diagnostics.push.apply(diagnostics, tslib_1.__spread(shimRecord.genesisDiagnostics));
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return diagnostics.filter(function (diag) { return diag !== null; });
        };
        TemplateTypeCheckerImpl.prototype.getDiagnosticsForComponent = function (component) {
            this.ensureShimForComponent(component);
            var sf = component.getSourceFile();
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            var shimPath = this.typeCheckingStrategy.shimPathForComponent(component);
            var fileRecord = this.getFileData(sfPath);
            if (!fileRecord.shimData.has(shimPath)) {
                return [];
            }
            var templateId = fileRecord.sourceManager.getTemplateId(component);
            var shimRecord = fileRecord.shimData.get(shimPath);
            var typeCheckProgram = this.typeCheckingStrategy.getProgram();
            var diagnostics = [];
            if (shimRecord.hasInlines) {
                var inlineSf = file_system_1.getSourceFileOrError(typeCheckProgram, sfPath);
                diagnostics.push.apply(diagnostics, tslib_1.__spread(typeCheckProgram.getSemanticDiagnostics(inlineSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); })));
            }
            var shimSf = file_system_1.getSourceFileOrError(typeCheckProgram, shimPath);
            diagnostics.push.apply(diagnostics, tslib_1.__spread(typeCheckProgram.getSemanticDiagnostics(shimSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); })));
            diagnostics.push.apply(diagnostics, tslib_1.__spread(shimRecord.genesisDiagnostics));
            return diagnostics.filter(function (diag) {
                return diag !== null && diag.templateId === templateId;
            });
        };
        TemplateTypeCheckerImpl.prototype.getTypeCheckBlock = function (component) {
            this.ensureAllShimsForOneFile(component.getSourceFile());
            var program = this.typeCheckingStrategy.getProgram();
            var filePath = file_system_1.absoluteFromSourceFile(component.getSourceFile());
            var shimPath = this.typeCheckingStrategy.shimPathForComponent(component);
            if (!this.state.has(filePath)) {
                throw new Error("Error: no data for source file: " + filePath);
            }
            var fileRecord = this.state.get(filePath);
            var id = fileRecord.sourceManager.getTemplateId(component);
            var shimSf = typescript_1.getSourceFileOrNull(program, shimPath);
            if (shimSf === null || !fileRecord.shimData.has(shimPath)) {
                throw new Error("Error: no shim file in program: " + shimPath);
            }
            var node = diagnostics_1.findTypeCheckBlock(shimSf, id);
            if (node === null) {
                // Try for an inline block.
                var inlineSf = file_system_1.getSourceFileOrError(program, filePath);
                node = diagnostics_1.findTypeCheckBlock(inlineSf, id);
            }
            return node;
        };
        TemplateTypeCheckerImpl.prototype.maybeAdoptPriorResultsForFile = function (sf) {
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            if (this.state.has(sfPath)) {
                var existingResults = this.state.get(sfPath);
                if (existingResults.templateOverrides !== null) {
                    // Cannot adopt prior results if template overrides have been requested.
                    return;
                }
                if (existingResults.isComplete) {
                    // All data for this file has already been generated, so no need to adopt anything.
                    return;
                }
            }
            var previousResults = this.priorBuild.priorTypeCheckingResultsFor(sf);
            if (previousResults === null || !previousResults.isComplete ||
                previousResults.templateOverrides !== null) {
                return;
            }
            this.state.set(sfPath, previousResults);
        };
        TemplateTypeCheckerImpl.prototype.ensureAllShimsForAllFiles = function () {
            var e_3, _a;
            if (this.isComplete) {
                return;
            }
            var host = new WholeProgramTypeCheckingHost(this);
            var ctx = this.newContext(host);
            try {
                for (var _b = tslib_1.__values(this.originalProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sf = _c.value;
                    if (sf.isDeclarationFile || shims_1.isShim(sf)) {
                        continue;
                    }
                    this.maybeAdoptPriorResultsForFile(sf);
                    var sfPath = file_system_1.absoluteFromSourceFile(sf);
                    var fileData = this.getFileData(sfPath);
                    if (fileData.isComplete) {
                        continue;
                    }
                    this.typeCheckAdapter.typeCheck(sf, ctx);
                    fileData.isComplete = true;
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            this.updateFromContext(ctx);
            this.isComplete = true;
        };
        TemplateTypeCheckerImpl.prototype.ensureAllShimsForOneFile = function (sf) {
            this.maybeAdoptPriorResultsForFile(sf);
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            var fileData = this.getFileData(sfPath);
            if (fileData.isComplete) {
                // All data for this file is present and accounted for already.
                return;
            }
            var host = new SingleFileTypeCheckingHost(sfPath, fileData, this.typeCheckingStrategy, this);
            var ctx = this.newContext(host);
            this.typeCheckAdapter.typeCheck(sf, ctx);
            fileData.isComplete = true;
            this.updateFromContext(ctx);
        };
        TemplateTypeCheckerImpl.prototype.ensureShimForComponent = function (component) {
            var sf = component.getSourceFile();
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            this.maybeAdoptPriorResultsForFile(sf);
            var fileData = this.getFileData(sfPath);
            var shimPath = this.typeCheckingStrategy.shimPathForComponent(component);
            if (fileData.shimData.has(shimPath)) {
                // All data for this component is available.
                return;
            }
            var host = new SingleShimTypeCheckingHost(sfPath, fileData, this.typeCheckingStrategy, this, shimPath);
            var ctx = this.newContext(host);
            this.typeCheckAdapter.typeCheck(sf, ctx);
            this.updateFromContext(ctx);
        };
        TemplateTypeCheckerImpl.prototype.newContext = function (host) {
            var inlining = this.typeCheckingStrategy.supportsInlineOperations ? context_1.InliningMode.InlineOps :
                context_1.InliningMode.Error;
            return new context_1.TypeCheckContextImpl(this.config, this.compilerHost, this.typeCheckingStrategy, this.refEmitter, this.reflector, host, inlining);
        };
        /**
         * Remove any shim data that depends on inline operations applied to the type-checking program.
         *
         * This can be useful if new inlines need to be applied, and it's not possible to guarantee that
         * they won't overwrite or corrupt existing inlines that are used by such shims.
         */
        TemplateTypeCheckerImpl.prototype.clearAllShimDataUsingInlines = function () {
            var e_4, _a, e_5, _b;
            try {
                for (var _c = tslib_1.__values(this.state.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var fileData = _d.value;
                    if (!fileData.hasInlines) {
                        continue;
                    }
                    try {
                        for (var _e = (e_5 = void 0, tslib_1.__values(fileData.shimData.entries())), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var _g = tslib_1.__read(_f.value, 2), shimFile = _g[0], shimData = _g[1];
                            if (shimData.hasInlines) {
                                fileData.shimData.delete(shimFile);
                            }
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                    fileData.hasInlines = false;
                    fileData.isComplete = false;
                    this.isComplete = false;
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_4) throw e_4.error; }
            }
        };
        TemplateTypeCheckerImpl.prototype.updateFromContext = function (ctx) {
            var updates = ctx.finalize();
            this.typeCheckingStrategy.updateFiles(updates, api_1.UpdateMode.Incremental);
            this.priorBuild.recordSuccessfulTypeCheck(this.state);
        };
        TemplateTypeCheckerImpl.prototype.getFileData = function (path) {
            if (!this.state.has(path)) {
                this.state.set(path, {
                    hasInlines: false,
                    templateOverrides: null,
                    sourceManager: new source_1.TemplateSourceManager(),
                    isComplete: false,
                    shimData: new Map(),
                });
            }
            return this.state.get(path);
        };
        TemplateTypeCheckerImpl.prototype.getSymbolOfNode = function (node, component) {
            var tcb = this.getTypeCheckBlock(component);
            if (tcb === null) {
                return null;
            }
            var typeChecker = this.typeCheckingStrategy.getProgram().getTypeChecker();
            var shimPath = this.typeCheckingStrategy.shimPathForComponent(component);
            var data = this.getTemplateData(component);
            if (data === null) {
                return null;
            }
            return new template_symbol_builder_1.SymbolBuilder(typeChecker, shimPath, tcb, data, this.componentScopeReader)
                .getSymbol(node);
        };
        return TemplateTypeCheckerImpl;
    }());
    exports.TemplateTypeCheckerImpl = TemplateTypeCheckerImpl;
    function convertDiagnostic(diag, sourceResolver) {
        if (!diagnostics_1.shouldReportDiagnostic(diag)) {
            return null;
        }
        return diagnostics_1.translateDiagnostic(diag, sourceResolver);
    }
    /**
     * Drives a `TypeCheckContext` to generate type-checking code for every component in the program.
     */
    var WholeProgramTypeCheckingHost = /** @class */ (function () {
        function WholeProgramTypeCheckingHost(impl) {
            this.impl = impl;
        }
        WholeProgramTypeCheckingHost.prototype.getSourceManager = function (sfPath) {
            return this.impl.getFileData(sfPath).sourceManager;
        };
        WholeProgramTypeCheckingHost.prototype.shouldCheckComponent = function (node) {
            var fileData = this.impl.getFileData(file_system_1.absoluteFromSourceFile(node.getSourceFile()));
            var shimPath = this.impl.typeCheckingStrategy.shimPathForComponent(node);
            // The component needs to be checked unless the shim which would contain it already exists.
            return !fileData.shimData.has(shimPath);
        };
        WholeProgramTypeCheckingHost.prototype.getTemplateOverride = function (sfPath, node) {
            var fileData = this.impl.getFileData(sfPath);
            if (fileData.templateOverrides === null) {
                return null;
            }
            var templateId = fileData.sourceManager.getTemplateId(node);
            if (fileData.templateOverrides.has(templateId)) {
                return fileData.templateOverrides.get(templateId);
            }
            return null;
        };
        WholeProgramTypeCheckingHost.prototype.recordShimData = function (sfPath, data) {
            var fileData = this.impl.getFileData(sfPath);
            fileData.shimData.set(data.path, data);
            if (data.hasInlines) {
                fileData.hasInlines = true;
            }
        };
        WholeProgramTypeCheckingHost.prototype.recordComplete = function (sfPath) {
            this.impl.getFileData(sfPath).isComplete = true;
        };
        return WholeProgramTypeCheckingHost;
    }());
    /**
     * Drives a `TypeCheckContext` to generate type-checking code efficiently for a single input file.
     */
    var SingleFileTypeCheckingHost = /** @class */ (function () {
        function SingleFileTypeCheckingHost(sfPath, fileData, strategy, impl) {
            this.sfPath = sfPath;
            this.fileData = fileData;
            this.strategy = strategy;
            this.impl = impl;
            this.seenInlines = false;
        }
        SingleFileTypeCheckingHost.prototype.assertPath = function (sfPath) {
            if (this.sfPath !== sfPath) {
                throw new Error("AssertionError: querying TypeCheckingHost outside of assigned file");
            }
        };
        SingleFileTypeCheckingHost.prototype.getSourceManager = function (sfPath) {
            this.assertPath(sfPath);
            return this.fileData.sourceManager;
        };
        SingleFileTypeCheckingHost.prototype.shouldCheckComponent = function (node) {
            if (this.sfPath !== file_system_1.absoluteFromSourceFile(node.getSourceFile())) {
                return false;
            }
            var shimPath = this.strategy.shimPathForComponent(node);
            // Only need to generate a TCB for the class if no shim exists for it currently.
            return !this.fileData.shimData.has(shimPath);
        };
        SingleFileTypeCheckingHost.prototype.getTemplateOverride = function (sfPath, node) {
            this.assertPath(sfPath);
            if (this.fileData.templateOverrides === null) {
                return null;
            }
            var templateId = this.fileData.sourceManager.getTemplateId(node);
            if (this.fileData.templateOverrides.has(templateId)) {
                return this.fileData.templateOverrides.get(templateId);
            }
            return null;
        };
        SingleFileTypeCheckingHost.prototype.recordShimData = function (sfPath, data) {
            this.assertPath(sfPath);
            // Previous type-checking state may have required the use of inlines (assuming they were
            // supported). If the current operation also requires inlines, this presents a problem:
            // generating new inlines may invalidate any old inlines that old state depends on.
            //
            // Rather than resolve this issue by tracking specific dependencies on inlines, if the new state
            // relies on inlines, any old state that relied on them is simply cleared. This happens when the
            // first new state that uses inlines is encountered.
            if (data.hasInlines && !this.seenInlines) {
                this.impl.clearAllShimDataUsingInlines();
                this.seenInlines = true;
            }
            this.fileData.shimData.set(data.path, data);
            if (data.hasInlines) {
                this.fileData.hasInlines = true;
            }
        };
        SingleFileTypeCheckingHost.prototype.recordComplete = function (sfPath) {
            this.assertPath(sfPath);
            this.fileData.isComplete = true;
        };
        return SingleFileTypeCheckingHost;
    }());
    /**
     * Drives a `TypeCheckContext` to generate type-checking code efficiently for only those components
     * which map to a single shim of a single input file.
     */
    var SingleShimTypeCheckingHost = /** @class */ (function (_super) {
        tslib_1.__extends(SingleShimTypeCheckingHost, _super);
        function SingleShimTypeCheckingHost(sfPath, fileData, strategy, impl, shimPath) {
            var _this = _super.call(this, sfPath, fileData, strategy, impl) || this;
            _this.shimPath = shimPath;
            return _this;
        }
        SingleShimTypeCheckingHost.prototype.shouldCheckNode = function (node) {
            if (this.sfPath !== file_system_1.absoluteFromSourceFile(node.getSourceFile())) {
                return false;
            }
            // Only generate a TCB for the component if it maps to the requested shim file.
            var shimPath = this.strategy.shimPathForComponent(node);
            if (shimPath !== this.shimPath) {
                return false;
            }
            // Only need to generate a TCB for the class if no shim exists for it currently.
            return !this.fileData.shimData.has(shimPath);
        };
        return SingleShimTypeCheckingHost;
    }(SingleFileTypeCheckingHost));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBOEU7SUFHOUUsMkVBQStGO0lBSy9GLCtEQUFtQztJQUNuQyxrRkFBOEQ7SUFDOUQscUVBQWtLO0lBR2xLLGlGQUFtSDtJQUNuSCx5RkFBc0g7SUFDdEgsK0VBQStDO0lBQy9DLGlIQUF3RDtJQUV4RDs7OztPQUlHO0lBQ0g7UUFJRSxpQ0FDWSxlQUEyQixFQUMxQixvQkFBaUQsRUFDbEQsZ0JBQXlDLEVBQVUsTUFBMEIsRUFDN0UsVUFBNEIsRUFBVSxTQUF5QixFQUMvRCxZQUEyRCxFQUMzRCxVQUEyRCxFQUNsRCxvQkFBMEM7WUFObkQsb0JBQWUsR0FBZixlQUFlLENBQVk7WUFDMUIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUE2QjtZQUNsRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXlCO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBb0I7WUFDN0UsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMvRCxpQkFBWSxHQUFaLFlBQVksQ0FBK0M7WUFDM0QsZUFBVSxHQUFWLFVBQVUsQ0FBaUQ7WUFDbEQseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtZQVZ2RCxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXdDLENBQUM7WUFDeEQsZUFBVSxHQUFHLEtBQUssQ0FBQztRQVN1QyxDQUFDO1FBRW5FLGdEQUFjLEdBQWQ7OztnQkFDRSxLQUF5QixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBekMsSUFBTSxVQUFVLFdBQUE7b0JBQ25C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LG9DQUFzQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxFQUFFO2dCQUNoRSxPQUFPLEtBQUssQ0FBQzthQUNkO1lBRUQsK0VBQStFO1lBQy9FLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUQsSUFBSSxRQUFRLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDOUIsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUVELGdGQUFnRjtZQUNoRixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFDSCxpQ0FBQztJQUFELENBQUMsQUFyQkQsQ0FBeUMsMEJBQTBCLEdBcUJsRSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgUGFyc2VFcnJvciwgcGFyc2VUZW1wbGF0ZSwgVG1wbEFzdE5vZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRoLCBnZXRTb3VyY2VGaWxlT3JFcnJvcn0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7SW5jcmVtZW50YWxCdWlsZH0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvYXBpJztcbmltcG9ydCB7UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlcn0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtpc1NoaW19IGZyb20gJy4uLy4uL3NoaW1zJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZU9yTnVsbH0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5pbXBvcnQge09wdGltaXplRm9yLCBQcm9ncmFtVHlwZUNoZWNrQWRhcHRlciwgU3ltYm9sLCBUZW1wbGF0ZUlkLCBUZW1wbGF0ZVR5cGVDaGVja2VyLCBUeXBlQ2hlY2tpbmdDb25maWcsIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSwgVXBkYXRlTW9kZX0gZnJvbSAnLi4vYXBpJztcbmltcG9ydCB7VGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuLi9kaWFnbm9zdGljcyc7XG5cbmltcG9ydCB7SW5saW5pbmdNb2RlLCBTaGltVHlwZUNoZWNraW5nRGF0YSwgVGVtcGxhdGVEYXRhLCBUeXBlQ2hlY2tDb250ZXh0SW1wbCwgVHlwZUNoZWNraW5nSG9zdH0gZnJvbSAnLi9jb250ZXh0JztcbmltcG9ydCB7ZmluZFR5cGVDaGVja0Jsb2NrLCBzaG91bGRSZXBvcnREaWFnbm9zdGljLCBUZW1wbGF0ZVNvdXJjZVJlc29sdmVyLCB0cmFuc2xhdGVEaWFnbm9zdGljfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7VGVtcGxhdGVTb3VyY2VNYW5hZ2VyfSBmcm9tICcuL3NvdXJjZSc7XG5pbXBvcnQge1N5bWJvbEJ1aWxkZXJ9IGZyb20gJy4vdGVtcGxhdGVfc3ltYm9sX2J1aWxkZXInO1xuXG4vKipcbiAqIFByaW1hcnkgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBlbmdpbmUsIHdoaWNoIHBlcmZvcm1zIHR5cGUtY2hlY2tpbmcgdXNpbmcgYVxuICogYFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneWAgZm9yIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbSBtYWludGVuYW5jZSwgYW5kIHRoZVxuICogYFByb2dyYW1UeXBlQ2hlY2tBZGFwdGVyYCBmb3IgZ2VuZXJhdGlvbiBvZiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGNvZGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbCBpbXBsZW1lbnRzIFRlbXBsYXRlVHlwZUNoZWNrZXIge1xuICBwcml2YXRlIHN0YXRlID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRmlsZVR5cGVDaGVja2luZ0RhdGE+KCk7XG4gIHByaXZhdGUgaXNDb21wbGV0ZSA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBvcmlnaW5hbFByb2dyYW06IHRzLlByb2dyYW0sXG4gICAgICByZWFkb25seSB0eXBlQ2hlY2tpbmdTdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LFxuICAgICAgcHJpdmF0ZSB0eXBlQ2hlY2tBZGFwdGVyOiBQcm9ncmFtVHlwZUNoZWNrQWRhcHRlciwgcHJpdmF0ZSBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZyxcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJpdmF0ZSBjb21waWxlckhvc3Q6IFBpY2s8dHMuQ29tcGlsZXJIb3N0LCAnZ2V0Q2Fub25pY2FsRmlsZU5hbWUnPixcbiAgICAgIHByaXZhdGUgcHJpb3JCdWlsZDogSW5jcmVtZW50YWxCdWlsZDx1bmtub3duLCBGaWxlVHlwZUNoZWNraW5nRGF0YT4sXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGNvbXBvbmVudFNjb3BlUmVhZGVyOiBDb21wb25lbnRTY29wZVJlYWRlcikge31cblxuICByZXNldE92ZXJyaWRlcygpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGZpbGVSZWNvcmQgb2YgdGhpcy5zdGF0ZS52YWx1ZXMoKSkge1xuICAgICAgaWYgKGZpbGVSZWNvcmQudGVtcGxhdGVPdmVycmlkZXMgIT09IG51bGwpIHtcbiAgICAgICAgZmlsZVJlY29yZC50ZW1wbGF0ZU92ZXJyaWRlcyA9IG51bGw7XG4gICAgICAgIGZpbGVSZWNvcmQuc2hpbURhdGEuY2xlYXIoKTtcbiAgICAgICAgZmlsZVJlY29yZC5pc0NvbXBsZXRlID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0VGVtcGxhdGUoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogVG1wbEFzdE5vZGVbXXxudWxsIHtcbiAgICBjb25zdCB0ZW1wbGF0ZURhdGEgPSB0aGlzLmdldFRlbXBsYXRlRGF0YShjb21wb25lbnQpO1xuICAgIGlmICh0ZW1wbGF0ZURhdGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGVtcGxhdGVEYXRhLnRlbXBsYXRlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZURhdGEoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogVGVtcGxhdGVEYXRhfG51bGwge1xuICAgIHRoaXMuZW5zdXJlU2hpbUZvckNvbXBvbmVudChjb21wb25lbnQpO1xuXG4gICAgY29uc3Qgc2YgPSBjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpO1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgIGNvbnN0IHNoaW1QYXRoID0gdGhpcy50eXBlQ2hlY2tpbmdTdHJhdGVneS5zaGltUGF0aEZvckNvbXBvbmVudChjb21wb25lbnQpO1xuXG4gICAgY29uc3QgZmlsZVJlY29yZCA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcblxuICAgIGlmICghZmlsZVJlY29yZC5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUlkID0gZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQoY29tcG9uZW50KTtcbiAgICBjb25zdCBzaGltUmVjb3JkID0gZmlsZVJlY29yZC5zaGltRGF0YS5nZXQoc2hpbVBhdGgpITtcblxuICAgIGlmICghc2hpbVJlY29yZC50ZW1wbGF0ZXMuaGFzKHRlbXBsYXRlSWQpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gc2hpbVJlY29yZC50ZW1wbGF0ZXMuZ2V0KHRlbXBsYXRlSWQpITtcbiAgfVxuXG4gIG92ZXJyaWRlQ29tcG9uZW50VGVtcGxhdGUoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCB0ZW1wbGF0ZTogc3RyaW5nKTpcbiAgICAgIHtub2RlczogVG1wbEFzdE5vZGVbXSwgZXJyb3JzPzogUGFyc2VFcnJvcltdfSB7XG4gICAgY29uc3Qge25vZGVzLCBlcnJvcnN9ID0gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZSwgJ292ZXJyaWRlLmh0bWwnLCB7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0cnVlLFxuICAgICAgbGVhZGluZ1RyaXZpYUNoYXJzOiBbXSxcbiAgICB9KTtcblxuICAgIGlmIChlcnJvcnMgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7bm9kZXMsIGVycm9yc307XG4gICAgfVxuXG4gICAgY29uc3QgZmlsZVBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGNvbXBvbmVudC5nZXRTb3VyY2VGaWxlKCkpO1xuXG4gICAgY29uc3QgZmlsZVJlY29yZCA9IHRoaXMuZ2V0RmlsZURhdGEoZmlsZVBhdGgpO1xuICAgIGNvbnN0IGlkID0gZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQoY29tcG9uZW50KTtcblxuICAgIGlmIChmaWxlUmVjb3JkLnRlbXBsYXRlT3ZlcnJpZGVzID09PSBudWxsKSB7XG4gICAgICBmaWxlUmVjb3JkLnRlbXBsYXRlT3ZlcnJpZGVzID0gbmV3IE1hcCgpO1xuICAgIH1cblxuICAgIGZpbGVSZWNvcmQudGVtcGxhdGVPdmVycmlkZXMuc2V0KGlkLCBub2Rlcyk7XG5cbiAgICAvLyBDbGVhciBkYXRhIGZvciB0aGUgc2hpbSBpbiBxdWVzdGlvbiwgc28gaXQnbGwgYmUgcmVnZW5lcmF0ZWQgb24gdGhlIG5leHQgcmVxdWVzdC5cbiAgICBjb25zdCBzaGltRmlsZSA9IHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kuc2hpbVBhdGhGb3JDb21wb25lbnQoY29tcG9uZW50KTtcbiAgICBmaWxlUmVjb3JkLnNoaW1EYXRhLmRlbGV0ZShzaGltRmlsZSk7XG4gICAgZmlsZVJlY29yZC5pc0NvbXBsZXRlID0gZmFsc2U7XG4gICAgdGhpcy5pc0NvbXBsZXRlID0gZmFsc2U7XG5cbiAgICByZXR1cm4ge25vZGVzfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0eXBlLWNoZWNraW5nIGRpYWdub3N0aWNzIGZyb20gdGhlIGdpdmVuIGB0cy5Tb3VyY2VGaWxlYCB1c2luZyB0aGUgbW9zdCByZWNlbnRcbiAgICogdHlwZS1jaGVja2luZyBwcm9ncmFtLlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlLCBvcHRpbWl6ZUZvcjogT3B0aW1pemVGb3IpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHN3aXRjaCAob3B0aW1pemVGb3IpIHtcbiAgICAgIGNhc2UgT3B0aW1pemVGb3IuV2hvbGVQcm9ncmFtOlxuICAgICAgICB0aGlzLmVuc3VyZUFsbFNoaW1zRm9yQWxsRmlsZXMoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIE9wdGltaXplRm9yLlNpbmdsZUZpbGU6XG4gICAgICAgIHRoaXMuZW5zdXJlQWxsU2hpbXNGb3JPbmVGaWxlKHNmKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgY29uc3QgZmlsZVJlY29yZCA9IHRoaXMuc3RhdGUuZ2V0KHNmUGF0aCkhO1xuXG4gICAgY29uc3QgdHlwZUNoZWNrUHJvZ3JhbSA9IHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpO1xuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6ICh0cy5EaWFnbm9zdGljfG51bGwpW10gPSBbXTtcbiAgICBpZiAoZmlsZVJlY29yZC5oYXNJbmxpbmVzKSB7XG4gICAgICBjb25zdCBpbmxpbmVTZiA9IGdldFNvdXJjZUZpbGVPckVycm9yKHR5cGVDaGVja1Byb2dyYW0sIHNmUGF0aCk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhpbmxpbmVTZikubWFwKFxuICAgICAgICAgIGRpYWcgPT4gY29udmVydERpYWdub3N0aWMoZGlhZywgZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyKSkpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgW3NoaW1QYXRoLCBzaGltUmVjb3JkXSBvZiBmaWxlUmVjb3JkLnNoaW1EYXRhKSB7XG4gICAgICBjb25zdCBzaGltU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcih0eXBlQ2hlY2tQcm9ncmFtLCBzaGltUGF0aCk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzaGltU2YpLm1hcChcbiAgICAgICAgICBkaWFnID0+IGNvbnZlcnREaWFnbm9zdGljKGRpYWcsIGZpbGVSZWNvcmQuc291cmNlTWFuYWdlcikpKTtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uc2hpbVJlY29yZC5nZW5lc2lzRGlhZ25vc3RpY3MpO1xuICAgIH1cblxuICAgIHJldHVybiBkaWFnbm9zdGljcy5maWx0ZXIoKGRpYWc6IHRzLkRpYWdub3N0aWN8bnVsbCk6IGRpYWcgaXMgdHMuRGlhZ25vc3RpYyA9PiBkaWFnICE9PSBudWxsKTtcbiAgfVxuXG4gIGdldERpYWdub3N0aWNzRm9yQ29tcG9uZW50KGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgdGhpcy5lbnN1cmVTaGltRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG5cbiAgICBjb25zdCBzZiA9IGNvbXBvbmVudC5nZXRTb3VyY2VGaWxlKCk7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgY29uc3Qgc2hpbVBhdGggPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LnNoaW1QYXRoRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG5cbiAgICBjb25zdCBmaWxlUmVjb3JkID0gdGhpcy5nZXRGaWxlRGF0YShzZlBhdGgpO1xuXG4gICAgaWYgKCFmaWxlUmVjb3JkLnNoaW1EYXRhLmhhcyhzaGltUGF0aCkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUlkID0gZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQoY29tcG9uZW50KTtcbiAgICBjb25zdCBzaGltUmVjb3JkID0gZmlsZVJlY29yZC5zaGltRGF0YS5nZXQoc2hpbVBhdGgpITtcblxuICAgIGNvbnN0IHR5cGVDaGVja1Byb2dyYW0gPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LmdldFByb2dyYW0oKTtcblxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiAoVGVtcGxhdGVEaWFnbm9zdGljfG51bGwpW10gPSBbXTtcbiAgICBpZiAoc2hpbVJlY29yZC5oYXNJbmxpbmVzKSB7XG4gICAgICBjb25zdCBpbmxpbmVTZiA9IGdldFNvdXJjZUZpbGVPckVycm9yKHR5cGVDaGVja1Byb2dyYW0sIHNmUGF0aCk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhpbmxpbmVTZikubWFwKFxuICAgICAgICAgIGRpYWcgPT4gY29udmVydERpYWdub3N0aWMoZGlhZywgZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyKSkpO1xuICAgIH1cblxuICAgIGNvbnN0IHNoaW1TZiA9IGdldFNvdXJjZUZpbGVPckVycm9yKHR5cGVDaGVja1Byb2dyYW0sIHNoaW1QYXRoKTtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzaGltU2YpLm1hcChcbiAgICAgICAgZGlhZyA9PiBjb252ZXJ0RGlhZ25vc3RpYyhkaWFnLCBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIpKSk7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5zaGltUmVjb3JkLmdlbmVzaXNEaWFnbm9zdGljcyk7XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3MuZmlsdGVyKFxuICAgICAgICAoZGlhZzogVGVtcGxhdGVEaWFnbm9zdGljfG51bGwpOiBkaWFnIGlzIFRlbXBsYXRlRGlhZ25vc3RpYyA9PlxuICAgICAgICAgICAgZGlhZyAhPT0gbnVsbCAmJiBkaWFnLnRlbXBsYXRlSWQgPT09IHRlbXBsYXRlSWQpO1xuICB9XG5cbiAgZ2V0VHlwZUNoZWNrQmxvY2soY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdHMuTm9kZXxudWxsIHtcbiAgICB0aGlzLmVuc3VyZUFsbFNoaW1zRm9yT25lRmlsZShjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpKTtcblxuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LmdldFByb2dyYW0oKTtcbiAgICBjb25zdCBmaWxlUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoY29tcG9uZW50LmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3Qgc2hpbVBhdGggPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LnNoaW1QYXRoRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG5cbiAgICBpZiAoIXRoaXMuc3RhdGUuaGFzKGZpbGVQYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvcjogbm8gZGF0YSBmb3Igc291cmNlIGZpbGU6ICR7ZmlsZVBhdGh9YCk7XG4gICAgfVxuICAgIGNvbnN0IGZpbGVSZWNvcmQgPSB0aGlzLnN0YXRlLmdldChmaWxlUGF0aCkhO1xuICAgIGNvbnN0IGlkID0gZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQoY29tcG9uZW50KTtcblxuICAgIGNvbnN0IHNoaW1TZiA9IGdldFNvdXJjZUZpbGVPck51bGwocHJvZ3JhbSwgc2hpbVBhdGgpO1xuICAgIGlmIChzaGltU2YgPT09IG51bGwgfHwgIWZpbGVSZWNvcmQuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvcjogbm8gc2hpbSBmaWxlIGluIHByb2dyYW06ICR7c2hpbVBhdGh9YCk7XG4gICAgfVxuXG4gICAgbGV0IG5vZGU6IHRzLk5vZGV8bnVsbCA9IGZpbmRUeXBlQ2hlY2tCbG9jayhzaGltU2YsIGlkKTtcbiAgICBpZiAobm9kZSA9PT0gbnVsbCkge1xuICAgICAgLy8gVHJ5IGZvciBhbiBpbmxpbmUgYmxvY2suXG4gICAgICBjb25zdCBpbmxpbmVTZiA9IGdldFNvdXJjZUZpbGVPckVycm9yKHByb2dyYW0sIGZpbGVQYXRoKTtcbiAgICAgIG5vZGUgPSBmaW5kVHlwZUNoZWNrQmxvY2soaW5saW5lU2YsIGlkKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHByaXZhdGUgbWF5YmVBZG9wdFByaW9yUmVzdWx0c0ZvckZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5oYXMoc2ZQYXRoKSkge1xuICAgICAgY29uc3QgZXhpc3RpbmdSZXN1bHRzID0gdGhpcy5zdGF0ZS5nZXQoc2ZQYXRoKSE7XG4gICAgICBpZiAoZXhpc3RpbmdSZXN1bHRzLnRlbXBsYXRlT3ZlcnJpZGVzICE9PSBudWxsKSB7XG4gICAgICAgIC8vIENhbm5vdCBhZG9wdCBwcmlvciByZXN1bHRzIGlmIHRlbXBsYXRlIG92ZXJyaWRlcyBoYXZlIGJlZW4gcmVxdWVzdGVkLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChleGlzdGluZ1Jlc3VsdHMuaXNDb21wbGV0ZSkge1xuICAgICAgICAvLyBBbGwgZGF0YSBmb3IgdGhpcyBmaWxlIGhhcyBhbHJlYWR5IGJlZW4gZ2VuZXJhdGVkLCBzbyBubyBuZWVkIHRvIGFkb3B0IGFueXRoaW5nLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcHJldmlvdXNSZXN1bHRzID0gdGhpcy5wcmlvckJ1aWxkLnByaW9yVHlwZUNoZWNraW5nUmVzdWx0c0ZvcihzZik7XG4gICAgaWYgKHByZXZpb3VzUmVzdWx0cyA9PT0gbnVsbCB8fCAhcHJldmlvdXNSZXN1bHRzLmlzQ29tcGxldGUgfHxcbiAgICAgICAgcHJldmlvdXNSZXN1bHRzLnRlbXBsYXRlT3ZlcnJpZGVzICE9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0ZS5zZXQoc2ZQYXRoLCBwcmV2aW91c1Jlc3VsdHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbGxTaGltc0ZvckFsbEZpbGVzKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlzQ29tcGxldGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBob3N0ID0gbmV3IFdob2xlUHJvZ3JhbVR5cGVDaGVja2luZ0hvc3QodGhpcyk7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5uZXdDb250ZXh0KGhvc3QpO1xuXG4gICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLm9yaWdpbmFsUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUgfHwgaXNTaGltKHNmKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5tYXliZUFkb3B0UHJpb3JSZXN1bHRzRm9yRmlsZShzZik7XG5cbiAgICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmdldEZpbGVEYXRhKHNmUGF0aCk7XG4gICAgICBpZiAoZmlsZURhdGEuaXNDb21wbGV0ZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50eXBlQ2hlY2tBZGFwdGVyLnR5cGVDaGVjayhzZiwgY3R4KTtcblxuICAgICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVGcm9tQ29udGV4dChjdHgpO1xuICAgIHRoaXMuaXNDb21wbGV0ZSA9IHRydWU7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUFsbFNoaW1zRm9yT25lRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHRoaXMubWF5YmVBZG9wdFByaW9yUmVzdWx0c0ZvckZpbGUoc2YpO1xuXG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG5cbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcbiAgICBpZiAoZmlsZURhdGEuaXNDb21wbGV0ZSkge1xuICAgICAgLy8gQWxsIGRhdGEgZm9yIHRoaXMgZmlsZSBpcyBwcmVzZW50IGFuZCBhY2NvdW50ZWQgZm9yIGFscmVhZHkuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgaG9zdCA9IG5ldyBTaW5nbGVGaWxlVHlwZUNoZWNraW5nSG9zdChzZlBhdGgsIGZpbGVEYXRhLCB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LCB0aGlzKTtcbiAgICBjb25zdCBjdHggPSB0aGlzLm5ld0NvbnRleHQoaG9zdCk7XG5cbiAgICB0aGlzLnR5cGVDaGVja0FkYXB0ZXIudHlwZUNoZWNrKHNmLCBjdHgpO1xuXG4gICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG5cbiAgICB0aGlzLnVwZGF0ZUZyb21Db250ZXh0KGN0eCk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZVNoaW1Gb3JDb21wb25lbnQoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgY29uc3Qgc2YgPSBjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpO1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuXG4gICAgdGhpcy5tYXliZUFkb3B0UHJpb3JSZXN1bHRzRm9yRmlsZShzZik7XG5cbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcbiAgICBjb25zdCBzaGltUGF0aCA9IHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kuc2hpbVBhdGhGb3JDb21wb25lbnQoY29tcG9uZW50KTtcblxuICAgIGlmIChmaWxlRGF0YS5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICAvLyBBbGwgZGF0YSBmb3IgdGhpcyBjb21wb25lbnQgaXMgYXZhaWxhYmxlLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGhvc3QgPVxuICAgICAgICBuZXcgU2luZ2xlU2hpbVR5cGVDaGVja2luZ0hvc3Qoc2ZQYXRoLCBmaWxlRGF0YSwgdGhpcy50eXBlQ2hlY2tpbmdTdHJhdGVneSwgdGhpcywgc2hpbVBhdGgpO1xuICAgIGNvbnN0IGN0eCA9IHRoaXMubmV3Q29udGV4dChob3N0KTtcblxuICAgIHRoaXMudHlwZUNoZWNrQWRhcHRlci50eXBlQ2hlY2soc2YsIGN0eCk7XG4gICAgdGhpcy51cGRhdGVGcm9tQ29udGV4dChjdHgpO1xuICB9XG5cbiAgcHJpdmF0ZSBuZXdDb250ZXh0KGhvc3Q6IFR5cGVDaGVja2luZ0hvc3QpOiBUeXBlQ2hlY2tDb250ZXh0SW1wbCB7XG4gICAgY29uc3QgaW5saW5pbmcgPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LnN1cHBvcnRzSW5saW5lT3BlcmF0aW9ucyA/IElubGluaW5nTW9kZS5JbmxpbmVPcHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJbmxpbmluZ01vZGUuRXJyb3I7XG4gICAgcmV0dXJuIG5ldyBUeXBlQ2hlY2tDb250ZXh0SW1wbChcbiAgICAgICAgdGhpcy5jb25maWcsIHRoaXMuY29tcGlsZXJIb3N0LCB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yLFxuICAgICAgICBob3N0LCBpbmxpbmluZyk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGFueSBzaGltIGRhdGEgdGhhdCBkZXBlbmRzIG9uIGlubGluZSBvcGVyYXRpb25zIGFwcGxpZWQgdG8gdGhlIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbS5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgdXNlZnVsIGlmIG5ldyBpbmxpbmVzIG5lZWQgdG8gYmUgYXBwbGllZCwgYW5kIGl0J3Mgbm90IHBvc3NpYmxlIHRvIGd1YXJhbnRlZSB0aGF0XG4gICAqIHRoZXkgd29uJ3Qgb3ZlcndyaXRlIG9yIGNvcnJ1cHQgZXhpc3RpbmcgaW5saW5lcyB0aGF0IGFyZSB1c2VkIGJ5IHN1Y2ggc2hpbXMuXG4gICAqL1xuICBjbGVhckFsbFNoaW1EYXRhVXNpbmdJbmxpbmVzKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZmlsZURhdGEgb2YgdGhpcy5zdGF0ZS52YWx1ZXMoKSkge1xuICAgICAgaWYgKCFmaWxlRGF0YS5oYXNJbmxpbmVzKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IFtzaGltRmlsZSwgc2hpbURhdGFdIG9mIGZpbGVEYXRhLnNoaW1EYXRhLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoc2hpbURhdGEuaGFzSW5saW5lcykge1xuICAgICAgICAgIGZpbGVEYXRhLnNoaW1EYXRhLmRlbGV0ZShzaGltRmlsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IGZhbHNlO1xuICAgICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IGZhbHNlO1xuICAgICAgdGhpcy5pc0NvbXBsZXRlID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVGcm9tQ29udGV4dChjdHg6IFR5cGVDaGVja0NvbnRleHRJbXBsKTogdm9pZCB7XG4gICAgY29uc3QgdXBkYXRlcyA9IGN0eC5maW5hbGl6ZSgpO1xuICAgIHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kudXBkYXRlRmlsZXModXBkYXRlcywgVXBkYXRlTW9kZS5JbmNyZW1lbnRhbCk7XG4gICAgdGhpcy5wcmlvckJ1aWxkLnJlY29yZFN1Y2Nlc3NmdWxUeXBlQ2hlY2sodGhpcy5zdGF0ZSk7XG4gIH1cblxuICBnZXRGaWxlRGF0YShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEZpbGVUeXBlQ2hlY2tpbmdEYXRhIHtcbiAgICBpZiAoIXRoaXMuc3RhdGUuaGFzKHBhdGgpKSB7XG4gICAgICB0aGlzLnN0YXRlLnNldChwYXRoLCB7XG4gICAgICAgIGhhc0lubGluZXM6IGZhbHNlLFxuICAgICAgICB0ZW1wbGF0ZU92ZXJyaWRlczogbnVsbCxcbiAgICAgICAgc291cmNlTWFuYWdlcjogbmV3IFRlbXBsYXRlU291cmNlTWFuYWdlcigpLFxuICAgICAgICBpc0NvbXBsZXRlOiBmYWxzZSxcbiAgICAgICAgc2hpbURhdGE6IG5ldyBNYXAoKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5nZXQocGF0aCkhO1xuICB9XG5cbiAgZ2V0U3ltYm9sT2ZOb2RlKG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IHRjYiA9IHRoaXMuZ2V0VHlwZUNoZWNrQmxvY2soY29tcG9uZW50KTtcbiAgICBpZiAodGNiID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlQ2hlY2tlciA9IHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpLmdldFR5cGVDaGVja2VyKCk7XG4gICAgY29uc3Qgc2hpbVBhdGggPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LnNoaW1QYXRoRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0VGVtcGxhdGVEYXRhKGNvbXBvbmVudCk7XG4gICAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgU3ltYm9sQnVpbGRlcih0eXBlQ2hlY2tlciwgc2hpbVBhdGgsIHRjYiwgZGF0YSwgdGhpcy5jb21wb25lbnRTY29wZVJlYWRlcilcbiAgICAgICAgLmdldFN5bWJvbChub2RlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb252ZXJ0RGlhZ25vc3RpYyhcbiAgICBkaWFnOiB0cy5EaWFnbm9zdGljLCBzb3VyY2VSZXNvbHZlcjogVGVtcGxhdGVTb3VyY2VSZXNvbHZlcik6IFRlbXBsYXRlRGlhZ25vc3RpY3xudWxsIHtcbiAgaWYgKCFzaG91bGRSZXBvcnREaWFnbm9zdGljKGRpYWcpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHRyYW5zbGF0ZURpYWdub3N0aWMoZGlhZywgc291cmNlUmVzb2x2ZXIpO1xufVxuXG4vKipcbiAqIERhdGEgZm9yIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgcmVsYXRlZCB0byBhIHNwZWNpZmljIGlucHV0IGZpbGUgaW4gdGhlIHVzZXIncyBwcm9ncmFtICh3aGljaFxuICogY29udGFpbnMgY29tcG9uZW50cyB0byBiZSBjaGVja2VkKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGaWxlVHlwZUNoZWNraW5nRGF0YSB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSB0eXBlLWNoZWNraW5nIHNoaW0gcmVxdWlyZWQgYW55IGlubGluZSBjaGFuZ2VzIHRvIHRoZSBvcmlnaW5hbCBmaWxlLCB3aGljaCBhZmZlY3RzXG4gICAqIHdoZXRoZXIgdGhlIHNoaW0gY2FuIGJlIHJldXNlZC5cbiAgICovXG4gIGhhc0lubGluZXM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFNvdXJjZSBtYXBwaW5nIGluZm9ybWF0aW9uIGZvciBtYXBwaW5nIGRpYWdub3N0aWNzIGZyb20gaW5saW5lZCB0eXBlIGNoZWNrIGJsb2NrcyBiYWNrIHRvIHRoZVxuICAgKiBvcmlnaW5hbCB0ZW1wbGF0ZS5cbiAgICovXG4gIHNvdXJjZU1hbmFnZXI6IFRlbXBsYXRlU291cmNlTWFuYWdlcjtcblxuICAvKipcbiAgICogTWFwIG9mIHRlbXBsYXRlIG92ZXJyaWRlcyBhcHBsaWVkIHRvIGFueSBjb21wb25lbnRzIGluIHRoaXMgaW5wdXQgZmlsZS5cbiAgICovXG4gIHRlbXBsYXRlT3ZlcnJpZGVzOiBNYXA8VGVtcGxhdGVJZCwgVG1wbEFzdE5vZGVbXT58bnVsbDtcblxuICAvKipcbiAgICogRGF0YSBmb3IgZWFjaCBzaGltIGdlbmVyYXRlZCBmcm9tIHRoaXMgaW5wdXQgZmlsZS5cbiAgICpcbiAgICogQSBzaW5nbGUgaW5wdXQgZmlsZSB3aWxsIGdlbmVyYXRlIG9uZSBvciBtb3JlIHNoaW0gZmlsZXMgdGhhdCBhY3R1YWxseSBjb250YWluIHRlbXBsYXRlXG4gICAqIHR5cGUtY2hlY2tpbmcgY29kZS5cbiAgICovXG4gIHNoaW1EYXRhOiBNYXA8QWJzb2x1dGVGc1BhdGgsIFNoaW1UeXBlQ2hlY2tpbmdEYXRhPjtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2VyIGlzIGNlcnRhaW4gdGhhdCBhbGwgY29tcG9uZW50cyBmcm9tIHRoaXMgaW5wdXQgZmlsZSBoYXZlIGhhZFxuICAgKiB0eXBlLWNoZWNraW5nIGNvZGUgZ2VuZXJhdGVkIGludG8gc2hpbXMuXG4gICAqL1xuICBpc0NvbXBsZXRlOiBib29sZWFuO1xufVxuXG4vKipcbiAqIERyaXZlcyBhIGBUeXBlQ2hlY2tDb250ZXh0YCB0byBnZW5lcmF0ZSB0eXBlLWNoZWNraW5nIGNvZGUgZm9yIGV2ZXJ5IGNvbXBvbmVudCBpbiB0aGUgcHJvZ3JhbS5cbiAqL1xuY2xhc3MgV2hvbGVQcm9ncmFtVHlwZUNoZWNraW5nSG9zdCBpbXBsZW1lbnRzIFR5cGVDaGVja2luZ0hvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGltcGw6IFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsKSB7fVxuXG4gIGdldFNvdXJjZU1hbmFnZXIoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFRlbXBsYXRlU291cmNlTWFuYWdlciB7XG4gICAgcmV0dXJuIHRoaXMuaW1wbC5nZXRGaWxlRGF0YShzZlBhdGgpLnNvdXJjZU1hbmFnZXI7XG4gIH1cblxuICBzaG91bGRDaGVja0NvbXBvbmVudChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmltcGwuZ2V0RmlsZURhdGEoYWJzb2x1dGVGcm9tU291cmNlRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSkpO1xuICAgIGNvbnN0IHNoaW1QYXRoID0gdGhpcy5pbXBsLnR5cGVDaGVja2luZ1N0cmF0ZWd5LnNoaW1QYXRoRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIC8vIFRoZSBjb21wb25lbnQgbmVlZHMgdG8gYmUgY2hlY2tlZCB1bmxlc3MgdGhlIHNoaW0gd2hpY2ggd291bGQgY29udGFpbiBpdCBhbHJlYWR5IGV4aXN0cy5cbiAgICByZXR1cm4gIWZpbGVEYXRhLnNoaW1EYXRhLmhhcyhzaGltUGF0aCk7XG4gIH1cblxuICBnZXRUZW1wbGF0ZU92ZXJyaWRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBUbXBsQXN0Tm9kZVtdfG51bGwge1xuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5pbXBsLmdldEZpbGVEYXRhKHNmUGF0aCk7XG4gICAgaWYgKGZpbGVEYXRhLnRlbXBsYXRlT3ZlcnJpZGVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUlkID0gZmlsZURhdGEuc291cmNlTWFuYWdlci5nZXRUZW1wbGF0ZUlkKG5vZGUpO1xuICAgIGlmIChmaWxlRGF0YS50ZW1wbGF0ZU92ZXJyaWRlcy5oYXModGVtcGxhdGVJZCkpIHtcbiAgICAgIHJldHVybiBmaWxlRGF0YS50ZW1wbGF0ZU92ZXJyaWRlcy5nZXQodGVtcGxhdGVJZCkhO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmVjb3JkU2hpbURhdGEoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogU2hpbVR5cGVDaGVja2luZ0RhdGEpOiB2b2lkIHtcbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuaW1wbC5nZXRGaWxlRGF0YShzZlBhdGgpO1xuICAgIGZpbGVEYXRhLnNoaW1EYXRhLnNldChkYXRhLnBhdGgsIGRhdGEpO1xuICAgIGlmIChkYXRhLmhhc0lubGluZXMpIHtcbiAgICAgIGZpbGVEYXRhLmhhc0lubGluZXMgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJlY29yZENvbXBsZXRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aGlzLmltcGwuZ2V0RmlsZURhdGEoc2ZQYXRoKS5pc0NvbXBsZXRlID0gdHJ1ZTtcbiAgfVxufVxuXG4vKipcbiAqIERyaXZlcyBhIGBUeXBlQ2hlY2tDb250ZXh0YCB0byBnZW5lcmF0ZSB0eXBlLWNoZWNraW5nIGNvZGUgZWZmaWNpZW50bHkgZm9yIGEgc2luZ2xlIGlucHV0IGZpbGUuXG4gKi9cbmNsYXNzIFNpbmdsZUZpbGVUeXBlQ2hlY2tpbmdIb3N0IGltcGxlbWVudHMgVHlwZUNoZWNraW5nSG9zdCB7XG4gIHByaXZhdGUgc2VlbklubGluZXMgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBzZlBhdGg6IEFic29sdXRlRnNQYXRoLCBwcm90ZWN0ZWQgZmlsZURhdGE6IEZpbGVUeXBlQ2hlY2tpbmdEYXRhLFxuICAgICAgcHJvdGVjdGVkIHN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksIHByb3RlY3RlZCBpbXBsOiBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbCkge31cblxuICBwcml2YXRlIGFzc2VydFBhdGgoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnNmUGF0aCAhPT0gc2ZQYXRoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbkVycm9yOiBxdWVyeWluZyBUeXBlQ2hlY2tpbmdIb3N0IG91dHNpZGUgb2YgYXNzaWduZWQgZmlsZWApO1xuICAgIH1cbiAgfVxuXG4gIGdldFNvdXJjZU1hbmFnZXIoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFRlbXBsYXRlU291cmNlTWFuYWdlciB7XG4gICAgdGhpcy5hc3NlcnRQYXRoKHNmUGF0aCk7XG4gICAgcmV0dXJuIHRoaXMuZmlsZURhdGEuc291cmNlTWFuYWdlcjtcbiAgfVxuXG4gIHNob3VsZENoZWNrQ29tcG9uZW50KG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5zZlBhdGggIT09IGFic29sdXRlRnJvbVNvdXJjZUZpbGUobm9kZS5nZXRTb3VyY2VGaWxlKCkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IHNoaW1QYXRoID0gdGhpcy5zdHJhdGVneS5zaGltUGF0aEZvckNvbXBvbmVudChub2RlKTtcblxuICAgIC8vIE9ubHkgbmVlZCB0byBnZW5lcmF0ZSBhIFRDQiBmb3IgdGhlIGNsYXNzIGlmIG5vIHNoaW0gZXhpc3RzIGZvciBpdCBjdXJyZW50bHkuXG4gICAgcmV0dXJuICF0aGlzLmZpbGVEYXRhLnNoaW1EYXRhLmhhcyhzaGltUGF0aCk7XG4gIH1cblxuICBnZXRUZW1wbGF0ZU92ZXJyaWRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBUbXBsQXN0Tm9kZVtdfG51bGwge1xuICAgIHRoaXMuYXNzZXJ0UGF0aChzZlBhdGgpO1xuICAgIGlmICh0aGlzLmZpbGVEYXRhLnRlbXBsYXRlT3ZlcnJpZGVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUlkID0gdGhpcy5maWxlRGF0YS5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQobm9kZSk7XG4gICAgaWYgKHRoaXMuZmlsZURhdGEudGVtcGxhdGVPdmVycmlkZXMuaGFzKHRlbXBsYXRlSWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5maWxlRGF0YS50ZW1wbGF0ZU92ZXJyaWRlcy5nZXQodGVtcGxhdGVJZCkhO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmVjb3JkU2hpbURhdGEoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogU2hpbVR5cGVDaGVja2luZ0RhdGEpOiB2b2lkIHtcbiAgICB0aGlzLmFzc2VydFBhdGgoc2ZQYXRoKTtcblxuICAgIC8vIFByZXZpb3VzIHR5cGUtY2hlY2tpbmcgc3RhdGUgbWF5IGhhdmUgcmVxdWlyZWQgdGhlIHVzZSBvZiBpbmxpbmVzIChhc3N1bWluZyB0aGV5IHdlcmVcbiAgICAvLyBzdXBwb3J0ZWQpLiBJZiB0aGUgY3VycmVudCBvcGVyYXRpb24gYWxzbyByZXF1aXJlcyBpbmxpbmVzLCB0aGlzIHByZXNlbnRzIGEgcHJvYmxlbTpcbiAgICAvLyBnZW5lcmF0aW5nIG5ldyBpbmxpbmVzIG1heSBpbnZhbGlkYXRlIGFueSBvbGQgaW5saW5lcyB0aGF0IG9sZCBzdGF0ZSBkZXBlbmRzIG9uLlxuICAgIC8vXG4gICAgLy8gUmF0aGVyIHRoYW4gcmVzb2x2ZSB0aGlzIGlzc3VlIGJ5IHRyYWNraW5nIHNwZWNpZmljIGRlcGVuZGVuY2llcyBvbiBpbmxpbmVzLCBpZiB0aGUgbmV3IHN0YXRlXG4gICAgLy8gcmVsaWVzIG9uIGlubGluZXMsIGFueSBvbGQgc3RhdGUgdGhhdCByZWxpZWQgb24gdGhlbSBpcyBzaW1wbHkgY2xlYXJlZC4gVGhpcyBoYXBwZW5zIHdoZW4gdGhlXG4gICAgLy8gZmlyc3QgbmV3IHN0YXRlIHRoYXQgdXNlcyBpbmxpbmVzIGlzIGVuY291bnRlcmVkLlxuICAgIGlmIChkYXRhLmhhc0lubGluZXMgJiYgIXRoaXMuc2VlbklubGluZXMpIHtcbiAgICAgIHRoaXMuaW1wbC5jbGVhckFsbFNoaW1EYXRhVXNpbmdJbmxpbmVzKCk7XG4gICAgICB0aGlzLnNlZW5JbmxpbmVzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLmZpbGVEYXRhLnNoaW1EYXRhLnNldChkYXRhLnBhdGgsIGRhdGEpO1xuICAgIGlmIChkYXRhLmhhc0lubGluZXMpIHtcbiAgICAgIHRoaXMuZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmVjb3JkQ29tcGxldGUoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRoaXMuYXNzZXJ0UGF0aChzZlBhdGgpO1xuICAgIHRoaXMuZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG4gIH1cbn1cblxuLyoqXG4gKiBEcml2ZXMgYSBgVHlwZUNoZWNrQ29udGV4dGAgdG8gZ2VuZXJhdGUgdHlwZS1jaGVja2luZyBjb2RlIGVmZmljaWVudGx5IGZvciBvbmx5IHRob3NlIGNvbXBvbmVudHNcbiAqIHdoaWNoIG1hcCB0byBhIHNpbmdsZSBzaGltIG9mIGEgc2luZ2xlIGlucHV0IGZpbGUuXG4gKi9cbmNsYXNzIFNpbmdsZVNoaW1UeXBlQ2hlY2tpbmdIb3N0IGV4dGVuZHMgU2luZ2xlRmlsZVR5cGVDaGVja2luZ0hvc3Qge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIGZpbGVEYXRhOiBGaWxlVHlwZUNoZWNraW5nRGF0YSwgc3RyYXRlZ3k6IFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSxcbiAgICAgIGltcGw6IFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsLCBwcml2YXRlIHNoaW1QYXRoOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIHN1cGVyKHNmUGF0aCwgZmlsZURhdGEsIHN0cmF0ZWd5LCBpbXBsKTtcbiAgfVxuXG4gIHNob3VsZENoZWNrTm9kZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuc2ZQYXRoICE9PSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKG5vZGUuZ2V0U291cmNlRmlsZSgpKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE9ubHkgZ2VuZXJhdGUgYSBUQ0IgZm9yIHRoZSBjb21wb25lbnQgaWYgaXQgbWFwcyB0byB0aGUgcmVxdWVzdGVkIHNoaW0gZmlsZS5cbiAgICBjb25zdCBzaGltUGF0aCA9IHRoaXMuc3RyYXRlZ3kuc2hpbVBhdGhGb3JDb21wb25lbnQobm9kZSk7XG4gICAgaWYgKHNoaW1QYXRoICE9PSB0aGlzLnNoaW1QYXRoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gT25seSBuZWVkIHRvIGdlbmVyYXRlIGEgVENCIGZvciB0aGUgY2xhc3MgaWYgbm8gc2hpbSBleGlzdHMgZm9yIGl0IGN1cnJlbnRseS5cbiAgICByZXR1cm4gIXRoaXMuZmlsZURhdGEuc2hpbURhdGEuaGFzKHNoaW1QYXRoKTtcbiAgfVxufVxuIl19