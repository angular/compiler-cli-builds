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
        define("@angular/compiler-cli/src/ngtsc/diagnostics/src/code", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ErrorCode;
    (function (ErrorCode) {
        ErrorCode[ErrorCode["DECORATOR_ARG_NOT_LITERAL"] = 1001] = "DECORATOR_ARG_NOT_LITERAL";
        ErrorCode[ErrorCode["DECORATOR_ARITY_WRONG"] = 1002] = "DECORATOR_ARITY_WRONG";
        ErrorCode[ErrorCode["DECORATOR_NOT_CALLED"] = 1003] = "DECORATOR_NOT_CALLED";
        ErrorCode[ErrorCode["DECORATOR_ON_ANONYMOUS_CLASS"] = 1004] = "DECORATOR_ON_ANONYMOUS_CLASS";
        ErrorCode[ErrorCode["DECORATOR_UNEXPECTED"] = 1005] = "DECORATOR_UNEXPECTED";
        /**
         * This error code indicates that there are incompatible decorators on a type or a class field.
         */
        ErrorCode[ErrorCode["DECORATOR_COLLISION"] = 1006] = "DECORATOR_COLLISION";
        ErrorCode[ErrorCode["VALUE_HAS_WRONG_TYPE"] = 1010] = "VALUE_HAS_WRONG_TYPE";
        ErrorCode[ErrorCode["VALUE_NOT_LITERAL"] = 1011] = "VALUE_NOT_LITERAL";
        ErrorCode[ErrorCode["COMPONENT_MISSING_TEMPLATE"] = 2001] = "COMPONENT_MISSING_TEMPLATE";
        ErrorCode[ErrorCode["PIPE_MISSING_NAME"] = 2002] = "PIPE_MISSING_NAME";
        ErrorCode[ErrorCode["PARAM_MISSING_TOKEN"] = 2003] = "PARAM_MISSING_TOKEN";
        ErrorCode[ErrorCode["DIRECTIVE_MISSING_SELECTOR"] = 2004] = "DIRECTIVE_MISSING_SELECTOR";
        /** Raised when an undecorated class is passed in as a provider to a module or a directive. */
        ErrorCode[ErrorCode["UNDECORATED_PROVIDER"] = 2005] = "UNDECORATED_PROVIDER";
        /**
         * Raised when a Directive inherits its constructor from a base class without an Angular
         * decorator.
         */
        ErrorCode[ErrorCode["DIRECTIVE_INHERITS_UNDECORATED_CTOR"] = 2006] = "DIRECTIVE_INHERITS_UNDECORATED_CTOR";
        ErrorCode[ErrorCode["SYMBOL_NOT_EXPORTED"] = 3001] = "SYMBOL_NOT_EXPORTED";
        ErrorCode[ErrorCode["SYMBOL_EXPORTED_UNDER_DIFFERENT_NAME"] = 3002] = "SYMBOL_EXPORTED_UNDER_DIFFERENT_NAME";
        ErrorCode[ErrorCode["CONFIG_FLAT_MODULE_NO_INDEX"] = 4001] = "CONFIG_FLAT_MODULE_NO_INDEX";
        ErrorCode[ErrorCode["CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK"] = 4002] = "CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK";
        /**
         * Raised when a host expression has a parse error, such as a host listener or host binding
         * expression containing a pipe.
         */
        ErrorCode[ErrorCode["HOST_BINDING_PARSE_ERROR"] = 5001] = "HOST_BINDING_PARSE_ERROR";
        /**
         * Raised when an NgModule contains an invalid reference in `declarations`.
         */
        ErrorCode[ErrorCode["NGMODULE_INVALID_DECLARATION"] = 6001] = "NGMODULE_INVALID_DECLARATION";
        /**
         * Raised when an NgModule contains an invalid type in `imports`.
         */
        ErrorCode[ErrorCode["NGMODULE_INVALID_IMPORT"] = 6002] = "NGMODULE_INVALID_IMPORT";
        /**
         * Raised when an NgModule contains an invalid type in `exports`.
         */
        ErrorCode[ErrorCode["NGMODULE_INVALID_EXPORT"] = 6003] = "NGMODULE_INVALID_EXPORT";
        /**
         * Raised when an NgModule contains a type in `exports` which is neither in `declarations` nor
         * otherwise imported.
         */
        ErrorCode[ErrorCode["NGMODULE_INVALID_REEXPORT"] = 6004] = "NGMODULE_INVALID_REEXPORT";
        /**
         * Raised when a `ModuleWithProviders` with a missing
         * generic type argument is passed into an `NgModule`.
         */
        ErrorCode[ErrorCode["NGMODULE_MODULE_WITH_PROVIDERS_MISSING_GENERIC"] = 6005] = "NGMODULE_MODULE_WITH_PROVIDERS_MISSING_GENERIC";
        /**
         * Raised when an NgModule exports multiple directives/pipes of the same name and the compiler
         * attempts to generate private re-exports within the NgModule file.
         */
        ErrorCode[ErrorCode["NGMODULE_REEXPORT_NAME_COLLISION"] = 6006] = "NGMODULE_REEXPORT_NAME_COLLISION";
        /**
         * Raised when a directive/pipe is part of the declarations of two or more NgModules.
         */
        ErrorCode[ErrorCode["NGMODULE_DECLARATION_NOT_UNIQUE"] = 6007] = "NGMODULE_DECLARATION_NOT_UNIQUE";
        /**
         * Raised when ngcc tries to inject a synthetic decorator over one that already exists.
         */
        ErrorCode[ErrorCode["NGCC_MIGRATION_DECORATOR_INJECTION_ERROR"] = 7001] = "NGCC_MIGRATION_DECORATOR_INJECTION_ERROR";
        /**
         * An element name failed validation against the DOM schema.
         */
        ErrorCode[ErrorCode["SCHEMA_INVALID_ELEMENT"] = 8001] = "SCHEMA_INVALID_ELEMENT";
        /**
         * An element's attribute name failed validation against the DOM schema.
         */
        ErrorCode[ErrorCode["SCHEMA_INVALID_ATTRIBUTE"] = 8002] = "SCHEMA_INVALID_ATTRIBUTE";
        /**
         * No matching directive was found for a `#ref="target"` expression.
         */
        ErrorCode[ErrorCode["MISSING_REFERENCE_TARGET"] = 8003] = "MISSING_REFERENCE_TARGET";
        /**
         * No matching pipe was found for a
         */
        ErrorCode[ErrorCode["MISSING_PIPE"] = 8004] = "MISSING_PIPE";
        /**
         * The left-hand side of an assignment expression was a template variable. Effectively, the
         * template looked like:
         *
         * ```
         * <ng-template let-something>
         *   <button (click)="something = ...">...</button>
         * </ng-template>
         * ```
         *
         * Template variables are read-only.
         */
        ErrorCode[ErrorCode["WRITE_TO_READ_ONLY_VARIABLE"] = 8005] = "WRITE_TO_READ_ONLY_VARIABLE";
        /**
         * An injectable already has a `ɵprov` property.
         */
        ErrorCode[ErrorCode["INJECTABLE_DUPLICATE_PROV"] = 9001] = "INJECTABLE_DUPLICATE_PROV";
    })(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
    function ngErrorCode(code) {
        return parseInt('-99' + code);
    }
    exports.ngErrorCode = ngErrorCode;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZGlhZ25vc3RpY3Mvc3JjL2NvZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCxJQUFZLFNBMEhYO0lBMUhELFdBQVksU0FBUztRQUNuQixzRkFBZ0MsQ0FBQTtRQUNoQyw4RUFBNEIsQ0FBQTtRQUM1Qiw0RUFBMkIsQ0FBQTtRQUMzQiw0RkFBbUMsQ0FBQTtRQUNuQyw0RUFBMkIsQ0FBQTtRQUUzQjs7V0FFRztRQUNILDBFQUEwQixDQUFBO1FBRTFCLDRFQUEyQixDQUFBO1FBQzNCLHNFQUF3QixDQUFBO1FBRXhCLHdGQUFpQyxDQUFBO1FBQ2pDLHNFQUF3QixDQUFBO1FBQ3hCLDBFQUEwQixDQUFBO1FBQzFCLHdGQUFpQyxDQUFBO1FBRWpDLDhGQUE4RjtRQUM5Riw0RUFBMkIsQ0FBQTtRQUUzQjs7O1dBR0c7UUFDSCwwR0FBMEMsQ0FBQTtRQUUxQywwRUFBMEIsQ0FBQTtRQUMxQiw0R0FBMkMsQ0FBQTtRQUUzQywwRkFBa0MsQ0FBQTtRQUNsQyxrSkFBOEQsQ0FBQTtRQUU5RDs7O1dBR0c7UUFDSCxvRkFBK0IsQ0FBQTtRQUUvQjs7V0FFRztRQUNILDRGQUFtQyxDQUFBO1FBRW5DOztXQUVHO1FBQ0gsa0ZBQThCLENBQUE7UUFFOUI7O1dBRUc7UUFDSCxrRkFBOEIsQ0FBQTtRQUU5Qjs7O1dBR0c7UUFDSCxzRkFBZ0MsQ0FBQTtRQUVoQzs7O1dBR0c7UUFDSCxnSUFBcUQsQ0FBQTtRQUVyRDs7O1dBR0c7UUFDSCxvR0FBdUMsQ0FBQTtRQUV2Qzs7V0FFRztRQUNILGtHQUFzQyxDQUFBO1FBRXRDOztXQUVHO1FBQ0gsb0hBQStDLENBQUE7UUFFL0M7O1dBRUc7UUFDSCxnRkFBNkIsQ0FBQTtRQUU3Qjs7V0FFRztRQUNILG9GQUErQixDQUFBO1FBRS9COztXQUVHO1FBQ0gsb0ZBQStCLENBQUE7UUFFL0I7O1dBRUc7UUFDSCw0REFBbUIsQ0FBQTtRQUVuQjs7Ozs7Ozs7Ozs7V0FXRztRQUNILDBGQUFrQyxDQUFBO1FBRWxDOztXQUVHO1FBQ0gsc0ZBQWdDLENBQUE7SUFDbEMsQ0FBQyxFQTFIVyxTQUFTLEdBQVQsaUJBQVMsS0FBVCxpQkFBUyxRQTBIcEI7SUFFRCxTQUFnQixXQUFXLENBQUMsSUFBZTtRQUN6QyxPQUFPLFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUZELGtDQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQgZW51bSBFcnJvckNvZGUge1xuICBERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMID0gMTAwMSxcbiAgREVDT1JBVE9SX0FSSVRZX1dST05HID0gMTAwMixcbiAgREVDT1JBVE9SX05PVF9DQUxMRUQgPSAxMDAzLFxuICBERUNPUkFUT1JfT05fQU5PTllNT1VTX0NMQVNTID0gMTAwNCxcbiAgREVDT1JBVE9SX1VORVhQRUNURUQgPSAxMDA1LFxuXG4gIC8qKlxuICAgKiBUaGlzIGVycm9yIGNvZGUgaW5kaWNhdGVzIHRoYXQgdGhlcmUgYXJlIGluY29tcGF0aWJsZSBkZWNvcmF0b3JzIG9uIGEgdHlwZSBvciBhIGNsYXNzIGZpZWxkLlxuICAgKi9cbiAgREVDT1JBVE9SX0NPTExJU0lPTiA9IDEwMDYsXG5cbiAgVkFMVUVfSEFTX1dST05HX1RZUEUgPSAxMDEwLFxuICBWQUxVRV9OT1RfTElURVJBTCA9IDEwMTEsXG5cbiAgQ09NUE9ORU5UX01JU1NJTkdfVEVNUExBVEUgPSAyMDAxLFxuICBQSVBFX01JU1NJTkdfTkFNRSA9IDIwMDIsXG4gIFBBUkFNX01JU1NJTkdfVE9LRU4gPSAyMDAzLFxuICBESVJFQ1RJVkVfTUlTU0lOR19TRUxFQ1RPUiA9IDIwMDQsXG5cbiAgLyoqIFJhaXNlZCB3aGVuIGFuIHVuZGVjb3JhdGVkIGNsYXNzIGlzIHBhc3NlZCBpbiBhcyBhIHByb3ZpZGVyIHRvIGEgbW9kdWxlIG9yIGEgZGlyZWN0aXZlLiAqL1xuICBVTkRFQ09SQVRFRF9QUk9WSURFUiA9IDIwMDUsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGEgRGlyZWN0aXZlIGluaGVyaXRzIGl0cyBjb25zdHJ1Y3RvciBmcm9tIGEgYmFzZSBjbGFzcyB3aXRob3V0IGFuIEFuZ3VsYXJcbiAgICogZGVjb3JhdG9yLlxuICAgKi9cbiAgRElSRUNUSVZFX0lOSEVSSVRTX1VOREVDT1JBVEVEX0NUT1IgPSAyMDA2LFxuXG4gIFNZTUJPTF9OT1RfRVhQT1JURUQgPSAzMDAxLFxuICBTWU1CT0xfRVhQT1JURURfVU5ERVJfRElGRkVSRU5UX05BTUUgPSAzMDAyLFxuXG4gIENPTkZJR19GTEFUX01PRFVMRV9OT19JTkRFWCA9IDQwMDEsXG4gIENPTkZJR19TVFJJQ1RfVEVNUExBVEVTX0lNUExJRVNfRlVMTF9URU1QTEFURV9UWVBFQ0hFQ0sgPSA0MDAyLFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhIGhvc3QgZXhwcmVzc2lvbiBoYXMgYSBwYXJzZSBlcnJvciwgc3VjaCBhcyBhIGhvc3QgbGlzdGVuZXIgb3IgaG9zdCBiaW5kaW5nXG4gICAqIGV4cHJlc3Npb24gY29udGFpbmluZyBhIHBpcGUuXG4gICAqL1xuICBIT1NUX0JJTkRJTkdfUEFSU0VfRVJST1IgPSA1MDAxLFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhbiBOZ01vZHVsZSBjb250YWlucyBhbiBpbnZhbGlkIHJlZmVyZW5jZSBpbiBgZGVjbGFyYXRpb25zYC5cbiAgICovXG4gIE5HTU9EVUxFX0lOVkFMSURfREVDTEFSQVRJT04gPSA2MDAxLFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhbiBOZ01vZHVsZSBjb250YWlucyBhbiBpbnZhbGlkIHR5cGUgaW4gYGltcG9ydHNgLlxuICAgKi9cbiAgTkdNT0RVTEVfSU5WQUxJRF9JTVBPUlQgPSA2MDAyLFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhbiBOZ01vZHVsZSBjb250YWlucyBhbiBpbnZhbGlkIHR5cGUgaW4gYGV4cG9ydHNgLlxuICAgKi9cbiAgTkdNT0RVTEVfSU5WQUxJRF9FWFBPUlQgPSA2MDAzLFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhbiBOZ01vZHVsZSBjb250YWlucyBhIHR5cGUgaW4gYGV4cG9ydHNgIHdoaWNoIGlzIG5laXRoZXIgaW4gYGRlY2xhcmF0aW9uc2Agbm9yXG4gICAqIG90aGVyd2lzZSBpbXBvcnRlZC5cbiAgICovXG4gIE5HTU9EVUxFX0lOVkFMSURfUkVFWFBPUlQgPSA2MDA0LFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCB3aXRoIGEgbWlzc2luZ1xuICAgKiBnZW5lcmljIHR5cGUgYXJndW1lbnQgaXMgcGFzc2VkIGludG8gYW4gYE5nTW9kdWxlYC5cbiAgICovXG4gIE5HTU9EVUxFX01PRFVMRV9XSVRIX1BST1ZJREVSU19NSVNTSU5HX0dFTkVSSUMgPSA2MDA1LFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhbiBOZ01vZHVsZSBleHBvcnRzIG11bHRpcGxlIGRpcmVjdGl2ZXMvcGlwZXMgb2YgdGhlIHNhbWUgbmFtZSBhbmQgdGhlIGNvbXBpbGVyXG4gICAqIGF0dGVtcHRzIHRvIGdlbmVyYXRlIHByaXZhdGUgcmUtZXhwb3J0cyB3aXRoaW4gdGhlIE5nTW9kdWxlIGZpbGUuXG4gICAqL1xuICBOR01PRFVMRV9SRUVYUE9SVF9OQU1FX0NPTExJU0lPTiA9IDYwMDYsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGEgZGlyZWN0aXZlL3BpcGUgaXMgcGFydCBvZiB0aGUgZGVjbGFyYXRpb25zIG9mIHR3byBvciBtb3JlIE5nTW9kdWxlcy5cbiAgICovXG4gIE5HTU9EVUxFX0RFQ0xBUkFUSU9OX05PVF9VTklRVUUgPSA2MDA3LFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBuZ2NjIHRyaWVzIHRvIGluamVjdCBhIHN5bnRoZXRpYyBkZWNvcmF0b3Igb3ZlciBvbmUgdGhhdCBhbHJlYWR5IGV4aXN0cy5cbiAgICovXG4gIE5HQ0NfTUlHUkFUSU9OX0RFQ09SQVRPUl9JTkpFQ1RJT05fRVJST1IgPSA3MDAxLFxuXG4gIC8qKlxuICAgKiBBbiBlbGVtZW50IG5hbWUgZmFpbGVkIHZhbGlkYXRpb24gYWdhaW5zdCB0aGUgRE9NIHNjaGVtYS5cbiAgICovXG4gIFNDSEVNQV9JTlZBTElEX0VMRU1FTlQgPSA4MDAxLFxuXG4gIC8qKlxuICAgKiBBbiBlbGVtZW50J3MgYXR0cmlidXRlIG5hbWUgZmFpbGVkIHZhbGlkYXRpb24gYWdhaW5zdCB0aGUgRE9NIHNjaGVtYS5cbiAgICovXG4gIFNDSEVNQV9JTlZBTElEX0FUVFJJQlVURSA9IDgwMDIsXG5cbiAgLyoqXG4gICAqIE5vIG1hdGNoaW5nIGRpcmVjdGl2ZSB3YXMgZm91bmQgZm9yIGEgYCNyZWY9XCJ0YXJnZXRcImAgZXhwcmVzc2lvbi5cbiAgICovXG4gIE1JU1NJTkdfUkVGRVJFTkNFX1RBUkdFVCA9IDgwMDMsXG5cbiAgLyoqXG4gICAqIE5vIG1hdGNoaW5nIHBpcGUgd2FzIGZvdW5kIGZvciBhXG4gICAqL1xuICBNSVNTSU5HX1BJUEUgPSA4MDA0LFxuXG4gIC8qKlxuICAgKiBUaGUgbGVmdC1oYW5kIHNpZGUgb2YgYW4gYXNzaWdubWVudCBleHByZXNzaW9uIHdhcyBhIHRlbXBsYXRlIHZhcmlhYmxlLiBFZmZlY3RpdmVseSwgdGhlXG4gICAqIHRlbXBsYXRlIGxvb2tlZCBsaWtlOlxuICAgKlxuICAgKiBgYGBcbiAgICogPG5nLXRlbXBsYXRlIGxldC1zb21ldGhpbmc+XG4gICAqICAgPGJ1dHRvbiAoY2xpY2spPVwic29tZXRoaW5nID0gLi4uXCI+Li4uPC9idXR0b24+XG4gICAqIDwvbmctdGVtcGxhdGU+XG4gICAqIGBgYFxuICAgKlxuICAgKiBUZW1wbGF0ZSB2YXJpYWJsZXMgYXJlIHJlYWQtb25seS5cbiAgICovXG4gIFdSSVRFX1RPX1JFQURfT05MWV9WQVJJQUJMRSA9IDgwMDUsXG5cbiAgLyoqXG4gICAqIEFuIGluamVjdGFibGUgYWxyZWFkeSBoYXMgYSBgybVwcm92YCBwcm9wZXJ0eS5cbiAgICovXG4gIElOSkVDVEFCTEVfRFVQTElDQVRFX1BST1YgPSA5MDAxLFxufVxuXG5leHBvcnQgZnVuY3Rpb24gbmdFcnJvckNvZGUoY29kZTogRXJyb3JDb2RlKTogbnVtYmVyIHtcbiAgcmV0dXJuIHBhcnNlSW50KCctOTknICsgY29kZSk7XG59XG4iXX0=