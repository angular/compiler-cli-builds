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
        define("@angular/compiler-cli/src/ngcc/src/host/esm5_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/host", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngcc/src/utils", "@angular/compiler-cli/src/ngcc/src/host/fesm2015_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var host_1 = require("@angular/compiler-cli/src/ngtsc/host");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
    var fesm2015_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/fesm2015_host");
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
        function Esm5ReflectionHost(checker) {
            return _super.call(this, checker) || this;
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
         * @param node The top level declaration that represents an exported class or the function
         *     expression inside the IIFE.
         * @returns The symbol for the node or `undefined` if it is not a "class" or has no symbol.
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
         * In ESM5 we need to do special work with optional arguments to the function, since they get
         * their own initializer statement that needs to be parsed and then not included in the "body"
         * statements of the function.
         * @param node the function declaration to parse.
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
         * Find the declarations of the constructor parameters of a class identified by its symbol.
         * In ESM5 there is no "class" so the constructor that we want is actually the declaration
         * function itself.
         */
        Esm5ReflectionHost.prototype.getConstructorParameterDeclarations = function (classSymbol) {
            var constructor = classSymbol.valueDeclaration;
            if (constructor && constructor.parameters) {
                return Array.from(constructor.parameters);
            }
            return [];
        };
        /**
         * Constructors parameter decorators are declared in the body of static method of the constructor
         * function in ES5. Note that unlike ESM2105 this is a function expression rather than an arrow
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
         */
        Esm5ReflectionHost.prototype.getConstructorDecorators = function (classSymbol) {
            var declaration = classSymbol.exports && classSymbol.exports.get(fesm2015_host_1.CONSTRUCTOR_PARAMS);
            var paramDecoratorsProperty = declaration && fesm2015_host_1.getPropertyValueFromSymbol(declaration);
            var returnStatement = getReturnStatement(paramDecoratorsProperty);
            var expression = returnStatement && returnStatement.expression;
            return expression && ts.isArrayLiteralExpression(expression) ?
                expression.elements.map(reflectArrayElement) :
                [];
        };
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
        return Esm5ReflectionHost;
    }(fesm2015_host_1.Fesm2015ReflectionHost));
    exports.Esm5ReflectionHost = Esm5ReflectionHost;
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
     * @param statement A statement that may be initializing an optional parameter
     * @param parameters The collection of parameters that were found in the function definition
     * @returns true if the statement was a parameter initializer
     */
    function reflectParamInitializer(statement, parameters) {
        if (ts.isIfStatement(statement) && isUndefinedComparison(statement.expression) &&
            ts.isBlock(statement.thenStatement) && statement.thenStatement.statements.length === 1) {
            var ifStatementComparison = statement.expression; // (arg === void 0)
            var thenStatement = statement.thenStatement.statements[0]; // arg = initializer;
            if (isAssignment(thenStatement)) {
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
    function isAssignment(statement) {
        return ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression) &&
            statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isIdentifier(statement.expression.left);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFDakMsNkRBQTJHO0lBQzNHLHFFQUE2RDtJQUM3RCxrRUFBcUM7SUFDckMsdUZBQXVHO0lBRXZHOzs7Ozs7Ozs7Ozs7Ozs7O09BZ0JHO0lBQ0g7UUFBd0MsOENBQXNCO1FBQzVELDRCQUFZLE9BQXVCO21CQUFJLGtCQUFNLE9BQU8sQ0FBQztRQUFFLENBQUM7UUFFeEQ7O1dBRUc7UUFDSCxvQ0FBTyxHQUFQLFVBQVEsSUFBYSxJQUFhLE9BQU8saUJBQU0sT0FBTyxZQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU5Rjs7Ozs7Ozs7Ozs7Ozs7O1dBZUc7UUFDSCwyQ0FBYyxHQUFkLFVBQWUsSUFBYTtZQUMxQixJQUFNLE1BQU0sR0FBRyxpQkFBTSxjQUFjLFlBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUMsSUFBSSxNQUFNO2dCQUFFLE9BQU8sTUFBTSxDQUFDO1lBRTFCLElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNsQyxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxRQUFRO29CQUFFLE9BQU8sU0FBUyxDQUFDO2dCQUVoQyxJQUFNLG9CQUFvQixHQUFHLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMzRCxJQUFJLENBQUMsb0JBQW9CO29CQUFFLE9BQU8sU0FBUyxDQUFDO2dCQUU1QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1C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QkFDYjtpQkFDRjthQUNGO1NBQ0Y7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxTQUFTLHFCQUFxQixDQUFDLFVBQXlCO1FBRXRELE9BQU8sRUFBRSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQztZQUNwQyxVQUFVLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QjtZQUN2RSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxTQUF1QjtRQUUzQyxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQztZQUNyRixTQUFTLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXO1lBQ3JFLEVBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Q2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgRGVjb3JhdG9yLCBGdW5jdGlvbkRlZmluaXRpb24sIFBhcmFtZXRlcn0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvaG9zdCc7XG5pbXBvcnQge3JlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9tZXRhZGF0YSc7XG5pbXBvcnQge2dldE5hbWVUZXh0fSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge0NPTlNUUlVDVE9SX1BBUkFNUywgRmVzbTIwMTVSZWZsZWN0aW9uSG9zdCwgZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2x9IGZyb20gJy4vZmVzbTIwMTVfaG9zdCc7XG5cbi8qKlxuICogRVNNNSBwYWNrYWdlcyBjb250YWluIEVDTUFTY3JpcHQgSUlGRSBmdW5jdGlvbnMgdGhhdCBhY3QgbGlrZSBjbGFzc2VzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIHZhciBDb21tb25Nb2R1bGUgPSAoZnVuY3Rpb24gKCkge1xuICogIGZ1bmN0aW9uIENvbW1vbk1vZHVsZSgpIHtcbiAqICB9XG4gKiAgQ29tbW9uTW9kdWxlLmRlY29yYXRvcnMgPSBbIC4uLiBdO1xuICogYGBgXG4gKlxuICogKiBcIkNsYXNzZXNcIiBhcmUgZGVjb3JhdGVkIGlmIHRoZXkgaGF2ZSBhIHN0YXRpYyBwcm9wZXJ0eSBjYWxsZWQgYGRlY29yYXRvcnNgLlxuICogKiBNZW1iZXJzIGFyZSBkZWNvcmF0ZWQgaWYgdGhlcmUgaXMgYSBtYXRjaGluZyBrZXkgb24gYSBzdGF0aWMgcHJvcGVydHlcbiAqICAgY2FsbGVkIGBwcm9wRGVjb3JhdG9yc2AuXG4gKiAqIENvbnN0cnVjdG9yIHBhcmFtZXRlcnMgZGVjb3JhdG9ycyBhcmUgZm91bmQgb24gYW4gb2JqZWN0IHJldHVybmVkIGZyb21cbiAqICAgYSBzdGF0aWMgbWV0aG9kIGNhbGxlZCBgY3RvclBhcmFtZXRlcnNgLlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIEVzbTVSZWZsZWN0aW9uSG9zdCBleHRlbmRzIEZlc20yMDE1UmVmbGVjdGlvbkhvc3Qge1xuICBjb25zdHJ1Y3RvcihjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcikgeyBzdXBlcihjaGVja2VyKTsgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiBub2RlIGFjdHVhbGx5IHJlcHJlc2VudHMgYSBjbGFzcy5cbiAgICovXG4gIGlzQ2xhc3Mobm9kZTogdHMuTm9kZSk6IGJvb2xlYW4geyByZXR1cm4gc3VwZXIuaXNDbGFzcyhub2RlKSB8fCAhIXRoaXMuZ2V0Q2xhc3NTeW1ib2wobm9kZSk7IH1cblxuICAvKipcbiAgICogRmluZCBhIHN5bWJvbCBmb3IgYSBub2RlIHRoYXQgd2UgdGhpbmsgaXMgYSBjbGFzcy5cbiAgICpcbiAgICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUuXG4gICAqIFNvIHdlIG5lZWQgdG8gZGlnIGFyb3VuZCBpbnNpZGUgdG8gZ2V0IGhvbGQgb2YgdGhlIFwiY2xhc3NcIiBzeW1ib2wuXG4gICAqXG4gICAqIGBub2RlYCBtaWdodCBiZSBvbmUgb2Y6XG4gICAqIC0gQSBjbGFzcyBkZWNsYXJhdGlvbiAoZnJvbSBhIGRlY2xhcmF0aW9uIGZpbGUpLlxuICAgKiAtIFRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgb3V0ZXIgdmFyaWFibGUsIHdoaWNoIGlzIGFzc2lnbmVkIHRoZSByZXN1bHQgb2YgdGhlIElJRkUuXG4gICAqIC0gVGhlIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGluc2lkZSB0aGUgSUlGRSwgd2hpY2ggaXMgZXZlbnR1YWxseSByZXR1cm5lZCBhbmQgYXNzaWduZWQgdG8gdGhlXG4gICAqICAgb3V0ZXIgdmFyaWFibGUuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIFRoZSB0b3AgbGV2ZWwgZGVjbGFyYXRpb24gdGhhdCByZXByZXNlbnRzIGFuIGV4cG9ydGVkIGNsYXNzIG9yIHRoZSBmdW5jdGlvblxuICAgKiAgICAgZXhwcmVzc2lvbiBpbnNpZGUgdGhlIElJRkUuXG4gICAqIEByZXR1cm5zIFRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIG9yIGB1bmRlZmluZWRgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIiBvciBoYXMgbm8gc3ltYm9sLlxuICAgKi9cbiAgZ2V0Q2xhc3NTeW1ib2wobm9kZTogdHMuTm9kZSk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bWJvbCA9IHN1cGVyLmdldENsYXNzU3ltYm9sKG5vZGUpO1xuICAgIGlmIChzeW1ib2wpIHJldHVybiBzeW1ib2w7XG5cbiAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBjb25zdCBpaWZlQm9keSA9IGdldElpZmVCb2R5KG5vZGUpO1xuICAgICAgaWYgKCFpaWZlQm9keSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgY29uc3QgaW5uZXJDbGFzc0lkZW50aWZpZXIgPSBnZXRSZXR1cm5JZGVudGlmaWVyKGlpZmVCb2R5KTtcbiAgICAgIGlmICghaW5uZXJDbGFzc0lkZW50aWZpZXIpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgIHJldHVybiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpbm5lckNsYXNzSWRlbnRpZmllcik7XG4gICAgfSBlbHNlIGlmICh0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIC8vIEl0IG1pZ2h0IGJlIHRoZSBmdW5jdGlvbiBleHByZXNzaW9uIGluc2lkZSB0aGUgSUlGRS4gV2UgbmVlZCB0byBnbyA1IGxldmVscyB1cC4uLlxuXG4gICAgICAvLyAxLiBJSUZFIGJvZHkuXG4gICAgICBsZXQgb3V0ZXJOb2RlID0gbm9kZS5wYXJlbnQ7XG4gICAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNCbG9jayhvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgICAvLyAyLiBJSUZFIGZ1bmN0aW9uIGV4cHJlc3Npb24uXG4gICAgICBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuICAgICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKG91dGVyTm9kZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgIC8vIDMuIElJRkUgY2FsbCBleHByZXNzaW9uLlxuICAgICAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcbiAgICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc0NhbGxFeHByZXNzaW9uKG91dGVyTm9kZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgIC8vIDQuIFBhcmVudGhlc2lzIGFyb3VuZCBJSUZFLlxuICAgICAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcbiAgICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG91dGVyTm9kZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgIC8vIDUuIE91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgICAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcbiAgICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24ob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q2xhc3NTeW1ib2wob3V0ZXJOb2RlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIGEgZnVuY3Rpb24gZGVjbGFyYXRpb24gdG8gZmluZCB0aGUgcmVsZXZhbnQgbWV0YWRhdGEgYWJvdXQgaXQuXG4gICAqIEluIEVTTTUgd2UgbmVlZCB0byBkbyBzcGVjaWFsIHdvcmsgd2l0aCBvcHRpb25hbCBhcmd1bWVudHMgdG8gdGhlIGZ1bmN0aW9uLCBzaW5jZSB0aGV5IGdldFxuICAgKiB0aGVpciBvd24gaW5pdGlhbGl6ZXIgc3RhdGVtZW50IHRoYXQgbmVlZHMgdG8gYmUgcGFyc2VkIGFuZCB0aGVuIG5vdCBpbmNsdWRlZCBpbiB0aGUgXCJib2R5XCJcbiAgICogc3RhdGVtZW50cyBvZiB0aGUgZnVuY3Rpb24uXG4gICAqIEBwYXJhbSBub2RlIHRoZSBmdW5jdGlvbiBkZWNsYXJhdGlvbiB0byBwYXJzZS5cbiAgICovXG4gIGdldERlZmluaXRpb25PZkZ1bmN0aW9uPFQgZXh0ZW5kcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5GdW5jdGlvbkV4cHJlc3Npb24+KG5vZGU6IFQpOiBGdW5jdGlvbkRlZmluaXRpb248VD4ge1xuICAgIGNvbnN0IHBhcmFtZXRlcnMgPVxuICAgICAgICBub2RlLnBhcmFtZXRlcnMubWFwKHAgPT4gKHtuYW1lOiBnZXROYW1lVGV4dChwLm5hbWUpLCBub2RlOiBwLCBpbml0aWFsaXplcjogbnVsbH0pKTtcbiAgICBsZXQgbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzID0gdHJ1ZTtcblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBub2RlLmJvZHkgJiYgbm9kZS5ib2R5LnN0YXRlbWVudHMuZmlsdGVyKHMgPT4ge1xuICAgICAgbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzID1cbiAgICAgICAgICBsb29raW5nRm9yUGFyYW1Jbml0aWFsaXplcnMgJiYgcmVmbGVjdFBhcmFtSW5pdGlhbGl6ZXIocywgcGFyYW1ldGVycyk7XG4gICAgICAvLyBJZiB3ZSBhcmUgbm8gbG9uZ2VyIGxvb2tpbmcgZm9yIHBhcmFtZXRlciBpbml0aWFsaXplcnMgdGhlbiB3ZSBpbmNsdWRlIHRoaXMgc3RhdGVtZW50XG4gICAgICByZXR1cm4gIWxvb2tpbmdGb3JQYXJhbUluaXRpYWxpemVycztcbiAgICB9KTtcblxuICAgIHJldHVybiB7bm9kZSwgYm9keTogc3RhdGVtZW50cyB8fCBudWxsLCBwYXJhbWV0ZXJzfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbnMgb2YgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBjbGFzcyBpZGVudGlmaWVkIGJ5IGl0cyBzeW1ib2wuXG4gICAqIEluIEVTTTUgdGhlcmUgaXMgbm8gXCJjbGFzc1wiIHNvIHRoZSBjb25zdHJ1Y3RvciB0aGF0IHdlIHdhbnQgaXMgYWN0dWFsbHkgdGhlIGRlY2xhcmF0aW9uXG4gICAqIGZ1bmN0aW9uIGl0c2VsZi5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbDogdHMuU3ltYm9sKTogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25bXSB7XG4gICAgY29uc3QgY29uc3RydWN0b3IgPSBjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uIGFzIHRzLkZ1bmN0aW9uRGVjbGFyYXRpb247XG4gICAgaWYgKGNvbnN0cnVjdG9yICYmIGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpIHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpO1xuICAgIH1cbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvKipcbiAgICogQ29uc3RydWN0b3JzIHBhcmFtZXRlciBkZWNvcmF0b3JzIGFyZSBkZWNsYXJlZCBpbiB0aGUgYm9keSBvZiBzdGF0aWMgbWV0aG9kIG9mIHRoZSBjb25zdHJ1Y3RvclxuICAgKiBmdW5jdGlvbiBpbiBFUzUuIE5vdGUgdGhhdCB1bmxpa2UgRVNNMjEwNSB0aGlzIGlzIGEgZnVuY3Rpb24gZXhwcmVzc2lvbiByYXRoZXIgdGhhbiBhbiBhcnJvd1xuICAgKiBmdW5jdGlvbjpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIFtcbiAgICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gICAqICAgeyB0eXBlOiBUZW1wbGF0ZVJlZiwgfSxcbiAgICogICB7IHR5cGU6IEl0ZXJhYmxlRGlmZmVycywgfSxcbiAgICogICB7IHR5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU4sXSB9LF0gfSxcbiAgICogXTsgfTtcbiAgICogYGBgXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JEZWNvcmF0b3JzKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpOiAoTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj58bnVsbClbXSB7XG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSBjbGFzc1N5bWJvbC5leHBvcnRzICYmIGNsYXNzU3ltYm9sLmV4cG9ydHMuZ2V0KENPTlNUUlVDVE9SX1BBUkFNUyk7XG4gICAgY29uc3QgcGFyYW1EZWNvcmF0b3JzUHJvcGVydHkgPSBkZWNsYXJhdGlvbiAmJiBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChkZWNsYXJhdGlvbik7XG4gICAgY29uc3QgcmV0dXJuU3RhdGVtZW50ID0gZ2V0UmV0dXJuU3RhdGVtZW50KHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICBjb25zdCBleHByZXNzaW9uID0gcmV0dXJuU3RhdGVtZW50ICYmIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uO1xuICAgIHJldHVybiBleHByZXNzaW9uICYmIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihleHByZXNzaW9uKSA/XG4gICAgICAgIGV4cHJlc3Npb24uZWxlbWVudHMubWFwKHJlZmxlY3RBcnJheUVsZW1lbnQpIDpcbiAgICAgICAgW107XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVmbGVjdE1lbWJlcihzeW1ib2w6IHRzLlN5bWJvbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLCBpc1N0YXRpYz86IGJvb2xlYW4pOlxuICAgICAgQ2xhc3NNZW1iZXJ8bnVsbCB7XG4gICAgY29uc3QgbWVtYmVyID0gc3VwZXIucmVmbGVjdE1lbWJlcihzeW1ib2wsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICBpZiAobWVtYmVyICYmIG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuTWV0aG9kICYmIG1lbWJlci5pc1N0YXRpYyAmJiBtZW1iZXIubm9kZSAmJlxuICAgICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihtZW1iZXIubm9kZSkgJiYgbWVtYmVyLm5vZGUucGFyZW50ICYmXG4gICAgICAgIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihtZW1iZXIubm9kZS5wYXJlbnQpICYmXG4gICAgICAgIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKG1lbWJlci5ub2RlLnBhcmVudC5yaWdodCkpIHtcbiAgICAgIC8vIFJlY29tcHV0ZSB0aGUgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWVtYmVyOlxuICAgICAgLy8gRVM1IHN0YXRpYyBtZXRob2RzIGFyZSB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgc28gdGhlIGRlY2xhcmF0aW9uIGlzIGFjdHVhbGx5IHRoZVxuICAgICAgLy8gaW5pdGlhbGl6ZXIgb2YgdGhlIHZhcmlhYmxlIGFzc2lnbm1lbnRcbiAgICAgIG1lbWJlci5pbXBsZW1lbnRhdGlvbiA9IG1lbWJlci5ub2RlLnBhcmVudC5yaWdodDtcbiAgICB9XG4gICAgcmV0dXJuIG1lbWJlcjtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRJaWZlQm9keShkZWNsYXJhdGlvbjogdHMuVmFyaWFibGVEZWNsYXJhdGlvbik6IHRzLkJsb2NrfHVuZGVmaW5lZCB7XG4gIGlmICghZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgfHwgIXRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24oZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIpKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBjYWxsID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gIHJldHVybiB0cy5pc0NhbGxFeHByZXNzaW9uKGNhbGwuZXhwcmVzc2lvbikgJiZcbiAgICAgICAgICB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihjYWxsLmV4cHJlc3Npb24uZXhwcmVzc2lvbikgP1xuICAgICAgY2FsbC5leHByZXNzaW9uLmV4cHJlc3Npb24uYm9keSA6XG4gICAgICB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGdldFJldHVybklkZW50aWZpZXIoYm9keTogdHMuQmxvY2spOiB0cy5JZGVudGlmaWVyfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHJldHVyblN0YXRlbWVudCA9IGJvZHkuc3RhdGVtZW50cy5maW5kKHRzLmlzUmV0dXJuU3RhdGVtZW50KTtcbiAgcmV0dXJuIHJldHVyblN0YXRlbWVudCAmJiByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbiAmJlxuICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihyZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbikgP1xuICAgICAgcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24gOlxuICAgICAgdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBnZXRSZXR1cm5TdGF0ZW1lbnQoZGVjbGFyYXRpb246IHRzLkV4cHJlc3Npb24gfCB1bmRlZmluZWQpOiB0cy5SZXR1cm5TdGF0ZW1lbnR8dW5kZWZpbmVkIHtcbiAgcmV0dXJuIGRlY2xhcmF0aW9uICYmIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGRlY2xhcmF0aW9uKSA/XG4gICAgICBkZWNsYXJhdGlvbi5ib2R5LnN0YXRlbWVudHMuZmluZCh0cy5pc1JldHVyblN0YXRlbWVudCkgOlxuICAgICAgdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiByZWZsZWN0QXJyYXlFbGVtZW50KGVsZW1lbnQ6IHRzLkV4cHJlc3Npb24pIHtcbiAgcmV0dXJuIHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oZWxlbWVudCkgPyByZWZsZWN0T2JqZWN0TGl0ZXJhbChlbGVtZW50KSA6IG51bGw7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIHN0YXRlbWVudCB0byBleHRyYWN0IHRoZSBFU001IHBhcmFtZXRlciBpbml0aWFsaXplciBpZiB0aGVyZSBpcyBvbmUuXG4gKiBJZiBvbmUgaXMgZm91bmQsIGFkZCBpdCB0byB0aGUgYXBwcm9wcmlhdGUgcGFyYW1ldGVyIGluIHRoZSBgcGFyYW1ldGVyc2AgY29sbGVjdGlvbi5cbiAqXG4gKiBUaGUgZm9ybSB3ZSBhcmUgbG9va2luZyBmb3IgaXM6XG4gKlxuICogYGBgXG4gKiBpZiAoYXJnID09PSB2b2lkIDApIHsgYXJnID0gaW5pdGlhbGl6ZXI7IH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzdGF0ZW1lbnQgQSBzdGF0ZW1lbnQgdGhhdCBtYXkgYmUgaW5pdGlhbGl6aW5nIGFuIG9wdGlvbmFsIHBhcmFtZXRlclxuICogQHBhcmFtIHBhcmFtZXRlcnMgVGhlIGNvbGxlY3Rpb24gb2YgcGFyYW1ldGVycyB0aGF0IHdlcmUgZm91bmQgaW4gdGhlIGZ1bmN0aW9uIGRlZmluaXRpb25cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCB3YXMgYSBwYXJhbWV0ZXIgaW5pdGlhbGl6ZXJcbiAqL1xuZnVuY3Rpb24gcmVmbGVjdFBhcmFtSW5pdGlhbGl6ZXIoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQsIHBhcmFtZXRlcnM6IFBhcmFtZXRlcltdKSB7XG4gIGlmICh0cy5pc0lmU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgaXNVbmRlZmluZWRDb21wYXJpc29uKHN0YXRlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNCbG9jayhzdGF0ZW1lbnQudGhlblN0YXRlbWVudCkgJiYgc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCBpZlN0YXRlbWVudENvbXBhcmlzb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjsgICAgICAgICAgIC8vIChhcmcgPT09IHZvaWQgMClcbiAgICBjb25zdCB0aGVuU3RhdGVtZW50ID0gc3RhdGVtZW50LnRoZW5TdGF0ZW1lbnQuc3RhdGVtZW50c1swXTsgIC8vIGFyZyA9IGluaXRpYWxpemVyO1xuICAgIGlmIChpc0Fzc2lnbm1lbnQodGhlblN0YXRlbWVudCkpIHtcbiAgICAgIGNvbnN0IGNvbXBhcmlzb25OYW1lID0gaWZTdGF0ZW1lbnRDb21wYXJpc29uLmxlZnQudGV4dDtcbiAgICAgIGNvbnN0IGFzc2lnbm1lbnROYW1lID0gdGhlblN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQudGV4dDtcbiAgICAgIGlmIChjb21wYXJpc29uTmFtZSA9PT0gYXNzaWdubWVudE5hbWUpIHtcbiAgICAgICAgY29uc3QgcGFyYW1ldGVyID0gcGFyYW1ldGVycy5maW5kKHAgPT4gcC5uYW1lID09PSBjb21wYXJpc29uTmFtZSk7XG4gICAgICAgIGlmIChwYXJhbWV0ZXIpIHtcbiAgICAgICAgICBwYXJhbWV0ZXIuaW5pdGlhbGl6ZXIgPSB0aGVuU3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQ7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZENvbXBhcmlzb24oZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGV4cHJlc3Npb24gaXMgdHMuRXhwcmVzc2lvbiZcbiAgICB7bGVmdDogdHMuSWRlbnRpZmllciwgcmlnaHQ6IHRzLkV4cHJlc3Npb259IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihleHByZXNzaW9uKSAmJlxuICAgICAgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW4gJiZcbiAgICAgIHRzLmlzVm9pZEV4cHJlc3Npb24oZXhwcmVzc2lvbi5yaWdodCkgJiYgdHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24ubGVmdCk7XG59XG5cbmZ1bmN0aW9uIGlzQXNzaWdubWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHN0YXRlbWVudCBpcyB0cy5FeHByZXNzaW9uU3RhdGVtZW50JlxuICAgIHtleHByZXNzaW9uOiB7bGVmdDogdHMuSWRlbnRpZmllciwgcmlnaHQ6IHRzLkV4cHJlc3Npb259fSB7XG4gIHJldHVybiB0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RhdGVtZW50KSAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24oc3RhdGVtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4gJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0KTtcbn1cbiJdfQ==