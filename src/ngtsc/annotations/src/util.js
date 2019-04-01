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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/util", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var ConstructorDepErrorKind;
    (function (ConstructorDepErrorKind) {
        ConstructorDepErrorKind[ConstructorDepErrorKind["NO_SUITABLE_TOKEN"] = 0] = "NO_SUITABLE_TOKEN";
    })(ConstructorDepErrorKind = exports.ConstructorDepErrorKind || (exports.ConstructorDepErrorKind = {}));
    function getConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore) {
        var deps = [];
        var errors = [];
        var ctorParams = reflector.getConstructorParameters(clazz);
        if (ctorParams === null) {
            if (reflector.hasBaseClass(clazz)) {
                return null;
            }
            else {
                ctorParams = [];
            }
        }
        ctorParams.forEach(function (param, idx) {
            var token = valueReferenceToExpression(param.typeValueReference, defaultImportRecorder);
            var optional = false, self = false, skipSelf = false, host = false;
            var resolved = compiler_1.R3ResolvedDependencyType.Token;
            (param.decorators || []).filter(function (dec) { return isCore || isAngularCore(dec); }).forEach(function (dec) {
                var name = isCore || dec.import === null ? dec.name : dec.import.name;
                if (name === 'Inject') {
                    if (dec.args === null || dec.args.length !== 1) {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, dec.node, "Unexpected number of arguments to @Inject().");
                    }
                    token = new compiler_1.WrappedNodeExpr(dec.args[0]);
                }
                else if (name === 'Optional') {
                    optional = true;
                }
                else if (name === 'SkipSelf') {
                    skipSelf = true;
                }
                else if (name === 'Self') {
                    self = true;
                }
                else if (name === 'Host') {
                    host = true;
                }
                else if (name === 'Attribute') {
                    if (dec.args === null || dec.args.length !== 1) {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, dec.node, "Unexpected number of arguments to @Attribute().");
                    }
                    token = new compiler_1.WrappedNodeExpr(dec.args[0]);
                    resolved = compiler_1.R3ResolvedDependencyType.Attribute;
                }
                else {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_UNEXPECTED, dec.node, "Unexpected decorator " + name + " on parameter.");
                }
            });
            if (token === null) {
                errors.push({
                    index: idx,
                    kind: ConstructorDepErrorKind.NO_SUITABLE_TOKEN, param: param,
                });
            }
            else {
                deps.push({ token: token, optional: optional, self: self, skipSelf: skipSelf, host: host, resolved: resolved });
            }
        });
        if (errors.length === 0) {
            return { deps: deps };
        }
        else {
            return { deps: null, errors: errors };
        }
    }
    exports.getConstructorDependencies = getConstructorDependencies;
    function valueReferenceToExpression(valueRef, defaultImportRecorder) {
        if (valueRef === null) {
            return null;
        }
        else if (valueRef.local) {
            if (defaultImportRecorder !== null && valueRef.defaultImportStatement !== null &&
                ts.isIdentifier(valueRef.expression)) {
                defaultImportRecorder.recordImportedIdentifier(valueRef.expression, valueRef.defaultImportStatement);
            }
            return new compiler_1.WrappedNodeExpr(valueRef.expression);
        }
        else {
            // TODO(alxhub): this cast is necessary because the g3 typescript version doesn't narrow here.
            return new compiler_1.ExternalExpr(valueRef);
        }
    }
    exports.valueReferenceToExpression = valueReferenceToExpression;
    function getValidConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore) {
        return validateConstructorDependencies(clazz, getConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore));
    }
    exports.getValidConstructorDependencies = getValidConstructorDependencies;
    function validateConstructorDependencies(clazz, deps) {
        if (deps === null) {
            return null;
        }
        else if (deps.deps !== null) {
            return deps.deps;
        }
        else {
            // TODO(alxhub): this cast is necessary because the g3 typescript version doesn't narrow here.
            var _a = deps.errors[0], param = _a.param, index = _a.index;
            // There is at least one error.
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.PARAM_MISSING_TOKEN, param.nameNode, "No suitable injection token for parameter '" + (param.name || index) + "' of class '" + clazz.name.text + "'. Found: " + param.typeNode.getText());
        }
    }
    exports.validateConstructorDependencies = validateConstructorDependencies;
    function toR3Reference(valueRef, typeRef, valueContext, typeContext, refEmitter) {
        var value = refEmitter.emit(valueRef, valueContext, imports_1.ImportMode.UseExistingImport);
        var type = refEmitter.emit(typeRef, typeContext, imports_1.ImportMode.ForceNewImport);
        if (value === null || type === null) {
            throw new Error("Could not refer to " + ts.SyntaxKind[valueRef.node.kind]);
        }
        return { value: value, type: type };
    }
    exports.toR3Reference = toR3Reference;
    function isAngularCore(decorator) {
        return decorator.import !== null && decorator.import.from === '@angular/core';
    }
    exports.isAngularCore = isAngularCore;
    function isAngularCoreReference(reference, symbolName) {
        return reference.ownedByModuleGuess === '@angular/core' && reference.debugName === symbolName;
    }
    exports.isAngularCoreReference = isAngularCoreReference;
    function findAngularDecorator(decorators, name, isCore) {
        return decorators.find(function (decorator) { return isAngularDecorator(decorator, name, isCore); });
    }
    exports.findAngularDecorator = findAngularDecorator;
    function isAngularDecorator(decorator, name, isCore) {
        if (isCore) {
            return decorator.name === name;
        }
        else if (isAngularCore(decorator)) {
            return decorator.import.name === name;
        }
        return false;
    }
    exports.isAngularDecorator = isAngularDecorator;
    /**
     * Unwrap a `ts.Expression`, removing outer type-casts or parentheses until the expression is in its
     * lowest level form.
     *
     * For example, the expression "(foo as Type)" unwraps to "foo".
     */
    function unwrapExpression(node) {
        while (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) {
            node = node.expression;
        }
        return node;
    }
    exports.unwrapExpression = unwrapExpression;
    function expandForwardRef(arg) {
        if (!ts.isArrowFunction(arg) && !ts.isFunctionExpression(arg)) {
            return null;
        }
        var body = arg.body;
        // Either the body is a ts.Expression directly, or a block with a single return statement.
        if (ts.isBlock(body)) {
            // Block body - look for a single return statement.
            if (body.statements.length !== 1) {
                return null;
            }
            var stmt = body.statements[0];
            if (!ts.isReturnStatement(stmt) || stmt.expression === undefined) {
                return null;
            }
            return stmt.expression;
        }
        else {
            // Shorthand body - return as an expression.
            return body;
        }
    }
    /**
     * Possibly resolve a forwardRef() expression into the inner value.
     *
     * @param node the forwardRef() expression to resolve
     * @param reflector a ReflectionHost
     * @returns the resolved expression, if the original expression was a forwardRef(), or the original
     * expression otherwise
     */
    function unwrapForwardRef(node, reflector) {
        if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) ||
            node.arguments.length !== 1) {
            return node;
        }
        var expr = expandForwardRef(node.arguments[0]);
        if (expr === null) {
            return node;
        }
        var imp = reflector.getImportOfIdentifier(node.expression);
        if (imp === null || imp.from !== '@angular/core' || imp.name !== 'forwardRef') {
            return node;
        }
        else {
            return expr;
        }
    }
    exports.unwrapForwardRef = unwrapForwardRef;
    /**
     * A foreign function resolver for `staticallyResolve` which unwraps forwardRef() expressions.
     *
     * @param ref a Reference to the declaration of the function being called (which might be
     * forwardRef)
     * @param args the arguments to the invocation of the forwardRef expression
     * @returns an unwrapped argument if `ref` pointed to forwardRef, or null otherwise
     */
    function forwardRefResolver(ref, args) {
        if (!isAngularCoreReference(ref, 'forwardRef') || args.length !== 1) {
            return null;
        }
        return expandForwardRef(args[0]);
    }
    exports.forwardRefResolver = forwardRefResolver;
    /**
     * Combines an array of resolver functions into a one.
     * @param resolvers Resolvers to be combined.
     */
    function combineResolvers(resolvers) {
        return function (ref, args) {
            var e_1, _a;
            try {
                for (var resolvers_1 = tslib_1.__values(resolvers), resolvers_1_1 = resolvers_1.next(); !resolvers_1_1.done; resolvers_1_1 = resolvers_1.next()) {
                    var resolver = resolvers_1_1.value;
                    var resolved = resolver(ref, args);
                    if (resolved !== null) {
                        return resolved;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (resolvers_1_1 && !resolvers_1_1.done && (_a = resolvers_1.return)) _a.call(resolvers_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return null;
        };
    }
    exports.combineResolvers = combineResolvers;
    function isExpressionForwardReference(expr, context, contextSource) {
        if (isWrappedTsNodeExpr(expr)) {
            var node = ts.getOriginalNode(expr.node);
            return node.getSourceFile() === contextSource && context.pos < node.pos;
        }
        else {
            return false;
        }
    }
    exports.isExpressionForwardReference = isExpressionForwardReference;
    function isWrappedTsNodeExpr(expr) {
        return expr instanceof compiler_1.WrappedNodeExpr;
    }
    exports.isWrappedTsNodeExpr = isWrappedTsNodeExpr;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXlJO0lBQ3pJLCtCQUFpQztJQUVqQywyRUFBa0U7SUFDbEUsbUVBQTZGO0lBSTdGLElBQVksdUJBRVg7SUFGRCxXQUFZLHVCQUF1QjtRQUNqQywrRkFBaUIsQ0FBQTtJQUNuQixDQUFDLEVBRlcsdUJBQXVCLEdBQXZCLCtCQUF1QixLQUF2QiwrQkFBdUIsUUFFbEM7SUFnQkQsU0FBZ0IsMEJBQTBCLENBQ3RDLEtBQXVCLEVBQUUsU0FBeUIsRUFDbEQscUJBQTRDLEVBQUUsTUFBZTtRQUMvRCxJQUFNLElBQUksR0FBMkIsRUFBRSxDQUFDO1FBQ3hDLElBQU0sTUFBTSxHQUEwQixFQUFFLENBQUM7UUFDekMsSUFBSSxVQUFVLEdBQUcsU0FBUyxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNELElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtZQUN2QixJQUFJLFNBQVMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2pDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7aUJBQU07Z0JBQ0wsVUFBVSxHQUFHLEVBQUUsQ0FBQzthQUNqQjtTQUNGO1FBQ0QsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFDLEtBQUssRUFBRSxHQUFHO1lBQzVCLElBQUksS0FBSyxHQUFHLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1lBQ3hGLElBQUksUUFBUSxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsS0FBSyxFQUFFLFFBQVEsR0FBRyxLQUFLLEVBQUUsSUFBSSxHQUFHLEtBQUssQ0FBQztZQUNuRSxJ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QUMsR0FBRyxDQUFDO1NBQ3pFO2FBQU07WUFDTCxPQUFPLEtBQUssQ0FBQztTQUNkO0lBQ0gsQ0FBQztJQVJELG9FQVFDO0lBRUQsU0FBZ0IsbUJBQW1CLENBQUMsSUFBZ0I7UUFDbEQsT0FBTyxJQUFJLFlBQVksMEJBQWUsQ0FBQztJQUN6QyxDQUFDO0lBRkQsa0RBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBSM0RlcGVuZGVuY3lNZXRhZGF0YSwgUjNSZWZlcmVuY2UsIFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZSwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgSW1wb3J0TW9kZSwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Rm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXJ9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ3RvclBhcmFtZXRlciwgRGVjb3JhdG9yLCBJbXBvcnQsIFJlZmxlY3Rpb25Ib3N0LCBUeXBlVmFsdWVSZWZlcmVuY2V9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5leHBvcnQgZW51bSBDb25zdHJ1Y3RvckRlcEVycm9yS2luZCB7XG4gIE5PX1NVSVRBQkxFX1RPS0VOLFxufVxuXG5leHBvcnQgdHlwZSBDb25zdHJ1Y3RvckRlcHMgPSB7XG4gIGRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW107XG59IHxcbntcbiAgZGVwczogbnVsbDtcbiAgZXJyb3JzOiBDb25zdHJ1Y3RvckRlcEVycm9yW107XG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbnN0cnVjdG9yRGVwRXJyb3Ige1xuICBpbmRleDogbnVtYmVyO1xuICBwYXJhbTogQ3RvclBhcmFtZXRlcjtcbiAga2luZDogQ29uc3RydWN0b3JEZXBFcnJvcktpbmQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlOiBib29sZWFuKTogQ29uc3RydWN0b3JEZXBzfG51bGwge1xuICBjb25zdCBkZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdID0gW107XG4gIGNvbnN0IGVycm9yczogQ29uc3RydWN0b3JEZXBFcnJvcltdID0gW107XG4gIGxldCBjdG9yUGFyYW1zID0gcmVmbGVjdG9yLmdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhjbGF6eik7XG4gIGlmIChjdG9yUGFyYW1zID09PSBudWxsKSB7XG4gICAgaWYgKHJlZmxlY3Rvci5oYXNCYXNlQ2xhc3MoY2xhenopKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgY3RvclBhcmFtcyA9IFtdO1xuICAgIH1cbiAgfVxuICBjdG9yUGFyYW1zLmZvckVhY2goKHBhcmFtLCBpZHgpID0+IHtcbiAgICBsZXQgdG9rZW4gPSB2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbihwYXJhbS50eXBlVmFsdWVSZWZlcmVuY2UsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcik7XG4gICAgbGV0IG9wdGlvbmFsID0gZmFsc2UsIHNlbGYgPSBmYWxzZSwgc2tpcFNlbGYgPSBmYWxzZSwgaG9zdCA9IGZhbHNlO1xuICAgIGxldCByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5Ub2tlbjtcbiAgICAocGFyYW0uZGVjb3JhdG9ycyB8fCBbXSkuZmlsdGVyKGRlYyA9PiBpc0NvcmUgfHwgaXNBbmd1bGFyQ29yZShkZWMpKS5mb3JFYWNoKGRlYyA9PiB7XG4gICAgICBjb25zdCBuYW1lID0gaXNDb3JlIHx8IGRlYy5pbXBvcnQgPT09IG51bGwgPyBkZWMubmFtZSA6IGRlYy5pbXBvcnQgIS5uYW1lO1xuICAgICAgaWYgKG5hbWUgPT09ICdJbmplY3QnKSB7XG4gICAgICAgIGlmIChkZWMuYXJncyA9PT0gbnVsbCB8fCBkZWMuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlYy5ub2RlLFxuICAgICAgICAgICAgICBgVW5leHBlY3RlZCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBJbmplY3QoKS5gKTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbiA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoZGVjLmFyZ3NbMF0pO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnT3B0aW9uYWwnKSB7XG4gICAgICAgIG9wdGlvbmFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ1NraXBTZWxmJykge1xuICAgICAgICBza2lwU2VsZiA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdTZWxmJykge1xuICAgICAgICBzZWxmID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ0hvc3QnKSB7XG4gICAgICAgIGhvc3QgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnQXR0cmlidXRlJykge1xuICAgICAgICBpZiAoZGVjLmFyZ3MgPT09IG51bGwgfHwgZGVjLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBkZWMubm9kZSxcbiAgICAgICAgICAgICAgYFVuZXhwZWN0ZWQgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAQXR0cmlidXRlKCkuYCk7XG4gICAgICAgIH1cbiAgICAgICAgdG9rZW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKGRlYy5hcmdzWzBdKTtcbiAgICAgICAgcmVzb2x2ZWQgPSBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuQXR0cmlidXRlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9VTkVYUEVDVEVELCBkZWMubm9kZSwgYFVuZXhwZWN0ZWQgZGVjb3JhdG9yICR7bmFtZX0gb24gcGFyYW1ldGVyLmApO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICh0b2tlbiA9PT0gbnVsbCkge1xuICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICBpbmRleDogaWR4LFxuICAgICAgICBraW5kOiBDb25zdHJ1Y3RvckRlcEVycm9yS2luZC5OT19TVUlUQUJMRV9UT0tFTiwgcGFyYW0sXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVwcy5wdXNoKHt0b2tlbiwgb3B0aW9uYWwsIHNlbGYsIHNraXBTZWxmLCBob3N0LCByZXNvbHZlZH0pO1xuICAgIH1cbiAgfSk7XG4gIGlmIChlcnJvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtkZXBzfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge2RlcHM6IG51bGwsIGVycm9yc307XG4gIH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgYFR5cGVWYWx1ZVJlZmVyZW5jZWAgdG8gYW4gYEV4cHJlc3Npb25gIHdoaWNoIHJlZmVycyB0byB0aGUgdHlwZSBhcyBhIHZhbHVlLlxuICpcbiAqIExvY2FsIHJlZmVyZW5jZXMgYXJlIGNvbnZlcnRlZCB0byBhIGBXcmFwcGVkTm9kZUV4cHJgIG9mIHRoZSBUeXBlU2NyaXB0IGV4cHJlc3Npb24sIGFuZCBub24tbG9jYWxcbiAqIHJlZmVyZW5jZXMgYXJlIGNvbnZlcnRlZCB0byBhbiBgRXh0ZXJuYWxFeHByYC4gTm90ZSB0aGF0IHRoaXMgaXMgb25seSB2YWxpZCBpbiB0aGUgY29udGV4dCBvZiB0aGVcbiAqIGZpbGUgaW4gd2hpY2ggdGhlIGBUeXBlVmFsdWVSZWZlcmVuY2VgIG9yaWdpbmF0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbihcbiAgICB2YWx1ZVJlZjogVHlwZVZhbHVlUmVmZXJlbmNlLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcik6IEV4cHJlc3Npb247XG5leHBvcnQgZnVuY3Rpb24gdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24oXG4gICAgdmFsdWVSZWY6IG51bGwsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyKTogbnVsbDtcbmV4cG9ydCBmdW5jdGlvbiB2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbihcbiAgICB2YWx1ZVJlZjogVHlwZVZhbHVlUmVmZXJlbmNlIHwgbnVsbCwgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIpOiBFeHByZXNzaW9ufFxuICAgIG51bGw7XG5leHBvcnQgZnVuY3Rpb24gdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24oXG4gICAgdmFsdWVSZWY6IFR5cGVWYWx1ZVJlZmVyZW5jZSB8IG51bGwsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyKTogRXhwcmVzc2lvbnxcbiAgICBudWxsIHtcbiAgaWYgKHZhbHVlUmVmID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSBpZiAodmFsdWVSZWYubG9jYWwpIHtcbiAgICBpZiAoZGVmYXVsdEltcG9ydFJlY29yZGVyICE9PSBudWxsICYmIHZhbHVlUmVmLmRlZmF1bHRJbXBvcnRTdGF0ZW1lbnQgIT09IG51bGwgJiZcbiAgICAgICAgdHMuaXNJZGVudGlmaWVyKHZhbHVlUmVmLmV4cHJlc3Npb24pKSB7XG4gICAgICBkZWZhdWx0SW1wb3J0UmVjb3JkZXIucmVjb3JkSW1wb3J0ZWRJZGVudGlmaWVyKFxuICAgICAgICAgIHZhbHVlUmVmLmV4cHJlc3Npb24sIHZhbHVlUmVmLmRlZmF1bHRJbXBvcnRTdGF0ZW1lbnQpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFdyYXBwZWROb2RlRXhwcih2YWx1ZVJlZi5leHByZXNzaW9uKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY2FzdCBpcyBuZWNlc3NhcnkgYmVjYXVzZSB0aGUgZzMgdHlwZXNjcmlwdCB2ZXJzaW9uIGRvZXNuJ3QgbmFycm93IGhlcmUuXG4gICAgcmV0dXJuIG5ldyBFeHRlcm5hbEV4cHIodmFsdWVSZWYgYXN7bW9kdWxlTmFtZTogc3RyaW5nLCBuYW1lOiBzdHJpbmd9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlOiBib29sZWFuKTogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXXxudWxsIHtcbiAgcmV0dXJuIHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgICBjbGF6eiwgZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3RvciwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgY2xheno6IENsYXNzRGVjbGFyYXRpb24sIGRlcHM6IENvbnN0cnVjdG9yRGVwcyB8IG51bGwpOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfG51bGwge1xuICBpZiAoZGVwcyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKGRlcHMuZGVwcyAhPT0gbnVsbCkge1xuICAgIHJldHVybiBkZXBzLmRlcHM7XG4gIH0gZWxzZSB7XG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNhc3QgaXMgbmVjZXNzYXJ5IGJlY2F1c2UgdGhlIGczIHR5cGVzY3JpcHQgdmVyc2lvbiBkb2Vzbid0IG5hcnJvdyBoZXJlLlxuICAgIGNvbnN0IHtwYXJhbSwgaW5kZXh9ID0gKGRlcHMgYXN7ZXJyb3JzOiBDb25zdHJ1Y3RvckRlcEVycm9yW119KS5lcnJvcnNbMF07XG4gICAgLy8gVGhlcmUgaXMgYXQgbGVhc3Qgb25lIGVycm9yLlxuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLlBBUkFNX01JU1NJTkdfVE9LRU4sIHBhcmFtLm5hbWVOb2RlLFxuICAgICAgICBgTm8gc3VpdGFibGUgaW5qZWN0aW9uIHRva2VuIGZvciBwYXJhbWV0ZXIgJyR7cGFyYW0ubmFtZSB8fCBpbmRleH0nIG9mIGNsYXNzICcke2NsYXp6Lm5hbWUhLnRleHR9Jy4gRm91bmQ6ICR7cGFyYW0udHlwZU5vZGUhLmdldFRleHQoKX1gKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9SM1JlZmVyZW5jZShcbiAgICB2YWx1ZVJlZjogUmVmZXJlbmNlLCB0eXBlUmVmOiBSZWZlcmVuY2UsIHZhbHVlQ29udGV4dDogdHMuU291cmNlRmlsZSxcbiAgICB0eXBlQ29udGV4dDogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcik6IFIzUmVmZXJlbmNlIHtcbiAgY29uc3QgdmFsdWUgPSByZWZFbWl0dGVyLmVtaXQodmFsdWVSZWYsIHZhbHVlQ29udGV4dCwgSW1wb3J0TW9kZS5Vc2VFeGlzdGluZ0ltcG9ydCk7XG4gIGNvbnN0IHR5cGUgPSByZWZFbWl0dGVyLmVtaXQodHlwZVJlZiwgdHlwZUNvbnRleHQsIEltcG9ydE1vZGUuRm9yY2VOZXdJbXBvcnQpO1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdHlwZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlZmVyIHRvICR7dHMuU3ludGF4S2luZFt2YWx1ZVJlZi5ub2RlLmtpbmRdfWApO1xuICB9XG4gIHJldHVybiB7dmFsdWUsIHR5cGV9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBbmd1bGFyQ29yZShkZWNvcmF0b3I6IERlY29yYXRvcik6IGRlY29yYXRvciBpcyBEZWNvcmF0b3Ime2ltcG9ydDogSW1wb3J0fSB7XG4gIHJldHVybiBkZWNvcmF0b3IuaW1wb3J0ICE9PSBudWxsICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBbmd1bGFyQ29yZVJlZmVyZW5jZShyZWZlcmVuY2U6IFJlZmVyZW5jZSwgc3ltYm9sTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiByZWZlcmVuY2Uub3duZWRCeU1vZHVsZUd1ZXNzID09PSAnQGFuZ3VsYXIvY29yZScgJiYgcmVmZXJlbmNlLmRlYnVnTmFtZSA9PT0gc3ltYm9sTmFtZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbmd1bGFyRGVjb3JhdG9yKFxuICAgIGRlY29yYXRvcnM6IERlY29yYXRvcltdLCBuYW1lOiBzdHJpbmcsIGlzQ29yZTogYm9vbGVhbik6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICByZXR1cm4gZGVjb3JhdG9ycy5maW5kKGRlY29yYXRvciA9PiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yLCBuYW1lLCBpc0NvcmUpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3I6IERlY29yYXRvciwgbmFtZTogc3RyaW5nLCBpc0NvcmU6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgaWYgKGlzQ29yZSkge1xuICAgIHJldHVybiBkZWNvcmF0b3IubmFtZSA9PT0gbmFtZTtcbiAgfSBlbHNlIGlmIChpc0FuZ3VsYXJDb3JlKGRlY29yYXRvcikpIHtcbiAgICByZXR1cm4gZGVjb3JhdG9yLmltcG9ydC5uYW1lID09PSBuYW1lO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBVbndyYXAgYSBgdHMuRXhwcmVzc2lvbmAsIHJlbW92aW5nIG91dGVyIHR5cGUtY2FzdHMgb3IgcGFyZW50aGVzZXMgdW50aWwgdGhlIGV4cHJlc3Npb24gaXMgaW4gaXRzXG4gKiBsb3dlc3QgbGV2ZWwgZm9ybS5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGV4cHJlc3Npb24gXCIoZm9vIGFzIFR5cGUpXCIgdW53cmFwcyB0byBcImZvb1wiLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdW53cmFwRXhwcmVzc2lvbihub2RlOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIHdoaWxlICh0cy5pc0FzRXhwcmVzc2lvbihub2RlKSB8fCB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgbm9kZSA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn1cblxuZnVuY3Rpb24gZXhwYW5kRm9yd2FyZFJlZihhcmc6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBpZiAoIXRzLmlzQXJyb3dGdW5jdGlvbihhcmcpICYmICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihhcmcpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBib2R5ID0gYXJnLmJvZHk7XG4gIC8vIEVpdGhlciB0aGUgYm9keSBpcyBhIHRzLkV4cHJlc3Npb24gZGlyZWN0bHksIG9yIGEgYmxvY2sgd2l0aCBhIHNpbmdsZSByZXR1cm4gc3RhdGVtZW50LlxuICBpZiAodHMuaXNCbG9jayhib2R5KSkge1xuICAgIC8vIEJsb2NrIGJvZHkgLSBsb29rIGZvciBhIHNpbmdsZSByZXR1cm4gc3RhdGVtZW50LlxuICAgIGlmIChib2R5LnN0YXRlbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc3RtdCA9IGJvZHkuc3RhdGVtZW50c1swXTtcbiAgICBpZiAoIXRzLmlzUmV0dXJuU3RhdGVtZW50KHN0bXQpIHx8IHN0bXQuZXhwcmVzc2lvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHN0bXQuZXhwcmVzc2lvbjtcbiAgfSBlbHNlIHtcbiAgICAvLyBTaG9ydGhhbmQgYm9keSAtIHJldHVybiBhcyBhbiBleHByZXNzaW9uLlxuICAgIHJldHVybiBib2R5O1xuICB9XG59XG5cbi8qKlxuICogUG9zc2libHkgcmVzb2x2ZSBhIGZvcndhcmRSZWYoKSBleHByZXNzaW9uIGludG8gdGhlIGlubmVyIHZhbHVlLlxuICpcbiAqIEBwYXJhbSBub2RlIHRoZSBmb3J3YXJkUmVmKCkgZXhwcmVzc2lvbiB0byByZXNvbHZlXG4gKiBAcGFyYW0gcmVmbGVjdG9yIGEgUmVmbGVjdGlvbkhvc3RcbiAqIEByZXR1cm5zIHRoZSByZXNvbHZlZCBleHByZXNzaW9uLCBpZiB0aGUgb3JpZ2luYWwgZXhwcmVzc2lvbiB3YXMgYSBmb3J3YXJkUmVmKCksIG9yIHRoZSBvcmlnaW5hbFxuICogZXhwcmVzc2lvbiBvdGhlcndpc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVud3JhcEZvcndhcmRSZWYobm9kZTogdHMuRXhwcmVzc2lvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IHRzLkV4cHJlc3Npb24ge1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgfHwgIXRzLmlzSWRlbnRpZmllcihub2RlLmV4cHJlc3Npb24pIHx8XG4gICAgICBub2RlLmFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuICBjb25zdCBleHByID0gZXhwYW5kRm9yd2FyZFJlZihub2RlLmFyZ3VtZW50c1swXSk7XG4gIGlmIChleHByID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbiAgY29uc3QgaW1wID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcihub2RlLmV4cHJlc3Npb24pO1xuICBpZiAoaW1wID09PSBudWxsIHx8IGltcC5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScgfHwgaW1wLm5hbWUgIT09ICdmb3J3YXJkUmVmJykge1xuICAgIHJldHVybiBub2RlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBleHByO1xuICB9XG59XG5cbi8qKlxuICogQSBmb3JlaWduIGZ1bmN0aW9uIHJlc29sdmVyIGZvciBgc3RhdGljYWxseVJlc29sdmVgIHdoaWNoIHVud3JhcHMgZm9yd2FyZFJlZigpIGV4cHJlc3Npb25zLlxuICpcbiAqIEBwYXJhbSByZWYgYSBSZWZlcmVuY2UgdG8gdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBmdW5jdGlvbiBiZWluZyBjYWxsZWQgKHdoaWNoIG1pZ2h0IGJlXG4gKiBmb3J3YXJkUmVmKVxuICogQHBhcmFtIGFyZ3MgdGhlIGFyZ3VtZW50cyB0byB0aGUgaW52b2NhdGlvbiBvZiB0aGUgZm9yd2FyZFJlZiBleHByZXNzaW9uXG4gKiBAcmV0dXJucyBhbiB1bndyYXBwZWQgYXJndW1lbnQgaWYgYHJlZmAgcG9pbnRlZCB0byBmb3J3YXJkUmVmLCBvciBudWxsIG90aGVyd2lzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9yd2FyZFJlZlJlc29sdmVyKFxuICAgIHJlZjogUmVmZXJlbmNlPHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25FeHByZXNzaW9uPixcbiAgICBhcmdzOiBSZWFkb25seUFycmF5PHRzLkV4cHJlc3Npb24+KTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKCFpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlKHJlZiwgJ2ZvcndhcmRSZWYnKSB8fCBhcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiBleHBhbmRGb3J3YXJkUmVmKGFyZ3NbMF0pO1xufVxuXG4vKipcbiAqIENvbWJpbmVzIGFuIGFycmF5IG9mIHJlc29sdmVyIGZ1bmN0aW9ucyBpbnRvIGEgb25lLlxuICogQHBhcmFtIHJlc29sdmVycyBSZXNvbHZlcnMgdG8gYmUgY29tYmluZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5lUmVzb2x2ZXJzKHJlc29sdmVyczogRm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXJbXSk6IEZvcmVpZ25GdW5jdGlvblJlc29sdmVyIHtcbiAgcmV0dXJuIChyZWY6IFJlZmVyZW5jZTx0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRXhwcmVzc2lvbj4sXG4gICAgICAgICAgYXJnczogUmVhZG9ubHlBcnJheTx0cy5FeHByZXNzaW9uPik6IHRzLkV4cHJlc3Npb24gfFxuICAgICAgbnVsbCA9PiB7XG4gICAgZm9yIChjb25zdCByZXNvbHZlciBvZiByZXNvbHZlcnMpIHtcbiAgICAgIGNvbnN0IHJlc29sdmVkID0gcmVzb2x2ZXIocmVmLCBhcmdzKTtcbiAgICAgIGlmIChyZXNvbHZlZCAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShcbiAgICBleHByOiBFeHByZXNzaW9uLCBjb250ZXh0OiB0cy5Ob2RlLCBjb250ZXh0U291cmNlOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gIGlmIChpc1dyYXBwZWRUc05vZGVFeHByKGV4cHIpKSB7XG4gICAgY29uc3Qgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShleHByLm5vZGUpO1xuICAgIHJldHVybiBub2RlLmdldFNvdXJjZUZpbGUoKSA9PT0gY29udGV4dFNvdXJjZSAmJiBjb250ZXh0LnBvcyA8IG5vZGUucG9zO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXcmFwcGVkVHNOb2RlRXhwcihleHByOiBFeHByZXNzaW9uKTogZXhwciBpcyBXcmFwcGVkTm9kZUV4cHI8dHMuTm9kZT4ge1xuICByZXR1cm4gZXhwciBpbnN0YW5jZW9mIFdyYXBwZWROb2RlRXhwcjtcbn1cbiJdfQ==