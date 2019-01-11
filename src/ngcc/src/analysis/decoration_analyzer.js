(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/analysis/decoration_analyzer", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "canonical-path", "fs", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
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
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var path = require("canonical-path");
    var fs = require("fs");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
    exports.DecorationAnalyses = Map;
    /**
     * `ResourceLoader` which directly uses the filesystem to resolve resources synchronously.
     */
    var FileResourceLoader = /** @class */ (function () {
        function FileResourceLoader() {
        }
        FileResourceLoader.prototype.load = function (url, containingFile) {
            url = path.resolve(path.dirname(containingFile), url);
            return fs.readFileSync(url, 'utf8');
        };
        return FileResourceLoader;
    }());
    exports.FileResourceLoader = FileResourceLoader;
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
            this.resourceLoader = new FileResourceLoader();
            this.resolver = new imports_1.TsReferenceResolver(this.program, this.typeChecker, this.options, this.host);
            this.scopeRegistry = new annotations_1.SelectorScopeRegistry(this.typeChecker, this.reflectionHost, this.resolver);
            this.evaluator = new partial_evaluator_1.PartialEvaluator(this.reflectionHost, this.typeChecker, this.resolver);
            this.handlers = [
                new annotations_1.BaseDefDecoratorHandler(this.reflectionHost, this.evaluator),
                new annotations_1.ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.isCore, this.resourceLoader, this.rootDirs, /* defaultPreserveWhitespaces */ false, /* i18nUseExternalIds */ true),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvYW5hbHlzaXMvZGVjb3JhdGlvbl9hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBK0M7SUFDL0MsbUVBQTRFO0lBQzVFLHVGQUFtRjtJQUNuRixxQ0FBdUM7SUFDdkMsdUJBQXlCO0lBR3pCLDJFQUFnUTtJQUloUSxrRUFBbUM7SUFzQnRCLFFBQUEsa0JBQWtCLEdBQUcsR0FBRyxDQUFDO0lBT3RDOztPQUVHO0lBQ0g7UUFBQTtRQUtBLENBQUM7UUFKQyxpQ0FBSSxHQUFKLFVBQUssR0FBVyxFQUFFLGNBQXNCO1lBQ3RDLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDdEQsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBTEQsSUFLQztJQUxZLGdEQUFrQjtJQU8vQjs7T0FFRztJQUNIO1FBbUJFLDRCQUNZLE9BQW1CLEVBQVUsT0FBMkIsRUFDeEQsSUFBcUIsRUFBVSxXQUEyQixFQUMxRCxjQUFrQyxFQUFVLGtCQUFzQyxFQUNsRixRQUFrQixFQUFVLE1BQWU7WUFIM0MsWUFBTyxHQUFQLE9BQU8sQ0FBWTtZQUFVLFlBQU8sR0FBUCxPQUFPLENBQW9CO1lBQ3hELFNBQUksR0FBSixJQUFJLENBQWlCO1lBQVUsZ0JBQVcsR0FBWCxXQUFXLENBQWdCO1lBQzFELG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtZQUFVLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7WUFDbEYsYUFBUSxH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LFVBQUEsYUFBYTtnQkFDckYsSUFBTSxXQUFXLEdBQUcsS0FBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQ25FLDRCQUFXLGFBQWEsSUFBRSxXQUFXLGFBQUEsSUFBRTtZQUN6QyxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sRUFBQyxZQUFZLGNBQUEsRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLFVBQVUsRUFBRSxlQUFlLGlCQUFBLEVBQUMsQ0FBQztRQUM5RSxDQUFDO1FBRVMseUNBQVksR0FBdEIsVUFBdUIsS0FBb0IsRUFBRSxZQUEwQjtZQUNyRSxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDekYsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQy9CLFdBQVcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQzdCO1lBQ0QsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQXRGRCxJQXNGQztJQXRGWSxnREFBa0I7SUF3Ri9CLFNBQVMsaUJBQWlCLENBQU8sT0FBdUM7UUFFdEUsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztJQUN6QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtDb25zdGFudFBvb2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7VHNSZWZlcmVuY2VSZXNvbHZlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Jhc2VEZWZEZWNvcmF0b3JIYW5kbGVyLCBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5LCBSZXNvdXJjZUxvYWRlciwgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0NvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uLy4uL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge0RlY29yYXRlZENsYXNzfSBmcm9tICcuLi9ob3N0L2RlY29yYXRlZF9jbGFzcyc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBBbmFseXplZEZpbGUge1xuICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlO1xuICBhbmFseXplZENsYXNzZXM6IEFuYWx5emVkQ2xhc3NbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBbmFseXplZENsYXNzIGV4dGVuZHMgRGVjb3JhdGVkQ2xhc3Mge1xuICBkaWFnbm9zdGljcz86IHRzLkRpYWdub3N0aWNbXTtcbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT47XG4gIGFuYWx5c2lzOiBhbnk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRDbGFzcyBleHRlbmRzIEFuYWx5emVkQ2xhc3MgeyBjb21waWxhdGlvbjogQ29tcGlsZVJlc3VsdFtdOyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRGaWxlIHtcbiAgY29tcGlsZWRDbGFzc2VzOiBDb21waWxlZENsYXNzW107XG4gIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGU7XG4gIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sO1xufVxuXG5leHBvcnQgdHlwZSBEZWNvcmF0aW9uQW5hbHlzZXMgPSBNYXA8dHMuU291cmNlRmlsZSwgQ29tcGlsZWRGaWxlPjtcbmV4cG9ydCBjb25zdCBEZWNvcmF0aW9uQW5hbHlzZXMgPSBNYXA7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hpbmdIYW5kbGVyPEEsIE0+IHtcbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxBLCBNPjtcbiAgbWF0Y2g6IE07XG59XG5cbi8qKlxuICogYFJlc291cmNlTG9hZGVyYCB3aGljaCBkaXJlY3RseSB1c2VzIHRoZSBmaWxlc3lzdGVtIHRvIHJlc29sdmUgcmVzb3VyY2VzIHN5bmNocm9ub3VzbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWxlUmVzb3VyY2VMb2FkZXIgaW1wbGVtZW50cyBSZXNvdXJjZUxvYWRlciB7XG4gIGxvYWQodXJsOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHVybCA9IHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUoY29udGFpbmluZ0ZpbGUpLCB1cmwpO1xuICAgIHJldHVybiBmcy5yZWFkRmlsZVN5bmModXJsLCAndXRmOCcpO1xuICB9XG59XG5cbi8qKlxuICogVGhpcyBBbmFseXplciB3aWxsIGFuYWx5emUgdGhlIGZpbGVzIHRoYXQgaGF2ZSBkZWNvcmF0ZWQgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgdHJhbnNmb3JtZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWNvcmF0aW9uQW5hbHl6ZXIge1xuICByZXNvdXJjZUxvYWRlciA9IG5ldyBGaWxlUmVzb3VyY2VMb2FkZXIoKTtcbiAgcmVzb2x2ZXIgPSBuZXcgVHNSZWZlcmVuY2VSZXNvbHZlcih0aGlzLnByb2dyYW0sIHRoaXMudHlwZUNoZWNrZXIsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgc2NvcGVSZWdpc3RyeSA9IG5ldyBTZWxlY3RvclNjb3BlUmVnaXN0cnkodGhpcy50eXBlQ2hlY2tlciwgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5yZXNvbHZlcik7XG4gIGV2YWx1YXRvciA9IG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMudHlwZUNoZWNrZXIsIHRoaXMucmVzb2x2ZXIpO1xuICBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT5bXSA9IFtcbiAgICBuZXcgQmFzZURlZkRlY29yYXRvckhhbmRsZXIodGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IpLFxuICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgdGhpcy5yZXNvdXJjZUxvYWRlcixcbiAgICAgICAgdGhpcy5yb290RGlycywgLyogZGVmYXVsdFByZXNlcnZlV2hpdGVzcGFjZXMgKi8gZmFsc2UsIC8qIGkxOG5Vc2VFeHRlcm5hbElkcyAqLyB0cnVlKSxcbiAgICBuZXcgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUpLFxuICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmlzQ29yZSksXG4gICAgbmV3IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5yZWZlcmVuY2VzUmVnaXN0cnksXG4gICAgICAgIHRoaXMuaXNDb3JlKSxcbiAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIodGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUpLFxuICBdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBwcml2YXRlIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyxcbiAgICAgIHByaXZhdGUgaG9zdDogdHMuQ29tcGlsZXJIb3N0LCBwcml2YXRlIHR5cGVDaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIHByaXZhdGUgcmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgcm9vdERpcnM6IHN0cmluZ1tdLCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbikge31cblxuICAvKipcbiAgICogQW5hbHl6ZSBhIHByb2dyYW0gdG8gZmluZCBhbGwgdGhlIGRlY29yYXRlZCBmaWxlcyBzaG91bGQgYmUgdHJhbnNmb3JtZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgbWFwIG9mIHRoZSBzb3VyY2UgZmlsZXMgdG8gdGhlIGFuYWx5c2lzIGZvciB0aG9zZSBmaWxlcy5cbiAgICovXG4gIGFuYWx5emVQcm9ncmFtKCk6IERlY29yYXRpb25BbmFseXNlcyB7XG4gICAgY29uc3QgZGVjb3JhdGlvbkFuYWx5c2VzID0gbmV3IERlY29yYXRpb25BbmFseXNlcygpO1xuICAgIGNvbnN0IGFuYWx5c2VkRmlsZXMgPSB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChzb3VyY2VGaWxlID0+IHRoaXMuYW5hbHl6ZUZpbGUoc291cmNlRmlsZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG4gICAgY29uc3QgY29tcGlsZWRGaWxlcyA9IGFuYWx5c2VkRmlsZXMubWFwKGFuYWx5c2VkRmlsZSA9PiB0aGlzLmNvbXBpbGVGaWxlKGFuYWx5c2VkRmlsZSkpO1xuICAgIGNvbXBpbGVkRmlsZXMuZm9yRWFjaChcbiAgICAgICAgY29tcGlsZWRGaWxlID0+IGRlY29yYXRpb25BbmFseXNlcy5zZXQoY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZSkpO1xuICAgIHJldHVybiBkZWNvcmF0aW9uQW5hbHlzZXM7XG4gIH1cblxuICBwcm90ZWN0ZWQgYW5hbHl6ZUZpbGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IEFuYWx5emVkRmlsZXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGRlY29yYXRlZENsYXNzZXMgPSB0aGlzLnJlZmxlY3Rpb25Ib3N0LmZpbmREZWNvcmF0ZWRDbGFzc2VzKHNvdXJjZUZpbGUpO1xuICAgIHJldHVybiBkZWNvcmF0ZWRDbGFzc2VzLmxlbmd0aCA/IHtcbiAgICAgIHNvdXJjZUZpbGUsXG4gICAgICBhbmFseXplZENsYXNzZXM6IGRlY29yYXRlZENsYXNzZXMubWFwKGNsYXp6ID0+IHRoaXMuYW5hbHl6ZUNsYXNzKGNsYXp6KSkuZmlsdGVyKGlzRGVmaW5lZClcbiAgICB9IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQ7XG4gIH1cblxuICBwcm90ZWN0ZWQgYW5hbHl6ZUNsYXNzKGNsYXp6OiBEZWNvcmF0ZWRDbGFzcyk6IEFuYWx5emVkQ2xhc3N8bnVsbCB7XG4gICAgY29uc3QgbWF0Y2hpbmdIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoaGFuZGxlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXIuZGV0ZWN0KGNsYXp6LmRlY2xhcmF0aW9uLCBjbGF6ei5kZWNvcmF0b3JzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtoYW5kbGVyLCBtYXRjaH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpc01hdGNoaW5nSGFuZGxlcik7XG5cbiAgICBpZiAobWF0Y2hpbmdIYW5kbGVycy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RPRE8uRGlhZ25vc3RpYzogQ2xhc3MgaGFzIG11bHRpcGxlIEFuZ3VsYXIgZGVjb3JhdG9ycy4nKTtcbiAgICB9XG4gICAgaWYgKG1hdGNoaW5nSGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qge2hhbmRsZXIsIG1hdGNofSA9IG1hdGNoaW5nSGFuZGxlcnNbMF07XG4gICAgY29uc3Qge2FuYWx5c2lzLCBkaWFnbm9zdGljc30gPSBoYW5kbGVyLmFuYWx5emUoY2xhenouZGVjbGFyYXRpb24sIG1hdGNoKTtcbiAgICByZXR1cm4gey4uLmNsYXp6LCBoYW5kbGVyLCBhbmFseXNpcywgZGlhZ25vc3RpY3N9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbXBpbGVGaWxlKGFuYWx5emVkRmlsZTogQW5hbHl6ZWRGaWxlKTogQ29tcGlsZWRGaWxlIHtcbiAgICBjb25zdCBjb25zdGFudFBvb2wgPSBuZXcgQ29uc3RhbnRQb29sKCk7XG4gICAgY29uc3QgY29tcGlsZWRDbGFzc2VzOiBDb21waWxlZENsYXNzW10gPSBhbmFseXplZEZpbGUuYW5hbHl6ZWRDbGFzc2VzLm1hcChhbmFseXplZENsYXNzID0+IHtcbiAgICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5jb21waWxlQ2xhc3MoYW5hbHl6ZWRDbGFzcywgY29uc3RhbnRQb29sKTtcbiAgICAgIHJldHVybiB7Li4uYW5hbHl6ZWRDbGFzcywgY29tcGlsYXRpb259O1xuICAgIH0pO1xuICAgIHJldHVybiB7Y29uc3RhbnRQb29sLCBzb3VyY2VGaWxlOiBhbmFseXplZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRDbGFzc2VzfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb21waWxlQ2xhc3MoY2xheno6IEFuYWx5emVkQ2xhc3MsIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBsZXQgY29tcGlsYXRpb24gPSBjbGF6ei5oYW5kbGVyLmNvbXBpbGUoY2xhenouZGVjbGFyYXRpb24sIGNsYXp6LmFuYWx5c2lzLCBjb25zdGFudFBvb2wpO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShjb21waWxhdGlvbikpIHtcbiAgICAgIGNvbXBpbGF0aW9uID0gW2NvbXBpbGF0aW9uXTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBpbGF0aW9uO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzTWF0Y2hpbmdIYW5kbGVyPEEsIE0+KGhhbmRsZXI6IFBhcnRpYWw8TWF0Y2hpbmdIYW5kbGVyPEEsIE0+Pik6XG4gICAgaGFuZGxlciBpcyBNYXRjaGluZ0hhbmRsZXI8QSwgTT4ge1xuICByZXR1cm4gISFoYW5kbGVyLm1hdGNoO1xufVxuIl19