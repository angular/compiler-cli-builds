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
        define("@angular/compiler-cli/src/ngcc/src/host/esm5_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/host/src/reflection", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector", "@angular/compiler-cli/src/ngcc/src/host/esm2015_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/host/src/reflection");
    var reflector_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/reflector");
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
        function Esm5ReflectionHost(checker) {
            return _super.call(this, checker) || this;
        }
        /**
         * Check whether the given declaration node actually represents a class.
         */
        Esm5ReflectionHost.prototype.isClass = function (node) { return !!this.getClassSymbol(node); };
        /**
         * In ESM5 the implementation of a class is a function expression that is hidden inside an IIFE.
         * So we need to dig around inside to get hold of the "class" symbol.
         * @param declaration the top level declaration that represents an exported class.
         */
        Esm5ReflectionHost.prototype.getClassSymbol = function (declaration) {
            if (ts.isVariableDeclaration(declaration)) {
                var iifeBody = getIifeBody(declaration);
                if (iifeBody) {
                    var innerClassIdentifier = getReturnIdentifier(iifeBody);
                    if (innerClassIdentifier) {
                        return this.checker.getSymbolAtLocation(innerClassIdentifier);
                    }
                }
            }
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
            var declaration = classSymbol.exports && classSymbol.exports.get(esm2015_host_1.CONSTRUCTOR_PARAMS);
            var paramDecoratorsProperty = declaration && esm2015_host_1.getPropertyValueFromSymbol(declaration);
            var returnStatement = getReturnStatement(paramDecoratorsProperty);
            var expression = returnStatement && returnStatement.expression;
            return expression && ts.isArrayLiteralExpression(expression) ?
                expression.elements.map(reflectArrayElement) :
                [];
        };
        Esm5ReflectionHost.prototype.reflectMember = function (symbol, decorators, isStatic) {
            var member = _super.prototype.reflectMember.call(this, symbol, decorators, isStatic);
            if (member && member.kind === reflection_1.ClassMemberKind.Method && member.isStatic && member.node &&
                ts.isPropertyAccessExpression(member.node) && member.node.parent &&
                ts.isBinaryExpression(member.node.parent) &&
                ts.isFunctionExpression(member.node.parent.right)) {
                debugger;
                // Recompute the implementation for this member:
                // ES5 static methods are variable declarations so the declaration is actually the
                // initializer of the variable assignment
                member.implementation = member.node.parent.right;
            }
            return member;
        };
        return Esm5ReflectionHost;
    }(esm2015_host_1.Esm2015ReflectionHost));
    exports.Esm5ReflectionHost = Esm5ReflectionHost;
    function getIifeBody(declaration) {
        if (declaration.initializer && ts.isParenthesizedExpression(declaration.initializer)) {
            var call = declaration.initializer;
            if (ts.isCallExpression(call.expression) &&
                ts.isFunctionExpression(call.expression.expression)) {
                return call.expression.expression.body;
            }
        }
    }
    function getReturnIdentifier(body) {
        var returnStatement = body.statements.find(ts.isReturnStatement);
        if (returnStatement && returnStatement.expression &&
            ts.isIdentifier(returnStatement.expression)) {
            return returnStatement.expression;
        }
    }
    function getReturnStatement(declaration) {
        if (declaration && ts.isFunctionExpression(declaration)) {
            return declaration.body.statements.find(ts.isReturnStatement);
        }
    }
    function reflectArrayElement(element) {
        return ts.isObjectLiteralExpression(element) ? reflector_1.reflectObjectLiteral(element) : null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsa0ZBQWdGO0lBQ2hGLG9GQUEyRTtJQUMzRSxxRkFBcUc7SUFFckc7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSDtRQUF3Qyw4Q0FBcUI7UUFDM0QsNEJBQVksT0FBdUI7bUJBQUksa0JBQU0sT0FBTyxDQUFDO1FBQUUsQ0FBQztRQUV4RDs7V0FFRztRQUNILG9DQUFPLEdBQVAsVUFBUSxJQUFvQixJQUFhLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlFOzs7O1dBSUc7UUFDSCwyQ0FBYyxHQUFkLFVBQWUsV0FBMkI7WUFDeEMsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQ3pDLElBQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDMUMsSUFBSSxRQUFRLEVBQUU7b0JBQ1osSUFBTSxvQkFBb0IsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDM0QsSUFBSSxvQkFBb0IsRUFBRTt3QkFDeEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixDQUFDLENBQUM7cUJBQy9EO2lCQUNGO2FBQ0Y7UUFDSCxDQUFDO1FBRUQ7Ozs7V0FJRztRQUNPLGdFQUFtQyxHQUE3QyxVQUE4QyxXQUFzQjtZQUNsRSxJQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsZ0JBQTBDLENBQUM7WUFDM0UsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLFVBQVUsRUFBRTtnQkFDekMs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QW9CLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDdkQsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUM7U0FDL0Q7SUFDSCxDQUFDO0lBRUQsNkJBQTZCLE9BQXNCO1FBQ2pELE9BQU8sRUFBRSxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQ0FBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3RGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtEZWNvcmF0b3J9IGZyb20gJy4uLy4uLy4uL25ndHNjL2hvc3QnO1xuaW1wb3J0IHtDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9ob3N0L3NyYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7cmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uLy4uL25ndHNjL21ldGFkYXRhL3NyYy9yZWZsZWN0b3InO1xuaW1wb3J0IHtDT05TVFJVQ1RPUl9QQVJBTVMsIEVzbTIwMTVSZWZsZWN0aW9uSG9zdCwgZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2x9IGZyb20gJy4vZXNtMjAxNV9ob3N0JztcblxuLyoqXG4gKiBFU001IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCBJSUZFIGZ1bmN0aW9ucyB0aGF0IGFjdCBsaWtlIGNsYXNzZXMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogdmFyIENvbW1vbk1vZHVsZSA9IChmdW5jdGlvbiAoKSB7XG4gKiAgZnVuY3Rpb24gQ29tbW9uTW9kdWxlKCkge1xuICogIH1cbiAqICBDb21tb25Nb2R1bGUuZGVjb3JhdG9ycyA9IFsgLi4uIF07XG4gKiBgYGBcbiAqXG4gKiAqIFwiQ2xhc3Nlc1wiIGFyZSBkZWNvcmF0ZWQgaWYgdGhleSBoYXZlIGEgc3RhdGljIHByb3BlcnR5IGNhbGxlZCBgZGVjb3JhdG9yc2AuXG4gKiAqIE1lbWJlcnMgYXJlIGRlY29yYXRlZCBpZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGtleSBvbiBhIHN0YXRpYyBwcm9wZXJ0eVxuICogICBjYWxsZWQgYHByb3BEZWNvcmF0b3JzYC5cbiAqICogQ29uc3RydWN0b3IgcGFyYW1ldGVycyBkZWNvcmF0b3JzIGFyZSBmb3VuZCBvbiBhbiBvYmplY3QgcmV0dXJuZWQgZnJvbVxuICogICBhIHN0YXRpYyBtZXRob2QgY2FsbGVkIGBjdG9yUGFyYW1ldGVyc2AuXG4gKlxuICovXG5leHBvcnQgY2xhc3MgRXNtNVJlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0IHtcbiAgY29uc3RydWN0b3IoY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpIHsgc3VwZXIoY2hlY2tlcik7IH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciB0aGUgZ2l2ZW4gZGVjbGFyYXRpb24gbm9kZSBhY3R1YWxseSByZXByZXNlbnRzIGEgY2xhc3MuXG4gICAqL1xuICBpc0NsYXNzKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7IHJldHVybiAhIXRoaXMuZ2V0Q2xhc3NTeW1ib2wobm9kZSk7IH1cblxuICAvKipcbiAgICogSW4gRVNNNSB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUuXG4gICAqIFNvIHdlIG5lZWQgdG8gZGlnIGFyb3VuZCBpbnNpZGUgdG8gZ2V0IGhvbGQgb2YgdGhlIFwiY2xhc3NcIiBzeW1ib2wuXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiB0aGUgdG9wIGxldmVsIGRlY2xhcmF0aW9uIHRoYXQgcmVwcmVzZW50cyBhbiBleHBvcnRlZCBjbGFzcy5cbiAgICovXG4gIGdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICBjb25zdCBpaWZlQm9keSA9IGdldElpZmVCb2R5KGRlY2xhcmF0aW9uKTtcbiAgICAgIGlmIChpaWZlQm9keSkge1xuICAgICAgICBjb25zdCBpbm5lckNsYXNzSWRlbnRpZmllciA9IGdldFJldHVybklkZW50aWZpZXIoaWlmZUJvZHkpO1xuICAgICAgICBpZiAoaW5uZXJDbGFzc0lkZW50aWZpZXIpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaW5uZXJDbGFzc0lkZW50aWZpZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIGRlY2xhcmF0aW9ucyBvZiB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIGNsYXNzIGlkZW50aWZpZWQgYnkgaXRzIHN5bWJvbC5cbiAgICogSW4gRVNNNSB0aGVyZSBpcyBubyBcImNsYXNzXCIgc28gdGhlIGNvbnN0cnVjdG9yIHRoYXQgd2Ugd2FudCBpcyBhY3R1YWxseSB0aGUgZGVjbGFyYXRpb25cbiAgICogZnVuY3Rpb24gaXRzZWxmLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1ldGVyRGVjbGFyYXRpb25zKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdIHtcbiAgICBjb25zdCBjb25zdHJ1Y3RvciA9IGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gYXMgdHMuRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICBpZiAoY29uc3RydWN0b3IgJiYgY29uc3RydWN0b3IucGFyYW1ldGVycykge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oY29uc3RydWN0b3IucGFyYW1ldGVycyk7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RvcnMgcGFyYW1ldGVyIGRlY29yYXRvcnMgYXJlIGRlY2xhcmVkIGluIHRoZSBib2R5IG9mIHN0YXRpYyBtZXRob2Qgb2YgdGhlIGNvbnN0cnVjdG9yXG4gICAqIGZ1bmN0aW9uIGluIEVTNS4gTm90ZSB0aGF0IHVubGlrZSBFU00yMTA1IHRoaXMgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHJhdGhlciB0aGFuIGFuIGFycm93XG4gICAqIGZ1bmN0aW9uOlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gW1xuICAgKiAgIHsgdHlwZTogVmlld0NvbnRhaW5lclJlZiwgfSxcbiAgICogICB7IHR5cGU6IFRlbXBsYXRlUmVmLCB9LFxuICAgKiAgIHsgdHlwZTogSXRlcmFibGVEaWZmZXJzLCB9LFxuICAgKiAgIHsgdHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTixdIH0sXSB9LFxuICAgKiBdOyB9O1xuICAgKiBgYGBcbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvckRlY29yYXRvcnMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCk6IChNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPnxudWxsKVtdIHtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGNsYXNzU3ltYm9sLmV4cG9ydHMgJiYgY2xhc3NTeW1ib2wuZXhwb3J0cy5nZXQoQ09OU1RSVUNUT1JfUEFSQU1TKTtcbiAgICBjb25zdCBwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSA9IGRlY2xhcmF0aW9uICYmIGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKGRlY2xhcmF0aW9uKTtcbiAgICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBnZXRSZXR1cm5TdGF0ZW1lbnQocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIGNvbnN0IGV4cHJlc3Npb24gPSByZXR1cm5TdGF0ZW1lbnQgJiYgcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb247XG4gICAgcmV0dXJuIGV4cHJlc3Npb24gJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGV4cHJlc3Npb24pID9cbiAgICAgICAgZXhwcmVzc2lvbi5lbGVtZW50cy5tYXAocmVmbGVjdEFycmF5RWxlbWVudCkgOlxuICAgICAgICBbXTtcbiAgfVxuXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVyKHN5bWJvbDogdHMuU3ltYm9sLCBkZWNvcmF0b3JzPzogRGVjb3JhdG9yW10sIGlzU3RhdGljPzogYm9vbGVhbik6XG4gICAgICBDbGFzc01lbWJlcnxudWxsIHtcbiAgICBjb25zdCBtZW1iZXIgPSBzdXBlci5yZWZsZWN0TWVtYmVyKHN5bWJvbCwgZGVjb3JhdG9ycywgaXNTdGF0aWMpO1xuICAgIGlmIChtZW1iZXIgJiYgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5NZXRob2QgJiYgbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5ub2RlICYmXG4gICAgICAgIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG1lbWJlci5ub2RlKSAmJiBtZW1iZXIubm9kZS5wYXJlbnQgJiZcbiAgICAgICAgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG1lbWJlci5ub2RlLnBhcmVudCkgJiZcbiAgICAgICAgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24obWVtYmVyLm5vZGUucGFyZW50LnJpZ2h0KSkge1xuICAgICAgZGVidWdnZXI7XG4gICAgICAvLyBSZWNvbXB1dGUgdGhlIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIG1lbWJlcjpcbiAgICAgIC8vIEVTNSBzdGF0aWMgbWV0aG9kcyBhcmUgdmFyaWFibGUgZGVjbGFyYXRpb25zIHNvIHRoZSBkZWNsYXJhdGlvbiBpcyBhY3R1YWxseSB0aGVcbiAgICAgIC8vIGluaXRpYWxpemVyIG9mIHRoZSB2YXJpYWJsZSBhc3NpZ25tZW50XG4gICAgICBtZW1iZXIuaW1wbGVtZW50YXRpb24gPSBtZW1iZXIubm9kZS5wYXJlbnQucmlnaHQ7XG4gICAgfVxuICAgIHJldHVybiBtZW1iZXI7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0SWlmZUJvZHkoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiB0cy5CbG9ja3x1bmRlZmluZWQge1xuICBpZiAoZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgJiYgdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihkZWNsYXJhdGlvbi5pbml0aWFsaXplcikpIHtcbiAgICBjb25zdCBjYWxsID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uKSAmJlxuICAgICAgICB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihjYWxsLmV4cHJlc3Npb24uZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBjYWxsLmV4cHJlc3Npb24uZXhwcmVzc2lvbi5ib2R5O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRSZXR1cm5JZGVudGlmaWVyKGJvZHk6IHRzLkJsb2NrKTogdHMuSWRlbnRpZmllcnx1bmRlZmluZWQge1xuICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBib2R5LnN0YXRlbWVudHMuZmluZCh0cy5pc1JldHVyblN0YXRlbWVudCk7XG4gIGlmIChyZXR1cm5TdGF0ZW1lbnQgJiYgcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24gJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihyZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb247XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0UmV0dXJuU3RhdGVtZW50KGRlY2xhcmF0aW9uOiB0cy5FeHByZXNzaW9uIHwgdW5kZWZpbmVkKTogdHMuUmV0dXJuU3RhdGVtZW50fHVuZGVmaW5lZCB7XG4gIGlmIChkZWNsYXJhdGlvbiAmJiB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihkZWNsYXJhdGlvbikpIHtcbiAgICByZXR1cm4gZGVjbGFyYXRpb24uYm9keS5zdGF0ZW1lbnRzLmZpbmQodHMuaXNSZXR1cm5TdGF0ZW1lbnQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlZmxlY3RBcnJheUVsZW1lbnQoZWxlbWVudDogdHMuRXhwcmVzc2lvbikge1xuICByZXR1cm4gdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbDtcbn0iXX0=