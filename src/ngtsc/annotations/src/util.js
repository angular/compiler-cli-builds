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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/util", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/imports/src/default", "@angular/compiler-cli/src/ngtsc/reflection"], factory);
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
    var default_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/default");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    function getConstructorDependencies(clazz, reflector, isCore) {
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
            var token = valueReferenceToExpression(param.typeValueReference);
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
    function valueReferenceToExpression(valueRef) {
        var e_1, _a;
        if (valueRef.kind === 2 /* UNAVAILABLE */) {
            return null;
        }
        else if (valueRef.kind === 0 /* LOCAL */) {
            var expr = new compiler_1.WrappedNodeExpr(valueRef.expression);
            if (valueRef.defaultImportStatement !== null) {
                (0, default_1.attachDefaultImportDeclaration)(expr, valueRef.defaultImportStatement);
            }
            return expr;
        }
        else {
            var importExpr = new compiler_1.ExternalExpr({ moduleName: valueRef.moduleName, name: valueRef.importedName });
            if (valueRef.nestedPath !== null) {
                try {
                    for (var _b = (0, tslib_1.__values)(valueRef.nestedPath), _c = _b.next(); !_c.done; _c = _b.next()) {
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
    function getValidConstructorDependencies(clazz, reflector, isCore) {
        return validateConstructorDependencies(clazz, getConstructorDependencies(clazz, reflector, isCore));
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
                    (0, diagnostics_1.makeRelatedInformation)(reason.typeNode, 'This type is not supported as injection token.'),
                ];
                break;
            case 1 /* NO_VALUE_DECLARATION */:
                chainMessage = 'Consider using the @Inject decorator to specify an injection token.';
                hints = [
                    (0, diagnostics_1.makeRelatedInformation)(reason.typeNode, 'This type does not have a value, so it cannot be used as injection token.'),
                ];
                if (reason.decl !== null) {
                    hints.push((0, diagnostics_1.makeRelatedInformation)(reason.decl, 'The type is declared here.'));
                }
                break;
            case 2 /* TYPE_ONLY_IMPORT */:
                chainMessage =
                    'Consider changing the type-only import to a regular import, or use the @Inject decorator to specify an injection token.';
                hints = [
                    (0, diagnostics_1.makeRelatedInformation)(reason.typeNode, 'This type is imported using a type-only import, which prevents it from being usable as an injection token.'),
                    (0, diagnostics_1.makeRelatedInformation)(reason.importClause, 'The type-only import occurs here.'),
                ];
                break;
            case 4 /* NAMESPACE */:
                chainMessage = 'Consider using the @Inject decorator to specify an injection token.';
                hints = [
                    (0, diagnostics_1.makeRelatedInformation)(reason.typeNode, 'This type corresponds with a namespace, which cannot be used as injection token.'),
                    (0, diagnostics_1.makeRelatedInformation)(reason.importClause, 'The namespace import occurs here.'),
                ];
                break;
            case 3 /* UNKNOWN_REFERENCE */:
                chainMessage = 'The type should reference a known declaration.';
                hints = [(0, diagnostics_1.makeRelatedInformation)(reason.typeNode, 'This type could not be resolved.')];
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
                for (var resolvers_1 = (0, tslib_1.__values)(resolvers), resolvers_1_1 = resolvers_1.next(); !resolvers_1_1.done; resolvers_1_1 = resolvers_1.next()) {
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
            for (var data_1 = (0, tslib_1.__values)(data), data_1_1 = data_1.next(); !data_1_1.done; data_1_1 = data_1.next()) {
                var decl = data_1_1.value;
                if (decl.rawDeclarations === null) {
                    continue;
                }
                // Try to find the reference to the declaration within the declarations array, to hang the
                // error there. If it can't be found, fall back on using the NgModule's name.
                var contextNode = decl.ref.getOriginForDiagnostics(decl.rawDeclarations, decl.ngModule.name);
                context.push((0, diagnostics_1.makeRelatedInformation)(contextNode, "'" + node.name.text + "' is listed in the declarations of the NgModule '" + decl.ngModule.name.text + "'."));
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
        return (0, diagnostics_1.makeDiagnostic)(diagnostics_1.ErrorCode.NGMODULE_DECLARATION_NOT_UNIQUE, node.name, "The " + kind + " '" + node.name.text + "' is declared by more than one NgModule.", context);
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
        var type = dtsClass !== null && (0, reflection_1.isNamedClassDeclaration)(dtsClass) ?
            new compiler_1.WrappedNodeExpr(dtsClass.name) :
            value;
        return { value: value, type: type };
    }
    exports.wrapTypeReference = wrapTypeReference;
    /** Creates a ParseSourceSpan for a TypeScript node. */
    function createSourceSpan(node) {
        var sf = node.getSourceFile();
        var _a = (0, tslib_1.__read)([node.getStart(), node.getEnd()], 2), startOffset = _a[0], endOffset = _a[1];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUE0TjtJQUc1TiwrQkFBaUM7SUFFakMsMkVBQTBHO0lBQzFHLG1FQUF1RTtJQUN2RSwrRUFBeUU7SUFFekUseUVBQXNRO0lBaUJ0USxTQUFnQiwwQkFBMEIsQ0FDdEMsS0FBdUIsRUFBRSxTQUF5QixFQUFFLE1BQWU7UUFDckUsSUFBTSxJQUFJLEdBQTJCLEVBQUUsQ0FBQztRQUN4QyxJQUFNLE1BQU0sR0FBMEIsRUFBRSxDQUFDO1FBQ3pDLElBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzRCxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7WUFDdkIsSUFBSSxTQUFTLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNqQyxPQUFPLElBQUksQ0FBQzthQUNiO2lCQUFNO2dCQUNMLFVBQVUsR0FBRyxFQUFFLENBQUM7YUFDakI7U0FDRjtRQUNELFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQyxLQUFLLEVBQUUsR0FBRztZQUM1QixJQUFJLEtBQUssR0FBRywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUNqRSxJQUFJLGlCQUFpQixHQUFvQixJQUFJLENBQUM7WUFDOUMsSUFBSSxRQUFRLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxLQUFLLEVBQUUsUUFBUSxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsS0FBSyxDQUFDO1lBRW5FLENBQUMsS0FBSyxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxN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RUFBRSxPQUFPLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFYRCw0Q0FXQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsY0FBYyxDQUMxQixHQUFrQixFQUFFLEdBQXlCLEVBQUUsWUFBNEIsRUFDM0UsUUFBZ0I7UUFDbEIsSUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQztRQUNsQyxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUU7WUFDekIsVUFBVSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUMvQjtRQUNELE9BQU87WUFDTCxHQUFHLEVBQUU7Z0JBQ0gsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxVQUFVO2dCQUMzQixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVU7Z0JBQzFCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTthQUNmO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUFmRCx3Q0FlQztJQUVELFNBQWdCLGlCQUFpQixDQUM3QixJQUF1QyxFQUFFLE1BQXFCO1FBQ2hFLE9BQU87WUFDTCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtZQUN6QyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixNQUFNLFFBQUE7U0FDUCxDQUFDO0lBQ0osQ0FBQztJQVZELDhDQVVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBMaXRlcmFsRXhwciwgUGFyc2VMb2NhdGlvbiwgUGFyc2VTb3VyY2VGaWxlLCBQYXJzZVNvdXJjZVNwYW4sIFIzQ29tcGlsZWRFeHByZXNzaW9uLCBSM0RlcGVuZGVuY3lNZXRhZGF0YSwgUjNSZWZlcmVuY2UsIFJlYWRQcm9wRXhwciwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7UjNGYWN0b3J5TWV0YWRhdGF9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9jb21waWxlcic7XG5pbXBvcnQge0ZhY3RvcnlUYXJnZXR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9yZW5kZXIzL3BhcnRpYWwvYXBpJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3IsIG1ha2VEaWFnbm9zdGljLCBtYWtlUmVsYXRlZEluZm9ybWF0aW9ufSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ltcG9ydEZsYWdzLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHthdHRhY2hEZWZhdWx0SW1wb3J0RGVjbGFyYXRpb259IGZyb20gJy4uLy4uL2ltcG9ydHMvc3JjL2RlZmF1bHQnO1xuaW1wb3J0IHtGb3JlaWduRnVuY3Rpb25SZXNvbHZlciwgUGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBDdG9yUGFyYW1ldGVyLCBEZWNvcmF0b3IsIEltcG9ydCwgSW1wb3J0ZWRUeXBlVmFsdWVSZWZlcmVuY2UsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBMb2NhbFR5cGVWYWx1ZVJlZmVyZW5jZSwgUmVmbGVjdGlvbkhvc3QsIFR5cGVWYWx1ZVJlZmVyZW5jZSwgVHlwZVZhbHVlUmVmZXJlbmNlS2luZCwgVW5hdmFpbGFibGVWYWx1ZSwgVmFsdWVVbmF2YWlsYWJsZUtpbmR9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtEZWNsYXJhdGlvbkRhdGF9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7Q29tcGlsZVJlc3VsdH0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuZXhwb3J0IHR5cGUgQ29uc3RydWN0b3JEZXBzID0ge1xuICBkZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdO1xufXx7XG4gIGRlcHM6IG51bGw7XG4gIGVycm9yczogQ29uc3RydWN0b3JEZXBFcnJvcltdO1xufTtcblxuZXhwb3J0IGludGVyZmFjZSBDb25zdHJ1Y3RvckRlcEVycm9yIHtcbiAgaW5kZXg6IG51bWJlcjtcbiAgcGFyYW06IEN0b3JQYXJhbWV0ZXI7XG4gIHJlYXNvbjogVW5hdmFpbGFibGVWYWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBpc0NvcmU6IGJvb2xlYW4pOiBDb25zdHJ1Y3RvckRlcHN8bnVsbCB7XG4gIGNvbnN0IGRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW10gPSBbXTtcbiAgY29uc3QgZXJyb3JzOiBDb25zdHJ1Y3RvckRlcEVycm9yW10gPSBbXTtcbiAgbGV0IGN0b3JQYXJhbXMgPSByZWZsZWN0b3IuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6KTtcbiAgaWYgKGN0b3JQYXJhbXMgPT09IG51bGwpIHtcbiAgICBpZiAocmVmbGVjdG9yLmhhc0Jhc2VDbGFzcyhjbGF6eikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBjdG9yUGFyYW1zID0gW107XG4gICAgfVxuICB9XG4gIGN0b3JQYXJhbXMuZm9yRWFjaCgocGFyYW0sIGlkeCkgPT4ge1xuICAgIGxldCB0b2tlbiA9IHZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uKHBhcmFtLnR5cGVWYWx1ZVJlZmVyZW5jZSk7XG4gICAgbGV0IGF0dHJpYnV0ZU5hbWVUeXBlOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGxldCBvcHRpb25hbCA9IGZhbHNlLCBzZWxmID0gZmFsc2UsIHNraXBTZWxmID0gZmFsc2UsIGhvc3QgPSBmYWxzZTtcblxuICAgIChwYXJhbS5kZWNvcmF0b3JzIHx8IFtdKS5maWx0ZXIoZGVjID0+IGlzQ29yZSB8fCBpc0FuZ3VsYXJDb3JlKGRlYykpLmZvckVhY2goZGVjID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSBpc0NvcmUgfHwgZGVjLmltcG9ydCA9PT0gbnVsbCA/IGRlYy5uYW1lIDogZGVjLmltcG9ydCEubmFtZTtcbiAgICAgIGlmIChuYW1lID09PSAnSW5qZWN0Jykge1xuICAgICAgICBpZiAoZGVjLmFyZ3MgPT09IG51bGwgfHwgZGVjLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlYyksXG4gICAgICAgICAgICAgIGBVbmV4cGVjdGVkIG51bWJlciBvZiBhcmd1bWVudHMgdG8gQEluamVjdCgpLmApO1xuICAgICAgICB9XG4gICAgICAgIHRva2VuID0gbmV3IFdyYXBwZWROb2RlRXhwcihkZWMuYXJnc1swXSk7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdPcHRpb25hbCcpIHtcbiAgICAgICAgb3B0aW9uYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnU2tpcFNlbGYnKSB7XG4gICAgICAgIHNraXBTZWxmID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ1NlbGYnKSB7XG4gICAgICAgIHNlbGYgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnSG9zdCcpIHtcbiAgICAgICAgaG9zdCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdBdHRyaWJ1dGUnKSB7XG4gICAgICAgIGlmIChkZWMuYXJncyA9PT0gbnVsbCB8fCBkZWMuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjKSxcbiAgICAgICAgICAgICAgYFVuZXhwZWN0ZWQgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAQXR0cmlidXRlKCkuYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYXR0cmlidXRlTmFtZSA9IGRlYy5hcmdzWzBdO1xuICAgICAgICB0b2tlbiA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoYXR0cmlidXRlTmFtZSk7XG4gICAgICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWxMaWtlKGF0dHJpYnV0ZU5hbWUpKSB7XG4gICAgICAgICAgYXR0cmlidXRlTmFtZVR5cGUgPSBuZXcgTGl0ZXJhbEV4cHIoYXR0cmlidXRlTmFtZS50ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhdHRyaWJ1dGVOYW1lVHlwZSA9XG4gICAgICAgICAgICAgIG5ldyBXcmFwcGVkTm9kZUV4cHIodHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuVW5rbm93bktleXdvcmQpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9VTkVYUEVDVEVELCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlYyksXG4gICAgICAgICAgICBgVW5leHBlY3RlZCBkZWNvcmF0b3IgJHtuYW1lfSBvbiBwYXJhbWV0ZXIuYCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAodG9rZW4gPT09IG51bGwpIHtcbiAgICAgIGlmIChwYXJhbS50eXBlVmFsdWVSZWZlcmVuY2Uua2luZCAhPT0gVHlwZVZhbHVlUmVmZXJlbmNlS2luZC5VTkFWQUlMQUJMRSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAnSWxsZWdhbCBzdGF0ZTogZXhwZWN0ZWQgdmFsdWUgcmVmZXJlbmNlIHRvIGJlIHVuYXZhaWxhYmxlIGlmIG5vIHRva2VuIGlzIHByZXNlbnQnKTtcbiAgICAgIH1cbiAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgaW5kZXg6IGlkeCxcbiAgICAgICAgcGFyYW0sXG4gICAgICAgIHJlYXNvbjogcGFyYW0udHlwZVZhbHVlUmVmZXJlbmNlLnJlYXNvbixcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZXBzLnB1c2goe3Rva2VuLCBhdHRyaWJ1dGVOYW1lVHlwZSwgb3B0aW9uYWwsIHNlbGYsIHNraXBTZWxmLCBob3N0fSk7XG4gICAgfVxuICB9KTtcbiAgaWYgKGVycm9ycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge2RlcHN9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7ZGVwczogbnVsbCwgZXJyb3JzfTtcbiAgfVxufVxuXG4vKipcbiAqIENvbnZlcnQgYSBgVHlwZVZhbHVlUmVmZXJlbmNlYCB0byBhbiBgRXhwcmVzc2lvbmAgd2hpY2ggcmVmZXJzIHRvIHRoZSB0eXBlIGFzIGEgdmFsdWUuXG4gKlxuICogTG9jYWwgcmVmZXJlbmNlcyBhcmUgY29udmVydGVkIHRvIGEgYFdyYXBwZWROb2RlRXhwcmAgb2YgdGhlIFR5cGVTY3JpcHQgZXhwcmVzc2lvbiwgYW5kIG5vbi1sb2NhbFxuICogcmVmZXJlbmNlcyBhcmUgY29udmVydGVkIHRvIGFuIGBFeHRlcm5hbEV4cHJgLiBOb3RlIHRoYXQgdGhpcyBpcyBvbmx5IHZhbGlkIGluIHRoZSBjb250ZXh0IG9mIHRoZVxuICogZmlsZSBpbiB3aGljaCB0aGUgYFR5cGVWYWx1ZVJlZmVyZW5jZWAgb3JpZ2luYXRlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbHVlUmVmZXJlbmNlVG9FeHByZXNzaW9uKHZhbHVlUmVmOiBMb2NhbFR5cGVWYWx1ZVJlZmVyZW5jZXxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJbXBvcnRlZFR5cGVWYWx1ZVJlZmVyZW5jZSk6IEV4cHJlc3Npb247XG5leHBvcnQgZnVuY3Rpb24gdmFsdWVSZWZlcmVuY2VUb0V4cHJlc3Npb24odmFsdWVSZWY6IFR5cGVWYWx1ZVJlZmVyZW5jZSk6IEV4cHJlc3Npb258bnVsbDtcbmV4cG9ydCBmdW5jdGlvbiB2YWx1ZVJlZmVyZW5jZVRvRXhwcmVzc2lvbih2YWx1ZVJlZjogVHlwZVZhbHVlUmVmZXJlbmNlKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKHZhbHVlUmVmLmtpbmQgPT09IFR5cGVWYWx1ZVJlZmVyZW5jZUtpbmQuVU5BVkFJTEFCTEUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIGlmICh2YWx1ZVJlZi5raW5kID09PSBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLkxPQ0FMKSB7XG4gICAgY29uc3QgZXhwciA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodmFsdWVSZWYuZXhwcmVzc2lvbik7XG4gICAgaWYgKHZhbHVlUmVmLmRlZmF1bHRJbXBvcnRTdGF0ZW1lbnQgIT09IG51bGwpIHtcbiAgICAgIGF0dGFjaERlZmF1bHRJbXBvcnREZWNsYXJhdGlvbihleHByLCB2YWx1ZVJlZi5kZWZhdWx0SW1wb3J0U3RhdGVtZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIGV4cHI7XG4gIH0gZWxzZSB7XG4gICAgbGV0IGltcG9ydEV4cHI6IEV4cHJlc3Npb24gPVxuICAgICAgICBuZXcgRXh0ZXJuYWxFeHByKHttb2R1bGVOYW1lOiB2YWx1ZVJlZi5tb2R1bGVOYW1lLCBuYW1lOiB2YWx1ZVJlZi5pbXBvcnRlZE5hbWV9KTtcbiAgICBpZiAodmFsdWVSZWYubmVzdGVkUGF0aCAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiB2YWx1ZVJlZi5uZXN0ZWRQYXRoKSB7XG4gICAgICAgIGltcG9ydEV4cHIgPSBuZXcgUmVhZFByb3BFeHByKGltcG9ydEV4cHIsIHByb3BlcnR5KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGltcG9ydEV4cHI7XG4gIH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0IGBDb25zdHJ1Y3RvckRlcHNgIGludG8gdGhlIGBSM0RlcGVuZGVuY3lNZXRhZGF0YWAgYXJyYXkgZm9yIHRob3NlIGRlcHMgaWYgdGhleSdyZSB2YWxpZCxcbiAqIG9yIGludG8gYW4gYCdpbnZhbGlkJ2Agc2lnbmFsIGlmIHRoZXkncmUgbm90LlxuICpcbiAqIFRoaXMgaXMgYSBjb21wYW5pb24gZnVuY3Rpb24gdG8gYHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXNgIHdoaWNoIGFjY2VwdHMgaW52YWxpZCBkZXBzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdW53cmFwQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoZGVwczogQ29uc3RydWN0b3JEZXBzfG51bGwpOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfFxuICAgICdpbnZhbGlkJ3xudWxsIHtcbiAgaWYgKGRlcHMgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIGlmIChkZXBzLmRlcHMgIT09IG51bGwpIHtcbiAgICAvLyBUaGVzZSBjb25zdHJ1Y3RvciBkZXBlbmRlbmNpZXMgYXJlIHZhbGlkLlxuICAgIHJldHVybiBkZXBzLmRlcHM7XG4gIH0gZWxzZSB7XG4gICAgLy8gVGhlc2UgZGVwcyBhcmUgaW52YWxpZC5cbiAgICByZXR1cm4gJ2ludmFsaWQnO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBpc0NvcmU6IGJvb2xlYW4pOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfFxuICAgIG51bGwge1xuICByZXR1cm4gdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICAgIGNsYXp6LCBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBpc0NvcmUpKTtcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSB0aGF0IGBDb25zdHJ1Y3RvckRlcHNgIGRvZXMgbm90IGhhdmUgYW55IGludmFsaWQgZGVwZW5kZW5jaWVzIGFuZCBjb252ZXJ0IHRoZW0gaW50byB0aGVcbiAqIGBSM0RlcGVuZGVuY3lNZXRhZGF0YWAgYXJyYXkgaWYgc28sIG9yIHJhaXNlIGEgZGlhZ25vc3RpYyBpZiBzb21lIGRlcHMgYXJlIGludmFsaWQuXG4gKlxuICogVGhpcyBpcyBhIGNvbXBhbmlvbiBmdW5jdGlvbiB0byBgdW53cmFwQ29uc3RydWN0b3JEZXBlbmRlbmNpZXNgIHdoaWNoIGRvZXMgbm90IGFjY2VwdCBpbnZhbGlkXG4gKiBkZXBzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVwczogQ29uc3RydWN0b3JEZXBzfG51bGwpOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfG51bGwge1xuICBpZiAoZGVwcyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2UgaWYgKGRlcHMuZGVwcyAhPT0gbnVsbCkge1xuICAgIHJldHVybiBkZXBzLmRlcHM7XG4gIH0gZWxzZSB7XG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNhc3QgaXMgbmVjZXNzYXJ5IGJlY2F1c2UgdGhlIGczIHR5cGVzY3JpcHQgdmVyc2lvbiBkb2Vzbid0IG5hcnJvdyBoZXJlLlxuICAgIC8vIFRoZXJlIGlzIGF0IGxlYXN0IG9uZSBlcnJvci5cbiAgICBjb25zdCBlcnJvciA9IChkZXBzIGFzIHtlcnJvcnM6IENvbnN0cnVjdG9yRGVwRXJyb3JbXX0pLmVycm9yc1swXTtcbiAgICB0aHJvdyBjcmVhdGVVbnN1aXRhYmxlSW5qZWN0aW9uVG9rZW5FcnJvcihjbGF6eiwgZXJyb3IpO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZhdGFsIGVycm9yIHdpdGggZGlhZ25vc3RpYyBmb3IgYW4gaW52YWxpZCBpbmplY3Rpb24gdG9rZW4uXG4gKiBAcGFyYW0gY2xhenogVGhlIGNsYXNzIGZvciB3aGljaCB0aGUgaW5qZWN0aW9uIHRva2VuIHdhcyB1bmF2YWlsYWJsZS5cbiAqIEBwYXJhbSBlcnJvciBUaGUgcmVhc29uIHdoeSBubyB2YWxpZCBpbmplY3Rpb24gdG9rZW4gaXMgYXZhaWxhYmxlLlxuICovXG5mdW5jdGlvbiBjcmVhdGVVbnN1aXRhYmxlSW5qZWN0aW9uVG9rZW5FcnJvcihcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZXJyb3I6IENvbnN0cnVjdG9yRGVwRXJyb3IpOiBGYXRhbERpYWdub3N0aWNFcnJvciB7XG4gIGNvbnN0IHtwYXJhbSwgaW5kZXgsIHJlYXNvbn0gPSBlcnJvcjtcbiAgbGV0IGNoYWluTWVzc2FnZTogc3RyaW5nfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgbGV0IGhpbnRzOiB0cy5EaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBzd2l0Y2ggKHJlYXNvbi5raW5kKSB7XG4gICAgY2FzZSBWYWx1ZVVuYXZhaWxhYmxlS2luZC5VTlNVUFBPUlRFRDpcbiAgICAgIGNoYWluTWVzc2FnZSA9ICdDb25zaWRlciB1c2luZyB0aGUgQEluamVjdCBkZWNvcmF0b3IgdG8gc3BlY2lmeSBhbiBpbmplY3Rpb24gdG9rZW4uJztcbiAgICAgIGhpbnRzID0gW1xuICAgICAgICBtYWtlUmVsYXRlZEluZm9ybWF0aW9uKHJlYXNvbi50eXBlTm9kZSwgJ1RoaXMgdHlwZSBpcyBub3Qgc3VwcG9ydGVkIGFzIGluamVjdGlvbiB0b2tlbi4nKSxcbiAgICAgIF07XG4gICAgICBicmVhaztcbiAgICBjYXNlIFZhbHVlVW5hdmFpbGFibGVLaW5kLk5PX1ZBTFVFX0RFQ0xBUkFUSU9OOlxuICAgICAgY2hhaW5NZXNzYWdlID0gJ0NvbnNpZGVyIHVzaW5nIHRoZSBASW5qZWN0IGRlY29yYXRvciB0byBzcGVjaWZ5IGFuIGluamVjdGlvbiB0b2tlbi4nO1xuICAgICAgaGludHMgPSBbXG4gICAgICAgIG1ha2VSZWxhdGVkSW5mb3JtYXRpb24oXG4gICAgICAgICAgICByZWFzb24udHlwZU5vZGUsXG4gICAgICAgICAgICAnVGhpcyB0eXBlIGRvZXMgbm90IGhhdmUgYSB2YWx1ZSwgc28gaXQgY2Fubm90IGJlIHVzZWQgYXMgaW5qZWN0aW9uIHRva2VuLicpLFxuICAgICAgXTtcbiAgICAgIGlmIChyZWFzb24uZGVjbCAhPT0gbnVsbCkge1xuICAgICAgICBoaW50cy5wdXNoKG1ha2VSZWxhdGVkSW5mb3JtYXRpb24ocmVhc29uLmRlY2wsICdUaGUgdHlwZSBpcyBkZWNsYXJlZCBoZXJlLicpKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgVmFsdWVVbmF2YWlsYWJsZUtpbmQuVFlQRV9PTkxZX0lNUE9SVDpcbiAgICAgIGNoYWluTWVzc2FnZSA9XG4gICAgICAgICAgJ0NvbnNpZGVyIGNoYW5naW5nIHRoZSB0eXBlLW9ubHkgaW1wb3J0IHRvIGEgcmVndWxhciBpbXBvcnQsIG9yIHVzZSB0aGUgQEluamVjdCBkZWNvcmF0b3IgdG8gc3BlY2lmeSBhbiBpbmplY3Rpb24gdG9rZW4uJztcbiAgICAgIGhpbnRzID0gW1xuICAgICAgICBtYWtlUmVsYXRlZEluZm9ybWF0aW9uKFxuICAgICAgICAgICAgcmVhc29uLnR5cGVOb2RlLFxuICAgICAgICAgICAgJ1RoaXMgdHlwZSBpcyBpbXBvcnRlZCB1c2luZyBhIHR5cGUtb25seSBpbXBvcnQsIHdoaWNoIHByZXZlbnRzIGl0IGZyb20gYmVpbmcgdXNhYmxlIGFzIGFuIGluamVjdGlvbiB0b2tlbi4nKSxcbiAgICAgICAgbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihyZWFzb24uaW1wb3J0Q2xhdXNlLCAnVGhlIHR5cGUtb25seSBpbXBvcnQgb2NjdXJzIGhlcmUuJyksXG4gICAgICBdO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBWYWx1ZVVuYXZhaWxhYmxlS2luZC5OQU1FU1BBQ0U6XG4gICAgICBjaGFpbk1lc3NhZ2UgPSAnQ29uc2lkZXIgdXNpbmcgdGhlIEBJbmplY3QgZGVjb3JhdG9yIHRvIHNwZWNpZnkgYW4gaW5qZWN0aW9uIHRva2VuLic7XG4gICAgICBoaW50cyA9IFtcbiAgICAgICAgbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihcbiAgICAgICAgICAgIHJlYXNvbi50eXBlTm9kZSxcbiAgICAgICAgICAgICdUaGlzIHR5cGUgY29ycmVzcG9uZHMgd2l0aCBhIG5hbWVzcGFjZSwgd2hpY2ggY2Fubm90IGJlIHVzZWQgYXMgaW5qZWN0aW9uIHRva2VuLicpLFxuICAgICAgICBtYWtlUmVsYXRlZEluZm9ybWF0aW9uKHJlYXNvbi5pbXBvcnRDbGF1c2UsICdUaGUgbmFtZXNwYWNlIGltcG9ydCBvY2N1cnMgaGVyZS4nKSxcbiAgICAgIF07XG4gICAgICBicmVhaztcbiAgICBjYXNlIFZhbHVlVW5hdmFpbGFibGVLaW5kLlVOS05PV05fUkVGRVJFTkNFOlxuICAgICAgY2hhaW5NZXNzYWdlID0gJ1RoZSB0eXBlIHNob3VsZCByZWZlcmVuY2UgYSBrbm93biBkZWNsYXJhdGlvbi4nO1xuICAgICAgaGludHMgPSBbbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihyZWFzb24udHlwZU5vZGUsICdUaGlzIHR5cGUgY291bGQgbm90IGJlIHJlc29sdmVkLicpXTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgVmFsdWVVbmF2YWlsYWJsZUtpbmQuTUlTU0lOR19UWVBFOlxuICAgICAgY2hhaW5NZXNzYWdlID1cbiAgICAgICAgICAnQ29uc2lkZXIgYWRkaW5nIGEgdHlwZSB0byB0aGUgcGFyYW1ldGVyIG9yIHVzZSB0aGUgQEluamVjdCBkZWNvcmF0b3IgdG8gc3BlY2lmeSBhbiBpbmplY3Rpb24gdG9rZW4uJztcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgY29uc3QgY2hhaW46IHRzLkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4gPSB7XG4gICAgbWVzc2FnZVRleHQ6IGBObyBzdWl0YWJsZSBpbmplY3Rpb24gdG9rZW4gZm9yIHBhcmFtZXRlciAnJHtwYXJhbS5uYW1lIHx8IGluZGV4fScgb2YgY2xhc3MgJyR7XG4gICAgICAgIGNsYXp6Lm5hbWUudGV4dH0nLmAsXG4gICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICBjb2RlOiAwLFxuICAgIG5leHQ6IFt7XG4gICAgICBtZXNzYWdlVGV4dDogY2hhaW5NZXNzYWdlLFxuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlLFxuICAgICAgY29kZTogMCxcbiAgICB9XSxcbiAgfTtcblxuICByZXR1cm4gbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKEVycm9yQ29kZS5QQVJBTV9NSVNTSU5HX1RPS0VOLCBwYXJhbS5uYW1lTm9kZSwgY2hhaW4sIGhpbnRzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvUjNSZWZlcmVuY2UoXG4gICAgdmFsdWVSZWY6IFJlZmVyZW5jZSwgdHlwZVJlZjogUmVmZXJlbmNlLCB2YWx1ZUNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsXG4gICAgdHlwZUNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIpOiBSM1JlZmVyZW5jZSB7XG4gIHJldHVybiB7XG4gICAgdmFsdWU6IHJlZkVtaXR0ZXIuZW1pdCh2YWx1ZVJlZiwgdmFsdWVDb250ZXh0KS5leHByZXNzaW9uLFxuICAgIHR5cGU6IHJlZkVtaXR0ZXJcbiAgICAgICAgICAgICAgLmVtaXQodHlwZVJlZiwgdHlwZUNvbnRleHQsIEltcG9ydEZsYWdzLkZvcmNlTmV3SW1wb3J0IHwgSW1wb3J0RmxhZ3MuQWxsb3dUeXBlSW1wb3J0cylcbiAgICAgICAgICAgICAgLmV4cHJlc3Npb24sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FuZ3VsYXJDb3JlKGRlY29yYXRvcjogRGVjb3JhdG9yKTogZGVjb3JhdG9yIGlzIERlY29yYXRvciZ7aW1wb3J0OiBJbXBvcnR9IHtcbiAgcmV0dXJuIGRlY29yYXRvci5pbXBvcnQgIT09IG51bGwgJiYgZGVjb3JhdG9yLmltcG9ydC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZSc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlKHJlZmVyZW5jZTogUmVmZXJlbmNlLCBzeW1ib2xOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIHJlZmVyZW5jZS5vd25lZEJ5TW9kdWxlR3Vlc3MgPT09ICdAYW5ndWxhci9jb3JlJyAmJiByZWZlcmVuY2UuZGVidWdOYW1lID09PSBzeW1ib2xOYW1lO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZEFuZ3VsYXJEZWNvcmF0b3IoXG4gICAgZGVjb3JhdG9yczogRGVjb3JhdG9yW10sIG5hbWU6IHN0cmluZywgaXNDb3JlOiBib29sZWFuKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gIHJldHVybiBkZWNvcmF0b3JzLmZpbmQoZGVjb3JhdG9yID0+IGlzQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3IsIG5hbWUsIGlzQ29yZSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcjogRGVjb3JhdG9yLCBuYW1lOiBzdHJpbmcsIGlzQ29yZTogYm9vbGVhbik6IGJvb2xlYW4ge1xuICBpZiAoaXNDb3JlKSB7XG4gICAgcmV0dXJuIGRlY29yYXRvci5uYW1lID09PSBuYW1lO1xuICB9IGVsc2UgaWYgKGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yKSkge1xuICAgIHJldHVybiBkZWNvcmF0b3IuaW1wb3J0Lm5hbWUgPT09IG5hbWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIFVud3JhcCBhIGB0cy5FeHByZXNzaW9uYCwgcmVtb3Zpbmcgb3V0ZXIgdHlwZS1jYXN0cyBvciBwYXJlbnRoZXNlcyB1bnRpbCB0aGUgZXhwcmVzc2lvbiBpcyBpbiBpdHNcbiAqIGxvd2VzdCBsZXZlbCBmb3JtLlxuICpcbiAqIEZvciBleGFtcGxlLCB0aGUgZXhwcmVzc2lvbiBcIihmb28gYXMgVHlwZSlcIiB1bndyYXBzIHRvIFwiZm9vXCIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bndyYXBFeHByZXNzaW9uKG5vZGU6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uIHtcbiAgd2hpbGUgKHRzLmlzQXNFeHByZXNzaW9uKG5vZGUpIHx8IHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICBub2RlID0gbm9kZS5leHByZXNzaW9uO1xuICB9XG4gIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBleHBhbmRGb3J3YXJkUmVmKGFyZzogdHMuRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gIGFyZyA9IHVud3JhcEV4cHJlc3Npb24oYXJnKTtcbiAgaWYgKCF0cy5pc0Fycm93RnVuY3Rpb24oYXJnKSAmJiAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oYXJnKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgYm9keSA9IGFyZy5ib2R5O1xuICAvLyBFaXRoZXIgdGhlIGJvZHkgaXMgYSB0cy5FeHByZXNzaW9uIGRpcmVjdGx5LCBvciBhIGJsb2NrIHdpdGggYSBzaW5nbGUgcmV0dXJuIHN0YXRlbWVudC5cbiAgaWYgKHRzLmlzQmxvY2soYm9keSkpIHtcbiAgICAvLyBCbG9jayBib2R5IC0gbG9vayBmb3IgYSBzaW5nbGUgcmV0dXJuIHN0YXRlbWVudC5cbiAgICBpZiAoYm9keS5zdGF0ZW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHN0bXQgPSBib2R5LnN0YXRlbWVudHNbMF07XG4gICAgaWYgKCF0cy5pc1JldHVyblN0YXRlbWVudChzdG10KSB8fCBzdG10LmV4cHJlc3Npb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzdG10LmV4cHJlc3Npb247XG4gIH0gZWxzZSB7XG4gICAgLy8gU2hvcnRoYW5kIGJvZHkgLSByZXR1cm4gYXMgYW4gZXhwcmVzc2lvbi5cbiAgICByZXR1cm4gYm9keTtcbiAgfVxufVxuXG5cbi8qKlxuICogSWYgdGhlIGdpdmVuIGBub2RlYCBpcyBhIGZvcndhcmRSZWYoKSBleHByZXNzaW9uIHRoZW4gcmVzb2x2ZSBpdHMgaW5uZXIgdmFsdWUsIG90aGVyd2lzZSByZXR1cm5cbiAqIGBudWxsYC5cbiAqXG4gKiBAcGFyYW0gbm9kZSB0aGUgZm9yd2FyZFJlZigpIGV4cHJlc3Npb24gdG8gcmVzb2x2ZVxuICogQHBhcmFtIHJlZmxlY3RvciBhIFJlZmxlY3Rpb25Ib3N0XG4gKiBAcmV0dXJucyB0aGUgcmVzb2x2ZWQgZXhwcmVzc2lvbiwgaWYgdGhlIG9yaWdpbmFsIGV4cHJlc3Npb24gd2FzIGEgZm9yd2FyZFJlZigpLCBvciBgbnVsbGBcbiAqICAgICBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cnlVbndyYXBGb3J3YXJkUmVmKG5vZGU6IHRzLkV4cHJlc3Npb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiB0cy5FeHByZXNzaW9ufFxuICAgIG51bGwge1xuICBub2RlID0gdW53cmFwRXhwcmVzc2lvbihub2RlKTtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpIHx8IG5vZGUuYXJndW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgZm4gPVxuICAgICAgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZS5leHByZXNzaW9uKSA/IG5vZGUuZXhwcmVzc2lvbi5uYW1lIDogbm9kZS5leHByZXNzaW9uO1xuICBpZiAoIXRzLmlzSWRlbnRpZmllcihmbikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGV4cHIgPSBleHBhbmRGb3J3YXJkUmVmKG5vZGUuYXJndW1lbnRzWzBdKTtcbiAgaWYgKGV4cHIgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGltcCA9IHJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIoZm4pO1xuICBpZiAoaW1wID09PSBudWxsIHx8IGltcC5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScgfHwgaW1wLm5hbWUgIT09ICdmb3J3YXJkUmVmJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIGV4cHI7XG59XG5cbi8qKlxuICogQSBmb3JlaWduIGZ1bmN0aW9uIHJlc29sdmVyIGZvciBgc3RhdGljYWxseVJlc29sdmVgIHdoaWNoIHVud3JhcHMgZm9yd2FyZFJlZigpIGV4cHJlc3Npb25zLlxuICpcbiAqIEBwYXJhbSByZWYgYSBSZWZlcmVuY2UgdG8gdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBmdW5jdGlvbiBiZWluZyBjYWxsZWQgKHdoaWNoIG1pZ2h0IGJlXG4gKiBmb3J3YXJkUmVmKVxuICogQHBhcmFtIGFyZ3MgdGhlIGFyZ3VtZW50cyB0byB0aGUgaW52b2NhdGlvbiBvZiB0aGUgZm9yd2FyZFJlZiBleHByZXNzaW9uXG4gKiBAcmV0dXJucyBhbiB1bndyYXBwZWQgYXJndW1lbnQgaWYgYHJlZmAgcG9pbnRlZCB0byBmb3J3YXJkUmVmLCBvciBudWxsIG90aGVyd2lzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9yd2FyZFJlZlJlc29sdmVyKFxuICAgIHJlZjogUmVmZXJlbmNlPHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25FeHByZXNzaW9uPixcbiAgICBhcmdzOiBSZWFkb25seUFycmF5PHRzLkV4cHJlc3Npb24+KTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKCFpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlKHJlZiwgJ2ZvcndhcmRSZWYnKSB8fCBhcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiBleHBhbmRGb3J3YXJkUmVmKGFyZ3NbMF0pO1xufVxuXG4vKipcbiAqIENvbWJpbmVzIGFuIGFycmF5IG9mIHJlc29sdmVyIGZ1bmN0aW9ucyBpbnRvIGEgb25lLlxuICogQHBhcmFtIHJlc29sdmVycyBSZXNvbHZlcnMgdG8gYmUgY29tYmluZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5lUmVzb2x2ZXJzKHJlc29sdmVyczogRm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXJbXSk6IEZvcmVpZ25GdW5jdGlvblJlc29sdmVyIHtcbiAgcmV0dXJuIChyZWY6IFJlZmVyZW5jZTx0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRXhwcmVzc2lvbj4sXG4gICAgICAgICAgYXJnczogUmVhZG9ubHlBcnJheTx0cy5FeHByZXNzaW9uPik6IHRzLkV4cHJlc3Npb258bnVsbCA9PiB7XG4gICAgZm9yIChjb25zdCByZXNvbHZlciBvZiByZXNvbHZlcnMpIHtcbiAgICAgIGNvbnN0IHJlc29sdmVkID0gcmVzb2x2ZXIocmVmLCBhcmdzKTtcbiAgICAgIGlmIChyZXNvbHZlZCAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShcbiAgICBleHByOiBFeHByZXNzaW9uLCBjb250ZXh0OiB0cy5Ob2RlLCBjb250ZXh0U291cmNlOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gIGlmIChpc1dyYXBwZWRUc05vZGVFeHByKGV4cHIpKSB7XG4gICAgY29uc3Qgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShleHByLm5vZGUpO1xuICAgIHJldHVybiBub2RlLmdldFNvdXJjZUZpbGUoKSA9PT0gY29udGV4dFNvdXJjZSAmJiBjb250ZXh0LnBvcyA8IG5vZGUucG9zO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXcmFwcGVkVHNOb2RlRXhwcihleHByOiBFeHByZXNzaW9uKTogZXhwciBpcyBXcmFwcGVkTm9kZUV4cHI8dHMuTm9kZT4ge1xuICByZXR1cm4gZXhwciBpbnN0YW5jZW9mIFdyYXBwZWROb2RlRXhwcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRCYXNlQ2xhc3MoXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj58J2R5bmFtaWMnfG51bGwge1xuICBjb25zdCBiYXNlRXhwcmVzc2lvbiA9IHJlZmxlY3Rvci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKG5vZGUpO1xuICBpZiAoYmFzZUV4cHJlc3Npb24gIT09IG51bGwpIHtcbiAgICBjb25zdCBiYXNlQ2xhc3MgPSBldmFsdWF0b3IuZXZhbHVhdGUoYmFzZUV4cHJlc3Npb24pO1xuICAgIGlmIChiYXNlQ2xhc3MgaW5zdGFuY2VvZiBSZWZlcmVuY2UgJiYgcmVmbGVjdG9yLmlzQ2xhc3MoYmFzZUNsYXNzLm5vZGUpKSB7XG4gICAgICByZXR1cm4gYmFzZUNsYXNzIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICdkeW5hbWljJztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuY29uc3QgcGFyZW5zV3JhcHBlclRyYW5zZm9ybWVyRmFjdG9yeTogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLkV4cHJlc3Npb24+ID1cbiAgICAoY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KSA9PiB7XG4gICAgICBjb25zdCB2aXNpdG9yOiB0cy5WaXNpdG9yID0gKG5vZGU6IHRzLk5vZGUpOiB0cy5Ob2RlID0+IHtcbiAgICAgICAgY29uc3QgdmlzaXRlZCA9IHRzLnZpc2l0RWFjaENoaWxkKG5vZGUsIHZpc2l0b3IsIGNvbnRleHQpO1xuICAgICAgICBpZiAodHMuaXNBcnJvd0Z1bmN0aW9uKHZpc2l0ZWQpIHx8IHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHZpc2l0ZWQpKSB7XG4gICAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZVBhcmVuKHZpc2l0ZWQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2aXNpdGVkO1xuICAgICAgfTtcbiAgICAgIHJldHVybiAobm9kZTogdHMuRXhwcmVzc2lvbikgPT4gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgdmlzaXRvciwgY29udGV4dCk7XG4gICAgfTtcblxuLyoqXG4gKiBXcmFwcyBhbGwgZnVuY3Rpb25zIGluIGEgZ2l2ZW4gZXhwcmVzc2lvbiBpbiBwYXJlbnRoZXNlcy4gVGhpcyBpcyBuZWVkZWQgdG8gYXZvaWQgcHJvYmxlbXNcbiAqIHdoZXJlIFRzaWNrbGUgYW5ub3RhdGlvbnMgYWRkZWQgYmV0d2VlbiBhbmFseXNlIGFuZCB0cmFuc2Zvcm0gcGhhc2VzIGluIEFuZ3VsYXIgbWF5IHRyaWdnZXJcbiAqIGF1dG9tYXRpYyBzZW1pY29sb24gaW5zZXJ0aW9uLCBlLmcuIGlmIGEgZnVuY3Rpb24gaXMgdGhlIGV4cHJlc3Npb24gaW4gYSBgcmV0dXJuYCBzdGF0ZW1lbnQuXG4gKiBNb3JlXG4gKiBpbmZvIGNhbiBiZSBmb3VuZCBpbiBUc2lja2xlIHNvdXJjZSBjb2RlIGhlcmU6XG4gKiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci90c2lja2xlL2Jsb2IvZDc5NzQyNjI1NzFjOGExN2Q2ODRlNWJhMDc2ODBlMWIxOTkzYWZkZC9zcmMvanNkb2NfdHJhbnNmb3JtZXIudHMjTDEwMjFcbiAqXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiBFeHByZXNzaW9uIHdoZXJlIGZ1bmN0aW9ucyBzaG91bGQgYmUgd3JhcHBlZCBpbiBwYXJlbnRoZXNlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucyhleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIHJldHVybiB0cy50cmFuc2Zvcm0oZXhwcmVzc2lvbiwgW3BhcmVuc1dyYXBwZXJUcmFuc2Zvcm1lckZhY3RvcnldKS50cmFuc2Zvcm1lZFswXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgdHMuRGlhZ25vc3RpY2Agd2hpY2ggaW5kaWNhdGVzIHRoZSBnaXZlbiBjbGFzcyBpcyBwYXJ0IG9mIHRoZSBkZWNsYXJhdGlvbnMgb2YgdHdvIG9yXG4gKiBtb3JlIE5nTW9kdWxlcy5cbiAqXG4gKiBUaGUgcmVzdWx0aW5nIGB0cy5EaWFnbm9zdGljYCB3aWxsIGhhdmUgYSBjb250ZXh0IGVudHJ5IGZvciBlYWNoIE5nTW9kdWxlIHNob3dpbmcgdGhlIHBvaW50IHdoZXJlXG4gKiB0aGUgZGlyZWN0aXZlL3BpcGUgZXhpc3RzIGluIGl0cyBgZGVjbGFyYXRpb25zYCAoaWYgcG9zc2libGUpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZUR1cGxpY2F0ZURlY2xhcmF0aW9uRXJyb3IoXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGF0YTogRGVjbGFyYXRpb25EYXRhW10sIGtpbmQ6IHN0cmluZyk6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjb250ZXh0OiB0cy5EaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uW10gPSBbXTtcbiAgZm9yIChjb25zdCBkZWNsIG9mIGRhdGEpIHtcbiAgICBpZiAoZGVjbC5yYXdEZWNsYXJhdGlvbnMgPT09IG51bGwpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICAvLyBUcnkgdG8gZmluZCB0aGUgcmVmZXJlbmNlIHRvIHRoZSBkZWNsYXJhdGlvbiB3aXRoaW4gdGhlIGRlY2xhcmF0aW9ucyBhcnJheSwgdG8gaGFuZyB0aGVcbiAgICAvLyBlcnJvciB0aGVyZS4gSWYgaXQgY2FuJ3QgYmUgZm91bmQsIGZhbGwgYmFjayBvbiB1c2luZyB0aGUgTmdNb2R1bGUncyBuYW1lLlxuICAgIGNvbnN0IGNvbnRleHROb2RlID0gZGVjbC5yZWYuZ2V0T3JpZ2luRm9yRGlhZ25vc3RpY3MoZGVjbC5yYXdEZWNsYXJhdGlvbnMsIGRlY2wubmdNb2R1bGUubmFtZSk7XG4gICAgY29udGV4dC5wdXNoKG1ha2VSZWxhdGVkSW5mb3JtYXRpb24oXG4gICAgICAgIGNvbnRleHROb2RlLFxuICAgICAgICBgJyR7bm9kZS5uYW1lLnRleHR9JyBpcyBsaXN0ZWQgaW4gdGhlIGRlY2xhcmF0aW9ucyBvZiB0aGUgTmdNb2R1bGUgJyR7XG4gICAgICAgICAgICBkZWNsLm5nTW9kdWxlLm5hbWUudGV4dH0nLmApKTtcbiAgfVxuXG4gIC8vIEZpbmFsbHksIHByb2R1Y2UgdGhlIGRpYWdub3N0aWMuXG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9ERUNMQVJBVElPTl9OT1RfVU5JUVVFLCBub2RlLm5hbWUsXG4gICAgICBgVGhlICR7a2luZH0gJyR7bm9kZS5uYW1lLnRleHR9JyBpcyBkZWNsYXJlZCBieSBtb3JlIHRoYW4gb25lIE5nTW9kdWxlLmAsIGNvbnRleHQpO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBnaXZlbiBgcmF3UHJvdmlkZXJzYCBpbnRvIGBDbGFzc0RlY2xhcmF0aW9uc2AgYW5kIHJldHVybnNcbiAqIGEgc2V0IGNvbnRhaW5pbmcgdGhvc2UgdGhhdCBhcmUga25vd24gdG8gcmVxdWlyZSBhIGZhY3RvcnkgZGVmaW5pdGlvbi5cbiAqIEBwYXJhbSByYXdQcm92aWRlcnMgRXhwcmVzc2lvbiB0aGF0IGRlY2xhcmVkIHRoZSBwcm92aWRlcnMgYXJyYXkgaW4gdGhlIHNvdXJjZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5KFxuICAgIHJhd1Byb3ZpZGVyczogdHMuRXhwcmVzc2lvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PiB7XG4gIGNvbnN0IHByb3ZpZGVycyA9IG5ldyBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PigpO1xuICBjb25zdCByZXNvbHZlZFByb3ZpZGVycyA9IGV2YWx1YXRvci5ldmFsdWF0ZShyYXdQcm92aWRlcnMpO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheShyZXNvbHZlZFByb3ZpZGVycykpIHtcbiAgICByZXR1cm4gcHJvdmlkZXJzO1xuICB9XG5cbiAgcmVzb2x2ZWRQcm92aWRlcnMuZm9yRWFjaChmdW5jdGlvbiBwcm9jZXNzUHJvdmlkZXJzKHByb3ZpZGVyKSB7XG4gICAgbGV0IHRva2VuQ2xhc3M6IFJlZmVyZW5jZXxudWxsID0gbnVsbDtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHByb3ZpZGVyKSkge1xuICAgICAgLy8gSWYgd2UgcmFuIGludG8gYW4gYXJyYXksIHJlY3Vyc2UgaW50byBpdCB1bnRpbCB3ZSd2ZSByZXNvbHZlIGFsbCB0aGUgY2xhc3Nlcy5cbiAgICAgIHByb3ZpZGVyLmZvckVhY2gocHJvY2Vzc1Byb3ZpZGVycyk7XG4gICAgfSBlbHNlIGlmIChwcm92aWRlciBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgdG9rZW5DbGFzcyA9IHByb3ZpZGVyO1xuICAgIH0gZWxzZSBpZiAocHJvdmlkZXIgaW5zdGFuY2VvZiBNYXAgJiYgcHJvdmlkZXIuaGFzKCd1c2VDbGFzcycpICYmICFwcm92aWRlci5oYXMoJ2RlcHMnKSkge1xuICAgICAgY29uc3QgdXNlRXhpc3RpbmcgPSBwcm92aWRlci5nZXQoJ3VzZUNsYXNzJykhO1xuICAgICAgaWYgKHVzZUV4aXN0aW5nIGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgICAgIHRva2VuQ2xhc3MgPSB1c2VFeGlzdGluZztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoZXJlIHdhcyBhIGJ1ZyB3aGVyZSBgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzYCB3b3VsZCByZXR1cm4gYG51bGxgIGZvciBhXG4gICAgLy8gY2xhc3MgaW4gYSAuZC50cyBmaWxlLCBhbHdheXMsIGV2ZW4gaWYgdGhlIGNsYXNzIGhhZCBhIGNvbnN0cnVjdG9yLiBUaGlzIHdhcyBmaXhlZCBmb3JcbiAgICAvLyBgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzYCwgYnV0IHRoYXQgZml4IGNhdXNlcyBtb3JlIGNsYXNzZXMgdG8gYmUgcmVjb2duaXplZCBoZXJlIGFzIG5lZWRpbmdcbiAgICAvLyBwcm92aWRlciBjaGVja3MsIHdoaWNoIGlzIGEgYnJlYWtpbmcgY2hhbmdlIGluIGczLiBBdm9pZCB0aGlzIGJyZWFrYWdlIGZvciBub3cgYnkgc2tpcHBpbmdcbiAgICAvLyBjbGFzc2VzIGZyb20gLmQudHMgZmlsZXMgaGVyZSBkaXJlY3RseSwgdW50aWwgZzMgY2FuIGJlIGNsZWFuZWQgdXAuXG4gICAgaWYgKHRva2VuQ2xhc3MgIT09IG51bGwgJiYgIXRva2VuQ2xhc3Mubm9kZS5nZXRTb3VyY2VGaWxlKCkuaXNEZWNsYXJhdGlvbkZpbGUgJiZcbiAgICAgICAgcmVmbGVjdG9yLmlzQ2xhc3ModG9rZW5DbGFzcy5ub2RlKSkge1xuICAgICAgY29uc3QgY29uc3RydWN0b3JQYXJhbWV0ZXJzID0gcmVmbGVjdG9yLmdldENvbnN0cnVjdG9yUGFyYW1ldGVycyh0b2tlbkNsYXNzLm5vZGUpO1xuXG4gICAgICAvLyBOb3RlIHRoYXQgd2Ugb25seSB3YW50IHRvIGNhcHR1cmUgcHJvdmlkZXJzIHdpdGggYSBub24tdHJpdmlhbCBjb25zdHJ1Y3RvcixcbiAgICAgIC8vIGJlY2F1c2UgdGhleSdyZSB0aGUgb25lcyB0aGF0IG1pZ2h0IGJlIHVzaW5nIERJIGFuZCBuZWVkIHRvIGJlIGRlY29yYXRlZC5cbiAgICAgIGlmIChjb25zdHJ1Y3RvclBhcmFtZXRlcnMgIT09IG51bGwgJiYgY29uc3RydWN0b3JQYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcHJvdmlkZXJzLmFkZCh0b2tlbkNsYXNzIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcHJvdmlkZXJzO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBSM1JlZmVyZW5jZSBmb3IgYSBjbGFzcy5cbiAqXG4gKiBUaGUgYHZhbHVlYCBpcyB0aGUgZXhwb3J0ZWQgZGVjbGFyYXRpb24gb2YgdGhlIGNsYXNzIGZyb20gaXRzIHNvdXJjZSBmaWxlLlxuICogVGhlIGB0eXBlYCBpcyBhbiBleHByZXNzaW9uIHRoYXQgd291bGQgYmUgdXNlZCBieSBuZ2NjIGluIHRoZSB0eXBpbmdzICguZC50cykgZmlsZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cmFwVHlwZVJlZmVyZW5jZShyZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IFIzUmVmZXJlbmNlIHtcbiAgY29uc3QgZHRzQ2xhc3MgPSByZWZsZWN0b3IuZ2V0RHRzRGVjbGFyYXRpb24oY2xhenopO1xuICBjb25zdCB2YWx1ZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoY2xhenoubmFtZSk7XG4gIGNvbnN0IHR5cGUgPSBkdHNDbGFzcyAhPT0gbnVsbCAmJiBpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihkdHNDbGFzcykgP1xuICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihkdHNDbGFzcy5uYW1lKSA6XG4gICAgICB2YWx1ZTtcbiAgcmV0dXJuIHt2YWx1ZSwgdHlwZX07XG59XG5cbi8qKiBDcmVhdGVzIGEgUGFyc2VTb3VyY2VTcGFuIGZvciBhIFR5cGVTY3JpcHQgbm9kZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTb3VyY2VTcGFuKG5vZGU6IHRzLk5vZGUpOiBQYXJzZVNvdXJjZVNwYW4ge1xuICBjb25zdCBzZiA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICBjb25zdCBbc3RhcnRPZmZzZXQsIGVuZE9mZnNldF0gPSBbbm9kZS5nZXRTdGFydCgpLCBub2RlLmdldEVuZCgpXTtcbiAgY29uc3Qge2xpbmU6IHN0YXJ0TGluZSwgY2hhcmFjdGVyOiBzdGFydENvbH0gPSBzZi5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzdGFydE9mZnNldCk7XG4gIGNvbnN0IHtsaW5lOiBlbmRMaW5lLCBjaGFyYWN0ZXI6IGVuZENvbH0gPSBzZi5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihlbmRPZmZzZXQpO1xuICBjb25zdCBwYXJzZVNmID0gbmV3IFBhcnNlU291cmNlRmlsZShzZi5nZXRGdWxsVGV4dCgpLCBzZi5maWxlTmFtZSk7XG5cbiAgLy8gKzEgYmVjYXVzZSB2YWx1ZXMgYXJlIHplcm8taW5kZXhlZC5cbiAgcmV0dXJuIG5ldyBQYXJzZVNvdXJjZVNwYW4oXG4gICAgICBuZXcgUGFyc2VMb2NhdGlvbihwYXJzZVNmLCBzdGFydE9mZnNldCwgc3RhcnRMaW5lICsgMSwgc3RhcnRDb2wgKyAxKSxcbiAgICAgIG5ldyBQYXJzZUxvY2F0aW9uKHBhcnNlU2YsIGVuZE9mZnNldCwgZW5kTGluZSArIDEsIGVuZENvbCArIDEpKTtcbn1cblxuLyoqXG4gKiBDb2xsYXRlIHRoZSBmYWN0b3J5IGFuZCBkZWZpbml0aW9uIGNvbXBpbGVkIHJlc3VsdHMgaW50byBhbiBhcnJheSBvZiBDb21waWxlUmVzdWx0IG9iamVjdHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlUmVzdWx0cyhcbiAgICBmYWM6IENvbXBpbGVSZXN1bHQsIGRlZjogUjNDb21waWxlZEV4cHJlc3Npb24sIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGwsXG4gICAgcHJvcE5hbWU6IHN0cmluZyk6IENvbXBpbGVSZXN1bHRbXSB7XG4gIGNvbnN0IHN0YXRlbWVudHMgPSBkZWYuc3RhdGVtZW50cztcbiAgaWYgKG1ldGFkYXRhU3RtdCAhPT0gbnVsbCkge1xuICAgIHN0YXRlbWVudHMucHVzaChtZXRhZGF0YVN0bXQpO1xuICB9XG4gIHJldHVybiBbXG4gICAgZmFjLCB7XG4gICAgICBuYW1lOiBwcm9wTmFtZSxcbiAgICAgIGluaXRpYWxpemVyOiBkZWYuZXhwcmVzc2lvbixcbiAgICAgIHN0YXRlbWVudHM6IGRlZi5zdGF0ZW1lbnRzLFxuICAgICAgdHlwZTogZGVmLnR5cGUsXG4gICAgfVxuICBdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9GYWN0b3J5TWV0YWRhdGEoXG4gICAgbWV0YTogT21pdDxSM0ZhY3RvcnlNZXRhZGF0YSwgJ3RhcmdldCc+LCB0YXJnZXQ6IEZhY3RvcnlUYXJnZXQpOiBSM0ZhY3RvcnlNZXRhZGF0YSB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogbWV0YS5uYW1lLFxuICAgIHR5cGU6IG1ldGEudHlwZSxcbiAgICBpbnRlcm5hbFR5cGU6IG1ldGEuaW50ZXJuYWxUeXBlLFxuICAgIHR5cGVBcmd1bWVudENvdW50OiBtZXRhLnR5cGVBcmd1bWVudENvdW50LFxuICAgIGRlcHM6IG1ldGEuZGVwcyxcbiAgICB0YXJnZXRcbiAgfTtcbn1cbiJdfQ==