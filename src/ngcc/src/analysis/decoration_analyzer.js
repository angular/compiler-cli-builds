(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/analysis/decoration_analyzer", ["require", "exports", "tslib", "@angular/compiler", "canonical-path", "fs", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
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
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
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
            this.resolver = new imports_1.TsReferenceResolver(this.program, this.typeChecker, this.options, this.host);
            this.scopeRegistry = new annotations_1.SelectorScopeRegistry(this.typeChecker, this.reflectionHost, this.resolver);
            this.evaluator = new partial_evaluator_1.PartialEvaluator(this.reflectionHost, this.typeChecker, this.resolver);
            this.handlers = [
                new annotations_1.BaseDefDecoratorHandler(this.reflectionHost, this.evaluator),
                new annotations_1.ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, /* defaultPreserveWhitespaces */ false, 
                /* i18nUseExternalIds */ true),
                new annotations_1.DirectiveDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflectionHost, this.isCore),
                new annotations_1.NgModuleDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.referencesRegistry, this.isCore),
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
            var matchingHandlers = this.handlers
                .map(function (handler) {
                var match = handler.detect(clazz.declaration, clazz.decorators);
                return { handler: handler, match: match };
            })
                .filter(isMatchingHandler);
            if (matchingHandlers.length > 1) {
                throw new Error('TODO.Diagnostic: Class has multiple Angular decorators.');
            }
            if (matchingHandlers.length === 0) {
                return null;
            }
            var _a = matchingHandlers[0], handler = _a.handler, match = _a.match;
            var _b = handler.analyze(clazz.declaration, match), analysis = _b.analysis, diagnostics = _b.diagnostics;
            return tslib_1.__assign({}, clazz, { handler: handler, analysis: analysis, diagnostics: diagnostics });
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
            var compilation = clazz.handler.compile(clazz.declaration, clazz.analysis, constantPool);
            if (!Array.isArray(compilation)) {
                compilation = [compilation];
            }
            return compilation;
        };
        return DecorationAnalyzer;
    }());
    exports.DecorationAnalyzer = DecorationAnalyzer;
    function isMatchingHandler(handler) {
        return !!handler.match;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvYW5hbHlzaXMvZGVjb3JhdGlvbl9hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBK0M7SUFDL0MscUNBQXVDO0lBQ3ZDLHVCQUF5QjtJQUd6QiwyRUFBZ1E7SUFDaFEsbUVBQTJEO0lBQzNELHVGQUFrRTtJQUlsRSxrRUFBbUM7SUFzQnRCLFFBQUEsa0JBQWtCLEdBQUcsR0FBRyxDQUFDO0lBT3RDOztPQUVHO0lBQ0g7UUFBQTtZQUNFLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFNckIsQ0FBQztRQUxDLG9DQUFPLEdBQVAsY0FBcUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRSxpQ0FBSSxHQUFKLFVBQUssR0FBVyxJQUFZLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLG9DQUFPLEdBQVAsVUFBUSxHQUFXLEVBQUUsY0FBc0I7WUFDekMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekQsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQVBELElBT0M7SUFFRDs7T0FFRztJQUNIO1FBb0JFLDRCQUNZLE9BQW1CLEVBQVUsT0FBMkIsRUFDeEQsSUFBcUIsRUFBVSxXQUEyQixFQUMxRCxjQUFrQyxFQUFVLGtCQUFzQyxFQUNsRixRQUFrQixFQUFVLE1BQWU7WUFIM0MsWUFBTyxHQUFQLE9BQU8sQ0FBWTtZQUFVLFlBQU8sR0FBUCxPQUFPLENBQW9CO1lBQ3hELFNBQUks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VUFBc0IsWUFBMEI7WUFBaEQsaUJBT0M7WUFOQyxJQUFNLFlBQVksR0FBRyxJQUFJLHVCQUFZLEVBQUUsQ0FBQztZQUN4QyxJQUFNLGVBQWUsR0FBb0IsWUFBWSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsVUFBQSxhQUFhO2dCQUNyRixJQUFNLFdBQVcsR0FBRyxLQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDbkUsNEJBQVcsYUFBYSxJQUFFLFdBQVcsYUFBQSxJQUFFO1lBQ3pDLENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxFQUFDLFlBQVksY0FBQSxFQUFFLFVBQVUsRUFBRSxZQUFZLENBQUMsVUFBVSxFQUFFLGVBQWUsaUJBQUEsRUFBQyxDQUFDO1FBQzlFLENBQUM7UUFFUyx5Q0FBWSxHQUF0QixVQUF1QixLQUFvQixFQUFFLFlBQTBCO1lBQ3JFLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN6RixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDL0IsV0FBVyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDN0I7WUFDRCxPQUFPLFdBQVcsQ0FBQztRQUNyQixDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBdkZELElBdUZDO0lBdkZZLGdEQUFrQjtJQXlGL0IsU0FBUyxpQkFBaUIsQ0FBTyxPQUF1QztRQUV0RSxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBQ3pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0NvbnN0YW50UG9vbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdjYW5vbmljYWwtcGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtCYXNlRGVmRGVjb3JhdG9ySGFuZGxlciwgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlZmVyZW5jZXNSZWdpc3RyeSwgUmVzb3VyY2VMb2FkZXIsIFNlbGVjdG9yU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtUc1JlZmVyZW5jZVJlc29sdmVyfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtEZWNvcmF0ZWRDbGFzc30gZnJvbSAnLi4vaG9zdC9kZWNvcmF0ZWRfY2xhc3MnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7aXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRGaWxlIHtcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZTtcbiAgYW5hbHl6ZWRDbGFzc2VzOiBBbmFseXplZENsYXNzW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRDbGFzcyBleHRlbmRzIERlY29yYXRlZENsYXNzIHtcbiAgZGlhZ25vc3RpY3M/OiB0cy5EaWFnbm9zdGljW107XG4gIGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+O1xuICBhbmFseXNpczogYW55O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkQ2xhc3MgZXh0ZW5kcyBBbmFseXplZENsYXNzIHsgY29tcGlsYXRpb246IENvbXBpbGVSZXN1bHRbXTsgfVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkRmlsZSB7XG4gIGNvbXBpbGVkQ2xhc3NlczogQ29tcGlsZWRDbGFzc1tdO1xuICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlO1xuICBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbDtcbn1cblxuZXhwb3J0IHR5cGUgRGVjb3JhdGlvbkFuYWx5c2VzID0gTWFwPHRzLlNvdXJjZUZpbGUsIENvbXBpbGVkRmlsZT47XG5leHBvcnQgY29uc3QgRGVjb3JhdGlvbkFuYWx5c2VzID0gTWFwO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1hdGNoaW5nSGFuZGxlcjxBLCBNPiB7XG4gIGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8QSwgTT47XG4gIG1hdGNoOiBNO1xufVxuXG4vKipcbiAqIFNpbXBsZSBjbGFzcyB0aGF0IHJlc29sdmVzIGFuZCBsb2FkcyBmaWxlcyBkaXJlY3RseSBmcm9tIHRoZSBmaWxlc3lzdGVtLlxuICovXG5jbGFzcyBOZ2NjUmVzb3VyY2VMb2FkZXIgaW1wbGVtZW50cyBSZXNvdXJjZUxvYWRlciB7XG4gIGNhblByZWxvYWQgPSBmYWxzZTtcbiAgcHJlbG9hZCgpOiB1bmRlZmluZWR8UHJvbWlzZTx2b2lkPiB7IHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkLicpOyB9XG4gIGxvYWQodXJsOiBzdHJpbmcpOiBzdHJpbmcgeyByZXR1cm4gZnMucmVhZEZpbGVTeW5jKHVybCwgJ3V0ZjgnKTsgfVxuICByZXNvbHZlKHVybDogc3RyaW5nLCBjb250YWluaW5nRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShjb250YWluaW5nRmlsZSksIHVybCk7XG4gIH1cbn1cblxuLyoqXG4gKiBUaGlzIEFuYWx5emVyIHdpbGwgYW5hbHl6ZSB0aGUgZmlsZXMgdGhhdCBoYXZlIGRlY29yYXRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZC5cbiAqL1xuZXhwb3J0IGNsYXNzIERlY29yYXRpb25BbmFseXplciB7XG4gIHJlc291cmNlTWFuYWdlciA9IG5ldyBOZ2NjUmVzb3VyY2VMb2FkZXIoKTtcbiAgcmVzb2x2ZXIgPSBuZXcgVHNSZWZlcmVuY2VSZXNvbHZlcih0aGlzLnByb2dyYW0sIHRoaXMudHlwZUNoZWNrZXIsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgc2NvcGVSZWdpc3RyeSA9IG5ldyBTZWxlY3RvclNjb3BlUmVnaXN0cnkodGhpcy50eXBlQ2hlY2tlciwgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5yZXNvbHZlcik7XG4gIGV2YWx1YXRvciA9IG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMudHlwZUNoZWNrZXIsIHRoaXMucmVzb2x2ZXIpO1xuICBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT5bXSA9IFtcbiAgICBuZXcgQmFzZURlZkRlY29yYXRvckhhbmRsZXIodGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IpLFxuICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgdGhpcy5yZXNvdXJjZU1hbmFnZXIsXG4gICAgICAgIHRoaXMucm9vdERpcnMsIC8qIGRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzICovIGZhbHNlLFxuICAgICAgICAvKiBpMThuVXNlRXh0ZXJuYWxJZHMgKi8gdHJ1ZSksXG4gICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlKSxcbiAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIodGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5pc0NvcmUpLFxuICAgIG5ldyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgICB0aGlzLmlzQ29yZSksXG4gICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlKSxcbiAgXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgcHJpdmF0ZSBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMsXG4gICAgICBwcml2YXRlIGhvc3Q6IHRzLkNvbXBpbGVySG9zdCwgcHJpdmF0ZSB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgICBwcml2YXRlIHJlZmxlY3Rpb25Ib3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgcmVmZXJlbmNlc1JlZ2lzdHJ5OiBSZWZlcmVuY2VzUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHJvb3REaXJzOiBzdHJpbmdbXSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4pIHt9XG5cbiAgLyoqXG4gICAqIEFuYWx5emUgYSBwcm9ncmFtIHRvIGZpbmQgYWxsIHRoZSBkZWNvcmF0ZWQgZmlsZXMgc2hvdWxkIGJlIHRyYW5zZm9ybWVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBhIG1hcCBvZiB0aGUgc291cmNlIGZpbGVzIHRvIHRoZSBhbmFseXNpcyBmb3IgdGhvc2UgZmlsZXMuXG4gICAqL1xuICBhbmFseXplUHJvZ3JhbSgpOiBEZWNvcmF0aW9uQW5hbHlzZXMge1xuICAgIGNvbnN0IGRlY29yYXRpb25BbmFseXNlcyA9IG5ldyBEZWNvcmF0aW9uQW5hbHlzZXMoKTtcbiAgICBjb25zdCBhbmFseXNlZEZpbGVzID0gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoc291cmNlRmlsZSA9PiB0aGlzLmFuYWx5emVGaWxlKHNvdXJjZUZpbGUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpc0RlZmluZWQpO1xuICAgIGNvbnN0IGNvbXBpbGVkRmlsZXMgPSBhbmFseXNlZEZpbGVzLm1hcChhbmFseXNlZEZpbGUgPT4gdGhpcy5jb21waWxlRmlsZShhbmFseXNlZEZpbGUpKTtcbiAgICBjb21waWxlZEZpbGVzLmZvckVhY2goXG4gICAgICAgIGNvbXBpbGVkRmlsZSA9PiBkZWNvcmF0aW9uQW5hbHlzZXMuc2V0KGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLCBjb21waWxlZEZpbGUpKTtcbiAgICByZXR1cm4gZGVjb3JhdGlvbkFuYWx5c2VzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVGaWxlKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBBbmFseXplZEZpbGV8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBkZWNvcmF0ZWRDbGFzc2VzID0gdGhpcy5yZWZsZWN0aW9uSG9zdC5maW5kRGVjb3JhdGVkQ2xhc3Nlcyhzb3VyY2VGaWxlKTtcbiAgICByZXR1cm4gZGVjb3JhdGVkQ2xhc3Nlcy5sZW5ndGggPyB7XG4gICAgICBzb3VyY2VGaWxlLFxuICAgICAgYW5hbHl6ZWRDbGFzc2VzOiBkZWNvcmF0ZWRDbGFzc2VzLm1hcChjbGF6eiA9PiB0aGlzLmFuYWx5emVDbGFzcyhjbGF6eikpLmZpbHRlcihpc0RlZmluZWQpXG4gICAgfSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVDbGFzcyhjbGF6ejogRGVjb3JhdGVkQ2xhc3MpOiBBbmFseXplZENsYXNzfG51bGwge1xuICAgIGNvbnN0IG1hdGNoaW5nSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGhhbmRsZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRjaCA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyLmRldGVjdChjbGF6ei5kZWNsYXJhdGlvbiwgY2xhenouZGVjb3JhdG9ycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7aGFuZGxlciwgbWF0Y2h9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaXNNYXRjaGluZ0hhbmRsZXIpO1xuXG4gICAgaWYgKG1hdGNoaW5nSGFuZGxlcnMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUT0RPLkRpYWdub3N0aWM6IENsYXNzIGhhcyBtdWx0aXBsZSBBbmd1bGFyIGRlY29yYXRvcnMuJyk7XG4gICAgfVxuICAgIGlmIChtYXRjaGluZ0hhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHtoYW5kbGVyLCBtYXRjaH0gPSBtYXRjaGluZ0hhbmRsZXJzWzBdO1xuICAgIGNvbnN0IHthbmFseXNpcywgZGlhZ25vc3RpY3N9ID0gaGFuZGxlci5hbmFseXplKGNsYXp6LmRlY2xhcmF0aW9uLCBtYXRjaCk7XG4gICAgcmV0dXJuIHsuLi5jbGF6eiwgaGFuZGxlciwgYW5hbHlzaXMsIGRpYWdub3N0aWNzfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb21waWxlRmlsZShhbmFseXplZEZpbGU6IEFuYWx5emVkRmlsZSk6IENvbXBpbGVkRmlsZSB7XG4gICAgY29uc3QgY29uc3RhbnRQb29sID0gbmV3IENvbnN0YW50UG9vbCgpO1xuICAgIGNvbnN0IGNvbXBpbGVkQ2xhc3NlczogQ29tcGlsZWRDbGFzc1tdID0gYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5tYXAoYW5hbHl6ZWRDbGFzcyA9PiB7XG4gICAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuY29tcGlsZUNsYXNzKGFuYWx5emVkQ2xhc3MsIGNvbnN0YW50UG9vbCk7XG4gICAgICByZXR1cm4gey4uLmFuYWx5emVkQ2xhc3MsIGNvbXBpbGF0aW9ufTtcbiAgICB9KTtcbiAgICByZXR1cm4ge2NvbnN0YW50UG9vbCwgc291cmNlRmlsZTogYW5hbHl6ZWRGaWxlLnNvdXJjZUZpbGUsIGNvbXBpbGVkQ2xhc3Nlc307XG4gIH1cblxuICBwcm90ZWN0ZWQgY29tcGlsZUNsYXNzKGNsYXp6OiBBbmFseXplZENsYXNzLCBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCk6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgbGV0IGNvbXBpbGF0aW9uID0gY2xhenouaGFuZGxlci5jb21waWxlKGNsYXp6LmRlY2xhcmF0aW9uLCBjbGF6ei5hbmFseXNpcywgY29uc3RhbnRQb29sKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoY29tcGlsYXRpb24pKSB7XG4gICAgICBjb21waWxhdGlvbiA9IFtjb21waWxhdGlvbl07XG4gICAgfVxuICAgIHJldHVybiBjb21waWxhdGlvbjtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc01hdGNoaW5nSGFuZGxlcjxBLCBNPihoYW5kbGVyOiBQYXJ0aWFsPE1hdGNoaW5nSGFuZGxlcjxBLCBNPj4pOlxuICAgIGhhbmRsZXIgaXMgTWF0Y2hpbmdIYW5kbGVyPEEsIE0+IHtcbiAgcmV0dXJuICEhaGFuZGxlci5tYXRjaDtcbn1cbiJdfQ==