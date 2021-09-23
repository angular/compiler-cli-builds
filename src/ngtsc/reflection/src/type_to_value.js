/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/reflection/src/type_to_value", ["require", "exports", "tslib", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.typeNodeToValueExpr = exports.typeToValue = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    /**
     * Potentially convert a `ts.TypeNode` to a `TypeValueReference`, which indicates how to use the
     * type given in the `ts.TypeNode` in a value position.
     *
     * This can return `null` if the `typeNode` is `null`, if it does not refer to a symbol with a value
     * declaration, or if it is not possible to statically understand.
     */
    function typeToValue(typeNode, checker) {
        // It's not possible to get a value expression if the parameter doesn't even have a type.
        if (typeNode === null) {
            return missingType();
        }
        if (!ts.isTypeReferenceNode(typeNode)) {
            return unsupportedType(typeNode);
        }
        var symbols = resolveTypeSymbols(typeNode, checker);
        if (symbols === null) {
            return unknownReference(typeNode);
        }
        var local = symbols.local, decl = symbols.decl;
        // It's only valid to convert a type reference to a value reference if the type actually
        // has a value declaration associated with it. Note that const enums are an exception,
        // because while they do have a value declaration, they don't exist at runtime.
        if (decl.valueDeclaration === undefined || decl.flags & ts.SymbolFlags.ConstEnum) {
            var typeOnlyDecl = null;
            if (decl.declarations !== undefined && decl.declarations.length > 0) {
                typeOnlyDecl = decl.declarations[0];
            }
            return noValueDeclaration(typeNode, typeOnlyDecl);
        }
        // The type points to a valid value declaration. Rewrite the TypeReference into an
        // Expression which references the value pointed to by the TypeReference, if possible.
        // Look at the local `ts.Symbol`'s declarations and see if it comes from an import
        // statement. If so, extract the module specifier and the name of the imported type.
        var firstDecl = local.declarations && local.declarations[0];
        if (firstDecl !== undefined) {
            if (ts.isImportClause(firstDecl) && firstDecl.name !== undefined) {
                // This is a default import.
                //   import Foo from 'foo';
                if (firstDecl.isTypeOnly) {
                    // Type-only imports cannot be represented as value.
                    return typeOnlyImport(typeNode, firstDecl);
                }
                return {
                    kind: 0 /* LOCAL */,
                    expression: firstDecl.name,
                    defaultImportStatement: firstDecl.parent,
                };
            }
            else if (ts.isImportSpecifier(firstDecl)) {
                // The symbol was imported by name
                //   import {Foo} from 'foo';
                // or
                //   import {Foo as Bar} from 'foo';
                if (firstDecl.parent.parent.isTypeOnly) {
                    // Type-only imports cannot be represented as value.
                    return typeOnlyImport(typeNode, firstDecl.parent.parent);
                }
                // Determine the name to import (`Foo`) from the import specifier, as the symbol names of
                // the imported type could refer to a local alias (like `Bar` in the example above).
                var importedName = (firstDecl.propertyName || firstDecl.name).text;
                // The first symbol name refers to the local name, which is replaced by `importedName` above.
                // Any remaining symbol names make up the complete path to the value.
                var _a = (0, tslib_1.__read)(symbols.symbolNames), _localName = _a[0], nestedPath = _a.slice(1);
                var moduleName = extractModuleName(firstDecl.parent.parent.parent);
                return {
                    kind: 1 /* IMPORTED */,
                    valueDeclaration: decl.valueDeclaration,
                    moduleName: moduleName,
                    importedName: importedName,
                    nestedPath: nestedPath
                };
            }
            else if (ts.isNamespaceImport(firstDecl)) {
                // The import is a namespace import
                //   import * as Foo from 'foo';
                if (firstDecl.parent.isTypeOnly) {
                    // Type-only imports cannot be represented as value.
                    return typeOnlyImport(typeNode, firstDecl.parent);
                }
                if (symbols.symbolNames.length === 1) {
                    // The type refers to the namespace itself, which cannot be represented as a value.
                    return namespaceImport(typeNode, firstDecl.parent);
                }
                // The first symbol name refers to the local name of the namespace, which is is discarded
                // as a new namespace import will be generated. This is followed by the symbol name that needs
                // to be imported and any remaining names that constitute the complete path to the value.
                var _b = (0, tslib_1.__read)(symbols.symbolNames), _ns = _b[0], importedName = _b[1], nestedPath = _b.slice(2);
                var moduleName = extractModuleName(firstDecl.parent.parent);
                return {
                    kind: 1 /* IMPORTED */,
                    valueDeclaration: decl.valueDeclaration,
                    moduleName: moduleName,
                    importedName: importedName,
                    nestedPath: nestedPath
                };
            }
        }
        // If the type is not imported, the type reference can be converted into an expression as is.
        var expression = typeNodeToValueExpr(typeNode);
        if (expression !== null) {
            return {
                kind: 0 /* LOCAL */,
                expression: expression,
                defaultImportStatement: null,
            };
        }
        else {
            return unsupportedType(typeNode);
        }
    }
    exports.typeToValue = typeToValue;
    function unsupportedType(typeNode) {
        return {
            kind: 2 /* UNAVAILABLE */,
            reason: { kind: 5 /* UNSUPPORTED */, typeNode: typeNode },
        };
    }
    function noValueDeclaration(typeNode, decl) {
        return {
            kind: 2 /* UNAVAILABLE */,
            reason: { kind: 1 /* NO_VALUE_DECLARATION */, typeNode: typeNode, decl: decl },
        };
    }
    function typeOnlyImport(typeNode, importClause) {
        return {
            kind: 2 /* UNAVAILABLE */,
            reason: { kind: 2 /* TYPE_ONLY_IMPORT */, typeNode: typeNode, importClause: importClause },
        };
    }
    function unknownReference(typeNode) {
        return {
            kind: 2 /* UNAVAILABLE */,
            reason: { kind: 3 /* UNKNOWN_REFERENCE */, typeNode: typeNode },
        };
    }
    function namespaceImport(typeNode, importClause) {
        return {
            kind: 2 /* UNAVAILABLE */,
            reason: { kind: 4 /* NAMESPACE */, typeNode: typeNode, importClause: importClause },
        };
    }
    function missingType() {
        return {
            kind: 2 /* UNAVAILABLE */,
            reason: { kind: 0 /* MISSING_TYPE */ },
        };
    }
    /**
     * Attempt to extract a `ts.Expression` that's equivalent to a `ts.TypeNode`, as the two have
     * different AST shapes but can reference the same symbols.
     *
     * This will return `null` if an equivalent expression cannot be constructed.
     */
    function typeNodeToValueExpr(node) {
        if (ts.isTypeReferenceNode(node)) {
            return entityNameToValue(node.typeName);
        }
        else {
            return null;
        }
    }
    exports.typeNodeToValueExpr = typeNodeToValueExpr;
    /**
     * Resolve a `TypeReference` node to the `ts.Symbol`s for both its declaration and its local source.
     *
     * In the event that the `TypeReference` refers to a locally declared symbol, these will be the
     * same. If the `TypeReference` refers to an imported symbol, then `decl` will be the fully resolved
     * `ts.Symbol` of the referenced symbol. `local` will be the `ts.Symbol` of the `ts.Identifier`
     * which points to the import statement by which the symbol was imported.
     *
     * All symbol names that make up the type reference are returned left-to-right into the
     * `symbolNames` array, which is guaranteed to include at least one entry.
     */
    function resolveTypeSymbols(typeRef, checker) {
        var typeName = typeRef.typeName;
        // typeRefSymbol is the ts.Symbol of the entire type reference.
        var typeRefSymbol = checker.getSymbolAtLocation(typeName);
        if (typeRefSymbol === undefined) {
            return null;
        }
        // `local` is the `ts.Symbol` for the local `ts.Identifier` for the type.
        // If the type is actually locally declared or is imported by name, for example:
        //   import {Foo} from './foo';
        // then it'll be the same as `typeRefSymbol`.
        //
        // If the type is imported via a namespace import, for example:
        //   import * as foo from './foo';
        // and then referenced as:
        //   constructor(f: foo.Foo)
        // then `local` will be the `ts.Symbol` of `foo`, whereas `typeRefSymbol` will be the `ts.Symbol`
        // of `foo.Foo`. This allows tracking of the import behind whatever type reference exists.
        var local = typeRefSymbol;
        // Destructure a name like `foo.X.Y.Z` as follows:
        // - in `leftMost`, the `ts.Identifier` of the left-most name (`foo`) in the qualified name.
        //   This identifier is used to resolve the `ts.Symbol` for `local`.
        // - in `symbolNames`, all names involved in the qualified path, or a single symbol name if the
        //   type is not qualified.
        var leftMost = typeName;
        var symbolNames = [];
        while (ts.isQualifiedName(leftMost)) {
            symbolNames.unshift(leftMost.right.text);
            leftMost = leftMost.left;
        }
        symbolNames.unshift(leftMost.text);
        if (leftMost !== typeName) {
            var localTmp = checker.getSymbolAtLocation(leftMost);
            if (localTmp !== undefined) {
                local = localTmp;
            }
        }
        // De-alias the top-level type reference symbol to get the symbol of the actual declaration.
        var decl = typeRefSymbol;
        if (typeRefSymbol.flags & ts.SymbolFlags.Alias) {
            decl = checker.getAliasedSymbol(typeRefSymbol);
        }
        return { local: local, decl: decl, symbolNames: symbolNames };
    }
    function entityNameToValue(node) {
        if (ts.isQualifiedName(node)) {
            var left = entityNameToValue(node.left);
            return left !== null ? ts.createPropertyAccess(left, node.right) : null;
        }
        else if (ts.isIdentifier(node)) {
            return ts.getMutableClone(node);
        }
        else {
            return null;
        }
    }
    function extractModuleName(node) {
        if (!ts.isStringLiteral(node.moduleSpecifier)) {
            throw new Error('not a module specifier');
        }
        return node.moduleSpecifier.text;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV90b192YWx1ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbi9zcmMvdHlwZV90b192YWx1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBSWpDOzs7Ozs7T0FNRztJQUNILFNBQWdCLFdBQVcsQ0FDdkIsUUFBMEIsRUFBRSxPQUF1QjtRQUNyRCx5RkFBeUY7UUFDekYsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO1lBQ3JCLE9BQU8sV0FBVyxFQUFFLENBQUM7U0FDdEI7UUFFRCxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3JDLE9BQU8sZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ2xDO1FBRUQsSUFBTSxPQUFPLEdBQUcsa0JBQWtCLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtZQUNwQixPQUFPLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ25DO1FBRU0sSUFBQSxLQUFLLEdBQVUsT0FBTyxNQUFqQixFQUFFLElBQUksR0FBSSxPQUFPLEtBQVgsQ0FBWTtRQUM5Qix3RkFBd0Y7UUFDeEYsc0ZBQXNGO1FBQ3RGLCtFQUErRTtRQUMvRSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRTtZQUNoRixJQUFJLFlBQVksR0FBd0IsSUFBSSxDQUFDO1lBQzdDLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUNuRSxZQUFZLEdB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QUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztTQUN6RTthQUFNLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNoQyxPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakM7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxJQUEwQjtRQUNuRCxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1NBQzNDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztJQUNuQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1R5cGVWYWx1ZVJlZmVyZW5jZSwgVHlwZVZhbHVlUmVmZXJlbmNlS2luZCwgVW5hdmFpbGFibGVUeXBlVmFsdWVSZWZlcmVuY2UsIFZhbHVlVW5hdmFpbGFibGVLaW5kfSBmcm9tICcuL2hvc3QnO1xuXG4vKipcbiAqIFBvdGVudGlhbGx5IGNvbnZlcnQgYSBgdHMuVHlwZU5vZGVgIHRvIGEgYFR5cGVWYWx1ZVJlZmVyZW5jZWAsIHdoaWNoIGluZGljYXRlcyBob3cgdG8gdXNlIHRoZVxuICogdHlwZSBnaXZlbiBpbiB0aGUgYHRzLlR5cGVOb2RlYCBpbiBhIHZhbHVlIHBvc2l0aW9uLlxuICpcbiAqIFRoaXMgY2FuIHJldHVybiBgbnVsbGAgaWYgdGhlIGB0eXBlTm9kZWAgaXMgYG51bGxgLCBpZiBpdCBkb2VzIG5vdCByZWZlciB0byBhIHN5bWJvbCB3aXRoIGEgdmFsdWVcbiAqIGRlY2xhcmF0aW9uLCBvciBpZiBpdCBpcyBub3QgcG9zc2libGUgdG8gc3RhdGljYWxseSB1bmRlcnN0YW5kLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZVRvVmFsdWUoXG4gICAgdHlwZU5vZGU6IHRzLlR5cGVOb2RlfG51bGwsIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKTogVHlwZVZhbHVlUmVmZXJlbmNlIHtcbiAgLy8gSXQncyBub3QgcG9zc2libGUgdG8gZ2V0IGEgdmFsdWUgZXhwcmVzc2lvbiBpZiB0aGUgcGFyYW1ldGVyIGRvZXNuJ3QgZXZlbiBoYXZlIGEgdHlwZS5cbiAgaWYgKHR5cGVOb2RlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG1pc3NpbmdUeXBlKCk7XG4gIH1cblxuICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUodHlwZU5vZGUpKSB7XG4gICAgcmV0dXJuIHVuc3VwcG9ydGVkVHlwZSh0eXBlTm9kZSk7XG4gIH1cblxuICBjb25zdCBzeW1ib2xzID0gcmVzb2x2ZVR5cGVTeW1ib2xzKHR5cGVOb2RlLCBjaGVja2VyKTtcbiAgaWYgKHN5bWJvbHMgPT09IG51bGwpIHtcbiAgICByZXR1cm4gdW5rbm93blJlZmVyZW5jZSh0eXBlTm9kZSk7XG4gIH1cblxuICBjb25zdCB7bG9jYWwsIGRlY2x9ID0gc3ltYm9scztcbiAgLy8gSXQncyBvbmx5IHZhbGlkIHRvIGNvbnZlcnQgYSB0eXBlIHJlZmVyZW5jZSB0byBhIHZhbHVlIHJlZmVyZW5jZSBpZiB0aGUgdHlwZSBhY3R1YWxseVxuICAvLyBoYXMgYSB2YWx1ZSBkZWNsYXJhdGlvbiBhc3NvY2lhdGVkIHdpdGggaXQuIE5vdGUgdGhhdCBjb25zdCBlbnVtcyBhcmUgYW4gZXhjZXB0aW9uLFxuICAvLyBiZWNhdXNlIHdoaWxlIHRoZXkgZG8gaGF2ZSBhIHZhbHVlIGRlY2xhcmF0aW9uLCB0aGV5IGRvbid0IGV4aXN0IGF0IHJ1bnRpbWUuXG4gIGlmIChkZWNsLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fCBkZWNsLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQ29uc3RFbnVtKSB7XG4gICAgbGV0IHR5cGVPbmx5RGVjbDogdHMuRGVjbGFyYXRpb258bnVsbCA9IG51bGw7XG4gICAgaWYgKGRlY2wuZGVjbGFyYXRpb25zICE9PSB1bmRlZmluZWQgJiYgZGVjbC5kZWNsYXJhdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgdHlwZU9ubHlEZWNsID0gZGVjbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgfVxuICAgIHJldHVybiBub1ZhbHVlRGVjbGFyYXRpb24odHlwZU5vZGUsIHR5cGVPbmx5RGVjbCk7XG4gIH1cblxuICAvLyBUaGUgdHlwZSBwb2ludHMgdG8gYSB2YWxpZCB2YWx1ZSBkZWNsYXJhdGlvbi4gUmV3cml0ZSB0aGUgVHlwZVJlZmVyZW5jZSBpbnRvIGFuXG4gIC8vIEV4cHJlc3Npb24gd2hpY2ggcmVmZXJlbmNlcyB0aGUgdmFsdWUgcG9pbnRlZCB0byBieSB0aGUgVHlwZVJlZmVyZW5jZSwgaWYgcG9zc2libGUuXG5cbiAgLy8gTG9vayBhdCB0aGUgbG9jYWwgYHRzLlN5bWJvbGAncyBkZWNsYXJhdGlvbnMgYW5kIHNlZSBpZiBpdCBjb21lcyBmcm9tIGFuIGltcG9ydFxuICAvLyBzdGF0ZW1lbnQuIElmIHNvLCBleHRyYWN0IHRoZSBtb2R1bGUgc3BlY2lmaWVyIGFuZCB0aGUgbmFtZSBvZiB0aGUgaW1wb3J0ZWQgdHlwZS5cbiAgY29uc3QgZmlyc3REZWNsID0gbG9jYWwuZGVjbGFyYXRpb25zICYmIGxvY2FsLmRlY2xhcmF0aW9uc1swXTtcbiAgaWYgKGZpcnN0RGVjbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHRzLmlzSW1wb3J0Q2xhdXNlKGZpcnN0RGVjbCkgJiYgZmlyc3REZWNsLm5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gVGhpcyBpcyBhIGRlZmF1bHQgaW1wb3J0LlxuICAgICAgLy8gICBpbXBvcnQgRm9vIGZyb20gJ2Zvbyc7XG5cbiAgICAgIGlmIChmaXJzdERlY2wuaXNUeXBlT25seSkge1xuICAgICAgICAvLyBUeXBlLW9ubHkgaW1wb3J0cyBjYW5ub3QgYmUgcmVwcmVzZW50ZWQgYXMgdmFsdWUuXG4gICAgICAgIHJldHVybiB0eXBlT25seUltcG9ydCh0eXBlTm9kZSwgZmlyc3REZWNsKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogVHlwZVZhbHVlUmVmZXJlbmNlS2luZC5MT0NBTCxcbiAgICAgICAgZXhwcmVzc2lvbjogZmlyc3REZWNsLm5hbWUsXG4gICAgICAgIGRlZmF1bHRJbXBvcnRTdGF0ZW1lbnQ6IGZpcnN0RGVjbC5wYXJlbnQsXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAodHMuaXNJbXBvcnRTcGVjaWZpZXIoZmlyc3REZWNsKSkge1xuICAgICAgLy8gVGhlIHN5bWJvbCB3YXMgaW1wb3J0ZWQgYnkgbmFtZVxuICAgICAgLy8gICBpbXBvcnQge0Zvb30gZnJvbSAnZm9vJztcbiAgICAgIC8vIG9yXG4gICAgICAvLyAgIGltcG9ydCB7Rm9vIGFzIEJhcn0gZnJvbSAnZm9vJztcblxuICAgICAgaWYgKGZpcnN0RGVjbC5wYXJlbnQucGFyZW50LmlzVHlwZU9ubHkpIHtcbiAgICAgICAgLy8gVHlwZS1vbmx5IGltcG9ydHMgY2Fubm90IGJlIHJlcHJlc2VudGVkIGFzIHZhbHVlLlxuICAgICAgICByZXR1cm4gdHlwZU9ubHlJbXBvcnQodHlwZU5vZGUsIGZpcnN0RGVjbC5wYXJlbnQucGFyZW50KTtcbiAgICAgIH1cblxuICAgICAgLy8gRGV0ZXJtaW5lIHRoZSBuYW1lIHRvIGltcG9ydCAoYEZvb2ApIGZyb20gdGhlIGltcG9ydCBzcGVjaWZpZXIsIGFzIHRoZSBzeW1ib2wgbmFtZXMgb2ZcbiAgICAgIC8vIHRoZSBpbXBvcnRlZCB0eXBlIGNvdWxkIHJlZmVyIHRvIGEgbG9jYWwgYWxpYXMgKGxpa2UgYEJhcmAgaW4gdGhlIGV4YW1wbGUgYWJvdmUpLlxuICAgICAgY29uc3QgaW1wb3J0ZWROYW1lID0gKGZpcnN0RGVjbC5wcm9wZXJ0eU5hbWUgfHwgZmlyc3REZWNsLm5hbWUpLnRleHQ7XG5cbiAgICAgIC8vIFRoZSBmaXJzdCBzeW1ib2wgbmFtZSByZWZlcnMgdG8gdGhlIGxvY2FsIG5hbWUsIHdoaWNoIGlzIHJlcGxhY2VkIGJ5IGBpbXBvcnRlZE5hbWVgIGFib3ZlLlxuICAgICAgLy8gQW55IHJlbWFpbmluZyBzeW1ib2wgbmFtZXMgbWFrZSB1cCB0aGUgY29tcGxldGUgcGF0aCB0byB0aGUgdmFsdWUuXG4gICAgICBjb25zdCBbX2xvY2FsTmFtZSwgLi4ubmVzdGVkUGF0aF0gPSBzeW1ib2xzLnN5bWJvbE5hbWVzO1xuXG4gICAgICBjb25zdCBtb2R1bGVOYW1lID0gZXh0cmFjdE1vZHVsZU5hbWUoZmlyc3REZWNsLnBhcmVudC5wYXJlbnQucGFyZW50KTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IFR5cGVWYWx1ZVJlZmVyZW5jZUtpbmQuSU1QT1JURUQsXG4gICAgICAgIHZhbHVlRGVjbGFyYXRpb246IGRlY2wudmFsdWVEZWNsYXJhdGlvbixcbiAgICAgICAgbW9kdWxlTmFtZSxcbiAgICAgICAgaW1wb3J0ZWROYW1lLFxuICAgICAgICBuZXN0ZWRQYXRoXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAodHMuaXNOYW1lc3BhY2VJbXBvcnQoZmlyc3REZWNsKSkge1xuICAgICAgLy8gVGhlIGltcG9ydCBpcyBhIG5hbWVzcGFjZSBpbXBvcnRcbiAgICAgIC8vICAgaW1wb3J0ICogYXMgRm9vIGZyb20gJ2Zvbyc7XG5cbiAgICAgIGlmIChmaXJzdERlY2wucGFyZW50LmlzVHlwZU9ubHkpIHtcbiAgICAgICAgLy8gVHlwZS1vbmx5IGltcG9ydHMgY2Fubm90IGJlIHJlcHJlc2VudGVkIGFzIHZhbHVlLlxuICAgICAgICByZXR1cm4gdHlwZU9ubHlJbXBvcnQodHlwZU5vZGUsIGZpcnN0RGVjbC5wYXJlbnQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc3ltYm9scy5zeW1ib2xOYW1lcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgLy8gVGhlIHR5cGUgcmVmZXJzIHRvIHRoZSBuYW1lc3BhY2UgaXRzZWxmLCB3aGljaCBjYW5ub3QgYmUgcmVwcmVzZW50ZWQgYXMgYSB2YWx1ZS5cbiAgICAgICAgcmV0dXJuIG5hbWVzcGFjZUltcG9ydCh0eXBlTm9kZSwgZmlyc3REZWNsLnBhcmVudCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBmaXJzdCBzeW1ib2wgbmFtZSByZWZlcnMgdG8gdGhlIGxvY2FsIG5hbWUgb2YgdGhlIG5hbWVzcGFjZSwgd2hpY2ggaXMgaXMgZGlzY2FyZGVkXG4gICAgICAvLyBhcyBhIG5ldyBuYW1lc3BhY2UgaW1wb3J0IHdpbGwgYmUgZ2VuZXJhdGVkLiBUaGlzIGlzIGZvbGxvd2VkIGJ5IHRoZSBzeW1ib2wgbmFtZSB0aGF0IG5lZWRzXG4gICAgICAvLyB0byBiZSBpbXBvcnRlZCBhbmQgYW55IHJlbWFpbmluZyBuYW1lcyB0aGF0IGNvbnN0aXR1dGUgdGhlIGNvbXBsZXRlIHBhdGggdG8gdGhlIHZhbHVlLlxuICAgICAgY29uc3QgW19ucywgaW1wb3J0ZWROYW1lLCAuLi5uZXN0ZWRQYXRoXSA9IHN5bWJvbHMuc3ltYm9sTmFtZXM7XG5cbiAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSBleHRyYWN0TW9kdWxlTmFtZShmaXJzdERlY2wucGFyZW50LnBhcmVudCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLklNUE9SVEVELFxuICAgICAgICB2YWx1ZURlY2xhcmF0aW9uOiBkZWNsLnZhbHVlRGVjbGFyYXRpb24sXG4gICAgICAgIG1vZHVsZU5hbWUsXG4gICAgICAgIGltcG9ydGVkTmFtZSxcbiAgICAgICAgbmVzdGVkUGF0aFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvLyBJZiB0aGUgdHlwZSBpcyBub3QgaW1wb3J0ZWQsIHRoZSB0eXBlIHJlZmVyZW5jZSBjYW4gYmUgY29udmVydGVkIGludG8gYW4gZXhwcmVzc2lvbiBhcyBpcy5cbiAgY29uc3QgZXhwcmVzc2lvbiA9IHR5cGVOb2RlVG9WYWx1ZUV4cHIodHlwZU5vZGUpO1xuICBpZiAoZXhwcmVzc2lvbiAhPT0gbnVsbCkge1xuICAgIHJldHVybiB7XG4gICAgICBraW5kOiBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLkxPQ0FMLFxuICAgICAgZXhwcmVzc2lvbixcbiAgICAgIGRlZmF1bHRJbXBvcnRTdGF0ZW1lbnQ6IG51bGwsXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdW5zdXBwb3J0ZWRUeXBlKHR5cGVOb2RlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB1bnN1cHBvcnRlZFR5cGUodHlwZU5vZGU6IHRzLlR5cGVOb2RlKTogVW5hdmFpbGFibGVUeXBlVmFsdWVSZWZlcmVuY2Uge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IFR5cGVWYWx1ZVJlZmVyZW5jZUtpbmQuVU5BVkFJTEFCTEUsXG4gICAgcmVhc29uOiB7a2luZDogVmFsdWVVbmF2YWlsYWJsZUtpbmQuVU5TVVBQT1JURUQsIHR5cGVOb2RlfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9WYWx1ZURlY2xhcmF0aW9uKFxuICAgIHR5cGVOb2RlOiB0cy5UeXBlTm9kZSwgZGVjbDogdHMuRGVjbGFyYXRpb258bnVsbCk6IFVuYXZhaWxhYmxlVHlwZVZhbHVlUmVmZXJlbmNlIHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLlVOQVZBSUxBQkxFLFxuICAgIHJlYXNvbjoge2tpbmQ6IFZhbHVlVW5hdmFpbGFibGVLaW5kLk5PX1ZBTFVFX0RFQ0xBUkFUSU9OLCB0eXBlTm9kZSwgZGVjbH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIHR5cGVPbmx5SW1wb3J0KFxuICAgIHR5cGVOb2RlOiB0cy5UeXBlTm9kZSwgaW1wb3J0Q2xhdXNlOiB0cy5JbXBvcnRDbGF1c2UpOiBVbmF2YWlsYWJsZVR5cGVWYWx1ZVJlZmVyZW5jZSB7XG4gIHJldHVybiB7XG4gICAga2luZDogVHlwZVZhbHVlUmVmZXJlbmNlS2luZC5VTkFWQUlMQUJMRSxcbiAgICByZWFzb246IHtraW5kOiBWYWx1ZVVuYXZhaWxhYmxlS2luZC5UWVBFX09OTFlfSU1QT1JULCB0eXBlTm9kZSwgaW1wb3J0Q2xhdXNlfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdW5rbm93blJlZmVyZW5jZSh0eXBlTm9kZTogdHMuVHlwZU5vZGUpOiBVbmF2YWlsYWJsZVR5cGVWYWx1ZVJlZmVyZW5jZSB7XG4gIHJldHVybiB7XG4gICAga2luZDogVHlwZVZhbHVlUmVmZXJlbmNlS2luZC5VTkFWQUlMQUJMRSxcbiAgICByZWFzb246IHtraW5kOiBWYWx1ZVVuYXZhaWxhYmxlS2luZC5VTktOT1dOX1JFRkVSRU5DRSwgdHlwZU5vZGV9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBuYW1lc3BhY2VJbXBvcnQoXG4gICAgdHlwZU5vZGU6IHRzLlR5cGVOb2RlLCBpbXBvcnRDbGF1c2U6IHRzLkltcG9ydENsYXVzZSk6IFVuYXZhaWxhYmxlVHlwZVZhbHVlUmVmZXJlbmNlIHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLlVOQVZBSUxBQkxFLFxuICAgIHJlYXNvbjoge2tpbmQ6IFZhbHVlVW5hdmFpbGFibGVLaW5kLk5BTUVTUEFDRSwgdHlwZU5vZGUsIGltcG9ydENsYXVzZX0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIG1pc3NpbmdUeXBlKCk6IFVuYXZhaWxhYmxlVHlwZVZhbHVlUmVmZXJlbmNlIHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLlVOQVZBSUxBQkxFLFxuICAgIHJlYXNvbjoge2tpbmQ6IFZhbHVlVW5hdmFpbGFibGVLaW5kLk1JU1NJTkdfVFlQRX0sXG4gIH07XG59XG5cbi8qKlxuICogQXR0ZW1wdCB0byBleHRyYWN0IGEgYHRzLkV4cHJlc3Npb25gIHRoYXQncyBlcXVpdmFsZW50IHRvIGEgYHRzLlR5cGVOb2RlYCwgYXMgdGhlIHR3byBoYXZlXG4gKiBkaWZmZXJlbnQgQVNUIHNoYXBlcyBidXQgY2FuIHJlZmVyZW5jZSB0aGUgc2FtZSBzeW1ib2xzLlxuICpcbiAqIFRoaXMgd2lsbCByZXR1cm4gYG51bGxgIGlmIGFuIGVxdWl2YWxlbnQgZXhwcmVzc2lvbiBjYW5ub3QgYmUgY29uc3RydWN0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0eXBlTm9kZVRvVmFsdWVFeHByKG5vZGU6IHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUobm9kZSkpIHtcbiAgICByZXR1cm4gZW50aXR5TmFtZVRvVmFsdWUobm9kZS50eXBlTmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgYFR5cGVSZWZlcmVuY2VgIG5vZGUgdG8gdGhlIGB0cy5TeW1ib2xgcyBmb3IgYm90aCBpdHMgZGVjbGFyYXRpb24gYW5kIGl0cyBsb2NhbCBzb3VyY2UuXG4gKlxuICogSW4gdGhlIGV2ZW50IHRoYXQgdGhlIGBUeXBlUmVmZXJlbmNlYCByZWZlcnMgdG8gYSBsb2NhbGx5IGRlY2xhcmVkIHN5bWJvbCwgdGhlc2Ugd2lsbCBiZSB0aGVcbiAqIHNhbWUuIElmIHRoZSBgVHlwZVJlZmVyZW5jZWAgcmVmZXJzIHRvIGFuIGltcG9ydGVkIHN5bWJvbCwgdGhlbiBgZGVjbGAgd2lsbCBiZSB0aGUgZnVsbHkgcmVzb2x2ZWRcbiAqIGB0cy5TeW1ib2xgIG9mIHRoZSByZWZlcmVuY2VkIHN5bWJvbC4gYGxvY2FsYCB3aWxsIGJlIHRoZSBgdHMuU3ltYm9sYCBvZiB0aGUgYHRzLklkZW50aWZpZXJgXG4gKiB3aGljaCBwb2ludHMgdG8gdGhlIGltcG9ydCBzdGF0ZW1lbnQgYnkgd2hpY2ggdGhlIHN5bWJvbCB3YXMgaW1wb3J0ZWQuXG4gKlxuICogQWxsIHN5bWJvbCBuYW1lcyB0aGF0IG1ha2UgdXAgdGhlIHR5cGUgcmVmZXJlbmNlIGFyZSByZXR1cm5lZCBsZWZ0LXRvLXJpZ2h0IGludG8gdGhlXG4gKiBgc3ltYm9sTmFtZXNgIGFycmF5LCB3aGljaCBpcyBndWFyYW50ZWVkIHRvIGluY2x1ZGUgYXQgbGVhc3Qgb25lIGVudHJ5LlxuICovXG5mdW5jdGlvbiByZXNvbHZlVHlwZVN5bWJvbHModHlwZVJlZjogdHMuVHlwZVJlZmVyZW5jZU5vZGUsIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKTpcbiAgICB7bG9jYWw6IHRzLlN5bWJvbCwgZGVjbDogdHMuU3ltYm9sLCBzeW1ib2xOYW1lczogc3RyaW5nW119fG51bGwge1xuICBjb25zdCB0eXBlTmFtZSA9IHR5cGVSZWYudHlwZU5hbWU7XG4gIC8vIHR5cGVSZWZTeW1ib2wgaXMgdGhlIHRzLlN5bWJvbCBvZiB0aGUgZW50aXJlIHR5cGUgcmVmZXJlbmNlLlxuICBjb25zdCB0eXBlUmVmU3ltYm9sOiB0cy5TeW1ib2x8dW5kZWZpbmVkID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHR5cGVOYW1lKTtcbiAgaWYgKHR5cGVSZWZTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gYGxvY2FsYCBpcyB0aGUgYHRzLlN5bWJvbGAgZm9yIHRoZSBsb2NhbCBgdHMuSWRlbnRpZmllcmAgZm9yIHRoZSB0eXBlLlxuICAvLyBJZiB0aGUgdHlwZSBpcyBhY3R1YWxseSBsb2NhbGx5IGRlY2xhcmVkIG9yIGlzIGltcG9ydGVkIGJ5IG5hbWUsIGZvciBleGFtcGxlOlxuICAvLyAgIGltcG9ydCB7Rm9vfSBmcm9tICcuL2Zvbyc7XG4gIC8vIHRoZW4gaXQnbGwgYmUgdGhlIHNhbWUgYXMgYHR5cGVSZWZTeW1ib2xgLlxuICAvL1xuICAvLyBJZiB0aGUgdHlwZSBpcyBpbXBvcnRlZCB2aWEgYSBuYW1lc3BhY2UgaW1wb3J0LCBmb3IgZXhhbXBsZTpcbiAgLy8gICBpbXBvcnQgKiBhcyBmb28gZnJvbSAnLi9mb28nO1xuICAvLyBhbmQgdGhlbiByZWZlcmVuY2VkIGFzOlxuICAvLyAgIGNvbnN0cnVjdG9yKGY6IGZvby5Gb28pXG4gIC8vIHRoZW4gYGxvY2FsYCB3aWxsIGJlIHRoZSBgdHMuU3ltYm9sYCBvZiBgZm9vYCwgd2hlcmVhcyBgdHlwZVJlZlN5bWJvbGAgd2lsbCBiZSB0aGUgYHRzLlN5bWJvbGBcbiAgLy8gb2YgYGZvby5Gb29gLiBUaGlzIGFsbG93cyB0cmFja2luZyBvZiB0aGUgaW1wb3J0IGJlaGluZCB3aGF0ZXZlciB0eXBlIHJlZmVyZW5jZSBleGlzdHMuXG4gIGxldCBsb2NhbCA9IHR5cGVSZWZTeW1ib2w7XG5cbiAgLy8gRGVzdHJ1Y3R1cmUgYSBuYW1lIGxpa2UgYGZvby5YLlkuWmAgYXMgZm9sbG93czpcbiAgLy8gLSBpbiBgbGVmdE1vc3RgLCB0aGUgYHRzLklkZW50aWZpZXJgIG9mIHRoZSBsZWZ0LW1vc3QgbmFtZSAoYGZvb2ApIGluIHRoZSBxdWFsaWZpZWQgbmFtZS5cbiAgLy8gICBUaGlzIGlkZW50aWZpZXIgaXMgdXNlZCB0byByZXNvbHZlIHRoZSBgdHMuU3ltYm9sYCBmb3IgYGxvY2FsYC5cbiAgLy8gLSBpbiBgc3ltYm9sTmFtZXNgLCBhbGwgbmFtZXMgaW52b2x2ZWQgaW4gdGhlIHF1YWxpZmllZCBwYXRoLCBvciBhIHNpbmdsZSBzeW1ib2wgbmFtZSBpZiB0aGVcbiAgLy8gICB0eXBlIGlzIG5vdCBxdWFsaWZpZWQuXG4gIGxldCBsZWZ0TW9zdCA9IHR5cGVOYW1lO1xuICBjb25zdCBzeW1ib2xOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgd2hpbGUgKHRzLmlzUXVhbGlmaWVkTmFtZShsZWZ0TW9zdCkpIHtcbiAgICBzeW1ib2xOYW1lcy51bnNoaWZ0KGxlZnRNb3N0LnJpZ2h0LnRleHQpO1xuICAgIGxlZnRNb3N0ID0gbGVmdE1vc3QubGVmdDtcbiAgfVxuICBzeW1ib2xOYW1lcy51bnNoaWZ0KGxlZnRNb3N0LnRleHQpO1xuXG4gIGlmIChsZWZ0TW9zdCAhPT0gdHlwZU5hbWUpIHtcbiAgICBjb25zdCBsb2NhbFRtcCA9IGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihsZWZ0TW9zdCk7XG4gICAgaWYgKGxvY2FsVG1wICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGxvY2FsID0gbG9jYWxUbXA7XG4gICAgfVxuICB9XG5cbiAgLy8gRGUtYWxpYXMgdGhlIHRvcC1sZXZlbCB0eXBlIHJlZmVyZW5jZSBzeW1ib2wgdG8gZ2V0IHRoZSBzeW1ib2wgb2YgdGhlIGFjdHVhbCBkZWNsYXJhdGlvbi5cbiAgbGV0IGRlY2wgPSB0eXBlUmVmU3ltYm9sO1xuICBpZiAodHlwZVJlZlN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgZGVjbCA9IGNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbCh0eXBlUmVmU3ltYm9sKTtcbiAgfVxuICByZXR1cm4ge2xvY2FsLCBkZWNsLCBzeW1ib2xOYW1lc307XG59XG5cbmZ1bmN0aW9uIGVudGl0eU5hbWVUb1ZhbHVlKG5vZGU6IHRzLkVudGl0eU5hbWUpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBpZiAodHMuaXNRdWFsaWZpZWROYW1lKG5vZGUpKSB7XG4gICAgY29uc3QgbGVmdCA9IGVudGl0eU5hbWVUb1ZhbHVlKG5vZGUubGVmdCk7XG4gICAgcmV0dXJuIGxlZnQgIT09IG51bGwgPyB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhsZWZ0LCBub2RlLnJpZ2h0KSA6IG51bGw7XG4gIH0gZWxzZSBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUpKSB7XG4gICAgcmV0dXJuIHRzLmdldE11dGFibGVDbG9uZShub2RlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBleHRyYWN0TW9kdWxlTmFtZShub2RlOiB0cy5JbXBvcnREZWNsYXJhdGlvbik6IHN0cmluZyB7XG4gIGlmICghdHMuaXNTdHJpbmdMaXRlcmFsKG5vZGUubW9kdWxlU3BlY2lmaWVyKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignbm90IGEgbW9kdWxlIHNwZWNpZmllcicpO1xuICB9XG4gIHJldHVybiBub2RlLm1vZHVsZVNwZWNpZmllci50ZXh0O1xufVxuIl19