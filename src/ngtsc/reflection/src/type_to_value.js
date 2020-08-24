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
            return noValueDeclaration(typeNode, decl.declarations[0]);
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
                var _a = tslib_1.__read(symbols.symbolNames), _localName = _a[0], nestedPath = _a.slice(1);
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
                var _b = tslib_1.__read(symbols.symbolNames), _ns = _b[0], importedName = _b[1], nestedPath = _b.slice(2);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV90b192YWx1ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbi9zcmMvdHlwZV90b192YWx1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBSWpDOzs7Ozs7T0FNRztJQUNILFNBQWdCLFdBQVcsQ0FDdkIsUUFBMEIsRUFBRSxPQUF1QjtRQUNyRCx5RkFBeUY7UUFDekYsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO1lBQ3JCLE9BQU8sV0FBVyxFQUFFLENBQUM7U0FDdEI7UUFFRCxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3JDLE9BQU8sZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ2xDO1FBRUQsSUFBTSxPQUFPLEdBQUcsa0JBQWtCLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtZQUNwQixPQUFPLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ25DO1FBRU0sSUFBQSxLQUFLLEdBQVUsT0FBTyxNQUFqQixFQUFFLElBQUksR0FBSSxPQUFPLEtBQVgsQ0FBWTtRQUM5Qix3RkFBd0Y7UUFDeEYsc0ZBQXNGO1FBQ3RGLCtFQUErRTtRQUMvRSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRTtZQUNoRixPQUFPLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDM0Q7UUFFRCxrRkFBa0Y7UUFDbEYsc0ZBQXNGO1FBRXRGLGtGQUFrRjtRQUNsRixvRkFB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YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxJQUEwQjtRQUNuRCxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1NBQzNDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztJQUNuQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1R5cGVWYWx1ZVJlZmVyZW5jZSwgVHlwZVZhbHVlUmVmZXJlbmNlS2luZCwgVW5hdmFpbGFibGVUeXBlVmFsdWVSZWZlcmVuY2UsIFZhbHVlVW5hdmFpbGFibGVLaW5kfSBmcm9tICcuL2hvc3QnO1xuXG4vKipcbiAqIFBvdGVudGlhbGx5IGNvbnZlcnQgYSBgdHMuVHlwZU5vZGVgIHRvIGEgYFR5cGVWYWx1ZVJlZmVyZW5jZWAsIHdoaWNoIGluZGljYXRlcyBob3cgdG8gdXNlIHRoZVxuICogdHlwZSBnaXZlbiBpbiB0aGUgYHRzLlR5cGVOb2RlYCBpbiBhIHZhbHVlIHBvc2l0aW9uLlxuICpcbiAqIFRoaXMgY2FuIHJldHVybiBgbnVsbGAgaWYgdGhlIGB0eXBlTm9kZWAgaXMgYG51bGxgLCBpZiBpdCBkb2VzIG5vdCByZWZlciB0byBhIHN5bWJvbCB3aXRoIGEgdmFsdWVcbiAqIGRlY2xhcmF0aW9uLCBvciBpZiBpdCBpcyBub3QgcG9zc2libGUgdG8gc3RhdGljYWxseSB1bmRlcnN0YW5kLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZVRvVmFsdWUoXG4gICAgdHlwZU5vZGU6IHRzLlR5cGVOb2RlfG51bGwsIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKTogVHlwZVZhbHVlUmVmZXJlbmNlIHtcbiAgLy8gSXQncyBub3QgcG9zc2libGUgdG8gZ2V0IGEgdmFsdWUgZXhwcmVzc2lvbiBpZiB0aGUgcGFyYW1ldGVyIGRvZXNuJ3QgZXZlbiBoYXZlIGEgdHlwZS5cbiAgaWYgKHR5cGVOb2RlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG1pc3NpbmdUeXBlKCk7XG4gIH1cblxuICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUodHlwZU5vZGUpKSB7XG4gICAgcmV0dXJuIHVuc3VwcG9ydGVkVHlwZSh0eXBlTm9kZSk7XG4gIH1cblxuICBjb25zdCBzeW1ib2xzID0gcmVzb2x2ZVR5cGVTeW1ib2xzKHR5cGVOb2RlLCBjaGVja2VyKTtcbiAgaWYgKHN5bWJvbHMgPT09IG51bGwpIHtcbiAgICByZXR1cm4gdW5rbm93blJlZmVyZW5jZSh0eXBlTm9kZSk7XG4gIH1cblxuICBjb25zdCB7bG9jYWwsIGRlY2x9ID0gc3ltYm9scztcbiAgLy8gSXQncyBvbmx5IHZhbGlkIHRvIGNvbnZlcnQgYSB0eXBlIHJlZmVyZW5jZSB0byBhIHZhbHVlIHJlZmVyZW5jZSBpZiB0aGUgdHlwZSBhY3R1YWxseVxuICAvLyBoYXMgYSB2YWx1ZSBkZWNsYXJhdGlvbiBhc3NvY2lhdGVkIHdpdGggaXQuIE5vdGUgdGhhdCBjb25zdCBlbnVtcyBhcmUgYW4gZXhjZXB0aW9uLFxuICAvLyBiZWNhdXNlIHdoaWxlIHRoZXkgZG8gaGF2ZSBhIHZhbHVlIGRlY2xhcmF0aW9uLCB0aGV5IGRvbid0IGV4aXN0IGF0IHJ1bnRpbWUuXG4gIGlmIChkZWNsLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fCBkZWNsLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQ29uc3RFbnVtKSB7XG4gICAgcmV0dXJuIG5vVmFsdWVEZWNsYXJhdGlvbih0eXBlTm9kZSwgZGVjbC5kZWNsYXJhdGlvbnNbMF0pO1xuICB9XG5cbiAgLy8gVGhlIHR5cGUgcG9pbnRzIHRvIGEgdmFsaWQgdmFsdWUgZGVjbGFyYXRpb24uIFJld3JpdGUgdGhlIFR5cGVSZWZlcmVuY2UgaW50byBhblxuICAvLyBFeHByZXNzaW9uIHdoaWNoIHJlZmVyZW5jZXMgdGhlIHZhbHVlIHBvaW50ZWQgdG8gYnkgdGhlIFR5cGVSZWZlcmVuY2UsIGlmIHBvc3NpYmxlLlxuXG4gIC8vIExvb2sgYXQgdGhlIGxvY2FsIGB0cy5TeW1ib2xgJ3MgZGVjbGFyYXRpb25zIGFuZCBzZWUgaWYgaXQgY29tZXMgZnJvbSBhbiBpbXBvcnRcbiAgLy8gc3RhdGVtZW50LiBJZiBzbywgZXh0cmFjdCB0aGUgbW9kdWxlIHNwZWNpZmllciBhbmQgdGhlIG5hbWUgb2YgdGhlIGltcG9ydGVkIHR5cGUuXG4gIGNvbnN0IGZpcnN0RGVjbCA9IGxvY2FsLmRlY2xhcmF0aW9ucyAmJiBsb2NhbC5kZWNsYXJhdGlvbnNbMF07XG4gIGlmIChmaXJzdERlY2wgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICh0cy5pc0ltcG9ydENsYXVzZShmaXJzdERlY2wpICYmIGZpcnN0RGVjbC5uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFRoaXMgaXMgYSBkZWZhdWx0IGltcG9ydC5cbiAgICAgIC8vICAgaW1wb3J0IEZvbyBmcm9tICdmb28nO1xuXG4gICAgICBpZiAoZmlyc3REZWNsLmlzVHlwZU9ubHkpIHtcbiAgICAgICAgLy8gVHlwZS1vbmx5IGltcG9ydHMgY2Fubm90IGJlIHJlcHJlc2VudGVkIGFzIHZhbHVlLlxuICAgICAgICByZXR1cm4gdHlwZU9ubHlJbXBvcnQodHlwZU5vZGUsIGZpcnN0RGVjbCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IFR5cGVWYWx1ZVJlZmVyZW5jZUtpbmQuTE9DQUwsXG4gICAgICAgIGV4cHJlc3Npb246IGZpcnN0RGVjbC5uYW1lLFxuICAgICAgICBkZWZhdWx0SW1wb3J0U3RhdGVtZW50OiBmaXJzdERlY2wucGFyZW50LFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzSW1wb3J0U3BlY2lmaWVyKGZpcnN0RGVjbCkpIHtcbiAgICAgIC8vIFRoZSBzeW1ib2wgd2FzIGltcG9ydGVkIGJ5IG5hbWVcbiAgICAgIC8vICAgaW1wb3J0IHtGb299IGZyb20gJ2Zvbyc7XG4gICAgICAvLyBvclxuICAgICAgLy8gICBpbXBvcnQge0ZvbyBhcyBCYXJ9IGZyb20gJ2Zvbyc7XG5cbiAgICAgIGlmIChmaXJzdERlY2wucGFyZW50LnBhcmVudC5pc1R5cGVPbmx5KSB7XG4gICAgICAgIC8vIFR5cGUtb25seSBpbXBvcnRzIGNhbm5vdCBiZSByZXByZXNlbnRlZCBhcyB2YWx1ZS5cbiAgICAgICAgcmV0dXJuIHR5cGVPbmx5SW1wb3J0KHR5cGVOb2RlLCBmaXJzdERlY2wucGFyZW50LnBhcmVudCk7XG4gICAgICB9XG5cbiAgICAgIC8vIERldGVybWluZSB0aGUgbmFtZSB0byBpbXBvcnQgKGBGb29gKSBmcm9tIHRoZSBpbXBvcnQgc3BlY2lmaWVyLCBhcyB0aGUgc3ltYm9sIG5hbWVzIG9mXG4gICAgICAvLyB0aGUgaW1wb3J0ZWQgdHlwZSBjb3VsZCByZWZlciB0byBhIGxvY2FsIGFsaWFzIChsaWtlIGBCYXJgIGluIHRoZSBleGFtcGxlIGFib3ZlKS5cbiAgICAgIGNvbnN0IGltcG9ydGVkTmFtZSA9IChmaXJzdERlY2wucHJvcGVydHlOYW1lIHx8IGZpcnN0RGVjbC5uYW1lKS50ZXh0O1xuXG4gICAgICAvLyBUaGUgZmlyc3Qgc3ltYm9sIG5hbWUgcmVmZXJzIHRvIHRoZSBsb2NhbCBuYW1lLCB3aGljaCBpcyByZXBsYWNlZCBieSBgaW1wb3J0ZWROYW1lYCBhYm92ZS5cbiAgICAgIC8vIEFueSByZW1haW5pbmcgc3ltYm9sIG5hbWVzIG1ha2UgdXAgdGhlIGNvbXBsZXRlIHBhdGggdG8gdGhlIHZhbHVlLlxuICAgICAgY29uc3QgW19sb2NhbE5hbWUsIC4uLm5lc3RlZFBhdGhdID0gc3ltYm9scy5zeW1ib2xOYW1lcztcblxuICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IGV4dHJhY3RNb2R1bGVOYW1lKGZpcnN0RGVjbC5wYXJlbnQucGFyZW50LnBhcmVudCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLklNUE9SVEVELFxuICAgICAgICB2YWx1ZURlY2xhcmF0aW9uOiBkZWNsLnZhbHVlRGVjbGFyYXRpb24sXG4gICAgICAgIG1vZHVsZU5hbWUsXG4gICAgICAgIGltcG9ydGVkTmFtZSxcbiAgICAgICAgbmVzdGVkUGF0aFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzTmFtZXNwYWNlSW1wb3J0KGZpcnN0RGVjbCkpIHtcbiAgICAgIC8vIFRoZSBpbXBvcnQgaXMgYSBuYW1lc3BhY2UgaW1wb3J0XG4gICAgICAvLyAgIGltcG9ydCAqIGFzIEZvbyBmcm9tICdmb28nO1xuXG4gICAgICBpZiAoZmlyc3REZWNsLnBhcmVudC5pc1R5cGVPbmx5KSB7XG4gICAgICAgIC8vIFR5cGUtb25seSBpbXBvcnRzIGNhbm5vdCBiZSByZXByZXNlbnRlZCBhcyB2YWx1ZS5cbiAgICAgICAgcmV0dXJuIHR5cGVPbmx5SW1wb3J0KHR5cGVOb2RlLCBmaXJzdERlY2wucGFyZW50KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHN5bWJvbHMuc3ltYm9sTmFtZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIC8vIFRoZSB0eXBlIHJlZmVycyB0byB0aGUgbmFtZXNwYWNlIGl0c2VsZiwgd2hpY2ggY2Fubm90IGJlIHJlcHJlc2VudGVkIGFzIGEgdmFsdWUuXG4gICAgICAgIHJldHVybiBuYW1lc3BhY2VJbXBvcnQodHlwZU5vZGUsIGZpcnN0RGVjbC5wYXJlbnQpO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgZmlyc3Qgc3ltYm9sIG5hbWUgcmVmZXJzIHRvIHRoZSBsb2NhbCBuYW1lIG9mIHRoZSBuYW1lc3BhY2UsIHdoaWNoIGlzIGlzIGRpc2NhcmRlZFxuICAgICAgLy8gYXMgYSBuZXcgbmFtZXNwYWNlIGltcG9ydCB3aWxsIGJlIGdlbmVyYXRlZC4gVGhpcyBpcyBmb2xsb3dlZCBieSB0aGUgc3ltYm9sIG5hbWUgdGhhdCBuZWVkc1xuICAgICAgLy8gdG8gYmUgaW1wb3J0ZWQgYW5kIGFueSByZW1haW5pbmcgbmFtZXMgdGhhdCBjb25zdGl0dXRlIHRoZSBjb21wbGV0ZSBwYXRoIHRvIHRoZSB2YWx1ZS5cbiAgICAgIGNvbnN0IFtfbnMsIGltcG9ydGVkTmFtZSwgLi4ubmVzdGVkUGF0aF0gPSBzeW1ib2xzLnN5bWJvbE5hbWVzO1xuXG4gICAgICBjb25zdCBtb2R1bGVOYW1lID0gZXh0cmFjdE1vZHVsZU5hbWUoZmlyc3REZWNsLnBhcmVudC5wYXJlbnQpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogVHlwZVZhbHVlUmVmZXJlbmNlS2luZC5JTVBPUlRFRCxcbiAgICAgICAgdmFsdWVEZWNsYXJhdGlvbjogZGVjbC52YWx1ZURlY2xhcmF0aW9uLFxuICAgICAgICBtb2R1bGVOYW1lLFxuICAgICAgICBpbXBvcnRlZE5hbWUsXG4gICAgICAgIG5lc3RlZFBhdGhcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLy8gSWYgdGhlIHR5cGUgaXMgbm90IGltcG9ydGVkLCB0aGUgdHlwZSByZWZlcmVuY2UgY2FuIGJlIGNvbnZlcnRlZCBpbnRvIGFuIGV4cHJlc3Npb24gYXMgaXMuXG4gIGNvbnN0IGV4cHJlc3Npb24gPSB0eXBlTm9kZVRvVmFsdWVFeHByKHR5cGVOb2RlKTtcbiAgaWYgKGV4cHJlc3Npb24gIT09IG51bGwpIHtcbiAgICByZXR1cm4ge1xuICAgICAga2luZDogVHlwZVZhbHVlUmVmZXJlbmNlS2luZC5MT0NBTCxcbiAgICAgIGV4cHJlc3Npb24sXG4gICAgICBkZWZhdWx0SW1wb3J0U3RhdGVtZW50OiBudWxsLFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHVuc3VwcG9ydGVkVHlwZSh0eXBlTm9kZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdW5zdXBwb3J0ZWRUeXBlKHR5cGVOb2RlOiB0cy5UeXBlTm9kZSk6IFVuYXZhaWxhYmxlVHlwZVZhbHVlUmVmZXJlbmNlIHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLlVOQVZBSUxBQkxFLFxuICAgIHJlYXNvbjoge2tpbmQ6IFZhbHVlVW5hdmFpbGFibGVLaW5kLlVOU1VQUE9SVEVELCB0eXBlTm9kZX0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vVmFsdWVEZWNsYXJhdGlvbihcbiAgICB0eXBlTm9kZTogdHMuVHlwZU5vZGUsIGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogVW5hdmFpbGFibGVUeXBlVmFsdWVSZWZlcmVuY2Uge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IFR5cGVWYWx1ZVJlZmVyZW5jZUtpbmQuVU5BVkFJTEFCTEUsXG4gICAgcmVhc29uOiB7a2luZDogVmFsdWVVbmF2YWlsYWJsZUtpbmQuTk9fVkFMVUVfREVDTEFSQVRJT04sIHR5cGVOb2RlLCBkZWNsfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdHlwZU9ubHlJbXBvcnQoXG4gICAgdHlwZU5vZGU6IHRzLlR5cGVOb2RlLCBpbXBvcnRDbGF1c2U6IHRzLkltcG9ydENsYXVzZSk6IFVuYXZhaWxhYmxlVHlwZVZhbHVlUmVmZXJlbmNlIHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLlVOQVZBSUxBQkxFLFxuICAgIHJlYXNvbjoge2tpbmQ6IFZhbHVlVW5hdmFpbGFibGVLaW5kLlRZUEVfT05MWV9JTVBPUlQsIHR5cGVOb2RlLCBpbXBvcnRDbGF1c2V9LFxuICB9O1xufVxuXG5mdW5jdGlvbiB1bmtub3duUmVmZXJlbmNlKHR5cGVOb2RlOiB0cy5UeXBlTm9kZSk6IFVuYXZhaWxhYmxlVHlwZVZhbHVlUmVmZXJlbmNlIHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLlVOQVZBSUxBQkxFLFxuICAgIHJlYXNvbjoge2tpbmQ6IFZhbHVlVW5hdmFpbGFibGVLaW5kLlVOS05PV05fUkVGRVJFTkNFLCB0eXBlTm9kZX0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5hbWVzcGFjZUltcG9ydChcbiAgICB0eXBlTm9kZTogdHMuVHlwZU5vZGUsIGltcG9ydENsYXVzZTogdHMuSW1wb3J0Q2xhdXNlKTogVW5hdmFpbGFibGVUeXBlVmFsdWVSZWZlcmVuY2Uge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IFR5cGVWYWx1ZVJlZmVyZW5jZUtpbmQuVU5BVkFJTEFCTEUsXG4gICAgcmVhc29uOiB7a2luZDogVmFsdWVVbmF2YWlsYWJsZUtpbmQuTkFNRVNQQUNFLCB0eXBlTm9kZSwgaW1wb3J0Q2xhdXNlfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWlzc2luZ1R5cGUoKTogVW5hdmFpbGFibGVUeXBlVmFsdWVSZWZlcmVuY2Uge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IFR5cGVWYWx1ZVJlZmVyZW5jZUtpbmQuVU5BVkFJTEFCTEUsXG4gICAgcmVhc29uOiB7a2luZDogVmFsdWVVbmF2YWlsYWJsZUtpbmQuTUlTU0lOR19UWVBFfSxcbiAgfTtcbn1cblxuLyoqXG4gKiBBdHRlbXB0IHRvIGV4dHJhY3QgYSBgdHMuRXhwcmVzc2lvbmAgdGhhdCdzIGVxdWl2YWxlbnQgdG8gYSBgdHMuVHlwZU5vZGVgLCBhcyB0aGUgdHdvIGhhdmVcbiAqIGRpZmZlcmVudCBBU1Qgc2hhcGVzIGJ1dCBjYW4gcmVmZXJlbmNlIHRoZSBzYW1lIHN5bWJvbHMuXG4gKlxuICogVGhpcyB3aWxsIHJldHVybiBgbnVsbGAgaWYgYW4gZXF1aXZhbGVudCBleHByZXNzaW9uIGNhbm5vdCBiZSBjb25zdHJ1Y3RlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHR5cGVOb2RlVG9WYWx1ZUV4cHIobm9kZTogdHMuVHlwZU5vZGUpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBpZiAodHMuaXNUeXBlUmVmZXJlbmNlTm9kZShub2RlKSkge1xuICAgIHJldHVybiBlbnRpdHlOYW1lVG9WYWx1ZShub2RlLnR5cGVOYW1lKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIFJlc29sdmUgYSBgVHlwZVJlZmVyZW5jZWAgbm9kZSB0byB0aGUgYHRzLlN5bWJvbGBzIGZvciBib3RoIGl0cyBkZWNsYXJhdGlvbiBhbmQgaXRzIGxvY2FsIHNvdXJjZS5cbiAqXG4gKiBJbiB0aGUgZXZlbnQgdGhhdCB0aGUgYFR5cGVSZWZlcmVuY2VgIHJlZmVycyB0byBhIGxvY2FsbHkgZGVjbGFyZWQgc3ltYm9sLCB0aGVzZSB3aWxsIGJlIHRoZVxuICogc2FtZS4gSWYgdGhlIGBUeXBlUmVmZXJlbmNlYCByZWZlcnMgdG8gYW4gaW1wb3J0ZWQgc3ltYm9sLCB0aGVuIGBkZWNsYCB3aWxsIGJlIHRoZSBmdWxseSByZXNvbHZlZFxuICogYHRzLlN5bWJvbGAgb2YgdGhlIHJlZmVyZW5jZWQgc3ltYm9sLiBgbG9jYWxgIHdpbGwgYmUgdGhlIGB0cy5TeW1ib2xgIG9mIHRoZSBgdHMuSWRlbnRpZmllcmBcbiAqIHdoaWNoIHBvaW50cyB0byB0aGUgaW1wb3J0IHN0YXRlbWVudCBieSB3aGljaCB0aGUgc3ltYm9sIHdhcyBpbXBvcnRlZC5cbiAqXG4gKiBBbGwgc3ltYm9sIG5hbWVzIHRoYXQgbWFrZSB1cCB0aGUgdHlwZSByZWZlcmVuY2UgYXJlIHJldHVybmVkIGxlZnQtdG8tcmlnaHQgaW50byB0aGVcbiAqIGBzeW1ib2xOYW1lc2AgYXJyYXksIHdoaWNoIGlzIGd1YXJhbnRlZWQgdG8gaW5jbHVkZSBhdCBsZWFzdCBvbmUgZW50cnkuXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVUeXBlU3ltYm9scyh0eXBlUmVmOiB0cy5UeXBlUmVmZXJlbmNlTm9kZSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOlxuICAgIHtsb2NhbDogdHMuU3ltYm9sLCBkZWNsOiB0cy5TeW1ib2wsIHN5bWJvbE5hbWVzOiBzdHJpbmdbXX18bnVsbCB7XG4gIGNvbnN0IHR5cGVOYW1lID0gdHlwZVJlZi50eXBlTmFtZTtcbiAgLy8gdHlwZVJlZlN5bWJvbCBpcyB0aGUgdHMuU3ltYm9sIG9mIHRoZSBlbnRpcmUgdHlwZSByZWZlcmVuY2UuXG4gIGNvbnN0IHR5cGVSZWZTeW1ib2w6IHRzLlN5bWJvbHx1bmRlZmluZWQgPSBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24odHlwZU5hbWUpO1xuICBpZiAodHlwZVJlZlN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBgbG9jYWxgIGlzIHRoZSBgdHMuU3ltYm9sYCBmb3IgdGhlIGxvY2FsIGB0cy5JZGVudGlmaWVyYCBmb3IgdGhlIHR5cGUuXG4gIC8vIElmIHRoZSB0eXBlIGlzIGFjdHVhbGx5IGxvY2FsbHkgZGVjbGFyZWQgb3IgaXMgaW1wb3J0ZWQgYnkgbmFtZSwgZm9yIGV4YW1wbGU6XG4gIC8vICAgaW1wb3J0IHtGb299IGZyb20gJy4vZm9vJztcbiAgLy8gdGhlbiBpdCdsbCBiZSB0aGUgc2FtZSBhcyBgdHlwZVJlZlN5bWJvbGAuXG4gIC8vXG4gIC8vIElmIHRoZSB0eXBlIGlzIGltcG9ydGVkIHZpYSBhIG5hbWVzcGFjZSBpbXBvcnQsIGZvciBleGFtcGxlOlxuICAvLyAgIGltcG9ydCAqIGFzIGZvbyBmcm9tICcuL2Zvbyc7XG4gIC8vIGFuZCB0aGVuIHJlZmVyZW5jZWQgYXM6XG4gIC8vICAgY29uc3RydWN0b3IoZjogZm9vLkZvbylcbiAgLy8gdGhlbiBgbG9jYWxgIHdpbGwgYmUgdGhlIGB0cy5TeW1ib2xgIG9mIGBmb29gLCB3aGVyZWFzIGB0eXBlUmVmU3ltYm9sYCB3aWxsIGJlIHRoZSBgdHMuU3ltYm9sYFxuICAvLyBvZiBgZm9vLkZvb2AuIFRoaXMgYWxsb3dzIHRyYWNraW5nIG9mIHRoZSBpbXBvcnQgYmVoaW5kIHdoYXRldmVyIHR5cGUgcmVmZXJlbmNlIGV4aXN0cy5cbiAgbGV0IGxvY2FsID0gdHlwZVJlZlN5bWJvbDtcblxuICAvLyBEZXN0cnVjdHVyZSBhIG5hbWUgbGlrZSBgZm9vLlguWS5aYCBhcyBmb2xsb3dzOlxuICAvLyAtIGluIGBsZWZ0TW9zdGAsIHRoZSBgdHMuSWRlbnRpZmllcmAgb2YgdGhlIGxlZnQtbW9zdCBuYW1lIChgZm9vYCkgaW4gdGhlIHF1YWxpZmllZCBuYW1lLlxuICAvLyAgIFRoaXMgaWRlbnRpZmllciBpcyB1c2VkIHRvIHJlc29sdmUgdGhlIGB0cy5TeW1ib2xgIGZvciBgbG9jYWxgLlxuICAvLyAtIGluIGBzeW1ib2xOYW1lc2AsIGFsbCBuYW1lcyBpbnZvbHZlZCBpbiB0aGUgcXVhbGlmaWVkIHBhdGgsIG9yIGEgc2luZ2xlIHN5bWJvbCBuYW1lIGlmIHRoZVxuICAvLyAgIHR5cGUgaXMgbm90IHF1YWxpZmllZC5cbiAgbGV0IGxlZnRNb3N0ID0gdHlwZU5hbWU7XG4gIGNvbnN0IHN5bWJvbE5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICB3aGlsZSAodHMuaXNRdWFsaWZpZWROYW1lKGxlZnRNb3N0KSkge1xuICAgIHN5bWJvbE5hbWVzLnVuc2hpZnQobGVmdE1vc3QucmlnaHQudGV4dCk7XG4gICAgbGVmdE1vc3QgPSBsZWZ0TW9zdC5sZWZ0O1xuICB9XG4gIHN5bWJvbE5hbWVzLnVuc2hpZnQobGVmdE1vc3QudGV4dCk7XG5cbiAgaWYgKGxlZnRNb3N0ICE9PSB0eXBlTmFtZSkge1xuICAgIGNvbnN0IGxvY2FsVG1wID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGxlZnRNb3N0KTtcbiAgICBpZiAobG9jYWxUbXAgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbG9jYWwgPSBsb2NhbFRtcDtcbiAgICB9XG4gIH1cblxuICAvLyBEZS1hbGlhcyB0aGUgdG9wLWxldmVsIHR5cGUgcmVmZXJlbmNlIHN5bWJvbCB0byBnZXQgdGhlIHN5bWJvbCBvZiB0aGUgYWN0dWFsIGRlY2xhcmF0aW9uLlxuICBsZXQgZGVjbCA9IHR5cGVSZWZTeW1ib2w7XG4gIGlmICh0eXBlUmVmU3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICBkZWNsID0gY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHR5cGVSZWZTeW1ib2wpO1xuICB9XG4gIHJldHVybiB7bG9jYWwsIGRlY2wsIHN5bWJvbE5hbWVzfTtcbn1cblxuZnVuY3Rpb24gZW50aXR5TmFtZVRvVmFsdWUobm9kZTogdHMuRW50aXR5TmFtZSk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gIGlmICh0cy5pc1F1YWxpZmllZE5hbWUobm9kZSkpIHtcbiAgICBjb25zdCBsZWZ0ID0gZW50aXR5TmFtZVRvVmFsdWUobm9kZS5sZWZ0KTtcbiAgICByZXR1cm4gbGVmdCAhPT0gbnVsbCA/IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGxlZnQsIG5vZGUucmlnaHQpIDogbnVsbDtcbiAgfSBlbHNlIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkpIHtcbiAgICByZXR1cm4gdHMuZ2V0TXV0YWJsZUNsb25lKG5vZGUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RNb2R1bGVOYW1lKG5vZGU6IHRzLkltcG9ydERlY2xhcmF0aW9uKTogc3RyaW5nIHtcbiAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwobm9kZS5tb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdub3QgYSBtb2R1bGUgc3BlY2lmaWVyJyk7XG4gIH1cbiAgcmV0dXJuIG5vZGUubW9kdWxlU3BlY2lmaWVyLnRleHQ7XG59XG4iXX0=