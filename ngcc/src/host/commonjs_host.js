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
        define("@angular/compiler-cli/ngcc/src/host/commonjs_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/ngcc/src/host/esm5_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var esm5_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm5_host");
    var CommonJsReflectionHost = /** @class */ (function (_super) {
        tslib_1.__extends(CommonJsReflectionHost, _super);
        function CommonJsReflectionHost(logger, isCore, program, compilerHost, dts) {
            var _this = _super.call(this, logger, isCore, program.getTypeChecker(), dts) || this;
            _this.program = program;
            _this.compilerHost = compilerHost;
            _this.commonJsExports = new Map();
            return _this;
        }
        CommonJsReflectionHost.prototype.getImportOfIdentifier = function (id) {
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
            if (!this.commonJsExports.has(sourceFile)) {
                var moduleExports = this.computeExportsOfCommonJsModule(sourceFile);
                this.commonJsExports.set(sourceFile, moduleExports);
            }
            return this.commonJsExports.get(sourceFile);
        };
        CommonJsReflectionHost.prototype.computeExportsOfCommonJsModule = function (sourceFile) {
            var e_1, _a, e_2, _b;
            var moduleMap = new Map();
            try {
                for (var _c = tslib_1.__values(this.getModuleStatements(sourceFile)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var statement = _d.value;
                    if (isCommonJsExportStatement(statement)) {
                        var exportDeclaration = this.extractCommonJsExportDeclaration(statement);
                        if (exportDeclaration !== null) {
                            moduleMap.set(exportDeclaration.name, exportDeclaration.declaration);
                        }
                    }
                    else if (isReexportStatement(statement)) {
                        var reexports = this.extractCommonJsReexports(statement, sourceFile);
                        try {
                            for (var reexports_1 = tslib_1.__values(reexports), reexports_1_1 = reexports_1.next(); !reexports_1_1.done; reexports_1_1 = reexports_1.next()) {
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
            if (declaration === null) {
                return null;
            }
            var name = statement.expression.left.name.text;
            return { name: name, declaration: declaration };
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
                    importedExports.forEach(function (decl, name) { return reexports.push({ name: name, declaration: { node: decl.node, viaModule: viaModule_1 } }); });
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
            return { node: importedFile, viaModule: importInfo.from };
        };
        CommonJsReflectionHost.prototype.resolveModuleName = function (moduleName, containingFile) {
            if (this.compilerHost.resolveModuleNames) {
                var moduleInfo = this.compilerHost.resolveModuleNames([moduleName], containingFile.fileName)[0];
                return moduleInfo && this.program.getSourceFile(moduleInfo.resolvedFileName);
            }
            else {
                var moduleInfo = ts.resolveModuleName(moduleName, containingFile.fileName, this.program.getCompilerOptions(), this.compilerHost);
                return moduleInfo.resolvedModule &&
                    this.program.getSourceFile(moduleInfo.resolvedModule.resolvedFileName);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9ob3N0L2NvbW1vbmpzX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBS2pDLDJFQUErQztJQUUvQztRQUE0QyxrREFBa0I7UUFFNUQsZ0NBQ0ksTUFBYyxFQUFFLE1BQWUsRUFBWSxPQUFtQixFQUNwRCxZQUE2QixFQUFFLEdBQXdCO1lBRnJFLFlBR0Usa0JBQU0sTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsR0FBRyxDQUFDLFNBQ3JEO1lBSDhDLGFBQU8sR0FBUCxPQUFPLENBQVk7WUFDcEQsa0JBQVksR0FBWixZQUFZLENBQWlCO1lBSGpDLHFCQUFlLEdBQUcsSUFBSSxHQUFHLEVBQWdELENBQUM7O1FBS3BGLENBQUM7UUFFRCxzREFBcUIsR0FBckIsVUFBc0IsRUFBaUI7WUFDckMsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELElBQUksV0FBVyxLQUFLLElBQUksRUFBRTtnQkFDeEIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sRUFBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsMkRBQTBCLEdBQTFCLFVBQTJCLEVBQWlCO1lBQzFDLE9BQU8sSUFBSSxDQUFDLDhCQUE4QixDQUFDLEVBQUUsQ0FBQyxJQUFJLGlCQUFNLDBCQUEwQixZQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pGLENBQUM7UUFFRCxtREFBa0IsR0FBbEIsVUFBbUIsTUFBZTtZQUNo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LFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3JFLENBQUM7SUFGRCw0Q0FFQztJQUdELFNBQVMsbUJBQW1CLENBQUMsU0FBdUI7UUFDbEQsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUM7WUFDbkYsRUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztZQUNoRCxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssVUFBVTtZQUNuRCxTQUFTLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUMzQyxhQUFhLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsU0FBUyxjQUFjLENBQUMsUUFBZ0I7UUFDdEMsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN2QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEZWNsYXJhdGlvbiwgSW1wb3J0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtCdW5kbGVQcm9ncmFtfSBmcm9tICcuLi9wYWNrYWdlcy9idW5kbGVfcHJvZ3JhbSc7XG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi9lc201X2hvc3QnO1xuXG5leHBvcnQgY2xhc3MgQ29tbW9uSnNSZWZsZWN0aW9uSG9zdCBleHRlbmRzIEVzbTVSZWZsZWN0aW9uSG9zdCB7XG4gIHByb3RlY3RlZCBjb21tb25Kc0V4cG9ydHMgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsPigpO1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIGxvZ2dlcjogTG9nZ2VyLCBpc0NvcmU6IGJvb2xlYW4sIHByb3RlY3RlZCBwcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgcHJvdGVjdGVkIGNvbXBpbGVySG9zdDogdHMuQ29tcGlsZXJIb3N0LCBkdHM/OiBCdW5kbGVQcm9ncmFtfG51bGwpIHtcbiAgICBzdXBlcihsb2dnZXIsIGlzQ29yZSwgcHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCBkdHMpO1xuICB9XG5cbiAgZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogSW1wb3J0fG51bGwge1xuICAgIGNvbnN0IHJlcXVpcmVDYWxsID0gdGhpcy5maW5kQ29tbW9uSnNJbXBvcnQoaWQpO1xuICAgIGlmIChyZXF1aXJlQ2FsbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB7ZnJvbTogcmVxdWlyZUNhbGwuYXJndW1lbnRzWzBdLnRleHQsIG5hbWU6IGlkLnRleHR9O1xuICB9XG5cbiAgZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRDb21tb25Kc0ltcG9ydGVkRGVjbGFyYXRpb24oaWQpIHx8IHN1cGVyLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkKTtcbiAgfVxuXG4gIGdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGU6IHRzLk5vZGUpOiBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj58bnVsbCB7XG4gICAgcmV0dXJuIHN1cGVyLmdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGUpIHx8IHRoaXMuZ2V0Q29tbW9uSnNFeHBvcnRzKG1vZHVsZS5nZXRTb3VyY2VGaWxlKCkpO1xuICB9XG5cbiAgZ2V0Q29tbW9uSnNFeHBvcnRzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj58bnVsbCB7XG4gICAgaWYgKCF0aGlzLmNvbW1vbkpzRXhwb3J0cy5oYXMoc291cmNlRmlsZSkpIHtcbiAgICAgIGNvbnN0IG1vZHVsZUV4cG9ydHMgPSB0aGlzLmNvbXB1dGVFeHBvcnRzT2ZDb21tb25Kc01vZHVsZShzb3VyY2VGaWxlKTtcbiAgICAgIHRoaXMuY29tbW9uSnNFeHBvcnRzLnNldChzb3VyY2VGaWxlLCBtb2R1bGVFeHBvcnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29tbW9uSnNFeHBvcnRzLmdldChzb3VyY2VGaWxlKSAhO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21wdXRlRXhwb3J0c09mQ29tbW9uSnNNb2R1bGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPiB7XG4gICAgY29uc3QgbW9kdWxlTWFwID0gbmV3IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPigpO1xuICAgIGZvciAoY29uc3Qgc3RhdGVtZW50IG9mIHRoaXMuZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlKSkge1xuICAgICAgaWYgKGlzQ29tbW9uSnNFeHBvcnRTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgICBjb25zdCBleHBvcnREZWNsYXJhdGlvbiA9IHRoaXMuZXh0cmFjdENvbW1vbkpzRXhwb3J0RGVjbGFyYXRpb24oc3RhdGVtZW50KTtcbiAgICAgICAgaWYgKGV4cG9ydERlY2xhcmF0aW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgbW9kdWxlTWFwLnNldChleHBvcnREZWNsYXJhdGlvbi5uYW1lLCBleHBvcnREZWNsYXJhdGlvbi5kZWNsYXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaXNSZWV4cG9ydFN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIGNvbnN0IHJlZXhwb3J0cyA9IHRoaXMuZXh0cmFjdENvbW1vbkpzUmVleHBvcnRzKHN0YXRlbWVudCwgc291cmNlRmlsZSk7XG4gICAgICAgIGZvciAoY29uc3QgcmVleHBvcnQgb2YgcmVleHBvcnRzKSB7XG4gICAgICAgICAgbW9kdWxlTWFwLnNldChyZWV4cG9ydC5uYW1lLCByZWV4cG9ydC5kZWNsYXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1vZHVsZU1hcDtcbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdENvbW1vbkpzRXhwb3J0RGVjbGFyYXRpb24oc3RhdGVtZW50OiBDb21tb25Kc0V4cG9ydFN0YXRlbWVudCk6XG4gICAgICBDb21tb25Kc0V4cG9ydERlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IGV4cG9ydEV4cHJlc3Npb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodDtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZkV4cHJlc3Npb24oZXhwb3J0RXhwcmVzc2lvbik7XG4gICAgaWYgKGRlY2xhcmF0aW9uID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgbmFtZSA9IHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQubmFtZS50ZXh0O1xuICAgIHJldHVybiB7bmFtZSwgZGVjbGFyYXRpb259O1xuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0Q29tbW9uSnNSZWV4cG9ydHMoc3RhdGVtZW50OiBSZWV4cG9ydFN0YXRlbWVudCwgY29udGFpbmluZ0ZpbGU6IHRzLlNvdXJjZUZpbGUpOlxuICAgICAgQ29tbW9uSnNFeHBvcnREZWNsYXJhdGlvbltdIHtcbiAgICBjb25zdCByZWV4cG9ydHM6IENvbW1vbkpzRXhwb3J0RGVjbGFyYXRpb25bXSA9IFtdO1xuICAgIGNvbnN0IHJlcXVpcmVDYWxsID0gc3RhdGVtZW50LmV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuICAgIGNvbnN0IGltcG9ydFBhdGggPSByZXF1aXJlQ2FsbC5hcmd1bWVudHNbMF0udGV4dDtcbiAgICBjb25zdCBpbXBvcnRlZEZpbGUgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKGltcG9ydFBhdGgsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICBpZiAoaW1wb3J0ZWRGaWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHZpYU1vZHVsZSA9IHN0cmlwRXh0ZW5zaW9uKGltcG9ydGVkRmlsZS5maWxlTmFtZSk7XG4gICAgICBjb25zdCBpbXBvcnRlZEV4cG9ydHMgPSB0aGlzLmdldEV4cG9ydHNPZk1vZHVsZShpbXBvcnRlZEZpbGUpO1xuICAgICAgaWYgKGltcG9ydGVkRXhwb3J0cyAhPT0gbnVsbCkge1xuICAgICAgICBpbXBvcnRlZEV4cG9ydHMuZm9yRWFjaChcbiAgICAgICAgICAgIChkZWNsLCBuYW1lKSA9PiByZWV4cG9ydHMucHVzaCh7bmFtZSwgZGVjbGFyYXRpb246IHtub2RlOiBkZWNsLm5vZGUsIHZpYU1vZHVsZX19KSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZWV4cG9ydHM7XG4gIH1cblxuICBwcml2YXRlIGZpbmRDb21tb25Kc0ltcG9ydChpZDogdHMuSWRlbnRpZmllcik6IFJlcXVpcmVDYWxsfG51bGwge1xuICAgIC8vIElzIGBpZGAgYSBuYW1lc3BhY2VkIHByb3BlcnR5IGFjY2VzcywgZS5nLiBgRGlyZWN0aXZlYCBpbiBgY29yZS5EaXJlY3RpdmVgP1xuICAgIC8vIElmIHNvIGNhcHR1cmUgdGhlIHN5bWJvbCBvZiB0aGUgbmFtZXNwYWNlLCBlLmcuIGBjb3JlYC5cbiAgICBjb25zdCBuc0lkZW50aWZpZXIgPSBmaW5kTmFtZXNwYWNlT2ZJZGVudGlmaWVyKGlkKTtcbiAgICBjb25zdCBuc1N5bWJvbCA9IG5zSWRlbnRpZmllciAmJiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihuc0lkZW50aWZpZXIpIHx8IG51bGw7XG4gICAgY29uc3QgbnNEZWNsYXJhdGlvbiA9IG5zU3ltYm9sICYmIG5zU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgY29uc3QgaW5pdGlhbGl6ZXIgPVxuICAgICAgICBuc0RlY2xhcmF0aW9uICYmIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihuc0RlY2xhcmF0aW9uKSAmJiBuc0RlY2xhcmF0aW9uLmluaXRpYWxpemVyIHx8XG4gICAgICAgIG51bGw7XG4gICAgcmV0dXJuIGluaXRpYWxpemVyICYmIGlzUmVxdWlyZUNhbGwoaW5pdGlhbGl6ZXIpID8gaW5pdGlhbGl6ZXIgOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDb21tb25Kc0ltcG9ydGVkRGVjbGFyYXRpb24oaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBpbXBvcnRJbmZvID0gdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoaWQpO1xuICAgIGlmIChpbXBvcnRJbmZvID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRlZEZpbGUgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKGltcG9ydEluZm8uZnJvbSwgaWQuZ2V0U291cmNlRmlsZSgpKTtcbiAgICBpZiAoaW1wb3J0ZWRGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7bm9kZTogaW1wb3J0ZWRGaWxlLCB2aWFNb2R1bGU6IGltcG9ydEluZm8uZnJvbX07XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVNb2R1bGVOYW1lKG1vZHVsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5jb21waWxlckhvc3QucmVzb2x2ZU1vZHVsZU5hbWVzKSB7XG4gICAgICBjb25zdCBtb2R1bGVJbmZvID1cbiAgICAgICAgICB0aGlzLmNvbXBpbGVySG9zdC5yZXNvbHZlTW9kdWxlTmFtZXMoW21vZHVsZU5hbWVdLCBjb250YWluaW5nRmlsZS5maWxlTmFtZSlbMF07XG4gICAgICByZXR1cm4gbW9kdWxlSW5mbyAmJiB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZShtb2R1bGVJbmZvLnJlc29sdmVkRmlsZU5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBtb2R1bGVJbmZvID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUoXG4gICAgICAgICAgbW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUuZmlsZU5hbWUsIHRoaXMucHJvZ3JhbS5nZXRDb21waWxlck9wdGlvbnMoKSxcbiAgICAgICAgICB0aGlzLmNvbXBpbGVySG9zdCk7XG4gICAgICByZXR1cm4gbW9kdWxlSW5mby5yZXNvbHZlZE1vZHVsZSAmJlxuICAgICAgICAgIHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKG1vZHVsZUluZm8ucmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZSk7XG4gICAgfVxuICB9XG59XG5cbnR5cGUgQ29tbW9uSnNFeHBvcnRTdGF0ZW1lbnQgPSB0cy5FeHByZXNzaW9uU3RhdGVtZW50ICYge1xuICBleHByZXNzaW9uOlxuICAgICAgdHMuQmluYXJ5RXhwcmVzc2lvbiAmIHtsZWZ0OiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gJiB7ZXhwcmVzc2lvbjogdHMuSWRlbnRpZmllcn19XG59O1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ29tbW9uSnNFeHBvcnRTdGF0ZW1lbnQoczogdHMuU3RhdGVtZW50KTogcyBpcyBDb21tb25Kc0V4cG9ydFN0YXRlbWVudCB7XG4gIHJldHVybiB0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQocykgJiYgdHMuaXNCaW5hcnlFeHByZXNzaW9uKHMuZXhwcmVzc2lvbikgJiZcbiAgICAgIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHMuZXhwcmVzc2lvbi5sZWZ0KSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHMuZXhwcmVzc2lvbi5sZWZ0LmV4cHJlc3Npb24pICYmXG4gICAgICBzLmV4cHJlc3Npb24ubGVmdC5leHByZXNzaW9uLnRleHQgPT09ICdleHBvcnRzJztcbn1cblxuaW50ZXJmYWNlIENvbW1vbkpzRXhwb3J0RGVjbGFyYXRpb24ge1xuICBuYW1lOiBzdHJpbmc7XG4gIGRlY2xhcmF0aW9uOiBEZWNsYXJhdGlvbjtcbn1cblxuZXhwb3J0IHR5cGUgUmVxdWlyZUNhbGwgPSB0cy5DYWxsRXhwcmVzc2lvbiAmIHthcmd1bWVudHM6IFt0cy5TdHJpbmdMaXRlcmFsXX07XG5leHBvcnQgZnVuY3Rpb24gaXNSZXF1aXJlQ2FsbChub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyBSZXF1aXJlQ2FsbCB7XG4gIHJldHVybiB0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpICYmIHRzLmlzSWRlbnRpZmllcihub2RlLmV4cHJlc3Npb24pICYmXG4gICAgICBub2RlLmV4cHJlc3Npb24udGV4dCA9PT0gJ3JlcXVpcmUnICYmIG5vZGUuYXJndW1lbnRzLmxlbmd0aCA9PT0gMSAmJlxuICAgICAgdHMuaXNTdHJpbmdMaXRlcmFsKG5vZGUuYXJndW1lbnRzWzBdKTtcbn1cblxuLyoqXG4gKiBJZiB0aGUgaWRlbnRpZmllciBgaWRgIGlzIHRoZSBSSFMgb2YgYSBwcm9wZXJ0eSBhY2Nlc3Mgb2YgdGhlIGZvcm0gYG5hbWVzcGFjZS5pZGBcbiAqIGFuZCBgbmFtZXNwYWNlYCBpcyBhbiBpZGVudGlmZXIgdGhlbiByZXR1cm4gYG5hbWVzcGFjZWAsIG90aGVyd2lzZSBgbnVsbGAuXG4gKiBAcGFyYW0gaWQgVGhlIGlkZW50aWZpZXIgd2hvc2UgbmFtZXNwYWNlIHdlIHdhbnQgdG8gZmluZC5cbiAqL1xuZnVuY3Rpb24gZmluZE5hbWVzcGFjZU9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIHJldHVybiBpZC5wYXJlbnQgJiYgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oaWQucGFyZW50KSAmJlxuICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihpZC5wYXJlbnQuZXhwcmVzc2lvbikgP1xuICAgICAgaWQucGFyZW50LmV4cHJlc3Npb24gOlxuICAgICAgbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwUGFyZW50aGVzZXMobm9kZTogdHMuTm9kZSk6IHRzLk5vZGUge1xuICByZXR1cm4gdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlKSA/IG5vZGUuZXhwcmVzc2lvbiA6IG5vZGU7XG59XG5cbnR5cGUgUmVleHBvcnRTdGF0ZW1lbnQgPSB0cy5FeHByZXNzaW9uU3RhdGVtZW50ICYge2V4cHJlc3Npb246IHthcmd1bWVudHM6IFtSZXF1aXJlQ2FsbF19fTtcbmZ1bmN0aW9uIGlzUmVleHBvcnRTdGF0ZW1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBzdGF0ZW1lbnQgaXMgUmVleHBvcnRTdGF0ZW1lbnQge1xuICByZXR1cm4gdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgdHMuaXNDYWxsRXhwcmVzc2lvbihzdGF0ZW1lbnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5leHByZXNzaW9uKSAmJlxuICAgICAgc3RhdGVtZW50LmV4cHJlc3Npb24uZXhwcmVzc2lvbi50ZXh0ID09PSAnX19leHBvcnQnICYmXG4gICAgICBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5hcmd1bWVudHMubGVuZ3RoID09PSAxICYmXG4gICAgICBpc1JlcXVpcmVDYWxsKHN0YXRlbWVudC5leHByZXNzaW9uLmFyZ3VtZW50c1swXSk7XG59XG5cbmZ1bmN0aW9uIHN0cmlwRXh0ZW5zaW9uKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZmlsZU5hbWUucmVwbGFjZSgvXFwuLiskLywgJycpO1xufVxuIl19