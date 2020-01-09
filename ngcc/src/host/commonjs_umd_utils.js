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
    var ts = require("typescript");
    /**
     * Return the "namespace" of the specified `ts.Identifier` if the identifier is the RHS of a
     * property access expression, i.e. an expression of the form `<namespace>.<id>` (in which case a
     * `ts.Identifier` corresponding to `<namespace>` will be returned). Otherwise return `null`.
     */
    function findNamespaceOfIdentifier(id) {
        return id.parent && ts.isPropertyAccessExpression(id.parent) &&
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
     * of the form: `export.<foo> = <bar>`
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
     * Check whether the specified `ts.Statement` is a re-export statement, i.e. an expression statement
     * of the form: `__export(<foo>)`
     */
    function isReexportStatement(stmt) {
        return ts.isExpressionStatement(stmt) && ts.isCallExpression(stmt.expression) &&
            ts.isIdentifier(stmt.expression.expression) &&
            stmt.expression.expression.text === '__export' && stmt.expression.arguments.length === 1;
    }
    exports.isReexportStatement = isReexportStatement;
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfdW1kX3V0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvY29tbW9uanNfdW1kX3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBb0JqQzs7OztPQUlHO0lBQ0gsU0FBZ0IseUJBQXlCLENBQUMsRUFBaUI7UUFDekQsT0FBTyxFQUFFLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDO1lBQ3BELEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQzNDLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDO0lBQ1gsQ0FBQztJQUxELDhEQUtDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQWdCLHdCQUF3QixDQUFDLEVBQWlCLEVBQUUsT0FBdUI7UUFFakYsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQztRQUN2RCxJQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksTUFBTSxDQUFDLGdCQUFnQixDQUFDO1FBQ3RELElBQU0sV0FBVyxHQUNiLFdBQVcsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLElBQUksV0FBVyxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUM7UUFDNUYsT0FBTyxXQUFXLElBQUksYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUN4RSxDQUFDO0lBUEQsNERBT0M7SUFFRDs7O09BR0c7SUFDSCxTQUFnQixpQkFBaUIsQ0FBQyxJQUFrQjtRQUNsRCxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUMzRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUNsRSxFQUFFLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDbkQsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDaEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxTQUFTLENBQUM7SUFDekQsQ0FBQztJQU5ELDhDQU1DO0lBRUQ7OztPQUdHO0lBQ0gsU0FBZ0IsbUJBQW1CLENBQUMsSUFBa0I7UUFDcEQsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDekUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztZQUMzQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssVUFBVSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7SUFDL0YsQ0FBQztJQUpELGtEQUlDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBZ0IsYUFBYSxDQUFDLElBQWE7UUFDekMsT0FBTyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ2hFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQ2pFLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFKRCxzQ0FJQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5cblxuZXhwb3J0IGludGVyZmFjZSBFeHBvcnREZWNsYXJhdGlvbiB7XG4gIG5hbWU6IHN0cmluZztcbiAgZGVjbGFyYXRpb246IERlY2xhcmF0aW9uO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEV4cG9ydFN0YXRlbWVudCBleHRlbmRzIHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQge1xuICBleHByZXNzaW9uOiB0cy5CaW5hcnlFeHByZXNzaW9uJntsZWZ0OiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gJiB7ZXhwcmVzc2lvbjogdHMuSWRlbnRpZmllcn19O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlZXhwb3J0U3RhdGVtZW50IGV4dGVuZHMgdHMuRXhwcmVzc2lvblN0YXRlbWVudCB7IGV4cHJlc3Npb246IHRzLkNhbGxFeHByZXNzaW9uOyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVxdWlyZUNhbGwgZXh0ZW5kcyB0cy5DYWxsRXhwcmVzc2lvbiB7XG4gIGFyZ3VtZW50czogdHMuQ2FsbEV4cHJlc3Npb25bJ2FyZ3VtZW50cyddJlt0cy5TdHJpbmdMaXRlcmFsXTtcbn1cblxuXG4vKipcbiAqIFJldHVybiB0aGUgXCJuYW1lc3BhY2VcIiBvZiB0aGUgc3BlY2lmaWVkIGB0cy5JZGVudGlmaWVyYCBpZiB0aGUgaWRlbnRpZmllciBpcyB0aGUgUkhTIG9mIGFcbiAqIHByb3BlcnR5IGFjY2VzcyBleHByZXNzaW9uLCBpLmUuIGFuIGV4cHJlc3Npb24gb2YgdGhlIGZvcm0gYDxuYW1lc3BhY2U+LjxpZD5gIChpbiB3aGljaCBjYXNlIGFcbiAqIGB0cy5JZGVudGlmaWVyYCBjb3JyZXNwb25kaW5nIHRvIGA8bmFtZXNwYWNlPmAgd2lsbCBiZSByZXR1cm5lZCkuIE90aGVyd2lzZSByZXR1cm4gYG51bGxgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZE5hbWVzcGFjZU9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIHJldHVybiBpZC5wYXJlbnQgJiYgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oaWQucGFyZW50KSAmJlxuICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihpZC5wYXJlbnQuZXhwcmVzc2lvbikgP1xuICAgICAgaWQucGFyZW50LmV4cHJlc3Npb24gOlxuICAgICAgbnVsbDtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIGBSZXF1aXJlQ2FsbGAgdGhhdCBpcyB1c2VkIHRvIGluaXRpYWxpemUgdGhlIHNwZWNpZmllZCBgdHMuSWRlbnRpZmllcmAsIGlmIHRoZVxuICogc3BlY2lmaWVkIGluZGVudGlmaWVyIHdhcyBpbmRlZWQgaW5pdGlhbGl6ZWQgd2l0aCBhIHJlcXVpcmUgY2FsbCBpbiBhIGRlY2xhcmF0aW9uIG9mIHRoZSBmb3JtOlxuICogYHZhciA8aWQ+ID0gcmVxdWlyZSgnLi4uJylgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUmVxdWlyZUNhbGxSZWZlcmVuY2UoaWQ6IHRzLklkZW50aWZpZXIsIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKTogUmVxdWlyZUNhbGx8XG4gICAgbnVsbCB7XG4gIGNvbnN0IHN5bWJvbCA9IGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpZCkgfHwgbnVsbDtcbiAgY29uc3QgZGVjbGFyYXRpb24gPSBzeW1ib2wgJiYgc3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gIGNvbnN0IGluaXRpYWxpemVyID1cbiAgICAgIGRlY2xhcmF0aW9uICYmIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgJiYgZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgfHwgbnVsbDtcbiAgcmV0dXJuIGluaXRpYWxpemVyICYmIGlzUmVxdWlyZUNhbGwoaW5pdGlhbGl6ZXIpID8gaW5pdGlhbGl6ZXIgOiBudWxsO1xufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBgdHMuU3RhdGVtZW50YCBpcyBhbiBleHBvcnQgc3RhdGVtZW50LCBpLmUuIGFuIGV4cHJlc3Npb24gc3RhdGVtZW50XG4gKiBvZiB0aGUgZm9ybTogYGV4cG9ydC48Zm9vPiA9IDxiYXI+YFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFeHBvcnRTdGF0ZW1lbnQoc3RtdDogdHMuU3RhdGVtZW50KTogc3RtdCBpcyBFeHBvcnRTdGF0ZW1lbnQge1xuICByZXR1cm4gdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0bXQpICYmIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihzdG10LmV4cHJlc3Npb24pICYmXG4gICAgICAoc3RtdC5leHByZXNzaW9uLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbikgJiZcbiAgICAgIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHN0bXQuZXhwcmVzc2lvbi5sZWZ0KSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHN0bXQuZXhwcmVzc2lvbi5sZWZ0LmV4cHJlc3Npb24pICYmXG4gICAgICBzdG10LmV4cHJlc3Npb24ubGVmdC5leHByZXNzaW9uLnRleHQgPT09ICdleHBvcnRzJztcbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgYHRzLlN0YXRlbWVudGAgaXMgYSByZS1leHBvcnQgc3RhdGVtZW50LCBpLmUuIGFuIGV4cHJlc3Npb24gc3RhdGVtZW50XG4gKiBvZiB0aGUgZm9ybTogYF9fZXhwb3J0KDxmb28+KWBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVleHBvcnRTdGF0ZW1lbnQoc3RtdDogdHMuU3RhdGVtZW50KTogc3RtdCBpcyBSZWV4cG9ydFN0YXRlbWVudCB7XG4gIHJldHVybiB0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RtdCkgJiYgdHMuaXNDYWxsRXhwcmVzc2lvbihzdG10LmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIoc3RtdC5leHByZXNzaW9uLmV4cHJlc3Npb24pICYmXG4gICAgICBzdG10LmV4cHJlc3Npb24uZXhwcmVzc2lvbi50ZXh0ID09PSAnX19leHBvcnQnICYmIHN0bXQuZXhwcmVzc2lvbi5hcmd1bWVudHMubGVuZ3RoID09PSAxO1xufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBgdHMuTm9kZWAgcmVwcmVzZW50cyBhIGByZXF1aXJlKClgIGNhbGwsIGkuZS4gYW4gY2FsbCBleHByZXNzaW9uIG9mXG4gKiB0aGUgZm9ybTogYHJlcXVpcmUoJzxmb28+JylgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1JlcXVpcmVDYWxsKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIFJlcXVpcmVDYWxsIHtcbiAgcmV0dXJuIHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgJiYgdHMuaXNJZGVudGlmaWVyKG5vZGUuZXhwcmVzc2lvbikgJiZcbiAgICAgIG5vZGUuZXhwcmVzc2lvbi50ZXh0ID09PSAncmVxdWlyZScgJiYgbm9kZS5hcmd1bWVudHMubGVuZ3RoID09PSAxICYmXG4gICAgICB0cy5pc1N0cmluZ0xpdGVyYWwobm9kZS5hcmd1bWVudHNbMF0pO1xufVxuIl19