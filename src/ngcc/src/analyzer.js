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
            var analyzedClasses = file.decoratedClasses
                .map(function (clazz) { return _this.analyzeClass(file.sourceFile, clazz); })
                .filter(function (analysis) { return !!analysis; });
            return {
                analyzedClasses: analyzedClasses,
                sourceFile: file.sourceFile,
            };
        };
        Analyzer.prototype.analyzeClass = function (file, clazz) {
            var matchingHandlers = this.handlers
                .map(function (handler) { return ({ handler: handler, decorator: handler.detect(clazz.decorators) }); })
                .filter(function (matchingHandler) { return !!matchingHandler.decorator; });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILHVCQUF5QjtJQUV6QiwyRUFBZ047SUF3QmhOOztPQUVHO0lBQ0g7UUFBQTtRQUVBLENBQUM7UUFEQyxpQ0FBSSxHQUFKLFVBQUssR0FBVyxJQUFZLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLHlCQUFDO0lBQUQsQ0FBQyxBQUZELElBRUM7SUFGWSxnREFBa0I7SUFJL0I7UUFZRSxrQkFBb0IsV0FBMkIsRUFBVSxJQUF3QjtZQUE3RCxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFBVSxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQVZqRixtQkFBYyxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUMxQyxrQkFBYSxHQUFHLElBQUksbUNBQXFCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkUsYUFBUSxHQUE0QjtnQkFDbEMsSUFBSSx1Q0FBeUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQztnQkFDMUcsSUFBSSx1Q0FBeUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUM7Z0JBQ3JGLElBQUksd0NBQTBCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7Z0JBQ2hELElBQUksc0NBQXdCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDO2dCQUNwRixJQUFJLGtDQUFvQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQzthQUNqRixDQUFDO1FBRWtGLENBQUM7UUFFckY7Ozs7V0FJRztRQUNILDhCQUFXLEdBQVgsVUFBWSxJQUFnQjtZQUE1QixpQkFTQztZQVJDLElBQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxnQkFBZ0I7aUJBQzFDLEdBQUcsQ0FBQyxVQUFBLEtBQUssSUFBSSxPQUFBLEtBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsRUFBekMsQ0FBeUMsQ0FBQztpQkFDdkQsTUFBTSxDQUFDLFVBQUEsUUFBUSxJQUFJLE9BQUEsQ0FBQyxDQUFDLFFBQVEsRUFBVixDQUFVLENBQW9CLENBQUM7WUFFckQsT0FBTztnQkFDTCxlQUFlLGlCQUFBO2dCQUNmLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTthQUM1QixDQUFDO1FBQ0osQ0FBQztRQUVTLCtCQUFZLEdBQXRCLFVBQXVCLElBQW1CLEVBQUUsS0FBa0I7WUFDNUQsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsUUFBUTtpQkFDbkMsR0FBRyxDQUFDLFVBQUEsT0FBTyxJQUFJLE9BQUEsQ0FBQyxFQUFFLE9BQU8sU0FBQSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQTFELENBQTBELENBQUM7aUJBQzFFLE1BQU0sQ0FBQyxVQUFDLGVBQWUsSUFBOEMsT0FBQSxDQUFDLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBM0IsQ0FBMkIsQ0FBQyxDQUFDO1lBRXJHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDL0IsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO29CQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLHlEQUF5RCxDQUFDLENBQUM7aUJBQzVFO2dCQUVELElBQU0sT0FBTyxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFDNUMsSUFBTSxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO2dCQUUxQyxJQUFBLGtEQUF1RSxFQUF0RSxzQkFBUSxFQUFFLDRCQUFXLENBQWtEO2dCQUM5RSxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQy9ELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFO29CQUMvQixXQUFXLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztpQkFDN0I7Z0JBQ0QsNEJBQVksS0FBSyxJQUFFLE9BQU8sU0FBQSxFQUFFLFFBQVEsVUFBQSxFQUFFLFdBQVcsYUFBQSxFQUFFLFdBQVcsYUFBQSxJQUFHO2FBQ2xFO1FBQ0gsQ0FBQztRQUVILGVBQUM7SUFBRCxDQUFDLEFBcERELElBb0RDO0lBcERZLDRCQUFRIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0NvbXBvbmVudERlY29yYXRvckhhbmRsZXIsIERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIsIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyLCBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIsIFBpcGVEZWNvcmF0b3JIYW5kbGVyLCBSZXNvdXJjZUxvYWRlciwgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0RlY29yYXRvcn0gZnJvbSAnLi4vLi4vbmd0c2MvaG9zdCc7XG5pbXBvcnQge0NvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge1BhcnNlZENsYXNzfSBmcm9tICcuL3BhcnNpbmcvcGFyc2VkX2NsYXNzJztcbmltcG9ydCB7UGFyc2VkRmlsZX0gZnJvbSAnLi9wYXJzaW5nL3BhcnNlZF9maWxlJztcblxuZXhwb3J0IGludGVyZmFjZSBBbmFseXplZENsYXNzPFQgPSBhbnk+IGV4dGVuZHMgUGFyc2VkQ2xhc3Mge1xuICBoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPFQ+O1xuICBhbmFseXNpczogYW55O1xuICBkaWFnbm9zdGljcz86IHRzLkRpYWdub3N0aWNbXTtcbiAgY29tcGlsYXRpb246IENvbXBpbGVSZXN1bHRbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBbmFseXplZEZpbGUge1xuICBhbmFseXplZENsYXNzZXM6IEFuYWx5emVkQ2xhc3NbXTtcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYXRjaGluZ0hhbmRsZXI8VD4ge1xuICBoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPFQ+O1xuICBkZWNvcmF0b3I6IERlY29yYXRvcjtcbn1cblxuLyoqXG4gKiBgUmVzb3VyY2VMb2FkZXJgIHdoaWNoIGRpcmVjdGx5IHVzZXMgdGhlIGZpbGVzeXN0ZW0gdG8gcmVzb2x2ZSByZXNvdXJjZXMgc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIEZpbGVSZXNvdXJjZUxvYWRlciBpbXBsZW1lbnRzIFJlc291cmNlTG9hZGVyIHtcbiAgbG9hZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiBmcy5yZWFkRmlsZVN5bmModXJsLCAndXRmOCcpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBBbmFseXplciB7XG5cbiAgcmVzb3VyY2VMb2FkZXIgPSBuZXcgRmlsZVJlc291cmNlTG9hZGVyKCk7XG4gIHNjb3BlUmVnaXN0cnkgPSBuZXcgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5KHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCk7XG4gIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPGFueT5bXSA9IFtcbiAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcih0aGlzLnR5cGVDaGVja2VyLCB0aGlzLmhvc3QsIHRoaXMuc2NvcGVSZWdpc3RyeSwgZmFsc2UsIHRoaXMucmVzb3VyY2VMb2FkZXIpLFxuICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCwgdGhpcy5zY29wZVJlZ2lzdHJ5LCBmYWxzZSksXG4gICAgbmV3IEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyKHRoaXMuaG9zdCwgZmFsc2UpLFxuICAgIG5ldyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIodGhpcy50eXBlQ2hlY2tlciwgdGhpcy5ob3N0LCB0aGlzLnNjb3BlUmVnaXN0cnksIGZhbHNlKSxcbiAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIodGhpcy50eXBlQ2hlY2tlciwgdGhpcy5ob3N0LCB0aGlzLnNjb3BlUmVnaXN0cnksIGZhbHNlKSxcbiAgXTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHR5cGVDaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QpIHt9XG5cbiAgLyoqXG4gICAqIEFuYWx5aXplIGEgcGFyc2VkIGZpbGUgdG8gZ2VuZXJhdGUgdGhlIGluZm9ybWF0aW9uIGFib3V0IGRlY29yYXRlZCBjbGFzc2VzIHRoYXRcbiAgICogc2hvdWxkIGJlIGNvbnZlcnRlZCB0byB1c2UgaXZ5IGRlZmluaXRpb25zLlxuICAgKiBAcGFyYW0gZmlsZSBUaGUgZmlsZSB0byBiZSBhbmFseXNlZCBmb3IgZGVjb3JhdGVkIGNsYXNzZXMuXG4gICAqL1xuICBhbmFseXplRmlsZShmaWxlOiBQYXJzZWRGaWxlKTogQW5hbHl6ZWRGaWxlIHtcbiAgICBjb25zdCBhbmFseXplZENsYXNzZXMgPSBmaWxlLmRlY29yYXRlZENsYXNzZXNcbiAgICAgIC5tYXAoY2xhenogPT4gdGhpcy5hbmFseXplQ2xhc3MoZmlsZS5zb3VyY2VGaWxlLCBjbGF6eikpXG4gICAgICAuZmlsdGVyKGFuYWx5c2lzID0+ICEhYW5hbHlzaXMpIGFzIEFuYWx5emVkQ2xhc3NbXTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXplZENsYXNzZXMsXG4gICAgICBzb3VyY2VGaWxlOiBmaWxlLnNvdXJjZUZpbGUsXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplQ2xhc3MoZmlsZTogdHMuU291cmNlRmlsZSwgY2xheno6IFBhcnNlZENsYXNzKTogQW5hbHl6ZWRDbGFzc3x1bmRlZmluZWQge1xuICAgIGNvbnN0IG1hdGNoaW5nSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzXG4gICAgICAubWFwKGhhbmRsZXIgPT4gKHsgaGFuZGxlciwgZGVjb3JhdG9yOiBoYW5kbGVyLmRldGVjdChjbGF6ei5kZWNvcmF0b3JzKSB9KSlcbiAgICAgIC5maWx0ZXIoKG1hdGNoaW5nSGFuZGxlcik6IG1hdGNoaW5nSGFuZGxlciBpcyBNYXRjaGluZ0hhbmRsZXI8YW55PiA9PiAhIW1hdGNoaW5nSGFuZGxlci5kZWNvcmF0b3IpO1xuXG4gICAgaWYgKG1hdGNoaW5nSGFuZGxlcnMubGVuZ3RoID4gMCkge1xuICAgICAgaWYgKG1hdGNoaW5nSGFuZGxlcnMubGVuZ3RoID4gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RPRE8uRGlhZ25vc3RpYzogQ2xhc3MgaGFzIG11bHRpcGxlIEFuZ3VsYXIgZGVjb3JhdG9ycy4nKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaGFuZGxlciA9IG1hdGNoaW5nSGFuZGxlcnNbMF0uaGFuZGxlcjtcbiAgICAgIGNvbnN0IGRlY29yYXRvciA9IG1hdGNoaW5nSGFuZGxlcnNbMF0uZGVjb3JhdG9yO1xuXG4gICAgICBjb25zdCB7YW5hbHlzaXMsIGRpYWdub3N0aWNzfSA9IGhhbmRsZXIuYW5hbHl6ZShjbGF6ei5kZWNsYXJhdGlvbiwgZGVjb3JhdG9yKTtcbiAgICAgIGxldCBjb21waWxhdGlvbiA9IGhhbmRsZXIuY29tcGlsZShjbGF6ei5kZWNsYXJhdGlvbiwgYW5hbHlzaXMpO1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGNvbXBpbGF0aW9uKSkge1xuICAgICAgICBjb21waWxhdGlvbiA9IFtjb21waWxhdGlvbl07XG4gICAgICB9XG4gICAgICByZXR1cm4geyAuLi5jbGF6eiwgaGFuZGxlciwgYW5hbHlzaXMsIGRpYWdub3N0aWNzLCBjb21waWxhdGlvbiB9O1xuICAgIH1cbiAgfVxuXG59XG4iXX0=