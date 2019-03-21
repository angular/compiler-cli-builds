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
        /**
         * Check whether the given node actually represents a class.
         */
        Esm5ReflectionHost.prototype.isClass = function (node) { return !!this.getClassDeclaration(node); };
        /**
         * Determines whether the given declaration, which should be a "class", has a base "class".
         *
         * In ES5 code, we need to determine if the IIFE wrapper takes a `_super` parameter .
         *
         * @param clazz a `ClassDeclaration` representing the class over which to reflect.
         */
        Esm5ReflectionHost.prototype.hasBaseClass = function (clazz) {
            if (_super.prototype.hasBaseClass.call(this, clazz))
                return true;
            var classDeclaration = this.getClassDeclaration(clazz);
            if (!classDeclaration)
                return false;
            var iifeBody = getIifeBody(classDeclaration);
            if (!iifeBody)
                return false;
            var iife = iifeBody.parent;
            if (!iife || !ts.isFunctionExpression(iife))
                return false;
            return iife.parameters.length === 1 && isSuperIdentifier(iife.parameters[0].name);
        };
        /**
         * Find the declaration of a class given a node that we think represents the class.
         *
         * In ES5, the implementation of a class is a function expression that is hidden inside an IIFE,
         * whose value is assigned to a variable (which represents the class to the rest of the program).
         * So we might need to dig around to get hold of the "class" declaration.
         *
         * `node` might be one of:
         * - A class declaration (from a typings file).
         * - The declaration of the outer variable, which is assigned the result of the IIFE.
         * - The function declaration inside the IIFE, which is eventually returned and assigned to the
         *   outer variable.
         *
         * The returned declaration is either the class declaration (from the typings file) or the outer
         * variable declaration.
         *
         * @param node the node that represents the class whose declaration we are finding.
         * @returns the declaration of the class or `undefined` if it is not a "class".
         */
        Esm5ReflectionHost.prototype.getClassDeclaration = function (node) {
            var superDeclaration = _super.prototype.getClassDeclaration.call(this, node);
            if (superDeclaration)
                return superDeclaration;
            var outerClass = getClassDeclarationFromInnerFunctionDeclaration(node);
            if (outerClass)
                return outerClass;
            // At this point, `node` could be the outer variable declaration of an ES5 class.
            // If so, ensure that it has a `name` identifier and the correct structure.
            if (!reflection_1.isNamedVariableDeclaration(node) ||
                !this.getInnerFunctionDeclarationFromClassDeclaration(node)) {
                return undefined;
            }
            return node;
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
            // Get the identifier for the outer class node (if any).
            var outerClassNode = getClassDeclarationFromInnerFunctionDeclaration(id.parent);
            var declaration = _super.prototype.getDeclarationOfIdentifier.call(this, outerClassNode ? outerClassNode.name : id);
            if (!declaration || !ts.isVariableDeclaration(declaration.node) ||
                declaration.node.initializer !== undefined ||
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
            var parameters = node.parameters.map(function (p) { return ({ name: utils_1.getNameText(p.name), node: p, initializer: null }); });
            var lookingForParamInitializers = true;
            var statements = node.body && node.body.statements.filter(function (s) {
                lookingForParamInitializers =
                    lookingForParamInitializers && reflectParamInitializer(s, parameters);
                // If we are no longer looking for parameter initializers then we include this statement
                return !lookingForParamInitializers;
            });
            return { node: node, body: statements || null, parameters: parameters };
        };
        /**
         * Examine a declaration which should be of a class, and return metadata about the members of the
         * class.
         *
         * @param declaration a TypeScript `ts.Declaration` node representing the class over which to
         * reflect.
         *
         * @returns an array of `ClassMember` metadata representing the members of the class.
         *
         * @throws if `declaration` does not resolve to a class declaration.
         */
        Esm5ReflectionHost.prototype.getMembersOfClass = function (clazz) {
            if (_super.prototype.isClass.call(this, clazz))
                return _super.prototype.getMembersOfClass.call(this, clazz);
            // The necessary info is on the inner function declaration (inside the ES5 class IIFE).
            var innerFunctionSymbol = this.getInnerFunctionSymbolFromClassDeclaration(clazz);
            if (!innerFunctionSymbol) {
                throw new Error("Attempted to get members of a non-class: \"" + clazz.getText() + "\"");
            }
            return this.getMembersOfSymbol(innerFunctionSymbol);
        };
        ///////////// Protected Helpers /////////////
        /**
         * Get the inner function declaration of an ES5-style class.
         *
         * In ES5, the implementation of a class is a function expression that is hidden inside an IIFE
         * and returned to be assigned to a variable outside the IIFE, which is what the rest of the
         * program interacts with.
         *
         * Given the outer variable declaration, we want to get to the inner function declaration.
         *
         * @param node a node that could be the variable expression outside an ES5 class IIFE.
         * @param checker the TS program TypeChecker
         * @returns the inner function declaration or `undefined` if it is not a "class".
         */
        Esm5ReflectionHost.prototype.getInnerFunctionDeclarationFromClassDeclaration = function (node) {
            if (!ts.isVariableDeclaration(node))
                return undefined;
            // Extract the IIFE body (if any).
            var iifeBody = getIifeBody(node);
            if (!iifeBody)
                return undefined;
            // Extract the function declaration from inside the IIFE.
            var functionDeclaration = iifeBody.statements.find(ts.isFunctionDeclaration);
            if (!functionDeclaration)
                return undefined;
            // Extract the return identifier of the IIFE.
            var returnIdentifier = getReturnIdentifier(iifeBody);
            var returnIdentifierSymbol = returnIdentifier && this.checker.getSymbolAtLocation(returnIdentifier);
            if (!returnIdentifierSymbol)
                return undefined;
            // Verify that the inner function is returned.
            if (returnIdentifierSymbol.valueDeclaration !== functionDeclaration)
                return undefined;
            return functionDeclaration;
        };
        /**
         * Get the identifier symbol of the inner function declaration of an ES5-style class.
         *
         * In ES5, the implementation of a class is a function expression that is hidden inside an IIFE
         * and returned to be assigned to a variable outside the IIFE, which is what the rest of the
         * program interacts with.
         *
         * Given the outer variable declaration, we want to get to the identifier symbol of the inner
         * function declaration.
         *
         * @param clazz a node that could be the variable expression outside an ES5 class IIFE.
         * @param checker the TS program TypeChecker
         * @returns the inner function declaration identifier symbol or `undefined` if it is not a "class"
         * or has no identifier.
         */
        Esm5ReflectionHost.prototype.getInnerFunctionSymbolFromClassDeclaration = function (clazz) {
            var innerFunctionDeclaration = this.getInnerFunctionDeclarationFromClassDeclaration(clazz);
            if (!innerFunctionDeclaration || !utils_1.hasNameIdentifier(innerFunctionDeclaration))
                return undefined;
            return this.checker.getSymbolAtLocation(innerFunctionDeclaration.name);
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
            var constructor = this.getInnerFunctionDeclarationFromClassDeclaration(classSymbol.valueDeclaration);
            if (!constructor)
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
         * Get the parameter decorators of a class constructor.
         *
         * @param classSymbol the symbol of the class (i.e. the outer variable declaration) whose
         * parameter info we want to get.
         * @param parameterNodes the array of TypeScript parameter nodes for this class's constructor.
         * @returns an array of constructor parameter info objects.
         */
        Esm5ReflectionHost.prototype.getConstructorParamInfo = function (classSymbol, parameterNodes) {
            // The necessary info is on the inner function declaration (inside the ES5 class IIFE).
            var innerFunctionSymbol = this.getInnerFunctionSymbolFromClassDeclaration(classSymbol.valueDeclaration);
            if (!innerFunctionSymbol)
                return [];
            return _super.prototype.getConstructorParamInfo.call(this, innerFunctionSymbol, parameterNodes);
        };
        Esm5ReflectionHost.prototype.getDecoratorsOfSymbol = function (symbol) {
            // The necessary info is on the inner function declaration (inside the ES5 class IIFE).
            var innerFunctionSymbol = this.getInnerFunctionSymbolFromClassDeclaration(symbol.valueDeclaration);
            if (!innerFunctionSymbol)
                return null;
            return _super.prototype.getDecoratorsOfSymbol.call(this, innerFunctionSymbol);
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
            var returnStatement = getReturnStatement(paramDecorators);
            var expression = returnStatement && returnStatement.expression;
            if (expression && ts.isArrayLiteralExpression(expression)) {
                var elements = expression.elements;
                return elements.map(reflectArrayElement).map(function (paramInfo) {
                    var typeExpression = paramInfo && paramInfo.get('type') || null;
                    var decoratorInfo = paramInfo && paramInfo.get('decorators') || null;
                    var decorators = decoratorInfo && _this.reflectDecorators(decoratorInfo);
                    return { typeExpression: typeExpression, decorators: decorators };
                });
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
            var classDeclarationParent = classSymbol.valueDeclaration.parent;
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
    /**
     * Get the actual (outer) declaration of a class.
     *
     * In ES5, the implementation of a class is a function expression that is hidden inside an IIFE and
     * returned to be assigned to a variable outside the IIFE, which is what the rest of the program
     * interacts with.
     *
     * Given the inner function declaration, we want to get to the declaration of the outer variable
     * that represents the class.
     *
     * @param node a node that could be the function expression inside an ES5 class IIFE.
     * @returns the outer variable declaration or `undefined` if it is not a "class".
     */
    function getClassDeclarationFromInnerFunctionDeclaration(node) {
        if (ts.isFunctionDeclaration(node)) {
            // It might be the function expression inside the IIFE. We need to go 5 levels up...
            // 1. IIFE body.
            var outerNode = node.parent;
            if (!outerNode || !ts.isBlock(outerNode))
                return undefined;
            // 2. IIFE function expression.
            outerNode = outerNode.parent;
            if (!outerNode || !ts.isFunctionExpression(outerNode))
                return undefined;
            // 3. IIFE call expression.
            outerNode = outerNode.parent;
            if (!outerNode || !ts.isCallExpression(outerNode))
                return undefined;
            // 4. Parenthesis around IIFE.
            outerNode = outerNode.parent;
            if (!outerNode || !ts.isParenthesizedExpression(outerNode))
                return undefined;
            // 5. Outer variable declaration.
            outerNode = outerNode.parent;
            if (!outerNode || !ts.isVariableDeclaration(outerNode))
                return undefined;
            // Finally, ensure that the variable declaration has a `name` identifier.
            return utils_1.hasNameIdentifier(outerNode) ? outerNode : undefined;
        }
        return undefined;
    }
    function getIifeBody(declaration) {
        if (!ts.isVariableDeclaration(declaration) || !declaration.initializer ||
            !ts.isParenthesizedExpression(declaration.initializer)) {
            return undefined;
        }
        var call = declaration.initializer;
        return ts.isCallExpression(call.expression) &&
            ts.isFunctionExpression(call.expression.expression) ?
            call.expression.expression.body :
            undefined;
    }
    exports.getIifeBody = getIifeBody;
    function getReturnIdentifier(body) {
        var returnStatement = body.statements.find(ts.isReturnStatement);
        return returnStatement && returnStatement.expression &&
            ts.isIdentifier(returnStatement.expression) ?
            returnStatement.expression :
            undefined;
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
    function reflectParamInitializer(statement, parameters) {
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyx5RUFBa087SUFDbE8sOERBQXdEO0lBRXhELGlGQUFtSDtJQUluSDs7Ozs7Ozs7Ozs7Ozs7OztPQWdCRztJQUNIO1FBQXdDLDhDQUFxQjtRQUE3RDs7UUE4WUEsQ0FBQztRQTdZQzs7V0FFRztRQUNILG9DQUFPLEdBQVAsVUFBUSxJQUFhLElBQThCLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFN0Y7Ozs7OztXQU1HO1FBQ0gseUNBQVksR0FBWixVQUFhLEtBQXVCO1lBQ2xDLElBQUksaUJBQU0sWUFBWSxZQUFDLEtBQUssQ0FBQztnQkFBRSxPQUFPLElBQUksQ0FBQztZQUUzQyxJQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6RCxJQUFJLENBQUMsZ0JBQWdCO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1lBRXBDLElBQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxRQUFRO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1lBRTVCLElBQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDN0IsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUM7Z0JBQUUsT0FBTyxLQUFLLENBQUM7WUFFMUQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwRixDQUFDO1FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7OztXQWtCRztRQUNILGdEQUFtQixHQUFuQixVQUFvQixJQUFhO1lBQy9CLElBQU0sZ0JBQWdCLEdBQUcsaUJBQU0sbUJBQW1CLFlBQUMsSUFBSSxDQUFDLENBQUM7WUFDekQsSUFBSSxnQkFBZ0I7Z0JBQUUsT0FBTyxnQkFBZ0IsQ0FBQztZQUU5QyxJQUFNLFVBQVUsR0FBRywrQ0FBK0MsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6RSxJQUFJLFVBQVU7Z0JBQUUsT0FBTyxVQUFVLENBQUM7WUFFbEMsaUZBQWlGO1lBQ2pGLDJFQUEyRTtZQUMzRSxJQUFJLENBQUMsdUNBQTBCLENBQUMsSUFBSSxDQUFDO2dCQUNqQyxDQUFDLElBQUksQ0FBQywrQ0FBK0MsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDL0QsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRDs7Ozs7Ozs7Ozs7Ozs7OztXQWdCRztRQUNILHVEQUEwQixHQUExQixVQUEyQixFQUFpQjtZQUMxQyx3REFBd0Q7WUFDeEQsSUFBTSxjQUFjLEdBQUcsK0NBQStDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2xGLElBQU0sV0FBVyxHQUFHLGlCQUFNLDBCQUEwQixZQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFaEcsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO2dCQUMzRCxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTO2dCQUMxQyxvRkFBb0Y7Z0JBQ3BGLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3RELE9BQU8sV0FBVyxDQUFDO2FBQ3BCO1lBRUQsMERBQTBEO1lBQzFELDBDQUEwQztZQUMxQyxJQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ3BELElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1RSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2hELElBQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RDLCtFQUErRTtnQkFDL0UsSUFBSSxvQ0FBcUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO29CQUM5RSxFQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO29CQUMzQyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssV0FBVyxFQUFFO29CQUMvRSxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUNwRTthQUNGO1lBRUQsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQztRQUVEOzs7Ozs7Ozs7V0FTRztRQUNILG9EQUF1QixHQUF2QixVQUMrQyxJQUFPO1lBQ3BELElBQU0sVUFBVSxHQUNaLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxFQUFDLElBQUksRUFBRSxtQkFBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUF6RCxDQUF5RCxDQUFDLENBQUM7WUFDeEYsSUFBSSwyQkFBMkIsR0FBRyxJQUFJLENBQUM7WUFFdkMsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsVUFBQSxDQUFDO2dCQUMzRCwyQkFBMkI7b0JBQ3ZCLDJCQUEyQixJQUFJLHVCQUF1QixDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDMUUsd0ZBQXdGO2dCQUN4RixPQUFPLENBQUMsMkJBQTJCLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUM7WUFFSCxPQUFPLEVBQUMsSUFBSSxNQUFBLEVBQUUsSUFBSSxFQUFFLFVBQVUsSUFBSSxJQUFJLEVBQUUsVUFBVSxZQUFBLEVBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQ7Ozs7Ozs7Ozs7V0FVRztRQUNILDhDQUFpQixHQUFqQixVQUFrQixLQUF1QjtZQUN2QyxJQUFJLGlCQUFNLE9BQU8sWUFBQyxLQUFLLENBQUM7Z0JBQUUsT0FBTyxpQkFBTSxpQkFBaUIsWUFBQyxLQUFLLENBQUMsQ0FBQztZQUVoRSx1RkFBdUY7WUFDdkYsSUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsMENBQTBDLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkYsSUFBSSxDQUFDLG1CQUFtQixFQUFFO2dCQUN4QixNQUFNLElBQUksS0FBSyxDQUNYLGdEQUE4QyxLQUEwQixDQUFDLE9BQU8sRUFBRSxPQUFHLENBQUMsQ0FBQzthQUM1RjtZQUVELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUdELDZDQUE2QztRQUU3Qzs7Ozs7Ozs7Ozs7O1dBWUc7UUFDTyw0RUFBK0MsR0FBekQsVUFBMEQsSUFBYTtZQUVyRSxJQUFJLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQztnQkFBRSxPQUFPLFNBQVMsQ0FBQztZQUV0RCxrQ0FBa0M7WUFDbEMsSUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25DLElBQUksQ0FBQyxRQUFRO2dCQUFFLE9BQU8sU0FBUyxDQUFDO1lBRWhDLHlEQUF5RDtZQUN6RCxJQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQy9FLElBQUksQ0FBQyxtQkFBbUI7Z0JBQUUsT0FBTyxTQUFTLENBQUM7WUFFM0MsNkNBQTZDO1lBQzdDLElBQU0sZ0JBQWdCLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdkQsSUFBTSxzQkFBc0IsR0FDeEIsZ0JBQWdCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzNFLElBQUksQ0FBQyxzQkFBc0I7Z0JBQUUsT0FBTyxTQUFTLENBQUM7WUFFOUMsOENBQThDO1lBQzlDLElBQUksc0JBQXNCLENBQUMsZ0JBQWdCLEtBQUssbUJBQW1CO2dCQUFFLE9BQU8sU0FBUyxDQUFDO1lBRXRGLE9BQU8sbUJBQW1CLENBQUM7UUFDN0IsQ0FBQztRQUVEOzs7Ozs7Ozs7Ozs7OztXQWNHO1FBQ08sdUVBQTBDLEdBQXBELFVBQXFELEtBQXVCO1lBRTFFLElBQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLCtDQUErQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdGLElBQUksQ0FBQyx3QkFBd0IsSUFBSSxDQUFDLHlCQUFpQixDQUFDLHdCQUF3QixDQUFDO2dCQUFFLE9BQU8sU0FBUyxDQUFDO1lBRWhHLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQWdCLENBQUM7UUFDeEYsQ0FBQztRQUVEOzs7Ozs7Ozs7OztXQVdHO1FBQ08sZ0VBQW1DLEdBQTdDLFVBQThDLFdBQXdCO1lBRXBFLElBQU0sV0FBVyxHQUNiLElBQUksQ0FBQywrQ0FBK0MsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUN2RixJQUFJLENBQUMsV0FBVztnQkFBRSxPQUFPLElBQUksQ0FBQztZQUU5QixJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDckMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUMzQztZQUVELElBQUksd0JBQXdCLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQ3pDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFFRDs7Ozs7OztXQU9HO1FBQ08sb0RBQXVCLEdBQWpDLFVBQ0ksV0FBd0IsRUFBRSxjQUF5QztZQUNyRSx1RkFBdUY7WUFDdkYsSUFBTSxtQkFBbUIsR0FDckIsSUFBSSxDQUFDLDBDQUEwQyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ2xGLElBQUksQ0FBQyxtQkFBbUI7Z0JBQUUsT0FBTyxFQUFFLENBQUM7WUFFcEMsT0FBTyxpQkFBTSx1QkFBdUIsWUFBQyxtQkFBbUIsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUM1RSxDQUFDO1FBRVMsa0RBQXFCLEdBQS9CLFVBQWdDLE1BQW1CO1lBQ2pELHVGQUF1RjtZQUN2RixJQUFNLG1CQUFtQixHQUNyQixJQUFJLENBQUMsMENBQTBDLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDN0UsSUFBSSxDQUFDLG1CQUFtQjtnQkFBRSxPQUFPLElBQUksQ0FBQztZQUV0QyxPQUFPLGlCQUFNLHFCQUFxQixZQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7V0FxQkc7UUFDTywyREFBOEIsR0FBeEMsVUFBeUMsdUJBQWtDO1lBQTNFLGlCQWNDO1lBYkMsSUFBTSxlQUFlLEdBQUcseUNBQTBCLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUM1RSxJQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUM1RCxJQUFNLFVBQVUsR0FBRyxlQUFlLElBQUksZUFBZSxDQUFDLFVBQVUsQ0FBQztZQUNqRSxJQUFJLFVBQVUsSUFBSSxFQUFFLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ3pELElBQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUM7Z0JBQ3JDLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLFNBQVM7b0JBQ3BELElBQU0sY0FBYyxHQUFHLFNBQVMsSUFBSSxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQztvQkFDbEUsSUFBTSxhQUFhLEdBQUcsU0FBUyxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksSUFBSSxDQUFDO29CQUN2RSxJQUFNLFVBQVUsR0FBRyxhQUFhLElBQUksS0FBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDO29CQUMxRSxPQUFPLEVBQUMsY0FBYyxnQkFBQSxFQUFFLFVBQVUsWUFBQSxFQUFDLENBQUM7Z0JBQ3RDLENBQUMsQ0FBQyxDQUFDO2FBQ0o7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRDs7Ozs7Ozs7Ozs7O1dBWUc7UUFDTywyQ0FBYyxHQUF4QixVQUF5QixNQUFpQixFQUFFLFVBQXdCLEVBQUUsUUFBa0I7WUFFdEYsSUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixJQUFJLE1BQU0sQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0RixJQUFNLGtCQUFrQixHQUFHLElBQUksSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvRCxJQUFJLGtCQUFrQixFQUFFO2dCQUN0QixJQUFNLFNBQU8sR0FBa0IsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLGtCQUFrQixDQUFDLE1BQU0sRUFBRTtvQkFDN0IsU0FBTyxDQUFDLElBQUksQ0FBQzt3QkFDWCxJQUFJLE1BQUE7d0JBQ0osY0FBYyxFQUFFLGtCQUFrQixDQUFDLE1BQU07d0JBQ3pDLElBQUksRUFBRSw0QkFBZSxDQUFDLE1BQU07d0JBQzVCLElBQUksRUFBRSxJQUFJO3dCQUNWLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTt3QkFDakIsUUFBUSxFQUFFLElBQUk7d0JBQ2QsS0FBSyxFQUFFLElBQUk7d0JBQ1gsUUFBUSxFQUFFLFFBQVEsSUFBSSxLQUFLO3dCQUMzQixVQUFVLEVBQUUsVUFBVSxJQUFJLEVBQUU7cUJBQzdCLENBQUMsQ0FBQztvQkFFSCwwRkFBMEY7b0JBQzFGLDBGQUEwRjtvQkFDMUYsMkVBQTJFO29CQUMzRSxVQUFVLEdBQUcsU0FBUyxDQUFDO2lCQUN4QjtnQkFDRCxJQUFJLGtCQUFrQixDQUFDLE1BQU0sRUFBRTtvQkFDN0IsU0FBTyxDQUFDLElBQUksQ0FBQzt3QkFDWCxJQUFJLE1BQUE7d0JBQ0osY0FBYyxFQUFFLGtCQUFrQixDQUFDLE1BQU07d0JBQ3pDLElBQUksRUFBRSw0QkFBZSxDQUFDLE1BQU07d0JBQzVCLElBQUksRUFBRSxJQUFJO3dCQUNWLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTt3QkFDakIsUUFBUSxFQUFFLElBQUk7d0JBQ2QsS0FBSyxFQUFFLElBQUk7d0JBQ1gsUUFBUSxFQUFFLFFBQVEsSUFBSSxLQUFLO3dCQUMzQixVQUFVLEVBQUUsVUFBVSxJQUFJLEVBQUU7cUJBQzdCLENBQUMsQ0FBQztpQkFDSjtnQkFDRCxPQUFPLFNBQU8sQ0FBQzthQUNoQjtZQUVELElBQU0sT0FBTyxHQUFHLGlCQUFNLGNBQWMsWUFBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ25FLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUEsTUFBTTtnQkFDL0IsSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyw0QkFBZSxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsUUFBUSxJQUFJLE1BQU0sQ0FBQyxJQUFJO29CQUNsRixFQUFFLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTTtvQkFDaEUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO29CQUN6QyxFQUFFLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ3JELGdEQUFnRDtvQkFDaEQsa0ZBQWtGO29CQUNsRix5Q0FBeUM7b0JBQ3pDLE1BQU0sQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2lCQUNsRDtZQUNILENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUVEOzs7Ozs7OztXQVFHO1FBQ08sa0RBQXFCLEdBQS9CLFVBQWdDLFdBQXdCO1lBQ3RELElBQU0sc0JBQXNCLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztZQUNuRSxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2pHLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUE5WUQsQ0FBd0Msb0NBQXFCLEdBOFk1RDtJQTlZWSxnREFBa0I7SUEwWi9COzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Bc0JHO0lBQ0gsU0FBUyxxQkFBcUIsQ0FBQyxJQUFhO1FBQzFDLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFFNUMsSUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUMzQixJQUFJLENBQUMsRUFBRSxDQUFDLDBCQUEwQixDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDO1lBQ3JFLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxnQkFBZ0I7WUFDdEUsT0FBTyxJQUFJLENBQUM7UUFFZCxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFFMUUsT0FBTztZQUNMLE1BQU0sRUFBRSw4QkFBOEIsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDO1lBQ3pELE1BQU0sRUFBRSw4QkFBOEIsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDO1NBQzFELENBQUM7SUFDSixDQUFDO0lBRUQsU0FBUyw4QkFBOEIsQ0FBQyxNQUFrQyxFQUFFLElBQVk7UUFDdEYsSUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ25DLFVBQUMsQ0FBQztZQUNFLE9BQUEsRUFBRSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUk7UUFBN0UsQ0FBNkUsQ0FBQyxDQUFDO1FBRXZGLE9BQU8sUUFBUSxJQUFJLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUM7SUFDbkcsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7T0FZRztJQUNILFNBQVMsK0NBQStDLENBQUMsSUFBYTtRQUVwRSxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNsQyxvRkFBb0Y7WUFFcEYsZ0JBQWdCO1lBQ2hCLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDNUIsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO2dCQUFFLE9BQU8sU0FBUyxDQUFDO1lBRTNELCtCQUErQjtZQUMvQixTQUFTLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztZQUM3QixJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQztnQkFBRSxPQUFPLFNBQVMsQ0FBQztZQUV4RSwyQkFBMkI7WUFDM0IsU0FBUyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDN0IsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUM7Z0JBQUUsT0FBTyxTQUFTLENBQUM7WUFFcEUsOEJBQThCO1lBQzlCLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBQzdCLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDO2dCQUFFLE9BQU8sU0FBUyxDQUFDO1lBRTdFLGlDQUFpQztZQUNqQyxTQUFTLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztZQUM3QixJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQztnQkFBRSxPQUFPLFNBQVMsQ0FBQztZQUV6RSx5RUFBeUU7WUFDekUsT0FBTyx5QkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7U0FDN0Q7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBRUQsU0FBZ0IsV0FBVyxDQUFDLFdBQTJCO1FBQ3JELElBQUksQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVztZQUNsRSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDMUQsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFDRCxJQUFNLElBQUksR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDO1FBQ3JDLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDbkMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUN6RCxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqQyxTQUFTLENBQUM7SUFDaEIsQ0FBQztJQVZELGtDQVVDO0lBRUQsU0FBUyxtQkFBbUIsQ0FBQyxJQUFjO1FBQ3pDLElBQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ25FLE9BQU8sZUFBZSxJQUFJLGVBQWUsQ0FBQyxVQUFVO1lBQzVDLEVBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDakQsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzVCLFNBQVMsQ0FBQztJQUNoQixDQUFDO0lBRUQsU0FBUyxrQkFBa0IsQ0FBQyxXQUFzQztRQUNoRSxPQUFPLFdBQVcsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUN4RCxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztZQUN4RCxTQUFTLENBQUM7SUFDaEIsQ0FBQztJQUVELFNBQVMsbUJBQW1CLENBQUMsT0FBc0I7UUFDakQsT0FBTyxFQUFFLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlDQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDdEYsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQW9CRztJQUNILFNBQVMsd0JBQXdCLENBQUMsV0FBbUM7UUFDbkUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFcEMsSUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLGNBQWM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUVsQyxPQUFPLGdDQUFnQyxDQUFDLGNBQWMsQ0FBQztZQUNuRCxpQ0FBaUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQ7Ozs7Ozs7OztPQVNHO0lBQ0gsU0FBUyxnQ0FBZ0MsQ0FBQyxTQUF1QjtRQUMvRCxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRXJELElBQU0sb0JBQW9CLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUM7UUFDcEUsSUFBSSxvQkFBb0IsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRXBELElBQU0sbUJBQW1CLEdBQUcsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDO1lBQzFDLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO1lBQ3BELE9BQU8sS0FBSyxDQUFDO1FBRWYsSUFBTSxXQUFXLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUFDO1FBQ3BELElBQUksQ0FBQyxXQUFXO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFL0IsT0FBTyw2QkFBNkIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBQ0Q7Ozs7Ozs7OztPQVNHO0lBQ0gsU0FBUyxpQ0FBaUMsQ0FBQyxTQUF1QjtRQUNoRSxJQUFJLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRW5ELElBQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUM7UUFDeEMsSUFBSSxDQUFDLFVBQVU7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUU5QixPQUFPLDZCQUE2QixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRDs7Ozs7Ozs7Ozs7O09BWUc7SUFDSCxTQUFTLDZCQUE2QixDQUFDLFVBQXlCO1FBQzlELElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDdkUsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVc7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUV0RSxJQUFNLElBQUksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQzdCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUU3RSxPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFRCxTQUFTLGNBQWMsQ0FBQyxVQUF5QjtRQUMvQyxPQUFPLFlBQVksQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQztZQUN2RSxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNILFNBQVMsZ0JBQWdCLENBQUMsVUFBeUI7UUFDakQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFeEYsSUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQztRQUN2QyxJQUFJLENBQUMsRUFBRSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQzNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDMUQsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxPQUFPO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFakQsSUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFbEUsSUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLElBQUksS0FBSyxXQUFXLENBQUM7SUFDdEYsQ0FBQztJQUVELFNBQVMsWUFBWSxDQUNqQixVQUF5QixFQUFFLFFBQTJCO1FBQ3hELE9BQU8sRUFBRSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQztJQUN6RixDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxJQUFhO1FBQ3RDLHNGQUFzRjtRQUN0RixxRkFBcUY7UUFDckYsMkRBQTJEO1FBQzNELE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7T0FhRztJQUNILFNBQVMsdUJBQXVCLENBQUMsU0FBdUIsRUFBRSxVQUF1QjtRQUMvRSxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLElBQUkscUJBQXFCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQztZQUMxRSxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxTQUFTLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzFGLElBQU0scUJBQXFCLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFXLG1CQUFtQjtZQUNqRixJQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLHFCQUFxQjtZQUNuRixJQUFJLG9DQUFxQixDQUFDLGFBQWEsQ0FBQyxFQUFFO2dCQUN4QyxJQUFNLGdCQUFjLEdBQUcscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDdkQsSUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUMxRCxJQUFJLGdCQUFjLEtBQUssY0FBYyxFQUFFO29CQUNyQyxJQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLElBQUksS0FBSyxnQkFBYyxFQUF6QixDQUF5QixDQUFDLENBQUM7b0JBQ2xFLElBQUksU0FBUyxFQUFFO3dCQUNiLFNBQVMsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7d0JBQ3ZELE9BQU8sSUFBSSxDQUFDO3FCQUNiO2lCQUNGO2FBQ0Y7U0FDRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELFNBQVMscUJBQXFCLENBQUMsVUFBeUI7UUFFdEQsT0FBTyxFQUFFLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDO1lBQ3BDLFVBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsdUJBQXVCO1lBQ3ZFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgQ2xhc3NTeW1ib2wsIEN0b3JQYXJhbWV0ZXIsIERlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIEZ1bmN0aW9uRGVmaW5pdGlvbiwgUGFyYW1ldGVyLCBpc05hbWVkVmFyaWFibGVEZWNsYXJhdGlvbiwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7Z2V0TmFtZVRleHQsIGhhc05hbWVJZGVudGlmaWVyfSBmcm9tICcuLi91dGlscyc7XG5cbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0LCBQYXJhbUluZm8sIGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sLCBpc0Fzc2lnbm1lbnRTdGF0ZW1lbnR9IGZyb20gJy4vZXNtMjAxNV9ob3N0JztcblxuXG5cbi8qKlxuICogRVNNNSBwYWNrYWdlcyBjb250YWluIEVDTUFTY3JpcHQgSUlGRSBmdW5jdGlvbnMgdGhhdCBhY3QgbGlrZSBjbGFzc2VzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIHZhciBDb21tb25Nb2R1bGUgPSAoZnVuY3Rpb24gKCkge1xuICogIGZ1bmN0aW9uIENvbW1vbk1vZHVsZSgpIHtcbiAqICB9XG4gKiAgQ29tbW9uTW9kdWxlLmRlY29yYXRvcnMgPSBbIC4uLiBdO1xuICogYGBgXG4gKlxuICogKiBcIkNsYXNzZXNcIiBhcmUgZGVjb3JhdGVkIGlmIHRoZXkgaGF2ZSBhIHN0YXRpYyBwcm9wZXJ0eSBjYWxsZWQgYGRlY29yYXRvcnNgLlxuICogKiBNZW1iZXJzIGFyZSBkZWNvcmF0ZWQgaWYgdGhlcmUgaXMgYSBtYXRjaGluZyBrZXkgb24gYSBzdGF0aWMgcHJvcGVydHlcbiAqICAgY2FsbGVkIGBwcm9wRGVjb3JhdG9yc2AuXG4gKiAqIENvbnN0cnVjdG9yIHBhcmFtZXRlcnMgZGVjb3JhdG9ycyBhcmUgZm91bmQgb24gYW4gb2JqZWN0IHJldHVybmVkIGZyb21cbiAqICAgYSBzdGF0aWMgbWV0aG9kIGNhbGxlZCBgY3RvclBhcmFtZXRlcnNgLlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIEVzbTVSZWZsZWN0aW9uSG9zdCBleHRlbmRzIEVzbTIwMTVSZWZsZWN0aW9uSG9zdCB7XG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiBub2RlIGFjdHVhbGx5IHJlcHJlc2VudHMgYSBjbGFzcy5cbiAgICovXG4gIGlzQ2xhc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgQ2xhc3NEZWNsYXJhdGlvbiB7IHJldHVybiAhIXRoaXMuZ2V0Q2xhc3NEZWNsYXJhdGlvbihub2RlKTsgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIGdpdmVuIGRlY2xhcmF0aW9uLCB3aGljaCBzaG91bGQgYmUgYSBcImNsYXNzXCIsIGhhcyBhIGJhc2UgXCJjbGFzc1wiLlxuICAgKlxuICAgKiBJbiBFUzUgY29kZSwgd2UgbmVlZCB0byBkZXRlcm1pbmUgaWYgdGhlIElJRkUgd3JhcHBlciB0YWtlcyBhIGBfc3VwZXJgIHBhcmFtZXRlciAuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICovXG4gIGhhc0Jhc2VDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIGlmIChzdXBlci5oYXNCYXNlQ2xhc3MoY2xhenopKSByZXR1cm4gdHJ1ZTtcblxuICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSB0aGlzLmdldENsYXNzRGVjbGFyYXRpb24oY2xhenopO1xuICAgIGlmICghY2xhc3NEZWNsYXJhdGlvbikgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgaWlmZUJvZHkgPSBnZXRJaWZlQm9keShjbGFzc0RlY2xhcmF0aW9uKTtcbiAgICBpZiAoIWlpZmVCb2R5KSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBpaWZlID0gaWlmZUJvZHkucGFyZW50O1xuICAgIGlmICghaWlmZSB8fCAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oaWlmZSkpIHJldHVybiBmYWxzZTtcblxuICAgIHJldHVybiBpaWZlLnBhcmFtZXRlcnMubGVuZ3RoID09PSAxICYmIGlzU3VwZXJJZGVudGlmaWVyKGlpZmUucGFyYW1ldGVyc1swXS5uYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbiBvZiBhIGNsYXNzIGdpdmVuIGEgbm9kZSB0aGF0IHdlIHRoaW5rIHJlcHJlc2VudHMgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBJbiBFUzUsIHRoZSBpbXBsZW1lbnRhdGlvbiBvZiBhIGNsYXNzIGlzIGEgZnVuY3Rpb24gZXhwcmVzc2lvbiB0aGF0IGlzIGhpZGRlbiBpbnNpZGUgYW4gSUlGRSxcbiAgICogd2hvc2UgdmFsdWUgaXMgYXNzaWduZWQgdG8gYSB2YXJpYWJsZSAod2hpY2ggcmVwcmVzZW50cyB0aGUgY2xhc3MgdG8gdGhlIHJlc3Qgb2YgdGhlIHByb2dyYW0pLlxuICAgKiBTbyB3ZSBtaWdodCBuZWVkIHRvIGRpZyBhcm91bmQgdG8gZ2V0IGhvbGQgb2YgdGhlIFwiY2xhc3NcIiBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogYG5vZGVgIG1pZ2h0IGJlIG9uZSBvZjpcbiAgICogLSBBIGNsYXNzIGRlY2xhcmF0aW9uIChmcm9tIGEgdHlwaW5ncyBmaWxlKS5cbiAgICogLSBUaGUgZGVjbGFyYXRpb24gb2YgdGhlIG91dGVyIHZhcmlhYmxlLCB3aGljaCBpcyBhc3NpZ25lZCB0aGUgcmVzdWx0IG9mIHRoZSBJSUZFLlxuICAgKiAtIFRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiBpbnNpZGUgdGhlIElJRkUsIHdoaWNoIGlzIGV2ZW50dWFsbHkgcmV0dXJuZWQgYW5kIGFzc2lnbmVkIHRvIHRoZVxuICAgKiAgIG91dGVyIHZhcmlhYmxlLlxuICAgKlxuICAgKiBUaGUgcmV0dXJuZWQgZGVjbGFyYXRpb24gaXMgZWl0aGVyIHRoZSBjbGFzcyBkZWNsYXJhdGlvbiAoZnJvbSB0aGUgdHlwaW5ncyBmaWxlKSBvciB0aGUgb3V0ZXJcbiAgICogdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIHRoZSBub2RlIHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3Mgd2hvc2UgZGVjbGFyYXRpb24gd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgY2xhc3Mgb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiLlxuICAgKi9cbiAgZ2V0Q2xhc3NEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogQ2xhc3NEZWNsYXJhdGlvbnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN1cGVyRGVjbGFyYXRpb24gPSBzdXBlci5nZXRDbGFzc0RlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGlmIChzdXBlckRlY2xhcmF0aW9uKSByZXR1cm4gc3VwZXJEZWNsYXJhdGlvbjtcblxuICAgIGNvbnN0IG91dGVyQ2xhc3MgPSBnZXRDbGFzc0RlY2xhcmF0aW9uRnJvbUlubmVyRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKTtcbiAgICBpZiAob3V0ZXJDbGFzcykgcmV0dXJuIG91dGVyQ2xhc3M7XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50LCBgbm9kZWAgY291bGQgYmUgdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIGFuIEVTNSBjbGFzcy5cbiAgICAvLyBJZiBzbywgZW5zdXJlIHRoYXQgaXQgaGFzIGEgYG5hbWVgIGlkZW50aWZpZXIgYW5kIHRoZSBjb3JyZWN0IHN0cnVjdHVyZS5cbiAgICBpZiAoIWlzTmFtZWRWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpIHx8XG4gICAgICAgICF0aGlzLmdldElubmVyRnVuY3Rpb25EZWNsYXJhdGlvbkZyb21DbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYWNlIGFuIGlkZW50aWZpZXIgdG8gaXRzIGRlY2xhcmF0aW9uLCBpZiBwb3NzaWJsZS5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgYXR0ZW1wdHMgdG8gcmVzb2x2ZSB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGdpdmVuIGlkZW50aWZpZXIsIHRyYWNpbmcgYmFjayB0aHJvdWdoXG4gICAqIGltcG9ydHMgYW5kIHJlLWV4cG9ydHMgdW50aWwgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIHN0YXRlbWVudCBpcyBmb3VuZC4gQSBgRGVjbGFyYXRpb25gXG4gICAqIG9iamVjdCBpcyByZXR1cm5lZCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYCBpcyByZXR1cm5lZCBvdGhlcndpc2UuXG4gICAqXG4gICAqIEluIEVTNSwgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY2xhc3MgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHRoYXQgaXMgaGlkZGVuIGluc2lkZSBhbiBJSUZFLlxuICAgKiBJZiB3ZSBhcmUgbG9va2luZyBmb3IgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBpbm5lciBmdW5jdGlvbiBleHByZXNzaW9uLCB3ZVxuICAgKiB3aWxsIGdldCBob2xkIG9mIHRoZSBvdXRlciBcImNsYXNzXCIgdmFyaWFibGUgZGVjbGFyYXRpb24gYW5kIHJldHVybiBpdHMgaWRlbnRpZmllciBpbnN0ZWFkLiBTZWVcbiAgICogYGdldENsYXNzRGVjbGFyYXRpb25Gcm9tSW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uKClgIGZvciBtb3JlIGluZm8uXG4gICAqXG4gICAqIEBwYXJhbSBpZCBhIFR5cGVTY3JpcHQgYHRzLklkZW50aWZpZXJgIHRvIHRyYWNlIGJhY2sgdG8gYSBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogQHJldHVybnMgbWV0YWRhdGEgYWJvdXQgdGhlIGBEZWNsYXJhdGlvbmAgaWYgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGlzIGZvdW5kLCBvciBgbnVsbGBcbiAgICogb3RoZXJ3aXNlLlxuICAgKi9cbiAgZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICAvLyBHZXQgdGhlIGlkZW50aWZpZXIgZm9yIHRoZSBvdXRlciBjbGFzcyBub2RlIChpZiBhbnkpLlxuICAgIGNvbnN0IG91dGVyQ2xhc3NOb2RlID0gZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24oaWQucGFyZW50KTtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHN1cGVyLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKG91dGVyQ2xhc3NOb2RlID8gb3V0ZXJDbGFzc05vZGUubmFtZSA6IGlkKTtcblxuICAgIGlmICghZGVjbGFyYXRpb24gfHwgIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbi5ub2RlKSB8fFxuICAgICAgICBkZWNsYXJhdGlvbi5ub2RlLmluaXRpYWxpemVyICE9PSB1bmRlZmluZWQgfHxcbiAgICAgICAgLy8gVmFyaWFibGVEZWNsYXJhdGlvbiA9PiBWYXJpYWJsZURlY2xhcmF0aW9uTGlzdCA9PiBWYXJpYWJsZVN0YXRlbWVudCA9PiBJSUZFIEJsb2NrXG4gICAgICAgICF0cy5pc0Jsb2NrKGRlY2xhcmF0aW9uLm5vZGUucGFyZW50LnBhcmVudC5wYXJlbnQpKSB7XG4gICAgICByZXR1cm4gZGVjbGFyYXRpb247XG4gICAgfVxuXG4gICAgLy8gV2UgbWlnaHQgaGF2ZSBhbiBhbGlhcyB0byBhbm90aGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgIC8vIFNlYXJjaCB0aGUgY29udGFpbmluZyBpaWZlIGJvZHkgZm9yIGl0LlxuICAgIGNvbnN0IGJsb2NrID0gZGVjbGFyYXRpb24ubm9kZS5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgICBjb25zdCBhbGlhc1N5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLm5vZGUubmFtZSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBibG9jay5zdGF0ZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBzdGF0ZW1lbnQgPSBibG9jay5zdGF0ZW1lbnRzW2ldO1xuICAgICAgLy8gTG9va2luZyBmb3Igc3RhdGVtZW50IHRoYXQgbG9va3MgbGlrZTogYEFsaWFzZWRWYXJpYWJsZSA9IE9yaWdpbmFsVmFyaWFibGU7YFxuICAgICAgaWYgKGlzQXNzaWdubWVudFN0YXRlbWVudChzdGF0ZW1lbnQpICYmIHRzLmlzSWRlbnRpZmllcihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0KSAmJlxuICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodCkgJiZcbiAgICAgICAgICB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0KSA9PT0gYWxpYXNTeW1ib2wpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoc3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWNsYXJhdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBhIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIHRvIGZpbmQgdGhlIHJlbGV2YW50IG1ldGFkYXRhIGFib3V0IGl0LlxuICAgKlxuICAgKiBJbiBFU001IHdlIG5lZWQgdG8gZG8gc3BlY2lhbCB3b3JrIHdpdGggb3B0aW9uYWwgYXJndW1lbnRzIHRvIHRoZSBmdW5jdGlvbiwgc2luY2UgdGhleSBnZXRcbiAgICogdGhlaXIgb3duIGluaXRpYWxpemVyIHN0YXRlbWVudCB0aGF0IG5lZWRzIHRvIGJlIHBhcnNlZCBhbmQgdGhlbiBub3QgaW5jbHVkZWQgaW4gdGhlIFwiYm9keVwiXG4gICAqIHN0YXRlbWVudHMgb2YgdGhlIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gdG8gcGFyc2UuXG4gICAqIEByZXR1cm5zIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBub2RlLCBzdGF0ZW1lbnRzIGFuZCBwYXJhbWV0ZXJzIG9mIHRoZSBmdW5jdGlvbi5cbiAgICovXG4gIGdldERlZmluaXRpb25PZkZ1bmN0aW9uPFQgZXh0ZW5kcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5GdW5jdGlvbkV4cHJlc3Npb24+KG5vZGU6IFQpOiBGdW5jdGlvbkRlZmluaXRpb248VD4ge1xuICAgIGNvbnN0IHBhcmFtZXRlcnMgPVxuICAgICAgICBub2RlLnBhcmFtZXRlcnMubWFwKHAgPT4gKHtuYW1lOiBnZXROYW1lVGV4dChwLm5hbWUpLCBub2RlOiBwLCBpbml0aWFsaXplcjogbnVsbH0pKTtcbiAgICBsZXQgbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzID0gdHJ1ZTtcblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBub2RlLmJvZHkgJiYgbm9kZS5ib2R5LnN0YXRlbWVudHMuZmlsdGVyKHMgPT4ge1xuICAgICAgbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzID1cbiAgICAgICAgICBsb29raW5nRm9yUGFyYW1Jbml0aWFsaXplcnMgJiYgcmVmbGVjdFBhcmFtSW5pdGlhbGl6ZXIocywgcGFyYW1ldGVycyk7XG4gICAgICAvLyBJZiB3ZSBhcmUgbm8gbG9uZ2VyIGxvb2tpbmcgZm9yIHBhcmFtZXRlciBpbml0aWFsaXplcnMgdGhlbiB3ZSBpbmNsdWRlIHRoaXMgc3RhdGVtZW50XG4gICAgICByZXR1cm4gIWxvb2tpbmdGb3JQYXJhbUluaXRpYWxpemVycztcbiAgICB9KTtcblxuICAgIHJldHVybiB7bm9kZSwgYm9keTogc3RhdGVtZW50cyB8fCBudWxsLCBwYXJhbWV0ZXJzfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gd2hpY2ggc2hvdWxkIGJlIG9mIGEgY2xhc3MsIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgdGhlIG1lbWJlcnMgb2YgdGhlXG4gICAqIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gYSBUeXBlU2NyaXB0IGB0cy5EZWNsYXJhdGlvbmAgbm9kZSByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG9cbiAgICogcmVmbGVjdC5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYENsYXNzTWVtYmVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIG1lbWJlcnMgb2YgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBAdGhyb3dzIGlmIGBkZWNsYXJhdGlvbmAgZG9lcyBub3QgcmVzb2x2ZSB0byBhIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgZ2V0TWVtYmVyc09mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDbGFzc01lbWJlcltdIHtcbiAgICBpZiAoc3VwZXIuaXNDbGFzcyhjbGF6eikpIHJldHVybiBzdXBlci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eik7XG5cbiAgICAvLyBUaGUgbmVjZXNzYXJ5IGluZm8gaXMgb24gdGhlIGlubmVyIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIChpbnNpZGUgdGhlIEVTNSBjbGFzcyBJSUZFKS5cbiAgICBjb25zdCBpbm5lckZ1bmN0aW9uU3ltYm9sID0gdGhpcy5nZXRJbm5lckZ1bmN0aW9uU3ltYm9sRnJvbUNsYXNzRGVjbGFyYXRpb24oY2xhenopO1xuICAgIGlmICghaW5uZXJGdW5jdGlvblN5bWJvbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBBdHRlbXB0ZWQgdG8gZ2V0IG1lbWJlcnMgb2YgYSBub24tY2xhc3M6IFwiJHsoY2xhenogYXMgQ2xhc3NEZWNsYXJhdGlvbikuZ2V0VGV4dCgpfVwiYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2V0TWVtYmVyc09mU3ltYm9sKGlubmVyRnVuY3Rpb25TeW1ib2wpO1xuICB9XG5cblxuICAvLy8vLy8vLy8vLy8vIFByb3RlY3RlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuICAvKipcbiAgICogR2V0IHRoZSBpbm5lciBmdW5jdGlvbiBkZWNsYXJhdGlvbiBvZiBhbiBFUzUtc3R5bGUgY2xhc3MuXG4gICAqXG4gICAqIEluIEVTNSwgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY2xhc3MgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHRoYXQgaXMgaGlkZGVuIGluc2lkZSBhbiBJSUZFXG4gICAqIGFuZCByZXR1cm5lZCB0byBiZSBhc3NpZ25lZCB0byBhIHZhcmlhYmxlIG91dHNpZGUgdGhlIElJRkUsIHdoaWNoIGlzIHdoYXQgdGhlIHJlc3Qgb2YgdGhlXG4gICAqIHByb2dyYW0gaW50ZXJhY3RzIHdpdGguXG4gICAqXG4gICAqIEdpdmVuIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbiwgd2Ugd2FudCB0byBnZXQgdG8gdGhlIGlubmVyIGZ1bmN0aW9uIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSBhIG5vZGUgdGhhdCBjb3VsZCBiZSB0aGUgdmFyaWFibGUgZXhwcmVzc2lvbiBvdXRzaWRlIGFuIEVTNSBjbGFzcyBJSUZFLlxuICAgKiBAcGFyYW0gY2hlY2tlciB0aGUgVFMgcHJvZ3JhbSBUeXBlQ2hlY2tlclxuICAgKiBAcmV0dXJucyB0aGUgaW5uZXIgZnVuY3Rpb24gZGVjbGFyYXRpb24gb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldElubmVyRnVuY3Rpb25EZWNsYXJhdGlvbkZyb21DbGFzc0RlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBpZiAoIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIEV4dHJhY3QgdGhlIElJRkUgYm9keSAoaWYgYW55KS5cbiAgICBjb25zdCBpaWZlQm9keSA9IGdldElpZmVCb2R5KG5vZGUpO1xuICAgIGlmICghaWlmZUJvZHkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAvLyBFeHRyYWN0IHRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiBmcm9tIGluc2lkZSB0aGUgSUlGRS5cbiAgICBjb25zdCBmdW5jdGlvbkRlY2xhcmF0aW9uID0gaWlmZUJvZHkuc3RhdGVtZW50cy5maW5kKHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbik7XG4gICAgaWYgKCFmdW5jdGlvbkRlY2xhcmF0aW9uKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgLy8gRXh0cmFjdCB0aGUgcmV0dXJuIGlkZW50aWZpZXIgb2YgdGhlIElJRkUuXG4gICAgY29uc3QgcmV0dXJuSWRlbnRpZmllciA9IGdldFJldHVybklkZW50aWZpZXIoaWlmZUJvZHkpO1xuICAgIGNvbnN0IHJldHVybklkZW50aWZpZXJTeW1ib2wgPVxuICAgICAgICByZXR1cm5JZGVudGlmaWVyICYmIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHJldHVybklkZW50aWZpZXIpO1xuICAgIGlmICghcmV0dXJuSWRlbnRpZmllclN5bWJvbCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIFZlcmlmeSB0aGF0IHRoZSBpbm5lciBmdW5jdGlvbiBpcyByZXR1cm5lZC5cbiAgICBpZiAocmV0dXJuSWRlbnRpZmllclN5bWJvbC52YWx1ZURlY2xhcmF0aW9uICE9PSBmdW5jdGlvbkRlY2xhcmF0aW9uKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uRGVjbGFyYXRpb247XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBpZGVudGlmaWVyIHN5bWJvbCBvZiB0aGUgaW5uZXIgZnVuY3Rpb24gZGVjbGFyYXRpb24gb2YgYW4gRVM1LXN0eWxlIGNsYXNzLlxuICAgKlxuICAgKiBJbiBFUzUsIHRoZSBpbXBsZW1lbnRhdGlvbiBvZiBhIGNsYXNzIGlzIGEgZnVuY3Rpb24gZXhwcmVzc2lvbiB0aGF0IGlzIGhpZGRlbiBpbnNpZGUgYW4gSUlGRVxuICAgKiBhbmQgcmV0dXJuZWQgdG8gYmUgYXNzaWduZWQgdG8gYSB2YXJpYWJsZSBvdXRzaWRlIHRoZSBJSUZFLCB3aGljaCBpcyB3aGF0IHRoZSByZXN0IG9mIHRoZVxuICAgKiBwcm9ncmFtIGludGVyYWN0cyB3aXRoLlxuICAgKlxuICAgKiBHaXZlbiB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24sIHdlIHdhbnQgdG8gZ2V0IHRvIHRoZSBpZGVudGlmaWVyIHN5bWJvbCBvZiB0aGUgaW5uZXJcbiAgICogZnVuY3Rpb24gZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiBhIG5vZGUgdGhhdCBjb3VsZCBiZSB0aGUgdmFyaWFibGUgZXhwcmVzc2lvbiBvdXRzaWRlIGFuIEVTNSBjbGFzcyBJSUZFLlxuICAgKiBAcGFyYW0gY2hlY2tlciB0aGUgVFMgcHJvZ3JhbSBUeXBlQ2hlY2tlclxuICAgKiBAcmV0dXJucyB0aGUgaW5uZXIgZnVuY3Rpb24gZGVjbGFyYXRpb24gaWRlbnRpZmllciBzeW1ib2wgb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiXG4gICAqIG9yIGhhcyBubyBpZGVudGlmaWVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldElubmVyRnVuY3Rpb25TeW1ib2xGcm9tQ2xhc3NEZWNsYXJhdGlvbihjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzU3ltYm9sXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBpbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24gPSB0aGlzLmdldElubmVyRnVuY3Rpb25EZWNsYXJhdGlvbkZyb21DbGFzc0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoIWlubmVyRnVuY3Rpb25EZWNsYXJhdGlvbiB8fCAhaGFzTmFtZUlkZW50aWZpZXIoaW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIHJldHVybiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24ubmFtZSkgYXMgQ2xhc3NTeW1ib2w7XG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgY2xhc3MgaWRlbnRpZmllZCBieSBpdHMgc3ltYm9sLlxuICAgKlxuICAgKiBJbiBFU001LCB0aGVyZSBpcyBubyBcImNsYXNzXCIgc28gdGhlIGNvbnN0cnVjdG9yIHRoYXQgd2Ugd2FudCBpcyBhY3R1YWxseSB0aGUgaW5uZXIgZnVuY3Rpb25cbiAgICogZGVjbGFyYXRpb24gaW5zaWRlIHRoZSBJSUZFLCB3aG9zZSByZXR1cm4gdmFsdWUgaXMgYXNzaWduZWQgdG8gdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uXG4gICAqICh0aGF0IHJlcHJlc2VudHMgdGhlIGNsYXNzIHRvIHRoZSByZXN0IG9mIHRoZSBwcm9ncmFtKS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBzeW1ib2wgb2YgdGhlIGNsYXNzIChpLmUuIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbikgd2hvc2VcbiAgICogcGFyYW1ldGVycyB3ZSB3YW50IHRvIGZpbmQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbmAgb2JqZWN0cyByZXByZXNlbnRpbmcgZWFjaCBvZiB0aGUgcGFyYW1ldGVycyBpblxuICAgKiB0aGUgY2xhc3MncyBjb25zdHJ1Y3RvciBvciBgbnVsbGAgaWYgdGhlcmUgaXMgbm8gY29uc3RydWN0b3IuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2w6IENsYXNzU3ltYm9sKTpcbiAgICAgIHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW118bnVsbCB7XG4gICAgY29uc3QgY29uc3RydWN0b3IgPVxuICAgICAgICB0aGlzLmdldElubmVyRnVuY3Rpb25EZWNsYXJhdGlvbkZyb21DbGFzc0RlY2xhcmF0aW9uKGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIGlmICghY29uc3RydWN0b3IpIHJldHVybiBudWxsO1xuXG4gICAgaWYgKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oY29uc3RydWN0b3IucGFyYW1ldGVycyk7XG4gICAgfVxuXG4gICAgaWYgKGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciBkZWNvcmF0b3JzIG9mIGEgY2xhc3MgY29uc3RydWN0b3IuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgc3ltYm9sIG9mIHRoZSBjbGFzcyAoaS5lLiB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24pIHdob3NlXG4gICAqIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcGFyYW0gcGFyYW1ldGVyTm9kZXMgdGhlIGFycmF5IG9mIFR5cGVTY3JpcHQgcGFyYW1ldGVyIG5vZGVzIGZvciB0aGlzIGNsYXNzJ3MgY29uc3RydWN0b3IuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBpbmZvIG9iamVjdHMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oXG4gICAgICBjbGFzc1N5bWJvbDogQ2xhc3NTeW1ib2wsIHBhcmFtZXRlck5vZGVzOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdKTogQ3RvclBhcmFtZXRlcltdIHtcbiAgICAvLyBUaGUgbmVjZXNzYXJ5IGluZm8gaXMgb24gdGhlIGlubmVyIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIChpbnNpZGUgdGhlIEVTNSBjbGFzcyBJSUZFKS5cbiAgICBjb25zdCBpbm5lckZ1bmN0aW9uU3ltYm9sID1cbiAgICAgICAgdGhpcy5nZXRJbm5lckZ1bmN0aW9uU3ltYm9sRnJvbUNsYXNzRGVjbGFyYXRpb24oY2xhc3NTeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgaWYgKCFpbm5lckZ1bmN0aW9uU3ltYm9sKSByZXR1cm4gW107XG5cbiAgICByZXR1cm4gc3VwZXIuZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oaW5uZXJGdW5jdGlvblN5bWJvbCwgcGFyYW1ldGVyTm9kZXMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldERlY29yYXRvcnNPZlN5bWJvbChzeW1ib2w6IENsYXNzU3ltYm9sKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgLy8gVGhlIG5lY2Vzc2FyeSBpbmZvIGlzIG9uIHRoZSBpbm5lciBmdW5jdGlvbiBkZWNsYXJhdGlvbiAoaW5zaWRlIHRoZSBFUzUgY2xhc3MgSUlGRSkuXG4gICAgY29uc3QgaW5uZXJGdW5jdGlvblN5bWJvbCA9XG4gICAgICAgIHRoaXMuZ2V0SW5uZXJGdW5jdGlvblN5bWJvbEZyb21DbGFzc0RlY2xhcmF0aW9uKHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICBpZiAoIWlubmVyRnVuY3Rpb25TeW1ib2wpIHJldHVybiBudWxsO1xuXG4gICAgcmV0dXJuIHN1cGVyLmdldERlY29yYXRvcnNPZlN5bWJvbChpbm5lckZ1bmN0aW9uU3ltYm9sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyxcbiAgICogd2hlcmUgdGhlIGluZm9ybWF0aW9uIGlzIHN0b3JlZCBvbiBhIHN0YXRpYyBtZXRob2Qgb2YgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBJbiB0aGlzIGNhc2UgdGhlIGRlY29yYXRvcnMgYXJlIHN0b3JlZCBpbiB0aGUgYm9keSBvZiBhIG1ldGhvZFxuICAgKiAoYGN0b3JQYXJhdGVtZXJzYCkgYXR0YWNoZWQgdG8gdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdW5saWtlIEVTTTIwMTUgdGhpcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gcmF0aGVyIHRoYW4gYW4gYXJyb3dcbiAgICogZnVuY3Rpb246XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gZnVuY3Rpb24oKSB7IHJldHVybiBbXG4gICAqICAgeyB0eXBlOiBWaWV3Q29udGFpbmVyUmVmLCB9LFxuICAgKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gICAqICAgeyB0eXBlOiBJdGVyYWJsZURpZmZlcnMsIH0sXG4gICAqICAgeyB0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7IHR5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOLF0gfSxdIH0sXG4gICAqIF07IH07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1EZWNvcmF0b3JzUHJvcGVydHkgdGhlIHByb3BlcnR5IHRoYXQgaG9sZHMgdGhlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgdGhlIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIGVhY2ggcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFBhcmFtSW5mb0Zyb21TdGF0aWNQcm9wZXJ0eShwYXJhbURlY29yYXRvcnNQcm9wZXJ0eTogdHMuU3ltYm9sKTogUGFyYW1JbmZvW118bnVsbCB7XG4gICAgY29uc3QgcGFyYW1EZWNvcmF0b3JzID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIGNvbnN0IHJldHVyblN0YXRlbWVudCA9IGdldFJldHVyblN0YXRlbWVudChwYXJhbURlY29yYXRvcnMpO1xuICAgIGNvbnN0IGV4cHJlc3Npb24gPSByZXR1cm5TdGF0ZW1lbnQgJiYgcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb247XG4gICAgaWYgKGV4cHJlc3Npb24gJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGV4cHJlc3Npb24pKSB7XG4gICAgICBjb25zdCBlbGVtZW50cyA9IGV4cHJlc3Npb24uZWxlbWVudHM7XG4gICAgICByZXR1cm4gZWxlbWVudHMubWFwKHJlZmxlY3RBcnJheUVsZW1lbnQpLm1hcChwYXJhbUluZm8gPT4ge1xuICAgICAgICBjb25zdCB0eXBlRXhwcmVzc2lvbiA9IHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uZ2V0KCd0eXBlJykgfHwgbnVsbDtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ySW5mbyA9IHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uZ2V0KCdkZWNvcmF0b3JzJykgfHwgbnVsbDtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvckluZm8gJiYgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JJbmZvKTtcbiAgICAgICAgcmV0dXJuIHt0eXBlRXhwcmVzc2lvbiwgZGVjb3JhdG9yc307XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIGEgc3ltYm9sIGFuZCBleHRyYWN0IHRoZSBtZW1iZXIgaW5mb3JtYXRpb24sIGNvbWJpbmluZyBpdCB3aXRoIHRoZVxuICAgKiBwcm92aWRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24sIGFuZCB3aGV0aGVyIGl0IGlzIGEgc3RhdGljIG1lbWJlci5cbiAgICpcbiAgICogSWYgYSBjbGFzcyBtZW1iZXIgdXNlcyBhY2Nlc3NvcnMgKGUuZyBnZXR0ZXJzIGFuZC9vciBzZXR0ZXJzKSB0aGVuIGl0IGdldHMgZG93bmxldmVsZWRcbiAgICogaW4gRVM1IHRvIGEgc2luZ2xlIGBPYmplY3QuZGVmaW5lUHJvcGVydHkoKWAgY2FsbC4gSW4gdGhhdCBjYXNlIHdlIG11c3QgcGFyc2UgdGhpc1xuICAgKiBjYWxsIHRvIGV4dHJhY3QgdGhlIG9uZSBvciB0d28gQ2xhc3NNZW1iZXIgb2JqZWN0cyB0aGF0IHJlcHJlc2VudCB0aGUgYWNjZXNzb3JzLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBzeW1ib2wgZm9yIHRoZSBtZW1iZXIgdG8gcmVmbGVjdCBvdmVyLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVycyhzeW1ib2w6IHRzLlN5bWJvbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLCBpc1N0YXRpYz86IGJvb2xlYW4pOlxuICAgICAgQ2xhc3NNZW1iZXJbXXxudWxsIHtcbiAgICBjb25zdCBub2RlID0gc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gfHwgc3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgIGNvbnN0IHByb3BlcnR5RGVmaW5pdGlvbiA9IG5vZGUgJiYgZ2V0UHJvcGVydHlEZWZpbml0aW9uKG5vZGUpO1xuICAgIGlmIChwcm9wZXJ0eURlZmluaXRpb24pIHtcbiAgICAgIGNvbnN0IG1lbWJlcnM6IENsYXNzTWVtYmVyW10gPSBbXTtcbiAgICAgIGlmIChwcm9wZXJ0eURlZmluaXRpb24uc2V0dGVyKSB7XG4gICAgICAgIG1lbWJlcnMucHVzaCh7XG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgICBpbXBsZW1lbnRhdGlvbjogcHJvcGVydHlEZWZpbml0aW9uLnNldHRlcixcbiAgICAgICAgICBraW5kOiBDbGFzc01lbWJlcktpbmQuU2V0dGVyLFxuICAgICAgICAgIHR5cGU6IG51bGwsXG4gICAgICAgICAgbmFtZTogc3ltYm9sLm5hbWUsXG4gICAgICAgICAgbmFtZU5vZGU6IG51bGwsXG4gICAgICAgICAgdmFsdWU6IG51bGwsXG4gICAgICAgICAgaXNTdGF0aWM6IGlzU3RhdGljIHx8IGZhbHNlLFxuICAgICAgICAgIGRlY29yYXRvcnM6IGRlY29yYXRvcnMgfHwgW10sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYXR0YWNoaW5nIHRoZSBkZWNvcmF0b3JzIHRvIGEgcG90ZW50aWFsIGdldHRlci4gSW4gRVM1LCB3ZSBjYW4ndCB0ZWxsIHdoZXJlIHRoZVxuICAgICAgICAvLyBkZWNvcmF0b3JzIHdlcmUgb3JpZ2luYWxseSBhdHRhY2hlZCB0bywgaG93ZXZlciB3ZSBvbmx5IHdhbnQgdG8gYXR0YWNoIHRoZW0gdG8gYSBzaW5nbGVcbiAgICAgICAgLy8gYENsYXNzTWVtYmVyYCBhcyBvdGhlcndpc2Ugbmd0c2Mgd291bGQgaGFuZGxlIHRoZSBzYW1lIGRlY29yYXRvcnMgdHdpY2UuXG4gICAgICAgIGRlY29yYXRvcnMgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBpZiAocHJvcGVydHlEZWZpbml0aW9uLmdldHRlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHByb3BlcnR5RGVmaW5pdGlvbi5nZXR0ZXIsXG4gICAgICAgICAga2luZDogQ2xhc3NNZW1iZXJLaW5kLkdldHRlcixcbiAgICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgICAgIG5hbWU6IHN5bWJvbC5uYW1lLFxuICAgICAgICAgIG5hbWVOb2RlOiBudWxsLFxuICAgICAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgICAgIGlzU3RhdGljOiBpc1N0YXRpYyB8fCBmYWxzZSxcbiAgICAgICAgICBkZWNvcmF0b3JzOiBkZWNvcmF0b3JzIHx8IFtdLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZW1iZXJzO1xuICAgIH1cblxuICAgIGNvbnN0IG1lbWJlcnMgPSBzdXBlci5yZWZsZWN0TWVtYmVycyhzeW1ib2wsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICBtZW1iZXJzICYmIG1lbWJlcnMuZm9yRWFjaChtZW1iZXIgPT4ge1xuICAgICAgaWYgKG1lbWJlciAmJiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZCAmJiBtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLm5vZGUgJiZcbiAgICAgICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihtZW1iZXIubm9kZSkgJiYgbWVtYmVyLm5vZGUucGFyZW50ICYmXG4gICAgICAgICAgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG1lbWJlci5ub2RlLnBhcmVudCkgJiZcbiAgICAgICAgICB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihtZW1iZXIubm9kZS5wYXJlbnQucmlnaHQpKSB7XG4gICAgICAgIC8vIFJlY29tcHV0ZSB0aGUgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWVtYmVyOlxuICAgICAgICAvLyBFUzUgc3RhdGljIG1ldGhvZHMgYXJlIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBzbyB0aGUgZGVjbGFyYXRpb24gaXMgYWN0dWFsbHkgdGhlXG4gICAgICAgIC8vIGluaXRpYWxpemVyIG9mIHRoZSB2YXJpYWJsZSBhc3NpZ25tZW50XG4gICAgICAgIG1lbWJlci5pbXBsZW1lbnRhdGlvbiA9IG1lbWJlci5ub2RlLnBhcmVudC5yaWdodDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbWVtYmVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgdGhhdCBtYXkgY29udGFpbiBjYWxscyB0byBhIGhlbHBlci5cbiAgICpcbiAgICogSW4gRVNNNSBjb2RlIHRoZSBoZWxwZXIgY2FsbHMgYXJlIGhpZGRlbiBpbnNpZGUgdGhlIGNsYXNzJ3MgSUlGRS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBoZWxwZXIgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uIFdlIGV4cGVjdCB0aGlzIHN5bWJvbFxuICAgKiB0byByZWZlcmVuY2UgdGhlIGlubmVyIGlkZW50aWZpZXIgaW5zaWRlIHRoZSBJSUZFLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBzdGF0ZW1lbnRzIHRoYXQgbWF5IGNvbnRhaW4gaGVscGVyIGNhbGxzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbDogQ2xhc3NTeW1ib2wpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvblBhcmVudCA9IGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24ucGFyZW50O1xuICAgIHJldHVybiB0cy5pc0Jsb2NrKGNsYXNzRGVjbGFyYXRpb25QYXJlbnQpID8gQXJyYXkuZnJvbShjbGFzc0RlY2xhcmF0aW9uUGFyZW50LnN0YXRlbWVudHMpIDogW107XG4gIH1cbn1cblxuLy8vLy8vLy8vLy8vLyBJbnRlcm5hbCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBkZXRhaWxzIGFib3V0IHByb3BlcnR5IGRlZmluaXRpb25zIHRoYXQgd2VyZSBzZXQgdXNpbmcgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eWAuXG4gKi9cbmludGVyZmFjZSBQcm9wZXJ0eURlZmluaXRpb24ge1xuICBzZXR0ZXI6IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbnxudWxsO1xuICBnZXR0ZXI6IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbnxudWxsO1xufVxuXG4vKipcbiAqIEluIEVTNSwgZ2V0dGVycyBhbmQgc2V0dGVycyBoYXZlIGJlZW4gZG93bmxldmVsZWQgaW50byBjYWxsIGV4cHJlc3Npb25zIG9mXG4gKiBgT2JqZWN0LmRlZmluZVByb3BlcnR5YCwgc3VjaCBhc1xuICpcbiAqIGBgYFxuICogT2JqZWN0LmRlZmluZVByb3BlcnR5KENsYXp6LnByb3RvdHlwZSwgXCJwcm9wZXJ0eVwiLCB7XG4gKiAgIGdldDogZnVuY3Rpb24gKCkge1xuICogICAgICAgcmV0dXJuICd2YWx1ZSc7XG4gKiAgIH0sXG4gKiAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gKiAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gKiAgIH0sXG4gKiAgIGVudW1lcmFibGU6IHRydWUsXG4gKiAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIGluc3BlY3RzIHRoZSBnaXZlbiBub2RlIHRvIGRldGVybWluZSBpZiBpdCBjb3JyZXNwb25kcyB3aXRoIHN1Y2ggYSBjYWxsLCBhbmQgaWYgc29cbiAqIGV4dHJhY3RzIHRoZSBgc2V0YCBhbmQgYGdldGAgZnVuY3Rpb24gZXhwcmVzc2lvbnMgZnJvbSB0aGUgZGVzY3JpcHRvciBvYmplY3QsIGlmIHRoZXkgZXhpc3QuXG4gKlxuICogQHBhcmFtIG5vZGUgVGhlIG5vZGUgdG8gb2J0YWluIHRoZSBwcm9wZXJ0eSBkZWZpbml0aW9uIGZyb20uXG4gKiBAcmV0dXJucyBUaGUgcHJvcGVydHkgZGVmaW5pdGlvbiBpZiB0aGUgbm9kZSBjb3JyZXNwb25kcyB3aXRoIGFjY2Vzc29yLCBudWxsIG90aGVyd2lzZS5cbiAqL1xuZnVuY3Rpb24gZ2V0UHJvcGVydHlEZWZpbml0aW9uKG5vZGU6IHRzLk5vZGUpOiBQcm9wZXJ0eURlZmluaXRpb258bnVsbCB7XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSkgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgZm4gPSBub2RlLmV4cHJlc3Npb247XG4gIGlmICghdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oZm4pIHx8ICF0cy5pc0lkZW50aWZpZXIoZm4uZXhwcmVzc2lvbikgfHxcbiAgICAgIGZuLmV4cHJlc3Npb24udGV4dCAhPT0gJ09iamVjdCcgfHwgZm4ubmFtZS50ZXh0ICE9PSAnZGVmaW5lUHJvcGVydHknKVxuICAgIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGRlc2NyaXB0b3IgPSBub2RlLmFyZ3VtZW50c1syXTtcbiAgaWYgKCFkZXNjcmlwdG9yIHx8ICF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGRlc2NyaXB0b3IpKSByZXR1cm4gbnVsbDtcblxuICByZXR1cm4ge1xuICAgIHNldHRlcjogcmVhZFByb3BlcnR5RnVuY3Rpb25FeHByZXNzaW9uKGRlc2NyaXB0b3IsICdzZXQnKSxcbiAgICBnZXR0ZXI6IHJlYWRQcm9wZXJ0eUZ1bmN0aW9uRXhwcmVzc2lvbihkZXNjcmlwdG9yLCAnZ2V0JyksXG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlYWRQcm9wZXJ0eUZ1bmN0aW9uRXhwcmVzc2lvbihvYmplY3Q6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uLCBuYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgcHJvcGVydHkgPSBvYmplY3QucHJvcGVydGllcy5maW5kKFxuICAgICAgKHApOiBwIGlzIHRzLlByb3BlcnR5QXNzaWdubWVudCA9PlxuICAgICAgICAgIHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHApICYmIHRzLmlzSWRlbnRpZmllcihwLm5hbWUpICYmIHAubmFtZS50ZXh0ID09PSBuYW1lKTtcblxuICByZXR1cm4gcHJvcGVydHkgJiYgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24ocHJvcGVydHkuaW5pdGlhbGl6ZXIpICYmIHByb3BlcnR5LmluaXRpYWxpemVyIHx8IG51bGw7XG59XG5cbi8qKlxuICogR2V0IHRoZSBhY3R1YWwgKG91dGVyKSBkZWNsYXJhdGlvbiBvZiBhIGNsYXNzLlxuICpcbiAqIEluIEVTNSwgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY2xhc3MgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHRoYXQgaXMgaGlkZGVuIGluc2lkZSBhbiBJSUZFIGFuZFxuICogcmV0dXJuZWQgdG8gYmUgYXNzaWduZWQgdG8gYSB2YXJpYWJsZSBvdXRzaWRlIHRoZSBJSUZFLCB3aGljaCBpcyB3aGF0IHRoZSByZXN0IG9mIHRoZSBwcm9ncmFtXG4gKiBpbnRlcmFjdHMgd2l0aC5cbiAqXG4gKiBHaXZlbiB0aGUgaW5uZXIgZnVuY3Rpb24gZGVjbGFyYXRpb24sIHdlIHdhbnQgdG8gZ2V0IHRvIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgb3V0ZXIgdmFyaWFibGVcbiAqIHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3MuXG4gKlxuICogQHBhcmFtIG5vZGUgYSBub2RlIHRoYXQgY291bGQgYmUgdGhlIGZ1bmN0aW9uIGV4cHJlc3Npb24gaW5zaWRlIGFuIEVTNSBjbGFzcyBJSUZFLlxuICogQHJldHVybnMgdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9yIGB1bmRlZmluZWRgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIi5cbiAqL1xuZnVuY3Rpb24gZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6XG4gICAgQ2xhc3NEZWNsYXJhdGlvbjx0cy5WYXJpYWJsZURlY2xhcmF0aW9uPnx1bmRlZmluZWQge1xuICBpZiAodHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgLy8gSXQgbWlnaHQgYmUgdGhlIGZ1bmN0aW9uIGV4cHJlc3Npb24gaW5zaWRlIHRoZSBJSUZFLiBXZSBuZWVkIHRvIGdvIDUgbGV2ZWxzIHVwLi4uXG5cbiAgICAvLyAxLiBJSUZFIGJvZHkuXG4gICAgbGV0IG91dGVyTm9kZSA9IG5vZGUucGFyZW50O1xuICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc0Jsb2NrKG91dGVyTm9kZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAvLyAyLiBJSUZFIGZ1bmN0aW9uIGV4cHJlc3Npb24uXG4gICAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcbiAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24ob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIDMuIElJRkUgY2FsbCBleHByZXNzaW9uLlxuICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzQ2FsbEV4cHJlc3Npb24ob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIDQuIFBhcmVudGhlc2lzIGFyb3VuZCBJSUZFLlxuICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24ob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIDUuIE91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgLy8gRmluYWxseSwgZW5zdXJlIHRoYXQgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGhhcyBhIGBuYW1lYCBpZGVudGlmaWVyLlxuICAgIHJldHVybiBoYXNOYW1lSWRlbnRpZmllcihvdXRlck5vZGUpID8gb3V0ZXJOb2RlIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldElpZmVCb2R5KGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLkJsb2NrfHVuZGVmaW5lZCB7XG4gIGlmICghdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSB8fCAhZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgfHxcbiAgICAgICF0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyKSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY2FsbCA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICByZXR1cm4gdHMuaXNDYWxsRXhwcmVzc2lvbihjYWxsLmV4cHJlc3Npb24pICYmXG4gICAgICAgICAgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uLmV4cHJlc3Npb24pID9cbiAgICAgIGNhbGwuZXhwcmVzc2lvbi5leHByZXNzaW9uLmJvZHkgOlxuICAgICAgdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBnZXRSZXR1cm5JZGVudGlmaWVyKGJvZHk6IHRzLkJsb2NrKTogdHMuSWRlbnRpZmllcnx1bmRlZmluZWQge1xuICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBib2R5LnN0YXRlbWVudHMuZmluZCh0cy5pc1JldHVyblN0YXRlbWVudCk7XG4gIHJldHVybiByZXR1cm5TdGF0ZW1lbnQgJiYgcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24gJiZcbiAgICAgICAgICB0cy5pc0lkZW50aWZpZXIocmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24pID9cbiAgICAgIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uIDpcbiAgICAgIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZ2V0UmV0dXJuU3RhdGVtZW50KGRlY2xhcmF0aW9uOiB0cy5FeHByZXNzaW9uIHwgdW5kZWZpbmVkKTogdHMuUmV0dXJuU3RhdGVtZW50fHVuZGVmaW5lZCB7XG4gIHJldHVybiBkZWNsYXJhdGlvbiAmJiB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihkZWNsYXJhdGlvbikgP1xuICAgICAgZGVjbGFyYXRpb24uYm9keS5zdGF0ZW1lbnRzLmZpbmQodHMuaXNSZXR1cm5TdGF0ZW1lbnQpIDpcbiAgICAgIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gcmVmbGVjdEFycmF5RWxlbWVudChlbGVtZW50OiB0cy5FeHByZXNzaW9uKSB7XG4gIHJldHVybiB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGVsZW1lbnQpID8gcmVmbGVjdE9iamVjdExpdGVyYWwoZWxlbWVudCkgOiBudWxsO1xufVxuXG4vKipcbiAqIEEgY29uc3RydWN0b3IgZnVuY3Rpb24gbWF5IGhhdmUgYmVlbiBcInN5bnRoZXNpemVkXCIgYnkgVHlwZVNjcmlwdCBkdXJpbmcgSmF2YVNjcmlwdCBlbWl0LFxuICogaW4gdGhlIGNhc2Ugbm8gdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGV4aXN0cyBhbmQgZS5nLiBwcm9wZXJ0eSBpbml0aWFsaXplcnMgYXJlIHVzZWQuXG4gKiBUaG9zZSBpbml0aWFsaXplcnMgbmVlZCB0byBiZSBlbWl0dGVkIGludG8gYSBjb25zdHJ1Y3RvciBpbiBKYXZhU2NyaXB0LCBzbyB0aGUgVHlwZVNjcmlwdFxuICogY29tcGlsZXIgZ2VuZXJhdGVzIGEgc3ludGhldGljIGNvbnN0cnVjdG9yLlxuICpcbiAqIFdlIG5lZWQgdG8gaWRlbnRpZnkgc3VjaCBjb25zdHJ1Y3RvcnMgYXMgbmdjYyBuZWVkcyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgYSBjbGFzcyBkaWRcbiAqIG9yaWdpbmFsbHkgaGF2ZSBhIGNvbnN0cnVjdG9yIGluIHRoZSBUeXBlU2NyaXB0IHNvdXJjZS4gRm9yIEVTNSwgd2UgY2FuIG5vdCB0ZWxsIGFuXG4gKiBlbXB0eSBjb25zdHJ1Y3RvciBhcGFydCBmcm9tIGEgc3ludGhlc2l6ZWQgY29uc3RydWN0b3IsIGJ1dCBmb3J0dW5hdGVseSB0aGF0IGRvZXMgbm90XG4gKiBtYXR0ZXIgZm9yIHRoZSBjb2RlIGdlbmVyYXRlZCBieSBuZ3RzYy5cbiAqXG4gKiBXaGVuIGEgY2xhc3MgaGFzIGEgc3VwZXJjbGFzcyBob3dldmVyLCBhIHN5bnRoZXNpemVkIGNvbnN0cnVjdG9yIG11c3Qgbm90IGJlIGNvbnNpZGVyZWRcbiAqIGFzIGEgdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGFzIHRoYXQgcHJldmVudHMgYSBiYXNlIGZhY3RvcnkgY2FsbCBmcm9tIGJlaW5nIGNyZWF0ZWQgYnlcbiAqIG5ndHNjLCByZXN1bHRpbmcgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uIHRoYXQgZG9lcyBub3QgaW5qZWN0IHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlXG4gKiBzdXBlcmNsYXNzLiBIZW5jZSwgd2UgaWRlbnRpZnkgYSBkZWZhdWx0IHN5bnRoZXNpemVkIHN1cGVyIGNhbGwgaW4gdGhlIGNvbnN0cnVjdG9yIGJvZHksXG4gKiBhY2NvcmRpbmcgdG8gdGhlIHN0cnVjdHVyZSB0aGF0IFR5cGVTY3JpcHQncyBFUzIwMTUgdG8gRVM1IHRyYW5zZm9ybWVyIGdlbmVyYXRlcyBpblxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuMi4yL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvZXMyMDE1LnRzI0wxMDgyLUwxMDk4XG4gKlxuICogQHBhcmFtIGNvbnN0cnVjdG9yIGEgY29uc3RydWN0b3IgZnVuY3Rpb24gdG8gdGVzdFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgY29uc3RydWN0b3IgYXBwZWFycyB0byBoYXZlIGJlZW4gc3ludGhlc2l6ZWRcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZENvbnN0cnVjdG9yKGNvbnN0cnVjdG9yOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIGlmICghY29uc3RydWN0b3IuYm9keSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGZpcnN0U3RhdGVtZW50ID0gY29uc3RydWN0b3IuYm9keS5zdGF0ZW1lbnRzWzBdO1xuICBpZiAoIWZpcnN0U3RhdGVtZW50KSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGlzU3ludGhlc2l6ZWRTdXBlclRoaXNBc3NpZ25tZW50KGZpcnN0U3RhdGVtZW50KSB8fFxuICAgICAgaXNTeW50aGVzaXplZFN1cGVyUmV0dXJuU3RhdGVtZW50KGZpcnN0U3RhdGVtZW50KTtcbn1cblxuLyoqXG4gKiBJZGVudGlmaWVzIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBvZiB0aGUgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIHZhciBfdGhpcyA9IF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHN0YXRlbWVudCBhIHN0YXRlbWVudCB0aGF0IG1heSBiZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCBsb29rcyBsaWtlIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbFxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkU3VwZXJUaGlzQXNzaWdubWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IHZhcmlhYmxlRGVjbGFyYXRpb25zID0gc3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnM7XG4gIGlmICh2YXJpYWJsZURlY2xhcmF0aW9ucy5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCB2YXJpYWJsZURlY2xhcmF0aW9uID0gdmFyaWFibGVEZWNsYXJhdGlvbnNbMF07XG4gIGlmICghdHMuaXNJZGVudGlmaWVyKHZhcmlhYmxlRGVjbGFyYXRpb24ubmFtZSkgfHxcbiAgICAgICF2YXJpYWJsZURlY2xhcmF0aW9uLm5hbWUudGV4dC5zdGFydHNXaXRoKCdfdGhpcycpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBpbml0aWFsaXplciA9IHZhcmlhYmxlRGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gIGlmICghaW5pdGlhbGl6ZXIpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gaXNTeW50aGVzaXplZERlZmF1bHRTdXBlckNhbGwoaW5pdGlhbGl6ZXIpO1xufVxuLyoqXG4gKiBJZGVudGlmaWVzIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBvZiB0aGUgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIHJldHVybiBfc3VwZXIgIT09IG51bGwgJiYgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgdGhpcztcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzdGF0ZW1lbnQgYSBzdGF0ZW1lbnQgdGhhdCBtYXkgYmUgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBzdGF0ZW1lbnQgbG9va3MgbGlrZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZFN1cGVyUmV0dXJuU3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogYm9vbGVhbiB7XG4gIGlmICghdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGV4cHJlc3Npb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjtcbiAgaWYgKCFleHByZXNzaW9uKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGlzU3ludGhlc2l6ZWREZWZhdWx0U3VwZXJDYWxsKGV4cHJlc3Npb24pO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gaXMgb2YgdGhlIGZvcm06XG4gKlxuICogYGBgXG4gKiBfc3VwZXIgIT09IG51bGwgJiYgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgdGhpcztcbiAqIGBgYFxuICpcbiAqIFRoaXMgc3RydWN0dXJlIGlzIGdlbmVyYXRlZCBieSBUeXBlU2NyaXB0IHdoZW4gdHJhbnNmb3JtaW5nIEVTMjAxNSB0byBFUzUsIHNlZVxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuMi4yL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvZXMyMDE1LnRzI0wxMTQ4LUwxMTYzXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gYW4gZXhwcmVzc2lvbiB0aGF0IG1heSByZXByZXNlbnQgYSBkZWZhdWx0IHN1cGVyIGNhbGxcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gY29ycmVzcG9uZHMgd2l0aCB0aGUgYWJvdmUgZm9ybVxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkRGVmYXVsdFN1cGVyQ2FsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIGlmICghaXNCaW5hcnlFeHByKGV4cHJlc3Npb24sIHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW4pKSByZXR1cm4gZmFsc2U7XG4gIGlmIChleHByZXNzaW9uLnJpZ2h0LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBsZWZ0ID0gZXhwcmVzc2lvbi5sZWZ0O1xuICBpZiAoIWlzQmluYXJ5RXhwcihsZWZ0LCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuKSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N1cGVyTm90TnVsbChsZWZ0LmxlZnQpICYmIGlzU3VwZXJBcHBseUNhbGwobGVmdC5yaWdodCk7XG59XG5cbmZ1bmN0aW9uIGlzU3VwZXJOb3ROdWxsKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIGlzQmluYXJ5RXhwcihleHByZXNzaW9uLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzRXF1YWxzVG9rZW4pICYmXG4gICAgICBpc1N1cGVySWRlbnRpZmllcihleHByZXNzaW9uLmxlZnQpO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gaXMgb2YgdGhlIGZvcm1cbiAqXG4gKiBgYGBcbiAqIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiBhbiBleHByZXNzaW9uIHRoYXQgbWF5IHJlcHJlc2VudCBhIGRlZmF1bHQgc3VwZXIgY2FsbFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgZXhwcmVzc2lvbiBjb3JyZXNwb25kcyB3aXRoIHRoZSBhYm92ZSBmb3JtXG4gKi9cbmZ1bmN0aW9uIGlzU3VwZXJBcHBseUNhbGwoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikgfHwgZXhwcmVzc2lvbi5hcmd1bWVudHMubGVuZ3RoICE9PSAyKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgdGFyZ2V0Rm4gPSBleHByZXNzaW9uLmV4cHJlc3Npb247XG4gIGlmICghdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24odGFyZ2V0Rm4pKSByZXR1cm4gZmFsc2U7XG4gIGlmICghaXNTdXBlcklkZW50aWZpZXIodGFyZ2V0Rm4uZXhwcmVzc2lvbikpIHJldHVybiBmYWxzZTtcbiAgaWYgKHRhcmdldEZuLm5hbWUudGV4dCAhPT0gJ2FwcGx5JykgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IHRoaXNBcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuICBpZiAodGhpc0FyZ3VtZW50LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBhcmd1bWVudHNBcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzFdO1xuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKGFyZ3VtZW50c0FyZ3VtZW50KSAmJiBhcmd1bWVudHNBcmd1bWVudC50ZXh0ID09PSAnYXJndW1lbnRzJztcbn1cblxuZnVuY3Rpb24gaXNCaW5hcnlFeHByKFxuICAgIGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24sIG9wZXJhdG9yOiB0cy5CaW5hcnlPcGVyYXRvcik6IGV4cHJlc3Npb24gaXMgdHMuQmluYXJ5RXhwcmVzc2lvbiB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24oZXhwcmVzc2lvbikgJiYgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IG9wZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBpc1N1cGVySWRlbnRpZmllcihub2RlOiB0cy5Ob2RlKTogYm9vbGVhbiB7XG4gIC8vIFZlcmlmeSB0aGF0IHRoZSBpZGVudGlmaWVyIGlzIHByZWZpeGVkIHdpdGggYF9zdXBlcmAuIFdlIGRvbid0IHRlc3QgZm9yIGVxdWl2YWxlbmNlXG4gIC8vIGFzIFR5cGVTY3JpcHQgbWF5IGhhdmUgc3VmZml4ZWQgdGhlIG5hbWUsIGUuZy4gYF9zdXBlcl8xYCB0byBhdm9pZCBuYW1lIGNvbmZsaWN0cy5cbiAgLy8gUmVxdWlyaW5nIG9ubHkgYSBwcmVmaXggc2hvdWxkIGJlIHN1ZmZpY2llbnRseSBhY2N1cmF0ZS5cbiAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihub2RlKSAmJiBub2RlLnRleHQuc3RhcnRzV2l0aCgnX3N1cGVyJyk7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIHN0YXRlbWVudCB0byBleHRyYWN0IHRoZSBFU001IHBhcmFtZXRlciBpbml0aWFsaXplciBpZiB0aGVyZSBpcyBvbmUuXG4gKiBJZiBvbmUgaXMgZm91bmQsIGFkZCBpdCB0byB0aGUgYXBwcm9wcmlhdGUgcGFyYW1ldGVyIGluIHRoZSBgcGFyYW1ldGVyc2AgY29sbGVjdGlvbi5cbiAqXG4gKiBUaGUgZm9ybSB3ZSBhcmUgbG9va2luZyBmb3IgaXM6XG4gKlxuICogYGBgXG4gKiBpZiAoYXJnID09PSB2b2lkIDApIHsgYXJnID0gaW5pdGlhbGl6ZXI7IH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzdGF0ZW1lbnQgYSBzdGF0ZW1lbnQgdGhhdCBtYXkgYmUgaW5pdGlhbGl6aW5nIGFuIG9wdGlvbmFsIHBhcmFtZXRlclxuICogQHBhcmFtIHBhcmFtZXRlcnMgdGhlIGNvbGxlY3Rpb24gb2YgcGFyYW1ldGVycyB0aGF0IHdlcmUgZm91bmQgaW4gdGhlIGZ1bmN0aW9uIGRlZmluaXRpb25cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCB3YXMgYSBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXJcbiAqL1xuZnVuY3Rpb24gcmVmbGVjdFBhcmFtSW5pdGlhbGl6ZXIoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQsIHBhcmFtZXRlcnM6IFBhcmFtZXRlcltdKSB7XG4gIGlmICh0cy5pc0lmU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgaXNVbmRlZmluZWRDb21wYXJpc29uKHN0YXRlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNCbG9jayhzdGF0ZW1lbnQudGhlblN0YXRlbWVudCkgJiYgc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCBpZlN0YXRlbWVudENvbXBhcmlzb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjsgICAgICAgICAgIC8vIChhcmcgPT09IHZvaWQgMClcbiAgICBjb25zdCB0aGVuU3RhdGVtZW50ID0gc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50c1swXTsgIC8vIGFyZyA9IGluaXRpYWxpemVyO1xuICAgIGlmIChpc0Fzc2lnbm1lbnRTdGF0ZW1lbnQodGhlblN0YXRlbWVudCkpIHtcbiAgICAgIGNvbnN0IGNvbXBhcmlzb25OYW1lID0gaWZTdGF0ZW1lbnRDb21wYXJpc29uLmxlZnQudGV4dDtcbiAgICAgIGNvbnN0IGFzc2lnbm1lbnROYW1lID0gdGhlblN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQudGV4dDtcbiAgICAgIGlmIChjb21wYXJpc29uTmFtZSA9PT0gYXNzaWdubWVudE5hbWUpIHtcbiAgICAgICAgY29uc3QgcGFyYW1ldGVyID0gcGFyYW1ldGVycy5maW5kKHAgPT4gcC5uYW1lID09PSBjb21wYXJpc29uTmFtZSk7XG4gICAgICAgIGlmIChwYXJhbWV0ZXIpIHtcbiAgICAgICAgICBwYXJhbWV0ZXIuaW5pdGlhbGl6ZXIgPSB0aGVuU3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQ7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZENvbXBhcmlzb24oZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGV4cHJlc3Npb24gaXMgdHMuRXhwcmVzc2lvbiZcbiAgICB7bGVmdDogdHMuSWRlbnRpZmllciwgcmlnaHQ6IHRzLkV4cHJlc3Npb259IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihleHByZXNzaW9uKSAmJlxuICAgICAgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW4gJiZcbiAgICAgIHRzLmlzVm9pZEV4cHJlc3Npb24oZXhwcmVzc2lvbi5yaWdodCkgJiYgdHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24ubGVmdCk7XG59XG4iXX0=