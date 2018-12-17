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
        define("@angular/compiler-cli/src/ngcc/src/host/esm5_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/host", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngcc/src/utils", "@angular/compiler-cli/src/ngcc/src/host/esm2015_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var host_1 = require("@angular/compiler-cli/src/ngtsc/host");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
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
        Esm5ReflectionHost.prototype.isClass = function (node) { return _super.prototype.isClass.call(this, node) || !!this.getClassSymbol(node); };
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
            if (constructor && constructor.parameters) {
                return Array.from(constructor.parameters);
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
            if (member && member.kind === host_1.ClassMemberKind.Method && member.isStatic && member.node &&
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
        return ts.isObjectLiteralExpression(element) ? metadata_1.reflectObjectLiteral(element) : null;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6Ii4uLy4uLy4uLy4uLyIsInNvdXJjZXMiOlsicGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsNkRBQTJHO0lBQzNHLHFFQUE2RDtJQUM3RCxrRUFBcUM7SUFFckMscUZBQW1IO0lBR25IOzs7Ozs7Ozs7Ozs7Ozs7O09BZ0JHO0lBQ0g7UUFBd0MsOENBQXFCO1FBQzNELDRCQUFZLE1BQWUsRUFBRSxPQUF1QjttQkFBSSxrQkFBTSxNQUFNLEVBQUUsT0FBTyxDQUFDO1FBQUUsQ0FBQztRQUVqRjs7V0FFRztRQUNILG9DQUFPLEdBQVAsVUFBUSxJQUFhLElBQWEsT0FBTyxpQkFBTSxPQUFPLFlBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlGOzs7Ozs7Ozs7Ozs7Ozs7V0FlRztRQUNILDJDQUFjLEdBQWQsVUFBZSxJQUFhO1lBQzFCLElBQU0sTUFBTSxHQUFHLGlCQUFNLGNBQWMsWUFBQyxJQUFJLENBQUMsQ0FBQztZQUMxQyxJQUFJLE1BQU07Z0JBQUUsT0FBTyxNQUFNLENBQUM7WUFFMUIsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2xDLElBQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLFFBQVE7b0JBQUUsT0FBTyxTQUFTLENBQUM7Z0JBRWhDLElBQU0sb0JBQW9CLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzNELElBQUksQ0FBQyxvQkFBb0I7b0JBQUUsT0FBTyxTQUFTLENBQUM7Z0JBRTVDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxt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ICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgRGVjb3JhdG9yLCBGdW5jdGlvbkRlZmluaXRpb24sIFBhcmFtZXRlcn0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvaG9zdCc7XG5pbXBvcnQge3JlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9tZXRhZGF0YSc7XG5pbXBvcnQge2dldE5hbWVUZXh0fSBmcm9tICcuLi91dGlscyc7XG5cbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0LCBQYXJhbUluZm8sIGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sLCBpc0Fzc2lnbm1lbnRTdGF0ZW1lbnR9IGZyb20gJy4vZXNtMjAxNV9ob3N0JztcblxuXG4vKipcbiAqIEVTTTUgcGFja2FnZXMgY29udGFpbiBFQ01BU2NyaXB0IElJRkUgZnVuY3Rpb25zIHRoYXQgYWN0IGxpa2UgY2xhc3Nlcy4gRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiB2YXIgQ29tbW9uTW9kdWxlID0gKGZ1bmN0aW9uICgpIHtcbiAqICBmdW5jdGlvbiBDb21tb25Nb2R1bGUoKSB7XG4gKiAgfVxuICogIENvbW1vbk1vZHVsZS5kZWNvcmF0b3JzID0gWyAuLi4gXTtcbiAqIGBgYFxuICpcbiAqICogXCJDbGFzc2VzXCIgYXJlIGRlY29yYXRlZCBpZiB0aGV5IGhhdmUgYSBzdGF0aWMgcHJvcGVydHkgY2FsbGVkIGBkZWNvcmF0b3JzYC5cbiAqICogTWVtYmVycyBhcmUgZGVjb3JhdGVkIGlmIHRoZXJlIGlzIGEgbWF0Y2hpbmcga2V5IG9uIGEgc3RhdGljIHByb3BlcnR5XG4gKiAgIGNhbGxlZCBgcHJvcERlY29yYXRvcnNgLlxuICogKiBDb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIGRlY29yYXRvcnMgYXJlIGZvdW5kIG9uIGFuIG9iamVjdCByZXR1cm5lZCBmcm9tXG4gKiAgIGEgc3RhdGljIG1ldGhvZCBjYWxsZWQgYGN0b3JQYXJhbWV0ZXJzYC5cbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBFc201UmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBFc20yMDE1UmVmbGVjdGlvbkhvc3Qge1xuICBjb25zdHJ1Y3Rvcihpc0NvcmU6IGJvb2xlYW4sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKSB7IHN1cGVyKGlzQ29yZSwgY2hlY2tlcik7IH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciB0aGUgZ2l2ZW4gbm9kZSBhY3R1YWxseSByZXByZXNlbnRzIGEgY2xhc3MuXG4gICAqL1xuICBpc0NsYXNzKG5vZGU6IHRzLk5vZGUpOiBib29sZWFuIHsgcmV0dXJuIHN1cGVyLmlzQ2xhc3Mobm9kZSkgfHwgISF0aGlzLmdldENsYXNzU3ltYm9sKG5vZGUpOyB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYSBzeW1ib2wgZm9yIGEgbm9kZSB0aGF0IHdlIHRoaW5rIGlzIGEgY2xhc3MuXG4gICAqXG4gICAqIEluIEVTNSwgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY2xhc3MgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHRoYXQgaXMgaGlkZGVuIGluc2lkZSBhbiBJSUZFLlxuICAgKiBTbyB3ZSBuZWVkIHRvIGRpZyBhcm91bmQgaW5zaWRlIHRvIGdldCBob2xkIG9mIHRoZSBcImNsYXNzXCIgc3ltYm9sLlxuICAgKlxuICAgKiBgbm9kZWAgbWlnaHQgYmUgb25lIG9mOlxuICAgKiAtIEEgY2xhc3MgZGVjbGFyYXRpb24gKGZyb20gYSBkZWNsYXJhdGlvbiBmaWxlKS5cbiAgICogLSBUaGUgZGVjbGFyYXRpb24gb2YgdGhlIG91dGVyIHZhcmlhYmxlLCB3aGljaCBpcyBhc3NpZ25lZCB0aGUgcmVzdWx0IG9mIHRoZSBJSUZFLlxuICAgKiAtIFRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiBpbnNpZGUgdGhlIElJRkUsIHdoaWNoIGlzIGV2ZW50dWFsbHkgcmV0dXJuZWQgYW5kIGFzc2lnbmVkIHRvIHRoZVxuICAgKiAgIG91dGVyIHZhcmlhYmxlLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgdG9wIGxldmVsIGRlY2xhcmF0aW9uIHRoYXQgcmVwcmVzZW50cyBhbiBleHBvcnRlZCBjbGFzcyBvciB0aGUgZnVuY3Rpb25cbiAgICogICAgIGV4cHJlc3Npb24gaW5zaWRlIHRoZSBJSUZFLlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGZvciB0aGUgbm9kZSBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIgb3IgaGFzIG5vIHN5bWJvbC5cbiAgICovXG4gIGdldENsYXNzU3ltYm9sKG5vZGU6IHRzLk5vZGUpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBzeW1ib2wgPSBzdXBlci5nZXRDbGFzc1N5bWJvbChub2RlKTtcbiAgICBpZiAoc3ltYm9sKSByZXR1cm4gc3ltYm9sO1xuXG4gICAgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgY29uc3QgaWlmZUJvZHkgPSBnZXRJaWZlQm9keShub2RlKTtcbiAgICAgIGlmICghaWlmZUJvZHkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgIGNvbnN0IGlubmVyQ2xhc3NJZGVudGlmaWVyID0gZ2V0UmV0dXJuSWRlbnRpZmllcihpaWZlQm9keSk7XG4gICAgICBpZiAoIWlubmVyQ2xhc3NJZGVudGlmaWVyKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgICByZXR1cm4gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaW5uZXJDbGFzc0lkZW50aWZpZXIpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAvLyBJdCBtaWdodCBiZSB0aGUgZnVuY3Rpb24gZXhwcmVzc2lvbiBpbnNpZGUgdGhlIElJRkUuIFdlIG5lZWQgdG8gZ28gNSBsZXZlbHMgdXAuLi5cblxuICAgICAgLy8gMS4gSUlGRSBib2R5LlxuICAgICAgbGV0IG91dGVyTm9kZSA9IG5vZGUucGFyZW50O1xuICAgICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzQmxvY2sob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgLy8gMi4gSUlGRSBmdW5jdGlvbiBleHByZXNzaW9uLlxuICAgICAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcbiAgICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgICAvLyAzLiBJSUZFIGNhbGwgZXhwcmVzc2lvbi5cbiAgICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNDYWxsRXhwcmVzc2lvbihvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgICAvLyA0LiBQYXJlbnRoZXNpcyBhcm91bmQgSUlGRS5cbiAgICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgICAvLyA1LiBPdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG91dGVyTm9kZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgIHJldHVybiB0aGlzLmdldENsYXNzU3ltYm9sKG91dGVyTm9kZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBhIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIHRvIGZpbmQgdGhlIHJlbGV2YW50IG1ldGFkYXRhIGFib3V0IGl0LlxuICAgKlxuICAgKiBJbiBFU001IHdlIG5lZWQgdG8gZG8gc3BlY2lhbCB3b3JrIHdpdGggb3B0aW9uYWwgYXJndW1lbnRzIHRvIHRoZSBmdW5jdGlvbiwgc2luY2UgdGhleSBnZXRcbiAgICogdGhlaXIgb3duIGluaXRpYWxpemVyIHN0YXRlbWVudCB0aGF0IG5lZWRzIHRvIGJlIHBhcnNlZCBhbmQgdGhlbiBub3QgaW5jbHVkZWQgaW4gdGhlIFwiYm9keVwiXG4gICAqIHN0YXRlbWVudHMgb2YgdGhlIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gdG8gcGFyc2UuXG4gICAqIEByZXR1cm5zIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBub2RlLCBzdGF0ZW1lbnRzIGFuZCBwYXJhbWV0ZXJzIG9mIHRoZSBmdW5jdGlvbi5cbiAgICovXG4gIGdldERlZmluaXRpb25PZkZ1bmN0aW9uPFQgZXh0ZW5kcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5GdW5jdGlvbkV4cHJlc3Npb24+KG5vZGU6IFQpOiBGdW5jdGlvbkRlZmluaXRpb248VD4ge1xuICAgIGNvbnN0IHBhcmFtZXRlcnMgPVxuICAgICAgICBub2RlLnBhcmFtZXRlcnMubWFwKHAgPT4gKHtuYW1lOiBnZXROYW1lVGV4dChwLm5hbWUpLCBub2RlOiBwLCBpbml0aWFsaXplcjogbnVsbH0pKTtcbiAgICBsZXQgbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzID0gdHJ1ZTtcblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBub2RlLmJvZHkgJiYgbm9kZS5ib2R5LnN0YXRlbWVudHMuZmlsdGVyKHMgPT4ge1xuICAgICAgbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzID1cbiAgICAgICAgICBsb29raW5nRm9yUGFyYW1Jbml0aWFsaXplcnMgJiYgcmVmbGVjdFBhcmFtSW5pdGlhbGl6ZXIocywgcGFyYW1ldGVycyk7XG4gICAgICAvLyBJZiB3ZSBhcmUgbm8gbG9uZ2VyIGxvb2tpbmcgZm9yIHBhcmFtZXRlciBpbml0aWFsaXplcnMgdGhlbiB3ZSBpbmNsdWRlIHRoaXMgc3RhdGVtZW50XG4gICAgICByZXR1cm4gIWxvb2tpbmdGb3JQYXJhbUluaXRpYWxpemVycztcbiAgICB9KTtcblxuICAgIHJldHVybiB7bm9kZSwgYm9keTogc3RhdGVtZW50cyB8fCBudWxsLCBwYXJhbWV0ZXJzfTtcbiAgfVxuXG5cbiAgLy8vLy8vLy8vLy8vLyBQcm90ZWN0ZWQgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIGRlY2xhcmF0aW9ucyBvZiB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIGNsYXNzIGlkZW50aWZpZWQgYnkgaXRzIHN5bWJvbC5cbiAgICpcbiAgICogSW4gRVNNNSB0aGVyZSBpcyBubyBcImNsYXNzXCIgc28gdGhlIGNvbnN0cnVjdG9yIHRoYXQgd2Ugd2FudCBpcyBhY3R1YWxseSB0aGUgZGVjbGFyYXRpb25cbiAgICogZnVuY3Rpb24gaXRzZWxmLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIHBhcmFtZXRlcnMgd2Ugd2FudCB0byBmaW5kLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25gIG9iamVjdHMgcmVwcmVzZW50aW5nIGVhY2ggb2YgdGhlIHBhcmFtZXRlcnMgaW5cbiAgICogdGhlIGNsYXNzJ3MgY29uc3RydWN0b3Igb3IgbnVsbCBpZiB0aGVyZSBpcyBubyBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbDogdHMuU3ltYm9sKTogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25bXSB7XG4gICAgY29uc3QgY29uc3RydWN0b3IgPSBjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uIGFzIHRzLkZ1bmN0aW9uRGVjbGFyYXRpb247XG4gICAgaWYgKGNvbnN0cnVjdG9yICYmIGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpIHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpO1xuICAgIH1cbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MsXG4gICAqIHdoZXJlIHRoZSBpbmZvcm1hdGlvbiBpcyBzdG9yZWQgb24gYSBzdGF0aWMgbWV0aG9kIG9mIHRoZSBjbGFzcy5cbiAgICpcbiAgICogSW4gdGhpcyBjYXNlIHRoZSBkZWNvcmF0b3JzIGFyZSBzdG9yZWQgaW4gdGhlIGJvZHkgb2YgYSBtZXRob2RcbiAgICogKGBjdG9yUGFyYXRlbWVyc2ApIGF0dGFjaGVkIHRvIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAgICpcbiAgICogTm90ZSB0aGF0IHVubGlrZSBFU00yMDE1IHRoaXMgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHJhdGhlciB0aGFuIGFuIGFycm93XG4gICAqIGZ1bmN0aW9uOlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gW1xuICAgKiAgIHsgdHlwZTogVmlld0NvbnRhaW5lclJlZiwgfSxcbiAgICogICB7IHR5cGU6IFRlbXBsYXRlUmVmLCB9LFxuICAgKiAgIHsgdHlwZTogSXRlcmFibGVEaWZmZXJzLCB9LFxuICAgKiAgIHsgdHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTixdIH0sXSB9LFxuICAgKiBdOyB9O1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5IHRoZSBwcm9wZXJ0eSB0aGF0IGhvbGRzIHRoZSBwYXJhbWV0ZXIgaW5mbyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygb2JqZWN0cyBjb250YWluaW5nIHRoZSB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciBlYWNoIHBhcmFtZXRlci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRQYXJhbUluZm9Gcm9tU3RhdGljUHJvcGVydHkocGFyYW1EZWNvcmF0b3JzUHJvcGVydHk6IHRzLlN5bWJvbCk6IFBhcmFtSW5mb1tdfG51bGwge1xuICAgIGNvbnN0IHBhcmFtRGVjb3JhdG9ycyA9IGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBnZXRSZXR1cm5TdGF0ZW1lbnQocGFyYW1EZWNvcmF0b3JzKTtcbiAgICBjb25zdCBleHByZXNzaW9uID0gcmV0dXJuU3RhdGVtZW50ICYmIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uO1xuICAgIGlmIChleHByZXNzaW9uICYmIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihleHByZXNzaW9uKSkge1xuICAgICAgY29uc3QgZWxlbWVudHMgPSBleHByZXNzaW9uLmVsZW1lbnRzO1xuICAgICAgcmV0dXJuIGVsZW1lbnRzLm1hcChyZWZsZWN0QXJyYXlFbGVtZW50KS5tYXAocGFyYW1JbmZvID0+IHtcbiAgICAgICAgY29uc3QgdHlwZUV4cHJlc3Npb24gPSBwYXJhbUluZm8gJiYgcGFyYW1JbmZvLmdldCgndHlwZScpIHx8IG51bGw7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvckluZm8gPSBwYXJhbUluZm8gJiYgcGFyYW1JbmZvLmdldCgnZGVjb3JhdG9ycycpIHx8IG51bGw7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JJbmZvICYmIHRoaXMucmVmbGVjdERlY29yYXRvcnMoZGVjb3JhdG9ySW5mbyk7XG4gICAgICAgIHJldHVybiB7dHlwZUV4cHJlc3Npb24sIGRlY29yYXRvcnN9O1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciBhIHN5bWJvbCBhbmQgZXh0cmFjdCB0aGUgbWVtYmVyIGluZm9ybWF0aW9uLCBjb21iaW5pbmcgaXQgd2l0aCB0aGVcbiAgICogcHJvdmlkZWQgZGVjb3JhdG9yIGluZm9ybWF0aW9uLCBhbmQgd2hldGhlciBpdCBpcyBhIHN0YXRpYyBtZW1iZXIuXG4gICAqIEBwYXJhbSBzeW1ib2wgdGhlIHN5bWJvbCBmb3IgdGhlIG1lbWJlciB0byByZWZsZWN0IG92ZXIuXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBtZW1iZXIuXG4gICAqIEBwYXJhbSBpc1N0YXRpYyB0cnVlIGlmIHRoaXMgbWVtYmVyIGlzIHN0YXRpYywgZmFsc2UgaWYgaXQgaXMgYW4gaW5zdGFuY2UgcHJvcGVydHkuXG4gICAqIEByZXR1cm5zIHRoZSByZWZsZWN0ZWQgbWVtYmVyIGluZm9ybWF0aW9uLCBvciBudWxsIGlmIHRoZSBzeW1ib2wgaXMgbm90IGEgbWVtYmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlZmxlY3RNZW1iZXIoc3ltYm9sOiB0cy5TeW1ib2wsIGRlY29yYXRvcnM/OiBEZWNvcmF0b3JbXSwgaXNTdGF0aWM/OiBib29sZWFuKTpcbiAgICAgIENsYXNzTWVtYmVyfG51bGwge1xuICAgIGNvbnN0IG1lbWJlciA9IHN1cGVyLnJlZmxlY3RNZW1iZXIoc3ltYm9sLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgaWYgKG1lbWJlciAmJiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZCAmJiBtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLm5vZGUgJiZcbiAgICAgICAgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obWVtYmVyLm5vZGUpICYmIG1lbWJlci5ub2RlLnBhcmVudCAmJlxuICAgICAgICB0cy5pc0JpbmFyeUV4cHJlc3Npb24obWVtYmVyLm5vZGUucGFyZW50KSAmJlxuICAgICAgICB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihtZW1iZXIubm9kZS5wYXJlbnQucmlnaHQpKSB7XG4gICAgICAvLyBSZWNvbXB1dGUgdGhlIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIG1lbWJlcjpcbiAgICAgIC8vIEVTNSBzdGF0aWMgbWV0aG9kcyBhcmUgdmFyaWFibGUgZGVjbGFyYXRpb25zIHNvIHRoZSBkZWNsYXJhdGlvbiBpcyBhY3R1YWxseSB0aGVcbiAgICAgIC8vIGluaXRpYWxpemVyIG9mIHRoZSB2YXJpYWJsZSBhc3NpZ25tZW50XG4gICAgICBtZW1iZXIuaW1wbGVtZW50YXRpb24gPSBtZW1iZXIubm9kZS5wYXJlbnQucmlnaHQ7XG4gICAgfVxuICAgIHJldHVybiBtZW1iZXI7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBzdGF0ZW1lbnRzIHJlbGF0ZWQgdG8gdGhlIGdpdmVuIGNsYXNzIHRoYXQgbWF5IGNvbnRhaW4gY2FsbHMgdG8gYSBoZWxwZXIuXG4gICAqXG4gICAqIEluIEVTTTUgY29kZSB0aGUgaGVscGVyIGNhbGxzIGFyZSBoaWRkZW4gaW5zaWRlIHRoZSBjbGFzcydzIElJRkUuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLiBXZSBleHBlY3QgdGhpcyBzeW1ib2xcbiAgICogdG8gcmVmZXJlbmNlIHRoZSBpbm5lciBpZGVudGlmaWVyIGluc2lkZSB0aGUgSUlGRS5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygc3RhdGVtZW50cyB0aGF0IG1heSBjb250YWluIGhlbHBlciBjYWxscy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRTdGF0ZW1lbnRzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICBjb25zdCBjbGFzc0RlY2xhcmF0aW9uID0gY2xhc3NTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICByZXR1cm4gdHMuaXNCbG9jayhjbGFzc0RlY2xhcmF0aW9uLnBhcmVudCkgPyBBcnJheS5mcm9tKGNsYXNzRGVjbGFyYXRpb24ucGFyZW50LnN0YXRlbWVudHMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbXTtcbiAgfVxufVxuXG4vLy8vLy8vLy8vLy8vIEludGVybmFsIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG5mdW5jdGlvbiBnZXRJaWZlQm9keShkZWNsYXJhdGlvbjogdHMuVmFyaWFibGVEZWNsYXJhdGlvbik6IHRzLkJsb2NrfHVuZGVmaW5lZCB7XG4gIGlmICghZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgfHwgIXRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24oZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIpKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBjYWxsID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gIHJldHVybiB0cy5pc0NhbGxFeHByZXNzaW9uKGNhbGwuZXhwcmVzc2lvbikgJiZcbiAgICAgICAgICB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihjYWxsLmV4cHJlc3Npb24uZXhwcmVzc2lvbikgP1xuICAgICAgY2FsbC5leHByZXNzaW9uLmV4cHJlc3Npb24uYm9keSA6XG4gICAgICB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGdldFJldHVybklkZW50aWZpZXIoYm9keTogdHMuQmxvY2spOiB0cy5JZGVudGlmaWVyfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHJldHVyblN0YXRlbWVudCA9IGJvZHkuc3RhdGVtZW50cy5maW5kKHRzLmlzUmV0dXJuU3RhdGVtZW50KTtcbiAgcmV0dXJuIHJldHVyblN0YXRlbWVudCAmJiByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbiAmJlxuICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihyZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbikgP1xuICAgICAgcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24gOlxuICAgICAgdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBnZXRSZXR1cm5TdGF0ZW1lbnQoZGVjbGFyYXRpb246IHRzLkV4cHJlc3Npb24gfCB1bmRlZmluZWQpOiB0cy5SZXR1cm5TdGF0ZW1lbnR8dW5kZWZpbmVkIHtcbiAgcmV0dXJuIGRlY2xhcmF0aW9uICYmIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGRlY2xhcmF0aW9uKSA/XG4gICAgICBkZWNsYXJhdGlvbi5ib2R5LnN0YXRlbWVudHMuZmluZCh0cy5pc1JldHVyblN0YXRlbWVudCkgOlxuICAgICAgdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiByZWZsZWN0QXJyYXlFbGVtZW50KGVsZW1lbnQ6IHRzLkV4cHJlc3Npb24pIHtcbiAgcmV0dXJuIHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oZWxlbWVudCkgPyByZWZsZWN0T2JqZWN0TGl0ZXJhbChlbGVtZW50KSA6IG51bGw7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIHN0YXRlbWVudCB0byBleHRyYWN0IHRoZSBFU001IHBhcmFtZXRlciBpbml0aWFsaXplciBpZiB0aGVyZSBpcyBvbmUuXG4gKiBJZiBvbmUgaXMgZm91bmQsIGFkZCBpdCB0byB0aGUgYXBwcm9wcmlhdGUgcGFyYW1ldGVyIGluIHRoZSBgcGFyYW1ldGVyc2AgY29sbGVjdGlvbi5cbiAqXG4gKiBUaGUgZm9ybSB3ZSBhcmUgbG9va2luZyBmb3IgaXM6XG4gKlxuICogYGBgXG4gKiBpZiAoYXJnID09PSB2b2lkIDApIHsgYXJnID0gaW5pdGlhbGl6ZXI7IH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzdGF0ZW1lbnQgYSBzdGF0ZW1lbnQgdGhhdCBtYXkgYmUgaW5pdGlhbGl6aW5nIGFuIG9wdGlvbmFsIHBhcmFtZXRlclxuICogQHBhcmFtIHBhcmFtZXRlcnMgdGhlIGNvbGxlY3Rpb24gb2YgcGFyYW1ldGVycyB0aGF0IHdlcmUgZm91bmQgaW4gdGhlIGZ1bmN0aW9uIGRlZmluaXRpb25cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCB3YXMgYSBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXJcbiAqL1xuZnVuY3Rpb24gcmVmbGVjdFBhcmFtSW5pdGlhbGl6ZXIoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQsIHBhcmFtZXRlcnM6IFBhcmFtZXRlcltdKSB7XG4gIGlmICh0cy5pc0lmU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgaXNVbmRlZmluZWRDb21wYXJpc29uKHN0YXRlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNCbG9jayhzdGF0ZW1lbnQudGhlblN0YXRlbWVudCkgJiYgc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCBpZlN0YXRlbWVudENvbXBhcmlzb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjsgICAgICAgICAgIC8vIChhcmcgPT09IHZvaWQgMClcbiAgICBjb25zdCB0aGVuU3RhdGVtZW50ID0gc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50c1swXTsgIC8vIGFyZyA9IGluaXRpYWxpemVyO1xuICAgIGlmIChpc0Fzc2lnbm1lbnRTdGF0ZW1lbnQodGhlblN0YXRlbWVudCkpIHtcbiAgICAgIGNvbnN0IGNvbXBhcmlzb25OYW1lID0gaWZTdGF0ZW1lbnRDb21wYXJpc29uLmxlZnQudGV4dDtcbiAgICAgIGNvbnN0IGFzc2lnbm1lbnROYW1lID0gdGhlblN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQudGV4dDtcbiAgICAgIGlmIChjb21wYXJpc29uTmFtZSA9PT0gYXNzaWdubWVudE5hbWUpIHtcbiAgICAgICAgY29uc3QgcGFyYW1ldGVyID0gcGFyYW1ldGVycy5maW5kKHAgPT4gcC5uYW1lID09PSBjb21wYXJpc29uTmFtZSk7XG4gICAgICAgIGlmIChwYXJhbWV0ZXIpIHtcbiAgICAgICAgICBwYXJhbWV0ZXIuaW5pdGlhbGl6ZXIgPSB0aGVuU3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQ7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZENvbXBhcmlzb24oZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGV4cHJlc3Npb24gaXMgdHMuRXhwcmVzc2lvbiZcbiAgICB7bGVmdDogdHMuSWRlbnRpZmllciwgcmlnaHQ6IHRzLkV4cHJlc3Npb259IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihleHByZXNzaW9uKSAmJlxuICAgICAgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW4gJiZcbiAgICAgIHRzLmlzVm9pZEV4cHJlc3Npb24oZXhwcmVzc2lvbi5yaWdodCkgJiYgdHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24ubGVmdCk7XG59XG4iXX0=