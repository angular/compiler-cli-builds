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
        define("@angular/compiler-cli/src/ngtsc/metadata/src/reflector", ["require", "exports", "tslib", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    /**
     * Reflect a `ts.ClassDeclaration` and determine the list of parameters.
     *
     * Note that this only reflects the referenced class and not any potential parent class - that must
     * be handled by the caller.
     *
     * @param node the `ts.ClassDeclaration` to reflect
     * @param checker a `ts.TypeChecker` used for reflection
     * @returns a `Parameter` instance for each argument of the constructor, or `null` if no constructor
     */
    function reflectConstructorParameters(node, checker) {
        // Firstly, look for a constructor.
        // clang-format off
        var maybeCtor = node
            .members
            .filter(function (element) { return ts.isConstructorDeclaration(element); });
        // clang-format on
        if (maybeCtor.length !== 1) {
            // No constructor.
            return null;
        }
        // Reflect each parameter.
        return maybeCtor[0].parameters.map(function (param) { return reflectParameter(param, checker); });
    }
    exports.reflectConstructorParameters = reflectConstructorParameters;
    /**
     * Reflect a `ts.ParameterDeclaration` and determine its name, a token which refers to the value
     * declaration of its type (if possible to statically determine), and its decorators, if any.
     */
    function reflectParameter(node, checker) {
        // The name of the parameter is easy.
        var name = node.name;
        var decorators = node.decorators &&
            node.decorators.map(function (decorator) { return reflectDecorator(decorator, checker); })
                .filter(function (decorator) { return decorator !== null; }) ||
            [];
        // It may or may not be possible to write an expression that refers to the value side of the
        // type named for the parameter.
        var typeValueExpr = null;
        // It's not possible to get a value expression if the parameter doesn't even have a type.
        if (node.type !== undefined) {
            // It's only valid to convert a type reference to a value reference if the type actually has a
            // value declaration associated with it.
            var type = checker.getTypeFromTypeNode(node.type);
            if (type.symbol !== undefined && type.symbol.valueDeclaration !== undefined) {
                // The type points to a valid value declaration. Rewrite the TypeReference into an Expression
                // which references the value pointed to by the TypeReference, if possible.
                typeValueExpr = typeNodeToValueExpr(node.type);
            }
        }
        return {
            name: name, typeValueExpr: typeValueExpr, decorators: decorators,
        };
    }
    /**
     * Reflect a decorator and return a structure describing where it comes from and any arguments.
     *
     * Only imported decorators are considered, not locally defined decorators.
     */
    function reflectDecorator(decorator, checker) {
        // Attempt to resolve the decorator expression into a reference to a concrete Identifier. The
        // expression may contain a call to a function which returns the decorator function, in which
        // case we want to return the arguments.
        var decoratorOfInterest = decorator.expression;
        var args = [];
        // Check for call expressions.
        if (ts.isCallExpression(decoratorOfInterest)) {
            args = Array.from(decoratorOfInterest.arguments);
            decoratorOfInterest = decoratorOfInterest.expression;
        }
        // The final resolved decorator should be a `ts.Identifier` - if it's not, then something is
        // wrong and the decorator can't be resolved statically.
        if (!ts.isIdentifier(decoratorOfInterest)) {
            return null;
        }
        var importDecl = reflectImportedIdentifier(decoratorOfInterest, checker);
        if (importDecl === null) {
            return null;
        }
        return tslib_1.__assign({}, importDecl, { node: decorator, args: args });
    }
    exports.reflectDecorator = reflectDecorator;
    function typeNodeToValueExpr(node) {
        if (ts.isTypeReferenceNode(node)) {
            return entityNameToValue(node.typeName);
        }
        else {
            return null;
        }
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
    function propertyNameToValue(node) {
        if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
            return node.text;
        }
        else {
            return null;
        }
    }
    function reflectObjectLiteral(node) {
        var map = new Map();
        node.properties.forEach(function (prop) {
            if (ts.isPropertyAssignment(prop)) {
                var name_1 = propertyNameToValue(prop.name);
                if (name_1 === null) {
                    return;
                }
                map.set(name_1, prop.initializer);
            }
            else if (ts.isShorthandPropertyAssignment(prop)) {
                map.set(prop.name.text, prop.name);
            }
            else {
                return;
            }
        });
        return map;
    }
    exports.reflectObjectLiteral = reflectObjectLiteral;
    function reflectImportedIdentifier(id, checker) {
        var symbol = checker.getSymbolAtLocation(id);
        if (symbol === undefined || symbol.declarations === undefined ||
            symbol.declarations.length !== 1) {
            return null;
        }
        // Ignore decorators that are defined locally (not imported).
        var decl = symbol.declarations[0];
        if (!ts.isImportSpecifier(decl)) {
            return null;
        }
        // Walk back from the specifier to find the declaration, which carries the module specifier.
        var importDecl = decl.parent.parent.parent;
        // The module specifier is guaranteed to be a string literal, so this should always pass.
        if (!ts.isStringLiteral(importDecl.moduleSpecifier)) {
            // Not allowed to happen in TypeScript ASTs.
            return null;
        }
        // Read the module specifier.
        var from = importDecl.moduleSpecifier.text;
        // Compute the name by which the decorator was exported, not imported.
        var name = (decl.propertyName !== undefined ? decl.propertyName : decl.name).text;
        return { from: from, name: name };
    }
    exports.reflectImportedIdentifier = reflectImportedIdentifier;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmbGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9tZXRhZGF0YS9zcmMvcmVmbGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQXdEakM7Ozs7Ozs7OztPQVNHO0lBQ0gsc0NBQ0ksSUFBeUIsRUFBRSxPQUF1QjtRQUNwRCxtQ0FBbUM7UUFDbkMsbUJBQW1CO1FBQ25CLElBQU0sU0FBUyxHQUFnQyxJQUFJO2FBQ2hELE9BQU87YUFDUCxNQUFNLENBQUMsVUFBQSxPQUFPLElBQUksT0FBQSxFQUFFLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLEVBQXBDLENBQW9DLENBQWdDLENBQUM7UUFDMUYsa0JBQWtCO1FBRWxCLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDMUIsa0JBQWtCO1lBQ2xCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCwwQkFBMEI7UUFDMUIsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEtBQUssSUFBSSxPQUFBLGdCQUFnQixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsRUFBaEMsQ0FBZ0MsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFoQkQsb0VBZ0JDO0lBRUQ7OztPQUdHO0lBQ0gsMEJBQTBCLElBQTZCLEVBQUUsT0FBdUI7UUFDOUUscUNBQXFDO1FBQ3JDLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFFdkIsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVU7WUFDMUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEVBQXBDLENB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YjtRQUVELDZEQUE2RDtRQUM3RCxJQUFNLElBQUksR0FBbUIsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQy9CLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCw0RkFBNEY7UUFDNUYsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQVEsQ0FBQyxNQUFRLENBQUMsTUFBUSxDQUFDO1FBRW5ELHlGQUF5RjtRQUN6RixJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDbkQsNENBQTRDO1lBQzVDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCw2QkFBNkI7UUFDN0IsSUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7UUFFN0Msc0VBQXNFO1FBQ3RFLElBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFFcEYsT0FBTyxFQUFDLElBQUksTUFBQSxFQUFFLElBQUksTUFBQSxFQUFDLENBQUM7SUFDdEIsQ0FBQztJQS9CRCw4REErQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG4vKipcbiAqIHJlZmxlY3Rvci50cyBpbXBsZW1lbnRzIHN0YXRpYyByZWZsZWN0aW9uIG9mIGRlY2xhcmF0aW9ucyB1c2luZyB0aGUgVHlwZVNjcmlwdCBgdHMuVHlwZUNoZWNrZXJgLlxuICovXG5cbi8qKlxuICogQSByZWZsZWN0ZWQgcGFyYW1ldGVyIG9mIGEgZnVuY3Rpb24sIG1ldGhvZCwgb3IgY29uc3RydWN0b3IsIGluZGljYXRpbmcgdGhlIG5hbWUsIGFueVxuICogZGVjb3JhdG9ycywgYW5kIGFuIGV4cHJlc3Npb24gcmVwcmVzZW50aW5nIGEgcmVmZXJlbmNlIHRvIHRoZSB2YWx1ZSBzaWRlIG9mIHRoZSBwYXJhbWV0ZXInc1xuICogZGVjbGFyZWQgdHlwZSwgaWYgYXBwbGljYWJsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJhbWV0ZXIge1xuICAvKipcbiAgICogTmFtZSBvZiB0aGUgcGFyYW1ldGVyIGFzIGEgYHRzLkJpbmRpbmdOYW1lYCwgd2hpY2ggYWxsb3dzIHRoZSBwYXJhbWV0ZXIgbmFtZSB0byBiZSBpZGVudGlmaWVkXG4gICAqIHZpYSBzb3VyY2VtYXBzLlxuICAgKi9cbiAgbmFtZTogdHMuQmluZGluZ05hbWU7XG5cbiAgLyoqXG4gICAqIEEgYHRzLkV4cHJlc3Npb25gIHdoaWNoIHJlcHJlc2VudHMgYSByZWZlcmVuY2UgdG8gdGhlIHZhbHVlIHNpZGUgb2YgdGhlIHBhcmFtZXRlcidzIHR5cGUuXG4gICAqL1xuICB0eXBlVmFsdWVFeHByOiB0cy5FeHByZXNzaW9ufG51bGw7XG5cbiAgLyoqXG4gICAqIEFycmF5IG9mIGRlY29yYXRvcnMgcHJlc2VudCBvbiB0aGUgcGFyYW1ldGVyLlxuICAgKi9cbiAgZGVjb3JhdG9yczogRGVjb3JhdG9yW107XG59XG5cbi8qKlxuICogQSByZWZsZWN0ZWQgZGVjb3JhdG9yLCBpbmRpY2F0aW5nIHRoZSBuYW1lLCB3aGVyZSBpdCB3YXMgaW1wb3J0ZWQgZnJvbSwgYW5kIGFueSBhcmd1bWVudHMgaWYgdGhlXG4gKiBkZWNvcmF0b3IgaXMgYSBjYWxsIGV4cHJlc3Npb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGVjb3JhdG9yIHtcbiAgLyoqXG4gICAqIE5hbWUgb2YgdGhlIGRlY29yYXRvciwgZXh0cmFjdGVkIGZyb20gdGhlIGRlY29yYXRpb24gZXhwcmVzc2lvbi5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogSW1wb3J0IHBhdGggKHJlbGF0aXZlIHRvIHRoZSBkZWNvcmF0b3IncyBmaWxlKSBvZiB0aGUgZGVjb3JhdG9yIGl0c2VsZi5cbiAgICovXG4gIGZyb206IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGRlY29yYXRvciBub2RlIGl0c2VsZiAodXNlZnVsIGZvciBwcmludGluZyBzb3VyY2VtYXAgYmFzZWQgcmVmZXJlbmNlcyB0byB0aGUgZGVjb3JhdG9yKS5cbiAgICovXG4gIG5vZGU6IHRzLkRlY29yYXRvcjtcblxuICAvKipcbiAgICogQW55IGFyZ3VtZW50cyBvZiBhIGNhbGwgZXhwcmVzc2lvbiwgaWYgb25lIGlzIHByZXNlbnQuIElmIHRoZSBkZWNvcmF0b3Igd2FzIG5vdCBhIGNhbGxcbiAgICogZXhwcmVzc2lvbiwgdGhlbiB0aGlzIHdpbGwgYmUgYW4gZW1wdHkgYXJyYXkuXG4gICAqL1xuICBhcmdzOiB0cy5FeHByZXNzaW9uW107XG59XG5cbi8qKlxuICogUmVmbGVjdCBhIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBhbmQgZGV0ZXJtaW5lIHRoZSBsaXN0IG9mIHBhcmFtZXRlcnMuXG4gKlxuICogTm90ZSB0aGF0IHRoaXMgb25seSByZWZsZWN0cyB0aGUgcmVmZXJlbmNlZCBjbGFzcyBhbmQgbm90IGFueSBwb3RlbnRpYWwgcGFyZW50IGNsYXNzIC0gdGhhdCBtdXN0XG4gKiBiZSBoYW5kbGVkIGJ5IHRoZSBjYWxsZXIuXG4gKlxuICogQHBhcmFtIG5vZGUgdGhlIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCB0byByZWZsZWN0XG4gKiBAcGFyYW0gY2hlY2tlciBhIGB0cy5UeXBlQ2hlY2tlcmAgdXNlZCBmb3IgcmVmbGVjdGlvblxuICogQHJldHVybnMgYSBgUGFyYW1ldGVyYCBpbnN0YW5jZSBmb3IgZWFjaCBhcmd1bWVudCBvZiB0aGUgY29uc3RydWN0b3IsIG9yIGBudWxsYCBpZiBubyBjb25zdHJ1Y3RvclxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdENvbnN0cnVjdG9yUGFyYW1ldGVycyhcbiAgICBub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IFBhcmFtZXRlcltdfG51bGwge1xuICAvLyBGaXJzdGx5LCBsb29rIGZvciBhIGNvbnN0cnVjdG9yLlxuICAvLyBjbGFuZy1mb3JtYXQgb2ZmXG4gIGNvbnN0IG1heWJlQ3RvcjogdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbltdID0gbm9kZVxuICAgIC5tZW1iZXJzXG4gICAgLmZpbHRlcihlbGVtZW50ID0+IHRzLmlzQ29uc3RydWN0b3JEZWNsYXJhdGlvbihlbGVtZW50KSkgYXMgdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbltdO1xuICAvLyBjbGFuZy1mb3JtYXQgb25cblxuICBpZiAobWF5YmVDdG9yLmxlbmd0aCAhPT0gMSkge1xuICAgIC8vIE5vIGNvbnN0cnVjdG9yLlxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gUmVmbGVjdCBlYWNoIHBhcmFtZXRlci5cbiAgcmV0dXJuIG1heWJlQ3RvclswXS5wYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiByZWZsZWN0UGFyYW1ldGVyKHBhcmFtLCBjaGVja2VyKSk7XG59XG5cbi8qKlxuICogUmVmbGVjdCBhIGB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbmAgYW5kIGRldGVybWluZSBpdHMgbmFtZSwgYSB0b2tlbiB3aGljaCByZWZlcnMgdG8gdGhlIHZhbHVlXG4gKiBkZWNsYXJhdGlvbiBvZiBpdHMgdHlwZSAoaWYgcG9zc2libGUgdG8gc3RhdGljYWxseSBkZXRlcm1pbmUpLCBhbmQgaXRzIGRlY29yYXRvcnMsIGlmIGFueS5cbiAqL1xuZnVuY3Rpb24gcmVmbGVjdFBhcmFtZXRlcihub2RlOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiBQYXJhbWV0ZXIge1xuICAvLyBUaGUgbmFtZSBvZiB0aGUgcGFyYW1ldGVyIGlzIGVhc3kuXG4gIGNvbnN0IG5hbWUgPSBub2RlLm5hbWU7XG5cbiAgY29uc3QgZGVjb3JhdG9ycyA9IG5vZGUuZGVjb3JhdG9ycyAmJlxuICAgICAgICAgIG5vZGUuZGVjb3JhdG9ycy5tYXAoZGVjb3JhdG9yID0+IHJlZmxlY3REZWNvcmF0b3IoZGVjb3JhdG9yLCBjaGVja2VyKSlcbiAgICAgICAgICAgICAgLmZpbHRlcihkZWNvcmF0b3IgPT4gZGVjb3JhdG9yICE9PSBudWxsKSBhcyBEZWNvcmF0b3JbXSB8fFxuICAgICAgW107XG5cbiAgLy8gSXQgbWF5IG9yIG1heSBub3QgYmUgcG9zc2libGUgdG8gd3JpdGUgYW4gZXhwcmVzc2lvbiB0aGF0IHJlZmVycyB0byB0aGUgdmFsdWUgc2lkZSBvZiB0aGVcbiAgLy8gdHlwZSBuYW1lZCBmb3IgdGhlIHBhcmFtZXRlci5cbiAgbGV0IHR5cGVWYWx1ZUV4cHI6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgLy8gSXQncyBub3QgcG9zc2libGUgdG8gZ2V0IGEgdmFsdWUgZXhwcmVzc2lvbiBpZiB0aGUgcGFyYW1ldGVyIGRvZXNuJ3QgZXZlbiBoYXZlIGEgdHlwZS5cbiAgaWYgKG5vZGUudHlwZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gSXQncyBvbmx5IHZhbGlkIHRvIGNvbnZlcnQgYSB0eXBlIHJlZmVyZW5jZSB0byBhIHZhbHVlIHJlZmVyZW5jZSBpZiB0aGUgdHlwZSBhY3R1YWxseSBoYXMgYVxuICAgIC8vIHZhbHVlIGRlY2xhcmF0aW9uIGFzc29jaWF0ZWQgd2l0aCBpdC5cbiAgICBjb25zdCB0eXBlID0gY2hlY2tlci5nZXRUeXBlRnJvbVR5cGVOb2RlKG5vZGUudHlwZSk7XG4gICAgaWYgKHR5cGUuc3ltYm9sICE9PSB1bmRlZmluZWQgJiYgdHlwZS5zeW1ib2wudmFsdWVEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBUaGUgdHlwZSBwb2ludHMgdG8gYSB2YWxpZCB2YWx1ZSBkZWNsYXJhdGlvbi4gUmV3cml0ZSB0aGUgVHlwZVJlZmVyZW5jZSBpbnRvIGFuIEV4cHJlc3Npb25cbiAgICAgIC8vIHdoaWNoIHJlZmVyZW5jZXMgdGhlIHZhbHVlIHBvaW50ZWQgdG8gYnkgdGhlIFR5cGVSZWZlcmVuY2UsIGlmIHBvc3NpYmxlLlxuICAgICAgdHlwZVZhbHVlRXhwciA9IHR5cGVOb2RlVG9WYWx1ZUV4cHIobm9kZS50eXBlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgICAgbmFtZSwgdHlwZVZhbHVlRXhwciwgZGVjb3JhdG9ycyxcbiAgfTtcbn1cblxuLyoqXG4gKiBSZWZsZWN0IGEgZGVjb3JhdG9yIGFuZCByZXR1cm4gYSBzdHJ1Y3R1cmUgZGVzY3JpYmluZyB3aGVyZSBpdCBjb21lcyBmcm9tIGFuZCBhbnkgYXJndW1lbnRzLlxuICpcbiAqIE9ubHkgaW1wb3J0ZWQgZGVjb3JhdG9ycyBhcmUgY29uc2lkZXJlZCwgbm90IGxvY2FsbHkgZGVmaW5lZCBkZWNvcmF0b3JzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdERlY29yYXRvcihkZWNvcmF0b3I6IHRzLkRlY29yYXRvciwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiBEZWNvcmF0b3J8bnVsbCB7XG4gIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgZGVjb3JhdG9yIGV4cHJlc3Npb24gaW50byBhIHJlZmVyZW5jZSB0byBhIGNvbmNyZXRlIElkZW50aWZpZXIuIFRoZVxuICAvLyBleHByZXNzaW9uIG1heSBjb250YWluIGEgY2FsbCB0byBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgdGhlIGRlY29yYXRvciBmdW5jdGlvbiwgaW4gd2hpY2hcbiAgLy8gY2FzZSB3ZSB3YW50IHRvIHJldHVybiB0aGUgYXJndW1lbnRzLlxuICBsZXQgZGVjb3JhdG9yT2ZJbnRlcmVzdDogdHMuRXhwcmVzc2lvbiA9IGRlY29yYXRvci5leHByZXNzaW9uO1xuICBsZXQgYXJnczogdHMuRXhwcmVzc2lvbltdID0gW107XG5cbiAgLy8gQ2hlY2sgZm9yIGNhbGwgZXhwcmVzc2lvbnMuXG4gIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKGRlY29yYXRvck9mSW50ZXJlc3QpKSB7XG4gICAgYXJncyA9IEFycmF5LmZyb20oZGVjb3JhdG9yT2ZJbnRlcmVzdC5hcmd1bWVudHMpO1xuICAgIGRlY29yYXRvck9mSW50ZXJlc3QgPSBkZWNvcmF0b3JPZkludGVyZXN0LmV4cHJlc3Npb247XG4gIH1cblxuICAvLyBUaGUgZmluYWwgcmVzb2x2ZWQgZGVjb3JhdG9yIHNob3VsZCBiZSBhIGB0cy5JZGVudGlmaWVyYCAtIGlmIGl0J3Mgbm90LCB0aGVuIHNvbWV0aGluZyBpc1xuICAvLyB3cm9uZyBhbmQgdGhlIGRlY29yYXRvciBjYW4ndCBiZSByZXNvbHZlZCBzdGF0aWNhbGx5LlxuICBpZiAoIXRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JPZkludGVyZXN0KSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgaW1wb3J0RGVjbCA9IHJlZmxlY3RJbXBvcnRlZElkZW50aWZpZXIoZGVjb3JhdG9yT2ZJbnRlcmVzdCwgY2hlY2tlcik7XG4gIGlmIChpbXBvcnREZWNsID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC4uLmltcG9ydERlY2wsXG4gICAgbm9kZTogZGVjb3JhdG9yLCBhcmdzLFxuICB9O1xufVxuXG5mdW5jdGlvbiB0eXBlTm9kZVRvVmFsdWVFeHByKG5vZGU6IHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUobm9kZSkpIHtcbiAgICByZXR1cm4gZW50aXR5TmFtZVRvVmFsdWUobm9kZS50eXBlTmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW50aXR5TmFtZVRvVmFsdWUobm9kZTogdHMuRW50aXR5TmFtZSk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gIGlmICh0cy5pc1F1YWxpZmllZE5hbWUobm9kZSkpIHtcbiAgICBjb25zdCBsZWZ0ID0gZW50aXR5TmFtZVRvVmFsdWUobm9kZS5sZWZ0KTtcbiAgICByZXR1cm4gbGVmdCAhPT0gbnVsbCA/IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGxlZnQsIG5vZGUucmlnaHQpIDogbnVsbDtcbiAgfSBlbHNlIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkpIHtcbiAgICByZXR1cm4gdHMuZ2V0TXV0YWJsZUNsb25lKG5vZGUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByb3BlcnR5TmFtZVRvVmFsdWUobm9kZTogdHMuUHJvcGVydHlOYW1lKTogc3RyaW5nfG51bGwge1xuICBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUpIHx8IHRzLmlzU3RyaW5nTGl0ZXJhbChub2RlKSB8fCB0cy5pc051bWVyaWNMaXRlcmFsKG5vZGUpKSB7XG4gICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdE9iamVjdExpdGVyYWwobm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24pOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiB7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPigpO1xuICBub2RlLnByb3BlcnRpZXMuZm9yRWFjaChwcm9wID0+IHtcbiAgICBpZiAodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcCkpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBwcm9wZXJ0eU5hbWVUb1ZhbHVlKHByb3AubmFtZSk7XG4gICAgICBpZiAobmFtZSA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBtYXAuc2V0KG5hbWUsIHByb3AuaW5pdGlhbGl6ZXIpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNTaG9ydGhhbmRQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcCkpIHtcbiAgICAgIG1hcC5zZXQocHJvcC5uYW1lLnRleHQsIHByb3AubmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbWFwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdEltcG9ydGVkSWRlbnRpZmllcihcbiAgICBpZDogdHMuSWRlbnRpZmllciwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiB7bmFtZTogc3RyaW5nLCBmcm9tOiBzdHJpbmd9fG51bGwge1xuICBjb25zdCBzeW1ib2wgPSBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaWQpO1xuXG4gIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCB8fCBzeW1ib2wuZGVjbGFyYXRpb25zID09PSB1bmRlZmluZWQgfHxcbiAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBJZ25vcmUgZGVjb3JhdG9ycyB0aGF0IGFyZSBkZWZpbmVkIGxvY2FsbHkgKG5vdCBpbXBvcnRlZCkuXG4gIGNvbnN0IGRlY2w6IHRzLkRlY2xhcmF0aW9uID0gc3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgaWYgKCF0cy5pc0ltcG9ydFNwZWNpZmllcihkZWNsKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gV2FsayBiYWNrIGZyb20gdGhlIHNwZWNpZmllciB0byBmaW5kIHRoZSBkZWNsYXJhdGlvbiwgd2hpY2ggY2FycmllcyB0aGUgbW9kdWxlIHNwZWNpZmllci5cbiAgY29uc3QgaW1wb3J0RGVjbCA9IGRlY2wucGFyZW50ICEucGFyZW50ICEucGFyZW50ICE7XG5cbiAgLy8gVGhlIG1vZHVsZSBzcGVjaWZpZXIgaXMgZ3VhcmFudGVlZCB0byBiZSBhIHN0cmluZyBsaXRlcmFsLCBzbyB0aGlzIHNob3VsZCBhbHdheXMgcGFzcy5cbiAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwoaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgLy8gTm90IGFsbG93ZWQgdG8gaGFwcGVuIGluIFR5cGVTY3JpcHQgQVNUcy5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFJlYWQgdGhlIG1vZHVsZSBzcGVjaWZpZXIuXG4gIGNvbnN0IGZyb20gPSBpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllci50ZXh0O1xuXG4gIC8vIENvbXB1dGUgdGhlIG5hbWUgYnkgd2hpY2ggdGhlIGRlY29yYXRvciB3YXMgZXhwb3J0ZWQsIG5vdCBpbXBvcnRlZC5cbiAgY29uc3QgbmFtZSA9IChkZWNsLnByb3BlcnR5TmFtZSAhPT0gdW5kZWZpbmVkID8gZGVjbC5wcm9wZXJ0eU5hbWUgOiBkZWNsLm5hbWUpLnRleHQ7XG5cbiAgcmV0dXJuIHtmcm9tLCBuYW1lfTtcbn1cbiJdfQ==