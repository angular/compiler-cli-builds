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
        define("@angular/compiler-cli/src/ngtsc/tsc_plugin", ["require", "exports", "tslib", "@bazel/typescript", "typescript", "@angular/compiler-cli/src/ngtsc/synthetic_files_compiler_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var typescript_1 = require("@bazel/typescript");
    var ts = require("typescript");
    var synthetic_files_compiler_host_1 = require("@angular/compiler-cli/src/ngtsc/synthetic_files_compiler_host");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjX3BsdWdpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHNjX3BsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxnREFBNkU7SUFDN0UsK0JBQWlDO0lBRWpDLCtHQUEyRTtJQUUzRTtRQUNFLHFCQUFvQixzQkFBK0I7WUFBL0IsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFTO1FBQUcsQ0FBQztRQUV2RCwwQkFBSSxHQUFKLFVBQUssT0FBbUIsRUFBRSxNQUFVLEVBQUUsSUFBcUI7WUFDekQsSUFBTSxLQUFLLEdBQUcsd0JBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQyxLQUFLLENBQUMsc0JBQXNCLEdBQUcsVUFBQyxVQUF5QjtnQkFDdkQsSUFBTSxNQUFNLG9CQUF3QixPQUFPLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFFaEYsaUZBQWlGO2dCQUNqRixJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDeEMsSUFBTSxJQUFJLEdBQWtCO3dCQUMxQixJQUFJLEVBQUUsVUFBVTt3QkFDaEIsS0FBSyxFQUFFLENBQUM7d0JBQ1IsTUFBTSxFQUFFLENBQUM7d0JBQ1QsV0FBVyxFQUFFLHFDQUFxQzt3QkFDbEQsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO3dCQUNyQyxJQUFJLEVBQUUsS0FBSzt3QkFDWCxvQ0FBb0M7d0JBQ3BDLE1BQU0sRUFBRSxTQUFTO3FCQUNsQixDQUFDO29CQUNGLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ25CO2dCQUNELE9BQU8sTUFBTSxDQUFDO1lBQ2hCLENBQUMsQ0FBQztZQUNGLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELHdDQUFrQixHQUFsQixVQUFtQixJQUF3QjtZQUN6QyxJQUFNLGlCQUFpQixHQUNuQixDQUFDLFVBQUMsT0FBaUMsSUFBSyxPQUFBLFVBQUMsRUFBNkI7b0JBQ3BFLElBQU0sT0FBTyxHQUFHLFVBQUMsSUFBYTt3QkFDNUIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUU7NEJBQ2hELElBQU0sR0FBRyxHQUFHLElBQTJCLENBQUM7NEJBQ3hDLGtFQUFrRTs0QkFDbEUsT0FBTyxFQUFFLENBQUMsc0JBQXNCLENBQzVCLEdBQUcsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxFQUNuRSxHQUFHLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO3lCQUMzRDt3QkFDRCxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDbkQsQ0FBQyxDQUFDO29CQUNGLE9BQU8sT0FBTyxDQUFDLEVBQUUsQ0FBa0IsQ0FBQztnQkFDdEMsQ0FBQyxFQVp1QyxDQVl2QyxDQUFDLENBQUM7WUFDUCxPQUFPLEVBQUMsaUJBQWlCLG1CQUFBLEVBQUMsQ0FBQztRQUM3QixDQUFDO1FBRUQsOEJBQVEsR0FBUixVQUFTLFVBQW9CLEVBQUUsWUFBNkI7WUFDMUQsT0FBTyxJQUFJLDBEQUEwQixDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7UUFFRCxvQ0FBYyxHQUFkLFVBQWUsU0FBbUI7WUFDaEMsT0FBTztnQkFDTCxXQUFXLEVBQUUsVUFBQyxJQUFxQjtvQkFDbEIsT0FBQSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQztnQkFBakUsQ0FBaUU7YUFDbkYsQ0FBQztRQUNKLENBQUM7UUFDSCxrQkFBQztJQUFELENBQUMsQUF2REQsSUF1REM7SUF2RFksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UGx1Z2luQ29tcGlsZXJIb3N0LCBUc2NQbHVnaW4sIGNyZWF0ZVByb3h5fSBmcm9tICdAYmF6ZWwvdHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtTeW50aGV0aWNGaWxlc0NvbXBpbGVySG9zdH0gZnJvbSAnLi9zeW50aGV0aWNfZmlsZXNfY29tcGlsZXJfaG9zdCc7XG5cbmV4cG9ydCBjbGFzcyBOZ1RzY1BsdWdpbiBpbXBsZW1lbnRzIFRzY1BsdWdpbiB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgYW5ndWxhckNvbXBpbGVyT3B0aW9uczogdW5rbm93bikge31cblxuICB3cmFwKHByb2dyYW06IHRzLlByb2dyYW0sIGNvbmZpZzoge30sIGhvc3Q6IHRzLkNvbXBpbGVySG9zdCkge1xuICAgIGNvbnN0IHByb3h5ID0gY3JlYXRlUHJveHkocHJvZ3JhbSk7XG4gICAgcHJveHkuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyA9IChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQ6IHRzLkRpYWdub3N0aWNbXSA9IFsuLi5wcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSldO1xuXG4gICAgICAvLyBGb3IgZGVtbyBwdXJwb3NlcywgdHJpZ2dlciBhIGRpYWdub3N0aWMgd2hlbiB0aGUgc291cmNlZmlsZSBoYXMgYSBtYWdpYyBzdHJpbmdcbiAgICAgIGlmIChzb3VyY2VGaWxlLnRleHQuaW5kZXhPZignZGlhZycpID49IDApIHtcbiAgICAgICAgY29uc3QgZmFrZTogdHMuRGlhZ25vc3RpYyA9IHtcbiAgICAgICAgICBmaWxlOiBzb3VyY2VGaWxlLFxuICAgICAgICAgIHN0YXJ0OiAwLFxuICAgICAgICAgIGxlbmd0aDogMyxcbiAgICAgICAgICBtZXNzYWdlVGV4dDogJ0V4YW1wbGUgQW5ndWxhciBDb21waWxlciBEaWFnbm9zdGljJyxcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIGNvZGU6IDEyMzQ1LFxuICAgICAgICAgIC8vIHNvdXJjZSBpcyB0aGUgbmFtZSBvZiB0aGUgcGx1Z2luLlxuICAgICAgICAgIHNvdXJjZTogJ0FuZ3VsYXInLFxuICAgICAgICB9O1xuICAgICAgICByZXN1bHQucHVzaChmYWtlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgICByZXR1cm4gcHJveHk7XG4gIH1cblxuICBjcmVhdGVUcmFuc2Zvcm1lcnMoaG9zdDogUGx1Z2luQ29tcGlsZXJIb3N0KSB7XG4gICAgY29uc3QgYWZ0ZXJEZWNsYXJhdGlvbnM6IEFycmF5PHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlfHRzLkJ1bmRsZT4+ID1cbiAgICAgICAgWyhjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpID0+IChzZjogdHMuU291cmNlRmlsZSB8IHRzLkJ1bmRsZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHZpc2l0b3IgPSAobm9kZTogdHMuTm9kZSk6IHRzLk5vZGUgPT4ge1xuICAgICAgICAgICAgaWYgKG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGNseiA9IG5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgICAgLy8gRm9yIGRlbW8gcHVycG9zZXMsIHRyYW5zZm9ybSB0aGUgY2xhc3MgbmFtZSBpbiB0aGUgLmQudHMgb3V0cHV0XG4gICAgICAgICAgICAgIHJldHVybiB0cy51cGRhdGVDbGFzc0RlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICAgICAgY2x6LCBjbHouZGVjb3JhdG9ycywgbm9kZS5tb2RpZmllcnMsIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ05FV05BTUUnKSxcbiAgICAgICAgICAgICAgICAgIGNsei50eXBlUGFyYW1ldGVycywgY2x6Lmhlcml0YWdlQ2xhdXNlcywgY2x6Lm1lbWJlcnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRzLnZpc2l0RWFjaENoaWxkKG5vZGUsIHZpc2l0b3IsIGNvbnRleHQpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgcmV0dXJuIHZpc2l0b3Ioc2YpIGFzIHRzLlNvdXJjZUZpbGU7XG4gICAgICAgIH1dO1xuICAgIHJldHVybiB7YWZ0ZXJEZWNsYXJhdGlvbnN9O1xuICB9XG5cbiAgd3JhcEhvc3QoaW5wdXRGaWxlczogc3RyaW5nW10sIGNvbXBpbGVySG9zdDogdHMuQ29tcGlsZXJIb3N0KSB7XG4gICAgcmV0dXJuIG5ldyBTeW50aGV0aWNGaWxlc0NvbXBpbGVySG9zdChpbnB1dEZpbGVzLCBjb21waWxlckhvc3QsIHRoaXMuZ2VuZXJhdGVkRmlsZXMpO1xuICB9XG5cbiAgZ2VuZXJhdGVkRmlsZXMocm9vdEZpbGVzOiBzdHJpbmdbXSkge1xuICAgIHJldHVybiB7XG4gICAgICAnZmlsZS0xLnRzJzogKGhvc3Q6IHRzLkNvbXBpbGVySG9zdCkgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlU291cmNlRmlsZSgnZmlsZS0xLnRzJywgJ2NvbnRlbnRzJywgdHMuU2NyaXB0VGFyZ2V0LkVTNSksXG4gICAgfTtcbiAgfVxufVxuIl19