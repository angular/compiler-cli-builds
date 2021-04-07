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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/util", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.toFactoryMetadata = exports.compileResults = exports.createSourceSpan = exports.wrapTypeReference = exports.resolveProvidersRequiringFactory = exports.makeDuplicateDeclarationError = exports.wrapFunctionExpressionsInParens = exports.readBaseClass = exports.isWrappedTsNodeExpr = exports.isExpressionForwardReference = exports.combineResolvers = exports.forwardRefResolver = exports.tryUnwrapForwardRef = exports.unwrapExpression = exports.isAngularDecorator = exports.findAngularDecorator = exports.isAngularCoreReference = exports.isAngularCore = exports.toR3Reference = exports.validateConstructorDependencies = exports.getValidConstructorDependencies = exports.unwrapConstructorDependencies = exports.valueReferenceToExpression = exports.getConstructorDependencies = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
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
            var attributeNameType = null;
            var optional = false, self = false, skipSelf = false, host = false;
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
                        attributeNameType = new compiler_1.LiteralExpr(attributeName.text);
                    }
                    else {
                        attributeNameType =
                            new compiler_1.WrappedNodeExpr(ts.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword));
                    }
                }
                else {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_UNEXPECTED, reflection_1.Decorator.nodeForError(dec), "Unexpected decorator " + name + " on parameter.");
                }
            });
            if (token === null) {
                if (param.typeValueReference.kind !== 2 /* UNAVAILABLE */) {
                    throw new Error('Illegal state: expected value reference to be unavailable if no token is present');
                }
                errors.push({
                    index: idx,
                    param: param,
                    reason: param.typeValueReference.reason,
                });
            }
            else {
                deps.push({ token: token, attributeNameType: attributeNameType, optional: optional, self: self, skipSelf: skipSelf, host: host });
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
        var e_1, _a;
        if (valueRef.kind === 2 /* UNAVAILABLE */) {
            return null;
        }
        else if (valueRef.kind === 0 /* LOCAL */) {
            if (defaultImportRecorder !== null && valueRef.defaultImportStatement !== null &&
                ts.isIdentifier(valueRef.expression)) {
                defaultImportRecorder.recordImportedIdentifier(valueRef.expression, valueRef.defaultImportStatement);
            }
            return new compiler_1.WrappedNodeExpr(valueRef.expression);
        }
        else {
            var importExpr = new compiler_1.ExternalExpr({ moduleName: valueRef.moduleName, name: valueRef.importedName });
            if (valueRef.nestedPath !== null) {
                try {
                    for (var _b = tslib_1.__values(valueRef.nestedPath), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var property = _c.value;
                        importExpr = new compiler_1.ReadPropExpr(importExpr, property);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            return importExpr;
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
            // There is at least one error.
            var error = deps.errors[0];
            throw createUnsuitableInjectionTokenError(clazz, error);
        }
    }
    exports.validateConstructorDependencies = validateConstructorDependencies;
    /**
     * Creates a fatal error with diagnostic for an invalid injection token.
     * @param clazz The class for which the injection token was unavailable.
     * @param error The reason why no valid injection token is available.
     */
    function createUnsuitableInjectionTokenError(clazz, error) {
        var param = error.param, index = error.index, reason = error.reason;
        var chainMessage = undefined;
        var hints = undefined;
        switch (reason.kind) {
            case 5 /* UNSUPPORTED */:
                chainMessage = 'Consider using the @Inject decorator to specify an injection token.';
                hints = [
                    diagnostics_1.makeRelatedInformation(reason.typeNode, 'This type is not supported as injection token.'),
                ];
                break;
            case 1 /* NO_VALUE_DECLARATION */:
                chainMessage = 'Consider using the @Inject decorator to specify an injection token.';
                hints = [
                    diagnostics_1.makeRelatedInformation(reason.typeNode, 'This type does not have a value, so it cannot be used as injection token.'),
                ];
                if (reason.decl !== null) {
                    hints.push(diagnostics_1.makeRelatedInformation(reason.decl, 'The type is declared here.'));
                }
                break;
            case 2 /* TYPE_ONLY_IMPORT */:
                chainMessage =
                    'Consider changing the type-only import to a regular import, or use the @Inject decorator to specify an injection token.';
                hints = [
                    diagnostics_1.makeRelatedInformation(reason.typeNode, 'This type is imported using a type-only import, which prevents it from being usable as an injection token.'),
                    diagnostics_1.makeRelatedInformation(reason.importClause, 'The type-only import occurs here.'),
                ];
                break;
            case 4 /* NAMESPACE */:
                chainMessage = 'Consider using the @Inject decorator to specify an injection token.';
                hints = [
                    diagnostics_1.makeRelatedInformation(reason.typeNode, 'This type corresponds with a namespace, which cannot be used as injection token.'),
                    diagnostics_1.makeRelatedInformation(reason.importClause, 'The namespace import occurs here.'),
                ];
                break;
            case 3 /* UNKNOWN_REFERENCE */:
                chainMessage = 'The type should reference a known declaration.';
                hints = [diagnostics_1.makeRelatedInformation(reason.typeNode, 'This type could not be resolved.')];
                break;
            case 0 /* MISSING_TYPE */:
                chainMessage =
                    'Consider adding a type to the parameter or use the @Inject decorator to specify an injection token.';
                break;
        }
        var chain = {
            messageText: "No suitable injection token for parameter '" + (param.name || index) + "' of class '" + clazz.name.text + "'.",
            category: ts.DiagnosticCategory.Error,
            code: 0,
            next: [{
                    messageText: chainMessage,
                    category: ts.DiagnosticCategory.Message,
                    code: 0,
                }],
        };
        return new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.PARAM_MISSING_TOKEN, param.nameNode, chain, hints);
    }
    function toR3Reference(valueRef, typeRef, valueContext, typeContext, refEmitter) {
        return {
            value: refEmitter.emit(valueRef, valueContext).expression,
            type: refEmitter
                .emit(typeRef, typeContext, imports_1.ImportFlags.ForceNewImport | imports_1.ImportFlags.AllowTypeImports)
                .expression,
        };
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
     * If the given `node` is a forwardRef() expression then resolve its inner value, otherwise return
     * `null`.
     *
     * @param node the forwardRef() expression to resolve
     * @param reflector a ReflectionHost
     * @returns the resolved expression, if the original expression was a forwardRef(), or `null`
     *     otherwise.
     */
    function tryUnwrapForwardRef(node, reflector) {
        node = unwrapExpression(node);
        if (!ts.isCallExpression(node) || node.arguments.length !== 1) {
            return null;
        }
        var fn = ts.isPropertyAccessExpression(node.expression) ? node.expression.name : node.expression;
        if (!ts.isIdentifier(fn)) {
            return null;
        }
        var expr = expandForwardRef(node.arguments[0]);
        if (expr === null) {
            return null;
        }
        var imp = reflector.getImportOfIdentifier(fn);
        if (imp === null || imp.from !== '@angular/core' || imp.name !== 'forwardRef') {
            return null;
        }
        return expr;
    }
    exports.tryUnwrapForwardRef = tryUnwrapForwardRef;
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
            var e_2, _a;
            try {
                for (var resolvers_1 = tslib_1.__values(resolvers), resolvers_1_1 = resolvers_1.next(); !resolvers_1_1.done; resolvers_1_1 = resolvers_1.next()) {
                    var resolver = resolvers_1_1.value;
                    var resolved = resolver(ref, args);
                    if (resolved !== null) {
                        return resolved;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (resolvers_1_1 && !resolvers_1_1.done && (_a = resolvers_1.return)) _a.call(resolvers_1);
                }
                finally { if (e_2) throw e_2.error; }
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
        var e_3, _a;
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
                context.push(diagnostics_1.makeRelatedInformation(contextNode, "'" + node.name.text + "' is listed in the declarations of the NgModule '" + decl.ngModule.name.text + "'."));
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (data_1_1 && !data_1_1.done && (_a = data_1.return)) _a.call(data_1);
            }
            finally { if (e_3) throw e_3.error; }
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
            // TODO(alxhub): there was a bug where `getConstructorParameters` would return `null` for a
            // class in a .d.ts file, always, even if the class had a constructor. This was fixed for
            // `getConstructorParameters`, but that fix causes more classes to be recognized here as needing
            // provider checks, which is a breaking change in g3. Avoid this breakage for now by skipping
            // classes from .d.ts files here directly, until g3 can be cleaned up.
            if (tokenClass !== null && !tokenClass.node.getSourceFile().isDeclarationFile &&
                reflector.isClass(tokenClass.node)) {
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
    /**
     * Collate the factory and definition compiled results into an array of CompileResult objects.
     */
    function compileResults(fac, def, metadataStmt, propName) {
        var statements = def.statements;
        if (metadataStmt !== null) {
            statements.push(metadataStmt);
        }
        return [
            fac, {
                name: propName,
                initializer: def.expression,
                statements: def.statements,
                type: def.type,
            }
        ];
    }
    exports.compileResults = compileResults;
    function toFactoryMetadata(meta, target) {
        return {
            name: meta.name,
            type: meta.type,
            internalType: meta.internalType,
            typeArgumentCount: meta.typeArgumentCount,
            deps: meta.deps,
            target: target
        };
    }
    exports.toFactoryMetadata = toFactoryMetadata;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUE0TjtJQUc1TiwrQkFBaUM7SUFFakMsMkVBQTBHO0lBQzFHLG1FQUE4RjtJQUU5Rix5RUFBc1E7SUFpQnRRLFNBQWdCLDBCQUEwQixDQUN0QyxLQUF1QixFQUFFLFNBQXlCLEVBQ2xELHFCQUE0QyxFQUFFLE1BQWU7UUFDL0QsSUFBTSxJQUFJLEdBQTJCLEVBQUUsQ0FBQztRQUN4QyxJQUFNLE1BQU0sR0FBMEIsRUFBRSxDQUFDO1FBQ3pDLElBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzRCxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7WUFDdkIsSUFBSSxTQUFTLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNqQyxPQUFPLElBQUksQ0FBQzthQUNiO2lCQUFNO2dCQUNMLFVBQVUsR0FBRyxFQUFFLENBQUM7YUFDakI7U0FDRjtRQUNELFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQyxLQUFLLEVBQUUsR0FBRztZQUM1QixJQUFJLEtBQUssR0FBRywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztZQUN4RixJQUFJLGlCQUFpQixHQUFvQixJQUFJLENBQUM7WUFDOUMsSUFBSSxRQUFRLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxLQUFLLEVBQUUsUUFBUSxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsS0FBSyxDQUFDO1lBRW5FLENBQUMsS0FBSyxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxNQUFNLElBQUksYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUE1QixDQUE0QixDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRztnQkFDOUUsSUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTyxDQUFDLElBQUksQ0FBQztnQkFDekUsSUFBSSxJQUFJLEtBQUssUUFBUSxFQUFFO29CQUNyQixJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTt3QkFDOUMsTUFBTSxJQUFJLGtDQUFvQixDQUMxQix1QkFBUyxDQUFDLHFCQUFxQixFQUFFLHNCQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUM1RCw4Q0FBOEMsQ0FBQyxDQUFDO3FCQUNyRDtvQkFDRCxLQUFLLEdBQUcsSUFBSSwwQkFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDMUM7cUJBQU0sSUFBSSxJQUFJLEtBQUssVUFBVSxFQUFFO29CQUM5QixRQUFRLEdBQUcsSUFBSSxDQUFDO2lCQUNqQjtxQkFBTSxJQUFJLElBQUksS0FBSyxVQUFVLEVBQUU7b0JBQzlCLFFBQVEsR0FBRyxJQUFJLENBQUM7aUJBQ2pCO3FCQUFNLElBQUksSUFBSSxLQUFLLE1BQU0sRUFBRTtvQkFDMUIsSUFBSSxHQUFHLElBQUksQ0FBQztpQkFDYjtxQkFBTSxJQUFJLElBQUksS0FBSyxNQUFNLEVBQUU7b0JBQzFCLElBQUksR0FBRyxJQUFJLENBQUM7aUJBQ2I7cUJBQU0sSUFBSSxJQUFJLEtBQUssV0FBVyxFQUFFO29CQUMvQixJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTt3QkFDOUMsTUFBTSxJQUFJLGtDQUFvQixDQUMxQix1QkFBUyxDQUFDLHFCQUFxQixFQUFFLHNCQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUM1RCxpREFBaUQsQ0FBQyxDQUFDO3FCQUN4RDtvQkFDRCxJQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxLQUFLLEdBQUcsSUFBSSwwQkFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDO29CQUMzQyxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsRUFBRTt3QkFDekMsaUJBQWlCLEdBQUcsSUFBSSxzQkFBVyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDekQ7eUJBQU07d0JBQ0wsaUJBQWlCOzRCQUNiLElBQUksMEJBQWUsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO3FCQUNqRjtpQkFDRjtxQkFBTTtvQkFDTCxNQUFNLElBQUksa0NBQW9CLENBQzFCLHVCQUFTLENBQUMsb0JBQW9CLEVBQUUsc0JBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQzNELDBCQUF3QixJQUFJLG1CQUFnQixDQUFDLENBQUM7aUJBQ25EO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7Z0JBQ2xCLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksd0JBQXVDLEVBQUU7b0JBQ3hFLE1BQU0sSUFBSSxLQUFLLENBQ1gsa0ZBQWtGLENBQUMsQ0FBQztpQkFDekY7Z0JBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDVixLQUFLLEVBQUUsR0FBRztvQkFDVixLQUFLLE9BQUE7b0JBQ0wsTUFBTSxFQUFFLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNO2lCQUN4QyxDQUFDLENBQUM7YUFDSjtpQkFBTTtnQkFDTCxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxPQUFBLEVBQUUsaUJBQWlCLG1CQUFBLEVBQUUsUUFBUSxVQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUUsUUFBUSxVQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUMsQ0FBQyxDQUFDO2FBQ3ZFO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3ZCLE9BQU8sRUFBQyxJQUFJLE1BQUEsRUFBQyxDQUFDO1NBQ2Y7YUFBTTtZQUNMLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sUUFBQSxFQUFDLENBQUM7U0FDN0I7SUFDSCxDQUFDO0lBM0VELGdFQTJFQztJQWNELFNBQWdCLDBCQUEwQixDQUN0QyxRQUE0QixFQUFFLHFCQUE0Qzs7UUFDNUUsSUFBSSxRQUFRLENBQUMsSUFBSSx3QkFBdUMsRUFBRTtZQUN4RCxPQUFPLElBQUksQ0FBQztTQUNiO2FBQU0sSUFBSSxRQUFRLENBQUMsSUFBSSxrQkFBaUMsRUFBRTtZQUN6RCxJQUFJLHFCQUFxQixLQUFLLElBQUksSUFBSSxRQUFRLENBQUMsc0JBQXNCLEtBQUssSUFBSTtnQkFDMUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ3hDLHFCQUFxQixDQUFDLHdCQUF3QixDQUMxQyxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2FBQzNEO1lBQ0QsT0FBTyxJQUFJLDBCQUFlLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ2pEO2FBQU07WUFDTCxJQUFJLFVBQVUsR0FDVixJQUFJLHVCQUFZLENBQUMsRUFBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBQyxDQUFDLENBQUM7WUFDckYsSUFBSSxRQUFRLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRTs7b0JBQ2hDLEtBQXVCLElBQUEsS0FBQSxpQkFBQSxRQUFRLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO3dCQUF2QyxJQUFNLFFBQVEsV0FBQTt3QkFDakIsVUFBVSxHQUFHLElBQUksdUJBQVksQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7cUJBQ3JEOzs7Ozs7Ozs7YUFDRjtZQUNELE9BQU8sVUFBVSxDQUFDO1NBQ25CO0lBQ0gsQ0FBQztJQXJCRCxnRUFxQkM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLDZCQUE2QixDQUFDLElBQTBCO1FBRXRFLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtZQUNqQixPQUFPLElBQUksQ0FBQztTQUNiO2FBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtZQUM3Qiw0Q0FBNEM7WUFDNUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ2xCO2FBQU07WUFDTCwwQkFBMEI7WUFDMUIsT0FBTyxTQUFTLENBQUM7U0FDbEI7SUFDSCxDQUFDO0lBWEQsc0VBV0M7SUFFRCxTQUFnQiwrQkFBK0IsQ0FDM0MsS0FBdUIsRUFBRSxTQUF5QixFQUNsRCxxQkFBNEMsRUFBRSxNQUFlO1FBQy9ELE9BQU8sK0JBQStCLENBQ2xDLEtBQUssRUFBRSwwQkFBMEIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUxELDBFQUtDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsU0FBZ0IsK0JBQStCLENBQzNDLEtBQXVCLEVBQUUsSUFBMEI7UUFDckQsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO1lBQ2pCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO1lBQzdCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztTQUNsQjthQUFNO1lBQ0wsOEZBQThGO1lBQzlGLCtCQUErQjtZQUMvQixJQUFNLEtBQUssR0FBSSxJQUF3QyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRSxNQUFNLG1DQUFtQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN6RDtJQUNILENBQUM7SUFaRCwwRUFZQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLG1DQUFtQyxDQUN4QyxLQUF1QixFQUFFLEtBQTBCO1FBQzlDLElBQUEsS0FBSyxHQUFtQixLQUFLLE1BQXhCLEVBQUUsS0FBSyxHQUFZLEtBQUssTUFBakIsRUFBRSxNQUFNLEdBQUksS0FBSyxPQUFULENBQVU7UUFDckMsSUFBSSxZQUFZLEdBQXFCLFNBQVMsQ0FBQztRQUMvQyxJQUFJLEtBQUssR0FBZ0QsU0FBUyxDQUFDO1FBQ25FLFFBQVEsTUFBTSxDQUFDLElBQUksRUFBRTtZQUNuQjtnQkFDRSxZQUFZLEdBQUcscUVBQXFFLENBQUM7Z0JBQ3JGLEtBQUssR0FBRztvQkFDTixvQ0FBc0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLGdEQUFnRCxDQUFDO2lCQUMxRixDQUFDO2dCQUNGLE1BQU07WUFDUjtnQkFDRSxZQUFZLEdBQUcscUVBQXFFLENBQUM7Z0JBQ3JGLEtBQUssR0FBRztvQkFDTixvQ0FBc0IsQ0FDbEIsTUFBTSxDQUFDLFFBQVEsRUFDZiwyRUFBMkUsQ0FBQztpQkFDakYsQ0FBQztnQkFDRixJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO29CQUN4QixLQUFLLENBQUMsSUFBSSxDQUFDLG9DQUFzQixDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO2lCQUMvRTtnQkFDRCxNQUFNO1lBQ1I7Z0JBQ0UsWUFBWTtvQkFDUix5SEFBeUgsQ0FBQztnQkFDOUgsS0FBSyxHQUFHO29CQUNOLG9DQUFzQixDQUNsQixNQUFNLENBQUMsUUFBUSxFQUNmLDRHQUE0RyxDQUFDO29CQUNqSCxvQ0FBc0IsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLG1DQUFtQyxDQUFDO2lCQUNqRixDQUFDO2dCQUNGLE1BQU07WUFDUjtnQkFDRSxZQUFZLEdBQUcscUVBQXFFLENBQUM7Z0JBQ3JGLEtBQUssR0FBRztvQkFDTixvQ0FBc0IsQ0FDbEIsTUFBTSxDQUFDLFFBQVEsRUFDZixrRkFBa0YsQ0FBQztvQkFDdkYsb0NBQXNCLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxtQ0FBbUMsQ0FBQztpQkFDakYsQ0FBQztnQkFDRixNQUFNO1lBQ1I7Z0JBQ0UsWUFBWSxHQUFHLGdEQUFnRCxDQUFDO2dCQUNoRSxLQUFLLEdBQUcsQ0FBQyxvQ0FBc0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLGtDQUFrQyxDQUFDLENBQUMsQ0FBQztnQkFDdEYsTUFBTTtZQUNSO2dCQUNFLFlBQVk7b0JBQ1IscUdBQXFHLENBQUM7Z0JBQzFHLE1BQU07U0FDVDtRQUVELElBQU0sS0FBSyxHQUE4QjtZQUN2QyxXQUFXLEVBQUUsaURBQThDLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxxQkFDMUUsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQUk7WUFDdkIsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO1lBQ3JDLElBQUksRUFBRSxDQUFDO1lBQ1AsSUFBSSxFQUFFLENBQUM7b0JBQ0wsV0FBVyxFQUFFLFlBQVk7b0JBQ3pCLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTztvQkFDdkMsSUFBSSxFQUFFLENBQUM7aUJBQ1IsQ0FBQztTQUNILENBQUM7UUFFRixPQUFPLElBQUksa0NBQW9CLENBQUMsdUJBQVMsQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMvRixDQUFDO0lBRUQsU0FBZ0IsYUFBYSxDQUN6QixRQUFtQixFQUFFLE9BQWtCLEVBQUUsWUFBMkIsRUFDcEUsV0FBMEIsRUFBRSxVQUE0QjtRQUMxRCxPQUFPO1lBQ0wsS0FBSyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDLFVBQVU7WUFDekQsSUFBSSxFQUFFLFVBQVU7aUJBQ0wsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUscUJBQVcsQ0FBQyxjQUFjLEdBQUcscUJBQVcsQ0FBQyxnQkFBZ0IsQ0FBQztpQkFDckYsVUFBVTtTQUN0QixDQUFDO0lBQ0osQ0FBQztJQVRELHNDQVNDO0lBRUQsU0FBZ0IsYUFBYSxDQUFDLFNBQW9CO1FBQ2hELE9BQU8sU0FBUyxDQUFDLE1BQU0sS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssZUFBZSxDQUFDO0lBQ2hGLENBQUM7SUFGRCxzQ0FFQztJQUVELFNBQWdCLHNCQUFzQixDQUFDLFNBQW9CLEVBQUUsVUFBa0I7UUFDN0UsT0FBTyxTQUFTLENBQUMsa0JBQWtCLEtBQUssZUFBZSxJQUFJLFNBQVMsQ0FBQyxTQUFTLEtBQUssVUFBVSxDQUFDO0lBQ2hHLENBQUM7SUFGRCx3REFFQztJQUVELFNBQWdCLG9CQUFvQixDQUNoQyxVQUF1QixFQUFFLElBQVksRUFBRSxNQUFlO1FBQ3hELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQTNDLENBQTJDLENBQUMsQ0FBQztJQUNuRixDQUFDO0lBSEQsb0RBR0M7SUFFRCxTQUFnQixrQkFBa0IsQ0FBQyxTQUFvQixFQUFFLElBQVksRUFBRSxNQUFlO1FBQ3BGLElBQUksTUFBTSxFQUFFO1lBQ1YsT0FBTyxTQUFTLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQztTQUNoQzthQUFNLElBQUksYUFBYSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ25DLE9BQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDO1NBQ3ZDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBUEQsZ0RBT0M7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLElBQW1CO1FBQ2xELE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDcEUsSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7U0FDeEI7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFMRCw0Q0FLQztJQUVELFNBQVMsZ0JBQWdCLENBQUMsR0FBa0I7UUFDMUMsR0FBRyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVCLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzdELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFNLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ3RCLDBGQUEwRjtRQUMxRixJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDcEIsbURBQW1EO1lBQ25ELElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUNoQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFO2dCQUNoRSxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO1NBQ3hCO2FBQU07WUFDTCw0Q0FBNEM7WUFDNUMsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNILENBQUM7SUFHRDs7Ozs7Ozs7T0FRRztJQUNILFNBQWdCLG1CQUFtQixDQUFDLElBQW1CLEVBQUUsU0FBeUI7UUFFaEYsSUFBSSxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzdELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFNLEVBQUUsR0FDSixFQUFFLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUM1RixJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUN4QixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsSUFBTSxJQUFJLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pELElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtZQUNqQixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsSUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELElBQUksR0FBRyxLQUFLLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLGVBQWUsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFlBQVksRUFBRTtZQUM3RSxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBeEJELGtEQXdCQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixrQkFBa0IsQ0FDOUIsR0FBaUYsRUFDakYsSUFBa0M7UUFDcEMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNuRSxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBUEQsZ0RBT0M7SUFFRDs7O09BR0c7SUFDSCxTQUFnQixnQkFBZ0IsQ0FBQyxTQUFvQztRQUNuRSxPQUFPLFVBQUMsR0FBaUYsRUFDakYsSUFBa0M7OztnQkFDeEMsS0FBdUIsSUFBQSxjQUFBLGlCQUFBLFNBQVMsQ0FBQSxvQ0FBQSwyREFBRTtvQkFBN0IsSUFBTSxRQUFRLHNCQUFBO29CQUNqQixJQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUNyQyxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7d0JBQ3JCLE9BQU8sUUFBUSxDQUFDO3FCQUNqQjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUM7SUFDSixDQUFDO0lBWEQsNENBV0M7SUFFRCxTQUFnQiw0QkFBNEIsQ0FDeEMsSUFBZ0IsRUFBRSxPQUFnQixFQUFFLGFBQTRCO1FBQ2xFLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDN0IsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0MsT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssYUFBYSxJQUFJLE9BQU8sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztTQUN6RTthQUFNO1lBQ0wsT0FBTyxLQUFLLENBQUM7U0FDZDtJQUNILENBQUM7SUFSRCxvRUFRQztJQUVELFNBQWdCLG1CQUFtQixDQUFDLElBQWdCO1FBQ2xELE9BQU8sSUFBSSxZQUFZLDBCQUFlLENBQUM7SUFDekMsQ0FBQztJQUZELGtEQUVDO0lBRUQsU0FBZ0IsYUFBYSxDQUN6QixJQUFzQixFQUFFLFNBQXlCLEVBQ2pELFNBQTJCO1FBQzdCLElBQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5RCxJQUFJLGNBQWMsS0FBSyxJQUFJLEVBQUU7WUFDM0IsSUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNyRCxJQUFJLFNBQVMsWUFBWSxtQkFBUyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN2RSxPQUFPLFNBQXdDLENBQUM7YUFDakQ7aUJBQU07Z0JBQ0wsT0FBTyxTQUFTLENBQUM7YUFDbEI7U0FDRjtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQWRELHNDQWNDO0lBRUQsSUFBTSwrQkFBK0IsR0FDakMsVUFBQyxPQUFpQztRQUNoQyxJQUFNLE9BQU8sR0FBZSxVQUFDLElBQWE7WUFDeEMsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzFELElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ25FLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNoQztZQUNELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUMsQ0FBQztRQUNGLE9BQU8sVUFBQyxJQUFtQixJQUFLLE9BQUEsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUF6QyxDQUF5QyxDQUFDO0lBQzVFLENBQUMsQ0FBQztJQUVOOzs7Ozs7Ozs7T0FTRztJQUNILFNBQWdCLCtCQUErQixDQUFDLFVBQXlCO1FBQ3ZFLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFGRCwwRUFFQztJQUVEOzs7Ozs7T0FNRztJQUNILFNBQWdCLDZCQUE2QixDQUN6QyxJQUFzQixFQUFFLElBQXVCLEVBQUUsSUFBWTs7UUFDL0QsSUFBTSxPQUFPLEdBQXNDLEVBQUUsQ0FBQzs7WUFDdEQsS0FBbUIsSUFBQSxTQUFBLGlCQUFBLElBQUksQ0FBQSwwQkFBQSw0Q0FBRTtnQkFBcEIsSUFBTSxJQUFJLGlCQUFBO2dCQUNiLElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxJQUFJLEVBQUU7b0JBQ2pDLFNBQVM7aUJBQ1Y7Z0JBQ0QsMEZBQTBGO2dCQUMxRiw2RUFBNkU7Z0JBQzdFLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMvRixPQUFPLENBQUMsSUFBSSxDQUFDLG9DQUFzQixDQUMvQixXQUFXLEVBQ1gsTUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUkseURBQ2QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFJLENBQUMsQ0FBQyxDQUFDO2FBQ3ZDOzs7Ozs7Ozs7UUFFRCxtQ0FBbUM7UUFDbkMsT0FBTyw0QkFBYyxDQUNqQix1QkFBUyxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQyxJQUFJLEVBQ3BELFNBQU8sSUFBSSxVQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSw2Q0FBMEMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN6RixDQUFDO0lBcEJELHNFQW9CQztJQUVEOzs7O09BSUc7SUFDSCxTQUFnQixnQ0FBZ0MsQ0FDNUMsWUFBMkIsRUFBRSxTQUF5QixFQUN0RCxTQUEyQjtRQUM3QixJQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBK0IsQ0FBQztRQUN6RCxJQUFNLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFM0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsRUFBRTtZQUNyQyxPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUVELGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxTQUFTLGdCQUFnQixDQUFDLFFBQVE7WUFDMUQsSUFBSSxVQUFVLEdBQW1CLElBQUksQ0FBQztZQUV0QyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzNCLGdGQUFnRjtnQkFDaEYsUUFBUSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ3BDO2lCQUFNLElBQUksUUFBUSxZQUFZLG1CQUFTLEVBQUU7Z0JBQ3hDLFVBQVUsR0FBRyxRQUFRLENBQUM7YUFDdkI7aUJBQU0sSUFBSSxRQUFRLFlBQVksR0FBRyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUN2RixJQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRSxDQUFDO2dCQUM5QyxJQUFJLFdBQVcsWUFBWSxtQkFBUyxFQUFFO29CQUNwQyxVQUFVLEdBQUcsV0FBVyxDQUFDO2lCQUMxQjthQUNGO1lBRUQsMkZBQTJGO1lBQzNGLHlGQUF5RjtZQUN6RixnR0FBZ0c7WUFDaEcsNkZBQTZGO1lBQzdGLHNFQUFzRTtZQUN0RSxJQUFJLFVBQVUsS0FBSyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLGlCQUFpQjtnQkFDekUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3RDLElBQU0scUJBQXFCLEdBQUcsU0FBUyxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFbEYsOEVBQThFO2dCQUM5RSw0RUFBNEU7Z0JBQzVFLElBQUkscUJBQXFCLEtBQUssSUFBSSxJQUFJLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7b0JBQ3RFLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBeUMsQ0FBQyxDQUFDO2lCQUMxRDthQUNGO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBM0NELDRFQTJDQztJQUVEOzs7OztPQUtHO0lBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsU0FBeUIsRUFBRSxLQUF1QjtRQUNsRixJQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEQsSUFBTSxLQUFLLEdBQUcsSUFBSSwwQkFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QyxJQUFNLElBQUksR0FBRyxRQUFRLEtBQUssSUFBSSxJQUFJLG9DQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDakUsSUFBSSwwQkFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLEtBQUssQ0FBQztRQUNWLE9BQU8sRUFBQyxLQUFLLE9BQUEsRUFBRSxJQUFJLE1BQUEsRUFBQyxDQUFDO0lBQ3ZCLENBQUM7SUFQRCw4Q0FPQztJQUVELHVEQUF1RDtJQUN2RCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFhO1FBQzVDLElBQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMxQixJQUFBLEtBQUEsZUFBMkIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUEsRUFBMUQsV0FBVyxRQUFBLEVBQUUsU0FBUyxRQUFvQyxDQUFDO1FBQzVELElBQUEsS0FBeUMsRUFBRSxDQUFDLDZCQUE2QixDQUFDLFdBQVcsQ0FBQyxFQUEvRSxTQUFTLFVBQUEsRUFBYSxRQUFRLGVBQWlELENBQUM7UUFDdkYsSUFBQSxLQUFxQyxFQUFFLENBQUMsNkJBQTZCLENBQUMsU0FBUyxDQUFDLEVBQXpFLE9BQU8sVUFBQSxFQUFhLE1BQU0sZUFBK0MsQ0FBQztRQUN2RixJQUFNLE9BQU8sR0FBRyxJQUFJLDBCQUFlLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVuRSxzQ0FBc0M7UUFDdEMsT0FBTyxJQUFJLDBCQUFlLENBQ3RCLElBQUksd0JBQWEsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsR0FBRyxDQUFDLEVBQUUsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUNwRSxJQUFJLHdCQUFhLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFYRCw0Q0FXQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsY0FBYyxDQUMxQixHQUFrQixFQUFFLEdBQXlCLEVBQUUsWUFBNEIsRUFDM0UsUUFBZ0I7UUFDbEIsSUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQztRQUNsQyxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUU7WUFDekIsVUFBVSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUMvQjtRQUNELE9BQU87WUFDTCxHQUFHLEVBQUU7Z0JBQ0gsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxVQUFVO2dCQUMzQixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVU7Z0JBQzFCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTthQUNmO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUFmRCx3Q0FlQztJQUVELFNBQWdCLGlCQUFpQixDQUM3QixJQUF1QyxFQUFFLE1BQXFCO1FBQ2hFLE9BQU87WUFDTCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtZQUN6QyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixNQUFNLFFBQUE7U0FDUCxDQUFDO0lBQ0osQ0FBQztJQVZELDhDQVVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBMaXRlcmFsRXhwciwgUGFyc2VMb2NhdGlvbiwgUGFyc2VTb3VyY2VGaWxlLCBQYXJzZVNvdXJjZVNwYW4sIFIzQ29tcGlsZWRFeHByZXNzaW9uLCBSM0RlcGVuZGVuY3lNZXRhZGF0YSwgUjNSZWZlcmVuY2UsIFJlYWRQcm9wRXhwciwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7UjNGYWN0b3J5TWV0YWRhdGF9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9jb21waWxlcic7XG5pbXBvcnQge0ZhY3RvcnlUYXJnZXR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3BhcnRpYWwvYXBpJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3IsIG1ha2VEaWFnbm9zdGljLCBtYWtlUmVsYXRlZEluZm9ybWF0aW9ufSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgSW1wb3J0RmxhZ3MsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0ZvcmVpZ25GdW5jdGlvblJlc29sdmVyLCBQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIEN0b3JQYXJhbWV0ZXIsIERlY29yYXRvciwgSW1wb3J0LCBJbXBvcnRlZFR5cGVWYWx1ZVJlZmVyZW5jZSwgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24sIExvY2FsVHlwZVZhbHVlUmVmZXJlbmNlLCBSZWZsZWN0aW9uSG9zdCwgVHlwZVZhbHVlUmVmZXJlbmNlLCBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLCBVbmF2YWlsYWJsZVZhbHVlLCBWYWx1ZVVuYXZhaWxhYmxlS2luZH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0RlY2xhcmF0aW9uRGF0YX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtDb21waWxlUmVzdWx0fSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuXG5leHBvcnQgdHlwZSBDb25zdHJ1Y3RvckRlcHMgPSB7XG4gIGRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW107XG59fHtcbiAgZGVwczogbnVsbDtcbiAgZXJyb3JzOiBDb25zdHJ1Y3RvckRlcEVycm9yW107XG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbnN0cnVjdG9yRGVwRXJyb3Ige1xuICBpbmRleDogbnVtYmVyO1xuICBwYXJhbTogQ3RvclBhcmFtZXRlcjtcbiAgcmVhc29uOiBVbmF2YWlsYWJsZVZhbHVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgY2xheno6IENsYXNzRGVjbGFyYXRpb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZTogYm9vbGVhbik6IENvbnN0cnVjdG9yRGVwc3xudWxsIHtcbiAgY29uc3QgZGVwczogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXSA9IFtdO1xuICBjb25zdCBlcnJvcnM6IENvbnN0cnVjdG9yRGVwRXJyb3JbXSA9IFtdO1xuICBsZXQgY3RvclBhcmFtcyA9IHJlZmxlY3Rvci5nZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xhenopO1xuICBpZiAoY3RvclBhcmFtcyA9PT0gbnVsbCkge1xuICAgIGlmIChyZWZsZWN0b3IuaGFzQmFzZUNsYXNzKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0b3JQYXJhbXMgPSBbXTtcbiAgICB9XG4gIH1cbiAgY3RvclBhcmFtcy5mb3JFYWNoKChwYXJhbSwgaWR4KSA9PiB7XG4gICAgbGV0IHRva2VuID0gdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24ocGFyYW0udHlwZVZhbHVlUmVmZXJlbmNlLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIpO1xuICAgIGxldCBhdHRyaWJ1dGVOYW1lVHlwZTogRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBsZXQgb3B0aW9uYWwgPSBmYWxzZSwgc2VsZiA9IGZhbHNlLCBza2lwU2VsZiA9IGZhbHNlLCBob3N0ID0gZmFsc2U7XG5cbiAgICAocGFyYW0uZGVjb3JhdG9ycyB8fCBbXSkuZmlsdGVyKGRlYyA9PiBpc0NvcmUgfHwgaXNBbmd1bGFyQ29yZShkZWMpKS5mb3JFYWNoKGRlYyA9PiB7XG4gICAgICBjb25zdCBuYW1lID0gaXNDb3JlIHx8IGRlYy5pbXBvcnQgPT09IG51bGwgPyBkZWMubmFtZSA6IGRlYy5pbXBvcnQhLm5hbWU7XG4gICAgICBpZiAobmFtZSA9PT0gJ0luamVjdCcpIHtcbiAgICAgICAgaWYgKGRlYy5hcmdzID09PSBudWxsIHx8IGRlYy5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWMpLFxuICAgICAgICAgICAgICBgVW5leHBlY3RlZCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBJbmplY3QoKS5gKTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbiA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoZGVjLmFyZ3NbMF0pO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnT3B0aW9uYWwnKSB7XG4gICAgICAgIG9wdGlvbmFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ1NraXBTZWxmJykge1xuICAgICAgICBza2lwU2VsZiA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdTZWxmJykge1xuICAgICAgICBzZWxmID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ0hvc3QnKSB7XG4gICAgICAgIGhvc3QgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnQXR0cmlidXRlJykge1xuICAgICAgICBpZiAoZGVjLmFyZ3MgPT09IG51bGwgfHwgZGVjLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlYyksXG4gICAgICAgICAgICAgIGBVbmV4cGVjdGVkIG51bWJlciBvZiBhcmd1bWVudHMgdG8gQEF0dHJpYnV0ZSgpLmApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGF0dHJpYnV0ZU5hbWUgPSBkZWMuYXJnc1swXTtcbiAgICAgICAgdG9rZW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKGF0dHJpYnV0ZU5hbWUpO1xuICAgICAgICBpZiAodHMuaXNTdHJpbmdMaXRlcmFsTGlrZShhdHRyaWJ1dGVOYW1lKSkge1xuICAgICAgICAgIGF0dHJpYnV0ZU5hbWVUeXBlID0gbmV3IExpdGVyYWxFeHByKGF0dHJpYnV0ZU5hbWUudGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXR0cmlidXRlTmFtZVR5cGUgPVxuICAgICAgICAgICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLlVua25vd25LZXl3b3JkKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfVU5FWFBFQ1RFRCwgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWMpLFxuICAgICAgICAgICAgYFVuZXhwZWN0ZWQgZGVjb3JhdG9yICR7bmFtZX0gb24gcGFyYW1ldGVyLmApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHRva2VuID09PSBudWxsKSB7XG4gICAgICBpZiAocGFyYW0udHlwZVZhbHVlUmVmZXJlbmNlLmtpbmQgIT09IFR5cGVWYWx1ZVJlZmVyZW5jZUtpbmQuVU5BVkFJTEFCTEUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ0lsbGVnYWwgc3RhdGU6IGV4cGVjdGVkIHZhbHVlIHJlZmVyZW5jZSB0byBiZSB1bmF2YWlsYWJsZSBpZiBubyB0b2tlbiBpcyBwcmVzZW50Jyk7XG4gICAgICB9XG4gICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgIGluZGV4OiBpZHgsXG4gICAgICAgIHBhcmFtLFxuICAgICAgICByZWFzb246IHBhcmFtLnR5cGVWYWx1ZVJlZmVyZW5jZS5yZWFzb24sXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVwcy5wdXNoKHt0b2tlbiwgYXR0cmlidXRlTmFtZVR5cGUsIG9wdGlvbmFsLCBzZWxmLCBza2lwU2VsZiwgaG9zdH0pO1xuICAgIH1cbiAgfSk7XG4gIGlmIChlcnJvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtkZXBzfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge2RlcHM6IG51bGwsIGVycm9yc307XG4gIH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgYFR5cGVWYWx1ZVJlZmVyZW5jZWAgdG8gYW4gYEV4cHJlc3Npb25gIHdoaWNoIHJlZmVycyB0byB0aGUgdHlwZSBhcyBhIHZhbHVlLlxuICpcbiAqIExvY2FsIHJlZmVyZW5jZXMgYXJlIGNvbnZlcnRlZCB0byBhIGBXcmFwcGVkTm9kZUV4cHJgIG9mIHRoZSBUeXBlU2NyaXB0IGV4cHJlc3Npb24sIGFuZCBub24tbG9jYWxcbiAqIHJlZmVyZW5jZXMgYXJlIGNvbnZlcnRlZCB0byBhbiBgRXh0ZXJuYWxFeHByYC4gTm90ZSB0aGF0IHRoaXMgaXMgb25seSB2YWxpZCBpbiB0aGUgY29udGV4dCBvZiB0aGVcbiAqIGZpbGUgaW4gd2hpY2ggdGhlIGBUeXBlVmFsdWVSZWZlcmVuY2VgIG9yaWdpbmF0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbihcbiAgICB2YWx1ZVJlZjogTG9jYWxUeXBlVmFsdWVSZWZlcmVuY2V8SW1wb3J0ZWRUeXBlVmFsdWVSZWZlcmVuY2UsXG4gICAgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIpOiBFeHByZXNzaW9uO1xuZXhwb3J0IGZ1bmN0aW9uIHZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uKFxuICAgIHZhbHVlUmVmOiBUeXBlVmFsdWVSZWZlcmVuY2UsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyKTogRXhwcmVzc2lvbnxudWxsO1xuZXhwb3J0IGZ1bmN0aW9uIHZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uKFxuICAgIHZhbHVlUmVmOiBUeXBlVmFsdWVSZWZlcmVuY2UsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKHZhbHVlUmVmLmtpbmQgPT09IFR5cGVWYWx1ZVJlZmVyZW5jZUtpbmQuVU5BVkFJTEFCTEUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIGlmICh2YWx1ZVJlZi5raW5kID09PSBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLkxPQ0FMKSB7XG4gICAgaWYgKGRlZmF1bHRJbXBvcnRSZWNvcmRlciAhPT0gbnVsbCAmJiB2YWx1ZVJlZi5kZWZhdWx0SW1wb3J0U3RhdGVtZW50ICE9PSBudWxsICYmXG4gICAgICAgIHRzLmlzSWRlbnRpZmllcih2YWx1ZVJlZi5leHByZXNzaW9uKSkge1xuICAgICAgZGVmYXVsdEltcG9ydFJlY29yZGVyLnJlY29yZEltcG9ydGVkSWRlbnRpZmllcihcbiAgICAgICAgICB2YWx1ZVJlZi5leHByZXNzaW9uLCB2YWx1ZVJlZi5kZWZhdWx0SW1wb3J0U3RhdGVtZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBXcmFwcGVkTm9kZUV4cHIodmFsdWVSZWYuZXhwcmVzc2lvbik7XG4gIH0gZWxzZSB7XG4gICAgbGV0IGltcG9ydEV4cHI6IEV4cHJlc3Npb24gPVxuICAgICAgICBuZXcgRXh0ZXJuYWxFeHByKHttb2R1bGVOYW1lOiB2YWx1ZVJlZi5tb2R1bGVOYW1lLCBuYW1lOiB2YWx1ZVJlZi5pbXBvcnRlZE5hbWV9KTtcbiAgICBpZiAodmFsdWVSZWYubmVzdGVkUGF0aCAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiB2YWx1ZVJlZi5uZXN0ZWRQYXRoKSB7XG4gICAgICAgIGltcG9ydEV4cHIgPSBuZXcgUmVhZFByb3BFeHByKGltcG9ydEV4cHIsIHByb3BlcnR5KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGltcG9ydEV4cHI7XG4gIH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0IGBDb25zdHJ1Y3RvckRlcHNgIGludG8gdGhlIGBSM0RlcGVuZGVuY3lNZXRhZGF0YWAgYXJyYXkgZm9yIHRob3NlIGRlcHMgaWYgdGhleSdyZSB2YWxpZCxcbiAqIG9yIGludG8gYW4gYCdpbnZhbGlkJ2Agc2lnbmFsIGlmIHRoZXkncmUgbm90LlxuICpcbiAqIFRoaXMgaXMgYSBjb21wYW5pb24gZnVuY3Rpb24gdG8gYHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXNgIHdoaWNoIGFjY2VwdHMgaW52YWxpZCBkZXBzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdW53cmFwQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoZGVwczogQ29uc3RydWN0b3JEZXBzfG51bGwpOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfFxuICAgICdpbnZhbGlkJ3xudWxsIHtcbiAgaWYgKGRlcHMgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIGlmIChkZXBzLmRlcHMgIT09IG51bGwpIHtcbiAgICAvLyBUaGVzZSBjb25zdHJ1Y3RvciBkZXBlbmRlbmNpZXMgYXJlIHZhbGlkLlxuICAgIHJldHVybiBkZXBzLmRlcHM7XG4gIH0gZWxzZSB7XG4gICAgLy8gVGhlc2UgZGVwcyBhcmUgaW52YWxpZC5cbiAgICByZXR1cm4gJ2ludmFsaWQnO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmU6IGJvb2xlYW4pOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfG51bGwge1xuICByZXR1cm4gdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICAgIGNsYXp6LCBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZSkpO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlIHRoYXQgYENvbnN0cnVjdG9yRGVwc2AgZG9lcyBub3QgaGF2ZSBhbnkgaW52YWxpZCBkZXBlbmRlbmNpZXMgYW5kIGNvbnZlcnQgdGhlbSBpbnRvIHRoZVxuICogYFIzRGVwZW5kZW5jeU1ldGFkYXRhYCBhcnJheSBpZiBzbywgb3IgcmFpc2UgYSBkaWFnbm9zdGljIGlmIHNvbWUgZGVwcyBhcmUgaW52YWxpZC5cbiAqXG4gKiBUaGlzIGlzIGEgY29tcGFuaW9uIGZ1bmN0aW9uIHRvIGB1bndyYXBDb25zdHJ1Y3RvckRlcGVuZGVuY2llc2Agd2hpY2ggZG9lcyBub3QgYWNjZXB0IGludmFsaWRcbiAqIGRlcHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBkZXBzOiBDb25zdHJ1Y3RvckRlcHN8bnVsbCk6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118bnVsbCB7XG4gIGlmIChkZXBzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSBpZiAoZGVwcy5kZXBzICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIGRlcHMuZGVwcztcbiAgfSBlbHNlIHtcbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY2FzdCBpcyBuZWNlc3NhcnkgYmVjYXVzZSB0aGUgZzMgdHlwZXNjcmlwdCB2ZXJzaW9uIGRvZXNuJ3QgbmFycm93IGhlcmUuXG4gICAgLy8gVGhlcmUgaXMgYXQgbGVhc3Qgb25lIGVycm9yLlxuICAgIGNvbnN0IGVycm9yID0gKGRlcHMgYXMge2Vycm9yczogQ29uc3RydWN0b3JEZXBFcnJvcltdfSkuZXJyb3JzWzBdO1xuICAgIHRocm93IGNyZWF0ZVVuc3VpdGFibGVJbmplY3Rpb25Ub2tlbkVycm9yKGNsYXp6LCBlcnJvcik7XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgZmF0YWwgZXJyb3Igd2l0aCBkaWFnbm9zdGljIGZvciBhbiBpbnZhbGlkIGluamVjdGlvbiB0b2tlbi5cbiAqIEBwYXJhbSBjbGF6eiBUaGUgY2xhc3MgZm9yIHdoaWNoIHRoZSBpbmplY3Rpb24gdG9rZW4gd2FzIHVuYXZhaWxhYmxlLlxuICogQHBhcmFtIGVycm9yIFRoZSByZWFzb24gd2h5IG5vIHZhbGlkIGluamVjdGlvbiB0b2tlbiBpcyBhdmFpbGFibGUuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVVuc3VpdGFibGVJbmplY3Rpb25Ub2tlbkVycm9yKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBlcnJvcjogQ29uc3RydWN0b3JEZXBFcnJvcik6IEZhdGFsRGlhZ25vc3RpY0Vycm9yIHtcbiAgY29uc3Qge3BhcmFtLCBpbmRleCwgcmVhc29ufSA9IGVycm9yO1xuICBsZXQgY2hhaW5NZXNzYWdlOiBzdHJpbmd8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBsZXQgaGludHM6IHRzLkRpYWdub3N0aWNSZWxhdGVkSW5mb3JtYXRpb25bXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHN3aXRjaCAocmVhc29uLmtpbmQpIHtcbiAgICBjYXNlIFZhbHVlVW5hdmFpbGFibGVLaW5kLlVOU1VQUE9SVEVEOlxuICAgICAgY2hhaW5NZXNzYWdlID0gJ0NvbnNpZGVyIHVzaW5nIHRoZSBASW5qZWN0IGRlY29yYXRvciB0byBzcGVjaWZ5IGFuIGluamVjdGlvbiB0b2tlbi4nO1xuICAgICAgaGludHMgPSBbXG4gICAgICAgIG1ha2VSZWxhdGVkSW5mb3JtYXRpb24ocmVhc29uLnR5cGVOb2RlLCAnVGhpcyB0eXBlIGlzIG5vdCBzdXBwb3J0ZWQgYXMgaW5qZWN0aW9uIHRva2VuLicpLFxuICAgICAgXTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgVmFsdWVVbmF2YWlsYWJsZUtpbmQuTk9fVkFMVUVfREVDTEFSQVRJT046XG4gICAgICBjaGFpbk1lc3NhZ2UgPSAnQ29uc2lkZXIgdXNpbmcgdGhlIEBJbmplY3QgZGVjb3JhdG9yIHRvIHNwZWNpZnkgYW4gaW5qZWN0aW9uIHRva2VuLic7XG4gICAgICBoaW50cyA9IFtcbiAgICAgICAgbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihcbiAgICAgICAgICAgIHJlYXNvbi50eXBlTm9kZSxcbiAgICAgICAgICAgICdUaGlzIHR5cGUgZG9lcyBub3QgaGF2ZSBhIHZhbHVlLCBzbyBpdCBjYW5ub3QgYmUgdXNlZCBhcyBpbmplY3Rpb24gdG9rZW4uJyksXG4gICAgICBdO1xuICAgICAgaWYgKHJlYXNvbi5kZWNsICE9PSBudWxsKSB7XG4gICAgICAgIGhpbnRzLnB1c2gobWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihyZWFzb24uZGVjbCwgJ1RoZSB0eXBlIGlzIGRlY2xhcmVkIGhlcmUuJykpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSBWYWx1ZVVuYXZhaWxhYmxlS2luZC5UWVBFX09OTFlfSU1QT1JUOlxuICAgICAgY2hhaW5NZXNzYWdlID1cbiAgICAgICAgICAnQ29uc2lkZXIgY2hhbmdpbmcgdGhlIHR5cGUtb25seSBpbXBvcnQgdG8gYSByZWd1bGFyIGltcG9ydCwgb3IgdXNlIHRoZSBASW5qZWN0IGRlY29yYXRvciB0byBzcGVjaWZ5IGFuIGluamVjdGlvbiB0b2tlbi4nO1xuICAgICAgaGludHMgPSBbXG4gICAgICAgIG1ha2VSZWxhdGVkSW5mb3JtYXRpb24oXG4gICAgICAgICAgICByZWFzb24udHlwZU5vZGUsXG4gICAgICAgICAgICAnVGhpcyB0eXBlIGlzIGltcG9ydGVkIHVzaW5nIGEgdHlwZS1vbmx5IGltcG9ydCwgd2hpY2ggcHJldmVudHMgaXQgZnJvbSBiZWluZyB1c2FibGUgYXMgYW4gaW5qZWN0aW9uIHRva2VuLicpLFxuICAgICAgICBtYWtlUmVsYXRlZEluZm9ybWF0aW9uKHJlYXNvbi5pbXBvcnRDbGF1c2UsICdUaGUgdHlwZS1vbmx5IGltcG9ydCBvY2N1cnMgaGVyZS4nKSxcbiAgICAgIF07XG4gICAgICBicmVhaztcbiAgICBjYXNlIFZhbHVlVW5hdmFpbGFibGVLaW5kLk5BTUVTUEFDRTpcbiAgICAgIGNoYWluTWVzc2FnZSA9ICdDb25zaWRlciB1c2luZyB0aGUgQEluamVjdCBkZWNvcmF0b3IgdG8gc3BlY2lmeSBhbiBpbmplY3Rpb24gdG9rZW4uJztcbiAgICAgIGhpbnRzID0gW1xuICAgICAgICBtYWtlUmVsYXRlZEluZm9ybWF0aW9uKFxuICAgICAgICAgICAgcmVhc29uLnR5cGVOb2RlLFxuICAgICAgICAgICAgJ1RoaXMgdHlwZSBjb3JyZXNwb25kcyB3aXRoIGEgbmFtZXNwYWNlLCB3aGljaCBjYW5ub3QgYmUgdXNlZCBhcyBpbmplY3Rpb24gdG9rZW4uJyksXG4gICAgICAgIG1ha2VSZWxhdGVkSW5mb3JtYXRpb24ocmVhc29uLmltcG9ydENsYXVzZSwgJ1RoZSBuYW1lc3BhY2UgaW1wb3J0IG9jY3VycyBoZXJlLicpLFxuICAgICAgXTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgVmFsdWVVbmF2YWlsYWJsZUtpbmQuVU5LTk9XTl9SRUZFUkVOQ0U6XG4gICAgICBjaGFpbk1lc3NhZ2UgPSAnVGhlIHR5cGUgc2hvdWxkIHJlZmVyZW5jZSBhIGtub3duIGRlY2xhcmF0aW9uLic7XG4gICAgICBoaW50cyA9IFttYWtlUmVsYXRlZEluZm9ybWF0aW9uKHJlYXNvbi50eXBlTm9kZSwgJ1RoaXMgdHlwZSBjb3VsZCBub3QgYmUgcmVzb2x2ZWQuJyldO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBWYWx1ZVVuYXZhaWxhYmxlS2luZC5NSVNTSU5HX1RZUEU6XG4gICAgICBjaGFpbk1lc3NhZ2UgPVxuICAgICAgICAgICdDb25zaWRlciBhZGRpbmcgYSB0eXBlIHRvIHRoZSBwYXJhbWV0ZXIgb3IgdXNlIHRoZSBASW5qZWN0IGRlY29yYXRvciB0byBzcGVjaWZ5IGFuIGluamVjdGlvbiB0b2tlbi4nO1xuICAgICAgYnJlYWs7XG4gIH1cblxuICBjb25zdCBjaGFpbjogdHMuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiA9IHtcbiAgICBtZXNzYWdlVGV4dDogYE5vIHN1aXRhYmxlIGluamVjdGlvbiB0b2tlbiBmb3IgcGFyYW1ldGVyICcke3BhcmFtLm5hbWUgfHwgaW5kZXh9JyBvZiBjbGFzcyAnJHtcbiAgICAgICAgY2xhenoubmFtZS50ZXh0fScuYCxcbiAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgIGNvZGU6IDAsXG4gICAgbmV4dDogW3tcbiAgICAgIG1lc3NhZ2VUZXh0OiBjaGFpbk1lc3NhZ2UsXG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lk1lc3NhZ2UsXG4gICAgICBjb2RlOiAwLFxuICAgIH1dLFxuICB9O1xuXG4gIHJldHVybiBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoRXJyb3JDb2RlLlBBUkFNX01JU1NJTkdfVE9LRU4sIHBhcmFtLm5hbWVOb2RlLCBjaGFpbiwgaGludHMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9SM1JlZmVyZW5jZShcbiAgICB2YWx1ZVJlZjogUmVmZXJlbmNlLCB0eXBlUmVmOiBSZWZlcmVuY2UsIHZhbHVlQ29udGV4dDogdHMuU291cmNlRmlsZSxcbiAgICB0eXBlQ29udGV4dDogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcik6IFIzUmVmZXJlbmNlIHtcbiAgcmV0dXJuIHtcbiAgICB2YWx1ZTogcmVmRW1pdHRlci5lbWl0KHZhbHVlUmVmLCB2YWx1ZUNvbnRleHQpLmV4cHJlc3Npb24sXG4gICAgdHlwZTogcmVmRW1pdHRlclxuICAgICAgICAgICAgICAuZW1pdCh0eXBlUmVmLCB0eXBlQ29udGV4dCwgSW1wb3J0RmxhZ3MuRm9yY2VOZXdJbXBvcnQgfCBJbXBvcnRGbGFncy5BbGxvd1R5cGVJbXBvcnRzKVxuICAgICAgICAgICAgICAuZXhwcmVzc2lvbixcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBkZWNvcmF0b3IgaXMgRGVjb3JhdG9yJntpbXBvcnQ6IEltcG9ydH0ge1xuICByZXR1cm4gZGVjb3JhdG9yLmltcG9ydCAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQW5ndWxhckNvcmVSZWZlcmVuY2UocmVmZXJlbmNlOiBSZWZlcmVuY2UsIHN5bWJvbE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gcmVmZXJlbmNlLm93bmVkQnlNb2R1bGVHdWVzcyA9PT0gJ0Bhbmd1bGFyL2NvcmUnICYmIHJlZmVyZW5jZS5kZWJ1Z05hbWUgPT09IHN5bWJvbE5hbWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQW5ndWxhckRlY29yYXRvcihcbiAgICBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSwgbmFtZTogc3RyaW5nLCBpc0NvcmU6IGJvb2xlYW4pOiBEZWNvcmF0b3J8dW5kZWZpbmVkIHtcbiAgcmV0dXJuIGRlY29yYXRvcnMuZmluZChkZWNvcmF0b3IgPT4gaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvciwgbmFtZSwgaXNDb3JlKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yOiBEZWNvcmF0b3IsIG5hbWU6IHN0cmluZywgaXNDb3JlOiBib29sZWFuKTogYm9vbGVhbiB7XG4gIGlmIChpc0NvcmUpIHtcbiAgICByZXR1cm4gZGVjb3JhdG9yLm5hbWUgPT09IG5hbWU7XG4gIH0gZWxzZSBpZiAoaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSB7XG4gICAgcmV0dXJuIGRlY29yYXRvci5pbXBvcnQubmFtZSA9PT0gbmFtZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogVW53cmFwIGEgYHRzLkV4cHJlc3Npb25gLCByZW1vdmluZyBvdXRlciB0eXBlLWNhc3RzIG9yIHBhcmVudGhlc2VzIHVudGlsIHRoZSBleHByZXNzaW9uIGlzIGluIGl0c1xuICogbG93ZXN0IGxldmVsIGZvcm0uXG4gKlxuICogRm9yIGV4YW1wbGUsIHRoZSBleHByZXNzaW9uIFwiKGZvbyBhcyBUeXBlKVwiIHVud3JhcHMgdG8gXCJmb29cIi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVud3JhcEV4cHJlc3Npb24obm9kZTogdHMuRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb24ge1xuICB3aGlsZSAodHMuaXNBc0V4cHJlc3Npb24obm9kZSkgfHwgdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlKSkge1xuICAgIG5vZGUgPSBub2RlLmV4cHJlc3Npb247XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZEZvcndhcmRSZWYoYXJnOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgYXJnID0gdW53cmFwRXhwcmVzc2lvbihhcmcpO1xuICBpZiAoIXRzLmlzQXJyb3dGdW5jdGlvbihhcmcpICYmICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihhcmcpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBib2R5ID0gYXJnLmJvZHk7XG4gIC8vIEVpdGhlciB0aGUgYm9keSBpcyBhIHRzLkV4cHJlc3Npb24gZGlyZWN0bHksIG9yIGEgYmxvY2sgd2l0aCBhIHNpbmdsZSByZXR1cm4gc3RhdGVtZW50LlxuICBpZiAodHMuaXNCbG9jayhib2R5KSkge1xuICAgIC8vIEJsb2NrIGJvZHkgLSBsb29rIGZvciBhIHNpbmdsZSByZXR1cm4gc3RhdGVtZW50LlxuICAgIGlmIChib2R5LnN0YXRlbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc3RtdCA9IGJvZHkuc3RhdGVtZW50c1swXTtcbiAgICBpZiAoIXRzLmlzUmV0dXJuU3RhdGVtZW50KHN0bXQpIHx8IHN0bXQuZXhwcmVzc2lvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHN0bXQuZXhwcmVzc2lvbjtcbiAgfSBlbHNlIHtcbiAgICAvLyBTaG9ydGhhbmQgYm9keSAtIHJldHVybiBhcyBhbiBleHByZXNzaW9uLlxuICAgIHJldHVybiBib2R5O1xuICB9XG59XG5cblxuLyoqXG4gKiBJZiB0aGUgZ2l2ZW4gYG5vZGVgIGlzIGEgZm9yd2FyZFJlZigpIGV4cHJlc3Npb24gdGhlbiByZXNvbHZlIGl0cyBpbm5lciB2YWx1ZSwgb3RoZXJ3aXNlIHJldHVyblxuICogYG51bGxgLlxuICpcbiAqIEBwYXJhbSBub2RlIHRoZSBmb3J3YXJkUmVmKCkgZXhwcmVzc2lvbiB0byByZXNvbHZlXG4gKiBAcGFyYW0gcmVmbGVjdG9yIGEgUmVmbGVjdGlvbkhvc3RcbiAqIEByZXR1cm5zIHRoZSByZXNvbHZlZCBleHByZXNzaW9uLCBpZiB0aGUgb3JpZ2luYWwgZXhwcmVzc2lvbiB3YXMgYSBmb3J3YXJkUmVmKCksIG9yIGBudWxsYFxuICogICAgIG90aGVyd2lzZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyeVVud3JhcEZvcndhcmRSZWYobm9kZTogdHMuRXhwcmVzc2lvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IHRzLkV4cHJlc3Npb258XG4gICAgbnVsbCB7XG4gIG5vZGUgPSB1bndyYXBFeHByZXNzaW9uKG5vZGUpO1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgfHwgbm9kZS5hcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBmbiA9XG4gICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24pID8gbm9kZS5leHByZXNzaW9uLm5hbWUgOiBub2RlLmV4cHJlc3Npb247XG4gIGlmICghdHMuaXNJZGVudGlmaWVyKGZuKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgZXhwciA9IGV4cGFuZEZvcndhcmRSZWYobm9kZS5hcmd1bWVudHNbMF0pO1xuICBpZiAoZXhwciA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgaW1wID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcihmbik7XG4gIGlmIChpbXAgPT09IG51bGwgfHwgaW1wLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJyB8fCBpbXAubmFtZSAhPT0gJ2ZvcndhcmRSZWYnKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4gZXhwcjtcbn1cblxuLyoqXG4gKiBBIGZvcmVpZ24gZnVuY3Rpb24gcmVzb2x2ZXIgZm9yIGBzdGF0aWNhbGx5UmVzb2x2ZWAgd2hpY2ggdW53cmFwcyBmb3J3YXJkUmVmKCkgZXhwcmVzc2lvbnMuXG4gKlxuICogQHBhcmFtIHJlZiBhIFJlZmVyZW5jZSB0byB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGZ1bmN0aW9uIGJlaW5nIGNhbGxlZCAod2hpY2ggbWlnaHQgYmVcbiAqIGZvcndhcmRSZWYpXG4gKiBAcGFyYW0gYXJncyB0aGUgYXJndW1lbnRzIHRvIHRoZSBpbnZvY2F0aW9uIG9mIHRoZSBmb3J3YXJkUmVmIGV4cHJlc3Npb25cbiAqIEByZXR1cm5zIGFuIHVud3JhcHBlZCBhcmd1bWVudCBpZiBgcmVmYCBwb2ludGVkIHRvIGZvcndhcmRSZWYsIG9yIG51bGwgb3RoZXJ3aXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3J3YXJkUmVmUmVzb2x2ZXIoXG4gICAgcmVmOiBSZWZlcmVuY2U8dHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkV4cHJlc3Npb24+LFxuICAgIGFyZ3M6IFJlYWRvbmx5QXJyYXk8dHMuRXhwcmVzc2lvbj4pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBpZiAoIWlzQW5ndWxhckNvcmVSZWZlcmVuY2UocmVmLCAnZm9yd2FyZFJlZicpIHx8IGFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIGV4cGFuZEZvcndhcmRSZWYoYXJnc1swXSk7XG59XG5cbi8qKlxuICogQ29tYmluZXMgYW4gYXJyYXkgb2YgcmVzb2x2ZXIgZnVuY3Rpb25zIGludG8gYSBvbmUuXG4gKiBAcGFyYW0gcmVzb2x2ZXJzIFJlc29sdmVycyB0byBiZSBjb21iaW5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmVSZXNvbHZlcnMocmVzb2x2ZXJzOiBGb3JlaWduRnVuY3Rpb25SZXNvbHZlcltdKTogRm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIge1xuICByZXR1cm4gKHJlZjogUmVmZXJlbmNlPHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25FeHByZXNzaW9uPixcbiAgICAgICAgICBhcmdzOiBSZWFkb25seUFycmF5PHRzLkV4cHJlc3Npb24+KTogdHMuRXhwcmVzc2lvbnxudWxsID0+IHtcbiAgICBmb3IgKGNvbnN0IHJlc29sdmVyIG9mIHJlc29sdmVycykge1xuICAgICAgY29uc3QgcmVzb2x2ZWQgPSByZXNvbHZlcihyZWYsIGFyZ3MpO1xuICAgICAgaWYgKHJlc29sdmVkICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKFxuICAgIGV4cHI6IEV4cHJlc3Npb24sIGNvbnRleHQ6IHRzLk5vZGUsIGNvbnRleHRTb3VyY2U6IHRzLlNvdXJjZUZpbGUpOiBib29sZWFuIHtcbiAgaWYgKGlzV3JhcHBlZFRzTm9kZUV4cHIoZXhwcikpIHtcbiAgICBjb25zdCBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKGV4cHIubm9kZSk7XG4gICAgcmV0dXJuIG5vZGUuZ2V0U291cmNlRmlsZSgpID09PSBjb250ZXh0U291cmNlICYmIGNvbnRleHQucG9zIDwgbm9kZS5wb3M7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1dyYXBwZWRUc05vZGVFeHByKGV4cHI6IEV4cHJlc3Npb24pOiBleHByIGlzIFdyYXBwZWROb2RlRXhwcjx0cy5Ob2RlPiB7XG4gIHJldHVybiBleHByIGluc3RhbmNlb2YgV3JhcHBlZE5vZGVFeHByO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEJhc2VDbGFzcyhcbiAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPnwnZHluYW1pYyd8bnVsbCB7XG4gIGNvbnN0IGJhc2VFeHByZXNzaW9uID0gcmVmbGVjdG9yLmdldEJhc2VDbGFzc0V4cHJlc3Npb24obm9kZSk7XG4gIGlmIChiYXNlRXhwcmVzc2lvbiAhPT0gbnVsbCkge1xuICAgIGNvbnN0IGJhc2VDbGFzcyA9IGV2YWx1YXRvci5ldmFsdWF0ZShiYXNlRXhwcmVzc2lvbik7XG4gICAgaWYgKGJhc2VDbGFzcyBpbnN0YW5jZW9mIFJlZmVyZW5jZSAmJiByZWZsZWN0b3IuaXNDbGFzcyhiYXNlQ2xhc3Mubm9kZSkpIHtcbiAgICAgIHJldHVybiBiYXNlQ2xhc3MgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJ2R5bmFtaWMnO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5jb25zdCBwYXJlbnNXcmFwcGVyVHJhbnNmb3JtZXJGYWN0b3J5OiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuRXhwcmVzc2lvbj4gPVxuICAgIChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpID0+IHtcbiAgICAgIGNvbnN0IHZpc2l0b3I6IHRzLlZpc2l0b3IgPSAobm9kZTogdHMuTm9kZSk6IHRzLk5vZGUgPT4ge1xuICAgICAgICBjb25zdCB2aXNpdGVkID0gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgdmlzaXRvciwgY29udGV4dCk7XG4gICAgICAgIGlmICh0cy5pc0Fycm93RnVuY3Rpb24odmlzaXRlZCkgfHwgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24odmlzaXRlZCkpIHtcbiAgICAgICAgICByZXR1cm4gdHMuY3JlYXRlUGFyZW4odmlzaXRlZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZpc2l0ZWQ7XG4gICAgICB9O1xuICAgICAgcmV0dXJuIChub2RlOiB0cy5FeHByZXNzaW9uKSA9PiB0cy52aXNpdEVhY2hDaGlsZChub2RlLCB2aXNpdG9yLCBjb250ZXh0KTtcbiAgICB9O1xuXG4vKipcbiAqIFdyYXBzIGFsbCBmdW5jdGlvbnMgaW4gYSBnaXZlbiBleHByZXNzaW9uIGluIHBhcmVudGhlc2VzLiBUaGlzIGlzIG5lZWRlZCB0byBhdm9pZCBwcm9ibGVtc1xuICogd2hlcmUgVHNpY2tsZSBhbm5vdGF0aW9ucyBhZGRlZCBiZXR3ZWVuIGFuYWx5c2UgYW5kIHRyYW5zZm9ybSBwaGFzZXMgaW4gQW5ndWxhciBtYXkgdHJpZ2dlclxuICogYXV0b21hdGljIHNlbWljb2xvbiBpbnNlcnRpb24sIGUuZy4gaWYgYSBmdW5jdGlvbiBpcyB0aGUgZXhwcmVzc2lvbiBpbiBhIGByZXR1cm5gIHN0YXRlbWVudC5cbiAqIE1vcmVcbiAqIGluZm8gY2FuIGJlIGZvdW5kIGluIFRzaWNrbGUgc291cmNlIGNvZGUgaGVyZTpcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL3RzaWNrbGUvYmxvYi9kNzk3NDI2MjU3MWM4YTE3ZDY4NGU1YmEwNzY4MGUxYjE5OTNhZmRkL3NyYy9qc2RvY190cmFuc2Zvcm1lci50cyNMMTAyMVxuICpcbiAqIEBwYXJhbSBleHByZXNzaW9uIEV4cHJlc3Npb24gd2hlcmUgZnVuY3Rpb25zIHNob3VsZCBiZSB3cmFwcGVkIGluIHBhcmVudGhlc2VzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uIHtcbiAgcmV0dXJuIHRzLnRyYW5zZm9ybShleHByZXNzaW9uLCBbcGFyZW5zV3JhcHBlclRyYW5zZm9ybWVyRmFjdG9yeV0pLnRyYW5zZm9ybWVkWzBdO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGB0cy5EaWFnbm9zdGljYCB3aGljaCBpbmRpY2F0ZXMgdGhlIGdpdmVuIGNsYXNzIGlzIHBhcnQgb2YgdGhlIGRlY2xhcmF0aW9ucyBvZiB0d28gb3JcbiAqIG1vcmUgTmdNb2R1bGVzLlxuICpcbiAqIFRoZSByZXN1bHRpbmcgYHRzLkRpYWdub3N0aWNgIHdpbGwgaGF2ZSBhIGNvbnRleHQgZW50cnkgZm9yIGVhY2ggTmdNb2R1bGUgc2hvd2luZyB0aGUgcG9pbnQgd2hlcmVcbiAqIHRoZSBkaXJlY3RpdmUvcGlwZSBleGlzdHMgaW4gaXRzIGBkZWNsYXJhdGlvbnNgIChpZiBwb3NzaWJsZSkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlRHVwbGljYXRlRGVjbGFyYXRpb25FcnJvcihcbiAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkYXRhOiBEZWNsYXJhdGlvbkRhdGFbXSwga2luZDogc3RyaW5nKTogdHMuRGlhZ25vc3RpYyB7XG4gIGNvbnN0IGNvbnRleHQ6IHRzLkRpYWdub3N0aWNSZWxhdGVkSW5mb3JtYXRpb25bXSA9IFtdO1xuICBmb3IgKGNvbnN0IGRlY2wgb2YgZGF0YSkge1xuICAgIGlmIChkZWNsLnJhd0RlY2xhcmF0aW9ucyA9PT0gbnVsbCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIC8vIFRyeSB0byBmaW5kIHRoZSByZWZlcmVuY2UgdG8gdGhlIGRlY2xhcmF0aW9uIHdpdGhpbiB0aGUgZGVjbGFyYXRpb25zIGFycmF5LCB0byBoYW5nIHRoZVxuICAgIC8vIGVycm9yIHRoZXJlLiBJZiBpdCBjYW4ndCBiZSBmb3VuZCwgZmFsbCBiYWNrIG9uIHVzaW5nIHRoZSBOZ01vZHVsZSdzIG5hbWUuXG4gICAgY29uc3QgY29udGV4dE5vZGUgPSBkZWNsLnJlZi5nZXRPcmlnaW5Gb3JEaWFnbm9zdGljcyhkZWNsLnJhd0RlY2xhcmF0aW9ucywgZGVjbC5uZ01vZHVsZS5uYW1lKTtcbiAgICBjb250ZXh0LnB1c2gobWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihcbiAgICAgICAgY29udGV4dE5vZGUsXG4gICAgICAgIGAnJHtub2RlLm5hbWUudGV4dH0nIGlzIGxpc3RlZCBpbiB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBOZ01vZHVsZSAnJHtcbiAgICAgICAgICAgIGRlY2wubmdNb2R1bGUubmFtZS50ZXh0fScuYCkpO1xuICB9XG5cbiAgLy8gRmluYWxseSwgcHJvZHVjZSB0aGUgZGlhZ25vc3RpYy5cbiAgcmV0dXJuIG1ha2VEaWFnbm9zdGljKFxuICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX0RFQ0xBUkFUSU9OX05PVF9VTklRVUUsIG5vZGUubmFtZSxcbiAgICAgIGBUaGUgJHtraW5kfSAnJHtub2RlLm5hbWUudGV4dH0nIGlzIGRlY2xhcmVkIGJ5IG1vcmUgdGhhbiBvbmUgTmdNb2R1bGUuYCwgY29udGV4dCk7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIGdpdmVuIGByYXdQcm92aWRlcnNgIGludG8gYENsYXNzRGVjbGFyYXRpb25zYCBhbmQgcmV0dXJuc1xuICogYSBzZXQgY29udGFpbmluZyB0aG9zZSB0aGF0IGFyZSBrbm93biB0byByZXF1aXJlIGEgZmFjdG9yeSBkZWZpbml0aW9uLlxuICogQHBhcmFtIHJhd1Byb3ZpZGVycyBFeHByZXNzaW9uIHRoYXQgZGVjbGFyZWQgdGhlIHByb3ZpZGVycyBhcnJheSBpbiB0aGUgc291cmNlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkoXG4gICAgcmF3UHJvdmlkZXJzOiB0cy5FeHByZXNzaW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IFNldDxSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+IHtcbiAgY29uc3QgcHJvdmlkZXJzID0gbmV3IFNldDxSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+KCk7XG4gIGNvbnN0IHJlc29sdmVkUHJvdmlkZXJzID0gZXZhbHVhdG9yLmV2YWx1YXRlKHJhd1Byb3ZpZGVycyk7XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHJlc29sdmVkUHJvdmlkZXJzKSkge1xuICAgIHJldHVybiBwcm92aWRlcnM7XG4gIH1cblxuICByZXNvbHZlZFByb3ZpZGVycy5mb3JFYWNoKGZ1bmN0aW9uIHByb2Nlc3NQcm92aWRlcnMocHJvdmlkZXIpIHtcbiAgICBsZXQgdG9rZW5DbGFzczogUmVmZXJlbmNlfG51bGwgPSBudWxsO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkocHJvdmlkZXIpKSB7XG4gICAgICAvLyBJZiB3ZSByYW4gaW50byBhbiBhcnJheSwgcmVjdXJzZSBpbnRvIGl0IHVudGlsIHdlJ3ZlIHJlc29sdmUgYWxsIHRoZSBjbGFzc2VzLlxuICAgICAgcHJvdmlkZXIuZm9yRWFjaChwcm9jZXNzUHJvdmlkZXJzKTtcbiAgICB9IGVsc2UgaWYgKHByb3ZpZGVyIGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgICB0b2tlbkNsYXNzID0gcHJvdmlkZXI7XG4gICAgfSBlbHNlIGlmIChwcm92aWRlciBpbnN0YW5jZW9mIE1hcCAmJiBwcm92aWRlci5oYXMoJ3VzZUNsYXNzJykgJiYgIXByb3ZpZGVyLmhhcygnZGVwcycpKSB7XG4gICAgICBjb25zdCB1c2VFeGlzdGluZyA9IHByb3ZpZGVyLmdldCgndXNlQ2xhc3MnKSE7XG4gICAgICBpZiAodXNlRXhpc3RpbmcgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgICAgdG9rZW5DbGFzcyA9IHVzZUV4aXN0aW5nO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhlcmUgd2FzIGEgYnVnIHdoZXJlIGBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnNgIHdvdWxkIHJldHVybiBgbnVsbGAgZm9yIGFcbiAgICAvLyBjbGFzcyBpbiBhIC5kLnRzIGZpbGUsIGFsd2F5cywgZXZlbiBpZiB0aGUgY2xhc3MgaGFkIGEgY29uc3RydWN0b3IuIFRoaXMgd2FzIGZpeGVkIGZvclxuICAgIC8vIGBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnNgLCBidXQgdGhhdCBmaXggY2F1c2VzIG1vcmUgY2xhc3NlcyB0byBiZSByZWNvZ25pemVkIGhlcmUgYXMgbmVlZGluZ1xuICAgIC8vIHByb3ZpZGVyIGNoZWNrcywgd2hpY2ggaXMgYSBicmVha2luZyBjaGFuZ2UgaW4gZzMuIEF2b2lkIHRoaXMgYnJlYWthZ2UgZm9yIG5vdyBieSBza2lwcGluZ1xuICAgIC8vIGNsYXNzZXMgZnJvbSAuZC50cyBmaWxlcyBoZXJlIGRpcmVjdGx5LCB1bnRpbCBnMyBjYW4gYmUgY2xlYW5lZCB1cC5cbiAgICBpZiAodG9rZW5DbGFzcyAhPT0gbnVsbCAmJiAhdG9rZW5DbGFzcy5ub2RlLmdldFNvdXJjZUZpbGUoKS5pc0RlY2xhcmF0aW9uRmlsZSAmJlxuICAgICAgICByZWZsZWN0b3IuaXNDbGFzcyh0b2tlbkNsYXNzLm5vZGUpKSB7XG4gICAgICBjb25zdCBjb25zdHJ1Y3RvclBhcmFtZXRlcnMgPSByZWZsZWN0b3IuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKHRva2VuQ2xhc3Mubm9kZSk7XG5cbiAgICAgIC8vIE5vdGUgdGhhdCB3ZSBvbmx5IHdhbnQgdG8gY2FwdHVyZSBwcm92aWRlcnMgd2l0aCBhIG5vbi10cml2aWFsIGNvbnN0cnVjdG9yLFxuICAgICAgLy8gYmVjYXVzZSB0aGV5J3JlIHRoZSBvbmVzIHRoYXQgbWlnaHQgYmUgdXNpbmcgREkgYW5kIG5lZWQgdG8gYmUgZGVjb3JhdGVkLlxuICAgICAgaWYgKGNvbnN0cnVjdG9yUGFyYW1ldGVycyAhPT0gbnVsbCAmJiBjb25zdHJ1Y3RvclBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICBwcm92aWRlcnMuYWRkKHRva2VuQ2xhc3MgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBwcm92aWRlcnM7XG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIFIzUmVmZXJlbmNlIGZvciBhIGNsYXNzLlxuICpcbiAqIFRoZSBgdmFsdWVgIGlzIHRoZSBleHBvcnRlZCBkZWNsYXJhdGlvbiBvZiB0aGUgY2xhc3MgZnJvbSBpdHMgc291cmNlIGZpbGUuXG4gKiBUaGUgYHR5cGVgIGlzIGFuIGV4cHJlc3Npb24gdGhhdCB3b3VsZCBiZSB1c2VkIGJ5IG5nY2MgaW4gdGhlIHR5cGluZ3MgKC5kLnRzKSBmaWxlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyYXBUeXBlUmVmZXJlbmNlKHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogUjNSZWZlcmVuY2Uge1xuICBjb25zdCBkdHNDbGFzcyA9IHJlZmxlY3Rvci5nZXREdHNEZWNsYXJhdGlvbihjbGF6eik7XG4gIGNvbnN0IHZhbHVlID0gbmV3IFdyYXBwZWROb2RlRXhwcihjbGF6ei5uYW1lKTtcbiAgY29uc3QgdHlwZSA9IGR0c0NsYXNzICE9PSBudWxsICYmIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGR0c0NsYXNzKSA/XG4gICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKGR0c0NsYXNzLm5hbWUpIDpcbiAgICAgIHZhbHVlO1xuICByZXR1cm4ge3ZhbHVlLCB0eXBlfTtcbn1cblxuLyoqIENyZWF0ZXMgYSBQYXJzZVNvdXJjZVNwYW4gZm9yIGEgVHlwZVNjcmlwdCBub2RlLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNvdXJjZVNwYW4obm9kZTogdHMuTm9kZSk6IFBhcnNlU291cmNlU3BhbiB7XG4gIGNvbnN0IHNmID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gIGNvbnN0IFtzdGFydE9mZnNldCwgZW5kT2Zmc2V0XSA9IFtub2RlLmdldFN0YXJ0KCksIG5vZGUuZ2V0RW5kKCldO1xuICBjb25zdCB7bGluZTogc3RhcnRMaW5lLCBjaGFyYWN0ZXI6IHN0YXJ0Q29sfSA9IHNmLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKHN0YXJ0T2Zmc2V0KTtcbiAgY29uc3Qge2xpbmU6IGVuZExpbmUsIGNoYXJhY3RlcjogZW5kQ29sfSA9IHNmLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKGVuZE9mZnNldCk7XG4gIGNvbnN0IHBhcnNlU2YgPSBuZXcgUGFyc2VTb3VyY2VGaWxlKHNmLmdldEZ1bGxUZXh0KCksIHNmLmZpbGVOYW1lKTtcblxuICAvLyArMSBiZWNhdXNlIHZhbHVlcyBhcmUgemVyby1pbmRleGVkLlxuICByZXR1cm4gbmV3IFBhcnNlU291cmNlU3BhbihcbiAgICAgIG5ldyBQYXJzZUxvY2F0aW9uKHBhcnNlU2YsIHN0YXJ0T2Zmc2V0LCBzdGFydExpbmUgKyAxLCBzdGFydENvbCArIDEpLFxuICAgICAgbmV3IFBhcnNlTG9jYXRpb24ocGFyc2VTZiwgZW5kT2Zmc2V0LCBlbmRMaW5lICsgMSwgZW5kQ29sICsgMSkpO1xufVxuXG4vKipcbiAqIENvbGxhdGUgdGhlIGZhY3RvcnkgYW5kIGRlZmluaXRpb24gY29tcGlsZWQgcmVzdWx0cyBpbnRvIGFuIGFycmF5IG9mIENvbXBpbGVSZXN1bHQgb2JqZWN0cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGVSZXN1bHRzKFxuICAgIGZhYzogQ29tcGlsZVJlc3VsdCwgZGVmOiBSM0NvbXBpbGVkRXhwcmVzc2lvbiwgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbCxcbiAgICBwcm9wTmFtZTogc3RyaW5nKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgY29uc3Qgc3RhdGVtZW50cyA9IGRlZi5zdGF0ZW1lbnRzO1xuICBpZiAobWV0YWRhdGFTdG10ICE9PSBudWxsKSB7XG4gICAgc3RhdGVtZW50cy5wdXNoKG1ldGFkYXRhU3RtdCk7XG4gIH1cbiAgcmV0dXJuIFtcbiAgICBmYWMsIHtcbiAgICAgIG5hbWU6IHByb3BOYW1lLFxuICAgICAgaW5pdGlhbGl6ZXI6IGRlZi5leHByZXNzaW9uLFxuICAgICAgc3RhdGVtZW50czogZGVmLnN0YXRlbWVudHMsXG4gICAgICB0eXBlOiBkZWYudHlwZSxcbiAgICB9XG4gIF07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b0ZhY3RvcnlNZXRhZGF0YShcbiAgICBtZXRhOiBPbWl0PFIzRmFjdG9yeU1ldGFkYXRhLCAndGFyZ2V0Jz4sIHRhcmdldDogRmFjdG9yeVRhcmdldCk6IFIzRmFjdG9yeU1ldGFkYXRhIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBtZXRhLm5hbWUsXG4gICAgdHlwZTogbWV0YS50eXBlLFxuICAgIGludGVybmFsVHlwZTogbWV0YS5pbnRlcm5hbFR5cGUsXG4gICAgdHlwZUFyZ3VtZW50Q291bnQ6IG1ldGEudHlwZUFyZ3VtZW50Q291bnQsXG4gICAgZGVwczogbWV0YS5kZXBzLFxuICAgIHRhcmdldFxuICB9O1xufVxuIl19