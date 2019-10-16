(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/migrations/undecorated_parent_migration", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/migrations/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var utils_2 = require("@angular/compiler-cli/ngcc/src/migrations/utils");
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
            if (!utils_2.hasDirectiveDecorator(host, clazz) || utils_2.hasConstructor(host, clazz)) {
                return null;
            }
            // Only interested in `clazz` if it inherits from a base class.
            var baseClassExpr = host.reflectionHost.getBaseClassExpression(clazz);
            if (baseClassExpr === null) {
                return null;
            }
            if (!ts.isIdentifier(baseClassExpr)) {
                return diagnostics_1.makeDiagnostic(diagnostics_1.ErrorCode.NGCC_MIGRATION_EXTERNAL_BASE_CLASS, baseClassExpr, clazz.name.text + " class has a dynamic base class " + baseClassExpr.getText() + ", so it is not possible to migrate.");
            }
            var baseClazz = host.reflectionHost.getDeclarationOfIdentifier(baseClassExpr).node;
            if (baseClazz === null || !utils_2.isClassDeclaration(baseClazz)) {
                return null;
            }
            // Only interested in this base class if it doesn't have a `Directive` or `Component` decorator.
            if (utils_2.hasDirectiveDecorator(host, baseClazz)) {
                return null;
            }
            var importInfo = host.reflectionHost.getImportOfIdentifier(baseClassExpr);
            if (importInfo !== null && !utils_1.isRelativePath(importInfo.from)) {
                return diagnostics_1.makeDiagnostic(diagnostics_1.ErrorCode.NGCC_MIGRATION_EXTERNAL_BASE_CLASS, baseClassExpr, 'The base class was imported from an external entry-point so we cannot add a directive to it.');
            }
            host.injectSyntheticDecorator(baseClazz, utils_2.createDirectiveDecorator(baseClazz));
            return null;
        };
        return UndecoratedParentMigration;
    }());
    exports.UndecoratedParentMigration = UndecoratedParentMigration;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5kZWNvcmF0ZWRfcGFyZW50X21pZ3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9taWdyYXRpb25zL3VuZGVjb3JhdGVkX3BhcmVudF9taWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFDakMsMkVBQXlFO0lBRXpFLDhEQUF3QztJQUV4Qyx5RUFBNEc7SUFFNUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FxQ0c7SUFDSDtRQUFBO1FBeUNBLENBQUM7UUF4Q0MsMENBQUssR0FBTCxVQUFNLEtBQXVCLEVBQUUsSUFBbUI7WUFDaEQsc0VBQXNFO1lBQ3RFLHdDQUF3QztZQUN4QyxJQUFJLENBQUMsNkJBQXFCLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLHNCQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUN0RSxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsK0RBQStEO1lBQy9ELElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEUsSUFBSSxhQUFhLEtBQUssSUFBSSxFQUFFO2dCQUMxQixPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQ25DLE9BQU8sNEJBQWMsQ0FDakIsdUJBQVMsQ0FBQyxrQ0FBa0MsRUFBRSxhQUFhLEVBQ3hELEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSx3Q0FBbUMsYUFBYSxDQUFDLE9BQU8sRUFBRSx3Q0FBcUMsQ0FBQyxDQUFDO2FBQ3hIO1lBRUQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQyxhQUFhLENBQUcsQ0FBQyxJQUFJLENBQUM7WUFDdkYsSUFBSSxTQUFTLEtBQUssSUFBSSxJQUFJLENBQUMsMEJBQWtCLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ3hELE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxnR0FBZ0c7WUFDaEcsSUFBSSw2QkFBcUIsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUU7Z0JBQzFDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzVFLElBQUksVUFBVSxLQUFLLElBQUksSUFBSSxDQUFDLHNCQUFjLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMzRCxPQUFPLDRCQUFjLENBQ2pCLHVCQUFTLENBQUMsa0NBQWtDLEVBQUUsYUFBYSxFQUMzRCw4RkFBOEYsQ0FBQyxDQUFDO2FBQ3JHO1lBRUQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsRUFBRSxnQ0FBd0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBRTlFLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNILGlDQUFDO0lBQUQsQ0FBQyxBQXpDRCxJQXlDQztJQXpDWSxnRUFBMEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7RXJyb3JDb2RlLCBtYWtlRGlhZ25vc3RpY30gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtpc1JlbGF0aXZlUGF0aH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtNaWdyYXRpb24sIE1pZ3JhdGlvbkhvc3R9IGZyb20gJy4vbWlncmF0aW9uJztcbmltcG9ydCB7Y3JlYXRlRGlyZWN0aXZlRGVjb3JhdG9yLCBoYXNDb25zdHJ1Y3RvciwgaGFzRGlyZWN0aXZlRGVjb3JhdG9yLCBpc0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEVuc3VyZSB0aGF0IHRoZSBwYXJlbnRzIG9mIGRpcmVjdGl2ZXMgYW5kIGNvbXBvbmVudHMgdGhhdCBoYXZlIG5vIGNvbnN0cnVjdG9yIGFyZSBhbHNvIGRlY29yYXRlZFxuICogYXMgYSBgRGlyZWN0aXZlYC5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYFxuICogZXhwb3J0IGNsYXNzIEJhc2VQbGFpbiB7XG4gKiAgIGNvbnN0cnVjdG9yKHByaXZhdGUgdmNyOiBWaWV3Q29udGFpbmVyUmVmKSB7fVxuICogfVxuICpcbiAqIEBEaXJlY3RpdmUoe3NlbGVjdG9yOiAnW2JsYWhdJ30pXG4gKiBleHBvcnQgY2xhc3MgRGVyaXZlZERpciBleHRlbmRzIEJhc2VQbGFpbiB7fVxuICogYGBgXG4gKlxuICogV2hlbiBjb21waWxpbmcgYERlcml2ZWREaXJgIHdoaWNoIGV4dGVuZHMgdGhlIHVuZGVjb3JhdGVkIGBCYXNlUGxhaW5gIGNsYXNzLCB0aGUgY29tcGlsZXIgbmVlZHNcbiAqIHRvIGdlbmVyYXRlIGEgZGlyZWN0aXZlIGRlZiAoYMm1ZGlyYCkgZm9yIGBEZXJpdmVkRGlyYC4gSW4gcGFydGljdWxhciwgaXQgbmVlZHMgdG8gZ2VuZXJhdGUgYVxuICogZmFjdG9yeSBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgaW5zdGFuY2VzIG9mIGBEZXJpdmVkRGlyYC5cbiAqXG4gKiBBcyBgRGVyaXZlZERpcmAgaGFzIG5vIGNvbnN0cnVjdG9yLCB0aGUgZmFjdG9yeSBmdW5jdGlvbiBmb3IgYERlcml2ZWREaXJgIG11c3QgZGVsZWdhdGUgdG8gdGhlXG4gKiBmYWN0b3J5IGZ1bmN0aW9uIGZvciBgQmFzZVBsYWluYC4gQnV0IGZvciB0aGlzIHRvIHdvcmssIGBCYXNlUGxhaW5gIG11c3QgaGF2ZSBhIGZhY3RvcnkgZnVuY3Rpb24sXG4gKiBpdHNlbGYuXG4gKlxuICogVGhpcyBtaWdyYXRpb24gYWRkcyBhIGBEaXJlY3RpdmVgIGRlY29yYXRvciB0byBzdWNoIHVuZGVjb3JhdGVkIHBhcmVudCBjbGFzc2VzLCB0byBlbnN1cmUgdGhhdFxuICogdGhlIGNvbXBpbGVyIHdpbGwgY3JlYXRlIHRoZSBuZWNlc3NhcnkgZmFjdG9yeSBmdW5jdGlvbi5cbiAqXG4gKiBUaGUgcmVzdWx0aW5nIGNvZGUgbG9va3MgbGlrZTpcbiAqXG4gKiBgYGBcbiAqIEBEaXJlY3RpdmUoKVxuICogZXhwb3J0IGNsYXNzIEJhc2VQbGFpbiB7XG4gKiAgIGNvbnN0cnVjdG9yKHByaXZhdGUgdmNyOiBWaWV3Q29udGFpbmVyUmVmKSB7fVxuICogfVxuICpcbiAqIEBEaXJlY3RpdmUoe3NlbGVjdG9yOiAnW2JsYWhdJ30pXG4gKiBleHBvcnQgY2xhc3MgRGVyaXZlZERpciBleHRlbmRzIEJhc2VQbGFpbiB7fVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBVbmRlY29yYXRlZFBhcmVudE1pZ3JhdGlvbiBpbXBsZW1lbnRzIE1pZ3JhdGlvbiB7XG4gIGFwcGx5KGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBob3N0OiBNaWdyYXRpb25Ib3N0KTogdHMuRGlhZ25vc3RpY3xudWxsIHtcbiAgICAvLyBPbmx5IGludGVyZXN0ZWQgaW4gYGNsYXp6YCBpZiBpdCBpcyBhIGBDb21wb25lbnRgIG9yIGEgYERpcmVjdGl2ZWAsXG4gICAgLy8gYW5kIGl0IGhhcyBubyBjb25zdHJ1Y3RvciBvZiBpdHMgb3duLlxuICAgIGlmICghaGFzRGlyZWN0aXZlRGVjb3JhdG9yKGhvc3QsIGNsYXp6KSB8fCBoYXNDb25zdHJ1Y3Rvcihob3N0LCBjbGF6eikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIE9ubHkgaW50ZXJlc3RlZCBpbiBgY2xhenpgIGlmIGl0IGluaGVyaXRzIGZyb20gYSBiYXNlIGNsYXNzLlxuICAgIGNvbnN0IGJhc2VDbGFzc0V4cHIgPSBob3N0LnJlZmxlY3Rpb25Ib3N0LmdldEJhc2VDbGFzc0V4cHJlc3Npb24oY2xhenopO1xuICAgIGlmIChiYXNlQ2xhc3NFeHByID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihiYXNlQ2xhc3NFeHByKSkge1xuICAgICAgcmV0dXJuIG1ha2VEaWFnbm9zdGljKFxuICAgICAgICAgIEVycm9yQ29kZS5OR0NDX01JR1JBVElPTl9FWFRFUk5BTF9CQVNFX0NMQVNTLCBiYXNlQ2xhc3NFeHByLFxuICAgICAgICAgIGAke2NsYXp6Lm5hbWUudGV4dH0gY2xhc3MgaGFzIGEgZHluYW1pYyBiYXNlIGNsYXNzICR7YmFzZUNsYXNzRXhwci5nZXRUZXh0KCl9LCBzbyBpdCBpcyBub3QgcG9zc2libGUgdG8gbWlncmF0ZS5gKTtcbiAgICB9XG5cbiAgICBjb25zdCBiYXNlQ2xhenogPSBob3N0LnJlZmxlY3Rpb25Ib3N0LmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGJhc2VDbGFzc0V4cHIpICEubm9kZTtcbiAgICBpZiAoYmFzZUNsYXp6ID09PSBudWxsIHx8ICFpc0NsYXNzRGVjbGFyYXRpb24oYmFzZUNsYXp6KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gT25seSBpbnRlcmVzdGVkIGluIHRoaXMgYmFzZSBjbGFzcyBpZiBpdCBkb2Vzbid0IGhhdmUgYSBgRGlyZWN0aXZlYCBvciBgQ29tcG9uZW50YCBkZWNvcmF0b3IuXG4gICAgaWYgKGhhc0RpcmVjdGl2ZURlY29yYXRvcihob3N0LCBiYXNlQ2xhenopKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRJbmZvID0gaG9zdC5yZWZsZWN0aW9uSG9zdC5nZXRJbXBvcnRPZklkZW50aWZpZXIoYmFzZUNsYXNzRXhwcik7XG4gICAgaWYgKGltcG9ydEluZm8gIT09IG51bGwgJiYgIWlzUmVsYXRpdmVQYXRoKGltcG9ydEluZm8uZnJvbSkpIHtcbiAgICAgIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgICAgICBFcnJvckNvZGUuTkdDQ19NSUdSQVRJT05fRVhURVJOQUxfQkFTRV9DTEFTUywgYmFzZUNsYXNzRXhwcixcbiAgICAgICAgICAnVGhlIGJhc2UgY2xhc3Mgd2FzIGltcG9ydGVkIGZyb20gYW4gZXh0ZXJuYWwgZW50cnktcG9pbnQgc28gd2UgY2Fubm90IGFkZCBhIGRpcmVjdGl2ZSB0byBpdC4nKTtcbiAgICB9XG5cbiAgICBob3N0LmluamVjdFN5bnRoZXRpY0RlY29yYXRvcihiYXNlQ2xhenosIGNyZWF0ZURpcmVjdGl2ZURlY29yYXRvcihiYXNlQ2xhenopKTtcblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iXX0=