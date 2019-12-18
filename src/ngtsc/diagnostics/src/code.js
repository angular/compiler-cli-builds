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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZGlhZ25vc3RpY3Mvc3JjL2NvZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCxJQUFZLFNBeUhYO0lBekhELFdBQVksU0FBUztRQUNuQixzRkFBZ0MsQ0FBQTtRQUNoQyw4RUFBNEIsQ0FBQTtRQUM1Qiw0RUFBMkIsQ0FBQTtRQUMzQiw0RkFBbUMsQ0FBQTtRQUNuQyw0RUFBMkIsQ0FBQTtRQUUzQjs7V0FFRztRQUNILDBFQUEwQixDQUFBO1FBRTFCLDRFQUEyQixDQUFBO1FBQzNCLHNFQUF3QixDQUFBO1FBRXhCLHdGQUFpQyxDQUFBO1FBQ2pDLHNFQUF3QixDQUFBO1FBQ3hCLDBFQUEwQixDQUFBO1FBQzFCLHdGQUFpQyxDQUFBO1FBRWpDLDhGQUE4RjtRQUM5Riw0RUFBMkIsQ0FBQTtRQUUzQjs7O1dBR0c7UUFDSCwwR0FBMEMsQ0FBQTtRQUUxQywwRUFBMEIsQ0FBQTtRQUMxQiw0R0FBMkMsQ0FBQTtRQUUzQywwRkFBa0MsQ0FBQTtRQUVsQzs7O1dBR0c7UUFDSCxvRkFBK0IsQ0FBQTtRQUUvQjs7V0FFRztRQUNILDRGQUFtQyxDQUFBO1FBRW5DOztXQUVHO1FBQ0gsa0ZBQThCLENBQUE7UUFFOUI7O1dBRUc7UUFDSCxrRkFBOEIsQ0FBQTtRQUU5Qjs7O1dBR0c7UUFDSCxzRkFBZ0MsQ0FBQTtRQUVoQzs7O1dBR0c7UUFDSCxnSUFBcUQsQ0FBQTtRQUVyRDs7O1dBR0c7UUFDSCxvR0FBdUMsQ0FBQTtRQUV2Qzs7V0FFRztRQUNILGtHQUFzQyxDQUFBO1FBRXRDOztXQUVHO1FBQ0gsb0hBQStDLENBQUE7UUFFL0M7O1dBRUc7UUFDSCxnRkFBNkIsQ0FBQTtRQUU3Qjs7V0FFRztRQUNILG9GQUErQixDQUFBO1FBRS9COztXQUVHO1FBQ0gsb0ZBQStCLENBQUE7UUFFL0I7O1dBRUc7UUFDSCw0REFBbUIsQ0FBQTtRQUVuQjs7Ozs7Ozs7Ozs7V0FXRztRQUNILDBGQUFrQyxDQUFBO1FBRWxDOztXQUVHO1FBQ0gsc0ZBQWdDLENBQUE7SUFDbEMsQ0FBQyxFQXpIVyxTQUFTLEdBQVQsaUJBQVMsS0FBVCxpQkFBUyxRQXlIcEI7SUFFRCxTQUFnQixXQUFXLENBQUMsSUFBZTtRQUN6QyxPQUFPLFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUZELGtDQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQgZW51bSBFcnJvckNvZGUge1xuICBERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMID0gMTAwMSxcbiAgREVDT1JBVE9SX0FSSVRZX1dST05HID0gMTAwMixcbiAgREVDT1JBVE9SX05PVF9DQUxMRUQgPSAxMDAzLFxuICBERUNPUkFUT1JfT05fQU5PTllNT1VTX0NMQVNTID0gMTAwNCxcbiAgREVDT1JBVE9SX1VORVhQRUNURUQgPSAxMDA1LFxuXG4gIC8qKlxuICAgKiBUaGlzIGVycm9yIGNvZGUgaW5kaWNhdGVzIHRoYXQgdGhlcmUgYXJlIGluY29tcGF0aWJsZSBkZWNvcmF0b3JzIG9uIGEgdHlwZSBvciBhIGNsYXNzIGZpZWxkLlxuICAgKi9cbiAgREVDT1JBVE9SX0NPTExJU0lPTiA9IDEwMDYsXG5cbiAgVkFMVUVfSEFTX1dST05HX1RZUEUgPSAxMDEwLFxuICBWQUxVRV9OT1RfTElURVJBTCA9IDEwMTEsXG5cbiAgQ09NUE9ORU5UX01JU1NJTkdfVEVNUExBVEUgPSAyMDAxLFxuICBQSVBFX01JU1NJTkdfTkFNRSA9IDIwMDIsXG4gIFBBUkFNX01JU1NJTkdfVE9LRU4gPSAyMDAzLFxuICBESVJFQ1RJVkVfTUlTU0lOR19TRUxFQ1RPUiA9IDIwMDQsXG5cbiAgLyoqIFJhaXNlZCB3aGVuIGFuIHVuZGVjb3JhdGVkIGNsYXNzIGlzIHBhc3NlZCBpbiBhcyBhIHByb3ZpZGVyIHRvIGEgbW9kdWxlIG9yIGEgZGlyZWN0aXZlLiAqL1xuICBVTkRFQ09SQVRFRF9QUk9WSURFUiA9IDIwMDUsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGEgRGlyZWN0aXZlIGluaGVyaXRzIGl0cyBjb25zdHJ1Y3RvciBmcm9tIGEgYmFzZSBjbGFzcyB3aXRob3V0IGFuIEFuZ3VsYXJcbiAgICogZGVjb3JhdG9yLlxuICAgKi9cbiAgRElSRUNUSVZFX0lOSEVSSVRTX1VOREVDT1JBVEVEX0NUT1IgPSAyMDA2LFxuXG4gIFNZTUJPTF9OT1RfRVhQT1JURUQgPSAzMDAxLFxuICBTWU1CT0xfRVhQT1JURURfVU5ERVJfRElGRkVSRU5UX05BTUUgPSAzMDAyLFxuXG4gIENPTkZJR19GTEFUX01PRFVMRV9OT19JTkRFWCA9IDQwMDEsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGEgaG9zdCBleHByZXNzaW9uIGhhcyBhIHBhcnNlIGVycm9yLCBzdWNoIGFzIGEgaG9zdCBsaXN0ZW5lciBvciBob3N0IGJpbmRpbmdcbiAgICogZXhwcmVzc2lvbiBjb250YWluaW5nIGEgcGlwZS5cbiAgICovXG4gIEhPU1RfQklORElOR19QQVJTRV9FUlJPUiA9IDUwMDEsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGNvbnRhaW5zIGFuIGludmFsaWQgcmVmZXJlbmNlIGluIGBkZWNsYXJhdGlvbnNgLlxuICAgKi9cbiAgTkdNT0RVTEVfSU5WQUxJRF9ERUNMQVJBVElPTiA9IDYwMDEsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGNvbnRhaW5zIGFuIGludmFsaWQgdHlwZSBpbiBgaW1wb3J0c2AuXG4gICAqL1xuICBOR01PRFVMRV9JTlZBTElEX0lNUE9SVCA9IDYwMDIsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGNvbnRhaW5zIGFuIGludmFsaWQgdHlwZSBpbiBgZXhwb3J0c2AuXG4gICAqL1xuICBOR01PRFVMRV9JTlZBTElEX0VYUE9SVCA9IDYwMDMsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGNvbnRhaW5zIGEgdHlwZSBpbiBgZXhwb3J0c2Agd2hpY2ggaXMgbmVpdGhlciBpbiBgZGVjbGFyYXRpb25zYCBub3JcbiAgICogb3RoZXJ3aXNlIGltcG9ydGVkLlxuICAgKi9cbiAgTkdNT0RVTEVfSU5WQUxJRF9SRUVYUE9SVCA9IDYwMDQsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGEgYE1vZHVsZVdpdGhQcm92aWRlcnNgIHdpdGggYSBtaXNzaW5nXG4gICAqIGdlbmVyaWMgdHlwZSBhcmd1bWVudCBpcyBwYXNzZWQgaW50byBhbiBgTmdNb2R1bGVgLlxuICAgKi9cbiAgTkdNT0RVTEVfTU9EVUxFX1dJVEhfUFJPVklERVJTX01JU1NJTkdfR0VORVJJQyA9IDYwMDUsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGV4cG9ydHMgbXVsdGlwbGUgZGlyZWN0aXZlcy9waXBlcyBvZiB0aGUgc2FtZSBuYW1lIGFuZCB0aGUgY29tcGlsZXJcbiAgICogYXR0ZW1wdHMgdG8gZ2VuZXJhdGUgcHJpdmF0ZSByZS1leHBvcnRzIHdpdGhpbiB0aGUgTmdNb2R1bGUgZmlsZS5cbiAgICovXG4gIE5HTU9EVUxFX1JFRVhQT1JUX05BTUVfQ09MTElTSU9OID0gNjAwNixcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gYSBkaXJlY3RpdmUvcGlwZSBpcyBwYXJ0IG9mIHRoZSBkZWNsYXJhdGlvbnMgb2YgdHdvIG9yIG1vcmUgTmdNb2R1bGVzLlxuICAgKi9cbiAgTkdNT0RVTEVfREVDTEFSQVRJT05fTk9UX1VOSVFVRSA9IDYwMDcsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIG5nY2MgdHJpZXMgdG8gaW5qZWN0IGEgc3ludGhldGljIGRlY29yYXRvciBvdmVyIG9uZSB0aGF0IGFscmVhZHkgZXhpc3RzLlxuICAgKi9cbiAgTkdDQ19NSUdSQVRJT05fREVDT1JBVE9SX0lOSkVDVElPTl9FUlJPUiA9IDcwMDEsXG5cbiAgLyoqXG4gICAqIEFuIGVsZW1lbnQgbmFtZSBmYWlsZWQgdmFsaWRhdGlvbiBhZ2FpbnN0IHRoZSBET00gc2NoZW1hLlxuICAgKi9cbiAgU0NIRU1BX0lOVkFMSURfRUxFTUVOVCA9IDgwMDEsXG5cbiAgLyoqXG4gICAqIEFuIGVsZW1lbnQncyBhdHRyaWJ1dGUgbmFtZSBmYWlsZWQgdmFsaWRhdGlvbiBhZ2FpbnN0IHRoZSBET00gc2NoZW1hLlxuICAgKi9cbiAgU0NIRU1BX0lOVkFMSURfQVRUUklCVVRFID0gODAwMixcblxuICAvKipcbiAgICogTm8gbWF0Y2hpbmcgZGlyZWN0aXZlIHdhcyBmb3VuZCBmb3IgYSBgI3JlZj1cInRhcmdldFwiYCBleHByZXNzaW9uLlxuICAgKi9cbiAgTUlTU0lOR19SRUZFUkVOQ0VfVEFSR0VUID0gODAwMyxcblxuICAvKipcbiAgICogTm8gbWF0Y2hpbmcgcGlwZSB3YXMgZm91bmQgZm9yIGFcbiAgICovXG4gIE1JU1NJTkdfUElQRSA9IDgwMDQsXG5cbiAgLyoqXG4gICAqIFRoZSBsZWZ0LWhhbmQgc2lkZSBvZiBhbiBhc3NpZ25tZW50IGV4cHJlc3Npb24gd2FzIGEgdGVtcGxhdGUgdmFyaWFibGUuIEVmZmVjdGl2ZWx5LCB0aGVcbiAgICogdGVtcGxhdGUgbG9va2VkIGxpa2U6XG4gICAqXG4gICAqIGBgYFxuICAgKiA8bmctdGVtcGxhdGUgbGV0LXNvbWV0aGluZz5cbiAgICogICA8YnV0dG9uIChjbGljayk9XCJzb21ldGhpbmcgPSAuLi5cIj4uLi48L2J1dHRvbj5cbiAgICogPC9uZy10ZW1wbGF0ZT5cbiAgICogYGBgXG4gICAqXG4gICAqIFRlbXBsYXRlIHZhcmlhYmxlcyBhcmUgcmVhZC1vbmx5LlxuICAgKi9cbiAgV1JJVEVfVE9fUkVBRF9PTkxZX1ZBUklBQkxFID0gODAwNSxcblxuICAvKipcbiAgICogQW4gaW5qZWN0YWJsZSBhbHJlYWR5IGhhcyBhIGDJtXByb3ZgIHByb3BlcnR5LlxuICAgKi9cbiAgSU5KRUNUQUJMRV9EVVBMSUNBVEVfUFJPViA9IDkwMDEsXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBuZ0Vycm9yQ29kZShjb2RlOiBFcnJvckNvZGUpOiBudW1iZXIge1xuICByZXR1cm4gcGFyc2VJbnQoJy05OScgKyBjb2RlKTtcbn1cbiJdfQ==