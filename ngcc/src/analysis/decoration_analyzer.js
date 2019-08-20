(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/analysis/migration_host", "@angular/compiler-cli/ngcc/src/analysis/types", "@angular/compiler-cli/ngcc/src/analysis/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
    var cycles_1 = require("@angular/compiler-cli/src/ngtsc/cycles");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var scope_1 = require("@angular/compiler-cli/src/ngtsc/scope");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var migration_host_1 = require("@angular/compiler-cli/ngcc/src/analysis/migration_host");
    var types_1 = require("@angular/compiler-cli/ngcc/src/analysis/types");
    var util_1 = require("@angular/compiler-cli/ngcc/src/analysis/util");
    /**
     * Simple class that resolves and loads files directly from the filesystem.
     */
    var NgccResourceLoader = /** @class */ (function () {
        function NgccResourceLoader(fs) {
            this.fs = fs;
            this.canPreload = false;
        }
        NgccResourceLoader.prototype.preload = function () { throw new Error('Not implemented.'); };
        NgccResourceLoader.prototype.load = function (url) { return this.fs.readFile(file_system_1.resolve(url)); };
        NgccResourceLoader.prototype.resolve = function (url, containingFile) {
            return file_system_1.resolve(file_system_1.dirname(file_system_1.absoluteFrom(containingFile)), url);
        };
        return NgccResourceLoader;
    }());
    /**
     * This Analyzer will analyze the files that have decorated classes that need to be transformed.
     */
    var DecorationAnalyzer = /** @class */ (function () {
        function DecorationAnalyzer(fs, bundle, reflectionHost, referencesRegistry, diagnosticHandler) {
            if (diagnosticHandler === void 0) { diagnosticHandler = function () { }; }
            this.fs = fs;
            this.bundle = bundle;
            this.reflectionHost = reflectionHost;
            this.referencesRegistry = referencesRegistry;
            this.diagnosticHandler = diagnosticHandler;
            this.program = this.bundle.src.program;
            this.options = this.bundle.src.options;
            this.host = this.bundle.src.host;
            this.typeChecker = this.bundle.src.program.getTypeChecker();
            this.rootDirs = this.bundle.rootDirs;
            this.packagePath = this.bundle.entryPoint.package;
            this.isCore = this.bundle.isCore;
            this.resourceManager = new NgccResourceLoader(this.fs);
            this.metaRegistry = new metadata_1.LocalMetadataRegistry();
            this.dtsMetaReader = new metadata_1.DtsMetadataReader(this.typeChecker, this.reflectionHost);
            this.fullMetaReader = new metadata_1.CompoundMetadataReader([this.metaRegistry, this.dtsMetaReader]);
            this.refEmitter = new imports_1.ReferenceEmitter([
                new imports_1.LocalIdentifierStrategy(),
                new imports_1.AbsoluteModuleStrategy(this.program, this.typeChecker, this.options, this.host, this.reflectionHost),
                // TODO(alxhub): there's no reason why ngcc needs the "logical file system" logic here, as ngcc
                // projects only ever have one rootDir. Instead, ngcc should just switch its emitted import
                // based on whether a bestGuessOwningModule is present in the Reference.
                new imports_1.LogicalProjectStrategy(this.typeChecker, new file_system_1.LogicalFileSystem(this.rootDirs)),
            ]);
            this.dtsModuleScopeResolver = new scope_1.MetadataDtsModuleScopeResolver(this.dtsMetaReader, /* aliasGenerator */ null);
            this.scopeRegistry = new scope_1.LocalModuleScopeRegistry(this.metaRegistry, this.dtsModuleScopeResolver, this.refEmitter, /* aliasGenerator */ null);
            this.fullRegistry = new metadata_1.CompoundMetadataRegistry([this.metaRegistry, this.scopeRegistry]);
            this.evaluator = new partial_evaluator_1.PartialEvaluator(this.reflectionHost, this.typeChecker);
            this.moduleResolver = new imports_1.ModuleResolver(this.program, this.options, this.host);
            this.importGraph = new cycles_1.ImportGraph(this.moduleResolver);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(this.importGraph);
            this.handlers = [
                new annotations_1.BaseDefDecoratorHandler(this.reflectionHost, this.evaluator, this.isCore),
                new annotations_1.ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, this.fullMetaReader, this.scopeRegistry, this.scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, 
                /* defaultPreserveWhitespaces */ false, 
                /* i18nUseExternalIds */ true, this.moduleResolver, this.cycleAnalyzer, this.refEmitter, imports_1.NOOP_DEFAULT_IMPORT_RECORDER),
                new annotations_1.DirectiveDecoratorHandler(this.reflectionHost, this.evaluator, this.fullRegistry, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflectionHost, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore, 
                /* strictCtorDeps */ false),
                new annotations_1.NgModuleDecoratorHandler(this.reflectionHost, this.evaluator, this.fullMetaReader, this.fullRegistry, this.scopeRegistry, this.referencesRegistry, this.isCore, /* routeAnalyzer */ null, this.refEmitter, imports_1.NOOP_DEFAULT_IMPORT_RECORDER),
                new annotations_1.PipeDecoratorHandler(this.reflectionHost, this.evaluator, this.metaRegistry, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, this.isCore),
            ];
            this.migrations = [];
        }
        /**
         * Analyze a program to find all the decorated files should be transformed.
         *
         * @returns a map of the source files to the analysis for those files.
         */
        DecorationAnalyzer.prototype.analyzeProgram = function () {
            var _this = this;
            var decorationAnalyses = new types_1.DecorationAnalyses();
            var analyzedFiles = this.program.getSourceFiles()
                .filter(function (sourceFile) { return util_1.isWithinPackage(_this.packagePath, sourceFile); })
                .map(function (sourceFile) { return _this.analyzeFile(sourceFile); })
                .filter(utils_1.isDefined);
            var migrationHost = new migration_host_1.DefaultMigrationHost(this.reflectionHost, this.fullMetaReader, this.evaluator, this.handlers, analyzedFiles);
            analyzedFiles.forEach(function (analyzedFile) { return _this.migrateFile(migrationHost, analyzedFile); });
            analyzedFiles.forEach(function (analyzedFile) { return _this.resolveFile(analyzedFile); });
            var compiledFiles = analyzedFiles.map(function (analyzedFile) { return _this.compileFile(analyzedFile); });
            compiledFiles.forEach(function (compiledFile) { return decorationAnalyses.set(compiledFile.sourceFile, compiledFile); });
            return decorationAnalyses;
        };
        DecorationAnalyzer.prototype.analyzeFile = function (sourceFile) {
            var _this = this;
            var analyzedClasses = this.reflectionHost.findClassSymbols(sourceFile)
                .map(function (symbol) { return _this.analyzeClass(symbol); })
                .filter(utils_1.isDefined);
            return analyzedClasses.length ? { sourceFile: sourceFile, analyzedClasses: analyzedClasses } : undefined;
        };
        DecorationAnalyzer.prototype.analyzeClass = function (symbol) {
            var decorators = this.reflectionHost.getDecoratorsOfSymbol(symbol);
            return util_1.analyzeDecorators(symbol, decorators, this.handlers);
        };
        DecorationAnalyzer.prototype.migrateFile = function (migrationHost, analyzedFile) {
            var _this = this;
            analyzedFile.analyzedClasses.forEach(function (_a) {
                var declaration = _a.declaration;
                _this.migrations.forEach(function (migration) {
                    try {
                        var result = migration.apply(declaration, migrationHost);
                        if (result !== null) {
                            _this.diagnosticHandler(result);
                        }
                    }
                    catch (e) {
                        if (diagnostics_1.isFatalDiagnosticError(e)) {
                            _this.diagnosticHandler(e.toDiagnostic());
                        }
                        else {
                            throw e;
                        }
                    }
                });
            });
        };
        DecorationAnalyzer.prototype.compileFile = function (analyzedFile) {
            var _this = this;
            var constantPool = new compiler_1.ConstantPool();
            var compiledClasses = analyzedFile.analyzedClasses.map(function (analyzedClass) {
                var compilation = _this.compileClass(analyzedClass, constantPool);
                return tslib_1.__assign({}, analyzedClass, { compilation: compilation });
            });
            return { constantPool: constantPool, sourceFile: analyzedFile.sourceFile, compiledClasses: compiledClasses };
        };
        DecorationAnalyzer.prototype.compileClass = function (clazz, constantPool) {
            var e_1, _a;
            var compilations = [];
            try {
                for (var _b = tslib_1.__values(clazz.matches), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = _c.value, handler = _d.handler, analysis = _d.analysis;
                    var result = handler.compile(clazz.declaration, analysis, constantPool);
                    if (Array.isArray(result)) {
                        compilations.push.apply(compilations, tslib_1.__spread(result));
                    }
                    else {
                        compilations.push(result);
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
            return compilations;
        };
        DecorationAnalyzer.prototype.resolveFile = function (analyzedFile) {
            analyzedFile.analyzedClasses.forEach(function (_a) {
                var declaration = _a.declaration, matches = _a.matches;
                matches.forEach(function (_a) {
                    var handler = _a.handler, analysis = _a.analysis;
                    if ((handler.resolve !== undefined) && analysis) {
                        handler.resolve(declaration, analysis);
                    }
                });
            });
        };
        return DecorationAnalyzer;
    }());
    exports.DecorationAnalyzer = DecorationAnalyzer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErQztJQUUvQywyRUFBNk87SUFDN08saUVBQXFFO0lBQ3JFLDJFQUFzRTtJQUN0RSwyRUFBNkc7SUFDN0csbUVBQW1MO0lBQ25MLHFFQUF1STtJQUN2SSx1RkFBc0U7SUFFdEUsK0RBQWtHO0lBS2xHLDhEQUFtQztJQUNuQyx5RkFBc0Q7SUFDdEQsdUVBQXFHO0lBQ3JHLHFFQUEwRDtJQUUxRDs7T0FFRztJQUNIO1FBQ0UsNEJBQW9CLEVBQWM7WUFBZCxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQ2xDLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFEa0IsQ0FBQztRQUV0QyxvQ0FBTyxHQUFQLGNBQXFDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsaUNBQUksR0FBSixVQUFLLEdBQVcsSUFBWSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLHFCQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUsb0NBQU8sR0FBUCxVQUFRLEdBQVcsRUFBRSxjQUFzQjtZQUN6QyxPQUFPLHFCQUFPLENBQUMscUJBQU8sQ0FBQywwQkFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQVJELElBUUM7SUFFRDs7T0FFRztJQUNIO1FBc0RFLDRCQUNZLEVBQWMsRUFBVSxNQUF3QixFQUNoRCxjQUFrQyxFQUFVLGtCQUFzQyxFQUNsRixpQkFBNEQ7WUFBNUQs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O29CQUMxRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7d0JBQ3pCLFlBQVksQ0FBQyxJQUFJLE9BQWpCLFlBQVksbUJBQVMsTUFBTSxHQUFFO3FCQUM5Qjt5QkFBTTt3QkFDTCxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO3FCQUMzQjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsT0FBTyxZQUFZLENBQUM7UUFDdEIsQ0FBQztRQUVTLHdDQUFXLEdBQXJCLFVBQXNCLFlBQTBCO1lBQzlDLFlBQVksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQUMsRUFBc0I7b0JBQXJCLDRCQUFXLEVBQUUsb0JBQU87Z0JBQ3pELE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBQyxFQUFtQjt3QkFBbEIsb0JBQU8sRUFBRSxzQkFBUTtvQkFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFDLElBQUksUUFBUSxFQUFFO3dCQUMvQyxPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztxQkFDeEM7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUE5SUQsSUE4SUM7SUE5SVksZ0RBQWtCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtDb25zdGFudFBvb2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtCYXNlRGVmRGVjb3JhdG9ySGFuZGxlciwgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlZmVyZW5jZXNSZWdpc3RyeSwgUmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0N5Y2xlQW5hbHl6ZXIsIEltcG9ydEdyYXBofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvY3ljbGVzJztcbmltcG9ydCB7aXNGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RmlsZVN5c3RlbSwgTG9naWNhbEZpbGVTeXN0ZW0sIGFic29sdXRlRnJvbSwgZGlybmFtZSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0NvbXBvdW5kTWV0YWRhdGFSZWFkZXIsIENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeSwgRHRzTWV0YWRhdGFSZWFkZXIsIExvY2FsTWV0YWRhdGFSZWdpc3RyeX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL21ldGFkYXRhJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NTeW1ib2x9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9zY29wZSc7XG5pbXBvcnQge0NvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7TWlncmF0aW9uLCBNaWdyYXRpb25Ib3N0fSBmcm9tICcuLi9taWdyYXRpb25zL21pZ3JhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge2lzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtEZWZhdWx0TWlncmF0aW9uSG9zdH0gZnJvbSAnLi9taWdyYXRpb25faG9zdCc7XG5pbXBvcnQge0FuYWx5emVkQ2xhc3MsIEFuYWx5emVkRmlsZSwgQ29tcGlsZWRDbGFzcywgQ29tcGlsZWRGaWxlLCBEZWNvcmF0aW9uQW5hbHlzZXN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHthbmFseXplRGVjb3JhdG9ycywgaXNXaXRoaW5QYWNrYWdlfSBmcm9tICcuL3V0aWwnO1xuXG4vKipcbiAqIFNpbXBsZSBjbGFzcyB0aGF0IHJlc29sdmVzIGFuZCBsb2FkcyBmaWxlcyBkaXJlY3RseSBmcm9tIHRoZSBmaWxlc3lzdGVtLlxuICovXG5jbGFzcyBOZ2NjUmVzb3VyY2VMb2FkZXIgaW1wbGVtZW50cyBSZXNvdXJjZUxvYWRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0pIHt9XG4gIGNhblByZWxvYWQgPSBmYWxzZTtcbiAgcHJlbG9hZCgpOiB1bmRlZmluZWR8UHJvbWlzZTx2b2lkPiB7IHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkLicpOyB9XG4gIGxvYWQodXJsOiBzdHJpbmcpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5mcy5yZWFkRmlsZShyZXNvbHZlKHVybCkpOyB9XG4gIHJlc29sdmUodXJsOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiByZXNvbHZlKGRpcm5hbWUoYWJzb2x1dGVGcm9tKGNvbnRhaW5pbmdGaWxlKSksIHVybCk7XG4gIH1cbn1cblxuLyoqXG4gKiBUaGlzIEFuYWx5emVyIHdpbGwgYW5hbHl6ZSB0aGUgZmlsZXMgdGhhdCBoYXZlIGRlY29yYXRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZC5cbiAqL1xuZXhwb3J0IGNsYXNzIERlY29yYXRpb25BbmFseXplciB7XG4gIHByaXZhdGUgcHJvZ3JhbSA9IHRoaXMuYnVuZGxlLnNyYy5wcm9ncmFtO1xuICBwcml2YXRlIG9wdGlvbnMgPSB0aGlzLmJ1bmRsZS5zcmMub3B0aW9ucztcbiAgcHJpdmF0ZSBob3N0ID0gdGhpcy5idW5kbGUuc3JjLmhvc3Q7XG4gIHByaXZhdGUgdHlwZUNoZWNrZXIgPSB0aGlzLmJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICBwcml2YXRlIHJvb3REaXJzID0gdGhpcy5idW5kbGUucm9vdERpcnM7XG4gIHByaXZhdGUgcGFja2FnZVBhdGggPSB0aGlzLmJ1bmRsZS5lbnRyeVBvaW50LnBhY2thZ2U7XG4gIHByaXZhdGUgaXNDb3JlID0gdGhpcy5idW5kbGUuaXNDb3JlO1xuICByZXNvdXJjZU1hbmFnZXIgPSBuZXcgTmdjY1Jlc291cmNlTG9hZGVyKHRoaXMuZnMpO1xuICBtZXRhUmVnaXN0cnkgPSBuZXcgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5KCk7XG4gIGR0c01ldGFSZWFkZXIgPSBuZXcgRHRzTWV0YWRhdGFSZWFkZXIodGhpcy50eXBlQ2hlY2tlciwgdGhpcy5yZWZsZWN0aW9uSG9zdCk7XG4gIGZ1bGxNZXRhUmVhZGVyID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWFkZXIoW3RoaXMubWV0YVJlZ2lzdHJ5LCB0aGlzLmR0c01ldGFSZWFkZXJdKTtcbiAgcmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICBuZXcgQWJzb2x1dGVNb2R1bGVTdHJhdGVneShcbiAgICAgICAgdGhpcy5wcm9ncmFtLCB0aGlzLnR5cGVDaGVja2VyLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCwgdGhpcy5yZWZsZWN0aW9uSG9zdCksXG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGVyZSdzIG5vIHJlYXNvbiB3aHkgbmdjYyBuZWVkcyB0aGUgXCJsb2dpY2FsIGZpbGUgc3lzdGVtXCIgbG9naWMgaGVyZSwgYXMgbmdjY1xuICAgIC8vIHByb2plY3RzIG9ubHkgZXZlciBoYXZlIG9uZSByb290RGlyLiBJbnN0ZWFkLCBuZ2NjIHNob3VsZCBqdXN0IHN3aXRjaCBpdHMgZW1pdHRlZCBpbXBvcnRcbiAgICAvLyBiYXNlZCBvbiB3aGV0aGVyIGEgYmVzdEd1ZXNzT3duaW5nTW9kdWxlIGlzIHByZXNlbnQgaW4gdGhlIFJlZmVyZW5jZS5cbiAgICBuZXcgTG9naWNhbFByb2plY3RTdHJhdGVneSh0aGlzLnR5cGVDaGVja2VyLCBuZXcgTG9naWNhbEZpbGVTeXN0ZW0odGhpcy5yb290RGlycykpLFxuICBdKTtcbiAgZHRzTW9kdWxlU2NvcGVSZXNvbHZlciA9XG4gICAgICBuZXcgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyKHRoaXMuZHRzTWV0YVJlYWRlciwgLyogYWxpYXNHZW5lcmF0b3IgKi8gbnVsbCk7XG4gIHNjb3BlUmVnaXN0cnkgPSBuZXcgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5KFxuICAgICAgdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuZHRzTW9kdWxlU2NvcGVSZXNvbHZlciwgdGhpcy5yZWZFbWl0dGVyLCAvKiBhbGlhc0dlbmVyYXRvciAqLyBudWxsKTtcbiAgZnVsbFJlZ2lzdHJ5ID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeShbdGhpcy5tZXRhUmVnaXN0cnksIHRoaXMuc2NvcGVSZWdpc3RyeV0pO1xuICBldmFsdWF0b3IgPSBuZXcgUGFydGlhbEV2YWx1YXRvcih0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLnR5cGVDaGVja2VyKTtcbiAgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIodGhpcy5wcm9ncmFtLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCk7XG4gIGltcG9ydEdyYXBoID0gbmV3IEltcG9ydEdyYXBoKHRoaXMubW9kdWxlUmVzb2x2ZXIpO1xuICBjeWNsZUFuYWx5emVyID0gbmV3IEN5Y2xlQW5hbHl6ZXIodGhpcy5pbXBvcnRHcmFwaCk7XG4gIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55PltdID0gW1xuICAgIG5ldyBCYXNlRGVmRGVjb3JhdG9ySGFuZGxlcih0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5pc0NvcmUpLFxuICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5mdWxsUmVnaXN0cnksIHRoaXMuZnVsbE1ldGFSZWFkZXIsXG4gICAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgdGhpcy5yZXNvdXJjZU1hbmFnZXIsIHRoaXMucm9vdERpcnMsXG4gICAgICAgIC8qIGRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzICovIGZhbHNlLFxuICAgICAgICAvKiBpMThuVXNlRXh0ZXJuYWxJZHMgKi8gdHJ1ZSwgdGhpcy5tb2R1bGVSZXNvbHZlciwgdGhpcy5jeWNsZUFuYWx5emVyLCB0aGlzLnJlZkVtaXR0ZXIsXG4gICAgICAgIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIpLFxuICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5mdWxsUmVnaXN0cnksIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsXG4gICAgICAgIHRoaXMuaXNDb3JlKSxcbiAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAvKiBzdHJpY3RDdG9yRGVwcyAqLyBmYWxzZSksXG4gICAgbmV3IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuZnVsbE1ldGFSZWFkZXIsIHRoaXMuZnVsbFJlZ2lzdHJ5LFxuICAgICAgICB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgLyogcm91dGVBbmFseXplciAqLyBudWxsLFxuICAgICAgICB0aGlzLnJlZkVtaXR0ZXIsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIpLFxuICAgIG5ldyBQaXBlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMubWV0YVJlZ2lzdHJ5LCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLFxuICAgICAgICB0aGlzLmlzQ29yZSksXG4gIF07XG4gIG1pZ3JhdGlvbnM6IE1pZ3JhdGlvbltdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSxcbiAgICAgIHByaXZhdGUgcmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgZGlhZ25vc3RpY0hhbmRsZXI6IChlcnJvcjogdHMuRGlhZ25vc3RpYykgPT4gdm9pZCA9ICgpID0+IHt9KSB7fVxuXG4gIC8qKlxuICAgKiBBbmFseXplIGEgcHJvZ3JhbSB0byBmaW5kIGFsbCB0aGUgZGVjb3JhdGVkIGZpbGVzIHNob3VsZCBiZSB0cmFuc2Zvcm1lZC5cbiAgICpcbiAgICogQHJldHVybnMgYSBtYXAgb2YgdGhlIHNvdXJjZSBmaWxlcyB0byB0aGUgYW5hbHlzaXMgZm9yIHRob3NlIGZpbGVzLlxuICAgKi9cbiAgYW5hbHl6ZVByb2dyYW0oKTogRGVjb3JhdGlvbkFuYWx5c2VzIHtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHlzZXMgPSBuZXcgRGVjb3JhdGlvbkFuYWx5c2VzKCk7XG4gICAgY29uc3QgYW5hbHl6ZWRGaWxlcyA9IHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKHNvdXJjZUZpbGUgPT4gaXNXaXRoaW5QYWNrYWdlKHRoaXMucGFja2FnZVBhdGgsIHNvdXJjZUZpbGUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChzb3VyY2VGaWxlID0+IHRoaXMuYW5hbHl6ZUZpbGUoc291cmNlRmlsZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG4gICAgY29uc3QgbWlncmF0aW9uSG9zdCA9IG5ldyBEZWZhdWx0TWlncmF0aW9uSG9zdChcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5mdWxsTWV0YVJlYWRlciwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuaGFuZGxlcnMsIGFuYWx5emVkRmlsZXMpO1xuICAgIGFuYWx5emVkRmlsZXMuZm9yRWFjaChhbmFseXplZEZpbGUgPT4gdGhpcy5taWdyYXRlRmlsZShtaWdyYXRpb25Ib3N0LCBhbmFseXplZEZpbGUpKTtcbiAgICBhbmFseXplZEZpbGVzLmZvckVhY2goYW5hbHl6ZWRGaWxlID0+IHRoaXMucmVzb2x2ZUZpbGUoYW5hbHl6ZWRGaWxlKSk7XG4gICAgY29uc3QgY29tcGlsZWRGaWxlcyA9IGFuYWx5emVkRmlsZXMubWFwKGFuYWx5emVkRmlsZSA9PiB0aGlzLmNvbXBpbGVGaWxlKGFuYWx5emVkRmlsZSkpO1xuICAgIGNvbXBpbGVkRmlsZXMuZm9yRWFjaChcbiAgICAgICAgY29tcGlsZWRGaWxlID0+IGRlY29yYXRpb25BbmFseXNlcy5zZXQoY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZSkpO1xuICAgIHJldHVybiBkZWNvcmF0aW9uQW5hbHlzZXM7XG4gIH1cblxuICBwcm90ZWN0ZWQgYW5hbHl6ZUZpbGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IEFuYWx5emVkRmlsZXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGFuYWx5emVkQ2xhc3NlcyA9IHRoaXMucmVmbGVjdGlvbkhvc3QuZmluZENsYXNzU3ltYm9scyhzb3VyY2VGaWxlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKHN5bWJvbCA9PiB0aGlzLmFuYWx5emVDbGFzcyhzeW1ib2wpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG4gICAgcmV0dXJuIGFuYWx5emVkQ2xhc3Nlcy5sZW5ndGggPyB7c291cmNlRmlsZSwgYW5hbHl6ZWRDbGFzc2VzfSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplQ2xhc3Moc3ltYm9sOiBDbGFzc1N5bWJvbCk6IEFuYWx5emVkQ2xhc3N8bnVsbCB7XG4gICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdGlvbkhvc3QuZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbCk7XG4gICAgcmV0dXJuIGFuYWx5emVEZWNvcmF0b3JzKHN5bWJvbCwgZGVjb3JhdG9ycywgdGhpcy5oYW5kbGVycyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgbWlncmF0ZUZpbGUobWlncmF0aW9uSG9zdDogTWlncmF0aW9uSG9zdCwgYW5hbHl6ZWRGaWxlOiBBbmFseXplZEZpbGUpOiB2b2lkIHtcbiAgICBhbmFseXplZEZpbGUuYW5hbHl6ZWRDbGFzc2VzLmZvckVhY2goKHtkZWNsYXJhdGlvbn0pID0+IHtcbiAgICAgIHRoaXMubWlncmF0aW9ucy5mb3JFYWNoKG1pZ3JhdGlvbiA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gbWlncmF0aW9uLmFwcGx5KGRlY2xhcmF0aW9uLCBtaWdyYXRpb25Ib3N0KTtcbiAgICAgICAgICBpZiAocmVzdWx0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLmRpYWdub3N0aWNIYW5kbGVyKHJlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGlzRmF0YWxEaWFnbm9zdGljRXJyb3IoZSkpIHtcbiAgICAgICAgICAgIHRoaXMuZGlhZ25vc3RpY0hhbmRsZXIoZS50b0RpYWdub3N0aWMoKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb21waWxlRmlsZShhbmFseXplZEZpbGU6IEFuYWx5emVkRmlsZSk6IENvbXBpbGVkRmlsZSB7XG4gICAgY29uc3QgY29uc3RhbnRQb29sID0gbmV3IENvbnN0YW50UG9vbCgpO1xuICAgIGNvbnN0IGNvbXBpbGVkQ2xhc3NlczogQ29tcGlsZWRDbGFzc1tdID0gYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5tYXAoYW5hbHl6ZWRDbGFzcyA9PiB7XG4gICAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuY29tcGlsZUNsYXNzKGFuYWx5emVkQ2xhc3MsIGNvbnN0YW50UG9vbCk7XG4gICAgICByZXR1cm4gey4uLmFuYWx5emVkQ2xhc3MsIGNvbXBpbGF0aW9ufTtcbiAgICB9KTtcbiAgICByZXR1cm4ge2NvbnN0YW50UG9vbCwgc291cmNlRmlsZTogYW5hbHl6ZWRGaWxlLnNvdXJjZUZpbGUsIGNvbXBpbGVkQ2xhc3Nlc307XG4gIH1cblxuICBwcm90ZWN0ZWQgY29tcGlsZUNsYXNzKGNsYXp6OiBBbmFseXplZENsYXNzLCBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCk6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgY29tcGlsYXRpb25zOiBDb21waWxlUmVzdWx0W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHtoYW5kbGVyLCBhbmFseXNpc30gb2YgY2xhenoubWF0Y2hlcykge1xuICAgICAgY29uc3QgcmVzdWx0ID0gaGFuZGxlci5jb21waWxlKGNsYXp6LmRlY2xhcmF0aW9uLCBhbmFseXNpcywgY29uc3RhbnRQb29sKTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3VsdCkpIHtcbiAgICAgICAgY29tcGlsYXRpb25zLnB1c2goLi4ucmVzdWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBpbGF0aW9ucy5wdXNoKHJlc3VsdCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb21waWxhdGlvbnM7XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVzb2x2ZUZpbGUoYW5hbHl6ZWRGaWxlOiBBbmFseXplZEZpbGUpOiB2b2lkIHtcbiAgICBhbmFseXplZEZpbGUuYW5hbHl6ZWRDbGFzc2VzLmZvckVhY2goKHtkZWNsYXJhdGlvbiwgbWF0Y2hlc30pID0+IHtcbiAgICAgIG1hdGNoZXMuZm9yRWFjaCgoe2hhbmRsZXIsIGFuYWx5c2lzfSkgPT4ge1xuICAgICAgICBpZiAoKGhhbmRsZXIucmVzb2x2ZSAhPT0gdW5kZWZpbmVkKSAmJiBhbmFseXNpcykge1xuICAgICAgICAgIGhhbmRsZXIucmVzb2x2ZShkZWNsYXJhdGlvbiwgYW5hbHlzaXMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuIl19