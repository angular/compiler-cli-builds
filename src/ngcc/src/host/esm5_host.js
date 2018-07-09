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
        define("angular/packages/compiler-cli/src/ngcc/src/host/esm5_host", ["require", "exports", "tslib", "typescript", "angular/packages/compiler-cli/src/ngcc/src/host/esm2015_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var esm2015_host_1 = require("angular/packages/compiler-cli/src/ngcc/src/host/esm2015_host");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsNkZBQXVEO0lBRXZELElBQU0sVUFBVSxHQUFHLFlBQTJCLENBQUM7SUFFL0M7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSDtRQUF3Qyw4Q0FBcUI7UUFDM0QsNEJBQVksT0FBdUI7bUJBQ2pDLGtCQUFNLE9BQU8sQ0FBQztRQUNoQixDQUFDO1FBRUQ7Ozs7V0FJRztRQUNPLDJDQUFjLEdBQXhCLFVBQXlCLFdBQTJCO1lBQ2xELElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUN6QyxJQUFNLE1BQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO2dCQUM5QixJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQzFDLElBQUksUUFBUSxFQUFFO29CQUNaLElBQU0sb0JBQW9CLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQzNELElBQUksb0JBQW9CLEVBQUU7d0JBQ3hCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO3FCQUMvRDtpQkFDRjthQUNGO1FBQ0gsQ0FBQztRQUVEOzs7O1dBSUc7UUFDTyxnRUFBbUMsR0FBN0MsVUFBOEMsV0FBc0I7WUFDbEUsUUFBUSxDQUFDO1lBQ1QsSUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLGdCQUEwQyxDQUFDO1lBQzNFLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxVQUFVLEVBQUU7Z0JBQ3pDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDM0M7WUFDRCxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUFwQ0QsQ0FBd0Msb0NBQXFCLEdBb0M1RDtJQXBDWSxnREFBa0I7SUF1Qy9CLHFCQUFxQixXQUFtQztRQUN0RCxJQUFJLFdBQVcsQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUMzRSxJQUFNLElBQUksR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDO1lBQ3JDLElBQUksRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDeEcsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7YUFDeEM7U0FDRjtJQUNILENBQUM7SUFFRCw2QkFBNkIsSUFBYztRQUN6QyxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBL0IsQ0FBK0IsQ0FBaUMsQ0FBQztRQUMzSCxJQUFJLGVBQWUsSUFBSSxlQUFlLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ2hHLE9BQU8sZUFBZSxDQUFDLFVBQVUsQ0FBQztTQUNuQztJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgQ2xhc3NNZW1iZXIsIERlY29yYXRvciwgSW1wb3J0LCBQYXJhbWV0ZXIgfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9ob3N0JztcbmltcG9ydCB7IEVzbTIwMTVSZWZsZWN0aW9uSG9zdCB9IGZyb20gJy4vZXNtMjAxNV9ob3N0JztcblxuY29uc3QgREVDT1JBVE9SUyA9ICdkZWNvcmF0b3JzJyBhcyB0cy5fX1N0cmluZztcblxuLyoqXG4gKiBFU001IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCBJSUZFIGZ1bmN0aW9ucyB0aGF0IGFjdCBsaWtlIGNsYXNzZXMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogdmFyIENvbW1vbk1vZHVsZSA9IChmdW5jdGlvbiAoKSB7XG4gKiAgZnVuY3Rpb24gQ29tbW9uTW9kdWxlKCkge1xuICogIH1cbiAqICBDb21tb25Nb2R1bGUuZGVjb3JhdG9ycyA9IFsgLi4uIF07XG4gKiBgYGBcbiAqXG4gKiAqIFwiQ2xhc3Nlc1wiIGFyZSBkZWNvcmF0ZWQgaWYgdGhleSBoYXZlIGEgc3RhdGljIHByb3BlcnR5IGNhbGxlZCBgZGVjb3JhdG9yc2AuXG4gKiAqIE1lbWJlcnMgYXJlIGRlY29yYXRlZCBpZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGtleSBvbiBhIHN0YXRpYyBwcm9wZXJ0eVxuICogICBjYWxsZWQgYHByb3BEZWNvcmF0b3JzYC5cbiAqICogQ29uc3RydWN0b3IgcGFyYW1ldGVycyBkZWNvcmF0b3JzIGFyZSBmb3VuZCBvbiBhbiBvYmplY3QgcmV0dXJuZWQgZnJvbVxuICogICBhIHN0YXRpYyBtZXRob2QgY2FsbGVkIGBjdG9yUGFyYW1ldGVyc2AuXG4gKlxuICovXG5leHBvcnQgY2xhc3MgRXNtNVJlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0IHtcbiAgY29uc3RydWN0b3IoY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpIHtcbiAgICBzdXBlcihjaGVja2VyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbiBFU001IHRoZSBpbXBsZW1lbnRhdGlvbiBvZiBhIGNsYXNzIGlzIGEgZnVuY3Rpb24gZXhwcmVzc2lvbiB0aGF0IGlzIGhpZGRlbiBpbnNpZGUgYW4gSUlGRS5cbiAgICogU28gd2UgbmVlZCB0byBkaWcgYXJvdW5kIGluc2lkZSB0byBnZXQgaG9sZCBvZiB0aGUgXCJjbGFzc1wiIHN5bWJvbC5cbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIHRoZSB0b3AgbGV2ZWwgZGVjbGFyYXRpb24gdGhhdCByZXByZXNlbnRzIGFuIGV4cG9ydGVkIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbikge1xuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICBjb25zdCBuYW1lID0gZGVjbGFyYXRpb24ubmFtZTtcbiAgICAgIGNvbnN0IGlpZmVCb2R5ID0gZ2V0SWlmZUJvZHkoZGVjbGFyYXRpb24pO1xuICAgICAgaWYgKGlpZmVCb2R5KSB7XG4gICAgICAgIGNvbnN0IGlubmVyQ2xhc3NJZGVudGlmaWVyID0gZ2V0UmV0dXJuSWRlbnRpZmllcihpaWZlQm9keSk7XG4gICAgICAgIGlmIChpbm5lckNsYXNzSWRlbnRpZmllcikge1xuICAgICAgICAgIHJldHVybiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpbm5lckNsYXNzSWRlbnRpZmllcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgY2xhc3MgaWRlbnRpZmllZCBieSBpdHMgc3ltYm9sLlxuICAgKiBJbiBFU001IHRoZXJlIGlzIG5vIFwiY2xhc3NcIiBzbyB0aGUgY29uc3RydWN0b3IgdGhhdCB3ZSB3YW50IGlzIGFjdHVhbGx5IHRoZSBkZWNsYXJhdGlvblxuICAgKiBmdW5jdGlvbiBpdHNlbGYuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCkge1xuICAgIGRlYnVnZ2VyO1xuICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gY2xhc3NTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiBhcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAgIGlmIChjb25zdHJ1Y3RvciAmJiBjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKSB7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbShjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKTtcbiAgICB9XG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG5cblxuZnVuY3Rpb24gZ2V0SWlmZUJvZHkoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pIHtcbiAgaWYgKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyICYmIHRzLmlzQ2FsbEV4cHJlc3Npb24oZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIpKSB7XG4gICAgY29uc3QgY2FsbCA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICAgIGlmICh0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKGNhbGwuZXhwcmVzc2lvbikgJiYgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uLmV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gY2FsbC5leHByZXNzaW9uLmV4cHJlc3Npb24uYm9keTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0UmV0dXJuSWRlbnRpZmllcihib2R5OiB0cy5CbG9jaykge1xuICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBib2R5LnN0YXRlbWVudHMuZmluZChzdGF0ZW1lbnQgPT4gdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RhdGVtZW50KSkgYXMgdHMuUmV0dXJuU3RhdGVtZW50fHVuZGVmaW5lZDtcbiAgaWYgKHJldHVyblN0YXRlbWVudCAmJiByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbiAmJiB0cy5pc0lkZW50aWZpZXIocmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uO1xuICB9XG59Il19