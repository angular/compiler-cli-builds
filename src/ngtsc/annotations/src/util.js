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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/util", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
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
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, reflection_1.Decorator.nodeForError(dec), "Unexpected number of arguments to @Inject().");
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
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, reflection_1.Decorator.nodeForError(dec), "Unexpected number of arguments to @Attribute().");
                    }
                    token = new compiler_1.WrappedNodeExpr(dec.args[0]);
                    resolved = compiler_1.R3ResolvedDependencyType.Attribute;
                }
                else {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_UNEXPECTED, reflection_1.Decorator.nodeForError(dec), "Unexpected decorator " + name + " on parameter.");
                }
            });
            if (token instanceof compiler_1.ExternalExpr && token.value.name === 'ChangeDetectorRef' &&
                token.value.moduleName === '@angular/core') {
                resolved = compiler_1.R3ResolvedDependencyType.ChangeDetectorRef;
            }
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
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.PARAM_MISSING_TOKEN, param.nameNode, "No suitable injection token for parameter '" + (param.name || index) + "' of class '" + clazz.name.text + "'.\n" +
                (param.typeNode !== null ? "Found " + param.typeNode.getText() :
                    'no type or decorator'));
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
        arg = unwrapExpression(arg);
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
        node = unwrapExpression(node);
        if (!ts.isCallExpression(node) || node.arguments.length !== 1) {
            return node;
        }
        var fn = ts.isPropertyAccessExpression(node.expression) ? node.expression.name : node.expression;
        if (!ts.isIdentifier(fn)) {
            return node;
        }
        var expr = expandForwardRef(node.arguments[0]);
        if (expr === null) {
            return node;
        }
        var imp = reflector.getImportOfIdentifier(fn);
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
    function readBaseClass(node, reflector, evaluator) {
        var baseExpression = reflector.getBaseClassExpression(node);
        if (baseExpression !== null) {
            var baseClass = evaluator.evaluate(baseExpression);
            if (baseClass instanceof imports_1.Reference && reflector.isClass(baseClass.node)) {
                return baseClass;
            }
            else {
                return 'dynamic';
            }
        }
        return null;
    }
    exports.readBaseClass = readBaseClass;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXlJO0lBQ3pJLCtCQUFpQztJQUVqQywyRUFBa0U7SUFDbEUsbUVBQTZGO0lBRTdGLHlFQUFpSjtJQUVqSixJQUFZLHVCQUVYO0lBRkQsV0FBWSx1QkFBdUI7UUFDakMsK0ZBQWlCLENBQUE7SUFDbkIsQ0FBQyxFQUZXLHVCQUF1QixHQUF2QiwrQkFBdUIsS0FBdkIsK0JBQXVCLFFBRWxDO0lBZ0JELFNBQWdCLDBCQUEwQixDQUN0QyxLQUF1QixFQUFFLFNBQXlCLEVBQ2xELHFCQUE0QyxFQUFFLE1BQWU7UUFDL0QsSUFBTSxJQUFJLEdBQTJCLEVBQUUsQ0FBQztRQUN4QyxJQUFNLE1BQU0sR0FBMEIsRUFBRSxDQUFDO1FBQ3pDLElBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzRCxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7WUFDdkIsSUFBSSxTQUFTLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNqQyxPQUFPLElBQUksQ0FBQzthQUNiO2lCQUFNO2dCQUNMLFVBQVUsR0FBRyxFQUFFLENBQUM7YUFDakI7U0FDRjtRQUNELFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQyxLQUFLLEVBQUUsR0FBRztZQUM1QixJQUFJLEtBQUssR0FBRywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztZQUN4RixJQUFJLFFBQVEsR0FBRyxLQUFLLEVBQUUsSUFBSSxHQUFHLEtBQUssRUFBRSxRQUFRLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxLQUFL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O1lBQ3JELElBQUksU0FBUyxZQUFZLG1CQUFTLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3ZFLE9BQU8sU0FBd0MsQ0FBQzthQUNqRDtpQkFBTTtnQkFDTCxPQUFPLFNBQVMsQ0FBQzthQUNsQjtTQUNGO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBZEQsc0NBY0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBSM0RlcGVuZGVuY3lNZXRhZGF0YSwgUjNSZWZlcmVuY2UsIFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZSwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgSW1wb3J0TW9kZSwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Rm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIsIFBhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ3RvclBhcmFtZXRlciwgRGVjb3JhdG9yLCBJbXBvcnQsIFJlZmxlY3Rpb25Ib3N0LCBUeXBlVmFsdWVSZWZlcmVuY2UsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuZXhwb3J0IGVudW0gQ29uc3RydWN0b3JEZXBFcnJvcktpbmQge1xuICBOT19TVUlUQUJMRV9UT0tFTixcbn1cblxuZXhwb3J0IHR5cGUgQ29uc3RydWN0b3JEZXBzID0ge1xuICBkZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdO1xufSB8XG57XG4gIGRlcHM6IG51bGw7XG4gIGVycm9yczogQ29uc3RydWN0b3JEZXBFcnJvcltdO1xufTtcblxuZXhwb3J0IGludGVyZmFjZSBDb25zdHJ1Y3RvckRlcEVycm9yIHtcbiAgaW5kZXg6IG51bWJlcjtcbiAgcGFyYW06IEN0b3JQYXJhbWV0ZXI7XG4gIGtpbmQ6IENvbnN0cnVjdG9yRGVwRXJyb3JLaW5kO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgY2xheno6IENsYXNzRGVjbGFyYXRpb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZTogYm9vbGVhbik6IENvbnN0cnVjdG9yRGVwc3xudWxsIHtcbiAgY29uc3QgZGVwczogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXSA9IFtdO1xuICBjb25zdCBlcnJvcnM6IENvbnN0cnVjdG9yRGVwRXJyb3JbXSA9IFtdO1xuICBsZXQgY3RvclBhcmFtcyA9IHJlZmxlY3Rvci5nZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xhenopO1xuICBpZiAoY3RvclBhcmFtcyA9PT0gbnVsbCkge1xuICAgIGlmIChyZWZsZWN0b3IuaGFzQmFzZUNsYXNzKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0b3JQYXJhbXMgPSBbXTtcbiAgICB9XG4gIH1cbiAgY3RvclBhcmFtcy5mb3JFYWNoKChwYXJhbSwgaWR4KSA9PiB7XG4gICAgbGV0IHRva2VuID0gdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24ocGFyYW0udHlwZVZhbHVlUmVmZXJlbmNlLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIpO1xuICAgIGxldCBvcHRpb25hbCA9IGZhbHNlLCBzZWxmID0gZmFsc2UsIHNraXBTZWxmID0gZmFsc2UsIGhvc3QgPSBmYWxzZTtcbiAgICBsZXQgcmVzb2x2ZWQgPSBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuVG9rZW47XG5cbiAgICAocGFyYW0uZGVjb3JhdG9ycyB8fCBbXSkuZmlsdGVyKGRlYyA9PiBpc0NvcmUgfHwgaXNBbmd1bGFyQ29yZShkZWMpKS5mb3JFYWNoKGRlYyA9PiB7XG4gICAgICBjb25zdCBuYW1lID0gaXNDb3JlIHx8IGRlYy5pbXBvcnQgPT09IG51bGwgPyBkZWMubmFtZSA6IGRlYy5pbXBvcnQgIS5uYW1lO1xuICAgICAgaWYgKG5hbWUgPT09ICdJbmplY3QnKSB7XG4gICAgICAgIGlmIChkZWMuYXJncyA9PT0gbnVsbCB8fCBkZWMuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjKSxcbiAgICAgICAgICAgICAgYFVuZXhwZWN0ZWQgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBASW5qZWN0KCkuYCk7XG4gICAgICAgIH1cbiAgICAgICAgdG9rZW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKGRlYy5hcmdzWzBdKTtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ09wdGlvbmFsJykge1xuICAgICAgICBvcHRpb25hbCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdTa2lwU2VsZicpIHtcbiAgICAgICAgc2tpcFNlbGYgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnU2VsZicpIHtcbiAgICAgICAgc2VsZiA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdIb3N0Jykge1xuICAgICAgICBob3N0ID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ0F0dHJpYnV0ZScpIHtcbiAgICAgICAgaWYgKGRlYy5hcmdzID09PSBudWxsIHx8IGRlYy5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWMpLFxuICAgICAgICAgICAgICBgVW5leHBlY3RlZCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBBdHRyaWJ1dGUoKS5gKTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbiA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoZGVjLmFyZ3NbMF0pO1xuICAgICAgICByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5BdHRyaWJ1dGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX1VORVhQRUNURUQsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjKSxcbiAgICAgICAgICAgIGBVbmV4cGVjdGVkIGRlY29yYXRvciAke25hbWV9IG9uIHBhcmFtZXRlci5gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICh0b2tlbiBpbnN0YW5jZW9mIEV4dGVybmFsRXhwciAmJiB0b2tlbi52YWx1ZS5uYW1lID09PSAnQ2hhbmdlRGV0ZWN0b3JSZWYnICYmXG4gICAgICAgIHRva2VuLnZhbHVlLm1vZHVsZU5hbWUgPT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgcmVzb2x2ZWQgPSBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuQ2hhbmdlRGV0ZWN0b3JSZWY7XG4gICAgfVxuICAgIGlmICh0b2tlbiA9PT0gbnVsbCkge1xuICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICBpbmRleDogaWR4LFxuICAgICAgICBraW5kOiBDb25zdHJ1Y3RvckRlcEVycm9yS2luZC5OT19TVUlUQUJMRV9UT0tFTiwgcGFyYW0sXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVwcy5wdXNoKHt0b2tlbiwgb3B0aW9uYWwsIHNlbGYsIHNraXBTZWxmLCBob3N0LCByZXNvbHZlZH0pO1xuICAgIH1cbiAgfSk7XG4gIGlmIChlcnJvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtkZXBzfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge2RlcHM6IG51bGwsIGVycm9yc307XG4gIH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgYFR5cGVWYWx1ZVJlZmVyZW5jZWAgdG8gYW4gYEV4cHJlc3Npb25gIHdoaWNoIHJlZmVycyB0byB0aGUgdHlwZSBhcyBhIHZhbHVlLlxuICpcbiAqIExvY2FsIHJlZmVyZW5jZXMgYXJlIGNvbnZlcnRlZCB0byBhIGBXcmFwcGVkTm9kZUV4cHJgIG9mIHRoZSBUeXBlU2NyaXB0IGV4cHJlc3Npb24sIGFuZCBub24tbG9jYWxcbiAqIHJlZmVyZW5jZXMgYXJlIGNvbnZlcnRlZCB0byBhbiBgRXh0ZXJuYWxFeHByYC4gTm90ZSB0aGF0IHRoaXMgaXMgb25seSB2YWxpZCBpbiB0aGUgY29udGV4dCBvZiB0aGVcbiAqIGZpbGUgaW4gd2hpY2ggdGhlIGBUeXBlVmFsdWVSZWZlcmVuY2VgIG9yaWdpbmF0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbihcbiAgICB2YWx1ZVJlZjogVHlwZVZhbHVlUmVmZXJlbmNlLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcik6IEV4cHJlc3Npb247XG5leHBvcnQgZnVuY3Rpb24gdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24oXG4gICAgdmFsdWVSZWY6IG51bGwsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyKTogbnVsbDtcbmV4cG9ydCBmdW5jdGlvbiB2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbihcbiAgICB2YWx1ZVJlZjogVHlwZVZhbHVlUmVmZXJlbmNlIHwgbnVsbCwgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIpOiBFeHByZXNzaW9ufFxuICAgIG51bGw7XG5leHBvcnQgZnVuY3Rpb24gdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24oXG4gICAgdmFsdWVSZWY6IFR5cGVWYWx1ZVJlZmVyZW5jZSB8IG51bGwsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyKTogRXhwcmVzc2lvbnxcbiAgICBudWxsIHtcbiAgaWYgKHZhbHVlUmVmID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSBpZiAodmFsdWVSZWYubG9jYWwpIHtcbiAgICBpZiAoZGVmYXVsdEltcG9ydFJlY29yZGVyICE9PSBudWxsICYmIHZhbHVlUmVmLmRlZmF1bHRJbXBvcnRTdGF0ZW1lbnQgIT09IG51bGwgJiZcbiAgICAgICAgdHMuaXNJZGVudGlmaWVyKHZhbHVlUmVmLmV4cHJlc3Npb24pKSB7XG4gICAgICBkZWZhdWx0SW1wb3J0UmVjb3JkZXIucmVjb3JkSW1wb3J0ZWRJZGVudGlmaWVyKFxuICAgICAgICAgIHZhbHVlUmVmLmV4cHJlc3Npb24sIHZhbHVlUmVmLmRlZmF1bHRJbXBvcnRTdGF0ZW1lbnQpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFdyYXBwZWROb2RlRXhwcih2YWx1ZVJlZi5leHByZXNzaW9uKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY2FzdCBpcyBuZWNlc3NhcnkgYmVjYXVzZSB0aGUgZzMgdHlwZXNjcmlwdCB2ZXJzaW9uIGRvZXNuJ3QgbmFycm93IGhlcmUuXG4gICAgcmV0dXJuIG5ldyBFeHRlcm5hbEV4cHIodmFsdWVSZWYgYXN7bW9kdWxlTmFtZTogc3RyaW5nLCBuYW1lOiBzdHJpbmd9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlOiBib29sZWFuKTogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXXxudWxsIHtcbiAgcmV0dXJuIHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgICBjbGF6eiwgZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3RvciwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgY2xheno6IENsYXNzRGVjbGFyYXRpb24sIGRlcHM6IENvbnN0cnVjdG9yRGVwcyB8IG51bGwpOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfG51bGwge1xuICBpZiAoZGVwcyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKGRlcHMuZGVwcyAhPT0gbnVsbCkge1xuICAgIHJldHVybiBkZXBzLmRlcHM7XG4gIH0gZWxzZSB7XG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNhc3QgaXMgbmVjZXNzYXJ5IGJlY2F1c2UgdGhlIGczIHR5cGVzY3JpcHQgdmVyc2lvbiBkb2Vzbid0IG5hcnJvdyBoZXJlLlxuICAgIGNvbnN0IHtwYXJhbSwgaW5kZXh9ID0gKGRlcHMgYXN7ZXJyb3JzOiBDb25zdHJ1Y3RvckRlcEVycm9yW119KS5lcnJvcnNbMF07XG4gICAgLy8gVGhlcmUgaXMgYXQgbGVhc3Qgb25lIGVycm9yLlxuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLlBBUkFNX01JU1NJTkdfVE9LRU4sIHBhcmFtLm5hbWVOb2RlLFxuICAgICAgICBgTm8gc3VpdGFibGUgaW5qZWN0aW9uIHRva2VuIGZvciBwYXJhbWV0ZXIgJyR7cGFyYW0ubmFtZSB8fCBpbmRleH0nIG9mIGNsYXNzICcke2NsYXp6Lm5hbWUudGV4dH0nLlxcbmAgK1xuICAgICAgICAgICAgKHBhcmFtLnR5cGVOb2RlICE9PSBudWxsID8gYEZvdW5kICR7cGFyYW0udHlwZU5vZGUuZ2V0VGV4dCgpfWAgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vIHR5cGUgb3IgZGVjb3JhdG9yJykpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1IzUmVmZXJlbmNlKFxuICAgIHZhbHVlUmVmOiBSZWZlcmVuY2UsIHR5cGVSZWY6IFJlZmVyZW5jZSwgdmFsdWVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlLFxuICAgIHR5cGVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyKTogUjNSZWZlcmVuY2Uge1xuICBjb25zdCB2YWx1ZSA9IHJlZkVtaXR0ZXIuZW1pdCh2YWx1ZVJlZiwgdmFsdWVDb250ZXh0LCBJbXBvcnRNb2RlLlVzZUV4aXN0aW5nSW1wb3J0KTtcbiAgY29uc3QgdHlwZSA9IHJlZkVtaXR0ZXIuZW1pdCh0eXBlUmVmLCB0eXBlQ29udGV4dCwgSW1wb3J0TW9kZS5Gb3JjZU5ld0ltcG9ydCk7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB0eXBlID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcmVmZXIgdG8gJHt0cy5TeW50YXhLaW5kW3ZhbHVlUmVmLm5vZGUua2luZF19YCk7XG4gIH1cbiAgcmV0dXJuIHt2YWx1ZSwgdHlwZX07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FuZ3VsYXJDb3JlKGRlY29yYXRvcjogRGVjb3JhdG9yKTogZGVjb3JhdG9yIGlzIERlY29yYXRvciZ7aW1wb3J0OiBJbXBvcnR9IHtcbiAgcmV0dXJuIGRlY29yYXRvci5pbXBvcnQgIT09IG51bGwgJiYgZGVjb3JhdG9yLmltcG9ydC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZSc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlKHJlZmVyZW5jZTogUmVmZXJlbmNlLCBzeW1ib2xOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIHJlZmVyZW5jZS5vd25lZEJ5TW9kdWxlR3Vlc3MgPT09ICdAYW5ndWxhci9jb3JlJyAmJiByZWZlcmVuY2UuZGVidWdOYW1lID09PSBzeW1ib2xOYW1lO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZEFuZ3VsYXJEZWNvcmF0b3IoXG4gICAgZGVjb3JhdG9yczogRGVjb3JhdG9yW10sIG5hbWU6IHN0cmluZywgaXNDb3JlOiBib29sZWFuKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gIHJldHVybiBkZWNvcmF0b3JzLmZpbmQoZGVjb3JhdG9yID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3IsIG5hbWUsIGlzQ29yZSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcjogRGVjb3JhdG9yLCBuYW1lOiBzdHJpbmcsIGlzQ29yZTogYm9vbGVhbik6IGJvb2xlYW4ge1xuICBpZiAoaXNDb3JlKSB7XG4gICAgcmV0dXJuIGRlY29yYXRvci5uYW1lID09PSBuYW1lO1xuICB9IGVsc2UgaWYgKGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yKSkge1xuICAgIHJldHVybiBkZWNvcmF0b3IuaW1wb3J0Lm5hbWUgPT09IG5hbWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIFVud3JhcCBhIGB0cy5FeHByZXNzaW9uYCwgcmVtb3Zpbmcgb3V0ZXIgdHlwZS1jYXN0cyBvciBwYXJlbnRoZXNlcyB1bnRpbCB0aGUgZXhwcmVzc2lvbiBpcyBpbiBpdHNcbiAqIGxvd2VzdCBsZXZlbCBmb3JtLlxuICpcbiAqIEZvciBleGFtcGxlLCB0aGUgZXhwcmVzc2lvbiBcIihmb28gYXMgVHlwZSlcIiB1bndyYXBzIHRvIFwiZm9vXCIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bndyYXBFeHByZXNzaW9uKG5vZGU6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uIHtcbiAgd2hpbGUgKHRzLmlzQXNFeHByZXNzaW9uKG5vZGUpIHx8IHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICBub2RlID0gbm9kZS5leHByZXNzaW9uO1xuICB9XG4gIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBleHBhbmRGb3J3YXJkUmVmKGFyZzogdHMuRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gIGFyZyA9IHVud3JhcEV4cHJlc3Npb24oYXJnKTtcbiAgaWYgKCF0cy5pc0Fycm93RnVuY3Rpb24oYXJnKSAmJiAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oYXJnKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgYm9keSA9IGFyZy5ib2R5O1xuICAvLyBFaXRoZXIgdGhlIGJvZHkgaXMgYSB0cy5FeHByZXNzaW9uIGRpcmVjdGx5LCBvciBhIGJsb2NrIHdpdGggYSBzaW5nbGUgcmV0dXJuIHN0YXRlbWVudC5cbiAgaWYgKHRzLmlzQmxvY2soYm9keSkpIHtcbiAgICAvLyBCbG9jayBib2R5IC0gbG9vayBmb3IgYSBzaW5nbGUgcmV0dXJuIHN0YXRlbWVudC5cbiAgICBpZiAoYm9keS5zdGF0ZW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHN0bXQgPSBib2R5LnN0YXRlbWVudHNbMF07XG4gICAgaWYgKCF0cy5pc1JldHVyblN0YXRlbWVudChzdG10KSB8fCBzdG10LmV4cHJlc3Npb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzdG10LmV4cHJlc3Npb247XG4gIH0gZWxzZSB7XG4gICAgLy8gU2hvcnRoYW5kIGJvZHkgLSByZXR1cm4gYXMgYW4gZXhwcmVzc2lvbi5cbiAgICByZXR1cm4gYm9keTtcbiAgfVxufVxuXG4vKipcbiAqIFBvc3NpYmx5IHJlc29sdmUgYSBmb3J3YXJkUmVmKCkgZXhwcmVzc2lvbiBpbnRvIHRoZSBpbm5lciB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0gbm9kZSB0aGUgZm9yd2FyZFJlZigpIGV4cHJlc3Npb24gdG8gcmVzb2x2ZVxuICogQHBhcmFtIHJlZmxlY3RvciBhIFJlZmxlY3Rpb25Ib3N0XG4gKiBAcmV0dXJucyB0aGUgcmVzb2x2ZWQgZXhwcmVzc2lvbiwgaWYgdGhlIG9yaWdpbmFsIGV4cHJlc3Npb24gd2FzIGEgZm9yd2FyZFJlZigpLCBvciB0aGUgb3JpZ2luYWxcbiAqIGV4cHJlc3Npb24gb3RoZXJ3aXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bndyYXBGb3J3YXJkUmVmKG5vZGU6IHRzLkV4cHJlc3Npb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiB0cy5FeHByZXNzaW9uIHtcbiAgbm9kZSA9IHVud3JhcEV4cHJlc3Npb24obm9kZSk7XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSB8fCBub2RlLmFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIGNvbnN0IGZuID1cbiAgICAgIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbikgPyBub2RlLmV4cHJlc3Npb24ubmFtZSA6IG5vZGUuZXhwcmVzc2lvbjtcbiAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZm4pKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICBjb25zdCBleHByID0gZXhwYW5kRm9yd2FyZFJlZihub2RlLmFyZ3VtZW50c1swXSk7XG4gIGlmIChleHByID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbiAgY29uc3QgaW1wID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcihmbik7XG4gIGlmIChpbXAgPT09IG51bGwgfHwgaW1wLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJyB8fCBpbXAubmFtZSAhPT0gJ2ZvcndhcmRSZWYnKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGV4cHI7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGZvcmVpZ24gZnVuY3Rpb24gcmVzb2x2ZXIgZm9yIGBzdGF0aWNhbGx5UmVzb2x2ZWAgd2hpY2ggdW53cmFwcyBmb3J3YXJkUmVmKCkgZXhwcmVzc2lvbnMuXG4gKlxuICogQHBhcmFtIHJlZiBhIFJlZmVyZW5jZSB0byB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGZ1bmN0aW9uIGJlaW5nIGNhbGxlZCAod2hpY2ggbWlnaHQgYmVcbiAqIGZvcndhcmRSZWYpXG4gKiBAcGFyYW0gYXJncyB0aGUgYXJndW1lbnRzIHRvIHRoZSBpbnZvY2F0aW9uIG9mIHRoZSBmb3J3YXJkUmVmIGV4cHJlc3Npb25cbiAqIEByZXR1cm5zIGFuIHVud3JhcHBlZCBhcmd1bWVudCBpZiBgcmVmYCBwb2ludGVkIHRvIGZvcndhcmRSZWYsIG9yIG51bGwgb3RoZXJ3aXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3J3YXJkUmVmUmVzb2x2ZXIoXG4gICAgcmVmOiBSZWZlcmVuY2U8dHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkV4cHJlc3Npb24+LFxuICAgIGFyZ3M6IFJlYWRvbmx5QXJyYXk8dHMuRXhwcmVzc2lvbj4pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBpZiAoIWlzQW5ndWxhckNvcmVSZWZlcmVuY2UocmVmLCAnZm9yd2FyZFJlZicpIHx8IGFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIGV4cGFuZEZvcndhcmRSZWYoYXJnc1swXSk7XG59XG5cbi8qKlxuICogQ29tYmluZXMgYW4gYXJyYXkgb2YgcmVzb2x2ZXIgZnVuY3Rpb25zIGludG8gYSBvbmUuXG4gKiBAcGFyYW0gcmVzb2x2ZXJzIFJlc29sdmVycyB0byBiZSBjb21iaW5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmVSZXNvbHZlcnMocmVzb2x2ZXJzOiBGb3JlaWduRnVuY3Rpb25SZXNvbHZlcltdKTogRm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIge1xuICByZXR1cm4gKHJlZjogUmVmZXJlbmNlPHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25FeHByZXNzaW9uPixcbiAgICAgICAgICBhcmdzOiBSZWFkb25seUFycmF5PHRzLkV4cHJlc3Npb24+KTogdHMuRXhwcmVzc2lvbiB8XG4gICAgICBudWxsID0+IHtcbiAgICBmb3IgKGNvbnN0IHJlc29sdmVyIG9mIHJlc29sdmVycykge1xuICAgICAgY29uc3QgcmVzb2x2ZWQgPSByZXNvbHZlcihyZWYsIGFyZ3MpO1xuICAgICAgaWYgKHJlc29sdmVkICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKFxuICAgIGV4cHI6IEV4cHJlc3Npb24sIGNvbnRleHQ6IHRzLk5vZGUsIGNvbnRleHRTb3VyY2U6IHRzLlNvdXJjZUZpbGUpOiBib29sZWFuIHtcbiAgaWYgKGlzV3JhcHBlZFRzTm9kZUV4cHIoZXhwcikpIHtcbiAgICBjb25zdCBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKGV4cHIubm9kZSk7XG4gICAgcmV0dXJuIG5vZGUuZ2V0U291cmNlRmlsZSgpID09PSBjb250ZXh0U291cmNlICYmIGNvbnRleHQucG9zIDwgbm9kZS5wb3M7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1dyYXBwZWRUc05vZGVFeHByKGV4cHI6IEV4cHJlc3Npb24pOiBleHByIGlzIFdyYXBwZWROb2RlRXhwcjx0cy5Ob2RlPiB7XG4gIHJldHVybiBleHByIGluc3RhbmNlb2YgV3JhcHBlZE5vZGVFeHByO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEJhc2VDbGFzcyhcbiAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPnwnZHluYW1pYyd8bnVsbCB7XG4gIGNvbnN0IGJhc2VFeHByZXNzaW9uID0gcmVmbGVjdG9yLmdldEJhc2VDbGFzc0V4cHJlc3Npb24obm9kZSk7XG4gIGlmIChiYXNlRXhwcmVzc2lvbiAhPT0gbnVsbCkge1xuICAgIGNvbnN0IGJhc2VDbGFzcyA9IGV2YWx1YXRvci5ldmFsdWF0ZShiYXNlRXhwcmVzc2lvbik7XG4gICAgaWYgKGJhc2VDbGFzcyBpbnN0YW5jZW9mIFJlZmVyZW5jZSAmJiByZWZsZWN0b3IuaXNDbGFzcyhiYXNlQ2xhc3Mubm9kZSkpIHtcbiAgICAgIHJldHVybiBiYXNlQ2xhc3MgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJ2R5bmFtaWMnO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIl19