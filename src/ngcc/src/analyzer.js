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
        function Analyzer(typeChecker, host, rootDirs) {
            this.typeChecker = typeChecker;
            this.host = host;
            this.rootDirs = rootDirs;
            this.resourceLoader = new FileResourceLoader();
            this.scopeRegistry = new annotations_1.SelectorScopeRegistry(this.typeChecker, this.host);
            this.handlers = [
                new annotations_1.BaseDefDecoratorHandler(this.typeChecker, this.host),
                new annotations_1.ComponentDecoratorHandler(this.typeChecker, this.host, this.scopeRegistry, false, this.resourceLoader, this.rootDirs),
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
            var analyzedClasses = file.decoratedClasses.map(function (clazz) { return _this.analyzeClass(constantPool, clazz); })
                .filter(utils_1.isDefined);
            return {
                analyzedClasses: analyzedClasses,
                sourceFile: file.sourceFile, constantPool: constantPool,
            };
        };
        Analyzer.prototype.analyzeClass = function (pool, clazz) {
            var matchingHandlers = this.handlers
                .map(function (handler) { return ({
                handler: handler,
                match: handler.detect(clazz.declaration, clazz.decorators),
            }); })
                .filter(isMatchingHandler);
            if (matchingHandlers.length > 1) {
                throw new Error('TODO.Diagnostic: Class has multiple Angular decorators.');
            }
            if (matchingHandlers.length === 0) {
                return undefined;
            }
            var _a = matchingHandlers[0], handler = _a.handler, match = _a.match;
            var _b = handler.analyze(clazz.declaration, match), analysis = _b.analysis, diagnostics = _b.diagnostics;
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
        return !!handler.match;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUErQztJQUMvQyx1QkFBeUI7SUFHekIsMkVBQXlPO0lBTXpPLGtFQUFrQztJQW9CbEM7O09BRUc7SUFDSDtRQUFBO1FBRUEsQ0FBQztRQURDLGlDQUFJLEdBQUosVUFBSyxHQUFXLElBQVksT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUseUJBQUM7SUFBRCxDQUFDLEFBRkQsSUFFQztJQUZZLGdEQUFrQjtJQUkvQjtRQWFFLGtCQUNZLFdBQTJCLEVBQVUsSUFBd0IsRUFDN0QsUUFBa0I7WUFEbEIsZ0JBQVcsR0FBWCxXQUFXLENBQWdCO1lBQVUsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFDN0QsYUFBUSxHQUFSLFFBQVEsQ0FBVTtZQWQ5QixtQkFBYyxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUMxQyxrQkFBYSxHQUFHLElBQUksbUNBQXFCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkUsYUFBUSxHQUFpQztnQkFDdkMsSUFBSSxxQ0FBdUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ3hELElBQUksdUNBQXlCLENBQ3pCLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUM7Z0JBQy9GLElBQUksdUNBQXlCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDO2dCQUNyRixJQUFJLHdDQUEwQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO2dCQUNoRCxJQUFJLHNDQUF3QixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQztnQkFDcEYsSUFBSSxrQ0FBb0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUM7YUFDakYsQ0FBQztRQUkrQixDQUFDO1FBRWxDOzs7O1dBSUc7UUFDSCw4QkFBVyxHQUFYLFVBQVksSUFBZ0I7WUFBNUIsaUJBVUM7WUFUQyxJQUFNLFlBQVksR0FBRyxJQUFJLHVCQUFZLEVBQUUsQ0FBQztZQUN4QyxJQUFNLGVBQWUsR0FDakIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxVQUFBLEtBQUssSUFBSSxPQUFBLEtBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxFQUF0QyxDQUFzQyxDQUFDO2lCQUNyRSxNQUFNLENBQUMsaUJBQVMsQ0FBQyxDQUFDO1lBRTNCLE9BQU87Z0JBQ0wsZUFBZSxpQkFBQTtnQkFDZixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxZQUFZLGNBQUE7YUFDMUMsQ0FBQztRQUNKLENBQUM7UUFFUywrQkFBWSxHQUF0QixVQUF1QixJQUFrQixFQUFFLEtBQWtCO1lBQzNELElBQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQVE7aUJBQ1IsR0FBRyxDQUFDLFVBQUEsT0FBTyxJQUFJLE9BQUEsQ0FBQztnQkFDVixPQUFPLFNBQUE7Z0JBQ1AsS0FBSyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDO2FBQzNELENBQUMsRUFIUyxDQUdULENBQUM7aUJBQ1AsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFFeEQsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLHlEQUF5RCxDQUFDLENBQUM7YUFDNUU7WUFFRCxJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ2pDLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUssSUFBQSx3QkFBc0MsRUFBckMsb0JBQU8sRUFBRSxnQkFBNEIsQ0FBQztZQUN2QyxJQUFBLDhDQUFtRSxFQUFsRSxzQkFBUSxFQUFFLDRCQUF3RCxDQUFDO1lBQzFFLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDckUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQy9CLFdBQVcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQzdCO1lBQ0QsNEJBQVcsS0FBSyxJQUFFLE9BQU8sU0FBQSxFQUFFLFFBQVEsVUFBQSxFQUFFLFdBQVcsYUFBQSxFQUFFLFdBQVcsYUFBQSxJQUFFO1FBQ2pFLENBQUM7UUFDSCxlQUFDO0lBQUQsQ0FBQyxBQTFERCxJQTBEQztJQTFEWSw0QkFBUTtJQTREckIsU0FBUyxpQkFBaUIsQ0FBTyxPQUF1QztRQUV0RSxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBQ3pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0NvbnN0YW50UG9vbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QmFzZURlZkRlY29yYXRvckhhbmRsZXIsIENvbXBvbmVudERlY29yYXRvckhhbmRsZXIsIERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIsIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyLCBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIsIFBpcGVEZWNvcmF0b3JIYW5kbGVyLCBSZXNvdXJjZUxvYWRlciwgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0NvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uL25ndHNjL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7UGFyc2VkQ2xhc3N9IGZyb20gJy4vcGFyc2luZy9wYXJzZWRfY2xhc3MnO1xuaW1wb3J0IHtQYXJzZWRGaWxlfSBmcm9tICcuL3BhcnNpbmcvcGFyc2VkX2ZpbGUnO1xuaW1wb3J0IHtpc0RlZmluZWR9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFuYWx5emVkQ2xhc3M8QSA9IGFueSwgTSA9IGFueT4gZXh0ZW5kcyBQYXJzZWRDbGFzcyB7XG4gIGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8QSwgTT47XG4gIGFuYWx5c2lzOiBhbnk7XG4gIGRpYWdub3N0aWNzPzogdHMuRGlhZ25vc3RpY1tdO1xuICBjb21waWxhdGlvbjogQ29tcGlsZVJlc3VsdFtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFuYWx5emVkRmlsZSB7XG4gIGFuYWx5emVkQ2xhc3NlczogQW5hbHl6ZWRDbGFzc1tdO1xuICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlO1xuICBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYXRjaGluZ0hhbmRsZXI8QSwgTT4ge1xuICBoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPEEsIE0+O1xuICBtYXRjaDogTTtcbn1cblxuLyoqXG4gKiBgUmVzb3VyY2VMb2FkZXJgIHdoaWNoIGRpcmVjdGx5IHVzZXMgdGhlIGZpbGVzeXN0ZW0gdG8gcmVzb2x2ZSByZXNvdXJjZXMgc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIEZpbGVSZXNvdXJjZUxvYWRlciBpbXBsZW1lbnRzIFJlc291cmNlTG9hZGVyIHtcbiAgbG9hZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiBmcy5yZWFkRmlsZVN5bmModXJsLCAndXRmOCcpOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBBbmFseXplciB7XG4gIHJlc291cmNlTG9hZGVyID0gbmV3IEZpbGVSZXNvdXJjZUxvYWRlcigpO1xuICBzY29wZVJlZ2lzdHJ5ID0gbmV3IFNlbGVjdG9yU2NvcGVSZWdpc3RyeSh0aGlzLnR5cGVDaGVja2VyLCB0aGlzLmhvc3QpO1xuICBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT5bXSA9IFtcbiAgICBuZXcgQmFzZURlZkRlY29yYXRvckhhbmRsZXIodGhpcy50eXBlQ2hlY2tlciwgdGhpcy5ob3N0KSxcbiAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tlciwgdGhpcy5ob3N0LCB0aGlzLnNjb3BlUmVnaXN0cnksIGZhbHNlLCB0aGlzLnJlc291cmNlTG9hZGVyLCB0aGlzLnJvb3REaXJzKSxcbiAgICBuZXcgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnR5cGVDaGVja2VyLCB0aGlzLmhvc3QsIHRoaXMuc2NvcGVSZWdpc3RyeSwgZmFsc2UpLFxuICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcih0aGlzLmhvc3QsIGZhbHNlKSxcbiAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCwgdGhpcy5zY29wZVJlZ2lzdHJ5LCBmYWxzZSksXG4gICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKHRoaXMudHlwZUNoZWNrZXIsIHRoaXMuaG9zdCwgdGhpcy5zY29wZVJlZ2lzdHJ5LCBmYWxzZSksXG4gIF07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHR5cGVDaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIHJvb3REaXJzOiBzdHJpbmdbXSkge31cblxuICAvKipcbiAgICogQW5hbHlpemUgYSBwYXJzZWQgZmlsZSB0byBnZW5lcmF0ZSB0aGUgaW5mb3JtYXRpb24gYWJvdXQgZGVjb3JhdGVkIGNsYXNzZXMgdGhhdFxuICAgKiBzaG91bGQgYmUgY29udmVydGVkIHRvIHVzZSBpdnkgZGVmaW5pdGlvbnMuXG4gICAqIEBwYXJhbSBmaWxlIFRoZSBmaWxlIHRvIGJlIGFuYWx5c2VkIGZvciBkZWNvcmF0ZWQgY2xhc3Nlcy5cbiAgICovXG4gIGFuYWx5emVGaWxlKGZpbGU6IFBhcnNlZEZpbGUpOiBBbmFseXplZEZpbGUge1xuICAgIGNvbnN0IGNvbnN0YW50UG9vbCA9IG5ldyBDb25zdGFudFBvb2woKTtcbiAgICBjb25zdCBhbmFseXplZENsYXNzZXMgPVxuICAgICAgICBmaWxlLmRlY29yYXRlZENsYXNzZXMubWFwKGNsYXp6ID0+IHRoaXMuYW5hbHl6ZUNsYXNzKGNvbnN0YW50UG9vbCwgY2xhenopKVxuICAgICAgICAgICAgLmZpbHRlcihpc0RlZmluZWQpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5emVkQ2xhc3NlcyxcbiAgICAgIHNvdXJjZUZpbGU6IGZpbGUuc291cmNlRmlsZSwgY29uc3RhbnRQb29sLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYW5hbHl6ZUNsYXNzKHBvb2w6IENvbnN0YW50UG9vbCwgY2xheno6IFBhcnNlZENsYXNzKTogQW5hbHl6ZWRDbGFzc3x1bmRlZmluZWQge1xuICAgIGNvbnN0IG1hdGNoaW5nSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGhhbmRsZXIgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoOiBoYW5kbGVyLmRldGVjdChjbGF6ei5kZWNsYXJhdGlvbiwgY2xhenouZGVjb3JhdG9ycyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpc01hdGNoaW5nSGFuZGxlcik7XG5cbiAgICBpZiAobWF0Y2hpbmdIYW5kbGVycy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RPRE8uRGlhZ25vc3RpYzogQ2xhc3MgaGFzIG11bHRpcGxlIEFuZ3VsYXIgZGVjb3JhdG9ycy4nKTtcbiAgICB9XG5cbiAgICBpZiAobWF0Y2hpbmdIYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qge2hhbmRsZXIsIG1hdGNofSA9IG1hdGNoaW5nSGFuZGxlcnNbMF07XG4gICAgY29uc3Qge2FuYWx5c2lzLCBkaWFnbm9zdGljc30gPSBoYW5kbGVyLmFuYWx5emUoY2xhenouZGVjbGFyYXRpb24sIG1hdGNoKTtcbiAgICBsZXQgY29tcGlsYXRpb24gPSBoYW5kbGVyLmNvbXBpbGUoY2xhenouZGVjbGFyYXRpb24sIGFuYWx5c2lzLCBwb29sKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoY29tcGlsYXRpb24pKSB7XG4gICAgICBjb21waWxhdGlvbiA9IFtjb21waWxhdGlvbl07XG4gICAgfVxuICAgIHJldHVybiB7Li4uY2xhenosIGhhbmRsZXIsIGFuYWx5c2lzLCBkaWFnbm9zdGljcywgY29tcGlsYXRpb259O1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzTWF0Y2hpbmdIYW5kbGVyPEEsIE0+KGhhbmRsZXI6IFBhcnRpYWw8TWF0Y2hpbmdIYW5kbGVyPEEsIE0+Pik6XG4gICAgaGFuZGxlciBpcyBNYXRjaGluZ0hhbmRsZXI8QSwgTT4ge1xuICByZXR1cm4gISFoYW5kbGVyLm1hdGNoO1xufVxuIl19