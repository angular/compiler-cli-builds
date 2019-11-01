(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler", "@angular/compiler-cli/src/diagnostics/expression_diagnostics", "@angular/compiler-cli/src/diagnostics/expression_type", "@angular/compiler-cli/src/diagnostics/symbols", "@angular/compiler-cli/src/diagnostics/typescript_symbols", "@angular/compiler-cli/src/version", "@angular/compiler-cli/src/metadata/index", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/entry_points", "@angular/compiler-cli/src/perform_compile", "@angular/compiler-cli/src/tooling", "@angular/compiler-cli/src/transformers/util", "@angular/compiler-cli/src/ngtsc/tsc_plugin"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var compiler_1 = require("@angular/compiler");
    exports.StaticReflector = compiler_1.StaticReflector;
    exports.StaticSymbol = compiler_1.StaticSymbol;
    var expression_diagnostics_1 = require("@angular/compiler-cli/src/diagnostics/expression_diagnostics");
    exports.getExpressionScope = expression_diagnostics_1.getExpressionScope;
    exports.getTemplateExpressionDiagnostics = expression_diagnostics_1.getTemplateExpressionDiagnostics;
    var expression_type_1 = require("@angular/compiler-cli/src/diagnostics/expression_type");
    exports.AstType = expression_type_1.AstType;
    var symbols_1 = require("@angular/compiler-cli/src/diagnostics/symbols");
    exports.BuiltinType = symbols_1.BuiltinType;
    var typescript_symbols_1 = require("@angular/compiler-cli/src/diagnostics/typescript_symbols");
    exports.getClassMembersFromDeclaration = typescript_symbols_1.getClassMembersFromDeclaration;
    exports.getPipesTable = typescript_symbols_1.getPipesTable;
    exports.getSymbolQuery = typescript_symbols_1.getSymbolQuery;
    var version_1 = require("@angular/compiler-cli/src/version");
    exports.VERSION = version_1.VERSION;
    tslib_1.__exportStar(require("@angular/compiler-cli/src/metadata/index"), exports);
    tslib_1.__exportStar(require("@angular/compiler-cli/src/transformers/api"), exports);
    tslib_1.__exportStar(require("@angular/compiler-cli/src/transformers/entry_points"), exports);
    tslib_1.__exportStar(require("@angular/compiler-cli/src/perform_compile"), exports);
    tslib_1.__exportStar(require("@angular/compiler-cli/src/tooling"), exports);
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    exports.ngToTsDiagnostic = util_1.ngToTsDiagnostic;
    var tsc_plugin_1 = require("@angular/compiler-cli/src/ngtsc/tsc_plugin");
    exports.NgTscPlugin = tsc_plugin_1.NgTscPlugin;
    file_system_1.setFileSystem(new file_system_1.NodeJSFileSystem());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQXdFO0lBRXhFLDhDQUF5SDtJQUF4RCxxQ0FBQSxlQUFlLENBQUE7SUFBRSxrQ0FBQSxZQUFZLENBQUE7SUFDOUYsdUdBQXNJO0lBQXRHLHNEQUFBLGtCQUFrQixDQUFBO0lBQUUsb0VBQUEsZ0NBQWdDLENBQUE7SUFDcEYseUZBQXdGO0lBQWhGLG9DQUFBLE9BQU8sQ0FBQTtJQUNmLHlFQUEwSztJQUFsSyxnQ0FBQSxXQUFXLENBQUE7SUFDbkIsK0ZBQW1IO0lBQTNHLDhEQUFBLDhCQUE4QixDQUFBO0lBQUUsNkNBQUEsYUFBYSxDQUFBO0lBQUUsOENBQUEsY0FBYyxDQUFBO0lBQ3JFLDZEQUFzQztJQUE5Qiw0QkFBQSxPQUFPLENBQUE7SUFFZixtRkFBK0I7SUFDL0IscUZBQXVDO0lBQ3ZDLDhGQUFnRDtJQUVoRCxvRkFBc0M7SUFDdEMsNEVBQThCO0lBSzlCLG9FQUF5RDtJQUFqRCxrQ0FBQSxnQkFBZ0IsQ0FBQTtJQUN4Qix5RUFBbUQ7SUFBM0MsbUNBQUEsV0FBVyxDQUFBO0lBRW5CLDJCQUFhLENBQUMsSUFBSSw4QkFBZ0IsRUFBRSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge05vZGVKU0ZpbGVTeXN0ZW0sIHNldEZpbGVTeXN0ZW19IGZyb20gJy4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuZXhwb3J0IHtBb3RDb21waWxlckhvc3QsIEFvdENvbXBpbGVySG9zdCBhcyBTdGF0aWNSZWZsZWN0b3JIb3N0LCBTdGF0aWNSZWZsZWN0b3IsIFN0YXRpY1N5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuZXhwb3J0IHtEaWFnbm9zdGljVGVtcGxhdGVJbmZvLCBnZXRFeHByZXNzaW9uU2NvcGUsIGdldFRlbXBsYXRlRXhwcmVzc2lvbkRpYWdub3N0aWNzfSBmcm9tICcuL3NyYy9kaWFnbm9zdGljcy9leHByZXNzaW9uX2RpYWdub3N0aWNzJztcbmV4cG9ydCB7QXN0VHlwZSwgRXhwcmVzc2lvbkRpYWdub3N0aWNzQ29udGV4dH0gZnJvbSAnLi9zcmMvZGlhZ25vc3RpY3MvZXhwcmVzc2lvbl90eXBlJztcbmV4cG9ydCB7QnVpbHRpblR5cGUsIERlY2xhcmF0aW9uS2luZCwgRGVmaW5pdGlvbiwgUGlwZUluZm8sIFBpcGVzLCBTaWduYXR1cmUsIFNwYW4sIFN5bWJvbCwgU3ltYm9sRGVjbGFyYXRpb24sIFN5bWJvbFF1ZXJ5LCBTeW1ib2xUYWJsZX0gZnJvbSAnLi9zcmMvZGlhZ25vc3RpY3Mvc3ltYm9scyc7XG5leHBvcnQge2dldENsYXNzTWVtYmVyc0Zyb21EZWNsYXJhdGlvbiwgZ2V0UGlwZXNUYWJsZSwgZ2V0U3ltYm9sUXVlcnl9IGZyb20gJy4vc3JjL2RpYWdub3N0aWNzL3R5cGVzY3JpcHRfc3ltYm9scyc7XG5leHBvcnQge1ZFUlNJT059IGZyb20gJy4vc3JjL3ZlcnNpb24nO1xuXG5leHBvcnQgKiBmcm9tICcuL3NyYy9tZXRhZGF0YSc7XG5leHBvcnQgKiBmcm9tICcuL3NyYy90cmFuc2Zvcm1lcnMvYXBpJztcbmV4cG9ydCAqIGZyb20gJy4vc3JjL3RyYW5zZm9ybWVycy9lbnRyeV9wb2ludHMnO1xuXG5leHBvcnQgKiBmcm9tICcuL3NyYy9wZXJmb3JtX2NvbXBpbGUnO1xuZXhwb3J0ICogZnJvbSAnLi9zcmMvdG9vbGluZyc7XG5cbi8vIFRPRE8odGJvc2NoKTogcmVtb3ZlIHRoaXMgb25jZSB1c2FnZXMgaW4gRzMgYXJlIGNoYW5nZWQgdG8gYENvbXBpbGVyT3B0aW9uc2BcbmV4cG9ydCB7Q29tcGlsZXJPcHRpb25zIGFzIEFuZ3VsYXJDb21waWxlck9wdGlvbnN9IGZyb20gJy4vc3JjL3RyYW5zZm9ybWVycy9hcGknO1xuXG5leHBvcnQge25nVG9Uc0RpYWdub3N0aWN9IGZyb20gJy4vc3JjL3RyYW5zZm9ybWVycy91dGlsJztcbmV4cG9ydCB7TmdUc2NQbHVnaW59IGZyb20gJy4vc3JjL25ndHNjL3RzY19wbHVnaW4nO1xuXG5zZXRGaWxlU3lzdGVtKG5ldyBOb2RlSlNGaWxlU3lzdGVtKCkpO1xuIl19