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
            // The symbol corresponds with the inner function declaration. First lets see if the static
            // property is set there.
            var prop = _super.prototype.getStaticProperty.call(this, symbol, propertyName);
            if (prop !== undefined) {
                return prop;
            }
            // Otherwise, obtain the outer variable declaration and resolve its symbol, in order to lookup
            // static properties there.
            var outerClass = getClassDeclarationFromInnerFunctionDeclaration(symbol.valueDeclaration);
            if (outerClass === undefined) {
                return undefined;
            }
            var outerSymbol = this.checker.getSymbolAtLocation(outerClass.name);
            if (outerSymbol === undefined || outerSymbol.valueDeclaration === undefined) {
                return undefined;
            }
            return _super.prototype.getStaticProperty.call(this, outerSymbol, propertyName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyx5RUFBOE87SUFDOU8sa0ZBQXFFO0lBQ3JFLDhEQUF3RDtJQUV4RCxpRkFBbUg7SUFJbkg7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSDtRQUF3Qyw4Q0FBcUI7UUFBN0Q7O1FBcWNBLENBQUM7UUFwY0M7Ozs7OztXQU1HO1FBQ0gseUNBQVksR0FBWixVQUFhLEtBQXVCO1lBQ2xDLElBQUksaUJBQU0sWUFBWSxZQUFDLEtBQUssQ0FBQztnQkFBRSxPQUFPLElBQUksQ0FBQztZQUUzQyxJQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6RCxJQUFJLENBQUMsZ0JBQWdCO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1lBRXBDLElBQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxRQUFRO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1lBRTVCLElBQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDN0IsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUM7Z0JBQUUsT0FBTyxLQUFLLENBQUM7WUFFMUQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwRixDQUFDO1FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7OztXQWtCRztRQUNILGdEQUFtQixH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SUFBSSxvQ0FBcUIsQ0FBQyxhQUFhLENBQUMsRUFBRTtnQkFDeEMsSUFBTSxnQkFBYyxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ3ZELElBQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDMUQsSUFBSSxnQkFBYyxLQUFLLGNBQWMsRUFBRTtvQkFDckMsSUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxJQUFJLEtBQUssZ0JBQWMsRUFBekIsQ0FBeUIsQ0FBQyxDQUFDO29CQUNsRSxJQUFJLFNBQVMsRUFBRTt3QkFDYixTQUFTLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO3dCQUN2RCxPQUFPLElBQUksQ0FBQztxQkFDYjtpQkFDRjthQUNGO1NBQ0Y7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxTQUFTLHFCQUFxQixDQUFDLFVBQXlCO1FBRXRELE9BQU8sRUFBRSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQztZQUNwQyxVQUFVLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QjtZQUN2RSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIENsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIENsYXNzU3ltYm9sLCBDdG9yUGFyYW1ldGVyLCBEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBGdW5jdGlvbkRlZmluaXRpb24sIFBhcmFtZXRlciwgVHNIZWxwZXJGbiwgaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb24sIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge2lzRnJvbUR0c0ZpbGV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7Z2V0TmFtZVRleHQsIGhhc05hbWVJZGVudGlmaWVyfSBmcm9tICcuLi91dGlscyc7XG5cbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0LCBQYXJhbUluZm8sIGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sLCBpc0Fzc2lnbm1lbnRTdGF0ZW1lbnR9IGZyb20gJy4vZXNtMjAxNV9ob3N0JztcblxuXG5cbi8qKlxuICogRVNNNSBwYWNrYWdlcyBjb250YWluIEVDTUFTY3JpcHQgSUlGRSBmdW5jdGlvbnMgdGhhdCBhY3QgbGlrZSBjbGFzc2VzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIHZhciBDb21tb25Nb2R1bGUgPSAoZnVuY3Rpb24gKCkge1xuICogIGZ1bmN0aW9uIENvbW1vbk1vZHVsZSgpIHtcbiAqICB9XG4gKiAgQ29tbW9uTW9kdWxlLmRlY29yYXRvcnMgPSBbIC4uLiBdO1xuICogYGBgXG4gKlxuICogKiBcIkNsYXNzZXNcIiBhcmUgZGVjb3JhdGVkIGlmIHRoZXkgaGF2ZSBhIHN0YXRpYyBwcm9wZXJ0eSBjYWxsZWQgYGRlY29yYXRvcnNgLlxuICogKiBNZW1iZXJzIGFyZSBkZWNvcmF0ZWQgaWYgdGhlcmUgaXMgYSBtYXRjaGluZyBrZXkgb24gYSBzdGF0aWMgcHJvcGVydHlcbiAqICAgY2FsbGVkIGBwcm9wRGVjb3JhdG9yc2AuXG4gKiAqIENvbnN0cnVjdG9yIHBhcmFtZXRlcnMgZGVjb3JhdG9ycyBhcmUgZm91bmQgb24gYW4gb2JqZWN0IHJldHVybmVkIGZyb21cbiAqICAgYSBzdGF0aWMgbWV0aG9kIGNhbGxlZCBgY3RvclBhcmFtZXRlcnNgLlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIEVzbTVSZWZsZWN0aW9uSG9zdCBleHRlbmRzIEVzbTIwMTVSZWZsZWN0aW9uSG9zdCB7XG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIGdpdmVuIGRlY2xhcmF0aW9uLCB3aGljaCBzaG91bGQgYmUgYSBcImNsYXNzXCIsIGhhcyBhIGJhc2UgXCJjbGFzc1wiLlxuICAgKlxuICAgKiBJbiBFUzUgY29kZSwgd2UgbmVlZCB0byBkZXRlcm1pbmUgaWYgdGhlIElJRkUgd3JhcHBlciB0YWtlcyBhIGBfc3VwZXJgIHBhcmFtZXRlciAuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICovXG4gIGhhc0Jhc2VDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIGlmIChzdXBlci5oYXNCYXNlQ2xhc3MoY2xhenopKSByZXR1cm4gdHJ1ZTtcblxuICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSB0aGlzLmdldENsYXNzRGVjbGFyYXRpb24oY2xhenopO1xuICAgIGlmICghY2xhc3NEZWNsYXJhdGlvbikgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgaWlmZUJvZHkgPSBnZXRJaWZlQm9keShjbGFzc0RlY2xhcmF0aW9uKTtcbiAgICBpZiAoIWlpZmVCb2R5KSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBpaWZlID0gaWlmZUJvZHkucGFyZW50O1xuICAgIGlmICghaWlmZSB8fCAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oaWlmZSkpIHJldHVybiBmYWxzZTtcblxuICAgIHJldHVybiBpaWZlLnBhcmFtZXRlcnMubGVuZ3RoID09PSAxICYmIGlzU3VwZXJJZGVudGlmaWVyKGlpZmUucGFyYW1ldGVyc1swXS5uYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbiBvZiBhIGNsYXNzIGdpdmVuIGEgbm9kZSB0aGF0IHdlIHRoaW5rIHJlcHJlc2VudHMgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBJbiBFUzUsIHRoZSBpbXBsZW1lbnRhdGlvbiBvZiBhIGNsYXNzIGlzIGEgZnVuY3Rpb24gZXhwcmVzc2lvbiB0aGF0IGlzIGhpZGRlbiBpbnNpZGUgYW4gSUlGRSxcbiAgICogd2hvc2UgdmFsdWUgaXMgYXNzaWduZWQgdG8gYSB2YXJpYWJsZSAod2hpY2ggcmVwcmVzZW50cyB0aGUgY2xhc3MgdG8gdGhlIHJlc3Qgb2YgdGhlIHByb2dyYW0pLlxuICAgKiBTbyB3ZSBtaWdodCBuZWVkIHRvIGRpZyBhcm91bmQgdG8gZ2V0IGhvbGQgb2YgdGhlIFwiY2xhc3NcIiBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogYG5vZGVgIG1pZ2h0IGJlIG9uZSBvZjpcbiAgICogLSBBIGNsYXNzIGRlY2xhcmF0aW9uIChmcm9tIGEgdHlwaW5ncyBmaWxlKS5cbiAgICogLSBUaGUgZGVjbGFyYXRpb24gb2YgdGhlIG91dGVyIHZhcmlhYmxlLCB3aGljaCBpcyBhc3NpZ25lZCB0aGUgcmVzdWx0IG9mIHRoZSBJSUZFLlxuICAgKiAtIFRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiBpbnNpZGUgdGhlIElJRkUsIHdoaWNoIGlzIGV2ZW50dWFsbHkgcmV0dXJuZWQgYW5kIGFzc2lnbmVkIHRvIHRoZVxuICAgKiAgIG91dGVyIHZhcmlhYmxlLlxuICAgKlxuICAgKiBUaGUgcmV0dXJuZWQgZGVjbGFyYXRpb24gaXMgZWl0aGVyIHRoZSBjbGFzcyBkZWNsYXJhdGlvbiAoZnJvbSB0aGUgdHlwaW5ncyBmaWxlKSBvciB0aGUgb3V0ZXJcbiAgICogdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIHRoZSBub2RlIHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3Mgd2hvc2UgZGVjbGFyYXRpb24gd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgY2xhc3Mgb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiLlxuICAgKi9cbiAgZ2V0Q2xhc3NEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogQ2xhc3NEZWNsYXJhdGlvbnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN1cGVyRGVjbGFyYXRpb24gPSBzdXBlci5nZXRDbGFzc0RlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGlmIChzdXBlckRlY2xhcmF0aW9uKSByZXR1cm4gc3VwZXJEZWNsYXJhdGlvbjtcblxuICAgIGNvbnN0IG91dGVyQ2xhc3MgPSBnZXRDbGFzc0RlY2xhcmF0aW9uRnJvbUlubmVyRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKTtcbiAgICBpZiAob3V0ZXJDbGFzcykgcmV0dXJuIG91dGVyQ2xhc3M7XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50LCBgbm9kZWAgY291bGQgYmUgdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIGFuIEVTNSBjbGFzcy5cbiAgICAvLyBJZiBzbywgZW5zdXJlIHRoYXQgaXQgaGFzIGEgYG5hbWVgIGlkZW50aWZpZXIgYW5kIHRoZSBjb3JyZWN0IHN0cnVjdHVyZS5cbiAgICBpZiAoIWlzTmFtZWRWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpIHx8XG4gICAgICAgICF0aGlzLmdldElubmVyRnVuY3Rpb25EZWNsYXJhdGlvbkZyb21DbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYWNlIGFuIGlkZW50aWZpZXIgdG8gaXRzIGRlY2xhcmF0aW9uLCBpZiBwb3NzaWJsZS5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgYXR0ZW1wdHMgdG8gcmVzb2x2ZSB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGdpdmVuIGlkZW50aWZpZXIsIHRyYWNpbmcgYmFjayB0aHJvdWdoXG4gICAqIGltcG9ydHMgYW5kIHJlLWV4cG9ydHMgdW50aWwgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIHN0YXRlbWVudCBpcyBmb3VuZC4gQSBgRGVjbGFyYXRpb25gXG4gICAqIG9iamVjdCBpcyByZXR1cm5lZCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYCBpcyByZXR1cm5lZCBvdGhlcndpc2UuXG4gICAqXG4gICAqIEluIEVTNSwgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY2xhc3MgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHRoYXQgaXMgaGlkZGVuIGluc2lkZSBhbiBJSUZFLlxuICAgKiBJZiB3ZSBhcmUgbG9va2luZyBmb3IgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBpbm5lciBmdW5jdGlvbiBleHByZXNzaW9uLCB3ZVxuICAgKiB3aWxsIGdldCBob2xkIG9mIHRoZSBvdXRlciBcImNsYXNzXCIgdmFyaWFibGUgZGVjbGFyYXRpb24gYW5kIHJldHVybiBpdHMgaWRlbnRpZmllciBpbnN0ZWFkLiBTZWVcbiAgICogYGdldENsYXNzRGVjbGFyYXRpb25Gcm9tSW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uKClgIGZvciBtb3JlIGluZm8uXG4gICAqXG4gICAqIEBwYXJhbSBpZCBhIFR5cGVTY3JpcHQgYHRzLklkZW50aWZpZXJgIHRvIHRyYWNlIGJhY2sgdG8gYSBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogQHJldHVybnMgbWV0YWRhdGEgYWJvdXQgdGhlIGBEZWNsYXJhdGlvbmAgaWYgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGlzIGZvdW5kLCBvciBgbnVsbGBcbiAgICogb3RoZXJ3aXNlLlxuICAgKi9cbiAgZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICAvLyBHZXQgdGhlIGlkZW50aWZpZXIgZm9yIHRoZSBvdXRlciBjbGFzcyBub2RlIChpZiBhbnkpLlxuICAgIGNvbnN0IG91dGVyQ2xhc3NOb2RlID0gZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24oaWQucGFyZW50KTtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHN1cGVyLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKG91dGVyQ2xhc3NOb2RlID8gb3V0ZXJDbGFzc05vZGUubmFtZSA6IGlkKTtcblxuICAgIGlmICghZGVjbGFyYXRpb24gfHwgIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbi5ub2RlKSB8fFxuICAgICAgICBkZWNsYXJhdGlvbi5ub2RlLmluaXRpYWxpemVyICE9PSB1bmRlZmluZWQgfHxcbiAgICAgICAgLy8gVmFyaWFibGVEZWNsYXJhdGlvbiA9PiBWYXJpYWJsZURlY2xhcmF0aW9uTGlzdCA9PiBWYXJpYWJsZVN0YXRlbWVudCA9PiBJSUZFIEJsb2NrXG4gICAgICAgICF0cy5pc0Jsb2NrKGRlY2xhcmF0aW9uLm5vZGUucGFyZW50LnBhcmVudC5wYXJlbnQpKSB7XG4gICAgICByZXR1cm4gZGVjbGFyYXRpb247XG4gICAgfVxuXG4gICAgLy8gV2UgbWlnaHQgaGF2ZSBhbiBhbGlhcyB0byBhbm90aGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgIC8vIFNlYXJjaCB0aGUgY29udGFpbmluZyBpaWZlIGJvZHkgZm9yIGl0LlxuICAgIGNvbnN0IGJsb2NrID0gZGVjbGFyYXRpb24ubm9kZS5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgICBjb25zdCBhbGlhc1N5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLm5vZGUubmFtZSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBibG9jay5zdGF0ZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBzdGF0ZW1lbnQgPSBibG9jay5zdGF0ZW1lbnRzW2ldO1xuICAgICAgLy8gTG9va2luZyBmb3Igc3RhdGVtZW50IHRoYXQgbG9va3MgbGlrZTogYEFsaWFzZWRWYXJpYWJsZSA9IE9yaWdpbmFsVmFyaWFibGU7YFxuICAgICAgaWYgKGlzQXNzaWdubWVudFN0YXRlbWVudChzdGF0ZW1lbnQpICYmIHRzLmlzSWRlbnRpZmllcihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0KSAmJlxuICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodCkgJiZcbiAgICAgICAgICB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0KSA9PT0gYWxpYXNTeW1ib2wpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoc3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWNsYXJhdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBhIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIHRvIGZpbmQgdGhlIHJlbGV2YW50IG1ldGFkYXRhIGFib3V0IGl0LlxuICAgKlxuICAgKiBJbiBFU001IHdlIG5lZWQgdG8gZG8gc3BlY2lhbCB3b3JrIHdpdGggb3B0aW9uYWwgYXJndW1lbnRzIHRvIHRoZSBmdW5jdGlvbiwgc2luY2UgdGhleSBnZXRcbiAgICogdGhlaXIgb3duIGluaXRpYWxpemVyIHN0YXRlbWVudCB0aGF0IG5lZWRzIHRvIGJlIHBhcnNlZCBhbmQgdGhlbiBub3QgaW5jbHVkZWQgaW4gdGhlIFwiYm9keVwiXG4gICAqIHN0YXRlbWVudHMgb2YgdGhlIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gdG8gcGFyc2UuXG4gICAqIEByZXR1cm5zIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBub2RlLCBzdGF0ZW1lbnRzIGFuZCBwYXJhbWV0ZXJzIG9mIHRoZSBmdW5jdGlvbi5cbiAgICovXG4gIGdldERlZmluaXRpb25PZkZ1bmN0aW9uKG5vZGU6IHRzLk5vZGUpOiBGdW5jdGlvbkRlZmluaXRpb258bnVsbCB7XG4gICAgaWYgKCF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkgJiYgIXRzLmlzTWV0aG9kRGVjbGFyYXRpb24obm9kZSkgJiZcbiAgICAgICAgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKG5vZGUpICYmICF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHRzSGVscGVyRm4gPSBnZXRUc0hlbHBlckZuKG5vZGUpO1xuICAgIGlmICh0c0hlbHBlckZuICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBub2RlLFxuICAgICAgICBib2R5OiBudWxsLFxuICAgICAgICBoZWxwZXI6IHRzSGVscGVyRm4sXG4gICAgICAgIHBhcmFtZXRlcnM6IFtdLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgbm9kZSB3YXMgbm90IGlkZW50aWZpZWQgdG8gYmUgYSBUeXBlU2NyaXB0IGhlbHBlciwgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBhdCB0aGlzXG4gICAgLy8gcG9pbnQgY2Fubm90IGJlIHJlc29sdmVkIGFzIGEgZnVuY3Rpb24uXG4gICAgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcGFyYW1ldGVycyA9XG4gICAgICAgIG5vZGUucGFyYW1ldGVycy5tYXAocCA9PiAoe25hbWU6IGdldE5hbWVUZXh0KHAubmFtZSksIG5vZGU6IHAsIGluaXRpYWxpemVyOiBudWxsfSkpO1xuICAgIGxldCBsb29raW5nRm9yUGFyYW1Jbml0aWFsaXplcnMgPSB0cnVlO1xuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IG5vZGUuYm9keSAmJiBub2RlLmJvZHkuc3RhdGVtZW50cy5maWx0ZXIocyA9PiB7XG4gICAgICBsb29raW5nRm9yUGFyYW1Jbml0aWFsaXplcnMgPVxuICAgICAgICAgIGxvb2tpbmdGb3JQYXJhbUluaXRpYWxpemVycyAmJiByZWZsZWN0UGFyYW1Jbml0aWFsaXplcihzLCBwYXJhbWV0ZXJzKTtcbiAgICAgIC8vIElmIHdlIGFyZSBubyBsb25nZXIgbG9va2luZyBmb3IgcGFyYW1ldGVyIGluaXRpYWxpemVycyB0aGVuIHdlIGluY2x1ZGUgdGhpcyBzdGF0ZW1lbnRcbiAgICAgIHJldHVybiAhbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtub2RlLCBib2R5OiBzdGF0ZW1lbnRzIHx8IG51bGwsIGhlbHBlcjogbnVsbCwgcGFyYW1ldGVyc307XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIGRlY2xhcmF0aW9uIHdoaWNoIHNob3VsZCBiZSBvZiBhIGNsYXNzLCBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IHRoZSBtZW1iZXJzIG9mIHRoZVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIGEgVHlwZVNjcmlwdCBgdHMuRGVjbGFyYXRpb25gIG5vZGUgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvXG4gICAqIHJlZmxlY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBDbGFzc01lbWJlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBtZW1iZXJzIG9mIHRoZSBjbGFzcy5cbiAgICpcbiAgICogQHRocm93cyBpZiBgZGVjbGFyYXRpb25gIGRvZXMgbm90IHJlc29sdmUgdG8gYSBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldE1lbWJlcnNPZkNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgLy8gRG8gbm90IGZvbGxvdyBFUzUncyByZXNvbHV0aW9uIGxvZ2ljIHdoZW4gdGhlIG5vZGUgcmVzaWRlcyBpbiBhIC5kLnRzIGZpbGUuXG4gICAgaWYgKGlzRnJvbUR0c0ZpbGUoY2xhenopKSB7XG4gICAgICByZXR1cm4gc3VwZXIuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopO1xuICAgIH1cblxuICAgIC8vIFRoZSBuZWNlc3NhcnkgaW5mbyBpcyBvbiB0aGUgaW5uZXIgZnVuY3Rpb24gZGVjbGFyYXRpb24gKGluc2lkZSB0aGUgRVM1IGNsYXNzIElJRkUpLlxuICAgIGNvbnN0IGlubmVyRnVuY3Rpb25TeW1ib2wgPSB0aGlzLmdldElubmVyRnVuY3Rpb25TeW1ib2xGcm9tQ2xhc3NEZWNsYXJhdGlvbihjbGF6eik7XG4gICAgaWYgKCFpbm5lckZ1bmN0aW9uU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEF0dGVtcHRlZCB0byBnZXQgbWVtYmVycyBvZiBhIG5vbi1jbGFzczogXCIkeyhjbGF6eiBhcyBDbGFzc0RlY2xhcmF0aW9uKS5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXRNZW1iZXJzT2ZTeW1ib2woaW5uZXJGdW5jdGlvblN5bWJvbCk7XG4gIH1cblxuICAvKiogR2V0cyBhbGwgZGVjb3JhdG9ycyBvZiB0aGUgZ2l2ZW4gY2xhc3Mgc3ltYm9sLiAqL1xuICBnZXREZWNvcmF0b3JzT2ZTeW1ib2woc3ltYm9sOiBDbGFzc1N5bWJvbCk6IERlY29yYXRvcltdfG51bGwge1xuICAgIC8vIFRoZSBuZWNlc3NhcnkgaW5mbyBpcyBvbiB0aGUgaW5uZXIgZnVuY3Rpb24gZGVjbGFyYXRpb24gKGluc2lkZSB0aGUgRVM1IGNsYXNzIElJRkUpLlxuICAgIGNvbnN0IGlubmVyRnVuY3Rpb25TeW1ib2wgPVxuICAgICAgICB0aGlzLmdldElubmVyRnVuY3Rpb25TeW1ib2xGcm9tQ2xhc3NEZWNsYXJhdGlvbihzeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgaWYgKCFpbm5lckZ1bmN0aW9uU3ltYm9sKSByZXR1cm4gbnVsbDtcblxuICAgIHJldHVybiBzdXBlci5nZXREZWNvcmF0b3JzT2ZTeW1ib2woaW5uZXJGdW5jdGlvblN5bWJvbCk7XG4gIH1cblxuXG4gIC8vLy8vLy8vLy8vLy8gUHJvdGVjdGVkIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGlubmVyIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIG9mIGFuIEVTNS1zdHlsZSBjbGFzcy5cbiAgICpcbiAgICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkVcbiAgICogYW5kIHJldHVybmVkIHRvIGJlIGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgb3V0c2lkZSB0aGUgSUlGRSwgd2hpY2ggaXMgd2hhdCB0aGUgcmVzdCBvZiB0aGVcbiAgICogcHJvZ3JhbSBpbnRlcmFjdHMgd2l0aC5cbiAgICpcbiAgICogR2l2ZW4gdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uLCB3ZSB3YW50IHRvIGdldCB0byB0aGUgaW5uZXIgZnVuY3Rpb24gZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIGEgbm9kZSB0aGF0IGNvdWxkIGJlIHRoZSB2YXJpYWJsZSBleHByZXNzaW9uIG91dHNpZGUgYW4gRVM1IGNsYXNzIElJRkUuXG4gICAqIEBwYXJhbSBjaGVja2VyIHRoZSBUUyBwcm9ncmFtIFR5cGVDaGVja2VyXG4gICAqIEByZXR1cm5zIHRoZSBpbm5lciBmdW5jdGlvbiBkZWNsYXJhdGlvbiBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0SW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uRnJvbUNsYXNzRGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb25cbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGlmICghdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgLy8gRXh0cmFjdCB0aGUgSUlGRSBib2R5IChpZiBhbnkpLlxuICAgIGNvbnN0IGlpZmVCb2R5ID0gZ2V0SWlmZUJvZHkobm9kZSk7XG4gICAgaWYgKCFpaWZlQm9keSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIEV4dHJhY3QgdGhlIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGZyb20gaW5zaWRlIHRoZSBJSUZFLlxuICAgIGNvbnN0IGZ1bmN0aW9uRGVjbGFyYXRpb24gPSBpaWZlQm9keS5zdGF0ZW1lbnRzLmZpbmQodHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKTtcbiAgICBpZiAoIWZ1bmN0aW9uRGVjbGFyYXRpb24pIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAvLyBFeHRyYWN0IHRoZSByZXR1cm4gaWRlbnRpZmllciBvZiB0aGUgSUlGRS5cbiAgICBjb25zdCByZXR1cm5JZGVudGlmaWVyID0gZ2V0UmV0dXJuSWRlbnRpZmllcihpaWZlQm9keSk7XG4gICAgY29uc3QgcmV0dXJuSWRlbnRpZmllclN5bWJvbCA9XG4gICAgICAgIHJldHVybklkZW50aWZpZXIgJiYgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24ocmV0dXJuSWRlbnRpZmllcik7XG4gICAgaWYgKCFyZXR1cm5JZGVudGlmaWVyU3ltYm9sKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgLy8gVmVyaWZ5IHRoYXQgdGhlIGlubmVyIGZ1bmN0aW9uIGlzIHJldHVybmVkLlxuICAgIGlmIChyZXR1cm5JZGVudGlmaWVyU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gIT09IGZ1bmN0aW9uRGVjbGFyYXRpb24pIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICByZXR1cm4gZnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGlkZW50aWZpZXIgc3ltYm9sIG9mIHRoZSBpbm5lciBmdW5jdGlvbiBkZWNsYXJhdGlvbiBvZiBhbiBFUzUtc3R5bGUgY2xhc3MuXG4gICAqXG4gICAqIEluIEVTNSwgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY2xhc3MgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHRoYXQgaXMgaGlkZGVuIGluc2lkZSBhbiBJSUZFXG4gICAqIGFuZCByZXR1cm5lZCB0byBiZSBhc3NpZ25lZCB0byBhIHZhcmlhYmxlIG91dHNpZGUgdGhlIElJRkUsIHdoaWNoIGlzIHdoYXQgdGhlIHJlc3Qgb2YgdGhlXG4gICAqIHByb2dyYW0gaW50ZXJhY3RzIHdpdGguXG4gICAqXG4gICAqIEdpdmVuIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbiwgd2Ugd2FudCB0byBnZXQgdG8gdGhlIGlkZW50aWZpZXIgc3ltYm9sIG9mIHRoZSBpbm5lclxuICAgKiBmdW5jdGlvbiBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgbm9kZSB0aGF0IGNvdWxkIGJlIHRoZSB2YXJpYWJsZSBleHByZXNzaW9uIG91dHNpZGUgYW4gRVM1IGNsYXNzIElJRkUuXG4gICAqIEBwYXJhbSBjaGVja2VyIHRoZSBUUyBwcm9ncmFtIFR5cGVDaGVja2VyXG4gICAqIEByZXR1cm5zIHRoZSBpbm5lciBmdW5jdGlvbiBkZWNsYXJhdGlvbiBpZGVudGlmaWVyIHN5bWJvbCBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCJcbiAgICogb3IgaGFzIG5vIGlkZW50aWZpZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0SW5uZXJGdW5jdGlvblN5bWJvbEZyb21DbGFzc0RlY2xhcmF0aW9uKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogQ2xhc3NTeW1ib2xcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGNvbnN0IGlubmVyRnVuY3Rpb25EZWNsYXJhdGlvbiA9IHRoaXMuZ2V0SW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uRnJvbUNsYXNzRGVjbGFyYXRpb24oY2xhenopO1xuICAgIGlmICghaW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uIHx8ICFoYXNOYW1lSWRlbnRpZmllcihpbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24pKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgcmV0dXJuIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlubmVyRnVuY3Rpb25EZWNsYXJhdGlvbi5uYW1lKSBhcyBDbGFzc1N5bWJvbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbnMgb2YgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBjbGFzcyBpZGVudGlmaWVkIGJ5IGl0cyBzeW1ib2wuXG4gICAqXG4gICAqIEluIEVTTTUsIHRoZXJlIGlzIG5vIFwiY2xhc3NcIiBzbyB0aGUgY29uc3RydWN0b3IgdGhhdCB3ZSB3YW50IGlzIGFjdHVhbGx5IHRoZSBpbm5lciBmdW5jdGlvblxuICAgKiBkZWNsYXJhdGlvbiBpbnNpZGUgdGhlIElJRkUsIHdob3NlIHJldHVybiB2YWx1ZSBpcyBhc3NpZ25lZCB0byB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb25cbiAgICogKHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3MgdG8gdGhlIHJlc3Qgb2YgdGhlIHByb2dyYW0pLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIHN5bWJvbCBvZiB0aGUgY2xhc3MgKGkuZS4gdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uKSB3aG9zZVxuICAgKiBwYXJhbWV0ZXJzIHdlIHdhbnQgdG8gZmluZC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uYCBvYmplY3RzIHJlcHJlc2VudGluZyBlYWNoIG9mIHRoZSBwYXJhbWV0ZXJzIGluXG4gICAqIHRoZSBjbGFzcydzIGNvbnN0cnVjdG9yIG9yIGBudWxsYCBpZiB0aGVyZSBpcyBubyBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbDogQ2xhc3NTeW1ib2wpOlxuICAgICAgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25bXXxudWxsIHtcbiAgICBjb25zdCBjb25zdHJ1Y3RvciA9XG4gICAgICAgIHRoaXMuZ2V0SW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uRnJvbUNsYXNzRGVjbGFyYXRpb24oY2xhc3NTeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgaWYgKCFjb25zdHJ1Y3RvcikgcmV0dXJuIG51bGw7XG5cbiAgICBpZiAoY29uc3RydWN0b3IucGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbShjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICBpZiAoaXNTeW50aGVzaXplZENvbnN0cnVjdG9yKGNvbnN0cnVjdG9yKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcGFyYW1ldGVyIGRlY29yYXRvcnMgb2YgYSBjbGFzcyBjb25zdHJ1Y3Rvci5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBzeW1ib2wgb2YgdGhlIGNsYXNzIChpLmUuIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbikgd2hvc2VcbiAgICogcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEBwYXJhbSBwYXJhbWV0ZXJOb2RlcyB0aGUgYXJyYXkgb2YgVHlwZVNjcmlwdCBwYXJhbWV0ZXIgbm9kZXMgZm9yIHRoaXMgY2xhc3MncyBjb25zdHJ1Y3Rvci5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgY29uc3RydWN0b3IgcGFyYW1ldGVyIGluZm8gb2JqZWN0cy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhcbiAgICAgIGNsYXNzU3ltYm9sOiBDbGFzc1N5bWJvbCwgcGFyYW1ldGVyTm9kZXM6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW10pOiBDdG9yUGFyYW1ldGVyW10ge1xuICAgIC8vIFRoZSBuZWNlc3NhcnkgaW5mbyBpcyBvbiB0aGUgaW5uZXIgZnVuY3Rpb24gZGVjbGFyYXRpb24gKGluc2lkZSB0aGUgRVM1IGNsYXNzIElJRkUpLlxuICAgIGNvbnN0IGlubmVyRnVuY3Rpb25TeW1ib2wgPVxuICAgICAgICB0aGlzLmdldElubmVyRnVuY3Rpb25TeW1ib2xGcm9tQ2xhc3NEZWNsYXJhdGlvbihjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICBpZiAoIWlubmVyRnVuY3Rpb25TeW1ib2wpIHJldHVybiBbXTtcblxuICAgIHJldHVybiBzdXBlci5nZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhpbm5lckZ1bmN0aW9uU3ltYm9sLCBwYXJhbWV0ZXJOb2Rlcyk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MsXG4gICAqIHdoZXJlIHRoZSBpbmZvcm1hdGlvbiBpcyBzdG9yZWQgb24gYSBzdGF0aWMgbWV0aG9kIG9mIHRoZSBjbGFzcy5cbiAgICpcbiAgICogSW4gdGhpcyBjYXNlIHRoZSBkZWNvcmF0b3JzIGFyZSBzdG9yZWQgaW4gdGhlIGJvZHkgb2YgYSBtZXRob2RcbiAgICogKGBjdG9yUGFyYXRlbWVyc2ApIGF0dGFjaGVkIHRvIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAgICpcbiAgICogTm90ZSB0aGF0IHVubGlrZSBFU00yMDE1IHRoaXMgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHJhdGhlciB0aGFuIGFuIGFycm93XG4gICAqIGZ1bmN0aW9uOlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gW1xuICAgKiAgIHsgdHlwZTogVmlld0NvbnRhaW5lclJlZiwgfSxcbiAgICogICB7IHR5cGU6IFRlbXBsYXRlUmVmLCB9LFxuICAgKiAgIHsgdHlwZTogSXRlcmFibGVEaWZmZXJzLCB9LFxuICAgKiAgIHsgdHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTixdIH0sXSB9LFxuICAgKiBdOyB9O1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5IHRoZSBwcm9wZXJ0eSB0aGF0IGhvbGRzIHRoZSBwYXJhbWV0ZXIgaW5mbyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygb2JqZWN0cyBjb250YWluaW5nIHRoZSB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciBlYWNoIHBhcmFtZXRlci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRQYXJhbUluZm9Gcm9tU3RhdGljUHJvcGVydHkocGFyYW1EZWNvcmF0b3JzUHJvcGVydHk6IHRzLlN5bWJvbCk6IFBhcmFtSW5mb1tdfG51bGwge1xuICAgIGNvbnN0IHBhcmFtRGVjb3JhdG9ycyA9IGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBnZXRSZXR1cm5TdGF0ZW1lbnQocGFyYW1EZWNvcmF0b3JzKTtcbiAgICBjb25zdCBleHByZXNzaW9uID0gcmV0dXJuU3RhdGVtZW50ICYmIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uO1xuICAgIGlmIChleHByZXNzaW9uICYmIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihleHByZXNzaW9uKSkge1xuICAgICAgY29uc3QgZWxlbWVudHMgPSBleHByZXNzaW9uLmVsZW1lbnRzO1xuICAgICAgcmV0dXJuIGVsZW1lbnRzLm1hcChyZWZsZWN0QXJyYXlFbGVtZW50KS5tYXAocGFyYW1JbmZvID0+IHtcbiAgICAgICAgY29uc3QgdHlwZUV4cHJlc3Npb24gPSBwYXJhbUluZm8gJiYgcGFyYW1JbmZvLmhhcygndHlwZScpID8gcGFyYW1JbmZvLmdldCgndHlwZScpICEgOiBudWxsO1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JJbmZvID1cbiAgICAgICAgICAgIHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uaGFzKCdkZWNvcmF0b3JzJykgPyBwYXJhbUluZm8uZ2V0KCdkZWNvcmF0b3JzJykgISA6IG51bGw7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JJbmZvICYmIHRoaXMucmVmbGVjdERlY29yYXRvcnMoZGVjb3JhdG9ySW5mbyk7XG4gICAgICAgIHJldHVybiB7dHlwZUV4cHJlc3Npb24sIGRlY29yYXRvcnN9O1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciBhIHN5bWJvbCBhbmQgZXh0cmFjdCB0aGUgbWVtYmVyIGluZm9ybWF0aW9uLCBjb21iaW5pbmcgaXQgd2l0aCB0aGVcbiAgICogcHJvdmlkZWQgZGVjb3JhdG9yIGluZm9ybWF0aW9uLCBhbmQgd2hldGhlciBpdCBpcyBhIHN0YXRpYyBtZW1iZXIuXG4gICAqXG4gICAqIElmIGEgY2xhc3MgbWVtYmVyIHVzZXMgYWNjZXNzb3JzIChlLmcgZ2V0dGVycyBhbmQvb3Igc2V0dGVycykgdGhlbiBpdCBnZXRzIGRvd25sZXZlbGVkXG4gICAqIGluIEVTNSB0byBhIHNpbmdsZSBgT2JqZWN0LmRlZmluZVByb3BlcnR5KClgIGNhbGwuIEluIHRoYXQgY2FzZSB3ZSBtdXN0IHBhcnNlIHRoaXNcbiAgICogY2FsbCB0byBleHRyYWN0IHRoZSBvbmUgb3IgdHdvIENsYXNzTWVtYmVyIG9iamVjdHMgdGhhdCByZXByZXNlbnQgdGhlIGFjY2Vzc29ycy5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgc3ltYm9sIGZvciB0aGUgbWVtYmVyIHRvIHJlZmxlY3Qgb3Zlci5cbiAgICogQHBhcmFtIGRlY29yYXRvcnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBhc3NvY2lhdGVkIHdpdGggdGhlIG1lbWJlci5cbiAgICogQHBhcmFtIGlzU3RhdGljIHRydWUgaWYgdGhpcyBtZW1iZXIgaXMgc3RhdGljLCBmYWxzZSBpZiBpdCBpcyBhbiBpbnN0YW5jZSBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHJlZmxlY3RlZCBtZW1iZXIgaW5mb3JtYXRpb24sIG9yIG51bGwgaWYgdGhlIHN5bWJvbCBpcyBub3QgYSBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdE1lbWJlcnMoc3ltYm9sOiB0cy5TeW1ib2wsIGRlY29yYXRvcnM/OiBEZWNvcmF0b3JbXSwgaXNTdGF0aWM/OiBib29sZWFuKTpcbiAgICAgIENsYXNzTWVtYmVyW118bnVsbCB7XG4gICAgY29uc3Qgbm9kZSA9IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uIHx8IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgICBjb25zdCBwcm9wZXJ0eURlZmluaXRpb24gPSBub2RlICYmIGdldFByb3BlcnR5RGVmaW5pdGlvbihub2RlKTtcbiAgICBpZiAocHJvcGVydHlEZWZpbml0aW9uKSB7XG4gICAgICBjb25zdCBtZW1iZXJzOiBDbGFzc01lbWJlcltdID0gW107XG4gICAgICBpZiAocHJvcGVydHlEZWZpbml0aW9uLnNldHRlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHByb3BlcnR5RGVmaW5pdGlvbi5zZXR0ZXIsXG4gICAgICAgICAga2luZDogQ2xhc3NNZW1iZXJLaW5kLlNldHRlcixcbiAgICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgICAgIG5hbWU6IHN5bWJvbC5uYW1lLFxuICAgICAgICAgIG5hbWVOb2RlOiBudWxsLFxuICAgICAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgICAgIGlzU3RhdGljOiBpc1N0YXRpYyB8fCBmYWxzZSxcbiAgICAgICAgICBkZWNvcmF0b3JzOiBkZWNvcmF0b3JzIHx8IFtdLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQcmV2ZW50IGF0dGFjaGluZyB0aGUgZGVjb3JhdG9ycyB0byBhIHBvdGVudGlhbCBnZXR0ZXIuIEluIEVTNSwgd2UgY2FuJ3QgdGVsbCB3aGVyZSB0aGVcbiAgICAgICAgLy8gZGVjb3JhdG9ycyB3ZXJlIG9yaWdpbmFsbHkgYXR0YWNoZWQgdG8sIGhvd2V2ZXIgd2Ugb25seSB3YW50IHRvIGF0dGFjaCB0aGVtIHRvIGEgc2luZ2xlXG4gICAgICAgIC8vIGBDbGFzc01lbWJlcmAgYXMgb3RoZXJ3aXNlIG5ndHNjIHdvdWxkIGhhbmRsZSB0aGUgc2FtZSBkZWNvcmF0b3JzIHR3aWNlLlxuICAgICAgICBkZWNvcmF0b3JzID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgaWYgKHByb3BlcnR5RGVmaW5pdGlvbi5nZXR0ZXIpIHtcbiAgICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgICBub2RlLFxuICAgICAgICAgIGltcGxlbWVudGF0aW9uOiBwcm9wZXJ0eURlZmluaXRpb24uZ2V0dGVyLFxuICAgICAgICAgIGtpbmQ6IENsYXNzTWVtYmVyS2luZC5HZXR0ZXIsXG4gICAgICAgICAgdHlwZTogbnVsbCxcbiAgICAgICAgICBuYW1lOiBzeW1ib2wubmFtZSxcbiAgICAgICAgICBuYW1lTm9kZTogbnVsbCxcbiAgICAgICAgICB2YWx1ZTogbnVsbCxcbiAgICAgICAgICBpc1N0YXRpYzogaXNTdGF0aWMgfHwgZmFsc2UsXG4gICAgICAgICAgZGVjb3JhdG9yczogZGVjb3JhdG9ycyB8fCBbXSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVtYmVycztcbiAgICB9XG5cbiAgICBjb25zdCBtZW1iZXJzID0gc3VwZXIucmVmbGVjdE1lbWJlcnMoc3ltYm9sLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgbWVtYmVycyAmJiBtZW1iZXJzLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICAgIGlmIChtZW1iZXIgJiYgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5NZXRob2QgJiYgbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5ub2RlICYmXG4gICAgICAgICAgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obWVtYmVyLm5vZGUpICYmIG1lbWJlci5ub2RlLnBhcmVudCAmJlxuICAgICAgICAgIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihtZW1iZXIubm9kZS5wYXJlbnQpICYmXG4gICAgICAgICAgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24obWVtYmVyLm5vZGUucGFyZW50LnJpZ2h0KSkge1xuICAgICAgICAvLyBSZWNvbXB1dGUgdGhlIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIG1lbWJlcjpcbiAgICAgICAgLy8gRVM1IHN0YXRpYyBtZXRob2RzIGFyZSB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgc28gdGhlIGRlY2xhcmF0aW9uIGlzIGFjdHVhbGx5IHRoZVxuICAgICAgICAvLyBpbml0aWFsaXplciBvZiB0aGUgdmFyaWFibGUgYXNzaWdubWVudFxuICAgICAgICBtZW1iZXIuaW1wbGVtZW50YXRpb24gPSBtZW1iZXIubm9kZS5wYXJlbnQucmlnaHQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG1lbWJlcnM7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBzdGF0ZW1lbnRzIHJlbGF0ZWQgdG8gdGhlIGdpdmVuIGNsYXNzIHRoYXQgbWF5IGNvbnRhaW4gY2FsbHMgdG8gYSBoZWxwZXIuXG4gICAqXG4gICAqIEluIEVTTTUgY29kZSB0aGUgaGVscGVyIGNhbGxzIGFyZSBoaWRkZW4gaW5zaWRlIHRoZSBjbGFzcydzIElJRkUuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLiBXZSBleHBlY3QgdGhpcyBzeW1ib2xcbiAgICogdG8gcmVmZXJlbmNlIHRoZSBpbm5lciBpZGVudGlmaWVyIGluc2lkZSB0aGUgSUlGRS5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygc3RhdGVtZW50cyB0aGF0IG1heSBjb250YWluIGhlbHBlciBjYWxscy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRTdGF0ZW1lbnRzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IENsYXNzU3ltYm9sKTogdHMuU3RhdGVtZW50W10ge1xuICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb25QYXJlbnQgPSBjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uLnBhcmVudDtcbiAgICByZXR1cm4gdHMuaXNCbG9jayhjbGFzc0RlY2xhcmF0aW9uUGFyZW50KSA/IEFycmF5LmZyb20oY2xhc3NEZWNsYXJhdGlvblBhcmVudC5zdGF0ZW1lbnRzKSA6IFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyeSB0byByZXRyaWV2ZSB0aGUgc3ltYm9sIG9mIGEgc3RhdGljIHByb3BlcnR5IG9uIGEgY2xhc3MuXG4gICAqXG4gICAqIEluIEVTNSwgYSBzdGF0aWMgcHJvcGVydHkgY2FuIGVpdGhlciBiZSBzZXQgb24gdGhlIGlubmVyIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGluc2lkZSB0aGUgY2xhc3MnXG4gICAqIElJRkUsIG9yIGl0IGNhbiBiZSBzZXQgb24gdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uLiBUaGVyZWZvcmUsIHRoZSBFUzUgaG9zdCBjaGVja3MgYm90aFxuICAgKiBwbGFjZXMsIGZpcnN0IGxvb2tpbmcgdXAgdGhlIHByb3BlcnR5IG9uIHRoZSBpbm5lciBzeW1ib2wsIGFuZCBpZiB0aGUgcHJvcGVydHkgaXMgbm90IGZvdW5kIGl0XG4gICAqIHdpbGwgZmFsbCBiYWNrIHRvIGxvb2tpbmcgdXAgdGhlIHByb3BlcnR5IG9uIHRoZSBvdXRlciBzeW1ib2wuXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2wgdGhlIGNsYXNzIHdob3NlIHByb3BlcnR5IHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcGFyYW0gcHJvcGVydHlOYW1lIHRoZSBuYW1lIG9mIHN0YXRpYyBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBpZiBpdCBpcyBmb3VuZCBvciBgdW5kZWZpbmVkYCBpZiBub3QuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0U3RhdGljUHJvcGVydHkoc3ltYm9sOiBDbGFzc1N5bWJvbCwgcHJvcGVydHlOYW1lOiB0cy5fX1N0cmluZyk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIC8vIFRoZSBzeW1ib2wgY29ycmVzcG9uZHMgd2l0aCB0aGUgaW5uZXIgZnVuY3Rpb24gZGVjbGFyYXRpb24uIEZpcnN0IGxldHMgc2VlIGlmIHRoZSBzdGF0aWNcbiAgICAvLyBwcm9wZXJ0eSBpcyBzZXQgdGhlcmUuXG4gICAgY29uc3QgcHJvcCA9IHN1cGVyLmdldFN0YXRpY1Byb3BlcnR5KHN5bWJvbCwgcHJvcGVydHlOYW1lKTtcbiAgICBpZiAocHJvcCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gcHJvcDtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIG9idGFpbiB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24gYW5kIHJlc29sdmUgaXRzIHN5bWJvbCwgaW4gb3JkZXIgdG8gbG9va3VwXG4gICAgLy8gc3RhdGljIHByb3BlcnRpZXMgdGhlcmUuXG4gICAgY29uc3Qgb3V0ZXJDbGFzcyA9IGdldENsYXNzRGVjbGFyYXRpb25Gcm9tSW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uKHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICBpZiAob3V0ZXJDbGFzcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IG91dGVyU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24ob3V0ZXJDbGFzcy5uYW1lKTtcbiAgICBpZiAob3V0ZXJTeW1ib2wgPT09IHVuZGVmaW5lZCB8fCBvdXRlclN5bWJvbC52YWx1ZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1cGVyLmdldFN0YXRpY1Byb3BlcnR5KG91dGVyU3ltYm9sIGFzIENsYXNzU3ltYm9sLCBwcm9wZXJ0eU5hbWUpO1xuICB9XG59XG5cbi8vLy8vLy8vLy8vLy8gSW50ZXJuYWwgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgZGV0YWlscyBhYm91dCBwcm9wZXJ0eSBkZWZpbml0aW9ucyB0aGF0IHdlcmUgc2V0IHVzaW5nIGBPYmplY3QuZGVmaW5lUHJvcGVydHlgLlxuICovXG5pbnRlcmZhY2UgUHJvcGVydHlEZWZpbml0aW9uIHtcbiAgc2V0dGVyOiB0cy5GdW5jdGlvbkV4cHJlc3Npb258bnVsbDtcbiAgZ2V0dGVyOiB0cy5GdW5jdGlvbkV4cHJlc3Npb258bnVsbDtcbn1cblxuLyoqXG4gKiBJbiBFUzUsIGdldHRlcnMgYW5kIHNldHRlcnMgaGF2ZSBiZWVuIGRvd25sZXZlbGVkIGludG8gY2FsbCBleHByZXNzaW9ucyBvZlxuICogYE9iamVjdC5kZWZpbmVQcm9wZXJ0eWAsIHN1Y2ggYXNcbiAqXG4gKiBgYGBcbiAqIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDbGF6ei5wcm90b3R5cGUsIFwicHJvcGVydHlcIiwge1xuICogICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAqICAgICAgIHJldHVybiAndmFsdWUnO1xuICogICB9LFxuICogICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICogICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICogICB9LFxuICogICBlbnVtZXJhYmxlOiB0cnVlLFxuICogICBjb25maWd1cmFibGU6IHRydWVcbiAqIH0pO1xuICogYGBgXG4gKlxuICogVGhpcyBmdW5jdGlvbiBpbnNwZWN0cyB0aGUgZ2l2ZW4gbm9kZSB0byBkZXRlcm1pbmUgaWYgaXQgY29ycmVzcG9uZHMgd2l0aCBzdWNoIGEgY2FsbCwgYW5kIGlmIHNvXG4gKiBleHRyYWN0cyB0aGUgYHNldGAgYW5kIGBnZXRgIGZ1bmN0aW9uIGV4cHJlc3Npb25zIGZyb20gdGhlIGRlc2NyaXB0b3Igb2JqZWN0LCBpZiB0aGV5IGV4aXN0LlxuICpcbiAqIEBwYXJhbSBub2RlIFRoZSBub2RlIHRvIG9idGFpbiB0aGUgcHJvcGVydHkgZGVmaW5pdGlvbiBmcm9tLlxuICogQHJldHVybnMgVGhlIHByb3BlcnR5IGRlZmluaXRpb24gaWYgdGhlIG5vZGUgY29ycmVzcG9uZHMgd2l0aCBhY2Nlc3NvciwgbnVsbCBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGdldFByb3BlcnR5RGVmaW5pdGlvbihub2RlOiB0cy5Ob2RlKTogUHJvcGVydHlEZWZpbml0aW9ufG51bGwge1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGZuID0gbm9kZS5leHByZXNzaW9uO1xuICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGZuKSB8fCAhdHMuaXNJZGVudGlmaWVyKGZuLmV4cHJlc3Npb24pIHx8XG4gICAgICBmbi5leHByZXNzaW9uLnRleHQgIT09ICdPYmplY3QnIHx8IGZuLm5hbWUudGV4dCAhPT0gJ2RlZmluZVByb3BlcnR5JylcbiAgICByZXR1cm4gbnVsbDtcblxuICBjb25zdCBkZXNjcmlwdG9yID0gbm9kZS5hcmd1bWVudHNbMl07XG4gIGlmICghZGVzY3JpcHRvciB8fCAhdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihkZXNjcmlwdG9yKSkgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIHtcbiAgICBzZXR0ZXI6IHJlYWRQcm9wZXJ0eUZ1bmN0aW9uRXhwcmVzc2lvbihkZXNjcmlwdG9yLCAnc2V0JyksXG4gICAgZ2V0dGVyOiByZWFkUHJvcGVydHlGdW5jdGlvbkV4cHJlc3Npb24oZGVzY3JpcHRvciwgJ2dldCcpLFxuICB9O1xufVxuXG5mdW5jdGlvbiByZWFkUHJvcGVydHlGdW5jdGlvbkV4cHJlc3Npb24ob2JqZWN0OiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiwgbmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHByb3BlcnR5ID0gb2JqZWN0LnByb3BlcnRpZXMuZmluZChcbiAgICAgIChwKTogcCBpcyB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQgPT5cbiAgICAgICAgICB0cy5pc1Byb3BlcnR5QXNzaWdubWVudChwKSAmJiB0cy5pc0lkZW50aWZpZXIocC5uYW1lKSAmJiBwLm5hbWUudGV4dCA9PT0gbmFtZSk7XG5cbiAgcmV0dXJuIHByb3BlcnR5ICYmIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHByb3BlcnR5LmluaXRpYWxpemVyKSAmJiBwcm9wZXJ0eS5pbml0aWFsaXplciB8fCBudWxsO1xufVxuXG4vKipcbiAqIEdldCB0aGUgYWN0dWFsIChvdXRlcikgZGVjbGFyYXRpb24gb2YgYSBjbGFzcy5cbiAqXG4gKiBJbiBFUzUsIHRoZSBpbXBsZW1lbnRhdGlvbiBvZiBhIGNsYXNzIGlzIGEgZnVuY3Rpb24gZXhwcmVzc2lvbiB0aGF0IGlzIGhpZGRlbiBpbnNpZGUgYW4gSUlGRSBhbmRcbiAqIHJldHVybmVkIHRvIGJlIGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgb3V0c2lkZSB0aGUgSUlGRSwgd2hpY2ggaXMgd2hhdCB0aGUgcmVzdCBvZiB0aGUgcHJvZ3JhbVxuICogaW50ZXJhY3RzIHdpdGguXG4gKlxuICogR2l2ZW4gdGhlIGlubmVyIGZ1bmN0aW9uIGRlY2xhcmF0aW9uLCB3ZSB3YW50IHRvIGdldCB0byB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIG91dGVyIHZhcmlhYmxlXG4gKiB0aGF0IHJlcHJlc2VudHMgdGhlIGNsYXNzLlxuICpcbiAqIEBwYXJhbSBub2RlIGEgbm9kZSB0aGF0IGNvdWxkIGJlIHRoZSBmdW5jdGlvbiBleHByZXNzaW9uIGluc2lkZSBhbiBFUzUgY2xhc3MgSUlGRS5cbiAqIEByZXR1cm5zIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIuXG4gKi9cbmZ1bmN0aW9uIGdldENsYXNzRGVjbGFyYXRpb25Gcm9tSW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOlxuICAgIENsYXNzRGVjbGFyYXRpb248dHMuVmFyaWFibGVEZWNsYXJhdGlvbj58dW5kZWZpbmVkIHtcbiAgaWYgKHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSkge1xuICAgIC8vIEl0IG1pZ2h0IGJlIHRoZSBmdW5jdGlvbiBleHByZXNzaW9uIGluc2lkZSB0aGUgSUlGRS4gV2UgbmVlZCB0byBnbyA1IGxldmVscyB1cC4uLlxuXG4gICAgLy8gMS4gSUlGRSBib2R5LlxuICAgIGxldCBvdXRlck5vZGUgPSBub2RlLnBhcmVudDtcbiAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNCbG9jayhvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgLy8gMi4gSUlGRSBmdW5jdGlvbiBleHByZXNzaW9uLlxuICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKG91dGVyTm9kZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAvLyAzLiBJSUZFIGNhbGwgZXhwcmVzc2lvbi5cbiAgICBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc0NhbGxFeHByZXNzaW9uKG91dGVyTm9kZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAvLyA0LiBQYXJlbnRoZXNpcyBhcm91bmQgSUlGRS5cbiAgICBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG91dGVyTm9kZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAvLyA1LiBPdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24ob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIEZpbmFsbHksIGVuc3VyZSB0aGF0IHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBoYXMgYSBgbmFtZWAgaWRlbnRpZmllci5cbiAgICByZXR1cm4gaGFzTmFtZUlkZW50aWZpZXIob3V0ZXJOb2RlKSA/IG91dGVyTm9kZSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRJaWZlQm9keShkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiB0cy5CbG9ja3x1bmRlZmluZWQge1xuICBpZiAoIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgfHwgIWRlY2xhcmF0aW9uLmluaXRpYWxpemVyIHx8XG4gICAgICAhdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihkZWNsYXJhdGlvbi5pbml0aWFsaXplcikpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGNhbGwgPSBkZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgcmV0dXJuIHRzLmlzQ2FsbEV4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uKSAmJlxuICAgICAgICAgIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGNhbGwuZXhwcmVzc2lvbi5leHByZXNzaW9uKSA/XG4gICAgICBjYWxsLmV4cHJlc3Npb24uZXhwcmVzc2lvbi5ib2R5IDpcbiAgICAgIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZ2V0UmV0dXJuSWRlbnRpZmllcihib2R5OiB0cy5CbG9jayk6IHRzLklkZW50aWZpZXJ8dW5kZWZpbmVkIHtcbiAgY29uc3QgcmV0dXJuU3RhdGVtZW50ID0gYm9keS5zdGF0ZW1lbnRzLmZpbmQodHMuaXNSZXR1cm5TdGF0ZW1lbnQpO1xuICByZXR1cm4gcmV0dXJuU3RhdGVtZW50ICYmIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uICYmXG4gICAgICAgICAgdHMuaXNJZGVudGlmaWVyKHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uKSA/XG4gICAgICByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbiA6XG4gICAgICB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGdldFJldHVyblN0YXRlbWVudChkZWNsYXJhdGlvbjogdHMuRXhwcmVzc2lvbiB8IHVuZGVmaW5lZCk6IHRzLlJldHVyblN0YXRlbWVudHx1bmRlZmluZWQge1xuICByZXR1cm4gZGVjbGFyYXRpb24gJiYgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZGVjbGFyYXRpb24pID9cbiAgICAgIGRlY2xhcmF0aW9uLmJvZHkuc3RhdGVtZW50cy5maW5kKHRzLmlzUmV0dXJuU3RhdGVtZW50KSA6XG4gICAgICB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIHJlZmxlY3RBcnJheUVsZW1lbnQoZWxlbWVudDogdHMuRXhwcmVzc2lvbikge1xuICByZXR1cm4gdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbDtcbn1cblxuLyoqXG4gKiBJbnNwZWN0cyBhIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIHRvIGRldGVybWluZSBpZiBpdCBjb3JyZXNwb25kcyB3aXRoIGEgVHlwZVNjcmlwdCBoZWxwZXIgZnVuY3Rpb24sXG4gKiByZXR1cm5pbmcgaXRzIGtpbmQgaWYgc28gb3IgbnVsbCBpZiB0aGUgZGVjbGFyYXRpb24gZG9lcyBub3Qgc2VlbSB0byBjb3JyZXNwb25kIHdpdGggc3VjaCBhXG4gKiBoZWxwZXIuXG4gKi9cbmZ1bmN0aW9uIGdldFRzSGVscGVyRm4obm9kZTogdHMuTmFtZWREZWNsYXJhdGlvbik6IFRzSGVscGVyRm58bnVsbCB7XG4gIGNvbnN0IG5hbWUgPSBub2RlLm5hbWUgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0lkZW50aWZpZXIobm9kZS5uYW1lKSAmJiBub2RlLm5hbWUudGV4dDtcblxuICBpZiAobmFtZSA9PT0gJ19fc3ByZWFkJykge1xuICAgIHJldHVybiBUc0hlbHBlckZuLlNwcmVhZDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgY29uc3RydWN0b3IgZnVuY3Rpb24gbWF5IGhhdmUgYmVlbiBcInN5bnRoZXNpemVkXCIgYnkgVHlwZVNjcmlwdCBkdXJpbmcgSmF2YVNjcmlwdCBlbWl0LFxuICogaW4gdGhlIGNhc2Ugbm8gdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGV4aXN0cyBhbmQgZS5nLiBwcm9wZXJ0eSBpbml0aWFsaXplcnMgYXJlIHVzZWQuXG4gKiBUaG9zZSBpbml0aWFsaXplcnMgbmVlZCB0byBiZSBlbWl0dGVkIGludG8gYSBjb25zdHJ1Y3RvciBpbiBKYXZhU2NyaXB0LCBzbyB0aGUgVHlwZVNjcmlwdFxuICogY29tcGlsZXIgZ2VuZXJhdGVzIGEgc3ludGhldGljIGNvbnN0cnVjdG9yLlxuICpcbiAqIFdlIG5lZWQgdG8gaWRlbnRpZnkgc3VjaCBjb25zdHJ1Y3RvcnMgYXMgbmdjYyBuZWVkcyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgYSBjbGFzcyBkaWRcbiAqIG9yaWdpbmFsbHkgaGF2ZSBhIGNvbnN0cnVjdG9yIGluIHRoZSBUeXBlU2NyaXB0IHNvdXJjZS4gRm9yIEVTNSwgd2UgY2FuIG5vdCB0ZWxsIGFuXG4gKiBlbXB0eSBjb25zdHJ1Y3RvciBhcGFydCBmcm9tIGEgc3ludGhlc2l6ZWQgY29uc3RydWN0b3IsIGJ1dCBmb3J0dW5hdGVseSB0aGF0IGRvZXMgbm90XG4gKiBtYXR0ZXIgZm9yIHRoZSBjb2RlIGdlbmVyYXRlZCBieSBuZ3RzYy5cbiAqXG4gKiBXaGVuIGEgY2xhc3MgaGFzIGEgc3VwZXJjbGFzcyBob3dldmVyLCBhIHN5bnRoZXNpemVkIGNvbnN0cnVjdG9yIG11c3Qgbm90IGJlIGNvbnNpZGVyZWRcbiAqIGFzIGEgdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGFzIHRoYXQgcHJldmVudHMgYSBiYXNlIGZhY3RvcnkgY2FsbCBmcm9tIGJlaW5nIGNyZWF0ZWQgYnlcbiAqIG5ndHNjLCByZXN1bHRpbmcgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uIHRoYXQgZG9lcyBub3QgaW5qZWN0IHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlXG4gKiBzdXBlcmNsYXNzLiBIZW5jZSwgd2UgaWRlbnRpZnkgYSBkZWZhdWx0IHN5bnRoZXNpemVkIHN1cGVyIGNhbGwgaW4gdGhlIGNvbnN0cnVjdG9yIGJvZHksXG4gKiBhY2NvcmRpbmcgdG8gdGhlIHN0cnVjdHVyZSB0aGF0IFR5cGVTY3JpcHQncyBFUzIwMTUgdG8gRVM1IHRyYW5zZm9ybWVyIGdlbmVyYXRlcyBpblxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuMi4yL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvZXMyMDE1LnRzI0wxMDgyLUwxMDk4XG4gKlxuICogQHBhcmFtIGNvbnN0cnVjdG9yIGEgY29uc3RydWN0b3IgZnVuY3Rpb24gdG8gdGVzdFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgY29uc3RydWN0b3IgYXBwZWFycyB0byBoYXZlIGJlZW4gc3ludGhlc2l6ZWRcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZENvbnN0cnVjdG9yKGNvbnN0cnVjdG9yOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIGlmICghY29uc3RydWN0b3IuYm9keSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGZpcnN0U3RhdGVtZW50ID0gY29uc3RydWN0b3IuYm9keS5zdGF0ZW1lbnRzWzBdO1xuICBpZiAoIWZpcnN0U3RhdGVtZW50KSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGlzU3ludGhlc2l6ZWRTdXBlclRoaXNBc3NpZ25tZW50KGZpcnN0U3RhdGVtZW50KSB8fFxuICAgICAgaXNTeW50aGVzaXplZFN1cGVyUmV0dXJuU3RhdGVtZW50KGZpcnN0U3RhdGVtZW50KTtcbn1cblxuLyoqXG4gKiBJZGVudGlmaWVzIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBvZiB0aGUgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIHZhciBfdGhpcyA9IF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHN0YXRlbWVudCBhIHN0YXRlbWVudCB0aGF0IG1heSBiZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCBsb29rcyBsaWtlIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbFxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkU3VwZXJUaGlzQXNzaWdubWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IHZhcmlhYmxlRGVjbGFyYXRpb25zID0gc3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnM7XG4gIGlmICh2YXJpYWJsZURlY2xhcmF0aW9ucy5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCB2YXJpYWJsZURlY2xhcmF0aW9uID0gdmFyaWFibGVEZWNsYXJhdGlvbnNbMF07XG4gIGlmICghdHMuaXNJZGVudGlmaWVyKHZhcmlhYmxlRGVjbGFyYXRpb24ubmFtZSkgfHxcbiAgICAgICF2YXJpYWJsZURlY2xhcmF0aW9uLm5hbWUudGV4dC5zdGFydHNXaXRoKCdfdGhpcycpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBpbml0aWFsaXplciA9IHZhcmlhYmxlRGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gIGlmICghaW5pdGlhbGl6ZXIpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gaXNTeW50aGVzaXplZERlZmF1bHRTdXBlckNhbGwoaW5pdGlhbGl6ZXIpO1xufVxuLyoqXG4gKiBJZGVudGlmaWVzIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBvZiB0aGUgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIHJldHVybiBfc3VwZXIgIT09IG51bGwgJiYgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgdGhpcztcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzdGF0ZW1lbnQgYSBzdGF0ZW1lbnQgdGhhdCBtYXkgYmUgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBzdGF0ZW1lbnQgbG9va3MgbGlrZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZFN1cGVyUmV0dXJuU3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogYm9vbGVhbiB7XG4gIGlmICghdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGV4cHJlc3Npb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjtcbiAgaWYgKCFleHByZXNzaW9uKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGlzU3ludGhlc2l6ZWREZWZhdWx0U3VwZXJDYWxsKGV4cHJlc3Npb24pO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gaXMgb2YgdGhlIGZvcm06XG4gKlxuICogYGBgXG4gKiBfc3VwZXIgIT09IG51bGwgJiYgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgdGhpcztcbiAqIGBgYFxuICpcbiAqIFRoaXMgc3RydWN0dXJlIGlzIGdlbmVyYXRlZCBieSBUeXBlU2NyaXB0IHdoZW4gdHJhbnNmb3JtaW5nIEVTMjAxNSB0byBFUzUsIHNlZVxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuMi4yL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvZXMyMDE1LnRzI0wxMTQ4LUwxMTYzXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gYW4gZXhwcmVzc2lvbiB0aGF0IG1heSByZXByZXNlbnQgYSBkZWZhdWx0IHN1cGVyIGNhbGxcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gY29ycmVzcG9uZHMgd2l0aCB0aGUgYWJvdmUgZm9ybVxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkRGVmYXVsdFN1cGVyQ2FsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIGlmICghaXNCaW5hcnlFeHByKGV4cHJlc3Npb24sIHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW4pKSByZXR1cm4gZmFsc2U7XG4gIGlmIChleHByZXNzaW9uLnJpZ2h0LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBsZWZ0ID0gZXhwcmVzc2lvbi5sZWZ0O1xuICBpZiAoIWlzQmluYXJ5RXhwcihsZWZ0LCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuKSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N1cGVyTm90TnVsbChsZWZ0LmxlZnQpICYmIGlzU3VwZXJBcHBseUNhbGwobGVmdC5yaWdodCk7XG59XG5cbmZ1bmN0aW9uIGlzU3VwZXJOb3ROdWxsKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIGlzQmluYXJ5RXhwcihleHByZXNzaW9uLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzRXF1YWxzVG9rZW4pICYmXG4gICAgICBpc1N1cGVySWRlbnRpZmllcihleHByZXNzaW9uLmxlZnQpO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gaXMgb2YgdGhlIGZvcm1cbiAqXG4gKiBgYGBcbiAqIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiBhbiBleHByZXNzaW9uIHRoYXQgbWF5IHJlcHJlc2VudCBhIGRlZmF1bHQgc3VwZXIgY2FsbFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgZXhwcmVzc2lvbiBjb3JyZXNwb25kcyB3aXRoIHRoZSBhYm92ZSBmb3JtXG4gKi9cbmZ1bmN0aW9uIGlzU3VwZXJBcHBseUNhbGwoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikgfHwgZXhwcmVzc2lvbi5hcmd1bWVudHMubGVuZ3RoICE9PSAyKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgdGFyZ2V0Rm4gPSBleHByZXNzaW9uLmV4cHJlc3Npb247XG4gIGlmICghdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24odGFyZ2V0Rm4pKSByZXR1cm4gZmFsc2U7XG4gIGlmICghaXNTdXBlcklkZW50aWZpZXIodGFyZ2V0Rm4uZXhwcmVzc2lvbikpIHJldHVybiBmYWxzZTtcbiAgaWYgKHRhcmdldEZuLm5hbWUudGV4dCAhPT0gJ2FwcGx5JykgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IHRoaXNBcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuICBpZiAodGhpc0FyZ3VtZW50LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBhcmd1bWVudHNBcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzFdO1xuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKGFyZ3VtZW50c0FyZ3VtZW50KSAmJiBhcmd1bWVudHNBcmd1bWVudC50ZXh0ID09PSAnYXJndW1lbnRzJztcbn1cblxuZnVuY3Rpb24gaXNCaW5hcnlFeHByKFxuICAgIGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24sIG9wZXJhdG9yOiB0cy5CaW5hcnlPcGVyYXRvcik6IGV4cHJlc3Npb24gaXMgdHMuQmluYXJ5RXhwcmVzc2lvbiB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24oZXhwcmVzc2lvbikgJiYgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IG9wZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBpc1N1cGVySWRlbnRpZmllcihub2RlOiB0cy5Ob2RlKTogYm9vbGVhbiB7XG4gIC8vIFZlcmlmeSB0aGF0IHRoZSBpZGVudGlmaWVyIGlzIHByZWZpeGVkIHdpdGggYF9zdXBlcmAuIFdlIGRvbid0IHRlc3QgZm9yIGVxdWl2YWxlbmNlXG4gIC8vIGFzIFR5cGVTY3JpcHQgbWF5IGhhdmUgc3VmZml4ZWQgdGhlIG5hbWUsIGUuZy4gYF9zdXBlcl8xYCB0byBhdm9pZCBuYW1lIGNvbmZsaWN0cy5cbiAgLy8gUmVxdWlyaW5nIG9ubHkgYSBwcmVmaXggc2hvdWxkIGJlIHN1ZmZpY2llbnRseSBhY2N1cmF0ZS5cbiAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihub2RlKSAmJiBub2RlLnRleHQuc3RhcnRzV2l0aCgnX3N1cGVyJyk7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIHN0YXRlbWVudCB0byBleHRyYWN0IHRoZSBFU001IHBhcmFtZXRlciBpbml0aWFsaXplciBpZiB0aGVyZSBpcyBvbmUuXG4gKiBJZiBvbmUgaXMgZm91bmQsIGFkZCBpdCB0byB0aGUgYXBwcm9wcmlhdGUgcGFyYW1ldGVyIGluIHRoZSBgcGFyYW1ldGVyc2AgY29sbGVjdGlvbi5cbiAqXG4gKiBUaGUgZm9ybSB3ZSBhcmUgbG9va2luZyBmb3IgaXM6XG4gKlxuICogYGBgXG4gKiBpZiAoYXJnID09PSB2b2lkIDApIHsgYXJnID0gaW5pdGlhbGl6ZXI7IH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzdGF0ZW1lbnQgYSBzdGF0ZW1lbnQgdGhhdCBtYXkgYmUgaW5pdGlhbGl6aW5nIGFuIG9wdGlvbmFsIHBhcmFtZXRlclxuICogQHBhcmFtIHBhcmFtZXRlcnMgdGhlIGNvbGxlY3Rpb24gb2YgcGFyYW1ldGVycyB0aGF0IHdlcmUgZm91bmQgaW4gdGhlIGZ1bmN0aW9uIGRlZmluaXRpb25cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCB3YXMgYSBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXJcbiAqL1xuZnVuY3Rpb24gcmVmbGVjdFBhcmFtSW5pdGlhbGl6ZXIoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQsIHBhcmFtZXRlcnM6IFBhcmFtZXRlcltdKSB7XG4gIGlmICh0cy5pc0lmU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgaXNVbmRlZmluZWRDb21wYXJpc29uKHN0YXRlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNCbG9jayhzdGF0ZW1lbnQudGhlblN0YXRlbWVudCkgJiYgc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCBpZlN0YXRlbWVudENvbXBhcmlzb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjsgICAgICAgICAgIC8vIChhcmcgPT09IHZvaWQgMClcbiAgICBjb25zdCB0aGVuU3RhdGVtZW50ID0gc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50c1swXTsgIC8vIGFyZyA9IGluaXRpYWxpemVyO1xuICAgIGlmIChpc0Fzc2lnbm1lbnRTdGF0ZW1lbnQodGhlblN0YXRlbWVudCkpIHtcbiAgICAgIGNvbnN0IGNvbXBhcmlzb25OYW1lID0gaWZTdGF0ZW1lbnRDb21wYXJpc29uLmxlZnQudGV4dDtcbiAgICAgIGNvbnN0IGFzc2lnbm1lbnROYW1lID0gdGhlblN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQudGV4dDtcbiAgICAgIGlmIChjb21wYXJpc29uTmFtZSA9PT0gYXNzaWdubWVudE5hbWUpIHtcbiAgICAgICAgY29uc3QgcGFyYW1ldGVyID0gcGFyYW1ldGVycy5maW5kKHAgPT4gcC5uYW1lID09PSBjb21wYXJpc29uTmFtZSk7XG4gICAgICAgIGlmIChwYXJhbWV0ZXIpIHtcbiAgICAgICAgICBwYXJhbWV0ZXIuaW5pdGlhbGl6ZXIgPSB0aGVuU3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQ7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZENvbXBhcmlzb24oZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGV4cHJlc3Npb24gaXMgdHMuRXhwcmVzc2lvbiZcbiAgICB7bGVmdDogdHMuSWRlbnRpZmllciwgcmlnaHQ6IHRzLkV4cHJlc3Npb259IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihleHByZXNzaW9uKSAmJlxuICAgICAgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW4gJiZcbiAgICAgIHRzLmlzVm9pZEV4cHJlc3Npb24oZXhwcmVzc2lvbi5yaWdodCkgJiYgdHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24ubGVmdCk7XG59XG4iXX0=