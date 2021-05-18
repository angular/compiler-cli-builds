/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { ClassMemberKind, isNamedFunctionDeclaration, KnownDeclaration, reflectObjectLiteral } from '../../../src/ngtsc/reflection';
import { getTsHelperFnFromDeclaration, getTsHelperFnFromIdentifier, hasNameIdentifier } from '../utils';
import { Esm2015ReflectionHost, getOuterNodeFromInnerDeclaration, getPropertyValueFromSymbol, isAssignmentStatement } from './esm2015_host';
/**
 * ESM5 packages contain ECMAScript IIFE functions that act like classes. For example:
 *
 * ```
 * var CommonModule = (function () {
 *  function CommonModule() {
 *  }
 *  CommonModule.decorators = [ ... ];
 *  return CommonModule;
 * ```
 *
 * * "Classes" are decorated if they have a static property called `decorators`.
 * * Members are decorated if there is a matching key on a static property
 *   called `propDecorators`.
 * * Constructor parameters decorators are found on an object returned from
 *   a static method called `ctorParameters`.
 *
 */
export class Esm5ReflectionHost extends Esm2015ReflectionHost {
    getBaseClassExpression(clazz) {
        const superBaseClassExpression = super.getBaseClassExpression(clazz);
        if (superBaseClassExpression !== null) {
            return superBaseClassExpression;
        }
        const iife = getIifeFn(this.getClassSymbol(clazz));
        if (iife === null)
            return null;
        if (iife.parameters.length !== 1 || !isSuperIdentifier(iife.parameters[0].name)) {
            return null;
        }
        if (!ts.isCallExpression(iife.parent)) {
            return null;
        }
        return iife.parent.arguments[0];
    }
    /**
     * Trace an identifier to its declaration, if possible.
     *
     * This method attempts to resolve the declaration of the given identifier, tracing back through
     * imports and re-exports until the original declaration statement is found. A `Declaration`
     * object is returned if the original declaration is found, or `null` is returned otherwise.
     *
     * In ES5, the implementation of a class is a function expression that is hidden inside an IIFE.
     * If we are looking for the declaration of the identifier of the inner function expression, we
     * will get hold of the outer "class" variable declaration and return its identifier instead. See
     * `getClassDeclarationFromInnerFunctionDeclaration()` for more info.
     *
     * @param id a TypeScript `ts.Identifier` to trace back to a declaration.
     *
     * @returns metadata about the `Declaration` if the original declaration is found, or `null`
     * otherwise.
     */
    getDeclarationOfIdentifier(id) {
        const declaration = super.getDeclarationOfIdentifier(id);
        if (declaration === null) {
            const nonEmittedNorImportedTsHelperDeclaration = getTsHelperFnFromIdentifier(id);
            if (nonEmittedNorImportedTsHelperDeclaration !== null) {
                // No declaration could be found for this identifier and its name matches a known TS helper
                // function. This can happen if a package is compiled with `noEmitHelpers: true` and
                // `importHelpers: false` (the default). This is, for example, the case with
                // `@nativescript/angular@9.0.0-next-2019-11-12-155500-01`.
                return {
                    kind: 1 /* Inline */,
                    node: id,
                    known: nonEmittedNorImportedTsHelperDeclaration,
                    viaModule: null,
                };
            }
        }
        if (declaration === null || declaration.node === null || declaration.known !== null) {
            return declaration;
        }
        if (!ts.isVariableDeclaration(declaration.node) || declaration.node.initializer !== undefined ||
            // VariableDeclaration => VariableDeclarationList => VariableStatement => IIFE Block
            !ts.isBlock(declaration.node.parent.parent.parent)) {
            return declaration;
        }
        // We might have an alias to another variable declaration.
        // Search the containing iife body for it.
        const block = declaration.node.parent.parent.parent;
        const aliasSymbol = this.checker.getSymbolAtLocation(declaration.node.name);
        for (let i = 0; i < block.statements.length; i++) {
            const statement = block.statements[i];
            // Looking for statement that looks like: `AliasedVariable = OriginalVariable;`
            if (isAssignmentStatement(statement) && ts.isIdentifier(statement.expression.left) &&
                ts.isIdentifier(statement.expression.right) &&
                this.checker.getSymbolAtLocation(statement.expression.left) === aliasSymbol) {
                return this.getDeclarationOfIdentifier(statement.expression.right);
            }
        }
        return declaration;
    }
    /**
     * Parse a function declaration to find the relevant metadata about it.
     *
     * In ESM5 we need to do special work with optional arguments to the function, since they get
     * their own initializer statement that needs to be parsed and then not included in the "body"
     * statements of the function.
     *
     * @param node the function declaration to parse.
     * @returns an object containing the node, statements and parameters of the function.
     */
    getDefinitionOfFunction(node) {
        const definition = super.getDefinitionOfFunction(node);
        if (definition === null) {
            return null;
        }
        // Filter out and capture parameter initializers
        if (definition.body !== null) {
            let lookingForInitializers = true;
            const statements = definition.body.filter(s => {
                lookingForInitializers =
                    lookingForInitializers && captureParamInitializer(s, definition.parameters);
                // If we are no longer looking for parameter initializers then we include this statement
                return !lookingForInitializers;
            });
            definition.body = statements;
        }
        return definition;
    }
    /**
     * Check whether a `Declaration` corresponds with a known declaration, such as a TypeScript helper
     * function, and set its `known` property to the appropriate `KnownDeclaration`.
     *
     * @param decl The `Declaration` to check.
     * @return The passed in `Declaration` (potentially enhanced with a `KnownDeclaration`).
     */
    detectKnownDeclaration(decl) {
        decl = super.detectKnownDeclaration(decl);
        // Also check for TS helpers
        if (decl.known === null && decl.node !== null) {
            decl.known = getTsHelperFnFromDeclaration(decl.node);
        }
        return decl;
    }
    ///////////// Protected Helpers /////////////
    /**
     * In ES5, the implementation of a class is a function expression that is hidden inside an IIFE,
     * whose value is assigned to a variable (which represents the class to the rest of the program).
     * So we might need to dig around to get hold of the "class" declaration.
     *
     * This method extracts a `NgccClassSymbol` if `declaration` is the function declaration inside
     * the IIFE. Otherwise, undefined is returned.
     *
     * @param declaration the declaration whose symbol we are finding.
     * @returns the symbol for the node or `undefined` if it is not a "class" or has no symbol.
     */
    getClassSymbolFromInnerDeclaration(declaration) {
        const classSymbol = super.getClassSymbolFromInnerDeclaration(declaration);
        if (classSymbol !== undefined) {
            return classSymbol;
        }
        if (!isNamedFunctionDeclaration(declaration)) {
            return undefined;
        }
        const outerNode = getOuterNodeFromInnerDeclaration(declaration);
        if (outerNode === null || !hasNameIdentifier(outerNode)) {
            return undefined;
        }
        return this.createClassSymbol(outerNode.name, declaration);
    }
    /**
     * Find the declarations of the constructor parameters of a class identified by its symbol.
     *
     * In ESM5, there is no "class" so the constructor that we want is actually the inner function
     * declaration inside the IIFE, whose return value is assigned to the outer variable declaration
     * (that represents the class to the rest of the program).
     *
     * @param classSymbol the symbol of the class (i.e. the outer variable declaration) whose
     * parameters we want to find.
     * @returns an array of `ts.ParameterDeclaration` objects representing each of the parameters in
     * the class's constructor or `null` if there is no constructor.
     */
    getConstructorParameterDeclarations(classSymbol) {
        const constructor = classSymbol.implementation.valueDeclaration;
        if (!ts.isFunctionDeclaration(constructor))
            return null;
        if (constructor.parameters.length > 0) {
            return Array.from(constructor.parameters);
        }
        if (this.isSynthesizedConstructor(constructor)) {
            return null;
        }
        return [];
    }
    /**
     * Get the parameter type and decorators for the constructor of a class,
     * where the information is stored on a static method of the class.
     *
     * In this case the decorators are stored in the body of a method
     * (`ctorParatemers`) attached to the constructor function.
     *
     * Note that unlike ESM2015 this is a function expression rather than an arrow
     * function:
     *
     * ```
     * SomeDirective.ctorParameters = function() { return [
     *   { type: ViewContainerRef, },
     *   { type: TemplateRef, },
     *   { type: IterableDiffers, },
     *   { type: undefined, decorators: [{ type: Inject, args: [INJECTED_TOKEN,] },] },
     * ]; };
     * ```
     *
     * @param paramDecoratorsProperty the property that holds the parameter info we want to get.
     * @returns an array of objects containing the type and decorators for each parameter.
     */
    getParamInfoFromStaticProperty(paramDecoratorsProperty) {
        const paramDecorators = getPropertyValueFromSymbol(paramDecoratorsProperty);
        // The decorators array may be wrapped in a function. If so unwrap it.
        const returnStatement = getReturnStatement(paramDecorators);
        const expression = returnStatement ? returnStatement.expression : paramDecorators;
        if (expression && ts.isArrayLiteralExpression(expression)) {
            const elements = expression.elements;
            return elements.map(reflectArrayElement).map(paramInfo => {
                const typeExpression = paramInfo && paramInfo.has('type') ? paramInfo.get('type') : null;
                const decoratorInfo = paramInfo && paramInfo.has('decorators') ? paramInfo.get('decorators') : null;
                const decorators = decoratorInfo && this.reflectDecorators(decoratorInfo);
                return { typeExpression, decorators };
            });
        }
        else if (paramDecorators !== undefined) {
            this.logger.warn('Invalid constructor parameter decorator in ' + paramDecorators.getSourceFile().fileName +
                ':\n', paramDecorators.getText());
        }
        return null;
    }
    /**
     * Reflect over a symbol and extract the member information, combining it with the
     * provided decorator information, and whether it is a static member.
     *
     * If a class member uses accessors (e.g getters and/or setters) then it gets downleveled
     * in ES5 to a single `Object.defineProperty()` call. In that case we must parse this
     * call to extract the one or two ClassMember objects that represent the accessors.
     *
     * @param symbol the symbol for the member to reflect over.
     * @param decorators an array of decorators associated with the member.
     * @param isStatic true if this member is static, false if it is an instance property.
     * @returns the reflected member information, or null if the symbol is not a member.
     */
    reflectMembers(symbol, decorators, isStatic) {
        const node = symbol.valueDeclaration || symbol.declarations && symbol.declarations[0];
        const propertyDefinition = node && getPropertyDefinition(node);
        if (propertyDefinition) {
            const members = [];
            if (propertyDefinition.setter) {
                members.push({
                    node,
                    implementation: propertyDefinition.setter,
                    kind: ClassMemberKind.Setter,
                    type: null,
                    name: symbol.name,
                    nameNode: null,
                    value: null,
                    isStatic: isStatic || false,
                    decorators: decorators || [],
                });
                // Prevent attaching the decorators to a potential getter. In ES5, we can't tell where the
                // decorators were originally attached to, however we only want to attach them to a single
                // `ClassMember` as otherwise ngtsc would handle the same decorators twice.
                decorators = undefined;
            }
            if (propertyDefinition.getter) {
                members.push({
                    node,
                    implementation: propertyDefinition.getter,
                    kind: ClassMemberKind.Getter,
                    type: null,
                    name: symbol.name,
                    nameNode: null,
                    value: null,
                    isStatic: isStatic || false,
                    decorators: decorators || [],
                });
            }
            return members;
        }
        const members = super.reflectMembers(symbol, decorators, isStatic);
        members && members.forEach(member => {
            if (member && member.kind === ClassMemberKind.Method && member.isStatic && member.node &&
                ts.isPropertyAccessExpression(member.node) && member.node.parent &&
                ts.isBinaryExpression(member.node.parent) &&
                ts.isFunctionExpression(member.node.parent.right)) {
                // Recompute the implementation for this member:
                // ES5 static methods are variable declarations so the declaration is actually the
                // initializer of the variable assignment
                member.implementation = member.node.parent.right;
            }
        });
        return members;
    }
    /**
     * Find statements related to the given class that may contain calls to a helper.
     *
     * In ESM5 code the helper calls are hidden inside the class's IIFE.
     *
     * @param classSymbol the class whose helper calls we are interested in. We expect this symbol
     * to reference the inner identifier inside the IIFE.
     * @returns an array of statements that may contain helper calls.
     */
    getStatementsForClass(classSymbol) {
        const classDeclarationParent = classSymbol.implementation.valueDeclaration.parent;
        return ts.isBlock(classDeclarationParent) ? Array.from(classDeclarationParent.statements) : [];
    }
    ///////////// Host Private Helpers /////////////
    /**
     * A constructor function may have been "synthesized" by TypeScript during JavaScript emit,
     * in the case no user-defined constructor exists and e.g. property initializers are used.
     * Those initializers need to be emitted into a constructor in JavaScript, so the TypeScript
     * compiler generates a synthetic constructor.
     *
     * We need to identify such constructors as ngcc needs to be able to tell if a class did
     * originally have a constructor in the TypeScript source. For ES5, we can not tell an
     * empty constructor apart from a synthesized constructor, but fortunately that does not
     * matter for the code generated by ngtsc.
     *
     * When a class has a superclass however, a synthesized constructor must not be considered
     * as a user-defined constructor as that prevents a base factory call from being created by
     * ngtsc, resulting in a factory function that does not inject the dependencies of the
     * superclass. Hence, we identify a default synthesized super call in the constructor body,
     * according to the structure that TypeScript's ES2015 to ES5 transformer generates in
     * https://github.com/Microsoft/TypeScript/blob/v3.2.2/src/compiler/transformers/es2015.ts#L1082-L1098
     *
     * Additionally, we handle synthetic delegate constructors that are emitted when TypeScript
     * downlevel's ES2015 synthetically generated to ES5. These vary slightly from the default
     * structure mentioned above because the ES2015 output uses a spread operator, for delegating
     * to the parent constructor, that is preserved through a TypeScript helper in ES5. e.g.
     *
     * ```
     * return _super.apply(this, tslib.__spread(arguments)) || this;
     * ```
     *
     * or, since TypeScript 4.2 it would be
     *
     * ```
     * return _super.apply(this, tslib.__spreadArray([], tslib.__read(arguments))) || this;
     * ```
     *
     * Such constructs can be still considered as synthetic delegate constructors as they are
     * the product of a common TypeScript to ES5 synthetic constructor, just being downleveled
     * to ES5 using `tsc`. See: https://github.com/angular/angular/issues/38453.
     *
     *
     * @param constructor a constructor function to test
     * @returns true if the constructor appears to have been synthesized
     */
    isSynthesizedConstructor(constructor) {
        if (!constructor.body)
            return false;
        const firstStatement = constructor.body.statements[0];
        if (!firstStatement)
            return false;
        return this.isSynthesizedSuperThisAssignment(firstStatement) ||
            this.isSynthesizedSuperReturnStatement(firstStatement);
    }
    /**
     * Identifies synthesized super calls which pass-through function arguments directly and are
     * being assigned to a common `_this` variable. The following patterns we intend to match:
     *
     * 1. Delegate call emitted by TypeScript when it emits ES5 directly.
     *   ```
     *   var _this = _super !== null && _super.apply(this, arguments) || this;
     *   ```
     *
     * 2. Delegate call emitted by TypeScript when it downlevel's ES2015 to ES5.
     *   ```
     *   var _this = _super.apply(this, tslib.__spread(arguments)) || this;
     *   ```
     *   or using the syntax emitted since TypeScript 4.2:
     *   ```
     *   return _super.apply(this, tslib.__spreadArray([], tslib.__read(arguments))) || this;
     *   ```
     *
     * @param statement a statement that may be a synthesized super call
     * @returns true if the statement looks like a synthesized super call
     */
    isSynthesizedSuperThisAssignment(statement) {
        if (!ts.isVariableStatement(statement))
            return false;
        const variableDeclarations = statement.declarationList.declarations;
        if (variableDeclarations.length !== 1)
            return false;
        const variableDeclaration = variableDeclarations[0];
        if (!ts.isIdentifier(variableDeclaration.name) ||
            !variableDeclaration.name.text.startsWith('_this'))
            return false;
        const initializer = variableDeclaration.initializer;
        if (!initializer)
            return false;
        return this.isSynthesizedDefaultSuperCall(initializer);
    }
    /**
     * Identifies synthesized super calls which pass-through function arguments directly and
     * are being returned. The following patterns correspond to synthetic super return calls:
     *
     * 1. Delegate call emitted by TypeScript when it emits ES5 directly.
     *   ```
     *   return _super !== null && _super.apply(this, arguments) || this;
     *   ```
     *
     * 2. Delegate call emitted by TypeScript when it downlevel's ES2015 to ES5.
     *   ```
     *   return _super.apply(this, tslib.__spread(arguments)) || this;
     *   ```
     *   or using the syntax emitted since TypeScript 4.2:
     *   ```
     *   return _super.apply(this, tslib.__spreadArray([], tslib.__read(arguments))) || this;
     *   ```
     *
     * @param statement a statement that may be a synthesized super call
     * @returns true if the statement looks like a synthesized super call
     */
    isSynthesizedSuperReturnStatement(statement) {
        if (!ts.isReturnStatement(statement))
            return false;
        const expression = statement.expression;
        if (!expression)
            return false;
        return this.isSynthesizedDefaultSuperCall(expression);
    }
    /**
     * Identifies synthesized super calls which pass-through function arguments directly. The
     * synthetic delegate super call match the following patterns we intend to match:
     *
     * 1. Delegate call emitted by TypeScript when it emits ES5 directly.
     *   ```
     *   _super !== null && _super.apply(this, arguments) || this;
     *   ```
     *
     * 2. Delegate call emitted by TypeScript when it downlevel's ES2015 to ES5.
     *   ```
     *   _super.apply(this, tslib.__spread(arguments)) || this;
     *   ```
     *   or using the syntax emitted since TypeScript 4.2:
     *   ```
     *   return _super.apply(this, tslib.__spreadArray([], tslib.__read(arguments))) || this;
     *   ```
     *
     * @param expression an expression that may represent a default super call
     * @returns true if the expression corresponds with the above form
     */
    isSynthesizedDefaultSuperCall(expression) {
        if (!isBinaryExpr(expression, ts.SyntaxKind.BarBarToken))
            return false;
        if (expression.right.kind !== ts.SyntaxKind.ThisKeyword)
            return false;
        const left = expression.left;
        if (isBinaryExpr(left, ts.SyntaxKind.AmpersandAmpersandToken)) {
            return isSuperNotNull(left.left) && this.isSuperApplyCall(left.right);
        }
        else {
            return this.isSuperApplyCall(left);
        }
    }
    /**
     * Tests whether the expression corresponds to a `super` call passing through
     * function arguments without any modification. e.g.
     *
     * ```
     * _super !== null && _super.apply(this, arguments) || this;
     * ```
     *
     * This structure is generated by TypeScript when transforming ES2015 to ES5, see
     * https://github.com/Microsoft/TypeScript/blob/v3.2.2/src/compiler/transformers/es2015.ts#L1148-L1163
     *
     * Additionally, we also handle cases where `arguments` are wrapped by a TypeScript spread
     * helper.
     * This can happen if ES2015 class output contain auto-generated constructors due to class
     * members. The ES2015 output will be using `super(...arguments)` to delegate to the superclass,
     * but once downleveled to ES5, the spread operator will be persisted through a TypeScript spread
     * helper. For example:
     *
     * ```
     * _super.apply(this, __spread(arguments)) || this;
     * ```
     *
     * or, since TypeScript 4.2 it would be
     *
     * ```
     * _super.apply(this, tslib.__spreadArray([], tslib.__read(arguments))) || this;
     * ```
     *
     * More details can be found in: https://github.com/angular/angular/issues/38453.
     *
     * @param expression an expression that may represent a default super call
     * @returns true if the expression corresponds with the above form
     */
    isSuperApplyCall(expression) {
        if (!ts.isCallExpression(expression) || expression.arguments.length !== 2)
            return false;
        const targetFn = expression.expression;
        if (!ts.isPropertyAccessExpression(targetFn))
            return false;
        if (!isSuperIdentifier(targetFn.expression))
            return false;
        if (targetFn.name.text !== 'apply')
            return false;
        const thisArgument = expression.arguments[0];
        if (thisArgument.kind !== ts.SyntaxKind.ThisKeyword)
            return false;
        const argumentsExpr = expression.arguments[1];
        // If the super is directly invoked with `arguments`, return `true`. This represents the
        // common TypeScript output where the delegate constructor super call matches the following
        // pattern: `super.apply(this, arguments)`.
        if (isArgumentsIdentifier(argumentsExpr)) {
            return true;
        }
        // The other scenario we intend to detect: The `arguments` variable might be wrapped with the
        // TypeScript spread helper (either through tslib or inlined). This can happen if an explicit
        // delegate constructor uses `super(...arguments)` in ES2015 and is downleveled to ES5 using
        // `--downlevelIteration`.
        return this.isSpreadArgumentsExpression(argumentsExpr);
    }
    /**
     * Determines if the provided expression is one of the following call expressions:
     *
     * 1. `__spread(arguments)`
     * 2. `__spreadArray([], __read(arguments))`
     *
     * The tslib helpers may have been emitted inline as in the above example, or they may be read
     * from a namespace import.
     */
    isSpreadArgumentsExpression(expression) {
        const call = this.extractKnownHelperCall(expression);
        if (call === null) {
            return false;
        }
        if (call.helper === KnownDeclaration.TsHelperSpread) {
            // `__spread(arguments)`
            return call.args.length === 1 && isArgumentsIdentifier(call.args[0]);
        }
        else if (call.helper === KnownDeclaration.TsHelperSpreadArray) {
            // `__spreadArray([], __read(arguments))`
            if (call.args.length !== 2) {
                return false;
            }
            const firstArg = call.args[0];
            if (!ts.isArrayLiteralExpression(firstArg) || firstArg.elements.length !== 0) {
                return false;
            }
            const secondArg = this.extractKnownHelperCall(call.args[1]);
            if (secondArg === null || secondArg.helper !== KnownDeclaration.TsHelperRead) {
                return false;
            }
            return secondArg.args.length === 1 && isArgumentsIdentifier(secondArg.args[0]);
        }
        else {
            return false;
        }
    }
    /**
     * Inspects the provided expression and determines if it corresponds with a known helper function
     * as receiver expression.
     */
    extractKnownHelperCall(expression) {
        if (!ts.isCallExpression(expression)) {
            return null;
        }
        const receiverExpr = expression.expression;
        // The helper could be globally available, or accessed through a namespaced import. Hence we
        // support a property access here as long as it resolves to the actual known TypeScript helper.
        let receiver = null;
        if (ts.isIdentifier(receiverExpr)) {
            receiver = this.getDeclarationOfIdentifier(receiverExpr);
        }
        else if (ts.isPropertyAccessExpression(receiverExpr) && ts.isIdentifier(receiverExpr.name)) {
            receiver = this.getDeclarationOfIdentifier(receiverExpr.name);
        }
        if (receiver === null || receiver.known === null) {
            return null;
        }
        return {
            helper: receiver.known,
            args: expression.arguments,
        };
    }
}
/**
 * In ES5, getters and setters have been downleveled into call expressions of
 * `Object.defineProperty`, such as
 *
 * ```
 * Object.defineProperty(Clazz.prototype, "property", {
 *   get: function () {
 *       return 'value';
 *   },
 *   set: function (value) {
 *       this.value = value;
 *   },
 *   enumerable: true,
 *   configurable: true
 * });
 * ```
 *
 * This function inspects the given node to determine if it corresponds with such a call, and if so
 * extracts the `set` and `get` function expressions from the descriptor object, if they exist.
 *
 * @param node The node to obtain the property definition from.
 * @returns The property definition if the node corresponds with accessor, null otherwise.
 */
function getPropertyDefinition(node) {
    if (!ts.isCallExpression(node))
        return null;
    const fn = node.expression;
    if (!ts.isPropertyAccessExpression(fn) || !ts.isIdentifier(fn.expression) ||
        fn.expression.text !== 'Object' || fn.name.text !== 'defineProperty')
        return null;
    const descriptor = node.arguments[2];
    if (!descriptor || !ts.isObjectLiteralExpression(descriptor))
        return null;
    return {
        setter: readPropertyFunctionExpression(descriptor, 'set'),
        getter: readPropertyFunctionExpression(descriptor, 'get'),
    };
}
function readPropertyFunctionExpression(object, name) {
    const property = object.properties.find((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === name);
    return property && ts.isFunctionExpression(property.initializer) && property.initializer || null;
}
function getReturnStatement(declaration) {
    return declaration && ts.isFunctionExpression(declaration) ?
        declaration.body.statements.find(ts.isReturnStatement) :
        undefined;
}
function reflectArrayElement(element) {
    return ts.isObjectLiteralExpression(element) ? reflectObjectLiteral(element) : null;
}
function isArgumentsIdentifier(expression) {
    return ts.isIdentifier(expression) && expression.text === 'arguments';
}
function isSuperNotNull(expression) {
    return isBinaryExpr(expression, ts.SyntaxKind.ExclamationEqualsEqualsToken) &&
        isSuperIdentifier(expression.left);
}
function isBinaryExpr(expression, operator) {
    return ts.isBinaryExpression(expression) && expression.operatorToken.kind === operator;
}
function isSuperIdentifier(node) {
    // Verify that the identifier is prefixed with `_super`. We don't test for equivalence
    // as TypeScript may have suffixed the name, e.g. `_super_1` to avoid name conflicts.
    // Requiring only a prefix should be sufficiently accurate.
    return ts.isIdentifier(node) && node.text.startsWith('_super');
}
/**
 * Parse the statement to extract the ESM5 parameter initializer if there is one.
 * If one is found, add it to the appropriate parameter in the `parameters` collection.
 *
 * The form we are looking for is:
 *
 * ```
 * if (arg === void 0) { arg = initializer; }
 * ```
 *
 * @param statement a statement that may be initializing an optional parameter
 * @param parameters the collection of parameters that were found in the function definition
 * @returns true if the statement was a parameter initializer
 */
function captureParamInitializer(statement, parameters) {
    if (ts.isIfStatement(statement) && isUndefinedComparison(statement.expression) &&
        ts.isBlock(statement.thenStatement) && statement.thenStatement.statements.length === 1) {
        const ifStatementComparison = statement.expression; // (arg === void 0)
        const thenStatement = statement.thenStatement.statements[0]; // arg = initializer;
        if (isAssignmentStatement(thenStatement)) {
            const comparisonName = ifStatementComparison.left.text;
            const assignmentName = thenStatement.expression.left.text;
            if (comparisonName === assignmentName) {
                const parameter = parameters.find(p => p.name === comparisonName);
                if (parameter) {
                    parameter.initializer = thenStatement.expression.right;
                    return true;
                }
            }
        }
    }
    return false;
}
function isUndefinedComparison(expression) {
    return ts.isBinaryExpression(expression) &&
        expression.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
        ts.isVoidExpression(expression.right) && ts.isIdentifier(expression.left);
}
/**
 * Parse the declaration of the given `classSymbol` to find the IIFE wrapper function.
 *
 * This function may accept a `_super` argument if there is a base class.
 *
 * ```
 * var TestClass = (function (_super) {
 *   __extends(TestClass, _super);
 *   function TestClass() {}
 *   return TestClass;
 * }(BaseClass));
 * ```
 *
 * @param classSymbol the class whose iife wrapper function we want to get.
 * @returns the IIFE function or null if it could not be parsed.
 */
function getIifeFn(classSymbol) {
    if (classSymbol === undefined) {
        return null;
    }
    const innerDeclaration = classSymbol.implementation.valueDeclaration;
    const iifeBody = innerDeclaration.parent;
    if (!ts.isBlock(iifeBody)) {
        return null;
    }
    const iifeWrapper = iifeBody.parent;
    return iifeWrapper && ts.isFunctionExpression(iifeWrapper) ? iifeWrapper : null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRWpDLE9BQU8sRUFBZ0MsZUFBZSxFQUErRCwwQkFBMEIsRUFBRSxnQkFBZ0IsRUFBYSxvQkFBb0IsRUFBQyxNQUFNLCtCQUErQixDQUFDO0FBQ3pPLE9BQU8sRUFBQyw0QkFBNEIsRUFBRSwyQkFBMkIsRUFBRSxpQkFBaUIsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUV0RyxPQUFPLEVBQUMscUJBQXFCLEVBQUUsZ0NBQWdDLEVBQUUsMEJBQTBCLEVBQUUscUJBQXFCLEVBQVksTUFBTSxnQkFBZ0IsQ0FBQztBQUlySjs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FpQkc7QUFDSCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEscUJBQXFCO0lBQzNELHNCQUFzQixDQUFDLEtBQXVCO1FBQzVDLE1BQU0sd0JBQXdCLEdBQUcsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JFLElBQUksd0JBQXdCLEtBQUssSUFBSSxFQUFFO1lBQ3JDLE9BQU8sd0JBQXdCLENBQUM7U0FDakM7UUFFRCxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ25ELElBQUksSUFBSSxLQUFLLElBQUk7WUFBRSxPQUFPLElBQUksQ0FBQztRQUUvQixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDL0UsT0FBTyxJQUFJLENB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V0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ2xGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgRGVjbGFyYXRpb24sIERlY2xhcmF0aW9uS2luZCwgRGVjb3JhdG9yLCBGdW5jdGlvbkRlZmluaXRpb24sIGlzTmFtZWRGdW5jdGlvbkRlY2xhcmF0aW9uLCBLbm93bkRlY2xhcmF0aW9uLCBQYXJhbWV0ZXIsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge2dldFRzSGVscGVyRm5Gcm9tRGVjbGFyYXRpb24sIGdldFRzSGVscGVyRm5Gcm9tSWRlbnRpZmllciwgaGFzTmFtZUlkZW50aWZpZXJ9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtFc20yMDE1UmVmbGVjdGlvbkhvc3QsIGdldE91dGVyTm9kZUZyb21Jbm5lckRlY2xhcmF0aW9uLCBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbCwgaXNBc3NpZ25tZW50U3RhdGVtZW50LCBQYXJhbUluZm99IGZyb20gJy4vZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7TmdjY0NsYXNzU3ltYm9sfSBmcm9tICcuL25nY2NfaG9zdCc7XG5cblxuLyoqXG4gKiBFU001IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCBJSUZFIGZ1bmN0aW9ucyB0aGF0IGFjdCBsaWtlIGNsYXNzZXMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogdmFyIENvbW1vbk1vZHVsZSA9IChmdW5jdGlvbiAoKSB7XG4gKiAgZnVuY3Rpb24gQ29tbW9uTW9kdWxlKCkge1xuICogIH1cbiAqICBDb21tb25Nb2R1bGUuZGVjb3JhdG9ycyA9IFsgLi4uIF07XG4gKiAgcmV0dXJuIENvbW1vbk1vZHVsZTtcbiAqIGBgYFxuICpcbiAqICogXCJDbGFzc2VzXCIgYXJlIGRlY29yYXRlZCBpZiB0aGV5IGhhdmUgYSBzdGF0aWMgcHJvcGVydHkgY2FsbGVkIGBkZWNvcmF0b3JzYC5cbiAqICogTWVtYmVycyBhcmUgZGVjb3JhdGVkIGlmIHRoZXJlIGlzIGEgbWF0Y2hpbmcga2V5IG9uIGEgc3RhdGljIHByb3BlcnR5XG4gKiAgIGNhbGxlZCBgcHJvcERlY29yYXRvcnNgLlxuICogKiBDb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIGRlY29yYXRvcnMgYXJlIGZvdW5kIG9uIGFuIG9iamVjdCByZXR1cm5lZCBmcm9tXG4gKiAgIGEgc3RhdGljIG1ldGhvZCBjYWxsZWQgYGN0b3JQYXJhbWV0ZXJzYC5cbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBFc201UmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBFc20yMDE1UmVmbGVjdGlvbkhvc3Qge1xuICBnZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBzdXBlckJhc2VDbGFzc0V4cHJlc3Npb24gPSBzdXBlci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6KTtcbiAgICBpZiAoc3VwZXJCYXNlQ2xhc3NFeHByZXNzaW9uICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gc3VwZXJCYXNlQ2xhc3NFeHByZXNzaW9uO1xuICAgIH1cblxuICAgIGNvbnN0IGlpZmUgPSBnZXRJaWZlRm4odGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eikpO1xuICAgIGlmIChpaWZlID09PSBudWxsKSByZXR1cm4gbnVsbDtcblxuICAgIGlmIChpaWZlLnBhcmFtZXRlcnMubGVuZ3RoICE9PSAxIHx8ICFpc1N1cGVySWRlbnRpZmllcihpaWZlLnBhcmFtZXRlcnNbMF0ubmFtZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihpaWZlLnBhcmVudCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBpaWZlLnBhcmVudC5hcmd1bWVudHNbMF07XG4gIH1cblxuICAvKipcbiAgICogVHJhY2UgYW4gaWRlbnRpZmllciB0byBpdHMgZGVjbGFyYXRpb24sIGlmIHBvc3NpYmxlLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBhdHRlbXB0cyB0byByZXNvbHZlIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZ2l2ZW4gaWRlbnRpZmllciwgdHJhY2luZyBiYWNrIHRocm91Z2hcbiAgICogaW1wb3J0cyBhbmQgcmUtZXhwb3J0cyB1bnRpbCB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gc3RhdGVtZW50IGlzIGZvdW5kLiBBIGBEZWNsYXJhdGlvbmBcbiAgICogb2JqZWN0IGlzIHJldHVybmVkIGlmIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBpcyBmb3VuZCwgb3IgYG51bGxgIGlzIHJldHVybmVkIG90aGVyd2lzZS5cbiAgICpcbiAgICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUuXG4gICAqIElmIHdlIGFyZSBsb29raW5nIGZvciB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGlkZW50aWZpZXIgb2YgdGhlIGlubmVyIGZ1bmN0aW9uIGV4cHJlc3Npb24sIHdlXG4gICAqIHdpbGwgZ2V0IGhvbGQgb2YgdGhlIG91dGVyIFwiY2xhc3NcIiB2YXJpYWJsZSBkZWNsYXJhdGlvbiBhbmQgcmV0dXJuIGl0cyBpZGVudGlmaWVyIGluc3RlYWQuIFNlZVxuICAgKiBgZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24oKWAgZm9yIG1vcmUgaW5mby5cbiAgICpcbiAgICogQHBhcmFtIGlkIGEgVHlwZVNjcmlwdCBgdHMuSWRlbnRpZmllcmAgdG8gdHJhY2UgYmFjayB0byBhIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBtZXRhZGF0YSBhYm91dCB0aGUgYERlY2xhcmF0aW9uYCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYFxuICAgKiBvdGhlcndpc2UuXG4gICAqL1xuICBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gc3VwZXIuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQpO1xuXG4gICAgaWYgKGRlY2xhcmF0aW9uID09PSBudWxsKSB7XG4gICAgICBjb25zdCBub25FbWl0dGVkTm9ySW1wb3J0ZWRUc0hlbHBlckRlY2xhcmF0aW9uID0gZ2V0VHNIZWxwZXJGbkZyb21JZGVudGlmaWVyKGlkKTtcbiAgICAgIGlmIChub25FbWl0dGVkTm9ySW1wb3J0ZWRUc0hlbHBlckRlY2xhcmF0aW9uICE9PSBudWxsKSB7XG4gICAgICAgIC8vIE5vIGRlY2xhcmF0aW9uIGNvdWxkIGJlIGZvdW5kIGZvciB0aGlzIGlkZW50aWZpZXIgYW5kIGl0cyBuYW1lIG1hdGNoZXMgYSBrbm93biBUUyBoZWxwZXJcbiAgICAgICAgLy8gZnVuY3Rpb24uIFRoaXMgY2FuIGhhcHBlbiBpZiBhIHBhY2thZ2UgaXMgY29tcGlsZWQgd2l0aCBgbm9FbWl0SGVscGVyczogdHJ1ZWAgYW5kXG4gICAgICAgIC8vIGBpbXBvcnRIZWxwZXJzOiBmYWxzZWAgKHRoZSBkZWZhdWx0KS4gVGhpcyBpcywgZm9yIGV4YW1wbGUsIHRoZSBjYXNlIHdpdGhcbiAgICAgICAgLy8gYEBuYXRpdmVzY3JpcHQvYW5ndWxhckA5LjAuMC1uZXh0LTIwMTktMTEtMTItMTU1NTAwLTAxYC5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBraW5kOiBEZWNsYXJhdGlvbktpbmQuSW5saW5lLFxuICAgICAgICAgIG5vZGU6IGlkLFxuICAgICAgICAgIGtub3duOiBub25FbWl0dGVkTm9ySW1wb3J0ZWRUc0hlbHBlckRlY2xhcmF0aW9uLFxuICAgICAgICAgIHZpYU1vZHVsZTogbnVsbCxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZGVjbGFyYXRpb24gPT09IG51bGwgfHwgZGVjbGFyYXRpb24ubm9kZSA9PT0gbnVsbCB8fCBkZWNsYXJhdGlvbi5rbm93biAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGRlY2xhcmF0aW9uO1xuICAgIH1cblxuICAgIGlmICghdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uLm5vZGUpIHx8IGRlY2xhcmF0aW9uLm5vZGUuaW5pdGlhbGl6ZXIgIT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAvLyBWYXJpYWJsZURlY2xhcmF0aW9uID0+IFZhcmlhYmxlRGVjbGFyYXRpb25MaXN0ID0+IFZhcmlhYmxlU3RhdGVtZW50ID0+IElJRkUgQmxvY2tcbiAgICAgICAgIXRzLmlzQmxvY2soZGVjbGFyYXRpb24ubm9kZS5wYXJlbnQucGFyZW50LnBhcmVudCkpIHtcbiAgICAgIHJldHVybiBkZWNsYXJhdGlvbjtcbiAgICB9XG5cbiAgICAvLyBXZSBtaWdodCBoYXZlIGFuIGFsaWFzIHRvIGFub3RoZXIgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAgLy8gU2VhcmNoIHRoZSBjb250YWluaW5nIGlpZmUgYm9keSBmb3IgaXQuXG4gICAgY29uc3QgYmxvY2sgPSBkZWNsYXJhdGlvbi5ub2RlLnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgIGNvbnN0IGFsaWFzU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZGVjbGFyYXRpb24ubm9kZS5uYW1lKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJsb2NrLnN0YXRlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHN0YXRlbWVudCA9IGJsb2NrLnN0YXRlbWVudHNbaV07XG4gICAgICAvLyBMb29raW5nIGZvciBzdGF0ZW1lbnQgdGhhdCBsb29rcyBsaWtlOiBgQWxpYXNlZFZhcmlhYmxlID0gT3JpZ2luYWxWYXJpYWJsZTtgXG4gICAgICBpZiAoaXNBc3NpZ25tZW50U3RhdGVtZW50KHN0YXRlbWVudCkgJiYgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQpICYmXG4gICAgICAgICAgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLnJpZ2h0KSAmJlxuICAgICAgICAgIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQpID09PSBhbGlhc1N5bWJvbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIGEgZnVuY3Rpb24gZGVjbGFyYXRpb24gdG8gZmluZCB0aGUgcmVsZXZhbnQgbWV0YWRhdGEgYWJvdXQgaXQuXG4gICAqXG4gICAqIEluIEVTTTUgd2UgbmVlZCB0byBkbyBzcGVjaWFsIHdvcmsgd2l0aCBvcHRpb25hbCBhcmd1bWVudHMgdG8gdGhlIGZ1bmN0aW9uLCBzaW5jZSB0aGV5IGdldFxuICAgKiB0aGVpciBvd24gaW5pdGlhbGl6ZXIgc3RhdGVtZW50IHRoYXQgbmVlZHMgdG8gYmUgcGFyc2VkIGFuZCB0aGVuIG5vdCBpbmNsdWRlZCBpbiB0aGUgXCJib2R5XCJcbiAgICogc3RhdGVtZW50cyBvZiB0aGUgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIHRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiB0byBwYXJzZS5cbiAgICogQHJldHVybnMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5vZGUsIHN0YXRlbWVudHMgYW5kIHBhcmFtZXRlcnMgb2YgdGhlIGZ1bmN0aW9uLlxuICAgKi9cbiAgZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24obm9kZTogdHMuTm9kZSk6IEZ1bmN0aW9uRGVmaW5pdGlvbnxudWxsIHtcbiAgICBjb25zdCBkZWZpbml0aW9uID0gc3VwZXIuZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24obm9kZSk7XG4gICAgaWYgKGRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEZpbHRlciBvdXQgYW5kIGNhcHR1cmUgcGFyYW1ldGVyIGluaXRpYWxpemVyc1xuICAgIGlmIChkZWZpbml0aW9uLmJvZHkgIT09IG51bGwpIHtcbiAgICAgIGxldCBsb29raW5nRm9ySW5pdGlhbGl6ZXJzID0gdHJ1ZTtcbiAgICAgIGNvbnN0IHN0YXRlbWVudHMgPSBkZWZpbml0aW9uLmJvZHkuZmlsdGVyKHMgPT4ge1xuICAgICAgICBsb29raW5nRm9ySW5pdGlhbGl6ZXJzID1cbiAgICAgICAgICAgIGxvb2tpbmdGb3JJbml0aWFsaXplcnMgJiYgY2FwdHVyZVBhcmFtSW5pdGlhbGl6ZXIocywgZGVmaW5pdGlvbi5wYXJhbWV0ZXJzKTtcbiAgICAgICAgLy8gSWYgd2UgYXJlIG5vIGxvbmdlciBsb29raW5nIGZvciBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXJzIHRoZW4gd2UgaW5jbHVkZSB0aGlzIHN0YXRlbWVudFxuICAgICAgICByZXR1cm4gIWxvb2tpbmdGb3JJbml0aWFsaXplcnM7XG4gICAgICB9KTtcbiAgICAgIGRlZmluaXRpb24uYm9keSA9IHN0YXRlbWVudHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmluaXRpb247XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhIGBEZWNsYXJhdGlvbmAgY29ycmVzcG9uZHMgd2l0aCBhIGtub3duIGRlY2xhcmF0aW9uLCBzdWNoIGFzIGEgVHlwZVNjcmlwdCBoZWxwZXJcbiAgICogZnVuY3Rpb24sIGFuZCBzZXQgaXRzIGBrbm93bmAgcHJvcGVydHkgdG8gdGhlIGFwcHJvcHJpYXRlIGBLbm93bkRlY2xhcmF0aW9uYC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2wgVGhlIGBEZWNsYXJhdGlvbmAgdG8gY2hlY2suXG4gICAqIEByZXR1cm4gVGhlIHBhc3NlZCBpbiBgRGVjbGFyYXRpb25gIChwb3RlbnRpYWxseSBlbmhhbmNlZCB3aXRoIGEgYEtub3duRGVjbGFyYXRpb25gKS5cbiAgICovXG4gIGRldGVjdEtub3duRGVjbGFyYXRpb248VCBleHRlbmRzIERlY2xhcmF0aW9uPihkZWNsOiBUKTogVCB7XG4gICAgZGVjbCA9IHN1cGVyLmRldGVjdEtub3duRGVjbGFyYXRpb24oZGVjbCk7XG5cbiAgICAvLyBBbHNvIGNoZWNrIGZvciBUUyBoZWxwZXJzXG4gICAgaWYgKGRlY2wua25vd24gPT09IG51bGwgJiYgZGVjbC5ub2RlICE9PSBudWxsKSB7XG4gICAgICBkZWNsLmtub3duID0gZ2V0VHNIZWxwZXJGbkZyb21EZWNsYXJhdGlvbihkZWNsLm5vZGUpO1xuICAgIH1cblxuICAgIHJldHVybiBkZWNsO1xuICB9XG5cblxuICAvLy8vLy8vLy8vLy8vIFByb3RlY3RlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuICAvKipcbiAgICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUsXG4gICAqIHdob3NlIHZhbHVlIGlzIGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgKHdoaWNoIHJlcHJlc2VudHMgdGhlIGNsYXNzIHRvIHRoZSByZXN0IG9mIHRoZSBwcm9ncmFtKS5cbiAgICogU28gd2UgbWlnaHQgbmVlZCB0byBkaWcgYXJvdW5kIHRvIGdldCBob2xkIG9mIHRoZSBcImNsYXNzXCIgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGV4dHJhY3RzIGEgYE5nY2NDbGFzc1N5bWJvbGAgaWYgYGRlY2xhcmF0aW9uYCBpcyB0aGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gaW5zaWRlXG4gICAqIHRoZSBJSUZFLiBPdGhlcndpc2UsIHVuZGVmaW5lZCBpcyByZXR1cm5lZC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIHRoZSBkZWNsYXJhdGlvbiB3aG9zZSBzeW1ib2wgd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIG9yIGB1bmRlZmluZWRgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIiBvciBoYXMgbm8gc3ltYm9sLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLk5vZGUpOiBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHN1cGVyLmdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgIGlmIChjbGFzc1N5bWJvbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gY2xhc3NTeW1ib2w7XG4gICAgfVxuXG4gICAgaWYgKCFpc05hbWVkRnVuY3Rpb25EZWNsYXJhdGlvbihkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0ZXJOb2RlID0gZ2V0T3V0ZXJOb2RlRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgIGlmIChvdXRlck5vZGUgPT09IG51bGwgfHwgIWhhc05hbWVJZGVudGlmaWVyKG91dGVyTm9kZSkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2xhc3NTeW1ib2wob3V0ZXJOb2RlLm5hbWUsIGRlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbnMgb2YgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBjbGFzcyBpZGVudGlmaWVkIGJ5IGl0cyBzeW1ib2wuXG4gICAqXG4gICAqIEluIEVTTTUsIHRoZXJlIGlzIG5vIFwiY2xhc3NcIiBzbyB0aGUgY29uc3RydWN0b3IgdGhhdCB3ZSB3YW50IGlzIGFjdHVhbGx5IHRoZSBpbm5lciBmdW5jdGlvblxuICAgKiBkZWNsYXJhdGlvbiBpbnNpZGUgdGhlIElJRkUsIHdob3NlIHJldHVybiB2YWx1ZSBpcyBhc3NpZ25lZCB0byB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb25cbiAgICogKHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3MgdG8gdGhlIHJlc3Qgb2YgdGhlIHByb2dyYW0pLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIHN5bWJvbCBvZiB0aGUgY2xhc3MgKGkuZS4gdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uKSB3aG9zZVxuICAgKiBwYXJhbWV0ZXJzIHdlIHdhbnQgdG8gZmluZC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uYCBvYmplY3RzIHJlcHJlc2VudGluZyBlYWNoIG9mIHRoZSBwYXJhbWV0ZXJzIGluXG4gICAqIHRoZSBjbGFzcydzIGNvbnN0cnVjdG9yIG9yIGBudWxsYCBpZiB0aGVyZSBpcyBubyBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTpcbiAgICAgIHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW118bnVsbCB7XG4gICAgY29uc3QgY29uc3RydWN0b3IgPSBjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGlmICghdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKGNvbnN0cnVjdG9yKSkgcmV0dXJuIG51bGw7XG5cbiAgICBpZiAoY29uc3RydWN0b3IucGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbShjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc1N5bnRoZXNpemVkQ29uc3RydWN0b3IoY29uc3RydWN0b3IpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MsXG4gICAqIHdoZXJlIHRoZSBpbmZvcm1hdGlvbiBpcyBzdG9yZWQgb24gYSBzdGF0aWMgbWV0aG9kIG9mIHRoZSBjbGFzcy5cbiAgICpcbiAgICogSW4gdGhpcyBjYXNlIHRoZSBkZWNvcmF0b3JzIGFyZSBzdG9yZWQgaW4gdGhlIGJvZHkgb2YgYSBtZXRob2RcbiAgICogKGBjdG9yUGFyYXRlbWVyc2ApIGF0dGFjaGVkIHRvIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAgICpcbiAgICogTm90ZSB0aGF0IHVubGlrZSBFU00yMDE1IHRoaXMgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHJhdGhlciB0aGFuIGFuIGFycm93XG4gICAqIGZ1bmN0aW9uOlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gW1xuICAgKiAgIHsgdHlwZTogVmlld0NvbnRhaW5lclJlZiwgfSxcbiAgICogICB7IHR5cGU6IFRlbXBsYXRlUmVmLCB9LFxuICAgKiAgIHsgdHlwZTogSXRlcmFibGVEaWZmZXJzLCB9LFxuICAgKiAgIHsgdHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTixdIH0sXSB9LFxuICAgKiBdOyB9O1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5IHRoZSBwcm9wZXJ0eSB0aGF0IGhvbGRzIHRoZSBwYXJhbWV0ZXIgaW5mbyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygb2JqZWN0cyBjb250YWluaW5nIHRoZSB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciBlYWNoIHBhcmFtZXRlci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRQYXJhbUluZm9Gcm9tU3RhdGljUHJvcGVydHkocGFyYW1EZWNvcmF0b3JzUHJvcGVydHk6IHRzLlN5bWJvbCk6IFBhcmFtSW5mb1tdfG51bGwge1xuICAgIGNvbnN0IHBhcmFtRGVjb3JhdG9ycyA9IGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICAvLyBUaGUgZGVjb3JhdG9ycyBhcnJheSBtYXkgYmUgd3JhcHBlZCBpbiBhIGZ1bmN0aW9uLiBJZiBzbyB1bndyYXAgaXQuXG4gICAgY29uc3QgcmV0dXJuU3RhdGVtZW50ID0gZ2V0UmV0dXJuU3RhdGVtZW50KHBhcmFtRGVjb3JhdG9ycyk7XG4gICAgY29uc3QgZXhwcmVzc2lvbiA9IHJldHVyblN0YXRlbWVudCA/IHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uIDogcGFyYW1EZWNvcmF0b3JzO1xuICAgIGlmIChleHByZXNzaW9uICYmIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihleHByZXNzaW9uKSkge1xuICAgICAgY29uc3QgZWxlbWVudHMgPSBleHByZXNzaW9uLmVsZW1lbnRzO1xuICAgICAgcmV0dXJuIGVsZW1lbnRzLm1hcChyZWZsZWN0QXJyYXlFbGVtZW50KS5tYXAocGFyYW1JbmZvID0+IHtcbiAgICAgICAgY29uc3QgdHlwZUV4cHJlc3Npb24gPSBwYXJhbUluZm8gJiYgcGFyYW1JbmZvLmhhcygndHlwZScpID8gcGFyYW1JbmZvLmdldCgndHlwZScpISA6IG51bGw7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvckluZm8gPVxuICAgICAgICAgICAgcGFyYW1JbmZvICYmIHBhcmFtSW5mby5oYXMoJ2RlY29yYXRvcnMnKSA/IHBhcmFtSW5mby5nZXQoJ2RlY29yYXRvcnMnKSEgOiBudWxsO1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9ySW5mbyAmJiB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvckluZm8pO1xuICAgICAgICByZXR1cm4ge3R5cGVFeHByZXNzaW9uLCBkZWNvcmF0b3JzfTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAocGFyYW1EZWNvcmF0b3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgJ0ludmFsaWQgY29uc3RydWN0b3IgcGFyYW1ldGVyIGRlY29yYXRvciBpbiAnICsgcGFyYW1EZWNvcmF0b3JzLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSArXG4gICAgICAgICAgICAgICc6XFxuJyxcbiAgICAgICAgICBwYXJhbURlY29yYXRvcnMuZ2V0VGV4dCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIGEgc3ltYm9sIGFuZCBleHRyYWN0IHRoZSBtZW1iZXIgaW5mb3JtYXRpb24sIGNvbWJpbmluZyBpdCB3aXRoIHRoZVxuICAgKiBwcm92aWRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24sIGFuZCB3aGV0aGVyIGl0IGlzIGEgc3RhdGljIG1lbWJlci5cbiAgICpcbiAgICogSWYgYSBjbGFzcyBtZW1iZXIgdXNlcyBhY2Nlc3NvcnMgKGUuZyBnZXR0ZXJzIGFuZC9vciBzZXR0ZXJzKSB0aGVuIGl0IGdldHMgZG93bmxldmVsZWRcbiAgICogaW4gRVM1IHRvIGEgc2luZ2xlIGBPYmplY3QuZGVmaW5lUHJvcGVydHkoKWAgY2FsbC4gSW4gdGhhdCBjYXNlIHdlIG11c3QgcGFyc2UgdGhpc1xuICAgKiBjYWxsIHRvIGV4dHJhY3QgdGhlIG9uZSBvciB0d28gQ2xhc3NNZW1iZXIgb2JqZWN0cyB0aGF0IHJlcHJlc2VudCB0aGUgYWNjZXNzb3JzLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBzeW1ib2wgZm9yIHRoZSBtZW1iZXIgdG8gcmVmbGVjdCBvdmVyLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVycyhzeW1ib2w6IHRzLlN5bWJvbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLCBpc1N0YXRpYz86IGJvb2xlYW4pOlxuICAgICAgQ2xhc3NNZW1iZXJbXXxudWxsIHtcbiAgICBjb25zdCBub2RlID0gc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gfHwgc3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgIGNvbnN0IHByb3BlcnR5RGVmaW5pdGlvbiA9IG5vZGUgJiYgZ2V0UHJvcGVydHlEZWZpbml0aW9uKG5vZGUpO1xuICAgIGlmIChwcm9wZXJ0eURlZmluaXRpb24pIHtcbiAgICAgIGNvbnN0IG1lbWJlcnM6IENsYXNzTWVtYmVyW10gPSBbXTtcbiAgICAgIGlmIChwcm9wZXJ0eURlZmluaXRpb24uc2V0dGVyKSB7XG4gICAgICAgIG1lbWJlcnMucHVzaCh7XG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgICBpbXBsZW1lbnRhdGlvbjogcHJvcGVydHlEZWZpbml0aW9uLnNldHRlcixcbiAgICAgICAgICBraW5kOiBDbGFzc01lbWJlcktpbmQuU2V0dGVyLFxuICAgICAgICAgIHR5cGU6IG51bGwsXG4gICAgICAgICAgbmFtZTogc3ltYm9sLm5hbWUsXG4gICAgICAgICAgbmFtZU5vZGU6IG51bGwsXG4gICAgICAgICAgdmFsdWU6IG51bGwsXG4gICAgICAgICAgaXNTdGF0aWM6IGlzU3RhdGljIHx8IGZhbHNlLFxuICAgICAgICAgIGRlY29yYXRvcnM6IGRlY29yYXRvcnMgfHwgW10sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYXR0YWNoaW5nIHRoZSBkZWNvcmF0b3JzIHRvIGEgcG90ZW50aWFsIGdldHRlci4gSW4gRVM1LCB3ZSBjYW4ndCB0ZWxsIHdoZXJlIHRoZVxuICAgICAgICAvLyBkZWNvcmF0b3JzIHdlcmUgb3JpZ2luYWxseSBhdHRhY2hlZCB0bywgaG93ZXZlciB3ZSBvbmx5IHdhbnQgdG8gYXR0YWNoIHRoZW0gdG8gYSBzaW5nbGVcbiAgICAgICAgLy8gYENsYXNzTWVtYmVyYCBhcyBvdGhlcndpc2Ugbmd0c2Mgd291bGQgaGFuZGxlIHRoZSBzYW1lIGRlY29yYXRvcnMgdHdpY2UuXG4gICAgICAgIGRlY29yYXRvcnMgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBpZiAocHJvcGVydHlEZWZpbml0aW9uLmdldHRlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHByb3BlcnR5RGVmaW5pdGlvbi5nZXR0ZXIsXG4gICAgICAgICAga2luZDogQ2xhc3NNZW1iZXJLaW5kLkdldHRlcixcbiAgICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgICAgIG5hbWU6IHN5bWJvbC5uYW1lLFxuICAgICAgICAgIG5hbWVOb2RlOiBudWxsLFxuICAgICAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgICAgIGlzU3RhdGljOiBpc1N0YXRpYyB8fCBmYWxzZSxcbiAgICAgICAgICBkZWNvcmF0b3JzOiBkZWNvcmF0b3JzIHx8IFtdLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZW1iZXJzO1xuICAgIH1cblxuICAgIGNvbnN0IG1lbWJlcnMgPSBzdXBlci5yZWZsZWN0TWVtYmVycyhzeW1ib2wsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICBtZW1iZXJzICYmIG1lbWJlcnMuZm9yRWFjaChtZW1iZXIgPT4ge1xuICAgICAgaWYgKG1lbWJlciAmJiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZCAmJiBtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLm5vZGUgJiZcbiAgICAgICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihtZW1iZXIubm9kZSkgJiYgbWVtYmVyLm5vZGUucGFyZW50ICYmXG4gICAgICAgICAgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG1lbWJlci5ub2RlLnBhcmVudCkgJiZcbiAgICAgICAgICB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihtZW1iZXIubm9kZS5wYXJlbnQucmlnaHQpKSB7XG4gICAgICAgIC8vIFJlY29tcHV0ZSB0aGUgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWVtYmVyOlxuICAgICAgICAvLyBFUzUgc3RhdGljIG1ldGhvZHMgYXJlIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBzbyB0aGUgZGVjbGFyYXRpb24gaXMgYWN0dWFsbHkgdGhlXG4gICAgICAgIC8vIGluaXRpYWxpemVyIG9mIHRoZSB2YXJpYWJsZSBhc3NpZ25tZW50XG4gICAgICAgIG1lbWJlci5pbXBsZW1lbnRhdGlvbiA9IG1lbWJlci5ub2RlLnBhcmVudC5yaWdodDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbWVtYmVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgdGhhdCBtYXkgY29udGFpbiBjYWxscyB0byBhIGhlbHBlci5cbiAgICpcbiAgICogSW4gRVNNNSBjb2RlIHRoZSBoZWxwZXIgY2FsbHMgYXJlIGhpZGRlbiBpbnNpZGUgdGhlIGNsYXNzJ3MgSUlGRS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBoZWxwZXIgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uIFdlIGV4cGVjdCB0aGlzIHN5bWJvbFxuICAgKiB0byByZWZlcmVuY2UgdGhlIGlubmVyIGlkZW50aWZpZXIgaW5zaWRlIHRoZSBJSUZFLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBzdGF0ZW1lbnRzIHRoYXQgbWF5IGNvbnRhaW4gaGVscGVyIGNhbGxzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogdHMuU3RhdGVtZW50W10ge1xuICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb25QYXJlbnQgPSBjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uLnBhcmVudDtcbiAgICByZXR1cm4gdHMuaXNCbG9jayhjbGFzc0RlY2xhcmF0aW9uUGFyZW50KSA/IEFycmF5LmZyb20oY2xhc3NEZWNsYXJhdGlvblBhcmVudC5zdGF0ZW1lbnRzKSA6IFtdO1xuICB9XG5cbiAgLy8vLy8vLy8vLy8vLyBIb3N0IFByaXZhdGUgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbiAgLyoqXG4gICAqIEEgY29uc3RydWN0b3IgZnVuY3Rpb24gbWF5IGhhdmUgYmVlbiBcInN5bnRoZXNpemVkXCIgYnkgVHlwZVNjcmlwdCBkdXJpbmcgSmF2YVNjcmlwdCBlbWl0LFxuICAgKiBpbiB0aGUgY2FzZSBubyB1c2VyLWRlZmluZWQgY29uc3RydWN0b3IgZXhpc3RzIGFuZCBlLmcuIHByb3BlcnR5IGluaXRpYWxpemVycyBhcmUgdXNlZC5cbiAgICogVGhvc2UgaW5pdGlhbGl6ZXJzIG5lZWQgdG8gYmUgZW1pdHRlZCBpbnRvIGEgY29uc3RydWN0b3IgaW4gSmF2YVNjcmlwdCwgc28gdGhlIFR5cGVTY3JpcHRcbiAgICogY29tcGlsZXIgZ2VuZXJhdGVzIGEgc3ludGhldGljIGNvbnN0cnVjdG9yLlxuICAgKlxuICAgKiBXZSBuZWVkIHRvIGlkZW50aWZ5IHN1Y2ggY29uc3RydWN0b3JzIGFzIG5nY2MgbmVlZHMgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIGEgY2xhc3MgZGlkXG4gICAqIG9yaWdpbmFsbHkgaGF2ZSBhIGNvbnN0cnVjdG9yIGluIHRoZSBUeXBlU2NyaXB0IHNvdXJjZS4gRm9yIEVTNSwgd2UgY2FuIG5vdCB0ZWxsIGFuXG4gICAqIGVtcHR5IGNvbnN0cnVjdG9yIGFwYXJ0IGZyb20gYSBzeW50aGVzaXplZCBjb25zdHJ1Y3RvciwgYnV0IGZvcnR1bmF0ZWx5IHRoYXQgZG9lcyBub3RcbiAgICogbWF0dGVyIGZvciB0aGUgY29kZSBnZW5lcmF0ZWQgYnkgbmd0c2MuXG4gICAqXG4gICAqIFdoZW4gYSBjbGFzcyBoYXMgYSBzdXBlcmNsYXNzIGhvd2V2ZXIsIGEgc3ludGhlc2l6ZWQgY29uc3RydWN0b3IgbXVzdCBub3QgYmUgY29uc2lkZXJlZFxuICAgKiBhcyBhIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBhcyB0aGF0IHByZXZlbnRzIGEgYmFzZSBmYWN0b3J5IGNhbGwgZnJvbSBiZWluZyBjcmVhdGVkIGJ5XG4gICAqIG5ndHNjLCByZXN1bHRpbmcgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uIHRoYXQgZG9lcyBub3QgaW5qZWN0IHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlXG4gICAqIHN1cGVyY2xhc3MuIEhlbmNlLCB3ZSBpZGVudGlmeSBhIGRlZmF1bHQgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBpbiB0aGUgY29uc3RydWN0b3IgYm9keSxcbiAgICogYWNjb3JkaW5nIHRvIHRoZSBzdHJ1Y3R1cmUgdGhhdCBUeXBlU2NyaXB0J3MgRVMyMDE1IHRvIEVTNSB0cmFuc2Zvcm1lciBnZW5lcmF0ZXMgaW5cbiAgICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuMi4yL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvZXMyMDE1LnRzI0wxMDgyLUwxMDk4XG4gICAqXG4gICAqIEFkZGl0aW9uYWxseSwgd2UgaGFuZGxlIHN5bnRoZXRpYyBkZWxlZ2F0ZSBjb25zdHJ1Y3RvcnMgdGhhdCBhcmUgZW1pdHRlZCB3aGVuIFR5cGVTY3JpcHRcbiAgICogZG93bmxldmVsJ3MgRVMyMDE1IHN5bnRoZXRpY2FsbHkgZ2VuZXJhdGVkIHRvIEVTNS4gVGhlc2UgdmFyeSBzbGlnaHRseSBmcm9tIHRoZSBkZWZhdWx0XG4gICAqIHN0cnVjdHVyZSBtZW50aW9uZWQgYWJvdmUgYmVjYXVzZSB0aGUgRVMyMDE1IG91dHB1dCB1c2VzIGEgc3ByZWFkIG9wZXJhdG9yLCBmb3IgZGVsZWdhdGluZ1xuICAgKiB0byB0aGUgcGFyZW50IGNvbnN0cnVjdG9yLCB0aGF0IGlzIHByZXNlcnZlZCB0aHJvdWdoIGEgVHlwZVNjcmlwdCBoZWxwZXIgaW4gRVM1LiBlLmcuXG4gICAqXG4gICAqIGBgYFxuICAgKiByZXR1cm4gX3N1cGVyLmFwcGx5KHRoaXMsIHRzbGliLl9fc3ByZWFkKGFyZ3VtZW50cykpIHx8IHRoaXM7XG4gICAqIGBgYFxuICAgKlxuICAgKiBvciwgc2luY2UgVHlwZVNjcmlwdCA0LjIgaXQgd291bGQgYmVcbiAgICpcbiAgICogYGBgXG4gICAqIHJldHVybiBfc3VwZXIuYXBwbHkodGhpcywgdHNsaWIuX19zcHJlYWRBcnJheShbXSwgdHNsaWIuX19yZWFkKGFyZ3VtZW50cykpKSB8fCB0aGlzO1xuICAgKiBgYGBcbiAgICpcbiAgICogU3VjaCBjb25zdHJ1Y3RzIGNhbiBiZSBzdGlsbCBjb25zaWRlcmVkIGFzIHN5bnRoZXRpYyBkZWxlZ2F0ZSBjb25zdHJ1Y3RvcnMgYXMgdGhleSBhcmVcbiAgICogdGhlIHByb2R1Y3Qgb2YgYSBjb21tb24gVHlwZVNjcmlwdCB0byBFUzUgc3ludGhldGljIGNvbnN0cnVjdG9yLCBqdXN0IGJlaW5nIGRvd25sZXZlbGVkXG4gICAqIHRvIEVTNSB1c2luZyBgdHNjYC4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy8zODQ1My5cbiAgICpcbiAgICpcbiAgICogQHBhcmFtIGNvbnN0cnVjdG9yIGEgY29uc3RydWN0b3IgZnVuY3Rpb24gdG8gdGVzdFxuICAgKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBjb25zdHJ1Y3RvciBhcHBlYXJzIHRvIGhhdmUgYmVlbiBzeW50aGVzaXplZFxuICAgKi9cbiAgcHJpdmF0ZSBpc1N5bnRoZXNpemVkQ29uc3RydWN0b3IoY29uc3RydWN0b3I6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBpZiAoIWNvbnN0cnVjdG9yLmJvZHkpIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGZpcnN0U3RhdGVtZW50ID0gY29uc3RydWN0b3IuYm9keS5zdGF0ZW1lbnRzWzBdO1xuICAgIGlmICghZmlyc3RTdGF0ZW1lbnQpIHJldHVybiBmYWxzZTtcblxuICAgIHJldHVybiB0aGlzLmlzU3ludGhlc2l6ZWRTdXBlclRoaXNBc3NpZ25tZW50KGZpcnN0U3RhdGVtZW50KSB8fFxuICAgICAgICB0aGlzLmlzU3ludGhlc2l6ZWRTdXBlclJldHVyblN0YXRlbWVudChmaXJzdFN0YXRlbWVudCk7XG4gIH1cblxuICAvKipcbiAgICogSWRlbnRpZmllcyBzeW50aGVzaXplZCBzdXBlciBjYWxscyB3aGljaCBwYXNzLXRocm91Z2ggZnVuY3Rpb24gYXJndW1lbnRzIGRpcmVjdGx5IGFuZCBhcmVcbiAgICogYmVpbmcgYXNzaWduZWQgdG8gYSBjb21tb24gYF90aGlzYCB2YXJpYWJsZS4gVGhlIGZvbGxvd2luZyBwYXR0ZXJucyB3ZSBpbnRlbmQgdG8gbWF0Y2g6XG4gICAqXG4gICAqIDEuIERlbGVnYXRlIGNhbGwgZW1pdHRlZCBieSBUeXBlU2NyaXB0IHdoZW4gaXQgZW1pdHMgRVM1IGRpcmVjdGx5LlxuICAgKiAgIGBgYFxuICAgKiAgIHZhciBfdGhpcyA9IF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICAgKiAgIGBgYFxuICAgKlxuICAgKiAyLiBEZWxlZ2F0ZSBjYWxsIGVtaXR0ZWQgYnkgVHlwZVNjcmlwdCB3aGVuIGl0IGRvd25sZXZlbCdzIEVTMjAxNSB0byBFUzUuXG4gICAqICAgYGBgXG4gICAqICAgdmFyIF90aGlzID0gX3N1cGVyLmFwcGx5KHRoaXMsIHRzbGliLl9fc3ByZWFkKGFyZ3VtZW50cykpIHx8IHRoaXM7XG4gICAqICAgYGBgXG4gICAqICAgb3IgdXNpbmcgdGhlIHN5bnRheCBlbWl0dGVkIHNpbmNlIFR5cGVTY3JpcHQgNC4yOlxuICAgKiAgIGBgYFxuICAgKiAgIHJldHVybiBfc3VwZXIuYXBwbHkodGhpcywgdHNsaWIuX19zcHJlYWRBcnJheShbXSwgdHNsaWIuX19yZWFkKGFyZ3VtZW50cykpKSB8fCB0aGlzO1xuICAgKiAgIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gc3RhdGVtZW50IGEgc3RhdGVtZW50IHRoYXQgbWF5IGJlIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbFxuICAgKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBzdGF0ZW1lbnQgbG9va3MgbGlrZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAgICovXG4gIHByaXZhdGUgaXNTeW50aGVzaXplZFN1cGVyVGhpc0Fzc2lnbm1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBib29sZWFuIHtcbiAgICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgdmFyaWFibGVEZWNsYXJhdGlvbnMgPSBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucztcbiAgICBpZiAodmFyaWFibGVEZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCB2YXJpYWJsZURlY2xhcmF0aW9uID0gdmFyaWFibGVEZWNsYXJhdGlvbnNbMF07XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIodmFyaWFibGVEZWNsYXJhdGlvbi5uYW1lKSB8fFxuICAgICAgICAhdmFyaWFibGVEZWNsYXJhdGlvbi5uYW1lLnRleHQuc3RhcnRzV2l0aCgnX3RoaXMnKSlcbiAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGluaXRpYWxpemVyID0gdmFyaWFibGVEZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgICBpZiAoIWluaXRpYWxpemVyKSByZXR1cm4gZmFsc2U7XG5cbiAgICByZXR1cm4gdGhpcy5pc1N5bnRoZXNpemVkRGVmYXVsdFN1cGVyQ2FsbChpbml0aWFsaXplcik7XG4gIH1cbiAgLyoqXG4gICAqIElkZW50aWZpZXMgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbHMgd2hpY2ggcGFzcy10aHJvdWdoIGZ1bmN0aW9uIGFyZ3VtZW50cyBkaXJlY3RseSBhbmRcbiAgICogYXJlIGJlaW5nIHJldHVybmVkLiBUaGUgZm9sbG93aW5nIHBhdHRlcm5zIGNvcnJlc3BvbmQgdG8gc3ludGhldGljIHN1cGVyIHJldHVybiBjYWxsczpcbiAgICpcbiAgICogMS4gRGVsZWdhdGUgY2FsbCBlbWl0dGVkIGJ5IFR5cGVTY3JpcHQgd2hlbiBpdCBlbWl0cyBFUzUgZGlyZWN0bHkuXG4gICAqICAgYGBgXG4gICAqICAgcmV0dXJuIF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICAgKiAgIGBgYFxuICAgKlxuICAgKiAyLiBEZWxlZ2F0ZSBjYWxsIGVtaXR0ZWQgYnkgVHlwZVNjcmlwdCB3aGVuIGl0IGRvd25sZXZlbCdzIEVTMjAxNSB0byBFUzUuXG4gICAqICAgYGBgXG4gICAqICAgcmV0dXJuIF9zdXBlci5hcHBseSh0aGlzLCB0c2xpYi5fX3NwcmVhZChhcmd1bWVudHMpKSB8fCB0aGlzO1xuICAgKiAgIGBgYFxuICAgKiAgIG9yIHVzaW5nIHRoZSBzeW50YXggZW1pdHRlZCBzaW5jZSBUeXBlU2NyaXB0IDQuMjpcbiAgICogICBgYGBcbiAgICogICByZXR1cm4gX3N1cGVyLmFwcGx5KHRoaXMsIHRzbGliLl9fc3ByZWFkQXJyYXkoW10sIHRzbGliLl9fcmVhZChhcmd1bWVudHMpKSkgfHwgdGhpcztcbiAgICogICBgYGBcbiAgICpcbiAgICogQHBhcmFtIHN0YXRlbWVudCBhIHN0YXRlbWVudCB0aGF0IG1heSBiZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAgICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgc3RhdGVtZW50IGxvb2tzIGxpa2UgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gICAqL1xuICBwcml2YXRlIGlzU3ludGhlc2l6ZWRTdXBlclJldHVyblN0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IGJvb2xlYW4ge1xuICAgIGlmICghdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgZXhwcmVzc2lvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uO1xuICAgIGlmICghZXhwcmVzc2lvbikgcmV0dXJuIGZhbHNlO1xuXG4gICAgcmV0dXJuIHRoaXMuaXNTeW50aGVzaXplZERlZmF1bHRTdXBlckNhbGwoZXhwcmVzc2lvbik7XG4gIH1cblxuICAvKipcbiAgICogSWRlbnRpZmllcyBzeW50aGVzaXplZCBzdXBlciBjYWxscyB3aGljaCBwYXNzLXRocm91Z2ggZnVuY3Rpb24gYXJndW1lbnRzIGRpcmVjdGx5LiBUaGVcbiAgICogc3ludGhldGljIGRlbGVnYXRlIHN1cGVyIGNhbGwgbWF0Y2ggdGhlIGZvbGxvd2luZyBwYXR0ZXJucyB3ZSBpbnRlbmQgdG8gbWF0Y2g6XG4gICAqXG4gICAqIDEuIERlbGVnYXRlIGNhbGwgZW1pdHRlZCBieSBUeXBlU2NyaXB0IHdoZW4gaXQgZW1pdHMgRVM1IGRpcmVjdGx5LlxuICAgKiAgIGBgYFxuICAgKiAgIF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICAgKiAgIGBgYFxuICAgKlxuICAgKiAyLiBEZWxlZ2F0ZSBjYWxsIGVtaXR0ZWQgYnkgVHlwZVNjcmlwdCB3aGVuIGl0IGRvd25sZXZlbCdzIEVTMjAxNSB0byBFUzUuXG4gICAqICAgYGBgXG4gICAqICAgX3N1cGVyLmFwcGx5KHRoaXMsIHRzbGliLl9fc3ByZWFkKGFyZ3VtZW50cykpIHx8IHRoaXM7XG4gICAqICAgYGBgXG4gICAqICAgb3IgdXNpbmcgdGhlIHN5bnRheCBlbWl0dGVkIHNpbmNlIFR5cGVTY3JpcHQgNC4yOlxuICAgKiAgIGBgYFxuICAgKiAgIHJldHVybiBfc3VwZXIuYXBwbHkodGhpcywgdHNsaWIuX19zcHJlYWRBcnJheShbXSwgdHNsaWIuX19yZWFkKGFyZ3VtZW50cykpKSB8fCB0aGlzO1xuICAgKiAgIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZXhwcmVzc2lvbiBhbiBleHByZXNzaW9uIHRoYXQgbWF5IHJlcHJlc2VudCBhIGRlZmF1bHQgc3VwZXIgY2FsbFxuICAgKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBleHByZXNzaW9uIGNvcnJlc3BvbmRzIHdpdGggdGhlIGFib3ZlIGZvcm1cbiAgICovXG4gIHByaXZhdGUgaXNTeW50aGVzaXplZERlZmF1bHRTdXBlckNhbGwoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICAgIGlmICghaXNCaW5hcnlFeHByKGV4cHJlc3Npb24sIHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW4pKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGV4cHJlc3Npb24ucmlnaHQua2luZCAhPT0gdHMuU3ludGF4S2luZC5UaGlzS2V5d29yZCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgbGVmdCA9IGV4cHJlc3Npb24ubGVmdDtcbiAgICBpZiAoaXNCaW5hcnlFeHByKGxlZnQsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4pKSB7XG4gICAgICByZXR1cm4gaXNTdXBlck5vdE51bGwobGVmdC5sZWZ0KSAmJiB0aGlzLmlzU3VwZXJBcHBseUNhbGwobGVmdC5yaWdodCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmlzU3VwZXJBcHBseUNhbGwobGVmdCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gY29ycmVzcG9uZHMgdG8gYSBgc3VwZXJgIGNhbGwgcGFzc2luZyB0aHJvdWdoXG4gICAqIGZ1bmN0aW9uIGFyZ3VtZW50cyB3aXRob3V0IGFueSBtb2RpZmljYXRpb24uIGUuZy5cbiAgICpcbiAgICogYGBgXG4gICAqIF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhpcyBzdHJ1Y3R1cmUgaXMgZ2VuZXJhdGVkIGJ5IFR5cGVTY3JpcHQgd2hlbiB0cmFuc2Zvcm1pbmcgRVMyMDE1IHRvIEVTNSwgc2VlXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL3YzLjIuMi9zcmMvY29tcGlsZXIvdHJhbnNmb3JtZXJzL2VzMjAxNS50cyNMMTE0OC1MMTE2M1xuICAgKlxuICAgKiBBZGRpdGlvbmFsbHksIHdlIGFsc28gaGFuZGxlIGNhc2VzIHdoZXJlIGBhcmd1bWVudHNgIGFyZSB3cmFwcGVkIGJ5IGEgVHlwZVNjcmlwdCBzcHJlYWRcbiAgICogaGVscGVyLlxuICAgKiBUaGlzIGNhbiBoYXBwZW4gaWYgRVMyMDE1IGNsYXNzIG91dHB1dCBjb250YWluIGF1dG8tZ2VuZXJhdGVkIGNvbnN0cnVjdG9ycyBkdWUgdG8gY2xhc3NcbiAgICogbWVtYmVycy4gVGhlIEVTMjAxNSBvdXRwdXQgd2lsbCBiZSB1c2luZyBgc3VwZXIoLi4uYXJndW1lbnRzKWAgdG8gZGVsZWdhdGUgdG8gdGhlIHN1cGVyY2xhc3MsXG4gICAqIGJ1dCBvbmNlIGRvd25sZXZlbGVkIHRvIEVTNSwgdGhlIHNwcmVhZCBvcGVyYXRvciB3aWxsIGJlIHBlcnNpc3RlZCB0aHJvdWdoIGEgVHlwZVNjcmlwdCBzcHJlYWRcbiAgICogaGVscGVyLiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIF9zdXBlci5hcHBseSh0aGlzLCBfX3NwcmVhZChhcmd1bWVudHMpKSB8fCB0aGlzO1xuICAgKiBgYGBcbiAgICpcbiAgICogb3IsIHNpbmNlIFR5cGVTY3JpcHQgNC4yIGl0IHdvdWxkIGJlXG4gICAqXG4gICAqIGBgYFxuICAgKiBfc3VwZXIuYXBwbHkodGhpcywgdHNsaWIuX19zcHJlYWRBcnJheShbXSwgdHNsaWIuX19yZWFkKGFyZ3VtZW50cykpKSB8fCB0aGlzO1xuICAgKiBgYGBcbiAgICpcbiAgICogTW9yZSBkZXRhaWxzIGNhbiBiZSBmb3VuZCBpbjogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9pc3N1ZXMvMzg0NTMuXG4gICAqXG4gICAqIEBwYXJhbSBleHByZXNzaW9uIGFuIGV4cHJlc3Npb24gdGhhdCBtYXkgcmVwcmVzZW50IGEgZGVmYXVsdCBzdXBlciBjYWxsXG4gICAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gY29ycmVzcG9uZHMgd2l0aCB0aGUgYWJvdmUgZm9ybVxuICAgKi9cbiAgcHJpdmF0ZSBpc1N1cGVyQXBwbHlDYWxsKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikgfHwgZXhwcmVzc2lvbi5hcmd1bWVudHMubGVuZ3RoICE9PSAyKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCB0YXJnZXRGbiA9IGV4cHJlc3Npb24uZXhwcmVzc2lvbjtcbiAgICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHRhcmdldEZuKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghaXNTdXBlcklkZW50aWZpZXIodGFyZ2V0Rm4uZXhwcmVzc2lvbikpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGFyZ2V0Rm4ubmFtZS50ZXh0ICE9PSAnYXBwbHknKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCB0aGlzQXJndW1lbnQgPSBleHByZXNzaW9uLmFyZ3VtZW50c1swXTtcbiAgICBpZiAodGhpc0FyZ3VtZW50LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQpIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGFyZ3VtZW50c0V4cHIgPSBleHByZXNzaW9uLmFyZ3VtZW50c1sxXTtcblxuICAgIC8vIElmIHRoZSBzdXBlciBpcyBkaXJlY3RseSBpbnZva2VkIHdpdGggYGFyZ3VtZW50c2AsIHJldHVybiBgdHJ1ZWAuIFRoaXMgcmVwcmVzZW50cyB0aGVcbiAgICAvLyBjb21tb24gVHlwZVNjcmlwdCBvdXRwdXQgd2hlcmUgdGhlIGRlbGVnYXRlIGNvbnN0cnVjdG9yIHN1cGVyIGNhbGwgbWF0Y2hlcyB0aGUgZm9sbG93aW5nXG4gICAgLy8gcGF0dGVybjogYHN1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylgLlxuICAgIGlmIChpc0FyZ3VtZW50c0lkZW50aWZpZXIoYXJndW1lbnRzRXhwcikpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIFRoZSBvdGhlciBzY2VuYXJpbyB3ZSBpbnRlbmQgdG8gZGV0ZWN0OiBUaGUgYGFyZ3VtZW50c2AgdmFyaWFibGUgbWlnaHQgYmUgd3JhcHBlZCB3aXRoIHRoZVxuICAgIC8vIFR5cGVTY3JpcHQgc3ByZWFkIGhlbHBlciAoZWl0aGVyIHRocm91Z2ggdHNsaWIgb3IgaW5saW5lZCkuIFRoaXMgY2FuIGhhcHBlbiBpZiBhbiBleHBsaWNpdFxuICAgIC8vIGRlbGVnYXRlIGNvbnN0cnVjdG9yIHVzZXMgYHN1cGVyKC4uLmFyZ3VtZW50cylgIGluIEVTMjAxNSBhbmQgaXMgZG93bmxldmVsZWQgdG8gRVM1IHVzaW5nXG4gICAgLy8gYC0tZG93bmxldmVsSXRlcmF0aW9uYC5cbiAgICByZXR1cm4gdGhpcy5pc1NwcmVhZEFyZ3VtZW50c0V4cHJlc3Npb24oYXJndW1lbnRzRXhwcik7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyBpZiB0aGUgcHJvdmlkZWQgZXhwcmVzc2lvbiBpcyBvbmUgb2YgdGhlIGZvbGxvd2luZyBjYWxsIGV4cHJlc3Npb25zOlxuICAgKlxuICAgKiAxLiBgX19zcHJlYWQoYXJndW1lbnRzKWBcbiAgICogMi4gYF9fc3ByZWFkQXJyYXkoW10sIF9fcmVhZChhcmd1bWVudHMpKWBcbiAgICpcbiAgICogVGhlIHRzbGliIGhlbHBlcnMgbWF5IGhhdmUgYmVlbiBlbWl0dGVkIGlubGluZSBhcyBpbiB0aGUgYWJvdmUgZXhhbXBsZSwgb3IgdGhleSBtYXkgYmUgcmVhZFxuICAgKiBmcm9tIGEgbmFtZXNwYWNlIGltcG9ydC5cbiAgICovXG4gIHByaXZhdGUgaXNTcHJlYWRBcmd1bWVudHNFeHByZXNzaW9uKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgICBjb25zdCBjYWxsID0gdGhpcy5leHRyYWN0S25vd25IZWxwZXJDYWxsKGV4cHJlc3Npb24pO1xuICAgIGlmIChjYWxsID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKGNhbGwuaGVscGVyID09PSBLbm93bkRlY2xhcmF0aW9uLlRzSGVscGVyU3ByZWFkKSB7XG4gICAgICAvLyBgX19zcHJlYWQoYXJndW1lbnRzKWBcbiAgICAgIHJldHVybiBjYWxsLmFyZ3MubGVuZ3RoID09PSAxICYmIGlzQXJndW1lbnRzSWRlbnRpZmllcihjYWxsLmFyZ3NbMF0pO1xuICAgIH0gZWxzZSBpZiAoY2FsbC5oZWxwZXIgPT09IEtub3duRGVjbGFyYXRpb24uVHNIZWxwZXJTcHJlYWRBcnJheSkge1xuICAgICAgLy8gYF9fc3ByZWFkQXJyYXkoW10sIF9fcmVhZChhcmd1bWVudHMpKWBcbiAgICAgIGlmIChjYWxsLmFyZ3MubGVuZ3RoICE9PSAyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZmlyc3RBcmcgPSBjYWxsLmFyZ3NbMF07XG4gICAgICBpZiAoIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihmaXJzdEFyZykgfHwgZmlyc3RBcmcuZWxlbWVudHMubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc2Vjb25kQXJnID0gdGhpcy5leHRyYWN0S25vd25IZWxwZXJDYWxsKGNhbGwuYXJnc1sxXSk7XG4gICAgICBpZiAoc2Vjb25kQXJnID09PSBudWxsIHx8IHNlY29uZEFyZy5oZWxwZXIgIT09IEtub3duRGVjbGFyYXRpb24uVHNIZWxwZXJSZWFkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNlY29uZEFyZy5hcmdzLmxlbmd0aCA9PT0gMSAmJiBpc0FyZ3VtZW50c0lkZW50aWZpZXIoc2Vjb25kQXJnLmFyZ3NbMF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluc3BlY3RzIHRoZSBwcm92aWRlZCBleHByZXNzaW9uIGFuZCBkZXRlcm1pbmVzIGlmIGl0IGNvcnJlc3BvbmRzIHdpdGggYSBrbm93biBoZWxwZXIgZnVuY3Rpb25cbiAgICogYXMgcmVjZWl2ZXIgZXhwcmVzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgZXh0cmFjdEtub3duSGVscGVyQ2FsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTpcbiAgICAgIHtoZWxwZXI6IEtub3duRGVjbGFyYXRpb24sIGFyZ3M6IHRzLk5vZGVBcnJheTx0cy5FeHByZXNzaW9uPn18bnVsbCB7XG4gICAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCByZWNlaXZlckV4cHIgPSBleHByZXNzaW9uLmV4cHJlc3Npb247XG5cbiAgICAvLyBUaGUgaGVscGVyIGNvdWxkIGJlIGdsb2JhbGx5IGF2YWlsYWJsZSwgb3IgYWNjZXNzZWQgdGhyb3VnaCBhIG5hbWVzcGFjZWQgaW1wb3J0LiBIZW5jZSB3ZVxuICAgIC8vIHN1cHBvcnQgYSBwcm9wZXJ0eSBhY2Nlc3MgaGVyZSBhcyBsb25nIGFzIGl0IHJlc29sdmVzIHRvIHRoZSBhY3R1YWwga25vd24gVHlwZVNjcmlwdCBoZWxwZXIuXG4gICAgbGV0IHJlY2VpdmVyOiBEZWNsYXJhdGlvbnxudWxsID0gbnVsbDtcbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKHJlY2VpdmVyRXhwcikpIHtcbiAgICAgIHJlY2VpdmVyID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihyZWNlaXZlckV4cHIpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24ocmVjZWl2ZXJFeHByKSAmJiB0cy5pc0lkZW50aWZpZXIocmVjZWl2ZXJFeHByLm5hbWUpKSB7XG4gICAgICByZWNlaXZlciA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIocmVjZWl2ZXJFeHByLm5hbWUpO1xuICAgIH1cblxuICAgIGlmIChyZWNlaXZlciA9PT0gbnVsbCB8fCByZWNlaXZlci5rbm93biA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGhlbHBlcjogcmVjZWl2ZXIua25vd24sXG4gICAgICBhcmdzOiBleHByZXNzaW9uLmFyZ3VtZW50cyxcbiAgICB9O1xuICB9XG59XG5cbi8vLy8vLy8vLy8vLy8gSW50ZXJuYWwgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgZGV0YWlscyBhYm91dCBwcm9wZXJ0eSBkZWZpbml0aW9ucyB0aGF0IHdlcmUgc2V0IHVzaW5nIGBPYmplY3QuZGVmaW5lUHJvcGVydHlgLlxuICovXG5pbnRlcmZhY2UgUHJvcGVydHlEZWZpbml0aW9uIHtcbiAgc2V0dGVyOiB0cy5GdW5jdGlvbkV4cHJlc3Npb258bnVsbDtcbiAgZ2V0dGVyOiB0cy5GdW5jdGlvbkV4cHJlc3Npb258bnVsbDtcbn1cblxuLyoqXG4gKiBJbiBFUzUsIGdldHRlcnMgYW5kIHNldHRlcnMgaGF2ZSBiZWVuIGRvd25sZXZlbGVkIGludG8gY2FsbCBleHByZXNzaW9ucyBvZlxuICogYE9iamVjdC5kZWZpbmVQcm9wZXJ0eWAsIHN1Y2ggYXNcbiAqXG4gKiBgYGBcbiAqIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDbGF6ei5wcm90b3R5cGUsIFwicHJvcGVydHlcIiwge1xuICogICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAqICAgICAgIHJldHVybiAndmFsdWUnO1xuICogICB9LFxuICogICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICogICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICogICB9LFxuICogICBlbnVtZXJhYmxlOiB0cnVlLFxuICogICBjb25maWd1cmFibGU6IHRydWVcbiAqIH0pO1xuICogYGBgXG4gKlxuICogVGhpcyBmdW5jdGlvbiBpbnNwZWN0cyB0aGUgZ2l2ZW4gbm9kZSB0byBkZXRlcm1pbmUgaWYgaXQgY29ycmVzcG9uZHMgd2l0aCBzdWNoIGEgY2FsbCwgYW5kIGlmIHNvXG4gKiBleHRyYWN0cyB0aGUgYHNldGAgYW5kIGBnZXRgIGZ1bmN0aW9uIGV4cHJlc3Npb25zIGZyb20gdGhlIGRlc2NyaXB0b3Igb2JqZWN0LCBpZiB0aGV5IGV4aXN0LlxuICpcbiAqIEBwYXJhbSBub2RlIFRoZSBub2RlIHRvIG9idGFpbiB0aGUgcHJvcGVydHkgZGVmaW5pdGlvbiBmcm9tLlxuICogQHJldHVybnMgVGhlIHByb3BlcnR5IGRlZmluaXRpb24gaWYgdGhlIG5vZGUgY29ycmVzcG9uZHMgd2l0aCBhY2Nlc3NvciwgbnVsbCBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGdldFByb3BlcnR5RGVmaW5pdGlvbihub2RlOiB0cy5Ob2RlKTogUHJvcGVydHlEZWZpbml0aW9ufG51bGwge1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGZuID0gbm9kZS5leHByZXNzaW9uO1xuICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGZuKSB8fCAhdHMuaXNJZGVudGlmaWVyKGZuLmV4cHJlc3Npb24pIHx8XG4gICAgICBmbi5leHByZXNzaW9uLnRleHQgIT09ICdPYmplY3QnIHx8IGZuLm5hbWUudGV4dCAhPT0gJ2RlZmluZVByb3BlcnR5JylcbiAgICByZXR1cm4gbnVsbDtcblxuICBjb25zdCBkZXNjcmlwdG9yID0gbm9kZS5hcmd1bWVudHNbMl07XG4gIGlmICghZGVzY3JpcHRvciB8fCAhdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihkZXNjcmlwdG9yKSkgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIHtcbiAgICBzZXR0ZXI6IHJlYWRQcm9wZXJ0eUZ1bmN0aW9uRXhwcmVzc2lvbihkZXNjcmlwdG9yLCAnc2V0JyksXG4gICAgZ2V0dGVyOiByZWFkUHJvcGVydHlGdW5jdGlvbkV4cHJlc3Npb24oZGVzY3JpcHRvciwgJ2dldCcpLFxuICB9O1xufVxuXG5mdW5jdGlvbiByZWFkUHJvcGVydHlGdW5jdGlvbkV4cHJlc3Npb24ob2JqZWN0OiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiwgbmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHByb3BlcnR5ID0gb2JqZWN0LnByb3BlcnRpZXMuZmluZChcbiAgICAgIChwKTogcCBpcyB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQgPT5cbiAgICAgICAgICB0cy5pc1Byb3BlcnR5QXNzaWdubWVudChwKSAmJiB0cy5pc0lkZW50aWZpZXIocC5uYW1lKSAmJiBwLm5hbWUudGV4dCA9PT0gbmFtZSk7XG5cbiAgcmV0dXJuIHByb3BlcnR5ICYmIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHByb3BlcnR5LmluaXRpYWxpemVyKSAmJiBwcm9wZXJ0eS5pbml0aWFsaXplciB8fCBudWxsO1xufVxuXG5mdW5jdGlvbiBnZXRSZXR1cm5TdGF0ZW1lbnQoZGVjbGFyYXRpb246IHRzLkV4cHJlc3Npb258dW5kZWZpbmVkKTogdHMuUmV0dXJuU3RhdGVtZW50fHVuZGVmaW5lZCB7XG4gIHJldHVybiBkZWNsYXJhdGlvbiAmJiB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihkZWNsYXJhdGlvbikgP1xuICAgICAgZGVjbGFyYXRpb24uYm9keS5zdGF0ZW1lbnRzLmZpbmQodHMuaXNSZXR1cm5TdGF0ZW1lbnQpIDpcbiAgICAgIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gcmVmbGVjdEFycmF5RWxlbWVudChlbGVtZW50OiB0cy5FeHByZXNzaW9uKSB7XG4gIHJldHVybiB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGVsZW1lbnQpID8gcmVmbGVjdE9iamVjdExpdGVyYWwoZWxlbWVudCkgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBpc0FyZ3VtZW50c0lkZW50aWZpZXIoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24pICYmIGV4cHJlc3Npb24udGV4dCA9PT0gJ2FyZ3VtZW50cyc7XG59XG5cbmZ1bmN0aW9uIGlzU3VwZXJOb3ROdWxsKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIGlzQmluYXJ5RXhwcihleHByZXNzaW9uLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzRXF1YWxzVG9rZW4pICYmXG4gICAgICBpc1N1cGVySWRlbnRpZmllcihleHByZXNzaW9uLmxlZnQpO1xufVxuXG5mdW5jdGlvbiBpc0JpbmFyeUV4cHIoXG4gICAgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbiwgb3BlcmF0b3I6IHRzLkJpbmFyeU9wZXJhdG9yKTogZXhwcmVzc2lvbiBpcyB0cy5CaW5hcnlFeHByZXNzaW9uIHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihleHByZXNzaW9uKSAmJiBleHByZXNzaW9uLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gb3BlcmF0b3I7XG59XG5cbmZ1bmN0aW9uIGlzU3VwZXJJZGVudGlmaWVyKG5vZGU6IHRzLk5vZGUpOiBib29sZWFuIHtcbiAgLy8gVmVyaWZ5IHRoYXQgdGhlIGlkZW50aWZpZXIgaXMgcHJlZml4ZWQgd2l0aCBgX3N1cGVyYC4gV2UgZG9uJ3QgdGVzdCBmb3IgZXF1aXZhbGVuY2VcbiAgLy8gYXMgVHlwZVNjcmlwdCBtYXkgaGF2ZSBzdWZmaXhlZCB0aGUgbmFtZSwgZS5nLiBgX3N1cGVyXzFgIHRvIGF2b2lkIG5hbWUgY29uZmxpY3RzLlxuICAvLyBSZXF1aXJpbmcgb25seSBhIHByZWZpeCBzaG91bGQgYmUgc3VmZmljaWVudGx5IGFjY3VyYXRlLlxuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKG5vZGUpICYmIG5vZGUudGV4dC5zdGFydHNXaXRoKCdfc3VwZXInKTtcbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgc3RhdGVtZW50IHRvIGV4dHJhY3QgdGhlIEVTTTUgcGFyYW1ldGVyIGluaXRpYWxpemVyIGlmIHRoZXJlIGlzIG9uZS5cbiAqIElmIG9uZSBpcyBmb3VuZCwgYWRkIGl0IHRvIHRoZSBhcHByb3ByaWF0ZSBwYXJhbWV0ZXIgaW4gdGhlIGBwYXJhbWV0ZXJzYCBjb2xsZWN0aW9uLlxuICpcbiAqIFRoZSBmb3JtIHdlIGFyZSBsb29raW5nIGZvciBpczpcbiAqXG4gKiBgYGBcbiAqIGlmIChhcmcgPT09IHZvaWQgMCkgeyBhcmcgPSBpbml0aWFsaXplcjsgfVxuICogYGBgXG4gKlxuICogQHBhcmFtIHN0YXRlbWVudCBhIHN0YXRlbWVudCB0aGF0IG1heSBiZSBpbml0aWFsaXppbmcgYW4gb3B0aW9uYWwgcGFyYW1ldGVyXG4gKiBAcGFyYW0gcGFyYW1ldGVycyB0aGUgY29sbGVjdGlvbiBvZiBwYXJhbWV0ZXJzIHRoYXQgd2VyZSBmb3VuZCBpbiB0aGUgZnVuY3Rpb24gZGVmaW5pdGlvblxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgc3RhdGVtZW50IHdhcyBhIHBhcmFtZXRlciBpbml0aWFsaXplclxuICovXG5mdW5jdGlvbiBjYXB0dXJlUGFyYW1Jbml0aWFsaXplcihzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCwgcGFyYW1ldGVyczogUGFyYW1ldGVyW10pIHtcbiAgaWYgKHRzLmlzSWZTdGF0ZW1lbnQoc3RhdGVtZW50KSAmJiBpc1VuZGVmaW5lZENvbXBhcmlzb24oc3RhdGVtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc0Jsb2NrKHN0YXRlbWVudC50aGVuU3RhdGVtZW50KSAmJiBzdGF0ZW1lbnQudGhlblN0YXRlbWVudC5zdGF0ZW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNvbnN0IGlmU3RhdGVtZW50Q29tcGFyaXNvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uOyAgICAgICAgICAgLy8gKGFyZyA9PT0gdm9pZCAwKVxuICAgIGNvbnN0IHRoZW5TdGF0ZW1lbnQgPSBzdGF0ZW1lbnQudGhlblN0YXRlbWVudC5zdGF0ZW1lbnRzWzBdOyAgLy8gYXJnID0gaW5pdGlhbGl6ZXI7XG4gICAgaWYgKGlzQXNzaWdubWVudFN0YXRlbWVudCh0aGVuU3RhdGVtZW50KSkge1xuICAgICAgY29uc3QgY29tcGFyaXNvbk5hbWUgPSBpZlN0YXRlbWVudENvbXBhcmlzb24ubGVmdC50ZXh0O1xuICAgICAgY29uc3QgYXNzaWdubWVudE5hbWUgPSB0aGVuU3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdC50ZXh0O1xuICAgICAgaWYgKGNvbXBhcmlzb25OYW1lID09PSBhc3NpZ25tZW50TmFtZSkge1xuICAgICAgICBjb25zdCBwYXJhbWV0ZXIgPSBwYXJhbWV0ZXJzLmZpbmQocCA9PiBwLm5hbWUgPT09IGNvbXBhcmlzb25OYW1lKTtcbiAgICAgICAgaWYgKHBhcmFtZXRlcikge1xuICAgICAgICAgIHBhcmFtZXRlci5pbml0aWFsaXplciA9IHRoZW5TdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodDtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkQ29tcGFyaXNvbihleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogZXhwcmVzc2lvbiBpcyB0cy5FeHByZXNzaW9uJlxuICAgIHtsZWZ0OiB0cy5JZGVudGlmaWVyLCByaWdodDogdHMuRXhwcmVzc2lvbn0ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKGV4cHJlc3Npb24pICYmXG4gICAgICBleHByZXNzaW9uLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNFcXVhbHNUb2tlbiAmJlxuICAgICAgdHMuaXNWb2lkRXhwcmVzc2lvbihleHByZXNzaW9uLnJpZ2h0KSAmJiB0cy5pc0lkZW50aWZpZXIoZXhwcmVzc2lvbi5sZWZ0KTtcbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGdpdmVuIGBjbGFzc1N5bWJvbGAgdG8gZmluZCB0aGUgSUlGRSB3cmFwcGVyIGZ1bmN0aW9uLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gbWF5IGFjY2VwdCBhIGBfc3VwZXJgIGFyZ3VtZW50IGlmIHRoZXJlIGlzIGEgYmFzZSBjbGFzcy5cbiAqXG4gKiBgYGBcbiAqIHZhciBUZXN0Q2xhc3MgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICogICBfX2V4dGVuZHMoVGVzdENsYXNzLCBfc3VwZXIpO1xuICogICBmdW5jdGlvbiBUZXN0Q2xhc3MoKSB7fVxuICogICByZXR1cm4gVGVzdENsYXNzO1xuICogfShCYXNlQ2xhc3MpKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaWlmZSB3cmFwcGVyIGZ1bmN0aW9uIHdlIHdhbnQgdG8gZ2V0LlxuICogQHJldHVybnMgdGhlIElJRkUgZnVuY3Rpb24gb3IgbnVsbCBpZiBpdCBjb3VsZCBub3QgYmUgcGFyc2VkLlxuICovXG5mdW5jdGlvbiBnZXRJaWZlRm4oY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQpOiB0cy5GdW5jdGlvbkV4cHJlc3Npb258bnVsbCB7XG4gIGlmIChjbGFzc1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBpbm5lckRlY2xhcmF0aW9uID0gY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24udmFsdWVEZWNsYXJhdGlvbjtcbiAgY29uc3QgaWlmZUJvZHkgPSBpbm5lckRlY2xhcmF0aW9uLnBhcmVudDtcbiAgaWYgKCF0cy5pc0Jsb2NrKGlpZmVCb2R5KSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgaWlmZVdyYXBwZXIgPSBpaWZlQm9keS5wYXJlbnQ7XG4gIHJldHVybiBpaWZlV3JhcHBlciAmJiB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihpaWZlV3JhcHBlcikgPyBpaWZlV3JhcHBlciA6IG51bGw7XG59XG4iXX0=