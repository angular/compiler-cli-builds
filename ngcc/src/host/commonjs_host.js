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
        define("@angular/compiler-cli/ngcc/src/host/commonjs_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/host/esm5_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var esm5_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm5_host");
    var CommonJsReflectionHost = /** @class */ (function (_super) {
        tslib_1.__extends(CommonJsReflectionHost, _super);
        function CommonJsReflectionHost(logger, isCore, program, compilerHost, dts) {
            var _this = _super.call(this, logger, isCore, program.getTypeChecker(), dts) || this;
            _this.program = program;
            _this.compilerHost = compilerHost;
            _this.commonJsExports = new Map();
            _this.topLevelHelperCalls = new Map();
            return _this;
        }
        CommonJsReflectionHost.prototype.getImportOfIdentifier = function (id) {
            var superImport = _super.prototype.getImportOfIdentifier.call(this, id);
            if (superImport !== null) {
                return superImport;
            }
            var requireCall = this.findCommonJsImport(id);
            if (requireCall === null) {
                return null;
            }
            return { from: requireCall.arguments[0].text, name: id.text };
        };
        CommonJsReflectionHost.prototype.getDeclarationOfIdentifier = function (id) {
            return this.getCommonJsImportedDeclaration(id) || _super.prototype.getDeclarationOfIdentifier.call(this, id);
        };
        CommonJsReflectionHost.prototype.getExportsOfModule = function (module) {
            return _super.prototype.getExportsOfModule.call(this, module) || this.getCommonJsExports(module.getSourceFile());
        };
        CommonJsReflectionHost.prototype.getCommonJsExports = function (sourceFile) {
            var _this = this;
            return getOrDefault(this.commonJsExports, sourceFile, function () { return _this.computeExportsOfCommonJsModule(sourceFile); });
        };
        /**
         * Search statements related to the given class for calls to the specified helper.
         *
         * In CommonJS these helper calls can be outside the class's IIFE at the top level of the
         * source file. Searching the top level statements for helpers can be expensive, so we
         * try to get helpers from the IIFE first and only fall back on searching the top level if
         * no helpers are found.
         *
         * @param classSymbol the class whose helper calls we are interested in.
         * @param helperName the name of the helper (e.g. `__decorate`) whose calls we are interested in.
         * @returns an array of nodes of calls to the helper with the given name.
         */
        CommonJsReflectionHost.prototype.getHelperCallsForClass = function (classSymbol, helperName) {
            var esm5HelperCalls = _super.prototype.getHelperCallsForClass.call(this, classSymbol, helperName);
            if (esm5HelperCalls.length > 0) {
                return esm5HelperCalls;
            }
            else {
                var sourceFile = classSymbol.declaration.valueDeclaration.getSourceFile();
                return this.getTopLevelHelperCalls(sourceFile, helperName);
            }
        };
        /**
         * Find all the helper calls at the top level of a source file.
         *
         * We cache the helper calls per source file so that we don't have to keep parsing the code for
         * each class in a file.
         *
         * @param sourceFile the source who may contain helper calls.
         * @param helperName the name of the helper (e.g. `__decorate`) whose calls we are interested in.
         * @returns an array of nodes of calls to the helper with the given name.
         */
        CommonJsReflectionHost.prototype.getTopLevelHelperCalls = function (sourceFile, helperName) {
            var _this = this;
            var helperCallsMap = getOrDefault(this.topLevelHelperCalls, helperName, function () { return new Map(); });
            return getOrDefault(helperCallsMap, sourceFile, function () { return sourceFile.statements.map(function (statement) { return _this.getHelperCall(statement, helperName); })
                .filter(utils_1.isDefined); });
        };
        CommonJsReflectionHost.prototype.computeExportsOfCommonJsModule = function (sourceFile) {
            var e_1, _a, e_2, _b;
            var moduleMap = new Map();
            try {
                for (var _c = tslib_1.__values(this.getModuleStatements(sourceFile)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var statement = _d.value;
                    if (isCommonJsExportStatement(statement)) {
                        var exportDeclaration = this.extractCommonJsExportDeclaration(statement);
                        moduleMap.set(exportDeclaration.name, exportDeclaration.declaration);
                    }
                    else if (isReexportStatement(statement)) {
                        var reexports = this.extractCommonJsReexports(statement, sourceFile);
                        try {
                            for (var reexports_1 = (e_2 = void 0, tslib_1.__values(reexports)), reexports_1_1 = reexports_1.next(); !reexports_1_1.done; reexports_1_1 = reexports_1.next()) {
                                var reexport = reexports_1_1.value;
                                moduleMap.set(reexport.name, reexport.declaration);
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (reexports_1_1 && !reexports_1_1.done && (_b = reexports_1.return)) _b.call(reexports_1);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return moduleMap;
        };
        CommonJsReflectionHost.prototype.extractCommonJsExportDeclaration = function (statement) {
            var exportExpression = statement.expression.right;
            var declaration = this.getDeclarationOfExpression(exportExpression);
            var name = statement.expression.left.name.text;
            if (declaration !== null) {
                return { name: name, declaration: declaration };
            }
            else {
                return {
                    name: name,
                    declaration: {
                        node: null,
                        expression: exportExpression,
                        viaModule: null,
                    },
                };
            }
        };
        CommonJsReflectionHost.prototype.extractCommonJsReexports = function (statement, containingFile) {
            var reexports = [];
            var requireCall = statement.expression.arguments[0];
            var importPath = requireCall.arguments[0].text;
            var importedFile = this.resolveModuleName(importPath, containingFile);
            if (importedFile !== undefined) {
                var viaModule_1 = stripExtension(importedFile.fileName);
                var importedExports = this.getExportsOfModule(importedFile);
                if (importedExports !== null) {
                    importedExports.forEach(function (decl, name) {
                        if (decl.node !== null) {
                            reexports.push({ name: name, declaration: { node: decl.node, viaModule: viaModule_1 } });
                        }
                        else {
                            reexports.push({ name: name, declaration: { node: null, expression: decl.expression, viaModule: viaModule_1 } });
                        }
                    });
                }
            }
            return reexports;
        };
        CommonJsReflectionHost.prototype.findCommonJsImport = function (id) {
            // Is `id` a namespaced property access, e.g. `Directive` in `core.Directive`?
            // If so capture the symbol of the namespace, e.g. `core`.
            var nsIdentifier = findNamespaceOfIdentifier(id);
            var nsSymbol = nsIdentifier && this.checker.getSymbolAtLocation(nsIdentifier) || null;
            var nsDeclaration = nsSymbol && nsSymbol.valueDeclaration;
            var initializer = nsDeclaration && ts.isVariableDeclaration(nsDeclaration) && nsDeclaration.initializer ||
                null;
            return initializer && isRequireCall(initializer) ? initializer : null;
        };
        CommonJsReflectionHost.prototype.getCommonJsImportedDeclaration = function (id) {
            var importInfo = this.getImportOfIdentifier(id);
            if (importInfo === null) {
                return null;
            }
            var importedFile = this.resolveModuleName(importInfo.from, id.getSourceFile());
            if (importedFile === undefined) {
                return null;
            }
            var viaModule = !importInfo.from.startsWith('.') ? importInfo.from : null;
            return { node: importedFile, viaModule: viaModule };
        };
        CommonJsReflectionHost.prototype.resolveModuleName = function (moduleName, containingFile) {
            if (this.compilerHost.resolveModuleNames) {
                // FIXME: remove the "as any" cast once on TS3.6.
                var moduleInfo = this.compilerHost
                    .resolveModuleNames([moduleName], containingFile.fileName, undefined, undefined, this.program.getCompilerOptions())[0];
                return moduleInfo && this.program.getSourceFile(file_system_1.absoluteFrom(moduleInfo.resolvedFileName));
            }
            else {
                var moduleInfo = ts.resolveModuleName(moduleName, containingFile.fileName, this.program.getCompilerOptions(), this.compilerHost);
                return moduleInfo.resolvedModule &&
                    this.program.getSourceFile(file_system_1.absoluteFrom(moduleInfo.resolvedModule.resolvedFileName));
            }
        };
        return CommonJsReflectionHost;
    }(esm5_host_1.Esm5ReflectionHost));
    exports.CommonJsReflectionHost = CommonJsReflectionHost;
    function isCommonJsExportStatement(s) {
        return ts.isExpressionStatement(s) && ts.isBinaryExpression(s.expression) &&
            ts.isPropertyAccessExpression(s.expression.left) &&
            ts.isIdentifier(s.expression.left.expression) &&
            s.expression.left.expression.text === 'exports';
    }
    exports.isCommonJsExportStatement = isCommonJsExportStatement;
    function isRequireCall(node) {
        return ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
            node.expression.text === 'require' && node.arguments.length === 1 &&
            ts.isStringLiteral(node.arguments[0]);
    }
    exports.isRequireCall = isRequireCall;
    /**
     * If the identifier `id` is the RHS of a property access of the form `namespace.id`
     * and `namespace` is an identifer then return `namespace`, otherwise `null`.
     * @param id The identifier whose namespace we want to find.
     */
    function findNamespaceOfIdentifier(id) {
        return id.parent && ts.isPropertyAccessExpression(id.parent) &&
            ts.isIdentifier(id.parent.expression) ?
            id.parent.expression :
            null;
    }
    function stripParentheses(node) {
        return ts.isParenthesizedExpression(node) ? node.expression : node;
    }
    exports.stripParentheses = stripParentheses;
    function isReexportStatement(statement) {
        return ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression) &&
            ts.isIdentifier(statement.expression.expression) &&
            statement.expression.expression.text === '__export' &&
            statement.expression.arguments.length === 1 &&
            isRequireCall(statement.expression.arguments[0]);
    }
    function stripExtension(fileName) {
        return fileName.replace(/\..+$/, '');
    }
    function getOrDefault(map, key, factory) {
        if (!map.has(key)) {
            map.set(key, factory(key));
        }
        return map.get(key);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9ob3N0L2NvbW1vbmpzX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBQ2pDLDJFQUE0RDtJQUk1RCw4REFBbUM7SUFFbkMsMkVBQStDO0lBRy9DO1FBQTRDLGtEQUFrQjtRQUc1RCxnQ0FDSSxNQUFjLEVBQUUsTUFBZSxFQUFZLE9BQW1CLEVBQ3BELFlBQTZCLEVBQUUsR0FBd0I7WUFGckUsWUFHRSxrQkFBTSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxHQUFHLENBQUMsU0FDckQ7WUFIOEMsYUFBTyxHQUFQLE9BQU8sQ0FBWTtZQUNwRCxrQkFBWSxHQUFaLFlBQVksQ0FBaUI7WUFKakMscUJBQWUsR0FBRyxJQUFJLEdBQUcsRUFBZ0QsQ0FBQztZQUMxRSx5QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBbUQsQ0FBQzs7UUFLM0YsQ0FBQztRQUVELHNEQUFxQixHQUFyQixVQUFzQixFQUFpQjtZQUNyQyxJQUFNLFdBQVcsR0FBRyxpQkFBTSxxQkFBcUIsWUFBQyxFQUFFLENBQUMsQ0FBQztZQUNwRCxJQUFJLFdBQVcsS0FBSyxJQUFJLEVBQUU7Z0JBQ3hCLE9BQU8sV0FBVyxDQUFDO2FBQ3BCO1lBRUQsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELElBQUksV0FBVyxLQUFLLElBQUksRUFBRTtnQkFDeEIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sRUFBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJ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QUVELFNBQVMsWUFBWSxDQUFPLEdBQWMsRUFBRSxHQUFNLEVBQUUsT0FBc0I7UUFDeEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDakIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDNUI7UUFDRCxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFHLENBQUM7SUFDeEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge2Fic29sdXRlRnJvbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RGVjbGFyYXRpb24sIEltcG9ydH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7QnVuZGxlUHJvZ3JhbX0gZnJvbSAnLi4vcGFja2FnZXMvYnVuZGxlX3Byb2dyYW0nO1xuaW1wb3J0IHtpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtFc201UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vZXNtNV9ob3N0JztcbmltcG9ydCB7TmdjY0NsYXNzU3ltYm9sfSBmcm9tICcuL25nY2NfaG9zdCc7XG5cbmV4cG9ydCBjbGFzcyBDb21tb25Kc1JlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgRXNtNVJlZmxlY3Rpb25Ib3N0IHtcbiAgcHJvdGVjdGVkIGNvbW1vbkpzRXhwb3J0cyA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGw+KCk7XG4gIHByb3RlY3RlZCB0b3BMZXZlbEhlbHBlckNhbGxzID0gbmV3IE1hcDxzdHJpbmcsIE1hcDx0cy5Tb3VyY2VGaWxlLCB0cy5DYWxsRXhwcmVzc2lvbltdPj4oKTtcbiAgY29uc3RydWN0b3IoXG4gICAgICBsb2dnZXI6IExvZ2dlciwgaXNDb3JlOiBib29sZWFuLCBwcm90ZWN0ZWQgcHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIHByb3RlY3RlZCBjb21waWxlckhvc3Q6IHRzLkNvbXBpbGVySG9zdCwgZHRzPzogQnVuZGxlUHJvZ3JhbXxudWxsKSB7XG4gICAgc3VwZXIobG9nZ2VyLCBpc0NvcmUsIHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSwgZHRzKTtcbiAgfVxuXG4gIGdldEltcG9ydE9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEltcG9ydHxudWxsIHtcbiAgICBjb25zdCBzdXBlckltcG9ydCA9IHN1cGVyLmdldEltcG9ydE9mSWRlbnRpZmllcihpZCk7XG4gICAgaWYgKHN1cGVySW1wb3J0ICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gc3VwZXJJbXBvcnQ7XG4gICAgfVxuXG4gICAgY29uc3QgcmVxdWlyZUNhbGwgPSB0aGlzLmZpbmRDb21tb25Kc0ltcG9ydChpZCk7XG4gICAgaWYgKHJlcXVpcmVDYWxsID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtmcm9tOiByZXF1aXJlQ2FsbC5hcmd1bWVudHNbMF0udGV4dCwgbmFtZTogaWQudGV4dH07XG4gIH1cblxuICBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldENvbW1vbkpzSW1wb3J0ZWREZWNsYXJhdGlvbihpZCkgfHwgc3VwZXIuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQpO1xuICB9XG5cbiAgZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZTogdHMuTm9kZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsIHtcbiAgICByZXR1cm4gc3VwZXIuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZSkgfHwgdGhpcy5nZXRDb21tb25Kc0V4cG9ydHMobW9kdWxlLmdldFNvdXJjZUZpbGUoKSk7XG4gIH1cblxuICBnZXRDb21tb25Kc0V4cG9ydHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsIHtcbiAgICByZXR1cm4gZ2V0T3JEZWZhdWx0KFxuICAgICAgICB0aGlzLmNvbW1vbkpzRXhwb3J0cywgc291cmNlRmlsZSwgKCkgPT4gdGhpcy5jb21wdXRlRXhwb3J0c09mQ29tbW9uSnNNb2R1bGUoc291cmNlRmlsZSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaCBzdGF0ZW1lbnRzIHJlbGF0ZWQgdG8gdGhlIGdpdmVuIGNsYXNzIGZvciBjYWxscyB0byB0aGUgc3BlY2lmaWVkIGhlbHBlci5cbiAgICpcbiAgICogSW4gQ29tbW9uSlMgdGhlc2UgaGVscGVyIGNhbGxzIGNhbiBiZSBvdXRzaWRlIHRoZSBjbGFzcydzIElJRkUgYXQgdGhlIHRvcCBsZXZlbCBvZiB0aGVcbiAgICogc291cmNlIGZpbGUuIFNlYXJjaGluZyB0aGUgdG9wIGxldmVsIHN0YXRlbWVudHMgZm9yIGhlbHBlcnMgY2FuIGJlIGV4cGVuc2l2ZSwgc28gd2VcbiAgICogdHJ5IHRvIGdldCBoZWxwZXJzIGZyb20gdGhlIElJRkUgZmlyc3QgYW5kIG9ubHkgZmFsbCBiYWNrIG9uIHNlYXJjaGluZyB0aGUgdG9wIGxldmVsIGlmXG4gICAqIG5vIGhlbHBlcnMgYXJlIGZvdW5kLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIGhlbHBlciBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHBhcmFtIGhlbHBlck5hbWUgdGhlIG5hbWUgb2YgdGhlIGhlbHBlciAoZS5nLiBgX19kZWNvcmF0ZWApIHdob3NlIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBub2RlcyBvZiBjYWxscyB0byB0aGUgaGVscGVyIHdpdGggdGhlIGdpdmVuIG5hbWUuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sLCBoZWxwZXJOYW1lOiBzdHJpbmcpOlxuICAgICAgdHMuQ2FsbEV4cHJlc3Npb25bXSB7XG4gICAgY29uc3QgZXNtNUhlbHBlckNhbGxzID0gc3VwZXIuZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhjbGFzc1N5bWJvbCwgaGVscGVyTmFtZSk7XG4gICAgaWYgKGVzbTVIZWxwZXJDYWxscy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gZXNtNUhlbHBlckNhbGxzO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlID0gY2xhc3NTeW1ib2wuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICByZXR1cm4gdGhpcy5nZXRUb3BMZXZlbEhlbHBlckNhbGxzKHNvdXJjZUZpbGUsIGhlbHBlck5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIGFsbCB0aGUgaGVscGVyIGNhbGxzIGF0IHRoZSB0b3AgbGV2ZWwgb2YgYSBzb3VyY2UgZmlsZS5cbiAgICpcbiAgICogV2UgY2FjaGUgdGhlIGhlbHBlciBjYWxscyBwZXIgc291cmNlIGZpbGUgc28gdGhhdCB3ZSBkb24ndCBoYXZlIHRvIGtlZXAgcGFyc2luZyB0aGUgY29kZSBmb3JcbiAgICogZWFjaCBjbGFzcyBpbiBhIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIHRoZSBzb3VyY2Ugd2hvIG1heSBjb250YWluIGhlbHBlciBjYWxscy5cbiAgICogQHBhcmFtIGhlbHBlck5hbWUgdGhlIG5hbWUgb2YgdGhlIGhlbHBlciAoZS5nLiBgX19kZWNvcmF0ZWApIHdob3NlIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBub2RlcyBvZiBjYWxscyB0byB0aGUgaGVscGVyIHdpdGggdGhlIGdpdmVuIG5hbWUuXG4gICAqL1xuICBwcml2YXRlIGdldFRvcExldmVsSGVscGVyQ2FsbHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgaGVscGVyTmFtZTogc3RyaW5nKTpcbiAgICAgIHRzLkNhbGxFeHByZXNzaW9uW10ge1xuICAgIGNvbnN0IGhlbHBlckNhbGxzTWFwID0gZ2V0T3JEZWZhdWx0KHRoaXMudG9wTGV2ZWxIZWxwZXJDYWxscywgaGVscGVyTmFtZSwgKCkgPT4gbmV3IE1hcCgpKTtcbiAgICByZXR1cm4gZ2V0T3JEZWZhdWx0KFxuICAgICAgICBoZWxwZXJDYWxsc01hcCwgc291cmNlRmlsZSxcbiAgICAgICAgKCkgPT4gc291cmNlRmlsZS5zdGF0ZW1lbnRzLm1hcChzdGF0ZW1lbnQgPT4gdGhpcy5nZXRIZWxwZXJDYWxsKHN0YXRlbWVudCwgaGVscGVyTmFtZSkpXG4gICAgICAgICAgICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21wdXRlRXhwb3J0c09mQ29tbW9uSnNNb2R1bGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPiB7XG4gICAgY29uc3QgbW9kdWxlTWFwID0gbmV3IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPigpO1xuICAgIGZvciAoY29uc3Qgc3RhdGVtZW50IG9mIHRoaXMuZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlKSkge1xuICAgICAgaWYgKGlzQ29tbW9uSnNFeHBvcnRTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgICBjb25zdCBleHBvcnREZWNsYXJhdGlvbiA9IHRoaXMuZXh0cmFjdENvbW1vbkpzRXhwb3J0RGVjbGFyYXRpb24oc3RhdGVtZW50KTtcbiAgICAgICAgbW9kdWxlTWFwLnNldChleHBvcnREZWNsYXJhdGlvbi5uYW1lLCBleHBvcnREZWNsYXJhdGlvbi5kZWNsYXJhdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKGlzUmVleHBvcnRTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgICBjb25zdCByZWV4cG9ydHMgPSB0aGlzLmV4dHJhY3RDb21tb25Kc1JlZXhwb3J0cyhzdGF0ZW1lbnQsIHNvdXJjZUZpbGUpO1xuICAgICAgICBmb3IgKGNvbnN0IHJlZXhwb3J0IG9mIHJlZXhwb3J0cykge1xuICAgICAgICAgIG1vZHVsZU1hcC5zZXQocmVleHBvcnQubmFtZSwgcmVleHBvcnQuZGVjbGFyYXRpb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtb2R1bGVNYXA7XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RDb21tb25Kc0V4cG9ydERlY2xhcmF0aW9uKHN0YXRlbWVudDogQ29tbW9uSnNFeHBvcnRTdGF0ZW1lbnQpOlxuICAgICAgQ29tbW9uSnNFeHBvcnREZWNsYXJhdGlvbiB7XG4gICAgY29uc3QgZXhwb3J0RXhwcmVzc2lvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uLnJpZ2h0O1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbihleHBvcnRFeHByZXNzaW9uKTtcbiAgICBjb25zdCBuYW1lID0gc3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdC5uYW1lLnRleHQ7XG4gICAgaWYgKGRlY2xhcmF0aW9uICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4ge25hbWUsIGRlY2xhcmF0aW9ufTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgZGVjbGFyYXRpb246IHtcbiAgICAgICAgICBub2RlOiBudWxsLFxuICAgICAgICAgIGV4cHJlc3Npb246IGV4cG9ydEV4cHJlc3Npb24sXG4gICAgICAgICAgdmlhTW9kdWxlOiBudWxsLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RDb21tb25Kc1JlZXhwb3J0cyhzdGF0ZW1lbnQ6IFJlZXhwb3J0U3RhdGVtZW50LCBjb250YWluaW5nRmlsZTogdHMuU291cmNlRmlsZSk6XG4gICAgICBDb21tb25Kc0V4cG9ydERlY2xhcmF0aW9uW10ge1xuICAgIGNvbnN0IHJlZXhwb3J0czogQ29tbW9uSnNFeHBvcnREZWNsYXJhdGlvbltdID0gW107XG4gICAgY29uc3QgcmVxdWlyZUNhbGwgPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5hcmd1bWVudHNbMF07XG4gICAgY29uc3QgaW1wb3J0UGF0aCA9IHJlcXVpcmVDYWxsLmFyZ3VtZW50c1swXS50ZXh0O1xuICAgIGNvbnN0IGltcG9ydGVkRmlsZSA9IHRoaXMucmVzb2x2ZU1vZHVsZU5hbWUoaW1wb3J0UGF0aCwgY29udGFpbmluZ0ZpbGUpO1xuICAgIGlmIChpbXBvcnRlZEZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgdmlhTW9kdWxlID0gc3RyaXBFeHRlbnNpb24oaW1wb3J0ZWRGaWxlLmZpbGVOYW1lKTtcbiAgICAgIGNvbnN0IGltcG9ydGVkRXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKGltcG9ydGVkRmlsZSk7XG4gICAgICBpZiAoaW1wb3J0ZWRFeHBvcnRzICE9PSBudWxsKSB7XG4gICAgICAgIGltcG9ydGVkRXhwb3J0cy5mb3JFYWNoKChkZWNsLCBuYW1lKSA9PiB7XG4gICAgICAgICAgaWYgKGRlY2wubm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVleHBvcnRzLnB1c2goe25hbWUsIGRlY2xhcmF0aW9uOiB7bm9kZTogZGVjbC5ub2RlLCB2aWFNb2R1bGV9fSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlZXhwb3J0cy5wdXNoKFxuICAgICAgICAgICAgICAgIHtuYW1lLCBkZWNsYXJhdGlvbjoge25vZGU6IG51bGwsIGV4cHJlc3Npb246IGRlY2wuZXhwcmVzc2lvbiwgdmlhTW9kdWxlfX0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZWV4cG9ydHM7XG4gIH1cblxuICBwcml2YXRlIGZpbmRDb21tb25Kc0ltcG9ydChpZDogdHMuSWRlbnRpZmllcik6IFJlcXVpcmVDYWxsfG51bGwge1xuICAgIC8vIElzIGBpZGAgYSBuYW1lc3BhY2VkIHByb3BlcnR5IGFjY2VzcywgZS5nLiBgRGlyZWN0aXZlYCBpbiBgY29yZS5EaXJlY3RpdmVgP1xuICAgIC8vIElmIHNvIGNhcHR1cmUgdGhlIHN5bWJvbCBvZiB0aGUgbmFtZXNwYWNlLCBlLmcuIGBjb3JlYC5cbiAgICBjb25zdCBuc0lkZW50aWZpZXIgPSBmaW5kTmFtZXNwYWNlT2ZJZGVudGlmaWVyKGlkKTtcbiAgICBjb25zdCBuc1N5bWJvbCA9IG5zSWRlbnRpZmllciAmJiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihuc0lkZW50aWZpZXIpIHx8IG51bGw7XG4gICAgY29uc3QgbnNEZWNsYXJhdGlvbiA9IG5zU3ltYm9sICYmIG5zU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgY29uc3QgaW5pdGlhbGl6ZXIgPVxuICAgICAgICBuc0RlY2xhcmF0aW9uICYmIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihuc0RlY2xhcmF0aW9uKSAmJiBuc0RlY2xhcmF0aW9uLmluaXRpYWxpemVyIHx8XG4gICAgICAgIG51bGw7XG4gICAgcmV0dXJuIGluaXRpYWxpemVyICYmIGlzUmVxdWlyZUNhbGwoaW5pdGlhbGl6ZXIpID8gaW5pdGlhbGl6ZXIgOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDb21tb25Kc0ltcG9ydGVkRGVjbGFyYXRpb24oaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBpbXBvcnRJbmZvID0gdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoaWQpO1xuICAgIGlmIChpbXBvcnRJbmZvID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRlZEZpbGUgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKGltcG9ydEluZm8uZnJvbSwgaWQuZ2V0U291cmNlRmlsZSgpKTtcbiAgICBpZiAoaW1wb3J0ZWRGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHZpYU1vZHVsZSA9ICFpbXBvcnRJbmZvLmZyb20uc3RhcnRzV2l0aCgnLicpID8gaW1wb3J0SW5mby5mcm9tIDogbnVsbDtcbiAgICByZXR1cm4ge25vZGU6IGltcG9ydGVkRmlsZSwgdmlhTW9kdWxlfTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZU1vZHVsZU5hbWUobW9kdWxlTmFtZTogc3RyaW5nLCBjb250YWluaW5nRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGVcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmNvbXBpbGVySG9zdC5yZXNvbHZlTW9kdWxlTmFtZXMpIHtcbiAgICAgIC8vIEZJWE1FOiByZW1vdmUgdGhlIFwiYXMgYW55XCIgY2FzdCBvbmNlIG9uIFRTMy42LlxuICAgICAgY29uc3QgbW9kdWxlSW5mbyA9ICh0aGlzLmNvbXBpbGVySG9zdCBhcyBhbnkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXNvbHZlTW9kdWxlTmFtZXMoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbbW9kdWxlTmFtZV0sIGNvbnRhaW5pbmdGaWxlLmZpbGVOYW1lLCB1bmRlZmluZWQsIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJvZ3JhbS5nZXRDb21waWxlck9wdGlvbnMoKSlbMF07XG4gICAgICByZXR1cm4gbW9kdWxlSW5mbyAmJiB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZShhYnNvbHV0ZUZyb20obW9kdWxlSW5mby5yZXNvbHZlZEZpbGVOYW1lKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG1vZHVsZUluZm8gPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShcbiAgICAgICAgICBtb2R1bGVOYW1lLCBjb250YWluaW5nRmlsZS5maWxlTmFtZSwgdGhpcy5wcm9ncmFtLmdldENvbXBpbGVyT3B0aW9ucygpLFxuICAgICAgICAgIHRoaXMuY29tcGlsZXJIb3N0KTtcbiAgICAgIHJldHVybiBtb2R1bGVJbmZvLnJlc29sdmVkTW9kdWxlICYmXG4gICAgICAgICAgdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUoYWJzb2x1dGVGcm9tKG1vZHVsZUluZm8ucmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZSkpO1xuICAgIH1cbiAgfVxufVxuXG50eXBlIENvbW1vbkpzRXhwb3J0U3RhdGVtZW50ID0gdHMuRXhwcmVzc2lvblN0YXRlbWVudCAmIHtcbiAgZXhwcmVzc2lvbjpcbiAgICAgIHRzLkJpbmFyeUV4cHJlc3Npb24gJiB7bGVmdDogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uICYge2V4cHJlc3Npb246IHRzLklkZW50aWZpZXJ9fVxufTtcbmV4cG9ydCBmdW5jdGlvbiBpc0NvbW1vbkpzRXhwb3J0U3RhdGVtZW50KHM6IHRzLlN0YXRlbWVudCk6IHMgaXMgQ29tbW9uSnNFeHBvcnRTdGF0ZW1lbnQge1xuICByZXR1cm4gdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHMpICYmIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihzLmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihzLmV4cHJlc3Npb24ubGVmdCkgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihzLmV4cHJlc3Npb24ubGVmdC5leHByZXNzaW9uKSAmJlxuICAgICAgcy5leHByZXNzaW9uLmxlZnQuZXhwcmVzc2lvbi50ZXh0ID09PSAnZXhwb3J0cyc7XG59XG5cbmludGVyZmFjZSBDb21tb25Kc0V4cG9ydERlY2xhcmF0aW9uIHtcbiAgbmFtZTogc3RyaW5nO1xuICBkZWNsYXJhdGlvbjogRGVjbGFyYXRpb247XG59XG5cbmV4cG9ydCB0eXBlIFJlcXVpcmVDYWxsID0gdHMuQ2FsbEV4cHJlc3Npb24gJiB7YXJndW1lbnRzOiBbdHMuU3RyaW5nTGl0ZXJhbF19O1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVxdWlyZUNhbGwobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgUmVxdWlyZUNhbGwge1xuICByZXR1cm4gdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSAmJiB0cy5pc0lkZW50aWZpZXIobm9kZS5leHByZXNzaW9uKSAmJlxuICAgICAgbm9kZS5leHByZXNzaW9uLnRleHQgPT09ICdyZXF1aXJlJyAmJiBub2RlLmFyZ3VtZW50cy5sZW5ndGggPT09IDEgJiZcbiAgICAgIHRzLmlzU3RyaW5nTGl0ZXJhbChub2RlLmFyZ3VtZW50c1swXSk7XG59XG5cbi8qKlxuICogSWYgdGhlIGlkZW50aWZpZXIgYGlkYCBpcyB0aGUgUkhTIG9mIGEgcHJvcGVydHkgYWNjZXNzIG9mIHRoZSBmb3JtIGBuYW1lc3BhY2UuaWRgXG4gKiBhbmQgYG5hbWVzcGFjZWAgaXMgYW4gaWRlbnRpZmVyIHRoZW4gcmV0dXJuIGBuYW1lc3BhY2VgLCBvdGhlcndpc2UgYG51bGxgLlxuICogQHBhcmFtIGlkIFRoZSBpZGVudGlmaWVyIHdob3NlIG5hbWVzcGFjZSB3ZSB3YW50IHRvIGZpbmQuXG4gKi9cbmZ1bmN0aW9uIGZpbmROYW1lc3BhY2VPZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICByZXR1cm4gaWQucGFyZW50ICYmIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGlkLnBhcmVudCkgJiZcbiAgICAgICAgICB0cy5pc0lkZW50aWZpZXIoaWQucGFyZW50LmV4cHJlc3Npb24pID9cbiAgICAgIGlkLnBhcmVudC5leHByZXNzaW9uIDpcbiAgICAgIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcFBhcmVudGhlc2VzKG5vZGU6IHRzLk5vZGUpOiB0cy5Ob2RlIHtcbiAgcmV0dXJuIHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkgPyBub2RlLmV4cHJlc3Npb24gOiBub2RlO1xufVxuXG50eXBlIFJlZXhwb3J0U3RhdGVtZW50ID0gdHMuRXhwcmVzc2lvblN0YXRlbWVudCAmIHtleHByZXNzaW9uOiB7YXJndW1lbnRzOiBbUmVxdWlyZUNhbGxdfX07XG5mdW5jdGlvbiBpc1JlZXhwb3J0U3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogc3RhdGVtZW50IGlzIFJlZXhwb3J0U3RhdGVtZW50IHtcbiAgcmV0dXJuIHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpICYmIHRzLmlzQ2FsbEV4cHJlc3Npb24oc3RhdGVtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIoc3RhdGVtZW50LmV4cHJlc3Npb24uZXhwcmVzc2lvbikgJiZcbiAgICAgIHN0YXRlbWVudC5leHByZXNzaW9uLmV4cHJlc3Npb24udGV4dCA9PT0gJ19fZXhwb3J0JyAmJlxuICAgICAgc3RhdGVtZW50LmV4cHJlc3Npb24uYXJndW1lbnRzLmxlbmd0aCA9PT0gMSAmJlxuICAgICAgaXNSZXF1aXJlQ2FsbChzdGF0ZW1lbnQuZXhwcmVzc2lvbi5hcmd1bWVudHNbMF0pO1xufVxuXG5mdW5jdGlvbiBzdHJpcEV4dGVuc2lvbihmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGZpbGVOYW1lLnJlcGxhY2UoL1xcLi4rJC8sICcnKTtcbn1cblxuZnVuY3Rpb24gZ2V0T3JEZWZhdWx0PEssIFY+KG1hcDogTWFwPEssIFY+LCBrZXk6IEssIGZhY3Rvcnk6IChrZXk6IEspID0+IFYpOiBWIHtcbiAgaWYgKCFtYXAuaGFzKGtleSkpIHtcbiAgICBtYXAuc2V0KGtleSwgZmFjdG9yeShrZXkpKTtcbiAgfVxuICByZXR1cm4gbWFwLmdldChrZXkpICE7XG59XG4iXX0=