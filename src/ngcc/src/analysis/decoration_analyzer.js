(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/analysis/decoration_analyzer", ["require", "exports", "tslib", "@angular/compiler", "canonical-path", "fs", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
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
            this.moduleResolver = new imports_1.ModuleResolver(this.program, this.options, this.host);
            this.importGraph = new cycles_1.ImportGraph(this.moduleResolver);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(this.importGraph);
            this.handlers = [
                new annotations_1.BaseDefDecoratorHandler(this.reflectionHost, this.evaluator),
                new annotations_1.ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, /* defaultPreserveWhitespaces */ false, /* i18nUseExternalIds */ true, this.moduleResolver, this.cycleAnalyzer),
                new annotations_1.DirectiveDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflectionHost, this.isCore),
                new annotations_1.NgModuleDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.referencesRegistry, this.isCore, /* routeAnalyzer */ null),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvYW5hbHlzaXMvZGVjb3JhdGlvbl9hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBK0M7SUFDL0MscUNBQXVDO0lBQ3ZDLHVCQUF5QjtJQUd6QiwyRUFBZ1E7SUFDaFEsaUVBQWlFO0lBQ2pFLG1FQUEyRTtJQUMzRSx1RkFBa0U7SUFJbEUsa0VBQW1DO0lBc0J0QixRQUFBLGtCQUFrQixHQUFHLEdBQUcsQ0FBQztJQU90Qzs7T0FFRztJQUNIO1FBQUE7WUFDRSxlQUFVLEdBQUcsS0FBSyxDQUFDO1FBTXJCLENBQUM7UUFMQyxvQ0FBTyxHQUFQLGNBQXFDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsaUNBQUksR0FBSixVQUFLLEdBQVcsSUFBWSxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxvQ0FBTyxHQUFQLFVBQVEsR0FBVyxFQUFFLGNBQXNCO1lBQ3pDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUFQRCxJQU9DO0lBRUQ7O09BRUc7SUFDSDtRQXVCRSw0QkFDWSxPQUFtQixFQUFVLE9BQTJCLEVBQ3hELElBQXFCLEVBQVUsV0FBMkIsRUFDMUQsY0FBa0MsRUFBVSxrQkFBc0MsRUFDbEYsUUFBa0IsRUFBVSxNQUFlO1lBSDNDLFlBQU8sR0FBUCxPQUFPLENBQVk7WUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFv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QUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBMUZELElBMEZDO0lBMUZZLGdEQUFrQjtJQTRGL0IsU0FBUyxpQkFBaUIsQ0FBTyxPQUF1QztRQUV0RSxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBQ3pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0NvbnN0YW50UG9vbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdjYW5vbmljYWwtcGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtCYXNlRGVmRGVjb3JhdG9ySGFuZGxlciwgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlZmVyZW5jZXNSZWdpc3RyeSwgUmVzb3VyY2VMb2FkZXIsIFNlbGVjdG9yU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtDeWNsZUFuYWx5emVyLCBJbXBvcnRHcmFwaH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvY3ljbGVzJztcbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXIsIFRzUmVmZXJlbmNlUmVzb2x2ZXJ9IGZyb20gJy4uLy4uLy4uL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uLy4uL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge0RlY29yYXRlZENsYXNzfSBmcm9tICcuLi9ob3N0L2RlY29yYXRlZF9jbGFzcyc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBBbmFseXplZEZpbGUge1xuICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlO1xuICBhbmFseXplZENsYXNzZXM6IEFuYWx5emVkQ2xhc3NbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBbmFseXplZENsYXNzIGV4dGVuZHMgRGVjb3JhdGVkQ2xhc3Mge1xuICBkaWFnbm9zdGljcz86IHRzLkRpYWdub3N0aWNbXTtcbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT47XG4gIGFuYWx5c2lzOiBhbnk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRDbGFzcyBleHRlbmRzIEFuYWx5emVkQ2xhc3MgeyBjb21waWxhdGlvbjogQ29tcGlsZVJlc3VsdFtdOyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRGaWxlIHtcbiAgY29tcGlsZWRDbGFzc2VzOiBDb21waWxlZENsYXNzW107XG4gIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGU7XG4gIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sO1xufVxuXG5leHBvcnQgdHlwZSBEZWNvcmF0aW9uQW5hbHlzZXMgPSBNYXA8dHMuU291cmNlRmlsZSwgQ29tcGlsZWRGaWxlPjtcbmV4cG9ydCBjb25zdCBEZWNvcmF0aW9uQW5hbHlzZXMgPSBNYXA7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hpbmdIYW5kbGVyPEEsIE0+IHtcbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxBLCBNPjtcbiAgbWF0Y2g6IE07XG59XG5cbi8qKlxuICogU2ltcGxlIGNsYXNzIHRoYXQgcmVzb2x2ZXMgYW5kIGxvYWRzIGZpbGVzIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW0uXG4gKi9cbmNsYXNzIE5nY2NSZXNvdXJjZUxvYWRlciBpbXBsZW1lbnRzIFJlc291cmNlTG9hZGVyIHtcbiAgY2FuUHJlbG9hZCA9IGZhbHNlO1xuICBwcmVsb2FkKCk6IHVuZGVmaW5lZHxQcm9taXNlPHZvaWQ+IHsgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQuJyk7IH1cbiAgbG9hZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiBmcy5yZWFkRmlsZVN5bmModXJsLCAndXRmOCcpOyB9XG4gIHJlc29sdmUodXJsOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKGNvbnRhaW5pbmdGaWxlKSwgdXJsKTtcbiAgfVxufVxuXG4vKipcbiAqIFRoaXMgQW5hbHl6ZXIgd2lsbCBhbmFseXplIHRoZSBmaWxlcyB0aGF0IGhhdmUgZGVjb3JhdGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkLlxuICovXG5leHBvcnQgY2xhc3MgRGVjb3JhdGlvbkFuYWx5emVyIHtcbiAgcmVzb3VyY2VNYW5hZ2VyID0gbmV3IE5nY2NSZXNvdXJjZUxvYWRlcigpO1xuICByZXNvbHZlciA9IG5ldyBUc1JlZmVyZW5jZVJlc29sdmVyKHRoaXMucHJvZ3JhbSwgdGhpcy50eXBlQ2hlY2tlciwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QpO1xuICBzY29wZVJlZ2lzdHJ5ID0gbmV3IFNlbGVjdG9yU2NvcGVSZWdpc3RyeSh0aGlzLnR5cGVDaGVja2VyLCB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLnJlc29sdmVyKTtcbiAgZXZhbHVhdG9yID0gbmV3IFBhcnRpYWxFdmFsdWF0b3IodGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy50eXBlQ2hlY2tlciwgdGhpcy5yZXNvbHZlcik7XG4gIG1vZHVsZVJlc29sdmVyID0gbmV3IE1vZHVsZVJlc29sdmVyKHRoaXMucHJvZ3JhbSwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QpO1xuICBpbXBvcnRHcmFwaCA9IG5ldyBJbXBvcnRHcmFwaCh0aGlzLm1vZHVsZVJlc29sdmVyKTtcbiAgY3ljbGVBbmFseXplciA9IG5ldyBDeWNsZUFuYWx5emVyKHRoaXMuaW1wb3J0R3JhcGgpO1xuICBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT5bXSA9IFtcbiAgICBuZXcgQmFzZURlZkRlY29yYXRvckhhbmRsZXIodGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IpLFxuICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgdGhpcy5yZXNvdXJjZU1hbmFnZXIsXG4gICAgICAgIHRoaXMucm9vdERpcnMsIC8qIGRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzICovIGZhbHNlLCAvKiBpMThuVXNlRXh0ZXJuYWxJZHMgKi8gdHJ1ZSxcbiAgICAgICAgdGhpcy5tb2R1bGVSZXNvbHZlciwgdGhpcy5jeWNsZUFuYWx5emVyKSxcbiAgICBuZXcgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUpLFxuICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmlzQ29yZSksXG4gICAgbmV3IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5yZWZlcmVuY2VzUmVnaXN0cnksXG4gICAgICAgIHRoaXMuaXNDb3JlLCAvKiByb3V0ZUFuYWx5emVyICovIG51bGwpLFxuICAgIG5ldyBQaXBlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSksXG4gIF07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHByb2dyYW06IHRzLlByb2dyYW0sIHByaXZhdGUgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBob3N0OiB0cy5Db21waWxlckhvc3QsIHByaXZhdGUgdHlwZUNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0aW9uSG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSByb290RGlyczogc3RyaW5nW10sIHByaXZhdGUgaXNDb3JlOiBib29sZWFuKSB7fVxuXG4gIC8qKlxuICAgKiBBbmFseXplIGEgcHJvZ3JhbSB0byBmaW5kIGFsbCB0aGUgZGVjb3JhdGVkIGZpbGVzIHNob3VsZCBiZSB0cmFuc2Zvcm1lZC5cbiAgICpcbiAgICogQHJldHVybnMgYSBtYXAgb2YgdGhlIHNvdXJjZSBmaWxlcyB0byB0aGUgYW5hbHlzaXMgZm9yIHRob3NlIGZpbGVzLlxuICAgKi9cbiAgYW5hbHl6ZVByb2dyYW0oKTogRGVjb3JhdGlvbkFuYWx5c2VzIHtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHlzZXMgPSBuZXcgRGVjb3JhdGlvbkFuYWx5c2VzKCk7XG4gICAgY29uc3QgYW5hbHlzZWRGaWxlcyA9IHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKHNvdXJjZUZpbGUgPT4gdGhpcy5hbmFseXplRmlsZShzb3VyY2VGaWxlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgICBjb25zdCBjb21waWxlZEZpbGVzID0gYW5hbHlzZWRGaWxlcy5tYXAoYW5hbHlzZWRGaWxlID0+IHRoaXMuY29tcGlsZUZpbGUoYW5hbHlzZWRGaWxlKSk7XG4gICAgY29tcGlsZWRGaWxlcy5mb3JFYWNoKFxuICAgICAgICBjb21waWxlZEZpbGUgPT4gZGVjb3JhdGlvbkFuYWx5c2VzLnNldChjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlKSk7XG4gICAgcmV0dXJuIGRlY29yYXRpb25BbmFseXNlcztcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplRmlsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogQW5hbHl6ZWRGaWxlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZGVjb3JhdGVkQ2xhc3NlcyA9IHRoaXMucmVmbGVjdGlvbkhvc3QuZmluZERlY29yYXRlZENsYXNzZXMoc291cmNlRmlsZSk7XG4gICAgcmV0dXJuIGRlY29yYXRlZENsYXNzZXMubGVuZ3RoID8ge1xuICAgICAgc291cmNlRmlsZSxcbiAgICAgIGFuYWx5emVkQ2xhc3NlczogZGVjb3JhdGVkQ2xhc3Nlcy5tYXAoY2xhenogPT4gdGhpcy5hbmFseXplQ2xhc3MoY2xhenopKS5maWx0ZXIoaXNEZWZpbmVkKVxuICAgIH0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplQ2xhc3MoY2xheno6IERlY29yYXRlZENsYXNzKTogQW5hbHl6ZWRDbGFzc3xudWxsIHtcbiAgICBjb25zdCBtYXRjaGluZ0hhbmRsZXJzID0gdGhpcy5oYW5kbGVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChoYW5kbGVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0Y2ggPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5kZXRlY3QoY2xhenouZGVjbGFyYXRpb24sIGNsYXp6LmRlY29yYXRvcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge2hhbmRsZXIsIG1hdGNofTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGlzTWF0Y2hpbmdIYW5kbGVyKTtcblxuICAgIGlmIChtYXRjaGluZ0hhbmRsZXJzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVE9ETy5EaWFnbm9zdGljOiBDbGFzcyBoYXMgbXVsdGlwbGUgQW5ndWxhciBkZWNvcmF0b3JzLicpO1xuICAgIH1cbiAgICBpZiAobWF0Y2hpbmdIYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB7aGFuZGxlciwgbWF0Y2h9ID0gbWF0Y2hpbmdIYW5kbGVyc1swXTtcbiAgICBjb25zdCB7YW5hbHlzaXMsIGRpYWdub3N0aWNzfSA9IGhhbmRsZXIuYW5hbHl6ZShjbGF6ei5kZWNsYXJhdGlvbiwgbWF0Y2gpO1xuICAgIHJldHVybiB7Li4uY2xhenosIGhhbmRsZXIsIGFuYWx5c2lzLCBkaWFnbm9zdGljc307XG4gIH1cblxuICBwcm90ZWN0ZWQgY29tcGlsZUZpbGUoYW5hbHl6ZWRGaWxlOiBBbmFseXplZEZpbGUpOiBDb21waWxlZEZpbGUge1xuICAgIGNvbnN0IGNvbnN0YW50UG9vbCA9IG5ldyBDb25zdGFudFBvb2woKTtcbiAgICBjb25zdCBjb21waWxlZENsYXNzZXM6IENvbXBpbGVkQ2xhc3NbXSA9IGFuYWx5emVkRmlsZS5hbmFseXplZENsYXNzZXMubWFwKGFuYWx5emVkQ2xhc3MgPT4ge1xuICAgICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmNvbXBpbGVDbGFzcyhhbmFseXplZENsYXNzLCBjb25zdGFudFBvb2wpO1xuICAgICAgcmV0dXJuIHsuLi5hbmFseXplZENsYXNzLCBjb21waWxhdGlvbn07XG4gICAgfSk7XG4gICAgcmV0dXJuIHtjb25zdGFudFBvb2wsIHNvdXJjZUZpbGU6IGFuYWx5emVkRmlsZS5zb3VyY2VGaWxlLCBjb21waWxlZENsYXNzZXN9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbXBpbGVDbGFzcyhjbGF6ejogQW5hbHl6ZWRDbGFzcywgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGxldCBjb21waWxhdGlvbiA9IGNsYXp6LmhhbmRsZXIuY29tcGlsZShjbGF6ei5kZWNsYXJhdGlvbiwgY2xhenouYW5hbHlzaXMsIGNvbnN0YW50UG9vbCk7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGNvbXBpbGF0aW9uKSkge1xuICAgICAgY29tcGlsYXRpb24gPSBbY29tcGlsYXRpb25dO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGlsYXRpb247XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNNYXRjaGluZ0hhbmRsZXI8QSwgTT4oaGFuZGxlcjogUGFydGlhbDxNYXRjaGluZ0hhbmRsZXI8QSwgTT4+KTpcbiAgICBoYW5kbGVyIGlzIE1hdGNoaW5nSGFuZGxlcjxBLCBNPiB7XG4gIHJldHVybiAhIWhhbmRsZXIubWF0Y2g7XG59XG4iXX0=