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
         * Determines whether the given declaration, which should be a "class", has a base "class".
         *
         * In ES5 code, we need to determine if the IIFE wrapper takes a `_super` parameter .
         *
         * @param clazz a `ClassDeclaration` representing the class over which to reflect.
         */
        Esm5ReflectionHost.prototype.hasBaseClass = function (clazz) {
            if (_super.prototype.hasBaseClass.call(this, clazz))
                return true;
            var classSymbol = this.getClassSymbol(clazz);
            if (classSymbol === undefined) {
                return false;
            }
            var iifeBody = getIifeBody(classSymbol.declaration.valueDeclaration);
            if (!iifeBody)
                return false;
            var iife = iifeBody.parent;
            if (!iife || !ts.isFunctionExpression(iife))
                return false;
            return iife.parameters.length === 1 && isSuperIdentifier(iife.parameters[0].name);
        };
        Esm5ReflectionHost.prototype.getBaseClassExpression = function (clazz) {
            var superBaseClassIdentifier = _super.prototype.getBaseClassExpression.call(this, clazz);
            if (superBaseClassIdentifier) {
                return superBaseClassIdentifier;
            }
            var classSymbol = this.getClassSymbol(clazz);
            if (classSymbol === undefined) {
                return null;
            }
            var iifeBody = getIifeBody(classSymbol.declaration.valueDeclaration);
            if (!iifeBody)
                return null;
            var iife = iifeBody.parent;
            if (!iife || !ts.isFunctionExpression(iife))
                return null;
            if (iife.parameters.length !== 1 || !isSuperIdentifier(iife.parameters[0].name)) {
                return null;
            }
            if (!ts.isCallExpression(iife.parent)) {
                return null;
            }
            return iife.parent.arguments[0];
        };
        Esm5ReflectionHost.prototype.getInternalNameOfClass = function (clazz) {
            var innerClass = this.getInnerFunctionDeclarationFromClassDeclaration(clazz);
            if (innerClass === undefined) {
                throw new Error("getInternalNameOfClass() called on a non-ES5 class: expected " + clazz.name.text + " to have an inner class declaration");
            }
            if (innerClass.name === undefined) {
                throw new Error("getInternalNameOfClass() called on a class with an anonymous inner declaration: expected a name on:\n" + innerClass.getText());
            }
            return innerClass.name;
        };
        Esm5ReflectionHost.prototype.getAdjacentNameOfClass = function (clazz) {
            return this.getInternalNameOfClass(clazz);
        };
        Esm5ReflectionHost.prototype.getEndOfClass = function (classSymbol) {
            var iifeBody = getIifeBody(classSymbol.declaration.valueDeclaration);
            if (!iifeBody) {
                throw new Error("Compiled class declaration is not inside an IIFE: " + classSymbol.name + " in " + classSymbol.declaration.valueDeclaration.getSourceFile().fileName);
            }
            var returnStatementIndex = iifeBody.statements.findIndex(ts.isReturnStatement);
            if (returnStatementIndex === -1) {
                throw new Error("Compiled class wrapper IIFE does not have a return statement: " + classSymbol.name + " in " + classSymbol.declaration.valueDeclaration.getSourceFile().fileName);
            }
            // Return the statement before the IIFE return statement
            return iifeBody.statements[returnStatementIndex - 1];
        };
        /**
         * In ES5, the implementation of a class is a function expression that is hidden inside an IIFE,
         * whose value is assigned to a variable (which represents the class to the rest of the program).
         * So we might need to dig around to get hold of the "class" declaration.
         *
         * This method extracts a `NgccClassSymbol` if `declaration` is the outer variable which is
         * assigned the result of the IIFE. Otherwise, undefined is returned.
         *
         * @param declaration the declaration whose symbol we are finding.
         * @returns the symbol for the node or `undefined` if it is not a "class" or has no symbol.
         */
        Esm5ReflectionHost.prototype.getClassSymbolFromOuterDeclaration = function (declaration) {
            var classSymbol = _super.prototype.getClassSymbolFromOuterDeclaration.call(this, declaration);
            if (classSymbol !== undefined) {
                return classSymbol;
            }
            if (!reflection_1.isNamedVariableDeclaration(declaration)) {
                return undefined;
            }
            var innerDeclaration = this.getInnerFunctionDeclarationFromClassDeclaration(declaration);
            if (innerDeclaration === undefined || !utils_1.hasNameIdentifier(innerDeclaration)) {
                return undefined;
            }
            return this.createClassSymbol(declaration, innerDeclaration);
        };
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
            var outerDeclaration = getClassDeclarationFromInnerFunctionDeclaration(declaration);
            if (outerDeclaration === null || !utils_1.hasNameIdentifier(outerDeclaration)) {
                return undefined;
            }
            return this.createClassSymbol(outerDeclaration, declaration);
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
            var superDeclaration = _super.prototype.getDeclarationOfIdentifier.call(this, id);
            if (superDeclaration === null || superDeclaration.node === null) {
                return superDeclaration;
            }
            // Get the identifier for the outer class node (if any).
            var outerClassNode = getClassDeclarationFromInnerFunctionDeclaration(superDeclaration.node);
            var declaration = outerClassNode !== null ?
                _super.prototype.getDeclarationOfIdentifier.call(this, outerClassNode.name) :
                superDeclaration;
            if (!declaration || declaration.node === null) {
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
            if (!ts.isFunctionDeclaration(node) && !ts.isMethodDeclaration(node) &&
                !ts.isFunctionExpression(node) && !ts.isVariableDeclaration(node)) {
                return null;
            }
            var tsHelperFn = getTsHelperFn(node);
            if (tsHelperFn !== null) {
                return {
                    node: node,
                    body: null,
                    helper: tsHelperFn,
                    parameters: [],
                };
            }
            // If the node was not identified to be a TypeScript helper, a variable declaration at this
            // point cannot be resolved as a function.
            if (ts.isVariableDeclaration(node)) {
                return null;
            }
            var parameters = node.parameters.map(function (p) { return ({ name: utils_1.getNameText(p.name), node: p, initializer: null }); });
            var lookingForParamInitializers = true;
            var statements = node.body && node.body.statements.filter(function (s) {
                lookingForParamInitializers =
                    lookingForParamInitializers && reflectParamInitializer(s, parameters);
                // If we are no longer looking for parameter initializers then we include this statement
                return !lookingForParamInitializers;
            });
            return { node: node, body: statements || null, helper: null, parameters: parameters };
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
        /**
         * Try to retrieve the symbol of a static property on a class.
         *
         * In ES5, a static property can either be set on the inner function declaration inside the class'
         * IIFE, or it can be set on the outer variable declaration. Therefore, the ES5 host checks both
         * places, first looking up the property on the inner symbol, and if the property is not found it
         * will fall back to looking up the property on the outer symbol.
         *
         * @param symbol the class whose property we are interested in.
         * @param propertyName the name of static property.
         * @returns the symbol if it is found or `undefined` if not.
         */
        Esm5ReflectionHost.prototype.getStaticProperty = function (symbol, propertyName) {
            // First lets see if the static property can be resolved from the inner class symbol.
            var prop = symbol.implementation.exports && symbol.implementation.exports.get(propertyName);
            if (prop !== undefined) {
                return prop;
            }
            // Otherwise, lookup the static properties on the outer class symbol.
            return symbol.declaration.exports && symbol.declaration.exports.get(propertyName);
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
                return null;
            // 2. IIFE function expression.
            outerNode = outerNode.parent;
            if (!outerNode || !ts.isFunctionExpression(outerNode))
                return null;
            // 3. IIFE call expression.
            outerNode = outerNode.parent;
            if (!outerNode || !ts.isCallExpression(outerNode))
                return null;
            // 4. Parenthesis around IIFE.
            outerNode = outerNode.parent;
            if (!outerNode || !ts.isParenthesizedExpression(outerNode))
                return null;
            // 5. Outer variable declaration.
            outerNode = outerNode.parent;
            if (!outerNode || !ts.isVariableDeclaration(outerNode))
                return null;
            // Finally, ensure that the variable declaration has a `name` identifier.
            return utils_1.hasNameIdentifier(outerNode) ? outerNode : null;
        }
        return null;
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
     * Inspects a function declaration to determine if it corresponds with a TypeScript helper function,
     * returning its kind if so or null if the declaration does not seem to correspond with such a
     * helper.
     */
    function getTsHelperFn(node) {
        var name = node.name !== undefined && ts.isIdentifier(node.name) ?
            utils_1.stripDollarSuffix(node.name.text) :
            null;
        switch (name) {
            case '__spread':
                return reflection_1.TsHelperFn.Spread;
            case '__spreadArrays':
                return reflection_1.TsHelperFn.SpreadArrays;
            default:
                return null;
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyx5RUFBa047SUFDbE4sOERBQTJFO0lBRTNFLGlGQUFtSDtJQUtuSDs7Ozs7Ozs7Ozs7Ozs7OztPQWdCRztJQUNIO1FBQXdDLDhDQUFxQjtRQUE3RDs7UUFpZEEsQ0FBQztRQWhkQzs7Ozs7O1dBTUc7UUFDSCx5Q0FBWSxHQUFaLFVBQWEsS0FBdUI7WUFDbEMsSUFBSSxpQkFBTSxZQUFZLFlBQUMsS0FBSyxDQUFDO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1lBRTNDLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDL0MsSUFBSSxXQUFXLEtBQUssU0FBUyxFQUFFO2dCQUM3QixPQUFPLEtBQUssQ0FBQzthQUNkO1lBRUQsSUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsUUFBUTtnQkFBRSxPQUFPLEtBQUssQ0FBQztZQUU1QixJQUFNLElBQUksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQzdCLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1lBRTFELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEYsQ0FBQztRQUVELG1EQUFzQixHQUF0QixVQUF1QixLQUF1QjtZQUM1QyxJQUFNLHdCQUF3QixHQUFHLGlCQUFNLHNCQUFzQixZQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3JFLElBQUksd0JBQXdCLEVBQUU7Z0JBQzVCLE9BQU8sd0JBQXdCLENBQUM7YUFDakM7WUFFRCxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9DLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRTtnQkFDN0IsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDdkUsSUFBSSxDQUFDLFFBQVE7Z0JBQUUsT0FBTyxJQUFJLENBQUM7WUFFM0IsSUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUM3QixJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQztnQkFBRSxPQUFPLElBQUksQ0FBQztZQUV6RCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQy9FLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxJQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDckMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUVELG1EQUFzQixHQUF0QixVQUF1QixLQUF1QjtZQUM1QyxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsK0NBQStDLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDL0UsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO2dCQUM1QixNQUFNLElBQUksS0FBSyxDQUNYLGtFQUFnRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksd0NBQXFDLENBQUMsQ0FBQzthQUMzSDtZQUNELElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQ1gsMEdBQXdHLFVBQVUsQ0FBQyxPQUFPLEVBQUksQ0FBQyxDQUFDO2FBQ3JJO1lBQ0QsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQ3pCLENBQUM7UUFFRCxtREFBc0IsR0FBdEIsVUFBdUIsS0FBdUI7WUFDNUMsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUVELDBDQUFhLEdBQWIsVUFBYyxXQUE0QjtZQUN4QyxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxRQUFRLEVBQUU7Z0JBQ2IsTUFBTSxJQUFJLEtBQUssQ0FDWCx1REFBcUQsV0FBVyxDQUFDLElBQUksWUFBTyxXQUFXLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVUsQ0FBQyxDQUFDO2FBQ3RKO1lBRUQsSUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUNqRixJQUFJLG9CQUFvQixLQUFLLENBQUMsQ0FBQyxFQUFFO2dCQUMvQixNQUFNLElBQUksS0FBSyxDQUNYLG1FQUFpRSxXQUFXLENBQUMsSUFBSSxZQUFPLFdBQVcsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBVSxDQUFDLENBQUM7YUFDbEs7WUFFRCx3REFBd0Q7WUFDeEQsT0FBTyxRQUFRLENBQUMsVUFBVSxDQUFDLG9CQUFvQixHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFDRDs7Ozs7Ozs7OztXQVVHO1FBQ08sK0RBQWtDLEdBQTVDLFVBQTZDLFdBQW9CO1lBQy9ELElBQU0sV0FBVyxHQUFHLGlCQUFNLGtDQUFrQyxZQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzFFLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRTtnQkFDN0IsT0FBTyxXQUFXLENBQUM7YUFDcEI7WUFFRCxJQUFJLENBQUMsdUNBQTBCLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQzVDLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUQsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsK0NBQStDLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDM0YsSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLElBQUksQ0FBQyx5QkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO2dCQUMxRSxPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUVELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFFRDs7Ozs7Ozs7OztXQVVHO1FBQ08sK0RBQWtDLEdBQTVDLFVBQTZDLFdBQW9CO1lBQy9ELElBQU0sV0FBVyxHQUFHLGlCQUFNLGtDQUFrQyxZQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzFFLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRTtnQkFDN0IsT0FBTyxXQUFXLENBQUM7YUFDcEI7WUFFRCxJQUFJLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMseUJBQWlCLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQzdFLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUQsSUFBTSxnQkFBZ0IsR0FBRywrQ0FBK0MsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN0RixJQUFJLGdCQUFnQixLQUFLLElBQUksSUFBSSxDQUFDLHlCQUFpQixDQUFDLGdCQUFnQixDQUFDLEVBQUU7Z0JBQ3JFLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUQsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVEOzs7Ozs7Ozs7Ozs7Ozs7O1dBZ0JHO1FBQ0gsdURBQTBCLEdBQTFCLFVBQTJCLEVBQWlCO1lBQzFDLElBQU0sZ0JBQWdCLEdBQUcsaUJBQU0sMEJBQTBCLFlBQUMsRUFBRSxDQUFDLENBQUM7WUFFOUQsSUFBSSxnQkFBZ0IsS0FBSyxJQUFJLElBQUksZ0JBQWdCLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDL0QsT0FBTyxnQkFBZ0IsQ0FBQzthQUN6QjtZQUVELHdEQUF3RDtZQUN4RCxJQUFNLGNBQWMsR0FBRywrQ0FBK0MsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5RixJQUFNLFdBQVcsR0FBRyxjQUFjLEtBQUssSUFBSSxDQUFDLENBQUM7Z0JBQ3pDLGlCQUFNLDBCQUEwQixZQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN2RCxnQkFBZ0IsQ0FBQztZQUVyQixJQUFJLENBQUMsV0FBVyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO2dCQUM3QyxPQUFPLFdBQVcsQ0FBQzthQUNwQjtZQUVELElBQUksQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVM7Z0JBQ3pGLG9GQUFvRjtnQkFDcEYsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDdEQsT0FBTyxXQUFXLENBQUM7YUFDcEI7WUFFRCwwREFBMEQ7WUFDMUQsMENBQTBDO1lBQzFDLElBQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDcEQsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzVFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDaEQsSUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEMsK0VBQStFO2dCQUMvRSxJQUFJLG9DQUFxQixDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7b0JBQzlFLEVBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7b0JBQzNDLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxXQUFXLEVBQUU7b0JBQy9FLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ3BFO2FBQ0Y7WUFFRCxPQUFPLFdBQVcsQ0FBQztRQUNyQixDQUFDO1FBRUQ7Ozs7Ozs7OztXQVNHO1FBQ0gsb0RBQXVCLEdBQXZCLFVBQXdCLElBQWE7WUFDbkMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ2hFLENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNyRSxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDdkIsT0FBTztvQkFDTCxJQUFJLE1BQUE7b0JBQ0osSUFBSSxFQUFFLElBQUk7b0JBQ1YsTUFBTSxFQUFFLFVBQVU7b0JBQ2xCLFVBQVUsRUFBRSxFQUFFO2lCQUNmLENBQUM7YUFDSDtZQUVELDJGQUEyRjtZQUMzRiwwQ0FBMEM7WUFDMUMsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2xDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxJQUFNLFVBQVUsR0FDWixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsRUFBQyxJQUFJLEVBQUUsbUJBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFDLENBQUMsRUFBekQsQ0FBeUQsQ0FBQyxDQUFDO1lBQ3hGLElBQUksMkJBQTJCLEdBQUcsSUFBSSxDQUFDO1lBRXZDLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFVBQUEsQ0FBQztnQkFDM0QsMkJBQTJCO29CQUN2QiwyQkFBMkIsSUFBSSx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzFFLHdGQUF3RjtnQkFDeEYsT0FBTyxDQUFDLDJCQUEyQixDQUFDO1lBQ3RDLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxFQUFDLElBQUksTUFBQSxFQUFFLElBQUksRUFBRSxVQUFVLElBQUksSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxZQUFBLEVBQUMsQ0FBQztRQUNwRSxDQUFDO1FBR0QsNkNBQTZDO1FBRTdDOzs7Ozs7Ozs7Ozs7V0FZRztRQUNPLDRFQUErQyxHQUF6RCxVQUEwRCxJQUFhO1lBRXJFLElBQUksQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDO2dCQUFFLE9BQU8sU0FBUyxDQUFDO1lBRXRELGtDQUFrQztZQUNsQyxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkMsSUFBSSxDQUFDLFFBQVE7Z0JBQUUsT0FBTyxTQUFTLENBQUM7WUFFaEMseURBQXlEO1lBQ3pELElBQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDL0UsSUFBSSxDQUFDLG1CQUFtQjtnQkFBRSxPQUFPLFNBQVMsQ0FBQztZQUUzQyw2Q0FBNkM7WUFDN0MsSUFBTSxnQkFBZ0IsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN2RCxJQUFNLHNCQUFzQixHQUN4QixnQkFBZ0IsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDM0UsSUFBSSxDQUFDLHNCQUFzQjtnQkFBRSxPQUFPLFNBQVMsQ0FBQztZQUU5Qyw4Q0FBOEM7WUFDOUMsSUFBSSxzQkFBc0IsQ0FBQyxnQkFBZ0IsS0FBSyxtQkFBbUI7Z0JBQUUsT0FBTyxTQUFTLENBQUM7WUFFdEYsT0FBTyxtQkFBbUIsQ0FBQztRQUM3QixDQUFDO1FBRUQ7Ozs7Ozs7Ozs7O1dBV0c7UUFDTyxnRUFBbUMsR0FBN0MsVUFBOEMsV0FBNEI7WUFFeEUsSUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQztZQUNoRSxJQUFJLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQztnQkFBRSxPQUFPLElBQUksQ0FBQztZQUV4RCxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDckMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUMzQztZQUVELElBQUksd0JBQXdCLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQ3pDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O1dBcUJHO1FBQ08sMkRBQThCLEdBQXhDLFVBQXlDLHVCQUFrQztZQUEzRSxpQkFxQkM7WUFwQkMsSUFBTSxlQUFlLEdBQUcseUNBQTBCLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUM1RSxzRUFBc0U7WUFDdEUsSUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDNUQsSUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUM7WUFDbEYsSUFBSSxVQUFVLElBQUksRUFBRSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUN6RCxJQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDO2dCQUNyQyxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxTQUFTO29CQUNwRCxJQUFNLGNBQWMsR0FBRyxTQUFTLElBQUksU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUMzRixJQUFNLGFBQWEsR0FDZixTQUFTLElBQUksU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUNwRixJQUFNLFVBQVUsR0FBRyxhQUFhLElBQUksS0FBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDO29CQUMxRSxPQUFPLEVBQUMsY0FBYyxnQkFBQSxFQUFFLFVBQVUsWUFBQSxFQUFDLENBQUM7Z0JBQ3RDLENBQUMsQ0FBQyxDQUFDO2FBQ0o7aUJBQU0sSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFO2dCQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDWiw2Q0FBNkMsR0FBRyxlQUFlLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUTtvQkFDcEYsS0FBSyxFQUNULGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2FBQ2hDO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQ7Ozs7Ozs7Ozs7OztXQVlHO1FBQ08sMkNBQWMsR0FBeEIsVUFBeUIsTUFBaUIsRUFBRSxVQUF3QixFQUFFLFFBQWtCO1lBRXRGLElBQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsSUFBSSxNQUFNLENBQUMsWUFBWSxJQUFJLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEYsSUFBTSxrQkFBa0IsR0FBRyxJQUFJLElBQUkscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDL0QsSUFBSSxrQkFBa0IsRUFBRTtnQkFDdEIsSUFBTSxTQUFPLEdBQWtCLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUU7b0JBQzdCLFNBQU8sQ0FBQyxJQUFJLENBQUM7d0JBQ1gsSUFBSSxNQUFBO3dCQUNKLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxNQUFNO3dCQUN6QyxJQUFJLEVBQUUsNEJBQWUsQ0FBQyxNQUFNO3dCQUM1QixJQUFJLEVBQUUsSUFBSTt3QkFDVixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7d0JBQ2pCLFFBQVEsRUFBRSxJQUFJO3dCQUNkLEtBQUssRUFBRSxJQUFJO3dCQUNYLFFBQVEsRUFBRSxRQUFRLElBQUksS0FBSzt3QkFDM0IsVUFBVSxFQUFFLFVBQVUsSUFBSSxFQUFFO3FCQUM3QixDQUFDLENBQUM7b0JBRUgsMEZBQTBGO29CQUMxRiwwRkFBMEY7b0JBQzFGLDJFQUEyRTtvQkFDM0UsVUFBVSxHQUFHLFNBQVMsQ0FBQztpQkFDeEI7Z0JBQ0QsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUU7b0JBQzdCLFNBQU8sQ0FBQyxJQUFJLENBQUM7d0JBQ1gsSUFBSSxNQUFBO3dCQUNKLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxNQUFNO3dCQUN6QyxJQUFJLEVBQUUsNEJBQWUsQ0FBQyxNQUFNO3dCQUM1QixJQUFJLEVBQUUsSUFBSTt3QkFDVixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7d0JBQ2pCLFFBQVEsRUFBRSxJQUFJO3dCQUNkLEtBQUssRUFBRSxJQUFJO3dCQUNYLFFBQVEsRUFBRSxRQUFRLElBQUksS0FBSzt3QkFDM0IsVUFBVSxFQUFFLFVBQVUsSUFBSSxFQUFFO3FCQUM3QixDQUFDLENBQUM7aUJBQ0o7Z0JBQ0QsT0FBTyxTQUFPLENBQUM7YUFDaEI7WUFFRCxJQUFNLE9BQU8sR0FBRyxpQkFBTSxjQUFjLFlBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNuRSxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFBLE1BQU07Z0JBQy9CLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssNEJBQWUsQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsSUFBSSxNQUFNLENBQUMsSUFBSTtvQkFDbEYsRUFBRSxDQUFDLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU07b0JBQ2hFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztvQkFDekMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUNyRCxnREFBZ0Q7b0JBQ2hELGtGQUFrRjtvQkFDbEYseUNBQXlDO29CQUN6QyxNQUFNLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztpQkFDbEQ7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFFRDs7Ozs7Ozs7V0FRRztRQUNPLGtEQUFxQixHQUEvQixVQUFnQyxXQUE0QjtZQUMxRCxJQUFNLHNCQUFzQixHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDO1lBQ2xGLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDakcsQ0FBQztRQUVEOzs7Ozs7Ozs7OztXQVdHO1FBQ08sOENBQWlCLEdBQTNCLFVBQTRCLE1BQXVCLEVBQUUsWUFBeUI7WUFFNUUscUZBQXFGO1lBQ3JGLElBQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM5RixJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQ3RCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxxRUFBcUU7WUFDckUsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDcEYsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQWpkRCxDQUF3QyxvQ0FBcUIsR0FpZDVEO0lBamRZLGdEQUFrQjtJQTZkL0I7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FzQkc7SUFDSCxTQUFTLHFCQUFxQixDQUFDLElBQWE7UUFDMUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7WUFBRSxPQUFPLElBQUksQ0FBQztRQUU1QyxJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQzNCLElBQUksQ0FBQyxFQUFFLENBQUMsMEJBQTBCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUM7WUFDckUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLGdCQUFnQjtZQUN0RSxPQUFPLElBQUksQ0FBQztRQUVkLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLENBQUM7WUFBRSxPQUFPLElBQUksQ0FBQztRQUUxRSxPQUFPO1lBQ0wsTUFBTSxFQUFFLDhCQUE4QixDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUM7WUFDekQsTUFBTSxFQUFFLDhCQUE4QixDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUM7U0FDMUQsQ0FBQztJQUNKLENBQUM7SUFFRCxTQUFTLDhCQUE4QixDQUFDLE1BQWtDLEVBQUUsSUFBWTtRQUN0RixJQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FDbkMsVUFBQyxDQUFDO1lBQ0UsT0FBQSxFQUFFLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSTtRQUE3RSxDQUE2RSxDQUFDLENBQUM7UUFFdkYsT0FBTyxRQUFRLElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQztJQUNuRyxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7OztPQVlHO0lBQ0gsU0FBUywrQ0FBK0MsQ0FBQyxJQUFhO1FBRXBFLElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2xDLG9GQUFvRjtZQUVwRixnQkFBZ0I7WUFDaEIsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUM1QixJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7Z0JBQUUsT0FBTyxJQUFJLENBQUM7WUFFdEQsK0JBQStCO1lBQy9CLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBQzdCLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1lBRW5FLDJCQUEyQjtZQUMzQixTQUFTLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztZQUM3QixJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQztnQkFBRSxPQUFPLElBQUksQ0FBQztZQUUvRCw4QkFBOEI7WUFDOUIsU0FBUyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDN0IsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLENBQUM7Z0JBQUUsT0FBTyxJQUFJLENBQUM7WUFFeEUsaUNBQWlDO1lBQ2pDLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBQzdCLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1lBRXBFLHlFQUF5RTtZQUN6RSxPQUFPLHlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztTQUN4RDtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELFNBQWdCLFdBQVcsQ0FBQyxXQUEyQjtRQUNyRCxJQUFJLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVc7WUFDbEUsQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQzFELE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBQ0QsSUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQztRQUNyQyxPQUFPLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ25DLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDekQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakMsU0FBUyxDQUFDO0lBQ2hCLENBQUM7SUFWRCxrQ0FVQztJQUVELFNBQVMsbUJBQW1CLENBQUMsSUFBYztRQUN6QyxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNuRSxPQUFPLGVBQWUsSUFBSSxlQUFlLENBQUMsVUFBVTtZQUM1QyxFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ2pELGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM1QixTQUFTLENBQUM7SUFDaEIsQ0FBQztJQUVELFNBQVMsa0JBQWtCLENBQUMsV0FBc0M7UUFDaEUsT0FBTyxXQUFXLElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDeEQsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFDeEQsU0FBUyxDQUFDO0lBQ2hCLENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLE9BQXNCO1FBQ2pELE9BQU8sRUFBRSxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQ0FBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3RGLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxhQUFhLENBQUMsSUFBeUI7UUFDOUMsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNoRSx5QkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDbkMsSUFBSSxDQUFDO1FBRVQsUUFBUSxJQUFJLEVBQUU7WUFDWixLQUFLLFVBQVU7Z0JBQ2IsT0FBTyx1QkFBVSxDQUFDLE1BQU0sQ0FBQztZQUMzQixLQUFLLGdCQUFnQjtnQkFDbkIsT0FBTyx1QkFBVSxDQUFDLFlBQVksQ0FBQztZQUNqQztnQkFDRSxPQUFPLElBQUksQ0FBQztTQUNmO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQW9CRztJQUNILFNBQVMsd0JBQXdCLENBQUMsV0FBbUM7UUFDbkUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFcEMsSUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLGNBQWM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUVsQyxPQUFPLGdDQUFnQyxDQUFDLGNBQWMsQ0FBQztZQUNuRCxpQ0FBaUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQ7Ozs7Ozs7OztPQVNHO0lBQ0gsU0FBUyxnQ0FBZ0MsQ0FBQyxTQUF1QjtRQUMvRCxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRXJELElBQU0sb0JBQW9CLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUM7UUFDcEUsSUFBSSxvQkFBb0IsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRXBELElBQU0sbUJBQW1CLEdBQUcsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDO1lBQzFDLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO1lBQ3BELE9BQU8sS0FBSyxDQUFDO1FBRWYsSUFBTSxXQUFXLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUFDO1FBQ3BELElBQUksQ0FBQyxXQUFXO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFL0IsT0FBTyw2QkFBNkIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBQ0Q7Ozs7Ozs7OztPQVNHO0lBQ0gsU0FBUyxpQ0FBaUMsQ0FBQyxTQUF1QjtRQUNoRSxJQUFJLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRW5ELElBQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUM7UUFDeEMsSUFBSSxDQUFDLFVBQVU7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUU5QixPQUFPLDZCQUE2QixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRDs7Ozs7Ozs7Ozs7O09BWUc7SUFDSCxTQUFTLDZCQUE2QixDQUFDLFVBQXlCO1FBQzlELElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDdkUsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVc7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUV0RSxJQUFNLElBQUksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQzdCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUU3RSxPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFRCxTQUFTLGNBQWMsQ0FBQyxVQUF5QjtRQUMvQyxPQUFPLFlBQVksQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQztZQUN2RSxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNILFNBQVMsZ0JBQWdCLENBQUMsVUFBeUI7UUFDakQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFeEYsSUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQztRQUN2QyxJQUFJLENBQUMsRUFBRSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQzNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDMUQsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxPQUFPO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFakQsSUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFbEUsSUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLElBQUksS0FBSyxXQUFXLENBQUM7SUFDdEYsQ0FBQztJQUVELFNBQVMsWUFBWSxDQUNqQixVQUF5QixFQUFFLFFBQTJCO1FBQ3hELE9BQU8sRUFBRSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQztJQUN6RixDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxJQUFhO1FBQ3RDLHNGQUFzRjtRQUN0RixxRkFBcUY7UUFDckYsMkRBQTJEO1FBQzNELE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7T0FhRztJQUNILFNBQVMsdUJBQXVCLENBQUMsU0FBdUIsRUFBRSxVQUF1QjtRQUMvRSxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLElBQUkscUJBQXFCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQztZQUMxRSxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxTQUFTLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzFGLElBQU0scUJBQXFCLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFXLG1CQUFtQjtZQUNqRixJQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLHFCQUFxQjtZQUNuRixJQUFJLG9DQUFxQixDQUFDLGFBQWEsQ0FBQyxFQUFFO2dCQUN4QyxJQUFNLGdCQUFjLEdBQUcscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDdkQsSUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUMxRCxJQUFJLGdCQUFjLEtBQUssY0FBYyxFQUFFO29CQUNyQyxJQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLElBQUksS0FBSyxnQkFBYyxFQUF6QixDQUF5QixDQUFDLENBQUM7b0JBQ2xFLElBQUksU0FBUyxFQUFFO3dCQUNiLFNBQVMsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7d0JBQ3ZELE9BQU8sSUFBSSxDQUFDO3FCQUNiO2lCQUNGO2FBQ0Y7U0FDRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELFNBQVMscUJBQXFCLENBQUMsVUFBeUI7UUFFdEQsT0FBTyxFQUFFLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDO1lBQ3BDLFVBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsdUJBQXVCO1lBQ3ZFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgRGVjbGFyYXRpb24sIERlY29yYXRvciwgRnVuY3Rpb25EZWZpbml0aW9uLCBQYXJhbWV0ZXIsIFRzSGVscGVyRm4sIGlzTmFtZWRWYXJpYWJsZURlY2xhcmF0aW9uLCByZWZsZWN0T2JqZWN0TGl0ZXJhbH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtnZXROYW1lVGV4dCwgaGFzTmFtZUlkZW50aWZpZXIsIHN0cmlwRG9sbGFyU3VmZml4fSBmcm9tICcuLi91dGlscyc7XG5cbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0LCBQYXJhbUluZm8sIGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sLCBpc0Fzc2lnbm1lbnRTdGF0ZW1lbnR9IGZyb20gJy4vZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7TmdjY0NsYXNzU3ltYm9sfSBmcm9tICcuL25nY2NfaG9zdCc7XG5cblxuXG4vKipcbiAqIEVTTTUgcGFja2FnZXMgY29udGFpbiBFQ01BU2NyaXB0IElJRkUgZnVuY3Rpb25zIHRoYXQgYWN0IGxpa2UgY2xhc3Nlcy4gRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiB2YXIgQ29tbW9uTW9kdWxlID0gKGZ1bmN0aW9uICgpIHtcbiAqICBmdW5jdGlvbiBDb21tb25Nb2R1bGUoKSB7XG4gKiAgfVxuICogIENvbW1vbk1vZHVsZS5kZWNvcmF0b3JzID0gWyAuLi4gXTtcbiAqIGBgYFxuICpcbiAqICogXCJDbGFzc2VzXCIgYXJlIGRlY29yYXRlZCBpZiB0aGV5IGhhdmUgYSBzdGF0aWMgcHJvcGVydHkgY2FsbGVkIGBkZWNvcmF0b3JzYC5cbiAqICogTWVtYmVycyBhcmUgZGVjb3JhdGVkIGlmIHRoZXJlIGlzIGEgbWF0Y2hpbmcga2V5IG9uIGEgc3RhdGljIHByb3BlcnR5XG4gKiAgIGNhbGxlZCBgcHJvcERlY29yYXRvcnNgLlxuICogKiBDb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIGRlY29yYXRvcnMgYXJlIGZvdW5kIG9uIGFuIG9iamVjdCByZXR1cm5lZCBmcm9tXG4gKiAgIGEgc3RhdGljIG1ldGhvZCBjYWxsZWQgYGN0b3JQYXJhbWV0ZXJzYC5cbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBFc201UmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBFc20yMDE1UmVmbGVjdGlvbkhvc3Qge1xuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBnaXZlbiBkZWNsYXJhdGlvbiwgd2hpY2ggc2hvdWxkIGJlIGEgXCJjbGFzc1wiLCBoYXMgYSBiYXNlIFwiY2xhc3NcIi5cbiAgICpcbiAgICogSW4gRVM1IGNvZGUsIHdlIG5lZWQgdG8gZGV0ZXJtaW5lIGlmIHRoZSBJSUZFIHdyYXBwZXIgdGFrZXMgYSBgX3N1cGVyYCBwYXJhbWV0ZXIgLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogYSBgQ2xhc3NEZWNsYXJhdGlvbmAgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvIHJlZmxlY3QuXG4gICAqL1xuICBoYXNCYXNlQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBpZiAoc3VwZXIuaGFzQmFzZUNsYXNzKGNsYXp6KSkgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woY2xhenopO1xuICAgIGlmIChjbGFzc1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgaWlmZUJvZHkgPSBnZXRJaWZlQm9keShjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICBpZiAoIWlpZmVCb2R5KSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBpaWZlID0gaWlmZUJvZHkucGFyZW50O1xuICAgIGlmICghaWlmZSB8fCAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oaWlmZSkpIHJldHVybiBmYWxzZTtcblxuICAgIHJldHVybiBpaWZlLnBhcmFtZXRlcnMubGVuZ3RoID09PSAxICYmIGlzU3VwZXJJZGVudGlmaWVyKGlpZmUucGFyYW1ldGVyc1swXS5uYW1lKTtcbiAgfVxuXG4gIGdldEJhc2VDbGFzc0V4cHJlc3Npb24oY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IHN1cGVyQmFzZUNsYXNzSWRlbnRpZmllciA9IHN1cGVyLmdldEJhc2VDbGFzc0V4cHJlc3Npb24oY2xhenopO1xuICAgIGlmIChzdXBlckJhc2VDbGFzc0lkZW50aWZpZXIpIHtcbiAgICAgIHJldHVybiBzdXBlckJhc2VDbGFzc0lkZW50aWZpZXI7XG4gICAgfVxuXG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGNsYXp6KTtcbiAgICBpZiAoY2xhc3NTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaWlmZUJvZHkgPSBnZXRJaWZlQm9keShjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICBpZiAoIWlpZmVCb2R5KSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGlpZmUgPSBpaWZlQm9keS5wYXJlbnQ7XG4gICAgaWYgKCFpaWZlIHx8ICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihpaWZlKSkgcmV0dXJuIG51bGw7XG5cbiAgICBpZiAoaWlmZS5wYXJhbWV0ZXJzLmxlbmd0aCAhPT0gMSB8fCAhaXNTdXBlcklkZW50aWZpZXIoaWlmZS5wYXJhbWV0ZXJzWzBdLm5hbWUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24oaWlmZS5wYXJlbnQpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gaWlmZS5wYXJlbnQuYXJndW1lbnRzWzBdO1xuICB9XG5cbiAgZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlubmVyQ2xhc3MgPSB0aGlzLmdldElubmVyRnVuY3Rpb25EZWNsYXJhdGlvbkZyb21DbGFzc0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoaW5uZXJDbGFzcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYGdldEludGVybmFsTmFtZU9mQ2xhc3MoKSBjYWxsZWQgb24gYSBub24tRVM1IGNsYXNzOiBleHBlY3RlZCAke2NsYXp6Lm5hbWUudGV4dH0gdG8gaGF2ZSBhbiBpbm5lciBjbGFzcyBkZWNsYXJhdGlvbmApO1xuICAgIH1cbiAgICBpZiAoaW5uZXJDbGFzcy5uYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcygpIGNhbGxlZCBvbiBhIGNsYXNzIHdpdGggYW4gYW5vbnltb3VzIGlubmVyIGRlY2xhcmF0aW9uOiBleHBlY3RlZCBhIG5hbWUgb246XFxuJHtpbm5lckNsYXNzLmdldFRleHQoKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGlubmVyQ2xhc3MubmFtZTtcbiAgfVxuXG4gIGdldEFkamFjZW50TmFtZU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyIHtcbiAgICByZXR1cm4gdGhpcy5nZXRJbnRlcm5hbE5hbWVPZkNsYXNzKGNsYXp6KTtcbiAgfVxuXG4gIGdldEVuZE9mQ2xhc3MoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IHRzLk5vZGUge1xuICAgIGNvbnN0IGlpZmVCb2R5ID0gZ2V0SWlmZUJvZHkoY2xhc3NTeW1ib2wuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbik7XG4gICAgaWYgKCFpaWZlQm9keSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBDb21waWxlZCBjbGFzcyBkZWNsYXJhdGlvbiBpcyBub3QgaW5zaWRlIGFuIElJRkU6ICR7Y2xhc3NTeW1ib2wubmFtZX0gaW4gJHtjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX1gKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXR1cm5TdGF0ZW1lbnRJbmRleCA9IGlpZmVCb2R5LnN0YXRlbWVudHMuZmluZEluZGV4KHRzLmlzUmV0dXJuU3RhdGVtZW50KTtcbiAgICBpZiAocmV0dXJuU3RhdGVtZW50SW5kZXggPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENvbXBpbGVkIGNsYXNzIHdyYXBwZXIgSUlGRSBkb2VzIG5vdCBoYXZlIGEgcmV0dXJuIHN0YXRlbWVudDogJHtjbGFzc1N5bWJvbC5uYW1lfSBpbiAke2NsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lfWApO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgc3RhdGVtZW50IGJlZm9yZSB0aGUgSUlGRSByZXR1cm4gc3RhdGVtZW50XG4gICAgcmV0dXJuIGlpZmVCb2R5LnN0YXRlbWVudHNbcmV0dXJuU3RhdGVtZW50SW5kZXggLSAxXTtcbiAgfVxuICAvKipcbiAgICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUsXG4gICAqIHdob3NlIHZhbHVlIGlzIGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgKHdoaWNoIHJlcHJlc2VudHMgdGhlIGNsYXNzIHRvIHRoZSByZXN0IG9mIHRoZSBwcm9ncmFtKS5cbiAgICogU28gd2UgbWlnaHQgbmVlZCB0byBkaWcgYXJvdW5kIHRvIGdldCBob2xkIG9mIHRoZSBcImNsYXNzXCIgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGV4dHJhY3RzIGEgYE5nY2NDbGFzc1N5bWJvbGAgaWYgYGRlY2xhcmF0aW9uYCBpcyB0aGUgb3V0ZXIgdmFyaWFibGUgd2hpY2ggaXNcbiAgICogYXNzaWduZWQgdGhlIHJlc3VsdCBvZiB0aGUgSUlGRS4gT3RoZXJ3aXNlLCB1bmRlZmluZWQgaXMgcmV0dXJuZWQuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiB0aGUgZGVjbGFyYXRpb24gd2hvc2Ugc3ltYm9sIHdlIGFyZSBmaW5kaW5nLlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGZvciB0aGUgbm9kZSBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIgb3IgaGFzIG5vIHN5bWJvbC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDbGFzc1N5bWJvbEZyb21PdXRlckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5Ob2RlKTogTmdjY0NsYXNzU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSBzdXBlci5nZXRDbGFzc1N5bWJvbEZyb21PdXRlckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoY2xhc3NTeW1ib2wgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGNsYXNzU3ltYm9sO1xuICAgIH1cblxuICAgIGlmICghaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGlubmVyRGVjbGFyYXRpb24gPSB0aGlzLmdldElubmVyRnVuY3Rpb25EZWNsYXJhdGlvbkZyb21DbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoaW5uZXJEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8ICFoYXNOYW1lSWRlbnRpZmllcihpbm5lckRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jcmVhdGVDbGFzc1N5bWJvbChkZWNsYXJhdGlvbiwgaW5uZXJEZWNsYXJhdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUsXG4gICAqIHdob3NlIHZhbHVlIGlzIGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgKHdoaWNoIHJlcHJlc2VudHMgdGhlIGNsYXNzIHRvIHRoZSByZXN0IG9mIHRoZSBwcm9ncmFtKS5cbiAgICogU28gd2UgbWlnaHQgbmVlZCB0byBkaWcgYXJvdW5kIHRvIGdldCBob2xkIG9mIHRoZSBcImNsYXNzXCIgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGV4dHJhY3RzIGEgYE5nY2NDbGFzc1N5bWJvbGAgaWYgYGRlY2xhcmF0aW9uYCBpcyB0aGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gaW5zaWRlXG4gICAqIHRoZSBJSUZFLiBPdGhlcndpc2UsIHVuZGVmaW5lZCBpcyByZXR1cm5lZC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIHRoZSBkZWNsYXJhdGlvbiB3aG9zZSBzeW1ib2wgd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIG9yIGB1bmRlZmluZWRgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIiBvciBoYXMgbm8gc3ltYm9sLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLk5vZGUpOiBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHN1cGVyLmdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgIGlmIChjbGFzc1N5bWJvbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gY2xhc3NTeW1ib2w7XG4gICAgfVxuXG4gICAgaWYgKCF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pIHx8ICFoYXNOYW1lSWRlbnRpZmllcihkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0ZXJEZWNsYXJhdGlvbiA9IGdldENsYXNzRGVjbGFyYXRpb25Gcm9tSW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAob3V0ZXJEZWNsYXJhdGlvbiA9PT0gbnVsbCB8fCAhaGFzTmFtZUlkZW50aWZpZXIob3V0ZXJEZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2xhc3NTeW1ib2wob3V0ZXJEZWNsYXJhdGlvbiwgZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYWNlIGFuIGlkZW50aWZpZXIgdG8gaXRzIGRlY2xhcmF0aW9uLCBpZiBwb3NzaWJsZS5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgYXR0ZW1wdHMgdG8gcmVzb2x2ZSB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGdpdmVuIGlkZW50aWZpZXIsIHRyYWNpbmcgYmFjayB0aHJvdWdoXG4gICAqIGltcG9ydHMgYW5kIHJlLWV4cG9ydHMgdW50aWwgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIHN0YXRlbWVudCBpcyBmb3VuZC4gQSBgRGVjbGFyYXRpb25gXG4gICAqIG9iamVjdCBpcyByZXR1cm5lZCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYCBpcyByZXR1cm5lZCBvdGhlcndpc2UuXG4gICAqXG4gICAqIEluIEVTNSwgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY2xhc3MgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHRoYXQgaXMgaGlkZGVuIGluc2lkZSBhbiBJSUZFLlxuICAgKiBJZiB3ZSBhcmUgbG9va2luZyBmb3IgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBpbm5lciBmdW5jdGlvbiBleHByZXNzaW9uLCB3ZVxuICAgKiB3aWxsIGdldCBob2xkIG9mIHRoZSBvdXRlciBcImNsYXNzXCIgdmFyaWFibGUgZGVjbGFyYXRpb24gYW5kIHJldHVybiBpdHMgaWRlbnRpZmllciBpbnN0ZWFkLiBTZWVcbiAgICogYGdldENsYXNzRGVjbGFyYXRpb25Gcm9tSW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uKClgIGZvciBtb3JlIGluZm8uXG4gICAqXG4gICAqIEBwYXJhbSBpZCBhIFR5cGVTY3JpcHQgYHRzLklkZW50aWZpZXJgIHRvIHRyYWNlIGJhY2sgdG8gYSBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogQHJldHVybnMgbWV0YWRhdGEgYWJvdXQgdGhlIGBEZWNsYXJhdGlvbmAgaWYgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGlzIGZvdW5kLCBvciBgbnVsbGBcbiAgICogb3RoZXJ3aXNlLlxuICAgKi9cbiAgZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBzdXBlckRlY2xhcmF0aW9uID0gc3VwZXIuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQpO1xuXG4gICAgaWYgKHN1cGVyRGVjbGFyYXRpb24gPT09IG51bGwgfHwgc3VwZXJEZWNsYXJhdGlvbi5ub2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gc3VwZXJEZWNsYXJhdGlvbjtcbiAgICB9XG5cbiAgICAvLyBHZXQgdGhlIGlkZW50aWZpZXIgZm9yIHRoZSBvdXRlciBjbGFzcyBub2RlIChpZiBhbnkpLlxuICAgIGNvbnN0IG91dGVyQ2xhc3NOb2RlID0gZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24oc3VwZXJEZWNsYXJhdGlvbi5ub2RlKTtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IG91dGVyQ2xhc3NOb2RlICE9PSBudWxsID9cbiAgICAgICAgc3VwZXIuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIob3V0ZXJDbGFzc05vZGUubmFtZSkgOlxuICAgICAgICBzdXBlckRlY2xhcmF0aW9uO1xuXG4gICAgaWYgKCFkZWNsYXJhdGlvbiB8fCBkZWNsYXJhdGlvbi5ub2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZGVjbGFyYXRpb247XG4gICAgfVxuXG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24ubm9kZSkgfHwgZGVjbGFyYXRpb24ubm9kZS5pbml0aWFsaXplciAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIC8vIFZhcmlhYmxlRGVjbGFyYXRpb24gPT4gVmFyaWFibGVEZWNsYXJhdGlvbkxpc3QgPT4gVmFyaWFibGVTdGF0ZW1lbnQgPT4gSUlGRSBCbG9ja1xuICAgICAgICAhdHMuaXNCbG9jayhkZWNsYXJhdGlvbi5ub2RlLnBhcmVudC5wYXJlbnQucGFyZW50KSkge1xuICAgICAgcmV0dXJuIGRlY2xhcmF0aW9uO1xuICAgIH1cblxuICAgIC8vIFdlIG1pZ2h0IGhhdmUgYW4gYWxpYXMgdG8gYW5vdGhlciB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICAvLyBTZWFyY2ggdGhlIGNvbnRhaW5pbmcgaWlmZSBib2R5IGZvciBpdC5cbiAgICBjb25zdCBibG9jayA9IGRlY2xhcmF0aW9uLm5vZGUucGFyZW50LnBhcmVudC5wYXJlbnQ7XG4gICAgY29uc3QgYWxpYXNTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihkZWNsYXJhdGlvbi5ub2RlLm5hbWUpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYmxvY2suc3RhdGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgc3RhdGVtZW50ID0gYmxvY2suc3RhdGVtZW50c1tpXTtcbiAgICAgIC8vIExvb2tpbmcgZm9yIHN0YXRlbWVudCB0aGF0IGxvb2tzIGxpa2U6IGBBbGlhc2VkVmFyaWFibGUgPSBPcmlnaW5hbFZhcmlhYmxlO2BcbiAgICAgIGlmIChpc0Fzc2lnbm1lbnRTdGF0ZW1lbnQoc3RhdGVtZW50KSAmJiB0cy5pc0lkZW50aWZpZXIoc3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdCkgJiZcbiAgICAgICAgICB0cy5pc0lkZW50aWZpZXIoc3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQpICYmXG4gICAgICAgICAgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oc3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdCkgPT09IGFsaWFzU3ltYm9sKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLnJpZ2h0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVjbGFyYXRpb247XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgYSBmdW5jdGlvbiBkZWNsYXJhdGlvbiB0byBmaW5kIHRoZSByZWxldmFudCBtZXRhZGF0YSBhYm91dCBpdC5cbiAgICpcbiAgICogSW4gRVNNNSB3ZSBuZWVkIHRvIGRvIHNwZWNpYWwgd29yayB3aXRoIG9wdGlvbmFsIGFyZ3VtZW50cyB0byB0aGUgZnVuY3Rpb24sIHNpbmNlIHRoZXkgZ2V0XG4gICAqIHRoZWlyIG93biBpbml0aWFsaXplciBzdGF0ZW1lbnQgdGhhdCBuZWVkcyB0byBiZSBwYXJzZWQgYW5kIHRoZW4gbm90IGluY2x1ZGVkIGluIHRoZSBcImJvZHlcIlxuICAgKiBzdGF0ZW1lbnRzIG9mIHRoZSBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgdGhlIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIHRvIHBhcnNlLlxuICAgKiBAcmV0dXJucyBhbiBvYmplY3QgY29udGFpbmluZyB0aGUgbm9kZSwgc3RhdGVtZW50cyBhbmQgcGFyYW1ldGVycyBvZiB0aGUgZnVuY3Rpb24uXG4gICAqL1xuICBnZXREZWZpbml0aW9uT2ZGdW5jdGlvbihub2RlOiB0cy5Ob2RlKTogRnVuY3Rpb25EZWZpbml0aW9ufG51bGwge1xuICAgIGlmICghdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpICYmICF0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpICYmXG4gICAgICAgICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihub2RlKSAmJiAhdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0c0hlbHBlckZuID0gZ2V0VHNIZWxwZXJGbihub2RlKTtcbiAgICBpZiAodHNIZWxwZXJGbiAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbm9kZSxcbiAgICAgICAgYm9keTogbnVsbCxcbiAgICAgICAgaGVscGVyOiB0c0hlbHBlckZuLFxuICAgICAgICBwYXJhbWV0ZXJzOiBbXSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIG5vZGUgd2FzIG5vdCBpZGVudGlmaWVkIHRvIGJlIGEgVHlwZVNjcmlwdCBoZWxwZXIsIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gYXQgdGhpc1xuICAgIC8vIHBvaW50IGNhbm5vdCBiZSByZXNvbHZlZCBhcyBhIGZ1bmN0aW9uLlxuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcmFtZXRlcnMgPVxuICAgICAgICBub2RlLnBhcmFtZXRlcnMubWFwKHAgPT4gKHtuYW1lOiBnZXROYW1lVGV4dChwLm5hbWUpLCBub2RlOiBwLCBpbml0aWFsaXplcjogbnVsbH0pKTtcbiAgICBsZXQgbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzID0gdHJ1ZTtcblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBub2RlLmJvZHkgJiYgbm9kZS5ib2R5LnN0YXRlbWVudHMuZmlsdGVyKHMgPT4ge1xuICAgICAgbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzID1cbiAgICAgICAgICBsb29raW5nRm9yUGFyYW1Jbml0aWFsaXplcnMgJiYgcmVmbGVjdFBhcmFtSW5pdGlhbGl6ZXIocywgcGFyYW1ldGVycyk7XG4gICAgICAvLyBJZiB3ZSBhcmUgbm8gbG9uZ2VyIGxvb2tpbmcgZm9yIHBhcmFtZXRlciBpbml0aWFsaXplcnMgdGhlbiB3ZSBpbmNsdWRlIHRoaXMgc3RhdGVtZW50XG4gICAgICByZXR1cm4gIWxvb2tpbmdGb3JQYXJhbUluaXRpYWxpemVycztcbiAgICB9KTtcblxuICAgIHJldHVybiB7bm9kZSwgYm9keTogc3RhdGVtZW50cyB8fCBudWxsLCBoZWxwZXI6IG51bGwsIHBhcmFtZXRlcnN9O1xuICB9XG5cblxuICAvLy8vLy8vLy8vLy8vIFByb3RlY3RlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuICAvKipcbiAgICogR2V0IHRoZSBpbm5lciBmdW5jdGlvbiBkZWNsYXJhdGlvbiBvZiBhbiBFUzUtc3R5bGUgY2xhc3MuXG4gICAqXG4gICAqIEluIEVTNSwgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY2xhc3MgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHRoYXQgaXMgaGlkZGVuIGluc2lkZSBhbiBJSUZFXG4gICAqIGFuZCByZXR1cm5lZCB0byBiZSBhc3NpZ25lZCB0byBhIHZhcmlhYmxlIG91dHNpZGUgdGhlIElJRkUsIHdoaWNoIGlzIHdoYXQgdGhlIHJlc3Qgb2YgdGhlXG4gICAqIHByb2dyYW0gaW50ZXJhY3RzIHdpdGguXG4gICAqXG4gICAqIEdpdmVuIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbiwgd2Ugd2FudCB0byBnZXQgdG8gdGhlIGlubmVyIGZ1bmN0aW9uIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSBhIG5vZGUgdGhhdCBjb3VsZCBiZSB0aGUgdmFyaWFibGUgZXhwcmVzc2lvbiBvdXRzaWRlIGFuIEVTNSBjbGFzcyBJSUZFLlxuICAgKiBAcGFyYW0gY2hlY2tlciB0aGUgVFMgcHJvZ3JhbSBUeXBlQ2hlY2tlclxuICAgKiBAcmV0dXJucyB0aGUgaW5uZXIgZnVuY3Rpb24gZGVjbGFyYXRpb24gb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldElubmVyRnVuY3Rpb25EZWNsYXJhdGlvbkZyb21DbGFzc0RlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBpZiAoIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIEV4dHJhY3QgdGhlIElJRkUgYm9keSAoaWYgYW55KS5cbiAgICBjb25zdCBpaWZlQm9keSA9IGdldElpZmVCb2R5KG5vZGUpO1xuICAgIGlmICghaWlmZUJvZHkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAvLyBFeHRyYWN0IHRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiBmcm9tIGluc2lkZSB0aGUgSUlGRS5cbiAgICBjb25zdCBmdW5jdGlvbkRlY2xhcmF0aW9uID0gaWlmZUJvZHkuc3RhdGVtZW50cy5maW5kKHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbik7XG4gICAgaWYgKCFmdW5jdGlvbkRlY2xhcmF0aW9uKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgLy8gRXh0cmFjdCB0aGUgcmV0dXJuIGlkZW50aWZpZXIgb2YgdGhlIElJRkUuXG4gICAgY29uc3QgcmV0dXJuSWRlbnRpZmllciA9IGdldFJldHVybklkZW50aWZpZXIoaWlmZUJvZHkpO1xuICAgIGNvbnN0IHJldHVybklkZW50aWZpZXJTeW1ib2wgPVxuICAgICAgICByZXR1cm5JZGVudGlmaWVyICYmIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHJldHVybklkZW50aWZpZXIpO1xuICAgIGlmICghcmV0dXJuSWRlbnRpZmllclN5bWJvbCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIFZlcmlmeSB0aGF0IHRoZSBpbm5lciBmdW5jdGlvbiBpcyByZXR1cm5lZC5cbiAgICBpZiAocmV0dXJuSWRlbnRpZmllclN5bWJvbC52YWx1ZURlY2xhcmF0aW9uICE9PSBmdW5jdGlvbkRlY2xhcmF0aW9uKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uRGVjbGFyYXRpb247XG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgY2xhc3MgaWRlbnRpZmllZCBieSBpdHMgc3ltYm9sLlxuICAgKlxuICAgKiBJbiBFU001LCB0aGVyZSBpcyBubyBcImNsYXNzXCIgc28gdGhlIGNvbnN0cnVjdG9yIHRoYXQgd2Ugd2FudCBpcyBhY3R1YWxseSB0aGUgaW5uZXIgZnVuY3Rpb25cbiAgICogZGVjbGFyYXRpb24gaW5zaWRlIHRoZSBJSUZFLCB3aG9zZSByZXR1cm4gdmFsdWUgaXMgYXNzaWduZWQgdG8gdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uXG4gICAqICh0aGF0IHJlcHJlc2VudHMgdGhlIGNsYXNzIHRvIHRoZSByZXN0IG9mIHRoZSBwcm9ncmFtKS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBzeW1ib2wgb2YgdGhlIGNsYXNzIChpLmUuIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbikgd2hvc2VcbiAgICogcGFyYW1ldGVycyB3ZSB3YW50IHRvIGZpbmQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbmAgb2JqZWN0cyByZXByZXNlbnRpbmcgZWFjaCBvZiB0aGUgcGFyYW1ldGVycyBpblxuICAgKiB0aGUgY2xhc3MncyBjb25zdHJ1Y3RvciBvciBgbnVsbGAgaWYgdGhlcmUgaXMgbm8gY29uc3RydWN0b3IuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6XG4gICAgICB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdfG51bGwge1xuICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24udmFsdWVEZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihjb25zdHJ1Y3RvcikpIHJldHVybiBudWxsO1xuXG4gICAgaWYgKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oY29uc3RydWN0b3IucGFyYW1ldGVycyk7XG4gICAgfVxuXG4gICAgaWYgKGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyxcbiAgICogd2hlcmUgdGhlIGluZm9ybWF0aW9uIGlzIHN0b3JlZCBvbiBhIHN0YXRpYyBtZXRob2Qgb2YgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBJbiB0aGlzIGNhc2UgdGhlIGRlY29yYXRvcnMgYXJlIHN0b3JlZCBpbiB0aGUgYm9keSBvZiBhIG1ldGhvZFxuICAgKiAoYGN0b3JQYXJhdGVtZXJzYCkgYXR0YWNoZWQgdG8gdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdW5saWtlIEVTTTIwMTUgdGhpcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gcmF0aGVyIHRoYW4gYW4gYXJyb3dcbiAgICogZnVuY3Rpb246XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gZnVuY3Rpb24oKSB7IHJldHVybiBbXG4gICAqICAgeyB0eXBlOiBWaWV3Q29udGFpbmVyUmVmLCB9LFxuICAgKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gICAqICAgeyB0eXBlOiBJdGVyYWJsZURpZmZlcnMsIH0sXG4gICAqICAgeyB0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7IHR5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOLF0gfSxdIH0sXG4gICAqIF07IH07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1EZWNvcmF0b3JzUHJvcGVydHkgdGhlIHByb3BlcnR5IHRoYXQgaG9sZHMgdGhlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgdGhlIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIGVhY2ggcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFBhcmFtSW5mb0Zyb21TdGF0aWNQcm9wZXJ0eShwYXJhbURlY29yYXRvcnNQcm9wZXJ0eTogdHMuU3ltYm9sKTogUGFyYW1JbmZvW118bnVsbCB7XG4gICAgY29uc3QgcGFyYW1EZWNvcmF0b3JzID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIC8vIFRoZSBkZWNvcmF0b3JzIGFycmF5IG1heSBiZSB3cmFwcGVkIGluIGEgZnVuY3Rpb24uIElmIHNvIHVud3JhcCBpdC5cbiAgICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBnZXRSZXR1cm5TdGF0ZW1lbnQocGFyYW1EZWNvcmF0b3JzKTtcbiAgICBjb25zdCBleHByZXNzaW9uID0gcmV0dXJuU3RhdGVtZW50ID8gcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24gOiBwYXJhbURlY29yYXRvcnM7XG4gICAgaWYgKGV4cHJlc3Npb24gJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGV4cHJlc3Npb24pKSB7XG4gICAgICBjb25zdCBlbGVtZW50cyA9IGV4cHJlc3Npb24uZWxlbWVudHM7XG4gICAgICByZXR1cm4gZWxlbWVudHMubWFwKHJlZmxlY3RBcnJheUVsZW1lbnQpLm1hcChwYXJhbUluZm8gPT4ge1xuICAgICAgICBjb25zdCB0eXBlRXhwcmVzc2lvbiA9IHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uaGFzKCd0eXBlJykgPyBwYXJhbUluZm8uZ2V0KCd0eXBlJykgISA6IG51bGw7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvckluZm8gPVxuICAgICAgICAgICAgcGFyYW1JbmZvICYmIHBhcmFtSW5mby5oYXMoJ2RlY29yYXRvcnMnKSA/IHBhcmFtSW5mby5nZXQoJ2RlY29yYXRvcnMnKSAhIDogbnVsbDtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvckluZm8gJiYgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JJbmZvKTtcbiAgICAgICAgcmV0dXJuIHt0eXBlRXhwcmVzc2lvbiwgZGVjb3JhdG9yc307XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHBhcmFtRGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICdJbnZhbGlkIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBkZWNvcmF0b3IgaW4gJyArIHBhcmFtRGVjb3JhdG9ycy5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUgK1xuICAgICAgICAgICAgICAnOlxcbicsXG4gICAgICAgICAgcGFyYW1EZWNvcmF0b3JzLmdldFRleHQoKSk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciBhIHN5bWJvbCBhbmQgZXh0cmFjdCB0aGUgbWVtYmVyIGluZm9ybWF0aW9uLCBjb21iaW5pbmcgaXQgd2l0aCB0aGVcbiAgICogcHJvdmlkZWQgZGVjb3JhdG9yIGluZm9ybWF0aW9uLCBhbmQgd2hldGhlciBpdCBpcyBhIHN0YXRpYyBtZW1iZXIuXG4gICAqXG4gICAqIElmIGEgY2xhc3MgbWVtYmVyIHVzZXMgYWNjZXNzb3JzIChlLmcgZ2V0dGVycyBhbmQvb3Igc2V0dGVycykgdGhlbiBpdCBnZXRzIGRvd25sZXZlbGVkXG4gICAqIGluIEVTNSB0byBhIHNpbmdsZSBgT2JqZWN0LmRlZmluZVByb3BlcnR5KClgIGNhbGwuIEluIHRoYXQgY2FzZSB3ZSBtdXN0IHBhcnNlIHRoaXNcbiAgICogY2FsbCB0byBleHRyYWN0IHRoZSBvbmUgb3IgdHdvIENsYXNzTWVtYmVyIG9iamVjdHMgdGhhdCByZXByZXNlbnQgdGhlIGFjY2Vzc29ycy5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgc3ltYm9sIGZvciB0aGUgbWVtYmVyIHRvIHJlZmxlY3Qgb3Zlci5cbiAgICogQHBhcmFtIGRlY29yYXRvcnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBhc3NvY2lhdGVkIHdpdGggdGhlIG1lbWJlci5cbiAgICogQHBhcmFtIGlzU3RhdGljIHRydWUgaWYgdGhpcyBtZW1iZXIgaXMgc3RhdGljLCBmYWxzZSBpZiBpdCBpcyBhbiBpbnN0YW5jZSBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHJlZmxlY3RlZCBtZW1iZXIgaW5mb3JtYXRpb24sIG9yIG51bGwgaWYgdGhlIHN5bWJvbCBpcyBub3QgYSBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdE1lbWJlcnMoc3ltYm9sOiB0cy5TeW1ib2wsIGRlY29yYXRvcnM/OiBEZWNvcmF0b3JbXSwgaXNTdGF0aWM/OiBib29sZWFuKTpcbiAgICAgIENsYXNzTWVtYmVyW118bnVsbCB7XG4gICAgY29uc3Qgbm9kZSA9IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uIHx8IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgICBjb25zdCBwcm9wZXJ0eURlZmluaXRpb24gPSBub2RlICYmIGdldFByb3BlcnR5RGVmaW5pdGlvbihub2RlKTtcbiAgICBpZiAocHJvcGVydHlEZWZpbml0aW9uKSB7XG4gICAgICBjb25zdCBtZW1iZXJzOiBDbGFzc01lbWJlcltdID0gW107XG4gICAgICBpZiAocHJvcGVydHlEZWZpbml0aW9uLnNldHRlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHByb3BlcnR5RGVmaW5pdGlvbi5zZXR0ZXIsXG4gICAgICAgICAga2luZDogQ2xhc3NNZW1iZXJLaW5kLlNldHRlcixcbiAgICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgICAgIG5hbWU6IHN5bWJvbC5uYW1lLFxuICAgICAgICAgIG5hbWVOb2RlOiBudWxsLFxuICAgICAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgICAgIGlzU3RhdGljOiBpc1N0YXRpYyB8fCBmYWxzZSxcbiAgICAgICAgICBkZWNvcmF0b3JzOiBkZWNvcmF0b3JzIHx8IFtdLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQcmV2ZW50IGF0dGFjaGluZyB0aGUgZGVjb3JhdG9ycyB0byBhIHBvdGVudGlhbCBnZXR0ZXIuIEluIEVTNSwgd2UgY2FuJ3QgdGVsbCB3aGVyZSB0aGVcbiAgICAgICAgLy8gZGVjb3JhdG9ycyB3ZXJlIG9yaWdpbmFsbHkgYXR0YWNoZWQgdG8sIGhvd2V2ZXIgd2Ugb25seSB3YW50IHRvIGF0dGFjaCB0aGVtIHRvIGEgc2luZ2xlXG4gICAgICAgIC8vIGBDbGFzc01lbWJlcmAgYXMgb3RoZXJ3aXNlIG5ndHNjIHdvdWxkIGhhbmRsZSB0aGUgc2FtZSBkZWNvcmF0b3JzIHR3aWNlLlxuICAgICAgICBkZWNvcmF0b3JzID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgaWYgKHByb3BlcnR5RGVmaW5pdGlvbi5nZXR0ZXIpIHtcbiAgICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgICBub2RlLFxuICAgICAgICAgIGltcGxlbWVudGF0aW9uOiBwcm9wZXJ0eURlZmluaXRpb24uZ2V0dGVyLFxuICAgICAgICAgIGtpbmQ6IENsYXNzTWVtYmVyS2luZC5HZXR0ZXIsXG4gICAgICAgICAgdHlwZTogbnVsbCxcbiAgICAgICAgICBuYW1lOiBzeW1ib2wubmFtZSxcbiAgICAgICAgICBuYW1lTm9kZTogbnVsbCxcbiAgICAgICAgICB2YWx1ZTogbnVsbCxcbiAgICAgICAgICBpc1N0YXRpYzogaXNTdGF0aWMgfHwgZmFsc2UsXG4gICAgICAgICAgZGVjb3JhdG9yczogZGVjb3JhdG9ycyB8fCBbXSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVtYmVycztcbiAgICB9XG5cbiAgICBjb25zdCBtZW1iZXJzID0gc3VwZXIucmVmbGVjdE1lbWJlcnMoc3ltYm9sLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgbWVtYmVycyAmJiBtZW1iZXJzLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICAgIGlmIChtZW1iZXIgJiYgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5NZXRob2QgJiYgbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5ub2RlICYmXG4gICAgICAgICAgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obWVtYmVyLm5vZGUpICYmIG1lbWJlci5ub2RlLnBhcmVudCAmJlxuICAgICAgICAgIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihtZW1iZXIubm9kZS5wYXJlbnQpICYmXG4gICAgICAgICAgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24obWVtYmVyLm5vZGUucGFyZW50LnJpZ2h0KSkge1xuICAgICAgICAvLyBSZWNvbXB1dGUgdGhlIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIG1lbWJlcjpcbiAgICAgICAgLy8gRVM1IHN0YXRpYyBtZXRob2RzIGFyZSB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgc28gdGhlIGRlY2xhcmF0aW9uIGlzIGFjdHVhbGx5IHRoZVxuICAgICAgICAvLyBpbml0aWFsaXplciBvZiB0aGUgdmFyaWFibGUgYXNzaWdubWVudFxuICAgICAgICBtZW1iZXIuaW1wbGVtZW50YXRpb24gPSBtZW1iZXIubm9kZS5wYXJlbnQucmlnaHQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG1lbWJlcnM7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBzdGF0ZW1lbnRzIHJlbGF0ZWQgdG8gdGhlIGdpdmVuIGNsYXNzIHRoYXQgbWF5IGNvbnRhaW4gY2FsbHMgdG8gYSBoZWxwZXIuXG4gICAqXG4gICAqIEluIEVTTTUgY29kZSB0aGUgaGVscGVyIGNhbGxzIGFyZSBoaWRkZW4gaW5zaWRlIHRoZSBjbGFzcydzIElJRkUuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLiBXZSBleHBlY3QgdGhpcyBzeW1ib2xcbiAgICogdG8gcmVmZXJlbmNlIHRoZSBpbm5lciBpZGVudGlmaWVyIGluc2lkZSB0aGUgSUlGRS5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygc3RhdGVtZW50cyB0aGF0IG1heSBjb250YWluIGhlbHBlciBjYWxscy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRTdGF0ZW1lbnRzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICBjb25zdCBjbGFzc0RlY2xhcmF0aW9uUGFyZW50ID0gY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24udmFsdWVEZWNsYXJhdGlvbi5wYXJlbnQ7XG4gICAgcmV0dXJuIHRzLmlzQmxvY2soY2xhc3NEZWNsYXJhdGlvblBhcmVudCkgPyBBcnJheS5mcm9tKGNsYXNzRGVjbGFyYXRpb25QYXJlbnQuc3RhdGVtZW50cykgOiBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gcmV0cmlldmUgdGhlIHN5bWJvbCBvZiBhIHN0YXRpYyBwcm9wZXJ0eSBvbiBhIGNsYXNzLlxuICAgKlxuICAgKiBJbiBFUzUsIGEgc3RhdGljIHByb3BlcnR5IGNhbiBlaXRoZXIgYmUgc2V0IG9uIHRoZSBpbm5lciBmdW5jdGlvbiBkZWNsYXJhdGlvbiBpbnNpZGUgdGhlIGNsYXNzJ1xuICAgKiBJSUZFLCBvciBpdCBjYW4gYmUgc2V0IG9uIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbi4gVGhlcmVmb3JlLCB0aGUgRVM1IGhvc3QgY2hlY2tzIGJvdGhcbiAgICogcGxhY2VzLCBmaXJzdCBsb29raW5nIHVwIHRoZSBwcm9wZXJ0eSBvbiB0aGUgaW5uZXIgc3ltYm9sLCBhbmQgaWYgdGhlIHByb3BlcnR5IGlzIG5vdCBmb3VuZCBpdFxuICAgKiB3aWxsIGZhbGwgYmFjayB0byBsb29raW5nIHVwIHRoZSBwcm9wZXJ0eSBvbiB0aGUgb3V0ZXIgc3ltYm9sLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwcm9wZXJ0eSB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHBhcmFtIHByb3BlcnR5TmFtZSB0aGUgbmFtZSBvZiBzdGF0aWMgcHJvcGVydHkuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgaWYgaXQgaXMgZm91bmQgb3IgYHVuZGVmaW5lZGAgaWYgbm90LlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRpY1Byb3BlcnR5KHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sLCBwcm9wZXJ0eU5hbWU6IHRzLl9fU3RyaW5nKTogdHMuU3ltYm9sXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICAvLyBGaXJzdCBsZXRzIHNlZSBpZiB0aGUgc3RhdGljIHByb3BlcnR5IGNhbiBiZSByZXNvbHZlZCBmcm9tIHRoZSBpbm5lciBjbGFzcyBzeW1ib2wuXG4gICAgY29uc3QgcHJvcCA9IHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5leHBvcnRzICYmIHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5leHBvcnRzLmdldChwcm9wZXJ0eU5hbWUpO1xuICAgIGlmIChwcm9wICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBwcm9wO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgbG9va3VwIHRoZSBzdGF0aWMgcHJvcGVydGllcyBvbiB0aGUgb3V0ZXIgY2xhc3Mgc3ltYm9sLlxuICAgIHJldHVybiBzeW1ib2wuZGVjbGFyYXRpb24uZXhwb3J0cyAmJiBzeW1ib2wuZGVjbGFyYXRpb24uZXhwb3J0cy5nZXQocHJvcGVydHlOYW1lKTtcbiAgfVxufVxuXG4vLy8vLy8vLy8vLy8vIEludGVybmFsIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGRldGFpbHMgYWJvdXQgcHJvcGVydHkgZGVmaW5pdGlvbnMgdGhhdCB3ZXJlIHNldCB1c2luZyBgT2JqZWN0LmRlZmluZVByb3BlcnR5YC5cbiAqL1xuaW50ZXJmYWNlIFByb3BlcnR5RGVmaW5pdGlvbiB7XG4gIHNldHRlcjogdHMuRnVuY3Rpb25FeHByZXNzaW9ufG51bGw7XG4gIGdldHRlcjogdHMuRnVuY3Rpb25FeHByZXNzaW9ufG51bGw7XG59XG5cbi8qKlxuICogSW4gRVM1LCBnZXR0ZXJzIGFuZCBzZXR0ZXJzIGhhdmUgYmVlbiBkb3dubGV2ZWxlZCBpbnRvIGNhbGwgZXhwcmVzc2lvbnMgb2ZcbiAqIGBPYmplY3QuZGVmaW5lUHJvcGVydHlgLCBzdWNoIGFzXG4gKlxuICogYGBgXG4gKiBPYmplY3QuZGVmaW5lUHJvcGVydHkoQ2xhenoucHJvdG90eXBlLCBcInByb3BlcnR5XCIsIHtcbiAqICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gKiAgICAgICByZXR1cm4gJ3ZhbHVlJztcbiAqICAgfSxcbiAqICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAqICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAqICAgfSxcbiAqICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAqICAgY29uZmlndXJhYmxlOiB0cnVlXG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIFRoaXMgZnVuY3Rpb24gaW5zcGVjdHMgdGhlIGdpdmVuIG5vZGUgdG8gZGV0ZXJtaW5lIGlmIGl0IGNvcnJlc3BvbmRzIHdpdGggc3VjaCBhIGNhbGwsIGFuZCBpZiBzb1xuICogZXh0cmFjdHMgdGhlIGBzZXRgIGFuZCBgZ2V0YCBmdW5jdGlvbiBleHByZXNzaW9ucyBmcm9tIHRoZSBkZXNjcmlwdG9yIG9iamVjdCwgaWYgdGhleSBleGlzdC5cbiAqXG4gKiBAcGFyYW0gbm9kZSBUaGUgbm9kZSB0byBvYnRhaW4gdGhlIHByb3BlcnR5IGRlZmluaXRpb24gZnJvbS5cbiAqIEByZXR1cm5zIFRoZSBwcm9wZXJ0eSBkZWZpbml0aW9uIGlmIHRoZSBub2RlIGNvcnJlc3BvbmRzIHdpdGggYWNjZXNzb3IsIG51bGwgb3RoZXJ3aXNlLlxuICovXG5mdW5jdGlvbiBnZXRQcm9wZXJ0eURlZmluaXRpb24obm9kZTogdHMuTm9kZSk6IFByb3BlcnR5RGVmaW5pdGlvbnxudWxsIHtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCBmbiA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihmbikgfHwgIXRzLmlzSWRlbnRpZmllcihmbi5leHByZXNzaW9uKSB8fFxuICAgICAgZm4uZXhwcmVzc2lvbi50ZXh0ICE9PSAnT2JqZWN0JyB8fCBmbi5uYW1lLnRleHQgIT09ICdkZWZpbmVQcm9wZXJ0eScpXG4gICAgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgZGVzY3JpcHRvciA9IG5vZGUuYXJndW1lbnRzWzJdO1xuICBpZiAoIWRlc2NyaXB0b3IgfHwgIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oZGVzY3JpcHRvcikpIHJldHVybiBudWxsO1xuXG4gIHJldHVybiB7XG4gICAgc2V0dGVyOiByZWFkUHJvcGVydHlGdW5jdGlvbkV4cHJlc3Npb24oZGVzY3JpcHRvciwgJ3NldCcpLFxuICAgIGdldHRlcjogcmVhZFByb3BlcnR5RnVuY3Rpb25FeHByZXNzaW9uKGRlc2NyaXB0b3IsICdnZXQnKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVhZFByb3BlcnR5RnVuY3Rpb25FeHByZXNzaW9uKG9iamVjdDogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24sIG5hbWU6IHN0cmluZykge1xuICBjb25zdCBwcm9wZXJ0eSA9IG9iamVjdC5wcm9wZXJ0aWVzLmZpbmQoXG4gICAgICAocCk6IHAgaXMgdHMuUHJvcGVydHlBc3NpZ25tZW50ID0+XG4gICAgICAgICAgdHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQocCkgJiYgdHMuaXNJZGVudGlmaWVyKHAubmFtZSkgJiYgcC5uYW1lLnRleHQgPT09IG5hbWUpO1xuXG4gIHJldHVybiBwcm9wZXJ0eSAmJiB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihwcm9wZXJ0eS5pbml0aWFsaXplcikgJiYgcHJvcGVydHkuaW5pdGlhbGl6ZXIgfHwgbnVsbDtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGFjdHVhbCAob3V0ZXIpIGRlY2xhcmF0aW9uIG9mIGEgY2xhc3MuXG4gKlxuICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUgYW5kXG4gKiByZXR1cm5lZCB0byBiZSBhc3NpZ25lZCB0byBhIHZhcmlhYmxlIG91dHNpZGUgdGhlIElJRkUsIHdoaWNoIGlzIHdoYXQgdGhlIHJlc3Qgb2YgdGhlIHByb2dyYW1cbiAqIGludGVyYWN0cyB3aXRoLlxuICpcbiAqIEdpdmVuIHRoZSBpbm5lciBmdW5jdGlvbiBkZWNsYXJhdGlvbiwgd2Ugd2FudCB0byBnZXQgdG8gdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBvdXRlciB2YXJpYWJsZVxuICogdGhhdCByZXByZXNlbnRzIHRoZSBjbGFzcy5cbiAqXG4gKiBAcGFyYW0gbm9kZSBhIG5vZGUgdGhhdCBjb3VsZCBiZSB0aGUgZnVuY3Rpb24gZXhwcmVzc2lvbiBpbnNpZGUgYW4gRVM1IGNsYXNzIElJRkUuXG4gKiBAcmV0dXJucyB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24gb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiLlxuICovXG5mdW5jdGlvbiBnZXRDbGFzc0RlY2xhcmF0aW9uRnJvbUlubmVyRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTpcbiAgICBDbGFzc0RlY2xhcmF0aW9uPHRzLlZhcmlhYmxlRGVjbGFyYXRpb24+fG51bGwge1xuICBpZiAodHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgLy8gSXQgbWlnaHQgYmUgdGhlIGZ1bmN0aW9uIGV4cHJlc3Npb24gaW5zaWRlIHRoZSBJSUZFLiBXZSBuZWVkIHRvIGdvIDUgbGV2ZWxzIHVwLi4uXG5cbiAgICAvLyAxLiBJSUZFIGJvZHkuXG4gICAgbGV0IG91dGVyTm9kZSA9IG5vZGUucGFyZW50O1xuICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc0Jsb2NrKG91dGVyTm9kZSkpIHJldHVybiBudWxsO1xuXG4gICAgLy8gMi4gSUlGRSBmdW5jdGlvbiBleHByZXNzaW9uLlxuICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKG91dGVyTm9kZSkpIHJldHVybiBudWxsO1xuXG4gICAgLy8gMy4gSUlGRSBjYWxsIGV4cHJlc3Npb24uXG4gICAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcbiAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNDYWxsRXhwcmVzc2lvbihvdXRlck5vZGUpKSByZXR1cm4gbnVsbDtcblxuICAgIC8vIDQuIFBhcmVudGhlc2lzIGFyb3VuZCBJSUZFLlxuICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24ob3V0ZXJOb2RlKSkgcmV0dXJuIG51bGw7XG5cbiAgICAvLyA1LiBPdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24ob3V0ZXJOb2RlKSkgcmV0dXJuIG51bGw7XG5cbiAgICAvLyBGaW5hbGx5LCBlbnN1cmUgdGhhdCB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24gaGFzIGEgYG5hbWVgIGlkZW50aWZpZXIuXG4gICAgcmV0dXJuIGhhc05hbWVJZGVudGlmaWVyKG91dGVyTm9kZSkgPyBvdXRlck5vZGUgOiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRJaWZlQm9keShkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiB0cy5CbG9ja3x1bmRlZmluZWQge1xuICBpZiAoIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgfHwgIWRlY2xhcmF0aW9uLmluaXRpYWxpemVyIHx8XG4gICAgICAhdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihkZWNsYXJhdGlvbi5pbml0aWFsaXplcikpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGNhbGwgPSBkZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgcmV0dXJuIHRzLmlzQ2FsbEV4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uKSAmJlxuICAgICAgICAgIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGNhbGwuZXhwcmVzc2lvbi5leHByZXNzaW9uKSA/XG4gICAgICBjYWxsLmV4cHJlc3Npb24uZXhwcmVzc2lvbi5ib2R5IDpcbiAgICAgIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZ2V0UmV0dXJuSWRlbnRpZmllcihib2R5OiB0cy5CbG9jayk6IHRzLklkZW50aWZpZXJ8dW5kZWZpbmVkIHtcbiAgY29uc3QgcmV0dXJuU3RhdGVtZW50ID0gYm9keS5zdGF0ZW1lbnRzLmZpbmQodHMuaXNSZXR1cm5TdGF0ZW1lbnQpO1xuICByZXR1cm4gcmV0dXJuU3RhdGVtZW50ICYmIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uICYmXG4gICAgICAgICAgdHMuaXNJZGVudGlmaWVyKHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uKSA/XG4gICAgICByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbiA6XG4gICAgICB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGdldFJldHVyblN0YXRlbWVudChkZWNsYXJhdGlvbjogdHMuRXhwcmVzc2lvbiB8IHVuZGVmaW5lZCk6IHRzLlJldHVyblN0YXRlbWVudHx1bmRlZmluZWQge1xuICByZXR1cm4gZGVjbGFyYXRpb24gJiYgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZGVjbGFyYXRpb24pID9cbiAgICAgIGRlY2xhcmF0aW9uLmJvZHkuc3RhdGVtZW50cy5maW5kKHRzLmlzUmV0dXJuU3RhdGVtZW50KSA6XG4gICAgICB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIHJlZmxlY3RBcnJheUVsZW1lbnQoZWxlbWVudDogdHMuRXhwcmVzc2lvbikge1xuICByZXR1cm4gdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbDtcbn1cblxuLyoqXG4gKiBJbnNwZWN0cyBhIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIHRvIGRldGVybWluZSBpZiBpdCBjb3JyZXNwb25kcyB3aXRoIGEgVHlwZVNjcmlwdCBoZWxwZXIgZnVuY3Rpb24sXG4gKiByZXR1cm5pbmcgaXRzIGtpbmQgaWYgc28gb3IgbnVsbCBpZiB0aGUgZGVjbGFyYXRpb24gZG9lcyBub3Qgc2VlbSB0byBjb3JyZXNwb25kIHdpdGggc3VjaCBhXG4gKiBoZWxwZXIuXG4gKi9cbmZ1bmN0aW9uIGdldFRzSGVscGVyRm4obm9kZTogdHMuTmFtZWREZWNsYXJhdGlvbik6IFRzSGVscGVyRm58bnVsbCB7XG4gIGNvbnN0IG5hbWUgPSBub2RlLm5hbWUgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0lkZW50aWZpZXIobm9kZS5uYW1lKSA/XG4gICAgICBzdHJpcERvbGxhclN1ZmZpeChub2RlLm5hbWUudGV4dCkgOlxuICAgICAgbnVsbDtcblxuICBzd2l0Y2ggKG5hbWUpIHtcbiAgICBjYXNlICdfX3NwcmVhZCc6XG4gICAgICByZXR1cm4gVHNIZWxwZXJGbi5TcHJlYWQ7XG4gICAgY2FzZSAnX19zcHJlYWRBcnJheXMnOlxuICAgICAgcmV0dXJuIFRzSGVscGVyRm4uU3ByZWFkQXJyYXlzO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgY29uc3RydWN0b3IgZnVuY3Rpb24gbWF5IGhhdmUgYmVlbiBcInN5bnRoZXNpemVkXCIgYnkgVHlwZVNjcmlwdCBkdXJpbmcgSmF2YVNjcmlwdCBlbWl0LFxuICogaW4gdGhlIGNhc2Ugbm8gdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGV4aXN0cyBhbmQgZS5nLiBwcm9wZXJ0eSBpbml0aWFsaXplcnMgYXJlIHVzZWQuXG4gKiBUaG9zZSBpbml0aWFsaXplcnMgbmVlZCB0byBiZSBlbWl0dGVkIGludG8gYSBjb25zdHJ1Y3RvciBpbiBKYXZhU2NyaXB0LCBzbyB0aGUgVHlwZVNjcmlwdFxuICogY29tcGlsZXIgZ2VuZXJhdGVzIGEgc3ludGhldGljIGNvbnN0cnVjdG9yLlxuICpcbiAqIFdlIG5lZWQgdG8gaWRlbnRpZnkgc3VjaCBjb25zdHJ1Y3RvcnMgYXMgbmdjYyBuZWVkcyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgYSBjbGFzcyBkaWRcbiAqIG9yaWdpbmFsbHkgaGF2ZSBhIGNvbnN0cnVjdG9yIGluIHRoZSBUeXBlU2NyaXB0IHNvdXJjZS4gRm9yIEVTNSwgd2UgY2FuIG5vdCB0ZWxsIGFuXG4gKiBlbXB0eSBjb25zdHJ1Y3RvciBhcGFydCBmcm9tIGEgc3ludGhlc2l6ZWQgY29uc3RydWN0b3IsIGJ1dCBmb3J0dW5hdGVseSB0aGF0IGRvZXMgbm90XG4gKiBtYXR0ZXIgZm9yIHRoZSBjb2RlIGdlbmVyYXRlZCBieSBuZ3RzYy5cbiAqXG4gKiBXaGVuIGEgY2xhc3MgaGFzIGEgc3VwZXJjbGFzcyBob3dldmVyLCBhIHN5bnRoZXNpemVkIGNvbnN0cnVjdG9yIG11c3Qgbm90IGJlIGNvbnNpZGVyZWRcbiAqIGFzIGEgdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGFzIHRoYXQgcHJldmVudHMgYSBiYXNlIGZhY3RvcnkgY2FsbCBmcm9tIGJlaW5nIGNyZWF0ZWQgYnlcbiAqIG5ndHNjLCByZXN1bHRpbmcgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uIHRoYXQgZG9lcyBub3QgaW5qZWN0IHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlXG4gKiBzdXBlcmNsYXNzLiBIZW5jZSwgd2UgaWRlbnRpZnkgYSBkZWZhdWx0IHN5bnRoZXNpemVkIHN1cGVyIGNhbGwgaW4gdGhlIGNvbnN0cnVjdG9yIGJvZHksXG4gKiBhY2NvcmRpbmcgdG8gdGhlIHN0cnVjdHVyZSB0aGF0IFR5cGVTY3JpcHQncyBFUzIwMTUgdG8gRVM1IHRyYW5zZm9ybWVyIGdlbmVyYXRlcyBpblxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuMi4yL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvZXMyMDE1LnRzI0wxMDgyLUwxMDk4XG4gKlxuICogQHBhcmFtIGNvbnN0cnVjdG9yIGEgY29uc3RydWN0b3IgZnVuY3Rpb24gdG8gdGVzdFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgY29uc3RydWN0b3IgYXBwZWFycyB0byBoYXZlIGJlZW4gc3ludGhlc2l6ZWRcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZENvbnN0cnVjdG9yKGNvbnN0cnVjdG9yOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIGlmICghY29uc3RydWN0b3IuYm9keSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGZpcnN0U3RhdGVtZW50ID0gY29uc3RydWN0b3IuYm9keS5zdGF0ZW1lbnRzWzBdO1xuICBpZiAoIWZpcnN0U3RhdGVtZW50KSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGlzU3ludGhlc2l6ZWRTdXBlclRoaXNBc3NpZ25tZW50KGZpcnN0U3RhdGVtZW50KSB8fFxuICAgICAgaXNTeW50aGVzaXplZFN1cGVyUmV0dXJuU3RhdGVtZW50KGZpcnN0U3RhdGVtZW50KTtcbn1cblxuLyoqXG4gKiBJZGVudGlmaWVzIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBvZiB0aGUgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIHZhciBfdGhpcyA9IF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHN0YXRlbWVudCBhIHN0YXRlbWVudCB0aGF0IG1heSBiZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCBsb29rcyBsaWtlIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbFxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkU3VwZXJUaGlzQXNzaWdubWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IHZhcmlhYmxlRGVjbGFyYXRpb25zID0gc3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnM7XG4gIGlmICh2YXJpYWJsZURlY2xhcmF0aW9ucy5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCB2YXJpYWJsZURlY2xhcmF0aW9uID0gdmFyaWFibGVEZWNsYXJhdGlvbnNbMF07XG4gIGlmICghdHMuaXNJZGVudGlmaWVyKHZhcmlhYmxlRGVjbGFyYXRpb24ubmFtZSkgfHxcbiAgICAgICF2YXJpYWJsZURlY2xhcmF0aW9uLm5hbWUudGV4dC5zdGFydHNXaXRoKCdfdGhpcycpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBpbml0aWFsaXplciA9IHZhcmlhYmxlRGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gIGlmICghaW5pdGlhbGl6ZXIpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gaXNTeW50aGVzaXplZERlZmF1bHRTdXBlckNhbGwoaW5pdGlhbGl6ZXIpO1xufVxuLyoqXG4gKiBJZGVudGlmaWVzIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBvZiB0aGUgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIHJldHVybiBfc3VwZXIgIT09IG51bGwgJiYgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgdGhpcztcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzdGF0ZW1lbnQgYSBzdGF0ZW1lbnQgdGhhdCBtYXkgYmUgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBzdGF0ZW1lbnQgbG9va3MgbGlrZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZFN1cGVyUmV0dXJuU3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogYm9vbGVhbiB7XG4gIGlmICghdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGV4cHJlc3Npb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjtcbiAgaWYgKCFleHByZXNzaW9uKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGlzU3ludGhlc2l6ZWREZWZhdWx0U3VwZXJDYWxsKGV4cHJlc3Npb24pO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gaXMgb2YgdGhlIGZvcm06XG4gKlxuICogYGBgXG4gKiBfc3VwZXIgIT09IG51bGwgJiYgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgdGhpcztcbiAqIGBgYFxuICpcbiAqIFRoaXMgc3RydWN0dXJlIGlzIGdlbmVyYXRlZCBieSBUeXBlU2NyaXB0IHdoZW4gdHJhbnNmb3JtaW5nIEVTMjAxNSB0byBFUzUsIHNlZVxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuMi4yL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvZXMyMDE1LnRzI0wxMTQ4LUwxMTYzXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gYW4gZXhwcmVzc2lvbiB0aGF0IG1heSByZXByZXNlbnQgYSBkZWZhdWx0IHN1cGVyIGNhbGxcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gY29ycmVzcG9uZHMgd2l0aCB0aGUgYWJvdmUgZm9ybVxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkRGVmYXVsdFN1cGVyQ2FsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIGlmICghaXNCaW5hcnlFeHByKGV4cHJlc3Npb24sIHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW4pKSByZXR1cm4gZmFsc2U7XG4gIGlmIChleHByZXNzaW9uLnJpZ2h0LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBsZWZ0ID0gZXhwcmVzc2lvbi5sZWZ0O1xuICBpZiAoIWlzQmluYXJ5RXhwcihsZWZ0LCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuKSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N1cGVyTm90TnVsbChsZWZ0LmxlZnQpICYmIGlzU3VwZXJBcHBseUNhbGwobGVmdC5yaWdodCk7XG59XG5cbmZ1bmN0aW9uIGlzU3VwZXJOb3ROdWxsKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIGlzQmluYXJ5RXhwcihleHByZXNzaW9uLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzRXF1YWxzVG9rZW4pICYmXG4gICAgICBpc1N1cGVySWRlbnRpZmllcihleHByZXNzaW9uLmxlZnQpO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gaXMgb2YgdGhlIGZvcm1cbiAqXG4gKiBgYGBcbiAqIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiBhbiBleHByZXNzaW9uIHRoYXQgbWF5IHJlcHJlc2VudCBhIGRlZmF1bHQgc3VwZXIgY2FsbFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgZXhwcmVzc2lvbiBjb3JyZXNwb25kcyB3aXRoIHRoZSBhYm92ZSBmb3JtXG4gKi9cbmZ1bmN0aW9uIGlzU3VwZXJBcHBseUNhbGwoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikgfHwgZXhwcmVzc2lvbi5hcmd1bWVudHMubGVuZ3RoICE9PSAyKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgdGFyZ2V0Rm4gPSBleHByZXNzaW9uLmV4cHJlc3Npb247XG4gIGlmICghdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24odGFyZ2V0Rm4pKSByZXR1cm4gZmFsc2U7XG4gIGlmICghaXNTdXBlcklkZW50aWZpZXIodGFyZ2V0Rm4uZXhwcmVzc2lvbikpIHJldHVybiBmYWxzZTtcbiAgaWYgKHRhcmdldEZuLm5hbWUudGV4dCAhPT0gJ2FwcGx5JykgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IHRoaXNBcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuICBpZiAodGhpc0FyZ3VtZW50LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBhcmd1bWVudHNBcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzFdO1xuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKGFyZ3VtZW50c0FyZ3VtZW50KSAmJiBhcmd1bWVudHNBcmd1bWVudC50ZXh0ID09PSAnYXJndW1lbnRzJztcbn1cblxuZnVuY3Rpb24gaXNCaW5hcnlFeHByKFxuICAgIGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24sIG9wZXJhdG9yOiB0cy5CaW5hcnlPcGVyYXRvcik6IGV4cHJlc3Npb24gaXMgdHMuQmluYXJ5RXhwcmVzc2lvbiB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24oZXhwcmVzc2lvbikgJiYgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IG9wZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBpc1N1cGVySWRlbnRpZmllcihub2RlOiB0cy5Ob2RlKTogYm9vbGVhbiB7XG4gIC8vIFZlcmlmeSB0aGF0IHRoZSBpZGVudGlmaWVyIGlzIHByZWZpeGVkIHdpdGggYF9zdXBlcmAuIFdlIGRvbid0IHRlc3QgZm9yIGVxdWl2YWxlbmNlXG4gIC8vIGFzIFR5cGVTY3JpcHQgbWF5IGhhdmUgc3VmZml4ZWQgdGhlIG5hbWUsIGUuZy4gYF9zdXBlcl8xYCB0byBhdm9pZCBuYW1lIGNvbmZsaWN0cy5cbiAgLy8gUmVxdWlyaW5nIG9ubHkgYSBwcmVmaXggc2hvdWxkIGJlIHN1ZmZpY2llbnRseSBhY2N1cmF0ZS5cbiAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihub2RlKSAmJiBub2RlLnRleHQuc3RhcnRzV2l0aCgnX3N1cGVyJyk7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIHN0YXRlbWVudCB0byBleHRyYWN0IHRoZSBFU001IHBhcmFtZXRlciBpbml0aWFsaXplciBpZiB0aGVyZSBpcyBvbmUuXG4gKiBJZiBvbmUgaXMgZm91bmQsIGFkZCBpdCB0byB0aGUgYXBwcm9wcmlhdGUgcGFyYW1ldGVyIGluIHRoZSBgcGFyYW1ldGVyc2AgY29sbGVjdGlvbi5cbiAqXG4gKiBUaGUgZm9ybSB3ZSBhcmUgbG9va2luZyBmb3IgaXM6XG4gKlxuICogYGBgXG4gKiBpZiAoYXJnID09PSB2b2lkIDApIHsgYXJnID0gaW5pdGlhbGl6ZXI7IH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzdGF0ZW1lbnQgYSBzdGF0ZW1lbnQgdGhhdCBtYXkgYmUgaW5pdGlhbGl6aW5nIGFuIG9wdGlvbmFsIHBhcmFtZXRlclxuICogQHBhcmFtIHBhcmFtZXRlcnMgdGhlIGNvbGxlY3Rpb24gb2YgcGFyYW1ldGVycyB0aGF0IHdlcmUgZm91bmQgaW4gdGhlIGZ1bmN0aW9uIGRlZmluaXRpb25cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCB3YXMgYSBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXJcbiAqL1xuZnVuY3Rpb24gcmVmbGVjdFBhcmFtSW5pdGlhbGl6ZXIoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQsIHBhcmFtZXRlcnM6IFBhcmFtZXRlcltdKSB7XG4gIGlmICh0cy5pc0lmU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgaXNVbmRlZmluZWRDb21wYXJpc29uKHN0YXRlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNCbG9jayhzdGF0ZW1lbnQudGhlblN0YXRlbWVudCkgJiYgc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCBpZlN0YXRlbWVudENvbXBhcmlzb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjsgICAgICAgICAgIC8vIChhcmcgPT09IHZvaWQgMClcbiAgICBjb25zdCB0aGVuU3RhdGVtZW50ID0gc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50c1swXTsgIC8vIGFyZyA9IGluaXRpYWxpemVyO1xuICAgIGlmIChpc0Fzc2lnbm1lbnRTdGF0ZW1lbnQodGhlblN0YXRlbWVudCkpIHtcbiAgICAgIGNvbnN0IGNvbXBhcmlzb25OYW1lID0gaWZTdGF0ZW1lbnRDb21wYXJpc29uLmxlZnQudGV4dDtcbiAgICAgIGNvbnN0IGFzc2lnbm1lbnROYW1lID0gdGhlblN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQudGV4dDtcbiAgICAgIGlmIChjb21wYXJpc29uTmFtZSA9PT0gYXNzaWdubWVudE5hbWUpIHtcbiAgICAgICAgY29uc3QgcGFyYW1ldGVyID0gcGFyYW1ldGVycy5maW5kKHAgPT4gcC5uYW1lID09PSBjb21wYXJpc29uTmFtZSk7XG4gICAgICAgIGlmIChwYXJhbWV0ZXIpIHtcbiAgICAgICAgICBwYXJhbWV0ZXIuaW5pdGlhbGl6ZXIgPSB0aGVuU3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQ7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZENvbXBhcmlzb24oZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGV4cHJlc3Npb24gaXMgdHMuRXhwcmVzc2lvbiZcbiAgICB7bGVmdDogdHMuSWRlbnRpZmllciwgcmlnaHQ6IHRzLkV4cHJlc3Npb259IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihleHByZXNzaW9uKSAmJlxuICAgICAgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW4gJiZcbiAgICAgIHRzLmlzVm9pZEV4cHJlc3Npb24oZXhwcmVzc2lvbi5yaWdodCkgJiYgdHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24ubGVmdCk7XG59XG4iXX0=