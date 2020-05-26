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
        define("@angular/compiler-cli/ngcc/src/migrations/undecorated_child_migration", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/annotations/src/util", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/ngcc/src/migrations/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UndecoratedChildMigration = void 0;
    var tslib_1 = require("tslib");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/migrations/utils");
    var UndecoratedChildMigration = /** @class */ (function () {
        function UndecoratedChildMigration() {
        }
        UndecoratedChildMigration.prototype.apply = function (clazz, host) {
            var e_1, _a;
            // This migration looks at NgModules and considers the directives (and pipes) it declares.
            // It verifies that these classes have decorators.
            var moduleMeta = host.metadata.getNgModuleMetadata(new imports_1.Reference(clazz));
            if (moduleMeta === null) {
                // Not an NgModule; don't care.
                return null;
            }
            try {
                // Examine each of the declarations to see if it needs to be migrated.
                for (var _b = tslib_1.__values(moduleMeta.declarations), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var decl = _c.value;
                    this.maybeMigrate(decl, host);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return null;
        };
        UndecoratedChildMigration.prototype.maybeMigrate = function (ref, host) {
            if (utils_1.hasDirectiveDecorator(host, ref.node) || utils_1.hasPipeDecorator(host, ref.node)) {
                // Stop if one of the classes in the chain is actually decorated with @Directive, @Component,
                // or @Pipe.
                return;
            }
            var baseRef = util_1.readBaseClass(ref.node, host.reflectionHost, host.evaluator);
            if (baseRef === null) {
                // Stop: can't migrate a class with no parent.
                return;
            }
            else if (baseRef === 'dynamic') {
                // Stop: can't migrate a class with an indeterminate parent.
                return;
            }
            // Apply the migration recursively, to handle inheritance chains.
            this.maybeMigrate(baseRef, host);
            // After the above call, `host.metadata` should have metadata for the base class, if indeed this
            // is a directive inheritance chain.
            var baseMeta = host.metadata.getDirectiveMetadata(baseRef);
            if (baseMeta === null) {
                // Stop: this isn't a directive inheritance chain after all.
                return;
            }
            // Otherwise, decorate the class with @Component() or @Directive(), as appropriate.
            if (baseMeta.isComponent) {
                host.injectSyntheticDecorator(ref.node, utils_1.createComponentDecorator(ref.node, baseMeta), transform_1.HandlerFlags.FULL_INHERITANCE);
            }
            else {
                host.injectSyntheticDecorator(ref.node, utils_1.createDirectiveDecorator(ref.node, baseMeta), transform_1.HandlerFlags.FULL_INHERITANCE);
            }
            // Success!
        };
        return UndecoratedChildMigration;
    }());
    exports.UndecoratedChildMigration = UndecoratedChildMigration;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5kZWNvcmF0ZWRfY2hpbGRfbWlncmF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL21pZ3JhdGlvbnMvdW5kZWNvcmF0ZWRfY2hpbGRfbWlncmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFJSCw2RUFBc0U7SUFDdEUsbUVBQXFEO0lBRXJELHVFQUEwRDtJQUcxRCx5RUFBb0g7SUFFcEg7UUFBQTtRQXdEQSxDQUFDO1FBdkRDLHlDQUFLLEdBQUwsVUFBTSxLQUF1QixFQUFFLElBQW1COztZQUNoRCwwRkFBMEY7WUFDMUYsa0RBQWtEO1lBQ2xELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsSUFBSSxtQkFBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDM0UsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO2dCQUN2QiwrQkFBK0I7Z0JBQy9CLE9BQU8sSUFBSSxDQUFDO2FBQ2I7O2dCQUVELHNFQUFzRTtnQkFDdEUsS0FBbUIsSUFBQSxLQUFBLGlCQUFBLFVBQVUsQ0FBQyxZQUFZLENBQUEsZ0JBQUEsNEJBQUU7b0JBQXZDLElBQU0sSUFBSSxXQUFBO29CQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUMvQjs7Ozs7Ozs7O1lBRUQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsZ0RBQVksR0FBWixVQUFhLEdBQWdDLEVBQUUsSUFBbUI7WUFDaEUsSUFBSSw2QkFBcUIsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLHdCQUFnQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzdFLDZGQUE2RjtnQkFDN0YsWUFBWTtnQkFDWixPQUFPO2FBQ1I7WUFFRCxJQUFNLE9BQU8sR0FBRyxvQkFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0UsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO2dCQUNwQiw4Q0FBOEM7Z0JBQzlDLE9BQU87YUFDUjtpQkFBTSxJQUFJLE9BQU8sS0FBSyxTQUFTLEVBQUU7Z0JBQ2hDLDREQUE0RDtnQkFDNUQsT0FBTzthQUNSO1lBRUQsaUVBQWlFO1lBQ2pFLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRWpDLGdHQUFnRztZQUNoRyxvQ0FBb0M7WUFDcEMsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3RCxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JCLDREQUE0RDtnQkFDNUQsT0FBTzthQUNSO1lBRUQsbUZBQW1GO1lBQ25GLElBQUksUUFBUSxDQUFDLFdBQVcsRUFBRTtnQkFDeEIsSUFBSSxDQUFDLHdCQUF3QixDQUN6QixHQUFHLENBQUMsSUFBSSxFQUFFLGdDQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLEVBQUUsd0JBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQzVGO2lCQUFNO2dCQUNMLElBQUksQ0FBQyx3QkFBd0IsQ0FDekIsR0FBRyxDQUFDLElBQUksRUFBRSxnQ0FBd0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxFQUFFLHdCQUFZLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzthQUM1RjtZQUVELFdBQVc7UUFDYixDQUFDO1FBQ0gsZ0NBQUM7SUFBRCxDQUFDLEFBeERELElBd0RDO0lBeERZLDhEQUF5QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7cmVhZEJhc2VDbGFzc30gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy91dGlsJztcbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7SGFuZGxlckZsYWdzfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNmb3JtJztcblxuaW1wb3J0IHtNaWdyYXRpb24sIE1pZ3JhdGlvbkhvc3R9IGZyb20gJy4vbWlncmF0aW9uJztcbmltcG9ydCB7Y3JlYXRlQ29tcG9uZW50RGVjb3JhdG9yLCBjcmVhdGVEaXJlY3RpdmVEZWNvcmF0b3IsIGhhc0RpcmVjdGl2ZURlY29yYXRvciwgaGFzUGlwZURlY29yYXRvcn0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjbGFzcyBVbmRlY29yYXRlZENoaWxkTWlncmF0aW9uIGltcGxlbWVudHMgTWlncmF0aW9uIHtcbiAgYXBwbHkoY2xheno6IENsYXNzRGVjbGFyYXRpb24sIGhvc3Q6IE1pZ3JhdGlvbkhvc3QpOiB0cy5EaWFnbm9zdGljfG51bGwge1xuICAgIC8vIFRoaXMgbWlncmF0aW9uIGxvb2tzIGF0IE5nTW9kdWxlcyBhbmQgY29uc2lkZXJzIHRoZSBkaXJlY3RpdmVzIChhbmQgcGlwZXMpIGl0IGRlY2xhcmVzLlxuICAgIC8vIEl0IHZlcmlmaWVzIHRoYXQgdGhlc2UgY2xhc3NlcyBoYXZlIGRlY29yYXRvcnMuXG4gICAgY29uc3QgbW9kdWxlTWV0YSA9IGhvc3QubWV0YWRhdGEuZ2V0TmdNb2R1bGVNZXRhZGF0YShuZXcgUmVmZXJlbmNlKGNsYXp6KSk7XG4gICAgaWYgKG1vZHVsZU1ldGEgPT09IG51bGwpIHtcbiAgICAgIC8vIE5vdCBhbiBOZ01vZHVsZTsgZG9uJ3QgY2FyZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEV4YW1pbmUgZWFjaCBvZiB0aGUgZGVjbGFyYXRpb25zIHRvIHNlZSBpZiBpdCBuZWVkcyB0byBiZSBtaWdyYXRlZC5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgbW9kdWxlTWV0YS5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIHRoaXMubWF5YmVNaWdyYXRlKGRlY2wsIGhvc3QpO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbWF5YmVNaWdyYXRlKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBob3N0OiBNaWdyYXRpb25Ib3N0KTogdm9pZCB7XG4gICAgaWYgKGhhc0RpcmVjdGl2ZURlY29yYXRvcihob3N0LCByZWYubm9kZSkgfHwgaGFzUGlwZURlY29yYXRvcihob3N0LCByZWYubm9kZSkpIHtcbiAgICAgIC8vIFN0b3AgaWYgb25lIG9mIHRoZSBjbGFzc2VzIGluIHRoZSBjaGFpbiBpcyBhY3R1YWxseSBkZWNvcmF0ZWQgd2l0aCBARGlyZWN0aXZlLCBAQ29tcG9uZW50LFxuICAgICAgLy8gb3IgQFBpcGUuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYmFzZVJlZiA9IHJlYWRCYXNlQ2xhc3MocmVmLm5vZGUsIGhvc3QucmVmbGVjdGlvbkhvc3QsIGhvc3QuZXZhbHVhdG9yKTtcbiAgICBpZiAoYmFzZVJlZiA9PT0gbnVsbCkge1xuICAgICAgLy8gU3RvcDogY2FuJ3QgbWlncmF0ZSBhIGNsYXNzIHdpdGggbm8gcGFyZW50LlxuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoYmFzZVJlZiA9PT0gJ2R5bmFtaWMnKSB7XG4gICAgICAvLyBTdG9wOiBjYW4ndCBtaWdyYXRlIGEgY2xhc3Mgd2l0aCBhbiBpbmRldGVybWluYXRlIHBhcmVudC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBBcHBseSB0aGUgbWlncmF0aW9uIHJlY3Vyc2l2ZWx5LCB0byBoYW5kbGUgaW5oZXJpdGFuY2UgY2hhaW5zLlxuICAgIHRoaXMubWF5YmVNaWdyYXRlKGJhc2VSZWYsIGhvc3QpO1xuXG4gICAgLy8gQWZ0ZXIgdGhlIGFib3ZlIGNhbGwsIGBob3N0Lm1ldGFkYXRhYCBzaG91bGQgaGF2ZSBtZXRhZGF0YSBmb3IgdGhlIGJhc2UgY2xhc3MsIGlmIGluZGVlZCB0aGlzXG4gICAgLy8gaXMgYSBkaXJlY3RpdmUgaW5oZXJpdGFuY2UgY2hhaW4uXG4gICAgY29uc3QgYmFzZU1ldGEgPSBob3N0Lm1ldGFkYXRhLmdldERpcmVjdGl2ZU1ldGFkYXRhKGJhc2VSZWYpO1xuICAgIGlmIChiYXNlTWV0YSA9PT0gbnVsbCkge1xuICAgICAgLy8gU3RvcDogdGhpcyBpc24ndCBhIGRpcmVjdGl2ZSBpbmhlcml0YW5jZSBjaGFpbiBhZnRlciBhbGwuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCBkZWNvcmF0ZSB0aGUgY2xhc3Mgd2l0aCBAQ29tcG9uZW50KCkgb3IgQERpcmVjdGl2ZSgpLCBhcyBhcHByb3ByaWF0ZS5cbiAgICBpZiAoYmFzZU1ldGEuaXNDb21wb25lbnQpIHtcbiAgICAgIGhvc3QuaW5qZWN0U3ludGhldGljRGVjb3JhdG9yKFxuICAgICAgICAgIHJlZi5ub2RlLCBjcmVhdGVDb21wb25lbnREZWNvcmF0b3IocmVmLm5vZGUsIGJhc2VNZXRhKSwgSGFuZGxlckZsYWdzLkZVTExfSU5IRVJJVEFOQ0UpO1xuICAgIH0gZWxzZSB7XG4gICAgICBob3N0LmluamVjdFN5bnRoZXRpY0RlY29yYXRvcihcbiAgICAgICAgICByZWYubm9kZSwgY3JlYXRlRGlyZWN0aXZlRGVjb3JhdG9yKHJlZi5ub2RlLCBiYXNlTWV0YSksIEhhbmRsZXJGbGFncy5GVUxMX0lOSEVSSVRBTkNFKTtcbiAgICB9XG5cbiAgICAvLyBTdWNjZXNzIVxuICB9XG59XG4iXX0=