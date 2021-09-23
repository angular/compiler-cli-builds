(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/esm_rendering_formatter", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/ngcc/src/host/esm2015_host", "@angular/compiler-cli/ngcc/src/host/ngcc_host", "@angular/compiler-cli/ngcc/src/rendering/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EsmRenderingFormatter = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var esm2015_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm2015_host");
    var ngcc_host_1 = require("@angular/compiler-cli/ngcc/src/host/ngcc_host");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/rendering/utils");
    /**
     * A RenderingFormatter that works with ECMAScript Module import and export statements.
     */
    var EsmRenderingFormatter = /** @class */ (function () {
        function EsmRenderingFormatter(fs, host, isCore) {
            this.fs = fs;
            this.host = host;
            this.isCore = isCore;
            this.printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        }
        /**
         *  Add the imports at the top of the file, after any imports that are already there.
         */
        EsmRenderingFormatter.prototype.addImports = function (output, imports, sf) {
            if (imports.length === 0) {
                return;
            }
            var insertionPoint = this.findEndOfImports(sf);
            var renderedImports = imports.map(function (i) { return "import * as " + i.qualifier.text + " from '" + i.specifier + "';\n"; }).join('');
            output.appendLeft(insertionPoint, renderedImports);
        };
        /**
         * Add the exports to the end of the file.
         */
        EsmRenderingFormatter.prototype.addExports = function (output, entryPointBasePath, exports, importManager, file) {
            var _this = this;
            exports.forEach(function (e) {
                var exportFrom = '';
                var isDtsFile = (0, typescript_1.isDtsPath)(entryPointBasePath);
                var from = isDtsFile ? e.dtsFrom : e.from;
                if (from) {
                    var basePath = (0, utils_1.stripExtension)(from);
                    var relativePath = _this.fs.relative(_this.fs.dirname(entryPointBasePath), basePath);
                    var relativeImport = (0, file_system_1.toRelativeImport)(relativePath);
                    exportFrom = entryPointBasePath !== basePath ? " from '" + relativeImport + "'" : '';
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
                for (var exports_1 = (0, tslib_1.__values)(exports), exports_1_1 = exports_1.next(); !exports_1_1.done; exports_1_1 = exports_1.next()) {
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
            var declarationStatement = (0, esm2015_host_1.getContainingStatement)(classSymbol.implementation.valueDeclaration);
            var insertionPoint = declarationStatement.getEnd();
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
                                (0, esm2015_host_1.isAssignment)(statement.expression)) {
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
         * Rewrite the IVY switch markers to indicate we are in IVY mode.
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
                var declarationFile = (0, file_system_1.absoluteFromSourceFile)(info.declaration.getSourceFile());
                var ngModuleFile = (0, file_system_1.absoluteFromSourceFile)(info.ngModule.node.getSourceFile());
                var relativePath = _this.fs.relative(_this.fs.dirname(declarationFile), ngModuleFile);
                var relativeImport = (0, file_system_1.toRelativeImport)(relativePath);
                var importPath = info.ngModule.ownedByModuleGuess ||
                    (declarationFile !== ngModuleFile ? (0, utils_1.stripExtension)(relativeImport) : null);
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
            var node = (0, translator_1.translateStatement)(stmt, importManager);
            var code = this.printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);
            return code;
        };
        EsmRenderingFormatter.prototype.findEndOfImports = function (sf) {
            var e_2, _a;
            try {
                for (var _b = (0, tslib_1.__values)(sf.statements), _c = _b.next(); !_c.done; _c = _b.next()) {
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
        return importAs && importAs.moduleImport ? importAs.moduleImport.text + "." + importAs.symbol :
            "" + importName;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtX3JlbmRlcmluZ19mb3JtYXR0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL2VzbV9yZW5kZXJpbmdfZm9ybWF0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFTQSwrQkFBaUM7SUFFakMsMkVBQTBIO0lBRTFILHlFQUF3RjtJQUN4RixrRkFBaUU7SUFJakUsaUZBQTBFO0lBQzFFLDJFQUFtSDtJQUduSCx3RUFBdUM7SUFFdkM7O09BRUc7SUFDSDtRQUdFLCtCQUNjLEVBQW9CLEVBQVksSUFBd0IsRUFDeEQsTUFBZTtZQURmLE9BQUUsR0FBRixFQUFFLENBQWtCO1lBQVksU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFDeEQsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUpuQixZQUFPLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxFQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBQyxDQUFDLENBQUM7UUFJekMsQ0FBQztRQUVqQzs7V0FFRztRQUNILDBDQUFVLEdBQVYsVUFBVyxNQUFtQixFQUFFLE9BQWlCLEVBQUUsRUFBaUI7WUFDbEUsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDeEIsT0FBTzthQUNSO1lBRUQsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pELElBQU0sZUFBZSxHQUNqQixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsaUJBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQVUsQ0FBQyxDQUFDLFNBQVMsU0FBTSxFQUExRCxDQUEwRCxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzFGLE1BQU0sQ0FBQyxVQUFVLENBQUMs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b0IsQ0FDekIsYUFBNEIsRUFBRSxVQUF1QixFQUFFLFVBQWtCO1FBQzNFLElBQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQy9GLE9BQU8sUUFBUSxJQUFJLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFJLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFJLFFBQVEsQ0FBQyxNQUFRLENBQUMsQ0FBQztZQUNwRCxLQUFHLFVBQVksQ0FBQztJQUM3RCxDQUFDO0lBRUQsU0FBUyxxQkFBcUIsQ0FBb0IsSUFBTyxFQUFFLEtBQXNCO1FBQy9FLElBQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsT0FBTyxLQUFLLEtBQUssQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDNUUsQ0FBQztJQUVELFNBQVMscUJBQXFCLENBQUMsU0FBdUI7UUFDcEQsSUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzNDLE9BQU8sQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDeEIsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzdGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7U3RhdGVtZW50fSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRoLCBQYXRoTWFuaXB1bGF0aW9uLCB0b1JlbGF0aXZlSW1wb3J0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtSZWV4cG9ydH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtJbXBvcnQsIEltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZVN0YXRlbWVudH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtpc0R0c1BhdGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc0luZm99IGZyb20gJy4uL2FuYWx5c2lzL21vZHVsZV93aXRoX3Byb3ZpZGVyc19hbmFseXplcic7XG5pbXBvcnQge0V4cG9ydEluZm99IGZyb20gJy4uL2FuYWx5c2lzL3ByaXZhdGVfZGVjbGFyYXRpb25zX2FuYWx5emVyJztcbmltcG9ydCB7Q29tcGlsZWRDbGFzc30gZnJvbSAnLi4vYW5hbHlzaXMvdHlwZXMnO1xuaW1wb3J0IHtnZXRDb250YWluaW5nU3RhdGVtZW50LCBpc0Fzc2lnbm1lbnR9IGZyb20gJy4uL2hvc3QvZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0LCBQT1NUX1IzX01BUktFUiwgUFJFX1IzX01BUktFUiwgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcblxuaW1wb3J0IHtSZWR1bmRhbnREZWNvcmF0b3JNYXAsIFJlbmRlcmluZ0Zvcm1hdHRlcn0gZnJvbSAnLi9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7c3RyaXBFeHRlbnNpb259IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEEgUmVuZGVyaW5nRm9ybWF0dGVyIHRoYXQgd29ya3Mgd2l0aCBFQ01BU2NyaXB0IE1vZHVsZSBpbXBvcnQgYW5kIGV4cG9ydCBzdGF0ZW1lbnRzLlxuICovXG5leHBvcnQgY2xhc3MgRXNtUmVuZGVyaW5nRm9ybWF0dGVyIGltcGxlbWVudHMgUmVuZGVyaW5nRm9ybWF0dGVyIHtcbiAgcHJvdGVjdGVkIHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKHtuZXdMaW5lOiB0cy5OZXdMaW5lS2luZC5MaW5lRmVlZH0pO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJvdGVjdGVkIGZzOiBQYXRoTWFuaXB1bGF0aW9uLCBwcm90ZWN0ZWQgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJvdGVjdGVkIGlzQ29yZTogYm9vbGVhbikge31cblxuICAvKipcbiAgICogIEFkZCB0aGUgaW1wb3J0cyBhdCB0aGUgdG9wIG9mIHRoZSBmaWxlLCBhZnRlciBhbnkgaW1wb3J0cyB0aGF0IGFyZSBhbHJlYWR5IHRoZXJlLlxuICAgKi9cbiAgYWRkSW1wb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBpbXBvcnRzOiBJbXBvcnRbXSwgc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBpZiAoaW1wb3J0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9IHRoaXMuZmluZEVuZE9mSW1wb3J0cyhzZik7XG4gICAgY29uc3QgcmVuZGVyZWRJbXBvcnRzID1cbiAgICAgICAgaW1wb3J0cy5tYXAoaSA9PiBgaW1wb3J0ICogYXMgJHtpLnF1YWxpZmllci50ZXh0fSBmcm9tICcke2kuc3BlY2lmaWVyfSc7XFxuYCkuam9pbignJyk7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoaW5zZXJ0aW9uUG9pbnQsIHJlbmRlcmVkSW1wb3J0cyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRoZSBleHBvcnRzIHRvIHRoZSBlbmQgb2YgdGhlIGZpbGUuXG4gICAqL1xuICBhZGRFeHBvcnRzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZW50cnlQb2ludEJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZXhwb3J0czogRXhwb3J0SW5mb1tdLFxuICAgICAgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlciwgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGV4cG9ydHMuZm9yRWFjaChlID0+IHtcbiAgICAgIGxldCBleHBvcnRGcm9tID0gJyc7XG4gICAgICBjb25zdCBpc0R0c0ZpbGUgPSBpc0R0c1BhdGgoZW50cnlQb2ludEJhc2VQYXRoKTtcbiAgICAgIGNvbnN0IGZyb20gPSBpc0R0c0ZpbGUgPyBlLmR0c0Zyb20gOiBlLmZyb207XG5cbiAgICAgIGlmIChmcm9tKSB7XG4gICAgICAgIGNvbnN0IGJhc2VQYXRoID0gc3RyaXBFeHRlbnNpb24oZnJvbSk7XG4gICAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHRoaXMuZnMucmVsYXRpdmUodGhpcy5mcy5kaXJuYW1lKGVudHJ5UG9pbnRCYXNlUGF0aCksIGJhc2VQYXRoKTtcbiAgICAgICAgY29uc3QgcmVsYXRpdmVJbXBvcnQgPSB0b1JlbGF0aXZlSW1wb3J0KHJlbGF0aXZlUGF0aCk7XG4gICAgICAgIGV4cG9ydEZyb20gPSBlbnRyeVBvaW50QmFzZVBhdGggIT09IGJhc2VQYXRoID8gYCBmcm9tICcke3JlbGF0aXZlSW1wb3J0fSdgIDogJyc7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGV4cG9ydFN0ciA9IGBcXG5leHBvcnQgeyR7ZS5pZGVudGlmaWVyfX0ke2V4cG9ydEZyb219O2A7XG4gICAgICBvdXRwdXQuYXBwZW5kKGV4cG9ydFN0cik7XG4gICAgfSk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBBZGQgcGxhaW4gZXhwb3J0cyB0byB0aGUgZW5kIG9mIHRoZSBmaWxlLlxuICAgKlxuICAgKiBVbmxpa2UgYGFkZEV4cG9ydHNgLCBkaXJlY3QgZXhwb3J0cyBnbyBkaXJlY3RseSBpbiBhIC5qcyBhbmQgLmQudHMgZmlsZSBhbmQgZG9uJ3QgZ2V0IGFkZGVkIHRvXG4gICAqIGFuIGVudHJ5cG9pbnQuXG4gICAqL1xuICBhZGREaXJlY3RFeHBvcnRzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZXhwb3J0czogUmVleHBvcnRbXSwgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlcixcbiAgICAgIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGUgb2YgZXhwb3J0cykge1xuICAgICAgY29uc3QgZXhwb3J0U3RhdGVtZW50ID0gYFxcbmV4cG9ydCB7JHtlLnN5bWJvbE5hbWV9IGFzICR7ZS5hc0FsaWFzfX0gZnJvbSAnJHtlLmZyb21Nb2R1bGV9JztgO1xuICAgICAgb3V0cHV0LmFwcGVuZChleHBvcnRTdGF0ZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGNvbnN0YW50cyBkaXJlY3RseSBhZnRlciB0aGUgaW1wb3J0cy5cbiAgICovXG4gIGFkZENvbnN0YW50cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBjb25zdGFudHM6IHN0cmluZywgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGlmIChjb25zdGFudHMgPT09ICcnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGluc2VydGlvblBvaW50ID0gdGhpcy5maW5kRW5kT2ZJbXBvcnRzKGZpbGUpO1xuXG4gICAgLy8gQXBwZW5kIHRoZSBjb25zdGFudHMgdG8gdGhlIHJpZ2h0IG9mIHRoZSBpbnNlcnRpb24gcG9pbnQsIHRvIGVuc3VyZSB0aGV5IGdldCBvcmRlcmVkIGFmdGVyXG4gICAgLy8gYWRkZWQgaW1wb3J0cyAodGhvc2UgYXJlIGFwcGVuZGVkIGxlZnQgdG8gdGhlIGluc2VydGlvbiBwb2ludCkuXG4gICAgb3V0cHV0LmFwcGVuZFJpZ2h0KGluc2VydGlvblBvaW50LCAnXFxuJyArIGNvbnN0YW50cyArICdcXG4nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGRlZmluaXRpb25zIGRpcmVjdGx5IGFmdGVyIHRoZWlyIGRlY29yYXRlZCBjbGFzcy5cbiAgICovXG4gIGFkZERlZmluaXRpb25zKG91dHB1dDogTWFnaWNTdHJpbmcsIGNvbXBpbGVkQ2xhc3M6IENvbXBpbGVkQ2xhc3MsIGRlZmluaXRpb25zOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuaG9zdC5nZXRDbGFzc1N5bWJvbChjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uKTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbXBpbGVkIGNsYXNzIGRvZXMgbm90IGhhdmUgYSB2YWxpZCBzeW1ib2w6ICR7Y29tcGlsZWRDbGFzcy5uYW1lfWApO1xuICAgIH1cbiAgICBjb25zdCBkZWNsYXJhdGlvblN0YXRlbWVudCA9XG4gICAgICAgIGdldENvbnRhaW5pbmdTdGF0ZW1lbnQoY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24udmFsdWVEZWNsYXJhdGlvbik7XG4gICAgY29uc3QgaW5zZXJ0aW9uUG9pbnQgPSBkZWNsYXJhdGlvblN0YXRlbWVudC5nZXRFbmQoKTtcbiAgICBvdXRwdXQuYXBwZW5kTGVmdChpbnNlcnRpb25Qb2ludCwgJ1xcbicgKyBkZWZpbml0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRoZSBhZGphY2VudCBzdGF0ZW1lbnRzIGFmdGVyIGFsbCBzdGF0aWMgcHJvcGVydGllcyBvZiB0aGUgY2xhc3MuXG4gICAqL1xuICBhZGRBZGphY2VudFN0YXRlbWVudHMob3V0cHV0OiBNYWdpY1N0cmluZywgY29tcGlsZWRDbGFzczogQ29tcGlsZWRDbGFzcywgc3RhdGVtZW50czogc3RyaW5nKTpcbiAgICAgIHZvaWQge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5ob3N0LmdldENsYXNzU3ltYm9sKGNvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24pO1xuICAgIGlmICghY2xhc3NTeW1ib2wpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ29tcGlsZWQgY2xhc3MgZG9lcyBub3QgaGF2ZSBhIHZhbGlkIHN5bWJvbDogJHtjb21waWxlZENsYXNzLm5hbWV9YCk7XG4gICAgfVxuICAgIGNvbnN0IGVuZE9mQ2xhc3MgPSB0aGlzLmhvc3QuZ2V0RW5kT2ZDbGFzcyhjbGFzc1N5bWJvbCk7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoZW5kT2ZDbGFzcy5nZXRFbmQoKSwgJ1xcbicgKyBzdGF0ZW1lbnRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgc3RhdGljIGRlY29yYXRvciBwcm9wZXJ0aWVzIGZyb20gY2xhc3Nlcy5cbiAgICovXG4gIHJlbW92ZURlY29yYXRvcnMob3V0cHV0OiBNYWdpY1N0cmluZywgZGVjb3JhdG9yc1RvUmVtb3ZlOiBSZWR1bmRhbnREZWNvcmF0b3JNYXApOiB2b2lkIHtcbiAgICBkZWNvcmF0b3JzVG9SZW1vdmUuZm9yRWFjaCgobm9kZXNUb1JlbW92ZSwgY29udGFpbmVyTm9kZSkgPT4ge1xuICAgICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihjb250YWluZXJOb2RlKSkge1xuICAgICAgICBjb25zdCBpdGVtcyA9IGNvbnRhaW5lck5vZGUuZWxlbWVudHM7XG4gICAgICAgIGlmIChpdGVtcy5sZW5ndGggPT09IG5vZGVzVG9SZW1vdmUubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZSBlbnRpcmUgc3RhdGVtZW50XG4gICAgICAgICAgY29uc3Qgc3RhdGVtZW50ID0gZmluZFN0YXRlbWVudChjb250YWluZXJOb2RlKTtcbiAgICAgICAgICBpZiAoc3RhdGVtZW50KSB7XG4gICAgICAgICAgICBpZiAodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgICAgICAgICAgLy8gVGhlIHN0YXRlbWVudCBsb29rcyBsaWtlOiBgU29tZUNsYXNzID0gX19kZWNvcmF0ZSguLi4pO2BcbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIGl0IGNvbXBsZXRlbHlcbiAgICAgICAgICAgICAgb3V0cHV0LnJlbW92ZShzdGF0ZW1lbnQuZ2V0RnVsbFN0YXJ0KCksIHN0YXRlbWVudC5nZXRFbmQoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgICAgIHRzLmlzUmV0dXJuU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgc3RhdGVtZW50LmV4cHJlc3Npb24gJiZcbiAgICAgICAgICAgICAgICBpc0Fzc2lnbm1lbnQoc3RhdGVtZW50LmV4cHJlc3Npb24pKSB7XG4gICAgICAgICAgICAgIC8vIFRoZSBzdGF0ZW1lbnQgbG9va3MgbGlrZTogYHJldHVybiBTb21lQ2xhc3MgPSBfX2RlY29yYXRlKC4uLik7YFxuICAgICAgICAgICAgICAvLyBXZSBvbmx5IHdhbnQgdG8gZW5kIHVwIHdpdGg6IGByZXR1cm4gU29tZUNsYXNzO2BcbiAgICAgICAgICAgICAgY29uc3Qgc3RhcnRPZlJlbW92YWwgPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0LmdldEVuZCgpO1xuICAgICAgICAgICAgICBjb25zdCBlbmRPZlJlbW92YWwgPSBnZXRFbmRFeGNlcHRTZW1pY29sb24oc3RhdGVtZW50KTtcbiAgICAgICAgICAgICAgb3V0cHV0LnJlbW92ZShzdGFydE9mUmVtb3ZhbCwgZW5kT2ZSZW1vdmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbm9kZXNUb1JlbW92ZS5mb3JFYWNoKG5vZGUgPT4ge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIGFueSB0cmFpbGluZyBjb21tYVxuICAgICAgICAgICAgY29uc3QgbmV4dFNpYmxpbmcgPSBnZXROZXh0U2libGluZ0luQXJyYXkobm9kZSwgaXRlbXMpO1xuICAgICAgICAgICAgbGV0IGVuZDogbnVtYmVyO1xuXG4gICAgICAgICAgICBpZiAobmV4dFNpYmxpbmcgIT09IG51bGwgJiZcbiAgICAgICAgICAgICAgICBvdXRwdXQuc2xpY2UobmV4dFNpYmxpbmcuZ2V0RnVsbFN0YXJ0KCkgLSAxLCBuZXh0U2libGluZy5nZXRGdWxsU3RhcnQoKSkgPT09ICcsJykge1xuICAgICAgICAgICAgICBlbmQgPSBuZXh0U2libGluZy5nZXRGdWxsU3RhcnQoKSAtIDEgKyBuZXh0U2libGluZy5nZXRMZWFkaW5nVHJpdmlhV2lkdGgoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3V0cHV0LnNsaWNlKG5vZGUuZ2V0RW5kKCksIG5vZGUuZ2V0RW5kKCkgKyAxKSA9PT0gJywnKSB7XG4gICAgICAgICAgICAgIGVuZCA9IG5vZGUuZ2V0RW5kKCkgKyAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZW5kID0gbm9kZS5nZXRFbmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dHB1dC5yZW1vdmUobm9kZS5nZXRGdWxsU3RhcnQoKSwgZW5kKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJld3JpdGUgdGhlIElWWSBzd2l0Y2ggbWFya2VycyB0byBpbmRpY2F0ZSB3ZSBhcmUgaW4gSVZZIG1vZGUuXG4gICAqL1xuICByZXdyaXRlU3dpdGNoYWJsZURlY2xhcmF0aW9ucyhcbiAgICAgIG91dHB1dFRleHQ6IE1hZ2ljU3RyaW5nLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgZGVjbGFyYXRpb25zOiBTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbltdKTogdm9pZCB7XG4gICAgZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbGFyYXRpb24gPT4ge1xuICAgICAgY29uc3Qgc3RhcnQgPSBkZWNsYXJhdGlvbi5pbml0aWFsaXplci5nZXRTdGFydCgpO1xuICAgICAgY29uc3QgZW5kID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIuZ2V0RW5kKCk7XG4gICAgICBjb25zdCByZXBsYWNlbWVudCA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyLnRleHQucmVwbGFjZShQUkVfUjNfTUFSS0VSLCBQT1NUX1IzX01BUktFUik7XG4gICAgICBvdXRwdXRUZXh0Lm92ZXJ3cml0ZShzdGFydCwgZW5kLCByZXBsYWNlbWVudCk7XG4gICAgfSk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIHR5cGUgcGFyYW1ldGVycyB0byB0aGUgYXBwcm9wcmlhdGUgZnVuY3Rpb25zIHRoYXQgcmV0dXJuIGBNb2R1bGVXaXRoUHJvdmlkZXJzYFxuICAgKiBzdHJ1Y3R1cmVzLlxuICAgKlxuICAgKiBUaGlzIGZ1bmN0aW9uIHdpbGwgb25seSBnZXQgY2FsbGVkIG9uIHR5cGluZ3MgZmlsZXMuXG4gICAqL1xuICBhZGRNb2R1bGVXaXRoUHJvdmlkZXJzUGFyYW1zKFxuICAgICAgb3V0cHV0VGV4dDogTWFnaWNTdHJpbmcsIG1vZHVsZVdpdGhQcm92aWRlcnM6IE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvW10sXG4gICAgICBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyKTogdm9pZCB7XG4gICAgbW9kdWxlV2l0aFByb3ZpZGVycy5mb3JFYWNoKGluZm8gPT4ge1xuICAgICAgY29uc3QgbmdNb2R1bGVOYW1lID0gaW5mby5uZ01vZHVsZS5ub2RlLm5hbWUudGV4dDtcbiAgICAgIGNvbnN0IGRlY2xhcmF0aW9uRmlsZSA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoaW5mby5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkpO1xuICAgICAgY29uc3QgbmdNb2R1bGVGaWxlID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShpbmZvLm5nTW9kdWxlLm5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHRoaXMuZnMucmVsYXRpdmUodGhpcy5mcy5kaXJuYW1lKGRlY2xhcmF0aW9uRmlsZSksIG5nTW9kdWxlRmlsZSk7XG4gICAgICBjb25zdCByZWxhdGl2ZUltcG9ydCA9IHRvUmVsYXRpdmVJbXBvcnQocmVsYXRpdmVQYXRoKTtcbiAgICAgIGNvbnN0IGltcG9ydFBhdGggPSBpbmZvLm5nTW9kdWxlLm93bmVkQnlNb2R1bGVHdWVzcyB8fFxuICAgICAgICAgIChkZWNsYXJhdGlvbkZpbGUgIT09IG5nTW9kdWxlRmlsZSA/IHN0cmlwRXh0ZW5zaW9uKHJlbGF0aXZlSW1wb3J0KSA6IG51bGwpO1xuICAgICAgY29uc3QgbmdNb2R1bGUgPSBnZW5lcmF0ZUltcG9ydFN0cmluZyhpbXBvcnRNYW5hZ2VyLCBpbXBvcnRQYXRoLCBuZ01vZHVsZU5hbWUpO1xuXG4gICAgICBpZiAoaW5mby5kZWNsYXJhdGlvbi50eXBlKSB7XG4gICAgICAgIGNvbnN0IHR5cGVOYW1lID0gaW5mby5kZWNsYXJhdGlvbi50eXBlICYmIHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoaW5mby5kZWNsYXJhdGlvbi50eXBlKSA/XG4gICAgICAgICAgICBpbmZvLmRlY2xhcmF0aW9uLnR5cGUudHlwZU5hbWUgOlxuICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgaWYgKHRoaXMuaXNDb3JlTW9kdWxlV2l0aFByb3ZpZGVyc1R5cGUodHlwZU5hbWUpKSB7XG4gICAgICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIGFscmVhZHkgcmV0dXJucyBgTW9kdWxlV2l0aFByb3ZpZGVyYCBidXQgaXQgbmVlZHMgdGhlIGBOZ01vZHVsZWAgdHlwZVxuICAgICAgICAgIC8vIHBhcmFtZXRlciBhZGRpbmcuXG4gICAgICAgICAgb3V0cHV0VGV4dC5vdmVyd3JpdGUoXG4gICAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRTdGFydCgpLCBpbmZvLmRlY2xhcmF0aW9uLnR5cGUuZ2V0RW5kKCksXG4gICAgICAgICAgICAgIGBNb2R1bGVXaXRoUHJvdmlkZXJzPCR7bmdNb2R1bGV9PmApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiByZXR1cm5zIGFuIHVua25vd24gdHlwZSBzbyB3ZSBuZWVkIHRvIGNvbnZlcnQgaXQgdG8gYSB1bmlvbiB0aGF0XG4gICAgICAgICAgLy8gaW5jbHVkZXMgdGhlIG5nTW9kdWxlIHByb3BlcnR5LlxuICAgICAgICAgIGNvbnN0IG9yaWdpbmFsVHlwZVN0cmluZyA9IGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRUZXh0KCk7XG4gICAgICAgICAgb3V0cHV0VGV4dC5vdmVyd3JpdGUoXG4gICAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRTdGFydCgpLCBpbmZvLmRlY2xhcmF0aW9uLnR5cGUuZ2V0RW5kKCksXG4gICAgICAgICAgICAgIGAoJHtvcmlnaW5hbFR5cGVTdHJpbmd9KSZ7bmdNb2R1bGU6JHtuZ01vZHVsZX19YCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBoYXMgbm8gcmV0dXJuIHR5cGUgc28gcHJvdmlkZSBvbmUuXG4gICAgICAgIGNvbnN0IGxhc3RUb2tlbiA9IGluZm8uZGVjbGFyYXRpb24uZ2V0TGFzdFRva2VuKCk7XG4gICAgICAgIGNvbnN0IGluc2VydFBvaW50ID0gbGFzdFRva2VuICYmIGxhc3RUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLlNlbWljb2xvblRva2VuID9cbiAgICAgICAgICAgIGxhc3RUb2tlbi5nZXRTdGFydCgpIDpcbiAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24uZ2V0RW5kKCk7XG4gICAgICAgIG91dHB1dFRleHQuYXBwZW5kTGVmdChcbiAgICAgICAgICAgIGluc2VydFBvaW50LFxuICAgICAgICAgICAgYDogJHtnZW5lcmF0ZUltcG9ydFN0cmluZyhpbXBvcnRNYW5hZ2VyLCAnQGFuZ3VsYXIvY29yZScsICdNb2R1bGVXaXRoUHJvdmlkZXJzJyl9PCR7XG4gICAgICAgICAgICAgICAgbmdNb2R1bGV9PmApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYSBgU3RhdGVtZW50YCB0byBKYXZhU2NyaXB0IGNvZGUgaW4gYSBmb3JtYXQgc3VpdGFibGUgZm9yIHJlbmRlcmluZyBieSB0aGlzIGZvcm1hdHRlci5cbiAgICpcbiAgICogQHBhcmFtIHN0bXQgVGhlIGBTdGF0ZW1lbnRgIHRvIHByaW50LlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBBIGB0cy5Tb3VyY2VGaWxlYCB0aGF0IHByb3ZpZGVzIGNvbnRleHQgZm9yIHRoZSBzdGF0ZW1lbnQuIFNlZVxuICAgKiAgICAgYHRzLlByaW50ZXIjcHJpbnROb2RlKClgIGZvciBtb3JlIGluZm8uXG4gICAqIEBwYXJhbSBpbXBvcnRNYW5hZ2VyIFRoZSBgSW1wb3J0TWFuYWdlcmAgdG8gdXNlIGZvciBtYW5hZ2luZyBpbXBvcnRzLlxuICAgKlxuICAgKiBAcmV0dXJuIFRoZSBKYXZhU2NyaXB0IGNvZGUgY29ycmVzcG9uZGluZyB0byBgc3RtdGAgKGluIHRoZSBhcHByb3ByaWF0ZSBmb3JtYXQpLlxuICAgKi9cbiAgcHJpbnRTdGF0ZW1lbnQoc3RtdDogU3RhdGVtZW50LCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgICBjb25zdCBub2RlID0gdHJhbnNsYXRlU3RhdGVtZW50KHN0bXQsIGltcG9ydE1hbmFnZXIpO1xuICAgIGNvbnN0IGNvZGUgPSB0aGlzLnByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBub2RlLCBzb3VyY2VGaWxlKTtcblxuICAgIHJldHVybiBjb2RlO1xuICB9XG5cbiAgcHJvdGVjdGVkIGZpbmRFbmRPZkltcG9ydHMoc2Y6IHRzLlNvdXJjZUZpbGUpOiBudW1iZXIge1xuICAgIGZvciAoY29uc3Qgc3RtdCBvZiBzZi5zdGF0ZW1lbnRzKSB7XG4gICAgICBpZiAoIXRzLmlzSW1wb3J0RGVjbGFyYXRpb24oc3RtdCkgJiYgIXRzLmlzSW1wb3J0RXF1YWxzRGVjbGFyYXRpb24oc3RtdCkgJiZcbiAgICAgICAgICAhdHMuaXNOYW1lc3BhY2VJbXBvcnQoc3RtdCkpIHtcbiAgICAgICAgcmV0dXJuIHN0bXQuZ2V0U3RhcnQoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciB0aGUgZ2l2ZW4gdHlwZSBpcyB0aGUgY29yZSBBbmd1bGFyIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBpbnRlcmZhY2UuXG4gICAqIEBwYXJhbSB0eXBlTmFtZSBUaGUgdHlwZSB0byBjaGVjay5cbiAgICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgdHlwZSBpcyB0aGUgY29yZSBBbmd1bGFyIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBpbnRlcmZhY2UuXG4gICAqL1xuICBwcml2YXRlIGlzQ29yZU1vZHVsZVdpdGhQcm92aWRlcnNUeXBlKHR5cGVOYW1lOiB0cy5FbnRpdHlOYW1lfG51bGwpIHtcbiAgICBjb25zdCBpZCA9XG4gICAgICAgIHR5cGVOYW1lICYmIHRzLmlzSWRlbnRpZmllcih0eXBlTmFtZSkgPyB0aGlzLmhvc3QuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKHR5cGVOYW1lKSA6IG51bGw7XG4gICAgcmV0dXJuIChcbiAgICAgICAgaWQgJiYgaWQubmFtZSA9PT0gJ01vZHVsZVdpdGhQcm92aWRlcnMnICYmICh0aGlzLmlzQ29yZSB8fCBpZC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZScpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU3RhdGVtZW50KG5vZGU6IHRzLk5vZGUpOiB0cy5TdGF0ZW1lbnR8dW5kZWZpbmVkIHtcbiAgd2hpbGUgKG5vZGUpIHtcbiAgICBpZiAodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KG5vZGUpIHx8IHRzLmlzUmV0dXJuU3RhdGVtZW50KG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlSW1wb3J0U3RyaW5nKFxuICAgIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIsIGltcG9ydFBhdGg6IHN0cmluZ3xudWxsLCBpbXBvcnROYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgaW1wb3J0QXMgPSBpbXBvcnRQYXRoID8gaW1wb3J0TWFuYWdlci5nZW5lcmF0ZU5hbWVkSW1wb3J0KGltcG9ydFBhdGgsIGltcG9ydE5hbWUpIDogbnVsbDtcbiAgcmV0dXJuIGltcG9ydEFzICYmIGltcG9ydEFzLm1vZHVsZUltcG9ydCA/IGAke2ltcG9ydEFzLm1vZHVsZUltcG9ydC50ZXh0fS4ke2ltcG9ydEFzLnN5bWJvbH1gIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGAke2ltcG9ydE5hbWV9YDtcbn1cblxuZnVuY3Rpb24gZ2V0TmV4dFNpYmxpbmdJbkFycmF5PFQgZXh0ZW5kcyB0cy5Ob2RlPihub2RlOiBULCBhcnJheTogdHMuTm9kZUFycmF5PFQ+KTogVHxudWxsIHtcbiAgY29uc3QgaW5kZXggPSBhcnJheS5pbmRleE9mKG5vZGUpO1xuICByZXR1cm4gaW5kZXggIT09IC0xICYmIGFycmF5Lmxlbmd0aCA+IGluZGV4ICsgMSA/IGFycmF5W2luZGV4ICsgMV0gOiBudWxsO1xufVxuXG5mdW5jdGlvbiBnZXRFbmRFeGNlcHRTZW1pY29sb24oc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBudW1iZXIge1xuICBjb25zdCBsYXN0VG9rZW4gPSBzdGF0ZW1lbnQuZ2V0TGFzdFRva2VuKCk7XG4gIHJldHVybiAobGFzdFRva2VuICYmIGxhc3RUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLlNlbWljb2xvblRva2VuKSA/IHN0YXRlbWVudC5nZXRFbmQoKSAtIDEgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnQuZ2V0RW5kKCk7XG59XG4iXX0=