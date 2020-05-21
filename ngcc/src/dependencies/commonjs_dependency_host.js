(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils", "@angular/compiler-cli/ngcc/src/dependencies/dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CommonJsDependencyHost = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var commonjs_umd_utils_1 = require("@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils");
    var dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dependency_host");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    /**
     * Helper functions for computing dependencies.
     */
    var CommonJsDependencyHost = /** @class */ (function (_super) {
        tslib_1.__extends(CommonJsDependencyHost, _super);
        function CommonJsDependencyHost() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Compute the dependencies of the given file.
         *
         * @param file An absolute path to the file whose dependencies we want to get.
         * @param dependencies A set that will have the absolute paths of resolved entry points added to
         * it.
         * @param missing A set that will have the dependencies that could not be found added to it.
         * @param deepImports A set that will have the import paths that exist but cannot be mapped to
         * entry-points, i.e. deep-imports.
         * @param alreadySeen A set that is used to track internal dependencies to prevent getting stuck
         * in a circular dependency loop.
         */
        CommonJsDependencyHost.prototype.recursivelyCollectDependencies = function (file, dependencies, missing, deepImports, alreadySeen) {
            var e_1, _a, e_2, _b, e_3, _c;
            var fromContents = this.fs.readFile(file);
            if (!this.hasRequireCalls(fromContents)) {
                // Avoid parsing the source file as there are no imports.
                return;
            }
            // Parse the source into a TypeScript AST and then walk it looking for imports and re-exports.
            var sf = ts.createSourceFile(file, fromContents, ts.ScriptTarget.ES2015, false, ts.ScriptKind.JS);
            var requireCalls = [];
            try {
                for (var _d = tslib_1.__values(sf.statements), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var stmt = _e.value;
                    if (ts.isVariableStatement(stmt)) {
                        // Regular import(s):
                        // `var foo = require('...')` or `var foo = require('...'), bar = require('...')`
                        var declarations = stmt.declarationList.declarations;
                        try {
                            for (var declarations_1 = (e_2 = void 0, tslib_1.__values(declarations)), declarations_1_1 = declarations_1.next(); !declarations_1_1.done; declarations_1_1 = declarations_1.next()) {
                                var declaration = declarations_1_1.value;
                                if ((declaration.initializer !== undefined) && commonjs_umd_utils_1.isRequireCall(declaration.initializer)) {
                                    requireCalls.push(declaration.initializer);
                                }
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (declarations_1_1 && !declarations_1_1.done && (_b = declarations_1.return)) _b.call(declarations_1);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                    }
                    else if (ts.isExpressionStatement(stmt)) {
                        if (commonjs_umd_utils_1.isRequireCall(stmt.expression)) {
                            // Import for the side-effects only:
                            // `require('...')`
                            requireCalls.push(stmt.expression);
                        }
                        else if (commonjs_umd_utils_1.isWildcardReexportStatement(stmt)) {
                            // Re-export in one of the following formats:
                            // - `__export(require('...'))`
                            // - `__export(<identifier>)`
                            // - `tslib_1.__exportStar(require('...'), exports)`
                            // - `tslib_1.__exportStar(<identifier>, exports)`
                            var firstExportArg = stmt.expression.arguments[0];
                            if (commonjs_umd_utils_1.isRequireCall(firstExportArg)) {
                                // Re-export with `require()` call:
                                // `__export(require('...'))` or `tslib_1.__exportStar(require('...'), exports)`
                                requireCalls.push(firstExportArg);
                            }
                        }
                        else if (ts.isBinaryExpression(stmt.expression) &&
                            (stmt.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken)) {
                            if (commonjs_umd_utils_1.isRequireCall(stmt.expression.right)) {
                                // Import with assignment. E.g.:
                                // `exports.foo = require('...')`
                                requireCalls.push(stmt.expression.right);
                            }
                            else if (ts.isObjectLiteralExpression(stmt.expression.right)) {
                                // Import in object literal. E.g.:
                                // `module.exports = {foo: require('...')}`
                                stmt.expression.right.properties.forEach(function (prop) {
                                    if (ts.isPropertyAssignment(prop) && commonjs_umd_utils_1.isRequireCall(prop.initializer)) {
                                        requireCalls.push(prop.initializer);
                                    }
                                });
                            }
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var importPaths = new Set(requireCalls.map(function (call) { return call.arguments[0].text; }));
            try {
                for (var importPaths_1 = tslib_1.__values(importPaths), importPaths_1_1 = importPaths_1.next(); !importPaths_1_1.done; importPaths_1_1 = importPaths_1.next()) {
                    var importPath = importPaths_1_1.value;
                    var resolvedModule = this.moduleResolver.resolveModuleImport(importPath, file);
                    if (resolvedModule === null) {
                        missing.add(importPath);
                    }
                    else if (resolvedModule instanceof module_resolver_1.ResolvedRelativeModule) {
                        var internalDependency = resolvedModule.modulePath;
                        if (!alreadySeen.has(internalDependency)) {
                            alreadySeen.add(internalDependency);
                            this.recursivelyCollectDependencies(internalDependency, dependencies, missing, deepImports, alreadySeen);
                        }
                    }
                    else if (resolvedModule instanceof module_resolver_1.ResolvedDeepImport) {
                        deepImports.add(resolvedModule.importPath);
                    }
                    else {
                        dependencies.add(resolvedModule.entryPointPath);
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (importPaths_1_1 && !importPaths_1_1.done && (_c = importPaths_1.return)) _c.call(importPaths_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
        };
        /**
         * Check whether a source file needs to be parsed for imports.
         * This is a performance short-circuit, which saves us from creating
         * a TypeScript AST unnecessarily.
         *
         * @param source The content of the source file to check.
         *
         * @returns false if there are definitely no require calls
         * in this file, true otherwise.
         */
        CommonJsDependencyHost.prototype.hasRequireCalls = function (source) {
            return /require\(['"]/.test(source);
        };
        return CommonJsDependencyHost;
    }(dependency_host_1.DependencyHostBase));
    exports.CommonJsDependencyHost = CommonJsDependencyHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfZGVwZW5kZW5jeV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2RlcGVuZGVuY2llcy9jb21tb25qc19kZXBlbmRlbmN5X2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUdqQyw2RkFBbUc7SUFFbkcsK0ZBQXFEO0lBQ3JELCtGQUE2RTtJQUU3RTs7T0FFRztJQUNIO1FBQTRDLGtEQUFrQjtRQUE5RDs7UUE2R0EsQ0FBQztRQTVHQzs7Ozs7Ozs7Ozs7V0FXRztRQUNPLCtEQUE4QixHQUF4QyxVQUNJLElBQW9CLEVBQUUsWUFBaUMsRUFBRSxPQUFvQixFQUM3RSxXQUFnQyxFQUFFLFdBQWdDOztZQUNwRSxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUU1QyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsRUFBRTtnQkFDdkMseURBQXlEO2dCQUN6RCxPQUFPO2FBQ1I7WUFFRCw4RkFBOEY7WUFDOUYsSUFBTSxFQUFFLEdBQ0osRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDN0YsSUFBTSxZQUFZLEdBQWtCLEVBQUUsQ0FBQzs7Z0JBRXZDLEtBQW1CLElBQUEsS0FBQSxpQkFBQSxFQUFFLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUE3QixJQUFNLElBQUksV0FBQTtvQkFDYixJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDaEMscUJBQXFCO3dCQUNyQixpRkFBaUY7d0JBQ2pGLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDOzs0QkFDdkQsS0FBMEIsSUFBQSxnQ0FBQSxpQkFBQSxZQUFZLENBQUEsQ0FBQSwwQ0FBQSxvRUFBRTtnQ0FBbkMsSUFBTSxXQUFXLHlCQUFBO2dDQUNwQixJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUMsSUFBSSxrQ0FBYSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRTtvQ0FDckYsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7aUNBQzVDOzZCQUNGOzs7Ozs7Ozs7cUJBQ0Y7eUJBQU0sSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ3pDLElBQUksa0NBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7NEJBQ2xDLG9DQUFvQzs0QkFDcEMsbUJBQW1COzRCQUNuQixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQzt5QkFDcEM7NkJBQU0sSUFBSSxnREFBMkIsQ0FBQyxJQUFJLENBQUMsRUFBRTs0QkFDNUMsNkNBQTZDOzRCQUM3QywrQkFBK0I7NEJBQy9CLDZCQUE2Qjs0QkFDN0Isb0RBQW9EOzRCQUNwRCxrREFBa0Q7NEJBQ2xELElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUVwRCxJQUFJLGtDQUFhLENBQUMsY0FBYyxDQUFDLEVBQUU7Z0NBQ2pDLG1DQUFtQztnQ0FDbkMsZ0ZBQWdGO2dDQUNoRixZQUFZLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDOzZCQUNuQzt5QkFDRjs2QkFBTSxJQUNILEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDOzRCQUN0QyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFOzRCQUN0RSxJQUFJLGtDQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQ0FDeEMsZ0NBQWdDO2dDQUNoQyxpQ0FBaUM7Z0NBQ2pDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQzs2QkFDMUM7aUNBQU0sSUFBSSxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQ0FDOUQsa0NBQWtDO2dDQUNsQywyQ0FBMkM7Z0NBQzNDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJO29DQUMzQyxJQUFJLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxrQ0FBYSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRTt3Q0FDcEUsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7cUNBQ3JDO2dDQUNILENBQUMsQ0FBQyxDQUFDOzZCQUNKO3lCQUNGO3FCQUNGO2lCQUNGOzs7Ozs7Ozs7WUFFRCxJQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQXRCLENBQXNCLENBQUMsQ0FBQyxDQUFDOztnQkFDOUUsS0FBeUIsSUFBQSxnQkFBQSxpQkFBQSxXQUFXLENBQUEsd0NBQUEsaUVBQUU7b0JBQWpDLElBQU0sVUFBVSx3QkFBQTtvQkFDbkIsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ2pGLElBQUksY0FBYyxLQUFLLElBQUksRUFBRTt3QkFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztxQkFDekI7eUJBQU0sSUFBSSxjQUFjLFlBQVksd0NBQXNCLEVBQUU7d0JBQzNELElBQU0sa0JBQWtCLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQzt3QkFDckQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRTs0QkFDeEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDOzRCQUNwQyxJQUFJLENBQUMsOEJBQThCLENBQy9CLGtCQUFrQixFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO3lCQUMxRTtxQkFDRjt5QkFBTSxJQUFJLGNBQWMsWUFBWSxvQ0FBa0IsRUFBRTt3QkFDdkQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7cUJBQzVDO3lCQUFNO3dCQUNMLFlBQVksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO3FCQUNqRDtpQkFDRjs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUVEOzs7Ozs7Ozs7V0FTRztRQUNLLGdEQUFlLEdBQXZCLFVBQXdCLE1BQWM7WUFDcEMsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFDSCw2QkFBQztJQUFELENBQUMsQUE3R0QsQ0FBNEMsb0NBQWtCLEdBNkc3RDtJQTdHWSx3REFBc0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7aXNSZXF1aXJlQ2FsbCwgaXNXaWxkY2FyZFJlZXhwb3J0U3RhdGVtZW50LCBSZXF1aXJlQ2FsbH0gZnJvbSAnLi4vaG9zdC9jb21tb25qc191bWRfdXRpbHMnO1xuXG5pbXBvcnQge0RlcGVuZGVuY3lIb3N0QmFzZX0gZnJvbSAnLi9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtSZXNvbHZlZERlZXBJbXBvcnQsIFJlc29sdmVkUmVsYXRpdmVNb2R1bGV9IGZyb20gJy4vbW9kdWxlX3Jlc29sdmVyJztcblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb25zIGZvciBjb21wdXRpbmcgZGVwZW5kZW5jaWVzLlxuICovXG5leHBvcnQgY2xhc3MgQ29tbW9uSnNEZXBlbmRlbmN5SG9zdCBleHRlbmRzIERlcGVuZGVuY3lIb3N0QmFzZSB7XG4gIC8qKlxuICAgKiBDb21wdXRlIHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlIGdpdmVuIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBmaWxlIEFuIGFic29sdXRlIHBhdGggdG8gdGhlIGZpbGUgd2hvc2UgZGVwZW5kZW5jaWVzIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcGFyYW0gZGVwZW5kZW5jaWVzIEEgc2V0IHRoYXQgd2lsbCBoYXZlIHRoZSBhYnNvbHV0ZSBwYXRocyBvZiByZXNvbHZlZCBlbnRyeSBwb2ludHMgYWRkZWQgdG9cbiAgICogaXQuXG4gICAqIEBwYXJhbSBtaXNzaW5nIEEgc2V0IHRoYXQgd2lsbCBoYXZlIHRoZSBkZXBlbmRlbmNpZXMgdGhhdCBjb3VsZCBub3QgYmUgZm91bmQgYWRkZWQgdG8gaXQuXG4gICAqIEBwYXJhbSBkZWVwSW1wb3J0cyBBIHNldCB0aGF0IHdpbGwgaGF2ZSB0aGUgaW1wb3J0IHBhdGhzIHRoYXQgZXhpc3QgYnV0IGNhbm5vdCBiZSBtYXBwZWQgdG9cbiAgICogZW50cnktcG9pbnRzLCBpLmUuIGRlZXAtaW1wb3J0cy5cbiAgICogQHBhcmFtIGFscmVhZHlTZWVuIEEgc2V0IHRoYXQgaXMgdXNlZCB0byB0cmFjayBpbnRlcm5hbCBkZXBlbmRlbmNpZXMgdG8gcHJldmVudCBnZXR0aW5nIHN0dWNrXG4gICAqIGluIGEgY2lyY3VsYXIgZGVwZW5kZW5jeSBsb29wLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlY3Vyc2l2ZWx5Q29sbGVjdERlcGVuZGVuY2llcyhcbiAgICAgIGZpbGU6IEFic29sdXRlRnNQYXRoLCBkZXBlbmRlbmNpZXM6IFNldDxBYnNvbHV0ZUZzUGF0aD4sIG1pc3Npbmc6IFNldDxzdHJpbmc+LFxuICAgICAgZGVlcEltcG9ydHM6IFNldDxBYnNvbHV0ZUZzUGF0aD4sIGFscmVhZHlTZWVuOiBTZXQ8QWJzb2x1dGVGc1BhdGg+KTogdm9pZCB7XG4gICAgY29uc3QgZnJvbUNvbnRlbnRzID0gdGhpcy5mcy5yZWFkRmlsZShmaWxlKTtcblxuICAgIGlmICghdGhpcy5oYXNSZXF1aXJlQ2FsbHMoZnJvbUNvbnRlbnRzKSkge1xuICAgICAgLy8gQXZvaWQgcGFyc2luZyB0aGUgc291cmNlIGZpbGUgYXMgdGhlcmUgYXJlIG5vIGltcG9ydHMuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgdGhlIHNvdXJjZSBpbnRvIGEgVHlwZVNjcmlwdCBBU1QgYW5kIHRoZW4gd2FsayBpdCBsb29raW5nIGZvciBpbXBvcnRzIGFuZCByZS1leHBvcnRzLlxuICAgIGNvbnN0IHNmID1cbiAgICAgICAgdHMuY3JlYXRlU291cmNlRmlsZShmaWxlLCBmcm9tQ29udGVudHMsIHRzLlNjcmlwdFRhcmdldC5FUzIwMTUsIGZhbHNlLCB0cy5TY3JpcHRLaW5kLkpTKTtcbiAgICBjb25zdCByZXF1aXJlQ2FsbHM6IFJlcXVpcmVDYWxsW10gPSBbXTtcblxuICAgIGZvciAoY29uc3Qgc3RtdCBvZiBzZi5zdGF0ZW1lbnRzKSB7XG4gICAgICBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdG10KSkge1xuICAgICAgICAvLyBSZWd1bGFyIGltcG9ydChzKTpcbiAgICAgICAgLy8gYHZhciBmb28gPSByZXF1aXJlKCcuLi4nKWAgb3IgYHZhciBmb28gPSByZXF1aXJlKCcuLi4nKSwgYmFyID0gcmVxdWlyZSgnLi4uJylgXG4gICAgICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9IHN0bXQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucztcbiAgICAgICAgZm9yIChjb25zdCBkZWNsYXJhdGlvbiBvZiBkZWNsYXJhdGlvbnMpIHtcbiAgICAgICAgICBpZiAoKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyICE9PSB1bmRlZmluZWQpICYmIGlzUmVxdWlyZUNhbGwoZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIpKSB7XG4gICAgICAgICAgICByZXF1aXJlQ2FsbHMucHVzaChkZWNsYXJhdGlvbi5pbml0aWFsaXplcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdG10KSkge1xuICAgICAgICBpZiAoaXNSZXF1aXJlQ2FsbChzdG10LmV4cHJlc3Npb24pKSB7XG4gICAgICAgICAgLy8gSW1wb3J0IGZvciB0aGUgc2lkZS1lZmZlY3RzIG9ubHk6XG4gICAgICAgICAgLy8gYHJlcXVpcmUoJy4uLicpYFxuICAgICAgICAgIHJlcXVpcmVDYWxscy5wdXNoKHN0bXQuZXhwcmVzc2lvbik7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNXaWxkY2FyZFJlZXhwb3J0U3RhdGVtZW50KHN0bXQpKSB7XG4gICAgICAgICAgLy8gUmUtZXhwb3J0IGluIG9uZSBvZiB0aGUgZm9sbG93aW5nIGZvcm1hdHM6XG4gICAgICAgICAgLy8gLSBgX19leHBvcnQocmVxdWlyZSgnLi4uJykpYFxuICAgICAgICAgIC8vIC0gYF9fZXhwb3J0KDxpZGVudGlmaWVyPilgXG4gICAgICAgICAgLy8gLSBgdHNsaWJfMS5fX2V4cG9ydFN0YXIocmVxdWlyZSgnLi4uJyksIGV4cG9ydHMpYFxuICAgICAgICAgIC8vIC0gYHRzbGliXzEuX19leHBvcnRTdGFyKDxpZGVudGlmaWVyPiwgZXhwb3J0cylgXG4gICAgICAgICAgY29uc3QgZmlyc3RFeHBvcnRBcmcgPSBzdG10LmV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuXG4gICAgICAgICAgaWYgKGlzUmVxdWlyZUNhbGwoZmlyc3RFeHBvcnRBcmcpKSB7XG4gICAgICAgICAgICAvLyBSZS1leHBvcnQgd2l0aCBgcmVxdWlyZSgpYCBjYWxsOlxuICAgICAgICAgICAgLy8gYF9fZXhwb3J0KHJlcXVpcmUoJy4uLicpKWAgb3IgYHRzbGliXzEuX19leHBvcnRTdGFyKHJlcXVpcmUoJy4uLicpLCBleHBvcnRzKWBcbiAgICAgICAgICAgIHJlcXVpcmVDYWxscy5wdXNoKGZpcnN0RXhwb3J0QXJnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICB0cy5pc0JpbmFyeUV4cHJlc3Npb24oc3RtdC5leHByZXNzaW9uKSAmJlxuICAgICAgICAgICAgKHN0bXQuZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4pKSB7XG4gICAgICAgICAgaWYgKGlzUmVxdWlyZUNhbGwoc3RtdC5leHByZXNzaW9uLnJpZ2h0KSkge1xuICAgICAgICAgICAgLy8gSW1wb3J0IHdpdGggYXNzaWdubWVudC4gRS5nLjpcbiAgICAgICAgICAgIC8vIGBleHBvcnRzLmZvbyA9IHJlcXVpcmUoJy4uLicpYFxuICAgICAgICAgICAgcmVxdWlyZUNhbGxzLnB1c2goc3RtdC5leHByZXNzaW9uLnJpZ2h0KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oc3RtdC5leHByZXNzaW9uLnJpZ2h0KSkge1xuICAgICAgICAgICAgLy8gSW1wb3J0IGluIG9iamVjdCBsaXRlcmFsLiBFLmcuOlxuICAgICAgICAgICAgLy8gYG1vZHVsZS5leHBvcnRzID0ge2ZvbzogcmVxdWlyZSgnLi4uJyl9YFxuICAgICAgICAgICAgc3RtdC5leHByZXNzaW9uLnJpZ2h0LnByb3BlcnRpZXMuZm9yRWFjaChwcm9wID0+IHtcbiAgICAgICAgICAgICAgaWYgKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHByb3ApICYmIGlzUmVxdWlyZUNhbGwocHJvcC5pbml0aWFsaXplcikpIHtcbiAgICAgICAgICAgICAgICByZXF1aXJlQ2FsbHMucHVzaChwcm9wLmluaXRpYWxpemVyKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0UGF0aHMgPSBuZXcgU2V0KHJlcXVpcmVDYWxscy5tYXAoY2FsbCA9PiBjYWxsLmFyZ3VtZW50c1swXS50ZXh0KSk7XG4gICAgZm9yIChjb25zdCBpbXBvcnRQYXRoIG9mIGltcG9ydFBhdGhzKSB7XG4gICAgICBjb25zdCByZXNvbHZlZE1vZHVsZSA9IHRoaXMubW9kdWxlUmVzb2x2ZXIucmVzb2x2ZU1vZHVsZUltcG9ydChpbXBvcnRQYXRoLCBmaWxlKTtcbiAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSA9PT0gbnVsbCkge1xuICAgICAgICBtaXNzaW5nLmFkZChpbXBvcnRQYXRoKTtcbiAgICAgIH0gZWxzZSBpZiAocmVzb2x2ZWRNb2R1bGUgaW5zdGFuY2VvZiBSZXNvbHZlZFJlbGF0aXZlTW9kdWxlKSB7XG4gICAgICAgIGNvbnN0IGludGVybmFsRGVwZW5kZW5jeSA9IHJlc29sdmVkTW9kdWxlLm1vZHVsZVBhdGg7XG4gICAgICAgIGlmICghYWxyZWFkeVNlZW4uaGFzKGludGVybmFsRGVwZW5kZW5jeSkpIHtcbiAgICAgICAgICBhbHJlYWR5U2Vlbi5hZGQoaW50ZXJuYWxEZXBlbmRlbmN5KTtcbiAgICAgICAgICB0aGlzLnJlY3Vyc2l2ZWx5Q29sbGVjdERlcGVuZGVuY2llcyhcbiAgICAgICAgICAgICAgaW50ZXJuYWxEZXBlbmRlbmN5LCBkZXBlbmRlbmNpZXMsIG1pc3NpbmcsIGRlZXBJbXBvcnRzLCBhbHJlYWR5U2Vlbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocmVzb2x2ZWRNb2R1bGUgaW5zdGFuY2VvZiBSZXNvbHZlZERlZXBJbXBvcnQpIHtcbiAgICAgICAgZGVlcEltcG9ydHMuYWRkKHJlc29sdmVkTW9kdWxlLmltcG9ydFBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVwZW5kZW5jaWVzLmFkZChyZXNvbHZlZE1vZHVsZS5lbnRyeVBvaW50UGF0aCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgYSBzb3VyY2UgZmlsZSBuZWVkcyB0byBiZSBwYXJzZWQgZm9yIGltcG9ydHMuXG4gICAqIFRoaXMgaXMgYSBwZXJmb3JtYW5jZSBzaG9ydC1jaXJjdWl0LCB3aGljaCBzYXZlcyB1cyBmcm9tIGNyZWF0aW5nXG4gICAqIGEgVHlwZVNjcmlwdCBBU1QgdW5uZWNlc3NhcmlseS5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZSBUaGUgY29udGVudCBvZiB0aGUgc291cmNlIGZpbGUgdG8gY2hlY2suXG4gICAqXG4gICAqIEByZXR1cm5zIGZhbHNlIGlmIHRoZXJlIGFyZSBkZWZpbml0ZWx5IG5vIHJlcXVpcmUgY2FsbHNcbiAgICogaW4gdGhpcyBmaWxlLCB0cnVlIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgaGFzUmVxdWlyZUNhbGxzKHNvdXJjZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIC9yZXF1aXJlXFwoWydcIl0vLnRlc3Qoc291cmNlKTtcbiAgfVxufVxuIl19