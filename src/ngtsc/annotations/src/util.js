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
                    kind: ConstructorDepErrorKind.NO_SUITABLE_TOKEN,
                    param: param,
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
    /** Creates a ParseSourceSpan for a TypeScript node. */
    function createSourceSpan(node) {
        var sf = node.getSourceFile();
        var _a = tslib_1.__read([node.getStart(), node.getEnd()], 2), startOffset = _a[0], endOffset = _a[1];
        var _b = sf.getLineAndCharacterOfPosition(startOffset), startLine = _b.line, startCol = _b.character;
        var _c = sf.getLineAndCharacterOfPosition(endOffset), endLine = _c.line, endCol = _c.character;
        var parseSf = new compiler_1.ParseSourceFile(sf.getFullText(), sf.fileName);
        // +1 because values are zero-indexed.
        return new compiler_1.ParseSourceSpan(new compiler_1.ParseLocation(parseSf, startOffset, startLine + 1, startCol + 1), new compiler_1.ParseLocation(parseSf, endOffset, endLine + 1, endCol + 1));
    }
    exports.createSourceSpan = createSourceSpan;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXVNO0lBQ3ZNLCtCQUFpQztJQUVqQywyRUFBa0Y7SUFDbEYsbUVBQThGO0lBRTlGLHlFQUFpSjtJQUdqSixJQUFZLHVCQUVYO0lBRkQsV0FBWSx1QkFBdUI7UUFDakMsK0ZBQWlCLENBQUE7SUFDbkIsQ0FBQyxFQUZXLHVCQUF1QixHQUF2QiwrQkFBdUIsS0FBdkIsK0JBQXVCLFFBRWxDO0lBZUQsU0FBZ0IsMEJBQTBCLENBQ3RDLEtBQXVCLEVBQUUsU0FBeUIsRUFDbEQscUJBQTRDLEVBQUUsTUFBZTtRQUMvRCxJQUFNLElBQUksR0FBMkIsRUFBRSxDQUFDO1FBQ3hDLElBQU0sTUFBTSxHQUEwQixFQUFFLENBQUM7UUFDekMsSUFBSSxVQUFVLEdBQUcsU0FBUyxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNELElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtZQUN2QixJQUFJLFNBQVMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2pDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7aUJBQU07Z0JBQ0wsVUFBVSxHQUFHLEVBQUUsQ0FBQzthQUNqQjtTQUNGO1FBQ0QsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFDLEtBQUssRUFBRSxHQUFHO1lBQzVCLElBQUksS0FBSyxHQUFHLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1lBQ3hGLElBQUksU0FBUyxHQUFvQixJQUFJLENBQUM7WUFDdEMsSUFBSSxRQUFRLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxLQUFLLEVBQUUsUUFB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LElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMxQixJQUFBLHdEQUEyRCxFQUExRCxtQkFBVyxFQUFFLGlCQUE2QyxDQUFDO1FBQzVELElBQUEsa0RBQXNGLEVBQXJGLG1CQUFlLEVBQUUsdUJBQW9FLENBQUM7UUFDdkYsSUFBQSxnREFBZ0YsRUFBL0UsaUJBQWEsRUFBRSxxQkFBZ0UsQ0FBQztRQUN2RixJQUFNLE9BQU8sR0FBRyxJQUFJLDBCQUFlLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVuRSxzQ0FBc0M7UUFDdEMsT0FBTyxJQUFJLDBCQUFlLENBQ3RCLElBQUksd0JBQWEsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsR0FBRyxDQUFDLEVBQUUsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUNwRSxJQUFJLHdCQUFhLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFYRCw0Q0FXQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIExpdGVyYWxFeHByLCBQYXJzZUxvY2F0aW9uLCBQYXJzZVNvdXJjZUZpbGUsIFBhcnNlU291cmNlU3BhbiwgUjNEZXBlbmRlbmN5TWV0YWRhdGEsIFIzUmVmZXJlbmNlLCBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvciwgbWFrZURpYWdub3N0aWN9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RGVmYXVsdEltcG9ydFJlY29yZGVyLCBJbXBvcnRGbGFncywgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Rm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIsIFBhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ3RvclBhcmFtZXRlciwgRGVjb3JhdG9yLCBJbXBvcnQsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdCwgVHlwZVZhbHVlUmVmZXJlbmNlfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7RGVjbGFyYXRpb25EYXRhfSBmcm9tICcuLi8uLi9zY29wZSc7XG5cbmV4cG9ydCBlbnVtIENvbnN0cnVjdG9yRGVwRXJyb3JLaW5kIHtcbiAgTk9fU1VJVEFCTEVfVE9LRU4sXG59XG5cbmV4cG9ydCB0eXBlIENvbnN0cnVjdG9yRGVwcyA9IHtcbiAgZGVwczogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXTtcbn18e1xuICBkZXBzOiBudWxsO1xuICBlcnJvcnM6IENvbnN0cnVjdG9yRGVwRXJyb3JbXTtcbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uc3RydWN0b3JEZXBFcnJvciB7XG4gIGluZGV4OiBudW1iZXI7XG4gIHBhcmFtOiBDdG9yUGFyYW1ldGVyO1xuICBraW5kOiBDb25zdHJ1Y3RvckRlcEVycm9yS2luZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmU6IGJvb2xlYW4pOiBDb25zdHJ1Y3RvckRlcHN8bnVsbCB7XG4gIGNvbnN0IGRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW10gPSBbXTtcbiAgY29uc3QgZXJyb3JzOiBDb25zdHJ1Y3RvckRlcEVycm9yW10gPSBbXTtcbiAgbGV0IGN0b3JQYXJhbXMgPSByZWZsZWN0b3IuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6KTtcbiAgaWYgKGN0b3JQYXJhbXMgPT09IG51bGwpIHtcbiAgICBpZiAocmVmbGVjdG9yLmhhc0Jhc2VDbGFzcyhjbGF6eikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBjdG9yUGFyYW1zID0gW107XG4gICAgfVxuICB9XG4gIGN0b3JQYXJhbXMuZm9yRWFjaCgocGFyYW0sIGlkeCkgPT4ge1xuICAgIGxldCB0b2tlbiA9IHZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uKHBhcmFtLnR5cGVWYWx1ZVJlZmVyZW5jZSwgZGVmYXVsdEltcG9ydFJlY29yZGVyKTtcbiAgICBsZXQgYXR0cmlidXRlOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGxldCBvcHRpb25hbCA9IGZhbHNlLCBzZWxmID0gZmFsc2UsIHNraXBTZWxmID0gZmFsc2UsIGhvc3QgPSBmYWxzZTtcbiAgICBsZXQgcmVzb2x2ZWQgPSBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuVG9rZW47XG5cbiAgICAocGFyYW0uZGVjb3JhdG9ycyB8fCBbXSkuZmlsdGVyKGRlYyA9PiBpc0NvcmUgfHwgaXNBbmd1bGFyQ29yZShkZWMpKS5mb3JFYWNoKGRlYyA9PiB7XG4gICAgICBjb25zdCBuYW1lID0gaXNDb3JlIHx8IGRlYy5pbXBvcnQgPT09IG51bGwgPyBkZWMubmFtZSA6IGRlYy5pbXBvcnQhLm5hbWU7XG4gICAgICBpZiAobmFtZSA9PT0gJ0luamVjdCcpIHtcbiAgICAgICAgaWYgKGRlYy5hcmdzID09PSBudWxsIHx8IGRlYy5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWMpLFxuICAgICAgICAgICAgICBgVW5leHBlY3RlZCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBJbmplY3QoKS5gKTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbiA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoZGVjLmFyZ3NbMF0pO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnT3B0aW9uYWwnKSB7XG4gICAgICAgIG9wdGlvbmFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ1NraXBTZWxmJykge1xuICAgICAgICBza2lwU2VsZiA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdTZWxmJykge1xuICAgICAgICBzZWxmID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ0hvc3QnKSB7XG4gICAgICAgIGhvc3QgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnQXR0cmlidXRlJykge1xuICAgICAgICBpZiAoZGVjLmFyZ3MgPT09IG51bGwgfHwgZGVjLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlYyksXG4gICAgICAgICAgICAgIGBVbmV4cGVjdGVkIG51bWJlciBvZiBhcmd1bWVudHMgdG8gQEF0dHJpYnV0ZSgpLmApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGF0dHJpYnV0ZU5hbWUgPSBkZWMuYXJnc1swXTtcbiAgICAgICAgdG9rZW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKGF0dHJpYnV0ZU5hbWUpO1xuICAgICAgICBpZiAodHMuaXNTdHJpbmdMaXRlcmFsTGlrZShhdHRyaWJ1dGVOYW1lKSkge1xuICAgICAgICAgIGF0dHJpYnV0ZSA9IG5ldyBMaXRlcmFsRXhwcihhdHRyaWJ1dGVOYW1lLnRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF0dHJpYnV0ZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuVW5rbm93bktleXdvcmQpKTtcbiAgICAgICAgfVxuICAgICAgICByZXNvbHZlZCA9IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5BdHRyaWJ1dGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX1VORVhQRUNURUQsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjKSxcbiAgICAgICAgICAgIGBVbmV4cGVjdGVkIGRlY29yYXRvciAke25hbWV9IG9uIHBhcmFtZXRlci5gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICh0b2tlbiBpbnN0YW5jZW9mIEV4dGVybmFsRXhwciAmJiB0b2tlbi52YWx1ZS5uYW1lID09PSAnQ2hhbmdlRGV0ZWN0b3JSZWYnICYmXG4gICAgICAgIHRva2VuLnZhbHVlLm1vZHVsZU5hbWUgPT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgcmVzb2x2ZWQgPSBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuQ2hhbmdlRGV0ZWN0b3JSZWY7XG4gICAgfVxuICAgIGlmICh0b2tlbiA9PT0gbnVsbCkge1xuICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICBpbmRleDogaWR4LFxuICAgICAgICBraW5kOiBDb25zdHJ1Y3RvckRlcEVycm9yS2luZC5OT19TVUlUQUJMRV9UT0tFTixcbiAgICAgICAgcGFyYW0sXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVwcy5wdXNoKHt0b2tlbiwgYXR0cmlidXRlLCBvcHRpb25hbCwgc2VsZiwgc2tpcFNlbGYsIGhvc3QsIHJlc29sdmVkfSk7XG4gICAgfVxuICB9KTtcbiAgaWYgKGVycm9ycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge2RlcHN9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7ZGVwczogbnVsbCwgZXJyb3JzfTtcbiAgfVxufVxuXG4vKipcbiAqIENvbnZlcnQgYSBgVHlwZVZhbHVlUmVmZXJlbmNlYCB0byBhbiBgRXhwcmVzc2lvbmAgd2hpY2ggcmVmZXJzIHRvIHRoZSB0eXBlIGFzIGEgdmFsdWUuXG4gKlxuICogTG9jYWwgcmVmZXJlbmNlcyBhcmUgY29udmVydGVkIHRvIGEgYFdyYXBwZWROb2RlRXhwcmAgb2YgdGhlIFR5cGVTY3JpcHQgZXhwcmVzc2lvbiwgYW5kIG5vbi1sb2NhbFxuICogcmVmZXJlbmNlcyBhcmUgY29udmVydGVkIHRvIGFuIGBFeHRlcm5hbEV4cHJgLiBOb3RlIHRoYXQgdGhpcyBpcyBvbmx5IHZhbGlkIGluIHRoZSBjb250ZXh0IG9mIHRoZVxuICogZmlsZSBpbiB3aGljaCB0aGUgYFR5cGVWYWx1ZVJlZmVyZW5jZWAgb3JpZ2luYXRlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uKFxuICAgIHZhbHVlUmVmOiBUeXBlVmFsdWVSZWZlcmVuY2UsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyKTogRXhwcmVzc2lvbjtcbmV4cG9ydCBmdW5jdGlvbiB2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbihcbiAgICB2YWx1ZVJlZjogbnVsbCwgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIpOiBudWxsO1xuZXhwb3J0IGZ1bmN0aW9uIHZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uKFxuICAgIHZhbHVlUmVmOiBUeXBlVmFsdWVSZWZlcmVuY2V8bnVsbCwgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIpOiBFeHByZXNzaW9ufFxuICAgIG51bGw7XG5leHBvcnQgZnVuY3Rpb24gdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24oXG4gICAgdmFsdWVSZWY6IFR5cGVWYWx1ZVJlZmVyZW5jZXxudWxsLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcik6IEV4cHJlc3Npb258XG4gICAgbnVsbCB7XG4gIGlmICh2YWx1ZVJlZiA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKHZhbHVlUmVmLmxvY2FsKSB7XG4gICAgaWYgKGRlZmF1bHRJbXBvcnRSZWNvcmRlciAhPT0gbnVsbCAmJiB2YWx1ZVJlZi5kZWZhdWx0SW1wb3J0U3RhdGVtZW50ICE9PSBudWxsICYmXG4gICAgICAgIHRzLmlzSWRlbnRpZmllcih2YWx1ZVJlZi5leHByZXNzaW9uKSkge1xuICAgICAgZGVmYXVsdEltcG9ydFJlY29yZGVyLnJlY29yZEltcG9ydGVkSWRlbnRpZmllcihcbiAgICAgICAgICB2YWx1ZVJlZi5leHByZXNzaW9uLCB2YWx1ZVJlZi5kZWZhdWx0SW1wb3J0U3RhdGVtZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBXcmFwcGVkTm9kZUV4cHIodmFsdWVSZWYuZXhwcmVzc2lvbik7XG4gIH0gZWxzZSB7XG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNhc3QgaXMgbmVjZXNzYXJ5IGJlY2F1c2UgdGhlIGczIHR5cGVzY3JpcHQgdmVyc2lvbiBkb2Vzbid0IG5hcnJvdyBoZXJlLlxuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxFeHByKHZhbHVlUmVmIGFzIHttb2R1bGVOYW1lOiBzdHJpbmcsIG5hbWU6IHN0cmluZ30pO1xuICB9XG59XG5cbi8qKlxuICogQ29udmVydCBgQ29uc3RydWN0b3JEZXBzYCBpbnRvIHRoZSBgUjNEZXBlbmRlbmN5TWV0YWRhdGFgIGFycmF5IGZvciB0aG9zZSBkZXBzIGlmIHRoZXkncmUgdmFsaWQsXG4gKiBvciBpbnRvIGFuIGAnaW52YWxpZCdgIHNpZ25hbCBpZiB0aGV5J3JlIG5vdC5cbiAqXG4gKiBUaGlzIGlzIGEgY29tcGFuaW9uIGZ1bmN0aW9uIHRvIGB2YWxpZGF0ZUNvbnN0cnVjdG9yRGVwZW5kZW5jaWVzYCB3aGljaCBhY2NlcHRzIGludmFsaWQgZGVwcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVud3JhcENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGRlcHM6IENvbnN0cnVjdG9yRGVwc3xudWxsKTogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXXxcbiAgICAnaW52YWxpZCd8bnVsbCB7XG4gIGlmIChkZXBzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSBpZiAoZGVwcy5kZXBzICE9PSBudWxsKSB7XG4gICAgLy8gVGhlc2UgY29uc3RydWN0b3IgZGVwZW5kZW5jaWVzIGFyZSB2YWxpZC5cbiAgICByZXR1cm4gZGVwcy5kZXBzO1xuICB9IGVsc2Uge1xuICAgIC8vIFRoZXNlIGRlcHMgYXJlIGludmFsaWQuXG4gICAgcmV0dXJuICdpbnZhbGlkJztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlOiBib29sZWFuKTogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXXxudWxsIHtcbiAgcmV0dXJuIHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgICBjbGF6eiwgZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3RvciwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUpKTtcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSB0aGF0IGBDb25zdHJ1Y3RvckRlcHNgIGRvZXMgbm90IGhhdmUgYW55IGludmFsaWQgZGVwZW5kZW5jaWVzIGFuZCBjb252ZXJ0IHRoZW0gaW50byB0aGVcbiAqIGBSM0RlcGVuZGVuY3lNZXRhZGF0YWAgYXJyYXkgaWYgc28sIG9yIHJhaXNlIGEgZGlhZ25vc3RpYyBpZiBzb21lIGRlcHMgYXJlIGludmFsaWQuXG4gKlxuICogVGhpcyBpcyBhIGNvbXBhbmlvbiBmdW5jdGlvbiB0byBgdW53cmFwQ29uc3RydWN0b3JEZXBlbmRlbmNpZXNgIHdoaWNoIGRvZXMgbm90IGFjY2VwdCBpbnZhbGlkXG4gKiBkZXBzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVwczogQ29uc3RydWN0b3JEZXBzfG51bGwpOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfG51bGwge1xuICBpZiAoZGVwcyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKGRlcHMuZGVwcyAhPT0gbnVsbCkge1xuICAgIHJldHVybiBkZXBzLmRlcHM7XG4gIH0gZWxzZSB7XG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNhc3QgaXMgbmVjZXNzYXJ5IGJlY2F1c2UgdGhlIGczIHR5cGVzY3JpcHQgdmVyc2lvbiBkb2Vzbid0IG5hcnJvdyBoZXJlLlxuICAgIGNvbnN0IHtwYXJhbSwgaW5kZXh9ID0gKGRlcHMgYXMge2Vycm9yczogQ29uc3RydWN0b3JEZXBFcnJvcltdfSkuZXJyb3JzWzBdO1xuICAgIC8vIFRoZXJlIGlzIGF0IGxlYXN0IG9uZSBlcnJvci5cbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5QQVJBTV9NSVNTSU5HX1RPS0VOLCBwYXJhbS5uYW1lTm9kZSxcbiAgICAgICAgYE5vIHN1aXRhYmxlIGluamVjdGlvbiB0b2tlbiBmb3IgcGFyYW1ldGVyICcke3BhcmFtLm5hbWUgfHwgaW5kZXh9JyBvZiBjbGFzcyAnJHtcbiAgICAgICAgICAgIGNsYXp6Lm5hbWUudGV4dH0nLlxcbmAgK1xuICAgICAgICAgICAgKHBhcmFtLnR5cGVOb2RlICE9PSBudWxsID8gYEZvdW5kICR7cGFyYW0udHlwZU5vZGUuZ2V0VGV4dCgpfWAgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vIHR5cGUgb3IgZGVjb3JhdG9yJykpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1IzUmVmZXJlbmNlKFxuICAgIHZhbHVlUmVmOiBSZWZlcmVuY2UsIHR5cGVSZWY6IFJlZmVyZW5jZSwgdmFsdWVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlLFxuICAgIHR5cGVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyKTogUjNSZWZlcmVuY2Uge1xuICBjb25zdCB2YWx1ZSA9IHJlZkVtaXR0ZXIuZW1pdCh2YWx1ZVJlZiwgdmFsdWVDb250ZXh0KTtcbiAgY29uc3QgdHlwZSA9IHJlZkVtaXR0ZXIuZW1pdChcbiAgICAgIHR5cGVSZWYsIHR5cGVDb250ZXh0LCBJbXBvcnRGbGFncy5Gb3JjZU5ld0ltcG9ydCB8IEltcG9ydEZsYWdzLkFsbG93VHlwZUltcG9ydHMpO1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdHlwZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlZmVyIHRvICR7dHMuU3ludGF4S2luZFt2YWx1ZVJlZi5ub2RlLmtpbmRdfWApO1xuICB9XG4gIHJldHVybiB7dmFsdWUsIHR5cGV9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBbmd1bGFyQ29yZShkZWNvcmF0b3I6IERlY29yYXRvcik6IGRlY29yYXRvciBpcyBEZWNvcmF0b3Ime2ltcG9ydDogSW1wb3J0fSB7XG4gIHJldHVybiBkZWNvcmF0b3IuaW1wb3J0ICE9PSBudWxsICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBbmd1bGFyQ29yZVJlZmVyZW5jZShyZWZlcmVuY2U6IFJlZmVyZW5jZSwgc3ltYm9sTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiByZWZlcmVuY2Uub3duZWRCeU1vZHVsZUd1ZXNzID09PSAnQGFuZ3VsYXIvY29yZScgJiYgcmVmZXJlbmNlLmRlYnVnTmFtZSA9PT0gc3ltYm9sTmFtZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbmd1bGFyRGVjb3JhdG9yKFxuICAgIGRlY29yYXRvcnM6IERlY29yYXRvcltdLCBuYW1lOiBzdHJpbmcsIGlzQ29yZTogYm9vbGVhbik6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICByZXR1cm4gZGVjb3JhdG9ycy5maW5kKGRlY29yYXRvciA9PiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yLCBuYW1lLCBpc0NvcmUpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3I6IERlY29yYXRvciwgbmFtZTogc3RyaW5nLCBpc0NvcmU6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgaWYgKGlzQ29yZSkge1xuICAgIHJldHVybiBkZWNvcmF0b3IubmFtZSA9PT0gbmFtZTtcbiAgfSBlbHNlIGlmIChpc0FuZ3VsYXJDb3JlKGRlY29yYXRvcikpIHtcbiAgICByZXR1cm4gZGVjb3JhdG9yLmltcG9ydC5uYW1lID09PSBuYW1lO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBVbndyYXAgYSBgdHMuRXhwcmVzc2lvbmAsIHJlbW92aW5nIG91dGVyIHR5cGUtY2FzdHMgb3IgcGFyZW50aGVzZXMgdW50aWwgdGhlIGV4cHJlc3Npb24gaXMgaW4gaXRzXG4gKiBsb3dlc3QgbGV2ZWwgZm9ybS5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGV4cHJlc3Npb24gXCIoZm9vIGFzIFR5cGUpXCIgdW53cmFwcyB0byBcImZvb1wiLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdW53cmFwRXhwcmVzc2lvbihub2RlOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIHdoaWxlICh0cy5pc0FzRXhwcmVzc2lvbihub2RlKSB8fCB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgbm9kZSA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn1cblxuZnVuY3Rpb24gZXhwYW5kRm9yd2FyZFJlZihhcmc6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBhcmcgPSB1bndyYXBFeHByZXNzaW9uKGFyZyk7XG4gIGlmICghdHMuaXNBcnJvd0Z1bmN0aW9uKGFyZykgJiYgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGFyZykpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGJvZHkgPSBhcmcuYm9keTtcbiAgLy8gRWl0aGVyIHRoZSBib2R5IGlzIGEgdHMuRXhwcmVzc2lvbiBkaXJlY3RseSwgb3IgYSBibG9jayB3aXRoIGEgc2luZ2xlIHJldHVybiBzdGF0ZW1lbnQuXG4gIGlmICh0cy5pc0Jsb2NrKGJvZHkpKSB7XG4gICAgLy8gQmxvY2sgYm9keSAtIGxvb2sgZm9yIGEgc2luZ2xlIHJldHVybiBzdGF0ZW1lbnQuXG4gICAgaWYgKGJvZHkuc3RhdGVtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzdG10ID0gYm9keS5zdGF0ZW1lbnRzWzBdO1xuICAgIGlmICghdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RtdCkgfHwgc3RtdC5leHByZXNzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gc3RtdC5leHByZXNzaW9uO1xuICB9IGVsc2Uge1xuICAgIC8vIFNob3J0aGFuZCBib2R5IC0gcmV0dXJuIGFzIGFuIGV4cHJlc3Npb24uXG4gICAgcmV0dXJuIGJvZHk7XG4gIH1cbn1cblxuLyoqXG4gKiBQb3NzaWJseSByZXNvbHZlIGEgZm9yd2FyZFJlZigpIGV4cHJlc3Npb24gaW50byB0aGUgaW5uZXIgdmFsdWUuXG4gKlxuICogQHBhcmFtIG5vZGUgdGhlIGZvcndhcmRSZWYoKSBleHByZXNzaW9uIHRvIHJlc29sdmVcbiAqIEBwYXJhbSByZWZsZWN0b3IgYSBSZWZsZWN0aW9uSG9zdFxuICogQHJldHVybnMgdGhlIHJlc29sdmVkIGV4cHJlc3Npb24sIGlmIHRoZSBvcmlnaW5hbCBleHByZXNzaW9uIHdhcyBhIGZvcndhcmRSZWYoKSwgb3IgdGhlIG9yaWdpbmFsXG4gKiBleHByZXNzaW9uIG90aGVyd2lzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdW53cmFwRm9yd2FyZFJlZihub2RlOiB0cy5FeHByZXNzaW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KTogdHMuRXhwcmVzc2lvbiB7XG4gIG5vZGUgPSB1bndyYXBFeHByZXNzaW9uKG5vZGUpO1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgfHwgbm9kZS5hcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICBjb25zdCBmbiA9XG4gICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24pID8gbm9kZS5leHByZXNzaW9uLm5hbWUgOiBub2RlLmV4cHJlc3Npb247XG4gIGlmICghdHMuaXNJZGVudGlmaWVyKGZuKSkge1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgY29uc3QgZXhwciA9IGV4cGFuZEZvcndhcmRSZWYobm9kZS5hcmd1bWVudHNbMF0pO1xuICBpZiAoZXhwciA9PT0gbnVsbCkge1xuICAgIHJldHVybiBub2RlO1xuICB9XG4gIGNvbnN0IGltcCA9IHJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIoZm4pO1xuICBpZiAoaW1wID09PSBudWxsIHx8IGltcC5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScgfHwgaW1wLm5hbWUgIT09ICdmb3J3YXJkUmVmJykge1xuICAgIHJldHVybiBub2RlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBleHByO1xuICB9XG59XG5cbi8qKlxuICogQSBmb3JlaWduIGZ1bmN0aW9uIHJlc29sdmVyIGZvciBgc3RhdGljYWxseVJlc29sdmVgIHdoaWNoIHVud3JhcHMgZm9yd2FyZFJlZigpIGV4cHJlc3Npb25zLlxuICpcbiAqIEBwYXJhbSByZWYgYSBSZWZlcmVuY2UgdG8gdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBmdW5jdGlvbiBiZWluZyBjYWxsZWQgKHdoaWNoIG1pZ2h0IGJlXG4gKiBmb3J3YXJkUmVmKVxuICogQHBhcmFtIGFyZ3MgdGhlIGFyZ3VtZW50cyB0byB0aGUgaW52b2NhdGlvbiBvZiB0aGUgZm9yd2FyZFJlZiBleHByZXNzaW9uXG4gKiBAcmV0dXJucyBhbiB1bndyYXBwZWQgYXJndW1lbnQgaWYgYHJlZmAgcG9pbnRlZCB0byBmb3J3YXJkUmVmLCBvciBudWxsIG90aGVyd2lzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9yd2FyZFJlZlJlc29sdmVyKFxuICAgIHJlZjogUmVmZXJlbmNlPHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25FeHByZXNzaW9uPixcbiAgICBhcmdzOiBSZWFkb25seUFycmF5PHRzLkV4cHJlc3Npb24+KTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKCFpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlKHJlZiwgJ2ZvcndhcmRSZWYnKSB8fCBhcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiBleHBhbmRGb3J3YXJkUmVmKGFyZ3NbMF0pO1xufVxuXG4vKipcbiAqIENvbWJpbmVzIGFuIGFycmF5IG9mIHJlc29sdmVyIGZ1bmN0aW9ucyBpbnRvIGEgb25lLlxuICogQHBhcmFtIHJlc29sdmVycyBSZXNvbHZlcnMgdG8gYmUgY29tYmluZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5lUmVzb2x2ZXJzKHJlc29sdmVyczogRm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXJbXSk6IEZvcmVpZ25GdW5jdGlvblJlc29sdmVyIHtcbiAgcmV0dXJuIChyZWY6IFJlZmVyZW5jZTx0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRXhwcmVzc2lvbj4sXG4gICAgICAgICAgYXJnczogUmVhZG9ubHlBcnJheTx0cy5FeHByZXNzaW9uPik6IHRzLkV4cHJlc3Npb258bnVsbCA9PiB7XG4gICAgZm9yIChjb25zdCByZXNvbHZlciBvZiByZXNvbHZlcnMpIHtcbiAgICAgIGNvbnN0IHJlc29sdmVkID0gcmVzb2x2ZXIocmVmLCBhcmdzKTtcbiAgICAgIGlmIChyZXNvbHZlZCAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShcbiAgICBleHByOiBFeHByZXNzaW9uLCBjb250ZXh0OiB0cy5Ob2RlLCBjb250ZXh0U291cmNlOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gIGlmIChpc1dyYXBwZWRUc05vZGVFeHByKGV4cHIpKSB7XG4gICAgY29uc3Qgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShleHByLm5vZGUpO1xuICAgIHJldHVybiBub2RlLmdldFNvdXJjZUZpbGUoKSA9PT0gY29udGV4dFNvdXJjZSAmJiBjb250ZXh0LnBvcyA8IG5vZGUucG9zO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXcmFwcGVkVHNOb2RlRXhwcihleHByOiBFeHByZXNzaW9uKTogZXhwciBpcyBXcmFwcGVkTm9kZUV4cHI8dHMuTm9kZT4ge1xuICByZXR1cm4gZXhwciBpbnN0YW5jZW9mIFdyYXBwZWROb2RlRXhwcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRCYXNlQ2xhc3MoXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj58J2R5bmFtaWMnfG51bGwge1xuICBjb25zdCBiYXNlRXhwcmVzc2lvbiA9IHJlZmxlY3Rvci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKG5vZGUpO1xuICBpZiAoYmFzZUV4cHJlc3Npb24gIT09IG51bGwpIHtcbiAgICBjb25zdCBiYXNlQ2xhc3MgPSBldmFsdWF0b3IuZXZhbHVhdGUoYmFzZUV4cHJlc3Npb24pO1xuICAgIGlmIChiYXNlQ2xhc3MgaW5zdGFuY2VvZiBSZWZlcmVuY2UgJiYgcmVmbGVjdG9yLmlzQ2xhc3MoYmFzZUNsYXNzLm5vZGUpKSB7XG4gICAgICByZXR1cm4gYmFzZUNsYXNzIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICdkeW5hbWljJztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuY29uc3QgcGFyZW5zV3JhcHBlclRyYW5zZm9ybWVyRmFjdG9yeTogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLkV4cHJlc3Npb24+ID1cbiAgICAoY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KSA9PiB7XG4gICAgICBjb25zdCB2aXNpdG9yOiB0cy5WaXNpdG9yID0gKG5vZGU6IHRzLk5vZGUpOiB0cy5Ob2RlID0+IHtcbiAgICAgICAgY29uc3QgdmlzaXRlZCA9IHRzLnZpc2l0RWFjaENoaWxkKG5vZGUsIHZpc2l0b3IsIGNvbnRleHQpO1xuICAgICAgICBpZiAodHMuaXNBcnJvd0Z1bmN0aW9uKHZpc2l0ZWQpIHx8IHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHZpc2l0ZWQpKSB7XG4gICAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZVBhcmVuKHZpc2l0ZWQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2aXNpdGVkO1xuICAgICAgfTtcbiAgICAgIHJldHVybiAobm9kZTogdHMuRXhwcmVzc2lvbikgPT4gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgdmlzaXRvciwgY29udGV4dCk7XG4gICAgfTtcblxuLyoqXG4gKiBXcmFwcyBhbGwgZnVuY3Rpb25zIGluIGEgZ2l2ZW4gZXhwcmVzc2lvbiBpbiBwYXJlbnRoZXNlcy4gVGhpcyBpcyBuZWVkZWQgdG8gYXZvaWQgcHJvYmxlbXNcbiAqIHdoZXJlIFRzaWNrbGUgYW5ub3RhdGlvbnMgYWRkZWQgYmV0d2VlbiBhbmFseXNlIGFuZCB0cmFuc2Zvcm0gcGhhc2VzIGluIEFuZ3VsYXIgbWF5IHRyaWdnZXJcbiAqIGF1dG9tYXRpYyBzZW1pY29sb24gaW5zZXJ0aW9uLCBlLmcuIGlmIGEgZnVuY3Rpb24gaXMgdGhlIGV4cHJlc3Npb24gaW4gYSBgcmV0dXJuYCBzdGF0ZW1lbnQuXG4gKiBNb3JlXG4gKiBpbmZvIGNhbiBiZSBmb3VuZCBpbiBUc2lja2xlIHNvdXJjZSBjb2RlIGhlcmU6XG4gKiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci90c2lja2xlL2Jsb2IvZDc5NzQyNjI1NzFjOGExN2Q2ODRlNWJhMDc2ODBlMWIxOTkzYWZkZC9zcmMvanNkb2NfdHJhbnNmb3JtZXIudHMjTDEwMjFcbiAqXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiBFeHByZXNzaW9uIHdoZXJlIGZ1bmN0aW9ucyBzaG91bGQgYmUgd3JhcHBlZCBpbiBwYXJlbnRoZXNlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucyhleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIHJldHVybiB0cy50cmFuc2Zvcm0oZXhwcmVzc2lvbiwgW3BhcmVuc1dyYXBwZXJUcmFuc2Zvcm1lckZhY3RvcnldKS50cmFuc2Zvcm1lZFswXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgdHMuRGlhZ25vc3RpY2Agd2hpY2ggaW5kaWNhdGVzIHRoZSBnaXZlbiBjbGFzcyBpcyBwYXJ0IG9mIHRoZSBkZWNsYXJhdGlvbnMgb2YgdHdvIG9yXG4gKiBtb3JlIE5nTW9kdWxlcy5cbiAqXG4gKiBUaGUgcmVzdWx0aW5nIGB0cy5EaWFnbm9zdGljYCB3aWxsIGhhdmUgYSBjb250ZXh0IGVudHJ5IGZvciBlYWNoIE5nTW9kdWxlIHNob3dpbmcgdGhlIHBvaW50IHdoZXJlXG4gKiB0aGUgZGlyZWN0aXZlL3BpcGUgZXhpc3RzIGluIGl0cyBgZGVjbGFyYXRpb25zYCAoaWYgcG9zc2libGUpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZUR1cGxpY2F0ZURlY2xhcmF0aW9uRXJyb3IoXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGF0YTogRGVjbGFyYXRpb25EYXRhW10sIGtpbmQ6IHN0cmluZyk6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjb250ZXh0OiB7bm9kZTogdHMuTm9kZTsgbWVzc2FnZVRleHQ6IHN0cmluZzt9W10gPSBbXTtcbiAgZm9yIChjb25zdCBkZWNsIG9mIGRhdGEpIHtcbiAgICBpZiAoZGVjbC5yYXdEZWNsYXJhdGlvbnMgPT09IG51bGwpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICAvLyBUcnkgdG8gZmluZCB0aGUgcmVmZXJlbmNlIHRvIHRoZSBkZWNsYXJhdGlvbiB3aXRoaW4gdGhlIGRlY2xhcmF0aW9ucyBhcnJheSwgdG8gaGFuZyB0aGVcbiAgICAvLyBlcnJvciB0aGVyZS4gSWYgaXQgY2FuJ3QgYmUgZm91bmQsIGZhbGwgYmFjayBvbiB1c2luZyB0aGUgTmdNb2R1bGUncyBuYW1lLlxuICAgIGNvbnN0IGNvbnRleHROb2RlID0gZGVjbC5yZWYuZ2V0T3JpZ2luRm9yRGlhZ25vc3RpY3MoZGVjbC5yYXdEZWNsYXJhdGlvbnMsIGRlY2wubmdNb2R1bGUubmFtZSk7XG4gICAgY29udGV4dC5wdXNoKHtcbiAgICAgIG5vZGU6IGNvbnRleHROb2RlLFxuICAgICAgbWVzc2FnZVRleHQ6IGAnJHtub2RlLm5hbWUudGV4dH0nIGlzIGxpc3RlZCBpbiB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBOZ01vZHVsZSAnJHtcbiAgICAgICAgICBkZWNsLm5nTW9kdWxlLm5hbWUudGV4dH0nLmAsXG4gICAgfSk7XG4gIH1cblxuICAvLyBGaW5hbGx5LCBwcm9kdWNlIHRoZSBkaWFnbm9zdGljLlxuICByZXR1cm4gbWFrZURpYWdub3N0aWMoXG4gICAgICBFcnJvckNvZGUuTkdNT0RVTEVfREVDTEFSQVRJT05fTk9UX1VOSVFVRSwgbm9kZS5uYW1lLFxuICAgICAgYFRoZSAke2tpbmR9ICcke25vZGUubmFtZS50ZXh0fScgaXMgZGVjbGFyZWQgYnkgbW9yZSB0aGFuIG9uZSBOZ01vZHVsZS5gLCBjb250ZXh0KTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgZ2l2ZW4gYHJhd1Byb3ZpZGVyc2AgaW50byBgQ2xhc3NEZWNsYXJhdGlvbnNgIGFuZCByZXR1cm5zXG4gKiBhIHNldCBjb250YWluaW5nIHRob3NlIHRoYXQgYXJlIGtub3duIHRvIHJlcXVpcmUgYSBmYWN0b3J5IGRlZmluaXRpb24uXG4gKiBAcGFyYW0gcmF3UHJvdmlkZXJzIEV4cHJlc3Npb24gdGhhdCBkZWNsYXJlZCB0aGUgcHJvdmlkZXJzIGFycmF5IGluIHRoZSBzb3VyY2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeShcbiAgICByYXdQcm92aWRlcnM6IHRzLkV4cHJlc3Npb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj4ge1xuICBjb25zdCBwcm92aWRlcnMgPSBuZXcgU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj4oKTtcbiAgY29uc3QgcmVzb2x2ZWRQcm92aWRlcnMgPSBldmFsdWF0b3IuZXZhbHVhdGUocmF3UHJvdmlkZXJzKTtcblxuICBpZiAoIUFycmF5LmlzQXJyYXkocmVzb2x2ZWRQcm92aWRlcnMpKSB7XG4gICAgcmV0dXJuIHByb3ZpZGVycztcbiAgfVxuXG4gIHJlc29sdmVkUHJvdmlkZXJzLmZvckVhY2goZnVuY3Rpb24gcHJvY2Vzc1Byb3ZpZGVycyhwcm92aWRlcikge1xuICAgIGxldCB0b2tlbkNsYXNzOiBSZWZlcmVuY2V8bnVsbCA9IG51bGw7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShwcm92aWRlcikpIHtcbiAgICAgIC8vIElmIHdlIHJhbiBpbnRvIGFuIGFycmF5LCByZWN1cnNlIGludG8gaXQgdW50aWwgd2UndmUgcmVzb2x2ZSBhbGwgdGhlIGNsYXNzZXMuXG4gICAgICBwcm92aWRlci5mb3JFYWNoKHByb2Nlc3NQcm92aWRlcnMpO1xuICAgIH0gZWxzZSBpZiAocHJvdmlkZXIgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIHRva2VuQ2xhc3MgPSBwcm92aWRlcjtcbiAgICB9IGVsc2UgaWYgKHByb3ZpZGVyIGluc3RhbmNlb2YgTWFwICYmIHByb3ZpZGVyLmhhcygndXNlQ2xhc3MnKSAmJiAhcHJvdmlkZXIuaGFzKCdkZXBzJykpIHtcbiAgICAgIGNvbnN0IHVzZUV4aXN0aW5nID0gcHJvdmlkZXIuZ2V0KCd1c2VDbGFzcycpITtcbiAgICAgIGlmICh1c2VFeGlzdGluZyBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgICB0b2tlbkNsYXNzID0gdXNlRXhpc3Rpbmc7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRva2VuQ2xhc3MgIT09IG51bGwgJiYgcmVmbGVjdG9yLmlzQ2xhc3ModG9rZW5DbGFzcy5ub2RlKSkge1xuICAgICAgY29uc3QgY29uc3RydWN0b3JQYXJhbWV0ZXJzID0gcmVmbGVjdG9yLmdldENvbnN0cnVjdG9yUGFyYW1ldGVycyh0b2tlbkNsYXNzLm5vZGUpO1xuXG4gICAgICAvLyBOb3RlIHRoYXQgd2Ugb25seSB3YW50IHRvIGNhcHR1cmUgcHJvdmlkZXJzIHdpdGggYSBub24tdHJpdmlhbCBjb25zdHJ1Y3RvcixcbiAgICAgIC8vIGJlY2F1c2UgdGhleSdyZSB0aGUgb25lcyB0aGF0IG1pZ2h0IGJlIHVzaW5nIERJIGFuZCBuZWVkIHRvIGJlIGRlY29yYXRlZC5cbiAgICAgIGlmIChjb25zdHJ1Y3RvclBhcmFtZXRlcnMgIT09IG51bGwgJiYgY29uc3RydWN0b3JQYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcHJvdmlkZXJzLmFkZCh0b2tlbkNsYXNzIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcHJvdmlkZXJzO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBSM1JlZmVyZW5jZSBmb3IgYSBjbGFzcy5cbiAqXG4gKiBUaGUgYHZhbHVlYCBpcyB0aGUgZXhwb3J0ZWQgZGVjbGFyYXRpb24gb2YgdGhlIGNsYXNzIGZyb20gaXRzIHNvdXJjZSBmaWxlLlxuICogVGhlIGB0eXBlYCBpcyBhbiBleHByZXNzaW9uIHRoYXQgd291bGQgYmUgdXNlZCBieSBuZ2NjIGluIHRoZSB0eXBpbmdzICguZC50cykgZmlsZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cmFwVHlwZVJlZmVyZW5jZShyZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IFIzUmVmZXJlbmNlIHtcbiAgY29uc3QgZHRzQ2xhc3MgPSByZWZsZWN0b3IuZ2V0RHRzRGVjbGFyYXRpb24oY2xhenopO1xuICBjb25zdCB2YWx1ZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoY2xhenoubmFtZSk7XG4gIGNvbnN0IHR5cGUgPSBkdHNDbGFzcyAhPT0gbnVsbCAmJiBpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihkdHNDbGFzcykgP1xuICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihkdHNDbGFzcy5uYW1lKSA6XG4gICAgICB2YWx1ZTtcbiAgcmV0dXJuIHt2YWx1ZSwgdHlwZX07XG59XG5cbi8qKiBDcmVhdGVzIGEgUGFyc2VTb3VyY2VTcGFuIGZvciBhIFR5cGVTY3JpcHQgbm9kZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTb3VyY2VTcGFuKG5vZGU6IHRzLk5vZGUpOiBQYXJzZVNvdXJjZVNwYW4ge1xuICBjb25zdCBzZiA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICBjb25zdCBbc3RhcnRPZmZzZXQsIGVuZE9mZnNldF0gPSBbbm9kZS5nZXRTdGFydCgpLCBub2RlLmdldEVuZCgpXTtcbiAgY29uc3Qge2xpbmU6IHN0YXJ0TGluZSwgY2hhcmFjdGVyOiBzdGFydENvbH0gPSBzZi5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzdGFydE9mZnNldCk7XG4gIGNvbnN0IHtsaW5lOiBlbmRMaW5lLCBjaGFyYWN0ZXI6IGVuZENvbH0gPSBzZi5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihlbmRPZmZzZXQpO1xuICBjb25zdCBwYXJzZVNmID0gbmV3IFBhcnNlU291cmNlRmlsZShzZi5nZXRGdWxsVGV4dCgpLCBzZi5maWxlTmFtZSk7XG5cbiAgLy8gKzEgYmVjYXVzZSB2YWx1ZXMgYXJlIHplcm8taW5kZXhlZC5cbiAgcmV0dXJuIG5ldyBQYXJzZVNvdXJjZVNwYW4oXG4gICAgICBuZXcgUGFyc2VMb2NhdGlvbihwYXJzZVNmLCBzdGFydE9mZnNldCwgc3RhcnRMaW5lICsgMSwgc3RhcnRDb2wgKyAxKSxcbiAgICAgIG5ldyBQYXJzZUxvY2F0aW9uKHBhcnNlU2YsIGVuZE9mZnNldCwgZW5kTGluZSArIDEsIGVuZENvbCArIDEpKTtcbn1cbiJdfQ==