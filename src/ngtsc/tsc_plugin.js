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
        define("@angular/compiler-cli/src/ngtsc/tsc_plugin", ["require", "exports", "tslib", "@bazel/typescript/tsc_wrapped/plugin_api", "typescript", "@angular/compiler-cli/src/ngtsc/synthetic_files_compiler_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var plugin_api_1 = require("@bazel/typescript/tsc_wrapped/plugin_api");
    var ts = require("typescript");
    var synthetic_files_compiler_host_1 = require("@angular/compiler-cli/src/ngtsc/synthetic_files_compiler_host");
    var NgTscPlugin = /** @class */ (function () {
        function NgTscPlugin(angularCompilerOptions) {
            this.angularCompilerOptions = angularCompilerOptions;
        }
        NgTscPlugin.prototype.wrap = function (program, config, host) {
            var proxy = plugin_api_1.createProxy(program);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjX3BsdWdpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHNjX3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCx1RUFBb0c7SUFDcEcsK0JBQWlDO0lBRWpDLCtHQUEyRTtJQUUzRTtRQUNFLHFCQUFvQixzQkFBK0I7WUFBL0IsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFTO1FBQUcsQ0FBQztRQUV2RCwwQkFBSSxHQUFKLFVBQUssT0FBbUIsRUFBRSxNQUFVLEVBQUUsSUFBcUI7WUFDekQsSUFBTSxLQUFLLEdBQUcsd0JBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQyxLQUFLLENBQUMsc0JBQXNCLEdBQUcsVUFBQyxVQUF5QjtnQkFDdkQsSUFBTSxNQUFNLG9CQUF3QixPQUFPLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFFaEYsaUZBQWlGO2dCQUNqRixJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDeEMsSUFBTSxJQUFJLEdBQWtCO3dCQUMxQixJQUFJLEVBQUUsVUFBVTt3QkFDaEIsS0FBSyxFQUFFLENBQUM7d0JBQ1IsTUFBTSxFQUFFLENBQUM7d0JBQ1QsV0FBVyxFQUFFLHFDQUFxQzt3QkFDbEQsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO3dCQUNyQyxJQUFJLEVBQUUsS0FBSzt3QkFDWCxvQ0FBb0M7d0JBQ3BDLE1BQU0sRUFBRSxTQUFTO3FCQUNsQixDQUFDO29CQUNGLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ25CO2dCQUNELE9BQU8sTUFBTSxDQUFDO1lBQ2hCLENBQUMsQ0FBQztZQUNGLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELHdDQUFrQixHQUFsQixVQUFtQixJQUF3QjtZQUN6QyxJQUFNLGlCQUFpQixHQUNuQixDQUFDLFVBQUMsT0FBaUMsSUFBSyxPQUFBLFVBQUMsRUFBNkI7b0JBQ3BFLElBQU0sT0FBTyxHQUFHLFVBQUMsSUFBYTt3QkFDNUIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUU7NEJBQ2hELElBQU0sR0FBRyxHQUFHLElBQTJCLENBQUM7NEJBQ3hDLGtFQUFrRTs0QkFDbEUsT0FBTyxFQUFFLENBQUMsc0JBQXNCLENBQzVCLEdBQUcsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxFQUNuRSxHQUFHLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO3lCQUMzRDt3QkFDRCxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDbkQsQ0FBQyxDQUFDO29CQUNGLE9BQU8sT0FBTyxDQUFDLEVBQUUsQ0FBa0IsQ0FBQztnQkFDdEMsQ0FBQyxFQVp1QyxDQVl2QyxDQUFDLENBQUM7WUFDUCxPQUFPLEVBQUMsaUJBQWlCLG1CQUFBLEVBQUMsQ0FBQztRQUM3QixDQUFDO1FBRUQsOEJBQVEsR0FBUixVQUFTLFVBQW9CLEVBQUUsWUFBNkI7WUFDMUQsT0FBTyxJQUFJLDBEQUEwQixDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7UUFFRCxvQ0FBYyxHQUFkLFVBQWUsU0FBbUI7WUFDaEMsT0FBTztnQkFDTCxXQUFXLEVBQUUsVUFBQyxJQUFxQjtvQkFDbEIsT0FBQSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQztnQkFBakUsQ0FBaUU7YUFDbkYsQ0FBQztRQUNKLENBQUM7UUFDSCxrQkFBQztJQUFELENBQUMsQUF2REQsSUF1REM7SUF2RFksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UGx1Z2luQ29tcGlsZXJIb3N0LCBUc2NQbHVnaW4sIGNyZWF0ZVByb3h5fSBmcm9tICdAYmF6ZWwvdHlwZXNjcmlwdC90c2Nfd3JhcHBlZC9wbHVnaW5fYXBpJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1N5bnRoZXRpY0ZpbGVzQ29tcGlsZXJIb3N0fSBmcm9tICcuL3N5bnRoZXRpY19maWxlc19jb21waWxlcl9ob3N0JztcblxuZXhwb3J0IGNsYXNzIE5nVHNjUGx1Z2luIGltcGxlbWVudHMgVHNjUGx1Z2luIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBhbmd1bGFyQ29tcGlsZXJPcHRpb25zOiB1bmtub3duKSB7fVxuXG4gIHdyYXAocHJvZ3JhbTogdHMuUHJvZ3JhbSwgY29uZmlnOiB7fSwgaG9zdDogdHMuQ29tcGlsZXJIb3N0KSB7XG4gICAgY29uc3QgcHJveHkgPSBjcmVhdGVQcm94eShwcm9ncmFtKTtcbiAgICBwcm94eS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzID0gKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdDogdHMuRGlhZ25vc3RpY1tdID0gWy4uLnByb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlKV07XG5cbiAgICAgIC8vIEZvciBkZW1vIHB1cnBvc2VzLCB0cmlnZ2VyIGEgZGlhZ25vc3RpYyB3aGVuIHRoZSBzb3VyY2VmaWxlIGhhcyBhIG1hZ2ljIHN0cmluZ1xuICAgICAgaWYgKHNvdXJjZUZpbGUudGV4dC5pbmRleE9mKCdkaWFnJykgPj0gMCkge1xuICAgICAgICBjb25zdCBmYWtlOiB0cy5EaWFnbm9zdGljID0ge1xuICAgICAgICAgIGZpbGU6IHNvdXJjZUZpbGUsXG4gICAgICAgICAgc3RhcnQ6IDAsXG4gICAgICAgICAgbGVuZ3RoOiAzLFxuICAgICAgICAgIG1lc3NhZ2VUZXh0OiAnRXhhbXBsZSBBbmd1bGFyIENvbXBpbGVyIERpYWdub3N0aWMnLFxuICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgY29kZTogMTIzNDUsXG4gICAgICAgICAgLy8gc291cmNlIGlzIHRoZSBuYW1lIG9mIHRoZSBwbHVnaW4uXG4gICAgICAgICAgc291cmNlOiAnQW5ndWxhcicsXG4gICAgICAgIH07XG4gICAgICAgIHJlc3VsdC5wdXNoKGZha2UpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICAgIHJldHVybiBwcm94eTtcbiAgfVxuXG4gIGNyZWF0ZVRyYW5zZm9ybWVycyhob3N0OiBQbHVnaW5Db21waWxlckhvc3QpIHtcbiAgICBjb25zdCBhZnRlckRlY2xhcmF0aW9uczogQXJyYXk8dHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGV8dHMuQnVuZGxlPj4gPVxuICAgICAgICBbKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT4gKHNmOiB0cy5Tb3VyY2VGaWxlIHwgdHMuQnVuZGxlKSA9PiB7XG4gICAgICAgICAgY29uc3QgdmlzaXRvciA9IChub2RlOiB0cy5Ob2RlKTogdHMuTm9kZSA9PiB7XG4gICAgICAgICAgICBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgICAgY29uc3QgY2x6ID0gbm9kZSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgICAgICAgICAvLyBGb3IgZGVtbyBwdXJwb3NlcywgdHJhbnNmb3JtIHRoZSBjbGFzcyBuYW1lIGluIHRoZSAuZC50cyBvdXRwdXRcbiAgICAgICAgICAgICAgcmV0dXJuIHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgICBjbHosIGNsei5kZWNvcmF0b3JzLCBub2RlLm1vZGlmaWVycywgdHMuY3JlYXRlSWRlbnRpZmllcignTkVXTkFNRScpLFxuICAgICAgICAgICAgICAgICAgY2x6LnR5cGVQYXJhbWV0ZXJzLCBjbHouaGVyaXRhZ2VDbGF1c2VzLCBjbHoubWVtYmVycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgdmlzaXRvciwgY29udGV4dCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXR1cm4gdmlzaXRvcihzZikgYXMgdHMuU291cmNlRmlsZTtcbiAgICAgICAgfV07XG4gICAgcmV0dXJuIHthZnRlckRlY2xhcmF0aW9uc307XG4gIH1cblxuICB3cmFwSG9zdChpbnB1dEZpbGVzOiBzdHJpbmdbXSwgY29tcGlsZXJIb3N0OiB0cy5Db21waWxlckhvc3QpIHtcbiAgICByZXR1cm4gbmV3IFN5bnRoZXRpY0ZpbGVzQ29tcGlsZXJIb3N0KGlucHV0RmlsZXMsIGNvbXBpbGVySG9zdCwgdGhpcy5nZW5lcmF0ZWRGaWxlcyk7XG4gIH1cblxuICBnZW5lcmF0ZWRGaWxlcyhyb290RmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdmaWxlLTEudHMnOiAoaG9zdDogdHMuQ29tcGlsZXJIb3N0KSA9PlxuICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKCdmaWxlLTEudHMnLCAnY29udGVudHMnLCB0cy5TY3JpcHRUYXJnZXQuRVM1KSxcbiAgICB9O1xuICB9XG59XG4iXX0=