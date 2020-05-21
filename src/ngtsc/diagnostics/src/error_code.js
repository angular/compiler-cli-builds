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
        define("@angular/compiler-cli/src/ngtsc/diagnostics/src/error_code", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ngErrorCode = exports.ErrorCode = void 0;
    /**
     * @publicApi
     */
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
        /**
         * Raised when an undecorated class that is using Angular features
         * has been discovered.
         */
        ErrorCode[ErrorCode["UNDECORATED_CLASS_USING_ANGULAR_FEATURES"] = 2007] = "UNDECORATED_CLASS_USING_ANGULAR_FEATURES";
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
         * A template variable was declared twice. For example:
         *
         * ```html
         * <div *ngFor="let i of items; let i = index">
         * </div>
         * ```
         */
        ErrorCode[ErrorCode["DUPLICATE_VARIABLE_DECLARATION"] = 8006] = "DUPLICATE_VARIABLE_DECLARATION";
        /**
         * An injectable already has a `ɵprov` property.
         */
        ErrorCode[ErrorCode["INJECTABLE_DUPLICATE_PROV"] = 9001] = "INJECTABLE_DUPLICATE_PROV";
    })(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
    /**
     * @internal
     */
    function ngErrorCode(code) {
        return parseInt('-99' + code);
    }
    exports.ngErrorCode = ngErrorCode;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JfY29kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZGlhZ25vc3RpY3Mvc3JjL2Vycm9yX2NvZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUg7O09BRUc7SUFDSCxJQUFZLFNBcUlYO0lBcklELFdBQVksU0FBUztRQUNuQixzRkFBZ0MsQ0FBQTtRQUNoQyw4RUFBNEIsQ0FBQTtRQUM1Qiw0RUFBMkIsQ0FBQTtRQUMzQiw0RkFBbUMsQ0FBQTtRQUNuQyw0RUFBMkIsQ0FBQTtRQUUzQjs7V0FFRztRQUNILDBFQUEwQixDQUFBO1FBRTFCLDRFQUEyQixDQUFBO1FBQzNCLHNFQUF3QixDQUFBO1FBRXhCLHdGQUFpQyxDQUFBO1FBQ2pDLHNFQUF3QixDQUFBO1FBQ3hCLDBFQUEwQixDQUFBO1FBQzFCLHdGQUFpQyxDQUFBO1FBRWpDLDhGQUE4RjtRQUM5Riw0RUFBMkIsQ0FBQTtRQUUzQjs7O1dBR0c7UUFDSCwwR0FBMEMsQ0FBQTtRQUUxQzs7O1dBR0c7UUFDSCxvSEFBK0MsQ0FBQTtRQUUvQywwRUFBMEIsQ0FBQTtRQUMxQiw0R0FBMkMsQ0FBQTtRQUUzQywwRkFBa0MsQ0FBQTtRQUNsQyxrSkFBOEQsQ0FBQTtRQUU5RDs7O1dBR0c7UUFDSCxvRkFBK0IsQ0FBQTtRQUUvQjs7V0FFRztRQUNILDRGQUFtQyxDQUFBO1FBRW5DOztXQUVHO1FBQ0gsa0ZBQThCLENBQUE7UUFFOUI7O1dBRUc7UUFDSCxrRkFBOEIsQ0FBQTtRQUU5Qjs7O1dBR0c7UUFDSCxzRkFBZ0MsQ0FBQTtRQUVoQzs7O1dBR0c7UUFDSCxnSUFBcUQsQ0FBQTtRQUVyRDs7O1dBR0c7UUFDSCxvR0FBdUMsQ0FBQTtRQUV2Qzs7V0FFRztRQUNILGtHQUFzQyxDQUFBO1FBRXRDOztXQUVHO1FBQ0gsZ0ZBQTZCLENBQUE7UUFFN0I7O1dBRUc7UUFDSCxvRkFBK0IsQ0FBQTtRQUUvQjs7V0FFRztRQUNILG9GQUErQixDQUFBO1FBRS9COztXQUVHO1FBQ0gsNERBQW1CLENBQUE7UUFFbkI7Ozs7Ozs7Ozs7O1dBV0c7UUFDSCwwRkFBa0MsQ0FBQTtRQUVsQzs7Ozs7OztXQU9HO1FBQ0gsZ0dBQXFDLENBQUE7UUFFckM7O1dBRUc7UUFDSCxzRkFBZ0MsQ0FBQTtJQUNsQyxDQUFDLEVBcklXLFNBQVMsR0FBVCxpQkFBUyxLQUFULGlCQUFTLFFBcUlwQjtJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsV0FBVyxDQUFDLElBQWU7UUFDekMsT0FBTyxRQUFRLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFGRCxrQ0FFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLyoqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBlbnVtIEVycm9yQ29kZSB7XG4gIERFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwgPSAxMDAxLFxuICBERUNPUkFUT1JfQVJJVFlfV1JPTkcgPSAxMDAyLFxuICBERUNPUkFUT1JfTk9UX0NBTExFRCA9IDEwMDMsXG4gIERFQ09SQVRPUl9PTl9BTk9OWU1PVVNfQ0xBU1MgPSAxMDA0LFxuICBERUNPUkFUT1JfVU5FWFBFQ1RFRCA9IDEwMDUsXG5cbiAgLyoqXG4gICAqIFRoaXMgZXJyb3IgY29kZSBpbmRpY2F0ZXMgdGhhdCB0aGVyZSBhcmUgaW5jb21wYXRpYmxlIGRlY29yYXRvcnMgb24gYSB0eXBlIG9yIGEgY2xhc3MgZmllbGQuXG4gICAqL1xuICBERUNPUkFUT1JfQ09MTElTSU9OID0gMTAwNixcblxuICBWQUxVRV9IQVNfV1JPTkdfVFlQRSA9IDEwMTAsXG4gIFZBTFVFX05PVF9MSVRFUkFMID0gMTAxMSxcblxuICBDT01QT05FTlRfTUlTU0lOR19URU1QTEFURSA9IDIwMDEsXG4gIFBJUEVfTUlTU0lOR19OQU1FID0gMjAwMixcbiAgUEFSQU1fTUlTU0lOR19UT0tFTiA9IDIwMDMsXG4gIERJUkVDVElWRV9NSVNTSU5HX1NFTEVDVE9SID0gMjAwNCxcblxuICAvKiogUmFpc2VkIHdoZW4gYW4gdW5kZWNvcmF0ZWQgY2xhc3MgaXMgcGFzc2VkIGluIGFzIGEgcHJvdmlkZXIgdG8gYSBtb2R1bGUgb3IgYSBkaXJlY3RpdmUuICovXG4gIFVOREVDT1JBVEVEX1BST1ZJREVSID0gMjAwNSxcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gYSBEaXJlY3RpdmUgaW5oZXJpdHMgaXRzIGNvbnN0cnVjdG9yIGZyb20gYSBiYXNlIGNsYXNzIHdpdGhvdXQgYW4gQW5ndWxhclxuICAgKiBkZWNvcmF0b3IuXG4gICAqL1xuICBESVJFQ1RJVkVfSU5IRVJJVFNfVU5ERUNPUkFURURfQ1RPUiA9IDIwMDYsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIHVuZGVjb3JhdGVkIGNsYXNzIHRoYXQgaXMgdXNpbmcgQW5ndWxhciBmZWF0dXJlc1xuICAgKiBoYXMgYmVlbiBkaXNjb3ZlcmVkLlxuICAgKi9cbiAgVU5ERUNPUkFURURfQ0xBU1NfVVNJTkdfQU5HVUxBUl9GRUFUVVJFUyA9IDIwMDcsXG5cbiAgU1lNQk9MX05PVF9FWFBPUlRFRCA9IDMwMDEsXG4gIFNZTUJPTF9FWFBPUlRFRF9VTkRFUl9ESUZGRVJFTlRfTkFNRSA9IDMwMDIsXG5cbiAgQ09ORklHX0ZMQVRfTU9EVUxFX05PX0lOREVYID0gNDAwMSxcbiAgQ09ORklHX1NUUklDVF9URU1QTEFURVNfSU1QTElFU19GVUxMX1RFTVBMQVRFX1RZUEVDSEVDSyA9IDQwMDIsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGEgaG9zdCBleHByZXNzaW9uIGhhcyBhIHBhcnNlIGVycm9yLCBzdWNoIGFzIGEgaG9zdCBsaXN0ZW5lciBvciBob3N0IGJpbmRpbmdcbiAgICogZXhwcmVzc2lvbiBjb250YWluaW5nIGEgcGlwZS5cbiAgICovXG4gIEhPU1RfQklORElOR19QQVJTRV9FUlJPUiA9IDUwMDEsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGNvbnRhaW5zIGFuIGludmFsaWQgcmVmZXJlbmNlIGluIGBkZWNsYXJhdGlvbnNgLlxuICAgKi9cbiAgTkdNT0RVTEVfSU5WQUxJRF9ERUNMQVJBVElPTiA9IDYwMDEsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGNvbnRhaW5zIGFuIGludmFsaWQgdHlwZSBpbiBgaW1wb3J0c2AuXG4gICAqL1xuICBOR01PRFVMRV9JTlZBTElEX0lNUE9SVCA9IDYwMDIsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGNvbnRhaW5zIGFuIGludmFsaWQgdHlwZSBpbiBgZXhwb3J0c2AuXG4gICAqL1xuICBOR01PRFVMRV9JTlZBTElEX0VYUE9SVCA9IDYwMDMsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGNvbnRhaW5zIGEgdHlwZSBpbiBgZXhwb3J0c2Agd2hpY2ggaXMgbmVpdGhlciBpbiBgZGVjbGFyYXRpb25zYCBub3JcbiAgICogb3RoZXJ3aXNlIGltcG9ydGVkLlxuICAgKi9cbiAgTkdNT0RVTEVfSU5WQUxJRF9SRUVYUE9SVCA9IDYwMDQsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGEgYE1vZHVsZVdpdGhQcm92aWRlcnNgIHdpdGggYSBtaXNzaW5nXG4gICAqIGdlbmVyaWMgdHlwZSBhcmd1bWVudCBpcyBwYXNzZWQgaW50byBhbiBgTmdNb2R1bGVgLlxuICAgKi9cbiAgTkdNT0RVTEVfTU9EVUxFX1dJVEhfUFJPVklERVJTX01JU1NJTkdfR0VORVJJQyA9IDYwMDUsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIE5nTW9kdWxlIGV4cG9ydHMgbXVsdGlwbGUgZGlyZWN0aXZlcy9waXBlcyBvZiB0aGUgc2FtZSBuYW1lIGFuZCB0aGUgY29tcGlsZXJcbiAgICogYXR0ZW1wdHMgdG8gZ2VuZXJhdGUgcHJpdmF0ZSByZS1leHBvcnRzIHdpdGhpbiB0aGUgTmdNb2R1bGUgZmlsZS5cbiAgICovXG4gIE5HTU9EVUxFX1JFRVhQT1JUX05BTUVfQ09MTElTSU9OID0gNjAwNixcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gYSBkaXJlY3RpdmUvcGlwZSBpcyBwYXJ0IG9mIHRoZSBkZWNsYXJhdGlvbnMgb2YgdHdvIG9yIG1vcmUgTmdNb2R1bGVzLlxuICAgKi9cbiAgTkdNT0RVTEVfREVDTEFSQVRJT05fTk9UX1VOSVFVRSA9IDYwMDcsXG5cbiAgLyoqXG4gICAqIEFuIGVsZW1lbnQgbmFtZSBmYWlsZWQgdmFsaWRhdGlvbiBhZ2FpbnN0IHRoZSBET00gc2NoZW1hLlxuICAgKi9cbiAgU0NIRU1BX0lOVkFMSURfRUxFTUVOVCA9IDgwMDEsXG5cbiAgLyoqXG4gICAqIEFuIGVsZW1lbnQncyBhdHRyaWJ1dGUgbmFtZSBmYWlsZWQgdmFsaWRhdGlvbiBhZ2FpbnN0IHRoZSBET00gc2NoZW1hLlxuICAgKi9cbiAgU0NIRU1BX0lOVkFMSURfQVRUUklCVVRFID0gODAwMixcblxuICAvKipcbiAgICogTm8gbWF0Y2hpbmcgZGlyZWN0aXZlIHdhcyBmb3VuZCBmb3IgYSBgI3JlZj1cInRhcmdldFwiYCBleHByZXNzaW9uLlxuICAgKi9cbiAgTUlTU0lOR19SRUZFUkVOQ0VfVEFSR0VUID0gODAwMyxcblxuICAvKipcbiAgICogTm8gbWF0Y2hpbmcgcGlwZSB3YXMgZm91bmQgZm9yIGFcbiAgICovXG4gIE1JU1NJTkdfUElQRSA9IDgwMDQsXG5cbiAgLyoqXG4gICAqIFRoZSBsZWZ0LWhhbmQgc2lkZSBvZiBhbiBhc3NpZ25tZW50IGV4cHJlc3Npb24gd2FzIGEgdGVtcGxhdGUgdmFyaWFibGUuIEVmZmVjdGl2ZWx5LCB0aGVcbiAgICogdGVtcGxhdGUgbG9va2VkIGxpa2U6XG4gICAqXG4gICAqIGBgYFxuICAgKiA8bmctdGVtcGxhdGUgbGV0LXNvbWV0aGluZz5cbiAgICogICA8YnV0dG9uIChjbGljayk9XCJzb21ldGhpbmcgPSAuLi5cIj4uLi48L2J1dHRvbj5cbiAgICogPC9uZy10ZW1wbGF0ZT5cbiAgICogYGBgXG4gICAqXG4gICAqIFRlbXBsYXRlIHZhcmlhYmxlcyBhcmUgcmVhZC1vbmx5LlxuICAgKi9cbiAgV1JJVEVfVE9fUkVBRF9PTkxZX1ZBUklBQkxFID0gODAwNSxcblxuICAvKipcbiAgICogQSB0ZW1wbGF0ZSB2YXJpYWJsZSB3YXMgZGVjbGFyZWQgdHdpY2UuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBodG1sXG4gICAqIDxkaXYgKm5nRm9yPVwibGV0IGkgb2YgaXRlbXM7IGxldCBpID0gaW5kZXhcIj5cbiAgICogPC9kaXY+XG4gICAqIGBgYFxuICAgKi9cbiAgRFVQTElDQVRFX1ZBUklBQkxFX0RFQ0xBUkFUSU9OID0gODAwNixcblxuICAvKipcbiAgICogQW4gaW5qZWN0YWJsZSBhbHJlYWR5IGhhcyBhIGDJtXByb3ZgIHByb3BlcnR5LlxuICAgKi9cbiAgSU5KRUNUQUJMRV9EVVBMSUNBVEVfUFJPViA9IDkwMDEsXG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBuZ0Vycm9yQ29kZShjb2RlOiBFcnJvckNvZGUpOiBudW1iZXIge1xuICByZXR1cm4gcGFyc2VJbnQoJy05OScgKyBjb2RlKTtcbn1cbiJdfQ==