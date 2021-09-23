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
        define("@angular/compiler-cli/ngcc/src/host/esm5_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/host/esm2015_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Esm5ReflectionHost = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var esm2015_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm2015_host");
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
    var Esm5ReflectionHost = /** @class */ (function (_super) {
        (0, tslib_1.__extends)(Esm5ReflectionHost, _super);
        function Esm5ReflectionHost() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Esm5ReflectionHost.prototype.getBaseClassExpression = function (clazz) {
            var superBaseClassExpression = _super.prototype.getBaseClassExpression.call(this, clazz);
            if (superBaseClassExpression !== null) {
                return superBaseClassExpression;
            }
            var iife = getIifeFn(this.getClassSymbol(clazz));
            if (iife === null)
                return null;
            if (iife.parameters.length !== 1 || !isSuperIdentifier(iife.parameters[0].name)) {
                return null;
            }
            if (!ts.isCallExpression(iife.parent)) {
                return null;
            }
            return iife.parent.arguments[0];
        };
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
        Esm5ReflectionHost.prototype.getDeclarationOfIdentifier = function (id) {
            var declaration = _super.prototype.getDeclarationOfIdentifier.call(this, id);
            if (declaration === null) {
                var nonEmittedNorImportedTsHelperDeclaration = (0, utils_1.getTsHelperFnFromIdentifier)(id);
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
            var block = declaration.node.parent.parent.parent;
            var aliasSymbol = this.checker.getSymbolAtLocation(declaration.node.name);
            for (var i = 0; i < block.statements.length; i++) {
                var statement = block.statements[i];
                // Looking for statement that looks like: `AliasedVariable = OriginalVariable;`
                if ((0, esm2015_host_1.isAssignmentStatement)(statement) && ts.isIdentifier(statement.expression.left) &&
                    ts.isIdentifier(statement.expression.right) &&
                    this.checker.getSymbolAtLocation(statement.expression.left) === aliasSymbol) {
                    return this.getDeclarationOfIdentifier(statement.expression.right);
                }
            }
            return declaration;
        };
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
        Esm5ReflectionHost.prototype.getDefinitionOfFunction = function (node) {
            var definition = _super.prototype.getDefinitionOfFunction.call(this, node);
            if (definition === null) {
                return null;
            }
            // Filter out and capture parameter initializers
            if (definition.body !== null) {
                var lookingForInitializers_1 = true;
                var statements = definition.body.filter(function (s) {
                    lookingForInitializers_1 =
                        lookingForInitializers_1 && captureParamInitializer(s, definition.parameters);
                    // If we are no longer looking for parameter initializers then we include this statement
                    return !lookingForInitializers_1;
                });
                definition.body = statements;
            }
            return definition;
        };
        /**
         * Check whether a `Declaration` corresponds with a known declaration, such as a TypeScript helper
         * function, and set its `known` property to the appropriate `KnownDeclaration`.
         *
         * @param decl The `Declaration` to check.
         * @return The passed in `Declaration` (potentially enhanced with a `KnownDeclaration`).
         */
        Esm5ReflectionHost.prototype.detectKnownDeclaration = function (decl) {
            decl = _super.prototype.detectKnownDeclaration.call(this, decl);
            // Also check for TS helpers
            if (decl.known === null && decl.node !== null) {
                decl.known = (0, utils_1.getTsHelperFnFromDeclaration)(decl.node);
            }
            return decl;
        };
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
        Esm5ReflectionHost.prototype.getClassSymbolFromInnerDeclaration = function (declaration) {
            var classSymbol = _super.prototype.getClassSymbolFromInnerDeclaration.call(this, declaration);
            if (classSymbol !== undefined) {
                return classSymbol;
            }
            if (!(0, reflection_1.isNamedFunctionDeclaration)(declaration)) {
                return undefined;
            }
            var outerNode = (0, esm2015_host_1.getOuterNodeFromInnerDeclaration)(declaration);
            if (outerNode === null || !(0, utils_1.hasNameIdentifier)(outerNode)) {
                return undefined;
            }
            return this.createClassSymbol(outerNode.name, declaration);
        };
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
        Esm5ReflectionHost.prototype.getConstructorParameterDeclarations = function (classSymbol) {
            var constructor = classSymbol.implementation.valueDeclaration;
            if (!ts.isFunctionDeclaration(constructor))
                return null;
            if (constructor.parameters.length > 0) {
                return Array.from(constructor.parameters);
            }
            if (this.isSynthesizedConstructor(constructor)) {
                return null;
            }
            return [];
        };
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
        Esm5ReflectionHost.prototype.getParamInfoFromStaticProperty = function (paramDecoratorsProperty) {
            var _this = this;
            var paramDecorators = (0, esm2015_host_1.getPropertyValueFromSymbol)(paramDecoratorsProperty);
            // The decorators array may be wrapped in a function. If so unwrap it.
            var returnStatement = getReturnStatement(paramDecorators);
            var expression = returnStatement ? returnStatement.expression : paramDecorators;
            if (expression && ts.isArrayLiteralExpression(expression)) {
                var elements = expression.elements;
                return elements.map(reflectArrayElement).map(function (paramInfo) {
                    var typeExpression = paramInfo && paramInfo.has('type') ? paramInfo.get('type') : null;
                    var decoratorInfo = paramInfo && paramInfo.has('decorators') ? paramInfo.get('decorators') : null;
                    var decorators = decoratorInfo && _this.reflectDecorators(decoratorInfo);
                    return { typeExpression: typeExpression, decorators: decorators };
                });
            }
            else if (paramDecorators !== undefined) {
                this.logger.warn('Invalid constructor parameter decorator in ' + paramDecorators.getSourceFile().fileName +
                    ':\n', paramDecorators.getText());
            }
            return null;
        };
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
        Esm5ReflectionHost.prototype.reflectMembers = function (symbol, decorators, isStatic) {
            var node = symbol.valueDeclaration || symbol.declarations && symbol.declarations[0];
            var propertyDefinition = node && getPropertyDefinition(node);
            if (propertyDefinition) {
                var members_1 = [];
                if (propertyDefinition.setter) {
                    members_1.push({
                        node: node,
                        implementation: propertyDefinition.setter,
                        kind: reflection_1.ClassMemberKind.Setter,
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
                    members_1.push({
                        node: node,
                        implementation: propertyDefinition.getter,
                        kind: reflection_1.ClassMemberKind.Getter,
                        type: null,
                        name: symbol.name,
                        nameNode: null,
                        value: null,
                        isStatic: isStatic || false,
                        decorators: decorators || [],
                    });
                }
                return members_1;
            }
            var members = _super.prototype.reflectMembers.call(this, symbol, decorators, isStatic);
            members && members.forEach(function (member) {
                if (member && member.kind === reflection_1.ClassMemberKind.Method && member.isStatic && member.node &&
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
        };
        /**
         * Find statements related to the given class that may contain calls to a helper.
         *
         * In ESM5 code the helper calls are hidden inside the class's IIFE.
         *
         * @param classSymbol the class whose helper calls we are interested in. We expect this symbol
         * to reference the inner identifier inside the IIFE.
         * @returns an array of statements that may contain helper calls.
         */
        Esm5ReflectionHost.prototype.getStatementsForClass = function (classSymbol) {
            var classDeclarationParent = classSymbol.implementation.valueDeclaration.parent;
            return ts.isBlock(classDeclarationParent) ? Array.from(classDeclarationParent.statements) : [];
        };
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
        Esm5ReflectionHost.prototype.isSynthesizedConstructor = function (constructor) {
            if (!constructor.body)
                return false;
            var firstStatement = constructor.body.statements[0];
            if (!firstStatement)
                return false;
            return this.isSynthesizedSuperThisAssignment(firstStatement) ||
                this.isSynthesizedSuperReturnStatement(firstStatement);
        };
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
        Esm5ReflectionHost.prototype.isSynthesizedSuperThisAssignment = function (statement) {
            if (!ts.isVariableStatement(statement))
                return false;
            var variableDeclarations = statement.declarationList.declarations;
            if (variableDeclarations.length !== 1)
                return false;
            var variableDeclaration = variableDeclarations[0];
            if (!ts.isIdentifier(variableDeclaration.name) ||
                !variableDeclaration.name.text.startsWith('_this'))
                return false;
            var initializer = variableDeclaration.initializer;
            if (!initializer)
                return false;
            return this.isSynthesizedDefaultSuperCall(initializer);
        };
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
        Esm5ReflectionHost.prototype.isSynthesizedSuperReturnStatement = function (statement) {
            if (!ts.isReturnStatement(statement))
                return false;
            var expression = statement.expression;
            if (!expression)
                return false;
            return this.isSynthesizedDefaultSuperCall(expression);
        };
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
        Esm5ReflectionHost.prototype.isSynthesizedDefaultSuperCall = function (expression) {
            if (!isBinaryExpr(expression, ts.SyntaxKind.BarBarToken))
                return false;
            if (expression.right.kind !== ts.SyntaxKind.ThisKeyword)
                return false;
            var left = expression.left;
            if (isBinaryExpr(left, ts.SyntaxKind.AmpersandAmpersandToken)) {
                return isSuperNotNull(left.left) && this.isSuperApplyCall(left.right);
            }
            else {
                return this.isSuperApplyCall(left);
            }
        };
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
        Esm5ReflectionHost.prototype.isSuperApplyCall = function (expression) {
            if (!ts.isCallExpression(expression) || expression.arguments.length !== 2)
                return false;
            var targetFn = expression.expression;
            if (!ts.isPropertyAccessExpression(targetFn))
                return false;
            if (!isSuperIdentifier(targetFn.expression))
                return false;
            if (targetFn.name.text !== 'apply')
                return false;
            var thisArgument = expression.arguments[0];
            if (thisArgument.kind !== ts.SyntaxKind.ThisKeyword)
                return false;
            var argumentsExpr = expression.arguments[1];
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
        };
        /**
         * Determines if the provided expression is one of the following call expressions:
         *
         * 1. `__spread(arguments)`
         * 2. `__spreadArray([], __read(arguments))`
         * 3. `__spreadArray([], __read(arguments), false)`
         *
         * The tslib helpers may have been emitted inline as in the above example, or they may be read
         * from a namespace import.
         */
        Esm5ReflectionHost.prototype.isSpreadArgumentsExpression = function (expression) {
            var call = this.extractKnownHelperCall(expression);
            if (call === null) {
                return false;
            }
            if (call.helper === reflection_1.KnownDeclaration.TsHelperSpread) {
                // `__spread(arguments)`
                return call.args.length === 1 && isArgumentsIdentifier(call.args[0]);
            }
            else if (call.helper === reflection_1.KnownDeclaration.TsHelperSpreadArray) {
                // `__spreadArray([], __read(arguments), false)`
                if (call.args.length !== 2 && call.args.length !== 3) {
                    return false;
                }
                var firstArg = call.args[0];
                if (!ts.isArrayLiteralExpression(firstArg) || firstArg.elements.length !== 0) {
                    return false;
                }
                var secondArg = this.extractKnownHelperCall(call.args[1]);
                if (secondArg === null || secondArg.helper !== reflection_1.KnownDeclaration.TsHelperRead) {
                    return false;
                }
                return secondArg.args.length === 1 && isArgumentsIdentifier(secondArg.args[0]);
            }
            else {
                return false;
            }
        };
        /**
         * Inspects the provided expression and determines if it corresponds with a known helper function
         * as receiver expression.
         */
        Esm5ReflectionHost.prototype.extractKnownHelperCall = function (expression) {
            if (!ts.isCallExpression(expression)) {
                return null;
            }
            var receiverExpr = expression.expression;
            // The helper could be globally available, or accessed through a namespaced import. Hence we
            // support a property access here as long as it resolves to the actual known TypeScript helper.
            var receiver = null;
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
        };
        return Esm5ReflectionHost;
    }(esm2015_host_1.Esm2015ReflectionHost));
    exports.Esm5ReflectionHost = Esm5ReflectionHost;
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
        var fn = node.expression;
        if (!ts.isPropertyAccessExpression(fn) || !ts.isIdentifier(fn.expression) ||
            fn.expression.text !== 'Object' || fn.name.text !== 'defineProperty')
            return null;
        var descriptor = node.arguments[2];
        if (!descriptor || !ts.isObjectLiteralExpression(descriptor))
            return null;
        return {
            setter: readPropertyFunctionExpression(descriptor, 'set'),
            getter: readPropertyFunctionExpression(descriptor, 'get'),
        };
    }
    function readPropertyFunctionExpression(object, name) {
        var property = object.properties.find(function (p) {
            return ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === name;
        });
        return property && ts.isFunctionExpression(property.initializer) && property.initializer || null;
    }
    function getReturnStatement(declaration) {
        return declaration && ts.isFunctionExpression(declaration) ?
            declaration.body.statements.find(ts.isReturnStatement) :
            undefined;
    }
    function reflectArrayElement(element) {
        return ts.isObjectLiteralExpression(element) ? (0, reflection_1.reflectObjectLiteral)(element) : null;
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
            var ifStatementComparison = statement.expression; // (arg === void 0)
            var thenStatement = statement.thenStatement.statements[0]; // arg = initializer;
            if ((0, esm2015_host_1.isAssignmentStatement)(thenStatement)) {
                var comparisonName_1 = ifStatementComparison.left.text;
                var assignmentName = thenStatement.expression.left.text;
                if (comparisonName_1 === assignmentName) {
                    var parameter = parameters.find(function (p) { return p.name === comparisonName_1; });
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
        var innerDeclaration = classSymbol.implementation.valueDeclaration;
        var iifeBody = innerDeclaration.parent;
        if (!ts.isBlock(iifeBody)) {
            return null;
        }
        var iifeWrapper = iifeBody.parent;
        return iifeWrapper && ts.isFunctionExpression(iifeWrapper) ? iifeWrapper : null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMseUVBQXlPO0lBQ3pPLDhEQUFzRztJQUV0RyxpRkFBcUo7SUFJcko7Ozs7Ozs7Ozs7Ozs7Ozs7O09BaUJHO0lBQ0g7UUFBd0MsbURBQXFCO1FBQTdEOztRQThsQkEsQ0FBQztRQTdsQlUsbURBQXNCLEdBQS9CLFVBQWdDLEtBQXVCO1lBQ3JELElBQU0sd0JBQXdCLEdBQUcsaUJBQU0sc0JBQXNCLFlBQUMsS0FBSyxDQUFDLENBQUM7WUFDckUsSUFBSSx3QkFBd0IsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JDLE9BQU8sd0JBQXdCLENBQUM7YUFDakM7WUFFRCxJQUFNLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ25ELElBQUksSUFBSSxLQUFLLElBQUk7Z0JBQUUsT0FBTyxJQUFJLENBQUM7WUFFL0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMvRSxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3JDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFFRDs7Ozs7Ozs7Ozs7Ozs7OztXQWdCRztR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LGdCQUFnQixDQUFDLE1BQU0sQ0FBQztRQUN6QyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN6QixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsSUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUNwQyxPQUFPLFdBQVcsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ2xGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgRGVjbGFyYXRpb24sIERlY2xhcmF0aW9uS2luZCwgRGVjb3JhdG9yLCBGdW5jdGlvbkRlZmluaXRpb24sIGlzTmFtZWRGdW5jdGlvbkRlY2xhcmF0aW9uLCBLbm93bkRlY2xhcmF0aW9uLCBQYXJhbWV0ZXIsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge2dldFRzSGVscGVyRm5Gcm9tRGVjbGFyYXRpb24sIGdldFRzSGVscGVyRm5Gcm9tSWRlbnRpZmllciwgaGFzTmFtZUlkZW50aWZpZXJ9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtFc20yMDE1UmVmbGVjdGlvbkhvc3QsIGdldE91dGVyTm9kZUZyb21Jbm5lckRlY2xhcmF0aW9uLCBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbCwgaXNBc3NpZ25tZW50U3RhdGVtZW50LCBQYXJhbUluZm99IGZyb20gJy4vZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7TmdjY0NsYXNzU3ltYm9sfSBmcm9tICcuL25nY2NfaG9zdCc7XG5cblxuLyoqXG4gKiBFU001IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCBJSUZFIGZ1bmN0aW9ucyB0aGF0IGFjdCBsaWtlIGNsYXNzZXMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogdmFyIENvbW1vbk1vZHVsZSA9IChmdW5jdGlvbiAoKSB7XG4gKiAgZnVuY3Rpb24gQ29tbW9uTW9kdWxlKCkge1xuICogIH1cbiAqICBDb21tb25Nb2R1bGUuZGVjb3JhdG9ycyA9IFsgLi4uIF07XG4gKiAgcmV0dXJuIENvbW1vbk1vZHVsZTtcbiAqIGBgYFxuICpcbiAqICogXCJDbGFzc2VzXCIgYXJlIGRlY29yYXRlZCBpZiB0aGV5IGhhdmUgYSBzdGF0aWMgcHJvcGVydHkgY2FsbGVkIGBkZWNvcmF0b3JzYC5cbiAqICogTWVtYmVycyBhcmUgZGVjb3JhdGVkIGlmIHRoZXJlIGlzIGEgbWF0Y2hpbmcga2V5IG9uIGEgc3RhdGljIHByb3BlcnR5XG4gKiAgIGNhbGxlZCBgcHJvcERlY29yYXRvcnNgLlxuICogKiBDb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIGRlY29yYXRvcnMgYXJlIGZvdW5kIG9uIGFuIG9iamVjdCByZXR1cm5lZCBmcm9tXG4gKiAgIGEgc3RhdGljIG1ldGhvZCBjYWxsZWQgYGN0b3JQYXJhbWV0ZXJzYC5cbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBFc201UmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBFc20yMDE1UmVmbGVjdGlvbkhvc3Qge1xuICBvdmVycmlkZSBnZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBzdXBlckJhc2VDbGFzc0V4cHJlc3Npb24gPSBzdXBlci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6KTtcbiAgICBpZiAoc3VwZXJCYXNlQ2xhc3NFeHByZXNzaW9uICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gc3VwZXJCYXNlQ2xhc3NFeHByZXNzaW9uO1xuICAgIH1cblxuICAgIGNvbnN0IGlpZmUgPSBnZXRJaWZlRm4odGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eikpO1xuICAgIGlmIChpaWZlID09PSBudWxsKSByZXR1cm4gbnVsbDtcblxuICAgIGlmIChpaWZlLnBhcmFtZXRlcnMubGVuZ3RoICE9PSAxIHx8ICFpc1N1cGVySWRlbnRpZmllcihpaWZlLnBhcmFtZXRlcnNbMF0ubmFtZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihpaWZlLnBhcmVudCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBpaWZlLnBhcmVudC5hcmd1bWVudHNbMF07XG4gIH1cblxuICAvKipcbiAgICogVHJhY2UgYW4gaWRlbnRpZmllciB0byBpdHMgZGVjbGFyYXRpb24sIGlmIHBvc3NpYmxlLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBhdHRlbXB0cyB0byByZXNvbHZlIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZ2l2ZW4gaWRlbnRpZmllciwgdHJhY2luZyBiYWNrIHRocm91Z2hcbiAgICogaW1wb3J0cyBhbmQgcmUtZXhwb3J0cyB1bnRpbCB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gc3RhdGVtZW50IGlzIGZvdW5kLiBBIGBEZWNsYXJhdGlvbmBcbiAgICogb2JqZWN0IGlzIHJldHVybmVkIGlmIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBpcyBmb3VuZCwgb3IgYG51bGxgIGlzIHJldHVybmVkIG90aGVyd2lzZS5cbiAgICpcbiAgICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUuXG4gICAqIElmIHdlIGFyZSBsb29raW5nIGZvciB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGlkZW50aWZpZXIgb2YgdGhlIGlubmVyIGZ1bmN0aW9uIGV4cHJlc3Npb24sIHdlXG4gICAqIHdpbGwgZ2V0IGhvbGQgb2YgdGhlIG91dGVyIFwiY2xhc3NcIiB2YXJpYWJsZSBkZWNsYXJhdGlvbiBhbmQgcmV0dXJuIGl0cyBpZGVudGlmaWVyIGluc3RlYWQuIFNlZVxuICAgKiBgZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24oKWAgZm9yIG1vcmUgaW5mby5cbiAgICpcbiAgICogQHBhcmFtIGlkIGEgVHlwZVNjcmlwdCBgdHMuSWRlbnRpZmllcmAgdG8gdHJhY2UgYmFjayB0byBhIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBtZXRhZGF0YSBhYm91dCB0aGUgYERlY2xhcmF0aW9uYCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYFxuICAgKiBvdGhlcndpc2UuXG4gICAqL1xuICBvdmVycmlkZSBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gc3VwZXIuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQpO1xuXG4gICAgaWYgKGRlY2xhcmF0aW9uID09PSBudWxsKSB7XG4gICAgICBjb25zdCBub25FbWl0dGVkTm9ySW1wb3J0ZWRUc0hlbHBlckRlY2xhcmF0aW9uID0gZ2V0VHNIZWxwZXJGbkZyb21JZGVudGlmaWVyKGlkKTtcbiAgICAgIGlmIChub25FbWl0dGVkTm9ySW1wb3J0ZWRUc0hlbHBlckRlY2xhcmF0aW9uICE9PSBudWxsKSB7XG4gICAgICAgIC8vIE5vIGRlY2xhcmF0aW9uIGNvdWxkIGJlIGZvdW5kIGZvciB0aGlzIGlkZW50aWZpZXIgYW5kIGl0cyBuYW1lIG1hdGNoZXMgYSBrbm93biBUUyBoZWxwZXJcbiAgICAgICAgLy8gZnVuY3Rpb24uIFRoaXMgY2FuIGhhcHBlbiBpZiBhIHBhY2thZ2UgaXMgY29tcGlsZWQgd2l0aCBgbm9FbWl0SGVscGVyczogdHJ1ZWAgYW5kXG4gICAgICAgIC8vIGBpbXBvcnRIZWxwZXJzOiBmYWxzZWAgKHRoZSBkZWZhdWx0KS4gVGhpcyBpcywgZm9yIGV4YW1wbGUsIHRoZSBjYXNlIHdpdGhcbiAgICAgICAgLy8gYEBuYXRpdmVzY3JpcHQvYW5ndWxhckA5LjAuMC1uZXh0LTIwMTktMTEtMTItMTU1NTAwLTAxYC5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBraW5kOiBEZWNsYXJhdGlvbktpbmQuSW5saW5lLFxuICAgICAgICAgIG5vZGU6IGlkLFxuICAgICAgICAgIGtub3duOiBub25FbWl0dGVkTm9ySW1wb3J0ZWRUc0hlbHBlckRlY2xhcmF0aW9uLFxuICAgICAgICAgIHZpYU1vZHVsZTogbnVsbCxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZGVjbGFyYXRpb24gPT09IG51bGwgfHwgZGVjbGFyYXRpb24ubm9kZSA9PT0gbnVsbCB8fCBkZWNsYXJhdGlvbi5rbm93biAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGRlY2xhcmF0aW9uO1xuICAgIH1cblxuICAgIGlmICghdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uLm5vZGUpIHx8IGRlY2xhcmF0aW9uLm5vZGUuaW5pdGlhbGl6ZXIgIT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAvLyBWYXJpYWJsZURlY2xhcmF0aW9uID0+IFZhcmlhYmxlRGVjbGFyYXRpb25MaXN0ID0+IFZhcmlhYmxlU3RhdGVtZW50ID0+IElJRkUgQmxvY2tcbiAgICAgICAgIXRzLmlzQmxvY2soZGVjbGFyYXRpb24ubm9kZS5wYXJlbnQucGFyZW50LnBhcmVudCkpIHtcbiAgICAgIHJldHVybiBkZWNsYXJhdGlvbjtcbiAgICB9XG5cbiAgICAvLyBXZSBtaWdodCBoYXZlIGFuIGFsaWFzIHRvIGFub3RoZXIgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAgLy8gU2VhcmNoIHRoZSBjb250YWluaW5nIGlpZmUgYm9keSBmb3IgaXQuXG4gICAgY29uc3QgYmxvY2sgPSBkZWNsYXJhdGlvbi5ub2RlLnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgIGNvbnN0IGFsaWFzU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZGVjbGFyYXRpb24ubm9kZS5uYW1lKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJsb2NrLnN0YXRlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHN0YXRlbWVudCA9IGJsb2NrLnN0YXRlbWVudHNbaV07XG4gICAgICAvLyBMb29raW5nIGZvciBzdGF0ZW1lbnQgdGhhdCBsb29rcyBsaWtlOiBgQWxpYXNlZFZhcmlhYmxlID0gT3JpZ2luYWxWYXJpYWJsZTtgXG4gICAgICBpZiAoaXNBc3NpZ25tZW50U3RhdGVtZW50KHN0YXRlbWVudCkgJiYgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQpICYmXG4gICAgICAgICAgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLnJpZ2h0KSAmJlxuICAgICAgICAgIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQpID09PSBhbGlhc1N5bWJvbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIGEgZnVuY3Rpb24gZGVjbGFyYXRpb24gdG8gZmluZCB0aGUgcmVsZXZhbnQgbWV0YWRhdGEgYWJvdXQgaXQuXG4gICAqXG4gICAqIEluIEVTTTUgd2UgbmVlZCB0byBkbyBzcGVjaWFsIHdvcmsgd2l0aCBvcHRpb25hbCBhcmd1bWVudHMgdG8gdGhlIGZ1bmN0aW9uLCBzaW5jZSB0aGV5IGdldFxuICAgKiB0aGVpciBvd24gaW5pdGlhbGl6ZXIgc3RhdGVtZW50IHRoYXQgbmVlZHMgdG8gYmUgcGFyc2VkIGFuZCB0aGVuIG5vdCBpbmNsdWRlZCBpbiB0aGUgXCJib2R5XCJcbiAgICogc3RhdGVtZW50cyBvZiB0aGUgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIHRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiB0byBwYXJzZS5cbiAgICogQHJldHVybnMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5vZGUsIHN0YXRlbWVudHMgYW5kIHBhcmFtZXRlcnMgb2YgdGhlIGZ1bmN0aW9uLlxuICAgKi9cbiAgb3ZlcnJpZGUgZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24obm9kZTogdHMuTm9kZSk6IEZ1bmN0aW9uRGVmaW5pdGlvbnxudWxsIHtcbiAgICBjb25zdCBkZWZpbml0aW9uID0gc3VwZXIuZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24obm9kZSk7XG4gICAgaWYgKGRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEZpbHRlciBvdXQgYW5kIGNhcHR1cmUgcGFyYW1ldGVyIGluaXRpYWxpemVyc1xuICAgIGlmIChkZWZpbml0aW9uLmJvZHkgIT09IG51bGwpIHtcbiAgICAgIGxldCBsb29raW5nRm9ySW5pdGlhbGl6ZXJzID0gdHJ1ZTtcbiAgICAgIGNvbnN0IHN0YXRlbWVudHMgPSBkZWZpbml0aW9uLmJvZHkuZmlsdGVyKHMgPT4ge1xuICAgICAgICBsb29raW5nRm9ySW5pdGlhbGl6ZXJzID1cbiAgICAgICAgICAgIGxvb2tpbmdGb3JJbml0aWFsaXplcnMgJiYgY2FwdHVyZVBhcmFtSW5pdGlhbGl6ZXIocywgZGVmaW5pdGlvbi5wYXJhbWV0ZXJzKTtcbiAgICAgICAgLy8gSWYgd2UgYXJlIG5vIGxvbmdlciBsb29raW5nIGZvciBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXJzIHRoZW4gd2UgaW5jbHVkZSB0aGlzIHN0YXRlbWVudFxuICAgICAgICByZXR1cm4gIWxvb2tpbmdGb3JJbml0aWFsaXplcnM7XG4gICAgICB9KTtcbiAgICAgIGRlZmluaXRpb24uYm9keSA9IHN0YXRlbWVudHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmluaXRpb247XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhIGBEZWNsYXJhdGlvbmAgY29ycmVzcG9uZHMgd2l0aCBhIGtub3duIGRlY2xhcmF0aW9uLCBzdWNoIGFzIGEgVHlwZVNjcmlwdCBoZWxwZXJcbiAgICogZnVuY3Rpb24sIGFuZCBzZXQgaXRzIGBrbm93bmAgcHJvcGVydHkgdG8gdGhlIGFwcHJvcHJpYXRlIGBLbm93bkRlY2xhcmF0aW9uYC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2wgVGhlIGBEZWNsYXJhdGlvbmAgdG8gY2hlY2suXG4gICAqIEByZXR1cm4gVGhlIHBhc3NlZCBpbiBgRGVjbGFyYXRpb25gIChwb3RlbnRpYWxseSBlbmhhbmNlZCB3aXRoIGEgYEtub3duRGVjbGFyYXRpb25gKS5cbiAgICovXG4gIG92ZXJyaWRlIGRldGVjdEtub3duRGVjbGFyYXRpb248VCBleHRlbmRzIERlY2xhcmF0aW9uPihkZWNsOiBUKTogVCB7XG4gICAgZGVjbCA9IHN1cGVyLmRldGVjdEtub3duRGVjbGFyYXRpb24oZGVjbCk7XG5cbiAgICAvLyBBbHNvIGNoZWNrIGZvciBUUyBoZWxwZXJzXG4gICAgaWYgKGRlY2wua25vd24gPT09IG51bGwgJiYgZGVjbC5ub2RlICE9PSBudWxsKSB7XG4gICAgICBkZWNsLmtub3duID0gZ2V0VHNIZWxwZXJGbkZyb21EZWNsYXJhdGlvbihkZWNsLm5vZGUpO1xuICAgIH1cblxuICAgIHJldHVybiBkZWNsO1xuICB9XG5cblxuICAvLy8vLy8vLy8vLy8vIFByb3RlY3RlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuICAvKipcbiAgICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUsXG4gICAqIHdob3NlIHZhbHVlIGlzIGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgKHdoaWNoIHJlcHJlc2VudHMgdGhlIGNsYXNzIHRvIHRoZSByZXN0IG9mIHRoZSBwcm9ncmFtKS5cbiAgICogU28gd2UgbWlnaHQgbmVlZCB0byBkaWcgYXJvdW5kIHRvIGdldCBob2xkIG9mIHRoZSBcImNsYXNzXCIgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGV4dHJhY3RzIGEgYE5nY2NDbGFzc1N5bWJvbGAgaWYgYGRlY2xhcmF0aW9uYCBpcyB0aGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gaW5zaWRlXG4gICAqIHRoZSBJSUZFLiBPdGhlcndpc2UsIHVuZGVmaW5lZCBpcyByZXR1cm5lZC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIHRoZSBkZWNsYXJhdGlvbiB3aG9zZSBzeW1ib2wgd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIG9yIGB1bmRlZmluZWRgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIiBvciBoYXMgbm8gc3ltYm9sLlxuICAgKi9cbiAgcHJvdGVjdGVkIG92ZXJyaWRlIGdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLk5vZGUpOiBOZ2NjQ2xhc3NTeW1ib2xcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gc3VwZXIuZ2V0Q2xhc3NTeW1ib2xGcm9tSW5uZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgaWYgKGNsYXNzU3ltYm9sICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBjbGFzc1N5bWJvbDtcbiAgICB9XG5cbiAgICBpZiAoIWlzTmFtZWRGdW5jdGlvbkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBvdXRlck5vZGUgPSBnZXRPdXRlck5vZGVGcm9tSW5uZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgaWYgKG91dGVyTm9kZSA9PT0gbnVsbCB8fCAhaGFzTmFtZUlkZW50aWZpZXIob3V0ZXJOb2RlKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jcmVhdGVDbGFzc1N5bWJvbChvdXRlck5vZGUubmFtZSwgZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIGRlY2xhcmF0aW9ucyBvZiB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIGNsYXNzIGlkZW50aWZpZWQgYnkgaXRzIHN5bWJvbC5cbiAgICpcbiAgICogSW4gRVNNNSwgdGhlcmUgaXMgbm8gXCJjbGFzc1wiIHNvIHRoZSBjb25zdHJ1Y3RvciB0aGF0IHdlIHdhbnQgaXMgYWN0dWFsbHkgdGhlIGlubmVyIGZ1bmN0aW9uXG4gICAqIGRlY2xhcmF0aW9uIGluc2lkZSB0aGUgSUlGRSwgd2hvc2UgcmV0dXJuIHZhbHVlIGlzIGFzc2lnbmVkIHRvIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvblxuICAgKiAodGhhdCByZXByZXNlbnRzIHRoZSBjbGFzcyB0byB0aGUgcmVzdCBvZiB0aGUgcHJvZ3JhbSkuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgc3ltYm9sIG9mIHRoZSBjbGFzcyAoaS5lLiB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24pIHdob3NlXG4gICAqIHBhcmFtZXRlcnMgd2Ugd2FudCB0byBmaW5kLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25gIG9iamVjdHMgcmVwcmVzZW50aW5nIGVhY2ggb2YgdGhlIHBhcmFtZXRlcnMgaW5cbiAgICogdGhlIGNsYXNzJ3MgY29uc3RydWN0b3Igb3IgYG51bGxgIGlmIHRoZXJlIGlzIG5vIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgcHJvdGVjdGVkIG92ZXJyaWRlIGdldENvbnN0cnVjdG9yUGFyYW1ldGVyRGVjbGFyYXRpb25zKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOlxuICAgICAgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25bXXxudWxsIHtcbiAgICBjb25zdCBjb25zdHJ1Y3RvciA9IGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLnZhbHVlRGVjbGFyYXRpb247XG4gICAgaWYgKCF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oY29uc3RydWN0b3IpKSByZXR1cm4gbnVsbDtcblxuICAgIGlmIChjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyxcbiAgICogd2hlcmUgdGhlIGluZm9ybWF0aW9uIGlzIHN0b3JlZCBvbiBhIHN0YXRpYyBtZXRob2Qgb2YgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBJbiB0aGlzIGNhc2UgdGhlIGRlY29yYXRvcnMgYXJlIHN0b3JlZCBpbiB0aGUgYm9keSBvZiBhIG1ldGhvZFxuICAgKiAoYGN0b3JQYXJhdGVtZXJzYCkgYXR0YWNoZWQgdG8gdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdW5saWtlIEVTTTIwMTUgdGhpcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gcmF0aGVyIHRoYW4gYW4gYXJyb3dcbiAgICogZnVuY3Rpb246XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gZnVuY3Rpb24oKSB7IHJldHVybiBbXG4gICAqICAgeyB0eXBlOiBWaWV3Q29udGFpbmVyUmVmLCB9LFxuICAgKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gICAqICAgeyB0eXBlOiBJdGVyYWJsZURpZmZlcnMsIH0sXG4gICAqICAgeyB0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7IHR5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOLF0gfSxdIH0sXG4gICAqIF07IH07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1EZWNvcmF0b3JzUHJvcGVydHkgdGhlIHByb3BlcnR5IHRoYXQgaG9sZHMgdGhlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgdGhlIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIGVhY2ggcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIG92ZXJyaWRlIGdldFBhcmFtSW5mb0Zyb21TdGF0aWNQcm9wZXJ0eShwYXJhbURlY29yYXRvcnNQcm9wZXJ0eTogdHMuU3ltYm9sKTpcbiAgICAgIFBhcmFtSW5mb1tdfG51bGwge1xuICAgIGNvbnN0IHBhcmFtRGVjb3JhdG9ycyA9IGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICAvLyBUaGUgZGVjb3JhdG9ycyBhcnJheSBtYXkgYmUgd3JhcHBlZCBpbiBhIGZ1bmN0aW9uLiBJZiBzbyB1bndyYXAgaXQuXG4gICAgY29uc3QgcmV0dXJuU3RhdGVtZW50ID0gZ2V0UmV0dXJuU3RhdGVtZW50KHBhcmFtRGVjb3JhdG9ycyk7XG4gICAgY29uc3QgZXhwcmVzc2lvbiA9IHJldHVyblN0YXRlbWVudCA/IHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uIDogcGFyYW1EZWNvcmF0b3JzO1xuICAgIGlmIChleHByZXNzaW9uICYmIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihleHByZXNzaW9uKSkge1xuICAgICAgY29uc3QgZWxlbWVudHMgPSBleHByZXNzaW9uLmVsZW1lbnRzO1xuICAgICAgcmV0dXJuIGVsZW1lbnRzLm1hcChyZWZsZWN0QXJyYXlFbGVtZW50KS5tYXAocGFyYW1JbmZvID0+IHtcbiAgICAgICAgY29uc3QgdHlwZUV4cHJlc3Npb24gPSBwYXJhbUluZm8gJiYgcGFyYW1JbmZvLmhhcygndHlwZScpID8gcGFyYW1JbmZvLmdldCgndHlwZScpISA6IG51bGw7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvckluZm8gPVxuICAgICAgICAgICAgcGFyYW1JbmZvICYmIHBhcmFtSW5mby5oYXMoJ2RlY29yYXRvcnMnKSA/IHBhcmFtSW5mby5nZXQoJ2RlY29yYXRvcnMnKSEgOiBudWxsO1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9ySW5mbyAmJiB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvckluZm8pO1xuICAgICAgICByZXR1cm4ge3R5cGVFeHByZXNzaW9uLCBkZWNvcmF0b3JzfTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAocGFyYW1EZWNvcmF0b3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgJ0ludmFsaWQgY29uc3RydWN0b3IgcGFyYW1ldGVyIGRlY29yYXRvciBpbiAnICsgcGFyYW1EZWNvcmF0b3JzLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSArXG4gICAgICAgICAgICAgICc6XFxuJyxcbiAgICAgICAgICBwYXJhbURlY29yYXRvcnMuZ2V0VGV4dCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIGEgc3ltYm9sIGFuZCBleHRyYWN0IHRoZSBtZW1iZXIgaW5mb3JtYXRpb24sIGNvbWJpbmluZyBpdCB3aXRoIHRoZVxuICAgKiBwcm92aWRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24sIGFuZCB3aGV0aGVyIGl0IGlzIGEgc3RhdGljIG1lbWJlci5cbiAgICpcbiAgICogSWYgYSBjbGFzcyBtZW1iZXIgdXNlcyBhY2Nlc3NvcnMgKGUuZyBnZXR0ZXJzIGFuZC9vciBzZXR0ZXJzKSB0aGVuIGl0IGdldHMgZG93bmxldmVsZWRcbiAgICogaW4gRVM1IHRvIGEgc2luZ2xlIGBPYmplY3QuZGVmaW5lUHJvcGVydHkoKWAgY2FsbC4gSW4gdGhhdCBjYXNlIHdlIG11c3QgcGFyc2UgdGhpc1xuICAgKiBjYWxsIHRvIGV4dHJhY3QgdGhlIG9uZSBvciB0d28gQ2xhc3NNZW1iZXIgb2JqZWN0cyB0aGF0IHJlcHJlc2VudCB0aGUgYWNjZXNzb3JzLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBzeW1ib2wgZm9yIHRoZSBtZW1iZXIgdG8gcmVmbGVjdCBvdmVyLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCBvdmVycmlkZSByZWZsZWN0TWVtYmVycyhcbiAgICAgIHN5bWJvbDogdHMuU3ltYm9sLCBkZWNvcmF0b3JzPzogRGVjb3JhdG9yW10sIGlzU3RhdGljPzogYm9vbGVhbik6IENsYXNzTWVtYmVyW118bnVsbCB7XG4gICAgY29uc3Qgbm9kZSA9IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uIHx8IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgICBjb25zdCBwcm9wZXJ0eURlZmluaXRpb24gPSBub2RlICYmIGdldFByb3BlcnR5RGVmaW5pdGlvbihub2RlKTtcbiAgICBpZiAocHJvcGVydHlEZWZpbml0aW9uKSB7XG4gICAgICBjb25zdCBtZW1iZXJzOiBDbGFzc01lbWJlcltdID0gW107XG4gICAgICBpZiAocHJvcGVydHlEZWZpbml0aW9uLnNldHRlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgIG5vZGU6IG5vZGUhLFxuICAgICAgICAgIGltcGxlbWVudGF0aW9uOiBwcm9wZXJ0eURlZmluaXRpb24uc2V0dGVyLFxuICAgICAgICAgIGtpbmQ6IENsYXNzTWVtYmVyS2luZC5TZXR0ZXIsXG4gICAgICAgICAgdHlwZTogbnVsbCxcbiAgICAgICAgICBuYW1lOiBzeW1ib2wubmFtZSxcbiAgICAgICAgICBuYW1lTm9kZTogbnVsbCxcbiAgICAgICAgICB2YWx1ZTogbnVsbCxcbiAgICAgICAgICBpc1N0YXRpYzogaXNTdGF0aWMgfHwgZmFsc2UsXG4gICAgICAgICAgZGVjb3JhdG9yczogZGVjb3JhdG9ycyB8fCBbXSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUHJldmVudCBhdHRhY2hpbmcgdGhlIGRlY29yYXRvcnMgdG8gYSBwb3RlbnRpYWwgZ2V0dGVyLiBJbiBFUzUsIHdlIGNhbid0IHRlbGwgd2hlcmUgdGhlXG4gICAgICAgIC8vIGRlY29yYXRvcnMgd2VyZSBvcmlnaW5hbGx5IGF0dGFjaGVkIHRvLCBob3dldmVyIHdlIG9ubHkgd2FudCB0byBhdHRhY2ggdGhlbSB0byBhIHNpbmdsZVxuICAgICAgICAvLyBgQ2xhc3NNZW1iZXJgIGFzIG90aGVyd2lzZSBuZ3RzYyB3b3VsZCBoYW5kbGUgdGhlIHNhbWUgZGVjb3JhdG9ycyB0d2ljZS5cbiAgICAgICAgZGVjb3JhdG9ycyA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGlmIChwcm9wZXJ0eURlZmluaXRpb24uZ2V0dGVyKSB7XG4gICAgICAgIG1lbWJlcnMucHVzaCh7XG4gICAgICAgICAgbm9kZTogbm9kZSEsXG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHByb3BlcnR5RGVmaW5pdGlvbi5nZXR0ZXIsXG4gICAgICAgICAga2luZDogQ2xhc3NNZW1iZXJLaW5kLkdldHRlcixcbiAgICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgICAgIG5hbWU6IHN5bWJvbC5uYW1lLFxuICAgICAgICAgIG5hbWVOb2RlOiBudWxsLFxuICAgICAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgICAgIGlzU3RhdGljOiBpc1N0YXRpYyB8fCBmYWxzZSxcbiAgICAgICAgICBkZWNvcmF0b3JzOiBkZWNvcmF0b3JzIHx8IFtdLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZW1iZXJzO1xuICAgIH1cblxuICAgIGNvbnN0IG1lbWJlcnMgPSBzdXBlci5yZWZsZWN0TWVtYmVycyhzeW1ib2wsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICBtZW1iZXJzICYmIG1lbWJlcnMuZm9yRWFjaChtZW1iZXIgPT4ge1xuICAgICAgaWYgKG1lbWJlciAmJiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZCAmJiBtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLm5vZGUgJiZcbiAgICAgICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihtZW1iZXIubm9kZSkgJiYgbWVtYmVyLm5vZGUucGFyZW50ICYmXG4gICAgICAgICAgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG1lbWJlci5ub2RlLnBhcmVudCkgJiZcbiAgICAgICAgICB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihtZW1iZXIubm9kZS5wYXJlbnQucmlnaHQpKSB7XG4gICAgICAgIC8vIFJlY29tcHV0ZSB0aGUgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWVtYmVyOlxuICAgICAgICAvLyBFUzUgc3RhdGljIG1ldGhvZHMgYXJlIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBzbyB0aGUgZGVjbGFyYXRpb24gaXMgYWN0dWFsbHkgdGhlXG4gICAgICAgIC8vIGluaXRpYWxpemVyIG9mIHRoZSB2YXJpYWJsZSBhc3NpZ25tZW50XG4gICAgICAgIG1lbWJlci5pbXBsZW1lbnRhdGlvbiA9IG1lbWJlci5ub2RlLnBhcmVudC5yaWdodDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbWVtYmVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgdGhhdCBtYXkgY29udGFpbiBjYWxscyB0byBhIGhlbHBlci5cbiAgICpcbiAgICogSW4gRVNNNSBjb2RlIHRoZSBoZWxwZXIgY2FsbHMgYXJlIGhpZGRlbiBpbnNpZGUgdGhlIGNsYXNzJ3MgSUlGRS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBoZWxwZXIgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uIFdlIGV4cGVjdCB0aGlzIHN5bWJvbFxuICAgKiB0byByZWZlcmVuY2UgdGhlIGlubmVyIGlkZW50aWZpZXIgaW5zaWRlIHRoZSBJSUZFLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBzdGF0ZW1lbnRzIHRoYXQgbWF5IGNvbnRhaW4gaGVscGVyIGNhbGxzLlxuICAgKi9cbiAgcHJvdGVjdGVkIG92ZXJyaWRlIGdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogdHMuU3RhdGVtZW50W10ge1xuICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb25QYXJlbnQgPSBjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uLnBhcmVudDtcbiAgICByZXR1cm4gdHMuaXNCbG9jayhjbGFzc0RlY2xhcmF0aW9uUGFyZW50KSA/IEFycmF5LmZyb20oY2xhc3NEZWNsYXJhdGlvblBhcmVudC5zdGF0ZW1lbnRzKSA6IFtdO1xuICB9XG5cbiAgLy8vLy8vLy8vLy8vLyBIb3N0IFByaXZhdGUgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbiAgLyoqXG4gICAqIEEgY29uc3RydWN0b3IgZnVuY3Rpb24gbWF5IGhhdmUgYmVlbiBcInN5bnRoZXNpemVkXCIgYnkgVHlwZVNjcmlwdCBkdXJpbmcgSmF2YVNjcmlwdCBlbWl0LFxuICAgKiBpbiB0aGUgY2FzZSBubyB1c2VyLWRlZmluZWQgY29uc3RydWN0b3IgZXhpc3RzIGFuZCBlLmcuIHByb3BlcnR5IGluaXRpYWxpemVycyBhcmUgdXNlZC5cbiAgICogVGhvc2UgaW5pdGlhbGl6ZXJzIG5lZWQgdG8gYmUgZW1pdHRlZCBpbnRvIGEgY29uc3RydWN0b3IgaW4gSmF2YVNjcmlwdCwgc28gdGhlIFR5cGVTY3JpcHRcbiAgICogY29tcGlsZXIgZ2VuZXJhdGVzIGEgc3ludGhldGljIGNvbnN0cnVjdG9yLlxuICAgKlxuICAgKiBXZSBuZWVkIHRvIGlkZW50aWZ5IHN1Y2ggY29uc3RydWN0b3JzIGFzIG5nY2MgbmVlZHMgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIGEgY2xhc3MgZGlkXG4gICAqIG9yaWdpbmFsbHkgaGF2ZSBhIGNvbnN0cnVjdG9yIGluIHRoZSBUeXBlU2NyaXB0IHNvdXJjZS4gRm9yIEVTNSwgd2UgY2FuIG5vdCB0ZWxsIGFuXG4gICAqIGVtcHR5IGNvbnN0cnVjdG9yIGFwYXJ0IGZyb20gYSBzeW50aGVzaXplZCBjb25zdHJ1Y3RvciwgYnV0IGZvcnR1bmF0ZWx5IHRoYXQgZG9lcyBub3RcbiAgICogbWF0dGVyIGZvciB0aGUgY29kZSBnZW5lcmF0ZWQgYnkgbmd0c2MuXG4gICAqXG4gICAqIFdoZW4gYSBjbGFzcyBoYXMgYSBzdXBlcmNsYXNzIGhvd2V2ZXIsIGEgc3ludGhlc2l6ZWQgY29uc3RydWN0b3IgbXVzdCBub3QgYmUgY29uc2lkZXJlZFxuICAgKiBhcyBhIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBhcyB0aGF0IHByZXZlbnRzIGEgYmFzZSBmYWN0b3J5IGNhbGwgZnJvbSBiZWluZyBjcmVhdGVkIGJ5XG4gICAqIG5ndHNjLCByZXN1bHRpbmcgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uIHRoYXQgZG9lcyBub3QgaW5qZWN0IHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlXG4gICAqIHN1cGVyY2xhc3MuIEhlbmNlLCB3ZSBpZGVudGlmeSBhIGRlZmF1bHQgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBpbiB0aGUgY29uc3RydWN0b3IgYm9keSxcbiAgICogYWNjb3JkaW5nIHRvIHRoZSBzdHJ1Y3R1cmUgdGhhdCBUeXBlU2NyaXB0J3MgRVMyMDE1IHRvIEVTNSB0cmFuc2Zvcm1lciBnZW5lcmF0ZXMgaW5cbiAgICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuMi4yL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvZXMyMDE1LnRzI0wxMDgyLUwxMDk4XG4gICAqXG4gICAqIEFkZGl0aW9uYWxseSwgd2UgaGFuZGxlIHN5bnRoZXRpYyBkZWxlZ2F0ZSBjb25zdHJ1Y3RvcnMgdGhhdCBhcmUgZW1pdHRlZCB3aGVuIFR5cGVTY3JpcHRcbiAgICogZG93bmxldmVsJ3MgRVMyMDE1IHN5bnRoZXRpY2FsbHkgZ2VuZXJhdGVkIHRvIEVTNS4gVGhlc2UgdmFyeSBzbGlnaHRseSBmcm9tIHRoZSBkZWZhdWx0XG4gICAqIHN0cnVjdHVyZSBtZW50aW9uZWQgYWJvdmUgYmVjYXVzZSB0aGUgRVMyMDE1IG91dHB1dCB1c2VzIGEgc3ByZWFkIG9wZXJhdG9yLCBmb3IgZGVsZWdhdGluZ1xuICAgKiB0byB0aGUgcGFyZW50IGNvbnN0cnVjdG9yLCB0aGF0IGlzIHByZXNlcnZlZCB0aHJvdWdoIGEgVHlwZVNjcmlwdCBoZWxwZXIgaW4gRVM1LiBlLmcuXG4gICAqXG4gICAqIGBgYFxuICAgKiByZXR1cm4gX3N1cGVyLmFwcGx5KHRoaXMsIHRzbGliLl9fc3ByZWFkKGFyZ3VtZW50cykpIHx8IHRoaXM7XG4gICAqIGBgYFxuICAgKlxuICAgKiBvciwgc2luY2UgVHlwZVNjcmlwdCA0LjIgaXQgd291bGQgYmVcbiAgICpcbiAgICogYGBgXG4gICAqIHJldHVybiBfc3VwZXIuYXBwbHkodGhpcywgdHNsaWIuX19zcHJlYWRBcnJheShbXSwgdHNsaWIuX19yZWFkKGFyZ3VtZW50cykpKSB8fCB0aGlzO1xuICAgKiBgYGBcbiAgICpcbiAgICogU3VjaCBjb25zdHJ1Y3RzIGNhbiBiZSBzdGlsbCBjb25zaWRlcmVkIGFzIHN5bnRoZXRpYyBkZWxlZ2F0ZSBjb25zdHJ1Y3RvcnMgYXMgdGhleSBhcmVcbiAgICogdGhlIHByb2R1Y3Qgb2YgYSBjb21tb24gVHlwZVNjcmlwdCB0byBFUzUgc3ludGhldGljIGNvbnN0cnVjdG9yLCBqdXN0IGJlaW5nIGRvd25sZXZlbGVkXG4gICAqIHRvIEVTNSB1c2luZyBgdHNjYC4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy8zODQ1My5cbiAgICpcbiAgICpcbiAgICogQHBhcmFtIGNvbnN0cnVjdG9yIGEgY29uc3RydWN0b3IgZnVuY3Rpb24gdG8gdGVzdFxuICAgKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBjb25zdHJ1Y3RvciBhcHBlYXJzIHRvIGhhdmUgYmVlbiBzeW50aGVzaXplZFxuICAgKi9cbiAgcHJpdmF0ZSBpc1N5bnRoZXNpemVkQ29uc3RydWN0b3IoY29uc3RydWN0b3I6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBpZiAoIWNvbnN0cnVjdG9yLmJvZHkpIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGZpcnN0U3RhdGVtZW50ID0gY29uc3RydWN0b3IuYm9keS5zdGF0ZW1lbnRzWzBdO1xuICAgIGlmICghZmlyc3RTdGF0ZW1lbnQpIHJldHVybiBmYWxzZTtcblxuICAgIHJldHVybiB0aGlzLmlzU3ludGhlc2l6ZWRTdXBlclRoaXNBc3NpZ25tZW50KGZpcnN0U3RhdGVtZW50KSB8fFxuICAgICAgICB0aGlzLmlzU3ludGhlc2l6ZWRTdXBlclJldHVyblN0YXRlbWVudChmaXJzdFN0YXRlbWVudCk7XG4gIH1cblxuICAvKipcbiAgICogSWRlbnRpZmllcyBzeW50aGVzaXplZCBzdXBlciBjYWxscyB3aGljaCBwYXNzLXRocm91Z2ggZnVuY3Rpb24gYXJndW1lbnRzIGRpcmVjdGx5IGFuZCBhcmVcbiAgICogYmVpbmcgYXNzaWduZWQgdG8gYSBjb21tb24gYF90aGlzYCB2YXJpYWJsZS4gVGhlIGZvbGxvd2luZyBwYXR0ZXJucyB3ZSBpbnRlbmQgdG8gbWF0Y2g6XG4gICAqXG4gICAqIDEuIERlbGVnYXRlIGNhbGwgZW1pdHRlZCBieSBUeXBlU2NyaXB0IHdoZW4gaXQgZW1pdHMgRVM1IGRpcmVjdGx5LlxuICAgKiAgIGBgYFxuICAgKiAgIHZhciBfdGhpcyA9IF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICAgKiAgIGBgYFxuICAgKlxuICAgKiAyLiBEZWxlZ2F0ZSBjYWxsIGVtaXR0ZWQgYnkgVHlwZVNjcmlwdCB3aGVuIGl0IGRvd25sZXZlbCdzIEVTMjAxNSB0byBFUzUuXG4gICAqICAgYGBgXG4gICAqICAgdmFyIF90aGlzID0gX3N1cGVyLmFwcGx5KHRoaXMsIHRzbGliLl9fc3ByZWFkKGFyZ3VtZW50cykpIHx8IHRoaXM7XG4gICAqICAgYGBgXG4gICAqICAgb3IgdXNpbmcgdGhlIHN5bnRheCBlbWl0dGVkIHNpbmNlIFR5cGVTY3JpcHQgNC4yOlxuICAgKiAgIGBgYFxuICAgKiAgIHJldHVybiBfc3VwZXIuYXBwbHkodGhpcywgdHNsaWIuX19zcHJlYWRBcnJheShbXSwgdHNsaWIuX19yZWFkKGFyZ3VtZW50cykpKSB8fCB0aGlzO1xuICAgKiAgIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gc3RhdGVtZW50IGEgc3RhdGVtZW50IHRoYXQgbWF5IGJlIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbFxuICAgKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBzdGF0ZW1lbnQgbG9va3MgbGlrZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAgICovXG4gIHByaXZhdGUgaXNTeW50aGVzaXplZFN1cGVyVGhpc0Fzc2lnbm1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBib29sZWFuIHtcbiAgICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgdmFyaWFibGVEZWNsYXJhdGlvbnMgPSBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucztcbiAgICBpZiAodmFyaWFibGVEZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCB2YXJpYWJsZURlY2xhcmF0aW9uID0gdmFyaWFibGVEZWNsYXJhdGlvbnNbMF07XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIodmFyaWFibGVEZWNsYXJhdGlvbi5uYW1lKSB8fFxuICAgICAgICAhdmFyaWFibGVEZWNsYXJhdGlvbi5uYW1lLnRleHQuc3RhcnRzV2l0aCgnX3RoaXMnKSlcbiAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGluaXRpYWxpemVyID0gdmFyaWFibGVEZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgICBpZiAoIWluaXRpYWxpemVyKSByZXR1cm4gZmFsc2U7XG5cbiAgICByZXR1cm4gdGhpcy5pc1N5bnRoZXNpemVkRGVmYXVsdFN1cGVyQ2FsbChpbml0aWFsaXplcik7XG4gIH1cbiAgLyoqXG4gICAqIElkZW50aWZpZXMgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbHMgd2hpY2ggcGFzcy10aHJvdWdoIGZ1bmN0aW9uIGFyZ3VtZW50cyBkaXJlY3RseSBhbmRcbiAgICogYXJlIGJlaW5nIHJldHVybmVkLiBUaGUgZm9sbG93aW5nIHBhdHRlcm5zIGNvcnJlc3BvbmQgdG8gc3ludGhldGljIHN1cGVyIHJldHVybiBjYWxsczpcbiAgICpcbiAgICogMS4gRGVsZWdhdGUgY2FsbCBlbWl0dGVkIGJ5IFR5cGVTY3JpcHQgd2hlbiBpdCBlbWl0cyBFUzUgZGlyZWN0bHkuXG4gICAqICAgYGBgXG4gICAqICAgcmV0dXJuIF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICAgKiAgIGBgYFxuICAgKlxuICAgKiAyLiBEZWxlZ2F0ZSBjYWxsIGVtaXR0ZWQgYnkgVHlwZVNjcmlwdCB3aGVuIGl0IGRvd25sZXZlbCdzIEVTMjAxNSB0byBFUzUuXG4gICAqICAgYGBgXG4gICAqICAgcmV0dXJuIF9zdXBlci5hcHBseSh0aGlzLCB0c2xpYi5fX3NwcmVhZChhcmd1bWVudHMpKSB8fCB0aGlzO1xuICAgKiAgIGBgYFxuICAgKiAgIG9yIHVzaW5nIHRoZSBzeW50YXggZW1pdHRlZCBzaW5jZSBUeXBlU2NyaXB0IDQuMjpcbiAgICogICBgYGBcbiAgICogICByZXR1cm4gX3N1cGVyLmFwcGx5KHRoaXMsIHRzbGliLl9fc3ByZWFkQXJyYXkoW10sIHRzbGliLl9fcmVhZChhcmd1bWVudHMpKSkgfHwgdGhpcztcbiAgICogICBgYGBcbiAgICpcbiAgICogQHBhcmFtIHN0YXRlbWVudCBhIHN0YXRlbWVudCB0aGF0IG1heSBiZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAgICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgc3RhdGVtZW50IGxvb2tzIGxpa2UgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gICAqL1xuICBwcml2YXRlIGlzU3ludGhlc2l6ZWRTdXBlclJldHVyblN0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IGJvb2xlYW4ge1xuICAgIGlmICghdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgZXhwcmVzc2lvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uO1xuICAgIGlmICghZXhwcmVzc2lvbikgcmV0dXJuIGZhbHNlO1xuXG4gICAgcmV0dXJuIHRoaXMuaXNTeW50aGVzaXplZERlZmF1bHRTdXBlckNhbGwoZXhwcmVzc2lvbik7XG4gIH1cblxuICAvKipcbiAgICogSWRlbnRpZmllcyBzeW50aGVzaXplZCBzdXBlciBjYWxscyB3aGljaCBwYXNzLXRocm91Z2ggZnVuY3Rpb24gYXJndW1lbnRzIGRpcmVjdGx5LiBUaGVcbiAgICogc3ludGhldGljIGRlbGVnYXRlIHN1cGVyIGNhbGwgbWF0Y2ggdGhlIGZvbGxvd2luZyBwYXR0ZXJucyB3ZSBpbnRlbmQgdG8gbWF0Y2g6XG4gICAqXG4gICAqIDEuIERlbGVnYXRlIGNhbGwgZW1pdHRlZCBieSBUeXBlU2NyaXB0IHdoZW4gaXQgZW1pdHMgRVM1IGRpcmVjdGx5LlxuICAgKiAgIGBgYFxuICAgKiAgIF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICAgKiAgIGBgYFxuICAgKlxuICAgKiAyLiBEZWxlZ2F0ZSBjYWxsIGVtaXR0ZWQgYnkgVHlwZVNjcmlwdCB3aGVuIGl0IGRvd25sZXZlbCdzIEVTMjAxNSB0byBFUzUuXG4gICAqICAgYGBgXG4gICAqICAgX3N1cGVyLmFwcGx5KHRoaXMsIHRzbGliLl9fc3ByZWFkKGFyZ3VtZW50cykpIHx8IHRoaXM7XG4gICAqICAgYGBgXG4gICAqICAgb3IgdXNpbmcgdGhlIHN5bnRheCBlbWl0dGVkIHNpbmNlIFR5cGVTY3JpcHQgNC4yOlxuICAgKiAgIGBgYFxuICAgKiAgIHJldHVybiBfc3VwZXIuYXBwbHkodGhpcywgdHNsaWIuX19zcHJlYWRBcnJheShbXSwgdHNsaWIuX19yZWFkKGFyZ3VtZW50cykpKSB8fCB0aGlzO1xuICAgKiAgIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZXhwcmVzc2lvbiBhbiBleHByZXNzaW9uIHRoYXQgbWF5IHJlcHJlc2VudCBhIGRlZmF1bHQgc3VwZXIgY2FsbFxuICAgKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBleHByZXNzaW9uIGNvcnJlc3BvbmRzIHdpdGggdGhlIGFib3ZlIGZvcm1cbiAgICovXG4gIHByaXZhdGUgaXNTeW50aGVzaXplZERlZmF1bHRTdXBlckNhbGwoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICAgIGlmICghaXNCaW5hcnlFeHByKGV4cHJlc3Npb24sIHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW4pKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGV4cHJlc3Npb24ucmlnaHQua2luZCAhPT0gdHMuU3ludGF4S2luZC5UaGlzS2V5d29yZCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgbGVmdCA9IGV4cHJlc3Npb24ubGVmdDtcbiAgICBpZiAoaXNCaW5hcnlFeHByKGxlZnQsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4pKSB7XG4gICAgICByZXR1cm4gaXNTdXBlck5vdE51bGwobGVmdC5sZWZ0KSAmJiB0aGlzLmlzU3VwZXJBcHBseUNhbGwobGVmdC5yaWdodCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmlzU3VwZXJBcHBseUNhbGwobGVmdCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gY29ycmVzcG9uZHMgdG8gYSBgc3VwZXJgIGNhbGwgcGFzc2luZyB0aHJvdWdoXG4gICAqIGZ1bmN0aW9uIGFyZ3VtZW50cyB3aXRob3V0IGFueSBtb2RpZmljYXRpb24uIGUuZy5cbiAgICpcbiAgICogYGBgXG4gICAqIF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhpcyBzdHJ1Y3R1cmUgaXMgZ2VuZXJhdGVkIGJ5IFR5cGVTY3JpcHQgd2hlbiB0cmFuc2Zvcm1pbmcgRVMyMDE1IHRvIEVTNSwgc2VlXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL3YzLjIuMi9zcmMvY29tcGlsZXIvdHJhbnNmb3JtZXJzL2VzMjAxNS50cyNMMTE0OC1MMTE2M1xuICAgKlxuICAgKiBBZGRpdGlvbmFsbHksIHdlIGFsc28gaGFuZGxlIGNhc2VzIHdoZXJlIGBhcmd1bWVudHNgIGFyZSB3cmFwcGVkIGJ5IGEgVHlwZVNjcmlwdCBzcHJlYWRcbiAgICogaGVscGVyLlxuICAgKiBUaGlzIGNhbiBoYXBwZW4gaWYgRVMyMDE1IGNsYXNzIG91dHB1dCBjb250YWluIGF1dG8tZ2VuZXJhdGVkIGNvbnN0cnVjdG9ycyBkdWUgdG8gY2xhc3NcbiAgICogbWVtYmVycy4gVGhlIEVTMjAxNSBvdXRwdXQgd2lsbCBiZSB1c2luZyBgc3VwZXIoLi4uYXJndW1lbnRzKWAgdG8gZGVsZWdhdGUgdG8gdGhlIHN1cGVyY2xhc3MsXG4gICAqIGJ1dCBvbmNlIGRvd25sZXZlbGVkIHRvIEVTNSwgdGhlIHNwcmVhZCBvcGVyYXRvciB3aWxsIGJlIHBlcnNpc3RlZCB0aHJvdWdoIGEgVHlwZVNjcmlwdCBzcHJlYWRcbiAgICogaGVscGVyLiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIF9zdXBlci5hcHBseSh0aGlzLCBfX3NwcmVhZChhcmd1bWVudHMpKSB8fCB0aGlzO1xuICAgKiBgYGBcbiAgICpcbiAgICogb3IsIHNpbmNlIFR5cGVTY3JpcHQgNC4yIGl0IHdvdWxkIGJlXG4gICAqXG4gICAqIGBgYFxuICAgKiBfc3VwZXIuYXBwbHkodGhpcywgdHNsaWIuX19zcHJlYWRBcnJheShbXSwgdHNsaWIuX19yZWFkKGFyZ3VtZW50cykpKSB8fCB0aGlzO1xuICAgKiBgYGBcbiAgICpcbiAgICogTW9yZSBkZXRhaWxzIGNhbiBiZSBmb3VuZCBpbjogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9pc3N1ZXMvMzg0NTMuXG4gICAqXG4gICAqIEBwYXJhbSBleHByZXNzaW9uIGFuIGV4cHJlc3Npb24gdGhhdCBtYXkgcmVwcmVzZW50IGEgZGVmYXVsdCBzdXBlciBjYWxsXG4gICAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gY29ycmVzcG9uZHMgd2l0aCB0aGUgYWJvdmUgZm9ybVxuICAgKi9cbiAgcHJpdmF0ZSBpc1N1cGVyQXBwbHlDYWxsKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikgfHwgZXhwcmVzc2lvbi5hcmd1bWVudHMubGVuZ3RoICE9PSAyKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCB0YXJnZXRGbiA9IGV4cHJlc3Npb24uZXhwcmVzc2lvbjtcbiAgICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHRhcmdldEZuKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghaXNTdXBlcklkZW50aWZpZXIodGFyZ2V0Rm4uZXhwcmVzc2lvbikpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGFyZ2V0Rm4ubmFtZS50ZXh0ICE9PSAnYXBwbHknKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCB0aGlzQXJndW1lbnQgPSBleHByZXNzaW9uLmFyZ3VtZW50c1swXTtcbiAgICBpZiAodGhpc0FyZ3VtZW50LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQpIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGFyZ3VtZW50c0V4cHIgPSBleHByZXNzaW9uLmFyZ3VtZW50c1sxXTtcblxuICAgIC8vIElmIHRoZSBzdXBlciBpcyBkaXJlY3RseSBpbnZva2VkIHdpdGggYGFyZ3VtZW50c2AsIHJldHVybiBgdHJ1ZWAuIFRoaXMgcmVwcmVzZW50cyB0aGVcbiAgICAvLyBjb21tb24gVHlwZVNjcmlwdCBvdXRwdXQgd2hlcmUgdGhlIGRlbGVnYXRlIGNvbnN0cnVjdG9yIHN1cGVyIGNhbGwgbWF0Y2hlcyB0aGUgZm9sbG93aW5nXG4gICAgLy8gcGF0dGVybjogYHN1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylgLlxuICAgIGlmIChpc0FyZ3VtZW50c0lkZW50aWZpZXIoYXJndW1lbnRzRXhwcikpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIFRoZSBvdGhlciBzY2VuYXJpbyB3ZSBpbnRlbmQgdG8gZGV0ZWN0OiBUaGUgYGFyZ3VtZW50c2AgdmFyaWFibGUgbWlnaHQgYmUgd3JhcHBlZCB3aXRoIHRoZVxuICAgIC8vIFR5cGVTY3JpcHQgc3ByZWFkIGhlbHBlciAoZWl0aGVyIHRocm91Z2ggdHNsaWIgb3IgaW5saW5lZCkuIFRoaXMgY2FuIGhhcHBlbiBpZiBhbiBleHBsaWNpdFxuICAgIC8vIGRlbGVnYXRlIGNvbnN0cnVjdG9yIHVzZXMgYHN1cGVyKC4uLmFyZ3VtZW50cylgIGluIEVTMjAxNSBhbmQgaXMgZG93bmxldmVsZWQgdG8gRVM1IHVzaW5nXG4gICAgLy8gYC0tZG93bmxldmVsSXRlcmF0aW9uYC5cbiAgICByZXR1cm4gdGhpcy5pc1NwcmVhZEFyZ3VtZW50c0V4cHJlc3Npb24oYXJndW1lbnRzRXhwcik7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyBpZiB0aGUgcHJvdmlkZWQgZXhwcmVzc2lvbiBpcyBvbmUgb2YgdGhlIGZvbGxvd2luZyBjYWxsIGV4cHJlc3Npb25zOlxuICAgKlxuICAgKiAxLiBgX19zcHJlYWQoYXJndW1lbnRzKWBcbiAgICogMi4gYF9fc3ByZWFkQXJyYXkoW10sIF9fcmVhZChhcmd1bWVudHMpKWBcbiAgICogMy4gYF9fc3ByZWFkQXJyYXkoW10sIF9fcmVhZChhcmd1bWVudHMpLCBmYWxzZSlgXG4gICAqXG4gICAqIFRoZSB0c2xpYiBoZWxwZXJzIG1heSBoYXZlIGJlZW4gZW1pdHRlZCBpbmxpbmUgYXMgaW4gdGhlIGFib3ZlIGV4YW1wbGUsIG9yIHRoZXkgbWF5IGJlIHJlYWRcbiAgICogZnJvbSBhIG5hbWVzcGFjZSBpbXBvcnQuXG4gICAqL1xuICBwcml2YXRlIGlzU3ByZWFkQXJndW1lbnRzRXhwcmVzc2lvbihleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gICAgY29uc3QgY2FsbCA9IHRoaXMuZXh0cmFjdEtub3duSGVscGVyQ2FsbChleHByZXNzaW9uKTtcbiAgICBpZiAoY2FsbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChjYWxsLmhlbHBlciA9PT0gS25vd25EZWNsYXJhdGlvbi5Uc0hlbHBlclNwcmVhZCkge1xuICAgICAgLy8gYF9fc3ByZWFkKGFyZ3VtZW50cylgXG4gICAgICByZXR1cm4gY2FsbC5hcmdzLmxlbmd0aCA9PT0gMSAmJiBpc0FyZ3VtZW50c0lkZW50aWZpZXIoY2FsbC5hcmdzWzBdKTtcbiAgICB9IGVsc2UgaWYgKGNhbGwuaGVscGVyID09PSBLbm93bkRlY2xhcmF0aW9uLlRzSGVscGVyU3ByZWFkQXJyYXkpIHtcbiAgICAgIC8vIGBfX3NwcmVhZEFycmF5KFtdLCBfX3JlYWQoYXJndW1lbnRzKSwgZmFsc2UpYFxuICAgICAgaWYgKGNhbGwuYXJncy5sZW5ndGggIT09IDIgJiYgY2FsbC5hcmdzLmxlbmd0aCAhPT0gMykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpcnN0QXJnID0gY2FsbC5hcmdzWzBdO1xuICAgICAgaWYgKCF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZmlyc3RBcmcpIHx8IGZpcnN0QXJnLmVsZW1lbnRzLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHNlY29uZEFyZyA9IHRoaXMuZXh0cmFjdEtub3duSGVscGVyQ2FsbChjYWxsLmFyZ3NbMV0pO1xuICAgICAgaWYgKHNlY29uZEFyZyA9PT0gbnVsbCB8fCBzZWNvbmRBcmcuaGVscGVyICE9PSBLbm93bkRlY2xhcmF0aW9uLlRzSGVscGVyUmVhZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWNvbmRBcmcuYXJncy5sZW5ndGggPT09IDEgJiYgaXNBcmd1bWVudHNJZGVudGlmaWVyKHNlY29uZEFyZy5hcmdzWzBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbnNwZWN0cyB0aGUgcHJvdmlkZWQgZXhwcmVzc2lvbiBhbmQgZGV0ZXJtaW5lcyBpZiBpdCBjb3JyZXNwb25kcyB3aXRoIGEga25vd24gaGVscGVyIGZ1bmN0aW9uXG4gICAqIGFzIHJlY2VpdmVyIGV4cHJlc3Npb24uXG4gICAqL1xuICBwcml2YXRlIGV4dHJhY3RLbm93bkhlbHBlckNhbGwoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6XG4gICAgICB7aGVscGVyOiBLbm93bkRlY2xhcmF0aW9uLCBhcmdzOiB0cy5Ob2RlQXJyYXk8dHMuRXhwcmVzc2lvbj59fG51bGwge1xuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcmVjZWl2ZXJFeHByID0gZXhwcmVzc2lvbi5leHByZXNzaW9uO1xuXG4gICAgLy8gVGhlIGhlbHBlciBjb3VsZCBiZSBnbG9iYWxseSBhdmFpbGFibGUsIG9yIGFjY2Vzc2VkIHRocm91Z2ggYSBuYW1lc3BhY2VkIGltcG9ydC4gSGVuY2Ugd2VcbiAgICAvLyBzdXBwb3J0IGEgcHJvcGVydHkgYWNjZXNzIGhlcmUgYXMgbG9uZyBhcyBpdCByZXNvbHZlcyB0byB0aGUgYWN0dWFsIGtub3duIFR5cGVTY3JpcHQgaGVscGVyLlxuICAgIGxldCByZWNlaXZlcjogRGVjbGFyYXRpb258bnVsbCA9IG51bGw7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihyZWNlaXZlckV4cHIpKSB7XG4gICAgICByZWNlaXZlciA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIocmVjZWl2ZXJFeHByKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHJlY2VpdmVyRXhwcikgJiYgdHMuaXNJZGVudGlmaWVyKHJlY2VpdmVyRXhwci5uYW1lKSkge1xuICAgICAgcmVjZWl2ZXIgPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKHJlY2VpdmVyRXhwci5uYW1lKTtcbiAgICB9XG5cbiAgICBpZiAocmVjZWl2ZXIgPT09IG51bGwgfHwgcmVjZWl2ZXIua25vd24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBoZWxwZXI6IHJlY2VpdmVyLmtub3duLFxuICAgICAgYXJnczogZXhwcmVzc2lvbi5hcmd1bWVudHMsXG4gICAgfTtcbiAgfVxufVxuXG4vLy8vLy8vLy8vLy8vIEludGVybmFsIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGRldGFpbHMgYWJvdXQgcHJvcGVydHkgZGVmaW5pdGlvbnMgdGhhdCB3ZXJlIHNldCB1c2luZyBgT2JqZWN0LmRlZmluZVByb3BlcnR5YC5cbiAqL1xuaW50ZXJmYWNlIFByb3BlcnR5RGVmaW5pdGlvbiB7XG4gIHNldHRlcjogdHMuRnVuY3Rpb25FeHByZXNzaW9ufG51bGw7XG4gIGdldHRlcjogdHMuRnVuY3Rpb25FeHByZXNzaW9ufG51bGw7XG59XG5cbi8qKlxuICogSW4gRVM1LCBnZXR0ZXJzIGFuZCBzZXR0ZXJzIGhhdmUgYmVlbiBkb3dubGV2ZWxlZCBpbnRvIGNhbGwgZXhwcmVzc2lvbnMgb2ZcbiAqIGBPYmplY3QuZGVmaW5lUHJvcGVydHlgLCBzdWNoIGFzXG4gKlxuICogYGBgXG4gKiBPYmplY3QuZGVmaW5lUHJvcGVydHkoQ2xhenoucHJvdG90eXBlLCBcInByb3BlcnR5XCIsIHtcbiAqICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gKiAgICAgICByZXR1cm4gJ3ZhbHVlJztcbiAqICAgfSxcbiAqICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAqICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAqICAgfSxcbiAqICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAqICAgY29uZmlndXJhYmxlOiB0cnVlXG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIFRoaXMgZnVuY3Rpb24gaW5zcGVjdHMgdGhlIGdpdmVuIG5vZGUgdG8gZGV0ZXJtaW5lIGlmIGl0IGNvcnJlc3BvbmRzIHdpdGggc3VjaCBhIGNhbGwsIGFuZCBpZiBzb1xuICogZXh0cmFjdHMgdGhlIGBzZXRgIGFuZCBgZ2V0YCBmdW5jdGlvbiBleHByZXNzaW9ucyBmcm9tIHRoZSBkZXNjcmlwdG9yIG9iamVjdCwgaWYgdGhleSBleGlzdC5cbiAqXG4gKiBAcGFyYW0gbm9kZSBUaGUgbm9kZSB0byBvYnRhaW4gdGhlIHByb3BlcnR5IGRlZmluaXRpb24gZnJvbS5cbiAqIEByZXR1cm5zIFRoZSBwcm9wZXJ0eSBkZWZpbml0aW9uIGlmIHRoZSBub2RlIGNvcnJlc3BvbmRzIHdpdGggYWNjZXNzb3IsIG51bGwgb3RoZXJ3aXNlLlxuICovXG5mdW5jdGlvbiBnZXRQcm9wZXJ0eURlZmluaXRpb24obm9kZTogdHMuTm9kZSk6IFByb3BlcnR5RGVmaW5pdGlvbnxudWxsIHtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCBmbiA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihmbikgfHwgIXRzLmlzSWRlbnRpZmllcihmbi5leHByZXNzaW9uKSB8fFxuICAgICAgZm4uZXhwcmVzc2lvbi50ZXh0ICE9PSAnT2JqZWN0JyB8fCBmbi5uYW1lLnRleHQgIT09ICdkZWZpbmVQcm9wZXJ0eScpXG4gICAgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgZGVzY3JpcHRvciA9IG5vZGUuYXJndW1lbnRzWzJdO1xuICBpZiAoIWRlc2NyaXB0b3IgfHwgIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oZGVzY3JpcHRvcikpIHJldHVybiBudWxsO1xuXG4gIHJldHVybiB7XG4gICAgc2V0dGVyOiByZWFkUHJvcGVydHlGdW5jdGlvbkV4cHJlc3Npb24oZGVzY3JpcHRvciwgJ3NldCcpLFxuICAgIGdldHRlcjogcmVhZFByb3BlcnR5RnVuY3Rpb25FeHByZXNzaW9uKGRlc2NyaXB0b3IsICdnZXQnKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVhZFByb3BlcnR5RnVuY3Rpb25FeHByZXNzaW9uKG9iamVjdDogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24sIG5hbWU6IHN0cmluZykge1xuICBjb25zdCBwcm9wZXJ0eSA9IG9iamVjdC5wcm9wZXJ0aWVzLmZpbmQoXG4gICAgICAocCk6IHAgaXMgdHMuUHJvcGVydHlBc3NpZ25tZW50ID0+XG4gICAgICAgICAgdHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQocCkgJiYgdHMuaXNJZGVudGlmaWVyKHAubmFtZSkgJiYgcC5uYW1lLnRleHQgPT09IG5hbWUpO1xuXG4gIHJldHVybiBwcm9wZXJ0eSAmJiB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihwcm9wZXJ0eS5pbml0aWFsaXplcikgJiYgcHJvcGVydHkuaW5pdGlhbGl6ZXIgfHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0UmV0dXJuU3RhdGVtZW50KGRlY2xhcmF0aW9uOiB0cy5FeHByZXNzaW9ufHVuZGVmaW5lZCk6IHRzLlJldHVyblN0YXRlbWVudHx1bmRlZmluZWQge1xuICByZXR1cm4gZGVjbGFyYXRpb24gJiYgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZGVjbGFyYXRpb24pID9cbiAgICAgIGRlY2xhcmF0aW9uLmJvZHkuc3RhdGVtZW50cy5maW5kKHRzLmlzUmV0dXJuU3RhdGVtZW50KSA6XG4gICAgICB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIHJlZmxlY3RBcnJheUVsZW1lbnQoZWxlbWVudDogdHMuRXhwcmVzc2lvbikge1xuICByZXR1cm4gdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNBcmd1bWVudHNJZGVudGlmaWVyKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihleHByZXNzaW9uKSAmJiBleHByZXNzaW9uLnRleHQgPT09ICdhcmd1bWVudHMnO1xufVxuXG5mdW5jdGlvbiBpc1N1cGVyTm90TnVsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIHJldHVybiBpc0JpbmFyeUV4cHIoZXhwcmVzc2lvbiwgdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc0VxdWFsc1Rva2VuKSAmJlxuICAgICAgaXNTdXBlcklkZW50aWZpZXIoZXhwcmVzc2lvbi5sZWZ0KTtcbn1cblxuZnVuY3Rpb24gaXNCaW5hcnlFeHByKFxuICAgIGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24sIG9wZXJhdG9yOiB0cy5CaW5hcnlPcGVyYXRvcik6IGV4cHJlc3Npb24gaXMgdHMuQmluYXJ5RXhwcmVzc2lvbiB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24oZXhwcmVzc2lvbikgJiYgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IG9wZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBpc1N1cGVySWRlbnRpZmllcihub2RlOiB0cy5Ob2RlKTogYm9vbGVhbiB7XG4gIC8vIFZlcmlmeSB0aGF0IHRoZSBpZGVudGlmaWVyIGlzIHByZWZpeGVkIHdpdGggYF9zdXBlcmAuIFdlIGRvbid0IHRlc3QgZm9yIGVxdWl2YWxlbmNlXG4gIC8vIGFzIFR5cGVTY3JpcHQgbWF5IGhhdmUgc3VmZml4ZWQgdGhlIG5hbWUsIGUuZy4gYF9zdXBlcl8xYCB0byBhdm9pZCBuYW1lIGNvbmZsaWN0cy5cbiAgLy8gUmVxdWlyaW5nIG9ubHkgYSBwcmVmaXggc2hvdWxkIGJlIHN1ZmZpY2llbnRseSBhY2N1cmF0ZS5cbiAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihub2RlKSAmJiBub2RlLnRleHQuc3RhcnRzV2l0aCgnX3N1cGVyJyk7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIHN0YXRlbWVudCB0byBleHRyYWN0IHRoZSBFU001IHBhcmFtZXRlciBpbml0aWFsaXplciBpZiB0aGVyZSBpcyBvbmUuXG4gKiBJZiBvbmUgaXMgZm91bmQsIGFkZCBpdCB0byB0aGUgYXBwcm9wcmlhdGUgcGFyYW1ldGVyIGluIHRoZSBgcGFyYW1ldGVyc2AgY29sbGVjdGlvbi5cbiAqXG4gKiBUaGUgZm9ybSB3ZSBhcmUgbG9va2luZyBmb3IgaXM6XG4gKlxuICogYGBgXG4gKiBpZiAoYXJnID09PSB2b2lkIDApIHsgYXJnID0gaW5pdGlhbGl6ZXI7IH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzdGF0ZW1lbnQgYSBzdGF0ZW1lbnQgdGhhdCBtYXkgYmUgaW5pdGlhbGl6aW5nIGFuIG9wdGlvbmFsIHBhcmFtZXRlclxuICogQHBhcmFtIHBhcmFtZXRlcnMgdGhlIGNvbGxlY3Rpb24gb2YgcGFyYW1ldGVycyB0aGF0IHdlcmUgZm91bmQgaW4gdGhlIGZ1bmN0aW9uIGRlZmluaXRpb25cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCB3YXMgYSBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXJcbiAqL1xuZnVuY3Rpb24gY2FwdHVyZVBhcmFtSW5pdGlhbGl6ZXIoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQsIHBhcmFtZXRlcnM6IFBhcmFtZXRlcltdKSB7XG4gIGlmICh0cy5pc0lmU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgaXNVbmRlZmluZWRDb21wYXJpc29uKHN0YXRlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNCbG9jayhzdGF0ZW1lbnQudGhlblN0YXRlbWVudCkgJiYgc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCBpZlN0YXRlbWVudENvbXBhcmlzb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjsgICAgICAgICAgIC8vIChhcmcgPT09IHZvaWQgMClcbiAgICBjb25zdCB0aGVuU3RhdGVtZW50ID0gc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50c1swXTsgIC8vIGFyZyA9IGluaXRpYWxpemVyO1xuICAgIGlmIChpc0Fzc2lnbm1lbnRTdGF0ZW1lbnQodGhlblN0YXRlbWVudCkpIHtcbiAgICAgIGNvbnN0IGNvbXBhcmlzb25OYW1lID0gaWZTdGF0ZW1lbnRDb21wYXJpc29uLmxlZnQudGV4dDtcbiAgICAgIGNvbnN0IGFzc2lnbm1lbnROYW1lID0gdGhlblN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQudGV4dDtcbiAgICAgIGlmIChjb21wYXJpc29uTmFtZSA9PT0gYXNzaWdubWVudE5hbWUpIHtcbiAgICAgICAgY29uc3QgcGFyYW1ldGVyID0gcGFyYW1ldGVycy5maW5kKHAgPT4gcC5uYW1lID09PSBjb21wYXJpc29uTmFtZSk7XG4gICAgICAgIGlmIChwYXJhbWV0ZXIpIHtcbiAgICAgICAgICBwYXJhbWV0ZXIuaW5pdGlhbGl6ZXIgPSB0aGVuU3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQ7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZENvbXBhcmlzb24oZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGV4cHJlc3Npb24gaXMgdHMuRXhwcmVzc2lvbiZcbiAgICB7bGVmdDogdHMuSWRlbnRpZmllciwgcmlnaHQ6IHRzLkV4cHJlc3Npb259IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihleHByZXNzaW9uKSAmJlxuICAgICAgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW4gJiZcbiAgICAgIHRzLmlzVm9pZEV4cHJlc3Npb24oZXhwcmVzc2lvbi5yaWdodCkgJiYgdHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24ubGVmdCk7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBnaXZlbiBgY2xhc3NTeW1ib2xgIHRvIGZpbmQgdGhlIElJRkUgd3JhcHBlciBmdW5jdGlvbi5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIG1heSBhY2NlcHQgYSBgX3N1cGVyYCBhcmd1bWVudCBpZiB0aGVyZSBpcyBhIGJhc2UgY2xhc3MuXG4gKlxuICogYGBgXG4gKiB2YXIgVGVzdENsYXNzID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAqICAgX19leHRlbmRzKFRlc3RDbGFzcywgX3N1cGVyKTtcbiAqICAgZnVuY3Rpb24gVGVzdENsYXNzKCkge31cbiAqICAgcmV0dXJuIFRlc3RDbGFzcztcbiAqIH0oQmFzZUNsYXNzKSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIGlpZmUgd3JhcHBlciBmdW5jdGlvbiB3ZSB3YW50IHRvIGdldC5cbiAqIEByZXR1cm5zIHRoZSBJSUZFIGZ1bmN0aW9uIG9yIG51bGwgaWYgaXQgY291bGQgbm90IGJlIHBhcnNlZC5cbiAqL1xuZnVuY3Rpb24gZ2V0SWlmZUZuKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkKTogdHMuRnVuY3Rpb25FeHByZXNzaW9ufG51bGwge1xuICBpZiAoY2xhc3NTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgaW5uZXJEZWNsYXJhdGlvbiA9IGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLnZhbHVlRGVjbGFyYXRpb247XG4gIGNvbnN0IGlpZmVCb2R5ID0gaW5uZXJEZWNsYXJhdGlvbi5wYXJlbnQ7XG4gIGlmICghdHMuaXNCbG9jayhpaWZlQm9keSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGlpZmVXcmFwcGVyID0gaWlmZUJvZHkucGFyZW50O1xuICByZXR1cm4gaWlmZVdyYXBwZXIgJiYgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oaWlmZVdyYXBwZXIpID8gaWlmZVdyYXBwZXIgOiBudWxsO1xufVxuIl19