(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/analyzer", ["require", "exports", "tslib", "fs", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
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
    var fs = require("fs");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
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
    var Analyzer = /** @class */ (function () {
        function Analyzer(typeChecker, host) {
            this.typeChecker = typeChecker;
            this.host = host;
            this.resourceLoader = new FileResourceLoader();
            this.scopeRegistry = new annotations_1.SelectorScopeRegistry(this.typeChecker, this.host);
            this.handlers = [
                new annotations_1.ComponentDecoratorHandler(this.typeChecker, this.host, this.scopeRegistry, false, this.resourceLoader),
                new annotations_1.DirectiveDecoratorHandler(this.typeChecker, this.host, this.scopeRegistry, false),
                new annotations_1.InjectableDecoratorHandler(this.host, false),
                new annotations_1.NgModuleDecoratorHandler(this.typeChecker, this.host, this.scopeRegistry, false),
                new annotations_1.PipeDecoratorHandler(this.typeChecker, this.host, this.scopeRegistry, false),
            ];
        }
        /**
         * Analyize a parsed file to generate the information about decorated classes that
         * should be converted to use ivy definitions.
         * @param file The file to be analysed for decorated classes.
         */
        Analyzer.prototype.analyzeFile = function (file) {
            var _this = this;
            var analyzedClasses = file.decoratedClasses.map(function (clazz) { return _this.analyzeClass(clazz); }).filter(utils_1.isDefined);
            return {
                analyzedClasses: analyzedClasses,
                sourceFile: file.sourceFile,
            };
        };
        Analyzer.prototype.analyzeClass = function (clazz) {
            var matchingHandlers = this.handlers.map(function (handler) { return ({ handler: handler, decorator: handler.detect(clazz.decorators) }); })
                .filter(isMatchingHandler);
            if (matchingHandlers.length > 1) {
                throw new Error('TODO.Diagnostic: Class has multiple Angular decorators.');
            }
            if (matchingHandlers.length === 0) {
                return undefined;
            }
            var _a = matchingHandlers[0], handler = _a.handler, decorator = _a.decorator;
            var _b = handler.analyze(clazz.declaration, decorator), analysis = _b.analysis, diagnostics = _b.diagnostics;
            var compilation = handler.compile(clazz.declaration, analysis);
            if (!Array.isArray(compilation)) {
                compilation = [compilation];
            }
            return tslib_1.__assign({}, clazz, { handler: handler, analysis: analysis, diagnostics: diagnostics, compilation: compilation });
        };
        return Analyzer;
    }());
    exports.Analyzer = Analyzer;
    function isMatchingHandler(handler) {
        return !!handler.decorator;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILHVCQUF5QjtJQUV6QiwyRUFBZ047SUFNaE4sa0VBQWtDO0lBbUJsQzs7T0FFRztJQUNIO1FBQUE7UUFFQSxDQUFDO1FBREMsaUNBQUksR0FBSixVQUFLLEdBQVcsSUFBWSxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRSx5QkFBQztJQUFELENBQUMsQUFGRCxJQUVDO0lBRlksZ0RBQWtCO0lBSS9CO1FBWUUsa0JBQW9CLFdBQTJCLEVBQVUsSUFBd0I7WUFBN0QsZ0JBQVcsR0FBWCxXQUFXLENBQWdCO1lBQVUsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFYakYsbUJBQWMsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDMUMsa0JBQWEsR0FBRyxJQUFJLG1DQUFxQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZFLGFBQVEsR0FBNEI7Z0JBQ2xDLElBQUksdUNBQXlCLENBQ3pCLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDO2dCQUNoRixJQUFJLHVDQUF5QixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQztnQkFDckYsSUFBSSx3Q0FBMEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztnQkFDaEQsSUFBSSxzQ0FBd0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUM7Z0JBQ3BGLElBQUksa0NBQW9CLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDO2FBQ2pGLENBQUM7UUFFa0YsQ0FBQztRQUVyRjs7OztXQUlHO1FBQ0gsOEJBQVcsR0FBWCxVQUFZLElBQWdCO1lBQTVCLGlCQVFDO1lBUEMsSUFBTSxlQUFlLEdBQ2pCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUF4QixDQUF3QixDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFTLENBQUMsQ0FBQztZQUVuRixPQUFPO2dCQUNMLGVBQWUsaUJBQUE7Z0JBQ2YsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO2FBQzVCLENBQUM7UUFDSixDQUFDO1FBRVMsK0JBQVksR0FBdEIsVUFBdUIsS0FBa0I7WUFDdkMsSUFBTSxnQkFBZ0IsR0FDbEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBQSxPQUFPLElBQUksT0FBQSxDQUFDLEVBQUMsT0FBTyxTQUFBLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFDLENBQUMsRUFBeEQsQ0FBd0QsQ0FBQztpQkFDakYsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFFbkMsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLHlEQUF5RCxDQUFDLENBQUM7YUFDNUU7WUFFRCxJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ2pDLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUssSUFBQSx3QkFBMEMsRUFBekMsb0JBQU8sRUFBRSx3QkFBUyxDQUF3QjtZQUMzQyxJQUFBLGtEQUF1RSxFQUF0RSxzQkFBUSxFQUFFLDRCQUFXLENBQWtEO1lBQzlFLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMvRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDL0IsV0FBVyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDN0I7WUFDRCw0QkFBVyxLQUFLLElBQUUsT0FBTyxTQUFBLEVBQUUsUUFBUSxVQUFBLEVBQUUsV0FBVyxhQUFBLEVBQUUsV0FBVyxhQUFBLElBQUU7UUFDakUsQ0FBQztRQUNILGVBQUM7SUFBRCxDQUFDLEFBbERELElBa0RDO0lBbERZLDRCQUFRO0lBb0RyQiwyQkFBOEIsT0FBb0M7UUFDaEUsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztJQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0NvbXBvbmVudERlY29yYXRvckhhbmRsZXIsIERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIsIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyLCBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIsIFBpcGVEZWNvcmF0b3JIYW5kbGVyLCBSZXNvdXJjZUxvYWRlciwgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0RlY29yYXRvcn0gZnJvbSAnLi4vLi4vbmd0c2MvaG9zdCc7XG5pbXBvcnQge0NvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge1BhcnNlZENsYXNzfSBmcm9tICcuL3BhcnNpbmcvcGFyc2VkX2NsYXNzJztcbmltcG9ydCB7UGFyc2VkRmlsZX0gZnJvbSAnLi9wYXJzaW5nL3BhcnNlZF9maWxlJztcbmltcG9ydCB7aXNEZWZpbmVkfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBBbmFseXplZENsYXNzPFQgPSBhbnk+IGV4dGVuZHMgUGFyc2VkQ2xhc3Mge1xuICBoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPFQ+O1xuICBhbmFseXNpczogYW55O1xuICBkaWFnbm9zdGljcz86IHRzLkRpYWdub3N0aWNbXTtcbiAgY29tcGlsYXRpb246IENvbXBpbGVSZXN1bHRbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBbmFseXplZEZpbGUge1xuICBhbmFseXplZENsYXNzZXM6IEFuYWx5emVkQ2xhc3NbXTtcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYXRjaGluZ0hhbmRsZXI8VD4ge1xuICBoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPFQ+O1xuICBkZWNvcmF0b3I6IERlY29yYXRvcjtcbn1cblxuLyoqXG4gKiBgUmVzb3VyY2VMb2FkZXJgIHdoaWNoIGRpcmVjdGx5IHVzZXMgdGhlIGZpbGVzeXN0ZW0gdG8gcmVzb2x2ZSByZXNvdXJjZXMgc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIEZpbGVSZXNvdXJjZUxvYWRlciBpbXBsZW1lbnRzIFJlc291cmNlTG9hZGVyIHtcbiAgbG9hZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiBmcy5yZWFkRmlsZVN5bmModXJsLCAndXRmOCcpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBBbmFseXplciB7XG4gIHJlc291cmNlTG9hZGVyID0gbmV3IEZpbGVSZXNvdXJjZUxvYWRlcigpO1xuICBzY29wZVJlZ2lzdHJ5ID0gbmV3IFNlbGVjdG9yU2NvcGVSZWdpc3RyeSh0aGlzLnR5cGVDaGVja2VyLCB0aGlzLmhvc3QpO1xuICBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjxhbnk+W10gPSBbXG4gICAgbmV3IENvbXBvbmVudERlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCwgdGhpcy5zY29wZVJlZ2lzdHJ5LCBmYWxzZSwgdGhpcy5yZXNvdXJjZUxvYWRlciksXG4gICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIodGhpcy50eXBlQ2hlY2tlciwgdGhpcy5ob3N0LCB0aGlzLnNjb3BlUmVnaXN0cnksIGZhbHNlKSxcbiAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIodGhpcy5ob3N0LCBmYWxzZSksXG4gICAgbmV3IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnR5cGVDaGVja2VyLCB0aGlzLmhvc3QsIHRoaXMuc2NvcGVSZWdpc3RyeSwgZmFsc2UpLFxuICAgIG5ldyBQaXBlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnR5cGVDaGVja2VyLCB0aGlzLmhvc3QsIHRoaXMuc2NvcGVSZWdpc3RyeSwgZmFsc2UpLFxuICBdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdHlwZUNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCkge31cblxuICAvKipcbiAgICogQW5hbHlpemUgYSBwYXJzZWQgZmlsZSB0byBnZW5lcmF0ZSB0aGUgaW5mb3JtYXRpb24gYWJvdXQgZGVjb3JhdGVkIGNsYXNzZXMgdGhhdFxuICAgKiBzaG91bGQgYmUgY29udmVydGVkIHRvIHVzZSBpdnkgZGVmaW5pdGlvbnMuXG4gICAqIEBwYXJhbSBmaWxlIFRoZSBmaWxlIHRvIGJlIGFuYWx5c2VkIGZvciBkZWNvcmF0ZWQgY2xhc3Nlcy5cbiAgICovXG4gIGFuYWx5emVGaWxlKGZpbGU6IFBhcnNlZEZpbGUpOiBBbmFseXplZEZpbGUge1xuICAgIGNvbnN0IGFuYWx5emVkQ2xhc3NlcyA9XG4gICAgICAgIGZpbGUuZGVjb3JhdGVkQ2xhc3Nlcy5tYXAoY2xhenogPT4gdGhpcy5hbmFseXplQ2xhc3MoY2xhenopKS5maWx0ZXIoaXNEZWZpbmVkKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXplZENsYXNzZXMsXG4gICAgICBzb3VyY2VGaWxlOiBmaWxlLnNvdXJjZUZpbGUsXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplQ2xhc3MoY2xheno6IFBhcnNlZENsYXNzKTogQW5hbHl6ZWRDbGFzc3x1bmRlZmluZWQge1xuICAgIGNvbnN0IG1hdGNoaW5nSGFuZGxlcnMgPVxuICAgICAgICB0aGlzLmhhbmRsZXJzLm1hcChoYW5kbGVyID0+ICh7aGFuZGxlciwgZGVjb3JhdG9yOiBoYW5kbGVyLmRldGVjdChjbGF6ei5kZWNvcmF0b3JzKX0pKVxuICAgICAgICAgICAgLmZpbHRlcihpc01hdGNoaW5nSGFuZGxlcik7XG5cbiAgICBpZiAobWF0Y2hpbmdIYW5kbGVycy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RPRE8uRGlhZ25vc3RpYzogQ2xhc3MgaGFzIG11bHRpcGxlIEFuZ3VsYXIgZGVjb3JhdG9ycy4nKTtcbiAgICB9XG5cbiAgICBpZiAobWF0Y2hpbmdIYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qge2hhbmRsZXIsIGRlY29yYXRvcn0gPSBtYXRjaGluZ0hhbmRsZXJzWzBdO1xuICAgIGNvbnN0IHthbmFseXNpcywgZGlhZ25vc3RpY3N9ID0gaGFuZGxlci5hbmFseXplKGNsYXp6LmRlY2xhcmF0aW9uLCBkZWNvcmF0b3IpO1xuICAgIGxldCBjb21waWxhdGlvbiA9IGhhbmRsZXIuY29tcGlsZShjbGF6ei5kZWNsYXJhdGlvbiwgYW5hbHlzaXMpO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShjb21waWxhdGlvbikpIHtcbiAgICAgIGNvbXBpbGF0aW9uID0gW2NvbXBpbGF0aW9uXTtcbiAgICB9XG4gICAgcmV0dXJuIHsuLi5jbGF6eiwgaGFuZGxlciwgYW5hbHlzaXMsIGRpYWdub3N0aWNzLCBjb21waWxhdGlvbn07XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNNYXRjaGluZ0hhbmRsZXI8VD4oaGFuZGxlcjogUGFydGlhbDxNYXRjaGluZ0hhbmRsZXI8VD4+KTogaGFuZGxlciBpcyBNYXRjaGluZ0hhbmRsZXI8VD4ge1xuICByZXR1cm4gISFoYW5kbGVyLmRlY29yYXRvcjtcbn1cbiJdfQ==