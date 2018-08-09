(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/analyzer", ["require", "exports", "tslib", "@angular/compiler", "fs", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
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
            var constantPool = new compiler_1.ConstantPool();
            var analyzedClasses = file.decoratedClasses.map(function (clazz) { return _this.analyzeClass(file.sourceFile, constantPool, clazz); })
                .filter(utils_1.isDefined);
            return {
                analyzedClasses: analyzedClasses,
                sourceFile: file.sourceFile, constantPool: constantPool,
            };
        };
        Analyzer.prototype.analyzeClass = function (file, pool, clazz) {
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
            var compilation = handler.compile(clazz.declaration, analysis, pool);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErQztJQUMvQyx1QkFBeUI7SUFHekIsMkVBQWdOO0lBT2hOLGtFQUFrQztJQW9CbEM7O09BRUc7SUFDSDtRQUFBO1FBRUEsQ0FBQztRQURDLGlDQUFJLEdBQUosVUFBSyxHQUFXLElBQVksT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUseUJBQUM7SUFBRCxDQUFDLEFBRkQsSUFFQztJQUZZLGdEQUFrQjtJQUkvQjtRQVlFLGtCQUFvQixXQUEyQixFQUFVLElBQXdCO1lBQTdELGdCQUFXLEdBQVgsV0FBVyxDQUFnQjtZQUFVLFNBQUksR0FBSixJQUFJLENBQW9CO1lBWGpGLG1CQUFjLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQzFDLGtCQUFhLEdBQUcsSUFBSSxtQ0FBcUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2RSxhQUFRLEdBQTRCO2dCQUNsQyxJQUFJLHVDQUF5QixDQUN6QixJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQztnQkFDaEYsSUFBSSx1Q0FBeUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUM7Z0JBQ3JGLElBQUksd0NBQTBCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7Z0JBQ2hELElBQUksc0NBQXdCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDO2dCQUNwRixJQUFJLGtDQUFvQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQzthQUNqRixDQUFDO1FBRWtGLENBQUM7UUFFckY7Ozs7V0FJRztRQUNILDhCQUFXLEdBQVgsVUFBWSxJQUFnQjtZQUE1QixpQkFVQztZQVRDLElBQU0sWUFBWSxHQUFHLElBQUksdUJBQVksRUFBRSxDQUFDO1lBQ3hDLElBQU0sZUFBZSxHQUNqQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUMsRUFBdkQsQ0FBdUQsQ0FBQztpQkFDdEYsTUFBTSxDQUFDLGlCQUFTLENBQUMsQ0FBQztZQUUzQixPQUFPO2dCQUNMLGVBQWUsaUJBQUE7Z0JBQ2YsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsWUFBWSxjQUFBO2FBQzFDLENBQUM7UUFDSixDQUFDO1FBRVMsK0JBQVksR0FBdEIsVUFBdUIsSUFBbUIsRUFBRSxJQUFrQixFQUFFLEtBQWtCO1lBRWhGLElBQU0sZ0JBQWdCLEdBQ2xCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQUEsT0FBTyxJQUFJLE9BQUEsQ0FBQyxFQUFDLE9BQU8sU0FBQSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBQyxDQUFDLEVBQXhELENBQXdELENBQUM7aUJBQ2pGLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBRW5DLElBQUksZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO2FBQzVFO1lBRUQsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUNqQyxPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUVLLElBQUEsd0JBQTBDLEVBQXpDLG9CQUFPLEVBQUUsd0JBQVMsQ0FBd0I7WUFDM0MsSUFBQSxrREFBdUUsRUFBdEUsc0JBQVEsRUFBRSw0QkFBVyxDQUFrRDtZQUM5RSxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3JFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUMvQixXQUFXLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQzthQUM3QjtZQUNELDRCQUFXLEtBQUssSUFBRSxPQUFPLFNBQUEsRUFBRSxRQUFRLFVBQUEsRUFBRSxXQUFXLGFBQUEsRUFBRSxXQUFXLGFBQUEsSUFBRTtRQUNqRSxDQUFDO1FBQ0gsZUFBQztJQUFELENBQUMsQUFyREQsSUFxREM7SUFyRFksNEJBQVE7SUF1RHJCLDJCQUE4QixPQUFvQztRQUNoRSxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO0lBQzdCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0NvbnN0YW50UG9vbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlc291cmNlTG9hZGVyLCBTZWxlY3RvclNjb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uL25ndHNjL2Fubm90YXRpb25zJztcbmltcG9ydCB7RGVjb3JhdG9yfSBmcm9tICcuLi8uLi9uZ3RzYy9ob3N0JztcbmltcG9ydCB7Q29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vbmd0c2MvdHJhbnNmb3JtJztcblxuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtQYXJzZWRDbGFzc30gZnJvbSAnLi9wYXJzaW5nL3BhcnNlZF9jbGFzcyc7XG5pbXBvcnQge1BhcnNlZEZpbGV9IGZyb20gJy4vcGFyc2luZy9wYXJzZWRfZmlsZSc7XG5pbXBvcnQge2lzRGVmaW5lZH0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRDbGFzczxUID0gYW55PiBleHRlbmRzIFBhcnNlZENsYXNzIHtcbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxUPjtcbiAgYW5hbHlzaXM6IGFueTtcbiAgZGlhZ25vc3RpY3M/OiB0cy5EaWFnbm9zdGljW107XG4gIGNvbXBpbGF0aW9uOiBDb21waWxlUmVzdWx0W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRGaWxlIHtcbiAgYW5hbHl6ZWRDbGFzc2VzOiBBbmFseXplZENsYXNzW107XG4gIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGU7XG4gIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1hdGNoaW5nSGFuZGxlcjxUPiB7XG4gIGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8VD47XG4gIGRlY29yYXRvcjogRGVjb3JhdG9yO1xufVxuXG4vKipcbiAqIGBSZXNvdXJjZUxvYWRlcmAgd2hpY2ggZGlyZWN0bHkgdXNlcyB0aGUgZmlsZXN5c3RlbSB0byByZXNvbHZlIHJlc291cmNlcyBzeW5jaHJvbm91c2x5LlxuICovXG5leHBvcnQgY2xhc3MgRmlsZVJlc291cmNlTG9hZGVyIGltcGxlbWVudHMgUmVzb3VyY2VMb2FkZXIge1xuICBsb2FkKHVybDogc3RyaW5nKTogc3RyaW5nIHsgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyh1cmwsICd1dGY4Jyk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIEFuYWx5emVyIHtcbiAgcmVzb3VyY2VMb2FkZXIgPSBuZXcgRmlsZVJlc291cmNlTG9hZGVyKCk7XG4gIHNjb3BlUmVnaXN0cnkgPSBuZXcgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5KHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCk7XG4gIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPGFueT5bXSA9IFtcbiAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tlciwgdGhpcy5ob3N0LCB0aGlzLnNjb3BlUmVnaXN0cnksIGZhbHNlLCB0aGlzLnJlc291cmNlTG9hZGVyKSxcbiAgICBuZXcgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnR5cGVDaGVja2VyLCB0aGlzLmhvc3QsIHRoaXMuc2NvcGVSZWdpc3RyeSwgZmFsc2UpLFxuICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcih0aGlzLmhvc3QsIGZhbHNlKSxcbiAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCwgdGhpcy5zY29wZVJlZ2lzdHJ5LCBmYWxzZSksXG4gICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCwgdGhpcy5zY29wZVJlZ2lzdHJ5LCBmYWxzZSksXG4gIF07XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIC8qKlxuICAgKiBBbmFseWl6ZSBhIHBhcnNlZCBmaWxlIHRvIGdlbmVyYXRlIHRoZSBpbmZvcm1hdGlvbiBhYm91dCBkZWNvcmF0ZWQgY2xhc3NlcyB0aGF0XG4gICAqIHNob3VsZCBiZSBjb252ZXJ0ZWQgdG8gdXNlIGl2eSBkZWZpbml0aW9ucy5cbiAgICogQHBhcmFtIGZpbGUgVGhlIGZpbGUgdG8gYmUgYW5hbHlzZWQgZm9yIGRlY29yYXRlZCBjbGFzc2VzLlxuICAgKi9cbiAgYW5hbHl6ZUZpbGUoZmlsZTogUGFyc2VkRmlsZSk6IEFuYWx5emVkRmlsZSB7XG4gICAgY29uc3QgY29uc3RhbnRQb29sID0gbmV3IENvbnN0YW50UG9vbCgpO1xuICAgIGNvbnN0IGFuYWx5emVkQ2xhc3NlcyA9XG4gICAgICAgIGZpbGUuZGVjb3JhdGVkQ2xhc3Nlcy5tYXAoY2xhenogPT4gdGhpcy5hbmFseXplQ2xhc3MoZmlsZS5zb3VyY2VGaWxlLCBjb25zdGFudFBvb2wsIGNsYXp6KSlcbiAgICAgICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXplZENsYXNzZXMsXG4gICAgICBzb3VyY2VGaWxlOiBmaWxlLnNvdXJjZUZpbGUsIGNvbnN0YW50UG9vbCxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVDbGFzcyhmaWxlOiB0cy5Tb3VyY2VGaWxlLCBwb29sOiBDb25zdGFudFBvb2wsIGNsYXp6OiBQYXJzZWRDbGFzcyk6IEFuYWx5emVkQ2xhc3NcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGNvbnN0IG1hdGNoaW5nSGFuZGxlcnMgPVxuICAgICAgICB0aGlzLmhhbmRsZXJzLm1hcChoYW5kbGVyID0+ICh7aGFuZGxlciwgZGVjb3JhdG9yOiBoYW5kbGVyLmRldGVjdChjbGF6ei5kZWNvcmF0b3JzKX0pKVxuICAgICAgICAgICAgLmZpbHRlcihpc01hdGNoaW5nSGFuZGxlcik7XG5cbiAgICBpZiAobWF0Y2hpbmdIYW5kbGVycy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RPRE8uRGlhZ25vc3RpYzogQ2xhc3MgaGFzIG11bHRpcGxlIEFuZ3VsYXIgZGVjb3JhdG9ycy4nKTtcbiAgICB9XG5cbiAgICBpZiAobWF0Y2hpbmdIYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qge2hhbmRsZXIsIGRlY29yYXRvcn0gPSBtYXRjaGluZ0hhbmRsZXJzWzBdO1xuICAgIGNvbnN0IHthbmFseXNpcywgZGlhZ25vc3RpY3N9ID0gaGFuZGxlci5hbmFseXplKGNsYXp6LmRlY2xhcmF0aW9uLCBkZWNvcmF0b3IpO1xuICAgIGxldCBjb21waWxhdGlvbiA9IGhhbmRsZXIuY29tcGlsZShjbGF6ei5kZWNsYXJhdGlvbiwgYW5hbHlzaXMsIHBvb2wpO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShjb21waWxhdGlvbikpIHtcbiAgICAgIGNvbXBpbGF0aW9uID0gW2NvbXBpbGF0aW9uXTtcbiAgICB9XG4gICAgcmV0dXJuIHsuLi5jbGF6eiwgaGFuZGxlciwgYW5hbHlzaXMsIGRpYWdub3N0aWNzLCBjb21waWxhdGlvbn07XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNNYXRjaGluZ0hhbmRsZXI8VD4oaGFuZGxlcjogUGFydGlhbDxNYXRjaGluZ0hhbmRsZXI8VD4+KTogaGFuZGxlciBpcyBNYXRjaGluZ0hhbmRsZXI8VD4ge1xuICByZXR1cm4gISFoYW5kbGVyLmRlY29yYXRvcjtcbn1cbiJdfQ==