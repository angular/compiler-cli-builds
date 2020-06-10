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
        define("@angular/compiler-cli/src/transformers/downlevel_decorators_transform", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/transformers/patch_alias_reference_resolution"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getDownlevelDecoratorsTransform = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var patch_alias_reference_resolution_1 = require("@angular/compiler-cli/src/transformers/patch_alias_reference_resolution");
    /**
     * Whether a given decorator should be treated as an Angular decorator.
     * Either it's used in @angular/core, or it's imported from there.
     */
    function isAngularDecorator(decorator, isCore) {
        return isCore || (decorator.import !== null && decorator.import.from === '@angular/core');
    }
    /*
     #####################################################################
      Code below has been extracted from the tsickle decorator downlevel transformer
      and a few local modifications have been applied:
    
        1. Tsickle by default processed all decorators that had the `@Annotation` JSDoc.
           We modified the transform to only be concerned with known Angular decorators.
        2. Tsickle by default added `@nocollapse` to all generated `ctorParameters` properties.
           We only do this when `annotateForClosureCompiler` is enabled.
        3. Tsickle does not handle union types for dependency injection. i.e. if a injected type
           is denoted with `@Optional`, the actual type could be set to `T | null`.
           See: https://github.com/angular/angular-cli/commit/826803d0736b807867caff9f8903e508970ad5e4.
        4. Tsickle relied on `emitDecoratorMetadata` to be set to `true`. This is due to a limitation
           in TypeScript transformers that never has been fixed. We were able to work around this
           limitation so that `emitDecoratorMetadata` doesn't need to be specified.
           See: `patchAliasReferenceResolution` for more details.
    
      Here is a link to the tsickle revision on which this transformer is based:
      https://github.com/angular/tsickle/blob/fae06becb1570f491806060d83f29f2d50c43cdd/src/decorator_downlevel_transformer.ts
     #####################################################################
    */
    /**
     * Creates the AST for the decorator field type annotation, which has the form
     *     { type: Function, args?: any[] }[]
     */
    function createDecoratorInvocationType() {
        var typeElements = [];
        typeElements.push(ts.createPropertySignature(undefined, 'type', undefined, ts.createTypeReferenceNode(ts.createIdentifier('Function'), undefined), undefined));
        typeElements.push(ts.createPropertySignature(undefined, 'args', ts.createToken(ts.SyntaxKind.QuestionToken), ts.createArrayTypeNode(ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)), undefined));
        return ts.createArrayTypeNode(ts.createTypeLiteralNode(typeElements));
    }
    /**
     * Extracts the type of the decorator (the function or expression invoked), as well as all the
     * arguments passed to the decorator. Returns an AST with the form:
     *
     *     // For @decorator(arg1, arg2)
     *     { type: decorator, args: [arg1, arg2] }
     */
    function extractMetadataFromSingleDecorator(decorator, diagnostics) {
        var e_1, _a;
        var metadataProperties = [];
        var expr = decorator.expression;
        switch (expr.kind) {
            case ts.SyntaxKind.Identifier:
                // The decorator was a plain @Foo.
                metadataProperties.push(ts.createPropertyAssignment('type', expr));
                break;
            case ts.SyntaxKind.CallExpression:
                // The decorator was a call, like @Foo(bar).
                var call = expr;
                metadataProperties.push(ts.createPropertyAssignment('type', call.expression));
                if (call.arguments.length) {
                    var args = [];
                    try {
                        for (var _b = tslib_1.__values(call.arguments), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var arg = _c.value;
                            args.push(arg);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    var argsArrayLiteral = ts.createArrayLiteral(args);
                    argsArrayLiteral.elements.hasTrailingComma = true;
                    metadataProperties.push(ts.createPropertyAssignment('args', argsArrayLiteral));
                }
                break;
            default:
                diagnostics.push({
                    file: decorator.getSourceFile(),
                    start: decorator.getStart(),
                    length: decorator.getEnd() - decorator.getStart(),
                    messageText: ts.SyntaxKind[decorator.kind] + " not implemented in gathering decorator metadata.",
                    category: ts.DiagnosticCategory.Error,
                    code: 0,
                });
                break;
        }
        return ts.createObjectLiteral(metadataProperties);
    }
    /**
     * Takes a list of decorator metadata object ASTs and produces an AST for a
     * static class property of an array of those metadata objects.
     */
    function createDecoratorClassProperty(decoratorList) {
        var modifier = ts.createToken(ts.SyntaxKind.StaticKeyword);
        var type = createDecoratorInvocationType();
        var initializer = ts.createArrayLiteral(decoratorList, true);
        // NB: the .decorators property does not get a @nocollapse property. There is
        // no good reason why - it means .decorators is not runtime accessible if you
        // compile with collapse properties, whereas propDecorators is, which doesn't
        // follow any stringent logic. However this has been the case previously, and
        // adding it back in leads to substantial code size increases as Closure fails
        // to tree shake these props without @nocollapse.
        return ts.createProperty(undefined, [modifier], 'decorators', undefined, type, initializer);
    }
    /**
     * Creates the AST for the 'ctorParameters' field type annotation:
     *   () => ({ type: any, decorators?: {type: Function, args?: any[]}[] }|null)[]
     */
    function createCtorParametersClassPropertyType() {
        // Sorry about this. Try reading just the string literals below.
        var typeElements = [];
        typeElements.push(ts.createPropertySignature(undefined, 'type', undefined, ts.createTypeReferenceNode(ts.createIdentifier('any'), undefined), undefined));
        typeElements.push(ts.createPropertySignature(undefined, 'decorators', ts.createToken(ts.SyntaxKind.QuestionToken), ts.createArrayTypeNode(ts.createTypeLiteralNode([
            ts.createPropertySignature(undefined, 'type', undefined, ts.createTypeReferenceNode(ts.createIdentifier('Function'), undefined), undefined),
            ts.createPropertySignature(undefined, 'args', ts.createToken(ts.SyntaxKind.QuestionToken), ts.createArrayTypeNode(ts.createTypeReferenceNode(ts.createIdentifier('any'), undefined)), undefined),
        ])), undefined));
        return ts.createFunctionTypeNode(undefined, [], ts.createArrayTypeNode(ts.createUnionTypeNode([ts.createTypeLiteralNode(typeElements), ts.createNull()])));
    }
    /**
     * Sets a Closure \@nocollapse synthetic comment on the given node. This prevents Closure Compiler
     * from collapsing the apparently static property, which would make it impossible to find for code
     * trying to detect it at runtime.
     */
    function addNoCollapseComment(n) {
        ts.setSyntheticLeadingComments(n, [{
                kind: ts.SyntaxKind.MultiLineCommentTrivia,
                text: '* @nocollapse ',
                pos: -1,
                end: -1,
                hasTrailingNewLine: true
            }]);
    }
    /**
     * createCtorParametersClassProperty creates a static 'ctorParameters' property containing
     * downleveled decorator information.
     *
     * The property contains an arrow function that returns an array of object literals of the shape:
     *     static ctorParameters = () => [{
     *       type: SomeClass|undefined,  // the type of the param that's decorated, if it's a value.
     *       decorators: [{
     *         type: DecoratorFn,  // the type of the decorator that's invoked.
     *         args: [ARGS],       // the arguments passed to the decorator.
     *       }]
     *     }];
     */
    function createCtorParametersClassProperty(diagnostics, entityNameToExpression, ctorParameters, isClosureCompilerEnabled) {
        var e_2, _a, e_3, _b;
        var params = [];
        try {
            for (var ctorParameters_1 = tslib_1.__values(ctorParameters), ctorParameters_1_1 = ctorParameters_1.next(); !ctorParameters_1_1.done; ctorParameters_1_1 = ctorParameters_1.next()) {
                var ctorParam = ctorParameters_1_1.value;
                if (!ctorParam.type && ctorParam.decorators.length === 0) {
                    params.push(ts.createNull());
                    continue;
                }
                var paramType = ctorParam.type ?
                    typeReferenceToExpression(entityNameToExpression, ctorParam.type) :
                    undefined;
                var members = [ts.createPropertyAssignment('type', paramType || ts.createIdentifier('undefined'))];
                var decorators = [];
                try {
                    for (var _c = (e_3 = void 0, tslib_1.__values(ctorParam.decorators)), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var deco = _d.value;
                        decorators.push(extractMetadataFromSingleDecorator(deco, diagnostics));
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                if (decorators.length) {
                    members.push(ts.createPropertyAssignment('decorators', ts.createArrayLiteral(decorators)));
                }
                params.push(ts.createObjectLiteral(members));
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (ctorParameters_1_1 && !ctorParameters_1_1.done && (_a = ctorParameters_1.return)) _a.call(ctorParameters_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        var initializer = ts.createArrowFunction(undefined, undefined, [], undefined, ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken), ts.createArrayLiteral(params, true));
        var type = createCtorParametersClassPropertyType();
        var ctorProp = ts.createProperty(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], 'ctorParameters', undefined, type, initializer);
        if (isClosureCompilerEnabled) {
            addNoCollapseComment(ctorProp);
        }
        return ctorProp;
    }
    /**
     * createPropDecoratorsClassProperty creates a static 'propDecorators' property containing type
     * information for every property that has a decorator applied.
     *
     *     static propDecorators: {[key: string]: {type: Function, args?: any[]}[]} = {
     *       propA: [{type: MyDecorator, args: [1, 2]}, ...],
     *       ...
     *     };
     */
    function createPropDecoratorsClassProperty(diagnostics, properties) {
        var e_4, _a;
        //  `static propDecorators: {[key: string]: ` + {type: Function, args?: any[]}[] + `} = {\n`);
        var entries = [];
        try {
            for (var _b = tslib_1.__values(properties.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = tslib_1.__read(_c.value, 2), name = _d[0], decorators = _d[1];
                entries.push(ts.createPropertyAssignment(name, ts.createArrayLiteral(decorators.map(function (deco) { return extractMetadataFromSingleDecorator(deco, diagnostics); }))));
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
        var initializer = ts.createObjectLiteral(entries, true);
        var type = ts.createTypeLiteralNode([ts.createIndexSignature(undefined, undefined, [ts.createParameter(undefined, undefined, undefined, 'key', undefined, ts.createTypeReferenceNode('string', undefined), undefined)], createDecoratorInvocationType())]);
        return ts.createProperty(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], 'propDecorators', undefined, type, initializer);
    }
    /**
     * Returns an expression representing the (potentially) value part for the given node.
     *
     * This is a partial re-implementation of TypeScript's serializeTypeReferenceNode. This is a
     * workaround for https://github.com/Microsoft/TypeScript/issues/17516 (serializeTypeReferenceNode
     * not being exposed). In practice this implementation is sufficient for Angular's use of type
     * metadata.
     */
    function typeReferenceToExpression(entityNameToExpression, node) {
        var kind = node.kind;
        if (ts.isLiteralTypeNode(node)) {
            // Treat literal types like their base type (boolean, string, number).
            kind = node.literal.kind;
        }
        switch (kind) {
            case ts.SyntaxKind.FunctionType:
            case ts.SyntaxKind.ConstructorType:
                return ts.createIdentifier('Function');
            case ts.SyntaxKind.ArrayType:
            case ts.SyntaxKind.TupleType:
                return ts.createIdentifier('Array');
            case ts.SyntaxKind.TypePredicate:
            case ts.SyntaxKind.TrueKeyword:
            case ts.SyntaxKind.FalseKeyword:
            case ts.SyntaxKind.BooleanKeyword:
                return ts.createIdentifier('Boolean');
            case ts.SyntaxKind.StringLiteral:
            case ts.SyntaxKind.StringKeyword:
                return ts.createIdentifier('String');
            case ts.SyntaxKind.ObjectKeyword:
                return ts.createIdentifier('Object');
            case ts.SyntaxKind.NumberKeyword:
            case ts.SyntaxKind.NumericLiteral:
                return ts.createIdentifier('Number');
            case ts.SyntaxKind.TypeReference:
                var typeRef = node;
                // Ignore any generic types, just return the base type.
                return entityNameToExpression(typeRef.typeName);
            case ts.SyntaxKind.UnionType:
                var childTypeNodes = node.types.filter(function (t) { return t.kind !== ts.SyntaxKind.NullKeyword; });
                return childTypeNodes.length === 1 ?
                    typeReferenceToExpression(entityNameToExpression, childTypeNodes[0]) :
                    undefined;
            default:
                return undefined;
        }
    }
    /**
     * Returns true if the given symbol refers to a value (as distinct from a type).
     *
     * Expands aliases, which is important for the case where
     *   import * as x from 'some-module';
     * and x is now a value (the module object).
     */
    function symbolIsValue(tc, sym) {
        if (sym.flags & ts.SymbolFlags.Alias)
            sym = tc.getAliasedSymbol(sym);
        return (sym.flags & ts.SymbolFlags.Value) !== 0;
    }
    /**
     * Gets a transformer for downleveling Angular decorators.
     * @param typeChecker Reference to the program's type checker.
     * @param host Reflection host that is used for determining decorators.
     * @param diagnostics List which will be populated with diagnostics if any.
     * @param isCore Whether the current TypeScript program is for the `@angular/core` package.
     * @param isClosureCompilerEnabled Whether closure annotations need to be added where needed.
     */
    function getDownlevelDecoratorsTransform(typeChecker, host, diagnostics, isCore, isClosureCompilerEnabled) {
        return function (context) {
            var referencedParameterTypes = new Set();
            /**
             * Converts an EntityName (from a type annotation) to an expression (accessing a value).
             *
             * For a given qualified name, this walks depth first to find the leftmost identifier,
             * and then converts the path into a property access that can be used as expression.
             */
            function entityNameToExpression(name) {
                var symbol = typeChecker.getSymbolAtLocation(name);
                // Check if the entity name references a symbol that is an actual value. If it is not, it
                // cannot be referenced by an expression, so return undefined.
                if (!symbol || !symbolIsValue(typeChecker, symbol) || !symbol.declarations ||
                    symbol.declarations.length === 0) {
                    return undefined;
                }
                // If we deal with a qualified name, build up a property access expression
                // that could be used in the JavaScript output.
                if (ts.isQualifiedName(name)) {
                    var containerExpr = entityNameToExpression(name.left);
                    if (containerExpr === undefined) {
                        return undefined;
                    }
                    return ts.createPropertyAccess(containerExpr, name.right);
                }
                var decl = symbol.declarations[0];
                // If the given entity name has been resolved to an alias import declaration,
                // ensure that the alias declaration is not elided by TypeScript, and use its
                // name identifier to reference it at runtime.
                if (patch_alias_reference_resolution_1.isAliasImportDeclaration(decl)) {
                    referencedParameterTypes.add(decl);
                    // If the entity name resolves to an alias import declaration, we reference the
                    // entity based on the alias import name. This ensures that TypeScript properly
                    // resolves the link to the import. Cloning the original entity name identifier
                    // could lead to an incorrect resolution at local scope. e.g. Consider the following
                    // snippet: `constructor(Dep: Dep) {}`. In such a case, the local `Dep` identifier
                    // would resolve to the actual parameter name, and not to the desired import.
                    // This happens because the entity name identifier symbol is internally considered
                    // as type-only and therefore TypeScript tries to resolve it as value manually.
                    // We can help TypeScript and avoid this non-reliable resolution by using an identifier
                    // that is not type-only and is directly linked to the import alias declaration.
                    if (decl.name !== undefined) {
                        return ts.getMutableClone(decl.name);
                    }
                }
                // Clone the original entity name identifier so that it can be used to reference
                // its value at runtime. This is used when the identifier is resolving to a file
                // local declaration (otherwise it would resolve to an alias import declaration).
                return ts.getMutableClone(name);
            }
            /**
             * Transforms a class element. Returns a three tuple of name, transformed element, and
             * decorators found. Returns an undefined name if there are no decorators to lower on the
             * element, or the element has an exotic name.
             */
            function transformClassElement(element) {
                var e_5, _a;
                element = ts.visitEachChild(element, decoratorDownlevelVisitor, context);
                var decoratorsToKeep = [];
                var toLower = [];
                var decorators = host.getDecoratorsOfDeclaration(element) || [];
                try {
                    for (var decorators_1 = tslib_1.__values(decorators), decorators_1_1 = decorators_1.next(); !decorators_1_1.done; decorators_1_1 = decorators_1.next()) {
                        var decorator = decorators_1_1.value;
                        // We only deal with concrete nodes in TypeScript sources, so we don't
                        // need to handle synthetically created decorators.
                        var decoratorNode = decorator.node;
                        if (!isAngularDecorator(decorator, isCore)) {
                            decoratorsToKeep.push(decoratorNode);
                            continue;
                        }
                        toLower.push(decoratorNode);
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (decorators_1_1 && !decorators_1_1.done && (_a = decorators_1.return)) _a.call(decorators_1);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
                if (!toLower.length)
                    return [undefined, element, []];
                if (!element.name || !ts.isIdentifier(element.name)) {
                    // Method has a weird name, e.g.
                    //   [Symbol.foo]() {...}
                    diagnostics.push({
                        file: element.getSourceFile(),
                        start: element.getStart(),
                        length: element.getEnd() - element.getStart(),
                        messageText: "Cannot process decorators for class element with non-analyzable name.",
                        category: ts.DiagnosticCategory.Error,
                        code: 0,
                    });
                    return [undefined, element, []];
                }
                var name = element.name.text;
                var mutable = ts.getMutableClone(element);
                mutable.decorators = decoratorsToKeep.length ?
                    ts.setTextRange(ts.createNodeArray(decoratorsToKeep), mutable.decorators) :
                    undefined;
                return [name, mutable, toLower];
            }
            /**
             * Transforms a constructor. Returns the transformed constructor and the list of parameter
             * information collected, consisting of decorators and optional type.
             */
            function transformConstructor(ctor) {
                var e_6, _a, e_7, _b;
                ctor = ts.visitEachChild(ctor, decoratorDownlevelVisitor, context);
                var newParameters = [];
                var oldParameters = ts.visitParameterList(ctor.parameters, decoratorDownlevelVisitor, context);
                var parametersInfo = [];
                try {
                    for (var oldParameters_1 = tslib_1.__values(oldParameters), oldParameters_1_1 = oldParameters_1.next(); !oldParameters_1_1.done; oldParameters_1_1 = oldParameters_1.next()) {
                        var param = oldParameters_1_1.value;
                        var decoratorsToKeep = [];
                        var paramInfo = { decorators: [], type: null };
                        var decorators = host.getDecoratorsOfDeclaration(param) || [];
                        try {
                            for (var decorators_2 = (e_7 = void 0, tslib_1.__values(decorators)), decorators_2_1 = decorators_2.next(); !decorators_2_1.done; decorators_2_1 = decorators_2.next()) {
                                var decorator = decorators_2_1.value;
                                // We only deal with concrete nodes in TypeScript sources, so we don't
                                // need to handle synthetically created decorators.
                                var decoratorNode = decorator.node;
                                if (!isAngularDecorator(decorator, isCore)) {
                                    decoratorsToKeep.push(decoratorNode);
                                    continue;
                                }
                                paramInfo.decorators.push(decoratorNode);
                            }
                        }
                        catch (e_7_1) { e_7 = { error: e_7_1 }; }
                        finally {
                            try {
                                if (decorators_2_1 && !decorators_2_1.done && (_b = decorators_2.return)) _b.call(decorators_2);
                            }
                            finally { if (e_7) throw e_7.error; }
                        }
                        if (param.type) {
                            // param has a type provided, e.g. "foo: Bar".
                            // The type will be emitted as a value expression in entityNameToExpression, which takes
                            // care not to emit anything for types that cannot be expressed as a value (e.g.
                            // interfaces).
                            paramInfo.type = param.type;
                        }
                        parametersInfo.push(paramInfo);
                        var newParam = ts.updateParameter(param, 
                        // Must pass 'undefined' to avoid emitting decorator metadata.
                        decoratorsToKeep.length ? decoratorsToKeep : undefined, param.modifiers, param.dotDotDotToken, param.name, param.questionToken, param.type, param.initializer);
                        newParameters.push(newParam);
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (oldParameters_1_1 && !oldParameters_1_1.done && (_a = oldParameters_1.return)) _a.call(oldParameters_1);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
                var updated = ts.updateConstructor(ctor, ctor.decorators, ctor.modifiers, newParameters, ts.visitFunctionBody(ctor.body, decoratorDownlevelVisitor, context));
                return [updated, parametersInfo];
            }
            /**
             * Transforms a single class declaration:
             * - dispatches to strip decorators on members
             * - converts decorators on the class to annotations
             * - creates a ctorParameters property
             * - creates a propDecorators property
             */
            function transformClassDeclaration(classDecl) {
                var e_8, _a, e_9, _b;
                classDecl = ts.getMutableClone(classDecl);
                var newMembers = [];
                var decoratedProperties = new Map();
                var classParameters = null;
                try {
                    for (var _c = tslib_1.__values(classDecl.members), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var member = _d.value;
                        switch (member.kind) {
                            case ts.SyntaxKind.PropertyDeclaration:
                            case ts.SyntaxKind.GetAccessor:
                            case ts.SyntaxKind.SetAccessor:
                            case ts.SyntaxKind.MethodDeclaration: {
                                var _e = tslib_1.__read(transformClassElement(member), 3), name = _e[0], newMember = _e[1], decorators_4 = _e[2];
                                newMembers.push(newMember);
                                if (name)
                                    decoratedProperties.set(name, decorators_4);
                                continue;
                            }
                            case ts.SyntaxKind.Constructor: {
                                var ctor = member;
                                if (!ctor.body)
                                    break;
                                var _f = tslib_1.__read(transformConstructor(member), 2), newMember = _f[0], parametersInfo = _f[1];
                                classParameters = parametersInfo;
                                newMembers.push(newMember);
                                continue;
                            }
                            default:
                                break;
                        }
                        newMembers.push(ts.visitEachChild(member, decoratorDownlevelVisitor, context));
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
                var decorators = host.getDecoratorsOfDeclaration(classDecl) || [];
                var decoratorsToLower = [];
                var decoratorsToKeep = [];
                try {
                    for (var decorators_3 = tslib_1.__values(decorators), decorators_3_1 = decorators_3.next(); !decorators_3_1.done; decorators_3_1 = decorators_3.next()) {
                        var decorator = decorators_3_1.value;
                        // We only deal with concrete nodes in TypeScript sources, so we don't
                        // need to handle synthetically created decorators.
                        var decoratorNode = decorator.node;
                        if (isAngularDecorator(decorator, isCore)) {
                            decoratorsToLower.push(extractMetadataFromSingleDecorator(decoratorNode, diagnostics));
                        }
                        else {
                            decoratorsToKeep.push(decoratorNode);
                        }
                    }
                }
                catch (e_9_1) { e_9 = { error: e_9_1 }; }
                finally {
                    try {
                        if (decorators_3_1 && !decorators_3_1.done && (_b = decorators_3.return)) _b.call(decorators_3);
                    }
                    finally { if (e_9) throw e_9.error; }
                }
                var newClassDeclaration = ts.getMutableClone(classDecl);
                if (decoratorsToLower.length) {
                    newMembers.push(createDecoratorClassProperty(decoratorsToLower));
                }
                if (classParameters) {
                    if ((decoratorsToLower.length) || classParameters.some(function (p) { return !!p.decorators.length; })) {
                        // emit ctorParameters if the class was decoratored at all, or if any of its ctors
                        // were classParameters
                        newMembers.push(createCtorParametersClassProperty(diagnostics, entityNameToExpression, classParameters, isClosureCompilerEnabled));
                    }
                }
                if (decoratedProperties.size) {
                    newMembers.push(createPropDecoratorsClassProperty(diagnostics, decoratedProperties));
                }
                newClassDeclaration.members = ts.setTextRange(ts.createNodeArray(newMembers, newClassDeclaration.members.hasTrailingComma), classDecl.members);
                newClassDeclaration.decorators =
                    decoratorsToKeep.length ? ts.createNodeArray(decoratorsToKeep) : undefined;
                return newClassDeclaration;
            }
            /**
             * Transformer visitor that looks for Angular decorators and replaces them with
             * downleveled static properties. Also collects constructor type metadata for
             * class declaration that are decorated with an Angular decorator.
             */
            function decoratorDownlevelVisitor(node) {
                if (ts.isClassDeclaration(node)) {
                    return transformClassDeclaration(node);
                }
                return ts.visitEachChild(node, decoratorDownlevelVisitor, context);
            }
            return function (sf) {
                // Ensure that referenced type symbols are not elided by TypeScript. Imports for
                // such parameter type symbols previously could be type-only, but now might be also
                // used in the `ctorParameters` static property as a value. We want to make sure
                // that TypeScript does not elide imports for such type references. Read more
                // about this in the description for `patchAliasReferenceResolution`.
                patch_alias_reference_resolution_1.patchAliasReferenceResolutionOrDie(context, referencedParameterTypes);
                // Downlevel decorators and constructor parameter types. We will keep track of all
                // referenced constructor parameter types so that we can instruct TypeScript to
                // not elide their imports if they previously were only type-only.
                return ts.visitEachChild(sf, decoratorDownlevelVisitor, context);
            };
        };
    }
    exports.getDownlevelDecoratorsTransform = getDownlevelDecoratorsTransform;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG93bmxldmVsX2RlY29yYXRvcnNfdHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvZG93bmxldmVsX2RlY29yYXRvcnNfdHJhbnNmb3JtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsNEhBQWdIO0lBRWhIOzs7T0FHRztJQUNILFNBQVMsa0JBQWtCLENBQUMsU0FBb0IsRUFBRSxNQUFlO1FBQy9ELE9BQU8sTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssZUFBZSxDQUFDLENBQUM7SUFDNUYsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQW9CRTtJQUVGOzs7T0FHRztJQUNILFNBQVMsNkJBQTZCO1FBQ3BDLElBQU0sWUFBWSxHQUFxQixFQUFFLENBQUM7UUFDMUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsdUJBQXVCLENBQ3hDLFNBQVMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUM1QixFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDeEYsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsdUJBQXVCLENBQ3hDLFNBQVMsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxFQUM5RCxFQUFFLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxTQUFTLENB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dEUsa0ZBQWtGO2dCQUNsRiwrRUFBK0U7Z0JBQy9FLGtFQUFrRTtnQkFDbEUsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSx5QkFBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNuRSxDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7SUFDSixDQUFDO0lBM1BELDBFQTJQQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge2lzQWxpYXNJbXBvcnREZWNsYXJhdGlvbiwgcGF0Y2hBbGlhc1JlZmVyZW5jZVJlc29sdXRpb25PckRpZX0gZnJvbSAnLi9wYXRjaF9hbGlhc19yZWZlcmVuY2VfcmVzb2x1dGlvbic7XG5cbi8qKlxuICogV2hldGhlciBhIGdpdmVuIGRlY29yYXRvciBzaG91bGQgYmUgdHJlYXRlZCBhcyBhbiBBbmd1bGFyIGRlY29yYXRvci5cbiAqIEVpdGhlciBpdCdzIHVzZWQgaW4gQGFuZ3VsYXIvY29yZSwgb3IgaXQncyBpbXBvcnRlZCBmcm9tIHRoZXJlLlxuICovXG5mdW5jdGlvbiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGlzQ29yZTogYm9vbGVhbik6IGJvb2xlYW4ge1xuICByZXR1cm4gaXNDb3JlIHx8IChkZWNvcmF0b3IuaW1wb3J0ICE9PSBudWxsICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnKTtcbn1cblxuLypcbiAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgQ29kZSBiZWxvdyBoYXMgYmVlbiBleHRyYWN0ZWQgZnJvbSB0aGUgdHNpY2tsZSBkZWNvcmF0b3IgZG93bmxldmVsIHRyYW5zZm9ybWVyXG4gIGFuZCBhIGZldyBsb2NhbCBtb2RpZmljYXRpb25zIGhhdmUgYmVlbiBhcHBsaWVkOlxuXG4gICAgMS4gVHNpY2tsZSBieSBkZWZhdWx0IHByb2Nlc3NlZCBhbGwgZGVjb3JhdG9ycyB0aGF0IGhhZCB0aGUgYEBBbm5vdGF0aW9uYCBKU0RvYy5cbiAgICAgICBXZSBtb2RpZmllZCB0aGUgdHJhbnNmb3JtIHRvIG9ubHkgYmUgY29uY2VybmVkIHdpdGgga25vd24gQW5ndWxhciBkZWNvcmF0b3JzLlxuICAgIDIuIFRzaWNrbGUgYnkgZGVmYXVsdCBhZGRlZCBgQG5vY29sbGFwc2VgIHRvIGFsbCBnZW5lcmF0ZWQgYGN0b3JQYXJhbWV0ZXJzYCBwcm9wZXJ0aWVzLlxuICAgICAgIFdlIG9ubHkgZG8gdGhpcyB3aGVuIGBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcmAgaXMgZW5hYmxlZC5cbiAgICAzLiBUc2lja2xlIGRvZXMgbm90IGhhbmRsZSB1bmlvbiB0eXBlcyBmb3IgZGVwZW5kZW5jeSBpbmplY3Rpb24uIGkuZS4gaWYgYSBpbmplY3RlZCB0eXBlXG4gICAgICAgaXMgZGVub3RlZCB3aXRoIGBAT3B0aW9uYWxgLCB0aGUgYWN0dWFsIHR5cGUgY291bGQgYmUgc2V0IHRvIGBUIHwgbnVsbGAuXG4gICAgICAgU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLWNsaS9jb21taXQvODI2ODAzZDA3MzZiODA3ODY3Y2FmZjlmODkwM2U1MDg5NzBhZDVlNC5cbiAgICA0LiBUc2lja2xlIHJlbGllZCBvbiBgZW1pdERlY29yYXRvck1ldGFkYXRhYCB0byBiZSBzZXQgdG8gYHRydWVgLiBUaGlzIGlzIGR1ZSB0byBhIGxpbWl0YXRpb25cbiAgICAgICBpbiBUeXBlU2NyaXB0IHRyYW5zZm9ybWVycyB0aGF0IG5ldmVyIGhhcyBiZWVuIGZpeGVkLiBXZSB3ZXJlIGFibGUgdG8gd29yayBhcm91bmQgdGhpc1xuICAgICAgIGxpbWl0YXRpb24gc28gdGhhdCBgZW1pdERlY29yYXRvck1ldGFkYXRhYCBkb2Vzbid0IG5lZWQgdG8gYmUgc3BlY2lmaWVkLlxuICAgICAgIFNlZTogYHBhdGNoQWxpYXNSZWZlcmVuY2VSZXNvbHV0aW9uYCBmb3IgbW9yZSBkZXRhaWxzLlxuXG4gIEhlcmUgaXMgYSBsaW5rIHRvIHRoZSB0c2lja2xlIHJldmlzaW9uIG9uIHdoaWNoIHRoaXMgdHJhbnNmb3JtZXIgaXMgYmFzZWQ6XG4gIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL3RzaWNrbGUvYmxvYi9mYWUwNmJlY2IxNTcwZjQ5MTgwNjA2MGQ4M2YyOWYyZDUwYzQzY2RkL3NyYy9kZWNvcmF0b3JfZG93bmxldmVsX3RyYW5zZm9ybWVyLnRzXG4gIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4qL1xuXG4vKipcbiAqIENyZWF0ZXMgdGhlIEFTVCBmb3IgdGhlIGRlY29yYXRvciBmaWVsZCB0eXBlIGFubm90YXRpb24sIHdoaWNoIGhhcyB0aGUgZm9ybVxuICogICAgIHsgdHlwZTogRnVuY3Rpb24sIGFyZ3M/OiBhbnlbXSB9W11cbiAqL1xuZnVuY3Rpb24gY3JlYXRlRGVjb3JhdG9ySW52b2NhdGlvblR5cGUoKTogdHMuVHlwZU5vZGUge1xuICBjb25zdCB0eXBlRWxlbWVudHM6IHRzLlR5cGVFbGVtZW50W10gPSBbXTtcbiAgdHlwZUVsZW1lbnRzLnB1c2godHMuY3JlYXRlUHJvcGVydHlTaWduYXR1cmUoXG4gICAgICB1bmRlZmluZWQsICd0eXBlJywgdW5kZWZpbmVkLFxuICAgICAgdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUodHMuY3JlYXRlSWRlbnRpZmllcignRnVuY3Rpb24nKSwgdW5kZWZpbmVkKSwgdW5kZWZpbmVkKSk7XG4gIHR5cGVFbGVtZW50cy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5U2lnbmF0dXJlKFxuICAgICAgdW5kZWZpbmVkLCAnYXJncycsIHRzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuUXVlc3Rpb25Ub2tlbiksXG4gICAgICB0cy5jcmVhdGVBcnJheVR5cGVOb2RlKHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKSwgdW5kZWZpbmVkKSk7XG4gIHJldHVybiB0cy5jcmVhdGVBcnJheVR5cGVOb2RlKHRzLmNyZWF0ZVR5cGVMaXRlcmFsTm9kZSh0eXBlRWxlbWVudHMpKTtcbn1cblxuLyoqXG4gKiBFeHRyYWN0cyB0aGUgdHlwZSBvZiB0aGUgZGVjb3JhdG9yICh0aGUgZnVuY3Rpb24gb3IgZXhwcmVzc2lvbiBpbnZva2VkKSwgYXMgd2VsbCBhcyBhbGwgdGhlXG4gKiBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBkZWNvcmF0b3IuIFJldHVybnMgYW4gQVNUIHdpdGggdGhlIGZvcm06XG4gKlxuICogICAgIC8vIEZvciBAZGVjb3JhdG9yKGFyZzEsIGFyZzIpXG4gKiAgICAgeyB0eXBlOiBkZWNvcmF0b3IsIGFyZ3M6IFthcmcxLCBhcmcyXSB9XG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RNZXRhZGF0YUZyb21TaW5nbGVEZWNvcmF0b3IoXG4gICAgZGVjb3JhdG9yOiB0cy5EZWNvcmF0b3IsIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10pOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB7XG4gIGNvbnN0IG1ldGFkYXRhUHJvcGVydGllczogdHMuT2JqZWN0TGl0ZXJhbEVsZW1lbnRMaWtlW10gPSBbXTtcbiAgY29uc3QgZXhwciA9IGRlY29yYXRvci5leHByZXNzaW9uO1xuICBzd2l0Y2ggKGV4cHIua2luZCkge1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyOlxuICAgICAgLy8gVGhlIGRlY29yYXRvciB3YXMgYSBwbGFpbiBARm9vLlxuICAgICAgbWV0YWRhdGFQcm9wZXJ0aWVzLnB1c2godHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KCd0eXBlJywgZXhwcikpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uOlxuICAgICAgLy8gVGhlIGRlY29yYXRvciB3YXMgYSBjYWxsLCBsaWtlIEBGb28oYmFyKS5cbiAgICAgIGNvbnN0IGNhbGwgPSBleHByIGFzIHRzLkNhbGxFeHByZXNzaW9uO1xuICAgICAgbWV0YWRhdGFQcm9wZXJ0aWVzLnB1c2godHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KCd0eXBlJywgY2FsbC5leHByZXNzaW9uKSk7XG4gICAgICBpZiAoY2FsbC5hcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGFyZ3M6IHRzLkV4cHJlc3Npb25bXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGFyZyBvZiBjYWxsLmFyZ3VtZW50cykge1xuICAgICAgICAgIGFyZ3MucHVzaChhcmcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGFyZ3NBcnJheUxpdGVyYWwgPSB0cy5jcmVhdGVBcnJheUxpdGVyYWwoYXJncyk7XG4gICAgICAgIGFyZ3NBcnJheUxpdGVyYWwuZWxlbWVudHMuaGFzVHJhaWxpbmdDb21tYSA9IHRydWU7XG4gICAgICAgIG1ldGFkYXRhUHJvcGVydGllcy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgnYXJncycsIGFyZ3NBcnJheUxpdGVyYWwpKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKHtcbiAgICAgICAgZmlsZTogZGVjb3JhdG9yLmdldFNvdXJjZUZpbGUoKSxcbiAgICAgICAgc3RhcnQ6IGRlY29yYXRvci5nZXRTdGFydCgpLFxuICAgICAgICBsZW5ndGg6IGRlY29yYXRvci5nZXRFbmQoKSAtIGRlY29yYXRvci5nZXRTdGFydCgpLFxuICAgICAgICBtZXNzYWdlVGV4dDpcbiAgICAgICAgICAgIGAke3RzLlN5bnRheEtpbmRbZGVjb3JhdG9yLmtpbmRdfSBub3QgaW1wbGVtZW50ZWQgaW4gZ2F0aGVyaW5nIGRlY29yYXRvciBtZXRhZGF0YS5gLFxuICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICBjb2RlOiAwLFxuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgfVxuICByZXR1cm4gdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChtZXRhZGF0YVByb3BlcnRpZXMpO1xufVxuXG4vKipcbiAqIFRha2VzIGEgbGlzdCBvZiBkZWNvcmF0b3IgbWV0YWRhdGEgb2JqZWN0IEFTVHMgYW5kIHByb2R1Y2VzIGFuIEFTVCBmb3IgYVxuICogc3RhdGljIGNsYXNzIHByb3BlcnR5IG9mIGFuIGFycmF5IG9mIHRob3NlIG1ldGFkYXRhIG9iamVjdHMuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZURlY29yYXRvckNsYXNzUHJvcGVydHkoZGVjb3JhdG9yTGlzdDogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb25bXSkge1xuICBjb25zdCBtb2RpZmllciA9IHRzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCk7XG4gIGNvbnN0IHR5cGUgPSBjcmVhdGVEZWNvcmF0b3JJbnZvY2F0aW9uVHlwZSgpO1xuICBjb25zdCBpbml0aWFsaXplciA9IHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChkZWNvcmF0b3JMaXN0LCB0cnVlKTtcbiAgLy8gTkI6IHRoZSAuZGVjb3JhdG9ycyBwcm9wZXJ0eSBkb2VzIG5vdCBnZXQgYSBAbm9jb2xsYXBzZSBwcm9wZXJ0eS4gVGhlcmUgaXNcbiAgLy8gbm8gZ29vZCByZWFzb24gd2h5IC0gaXQgbWVhbnMgLmRlY29yYXRvcnMgaXMgbm90IHJ1bnRpbWUgYWNjZXNzaWJsZSBpZiB5b3VcbiAgLy8gY29tcGlsZSB3aXRoIGNvbGxhcHNlIHByb3BlcnRpZXMsIHdoZXJlYXMgcHJvcERlY29yYXRvcnMgaXMsIHdoaWNoIGRvZXNuJ3RcbiAgLy8gZm9sbG93IGFueSBzdHJpbmdlbnQgbG9naWMuIEhvd2V2ZXIgdGhpcyBoYXMgYmVlbiB0aGUgY2FzZSBwcmV2aW91c2x5LCBhbmRcbiAgLy8gYWRkaW5nIGl0IGJhY2sgaW4gbGVhZHMgdG8gc3Vic3RhbnRpYWwgY29kZSBzaXplIGluY3JlYXNlcyBhcyBDbG9zdXJlIGZhaWxzXG4gIC8vIHRvIHRyZWUgc2hha2UgdGhlc2UgcHJvcHMgd2l0aG91dCBAbm9jb2xsYXBzZS5cbiAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5KHVuZGVmaW5lZCwgW21vZGlmaWVyXSwgJ2RlY29yYXRvcnMnLCB1bmRlZmluZWQsIHR5cGUsIGluaXRpYWxpemVyKTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIHRoZSBBU1QgZm9yIHRoZSAnY3RvclBhcmFtZXRlcnMnIGZpZWxkIHR5cGUgYW5ub3RhdGlvbjpcbiAqICAgKCkgPT4gKHsgdHlwZTogYW55LCBkZWNvcmF0b3JzPzoge3R5cGU6IEZ1bmN0aW9uLCBhcmdzPzogYW55W119W10gfXxudWxsKVtdXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUN0b3JQYXJhbWV0ZXJzQ2xhc3NQcm9wZXJ0eVR5cGUoKTogdHMuVHlwZU5vZGUge1xuICAvLyBTb3JyeSBhYm91dCB0aGlzLiBUcnkgcmVhZGluZyBqdXN0IHRoZSBzdHJpbmcgbGl0ZXJhbHMgYmVsb3cuXG4gIGNvbnN0IHR5cGVFbGVtZW50czogdHMuVHlwZUVsZW1lbnRbXSA9IFtdO1xuICB0eXBlRWxlbWVudHMucHVzaCh0cy5jcmVhdGVQcm9wZXJ0eVNpZ25hdHVyZShcbiAgICAgIHVuZGVmaW5lZCwgJ3R5cGUnLCB1bmRlZmluZWQsXG4gICAgICB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZSh0cy5jcmVhdGVJZGVudGlmaWVyKCdhbnknKSwgdW5kZWZpbmVkKSwgdW5kZWZpbmVkKSk7XG4gIHR5cGVFbGVtZW50cy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5U2lnbmF0dXJlKFxuICAgICAgdW5kZWZpbmVkLCAnZGVjb3JhdG9ycycsIHRzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuUXVlc3Rpb25Ub2tlbiksXG4gICAgICB0cy5jcmVhdGVBcnJheVR5cGVOb2RlKHRzLmNyZWF0ZVR5cGVMaXRlcmFsTm9kZShbXG4gICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5U2lnbmF0dXJlKFxuICAgICAgICAgICAgdW5kZWZpbmVkLCAndHlwZScsIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKHRzLmNyZWF0ZUlkZW50aWZpZXIoJ0Z1bmN0aW9uJyksIHVuZGVmaW5lZCksIHVuZGVmaW5lZCksXG4gICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5U2lnbmF0dXJlKFxuICAgICAgICAgICAgdW5kZWZpbmVkLCAnYXJncycsIHRzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuUXVlc3Rpb25Ub2tlbiksXG4gICAgICAgICAgICB0cy5jcmVhdGVBcnJheVR5cGVOb2RlKFxuICAgICAgICAgICAgICAgIHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKHRzLmNyZWF0ZUlkZW50aWZpZXIoJ2FueScpLCB1bmRlZmluZWQpKSxcbiAgICAgICAgICAgIHVuZGVmaW5lZCksXG4gICAgICBdKSksXG4gICAgICB1bmRlZmluZWQpKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZUZ1bmN0aW9uVHlwZU5vZGUoXG4gICAgICB1bmRlZmluZWQsIFtdLFxuICAgICAgdHMuY3JlYXRlQXJyYXlUeXBlTm9kZShcbiAgICAgICAgICB0cy5jcmVhdGVVbmlvblR5cGVOb2RlKFt0cy5jcmVhdGVUeXBlTGl0ZXJhbE5vZGUodHlwZUVsZW1lbnRzKSwgdHMuY3JlYXRlTnVsbCgpXSkpKTtcbn1cblxuLyoqXG4gKiBTZXRzIGEgQ2xvc3VyZSBcXEBub2NvbGxhcHNlIHN5bnRoZXRpYyBjb21tZW50IG9uIHRoZSBnaXZlbiBub2RlLiBUaGlzIHByZXZlbnRzIENsb3N1cmUgQ29tcGlsZXJcbiAqIGZyb20gY29sbGFwc2luZyB0aGUgYXBwYXJlbnRseSBzdGF0aWMgcHJvcGVydHksIHdoaWNoIHdvdWxkIG1ha2UgaXQgaW1wb3NzaWJsZSB0byBmaW5kIGZvciBjb2RlXG4gKiB0cnlpbmcgdG8gZGV0ZWN0IGl0IGF0IHJ1bnRpbWUuXG4gKi9cbmZ1bmN0aW9uIGFkZE5vQ29sbGFwc2VDb21tZW50KG46IHRzLk5vZGUpIHtcbiAgdHMuc2V0U3ludGhldGljTGVhZGluZ0NvbW1lbnRzKG4sIFt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6IHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJyogQG5vY29sbGFwc2UgJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zOiAtMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kOiAtMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVHJhaWxpbmdOZXdMaW5lOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XSk7XG59XG5cbi8qKlxuICogY3JlYXRlQ3RvclBhcmFtZXRlcnNDbGFzc1Byb3BlcnR5IGNyZWF0ZXMgYSBzdGF0aWMgJ2N0b3JQYXJhbWV0ZXJzJyBwcm9wZXJ0eSBjb250YWluaW5nXG4gKiBkb3dubGV2ZWxlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24uXG4gKlxuICogVGhlIHByb3BlcnR5IGNvbnRhaW5zIGFuIGFycm93IGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhbiBhcnJheSBvZiBvYmplY3QgbGl0ZXJhbHMgb2YgdGhlIHNoYXBlOlxuICogICAgIHN0YXRpYyBjdG9yUGFyYW1ldGVycyA9ICgpID0+IFt7XG4gKiAgICAgICB0eXBlOiBTb21lQ2xhc3N8dW5kZWZpbmVkLCAgLy8gdGhlIHR5cGUgb2YgdGhlIHBhcmFtIHRoYXQncyBkZWNvcmF0ZWQsIGlmIGl0J3MgYSB2YWx1ZS5cbiAqICAgICAgIGRlY29yYXRvcnM6IFt7XG4gKiAgICAgICAgIHR5cGU6IERlY29yYXRvckZuLCAgLy8gdGhlIHR5cGUgb2YgdGhlIGRlY29yYXRvciB0aGF0J3MgaW52b2tlZC5cbiAqICAgICAgICAgYXJnczogW0FSR1NdLCAgICAgICAvLyB0aGUgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgZGVjb3JhdG9yLlxuICogICAgICAgfV1cbiAqICAgICB9XTtcbiAqL1xuZnVuY3Rpb24gY3JlYXRlQ3RvclBhcmFtZXRlcnNDbGFzc1Byb3BlcnR5KFxuICAgIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10sXG4gICAgZW50aXR5TmFtZVRvRXhwcmVzc2lvbjogKG46IHRzLkVudGl0eU5hbWUpID0+IHRzLkV4cHJlc3Npb24gfCB1bmRlZmluZWQsXG4gICAgY3RvclBhcmFtZXRlcnM6IFBhcmFtZXRlckRlY29yYXRpb25JbmZvW10sXG4gICAgaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuKTogdHMuUHJvcGVydHlEZWNsYXJhdGlvbiB7XG4gIGNvbnN0IHBhcmFtczogdHMuRXhwcmVzc2lvbltdID0gW107XG5cbiAgZm9yIChjb25zdCBjdG9yUGFyYW0gb2YgY3RvclBhcmFtZXRlcnMpIHtcbiAgICBpZiAoIWN0b3JQYXJhbS50eXBlICYmIGN0b3JQYXJhbS5kZWNvcmF0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcGFyYW1zLnB1c2godHMuY3JlYXRlTnVsbCgpKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcmFtVHlwZSA9IGN0b3JQYXJhbS50eXBlID9cbiAgICAgICAgdHlwZVJlZmVyZW5jZVRvRXhwcmVzc2lvbihlbnRpdHlOYW1lVG9FeHByZXNzaW9uLCBjdG9yUGFyYW0udHlwZSkgOlxuICAgICAgICB1bmRlZmluZWQ7XG4gICAgY29uc3QgbWVtYmVycyA9XG4gICAgICAgIFt0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoJ3R5cGUnLCBwYXJhbVR5cGUgfHwgdHMuY3JlYXRlSWRlbnRpZmllcigndW5kZWZpbmVkJykpXTtcblxuICAgIGNvbnN0IGRlY29yYXRvcnM6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGRlY28gb2YgY3RvclBhcmFtLmRlY29yYXRvcnMpIHtcbiAgICAgIGRlY29yYXRvcnMucHVzaChleHRyYWN0TWV0YWRhdGFGcm9tU2luZ2xlRGVjb3JhdG9yKGRlY28sIGRpYWdub3N0aWNzKSk7XG4gICAgfVxuICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCkge1xuICAgICAgbWVtYmVycy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgnZGVjb3JhdG9ycycsIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChkZWNvcmF0b3JzKSkpO1xuICAgIH1cbiAgICBwYXJhbXMucHVzaCh0cy5jcmVhdGVPYmplY3RMaXRlcmFsKG1lbWJlcnMpKTtcbiAgfVxuXG4gIGNvbnN0IGluaXRpYWxpemVyID0gdHMuY3JlYXRlQXJyb3dGdW5jdGlvbihcbiAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBbXSwgdW5kZWZpbmVkLCB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLkVxdWFsc0dyZWF0ZXJUaGFuVG9rZW4pLFxuICAgICAgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKHBhcmFtcywgdHJ1ZSkpO1xuICBjb25zdCB0eXBlID0gY3JlYXRlQ3RvclBhcmFtZXRlcnNDbGFzc1Byb3BlcnR5VHlwZSgpO1xuICBjb25zdCBjdG9yUHJvcCA9IHRzLmNyZWF0ZVByb3BlcnR5KFxuICAgICAgdW5kZWZpbmVkLCBbdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKV0sICdjdG9yUGFyYW1ldGVycycsIHVuZGVmaW5lZCwgdHlwZSxcbiAgICAgIGluaXRpYWxpemVyKTtcbiAgaWYgKGlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZCkge1xuICAgIGFkZE5vQ29sbGFwc2VDb21tZW50KGN0b3JQcm9wKTtcbiAgfVxuICByZXR1cm4gY3RvclByb3A7XG59XG5cbi8qKlxuICogY3JlYXRlUHJvcERlY29yYXRvcnNDbGFzc1Byb3BlcnR5IGNyZWF0ZXMgYSBzdGF0aWMgJ3Byb3BEZWNvcmF0b3JzJyBwcm9wZXJ0eSBjb250YWluaW5nIHR5cGVcbiAqIGluZm9ybWF0aW9uIGZvciBldmVyeSBwcm9wZXJ0eSB0aGF0IGhhcyBhIGRlY29yYXRvciBhcHBsaWVkLlxuICpcbiAqICAgICBzdGF0aWMgcHJvcERlY29yYXRvcnM6IHtba2V5OiBzdHJpbmddOiB7dHlwZTogRnVuY3Rpb24sIGFyZ3M/OiBhbnlbXX1bXX0gPSB7XG4gKiAgICAgICBwcm9wQTogW3t0eXBlOiBNeURlY29yYXRvciwgYXJnczogWzEsIDJdfSwgLi4uXSxcbiAqICAgICAgIC4uLlxuICogICAgIH07XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVByb3BEZWNvcmF0b3JzQ2xhc3NQcm9wZXJ0eShcbiAgICBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdLCBwcm9wZXJ0aWVzOiBNYXA8c3RyaW5nLCB0cy5EZWNvcmF0b3JbXT4pOiB0cy5Qcm9wZXJ0eURlY2xhcmF0aW9uIHtcbiAgLy8gIGBzdGF0aWMgcHJvcERlY29yYXRvcnM6IHtba2V5OiBzdHJpbmddOiBgICsge3R5cGU6IEZ1bmN0aW9uLCBhcmdzPzogYW55W119W10gKyBgfSA9IHtcXG5gKTtcbiAgY29uc3QgZW50cmllczogdHMuT2JqZWN0TGl0ZXJhbEVsZW1lbnRMaWtlW10gPSBbXTtcbiAgZm9yIChjb25zdCBbbmFtZSwgZGVjb3JhdG9yc10gb2YgcHJvcGVydGllcy5lbnRyaWVzKCkpIHtcbiAgICBlbnRyaWVzLnB1c2godHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KFxuICAgICAgICBuYW1lLFxuICAgICAgICB0cy5jcmVhdGVBcnJheUxpdGVyYWwoXG4gICAgICAgICAgICBkZWNvcmF0b3JzLm1hcChkZWNvID0+IGV4dHJhY3RNZXRhZGF0YUZyb21TaW5nbGVEZWNvcmF0b3IoZGVjbywgZGlhZ25vc3RpY3MpKSkpKTtcbiAgfVxuICBjb25zdCBpbml0aWFsaXplciA9IHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoZW50cmllcywgdHJ1ZSk7XG4gIGNvbnN0IHR5cGUgPSB0cy5jcmVhdGVUeXBlTGl0ZXJhbE5vZGUoW3RzLmNyZWF0ZUluZGV4U2lnbmF0dXJlKFxuICAgICAgdW5kZWZpbmVkLCB1bmRlZmluZWQsIFt0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsICdrZXknLCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKCdzdHJpbmcnLCB1bmRlZmluZWQpLCB1bmRlZmluZWQpXSxcbiAgICAgIGNyZWF0ZURlY29yYXRvckludm9jYXRpb25UeXBlKCkpXSk7XG4gIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eShcbiAgICAgIHVuZGVmaW5lZCwgW3RzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCldLCAncHJvcERlY29yYXRvcnMnLCB1bmRlZmluZWQsIHR5cGUsXG4gICAgICBpbml0aWFsaXplcik7XG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBleHByZXNzaW9uIHJlcHJlc2VudGluZyB0aGUgKHBvdGVudGlhbGx5KSB2YWx1ZSBwYXJ0IGZvciB0aGUgZ2l2ZW4gbm9kZS5cbiAqXG4gKiBUaGlzIGlzIGEgcGFydGlhbCByZS1pbXBsZW1lbnRhdGlvbiBvZiBUeXBlU2NyaXB0J3Mgc2VyaWFsaXplVHlwZVJlZmVyZW5jZU5vZGUuIFRoaXMgaXMgYVxuICogd29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8xNzUxNiAoc2VyaWFsaXplVHlwZVJlZmVyZW5jZU5vZGVcbiAqIG5vdCBiZWluZyBleHBvc2VkKS4gSW4gcHJhY3RpY2UgdGhpcyBpbXBsZW1lbnRhdGlvbiBpcyBzdWZmaWNpZW50IGZvciBBbmd1bGFyJ3MgdXNlIG9mIHR5cGVcbiAqIG1ldGFkYXRhLlxuICovXG5mdW5jdGlvbiB0eXBlUmVmZXJlbmNlVG9FeHByZXNzaW9uKFxuICAgIGVudGl0eU5hbWVUb0V4cHJlc3Npb246IChuOiB0cy5FbnRpdHlOYW1lKSA9PiB0cy5FeHByZXNzaW9uIHwgdW5kZWZpbmVkLFxuICAgIG5vZGU6IHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbnx1bmRlZmluZWQge1xuICBsZXQga2luZCA9IG5vZGUua2luZDtcbiAgaWYgKHRzLmlzTGl0ZXJhbFR5cGVOb2RlKG5vZGUpKSB7XG4gICAgLy8gVHJlYXQgbGl0ZXJhbCB0eXBlcyBsaWtlIHRoZWlyIGJhc2UgdHlwZSAoYm9vbGVhbiwgc3RyaW5nLCBudW1iZXIpLlxuICAgIGtpbmQgPSBub2RlLmxpdGVyYWwua2luZDtcbiAgfVxuICBzd2l0Y2ggKGtpbmQpIHtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuRnVuY3Rpb25UeXBlOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5Db25zdHJ1Y3RvclR5cGU6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcignRnVuY3Rpb24nKTtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuQXJyYXlUeXBlOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5UdXBsZVR5cGU6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcignQXJyYXknKTtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuVHlwZVByZWRpY2F0ZTpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuVHJ1ZUtleXdvcmQ6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkZhbHNlS2V5d29yZDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuQm9vbGVhbktleXdvcmQ6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcignQm9vbGVhbicpO1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5TdHJpbmdLZXl3b3JkOlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ1N0cmluZycpO1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5PYmplY3RLZXl3b3JkOlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ09iamVjdCcpO1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5OdW1iZXJLZXl3b3JkOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5OdW1lcmljTGl0ZXJhbDpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCdOdW1iZXInKTtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuVHlwZVJlZmVyZW5jZTpcbiAgICAgIGNvbnN0IHR5cGVSZWYgPSBub2RlIGFzIHRzLlR5cGVSZWZlcmVuY2VOb2RlO1xuICAgICAgLy8gSWdub3JlIGFueSBnZW5lcmljIHR5cGVzLCBqdXN0IHJldHVybiB0aGUgYmFzZSB0eXBlLlxuICAgICAgcmV0dXJuIGVudGl0eU5hbWVUb0V4cHJlc3Npb24odHlwZVJlZi50eXBlTmFtZSk7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlVuaW9uVHlwZTpcbiAgICAgIGNvbnN0IGNoaWxkVHlwZU5vZGVzID1cbiAgICAgICAgICAobm9kZSBhcyB0cy5VbmlvblR5cGVOb2RlKS50eXBlcy5maWx0ZXIodCA9PiB0LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuTnVsbEtleXdvcmQpO1xuICAgICAgcmV0dXJuIGNoaWxkVHlwZU5vZGVzLmxlbmd0aCA9PT0gMSA/XG4gICAgICAgICAgdHlwZVJlZmVyZW5jZVRvRXhwcmVzc2lvbihlbnRpdHlOYW1lVG9FeHByZXNzaW9uLCBjaGlsZFR5cGVOb2Rlc1swXSkgOlxuICAgICAgICAgIHVuZGVmaW5lZDtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gc3ltYm9sIHJlZmVycyB0byBhIHZhbHVlIChhcyBkaXN0aW5jdCBmcm9tIGEgdHlwZSkuXG4gKlxuICogRXhwYW5kcyBhbGlhc2VzLCB3aGljaCBpcyBpbXBvcnRhbnQgZm9yIHRoZSBjYXNlIHdoZXJlXG4gKiAgIGltcG9ydCAqIGFzIHggZnJvbSAnc29tZS1tb2R1bGUnO1xuICogYW5kIHggaXMgbm93IGEgdmFsdWUgKHRoZSBtb2R1bGUgb2JqZWN0KS5cbiAqL1xuZnVuY3Rpb24gc3ltYm9sSXNWYWx1ZSh0YzogdHMuVHlwZUNoZWNrZXIsIHN5bTogdHMuU3ltYm9sKTogYm9vbGVhbiB7XG4gIGlmIChzeW0uZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5BbGlhcykgc3ltID0gdGMuZ2V0QWxpYXNlZFN5bWJvbChzeW0pO1xuICByZXR1cm4gKHN5bS5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLlZhbHVlKSAhPT0gMDtcbn1cblxuLyoqIFBhcmFtZXRlckRlY29yYXRpb25JbmZvIGRlc2NyaWJlcyB0aGUgaW5mb3JtYXRpb24gZm9yIGEgc2luZ2xlIGNvbnN0cnVjdG9yIHBhcmFtZXRlci4gKi9cbmludGVyZmFjZSBQYXJhbWV0ZXJEZWNvcmF0aW9uSW5mbyB7XG4gIC8qKlxuICAgKiBUaGUgdHlwZSBkZWNsYXJhdGlvbiBmb3IgdGhlIHBhcmFtZXRlci4gT25seSBzZXQgaWYgdGhlIHR5cGUgaXMgYSB2YWx1ZSAoZS5nLiBhIGNsYXNzLCBub3QgYW5cbiAgICogaW50ZXJmYWNlKS5cbiAgICovXG4gIHR5cGU6IHRzLlR5cGVOb2RlfG51bGw7XG4gIC8qKiBUaGUgbGlzdCBvZiBkZWNvcmF0b3JzIGZvdW5kIG9uIHRoZSBwYXJhbWV0ZXIsIG51bGwgaWYgbm9uZS4gKi9cbiAgZGVjb3JhdG9yczogdHMuRGVjb3JhdG9yW107XG59XG5cbi8qKlxuICogR2V0cyBhIHRyYW5zZm9ybWVyIGZvciBkb3dubGV2ZWxpbmcgQW5ndWxhciBkZWNvcmF0b3JzLlxuICogQHBhcmFtIHR5cGVDaGVja2VyIFJlZmVyZW5jZSB0byB0aGUgcHJvZ3JhbSdzIHR5cGUgY2hlY2tlci5cbiAqIEBwYXJhbSBob3N0IFJlZmxlY3Rpb24gaG9zdCB0aGF0IGlzIHVzZWQgZm9yIGRldGVybWluaW5nIGRlY29yYXRvcnMuXG4gKiBAcGFyYW0gZGlhZ25vc3RpY3MgTGlzdCB3aGljaCB3aWxsIGJlIHBvcHVsYXRlZCB3aXRoIGRpYWdub3N0aWNzIGlmIGFueS5cbiAqIEBwYXJhbSBpc0NvcmUgV2hldGhlciB0aGUgY3VycmVudCBUeXBlU2NyaXB0IHByb2dyYW0gaXMgZm9yIHRoZSBgQGFuZ3VsYXIvY29yZWAgcGFja2FnZS5cbiAqIEBwYXJhbSBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQgV2hldGhlciBjbG9zdXJlIGFubm90YXRpb25zIG5lZWQgdG8gYmUgYWRkZWQgd2hlcmUgbmVlZGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RG93bmxldmVsRGVjb3JhdG9yc1RyYW5zZm9ybShcbiAgICB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIGhvc3Q6IFJlZmxlY3Rpb25Ib3N0LCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdLFxuICAgIGlzQ29yZTogYm9vbGVhbiwgaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuKTogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpID0+IHtcbiAgICBsZXQgcmVmZXJlbmNlZFBhcmFtZXRlclR5cGVzID0gbmV3IFNldDx0cy5EZWNsYXJhdGlvbj4oKTtcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGFuIEVudGl0eU5hbWUgKGZyb20gYSB0eXBlIGFubm90YXRpb24pIHRvIGFuIGV4cHJlc3Npb24gKGFjY2Vzc2luZyBhIHZhbHVlKS5cbiAgICAgKlxuICAgICAqIEZvciBhIGdpdmVuIHF1YWxpZmllZCBuYW1lLCB0aGlzIHdhbGtzIGRlcHRoIGZpcnN0IHRvIGZpbmQgdGhlIGxlZnRtb3N0IGlkZW50aWZpZXIsXG4gICAgICogYW5kIHRoZW4gY29udmVydHMgdGhlIHBhdGggaW50byBhIHByb3BlcnR5IGFjY2VzcyB0aGF0IGNhbiBiZSB1c2VkIGFzIGV4cHJlc3Npb24uXG4gICAgICovXG4gICAgZnVuY3Rpb24gZW50aXR5TmFtZVRvRXhwcmVzc2lvbihuYW1lOiB0cy5FbnRpdHlOYW1lKTogdHMuRXhwcmVzc2lvbnx1bmRlZmluZWQge1xuICAgICAgY29uc3Qgc3ltYm9sID0gdHlwZUNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihuYW1lKTtcbiAgICAgIC8vIENoZWNrIGlmIHRoZSBlbnRpdHkgbmFtZSByZWZlcmVuY2VzIGEgc3ltYm9sIHRoYXQgaXMgYW4gYWN0dWFsIHZhbHVlLiBJZiBpdCBpcyBub3QsIGl0XG4gICAgICAvLyBjYW5ub3QgYmUgcmVmZXJlbmNlZCBieSBhbiBleHByZXNzaW9uLCBzbyByZXR1cm4gdW5kZWZpbmVkLlxuICAgICAgaWYgKCFzeW1ib2wgfHwgIXN5bWJvbElzVmFsdWUodHlwZUNoZWNrZXIsIHN5bWJvbCkgfHwgIXN5bWJvbC5kZWNsYXJhdGlvbnMgfHxcbiAgICAgICAgICBzeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgLy8gSWYgd2UgZGVhbCB3aXRoIGEgcXVhbGlmaWVkIG5hbWUsIGJ1aWxkIHVwIGEgcHJvcGVydHkgYWNjZXNzIGV4cHJlc3Npb25cbiAgICAgIC8vIHRoYXQgY291bGQgYmUgdXNlZCBpbiB0aGUgSmF2YVNjcmlwdCBvdXRwdXQuXG4gICAgICBpZiAodHMuaXNRdWFsaWZpZWROYW1lKG5hbWUpKSB7XG4gICAgICAgIGNvbnN0IGNvbnRhaW5lckV4cHIgPSBlbnRpdHlOYW1lVG9FeHByZXNzaW9uKG5hbWUubGVmdCk7XG4gICAgICAgIGlmIChjb250YWluZXJFeHByID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyhjb250YWluZXJFeHByLCBuYW1lLnJpZ2h0KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlY2wgPSBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgICAgLy8gSWYgdGhlIGdpdmVuIGVudGl0eSBuYW1lIGhhcyBiZWVuIHJlc29sdmVkIHRvIGFuIGFsaWFzIGltcG9ydCBkZWNsYXJhdGlvbixcbiAgICAgIC8vIGVuc3VyZSB0aGF0IHRoZSBhbGlhcyBkZWNsYXJhdGlvbiBpcyBub3QgZWxpZGVkIGJ5IFR5cGVTY3JpcHQsIGFuZCB1c2UgaXRzXG4gICAgICAvLyBuYW1lIGlkZW50aWZpZXIgdG8gcmVmZXJlbmNlIGl0IGF0IHJ1bnRpbWUuXG4gICAgICBpZiAoaXNBbGlhc0ltcG9ydERlY2xhcmF0aW9uKGRlY2wpKSB7XG4gICAgICAgIHJlZmVyZW5jZWRQYXJhbWV0ZXJUeXBlcy5hZGQoZGVjbCk7XG4gICAgICAgIC8vIElmIHRoZSBlbnRpdHkgbmFtZSByZXNvbHZlcyB0byBhbiBhbGlhcyBpbXBvcnQgZGVjbGFyYXRpb24sIHdlIHJlZmVyZW5jZSB0aGVcbiAgICAgICAgLy8gZW50aXR5IGJhc2VkIG9uIHRoZSBhbGlhcyBpbXBvcnQgbmFtZS4gVGhpcyBlbnN1cmVzIHRoYXQgVHlwZVNjcmlwdCBwcm9wZXJseVxuICAgICAgICAvLyByZXNvbHZlcyB0aGUgbGluayB0byB0aGUgaW1wb3J0LiBDbG9uaW5nIHRoZSBvcmlnaW5hbCBlbnRpdHkgbmFtZSBpZGVudGlmaWVyXG4gICAgICAgIC8vIGNvdWxkIGxlYWQgdG8gYW4gaW5jb3JyZWN0IHJlc29sdXRpb24gYXQgbG9jYWwgc2NvcGUuIGUuZy4gQ29uc2lkZXIgdGhlIGZvbGxvd2luZ1xuICAgICAgICAvLyBzbmlwcGV0OiBgY29uc3RydWN0b3IoRGVwOiBEZXApIHt9YC4gSW4gc3VjaCBhIGNhc2UsIHRoZSBsb2NhbCBgRGVwYCBpZGVudGlmaWVyXG4gICAgICAgIC8vIHdvdWxkIHJlc29sdmUgdG8gdGhlIGFjdHVhbCBwYXJhbWV0ZXIgbmFtZSwgYW5kIG5vdCB0byB0aGUgZGVzaXJlZCBpbXBvcnQuXG4gICAgICAgIC8vIFRoaXMgaGFwcGVucyBiZWNhdXNlIHRoZSBlbnRpdHkgbmFtZSBpZGVudGlmaWVyIHN5bWJvbCBpcyBpbnRlcm5hbGx5IGNvbnNpZGVyZWRcbiAgICAgICAgLy8gYXMgdHlwZS1vbmx5IGFuZCB0aGVyZWZvcmUgVHlwZVNjcmlwdCB0cmllcyB0byByZXNvbHZlIGl0IGFzIHZhbHVlIG1hbnVhbGx5LlxuICAgICAgICAvLyBXZSBjYW4gaGVscCBUeXBlU2NyaXB0IGFuZCBhdm9pZCB0aGlzIG5vbi1yZWxpYWJsZSByZXNvbHV0aW9uIGJ5IHVzaW5nIGFuIGlkZW50aWZpZXJcbiAgICAgICAgLy8gdGhhdCBpcyBub3QgdHlwZS1vbmx5IGFuZCBpcyBkaXJlY3RseSBsaW5rZWQgdG8gdGhlIGltcG9ydCBhbGlhcyBkZWNsYXJhdGlvbi5cbiAgICAgICAgaWYgKGRlY2wubmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIHRzLmdldE11dGFibGVDbG9uZShkZWNsLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBDbG9uZSB0aGUgb3JpZ2luYWwgZW50aXR5IG5hbWUgaWRlbnRpZmllciBzbyB0aGF0IGl0IGNhbiBiZSB1c2VkIHRvIHJlZmVyZW5jZVxuICAgICAgLy8gaXRzIHZhbHVlIGF0IHJ1bnRpbWUuIFRoaXMgaXMgdXNlZCB3aGVuIHRoZSBpZGVudGlmaWVyIGlzIHJlc29sdmluZyB0byBhIGZpbGVcbiAgICAgIC8vIGxvY2FsIGRlY2xhcmF0aW9uIChvdGhlcndpc2UgaXQgd291bGQgcmVzb2x2ZSB0byBhbiBhbGlhcyBpbXBvcnQgZGVjbGFyYXRpb24pLlxuICAgICAgcmV0dXJuIHRzLmdldE11dGFibGVDbG9uZShuYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm1zIGEgY2xhc3MgZWxlbWVudC4gUmV0dXJucyBhIHRocmVlIHR1cGxlIG9mIG5hbWUsIHRyYW5zZm9ybWVkIGVsZW1lbnQsIGFuZFxuICAgICAqIGRlY29yYXRvcnMgZm91bmQuIFJldHVybnMgYW4gdW5kZWZpbmVkIG5hbWUgaWYgdGhlcmUgYXJlIG5vIGRlY29yYXRvcnMgdG8gbG93ZXIgb24gdGhlXG4gICAgICogZWxlbWVudCwgb3IgdGhlIGVsZW1lbnQgaGFzIGFuIGV4b3RpYyBuYW1lLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRyYW5zZm9ybUNsYXNzRWxlbWVudChlbGVtZW50OiB0cy5DbGFzc0VsZW1lbnQpOlxuICAgICAgICBbc3RyaW5nfHVuZGVmaW5lZCwgdHMuQ2xhc3NFbGVtZW50LCB0cy5EZWNvcmF0b3JbXV0ge1xuICAgICAgZWxlbWVudCA9IHRzLnZpc2l0RWFjaENoaWxkKGVsZW1lbnQsIGRlY29yYXRvckRvd25sZXZlbFZpc2l0b3IsIGNvbnRleHQpO1xuICAgICAgY29uc3QgZGVjb3JhdG9yc1RvS2VlcDogdHMuRGVjb3JhdG9yW10gPSBbXTtcbiAgICAgIGNvbnN0IHRvTG93ZXI6IHRzLkRlY29yYXRvcltdID0gW107XG4gICAgICBjb25zdCBkZWNvcmF0b3JzID0gaG9zdC5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihlbGVtZW50KSB8fCBbXTtcbiAgICAgIGZvciAoY29uc3QgZGVjb3JhdG9yIG9mIGRlY29yYXRvcnMpIHtcbiAgICAgICAgLy8gV2Ugb25seSBkZWFsIHdpdGggY29uY3JldGUgbm9kZXMgaW4gVHlwZVNjcmlwdCBzb3VyY2VzLCBzbyB3ZSBkb24ndFxuICAgICAgICAvLyBuZWVkIHRvIGhhbmRsZSBzeW50aGV0aWNhbGx5IGNyZWF0ZWQgZGVjb3JhdG9ycy5cbiAgICAgICAgY29uc3QgZGVjb3JhdG9yTm9kZSA9IGRlY29yYXRvci5ub2RlISBhcyB0cy5EZWNvcmF0b3I7XG4gICAgICAgIGlmICghaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvciwgaXNDb3JlKSkge1xuICAgICAgICAgIGRlY29yYXRvcnNUb0tlZXAucHVzaChkZWNvcmF0b3JOb2RlKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0b0xvd2VyLnB1c2goZGVjb3JhdG9yTm9kZSk7XG4gICAgICB9XG4gICAgICBpZiAoIXRvTG93ZXIubGVuZ3RoKSByZXR1cm4gW3VuZGVmaW5lZCwgZWxlbWVudCwgW11dO1xuXG4gICAgICBpZiAoIWVsZW1lbnQubmFtZSB8fCAhdHMuaXNJZGVudGlmaWVyKGVsZW1lbnQubmFtZSkpIHtcbiAgICAgICAgLy8gTWV0aG9kIGhhcyBhIHdlaXJkIG5hbWUsIGUuZy5cbiAgICAgICAgLy8gICBbU3ltYm9sLmZvb10oKSB7Li4ufVxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKHtcbiAgICAgICAgICBmaWxlOiBlbGVtZW50LmdldFNvdXJjZUZpbGUoKSxcbiAgICAgICAgICBzdGFydDogZWxlbWVudC5nZXRTdGFydCgpLFxuICAgICAgICAgIGxlbmd0aDogZWxlbWVudC5nZXRFbmQoKSAtIGVsZW1lbnQuZ2V0U3RhcnQoKSxcbiAgICAgICAgICBtZXNzYWdlVGV4dDogYENhbm5vdCBwcm9jZXNzIGRlY29yYXRvcnMgZm9yIGNsYXNzIGVsZW1lbnQgd2l0aCBub24tYW5hbHl6YWJsZSBuYW1lLmAsXG4gICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBjb2RlOiAwLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIFt1bmRlZmluZWQsIGVsZW1lbnQsIFtdXTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbmFtZSA9IChlbGVtZW50Lm5hbWUgYXMgdHMuSWRlbnRpZmllcikudGV4dDtcbiAgICAgIGNvbnN0IG11dGFibGUgPSB0cy5nZXRNdXRhYmxlQ2xvbmUoZWxlbWVudCk7XG4gICAgICBtdXRhYmxlLmRlY29yYXRvcnMgPSBkZWNvcmF0b3JzVG9LZWVwLmxlbmd0aCA/XG4gICAgICAgICAgdHMuc2V0VGV4dFJhbmdlKHRzLmNyZWF0ZU5vZGVBcnJheShkZWNvcmF0b3JzVG9LZWVwKSwgbXV0YWJsZS5kZWNvcmF0b3JzKSA6XG4gICAgICAgICAgdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuIFtuYW1lLCBtdXRhYmxlLCB0b0xvd2VyXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm1zIGEgY29uc3RydWN0b3IuIFJldHVybnMgdGhlIHRyYW5zZm9ybWVkIGNvbnN0cnVjdG9yIGFuZCB0aGUgbGlzdCBvZiBwYXJhbWV0ZXJcbiAgICAgKiBpbmZvcm1hdGlvbiBjb2xsZWN0ZWQsIGNvbnNpc3Rpbmcgb2YgZGVjb3JhdG9ycyBhbmQgb3B0aW9uYWwgdHlwZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0cmFuc2Zvcm1Db25zdHJ1Y3RvcihjdG9yOiB0cy5Db25zdHJ1Y3RvckRlY2xhcmF0aW9uKTpcbiAgICAgICAgW3RzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb24sIFBhcmFtZXRlckRlY29yYXRpb25JbmZvW11dIHtcbiAgICAgIGN0b3IgPSB0cy52aXNpdEVhY2hDaGlsZChjdG9yLCBkZWNvcmF0b3JEb3dubGV2ZWxWaXNpdG9yLCBjb250ZXh0KTtcblxuICAgICAgY29uc3QgbmV3UGFyYW1ldGVyczogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25bXSA9IFtdO1xuICAgICAgY29uc3Qgb2xkUGFyYW1ldGVycyA9XG4gICAgICAgICAgdHMudmlzaXRQYXJhbWV0ZXJMaXN0KGN0b3IucGFyYW1ldGVycywgZGVjb3JhdG9yRG93bmxldmVsVmlzaXRvciwgY29udGV4dCk7XG4gICAgICBjb25zdCBwYXJhbWV0ZXJzSW5mbzogUGFyYW1ldGVyRGVjb3JhdGlvbkluZm9bXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBwYXJhbSBvZiBvbGRQYXJhbWV0ZXJzKSB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnNUb0tlZXA6IHRzLkRlY29yYXRvcltdID0gW107XG4gICAgICAgIGNvbnN0IHBhcmFtSW5mbzogUGFyYW1ldGVyRGVjb3JhdGlvbkluZm8gPSB7ZGVjb3JhdG9yczogW10sIHR5cGU6IG51bGx9O1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gaG9zdC5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihwYXJhbSkgfHwgW107XG5cbiAgICAgICAgZm9yIChjb25zdCBkZWNvcmF0b3Igb2YgZGVjb3JhdG9ycykge1xuICAgICAgICAgIC8vIFdlIG9ubHkgZGVhbCB3aXRoIGNvbmNyZXRlIG5vZGVzIGluIFR5cGVTY3JpcHQgc291cmNlcywgc28gd2UgZG9uJ3RcbiAgICAgICAgICAvLyBuZWVkIHRvIGhhbmRsZSBzeW50aGV0aWNhbGx5IGNyZWF0ZWQgZGVjb3JhdG9ycy5cbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3JOb2RlID0gZGVjb3JhdG9yLm5vZGUhIGFzIHRzLkRlY29yYXRvcjtcbiAgICAgICAgICBpZiAoIWlzQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3IsIGlzQ29yZSkpIHtcbiAgICAgICAgICAgIGRlY29yYXRvcnNUb0tlZXAucHVzaChkZWNvcmF0b3JOb2RlKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwYXJhbUluZm8hLmRlY29yYXRvcnMucHVzaChkZWNvcmF0b3JOb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFyYW0udHlwZSkge1xuICAgICAgICAgIC8vIHBhcmFtIGhhcyBhIHR5cGUgcHJvdmlkZWQsIGUuZy4gXCJmb286IEJhclwiLlxuICAgICAgICAgIC8vIFRoZSB0eXBlIHdpbGwgYmUgZW1pdHRlZCBhcyBhIHZhbHVlIGV4cHJlc3Npb24gaW4gZW50aXR5TmFtZVRvRXhwcmVzc2lvbiwgd2hpY2ggdGFrZXNcbiAgICAgICAgICAvLyBjYXJlIG5vdCB0byBlbWl0IGFueXRoaW5nIGZvciB0eXBlcyB0aGF0IGNhbm5vdCBiZSBleHByZXNzZWQgYXMgYSB2YWx1ZSAoZS5nLlxuICAgICAgICAgIC8vIGludGVyZmFjZXMpLlxuICAgICAgICAgIHBhcmFtSW5mbyEudHlwZSA9IHBhcmFtLnR5cGU7XG4gICAgICAgIH1cbiAgICAgICAgcGFyYW1ldGVyc0luZm8ucHVzaChwYXJhbUluZm8pO1xuICAgICAgICBjb25zdCBuZXdQYXJhbSA9IHRzLnVwZGF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgIHBhcmFtLFxuICAgICAgICAgICAgLy8gTXVzdCBwYXNzICd1bmRlZmluZWQnIHRvIGF2b2lkIGVtaXR0aW5nIGRlY29yYXRvciBtZXRhZGF0YS5cbiAgICAgICAgICAgIGRlY29yYXRvcnNUb0tlZXAubGVuZ3RoID8gZGVjb3JhdG9yc1RvS2VlcCA6IHVuZGVmaW5lZCwgcGFyYW0ubW9kaWZpZXJzLFxuICAgICAgICAgICAgcGFyYW0uZG90RG90RG90VG9rZW4sIHBhcmFtLm5hbWUsIHBhcmFtLnF1ZXN0aW9uVG9rZW4sIHBhcmFtLnR5cGUsIHBhcmFtLmluaXRpYWxpemVyKTtcbiAgICAgICAgbmV3UGFyYW1ldGVycy5wdXNoKG5ld1BhcmFtKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHVwZGF0ZWQgPSB0cy51cGRhdGVDb25zdHJ1Y3RvcihcbiAgICAgICAgICBjdG9yLCBjdG9yLmRlY29yYXRvcnMsIGN0b3IubW9kaWZpZXJzLCBuZXdQYXJhbWV0ZXJzLFxuICAgICAgICAgIHRzLnZpc2l0RnVuY3Rpb25Cb2R5KGN0b3IuYm9keSwgZGVjb3JhdG9yRG93bmxldmVsVmlzaXRvciwgY29udGV4dCkpO1xuICAgICAgcmV0dXJuIFt1cGRhdGVkLCBwYXJhbWV0ZXJzSW5mb107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJhbnNmb3JtcyBhIHNpbmdsZSBjbGFzcyBkZWNsYXJhdGlvbjpcbiAgICAgKiAtIGRpc3BhdGNoZXMgdG8gc3RyaXAgZGVjb3JhdG9ycyBvbiBtZW1iZXJzXG4gICAgICogLSBjb252ZXJ0cyBkZWNvcmF0b3JzIG9uIHRoZSBjbGFzcyB0byBhbm5vdGF0aW9uc1xuICAgICAqIC0gY3JlYXRlcyBhIGN0b3JQYXJhbWV0ZXJzIHByb3BlcnR5XG4gICAgICogLSBjcmVhdGVzIGEgcHJvcERlY29yYXRvcnMgcHJvcGVydHlcbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0cmFuc2Zvcm1DbGFzc0RlY2xhcmF0aW9uKGNsYXNzRGVjbDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IHRzLkNsYXNzRGVjbGFyYXRpb24ge1xuICAgICAgY2xhc3NEZWNsID0gdHMuZ2V0TXV0YWJsZUNsb25lKGNsYXNzRGVjbCk7XG5cbiAgICAgIGNvbnN0IG5ld01lbWJlcnM6IHRzLkNsYXNzRWxlbWVudFtdID0gW107XG4gICAgICBjb25zdCBkZWNvcmF0ZWRQcm9wZXJ0aWVzID0gbmV3IE1hcDxzdHJpbmcsIHRzLkRlY29yYXRvcltdPigpO1xuICAgICAgbGV0IGNsYXNzUGFyYW1ldGVyczogUGFyYW1ldGVyRGVjb3JhdGlvbkluZm9bXXxudWxsID0gbnVsbDtcblxuICAgICAgZm9yIChjb25zdCBtZW1iZXIgb2YgY2xhc3NEZWNsLm1lbWJlcnMpIHtcbiAgICAgICAgc3dpdGNoIChtZW1iZXIua2luZCkge1xuICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5Qcm9wZXJ0eURlY2xhcmF0aW9uOlxuICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5HZXRBY2Nlc3NvcjpcbiAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuU2V0QWNjZXNzb3I6XG4gICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLk1ldGhvZERlY2xhcmF0aW9uOiB7XG4gICAgICAgICAgICBjb25zdCBbbmFtZSwgbmV3TWVtYmVyLCBkZWNvcmF0b3JzXSA9IHRyYW5zZm9ybUNsYXNzRWxlbWVudChtZW1iZXIpO1xuICAgICAgICAgICAgbmV3TWVtYmVycy5wdXNoKG5ld01lbWJlcik7XG4gICAgICAgICAgICBpZiAobmFtZSkgZGVjb3JhdGVkUHJvcGVydGllcy5zZXQobmFtZSwgZGVjb3JhdG9ycyk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkNvbnN0cnVjdG9yOiB7XG4gICAgICAgICAgICBjb25zdCBjdG9yID0gbWVtYmVyIGFzIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb247XG4gICAgICAgICAgICBpZiAoIWN0b3IuYm9keSkgYnJlYWs7XG4gICAgICAgICAgICBjb25zdCBbbmV3TWVtYmVyLCBwYXJhbWV0ZXJzSW5mb10gPVxuICAgICAgICAgICAgICAgIHRyYW5zZm9ybUNvbnN0cnVjdG9yKG1lbWJlciBhcyB0cy5Db25zdHJ1Y3RvckRlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIGNsYXNzUGFyYW1ldGVycyA9IHBhcmFtZXRlcnNJbmZvO1xuICAgICAgICAgICAgbmV3TWVtYmVycy5wdXNoKG5ld01lbWJlcik7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIG5ld01lbWJlcnMucHVzaCh0cy52aXNpdEVhY2hDaGlsZChtZW1iZXIsIGRlY29yYXRvckRvd25sZXZlbFZpc2l0b3IsIGNvbnRleHQpKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBob3N0LmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGNsYXNzRGVjbCkgfHwgW107XG5cbiAgICAgIGNvbnN0IGRlY29yYXRvcnNUb0xvd2VyID0gW107XG4gICAgICBjb25zdCBkZWNvcmF0b3JzVG9LZWVwOiB0cy5EZWNvcmF0b3JbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBkZWNvcmF0b3Igb2YgZGVjb3JhdG9ycykge1xuICAgICAgICAvLyBXZSBvbmx5IGRlYWwgd2l0aCBjb25jcmV0ZSBub2RlcyBpbiBUeXBlU2NyaXB0IHNvdXJjZXMsIHNvIHdlIGRvbid0XG4gICAgICAgIC8vIG5lZWQgdG8gaGFuZGxlIHN5bnRoZXRpY2FsbHkgY3JlYXRlZCBkZWNvcmF0b3JzLlxuICAgICAgICBjb25zdCBkZWNvcmF0b3JOb2RlID0gZGVjb3JhdG9yLm5vZGUhIGFzIHRzLkRlY29yYXRvcjtcbiAgICAgICAgaWYgKGlzQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3IsIGlzQ29yZSkpIHtcbiAgICAgICAgICBkZWNvcmF0b3JzVG9Mb3dlci5wdXNoKGV4dHJhY3RNZXRhZGF0YUZyb21TaW5nbGVEZWNvcmF0b3IoZGVjb3JhdG9yTm9kZSwgZGlhZ25vc3RpY3MpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWNvcmF0b3JzVG9LZWVwLnB1c2goZGVjb3JhdG9yTm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgbmV3Q2xhc3NEZWNsYXJhdGlvbiA9IHRzLmdldE11dGFibGVDbG9uZShjbGFzc0RlY2wpO1xuXG4gICAgICBpZiAoZGVjb3JhdG9yc1RvTG93ZXIubGVuZ3RoKSB7XG4gICAgICAgIG5ld01lbWJlcnMucHVzaChjcmVhdGVEZWNvcmF0b3JDbGFzc1Byb3BlcnR5KGRlY29yYXRvcnNUb0xvd2VyKSk7XG4gICAgICB9XG4gICAgICBpZiAoY2xhc3NQYXJhbWV0ZXJzKSB7XG4gICAgICAgIGlmICgoZGVjb3JhdG9yc1RvTG93ZXIubGVuZ3RoKSB8fCBjbGFzc1BhcmFtZXRlcnMuc29tZShwID0+ICEhcC5kZWNvcmF0b3JzLmxlbmd0aCkpIHtcbiAgICAgICAgICAvLyBlbWl0IGN0b3JQYXJhbWV0ZXJzIGlmIHRoZSBjbGFzcyB3YXMgZGVjb3JhdG9yZWQgYXQgYWxsLCBvciBpZiBhbnkgb2YgaXRzIGN0b3JzXG4gICAgICAgICAgLy8gd2VyZSBjbGFzc1BhcmFtZXRlcnNcbiAgICAgICAgICBuZXdNZW1iZXJzLnB1c2goY3JlYXRlQ3RvclBhcmFtZXRlcnNDbGFzc1Byb3BlcnR5KFxuICAgICAgICAgICAgICBkaWFnbm9zdGljcywgZW50aXR5TmFtZVRvRXhwcmVzc2lvbiwgY2xhc3NQYXJhbWV0ZXJzLCBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGRlY29yYXRlZFByb3BlcnRpZXMuc2l6ZSkge1xuICAgICAgICBuZXdNZW1iZXJzLnB1c2goY3JlYXRlUHJvcERlY29yYXRvcnNDbGFzc1Byb3BlcnR5KGRpYWdub3N0aWNzLCBkZWNvcmF0ZWRQcm9wZXJ0aWVzKSk7XG4gICAgICB9XG4gICAgICBuZXdDbGFzc0RlY2xhcmF0aW9uLm1lbWJlcnMgPSB0cy5zZXRUZXh0UmFuZ2UoXG4gICAgICAgICAgdHMuY3JlYXRlTm9kZUFycmF5KG5ld01lbWJlcnMsIG5ld0NsYXNzRGVjbGFyYXRpb24ubWVtYmVycy5oYXNUcmFpbGluZ0NvbW1hKSxcbiAgICAgICAgICBjbGFzc0RlY2wubWVtYmVycyk7XG4gICAgICBuZXdDbGFzc0RlY2xhcmF0aW9uLmRlY29yYXRvcnMgPVxuICAgICAgICAgIGRlY29yYXRvcnNUb0tlZXAubGVuZ3RoID8gdHMuY3JlYXRlTm9kZUFycmF5KGRlY29yYXRvcnNUb0tlZXApIDogdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuIG5ld0NsYXNzRGVjbGFyYXRpb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJhbnNmb3JtZXIgdmlzaXRvciB0aGF0IGxvb2tzIGZvciBBbmd1bGFyIGRlY29yYXRvcnMgYW5kIHJlcGxhY2VzIHRoZW0gd2l0aFxuICAgICAqIGRvd25sZXZlbGVkIHN0YXRpYyBwcm9wZXJ0aWVzLiBBbHNvIGNvbGxlY3RzIGNvbnN0cnVjdG9yIHR5cGUgbWV0YWRhdGEgZm9yXG4gICAgICogY2xhc3MgZGVjbGFyYXRpb24gdGhhdCBhcmUgZGVjb3JhdGVkIHdpdGggYW4gQW5ndWxhciBkZWNvcmF0b3IuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZGVjb3JhdG9yRG93bmxldmVsVmlzaXRvcihub2RlOiB0cy5Ob2RlKTogdHMuTm9kZSB7XG4gICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIHJldHVybiB0cmFuc2Zvcm1DbGFzc0RlY2xhcmF0aW9uKG5vZGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRzLnZpc2l0RWFjaENoaWxkKG5vZGUsIGRlY29yYXRvckRvd25sZXZlbFZpc2l0b3IsIGNvbnRleHQpO1xuICAgIH1cblxuICAgIHJldHVybiAoc2Y6IHRzLlNvdXJjZUZpbGUpID0+IHtcbiAgICAgIC8vIEVuc3VyZSB0aGF0IHJlZmVyZW5jZWQgdHlwZSBzeW1ib2xzIGFyZSBub3QgZWxpZGVkIGJ5IFR5cGVTY3JpcHQuIEltcG9ydHMgZm9yXG4gICAgICAvLyBzdWNoIHBhcmFtZXRlciB0eXBlIHN5bWJvbHMgcHJldmlvdXNseSBjb3VsZCBiZSB0eXBlLW9ubHksIGJ1dCBub3cgbWlnaHQgYmUgYWxzb1xuICAgICAgLy8gdXNlZCBpbiB0aGUgYGN0b3JQYXJhbWV0ZXJzYCBzdGF0aWMgcHJvcGVydHkgYXMgYSB2YWx1ZS4gV2Ugd2FudCB0byBtYWtlIHN1cmVcbiAgICAgIC8vIHRoYXQgVHlwZVNjcmlwdCBkb2VzIG5vdCBlbGlkZSBpbXBvcnRzIGZvciBzdWNoIHR5cGUgcmVmZXJlbmNlcy4gUmVhZCBtb3JlXG4gICAgICAvLyBhYm91dCB0aGlzIGluIHRoZSBkZXNjcmlwdGlvbiBmb3IgYHBhdGNoQWxpYXNSZWZlcmVuY2VSZXNvbHV0aW9uYC5cbiAgICAgIHBhdGNoQWxpYXNSZWZlcmVuY2VSZXNvbHV0aW9uT3JEaWUoY29udGV4dCwgcmVmZXJlbmNlZFBhcmFtZXRlclR5cGVzKTtcbiAgICAgIC8vIERvd25sZXZlbCBkZWNvcmF0b3JzIGFuZCBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgdHlwZXMuIFdlIHdpbGwga2VlcCB0cmFjayBvZiBhbGxcbiAgICAgIC8vIHJlZmVyZW5jZWQgY29uc3RydWN0b3IgcGFyYW1ldGVyIHR5cGVzIHNvIHRoYXQgd2UgY2FuIGluc3RydWN0IFR5cGVTY3JpcHQgdG9cbiAgICAgIC8vIG5vdCBlbGlkZSB0aGVpciBpbXBvcnRzIGlmIHRoZXkgcHJldmlvdXNseSB3ZXJlIG9ubHkgdHlwZS1vbmx5LlxuICAgICAgcmV0dXJuIHRzLnZpc2l0RWFjaENoaWxkKHNmLCBkZWNvcmF0b3JEb3dubGV2ZWxWaXNpdG9yLCBjb250ZXh0KTtcbiAgICB9O1xuICB9O1xufVxuIl19