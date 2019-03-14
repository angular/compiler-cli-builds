(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/analysis/private_declarations_analyzer", ["require", "exports", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
    /**
     * This class will analyze a program to find all the declared classes
     * (i.e. on an NgModule) that are not publicly exported via an entry-point.
     */
    var PrivateDeclarationsAnalyzer = /** @class */ (function () {
        function PrivateDeclarationsAnalyzer(host, referencesRegistry) {
            this.host = host;
            this.referencesRegistry = referencesRegistry;
        }
        PrivateDeclarationsAnalyzer.prototype.analyzeProgram = function (program) {
            var rootFiles = this.getRootFiles(program);
            return this.getPrivateDeclarations(rootFiles, this.referencesRegistry.getDeclarationMap());
        };
        PrivateDeclarationsAnalyzer.prototype.getRootFiles = function (program) {
            return program.getRootFileNames().map(function (f) { return program.getSourceFile(f); }).filter(utils_1.isDefined);
        };
        PrivateDeclarationsAnalyzer.prototype.getPrivateDeclarations = function (rootFiles, declarations) {
            var _this = this;
            var privateDeclarations = new Map(declarations);
            var exportAliasDeclarations = new Map();
            rootFiles.forEach(function (f) {
                var exports = _this.host.getExportsOfModule(f);
                if (exports) {
                    exports.forEach(function (declaration, exportedName) {
                        if (utils_1.hasNameIdentifier(declaration.node)) {
                            var privateDeclaration = privateDeclarations.get(declaration.node.name);
                            if (privateDeclaration) {
                                if (privateDeclaration.node !== declaration.node) {
                                    throw new Error(declaration.node.name.text + " is declared multiple times.");
                                }
                                if (declaration.node.name.text === exportedName) {
                                    // This declaration is public so we can remove it from the list
                                    privateDeclarations.delete(declaration.node.name);
                                }
                                else if (!_this.host.getDtsDeclaration(declaration.node)) {
                                    // The referenced declaration is exported publicly but via an alias.
                                    // In some cases the original declaration is missing from the dts program, such as
                                    // when rolling up (flattening) the dts files.
                                    // This is because the original declaration gets renamed to the exported alias.
                                    // There is a constraint on this which we cannot handle. Consider the following
                                    // code:
                                    //
                                    // /src/entry_point.js:
                                    //     export {MyComponent as aliasedMyComponent} from './a';
                                    //     export {MyComponent} from './b';`
                                    //
                                    // /src/a.js:
                                    //     export class MyComponent {}
                                    //
                                    // /src/b.js:
                                    //     export class MyComponent {}
                                    //
                                    // //typings/entry_point.d.ts:
                                    //     export declare class aliasedMyComponent {}
                                    //     export declare class MyComponent {}
                                    //
                                    // In this case we would end up matching the `MyComponent` from `/src/a.js` to the
                                    // `MyComponent` declared in `/typings/entry_point.d.ts` even though that
                                    // declaration is actually for the `MyComponent` in `/src/b.js`.
                                    exportAliasDeclarations.set(declaration.node.name, exportedName);
                                }
                            }
                        }
                    });
                }
            });
            return Array.from(privateDeclarations.keys()).map(function (id) {
                var from = id.getSourceFile().fileName;
                var declaration = privateDeclarations.get(id);
                var alias = exportAliasDeclarations.get(id) || null;
                var dtsDeclaration = _this.host.getDtsDeclaration(declaration.node);
                var dtsFrom = dtsDeclaration && dtsDeclaration.getSourceFile().fileName;
                return { identifier: id.text, from: from, dtsFrom: dtsFrom, alias: alias };
            });
        };
        return PrivateDeclarationsAnalyzer;
    }());
    exports.PrivateDeclarationsAnalyzer = PrivateDeclarationsAnalyzer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL2FuYWx5c2lzL3ByaXZhdGVfZGVjbGFyYXRpb25zX2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBV0Esa0VBQXNEO0lBV3REOzs7T0FHRztJQUNIO1FBQ0UscUNBQ1ksSUFBd0IsRUFBVSxrQkFBMEM7WUFBNUUsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBVSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXdCO1FBQUcsQ0FBQztRQUU1RixvREFBYyxHQUFkLFVBQWUsT0FBbUI7WUFDaEMsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3QyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUM3RixDQUFDO1FBRU8sa0RBQVksR0FBcEIsVUFBcUIsT0FBbUI7WUFDdEMsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUF4QixDQUF3QixDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFTLENBQUMsQ0FBQztRQUN6RixDQUFDO1FBRU8sNERBQXNCLEdBQTlCLFVBQ0ksU0FBMEIsRUFDMUIsWUFBNkM7WUFGakQsaUJBZ0VDO1lBN0RDLElBQU0sbUJBQW1CLEdBQW9DLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ25GLElBQU0sdUJBQXVCLEdBQStCLElBQUksR0FBRyxFQUFFLENBQUM7WUFFdEUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUM7Z0JBQ2pCLElBQU0sT0FBTyxHQUFHLEtBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hELElBQUksT0FBTyxFQUFFO29CQUNYLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBQyxXQUFXLEVBQUUsWUFBWTt3QkFDeEMsSUFBSSx5QkFBaUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUU7NEJBQ3ZDLElBQU0sa0JBQWtCLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQzFFLElBQUksa0JBQWtCLEVBQUU7Z0NBQ3RCLElBQUksa0JBQWtCLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQyxJQUFJLEVBQUU7b0NBQ2hELE1BQU0sSUFBSSxLQUFLLENBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxpQ0FBOEIsQ0FBQyxDQUFDO2lDQUM5RTtnQ0FFRCxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUU7b0NBQy9DLCtEQUErRDtvQ0FDL0QsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUNBQ25EO3FDQUFNLElBQUksQ0FBQyxLQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQ0FDekQsb0VBQW9FO29DQUNwRSxrRkFBa0Y7b0NBQ2xGLDhDQUE4QztvQ0FDOUMsK0VBQStFO29DQUUvRSwrRUFBK0U7b0NBQy9FLFFBQVE7b0NBQ1IsRUFBRTtvQ0FDRix1QkFBdUI7b0NBQ3ZCLDZEQUE2RDtvQ0FDN0Qsd0NBQXdDO29DQUN4QyxFQUFFO29DQUNGLGFBQWE7b0NBQ2Isa0NBQWtDO29DQUNsQyxFQUFFO29DQUNGLGFBQWE7b0NBQ2Isa0NBQWtDO29DQUNsQyxFQUFFO29DQUNGLDhCQUE4QjtvQ0FDOUIsaURBQWlEO29DQUNqRCwwQ0FBMEM7b0NBQzFDLEVBQUU7b0NBQ0Ysa0ZBQWtGO29DQUNsRix5RUFBeUU7b0NBQ3pFLGdFQUFnRTtvQ0FFaEUsdUJBQXVCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO2lDQUNsRTs2QkFDRjt5QkFDRjtvQkFDSCxDQUFDLENBQUMsQ0FBQztpQkFDSjtZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsRUFBRTtnQkFDbEQsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsQ0FBQztnQkFDekMsSUFBTSxXQUFXLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBRyxDQUFDO2dCQUNsRCxJQUFNLEtBQUssR0FBRyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDO2dCQUN0RCxJQUFNLGNBQWMsR0FBRyxLQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDckUsSUFBTSxPQUFPLEdBQUcsY0FBYyxJQUFJLGNBQWMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLENBQUM7Z0JBRTFFLE9BQU8sRUFBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLE1BQUEsRUFBRSxPQUFPLFNBQUEsRUFBRSxLQUFLLE9BQUEsRUFBQyxDQUFDO1lBQ3JELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNILGtDQUFDO0lBQUQsQ0FBQyxBQTlFRCxJQThFQztJQTlFWSxrRUFBMkIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtoYXNOYW1lSWRlbnRpZmllciwgaXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge05nY2NSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4vbmdjY19yZWZlcmVuY2VzX3JlZ2lzdHJ5JztcblxuZXhwb3J0IGludGVyZmFjZSBFeHBvcnRJbmZvIHtcbiAgaWRlbnRpZmllcjogc3RyaW5nO1xuICBmcm9tOiBzdHJpbmc7XG4gIGR0c0Zyb20/OiBzdHJpbmd8bnVsbDtcbiAgYWxpYXM/OiBzdHJpbmd8bnVsbDtcbn1cbmV4cG9ydCB0eXBlIFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyA9IEV4cG9ydEluZm9bXTtcblxuLyoqXG4gKiBUaGlzIGNsYXNzIHdpbGwgYW5hbHl6ZSBhIHByb2dyYW0gdG8gZmluZCBhbGwgdGhlIGRlY2xhcmVkIGNsYXNzZXNcbiAqIChpLmUuIG9uIGFuIE5nTW9kdWxlKSB0aGF0IGFyZSBub3QgcHVibGljbHkgZXhwb3J0ZWQgdmlhIGFuIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgY2xhc3MgUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IE5nY2NSZWZlcmVuY2VzUmVnaXN0cnkpIHt9XG5cbiAgYW5hbHl6ZVByb2dyYW0ocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyB7XG4gICAgY29uc3Qgcm9vdEZpbGVzID0gdGhpcy5nZXRSb290RmlsZXMocHJvZ3JhbSk7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UHJpdmF0ZURlY2xhcmF0aW9ucyhyb290RmlsZXMsIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LmdldERlY2xhcmF0aW9uTWFwKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSb290RmlsZXMocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGVbXSB7XG4gICAgcmV0dXJuIHByb2dyYW0uZ2V0Um9vdEZpbGVOYW1lcygpLm1hcChmID0+IHByb2dyYW0uZ2V0U291cmNlRmlsZShmKSkuZmlsdGVyKGlzRGVmaW5lZCk7XG4gIH1cblxuICBwcml2YXRlIGdldFByaXZhdGVEZWNsYXJhdGlvbnMoXG4gICAgICByb290RmlsZXM6IHRzLlNvdXJjZUZpbGVbXSxcbiAgICAgIGRlY2xhcmF0aW9uczogTWFwPHRzLklkZW50aWZpZXIsIERlY2xhcmF0aW9uPik6IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyB7XG4gICAgY29uc3QgcHJpdmF0ZURlY2xhcmF0aW9uczogTWFwPHRzLklkZW50aWZpZXIsIERlY2xhcmF0aW9uPiA9IG5ldyBNYXAoZGVjbGFyYXRpb25zKTtcbiAgICBjb25zdCBleHBvcnRBbGlhc0RlY2xhcmF0aW9uczogTWFwPHRzLklkZW50aWZpZXIsIHN0cmluZz4gPSBuZXcgTWFwKCk7XG5cbiAgICByb290RmlsZXMuZm9yRWFjaChmID0+IHtcbiAgICAgIGNvbnN0IGV4cG9ydHMgPSB0aGlzLmhvc3QuZ2V0RXhwb3J0c09mTW9kdWxlKGYpO1xuICAgICAgaWYgKGV4cG9ydHMpIHtcbiAgICAgICAgZXhwb3J0cy5mb3JFYWNoKChkZWNsYXJhdGlvbiwgZXhwb3J0ZWROYW1lKSA9PiB7XG4gICAgICAgICAgaWYgKGhhc05hbWVJZGVudGlmaWVyKGRlY2xhcmF0aW9uLm5vZGUpKSB7XG4gICAgICAgICAgICBjb25zdCBwcml2YXRlRGVjbGFyYXRpb24gPSBwcml2YXRlRGVjbGFyYXRpb25zLmdldChkZWNsYXJhdGlvbi5ub2RlLm5hbWUpO1xuICAgICAgICAgICAgaWYgKHByaXZhdGVEZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgICBpZiAocHJpdmF0ZURlY2xhcmF0aW9uLm5vZGUgIT09IGRlY2xhcmF0aW9uLm5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7ZGVjbGFyYXRpb24ubm9kZS5uYW1lLnRleHR9IGlzIGRlY2xhcmVkIG11bHRpcGxlIHRpbWVzLmApO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKGRlY2xhcmF0aW9uLm5vZGUubmFtZS50ZXh0ID09PSBleHBvcnRlZE5hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGRlY2xhcmF0aW9uIGlzIHB1YmxpYyBzbyB3ZSBjYW4gcmVtb3ZlIGl0IGZyb20gdGhlIGxpc3RcbiAgICAgICAgICAgICAgICBwcml2YXRlRGVjbGFyYXRpb25zLmRlbGV0ZShkZWNsYXJhdGlvbi5ub2RlLm5hbWUpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmhvc3QuZ2V0RHRzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgcmVmZXJlbmNlZCBkZWNsYXJhdGlvbiBpcyBleHBvcnRlZCBwdWJsaWNseSBidXQgdmlhIGFuIGFsaWFzLlxuICAgICAgICAgICAgICAgIC8vIEluIHNvbWUgY2FzZXMgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGlzIG1pc3NpbmcgZnJvbSB0aGUgZHRzIHByb2dyYW0sIHN1Y2ggYXNcbiAgICAgICAgICAgICAgICAvLyB3aGVuIHJvbGxpbmcgdXAgKGZsYXR0ZW5pbmcpIHRoZSBkdHMgZmlsZXMuXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBiZWNhdXNlIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBnZXRzIHJlbmFtZWQgdG8gdGhlIGV4cG9ydGVkIGFsaWFzLlxuXG4gICAgICAgICAgICAgICAgLy8gVGhlcmUgaXMgYSBjb25zdHJhaW50IG9uIHRoaXMgd2hpY2ggd2UgY2Fubm90IGhhbmRsZS4gQ29uc2lkZXIgdGhlIGZvbGxvd2luZ1xuICAgICAgICAgICAgICAgIC8vIGNvZGU6XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAvc3JjL2VudHJ5X3BvaW50LmpzOlxuICAgICAgICAgICAgICAgIC8vICAgICBleHBvcnQge015Q29tcG9uZW50IGFzIGFsaWFzZWRNeUNvbXBvbmVudH0gZnJvbSAnLi9hJztcbiAgICAgICAgICAgICAgICAvLyAgICAgZXhwb3J0IHtNeUNvbXBvbmVudH0gZnJvbSAnLi9iJztgXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAvc3JjL2EuanM6XG4gICAgICAgICAgICAgICAgLy8gICAgIGV4cG9ydCBjbGFzcyBNeUNvbXBvbmVudCB7fVxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gL3NyYy9iLmpzOlxuICAgICAgICAgICAgICAgIC8vICAgICBleHBvcnQgY2xhc3MgTXlDb21wb25lbnQge31cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vIC8vdHlwaW5ncy9lbnRyeV9wb2ludC5kLnRzOlxuICAgICAgICAgICAgICAgIC8vICAgICBleHBvcnQgZGVjbGFyZSBjbGFzcyBhbGlhc2VkTXlDb21wb25lbnQge31cbiAgICAgICAgICAgICAgICAvLyAgICAgZXhwb3J0IGRlY2xhcmUgY2xhc3MgTXlDb21wb25lbnQge31cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vIEluIHRoaXMgY2FzZSB3ZSB3b3VsZCBlbmQgdXAgbWF0Y2hpbmcgdGhlIGBNeUNvbXBvbmVudGAgZnJvbSBgL3NyYy9hLmpzYCB0byB0aGVcbiAgICAgICAgICAgICAgICAvLyBgTXlDb21wb25lbnRgIGRlY2xhcmVkIGluIGAvdHlwaW5ncy9lbnRyeV9wb2ludC5kLnRzYCBldmVuIHRob3VnaCB0aGF0XG4gICAgICAgICAgICAgICAgLy8gZGVjbGFyYXRpb24gaXMgYWN0dWFsbHkgZm9yIHRoZSBgTXlDb21wb25lbnRgIGluIGAvc3JjL2IuanNgLlxuXG4gICAgICAgICAgICAgICAgZXhwb3J0QWxpYXNEZWNsYXJhdGlvbnMuc2V0KGRlY2xhcmF0aW9uLm5vZGUubmFtZSwgZXhwb3J0ZWROYW1lKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gQXJyYXkuZnJvbShwcml2YXRlRGVjbGFyYXRpb25zLmtleXMoKSkubWFwKGlkID0+IHtcbiAgICAgIGNvbnN0IGZyb20gPSBpZC5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHByaXZhdGVEZWNsYXJhdGlvbnMuZ2V0KGlkKSAhO1xuICAgICAgY29uc3QgYWxpYXMgPSBleHBvcnRBbGlhc0RlY2xhcmF0aW9ucy5nZXQoaWQpIHx8IG51bGw7XG4gICAgICBjb25zdCBkdHNEZWNsYXJhdGlvbiA9IHRoaXMuaG9zdC5nZXREdHNEZWNsYXJhdGlvbihkZWNsYXJhdGlvbi5ub2RlKTtcbiAgICAgIGNvbnN0IGR0c0Zyb20gPSBkdHNEZWNsYXJhdGlvbiAmJiBkdHNEZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG5cbiAgICAgIHJldHVybiB7aWRlbnRpZmllcjogaWQudGV4dCwgZnJvbSwgZHRzRnJvbSwgYWxpYXN9O1xuICAgIH0pO1xuICB9XG59XG4iXX0=