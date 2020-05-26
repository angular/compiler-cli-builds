(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/migrations/undecorated_parent_migration", ["require", "exports", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/ngcc/src/migrations/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UndecoratedParentMigration = void 0;
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/migrations/utils");
    /**
     * Ensure that the parents of directives and components that have no constructor are also decorated
     * as a `Directive`.
     *
     * Example:
     *
     * ```
     * export class BasePlain {
     *   constructor(private vcr: ViewContainerRef) {}
     * }
     *
     * @Directive({selector: '[blah]'})
     * export class DerivedDir extends BasePlain {}
     * ```
     *
     * When compiling `DerivedDir` which extends the undecorated `BasePlain` class, the compiler needs
     * to generate a directive def (`ɵdir`) for `DerivedDir`. In particular, it needs to generate a
     * factory function that creates instances of `DerivedDir`.
     *
     * As `DerivedDir` has no constructor, the factory function for `DerivedDir` must delegate to the
     * factory function for `BasePlain`. But for this to work, `BasePlain` must have a factory function,
     * itself.
     *
     * This migration adds a `Directive` decorator to such undecorated parent classes, to ensure that
     * the compiler will create the necessary factory function.
     *
     * The resulting code looks like:
     *
     * ```
     * @Directive()
     * export class BasePlain {
     *   constructor(private vcr: ViewContainerRef) {}
     * }
     *
     * @Directive({selector: '[blah]'})
     * export class DerivedDir extends BasePlain {}
     * ```
     */
    var UndecoratedParentMigration = /** @class */ (function () {
        function UndecoratedParentMigration() {
        }
        UndecoratedParentMigration.prototype.apply = function (clazz, host) {
            // Only interested in `clazz` if it is a `Component` or a `Directive`,
            // and it has no constructor of its own.
            if (!utils_1.hasDirectiveDecorator(host, clazz) || utils_1.hasConstructor(host, clazz)) {
                return null;
            }
            // Only interested in `clazz` if it inherits from a base class.
            var baseClazzRef = determineBaseClass(clazz, host);
            while (baseClazzRef !== null) {
                var baseClazz = baseClazzRef.node;
                // Do not proceed if the base class already has a decorator, or is not in scope of the
                // entry-point that is currently being compiled.
                if (utils_1.hasDirectiveDecorator(host, baseClazz) || !host.isInScope(baseClazz)) {
                    break;
                }
                // Inject an `@Directive()` decorator for the base class.
                host.injectSyntheticDecorator(baseClazz, utils_1.createDirectiveDecorator(baseClazz));
                // If the base class has a constructor, there's no need to continue walking up the
                // inheritance chain. The injected decorator ensures that a factory is generated that does
                // not delegate to the base class.
                if (utils_1.hasConstructor(host, baseClazz)) {
                    break;
                }
                // Continue with another level of class inheritance.
                baseClazzRef = determineBaseClass(baseClazz, host);
            }
            return null;
        };
        return UndecoratedParentMigration;
    }());
    exports.UndecoratedParentMigration = UndecoratedParentMigration;
    /**
     * Computes a reference to the base class, or `null` if the class has no base class or if it could
     * not be statically determined.
     */
    function determineBaseClass(clazz, host) {
        var baseClassExpr = host.reflectionHost.getBaseClassExpression(clazz);
        if (baseClassExpr === null) {
            return null;
        }
        var baseClass = host.evaluator.evaluate(baseClassExpr);
        if (!(baseClass instanceof imports_1.Reference) || !utils_1.isClassDeclaration(baseClass.node)) {
            return null;
        }
        return baseClass;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5kZWNvcmF0ZWRfcGFyZW50X21pZ3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9taWdyYXRpb25zL3VuZGVjb3JhdGVkX3BhcmVudF9taWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBU0EsbUVBQXFEO0lBSXJELHlFQUE0RztJQUc1Rzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXFDRztJQUNIO1FBQUE7UUFtQ0EsQ0FBQztRQWxDQywwQ0FBSyxHQUFMLFVBQU0sS0FBdUIsRUFBRSxJQUFtQjtZQUNoRCxzRUFBc0U7WUFDdEUsd0NBQXdDO1lBQ3hDLElBQUksQ0FBQyw2QkFBcUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksc0JBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQ3RFLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCwrREFBK0Q7WUFDL0QsSUFBSSxZQUFZLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ25ELE9BQU8sWUFBWSxLQUFLLElBQUksRUFBRTtnQkFDNUIsSUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQztnQkFFcEMsc0ZBQXNGO2dCQUN0RixnREFBZ0Q7Z0JBQ2hELElBQUksNkJBQXFCLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRTtvQkFDeEUsTUFBTTtpQkFDUDtnQkFFRCx5REFBeUQ7Z0JBQ3pELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsZ0NBQXdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFFOUUsa0ZBQWtGO2dCQUNsRiwwRkFBMEY7Z0JBQzFGLGtDQUFrQztnQkFDbEMsSUFBSSxzQkFBYyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRTtvQkFDbkMsTUFBTTtpQkFDUDtnQkFFRCxvREFBb0Q7Z0JBQ3BELFlBQVksR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDcEQ7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCxpQ0FBQztJQUFELENBQUMsQUFuQ0QsSUFtQ0M7SUFuQ1ksZ0VBQTBCO0lBcUN2Qzs7O09BR0c7SUFDSCxTQUFTLGtCQUFrQixDQUN2QixLQUF1QixFQUFFLElBQW1CO1FBQzlDLElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEUsSUFBSSxhQUFhLEtBQUssSUFBSSxFQUFFO1lBQzFCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsQ0FBQyxTQUFTLFlBQVksbUJBQVMsQ0FBQyxJQUFJLENBQUMsMEJBQWtCLENBQUMsU0FBUyxDQUFDLElBQXNCLENBQUMsRUFBRTtZQUM5RixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsT0FBTyxTQUF3QyxDQUFDO0lBQ2xELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuXG5pbXBvcnQge01pZ3JhdGlvbiwgTWlncmF0aW9uSG9zdH0gZnJvbSAnLi9taWdyYXRpb24nO1xuaW1wb3J0IHtjcmVhdGVEaXJlY3RpdmVEZWNvcmF0b3IsIGhhc0NvbnN0cnVjdG9yLCBoYXNEaXJlY3RpdmVEZWNvcmF0b3IsIGlzQ2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi91dGlscyc7XG5cblxuLyoqXG4gKiBFbnN1cmUgdGhhdCB0aGUgcGFyZW50cyBvZiBkaXJlY3RpdmVzIGFuZCBjb21wb25lbnRzIHRoYXQgaGF2ZSBubyBjb25zdHJ1Y3RvciBhcmUgYWxzbyBkZWNvcmF0ZWRcbiAqIGFzIGEgYERpcmVjdGl2ZWAuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIGV4cG9ydCBjbGFzcyBCYXNlUGxhaW4ge1xuICogICBjb25zdHJ1Y3Rvcihwcml2YXRlIHZjcjogVmlld0NvbnRhaW5lclJlZikge31cbiAqIH1cbiAqXG4gKiBARGlyZWN0aXZlKHtzZWxlY3RvcjogJ1tibGFoXSd9KVxuICogZXhwb3J0IGNsYXNzIERlcml2ZWREaXIgZXh0ZW5kcyBCYXNlUGxhaW4ge31cbiAqIGBgYFxuICpcbiAqIFdoZW4gY29tcGlsaW5nIGBEZXJpdmVkRGlyYCB3aGljaCBleHRlbmRzIHRoZSB1bmRlY29yYXRlZCBgQmFzZVBsYWluYCBjbGFzcywgdGhlIGNvbXBpbGVyIG5lZWRzXG4gKiB0byBnZW5lcmF0ZSBhIGRpcmVjdGl2ZSBkZWYgKGDJtWRpcmApIGZvciBgRGVyaXZlZERpcmAuIEluIHBhcnRpY3VsYXIsIGl0IG5lZWRzIHRvIGdlbmVyYXRlIGFcbiAqIGZhY3RvcnkgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIGluc3RhbmNlcyBvZiBgRGVyaXZlZERpcmAuXG4gKlxuICogQXMgYERlcml2ZWREaXJgIGhhcyBubyBjb25zdHJ1Y3RvciwgdGhlIGZhY3RvcnkgZnVuY3Rpb24gZm9yIGBEZXJpdmVkRGlyYCBtdXN0IGRlbGVnYXRlIHRvIHRoZVxuICogZmFjdG9yeSBmdW5jdGlvbiBmb3IgYEJhc2VQbGFpbmAuIEJ1dCBmb3IgdGhpcyB0byB3b3JrLCBgQmFzZVBsYWluYCBtdXN0IGhhdmUgYSBmYWN0b3J5IGZ1bmN0aW9uLFxuICogaXRzZWxmLlxuICpcbiAqIFRoaXMgbWlncmF0aW9uIGFkZHMgYSBgRGlyZWN0aXZlYCBkZWNvcmF0b3IgdG8gc3VjaCB1bmRlY29yYXRlZCBwYXJlbnQgY2xhc3NlcywgdG8gZW5zdXJlIHRoYXRcbiAqIHRoZSBjb21waWxlciB3aWxsIGNyZWF0ZSB0aGUgbmVjZXNzYXJ5IGZhY3RvcnkgZnVuY3Rpb24uXG4gKlxuICogVGhlIHJlc3VsdGluZyBjb2RlIGxvb2tzIGxpa2U6XG4gKlxuICogYGBgXG4gKiBARGlyZWN0aXZlKClcbiAqIGV4cG9ydCBjbGFzcyBCYXNlUGxhaW4ge1xuICogICBjb25zdHJ1Y3Rvcihwcml2YXRlIHZjcjogVmlld0NvbnRhaW5lclJlZikge31cbiAqIH1cbiAqXG4gKiBARGlyZWN0aXZlKHtzZWxlY3RvcjogJ1tibGFoXSd9KVxuICogZXhwb3J0IGNsYXNzIERlcml2ZWREaXIgZXh0ZW5kcyBCYXNlUGxhaW4ge31cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgVW5kZWNvcmF0ZWRQYXJlbnRNaWdyYXRpb24gaW1wbGVtZW50cyBNaWdyYXRpb24ge1xuICBhcHBseShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgaG9zdDogTWlncmF0aW9uSG9zdCk6IHRzLkRpYWdub3N0aWN8bnVsbCB7XG4gICAgLy8gT25seSBpbnRlcmVzdGVkIGluIGBjbGF6emAgaWYgaXQgaXMgYSBgQ29tcG9uZW50YCBvciBhIGBEaXJlY3RpdmVgLFxuICAgIC8vIGFuZCBpdCBoYXMgbm8gY29uc3RydWN0b3Igb2YgaXRzIG93bi5cbiAgICBpZiAoIWhhc0RpcmVjdGl2ZURlY29yYXRvcihob3N0LCBjbGF6eikgfHwgaGFzQ29uc3RydWN0b3IoaG9zdCwgY2xhenopKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBPbmx5IGludGVyZXN0ZWQgaW4gYGNsYXp6YCBpZiBpdCBpbmhlcml0cyBmcm9tIGEgYmFzZSBjbGFzcy5cbiAgICBsZXQgYmFzZUNsYXp6UmVmID0gZGV0ZXJtaW5lQmFzZUNsYXNzKGNsYXp6LCBob3N0KTtcbiAgICB3aGlsZSAoYmFzZUNsYXp6UmVmICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBiYXNlQ2xhenogPSBiYXNlQ2xhenpSZWYubm9kZTtcblxuICAgICAgLy8gRG8gbm90IHByb2NlZWQgaWYgdGhlIGJhc2UgY2xhc3MgYWxyZWFkeSBoYXMgYSBkZWNvcmF0b3IsIG9yIGlzIG5vdCBpbiBzY29wZSBvZiB0aGVcbiAgICAgIC8vIGVudHJ5LXBvaW50IHRoYXQgaXMgY3VycmVudGx5IGJlaW5nIGNvbXBpbGVkLlxuICAgICAgaWYgKGhhc0RpcmVjdGl2ZURlY29yYXRvcihob3N0LCBiYXNlQ2xhenopIHx8ICFob3N0LmlzSW5TY29wZShiYXNlQ2xhenopKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBJbmplY3QgYW4gYEBEaXJlY3RpdmUoKWAgZGVjb3JhdG9yIGZvciB0aGUgYmFzZSBjbGFzcy5cbiAgICAgIGhvc3QuaW5qZWN0U3ludGhldGljRGVjb3JhdG9yKGJhc2VDbGF6eiwgY3JlYXRlRGlyZWN0aXZlRGVjb3JhdG9yKGJhc2VDbGF6eikpO1xuXG4gICAgICAvLyBJZiB0aGUgYmFzZSBjbGFzcyBoYXMgYSBjb25zdHJ1Y3RvciwgdGhlcmUncyBubyBuZWVkIHRvIGNvbnRpbnVlIHdhbGtpbmcgdXAgdGhlXG4gICAgICAvLyBpbmhlcml0YW5jZSBjaGFpbi4gVGhlIGluamVjdGVkIGRlY29yYXRvciBlbnN1cmVzIHRoYXQgYSBmYWN0b3J5IGlzIGdlbmVyYXRlZCB0aGF0IGRvZXNcbiAgICAgIC8vIG5vdCBkZWxlZ2F0ZSB0byB0aGUgYmFzZSBjbGFzcy5cbiAgICAgIGlmIChoYXNDb25zdHJ1Y3Rvcihob3N0LCBiYXNlQ2xhenopKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBDb250aW51ZSB3aXRoIGFub3RoZXIgbGV2ZWwgb2YgY2xhc3MgaW5oZXJpdGFuY2UuXG4gICAgICBiYXNlQ2xhenpSZWYgPSBkZXRlcm1pbmVCYXNlQ2xhc3MoYmFzZUNsYXp6LCBob3N0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIENvbXB1dGVzIGEgcmVmZXJlbmNlIHRvIHRoZSBiYXNlIGNsYXNzLCBvciBgbnVsbGAgaWYgdGhlIGNsYXNzIGhhcyBubyBiYXNlIGNsYXNzIG9yIGlmIGl0IGNvdWxkXG4gKiBub3QgYmUgc3RhdGljYWxseSBkZXRlcm1pbmVkLlxuICovXG5mdW5jdGlvbiBkZXRlcm1pbmVCYXNlQ2xhc3MoXG4gICAgY2xheno6IENsYXNzRGVjbGFyYXRpb24sIGhvc3Q6IE1pZ3JhdGlvbkhvc3QpOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj58bnVsbCB7XG4gIGNvbnN0IGJhc2VDbGFzc0V4cHIgPSBob3N0LnJlZmxlY3Rpb25Ib3N0LmdldEJhc2VDbGFzc0V4cHJlc3Npb24oY2xhenopO1xuICBpZiAoYmFzZUNsYXNzRXhwciA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgYmFzZUNsYXNzID0gaG9zdC5ldmFsdWF0b3IuZXZhbHVhdGUoYmFzZUNsYXNzRXhwcik7XG4gIGlmICghKGJhc2VDbGFzcyBpbnN0YW5jZW9mIFJlZmVyZW5jZSkgfHwgIWlzQ2xhc3NEZWNsYXJhdGlvbihiYXNlQ2xhc3Mubm9kZSBhcyB0cy5EZWNsYXJhdGlvbikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiBiYXNlQ2xhc3MgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+O1xufVxuIl19