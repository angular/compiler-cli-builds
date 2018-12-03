(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/analysis/decoration_analyzer", ["require", "exports", "tslib", "@angular/compiler", "fs", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
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
        FileResourceLoader.prototype.load = function (url) { return fs.readFileSync(url, 'utf8'); };
        return FileResourceLoader;
    }());
    exports.FileResourceLoader = FileResourceLoader;
    /**
     * This Analyzer will analyze the files that have decorated classes that need to be transformed.
     */
    var DecorationAnalyzer = /** @class */ (function () {
        function DecorationAnalyzer(typeChecker, host, referencesRegistry, rootDirs, isCore) {
            this.typeChecker = typeChecker;
            this.host = host;
            this.referencesRegistry = referencesRegistry;
            this.rootDirs = rootDirs;
            this.isCore = isCore;
            this.resourceLoader = new FileResourceLoader();
            this.scopeRegistry = new annotations_1.SelectorScopeRegistry(this.typeChecker, this.host);
            this.handlers = [
                new annotations_1.BaseDefDecoratorHandler(this.typeChecker, this.host),
                new annotations_1.ComponentDecoratorHandler(this.typeChecker, this.host, this.scopeRegistry, this.isCore, this.resourceLoader, this.rootDirs, /* defaultPreserveWhitespaces */ false, /* i18nUseExternalIds */ true),
                new annotations_1.DirectiveDecoratorHandler(this.typeChecker, this.host, this.scopeRegistry, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.host, this.isCore),
                new annotations_1.NgModuleDecoratorHandler(this.typeChecker, this.host, this.scopeRegistry, this.referencesRegistry, this.isCore),
                new annotations_1.PipeDecoratorHandler(this.typeChecker, this.host, this.scopeRegistry, this.isCore),
            ];
        }
        /**
         * Analyze a program to find all the decorated files should be transformed.
         * @param program The program whose files should be analysed.
         * @returns a map of the source files to the analysis for those files.
         */
        DecorationAnalyzer.prototype.analyzeProgram = function (program) {
            var _this = this;
            var decorationAnalyses = new exports.DecorationAnalyses();
            var analysedFiles = program.getSourceFiles().map(function (sourceFile) { return _this.analyzeFile(sourceFile); }).filter(utils_1.isDefined);
            var compiledFiles = analysedFiles.map(function (analysedFile) { return _this.compileFile(analysedFile); });
            compiledFiles.forEach(function (compiledFile) { return decorationAnalyses.set(compiledFile.sourceFile, compiledFile); });
            return decorationAnalyses;
        };
        DecorationAnalyzer.prototype.analyzeFile = function (sourceFile) {
            var _this = this;
            var decoratedClasses = this.host.findDecoratedClasses(sourceFile);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvYW5hbHlzaXMvZGVjb3JhdGlvbl9hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBK0M7SUFDL0MsdUJBQXlCO0lBR3pCLDJFQUFnUTtJQUloUSxrRUFBbUM7SUFzQnRCLFFBQUEsa0JBQWtCLEdBQUcsR0FBRyxDQUFDO0lBT3RDOztPQUVHO0lBQ0g7UUFBQTtRQUVBLENBQUM7UUFEQyxpQ0FBSSxHQUFKLFVBQUssR0FBVyxJQUFZLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLHlCQUFDO0lBQUQsQ0FBQyxBQUZELElBRUM7SUFGWSxnREFBa0I7SUFJL0I7O09BRUc7SUFDSDtRQWVFLDRCQUNZLFdBQTJCLEVBQVUsSUFBd0IsRUFDN0Qsa0JBQXNDLEVBQVUsUUFBa0IsRUFDbEUsTUFBZTtZQUZmLGdCQUFXLEdBQVgsV0FBVyxDQUFnQjtZQUFVLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQzdELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFVO1lBQ2xFLFdBQU0sR0FBTixNQUFNLENBQVM7WUFqQjNCLG1CQUFjLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQzFDLGtCQUFhLEdBQUcsSUFBSSxtQ0FBcUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2RSxhQUFRLEdBQWlDO2dCQUN2QyxJQUFJLHFDQUF1QixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDeEQsSUFBSSx1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ckIsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQWhGRCxJQWdGQztJQWhGWSxnREFBa0I7SUFrRi9CLFNBQVMsaUJBQWlCLENBQU8sT0FBdUM7UUFFdEUsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztJQUN6QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtDb25zdGFudFBvb2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Jhc2VEZWZEZWNvcmF0b3JIYW5kbGVyLCBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5LCBSZXNvdXJjZUxvYWRlciwgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0NvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uLy4uL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge0RlY29yYXRlZENsYXNzfSBmcm9tICcuLi9ob3N0L2RlY29yYXRlZF9jbGFzcyc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBBbmFseXplZEZpbGUge1xuICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlO1xuICBhbmFseXplZENsYXNzZXM6IEFuYWx5emVkQ2xhc3NbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBbmFseXplZENsYXNzIGV4dGVuZHMgRGVjb3JhdGVkQ2xhc3Mge1xuICBkaWFnbm9zdGljcz86IHRzLkRpYWdub3N0aWNbXTtcbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT47XG4gIGFuYWx5c2lzOiBhbnk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRDbGFzcyBleHRlbmRzIEFuYWx5emVkQ2xhc3MgeyBjb21waWxhdGlvbjogQ29tcGlsZVJlc3VsdFtdOyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRGaWxlIHtcbiAgY29tcGlsZWRDbGFzc2VzOiBDb21waWxlZENsYXNzW107XG4gIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGU7XG4gIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sO1xufVxuXG5leHBvcnQgdHlwZSBEZWNvcmF0aW9uQW5hbHlzZXMgPSBNYXA8dHMuU291cmNlRmlsZSwgQ29tcGlsZWRGaWxlPjtcbmV4cG9ydCBjb25zdCBEZWNvcmF0aW9uQW5hbHlzZXMgPSBNYXA7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hpbmdIYW5kbGVyPEEsIE0+IHtcbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxBLCBNPjtcbiAgbWF0Y2g6IE07XG59XG5cbi8qKlxuICogYFJlc291cmNlTG9hZGVyYCB3aGljaCBkaXJlY3RseSB1c2VzIHRoZSBmaWxlc3lzdGVtIHRvIHJlc29sdmUgcmVzb3VyY2VzIHN5bmNocm9ub3VzbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWxlUmVzb3VyY2VMb2FkZXIgaW1wbGVtZW50cyBSZXNvdXJjZUxvYWRlciB7XG4gIGxvYWQodXJsOiBzdHJpbmcpOiBzdHJpbmcgeyByZXR1cm4gZnMucmVhZEZpbGVTeW5jKHVybCwgJ3V0ZjgnKTsgfVxufVxuXG4vKipcbiAqIFRoaXMgQW5hbHl6ZXIgd2lsbCBhbmFseXplIHRoZSBmaWxlcyB0aGF0IGhhdmUgZGVjb3JhdGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkLlxuICovXG5leHBvcnQgY2xhc3MgRGVjb3JhdGlvbkFuYWx5emVyIHtcbiAgcmVzb3VyY2VMb2FkZXIgPSBuZXcgRmlsZVJlc291cmNlTG9hZGVyKCk7XG4gIHNjb3BlUmVnaXN0cnkgPSBuZXcgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5KHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCk7XG4gIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55PltdID0gW1xuICAgIG5ldyBCYXNlRGVmRGVjb3JhdG9ySGFuZGxlcih0aGlzLnR5cGVDaGVja2VyLCB0aGlzLmhvc3QpLFxuICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnR5cGVDaGVja2VyLCB0aGlzLmhvc3QsIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUsIHRoaXMucmVzb3VyY2VMb2FkZXIsXG4gICAgICAgIHRoaXMucm9vdERpcnMsIC8qIGRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzICovIGZhbHNlLCAvKiBpMThuVXNlRXh0ZXJuYWxJZHMgKi8gdHJ1ZSksXG4gICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIodGhpcy50eXBlQ2hlY2tlciwgdGhpcy5ob3N0LCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlKSxcbiAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIodGhpcy5ob3N0LCB0aGlzLmlzQ29yZSksXG4gICAgbmV3IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tlciwgdGhpcy5ob3N0LCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LCB0aGlzLmlzQ29yZSksXG4gICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCwgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSksXG4gIF07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHR5cGVDaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5LCBwcml2YXRlIHJvb3REaXJzOiBzdHJpbmdbXSxcbiAgICAgIHByaXZhdGUgaXNDb3JlOiBib29sZWFuKSB7fVxuXG4gIC8qKlxuICAgKiBBbmFseXplIGEgcHJvZ3JhbSB0byBmaW5kIGFsbCB0aGUgZGVjb3JhdGVkIGZpbGVzIHNob3VsZCBiZSB0cmFuc2Zvcm1lZC5cbiAgICogQHBhcmFtIHByb2dyYW0gVGhlIHByb2dyYW0gd2hvc2UgZmlsZXMgc2hvdWxkIGJlIGFuYWx5c2VkLlxuICAgKiBAcmV0dXJucyBhIG1hcCBvZiB0aGUgc291cmNlIGZpbGVzIHRvIHRoZSBhbmFseXNpcyBmb3IgdGhvc2UgZmlsZXMuXG4gICAqL1xuICBhbmFseXplUHJvZ3JhbShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogRGVjb3JhdGlvbkFuYWx5c2VzIHtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHlzZXMgPSBuZXcgRGVjb3JhdGlvbkFuYWx5c2VzKCk7XG4gICAgY29uc3QgYW5hbHlzZWRGaWxlcyA9XG4gICAgICAgIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5tYXAoc291cmNlRmlsZSA9PiB0aGlzLmFuYWx5emVGaWxlKHNvdXJjZUZpbGUpKS5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgICBjb25zdCBjb21waWxlZEZpbGVzID0gYW5hbHlzZWRGaWxlcy5tYXAoYW5hbHlzZWRGaWxlID0+IHRoaXMuY29tcGlsZUZpbGUoYW5hbHlzZWRGaWxlKSk7XG4gICAgY29tcGlsZWRGaWxlcy5mb3JFYWNoKFxuICAgICAgICBjb21waWxlZEZpbGUgPT4gZGVjb3JhdGlvbkFuYWx5c2VzLnNldChjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlKSk7XG4gICAgcmV0dXJuIGRlY29yYXRpb25BbmFseXNlcztcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplRmlsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogQW5hbHl6ZWRGaWxlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZGVjb3JhdGVkQ2xhc3NlcyA9IHRoaXMuaG9zdC5maW5kRGVjb3JhdGVkQ2xhc3Nlcyhzb3VyY2VGaWxlKTtcbiAgICByZXR1cm4gZGVjb3JhdGVkQ2xhc3Nlcy5sZW5ndGggPyB7XG4gICAgICBzb3VyY2VGaWxlLFxuICAgICAgYW5hbHl6ZWRDbGFzc2VzOiBkZWNvcmF0ZWRDbGFzc2VzLm1hcChjbGF6eiA9PiB0aGlzLmFuYWx5emVDbGFzcyhjbGF6eikpLmZpbHRlcihpc0RlZmluZWQpXG4gICAgfSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVDbGFzcyhjbGF6ejogRGVjb3JhdGVkQ2xhc3MpOiBBbmFseXplZENsYXNzfG51bGwge1xuICAgIGNvbnN0IG1hdGNoaW5nSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGhhbmRsZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRjaCA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyLmRldGVjdChjbGF6ei5kZWNsYXJhdGlvbiwgY2xhenouZGVjb3JhdG9ycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7aGFuZGxlciwgbWF0Y2h9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaXNNYXRjaGluZ0hhbmRsZXIpO1xuXG4gICAgaWYgKG1hdGNoaW5nSGFuZGxlcnMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUT0RPLkRpYWdub3N0aWM6IENsYXNzIGhhcyBtdWx0aXBsZSBBbmd1bGFyIGRlY29yYXRvcnMuJyk7XG4gICAgfVxuICAgIGlmIChtYXRjaGluZ0hhbmRsZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHtoYW5kbGVyLCBtYXRjaH0gPSBtYXRjaGluZ0hhbmRsZXJzWzBdO1xuICAgIGNvbnN0IHthbmFseXNpcywgZGlhZ25vc3RpY3N9ID0gaGFuZGxlci5hbmFseXplKGNsYXp6LmRlY2xhcmF0aW9uLCBtYXRjaCk7XG4gICAgcmV0dXJuIHsuLi5jbGF6eiwgaGFuZGxlciwgYW5hbHlzaXMsIGRpYWdub3N0aWNzfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb21waWxlRmlsZShhbmFseXplZEZpbGU6IEFuYWx5emVkRmlsZSk6IENvbXBpbGVkRmlsZSB7XG4gICAgY29uc3QgY29uc3RhbnRQb29sID0gbmV3IENvbnN0YW50UG9vbCgpO1xuICAgIGNvbnN0IGNvbXBpbGVkQ2xhc3NlczogQ29tcGlsZWRDbGFzc1tdID0gYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5tYXAoYW5hbHl6ZWRDbGFzcyA9PiB7XG4gICAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuY29tcGlsZUNsYXNzKGFuYWx5emVkQ2xhc3MsIGNvbnN0YW50UG9vbCk7XG4gICAgICByZXR1cm4gey4uLmFuYWx5emVkQ2xhc3MsIGNvbXBpbGF0aW9ufTtcbiAgICB9KTtcbiAgICByZXR1cm4ge2NvbnN0YW50UG9vbCwgc291cmNlRmlsZTogYW5hbHl6ZWRGaWxlLnNvdXJjZUZpbGUsIGNvbXBpbGVkQ2xhc3Nlc307XG4gIH1cblxuICBwcm90ZWN0ZWQgY29tcGlsZUNsYXNzKGNsYXp6OiBBbmFseXplZENsYXNzLCBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCk6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgbGV0IGNvbXBpbGF0aW9uID0gY2xhenouaGFuZGxlci5jb21waWxlKGNsYXp6LmRlY2xhcmF0aW9uLCBjbGF6ei5hbmFseXNpcywgY29uc3RhbnRQb29sKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoY29tcGlsYXRpb24pKSB7XG4gICAgICBjb21waWxhdGlvbiA9IFtjb21waWxhdGlvbl07XG4gICAgfVxuICAgIHJldHVybiBjb21waWxhdGlvbjtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc01hdGNoaW5nSGFuZGxlcjxBLCBNPihoYW5kbGVyOiBQYXJ0aWFsPE1hdGNoaW5nSGFuZGxlcjxBLCBNPj4pOlxuICAgIGhhbmRsZXIgaXMgTWF0Y2hpbmdIYW5kbGVyPEEsIE0+IHtcbiAgcmV0dXJuICEhaGFuZGxlci5tYXRjaDtcbn1cbiJdfQ==