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
        if (firstDecl && ts.isImportClause(firstDecl) && firstDecl.name !== undefined) {
            // This is a default import.
            return {
                local: true,
                // Copying the name here ensures the generated references will be correctly transformed along
                // with the import.
                expression: ts.updateIdentifier(firstDecl.name),
                defaultImportStatement: firstDecl.parent,
            };
        }
        else if (firstDecl && isImportSource(firstDecl)) {
            var origin_1 = extractModuleAndNameFromImport(firstDecl, symbols.importName);
            return tslib_1.__assign({ local: false, valueDeclaration: decl.valueDeclaration }, origin_1);
        }
        else {
            var expression = typeNodeToValueExpr(typeNode);
            if (expression !== null) {
                return {
                    local: true,
                    expression: expression,
                    defaultImportStatement: null,
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
        return ts.isImportSpecifier(node) || ts.isNamespaceImport(node);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV90b192YWx1ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbi9zcmMvdHlwZV90b192YWx1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFJakM7Ozs7OztPQU1HO0lBQ0gsU0FBZ0IsV0FBVyxDQUN2QixRQUEwQixFQUFFLE9BQXVCO1FBQ3JELHlGQUF5RjtRQUN6RixJQUFJLFFBQVEsS0FBSyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDMUQsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELElBQU0sT0FBTyxHQUFHLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RCxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7WUFDcEIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVNLElBQUEscUJBQUssRUFBRSxtQkFBSSxDQUFZO1FBQzlCLHdGQUF3RjtRQUN4Riw4Q0FBOEM7UUFDOUMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFO1lBQ3ZDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxrRkFBa0Y7UUFDbEYsc0ZBQXNGO1FBRXRGLGtGQUFrRjtRQUNsRixvRkFBb0Y7UUFDcEYsSUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFlBQVksSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlELElBQUksU0FBUyxJQUFJLEVBQUUsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7WUFDN0UsNEJBQTRCO1lBQzVCLE9BQU87Z0JBQ0wsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsNkZBQTZG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Q3JGLG9EQUFvRDtnQkFDcEQsSUFBSSxTQUFTLEtBQUssSUFBSSxFQUFFO29CQUN0QixvRkFBb0Y7b0JBQ3BGLE1BQU0sSUFBSSxLQUFLLENBQUMsMkRBQTJELENBQUMsQ0FBQztpQkFDOUU7Z0JBQ0QsSUFBSSxHQUFHLFNBQVMsQ0FBQztnQkFDakIsZUFBZSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztnQkFDckQsTUFBTTtZQUNSO2dCQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWdCLEVBQUUsQ0FBQyxVQUFVLENBQUUsSUFBZ0IsQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDO1NBQzVFO1FBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDeEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1NBQzNDO1FBQ0QsSUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQztRQUN4QyxPQUFPLEVBQUMsVUFBVSxZQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUMsQ0FBQztJQUM1QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtUeXBlVmFsdWVSZWZlcmVuY2V9IGZyb20gJy4vaG9zdCc7XG5cbi8qKlxuICogUG90ZW50aWFsbHkgY29udmVydCBhIGB0cy5UeXBlTm9kZWAgdG8gYSBgVHlwZVZhbHVlUmVmZXJlbmNlYCwgd2hpY2ggaW5kaWNhdGVzIGhvdyB0byB1c2UgdGhlXG4gKiB0eXBlIGdpdmVuIGluIHRoZSBgdHMuVHlwZU5vZGVgIGluIGEgdmFsdWUgcG9zaXRpb24uXG4gKlxuICogVGhpcyBjYW4gcmV0dXJuIGBudWxsYCBpZiB0aGUgYHR5cGVOb2RlYCBpcyBgbnVsbGAsIGlmIGl0IGRvZXMgbm90IHJlZmVyIHRvIGEgc3ltYm9sIHdpdGggYSB2YWx1ZVxuICogZGVjbGFyYXRpb24sIG9yIGlmIGl0IGlzIG5vdCBwb3NzaWJsZSB0byBzdGF0aWNhbGx5IHVuZGVyc3RhbmQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0eXBlVG9WYWx1ZShcbiAgICB0eXBlTm9kZTogdHMuVHlwZU5vZGV8bnVsbCwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiBUeXBlVmFsdWVSZWZlcmVuY2V8bnVsbCB7XG4gIC8vIEl0J3Mgbm90IHBvc3NpYmxlIHRvIGdldCBhIHZhbHVlIGV4cHJlc3Npb24gaWYgdGhlIHBhcmFtZXRlciBkb2Vzbid0IGV2ZW4gaGF2ZSBhIHR5cGUuXG4gIGlmICh0eXBlTm9kZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlTm9kZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IHN5bWJvbHMgPSByZXNvbHZlVHlwZVN5bWJvbHModHlwZU5vZGUsIGNoZWNrZXIpO1xuICBpZiAoc3ltYm9scyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3Qge2xvY2FsLCBkZWNsfSA9IHN5bWJvbHM7XG4gIC8vIEl0J3Mgb25seSB2YWxpZCB0byBjb252ZXJ0IGEgdHlwZSByZWZlcmVuY2UgdG8gYSB2YWx1ZSByZWZlcmVuY2UgaWYgdGhlIHR5cGUgYWN0dWFsbHlcbiAgLy8gaGFzIGEgdmFsdWUgZGVjbGFyYXRpb24gYXNzb2NpYXRlZCB3aXRoIGl0LlxuICBpZiAoZGVjbC52YWx1ZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFRoZSB0eXBlIHBvaW50cyB0byBhIHZhbGlkIHZhbHVlIGRlY2xhcmF0aW9uLiBSZXdyaXRlIHRoZSBUeXBlUmVmZXJlbmNlIGludG8gYW5cbiAgLy8gRXhwcmVzc2lvbiB3aGljaCByZWZlcmVuY2VzIHRoZSB2YWx1ZSBwb2ludGVkIHRvIGJ5IHRoZSBUeXBlUmVmZXJlbmNlLCBpZiBwb3NzaWJsZS5cblxuICAvLyBMb29rIGF0IHRoZSBsb2NhbCBgdHMuU3ltYm9sYCdzIGRlY2xhcmF0aW9ucyBhbmQgc2VlIGlmIGl0IGNvbWVzIGZyb20gYW4gaW1wb3J0XG4gIC8vIHN0YXRlbWVudC4gSWYgc28sIGV4dHJhY3QgdGhlIG1vZHVsZSBzcGVjaWZpZXIgYW5kIHRoZSBuYW1lIG9mIHRoZSBpbXBvcnRlZCB0eXBlLlxuICBjb25zdCBmaXJzdERlY2wgPSBsb2NhbC5kZWNsYXJhdGlvbnMgJiYgbG9jYWwuZGVjbGFyYXRpb25zWzBdO1xuXG4gIGlmIChmaXJzdERlY2wgJiYgdHMuaXNJbXBvcnRDbGF1c2UoZmlyc3REZWNsKSAmJiBmaXJzdERlY2wubmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gVGhpcyBpcyBhIGRlZmF1bHQgaW1wb3J0LlxuICAgIHJldHVybiB7XG4gICAgICBsb2NhbDogdHJ1ZSxcbiAgICAgIC8vIENvcHlpbmcgdGhlIG5hbWUgaGVyZSBlbnN1cmVzIHRoZSBnZW5lcmF0ZWQgcmVmZXJlbmNlcyB3aWxsIGJlIGNvcnJlY3RseSB0cmFuc2Zvcm1lZCBhbG9uZ1xuICAgICAgLy8gd2l0aCB0aGUgaW1wb3J0LlxuICAgICAgZXhwcmVzc2lvbjogdHMudXBkYXRlSWRlbnRpZmllcihmaXJzdERlY2wubmFtZSksXG4gICAgICBkZWZhdWx0SW1wb3J0U3RhdGVtZW50OiBmaXJzdERlY2wucGFyZW50LFxuICAgIH07XG4gIH0gZWxzZSBpZiAoZmlyc3REZWNsICYmIGlzSW1wb3J0U291cmNlKGZpcnN0RGVjbCkpIHtcbiAgICBjb25zdCBvcmlnaW4gPSBleHRyYWN0TW9kdWxlQW5kTmFtZUZyb21JbXBvcnQoZmlyc3REZWNsLCBzeW1ib2xzLmltcG9ydE5hbWUpO1xuICAgIHJldHVybiB7bG9jYWw6IGZhbHNlLCB2YWx1ZURlY2xhcmF0aW9uOiBkZWNsLnZhbHVlRGVjbGFyYXRpb24sIC4uLm9yaWdpbn07XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZXhwcmVzc2lvbiA9IHR5cGVOb2RlVG9WYWx1ZUV4cHIodHlwZU5vZGUpO1xuICAgIGlmIChleHByZXNzaW9uICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsb2NhbDogdHJ1ZSxcbiAgICAgICAgZXhwcmVzc2lvbixcbiAgICAgICAgZGVmYXVsdEltcG9ydFN0YXRlbWVudDogbnVsbCxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEF0dGVtcHQgdG8gZXh0cmFjdCBhIGB0cy5FeHByZXNzaW9uYCB0aGF0J3MgZXF1aXZhbGVudCB0byBhIGB0cy5UeXBlTm9kZWAsIGFzIHRoZSB0d28gaGF2ZVxuICogZGlmZmVyZW50IEFTVCBzaGFwZXMgYnV0IGNhbiByZWZlcmVuY2UgdGhlIHNhbWUgc3ltYm9scy5cbiAqXG4gKiBUaGlzIHdpbGwgcmV0dXJuIGBudWxsYCBpZiBhbiBlcXVpdmFsZW50IGV4cHJlc3Npb24gY2Fubm90IGJlIGNvbnN0cnVjdGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZU5vZGVUb1ZhbHVlRXhwcihub2RlOiB0cy5UeXBlTm9kZSk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gIGlmICh0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKG5vZGUpKSB7XG4gICAgcmV0dXJuIGVudGl0eU5hbWVUb1ZhbHVlKG5vZGUudHlwZU5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogUmVzb2x2ZSBhIGBUeXBlUmVmZXJlbmNlYCBub2RlIHRvIHRoZSBgdHMuU3ltYm9sYHMgZm9yIGJvdGggaXRzIGRlY2xhcmF0aW9uIGFuZCBpdHMgbG9jYWwgc291cmNlLlxuICpcbiAqIEluIHRoZSBldmVudCB0aGF0IHRoZSBgVHlwZVJlZmVyZW5jZWAgcmVmZXJzIHRvIGEgbG9jYWxseSBkZWNsYXJlZCBzeW1ib2wsIHRoZXNlIHdpbGwgYmUgdGhlXG4gKiBzYW1lLiBJZiB0aGUgYFR5cGVSZWZlcmVuY2VgIHJlZmVycyB0byBhbiBpbXBvcnRlZCBzeW1ib2wsIHRoZW4gYGRlY2xgIHdpbGwgYmUgdGhlIGZ1bGx5IHJlc29sdmVkXG4gKiBgdHMuU3ltYm9sYCBvZiB0aGUgcmVmZXJlbmNlZCBzeW1ib2wuIGBsb2NhbGAgd2lsbCBiZSB0aGUgYHRzLlN5bWJvbGAgb2YgdGhlIGB0cy5JZGVudGlmZXJgIHdoaWNoXG4gKiBwb2ludHMgdG8gdGhlIGltcG9ydCBzdGF0ZW1lbnQgYnkgd2hpY2ggdGhlIHN5bWJvbCB3YXMgaW1wb3J0ZWQuXG4gKlxuICogSW4gdGhlIGV2ZW50IGB0eXBlUmVmYCByZWZlcnMgdG8gYSBkZWZhdWx0IGltcG9ydCwgYW4gYGltcG9ydE5hbWVgIHdpbGwgYWxzbyBiZSByZXR1cm5lZCB0b1xuICogZ2l2ZSB0aGUgaWRlbnRpZmllciBuYW1lIHdpdGhpbiB0aGUgY3VycmVudCBmaWxlIGJ5IHdoaWNoIHRoZSBpbXBvcnQgaXMga25vd24uXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVUeXBlU3ltYm9scyh0eXBlUmVmOiB0cy5UeXBlUmVmZXJlbmNlTm9kZSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOlxuICAgIHtsb2NhbDogdHMuU3ltYm9sLCBkZWNsOiB0cy5TeW1ib2wsIGltcG9ydE5hbWU6IHN0cmluZ3xudWxsfXxudWxsIHtcbiAgY29uc3QgdHlwZU5hbWUgPSB0eXBlUmVmLnR5cGVOYW1lO1xuICAvLyB0eXBlUmVmU3ltYm9sIGlzIHRoZSB0cy5TeW1ib2wgb2YgdGhlIGVudGlyZSB0eXBlIHJlZmVyZW5jZS5cbiAgY29uc3QgdHlwZVJlZlN5bWJvbDogdHMuU3ltYm9sfHVuZGVmaW5lZCA9IGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbih0eXBlTmFtZSk7XG4gIGlmICh0eXBlUmVmU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIGxvY2FsIGlzIHRoZSB0cy5TeW1ib2wgZm9yIHRoZSBsb2NhbCB0cy5JZGVudGlmaWVyIGZvciB0aGUgdHlwZS5cbiAgLy8gSWYgdGhlIHR5cGUgaXMgYWN0dWFsbHkgbG9jYWxseSBkZWNsYXJlZCBvciBpcyBpbXBvcnRlZCBieSBuYW1lLCBmb3IgZXhhbXBsZTpcbiAgLy8gICBpbXBvcnQge0Zvb30gZnJvbSAnLi9mb28nO1xuICAvLyB0aGVuIGl0J2xsIGJlIHRoZSBzYW1lIGFzIHRvcC4gSWYgdGhlIHR5cGUgaXMgaW1wb3J0ZWQgdmlhIGEgbmFtZXNwYWNlIGltcG9ydCwgZm9yIGV4YW1wbGU6XG4gIC8vICAgaW1wb3J0ICogYXMgZm9vIGZyb20gJy4vZm9vJztcbiAgLy8gYW5kIHRoZW4gcmVmZXJlbmNlZCBhczpcbiAgLy8gICBjb25zdHJ1Y3RvcihmOiBmb28uRm9vKVxuICAvLyB0aGVuIGxvY2FsIHdpbGwgYmUgdGhlIHRzLlN5bWJvbCBvZiBgZm9vYCwgd2hlcmVhcyB0b3Agd2lsbCBiZSB0aGUgdHMuU3ltYm9sIG9mIGBmb28uRm9vYC5cbiAgLy8gVGhpcyBhbGxvd3MgdHJhY2tpbmcgb2YgdGhlIGltcG9ydCBiZWhpbmQgd2hhdGV2ZXIgdHlwZSByZWZlcmVuY2UgZXhpc3RzLlxuICBsZXQgbG9jYWwgPSB0eXBlUmVmU3ltYm9sO1xuICBsZXQgaW1wb3J0TmFtZTogc3RyaW5nfG51bGwgPSBudWxsO1xuXG4gIC8vIFRPRE8oYWx4aHViKTogdGhpcyBpcyB0ZWNobmljYWxseSBub3QgY29ycmVjdC4gVGhlIHVzZXIgY291bGQgaGF2ZSBhbnkgaW1wb3J0IHR5cGUgd2l0aCBhbnlcbiAgLy8gYW1vdW50IG9mIHF1YWxpZmljYXRpb24gZm9sbG93aW5nIHRoZSBpbXBvcnRlZCB0eXBlOlxuICAvL1xuICAvLyBpbXBvcnQgKiBhcyBmb28gZnJvbSAnZm9vJ1xuICAvLyBjb25zdHJ1Y3RvcihpbmplY3Q6IGZvby5YLlkuWilcbiAgLy9cbiAgLy8gV2hhdCB3ZSByZWFsbHkgd2FudCBpcyB0aGUgYWJpbGl0eSB0byBleHByZXNzIHRoZSBhcmJpdHJhcnkgb3BlcmF0aW9uIG9mIGAuWC5ZLlpgIG9uIHRvcCBvZlxuICAvLyB3aGF0ZXZlciBpbXBvcnQgd2UgZ2VuZXJhdGUgZm9yICdmb28nLiBUaGlzIGxvZ2ljIGlzIHN1ZmZpY2llbnQgZm9yIG5vdywgdGhvdWdoLlxuICBpZiAodHMuaXNRdWFsaWZpZWROYW1lKHR5cGVOYW1lKSAmJiB0cy5pc0lkZW50aWZpZXIodHlwZU5hbWUubGVmdCkgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcih0eXBlTmFtZS5yaWdodCkpIHtcbiAgICBjb25zdCBsb2NhbFRtcCA9IGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbih0eXBlTmFtZS5sZWZ0KTtcbiAgICBpZiAobG9jYWxUbXAgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbG9jYWwgPSBsb2NhbFRtcDtcbiAgICAgIGltcG9ydE5hbWUgPSB0eXBlTmFtZS5yaWdodC50ZXh0O1xuICAgIH1cbiAgfVxuXG4gIC8vIERlLWFsaWFzIHRoZSB0b3AtbGV2ZWwgdHlwZSByZWZlcmVuY2Ugc3ltYm9sIHRvIGdldCB0aGUgc3ltYm9sIG9mIHRoZSBhY3R1YWwgZGVjbGFyYXRpb24uXG4gIGxldCBkZWNsID0gdHlwZVJlZlN5bWJvbDtcbiAgaWYgKHR5cGVSZWZTeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5BbGlhcykge1xuICAgIGRlY2wgPSBjaGVja2VyLmdldEFsaWFzZWRTeW1ib2wodHlwZVJlZlN5bWJvbCk7XG4gIH1cbiAgcmV0dXJuIHtsb2NhbCwgZGVjbCwgaW1wb3J0TmFtZX07XG59XG5cbmZ1bmN0aW9uIGVudGl0eU5hbWVUb1ZhbHVlKG5vZGU6IHRzLkVudGl0eU5hbWUpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBpZiAodHMuaXNRdWFsaWZpZWROYW1lKG5vZGUpKSB7XG4gICAgY29uc3QgbGVmdCA9IGVudGl0eU5hbWVUb1ZhbHVlKG5vZGUubGVmdCk7XG4gICAgcmV0dXJuIGxlZnQgIT09IG51bGwgPyB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhsZWZ0LCBub2RlLnJpZ2h0KSA6IG51bGw7XG4gIH0gZWxzZSBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUpKSB7XG4gICAgcmV0dXJuIHRzLmdldE11dGFibGVDbG9uZShub2RlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0ltcG9ydFNvdXJjZShub2RlOiB0cy5EZWNsYXJhdGlvbik6IG5vZGUgaXModHMuSW1wb3J0U3BlY2lmaWVyIHwgdHMuTmFtZXNwYWNlSW1wb3J0KSB7XG4gIHJldHVybiB0cy5pc0ltcG9ydFNwZWNpZmllcihub2RlKSB8fCB0cy5pc05hbWVzcGFjZUltcG9ydChub2RlKTtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdE1vZHVsZUFuZE5hbWVGcm9tSW1wb3J0KFxuICAgIG5vZGU6IHRzLkltcG9ydFNwZWNpZmllcnx0cy5OYW1lc3BhY2VJbXBvcnR8dHMuSW1wb3J0Q2xhdXNlLFxuICAgIGxvY2FsTmFtZTogc3RyaW5nfG51bGwpOiB7bmFtZTogc3RyaW5nLCBtb2R1bGVOYW1lOiBzdHJpbmd9IHtcbiAgbGV0IG5hbWU6IHN0cmluZztcbiAgbGV0IG1vZHVsZVNwZWNpZmllcjogdHMuRXhwcmVzc2lvbjtcbiAgc3dpdGNoIChub2RlLmtpbmQpIHtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuSW1wb3J0U3BlY2lmaWVyOlxuICAgICAgLy8gVGhlIHN5bWJvbCB3YXMgaW1wb3J0ZWQgYnkgbmFtZSwgaW4gYSB0cy5JbXBvcnRTcGVjaWZpZXIuXG4gICAgICBuYW1lID0gKG5vZGUucHJvcGVydHlOYW1lIHx8IG5vZGUubmFtZSkudGV4dDtcbiAgICAgIG1vZHVsZVNwZWNpZmllciA9IG5vZGUucGFyZW50LnBhcmVudC5wYXJlbnQubW9kdWxlU3BlY2lmaWVyO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLk5hbWVzcGFjZUltcG9ydDpcbiAgICAgIC8vIFRoZSBzeW1ib2wgd2FzIGltcG9ydGVkIHZpYSBhIG5hbWVzcGFjZSBpbXBvcnQuIEluIHRoaXMgY2FzZSwgdGhlIG5hbWUgdG8gdXNlIHdoZW5cbiAgICAgIC8vIGltcG9ydGluZyBpdCB3YXMgZXh0cmFjdGVkIGJ5IHJlc29sdmVUeXBlU3ltYm9scy5cbiAgICAgIGlmIChsb2NhbE5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgLy8gcmVzb2x2ZVR5cGVTeW1ib2xzKCkgc2hvdWxkIGhhdmUgZXh0cmFjdGVkIHRoZSBjb3JyZWN0IGxvY2FsIG5hbWUgZm9yIHRoZSBpbXBvcnQuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRGVidWcgZmFpbHVyZTogbm8gbG9jYWwgbmFtZSBwcm92aWRlZCBmb3IgTmFtZXNwYWNlSW1wb3J0YCk7XG4gICAgICB9XG4gICAgICBuYW1lID0gbG9jYWxOYW1lO1xuICAgICAgbW9kdWxlU3BlY2lmaWVyID0gbm9kZS5wYXJlbnQucGFyZW50Lm1vZHVsZVNwZWNpZmllcjtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVhY2hhYmxlOiAke3RzLlN5bnRheEtpbmRbKG5vZGUgYXMgdHMuTm9kZSkua2luZF19YCk7XG4gIH1cblxuICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbChtb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdub3QgYSBtb2R1bGUgc3BlY2lmaWVyJyk7XG4gIH1cbiAgY29uc3QgbW9kdWxlTmFtZSA9IG1vZHVsZVNwZWNpZmllci50ZXh0O1xuICByZXR1cm4ge21vZHVsZU5hbWUsIG5hbWV9O1xufVxuIl19