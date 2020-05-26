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
     * Copyright Google LLC All Rights Reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfZGVwZW5kZW5jeV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2RlcGVuZGVuY2llcy9jb21tb25qc19kZXBlbmRlbmN5X2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUdqQyw2RkFBbUc7SUFFbkcsK0ZBQXFEO0lBQ3JELCtGQUE2RTtJQUU3RTs7T0FFRztJQUNIO1FBQTRDLGtEQUFrQjtRQUE5RDs7UUE2R0EsQ0FBQztRQTVHQzs7Ozs7Ozs7Ozs7V0FXRztRQUNPLCtEQUE4QixHQUF4QyxVQUNJLElBQW9CLEVBQUUsWUFBaUMsRUFBRSxPQUFvQixFQUM3RSxXQUFnQyxFQUFFLFdBQWdDOztZQUNwRSxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUU1QyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsRUFBRTtnQkFDdkMseURBQXlEO2dCQUN6RCxPQUFPO2FBQ1I7WUFFRCw4RkFBOEY7WUFDOUYsSUFBTSxFQUFFLEdBQ0osRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDN0YsSUFBTSxZQUFZLEdBQWtCLEVBQUUsQ0FBQzs7Z0JBRXZDLEtBQW1CLElBQUEsS0FBQSxpQkFBQSxFQUFFLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUE3QixJQUFNLElBQUksV0FBQTtvQkFDYixJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDaEMscUJBQXFCO3dC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QyxVQUFVLENBQUMsQ0FBQztxQkFDekI7eUJBQU0sSUFBSSxjQUFjLFlBQVksd0NBQXNCLEVBQUU7d0JBQzNELElBQU0sa0JBQWtCLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQzt3QkFDckQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRTs0QkFDeEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDOzRCQUNwQyxJQUFJLENBQUMsOEJBQThCLENBQy9CLGtCQUFrQixFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO3lCQUMxRTtxQkFDRjt5QkFBTSxJQUFJLGNBQWMsWUFBWSxvQ0FBa0IsRUFBRTt3QkFDdkQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7cUJBQzVDO3lCQUFNO3dCQUNMLFlBQVksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO3FCQUNqRDtpQkFDRjs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUVEOzs7Ozs7Ozs7V0FTRztRQUNLLGdEQUFlLEdBQXZCLFVBQXdCLE1BQWM7WUFDcEMsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFDSCw2QkFBQztJQUFELENBQUMsQUE3R0QsQ0FBNEMsb0NBQWtCLEdBNkc3RDtJQTdHWSx3REFBc0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtpc1JlcXVpcmVDYWxsLCBpc1dpbGRjYXJkUmVleHBvcnRTdGF0ZW1lbnQsIFJlcXVpcmVDYWxsfSBmcm9tICcuLi9ob3N0L2NvbW1vbmpzX3VtZF91dGlscyc7XG5cbmltcG9ydCB7RGVwZW5kZW5jeUhvc3RCYXNlfSBmcm9tICcuL2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge1Jlc29sdmVkRGVlcEltcG9ydCwgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZX0gZnJvbSAnLi9tb2R1bGVfcmVzb2x2ZXInO1xuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbnMgZm9yIGNvbXB1dGluZyBkZXBlbmRlbmNpZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21tb25Kc0RlcGVuZGVuY3lIb3N0IGV4dGVuZHMgRGVwZW5kZW5jeUhvc3RCYXNlIHtcbiAgLyoqXG4gICAqIENvbXB1dGUgdGhlIGRlcGVuZGVuY2llcyBvZiB0aGUgZ2l2ZW4gZmlsZS5cbiAgICpcbiAgICogQHBhcmFtIGZpbGUgQW4gYWJzb2x1dGUgcGF0aCB0byB0aGUgZmlsZSB3aG9zZSBkZXBlbmRlbmNpZXMgd2Ugd2FudCB0byBnZXQuXG4gICAqIEBwYXJhbSBkZXBlbmRlbmNpZXMgQSBzZXQgdGhhdCB3aWxsIGhhdmUgdGhlIGFic29sdXRlIHBhdGhzIG9mIHJlc29sdmVkIGVudHJ5IHBvaW50cyBhZGRlZCB0b1xuICAgKiBpdC5cbiAgICogQHBhcmFtIG1pc3NpbmcgQSBzZXQgdGhhdCB3aWxsIGhhdmUgdGhlIGRlcGVuZGVuY2llcyB0aGF0IGNvdWxkIG5vdCBiZSBmb3VuZCBhZGRlZCB0byBpdC5cbiAgICogQHBhcmFtIGRlZXBJbXBvcnRzIEEgc2V0IHRoYXQgd2lsbCBoYXZlIHRoZSBpbXBvcnQgcGF0aHMgdGhhdCBleGlzdCBidXQgY2Fubm90IGJlIG1hcHBlZCB0b1xuICAgKiBlbnRyeS1wb2ludHMsIGkuZS4gZGVlcC1pbXBvcnRzLlxuICAgKiBAcGFyYW0gYWxyZWFkeVNlZW4gQSBzZXQgdGhhdCBpcyB1c2VkIHRvIHRyYWNrIGludGVybmFsIGRlcGVuZGVuY2llcyB0byBwcmV2ZW50IGdldHRpbmcgc3R1Y2tcbiAgICogaW4gYSBjaXJjdWxhciBkZXBlbmRlbmN5IGxvb3AuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVjdXJzaXZlbHlDb2xsZWN0RGVwZW5kZW5jaWVzKFxuICAgICAgZmlsZTogQWJzb2x1dGVGc1BhdGgsIGRlcGVuZGVuY2llczogU2V0PEFic29sdXRlRnNQYXRoPiwgbWlzc2luZzogU2V0PHN0cmluZz4sXG4gICAgICBkZWVwSW1wb3J0czogU2V0PEFic29sdXRlRnNQYXRoPiwgYWxyZWFkeVNlZW46IFNldDxBYnNvbHV0ZUZzUGF0aD4pOiB2b2lkIHtcbiAgICBjb25zdCBmcm9tQ29udGVudHMgPSB0aGlzLmZzLnJlYWRGaWxlKGZpbGUpO1xuXG4gICAgaWYgKCF0aGlzLmhhc1JlcXVpcmVDYWxscyhmcm9tQ29udGVudHMpKSB7XG4gICAgICAvLyBBdm9pZCBwYXJzaW5nIHRoZSBzb3VyY2UgZmlsZSBhcyB0aGVyZSBhcmUgbm8gaW1wb3J0cy5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBQYXJzZSB0aGUgc291cmNlIGludG8gYSBUeXBlU2NyaXB0IEFTVCBhbmQgdGhlbiB3YWxrIGl0IGxvb2tpbmcgZm9yIGltcG9ydHMgYW5kIHJlLWV4cG9ydHMuXG4gICAgY29uc3Qgc2YgPVxuICAgICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGUsIGZyb21Db250ZW50cywgdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSwgZmFsc2UsIHRzLlNjcmlwdEtpbmQuSlMpO1xuICAgIGNvbnN0IHJlcXVpcmVDYWxsczogUmVxdWlyZUNhbGxbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBzdG10IG9mIHNmLnN0YXRlbWVudHMpIHtcbiAgICAgIGlmICh0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0bXQpKSB7XG4gICAgICAgIC8vIFJlZ3VsYXIgaW1wb3J0KHMpOlxuICAgICAgICAvLyBgdmFyIGZvbyA9IHJlcXVpcmUoJy4uLicpYCBvciBgdmFyIGZvbyA9IHJlcXVpcmUoJy4uLicpLCBiYXIgPSByZXF1aXJlKCcuLi4nKWBcbiAgICAgICAgY29uc3QgZGVjbGFyYXRpb25zID0gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zO1xuICAgICAgICBmb3IgKGNvbnN0IGRlY2xhcmF0aW9uIG9mIGRlY2xhcmF0aW9ucykge1xuICAgICAgICAgIGlmICgoZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgIT09IHVuZGVmaW5lZCkgJiYgaXNSZXF1aXJlQ2FsbChkZWNsYXJhdGlvbi5pbml0aWFsaXplcikpIHtcbiAgICAgICAgICAgIHJlcXVpcmVDYWxscy5wdXNoKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0bXQpKSB7XG4gICAgICAgIGlmIChpc1JlcXVpcmVDYWxsKHN0bXQuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgICAvLyBJbXBvcnQgZm9yIHRoZSBzaWRlLWVmZmVjdHMgb25seTpcbiAgICAgICAgICAvLyBgcmVxdWlyZSgnLi4uJylgXG4gICAgICAgICAgcmVxdWlyZUNhbGxzLnB1c2goc3RtdC5leHByZXNzaW9uKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1dpbGRjYXJkUmVleHBvcnRTdGF0ZW1lbnQoc3RtdCkpIHtcbiAgICAgICAgICAvLyBSZS1leHBvcnQgaW4gb25lIG9mIHRoZSBmb2xsb3dpbmcgZm9ybWF0czpcbiAgICAgICAgICAvLyAtIGBfX2V4cG9ydChyZXF1aXJlKCcuLi4nKSlgXG4gICAgICAgICAgLy8gLSBgX19leHBvcnQoPGlkZW50aWZpZXI+KWBcbiAgICAgICAgICAvLyAtIGB0c2xpYl8xLl9fZXhwb3J0U3RhcihyZXF1aXJlKCcuLi4nKSwgZXhwb3J0cylgXG4gICAgICAgICAgLy8gLSBgdHNsaWJfMS5fX2V4cG9ydFN0YXIoPGlkZW50aWZpZXI+LCBleHBvcnRzKWBcbiAgICAgICAgICBjb25zdCBmaXJzdEV4cG9ydEFyZyA9IHN0bXQuZXhwcmVzc2lvbi5hcmd1bWVudHNbMF07XG5cbiAgICAgICAgICBpZiAoaXNSZXF1aXJlQ2FsbChmaXJzdEV4cG9ydEFyZykpIHtcbiAgICAgICAgICAgIC8vIFJlLWV4cG9ydCB3aXRoIGByZXF1aXJlKClgIGNhbGw6XG4gICAgICAgICAgICAvLyBgX19leHBvcnQocmVxdWlyZSgnLi4uJykpYCBvciBgdHNsaWJfMS5fX2V4cG9ydFN0YXIocmVxdWlyZSgnLi4uJyksIGV4cG9ydHMpYFxuICAgICAgICAgICAgcmVxdWlyZUNhbGxzLnB1c2goZmlyc3RFeHBvcnRBcmcpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihzdG10LmV4cHJlc3Npb24pICYmXG4gICAgICAgICAgICAoc3RtdC5leHByZXNzaW9uLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbikpIHtcbiAgICAgICAgICBpZiAoaXNSZXF1aXJlQ2FsbChzdG10LmV4cHJlc3Npb24ucmlnaHQpKSB7XG4gICAgICAgICAgICAvLyBJbXBvcnQgd2l0aCBhc3NpZ25tZW50LiBFLmcuOlxuICAgICAgICAgICAgLy8gYGV4cG9ydHMuZm9vID0gcmVxdWlyZSgnLi4uJylgXG4gICAgICAgICAgICByZXF1aXJlQ2FsbHMucHVzaChzdG10LmV4cHJlc3Npb24ucmlnaHQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihzdG10LmV4cHJlc3Npb24ucmlnaHQpKSB7XG4gICAgICAgICAgICAvLyBJbXBvcnQgaW4gb2JqZWN0IGxpdGVyYWwuIEUuZy46XG4gICAgICAgICAgICAvLyBgbW9kdWxlLmV4cG9ydHMgPSB7Zm9vOiByZXF1aXJlKCcuLi4nKX1gXG4gICAgICAgICAgICBzdG10LmV4cHJlc3Npb24ucmlnaHQucHJvcGVydGllcy5mb3JFYWNoKHByb3AgPT4ge1xuICAgICAgICAgICAgICBpZiAodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcCkgJiYgaXNSZXF1aXJlQ2FsbChwcm9wLmluaXRpYWxpemVyKSkge1xuICAgICAgICAgICAgICAgIHJlcXVpcmVDYWxscy5wdXNoKHByb3AuaW5pdGlhbGl6ZXIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRQYXRocyA9IG5ldyBTZXQocmVxdWlyZUNhbGxzLm1hcChjYWxsID0+IGNhbGwuYXJndW1lbnRzWzBdLnRleHQpKTtcbiAgICBmb3IgKGNvbnN0IGltcG9ydFBhdGggb2YgaW1wb3J0UGF0aHMpIHtcbiAgICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID0gdGhpcy5tb2R1bGVSZXNvbHZlci5yZXNvbHZlTW9kdWxlSW1wb3J0KGltcG9ydFBhdGgsIGZpbGUpO1xuICAgICAgaWYgKHJlc29sdmVkTW9kdWxlID09PSBudWxsKSB7XG4gICAgICAgIG1pc3NpbmcuYWRkKGltcG9ydFBhdGgpO1xuICAgICAgfSBlbHNlIGlmIChyZXNvbHZlZE1vZHVsZSBpbnN0YW5jZW9mIFJlc29sdmVkUmVsYXRpdmVNb2R1bGUpIHtcbiAgICAgICAgY29uc3QgaW50ZXJuYWxEZXBlbmRlbmN5ID0gcmVzb2x2ZWRNb2R1bGUubW9kdWxlUGF0aDtcbiAgICAgICAgaWYgKCFhbHJlYWR5U2Vlbi5oYXMoaW50ZXJuYWxEZXBlbmRlbmN5KSkge1xuICAgICAgICAgIGFscmVhZHlTZWVuLmFkZChpbnRlcm5hbERlcGVuZGVuY3kpO1xuICAgICAgICAgIHRoaXMucmVjdXJzaXZlbHlDb2xsZWN0RGVwZW5kZW5jaWVzKFxuICAgICAgICAgICAgICBpbnRlcm5hbERlcGVuZGVuY3ksIGRlcGVuZGVuY2llcywgbWlzc2luZywgZGVlcEltcG9ydHMsIGFscmVhZHlTZWVuKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChyZXNvbHZlZE1vZHVsZSBpbnN0YW5jZW9mIFJlc29sdmVkRGVlcEltcG9ydCkge1xuICAgICAgICBkZWVwSW1wb3J0cy5hZGQocmVzb2x2ZWRNb2R1bGUuaW1wb3J0UGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZXBlbmRlbmNpZXMuYWRkKHJlc29sdmVkTW9kdWxlLmVudHJ5UG9pbnRQYXRoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhIHNvdXJjZSBmaWxlIG5lZWRzIHRvIGJlIHBhcnNlZCBmb3IgaW1wb3J0cy5cbiAgICogVGhpcyBpcyBhIHBlcmZvcm1hbmNlIHNob3J0LWNpcmN1aXQsIHdoaWNoIHNhdmVzIHVzIGZyb20gY3JlYXRpbmdcbiAgICogYSBUeXBlU2NyaXB0IEFTVCB1bm5lY2Vzc2FyaWx5LlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlIFRoZSBjb250ZW50IG9mIHRoZSBzb3VyY2UgZmlsZSB0byBjaGVjay5cbiAgICpcbiAgICogQHJldHVybnMgZmFsc2UgaWYgdGhlcmUgYXJlIGRlZmluaXRlbHkgbm8gcmVxdWlyZSBjYWxsc1xuICAgKiBpbiB0aGlzIGZpbGUsIHRydWUgb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBoYXNSZXF1aXJlQ2FsbHMoc291cmNlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gL3JlcXVpcmVcXChbJ1wiXS8udGVzdChzb3VyY2UpO1xuICB9XG59XG4iXX0=