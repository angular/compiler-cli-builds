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
        function DecorationAnalyzer(typeChecker, host, rootDirs, isCore) {
            this.typeChecker = typeChecker;
            this.host = host;
            this.rootDirs = rootDirs;
            this.isCore = isCore;
            this.resourceLoader = new FileResourceLoader();
            this.scopeRegistry = new annotations_1.SelectorScopeRegistry(this.typeChecker, this.host);
            this.handlers = [
                new annotations_1.BaseDefDecoratorHandler(this.typeChecker, this.host),
                new annotations_1.ComponentDecoratorHandler(this.typeChecker, this.host, this.scopeRegistry, this.isCore, this.resourceLoader, this.rootDirs, /* defaultPreserveWhitespaces */ false, /* i18nUseExternalIds */ true),
                new annotations_1.DirectiveDecoratorHandler(this.typeChecker, this.host, this.scopeRegistry, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.host, this.isCore),
                new annotations_1.NgModuleDecoratorHandler(this.typeChecker, this.host, this.scopeRegistry, this.isCore),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvYW5hbHlzaXMvZGVjb3JhdGlvbl9hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBK0M7SUFDL0MsdUJBQXlCO0lBR3pCLDJFQUE0TztJQUs1TyxrRUFBbUM7SUFzQnRCLFFBQUEsa0JBQWtCLEdBQUcsR0FBRyxDQUFDO0lBT3RDOztPQUVHO0lBQ0g7UUFBQTtRQUVBLENBQUM7UUFEQyxpQ0FBSSxHQUFKLFVBQUssR0FBVyxJQUFZLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLHlCQUFDO0lBQUQsQ0FBQyxBQUZELElBRUM7SUFGWSxnREFBa0I7SUFJL0I7O09BRUc7SUFDSDtRQWNFLDRCQUNZLFdBQTJCLEVBQVUsSUFBd0IsRUFDN0QsUUFBa0IsRUFBVSxNQUFlO1lBRDNDLGdCQUFXLEdBQVgsV0FBVyxDQUFnQjtZQUFVLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQzdELGFBQVEsR0FBUixRQUFRLENBQVU7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBZnZELG1CQUFjLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQzFDLGtCQUFhLEdBQUcsSUFBSSxtQ0FBcUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2RSxhQUFRLEdBQWlDO2dCQUN2QyxJQUFJLHFDQUF1QixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDeEQsSUFBSSx1Q0FBeUIsQ0FDekIsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFB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QUFpQixDQUFPLE9BQXVDO1FBRXRFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFDekIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q29uc3RhbnRQb29sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtCYXNlRGVmRGVjb3JhdG9ySGFuZGxlciwgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlc291cmNlTG9hZGVyLCBTZWxlY3RvclNjb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uLy4uL25ndHNjL2Fubm90YXRpb25zJztcbmltcG9ydCB7Q29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvdHJhbnNmb3JtJztcblxuaW1wb3J0IHtEZWNvcmF0ZWRDbGFzc30gZnJvbSAnLi4vaG9zdC9kZWNvcmF0ZWRfY2xhc3MnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7aXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRGaWxlIHtcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZTtcbiAgYW5hbHl6ZWRDbGFzc2VzOiBBbmFseXplZENsYXNzW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRDbGFzcyBleHRlbmRzIERlY29yYXRlZENsYXNzIHtcbiAgZGlhZ25vc3RpY3M/OiB0cy5EaWFnbm9zdGljW107XG4gIGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+O1xuICBhbmFseXNpczogYW55O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkQ2xhc3MgZXh0ZW5kcyBBbmFseXplZENsYXNzIHsgY29tcGlsYXRpb246IENvbXBpbGVSZXN1bHRbXTsgfVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkRmlsZSB7XG4gIGNvbXBpbGVkQ2xhc3NlczogQ29tcGlsZWRDbGFzc1tdO1xuICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlO1xuICBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbDtcbn1cblxuZXhwb3J0IHR5cGUgRGVjb3JhdGlvbkFuYWx5c2VzID0gTWFwPHRzLlNvdXJjZUZpbGUsIENvbXBpbGVkRmlsZT47XG5leHBvcnQgY29uc3QgRGVjb3JhdGlvbkFuYWx5c2VzID0gTWFwO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1hdGNoaW5nSGFuZGxlcjxBLCBNPiB7XG4gIGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8QSwgTT47XG4gIG1hdGNoOiBNO1xufVxuXG4vKipcbiAqIGBSZXNvdXJjZUxvYWRlcmAgd2hpY2ggZGlyZWN0bHkgdXNlcyB0aGUgZmlsZXN5c3RlbSB0byByZXNvbHZlIHJlc291cmNlcyBzeW5jaHJvbm91c2x5LlxuICovXG5leHBvcnQgY2xhc3MgRmlsZVJlc291cmNlTG9hZGVyIGltcGxlbWVudHMgUmVzb3VyY2VMb2FkZXIge1xuICBsb2FkKHVybDogc3RyaW5nKTogc3RyaW5nIHsgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyh1cmwsICd1dGY4Jyk7IH1cbn1cblxuLyoqXG4gKiBUaGlzIEFuYWx5emVyIHdpbGwgYW5hbHl6ZSB0aGUgZmlsZXMgdGhhdCBoYXZlIGRlY29yYXRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZC5cbiAqL1xuZXhwb3J0IGNsYXNzIERlY29yYXRpb25BbmFseXplciB7XG4gIHJlc291cmNlTG9hZGVyID0gbmV3IEZpbGVSZXNvdXJjZUxvYWRlcigpO1xuICBzY29wZVJlZ2lzdHJ5ID0gbmV3IFNlbGVjdG9yU2NvcGVSZWdpc3RyeSh0aGlzLnR5cGVDaGVja2VyLCB0aGlzLmhvc3QpO1xuICBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT5bXSA9IFtcbiAgICBuZXcgQmFzZURlZkRlY29yYXRvckhhbmRsZXIodGhpcy50eXBlQ2hlY2tlciwgdGhpcy5ob3N0KSxcbiAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tlciwgdGhpcy5ob3N0LCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlLCB0aGlzLnJlc291cmNlTG9hZGVyLFxuICAgICAgICB0aGlzLnJvb3REaXJzLCAvKiBkZWZhdWx0UHJlc2VydmVXaGl0ZXNwYWNlcyAqLyBmYWxzZSwgLyogaTE4blVzZUV4dGVybmFsSWRzICovIHRydWUpLFxuICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCwgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSksXG4gICAgbmV3IEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyKHRoaXMuaG9zdCwgdGhpcy5pc0NvcmUpLFxuICAgIG5ldyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIodGhpcy50eXBlQ2hlY2tlciwgdGhpcy5ob3N0LCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlKSxcbiAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIodGhpcy50eXBlQ2hlY2tlciwgdGhpcy5ob3N0LCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlKSxcbiAgXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdHlwZUNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgcm9vdERpcnM6IHN0cmluZ1tdLCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbikge31cblxuICAvKipcbiAgICogQW5hbHl6ZSBhIHByb2dyYW0gdG8gZmluZCBhbGwgdGhlIGRlY29yYXRlZCBmaWxlcyBzaG91bGQgYmUgdHJhbnNmb3JtZWQuXG4gICAqIEBwYXJhbSBwcm9ncmFtIFRoZSBwcm9ncmFtIHdob3NlIGZpbGVzIHNob3VsZCBiZSBhbmFseXNlZC5cbiAgICogQHJldHVybnMgYSBtYXAgb2YgdGhlIHNvdXJjZSBmaWxlcyB0byB0aGUgYW5hbHlzaXMgZm9yIHRob3NlIGZpbGVzLlxuICAgKi9cbiAgYW5hbHl6ZVByb2dyYW0ocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IERlY29yYXRpb25BbmFseXNlcyB7XG4gICAgY29uc3QgZGVjb3JhdGlvbkFuYWx5c2VzID0gbmV3IERlY29yYXRpb25BbmFseXNlcygpO1xuICAgIGNvbnN0IGFuYWx5c2VkRmlsZXMgPVxuICAgICAgICBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkubWFwKHNvdXJjZUZpbGUgPT4gdGhpcy5hbmFseXplRmlsZShzb3VyY2VGaWxlKSkuZmlsdGVyKGlzRGVmaW5lZCk7XG4gICAgY29uc3QgY29tcGlsZWRGaWxlcyA9IGFuYWx5c2VkRmlsZXMubWFwKGFuYWx5c2VkRmlsZSA9PiB0aGlzLmNvbXBpbGVGaWxlKGFuYWx5c2VkRmlsZSkpO1xuICAgIGNvbXBpbGVkRmlsZXMuZm9yRWFjaChcbiAgICAgICAgY29tcGlsZWRGaWxlID0+IGRlY29yYXRpb25BbmFseXNlcy5zZXQoY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZSkpO1xuICAgIHJldHVybiBkZWNvcmF0aW9uQW5hbHlzZXM7XG4gIH1cblxuICBwcm90ZWN0ZWQgYW5hbHl6ZUZpbGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IEFuYWx5emVkRmlsZXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGRlY29yYXRlZENsYXNzZXMgPSB0aGlzLmhvc3QuZmluZERlY29yYXRlZENsYXNzZXMoc291cmNlRmlsZSk7XG4gICAgcmV0dXJuIGRlY29yYXRlZENsYXNzZXMubGVuZ3RoID8ge1xuICAgICAgc291cmNlRmlsZSxcbiAgICAgIGFuYWx5emVkQ2xhc3NlczogZGVjb3JhdGVkQ2xhc3Nlcy5tYXAoY2xhenogPT4gdGhpcy5hbmFseXplQ2xhc3MoY2xhenopKS5maWx0ZXIoaXNEZWZpbmVkKVxuICAgIH0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplQ2xhc3MoY2xheno6IERlY29yYXRlZENsYXNzKTogQW5hbHl6ZWRDbGFzc3xudWxsIHtcbiAgICBjb25zdCBtYXRjaGluZ0hhbmRsZXJzID0gdGhpcy5oYW5kbGVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChoYW5kbGVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0Y2ggPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5kZXRlY3QoY2xhenouZGVjbGFyYXRpb24sIGNsYXp6LmRlY29yYXRvcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge2hhbmRsZXIsIG1hdGNofTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGlzTWF0Y2hpbmdIYW5kbGVyKTtcblxuICAgIGlmIChtYXRjaGluZ0hhbmRsZXJzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVE9ETy5EaWFnbm9zdGljOiBDbGFzcyBoYXMgbXVsdGlwbGUgQW5ndWxhciBkZWNvcmF0b3JzLicpO1xuICAgIH1cbiAgICBpZiAobWF0Y2hpbmdIYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB7aGFuZGxlciwgbWF0Y2h9ID0gbWF0Y2hpbmdIYW5kbGVyc1swXTtcbiAgICBjb25zdCB7YW5hbHlzaXMsIGRpYWdub3N0aWNzfSA9IGhhbmRsZXIuYW5hbHl6ZShjbGF6ei5kZWNsYXJhdGlvbiwgbWF0Y2gpO1xuICAgIHJldHVybiB7Li4uY2xhenosIGhhbmRsZXIsIGFuYWx5c2lzLCBkaWFnbm9zdGljc307XG4gIH1cblxuICBwcm90ZWN0ZWQgY29tcGlsZUZpbGUoYW5hbHl6ZWRGaWxlOiBBbmFseXplZEZpbGUpOiBDb21waWxlZEZpbGUge1xuICAgIGNvbnN0IGNvbnN0YW50UG9vbCA9IG5ldyBDb25zdGFudFBvb2woKTtcbiAgICBjb25zdCBjb21waWxlZENsYXNzZXM6IENvbXBpbGVkQ2xhc3NbXSA9IGFuYWx5emVkRmlsZS5hbmFseXplZENsYXNzZXMubWFwKGFuYWx5emVkQ2xhc3MgPT4ge1xuICAgICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmNvbXBpbGVDbGFzcyhhbmFseXplZENsYXNzLCBjb25zdGFudFBvb2wpO1xuICAgICAgcmV0dXJuIHsuLi5hbmFseXplZENsYXNzLCBjb21waWxhdGlvbn07XG4gICAgfSk7XG4gICAgcmV0dXJuIHtjb25zdGFudFBvb2wsIHNvdXJjZUZpbGU6IGFuYWx5emVkRmlsZS5zb3VyY2VGaWxlLCBjb21waWxlZENsYXNzZXN9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbXBpbGVDbGFzcyhjbGF6ejogQW5hbHl6ZWRDbGFzcywgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGxldCBjb21waWxhdGlvbiA9IGNsYXp6LmhhbmRsZXIuY29tcGlsZShjbGF6ei5kZWNsYXJhdGlvbiwgY2xhenouYW5hbHlzaXMsIGNvbnN0YW50UG9vbCk7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGNvbXBpbGF0aW9uKSkge1xuICAgICAgY29tcGlsYXRpb24gPSBbY29tcGlsYXRpb25dO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGlsYXRpb247XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNNYXRjaGluZ0hhbmRsZXI8QSwgTT4oaGFuZGxlcjogUGFydGlhbDxNYXRjaGluZ0hhbmRsZXI8QSwgTT4+KTpcbiAgICBoYW5kbGVyIGlzIE1hdGNoaW5nSGFuZGxlcjxBLCBNPiB7XG4gIHJldHVybiAhIWhhbmRsZXIubWF0Y2g7XG59XG4iXX0=