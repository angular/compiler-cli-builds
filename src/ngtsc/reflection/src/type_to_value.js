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
        define("@angular/compiler-cli/src/ngtsc/reflection/src/type_to_value", ["require", "exports", "tslib", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    exports.DEFAULT_EXPORT_NAME = '*';
    /**
     * Potentially convert a `ts.TypeNode` to a `TypeValueReference`, which indicates how to use the
     * type given in the `ts.TypeNode` in a value position.
     *
     * This can return `null` if the `typeNode` is `null`, if it does not refer to a symbol with a value
     * declaration, or if it is not possible to statically understand.
     */
    function typeToValue(typeNode, checker) {
        // It's not possible to get a value expression if the parameter doesn't even have a type.
        if (typeNode === null || !ts.isTypeReferenceNode(typeNode)) {
            return null;
        }
        var symbols = resolveTypeSymbols(typeNode, checker);
        if (symbols === null) {
            return null;
        }
        var local = symbols.local, decl = symbols.decl;
        // It's only valid to convert a type reference to a value reference if the type actually
        // has a value declaration associated with it.
        if (decl.valueDeclaration === undefined) {
            return null;
        }
        // The type points to a valid value declaration. Rewrite the TypeReference into an
        // Expression which references the value pointed to by the TypeReference, if possible.
        // Look at the local `ts.Symbol`'s declarations and see if it comes from an import
        // statement. If so, extract the module specifier and the name of the imported type.
        var firstDecl = local.declarations && local.declarations[0];
        if (firstDecl && isImportSource(firstDecl)) {
            var origin_1 = extractModuleAndNameFromImport(firstDecl, symbols.importName);
            return tslib_1.__assign({ local: false, valueDeclaration: decl.valueDeclaration }, origin_1);
        }
        else {
            var expression = typeNodeToValueExpr(typeNode);
            if (expression !== null) {
                return {
                    local: true,
                    expression: expression,
                };
            }
            else {
                return null;
            }
        }
    }
    exports.typeToValue = typeToValue;
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
     * `ts.Symbol` of the referenced symbol. `local` will be the `ts.Symbol` of the `ts.Identifer` which
     * points to the import statement by which the symbol was imported.
     *
     * In the event `typeRef` refers to a default import, an `importName` will also be returned to
     * give the identifier name within the current file by which the import is known.
     */
    function resolveTypeSymbols(typeRef, checker) {
        var typeName = typeRef.typeName;
        // typeRefSymbol is the ts.Symbol of the entire type reference.
        var typeRefSymbol = checker.getSymbolAtLocation(typeName);
        if (typeRefSymbol === undefined) {
            return null;
        }
        // local is the ts.Symbol for the local ts.Identifier for the type.
        // If the type is actually locally declared or is imported by name, for example:
        //   import {Foo} from './foo';
        // then it'll be the same as top. If the type is imported via a namespace import, for example:
        //   import * as foo from './foo';
        // and then referenced as:
        //   constructor(f: foo.Foo)
        // then local will be the ts.Symbol of `foo`, whereas top will be the ts.Symbol of `foo.Foo`.
        // This allows tracking of the import behind whatever type reference exists.
        var local = typeRefSymbol;
        var importName = null;
        // TODO(alxhub): this is technically not correct. The user could have any import type with any
        // amount of qualification following the imported type:
        //
        // import * as foo from 'foo'
        // constructor(inject: foo.X.Y.Z)
        //
        // What we really want is the ability to express the arbitrary operation of `.X.Y.Z` on top of
        // whatever import we generate for 'foo'. This logic is sufficient for now, though.
        if (ts.isQualifiedName(typeName) && ts.isIdentifier(typeName.left) &&
            ts.isIdentifier(typeName.right)) {
            var localTmp = checker.getSymbolAtLocation(typeName.left);
            if (localTmp !== undefined) {
                local = localTmp;
                importName = typeName.right.text;
            }
        }
        // De-alias the top-level type reference symbol to get the symbol of the actual declaration.
        var decl = typeRefSymbol;
        if (typeRefSymbol.flags & ts.SymbolFlags.Alias) {
            decl = checker.getAliasedSymbol(typeRefSymbol);
        }
        return { local: local, decl: decl, importName: importName };
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
    function isImportSource(node) {
        return ts.isImportSpecifier(node) || ts.isNamespaceImport(node) || ts.isImportClause(node);
    }
    function extractModuleAndNameFromImport(node, localName) {
        var name;
        var moduleSpecifier;
        switch (node.kind) {
            case ts.SyntaxKind.ImportSpecifier:
                // The symbol was imported by name, in a ts.ImportSpecifier.
                name = (node.propertyName || node.name).text;
                moduleSpecifier = node.parent.parent.parent.moduleSpecifier;
                break;
            case ts.SyntaxKind.NamespaceImport:
                // The symbol was imported via a namespace import. In this case, the name to use when
                // importing it was extracted by resolveTypeSymbols.
                if (localName === null) {
                    // resolveTypeSymbols() should have extracted the correct local name for the import.
                    throw new Error("Debug failure: no local name provided for NamespaceImport");
                }
                name = localName;
                moduleSpecifier = node.parent.parent.moduleSpecifier;
                break;
            case ts.SyntaxKind.ImportClause:
                name = exports.DEFAULT_EXPORT_NAME;
                moduleSpecifier = node.parent.moduleSpecifier;
                break;
            default:
                throw new Error("Unreachable: " + ts.SyntaxKind[node.kind]);
        }
        if (!ts.isStringLiteral(moduleSpecifier)) {
            throw new Error('not a module specifier');
        }
        var moduleName = moduleSpecifier.text;
        return { moduleName: moduleName, name: name };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV90b192YWx1ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbi9zcmMvdHlwZV90b192YWx1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFJcEIsUUFBQSxtQkFBbUIsR0FBRyxHQUFHLENBQUM7SUFFdkM7Ozs7OztPQU1HO0lBQ0gsU0FBZ0IsV0FBVyxDQUN2QixRQUE0QixFQUFFLE9BQXVCO1FBQ3ZELHlGQUF5RjtRQUN6RixJQUFJLFFBQVEsS0FBSyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDMUQsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELElBQU0sT0FBTyxHQUFHLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RCxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7WUFDcEIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVNLElBQUEscUJBQUssRUFBRSxtQkFBSSxDQUFZO1FBQzlCLHdGQUF3RjtRQUN4Riw4Q0FBOEM7UUFDOUMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFO1lBQ3ZDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxrRkFBa0Y7UUFDbEYsc0ZBQXNGO1FBRXRGLGtGQUFrRjtRQUNsRixvRkFBb0Y7UUFDcEYsSUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFlBQVksSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlELElBQUksU0FBUyxJQUFJLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUMxQyxJQUFNLFFBQU0sR0FBRyw4QkFBOEIsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxD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LFVBQVUsQ0FBQyxZQUFZO2dCQUM3QixJQUFJLEdBQUcsMkJBQW1CLENBQUM7Z0JBQzNCLGVBQWUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztnQkFDOUMsTUFBTTtZQUNSO2dCQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWdCLEVBQUUsQ0FBQyxVQUFVLENBQUUsSUFBZ0IsQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDO1NBQzVFO1FBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDeEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1NBQzNDO1FBQ0QsSUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQztRQUN4QyxPQUFPLEVBQUMsVUFBVSxZQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUMsQ0FBQztJQUM1QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtUeXBlVmFsdWVSZWZlcmVuY2V9IGZyb20gJy4vaG9zdCc7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX0VYUE9SVF9OQU1FID0gJyonO1xuXG4vKipcbiAqIFBvdGVudGlhbGx5IGNvbnZlcnQgYSBgdHMuVHlwZU5vZGVgIHRvIGEgYFR5cGVWYWx1ZVJlZmVyZW5jZWAsIHdoaWNoIGluZGljYXRlcyBob3cgdG8gdXNlIHRoZVxuICogdHlwZSBnaXZlbiBpbiB0aGUgYHRzLlR5cGVOb2RlYCBpbiBhIHZhbHVlIHBvc2l0aW9uLlxuICpcbiAqIFRoaXMgY2FuIHJldHVybiBgbnVsbGAgaWYgdGhlIGB0eXBlTm9kZWAgaXMgYG51bGxgLCBpZiBpdCBkb2VzIG5vdCByZWZlciB0byBhIHN5bWJvbCB3aXRoIGEgdmFsdWVcbiAqIGRlY2xhcmF0aW9uLCBvciBpZiBpdCBpcyBub3QgcG9zc2libGUgdG8gc3RhdGljYWxseSB1bmRlcnN0YW5kLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZVRvVmFsdWUoXG4gICAgdHlwZU5vZGU6IHRzLlR5cGVOb2RlIHwgbnVsbCwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiBUeXBlVmFsdWVSZWZlcmVuY2V8bnVsbCB7XG4gIC8vIEl0J3Mgbm90IHBvc3NpYmxlIHRvIGdldCBhIHZhbHVlIGV4cHJlc3Npb24gaWYgdGhlIHBhcmFtZXRlciBkb2Vzbid0IGV2ZW4gaGF2ZSBhIHR5cGUuXG4gIGlmICh0eXBlTm9kZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlTm9kZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IHN5bWJvbHMgPSByZXNvbHZlVHlwZVN5bWJvbHModHlwZU5vZGUsIGNoZWNrZXIpO1xuICBpZiAoc3ltYm9scyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3Qge2xvY2FsLCBkZWNsfSA9IHN5bWJvbHM7XG4gIC8vIEl0J3Mgb25seSB2YWxpZCB0byBjb252ZXJ0IGEgdHlwZSByZWZlcmVuY2UgdG8gYSB2YWx1ZSByZWZlcmVuY2UgaWYgdGhlIHR5cGUgYWN0dWFsbHlcbiAgLy8gaGFzIGEgdmFsdWUgZGVjbGFyYXRpb24gYXNzb2NpYXRlZCB3aXRoIGl0LlxuICBpZiAoZGVjbC52YWx1ZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFRoZSB0eXBlIHBvaW50cyB0byBhIHZhbGlkIHZhbHVlIGRlY2xhcmF0aW9uLiBSZXdyaXRlIHRoZSBUeXBlUmVmZXJlbmNlIGludG8gYW5cbiAgLy8gRXhwcmVzc2lvbiB3aGljaCByZWZlcmVuY2VzIHRoZSB2YWx1ZSBwb2ludGVkIHRvIGJ5IHRoZSBUeXBlUmVmZXJlbmNlLCBpZiBwb3NzaWJsZS5cblxuICAvLyBMb29rIGF0IHRoZSBsb2NhbCBgdHMuU3ltYm9sYCdzIGRlY2xhcmF0aW9ucyBhbmQgc2VlIGlmIGl0IGNvbWVzIGZyb20gYW4gaW1wb3J0XG4gIC8vIHN0YXRlbWVudC4gSWYgc28sIGV4dHJhY3QgdGhlIG1vZHVsZSBzcGVjaWZpZXIgYW5kIHRoZSBuYW1lIG9mIHRoZSBpbXBvcnRlZCB0eXBlLlxuICBjb25zdCBmaXJzdERlY2wgPSBsb2NhbC5kZWNsYXJhdGlvbnMgJiYgbG9jYWwuZGVjbGFyYXRpb25zWzBdO1xuXG4gIGlmIChmaXJzdERlY2wgJiYgaXNJbXBvcnRTb3VyY2UoZmlyc3REZWNsKSkge1xuICAgIGNvbnN0IG9yaWdpbiA9IGV4dHJhY3RNb2R1bGVBbmROYW1lRnJvbUltcG9ydChmaXJzdERlY2wsIHN5bWJvbHMuaW1wb3J0TmFtZSk7XG4gICAgcmV0dXJuIHtsb2NhbDogZmFsc2UsIHZhbHVlRGVjbGFyYXRpb246IGRlY2wudmFsdWVEZWNsYXJhdGlvbiwgLi4ub3JpZ2lufTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBleHByZXNzaW9uID0gdHlwZU5vZGVUb1ZhbHVlRXhwcih0eXBlTm9kZSk7XG4gICAgaWYgKGV4cHJlc3Npb24gIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxvY2FsOiB0cnVlLFxuICAgICAgICBleHByZXNzaW9uLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQXR0ZW1wdCB0byBleHRyYWN0IGEgYHRzLkV4cHJlc3Npb25gIHRoYXQncyBlcXVpdmFsZW50IHRvIGEgYHRzLlR5cGVOb2RlYCwgYXMgdGhlIHR3byBoYXZlXG4gKiBkaWZmZXJlbnQgQVNUIHNoYXBlcyBidXQgY2FuIHJlZmVyZW5jZSB0aGUgc2FtZSBzeW1ib2xzLlxuICpcbiAqIFRoaXMgd2lsbCByZXR1cm4gYG51bGxgIGlmIGFuIGVxdWl2YWxlbnQgZXhwcmVzc2lvbiBjYW5ub3QgYmUgY29uc3RydWN0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0eXBlTm9kZVRvVmFsdWVFeHByKG5vZGU6IHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUobm9kZSkpIHtcbiAgICByZXR1cm4gZW50aXR5TmFtZVRvVmFsdWUobm9kZS50eXBlTmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgYFR5cGVSZWZlcmVuY2VgIG5vZGUgdG8gdGhlIGB0cy5TeW1ib2xgcyBmb3IgYm90aCBpdHMgZGVjbGFyYXRpb24gYW5kIGl0cyBsb2NhbCBzb3VyY2UuXG4gKlxuICogSW4gdGhlIGV2ZW50IHRoYXQgdGhlIGBUeXBlUmVmZXJlbmNlYCByZWZlcnMgdG8gYSBsb2NhbGx5IGRlY2xhcmVkIHN5bWJvbCwgdGhlc2Ugd2lsbCBiZSB0aGVcbiAqIHNhbWUuIElmIHRoZSBgVHlwZVJlZmVyZW5jZWAgcmVmZXJzIHRvIGFuIGltcG9ydGVkIHN5bWJvbCwgdGhlbiBgZGVjbGAgd2lsbCBiZSB0aGUgZnVsbHkgcmVzb2x2ZWRcbiAqIGB0cy5TeW1ib2xgIG9mIHRoZSByZWZlcmVuY2VkIHN5bWJvbC4gYGxvY2FsYCB3aWxsIGJlIHRoZSBgdHMuU3ltYm9sYCBvZiB0aGUgYHRzLklkZW50aWZlcmAgd2hpY2hcbiAqIHBvaW50cyB0byB0aGUgaW1wb3J0IHN0YXRlbWVudCBieSB3aGljaCB0aGUgc3ltYm9sIHdhcyBpbXBvcnRlZC5cbiAqXG4gKiBJbiB0aGUgZXZlbnQgYHR5cGVSZWZgIHJlZmVycyB0byBhIGRlZmF1bHQgaW1wb3J0LCBhbiBgaW1wb3J0TmFtZWAgd2lsbCBhbHNvIGJlIHJldHVybmVkIHRvXG4gKiBnaXZlIHRoZSBpZGVudGlmaWVyIG5hbWUgd2l0aGluIHRoZSBjdXJyZW50IGZpbGUgYnkgd2hpY2ggdGhlIGltcG9ydCBpcyBrbm93bi5cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVR5cGVTeW1ib2xzKHR5cGVSZWY6IHRzLlR5cGVSZWZlcmVuY2VOb2RlLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6XG4gICAge2xvY2FsOiB0cy5TeW1ib2wsIGRlY2w6IHRzLlN5bWJvbCwgaW1wb3J0TmFtZTogc3RyaW5nIHwgbnVsbH18bnVsbCB7XG4gIGNvbnN0IHR5cGVOYW1lID0gdHlwZVJlZi50eXBlTmFtZTtcbiAgLy8gdHlwZVJlZlN5bWJvbCBpcyB0aGUgdHMuU3ltYm9sIG9mIHRoZSBlbnRpcmUgdHlwZSByZWZlcmVuY2UuXG4gIGNvbnN0IHR5cGVSZWZTeW1ib2w6IHRzLlN5bWJvbHx1bmRlZmluZWQgPSBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24odHlwZU5hbWUpO1xuICBpZiAodHlwZVJlZlN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBsb2NhbCBpcyB0aGUgdHMuU3ltYm9sIGZvciB0aGUgbG9jYWwgdHMuSWRlbnRpZmllciBmb3IgdGhlIHR5cGUuXG4gIC8vIElmIHRoZSB0eXBlIGlzIGFjdHVhbGx5IGxvY2FsbHkgZGVjbGFyZWQgb3IgaXMgaW1wb3J0ZWQgYnkgbmFtZSwgZm9yIGV4YW1wbGU6XG4gIC8vICAgaW1wb3J0IHtGb299IGZyb20gJy4vZm9vJztcbiAgLy8gdGhlbiBpdCdsbCBiZSB0aGUgc2FtZSBhcyB0b3AuIElmIHRoZSB0eXBlIGlzIGltcG9ydGVkIHZpYSBhIG5hbWVzcGFjZSBpbXBvcnQsIGZvciBleGFtcGxlOlxuICAvLyAgIGltcG9ydCAqIGFzIGZvbyBmcm9tICcuL2Zvbyc7XG4gIC8vIGFuZCB0aGVuIHJlZmVyZW5jZWQgYXM6XG4gIC8vICAgY29uc3RydWN0b3IoZjogZm9vLkZvbylcbiAgLy8gdGhlbiBsb2NhbCB3aWxsIGJlIHRoZSB0cy5TeW1ib2wgb2YgYGZvb2AsIHdoZXJlYXMgdG9wIHdpbGwgYmUgdGhlIHRzLlN5bWJvbCBvZiBgZm9vLkZvb2AuXG4gIC8vIFRoaXMgYWxsb3dzIHRyYWNraW5nIG9mIHRoZSBpbXBvcnQgYmVoaW5kIHdoYXRldmVyIHR5cGUgcmVmZXJlbmNlIGV4aXN0cy5cbiAgbGV0IGxvY2FsID0gdHlwZVJlZlN5bWJvbDtcbiAgbGV0IGltcG9ydE5hbWU6IHN0cmluZ3xudWxsID0gbnVsbDtcblxuICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgaXMgdGVjaG5pY2FsbHkgbm90IGNvcnJlY3QuIFRoZSB1c2VyIGNvdWxkIGhhdmUgYW55IGltcG9ydCB0eXBlIHdpdGggYW55XG4gIC8vIGFtb3VudCBvZiBxdWFsaWZpY2F0aW9uIGZvbGxvd2luZyB0aGUgaW1wb3J0ZWQgdHlwZTpcbiAgLy9cbiAgLy8gaW1wb3J0ICogYXMgZm9vIGZyb20gJ2ZvbydcbiAgLy8gY29uc3RydWN0b3IoaW5qZWN0OiBmb28uWC5ZLlopXG4gIC8vXG4gIC8vIFdoYXQgd2UgcmVhbGx5IHdhbnQgaXMgdGhlIGFiaWxpdHkgdG8gZXhwcmVzcyB0aGUgYXJiaXRyYXJ5IG9wZXJhdGlvbiBvZiBgLlguWS5aYCBvbiB0b3Agb2ZcbiAgLy8gd2hhdGV2ZXIgaW1wb3J0IHdlIGdlbmVyYXRlIGZvciAnZm9vJy4gVGhpcyBsb2dpYyBpcyBzdWZmaWNpZW50IGZvciBub3csIHRob3VnaC5cbiAgaWYgKHRzLmlzUXVhbGlmaWVkTmFtZSh0eXBlTmFtZSkgJiYgdHMuaXNJZGVudGlmaWVyKHR5cGVOYW1lLmxlZnQpICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIodHlwZU5hbWUucmlnaHQpKSB7XG4gICAgY29uc3QgbG9jYWxUbXAgPSBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24odHlwZU5hbWUubGVmdCk7XG4gICAgaWYgKGxvY2FsVG1wICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGxvY2FsID0gbG9jYWxUbXA7XG4gICAgICBpbXBvcnROYW1lID0gdHlwZU5hbWUucmlnaHQudGV4dDtcbiAgICB9XG4gIH1cblxuICAvLyBEZS1hbGlhcyB0aGUgdG9wLWxldmVsIHR5cGUgcmVmZXJlbmNlIHN5bWJvbCB0byBnZXQgdGhlIHN5bWJvbCBvZiB0aGUgYWN0dWFsIGRlY2xhcmF0aW9uLlxuICBsZXQgZGVjbCA9IHR5cGVSZWZTeW1ib2w7XG4gIGlmICh0eXBlUmVmU3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICBkZWNsID0gY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHR5cGVSZWZTeW1ib2wpO1xuICB9XG4gIHJldHVybiB7bG9jYWwsIGRlY2wsIGltcG9ydE5hbWV9O1xufVxuXG5mdW5jdGlvbiBlbnRpdHlOYW1lVG9WYWx1ZShub2RlOiB0cy5FbnRpdHlOYW1lKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKHRzLmlzUXVhbGlmaWVkTmFtZShub2RlKSkge1xuICAgIGNvbnN0IGxlZnQgPSBlbnRpdHlOYW1lVG9WYWx1ZShub2RlLmxlZnQpO1xuICAgIHJldHVybiBsZWZ0ICE9PSBudWxsID8gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MobGVmdCwgbm9kZS5yaWdodCkgOiBudWxsO1xuICB9IGVsc2UgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlKSkge1xuICAgIHJldHVybiB0cy5nZXRNdXRhYmxlQ2xvbmUobm9kZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNJbXBvcnRTb3VyY2Uobm9kZTogdHMuRGVjbGFyYXRpb24pOiBub2RlIGlzKFxuICAgIHRzLkltcG9ydFNwZWNpZmllciB8IHRzLk5hbWVzcGFjZUltcG9ydCB8IHRzLkltcG9ydENsYXVzZSkge1xuICByZXR1cm4gdHMuaXNJbXBvcnRTcGVjaWZpZXIobm9kZSkgfHwgdHMuaXNOYW1lc3BhY2VJbXBvcnQobm9kZSkgfHwgdHMuaXNJbXBvcnRDbGF1c2Uobm9kZSk7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RNb2R1bGVBbmROYW1lRnJvbUltcG9ydChcbiAgICBub2RlOiB0cy5JbXBvcnRTcGVjaWZpZXIgfCB0cy5OYW1lc3BhY2VJbXBvcnQgfCB0cy5JbXBvcnRDbGF1c2UsXG4gICAgbG9jYWxOYW1lOiBzdHJpbmcgfCBudWxsKToge25hbWU6IHN0cmluZywgbW9kdWxlTmFtZTogc3RyaW5nfSB7XG4gIGxldCBuYW1lOiBzdHJpbmc7XG4gIGxldCBtb2R1bGVTcGVjaWZpZXI6IHRzLkV4cHJlc3Npb247XG4gIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkltcG9ydFNwZWNpZmllcjpcbiAgICAgIC8vIFRoZSBzeW1ib2wgd2FzIGltcG9ydGVkIGJ5IG5hbWUsIGluIGEgdHMuSW1wb3J0U3BlY2lmaWVyLlxuICAgICAgbmFtZSA9IChub2RlLnByb3BlcnR5TmFtZSB8fCBub2RlLm5hbWUpLnRleHQ7XG4gICAgICBtb2R1bGVTcGVjaWZpZXIgPSBub2RlLnBhcmVudC5wYXJlbnQucGFyZW50Lm1vZHVsZVNwZWNpZmllcjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5OYW1lc3BhY2VJbXBvcnQ6XG4gICAgICAvLyBUaGUgc3ltYm9sIHdhcyBpbXBvcnRlZCB2aWEgYSBuYW1lc3BhY2UgaW1wb3J0LiBJbiB0aGlzIGNhc2UsIHRoZSBuYW1lIHRvIHVzZSB3aGVuXG4gICAgICAvLyBpbXBvcnRpbmcgaXQgd2FzIGV4dHJhY3RlZCBieSByZXNvbHZlVHlwZVN5bWJvbHMuXG4gICAgICBpZiAobG9jYWxOYW1lID09PSBudWxsKSB7XG4gICAgICAgIC8vIHJlc29sdmVUeXBlU3ltYm9scygpIHNob3VsZCBoYXZlIGV4dHJhY3RlZCB0aGUgY29ycmVjdCBsb2NhbCBuYW1lIGZvciB0aGUgaW1wb3J0LlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERlYnVnIGZhaWx1cmU6IG5vIGxvY2FsIG5hbWUgcHJvdmlkZWQgZm9yIE5hbWVzcGFjZUltcG9ydGApO1xuICAgICAgfVxuICAgICAgbmFtZSA9IGxvY2FsTmFtZTtcbiAgICAgIG1vZHVsZVNwZWNpZmllciA9IG5vZGUucGFyZW50LnBhcmVudC5tb2R1bGVTcGVjaWZpZXI7XG4gICAgICBicmVhaztcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuSW1wb3J0Q2xhdXNlOlxuICAgICAgbmFtZSA9IERFRkFVTFRfRVhQT1JUX05BTUU7XG4gICAgICBtb2R1bGVTcGVjaWZpZXIgPSBub2RlLnBhcmVudC5tb2R1bGVTcGVjaWZpZXI7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlYWNoYWJsZTogJHt0cy5TeW50YXhLaW5kWyhub2RlIGFzIHRzLk5vZGUpLmtpbmRdfWApO1xuICB9XG5cbiAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwobW9kdWxlU3BlY2lmaWVyKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignbm90IGEgbW9kdWxlIHNwZWNpZmllcicpO1xuICB9XG4gIGNvbnN0IG1vZHVsZU5hbWUgPSBtb2R1bGVTcGVjaWZpZXIudGV4dDtcbiAgcmV0dXJuIHttb2R1bGVOYW1lLCBuYW1lfTtcbn1cbiJdfQ==