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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util", ["require", "exports", "tslib", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.checkIfGenericTypesAreUnbound = exports.checkIfClassIsExported = exports.tsCallMethod = exports.tsCreateVariable = exports.tsDeclareVariable = exports.tsCreateElement = exports.tsCastToAny = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    /**
     * A `Set` of `ts.SyntaxKind`s of `ts.Expression` which are safe to wrap in a `ts.AsExpression`
     * without needing to be wrapped in parentheses.
     *
     * For example, `foo.bar()` is a `ts.CallExpression`, and can be safely cast to `any` with
     * `foo.bar() as any`. however, `foo !== bar` is a `ts.BinaryExpression`, and attempting to cast
     * without the parentheses yields the expression `foo !== bar as any`. This is semantically
     * equivalent to `foo !== (bar as any)`, which is not what was intended. Thus,
     * `ts.BinaryExpression`s need to be wrapped in parentheses before casting.
     */
    //
    var SAFE_TO_CAST_WITHOUT_PARENS = new Set([
        // Expressions which are already parenthesized can be cast without further wrapping.
        ts.SyntaxKind.ParenthesizedExpression,
        // Expressions which form a single lexical unit leave no room for precedence issues with the cast.
        ts.SyntaxKind.Identifier,
        ts.SyntaxKind.CallExpression,
        ts.SyntaxKind.NonNullExpression,
        ts.SyntaxKind.ElementAccessExpression,
        ts.SyntaxKind.PropertyAccessExpression,
        ts.SyntaxKind.ArrayLiteralExpression,
        ts.SyntaxKind.ObjectLiteralExpression,
        // The same goes for various literals.
        ts.SyntaxKind.StringLiteral,
        ts.SyntaxKind.NumericLiteral,
        ts.SyntaxKind.TrueKeyword,
        ts.SyntaxKind.FalseKeyword,
        ts.SyntaxKind.NullKeyword,
        ts.SyntaxKind.UndefinedKeyword,
    ]);
    function tsCastToAny(expr) {
        // Wrap `expr` in parentheses if needed (see `SAFE_TO_CAST_WITHOUT_PARENS` above).
        if (!SAFE_TO_CAST_WITHOUT_PARENS.has(expr.kind)) {
            expr = ts.createParen(expr);
        }
        // The outer expression is always wrapped in parentheses.
        return ts.createParen(ts.createAsExpression(expr, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)));
    }
    exports.tsCastToAny = tsCastToAny;
    /**
     * Create an expression which instantiates an element by its HTML tagName.
     *
     * Thanks to narrowing of `document.createElement()`, this expression will have its type inferred
     * based on the tag name, including for custom elements that have appropriate .d.ts definitions.
     */
    function tsCreateElement(tagName) {
        var createElement = ts.createPropertyAccess(
        /* expression */ ts.createIdentifier('document'), 'createElement');
        return ts.createCall(
        /* expression */ createElement, 
        /* typeArguments */ undefined, 
        /* argumentsArray */ [ts.createLiteral(tagName)]);
    }
    exports.tsCreateElement = tsCreateElement;
    /**
     * Create a `ts.VariableStatement` which declares a variable without explicit initialization.
     *
     * The initializer `null!` is used to bypass strict variable initialization checks.
     *
     * Unlike with `tsCreateVariable`, the type of the variable is explicitly specified.
     */
    function tsDeclareVariable(id, type) {
        var decl = ts.createVariableDeclaration(
        /* name */ id, 
        /* type */ type, 
        /* initializer */ ts.createNonNullExpression(ts.createNull()));
        return ts.createVariableStatement(
        /* modifiers */ undefined, 
        /* declarationList */ [decl]);
    }
    exports.tsDeclareVariable = tsDeclareVariable;
    /**
     * Create a `ts.VariableStatement` that initializes a variable with a given expression.
     *
     * Unlike with `tsDeclareVariable`, the type of the variable is inferred from the initializer
     * expression.
     */
    function tsCreateVariable(id, initializer) {
        var decl = ts.createVariableDeclaration(
        /* name */ id, 
        /* type */ undefined, 
        /* initializer */ initializer);
        return ts.createVariableStatement(
        /* modifiers */ undefined, 
        /* declarationList */ [decl]);
    }
    exports.tsCreateVariable = tsCreateVariable;
    /**
     * Construct a `ts.CallExpression` that calls a method on a receiver.
     */
    function tsCallMethod(receiver, methodName, args) {
        if (args === void 0) { args = []; }
        var methodAccess = ts.createPropertyAccess(receiver, methodName);
        return ts.createCall(
        /* expression */ methodAccess, 
        /* typeArguments */ undefined, 
        /* argumentsArray */ args);
    }
    exports.tsCallMethod = tsCallMethod;
    function checkIfClassIsExported(node) {
        // A class is exported if one of two conditions is met:
        // 1) it has the 'export' modifier.
        // 2) it's declared at the top level, and there is an export statement for the class.
        if (node.modifiers !== undefined &&
            node.modifiers.some(function (mod) { return mod.kind === ts.SyntaxKind.ExportKeyword; })) {
            // Condition 1 is true, the class has an 'export' keyword attached.
            return true;
        }
        else if (node.parent !== undefined && ts.isSourceFile(node.parent) &&
            checkIfFileHasExport(node.parent, node.name.text)) {
            // Condition 2 is true, the class is exported via an 'export {}' statement.
            return true;
        }
        return false;
    }
    exports.checkIfClassIsExported = checkIfClassIsExported;
    function checkIfFileHasExport(sf, name) {
        var e_1, _a, e_2, _b;
        try {
            for (var _c = tslib_1.__values(sf.statements), _d = _c.next(); !_d.done; _d = _c.next()) {
                var stmt = _d.value;
                if (ts.isExportDeclaration(stmt) && stmt.exportClause !== undefined &&
                    ts.isNamedExports(stmt.exportClause)) {
                    try {
                        for (var _e = (e_2 = void 0, tslib_1.__values(stmt.exportClause.elements)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var element = _f.value;
                            if (element.propertyName === undefined && element.name.text === name) {
                                // The named declaration is directly exported.
                                return true;
                            }
                            else if (element.propertyName !== undefined && element.propertyName.text == name) {
                                // The named declaration is exported via an alias.
                                return true;
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
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
        return false;
    }
    function checkIfGenericTypesAreUnbound(node) {
        if (node.typeParameters === undefined) {
            return true;
        }
        return node.typeParameters.every(function (param) { return param.constraint === undefined; });
    }
    exports.checkIfGenericTypesAreUnbound = checkIfGenericTypesAreUnbound;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfdXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90c191dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFHakM7Ozs7Ozs7OztPQVNHO0lBQ0gsRUFBRTtJQUNGLElBQU0sMkJBQTJCLEdBQXVCLElBQUksR0FBRyxDQUFDO1FBQzlELG9GQUFvRjtRQUNwRixFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QjtRQUVyQyxrR0FBa0c7UUFDbEcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVO1FBQ3hCLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYztRQUM1QixFQUFFLENBQUMsVUFBVSxDQUFDLGlCQUFpQjtRQUMvQixFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QjtRQUNyQyxFQUFFLENBQUMsVUFBVSxDQUFDLHdCQUF3QjtRQUN0QyxFQUFFLENBQUMsVUFBVSxDQUFDLHNCQUFzQjtRQUNwQyxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QjtRQUVyQyxzQ0FBc0M7UUFDdEMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhO1FBQzNCLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYztRQUM1QixFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVc7UUFDekIsRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZO1FBQzFCLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVztRQUN6QixFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQjtLQUMvQixDQUFDLENBQUM7SUFFSCxTQUFnQixXQUFXLENBQUMsSUFBbUI7UUFDN0Msa0ZBQWtGO1FBQ2xGLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQy9DLElBQUksR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzdCO1FBRUQseURBQXlEO1FBQ3pELE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FDakIsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQVRELGtDQVNDO0lBR0Q7Ozs7O09BS0c7SUFDSCxTQUFnQixlQUFlLENBQUMsT0FBZTtRQUM3QyxJQUFNLGFBQWEsR0FBRyxFQUFFLENBQUMsb0JBQW9CO1FBQ3pDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUN2RSxPQUFPLEVBQUUsQ0FBQyxVQUFVO1FBQ2hCLGdCQUFnQixDQUFDLGFBQWE7UUFDOUIsbUJBQW1CLENBQUMsU0FBUztRQUM3QixvQkFBb0IsQ0FBQSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFQRCwwQ0FPQztJQUVEOzs7Ozs7T0FNRztJQUNILFNBQWdCLGlCQUFpQixDQUFDLEVBQWlCLEVBQUUsSUFBaUI7UUFDcEUsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLHlCQUF5QjtRQUNyQyxVQUFVLENBQUMsRUFBRTtRQUNiLFVBQVUsQ0FBQyxJQUFJO1FBQ2YsaUJBQWlCLENBQUMsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkUsT0FBTyxFQUFFLENBQUMsdUJBQXVCO1FBQzdCLGVBQWUsQ0FBQyxTQUFTO1FBQ3pCLHFCQUFxQixDQUFBLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBUkQsOENBUUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLGdCQUFnQixDQUM1QixFQUFpQixFQUFFLFdBQTBCO1FBQy9DLElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyx5QkFBeUI7UUFDckMsVUFBVSxDQUFDLEVBQUU7UUFDYixVQUFVLENBQUMsU0FBUztRQUNwQixpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNuQyxPQUFPLEVBQUUsQ0FBQyx1QkFBdUI7UUFDN0IsZUFBZSxDQUFDLFNBQVM7UUFDekIscUJBQXFCLENBQUEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFURCw0Q0FTQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsWUFBWSxDQUN4QixRQUF1QixFQUFFLFVBQWtCLEVBQUUsSUFBMEI7UUFBMUIscUJBQUEsRUFBQSxTQUEwQjtRQUN6RSxJQUFNLFlBQVksR0FBRyxFQUFFLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ25FLE9BQU8sRUFBRSxDQUFDLFVBQVU7UUFDaEIsZ0JBQWdCLENBQUMsWUFBWTtRQUM3QixtQkFBbUIsQ0FBQyxTQUFTO1FBQzdCLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFQRCxvQ0FPQztJQUVELFNBQWdCLHNCQUFzQixDQUFDLElBQXNCO1FBQzNELHVEQUF1RDtRQUN2RCxtQ0FBbUM7UUFDbkMscUZBQXFGO1FBQ3JGLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTO1lBQzVCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBeEMsQ0FBd0MsQ0FBQyxFQUFFO1lBQ3hFLG1FQUFtRTtZQUNuRSxPQUFPLElBQUksQ0FBQztTQUNiO2FBQU0sSUFDSCxJQUFJLENBQUMsTUFBTSxLQUFLLFNBQVMsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDekQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3JELDJFQUEyRTtZQUMzRSxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBZkQsd0RBZUM7SUFFRCxTQUFTLG9CQUFvQixDQUFDLEVBQWlCLEVBQUUsSUFBWTs7O1lBQzNELEtBQW1CLElBQUEsS0FBQSxpQkFBQSxFQUFFLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO2dCQUE3QixJQUFNLElBQUksV0FBQTtnQkFDYixJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVM7b0JBQy9ELEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFOzt3QkFDeEMsS0FBc0IsSUFBQSxvQkFBQSxpQkFBQSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQSxDQUFBLGdCQUFBLDRCQUFFOzRCQUE3QyxJQUFNLE9BQU8sV0FBQTs0QkFDaEIsSUFBSSxPQUFPLENBQUMsWUFBWSxLQUFLLFNBQVMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUU7Z0NBQ3BFLDhDQUE4QztnQ0FDOUMsT0FBTyxJQUFJLENBQUM7NkJBQ2I7aUNBQU0sSUFBSSxPQUFPLENBQUMsWUFBWSxLQUFLLFNBQVMsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksSUFBSSxJQUFJLEVBQUU7Z0NBQ2xGLGtEQUFrRDtnQ0FDbEQsT0FBTyxJQUFJLENBQUM7NkJBQ2I7eUJBQ0Y7Ozs7Ozs7OztpQkFDRjthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxTQUFnQiw2QkFBNkIsQ0FBQyxJQUEyQztRQUV2RixJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFO1lBQ3JDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSyxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQTlCLENBQThCLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBTkQsc0VBTUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuLyoqXG4gKiBBIGBTZXRgIG9mIGB0cy5TeW50YXhLaW5kYHMgb2YgYHRzLkV4cHJlc3Npb25gIHdoaWNoIGFyZSBzYWZlIHRvIHdyYXAgaW4gYSBgdHMuQXNFeHByZXNzaW9uYFxuICogd2l0aG91dCBuZWVkaW5nIHRvIGJlIHdyYXBwZWQgaW4gcGFyZW50aGVzZXMuXG4gKlxuICogRm9yIGV4YW1wbGUsIGBmb28uYmFyKClgIGlzIGEgYHRzLkNhbGxFeHByZXNzaW9uYCwgYW5kIGNhbiBiZSBzYWZlbHkgY2FzdCB0byBgYW55YCB3aXRoXG4gKiBgZm9vLmJhcigpIGFzIGFueWAuIGhvd2V2ZXIsIGBmb28gIT09IGJhcmAgaXMgYSBgdHMuQmluYXJ5RXhwcmVzc2lvbmAsIGFuZCBhdHRlbXB0aW5nIHRvIGNhc3RcbiAqIHdpdGhvdXQgdGhlIHBhcmVudGhlc2VzIHlpZWxkcyB0aGUgZXhwcmVzc2lvbiBgZm9vICE9PSBiYXIgYXMgYW55YC4gVGhpcyBpcyBzZW1hbnRpY2FsbHlcbiAqIGVxdWl2YWxlbnQgdG8gYGZvbyAhPT0gKGJhciBhcyBhbnkpYCwgd2hpY2ggaXMgbm90IHdoYXQgd2FzIGludGVuZGVkLiBUaHVzLFxuICogYHRzLkJpbmFyeUV4cHJlc3Npb25gcyBuZWVkIHRvIGJlIHdyYXBwZWQgaW4gcGFyZW50aGVzZXMgYmVmb3JlIGNhc3RpbmcuXG4gKi9cbi8vXG5jb25zdCBTQUZFX1RPX0NBU1RfV0lUSE9VVF9QQVJFTlM6IFNldDx0cy5TeW50YXhLaW5kPiA9IG5ldyBTZXQoW1xuICAvLyBFeHByZXNzaW9ucyB3aGljaCBhcmUgYWxyZWFkeSBwYXJlbnRoZXNpemVkIGNhbiBiZSBjYXN0IHdpdGhvdXQgZnVydGhlciB3cmFwcGluZy5cbiAgdHMuU3ludGF4S2luZC5QYXJlbnRoZXNpemVkRXhwcmVzc2lvbixcblxuICAvLyBFeHByZXNzaW9ucyB3aGljaCBmb3JtIGEgc2luZ2xlIGxleGljYWwgdW5pdCBsZWF2ZSBubyByb29tIGZvciBwcmVjZWRlbmNlIGlzc3VlcyB3aXRoIHRoZSBjYXN0LlxuICB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIsXG4gIHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24sXG4gIHRzLlN5bnRheEtpbmQuTm9uTnVsbEV4cHJlc3Npb24sXG4gIHRzLlN5bnRheEtpbmQuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24sXG4gIHRzLlN5bnRheEtpbmQuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uLFxuICB0cy5TeW50YXhLaW5kLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24sXG4gIHRzLlN5bnRheEtpbmQuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24sXG5cbiAgLy8gVGhlIHNhbWUgZ29lcyBmb3IgdmFyaW91cyBsaXRlcmFscy5cbiAgdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsLFxuICB0cy5TeW50YXhLaW5kLk51bWVyaWNMaXRlcmFsLFxuICB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkLFxuICB0cy5TeW50YXhLaW5kLkZhbHNlS2V5d29yZCxcbiAgdHMuU3ludGF4S2luZC5OdWxsS2V5d29yZCxcbiAgdHMuU3ludGF4S2luZC5VbmRlZmluZWRLZXl3b3JkLFxuXSk7XG5cbmV4cG9ydCBmdW5jdGlvbiB0c0Nhc3RUb0FueShleHByOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIC8vIFdyYXAgYGV4cHJgIGluIHBhcmVudGhlc2VzIGlmIG5lZWRlZCAoc2VlIGBTQUZFX1RPX0NBU1RfV0lUSE9VVF9QQVJFTlNgIGFib3ZlKS5cbiAgaWYgKCFTQUZFX1RPX0NBU1RfV0lUSE9VVF9QQVJFTlMuaGFzKGV4cHIua2luZCkpIHtcbiAgICBleHByID0gdHMuY3JlYXRlUGFyZW4oZXhwcik7XG4gIH1cblxuICAvLyBUaGUgb3V0ZXIgZXhwcmVzc2lvbiBpcyBhbHdheXMgd3JhcHBlZCBpbiBwYXJlbnRoZXNlcy5cbiAgcmV0dXJuIHRzLmNyZWF0ZVBhcmVuKFxuICAgICAgdHMuY3JlYXRlQXNFeHByZXNzaW9uKGV4cHIsIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKSk7XG59XG5cblxuLyoqXG4gKiBDcmVhdGUgYW4gZXhwcmVzc2lvbiB3aGljaCBpbnN0YW50aWF0ZXMgYW4gZWxlbWVudCBieSBpdHMgSFRNTCB0YWdOYW1lLlxuICpcbiAqIFRoYW5rcyB0byBuYXJyb3dpbmcgb2YgYGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoKWAsIHRoaXMgZXhwcmVzc2lvbiB3aWxsIGhhdmUgaXRzIHR5cGUgaW5mZXJyZWRcbiAqIGJhc2VkIG9uIHRoZSB0YWcgbmFtZSwgaW5jbHVkaW5nIGZvciBjdXN0b20gZWxlbWVudHMgdGhhdCBoYXZlIGFwcHJvcHJpYXRlIC5kLnRzIGRlZmluaXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdHNDcmVhdGVFbGVtZW50KHRhZ05hbWU6IHN0cmluZyk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCBjcmVhdGVFbGVtZW50ID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoXG4gICAgICAvKiBleHByZXNzaW9uICovIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ2RvY3VtZW50JyksICdjcmVhdGVFbGVtZW50Jyk7XG4gIHJldHVybiB0cy5jcmVhdGVDYWxsKFxuICAgICAgLyogZXhwcmVzc2lvbiAqLyBjcmVhdGVFbGVtZW50LFxuICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhcmd1bWVudHNBcnJheSAqL1t0cy5jcmVhdGVMaXRlcmFsKHRhZ05hbWUpXSk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgYHRzLlZhcmlhYmxlU3RhdGVtZW50YCB3aGljaCBkZWNsYXJlcyBhIHZhcmlhYmxlIHdpdGhvdXQgZXhwbGljaXQgaW5pdGlhbGl6YXRpb24uXG4gKlxuICogVGhlIGluaXRpYWxpemVyIGBudWxsIWAgaXMgdXNlZCB0byBieXBhc3Mgc3RyaWN0IHZhcmlhYmxlIGluaXRpYWxpemF0aW9uIGNoZWNrcy5cbiAqXG4gKiBVbmxpa2Ugd2l0aCBgdHNDcmVhdGVWYXJpYWJsZWAsIHRoZSB0eXBlIG9mIHRoZSB2YXJpYWJsZSBpcyBleHBsaWNpdGx5IHNwZWNpZmllZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRzRGVjbGFyZVZhcmlhYmxlKGlkOiB0cy5JZGVudGlmaWVyLCB0eXBlOiB0cy5UeXBlTm9kZSk6IHRzLlZhcmlhYmxlU3RhdGVtZW50IHtcbiAgY29uc3QgZGVjbCA9IHRzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24oXG4gICAgICAvKiBuYW1lICovIGlkLFxuICAgICAgLyogdHlwZSAqLyB0eXBlLFxuICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24odHMuY3JlYXRlTnVsbCgpKSk7XG4gIHJldHVybiB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudChcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBkZWNsYXJhdGlvbkxpc3QgKi9bZGVjbF0pO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGB0cy5WYXJpYWJsZVN0YXRlbWVudGAgdGhhdCBpbml0aWFsaXplcyBhIHZhcmlhYmxlIHdpdGggYSBnaXZlbiBleHByZXNzaW9uLlxuICpcbiAqIFVubGlrZSB3aXRoIGB0c0RlY2xhcmVWYXJpYWJsZWAsIHRoZSB0eXBlIG9mIHRoZSB2YXJpYWJsZSBpcyBpbmZlcnJlZCBmcm9tIHRoZSBpbml0aWFsaXplclxuICogZXhwcmVzc2lvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRzQ3JlYXRlVmFyaWFibGUoXG4gICAgaWQ6IHRzLklkZW50aWZpZXIsIGluaXRpYWxpemVyOiB0cy5FeHByZXNzaW9uKTogdHMuVmFyaWFibGVTdGF0ZW1lbnQge1xuICBjb25zdCBkZWNsID0gdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbihcbiAgICAgIC8qIG5hbWUgKi8gaWQsXG4gICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGluaXRpYWxpemVyICovIGluaXRpYWxpemVyKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGRlY2xhcmF0aW9uTGlzdCAqL1tkZWNsXSk7XG59XG5cbi8qKlxuICogQ29uc3RydWN0IGEgYHRzLkNhbGxFeHByZXNzaW9uYCB0aGF0IGNhbGxzIGEgbWV0aG9kIG9uIGEgcmVjZWl2ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0c0NhbGxNZXRob2QoXG4gICAgcmVjZWl2ZXI6IHRzLkV4cHJlc3Npb24sIG1ldGhvZE5hbWU6IHN0cmluZywgYXJnczogdHMuRXhwcmVzc2lvbltdID0gW10pOiB0cy5DYWxsRXhwcmVzc2lvbiB7XG4gIGNvbnN0IG1ldGhvZEFjY2VzcyA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHJlY2VpdmVyLCBtZXRob2ROYW1lKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAvKiBleHByZXNzaW9uICovIG1ldGhvZEFjY2VzcyxcbiAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYXJndW1lbnRzQXJyYXkgKi8gYXJncyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjaGVja0lmQ2xhc3NJc0V4cG9ydGVkKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgLy8gQSBjbGFzcyBpcyBleHBvcnRlZCBpZiBvbmUgb2YgdHdvIGNvbmRpdGlvbnMgaXMgbWV0OlxuICAvLyAxKSBpdCBoYXMgdGhlICdleHBvcnQnIG1vZGlmaWVyLlxuICAvLyAyKSBpdCdzIGRlY2xhcmVkIGF0IHRoZSB0b3AgbGV2ZWwsIGFuZCB0aGVyZSBpcyBhbiBleHBvcnQgc3RhdGVtZW50IGZvciB0aGUgY2xhc3MuXG4gIGlmIChub2RlLm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICBub2RlLm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKSkge1xuICAgIC8vIENvbmRpdGlvbiAxIGlzIHRydWUsIHRoZSBjbGFzcyBoYXMgYW4gJ2V4cG9ydCcga2V5d29yZCBhdHRhY2hlZC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChcbiAgICAgIG5vZGUucGFyZW50ICE9PSB1bmRlZmluZWQgJiYgdHMuaXNTb3VyY2VGaWxlKG5vZGUucGFyZW50KSAmJlxuICAgICAgY2hlY2tJZkZpbGVIYXNFeHBvcnQobm9kZS5wYXJlbnQsIG5vZGUubmFtZS50ZXh0KSkge1xuICAgIC8vIENvbmRpdGlvbiAyIGlzIHRydWUsIHRoZSBjbGFzcyBpcyBleHBvcnRlZCB2aWEgYW4gJ2V4cG9ydCB7fScgc3RhdGVtZW50LlxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gY2hlY2tJZkZpbGVIYXNFeHBvcnQoc2Y6IHRzLlNvdXJjZUZpbGUsIG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBmb3IgKGNvbnN0IHN0bXQgb2Ygc2Yuc3RhdGVtZW50cykge1xuICAgIGlmICh0cy5pc0V4cG9ydERlY2xhcmF0aW9uKHN0bXQpICYmIHN0bXQuZXhwb3J0Q2xhdXNlICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgdHMuaXNOYW1lZEV4cG9ydHMoc3RtdC5leHBvcnRDbGF1c2UpKSB7XG4gICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2Ygc3RtdC5leHBvcnRDbGF1c2UuZWxlbWVudHMpIHtcbiAgICAgICAgaWYgKGVsZW1lbnQucHJvcGVydHlOYW1lID09PSB1bmRlZmluZWQgJiYgZWxlbWVudC5uYW1lLnRleHQgPT09IG5hbWUpIHtcbiAgICAgICAgICAvLyBUaGUgbmFtZWQgZGVjbGFyYXRpb24gaXMgZGlyZWN0bHkgZXhwb3J0ZWQuXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5wcm9wZXJ0eU5hbWUgIT09IHVuZGVmaW5lZCAmJiBlbGVtZW50LnByb3BlcnR5TmFtZS50ZXh0ID09IG5hbWUpIHtcbiAgICAgICAgICAvLyBUaGUgbmFtZWQgZGVjbGFyYXRpb24gaXMgZXhwb3J0ZWQgdmlhIGFuIGFsaWFzLlxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrSWZHZW5lcmljVHlwZXNBcmVVbmJvdW5kKG5vZGU6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4pOlxuICAgIGJvb2xlYW4ge1xuICBpZiAobm9kZS50eXBlUGFyYW1ldGVycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIG5vZGUudHlwZVBhcmFtZXRlcnMuZXZlcnkocGFyYW0gPT4gcGFyYW0uY29uc3RyYWludCA9PT0gdW5kZWZpbmVkKTtcbn1cbiJdfQ==