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
        define("@angular/compiler-cli/src/ngtsc/tsc_plugin", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/synthetic_files_compiler_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const ts = require("typescript");
    const synthetic_files_compiler_host_1 = require("@angular/compiler-cli/src/ngtsc/synthetic_files_compiler_host");
    // Copied from tsc_wrapped/plugin_api.ts to avoid a runtime dependency on the
    // @bazel/typescript package - it would be strange for non-Bazel users of
    // Angular to fetch that package.
    function createProxy(delegate) {
        const proxy = Object.create(null);
        for (const k of Object.keys(delegate)) {
            proxy[k] = function () { return delegate[k].apply(delegate, arguments); };
        }
        return proxy;
    }
    class NgTscPlugin {
        constructor(angularCompilerOptions) {
            this.angularCompilerOptions = angularCompilerOptions;
        }
        wrapHost(inputFiles, compilerHost) {
            return new synthetic_files_compiler_host_1.SyntheticFilesCompilerHost(inputFiles, compilerHost, (rootFiles) => {
                // For demo purposes, assume that the first .ts rootFile is the only
                // one that needs ngfactory.js/d.ts back-compat files produced.
                const tsInputs = rootFiles.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
                const factoryPath = tsInputs[0].replace(/\.ts/, '.ngfactory.ts');
                return {
                    factoryPath: (host) => ts.createSourceFile(factoryPath, 'contents', ts.ScriptTarget.ES5),
                };
            });
        }
        wrap(program, config, host) {
            const proxy = createProxy(program);
            proxy.getSemanticDiagnostics = (sourceFile) => {
                const result = [...program.getSemanticDiagnostics(sourceFile)];
                // For demo purposes, trigger a diagnostic when the sourcefile has a magic string
                if (sourceFile.text.indexOf('diag') >= 0) {
                    const fake = {
                        file: sourceFile,
                        start: 0,
                        length: 3,
                        messageText: 'Example Angular Compiler Diagnostic',
                        category: ts.DiagnosticCategory.Error,
                        code: 12345,
                        // source is the name of the plugin.
                        source: 'ngtsc',
                    };
                    result.push(fake);
                }
                return result;
            };
            return proxy;
        }
        createTransformers(host) {
            const afterDeclarations = [(context) => (sf) => {
                    const visitor = (node) => {
                        if (node.kind === ts.SyntaxKind.ClassDeclaration) {
                            const clz = node;
                            // For demo purposes, transform the class name in the .d.ts output
                            return ts.updateClassDeclaration(clz, clz.decorators, node.modifiers, ts.createIdentifier('NEWNAME'), clz.typeParameters, clz.heritageClauses, clz.members);
                        }
                        return ts.visitEachChild(node, visitor, context);
                    };
                    return visitor(sf);
                }];
            return { afterDeclarations };
        }
    }
    exports.NgTscPlugin = NgTscPlugin;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjX3BsdWdpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHNjX3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUdILGlDQUFpQztJQUVqQyxpSEFBMkU7SUFFM0UsNkVBQTZFO0lBQzdFLHlFQUF5RTtJQUN6RSxpQ0FBaUM7SUFDakMsU0FBUyxXQUFXLENBQUksUUFBVztRQUNqQyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNyQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsY0FBYSxPQUFRLFFBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELE1BQWEsV0FBVztRQUN0QixZQUFvQixzQkFBK0I7WUFBL0IsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFTO1FBQUcsQ0FBQztRQUV2RCxRQUFRLENBQUMsVUFBb0IsRUFBRSxZQUE2QjtZQUMxRCxPQUFPLElBQUksMERBQTBCLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxDQUFDLFNBQW1CLEVBQUUsRUFBRTtnQkFDdEYsb0VBQW9FO2dCQUNwRSwrREFBK0Q7Z0JBQy9ELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNsRixNQUFNLFdBQVcsR0FBVyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQztnQkFFekUsT0FBTztvQkFDTCxXQUFXLEVBQUUsQ0FBQyxJQUFxQixFQUFFLEVBQUUsQ0FDdEIsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUM7aUJBQ25GLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBbUIsRUFBRSxNQUFVLEVBQUUsSUFBcUI7WUFDekQsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25DLEtBQUssQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLFVBQXlCLEVBQUUsRUFBRTtnQkFDM0QsTUFBTSxNQUFNLEdBQW9CLENBQUMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFFaEYsaUZBQWlGO2dCQUNqRixJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDeEMsTUFBTSxJQUFJLEdBQWtCO3dCQUMxQixJQUFJLEVBQUUsVUFBVTt3QkFDaEIsS0FBSyxFQUFFLENBQUM7d0JBQ1IsTUFBTSxFQUFFLENBQUM7d0JBQ1QsV0FBVyxFQUFFLHFDQUFxQzt3QkFDbEQsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO3dCQUNyQyxJQUFJLEVBQUUsS0FBSzt3QkFDWCxvQ0FBb0M7d0JBQ3BDLE1BQU0sRUFBRSxPQUFPO3FCQUNoQixDQUFDO29CQUNGLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ25CO2dCQUNELE9BQU8sTUFBTSxDQUFDO1lBQ2hCLENBQUMsQ0FBQztZQUNGLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELGtCQUFrQixDQUFDLElBQXdCO1lBQ3pDLE1BQU0saUJBQWlCLEdBQ25CLENBQUMsQ0FBQyxPQUFpQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQTZCLEVBQUUsRUFBRTtvQkFDeEUsTUFBTSxPQUFPLEdBQUcsQ0FBQyxJQUFhLEVBQVcsRUFBRTt3QkFDekMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUU7NEJBQ2hELE1BQU0sR0FBRyxHQUFHLElBQTJCLENBQUM7NEJBQ3hDLGtFQUFrRTs0QkFDbEUsT0FBTyxFQUFFLENBQUMsc0JBQXNCLENBQzVCLEdBQUcsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxFQUNuRSxHQUFHLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO3lCQUMzRDt3QkFDRCxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDbkQsQ0FBQyxDQUFDO29CQUNGLE9BQU8sT0FBTyxDQUFDLEVBQUUsQ0FBa0IsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLENBQUM7WUFDUCxPQUFPLEVBQUMsaUJBQWlCLEVBQUMsQ0FBQztRQUM3QixDQUFDO0tBQ0Y7SUExREQsa0NBMERDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1BsdWdpbkNvbXBpbGVySG9zdCwgVHNjUGx1Z2lufSBmcm9tICdAYmF6ZWwvdHlwZXNjcmlwdC9pbnRlcm5hbC90c2Nfd3JhcHBlZC9wbHVnaW5fYXBpJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1N5bnRoZXRpY0ZpbGVzQ29tcGlsZXJIb3N0fSBmcm9tICcuL3N5bnRoZXRpY19maWxlc19jb21waWxlcl9ob3N0JztcblxuLy8gQ29waWVkIGZyb20gdHNjX3dyYXBwZWQvcGx1Z2luX2FwaS50cyB0byBhdm9pZCBhIHJ1bnRpbWUgZGVwZW5kZW5jeSBvbiB0aGVcbi8vIEBiYXplbC90eXBlc2NyaXB0IHBhY2thZ2UgLSBpdCB3b3VsZCBiZSBzdHJhbmdlIGZvciBub24tQmF6ZWwgdXNlcnMgb2Zcbi8vIEFuZ3VsYXIgdG8gZmV0Y2ggdGhhdCBwYWNrYWdlLlxuZnVuY3Rpb24gY3JlYXRlUHJveHk8VD4oZGVsZWdhdGU6IFQpOiBUIHtcbiAgY29uc3QgcHJveHkgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBmb3IgKGNvbnN0IGsgb2YgT2JqZWN0LmtleXMoZGVsZWdhdGUpKSB7XG4gICAgcHJveHlba10gPSBmdW5jdGlvbigpIHsgcmV0dXJuIChkZWxlZ2F0ZSBhcyBhbnkpW2tdLmFwcGx5KGRlbGVnYXRlLCBhcmd1bWVudHMpOyB9O1xuICB9XG4gIHJldHVybiBwcm94eTtcbn1cblxuZXhwb3J0IGNsYXNzIE5nVHNjUGx1Z2luIGltcGxlbWVudHMgVHNjUGx1Z2luIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBhbmd1bGFyQ29tcGlsZXJPcHRpb25zOiB1bmtub3duKSB7fVxuXG4gIHdyYXBIb3N0KGlucHV0RmlsZXM6IHN0cmluZ1tdLCBjb21waWxlckhvc3Q6IHRzLkNvbXBpbGVySG9zdCkge1xuICAgIHJldHVybiBuZXcgU3ludGhldGljRmlsZXNDb21waWxlckhvc3QoaW5wdXRGaWxlcywgY29tcGlsZXJIb3N0LCAocm9vdEZpbGVzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgLy8gRm9yIGRlbW8gcHVycG9zZXMsIGFzc3VtZSB0aGF0IHRoZSBmaXJzdCAudHMgcm9vdEZpbGUgaXMgdGhlIG9ubHlcbiAgICAgIC8vIG9uZSB0aGF0IG5lZWRzIG5nZmFjdG9yeS5qcy9kLnRzIGJhY2stY29tcGF0IGZpbGVzIHByb2R1Y2VkLlxuICAgICAgY29uc3QgdHNJbnB1dHMgPSByb290RmlsZXMuZmlsdGVyKGYgPT4gZi5lbmRzV2l0aCgnLnRzJykgJiYgIWYuZW5kc1dpdGgoJy5kLnRzJykpO1xuICAgICAgY29uc3QgZmFjdG9yeVBhdGg6IHN0cmluZyA9IHRzSW5wdXRzWzBdLnJlcGxhY2UoL1xcLnRzLywgJy5uZ2ZhY3RvcnkudHMnKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZmFjdG9yeVBhdGg6IChob3N0OiB0cy5Db21waWxlckhvc3QpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlU291cmNlRmlsZShmYWN0b3J5UGF0aCwgJ2NvbnRlbnRzJywgdHMuU2NyaXB0VGFyZ2V0LkVTNSksXG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgd3JhcChwcm9ncmFtOiB0cy5Qcm9ncmFtLCBjb25maWc6IHt9LCBob3N0OiB0cy5Db21waWxlckhvc3QpIHtcbiAgICBjb25zdCBwcm94eSA9IGNyZWF0ZVByb3h5KHByb2dyYW0pO1xuICAgIHByb3h5LmdldFNlbWFudGljRGlhZ25vc3RpY3MgPSAoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0OiB0cy5EaWFnbm9zdGljW10gPSBbLi4ucHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUpXTtcblxuICAgICAgLy8gRm9yIGRlbW8gcHVycG9zZXMsIHRyaWdnZXIgYSBkaWFnbm9zdGljIHdoZW4gdGhlIHNvdXJjZWZpbGUgaGFzIGEgbWFnaWMgc3RyaW5nXG4gICAgICBpZiAoc291cmNlRmlsZS50ZXh0LmluZGV4T2YoJ2RpYWcnKSA+PSAwKSB7XG4gICAgICAgIGNvbnN0IGZha2U6IHRzLkRpYWdub3N0aWMgPSB7XG4gICAgICAgICAgZmlsZTogc291cmNlRmlsZSxcbiAgICAgICAgICBzdGFydDogMCxcbiAgICAgICAgICBsZW5ndGg6IDMsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6ICdFeGFtcGxlIEFuZ3VsYXIgQ29tcGlsZXIgRGlhZ25vc3RpYycsXG4gICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBjb2RlOiAxMjM0NSxcbiAgICAgICAgICAvLyBzb3VyY2UgaXMgdGhlIG5hbWUgb2YgdGhlIHBsdWdpbi5cbiAgICAgICAgICBzb3VyY2U6ICduZ3RzYycsXG4gICAgICAgIH07XG4gICAgICAgIHJlc3VsdC5wdXNoKGZha2UpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICAgIHJldHVybiBwcm94eTtcbiAgfVxuXG4gIGNyZWF0ZVRyYW5zZm9ybWVycyhob3N0OiBQbHVnaW5Db21waWxlckhvc3QpIHtcbiAgICBjb25zdCBhZnRlckRlY2xhcmF0aW9uczogQXJyYXk8dHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGV8dHMuQnVuZGxlPj4gPVxuICAgICAgICBbKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT4gKHNmOiB0cy5Tb3VyY2VGaWxlIHwgdHMuQnVuZGxlKSA9PiB7XG4gICAgICAgICAgY29uc3QgdmlzaXRvciA9IChub2RlOiB0cy5Ob2RlKTogdHMuTm9kZSA9PiB7XG4gICAgICAgICAgICBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgICAgY29uc3QgY2x6ID0gbm9kZSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgICAgICAgICAvLyBGb3IgZGVtbyBwdXJwb3NlcywgdHJhbnNmb3JtIHRoZSBjbGFzcyBuYW1lIGluIHRoZSAuZC50cyBvdXRwdXRcbiAgICAgICAgICAgICAgcmV0dXJuIHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgICBjbHosIGNsei5kZWNvcmF0b3JzLCBub2RlLm1vZGlmaWVycywgdHMuY3JlYXRlSWRlbnRpZmllcignTkVXTkFNRScpLFxuICAgICAgICAgICAgICAgICAgY2x6LnR5cGVQYXJhbWV0ZXJzLCBjbHouaGVyaXRhZ2VDbGF1c2VzLCBjbHoubWVtYmVycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgdmlzaXRvciwgY29udGV4dCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXR1cm4gdmlzaXRvcihzZikgYXMgdHMuU291cmNlRmlsZTtcbiAgICAgICAgfV07XG4gICAgcmV0dXJuIHthZnRlckRlY2xhcmF0aW9uc307XG4gIH1cbn1cbiJdfQ==