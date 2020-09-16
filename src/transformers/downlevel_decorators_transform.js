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
        // TODO(alan-agius4): Remove when we no longer support TS 3.9
        var nullLiteral = ts.createNull();
        var nullType = ts.versionMajorMinor.charAt(0) === '4' ?
            ts.createLiteralTypeNode(nullLiteral) :
            nullLiteral;
        return ts.createFunctionTypeNode(undefined, [], ts.createArrayTypeNode(ts.createUnionTypeNode([
            ts.createTypeLiteralNode(typeElements),
            nullType,
        ])));
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
                // TODO(alan-agius4): remove `t.kind !== ts.SyntaxKind.NullKeyword` when
                // TS 3.9 support is dropped. In TS 4.0 NullKeyword is a child of LiteralType.
                var childTypeNodes = node
                    .types.filter(function (t) { return t.kind !== ts.SyntaxKind.NullKeyword &&
                    !(ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword); });
                return childTypeNodes.length === 1 ?
                    typeReferenceToExpression(entityNameToExpression, childTypeNodes[0]) :
                    undefined;
            default:
                return undefined;
        }
    }
    /**
     * Checks whether a given symbol refers to a value that exists at runtime (as distinct from a type).
     *
     * Expands aliases, which is important for the case where
     *   import * as x from 'some-module';
     * and x is now a value (the module object).
     */
    function symbolIsRuntimeValue(typeChecker, symbol) {
        if (symbol.flags & ts.SymbolFlags.Alias) {
            symbol = typeChecker.getAliasedSymbol(symbol);
        }
        // Note that const enums are a special case, because
        // while they have a value, they don't exist at runtime.
        return (symbol.flags & ts.SymbolFlags.Value & ts.SymbolFlags.ConstEnumExcludes) !== 0;
    }
    /**
     * Gets a transformer for downleveling Angular decorators.
     * @param typeChecker Reference to the program's type checker.
     * @param host Reflection host that is used for determining decorators.
     * @param diagnostics List which will be populated with diagnostics if any.
     * @param isCore Whether the current TypeScript program is for the `@angular/core` package.
     * @param isClosureCompilerEnabled Whether closure annotations need to be added where needed.
     * @param skipClassDecorators Whether class decorators should be skipped from downleveling.
     *   This is useful for JIT mode where class decorators should be preserved as they could rely
     *   on immediate execution. e.g. downleveling `@Injectable` means that the injectable factory
     *   is not created, and injecting the token will not work. If this decorator would not be
     *   downleveled, the `Injectable` decorator will execute immediately on file load, and
     *   Angular will generate the corresponding injectable factory.
     */
    function getDownlevelDecoratorsTransform(typeChecker, host, diagnostics, isCore, isClosureCompilerEnabled, skipClassDecorators) {
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
                if (!symbol || !symbolIsRuntimeValue(typeChecker, symbol) || !symbol.declarations ||
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
                var hasAngularDecorator = false;
                var decoratorsToLower = [];
                var decoratorsToKeep = [];
                try {
                    for (var decorators_3 = tslib_1.__values(decorators), decorators_3_1 = decorators_3.next(); !decorators_3_1.done; decorators_3_1 = decorators_3.next()) {
                        var decorator = decorators_3_1.value;
                        // We only deal with concrete nodes in TypeScript sources, so we don't
                        // need to handle synthetically created decorators.
                        var decoratorNode = decorator.node;
                        var isNgDecorator = isAngularDecorator(decorator, isCore);
                        // Keep track if we come across an Angular class decorator. This is used
                        // for to determine whether constructor parameters should be captured or not.
                        if (isNgDecorator) {
                            hasAngularDecorator = true;
                        }
                        if (isNgDecorator && !skipClassDecorators) {
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
                if (decoratorsToLower.length) {
                    newMembers.push(createDecoratorClassProperty(decoratorsToLower));
                }
                if (classParameters) {
                    if (hasAngularDecorator || classParameters.some(function (p) { return !!p.decorators.length; })) {
                        // Capture constructor parameters if the class has Angular decorator applied,
                        // or if any of the parameters has decorators applied directly.
                        newMembers.push(createCtorParametersClassProperty(diagnostics, entityNameToExpression, classParameters, isClosureCompilerEnabled));
                    }
                }
                if (decoratedProperties.size) {
                    newMembers.push(createPropDecoratorsClassProperty(diagnostics, decoratedProperties));
                }
                var members = ts.setTextRange(ts.createNodeArray(newMembers, classDecl.members.hasTrailingComma), classDecl.members);
                return ts.updateClassDeclaration(classDecl, decoratorsToKeep.length ? decoratorsToKeep : undefined, classDecl.modifiers, classDecl.name, classDecl.typeParameters, classDecl.heritageClauses, members);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG93bmxldmVsX2RlY29yYXRvcnNfdHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvZG93bmxldmVsX2RlY29yYXRvcnNfdHJhbnNmb3JtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsNEhBQWdIO0lBRWhIOzs7T0FHRztJQUNILFNBQVMsa0JBQWtCLENBQUMsU0FBb0IsRUFBRSxNQUFlO1FBQy9ELE9BQU8sTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssZUFBZSxDQUFDLENBQUM7SUFDNUYsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQW9CRTtJQUVGOzs7T0FHRztJQUNILFNBQVMsNkJBQTZCO1FBQ3BDLElBQU0sWUFBWSxHQUFxQixFQUFFLENBQUM7UUFDMUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsdUJBQXVCLENBQ3hDLFNBQVMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUM1QixFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDeEYsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsdUJBQXVCLENBQ3hDLFNBQVMsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxFQUM5RCxFQUFFLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzVGLE9BQU8sRUFBRSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSCxTQUFTLGtDQUFrQyxDQUN2QyxTQUF1QixFQUFFLFdBQTRCOztRQUN2RCxJQUFNLGtCQUFrQixHQUFrQyxFQUFFLENBQUM7UUFDN0QsSUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQztRQUNsQyxRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDakIsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVU7Z0JBQzNCLGtDQUFrQztnQkFDbEMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDbkUsTUFBTTtZQUNSLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjO2dCQUMvQiw0Q0FBNEM7Z0JBQzVDLElBQU0sSUFBSSxHQUFHLElBQXlCLENBQUM7Z0JBQ3ZDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUM5RSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFO29CQUN6QixJQUFNLElBQUksR0FBb0IsRUFBRSxDQUFDOzt3QkFDakMsS0FBa0IsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxTQUFTLENBQUEsZ0JBQUEsNEJBQUU7NEJBQTdCLElBQU0sR0FBRyxXQUFBOzRCQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7eUJBQ2hCOzs7Ozs7Ozs7b0JBQ0QsSUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3JELGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7b0JBQ2xELGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztpQkFDaEY7Z0JBQ0QsTUFBTTtZQUNSO2dCQUNFLFdBQVcsQ0FBQyxJQUFJLENBQUM7b0JBQ2YsSUFBSSxFQUFFLFNBQVMsQ0FBQyxhQUFhLEVBQUU7b0JBQy9CLEtBQUssRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFO29CQUMzQixNQUFNLEVBQUUsU0FBUyxDQUFDLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQyxRQUFRLEVBQUU7b0JBQ2pELFdBQVcsRUFDSixFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsc0RBQW1EO29CQUN2RixRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUs7b0JBQ3JDLElBQUksRUFBRSxDQUFDO2lCQUNSLENBQUMsQ0FBQztnQkFDSCxNQUFNO1NBQ1Q7UUFDRCxPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRDs7O09BR0c7SUFDSCxTQUFTLDRCQUE0QixDQUFDLGFBQTJDO1FBQy9FLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM3RCxJQUFNLElBQUksR0FBRyw2QkFBNkIsRUFBRSxDQUFDO1FBQzdDLElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0QsNkVBQTZFO1FBQzdFLDZFQUE2RTtRQUM3RSw2RUFBNkU7UUFDN0UsNkVBQTZFO1FBQzdFLDhFQUE4RTtRQUM5RSxpREFBaUQ7UUFDakQsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQzlGLENBQUM7SUFFRDs7O09BR0c7SUFDSCxTQUFTLHFDQUFxQztRQUM1QyxnRUFBZ0U7UUFDaEUsSUFBTSxZQUFZLEdBQXFCLEVBQUUsQ0FBQztRQUMxQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyx1QkFBdUIsQ0FDeEMsU0FBUyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQzVCLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNuRixZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyx1QkFBdUIsQ0FDeEMsU0FBUyxFQUFFLFlBQVksRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLEVBQ3BFLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUM7WUFDOUMsRUFBRSxDQUFDLHVCQUF1QixDQUN0QixTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFDNUIsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxTQUFTLENBQUM7WUFDdEYsRUFBRSxDQUFDLHVCQUF1QixDQUN0QixTQUFTLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsRUFDOUQsRUFBRSxDQUFDLG1CQUFtQixDQUNsQixFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQ3RFLFNBQVMsQ0FBQztTQUNmLENBQUMsQ0FBQyxFQUNILFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFFaEIsNkRBQTZEO1FBQzdELElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxVQUFVLEVBQVMsQ0FBQztRQUMzQyxJQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ3JELEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFrQixDQUFDLENBQUMsQ0FBQztZQUM5QyxXQUFXLENBQUM7UUFDaEIsT0FBTyxFQUFFLENBQUMsc0JBQXNCLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDO1lBQzVGLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUM7WUFDdEMsUUFBUTtTQUNULENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMsb0JBQW9CLENBQUMsQ0FBVTtRQUN0QyxFQUFFLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ0YsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCO2dCQUMxQyxJQUFJLEVBQUUsZ0JBQWdCO2dCQUN0QixHQUFHLEVBQUUsQ0FBQyxDQUFDO2dCQUNQLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ1Asa0JBQWtCLEVBQUUsSUFBSTthQUN6QixDQUFDLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7OztPQVlHO0lBQ0gsU0FBUyxpQ0FBaUMsQ0FDdEMsV0FBNEIsRUFDNUIsc0JBQXVFLEVBQ3ZFLGNBQXlDLEVBQ3pDLHdCQUFpQzs7UUFDbkMsSUFBTSxNQUFNLEdBQW9CLEVBQUUsQ0FBQzs7WUFFbkMsS0FBd0IsSUFBQSxtQkFBQSxpQkFBQSxjQUFjLENBQUEsOENBQUEsMEVBQUU7Z0JBQW5DLElBQU0sU0FBUywyQkFBQTtnQkFDbEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO29CQUN4RCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO29CQUM3QixTQUFTO2lCQUNWO2dCQUVELElBQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDOUIseUJBQXlCLENBQUMsc0JBQXNCLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ25FLFNBQVMsQ0FBQztnQkFDZCxJQUFNLE9BQU8sR0FDVCxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsU0FBUyxJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRXpGLElBQU0sVUFBVSxHQUFpQyxFQUFFLENBQUM7O29CQUNwRCxLQUFtQixJQUFBLG9CQUFBLGlCQUFBLFNBQVMsQ0FBQyxVQUFVLENBQUEsQ0FBQSxnQkFBQSw0QkFBRTt3QkFBcEMsSUFBTSxJQUFJLFdBQUE7d0JBQ2IsVUFBVSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztxQkFDeEU7Ozs7Ozs7OztnQkFDRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUU7b0JBQ3JCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLHdCQUF3QixDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUM1RjtnQkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQzlDOzs7Ozs7Ozs7UUFFRCxJQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQ3RDLFNBQVMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsRUFDekYsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQU0sSUFBSSxHQUFHLHFDQUFxQyxFQUFFLENBQUM7UUFDckQsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FDOUIsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLElBQUksRUFDM0YsV0FBVyxDQUFDLENBQUM7UUFDakIsSUFBSSx3QkFBd0IsRUFBRTtZQUM1QixvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNoQztRQUNELE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUFFRDs7Ozs7Ozs7T0FRRztJQUNILFNBQVMsaUNBQWlDLENBQ3RDLFdBQTRCLEVBQUUsVUFBdUM7O1FBQ3ZFLDhGQUE4RjtRQUM5RixJQUFNLE9BQU8sR0FBa0MsRUFBRSxDQUFDOztZQUNsRCxLQUFpQyxJQUFBLEtBQUEsaUJBQUEsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFBLDRCQUFFO2dCQUE1QyxJQUFBLEtBQUEsMkJBQWtCLEVBQWpCLElBQUksUUFBQSxFQUFFLFVBQVUsUUFBQTtnQkFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsd0JBQXdCLENBQ3BDLElBQUksRUFDSixFQUFFLENBQUMsa0JBQWtCLENBQ2pCLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxrQ0FBa0MsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLEVBQXJELENBQXFELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUMxRjs7Ozs7Ozs7O1FBQ0QsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxRCxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQzFELFNBQVMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUNmLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQ2pELEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFDdEYsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QyxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQ3BCLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQzNGLFdBQVcsQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsU0FBUyx5QkFBeUIsQ0FDOUIsc0JBQXVFLEVBQ3ZFLElBQWlCO1FBQ25CLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDckIsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDOUIsc0VBQXNFO1lBQ3RFLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztTQUMxQjtRQUNELFFBQVEsSUFBSSxFQUFFO1lBQ1osS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQztZQUNoQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZTtnQkFDaEMsT0FBTyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDekMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztZQUM3QixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUztnQkFDMUIsT0FBTyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztZQUNqQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQy9CLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUM7WUFDaEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWM7Z0JBQy9CLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3hDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUM7WUFDakMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWE7Z0JBQzlCLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhO2dCQUM5QixPQUFPLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN2QyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1lBQ2pDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjO2dCQUMvQixPQUFPLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN2QyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYTtnQkFDOUIsSUFBTSxPQUFPLEdBQUcsSUFBNEIsQ0FBQztnQkFDN0MsdURBQXVEO2dCQUN2RCxPQUFPLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRCxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUztnQkFDMUIsd0VBQXdFO2dCQUN4RSw4RUFBOEU7Z0JBQzlFLElBQU0sY0FBYyxHQUNmLElBQXlCO3FCQUNyQixLQUFLLENBQUMsTUFBTSxDQUNULFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVc7b0JBQ3JDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFEekUsQ0FDeUUsQ0FBQyxDQUFDO2dCQUM1RixPQUFPLGNBQWMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ2hDLHlCQUF5QixDQUFDLHNCQUFzQixFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3RFLFNBQVMsQ0FBQztZQUNoQjtnQkFDRSxPQUFPLFNBQVMsQ0FBQztTQUNwQjtJQUNILENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSCxTQUFTLG9CQUFvQixDQUFDLFdBQTJCLEVBQUUsTUFBaUI7UUFDMUUsSUFBSSxNQUFNLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFO1lBQ3ZDLE1BQU0sR0FBRyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDL0M7UUFFRCxvREFBb0Q7UUFDcEQsd0RBQXdEO1FBQ3hELE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEYsQ0FBQztJQWFEOzs7Ozs7Ozs7Ozs7O09BYUc7SUFDSCxTQUFnQiwrQkFBK0IsQ0FDM0MsV0FBMkIsRUFBRSxJQUFvQixFQUFFLFdBQTRCLEVBQy9FLE1BQWUsRUFBRSx3QkFBaUMsRUFDbEQsbUJBQTRCO1FBQzlCLE9BQU8sVUFBQyxPQUFpQztZQUN2QyxJQUFJLHdCQUF3QixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBRXpEOzs7OztlQUtHO1lBQ0gsU0FBUyxzQkFBc0IsQ0FBQyxJQUFtQjtnQkFDakQsSUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNyRCx5RkFBeUY7Z0JBQ3pGLDhEQUE4RDtnQkFDOUQsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZO29CQUM3RSxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7b0JBQ3BDLE9BQU8sU0FBUyxDQUFDO2lCQUNsQjtnQkFDRCwwRUFBMEU7Z0JBQzFFLCtDQUErQztnQkFDL0MsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUM1QixJQUFNLGFBQWEsR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3hELElBQUksYUFBYSxLQUFLLFNBQVMsRUFBRTt3QkFDL0IsT0FBTyxTQUFTLENBQUM7cUJBQ2xCO29CQUNELE9BQU8sRUFBRSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQzNEO2dCQUNELElBQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLDZFQUE2RTtnQkFDN0UsNkVBQTZFO2dCQUM3RSw4Q0FBOEM7Z0JBQzlDLElBQUksMkRBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2xDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDbkMsK0VBQStFO29CQUMvRSwrRUFBK0U7b0JBQy9FLCtFQUErRTtvQkFDL0Usb0ZBQW9GO29CQUNwRixrRkFBa0Y7b0JBQ2xGLDZFQUE2RTtvQkFDN0Usa0ZBQWtGO29CQUNsRiwrRUFBK0U7b0JBQy9FLHVGQUF1RjtvQkFDdkYsZ0ZBQWdGO29CQUNoRixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO3dCQUMzQixPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUN0QztpQkFDRjtnQkFDRCxnRkFBZ0Y7Z0JBQ2hGLGdGQUFnRjtnQkFDaEYsaUZBQWlGO2dCQUNqRixPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsQ0FBQztZQUVEOzs7O2VBSUc7WUFDSCxTQUFTLHFCQUFxQixDQUFDLE9BQXdCOztnQkFFckQsT0FBTyxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUN6RSxJQUFNLGdCQUFnQixHQUFtQixFQUFFLENBQUM7Z0JBQzVDLElBQU0sT0FBTyxHQUFtQixFQUFFLENBQUM7Z0JBQ25DLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7O29CQUNsRSxLQUF3QixJQUFBLGVBQUEsaUJBQUEsVUFBVSxDQUFBLHNDQUFBLDhEQUFFO3dCQUEvQixJQUFNLFNBQVMsdUJBQUE7d0JBQ2xCLHNFQUFzRTt3QkFDdEUsbURBQW1EO3dCQUNuRCxJQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsSUFBcUIsQ0FBQzt3QkFDdEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsRUFBRTs0QkFDMUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDOzRCQUNyQyxTQUFTO3lCQUNWO3dCQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7cUJBQzdCOzs7Ozs7Ozs7Z0JBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNO29CQUFFLE9BQU8sQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUVyRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNuRCxnQ0FBZ0M7b0JBQ2hDLHlCQUF5QjtvQkFDekIsV0FBVyxDQUFDLElBQUksQ0FBQzt3QkFDZixJQUFJLEVBQUUsT0FBTyxDQUFDLGFBQWEsRUFBRTt3QkFDN0IsS0FBSyxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUU7d0JBQ3pCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRTt3QkFDN0MsV0FBVyxFQUFFLHVFQUF1RTt3QkFDcEYsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO3dCQUNyQyxJQUFJLEVBQUUsQ0FBQztxQkFDUixDQUFDLENBQUM7b0JBQ0gsT0FBTyxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQ2pDO2dCQUVELElBQU0sSUFBSSxHQUFJLE9BQU8sQ0FBQyxJQUFzQixDQUFDLElBQUksQ0FBQztnQkFDbEQsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDM0MsT0FBZSxDQUFDLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDbkQsRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQzNFLFNBQVMsQ0FBQztnQkFDZCxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNsQyxDQUFDO1lBRUQ7OztlQUdHO1lBQ0gsU0FBUyxvQkFBb0IsQ0FBQyxJQUErQjs7Z0JBRTNELElBQUksR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFFbkUsSUFBTSxhQUFhLEdBQThCLEVBQUUsQ0FBQztnQkFDcEQsSUFBTSxhQUFhLEdBQ2YsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUseUJBQXlCLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQy9FLElBQU0sY0FBYyxHQUE4QixFQUFFLENBQUM7O29CQUNyRCxLQUFvQixJQUFBLGtCQUFBLGlCQUFBLGFBQWEsQ0FBQSw0Q0FBQSx1RUFBRTt3QkFBOUIsSUFBTSxLQUFLLDBCQUFBO3dCQUNkLElBQU0sZ0JBQWdCLEdBQW1CLEVBQUUsQ0FBQzt3QkFDNUMsSUFBTSxTQUFTLEdBQTRCLEVBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUM7d0JBQ3hFLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7OzRCQUVoRSxLQUF3QixJQUFBLDhCQUFBLGlCQUFBLFVBQVUsQ0FBQSxDQUFBLHNDQUFBLDhEQUFFO2dDQUEvQixJQUFNLFNBQVMsdUJBQUE7Z0NBQ2xCLHNFQUFzRTtnQ0FDdEUsbURBQW1EO2dDQUNuRCxJQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsSUFBcUIsQ0FBQztnQ0FDdEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsRUFBRTtvQ0FDMUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO29DQUNyQyxTQUFTO2lDQUNWO2dDQUNELFNBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDOzZCQUMzQzs7Ozs7Ozs7O3dCQUNELElBQUksS0FBSyxDQUFDLElBQUksRUFBRTs0QkFDZCw4Q0FBOEM7NEJBQzlDLHdGQUF3Rjs0QkFDeEYsZ0ZBQWdGOzRCQUNoRixlQUFlOzRCQUNmLFNBQVUsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQzt5QkFDOUI7d0JBQ0QsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzt3QkFDL0IsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FDL0IsS0FBSzt3QkFDTCw4REFBOEQ7d0JBQzlELGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUyxFQUN2RSxLQUFLLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQzt3QkFDMUYsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztxQkFDOUI7Ozs7Ozs7OztnQkFDRCxJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsaUJBQWlCLENBQ2hDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUNwRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUN6RSxPQUFPLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ25DLENBQUM7WUFFRDs7Ozs7O2VBTUc7WUFDSCxTQUFTLHlCQUF5QixDQUFDLFNBQThCOztnQkFDL0QsU0FBUyxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBRTFDLElBQU0sVUFBVSxHQUFzQixFQUFFLENBQUM7Z0JBQ3pDLElBQU0sbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7Z0JBQzlELElBQUksZUFBZSxHQUFtQyxJQUFJLENBQUM7O29CQUUzRCxLQUFxQixJQUFBLEtBQUEsaUJBQUEsU0FBUyxDQUFDLE9BQU8sQ0FBQSxnQkFBQSw0QkFBRTt3QkFBbkMsSUFBTSxNQUFNLFdBQUE7d0JBQ2YsUUFBUSxNQUFNLENBQUMsSUFBSSxFQUFFOzRCQUNuQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUM7NEJBQ3ZDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7NEJBQy9CLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7NEJBQy9CLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dDQUM5QixJQUFBLEtBQUEsZUFBZ0MscUJBQXFCLENBQUMsTUFBTSxDQUFDLElBQUEsRUFBNUQsSUFBSSxRQUFBLEVBQUUsU0FBUyxRQUFBLEVBQUUsWUFBVSxRQUFpQyxDQUFDO2dDQUNwRSxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dDQUMzQixJQUFJLElBQUk7b0NBQUUsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxZQUFVLENBQUMsQ0FBQztnQ0FDcEQsU0FBUzs2QkFDVjs0QkFDRCxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7Z0NBQzlCLElBQU0sSUFBSSxHQUFHLE1BQW1DLENBQUM7Z0NBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtvQ0FBRSxNQUFNO2dDQUNoQixJQUFBLEtBQUEsZUFDRixvQkFBb0IsQ0FBQyxNQUFtQyxDQUFDLElBQUEsRUFEdEQsU0FBUyxRQUFBLEVBQUUsY0FBYyxRQUM2QixDQUFDO2dDQUM5RCxlQUFlLEdBQUcsY0FBYyxDQUFDO2dDQUNqQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dDQUMzQixTQUFTOzZCQUNWOzRCQUNEO2dDQUNFLE1BQU07eUJBQ1Q7d0JBQ0QsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSx5QkFBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUNoRjs7Ozs7Ozs7O2dCQUNELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBRXBFLElBQUksbUJBQW1CLEdBQUcsS0FBSyxDQUFDO2dCQUNoQyxJQUFNLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztnQkFDN0IsSUFBTSxnQkFBZ0IsR0FBbUIsRUFBRSxDQUFDOztvQkFDNUMsS0FBd0IsSUFBQSxlQUFBLGlCQUFBLFVBQVUsQ0FBQSxzQ0FBQSw4REFBRTt3QkFBL0IsSUFBTSxTQUFTLHVCQUFBO3dCQUNsQixzRUFBc0U7d0JBQ3RFLG1EQUFtRDt3QkFDbkQsSUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLElBQXFCLENBQUM7d0JBQ3RELElBQU0sYUFBYSxHQUFHLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQzt3QkFFNUQsd0VBQXdFO3dCQUN4RSw2RUFBNkU7d0JBQzdFLElBQUksYUFBYSxFQUFFOzRCQUNqQixtQkFBbUIsR0FBRyxJQUFJLENBQUM7eUJBQzVCO3dCQUVELElBQUksYUFBYSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7NEJBQ3pDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQzt5QkFDeEY7NkJBQU07NEJBQ0wsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO3lCQUN0QztxQkFDRjs7Ozs7Ozs7O2dCQUVELElBQUksaUJBQWlCLENBQUMsTUFBTSxFQUFFO29CQUM1QixVQUFVLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztpQkFDbEU7Z0JBQ0QsSUFBSSxlQUFlLEVBQUU7b0JBQ25CLElBQUksbUJBQW1CLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBckIsQ0FBcUIsQ0FBQyxFQUFFO3dCQUMzRSw2RUFBNkU7d0JBQzdFLCtEQUErRDt3QkFDL0QsVUFBVSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FDN0MsV0FBVyxFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7cUJBQ3RGO2lCQUNGO2dCQUNELElBQUksbUJBQW1CLENBQUMsSUFBSSxFQUFFO29CQUM1QixVQUFVLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLFdBQVcsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7aUJBQ3RGO2dCQUVELElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQzNCLEVBQUUsQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBRTNGLE9BQU8sRUFBRSxDQUFDLHNCQUFzQixDQUM1QixTQUFTLEVBQUUsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxTQUFTLEVBQ3RGLFNBQVMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3BGLENBQUM7WUFFRDs7OztlQUlHO1lBQ0gsU0FBUyx5QkFBeUIsQ0FBQyxJQUFhO2dCQUM5QyxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDL0IsT0FBTyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDeEM7Z0JBQ0QsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNyRSxDQUFDO1lBRUQsT0FBTyxVQUFDLEVBQWlCO2dCQUN2QixnRkFBZ0Y7Z0JBQ2hGLG1GQUFtRjtnQkFDbkYsZ0ZBQWdGO2dCQUNoRiw2RUFBNkU7Z0JBQzdFLHFFQUFxRTtnQkFDckUscUVBQWtDLENBQUMsT0FBTyxFQUFFLHdCQUF3QixDQUFDLENBQUM7Z0JBQ3RFLGtGQUFrRjtnQkFDbEYsK0VBQStFO2dCQUMvRSxrRUFBa0U7Z0JBQ2xFLE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUseUJBQXlCLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbkUsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQXBRRCwwRUFvUUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0RlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtpc0FsaWFzSW1wb3J0RGVjbGFyYXRpb24sIHBhdGNoQWxpYXNSZWZlcmVuY2VSZXNvbHV0aW9uT3JEaWV9IGZyb20gJy4vcGF0Y2hfYWxpYXNfcmVmZXJlbmNlX3Jlc29sdXRpb24nO1xuXG4vKipcbiAqIFdoZXRoZXIgYSBnaXZlbiBkZWNvcmF0b3Igc2hvdWxkIGJlIHRyZWF0ZWQgYXMgYW4gQW5ndWxhciBkZWNvcmF0b3IuXG4gKiBFaXRoZXIgaXQncyB1c2VkIGluIEBhbmd1bGFyL2NvcmUsIG9yIGl0J3MgaW1wb3J0ZWQgZnJvbSB0aGVyZS5cbiAqL1xuZnVuY3Rpb24gaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcjogRGVjb3JhdG9yLCBpc0NvcmU6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgcmV0dXJuIGlzQ29yZSB8fCAoZGVjb3JhdG9yLmltcG9ydCAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJyk7XG59XG5cbi8qXG4gIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gIENvZGUgYmVsb3cgaGFzIGJlZW4gZXh0cmFjdGVkIGZyb20gdGhlIHRzaWNrbGUgZGVjb3JhdG9yIGRvd25sZXZlbCB0cmFuc2Zvcm1lclxuICBhbmQgYSBmZXcgbG9jYWwgbW9kaWZpY2F0aW9ucyBoYXZlIGJlZW4gYXBwbGllZDpcblxuICAgIDEuIFRzaWNrbGUgYnkgZGVmYXVsdCBwcm9jZXNzZWQgYWxsIGRlY29yYXRvcnMgdGhhdCBoYWQgdGhlIGBAQW5ub3RhdGlvbmAgSlNEb2MuXG4gICAgICAgV2UgbW9kaWZpZWQgdGhlIHRyYW5zZm9ybSB0byBvbmx5IGJlIGNvbmNlcm5lZCB3aXRoIGtub3duIEFuZ3VsYXIgZGVjb3JhdG9ycy5cbiAgICAyLiBUc2lja2xlIGJ5IGRlZmF1bHQgYWRkZWQgYEBub2NvbGxhcHNlYCB0byBhbGwgZ2VuZXJhdGVkIGBjdG9yUGFyYW1ldGVyc2AgcHJvcGVydGllcy5cbiAgICAgICBXZSBvbmx5IGRvIHRoaXMgd2hlbiBgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXJgIGlzIGVuYWJsZWQuXG4gICAgMy4gVHNpY2tsZSBkb2VzIG5vdCBoYW5kbGUgdW5pb24gdHlwZXMgZm9yIGRlcGVuZGVuY3kgaW5qZWN0aW9uLiBpLmUuIGlmIGEgaW5qZWN0ZWQgdHlwZVxuICAgICAgIGlzIGRlbm90ZWQgd2l0aCBgQE9wdGlvbmFsYCwgdGhlIGFjdHVhbCB0eXBlIGNvdWxkIGJlIHNldCB0byBgVCB8IG51bGxgLlxuICAgICAgIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci1jbGkvY29tbWl0LzgyNjgwM2QwNzM2YjgwNzg2N2NhZmY5Zjg5MDNlNTA4OTcwYWQ1ZTQuXG4gICAgNC4gVHNpY2tsZSByZWxpZWQgb24gYGVtaXREZWNvcmF0b3JNZXRhZGF0YWAgdG8gYmUgc2V0IHRvIGB0cnVlYC4gVGhpcyBpcyBkdWUgdG8gYSBsaW1pdGF0aW9uXG4gICAgICAgaW4gVHlwZVNjcmlwdCB0cmFuc2Zvcm1lcnMgdGhhdCBuZXZlciBoYXMgYmVlbiBmaXhlZC4gV2Ugd2VyZSBhYmxlIHRvIHdvcmsgYXJvdW5kIHRoaXNcbiAgICAgICBsaW1pdGF0aW9uIHNvIHRoYXQgYGVtaXREZWNvcmF0b3JNZXRhZGF0YWAgZG9lc24ndCBuZWVkIHRvIGJlIHNwZWNpZmllZC5cbiAgICAgICBTZWU6IGBwYXRjaEFsaWFzUmVmZXJlbmNlUmVzb2x1dGlvbmAgZm9yIG1vcmUgZGV0YWlscy5cblxuICBIZXJlIGlzIGEgbGluayB0byB0aGUgdHNpY2tsZSByZXZpc2lvbiBvbiB3aGljaCB0aGlzIHRyYW5zZm9ybWVyIGlzIGJhc2VkOlxuICBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci90c2lja2xlL2Jsb2IvZmFlMDZiZWNiMTU3MGY0OTE4MDYwNjBkODNmMjlmMmQ1MGM0M2NkZC9zcmMvZGVjb3JhdG9yX2Rvd25sZXZlbF90cmFuc2Zvcm1lci50c1xuICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuKi9cblxuLyoqXG4gKiBDcmVhdGVzIHRoZSBBU1QgZm9yIHRoZSBkZWNvcmF0b3IgZmllbGQgdHlwZSBhbm5vdGF0aW9uLCB3aGljaCBoYXMgdGhlIGZvcm1cbiAqICAgICB7IHR5cGU6IEZ1bmN0aW9uLCBhcmdzPzogYW55W10gfVtdXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZURlY29yYXRvckludm9jYXRpb25UeXBlKCk6IHRzLlR5cGVOb2RlIHtcbiAgY29uc3QgdHlwZUVsZW1lbnRzOiB0cy5UeXBlRWxlbWVudFtdID0gW107XG4gIHR5cGVFbGVtZW50cy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5U2lnbmF0dXJlKFxuICAgICAgdW5kZWZpbmVkLCAndHlwZScsIHVuZGVmaW5lZCxcbiAgICAgIHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKHRzLmNyZWF0ZUlkZW50aWZpZXIoJ0Z1bmN0aW9uJyksIHVuZGVmaW5lZCksIHVuZGVmaW5lZCkpO1xuICB0eXBlRWxlbWVudHMucHVzaCh0cy5jcmVhdGVQcm9wZXJ0eVNpZ25hdHVyZShcbiAgICAgIHVuZGVmaW5lZCwgJ2FyZ3MnLCB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlF1ZXN0aW9uVG9rZW4pLFxuICAgICAgdHMuY3JlYXRlQXJyYXlUeXBlTm9kZSh0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSksIHVuZGVmaW5lZCkpO1xuICByZXR1cm4gdHMuY3JlYXRlQXJyYXlUeXBlTm9kZSh0cy5jcmVhdGVUeXBlTGl0ZXJhbE5vZGUodHlwZUVsZW1lbnRzKSk7XG59XG5cbi8qKlxuICogRXh0cmFjdHMgdGhlIHR5cGUgb2YgdGhlIGRlY29yYXRvciAodGhlIGZ1bmN0aW9uIG9yIGV4cHJlc3Npb24gaW52b2tlZCksIGFzIHdlbGwgYXMgYWxsIHRoZVxuICogYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgZGVjb3JhdG9yLiBSZXR1cm5zIGFuIEFTVCB3aXRoIHRoZSBmb3JtOlxuICpcbiAqICAgICAvLyBGb3IgQGRlY29yYXRvcihhcmcxLCBhcmcyKVxuICogICAgIHsgdHlwZTogZGVjb3JhdG9yLCBhcmdzOiBbYXJnMSwgYXJnMl0gfVxuICovXG5mdW5jdGlvbiBleHRyYWN0TWV0YWRhdGFGcm9tU2luZ2xlRGVjb3JhdG9yKFxuICAgIGRlY29yYXRvcjogdHMuRGVjb3JhdG9yLCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdKTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ge1xuICBjb25zdCBtZXRhZGF0YVByb3BlcnRpZXM6IHRzLk9iamVjdExpdGVyYWxFbGVtZW50TGlrZVtdID0gW107XG4gIGNvbnN0IGV4cHIgPSBkZWNvcmF0b3IuZXhwcmVzc2lvbjtcbiAgc3dpdGNoIChleHByLmtpbmQpIHtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcjpcbiAgICAgIC8vIFRoZSBkZWNvcmF0b3Igd2FzIGEgcGxhaW4gQEZvby5cbiAgICAgIG1ldGFkYXRhUHJvcGVydGllcy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgndHlwZScsIGV4cHIpKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbjpcbiAgICAgIC8vIFRoZSBkZWNvcmF0b3Igd2FzIGEgY2FsbCwgbGlrZSBARm9vKGJhcikuXG4gICAgICBjb25zdCBjYWxsID0gZXhwciBhcyB0cy5DYWxsRXhwcmVzc2lvbjtcbiAgICAgIG1ldGFkYXRhUHJvcGVydGllcy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudCgndHlwZScsIGNhbGwuZXhwcmVzc2lvbikpO1xuICAgICAgaWYgKGNhbGwuYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBhcmdzOiB0cy5FeHByZXNzaW9uW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBhcmcgb2YgY2FsbC5hcmd1bWVudHMpIHtcbiAgICAgICAgICBhcmdzLnB1c2goYXJnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhcmdzQXJyYXlMaXRlcmFsID0gdHMuY3JlYXRlQXJyYXlMaXRlcmFsKGFyZ3MpO1xuICAgICAgICBhcmdzQXJyYXlMaXRlcmFsLmVsZW1lbnRzLmhhc1RyYWlsaW5nQ29tbWEgPSB0cnVlO1xuICAgICAgICBtZXRhZGF0YVByb3BlcnRpZXMucHVzaCh0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoJ2FyZ3MnLCBhcmdzQXJyYXlMaXRlcmFsKSk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgZGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgIGZpbGU6IGRlY29yYXRvci5nZXRTb3VyY2VGaWxlKCksXG4gICAgICAgIHN0YXJ0OiBkZWNvcmF0b3IuZ2V0U3RhcnQoKSxcbiAgICAgICAgbGVuZ3RoOiBkZWNvcmF0b3IuZ2V0RW5kKCkgLSBkZWNvcmF0b3IuZ2V0U3RhcnQoKSxcbiAgICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgICBgJHt0cy5TeW50YXhLaW5kW2RlY29yYXRvci5raW5kXX0gbm90IGltcGxlbWVudGVkIGluIGdhdGhlcmluZyBkZWNvcmF0b3IgbWV0YWRhdGEuYCxcbiAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgY29kZTogMCxcbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwobWV0YWRhdGFQcm9wZXJ0aWVzKTtcbn1cblxuLyoqXG4gKiBUYWtlcyBhIGxpc3Qgb2YgZGVjb3JhdG9yIG1ldGFkYXRhIG9iamVjdCBBU1RzIGFuZCBwcm9kdWNlcyBhbiBBU1QgZm9yIGFcbiAqIHN0YXRpYyBjbGFzcyBwcm9wZXJ0eSBvZiBhbiBhcnJheSBvZiB0aG9zZSBtZXRhZGF0YSBvYmplY3RzLlxuICovXG5mdW5jdGlvbiBjcmVhdGVEZWNvcmF0b3JDbGFzc1Byb3BlcnR5KGRlY29yYXRvckxpc3Q6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uW10pIHtcbiAgY29uc3QgbW9kaWZpZXIgPSB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpO1xuICBjb25zdCB0eXBlID0gY3JlYXRlRGVjb3JhdG9ySW52b2NhdGlvblR5cGUoKTtcbiAgY29uc3QgaW5pdGlhbGl6ZXIgPSB0cy5jcmVhdGVBcnJheUxpdGVyYWwoZGVjb3JhdG9yTGlzdCwgdHJ1ZSk7XG4gIC8vIE5COiB0aGUgLmRlY29yYXRvcnMgcHJvcGVydHkgZG9lcyBub3QgZ2V0IGEgQG5vY29sbGFwc2UgcHJvcGVydHkuIFRoZXJlIGlzXG4gIC8vIG5vIGdvb2QgcmVhc29uIHdoeSAtIGl0IG1lYW5zIC5kZWNvcmF0b3JzIGlzIG5vdCBydW50aW1lIGFjY2Vzc2libGUgaWYgeW91XG4gIC8vIGNvbXBpbGUgd2l0aCBjb2xsYXBzZSBwcm9wZXJ0aWVzLCB3aGVyZWFzIHByb3BEZWNvcmF0b3JzIGlzLCB3aGljaCBkb2Vzbid0XG4gIC8vIGZvbGxvdyBhbnkgc3RyaW5nZW50IGxvZ2ljLiBIb3dldmVyIHRoaXMgaGFzIGJlZW4gdGhlIGNhc2UgcHJldmlvdXNseSwgYW5kXG4gIC8vIGFkZGluZyBpdCBiYWNrIGluIGxlYWRzIHRvIHN1YnN0YW50aWFsIGNvZGUgc2l6ZSBpbmNyZWFzZXMgYXMgQ2xvc3VyZSBmYWlsc1xuICAvLyB0byB0cmVlIHNoYWtlIHRoZXNlIHByb3BzIHdpdGhvdXQgQG5vY29sbGFwc2UuXG4gIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eSh1bmRlZmluZWQsIFttb2RpZmllcl0sICdkZWNvcmF0b3JzJywgdW5kZWZpbmVkLCB0eXBlLCBpbml0aWFsaXplcik7XG59XG5cbi8qKlxuICogQ3JlYXRlcyB0aGUgQVNUIGZvciB0aGUgJ2N0b3JQYXJhbWV0ZXJzJyBmaWVsZCB0eXBlIGFubm90YXRpb246XG4gKiAgICgpID0+ICh7IHR5cGU6IGFueSwgZGVjb3JhdG9ycz86IHt0eXBlOiBGdW5jdGlvbiwgYXJncz86IGFueVtdfVtdIH18bnVsbClbXVxuICovXG5mdW5jdGlvbiBjcmVhdGVDdG9yUGFyYW1ldGVyc0NsYXNzUHJvcGVydHlUeXBlKCk6IHRzLlR5cGVOb2RlIHtcbiAgLy8gU29ycnkgYWJvdXQgdGhpcy4gVHJ5IHJlYWRpbmcganVzdCB0aGUgc3RyaW5nIGxpdGVyYWxzIGJlbG93LlxuICBjb25zdCB0eXBlRWxlbWVudHM6IHRzLlR5cGVFbGVtZW50W10gPSBbXTtcbiAgdHlwZUVsZW1lbnRzLnB1c2godHMuY3JlYXRlUHJvcGVydHlTaWduYXR1cmUoXG4gICAgICB1bmRlZmluZWQsICd0eXBlJywgdW5kZWZpbmVkLFxuICAgICAgdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUodHMuY3JlYXRlSWRlbnRpZmllcignYW55JyksIHVuZGVmaW5lZCksIHVuZGVmaW5lZCkpO1xuICB0eXBlRWxlbWVudHMucHVzaCh0cy5jcmVhdGVQcm9wZXJ0eVNpZ25hdHVyZShcbiAgICAgIHVuZGVmaW5lZCwgJ2RlY29yYXRvcnMnLCB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlF1ZXN0aW9uVG9rZW4pLFxuICAgICAgdHMuY3JlYXRlQXJyYXlUeXBlTm9kZSh0cy5jcmVhdGVUeXBlTGl0ZXJhbE5vZGUoW1xuICAgICAgICB0cy5jcmVhdGVQcm9wZXJ0eVNpZ25hdHVyZShcbiAgICAgICAgICAgIHVuZGVmaW5lZCwgJ3R5cGUnLCB1bmRlZmluZWQsXG4gICAgICAgICAgICB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZSh0cy5jcmVhdGVJZGVudGlmaWVyKCdGdW5jdGlvbicpLCB1bmRlZmluZWQpLCB1bmRlZmluZWQpLFxuICAgICAgICB0cy5jcmVhdGVQcm9wZXJ0eVNpZ25hdHVyZShcbiAgICAgICAgICAgIHVuZGVmaW5lZCwgJ2FyZ3MnLCB0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlF1ZXN0aW9uVG9rZW4pLFxuICAgICAgICAgICAgdHMuY3JlYXRlQXJyYXlUeXBlTm9kZShcbiAgICAgICAgICAgICAgICB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZSh0cy5jcmVhdGVJZGVudGlmaWVyKCdhbnknKSwgdW5kZWZpbmVkKSksXG4gICAgICAgICAgICB1bmRlZmluZWQpLFxuICAgICAgXSkpLFxuICAgICAgdW5kZWZpbmVkKSk7XG5cbiAgLy8gVE9ETyhhbGFuLWFnaXVzNCk6IFJlbW92ZSB3aGVuIHdlIG5vIGxvbmdlciBzdXBwb3J0IFRTIDMuOVxuICBjb25zdCBudWxsTGl0ZXJhbCA9IHRzLmNyZWF0ZU51bGwoKSBhcyBhbnk7XG4gIGNvbnN0IG51bGxUeXBlID0gdHMudmVyc2lvbk1ham9yTWlub3IuY2hhckF0KDApID09PSAnNCcgP1xuICAgICAgdHMuY3JlYXRlTGl0ZXJhbFR5cGVOb2RlKG51bGxMaXRlcmFsIGFzIGFueSkgOlxuICAgICAgbnVsbExpdGVyYWw7XG4gIHJldHVybiB0cy5jcmVhdGVGdW5jdGlvblR5cGVOb2RlKHVuZGVmaW5lZCwgW10sIHRzLmNyZWF0ZUFycmF5VHlwZU5vZGUodHMuY3JlYXRlVW5pb25UeXBlTm9kZShbXG4gICAgdHMuY3JlYXRlVHlwZUxpdGVyYWxOb2RlKHR5cGVFbGVtZW50cyksXG4gICAgbnVsbFR5cGUsXG4gIF0pKSk7XG59XG5cbi8qKlxuICogU2V0cyBhIENsb3N1cmUgXFxAbm9jb2xsYXBzZSBzeW50aGV0aWMgY29tbWVudCBvbiB0aGUgZ2l2ZW4gbm9kZS4gVGhpcyBwcmV2ZW50cyBDbG9zdXJlIENvbXBpbGVyXG4gKiBmcm9tIGNvbGxhcHNpbmcgdGhlIGFwcGFyZW50bHkgc3RhdGljIHByb3BlcnR5LCB3aGljaCB3b3VsZCBtYWtlIGl0IGltcG9zc2libGUgdG8gZmluZCBmb3IgY29kZVxuICogdHJ5aW5nIHRvIGRldGVjdCBpdCBhdCBydW50aW1lLlxuICovXG5mdW5jdGlvbiBhZGROb0NvbGxhcHNlQ29tbWVudChuOiB0cy5Ob2RlKSB7XG4gIHRzLnNldFN5bnRoZXRpY0xlYWRpbmdDb21tZW50cyhuLCBbe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kOiB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6ICcqIEBub2NvbGxhcHNlICcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvczogLTEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogLTEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc1RyYWlsaW5nTmV3TGluZTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfV0pO1xufVxuXG4vKipcbiAqIGNyZWF0ZUN0b3JQYXJhbWV0ZXJzQ2xhc3NQcm9wZXJ0eSBjcmVhdGVzIGEgc3RhdGljICdjdG9yUGFyYW1ldGVycycgcHJvcGVydHkgY29udGFpbmluZ1xuICogZG93bmxldmVsZWQgZGVjb3JhdG9yIGluZm9ybWF0aW9uLlxuICpcbiAqIFRoZSBwcm9wZXJ0eSBjb250YWlucyBhbiBhcnJvdyBmdW5jdGlvbiB0aGF0IHJldHVybnMgYW4gYXJyYXkgb2Ygb2JqZWN0IGxpdGVyYWxzIG9mIHRoZSBzaGFwZTpcbiAqICAgICBzdGF0aWMgY3RvclBhcmFtZXRlcnMgPSAoKSA9PiBbe1xuICogICAgICAgdHlwZTogU29tZUNsYXNzfHVuZGVmaW5lZCwgIC8vIHRoZSB0eXBlIG9mIHRoZSBwYXJhbSB0aGF0J3MgZGVjb3JhdGVkLCBpZiBpdCdzIGEgdmFsdWUuXG4gKiAgICAgICBkZWNvcmF0b3JzOiBbe1xuICogICAgICAgICB0eXBlOiBEZWNvcmF0b3JGbiwgIC8vIHRoZSB0eXBlIG9mIHRoZSBkZWNvcmF0b3IgdGhhdCdzIGludm9rZWQuXG4gKiAgICAgICAgIGFyZ3M6IFtBUkdTXSwgICAgICAgLy8gdGhlIGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIGRlY29yYXRvci5cbiAqICAgICAgIH1dXG4gKiAgICAgfV07XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUN0b3JQYXJhbWV0ZXJzQ2xhc3NQcm9wZXJ0eShcbiAgICBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdLFxuICAgIGVudGl0eU5hbWVUb0V4cHJlc3Npb246IChuOiB0cy5FbnRpdHlOYW1lKSA9PiB0cy5FeHByZXNzaW9uIHwgdW5kZWZpbmVkLFxuICAgIGN0b3JQYXJhbWV0ZXJzOiBQYXJhbWV0ZXJEZWNvcmF0aW9uSW5mb1tdLFxuICAgIGlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZDogYm9vbGVhbik6IHRzLlByb3BlcnR5RGVjbGFyYXRpb24ge1xuICBjb25zdCBwYXJhbXM6IHRzLkV4cHJlc3Npb25bXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgY3RvclBhcmFtIG9mIGN0b3JQYXJhbWV0ZXJzKSB7XG4gICAgaWYgKCFjdG9yUGFyYW0udHlwZSAmJiBjdG9yUGFyYW0uZGVjb3JhdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHBhcmFtcy5wdXNoKHRzLmNyZWF0ZU51bGwoKSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJhbVR5cGUgPSBjdG9yUGFyYW0udHlwZSA/XG4gICAgICAgIHR5cGVSZWZlcmVuY2VUb0V4cHJlc3Npb24oZW50aXR5TmFtZVRvRXhwcmVzc2lvbiwgY3RvclBhcmFtLnR5cGUpIDpcbiAgICAgICAgdW5kZWZpbmVkO1xuICAgIGNvbnN0IG1lbWJlcnMgPVxuICAgICAgICBbdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KCd0eXBlJywgcGFyYW1UeXBlIHx8IHRzLmNyZWF0ZUlkZW50aWZpZXIoJ3VuZGVmaW5lZCcpKV07XG5cbiAgICBjb25zdCBkZWNvcmF0b3JzOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbltdID0gW107XG4gICAgZm9yIChjb25zdCBkZWNvIG9mIGN0b3JQYXJhbS5kZWNvcmF0b3JzKSB7XG4gICAgICBkZWNvcmF0b3JzLnB1c2goZXh0cmFjdE1ldGFkYXRhRnJvbVNpbmdsZURlY29yYXRvcihkZWNvLCBkaWFnbm9zdGljcykpO1xuICAgIH1cbiAgICBpZiAoZGVjb3JhdG9ycy5sZW5ndGgpIHtcbiAgICAgIG1lbWJlcnMucHVzaCh0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoJ2RlY29yYXRvcnMnLCB0cy5jcmVhdGVBcnJheUxpdGVyYWwoZGVjb3JhdG9ycykpKTtcbiAgICB9XG4gICAgcGFyYW1zLnB1c2godHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChtZW1iZXJzKSk7XG4gIH1cblxuICBjb25zdCBpbml0aWFsaXplciA9IHRzLmNyZWF0ZUFycm93RnVuY3Rpb24oXG4gICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCwgW10sIHVuZGVmaW5lZCwgdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5FcXVhbHNHcmVhdGVyVGhhblRva2VuKSxcbiAgICAgIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChwYXJhbXMsIHRydWUpKTtcbiAgY29uc3QgdHlwZSA9IGNyZWF0ZUN0b3JQYXJhbWV0ZXJzQ2xhc3NQcm9wZXJ0eVR5cGUoKTtcbiAgY29uc3QgY3RvclByb3AgPSB0cy5jcmVhdGVQcm9wZXJ0eShcbiAgICAgIHVuZGVmaW5lZCwgW3RzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCldLCAnY3RvclBhcmFtZXRlcnMnLCB1bmRlZmluZWQsIHR5cGUsXG4gICAgICBpbml0aWFsaXplcik7XG4gIGlmIChpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQpIHtcbiAgICBhZGROb0NvbGxhcHNlQ29tbWVudChjdG9yUHJvcCk7XG4gIH1cbiAgcmV0dXJuIGN0b3JQcm9wO1xufVxuXG4vKipcbiAqIGNyZWF0ZVByb3BEZWNvcmF0b3JzQ2xhc3NQcm9wZXJ0eSBjcmVhdGVzIGEgc3RhdGljICdwcm9wRGVjb3JhdG9ycycgcHJvcGVydHkgY29udGFpbmluZyB0eXBlXG4gKiBpbmZvcm1hdGlvbiBmb3IgZXZlcnkgcHJvcGVydHkgdGhhdCBoYXMgYSBkZWNvcmF0b3IgYXBwbGllZC5cbiAqXG4gKiAgICAgc3RhdGljIHByb3BEZWNvcmF0b3JzOiB7W2tleTogc3RyaW5nXToge3R5cGU6IEZ1bmN0aW9uLCBhcmdzPzogYW55W119W119ID0ge1xuICogICAgICAgcHJvcEE6IFt7dHlwZTogTXlEZWNvcmF0b3IsIGFyZ3M6IFsxLCAyXX0sIC4uLl0sXG4gKiAgICAgICAuLi5cbiAqICAgICB9O1xuICovXG5mdW5jdGlvbiBjcmVhdGVQcm9wRGVjb3JhdG9yc0NsYXNzUHJvcGVydHkoXG4gICAgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSwgcHJvcGVydGllczogTWFwPHN0cmluZywgdHMuRGVjb3JhdG9yW10+KTogdHMuUHJvcGVydHlEZWNsYXJhdGlvbiB7XG4gIC8vICBgc3RhdGljIHByb3BEZWNvcmF0b3JzOiB7W2tleTogc3RyaW5nXTogYCArIHt0eXBlOiBGdW5jdGlvbiwgYXJncz86IGFueVtdfVtdICsgYH0gPSB7XFxuYCk7XG4gIGNvbnN0IGVudHJpZXM6IHRzLk9iamVjdExpdGVyYWxFbGVtZW50TGlrZVtdID0gW107XG4gIGZvciAoY29uc3QgW25hbWUsIGRlY29yYXRvcnNdIG9mIHByb3BlcnRpZXMuZW50cmllcygpKSB7XG4gICAgZW50cmllcy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChcbiAgICAgICAgbmFtZSxcbiAgICAgICAgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKFxuICAgICAgICAgICAgZGVjb3JhdG9ycy5tYXAoZGVjbyA9PiBleHRyYWN0TWV0YWRhdGFGcm9tU2luZ2xlRGVjb3JhdG9yKGRlY28sIGRpYWdub3N0aWNzKSkpKSk7XG4gIH1cbiAgY29uc3QgaW5pdGlhbGl6ZXIgPSB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKGVudHJpZXMsIHRydWUpO1xuICBjb25zdCB0eXBlID0gdHMuY3JlYXRlVHlwZUxpdGVyYWxOb2RlKFt0cy5jcmVhdGVJbmRleFNpZ25hdHVyZShcbiAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBbdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAna2V5JywgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZSgnc3RyaW5nJywgdW5kZWZpbmVkKSwgdW5kZWZpbmVkKV0sXG4gICAgICBjcmVhdGVEZWNvcmF0b3JJbnZvY2F0aW9uVHlwZSgpKV0pO1xuICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHkoXG4gICAgICB1bmRlZmluZWQsIFt0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpXSwgJ3Byb3BEZWNvcmF0b3JzJywgdW5kZWZpbmVkLCB0eXBlLFxuICAgICAgaW5pdGlhbGl6ZXIpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gZXhwcmVzc2lvbiByZXByZXNlbnRpbmcgdGhlIChwb3RlbnRpYWxseSkgdmFsdWUgcGFydCBmb3IgdGhlIGdpdmVuIG5vZGUuXG4gKlxuICogVGhpcyBpcyBhIHBhcnRpYWwgcmUtaW1wbGVtZW50YXRpb24gb2YgVHlwZVNjcmlwdCdzIHNlcmlhbGl6ZVR5cGVSZWZlcmVuY2VOb2RlLiBUaGlzIGlzIGFcbiAqIHdvcmthcm91bmQgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMTc1MTYgKHNlcmlhbGl6ZVR5cGVSZWZlcmVuY2VOb2RlXG4gKiBub3QgYmVpbmcgZXhwb3NlZCkuIEluIHByYWN0aWNlIHRoaXMgaW1wbGVtZW50YXRpb24gaXMgc3VmZmljaWVudCBmb3IgQW5ndWxhcidzIHVzZSBvZiB0eXBlXG4gKiBtZXRhZGF0YS5cbiAqL1xuZnVuY3Rpb24gdHlwZVJlZmVyZW5jZVRvRXhwcmVzc2lvbihcbiAgICBlbnRpdHlOYW1lVG9FeHByZXNzaW9uOiAobjogdHMuRW50aXR5TmFtZSkgPT4gdHMuRXhwcmVzc2lvbiB8IHVuZGVmaW5lZCxcbiAgICBub2RlOiB0cy5UeXBlTm9kZSk6IHRzLkV4cHJlc3Npb258dW5kZWZpbmVkIHtcbiAgbGV0IGtpbmQgPSBub2RlLmtpbmQ7XG4gIGlmICh0cy5pc0xpdGVyYWxUeXBlTm9kZShub2RlKSkge1xuICAgIC8vIFRyZWF0IGxpdGVyYWwgdHlwZXMgbGlrZSB0aGVpciBiYXNlIHR5cGUgKGJvb2xlYW4sIHN0cmluZywgbnVtYmVyKS5cbiAgICBraW5kID0gbm9kZS5saXRlcmFsLmtpbmQ7XG4gIH1cbiAgc3dpdGNoIChraW5kKSB7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkZ1bmN0aW9uVHlwZTpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ29uc3RydWN0b3JUeXBlOlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ0Z1bmN0aW9uJyk7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkFycmF5VHlwZTpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuVHVwbGVUeXBlOlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ0FycmF5Jyk7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlR5cGVQcmVkaWNhdGU6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5GYWxzZUtleXdvcmQ6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkJvb2xlYW5LZXl3b3JkOlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ0Jvb2xlYW4nKTtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuU3RyaW5nS2V5d29yZDpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCdTdHJpbmcnKTtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuT2JqZWN0S2V5d29yZDpcbiAgICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCdPYmplY3QnKTtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuTnVtYmVyS2V5d29yZDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuTnVtZXJpY0xpdGVyYWw6XG4gICAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcignTnVtYmVyJyk7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlR5cGVSZWZlcmVuY2U6XG4gICAgICBjb25zdCB0eXBlUmVmID0gbm9kZSBhcyB0cy5UeXBlUmVmZXJlbmNlTm9kZTtcbiAgICAgIC8vIElnbm9yZSBhbnkgZ2VuZXJpYyB0eXBlcywganVzdCByZXR1cm4gdGhlIGJhc2UgdHlwZS5cbiAgICAgIHJldHVybiBlbnRpdHlOYW1lVG9FeHByZXNzaW9uKHR5cGVSZWYudHlwZU5hbWUpO1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5VbmlvblR5cGU6XG4gICAgICAvLyBUT0RPKGFsYW4tYWdpdXM0KTogcmVtb3ZlIGB0LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuTnVsbEtleXdvcmRgIHdoZW5cbiAgICAgIC8vIFRTIDMuOSBzdXBwb3J0IGlzIGRyb3BwZWQuIEluIFRTIDQuMCBOdWxsS2V5d29yZCBpcyBhIGNoaWxkIG9mIExpdGVyYWxUeXBlLlxuICAgICAgY29uc3QgY2hpbGRUeXBlTm9kZXMgPVxuICAgICAgICAgIChub2RlIGFzIHRzLlVuaW9uVHlwZU5vZGUpXG4gICAgICAgICAgICAgIC50eXBlcy5maWx0ZXIoXG4gICAgICAgICAgICAgICAgICB0ID0+IHQua2luZCAhPT0gdHMuU3ludGF4S2luZC5OdWxsS2V5d29yZCAmJlxuICAgICAgICAgICAgICAgICAgICAgICEodHMuaXNMaXRlcmFsVHlwZU5vZGUodCkgJiYgdC5saXRlcmFsLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuTnVsbEtleXdvcmQpKTtcbiAgICAgIHJldHVybiBjaGlsZFR5cGVOb2Rlcy5sZW5ndGggPT09IDEgP1xuICAgICAgICAgIHR5cGVSZWZlcmVuY2VUb0V4cHJlc3Npb24oZW50aXR5TmFtZVRvRXhwcmVzc2lvbiwgY2hpbGRUeXBlTm9kZXNbMF0pIDpcbiAgICAgICAgICB1bmRlZmluZWQ7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIGdpdmVuIHN5bWJvbCByZWZlcnMgdG8gYSB2YWx1ZSB0aGF0IGV4aXN0cyBhdCBydW50aW1lIChhcyBkaXN0aW5jdCBmcm9tIGEgdHlwZSkuXG4gKlxuICogRXhwYW5kcyBhbGlhc2VzLCB3aGljaCBpcyBpbXBvcnRhbnQgZm9yIHRoZSBjYXNlIHdoZXJlXG4gKiAgIGltcG9ydCAqIGFzIHggZnJvbSAnc29tZS1tb2R1bGUnO1xuICogYW5kIHggaXMgbm93IGEgdmFsdWUgKHRoZSBtb2R1bGUgb2JqZWN0KS5cbiAqL1xuZnVuY3Rpb24gc3ltYm9sSXNSdW50aW1lVmFsdWUodHlwZUNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBzeW1ib2w6IHRzLlN5bWJvbCk6IGJvb2xlYW4ge1xuICBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICBzeW1ib2wgPSB0eXBlQ2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHN5bWJvbCk7XG4gIH1cblxuICAvLyBOb3RlIHRoYXQgY29uc3QgZW51bXMgYXJlIGEgc3BlY2lhbCBjYXNlLCBiZWNhdXNlXG4gIC8vIHdoaWxlIHRoZXkgaGF2ZSBhIHZhbHVlLCB0aGV5IGRvbid0IGV4aXN0IGF0IHJ1bnRpbWUuXG4gIHJldHVybiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuVmFsdWUgJiB0cy5TeW1ib2xGbGFncy5Db25zdEVudW1FeGNsdWRlcykgIT09IDA7XG59XG5cbi8qKiBQYXJhbWV0ZXJEZWNvcmF0aW9uSW5mbyBkZXNjcmliZXMgdGhlIGluZm9ybWF0aW9uIGZvciBhIHNpbmdsZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIuICovXG5pbnRlcmZhY2UgUGFyYW1ldGVyRGVjb3JhdGlvbkluZm8ge1xuICAvKipcbiAgICogVGhlIHR5cGUgZGVjbGFyYXRpb24gZm9yIHRoZSBwYXJhbWV0ZXIuIE9ubHkgc2V0IGlmIHRoZSB0eXBlIGlzIGEgdmFsdWUgKGUuZy4gYSBjbGFzcywgbm90IGFuXG4gICAqIGludGVyZmFjZSkuXG4gICAqL1xuICB0eXBlOiB0cy5UeXBlTm9kZXxudWxsO1xuICAvKiogVGhlIGxpc3Qgb2YgZGVjb3JhdG9ycyBmb3VuZCBvbiB0aGUgcGFyYW1ldGVyLCBudWxsIGlmIG5vbmUuICovXG4gIGRlY29yYXRvcnM6IHRzLkRlY29yYXRvcltdO1xufVxuXG4vKipcbiAqIEdldHMgYSB0cmFuc2Zvcm1lciBmb3IgZG93bmxldmVsaW5nIEFuZ3VsYXIgZGVjb3JhdG9ycy5cbiAqIEBwYXJhbSB0eXBlQ2hlY2tlciBSZWZlcmVuY2UgdG8gdGhlIHByb2dyYW0ncyB0eXBlIGNoZWNrZXIuXG4gKiBAcGFyYW0gaG9zdCBSZWZsZWN0aW9uIGhvc3QgdGhhdCBpcyB1c2VkIGZvciBkZXRlcm1pbmluZyBkZWNvcmF0b3JzLlxuICogQHBhcmFtIGRpYWdub3N0aWNzIExpc3Qgd2hpY2ggd2lsbCBiZSBwb3B1bGF0ZWQgd2l0aCBkaWFnbm9zdGljcyBpZiBhbnkuXG4gKiBAcGFyYW0gaXNDb3JlIFdoZXRoZXIgdGhlIGN1cnJlbnQgVHlwZVNjcmlwdCBwcm9ncmFtIGlzIGZvciB0aGUgYEBhbmd1bGFyL2NvcmVgIHBhY2thZ2UuXG4gKiBAcGFyYW0gaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkIFdoZXRoZXIgY2xvc3VyZSBhbm5vdGF0aW9ucyBuZWVkIHRvIGJlIGFkZGVkIHdoZXJlIG5lZWRlZC5cbiAqIEBwYXJhbSBza2lwQ2xhc3NEZWNvcmF0b3JzIFdoZXRoZXIgY2xhc3MgZGVjb3JhdG9ycyBzaG91bGQgYmUgc2tpcHBlZCBmcm9tIGRvd25sZXZlbGluZy5cbiAqICAgVGhpcyBpcyB1c2VmdWwgZm9yIEpJVCBtb2RlIHdoZXJlIGNsYXNzIGRlY29yYXRvcnMgc2hvdWxkIGJlIHByZXNlcnZlZCBhcyB0aGV5IGNvdWxkIHJlbHlcbiAqICAgb24gaW1tZWRpYXRlIGV4ZWN1dGlvbi4gZS5nLiBkb3dubGV2ZWxpbmcgYEBJbmplY3RhYmxlYCBtZWFucyB0aGF0IHRoZSBpbmplY3RhYmxlIGZhY3RvcnlcbiAqICAgaXMgbm90IGNyZWF0ZWQsIGFuZCBpbmplY3RpbmcgdGhlIHRva2VuIHdpbGwgbm90IHdvcmsuIElmIHRoaXMgZGVjb3JhdG9yIHdvdWxkIG5vdCBiZVxuICogICBkb3dubGV2ZWxlZCwgdGhlIGBJbmplY3RhYmxlYCBkZWNvcmF0b3Igd2lsbCBleGVjdXRlIGltbWVkaWF0ZWx5IG9uIGZpbGUgbG9hZCwgYW5kXG4gKiAgIEFuZ3VsYXIgd2lsbCBnZW5lcmF0ZSB0aGUgY29ycmVzcG9uZGluZyBpbmplY3RhYmxlIGZhY3RvcnkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREb3dubGV2ZWxEZWNvcmF0b3JzVHJhbnNmb3JtKFxuICAgIHR5cGVDaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgaG9zdDogUmVmbGVjdGlvbkhvc3QsIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10sXG4gICAgaXNDb3JlOiBib29sZWFuLCBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW4sXG4gICAgc2tpcENsYXNzRGVjb3JhdG9yczogYm9vbGVhbik6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPiB7XG4gIHJldHVybiAoY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KSA9PiB7XG4gICAgbGV0IHJlZmVyZW5jZWRQYXJhbWV0ZXJUeXBlcyA9IG5ldyBTZXQ8dHMuRGVjbGFyYXRpb24+KCk7XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBhbiBFbnRpdHlOYW1lIChmcm9tIGEgdHlwZSBhbm5vdGF0aW9uKSB0byBhbiBleHByZXNzaW9uIChhY2Nlc3NpbmcgYSB2YWx1ZSkuXG4gICAgICpcbiAgICAgKiBGb3IgYSBnaXZlbiBxdWFsaWZpZWQgbmFtZSwgdGhpcyB3YWxrcyBkZXB0aCBmaXJzdCB0byBmaW5kIHRoZSBsZWZ0bW9zdCBpZGVudGlmaWVyLFxuICAgICAqIGFuZCB0aGVuIGNvbnZlcnRzIHRoZSBwYXRoIGludG8gYSBwcm9wZXJ0eSBhY2Nlc3MgdGhhdCBjYW4gYmUgdXNlZCBhcyBleHByZXNzaW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVudGl0eU5hbWVUb0V4cHJlc3Npb24obmFtZTogdHMuRW50aXR5TmFtZSk6IHRzLkV4cHJlc3Npb258dW5kZWZpbmVkIHtcbiAgICAgIGNvbnN0IHN5bWJvbCA9IHR5cGVDaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obmFtZSk7XG4gICAgICAvLyBDaGVjayBpZiB0aGUgZW50aXR5IG5hbWUgcmVmZXJlbmNlcyBhIHN5bWJvbCB0aGF0IGlzIGFuIGFjdHVhbCB2YWx1ZS4gSWYgaXQgaXMgbm90LCBpdFxuICAgICAgLy8gY2Fubm90IGJlIHJlZmVyZW5jZWQgYnkgYW4gZXhwcmVzc2lvbiwgc28gcmV0dXJuIHVuZGVmaW5lZC5cbiAgICAgIGlmICghc3ltYm9sIHx8ICFzeW1ib2xJc1J1bnRpbWVWYWx1ZSh0eXBlQ2hlY2tlciwgc3ltYm9sKSB8fCAhc3ltYm9sLmRlY2xhcmF0aW9ucyB8fFxuICAgICAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICAvLyBJZiB3ZSBkZWFsIHdpdGggYSBxdWFsaWZpZWQgbmFtZSwgYnVpbGQgdXAgYSBwcm9wZXJ0eSBhY2Nlc3MgZXhwcmVzc2lvblxuICAgICAgLy8gdGhhdCBjb3VsZCBiZSB1c2VkIGluIHRoZSBKYXZhU2NyaXB0IG91dHB1dC5cbiAgICAgIGlmICh0cy5pc1F1YWxpZmllZE5hbWUobmFtZSkpIHtcbiAgICAgICAgY29uc3QgY29udGFpbmVyRXhwciA9IGVudGl0eU5hbWVUb0V4cHJlc3Npb24obmFtZS5sZWZ0KTtcbiAgICAgICAgaWYgKGNvbnRhaW5lckV4cHIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGNvbnRhaW5lckV4cHIsIG5hbWUucmlnaHQpO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVjbCA9IHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgICAvLyBJZiB0aGUgZ2l2ZW4gZW50aXR5IG5hbWUgaGFzIGJlZW4gcmVzb2x2ZWQgdG8gYW4gYWxpYXMgaW1wb3J0IGRlY2xhcmF0aW9uLFxuICAgICAgLy8gZW5zdXJlIHRoYXQgdGhlIGFsaWFzIGRlY2xhcmF0aW9uIGlzIG5vdCBlbGlkZWQgYnkgVHlwZVNjcmlwdCwgYW5kIHVzZSBpdHNcbiAgICAgIC8vIG5hbWUgaWRlbnRpZmllciB0byByZWZlcmVuY2UgaXQgYXQgcnVudGltZS5cbiAgICAgIGlmIChpc0FsaWFzSW1wb3J0RGVjbGFyYXRpb24oZGVjbCkpIHtcbiAgICAgICAgcmVmZXJlbmNlZFBhcmFtZXRlclR5cGVzLmFkZChkZWNsKTtcbiAgICAgICAgLy8gSWYgdGhlIGVudGl0eSBuYW1lIHJlc29sdmVzIHRvIGFuIGFsaWFzIGltcG9ydCBkZWNsYXJhdGlvbiwgd2UgcmVmZXJlbmNlIHRoZVxuICAgICAgICAvLyBlbnRpdHkgYmFzZWQgb24gdGhlIGFsaWFzIGltcG9ydCBuYW1lLiBUaGlzIGVuc3VyZXMgdGhhdCBUeXBlU2NyaXB0IHByb3Blcmx5XG4gICAgICAgIC8vIHJlc29sdmVzIHRoZSBsaW5rIHRvIHRoZSBpbXBvcnQuIENsb25pbmcgdGhlIG9yaWdpbmFsIGVudGl0eSBuYW1lIGlkZW50aWZpZXJcbiAgICAgICAgLy8gY291bGQgbGVhZCB0byBhbiBpbmNvcnJlY3QgcmVzb2x1dGlvbiBhdCBsb2NhbCBzY29wZS4gZS5nLiBDb25zaWRlciB0aGUgZm9sbG93aW5nXG4gICAgICAgIC8vIHNuaXBwZXQ6IGBjb25zdHJ1Y3RvcihEZXA6IERlcCkge31gLiBJbiBzdWNoIGEgY2FzZSwgdGhlIGxvY2FsIGBEZXBgIGlkZW50aWZpZXJcbiAgICAgICAgLy8gd291bGQgcmVzb2x2ZSB0byB0aGUgYWN0dWFsIHBhcmFtZXRlciBuYW1lLCBhbmQgbm90IHRvIHRoZSBkZXNpcmVkIGltcG9ydC5cbiAgICAgICAgLy8gVGhpcyBoYXBwZW5zIGJlY2F1c2UgdGhlIGVudGl0eSBuYW1lIGlkZW50aWZpZXIgc3ltYm9sIGlzIGludGVybmFsbHkgY29uc2lkZXJlZFxuICAgICAgICAvLyBhcyB0eXBlLW9ubHkgYW5kIHRoZXJlZm9yZSBUeXBlU2NyaXB0IHRyaWVzIHRvIHJlc29sdmUgaXQgYXMgdmFsdWUgbWFudWFsbHkuXG4gICAgICAgIC8vIFdlIGNhbiBoZWxwIFR5cGVTY3JpcHQgYW5kIGF2b2lkIHRoaXMgbm9uLXJlbGlhYmxlIHJlc29sdXRpb24gYnkgdXNpbmcgYW4gaWRlbnRpZmllclxuICAgICAgICAvLyB0aGF0IGlzIG5vdCB0eXBlLW9ubHkgYW5kIGlzIGRpcmVjdGx5IGxpbmtlZCB0byB0aGUgaW1wb3J0IGFsaWFzIGRlY2xhcmF0aW9uLlxuICAgICAgICBpZiAoZGVjbC5uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gdHMuZ2V0TXV0YWJsZUNsb25lKGRlY2wubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIENsb25lIHRoZSBvcmlnaW5hbCBlbnRpdHkgbmFtZSBpZGVudGlmaWVyIHNvIHRoYXQgaXQgY2FuIGJlIHVzZWQgdG8gcmVmZXJlbmNlXG4gICAgICAvLyBpdHMgdmFsdWUgYXQgcnVudGltZS4gVGhpcyBpcyB1c2VkIHdoZW4gdGhlIGlkZW50aWZpZXIgaXMgcmVzb2x2aW5nIHRvIGEgZmlsZVxuICAgICAgLy8gbG9jYWwgZGVjbGFyYXRpb24gKG90aGVyd2lzZSBpdCB3b3VsZCByZXNvbHZlIHRvIGFuIGFsaWFzIGltcG9ydCBkZWNsYXJhdGlvbikuXG4gICAgICByZXR1cm4gdHMuZ2V0TXV0YWJsZUNsb25lKG5hbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyYW5zZm9ybXMgYSBjbGFzcyBlbGVtZW50LiBSZXR1cm5zIGEgdGhyZWUgdHVwbGUgb2YgbmFtZSwgdHJhbnNmb3JtZWQgZWxlbWVudCwgYW5kXG4gICAgICogZGVjb3JhdG9ycyBmb3VuZC4gUmV0dXJucyBhbiB1bmRlZmluZWQgbmFtZSBpZiB0aGVyZSBhcmUgbm8gZGVjb3JhdG9ycyB0byBsb3dlciBvbiB0aGVcbiAgICAgKiBlbGVtZW50LCBvciB0aGUgZWxlbWVudCBoYXMgYW4gZXhvdGljIG5hbWUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gdHJhbnNmb3JtQ2xhc3NFbGVtZW50KGVsZW1lbnQ6IHRzLkNsYXNzRWxlbWVudCk6XG4gICAgICAgIFtzdHJpbmd8dW5kZWZpbmVkLCB0cy5DbGFzc0VsZW1lbnQsIHRzLkRlY29yYXRvcltdXSB7XG4gICAgICBlbGVtZW50ID0gdHMudmlzaXRFYWNoQ2hpbGQoZWxlbWVudCwgZGVjb3JhdG9yRG93bmxldmVsVmlzaXRvciwgY29udGV4dCk7XG4gICAgICBjb25zdCBkZWNvcmF0b3JzVG9LZWVwOiB0cy5EZWNvcmF0b3JbXSA9IFtdO1xuICAgICAgY29uc3QgdG9Mb3dlcjogdHMuRGVjb3JhdG9yW10gPSBbXTtcbiAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBob3N0LmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGVsZW1lbnQpIHx8IFtdO1xuICAgICAgZm9yIChjb25zdCBkZWNvcmF0b3Igb2YgZGVjb3JhdG9ycykge1xuICAgICAgICAvLyBXZSBvbmx5IGRlYWwgd2l0aCBjb25jcmV0ZSBub2RlcyBpbiBUeXBlU2NyaXB0IHNvdXJjZXMsIHNvIHdlIGRvbid0XG4gICAgICAgIC8vIG5lZWQgdG8gaGFuZGxlIHN5bnRoZXRpY2FsbHkgY3JlYXRlZCBkZWNvcmF0b3JzLlxuICAgICAgICBjb25zdCBkZWNvcmF0b3JOb2RlID0gZGVjb3JhdG9yLm5vZGUhIGFzIHRzLkRlY29yYXRvcjtcbiAgICAgICAgaWYgKCFpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yLCBpc0NvcmUpKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc1RvS2VlcC5wdXNoKGRlY29yYXRvck5vZGUpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRvTG93ZXIucHVzaChkZWNvcmF0b3JOb2RlKTtcbiAgICAgIH1cbiAgICAgIGlmICghdG9Mb3dlci5sZW5ndGgpIHJldHVybiBbdW5kZWZpbmVkLCBlbGVtZW50LCBbXV07XG5cbiAgICAgIGlmICghZWxlbWVudC5uYW1lIHx8ICF0cy5pc0lkZW50aWZpZXIoZWxlbWVudC5uYW1lKSkge1xuICAgICAgICAvLyBNZXRob2QgaGFzIGEgd2VpcmQgbmFtZSwgZS5nLlxuICAgICAgICAvLyAgIFtTeW1ib2wuZm9vXSgpIHsuLi59XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICAgIGZpbGU6IGVsZW1lbnQuZ2V0U291cmNlRmlsZSgpLFxuICAgICAgICAgIHN0YXJ0OiBlbGVtZW50LmdldFN0YXJ0KCksXG4gICAgICAgICAgbGVuZ3RoOiBlbGVtZW50LmdldEVuZCgpIC0gZWxlbWVudC5nZXRTdGFydCgpLFxuICAgICAgICAgIG1lc3NhZ2VUZXh0OiBgQ2Fubm90IHByb2Nlc3MgZGVjb3JhdG9ycyBmb3IgY2xhc3MgZWxlbWVudCB3aXRoIG5vbi1hbmFseXphYmxlIG5hbWUuYCxcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIGNvZGU6IDAsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gW3VuZGVmaW5lZCwgZWxlbWVudCwgW11dO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBuYW1lID0gKGVsZW1lbnQubmFtZSBhcyB0cy5JZGVudGlmaWVyKS50ZXh0O1xuICAgICAgY29uc3QgbXV0YWJsZSA9IHRzLmdldE11dGFibGVDbG9uZShlbGVtZW50KTtcbiAgICAgIChtdXRhYmxlIGFzIGFueSkuZGVjb3JhdG9ycyA9IGRlY29yYXRvcnNUb0tlZXAubGVuZ3RoID9cbiAgICAgICAgICB0cy5zZXRUZXh0UmFuZ2UodHMuY3JlYXRlTm9kZUFycmF5KGRlY29yYXRvcnNUb0tlZXApLCBtdXRhYmxlLmRlY29yYXRvcnMpIDpcbiAgICAgICAgICB1bmRlZmluZWQ7XG4gICAgICByZXR1cm4gW25hbWUsIG11dGFibGUsIHRvTG93ZXJdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyYW5zZm9ybXMgYSBjb25zdHJ1Y3Rvci4gUmV0dXJucyB0aGUgdHJhbnNmb3JtZWQgY29uc3RydWN0b3IgYW5kIHRoZSBsaXN0IG9mIHBhcmFtZXRlclxuICAgICAqIGluZm9ybWF0aW9uIGNvbGxlY3RlZCwgY29uc2lzdGluZyBvZiBkZWNvcmF0b3JzIGFuZCBvcHRpb25hbCB0eXBlLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRyYW5zZm9ybUNvbnN0cnVjdG9yKGN0b3I6IHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb24pOlxuICAgICAgICBbdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbiwgUGFyYW1ldGVyRGVjb3JhdGlvbkluZm9bXV0ge1xuICAgICAgY3RvciA9IHRzLnZpc2l0RWFjaENoaWxkKGN0b3IsIGRlY29yYXRvckRvd25sZXZlbFZpc2l0b3IsIGNvbnRleHQpO1xuXG4gICAgICBjb25zdCBuZXdQYXJhbWV0ZXJzOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdID0gW107XG4gICAgICBjb25zdCBvbGRQYXJhbWV0ZXJzID1cbiAgICAgICAgICB0cy52aXNpdFBhcmFtZXRlckxpc3QoY3Rvci5wYXJhbWV0ZXJzLCBkZWNvcmF0b3JEb3dubGV2ZWxWaXNpdG9yLCBjb250ZXh0KTtcbiAgICAgIGNvbnN0IHBhcmFtZXRlcnNJbmZvOiBQYXJhbWV0ZXJEZWNvcmF0aW9uSW5mb1tdID0gW107XG4gICAgICBmb3IgKGNvbnN0IHBhcmFtIG9mIG9sZFBhcmFtZXRlcnMpIHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9yc1RvS2VlcDogdHMuRGVjb3JhdG9yW10gPSBbXTtcbiAgICAgICAgY29uc3QgcGFyYW1JbmZvOiBQYXJhbWV0ZXJEZWNvcmF0aW9uSW5mbyA9IHtkZWNvcmF0b3JzOiBbXSwgdHlwZTogbnVsbH07XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBob3N0LmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKHBhcmFtKSB8fCBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGRlY29yYXRvciBvZiBkZWNvcmF0b3JzKSB7XG4gICAgICAgICAgLy8gV2Ugb25seSBkZWFsIHdpdGggY29uY3JldGUgbm9kZXMgaW4gVHlwZVNjcmlwdCBzb3VyY2VzLCBzbyB3ZSBkb24ndFxuICAgICAgICAgIC8vIG5lZWQgdG8gaGFuZGxlIHN5bnRoZXRpY2FsbHkgY3JlYXRlZCBkZWNvcmF0b3JzLlxuICAgICAgICAgIGNvbnN0IGRlY29yYXRvck5vZGUgPSBkZWNvcmF0b3Iubm9kZSEgYXMgdHMuRGVjb3JhdG9yO1xuICAgICAgICAgIGlmICghaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvciwgaXNDb3JlKSkge1xuICAgICAgICAgICAgZGVjb3JhdG9yc1RvS2VlcC5wdXNoKGRlY29yYXRvck5vZGUpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBhcmFtSW5mbyEuZGVjb3JhdG9ycy5wdXNoKGRlY29yYXRvck5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJhbS50eXBlKSB7XG4gICAgICAgICAgLy8gcGFyYW0gaGFzIGEgdHlwZSBwcm92aWRlZCwgZS5nLiBcImZvbzogQmFyXCIuXG4gICAgICAgICAgLy8gVGhlIHR5cGUgd2lsbCBiZSBlbWl0dGVkIGFzIGEgdmFsdWUgZXhwcmVzc2lvbiBpbiBlbnRpdHlOYW1lVG9FeHByZXNzaW9uLCB3aGljaCB0YWtlc1xuICAgICAgICAgIC8vIGNhcmUgbm90IHRvIGVtaXQgYW55dGhpbmcgZm9yIHR5cGVzIHRoYXQgY2Fubm90IGJlIGV4cHJlc3NlZCBhcyBhIHZhbHVlIChlLmcuXG4gICAgICAgICAgLy8gaW50ZXJmYWNlcykuXG4gICAgICAgICAgcGFyYW1JbmZvIS50eXBlID0gcGFyYW0udHlwZTtcbiAgICAgICAgfVxuICAgICAgICBwYXJhbWV0ZXJzSW5mby5wdXNoKHBhcmFtSW5mbyk7XG4gICAgICAgIGNvbnN0IG5ld1BhcmFtID0gdHMudXBkYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgcGFyYW0sXG4gICAgICAgICAgICAvLyBNdXN0IHBhc3MgJ3VuZGVmaW5lZCcgdG8gYXZvaWQgZW1pdHRpbmcgZGVjb3JhdG9yIG1ldGFkYXRhLlxuICAgICAgICAgICAgZGVjb3JhdG9yc1RvS2VlcC5sZW5ndGggPyBkZWNvcmF0b3JzVG9LZWVwIDogdW5kZWZpbmVkLCBwYXJhbS5tb2RpZmllcnMsXG4gICAgICAgICAgICBwYXJhbS5kb3REb3REb3RUb2tlbiwgcGFyYW0ubmFtZSwgcGFyYW0ucXVlc3Rpb25Ub2tlbiwgcGFyYW0udHlwZSwgcGFyYW0uaW5pdGlhbGl6ZXIpO1xuICAgICAgICBuZXdQYXJhbWV0ZXJzLnB1c2gobmV3UGFyYW0pO1xuICAgICAgfVxuICAgICAgY29uc3QgdXBkYXRlZCA9IHRzLnVwZGF0ZUNvbnN0cnVjdG9yKFxuICAgICAgICAgIGN0b3IsIGN0b3IuZGVjb3JhdG9ycywgY3Rvci5tb2RpZmllcnMsIG5ld1BhcmFtZXRlcnMsXG4gICAgICAgICAgdHMudmlzaXRGdW5jdGlvbkJvZHkoY3Rvci5ib2R5LCBkZWNvcmF0b3JEb3dubGV2ZWxWaXNpdG9yLCBjb250ZXh0KSk7XG4gICAgICByZXR1cm4gW3VwZGF0ZWQsIHBhcmFtZXRlcnNJbmZvXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm1zIGEgc2luZ2xlIGNsYXNzIGRlY2xhcmF0aW9uOlxuICAgICAqIC0gZGlzcGF0Y2hlcyB0byBzdHJpcCBkZWNvcmF0b3JzIG9uIG1lbWJlcnNcbiAgICAgKiAtIGNvbnZlcnRzIGRlY29yYXRvcnMgb24gdGhlIGNsYXNzIHRvIGFubm90YXRpb25zXG4gICAgICogLSBjcmVhdGVzIGEgY3RvclBhcmFtZXRlcnMgcHJvcGVydHlcbiAgICAgKiAtIGNyZWF0ZXMgYSBwcm9wRGVjb3JhdG9ycyBwcm9wZXJ0eVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRyYW5zZm9ybUNsYXNzRGVjbGFyYXRpb24oY2xhc3NEZWNsOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdHMuQ2xhc3NEZWNsYXJhdGlvbiB7XG4gICAgICBjbGFzc0RlY2wgPSB0cy5nZXRNdXRhYmxlQ2xvbmUoY2xhc3NEZWNsKTtcblxuICAgICAgY29uc3QgbmV3TWVtYmVyczogdHMuQ2xhc3NFbGVtZW50W10gPSBbXTtcbiAgICAgIGNvbnN0IGRlY29yYXRlZFByb3BlcnRpZXMgPSBuZXcgTWFwPHN0cmluZywgdHMuRGVjb3JhdG9yW10+KCk7XG4gICAgICBsZXQgY2xhc3NQYXJhbWV0ZXJzOiBQYXJhbWV0ZXJEZWNvcmF0aW9uSW5mb1tdfG51bGwgPSBudWxsO1xuXG4gICAgICBmb3IgKGNvbnN0IG1lbWJlciBvZiBjbGFzc0RlY2wubWVtYmVycykge1xuICAgICAgICBzd2l0Y2ggKG1lbWJlci5raW5kKSB7XG4gICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlByb3BlcnR5RGVjbGFyYXRpb246XG4gICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkdldEFjY2Vzc29yOlxuICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5TZXRBY2Nlc3NvcjpcbiAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuTWV0aG9kRGVjbGFyYXRpb246IHtcbiAgICAgICAgICAgIGNvbnN0IFtuYW1lLCBuZXdNZW1iZXIsIGRlY29yYXRvcnNdID0gdHJhbnNmb3JtQ2xhc3NFbGVtZW50KG1lbWJlcik7XG4gICAgICAgICAgICBuZXdNZW1iZXJzLnB1c2gobmV3TWVtYmVyKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSBkZWNvcmF0ZWRQcm9wZXJ0aWVzLnNldChuYW1lLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ29uc3RydWN0b3I6IHtcbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSBtZW1iZXIgYXMgdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIGlmICghY3Rvci5ib2R5KSBicmVhaztcbiAgICAgICAgICAgIGNvbnN0IFtuZXdNZW1iZXIsIHBhcmFtZXRlcnNJbmZvXSA9XG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtQ29uc3RydWN0b3IobWVtYmVyIGFzIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgY2xhc3NQYXJhbWV0ZXJzID0gcGFyYW1ldGVyc0luZm87XG4gICAgICAgICAgICBuZXdNZW1iZXJzLnB1c2gobmV3TWVtYmVyKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbmV3TWVtYmVycy5wdXNoKHRzLnZpc2l0RWFjaENoaWxkKG1lbWJlciwgZGVjb3JhdG9yRG93bmxldmVsVmlzaXRvciwgY29udGV4dCkpO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGhvc3QuZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oY2xhc3NEZWNsKSB8fCBbXTtcblxuICAgICAgbGV0IGhhc0FuZ3VsYXJEZWNvcmF0b3IgPSBmYWxzZTtcbiAgICAgIGNvbnN0IGRlY29yYXRvcnNUb0xvd2VyID0gW107XG4gICAgICBjb25zdCBkZWNvcmF0b3JzVG9LZWVwOiB0cy5EZWNvcmF0b3JbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBkZWNvcmF0b3Igb2YgZGVjb3JhdG9ycykge1xuICAgICAgICAvLyBXZSBvbmx5IGRlYWwgd2l0aCBjb25jcmV0ZSBub2RlcyBpbiBUeXBlU2NyaXB0IHNvdXJjZXMsIHNvIHdlIGRvbid0XG4gICAgICAgIC8vIG5lZWQgdG8gaGFuZGxlIHN5bnRoZXRpY2FsbHkgY3JlYXRlZCBkZWNvcmF0b3JzLlxuICAgICAgICBjb25zdCBkZWNvcmF0b3JOb2RlID0gZGVjb3JhdG9yLm5vZGUhIGFzIHRzLkRlY29yYXRvcjtcbiAgICAgICAgY29uc3QgaXNOZ0RlY29yYXRvciA9IGlzQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3IsIGlzQ29yZSk7XG5cbiAgICAgICAgLy8gS2VlcCB0cmFjayBpZiB3ZSBjb21lIGFjcm9zcyBhbiBBbmd1bGFyIGNsYXNzIGRlY29yYXRvci4gVGhpcyBpcyB1c2VkXG4gICAgICAgIC8vIGZvciB0byBkZXRlcm1pbmUgd2hldGhlciBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIHNob3VsZCBiZSBjYXB0dXJlZCBvciBub3QuXG4gICAgICAgIGlmIChpc05nRGVjb3JhdG9yKSB7XG4gICAgICAgICAgaGFzQW5ndWxhckRlY29yYXRvciA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNOZ0RlY29yYXRvciAmJiAhc2tpcENsYXNzRGVjb3JhdG9ycykge1xuICAgICAgICAgIGRlY29yYXRvcnNUb0xvd2VyLnB1c2goZXh0cmFjdE1ldGFkYXRhRnJvbVNpbmdsZURlY29yYXRvcihkZWNvcmF0b3JOb2RlLCBkaWFnbm9zdGljcykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlY29yYXRvcnNUb0tlZXAucHVzaChkZWNvcmF0b3JOb2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZGVjb3JhdG9yc1RvTG93ZXIubGVuZ3RoKSB7XG4gICAgICAgIG5ld01lbWJlcnMucHVzaChjcmVhdGVEZWNvcmF0b3JDbGFzc1Byb3BlcnR5KGRlY29yYXRvcnNUb0xvd2VyKSk7XG4gICAgICB9XG4gICAgICBpZiAoY2xhc3NQYXJhbWV0ZXJzKSB7XG4gICAgICAgIGlmIChoYXNBbmd1bGFyRGVjb3JhdG9yIHx8IGNsYXNzUGFyYW1ldGVycy5zb21lKHAgPT4gISFwLmRlY29yYXRvcnMubGVuZ3RoKSkge1xuICAgICAgICAgIC8vIENhcHR1cmUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBpZiB0aGUgY2xhc3MgaGFzIEFuZ3VsYXIgZGVjb3JhdG9yIGFwcGxpZWQsXG4gICAgICAgICAgLy8gb3IgaWYgYW55IG9mIHRoZSBwYXJhbWV0ZXJzIGhhcyBkZWNvcmF0b3JzIGFwcGxpZWQgZGlyZWN0bHkuXG4gICAgICAgICAgbmV3TWVtYmVycy5wdXNoKGNyZWF0ZUN0b3JQYXJhbWV0ZXJzQ2xhc3NQcm9wZXJ0eShcbiAgICAgICAgICAgICAgZGlhZ25vc3RpY3MsIGVudGl0eU5hbWVUb0V4cHJlc3Npb24sIGNsYXNzUGFyYW1ldGVycywgaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChkZWNvcmF0ZWRQcm9wZXJ0aWVzLnNpemUpIHtcbiAgICAgICAgbmV3TWVtYmVycy5wdXNoKGNyZWF0ZVByb3BEZWNvcmF0b3JzQ2xhc3NQcm9wZXJ0eShkaWFnbm9zdGljcywgZGVjb3JhdGVkUHJvcGVydGllcykpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtZW1iZXJzID0gdHMuc2V0VGV4dFJhbmdlKFxuICAgICAgICAgIHRzLmNyZWF0ZU5vZGVBcnJheShuZXdNZW1iZXJzLCBjbGFzc0RlY2wubWVtYmVycy5oYXNUcmFpbGluZ0NvbW1hKSwgY2xhc3NEZWNsLm1lbWJlcnMpO1xuXG4gICAgICByZXR1cm4gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgICBjbGFzc0RlY2wsIGRlY29yYXRvcnNUb0tlZXAubGVuZ3RoID8gZGVjb3JhdG9yc1RvS2VlcCA6IHVuZGVmaW5lZCwgY2xhc3NEZWNsLm1vZGlmaWVycyxcbiAgICAgICAgICBjbGFzc0RlY2wubmFtZSwgY2xhc3NEZWNsLnR5cGVQYXJhbWV0ZXJzLCBjbGFzc0RlY2wuaGVyaXRhZ2VDbGF1c2VzLCBtZW1iZXJzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm1lciB2aXNpdG9yIHRoYXQgbG9va3MgZm9yIEFuZ3VsYXIgZGVjb3JhdG9ycyBhbmQgcmVwbGFjZXMgdGhlbSB3aXRoXG4gICAgICogZG93bmxldmVsZWQgc3RhdGljIHByb3BlcnRpZXMuIEFsc28gY29sbGVjdHMgY29uc3RydWN0b3IgdHlwZSBtZXRhZGF0YSBmb3JcbiAgICAgKiBjbGFzcyBkZWNsYXJhdGlvbiB0aGF0IGFyZSBkZWNvcmF0ZWQgd2l0aCBhbiBBbmd1bGFyIGRlY29yYXRvci5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkZWNvcmF0b3JEb3dubGV2ZWxWaXNpdG9yKG5vZGU6IHRzLk5vZGUpOiB0cy5Ob2RlIHtcbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIHRyYW5zZm9ybUNsYXNzRGVjbGFyYXRpb24obm9kZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgZGVjb3JhdG9yRG93bmxldmVsVmlzaXRvciwgY29udGV4dCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIChzZjogdHMuU291cmNlRmlsZSkgPT4ge1xuICAgICAgLy8gRW5zdXJlIHRoYXQgcmVmZXJlbmNlZCB0eXBlIHN5bWJvbHMgYXJlIG5vdCBlbGlkZWQgYnkgVHlwZVNjcmlwdC4gSW1wb3J0cyBmb3JcbiAgICAgIC8vIHN1Y2ggcGFyYW1ldGVyIHR5cGUgc3ltYm9scyBwcmV2aW91c2x5IGNvdWxkIGJlIHR5cGUtb25seSwgYnV0IG5vdyBtaWdodCBiZSBhbHNvXG4gICAgICAvLyB1c2VkIGluIHRoZSBgY3RvclBhcmFtZXRlcnNgIHN0YXRpYyBwcm9wZXJ0eSBhcyBhIHZhbHVlLiBXZSB3YW50IHRvIG1ha2Ugc3VyZVxuICAgICAgLy8gdGhhdCBUeXBlU2NyaXB0IGRvZXMgbm90IGVsaWRlIGltcG9ydHMgZm9yIHN1Y2ggdHlwZSByZWZlcmVuY2VzLiBSZWFkIG1vcmVcbiAgICAgIC8vIGFib3V0IHRoaXMgaW4gdGhlIGRlc2NyaXB0aW9uIGZvciBgcGF0Y2hBbGlhc1JlZmVyZW5jZVJlc29sdXRpb25gLlxuICAgICAgcGF0Y2hBbGlhc1JlZmVyZW5jZVJlc29sdXRpb25PckRpZShjb250ZXh0LCByZWZlcmVuY2VkUGFyYW1ldGVyVHlwZXMpO1xuICAgICAgLy8gRG93bmxldmVsIGRlY29yYXRvcnMgYW5kIGNvbnN0cnVjdG9yIHBhcmFtZXRlciB0eXBlcy4gV2Ugd2lsbCBrZWVwIHRyYWNrIG9mIGFsbFxuICAgICAgLy8gcmVmZXJlbmNlZCBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgdHlwZXMgc28gdGhhdCB3ZSBjYW4gaW5zdHJ1Y3QgVHlwZVNjcmlwdCB0b1xuICAgICAgLy8gbm90IGVsaWRlIHRoZWlyIGltcG9ydHMgaWYgdGhleSBwcmV2aW91c2x5IHdlcmUgb25seSB0eXBlLW9ubHkuXG4gICAgICByZXR1cm4gdHMudmlzaXRFYWNoQ2hpbGQoc2YsIGRlY29yYXRvckRvd25sZXZlbFZpc2l0b3IsIGNvbnRleHQpO1xuICAgIH07XG4gIH07XG59XG4iXX0=