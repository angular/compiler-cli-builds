/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/tsc_plugin", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/synthetic_files_compiler_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var synthetic_files_compiler_host_1 = require("@angular/compiler-cli/src/ngtsc/synthetic_files_compiler_host");
    // Copied from tsc_wrapped/plugin_api.ts to avoid a runtime dependency on that package
    function createProxy(delegate) {
        var e_1, _a;
        var proxy = Object.create(null);
        var _loop_1 = function (k) {
            proxy[k] = function () { return delegate[k].apply(delegate, arguments); };
        };
        try {
            for (var _b = tslib_1.__values(Object.keys(delegate)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var k = _c.value;
                _loop_1(k);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return proxy;
    }
    var NgTscPlugin = /** @class */ (function () {
        function NgTscPlugin(angularCompilerOptions) {
            this.angularCompilerOptions = angularCompilerOptions;
        }
        NgTscPlugin.prototype.wrap = function (program, config, host) {
            var proxy = createProxy(program);
            proxy.getSemanticDiagnostics = function (sourceFile) {
                var result = tslib_1.__spread(program.getSemanticDiagnostics(sourceFile));
                // For demo purposes, trigger a diagnostic when the sourcefile has a magic string
                if (sourceFile.text.indexOf('diag') >= 0) {
                    var fake = {
                        file: sourceFile,
                        start: 0,
                        length: 3,
                        messageText: 'Example Angular Compiler Diagnostic',
                        category: ts.DiagnosticCategory.Error,
                        code: 12345,
                        // source is the name of the plugin.
                        source: 'Angular',
                    };
                    result.push(fake);
                }
                return result;
            };
            return proxy;
        };
        NgTscPlugin.prototype.createTransformers = function (host) {
            var afterDeclarations = [function (context) { return function (sf) {
                    var visitor = function (node) {
                        if (node.kind === ts.SyntaxKind.ClassDeclaration) {
                            var clz = node;
                            // For demo purposes, transform the class name in the .d.ts output
                            return ts.updateClassDeclaration(clz, clz.decorators, node.modifiers, ts.createIdentifier('NEWNAME'), clz.typeParameters, clz.heritageClauses, clz.members);
                        }
                        return ts.visitEachChild(node, visitor, context);
                    };
                    return visitor(sf);
                }; }];
            return { afterDeclarations: afterDeclarations };
        };
        NgTscPlugin.prototype.wrapHost = function (inputFiles, compilerHost) {
            return new synthetic_files_compiler_host_1.SyntheticFilesCompilerHost(inputFiles, compilerHost, this.generatedFiles);
        };
        NgTscPlugin.prototype.generatedFiles = function (rootFiles) {
            return {
                'file-1.ts': function (host) {
                    return ts.createSourceFile('file-1.ts', 'contents', ts.ScriptTarget.ES5);
                },
            };
        };
        return NgTscPlugin;
    }());
    exports.NgTscPlugin = NgTscPlugin;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjX3BsdWdpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHNjX3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMsK0dBQTJFO0lBRTNFLHNGQUFzRjtJQUN0RixTQUFTLFdBQVcsQ0FBSSxRQUFXOztRQUNqQyxJQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dDQUN2QixDQUFDO1lBQ1YsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLGNBQWEsT0FBUSxRQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7OztZQURwRixLQUFnQixJQUFBLEtBQUEsaUJBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQSxnQkFBQTtnQkFBaEMsSUFBTSxDQUFDLFdBQUE7d0JBQUQsQ0FBQzthQUVYOzs7Ozs7Ozs7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRDtRQUNFLHFCQUFvQixzQkFBK0I7WUFBL0IsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFTO1FBQUcsQ0FBQztRQUV2RCwwQkFBSSxHQUFKLFVBQUssT0FBbUIsRUFBRSxNQUFVLEVBQUUsSUFBcUI7WUFDekQsSUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25DLEtBQUssQ0FBQyxzQkFBc0IsR0FBRyxVQUFDLFVBQXlCO2dCQUN2RCxJQUFNLE1BQU0sb0JBQXdCLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUVoRixpRkFBaUY7Z0JBQ2pGLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUN4QyxJQUFNLElBQUksR0FBa0I7d0JBQzFCLElBQUksRUFBRSxVQUFVO3dCQUNoQixLQUFLLEVBQUUsQ0FBQzt3QkFDUixNQUFNLEVBQUUsQ0FBQzt3QkFDVCxXQUFXLEVBQUUscUNBQXFDO3dCQUNsRCxRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUs7d0JBQ3JDLElBQUksRUFBRSxLQUFLO3dCQUNYLG9DQUFvQzt3QkFDcEMsTUFBTSxFQUFFLFNBQVM7cUJBQ2xCLENBQUM7b0JBQ0YsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDbkI7Z0JBQ0QsT0FBTyxNQUFNLENBQUM7WUFDaEIsQ0FBQyxDQUFDO1lBQ0YsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBRUQsd0NBQWtCLEdBQWxCLFVBQW1CLElBQXdCO1lBQ3pDLElBQU0saUJBQWlCLEdBQ25CLENBQUMsVUFBQyxPQUFpQyxJQUFLLE9BQUEsVUFBQyxFQUE2QjtvQkFDcEUsSUFBTSxPQUFPLEdBQUcsVUFBQyxJQUFhO3dCQUM1QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRTs0QkFDaEQsSUFBTSxHQUFHLEdBQUcsSUFBMkIsQ0FBQzs0QkFDeEMsa0VBQWtFOzRCQUNsRSxPQUFPLEVBQUUsQ0FBQyxzQkFBc0IsQ0FDNUIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQ25FLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7eUJBQzNEO3dCQUNELE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUNuRCxDQUFDLENBQUM7b0JBQ0YsT0FBTyxPQUFPLENBQUMsRUFBRSxDQUFrQixDQUFDO2dCQUN0QyxDQUFDLEVBWnVDLENBWXZDLENBQUMsQ0FBQztZQUNQLE9BQU8sRUFBQyxpQkFBaUIsbUJBQUEsRUFBQyxDQUFDO1FBQzdCLENBQUM7UUFFRCw4QkFBUSxHQUFSLFVBQVMsVUFBb0IsRUFBRSxZQUE2QjtZQUMxRCxPQUFPLElBQUksMERBQTBCLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDdkYsQ0FBQztRQUVELG9DQUFjLEdBQWQsVUFBZSxTQUFtQjtZQUNoQyxPQUFPO2dCQUNMLFdBQVcsRUFBRSxVQUFDLElBQXFCO29CQUNsQixPQUFBLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDO2dCQUFqRSxDQUFpRTthQUNuRixDQUFDO1FBQ0osQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQXZERCxJQXVEQztJQXZEWSxrQ0FBVyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtQbHVnaW5Db21waWxlckhvc3QsIFRzY1BsdWdpbn0gZnJvbSAnQGJhemVsL3R5cGVzY3JpcHQvdHNjX3dyYXBwZWQvcGx1Z2luX2FwaSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtTeW50aGV0aWNGaWxlc0NvbXBpbGVySG9zdH0gZnJvbSAnLi9zeW50aGV0aWNfZmlsZXNfY29tcGlsZXJfaG9zdCc7XG5cbi8vIENvcGllZCBmcm9tIHRzY193cmFwcGVkL3BsdWdpbl9hcGkudHMgdG8gYXZvaWQgYSBydW50aW1lIGRlcGVuZGVuY3kgb24gdGhhdCBwYWNrYWdlXG5mdW5jdGlvbiBjcmVhdGVQcm94eTxUPihkZWxlZ2F0ZTogVCk6IFQge1xuICBjb25zdCBwcm94eSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGZvciAoY29uc3QgayBvZiBPYmplY3Qua2V5cyhkZWxlZ2F0ZSkpIHtcbiAgICBwcm94eVtrXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gKGRlbGVnYXRlIGFzIGFueSlba10uYXBwbHkoZGVsZWdhdGUsIGFyZ3VtZW50cyk7IH07XG4gIH1cbiAgcmV0dXJuIHByb3h5O1xufVxuXG5leHBvcnQgY2xhc3MgTmdUc2NQbHVnaW4gaW1wbGVtZW50cyBUc2NQbHVnaW4ge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGFuZ3VsYXJDb21waWxlck9wdGlvbnM6IHVua25vd24pIHt9XG5cbiAgd3JhcChwcm9ncmFtOiB0cy5Qcm9ncmFtLCBjb25maWc6IHt9LCBob3N0OiB0cy5Db21waWxlckhvc3QpIHtcbiAgICBjb25zdCBwcm94eSA9IGNyZWF0ZVByb3h5KHByb2dyYW0pO1xuICAgIHByb3h5LmdldFNlbWFudGljRGlhZ25vc3RpY3MgPSAoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0OiB0cy5EaWFnbm9zdGljW10gPSBbLi4ucHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUpXTtcblxuICAgICAgLy8gRm9yIGRlbW8gcHVycG9zZXMsIHRyaWdnZXIgYSBkaWFnbm9zdGljIHdoZW4gdGhlIHNvdXJjZWZpbGUgaGFzIGEgbWFnaWMgc3RyaW5nXG4gICAgICBpZiAoc291cmNlRmlsZS50ZXh0LmluZGV4T2YoJ2RpYWcnKSA+PSAwKSB7XG4gICAgICAgIGNvbnN0IGZha2U6IHRzLkRpYWdub3N0aWMgPSB7XG4gICAgICAgICAgZmlsZTogc291cmNlRmlsZSxcbiAgICAgICAgICBzdGFydDogMCxcbiAgICAgICAgICBsZW5ndGg6IDMsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6ICdFeGFtcGxlIEFuZ3VsYXIgQ29tcGlsZXIgRGlhZ25vc3RpYycsXG4gICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBjb2RlOiAxMjM0NSxcbiAgICAgICAgICAvLyBzb3VyY2UgaXMgdGhlIG5hbWUgb2YgdGhlIHBsdWdpbi5cbiAgICAgICAgICBzb3VyY2U6ICdBbmd1bGFyJyxcbiAgICAgICAgfTtcbiAgICAgICAgcmVzdWx0LnB1c2goZmFrZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gICAgcmV0dXJuIHByb3h5O1xuICB9XG5cbiAgY3JlYXRlVHJhbnNmb3JtZXJzKGhvc3Q6IFBsdWdpbkNvbXBpbGVySG9zdCkge1xuICAgIGNvbnN0IGFmdGVyRGVjbGFyYXRpb25zOiBBcnJheTx0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZXx0cy5CdW5kbGU+PiA9XG4gICAgICAgIFsoY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KSA9PiAoc2Y6IHRzLlNvdXJjZUZpbGUgfCB0cy5CdW5kbGUpID0+IHtcbiAgICAgICAgICBjb25zdCB2aXNpdG9yID0gKG5vZGU6IHRzLk5vZGUpOiB0cy5Ob2RlID0+IHtcbiAgICAgICAgICAgIGlmIChub2RlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgICBjb25zdCBjbHogPSBub2RlIGFzIHRzLkNsYXNzRGVjbGFyYXRpb247XG4gICAgICAgICAgICAgIC8vIEZvciBkZW1vIHB1cnBvc2VzLCB0cmFuc2Zvcm0gdGhlIGNsYXNzIG5hbWUgaW4gdGhlIC5kLnRzIG91dHB1dFxuICAgICAgICAgICAgICByZXR1cm4gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICAgIGNseiwgY2x6LmRlY29yYXRvcnMsIG5vZGUubW9kaWZpZXJzLCB0cy5jcmVhdGVJZGVudGlmaWVyKCdORVdOQU1FJyksXG4gICAgICAgICAgICAgICAgICBjbHoudHlwZVBhcmFtZXRlcnMsIGNsei5oZXJpdGFnZUNsYXVzZXMsIGNsei5tZW1iZXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cy52aXNpdEVhY2hDaGlsZChub2RlLCB2aXNpdG9yLCBjb250ZXh0KTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJldHVybiB2aXNpdG9yKHNmKSBhcyB0cy5Tb3VyY2VGaWxlO1xuICAgICAgICB9XTtcbiAgICByZXR1cm4ge2FmdGVyRGVjbGFyYXRpb25zfTtcbiAgfVxuXG4gIHdyYXBIb3N0KGlucHV0RmlsZXM6IHN0cmluZ1tdLCBjb21waWxlckhvc3Q6IHRzLkNvbXBpbGVySG9zdCkge1xuICAgIHJldHVybiBuZXcgU3ludGhldGljRmlsZXNDb21waWxlckhvc3QoaW5wdXRGaWxlcywgY29tcGlsZXJIb3N0LCB0aGlzLmdlbmVyYXRlZEZpbGVzKTtcbiAgfVxuXG4gIGdlbmVyYXRlZEZpbGVzKHJvb3RGaWxlczogc3RyaW5nW10pIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2ZpbGUtMS50cyc6IChob3N0OiB0cy5Db21waWxlckhvc3QpID0+XG4gICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZVNvdXJjZUZpbGUoJ2ZpbGUtMS50cycsICdjb250ZW50cycsIHRzLlNjcmlwdFRhcmdldC5FUzUpLFxuICAgIH07XG4gIH1cbn1cbiJdfQ==