(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/diagnostics/expression_diagnostics", "@angular/compiler-cli/src/diagnostics/expression_type", "@angular/compiler-cli/src/diagnostics/symbols", "@angular/compiler-cli/src/diagnostics/typescript_symbols", "@angular/compiler-cli/src/version", "@angular/compiler-cli/src/metadata/index", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/entry_points", "@angular/compiler-cli/src/perform_compile", "@angular/compiler-cli/src/ngtools_api", "@angular/compiler-cli/src/transformers/util", "@angular/compiler-cli/src/ngtsc/tsc_plugin"], factory);
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
    var ngtools_api_1 = require("@angular/compiler-cli/src/ngtools_api");
    exports.__NGTOOLS_PRIVATE_API_2 = ngtools_api_1.NgTools_InternalApi_NG_2;
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    exports.ngToTsDiagnostic = util_1.ngToTsDiagnostic;
    var tsc_plugin_1 = require("@angular/compiler-cli/src/ngtsc/tsc_plugin");
    exports.NgTscPlugin = tsc_plugin_1.NgTscPlugin;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsOENBQXlIO0lBQXhELHFDQUFBLGVBQWUsQ0FBQTtJQUFFLGtDQUFBLFlBQVksQ0FBQTtJQUM5Rix1R0FBc0k7SUFBdEcsc0RBQUEsa0JBQWtCLENBQUE7SUFBRSxvRUFBQSxnQ0FBZ0MsQ0FBQTtJQUNwRix5RkFBd0Y7SUFBaEYsb0NBQUEsT0FBTyxDQUFBO0lBQ2YseUVBQTBLO0lBQWxLLGdDQUFBLFdBQVcsQ0FBQTtJQUNuQiwrRkFBbUg7SUFBM0csOERBQUEsOEJBQThCLENBQUE7SUFBRSw2Q0FBQSxhQUFhLENBQUE7SUFBRSw4Q0FBQSxjQUFjLENBQUE7SUFDckUsNkRBQXNDO0lBQTlCLDRCQUFBLE9BQU8sQ0FBQTtJQUVmLG1GQUErQjtJQUMvQixxRkFBdUM7SUFDdkMsOEZBQWdEO0lBRWhELG9GQUFzQztJQUt0QyxxRUFBc0Y7SUFBOUUsZ0RBQUEsd0JBQXdCLENBQTJCO0lBRTNELG9FQUF5RDtJQUFqRCxrQ0FBQSxnQkFBZ0IsQ0FBQTtJQUN4Qix5RUFBbUQ7SUFBM0MsbUNBQUEsV0FBVyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuZXhwb3J0IHtBb3RDb21waWxlckhvc3QsIEFvdENvbXBpbGVySG9zdCBhcyBTdGF0aWNSZWZsZWN0b3JIb3N0LCBTdGF0aWNSZWZsZWN0b3IsIFN0YXRpY1N5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuZXhwb3J0IHtEaWFnbm9zdGljVGVtcGxhdGVJbmZvLCBnZXRFeHByZXNzaW9uU2NvcGUsIGdldFRlbXBsYXRlRXhwcmVzc2lvbkRpYWdub3N0aWNzfSBmcm9tICcuL3NyYy9kaWFnbm9zdGljcy9leHByZXNzaW9uX2RpYWdub3N0aWNzJztcbmV4cG9ydCB7QXN0VHlwZSwgRXhwcmVzc2lvbkRpYWdub3N0aWNzQ29udGV4dH0gZnJvbSAnLi9zcmMvZGlhZ25vc3RpY3MvZXhwcmVzc2lvbl90eXBlJztcbmV4cG9ydCB7QnVpbHRpblR5cGUsIERlY2xhcmF0aW9uS2luZCwgRGVmaW5pdGlvbiwgUGlwZUluZm8sIFBpcGVzLCBTaWduYXR1cmUsIFNwYW4sIFN5bWJvbCwgU3ltYm9sRGVjbGFyYXRpb24sIFN5bWJvbFF1ZXJ5LCBTeW1ib2xUYWJsZX0gZnJvbSAnLi9zcmMvZGlhZ25vc3RpY3Mvc3ltYm9scyc7XG5leHBvcnQge2dldENsYXNzTWVtYmVyc0Zyb21EZWNsYXJhdGlvbiwgZ2V0UGlwZXNUYWJsZSwgZ2V0U3ltYm9sUXVlcnl9IGZyb20gJy4vc3JjL2RpYWdub3N0aWNzL3R5cGVzY3JpcHRfc3ltYm9scyc7XG5leHBvcnQge1ZFUlNJT059IGZyb20gJy4vc3JjL3ZlcnNpb24nO1xuXG5leHBvcnQgKiBmcm9tICcuL3NyYy9tZXRhZGF0YSc7XG5leHBvcnQgKiBmcm9tICcuL3NyYy90cmFuc2Zvcm1lcnMvYXBpJztcbmV4cG9ydCAqIGZyb20gJy4vc3JjL3RyYW5zZm9ybWVycy9lbnRyeV9wb2ludHMnO1xuXG5leHBvcnQgKiBmcm9tICcuL3NyYy9wZXJmb3JtX2NvbXBpbGUnO1xuXG4vLyBUT0RPKHRib3NjaCk6IHJlbW92ZSB0aGlzIG9uY2UgY2xpIDEuNSBpcyBmdWxseSByZWxlYXNlZCxcbi8vIGFuZCB1c2FnZXMgaW4gRzMgYXJlIGNoYW5nZWQgdG8gYENvbXBpbGVyT3B0aW9uc2AuXG5leHBvcnQge0NvbXBpbGVyT3B0aW9ucyBhcyBBbmd1bGFyQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL3NyYy90cmFuc2Zvcm1lcnMvYXBpJztcbmV4cG9ydCB7TmdUb29sc19JbnRlcm5hbEFwaV9OR18yIGFzIF9fTkdUT09MU19QUklWQVRFX0FQSV8yfSBmcm9tICcuL3NyYy9uZ3Rvb2xzX2FwaSc7XG5cbmV4cG9ydCB7bmdUb1RzRGlhZ25vc3RpY30gZnJvbSAnLi9zcmMvdHJhbnNmb3JtZXJzL3V0aWwnO1xuZXhwb3J0IHtOZ1RzY1BsdWdpbn0gZnJvbSAnLi9zcmMvbmd0c2MvdHNjX3BsdWdpbic7XG4iXX0=