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
        define("@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.skipAliases = exports.isExportsStatement = exports.isExportsAssignment = exports.isExportsDeclaration = exports.isExternalImport = exports.isRequireCall = exports.extractGetterFnExpression = exports.isDefinePropertyReexportStatement = exports.isWildcardReexportStatement = exports.findRequireCallReference = exports.findNamespaceOfIdentifier = void 0;
    var ts = require("typescript");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    /**
     * Return the "namespace" of the specified `ts.Identifier` if the identifier is the RHS of a
     * property access expression, i.e. an expression of the form `<namespace>.<id>` (in which case a
     * `ts.Identifier` corresponding to `<namespace>` will be returned). Otherwise return `null`.
     */
    function findNamespaceOfIdentifier(id) {
        return id.parent && ts.isPropertyAccessExpression(id.parent) && id.parent.name === id &&
            ts.isIdentifier(id.parent.expression) ?
            id.parent.expression :
            null;
    }
    exports.findNamespaceOfIdentifier = findNamespaceOfIdentifier;
    /**
     * Return the `RequireCall` that is used to initialize the specified `ts.Identifier`, if the
     * specified indentifier was indeed initialized with a require call in a declaration of the form:
     * `var <id> = require('...')`
     */
    function findRequireCallReference(id, checker) {
        var _a, _b;
        var symbol = checker.getSymbolAtLocation(id) || null;
        var declaration = (_a = symbol === null || symbol === void 0 ? void 0 : symbol.valueDeclaration) !== null && _a !== void 0 ? _a : (_b = symbol === null || symbol === void 0 ? void 0 : symbol.declarations) === null || _b === void 0 ? void 0 : _b[0];
        var initializer = declaration && ts.isVariableDeclaration(declaration) && declaration.initializer || null;
        return initializer && isRequireCall(initializer) ? initializer : null;
    }
    exports.findRequireCallReference = findRequireCallReference;
    /**
     * Check whether the specified `ts.Statement` is a wildcard re-export statement.
     * I.E. an expression statement of one of the following forms:
     * - `__export(<foo>)`
     * - `__exportStar(<foo>)`
     * - `tslib.__export(<foo>, exports)`
     * - `tslib.__exportStar(<foo>, exports)`
     */
    function isWildcardReexportStatement(stmt) {
        // Ensure it is a call expression statement.
        if (!ts.isExpressionStatement(stmt) || !ts.isCallExpression(stmt.expression)) {
            return false;
        }
        // Get the called function identifier.
        // NOTE: Currently, it seems that `__export()` is used when emitting helpers inline and
        //       `__exportStar()` when importing them
        //       ([source](https://github.com/microsoft/TypeScript/blob/d7c83f023/src/compiler/transformers/module/module.ts#L1796-L1797)).
        //       So, theoretically, we only care about the formats `__export(<foo>)` and
        //       `tslib.__exportStar(<foo>, exports)`.
        //       The current implementation accepts the other two formats (`__exportStar(...)` and
        //       `tslib.__export(...)`) as well to be more future-proof (given that it is unlikely that
        //       they will introduce false positives).
        var fnName = null;
        if (ts.isIdentifier(stmt.expression.expression)) {
            // Statement of the form `someFn(...)`.
            fnName = stmt.expression.expression.text;
        }
        else if (ts.isPropertyAccessExpression(stmt.expression.expression) &&
            ts.isIdentifier(stmt.expression.expression.name)) {
            // Statement of the form `tslib.someFn(...)`.
            fnName = stmt.expression.expression.name.text;
        }
        // Ensure the called function is either `__export()` or `__exportStar()`.
        if ((fnName !== '__export') && (fnName !== '__exportStar')) {
            return false;
        }
        // Ensure there is at least one argument.
        // (The first argument is the exported thing and there will be a second `exports` argument in the
        // case of imported helpers).
        return stmt.expression.arguments.length > 0;
    }
    exports.isWildcardReexportStatement = isWildcardReexportStatement;
    /**
     * Check whether the statement is a re-export of the form:
     *
     * ```
     * Object.defineProperty(exports, "<export-name>",
     *     { enumerable: true, get: function () { return <import-name>; } });
     * ```
     */
    function isDefinePropertyReexportStatement(stmt) {
        if (!ts.isExpressionStatement(stmt) || !ts.isCallExpression(stmt.expression)) {
            return false;
        }
        // Check for Object.defineProperty
        if (!ts.isPropertyAccessExpression(stmt.expression.expression) ||
            !ts.isIdentifier(stmt.expression.expression.expression) ||
            stmt.expression.expression.expression.text !== 'Object' ||
            !ts.isIdentifier(stmt.expression.expression.name) ||
            stmt.expression.expression.name.text !== 'defineProperty') {
            return false;
        }
        var args = stmt.expression.arguments;
        if (args.length !== 3) {
            return false;
        }
        var exportsObject = args[0];
        if (!ts.isIdentifier(exportsObject) || exportsObject.text !== 'exports') {
            return false;
        }
        var propertyKey = args[1];
        if (!ts.isStringLiteral(propertyKey)) {
            return false;
        }
        var propertyDescriptor = args[2];
        if (!ts.isObjectLiteralExpression(propertyDescriptor)) {
            return false;
        }
        return (propertyDescriptor.properties.some(function (prop) { return prop.name !== undefined && ts.isIdentifier(prop.name) && prop.name.text === 'get'; }));
    }
    exports.isDefinePropertyReexportStatement = isDefinePropertyReexportStatement;
    /**
     * Extract the "value" of the getter in a `defineProperty` statement.
     *
     * This will return the `ts.Expression` value of a single `return` statement in the `get` method
     * of the property definition object, or `null` if that is not possible.
     */
    function extractGetterFnExpression(statement) {
        var args = statement.expression.arguments;
        var getterFn = args[2].properties.find(function (prop) { return prop.name !== undefined && ts.isIdentifier(prop.name) && prop.name.text === 'get'; });
        if (getterFn === undefined || !ts.isPropertyAssignment(getterFn) ||
            !ts.isFunctionExpression(getterFn.initializer)) {
            return null;
        }
        var returnStatement = getterFn.initializer.body.statements[0];
        if (!ts.isReturnStatement(returnStatement) || returnStatement.expression === undefined) {
            return null;
        }
        return returnStatement.expression;
    }
    exports.extractGetterFnExpression = extractGetterFnExpression;
    /**
     * Check whether the specified `ts.Node` represents a `require()` call, i.e. an call expression of
     * the form: `require('<foo>')`
     */
    function isRequireCall(node) {
        return ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
            node.expression.text === 'require' && node.arguments.length === 1 &&
            ts.isStringLiteral(node.arguments[0]);
    }
    exports.isRequireCall = isRequireCall;
    /**
     * Check whether the specified `path` is an "external" import.
     * In other words, that it comes from a entry-point outside the current one.
     */
    function isExternalImport(path) {
        return !/^\.\.?(\/|$)/.test(path);
    }
    exports.isExternalImport = isExternalImport;
    /**
     * Check whether the specified `node` is a property access expression of the form
     * `exports.<foo>`.
     */
    function isExportsDeclaration(expr) {
        return expr.parent && isExportsAssignment(expr.parent);
    }
    exports.isExportsDeclaration = isExportsDeclaration;
    /**
     * Check whether the specified `node` is an assignment expression of the form
     * `exports.<foo> = <bar>`.
     */
    function isExportsAssignment(expr) {
        return (0, typescript_1.isAssignment)(expr) && ts.isPropertyAccessExpression(expr.left) &&
            ts.isIdentifier(expr.left.expression) && expr.left.expression.text === 'exports' &&
            ts.isIdentifier(expr.left.name);
    }
    exports.isExportsAssignment = isExportsAssignment;
    /**
     * Check whether the specified `stmt` is an expression statement of the form
     * `exports.<foo> = <bar>;`.
     */
    function isExportsStatement(stmt) {
        return ts.isExpressionStatement(stmt) && isExportsAssignment(stmt.expression);
    }
    exports.isExportsStatement = isExportsStatement;
    /**
     * Find the far right hand side of a sequence of aliased assignements of the form
     *
     * ```
     * exports.MyClass = alias1 = alias2 = <<declaration>>
     * ```
     *
     * @param node the expression to parse
     * @returns the original `node` or the far right expression of a series of assignments.
     */
    function skipAliases(node) {
        while ((0, typescript_1.isAssignment)(node)) {
            node = node.right;
        }
        return node;
    }
    exports.skipAliases = skipAliases;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfdW1kX3V0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvY29tbW9uanNfdW1kX3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyxrRkFBb0U7SUFrRHBFOzs7O09BSUc7SUFDSCxTQUFnQix5QkFBeUIsQ0FBQyxFQUFpQjtRQUN6RCxPQUFPLEVBQUUsQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLDBCQUEwQixDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxFQUFFO1lBQzdFLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQzNDLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDO0lBQ1gsQ0FBQztJQUxELDhEQUtDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQWdCLHdCQUF3QixDQUFDLEVBQWlCLEVBQUUsT0FBdUI7O1FBRWpGLElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUM7UUFDdkQsSUFBTSxXQUFXLEdBQUcsTUFBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsZ0JBQWdCLG1DQUFJLE1BQUEsTUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLFlBQVksMENBQUcsQ0FBQyxDQUFDLENBQUM7UUFDMUUsSUFBTSxXQUFXLEdBQ2IsV0FBVyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxXQUFXLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQztRQUM1RixPQUFPLFdBQVcs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UUFDL0MsT0FBTyxJQUFBLHlCQUFZLEVBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDakUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxTQUFTO1lBQ2hGLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBSkQsa0RBSUM7SUFTRDs7O09BR0c7SUFDSCxTQUFnQixrQkFBa0IsQ0FBQyxJQUFhO1FBQzlDLE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRkQsZ0RBRUM7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSCxTQUFnQixXQUFXLENBQUMsSUFBbUI7UUFDN0MsT0FBTyxJQUFBLHlCQUFZLEVBQUMsSUFBSSxDQUFDLEVBQUU7WUFDekIsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7U0FDbkI7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFMRCxrQ0FLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7RGVjbGFyYXRpb259IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7aXNBc3NpZ25tZW50fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXhwb3J0RGVjbGFyYXRpb24ge1xuICBuYW1lOiBzdHJpbmc7XG4gIGRlY2xhcmF0aW9uOiBEZWNsYXJhdGlvbjtcbn1cblxuLyoqXG4gKiBBIENvbW1vbkpTIG9yIFVNRCB3aWxkY2FyZCByZS1leHBvcnQgc3RhdGVtZW50LlxuICpcbiAqIFRoZSBDb21tb25KUyBvciBVTUQgdmVyc2lvbiBvZiBgZXhwb3J0ICogZnJvbSAnYmxhaCc7YC5cbiAqXG4gKiBUaGVzZSBzdGF0ZW1lbnRzIGNhbiBoYXZlIHNldmVyYWwgZm9ybXMgKGRlcGVuZGluZywgZm9yIGV4YW1wbGUsIG9uIHdoZXRoZXJcbiAqIHRoZSBUeXBlU2NyaXB0IGhlbHBlcnMgYXJlIGltcG9ydGVkIG9yIGVtaXR0ZWQgaW5saW5lKS4gVGhlIGV4cHJlc3Npb24gY2FuIGhhdmUgb25lIG9mIHRoZVxuICogZm9sbG93aW5nIGZvcm1zOlxuICogLSBgX19leHBvcnQoZmlyc3RBcmcpYFxuICogLSBgX19leHBvcnRTdGFyKGZpcnN0QXJnKWBcbiAqIC0gYHRzbGliLl9fZXhwb3J0KGZpcnN0QXJnLCBleHBvcnRzKWBcbiAqIC0gYHRzbGliLl9fZXhwb3J0U3RhcihmaXJzdEFyZywgZXhwb3J0cylgXG4gKlxuICogSW4gYWxsIGNhc2VzLCB3ZSBvbmx5IGNhcmUgYWJvdXQgYGZpcnN0QXJnYCwgd2hpY2ggaXMgdGhlIGZpcnN0IGFyZ3VtZW50IG9mIHRoZSByZS1leHBvcnQgY2FsbFxuICogZXhwcmVzc2lvbiBhbmQgY2FuIGJlIGVpdGhlciBhIGByZXF1aXJlKCcuLi4nKWAgY2FsbCBvciBhbiBpZGVudGlmaWVyIChpbml0aWFsaXplZCB2aWEgYVxuICogYHJlcXVpcmUoJy4uLicpYCBjYWxsKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBXaWxkY2FyZFJlZXhwb3J0U3RhdGVtZW50IGV4dGVuZHMgdHMuRXhwcmVzc2lvblN0YXRlbWVudCB7XG4gIGV4cHJlc3Npb246IHRzLkNhbGxFeHByZXNzaW9uO1xufVxuXG4vKipcbiAqIEEgQ29tbW9uSlMgb3IgVU1EIHJlLWV4cG9ydCBzdGF0ZW1lbnQgdXNpbmcgYW4gYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYCBjYWxsLlxuICogRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCI8ZXhwb3J0ZWQtaWQ+XCIsXG4gKiAgICAgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDxpbXBvcnRlZC1pZD47IH0gfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZWZpbmVQcm9wZXJ0eVJlZXhwb3J0U3RhdGVtZW50IGV4dGVuZHMgdHMuRXhwcmVzc2lvblN0YXRlbWVudCB7XG4gIGV4cHJlc3Npb246IHRzLkNhbGxFeHByZXNzaW9uJlxuICAgICAge2FyZ3VtZW50czogW3RzLklkZW50aWZpZXIsIHRzLlN0cmluZ0xpdGVyYWwsIHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uXX07XG59XG5cbi8qKlxuICogQSBjYWxsIGV4cHJlc3Npb24gdGhhdCBoYXMgYSBzdHJpbmcgbGl0ZXJhbCBmb3IgaXRzIGZpcnN0IGFyZ3VtZW50LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlcXVpcmVDYWxsIGV4dGVuZHMgdHMuQ2FsbEV4cHJlc3Npb24ge1xuICBhcmd1bWVudHM6IHRzLkNhbGxFeHByZXNzaW9uWydhcmd1bWVudHMnXSZbdHMuU3RyaW5nTGl0ZXJhbF07XG59XG5cblxuLyoqXG4gKiBSZXR1cm4gdGhlIFwibmFtZXNwYWNlXCIgb2YgdGhlIHNwZWNpZmllZCBgdHMuSWRlbnRpZmllcmAgaWYgdGhlIGlkZW50aWZpZXIgaXMgdGhlIFJIUyBvZiBhXG4gKiBwcm9wZXJ0eSBhY2Nlc3MgZXhwcmVzc2lvbiwgaS5lLiBhbiBleHByZXNzaW9uIG9mIHRoZSBmb3JtIGA8bmFtZXNwYWNlPi48aWQ+YCAoaW4gd2hpY2ggY2FzZSBhXG4gKiBgdHMuSWRlbnRpZmllcmAgY29ycmVzcG9uZGluZyB0byBgPG5hbWVzcGFjZT5gIHdpbGwgYmUgcmV0dXJuZWQpLiBPdGhlcndpc2UgcmV0dXJuIGBudWxsYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmROYW1lc3BhY2VPZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICByZXR1cm4gaWQucGFyZW50ICYmIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGlkLnBhcmVudCkgJiYgaWQucGFyZW50Lm5hbWUgPT09IGlkICYmXG4gICAgICAgICAgdHMuaXNJZGVudGlmaWVyKGlkLnBhcmVudC5leHByZXNzaW9uKSA/XG4gICAgICBpZC5wYXJlbnQuZXhwcmVzc2lvbiA6XG4gICAgICBudWxsO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgYFJlcXVpcmVDYWxsYCB0aGF0IGlzIHVzZWQgdG8gaW5pdGlhbGl6ZSB0aGUgc3BlY2lmaWVkIGB0cy5JZGVudGlmaWVyYCwgaWYgdGhlXG4gKiBzcGVjaWZpZWQgaW5kZW50aWZpZXIgd2FzIGluZGVlZCBpbml0aWFsaXplZCB3aXRoIGEgcmVxdWlyZSBjYWxsIGluIGEgZGVjbGFyYXRpb24gb2YgdGhlIGZvcm06XG4gKiBgdmFyIDxpZD4gPSByZXF1aXJlKCcuLi4nKWBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRSZXF1aXJlQ2FsbFJlZmVyZW5jZShpZDogdHMuSWRlbnRpZmllciwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiBSZXF1aXJlQ2FsbHxcbiAgICBudWxsIHtcbiAgY29uc3Qgc3ltYm9sID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlkKSB8fCBudWxsO1xuICBjb25zdCBkZWNsYXJhdGlvbiA9IHN5bWJvbD8udmFsdWVEZWNsYXJhdGlvbiA/PyBzeW1ib2w/LmRlY2xhcmF0aW9ucz8uWzBdO1xuICBjb25zdCBpbml0aWFsaXplciA9XG4gICAgICBkZWNsYXJhdGlvbiAmJiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pICYmIGRlY2xhcmF0aW9uLmluaXRpYWxpemVyIHx8IG51bGw7XG4gIHJldHVybiBpbml0aWFsaXplciAmJiBpc1JlcXVpcmVDYWxsKGluaXRpYWxpemVyKSA/IGluaXRpYWxpemVyIDogbnVsbDtcbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgYHRzLlN0YXRlbWVudGAgaXMgYSB3aWxkY2FyZCByZS1leHBvcnQgc3RhdGVtZW50LlxuICogSS5FLiBhbiBleHByZXNzaW9uIHN0YXRlbWVudCBvZiBvbmUgb2YgdGhlIGZvbGxvd2luZyBmb3JtczpcbiAqIC0gYF9fZXhwb3J0KDxmb28+KWBcbiAqIC0gYF9fZXhwb3J0U3Rhcig8Zm9vPilgXG4gKiAtIGB0c2xpYi5fX2V4cG9ydCg8Zm9vPiwgZXhwb3J0cylgXG4gKiAtIGB0c2xpYi5fX2V4cG9ydFN0YXIoPGZvbz4sIGV4cG9ydHMpYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXaWxkY2FyZFJlZXhwb3J0U3RhdGVtZW50KHN0bXQ6IHRzLlN0YXRlbWVudCk6IHN0bXQgaXMgV2lsZGNhcmRSZWV4cG9ydFN0YXRlbWVudCB7XG4gIC8vIEVuc3VyZSBpdCBpcyBhIGNhbGwgZXhwcmVzc2lvbiBzdGF0ZW1lbnQuXG4gIGlmICghdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0bXQpIHx8ICF0cy5pc0NhbGxFeHByZXNzaW9uKHN0bXQuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBHZXQgdGhlIGNhbGxlZCBmdW5jdGlvbiBpZGVudGlmaWVyLlxuICAvLyBOT1RFOiBDdXJyZW50bHksIGl0IHNlZW1zIHRoYXQgYF9fZXhwb3J0KClgIGlzIHVzZWQgd2hlbiBlbWl0dGluZyBoZWxwZXJzIGlubGluZSBhbmRcbiAgLy8gICAgICAgYF9fZXhwb3J0U3RhcigpYCB3aGVuIGltcG9ydGluZyB0aGVtXG4gIC8vICAgICAgIChbc291cmNlXShodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvYmxvYi9kN2M4M2YwMjMvc3JjL2NvbXBpbGVyL3RyYW5zZm9ybWVycy9tb2R1bGUvbW9kdWxlLnRzI0wxNzk2LUwxNzk3KSkuXG4gIC8vICAgICAgIFNvLCB0aGVvcmV0aWNhbGx5LCB3ZSBvbmx5IGNhcmUgYWJvdXQgdGhlIGZvcm1hdHMgYF9fZXhwb3J0KDxmb28+KWAgYW5kXG4gIC8vICAgICAgIGB0c2xpYi5fX2V4cG9ydFN0YXIoPGZvbz4sIGV4cG9ydHMpYC5cbiAgLy8gICAgICAgVGhlIGN1cnJlbnQgaW1wbGVtZW50YXRpb24gYWNjZXB0cyB0aGUgb3RoZXIgdHdvIGZvcm1hdHMgKGBfX2V4cG9ydFN0YXIoLi4uKWAgYW5kXG4gIC8vICAgICAgIGB0c2xpYi5fX2V4cG9ydCguLi4pYCkgYXMgd2VsbCB0byBiZSBtb3JlIGZ1dHVyZS1wcm9vZiAoZ2l2ZW4gdGhhdCBpdCBpcyB1bmxpa2VseSB0aGF0XG4gIC8vICAgICAgIHRoZXkgd2lsbCBpbnRyb2R1Y2UgZmFsc2UgcG9zaXRpdmVzKS5cbiAgbGV0IGZuTmFtZTogc3RyaW5nfG51bGwgPSBudWxsO1xuICBpZiAodHMuaXNJZGVudGlmaWVyKHN0bXQuZXhwcmVzc2lvbi5leHByZXNzaW9uKSkge1xuICAgIC8vIFN0YXRlbWVudCBvZiB0aGUgZm9ybSBgc29tZUZuKC4uLilgLlxuICAgIGZuTmFtZSA9IHN0bXQuZXhwcmVzc2lvbi5leHByZXNzaW9uLnRleHQ7XG4gIH0gZWxzZSBpZiAoXG4gICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihzdG10LmV4cHJlc3Npb24uZXhwcmVzc2lvbikgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihzdG10LmV4cHJlc3Npb24uZXhwcmVzc2lvbi5uYW1lKSkge1xuICAgIC8vIFN0YXRlbWVudCBvZiB0aGUgZm9ybSBgdHNsaWIuc29tZUZuKC4uLilgLlxuICAgIGZuTmFtZSA9IHN0bXQuZXhwcmVzc2lvbi5leHByZXNzaW9uLm5hbWUudGV4dDtcbiAgfVxuXG4gIC8vIEVuc3VyZSB0aGUgY2FsbGVkIGZ1bmN0aW9uIGlzIGVpdGhlciBgX19leHBvcnQoKWAgb3IgYF9fZXhwb3J0U3RhcigpYC5cbiAgaWYgKChmbk5hbWUgIT09ICdfX2V4cG9ydCcpICYmIChmbk5hbWUgIT09ICdfX2V4cG9ydFN0YXInKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIEVuc3VyZSB0aGVyZSBpcyBhdCBsZWFzdCBvbmUgYXJndW1lbnQuXG4gIC8vIChUaGUgZmlyc3QgYXJndW1lbnQgaXMgdGhlIGV4cG9ydGVkIHRoaW5nIGFuZCB0aGVyZSB3aWxsIGJlIGEgc2Vjb25kIGBleHBvcnRzYCBhcmd1bWVudCBpbiB0aGVcbiAgLy8gY2FzZSBvZiBpbXBvcnRlZCBoZWxwZXJzKS5cbiAgcmV0dXJuIHN0bXQuZXhwcmVzc2lvbi5hcmd1bWVudHMubGVuZ3RoID4gMDtcbn1cblxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIHN0YXRlbWVudCBpcyBhIHJlLWV4cG9ydCBvZiB0aGUgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIjxleHBvcnQtbmFtZT5cIixcbiAqICAgICB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gPGltcG9ydC1uYW1lPjsgfSB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEZWZpbmVQcm9wZXJ0eVJlZXhwb3J0U3RhdGVtZW50KHN0bXQ6IHRzLlN0YXRlbWVudCk6XG4gICAgc3RtdCBpcyBEZWZpbmVQcm9wZXJ0eVJlZXhwb3J0U3RhdGVtZW50IHtcbiAgaWYgKCF0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RtdCkgfHwgIXRzLmlzQ2FsbEV4cHJlc3Npb24oc3RtdC5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIENoZWNrIGZvciBPYmplY3QuZGVmaW5lUHJvcGVydHlcbiAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihzdG10LmV4cHJlc3Npb24uZXhwcmVzc2lvbikgfHxcbiAgICAgICF0cy5pc0lkZW50aWZpZXIoc3RtdC5leHByZXNzaW9uLmV4cHJlc3Npb24uZXhwcmVzc2lvbikgfHxcbiAgICAgIHN0bXQuZXhwcmVzc2lvbi5leHByZXNzaW9uLmV4cHJlc3Npb24udGV4dCAhPT0gJ09iamVjdCcgfHxcbiAgICAgICF0cy5pc0lkZW50aWZpZXIoc3RtdC5leHByZXNzaW9uLmV4cHJlc3Npb24ubmFtZSkgfHxcbiAgICAgIHN0bXQuZXhwcmVzc2lvbi5leHByZXNzaW9uLm5hbWUudGV4dCAhPT0gJ2RlZmluZVByb3BlcnR5Jykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IGFyZ3MgPSBzdG10LmV4cHJlc3Npb24uYXJndW1lbnRzO1xuICBpZiAoYXJncy5sZW5ndGggIT09IDMpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgZXhwb3J0c09iamVjdCA9IGFyZ3NbMF07XG4gIGlmICghdHMuaXNJZGVudGlmaWVyKGV4cG9ydHNPYmplY3QpIHx8IGV4cG9ydHNPYmplY3QudGV4dCAhPT0gJ2V4cG9ydHMnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgcHJvcGVydHlLZXkgPSBhcmdzWzFdO1xuICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbChwcm9wZXJ0eUtleSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCBwcm9wZXJ0eURlc2NyaXB0b3IgPSBhcmdzWzJdO1xuICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ocHJvcGVydHlEZXNjcmlwdG9yKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiAocHJvcGVydHlEZXNjcmlwdG9yLnByb3BlcnRpZXMuc29tZShcbiAgICAgIHByb3AgPT4gcHJvcC5uYW1lICE9PSB1bmRlZmluZWQgJiYgdHMuaXNJZGVudGlmaWVyKHByb3AubmFtZSkgJiYgcHJvcC5uYW1lLnRleHQgPT09ICdnZXQnKSk7XG59XG5cbi8qKlxuICogRXh0cmFjdCB0aGUgXCJ2YWx1ZVwiIG9mIHRoZSBnZXR0ZXIgaW4gYSBgZGVmaW5lUHJvcGVydHlgIHN0YXRlbWVudC5cbiAqXG4gKiBUaGlzIHdpbGwgcmV0dXJuIHRoZSBgdHMuRXhwcmVzc2lvbmAgdmFsdWUgb2YgYSBzaW5nbGUgYHJldHVybmAgc3RhdGVtZW50IGluIHRoZSBgZ2V0YCBtZXRob2RcbiAqIG9mIHRoZSBwcm9wZXJ0eSBkZWZpbml0aW9uIG9iamVjdCwgb3IgYG51bGxgIGlmIHRoYXQgaXMgbm90IHBvc3NpYmxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEdldHRlckZuRXhwcmVzc2lvbihzdGF0ZW1lbnQ6IERlZmluZVByb3BlcnR5UmVleHBvcnRTdGF0ZW1lbnQpOlxuICAgIHRzLkV4cHJlc3Npb258bnVsbCB7XG4gIGNvbnN0IGFyZ3MgPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5hcmd1bWVudHM7XG4gIGNvbnN0IGdldHRlckZuID0gYXJnc1syXS5wcm9wZXJ0aWVzLmZpbmQoXG4gICAgICBwcm9wID0+IHByb3AubmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcihwcm9wLm5hbWUpICYmIHByb3AubmFtZS50ZXh0ID09PSAnZ2V0Jyk7XG4gIGlmIChnZXR0ZXJGbiA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc1Byb3BlcnR5QXNzaWdubWVudChnZXR0ZXJGbikgfHxcbiAgICAgICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihnZXR0ZXJGbi5pbml0aWFsaXplcikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBnZXR0ZXJGbi5pbml0aWFsaXplci5ib2R5LnN0YXRlbWVudHNbMF07XG4gIGlmICghdHMuaXNSZXR1cm5TdGF0ZW1lbnQocmV0dXJuU3RhdGVtZW50KSB8fCByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uO1xufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBgdHMuTm9kZWAgcmVwcmVzZW50cyBhIGByZXF1aXJlKClgIGNhbGwsIGkuZS4gYW4gY2FsbCBleHByZXNzaW9uIG9mXG4gKiB0aGUgZm9ybTogYHJlcXVpcmUoJzxmb28+JylgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1JlcXVpcmVDYWxsKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIFJlcXVpcmVDYWxsIHtcbiAgcmV0dXJuIHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgJiYgdHMuaXNJZGVudGlmaWVyKG5vZGUuZXhwcmVzc2lvbikgJiZcbiAgICAgIG5vZGUuZXhwcmVzc2lvbi50ZXh0ID09PSAncmVxdWlyZScgJiYgbm9kZS5hcmd1bWVudHMubGVuZ3RoID09PSAxICYmXG4gICAgICB0cy5pc1N0cmluZ0xpdGVyYWwobm9kZS5hcmd1bWVudHNbMF0pO1xufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBgcGF0aGAgaXMgYW4gXCJleHRlcm5hbFwiIGltcG9ydC5cbiAqIEluIG90aGVyIHdvcmRzLCB0aGF0IGl0IGNvbWVzIGZyb20gYSBlbnRyeS1wb2ludCBvdXRzaWRlIHRoZSBjdXJyZW50IG9uZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRXh0ZXJuYWxJbXBvcnQocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAhL15cXC5cXC4/KFxcL3wkKS8udGVzdChwYXRoKTtcbn1cblxuLyoqXG4gKiBBIFVNRC9Db21tb25KUyBzdHlsZSBleHBvcnQgZGVjbGFyYXRpb24gb2YgdGhlIGZvcm0gYGV4cG9ydHMuPG5hbWU+YC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeHBvcnRzRGVjbGFyYXRpb24gZXh0ZW5kcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24ge1xuICBuYW1lOiB0cy5JZGVudGlmaWVyO1xuICBleHByZXNzaW9uOiB0cy5JZGVudGlmaWVyO1xuICBwYXJlbnQ6IEV4cG9ydHNBc3NpZ25tZW50O1xufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBgbm9kZWAgaXMgYSBwcm9wZXJ0eSBhY2Nlc3MgZXhwcmVzc2lvbiBvZiB0aGUgZm9ybVxuICogYGV4cG9ydHMuPGZvbz5gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFeHBvcnRzRGVjbGFyYXRpb24oZXhwcjogdHMuTm9kZSk6IGV4cHIgaXMgRXhwb3J0c0RlY2xhcmF0aW9uIHtcbiAgcmV0dXJuIGV4cHIucGFyZW50ICYmIGlzRXhwb3J0c0Fzc2lnbm1lbnQoZXhwci5wYXJlbnQpO1xufVxuXG4vKipcbiAqIEEgVU1EL0NvbW1vbkpTIHN0eWxlIGV4cG9ydCBhc3NpZ25tZW50IG9mIHRoZSBmb3JtIGBleHBvcnRzLjxmb28+ID0gPGJhcj5gLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEV4cG9ydHNBc3NpZ25tZW50IGV4dGVuZHMgdHMuQmluYXJ5RXhwcmVzc2lvbiB7XG4gIGxlZnQ6IEV4cG9ydHNEZWNsYXJhdGlvbjtcbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgYG5vZGVgIGlzIGFuIGFzc2lnbm1lbnQgZXhwcmVzc2lvbiBvZiB0aGUgZm9ybVxuICogYGV4cG9ydHMuPGZvbz4gPSA8YmFyPmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0V4cG9ydHNBc3NpZ25tZW50KGV4cHI6IHRzLk5vZGUpOiBleHByIGlzIEV4cG9ydHNBc3NpZ25tZW50IHtcbiAgcmV0dXJuIGlzQXNzaWdubWVudChleHByKSAmJiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihleHByLmxlZnQpICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIoZXhwci5sZWZ0LmV4cHJlc3Npb24pICYmIGV4cHIubGVmdC5leHByZXNzaW9uLnRleHQgPT09ICdleHBvcnRzJyAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKGV4cHIubGVmdC5uYW1lKTtcbn1cblxuLyoqXG4gKiBBbiBleHByZXNzaW9uIHN0YXRlbWVudCBvZiB0aGUgZm9ybSBgZXhwb3J0cy48Zm9vPiA9IDxiYXI+O2AuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXhwb3J0c1N0YXRlbWVudCBleHRlbmRzIHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQge1xuICBleHByZXNzaW9uOiBFeHBvcnRzQXNzaWdubWVudDtcbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgYHN0bXRgIGlzIGFuIGV4cHJlc3Npb24gc3RhdGVtZW50IG9mIHRoZSBmb3JtXG4gKiBgZXhwb3J0cy48Zm9vPiA9IDxiYXI+O2AuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0V4cG9ydHNTdGF0ZW1lbnQoc3RtdDogdHMuTm9kZSk6IHN0bXQgaXMgRXhwb3J0c1N0YXRlbWVudCB7XG4gIHJldHVybiB0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RtdCkgJiYgaXNFeHBvcnRzQXNzaWdubWVudChzdG10LmV4cHJlc3Npb24pO1xufVxuXG4vKipcbiAqIEZpbmQgdGhlIGZhciByaWdodCBoYW5kIHNpZGUgb2YgYSBzZXF1ZW5jZSBvZiBhbGlhc2VkIGFzc2lnbmVtZW50cyBvZiB0aGUgZm9ybVxuICpcbiAqIGBgYFxuICogZXhwb3J0cy5NeUNsYXNzID0gYWxpYXMxID0gYWxpYXMyID0gPDxkZWNsYXJhdGlvbj4+XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gbm9kZSB0aGUgZXhwcmVzc2lvbiB0byBwYXJzZVxuICogQHJldHVybnMgdGhlIG9yaWdpbmFsIGBub2RlYCBvciB0aGUgZmFyIHJpZ2h0IGV4cHJlc3Npb24gb2YgYSBzZXJpZXMgb2YgYXNzaWdubWVudHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBza2lwQWxpYXNlcyhub2RlOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIHdoaWxlIChpc0Fzc2lnbm1lbnQobm9kZSkpIHtcbiAgICBub2RlID0gbm9kZS5yaWdodDtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn1cbiJdfQ==