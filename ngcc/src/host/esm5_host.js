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
        tslib_1.__extends(Esm5ReflectionHost, _super);
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
                var nonEmittedNorImportedTsHelperDeclaration = utils_1.getTsHelperFnFromIdentifier(id);
                if (nonEmittedNorImportedTsHelperDeclaration !== null) {
                    // No declaration could be found for this identifier and its name matches a known TS helper
                    // function. This can happen if a package is compiled with `noEmitHelpers: true` and
                    // `importHelpers: false` (the default). This is, for example, the case with
                    // `@nativescript/angular@9.0.0-next-2019-11-12-155500-01`.
                    return {
                        expression: id,
                        known: nonEmittedNorImportedTsHelperDeclaration,
                        node: null,
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
                if (esm2015_host_1.isAssignmentStatement(statement) && ts.isIdentifier(statement.expression.left) &&
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
                decl.known = utils_1.getTsHelperFnFromDeclaration(decl.node);
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
            if (!ts.isFunctionDeclaration(declaration) || !utils_1.hasNameIdentifier(declaration)) {
                return undefined;
            }
            var outerDeclaration = esm2015_host_1.getClassDeclarationFromInnerDeclaration(declaration);
            if (outerDeclaration === null || !utils_1.hasNameIdentifier(outerDeclaration)) {
                return undefined;
            }
            return this.createClassSymbol(outerDeclaration, declaration);
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
            if (isSynthesizedConstructor(constructor)) {
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
            var paramDecorators = esm2015_host_1.getPropertyValueFromSymbol(paramDecoratorsProperty);
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
        return ts.isObjectLiteralExpression(element) ? reflection_1.reflectObjectLiteral(element) : null;
    }
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
     * @param constructor a constructor function to test
     * @returns true if the constructor appears to have been synthesized
     */
    function isSynthesizedConstructor(constructor) {
        if (!constructor.body)
            return false;
        var firstStatement = constructor.body.statements[0];
        if (!firstStatement)
            return false;
        return isSynthesizedSuperThisAssignment(firstStatement) ||
            isSynthesizedSuperReturnStatement(firstStatement);
    }
    /**
     * Identifies a synthesized super call of the form:
     *
     * ```
     * var _this = _super !== null && _super.apply(this, arguments) || this;
     * ```
     *
     * @param statement a statement that may be a synthesized super call
     * @returns true if the statement looks like a synthesized super call
     */
    function isSynthesizedSuperThisAssignment(statement) {
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
        return isSynthesizedDefaultSuperCall(initializer);
    }
    /**
     * Identifies a synthesized super call of the form:
     *
     * ```
     * return _super !== null && _super.apply(this, arguments) || this;
     * ```
     *
     * @param statement a statement that may be a synthesized super call
     * @returns true if the statement looks like a synthesized super call
     */
    function isSynthesizedSuperReturnStatement(statement) {
        if (!ts.isReturnStatement(statement))
            return false;
        var expression = statement.expression;
        if (!expression)
            return false;
        return isSynthesizedDefaultSuperCall(expression);
    }
    /**
     * Tests whether the expression is of the form:
     *
     * ```
     * _super !== null && _super.apply(this, arguments) || this;
     * ```
     *
     * This structure is generated by TypeScript when transforming ES2015 to ES5, see
     * https://github.com/Microsoft/TypeScript/blob/v3.2.2/src/compiler/transformers/es2015.ts#L1148-L1163
     *
     * @param expression an expression that may represent a default super call
     * @returns true if the expression corresponds with the above form
     */
    function isSynthesizedDefaultSuperCall(expression) {
        if (!isBinaryExpr(expression, ts.SyntaxKind.BarBarToken))
            return false;
        if (expression.right.kind !== ts.SyntaxKind.ThisKeyword)
            return false;
        var left = expression.left;
        if (!isBinaryExpr(left, ts.SyntaxKind.AmpersandAmpersandToken))
            return false;
        return isSuperNotNull(left.left) && isSuperApplyCall(left.right);
    }
    function isSuperNotNull(expression) {
        return isBinaryExpr(expression, ts.SyntaxKind.ExclamationEqualsEqualsToken) &&
            isSuperIdentifier(expression.left);
    }
    /**
     * Tests whether the expression is of the form
     *
     * ```
     * _super.apply(this, arguments)
     * ```
     *
     * @param expression an expression that may represent a default super call
     * @returns true if the expression corresponds with the above form
     */
    function isSuperApplyCall(expression) {
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
        var argumentsArgument = expression.arguments[1];
        return ts.isIdentifier(argumentsArgument) && argumentsArgument.text === 'arguments';
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
            if (esm2015_host_1.isAssignmentStatement(thenStatement)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMseUVBQTBLO0lBQzFLLDhEQUFzRztJQUV0RyxpRkFBNEo7SUFJNUo7Ozs7Ozs7Ozs7Ozs7Ozs7O09BaUJHO0lBQ0g7UUFBd0MsOENBQXFCO1FBQTdEOztRQStUQSxDQUFDO1FBOVRDLG1EQUFzQixHQUF0QixVQUF1QixLQUF1QjtZQUM1QyxJQUFNLHdCQUF3QixHQUFHLGlCQUFNLHNCQUFzQixZQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3JFLElBQUksd0JBQXdCLEtBQUssSUFBSSxFQUFFO2dCQUNyQyxPQUFPLHdCQUF3QixDQUFDO2FBQ2pDO1lBRUQsSUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNuRCxJQUFJLElBQUksS0FBSyxJQUFJO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1lBRS9CLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDL0UsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNyQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7V0FnQkc7UUFD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SyxDQUFDO3dCQUN2RCxPQUFPLElBQUksQ0FBQztxQkFDYjtpQkFDRjthQUNGO1NBQ0Y7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxTQUFTLHFCQUFxQixDQUFDLFVBQXlCO1FBRXRELE9BQU8sRUFBRSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQztZQUNwQyxVQUFVLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QjtZQUN2RSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7O09BZUc7SUFDSCxTQUFTLFNBQVMsQ0FBQyxXQUFzQztRQUN2RCxJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUU7WUFDN0IsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELElBQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQztRQUNyRSxJQUFNLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7UUFDekMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDekIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELElBQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDcEMsT0FBTyxXQUFXLElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNsRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBGdW5jdGlvbkRlZmluaXRpb24sIFBhcmFtZXRlciwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7Z2V0VHNIZWxwZXJGbkZyb21EZWNsYXJhdGlvbiwgZ2V0VHNIZWxwZXJGbkZyb21JZGVudGlmaWVyLCBoYXNOYW1lSWRlbnRpZmllcn0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge0VzbTIwMTVSZWZsZWN0aW9uSG9zdCwgZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckRlY2xhcmF0aW9uLCBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbCwgaXNBc3NpZ25tZW50U3RhdGVtZW50LCBQYXJhbUluZm99IGZyb20gJy4vZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7TmdjY0NsYXNzU3ltYm9sfSBmcm9tICcuL25nY2NfaG9zdCc7XG5cblxuLyoqXG4gKiBFU001IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCBJSUZFIGZ1bmN0aW9ucyB0aGF0IGFjdCBsaWtlIGNsYXNzZXMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogdmFyIENvbW1vbk1vZHVsZSA9IChmdW5jdGlvbiAoKSB7XG4gKiAgZnVuY3Rpb24gQ29tbW9uTW9kdWxlKCkge1xuICogIH1cbiAqICBDb21tb25Nb2R1bGUuZGVjb3JhdG9ycyA9IFsgLi4uIF07XG4gKiAgcmV0dXJuIENvbW1vbk1vZHVsZTtcbiAqIGBgYFxuICpcbiAqICogXCJDbGFzc2VzXCIgYXJlIGRlY29yYXRlZCBpZiB0aGV5IGhhdmUgYSBzdGF0aWMgcHJvcGVydHkgY2FsbGVkIGBkZWNvcmF0b3JzYC5cbiAqICogTWVtYmVycyBhcmUgZGVjb3JhdGVkIGlmIHRoZXJlIGlzIGEgbWF0Y2hpbmcga2V5IG9uIGEgc3RhdGljIHByb3BlcnR5XG4gKiAgIGNhbGxlZCBgcHJvcERlY29yYXRvcnNgLlxuICogKiBDb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIGRlY29yYXRvcnMgYXJlIGZvdW5kIG9uIGFuIG9iamVjdCByZXR1cm5lZCBmcm9tXG4gKiAgIGEgc3RhdGljIG1ldGhvZCBjYWxsZWQgYGN0b3JQYXJhbWV0ZXJzYC5cbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBFc201UmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBFc20yMDE1UmVmbGVjdGlvbkhvc3Qge1xuICBnZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBzdXBlckJhc2VDbGFzc0V4cHJlc3Npb24gPSBzdXBlci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6KTtcbiAgICBpZiAoc3VwZXJCYXNlQ2xhc3NFeHByZXNzaW9uICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gc3VwZXJCYXNlQ2xhc3NFeHByZXNzaW9uO1xuICAgIH1cblxuICAgIGNvbnN0IGlpZmUgPSBnZXRJaWZlRm4odGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eikpO1xuICAgIGlmIChpaWZlID09PSBudWxsKSByZXR1cm4gbnVsbDtcblxuICAgIGlmIChpaWZlLnBhcmFtZXRlcnMubGVuZ3RoICE9PSAxIHx8ICFpc1N1cGVySWRlbnRpZmllcihpaWZlLnBhcmFtZXRlcnNbMF0ubmFtZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihpaWZlLnBhcmVudCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBpaWZlLnBhcmVudC5hcmd1bWVudHNbMF07XG4gIH1cblxuICAvKipcbiAgICogVHJhY2UgYW4gaWRlbnRpZmllciB0byBpdHMgZGVjbGFyYXRpb24sIGlmIHBvc3NpYmxlLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBhdHRlbXB0cyB0byByZXNvbHZlIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZ2l2ZW4gaWRlbnRpZmllciwgdHJhY2luZyBiYWNrIHRocm91Z2hcbiAgICogaW1wb3J0cyBhbmQgcmUtZXhwb3J0cyB1bnRpbCB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gc3RhdGVtZW50IGlzIGZvdW5kLiBBIGBEZWNsYXJhdGlvbmBcbiAgICogb2JqZWN0IGlzIHJldHVybmVkIGlmIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBpcyBmb3VuZCwgb3IgYG51bGxgIGlzIHJldHVybmVkIG90aGVyd2lzZS5cbiAgICpcbiAgICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUuXG4gICAqIElmIHdlIGFyZSBsb29raW5nIGZvciB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGlkZW50aWZpZXIgb2YgdGhlIGlubmVyIGZ1bmN0aW9uIGV4cHJlc3Npb24sIHdlXG4gICAqIHdpbGwgZ2V0IGhvbGQgb2YgdGhlIG91dGVyIFwiY2xhc3NcIiB2YXJpYWJsZSBkZWNsYXJhdGlvbiBhbmQgcmV0dXJuIGl0cyBpZGVudGlmaWVyIGluc3RlYWQuIFNlZVxuICAgKiBgZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24oKWAgZm9yIG1vcmUgaW5mby5cbiAgICpcbiAgICogQHBhcmFtIGlkIGEgVHlwZVNjcmlwdCBgdHMuSWRlbnRpZmllcmAgdG8gdHJhY2UgYmFjayB0byBhIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBtZXRhZGF0YSBhYm91dCB0aGUgYERlY2xhcmF0aW9uYCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYFxuICAgKiBvdGhlcndpc2UuXG4gICAqL1xuICBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gc3VwZXIuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQpO1xuXG4gICAgaWYgKGRlY2xhcmF0aW9uID09PSBudWxsKSB7XG4gICAgICBjb25zdCBub25FbWl0dGVkTm9ySW1wb3J0ZWRUc0hlbHBlckRlY2xhcmF0aW9uID0gZ2V0VHNIZWxwZXJGbkZyb21JZGVudGlmaWVyKGlkKTtcbiAgICAgIGlmIChub25FbWl0dGVkTm9ySW1wb3J0ZWRUc0hlbHBlckRlY2xhcmF0aW9uICE9PSBudWxsKSB7XG4gICAgICAgIC8vIE5vIGRlY2xhcmF0aW9uIGNvdWxkIGJlIGZvdW5kIGZvciB0aGlzIGlkZW50aWZpZXIgYW5kIGl0cyBuYW1lIG1hdGNoZXMgYSBrbm93biBUUyBoZWxwZXJcbiAgICAgICAgLy8gZnVuY3Rpb24uIFRoaXMgY2FuIGhhcHBlbiBpZiBhIHBhY2thZ2UgaXMgY29tcGlsZWQgd2l0aCBgbm9FbWl0SGVscGVyczogdHJ1ZWAgYW5kXG4gICAgICAgIC8vIGBpbXBvcnRIZWxwZXJzOiBmYWxzZWAgKHRoZSBkZWZhdWx0KS4gVGhpcyBpcywgZm9yIGV4YW1wbGUsIHRoZSBjYXNlIHdpdGhcbiAgICAgICAgLy8gYEBuYXRpdmVzY3JpcHQvYW5ndWxhckA5LjAuMC1uZXh0LTIwMTktMTEtMTItMTU1NTAwLTAxYC5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBleHByZXNzaW9uOiBpZCxcbiAgICAgICAgICBrbm93bjogbm9uRW1pdHRlZE5vckltcG9ydGVkVHNIZWxwZXJEZWNsYXJhdGlvbixcbiAgICAgICAgICBub2RlOiBudWxsLFxuICAgICAgICAgIHZpYU1vZHVsZTogbnVsbCxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZGVjbGFyYXRpb24gPT09IG51bGwgfHwgZGVjbGFyYXRpb24ubm9kZSA9PT0gbnVsbCB8fCBkZWNsYXJhdGlvbi5rbm93biAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGRlY2xhcmF0aW9uO1xuICAgIH1cblxuICAgIGlmICghdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uLm5vZGUpIHx8IGRlY2xhcmF0aW9uLm5vZGUuaW5pdGlhbGl6ZXIgIT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAvLyBWYXJpYWJsZURlY2xhcmF0aW9uID0+IFZhcmlhYmxlRGVjbGFyYXRpb25MaXN0ID0+IFZhcmlhYmxlU3RhdGVtZW50ID0+IElJRkUgQmxvY2tcbiAgICAgICAgIXRzLmlzQmxvY2soZGVjbGFyYXRpb24ubm9kZS5wYXJlbnQucGFyZW50LnBhcmVudCkpIHtcbiAgICAgIHJldHVybiBkZWNsYXJhdGlvbjtcbiAgICB9XG5cbiAgICAvLyBXZSBtaWdodCBoYXZlIGFuIGFsaWFzIHRvIGFub3RoZXIgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAgLy8gU2VhcmNoIHRoZSBjb250YWluaW5nIGlpZmUgYm9keSBmb3IgaXQuXG4gICAgY29uc3QgYmxvY2sgPSBkZWNsYXJhdGlvbi5ub2RlLnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgIGNvbnN0IGFsaWFzU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZGVjbGFyYXRpb24ubm9kZS5uYW1lKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJsb2NrLnN0YXRlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHN0YXRlbWVudCA9IGJsb2NrLnN0YXRlbWVudHNbaV07XG4gICAgICAvLyBMb29raW5nIGZvciBzdGF0ZW1lbnQgdGhhdCBsb29rcyBsaWtlOiBgQWxpYXNlZFZhcmlhYmxlID0gT3JpZ2luYWxWYXJpYWJsZTtgXG4gICAgICBpZiAoaXNBc3NpZ25tZW50U3RhdGVtZW50KHN0YXRlbWVudCkgJiYgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQpICYmXG4gICAgICAgICAgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLnJpZ2h0KSAmJlxuICAgICAgICAgIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQpID09PSBhbGlhc1N5bWJvbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIGEgZnVuY3Rpb24gZGVjbGFyYXRpb24gdG8gZmluZCB0aGUgcmVsZXZhbnQgbWV0YWRhdGEgYWJvdXQgaXQuXG4gICAqXG4gICAqIEluIEVTTTUgd2UgbmVlZCB0byBkbyBzcGVjaWFsIHdvcmsgd2l0aCBvcHRpb25hbCBhcmd1bWVudHMgdG8gdGhlIGZ1bmN0aW9uLCBzaW5jZSB0aGV5IGdldFxuICAgKiB0aGVpciBvd24gaW5pdGlhbGl6ZXIgc3RhdGVtZW50IHRoYXQgbmVlZHMgdG8gYmUgcGFyc2VkIGFuZCB0aGVuIG5vdCBpbmNsdWRlZCBpbiB0aGUgXCJib2R5XCJcbiAgICogc3RhdGVtZW50cyBvZiB0aGUgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIHRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiB0byBwYXJzZS5cbiAgICogQHJldHVybnMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5vZGUsIHN0YXRlbWVudHMgYW5kIHBhcmFtZXRlcnMgb2YgdGhlIGZ1bmN0aW9uLlxuICAgKi9cbiAgZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24obm9kZTogdHMuTm9kZSk6IEZ1bmN0aW9uRGVmaW5pdGlvbnxudWxsIHtcbiAgICBjb25zdCBkZWZpbml0aW9uID0gc3VwZXIuZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24obm9kZSk7XG4gICAgaWYgKGRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEZpbHRlciBvdXQgYW5kIGNhcHR1cmUgcGFyYW1ldGVyIGluaXRpYWxpemVyc1xuICAgIGlmIChkZWZpbml0aW9uLmJvZHkgIT09IG51bGwpIHtcbiAgICAgIGxldCBsb29raW5nRm9ySW5pdGlhbGl6ZXJzID0gdHJ1ZTtcbiAgICAgIGNvbnN0IHN0YXRlbWVudHMgPSBkZWZpbml0aW9uLmJvZHkuZmlsdGVyKHMgPT4ge1xuICAgICAgICBsb29raW5nRm9ySW5pdGlhbGl6ZXJzID1cbiAgICAgICAgICAgIGxvb2tpbmdGb3JJbml0aWFsaXplcnMgJiYgY2FwdHVyZVBhcmFtSW5pdGlhbGl6ZXIocywgZGVmaW5pdGlvbi5wYXJhbWV0ZXJzKTtcbiAgICAgICAgLy8gSWYgd2UgYXJlIG5vIGxvbmdlciBsb29raW5nIGZvciBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXJzIHRoZW4gd2UgaW5jbHVkZSB0aGlzIHN0YXRlbWVudFxuICAgICAgICByZXR1cm4gIWxvb2tpbmdGb3JJbml0aWFsaXplcnM7XG4gICAgICB9KTtcbiAgICAgIGRlZmluaXRpb24uYm9keSA9IHN0YXRlbWVudHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmluaXRpb247XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhIGBEZWNsYXJhdGlvbmAgY29ycmVzcG9uZHMgd2l0aCBhIGtub3duIGRlY2xhcmF0aW9uLCBzdWNoIGFzIGEgVHlwZVNjcmlwdCBoZWxwZXJcbiAgICogZnVuY3Rpb24sIGFuZCBzZXQgaXRzIGBrbm93bmAgcHJvcGVydHkgdG8gdGhlIGFwcHJvcHJpYXRlIGBLbm93bkRlY2xhcmF0aW9uYC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2wgVGhlIGBEZWNsYXJhdGlvbmAgdG8gY2hlY2suXG4gICAqIEByZXR1cm4gVGhlIHBhc3NlZCBpbiBgRGVjbGFyYXRpb25gIChwb3RlbnRpYWxseSBlbmhhbmNlZCB3aXRoIGEgYEtub3duRGVjbGFyYXRpb25gKS5cbiAgICovXG4gIGRldGVjdEtub3duRGVjbGFyYXRpb248VCBleHRlbmRzIERlY2xhcmF0aW9uPihkZWNsOiBUKTogVCB7XG4gICAgZGVjbCA9IHN1cGVyLmRldGVjdEtub3duRGVjbGFyYXRpb24oZGVjbCk7XG5cbiAgICAvLyBBbHNvIGNoZWNrIGZvciBUUyBoZWxwZXJzXG4gICAgaWYgKGRlY2wua25vd24gPT09IG51bGwgJiYgZGVjbC5ub2RlICE9PSBudWxsKSB7XG4gICAgICBkZWNsLmtub3duID0gZ2V0VHNIZWxwZXJGbkZyb21EZWNsYXJhdGlvbihkZWNsLm5vZGUpO1xuICAgIH1cblxuICAgIHJldHVybiBkZWNsO1xuICB9XG5cblxuICAvLy8vLy8vLy8vLy8vIFByb3RlY3RlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuICAvKipcbiAgICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUsXG4gICAqIHdob3NlIHZhbHVlIGlzIGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgKHdoaWNoIHJlcHJlc2VudHMgdGhlIGNsYXNzIHRvIHRoZSByZXN0IG9mIHRoZSBwcm9ncmFtKS5cbiAgICogU28gd2UgbWlnaHQgbmVlZCB0byBkaWcgYXJvdW5kIHRvIGdldCBob2xkIG9mIHRoZSBcImNsYXNzXCIgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGV4dHJhY3RzIGEgYE5nY2NDbGFzc1N5bWJvbGAgaWYgYGRlY2xhcmF0aW9uYCBpcyB0aGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gaW5zaWRlXG4gICAqIHRoZSBJSUZFLiBPdGhlcndpc2UsIHVuZGVmaW5lZCBpcyByZXR1cm5lZC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIHRoZSBkZWNsYXJhdGlvbiB3aG9zZSBzeW1ib2wgd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIG9yIGB1bmRlZmluZWRgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIiBvciBoYXMgbm8gc3ltYm9sLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLk5vZGUpOiBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHN1cGVyLmdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgIGlmIChjbGFzc1N5bWJvbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gY2xhc3NTeW1ib2w7XG4gICAgfVxuXG4gICAgaWYgKCF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pIHx8ICFoYXNOYW1lSWRlbnRpZmllcihkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0ZXJEZWNsYXJhdGlvbiA9IGdldENsYXNzRGVjbGFyYXRpb25Gcm9tSW5uZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgaWYgKG91dGVyRGVjbGFyYXRpb24gPT09IG51bGwgfHwgIWhhc05hbWVJZGVudGlmaWVyKG91dGVyRGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmNyZWF0ZUNsYXNzU3ltYm9sKG91dGVyRGVjbGFyYXRpb24sIGRlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbnMgb2YgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBjbGFzcyBpZGVudGlmaWVkIGJ5IGl0cyBzeW1ib2wuXG4gICAqXG4gICAqIEluIEVTTTUsIHRoZXJlIGlzIG5vIFwiY2xhc3NcIiBzbyB0aGUgY29uc3RydWN0b3IgdGhhdCB3ZSB3YW50IGlzIGFjdHVhbGx5IHRoZSBpbm5lciBmdW5jdGlvblxuICAgKiBkZWNsYXJhdGlvbiBpbnNpZGUgdGhlIElJRkUsIHdob3NlIHJldHVybiB2YWx1ZSBpcyBhc3NpZ25lZCB0byB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb25cbiAgICogKHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3MgdG8gdGhlIHJlc3Qgb2YgdGhlIHByb2dyYW0pLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIHN5bWJvbCBvZiB0aGUgY2xhc3MgKGkuZS4gdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uKSB3aG9zZVxuICAgKiBwYXJhbWV0ZXJzIHdlIHdhbnQgdG8gZmluZC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uYCBvYmplY3RzIHJlcHJlc2VudGluZyBlYWNoIG9mIHRoZSBwYXJhbWV0ZXJzIGluXG4gICAqIHRoZSBjbGFzcydzIGNvbnN0cnVjdG9yIG9yIGBudWxsYCBpZiB0aGVyZSBpcyBubyBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTpcbiAgICAgIHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW118bnVsbCB7XG4gICAgY29uc3QgY29uc3RydWN0b3IgPSBjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGlmICghdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKGNvbnN0cnVjdG9yKSkgcmV0dXJuIG51bGw7XG5cbiAgICBpZiAoY29uc3RydWN0b3IucGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbShjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICBpZiAoaXNTeW50aGVzaXplZENvbnN0cnVjdG9yKGNvbnN0cnVjdG9yKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcGFyYW1ldGVyIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzLFxuICAgKiB3aGVyZSB0aGUgaW5mb3JtYXRpb24gaXMgc3RvcmVkIG9uIGEgc3RhdGljIG1ldGhvZCBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIEluIHRoaXMgY2FzZSB0aGUgZGVjb3JhdG9ycyBhcmUgc3RvcmVkIGluIHRoZSBib2R5IG9mIGEgbWV0aG9kXG4gICAqIChgY3RvclBhcmF0ZW1lcnNgKSBhdHRhY2hlZCB0byB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24uXG4gICAqXG4gICAqIE5vdGUgdGhhdCB1bmxpa2UgRVNNMjAxNSB0aGlzIGlzIGEgZnVuY3Rpb24gZXhwcmVzc2lvbiByYXRoZXIgdGhhbiBhbiBhcnJvd1xuICAgKiBmdW5jdGlvbjpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIFtcbiAgICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gICAqICAgeyB0eXBlOiBUZW1wbGF0ZVJlZiwgfSxcbiAgICogICB7IHR5cGU6IEl0ZXJhYmxlRGlmZmVycywgfSxcbiAgICogICB7IHR5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU4sXSB9LF0gfSxcbiAgICogXTsgfTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSB0aGUgcHJvcGVydHkgdGhhdCBob2xkcyB0aGUgcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIG9iamVjdHMgY29udGFpbmluZyB0aGUgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgZWFjaCBwYXJhbWV0ZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0UGFyYW1JbmZvRnJvbVN0YXRpY1Byb3BlcnR5KHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5OiB0cy5TeW1ib2wpOiBQYXJhbUluZm9bXXxudWxsIHtcbiAgICBjb25zdCBwYXJhbURlY29yYXRvcnMgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgLy8gVGhlIGRlY29yYXRvcnMgYXJyYXkgbWF5IGJlIHdyYXBwZWQgaW4gYSBmdW5jdGlvbi4gSWYgc28gdW53cmFwIGl0LlxuICAgIGNvbnN0IHJldHVyblN0YXRlbWVudCA9IGdldFJldHVyblN0YXRlbWVudChwYXJhbURlY29yYXRvcnMpO1xuICAgIGNvbnN0IGV4cHJlc3Npb24gPSByZXR1cm5TdGF0ZW1lbnQgPyByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbiA6IHBhcmFtRGVjb3JhdG9ycztcbiAgICBpZiAoZXhwcmVzc2lvbiAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZXhwcmVzc2lvbikpIHtcbiAgICAgIGNvbnN0IGVsZW1lbnRzID0gZXhwcmVzc2lvbi5lbGVtZW50cztcbiAgICAgIHJldHVybiBlbGVtZW50cy5tYXAocmVmbGVjdEFycmF5RWxlbWVudCkubWFwKHBhcmFtSW5mbyA9PiB7XG4gICAgICAgIGNvbnN0IHR5cGVFeHByZXNzaW9uID0gcGFyYW1JbmZvICYmIHBhcmFtSW5mby5oYXMoJ3R5cGUnKSA/IHBhcmFtSW5mby5nZXQoJ3R5cGUnKSEgOiBudWxsO1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JJbmZvID1cbiAgICAgICAgICAgIHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uaGFzKCdkZWNvcmF0b3JzJykgPyBwYXJhbUluZm8uZ2V0KCdkZWNvcmF0b3JzJykhIDogbnVsbDtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvckluZm8gJiYgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JJbmZvKTtcbiAgICAgICAgcmV0dXJuIHt0eXBlRXhwcmVzc2lvbiwgZGVjb3JhdG9yc307XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHBhcmFtRGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICdJbnZhbGlkIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBkZWNvcmF0b3IgaW4gJyArIHBhcmFtRGVjb3JhdG9ycy5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUgK1xuICAgICAgICAgICAgICAnOlxcbicsXG4gICAgICAgICAgcGFyYW1EZWNvcmF0b3JzLmdldFRleHQoKSk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciBhIHN5bWJvbCBhbmQgZXh0cmFjdCB0aGUgbWVtYmVyIGluZm9ybWF0aW9uLCBjb21iaW5pbmcgaXQgd2l0aCB0aGVcbiAgICogcHJvdmlkZWQgZGVjb3JhdG9yIGluZm9ybWF0aW9uLCBhbmQgd2hldGhlciBpdCBpcyBhIHN0YXRpYyBtZW1iZXIuXG4gICAqXG4gICAqIElmIGEgY2xhc3MgbWVtYmVyIHVzZXMgYWNjZXNzb3JzIChlLmcgZ2V0dGVycyBhbmQvb3Igc2V0dGVycykgdGhlbiBpdCBnZXRzIGRvd25sZXZlbGVkXG4gICAqIGluIEVTNSB0byBhIHNpbmdsZSBgT2JqZWN0LmRlZmluZVByb3BlcnR5KClgIGNhbGwuIEluIHRoYXQgY2FzZSB3ZSBtdXN0IHBhcnNlIHRoaXNcbiAgICogY2FsbCB0byBleHRyYWN0IHRoZSBvbmUgb3IgdHdvIENsYXNzTWVtYmVyIG9iamVjdHMgdGhhdCByZXByZXNlbnQgdGhlIGFjY2Vzc29ycy5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgc3ltYm9sIGZvciB0aGUgbWVtYmVyIHRvIHJlZmxlY3Qgb3Zlci5cbiAgICogQHBhcmFtIGRlY29yYXRvcnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBhc3NvY2lhdGVkIHdpdGggdGhlIG1lbWJlci5cbiAgICogQHBhcmFtIGlzU3RhdGljIHRydWUgaWYgdGhpcyBtZW1iZXIgaXMgc3RhdGljLCBmYWxzZSBpZiBpdCBpcyBhbiBpbnN0YW5jZSBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHJlZmxlY3RlZCBtZW1iZXIgaW5mb3JtYXRpb24sIG9yIG51bGwgaWYgdGhlIHN5bWJvbCBpcyBub3QgYSBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdE1lbWJlcnMoc3ltYm9sOiB0cy5TeW1ib2wsIGRlY29yYXRvcnM/OiBEZWNvcmF0b3JbXSwgaXNTdGF0aWM/OiBib29sZWFuKTpcbiAgICAgIENsYXNzTWVtYmVyW118bnVsbCB7XG4gICAgY29uc3Qgbm9kZSA9IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uIHx8IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgICBjb25zdCBwcm9wZXJ0eURlZmluaXRpb24gPSBub2RlICYmIGdldFByb3BlcnR5RGVmaW5pdGlvbihub2RlKTtcbiAgICBpZiAocHJvcGVydHlEZWZpbml0aW9uKSB7XG4gICAgICBjb25zdCBtZW1iZXJzOiBDbGFzc01lbWJlcltdID0gW107XG4gICAgICBpZiAocHJvcGVydHlEZWZpbml0aW9uLnNldHRlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHByb3BlcnR5RGVmaW5pdGlvbi5zZXR0ZXIsXG4gICAgICAgICAga2luZDogQ2xhc3NNZW1iZXJLaW5kLlNldHRlcixcbiAgICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgICAgIG5hbWU6IHN5bWJvbC5uYW1lLFxuICAgICAgICAgIG5hbWVOb2RlOiBudWxsLFxuICAgICAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgICAgIGlzU3RhdGljOiBpc1N0YXRpYyB8fCBmYWxzZSxcbiAgICAgICAgICBkZWNvcmF0b3JzOiBkZWNvcmF0b3JzIHx8IFtdLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQcmV2ZW50IGF0dGFjaGluZyB0aGUgZGVjb3JhdG9ycyB0byBhIHBvdGVudGlhbCBnZXR0ZXIuIEluIEVTNSwgd2UgY2FuJ3QgdGVsbCB3aGVyZSB0aGVcbiAgICAgICAgLy8gZGVjb3JhdG9ycyB3ZXJlIG9yaWdpbmFsbHkgYXR0YWNoZWQgdG8sIGhvd2V2ZXIgd2Ugb25seSB3YW50IHRvIGF0dGFjaCB0aGVtIHRvIGEgc2luZ2xlXG4gICAgICAgIC8vIGBDbGFzc01lbWJlcmAgYXMgb3RoZXJ3aXNlIG5ndHNjIHdvdWxkIGhhbmRsZSB0aGUgc2FtZSBkZWNvcmF0b3JzIHR3aWNlLlxuICAgICAgICBkZWNvcmF0b3JzID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgaWYgKHByb3BlcnR5RGVmaW5pdGlvbi5nZXR0ZXIpIHtcbiAgICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgICBub2RlLFxuICAgICAgICAgIGltcGxlbWVudGF0aW9uOiBwcm9wZXJ0eURlZmluaXRpb24uZ2V0dGVyLFxuICAgICAgICAgIGtpbmQ6IENsYXNzTWVtYmVyS2luZC5HZXR0ZXIsXG4gICAgICAgICAgdHlwZTogbnVsbCxcbiAgICAgICAgICBuYW1lOiBzeW1ib2wubmFtZSxcbiAgICAgICAgICBuYW1lTm9kZTogbnVsbCxcbiAgICAgICAgICB2YWx1ZTogbnVsbCxcbiAgICAgICAgICBpc1N0YXRpYzogaXNTdGF0aWMgfHwgZmFsc2UsXG4gICAgICAgICAgZGVjb3JhdG9yczogZGVjb3JhdG9ycyB8fCBbXSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVtYmVycztcbiAgICB9XG5cbiAgICBjb25zdCBtZW1iZXJzID0gc3VwZXIucmVmbGVjdE1lbWJlcnMoc3ltYm9sLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgbWVtYmVycyAmJiBtZW1iZXJzLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICAgIGlmIChtZW1iZXIgJiYgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5NZXRob2QgJiYgbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5ub2RlICYmXG4gICAgICAgICAgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obWVtYmVyLm5vZGUpICYmIG1lbWJlci5ub2RlLnBhcmVudCAmJlxuICAgICAgICAgIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihtZW1iZXIubm9kZS5wYXJlbnQpICYmXG4gICAgICAgICAgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24obWVtYmVyLm5vZGUucGFyZW50LnJpZ2h0KSkge1xuICAgICAgICAvLyBSZWNvbXB1dGUgdGhlIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIG1lbWJlcjpcbiAgICAgICAgLy8gRVM1IHN0YXRpYyBtZXRob2RzIGFyZSB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgc28gdGhlIGRlY2xhcmF0aW9uIGlzIGFjdHVhbGx5IHRoZVxuICAgICAgICAvLyBpbml0aWFsaXplciBvZiB0aGUgdmFyaWFibGUgYXNzaWdubWVudFxuICAgICAgICBtZW1iZXIuaW1wbGVtZW50YXRpb24gPSBtZW1iZXIubm9kZS5wYXJlbnQucmlnaHQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG1lbWJlcnM7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBzdGF0ZW1lbnRzIHJlbGF0ZWQgdG8gdGhlIGdpdmVuIGNsYXNzIHRoYXQgbWF5IGNvbnRhaW4gY2FsbHMgdG8gYSBoZWxwZXIuXG4gICAqXG4gICAqIEluIEVTTTUgY29kZSB0aGUgaGVscGVyIGNhbGxzIGFyZSBoaWRkZW4gaW5zaWRlIHRoZSBjbGFzcydzIElJRkUuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLiBXZSBleHBlY3QgdGhpcyBzeW1ib2xcbiAgICogdG8gcmVmZXJlbmNlIHRoZSBpbm5lciBpZGVudGlmaWVyIGluc2lkZSB0aGUgSUlGRS5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygc3RhdGVtZW50cyB0aGF0IG1heSBjb250YWluIGhlbHBlciBjYWxscy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRTdGF0ZW1lbnRzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICBjb25zdCBjbGFzc0RlY2xhcmF0aW9uUGFyZW50ID0gY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24udmFsdWVEZWNsYXJhdGlvbi5wYXJlbnQ7XG4gICAgcmV0dXJuIHRzLmlzQmxvY2soY2xhc3NEZWNsYXJhdGlvblBhcmVudCkgPyBBcnJheS5mcm9tKGNsYXNzRGVjbGFyYXRpb25QYXJlbnQuc3RhdGVtZW50cykgOiBbXTtcbiAgfVxufVxuXG4vLy8vLy8vLy8vLy8vIEludGVybmFsIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGRldGFpbHMgYWJvdXQgcHJvcGVydHkgZGVmaW5pdGlvbnMgdGhhdCB3ZXJlIHNldCB1c2luZyBgT2JqZWN0LmRlZmluZVByb3BlcnR5YC5cbiAqL1xuaW50ZXJmYWNlIFByb3BlcnR5RGVmaW5pdGlvbiB7XG4gIHNldHRlcjogdHMuRnVuY3Rpb25FeHByZXNzaW9ufG51bGw7XG4gIGdldHRlcjogdHMuRnVuY3Rpb25FeHByZXNzaW9ufG51bGw7XG59XG5cbi8qKlxuICogSW4gRVM1LCBnZXR0ZXJzIGFuZCBzZXR0ZXJzIGhhdmUgYmVlbiBkb3dubGV2ZWxlZCBpbnRvIGNhbGwgZXhwcmVzc2lvbnMgb2ZcbiAqIGBPYmplY3QuZGVmaW5lUHJvcGVydHlgLCBzdWNoIGFzXG4gKlxuICogYGBgXG4gKiBPYmplY3QuZGVmaW5lUHJvcGVydHkoQ2xhenoucHJvdG90eXBlLCBcInByb3BlcnR5XCIsIHtcbiAqICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gKiAgICAgICByZXR1cm4gJ3ZhbHVlJztcbiAqICAgfSxcbiAqICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAqICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAqICAgfSxcbiAqICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAqICAgY29uZmlndXJhYmxlOiB0cnVlXG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIFRoaXMgZnVuY3Rpb24gaW5zcGVjdHMgdGhlIGdpdmVuIG5vZGUgdG8gZGV0ZXJtaW5lIGlmIGl0IGNvcnJlc3BvbmRzIHdpdGggc3VjaCBhIGNhbGwsIGFuZCBpZiBzb1xuICogZXh0cmFjdHMgdGhlIGBzZXRgIGFuZCBgZ2V0YCBmdW5jdGlvbiBleHByZXNzaW9ucyBmcm9tIHRoZSBkZXNjcmlwdG9yIG9iamVjdCwgaWYgdGhleSBleGlzdC5cbiAqXG4gKiBAcGFyYW0gbm9kZSBUaGUgbm9kZSB0byBvYnRhaW4gdGhlIHByb3BlcnR5IGRlZmluaXRpb24gZnJvbS5cbiAqIEByZXR1cm5zIFRoZSBwcm9wZXJ0eSBkZWZpbml0aW9uIGlmIHRoZSBub2RlIGNvcnJlc3BvbmRzIHdpdGggYWNjZXNzb3IsIG51bGwgb3RoZXJ3aXNlLlxuICovXG5mdW5jdGlvbiBnZXRQcm9wZXJ0eURlZmluaXRpb24obm9kZTogdHMuTm9kZSk6IFByb3BlcnR5RGVmaW5pdGlvbnxudWxsIHtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCBmbiA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihmbikgfHwgIXRzLmlzSWRlbnRpZmllcihmbi5leHByZXNzaW9uKSB8fFxuICAgICAgZm4uZXhwcmVzc2lvbi50ZXh0ICE9PSAnT2JqZWN0JyB8fCBmbi5uYW1lLnRleHQgIT09ICdkZWZpbmVQcm9wZXJ0eScpXG4gICAgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgZGVzY3JpcHRvciA9IG5vZGUuYXJndW1lbnRzWzJdO1xuICBpZiAoIWRlc2NyaXB0b3IgfHwgIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oZGVzY3JpcHRvcikpIHJldHVybiBudWxsO1xuXG4gIHJldHVybiB7XG4gICAgc2V0dGVyOiByZWFkUHJvcGVydHlGdW5jdGlvbkV4cHJlc3Npb24oZGVzY3JpcHRvciwgJ3NldCcpLFxuICAgIGdldHRlcjogcmVhZFByb3BlcnR5RnVuY3Rpb25FeHByZXNzaW9uKGRlc2NyaXB0b3IsICdnZXQnKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVhZFByb3BlcnR5RnVuY3Rpb25FeHByZXNzaW9uKG9iamVjdDogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24sIG5hbWU6IHN0cmluZykge1xuICBjb25zdCBwcm9wZXJ0eSA9IG9iamVjdC5wcm9wZXJ0aWVzLmZpbmQoXG4gICAgICAocCk6IHAgaXMgdHMuUHJvcGVydHlBc3NpZ25tZW50ID0+XG4gICAgICAgICAgdHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQocCkgJiYgdHMuaXNJZGVudGlmaWVyKHAubmFtZSkgJiYgcC5uYW1lLnRleHQgPT09IG5hbWUpO1xuXG4gIHJldHVybiBwcm9wZXJ0eSAmJiB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihwcm9wZXJ0eS5pbml0aWFsaXplcikgJiYgcHJvcGVydHkuaW5pdGlhbGl6ZXIgfHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0UmV0dXJuU3RhdGVtZW50KGRlY2xhcmF0aW9uOiB0cy5FeHByZXNzaW9ufHVuZGVmaW5lZCk6IHRzLlJldHVyblN0YXRlbWVudHx1bmRlZmluZWQge1xuICByZXR1cm4gZGVjbGFyYXRpb24gJiYgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZGVjbGFyYXRpb24pID9cbiAgICAgIGRlY2xhcmF0aW9uLmJvZHkuc3RhdGVtZW50cy5maW5kKHRzLmlzUmV0dXJuU3RhdGVtZW50KSA6XG4gICAgICB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIHJlZmxlY3RBcnJheUVsZW1lbnQoZWxlbWVudDogdHMuRXhwcmVzc2lvbikge1xuICByZXR1cm4gdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbDtcbn1cblxuLyoqXG4gKiBBIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG1heSBoYXZlIGJlZW4gXCJzeW50aGVzaXplZFwiIGJ5IFR5cGVTY3JpcHQgZHVyaW5nIEphdmFTY3JpcHQgZW1pdCxcbiAqIGluIHRoZSBjYXNlIG5vIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGUuZy4gcHJvcGVydHkgaW5pdGlhbGl6ZXJzIGFyZSB1c2VkLlxuICogVGhvc2UgaW5pdGlhbGl6ZXJzIG5lZWQgdG8gYmUgZW1pdHRlZCBpbnRvIGEgY29uc3RydWN0b3IgaW4gSmF2YVNjcmlwdCwgc28gdGhlIFR5cGVTY3JpcHRcbiAqIGNvbXBpbGVyIGdlbmVyYXRlcyBhIHN5bnRoZXRpYyBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBXZSBuZWVkIHRvIGlkZW50aWZ5IHN1Y2ggY29uc3RydWN0b3JzIGFzIG5nY2MgbmVlZHMgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIGEgY2xhc3MgZGlkXG4gKiBvcmlnaW5hbGx5IGhhdmUgYSBjb25zdHJ1Y3RvciBpbiB0aGUgVHlwZVNjcmlwdCBzb3VyY2UuIEZvciBFUzUsIHdlIGNhbiBub3QgdGVsbCBhblxuICogZW1wdHkgY29uc3RydWN0b3IgYXBhcnQgZnJvbSBhIHN5bnRoZXNpemVkIGNvbnN0cnVjdG9yLCBidXQgZm9ydHVuYXRlbHkgdGhhdCBkb2VzIG5vdFxuICogbWF0dGVyIGZvciB0aGUgY29kZSBnZW5lcmF0ZWQgYnkgbmd0c2MuXG4gKlxuICogV2hlbiBhIGNsYXNzIGhhcyBhIHN1cGVyY2xhc3MgaG93ZXZlciwgYSBzeW50aGVzaXplZCBjb25zdHJ1Y3RvciBtdXN0IG5vdCBiZSBjb25zaWRlcmVkXG4gKiBhcyBhIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBhcyB0aGF0IHByZXZlbnRzIGEgYmFzZSBmYWN0b3J5IGNhbGwgZnJvbSBiZWluZyBjcmVhdGVkIGJ5XG4gKiBuZ3RzYywgcmVzdWx0aW5nIGluIGEgZmFjdG9yeSBmdW5jdGlvbiB0aGF0IGRvZXMgbm90IGluamVjdCB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZVxuICogc3VwZXJjbGFzcy4gSGVuY2UsIHdlIGlkZW50aWZ5IGEgZGVmYXVsdCBzeW50aGVzaXplZCBzdXBlciBjYWxsIGluIHRoZSBjb25zdHJ1Y3RvciBib2R5LFxuICogYWNjb3JkaW5nIHRvIHRoZSBzdHJ1Y3R1cmUgdGhhdCBUeXBlU2NyaXB0J3MgRVMyMDE1IHRvIEVTNSB0cmFuc2Zvcm1lciBnZW5lcmF0ZXMgaW5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL3YzLjIuMi9zcmMvY29tcGlsZXIvdHJhbnNmb3JtZXJzL2VzMjAxNS50cyNMMTA4Mi1MMTA5OFxuICpcbiAqIEBwYXJhbSBjb25zdHJ1Y3RvciBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIHRlc3RcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGNvbnN0cnVjdG9yIGFwcGVhcnMgdG8gaGF2ZSBiZWVuIHN5bnRoZXNpemVkXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcjogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICBpZiAoIWNvbnN0cnVjdG9yLmJvZHkpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBmaXJzdFN0YXRlbWVudCA9IGNvbnN0cnVjdG9yLmJvZHkuc3RhdGVtZW50c1swXTtcbiAgaWYgKCFmaXJzdFN0YXRlbWVudCkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N5bnRoZXNpemVkU3VwZXJUaGlzQXNzaWdubWVudChmaXJzdFN0YXRlbWVudCkgfHxcbiAgICAgIGlzU3ludGhlc2l6ZWRTdXBlclJldHVyblN0YXRlbWVudChmaXJzdFN0YXRlbWVudCk7XG59XG5cbi8qKlxuICogSWRlbnRpZmllcyBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGwgb2YgdGhlIGZvcm06XG4gKlxuICogYGBgXG4gKiB2YXIgX3RoaXMgPSBfc3VwZXIgIT09IG51bGwgJiYgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgdGhpcztcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzdGF0ZW1lbnQgYSBzdGF0ZW1lbnQgdGhhdCBtYXkgYmUgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBzdGF0ZW1lbnQgbG9va3MgbGlrZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZFN1cGVyVGhpc0Fzc2lnbm1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBib29sZWFuIHtcbiAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCB2YXJpYWJsZURlY2xhcmF0aW9ucyA9IHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zO1xuICBpZiAodmFyaWFibGVEZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgdmFyaWFibGVEZWNsYXJhdGlvbiA9IHZhcmlhYmxlRGVjbGFyYXRpb25zWzBdO1xuICBpZiAoIXRzLmlzSWRlbnRpZmllcih2YXJpYWJsZURlY2xhcmF0aW9uLm5hbWUpIHx8XG4gICAgICAhdmFyaWFibGVEZWNsYXJhdGlvbi5uYW1lLnRleHQuc3RhcnRzV2l0aCgnX3RoaXMnKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgaW5pdGlhbGl6ZXIgPSB2YXJpYWJsZURlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICBpZiAoIWluaXRpYWxpemVyKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGlzU3ludGhlc2l6ZWREZWZhdWx0U3VwZXJDYWxsKGluaXRpYWxpemVyKTtcbn1cbi8qKlxuICogSWRlbnRpZmllcyBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGwgb2YgdGhlIGZvcm06XG4gKlxuICogYGBgXG4gKiByZXR1cm4gX3N1cGVyICE9PSBudWxsICYmIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IHRoaXM7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3RhdGVtZW50IGEgc3RhdGVtZW50IHRoYXQgbWF5IGJlIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgc3RhdGVtZW50IGxvb2tzIGxpa2UgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRTdXBlclJldHVyblN0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzUmV0dXJuU3RhdGVtZW50KHN0YXRlbWVudCkpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBleHByZXNzaW9uID0gc3RhdGVtZW50LmV4cHJlc3Npb247XG4gIGlmICghZXhwcmVzc2lvbikgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N5bnRoZXNpemVkRGVmYXVsdFN1cGVyQ2FsbChleHByZXNzaW9uKTtcbn1cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHRoZSBleHByZXNzaW9uIGlzIG9mIHRoZSBmb3JtOlxuICpcbiAqIGBgYFxuICogX3N1cGVyICE9PSBudWxsICYmIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IHRoaXM7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIHN0cnVjdHVyZSBpcyBnZW5lcmF0ZWQgYnkgVHlwZVNjcmlwdCB3aGVuIHRyYW5zZm9ybWluZyBFUzIwMTUgdG8gRVM1LCBzZWVcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL3YzLjIuMi9zcmMvY29tcGlsZXIvdHJhbnNmb3JtZXJzL2VzMjAxNS50cyNMMTE0OC1MMTE2M1xuICpcbiAqIEBwYXJhbSBleHByZXNzaW9uIGFuIGV4cHJlc3Npb24gdGhhdCBtYXkgcmVwcmVzZW50IGEgZGVmYXVsdCBzdXBlciBjYWxsXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBleHByZXNzaW9uIGNvcnJlc3BvbmRzIHdpdGggdGhlIGFib3ZlIGZvcm1cbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZERlZmF1bHRTdXBlckNhbGwoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICBpZiAoIWlzQmluYXJ5RXhwcihleHByZXNzaW9uLCB0cy5TeW50YXhLaW5kLkJhckJhclRva2VuKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZXhwcmVzc2lvbi5yaWdodC5raW5kICE9PSB0cy5TeW50YXhLaW5kLlRoaXNLZXl3b3JkKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgbGVmdCA9IGV4cHJlc3Npb24ubGVmdDtcbiAgaWYgKCFpc0JpbmFyeUV4cHIobGVmdCwgdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbikpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gaXNTdXBlck5vdE51bGwobGVmdC5sZWZ0KSAmJiBpc1N1cGVyQXBwbHlDYWxsKGxlZnQucmlnaHQpO1xufVxuXG5mdW5jdGlvbiBpc1N1cGVyTm90TnVsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIHJldHVybiBpc0JpbmFyeUV4cHIoZXhwcmVzc2lvbiwgdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc0VxdWFsc1Rva2VuKSAmJlxuICAgICAgaXNTdXBlcklkZW50aWZpZXIoZXhwcmVzc2lvbi5sZWZ0KTtcbn1cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHRoZSBleHByZXNzaW9uIGlzIG9mIHRoZSBmb3JtXG4gKlxuICogYGBgXG4gKiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICogYGBgXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gYW4gZXhwcmVzc2lvbiB0aGF0IG1heSByZXByZXNlbnQgYSBkZWZhdWx0IHN1cGVyIGNhbGxcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gY29ycmVzcG9uZHMgd2l0aCB0aGUgYWJvdmUgZm9ybVxuICovXG5mdW5jdGlvbiBpc1N1cGVyQXBwbHlDYWxsKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHJlc3Npb24pIHx8IGV4cHJlc3Npb24uYXJndW1lbnRzLmxlbmd0aCAhPT0gMikgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IHRhcmdldEZuID0gZXhwcmVzc2lvbi5leHByZXNzaW9uO1xuICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHRhcmdldEZuKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoIWlzU3VwZXJJZGVudGlmaWVyKHRhcmdldEZuLmV4cHJlc3Npb24pKSByZXR1cm4gZmFsc2U7XG4gIGlmICh0YXJnZXRGbi5uYW1lLnRleHQgIT09ICdhcHBseScpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCB0aGlzQXJndW1lbnQgPSBleHByZXNzaW9uLmFyZ3VtZW50c1swXTtcbiAgaWYgKHRoaXNBcmd1bWVudC5raW5kICE9PSB0cy5TeW50YXhLaW5kLlRoaXNLZXl3b3JkKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgYXJndW1lbnRzQXJndW1lbnQgPSBleHByZXNzaW9uLmFyZ3VtZW50c1sxXTtcbiAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihhcmd1bWVudHNBcmd1bWVudCkgJiYgYXJndW1lbnRzQXJndW1lbnQudGV4dCA9PT0gJ2FyZ3VtZW50cyc7XG59XG5cbmZ1bmN0aW9uIGlzQmluYXJ5RXhwcihcbiAgICBleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uLCBvcGVyYXRvcjogdHMuQmluYXJ5T3BlcmF0b3IpOiBleHByZXNzaW9uIGlzIHRzLkJpbmFyeUV4cHJlc3Npb24ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKGV4cHJlc3Npb24pICYmIGV4cHJlc3Npb24ub3BlcmF0b3JUb2tlbi5raW5kID09PSBvcGVyYXRvcjtcbn1cblxuZnVuY3Rpb24gaXNTdXBlcklkZW50aWZpZXIobm9kZTogdHMuTm9kZSk6IGJvb2xlYW4ge1xuICAvLyBWZXJpZnkgdGhhdCB0aGUgaWRlbnRpZmllciBpcyBwcmVmaXhlZCB3aXRoIGBfc3VwZXJgLiBXZSBkb24ndCB0ZXN0IGZvciBlcXVpdmFsZW5jZVxuICAvLyBhcyBUeXBlU2NyaXB0IG1heSBoYXZlIHN1ZmZpeGVkIHRoZSBuYW1lLCBlLmcuIGBfc3VwZXJfMWAgdG8gYXZvaWQgbmFtZSBjb25mbGljdHMuXG4gIC8vIFJlcXVpcmluZyBvbmx5IGEgcHJlZml4IHNob3VsZCBiZSBzdWZmaWNpZW50bHkgYWNjdXJhdGUuXG4gIHJldHVybiB0cy5pc0lkZW50aWZpZXIobm9kZSkgJiYgbm9kZS50ZXh0LnN0YXJ0c1dpdGgoJ19zdXBlcicpO1xufVxuXG4vKipcbiAqIFBhcnNlIHRoZSBzdGF0ZW1lbnQgdG8gZXh0cmFjdCB0aGUgRVNNNSBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXIgaWYgdGhlcmUgaXMgb25lLlxuICogSWYgb25lIGlzIGZvdW5kLCBhZGQgaXQgdG8gdGhlIGFwcHJvcHJpYXRlIHBhcmFtZXRlciBpbiB0aGUgYHBhcmFtZXRlcnNgIGNvbGxlY3Rpb24uXG4gKlxuICogVGhlIGZvcm0gd2UgYXJlIGxvb2tpbmcgZm9yIGlzOlxuICpcbiAqIGBgYFxuICogaWYgKGFyZyA9PT0gdm9pZCAwKSB7IGFyZyA9IGluaXRpYWxpemVyOyB9XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3RhdGVtZW50IGEgc3RhdGVtZW50IHRoYXQgbWF5IGJlIGluaXRpYWxpemluZyBhbiBvcHRpb25hbCBwYXJhbWV0ZXJcbiAqIEBwYXJhbSBwYXJhbWV0ZXJzIHRoZSBjb2xsZWN0aW9uIG9mIHBhcmFtZXRlcnMgdGhhdCB3ZXJlIGZvdW5kIGluIHRoZSBmdW5jdGlvbiBkZWZpbml0aW9uXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBzdGF0ZW1lbnQgd2FzIGEgcGFyYW1ldGVyIGluaXRpYWxpemVyXG4gKi9cbmZ1bmN0aW9uIGNhcHR1cmVQYXJhbUluaXRpYWxpemVyKHN0YXRlbWVudDogdHMuU3RhdGVtZW50LCBwYXJhbWV0ZXJzOiBQYXJhbWV0ZXJbXSkge1xuICBpZiAodHMuaXNJZlN0YXRlbWVudChzdGF0ZW1lbnQpICYmIGlzVW5kZWZpbmVkQ29tcGFyaXNvbihzdGF0ZW1lbnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIHRzLmlzQmxvY2soc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQpICYmIHN0YXRlbWVudC50aGVuU3RhdGVtZW50LnN0YXRlbWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgY29uc3QgaWZTdGF0ZW1lbnRDb21wYXJpc29uID0gc3RhdGVtZW50LmV4cHJlc3Npb247ICAgICAgICAgICAvLyAoYXJnID09PSB2b2lkIDApXG4gICAgY29uc3QgdGhlblN0YXRlbWVudCA9IHN0YXRlbWVudC50aGVuU3RhdGVtZW50LnN0YXRlbWVudHNbMF07ICAvLyBhcmcgPSBpbml0aWFsaXplcjtcbiAgICBpZiAoaXNBc3NpZ25tZW50U3RhdGVtZW50KHRoZW5TdGF0ZW1lbnQpKSB7XG4gICAgICBjb25zdCBjb21wYXJpc29uTmFtZSA9IGlmU3RhdGVtZW50Q29tcGFyaXNvbi5sZWZ0LnRleHQ7XG4gICAgICBjb25zdCBhc3NpZ25tZW50TmFtZSA9IHRoZW5TdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0LnRleHQ7XG4gICAgICBpZiAoY29tcGFyaXNvbk5hbWUgPT09IGFzc2lnbm1lbnROYW1lKSB7XG4gICAgICAgIGNvbnN0IHBhcmFtZXRlciA9IHBhcmFtZXRlcnMuZmluZChwID0+IHAubmFtZSA9PT0gY29tcGFyaXNvbk5hbWUpO1xuICAgICAgICBpZiAocGFyYW1ldGVyKSB7XG4gICAgICAgICAgcGFyYW1ldGVyLmluaXRpYWxpemVyID0gdGhlblN0YXRlbWVudC5leHByZXNzaW9uLnJpZ2h0O1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWRDb21wYXJpc29uKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBleHByZXNzaW9uIGlzIHRzLkV4cHJlc3Npb24mXG4gICAge2xlZnQ6IHRzLklkZW50aWZpZXIsIHJpZ2h0OiB0cy5FeHByZXNzaW9ufSB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24oZXhwcmVzc2lvbikgJiZcbiAgICAgIGV4cHJlc3Npb24ub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc0VxdWFsc1Rva2VuICYmXG4gICAgICB0cy5pc1ZvaWRFeHByZXNzaW9uKGV4cHJlc3Npb24ucmlnaHQpICYmIHRzLmlzSWRlbnRpZmllcihleHByZXNzaW9uLmxlZnQpO1xufVxuXG4vKipcbiAqIFBhcnNlIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZ2l2ZW4gYGNsYXNzU3ltYm9sYCB0byBmaW5kIHRoZSBJSUZFIHdyYXBwZXIgZnVuY3Rpb24uXG4gKlxuICogVGhpcyBmdW5jdGlvbiBtYXkgYWNjZXB0IGEgYF9zdXBlcmAgYXJndW1lbnQgaWYgdGhlcmUgaXMgYSBiYXNlIGNsYXNzLlxuICpcbiAqIGBgYFxuICogdmFyIFRlc3RDbGFzcyA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gKiAgIF9fZXh0ZW5kcyhUZXN0Q2xhc3MsIF9zdXBlcik7XG4gKiAgIGZ1bmN0aW9uIFRlc3RDbGFzcygpIHt9XG4gKiAgIHJldHVybiBUZXN0Q2xhc3M7XG4gKiB9KEJhc2VDbGFzcykpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBpaWZlIHdyYXBwZXIgZnVuY3Rpb24gd2Ugd2FudCB0byBnZXQuXG4gKiBAcmV0dXJucyB0aGUgSUlGRSBmdW5jdGlvbiBvciBudWxsIGlmIGl0IGNvdWxkIG5vdCBiZSBwYXJzZWQuXG4gKi9cbmZ1bmN0aW9uIGdldElpZmVGbihjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sfHVuZGVmaW5lZCk6IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKGNsYXNzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGlubmVyRGVjbGFyYXRpb24gPSBjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICBjb25zdCBpaWZlQm9keSA9IGlubmVyRGVjbGFyYXRpb24ucGFyZW50O1xuICBpZiAoIXRzLmlzQmxvY2soaWlmZUJvZHkpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBpaWZlV3JhcHBlciA9IGlpZmVCb2R5LnBhcmVudDtcbiAgcmV0dXJuIGlpZmVXcmFwcGVyICYmIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGlpZmVXcmFwcGVyKSA/IGlpZmVXcmFwcGVyIDogbnVsbDtcbn1cbiJdfQ==