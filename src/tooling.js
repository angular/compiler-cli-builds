/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/src/tooling", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/transformers/downlevel_decorators_transform"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.constructorParametersDownlevelTransform = exports.GLOBAL_DEFS_FOR_TERSER_WITH_AOT = exports.GLOBAL_DEFS_FOR_TERSER = void 0;
    var tslib_1 = require("tslib");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var downlevel_decorators_transform_1 = require("@angular/compiler-cli/src/transformers/downlevel_decorators_transform");
    /**
     * Known values for global variables in `@angular/core` that Terser should set using
     * https://github.com/terser-js/terser#conditional-compilation
     */
    exports.GLOBAL_DEFS_FOR_TERSER = {
        ngDevMode: false,
        ngI18nClosureMode: false,
    };
    exports.GLOBAL_DEFS_FOR_TERSER_WITH_AOT = (0, tslib_1.__assign)((0, tslib_1.__assign)({}, exports.GLOBAL_DEFS_FOR_TERSER), { ngJitMode: false });
    /**
     * Transform for downleveling Angular decorators and Angular-decorated class constructor
     * parameters for dependency injection. This transform can be used by the CLI for JIT-mode
     * compilation where constructor parameters and associated Angular decorators should be
     * downleveled so that apps are not exposed to the ES2015 temporal dead zone limitation
     * in TypeScript. See https://github.com/angular/angular-cli/pull/14473 for more details.
     */
    function constructorParametersDownlevelTransform(program) {
        var typeChecker = program.getTypeChecker();
        var reflectionHost = new reflection_1.TypeScriptReflectionHost(typeChecker);
        return (0, downlevel_decorators_transform_1.getDownlevelDecoratorsTransform)(typeChecker, reflectionHost, [], /* isCore */ false, 
        /* enableClosureCompiler */ false, /* skipClassDecorators */ true);
    }
    exports.constructorParametersDownlevelTransform = constructorParametersDownlevelTransform;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdG9vbGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBV0gseUVBQTREO0lBQzVELHdIQUE4RjtJQUU5Rjs7O09BR0c7SUFDVSxRQUFBLHNCQUFzQixHQUFHO1FBQ3BDLFNBQVMsRUFBRSxLQUFLO1FBQ2hCLGlCQUFpQixFQUFFLEtBQUs7S0FDekIsQ0FBQztJQUVXLFFBQUEsK0JBQStCLG1EQUN2Qyw4QkFBc0IsS0FDekIsU0FBUyxFQUFFLEtBQUssSUFDaEI7SUFFRjs7Ozs7O09BTUc7SUFDSCxTQUFnQix1Q0FBdUMsQ0FBQyxPQUFtQjtRQUV6RSxJQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDN0MsSUFBTSxjQUFjLEdBQUcsSUFBSSxxQ0FBd0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNqRSxPQUFPLElBQUEsZ0VBQStCLEVBQ2xDLFdBQVcsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxLQUFLO1FBQ25ELDJCQUEyQixDQUFDLEtBQUssRUFBRSx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN6RSxDQUFDO0lBUEQsMEZBT0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLyoqXG4gKiBAZmlsZW92ZXJ2aWV3XG4gKiBUaGlzIGZpbGUgaXMgdXNlZCBhcyBhIHByaXZhdGUgQVBJIGNoYW5uZWwgdG8gc2hhcmVkIEFuZ3VsYXIgRlcgQVBJcyB3aXRoIEBhbmd1bGFyL2NsaS5cbiAqXG4gKiBBbnkgY2hhbmdlcyB0byB0aGlzIGZpbGUgc2hvdWxkIGJlIGRpc2N1c3NlZCB3aXRoIHRoZSBBbmd1bGFyIENMSSB0ZWFtLlxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1R5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7Z2V0RG93bmxldmVsRGVjb3JhdG9yc1RyYW5zZm9ybX0gZnJvbSAnLi90cmFuc2Zvcm1lcnMvZG93bmxldmVsX2RlY29yYXRvcnNfdHJhbnNmb3JtJztcblxuLyoqXG4gKiBLbm93biB2YWx1ZXMgZm9yIGdsb2JhbCB2YXJpYWJsZXMgaW4gYEBhbmd1bGFyL2NvcmVgIHRoYXQgVGVyc2VyIHNob3VsZCBzZXQgdXNpbmdcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS90ZXJzZXItanMvdGVyc2VyI2NvbmRpdGlvbmFsLWNvbXBpbGF0aW9uXG4gKi9cbmV4cG9ydCBjb25zdCBHTE9CQUxfREVGU19GT1JfVEVSU0VSID0ge1xuICBuZ0Rldk1vZGU6IGZhbHNlLFxuICBuZ0kxOG5DbG9zdXJlTW9kZTogZmFsc2UsXG59O1xuXG5leHBvcnQgY29uc3QgR0xPQkFMX0RFRlNfRk9SX1RFUlNFUl9XSVRIX0FPVCA9IHtcbiAgLi4uR0xPQkFMX0RFRlNfRk9SX1RFUlNFUixcbiAgbmdKaXRNb2RlOiBmYWxzZSxcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGZvciBkb3dubGV2ZWxpbmcgQW5ndWxhciBkZWNvcmF0b3JzIGFuZCBBbmd1bGFyLWRlY29yYXRlZCBjbGFzcyBjb25zdHJ1Y3RvclxuICogcGFyYW1ldGVycyBmb3IgZGVwZW5kZW5jeSBpbmplY3Rpb24uIFRoaXMgdHJhbnNmb3JtIGNhbiBiZSB1c2VkIGJ5IHRoZSBDTEkgZm9yIEpJVC1tb2RlXG4gKiBjb21waWxhdGlvbiB3aGVyZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIGFuZCBhc3NvY2lhdGVkIEFuZ3VsYXIgZGVjb3JhdG9ycyBzaG91bGQgYmVcbiAqIGRvd25sZXZlbGVkIHNvIHRoYXQgYXBwcyBhcmUgbm90IGV4cG9zZWQgdG8gdGhlIEVTMjAxNSB0ZW1wb3JhbCBkZWFkIHpvbmUgbGltaXRhdGlvblxuICogaW4gVHlwZVNjcmlwdC4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXItY2xpL3B1bGwvMTQ0NzMgZm9yIG1vcmUgZGV0YWlscy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnN0cnVjdG9yUGFyYW1ldGVyc0Rvd25sZXZlbFRyYW5zZm9ybShwcm9ncmFtOiB0cy5Qcm9ncmFtKTpcbiAgICB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4ge1xuICBjb25zdCB0eXBlQ2hlY2tlciA9IHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgY29uc3QgcmVmbGVjdGlvbkhvc3QgPSBuZXcgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0KHR5cGVDaGVja2VyKTtcbiAgcmV0dXJuIGdldERvd25sZXZlbERlY29yYXRvcnNUcmFuc2Zvcm0oXG4gICAgICB0eXBlQ2hlY2tlciwgcmVmbGVjdGlvbkhvc3QsIFtdLCAvKiBpc0NvcmUgKi8gZmFsc2UsXG4gICAgICAvKiBlbmFibGVDbG9zdXJlQ29tcGlsZXIgKi8gZmFsc2UsIC8qIHNraXBDbGFzc0RlY29yYXRvcnMgKi8gdHJ1ZSk7XG59XG4iXX0=