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
        define("@angular/compiler-cli/ngcc/src/host/esm5_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/host/esm2015_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
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
            // Do not follow ES5's resolution logic when the node resides in a .d.ts file.
            if (typescript_1.isFromDtsFile(clazz)) {
                return _super.prototype.getMembersOfClass.call(this, clazz);
            }
            // The necessary info is on the inner function declaration (inside the ES5 class IIFE).
            var innerFunctionSymbol = this.getInnerFunctionSymbolFromClassDeclaration(clazz);
            if (!innerFunctionSymbol) {
                throw new Error("Attempted to get members of a non-class: \"" + clazz.getText() + "\"");
            }
            return this.getMembersOfSymbol(innerFunctionSymbol);
        };
        /** Gets all decorators of the given class symbol. */
        Esm5ReflectionHost.prototype.getDecoratorsOfSymbol = function (symbol) {
            // The necessary info is on the inner function declaration (inside the ES5 class IIFE).
            var innerFunctionSymbol = this.getInnerFunctionSymbolFromClassDeclaration(symbol.valueDeclaration);
            if (!innerFunctionSymbol)
                return null;
            return _super.prototype.getDecoratorsOfSymbol.call(this, innerFunctionSymbol);
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
                    var typeExpression = paramInfo && paramInfo.has('type') ? paramInfo.get('type') : null;
                    var decoratorInfo = paramInfo && paramInfo.has('decorators') ? paramInfo.get('decorators') : null;
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
     * Inspects a function declaration to determine if it corresponds with a TypeScript helper function,
     * returning its kind if so or null if the declaration does not seem to correspond with such a
     * helper.
     */
    function getTsHelperFn(node) {
        var name = node.name !== undefined && ts.isIdentifier(node.name) && node.name.text;
        if (name === '__spread') {
            return reflection_1.TsHelperFn.Spread;
        }
        else {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyx5RUFBOE87SUFDOU8sa0ZBQXFFO0lBQ3JFLDhEQUF3RDtJQUV4RCxpRkFBbUg7SUFJbkg7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSDtRQUF3Qyw4Q0FBcUI7UUFBN0Q7O1FBa2FBLENBQUM7UUFqYUM7Ozs7OztXQU1HO1FBQ0gseUNBQVksR0FBWixVQUFhLEtBQXVCO1lBQ2xDLElBQUksaUJBQU0sWUFBWSxZQUFDLEtBQUssQ0FBQztnQkFBRSxPQUFPLElBQUksQ0FBQztZQUUzQyxJQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6RCxJQUFJLENBQUMsZ0JBQWdCO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1lBRXBDLElBQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxRQUFRO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1lBRTVCLElBQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDN0IsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUM7Z0JBQUUsT0FBTyxLQUFLLENBQUM7WUFFMUQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwRixDQUFDO1FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7OztXQWtCRztRQUNILGdEQUFtQixH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QUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgQ2xhc3NTeW1ib2wsIEN0b3JQYXJhbWV0ZXIsIERlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIEZ1bmN0aW9uRGVmaW5pdGlvbiwgUGFyYW1ldGVyLCBUc0hlbHBlckZuLCBpc05hbWVkVmFyaWFibGVEZWNsYXJhdGlvbiwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7aXNGcm9tRHRzRmlsZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtnZXROYW1lVGV4dCwgaGFzTmFtZUlkZW50aWZpZXJ9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtFc20yMDE1UmVmbGVjdGlvbkhvc3QsIFBhcmFtSW5mbywgZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wsIGlzQXNzaWdubWVudFN0YXRlbWVudH0gZnJvbSAnLi9lc20yMDE1X2hvc3QnO1xuXG5cblxuLyoqXG4gKiBFU001IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCBJSUZFIGZ1bmN0aW9ucyB0aGF0IGFjdCBsaWtlIGNsYXNzZXMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogdmFyIENvbW1vbk1vZHVsZSA9IChmdW5jdGlvbiAoKSB7XG4gKiAgZnVuY3Rpb24gQ29tbW9uTW9kdWxlKCkge1xuICogIH1cbiAqICBDb21tb25Nb2R1bGUuZGVjb3JhdG9ycyA9IFsgLi4uIF07XG4gKiBgYGBcbiAqXG4gKiAqIFwiQ2xhc3Nlc1wiIGFyZSBkZWNvcmF0ZWQgaWYgdGhleSBoYXZlIGEgc3RhdGljIHByb3BlcnR5IGNhbGxlZCBgZGVjb3JhdG9yc2AuXG4gKiAqIE1lbWJlcnMgYXJlIGRlY29yYXRlZCBpZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGtleSBvbiBhIHN0YXRpYyBwcm9wZXJ0eVxuICogICBjYWxsZWQgYHByb3BEZWNvcmF0b3JzYC5cbiAqICogQ29uc3RydWN0b3IgcGFyYW1ldGVycyBkZWNvcmF0b3JzIGFyZSBmb3VuZCBvbiBhbiBvYmplY3QgcmV0dXJuZWQgZnJvbVxuICogICBhIHN0YXRpYyBtZXRob2QgY2FsbGVkIGBjdG9yUGFyYW1ldGVyc2AuXG4gKlxuICovXG5leHBvcnQgY2xhc3MgRXNtNVJlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0IHtcbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hldGhlciB0aGUgZ2l2ZW4gZGVjbGFyYXRpb24sIHdoaWNoIHNob3VsZCBiZSBhIFwiY2xhc3NcIiwgaGFzIGEgYmFzZSBcImNsYXNzXCIuXG4gICAqXG4gICAqIEluIEVTNSBjb2RlLCB3ZSBuZWVkIHRvIGRldGVybWluZSBpZiB0aGUgSUlGRSB3cmFwcGVyIHRha2VzIGEgYF9zdXBlcmAgcGFyYW1ldGVyIC5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKi9cbiAgaGFzQmFzZUNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgaWYgKHN1cGVyLmhhc0Jhc2VDbGFzcyhjbGF6eikpIHJldHVybiB0cnVlO1xuXG4gICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbiA9IHRoaXMuZ2V0Q2xhc3NEZWNsYXJhdGlvbihjbGF6eik7XG4gICAgaWYgKCFjbGFzc0RlY2xhcmF0aW9uKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBpaWZlQm9keSA9IGdldElpZmVCb2R5KGNsYXNzRGVjbGFyYXRpb24pO1xuICAgIGlmICghaWlmZUJvZHkpIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGlpZmUgPSBpaWZlQm9keS5wYXJlbnQ7XG4gICAgaWYgKCFpaWZlIHx8ICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihpaWZlKSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgcmV0dXJuIGlpZmUucGFyYW1ldGVycy5sZW5ndGggPT09IDEgJiYgaXNTdXBlcklkZW50aWZpZXIoaWlmZS5wYXJhbWV0ZXJzWzBdLm5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIGRlY2xhcmF0aW9uIG9mIGEgY2xhc3MgZ2l2ZW4gYSBub2RlIHRoYXQgd2UgdGhpbmsgcmVwcmVzZW50cyB0aGUgY2xhc3MuXG4gICAqXG4gICAqIEluIEVTNSwgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY2xhc3MgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHRoYXQgaXMgaGlkZGVuIGluc2lkZSBhbiBJSUZFLFxuICAgKiB3aG9zZSB2YWx1ZSBpcyBhc3NpZ25lZCB0byBhIHZhcmlhYmxlICh3aGljaCByZXByZXNlbnRzIHRoZSBjbGFzcyB0byB0aGUgcmVzdCBvZiB0aGUgcHJvZ3JhbSkuXG4gICAqIFNvIHdlIG1pZ2h0IG5lZWQgdG8gZGlnIGFyb3VuZCB0byBnZXQgaG9sZCBvZiB0aGUgXCJjbGFzc1wiIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBgbm9kZWAgbWlnaHQgYmUgb25lIG9mOlxuICAgKiAtIEEgY2xhc3MgZGVjbGFyYXRpb24gKGZyb20gYSB0eXBpbmdzIGZpbGUpLlxuICAgKiAtIFRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgb3V0ZXIgdmFyaWFibGUsIHdoaWNoIGlzIGFzc2lnbmVkIHRoZSByZXN1bHQgb2YgdGhlIElJRkUuXG4gICAqIC0gVGhlIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGluc2lkZSB0aGUgSUlGRSwgd2hpY2ggaXMgZXZlbnR1YWxseSByZXR1cm5lZCBhbmQgYXNzaWduZWQgdG8gdGhlXG4gICAqICAgb3V0ZXIgdmFyaWFibGUuXG4gICAqXG4gICAqIFRoZSByZXR1cm5lZCBkZWNsYXJhdGlvbiBpcyBlaXRoZXIgdGhlIGNsYXNzIGRlY2xhcmF0aW9uIChmcm9tIHRoZSB0eXBpbmdzIGZpbGUpIG9yIHRoZSBvdXRlclxuICAgKiB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgdGhlIG5vZGUgdGhhdCByZXByZXNlbnRzIHRoZSBjbGFzcyB3aG9zZSBkZWNsYXJhdGlvbiB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBjbGFzcyBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIuXG4gICAqL1xuICBnZXRDbGFzc0RlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOiBDbGFzc0RlY2xhcmF0aW9ufHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3VwZXJEZWNsYXJhdGlvbiA9IHN1cGVyLmdldENsYXNzRGVjbGFyYXRpb24obm9kZSk7XG4gICAgaWYgKHN1cGVyRGVjbGFyYXRpb24pIHJldHVybiBzdXBlckRlY2xhcmF0aW9uO1xuXG4gICAgY29uc3Qgb3V0ZXJDbGFzcyA9IGdldENsYXNzRGVjbGFyYXRpb25Gcm9tSW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGlmIChvdXRlckNsYXNzKSByZXR1cm4gb3V0ZXJDbGFzcztcblxuICAgIC8vIEF0IHRoaXMgcG9pbnQsIGBub2RlYCBjb3VsZCBiZSB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24gb2YgYW4gRVM1IGNsYXNzLlxuICAgIC8vIElmIHNvLCBlbnN1cmUgdGhhdCBpdCBoYXMgYSBgbmFtZWAgaWRlbnRpZmllciBhbmQgdGhlIGNvcnJlY3Qgc3RydWN0dXJlLlxuICAgIGlmICghaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkgfHxcbiAgICAgICAgIXRoaXMuZ2V0SW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uRnJvbUNsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICAvKipcbiAgICogVHJhY2UgYW4gaWRlbnRpZmllciB0byBpdHMgZGVjbGFyYXRpb24sIGlmIHBvc3NpYmxlLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBhdHRlbXB0cyB0byByZXNvbHZlIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZ2l2ZW4gaWRlbnRpZmllciwgdHJhY2luZyBiYWNrIHRocm91Z2hcbiAgICogaW1wb3J0cyBhbmQgcmUtZXhwb3J0cyB1bnRpbCB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gc3RhdGVtZW50IGlzIGZvdW5kLiBBIGBEZWNsYXJhdGlvbmBcbiAgICogb2JqZWN0IGlzIHJldHVybmVkIGlmIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBpcyBmb3VuZCwgb3IgYG51bGxgIGlzIHJldHVybmVkIG90aGVyd2lzZS5cbiAgICpcbiAgICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUuXG4gICAqIElmIHdlIGFyZSBsb29raW5nIGZvciB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGlkZW50aWZpZXIgb2YgdGhlIGlubmVyIGZ1bmN0aW9uIGV4cHJlc3Npb24sIHdlXG4gICAqIHdpbGwgZ2V0IGhvbGQgb2YgdGhlIG91dGVyIFwiY2xhc3NcIiB2YXJpYWJsZSBkZWNsYXJhdGlvbiBhbmQgcmV0dXJuIGl0cyBpZGVudGlmaWVyIGluc3RlYWQuIFNlZVxuICAgKiBgZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24oKWAgZm9yIG1vcmUgaW5mby5cbiAgICpcbiAgICogQHBhcmFtIGlkIGEgVHlwZVNjcmlwdCBgdHMuSWRlbnRpZmllcmAgdG8gdHJhY2UgYmFjayB0byBhIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBtZXRhZGF0YSBhYm91dCB0aGUgYERlY2xhcmF0aW9uYCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYFxuICAgKiBvdGhlcndpc2UuXG4gICAqL1xuICBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIC8vIEdldCB0aGUgaWRlbnRpZmllciBmb3IgdGhlIG91dGVyIGNsYXNzIG5vZGUgKGlmIGFueSkuXG4gICAgY29uc3Qgb3V0ZXJDbGFzc05vZGUgPSBnZXRDbGFzc0RlY2xhcmF0aW9uRnJvbUlubmVyRnVuY3Rpb25EZWNsYXJhdGlvbihpZC5wYXJlbnQpO1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gc3VwZXIuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIob3V0ZXJDbGFzc05vZGUgPyBvdXRlckNsYXNzTm9kZS5uYW1lIDogaWQpO1xuXG4gICAgaWYgKCFkZWNsYXJhdGlvbiB8fCAhdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uLm5vZGUpIHx8XG4gICAgICAgIGRlY2xhcmF0aW9uLm5vZGUuaW5pdGlhbGl6ZXIgIT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAvLyBWYXJpYWJsZURlY2xhcmF0aW9uID0+IFZhcmlhYmxlRGVjbGFyYXRpb25MaXN0ID0+IFZhcmlhYmxlU3RhdGVtZW50ID0+IElJRkUgQmxvY2tcbiAgICAgICAgIXRzLmlzQmxvY2soZGVjbGFyYXRpb24ubm9kZS5wYXJlbnQucGFyZW50LnBhcmVudCkpIHtcbiAgICAgIHJldHVybiBkZWNsYXJhdGlvbjtcbiAgICB9XG5cbiAgICAvLyBXZSBtaWdodCBoYXZlIGFuIGFsaWFzIHRvIGFub3RoZXIgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAgLy8gU2VhcmNoIHRoZSBjb250YWluaW5nIGlpZmUgYm9keSBmb3IgaXQuXG4gICAgY29uc3QgYmxvY2sgPSBkZWNsYXJhdGlvbi5ub2RlLnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgIGNvbnN0IGFsaWFzU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZGVjbGFyYXRpb24ubm9kZS5uYW1lKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJsb2NrLnN0YXRlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHN0YXRlbWVudCA9IGJsb2NrLnN0YXRlbWVudHNbaV07XG4gICAgICAvLyBMb29raW5nIGZvciBzdGF0ZW1lbnQgdGhhdCBsb29rcyBsaWtlOiBgQWxpYXNlZFZhcmlhYmxlID0gT3JpZ2luYWxWYXJpYWJsZTtgXG4gICAgICBpZiAoaXNBc3NpZ25tZW50U3RhdGVtZW50KHN0YXRlbWVudCkgJiYgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQpICYmXG4gICAgICAgICAgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLnJpZ2h0KSAmJlxuICAgICAgICAgIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQpID09PSBhbGlhc1N5bWJvbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIGEgZnVuY3Rpb24gZGVjbGFyYXRpb24gdG8gZmluZCB0aGUgcmVsZXZhbnQgbWV0YWRhdGEgYWJvdXQgaXQuXG4gICAqXG4gICAqIEluIEVTTTUgd2UgbmVlZCB0byBkbyBzcGVjaWFsIHdvcmsgd2l0aCBvcHRpb25hbCBhcmd1bWVudHMgdG8gdGhlIGZ1bmN0aW9uLCBzaW5jZSB0aGV5IGdldFxuICAgKiB0aGVpciBvd24gaW5pdGlhbGl6ZXIgc3RhdGVtZW50IHRoYXQgbmVlZHMgdG8gYmUgcGFyc2VkIGFuZCB0aGVuIG5vdCBpbmNsdWRlZCBpbiB0aGUgXCJib2R5XCJcbiAgICogc3RhdGVtZW50cyBvZiB0aGUgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIHRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiB0byBwYXJzZS5cbiAgICogQHJldHVybnMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5vZGUsIHN0YXRlbWVudHMgYW5kIHBhcmFtZXRlcnMgb2YgdGhlIGZ1bmN0aW9uLlxuICAgKi9cbiAgZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24obm9kZTogdHMuTm9kZSk6IEZ1bmN0aW9uRGVmaW5pdGlvbnxudWxsIHtcbiAgICBpZiAoIXRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSAmJiAhdHMuaXNNZXRob2REZWNsYXJhdGlvbihub2RlKSAmJlxuICAgICAgICAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24obm9kZSkgJiYgIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdHNIZWxwZXJGbiA9IGdldFRzSGVscGVyRm4obm9kZSk7XG4gICAgaWYgKHRzSGVscGVyRm4gIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5vZGUsXG4gICAgICAgIGJvZHk6IG51bGwsXG4gICAgICAgIGhlbHBlcjogdHNIZWxwZXJGbixcbiAgICAgICAgcGFyYW1ldGVyczogW10sXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBub2RlIHdhcyBub3QgaWRlbnRpZmllZCB0byBiZSBhIFR5cGVTY3JpcHQgaGVscGVyLCBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGF0IHRoaXNcbiAgICAvLyBwb2ludCBjYW5ub3QgYmUgcmVzb2x2ZWQgYXMgYSBmdW5jdGlvbi5cbiAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJhbWV0ZXJzID1cbiAgICAgICAgbm9kZS5wYXJhbWV0ZXJzLm1hcChwID0+ICh7bmFtZTogZ2V0TmFtZVRleHQocC5uYW1lKSwgbm9kZTogcCwgaW5pdGlhbGl6ZXI6IG51bGx9KSk7XG4gICAgbGV0IGxvb2tpbmdGb3JQYXJhbUluaXRpYWxpemVycyA9IHRydWU7XG5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gbm9kZS5ib2R5ICYmIG5vZGUuYm9keS5zdGF0ZW1lbnRzLmZpbHRlcihzID0+IHtcbiAgICAgIGxvb2tpbmdGb3JQYXJhbUluaXRpYWxpemVycyA9XG4gICAgICAgICAgbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzICYmIHJlZmxlY3RQYXJhbUluaXRpYWxpemVyKHMsIHBhcmFtZXRlcnMpO1xuICAgICAgLy8gSWYgd2UgYXJlIG5vIGxvbmdlciBsb29raW5nIGZvciBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXJzIHRoZW4gd2UgaW5jbHVkZSB0aGlzIHN0YXRlbWVudFxuICAgICAgcmV0dXJuICFsb29raW5nRm9yUGFyYW1Jbml0aWFsaXplcnM7XG4gICAgfSk7XG5cbiAgICByZXR1cm4ge25vZGUsIGJvZHk6IHN0YXRlbWVudHMgfHwgbnVsbCwgaGVscGVyOiBudWxsLCBwYXJhbWV0ZXJzfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gd2hpY2ggc2hvdWxkIGJlIG9mIGEgY2xhc3MsIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgdGhlIG1lbWJlcnMgb2YgdGhlXG4gICAqIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gYSBUeXBlU2NyaXB0IGB0cy5EZWNsYXJhdGlvbmAgbm9kZSByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG9cbiAgICogcmVmbGVjdC5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYENsYXNzTWVtYmVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIG1lbWJlcnMgb2YgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBAdGhyb3dzIGlmIGBkZWNsYXJhdGlvbmAgZG9lcyBub3QgcmVzb2x2ZSB0byBhIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgZ2V0TWVtYmVyc09mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDbGFzc01lbWJlcltdIHtcbiAgICAvLyBEbyBub3QgZm9sbG93IEVTNSdzIHJlc29sdXRpb24gbG9naWMgd2hlbiB0aGUgbm9kZSByZXNpZGVzIGluIGEgLmQudHMgZmlsZS5cbiAgICBpZiAoaXNGcm9tRHRzRmlsZShjbGF6eikpIHtcbiAgICAgIHJldHVybiBzdXBlci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eik7XG4gICAgfVxuXG4gICAgLy8gVGhlIG5lY2Vzc2FyeSBpbmZvIGlzIG9uIHRoZSBpbm5lciBmdW5jdGlvbiBkZWNsYXJhdGlvbiAoaW5zaWRlIHRoZSBFUzUgY2xhc3MgSUlGRSkuXG4gICAgY29uc3QgaW5uZXJGdW5jdGlvblN5bWJvbCA9IHRoaXMuZ2V0SW5uZXJGdW5jdGlvblN5bWJvbEZyb21DbGFzc0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoIWlubmVyRnVuY3Rpb25TeW1ib2wpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQXR0ZW1wdGVkIHRvIGdldCBtZW1iZXJzIG9mIGEgbm9uLWNsYXNzOiBcIiR7KGNsYXp6IGFzIENsYXNzRGVjbGFyYXRpb24pLmdldFRleHQoKX1cImApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmdldE1lbWJlcnNPZlN5bWJvbChpbm5lckZ1bmN0aW9uU3ltYm9sKTtcbiAgfVxuXG4gIC8qKiBHZXRzIGFsbCBkZWNvcmF0b3JzIG9mIHRoZSBnaXZlbiBjbGFzcyBzeW1ib2wuICovXG4gIGdldERlY29yYXRvcnNPZlN5bWJvbChzeW1ib2w6IENsYXNzU3ltYm9sKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgLy8gVGhlIG5lY2Vzc2FyeSBpbmZvIGlzIG9uIHRoZSBpbm5lciBmdW5jdGlvbiBkZWNsYXJhdGlvbiAoaW5zaWRlIHRoZSBFUzUgY2xhc3MgSUlGRSkuXG4gICAgY29uc3QgaW5uZXJGdW5jdGlvblN5bWJvbCA9XG4gICAgICAgIHRoaXMuZ2V0SW5uZXJGdW5jdGlvblN5bWJvbEZyb21DbGFzc0RlY2xhcmF0aW9uKHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICBpZiAoIWlubmVyRnVuY3Rpb25TeW1ib2wpIHJldHVybiBudWxsO1xuXG4gICAgcmV0dXJuIHN1cGVyLmdldERlY29yYXRvcnNPZlN5bWJvbChpbm5lckZ1bmN0aW9uU3ltYm9sKTtcbiAgfVxuXG5cbiAgLy8vLy8vLy8vLy8vLyBQcm90ZWN0ZWQgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbiAgLyoqXG4gICAqIEdldCB0aGUgaW5uZXIgZnVuY3Rpb24gZGVjbGFyYXRpb24gb2YgYW4gRVM1LXN0eWxlIGNsYXNzLlxuICAgKlxuICAgKiBJbiBFUzUsIHRoZSBpbXBsZW1lbnRhdGlvbiBvZiBhIGNsYXNzIGlzIGEgZnVuY3Rpb24gZXhwcmVzc2lvbiB0aGF0IGlzIGhpZGRlbiBpbnNpZGUgYW4gSUlGRVxuICAgKiBhbmQgcmV0dXJuZWQgdG8gYmUgYXNzaWduZWQgdG8gYSB2YXJpYWJsZSBvdXRzaWRlIHRoZSBJSUZFLCB3aGljaCBpcyB3aGF0IHRoZSByZXN0IG9mIHRoZVxuICAgKiBwcm9ncmFtIGludGVyYWN0cyB3aXRoLlxuICAgKlxuICAgKiBHaXZlbiB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24sIHdlIHdhbnQgdG8gZ2V0IHRvIHRoZSBpbm5lciBmdW5jdGlvbiBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgYSBub2RlIHRoYXQgY291bGQgYmUgdGhlIHZhcmlhYmxlIGV4cHJlc3Npb24gb3V0c2lkZSBhbiBFUzUgY2xhc3MgSUlGRS5cbiAgICogQHBhcmFtIGNoZWNrZXIgdGhlIFRTIHByb2dyYW0gVHlwZUNoZWNrZXJcbiAgICogQHJldHVybnMgdGhlIGlubmVyIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIG9yIGB1bmRlZmluZWRgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIi5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRJbm5lckZ1bmN0aW9uRGVjbGFyYXRpb25Gcm9tQ2xhc3NEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvblxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAvLyBFeHRyYWN0IHRoZSBJSUZFIGJvZHkgKGlmIGFueSkuXG4gICAgY29uc3QgaWlmZUJvZHkgPSBnZXRJaWZlQm9keShub2RlKTtcbiAgICBpZiAoIWlpZmVCb2R5KSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgLy8gRXh0cmFjdCB0aGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gZnJvbSBpbnNpZGUgdGhlIElJRkUuXG4gICAgY29uc3QgZnVuY3Rpb25EZWNsYXJhdGlvbiA9IGlpZmVCb2R5LnN0YXRlbWVudHMuZmluZCh0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24pO1xuICAgIGlmICghZnVuY3Rpb25EZWNsYXJhdGlvbikgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIEV4dHJhY3QgdGhlIHJldHVybiBpZGVudGlmaWVyIG9mIHRoZSBJSUZFLlxuICAgIGNvbnN0IHJldHVybklkZW50aWZpZXIgPSBnZXRSZXR1cm5JZGVudGlmaWVyKGlpZmVCb2R5KTtcbiAgICBjb25zdCByZXR1cm5JZGVudGlmaWVyU3ltYm9sID1cbiAgICAgICAgcmV0dXJuSWRlbnRpZmllciAmJiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihyZXR1cm5JZGVudGlmaWVyKTtcbiAgICBpZiAoIXJldHVybklkZW50aWZpZXJTeW1ib2wpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAvLyBWZXJpZnkgdGhhdCB0aGUgaW5uZXIgZnVuY3Rpb24gaXMgcmV0dXJuZWQuXG4gICAgaWYgKHJldHVybklkZW50aWZpZXJTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiAhPT0gZnVuY3Rpb25EZWNsYXJhdGlvbikgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIHJldHVybiBmdW5jdGlvbkRlY2xhcmF0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgaWRlbnRpZmllciBzeW1ib2wgb2YgdGhlIGlubmVyIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIG9mIGFuIEVTNS1zdHlsZSBjbGFzcy5cbiAgICpcbiAgICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkVcbiAgICogYW5kIHJldHVybmVkIHRvIGJlIGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgb3V0c2lkZSB0aGUgSUlGRSwgd2hpY2ggaXMgd2hhdCB0aGUgcmVzdCBvZiB0aGVcbiAgICogcHJvZ3JhbSBpbnRlcmFjdHMgd2l0aC5cbiAgICpcbiAgICogR2l2ZW4gdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uLCB3ZSB3YW50IHRvIGdldCB0byB0aGUgaWRlbnRpZmllciBzeW1ib2wgb2YgdGhlIGlubmVyXG4gICAqIGZ1bmN0aW9uIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogYSBub2RlIHRoYXQgY291bGQgYmUgdGhlIHZhcmlhYmxlIGV4cHJlc3Npb24gb3V0c2lkZSBhbiBFUzUgY2xhc3MgSUlGRS5cbiAgICogQHBhcmFtIGNoZWNrZXIgdGhlIFRTIHByb2dyYW0gVHlwZUNoZWNrZXJcbiAgICogQHJldHVybnMgdGhlIGlubmVyIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGlkZW50aWZpZXIgc3ltYm9sIG9yIGB1bmRlZmluZWRgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIlxuICAgKiBvciBoYXMgbm8gaWRlbnRpZmllci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRJbm5lckZ1bmN0aW9uU3ltYm9sRnJvbUNsYXNzRGVjbGFyYXRpb24oY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDbGFzc1N5bWJvbFxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgaW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uID0gdGhpcy5nZXRJbm5lckZ1bmN0aW9uRGVjbGFyYXRpb25Gcm9tQ2xhc3NEZWNsYXJhdGlvbihjbGF6eik7XG4gICAgaWYgKCFpbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24gfHwgIWhhc05hbWVJZGVudGlmaWVyKGlubmVyRnVuY3Rpb25EZWNsYXJhdGlvbikpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICByZXR1cm4gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uLm5hbWUpIGFzIENsYXNzU3ltYm9sO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIGRlY2xhcmF0aW9ucyBvZiB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIGNsYXNzIGlkZW50aWZpZWQgYnkgaXRzIHN5bWJvbC5cbiAgICpcbiAgICogSW4gRVNNNSwgdGhlcmUgaXMgbm8gXCJjbGFzc1wiIHNvIHRoZSBjb25zdHJ1Y3RvciB0aGF0IHdlIHdhbnQgaXMgYWN0dWFsbHkgdGhlIGlubmVyIGZ1bmN0aW9uXG4gICAqIGRlY2xhcmF0aW9uIGluc2lkZSB0aGUgSUlGRSwgd2hvc2UgcmV0dXJuIHZhbHVlIGlzIGFzc2lnbmVkIHRvIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvblxuICAgKiAodGhhdCByZXByZXNlbnRzIHRoZSBjbGFzcyB0byB0aGUgcmVzdCBvZiB0aGUgcHJvZ3JhbSkuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgc3ltYm9sIG9mIHRoZSBjbGFzcyAoaS5lLiB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24pIHdob3NlXG4gICAqIHBhcmFtZXRlcnMgd2Ugd2FudCB0byBmaW5kLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25gIG9iamVjdHMgcmVwcmVzZW50aW5nIGVhY2ggb2YgdGhlIHBhcmFtZXRlcnMgaW5cbiAgICogdGhlIGNsYXNzJ3MgY29uc3RydWN0b3Igb3IgYG51bGxgIGlmIHRoZXJlIGlzIG5vIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1ldGVyRGVjbGFyYXRpb25zKGNsYXNzU3ltYm9sOiBDbGFzc1N5bWJvbCk6XG4gICAgICB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdfG51bGwge1xuICAgIGNvbnN0IGNvbnN0cnVjdG9yID1cbiAgICAgICAgdGhpcy5nZXRJbm5lckZ1bmN0aW9uRGVjbGFyYXRpb25Gcm9tQ2xhc3NEZWNsYXJhdGlvbihjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICBpZiAoIWNvbnN0cnVjdG9yKSByZXR1cm4gbnVsbDtcblxuICAgIGlmIChjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpO1xuICAgIH1cblxuICAgIGlmIChpc1N5bnRoZXNpemVkQ29uc3RydWN0b3IoY29uc3RydWN0b3IpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgZGVjb3JhdG9ycyBvZiBhIGNsYXNzIGNvbnN0cnVjdG9yLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIHN5bWJvbCBvZiB0aGUgY2xhc3MgKGkuZS4gdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uKSB3aG9zZVxuICAgKiBwYXJhbWV0ZXIgaW5mbyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHBhcmFtIHBhcmFtZXRlck5vZGVzIHRoZSBhcnJheSBvZiBUeXBlU2NyaXB0IHBhcmFtZXRlciBub2RlcyBmb3IgdGhpcyBjbGFzcydzIGNvbnN0cnVjdG9yLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgaW5mbyBvYmplY3RzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1JbmZvKFxuICAgICAgY2xhc3NTeW1ib2w6IENsYXNzU3ltYm9sLCBwYXJhbWV0ZXJOb2RlczogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25bXSk6IEN0b3JQYXJhbWV0ZXJbXSB7XG4gICAgLy8gVGhlIG5lY2Vzc2FyeSBpbmZvIGlzIG9uIHRoZSBpbm5lciBmdW5jdGlvbiBkZWNsYXJhdGlvbiAoaW5zaWRlIHRoZSBFUzUgY2xhc3MgSUlGRSkuXG4gICAgY29uc3QgaW5uZXJGdW5jdGlvblN5bWJvbCA9XG4gICAgICAgIHRoaXMuZ2V0SW5uZXJGdW5jdGlvblN5bWJvbEZyb21DbGFzc0RlY2xhcmF0aW9uKGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIGlmICghaW5uZXJGdW5jdGlvblN5bWJvbCkgcmV0dXJuIFtdO1xuXG4gICAgcmV0dXJuIHN1cGVyLmdldENvbnN0cnVjdG9yUGFyYW1JbmZvKGlubmVyRnVuY3Rpb25TeW1ib2wsIHBhcmFtZXRlck5vZGVzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyxcbiAgICogd2hlcmUgdGhlIGluZm9ybWF0aW9uIGlzIHN0b3JlZCBvbiBhIHN0YXRpYyBtZXRob2Qgb2YgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBJbiB0aGlzIGNhc2UgdGhlIGRlY29yYXRvcnMgYXJlIHN0b3JlZCBpbiB0aGUgYm9keSBvZiBhIG1ldGhvZFxuICAgKiAoYGN0b3JQYXJhdGVtZXJzYCkgYXR0YWNoZWQgdG8gdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdW5saWtlIEVTTTIwMTUgdGhpcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gcmF0aGVyIHRoYW4gYW4gYXJyb3dcbiAgICogZnVuY3Rpb246XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gZnVuY3Rpb24oKSB7IHJldHVybiBbXG4gICAqICAgeyB0eXBlOiBWaWV3Q29udGFpbmVyUmVmLCB9LFxuICAgKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gICAqICAgeyB0eXBlOiBJdGVyYWJsZURpZmZlcnMsIH0sXG4gICAqICAgeyB0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7IHR5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOLF0gfSxdIH0sXG4gICAqIF07IH07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1EZWNvcmF0b3JzUHJvcGVydHkgdGhlIHByb3BlcnR5IHRoYXQgaG9sZHMgdGhlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgdGhlIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIGVhY2ggcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFBhcmFtSW5mb0Zyb21TdGF0aWNQcm9wZXJ0eShwYXJhbURlY29yYXRvcnNQcm9wZXJ0eTogdHMuU3ltYm9sKTogUGFyYW1JbmZvW118bnVsbCB7XG4gICAgY29uc3QgcGFyYW1EZWNvcmF0b3JzID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIGNvbnN0IHJldHVyblN0YXRlbWVudCA9IGdldFJldHVyblN0YXRlbWVudChwYXJhbURlY29yYXRvcnMpO1xuICAgIGNvbnN0IGV4cHJlc3Npb24gPSByZXR1cm5TdGF0ZW1lbnQgJiYgcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb247XG4gICAgaWYgKGV4cHJlc3Npb24gJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGV4cHJlc3Npb24pKSB7XG4gICAgICBjb25zdCBlbGVtZW50cyA9IGV4cHJlc3Npb24uZWxlbWVudHM7XG4gICAgICByZXR1cm4gZWxlbWVudHMubWFwKHJlZmxlY3RBcnJheUVsZW1lbnQpLm1hcChwYXJhbUluZm8gPT4ge1xuICAgICAgICBjb25zdCB0eXBlRXhwcmVzc2lvbiA9IHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uaGFzKCd0eXBlJykgPyBwYXJhbUluZm8uZ2V0KCd0eXBlJykgISA6IG51bGw7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvckluZm8gPVxuICAgICAgICAgICAgcGFyYW1JbmZvICYmIHBhcmFtSW5mby5oYXMoJ2RlY29yYXRvcnMnKSA/IHBhcmFtSW5mby5nZXQoJ2RlY29yYXRvcnMnKSAhIDogbnVsbDtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvckluZm8gJiYgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JJbmZvKTtcbiAgICAgICAgcmV0dXJuIHt0eXBlRXhwcmVzc2lvbiwgZGVjb3JhdG9yc307XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIGEgc3ltYm9sIGFuZCBleHRyYWN0IHRoZSBtZW1iZXIgaW5mb3JtYXRpb24sIGNvbWJpbmluZyBpdCB3aXRoIHRoZVxuICAgKiBwcm92aWRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24sIGFuZCB3aGV0aGVyIGl0IGlzIGEgc3RhdGljIG1lbWJlci5cbiAgICpcbiAgICogSWYgYSBjbGFzcyBtZW1iZXIgdXNlcyBhY2Nlc3NvcnMgKGUuZyBnZXR0ZXJzIGFuZC9vciBzZXR0ZXJzKSB0aGVuIGl0IGdldHMgZG93bmxldmVsZWRcbiAgICogaW4gRVM1IHRvIGEgc2luZ2xlIGBPYmplY3QuZGVmaW5lUHJvcGVydHkoKWAgY2FsbC4gSW4gdGhhdCBjYXNlIHdlIG11c3QgcGFyc2UgdGhpc1xuICAgKiBjYWxsIHRvIGV4dHJhY3QgdGhlIG9uZSBvciB0d28gQ2xhc3NNZW1iZXIgb2JqZWN0cyB0aGF0IHJlcHJlc2VudCB0aGUgYWNjZXNzb3JzLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBzeW1ib2wgZm9yIHRoZSBtZW1iZXIgdG8gcmVmbGVjdCBvdmVyLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVycyhzeW1ib2w6IHRzLlN5bWJvbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLCBpc1N0YXRpYz86IGJvb2xlYW4pOlxuICAgICAgQ2xhc3NNZW1iZXJbXXxudWxsIHtcbiAgICBjb25zdCBub2RlID0gc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gfHwgc3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgIGNvbnN0IHByb3BlcnR5RGVmaW5pdGlvbiA9IG5vZGUgJiYgZ2V0UHJvcGVydHlEZWZpbml0aW9uKG5vZGUpO1xuICAgIGlmIChwcm9wZXJ0eURlZmluaXRpb24pIHtcbiAgICAgIGNvbnN0IG1lbWJlcnM6IENsYXNzTWVtYmVyW10gPSBbXTtcbiAgICAgIGlmIChwcm9wZXJ0eURlZmluaXRpb24uc2V0dGVyKSB7XG4gICAgICAgIG1lbWJlcnMucHVzaCh7XG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgICBpbXBsZW1lbnRhdGlvbjogcHJvcGVydHlEZWZpbml0aW9uLnNldHRlcixcbiAgICAgICAgICBraW5kOiBDbGFzc01lbWJlcktpbmQuU2V0dGVyLFxuICAgICAgICAgIHR5cGU6IG51bGwsXG4gICAgICAgICAgbmFtZTogc3ltYm9sLm5hbWUsXG4gICAgICAgICAgbmFtZU5vZGU6IG51bGwsXG4gICAgICAgICAgdmFsdWU6IG51bGwsXG4gICAgICAgICAgaXNTdGF0aWM6IGlzU3RhdGljIHx8IGZhbHNlLFxuICAgICAgICAgIGRlY29yYXRvcnM6IGRlY29yYXRvcnMgfHwgW10sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYXR0YWNoaW5nIHRoZSBkZWNvcmF0b3JzIHRvIGEgcG90ZW50aWFsIGdldHRlci4gSW4gRVM1LCB3ZSBjYW4ndCB0ZWxsIHdoZXJlIHRoZVxuICAgICAgICAvLyBkZWNvcmF0b3JzIHdlcmUgb3JpZ2luYWxseSBhdHRhY2hlZCB0bywgaG93ZXZlciB3ZSBvbmx5IHdhbnQgdG8gYXR0YWNoIHRoZW0gdG8gYSBzaW5nbGVcbiAgICAgICAgLy8gYENsYXNzTWVtYmVyYCBhcyBvdGhlcndpc2Ugbmd0c2Mgd291bGQgaGFuZGxlIHRoZSBzYW1lIGRlY29yYXRvcnMgdHdpY2UuXG4gICAgICAgIGRlY29yYXRvcnMgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBpZiAocHJvcGVydHlEZWZpbml0aW9uLmdldHRlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHByb3BlcnR5RGVmaW5pdGlvbi5nZXR0ZXIsXG4gICAgICAgICAga2luZDogQ2xhc3NNZW1iZXJLaW5kLkdldHRlcixcbiAgICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgICAgIG5hbWU6IHN5bWJvbC5uYW1lLFxuICAgICAgICAgIG5hbWVOb2RlOiBudWxsLFxuICAgICAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgICAgIGlzU3RhdGljOiBpc1N0YXRpYyB8fCBmYWxzZSxcbiAgICAgICAgICBkZWNvcmF0b3JzOiBkZWNvcmF0b3JzIHx8IFtdLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZW1iZXJzO1xuICAgIH1cblxuICAgIGNvbnN0IG1lbWJlcnMgPSBzdXBlci5yZWZsZWN0TWVtYmVycyhzeW1ib2wsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICBtZW1iZXJzICYmIG1lbWJlcnMuZm9yRWFjaChtZW1iZXIgPT4ge1xuICAgICAgaWYgKG1lbWJlciAmJiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZCAmJiBtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLm5vZGUgJiZcbiAgICAgICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihtZW1iZXIubm9kZSkgJiYgbWVtYmVyLm5vZGUucGFyZW50ICYmXG4gICAgICAgICAgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG1lbWJlci5ub2RlLnBhcmVudCkgJiZcbiAgICAgICAgICB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihtZW1iZXIubm9kZS5wYXJlbnQucmlnaHQpKSB7XG4gICAgICAgIC8vIFJlY29tcHV0ZSB0aGUgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWVtYmVyOlxuICAgICAgICAvLyBFUzUgc3RhdGljIG1ldGhvZHMgYXJlIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBzbyB0aGUgZGVjbGFyYXRpb24gaXMgYWN0dWFsbHkgdGhlXG4gICAgICAgIC8vIGluaXRpYWxpemVyIG9mIHRoZSB2YXJpYWJsZSBhc3NpZ25tZW50XG4gICAgICAgIG1lbWJlci5pbXBsZW1lbnRhdGlvbiA9IG1lbWJlci5ub2RlLnBhcmVudC5yaWdodDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbWVtYmVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgdGhhdCBtYXkgY29udGFpbiBjYWxscyB0byBhIGhlbHBlci5cbiAgICpcbiAgICogSW4gRVNNNSBjb2RlIHRoZSBoZWxwZXIgY2FsbHMgYXJlIGhpZGRlbiBpbnNpZGUgdGhlIGNsYXNzJ3MgSUlGRS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBoZWxwZXIgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uIFdlIGV4cGVjdCB0aGlzIHN5bWJvbFxuICAgKiB0byByZWZlcmVuY2UgdGhlIGlubmVyIGlkZW50aWZpZXIgaW5zaWRlIHRoZSBJSUZFLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBzdGF0ZW1lbnRzIHRoYXQgbWF5IGNvbnRhaW4gaGVscGVyIGNhbGxzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbDogQ2xhc3NTeW1ib2wpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvblBhcmVudCA9IGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24ucGFyZW50O1xuICAgIHJldHVybiB0cy5pc0Jsb2NrKGNsYXNzRGVjbGFyYXRpb25QYXJlbnQpID8gQXJyYXkuZnJvbShjbGFzc0RlY2xhcmF0aW9uUGFyZW50LnN0YXRlbWVudHMpIDogW107XG4gIH1cbn1cblxuLy8vLy8vLy8vLy8vLyBJbnRlcm5hbCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBkZXRhaWxzIGFib3V0IHByb3BlcnR5IGRlZmluaXRpb25zIHRoYXQgd2VyZSBzZXQgdXNpbmcgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eWAuXG4gKi9cbmludGVyZmFjZSBQcm9wZXJ0eURlZmluaXRpb24ge1xuICBzZXR0ZXI6IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbnxudWxsO1xuICBnZXR0ZXI6IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbnxudWxsO1xufVxuXG4vKipcbiAqIEluIEVTNSwgZ2V0dGVycyBhbmQgc2V0dGVycyBoYXZlIGJlZW4gZG93bmxldmVsZWQgaW50byBjYWxsIGV4cHJlc3Npb25zIG9mXG4gKiBgT2JqZWN0LmRlZmluZVByb3BlcnR5YCwgc3VjaCBhc1xuICpcbiAqIGBgYFxuICogT2JqZWN0LmRlZmluZVByb3BlcnR5KENsYXp6LnByb3RvdHlwZSwgXCJwcm9wZXJ0eVwiLCB7XG4gKiAgIGdldDogZnVuY3Rpb24gKCkge1xuICogICAgICAgcmV0dXJuICd2YWx1ZSc7XG4gKiAgIH0sXG4gKiAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gKiAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gKiAgIH0sXG4gKiAgIGVudW1lcmFibGU6IHRydWUsXG4gKiAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIGluc3BlY3RzIHRoZSBnaXZlbiBub2RlIHRvIGRldGVybWluZSBpZiBpdCBjb3JyZXNwb25kcyB3aXRoIHN1Y2ggYSBjYWxsLCBhbmQgaWYgc29cbiAqIGV4dHJhY3RzIHRoZSBgc2V0YCBhbmQgYGdldGAgZnVuY3Rpb24gZXhwcmVzc2lvbnMgZnJvbSB0aGUgZGVzY3JpcHRvciBvYmplY3QsIGlmIHRoZXkgZXhpc3QuXG4gKlxuICogQHBhcmFtIG5vZGUgVGhlIG5vZGUgdG8gb2J0YWluIHRoZSBwcm9wZXJ0eSBkZWZpbml0aW9uIGZyb20uXG4gKiBAcmV0dXJucyBUaGUgcHJvcGVydHkgZGVmaW5pdGlvbiBpZiB0aGUgbm9kZSBjb3JyZXNwb25kcyB3aXRoIGFjY2Vzc29yLCBudWxsIG90aGVyd2lzZS5cbiAqL1xuZnVuY3Rpb24gZ2V0UHJvcGVydHlEZWZpbml0aW9uKG5vZGU6IHRzLk5vZGUpOiBQcm9wZXJ0eURlZmluaXRpb258bnVsbCB7XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSkgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgZm4gPSBub2RlLmV4cHJlc3Npb247XG4gIGlmICghdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oZm4pIHx8ICF0cy5pc0lkZW50aWZpZXIoZm4uZXhwcmVzc2lvbikgfHxcbiAgICAgIGZuLmV4cHJlc3Npb24udGV4dCAhPT0gJ09iamVjdCcgfHwgZm4ubmFtZS50ZXh0ICE9PSAnZGVmaW5lUHJvcGVydHknKVxuICAgIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGRlc2NyaXB0b3IgPSBub2RlLmFyZ3VtZW50c1syXTtcbiAgaWYgKCFkZXNjcmlwdG9yIHx8ICF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGRlc2NyaXB0b3IpKSByZXR1cm4gbnVsbDtcblxuICByZXR1cm4ge1xuICAgIHNldHRlcjogcmVhZFByb3BlcnR5RnVuY3Rpb25FeHByZXNzaW9uKGRlc2NyaXB0b3IsICdzZXQnKSxcbiAgICBnZXR0ZXI6IHJlYWRQcm9wZXJ0eUZ1bmN0aW9uRXhwcmVzc2lvbihkZXNjcmlwdG9yLCAnZ2V0JyksXG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlYWRQcm9wZXJ0eUZ1bmN0aW9uRXhwcmVzc2lvbihvYmplY3Q6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uLCBuYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgcHJvcGVydHkgPSBvYmplY3QucHJvcGVydGllcy5maW5kKFxuICAgICAgKHApOiBwIGlzIHRzLlByb3BlcnR5QXNzaWdubWVudCA9PlxuICAgICAgICAgIHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHApICYmIHRzLmlzSWRlbnRpZmllcihwLm5hbWUpICYmIHAubmFtZS50ZXh0ID09PSBuYW1lKTtcblxuICByZXR1cm4gcHJvcGVydHkgJiYgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24ocHJvcGVydHkuaW5pdGlhbGl6ZXIpICYmIHByb3BlcnR5LmluaXRpYWxpemVyIHx8IG51bGw7XG59XG5cbi8qKlxuICogR2V0IHRoZSBhY3R1YWwgKG91dGVyKSBkZWNsYXJhdGlvbiBvZiBhIGNsYXNzLlxuICpcbiAqIEluIEVTNSwgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY2xhc3MgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHRoYXQgaXMgaGlkZGVuIGluc2lkZSBhbiBJSUZFIGFuZFxuICogcmV0dXJuZWQgdG8gYmUgYXNzaWduZWQgdG8gYSB2YXJpYWJsZSBvdXRzaWRlIHRoZSBJSUZFLCB3aGljaCBpcyB3aGF0IHRoZSByZXN0IG9mIHRoZSBwcm9ncmFtXG4gKiBpbnRlcmFjdHMgd2l0aC5cbiAqXG4gKiBHaXZlbiB0aGUgaW5uZXIgZnVuY3Rpb24gZGVjbGFyYXRpb24sIHdlIHdhbnQgdG8gZ2V0IHRvIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgb3V0ZXIgdmFyaWFibGVcbiAqIHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3MuXG4gKlxuICogQHBhcmFtIG5vZGUgYSBub2RlIHRoYXQgY291bGQgYmUgdGhlIGZ1bmN0aW9uIGV4cHJlc3Npb24gaW5zaWRlIGFuIEVTNSBjbGFzcyBJSUZFLlxuICogQHJldHVybnMgdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9yIGB1bmRlZmluZWRgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIi5cbiAqL1xuZnVuY3Rpb24gZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6XG4gICAgQ2xhc3NEZWNsYXJhdGlvbjx0cy5WYXJpYWJsZURlY2xhcmF0aW9uPnx1bmRlZmluZWQge1xuICBpZiAodHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgLy8gSXQgbWlnaHQgYmUgdGhlIGZ1bmN0aW9uIGV4cHJlc3Npb24gaW5zaWRlIHRoZSBJSUZFLiBXZSBuZWVkIHRvIGdvIDUgbGV2ZWxzIHVwLi4uXG5cbiAgICAvLyAxLiBJSUZFIGJvZHkuXG4gICAgbGV0IG91dGVyTm9kZSA9IG5vZGUucGFyZW50O1xuICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc0Jsb2NrKG91dGVyTm9kZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAvLyAyLiBJSUZFIGZ1bmN0aW9uIGV4cHJlc3Npb24uXG4gICAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcbiAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24ob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIDMuIElJRkUgY2FsbCBleHByZXNzaW9uLlxuICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzQ2FsbEV4cHJlc3Npb24ob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIDQuIFBhcmVudGhlc2lzIGFyb3VuZCBJSUZFLlxuICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24ob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIDUuIE91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgLy8gRmluYWxseSwgZW5zdXJlIHRoYXQgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGhhcyBhIGBuYW1lYCBpZGVudGlmaWVyLlxuICAgIHJldHVybiBoYXNOYW1lSWRlbnRpZmllcihvdXRlck5vZGUpID8gb3V0ZXJOb2RlIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldElpZmVCb2R5KGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLkJsb2NrfHVuZGVmaW5lZCB7XG4gIGlmICghdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSB8fCAhZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgfHxcbiAgICAgICF0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyKSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY2FsbCA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICByZXR1cm4gdHMuaXNDYWxsRXhwcmVzc2lvbihjYWxsLmV4cHJlc3Npb24pICYmXG4gICAgICAgICAgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uLmV4cHJlc3Npb24pID9cbiAgICAgIGNhbGwuZXhwcmVzc2lvbi5leHByZXNzaW9uLmJvZHkgOlxuICAgICAgdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBnZXRSZXR1cm5JZGVudGlmaWVyKGJvZHk6IHRzLkJsb2NrKTogdHMuSWRlbnRpZmllcnx1bmRlZmluZWQge1xuICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBib2R5LnN0YXRlbWVudHMuZmluZCh0cy5pc1JldHVyblN0YXRlbWVudCk7XG4gIHJldHVybiByZXR1cm5TdGF0ZW1lbnQgJiYgcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24gJiZcbiAgICAgICAgICB0cy5pc0lkZW50aWZpZXIocmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24pID9cbiAgICAgIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uIDpcbiAgICAgIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZ2V0UmV0dXJuU3RhdGVtZW50KGRlY2xhcmF0aW9uOiB0cy5FeHByZXNzaW9uIHwgdW5kZWZpbmVkKTogdHMuUmV0dXJuU3RhdGVtZW50fHVuZGVmaW5lZCB7XG4gIHJldHVybiBkZWNsYXJhdGlvbiAmJiB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihkZWNsYXJhdGlvbikgP1xuICAgICAgZGVjbGFyYXRpb24uYm9keS5zdGF0ZW1lbnRzLmZpbmQodHMuaXNSZXR1cm5TdGF0ZW1lbnQpIDpcbiAgICAgIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gcmVmbGVjdEFycmF5RWxlbWVudChlbGVtZW50OiB0cy5FeHByZXNzaW9uKSB7XG4gIHJldHVybiB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGVsZW1lbnQpID8gcmVmbGVjdE9iamVjdExpdGVyYWwoZWxlbWVudCkgOiBudWxsO1xufVxuXG4vKipcbiAqIEluc3BlY3RzIGEgZnVuY3Rpb24gZGVjbGFyYXRpb24gdG8gZGV0ZXJtaW5lIGlmIGl0IGNvcnJlc3BvbmRzIHdpdGggYSBUeXBlU2NyaXB0IGhlbHBlciBmdW5jdGlvbixcbiAqIHJldHVybmluZyBpdHMga2luZCBpZiBzbyBvciBudWxsIGlmIHRoZSBkZWNsYXJhdGlvbiBkb2VzIG5vdCBzZWVtIHRvIGNvcnJlc3BvbmQgd2l0aCBzdWNoIGFcbiAqIGhlbHBlci5cbiAqL1xuZnVuY3Rpb24gZ2V0VHNIZWxwZXJGbihub2RlOiB0cy5OYW1lZERlY2xhcmF0aW9uKTogVHNIZWxwZXJGbnxudWxsIHtcbiAgY29uc3QgbmFtZSA9IG5vZGUubmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcihub2RlLm5hbWUpICYmIG5vZGUubmFtZS50ZXh0O1xuXG4gIGlmIChuYW1lID09PSAnX19zcHJlYWQnKSB7XG4gICAgcmV0dXJuIFRzSGVscGVyRm4uU3ByZWFkO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBtYXkgaGF2ZSBiZWVuIFwic3ludGhlc2l6ZWRcIiBieSBUeXBlU2NyaXB0IGR1cmluZyBKYXZhU2NyaXB0IGVtaXQsXG4gKiBpbiB0aGUgY2FzZSBubyB1c2VyLWRlZmluZWQgY29uc3RydWN0b3IgZXhpc3RzIGFuZCBlLmcuIHByb3BlcnR5IGluaXRpYWxpemVycyBhcmUgdXNlZC5cbiAqIFRob3NlIGluaXRpYWxpemVycyBuZWVkIHRvIGJlIGVtaXR0ZWQgaW50byBhIGNvbnN0cnVjdG9yIGluIEphdmFTY3JpcHQsIHNvIHRoZSBUeXBlU2NyaXB0XG4gKiBjb21waWxlciBnZW5lcmF0ZXMgYSBzeW50aGV0aWMgY29uc3RydWN0b3IuXG4gKlxuICogV2UgbmVlZCB0byBpZGVudGlmeSBzdWNoIGNvbnN0cnVjdG9ycyBhcyBuZ2NjIG5lZWRzIHRvIGJlIGFibGUgdG8gdGVsbCBpZiBhIGNsYXNzIGRpZFxuICogb3JpZ2luYWxseSBoYXZlIGEgY29uc3RydWN0b3IgaW4gdGhlIFR5cGVTY3JpcHQgc291cmNlLiBGb3IgRVM1LCB3ZSBjYW4gbm90IHRlbGwgYW5cbiAqIGVtcHR5IGNvbnN0cnVjdG9yIGFwYXJ0IGZyb20gYSBzeW50aGVzaXplZCBjb25zdHJ1Y3RvciwgYnV0IGZvcnR1bmF0ZWx5IHRoYXQgZG9lcyBub3RcbiAqIG1hdHRlciBmb3IgdGhlIGNvZGUgZ2VuZXJhdGVkIGJ5IG5ndHNjLlxuICpcbiAqIFdoZW4gYSBjbGFzcyBoYXMgYSBzdXBlcmNsYXNzIGhvd2V2ZXIsIGEgc3ludGhlc2l6ZWQgY29uc3RydWN0b3IgbXVzdCBub3QgYmUgY29uc2lkZXJlZFxuICogYXMgYSB1c2VyLWRlZmluZWQgY29uc3RydWN0b3IgYXMgdGhhdCBwcmV2ZW50cyBhIGJhc2UgZmFjdG9yeSBjYWxsIGZyb20gYmVpbmcgY3JlYXRlZCBieVxuICogbmd0c2MsIHJlc3VsdGluZyBpbiBhIGZhY3RvcnkgZnVuY3Rpb24gdGhhdCBkb2VzIG5vdCBpbmplY3QgdGhlIGRlcGVuZGVuY2llcyBvZiB0aGVcbiAqIHN1cGVyY2xhc3MuIEhlbmNlLCB3ZSBpZGVudGlmeSBhIGRlZmF1bHQgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBpbiB0aGUgY29uc3RydWN0b3IgYm9keSxcbiAqIGFjY29yZGluZyB0byB0aGUgc3RydWN0dXJlIHRoYXQgVHlwZVNjcmlwdCdzIEVTMjAxNSB0byBFUzUgdHJhbnNmb3JtZXIgZ2VuZXJhdGVzIGluXG4gKiBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvYmxvYi92My4yLjIvc3JjL2NvbXBpbGVyL3RyYW5zZm9ybWVycy9lczIwMTUudHMjTDEwODItTDEwOThcbiAqXG4gKiBAcGFyYW0gY29uc3RydWN0b3IgYSBjb25zdHJ1Y3RvciBmdW5jdGlvbiB0byB0ZXN0XG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBjb25zdHJ1Y3RvciBhcHBlYXJzIHRvIGhhdmUgYmVlbiBzeW50aGVzaXplZFxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkQ29uc3RydWN0b3IoY29uc3RydWN0b3I6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgaWYgKCFjb25zdHJ1Y3Rvci5ib2R5KSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgZmlyc3RTdGF0ZW1lbnQgPSBjb25zdHJ1Y3Rvci5ib2R5LnN0YXRlbWVudHNbMF07XG4gIGlmICghZmlyc3RTdGF0ZW1lbnQpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gaXNTeW50aGVzaXplZFN1cGVyVGhpc0Fzc2lnbm1lbnQoZmlyc3RTdGF0ZW1lbnQpIHx8XG4gICAgICBpc1N5bnRoZXNpemVkU3VwZXJSZXR1cm5TdGF0ZW1lbnQoZmlyc3RTdGF0ZW1lbnQpO1xufVxuXG4vKipcbiAqIElkZW50aWZpZXMgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsIG9mIHRoZSBmb3JtOlxuICpcbiAqIGBgYFxuICogdmFyIF90aGlzID0gX3N1cGVyICE9PSBudWxsICYmIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IHRoaXM7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3RhdGVtZW50IGEgc3RhdGVtZW50IHRoYXQgbWF5IGJlIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgc3RhdGVtZW50IGxvb2tzIGxpa2UgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRTdXBlclRoaXNBc3NpZ25tZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogYm9vbGVhbiB7XG4gIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgdmFyaWFibGVEZWNsYXJhdGlvbnMgPSBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucztcbiAgaWYgKHZhcmlhYmxlRGVjbGFyYXRpb25zLmxlbmd0aCAhPT0gMSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IHZhcmlhYmxlRGVjbGFyYXRpb24gPSB2YXJpYWJsZURlY2xhcmF0aW9uc1swXTtcbiAgaWYgKCF0cy5pc0lkZW50aWZpZXIodmFyaWFibGVEZWNsYXJhdGlvbi5uYW1lKSB8fFxuICAgICAgIXZhcmlhYmxlRGVjbGFyYXRpb24ubmFtZS50ZXh0LnN0YXJ0c1dpdGgoJ190aGlzJykpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGluaXRpYWxpemVyID0gdmFyaWFibGVEZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgaWYgKCFpbml0aWFsaXplcikgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N5bnRoZXNpemVkRGVmYXVsdFN1cGVyQ2FsbChpbml0aWFsaXplcik7XG59XG4vKipcbiAqIElkZW50aWZpZXMgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsIG9mIHRoZSBmb3JtOlxuICpcbiAqIGBgYFxuICogcmV0dXJuIF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHN0YXRlbWVudCBhIHN0YXRlbWVudCB0aGF0IG1heSBiZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCBsb29rcyBsaWtlIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbFxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkU3VwZXJSZXR1cm5TdGF0ZW1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBib29sZWFuIHtcbiAgaWYgKCF0cy5pc1JldHVyblN0YXRlbWVudChzdGF0ZW1lbnQpKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgZXhwcmVzc2lvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uO1xuICBpZiAoIWV4cHJlc3Npb24pIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gaXNTeW50aGVzaXplZERlZmF1bHRTdXBlckNhbGwoZXhwcmVzc2lvbik7XG59XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0aGUgZXhwcmVzc2lvbiBpcyBvZiB0aGUgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICogYGBgXG4gKlxuICogVGhpcyBzdHJ1Y3R1cmUgaXMgZ2VuZXJhdGVkIGJ5IFR5cGVTY3JpcHQgd2hlbiB0cmFuc2Zvcm1pbmcgRVMyMDE1IHRvIEVTNSwgc2VlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvYmxvYi92My4yLjIvc3JjL2NvbXBpbGVyL3RyYW5zZm9ybWVycy9lczIwMTUudHMjTDExNDgtTDExNjNcbiAqXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiBhbiBleHByZXNzaW9uIHRoYXQgbWF5IHJlcHJlc2VudCBhIGRlZmF1bHQgc3VwZXIgY2FsbFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgZXhwcmVzc2lvbiBjb3JyZXNwb25kcyB3aXRoIHRoZSBhYm92ZSBmb3JtXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWREZWZhdWx0U3VwZXJDYWxsKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgaWYgKCFpc0JpbmFyeUV4cHIoZXhwcmVzc2lvbiwgdHMuU3ludGF4S2luZC5CYXJCYXJUb2tlbikpIHJldHVybiBmYWxzZTtcbiAgaWYgKGV4cHJlc3Npb24ucmlnaHQua2luZCAhPT0gdHMuU3ludGF4S2luZC5UaGlzS2V5d29yZCkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGxlZnQgPSBleHByZXNzaW9uLmxlZnQ7XG4gIGlmICghaXNCaW5hcnlFeHByKGxlZnQsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4pKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGlzU3VwZXJOb3ROdWxsKGxlZnQubGVmdCkgJiYgaXNTdXBlckFwcGx5Q2FsbChsZWZ0LnJpZ2h0KTtcbn1cblxuZnVuY3Rpb24gaXNTdXBlck5vdE51bGwoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICByZXR1cm4gaXNCaW5hcnlFeHByKGV4cHJlc3Npb24sIHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNFcXVhbHNUb2tlbikgJiZcbiAgICAgIGlzU3VwZXJJZGVudGlmaWVyKGV4cHJlc3Npb24ubGVmdCk7XG59XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0aGUgZXhwcmVzc2lvbiBpcyBvZiB0aGUgZm9ybVxuICpcbiAqIGBgYFxuICogX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleHByZXNzaW9uIGFuIGV4cHJlc3Npb24gdGhhdCBtYXkgcmVwcmVzZW50IGEgZGVmYXVsdCBzdXBlciBjYWxsXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBleHByZXNzaW9uIGNvcnJlc3BvbmRzIHdpdGggdGhlIGFib3ZlIGZvcm1cbiAqL1xuZnVuY3Rpb24gaXNTdXBlckFwcGx5Q2FsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSB8fCBleHByZXNzaW9uLmFyZ3VtZW50cy5sZW5ndGggIT09IDIpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCB0YXJnZXRGbiA9IGV4cHJlc3Npb24uZXhwcmVzc2lvbjtcbiAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbih0YXJnZXRGbikpIHJldHVybiBmYWxzZTtcbiAgaWYgKCFpc1N1cGVySWRlbnRpZmllcih0YXJnZXRGbi5leHByZXNzaW9uKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAodGFyZ2V0Rm4ubmFtZS50ZXh0ICE9PSAnYXBwbHknKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgdGhpc0FyZ3VtZW50ID0gZXhwcmVzc2lvbi5hcmd1bWVudHNbMF07XG4gIGlmICh0aGlzQXJndW1lbnQua2luZCAhPT0gdHMuU3ludGF4S2luZC5UaGlzS2V5d29yZCkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGFyZ3VtZW50c0FyZ3VtZW50ID0gZXhwcmVzc2lvbi5hcmd1bWVudHNbMV07XG4gIHJldHVybiB0cy5pc0lkZW50aWZpZXIoYXJndW1lbnRzQXJndW1lbnQpICYmIGFyZ3VtZW50c0FyZ3VtZW50LnRleHQgPT09ICdhcmd1bWVudHMnO1xufVxuXG5mdW5jdGlvbiBpc0JpbmFyeUV4cHIoXG4gICAgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbiwgb3BlcmF0b3I6IHRzLkJpbmFyeU9wZXJhdG9yKTogZXhwcmVzc2lvbiBpcyB0cy5CaW5hcnlFeHByZXNzaW9uIHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihleHByZXNzaW9uKSAmJiBleHByZXNzaW9uLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gb3BlcmF0b3I7XG59XG5cbmZ1bmN0aW9uIGlzU3VwZXJJZGVudGlmaWVyKG5vZGU6IHRzLk5vZGUpOiBib29sZWFuIHtcbiAgLy8gVmVyaWZ5IHRoYXQgdGhlIGlkZW50aWZpZXIgaXMgcHJlZml4ZWQgd2l0aCBgX3N1cGVyYC4gV2UgZG9uJ3QgdGVzdCBmb3IgZXF1aXZhbGVuY2VcbiAgLy8gYXMgVHlwZVNjcmlwdCBtYXkgaGF2ZSBzdWZmaXhlZCB0aGUgbmFtZSwgZS5nLiBgX3N1cGVyXzFgIHRvIGF2b2lkIG5hbWUgY29uZmxpY3RzLlxuICAvLyBSZXF1aXJpbmcgb25seSBhIHByZWZpeCBzaG91bGQgYmUgc3VmZmljaWVudGx5IGFjY3VyYXRlLlxuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKG5vZGUpICYmIG5vZGUudGV4dC5zdGFydHNXaXRoKCdfc3VwZXInKTtcbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgc3RhdGVtZW50IHRvIGV4dHJhY3QgdGhlIEVTTTUgcGFyYW1ldGVyIGluaXRpYWxpemVyIGlmIHRoZXJlIGlzIG9uZS5cbiAqIElmIG9uZSBpcyBmb3VuZCwgYWRkIGl0IHRvIHRoZSBhcHByb3ByaWF0ZSBwYXJhbWV0ZXIgaW4gdGhlIGBwYXJhbWV0ZXJzYCBjb2xsZWN0aW9uLlxuICpcbiAqIFRoZSBmb3JtIHdlIGFyZSBsb29raW5nIGZvciBpczpcbiAqXG4gKiBgYGBcbiAqIGlmIChhcmcgPT09IHZvaWQgMCkgeyBhcmcgPSBpbml0aWFsaXplcjsgfVxuICogYGBgXG4gKlxuICogQHBhcmFtIHN0YXRlbWVudCBhIHN0YXRlbWVudCB0aGF0IG1heSBiZSBpbml0aWFsaXppbmcgYW4gb3B0aW9uYWwgcGFyYW1ldGVyXG4gKiBAcGFyYW0gcGFyYW1ldGVycyB0aGUgY29sbGVjdGlvbiBvZiBwYXJhbWV0ZXJzIHRoYXQgd2VyZSBmb3VuZCBpbiB0aGUgZnVuY3Rpb24gZGVmaW5pdGlvblxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgc3RhdGVtZW50IHdhcyBhIHBhcmFtZXRlciBpbml0aWFsaXplclxuICovXG5mdW5jdGlvbiByZWZsZWN0UGFyYW1Jbml0aWFsaXplcihzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCwgcGFyYW1ldGVyczogUGFyYW1ldGVyW10pIHtcbiAgaWYgKHRzLmlzSWZTdGF0ZW1lbnQoc3RhdGVtZW50KSAmJiBpc1VuZGVmaW5lZENvbXBhcmlzb24oc3RhdGVtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc0Jsb2NrKHN0YXRlbWVudC50aGVuU3RhdGVtZW50KSAmJiBzdGF0ZW1lbnQudGhlblN0YXRlbWVudC5zdGF0ZW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNvbnN0IGlmU3RhdGVtZW50Q29tcGFyaXNvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uOyAgICAgICAgICAgLy8gKGFyZyA9PT0gdm9pZCAwKVxuICAgIGNvbnN0IHRoZW5TdGF0ZW1lbnQgPSBzdGF0ZW1lbnQudGhlblN0YXRlbWVudC5zdGF0ZW1lbnRzWzBdOyAgLy8gYXJnID0gaW5pdGlhbGl6ZXI7XG4gICAgaWYgKGlzQXNzaWdubWVudFN0YXRlbWVudCh0aGVuU3RhdGVtZW50KSkge1xuICAgICAgY29uc3QgY29tcGFyaXNvbk5hbWUgPSBpZlN0YXRlbWVudENvbXBhcmlzb24ubGVmdC50ZXh0O1xuICAgICAgY29uc3QgYXNzaWdubWVudE5hbWUgPSB0aGVuU3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdC50ZXh0O1xuICAgICAgaWYgKGNvbXBhcmlzb25OYW1lID09PSBhc3NpZ25tZW50TmFtZSkge1xuICAgICAgICBjb25zdCBwYXJhbWV0ZXIgPSBwYXJhbWV0ZXJzLmZpbmQocCA9PiBwLm5hbWUgPT09IGNvbXBhcmlzb25OYW1lKTtcbiAgICAgICAgaWYgKHBhcmFtZXRlcikge1xuICAgICAgICAgIHBhcmFtZXRlci5pbml0aWFsaXplciA9IHRoZW5TdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodDtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkQ29tcGFyaXNvbihleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogZXhwcmVzc2lvbiBpcyB0cy5FeHByZXNzaW9uJlxuICAgIHtsZWZ0OiB0cy5JZGVudGlmaWVyLCByaWdodDogdHMuRXhwcmVzc2lvbn0ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKGV4cHJlc3Npb24pICYmXG4gICAgICBleHByZXNzaW9uLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNFcXVhbHNUb2tlbiAmJlxuICAgICAgdHMuaXNWb2lkRXhwcmVzc2lvbihleHByZXNzaW9uLnJpZ2h0KSAmJiB0cy5pc0lkZW50aWZpZXIoZXhwcmVzc2lvbi5sZWZ0KTtcbn1cbiJdfQ==