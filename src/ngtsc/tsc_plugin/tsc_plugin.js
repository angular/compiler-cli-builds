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
        define("@angular/compiler-cli/src/ngtsc/tsc_plugin/tsc_plugin", ["require", "exports", "tslib", "@bazel/typescript", "typescript", "@angular/compiler-cli/src/ngtsc/tsc_plugin/synthetic_files_compiler_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var typescript_1 = require("@bazel/typescript");
    var ts = require("typescript");
    var synthetic_files_compiler_host_1 = require("@angular/compiler-cli/src/ngtsc/tsc_plugin/synthetic_files_compiler_host");
    var NgTscPlugin = /** @class */ (function () {
        function NgTscPlugin(angularCompilerOptions) {
            this.angularCompilerOptions = angularCompilerOptions;
        }
        NgTscPlugin.prototype.wrap = function (program, config, host) {
            var proxy = typescript_1.createProxy(program);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjX3BsdWdpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHNjX3BsdWdpbi90c2NfcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILGdEQUE2RTtJQUM3RSwrQkFBaUM7SUFFakMsMEhBQTJFO0lBRTNFO1FBQ0UscUJBQW9CLHNCQUErQjtZQUEvQiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQVM7UUFBRyxDQUFDO1FBRXZELDBCQUFJLEdBQUosVUFBSyxPQUFtQixFQUFFLE1BQVUsRUFBRSxJQUFxQjtZQUN6RCxJQUFNLEtBQUssR0FBRyx3QkFBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25DLEtBQUssQ0FBQyxzQkFBc0IsR0FBRyxVQUFDLFVBQXlCO2dCQUN2RCxJQUFNLE1BQU0sb0JBQXdCLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUVoRixpRkFBaUY7Z0JBQ2pGLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUN4QyxJQUFNLElBQUksR0FBa0I7d0JBQzFCLElBQUksRUFBRSxVQUFVO3dCQUNoQixLQUFLLEVBQUUsQ0FBQzt3QkFDUixNQUFNLEVBQUUsQ0FBQzt3QkFDVCxXQUFXLEVBQUUscUNBQXFDO3dCQUNsRCxRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUs7d0JBQ3JDLElBQUksRUFBRSxLQUFLO3dCQUNYLG9DQUFvQzt3QkFDcEMsTUFBTSxFQUFFLFNBQVM7cUJBQ2xCLENBQUM7b0JBQ0YsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDbkI7Z0JBQ0QsT0FBTyxNQUFNLENBQUM7WUFDaEIsQ0FBQyxDQUFDO1lBQ0YsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBRUQsd0NBQWtCLEdBQWxCLFVBQW1CLElBQXdCO1lBQ3pDLElBQU0saUJBQWlCLEdBQ25CLENBQUMsVUFBQyxPQUFpQyxJQUFLLE9BQUEsVUFBQyxFQUE2QjtvQkFDcEUsSUFBTSxPQUFPLEdBQUcsVUFBQyxJQUFhO3dCQUM1QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRTs0QkFDaEQsSUFBTSxHQUFHLEdBQUcsSUFBMkIsQ0FBQzs0QkFDeEMsa0VBQWtFOzRCQUNsRSxPQUFPLEVBQUUsQ0FBQyxzQkFBc0IsQ0FDNUIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQ25FLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7eUJBQzNEO3dCQUNELE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUNuRCxDQUFDLENBQUM7b0JBQ0YsT0FBTyxPQUFPLENBQUMsRUFBRSxDQUFrQixDQUFDO2dCQUN0QyxDQUFDLEVBWnVDLENBWXZDLENBQUMsQ0FBQztZQUNQLE9BQU8sRUFBQyxpQkFBaUIsbUJBQUEsRUFBQyxDQUFDO1FBQzdCLENBQUM7UUFFRCw4QkFBUSxHQUFSLFVBQVMsVUFBb0IsRUFBRSxZQUE2QjtZQUMxRCxPQUFPLElBQUksMERBQTBCLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDdkYsQ0FBQztRQUVELG9DQUFjLEdBQWQsVUFBZSxTQUFtQjtZQUNoQyxPQUFPO2dCQUNMLFdBQVcsRUFBRSxVQUFDLElBQXFCO29CQUNsQixPQUFBLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDO2dCQUFqRSxDQUFpRTthQUNuRixDQUFDO1FBQ0osQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQXZERCxJQXVEQztJQXZEWSxrQ0FBVyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtQbHVnaW5Db21waWxlckhvc3QsIFRzY1BsdWdpbiwgY3JlYXRlUHJveHl9IGZyb20gJ0BiYXplbC90eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1N5bnRoZXRpY0ZpbGVzQ29tcGlsZXJIb3N0fSBmcm9tICcuL3N5bnRoZXRpY19maWxlc19jb21waWxlcl9ob3N0JztcblxuZXhwb3J0IGNsYXNzIE5nVHNjUGx1Z2luIGltcGxlbWVudHMgVHNjUGx1Z2luIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBhbmd1bGFyQ29tcGlsZXJPcHRpb25zOiB1bmtub3duKSB7fVxuXG4gIHdyYXAocHJvZ3JhbTogdHMuUHJvZ3JhbSwgY29uZmlnOiB7fSwgaG9zdDogdHMuQ29tcGlsZXJIb3N0KSB7XG4gICAgY29uc3QgcHJveHkgPSBjcmVhdGVQcm94eShwcm9ncmFtKTtcbiAgICBwcm94eS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzID0gKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdDogdHMuRGlhZ25vc3RpY1tdID0gWy4uLnByb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlKV07XG5cbiAgICAgIC8vIEZvciBkZW1vIHB1cnBvc2VzLCB0cmlnZ2VyIGEgZGlhZ25vc3RpYyB3aGVuIHRoZSBzb3VyY2VmaWxlIGhhcyBhIG1hZ2ljIHN0cmluZ1xuICAgICAgaWYgKHNvdXJjZUZpbGUudGV4dC5pbmRleE9mKCdkaWFnJykgPj0gMCkge1xuICAgICAgICBjb25zdCBmYWtlOiB0cy5EaWFnbm9zdGljID0ge1xuICAgICAgICAgIGZpbGU6IHNvdXJjZUZpbGUsXG4gICAgICAgICAgc3RhcnQ6IDAsXG4gICAgICAgICAgbGVuZ3RoOiAzLFxuICAgICAgICAgIG1lc3NhZ2VUZXh0OiAnRXhhbXBsZSBBbmd1bGFyIENvbXBpbGVyIERpYWdub3N0aWMnLFxuICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgY29kZTogMTIzNDUsXG4gICAgICAgICAgLy8gc291cmNlIGlzIHRoZSBuYW1lIG9mIHRoZSBwbHVnaW4uXG4gICAgICAgICAgc291cmNlOiAnQW5ndWxhcicsXG4gICAgICAgIH07XG4gICAgICAgIHJlc3VsdC5wdXNoKGZha2UpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICAgIHJldHVybiBwcm94eTtcbiAgfVxuXG4gIGNyZWF0ZVRyYW5zZm9ybWVycyhob3N0OiBQbHVnaW5Db21waWxlckhvc3QpIHtcbiAgICBjb25zdCBhZnRlckRlY2xhcmF0aW9uczogQXJyYXk8dHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGV8dHMuQnVuZGxlPj4gPVxuICAgICAgICBbKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT4gKHNmOiB0cy5Tb3VyY2VGaWxlIHwgdHMuQnVuZGxlKSA9PiB7XG4gICAgICAgICAgY29uc3QgdmlzaXRvciA9IChub2RlOiB0cy5Ob2RlKTogdHMuTm9kZSA9PiB7XG4gICAgICAgICAgICBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgICAgY29uc3QgY2x6ID0gbm9kZSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgICAgICAgICAvLyBGb3IgZGVtbyBwdXJwb3NlcywgdHJhbnNmb3JtIHRoZSBjbGFzcyBuYW1lIGluIHRoZSAuZC50cyBvdXRwdXRcbiAgICAgICAgICAgICAgcmV0dXJuIHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgICBjbHosIGNsei5kZWNvcmF0b3JzLCBub2RlLm1vZGlmaWVycywgdHMuY3JlYXRlSWRlbnRpZmllcignTkVXTkFNRScpLFxuICAgICAgICAgICAgICAgICAgY2x6LnR5cGVQYXJhbWV0ZXJzLCBjbHouaGVyaXRhZ2VDbGF1c2VzLCBjbHoubWVtYmVycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgdmlzaXRvciwgY29udGV4dCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXR1cm4gdmlzaXRvcihzZikgYXMgdHMuU291cmNlRmlsZTtcbiAgICAgICAgfV07XG4gICAgcmV0dXJuIHthZnRlckRlY2xhcmF0aW9uc307XG4gIH1cblxuICB3cmFwSG9zdChpbnB1dEZpbGVzOiBzdHJpbmdbXSwgY29tcGlsZXJIb3N0OiB0cy5Db21waWxlckhvc3QpIHtcbiAgICByZXR1cm4gbmV3IFN5bnRoZXRpY0ZpbGVzQ29tcGlsZXJIb3N0KGlucHV0RmlsZXMsIGNvbXBpbGVySG9zdCwgdGhpcy5nZW5lcmF0ZWRGaWxlcyk7XG4gIH1cblxuICBnZW5lcmF0ZWRGaWxlcyhyb290RmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdmaWxlLTEudHMnOiAoaG9zdDogdHMuQ29tcGlsZXJIb3N0KSA9PlxuICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKCdmaWxlLTEudHMnLCAnY29udGVudHMnLCB0cy5TY3JpcHRUYXJnZXQuRVM1KSxcbiAgICB9O1xuICB9XG59XG4iXX0=