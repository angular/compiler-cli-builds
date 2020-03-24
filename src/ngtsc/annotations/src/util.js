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
            var attribute = null;
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
                    var attributeName = dec.args[0];
                    token = new compiler_1.WrappedNodeExpr(attributeName);
                    if (ts.isStringLiteralLike(attributeName)) {
                        attribute = new compiler_1.LiteralExpr(attributeName.text);
                    }
                    else {
                        attribute = new compiler_1.WrappedNodeExpr(ts.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword));
                    }
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
                deps.push({ token: token, attribute: attribute, optional: optional, self: self, skipSelf: skipSelf, host: host, resolved: resolved });
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
    /**
     * Convert `ConstructorDeps` into the `R3DependencyMetadata` array for those deps if they're valid,
     * or into an `'invalid'` signal if they're not.
     *
     * This is a companion function to `validateConstructorDependencies` which accepts invalid deps.
     */
    function unwrapConstructorDependencies(deps) {
        if (deps === null) {
            return null;
        }
        else if (deps.deps !== null) {
            // These constructor dependencies are valid.
            return deps.deps;
        }
        else {
            // These deps are invalid.
            return 'invalid';
        }
    }
    exports.unwrapConstructorDependencies = unwrapConstructorDependencies;
    function getValidConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore) {
        return validateConstructorDependencies(clazz, getConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore));
    }
    exports.getValidConstructorDependencies = getValidConstructorDependencies;
    /**
     * Validate that `ConstructorDeps` does not have any invalid dependencies and convert them into the
     * `R3DependencyMetadata` array if so, or raise a diagnostic if some deps are invalid.
     *
     * This is a companion function to `unwrapConstructorDependencies` which does not accept invalid
     * deps.
     */
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
        var value = refEmitter.emit(valueRef, valueContext);
        var type = refEmitter.emit(typeRef, typeContext, imports_1.ImportFlags.ForceNewImport | imports_1.ImportFlags.AllowTypeImports);
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
    var parensWrapperTransformerFactory = function (context) {
        var visitor = function (node) {
            var visited = ts.visitEachChild(node, visitor, context);
            if (ts.isArrowFunction(visited) || ts.isFunctionExpression(visited)) {
                return ts.createParen(visited);
            }
            return visited;
        };
        return function (node) { return ts.visitEachChild(node, visitor, context); };
    };
    /**
     * Wraps all functions in a given expression in parentheses. This is needed to avoid problems
     * where Tsickle annotations added between analyse and transform phases in Angular may trigger
     * automatic semicolon insertion, e.g. if a function is the expression in a `return` statement.
     * More
     * info can be found in Tsickle source code here:
     * https://github.com/angular/tsickle/blob/d7974262571c8a17d684e5ba07680e1b1993afdd/src/jsdoc_transformer.ts#L1021
     *
     * @param expression Expression where functions should be wrapped in parentheses
     */
    function wrapFunctionExpressionsInParens(expression) {
        return ts.transform(expression, [parensWrapperTransformerFactory]).transformed[0];
    }
    exports.wrapFunctionExpressionsInParens = wrapFunctionExpressionsInParens;
    /**
     * Create a `ts.Diagnostic` which indicates the given class is part of the declarations of two or
     * more NgModules.
     *
     * The resulting `ts.Diagnostic` will have a context entry for each NgModule showing the point where
     * the directive/pipe exists in its `declarations` (if possible).
     */
    function makeDuplicateDeclarationError(node, data, kind) {
        var e_2, _a;
        var context = [];
        try {
            for (var data_1 = tslib_1.__values(data), data_1_1 = data_1.next(); !data_1_1.done; data_1_1 = data_1.next()) {
                var decl = data_1_1.value;
                if (decl.rawDeclarations === null) {
                    continue;
                }
                // Try to find the reference to the declaration within the declarations array, to hang the
                // error there. If it can't be found, fall back on using the NgModule's name.
                var contextNode = decl.ref.getOriginForDiagnostics(decl.rawDeclarations, decl.ngModule.name);
                context.push({
                    node: contextNode,
                    messageText: "'" + node.name.text + "' is listed in the declarations of the NgModule '" + decl.ngModule.name.text + "'.",
                });
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (data_1_1 && !data_1_1.done && (_a = data_1.return)) _a.call(data_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        // Finally, produce the diagnostic.
        return diagnostics_1.makeDiagnostic(diagnostics_1.ErrorCode.NGMODULE_DECLARATION_NOT_UNIQUE, node.name, "The " + kind + " '" + node.name.text + "' is declared by more than one NgModule.", context);
    }
    exports.makeDuplicateDeclarationError = makeDuplicateDeclarationError;
    /**
     * Resolves the given `rawProviders` into `ClassDeclarations` and returns
     * a set containing those that are known to require a factory definition.
     * @param rawProviders Expression that declared the providers array in the source.
     */
    function resolveProvidersRequiringFactory(rawProviders, reflector, evaluator) {
        var providers = new Set();
        var resolvedProviders = evaluator.evaluate(rawProviders);
        if (!Array.isArray(resolvedProviders)) {
            return providers;
        }
        resolvedProviders.forEach(function processProviders(provider) {
            var tokenClass = null;
            if (Array.isArray(provider)) {
                // If we ran into an array, recurse into it until we've resolve all the classes.
                provider.forEach(processProviders);
            }
            else if (provider instanceof imports_1.Reference) {
                tokenClass = provider;
            }
            else if (provider instanceof Map && provider.has('useClass') && !provider.has('deps')) {
                var useExisting = provider.get('useClass');
                if (useExisting instanceof imports_1.Reference) {
                    tokenClass = useExisting;
                }
            }
            if (tokenClass !== null && reflector.isClass(tokenClass.node)) {
                var constructorParameters = reflector.getConstructorParameters(tokenClass.node);
                // Note that we only want to capture providers with a non-trivial constructor,
                // because they're the ones that might be using DI and need to be decorated.
                if (constructorParameters !== null && constructorParameters.length > 0) {
                    providers.add(tokenClass);
                }
            }
        });
        return providers;
    }
    exports.resolveProvidersRequiringFactory = resolveProvidersRequiringFactory;
    /**
     * Create an R3Reference for a class.
     *
     * The `value` is the exported declaration of the class from its source file.
     * The `type` is an expression that would be used by ngcc in the typings (.d.ts) files.
     */
    function wrapTypeReference(reflector, clazz) {
        var dtsClass = reflector.getDtsDeclaration(clazz);
        var value = new compiler_1.WrappedNodeExpr(clazz.name);
        var type = dtsClass !== null && reflection_1.isNamedClassDeclaration(dtsClass) ?
            new compiler_1.WrappedNodeExpr(dtsClass.name) :
            value;
        return { value: value, type: type };
    }
    exports.wrapTypeReference = wrapTypeReference;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXNKO0lBQ3RKLCtCQUFpQztJQUVqQywyRUFBa0Y7SUFDbEYsbUVBQThGO0lBRTlGLHlFQUFpSjtJQUdqSixJQUFZLHVCQUVYO0lBRkQsV0FBWSx1QkFBdUI7UUFDakMsK0ZBQWlCLENBQUE7SUFDbkIsQ0FBQyxFQUZXLHVCQUF1QixHQUF2QiwrQkFBdUIsS0FBdkIsK0JBQXVCLFFBRWxDO0lBZ0JELFNBQWdCLDBCQUEwQixDQUN0QyxLQUF1QixFQUFFLFNBQXlCLEVBQ2xELHFCQUE0QyxFQUFFLE1BQWU7UUFDL0QsSUFBTSxJQUFJLEdBQTJCLEVBQUUsQ0FBQztRQUN4QyxJQUFNLE1BQU0sR0FBMEIsRUFBRSxDQUFDO1FBQ3pDLElBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzRCxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7WUFDdkIsSUFBSSxTQUFTLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNqQyxPQUFPLElBQUksQ0FBQzthQUNiO2lCQUFNO2dCQUNMLFVBQVUsR0FBRyxFQUFFLENBQUM7YUFDakI7U0FDRjtRQUNELFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQyxLQUFLLEVBQUUsR0FBRztZQUM1QixJQUFJLEtBQUssR0FBRywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztZQUN4RixJQUFJLFNBQVMsR0FBb0IsSUFBSSxDQUFDO1lBQ3RDLElBQUksUUFBUSxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsS0FBSyxFQUFFLFFB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IEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgTGl0ZXJhbEV4cHIsIFIzRGVwZW5kZW5jeU1ldGFkYXRhLCBSM1JlZmVyZW5jZSwgUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3IsIG1ha2VEaWFnbm9zdGljfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgSW1wb3J0RmxhZ3MsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0ZvcmVpZ25GdW5jdGlvblJlc29sdmVyLCBQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIEN0b3JQYXJhbWV0ZXIsIERlY29yYXRvciwgSW1wb3J0LCBSZWZsZWN0aW9uSG9zdCwgVHlwZVZhbHVlUmVmZXJlbmNlLCBpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0RlY2xhcmF0aW9uRGF0YX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuXG5leHBvcnQgZW51bSBDb25zdHJ1Y3RvckRlcEVycm9yS2luZCB7XG4gIE5PX1NVSVRBQkxFX1RPS0VOLFxufVxuXG5leHBvcnQgdHlwZSBDb25zdHJ1Y3RvckRlcHMgPSB7XG4gIGRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW107XG59IHxcbntcbiAgZGVwczogbnVsbDtcbiAgZXJyb3JzOiBDb25zdHJ1Y3RvckRlcEVycm9yW107XG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbnN0cnVjdG9yRGVwRXJyb3Ige1xuICBpbmRleDogbnVtYmVyO1xuICBwYXJhbTogQ3RvclBhcmFtZXRlcjtcbiAga2luZDogQ29uc3RydWN0b3JEZXBFcnJvcktpbmQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlOiBib29sZWFuKTogQ29uc3RydWN0b3JEZXBzfG51bGwge1xuICBjb25zdCBkZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdID0gW107XG4gIGNvbnN0IGVycm9yczogQ29uc3RydWN0b3JEZXBFcnJvcltdID0gW107XG4gIGxldCBjdG9yUGFyYW1zID0gcmVmbGVjdG9yLmdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhjbGF6eik7XG4gIGlmIChjdG9yUGFyYW1zID09PSBudWxsKSB7XG4gICAgaWYgKHJlZmxlY3Rvci5oYXNCYXNlQ2xhc3MoY2xhenopKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgY3RvclBhcmFtcyA9IFtdO1xuICAgIH1cbiAgfVxuICBjdG9yUGFyYW1zLmZvckVhY2goKHBhcmFtLCBpZHgpID0+IHtcbiAgICBsZXQgdG9rZW4gPSB2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbihwYXJhbS50eXBlVmFsdWVSZWZlcmVuY2UsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcik7XG4gICAgbGV0IGF0dHJpYnV0ZTogRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBsZXQgb3B0aW9uYWwgPSBmYWxzZSwgc2VsZiA9IGZhbHNlLCBza2lwU2VsZiA9IGZhbHNlLCBob3N0ID0gZmFsc2U7XG4gICAgbGV0IHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLlRva2VuO1xuXG4gICAgKHBhcmFtLmRlY29yYXRvcnMgfHwgW10pLmZpbHRlcihkZWMgPT4gaXNDb3JlIHx8IGlzQW5ndWxhckNvcmUoZGVjKSkuZm9yRWFjaChkZWMgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IGlzQ29yZSB8fCBkZWMuaW1wb3J0ID09PSBudWxsID8gZGVjLm5hbWUgOiBkZWMuaW1wb3J0ICEubmFtZTtcbiAgICAgIGlmIChuYW1lID09PSAnSW5qZWN0Jykge1xuICAgICAgICBpZiAoZGVjLmFyZ3MgPT09IG51bGwgfHwgZGVjLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlYyksXG4gICAgICAgICAgICAgIGBVbmV4cGVjdGVkIG51bWJlciBvZiBhcmd1bWVudHMgdG8gQEluamVjdCgpLmApO1xuICAgICAgICB9XG4gICAgICAgIHRva2VuID0gbmV3IFdyYXBwZWROb2RlRXhwcihkZWMuYXJnc1swXSk7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdPcHRpb25hbCcpIHtcbiAgICAgICAgb3B0aW9uYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnU2tpcFNlbGYnKSB7XG4gICAgICAgIHNraXBTZWxmID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ1NlbGYnKSB7XG4gICAgICAgIHNlbGYgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnSG9zdCcpIHtcbiAgICAgICAgaG9zdCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdBdHRyaWJ1dGUnKSB7XG4gICAgICAgIGlmIChkZWMuYXJncyA9PT0gbnVsbCB8fCBkZWMuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjKSxcbiAgICAgICAgICAgICAgYFVuZXhwZWN0ZWQgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAQXR0cmlidXRlKCkuYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYXR0cmlidXRlTmFtZSA9IGRlYy5hcmdzWzBdO1xuICAgICAgICB0b2tlbiA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoYXR0cmlidXRlTmFtZSk7XG4gICAgICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWxMaWtlKGF0dHJpYnV0ZU5hbWUpKSB7XG4gICAgICAgICAgYXR0cmlidXRlID0gbmV3IExpdGVyYWxFeHByKGF0dHJpYnV0ZU5hbWUudGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXR0cmlidXRlID0gbmV3IFdyYXBwZWROb2RlRXhwcih0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5Vbmtub3duS2V5d29yZCkpO1xuICAgICAgICB9XG4gICAgICAgIHJlc29sdmVkID0gUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLkF0dHJpYnV0ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfVU5FWFBFQ1RFRCwgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWMpLFxuICAgICAgICAgICAgYFVuZXhwZWN0ZWQgZGVjb3JhdG9yICR7bmFtZX0gb24gcGFyYW1ldGVyLmApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHRva2VuIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByICYmIHRva2VuLnZhbHVlLm5hbWUgPT09ICdDaGFuZ2VEZXRlY3RvclJlZicgJiZcbiAgICAgICAgdG9rZW4udmFsdWUubW9kdWxlTmFtZSA9PT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5DaGFuZ2VEZXRlY3RvclJlZjtcbiAgICB9XG4gICAgaWYgKHRva2VuID09PSBudWxsKSB7XG4gICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgIGluZGV4OiBpZHgsXG4gICAgICAgIGtpbmQ6IENvbnN0cnVjdG9yRGVwRXJyb3JLaW5kLk5PX1NVSVRBQkxFX1RPS0VOLCBwYXJhbSxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZXBzLnB1c2goe3Rva2VuLCBhdHRyaWJ1dGUsIG9wdGlvbmFsLCBzZWxmLCBza2lwU2VsZiwgaG9zdCwgcmVzb2x2ZWR9KTtcbiAgICB9XG4gIH0pO1xuICBpZiAoZXJyb3JzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7ZGVwc307XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtkZXBzOiBudWxsLCBlcnJvcnN9O1xuICB9XG59XG5cbi8qKlxuICogQ29udmVydCBhIGBUeXBlVmFsdWVSZWZlcmVuY2VgIHRvIGFuIGBFeHByZXNzaW9uYCB3aGljaCByZWZlcnMgdG8gdGhlIHR5cGUgYXMgYSB2YWx1ZS5cbiAqXG4gKiBMb2NhbCByZWZlcmVuY2VzIGFyZSBjb252ZXJ0ZWQgdG8gYSBgV3JhcHBlZE5vZGVFeHByYCBvZiB0aGUgVHlwZVNjcmlwdCBleHByZXNzaW9uLCBhbmQgbm9uLWxvY2FsXG4gKiByZWZlcmVuY2VzIGFyZSBjb252ZXJ0ZWQgdG8gYW4gYEV4dGVybmFsRXhwcmAuIE5vdGUgdGhhdCB0aGlzIGlzIG9ubHkgdmFsaWQgaW4gdGhlIGNvbnRleHQgb2YgdGhlXG4gKiBmaWxlIGluIHdoaWNoIHRoZSBgVHlwZVZhbHVlUmVmZXJlbmNlYCBvcmlnaW5hdGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24oXG4gICAgdmFsdWVSZWY6IFR5cGVWYWx1ZVJlZmVyZW5jZSwgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIpOiBFeHByZXNzaW9uO1xuZXhwb3J0IGZ1bmN0aW9uIHZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uKFxuICAgIHZhbHVlUmVmOiBudWxsLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcik6IG51bGw7XG5leHBvcnQgZnVuY3Rpb24gdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24oXG4gICAgdmFsdWVSZWY6IFR5cGVWYWx1ZVJlZmVyZW5jZSB8IG51bGwsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyKTogRXhwcmVzc2lvbnxcbiAgICBudWxsO1xuZXhwb3J0IGZ1bmN0aW9uIHZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uKFxuICAgIHZhbHVlUmVmOiBUeXBlVmFsdWVSZWZlcmVuY2UgfCBudWxsLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcik6IEV4cHJlc3Npb258XG4gICAgbnVsbCB7XG4gIGlmICh2YWx1ZVJlZiA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKHZhbHVlUmVmLmxvY2FsKSB7XG4gICAgaWYgKGRlZmF1bHRJbXBvcnRSZWNvcmRlciAhPT0gbnVsbCAmJiB2YWx1ZVJlZi5kZWZhdWx0SW1wb3J0U3RhdGVtZW50ICE9PSBudWxsICYmXG4gICAgICAgIHRzLmlzSWRlbnRpZmllcih2YWx1ZVJlZi5leHByZXNzaW9uKSkge1xuICAgICAgZGVmYXVsdEltcG9ydFJlY29yZGVyLnJlY29yZEltcG9ydGVkSWRlbnRpZmllcihcbiAgICAgICAgICB2YWx1ZVJlZi5leHByZXNzaW9uLCB2YWx1ZVJlZi5kZWZhdWx0SW1wb3J0U3RhdGVtZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBXcmFwcGVkTm9kZUV4cHIodmFsdWVSZWYuZXhwcmVzc2lvbik7XG4gIH0gZWxzZSB7XG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNhc3QgaXMgbmVjZXNzYXJ5IGJlY2F1c2UgdGhlIGczIHR5cGVzY3JpcHQgdmVyc2lvbiBkb2Vzbid0IG5hcnJvdyBoZXJlLlxuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxFeHByKHZhbHVlUmVmIGFze21vZHVsZU5hbWU6IHN0cmluZywgbmFtZTogc3RyaW5nfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0IGBDb25zdHJ1Y3RvckRlcHNgIGludG8gdGhlIGBSM0RlcGVuZGVuY3lNZXRhZGF0YWAgYXJyYXkgZm9yIHRob3NlIGRlcHMgaWYgdGhleSdyZSB2YWxpZCxcbiAqIG9yIGludG8gYW4gYCdpbnZhbGlkJ2Agc2lnbmFsIGlmIHRoZXkncmUgbm90LlxuICpcbiAqIFRoaXMgaXMgYSBjb21wYW5pb24gZnVuY3Rpb24gdG8gYHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXNgIHdoaWNoIGFjY2VwdHMgaW52YWxpZCBkZXBzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdW53cmFwQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoZGVwczogQ29uc3RydWN0b3JEZXBzIHwgbnVsbCk6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118XG4gICAgJ2ludmFsaWQnfG51bGwge1xuICBpZiAoZGVwcyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKGRlcHMuZGVwcyAhPT0gbnVsbCkge1xuICAgIC8vIFRoZXNlIGNvbnN0cnVjdG9yIGRlcGVuZGVuY2llcyBhcmUgdmFsaWQuXG4gICAgcmV0dXJuIGRlcHMuZGVwcztcbiAgfSBlbHNlIHtcbiAgICAvLyBUaGVzZSBkZXBzIGFyZSBpbnZhbGlkLlxuICAgIHJldHVybiAnaW52YWxpZCc7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgY2xheno6IENsYXNzRGVjbGFyYXRpb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZTogYm9vbGVhbik6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118bnVsbCB7XG4gIHJldHVybiB2YWxpZGF0ZUNvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgICAgY2xhenosIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByZWZsZWN0b3IsIGRlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlKSk7XG59XG5cbi8qKlxuICogVmFsaWRhdGUgdGhhdCBgQ29uc3RydWN0b3JEZXBzYCBkb2VzIG5vdCBoYXZlIGFueSBpbnZhbGlkIGRlcGVuZGVuY2llcyBhbmQgY29udmVydCB0aGVtIGludG8gdGhlXG4gKiBgUjNEZXBlbmRlbmN5TWV0YWRhdGFgIGFycmF5IGlmIHNvLCBvciByYWlzZSBhIGRpYWdub3N0aWMgaWYgc29tZSBkZXBzIGFyZSBpbnZhbGlkLlxuICpcbiAqIFRoaXMgaXMgYSBjb21wYW5pb24gZnVuY3Rpb24gdG8gYHVud3JhcENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzYCB3aGljaCBkb2VzIG5vdCBhY2NlcHQgaW52YWxpZFxuICogZGVwcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgY2xheno6IENsYXNzRGVjbGFyYXRpb24sIGRlcHM6IENvbnN0cnVjdG9yRGVwcyB8IG51bGwpOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfG51bGwge1xuICBpZiAoZGVwcyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKGRlcHMuZGVwcyAhPT0gbnVsbCkge1xuICAgIHJldHVybiBkZXBzLmRlcHM7XG4gIH0gZWxzZSB7XG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNhc3QgaXMgbmVjZXNzYXJ5IGJlY2F1c2UgdGhlIGczIHR5cGVzY3JpcHQgdmVyc2lvbiBkb2Vzbid0IG5hcnJvdyBoZXJlLlxuICAgIGNvbnN0IHtwYXJhbSwgaW5kZXh9ID0gKGRlcHMgYXN7ZXJyb3JzOiBDb25zdHJ1Y3RvckRlcEVycm9yW119KS5lcnJvcnNbMF07XG4gICAgLy8gVGhlcmUgaXMgYXQgbGVhc3Qgb25lIGVycm9yLlxuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLlBBUkFNX01JU1NJTkdfVE9LRU4sIHBhcmFtLm5hbWVOb2RlLFxuICAgICAgICBgTm8gc3VpdGFibGUgaW5qZWN0aW9uIHRva2VuIGZvciBwYXJhbWV0ZXIgJyR7cGFyYW0ubmFtZSB8fCBpbmRleH0nIG9mIGNsYXNzICcke2NsYXp6Lm5hbWUudGV4dH0nLlxcbmAgK1xuICAgICAgICAgICAgKHBhcmFtLnR5cGVOb2RlICE9PSBudWxsID8gYEZvdW5kICR7cGFyYW0udHlwZU5vZGUuZ2V0VGV4dCgpfWAgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vIHR5cGUgb3IgZGVjb3JhdG9yJykpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1IzUmVmZXJlbmNlKFxuICAgIHZhbHVlUmVmOiBSZWZlcmVuY2UsIHR5cGVSZWY6IFJlZmVyZW5jZSwgdmFsdWVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlLFxuICAgIHR5cGVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyKTogUjNSZWZlcmVuY2Uge1xuICBjb25zdCB2YWx1ZSA9IHJlZkVtaXR0ZXIuZW1pdCh2YWx1ZVJlZiwgdmFsdWVDb250ZXh0KTtcbiAgY29uc3QgdHlwZSA9IHJlZkVtaXR0ZXIuZW1pdChcbiAgICAgIHR5cGVSZWYsIHR5cGVDb250ZXh0LCBJbXBvcnRGbGFncy5Gb3JjZU5ld0ltcG9ydCB8IEltcG9ydEZsYWdzLkFsbG93VHlwZUltcG9ydHMpO1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdHlwZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlZmVyIHRvICR7dHMuU3ludGF4S2luZFt2YWx1ZVJlZi5ub2RlLmtpbmRdfWApO1xuICB9XG4gIHJldHVybiB7dmFsdWUsIHR5cGV9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBbmd1bGFyQ29yZShkZWNvcmF0b3I6IERlY29yYXRvcik6IGRlY29yYXRvciBpcyBEZWNvcmF0b3Ime2ltcG9ydDogSW1wb3J0fSB7XG4gIHJldHVybiBkZWNvcmF0b3IuaW1wb3J0ICE9PSBudWxsICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBbmd1bGFyQ29yZVJlZmVyZW5jZShyZWZlcmVuY2U6IFJlZmVyZW5jZSwgc3ltYm9sTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiByZWZlcmVuY2Uub3duZWRCeU1vZHVsZUd1ZXNzID09PSAnQGFuZ3VsYXIvY29yZScgJiYgcmVmZXJlbmNlLmRlYnVnTmFtZSA9PT0gc3ltYm9sTmFtZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbmd1bGFyRGVjb3JhdG9yKFxuICAgIGRlY29yYXRvcnM6IERlY29yYXRvcltdLCBuYW1lOiBzdHJpbmcsIGlzQ29yZTogYm9vbGVhbik6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICByZXR1cm4gZGVjb3JhdG9ycy5maW5kKGRlY29yYXRvciA9PiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yLCBuYW1lLCBpc0NvcmUpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3I6IERlY29yYXRvciwgbmFtZTogc3RyaW5nLCBpc0NvcmU6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgaWYgKGlzQ29yZSkge1xuICAgIHJldHVybiBkZWNvcmF0b3IubmFtZSA9PT0gbmFtZTtcbiAgfSBlbHNlIGlmIChpc0FuZ3VsYXJDb3JlKGRlY29yYXRvcikpIHtcbiAgICByZXR1cm4gZGVjb3JhdG9yLmltcG9ydC5uYW1lID09PSBuYW1lO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBVbndyYXAgYSBgdHMuRXhwcmVzc2lvbmAsIHJlbW92aW5nIG91dGVyIHR5cGUtY2FzdHMgb3IgcGFyZW50aGVzZXMgdW50aWwgdGhlIGV4cHJlc3Npb24gaXMgaW4gaXRzXG4gKiBsb3dlc3QgbGV2ZWwgZm9ybS5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGV4cHJlc3Npb24gXCIoZm9vIGFzIFR5cGUpXCIgdW53cmFwcyB0byBcImZvb1wiLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdW53cmFwRXhwcmVzc2lvbihub2RlOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIHdoaWxlICh0cy5pc0FzRXhwcmVzc2lvbihub2RlKSB8fCB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgbm9kZSA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn1cblxuZnVuY3Rpb24gZXhwYW5kRm9yd2FyZFJlZihhcmc6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBhcmcgPSB1bndyYXBFeHByZXNzaW9uKGFyZyk7XG4gIGlmICghdHMuaXNBcnJvd0Z1bmN0aW9uKGFyZykgJiYgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGFyZykpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGJvZHkgPSBhcmcuYm9keTtcbiAgLy8gRWl0aGVyIHRoZSBib2R5IGlzIGEgdHMuRXhwcmVzc2lvbiBkaXJlY3RseSwgb3IgYSBibG9jayB3aXRoIGEgc2luZ2xlIHJldHVybiBzdGF0ZW1lbnQuXG4gIGlmICh0cy5pc0Jsb2NrKGJvZHkpKSB7XG4gICAgLy8gQmxvY2sgYm9keSAtIGxvb2sgZm9yIGEgc2luZ2xlIHJldHVybiBzdGF0ZW1lbnQuXG4gICAgaWYgKGJvZHkuc3RhdGVtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzdG10ID0gYm9keS5zdGF0ZW1lbnRzWzBdO1xuICAgIGlmICghdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RtdCkgfHwgc3RtdC5leHByZXNzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gc3RtdC5leHByZXNzaW9uO1xuICB9IGVsc2Uge1xuICAgIC8vIFNob3J0aGFuZCBib2R5IC0gcmV0dXJuIGFzIGFuIGV4cHJlc3Npb24uXG4gICAgcmV0dXJuIGJvZHk7XG4gIH1cbn1cblxuLyoqXG4gKiBQb3NzaWJseSByZXNvbHZlIGEgZm9yd2FyZFJlZigpIGV4cHJlc3Npb24gaW50byB0aGUgaW5uZXIgdmFsdWUuXG4gKlxuICogQHBhcmFtIG5vZGUgdGhlIGZvcndhcmRSZWYoKSBleHByZXNzaW9uIHRvIHJlc29sdmVcbiAqIEBwYXJhbSByZWZsZWN0b3IgYSBSZWZsZWN0aW9uSG9zdFxuICogQHJldHVybnMgdGhlIHJlc29sdmVkIGV4cHJlc3Npb24sIGlmIHRoZSBvcmlnaW5hbCBleHByZXNzaW9uIHdhcyBhIGZvcndhcmRSZWYoKSwgb3IgdGhlIG9yaWdpbmFsXG4gKiBleHByZXNzaW9uIG90aGVyd2lzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdW53cmFwRm9yd2FyZFJlZihub2RlOiB0cy5FeHByZXNzaW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KTogdHMuRXhwcmVzc2lvbiB7XG4gIG5vZGUgPSB1bndyYXBFeHByZXNzaW9uKG5vZGUpO1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgfHwgbm9kZS5hcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICBjb25zdCBmbiA9XG4gICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24pID8gbm9kZS5leHByZXNzaW9uLm5hbWUgOiBub2RlLmV4cHJlc3Npb247XG4gIGlmICghdHMuaXNJZGVudGlmaWVyKGZuKSkge1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgY29uc3QgZXhwciA9IGV4cGFuZEZvcndhcmRSZWYobm9kZS5hcmd1bWVudHNbMF0pO1xuICBpZiAoZXhwciA9PT0gbnVsbCkge1xuICAgIHJldHVybiBub2RlO1xuICB9XG4gIGNvbnN0IGltcCA9IHJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIoZm4pO1xuICBpZiAoaW1wID09PSBudWxsIHx8IGltcC5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScgfHwgaW1wLm5hbWUgIT09ICdmb3J3YXJkUmVmJykge1xuICAgIHJldHVybiBub2RlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBleHByO1xuICB9XG59XG5cbi8qKlxuICogQSBmb3JlaWduIGZ1bmN0aW9uIHJlc29sdmVyIGZvciBgc3RhdGljYWxseVJlc29sdmVgIHdoaWNoIHVud3JhcHMgZm9yd2FyZFJlZigpIGV4cHJlc3Npb25zLlxuICpcbiAqIEBwYXJhbSByZWYgYSBSZWZlcmVuY2UgdG8gdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBmdW5jdGlvbiBiZWluZyBjYWxsZWQgKHdoaWNoIG1pZ2h0IGJlXG4gKiBmb3J3YXJkUmVmKVxuICogQHBhcmFtIGFyZ3MgdGhlIGFyZ3VtZW50cyB0byB0aGUgaW52b2NhdGlvbiBvZiB0aGUgZm9yd2FyZFJlZiBleHByZXNzaW9uXG4gKiBAcmV0dXJucyBhbiB1bndyYXBwZWQgYXJndW1lbnQgaWYgYHJlZmAgcG9pbnRlZCB0byBmb3J3YXJkUmVmLCBvciBudWxsIG90aGVyd2lzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9yd2FyZFJlZlJlc29sdmVyKFxuICAgIHJlZjogUmVmZXJlbmNlPHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25FeHByZXNzaW9uPixcbiAgICBhcmdzOiBSZWFkb25seUFycmF5PHRzLkV4cHJlc3Npb24+KTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKCFpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlKHJlZiwgJ2ZvcndhcmRSZWYnKSB8fCBhcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiBleHBhbmRGb3J3YXJkUmVmKGFyZ3NbMF0pO1xufVxuXG4vKipcbiAqIENvbWJpbmVzIGFuIGFycmF5IG9mIHJlc29sdmVyIGZ1bmN0aW9ucyBpbnRvIGEgb25lLlxuICogQHBhcmFtIHJlc29sdmVycyBSZXNvbHZlcnMgdG8gYmUgY29tYmluZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5lUmVzb2x2ZXJzKHJlc29sdmVyczogRm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXJbXSk6IEZvcmVpZ25GdW5jdGlvblJlc29sdmVyIHtcbiAgcmV0dXJuIChyZWY6IFJlZmVyZW5jZTx0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRXhwcmVzc2lvbj4sXG4gICAgICAgICAgYXJnczogUmVhZG9ubHlBcnJheTx0cy5FeHByZXNzaW9uPik6IHRzLkV4cHJlc3Npb24gfFxuICAgICAgbnVsbCA9PiB7XG4gICAgZm9yIChjb25zdCByZXNvbHZlciBvZiByZXNvbHZlcnMpIHtcbiAgICAgIGNvbnN0IHJlc29sdmVkID0gcmVzb2x2ZXIocmVmLCBhcmdzKTtcbiAgICAgIGlmIChyZXNvbHZlZCAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShcbiAgICBleHByOiBFeHByZXNzaW9uLCBjb250ZXh0OiB0cy5Ob2RlLCBjb250ZXh0U291cmNlOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gIGlmIChpc1dyYXBwZWRUc05vZGVFeHByKGV4cHIpKSB7XG4gICAgY29uc3Qgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShleHByLm5vZGUpO1xuICAgIHJldHVybiBub2RlLmdldFNvdXJjZUZpbGUoKSA9PT0gY29udGV4dFNvdXJjZSAmJiBjb250ZXh0LnBvcyA8IG5vZGUucG9zO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXcmFwcGVkVHNOb2RlRXhwcihleHByOiBFeHByZXNzaW9uKTogZXhwciBpcyBXcmFwcGVkTm9kZUV4cHI8dHMuTm9kZT4ge1xuICByZXR1cm4gZXhwciBpbnN0YW5jZW9mIFdyYXBwZWROb2RlRXhwcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRCYXNlQ2xhc3MoXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj58J2R5bmFtaWMnfG51bGwge1xuICBjb25zdCBiYXNlRXhwcmVzc2lvbiA9IHJlZmxlY3Rvci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKG5vZGUpO1xuICBpZiAoYmFzZUV4cHJlc3Npb24gIT09IG51bGwpIHtcbiAgICBjb25zdCBiYXNlQ2xhc3MgPSBldmFsdWF0b3IuZXZhbHVhdGUoYmFzZUV4cHJlc3Npb24pO1xuICAgIGlmIChiYXNlQ2xhc3MgaW5zdGFuY2VvZiBSZWZlcmVuY2UgJiYgcmVmbGVjdG9yLmlzQ2xhc3MoYmFzZUNsYXNzLm5vZGUpKSB7XG4gICAgICByZXR1cm4gYmFzZUNsYXNzIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICdkeW5hbWljJztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuY29uc3QgcGFyZW5zV3JhcHBlclRyYW5zZm9ybWVyRmFjdG9yeTogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLkV4cHJlc3Npb24+ID1cbiAgICAoY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KSA9PiB7XG4gICAgICBjb25zdCB2aXNpdG9yOiB0cy5WaXNpdG9yID0gKG5vZGU6IHRzLk5vZGUpOiB0cy5Ob2RlID0+IHtcbiAgICAgICAgY29uc3QgdmlzaXRlZCA9IHRzLnZpc2l0RWFjaENoaWxkKG5vZGUsIHZpc2l0b3IsIGNvbnRleHQpO1xuICAgICAgICBpZiAodHMuaXNBcnJvd0Z1bmN0aW9uKHZpc2l0ZWQpIHx8IHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHZpc2l0ZWQpKSB7XG4gICAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZVBhcmVuKHZpc2l0ZWQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2aXNpdGVkO1xuICAgICAgfTtcbiAgICAgIHJldHVybiAobm9kZTogdHMuRXhwcmVzc2lvbikgPT4gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgdmlzaXRvciwgY29udGV4dCk7XG4gICAgfTtcblxuLyoqXG4gKiBXcmFwcyBhbGwgZnVuY3Rpb25zIGluIGEgZ2l2ZW4gZXhwcmVzc2lvbiBpbiBwYXJlbnRoZXNlcy4gVGhpcyBpcyBuZWVkZWQgdG8gYXZvaWQgcHJvYmxlbXNcbiAqIHdoZXJlIFRzaWNrbGUgYW5ub3RhdGlvbnMgYWRkZWQgYmV0d2VlbiBhbmFseXNlIGFuZCB0cmFuc2Zvcm0gcGhhc2VzIGluIEFuZ3VsYXIgbWF5IHRyaWdnZXJcbiAqIGF1dG9tYXRpYyBzZW1pY29sb24gaW5zZXJ0aW9uLCBlLmcuIGlmIGEgZnVuY3Rpb24gaXMgdGhlIGV4cHJlc3Npb24gaW4gYSBgcmV0dXJuYCBzdGF0ZW1lbnQuXG4gKiBNb3JlXG4gKiBpbmZvIGNhbiBiZSBmb3VuZCBpbiBUc2lja2xlIHNvdXJjZSBjb2RlIGhlcmU6XG4gKiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci90c2lja2xlL2Jsb2IvZDc5NzQyNjI1NzFjOGExN2Q2ODRlNWJhMDc2ODBlMWIxOTkzYWZkZC9zcmMvanNkb2NfdHJhbnNmb3JtZXIudHMjTDEwMjFcbiAqXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiBFeHByZXNzaW9uIHdoZXJlIGZ1bmN0aW9ucyBzaG91bGQgYmUgd3JhcHBlZCBpbiBwYXJlbnRoZXNlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucyhleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIHJldHVybiB0cy50cmFuc2Zvcm0oZXhwcmVzc2lvbiwgW3BhcmVuc1dyYXBwZXJUcmFuc2Zvcm1lckZhY3RvcnldKS50cmFuc2Zvcm1lZFswXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgdHMuRGlhZ25vc3RpY2Agd2hpY2ggaW5kaWNhdGVzIHRoZSBnaXZlbiBjbGFzcyBpcyBwYXJ0IG9mIHRoZSBkZWNsYXJhdGlvbnMgb2YgdHdvIG9yXG4gKiBtb3JlIE5nTW9kdWxlcy5cbiAqXG4gKiBUaGUgcmVzdWx0aW5nIGB0cy5EaWFnbm9zdGljYCB3aWxsIGhhdmUgYSBjb250ZXh0IGVudHJ5IGZvciBlYWNoIE5nTW9kdWxlIHNob3dpbmcgdGhlIHBvaW50IHdoZXJlXG4gKiB0aGUgZGlyZWN0aXZlL3BpcGUgZXhpc3RzIGluIGl0cyBgZGVjbGFyYXRpb25zYCAoaWYgcG9zc2libGUpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZUR1cGxpY2F0ZURlY2xhcmF0aW9uRXJyb3IoXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGF0YTogRGVjbGFyYXRpb25EYXRhW10sIGtpbmQ6IHN0cmluZyk6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjb250ZXh0OiB7bm9kZTogdHMuTm9kZTsgbWVzc2FnZVRleHQ6IHN0cmluZzt9W10gPSBbXTtcbiAgZm9yIChjb25zdCBkZWNsIG9mIGRhdGEpIHtcbiAgICBpZiAoZGVjbC5yYXdEZWNsYXJhdGlvbnMgPT09IG51bGwpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICAvLyBUcnkgdG8gZmluZCB0aGUgcmVmZXJlbmNlIHRvIHRoZSBkZWNsYXJhdGlvbiB3aXRoaW4gdGhlIGRlY2xhcmF0aW9ucyBhcnJheSwgdG8gaGFuZyB0aGVcbiAgICAvLyBlcnJvciB0aGVyZS4gSWYgaXQgY2FuJ3QgYmUgZm91bmQsIGZhbGwgYmFjayBvbiB1c2luZyB0aGUgTmdNb2R1bGUncyBuYW1lLlxuICAgIGNvbnN0IGNvbnRleHROb2RlID0gZGVjbC5yZWYuZ2V0T3JpZ2luRm9yRGlhZ25vc3RpY3MoZGVjbC5yYXdEZWNsYXJhdGlvbnMsIGRlY2wubmdNb2R1bGUubmFtZSk7XG4gICAgY29udGV4dC5wdXNoKHtcbiAgICAgIG5vZGU6IGNvbnRleHROb2RlLFxuICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgYCcke25vZGUubmFtZS50ZXh0fScgaXMgbGlzdGVkIGluIHRoZSBkZWNsYXJhdGlvbnMgb2YgdGhlIE5nTW9kdWxlICcke2RlY2wubmdNb2R1bGUubmFtZS50ZXh0fScuYCxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEZpbmFsbHksIHByb2R1Y2UgdGhlIGRpYWdub3N0aWMuXG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9ERUNMQVJBVElPTl9OT1RfVU5JUVVFLCBub2RlLm5hbWUsXG4gICAgICBgVGhlICR7a2luZH0gJyR7bm9kZS5uYW1lLnRleHR9JyBpcyBkZWNsYXJlZCBieSBtb3JlIHRoYW4gb25lIE5nTW9kdWxlLmAsIGNvbnRleHQpO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBnaXZlbiBgcmF3UHJvdmlkZXJzYCBpbnRvIGBDbGFzc0RlY2xhcmF0aW9uc2AgYW5kIHJldHVybnNcbiAqIGEgc2V0IGNvbnRhaW5pbmcgdGhvc2UgdGhhdCBhcmUga25vd24gdG8gcmVxdWlyZSBhIGZhY3RvcnkgZGVmaW5pdGlvbi5cbiAqIEBwYXJhbSByYXdQcm92aWRlcnMgRXhwcmVzc2lvbiB0aGF0IGRlY2xhcmVkIHRoZSBwcm92aWRlcnMgYXJyYXkgaW4gdGhlIHNvdXJjZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5KFxuICAgIHJhd1Byb3ZpZGVyczogdHMuRXhwcmVzc2lvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PiB7XG4gIGNvbnN0IHByb3ZpZGVycyA9IG5ldyBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PigpO1xuICBjb25zdCByZXNvbHZlZFByb3ZpZGVycyA9IGV2YWx1YXRvci5ldmFsdWF0ZShyYXdQcm92aWRlcnMpO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheShyZXNvbHZlZFByb3ZpZGVycykpIHtcbiAgICByZXR1cm4gcHJvdmlkZXJzO1xuICB9XG5cbiAgcmVzb2x2ZWRQcm92aWRlcnMuZm9yRWFjaChmdW5jdGlvbiBwcm9jZXNzUHJvdmlkZXJzKHByb3ZpZGVyKSB7XG4gICAgbGV0IHRva2VuQ2xhc3M6IFJlZmVyZW5jZXxudWxsID0gbnVsbDtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHByb3ZpZGVyKSkge1xuICAgICAgLy8gSWYgd2UgcmFuIGludG8gYW4gYXJyYXksIHJlY3Vyc2UgaW50byBpdCB1bnRpbCB3ZSd2ZSByZXNvbHZlIGFsbCB0aGUgY2xhc3Nlcy5cbiAgICAgIHByb3ZpZGVyLmZvckVhY2gocHJvY2Vzc1Byb3ZpZGVycyk7XG4gICAgfSBlbHNlIGlmIChwcm92aWRlciBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgdG9rZW5DbGFzcyA9IHByb3ZpZGVyO1xuICAgIH0gZWxzZSBpZiAocHJvdmlkZXIgaW5zdGFuY2VvZiBNYXAgJiYgcHJvdmlkZXIuaGFzKCd1c2VDbGFzcycpICYmICFwcm92aWRlci5oYXMoJ2RlcHMnKSkge1xuICAgICAgY29uc3QgdXNlRXhpc3RpbmcgPSBwcm92aWRlci5nZXQoJ3VzZUNsYXNzJykgITtcbiAgICAgIGlmICh1c2VFeGlzdGluZyBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgICB0b2tlbkNsYXNzID0gdXNlRXhpc3Rpbmc7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRva2VuQ2xhc3MgIT09IG51bGwgJiYgcmVmbGVjdG9yLmlzQ2xhc3ModG9rZW5DbGFzcy5ub2RlKSkge1xuICAgICAgY29uc3QgY29uc3RydWN0b3JQYXJhbWV0ZXJzID0gcmVmbGVjdG9yLmdldENvbnN0cnVjdG9yUGFyYW1ldGVycyh0b2tlbkNsYXNzLm5vZGUpO1xuXG4gICAgICAvLyBOb3RlIHRoYXQgd2Ugb25seSB3YW50IHRvIGNhcHR1cmUgcHJvdmlkZXJzIHdpdGggYSBub24tdHJpdmlhbCBjb25zdHJ1Y3RvcixcbiAgICAgIC8vIGJlY2F1c2UgdGhleSdyZSB0aGUgb25lcyB0aGF0IG1pZ2h0IGJlIHVzaW5nIERJIGFuZCBuZWVkIHRvIGJlIGRlY29yYXRlZC5cbiAgICAgIGlmIChjb25zdHJ1Y3RvclBhcmFtZXRlcnMgIT09IG51bGwgJiYgY29uc3RydWN0b3JQYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcHJvdmlkZXJzLmFkZCh0b2tlbkNsYXNzIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcHJvdmlkZXJzO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBSM1JlZmVyZW5jZSBmb3IgYSBjbGFzcy5cbiAqXG4gKiBUaGUgYHZhbHVlYCBpcyB0aGUgZXhwb3J0ZWQgZGVjbGFyYXRpb24gb2YgdGhlIGNsYXNzIGZyb20gaXRzIHNvdXJjZSBmaWxlLlxuICogVGhlIGB0eXBlYCBpcyBhbiBleHByZXNzaW9uIHRoYXQgd291bGQgYmUgdXNlZCBieSBuZ2NjIGluIHRoZSB0eXBpbmdzICguZC50cykgZmlsZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cmFwVHlwZVJlZmVyZW5jZShyZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IFIzUmVmZXJlbmNlIHtcbiAgY29uc3QgZHRzQ2xhc3MgPSByZWZsZWN0b3IuZ2V0RHRzRGVjbGFyYXRpb24oY2xhenopO1xuICBjb25zdCB2YWx1ZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoY2xhenoubmFtZSk7XG4gIGNvbnN0IHR5cGUgPSBkdHNDbGFzcyAhPT0gbnVsbCAmJiBpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihkdHNDbGFzcykgP1xuICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihkdHNDbGFzcy5uYW1lKSA6XG4gICAgICB2YWx1ZTtcbiAgcmV0dXJuIHt2YWx1ZSwgdHlwZX07XG59XG4iXX0=