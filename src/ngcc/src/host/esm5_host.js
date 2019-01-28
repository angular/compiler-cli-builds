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
        define("@angular/compiler-cli/src/ngcc/src/host/esm5_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngcc/src/utils", "@angular/compiler-cli/src/ngcc/src/host/esm2015_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
    var esm2015_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/esm2015_host");
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
        function Esm5ReflectionHost(isCore, checker) {
            return _super.call(this, isCore, checker) || this;
        }
        /**
         * Check whether the given node actually represents a class.
         */
        Esm5ReflectionHost.prototype.isClass = function (node) {
            return _super.prototype.isClass.call(this, node) || !!this.getClassSymbol(node);
        };
        /**
         * Determines whether the given declaration has a base class.
         *
         * In ES5, we need to determine if the IIFE wrapper takes a `_super` parameter .
         */
        Esm5ReflectionHost.prototype.hasBaseClass = function (node) {
            var classSymbol = this.getClassSymbol(node);
            if (!classSymbol)
                return false;
            var iifeBody = classSymbol.valueDeclaration.parent;
            if (!iifeBody || !ts.isBlock(iifeBody))
                return false;
            var iife = iifeBody.parent;
            if (!iife || !ts.isFunctionExpression(iife))
                return false;
            return iife.parameters.length === 1 && isSuperIdentifier(iife.parameters[0].name);
        };
        /**
         * Find a symbol for a node that we think is a class.
         *
         * In ES5, the implementation of a class is a function expression that is hidden inside an IIFE.
         * So we might need to dig around inside to get hold of the "class" symbol.
         *
         * `node` might be one of:
         * - A class declaration (from a declaration file).
         * - The declaration of the outer variable, which is assigned the result of the IIFE.
         * - The function declaration inside the IIFE, which is eventually returned and assigned to the
         *   outer variable.
         *
         * @param node the top level declaration that represents an exported class or the function
         *     expression inside the IIFE.
         * @returns the symbol for the node or `undefined` if it is not a "class" or has no symbol.
         */
        Esm5ReflectionHost.prototype.getClassSymbol = function (node) {
            var symbol = _super.prototype.getClassSymbol.call(this, node);
            if (symbol)
                return symbol;
            if (ts.isVariableDeclaration(node)) {
                var iifeBody = getIifeBody(node);
                if (!iifeBody)
                    return undefined;
                var innerClassIdentifier = getReturnIdentifier(iifeBody);
                if (!innerClassIdentifier)
                    return undefined;
                return this.checker.getSymbolAtLocation(innerClassIdentifier);
            }
            var outerClassNode = getClassDeclarationFromInnerFunctionDeclaration(node);
            return outerClassNode && this.getClassSymbol(outerClassNode);
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
            if (outerClassNode && utils_1.hasNameIdentifier(outerClassNode)) {
                id = outerClassNode.name;
            }
            // Resolve the identifier to a Symbol, and return the declaration of that.
            return _super.prototype.getDeclarationOfIdentifier.call(this, id);
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
        ///////////// Protected Helpers /////////////
        /**
         * Find the declarations of the constructor parameters of a class identified by its symbol.
         *
         * In ESM5 there is no "class" so the constructor that we want is actually the declaration
         * function itself.
         *
         * @param classSymbol the class whose parameters we want to find.
         * @returns an array of `ts.ParameterDeclaration` objects representing each of the parameters in
         * the class's constructor or null if there is no constructor.
         */
        Esm5ReflectionHost.prototype.getConstructorParameterDeclarations = function (classSymbol) {
            var constructor = classSymbol.valueDeclaration;
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
            var propertyDefinition = getPropertyDefinition(node);
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
            var classDeclaration = classSymbol.valueDeclaration;
            return ts.isBlock(classDeclaration.parent) ? Array.from(classDeclaration.parent.statements) :
                [];
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
            return outerNode;
        }
        return undefined;
    }
    function getIifeBody(declaration) {
        if (!declaration.initializer || !ts.isParenthesizedExpression(declaration.initializer)) {
            return undefined;
        }
        var call = declaration.initializer;
        return ts.isCallExpression(call.expression) &&
            ts.isFunctionExpression(call.expression.expression) ?
            call.expression.expression.body :
            undefined;
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMseUVBQW9KO0lBQ3BKLGtFQUF3RDtJQUV4RCxxRkFBbUg7SUFHbkg7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSDtRQUF3Qyw4Q0FBcUI7UUFDM0QsNEJBQVksTUFBZSxFQUFFLE9BQXVCO21CQUFJLGtCQUFNLE1BQU0sRUFBRSxPQUFPLENBQUM7UUFBRSxDQUFDO1FBRWpGOztXQUVHO1FBQ0gsb0NBQU8sR0FBUCxVQUFRLElBQWE7WUFDbkIsT0FBTyxpQkFBTSxPQUFPLFlBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUQsQ0FBQztRQUVEOzs7O1dBSUc7UUFDSCx5Q0FBWSxHQUFaLFVBQWEsSUFBb0I7WUFDL0IsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5QyxJQUFJLENBQUMsV0FBVztnQkFBRSxPQUFPLEtBQUssQ0FBQztZQUUvQixJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDO1lBQ3JELElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztnQkFBRSxPQUFPLEtBQUssQ0FBQztZQUVyRCxJQUFNLElBQUksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQzdCLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1lBRTFE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QUFTLHFCQUFxQixDQUFDLFVBQXlCO1FBRXRELE9BQU8sRUFBRSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQztZQUNwQyxVQUFVLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QjtZQUN2RSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIERlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIEZ1bmN0aW9uRGVmaW5pdGlvbiwgUGFyYW1ldGVyLCByZWZsZWN0T2JqZWN0TGl0ZXJhbH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge2dldE5hbWVUZXh0LCBoYXNOYW1lSWRlbnRpZmllcn0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge0VzbTIwMTVSZWZsZWN0aW9uSG9zdCwgUGFyYW1JbmZvLCBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbCwgaXNBc3NpZ25tZW50U3RhdGVtZW50fSBmcm9tICcuL2VzbTIwMTVfaG9zdCc7XG5cblxuLyoqXG4gKiBFU001IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCBJSUZFIGZ1bmN0aW9ucyB0aGF0IGFjdCBsaWtlIGNsYXNzZXMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogdmFyIENvbW1vbk1vZHVsZSA9IChmdW5jdGlvbiAoKSB7XG4gKiAgZnVuY3Rpb24gQ29tbW9uTW9kdWxlKCkge1xuICogIH1cbiAqICBDb21tb25Nb2R1bGUuZGVjb3JhdG9ycyA9IFsgLi4uIF07XG4gKiBgYGBcbiAqXG4gKiAqIFwiQ2xhc3Nlc1wiIGFyZSBkZWNvcmF0ZWQgaWYgdGhleSBoYXZlIGEgc3RhdGljIHByb3BlcnR5IGNhbGxlZCBgZGVjb3JhdG9yc2AuXG4gKiAqIE1lbWJlcnMgYXJlIGRlY29yYXRlZCBpZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGtleSBvbiBhIHN0YXRpYyBwcm9wZXJ0eVxuICogICBjYWxsZWQgYHByb3BEZWNvcmF0b3JzYC5cbiAqICogQ29uc3RydWN0b3IgcGFyYW1ldGVycyBkZWNvcmF0b3JzIGFyZSBmb3VuZCBvbiBhbiBvYmplY3QgcmV0dXJuZWQgZnJvbVxuICogICBhIHN0YXRpYyBtZXRob2QgY2FsbGVkIGBjdG9yUGFyYW1ldGVyc2AuXG4gKlxuICovXG5leHBvcnQgY2xhc3MgRXNtNVJlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0IHtcbiAgY29uc3RydWN0b3IoaXNDb3JlOiBib29sZWFuLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcikgeyBzdXBlcihpc0NvcmUsIGNoZWNrZXIpOyB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgdGhlIGdpdmVuIG5vZGUgYWN0dWFsbHkgcmVwcmVzZW50cyBhIGNsYXNzLlxuICAgKi9cbiAgaXNDbGFzcyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5OYW1lZERlY2xhcmF0aW9uIHtcbiAgICByZXR1cm4gc3VwZXIuaXNDbGFzcyhub2RlKSB8fCAhIXRoaXMuZ2V0Q2xhc3NTeW1ib2wobm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBnaXZlbiBkZWNsYXJhdGlvbiBoYXMgYSBiYXNlIGNsYXNzLlxuICAgKlxuICAgKiBJbiBFUzUsIHdlIG5lZWQgdG8gZGV0ZXJtaW5lIGlmIHRoZSBJSUZFIHdyYXBwZXIgdGFrZXMgYSBgX3N1cGVyYCBwYXJhbWV0ZXIgLlxuICAgKi9cbiAgaGFzQmFzZUNsYXNzKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKG5vZGUpO1xuICAgIGlmICghY2xhc3NTeW1ib2wpIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGlpZmVCb2R5ID0gY2xhc3NTeW1ib2wudmFsdWVEZWNsYXJhdGlvbi5wYXJlbnQ7XG4gICAgaWYgKCFpaWZlQm9keSB8fCAhdHMuaXNCbG9jayhpaWZlQm9keSkpIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGlpZmUgPSBpaWZlQm9keS5wYXJlbnQ7XG4gICAgaWYgKCFpaWZlIHx8ICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihpaWZlKSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgcmV0dXJuIGlpZmUucGFyYW1ldGVycy5sZW5ndGggPT09IDEgJiYgaXNTdXBlcklkZW50aWZpZXIoaWlmZS5wYXJhbWV0ZXJzWzBdLm5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYSBzeW1ib2wgZm9yIGEgbm9kZSB0aGF0IHdlIHRoaW5rIGlzIGEgY2xhc3MuXG4gICAqXG4gICAqIEluIEVTNSwgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY2xhc3MgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHRoYXQgaXMgaGlkZGVuIGluc2lkZSBhbiBJSUZFLlxuICAgKiBTbyB3ZSBtaWdodCBuZWVkIHRvIGRpZyBhcm91bmQgaW5zaWRlIHRvIGdldCBob2xkIG9mIHRoZSBcImNsYXNzXCIgc3ltYm9sLlxuICAgKlxuICAgKiBgbm9kZWAgbWlnaHQgYmUgb25lIG9mOlxuICAgKiAtIEEgY2xhc3MgZGVjbGFyYXRpb24gKGZyb20gYSBkZWNsYXJhdGlvbiBmaWxlKS5cbiAgICogLSBUaGUgZGVjbGFyYXRpb24gb2YgdGhlIG91dGVyIHZhcmlhYmxlLCB3aGljaCBpcyBhc3NpZ25lZCB0aGUgcmVzdWx0IG9mIHRoZSBJSUZFLlxuICAgKiAtIFRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiBpbnNpZGUgdGhlIElJRkUsIHdoaWNoIGlzIGV2ZW50dWFsbHkgcmV0dXJuZWQgYW5kIGFzc2lnbmVkIHRvIHRoZVxuICAgKiAgIG91dGVyIHZhcmlhYmxlLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgdG9wIGxldmVsIGRlY2xhcmF0aW9uIHRoYXQgcmVwcmVzZW50cyBhbiBleHBvcnRlZCBjbGFzcyBvciB0aGUgZnVuY3Rpb25cbiAgICogICAgIGV4cHJlc3Npb24gaW5zaWRlIHRoZSBJSUZFLlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGZvciB0aGUgbm9kZSBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIgb3IgaGFzIG5vIHN5bWJvbC5cbiAgICovXG4gIGdldENsYXNzU3ltYm9sKG5vZGU6IHRzLk5vZGUpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBzeW1ib2wgPSBzdXBlci5nZXRDbGFzc1N5bWJvbChub2RlKTtcbiAgICBpZiAoc3ltYm9sKSByZXR1cm4gc3ltYm9sO1xuXG4gICAgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgY29uc3QgaWlmZUJvZHkgPSBnZXRJaWZlQm9keShub2RlKTtcbiAgICAgIGlmICghaWlmZUJvZHkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgIGNvbnN0IGlubmVyQ2xhc3NJZGVudGlmaWVyID0gZ2V0UmV0dXJuSWRlbnRpZmllcihpaWZlQm9keSk7XG4gICAgICBpZiAoIWlubmVyQ2xhc3NJZGVudGlmaWVyKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgICByZXR1cm4gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaW5uZXJDbGFzc0lkZW50aWZpZXIpO1xuICAgIH1cblxuICAgIGNvbnN0IG91dGVyQ2xhc3NOb2RlID0gZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZSk7XG5cbiAgICByZXR1cm4gb3V0ZXJDbGFzc05vZGUgJiYgdGhpcy5nZXRDbGFzc1N5bWJvbChvdXRlckNsYXNzTm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogVHJhY2UgYW4gaWRlbnRpZmllciB0byBpdHMgZGVjbGFyYXRpb24sIGlmIHBvc3NpYmxlLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBhdHRlbXB0cyB0byByZXNvbHZlIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZ2l2ZW4gaWRlbnRpZmllciwgdHJhY2luZyBiYWNrIHRocm91Z2hcbiAgICogaW1wb3J0cyBhbmQgcmUtZXhwb3J0cyB1bnRpbCB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gc3RhdGVtZW50IGlzIGZvdW5kLiBBIGBEZWNsYXJhdGlvbmBcbiAgICogb2JqZWN0IGlzIHJldHVybmVkIGlmIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBpcyBmb3VuZCwgb3IgYG51bGxgIGlzIHJldHVybmVkIG90aGVyd2lzZS5cbiAgICpcbiAgICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUuXG4gICAqIElmIHdlIGFyZSBsb29raW5nIGZvciB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGlkZW50aWZpZXIgb2YgdGhlIGlubmVyIGZ1bmN0aW9uIGV4cHJlc3Npb24sIHdlXG4gICAqIHdpbGwgZ2V0IGhvbGQgb2YgdGhlIG91dGVyIFwiY2xhc3NcIiB2YXJpYWJsZSBkZWNsYXJhdGlvbiBhbmQgcmV0dXJuIGl0cyBpZGVudGlmaWVyIGluc3RlYWQuIFNlZVxuICAgKiBgZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckZ1bmN0aW9uRGVjbGFyYXRpb24oKWAgZm9yIG1vcmUgaW5mby5cbiAgICpcbiAgICogQHBhcmFtIGlkIGEgVHlwZVNjcmlwdCBgdHMuSWRlbnRpZmllcmAgdG8gdHJhY2UgYmFjayB0byBhIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBtZXRhZGF0YSBhYm91dCB0aGUgYERlY2xhcmF0aW9uYCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYFxuICAgKiBvdGhlcndpc2UuXG4gICAqL1xuICBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIC8vIEdldCB0aGUgaWRlbnRpZmllciBmb3IgdGhlIG91dGVyIGNsYXNzIG5vZGUgKGlmIGFueSkuXG4gICAgY29uc3Qgb3V0ZXJDbGFzc05vZGUgPSBnZXRDbGFzc0RlY2xhcmF0aW9uRnJvbUlubmVyRnVuY3Rpb25EZWNsYXJhdGlvbihpZC5wYXJlbnQpO1xuXG4gICAgaWYgKG91dGVyQ2xhc3NOb2RlICYmIGhhc05hbWVJZGVudGlmaWVyKG91dGVyQ2xhc3NOb2RlKSkge1xuICAgICAgaWQgPSBvdXRlckNsYXNzTm9kZS5uYW1lO1xuICAgIH1cblxuICAgIC8vIFJlc29sdmUgdGhlIGlkZW50aWZpZXIgdG8gYSBTeW1ib2wsIGFuZCByZXR1cm4gdGhlIGRlY2xhcmF0aW9uIG9mIHRoYXQuXG4gICAgcmV0dXJuIHN1cGVyLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBhIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIHRvIGZpbmQgdGhlIHJlbGV2YW50IG1ldGFkYXRhIGFib3V0IGl0LlxuICAgKlxuICAgKiBJbiBFU001IHdlIG5lZWQgdG8gZG8gc3BlY2lhbCB3b3JrIHdpdGggb3B0aW9uYWwgYXJndW1lbnRzIHRvIHRoZSBmdW5jdGlvbiwgc2luY2UgdGhleSBnZXRcbiAgICogdGhlaXIgb3duIGluaXRpYWxpemVyIHN0YXRlbWVudCB0aGF0IG5lZWRzIHRvIGJlIHBhcnNlZCBhbmQgdGhlbiBub3QgaW5jbHVkZWQgaW4gdGhlIFwiYm9keVwiXG4gICAqIHN0YXRlbWVudHMgb2YgdGhlIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gdG8gcGFyc2UuXG4gICAqIEByZXR1cm5zIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBub2RlLCBzdGF0ZW1lbnRzIGFuZCBwYXJhbWV0ZXJzIG9mIHRoZSBmdW5jdGlvbi5cbiAgICovXG4gIGdldERlZmluaXRpb25PZkZ1bmN0aW9uPFQgZXh0ZW5kcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5GdW5jdGlvbkV4cHJlc3Npb24+KG5vZGU6IFQpOiBGdW5jdGlvbkRlZmluaXRpb248VD4ge1xuICAgIGNvbnN0IHBhcmFtZXRlcnMgPVxuICAgICAgICBub2RlLnBhcmFtZXRlcnMubWFwKHAgPT4gKHtuYW1lOiBnZXROYW1lVGV4dChwLm5hbWUpLCBub2RlOiBwLCBpbml0aWFsaXplcjogbnVsbH0pKTtcbiAgICBsZXQgbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzID0gdHJ1ZTtcblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBub2RlLmJvZHkgJiYgbm9kZS5ib2R5LnN0YXRlbWVudHMuZmlsdGVyKHMgPT4ge1xuICAgICAgbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzID1cbiAgICAgICAgICBsb29raW5nRm9yUGFyYW1Jbml0aWFsaXplcnMgJiYgcmVmbGVjdFBhcmFtSW5pdGlhbGl6ZXIocywgcGFyYW1ldGVycyk7XG4gICAgICAvLyBJZiB3ZSBhcmUgbm8gbG9uZ2VyIGxvb2tpbmcgZm9yIHBhcmFtZXRlciBpbml0aWFsaXplcnMgdGhlbiB3ZSBpbmNsdWRlIHRoaXMgc3RhdGVtZW50XG4gICAgICByZXR1cm4gIWxvb2tpbmdGb3JQYXJhbUluaXRpYWxpemVycztcbiAgICB9KTtcblxuICAgIHJldHVybiB7bm9kZSwgYm9keTogc3RhdGVtZW50cyB8fCBudWxsLCBwYXJhbWV0ZXJzfTtcbiAgfVxuXG5cbiAgLy8vLy8vLy8vLy8vLyBQcm90ZWN0ZWQgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIGRlY2xhcmF0aW9ucyBvZiB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIGNsYXNzIGlkZW50aWZpZWQgYnkgaXRzIHN5bWJvbC5cbiAgICpcbiAgICogSW4gRVNNNSB0aGVyZSBpcyBubyBcImNsYXNzXCIgc28gdGhlIGNvbnN0cnVjdG9yIHRoYXQgd2Ugd2FudCBpcyBhY3R1YWxseSB0aGUgZGVjbGFyYXRpb25cbiAgICogZnVuY3Rpb24gaXRzZWxmLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIHBhcmFtZXRlcnMgd2Ugd2FudCB0byBmaW5kLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25gIG9iamVjdHMgcmVwcmVzZW50aW5nIGVhY2ggb2YgdGhlIHBhcmFtZXRlcnMgaW5cbiAgICogdGhlIGNsYXNzJ3MgY29uc3RydWN0b3Igb3IgbnVsbCBpZiB0aGVyZSBpcyBubyBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbDogdHMuU3ltYm9sKTpcbiAgICAgIHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW118bnVsbCB7XG4gICAgY29uc3QgY29uc3RydWN0b3IgPSBjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uIGFzIHRzLkZ1bmN0aW9uRGVjbGFyYXRpb247XG4gICAgaWYgKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oY29uc3RydWN0b3IucGFyYW1ldGVycyk7XG4gICAgfVxuICAgIGlmIChpc1N5bnRoZXNpemVkQ29uc3RydWN0b3IoY29uc3RydWN0b3IpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcGFyYW1ldGVyIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzLFxuICAgKiB3aGVyZSB0aGUgaW5mb3JtYXRpb24gaXMgc3RvcmVkIG9uIGEgc3RhdGljIG1ldGhvZCBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIEluIHRoaXMgY2FzZSB0aGUgZGVjb3JhdG9ycyBhcmUgc3RvcmVkIGluIHRoZSBib2R5IG9mIGEgbWV0aG9kXG4gICAqIChgY3RvclBhcmF0ZW1lcnNgKSBhdHRhY2hlZCB0byB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24uXG4gICAqXG4gICAqIE5vdGUgdGhhdCB1bmxpa2UgRVNNMjAxNSB0aGlzIGlzIGEgZnVuY3Rpb24gZXhwcmVzc2lvbiByYXRoZXIgdGhhbiBhbiBhcnJvd1xuICAgKiBmdW5jdGlvbjpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIFtcbiAgICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gICAqICAgeyB0eXBlOiBUZW1wbGF0ZVJlZiwgfSxcbiAgICogICB7IHR5cGU6IEl0ZXJhYmxlRGlmZmVycywgfSxcbiAgICogICB7IHR5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU4sXSB9LF0gfSxcbiAgICogXTsgfTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSB0aGUgcHJvcGVydHkgdGhhdCBob2xkcyB0aGUgcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIG9iamVjdHMgY29udGFpbmluZyB0aGUgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgZWFjaCBwYXJhbWV0ZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0UGFyYW1JbmZvRnJvbVN0YXRpY1Byb3BlcnR5KHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5OiB0cy5TeW1ib2wpOiBQYXJhbUluZm9bXXxudWxsIHtcbiAgICBjb25zdCBwYXJhbURlY29yYXRvcnMgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgY29uc3QgcmV0dXJuU3RhdGVtZW50ID0gZ2V0UmV0dXJuU3RhdGVtZW50KHBhcmFtRGVjb3JhdG9ycyk7XG4gICAgY29uc3QgZXhwcmVzc2lvbiA9IHJldHVyblN0YXRlbWVudCAmJiByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbjtcbiAgICBpZiAoZXhwcmVzc2lvbiAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZXhwcmVzc2lvbikpIHtcbiAgICAgIGNvbnN0IGVsZW1lbnRzID0gZXhwcmVzc2lvbi5lbGVtZW50cztcbiAgICAgIHJldHVybiBlbGVtZW50cy5tYXAocmVmbGVjdEFycmF5RWxlbWVudCkubWFwKHBhcmFtSW5mbyA9PiB7XG4gICAgICAgIGNvbnN0IHR5cGVFeHByZXNzaW9uID0gcGFyYW1JbmZvICYmIHBhcmFtSW5mby5nZXQoJ3R5cGUnKSB8fCBudWxsO1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JJbmZvID0gcGFyYW1JbmZvICYmIHBhcmFtSW5mby5nZXQoJ2RlY29yYXRvcnMnKSB8fCBudWxsO1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9ySW5mbyAmJiB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvckluZm8pO1xuICAgICAgICByZXR1cm4ge3R5cGVFeHByZXNzaW9uLCBkZWNvcmF0b3JzfTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgYSBzeW1ib2wgYW5kIGV4dHJhY3QgdGhlIG1lbWJlciBpbmZvcm1hdGlvbiwgY29tYmluaW5nIGl0IHdpdGggdGhlXG4gICAqIHByb3ZpZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiwgYW5kIHdoZXRoZXIgaXQgaXMgYSBzdGF0aWMgbWVtYmVyLlxuICAgKlxuICAgKiBJZiBhIGNsYXNzIG1lbWJlciB1c2VzIGFjY2Vzc29ycyAoZS5nIGdldHRlcnMgYW5kL29yIHNldHRlcnMpIHRoZW4gaXQgZ2V0cyBkb3dubGV2ZWxlZFxuICAgKiBpbiBFUzUgdG8gYSBzaW5nbGUgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYCBjYWxsLiBJbiB0aGF0IGNhc2Ugd2UgbXVzdCBwYXJzZSB0aGlzXG4gICAqIGNhbGwgdG8gZXh0cmFjdCB0aGUgb25lIG9yIHR3byBDbGFzc01lbWJlciBvYmplY3RzIHRoYXQgcmVwcmVzZW50IHRoZSBhY2Nlc3NvcnMuXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2wgdGhlIHN5bWJvbCBmb3IgdGhlIG1lbWJlciB0byByZWZsZWN0IG92ZXIuXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBtZW1iZXIuXG4gICAqIEBwYXJhbSBpc1N0YXRpYyB0cnVlIGlmIHRoaXMgbWVtYmVyIGlzIHN0YXRpYywgZmFsc2UgaWYgaXQgaXMgYW4gaW5zdGFuY2UgcHJvcGVydHkuXG4gICAqIEByZXR1cm5zIHRoZSByZWZsZWN0ZWQgbWVtYmVyIGluZm9ybWF0aW9uLCBvciBudWxsIGlmIHRoZSBzeW1ib2wgaXMgbm90IGEgbWVtYmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlZmxlY3RNZW1iZXJzKHN5bWJvbDogdHMuU3ltYm9sLCBkZWNvcmF0b3JzPzogRGVjb3JhdG9yW10sIGlzU3RhdGljPzogYm9vbGVhbik6XG4gICAgICBDbGFzc01lbWJlcltdfG51bGwge1xuICAgIGNvbnN0IG5vZGUgPSBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiB8fCBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgY29uc3QgcHJvcGVydHlEZWZpbml0aW9uID0gZ2V0UHJvcGVydHlEZWZpbml0aW9uKG5vZGUpO1xuICAgIGlmIChwcm9wZXJ0eURlZmluaXRpb24pIHtcbiAgICAgIGNvbnN0IG1lbWJlcnM6IENsYXNzTWVtYmVyW10gPSBbXTtcbiAgICAgIGlmIChwcm9wZXJ0eURlZmluaXRpb24uc2V0dGVyKSB7XG4gICAgICAgIG1lbWJlcnMucHVzaCh7XG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgICBpbXBsZW1lbnRhdGlvbjogcHJvcGVydHlEZWZpbml0aW9uLnNldHRlcixcbiAgICAgICAgICBraW5kOiBDbGFzc01lbWJlcktpbmQuU2V0dGVyLFxuICAgICAgICAgIHR5cGU6IG51bGwsXG4gICAgICAgICAgbmFtZTogc3ltYm9sLm5hbWUsXG4gICAgICAgICAgbmFtZU5vZGU6IG51bGwsXG4gICAgICAgICAgdmFsdWU6IG51bGwsXG4gICAgICAgICAgaXNTdGF0aWM6IGlzU3RhdGljIHx8IGZhbHNlLFxuICAgICAgICAgIGRlY29yYXRvcnM6IGRlY29yYXRvcnMgfHwgW10sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYXR0YWNoaW5nIHRoZSBkZWNvcmF0b3JzIHRvIGEgcG90ZW50aWFsIGdldHRlci4gSW4gRVM1LCB3ZSBjYW4ndCB0ZWxsIHdoZXJlIHRoZVxuICAgICAgICAvLyBkZWNvcmF0b3JzIHdlcmUgb3JpZ2luYWxseSBhdHRhY2hlZCB0bywgaG93ZXZlciB3ZSBvbmx5IHdhbnQgdG8gYXR0YWNoIHRoZW0gdG8gYSBzaW5nbGVcbiAgICAgICAgLy8gYENsYXNzTWVtYmVyYCBhcyBvdGhlcndpc2Ugbmd0c2Mgd291bGQgaGFuZGxlIHRoZSBzYW1lIGRlY29yYXRvcnMgdHdpY2UuXG4gICAgICAgIGRlY29yYXRvcnMgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBpZiAocHJvcGVydHlEZWZpbml0aW9uLmdldHRlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHByb3BlcnR5RGVmaW5pdGlvbi5nZXR0ZXIsXG4gICAgICAgICAga2luZDogQ2xhc3NNZW1iZXJLaW5kLkdldHRlcixcbiAgICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgICAgIG5hbWU6IHN5bWJvbC5uYW1lLFxuICAgICAgICAgIG5hbWVOb2RlOiBudWxsLFxuICAgICAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgICAgIGlzU3RhdGljOiBpc1N0YXRpYyB8fCBmYWxzZSxcbiAgICAgICAgICBkZWNvcmF0b3JzOiBkZWNvcmF0b3JzIHx8IFtdLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZW1iZXJzO1xuICAgIH1cblxuICAgIGNvbnN0IG1lbWJlcnMgPSBzdXBlci5yZWZsZWN0TWVtYmVycyhzeW1ib2wsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICBtZW1iZXJzICYmIG1lbWJlcnMuZm9yRWFjaChtZW1iZXIgPT4ge1xuICAgICAgaWYgKG1lbWJlciAmJiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZCAmJiBtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLm5vZGUgJiZcbiAgICAgICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihtZW1iZXIubm9kZSkgJiYgbWVtYmVyLm5vZGUucGFyZW50ICYmXG4gICAgICAgICAgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG1lbWJlci5ub2RlLnBhcmVudCkgJiZcbiAgICAgICAgICB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihtZW1iZXIubm9kZS5wYXJlbnQucmlnaHQpKSB7XG4gICAgICAgIC8vIFJlY29tcHV0ZSB0aGUgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWVtYmVyOlxuICAgICAgICAvLyBFUzUgc3RhdGljIG1ldGhvZHMgYXJlIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBzbyB0aGUgZGVjbGFyYXRpb24gaXMgYWN0dWFsbHkgdGhlXG4gICAgICAgIC8vIGluaXRpYWxpemVyIG9mIHRoZSB2YXJpYWJsZSBhc3NpZ25tZW50XG4gICAgICAgIG1lbWJlci5pbXBsZW1lbnRhdGlvbiA9IG1lbWJlci5ub2RlLnBhcmVudC5yaWdodDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbWVtYmVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgdGhhdCBtYXkgY29udGFpbiBjYWxscyB0byBhIGhlbHBlci5cbiAgICpcbiAgICogSW4gRVNNNSBjb2RlIHRoZSBoZWxwZXIgY2FsbHMgYXJlIGhpZGRlbiBpbnNpZGUgdGhlIGNsYXNzJ3MgSUlGRS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBoZWxwZXIgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uIFdlIGV4cGVjdCB0aGlzIHN5bWJvbFxuICAgKiB0byByZWZlcmVuY2UgdGhlIGlubmVyIGlkZW50aWZpZXIgaW5zaWRlIHRoZSBJSUZFLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBzdGF0ZW1lbnRzIHRoYXQgbWF5IGNvbnRhaW4gaGVscGVyIGNhbGxzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbDogdHMuU3ltYm9sKTogdHMuU3RhdGVtZW50W10ge1xuICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSBjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIHJldHVybiB0cy5pc0Jsb2NrKGNsYXNzRGVjbGFyYXRpb24ucGFyZW50KSA/IEFycmF5LmZyb20oY2xhc3NEZWNsYXJhdGlvbi5wYXJlbnQuc3RhdGVtZW50cykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtdO1xuICB9XG59XG5cbi8vLy8vLy8vLy8vLy8gSW50ZXJuYWwgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgZGV0YWlscyBhYm91dCBwcm9wZXJ0eSBkZWZpbml0aW9ucyB0aGF0IHdlcmUgc2V0IHVzaW5nIGBPYmplY3QuZGVmaW5lUHJvcGVydHlgLlxuICovXG5pbnRlcmZhY2UgUHJvcGVydHlEZWZpbml0aW9uIHtcbiAgc2V0dGVyOiB0cy5GdW5jdGlvbkV4cHJlc3Npb258bnVsbDtcbiAgZ2V0dGVyOiB0cy5GdW5jdGlvbkV4cHJlc3Npb258bnVsbDtcbn1cblxuLyoqXG4gKiBJbiBFUzUsIGdldHRlcnMgYW5kIHNldHRlcnMgaGF2ZSBiZWVuIGRvd25sZXZlbGVkIGludG8gY2FsbCBleHByZXNzaW9ucyBvZlxuICogYE9iamVjdC5kZWZpbmVQcm9wZXJ0eWAsIHN1Y2ggYXNcbiAqXG4gKiBgYGBcbiAqIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDbGF6ei5wcm90b3R5cGUsIFwicHJvcGVydHlcIiwge1xuICogICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAqICAgICAgIHJldHVybiAndmFsdWUnO1xuICogICB9LFxuICogICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICogICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICogICB9LFxuICogICBlbnVtZXJhYmxlOiB0cnVlLFxuICogICBjb25maWd1cmFibGU6IHRydWVcbiAqIH0pO1xuICogYGBgXG4gKlxuICogVGhpcyBmdW5jdGlvbiBpbnNwZWN0cyB0aGUgZ2l2ZW4gbm9kZSB0byBkZXRlcm1pbmUgaWYgaXQgY29ycmVzcG9uZHMgd2l0aCBzdWNoIGEgY2FsbCwgYW5kIGlmIHNvXG4gKiBleHRyYWN0cyB0aGUgYHNldGAgYW5kIGBnZXRgIGZ1bmN0aW9uIGV4cHJlc3Npb25zIGZyb20gdGhlIGRlc2NyaXB0b3Igb2JqZWN0LCBpZiB0aGV5IGV4aXN0LlxuICpcbiAqIEBwYXJhbSBub2RlIFRoZSBub2RlIHRvIG9idGFpbiB0aGUgcHJvcGVydHkgZGVmaW5pdGlvbiBmcm9tLlxuICogQHJldHVybnMgVGhlIHByb3BlcnR5IGRlZmluaXRpb24gaWYgdGhlIG5vZGUgY29ycmVzcG9uZHMgd2l0aCBhY2Nlc3NvciwgbnVsbCBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGdldFByb3BlcnR5RGVmaW5pdGlvbihub2RlOiB0cy5Ob2RlKTogUHJvcGVydHlEZWZpbml0aW9ufG51bGwge1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGZuID0gbm9kZS5leHByZXNzaW9uO1xuICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGZuKSB8fCAhdHMuaXNJZGVudGlmaWVyKGZuLmV4cHJlc3Npb24pIHx8XG4gICAgICBmbi5leHByZXNzaW9uLnRleHQgIT09ICdPYmplY3QnIHx8IGZuLm5hbWUudGV4dCAhPT0gJ2RlZmluZVByb3BlcnR5JylcbiAgICByZXR1cm4gbnVsbDtcblxuICBjb25zdCBkZXNjcmlwdG9yID0gbm9kZS5hcmd1bWVudHNbMl07XG4gIGlmICghZGVzY3JpcHRvciB8fCAhdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihkZXNjcmlwdG9yKSkgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIHtcbiAgICBzZXR0ZXI6IHJlYWRQcm9wZXJ0eUZ1bmN0aW9uRXhwcmVzc2lvbihkZXNjcmlwdG9yLCAnc2V0JyksXG4gICAgZ2V0dGVyOiByZWFkUHJvcGVydHlGdW5jdGlvbkV4cHJlc3Npb24oZGVzY3JpcHRvciwgJ2dldCcpLFxuICB9O1xufVxuXG5mdW5jdGlvbiByZWFkUHJvcGVydHlGdW5jdGlvbkV4cHJlc3Npb24ob2JqZWN0OiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiwgbmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHByb3BlcnR5ID0gb2JqZWN0LnByb3BlcnRpZXMuZmluZChcbiAgICAgIChwKTogcCBpcyB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQgPT5cbiAgICAgICAgICB0cy5pc1Byb3BlcnR5QXNzaWdubWVudChwKSAmJiB0cy5pc0lkZW50aWZpZXIocC5uYW1lKSAmJiBwLm5hbWUudGV4dCA9PT0gbmFtZSk7XG5cbiAgcmV0dXJuIHByb3BlcnR5ICYmIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHByb3BlcnR5LmluaXRpYWxpemVyKSAmJiBwcm9wZXJ0eS5pbml0aWFsaXplciB8fCBudWxsO1xufVxuXG4vKipcbiAqIEdldCB0aGUgYWN0dWFsIChvdXRlcikgZGVjbGFyYXRpb24gb2YgYSBjbGFzcy5cbiAqXG4gKiBJbiBFUzUsIHRoZSBpbXBsZW1lbnRhdGlvbiBvZiBhIGNsYXNzIGlzIGEgZnVuY3Rpb24gZXhwcmVzc2lvbiB0aGF0IGlzIGhpZGRlbiBpbnNpZGUgYW4gSUlGRSBhbmRcbiAqIHJldHVybmVkIHRvIGJlIGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgb3V0c2lkZSB0aGUgSUlGRSwgd2hpY2ggaXMgd2hhdCB0aGUgcmVzdCBvZiB0aGUgcHJvZ3JhbVxuICogaW50ZXJhY3RzIHdpdGguXG4gKlxuICogR2l2ZW4gdGhlIGlubmVyIGZ1bmN0aW9uIGRlY2xhcmF0aW9uLCB3ZSB3YW50IHRvIGdldCB0byB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIG91dGVyIHZhcmlhYmxlXG4gKiB0aGF0IHJlcHJlc2VudHMgdGhlIGNsYXNzLlxuICpcbiAqIEBwYXJhbSBub2RlIGEgbm9kZSB0aGF0IGNvdWxkIGJlIHRoZSBmdW5jdGlvbiBleHByZXNzaW9uIGluc2lkZSBhbiBFUzUgY2xhc3MgSUlGRS5cbiAqIEByZXR1cm5zIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIuXG4gKi9cbmZ1bmN0aW9uIGdldENsYXNzRGVjbGFyYXRpb25Gcm9tSW5uZXJGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9ufFxuICAgIHVuZGVmaW5lZCB7XG4gIGlmICh0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAvLyBJdCBtaWdodCBiZSB0aGUgZnVuY3Rpb24gZXhwcmVzc2lvbiBpbnNpZGUgdGhlIElJRkUuIFdlIG5lZWQgdG8gZ28gNSBsZXZlbHMgdXAuLi5cblxuICAgIC8vIDEuIElJRkUgYm9keS5cbiAgICBsZXQgb3V0ZXJOb2RlID0gbm9kZS5wYXJlbnQ7XG4gICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzQmxvY2sob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIC8vIDIuIElJRkUgZnVuY3Rpb24gZXhwcmVzc2lvbi5cbiAgICBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgLy8gMy4gSUlGRSBjYWxsIGV4cHJlc3Npb24uXG4gICAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcbiAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNDYWxsRXhwcmVzc2lvbihvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgLy8gNC4gUGFyZW50aGVzaXMgYXJvdW5kIElJRkUuXG4gICAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcbiAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgLy8gNS4gT3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcbiAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG91dGVyTm9kZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICByZXR1cm4gb3V0ZXJOb2RlO1xuICB9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZ2V0SWlmZUJvZHkoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiB0cy5CbG9ja3x1bmRlZmluZWQge1xuICBpZiAoIWRlY2xhcmF0aW9uLmluaXRpYWxpemVyIHx8ICF0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyKSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY2FsbCA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICByZXR1cm4gdHMuaXNDYWxsRXhwcmVzc2lvbihjYWxsLmV4cHJlc3Npb24pICYmXG4gICAgICAgICAgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uLmV4cHJlc3Npb24pID9cbiAgICAgIGNhbGwuZXhwcmVzc2lvbi5leHByZXNzaW9uLmJvZHkgOlxuICAgICAgdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBnZXRSZXR1cm5JZGVudGlmaWVyKGJvZHk6IHRzLkJsb2NrKTogdHMuSWRlbnRpZmllcnx1bmRlZmluZWQge1xuICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBib2R5LnN0YXRlbWVudHMuZmluZCh0cy5pc1JldHVyblN0YXRlbWVudCk7XG4gIHJldHVybiByZXR1cm5TdGF0ZW1lbnQgJiYgcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24gJiZcbiAgICAgICAgICB0cy5pc0lkZW50aWZpZXIocmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24pID9cbiAgICAgIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uIDpcbiAgICAgIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZ2V0UmV0dXJuU3RhdGVtZW50KGRlY2xhcmF0aW9uOiB0cy5FeHByZXNzaW9uIHwgdW5kZWZpbmVkKTogdHMuUmV0dXJuU3RhdGVtZW50fHVuZGVmaW5lZCB7XG4gIHJldHVybiBkZWNsYXJhdGlvbiAmJiB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihkZWNsYXJhdGlvbikgP1xuICAgICAgZGVjbGFyYXRpb24uYm9keS5zdGF0ZW1lbnRzLmZpbmQodHMuaXNSZXR1cm5TdGF0ZW1lbnQpIDpcbiAgICAgIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gcmVmbGVjdEFycmF5RWxlbWVudChlbGVtZW50OiB0cy5FeHByZXNzaW9uKSB7XG4gIHJldHVybiB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGVsZW1lbnQpID8gcmVmbGVjdE9iamVjdExpdGVyYWwoZWxlbWVudCkgOiBudWxsO1xufVxuXG4vKipcbiAqIEEgY29uc3RydWN0b3IgZnVuY3Rpb24gbWF5IGhhdmUgYmVlbiBcInN5bnRoZXNpemVkXCIgYnkgVHlwZVNjcmlwdCBkdXJpbmcgSmF2YVNjcmlwdCBlbWl0LFxuICogaW4gdGhlIGNhc2Ugbm8gdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGV4aXN0cyBhbmQgZS5nLiBwcm9wZXJ0eSBpbml0aWFsaXplcnMgYXJlIHVzZWQuXG4gKiBUaG9zZSBpbml0aWFsaXplcnMgbmVlZCB0byBiZSBlbWl0dGVkIGludG8gYSBjb25zdHJ1Y3RvciBpbiBKYXZhU2NyaXB0LCBzbyB0aGUgVHlwZVNjcmlwdFxuICogY29tcGlsZXIgZ2VuZXJhdGVzIGEgc3ludGhldGljIGNvbnN0cnVjdG9yLlxuICpcbiAqIFdlIG5lZWQgdG8gaWRlbnRpZnkgc3VjaCBjb25zdHJ1Y3RvcnMgYXMgbmdjYyBuZWVkcyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgYSBjbGFzcyBkaWRcbiAqIG9yaWdpbmFsbHkgaGF2ZSBhIGNvbnN0cnVjdG9yIGluIHRoZSBUeXBlU2NyaXB0IHNvdXJjZS4gRm9yIEVTNSwgd2UgY2FuIG5vdCB0ZWxsIGFuXG4gKiBlbXB0eSBjb25zdHJ1Y3RvciBhcGFydCBmcm9tIGEgc3ludGhlc2l6ZWQgY29uc3RydWN0b3IsIGJ1dCBmb3J0dW5hdGVseSB0aGF0IGRvZXMgbm90XG4gKiBtYXR0ZXIgZm9yIHRoZSBjb2RlIGdlbmVyYXRlZCBieSBuZ3RzYy5cbiAqXG4gKiBXaGVuIGEgY2xhc3MgaGFzIGEgc3VwZXJjbGFzcyBob3dldmVyLCBhIHN5bnRoZXNpemVkIGNvbnN0cnVjdG9yIG11c3Qgbm90IGJlIGNvbnNpZGVyZWRcbiAqIGFzIGEgdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGFzIHRoYXQgcHJldmVudHMgYSBiYXNlIGZhY3RvcnkgY2FsbCBmcm9tIGJlaW5nIGNyZWF0ZWQgYnlcbiAqIG5ndHNjLCByZXN1bHRpbmcgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uIHRoYXQgZG9lcyBub3QgaW5qZWN0IHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlXG4gKiBzdXBlcmNsYXNzLiBIZW5jZSwgd2UgaWRlbnRpZnkgYSBkZWZhdWx0IHN5bnRoZXNpemVkIHN1cGVyIGNhbGwgaW4gdGhlIGNvbnN0cnVjdG9yIGJvZHksXG4gKiBhY2NvcmRpbmcgdG8gdGhlIHN0cnVjdHVyZSB0aGF0IFR5cGVTY3JpcHQncyBFUzIwMTUgdG8gRVM1IHRyYW5zZm9ybWVyIGdlbmVyYXRlcyBpblxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuMi4yL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvZXMyMDE1LnRzI0wxMDgyLUwxMDk4XG4gKlxuICogQHBhcmFtIGNvbnN0cnVjdG9yIGEgY29uc3RydWN0b3IgZnVuY3Rpb24gdG8gdGVzdFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgY29uc3RydWN0b3IgYXBwZWFycyB0byBoYXZlIGJlZW4gc3ludGhlc2l6ZWRcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZENvbnN0cnVjdG9yKGNvbnN0cnVjdG9yOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIGlmICghY29uc3RydWN0b3IuYm9keSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGZpcnN0U3RhdGVtZW50ID0gY29uc3RydWN0b3IuYm9keS5zdGF0ZW1lbnRzWzBdO1xuICBpZiAoIWZpcnN0U3RhdGVtZW50KSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGlzU3ludGhlc2l6ZWRTdXBlclRoaXNBc3NpZ25tZW50KGZpcnN0U3RhdGVtZW50KSB8fFxuICAgICAgaXNTeW50aGVzaXplZFN1cGVyUmV0dXJuU3RhdGVtZW50KGZpcnN0U3RhdGVtZW50KTtcbn1cblxuLyoqXG4gKiBJZGVudGlmaWVzIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBvZiB0aGUgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIHZhciBfdGhpcyA9IF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHN0YXRlbWVudCBhIHN0YXRlbWVudCB0aGF0IG1heSBiZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCBsb29rcyBsaWtlIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbFxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkU3VwZXJUaGlzQXNzaWdubWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IHZhcmlhYmxlRGVjbGFyYXRpb25zID0gc3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnM7XG4gIGlmICh2YXJpYWJsZURlY2xhcmF0aW9ucy5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCB2YXJpYWJsZURlY2xhcmF0aW9uID0gdmFyaWFibGVEZWNsYXJhdGlvbnNbMF07XG4gIGlmICghdHMuaXNJZGVudGlmaWVyKHZhcmlhYmxlRGVjbGFyYXRpb24ubmFtZSkgfHxcbiAgICAgICF2YXJpYWJsZURlY2xhcmF0aW9uLm5hbWUudGV4dC5zdGFydHNXaXRoKCdfdGhpcycpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBpbml0aWFsaXplciA9IHZhcmlhYmxlRGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gIGlmICghaW5pdGlhbGl6ZXIpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gaXNTeW50aGVzaXplZERlZmF1bHRTdXBlckNhbGwoaW5pdGlhbGl6ZXIpO1xufVxuLyoqXG4gKiBJZGVudGlmaWVzIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBvZiB0aGUgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIHJldHVybiBfc3VwZXIgIT09IG51bGwgJiYgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgdGhpcztcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzdGF0ZW1lbnQgYSBzdGF0ZW1lbnQgdGhhdCBtYXkgYmUgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBzdGF0ZW1lbnQgbG9va3MgbGlrZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZFN1cGVyUmV0dXJuU3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogYm9vbGVhbiB7XG4gIGlmICghdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGV4cHJlc3Npb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjtcbiAgaWYgKCFleHByZXNzaW9uKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGlzU3ludGhlc2l6ZWREZWZhdWx0U3VwZXJDYWxsKGV4cHJlc3Npb24pO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gaXMgb2YgdGhlIGZvcm06XG4gKlxuICogYGBgXG4gKiBfc3VwZXIgIT09IG51bGwgJiYgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgdGhpcztcbiAqIGBgYFxuICpcbiAqIFRoaXMgc3RydWN0dXJlIGlzIGdlbmVyYXRlZCBieSBUeXBlU2NyaXB0IHdoZW4gdHJhbnNmb3JtaW5nIEVTMjAxNSB0byBFUzUsIHNlZVxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuMi4yL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvZXMyMDE1LnRzI0wxMTQ4LUwxMTYzXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gYW4gZXhwcmVzc2lvbiB0aGF0IG1heSByZXByZXNlbnQgYSBkZWZhdWx0IHN1cGVyIGNhbGxcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gY29ycmVzcG9uZHMgd2l0aCB0aGUgYWJvdmUgZm9ybVxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkRGVmYXVsdFN1cGVyQ2FsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIGlmICghaXNCaW5hcnlFeHByKGV4cHJlc3Npb24sIHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW4pKSByZXR1cm4gZmFsc2U7XG4gIGlmIChleHByZXNzaW9uLnJpZ2h0LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBsZWZ0ID0gZXhwcmVzc2lvbi5sZWZ0O1xuICBpZiAoIWlzQmluYXJ5RXhwcihsZWZ0LCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuKSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N1cGVyTm90TnVsbChsZWZ0LmxlZnQpICYmIGlzU3VwZXJBcHBseUNhbGwobGVmdC5yaWdodCk7XG59XG5cbmZ1bmN0aW9uIGlzU3VwZXJOb3ROdWxsKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIGlzQmluYXJ5RXhwcihleHByZXNzaW9uLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzRXF1YWxzVG9rZW4pICYmXG4gICAgICBpc1N1cGVySWRlbnRpZmllcihleHByZXNzaW9uLmxlZnQpO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gaXMgb2YgdGhlIGZvcm1cbiAqXG4gKiBgYGBcbiAqIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiBhbiBleHByZXNzaW9uIHRoYXQgbWF5IHJlcHJlc2VudCBhIGRlZmF1bHQgc3VwZXIgY2FsbFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgZXhwcmVzc2lvbiBjb3JyZXNwb25kcyB3aXRoIHRoZSBhYm92ZSBmb3JtXG4gKi9cbmZ1bmN0aW9uIGlzU3VwZXJBcHBseUNhbGwoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikgfHwgZXhwcmVzc2lvbi5hcmd1bWVudHMubGVuZ3RoICE9PSAyKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgdGFyZ2V0Rm4gPSBleHByZXNzaW9uLmV4cHJlc3Npb247XG4gIGlmICghdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24odGFyZ2V0Rm4pKSByZXR1cm4gZmFsc2U7XG4gIGlmICghaXNTdXBlcklkZW50aWZpZXIodGFyZ2V0Rm4uZXhwcmVzc2lvbikpIHJldHVybiBmYWxzZTtcbiAgaWYgKHRhcmdldEZuLm5hbWUudGV4dCAhPT0gJ2FwcGx5JykgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IHRoaXNBcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuICBpZiAodGhpc0FyZ3VtZW50LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBhcmd1bWVudHNBcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzFdO1xuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKGFyZ3VtZW50c0FyZ3VtZW50KSAmJiBhcmd1bWVudHNBcmd1bWVudC50ZXh0ID09PSAnYXJndW1lbnRzJztcbn1cblxuZnVuY3Rpb24gaXNCaW5hcnlFeHByKFxuICAgIGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24sIG9wZXJhdG9yOiB0cy5CaW5hcnlPcGVyYXRvcik6IGV4cHJlc3Npb24gaXMgdHMuQmluYXJ5RXhwcmVzc2lvbiB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24oZXhwcmVzc2lvbikgJiYgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IG9wZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBpc1N1cGVySWRlbnRpZmllcihub2RlOiB0cy5Ob2RlKTogYm9vbGVhbiB7XG4gIC8vIFZlcmlmeSB0aGF0IHRoZSBpZGVudGlmaWVyIGlzIHByZWZpeGVkIHdpdGggYF9zdXBlcmAuIFdlIGRvbid0IHRlc3QgZm9yIGVxdWl2YWxlbmNlXG4gIC8vIGFzIFR5cGVTY3JpcHQgbWF5IGhhdmUgc3VmZml4ZWQgdGhlIG5hbWUsIGUuZy4gYF9zdXBlcl8xYCB0byBhdm9pZCBuYW1lIGNvbmZsaWN0cy5cbiAgLy8gUmVxdWlyaW5nIG9ubHkgYSBwcmVmaXggc2hvdWxkIGJlIHN1ZmZpY2llbnRseSBhY2N1cmF0ZS5cbiAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihub2RlKSAmJiBub2RlLnRleHQuc3RhcnRzV2l0aCgnX3N1cGVyJyk7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIHN0YXRlbWVudCB0byBleHRyYWN0IHRoZSBFU001IHBhcmFtZXRlciBpbml0aWFsaXplciBpZiB0aGVyZSBpcyBvbmUuXG4gKiBJZiBvbmUgaXMgZm91bmQsIGFkZCBpdCB0byB0aGUgYXBwcm9wcmlhdGUgcGFyYW1ldGVyIGluIHRoZSBgcGFyYW1ldGVyc2AgY29sbGVjdGlvbi5cbiAqXG4gKiBUaGUgZm9ybSB3ZSBhcmUgbG9va2luZyBmb3IgaXM6XG4gKlxuICogYGBgXG4gKiBpZiAoYXJnID09PSB2b2lkIDApIHsgYXJnID0gaW5pdGlhbGl6ZXI7IH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzdGF0ZW1lbnQgYSBzdGF0ZW1lbnQgdGhhdCBtYXkgYmUgaW5pdGlhbGl6aW5nIGFuIG9wdGlvbmFsIHBhcmFtZXRlclxuICogQHBhcmFtIHBhcmFtZXRlcnMgdGhlIGNvbGxlY3Rpb24gb2YgcGFyYW1ldGVycyB0aGF0IHdlcmUgZm91bmQgaW4gdGhlIGZ1bmN0aW9uIGRlZmluaXRpb25cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCB3YXMgYSBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXJcbiAqL1xuZnVuY3Rpb24gcmVmbGVjdFBhcmFtSW5pdGlhbGl6ZXIoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQsIHBhcmFtZXRlcnM6IFBhcmFtZXRlcltdKSB7XG4gIGlmICh0cy5pc0lmU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgaXNVbmRlZmluZWRDb21wYXJpc29uKHN0YXRlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNCbG9jayhzdGF0ZW1lbnQudGhlblN0YXRlbWVudCkgJiYgc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCBpZlN0YXRlbWVudENvbXBhcmlzb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjsgICAgICAgICAgIC8vIChhcmcgPT09IHZvaWQgMClcbiAgICBjb25zdCB0aGVuU3RhdGVtZW50ID0gc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50c1swXTsgIC8vIGFyZyA9IGluaXRpYWxpemVyO1xuICAgIGlmIChpc0Fzc2lnbm1lbnRTdGF0ZW1lbnQodGhlblN0YXRlbWVudCkpIHtcbiAgICAgIGNvbnN0IGNvbXBhcmlzb25OYW1lID0gaWZTdGF0ZW1lbnRDb21wYXJpc29uLmxlZnQudGV4dDtcbiAgICAgIGNvbnN0IGFzc2lnbm1lbnROYW1lID0gdGhlblN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQudGV4dDtcbiAgICAgIGlmIChjb21wYXJpc29uTmFtZSA9PT0gYXNzaWdubWVudE5hbWUpIHtcbiAgICAgICAgY29uc3QgcGFyYW1ldGVyID0gcGFyYW1ldGVycy5maW5kKHAgPT4gcC5uYW1lID09PSBjb21wYXJpc29uTmFtZSk7XG4gICAgICAgIGlmIChwYXJhbWV0ZXIpIHtcbiAgICAgICAgICBwYXJhbWV0ZXIuaW5pdGlhbGl6ZXIgPSB0aGVuU3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQ7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZENvbXBhcmlzb24oZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGV4cHJlc3Npb24gaXMgdHMuRXhwcmVzc2lvbiZcbiAgICB7bGVmdDogdHMuSWRlbnRpZmllciwgcmlnaHQ6IHRzLkV4cHJlc3Npb259IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihleHByZXNzaW9uKSAmJlxuICAgICAgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW4gJiZcbiAgICAgIHRzLmlzVm9pZEV4cHJlc3Npb24oZXhwcmVzc2lvbi5yaWdodCkgJiYgdHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24ubGVmdCk7XG59XG4iXX0=