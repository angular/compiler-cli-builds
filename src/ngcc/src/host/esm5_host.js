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
         * So we need to dig around inside to get hold of the "class" symbol.
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
            else if (ts.isFunctionDeclaration(node)) {
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
                return this.getClassSymbol(outerNode);
            }
            return undefined;
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
         * @param symbol the symbol for the member to reflect over.
         * @param decorators an array of decorators associated with the member.
         * @param isStatic true if this member is static, false if it is an instance property.
         * @returns the reflected member information, or null if the symbol is not a member.
         */
        Esm5ReflectionHost.prototype.reflectMember = function (symbol, decorators, isStatic) {
            var member = _super.prototype.reflectMember.call(this, symbol, decorators, isStatic);
            if (member && member.kind === reflection_1.ClassMemberKind.Method && member.isStatic && member.node &&
                ts.isPropertyAccessExpression(member.node) && member.node.parent &&
                ts.isBinaryExpression(member.node.parent) &&
                ts.isFunctionExpression(member.node.parent.right)) {
                // Recompute the implementation for this member:
                // ES5 static methods are variable declarations so the declaration is actually the
                // initializer of the variable assignment
                member.implementation = member.node.parent.right;
            }
            return member;
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
    ///////////// Internal Helpers /////////////
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMseUVBQXVJO0lBQ3ZJLGtFQUFxQztJQUVyQyxxRkFBbUg7SUFHbkg7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSDtRQUF3Qyw4Q0FBcUI7UUFDM0QsNEJBQVksTUFBZSxFQUFFLE9BQXVCO21CQUFJLGtCQUFNLE1BQU0sRUFBRSxPQUFPLENBQUM7UUFBRSxDQUFDO1FBRWpGOztXQUVHO1FBQ0gsb0NBQU8sR0FBUCxVQUFRLElBQWE7WUFDbkIsT0FBTyxpQkFBTSxPQUFPLFlBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUQsQ0FBQztRQUVEOzs7O1dBSUc7UUFDSCx5Q0FBWSxHQUFaLFVBQWEsSUFBb0I7WUFDL0IsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5QyxJQUFJLENBQUMsV0FBVztnQkFBRSxPQUFPLEtBQUssQ0FBQztZQUUvQixJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDO1lBQ3JELElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztnQkFBRSxPQUFPLEtBQUssQ0FBQztZQUVyRCxJQUFNLElBQUksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQzdCLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1lBRTFE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SUFBSSxnQkFBYyxLQUFLLGNBQWMsRUFBRTtvQkFDckMsSUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxJQUFJLEtBQUssZ0JBQWMsRUFBekIsQ0FBeUIsQ0FBQyxDQUFDO29CQUNsRSxJQUFJLFNBQVMsRUFBRTt3QkFDYixTQUFTLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO3dCQUN2RCxPQUFPLElBQUksQ0FBQztxQkFDYjtpQkFDRjthQUNGO1NBQ0Y7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxTQUFTLHFCQUFxQixDQUFDLFVBQXlCO1FBRXRELE9BQU8sRUFBRSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQztZQUNwQyxVQUFVLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QjtZQUN2RSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIERlY29yYXRvciwgRnVuY3Rpb25EZWZpbml0aW9uLCBQYXJhbWV0ZXIsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7Z2V0TmFtZVRleHR9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtFc20yMDE1UmVmbGVjdGlvbkhvc3QsIFBhcmFtSW5mbywgZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wsIGlzQXNzaWdubWVudFN0YXRlbWVudH0gZnJvbSAnLi9lc20yMDE1X2hvc3QnO1xuXG5cbi8qKlxuICogRVNNNSBwYWNrYWdlcyBjb250YWluIEVDTUFTY3JpcHQgSUlGRSBmdW5jdGlvbnMgdGhhdCBhY3QgbGlrZSBjbGFzc2VzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIHZhciBDb21tb25Nb2R1bGUgPSAoZnVuY3Rpb24gKCkge1xuICogIGZ1bmN0aW9uIENvbW1vbk1vZHVsZSgpIHtcbiAqICB9XG4gKiAgQ29tbW9uTW9kdWxlLmRlY29yYXRvcnMgPSBbIC4uLiBdO1xuICogYGBgXG4gKlxuICogKiBcIkNsYXNzZXNcIiBhcmUgZGVjb3JhdGVkIGlmIHRoZXkgaGF2ZSBhIHN0YXRpYyBwcm9wZXJ0eSBjYWxsZWQgYGRlY29yYXRvcnNgLlxuICogKiBNZW1iZXJzIGFyZSBkZWNvcmF0ZWQgaWYgdGhlcmUgaXMgYSBtYXRjaGluZyBrZXkgb24gYSBzdGF0aWMgcHJvcGVydHlcbiAqICAgY2FsbGVkIGBwcm9wRGVjb3JhdG9yc2AuXG4gKiAqIENvbnN0cnVjdG9yIHBhcmFtZXRlcnMgZGVjb3JhdG9ycyBhcmUgZm91bmQgb24gYW4gb2JqZWN0IHJldHVybmVkIGZyb21cbiAqICAgYSBzdGF0aWMgbWV0aG9kIGNhbGxlZCBgY3RvclBhcmFtZXRlcnNgLlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIEVzbTVSZWZsZWN0aW9uSG9zdCBleHRlbmRzIEVzbTIwMTVSZWZsZWN0aW9uSG9zdCB7XG4gIGNvbnN0cnVjdG9yKGlzQ29yZTogYm9vbGVhbiwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpIHsgc3VwZXIoaXNDb3JlLCBjaGVja2VyKTsgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiBub2RlIGFjdHVhbGx5IHJlcHJlc2VudHMgYSBjbGFzcy5cbiAgICovXG4gIGlzQ2xhc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuTmFtZWREZWNsYXJhdGlvbiB7XG4gICAgcmV0dXJuIHN1cGVyLmlzQ2xhc3Mobm9kZSkgfHwgISF0aGlzLmdldENsYXNzU3ltYm9sKG5vZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hldGhlciB0aGUgZ2l2ZW4gZGVjbGFyYXRpb24gaGFzIGEgYmFzZSBjbGFzcy5cbiAgICpcbiAgICogSW4gRVM1LCB3ZSBuZWVkIHRvIGRldGVybWluZSBpZiB0aGUgSUlGRSB3cmFwcGVyIHRha2VzIGEgYF9zdXBlcmAgcGFyYW1ldGVyIC5cbiAgICovXG4gIGhhc0Jhc2VDbGFzcyhub2RlOiB0cy5EZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChub2RlKTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBpaWZlQm9keSA9IGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24ucGFyZW50O1xuICAgIGlmICghaWlmZUJvZHkgfHwgIXRzLmlzQmxvY2soaWlmZUJvZHkpKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBpaWZlID0gaWlmZUJvZHkucGFyZW50O1xuICAgIGlmICghaWlmZSB8fCAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oaWlmZSkpIHJldHVybiBmYWxzZTtcblxuICAgIHJldHVybiBpaWZlLnBhcmFtZXRlcnMubGVuZ3RoID09PSAxICYmIGlzU3VwZXJJZGVudGlmaWVyKGlpZmUucGFyYW1ldGVyc1swXS5uYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIGEgc3ltYm9sIGZvciBhIG5vZGUgdGhhdCB3ZSB0aGluayBpcyBhIGNsYXNzLlxuICAgKlxuICAgKiBJbiBFUzUsIHRoZSBpbXBsZW1lbnRhdGlvbiBvZiBhIGNsYXNzIGlzIGEgZnVuY3Rpb24gZXhwcmVzc2lvbiB0aGF0IGlzIGhpZGRlbiBpbnNpZGUgYW4gSUlGRS5cbiAgICogU28gd2UgbmVlZCB0byBkaWcgYXJvdW5kIGluc2lkZSB0byBnZXQgaG9sZCBvZiB0aGUgXCJjbGFzc1wiIHN5bWJvbC5cbiAgICpcbiAgICogYG5vZGVgIG1pZ2h0IGJlIG9uZSBvZjpcbiAgICogLSBBIGNsYXNzIGRlY2xhcmF0aW9uIChmcm9tIGEgZGVjbGFyYXRpb24gZmlsZSkuXG4gICAqIC0gVGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBvdXRlciB2YXJpYWJsZSwgd2hpY2ggaXMgYXNzaWduZWQgdGhlIHJlc3VsdCBvZiB0aGUgSUlGRS5cbiAgICogLSBUaGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gaW5zaWRlIHRoZSBJSUZFLCB3aGljaCBpcyBldmVudHVhbGx5IHJldHVybmVkIGFuZCBhc3NpZ25lZCB0byB0aGVcbiAgICogICBvdXRlciB2YXJpYWJsZS5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgdGhlIHRvcCBsZXZlbCBkZWNsYXJhdGlvbiB0aGF0IHJlcHJlc2VudHMgYW4gZXhwb3J0ZWQgY2xhc3Mgb3IgdGhlIGZ1bmN0aW9uXG4gICAqICAgICBleHByZXNzaW9uIGluc2lkZSB0aGUgSUlGRS5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiIG9yIGhhcyBubyBzeW1ib2wuXG4gICAqL1xuICBnZXRDbGFzc1N5bWJvbChub2RlOiB0cy5Ob2RlKTogdHMuU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3ltYm9sID0gc3VwZXIuZ2V0Q2xhc3NTeW1ib2wobm9kZSk7XG4gICAgaWYgKHN5bWJvbCkgcmV0dXJuIHN5bWJvbDtcblxuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGNvbnN0IGlpZmVCb2R5ID0gZ2V0SWlmZUJvZHkobm9kZSk7XG4gICAgICBpZiAoIWlpZmVCb2R5KSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgICBjb25zdCBpbm5lckNsYXNzSWRlbnRpZmllciA9IGdldFJldHVybklkZW50aWZpZXIoaWlmZUJvZHkpO1xuICAgICAgaWYgKCFpbm5lckNsYXNzSWRlbnRpZmllcikgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgcmV0dXJuIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlubmVyQ2xhc3NJZGVudGlmaWVyKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgLy8gSXQgbWlnaHQgYmUgdGhlIGZ1bmN0aW9uIGV4cHJlc3Npb24gaW5zaWRlIHRoZSBJSUZFLiBXZSBuZWVkIHRvIGdvIDUgbGV2ZWxzIHVwLi4uXG5cbiAgICAgIC8vIDEuIElJRkUgYm9keS5cbiAgICAgIGxldCBvdXRlck5vZGUgPSBub2RlLnBhcmVudDtcbiAgICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc0Jsb2NrKG91dGVyTm9kZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgIC8vIDIuIElJRkUgZnVuY3Rpb24gZXhwcmVzc2lvbi5cbiAgICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24ob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgLy8gMy4gSUlGRSBjYWxsIGV4cHJlc3Npb24uXG4gICAgICBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuICAgICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzQ2FsbEV4cHJlc3Npb24ob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgLy8gNC4gUGFyZW50aGVzaXMgYXJvdW5kIElJRkUuXG4gICAgICBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuICAgICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24ob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgLy8gNS4gT3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAgICBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuICAgICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgICByZXR1cm4gdGhpcy5nZXRDbGFzc1N5bWJvbChvdXRlck5vZGUpO1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgYSBmdW5jdGlvbiBkZWNsYXJhdGlvbiB0byBmaW5kIHRoZSByZWxldmFudCBtZXRhZGF0YSBhYm91dCBpdC5cbiAgICpcbiAgICogSW4gRVNNNSB3ZSBuZWVkIHRvIGRvIHNwZWNpYWwgd29yayB3aXRoIG9wdGlvbmFsIGFyZ3VtZW50cyB0byB0aGUgZnVuY3Rpb24sIHNpbmNlIHRoZXkgZ2V0XG4gICAqIHRoZWlyIG93biBpbml0aWFsaXplciBzdGF0ZW1lbnQgdGhhdCBuZWVkcyB0byBiZSBwYXJzZWQgYW5kIHRoZW4gbm90IGluY2x1ZGVkIGluIHRoZSBcImJvZHlcIlxuICAgKiBzdGF0ZW1lbnRzIG9mIHRoZSBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgdGhlIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIHRvIHBhcnNlLlxuICAgKiBAcmV0dXJucyBhbiBvYmplY3QgY29udGFpbmluZyB0aGUgbm9kZSwgc3RhdGVtZW50cyBhbmQgcGFyYW1ldGVycyBvZiB0aGUgZnVuY3Rpb24uXG4gICAqL1xuICBnZXREZWZpbml0aW9uT2ZGdW5jdGlvbjxUIGV4dGVuZHMgdHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuRnVuY3Rpb25FeHByZXNzaW9uPihub2RlOiBUKTogRnVuY3Rpb25EZWZpbml0aW9uPFQ+IHtcbiAgICBjb25zdCBwYXJhbWV0ZXJzID1cbiAgICAgICAgbm9kZS5wYXJhbWV0ZXJzLm1hcChwID0+ICh7bmFtZTogZ2V0TmFtZVRleHQocC5uYW1lKSwgbm9kZTogcCwgaW5pdGlhbGl6ZXI6IG51bGx9KSk7XG4gICAgbGV0IGxvb2tpbmdGb3JQYXJhbUluaXRpYWxpemVycyA9IHRydWU7XG5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gbm9kZS5ib2R5ICYmIG5vZGUuYm9keS5zdGF0ZW1lbnRzLmZpbHRlcihzID0+IHtcbiAgICAgIGxvb2tpbmdGb3JQYXJhbUluaXRpYWxpemVycyA9XG4gICAgICAgICAgbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzICYmIHJlZmxlY3RQYXJhbUluaXRpYWxpemVyKHMsIHBhcmFtZXRlcnMpO1xuICAgICAgLy8gSWYgd2UgYXJlIG5vIGxvbmdlciBsb29raW5nIGZvciBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXJzIHRoZW4gd2UgaW5jbHVkZSB0aGlzIHN0YXRlbWVudFxuICAgICAgcmV0dXJuICFsb29raW5nRm9yUGFyYW1Jbml0aWFsaXplcnM7XG4gICAgfSk7XG5cbiAgICByZXR1cm4ge25vZGUsIGJvZHk6IHN0YXRlbWVudHMgfHwgbnVsbCwgcGFyYW1ldGVyc307XG4gIH1cblxuXG4gIC8vLy8vLy8vLy8vLy8gUHJvdGVjdGVkIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbnMgb2YgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBjbGFzcyBpZGVudGlmaWVkIGJ5IGl0cyBzeW1ib2wuXG4gICAqXG4gICAqIEluIEVTTTUgdGhlcmUgaXMgbm8gXCJjbGFzc1wiIHNvIHRoZSBjb25zdHJ1Y3RvciB0aGF0IHdlIHdhbnQgaXMgYWN0dWFsbHkgdGhlIGRlY2xhcmF0aW9uXG4gICAqIGZ1bmN0aW9uIGl0c2VsZi5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwYXJhbWV0ZXJzIHdlIHdhbnQgdG8gZmluZC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uYCBvYmplY3RzIHJlcHJlc2VudGluZyBlYWNoIG9mIHRoZSBwYXJhbWV0ZXJzIGluXG4gICAqIHRoZSBjbGFzcydzIGNvbnN0cnVjdG9yIG9yIG51bGwgaWYgdGhlcmUgaXMgbm8gY29uc3RydWN0b3IuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCk6XG4gICAgICB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdfG51bGwge1xuICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gY2xhc3NTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiBhcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAgIGlmIChjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpO1xuICAgIH1cbiAgICBpZiAoaXNTeW50aGVzaXplZENvbnN0cnVjdG9yKGNvbnN0cnVjdG9yKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyxcbiAgICogd2hlcmUgdGhlIGluZm9ybWF0aW9uIGlzIHN0b3JlZCBvbiBhIHN0YXRpYyBtZXRob2Qgb2YgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBJbiB0aGlzIGNhc2UgdGhlIGRlY29yYXRvcnMgYXJlIHN0b3JlZCBpbiB0aGUgYm9keSBvZiBhIG1ldGhvZFxuICAgKiAoYGN0b3JQYXJhdGVtZXJzYCkgYXR0YWNoZWQgdG8gdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdW5saWtlIEVTTTIwMTUgdGhpcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gcmF0aGVyIHRoYW4gYW4gYXJyb3dcbiAgICogZnVuY3Rpb246XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gZnVuY3Rpb24oKSB7IHJldHVybiBbXG4gICAqICAgeyB0eXBlOiBWaWV3Q29udGFpbmVyUmVmLCB9LFxuICAgKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gICAqICAgeyB0eXBlOiBJdGVyYWJsZURpZmZlcnMsIH0sXG4gICAqICAgeyB0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7IHR5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOLF0gfSxdIH0sXG4gICAqIF07IH07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1EZWNvcmF0b3JzUHJvcGVydHkgdGhlIHByb3BlcnR5IHRoYXQgaG9sZHMgdGhlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgdGhlIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIGVhY2ggcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFBhcmFtSW5mb0Zyb21TdGF0aWNQcm9wZXJ0eShwYXJhbURlY29yYXRvcnNQcm9wZXJ0eTogdHMuU3ltYm9sKTogUGFyYW1JbmZvW118bnVsbCB7XG4gICAgY29uc3QgcGFyYW1EZWNvcmF0b3JzID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIGNvbnN0IHJldHVyblN0YXRlbWVudCA9IGdldFJldHVyblN0YXRlbWVudChwYXJhbURlY29yYXRvcnMpO1xuICAgIGNvbnN0IGV4cHJlc3Npb24gPSByZXR1cm5TdGF0ZW1lbnQgJiYgcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb247XG4gICAgaWYgKGV4cHJlc3Npb24gJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGV4cHJlc3Npb24pKSB7XG4gICAgICBjb25zdCBlbGVtZW50cyA9IGV4cHJlc3Npb24uZWxlbWVudHM7XG4gICAgICByZXR1cm4gZWxlbWVudHMubWFwKHJlZmxlY3RBcnJheUVsZW1lbnQpLm1hcChwYXJhbUluZm8gPT4ge1xuICAgICAgICBjb25zdCB0eXBlRXhwcmVzc2lvbiA9IHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uZ2V0KCd0eXBlJykgfHwgbnVsbDtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ySW5mbyA9IHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uZ2V0KCdkZWNvcmF0b3JzJykgfHwgbnVsbDtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvckluZm8gJiYgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JJbmZvKTtcbiAgICAgICAgcmV0dXJuIHt0eXBlRXhwcmVzc2lvbiwgZGVjb3JhdG9yc307XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIGEgc3ltYm9sIGFuZCBleHRyYWN0IHRoZSBtZW1iZXIgaW5mb3JtYXRpb24sIGNvbWJpbmluZyBpdCB3aXRoIHRoZVxuICAgKiBwcm92aWRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24sIGFuZCB3aGV0aGVyIGl0IGlzIGEgc3RhdGljIG1lbWJlci5cbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgc3ltYm9sIGZvciB0aGUgbWVtYmVyIHRvIHJlZmxlY3Qgb3Zlci5cbiAgICogQHBhcmFtIGRlY29yYXRvcnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBhc3NvY2lhdGVkIHdpdGggdGhlIG1lbWJlci5cbiAgICogQHBhcmFtIGlzU3RhdGljIHRydWUgaWYgdGhpcyBtZW1iZXIgaXMgc3RhdGljLCBmYWxzZSBpZiBpdCBpcyBhbiBpbnN0YW5jZSBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHJlZmxlY3RlZCBtZW1iZXIgaW5mb3JtYXRpb24sIG9yIG51bGwgaWYgdGhlIHN5bWJvbCBpcyBub3QgYSBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdE1lbWJlcihzeW1ib2w6IHRzLlN5bWJvbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLCBpc1N0YXRpYz86IGJvb2xlYW4pOlxuICAgICAgQ2xhc3NNZW1iZXJ8bnVsbCB7XG4gICAgY29uc3QgbWVtYmVyID0gc3VwZXIucmVmbGVjdE1lbWJlcihzeW1ib2wsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICBpZiAobWVtYmVyICYmIG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuTWV0aG9kICYmIG1lbWJlci5pc1N0YXRpYyAmJiBtZW1iZXIubm9kZSAmJlxuICAgICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihtZW1iZXIubm9kZSkgJiYgbWVtYmVyLm5vZGUucGFyZW50ICYmXG4gICAgICAgIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihtZW1iZXIubm9kZS5wYXJlbnQpICYmXG4gICAgICAgIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKG1lbWJlci5ub2RlLnBhcmVudC5yaWdodCkpIHtcbiAgICAgIC8vIFJlY29tcHV0ZSB0aGUgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWVtYmVyOlxuICAgICAgLy8gRVM1IHN0YXRpYyBtZXRob2RzIGFyZSB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgc28gdGhlIGRlY2xhcmF0aW9uIGlzIGFjdHVhbGx5IHRoZVxuICAgICAgLy8gaW5pdGlhbGl6ZXIgb2YgdGhlIHZhcmlhYmxlIGFzc2lnbm1lbnRcbiAgICAgIG1lbWJlci5pbXBsZW1lbnRhdGlvbiA9IG1lbWJlci5ub2RlLnBhcmVudC5yaWdodDtcbiAgICB9XG4gICAgcmV0dXJuIG1lbWJlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgdGhhdCBtYXkgY29udGFpbiBjYWxscyB0byBhIGhlbHBlci5cbiAgICpcbiAgICogSW4gRVNNNSBjb2RlIHRoZSBoZWxwZXIgY2FsbHMgYXJlIGhpZGRlbiBpbnNpZGUgdGhlIGNsYXNzJ3MgSUlGRS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBoZWxwZXIgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uIFdlIGV4cGVjdCB0aGlzIHN5bWJvbFxuICAgKiB0byByZWZlcmVuY2UgdGhlIGlubmVyIGlkZW50aWZpZXIgaW5zaWRlIHRoZSBJSUZFLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBzdGF0ZW1lbnRzIHRoYXQgbWF5IGNvbnRhaW4gaGVscGVyIGNhbGxzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbDogdHMuU3ltYm9sKTogdHMuU3RhdGVtZW50W10ge1xuICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSBjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIHJldHVybiB0cy5pc0Jsb2NrKGNsYXNzRGVjbGFyYXRpb24ucGFyZW50KSA/IEFycmF5LmZyb20oY2xhc3NEZWNsYXJhdGlvbi5wYXJlbnQuc3RhdGVtZW50cykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtdO1xuICB9XG59XG5cbi8vLy8vLy8vLy8vLy8gSW50ZXJuYWwgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbmZ1bmN0aW9uIGdldElpZmVCb2R5KGRlY2xhcmF0aW9uOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogdHMuQmxvY2t8dW5kZWZpbmVkIHtcbiAgaWYgKCFkZWNsYXJhdGlvbi5pbml0aWFsaXplciB8fCAhdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihkZWNsYXJhdGlvbi5pbml0aWFsaXplcikpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGNhbGwgPSBkZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgcmV0dXJuIHRzLmlzQ2FsbEV4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uKSAmJlxuICAgICAgICAgIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGNhbGwuZXhwcmVzc2lvbi5leHByZXNzaW9uKSA/XG4gICAgICBjYWxsLmV4cHJlc3Npb24uZXhwcmVzc2lvbi5ib2R5IDpcbiAgICAgIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZ2V0UmV0dXJuSWRlbnRpZmllcihib2R5OiB0cy5CbG9jayk6IHRzLklkZW50aWZpZXJ8dW5kZWZpbmVkIHtcbiAgY29uc3QgcmV0dXJuU3RhdGVtZW50ID0gYm9keS5zdGF0ZW1lbnRzLmZpbmQodHMuaXNSZXR1cm5TdGF0ZW1lbnQpO1xuICByZXR1cm4gcmV0dXJuU3RhdGVtZW50ICYmIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uICYmXG4gICAgICAgICAgdHMuaXNJZGVudGlmaWVyKHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uKSA/XG4gICAgICByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbiA6XG4gICAgICB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGdldFJldHVyblN0YXRlbWVudChkZWNsYXJhdGlvbjogdHMuRXhwcmVzc2lvbiB8IHVuZGVmaW5lZCk6IHRzLlJldHVyblN0YXRlbWVudHx1bmRlZmluZWQge1xuICByZXR1cm4gZGVjbGFyYXRpb24gJiYgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZGVjbGFyYXRpb24pID9cbiAgICAgIGRlY2xhcmF0aW9uLmJvZHkuc3RhdGVtZW50cy5maW5kKHRzLmlzUmV0dXJuU3RhdGVtZW50KSA6XG4gICAgICB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIHJlZmxlY3RBcnJheUVsZW1lbnQoZWxlbWVudDogdHMuRXhwcmVzc2lvbikge1xuICByZXR1cm4gdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbDtcbn1cblxuLyoqXG4gKiBBIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG1heSBoYXZlIGJlZW4gXCJzeW50aGVzaXplZFwiIGJ5IFR5cGVTY3JpcHQgZHVyaW5nIEphdmFTY3JpcHQgZW1pdCxcbiAqIGluIHRoZSBjYXNlIG5vIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGUuZy4gcHJvcGVydHkgaW5pdGlhbGl6ZXJzIGFyZSB1c2VkLlxuICogVGhvc2UgaW5pdGlhbGl6ZXJzIG5lZWQgdG8gYmUgZW1pdHRlZCBpbnRvIGEgY29uc3RydWN0b3IgaW4gSmF2YVNjcmlwdCwgc28gdGhlIFR5cGVTY3JpcHRcbiAqIGNvbXBpbGVyIGdlbmVyYXRlcyBhIHN5bnRoZXRpYyBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBXZSBuZWVkIHRvIGlkZW50aWZ5IHN1Y2ggY29uc3RydWN0b3JzIGFzIG5nY2MgbmVlZHMgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIGEgY2xhc3MgZGlkXG4gKiBvcmlnaW5hbGx5IGhhdmUgYSBjb25zdHJ1Y3RvciBpbiB0aGUgVHlwZVNjcmlwdCBzb3VyY2UuIEZvciBFUzUsIHdlIGNhbiBub3QgdGVsbCBhblxuICogZW1wdHkgY29uc3RydWN0b3IgYXBhcnQgZnJvbSBhIHN5bnRoZXNpemVkIGNvbnN0cnVjdG9yLCBidXQgZm9ydHVuYXRlbHkgdGhhdCBkb2VzIG5vdFxuICogbWF0dGVyIGZvciB0aGUgY29kZSBnZW5lcmF0ZWQgYnkgbmd0c2MuXG4gKlxuICogV2hlbiBhIGNsYXNzIGhhcyBhIHN1cGVyY2xhc3MgaG93ZXZlciwgYSBzeW50aGVzaXplZCBjb25zdHJ1Y3RvciBtdXN0IG5vdCBiZSBjb25zaWRlcmVkXG4gKiBhcyBhIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBhcyB0aGF0IHByZXZlbnRzIGEgYmFzZSBmYWN0b3J5IGNhbGwgZnJvbSBiZWluZyBjcmVhdGVkIGJ5XG4gKiBuZ3RzYywgcmVzdWx0aW5nIGluIGEgZmFjdG9yeSBmdW5jdGlvbiB0aGF0IGRvZXMgbm90IGluamVjdCB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZVxuICogc3VwZXJjbGFzcy4gSGVuY2UsIHdlIGlkZW50aWZ5IGEgZGVmYXVsdCBzeW50aGVzaXplZCBzdXBlciBjYWxsIGluIHRoZSBjb25zdHJ1Y3RvciBib2R5LFxuICogYWNjb3JkaW5nIHRvIHRoZSBzdHJ1Y3R1cmUgdGhhdCBUeXBlU2NyaXB0J3MgRVMyMDE1IHRvIEVTNSB0cmFuc2Zvcm1lciBnZW5lcmF0ZXMgaW5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL3YzLjIuMi9zcmMvY29tcGlsZXIvdHJhbnNmb3JtZXJzL2VzMjAxNS50cyNMMTA4Mi1MMTA5OFxuICpcbiAqIEBwYXJhbSBjb25zdHJ1Y3RvciBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIHRlc3RcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGNvbnN0cnVjdG9yIGFwcGVhcnMgdG8gaGF2ZSBiZWVuIHN5bnRoZXNpemVkXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcjogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICBpZiAoIWNvbnN0cnVjdG9yLmJvZHkpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBmaXJzdFN0YXRlbWVudCA9IGNvbnN0cnVjdG9yLmJvZHkuc3RhdGVtZW50c1swXTtcbiAgaWYgKCFmaXJzdFN0YXRlbWVudCkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N5bnRoZXNpemVkU3VwZXJUaGlzQXNzaWdubWVudChmaXJzdFN0YXRlbWVudCkgfHxcbiAgICAgIGlzU3ludGhlc2l6ZWRTdXBlclJldHVyblN0YXRlbWVudChmaXJzdFN0YXRlbWVudCk7XG59XG5cbi8qKlxuICogSWRlbnRpZmllcyBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGwgb2YgdGhlIGZvcm06XG4gKlxuICogYGBgXG4gKiB2YXIgX3RoaXMgPSBfc3VwZXIgIT09IG51bGwgJiYgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgdGhpcztcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzdGF0ZW1lbnQgYSBzdGF0ZW1lbnQgdGhhdCBtYXkgYmUgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBzdGF0ZW1lbnQgbG9va3MgbGlrZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZFN1cGVyVGhpc0Fzc2lnbm1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBib29sZWFuIHtcbiAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCB2YXJpYWJsZURlY2xhcmF0aW9ucyA9IHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zO1xuICBpZiAodmFyaWFibGVEZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgdmFyaWFibGVEZWNsYXJhdGlvbiA9IHZhcmlhYmxlRGVjbGFyYXRpb25zWzBdO1xuICBpZiAoIXRzLmlzSWRlbnRpZmllcih2YXJpYWJsZURlY2xhcmF0aW9uLm5hbWUpIHx8XG4gICAgICAhdmFyaWFibGVEZWNsYXJhdGlvbi5uYW1lLnRleHQuc3RhcnRzV2l0aCgnX3RoaXMnKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgaW5pdGlhbGl6ZXIgPSB2YXJpYWJsZURlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICBpZiAoIWluaXRpYWxpemVyKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGlzU3ludGhlc2l6ZWREZWZhdWx0U3VwZXJDYWxsKGluaXRpYWxpemVyKTtcbn1cbi8qKlxuICogSWRlbnRpZmllcyBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGwgb2YgdGhlIGZvcm06XG4gKlxuICogYGBgXG4gKiByZXR1cm4gX3N1cGVyICE9PSBudWxsICYmIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IHRoaXM7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3RhdGVtZW50IGEgc3RhdGVtZW50IHRoYXQgbWF5IGJlIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgc3RhdGVtZW50IGxvb2tzIGxpa2UgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRTdXBlclJldHVyblN0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzUmV0dXJuU3RhdGVtZW50KHN0YXRlbWVudCkpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBleHByZXNzaW9uID0gc3RhdGVtZW50LmV4cHJlc3Npb247XG4gIGlmICghZXhwcmVzc2lvbikgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N5bnRoZXNpemVkRGVmYXVsdFN1cGVyQ2FsbChleHByZXNzaW9uKTtcbn1cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHRoZSBleHByZXNzaW9uIGlzIG9mIHRoZSBmb3JtOlxuICpcbiAqIGBgYFxuICogX3N1cGVyICE9PSBudWxsICYmIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IHRoaXM7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIHN0cnVjdHVyZSBpcyBnZW5lcmF0ZWQgYnkgVHlwZVNjcmlwdCB3aGVuIHRyYW5zZm9ybWluZyBFUzIwMTUgdG8gRVM1LCBzZWVcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL3YzLjIuMi9zcmMvY29tcGlsZXIvdHJhbnNmb3JtZXJzL2VzMjAxNS50cyNMMTE0OC1MMTE2M1xuICpcbiAqIEBwYXJhbSBleHByZXNzaW9uIGFuIGV4cHJlc3Npb24gdGhhdCBtYXkgcmVwcmVzZW50IGEgZGVmYXVsdCBzdXBlciBjYWxsXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBleHByZXNzaW9uIGNvcnJlc3BvbmRzIHdpdGggdGhlIGFib3ZlIGZvcm1cbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZERlZmF1bHRTdXBlckNhbGwoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICBpZiAoIWlzQmluYXJ5RXhwcihleHByZXNzaW9uLCB0cy5TeW50YXhLaW5kLkJhckJhclRva2VuKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZXhwcmVzc2lvbi5yaWdodC5raW5kICE9PSB0cy5TeW50YXhLaW5kLlRoaXNLZXl3b3JkKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgbGVmdCA9IGV4cHJlc3Npb24ubGVmdDtcbiAgaWYgKCFpc0JpbmFyeUV4cHIobGVmdCwgdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbikpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gaXNTdXBlck5vdE51bGwobGVmdC5sZWZ0KSAmJiBpc1N1cGVyQXBwbHlDYWxsKGxlZnQucmlnaHQpO1xufVxuXG5mdW5jdGlvbiBpc1N1cGVyTm90TnVsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIHJldHVybiBpc0JpbmFyeUV4cHIoZXhwcmVzc2lvbiwgdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc0VxdWFsc1Rva2VuKSAmJlxuICAgICAgaXNTdXBlcklkZW50aWZpZXIoZXhwcmVzc2lvbi5sZWZ0KTtcbn1cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHRoZSBleHByZXNzaW9uIGlzIG9mIHRoZSBmb3JtXG4gKlxuICogYGBgXG4gKiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICogYGBgXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gYW4gZXhwcmVzc2lvbiB0aGF0IG1heSByZXByZXNlbnQgYSBkZWZhdWx0IHN1cGVyIGNhbGxcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gY29ycmVzcG9uZHMgd2l0aCB0aGUgYWJvdmUgZm9ybVxuICovXG5mdW5jdGlvbiBpc1N1cGVyQXBwbHlDYWxsKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHJlc3Npb24pIHx8IGV4cHJlc3Npb24uYXJndW1lbnRzLmxlbmd0aCAhPT0gMikgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IHRhcmdldEZuID0gZXhwcmVzc2lvbi5leHByZXNzaW9uO1xuICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHRhcmdldEZuKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoIWlzU3VwZXJJZGVudGlmaWVyKHRhcmdldEZuLmV4cHJlc3Npb24pKSByZXR1cm4gZmFsc2U7XG4gIGlmICh0YXJnZXRGbi5uYW1lLnRleHQgIT09ICdhcHBseScpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCB0aGlzQXJndW1lbnQgPSBleHByZXNzaW9uLmFyZ3VtZW50c1swXTtcbiAgaWYgKHRoaXNBcmd1bWVudC5raW5kICE9PSB0cy5TeW50YXhLaW5kLlRoaXNLZXl3b3JkKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgYXJndW1lbnRzQXJndW1lbnQgPSBleHByZXNzaW9uLmFyZ3VtZW50c1sxXTtcbiAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihhcmd1bWVudHNBcmd1bWVudCkgJiYgYXJndW1lbnRzQXJndW1lbnQudGV4dCA9PT0gJ2FyZ3VtZW50cyc7XG59XG5cbmZ1bmN0aW9uIGlzQmluYXJ5RXhwcihcbiAgICBleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uLCBvcGVyYXRvcjogdHMuQmluYXJ5T3BlcmF0b3IpOiBleHByZXNzaW9uIGlzIHRzLkJpbmFyeUV4cHJlc3Npb24ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKGV4cHJlc3Npb24pICYmIGV4cHJlc3Npb24ub3BlcmF0b3JUb2tlbi5raW5kID09PSBvcGVyYXRvcjtcbn1cblxuZnVuY3Rpb24gaXNTdXBlcklkZW50aWZpZXIobm9kZTogdHMuTm9kZSk6IGJvb2xlYW4ge1xuICAvLyBWZXJpZnkgdGhhdCB0aGUgaWRlbnRpZmllciBpcyBwcmVmaXhlZCB3aXRoIGBfc3VwZXJgLiBXZSBkb24ndCB0ZXN0IGZvciBlcXVpdmFsZW5jZVxuICAvLyBhcyBUeXBlU2NyaXB0IG1heSBoYXZlIHN1ZmZpeGVkIHRoZSBuYW1lLCBlLmcuIGBfc3VwZXJfMWAgdG8gYXZvaWQgbmFtZSBjb25mbGljdHMuXG4gIC8vIFJlcXVpcmluZyBvbmx5IGEgcHJlZml4IHNob3VsZCBiZSBzdWZmaWNpZW50bHkgYWNjdXJhdGUuXG4gIHJldHVybiB0cy5pc0lkZW50aWZpZXIobm9kZSkgJiYgbm9kZS50ZXh0LnN0YXJ0c1dpdGgoJ19zdXBlcicpO1xufVxuXG4vKipcbiAqIFBhcnNlIHRoZSBzdGF0ZW1lbnQgdG8gZXh0cmFjdCB0aGUgRVNNNSBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXIgaWYgdGhlcmUgaXMgb25lLlxuICogSWYgb25lIGlzIGZvdW5kLCBhZGQgaXQgdG8gdGhlIGFwcHJvcHJpYXRlIHBhcmFtZXRlciBpbiB0aGUgYHBhcmFtZXRlcnNgIGNvbGxlY3Rpb24uXG4gKlxuICogVGhlIGZvcm0gd2UgYXJlIGxvb2tpbmcgZm9yIGlzOlxuICpcbiAqIGBgYFxuICogaWYgKGFyZyA9PT0gdm9pZCAwKSB7IGFyZyA9IGluaXRpYWxpemVyOyB9XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3RhdGVtZW50IGEgc3RhdGVtZW50IHRoYXQgbWF5IGJlIGluaXRpYWxpemluZyBhbiBvcHRpb25hbCBwYXJhbWV0ZXJcbiAqIEBwYXJhbSBwYXJhbWV0ZXJzIHRoZSBjb2xsZWN0aW9uIG9mIHBhcmFtZXRlcnMgdGhhdCB3ZXJlIGZvdW5kIGluIHRoZSBmdW5jdGlvbiBkZWZpbml0aW9uXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBzdGF0ZW1lbnQgd2FzIGEgcGFyYW1ldGVyIGluaXRpYWxpemVyXG4gKi9cbmZ1bmN0aW9uIHJlZmxlY3RQYXJhbUluaXRpYWxpemVyKHN0YXRlbWVudDogdHMuU3RhdGVtZW50LCBwYXJhbWV0ZXJzOiBQYXJhbWV0ZXJbXSkge1xuICBpZiAodHMuaXNJZlN0YXRlbWVudChzdGF0ZW1lbnQpICYmIGlzVW5kZWZpbmVkQ29tcGFyaXNvbihzdGF0ZW1lbnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIHRzLmlzQmxvY2soc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQpICYmIHN0YXRlbWVudC50aGVuU3RhdGVtZW50LnN0YXRlbWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgY29uc3QgaWZTdGF0ZW1lbnRDb21wYXJpc29uID0gc3RhdGVtZW50LmV4cHJlc3Npb247ICAgICAgICAgICAvLyAoYXJnID09PSB2b2lkIDApXG4gICAgY29uc3QgdGhlblN0YXRlbWVudCA9IHN0YXRlbWVudC50aGVuU3RhdGVtZW50LnN0YXRlbWVudHNbMF07ICAvLyBhcmcgPSBpbml0aWFsaXplcjtcbiAgICBpZiAoaXNBc3NpZ25tZW50U3RhdGVtZW50KHRoZW5TdGF0ZW1lbnQpKSB7XG4gICAgICBjb25zdCBjb21wYXJpc29uTmFtZSA9IGlmU3RhdGVtZW50Q29tcGFyaXNvbi5sZWZ0LnRleHQ7XG4gICAgICBjb25zdCBhc3NpZ25tZW50TmFtZSA9IHRoZW5TdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0LnRleHQ7XG4gICAgICBpZiAoY29tcGFyaXNvbk5hbWUgPT09IGFzc2lnbm1lbnROYW1lKSB7XG4gICAgICAgIGNvbnN0IHBhcmFtZXRlciA9IHBhcmFtZXRlcnMuZmluZChwID0+IHAubmFtZSA9PT0gY29tcGFyaXNvbk5hbWUpO1xuICAgICAgICBpZiAocGFyYW1ldGVyKSB7XG4gICAgICAgICAgcGFyYW1ldGVyLmluaXRpYWxpemVyID0gdGhlblN0YXRlbWVudC5leHByZXNzaW9uLnJpZ2h0O1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWRDb21wYXJpc29uKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBleHByZXNzaW9uIGlzIHRzLkV4cHJlc3Npb24mXG4gICAge2xlZnQ6IHRzLklkZW50aWZpZXIsIHJpZ2h0OiB0cy5FeHByZXNzaW9ufSB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24oZXhwcmVzc2lvbikgJiZcbiAgICAgIGV4cHJlc3Npb24ub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc0VxdWFsc1Rva2VuICYmXG4gICAgICB0cy5pc1ZvaWRFeHByZXNzaW9uKGV4cHJlc3Npb24ucmlnaHQpICYmIHRzLmlzSWRlbnRpZmllcihleHByZXNzaW9uLmxlZnQpO1xufVxuIl19