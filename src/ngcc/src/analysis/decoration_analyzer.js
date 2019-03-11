(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/analysis/decoration_analyzer", ["require", "exports", "tslib", "@angular/compiler", "canonical-path", "fs", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
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
    var path = require("canonical-path");
    var fs = require("fs");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
    var cycles_1 = require("@angular/compiler-cli/src/ngtsc/cycles");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var scope_1 = require("@angular/compiler-cli/src/ngtsc/scope");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
    exports.DecorationAnalyses = Map;
    /**
     * Simple class that resolves and loads files directly from the filesystem.
     */
    var NgccResourceLoader = /** @class */ (function () {
        function NgccResourceLoader() {
            this.canPreload = false;
        }
        NgccResourceLoader.prototype.preload = function () { throw new Error('Not implemented.'); };
        NgccResourceLoader.prototype.load = function (url) { return fs.readFileSync(url, 'utf8'); };
        NgccResourceLoader.prototype.resolve = function (url, containingFile) {
            return path.resolve(path.dirname(containingFile), url);
        };
        return NgccResourceLoader;
    }());
    /**
     * This Analyzer will analyze the files that have decorated classes that need to be transformed.
     */
    var DecorationAnalyzer = /** @class */ (function () {
        function DecorationAnalyzer(program, options, host, typeChecker, reflectionHost, referencesRegistry, rootDirs, isCore) {
            this.program = program;
            this.options = options;
            this.host = host;
            this.typeChecker = typeChecker;
            this.reflectionHost = reflectionHost;
            this.referencesRegistry = referencesRegistry;
            this.rootDirs = rootDirs;
            this.isCore = isCore;
            this.resourceManager = new NgccResourceLoader();
            this.refEmitter = new imports_1.ReferenceEmitter([
                new imports_1.LocalIdentifierStrategy(),
                new imports_1.AbsoluteModuleStrategy(this.program, this.typeChecker, this.options, this.host),
                // TODO(alxhub): there's no reason why ngcc needs the "logical file system" logic here, as ngcc
                // projects only ever have one rootDir. Instead, ngcc should just switch its emitted imort based
                // on whether a bestGuessOwningModule is present in the Reference.
                new imports_1.LogicalProjectStrategy(this.typeChecker, new path_1.LogicalFileSystem(this.rootDirs)),
            ]);
            this.dtsModuleScopeResolver = new scope_1.MetadataDtsModuleScopeResolver(this.typeChecker, this.reflectionHost, /* aliasGenerator */ null);
            this.scopeRegistry = new scope_1.LocalModuleScopeRegistry(this.dtsModuleScopeResolver, this.refEmitter, /* aliasGenerator */ null);
            this.evaluator = new partial_evaluator_1.PartialEvaluator(this.reflectionHost, this.typeChecker);
            this.moduleResolver = new imports_1.ModuleResolver(this.program, this.options, this.host);
            this.importGraph = new cycles_1.ImportGraph(this.moduleResolver);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(this.importGraph);
            this.handlers = [
                new annotations_1.BaseDefDecoratorHandler(this.reflectionHost, this.evaluator, this.isCore),
                new annotations_1.ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, /* defaultPreserveWhitespaces */ false, /* i18nUseExternalIds */ true, this.moduleResolver, this.cycleAnalyzer, this.refEmitter),
                new annotations_1.DirectiveDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflectionHost, this.isCore, /* strictCtorDeps */ false),
                new annotations_1.NgModuleDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.referencesRegistry, this.isCore, /* routeAnalyzer */ null, this.refEmitter),
                new annotations_1.PipeDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.isCore),
            ];
        }
        /**
         * Analyze a program to find all the decorated files should be transformed.
         *
         * @returns a map of the source files to the analysis for those files.
         */
        DecorationAnalyzer.prototype.analyzeProgram = function () {
            var _this = this;
            var decorationAnalyses = new exports.DecorationAnalyses();
            var analysedFiles = this.program.getSourceFiles()
                .map(function (sourceFile) { return _this.analyzeFile(sourceFile); })
                .filter(utils_1.isDefined);
            var compiledFiles = analysedFiles.map(function (analysedFile) { return _this.compileFile(analysedFile); });
            compiledFiles.forEach(function (compiledFile) { return decorationAnalyses.set(compiledFile.sourceFile, compiledFile); });
            return decorationAnalyses;
        };
        DecorationAnalyzer.prototype.analyzeFile = function (sourceFile) {
            var _this = this;
            var decoratedClasses = this.reflectionHost.findDecoratedClasses(sourceFile);
            return decoratedClasses.length ? {
                sourceFile: sourceFile,
                analyzedClasses: decoratedClasses.map(function (clazz) { return _this.analyzeClass(clazz); }).filter(utils_1.isDefined)
            } :
                undefined;
        };
        DecorationAnalyzer.prototype.analyzeClass = function (clazz) {
            var e_1, _a, e_2, _b;
            var matchingHandlers = this.handlers
                .map(function (handler) {
                var detected = handler.detect(clazz.declaration, clazz.decorators);
                return { handler: handler, detected: detected };
            })
                .filter(isMatchingHandler);
            if (matchingHandlers.length === 0) {
                return null;
            }
            var detections = [];
            var hasWeakHandler = false;
            var hasNonWeakHandler = false;
            var hasPrimaryHandler = false;
            try {
                for (var matchingHandlers_1 = tslib_1.__values(matchingHandlers), matchingHandlers_1_1 = matchingHandlers_1.next(); !matchingHandlers_1_1.done; matchingHandlers_1_1 = matchingHandlers_1.next()) {
                    var _c = matchingHandlers_1_1.value, handler = _c.handler, detected = _c.detected;
                    if (hasNonWeakHandler && handler.precedence === transform_1.HandlerPrecedence.WEAK) {
                        continue;
                    }
                    else if (hasWeakHandler && handler.precedence !== transform_1.HandlerPrecedence.WEAK) {
                        // Clear all the WEAK handlers from the list of matches.
                        detections.length = 0;
                    }
                    if (hasPrimaryHandler && handler.precedence === transform_1.HandlerPrecedence.PRIMARY) {
                        throw new Error("TODO.Diagnostic: Class has multiple incompatible Angular decorators.");
                    }
                    detections.push({ handler: handler, detected: detected });
                    if (handler.precedence === transform_1.HandlerPrecedence.WEAK) {
                        hasWeakHandler = true;
                    }
                    else if (handler.precedence === transform_1.HandlerPrecedence.SHARED) {
                        hasNonWeakHandler = true;
                    }
                    else if (handler.precedence === transform_1.HandlerPrecedence.PRIMARY) {
                        hasNonWeakHandler = true;
                        hasPrimaryHandler = true;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (matchingHandlers_1_1 && !matchingHandlers_1_1.done && (_a = matchingHandlers_1.return)) _a.call(matchingHandlers_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var matches = [];
            var allDiagnostics = [];
            try {
                for (var detections_1 = tslib_1.__values(detections), detections_1_1 = detections_1.next(); !detections_1_1.done; detections_1_1 = detections_1.next()) {
                    var _d = detections_1_1.value, handler = _d.handler, detected = _d.detected;
                    var _e = handler.analyze(clazz.declaration, detected.metadata), analysis = _e.analysis, diagnostics = _e.diagnostics;
                    if (diagnostics !== undefined) {
                        allDiagnostics.push.apply(allDiagnostics, tslib_1.__spread(diagnostics));
                    }
                    matches.push({ handler: handler, analysis: analysis });
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (detections_1_1 && !detections_1_1.done && (_b = detections_1.return)) _b.call(detections_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return tslib_1.__assign({}, clazz, { matches: matches, diagnostics: allDiagnostics.length > 0 ? allDiagnostics : undefined });
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
            var e_3, _a;
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
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return compilations;
        };
        return DecorationAnalyzer;
    }());
    exports.DecorationAnalyzer = DecorationAnalyzer;
    function isMatchingHandler(handler) {
        return !!handler.detected;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvYW5hbHlzaXMvZGVjb3JhdGlvbl9hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBK0M7SUFDL0MscUNBQXVDO0lBQ3ZDLHVCQUF5QjtJQUd6QiwyRUFBeU87SUFDek8saUVBQWlFO0lBQ2pFLG1FQUFpSjtJQUNqSix1RkFBa0U7SUFDbEUsNkRBQXNFO0lBQ3RFLCtEQUE4RjtJQUM5Rix1RUFBMEc7SUFHMUcsa0VBQW1DO0lBcUJ0QixRQUFBLGtCQUFrQixHQUFHLEdBQUcsQ0FBQztJQU90Qzs7T0FFRztJQUNIO1FBQUE7WUFDRSxlQUFVLEdBQUcsS0FBSyxDQUFDO1FBTXJCLENBQUM7UUFMQyxvQ0FBTyxHQUFQLGNBQXFDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsaUNBQUksR0FBSixVQUFLLEdBQVcsSUFBWSxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxvQ0FBTyxHQUFQLFVBQVEsR0FBVyxFQUFFLGNBQXNCO1lBQ3pDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUFQRCxJQU9DO0lBRUQ7O09BRUc7SUFDSDtRQWlDRSw0QkFDWSxPQUFtQixFQUFVLE9BQTJCLEVBQ3hELElBQXFCLEVBQVUsV0FBMkIsRUFDMUQsY0FBa0MsRUFBVSxrQkFBc0MsRUFDbEYsUUFBMEIsRUFBVSxNQUFlO1lBSG5ELFlBQU8s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SVksZ0RBQWtCO0lBMEkvQixTQUFTLGlCQUFpQixDQUFPLE9BQXVDO1FBRXRFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7SUFDNUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q29uc3RhbnRQb29sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Jhc2VEZWZEZWNvcmF0b3JIYW5kbGVyLCBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5LCBSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtDeWNsZUFuYWx5emVyLCBJbXBvcnRHcmFwaH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvY3ljbGVzJztcbmltcG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgTG9naWNhbEZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL25ndHNjL3BhdGgnO1xuaW1wb3J0IHtMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcn0gZnJvbSAnLi4vLi4vLi4vbmd0c2Mvc2NvcGUnO1xuaW1wb3J0IHtDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJQcmVjZWRlbmNlfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtEZWNvcmF0ZWRDbGFzc30gZnJvbSAnLi4vaG9zdC9kZWNvcmF0ZWRfY2xhc3MnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7aXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRGaWxlIHtcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZTtcbiAgYW5hbHl6ZWRDbGFzc2VzOiBBbmFseXplZENsYXNzW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRDbGFzcyBleHRlbmRzIERlY29yYXRlZENsYXNzIHtcbiAgZGlhZ25vc3RpY3M/OiB0cy5EaWFnbm9zdGljW107XG4gIG1hdGNoZXM6IHtoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55PjsgYW5hbHlzaXM6IGFueTt9W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRDbGFzcyBleHRlbmRzIEFuYWx5emVkQ2xhc3MgeyBjb21waWxhdGlvbjogQ29tcGlsZVJlc3VsdFtdOyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRGaWxlIHtcbiAgY29tcGlsZWRDbGFzc2VzOiBDb21waWxlZENsYXNzW107XG4gIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGU7XG4gIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sO1xufVxuXG5leHBvcnQgdHlwZSBEZWNvcmF0aW9uQW5hbHlzZXMgPSBNYXA8dHMuU291cmNlRmlsZSwgQ29tcGlsZWRGaWxlPjtcbmV4cG9ydCBjb25zdCBEZWNvcmF0aW9uQW5hbHlzZXMgPSBNYXA7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hpbmdIYW5kbGVyPEEsIE0+IHtcbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxBLCBNPjtcbiAgZGV0ZWN0ZWQ6IE07XG59XG5cbi8qKlxuICogU2ltcGxlIGNsYXNzIHRoYXQgcmVzb2x2ZXMgYW5kIGxvYWRzIGZpbGVzIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW0uXG4gKi9cbmNsYXNzIE5nY2NSZXNvdXJjZUxvYWRlciBpbXBsZW1lbnRzIFJlc291cmNlTG9hZGVyIHtcbiAgY2FuUHJlbG9hZCA9IGZhbHNlO1xuICBwcmVsb2FkKCk6IHVuZGVmaW5lZHxQcm9taXNlPHZvaWQ+IHsgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQuJyk7IH1cbiAgbG9hZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiBmcy5yZWFkRmlsZVN5bmModXJsLCAndXRmOCcpOyB9XG4gIHJlc29sdmUodXJsOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKGNvbnRhaW5pbmdGaWxlKSwgdXJsKTtcbiAgfVxufVxuXG4vKipcbiAqIFRoaXMgQW5hbHl6ZXIgd2lsbCBhbmFseXplIHRoZSBmaWxlcyB0aGF0IGhhdmUgZGVjb3JhdGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkLlxuICovXG5leHBvcnQgY2xhc3MgRGVjb3JhdGlvbkFuYWx5emVyIHtcbiAgcmVzb3VyY2VNYW5hZ2VyID0gbmV3IE5nY2NSZXNvdXJjZUxvYWRlcigpO1xuICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KHRoaXMucHJvZ3JhbSwgdGhpcy50eXBlQ2hlY2tlciwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QpLFxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhlcmUncyBubyByZWFzb24gd2h5IG5nY2MgbmVlZHMgdGhlIFwibG9naWNhbCBmaWxlIHN5c3RlbVwiIGxvZ2ljIGhlcmUsIGFzIG5nY2NcbiAgICAvLyBwcm9qZWN0cyBvbmx5IGV2ZXIgaGF2ZSBvbmUgcm9vdERpci4gSW5zdGVhZCwgbmdjYyBzaG91bGQganVzdCBzd2l0Y2ggaXRzIGVtaXR0ZWQgaW1vcnQgYmFzZWRcbiAgICAvLyBvbiB3aGV0aGVyIGEgYmVzdEd1ZXNzT3duaW5nTW9kdWxlIGlzIHByZXNlbnQgaW4gdGhlIFJlZmVyZW5jZS5cbiAgICBuZXcgTG9naWNhbFByb2plY3RTdHJhdGVneSh0aGlzLnR5cGVDaGVja2VyLCBuZXcgTG9naWNhbEZpbGVTeXN0ZW0odGhpcy5yb290RGlycykpLFxuICBdKTtcbiAgZHRzTW9kdWxlU2NvcGVSZXNvbHZlciA9IG5ldyBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIoXG4gICAgICB0aGlzLnR5cGVDaGVja2VyLCB0aGlzLnJlZmxlY3Rpb25Ib3N0LCAvKiBhbGlhc0dlbmVyYXRvciAqLyBudWxsKTtcbiAgc2NvcGVSZWdpc3RyeSA9IG5ldyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkoXG4gICAgICB0aGlzLmR0c01vZHVsZVNjb3BlUmVzb2x2ZXIsIHRoaXMucmVmRW1pdHRlciwgLyogYWxpYXNHZW5lcmF0b3IgKi8gbnVsbCk7XG4gIGV2YWx1YXRvciA9IG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMudHlwZUNoZWNrZXIpO1xuICBtb2R1bGVSZXNvbHZlciA9IG5ldyBNb2R1bGVSZXNvbHZlcih0aGlzLnByb2dyYW0sIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgaW1wb3J0R3JhcGggPSBuZXcgSW1wb3J0R3JhcGgodGhpcy5tb2R1bGVSZXNvbHZlcik7XG4gIGN5Y2xlQW5hbHl6ZXIgPSBuZXcgQ3ljbGVBbmFseXplcih0aGlzLmltcG9ydEdyYXBoKTtcbiAgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+W10gPSBbXG4gICAgbmV3IEJhc2VEZWZEZWNvcmF0b3JIYW5kbGVyKHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmlzQ29yZSksXG4gICAgbmV3IENvbXBvbmVudERlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlLCB0aGlzLnJlc291cmNlTWFuYWdlcixcbiAgICAgICAgdGhpcy5yb290RGlycywgLyogZGVmYXVsdFByZXNlcnZlV2hpdGVzcGFjZXMgKi8gZmFsc2UsIC8qIGkxOG5Vc2VFeHRlcm5hbElkcyAqLyB0cnVlLFxuICAgICAgICB0aGlzLm1vZHVsZVJlc29sdmVyLCB0aGlzLmN5Y2xlQW5hbHl6ZXIsIHRoaXMucmVmRW1pdHRlciksXG4gICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlKSxcbiAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIodGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5pc0NvcmUsIC8qIHN0cmljdEN0b3JEZXBzICovIGZhbHNlKSxcbiAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLnJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgICAgdGhpcy5pc0NvcmUsIC8qIHJvdXRlQW5hbHl6ZXIgKi8gbnVsbCwgdGhpcy5yZWZFbWl0dGVyKSxcbiAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIodGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUpLFxuICBdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBwcml2YXRlIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyxcbiAgICAgIHByaXZhdGUgaG9zdDogdHMuQ29tcGlsZXJIb3N0LCBwcml2YXRlIHR5cGVDaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIHByaXZhdGUgcmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgcm9vdERpcnM6IEFic29sdXRlRnNQYXRoW10sIHByaXZhdGUgaXNDb3JlOiBib29sZWFuKSB7fVxuXG4gIC8qKlxuICAgKiBBbmFseXplIGEgcHJvZ3JhbSB0byBmaW5kIGFsbCB0aGUgZGVjb3JhdGVkIGZpbGVzIHNob3VsZCBiZSB0cmFuc2Zvcm1lZC5cbiAgICpcbiAgICogQHJldHVybnMgYSBtYXAgb2YgdGhlIHNvdXJjZSBmaWxlcyB0byB0aGUgYW5hbHlzaXMgZm9yIHRob3NlIGZpbGVzLlxuICAgKi9cbiAgYW5hbHl6ZVByb2dyYW0oKTogRGVjb3JhdGlvbkFuYWx5c2VzIHtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHlzZXMgPSBuZXcgRGVjb3JhdGlvbkFuYWx5c2VzKCk7XG4gICAgY29uc3QgYW5hbHlzZWRGaWxlcyA9IHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKHNvdXJjZUZpbGUgPT4gdGhpcy5hbmFseXplRmlsZShzb3VyY2VGaWxlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgICBjb25zdCBjb21waWxlZEZpbGVzID0gYW5hbHlzZWRGaWxlcy5tYXAoYW5hbHlzZWRGaWxlID0+IHRoaXMuY29tcGlsZUZpbGUoYW5hbHlzZWRGaWxlKSk7XG4gICAgY29tcGlsZWRGaWxlcy5mb3JFYWNoKFxuICAgICAgICBjb21waWxlZEZpbGUgPT4gZGVjb3JhdGlvbkFuYWx5c2VzLnNldChjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlKSk7XG4gICAgcmV0dXJuIGRlY29yYXRpb25BbmFseXNlcztcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplRmlsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogQW5hbHl6ZWRGaWxlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZGVjb3JhdGVkQ2xhc3NlcyA9IHRoaXMucmVmbGVjdGlvbkhvc3QuZmluZERlY29yYXRlZENsYXNzZXMoc291cmNlRmlsZSk7XG4gICAgcmV0dXJuIGRlY29yYXRlZENsYXNzZXMubGVuZ3RoID8ge1xuICAgICAgc291cmNlRmlsZSxcbiAgICAgIGFuYWx5emVkQ2xhc3NlczogZGVjb3JhdGVkQ2xhc3Nlcy5tYXAoY2xhenogPT4gdGhpcy5hbmFseXplQ2xhc3MoY2xhenopKS5maWx0ZXIoaXNEZWZpbmVkKVxuICAgIH0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplQ2xhc3MoY2xheno6IERlY29yYXRlZENsYXNzKTogQW5hbHl6ZWRDbGFzc3xudWxsIHtcbiAgICBjb25zdCBtYXRjaGluZ0hhbmRsZXJzID0gdGhpcy5oYW5kbGVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChoYW5kbGVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGV0ZWN0ZWQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5kZXRlY3QoY2xhenouZGVjbGFyYXRpb24sIGNsYXp6LmRlY29yYXRvcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge2hhbmRsZXIsIGRldGVjdGVkfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGlzTWF0Y2hpbmdIYW5kbGVyKTtcblxuICAgIGlmIChtYXRjaGluZ0hhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGRldGVjdGlvbnM6IHtoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55PiwgZGV0ZWN0ZWQ6IERldGVjdFJlc3VsdDxhbnk+fVtdID0gW107XG4gICAgbGV0IGhhc1dlYWtIYW5kbGVyOiBib29sZWFuID0gZmFsc2U7XG4gICAgbGV0IGhhc05vbldlYWtIYW5kbGVyOiBib29sZWFuID0gZmFsc2U7XG4gICAgbGV0IGhhc1ByaW1hcnlIYW5kbGVyOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICBmb3IgKGNvbnN0IHtoYW5kbGVyLCBkZXRlY3RlZH0gb2YgbWF0Y2hpbmdIYW5kbGVycykge1xuICAgICAgaWYgKGhhc05vbldlYWtIYW5kbGVyICYmIGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuV0VBSykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSBpZiAoaGFzV2Vha0hhbmRsZXIgJiYgaGFuZGxlci5wcmVjZWRlbmNlICE9PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLKSB7XG4gICAgICAgIC8vIENsZWFyIGFsbCB0aGUgV0VBSyBoYW5kbGVycyBmcm9tIHRoZSBsaXN0IG9mIG1hdGNoZXMuXG4gICAgICAgIGRldGVjdGlvbnMubGVuZ3RoID0gMDtcbiAgICAgIH1cbiAgICAgIGlmIChoYXNQcmltYXJ5SGFuZGxlciAmJiBoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUT0RPLkRpYWdub3N0aWM6IENsYXNzIGhhcyBtdWx0aXBsZSBpbmNvbXBhdGlibGUgQW5ndWxhciBkZWNvcmF0b3JzLmApO1xuICAgICAgfVxuXG4gICAgICBkZXRlY3Rpb25zLnB1c2goe2hhbmRsZXIsIGRldGVjdGVkfSk7XG4gICAgICBpZiAoaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLKSB7XG4gICAgICAgIGhhc1dlYWtIYW5kbGVyID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5TSEFSRUQpIHtcbiAgICAgICAgaGFzTm9uV2Vha0hhbmRsZXIgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlkpIHtcbiAgICAgICAgaGFzTm9uV2Vha0hhbmRsZXIgPSB0cnVlO1xuICAgICAgICBoYXNQcmltYXJ5SGFuZGxlciA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbWF0Y2hlczoge2hhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+LCBhbmFseXNpczogYW55fVtdID0gW107XG4gICAgY29uc3QgYWxsRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qge2hhbmRsZXIsIGRldGVjdGVkfSBvZiBkZXRlY3Rpb25zKSB7XG4gICAgICBjb25zdCB7YW5hbHlzaXMsIGRpYWdub3N0aWNzfSA9IGhhbmRsZXIuYW5hbHl6ZShjbGF6ei5kZWNsYXJhdGlvbiwgZGV0ZWN0ZWQubWV0YWRhdGEpO1xuICAgICAgaWYgKGRpYWdub3N0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYWxsRGlhZ25vc3RpY3MucHVzaCguLi5kaWFnbm9zdGljcyk7XG4gICAgICB9XG4gICAgICBtYXRjaGVzLnB1c2goe2hhbmRsZXIsIGFuYWx5c2lzfSk7XG4gICAgfVxuICAgIHJldHVybiB7Li4uY2xhenosIG1hdGNoZXMsIGRpYWdub3N0aWNzOiBhbGxEaWFnbm9zdGljcy5sZW5ndGggPiAwID8gYWxsRGlhZ25vc3RpY3MgOiB1bmRlZmluZWR9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbXBpbGVGaWxlKGFuYWx5emVkRmlsZTogQW5hbHl6ZWRGaWxlKTogQ29tcGlsZWRGaWxlIHtcbiAgICBjb25zdCBjb25zdGFudFBvb2wgPSBuZXcgQ29uc3RhbnRQb29sKCk7XG4gICAgY29uc3QgY29tcGlsZWRDbGFzc2VzOiBDb21waWxlZENsYXNzW10gPSBhbmFseXplZEZpbGUuYW5hbHl6ZWRDbGFzc2VzLm1hcChhbmFseXplZENsYXNzID0+IHtcbiAgICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5jb21waWxlQ2xhc3MoYW5hbHl6ZWRDbGFzcywgY29uc3RhbnRQb29sKTtcbiAgICAgIHJldHVybiB7Li4uYW5hbHl6ZWRDbGFzcywgY29tcGlsYXRpb259O1xuICAgIH0pO1xuICAgIHJldHVybiB7Y29uc3RhbnRQb29sLCBzb3VyY2VGaWxlOiBhbmFseXplZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRDbGFzc2VzfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb21waWxlQ2xhc3MoY2xheno6IEFuYWx5emVkQ2xhc3MsIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBjb21waWxhdGlvbnM6IENvbXBpbGVSZXN1bHRbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qge2hhbmRsZXIsIGFuYWx5c2lzfSBvZiBjbGF6ei5tYXRjaGVzKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBoYW5kbGVyLmNvbXBpbGUoY2xhenouZGVjbGFyYXRpb24sIGFuYWx5c2lzLCBjb25zdGFudFBvb2wpO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVzdWx0KSkge1xuICAgICAgICBjb21waWxhdGlvbnMucHVzaCguLi5yZXN1bHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGlsYXRpb25zLnB1c2gocmVzdWx0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbXBpbGF0aW9ucztcbiAgfVxufVxuXG5mdW5jdGlvbiBpc01hdGNoaW5nSGFuZGxlcjxBLCBNPihoYW5kbGVyOiBQYXJ0aWFsPE1hdGNoaW5nSGFuZGxlcjxBLCBNPj4pOlxuICAgIGhhbmRsZXIgaXMgTWF0Y2hpbmdIYW5kbGVyPEEsIE0+IHtcbiAgcmV0dXJuICEhaGFuZGxlci5kZXRlY3RlZDtcbn1cbiJdfQ==