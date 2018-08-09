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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFDakMsNkRBQTJHO0lBQzNHLHFFQUE2RDtJQUM3RCxrRUFBcUM7SUFDckMsdUZBQXVHO0lBRXZHOzs7Ozs7Ozs7Ozs7Ozs7O09BZ0JHO0lBQ0g7UUFBd0MsOENBQXNCO1FBQzVELDRCQUFZLE9BQXVCO21CQUFJLGtCQUFNLE9BQU8sQ0FBQztRQUFFLENBQUM7UUFFeEQ7O1dBRUc7UUFDSCxvQ0FBTyxHQUFQLFVBQVEsSUFBYSxJQUFhLE9BQU8saUJBQU0sT0FBTyxZQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU5Rjs7Ozs7Ozs7Ozs7Ozs7O1dBZUc7UUFDSCwyQ0FBYyxHQUFkLFVBQWUsSUFBYTtZQUMxQixJQUFNLE1BQU0sR0FBRyxpQkFBTSxjQUFjLFlBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUMsSUFBSSxNQUFNO2dCQUFFLE9BQU8sTUFBTSxDQUFDO1lBRTFCLElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNsQyxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxRQUFRO29CQUFFLE9BQU8sU0FBUyxDQUFDO2dCQUVoQyxJQUFNLG9CQUFvQixHQUFHLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMzRCxJQUFJLENBQUMsb0JBQW9CO29CQUFFLE9BQU8sU0FBUyxDQUFDO2dCQUU1QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1C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QztJQUVELCtCQUErQixVQUF5QjtRQUV0RCxPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUM7WUFDcEMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUI7WUFDdkUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRUQsc0JBQXNCLFNBQXVCO1FBRTNDLE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDO1lBQ3JGLFNBQVMsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVc7WUFDckUsRUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBEZWNvcmF0b3IsIEZ1bmN0aW9uRGVmaW5pdGlvbiwgUGFyYW1ldGVyfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9ob3N0JztcbmltcG9ydCB7cmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uLy4uL25ndHNjL21ldGFkYXRhJztcbmltcG9ydCB7Z2V0TmFtZVRleHR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7Q09OU1RSVUNUT1JfUEFSQU1TLCBGZXNtMjAxNVJlZmxlY3Rpb25Ib3N0LCBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbH0gZnJvbSAnLi9mZXNtMjAxNV9ob3N0JztcblxuLyoqXG4gKiBFU001IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCBJSUZFIGZ1bmN0aW9ucyB0aGF0IGFjdCBsaWtlIGNsYXNzZXMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogdmFyIENvbW1vbk1vZHVsZSA9IChmdW5jdGlvbiAoKSB7XG4gKiAgZnVuY3Rpb24gQ29tbW9uTW9kdWxlKCkge1xuICogIH1cbiAqICBDb21tb25Nb2R1bGUuZGVjb3JhdG9ycyA9IFsgLi4uIF07XG4gKiBgYGBcbiAqXG4gKiAqIFwiQ2xhc3Nlc1wiIGFyZSBkZWNvcmF0ZWQgaWYgdGhleSBoYXZlIGEgc3RhdGljIHByb3BlcnR5IGNhbGxlZCBgZGVjb3JhdG9yc2AuXG4gKiAqIE1lbWJlcnMgYXJlIGRlY29yYXRlZCBpZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGtleSBvbiBhIHN0YXRpYyBwcm9wZXJ0eVxuICogICBjYWxsZWQgYHByb3BEZWNvcmF0b3JzYC5cbiAqICogQ29uc3RydWN0b3IgcGFyYW1ldGVycyBkZWNvcmF0b3JzIGFyZSBmb3VuZCBvbiBhbiBvYmplY3QgcmV0dXJuZWQgZnJvbVxuICogICBhIHN0YXRpYyBtZXRob2QgY2FsbGVkIGBjdG9yUGFyYW1ldGVyc2AuXG4gKlxuICovXG5leHBvcnQgY2xhc3MgRXNtNVJlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgRmVzbTIwMTVSZWZsZWN0aW9uSG9zdCB7XG4gIGNvbnN0cnVjdG9yKGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKSB7IHN1cGVyKGNoZWNrZXIpOyB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgdGhlIGdpdmVuIG5vZGUgYWN0dWFsbHkgcmVwcmVzZW50cyBhIGNsYXNzLlxuICAgKi9cbiAgaXNDbGFzcyhub2RlOiB0cy5Ob2RlKTogYm9vbGVhbiB7IHJldHVybiBzdXBlci5pc0NsYXNzKG5vZGUpIHx8ICEhdGhpcy5nZXRDbGFzc1N5bWJvbChub2RlKTsgfVxuXG4gIC8qKlxuICAgKiBGaW5kIGEgc3ltYm9sIGZvciBhIG5vZGUgdGhhdCB3ZSB0aGluayBpcyBhIGNsYXNzLlxuICAgKlxuICAgKiBJbiBFUzUsIHRoZSBpbXBsZW1lbnRhdGlvbiBvZiBhIGNsYXNzIGlzIGEgZnVuY3Rpb24gZXhwcmVzc2lvbiB0aGF0IGlzIGhpZGRlbiBpbnNpZGUgYW4gSUlGRS5cbiAgICogU28gd2UgbmVlZCB0byBkaWcgYXJvdW5kIGluc2lkZSB0byBnZXQgaG9sZCBvZiB0aGUgXCJjbGFzc1wiIHN5bWJvbC5cbiAgICpcbiAgICogYG5vZGVgIG1pZ2h0IGJlIG9uZSBvZjpcbiAgICogLSBBIGNsYXNzIGRlY2xhcmF0aW9uIChmcm9tIGEgZGVjbGFyYXRpb24gZmlsZSkuXG4gICAqIC0gVGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBvdXRlciB2YXJpYWJsZSwgd2hpY2ggaXMgYXNzaWduZWQgdGhlIHJlc3VsdCBvZiB0aGUgSUlGRS5cbiAgICogLSBUaGUgZnVuY3Rpb24gZGVjbGFyYXRpb24gaW5zaWRlIHRoZSBJSUZFLCB3aGljaCBpcyBldmVudHVhbGx5IHJldHVybmVkIGFuZCBhc3NpZ25lZCB0byB0aGVcbiAgICogICBvdXRlciB2YXJpYWJsZS5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgVGhlIHRvcCBsZXZlbCBkZWNsYXJhdGlvbiB0aGF0IHJlcHJlc2VudHMgYW4gZXhwb3J0ZWQgY2xhc3Mgb3IgdGhlIGZ1bmN0aW9uXG4gICAqICAgICBleHByZXNzaW9uIGluc2lkZSB0aGUgSUlGRS5cbiAgICogQHJldHVybnMgVGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiIG9yIGhhcyBubyBzeW1ib2wuXG4gICAqL1xuICBnZXRDbGFzc1N5bWJvbChub2RlOiB0cy5Ob2RlKTogdHMuU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3ltYm9sID0gc3VwZXIuZ2V0Q2xhc3NTeW1ib2wobm9kZSk7XG4gICAgaWYgKHN5bWJvbCkgcmV0dXJuIHN5bWJvbDtcblxuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGNvbnN0IGlpZmVCb2R5ID0gZ2V0SWlmZUJvZHkobm9kZSk7XG4gICAgICBpZiAoIWlpZmVCb2R5KSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgICBjb25zdCBpbm5lckNsYXNzSWRlbnRpZmllciA9IGdldFJldHVybklkZW50aWZpZXIoaWlmZUJvZHkpO1xuICAgICAgaWYgKCFpbm5lckNsYXNzSWRlbnRpZmllcikgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgcmV0dXJuIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlubmVyQ2xhc3NJZGVudGlmaWVyKTtcbiAgICB9XG5cbiAgICBpZiAodHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAvLyBJdCBtaWdodCBiZSB0aGUgZnVuY3Rpb24gZXhwcmVzc2lvbiBpbnNpZGUgdGhlIElJRkUuIFdlIG5lZWQgdG8gZ28gNSBsZXZlbHMgdXAuLi5cblxuICAgICAgLy8gMS4gSUlGRSBib2R5LlxuICAgICAgbGV0IG91dGVyTm9kZSA9IG5vZGUucGFyZW50O1xuICAgICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzQmxvY2sob3V0ZXJOb2RlKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgLy8gMi4gSUlGRSBmdW5jdGlvbiBleHByZXNzaW9uLlxuICAgICAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcbiAgICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgICAvLyAzLiBJSUZFIGNhbGwgZXhwcmVzc2lvbi5cbiAgICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNDYWxsRXhwcmVzc2lvbihvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgICAvLyA0LiBQYXJlbnRoZXNpcyBhcm91bmQgSUlGRS5cbiAgICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihvdXRlck5vZGUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgICAvLyA1LiBPdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gICAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG91dGVyTm9kZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgIHJldHVybiB0aGlzLmdldENsYXNzU3ltYm9sKG91dGVyTm9kZSk7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgYSBmdW5jdGlvbiBkZWNsYXJhdGlvbiB0byBmaW5kIHRoZSByZWxldmFudCBtZXRhZGF0YSBhYm91dCBpdC5cbiAgICogSW4gRVNNNSB3ZSBuZWVkIHRvIGRvIHNwZWNpYWwgd29yayB3aXRoIG9wdGlvbmFsIGFyZ3VtZW50cyB0byB0aGUgZnVuY3Rpb24sIHNpbmNlIHRoZXkgZ2V0XG4gICAqIHRoZWlyIG93biBpbml0aWFsaXplciBzdGF0ZW1lbnQgdGhhdCBuZWVkcyB0byBiZSBwYXJzZWQgYW5kIHRoZW4gbm90IGluY2x1ZGVkIGluIHRoZSBcImJvZHlcIlxuICAgKiBzdGF0ZW1lbnRzIG9mIHRoZSBmdW5jdGlvbi5cbiAgICogQHBhcmFtIG5vZGUgdGhlIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIHRvIHBhcnNlLlxuICAgKi9cbiAgZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb248VCBleHRlbmRzIHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRzLkZ1bmN0aW9uRXhwcmVzc2lvbj4obm9kZTogVCk6IEZ1bmN0aW9uRGVmaW5pdGlvbjxUPiB7XG4gICAgY29uc3QgcGFyYW1ldGVycyA9XG4gICAgICAgIG5vZGUucGFyYW1ldGVycy5tYXAocCA9PiAoe25hbWU6IGdldE5hbWVUZXh0KHAubmFtZSksIG5vZGU6IHAsIGluaXRpYWxpemVyOiBudWxsfSkpO1xuICAgIGxldCBsb29raW5nRm9yUGFyYW1Jbml0aWFsaXplcnMgPSB0cnVlO1xuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IG5vZGUuYm9keSAmJiBub2RlLmJvZHkuc3RhdGVtZW50cy5maWx0ZXIocyA9PiB7XG4gICAgICBsb29raW5nRm9yUGFyYW1Jbml0aWFsaXplcnMgPVxuICAgICAgICAgIGxvb2tpbmdGb3JQYXJhbUluaXRpYWxpemVycyAmJiByZWZsZWN0UGFyYW1Jbml0aWFsaXplcihzLCBwYXJhbWV0ZXJzKTtcbiAgICAgIC8vIElmIHdlIGFyZSBubyBsb25nZXIgbG9va2luZyBmb3IgcGFyYW1ldGVyIGluaXRpYWxpemVycyB0aGVuIHdlIGluY2x1ZGUgdGhpcyBzdGF0ZW1lbnRcbiAgICAgIHJldHVybiAhbG9va2luZ0ZvclBhcmFtSW5pdGlhbGl6ZXJzO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtub2RlLCBib2R5OiBzdGF0ZW1lbnRzIHx8IG51bGwsIHBhcmFtZXRlcnN9O1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIGRlY2xhcmF0aW9ucyBvZiB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIGNsYXNzIGlkZW50aWZpZWQgYnkgaXRzIHN5bWJvbC5cbiAgICogSW4gRVNNNSB0aGVyZSBpcyBubyBcImNsYXNzXCIgc28gdGhlIGNvbnN0cnVjdG9yIHRoYXQgd2Ugd2FudCBpcyBhY3R1YWxseSB0aGUgZGVjbGFyYXRpb25cbiAgICogZnVuY3Rpb24gaXRzZWxmLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1ldGVyRGVjbGFyYXRpb25zKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdIHtcbiAgICBjb25zdCBjb25zdHJ1Y3RvciA9IGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gYXMgdHMuRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICBpZiAoY29uc3RydWN0b3IgJiYgY29uc3RydWN0b3IucGFyYW1ldGVycykge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oY29uc3RydWN0b3IucGFyYW1ldGVycyk7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RvcnMgcGFyYW1ldGVyIGRlY29yYXRvcnMgYXJlIGRlY2xhcmVkIGluIHRoZSBib2R5IG9mIHN0YXRpYyBtZXRob2Qgb2YgdGhlIGNvbnN0cnVjdG9yXG4gICAqIGZ1bmN0aW9uIGluIEVTNS4gTm90ZSB0aGF0IHVubGlrZSBFU00yMTA1IHRoaXMgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHJhdGhlciB0aGFuIGFuIGFycm93XG4gICAqIGZ1bmN0aW9uOlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gW1xuICAgKiAgIHsgdHlwZTogVmlld0NvbnRhaW5lclJlZiwgfSxcbiAgICogICB7IHR5cGU6IFRlbXBsYXRlUmVmLCB9LFxuICAgKiAgIHsgdHlwZTogSXRlcmFibGVEaWZmZXJzLCB9LFxuICAgKiAgIHsgdHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTixdIH0sXSB9LFxuICAgKiBdOyB9O1xuICAgKiBgYGBcbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvckRlY29yYXRvcnMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCk6IChNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPnxudWxsKVtdIHtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGNsYXNzU3ltYm9sLmV4cG9ydHMgJiYgY2xhc3NTeW1ib2wuZXhwb3J0cy5nZXQoQ09OU1RSVUNUT1JfUEFSQU1TKTtcbiAgICBjb25zdCBwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSA9IGRlY2xhcmF0aW9uICYmIGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKGRlY2xhcmF0aW9uKTtcbiAgICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBnZXRSZXR1cm5TdGF0ZW1lbnQocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIGNvbnN0IGV4cHJlc3Npb24gPSByZXR1cm5TdGF0ZW1lbnQgJiYgcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb247XG4gICAgcmV0dXJuIGV4cHJlc3Npb24gJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGV4cHJlc3Npb24pID9cbiAgICAgICAgZXhwcmVzc2lvbi5lbGVtZW50cy5tYXAocmVmbGVjdEFycmF5RWxlbWVudCkgOlxuICAgICAgICBbXTtcbiAgfVxuXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVyKHN5bWJvbDogdHMuU3ltYm9sLCBkZWNvcmF0b3JzPzogRGVjb3JhdG9yW10sIGlzU3RhdGljPzogYm9vbGVhbik6XG4gICAgICBDbGFzc01lbWJlcnxudWxsIHtcbiAgICBjb25zdCBtZW1iZXIgPSBzdXBlci5yZWZsZWN0TWVtYmVyKHN5bWJvbCwgZGVjb3JhdG9ycywgaXNTdGF0aWMpO1xuICAgIGlmIChtZW1iZXIgJiYgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5NZXRob2QgJiYgbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5ub2RlICYmXG4gICAgICAgIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG1lbWJlci5ub2RlKSAmJiBtZW1iZXIubm9kZS5wYXJlbnQgJiZcbiAgICAgICAgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG1lbWJlci5ub2RlLnBhcmVudCkgJiZcbiAgICAgICAgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24obWVtYmVyLm5vZGUucGFyZW50LnJpZ2h0KSkge1xuICAgICAgLy8gUmVjb21wdXRlIHRoZSBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBtZW1iZXI6XG4gICAgICAvLyBFUzUgc3RhdGljIG1ldGhvZHMgYXJlIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBzbyB0aGUgZGVjbGFyYXRpb24gaXMgYWN0dWFsbHkgdGhlXG4gICAgICAvLyBpbml0aWFsaXplciBvZiB0aGUgdmFyaWFibGUgYXNzaWdubWVudFxuICAgICAgbWVtYmVyLmltcGxlbWVudGF0aW9uID0gbWVtYmVyLm5vZGUucGFyZW50LnJpZ2h0O1xuICAgIH1cbiAgICByZXR1cm4gbWVtYmVyO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldElpZmVCb2R5KGRlY2xhcmF0aW9uOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogdHMuQmxvY2t8dW5kZWZpbmVkIHtcbiAgaWYgKCFkZWNsYXJhdGlvbi5pbml0aWFsaXplciB8fCAhdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihkZWNsYXJhdGlvbi5pbml0aWFsaXplcikpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGNhbGwgPSBkZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgcmV0dXJuIHRzLmlzQ2FsbEV4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uKSAmJlxuICAgICAgICAgIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGNhbGwuZXhwcmVzc2lvbi5leHByZXNzaW9uKSA/XG4gICAgICBjYWxsLmV4cHJlc3Npb24uZXhwcmVzc2lvbi5ib2R5IDpcbiAgICAgIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZ2V0UmV0dXJuSWRlbnRpZmllcihib2R5OiB0cy5CbG9jayk6IHRzLklkZW50aWZpZXJ8dW5kZWZpbmVkIHtcbiAgY29uc3QgcmV0dXJuU3RhdGVtZW50ID0gYm9keS5zdGF0ZW1lbnRzLmZpbmQodHMuaXNSZXR1cm5TdGF0ZW1lbnQpO1xuICByZXR1cm4gcmV0dXJuU3RhdGVtZW50ICYmIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uICYmXG4gICAgICAgICAgdHMuaXNJZGVudGlmaWVyKHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uKSA/XG4gICAgICByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbiA6XG4gICAgICB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGdldFJldHVyblN0YXRlbWVudChkZWNsYXJhdGlvbjogdHMuRXhwcmVzc2lvbiB8IHVuZGVmaW5lZCk6IHRzLlJldHVyblN0YXRlbWVudHx1bmRlZmluZWQge1xuICByZXR1cm4gZGVjbGFyYXRpb24gJiYgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZGVjbGFyYXRpb24pID9cbiAgICAgIGRlY2xhcmF0aW9uLmJvZHkuc3RhdGVtZW50cy5maW5kKHRzLmlzUmV0dXJuU3RhdGVtZW50KSA6XG4gICAgICB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIHJlZmxlY3RBcnJheUVsZW1lbnQoZWxlbWVudDogdHMuRXhwcmVzc2lvbikge1xuICByZXR1cm4gdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbDtcbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgc3RhdGVtZW50IHRvIGV4dHJhY3QgdGhlIEVTTTUgcGFyYW1ldGVyIGluaXRpYWxpemVyIGlmIHRoZXJlIGlzIG9uZS5cbiAqIElmIG9uZSBpcyBmb3VuZCwgYWRkIGl0IHRvIHRoZSBhcHByb3ByaWF0ZSBwYXJhbWV0ZXIgaW4gdGhlIGBwYXJhbWV0ZXJzYCBjb2xsZWN0aW9uLlxuICpcbiAqIFRoZSBmb3JtIHdlIGFyZSBsb29raW5nIGZvciBpczpcbiAqXG4gKiBgYGBcbiAqIGlmIChhcmcgPT09IHZvaWQgMCkgeyBhcmcgPSBpbml0aWFsaXplcjsgfVxuICogYGBgXG4gKlxuICogQHBhcmFtIHN0YXRlbWVudCBBIHN0YXRlbWVudCB0aGF0IG1heSBiZSBpbml0aWFsaXppbmcgYW4gb3B0aW9uYWwgcGFyYW1ldGVyXG4gKiBAcGFyYW0gcGFyYW1ldGVycyBUaGUgY29sbGVjdGlvbiBvZiBwYXJhbWV0ZXJzIHRoYXQgd2VyZSBmb3VuZCBpbiB0aGUgZnVuY3Rpb24gZGVmaW5pdGlvblxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgc3RhdGVtZW50IHdhcyBhIHBhcmFtZXRlciBpbml0aWFsaXplclxuICovXG5mdW5jdGlvbiByZWZsZWN0UGFyYW1Jbml0aWFsaXplcihzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCwgcGFyYW1ldGVyczogUGFyYW1ldGVyW10pIHtcbiAgaWYgKHRzLmlzSWZTdGF0ZW1lbnQoc3RhdGVtZW50KSAmJiBpc1VuZGVmaW5lZENvbXBhcmlzb24oc3RhdGVtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc0Jsb2NrKHN0YXRlbWVudC50aGVuU3RhdGVtZW50KSAmJiBzdGF0ZW1lbnQudGhlblN0YXRlbWVudC5zdGF0ZW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNvbnN0IGlmU3RhdGVtZW50Q29tcGFyaXNvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uOyAgICAgICAgICAgLy8gKGFyZyA9PT0gdm9pZCAwKVxuICAgIGNvbnN0IHRoZW5TdGF0ZW1lbnQgPSBzdGF0ZW1lbnQudGhlblN0YXRlbWVudC5zdGF0ZW1lbnRzWzBdOyAgLy8gYXJnID0gaW5pdGlhbGl6ZXI7XG4gICAgaWYgKGlzQXNzaWdubWVudCh0aGVuU3RhdGVtZW50KSkge1xuICAgICAgY29uc3QgY29tcGFyaXNvbk5hbWUgPSBpZlN0YXRlbWVudENvbXBhcmlzb24ubGVmdC50ZXh0O1xuICAgICAgY29uc3QgYXNzaWdubWVudE5hbWUgPSB0aGVuU3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdC50ZXh0O1xuICAgICAgaWYgKGNvbXBhcmlzb25OYW1lID09PSBhc3NpZ25tZW50TmFtZSkge1xuICAgICAgICBjb25zdCBwYXJhbWV0ZXIgPSBwYXJhbWV0ZXJzLmZpbmQocCA9PiBwLm5hbWUgPT09IGNvbXBhcmlzb25OYW1lKTtcbiAgICAgICAgaWYgKHBhcmFtZXRlcikge1xuICAgICAgICAgIHBhcmFtZXRlci5pbml0aWFsaXplciA9IHRoZW5TdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodDtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkQ29tcGFyaXNvbihleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogZXhwcmVzc2lvbiBpcyB0cy5FeHByZXNzaW9uJlxuICAgIHtsZWZ0OiB0cy5JZGVudGlmaWVyLCByaWdodDogdHMuRXhwcmVzc2lvbn0ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKGV4cHJlc3Npb24pICYmXG4gICAgICBleHByZXNzaW9uLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNFcXVhbHNUb2tlbiAmJlxuICAgICAgdHMuaXNWb2lkRXhwcmVzc2lvbihleHByZXNzaW9uLnJpZ2h0KSAmJiB0cy5pc0lkZW50aWZpZXIoZXhwcmVzc2lvbi5sZWZ0KTtcbn1cblxuZnVuY3Rpb24gaXNBc3NpZ25tZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogc3RhdGVtZW50IGlzIHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQmXG4gICAge2V4cHJlc3Npb246IHtsZWZ0OiB0cy5JZGVudGlmaWVyLCByaWdodDogdHMuRXhwcmVzc2lvbn19IHtcbiAgcmV0dXJuIHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpICYmIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihzdGF0ZW1lbnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIHN0YXRlbWVudC5leHByZXNzaW9uLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQpO1xufVxuIl19