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
        define("@angular/compiler-cli/src/ngcc/src/host/esm5_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngcc/src/host/esm2015_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var esm2015_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/esm2015_host");
    var DECORATORS = 'decorators';
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
         * In ESM5 the implementation of a class is a function expression that is hidden inside an IIFE.
         * So we need to dig around inside to get hold of the "class" symbol.
         * @param declaration the top level declaration that represents an exported class.
         */
        Esm5ReflectionHost.prototype.getClassSymbol = function (declaration) {
            if (ts.isVariableDeclaration(declaration)) {
                var name_1 = declaration.name;
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
            debugger;
            var constructor = classSymbol.valueDeclaration;
            if (constructor && constructor.parameters) {
                return Array.from(constructor.parameters);
            }
            return [];
        };
        return Esm5ReflectionHost;
    }(esm2015_host_1.Esm2015ReflectionHost));
    exports.Esm5ReflectionHost = Esm5ReflectionHost;
    function getIifeBody(declaration) {
        if (declaration.initializer && ts.isCallExpression(declaration.initializer)) {
            var call = declaration.initializer;
            if (ts.isParenthesizedExpression(call.expression) && ts.isFunctionExpression(call.expression.expression)) {
                return call.expression.expression.body;
            }
        }
    }
    function getReturnIdentifier(body) {
        var returnStatement = body.statements.find(function (statement) { return ts.isReturnStatement(statement); });
        if (returnStatement && returnStatement.expression && ts.isIdentifier(returnStatement.expression)) {
            return returnStatement.expression;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMscUZBQXVEO0lBRXZELElBQU0sVUFBVSxHQUFHLFlBQTJCLENBQUM7SUFFL0M7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSDtRQUF3Qyw4Q0FBcUI7UUFDM0QsNEJBQVksT0FBdUI7bUJBQ2pDLGtCQUFNLE9BQU8sQ0FBQztRQUNoQixDQUFDO1FBRUQ7Ozs7V0FJRztRQUNILDJDQUFjLEdBQWQsVUFBZSxXQUEyQjtZQUN4QyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDekMsSUFBTSxNQUFJLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQztnQkFDOUIsSUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUMxQyxJQUFJLFFBQVEsRUFBRTtvQkFDWixJQUFNLG9CQUFvQixHQUFHLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUMzRCxJQUFJLG9CQUFvQixFQUFFO3dCQUN4QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLENBQUMsQ0FBQztxQkFDL0Q7aUJBQ0Y7YUFDRjtRQUNILENBQUM7UUFFRDs7OztXQUlHO1FBQ08sZ0VBQW1DLEdBQTdDLFVBQThDLFdBQXNCO1lBQ2xFLFFBQVEsQ0FBQztZQUNULElBQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxnQkFBMEMsQ0FBQztZQUMzRSxJQUFJLFdBQVcsSUFBSSxXQUFXLENBQUMsVUFBVSxFQUFFO2dCQUN6QyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQzNDO1lBQ0QsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBcENELENBQXdDLG9DQUFxQixHQW9DNUQ7SUFwQ1ksZ0RBQWtCO0lBdUMvQixxQkFBcUIsV0FBbUM7UUFDdEQsSUFBSSxXQUFXLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDM0UsSUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQztZQUNyQyxJQUFJLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ3hHLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO2FBQ3hDO1NBQ0Y7SUFDSCxDQUFDO0lBRUQsNkJBQTZCLElBQWM7UUFDekMsSUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEVBQS9CLENBQStCLENBQWlDLENBQUM7UUFDM0gsSUFBSSxlQUFlLElBQUksZUFBZSxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUNoRyxPQUFPLGVBQWUsQ0FBQyxVQUFVLENBQUM7U0FDbkM7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7IENsYXNzTWVtYmVyLCBEZWNvcmF0b3IsIEltcG9ydCwgUGFyYW1ldGVyIH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvaG9zdCc7XG5pbXBvcnQgeyBFc20yMDE1UmVmbGVjdGlvbkhvc3QgfSBmcm9tICcuL2VzbTIwMTVfaG9zdCc7XG5cbmNvbnN0IERFQ09SQVRPUlMgPSAnZGVjb3JhdG9ycycgYXMgdHMuX19TdHJpbmc7XG5cbi8qKlxuICogRVNNNSBwYWNrYWdlcyBjb250YWluIEVDTUFTY3JpcHQgSUlGRSBmdW5jdGlvbnMgdGhhdCBhY3QgbGlrZSBjbGFzc2VzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIHZhciBDb21tb25Nb2R1bGUgPSAoZnVuY3Rpb24gKCkge1xuICogIGZ1bmN0aW9uIENvbW1vbk1vZHVsZSgpIHtcbiAqICB9XG4gKiAgQ29tbW9uTW9kdWxlLmRlY29yYXRvcnMgPSBbIC4uLiBdO1xuICogYGBgXG4gKlxuICogKiBcIkNsYXNzZXNcIiBhcmUgZGVjb3JhdGVkIGlmIHRoZXkgaGF2ZSBhIHN0YXRpYyBwcm9wZXJ0eSBjYWxsZWQgYGRlY29yYXRvcnNgLlxuICogKiBNZW1iZXJzIGFyZSBkZWNvcmF0ZWQgaWYgdGhlcmUgaXMgYSBtYXRjaGluZyBrZXkgb24gYSBzdGF0aWMgcHJvcGVydHlcbiAqICAgY2FsbGVkIGBwcm9wRGVjb3JhdG9yc2AuXG4gKiAqIENvbnN0cnVjdG9yIHBhcmFtZXRlcnMgZGVjb3JhdG9ycyBhcmUgZm91bmQgb24gYW4gb2JqZWN0IHJldHVybmVkIGZyb21cbiAqICAgYSBzdGF0aWMgbWV0aG9kIGNhbGxlZCBgY3RvclBhcmFtZXRlcnNgLlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIEVzbTVSZWZsZWN0aW9uSG9zdCBleHRlbmRzIEVzbTIwMTVSZWZsZWN0aW9uSG9zdCB7XG4gIGNvbnN0cnVjdG9yKGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKSB7XG4gICAgc3VwZXIoY2hlY2tlcik7XG4gIH1cblxuICAvKipcbiAgICogSW4gRVNNNSB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUuXG4gICAqIFNvIHdlIG5lZWQgdG8gZGlnIGFyb3VuZCBpbnNpZGUgdG8gZ2V0IGhvbGQgb2YgdGhlIFwiY2xhc3NcIiBzeW1ib2wuXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiB0aGUgdG9wIGxldmVsIGRlY2xhcmF0aW9uIHRoYXQgcmVwcmVzZW50cyBhbiBleHBvcnRlZCBjbGFzcy5cbiAgICovXG4gIGdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbikge1xuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICBjb25zdCBuYW1lID0gZGVjbGFyYXRpb24ubmFtZTtcbiAgICAgIGNvbnN0IGlpZmVCb2R5ID0gZ2V0SWlmZUJvZHkoZGVjbGFyYXRpb24pO1xuICAgICAgaWYgKGlpZmVCb2R5KSB7XG4gICAgICAgIGNvbnN0IGlubmVyQ2xhc3NJZGVudGlmaWVyID0gZ2V0UmV0dXJuSWRlbnRpZmllcihpaWZlQm9keSk7XG4gICAgICAgIGlmIChpbm5lckNsYXNzSWRlbnRpZmllcikge1xuICAgICAgICAgIHJldHVybiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpbm5lckNsYXNzSWRlbnRpZmllcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgY2xhc3MgaWRlbnRpZmllZCBieSBpdHMgc3ltYm9sLlxuICAgKiBJbiBFU001IHRoZXJlIGlzIG5vIFwiY2xhc3NcIiBzbyB0aGUgY29uc3RydWN0b3IgdGhhdCB3ZSB3YW50IGlzIGFjdHVhbGx5IHRoZSBkZWNsYXJhdGlvblxuICAgKiBmdW5jdGlvbiBpdHNlbGYuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCkge1xuICAgIGRlYnVnZ2VyO1xuICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gY2xhc3NTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiBhcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAgIGlmIChjb25zdHJ1Y3RvciAmJiBjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKSB7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbShjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKTtcbiAgICB9XG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG5cblxuZnVuY3Rpb24gZ2V0SWlmZUJvZHkoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pIHtcbiAgaWYgKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyICYmIHRzLmlzQ2FsbEV4cHJlc3Npb24oZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIpKSB7XG4gICAgY29uc3QgY2FsbCA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICAgIGlmICh0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKGNhbGwuZXhwcmVzc2lvbikgJiYgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uLmV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gY2FsbC5leHByZXNzaW9uLmV4cHJlc3Npb24uYm9keTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0UmV0dXJuSWRlbnRpZmllcihib2R5OiB0cy5CbG9jaykge1xuICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBib2R5LnN0YXRlbWVudHMuZmluZChzdGF0ZW1lbnQgPT4gdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RhdGVtZW50KSkgYXMgdHMuUmV0dXJuU3RhdGVtZW50fHVuZGVmaW5lZDtcbiAgaWYgKHJldHVyblN0YXRlbWVudCAmJiByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbiAmJiB0cy5pc0lkZW50aWZpZXIocmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uO1xuICB9XG59Il19