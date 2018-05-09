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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmbGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9tZXRhZGF0YS9zcmMvcmVmbGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQXdEakM7Ozs7Ozs7OztPQVNHO0lBQ0gsc0NBQ0ksSUFBeUIsRUFBRSxPQUF1QjtRQUNwRCxtQ0FBbUM7UUFDbkMsbUJBQW1CO1FBQ25CLElBQU0sU0FBUyxHQUFnQyxJQUFJO2FBQ2hELE9BQU87YUFDUCxNQUFNLENBQUMsVUFBQSxPQUFPLElBQUksT0FBQSxFQUFFLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLEVBQXBDLENBQW9DLENBQWdDLENBQUM7UUFDMUYsa0JBQWtCO1FBRWxCLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixrQkFBa0I7WUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCwwQkFBMEI7UUFDMUIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxFQUFoQyxDQUFnQyxDQUFDLENBQUM7SUFDaEYsQ0FBQztJQWhCRCxvRUFnQkM7SUFFRDs7O09BR0c7SUFDSCwwQkFBMEIsSUFBNkIsRUFBRSxPQUF1QjtRQUM5RSxxQ0FBcUM7UUFDckMsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUV2QixJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVTtZQUMxQixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLGdCQUFn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QUFNLENBQUMsSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELDZCQUE2QjtRQUM3QixJQUFNLElBQUksR0FBRyxVQUFVLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztRQUU3QyxzRUFBc0U7UUFDdEUsSUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQztRQUVwRixNQUFNLENBQUMsRUFBQyxJQUFJLE1BQUEsRUFBRSxJQUFJLE1BQUEsRUFBQyxDQUFDO0lBQ3RCLENBQUM7SUEvQkQsOERBK0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuLyoqXG4gKiByZWZsZWN0b3IudHMgaW1wbGVtZW50cyBzdGF0aWMgcmVmbGVjdGlvbiBvZiBkZWNsYXJhdGlvbnMgdXNpbmcgdGhlIFR5cGVTY3JpcHQgYHRzLlR5cGVDaGVja2VyYC5cbiAqL1xuXG4vKipcbiAqIEEgcmVmbGVjdGVkIHBhcmFtZXRlciBvZiBhIGZ1bmN0aW9uLCBtZXRob2QsIG9yIGNvbnN0cnVjdG9yLCBpbmRpY2F0aW5nIHRoZSBuYW1lLCBhbnlcbiAqIGRlY29yYXRvcnMsIGFuZCBhbiBleHByZXNzaW9uIHJlcHJlc2VudGluZyBhIHJlZmVyZW5jZSB0byB0aGUgdmFsdWUgc2lkZSBvZiB0aGUgcGFyYW1ldGVyJ3NcbiAqIGRlY2xhcmVkIHR5cGUsIGlmIGFwcGxpY2FibGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyIHtcbiAgLyoqXG4gICAqIE5hbWUgb2YgdGhlIHBhcmFtZXRlciBhcyBhIGB0cy5CaW5kaW5nTmFtZWAsIHdoaWNoIGFsbG93cyB0aGUgcGFyYW1ldGVyIG5hbWUgdG8gYmUgaWRlbnRpZmllZFxuICAgKiB2aWEgc291cmNlbWFwcy5cbiAgICovXG4gIG5hbWU6IHRzLkJpbmRpbmdOYW1lO1xuXG4gIC8qKlxuICAgKiBBIGB0cy5FeHByZXNzaW9uYCB3aGljaCByZXByZXNlbnRzIGEgcmVmZXJlbmNlIHRvIHRoZSB2YWx1ZSBzaWRlIG9mIHRoZSBwYXJhbWV0ZXIncyB0eXBlLlxuICAgKi9cbiAgdHlwZVZhbHVlRXhwcjogdHMuRXhwcmVzc2lvbnxudWxsO1xuXG4gIC8qKlxuICAgKiBBcnJheSBvZiBkZWNvcmF0b3JzIHByZXNlbnQgb24gdGhlIHBhcmFtZXRlci5cbiAgICovXG4gIGRlY29yYXRvcnM6IERlY29yYXRvcltdO1xufVxuXG4vKipcbiAqIEEgcmVmbGVjdGVkIGRlY29yYXRvciwgaW5kaWNhdGluZyB0aGUgbmFtZSwgd2hlcmUgaXQgd2FzIGltcG9ydGVkIGZyb20sIGFuZCBhbnkgYXJndW1lbnRzIGlmIHRoZVxuICogZGVjb3JhdG9yIGlzIGEgY2FsbCBleHByZXNzaW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERlY29yYXRvciB7XG4gIC8qKlxuICAgKiBOYW1lIG9mIHRoZSBkZWNvcmF0b3IsIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNvcmF0aW9uIGV4cHJlc3Npb24uXG4gICAqL1xuICBuYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEltcG9ydCBwYXRoIChyZWxhdGl2ZSB0byB0aGUgZGVjb3JhdG9yJ3MgZmlsZSkgb2YgdGhlIGRlY29yYXRvciBpdHNlbGYuXG4gICAqL1xuICBmcm9tOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBkZWNvcmF0b3Igbm9kZSBpdHNlbGYgKHVzZWZ1bCBmb3IgcHJpbnRpbmcgc291cmNlbWFwIGJhc2VkIHJlZmVyZW5jZXMgdG8gdGhlIGRlY29yYXRvcikuXG4gICAqL1xuICBub2RlOiB0cy5EZWNvcmF0b3I7XG5cbiAgLyoqXG4gICAqIEFueSBhcmd1bWVudHMgb2YgYSBjYWxsIGV4cHJlc3Npb24sIGlmIG9uZSBpcyBwcmVzZW50LiBJZiB0aGUgZGVjb3JhdG9yIHdhcyBub3QgYSBjYWxsXG4gICAqIGV4cHJlc3Npb24sIHRoZW4gdGhpcyB3aWxsIGJlIGFuIGVtcHR5IGFycmF5LlxuICAgKi9cbiAgYXJnczogdHMuRXhwcmVzc2lvbltdO1xufVxuXG4vKipcbiAqIFJlZmxlY3QgYSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgYW5kIGRldGVybWluZSB0aGUgbGlzdCBvZiBwYXJhbWV0ZXJzLlxuICpcbiAqIE5vdGUgdGhhdCB0aGlzIG9ubHkgcmVmbGVjdHMgdGhlIHJlZmVyZW5jZWQgY2xhc3MgYW5kIG5vdCBhbnkgcG90ZW50aWFsIHBhcmVudCBjbGFzcyAtIHRoYXQgbXVzdFxuICogYmUgaGFuZGxlZCBieSB0aGUgY2FsbGVyLlxuICpcbiAqIEBwYXJhbSBub2RlIHRoZSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgdG8gcmVmbGVjdFxuICogQHBhcmFtIGNoZWNrZXIgYSBgdHMuVHlwZUNoZWNrZXJgIHVzZWQgZm9yIHJlZmxlY3Rpb25cbiAqIEByZXR1cm5zIGEgYFBhcmFtZXRlcmAgaW5zdGFuY2UgZm9yIGVhY2ggYXJndW1lbnQgb2YgdGhlIGNvbnN0cnVjdG9yLCBvciBgbnVsbGAgaWYgbm8gY29uc3RydWN0b3JcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZmxlY3RDb25zdHJ1Y3RvclBhcmFtZXRlcnMoXG4gICAgbm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiBQYXJhbWV0ZXJbXXxudWxsIHtcbiAgLy8gRmlyc3RseSwgbG9vayBmb3IgYSBjb25zdHJ1Y3Rvci5cbiAgLy8gY2xhbmctZm9ybWF0IG9mZlxuICBjb25zdCBtYXliZUN0b3I6IHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb25bXSA9IG5vZGVcbiAgICAubWVtYmVyc1xuICAgIC5maWx0ZXIoZWxlbWVudCA9PiB0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24oZWxlbWVudCkpIGFzIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb25bXTtcbiAgLy8gY2xhbmctZm9ybWF0IG9uXG5cbiAgaWYgKG1heWJlQ3Rvci5sZW5ndGggIT09IDEpIHtcbiAgICAvLyBObyBjb25zdHJ1Y3Rvci5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFJlZmxlY3QgZWFjaCBwYXJhbWV0ZXIuXG4gIHJldHVybiBtYXliZUN0b3JbMF0ucGFyYW1ldGVycy5tYXAocGFyYW0gPT4gcmVmbGVjdFBhcmFtZXRlcihwYXJhbSwgY2hlY2tlcikpO1xufVxuXG4vKipcbiAqIFJlZmxlY3QgYSBgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25gIGFuZCBkZXRlcm1pbmUgaXRzIG5hbWUsIGEgdG9rZW4gd2hpY2ggcmVmZXJzIHRvIHRoZSB2YWx1ZVxuICogZGVjbGFyYXRpb24gb2YgaXRzIHR5cGUgKGlmIHBvc3NpYmxlIHRvIHN0YXRpY2FsbHkgZGV0ZXJtaW5lKSwgYW5kIGl0cyBkZWNvcmF0b3JzLCBpZiBhbnkuXG4gKi9cbmZ1bmN0aW9uIHJlZmxlY3RQYXJhbWV0ZXIobm9kZTogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKTogUGFyYW1ldGVyIHtcbiAgLy8gVGhlIG5hbWUgb2YgdGhlIHBhcmFtZXRlciBpcyBlYXN5LlxuICBjb25zdCBuYW1lID0gbm9kZS5uYW1lO1xuXG4gIGNvbnN0IGRlY29yYXRvcnMgPSBub2RlLmRlY29yYXRvcnMgJiZcbiAgICAgICAgICBub2RlLmRlY29yYXRvcnMubWFwKGRlY29yYXRvciA9PiByZWZsZWN0RGVjb3JhdG9yKGRlY29yYXRvciwgY2hlY2tlcikpXG4gICAgICAgICAgICAgIC5maWx0ZXIoZGVjb3JhdG9yID0+IGRlY29yYXRvciAhPT0gbnVsbCkgYXMgRGVjb3JhdG9yW10gfHxcbiAgICAgIFtdO1xuXG4gIC8vIEl0IG1heSBvciBtYXkgbm90IGJlIHBvc3NpYmxlIHRvIHdyaXRlIGFuIGV4cHJlc3Npb24gdGhhdCByZWZlcnMgdG8gdGhlIHZhbHVlIHNpZGUgb2YgdGhlXG4gIC8vIHR5cGUgbmFtZWQgZm9yIHRoZSBwYXJhbWV0ZXIuXG4gIGxldCB0eXBlVmFsdWVFeHByOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuXG4gIC8vIEl0J3Mgbm90IHBvc3NpYmxlIHRvIGdldCBhIHZhbHVlIGV4cHJlc3Npb24gaWYgdGhlIHBhcmFtZXRlciBkb2Vzbid0IGV2ZW4gaGF2ZSBhIHR5cGUuXG4gIGlmIChub2RlLnR5cGUgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIEl0J3Mgb25seSB2YWxpZCB0byBjb252ZXJ0IGEgdHlwZSByZWZlcmVuY2UgdG8gYSB2YWx1ZSByZWZlcmVuY2UgaWYgdGhlIHR5cGUgYWN0dWFsbHkgaGFzIGFcbiAgICAvLyB2YWx1ZSBkZWNsYXJhdGlvbiBhc3NvY2lhdGVkIHdpdGggaXQuXG4gICAgY29uc3QgdHlwZSA9IGNoZWNrZXIuZ2V0VHlwZUZyb21UeXBlTm9kZShub2RlLnR5cGUpO1xuICAgIGlmICh0eXBlLnN5bWJvbCAhPT0gdW5kZWZpbmVkICYmIHR5cGUuc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gVGhlIHR5cGUgcG9pbnRzIHRvIGEgdmFsaWQgdmFsdWUgZGVjbGFyYXRpb24uIFJld3JpdGUgdGhlIFR5cGVSZWZlcmVuY2UgaW50byBhbiBFeHByZXNzaW9uXG4gICAgICAvLyB3aGljaCByZWZlcmVuY2VzIHRoZSB2YWx1ZSBwb2ludGVkIHRvIGJ5IHRoZSBUeXBlUmVmZXJlbmNlLCBpZiBwb3NzaWJsZS5cbiAgICAgIHR5cGVWYWx1ZUV4cHIgPSB0eXBlTm9kZVRvVmFsdWVFeHByKG5vZGUudHlwZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAgIG5hbWUsIHR5cGVWYWx1ZUV4cHIsIGRlY29yYXRvcnMsXG4gIH07XG59XG5cbi8qKlxuICogUmVmbGVjdCBhIGRlY29yYXRvciBhbmQgcmV0dXJuIGEgc3RydWN0dXJlIGRlc2NyaWJpbmcgd2hlcmUgaXQgY29tZXMgZnJvbSBhbmQgYW55IGFyZ3VtZW50cy5cbiAqXG4gKiBPbmx5IGltcG9ydGVkIGRlY29yYXRvcnMgYXJlIGNvbnNpZGVyZWQsIG5vdCBsb2NhbGx5IGRlZmluZWQgZGVjb3JhdG9ycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZmxlY3REZWNvcmF0b3IoZGVjb3JhdG9yOiB0cy5EZWNvcmF0b3IsIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKTogRGVjb3JhdG9yfG51bGwge1xuICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIGRlY29yYXRvciBleHByZXNzaW9uIGludG8gYSByZWZlcmVuY2UgdG8gYSBjb25jcmV0ZSBJZGVudGlmaWVyLiBUaGVcbiAgLy8gZXhwcmVzc2lvbiBtYXkgY29udGFpbiBhIGNhbGwgdG8gYSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIHRoZSBkZWNvcmF0b3IgZnVuY3Rpb24sIGluIHdoaWNoXG4gIC8vIGNhc2Ugd2Ugd2FudCB0byByZXR1cm4gdGhlIGFyZ3VtZW50cy5cbiAgbGV0IGRlY29yYXRvck9mSW50ZXJlc3Q6IHRzLkV4cHJlc3Npb24gPSBkZWNvcmF0b3IuZXhwcmVzc2lvbjtcbiAgbGV0IGFyZ3M6IHRzLkV4cHJlc3Npb25bXSA9IFtdO1xuXG4gIC8vIENoZWNrIGZvciBjYWxsIGV4cHJlc3Npb25zLlxuICBpZiAodHMuaXNDYWxsRXhwcmVzc2lvbihkZWNvcmF0b3JPZkludGVyZXN0KSkge1xuICAgIGFyZ3MgPSBBcnJheS5mcm9tKGRlY29yYXRvck9mSW50ZXJlc3QuYXJndW1lbnRzKTtcbiAgICBkZWNvcmF0b3JPZkludGVyZXN0ID0gZGVjb3JhdG9yT2ZJbnRlcmVzdC5leHByZXNzaW9uO1xuICB9XG5cbiAgLy8gVGhlIGZpbmFsIHJlc29sdmVkIGRlY29yYXRvciBzaG91bGQgYmUgYSBgdHMuSWRlbnRpZmllcmAgLSBpZiBpdCdzIG5vdCwgdGhlbiBzb21ldGhpbmcgaXNcbiAgLy8gd3JvbmcgYW5kIHRoZSBkZWNvcmF0b3IgY2FuJ3QgYmUgcmVzb2x2ZWQgc3RhdGljYWxseS5cbiAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjb3JhdG9yT2ZJbnRlcmVzdCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGltcG9ydERlY2wgPSByZWZsZWN0SW1wb3J0ZWRJZGVudGlmaWVyKGRlY29yYXRvck9mSW50ZXJlc3QsIGNoZWNrZXIpO1xuICBpZiAoaW1wb3J0RGVjbCA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAuLi5pbXBvcnREZWNsLFxuICAgIG5vZGU6IGRlY29yYXRvciwgYXJncyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdHlwZU5vZGVUb1ZhbHVlRXhwcihub2RlOiB0cy5UeXBlTm9kZSk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gIGlmICh0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKG5vZGUpKSB7XG4gICAgcmV0dXJuIGVudGl0eU5hbWVUb1ZhbHVlKG5vZGUudHlwZU5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVudGl0eU5hbWVUb1ZhbHVlKG5vZGU6IHRzLkVudGl0eU5hbWUpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBpZiAodHMuaXNRdWFsaWZpZWROYW1lKG5vZGUpKSB7XG4gICAgY29uc3QgbGVmdCA9IGVudGl0eU5hbWVUb1ZhbHVlKG5vZGUubGVmdCk7XG4gICAgcmV0dXJuIGxlZnQgIT09IG51bGwgPyB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhsZWZ0LCBub2RlLnJpZ2h0KSA6IG51bGw7XG4gIH0gZWxzZSBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUpKSB7XG4gICAgcmV0dXJuIHRzLmdldE11dGFibGVDbG9uZShub2RlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eU5hbWVUb1ZhbHVlKG5vZGU6IHRzLlByb3BlcnR5TmFtZSk6IHN0cmluZ3xudWxsIHtcbiAgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlKSB8fCB0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkgfHwgdHMuaXNOdW1lcmljTGl0ZXJhbChub2RlKSkge1xuICAgIHJldHVybiBub2RlLnRleHQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZmxlY3RPYmplY3RMaXRlcmFsKG5vZGU6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uKTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4ge1xuICBjb25zdCBtYXAgPSBuZXcgTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4oKTtcbiAgbm9kZS5wcm9wZXJ0aWVzLmZvckVhY2gocHJvcCA9PiB7XG4gICAgaWYgKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHByb3ApKSB7XG4gICAgICBjb25zdCBuYW1lID0gcHJvcGVydHlOYW1lVG9WYWx1ZShwcm9wLm5hbWUpO1xuICAgICAgaWYgKG5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbWFwLnNldChuYW1lLCBwcm9wLmluaXRpYWxpemVyKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzU2hvcnRoYW5kUHJvcGVydHlBc3NpZ25tZW50KHByb3ApKSB7XG4gICAgICBtYXAuc2V0KHByb3AubmFtZS50ZXh0LCBwcm9wLm5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG1hcDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZmxlY3RJbXBvcnRlZElkZW50aWZpZXIoXG4gICAgaWQ6IHRzLklkZW50aWZpZXIsIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKToge25hbWU6IHN0cmluZywgZnJvbTogc3RyaW5nfXxudWxsIHtcbiAgY29uc3Qgc3ltYm9sID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlkKTtcblxuICBpZiAoc3ltYm9sID09PSB1bmRlZmluZWQgfHwgc3ltYm9sLmRlY2xhcmF0aW9ucyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICBzeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCAhPT0gMSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gSWdub3JlIGRlY29yYXRvcnMgdGhhdCBhcmUgZGVmaW5lZCBsb2NhbGx5IChub3QgaW1wb3J0ZWQpLlxuICBjb25zdCBkZWNsOiB0cy5EZWNsYXJhdGlvbiA9IHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gIGlmICghdHMuaXNJbXBvcnRTcGVjaWZpZXIoZGVjbCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFdhbGsgYmFjayBmcm9tIHRoZSBzcGVjaWZpZXIgdG8gZmluZCB0aGUgZGVjbGFyYXRpb24sIHdoaWNoIGNhcnJpZXMgdGhlIG1vZHVsZSBzcGVjaWZpZXIuXG4gIGNvbnN0IGltcG9ydERlY2wgPSBkZWNsLnBhcmVudCAhLnBhcmVudCAhLnBhcmVudCAhO1xuXG4gIC8vIFRoZSBtb2R1bGUgc3BlY2lmaWVyIGlzIGd1YXJhbnRlZWQgdG8gYmUgYSBzdHJpbmcgbGl0ZXJhbCwgc28gdGhpcyBzaG91bGQgYWx3YXlzIHBhc3MuXG4gIGlmICghdHMuaXNTdHJpbmdMaXRlcmFsKGltcG9ydERlY2wubW9kdWxlU3BlY2lmaWVyKSkge1xuICAgIC8vIE5vdCBhbGxvd2VkIHRvIGhhcHBlbiBpbiBUeXBlU2NyaXB0IEFTVHMuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBSZWFkIHRoZSBtb2R1bGUgc3BlY2lmaWVyLlxuICBjb25zdCBmcm9tID0gaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIudGV4dDtcblxuICAvLyBDb21wdXRlIHRoZSBuYW1lIGJ5IHdoaWNoIHRoZSBkZWNvcmF0b3Igd2FzIGV4cG9ydGVkLCBub3QgaW1wb3J0ZWQuXG4gIGNvbnN0IG5hbWUgPSAoZGVjbC5wcm9wZXJ0eU5hbWUgIT09IHVuZGVmaW5lZCA/IGRlY2wucHJvcGVydHlOYW1lIDogZGVjbC5uYW1lKS50ZXh0O1xuXG4gIHJldHVybiB7ZnJvbSwgbmFtZX07XG59XG4iXX0=