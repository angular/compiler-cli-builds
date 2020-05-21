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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/known_declaration", ["require", "exports", "@angular/compiler-cli/src/ngtsc/reflection/src/host", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/ts_helpers"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.resolveKnownDeclaration = exports.jsGlobalObjectValue = void 0;
    var host_1 = require("@angular/compiler-cli/src/ngtsc/reflection/src/host");
    var builtin_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin");
    var ts_helpers_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/ts_helpers");
    /** Resolved value for the JavaScript global `Object` declaration. */
    exports.jsGlobalObjectValue = new Map([['assign', new builtin_1.ObjectAssignBuiltinFn()]]);
    /** Resolved value for the `__assign()` TypeScript helper declaration. */
    var assignTsHelperFn = new ts_helpers_1.AssignHelperFn();
    /** Resolved value for the `__spread()` and `__spreadArrays()` TypeScript helper declarations. */
    var spreadTsHelperFn = new ts_helpers_1.SpreadHelperFn();
    /**
     * Resolves the specified known declaration to a resolved value. For example,
     * the known JavaScript global `Object` will resolve to a `Map` that provides the
     * `assign` method with a built-in function. This enables evaluation of `Object.assign`.
     */
    function resolveKnownDeclaration(decl) {
        switch (decl) {
            case host_1.KnownDeclaration.JsGlobalObject:
                return exports.jsGlobalObjectValue;
            case host_1.KnownDeclaration.TsHelperAssign:
                return assignTsHelperFn;
            case host_1.KnownDeclaration.TsHelperSpread:
            case host_1.KnownDeclaration.TsHelperSpreadArrays:
                return spreadTsHelperFn;
            default:
                throw new Error("Cannot resolve known declaration. Received: " + host_1.KnownDeclaration[decl] + ".");
        }
    }
    exports.resolveKnownDeclaration = resolveKnownDeclaration;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia25vd25fZGVjbGFyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yL3NyYy9rbm93bl9kZWNsYXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw0RUFBMkQ7SUFFM0QseUZBQWdEO0lBRWhELCtGQUE0RDtJQUU1RCxxRUFBcUU7SUFDeEQsUUFBQSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLElBQUksK0JBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV0Rix5RUFBeUU7SUFDekUsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLDJCQUFjLEVBQUUsQ0FBQztJQUU5QyxpR0FBaUc7SUFDakcsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLDJCQUFjLEVBQUUsQ0FBQztJQUU5Qzs7OztPQUlHO0lBQ0gsU0FBZ0IsdUJBQXVCLENBQUMsSUFBc0I7UUFDNUQsUUFBUSxJQUFJLEVBQUU7WUFDWixLQUFLLHVCQUFnQixDQUFDLGNBQWM7Z0JBQ2xDLE9BQU8sMkJBQW1CLENBQUM7WUFDN0IsS0FBSyx1QkFBZ0IsQ0FBQyxjQUFjO2dCQUNsQyxPQUFPLGdCQUFnQixDQUFDO1lBQzFCLEtBQUssdUJBQWdCLENBQUMsY0FBYyxDQUFDO1lBQ3JDLEtBQUssdUJBQWdCLENBQUMsb0JBQW9CO2dCQUN4QyxPQUFPLGdCQUFnQixDQUFDO1lBQzFCO2dCQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQStDLHVCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFHLENBQUMsQ0FBQztTQUM3RjtJQUNILENBQUM7SUFaRCwwREFZQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtLbm93bkRlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uL3NyYy9ob3N0JztcblxuaW1wb3J0IHtPYmplY3RBc3NpZ25CdWlsdGluRm59IGZyb20gJy4vYnVpbHRpbic7XG5pbXBvcnQge1Jlc29sdmVkVmFsdWV9IGZyb20gJy4vcmVzdWx0JztcbmltcG9ydCB7QXNzaWduSGVscGVyRm4sIFNwcmVhZEhlbHBlckZufSBmcm9tICcuL3RzX2hlbHBlcnMnO1xuXG4vKiogUmVzb2x2ZWQgdmFsdWUgZm9yIHRoZSBKYXZhU2NyaXB0IGdsb2JhbCBgT2JqZWN0YCBkZWNsYXJhdGlvbi4gKi9cbmV4cG9ydCBjb25zdCBqc0dsb2JhbE9iamVjdFZhbHVlID0gbmV3IE1hcChbWydhc3NpZ24nLCBuZXcgT2JqZWN0QXNzaWduQnVpbHRpbkZuKCldXSk7XG5cbi8qKiBSZXNvbHZlZCB2YWx1ZSBmb3IgdGhlIGBfX2Fzc2lnbigpYCBUeXBlU2NyaXB0IGhlbHBlciBkZWNsYXJhdGlvbi4gKi9cbmNvbnN0IGFzc2lnblRzSGVscGVyRm4gPSBuZXcgQXNzaWduSGVscGVyRm4oKTtcblxuLyoqIFJlc29sdmVkIHZhbHVlIGZvciB0aGUgYF9fc3ByZWFkKClgIGFuZCBgX19zcHJlYWRBcnJheXMoKWAgVHlwZVNjcmlwdCBoZWxwZXIgZGVjbGFyYXRpb25zLiAqL1xuY29uc3Qgc3ByZWFkVHNIZWxwZXJGbiA9IG5ldyBTcHJlYWRIZWxwZXJGbigpO1xuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBzcGVjaWZpZWQga25vd24gZGVjbGFyYXRpb24gdG8gYSByZXNvbHZlZCB2YWx1ZS4gRm9yIGV4YW1wbGUsXG4gKiB0aGUga25vd24gSmF2YVNjcmlwdCBnbG9iYWwgYE9iamVjdGAgd2lsbCByZXNvbHZlIHRvIGEgYE1hcGAgdGhhdCBwcm92aWRlcyB0aGVcbiAqIGBhc3NpZ25gIG1ldGhvZCB3aXRoIGEgYnVpbHQtaW4gZnVuY3Rpb24uIFRoaXMgZW5hYmxlcyBldmFsdWF0aW9uIG9mIGBPYmplY3QuYXNzaWduYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVLbm93bkRlY2xhcmF0aW9uKGRlY2w6IEtub3duRGVjbGFyYXRpb24pOiBSZXNvbHZlZFZhbHVlIHtcbiAgc3dpdGNoIChkZWNsKSB7XG4gICAgY2FzZSBLbm93bkRlY2xhcmF0aW9uLkpzR2xvYmFsT2JqZWN0OlxuICAgICAgcmV0dXJuIGpzR2xvYmFsT2JqZWN0VmFsdWU7XG4gICAgY2FzZSBLbm93bkRlY2xhcmF0aW9uLlRzSGVscGVyQXNzaWduOlxuICAgICAgcmV0dXJuIGFzc2lnblRzSGVscGVyRm47XG4gICAgY2FzZSBLbm93bkRlY2xhcmF0aW9uLlRzSGVscGVyU3ByZWFkOlxuICAgIGNhc2UgS25vd25EZWNsYXJhdGlvbi5Uc0hlbHBlclNwcmVhZEFycmF5czpcbiAgICAgIHJldHVybiBzcHJlYWRUc0hlbHBlckZuO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXNvbHZlIGtub3duIGRlY2xhcmF0aW9uLiBSZWNlaXZlZDogJHtLbm93bkRlY2xhcmF0aW9uW2RlY2xdfS5gKTtcbiAgfVxufVxuIl19