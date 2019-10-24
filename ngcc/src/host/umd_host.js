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
        define("@angular/compiler-cli/ngcc/src/host/umd_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/host/esm5_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var esm5_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm5_host");
    var UmdReflectionHost = /** @class */ (function (_super) {
        tslib_1.__extends(UmdReflectionHost, _super);
        function UmdReflectionHost(logger, isCore, program, compilerHost, dts) {
            var _this = _super.call(this, logger, isCore, program.getTypeChecker(), dts) || this;
            _this.program = program;
            _this.compilerHost = compilerHost;
            _this.umdModules = new Map();
            _this.umdExports = new Map();
            _this.umdImportPaths = new Map();
            return _this;
        }
        UmdReflectionHost.prototype.getImportOfIdentifier = function (id) {
            var superImport = _super.prototype.getImportOfIdentifier.call(this, id);
            if (superImport !== null) {
                return superImport;
            }
            var importParameter = this.findUmdImportParameter(id);
            var from = importParameter && this.getUmdImportPath(importParameter);
            return from !== null ? { from: from, name: id.text } : null;
        };
        UmdReflectionHost.prototype.getDeclarationOfIdentifier = function (id) {
            return this.getUmdImportedDeclaration(id) || _super.prototype.getDeclarationOfIdentifier.call(this, id);
        };
        UmdReflectionHost.prototype.getExportsOfModule = function (module) {
            return _super.prototype.getExportsOfModule.call(this, module) || this.getUmdExports(module.getSourceFile());
        };
        UmdReflectionHost.prototype.getUmdModule = function (sourceFile) {
            if (sourceFile.isDeclarationFile) {
                return null;
            }
            if (!this.umdModules.has(sourceFile)) {
                if (sourceFile.statements.length !== 1) {
                    throw new Error("Expected UMD module file (" + sourceFile.fileName + ") to contain exactly one statement, but found " + sourceFile.statements + ".");
                }
                this.umdModules.set(sourceFile, parseStatementForUmdModule(sourceFile.statements[0]));
            }
            return this.umdModules.get(sourceFile);
        };
        UmdReflectionHost.prototype.getUmdImportPath = function (importParameter) {
            var e_1, _a;
            if (this.umdImportPaths.has(importParameter)) {
                return this.umdImportPaths.get(importParameter);
            }
            var umdModule = this.getUmdModule(importParameter.getSourceFile());
            if (umdModule === null) {
                return null;
            }
            var imports = getImportsOfUmdModule(umdModule);
            if (imports === null) {
                return null;
            }
            try {
                for (var imports_1 = tslib_1.__values(imports), imports_1_1 = imports_1.next(); !imports_1_1.done; imports_1_1 = imports_1.next()) {
                    var i = imports_1_1.value;
                    this.umdImportPaths.set(i.parameter, i.path);
                    if (i.parameter === importParameter) {
                        return i.path;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (imports_1_1 && !imports_1_1.done && (_a = imports_1.return)) _a.call(imports_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return null;
        };
        UmdReflectionHost.prototype.getUmdExports = function (sourceFile) {
            if (!this.umdExports.has(sourceFile)) {
                var moduleExports = this.computeExportsOfUmdModule(sourceFile);
                this.umdExports.set(sourceFile, moduleExports);
            }
            return this.umdExports.get(sourceFile);
        };
        /** Get the top level statements for a module.
         *
         * In UMD modules these are the body of the UMD factory function.
         *
         * @param sourceFile The module whose statements we want.
         * @returns An array of top level statements for the given module.
         */
        UmdReflectionHost.prototype.getModuleStatements = function (sourceFile) {
            var umdModule = this.getUmdModule(sourceFile);
            return umdModule !== null ? Array.from(umdModule.factoryFn.body.statements) : [];
        };
        UmdReflectionHost.prototype.computeExportsOfUmdModule = function (sourceFile) {
            var _this = this;
            var moduleMap = new Map();
            var exportStatements = this.getModuleStatements(sourceFile).filter(isUmdExportStatement);
            var exportDeclarations = exportStatements.map(function (statement) { return _this.extractUmdExportDeclaration(statement); });
            exportDeclarations.forEach(function (decl) {
                if (decl) {
                    moduleMap.set(decl.name, decl.declaration);
                }
            });
            return moduleMap;
        };
        UmdReflectionHost.prototype.extractUmdExportDeclaration = function (statement) {
            var exportExpression = statement.expression.right;
            var name = statement.expression.left.name.text;
            var declaration = this.getDeclarationOfExpression(exportExpression);
            if (declaration === null) {
                return null;
            }
            return { name: name, declaration: declaration };
        };
        UmdReflectionHost.prototype.findUmdImportParameter = function (id) {
            // Is `id` a namespaced property access, e.g. `Directive` in `core.Directive`?
            // If so capture the symbol of the namespace, e.g. `core`.
            var nsIdentifier = findNamespaceOfIdentifier(id);
            var nsSymbol = nsIdentifier && this.checker.getSymbolAtLocation(nsIdentifier) || null;
            // Is the namespace a parameter on a UMD factory function, e.g. `function factory(this, core)`?
            // If so then return its declaration.
            var nsDeclaration = nsSymbol && nsSymbol.valueDeclaration;
            return nsDeclaration && ts.isParameter(nsDeclaration) ? nsDeclaration : null;
        };
        UmdReflectionHost.prototype.getUmdImportedDeclaration = function (id) {
            var importInfo = this.getImportOfIdentifier(id);
            if (importInfo === null) {
                return null;
            }
            var importedFile = this.resolveModuleName(importInfo.from, id.getSourceFile());
            if (importedFile === undefined) {
                return null;
            }
            // We need to add the `viaModule` because  the `getExportsOfModule()` call
            // did not know that we were importing the declaration.
            return { node: importedFile, viaModule: importInfo.from };
        };
        UmdReflectionHost.prototype.resolveModuleName = function (moduleName, containingFile) {
            if (this.compilerHost.resolveModuleNames) {
                var moduleInfo = this.compilerHost.resolveModuleNames([moduleName], containingFile.fileName, undefined, undefined, this.program.getCompilerOptions())[0];
                return moduleInfo && this.program.getSourceFile(file_system_1.absoluteFrom(moduleInfo.resolvedFileName));
            }
            else {
                var moduleInfo = ts.resolveModuleName(moduleName, containingFile.fileName, this.program.getCompilerOptions(), this.compilerHost);
                return moduleInfo.resolvedModule &&
                    this.program.getSourceFile(file_system_1.absoluteFrom(moduleInfo.resolvedModule.resolvedFileName));
            }
        };
        return UmdReflectionHost;
    }(esm5_host_1.Esm5ReflectionHost));
    exports.UmdReflectionHost = UmdReflectionHost;
    function parseStatementForUmdModule(statement) {
        var wrapperCall = getUmdWrapperCall(statement);
        if (!wrapperCall)
            return null;
        var wrapperFn = wrapperCall.expression;
        if (!ts.isFunctionExpression(wrapperFn))
            return null;
        var factoryFnParamIndex = wrapperFn.parameters.findIndex(function (parameter) { return ts.isIdentifier(parameter.name) && parameter.name.text === 'factory'; });
        if (factoryFnParamIndex === -1)
            return null;
        var factoryFn = stripParentheses(wrapperCall.arguments[factoryFnParamIndex]);
        if (!factoryFn || !ts.isFunctionExpression(factoryFn))
            return null;
        return { wrapperFn: wrapperFn, factoryFn: factoryFn };
    }
    exports.parseStatementForUmdModule = parseStatementForUmdModule;
    function getUmdWrapperCall(statement) {
        if (!ts.isExpressionStatement(statement) || !ts.isParenthesizedExpression(statement.expression) ||
            !ts.isCallExpression(statement.expression.expression) ||
            !ts.isFunctionExpression(statement.expression.expression.expression)) {
            return null;
        }
        return statement.expression.expression;
    }
    function getImportsOfUmdModule(umdModule) {
        var imports = [];
        for (var i = 1; i < umdModule.factoryFn.parameters.length; i++) {
            imports.push({
                parameter: umdModule.factoryFn.parameters[i],
                path: getRequiredModulePath(umdModule.wrapperFn, i)
            });
        }
        return imports;
    }
    exports.getImportsOfUmdModule = getImportsOfUmdModule;
    function isUmdExportStatement(s) {
        return ts.isExpressionStatement(s) && ts.isBinaryExpression(s.expression) &&
            ts.isPropertyAccessExpression(s.expression.left) &&
            ts.isIdentifier(s.expression.left.expression) &&
            s.expression.left.expression.text === 'exports';
    }
    function getRequiredModulePath(wrapperFn, paramIndex) {
        var statement = wrapperFn.body.statements[0];
        if (!ts.isExpressionStatement(statement)) {
            throw new Error('UMD wrapper body is not an expression statement:\n' + wrapperFn.body.getText());
        }
        var modulePaths = [];
        findModulePaths(statement.expression);
        // Since we were only interested in the `require()` calls, we miss the `exports` argument, so we
        // need to subtract 1.
        // E.g. `function(exports, dep1, dep2)` maps to `function(exports, require('path/to/dep1'),
        // require('path/to/dep2'))`
        return modulePaths[paramIndex - 1];
        // Search the statement for calls to `require('...')` and extract the string value of the first
        // argument
        function findModulePaths(node) {
            if (isRequireCall(node)) {
                var argument = node.arguments[0];
                if (ts.isStringLiteral(argument)) {
                    modulePaths.push(argument.text);
                }
            }
            else {
                node.forEachChild(findModulePaths);
            }
        }
    }
    function isRequireCall(node) {
        return ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
            node.expression.text === 'require' && node.arguments.length === 1;
    }
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW1kX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvaG9zdC91bWRfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsMkVBQTREO0lBSTVELDJFQUErQztJQUUvQztRQUF1Qyw2Q0FBa0I7UUFJdkQsMkJBQ0ksTUFBYyxFQUFFLE1BQWUsRUFBWSxPQUFtQixFQUNwRCxZQUE2QixFQUFFLEdBQXdCO1lBRnJFLFlBR0Usa0JBQU0sTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsR0FBRyxDQUFDLFNBQ3JEO1lBSDhDLGFBQU8sR0FBUCxPQUFPLENBQVk7WUFDcEQsa0JBQVksR0FBWixZQUFZLENBQWlCO1lBTGpDLGdCQUFVLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7WUFDdEQsZ0JBQVUsR0FBRyxJQUFJLEdBQUcsRUFBZ0QsQ0FBQztZQUNyRSxvQkFBYyxHQUFHLElBQUksR0FBRyxFQUF3QyxDQUFDOztRQUszRSxDQUFDO1FBRUQsaURBQXFCLEdBQXJCLFVBQXNCLEVBQWlCO1lBQ3JDLElBQU0sV0FBVyxHQUFHLGlCQUFNLHFCQUFxQixZQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELElBQUksV0FBVyxLQUFLLElBQUksRUFBRTtnQkFDeEIsT0FBTyxXQUFXLENBQUM7YUFDcEI7WUFFRCxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEQsSUFBTSxJQUFJLEdBQUcsZUFBZSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN2RSxPQUFPLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxNQUFBLEVBQUUsSUFBSSxFQUFF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LEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3JFLENBQUM7SUFGRCw0Q0FFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEZWNsYXJhdGlvbiwgSW1wb3J0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtCdW5kbGVQcm9ncmFtfSBmcm9tICcuLi9wYWNrYWdlcy9idW5kbGVfcHJvZ3JhbSc7XG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi9lc201X2hvc3QnO1xuXG5leHBvcnQgY2xhc3MgVW1kUmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBFc201UmVmbGVjdGlvbkhvc3Qge1xuICBwcm90ZWN0ZWQgdW1kTW9kdWxlcyA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgVW1kTW9kdWxlfG51bGw+KCk7XG4gIHByb3RlY3RlZCB1bWRFeHBvcnRzID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj58bnVsbD4oKTtcbiAgcHJvdGVjdGVkIHVtZEltcG9ydFBhdGhzID0gbmV3IE1hcDx0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiwgc3RyaW5nfG51bGw+KCk7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgbG9nZ2VyOiBMb2dnZXIsIGlzQ29yZTogYm9vbGVhbiwgcHJvdGVjdGVkIHByb2dyYW06IHRzLlByb2dyYW0sXG4gICAgICBwcm90ZWN0ZWQgY29tcGlsZXJIb3N0OiB0cy5Db21waWxlckhvc3QsIGR0cz86IEJ1bmRsZVByb2dyYW18bnVsbCkge1xuICAgIHN1cGVyKGxvZ2dlciwgaXNDb3JlLCBwcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIGR0cyk7XG4gIH1cblxuICBnZXRJbXBvcnRPZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBJbXBvcnR8bnVsbCB7XG4gICAgY29uc3Qgc3VwZXJJbXBvcnQgPSBzdXBlci5nZXRJbXBvcnRPZklkZW50aWZpZXIoaWQpO1xuICAgIGlmIChzdXBlckltcG9ydCAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHN1cGVySW1wb3J0O1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydFBhcmFtZXRlciA9IHRoaXMuZmluZFVtZEltcG9ydFBhcmFtZXRlcihpZCk7XG4gICAgY29uc3QgZnJvbSA9IGltcG9ydFBhcmFtZXRlciAmJiB0aGlzLmdldFVtZEltcG9ydFBhdGgoaW1wb3J0UGFyYW1ldGVyKTtcbiAgICByZXR1cm4gZnJvbSAhPT0gbnVsbCA/IHtmcm9tLCBuYW1lOiBpZC50ZXh0fSA6IG51bGw7XG4gIH1cblxuICBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldFVtZEltcG9ydGVkRGVjbGFyYXRpb24oaWQpIHx8IHN1cGVyLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkKTtcbiAgfVxuXG4gIGdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGU6IHRzLk5vZGUpOiBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj58bnVsbCB7XG4gICAgcmV0dXJuIHN1cGVyLmdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGUpIHx8IHRoaXMuZ2V0VW1kRXhwb3J0cyhtb2R1bGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgfVxuXG4gIGdldFVtZE1vZHVsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogVW1kTW9kdWxlfG51bGwge1xuICAgIGlmIChzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKCF0aGlzLnVtZE1vZHVsZXMuaGFzKHNvdXJjZUZpbGUpKSB7XG4gICAgICBpZiAoc291cmNlRmlsZS5zdGF0ZW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgRXhwZWN0ZWQgVU1EIG1vZHVsZSBmaWxlICgke3NvdXJjZUZpbGUuZmlsZU5hbWV9KSB0byBjb250YWluIGV4YWN0bHkgb25lIHN0YXRlbWVudCwgYnV0IGZvdW5kICR7c291cmNlRmlsZS5zdGF0ZW1lbnRzfS5gKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudW1kTW9kdWxlcy5zZXQoc291cmNlRmlsZSwgcGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGUoc291cmNlRmlsZS5zdGF0ZW1lbnRzWzBdKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnVtZE1vZHVsZXMuZ2V0KHNvdXJjZUZpbGUpICE7XG4gIH1cblxuICBnZXRVbWRJbXBvcnRQYXRoKGltcG9ydFBhcmFtZXRlcjogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKHRoaXMudW1kSW1wb3J0UGF0aHMuaGFzKGltcG9ydFBhcmFtZXRlcikpIHtcbiAgICAgIHJldHVybiB0aGlzLnVtZEltcG9ydFBhdGhzLmdldChpbXBvcnRQYXJhbWV0ZXIpICE7XG4gICAgfVxuXG4gICAgY29uc3QgdW1kTW9kdWxlID0gdGhpcy5nZXRVbWRNb2R1bGUoaW1wb3J0UGFyYW1ldGVyLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgaWYgKHVtZE1vZHVsZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0cyA9IGdldEltcG9ydHNPZlVtZE1vZHVsZSh1bWRNb2R1bGUpO1xuICAgIGlmIChpbXBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGkgb2YgaW1wb3J0cykge1xuICAgICAgdGhpcy51bWRJbXBvcnRQYXRocy5zZXQoaS5wYXJhbWV0ZXIsIGkucGF0aCk7XG4gICAgICBpZiAoaS5wYXJhbWV0ZXIgPT09IGltcG9ydFBhcmFtZXRlcikge1xuICAgICAgICByZXR1cm4gaS5wYXRoO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZ2V0VW1kRXhwb3J0cyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGwge1xuICAgIGlmICghdGhpcy51bWRFeHBvcnRzLmhhcyhzb3VyY2VGaWxlKSkge1xuICAgICAgY29uc3QgbW9kdWxlRXhwb3J0cyA9IHRoaXMuY29tcHV0ZUV4cG9ydHNPZlVtZE1vZHVsZShzb3VyY2VGaWxlKTtcbiAgICAgIHRoaXMudW1kRXhwb3J0cy5zZXQoc291cmNlRmlsZSwgbW9kdWxlRXhwb3J0cyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnVtZEV4cG9ydHMuZ2V0KHNvdXJjZUZpbGUpICE7XG4gIH1cblxuICAvKiogR2V0IHRoZSB0b3AgbGV2ZWwgc3RhdGVtZW50cyBmb3IgYSBtb2R1bGUuXG4gICAqXG4gICAqIEluIFVNRCBtb2R1bGVzIHRoZXNlIGFyZSB0aGUgYm9keSBvZiB0aGUgVU1EIGZhY3RvcnkgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBtb2R1bGUgd2hvc2Ugc3RhdGVtZW50cyB3ZSB3YW50LlxuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiB0b3AgbGV2ZWwgc3RhdGVtZW50cyBmb3IgdGhlIGdpdmVuIG1vZHVsZS5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRNb2R1bGVTdGF0ZW1lbnRzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgY29uc3QgdW1kTW9kdWxlID0gdGhpcy5nZXRVbWRNb2R1bGUoc291cmNlRmlsZSk7XG4gICAgcmV0dXJuIHVtZE1vZHVsZSAhPT0gbnVsbCA/IEFycmF5LmZyb20odW1kTW9kdWxlLmZhY3RvcnlGbi5ib2R5LnN0YXRlbWVudHMpIDogW107XG4gIH1cblxuICBwcml2YXRlIGNvbXB1dGVFeHBvcnRzT2ZVbWRNb2R1bGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsIHtcbiAgICBjb25zdCBtb2R1bGVNYXAgPSBuZXcgTWFwPHN0cmluZywgRGVjbGFyYXRpb24+KCk7XG4gICAgY29uc3QgZXhwb3J0U3RhdGVtZW50cyA9IHRoaXMuZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlKS5maWx0ZXIoaXNVbWRFeHBvcnRTdGF0ZW1lbnQpO1xuICAgIGNvbnN0IGV4cG9ydERlY2xhcmF0aW9ucyA9XG4gICAgICAgIGV4cG9ydFN0YXRlbWVudHMubWFwKHN0YXRlbWVudCA9PiB0aGlzLmV4dHJhY3RVbWRFeHBvcnREZWNsYXJhdGlvbihzdGF0ZW1lbnQpKTtcbiAgICBleHBvcnREZWNsYXJhdGlvbnMuZm9yRWFjaChkZWNsID0+IHtcbiAgICAgIGlmIChkZWNsKSB7XG4gICAgICAgIG1vZHVsZU1hcC5zZXQoZGVjbC5uYW1lLCBkZWNsLmRlY2xhcmF0aW9uKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbW9kdWxlTWFwO1xuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0VW1kRXhwb3J0RGVjbGFyYXRpb24oc3RhdGVtZW50OiBVbWRFeHBvcnRTdGF0ZW1lbnQpOiBVbWRFeHBvcnREZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBleHBvcnRFeHByZXNzaW9uID0gc3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQ7XG4gICAgY29uc3QgbmFtZSA9IHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQubmFtZS50ZXh0O1xuXG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZFeHByZXNzaW9uKGV4cG9ydEV4cHJlc3Npb24pO1xuICAgIGlmIChkZWNsYXJhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtuYW1lLCBkZWNsYXJhdGlvbn07XG4gIH1cblxuICBwcml2YXRlIGZpbmRVbWRJbXBvcnRQYXJhbWV0ZXIoaWQ6IHRzLklkZW50aWZpZXIpOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbnxudWxsIHtcbiAgICAvLyBJcyBgaWRgIGEgbmFtZXNwYWNlZCBwcm9wZXJ0eSBhY2Nlc3MsIGUuZy4gYERpcmVjdGl2ZWAgaW4gYGNvcmUuRGlyZWN0aXZlYD9cbiAgICAvLyBJZiBzbyBjYXB0dXJlIHRoZSBzeW1ib2wgb2YgdGhlIG5hbWVzcGFjZSwgZS5nLiBgY29yZWAuXG4gICAgY29uc3QgbnNJZGVudGlmaWVyID0gZmluZE5hbWVzcGFjZU9mSWRlbnRpZmllcihpZCk7XG4gICAgY29uc3QgbnNTeW1ib2wgPSBuc0lkZW50aWZpZXIgJiYgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obnNJZGVudGlmaWVyKSB8fCBudWxsO1xuXG4gICAgLy8gSXMgdGhlIG5hbWVzcGFjZSBhIHBhcmFtZXRlciBvbiBhIFVNRCBmYWN0b3J5IGZ1bmN0aW9uLCBlLmcuIGBmdW5jdGlvbiBmYWN0b3J5KHRoaXMsIGNvcmUpYD9cbiAgICAvLyBJZiBzbyB0aGVuIHJldHVybiBpdHMgZGVjbGFyYXRpb24uXG4gICAgY29uc3QgbnNEZWNsYXJhdGlvbiA9IG5zU3ltYm9sICYmIG5zU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgcmV0dXJuIG5zRGVjbGFyYXRpb24gJiYgdHMuaXNQYXJhbWV0ZXIobnNEZWNsYXJhdGlvbikgPyBuc0RlY2xhcmF0aW9uIDogbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VW1kSW1wb3J0ZWREZWNsYXJhdGlvbihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IGltcG9ydEluZm8gPSB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcihpZCk7XG4gICAgaWYgKGltcG9ydEluZm8gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydGVkRmlsZSA9IHRoaXMucmVzb2x2ZU1vZHVsZU5hbWUoaW1wb3J0SW5mby5mcm9tLCBpZC5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGlmIChpbXBvcnRlZEZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gV2UgbmVlZCB0byBhZGQgdGhlIGB2aWFNb2R1bGVgIGJlY2F1c2UgIHRoZSBgZ2V0RXhwb3J0c09mTW9kdWxlKClgIGNhbGxcbiAgICAvLyBkaWQgbm90IGtub3cgdGhhdCB3ZSB3ZXJlIGltcG9ydGluZyB0aGUgZGVjbGFyYXRpb24uXG4gICAgcmV0dXJuIHtub2RlOiBpbXBvcnRlZEZpbGUsIHZpYU1vZHVsZTogaW1wb3J0SW5mby5mcm9tfTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZU1vZHVsZU5hbWUobW9kdWxlTmFtZTogc3RyaW5nLCBjb250YWluaW5nRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGVcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmNvbXBpbGVySG9zdC5yZXNvbHZlTW9kdWxlTmFtZXMpIHtcbiAgICAgIGNvbnN0IG1vZHVsZUluZm8gPSB0aGlzLmNvbXBpbGVySG9zdC5yZXNvbHZlTW9kdWxlTmFtZXMoXG4gICAgICAgICAgW21vZHVsZU5hbWVdLCBjb250YWluaW5nRmlsZS5maWxlTmFtZSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsXG4gICAgICAgICAgdGhpcy5wcm9ncmFtLmdldENvbXBpbGVyT3B0aW9ucygpKVswXTtcbiAgICAgIHJldHVybiBtb2R1bGVJbmZvICYmIHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGFic29sdXRlRnJvbShtb2R1bGVJbmZvLnJlc29sdmVkRmlsZU5hbWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbW9kdWxlSW5mbyA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKFxuICAgICAgICAgIG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLmZpbGVOYW1lLCB0aGlzLnByb2dyYW0uZ2V0Q29tcGlsZXJPcHRpb25zKCksXG4gICAgICAgICAgdGhpcy5jb21waWxlckhvc3QpO1xuICAgICAgcmV0dXJuIG1vZHVsZUluZm8ucmVzb2x2ZWRNb2R1bGUgJiZcbiAgICAgICAgICB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZShhYnNvbHV0ZUZyb20obW9kdWxlSW5mby5yZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lKSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVN0YXRlbWVudEZvclVtZE1vZHVsZShzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IFVtZE1vZHVsZXxudWxsIHtcbiAgY29uc3Qgd3JhcHBlckNhbGwgPSBnZXRVbWRXcmFwcGVyQ2FsbChzdGF0ZW1lbnQpO1xuICBpZiAoIXdyYXBwZXJDYWxsKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCB3cmFwcGVyRm4gPSB3cmFwcGVyQ2FsbC5leHByZXNzaW9uO1xuICBpZiAoIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHdyYXBwZXJGbikpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGZhY3RvcnlGblBhcmFtSW5kZXggPSB3cmFwcGVyRm4ucGFyYW1ldGVycy5maW5kSW5kZXgoXG4gICAgICBwYXJhbWV0ZXIgPT4gdHMuaXNJZGVudGlmaWVyKHBhcmFtZXRlci5uYW1lKSAmJiBwYXJhbWV0ZXIubmFtZS50ZXh0ID09PSAnZmFjdG9yeScpO1xuICBpZiAoZmFjdG9yeUZuUGFyYW1JbmRleCA9PT0gLTEpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGZhY3RvcnlGbiA9IHN0cmlwUGFyZW50aGVzZXMod3JhcHBlckNhbGwuYXJndW1lbnRzW2ZhY3RvcnlGblBhcmFtSW5kZXhdKTtcbiAgaWYgKCFmYWN0b3J5Rm4gfHwgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGZhY3RvcnlGbikpIHJldHVybiBudWxsO1xuXG4gIHJldHVybiB7d3JhcHBlckZuLCBmYWN0b3J5Rm59O1xufVxuXG5mdW5jdGlvbiBnZXRVbWRXcmFwcGVyQ2FsbChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHRzLkNhbGxFeHByZXNzaW9uJlxuICAgIHtleHByZXNzaW9uOiB0cy5GdW5jdGlvbkV4cHJlc3Npb259fG51bGwge1xuICBpZiAoIXRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpIHx8ICF0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKHN0YXRlbWVudC5leHByZXNzaW9uKSB8fFxuICAgICAgIXRzLmlzQ2FsbEV4cHJlc3Npb24oc3RhdGVtZW50LmV4cHJlc3Npb24uZXhwcmVzc2lvbikgfHxcbiAgICAgICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5leHByZXNzaW9uLmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHN0YXRlbWVudC5leHByZXNzaW9uLmV4cHJlc3Npb24gYXMgdHMuQ2FsbEV4cHJlc3Npb24gJiB7ZXhwcmVzc2lvbjogdHMuRnVuY3Rpb25FeHByZXNzaW9ufTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW1wb3J0c09mVW1kTW9kdWxlKHVtZE1vZHVsZTogVW1kTW9kdWxlKTpcbiAgICB7cGFyYW1ldGVyOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiwgcGF0aDogc3RyaW5nfVtdIHtcbiAgY29uc3QgaW1wb3J0czoge3BhcmFtZXRlcjogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIHBhdGg6IHN0cmluZ31bXSA9IFtdO1xuICBmb3IgKGxldCBpID0gMTsgaSA8IHVtZE1vZHVsZS5mYWN0b3J5Rm4ucGFyYW1ldGVycy5sZW5ndGg7IGkrKykge1xuICAgIGltcG9ydHMucHVzaCh7XG4gICAgICBwYXJhbWV0ZXI6IHVtZE1vZHVsZS5mYWN0b3J5Rm4ucGFyYW1ldGVyc1tpXSxcbiAgICAgIHBhdGg6IGdldFJlcXVpcmVkTW9kdWxlUGF0aCh1bWRNb2R1bGUud3JhcHBlckZuLCBpKVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBpbXBvcnRzO1xufVxuXG5pbnRlcmZhY2UgVW1kTW9kdWxlIHtcbiAgd3JhcHBlckZuOiB0cy5GdW5jdGlvbkV4cHJlc3Npb247XG4gIGZhY3RvcnlGbjogdHMuRnVuY3Rpb25FeHByZXNzaW9uO1xufVxuXG50eXBlIFVtZEV4cG9ydFN0YXRlbWVudCA9IHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQgJiB7XG4gIGV4cHJlc3Npb246XG4gICAgICB0cy5CaW5hcnlFeHByZXNzaW9uICYge2xlZnQ6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiAmIHtleHByZXNzaW9uOiB0cy5JZGVudGlmaWVyfX1cbn07XG5cbmZ1bmN0aW9uIGlzVW1kRXhwb3J0U3RhdGVtZW50KHM6IHRzLlN0YXRlbWVudCk6IHMgaXMgVW1kRXhwb3J0U3RhdGVtZW50IHtcbiAgcmV0dXJuIHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzKSAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24ocy5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24ocy5leHByZXNzaW9uLmxlZnQpICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIocy5leHByZXNzaW9uLmxlZnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIHMuZXhwcmVzc2lvbi5sZWZ0LmV4cHJlc3Npb24udGV4dCA9PT0gJ2V4cG9ydHMnO1xufVxuXG5pbnRlcmZhY2UgVW1kRXhwb3J0RGVjbGFyYXRpb24ge1xuICBuYW1lOiBzdHJpbmc7XG4gIGRlY2xhcmF0aW9uOiBEZWNsYXJhdGlvbjtcbn1cblxuZnVuY3Rpb24gZ2V0UmVxdWlyZWRNb2R1bGVQYXRoKHdyYXBwZXJGbjogdHMuRnVuY3Rpb25FeHByZXNzaW9uLCBwYXJhbUluZGV4OiBudW1iZXIpOiBzdHJpbmcge1xuICBjb25zdCBzdGF0ZW1lbnQgPSB3cmFwcGVyRm4uYm9keS5zdGF0ZW1lbnRzWzBdO1xuICBpZiAoIXRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVU1EIHdyYXBwZXIgYm9keSBpcyBub3QgYW4gZXhwcmVzc2lvbiBzdGF0ZW1lbnQ6XFxuJyArIHdyYXBwZXJGbi5ib2R5LmdldFRleHQoKSk7XG4gIH1cbiAgY29uc3QgbW9kdWxlUGF0aHM6IHN0cmluZ1tdID0gW107XG4gIGZpbmRNb2R1bGVQYXRocyhzdGF0ZW1lbnQuZXhwcmVzc2lvbik7XG5cbiAgLy8gU2luY2Ugd2Ugd2VyZSBvbmx5IGludGVyZXN0ZWQgaW4gdGhlIGByZXF1aXJlKClgIGNhbGxzLCB3ZSBtaXNzIHRoZSBgZXhwb3J0c2AgYXJndW1lbnQsIHNvIHdlXG4gIC8vIG5lZWQgdG8gc3VidHJhY3QgMS5cbiAgLy8gRS5nLiBgZnVuY3Rpb24oZXhwb3J0cywgZGVwMSwgZGVwMilgIG1hcHMgdG8gYGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUoJ3BhdGgvdG8vZGVwMScpLFxuICAvLyByZXF1aXJlKCdwYXRoL3RvL2RlcDInKSlgXG4gIHJldHVybiBtb2R1bGVQYXRoc1twYXJhbUluZGV4IC0gMV07XG5cbiAgLy8gU2VhcmNoIHRoZSBzdGF0ZW1lbnQgZm9yIGNhbGxzIHRvIGByZXF1aXJlKCcuLi4nKWAgYW5kIGV4dHJhY3QgdGhlIHN0cmluZyB2YWx1ZSBvZiB0aGUgZmlyc3RcbiAgLy8gYXJndW1lbnRcbiAgZnVuY3Rpb24gZmluZE1vZHVsZVBhdGhzKG5vZGU6IHRzLk5vZGUpIHtcbiAgICBpZiAoaXNSZXF1aXJlQ2FsbChub2RlKSkge1xuICAgICAgY29uc3QgYXJndW1lbnQgPSBub2RlLmFyZ3VtZW50c1swXTtcbiAgICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwoYXJndW1lbnQpKSB7XG4gICAgICAgIG1vZHVsZVBhdGhzLnB1c2goYXJndW1lbnQudGV4dCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUuZm9yRWFjaENoaWxkKGZpbmRNb2R1bGVQYXRocyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzUmVxdWlyZUNhbGwobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuQ2FsbEV4cHJlc3Npb24ge1xuICByZXR1cm4gdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSAmJiB0cy5pc0lkZW50aWZpZXIobm9kZS5leHByZXNzaW9uKSAmJlxuICAgICAgbm9kZS5leHByZXNzaW9uLnRleHQgPT09ICdyZXF1aXJlJyAmJiBub2RlLmFyZ3VtZW50cy5sZW5ndGggPT09IDE7XG59XG5cbi8qKlxuICogSWYgdGhlIGlkZW50aWZpZXIgYGlkYCBpcyB0aGUgUkhTIG9mIGEgcHJvcGVydHkgYWNjZXNzIG9mIHRoZSBmb3JtIGBuYW1lc3BhY2UuaWRgXG4gKiBhbmQgYG5hbWVzcGFjZWAgaXMgYW4gaWRlbnRpZmVyIHRoZW4gcmV0dXJuIGBuYW1lc3BhY2VgLCBvdGhlcndpc2UgYG51bGxgLlxuICogQHBhcmFtIGlkIFRoZSBpZGVudGlmaWVyIHdob3NlIG5hbWVzcGFjZSB3ZSB3YW50IHRvIGZpbmQuXG4gKi9cbmZ1bmN0aW9uIGZpbmROYW1lc3BhY2VPZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICByZXR1cm4gaWQucGFyZW50ICYmIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGlkLnBhcmVudCkgJiZcbiAgICAgICAgICB0cy5pc0lkZW50aWZpZXIoaWQucGFyZW50LmV4cHJlc3Npb24pID9cbiAgICAgIGlkLnBhcmVudC5leHByZXNzaW9uIDpcbiAgICAgIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcFBhcmVudGhlc2VzKG5vZGU6IHRzLk5vZGUpOiB0cy5Ob2RlIHtcbiAgcmV0dXJuIHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkgPyBub2RlLmV4cHJlc3Npb24gOiBub2RlO1xufVxuIl19