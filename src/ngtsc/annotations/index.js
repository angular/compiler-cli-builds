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
        define("@angular/compiler-cli/src/ngtsc/annotations", ["require", "exports", "@angular/compiler-cli/src/ngtsc/annotations/src/component", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/injectable", "@angular/compiler-cli/src/ngtsc/annotations/src/ng_module", "@angular/compiler-cli/src/ngtsc/annotations/src/selector_scope"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var component_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/component");
    exports.ComponentDecoratorHandler = component_1.ComponentDecoratorHandler;
    var directive_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/directive");
    exports.DirectiveDecoratorHandler = directive_1.DirectiveDecoratorHandler;
    var injectable_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/injectable");
    exports.InjectableDecoratorHandler = injectable_1.InjectableDecoratorHandler;
    var ng_module_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/ng_module");
    exports.NgModuleDecoratorHandler = ng_module_1.NgModuleDecoratorHandler;
    var selector_scope_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/selector_scope");
    exports.SelectorScopeRegistry = selector_scope_1.SelectorScopeRegistry;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsdUZBQTBEO0lBQWxELGdEQUFBLHlCQUF5QixDQUFBO0lBQ2pDLHVGQUEwRDtJQUFsRCxnREFBQSx5QkFBeUIsQ0FBQTtJQUNqQyx5RkFBNEQ7SUFBcEQsa0RBQUEsMEJBQTBCLENBQUE7SUFDbEMsdUZBQXlEO0lBQWpELCtDQUFBLHdCQUF3QixDQUFBO0lBQ2hDLGlHQUE2RTtJQUFuRCxpREFBQSxxQkFBcUIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0IHtDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuL3NyYy9jb21wb25lbnQnO1xuZXhwb3J0IHtEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuL3NyYy9kaXJlY3RpdmUnO1xuZXhwb3J0IHtJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi9zcmMvaW5qZWN0YWJsZSc7XG5leHBvcnQge05nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi9zcmMvbmdfbW9kdWxlJztcbmV4cG9ydCB7Q29tcGlsYXRpb25TY29wZSwgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5fSBmcm9tICcuL3NyYy9zZWxlY3Rvcl9zY29wZSc7XG4iXX0=