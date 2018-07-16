(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/analyzer", ["require", "exports", "tslib", "fs", "@angular/compiler-cli/src/ngtsc/annotations"], factory);
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
            var analyzedClasses = file.decoratedClasses.map(function (clazz) { return _this.analyzeClass(file.sourceFile, clazz); })
                .filter(function (analysis) { return !!analysis; });
            return {
                analyzedClasses: analyzedClasses,
                sourceFile: file.sourceFile,
            };
        };
        Analyzer.prototype.analyzeClass = function (file, clazz) {
            var matchingHandlers = this.handlers.map(function (handler) { return ({ handler: handler, decorator: handler.detect(clazz.decorators) }); })
                .filter(function (matchingHandler) {
                return !!matchingHandler.decorator;
            });
            if (matchingHandlers.length > 0) {
                if (matchingHandlers.length > 1) {
                    throw new Error('TODO.Diagnostic: Class has multiple Angular decorators.');
                }
                var handler = matchingHandlers[0].handler;
                var decorator = matchingHandlers[0].decorator;
                var _a = handler.analyze(clazz.declaration, decorator), analysis = _a.analysis, diagnostics = _a.diagnostics;
                var compilation = handler.compile(clazz.declaration, analysis);
                if (!Array.isArray(compilation)) {
                    compilation = [compilation];
                }
                return tslib_1.__assign({}, clazz, { handler: handler, analysis: analysis, diagnostics: diagnostics, compilation: compilation });
            }
        };
        return Analyzer;
    }());
    exports.Analyzer = Analyzer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILHVCQUF5QjtJQUV6QiwyRUFBZ047SUF3QmhOOztPQUVHO0lBQ0g7UUFBQTtRQUVBLENBQUM7UUFEQyxpQ0FBSSxHQUFKLFVBQUssR0FBVyxJQUFZLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLHlCQUFDO0lBQUQsQ0FBQyxBQUZELElBRUM7SUFGWSxnREFBa0I7SUFJL0I7UUFZRSxrQkFBb0IsV0FBMkIsRUFBVSxJQUF3QjtZQUE3RCxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFBVSxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQVhqRixtQkFBYyxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUMxQyxrQkFBYSxHQUFHLElBQUksbUNBQXFCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkUsYUFBUSxHQUE0QjtnQkFDbEMsSUFBSSx1Q0FBeUIsQ0FDekIsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUM7Z0JBQ2hGLElBQUksdUNBQXlCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDO2dCQUNyRixJQUFJLHdDQUEwQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO2dCQUNoRCxJQUFJLHNDQUF3QixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQztnQkFDcEYsSUFBSSxrQ0FBb0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUM7YUFDakYsQ0FBQztRQUVrRixDQUFDO1FBRXJGOzs7O1dBSUc7UUFDSCw4QkFBVyxHQUFYLFVBQVksSUFBZ0I7WUFBNUIsaUJBU0M7WUFSQyxJQUFNLGVBQWUsR0FDakIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxVQUFBLEtBQUssSUFBSSxPQUFBLEtBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsRUFBekMsQ0FBeUMsQ0FBQztpQkFDeEUsTUFBTSxDQUFDLFVBQUEsUUFBUSxJQUFJLE9BQUEsQ0FBQyxDQUFDLFFBQVEsRUFBVixDQUFVLENBQW9CLENBQUM7WUFFM0QsT0FBTztnQkFDTCxlQUFlLGlCQUFBO2dCQUNmLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTthQUM1QixDQUFDO1FBQ0osQ0FBQztRQUVTLCtCQUFZLEdBQXRCLFVBQXVCLElBQW1CLEVBQUUsS0FBa0I7WUFDNUQsSUFBTSxnQkFBZ0IsR0FDbEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBQSxPQUFPLElBQUksT0FBQSxDQUFDLEVBQUMsT0FBTyxTQUFBLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFDLENBQUMsRUFBeEQsQ0FBd0QsQ0FBQztpQkFDakYsTUFBTSxDQUNILFVBQUMsZUFBZTtnQkFDWixPQUFBLENBQUMsQ0FBQyxlQUFlLENBQUMsU0FBUztZQUEzQixDQUEyQixDQUFDLENBQUM7WUFFN0MsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUMvQixJQUFJLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7b0JBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMseURBQXlELENBQUMsQ0FBQztpQkFDNUU7Z0JBRUQsSUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUM1QyxJQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7Z0JBRTFDLElBQUEsa0RBQXVFLEVBQXRFLHNCQUFRLEVBQUUsNEJBQVcsQ0FBa0Q7Z0JBQzlFLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDL0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUU7b0JBQy9CLFdBQVcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2lCQUM3QjtnQkFDRCw0QkFBVyxLQUFLLElBQUUsT0FBTyxTQUFBLEVBQUUsUUFBUSxVQUFBLEVBQUUsV0FBVyxhQUFBLEVBQUUsV0FBVyxhQUFBLElBQUU7YUFDaEU7UUFDSCxDQUFDO1FBQ0gsZUFBQztJQUFELENBQUMsQUFyREQsSUFxREM7SUFyRFksNEJBQVEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Q29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlc291cmNlTG9hZGVyLCBTZWxlY3RvclNjb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uL25ndHNjL2Fubm90YXRpb25zJztcbmltcG9ydCB7RGVjb3JhdG9yfSBmcm9tICcuLi8uLi9uZ3RzYy9ob3N0JztcbmltcG9ydCB7Q29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vbmd0c2MvdHJhbnNmb3JtJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7UGFyc2VkQ2xhc3N9IGZyb20gJy4vcGFyc2luZy9wYXJzZWRfY2xhc3MnO1xuaW1wb3J0IHtQYXJzZWRGaWxlfSBmcm9tICcuL3BhcnNpbmcvcGFyc2VkX2ZpbGUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFuYWx5emVkQ2xhc3M8VCA9IGFueT4gZXh0ZW5kcyBQYXJzZWRDbGFzcyB7XG4gIGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8VD47XG4gIGFuYWx5c2lzOiBhbnk7XG4gIGRpYWdub3N0aWNzPzogdHMuRGlhZ25vc3RpY1tdO1xuICBjb21waWxhdGlvbjogQ29tcGlsZVJlc3VsdFtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFuYWx5emVkRmlsZSB7XG4gIGFuYWx5emVkQ2xhc3NlczogQW5hbHl6ZWRDbGFzc1tdO1xuICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1hdGNoaW5nSGFuZGxlcjxUPiB7XG4gIGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8VD47XG4gIGRlY29yYXRvcjogRGVjb3JhdG9yO1xufVxuXG4vKipcbiAqIGBSZXNvdXJjZUxvYWRlcmAgd2hpY2ggZGlyZWN0bHkgdXNlcyB0aGUgZmlsZXN5c3RlbSB0byByZXNvbHZlIHJlc291cmNlcyBzeW5jaHJvbm91c2x5LlxuICovXG5leHBvcnQgY2xhc3MgRmlsZVJlc291cmNlTG9hZGVyIGltcGxlbWVudHMgUmVzb3VyY2VMb2FkZXIge1xuICBsb2FkKHVybDogc3RyaW5nKTogc3RyaW5nIHsgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyh1cmwsICd1dGY4Jyk7IH1cbn1cblxuZXhwb3J0IGNsYXNzIEFuYWx5emVyIHtcbiAgcmVzb3VyY2VMb2FkZXIgPSBuZXcgRmlsZVJlc291cmNlTG9hZGVyKCk7XG4gIHNjb3BlUmVnaXN0cnkgPSBuZXcgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5KHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCk7XG4gIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPGFueT5bXSA9IFtcbiAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tlciwgdGhpcy5ob3N0LCB0aGlzLnNjb3BlUmVnaXN0cnksIGZhbHNlLCB0aGlzLnJlc291cmNlTG9hZGVyKSxcbiAgICBuZXcgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnR5cGVDaGVja2VyLCB0aGlzLmhvc3QsIHRoaXMuc2NvcGVSZWdpc3RyeSwgZmFsc2UpLFxuICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcih0aGlzLmhvc3QsIGZhbHNlKSxcbiAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCwgdGhpcy5zY29wZVJlZ2lzdHJ5LCBmYWxzZSksXG4gICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCwgdGhpcy5zY29wZVJlZ2lzdHJ5LCBmYWxzZSksXG4gIF07XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIC8qKlxuICAgKiBBbmFseWl6ZSBhIHBhcnNlZCBmaWxlIHRvIGdlbmVyYXRlIHRoZSBpbmZvcm1hdGlvbiBhYm91dCBkZWNvcmF0ZWQgY2xhc3NlcyB0aGF0XG4gICAqIHNob3VsZCBiZSBjb252ZXJ0ZWQgdG8gdXNlIGl2eSBkZWZpbml0aW9ucy5cbiAgICogQHBhcmFtIGZpbGUgVGhlIGZpbGUgdG8gYmUgYW5hbHlzZWQgZm9yIGRlY29yYXRlZCBjbGFzc2VzLlxuICAgKi9cbiAgYW5hbHl6ZUZpbGUoZmlsZTogUGFyc2VkRmlsZSk6IEFuYWx5emVkRmlsZSB7XG4gICAgY29uc3QgYW5hbHl6ZWRDbGFzc2VzID1cbiAgICAgICAgZmlsZS5kZWNvcmF0ZWRDbGFzc2VzLm1hcChjbGF6eiA9PiB0aGlzLmFuYWx5emVDbGFzcyhmaWxlLnNvdXJjZUZpbGUsIGNsYXp6KSlcbiAgICAgICAgICAgIC5maWx0ZXIoYW5hbHlzaXMgPT4gISFhbmFseXNpcykgYXMgQW5hbHl6ZWRDbGFzc1tdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5emVkQ2xhc3NlcyxcbiAgICAgIHNvdXJjZUZpbGU6IGZpbGUuc291cmNlRmlsZSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVDbGFzcyhmaWxlOiB0cy5Tb3VyY2VGaWxlLCBjbGF6ejogUGFyc2VkQ2xhc3MpOiBBbmFseXplZENsYXNzfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgbWF0Y2hpbmdIYW5kbGVycyA9XG4gICAgICAgIHRoaXMuaGFuZGxlcnMubWFwKGhhbmRsZXIgPT4gKHtoYW5kbGVyLCBkZWNvcmF0b3I6IGhhbmRsZXIuZGV0ZWN0KGNsYXp6LmRlY29yYXRvcnMpfSkpXG4gICAgICAgICAgICAuZmlsdGVyKFxuICAgICAgICAgICAgICAgIChtYXRjaGluZ0hhbmRsZXIpOiBtYXRjaGluZ0hhbmRsZXIgaXMgTWF0Y2hpbmdIYW5kbGVyPGFueT4gPT5cbiAgICAgICAgICAgICAgICAgICAgISFtYXRjaGluZ0hhbmRsZXIuZGVjb3JhdG9yKTtcblxuICAgIGlmIChtYXRjaGluZ0hhbmRsZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmIChtYXRjaGluZ0hhbmRsZXJzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUT0RPLkRpYWdub3N0aWM6IENsYXNzIGhhcyBtdWx0aXBsZSBBbmd1bGFyIGRlY29yYXRvcnMuJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGhhbmRsZXIgPSBtYXRjaGluZ0hhbmRsZXJzWzBdLmhhbmRsZXI7XG4gICAgICBjb25zdCBkZWNvcmF0b3IgPSBtYXRjaGluZ0hhbmRsZXJzWzBdLmRlY29yYXRvcjtcblxuICAgICAgY29uc3Qge2FuYWx5c2lzLCBkaWFnbm9zdGljc30gPSBoYW5kbGVyLmFuYWx5emUoY2xhenouZGVjbGFyYXRpb24sIGRlY29yYXRvcik7XG4gICAgICBsZXQgY29tcGlsYXRpb24gPSBoYW5kbGVyLmNvbXBpbGUoY2xhenouZGVjbGFyYXRpb24sIGFuYWx5c2lzKTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShjb21waWxhdGlvbikpIHtcbiAgICAgICAgY29tcGlsYXRpb24gPSBbY29tcGlsYXRpb25dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHsuLi5jbGF6eiwgaGFuZGxlciwgYW5hbHlzaXMsIGRpYWdub3N0aWNzLCBjb21waWxhdGlvbn07XG4gICAgfVxuICB9XG59XG4iXX0=