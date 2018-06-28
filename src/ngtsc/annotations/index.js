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
        define("@angular/compiler-cli/src/ngtsc/annotations", ["require", "exports", "@angular/compiler-cli/src/ngtsc/annotations/src/component", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/injectable", "@angular/compiler-cli/src/ngtsc/annotations/src/ng_module", "@angular/compiler-cli/src/ngtsc/annotations/src/pipe", "@angular/compiler-cli/src/ngtsc/annotations/src/selector_scope"], factory);
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
    var pipe_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/pipe");
    exports.PipeDecoratorHandler = pipe_1.PipeDecoratorHandler;
    var selector_scope_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/selector_scope");
    exports.SelectorScopeRegistry = selector_scope_1.SelectorScopeRegistry;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsdUZBQTBEO0lBQWxELGdEQUFBLHlCQUF5QixDQUFBO0lBQ2pDLHVGQUEwRDtJQUFsRCxnREFBQSx5QkFBeUIsQ0FBQTtJQUNqQyx5RkFBNEQ7SUFBcEQsa0RBQUEsMEJBQTBCLENBQUE7SUFDbEMsdUZBQXlEO0lBQWpELCtDQUFBLHdCQUF3QixDQUFBO0lBQ2hDLDZFQUFnRDtJQUF4QyxzQ0FBQSxvQkFBb0IsQ0FBQTtJQUM1QixpR0FBNkU7SUFBbkQsaURBQUEscUJBQXFCLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCB7Q29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi9zcmMvY29tcG9uZW50JztcbmV4cG9ydCB7RGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi9zcmMvZGlyZWN0aXZlJztcbmV4cG9ydCB7SW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4vc3JjL2luamVjdGFibGUnO1xuZXhwb3J0IHtOZ01vZHVsZURlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4vc3JjL25nX21vZHVsZSc7XG5leHBvcnQge1BpcGVEZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuL3NyYy9waXBlJztcbmV4cG9ydCB7Q29tcGlsYXRpb25TY29wZSwgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5fSBmcm9tICcuL3NyYy9zZWxlY3Rvcl9zY29wZSc7XG4iXX0=