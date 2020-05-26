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
        define("@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isExternalImport = exports.isRequireCall = exports.extractGetterFnExpression = exports.isDefinePropertyReexportStatement = exports.isWildcardReexportStatement = exports.isExportStatement = exports.findRequireCallReference = exports.findNamespaceOfIdentifier = void 0;
    var ts = require("typescript");
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
        var symbol = checker.getSymbolAtLocation(id) || null;
        var declaration = symbol && symbol.valueDeclaration;
        var initializer = declaration && ts.isVariableDeclaration(declaration) && declaration.initializer || null;
        return initializer && isRequireCall(initializer) ? initializer : null;
    }
    exports.findRequireCallReference = findRequireCallReference;
    /**
     * Check whether the specified `ts.Statement` is an export statement, i.e. an expression statement
     * of the form: `exports.<foo> = <bar>`
     */
    function isExportStatement(stmt) {
        return ts.isExpressionStatement(stmt) && ts.isBinaryExpression(stmt.expression) &&
            (stmt.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) &&
            ts.isPropertyAccessExpression(stmt.expression.left) &&
            ts.isIdentifier(stmt.expression.left.expression) &&
            stmt.expression.left.expression.text === 'exports';
    }
    exports.isExportStatement = isExportStatement;
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
    function isExternalImport(path) {
        return !/^\.\.?(\/|$)/.test(path);
    }
    exports.isExternalImport = isExternalImport;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfdW1kX3V0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvY29tbW9uanNfdW1kX3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQTBEakM7Ozs7T0FJRztJQUNILFNBQWdCLHlCQUF5QixDQUFDLEVBQWlCO1FBQ3pELE9BQU8sRUFBRSxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsMEJBQTBCLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUU7WUFDN0UsRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDM0MsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN0QixJQUFJLENBQUM7SUFDWCxDQUFDO0lBTEQsOERBS0M7SUFFRDs7OztPQUlHO0lBQ0gsU0FBZ0Isd0JBQXdCLENBQUMsRUFBaUIsRUFBRSxPQUF1QjtRQUVqRixJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDO1FBQ3ZELElBQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7UUFDdEQsSUFBTSxXQUFXLEdBQ2IsV0FBVyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxXQUFXLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQztRQUM1RixPQUFPLFdBQVcsSUFBSSxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3hFLENBQUM7SUFQRCw0REFPQztJ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QyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUpELHNDQUlDO0lBRUQsU0FBZ0IsZ0JBQWdCLENBQUMsSUFBWTtRQUMzQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRkQsNENBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgRXhwb3J0RGVjbGFyYXRpb24ge1xuICBuYW1lOiBzdHJpbmc7XG4gIGRlY2xhcmF0aW9uOiBEZWNsYXJhdGlvbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFeHBvcnRTdGF0ZW1lbnQgZXh0ZW5kcyB0cy5FeHByZXNzaW9uU3RhdGVtZW50IHtcbiAgZXhwcmVzc2lvbjogdHMuQmluYXJ5RXhwcmVzc2lvbiZ7XG4gICAgbGVmdDogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uICZcbiAgICAgICAge1xuICAgICAgICAgIGV4cHJlc3Npb246IHRzLklkZW50aWZpZXJcbiAgICAgICAgfVxuICB9O1xufVxuXG4vKipcbiAqIEEgQ29tbW9uSlMgb3IgVU1EIHdpbGRjYXJkIHJlLWV4cG9ydCBzdGF0ZW1lbnQuXG4gKlxuICogVGhlIENvbW1vbkpTIG9yIFVNRCB2ZXJzaW9uIG9mIGBleHBvcnQgKiBmcm9tICdibGFoJztgLlxuICpcbiAqIFRoZXNlIHN0YXRlbWVudHMgY2FuIGhhdmUgc2V2ZXJhbCBmb3JtcyAoZGVwZW5kaW5nLCBmb3IgZXhhbXBsZSwgb24gd2hldGhlclxuICogdGhlIFR5cGVTY3JpcHQgaGVscGVycyBhcmUgaW1wb3J0ZWQgb3IgZW1pdHRlZCBpbmxpbmUpLiBUaGUgZXhwcmVzc2lvbiBjYW4gaGF2ZSBvbmUgb2YgdGhlXG4gKiBmb2xsb3dpbmcgZm9ybXM6XG4gKiAtIGBfX2V4cG9ydChmaXJzdEFyZylgXG4gKiAtIGBfX2V4cG9ydFN0YXIoZmlyc3RBcmcpYFxuICogLSBgdHNsaWIuX19leHBvcnQoZmlyc3RBcmcsIGV4cG9ydHMpYFxuICogLSBgdHNsaWIuX19leHBvcnRTdGFyKGZpcnN0QXJnLCBleHBvcnRzKWBcbiAqXG4gKiBJbiBhbGwgY2FzZXMsIHdlIG9ubHkgY2FyZSBhYm91dCBgZmlyc3RBcmdgLCB3aGljaCBpcyB0aGUgZmlyc3QgYXJndW1lbnQgb2YgdGhlIHJlLWV4cG9ydCBjYWxsXG4gKiBleHByZXNzaW9uIGFuZCBjYW4gYmUgZWl0aGVyIGEgYHJlcXVpcmUoJy4uLicpYCBjYWxsIG9yIGFuIGlkZW50aWZpZXIgKGluaXRpYWxpemVkIHZpYSBhXG4gKiBgcmVxdWlyZSgnLi4uJylgIGNhbGwpLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdpbGRjYXJkUmVleHBvcnRTdGF0ZW1lbnQgZXh0ZW5kcyB0cy5FeHByZXNzaW9uU3RhdGVtZW50IHtcbiAgZXhwcmVzc2lvbjogdHMuQ2FsbEV4cHJlc3Npb247XG59XG5cbi8qKlxuICogQSBDb21tb25KUyBvciBVTUQgcmUtZXhwb3J0IHN0YXRlbWVudCB1c2luZyBhbiBgT2JqZWN0LmRlZmluZVByb3BlcnR5KClgIGNhbGwuXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIjxleHBvcnRlZC1pZD5cIixcbiAqICAgICB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gPGltcG9ydGVkLWlkPjsgfSB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERlZmluZVByb3BlcnR5UmVleHBvcnRTdGF0ZW1lbnQgZXh0ZW5kcyB0cy5FeHByZXNzaW9uU3RhdGVtZW50IHtcbiAgZXhwcmVzc2lvbjogdHMuQ2FsbEV4cHJlc3Npb24mXG4gICAgICB7YXJndW1lbnRzOiBbdHMuSWRlbnRpZmllciwgdHMuU3RyaW5nTGl0ZXJhbCwgdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb25dfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXF1aXJlQ2FsbCBleHRlbmRzIHRzLkNhbGxFeHByZXNzaW9uIHtcbiAgYXJndW1lbnRzOiB0cy5DYWxsRXhwcmVzc2lvblsnYXJndW1lbnRzJ10mW3RzLlN0cmluZ0xpdGVyYWxdO1xufVxuXG5cbi8qKlxuICogUmV0dXJuIHRoZSBcIm5hbWVzcGFjZVwiIG9mIHRoZSBzcGVjaWZpZWQgYHRzLklkZW50aWZpZXJgIGlmIHRoZSBpZGVudGlmaWVyIGlzIHRoZSBSSFMgb2YgYVxuICogcHJvcGVydHkgYWNjZXNzIGV4cHJlc3Npb24sIGkuZS4gYW4gZXhwcmVzc2lvbiBvZiB0aGUgZm9ybSBgPG5hbWVzcGFjZT4uPGlkPmAgKGluIHdoaWNoIGNhc2UgYVxuICogYHRzLklkZW50aWZpZXJgIGNvcnJlc3BvbmRpbmcgdG8gYDxuYW1lc3BhY2U+YCB3aWxsIGJlIHJldHVybmVkKS4gT3RoZXJ3aXNlIHJldHVybiBgbnVsbGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTmFtZXNwYWNlT2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgcmV0dXJuIGlkLnBhcmVudCAmJiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihpZC5wYXJlbnQpICYmIGlkLnBhcmVudC5uYW1lID09PSBpZCAmJlxuICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihpZC5wYXJlbnQuZXhwcmVzc2lvbikgP1xuICAgICAgaWQucGFyZW50LmV4cHJlc3Npb24gOlxuICAgICAgbnVsbDtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIGBSZXF1aXJlQ2FsbGAgdGhhdCBpcyB1c2VkIHRvIGluaXRpYWxpemUgdGhlIHNwZWNpZmllZCBgdHMuSWRlbnRpZmllcmAsIGlmIHRoZVxuICogc3BlY2lmaWVkIGluZGVudGlmaWVyIHdhcyBpbmRlZWQgaW5pdGlhbGl6ZWQgd2l0aCBhIHJlcXVpcmUgY2FsbCBpbiBhIGRlY2xhcmF0aW9uIG9mIHRoZSBmb3JtOlxuICogYHZhciA8aWQ+ID0gcmVxdWlyZSgnLi4uJylgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUmVxdWlyZUNhbGxSZWZlcmVuY2UoaWQ6IHRzLklkZW50aWZpZXIsIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKTogUmVxdWlyZUNhbGx8XG4gICAgbnVsbCB7XG4gIGNvbnN0IHN5bWJvbCA9IGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpZCkgfHwgbnVsbDtcbiAgY29uc3QgZGVjbGFyYXRpb24gPSBzeW1ib2wgJiYgc3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gIGNvbnN0IGluaXRpYWxpemVyID1cbiAgICAgIGRlY2xhcmF0aW9uICYmIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgJiYgZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgfHwgbnVsbDtcbiAgcmV0dXJuIGluaXRpYWxpemVyICYmIGlzUmVxdWlyZUNhbGwoaW5pdGlhbGl6ZXIpID8gaW5pdGlhbGl6ZXIgOiBudWxsO1xufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBgdHMuU3RhdGVtZW50YCBpcyBhbiBleHBvcnQgc3RhdGVtZW50LCBpLmUuIGFuIGV4cHJlc3Npb24gc3RhdGVtZW50XG4gKiBvZiB0aGUgZm9ybTogYGV4cG9ydHMuPGZvbz4gPSA8YmFyPmBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRXhwb3J0U3RhdGVtZW50KHN0bXQ6IHRzLlN0YXRlbWVudCk6IHN0bXQgaXMgRXhwb3J0U3RhdGVtZW50IHtcbiAgcmV0dXJuIHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdG10KSAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24oc3RtdC5leHByZXNzaW9uKSAmJlxuICAgICAgKHN0bXQuZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4pICYmXG4gICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihzdG10LmV4cHJlc3Npb24ubGVmdCkgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihzdG10LmV4cHJlc3Npb24ubGVmdC5leHByZXNzaW9uKSAmJlxuICAgICAgc3RtdC5leHByZXNzaW9uLmxlZnQuZXhwcmVzc2lvbi50ZXh0ID09PSAnZXhwb3J0cyc7XG59XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciB0aGUgc3BlY2lmaWVkIGB0cy5TdGF0ZW1lbnRgIGlzIGEgd2lsZGNhcmQgcmUtZXhwb3J0IHN0YXRlbWVudC5cbiAqIEkuRS4gYW4gZXhwcmVzc2lvbiBzdGF0ZW1lbnQgb2Ygb25lIG9mIHRoZSBmb2xsb3dpbmcgZm9ybXM6XG4gKiAtIGBfX2V4cG9ydCg8Zm9vPilgXG4gKiAtIGBfX2V4cG9ydFN0YXIoPGZvbz4pYFxuICogLSBgdHNsaWIuX19leHBvcnQoPGZvbz4sIGV4cG9ydHMpYFxuICogLSBgdHNsaWIuX19leHBvcnRTdGFyKDxmb28+LCBleHBvcnRzKWBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2lsZGNhcmRSZWV4cG9ydFN0YXRlbWVudChzdG10OiB0cy5TdGF0ZW1lbnQpOiBzdG10IGlzIFdpbGRjYXJkUmVleHBvcnRTdGF0ZW1lbnQge1xuICAvLyBFbnN1cmUgaXQgaXMgYSBjYWxsIGV4cHJlc3Npb24gc3RhdGVtZW50LlxuICBpZiAoIXRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdG10KSB8fCAhdHMuaXNDYWxsRXhwcmVzc2lvbihzdG10LmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gR2V0IHRoZSBjYWxsZWQgZnVuY3Rpb24gaWRlbnRpZmllci5cbiAgLy8gTk9URTogQ3VycmVudGx5LCBpdCBzZWVtcyB0aGF0IGBfX2V4cG9ydCgpYCBpcyB1c2VkIHdoZW4gZW1pdHRpbmcgaGVscGVycyBpbmxpbmUgYW5kXG4gIC8vICAgICAgIGBfX2V4cG9ydFN0YXIoKWAgd2hlbiBpbXBvcnRpbmcgdGhlbVxuICAvLyAgICAgICAoW3NvdXJjZV0oaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvZDdjODNmMDIzL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvbW9kdWxlL21vZHVsZS50cyNMMTc5Ni1MMTc5NykpLlxuICAvLyAgICAgICBTbywgdGhlb3JldGljYWxseSwgd2Ugb25seSBjYXJlIGFib3V0IHRoZSBmb3JtYXRzIGBfX2V4cG9ydCg8Zm9vPilgIGFuZFxuICAvLyAgICAgICBgdHNsaWIuX19leHBvcnRTdGFyKDxmb28+LCBleHBvcnRzKWAuXG4gIC8vICAgICAgIFRoZSBjdXJyZW50IGltcGxlbWVudGF0aW9uIGFjY2VwdHMgdGhlIG90aGVyIHR3byBmb3JtYXRzIChgX19leHBvcnRTdGFyKC4uLilgIGFuZFxuICAvLyAgICAgICBgdHNsaWIuX19leHBvcnQoLi4uKWApIGFzIHdlbGwgdG8gYmUgbW9yZSBmdXR1cmUtcHJvb2YgKGdpdmVuIHRoYXQgaXQgaXMgdW5saWtlbHkgdGhhdFxuICAvLyAgICAgICB0aGV5IHdpbGwgaW50cm9kdWNlIGZhbHNlIHBvc2l0aXZlcykuXG4gIGxldCBmbk5hbWU6IHN0cmluZ3xudWxsID0gbnVsbDtcbiAgaWYgKHRzLmlzSWRlbnRpZmllcihzdG10LmV4cHJlc3Npb24uZXhwcmVzc2lvbikpIHtcbiAgICAvLyBTdGF0ZW1lbnQgb2YgdGhlIGZvcm0gYHNvbWVGbiguLi4pYC5cbiAgICBmbk5hbWUgPSBzdG10LmV4cHJlc3Npb24uZXhwcmVzc2lvbi50ZXh0O1xuICB9IGVsc2UgaWYgKFxuICAgICAgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oc3RtdC5leHByZXNzaW9uLmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIoc3RtdC5leHByZXNzaW9uLmV4cHJlc3Npb24ubmFtZSkpIHtcbiAgICAvLyBTdGF0ZW1lbnQgb2YgdGhlIGZvcm0gYHRzbGliLnNvbWVGbiguLi4pYC5cbiAgICBmbk5hbWUgPSBzdG10LmV4cHJlc3Npb24uZXhwcmVzc2lvbi5uYW1lLnRleHQ7XG4gIH1cblxuICAvLyBFbnN1cmUgdGhlIGNhbGxlZCBmdW5jdGlvbiBpcyBlaXRoZXIgYF9fZXhwb3J0KClgIG9yIGBfX2V4cG9ydFN0YXIoKWAuXG4gIGlmICgoZm5OYW1lICE9PSAnX19leHBvcnQnKSAmJiAoZm5OYW1lICE9PSAnX19leHBvcnRTdGFyJykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBFbnN1cmUgdGhlcmUgaXMgYXQgbGVhc3Qgb25lIGFyZ3VtZW50LlxuICAvLyAoVGhlIGZpcnN0IGFyZ3VtZW50IGlzIHRoZSBleHBvcnRlZCB0aGluZyBhbmQgdGhlcmUgd2lsbCBiZSBhIHNlY29uZCBgZXhwb3J0c2AgYXJndW1lbnQgaW4gdGhlXG4gIC8vIGNhc2Ugb2YgaW1wb3J0ZWQgaGVscGVycykuXG4gIHJldHVybiBzdG10LmV4cHJlc3Npb24uYXJndW1lbnRzLmxlbmd0aCA+IDA7XG59XG5cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBzdGF0ZW1lbnQgaXMgYSByZS1leHBvcnQgb2YgdGhlIGZvcm06XG4gKlxuICogYGBgXG4gKiBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCI8ZXhwb3J0LW5hbWU+XCIsXG4gKiAgICAgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDxpbXBvcnQtbmFtZT47IH0gfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRGVmaW5lUHJvcGVydHlSZWV4cG9ydFN0YXRlbWVudChzdG10OiB0cy5TdGF0ZW1lbnQpOlxuICAgIHN0bXQgaXMgRGVmaW5lUHJvcGVydHlSZWV4cG9ydFN0YXRlbWVudCB7XG4gIGlmICghdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0bXQpIHx8ICF0cy5pc0NhbGxFeHByZXNzaW9uKHN0bXQuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBDaGVjayBmb3IgT2JqZWN0LmRlZmluZVByb3BlcnR5XG4gIGlmICghdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oc3RtdC5leHByZXNzaW9uLmV4cHJlc3Npb24pIHx8XG4gICAgICAhdHMuaXNJZGVudGlmaWVyKHN0bXQuZXhwcmVzc2lvbi5leHByZXNzaW9uLmV4cHJlc3Npb24pIHx8XG4gICAgICBzdG10LmV4cHJlc3Npb24uZXhwcmVzc2lvbi5leHByZXNzaW9uLnRleHQgIT09ICdPYmplY3QnIHx8XG4gICAgICAhdHMuaXNJZGVudGlmaWVyKHN0bXQuZXhwcmVzc2lvbi5leHByZXNzaW9uLm5hbWUpIHx8XG4gICAgICBzdG10LmV4cHJlc3Npb24uZXhwcmVzc2lvbi5uYW1lLnRleHQgIT09ICdkZWZpbmVQcm9wZXJ0eScpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCBhcmdzID0gc3RtdC5leHByZXNzaW9uLmFyZ3VtZW50cztcbiAgaWYgKGFyZ3MubGVuZ3RoICE9PSAzKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IGV4cG9ydHNPYmplY3QgPSBhcmdzWzBdO1xuICBpZiAoIXRzLmlzSWRlbnRpZmllcihleHBvcnRzT2JqZWN0KSB8fCBleHBvcnRzT2JqZWN0LnRleHQgIT09ICdleHBvcnRzJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IHByb3BlcnR5S2V5ID0gYXJnc1sxXTtcbiAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwocHJvcGVydHlLZXkpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgcHJvcGVydHlEZXNjcmlwdG9yID0gYXJnc1syXTtcbiAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHByb3BlcnR5RGVzY3JpcHRvcikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gKHByb3BlcnR5RGVzY3JpcHRvci5wcm9wZXJ0aWVzLnNvbWUoXG4gICAgICBwcm9wID0+IHByb3AubmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcihwcm9wLm5hbWUpICYmIHByb3AubmFtZS50ZXh0ID09PSAnZ2V0JykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEdldHRlckZuRXhwcmVzc2lvbihzdGF0ZW1lbnQ6IERlZmluZVByb3BlcnR5UmVleHBvcnRTdGF0ZW1lbnQpOlxuICAgIHRzLkV4cHJlc3Npb258bnVsbCB7XG4gIGNvbnN0IGFyZ3MgPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5hcmd1bWVudHM7XG4gIGNvbnN0IGdldHRlckZuID0gYXJnc1syXS5wcm9wZXJ0aWVzLmZpbmQoXG4gICAgICBwcm9wID0+IHByb3AubmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcihwcm9wLm5hbWUpICYmIHByb3AubmFtZS50ZXh0ID09PSAnZ2V0Jyk7XG4gIGlmIChnZXR0ZXJGbiA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc1Byb3BlcnR5QXNzaWdubWVudChnZXR0ZXJGbikgfHxcbiAgICAgICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihnZXR0ZXJGbi5pbml0aWFsaXplcikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBnZXR0ZXJGbi5pbml0aWFsaXplci5ib2R5LnN0YXRlbWVudHNbMF07XG4gIGlmICghdHMuaXNSZXR1cm5TdGF0ZW1lbnQocmV0dXJuU3RhdGVtZW50KSB8fCByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uO1xufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBgdHMuTm9kZWAgcmVwcmVzZW50cyBhIGByZXF1aXJlKClgIGNhbGwsIGkuZS4gYW4gY2FsbCBleHByZXNzaW9uIG9mXG4gKiB0aGUgZm9ybTogYHJlcXVpcmUoJzxmb28+JylgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1JlcXVpcmVDYWxsKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIFJlcXVpcmVDYWxsIHtcbiAgcmV0dXJuIHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgJiYgdHMuaXNJZGVudGlmaWVyKG5vZGUuZXhwcmVzc2lvbikgJiZcbiAgICAgIG5vZGUuZXhwcmVzc2lvbi50ZXh0ID09PSAncmVxdWlyZScgJiYgbm9kZS5hcmd1bWVudHMubGVuZ3RoID09PSAxICYmXG4gICAgICB0cy5pc1N0cmluZ0xpdGVyYWwobm9kZS5hcmd1bWVudHNbMF0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFeHRlcm5hbEltcG9ydChwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuICEvXlxcLlxcLj8oXFwvfCQpLy50ZXN0KHBhdGgpO1xufSJdfQ==