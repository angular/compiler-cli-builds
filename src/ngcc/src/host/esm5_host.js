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
         * Examine a declaration which should be of a class, and return metadata about the members of the
         * class.
         *
         * @param declaration a TypeScript `ts.Declaration` node representing the class over which to
         * reflect. If the source is in ES6 format, this will be a `ts.ClassDeclaration` node. If the
         * source is in ES5 format, this might be a `ts.VariableDeclaration` as classes in ES5 are
         * represented as the result of an IIFE execution.
         *
         * @returns an array of `ClassMember` metadata representing the members of the class.
         *
         * @throws if `declaration` does not resolve to a class declaration.
         */
        // getMembersOfClass(declaration: ts.Declaration): ClassMember[] {
        //   const members: ClassMember[] = [];
        //   const symbol = this.getClassSymbol(declaration);
        //   if (!symbol) {
        //     throw new Error(`Attempted to get members of a non-class: "${declaration.getText()}"`);
        //   }
        //   const decoratedMembers = this.getMemberDecorators(symbol);
        // }
        /**
         * Check whether the given declaration node actually represents a class.
         */
        Esm5ReflectionHost.prototype.isClass = function (node) {
            return !!this.getClassSymbol(node);
        };
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
         * function in ES5. Note that unlike ESM2105 this is a function expression rather than an arrow function:
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
            if (classSymbol.exports && classSymbol.exports.has(esm2015_host_1.CONSTRUCTOR_PARAMS)) {
                var paramDecoratorsProperty = esm2015_host_1.getPropertyValueFromSymbol(classSymbol.exports.get(esm2015_host_1.CONSTRUCTOR_PARAMS));
                if (paramDecoratorsProperty && ts.isFunctionExpression(paramDecoratorsProperty)) {
                    var returnStatement = getReturnStatement(paramDecoratorsProperty.body);
                    if (returnStatement && returnStatement.expression && ts.isArrayLiteralExpression(returnStatement.expression)) {
                        return returnStatement.expression.elements.map(function (element) { return ts.isObjectLiteralExpression(element) ? reflector_1.reflectObjectLiteral(element) : null; });
                    }
                }
            }
            return [];
        };
        Esm5ReflectionHost.prototype.reflectMember = function (symbol, decorators, isStatic) {
            var member = _super.prototype.reflectMember.call(this, symbol, decorators, isStatic);
            if (member &&
                member.kind === reflection_1.ClassMemberKind.Method &&
                member.isStatic &&
                member.node &&
                ts.isPropertyAccessExpression(member.node) &&
                member.node.parent &&
                ts.isBinaryExpression(member.node.parent) &&
                ts.isFunctionExpression(member.node.parent.right)) {
                debugger;
                // recompute the declaration for this member, since ES5 static methods are variable declarations
                // so the declaration is actually the initialzer of the variable assignment
                member.declaration = member.node.parent.right;
            }
            return member;
        };
        return Esm5ReflectionHost;
    }(esm2015_host_1.Esm2015ReflectionHost));
    exports.Esm5ReflectionHost = Esm5ReflectionHost;
    function getIifeBody(declaration) {
        if (declaration.initializer && ts.isParenthesizedExpression(declaration.initializer)) {
            var call = declaration.initializer;
            if (ts.isCallExpression(call.expression) && ts.isFunctionExpression(call.expression.expression)) {
                return call.expression.expression.body;
            }
        }
    }
    function getReturnIdentifier(body) {
        var returnStatement = getReturnStatement(body);
        if (returnStatement && returnStatement.expression && ts.isIdentifier(returnStatement.expression)) {
            return returnStatement.expression;
        }
    }
    function getReturnStatement(body) {
        return body.statements.find(function (statement) { return ts.isReturnStatement(statement); });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsa0ZBQWtGO0lBQ2xGLG9GQUE2RTtJQUM3RSxxRkFBdUc7SUFFdkc7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSDtRQUF3Qyw4Q0FBcUI7UUFDM0QsNEJBQVksT0FBdUI7bUJBQ2pDLGtCQUFNLE9BQU8sQ0FBQztRQUNoQixDQUFDO1FBRUQ7Ozs7Ozs7Ozs7OztXQVlHO1FBQ0gsa0VBQWtFO1FBQ2xFLHVDQUF1QztRQUN2QyxxREFBcUQ7UUFDckQsbUJBQW1CO1FBQ25CLDhGQUE4RjtRQUM5RixNQUFNO1FBQ04sK0RBQStEO1FBQy9ELElBQUk7UUFFSjs7V0FFRztRQUNILG9DQUFPLEdBQVAsVUFBUSxJQUFvQjtZQUMxQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFFRDs7OztXQUlHO1FBQ0gsMkNBQWMsR0FBZCxVQUFlLFdBQTJCO1lBQ3hDLElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUN6QyxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQzFDLElBQUksUUFBUSxFQUFFO29CQUNaLElBQU0sb0JBQW9CLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQzNELElBQUksb0JBQW9CLEVBQUU7d0JBQ3hCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO3FCQUMvRDtpQkFDRjthQUNGO1FBQ0gsQ0FBQztRQUVEOzs7O1dBSUc7UUFDTyxnRUFBbUMsR0FBN0MsVUFBOEMsV0FBc0I7WUFDbEUsSUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLGdCQUEwQyxDQUFDO1lBQzNFLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxVQUFVLEVBQUU7Z0JBQ3pDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDM0M7WUFDRCxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFFRDs7Ozs7Ozs7Ozs7O1dBWUc7UUFDTyxxREFBd0IsR0FBbEMsVUFBbUMsV0FBc0I7WUFDdkQsSUFBSSxXQUFXLENBQUMsT0FBTyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFrQixDQUFDLEVBQUU7Z0JBQ3RFLElBQU0sdUJBQXVCLEdBQUcseUNBQTBCLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWtCLENBQUUsQ0FBQyxDQUFDO2dCQUN6RyxJQUFJLHVCQUF1QixJQUFJLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFO29CQUMvRSxJQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDekUsSUFBSSxlQUFlLElBQUksZUFBZSxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsd0JBQXdCLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxFQUFFO3dCQUM1RyxPQUFPLGVBQWUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFBLE9BQU8sSUFBSSxPQUFBLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0NBQW9CLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBNUUsQ0FBNEUsQ0FBQyxDQUFDO3FCQUN6STtpQkFDRjthQUNGO1lBQ0QsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO1FBRVMsMENBQWEsR0FBdkIsVUFBd0IsTUFBaUIsRUFBRSxVQUF3QixFQUFFLFFBQWtCO1lBQ3JGLElBQU0sTUFBTSxHQUFHLGlCQUFNLGFBQWEsWUFBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ2pFLElBQUksTUFBTTtnQkFDTixNQUFNLENBQUMsSUFBSSxLQUFLLDRCQUFlLENBQUMsTUFBTTtnQkFDdEMsTUFBTSxDQUFDLFFBQVE7Z0JBQ2YsTUFBTSxDQUFDLElBQUk7Z0JBQ1gsRUFBRSxDQUFDLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQzFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTTtnQkFDbEIsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUN6QyxFQUFFLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQ2pEO2dCQUNBLFFBQVEsQ0FBQztnQkFDWCxnR0FBZ0c7Z0JBQ2hHLDJFQUEyRTtnQkFDM0UsTUFBTSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7YUFDL0M7WUFDRCxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBNUdELENBQXdDLG9DQUFxQixHQTRHNUQ7SUE1R1ksZ0RBQWtCO0lBK0cvQixxQkFBcUIsV0FBbUM7UUFDdEQsSUFBSSxXQUFXLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDcEYsSUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQztZQUNyQyxJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQy9GLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO2FBQ3hDO1NBQ0Y7SUFDSCxDQUFDO0lBRUQsNkJBQTZCLElBQWM7UUFDekMsSUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakQsSUFBSSxlQUFlLElBQUksZUFBZSxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUNoRyxPQUFPLGVBQWUsQ0FBQyxVQUFVLENBQUM7U0FDbkM7SUFDSCxDQUFDO0lBRUQsNEJBQTRCLElBQWM7UUFDeEMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBL0IsQ0FBK0IsQ0FBaUMsQ0FBQztJQUM1RyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7IERlY29yYXRvciB9IGZyb20gJy4uLy4uLy4uL25ndHNjL2hvc3QnO1xuaW1wb3J0IHsgQ2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCB9IGZyb20gJy4uLy4uLy4uL25ndHNjL2hvc3Qvc3JjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHsgcmVmbGVjdE9iamVjdExpdGVyYWwgfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9tZXRhZGF0YS9zcmMvcmVmbGVjdG9yJztcbmltcG9ydCB7IENPTlNUUlVDVE9SX1BBUkFNUywgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0LCBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbCB9IGZyb20gJy4vZXNtMjAxNV9ob3N0JztcblxuLyoqXG4gKiBFU001IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCBJSUZFIGZ1bmN0aW9ucyB0aGF0IGFjdCBsaWtlIGNsYXNzZXMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogdmFyIENvbW1vbk1vZHVsZSA9IChmdW5jdGlvbiAoKSB7XG4gKiAgZnVuY3Rpb24gQ29tbW9uTW9kdWxlKCkge1xuICogIH1cbiAqICBDb21tb25Nb2R1bGUuZGVjb3JhdG9ycyA9IFsgLi4uIF07XG4gKiBgYGBcbiAqXG4gKiAqIFwiQ2xhc3Nlc1wiIGFyZSBkZWNvcmF0ZWQgaWYgdGhleSBoYXZlIGEgc3RhdGljIHByb3BlcnR5IGNhbGxlZCBgZGVjb3JhdG9yc2AuXG4gKiAqIE1lbWJlcnMgYXJlIGRlY29yYXRlZCBpZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGtleSBvbiBhIHN0YXRpYyBwcm9wZXJ0eVxuICogICBjYWxsZWQgYHByb3BEZWNvcmF0b3JzYC5cbiAqICogQ29uc3RydWN0b3IgcGFyYW1ldGVycyBkZWNvcmF0b3JzIGFyZSBmb3VuZCBvbiBhbiBvYmplY3QgcmV0dXJuZWQgZnJvbVxuICogICBhIHN0YXRpYyBtZXRob2QgY2FsbGVkIGBjdG9yUGFyYW1ldGVyc2AuXG4gKlxuICovXG5leHBvcnQgY2xhc3MgRXNtNVJlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0IHtcbiAgY29uc3RydWN0b3IoY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpIHtcbiAgICBzdXBlcihjaGVja2VyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gd2hpY2ggc2hvdWxkIGJlIG9mIGEgY2xhc3MsIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgdGhlIG1lbWJlcnMgb2YgdGhlXG4gICAqIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gYSBUeXBlU2NyaXB0IGB0cy5EZWNsYXJhdGlvbmAgbm9kZSByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG9cbiAgICogcmVmbGVjdC4gSWYgdGhlIHNvdXJjZSBpcyBpbiBFUzYgZm9ybWF0LCB0aGlzIHdpbGwgYmUgYSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgbm9kZS4gSWYgdGhlXG4gICAqIHNvdXJjZSBpcyBpbiBFUzUgZm9ybWF0LCB0aGlzIG1pZ2h0IGJlIGEgYHRzLlZhcmlhYmxlRGVjbGFyYXRpb25gIGFzIGNsYXNzZXMgaW4gRVM1IGFyZVxuICAgKiByZXByZXNlbnRlZCBhcyB0aGUgcmVzdWx0IG9mIGFuIElJRkUgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgQ2xhc3NNZW1iZXJgIG1ldGFkYXRhIHJlcHJlc2VudGluZyB0aGUgbWVtYmVycyBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICAvLyBnZXRNZW1iZXJzT2ZDbGFzcyhkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBDbGFzc01lbWJlcltdIHtcbiAgLy8gICBjb25zdCBtZW1iZXJzOiBDbGFzc01lbWJlcltdID0gW107XG4gIC8vICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbik7XG4gIC8vICAgaWYgKCFzeW1ib2wpIHtcbiAgLy8gICAgIHRocm93IG5ldyBFcnJvcihgQXR0ZW1wdGVkIHRvIGdldCBtZW1iZXJzIG9mIGEgbm9uLWNsYXNzOiBcIiR7ZGVjbGFyYXRpb24uZ2V0VGV4dCgpfVwiYCk7XG4gIC8vICAgfVxuICAvLyAgIGNvbnN0IGRlY29yYXRlZE1lbWJlcnMgPSB0aGlzLmdldE1lbWJlckRlY29yYXRvcnMoc3ltYm9sKTtcbiAgLy8gfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiBkZWNsYXJhdGlvbiBub2RlIGFjdHVhbGx5IHJlcHJlc2VudHMgYSBjbGFzcy5cbiAgICovXG4gIGlzQ2xhc3Mobm9kZTogdHMuRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICByZXR1cm4gISF0aGlzLmdldENsYXNzU3ltYm9sKG5vZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluIEVTTTUgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY2xhc3MgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHRoYXQgaXMgaGlkZGVuIGluc2lkZSBhbiBJSUZFLlxuICAgKiBTbyB3ZSBuZWVkIHRvIGRpZyBhcm91bmQgaW5zaWRlIHRvIGdldCBob2xkIG9mIHRoZSBcImNsYXNzXCIgc3ltYm9sLlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gdGhlIHRvcCBsZXZlbCBkZWNsYXJhdGlvbiB0aGF0IHJlcHJlc2VudHMgYW4gZXhwb3J0ZWQgY2xhc3MuXG4gICAqL1xuICBnZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pIHtcbiAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgY29uc3QgaWlmZUJvZHkgPSBnZXRJaWZlQm9keShkZWNsYXJhdGlvbik7XG4gICAgICBpZiAoaWlmZUJvZHkpIHtcbiAgICAgICAgY29uc3QgaW5uZXJDbGFzc0lkZW50aWZpZXIgPSBnZXRSZXR1cm5JZGVudGlmaWVyKGlpZmVCb2R5KTtcbiAgICAgICAgaWYgKGlubmVyQ2xhc3NJZGVudGlmaWVyKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlubmVyQ2xhc3NJZGVudGlmaWVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbnMgb2YgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBjbGFzcyBpZGVudGlmaWVkIGJ5IGl0cyBzeW1ib2wuXG4gICAqIEluIEVTTTUgdGhlcmUgaXMgbm8gXCJjbGFzc1wiIHNvIHRoZSBjb25zdHJ1Y3RvciB0aGF0IHdlIHdhbnQgaXMgYWN0dWFsbHkgdGhlIGRlY2xhcmF0aW9uXG4gICAqIGZ1bmN0aW9uIGl0c2VsZi5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbDogdHMuU3ltYm9sKSB7XG4gICAgY29uc3QgY29uc3RydWN0b3IgPSBjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uIGFzIHRzLkZ1bmN0aW9uRGVjbGFyYXRpb247XG4gICAgaWYgKGNvbnN0cnVjdG9yICYmIGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpIHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpO1xuICAgIH1cbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvKipcbiAgICogQ29uc3RydWN0b3JzIHBhcmFtZXRlciBkZWNvcmF0b3JzIGFyZSBkZWNsYXJlZCBpbiB0aGUgYm9keSBvZiBzdGF0aWMgbWV0aG9kIG9mIHRoZSBjb25zdHJ1Y3RvclxuICAgKiBmdW5jdGlvbiBpbiBFUzUuIE5vdGUgdGhhdCB1bmxpa2UgRVNNMjEwNSB0aGlzIGlzIGEgZnVuY3Rpb24gZXhwcmVzc2lvbiByYXRoZXIgdGhhbiBhbiBhcnJvdyBmdW5jdGlvbjpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIFtcbiAgICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gICAqICAgeyB0eXBlOiBUZW1wbGF0ZVJlZiwgfSxcbiAgICogICB7IHR5cGU6IEl0ZXJhYmxlRGlmZmVycywgfSxcbiAgICogICB7IHR5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU4sXSB9LF0gfSxcbiAgICogXTsgfTtcbiAgICogYGBgXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JEZWNvcmF0b3JzKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpIHtcbiAgICBpZiAoY2xhc3NTeW1ib2wuZXhwb3J0cyAmJiBjbGFzc1N5bWJvbC5leHBvcnRzLmhhcyhDT05TVFJVQ1RPUl9QQVJBTVMpKSB7XG4gICAgICBjb25zdCBwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSA9IGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKGNsYXNzU3ltYm9sLmV4cG9ydHMuZ2V0KENPTlNUUlVDVE9SX1BBUkFNUykhKTtcbiAgICAgIGlmIChwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSAmJiB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSkpIHtcbiAgICAgICAgY29uc3QgcmV0dXJuU3RhdGVtZW50ID0gZ2V0UmV0dXJuU3RhdGVtZW50KHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5LmJvZHkpO1xuICAgICAgICBpZiAocmV0dXJuU3RhdGVtZW50ICYmIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uICYmIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihyZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgICByZXR1cm4gcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24uZWxlbWVudHMubWFwKGVsZW1lbnQgPT4gdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlZmxlY3RNZW1iZXIoc3ltYm9sOiB0cy5TeW1ib2wsIGRlY29yYXRvcnM/OiBEZWNvcmF0b3JbXSwgaXNTdGF0aWM/OiBib29sZWFuKTogQ2xhc3NNZW1iZXJ8bnVsbCB7XG4gICAgY29uc3QgbWVtYmVyID0gc3VwZXIucmVmbGVjdE1lbWJlcihzeW1ib2wsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICBpZiAobWVtYmVyICYmXG4gICAgICAgIG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuTWV0aG9kICYmXG4gICAgICAgIG1lbWJlci5pc1N0YXRpYyAmJlxuICAgICAgICBtZW1iZXIubm9kZSAmJlxuICAgICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihtZW1iZXIubm9kZSkgJiZcbiAgICAgICAgbWVtYmVyLm5vZGUucGFyZW50ICYmXG4gICAgICAgIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihtZW1iZXIubm9kZS5wYXJlbnQpICYmXG4gICAgICAgIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKG1lbWJlci5ub2RlLnBhcmVudC5yaWdodClcbiAgICAgICkge1xuICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgIC8vIHJlY29tcHV0ZSB0aGUgZGVjbGFyYXRpb24gZm9yIHRoaXMgbWVtYmVyLCBzaW5jZSBFUzUgc3RhdGljIG1ldGhvZHMgYXJlIHZhcmlhYmxlIGRlY2xhcmF0aW9uc1xuICAgICAgLy8gc28gdGhlIGRlY2xhcmF0aW9uIGlzIGFjdHVhbGx5IHRoZSBpbml0aWFsemVyIG9mIHRoZSB2YXJpYWJsZSBhc3NpZ25tZW50XG4gICAgICBtZW1iZXIuZGVjbGFyYXRpb24gPSBtZW1iZXIubm9kZS5wYXJlbnQucmlnaHQ7XG4gICAgfVxuICAgIHJldHVybiBtZW1iZXI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBnZXRJaWZlQm9keShkZWNsYXJhdGlvbjogdHMuVmFyaWFibGVEZWNsYXJhdGlvbikge1xuICBpZiAoZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgJiYgdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihkZWNsYXJhdGlvbi5pbml0aWFsaXplcikpIHtcbiAgICBjb25zdCBjYWxsID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uKSAmJiB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihjYWxsLmV4cHJlc3Npb24uZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBjYWxsLmV4cHJlc3Npb24uZXhwcmVzc2lvbi5ib2R5O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRSZXR1cm5JZGVudGlmaWVyKGJvZHk6IHRzLkJsb2NrKSB7XG4gIGNvbnN0IHJldHVyblN0YXRlbWVudCA9IGdldFJldHVyblN0YXRlbWVudChib2R5KTtcbiAgaWYgKHJldHVyblN0YXRlbWVudCAmJiByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbiAmJiB0cy5pc0lkZW50aWZpZXIocmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFJldHVyblN0YXRlbWVudChib2R5OiB0cy5CbG9jaykge1xuICByZXR1cm4gYm9keS5zdGF0ZW1lbnRzLmZpbmQoc3RhdGVtZW50ID0+IHRzLmlzUmV0dXJuU3RhdGVtZW50KHN0YXRlbWVudCkpIGFzIHRzLlJldHVyblN0YXRlbWVudHx1bmRlZmluZWQ7XG59XG4iXX0=