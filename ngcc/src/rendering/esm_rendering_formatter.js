(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/esm_rendering_formatter", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/ngcc/src/host/ngcc_host", "@angular/compiler-cli/ngcc/src/rendering/utils", "@angular/compiler-cli/ngcc/src/host/esm2015_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var ngcc_host_1 = require("@angular/compiler-cli/ngcc/src/host/ngcc_host");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/rendering/utils");
    var esm2015_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm2015_host");
    /**
     * A RenderingFormatter that works with ECMAScript Module import and export statements.
     */
    var EsmRenderingFormatter = /** @class */ (function () {
        function EsmRenderingFormatter(host, isCore) {
            this.host = host;
            this.isCore = isCore;
            this.printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
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
                var exportStr = "\nexport {" + e.identifier + "}" + exportFrom + ";";
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
         * Add the adjacent statements after all static properties of the class.
         */
        EsmRenderingFormatter.prototype.addAdjacentStatements = function (output, compiledClass, statements) {
            var classSymbol = this.host.getClassSymbol(compiledClass.declaration);
            if (!classSymbol) {
                throw new Error("Compiled class does not have a valid symbol: " + compiledClass.name);
            }
            var endOfClass = this.host.getEndOfClass(classSymbol);
            output.appendLeft(endOfClass.getEnd(), '\n' + statements);
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
                            if (ts.isExpressionStatement(statement)) {
                                // The statement looks like: `SomeClass = __decorate(...);`
                                // Remove it completely
                                output.remove(statement.getFullStart(), statement.getEnd());
                            }
                            else if (ts.isReturnStatement(statement) && statement.expression &&
                                esm2015_host_1.isAssignment(statement.expression)) {
                                // The statement looks like: `return SomeClass = __decorate(...);`
                                // We only want to end up with: `return SomeClass;`
                                var startOfRemoval = statement.expression.left.getEnd();
                                var endOfRemoval = getEndExceptSemicolon(statement);
                                output.remove(startOfRemoval, endOfRemoval);
                            }
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
        /**
         * Convert a `Statement` to JavaScript code in a format suitable for rendering by this formatter.
         *
         * @param stmt The `Statement` to print.
         * @param sourceFile A `ts.SourceFile` that provides context for the statement. See
         *     `ts.Printer#printNode()` for more info.
         * @param importManager The `ImportManager` to use for managing imports.
         *
         * @return The JavaScript code corresponding to `stmt` (in the appropriate format).
         */
        EsmRenderingFormatter.prototype.printStatement = function (stmt, sourceFile, importManager) {
            var node = translator_1.translateStatement(stmt, importManager, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, ts.ScriptTarget.ES2015);
            var code = this.printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);
            return code;
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
            if (ts.isExpressionStatement(node) || ts.isReturnStatement(node)) {
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
    function getEndExceptSemicolon(statement) {
        var lastToken = statement.getLastToken();
        return (lastToken && lastToken.kind === ts.SyntaxKind.SemicolonToken) ? statement.getEnd() - 1 :
            statement.getEnd();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtX3JlbmRlcmluZ19mb3JtYXR0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL2VzbV9yZW5kZXJpbmdfZm9ybWF0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVNBLCtCQUFpQztJQUNqQywyRUFBeUc7SUFDekcsbUVBQWtGO0lBQ2xGLHlFQUF3RjtJQUN4RixrRkFBaUU7SUFFakUsMkVBQW1IO0lBSW5ILHdFQUF1QztJQUN2QyxpRkFBa0Q7SUFFbEQ7O09BRUc7SUFDSDtRQUdFLCtCQUFzQixJQUF3QixFQUFZLE1BQWU7WUFBbkQsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBWSxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBRi9ELFlBQU8sR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFDLENBQUMsQ0FBQztRQUVHLENBQUM7UUFFN0U7O1dBRUc7UUFDSCwwQ0FBVSxHQUFWLFVBQVcsTUFBbUIsRUFBRSxPQUFpQixFQUFFLEVBQWlCO1lBQ2xFLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNqRCxJQUFNLGVBQWUsR0FDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLGlCQUFlLENBQUMsQ0FBQyxTQUFTLGVBQVUsQ0FBQyxDQUFDLFNBQVMsU0FBTSxFQUFyRCxDQUFxRCxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3JGLE1BQU0sQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFFRDs7V0FFRztRQUNILDBDQUFVLEdBQVYsVUFDSSxNQUFtQixFQUFFLGtCQUFrQyxFQUFFLE9B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TyxLQUFLLEtBQUssQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDNUUsQ0FBQztJQUVELFNBQVMscUJBQXFCLENBQUMsU0FBdUI7UUFDcEQsSUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzNDLE9BQU8sQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDeEIsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzdGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1N0YXRlbWVudH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7cmVsYXRpdmUsIGRpcm5hbWUsIEFic29sdXRlRnNQYXRoLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCBSZWV4cG9ydH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtJbXBvcnQsIEltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZVN0YXRlbWVudH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtpc0R0c1BhdGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7Q29tcGlsZWRDbGFzc30gZnJvbSAnLi4vYW5hbHlzaXMvdHlwZXMnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3QsIFBPU1RfUjNfTUFSS0VSLCBQUkVfUjNfTUFSS0VSLCBTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbn0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb30gZnJvbSAnLi4vYW5hbHlzaXMvbW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyJztcbmltcG9ydCB7RXhwb3J0SW5mb30gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtSZW5kZXJpbmdGb3JtYXR0ZXIsIFJlZHVuZGFudERlY29yYXRvck1hcH0gZnJvbSAnLi9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7c3RyaXBFeHRlbnNpb259IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtpc0Fzc2lnbm1lbnR9IGZyb20gJy4uL2hvc3QvZXNtMjAxNV9ob3N0JztcblxuLyoqXG4gKiBBIFJlbmRlcmluZ0Zvcm1hdHRlciB0aGF0IHdvcmtzIHdpdGggRUNNQVNjcmlwdCBNb2R1bGUgaW1wb3J0IGFuZCBleHBvcnQgc3RhdGVtZW50cy5cbiAqL1xuZXhwb3J0IGNsYXNzIEVzbVJlbmRlcmluZ0Zvcm1hdHRlciBpbXBsZW1lbnRzIFJlbmRlcmluZ0Zvcm1hdHRlciB7XG4gIHByb3RlY3RlZCBwcmludGVyID0gdHMuY3JlYXRlUHJpbnRlcih7bmV3TGluZTogdHMuTmV3TGluZUtpbmQuTGluZUZlZWR9KTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcm90ZWN0ZWQgaXNDb3JlOiBib29sZWFuKSB7fVxuXG4gIC8qKlxuICAgKiAgQWRkIHRoZSBpbXBvcnRzIGF0IHRoZSB0b3Agb2YgdGhlIGZpbGUsIGFmdGVyIGFueSBpbXBvcnRzIHRoYXQgYXJlIGFscmVhZHkgdGhlcmUuXG4gICAqL1xuICBhZGRJbXBvcnRzKG91dHB1dDogTWFnaWNTdHJpbmcsIGltcG9ydHM6IEltcG9ydFtdLCBzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IGluc2VydGlvblBvaW50ID0gdGhpcy5maW5kRW5kT2ZJbXBvcnRzKHNmKTtcbiAgICBjb25zdCByZW5kZXJlZEltcG9ydHMgPVxuICAgICAgICBpbXBvcnRzLm1hcChpID0+IGBpbXBvcnQgKiBhcyAke2kucXVhbGlmaWVyfSBmcm9tICcke2kuc3BlY2lmaWVyfSc7XFxuYCkuam9pbignJyk7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoaW5zZXJ0aW9uUG9pbnQsIHJlbmRlcmVkSW1wb3J0cyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRoZSBleHBvcnRzIHRvIHRoZSBlbmQgb2YgdGhlIGZpbGUuXG4gICAqL1xuICBhZGRFeHBvcnRzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZW50cnlQb2ludEJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZXhwb3J0czogRXhwb3J0SW5mb1tdLFxuICAgICAgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlciwgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGV4cG9ydHMuZm9yRWFjaChlID0+IHtcbiAgICAgIGxldCBleHBvcnRGcm9tID0gJyc7XG4gICAgICBjb25zdCBpc0R0c0ZpbGUgPSBpc0R0c1BhdGgoZW50cnlQb2ludEJhc2VQYXRoKTtcbiAgICAgIGNvbnN0IGZyb20gPSBpc0R0c0ZpbGUgPyBlLmR0c0Zyb20gOiBlLmZyb207XG5cbiAgICAgIGlmIChmcm9tKSB7XG4gICAgICAgIGNvbnN0IGJhc2VQYXRoID0gc3RyaXBFeHRlbnNpb24oZnJvbSk7XG4gICAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9ICcuLycgKyByZWxhdGl2ZShkaXJuYW1lKGVudHJ5UG9pbnRCYXNlUGF0aCksIGJhc2VQYXRoKTtcbiAgICAgICAgZXhwb3J0RnJvbSA9IGVudHJ5UG9pbnRCYXNlUGF0aCAhPT0gYmFzZVBhdGggPyBgIGZyb20gJyR7cmVsYXRpdmVQYXRofSdgIDogJyc7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGV4cG9ydFN0ciA9IGBcXG5leHBvcnQgeyR7ZS5pZGVudGlmaWVyfX0ke2V4cG9ydEZyb219O2A7XG4gICAgICBvdXRwdXQuYXBwZW5kKGV4cG9ydFN0cik7XG4gICAgfSk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBBZGQgcGxhaW4gZXhwb3J0cyB0byB0aGUgZW5kIG9mIHRoZSBmaWxlLlxuICAgKlxuICAgKiBVbmxpa2UgYGFkZEV4cG9ydHNgLCBkaXJlY3QgZXhwb3J0cyBnbyBkaXJlY3RseSBpbiBhIC5qcyBhbmQgLmQudHMgZmlsZSBhbmQgZG9uJ3QgZ2V0IGFkZGVkIHRvXG4gICAqIGFuIGVudHJ5cG9pbnQuXG4gICAqL1xuICBhZGREaXJlY3RFeHBvcnRzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZXhwb3J0czogUmVleHBvcnRbXSwgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlcixcbiAgICAgIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGUgb2YgZXhwb3J0cykge1xuICAgICAgY29uc3QgZXhwb3J0U3RhdGVtZW50ID0gYFxcbmV4cG9ydCB7JHtlLnN5bWJvbE5hbWV9IGFzICR7ZS5hc0FsaWFzfX0gZnJvbSAnJHtlLmZyb21Nb2R1bGV9JztgO1xuICAgICAgb3V0cHV0LmFwcGVuZChleHBvcnRTdGF0ZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGNvbnN0YW50cyBkaXJlY3RseSBhZnRlciB0aGUgaW1wb3J0cy5cbiAgICovXG4gIGFkZENvbnN0YW50cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBjb25zdGFudHM6IHN0cmluZywgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGlmIChjb25zdGFudHMgPT09ICcnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGluc2VydGlvblBvaW50ID0gdGhpcy5maW5kRW5kT2ZJbXBvcnRzKGZpbGUpO1xuXG4gICAgLy8gQXBwZW5kIHRoZSBjb25zdGFudHMgdG8gdGhlIHJpZ2h0IG9mIHRoZSBpbnNlcnRpb24gcG9pbnQsIHRvIGVuc3VyZSB0aGV5IGdldCBvcmRlcmVkIGFmdGVyXG4gICAgLy8gYWRkZWQgaW1wb3J0cyAodGhvc2UgYXJlIGFwcGVuZGVkIGxlZnQgdG8gdGhlIGluc2VydGlvbiBwb2ludCkuXG4gICAgb3V0cHV0LmFwcGVuZFJpZ2h0KGluc2VydGlvblBvaW50LCAnXFxuJyArIGNvbnN0YW50cyArICdcXG4nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGRlZmluaXRpb25zIGRpcmVjdGx5IGFmdGVyIHRoZWlyIGRlY29yYXRlZCBjbGFzcy5cbiAgICovXG4gIGFkZERlZmluaXRpb25zKG91dHB1dDogTWFnaWNTdHJpbmcsIGNvbXBpbGVkQ2xhc3M6IENvbXBpbGVkQ2xhc3MsIGRlZmluaXRpb25zOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuaG9zdC5nZXRDbGFzc1N5bWJvbChjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uKTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbXBpbGVkIGNsYXNzIGRvZXMgbm90IGhhdmUgYSB2YWxpZCBzeW1ib2w6ICR7Y29tcGlsZWRDbGFzcy5uYW1lfWApO1xuICAgIH1cbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9IGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24uZ2V0RW5kKCk7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoaW5zZXJ0aW9uUG9pbnQsICdcXG4nICsgZGVmaW5pdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgYWRqYWNlbnQgc3RhdGVtZW50cyBhZnRlciBhbGwgc3RhdGljIHByb3BlcnRpZXMgb2YgdGhlIGNsYXNzLlxuICAgKi9cbiAgYWRkQWRqYWNlbnRTdGF0ZW1lbnRzKG91dHB1dDogTWFnaWNTdHJpbmcsIGNvbXBpbGVkQ2xhc3M6IENvbXBpbGVkQ2xhc3MsIHN0YXRlbWVudHM6IHN0cmluZyk6XG4gICAgICB2b2lkIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuaG9zdC5nZXRDbGFzc1N5bWJvbChjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uKTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbXBpbGVkIGNsYXNzIGRvZXMgbm90IGhhdmUgYSB2YWxpZCBzeW1ib2w6ICR7Y29tcGlsZWRDbGFzcy5uYW1lfWApO1xuICAgIH1cbiAgICBjb25zdCBlbmRPZkNsYXNzID0gdGhpcy5ob3N0LmdldEVuZE9mQ2xhc3MoY2xhc3NTeW1ib2wpO1xuICAgIG91dHB1dC5hcHBlbmRMZWZ0KGVuZE9mQ2xhc3MuZ2V0RW5kKCksICdcXG4nICsgc3RhdGVtZW50cyk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHN0YXRpYyBkZWNvcmF0b3IgcHJvcGVydGllcyBmcm9tIGNsYXNzZXMuXG4gICAqL1xuICByZW1vdmVEZWNvcmF0b3JzKG91dHB1dDogTWFnaWNTdHJpbmcsIGRlY29yYXRvcnNUb1JlbW92ZTogUmVkdW5kYW50RGVjb3JhdG9yTWFwKTogdm9pZCB7XG4gICAgZGVjb3JhdG9yc1RvUmVtb3ZlLmZvckVhY2goKG5vZGVzVG9SZW1vdmUsIGNvbnRhaW5lck5vZGUpID0+IHtcbiAgICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oY29udGFpbmVyTm9kZSkpIHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBjb250YWluZXJOb2RlLmVsZW1lbnRzO1xuICAgICAgICBpZiAoaXRlbXMubGVuZ3RoID09PSBub2Rlc1RvUmVtb3ZlLmxlbmd0aCkge1xuICAgICAgICAgIC8vIFJlbW92ZSB0aGUgZW50aXJlIHN0YXRlbWVudFxuICAgICAgICAgIGNvbnN0IHN0YXRlbWVudCA9IGZpbmRTdGF0ZW1lbnQoY29udGFpbmVyTm9kZSk7XG4gICAgICAgICAgaWYgKHN0YXRlbWVudCkge1xuICAgICAgICAgICAgaWYgKHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgICAgICAgIC8vIFRoZSBzdGF0ZW1lbnQgbG9va3MgbGlrZTogYFNvbWVDbGFzcyA9IF9fZGVjb3JhdGUoLi4uKTtgXG4gICAgICAgICAgICAgIC8vIFJlbW92ZSBpdCBjb21wbGV0ZWx5XG4gICAgICAgICAgICAgIG91dHB1dC5yZW1vdmUoc3RhdGVtZW50LmdldEZ1bGxTdGFydCgpLCBzdGF0ZW1lbnQuZ2V0RW5kKCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgICB0cy5pc1JldHVyblN0YXRlbWVudChzdGF0ZW1lbnQpICYmIHN0YXRlbWVudC5leHByZXNzaW9uICYmXG4gICAgICAgICAgICAgICAgaXNBc3NpZ25tZW50KHN0YXRlbWVudC5leHByZXNzaW9uKSkge1xuICAgICAgICAgICAgICAvLyBUaGUgc3RhdGVtZW50IGxvb2tzIGxpa2U6IGByZXR1cm4gU29tZUNsYXNzID0gX19kZWNvcmF0ZSguLi4pO2BcbiAgICAgICAgICAgICAgLy8gV2Ugb25seSB3YW50IHRvIGVuZCB1cCB3aXRoOiBgcmV0dXJuIFNvbWVDbGFzcztgXG4gICAgICAgICAgICAgIGNvbnN0IHN0YXJ0T2ZSZW1vdmFsID0gc3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdC5nZXRFbmQoKTtcbiAgICAgICAgICAgICAgY29uc3QgZW5kT2ZSZW1vdmFsID0gZ2V0RW5kRXhjZXB0U2VtaWNvbG9uKHN0YXRlbWVudCk7XG4gICAgICAgICAgICAgIG91dHB1dC5yZW1vdmUoc3RhcnRPZlJlbW92YWwsIGVuZE9mUmVtb3ZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5vZGVzVG9SZW1vdmUuZm9yRWFjaChub2RlID0+IHtcbiAgICAgICAgICAgIC8vIHJlbW92ZSBhbnkgdHJhaWxpbmcgY29tbWFcbiAgICAgICAgICAgIGNvbnN0IG5leHRTaWJsaW5nID0gZ2V0TmV4dFNpYmxpbmdJbkFycmF5KG5vZGUsIGl0ZW1zKTtcbiAgICAgICAgICAgIGxldCBlbmQ6IG51bWJlcjtcblxuICAgICAgICAgICAgaWYgKG5leHRTaWJsaW5nICE9PSBudWxsICYmXG4gICAgICAgICAgICAgICAgb3V0cHV0LnNsaWNlKG5leHRTaWJsaW5nLmdldEZ1bGxTdGFydCgpIC0gMSwgbmV4dFNpYmxpbmcuZ2V0RnVsbFN0YXJ0KCkpID09PSAnLCcpIHtcbiAgICAgICAgICAgICAgZW5kID0gbmV4dFNpYmxpbmcuZ2V0RnVsbFN0YXJ0KCkgLSAxICsgbmV4dFNpYmxpbmcuZ2V0TGVhZGluZ1RyaXZpYVdpZHRoKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG91dHB1dC5zbGljZShub2RlLmdldEVuZCgpLCBub2RlLmdldEVuZCgpICsgMSkgPT09ICcsJykge1xuICAgICAgICAgICAgICBlbmQgPSBub2RlLmdldEVuZCgpICsgMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGVuZCA9IG5vZGUuZ2V0RW5kKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXRwdXQucmVtb3ZlKG5vZGUuZ2V0RnVsbFN0YXJ0KCksIGVuZCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXdyaXRlIHRoZSB0aGUgSVZZIHN3aXRjaCBtYXJrZXJzIHRvIGluZGljYXRlIHdlIGFyZSBpbiBJVlkgbW9kZS5cbiAgICovXG4gIHJld3JpdGVTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKFxuICAgICAgb3V0cHV0VGV4dDogTWFnaWNTdHJpbmcsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsXG4gICAgICBkZWNsYXJhdGlvbnM6IFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uW10pOiB2b2lkIHtcbiAgICBkZWNsYXJhdGlvbnMuZm9yRWFjaChkZWNsYXJhdGlvbiA9PiB7XG4gICAgICBjb25zdCBzdGFydCA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyLmdldFN0YXJ0KCk7XG4gICAgICBjb25zdCBlbmQgPSBkZWNsYXJhdGlvbi5pbml0aWFsaXplci5nZXRFbmQoKTtcbiAgICAgIGNvbnN0IHJlcGxhY2VtZW50ID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIudGV4dC5yZXBsYWNlKFBSRV9SM19NQVJLRVIsIFBPU1RfUjNfTUFSS0VSKTtcbiAgICAgIG91dHB1dFRleHQub3ZlcndyaXRlKHN0YXJ0LCBlbmQsIHJlcGxhY2VtZW50KTtcbiAgICB9KTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgdHlwZSBwYXJhbWV0ZXJzIHRvIHRoZSBhcHByb3ByaWF0ZSBmdW5jdGlvbnMgdGhhdCByZXR1cm4gYE1vZHVsZVdpdGhQcm92aWRlcnNgXG4gICAqIHN0cnVjdHVyZXMuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gd2lsbCBvbmx5IGdldCBjYWxsZWQgb24gdHlwaW5ncyBmaWxlcy5cbiAgICovXG4gIGFkZE1vZHVsZVdpdGhQcm92aWRlcnNQYXJhbXMoXG4gICAgICBvdXRwdXRUZXh0OiBNYWdpY1N0cmluZywgbW9kdWxlV2l0aFByb3ZpZGVyczogTW9kdWxlV2l0aFByb3ZpZGVyc0luZm9bXSxcbiAgICAgIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIpOiB2b2lkIHtcbiAgICBtb2R1bGVXaXRoUHJvdmlkZXJzLmZvckVhY2goaW5mbyA9PiB7XG4gICAgICBjb25zdCBuZ01vZHVsZU5hbWUgPSBpbmZvLm5nTW9kdWxlLm5vZGUubmFtZS50ZXh0O1xuICAgICAgY29uc3QgZGVjbGFyYXRpb25GaWxlID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShpbmZvLmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgICBjb25zdCBuZ01vZHVsZUZpbGUgPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGluZm8ubmdNb2R1bGUubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgICAgY29uc3QgaW1wb3J0UGF0aCA9IGluZm8ubmdNb2R1bGUudmlhTW9kdWxlIHx8XG4gICAgICAgICAgKGRlY2xhcmF0aW9uRmlsZSAhPT0gbmdNb2R1bGVGaWxlID9cbiAgICAgICAgICAgICAgIHN0cmlwRXh0ZW5zaW9uKGAuLyR7cmVsYXRpdmUoZGlybmFtZShkZWNsYXJhdGlvbkZpbGUpLCBuZ01vZHVsZUZpbGUpfWApIDpcbiAgICAgICAgICAgICAgIG51bGwpO1xuICAgICAgY29uc3QgbmdNb2R1bGUgPSBnZW5lcmF0ZUltcG9ydFN0cmluZyhpbXBvcnRNYW5hZ2VyLCBpbXBvcnRQYXRoLCBuZ01vZHVsZU5hbWUpO1xuXG4gICAgICBpZiAoaW5mby5kZWNsYXJhdGlvbi50eXBlKSB7XG4gICAgICAgIGNvbnN0IHR5cGVOYW1lID0gaW5mby5kZWNsYXJhdGlvbi50eXBlICYmIHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoaW5mby5kZWNsYXJhdGlvbi50eXBlKSA/XG4gICAgICAgICAgICBpbmZvLmRlY2xhcmF0aW9uLnR5cGUudHlwZU5hbWUgOlxuICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgaWYgKHRoaXMuaXNDb3JlTW9kdWxlV2l0aFByb3ZpZGVyc1R5cGUodHlwZU5hbWUpKSB7XG4gICAgICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIGFscmVhZHkgcmV0dXJucyBgTW9kdWxlV2l0aFByb3ZpZGVyYCBidXQgaXQgbmVlZHMgdGhlIGBOZ01vZHVsZWAgdHlwZVxuICAgICAgICAgIC8vIHBhcmFtZXRlciBhZGRpbmcuXG4gICAgICAgICAgb3V0cHV0VGV4dC5vdmVyd3JpdGUoXG4gICAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRTdGFydCgpLCBpbmZvLmRlY2xhcmF0aW9uLnR5cGUuZ2V0RW5kKCksXG4gICAgICAgICAgICAgIGBNb2R1bGVXaXRoUHJvdmlkZXJzPCR7bmdNb2R1bGV9PmApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiByZXR1cm5zIGFuIHVua25vd24gdHlwZSBzbyB3ZSBuZWVkIHRvIGNvbnZlcnQgaXQgdG8gYSB1bmlvbiB0aGF0XG4gICAgICAgICAgLy8gaW5jbHVkZXMgdGhlIG5nTW9kdWxlIHByb3BlcnR5LlxuICAgICAgICAgIGNvbnN0IG9yaWdpbmFsVHlwZVN0cmluZyA9IGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRUZXh0KCk7XG4gICAgICAgICAgb3V0cHV0VGV4dC5vdmVyd3JpdGUoXG4gICAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRTdGFydCgpLCBpbmZvLmRlY2xhcmF0aW9uLnR5cGUuZ2V0RW5kKCksXG4gICAgICAgICAgICAgIGAoJHtvcmlnaW5hbFR5cGVTdHJpbmd9KSZ7bmdNb2R1bGU6JHtuZ01vZHVsZX19YCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBoYXMgbm8gcmV0dXJuIHR5cGUgc28gcHJvdmlkZSBvbmUuXG4gICAgICAgIGNvbnN0IGxhc3RUb2tlbiA9IGluZm8uZGVjbGFyYXRpb24uZ2V0TGFzdFRva2VuKCk7XG4gICAgICAgIGNvbnN0IGluc2VydFBvaW50ID0gbGFzdFRva2VuICYmIGxhc3RUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLlNlbWljb2xvblRva2VuID9cbiAgICAgICAgICAgIGxhc3RUb2tlbi5nZXRTdGFydCgpIDpcbiAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24uZ2V0RW5kKCk7XG4gICAgICAgIG91dHB1dFRleHQuYXBwZW5kTGVmdChcbiAgICAgICAgICAgIGluc2VydFBvaW50LFxuICAgICAgICAgICAgYDogJHtnZW5lcmF0ZUltcG9ydFN0cmluZyhpbXBvcnRNYW5hZ2VyLCAnQGFuZ3VsYXIvY29yZScsICdNb2R1bGVXaXRoUHJvdmlkZXJzJyl9PCR7bmdNb2R1bGV9PmApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYSBgU3RhdGVtZW50YCB0byBKYXZhU2NyaXB0IGNvZGUgaW4gYSBmb3JtYXQgc3VpdGFibGUgZm9yIHJlbmRlcmluZyBieSB0aGlzIGZvcm1hdHRlci5cbiAgICpcbiAgICogQHBhcmFtIHN0bXQgVGhlIGBTdGF0ZW1lbnRgIHRvIHByaW50LlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBBIGB0cy5Tb3VyY2VGaWxlYCB0aGF0IHByb3ZpZGVzIGNvbnRleHQgZm9yIHRoZSBzdGF0ZW1lbnQuIFNlZVxuICAgKiAgICAgYHRzLlByaW50ZXIjcHJpbnROb2RlKClgIGZvciBtb3JlIGluZm8uXG4gICAqIEBwYXJhbSBpbXBvcnRNYW5hZ2VyIFRoZSBgSW1wb3J0TWFuYWdlcmAgdG8gdXNlIGZvciBtYW5hZ2luZyBpbXBvcnRzLlxuICAgKlxuICAgKiBAcmV0dXJuIFRoZSBKYXZhU2NyaXB0IGNvZGUgY29ycmVzcG9uZGluZyB0byBgc3RtdGAgKGluIHRoZSBhcHByb3ByaWF0ZSBmb3JtYXQpLlxuICAgKi9cbiAgcHJpbnRTdGF0ZW1lbnQoc3RtdDogU3RhdGVtZW50LCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgICBjb25zdCBub2RlID0gdHJhbnNsYXRlU3RhdGVtZW50KFxuICAgICAgICBzdG10LCBpbXBvcnRNYW5hZ2VyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1KTtcbiAgICBjb25zdCBjb2RlID0gdGhpcy5wcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgbm9kZSwgc291cmNlRmlsZSk7XG5cbiAgICByZXR1cm4gY29kZTtcbiAgfVxuXG4gIHByb3RlY3RlZCBmaW5kRW5kT2ZJbXBvcnRzKHNmOiB0cy5Tb3VyY2VGaWxlKTogbnVtYmVyIHtcbiAgICBmb3IgKGNvbnN0IHN0bXQgb2Ygc2Yuc3RhdGVtZW50cykge1xuICAgICAgaWYgKCF0cy5pc0ltcG9ydERlY2xhcmF0aW9uKHN0bXQpICYmICF0cy5pc0ltcG9ydEVxdWFsc0RlY2xhcmF0aW9uKHN0bXQpICYmXG4gICAgICAgICAgIXRzLmlzTmFtZXNwYWNlSW1wb3J0KHN0bXQpKSB7XG4gICAgICAgIHJldHVybiBzdG10LmdldFN0YXJ0KCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9XG5cblxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiB0eXBlIGlzIHRoZSBjb3JlIEFuZ3VsYXIgYE1vZHVsZVdpdGhQcm92aWRlcnNgIGludGVyZmFjZS5cbiAgICogQHBhcmFtIHR5cGVOYW1lIFRoZSB0eXBlIHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB0cnVlIGlmIHRoZSB0eXBlIGlzIHRoZSBjb3JlIEFuZ3VsYXIgYE1vZHVsZVdpdGhQcm92aWRlcnNgIGludGVyZmFjZS5cbiAgICovXG4gIHByaXZhdGUgaXNDb3JlTW9kdWxlV2l0aFByb3ZpZGVyc1R5cGUodHlwZU5hbWU6IHRzLkVudGl0eU5hbWV8bnVsbCkge1xuICAgIGNvbnN0IGlkID1cbiAgICAgICAgdHlwZU5hbWUgJiYgdHMuaXNJZGVudGlmaWVyKHR5cGVOYW1lKSA/IHRoaXMuaG9zdC5nZXRJbXBvcnRPZklkZW50aWZpZXIodHlwZU5hbWUpIDogbnVsbDtcbiAgICByZXR1cm4gKFxuICAgICAgICBpZCAmJiBpZC5uYW1lID09PSAnTW9kdWxlV2l0aFByb3ZpZGVycycgJiYgKHRoaXMuaXNDb3JlIHx8IGlkLmZyb20gPT09ICdAYW5ndWxhci9jb3JlJykpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRTdGF0ZW1lbnQobm9kZTogdHMuTm9kZSkge1xuICB3aGlsZSAobm9kZSkge1xuICAgIGlmICh0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQobm9kZSkgfHwgdHMuaXNSZXR1cm5TdGF0ZW1lbnQobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVJbXBvcnRTdHJpbmcoXG4gICAgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlciwgaW1wb3J0UGF0aDogc3RyaW5nIHwgbnVsbCwgaW1wb3J0TmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IGltcG9ydEFzID0gaW1wb3J0UGF0aCA/IGltcG9ydE1hbmFnZXIuZ2VuZXJhdGVOYW1lZEltcG9ydChpbXBvcnRQYXRoLCBpbXBvcnROYW1lKSA6IG51bGw7XG4gIHJldHVybiBpbXBvcnRBcyA/IGAke2ltcG9ydEFzLm1vZHVsZUltcG9ydH0uJHtpbXBvcnRBcy5zeW1ib2x9YCA6IGAke2ltcG9ydE5hbWV9YDtcbn1cblxuZnVuY3Rpb24gZ2V0TmV4dFNpYmxpbmdJbkFycmF5PFQgZXh0ZW5kcyB0cy5Ob2RlPihub2RlOiBULCBhcnJheTogdHMuTm9kZUFycmF5PFQ+KTogVHxudWxsIHtcbiAgY29uc3QgaW5kZXggPSBhcnJheS5pbmRleE9mKG5vZGUpO1xuICByZXR1cm4gaW5kZXggIT09IC0xICYmIGFycmF5Lmxlbmd0aCA+IGluZGV4ICsgMSA/IGFycmF5W2luZGV4ICsgMV0gOiBudWxsO1xufVxuXG5mdW5jdGlvbiBnZXRFbmRFeGNlcHRTZW1pY29sb24oc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBudW1iZXIge1xuICBjb25zdCBsYXN0VG9rZW4gPSBzdGF0ZW1lbnQuZ2V0TGFzdFRva2VuKCk7XG4gIHJldHVybiAobGFzdFRva2VuICYmIGxhc3RUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLlNlbWljb2xvblRva2VuKSA/IHN0YXRlbWVudC5nZXRFbmQoKSAtIDEgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnQuZ2V0RW5kKCk7XG59Il19