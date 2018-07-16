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
            if (classSymbol.exports && classSymbol.exports.has(esm2015_host_1.CONSTRUCTOR_PARAMS)) {
                var paramDecoratorsProperty = esm2015_host_1.getPropertyValueFromSymbol(classSymbol.exports.get(esm2015_host_1.CONSTRUCTOR_PARAMS));
                if (paramDecoratorsProperty && ts.isFunctionExpression(paramDecoratorsProperty)) {
                    var returnStatement = getReturnStatement(paramDecoratorsProperty.body);
                    if (returnStatement && returnStatement.expression &&
                        ts.isArrayLiteralExpression(returnStatement.expression)) {
                        return returnStatement.expression.elements.map(function (element) {
                            return ts.isObjectLiteralExpression(element) ? reflector_1.reflectObjectLiteral(element) : null;
                        });
                    }
                }
            }
            return [];
        };
        Esm5ReflectionHost.prototype.reflectMember = function (symbol, decorators, isStatic) {
            var member = _super.prototype.reflectMember.call(this, symbol, decorators, isStatic);
            if (member && member.kind === reflection_1.ClassMemberKind.Method && member.isStatic && member.node &&
                ts.isPropertyAccessExpression(member.node) && member.node.parent &&
                ts.isBinaryExpression(member.node.parent) &&
                ts.isFunctionExpression(member.node.parent.right)) {
                debugger;
                // recompute the declaration for this member, since ES5 static methods are variable
                // declarations
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
            if (ts.isCallExpression(call.expression) &&
                ts.isFunctionExpression(call.expression.expression)) {
                return call.expression.expression.body;
            }
        }
    }
    function getReturnIdentifier(body) {
        var returnStatement = getReturnStatement(body);
        if (returnStatement && returnStatement.expression &&
            ts.isIdentifier(returnStatement.expression)) {
            return returnStatement.expression;
        }
    }
    function getReturnStatement(body) {
        return body.statements.find(function (statement) { return ts.isReturnStatement(statement); });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsa0ZBQWdGO0lBQ2hGLG9GQUEyRTtJQUMzRSxxRkFBcUc7SUFFckc7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSDtRQUF3Qyw4Q0FBcUI7UUFDM0QsNEJBQVksT0FBdUI7bUJBQUksa0JBQU0sT0FBTyxDQUFDO1FBQUUsQ0FBQztRQUV4RDs7Ozs7Ozs7Ozs7O1dBWUc7UUFDSCxrRUFBa0U7UUFDbEUsdUNBQXVDO1FBQ3ZDLHFEQUFxRDtRQUNyRCxtQkFBbUI7UUFDbkIsOEZBQThGO1FBQzlGLE1BQU07UUFDTiwrREFBK0Q7UUFDL0QsSUFBSTtRQUVKOztXQUVHO1FBQ0gsb0NBQU8sR0FBUCxVQUFRLElBQW9CLElBQWEsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUU7Ozs7V0FJRztRQUNILDJDQUFjLEdBQWQsVUFBZSxXQUEyQjtZQUN4QyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDekMsSUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUMxQyxJQUFJLFFBQVEsRUFBRTtvQkFDWixJQUFNLG9CQUFvQixHQUFHLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUMzRCxJQUFJLG9CQUFvQixFQUFFO3dCQUN4QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLENBQUMsQ0FBQztxQkFDL0Q7aUJBQ0Y7YUFDRjtRQUNILENBQUM7UUFFRDs7OztXQUlHO1FB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QyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQzthQUN4QztTQUNGO0lBQ0gsQ0FBQztJQUVELDZCQUE2QixJQUFjO1FBQ3pDLElBQU0sZUFBZSxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pELElBQUksZUFBZSxJQUFJLGVBQWUsQ0FBQyxVQUFVO1lBQzdDLEVBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQy9DLE9BQU8sZUFBZSxDQUFDLFVBQVUsQ0FBQztTQUNuQztJQUNILENBQUM7SUFFRCw0QkFBNEIsSUFBYztRQUN4QyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQUEsU0FBUyxJQUFJLE9BQUEsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxFQUEvQixDQUErQixDQUMzRCxDQUFDO0lBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtEZWNvcmF0b3J9IGZyb20gJy4uLy4uLy4uL25ndHNjL2hvc3QnO1xuaW1wb3J0IHtDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9ob3N0L3NyYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7cmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uLy4uL25ndHNjL21ldGFkYXRhL3NyYy9yZWZsZWN0b3InO1xuaW1wb3J0IHtDT05TVFJVQ1RPUl9QQVJBTVMsIEVzbTIwMTVSZWZsZWN0aW9uSG9zdCwgZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2x9IGZyb20gJy4vZXNtMjAxNV9ob3N0JztcblxuLyoqXG4gKiBFU001IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCBJSUZFIGZ1bmN0aW9ucyB0aGF0IGFjdCBsaWtlIGNsYXNzZXMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogdmFyIENvbW1vbk1vZHVsZSA9IChmdW5jdGlvbiAoKSB7XG4gKiAgZnVuY3Rpb24gQ29tbW9uTW9kdWxlKCkge1xuICogIH1cbiAqICBDb21tb25Nb2R1bGUuZGVjb3JhdG9ycyA9IFsgLi4uIF07XG4gKiBgYGBcbiAqXG4gKiAqIFwiQ2xhc3Nlc1wiIGFyZSBkZWNvcmF0ZWQgaWYgdGhleSBoYXZlIGEgc3RhdGljIHByb3BlcnR5IGNhbGxlZCBgZGVjb3JhdG9yc2AuXG4gKiAqIE1lbWJlcnMgYXJlIGRlY29yYXRlZCBpZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGtleSBvbiBhIHN0YXRpYyBwcm9wZXJ0eVxuICogICBjYWxsZWQgYHByb3BEZWNvcmF0b3JzYC5cbiAqICogQ29uc3RydWN0b3IgcGFyYW1ldGVycyBkZWNvcmF0b3JzIGFyZSBmb3VuZCBvbiBhbiBvYmplY3QgcmV0dXJuZWQgZnJvbVxuICogICBhIHN0YXRpYyBtZXRob2QgY2FsbGVkIGBjdG9yUGFyYW1ldGVyc2AuXG4gKlxuICovXG5leHBvcnQgY2xhc3MgRXNtNVJlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0IHtcbiAgY29uc3RydWN0b3IoY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpIHsgc3VwZXIoY2hlY2tlcik7IH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIGRlY2xhcmF0aW9uIHdoaWNoIHNob3VsZCBiZSBvZiBhIGNsYXNzLCBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IHRoZSBtZW1iZXJzIG9mIHRoZVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIGEgVHlwZVNjcmlwdCBgdHMuRGVjbGFyYXRpb25gIG5vZGUgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvXG4gICAqIHJlZmxlY3QuIElmIHRoZSBzb3VyY2UgaXMgaW4gRVM2IGZvcm1hdCwgdGhpcyB3aWxsIGJlIGEgYHRzLkNsYXNzRGVjbGFyYXRpb25gIG5vZGUuIElmIHRoZVxuICAgKiBzb3VyY2UgaXMgaW4gRVM1IGZvcm1hdCwgdGhpcyBtaWdodCBiZSBhIGB0cy5WYXJpYWJsZURlY2xhcmF0aW9uYCBhcyBjbGFzc2VzIGluIEVTNSBhcmVcbiAgICogcmVwcmVzZW50ZWQgYXMgdGhlIHJlc3VsdCBvZiBhbiBJSUZFIGV4ZWN1dGlvbi5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYENsYXNzTWVtYmVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIG1lbWJlcnMgb2YgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBAdGhyb3dzIGlmIGBkZWNsYXJhdGlvbmAgZG9lcyBub3QgcmVzb2x2ZSB0byBhIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgLy8gZ2V0TWVtYmVyc09mQ2xhc3MoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogQ2xhc3NNZW1iZXJbXSB7XG4gIC8vICAgY29uc3QgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSA9IFtdO1xuICAvLyAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woZGVjbGFyYXRpb24pO1xuICAvLyAgIGlmICghc3ltYm9sKSB7XG4gIC8vICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHRlZCB0byBnZXQgbWVtYmVycyBvZiBhIG5vbi1jbGFzczogXCIke2RlY2xhcmF0aW9uLmdldFRleHQoKX1cImApO1xuICAvLyAgIH1cbiAgLy8gICBjb25zdCBkZWNvcmF0ZWRNZW1iZXJzID0gdGhpcy5nZXRNZW1iZXJEZWNvcmF0b3JzKHN5bWJvbCk7XG4gIC8vIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciB0aGUgZ2l2ZW4gZGVjbGFyYXRpb24gbm9kZSBhY3R1YWxseSByZXByZXNlbnRzIGEgY2xhc3MuXG4gICAqL1xuICBpc0NsYXNzKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7IHJldHVybiAhIXRoaXMuZ2V0Q2xhc3NTeW1ib2wobm9kZSk7IH1cblxuICAvKipcbiAgICogSW4gRVNNNSB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUuXG4gICAqIFNvIHdlIG5lZWQgdG8gZGlnIGFyb3VuZCBpbnNpZGUgdG8gZ2V0IGhvbGQgb2YgdGhlIFwiY2xhc3NcIiBzeW1ib2wuXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiB0aGUgdG9wIGxldmVsIGRlY2xhcmF0aW9uIHRoYXQgcmVwcmVzZW50cyBhbiBleHBvcnRlZCBjbGFzcy5cbiAgICovXG4gIGdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbikge1xuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICBjb25zdCBpaWZlQm9keSA9IGdldElpZmVCb2R5KGRlY2xhcmF0aW9uKTtcbiAgICAgIGlmIChpaWZlQm9keSkge1xuICAgICAgICBjb25zdCBpbm5lckNsYXNzSWRlbnRpZmllciA9IGdldFJldHVybklkZW50aWZpZXIoaWlmZUJvZHkpO1xuICAgICAgICBpZiAoaW5uZXJDbGFzc0lkZW50aWZpZXIpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaW5uZXJDbGFzc0lkZW50aWZpZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIGRlY2xhcmF0aW9ucyBvZiB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIGNsYXNzIGlkZW50aWZpZWQgYnkgaXRzIHN5bWJvbC5cbiAgICogSW4gRVNNNSB0aGVyZSBpcyBubyBcImNsYXNzXCIgc28gdGhlIGNvbnN0cnVjdG9yIHRoYXQgd2Ugd2FudCBpcyBhY3R1YWxseSB0aGUgZGVjbGFyYXRpb25cbiAgICogZnVuY3Rpb24gaXRzZWxmLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1ldGVyRGVjbGFyYXRpb25zKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpIHtcbiAgICBjb25zdCBjb25zdHJ1Y3RvciA9IGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gYXMgdHMuRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICBpZiAoY29uc3RydWN0b3IgJiYgY29uc3RydWN0b3IucGFyYW1ldGVycykge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oY29uc3RydWN0b3IucGFyYW1ldGVycyk7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RvcnMgcGFyYW1ldGVyIGRlY29yYXRvcnMgYXJlIGRlY2xhcmVkIGluIHRoZSBib2R5IG9mIHN0YXRpYyBtZXRob2Qgb2YgdGhlIGNvbnN0cnVjdG9yXG4gICAqIGZ1bmN0aW9uIGluIEVTNS4gTm90ZSB0aGF0IHVubGlrZSBFU00yMTA1IHRoaXMgaXMgYSBmdW5jdGlvbiBleHByZXNzaW9uIHJhdGhlciB0aGFuIGFuIGFycm93XG4gICAqIGZ1bmN0aW9uOlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gW1xuICAgKiAgIHsgdHlwZTogVmlld0NvbnRhaW5lclJlZiwgfSxcbiAgICogICB7IHR5cGU6IFRlbXBsYXRlUmVmLCB9LFxuICAgKiAgIHsgdHlwZTogSXRlcmFibGVEaWZmZXJzLCB9LFxuICAgKiAgIHsgdHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTixdIH0sXSB9LFxuICAgKiBdOyB9O1xuICAgKiBgYGBcbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvckRlY29yYXRvcnMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCkge1xuICAgIGlmIChjbGFzc1N5bWJvbC5leHBvcnRzICYmIGNsYXNzU3ltYm9sLmV4cG9ydHMuaGFzKENPTlNUUlVDVE9SX1BBUkFNUykpIHtcbiAgICAgIGNvbnN0IHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5ID1cbiAgICAgICAgICBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChjbGFzc1N5bWJvbC5leHBvcnRzLmdldChDT05TVFJVQ1RPUl9QQVJBTVMpICEpO1xuICAgICAgaWYgKHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5ICYmIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5KSkge1xuICAgICAgICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBnZXRSZXR1cm5TdGF0ZW1lbnQocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkuYm9keSk7XG4gICAgICAgIGlmIChyZXR1cm5TdGF0ZW1lbnQgJiYgcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24gJiZcbiAgICAgICAgICAgIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihyZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgICByZXR1cm4gcmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24uZWxlbWVudHMubWFwKFxuICAgICAgICAgICAgICBlbGVtZW50ID0+XG4gICAgICAgICAgICAgICAgICB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGVsZW1lbnQpID8gcmVmbGVjdE9iamVjdExpdGVyYWwoZWxlbWVudCkgOiBudWxsKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW107XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVmbGVjdE1lbWJlcihzeW1ib2w6IHRzLlN5bWJvbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLCBpc1N0YXRpYz86IGJvb2xlYW4pOlxuICAgICAgQ2xhc3NNZW1iZXJ8bnVsbCB7XG4gICAgY29uc3QgbWVtYmVyID0gc3VwZXIucmVmbGVjdE1lbWJlcihzeW1ib2wsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICBpZiAobWVtYmVyICYmIG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuTWV0aG9kICYmIG1lbWJlci5pc1N0YXRpYyAmJiBtZW1iZXIubm9kZSAmJlxuICAgICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihtZW1iZXIubm9kZSkgJiYgbWVtYmVyLm5vZGUucGFyZW50ICYmXG4gICAgICAgIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihtZW1iZXIubm9kZS5wYXJlbnQpICYmXG4gICAgICAgIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKG1lbWJlci5ub2RlLnBhcmVudC5yaWdodCkpIHtcbiAgICAgIGRlYnVnZ2VyO1xuICAgICAgLy8gcmVjb21wdXRlIHRoZSBkZWNsYXJhdGlvbiBmb3IgdGhpcyBtZW1iZXIsIHNpbmNlIEVTNSBzdGF0aWMgbWV0aG9kcyBhcmUgdmFyaWFibGVcbiAgICAgIC8vIGRlY2xhcmF0aW9uc1xuICAgICAgLy8gc28gdGhlIGRlY2xhcmF0aW9uIGlzIGFjdHVhbGx5IHRoZSBpbml0aWFsemVyIG9mIHRoZSB2YXJpYWJsZSBhc3NpZ25tZW50XG4gICAgICBtZW1iZXIuZGVjbGFyYXRpb24gPSBtZW1iZXIubm9kZS5wYXJlbnQucmlnaHQ7XG4gICAgfVxuICAgIHJldHVybiBtZW1iZXI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBnZXRJaWZlQm9keShkZWNsYXJhdGlvbjogdHMuVmFyaWFibGVEZWNsYXJhdGlvbikge1xuICBpZiAoZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgJiYgdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihkZWNsYXJhdGlvbi5pbml0aWFsaXplcikpIHtcbiAgICBjb25zdCBjYWxsID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uKSAmJlxuICAgICAgICB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihjYWxsLmV4cHJlc3Npb24uZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBjYWxsLmV4cHJlc3Npb24uZXhwcmVzc2lvbi5ib2R5O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRSZXR1cm5JZGVudGlmaWVyKGJvZHk6IHRzLkJsb2NrKSB7XG4gIGNvbnN0IHJldHVyblN0YXRlbWVudCA9IGdldFJldHVyblN0YXRlbWVudChib2R5KTtcbiAgaWYgKHJldHVyblN0YXRlbWVudCAmJiByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbiAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiByZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbjtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRSZXR1cm5TdGF0ZW1lbnQoYm9keTogdHMuQmxvY2spIHtcbiAgcmV0dXJuIGJvZHkuc3RhdGVtZW50cy5maW5kKHN0YXRlbWVudCA9PiB0cy5pc1JldHVyblN0YXRlbWVudChzdGF0ZW1lbnQpKSBhcyB0cy5SZXR1cm5TdGF0ZW1lbnQgfFxuICAgICAgdW5kZWZpbmVkO1xufVxuIl19