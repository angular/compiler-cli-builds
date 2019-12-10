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
        ErrorCode[ErrorCode["SYMBOL_NOT_EXPORTED"] = 3001] = "SYMBOL_NOT_EXPORTED";
        ErrorCode[ErrorCode["SYMBOL_EXPORTED_UNDER_DIFFERENT_NAME"] = 3002] = "SYMBOL_EXPORTED_UNDER_DIFFERENT_NAME";
        ErrorCode[ErrorCode["CONFIG_FLAT_MODULE_NO_INDEX"] = 4001] = "CONFIG_FLAT_MODULE_NO_INDEX";
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
         * An injectable already has a `ɵprov` property.
         */
        ErrorCode[ErrorCode["INJECTABLE_DUPLICATE_PROV"] = 9001] = "INJECTABLE_DUPLICATE_PROV";
    })(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
    function ngErrorCode(code) {
        return parseInt('-99' + code);
    }
    exports.ngErrorCode = ngErrorCode;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZGlhZ25vc3RpY3Mvc3JjL2NvZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCxJQUFZLFNBNkZYO0lBN0ZELFdBQVksU0FBUztRQUNuQixzRkFBZ0MsQ0FBQTtRQUNoQyw4RUFBNEIsQ0FBQTtRQUM1Qiw0RUFBMkIsQ0FBQTtRQUMzQiw0RkFBbUMsQ0FBQTtRQUNuQyw0RUFBMkIsQ0FBQTtRQUUzQjs7V0FFRztRQUNILDBFQUEwQixDQUFBO1FBRTFCLDRFQUEyQixDQUFBO1FBQzNCLHNFQUF3QixDQUFBO1FBRXhCLHdGQUFpQyxDQUFBO1FBQ2pDLHNFQUF3QixDQUFBO1FBQ3hCLDBFQUEwQixDQUFBO1FBQzFCLHdGQUFpQyxDQUFBO1FBRWpDLDBFQUEwQixDQUFBO1FBQzFCLDRHQUEyQyxDQUFBO1FBRTNDLDBGQUFrQyxDQUFBO1FBRWxDOzs7V0FHRztRQUNILG9GQUErQixDQUFBO1FBRS9COztXQUVHO1FBQ0gsNEZBQW1DLENBQUE7UUFFbkM7O1dBRUc7UUFDSCxrRkFBOEIsQ0FBQTtRQUU5Qjs7V0FFRztRQUNILGtGQUE4QixDQUFBO1FBRTlCOzs7V0FHRztRQUNILHNGQUFnQyxDQUFBO1FBRWhDOzs7V0FHRztRQUNILGdJQUFxRCxDQUFBO1FBRXJEOzs7V0FHRztRQUNILG9HQUF1QyxDQUFBO1FBRXZDOztXQUVHO1FBQ0gsb0hBQStDLENBQUE7UUFFL0M7O1dBRUc7UUFDSCxnRkFBNkIsQ0FBQTtRQUU3Qjs7V0FFRztRQUNILG9GQUErQixDQUFBO1FBRS9COztXQUVHO1FBQ0gsb0ZBQStCLENBQUE7UUFFL0I7O1dBRUc7UUFDSCw0REFBbUIsQ0FBQTtRQUVuQjs7V0FFRztRQUNILHNGQUFnQyxDQUFBO0lBQ2xDLENBQUMsRUE3RlcsU0FBUyxHQUFULGlCQUFTLEtBQVQsaUJBQVMsUUE2RnBCO0lBRUQsU0FBZ0IsV0FBVyxDQUFDLElBQWU7UUFDekMsT0FBTyxRQUFRLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFGRCxrQ0FFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0IGVudW0gRXJyb3JDb2RlIHtcbiAgREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCA9IDEwMDEsXG4gIERFQ09SQVRPUl9BUklUWV9XUk9ORyA9IDEwMDIsXG4gIERFQ09SQVRPUl9OT1RfQ0FMTEVEID0gMTAwMyxcbiAgREVDT1JBVE9SX09OX0FOT05ZTU9VU19DTEFTUyA9IDEwMDQsXG4gIERFQ09SQVRPUl9VTkVYUEVDVEVEID0gMTAwNSxcblxuICAvKipcbiAgICogVGhpcyBlcnJvciBjb2RlIGluZGljYXRlcyB0aGF0IHRoZXJlIGFyZSBpbmNvbXBhdGlibGUgZGVjb3JhdG9ycyBvbiBhIHR5cGUgb3IgYSBjbGFzcyBmaWVsZC5cbiAgICovXG4gIERFQ09SQVRPUl9DT0xMSVNJT04gPSAxMDA2LFxuXG4gIFZBTFVFX0hBU19XUk9OR19UWVBFID0gMTAxMCxcbiAgVkFMVUVfTk9UX0xJVEVSQUwgPSAxMDExLFxuXG4gIENPTVBPTkVOVF9NSVNTSU5HX1RFTVBMQVRFID0gMjAwMSxcbiAgUElQRV9NSVNTSU5HX05BTUUgPSAyMDAyLFxuICBQQVJBTV9NSVNTSU5HX1RPS0VOID0gMjAwMyxcbiAgRElSRUNUSVZFX01JU1NJTkdfU0VMRUNUT1IgPSAyMDA0LFxuXG4gIFNZTUJPTF9OT1RfRVhQT1JURUQgPSAzMDAxLFxuICBTWU1CT0xfRVhQT1JURURfVU5ERVJfRElGRkVSRU5UX05BTUUgPSAzMDAyLFxuXG4gIENPTkZJR19GTEFUX01PRFVMRV9OT19JTkRFWCA9IDQwMDEsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGEgaG9zdCBleHByZXNzaW9uIGhhcyBhIHBhcnNlIGVycm9yLCBzdWNoIGFzIGEgaG9zdCBsaXN0ZW5lciBvciBob3N0IGJpbmRpbmdcbiAgICogZXhwcmVzc2lvbiBjb250YWluaW5nIGEgcGlwZS5cbiAgICovXG4gIEhPU1RfQklORElOR19QQVJTRV9FUlJPUiA9IDUwMDEsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGNvbnRhaW5zIGFuIGludmFsaWQgcmVmZXJlbmNlIGluIGBkZWNsYXJhdGlvbnNgLlxuICAgKi9cbiAgTkdNT0RVTEVfSU5WQUxJRF9ERUNMQVJBVElPTiA9IDYwMDEsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGNvbnRhaW5zIGFuIGludmFsaWQgdHlwZSBpbiBgaW1wb3J0c2AuXG4gICAqL1xuICBOR01PRFVMRV9JTlZBTElEX0lNUE9SVCA9IDYwMDIsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGNvbnRhaW5zIGFuIGludmFsaWQgdHlwZSBpbiBgZXhwb3J0c2AuXG4gICAqL1xuICBOR01PRFVMRV9JTlZBTElEX0VYUE9SVCA9IDYwMDMsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGNvbnRhaW5zIGEgdHlwZSBpbiBgZXhwb3J0c2Agd2hpY2ggaXMgbmVpdGhlciBpbiBgZGVjbGFyYXRpb25zYCBub3JcbiAgICogb3RoZXJ3aXNlIGltcG9ydGVkLlxuICAgKi9cbiAgTkdNT0RVTEVfSU5WQUxJRF9SRUVYUE9SVCA9IDYwMDQsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGEgYE1vZHVsZVdpdGhQcm92aWRlcnNgIHdpdGggYSBtaXNzaW5nXG4gICAqIGdlbmVyaWMgdHlwZSBhcmd1bWVudCBpcyBwYXNzZWQgaW50byBhbiBgTmdNb2R1bGVgLlxuICAgKi9cbiAgTkdNT0RVTEVfTU9EVUxFX1dJVEhfUFJPVklERVJTX01JU1NJTkdfR0VORVJJQyA9IDYwMDUsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGV4cG9ydHMgbXVsdGlwbGUgZGlyZWN0aXZlcy9waXBlcyBvZiB0aGUgc2FtZSBuYW1lIGFuZCB0aGUgY29tcGlsZXJcbiAgICogYXR0ZW1wdHMgdG8gZ2VuZXJhdGUgcHJpdmF0ZSByZS1leHBvcnRzIHdpdGhpbiB0aGUgTmdNb2R1bGUgZmlsZS5cbiAgICovXG4gIE5HTU9EVUxFX1JFRVhQT1JUX05BTUVfQ09MTElTSU9OID0gNjAwNixcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gbmdjYyB0cmllcyB0byBpbmplY3QgYSBzeW50aGV0aWMgZGVjb3JhdG9yIG92ZXIgb25lIHRoYXQgYWxyZWFkeSBleGlzdHMuXG4gICAqL1xuICBOR0NDX01JR1JBVElPTl9ERUNPUkFUT1JfSU5KRUNUSU9OX0VSUk9SID0gNzAwMSxcblxuICAvKipcbiAgICogQW4gZWxlbWVudCBuYW1lIGZhaWxlZCB2YWxpZGF0aW9uIGFnYWluc3QgdGhlIERPTSBzY2hlbWEuXG4gICAqL1xuICBTQ0hFTUFfSU5WQUxJRF9FTEVNRU5UID0gODAwMSxcblxuICAvKipcbiAgICogQW4gZWxlbWVudCdzIGF0dHJpYnV0ZSBuYW1lIGZhaWxlZCB2YWxpZGF0aW9uIGFnYWluc3QgdGhlIERPTSBzY2hlbWEuXG4gICAqL1xuICBTQ0hFTUFfSU5WQUxJRF9BVFRSSUJVVEUgPSA4MDAyLFxuXG4gIC8qKlxuICAgKiBObyBtYXRjaGluZyBkaXJlY3RpdmUgd2FzIGZvdW5kIGZvciBhIGAjcmVmPVwidGFyZ2V0XCJgIGV4cHJlc3Npb24uXG4gICAqL1xuICBNSVNTSU5HX1JFRkVSRU5DRV9UQVJHRVQgPSA4MDAzLFxuXG4gIC8qKlxuICAgKiBObyBtYXRjaGluZyBwaXBlIHdhcyBmb3VuZCBmb3IgYVxuICAgKi9cbiAgTUlTU0lOR19QSVBFID0gODAwNCxcblxuICAvKipcbiAgICogQW4gaW5qZWN0YWJsZSBhbHJlYWR5IGhhcyBhIGDJtXByb3ZgIHByb3BlcnR5LlxuICAgKi9cbiAgSU5KRUNUQUJMRV9EVVBMSUNBVEVfUFJPViA9IDkwMDFcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5nRXJyb3JDb2RlKGNvZGU6IEVycm9yQ29kZSk6IG51bWJlciB7XG4gIHJldHVybiBwYXJzZUludCgnLTk5JyArIGNvZGUpO1xufVxuIl19