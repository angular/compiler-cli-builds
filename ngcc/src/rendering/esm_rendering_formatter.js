(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/esm_rendering_formatter", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/ngcc/src/host/ngcc_host", "@angular/compiler-cli/ngcc/src/rendering/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var ngcc_host_1 = require("@angular/compiler-cli/ngcc/src/host/ngcc_host");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/rendering/utils");
    /**
     * A RenderingFormatter that works with ECMAScript Module import and export statements.
     */
    var EsmRenderingFormatter = /** @class */ (function () {
        function EsmRenderingFormatter(host, isCore) {
            this.host = host;
            this.isCore = isCore;
        }
        /**
         *  Add the imports at the top of the file, after any imports that are already there.
         */
        EsmRenderingFormatter.prototype.addImports = function (output, imports, sf) {
            var insertionPoint = this.findEndOfImports(sf);
            var renderedImports = imports.map(function (i) { return "import * as " + i.qualifier + " from '" + i.specifier + "';\n"; }).join('');
            output.appendLeft(insertionPoint, renderedImports);
        };
        /**
         * Add the exports to the end of the file.
         */
        EsmRenderingFormatter.prototype.addExports = function (output, entryPointBasePath, exports, importManager, file) {
            exports.forEach(function (e) {
                var exportFrom = '';
                var isDtsFile = typescript_1.isDtsPath(entryPointBasePath);
                var from = isDtsFile ? e.dtsFrom : e.from;
                if (from) {
                    var basePath = utils_1.stripExtension(from);
                    var relativePath = './' + file_system_1.relative(file_system_1.dirname(entryPointBasePath), basePath);
                    exportFrom = entryPointBasePath !== basePath ? " from '" + relativePath + "'" : '';
                }
                // aliases should only be added in dts files as these are lost when rolling up dts file.
                var exportStatement = e.alias && isDtsFile ? e.alias + " as " + e.identifier : e.identifier;
                var exportStr = "\nexport {" + exportStatement + "}" + exportFrom + ";";
                output.append(exportStr);
            });
        };
        /**
         * Add plain exports to the end of the file.
         *
         * Unlike `addExports`, direct exports go directly in a .js and .d.ts file and don't get added to
         * an entrypoint.
         */
        EsmRenderingFormatter.prototype.addDirectExports = function (output, exports, importManager, file) {
            var e_1, _a;
            try {
                for (var exports_1 = tslib_1.__values(exports), exports_1_1 = exports_1.next(); !exports_1_1.done; exports_1_1 = exports_1.next()) {
                    var e = exports_1_1.value;
                    var exportStatement = "\nexport {" + e.symbolName + " as " + e.asAlias + "} from '" + e.fromModule + "';";
                    output.append(exportStatement);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (exports_1_1 && !exports_1_1.done && (_a = exports_1.return)) _a.call(exports_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        /**
         * Add the constants directly after the imports.
         */
        EsmRenderingFormatter.prototype.addConstants = function (output, constants, file) {
            if (constants === '') {
                return;
            }
            var insertionPoint = this.findEndOfImports(file);
            // Append the constants to the right of the insertion point, to ensure they get ordered after
            // added imports (those are appended left to the insertion point).
            output.appendRight(insertionPoint, '\n' + constants + '\n');
        };
        /**
         * Add the definitions directly after their decorated class.
         */
        EsmRenderingFormatter.prototype.addDefinitions = function (output, compiledClass, definitions) {
            var classSymbol = this.host.getClassSymbol(compiledClass.declaration);
            if (!classSymbol) {
                throw new Error("Compiled class does not have a valid symbol: " + compiledClass.name);
            }
            var insertionPoint = classSymbol.declaration.valueDeclaration.getEnd();
            output.appendLeft(insertionPoint, '\n' + definitions);
        };
        /**
         * Remove static decorator properties from classes.
         */
        EsmRenderingFormatter.prototype.removeDecorators = function (output, decoratorsToRemove) {
            decoratorsToRemove.forEach(function (nodesToRemove, containerNode) {
                if (ts.isArrayLiteralExpression(containerNode)) {
                    var items_1 = containerNode.elements;
                    if (items_1.length === nodesToRemove.length) {
                        // Remove the entire statement
                        var statement = findStatement(containerNode);
                        if (statement) {
                            output.remove(statement.getFullStart(), statement.getEnd());
                        }
                    }
                    else {
                        nodesToRemove.forEach(function (node) {
                            // remove any trailing comma
                            var nextSibling = getNextSiblingInArray(node, items_1);
                            var end;
                            if (nextSibling !== null &&
                                output.slice(nextSibling.getFullStart() - 1, nextSibling.getFullStart()) === ',') {
                                end = nextSibling.getFullStart() - 1 + nextSibling.getLeadingTriviaWidth();
                            }
                            else if (output.slice(node.getEnd(), node.getEnd() + 1) === ',') {
                                end = node.getEnd() + 1;
                            }
                            else {
                                end = node.getEnd();
                            }
                            output.remove(node.getFullStart(), end);
                        });
                    }
                }
            });
        };
        /**
         * Rewrite the the IVY switch markers to indicate we are in IVY mode.
         */
        EsmRenderingFormatter.prototype.rewriteSwitchableDeclarations = function (outputText, sourceFile, declarations) {
            declarations.forEach(function (declaration) {
                var start = declaration.initializer.getStart();
                var end = declaration.initializer.getEnd();
                var replacement = declaration.initializer.text.replace(ngcc_host_1.PRE_R3_MARKER, ngcc_host_1.POST_R3_MARKER);
                outputText.overwrite(start, end, replacement);
            });
        };
        /**
         * Add the type parameters to the appropriate functions that return `ModuleWithProviders`
         * structures.
         *
         * This function will only get called on typings files.
         */
        EsmRenderingFormatter.prototype.addModuleWithProvidersParams = function (outputText, moduleWithProviders, importManager) {
            var _this = this;
            moduleWithProviders.forEach(function (info) {
                var ngModuleName = info.ngModule.node.name.text;
                var declarationFile = file_system_1.absoluteFromSourceFile(info.declaration.getSourceFile());
                var ngModuleFile = file_system_1.absoluteFromSourceFile(info.ngModule.node.getSourceFile());
                var importPath = info.ngModule.viaModule ||
                    (declarationFile !== ngModuleFile ?
                        utils_1.stripExtension("./" + file_system_1.relative(file_system_1.dirname(declarationFile), ngModuleFile)) :
                        null);
                var ngModule = generateImportString(importManager, importPath, ngModuleName);
                if (info.declaration.type) {
                    var typeName = info.declaration.type && ts.isTypeReferenceNode(info.declaration.type) ?
                        info.declaration.type.typeName :
                        null;
                    if (_this.isCoreModuleWithProvidersType(typeName)) {
                        // The declaration already returns `ModuleWithProvider` but it needs the `NgModule` type
                        // parameter adding.
                        outputText.overwrite(info.declaration.type.getStart(), info.declaration.type.getEnd(), "ModuleWithProviders<" + ngModule + ">");
                    }
                    else {
                        // The declaration returns an unknown type so we need to convert it to a union that
                        // includes the ngModule property.
                        var originalTypeString = info.declaration.type.getText();
                        outputText.overwrite(info.declaration.type.getStart(), info.declaration.type.getEnd(), "(" + originalTypeString + ")&{ngModule:" + ngModule + "}");
                    }
                }
                else {
                    // The declaration has no return type so provide one.
                    var lastToken = info.declaration.getLastToken();
                    var insertPoint = lastToken && lastToken.kind === ts.SyntaxKind.SemicolonToken ?
                        lastToken.getStart() :
                        info.declaration.getEnd();
                    outputText.appendLeft(insertPoint, ": " + generateImportString(importManager, '@angular/core', 'ModuleWithProviders') + "<" + ngModule + ">");
                }
            });
        };
        EsmRenderingFormatter.prototype.findEndOfImports = function (sf) {
            var e_2, _a;
            try {
                for (var _b = tslib_1.__values(sf.statements), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var stmt = _c.value;
                    if (!ts.isImportDeclaration(stmt) && !ts.isImportEqualsDeclaration(stmt) &&
                        !ts.isNamespaceImport(stmt)) {
                        return stmt.getStart();
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return 0;
        };
        /**
         * Check whether the given type is the core Angular `ModuleWithProviders` interface.
         * @param typeName The type to check.
         * @returns true if the type is the core Angular `ModuleWithProviders` interface.
         */
        EsmRenderingFormatter.prototype.isCoreModuleWithProvidersType = function (typeName) {
            var id = typeName && ts.isIdentifier(typeName) ? this.host.getImportOfIdentifier(typeName) : null;
            return (id && id.name === 'ModuleWithProviders' && (this.isCore || id.from === '@angular/core'));
        };
        return EsmRenderingFormatter;
    }());
    exports.EsmRenderingFormatter = EsmRenderingFormatter;
    function findStatement(node) {
        while (node) {
            if (ts.isExpressionStatement(node)) {
                return node;
            }
            node = node.parent;
        }
        return undefined;
    }
    function generateImportString(importManager, importPath, importName) {
        var importAs = importPath ? importManager.generateNamedImport(importPath, importName) : null;
        return importAs ? importAs.moduleImport + "." + importAs.symbol : "" + importName;
    }
    function getNextSiblingInArray(node, array) {
        var index = array.indexOf(node);
        return index !== -1 && array.length > index + 1 ? array[index + 1] : null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtX3JlbmRlcmluZ19mb3JtYXR0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL2VzbV9yZW5kZXJpbmdfZm9ybWF0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVFBLCtCQUFpQztJQUNqQywyRUFBeUc7SUFFekcsa0ZBQWlFO0lBRWpFLDJFQUFtSDtJQUluSCx3RUFBdUM7SUFHdkM7O09BRUc7SUFDSDtRQUNFLCtCQUFzQixJQUF3QixFQUFZLE1BQWU7WUFBbkQsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBWSxXQUFNLEdBQU4sTUFBTSxDQUFTO1FBQUcsQ0FBQztRQUU3RTs7V0FFRztRQUNILDBDQUFVLEdBQVYsVUFBVyxNQUFtQixFQUFFLE9BQWlCLEVBQUUsRUFBaUI7WUFDbEUsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pELElBQU0sZUFBZSxHQUNqQixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsaUJBQWUsQ0FBQyxDQUFDLFNBQVMsZUFBVSxDQUFDLENBQUMsU0FBUyxTQUFNLEVBQXJELENBQXFELENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDckYsTUFBTSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDckQsQ0FBQztRQUVEOztXQUVHO1FBQ0gsMENBQVUsR0FBVixVQUNJLE1BQW1CLEVBQUUsa0JBQWtDLEVBQUUsT0FBcUIsRUFDOUUsYUFBNEIsRUFBRSxJQUFtQjtZQUNuRCxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQztnQkFDZixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUM7Z0JBQ3BCLElBQU0sU0FBUyxHQUFHLHNCQUFTLENBQUMsa0JB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IFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtyZWxhdGl2ZSwgZGlybmFtZSwgQWJzb2x1dGVGc1BhdGgsIGFic29sdXRlRnJvbVNvdXJjZUZpbGV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0ltcG9ydCwgSW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtpc0R0c1BhdGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7Q29tcGlsZWRDbGFzc30gZnJvbSAnLi4vYW5hbHlzaXMvdHlwZXMnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3QsIFBPU1RfUjNfTUFSS0VSLCBQUkVfUjNfTUFSS0VSLCBTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbn0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb30gZnJvbSAnLi4vYW5hbHlzaXMvbW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyJztcbmltcG9ydCB7RXhwb3J0SW5mb30gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtSZW5kZXJpbmdGb3JtYXR0ZXIsIFJlZHVuZGFudERlY29yYXRvck1hcH0gZnJvbSAnLi9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7c3RyaXBFeHRlbnNpb259IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtSZWV4cG9ydH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuXG4vKipcbiAqIEEgUmVuZGVyaW5nRm9ybWF0dGVyIHRoYXQgd29ya3Mgd2l0aCBFQ01BU2NyaXB0IE1vZHVsZSBpbXBvcnQgYW5kIGV4cG9ydCBzdGF0ZW1lbnRzLlxuICovXG5leHBvcnQgY2xhc3MgRXNtUmVuZGVyaW5nRm9ybWF0dGVyIGltcGxlbWVudHMgUmVuZGVyaW5nRm9ybWF0dGVyIHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJvdGVjdGVkIGlzQ29yZTogYm9vbGVhbikge31cblxuICAvKipcbiAgICogIEFkZCB0aGUgaW1wb3J0cyBhdCB0aGUgdG9wIG9mIHRoZSBmaWxlLCBhZnRlciBhbnkgaW1wb3J0cyB0aGF0IGFyZSBhbHJlYWR5IHRoZXJlLlxuICAgKi9cbiAgYWRkSW1wb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBpbXBvcnRzOiBJbXBvcnRbXSwgc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9IHRoaXMuZmluZEVuZE9mSW1wb3J0cyhzZik7XG4gICAgY29uc3QgcmVuZGVyZWRJbXBvcnRzID1cbiAgICAgICAgaW1wb3J0cy5tYXAoaSA9PiBgaW1wb3J0ICogYXMgJHtpLnF1YWxpZmllcn0gZnJvbSAnJHtpLnNwZWNpZmllcn0nO1xcbmApLmpvaW4oJycpO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluc2VydGlvblBvaW50LCByZW5kZXJlZEltcG9ydHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgZXhwb3J0cyB0byB0aGUgZW5kIG9mIHRoZSBmaWxlLlxuICAgKi9cbiAgYWRkRXhwb3J0cyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGVudHJ5UG9pbnRCYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGV4cG9ydHM6IEV4cG9ydEluZm9bXSxcbiAgICAgIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIsIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBleHBvcnRzLmZvckVhY2goZSA9PiB7XG4gICAgICBsZXQgZXhwb3J0RnJvbSA9ICcnO1xuICAgICAgY29uc3QgaXNEdHNGaWxlID0gaXNEdHNQYXRoKGVudHJ5UG9pbnRCYXNlUGF0aCk7XG4gICAgICBjb25zdCBmcm9tID0gaXNEdHNGaWxlID8gZS5kdHNGcm9tIDogZS5mcm9tO1xuXG4gICAgICBpZiAoZnJvbSkge1xuICAgICAgICBjb25zdCBiYXNlUGF0aCA9IHN0cmlwRXh0ZW5zaW9uKGZyb20pO1xuICAgICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSAnLi8nICsgcmVsYXRpdmUoZGlybmFtZShlbnRyeVBvaW50QmFzZVBhdGgpLCBiYXNlUGF0aCk7XG4gICAgICAgIGV4cG9ydEZyb20gPSBlbnRyeVBvaW50QmFzZVBhdGggIT09IGJhc2VQYXRoID8gYCBmcm9tICcke3JlbGF0aXZlUGF0aH0nYCA6ICcnO1xuICAgICAgfVxuXG4gICAgICAvLyBhbGlhc2VzIHNob3VsZCBvbmx5IGJlIGFkZGVkIGluIGR0cyBmaWxlcyBhcyB0aGVzZSBhcmUgbG9zdCB3aGVuIHJvbGxpbmcgdXAgZHRzIGZpbGUuXG4gICAgICBjb25zdCBleHBvcnRTdGF0ZW1lbnQgPSBlLmFsaWFzICYmIGlzRHRzRmlsZSA/IGAke2UuYWxpYXN9IGFzICR7ZS5pZGVudGlmaWVyfWAgOiBlLmlkZW50aWZpZXI7XG4gICAgICBjb25zdCBleHBvcnRTdHIgPSBgXFxuZXhwb3J0IHske2V4cG9ydFN0YXRlbWVudH19JHtleHBvcnRGcm9tfTtgO1xuICAgICAgb3V0cHV0LmFwcGVuZChleHBvcnRTdHIpO1xuICAgIH0pO1xuICB9XG5cblxuICAvKipcbiAgICogQWRkIHBsYWluIGV4cG9ydHMgdG8gdGhlIGVuZCBvZiB0aGUgZmlsZS5cbiAgICpcbiAgICogVW5saWtlIGBhZGRFeHBvcnRzYCwgZGlyZWN0IGV4cG9ydHMgZ28gZGlyZWN0bHkgaW4gYSAuanMgYW5kIC5kLnRzIGZpbGUgYW5kIGRvbid0IGdldCBhZGRlZCB0b1xuICAgKiBhbiBlbnRyeXBvaW50LlxuICAgKi9cbiAgYWRkRGlyZWN0RXhwb3J0cyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGV4cG9ydHM6IFJlZXhwb3J0W10sIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIsXG4gICAgICBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBlIG9mIGV4cG9ydHMpIHtcbiAgICAgIGNvbnN0IGV4cG9ydFN0YXRlbWVudCA9IGBcXG5leHBvcnQgeyR7ZS5zeW1ib2xOYW1lfSBhcyAke2UuYXNBbGlhc319IGZyb20gJyR7ZS5mcm9tTW9kdWxlfSc7YDtcbiAgICAgIG91dHB1dC5hcHBlbmQoZXhwb3J0U3RhdGVtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRoZSBjb25zdGFudHMgZGlyZWN0bHkgYWZ0ZXIgdGhlIGltcG9ydHMuXG4gICAqL1xuICBhZGRDb25zdGFudHMob3V0cHV0OiBNYWdpY1N0cmluZywgY29uc3RhbnRzOiBzdHJpbmcsIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBpZiAoY29uc3RhbnRzID09PSAnJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9IHRoaXMuZmluZEVuZE9mSW1wb3J0cyhmaWxlKTtcblxuICAgIC8vIEFwcGVuZCB0aGUgY29uc3RhbnRzIHRvIHRoZSByaWdodCBvZiB0aGUgaW5zZXJ0aW9uIHBvaW50LCB0byBlbnN1cmUgdGhleSBnZXQgb3JkZXJlZCBhZnRlclxuICAgIC8vIGFkZGVkIGltcG9ydHMgKHRob3NlIGFyZSBhcHBlbmRlZCBsZWZ0IHRvIHRoZSBpbnNlcnRpb24gcG9pbnQpLlxuICAgIG91dHB1dC5hcHBlbmRSaWdodChpbnNlcnRpb25Qb2ludCwgJ1xcbicgKyBjb25zdGFudHMgKyAnXFxuJyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRoZSBkZWZpbml0aW9ucyBkaXJlY3RseSBhZnRlciB0aGVpciBkZWNvcmF0ZWQgY2xhc3MuXG4gICAqL1xuICBhZGREZWZpbml0aW9ucyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBjb21waWxlZENsYXNzOiBDb21waWxlZENsYXNzLCBkZWZpbml0aW9uczogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmhvc3QuZ2V0Q2xhc3NTeW1ib2woY29tcGlsZWRDbGFzcy5kZWNsYXJhdGlvbik7XG4gICAgaWYgKCFjbGFzc1N5bWJvbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb21waWxlZCBjbGFzcyBkb2VzIG5vdCBoYXZlIGEgdmFsaWQgc3ltYm9sOiAke2NvbXBpbGVkQ2xhc3MubmFtZX1gKTtcbiAgICB9XG4gICAgY29uc3QgaW5zZXJ0aW9uUG9pbnQgPSBjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uLmdldEVuZCgpO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGluc2VydGlvblBvaW50LCAnXFxuJyArIGRlZmluaXRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgc3RhdGljIGRlY29yYXRvciBwcm9wZXJ0aWVzIGZyb20gY2xhc3Nlcy5cbiAgICovXG4gIHJlbW92ZURlY29yYXRvcnMob3V0cHV0OiBNYWdpY1N0cmluZywgZGVjb3JhdG9yc1RvUmVtb3ZlOiBSZWR1bmRhbnREZWNvcmF0b3JNYXApOiB2b2lkIHtcbiAgICBkZWNvcmF0b3JzVG9SZW1vdmUuZm9yRWFjaCgobm9kZXNUb1JlbW92ZSwgY29udGFpbmVyTm9kZSkgPT4ge1xuICAgICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihjb250YWluZXJOb2RlKSkge1xuICAgICAgICBjb25zdCBpdGVtcyA9IGNvbnRhaW5lck5vZGUuZWxlbWVudHM7XG4gICAgICAgIGlmIChpdGVtcy5sZW5ndGggPT09IG5vZGVzVG9SZW1vdmUubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZSBlbnRpcmUgc3RhdGVtZW50XG4gICAgICAgICAgY29uc3Qgc3RhdGVtZW50ID0gZmluZFN0YXRlbWVudChjb250YWluZXJOb2RlKTtcbiAgICAgICAgICBpZiAoc3RhdGVtZW50KSB7XG4gICAgICAgICAgICBvdXRwdXQucmVtb3ZlKHN0YXRlbWVudC5nZXRGdWxsU3RhcnQoKSwgc3RhdGVtZW50LmdldEVuZCgpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbm9kZXNUb1JlbW92ZS5mb3JFYWNoKG5vZGUgPT4ge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIGFueSB0cmFpbGluZyBjb21tYVxuICAgICAgICAgICAgY29uc3QgbmV4dFNpYmxpbmcgPSBnZXROZXh0U2libGluZ0luQXJyYXkobm9kZSwgaXRlbXMpO1xuICAgICAgICAgICAgbGV0IGVuZDogbnVtYmVyO1xuXG4gICAgICAgICAgICBpZiAobmV4dFNpYmxpbmcgIT09IG51bGwgJiZcbiAgICAgICAgICAgICAgICBvdXRwdXQuc2xpY2UobmV4dFNpYmxpbmcuZ2V0RnVsbFN0YXJ0KCkgLSAxLCBuZXh0U2libGluZy5nZXRGdWxsU3RhcnQoKSkgPT09ICcsJykge1xuICAgICAgICAgICAgICBlbmQgPSBuZXh0U2libGluZy5nZXRGdWxsU3RhcnQoKSAtIDEgKyBuZXh0U2libGluZy5nZXRMZWFkaW5nVHJpdmlhV2lkdGgoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3V0cHV0LnNsaWNlKG5vZGUuZ2V0RW5kKCksIG5vZGUuZ2V0RW5kKCkgKyAxKSA9PT0gJywnKSB7XG4gICAgICAgICAgICAgIGVuZCA9IG5vZGUuZ2V0RW5kKCkgKyAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZW5kID0gbm9kZS5nZXRFbmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dHB1dC5yZW1vdmUobm9kZS5nZXRGdWxsU3RhcnQoKSwgZW5kKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJld3JpdGUgdGhlIHRoZSBJVlkgc3dpdGNoIG1hcmtlcnMgdG8gaW5kaWNhdGUgd2UgYXJlIGluIElWWSBtb2RlLlxuICAgKi9cbiAgcmV3cml0ZVN3aXRjaGFibGVEZWNsYXJhdGlvbnMoXG4gICAgICBvdXRwdXRUZXh0OiBNYWdpY1N0cmluZywgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSxcbiAgICAgIGRlY2xhcmF0aW9uczogU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb25bXSk6IHZvaWQge1xuICAgIGRlY2xhcmF0aW9ucy5mb3JFYWNoKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIuZ2V0U3RhcnQoKTtcbiAgICAgIGNvbnN0IGVuZCA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyLmdldEVuZCgpO1xuICAgICAgY29uc3QgcmVwbGFjZW1lbnQgPSBkZWNsYXJhdGlvbi5pbml0aWFsaXplci50ZXh0LnJlcGxhY2UoUFJFX1IzX01BUktFUiwgUE9TVF9SM19NQVJLRVIpO1xuICAgICAgb3V0cHV0VGV4dC5vdmVyd3JpdGUoc3RhcnQsIGVuZCwgcmVwbGFjZW1lbnQpO1xuICAgIH0pO1xuICB9XG5cblxuICAvKipcbiAgICogQWRkIHRoZSB0eXBlIHBhcmFtZXRlcnMgdG8gdGhlIGFwcHJvcHJpYXRlIGZ1bmN0aW9ucyB0aGF0IHJldHVybiBgTW9kdWxlV2l0aFByb3ZpZGVyc2BcbiAgICogc3RydWN0dXJlcy5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiB3aWxsIG9ubHkgZ2V0IGNhbGxlZCBvbiB0eXBpbmdzIGZpbGVzLlxuICAgKi9cbiAgYWRkTW9kdWxlV2l0aFByb3ZpZGVyc1BhcmFtcyhcbiAgICAgIG91dHB1dFRleHQ6IE1hZ2ljU3RyaW5nLCBtb2R1bGVXaXRoUHJvdmlkZXJzOiBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb1tdLFxuICAgICAgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlcik6IHZvaWQge1xuICAgIG1vZHVsZVdpdGhQcm92aWRlcnMuZm9yRWFjaChpbmZvID0+IHtcbiAgICAgIGNvbnN0IG5nTW9kdWxlTmFtZSA9IGluZm8ubmdNb2R1bGUubm9kZS5uYW1lLnRleHQ7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbkZpbGUgPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGluZm8uZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpKTtcbiAgICAgIGNvbnN0IG5nTW9kdWxlRmlsZSA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoaW5mby5uZ01vZHVsZS5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgICBjb25zdCBpbXBvcnRQYXRoID0gaW5mby5uZ01vZHVsZS52aWFNb2R1bGUgfHxcbiAgICAgICAgICAoZGVjbGFyYXRpb25GaWxlICE9PSBuZ01vZHVsZUZpbGUgP1xuICAgICAgICAgICAgICAgc3RyaXBFeHRlbnNpb24oYC4vJHtyZWxhdGl2ZShkaXJuYW1lKGRlY2xhcmF0aW9uRmlsZSksIG5nTW9kdWxlRmlsZSl9YCkgOlxuICAgICAgICAgICAgICAgbnVsbCk7XG4gICAgICBjb25zdCBuZ01vZHVsZSA9IGdlbmVyYXRlSW1wb3J0U3RyaW5nKGltcG9ydE1hbmFnZXIsIGltcG9ydFBhdGgsIG5nTW9kdWxlTmFtZSk7XG5cbiAgICAgIGlmIChpbmZvLmRlY2xhcmF0aW9uLnR5cGUpIHtcbiAgICAgICAgY29uc3QgdHlwZU5hbWUgPSBpbmZvLmRlY2xhcmF0aW9uLnR5cGUgJiYgdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShpbmZvLmRlY2xhcmF0aW9uLnR5cGUpID9cbiAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24udHlwZS50eXBlTmFtZSA6XG4gICAgICAgICAgICBudWxsO1xuICAgICAgICBpZiAodGhpcy5pc0NvcmVNb2R1bGVXaXRoUHJvdmlkZXJzVHlwZSh0eXBlTmFtZSkpIHtcbiAgICAgICAgICAvLyBUaGUgZGVjbGFyYXRpb24gYWxyZWFkeSByZXR1cm5zIGBNb2R1bGVXaXRoUHJvdmlkZXJgIGJ1dCBpdCBuZWVkcyB0aGUgYE5nTW9kdWxlYCB0eXBlXG4gICAgICAgICAgLy8gcGFyYW1ldGVyIGFkZGluZy5cbiAgICAgICAgICBvdXRwdXRUZXh0Lm92ZXJ3cml0ZShcbiAgICAgICAgICAgICAgaW5mby5kZWNsYXJhdGlvbi50eXBlLmdldFN0YXJ0KCksIGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRFbmQoKSxcbiAgICAgICAgICAgICAgYE1vZHVsZVdpdGhQcm92aWRlcnM8JHtuZ01vZHVsZX0+YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIHJldHVybnMgYW4gdW5rbm93biB0eXBlIHNvIHdlIG5lZWQgdG8gY29udmVydCBpdCB0byBhIHVuaW9uIHRoYXRcbiAgICAgICAgICAvLyBpbmNsdWRlcyB0aGUgbmdNb2R1bGUgcHJvcGVydHkuXG4gICAgICAgICAgY29uc3Qgb3JpZ2luYWxUeXBlU3RyaW5nID0gaW5mby5kZWNsYXJhdGlvbi50eXBlLmdldFRleHQoKTtcbiAgICAgICAgICBvdXRwdXRUZXh0Lm92ZXJ3cml0ZShcbiAgICAgICAgICAgICAgaW5mby5kZWNsYXJhdGlvbi50eXBlLmdldFN0YXJ0KCksIGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRFbmQoKSxcbiAgICAgICAgICAgICAgYCgke29yaWdpbmFsVHlwZVN0cmluZ30pJntuZ01vZHVsZToke25nTW9kdWxlfX1gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIGhhcyBubyByZXR1cm4gdHlwZSBzbyBwcm92aWRlIG9uZS5cbiAgICAgICAgY29uc3QgbGFzdFRva2VuID0gaW5mby5kZWNsYXJhdGlvbi5nZXRMYXN0VG9rZW4oKTtcbiAgICAgICAgY29uc3QgaW5zZXJ0UG9pbnQgPSBsYXN0VG9rZW4gJiYgbGFzdFRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU2VtaWNvbG9uVG9rZW4gP1xuICAgICAgICAgICAgbGFzdFRva2VuLmdldFN0YXJ0KCkgOlxuICAgICAgICAgICAgaW5mby5kZWNsYXJhdGlvbi5nZXRFbmQoKTtcbiAgICAgICAgb3V0cHV0VGV4dC5hcHBlbmRMZWZ0KFxuICAgICAgICAgICAgaW5zZXJ0UG9pbnQsXG4gICAgICAgICAgICBgOiAke2dlbmVyYXRlSW1wb3J0U3RyaW5nKGltcG9ydE1hbmFnZXIsICdAYW5ndWxhci9jb3JlJywgJ01vZHVsZVdpdGhQcm92aWRlcnMnKX08JHtuZ01vZHVsZX0+YCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZmluZEVuZE9mSW1wb3J0cyhzZjogdHMuU291cmNlRmlsZSk6IG51bWJlciB7XG4gICAgZm9yIChjb25zdCBzdG10IG9mIHNmLnN0YXRlbWVudHMpIHtcbiAgICAgIGlmICghdHMuaXNJbXBvcnREZWNsYXJhdGlvbihzdG10KSAmJiAhdHMuaXNJbXBvcnRFcXVhbHNEZWNsYXJhdGlvbihzdG10KSAmJlxuICAgICAgICAgICF0cy5pc05hbWVzcGFjZUltcG9ydChzdG10KSkge1xuICAgICAgICByZXR1cm4gc3RtdC5nZXRTdGFydCgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxuXG5cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciB0aGUgZ2l2ZW4gdHlwZSBpcyB0aGUgY29yZSBBbmd1bGFyIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBpbnRlcmZhY2UuXG4gICAqIEBwYXJhbSB0eXBlTmFtZSBUaGUgdHlwZSB0byBjaGVjay5cbiAgICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgdHlwZSBpcyB0aGUgY29yZSBBbmd1bGFyIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBpbnRlcmZhY2UuXG4gICAqL1xuICBwcml2YXRlIGlzQ29yZU1vZHVsZVdpdGhQcm92aWRlcnNUeXBlKHR5cGVOYW1lOiB0cy5FbnRpdHlOYW1lfG51bGwpIHtcbiAgICBjb25zdCBpZCA9XG4gICAgICAgIHR5cGVOYW1lICYmIHRzLmlzSWRlbnRpZmllcih0eXBlTmFtZSkgPyB0aGlzLmhvc3QuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKHR5cGVOYW1lKSA6IG51bGw7XG4gICAgcmV0dXJuIChcbiAgICAgICAgaWQgJiYgaWQubmFtZSA9PT0gJ01vZHVsZVdpdGhQcm92aWRlcnMnICYmICh0aGlzLmlzQ29yZSB8fCBpZC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZScpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU3RhdGVtZW50KG5vZGU6IHRzLk5vZGUpIHtcbiAgd2hpbGUgKG5vZGUpIHtcbiAgICBpZiAodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlSW1wb3J0U3RyaW5nKFxuICAgIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIsIGltcG9ydFBhdGg6IHN0cmluZyB8IG51bGwsIGltcG9ydE5hbWU6IHN0cmluZykge1xuICBjb25zdCBpbXBvcnRBcyA9IGltcG9ydFBhdGggPyBpbXBvcnRNYW5hZ2VyLmdlbmVyYXRlTmFtZWRJbXBvcnQoaW1wb3J0UGF0aCwgaW1wb3J0TmFtZSkgOiBudWxsO1xuICByZXR1cm4gaW1wb3J0QXMgPyBgJHtpbXBvcnRBcy5tb2R1bGVJbXBvcnR9LiR7aW1wb3J0QXMuc3ltYm9sfWAgOiBgJHtpbXBvcnROYW1lfWA7XG59XG5cbmZ1bmN0aW9uIGdldE5leHRTaWJsaW5nSW5BcnJheTxUIGV4dGVuZHMgdHMuTm9kZT4obm9kZTogVCwgYXJyYXk6IHRzLk5vZGVBcnJheTxUPik6IFR8bnVsbCB7XG4gIGNvbnN0IGluZGV4ID0gYXJyYXkuaW5kZXhPZihub2RlKTtcbiAgcmV0dXJuIGluZGV4ICE9PSAtMSAmJiBhcnJheS5sZW5ndGggPiBpbmRleCArIDEgPyBhcnJheVtpbmRleCArIDFdIDogbnVsbDtcbn1cbiJdfQ==