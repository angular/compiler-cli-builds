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
        define("@angular/compiler-cli/src/ngtsc/diagnostics/src/error_code", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ngErrorCode = exports.COMPILER_ERRORS_WITH_GUIDES = exports.ERROR_DETAILS_PAGE_BASE_URL = exports.ErrorCode = void 0;
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
        /**
         * Raised when an component cannot resolve an external resource, such as a template or a style
         * sheet.
         */
        ErrorCode[ErrorCode["COMPONENT_RESOURCE_NOT_FOUND"] = 2008] = "COMPONENT_RESOURCE_NOT_FOUND";
        /**
         * Raised when a component uses `ShadowDom` view encapsulation, but its selector
         * does not match the shadow DOM tag name requirements.
         */
        ErrorCode[ErrorCode["COMPONENT_INVALID_SHADOW_DOM_SELECTOR"] = 2009] = "COMPONENT_INVALID_SHADOW_DOM_SELECTOR";
        ErrorCode[ErrorCode["SYMBOL_NOT_EXPORTED"] = 3001] = "SYMBOL_NOT_EXPORTED";
        ErrorCode[ErrorCode["SYMBOL_EXPORTED_UNDER_DIFFERENT_NAME"] = 3002] = "SYMBOL_EXPORTED_UNDER_DIFFERENT_NAME";
        /**
         * Raised when a relationship between directives and/or pipes would cause a cyclic import to be
         * created that cannot be handled, such as in partial compilation mode.
         */
        ErrorCode[ErrorCode["IMPORT_CYCLE_DETECTED"] = 3003] = "IMPORT_CYCLE_DETECTED";
        ErrorCode[ErrorCode["CONFIG_FLAT_MODULE_NO_INDEX"] = 4001] = "CONFIG_FLAT_MODULE_NO_INDEX";
        ErrorCode[ErrorCode["CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK"] = 4002] = "CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK";
        /**
         * Raised when a host expression has a parse error, such as a host listener or host binding
         * expression containing a pipe.
         */
        ErrorCode[ErrorCode["HOST_BINDING_PARSE_ERROR"] = 5001] = "HOST_BINDING_PARSE_ERROR";
        /**
         * Raised when the compiler cannot parse a component's template.
         */
        ErrorCode[ErrorCode["TEMPLATE_PARSE_ERROR"] = 5002] = "TEMPLATE_PARSE_ERROR";
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
         * Not actually raised by the compiler, but reserved for documentation of a View Engine error when
         * a View Engine build depends on an Ivy-compiled NgModule.
         */
        ErrorCode[ErrorCode["NGMODULE_VE_DEPENDENCY_ON_IVY_LIB"] = 6999] = "NGMODULE_VE_DEPENDENCY_ON_IVY_LIB";
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
         * A template has a two way binding (two bindings created by a single syntactial element)
         * in which the input and output are going to different places.
         */
        ErrorCode[ErrorCode["SPLIT_TWO_WAY_BINDING"] = 8007] = "SPLIT_TWO_WAY_BINDING";
        /**
         * A two way binding in a template has an incorrect syntax,
         * parentheses outside brackets. For example:
         *
         * ```
         * <div ([foo])="bar" />
         * ```
         */
        ErrorCode[ErrorCode["INVALID_BANANA_IN_BOX"] = 8101] = "INVALID_BANANA_IN_BOX";
        /**
         * The template type-checking engine would need to generate an inline type check block for a
         * component, but the current type-checking environment doesn't support it.
         */
        ErrorCode[ErrorCode["INLINE_TCB_REQUIRED"] = 8900] = "INLINE_TCB_REQUIRED";
        /**
         * The template type-checking engine would need to generate an inline type constructor for a
         * directive or component, but the current type-checking environment doesn't support it.
         */
        ErrorCode[ErrorCode["INLINE_TYPE_CTOR_REQUIRED"] = 8901] = "INLINE_TYPE_CTOR_REQUIRED";
        /**
         * An injectable already has a `ɵprov` property.
         */
        ErrorCode[ErrorCode["INJECTABLE_DUPLICATE_PROV"] = 9001] = "INJECTABLE_DUPLICATE_PROV";
        // 10XXX error codes are reserved for diagnostics with categories other than
        // `ts.DiagnosticCategory.Error`. These diagnostics are generated by the compiler when configured
        // to do so by a tool such as the Language Service, or by the Language Service itself.
        /**
         * Suggest users to enable `strictTemplates` to make use of full capabilities
         * provided by Angular language service.
         */
        ErrorCode[ErrorCode["SUGGEST_STRICT_TEMPLATES"] = 10001] = "SUGGEST_STRICT_TEMPLATES";
        /**
         * Indicates that a particular structural directive provides advanced type narrowing
         * functionality, but the current template type-checking configuration does not allow its usage in
         * type inference.
         */
        ErrorCode[ErrorCode["SUGGEST_SUBOPTIMAL_TYPE_INFERENCE"] = 10002] = "SUGGEST_SUBOPTIMAL_TYPE_INFERENCE";
    })(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
    /**
     * @internal
     * Base URL for the error details page.
     * Keep this value in sync with a similar const in
     * `packages/core/src/render3/error_code.ts`.
     */
    exports.ERROR_DETAILS_PAGE_BASE_URL = 'https://angular.io/errors';
    /**
     * @internal
     * Contains a set of error messages that have detailed guides at angular.io.
     * Full list of available error guides can be found at https://angular.io/errors
     */
    exports.COMPILER_ERRORS_WITH_GUIDES = new Set([
        ErrorCode.DECORATOR_ARG_NOT_LITERAL,
        ErrorCode.IMPORT_CYCLE_DETECTED,
        ErrorCode.PARAM_MISSING_TOKEN,
        ErrorCode.SCHEMA_INVALID_ELEMENT,
        ErrorCode.SCHEMA_INVALID_ATTRIBUTE,
        ErrorCode.MISSING_REFERENCE_TARGET,
        ErrorCode.COMPONENT_INVALID_SHADOW_DOM_SELECTOR,
    ]);
    /**
     * @internal
     */
    function ngErrorCode(code) {
        return parseInt('-99' + code);
    }
    exports.ngErrorCode = ngErrorCode;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JfY29kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZGlhZ25vc3RpY3Mvc3JjL2Vycm9yX2NvZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUg7O09BRUc7SUFDSCxJQUFZLFNBOE1YO0lBOU1ELFdBQVksU0FBUztRQUNuQixzRkFBZ0MsQ0FBQTtRQUNoQyw4RUFBNEIsQ0FBQTtRQUM1Qiw0RUFBMkIsQ0FBQTtRQUMzQiw0RkFBbUMsQ0FBQTtRQUNuQyw0RUFBMkIsQ0FBQTtRQUUzQjs7V0FFRztRQUNILDBFQUEwQixDQUFBO1FBRTFCLDRFQUEyQixDQUFBO1FBQzNCLHNFQUF3QixDQUFBO1FBRXhCLHdGQUFpQyxDQUFBO1FBQ2pDLHNFQUF3QixDQUFBO1FBQ3hCLDBFQUEwQixDQUFBO1FBQzFCLHdGQUFpQyxDQUFBO1FBRWpDLDhGQUE4RjtRQUM5Riw0RUFBMkIsQ0FBQTtRQUUzQjs7O1dBR0c7UUFDSCwwR0FBMEMsQ0FBQTtRQUUxQzs7O1dBR0c7UUFDSCxvSEFBK0MsQ0FBQTtRQUUvQzs7O1dBR0c7UUFDSCw0RkFBbUMsQ0FBQTtRQUVuQzs7O1dBR0c7UUFDSCw4R0FBNEMsQ0FBQTtRQUU1QywwRUFBMEIsQ0FBQTtRQUMxQiw0R0FBMkMsQ0FBQTtRQUMzQzs7O1dBR0c7UUFDSCw4RUFBNEIsQ0FBQTtRQUU1QiwwRkFBa0MsQ0FBQTtRQUNsQyxrSkFBOEQsQ0FBQTtRQUU5RDs7O1dBR0c7UUFDSCxvRkFBK0IsQ0FBQTtRQUUvQjs7V0FFRztRQUNILDRFQUEyQixDQUFBO1FBRTNCOztXQUVHO1FBQ0gsNEZBQW1DLENBQUE7UUFFbkM7O1dBRUc7UUFDSCxrRkFBOEIsQ0FBQTtRQUU5Qjs7V0FFRztRQUNILGtGQUE4QixDQUFBO1FBRTlCOzs7V0FHRztRQUNILHNGQUFnQyxDQUFBO1FBRWhDOzs7V0FHRztRQUNILGdJQUFxRCxDQUFBO1FBRXJEOzs7V0FHRztRQUNILG9HQUF1QyxDQUFBO1FBRXZDOztXQUVHO1FBQ0gsa0dBQXNDLENBQUE7UUFFdEM7OztXQUdHO1FBQ0gsc0dBQXdDLENBQUE7UUFFeEM7O1dBRUc7UUFDSCxnRkFBNkIsQ0FBQTtRQUU3Qjs7V0FFRztRQUNILG9GQUErQixDQUFBO1FBRS9COztXQUVHO1FBQ0gsb0ZBQStCLENBQUE7UUFFL0I7O1dBRUc7UUFDSCw0REFBbUIsQ0FBQTtRQUVuQjs7Ozs7Ozs7Ozs7V0FXRztRQUNILDBGQUFrQyxDQUFBO1FBRWxDOzs7Ozs7O1dBT0c7UUFDSCxnR0FBcUMsQ0FBQTtRQUVyQzs7O1dBR0c7UUFDSCw4RUFBNEIsQ0FBQTtRQUU1Qjs7Ozs7OztXQU9HO1FBQ0gsOEVBQTRCLENBQUE7UUFFNUI7OztXQUdHO1FBQ0gsMEVBQTBCLENBQUE7UUFFMUI7OztXQUdHO1FBQ0gsc0ZBQWdDLENBQUE7UUFFaEM7O1dBRUc7UUFDSCxzRkFBZ0MsQ0FBQTtRQUVoQyw0RUFBNEU7UUFDNUUsaUdBQWlHO1FBQ2pHLHNGQUFzRjtRQUV0Rjs7O1dBR0c7UUFDSCxxRkFBZ0MsQ0FBQTtRQUVoQzs7OztXQUlHO1FBQ0gsdUdBQXlDLENBQUE7SUFDM0MsQ0FBQyxFQTlNVyxTQUFTLEdBQVQsaUJBQVMsS0FBVCxpQkFBUyxRQThNcEI7SUFFRDs7Ozs7T0FLRztJQUNVLFFBQUEsMkJBQTJCLEdBQUcsMkJBQTJCLENBQUM7SUFFdkU7Ozs7T0FJRztJQUNVLFFBQUEsMkJBQTJCLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDakQsU0FBUyxDQUFDLHlCQUF5QjtRQUNuQyxTQUFTLENBQUMscUJBQXFCO1FBQy9CLFNBQVMsQ0FBQyxtQkFBbUI7UUFDN0IsU0FBUyxDQUFDLHNCQUFzQjtRQUNoQyxTQUFTLENBQUMsd0JBQXdCO1FBQ2xDLFNBQVMsQ0FBQyx3QkFBd0I7UUFDbEMsU0FBUyxDQUFDLHFDQUFxQztLQUNoRCxDQUFDLENBQUM7SUFFSDs7T0FFRztJQUNILFNBQWdCLFdBQVcsQ0FBQyxJQUFlO1FBQ3pDLE9BQU8sUUFBUSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRkQsa0NBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLyoqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBlbnVtIEVycm9yQ29kZSB7XG4gIERFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwgPSAxMDAxLFxuICBERUNPUkFUT1JfQVJJVFlfV1JPTkcgPSAxMDAyLFxuICBERUNPUkFUT1JfTk9UX0NBTExFRCA9IDEwMDMsXG4gIERFQ09SQVRPUl9PTl9BTk9OWU1PVVNfQ0xBU1MgPSAxMDA0LFxuICBERUNPUkFUT1JfVU5FWFBFQ1RFRCA9IDEwMDUsXG5cbiAgLyoqXG4gICAqIFRoaXMgZXJyb3IgY29kZSBpbmRpY2F0ZXMgdGhhdCB0aGVyZSBhcmUgaW5jb21wYXRpYmxlIGRlY29yYXRvcnMgb24gYSB0eXBlIG9yIGEgY2xhc3MgZmllbGQuXG4gICAqL1xuICBERUNPUkFUT1JfQ09MTElTSU9OID0gMTAwNixcblxuICBWQUxVRV9IQVNfV1JPTkdfVFlQRSA9IDEwMTAsXG4gIFZBTFVFX05PVF9MSVRFUkFMID0gMTAxMSxcblxuICBDT01QT05FTlRfTUlTU0lOR19URU1QTEFURSA9IDIwMDEsXG4gIFBJUEVfTUlTU0lOR19OQU1FID0gMjAwMixcbiAgUEFSQU1fTUlTU0lOR19UT0tFTiA9IDIwMDMsXG4gIERJUkVDVElWRV9NSVNTSU5HX1NFTEVDVE9SID0gMjAwNCxcblxuICAvKiogUmFpc2VkIHdoZW4gYW4gdW5kZWNvcmF0ZWQgY2xhc3MgaXMgcGFzc2VkIGluIGFzIGEgcHJvdmlkZXIgdG8gYSBtb2R1bGUgb3IgYSBkaXJlY3RpdmUuICovXG4gIFVOREVDT1JBVEVEX1BST1ZJREVSID0gMjAwNSxcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gYSBEaXJlY3RpdmUgaW5oZXJpdHMgaXRzIGNvbnN0cnVjdG9yIGZyb20gYSBiYXNlIGNsYXNzIHdpdGhvdXQgYW4gQW5ndWxhclxuICAgKiBkZWNvcmF0b3IuXG4gICAqL1xuICBESVJFQ1RJVkVfSU5IRVJJVFNfVU5ERUNPUkFURURfQ1RPUiA9IDIwMDYsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIHVuZGVjb3JhdGVkIGNsYXNzIHRoYXQgaXMgdXNpbmcgQW5ndWxhciBmZWF0dXJlc1xuICAgKiBoYXMgYmVlbiBkaXNjb3ZlcmVkLlxuICAgKi9cbiAgVU5ERUNPUkFURURfQ0xBU1NfVVNJTkdfQU5HVUxBUl9GRUFUVVJFUyA9IDIwMDcsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGFuIGNvbXBvbmVudCBjYW5ub3QgcmVzb2x2ZSBhbiBleHRlcm5hbCByZXNvdXJjZSwgc3VjaCBhcyBhIHRlbXBsYXRlIG9yIGEgc3R5bGVcbiAgICogc2hlZXQuXG4gICAqL1xuICBDT01QT05FTlRfUkVTT1VSQ0VfTk9UX0ZPVU5EID0gMjAwOCxcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gYSBjb21wb25lbnQgdXNlcyBgU2hhZG93RG9tYCB2aWV3IGVuY2Fwc3VsYXRpb24sIGJ1dCBpdHMgc2VsZWN0b3JcbiAgICogZG9lcyBub3QgbWF0Y2ggdGhlIHNoYWRvdyBET00gdGFnIG5hbWUgcmVxdWlyZW1lbnRzLlxuICAgKi9cbiAgQ09NUE9ORU5UX0lOVkFMSURfU0hBRE9XX0RPTV9TRUxFQ1RPUiA9IDIwMDksXG5cbiAgU1lNQk9MX05PVF9FWFBPUlRFRCA9IDMwMDEsXG4gIFNZTUJPTF9FWFBPUlRFRF9VTkRFUl9ESUZGRVJFTlRfTkFNRSA9IDMwMDIsXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhIHJlbGF0aW9uc2hpcCBiZXR3ZWVuIGRpcmVjdGl2ZXMgYW5kL29yIHBpcGVzIHdvdWxkIGNhdXNlIGEgY3ljbGljIGltcG9ydCB0byBiZVxuICAgKiBjcmVhdGVkIHRoYXQgY2Fubm90IGJlIGhhbmRsZWQsIHN1Y2ggYXMgaW4gcGFydGlhbCBjb21waWxhdGlvbiBtb2RlLlxuICAgKi9cbiAgSU1QT1JUX0NZQ0xFX0RFVEVDVEVEID0gMzAwMyxcblxuICBDT05GSUdfRkxBVF9NT0RVTEVfTk9fSU5ERVggPSA0MDAxLFxuICBDT05GSUdfU1RSSUNUX1RFTVBMQVRFU19JTVBMSUVTX0ZVTExfVEVNUExBVEVfVFlQRUNIRUNLID0gNDAwMixcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gYSBob3N0IGV4cHJlc3Npb24gaGFzIGEgcGFyc2UgZXJyb3IsIHN1Y2ggYXMgYSBob3N0IGxpc3RlbmVyIG9yIGhvc3QgYmluZGluZ1xuICAgKiBleHByZXNzaW9uIGNvbnRhaW5pbmcgYSBwaXBlLlxuICAgKi9cbiAgSE9TVF9CSU5ESU5HX1BBUlNFX0VSUk9SID0gNTAwMSxcblxuICAvKipcbiAgICogUmFpc2VkIHdoZW4gdGhlIGNvbXBpbGVyIGNhbm5vdCBwYXJzZSBhIGNvbXBvbmVudCdzIHRlbXBsYXRlLlxuICAgKi9cbiAgVEVNUExBVEVfUEFSU0VfRVJST1IgPSA1MDAyLFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhbiBOZ01vZHVsZSBjb250YWlucyBhbiBpbnZhbGlkIHJlZmVyZW5jZSBpbiBgZGVjbGFyYXRpb25zYC5cbiAgICovXG4gIE5HTU9EVUxFX0lOVkFMSURfREVDTEFSQVRJT04gPSA2MDAxLFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhbiBOZ01vZHVsZSBjb250YWlucyBhbiBpbnZhbGlkIHR5cGUgaW4gYGltcG9ydHNgLlxuICAgKi9cbiAgTkdNT0RVTEVfSU5WQUxJRF9JTVBPUlQgPSA2MDAyLFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhbiBOZ01vZHVsZSBjb250YWlucyBhbiBpbnZhbGlkIHR5cGUgaW4gYGV4cG9ydHNgLlxuICAgKi9cbiAgTkdNT0RVTEVfSU5WQUxJRF9FWFBPUlQgPSA2MDAzLFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhbiBOZ01vZHVsZSBjb250YWlucyBhIHR5cGUgaW4gYGV4cG9ydHNgIHdoaWNoIGlzIG5laXRoZXIgaW4gYGRlY2xhcmF0aW9uc2Agbm9yXG4gICAqIG90aGVyd2lzZSBpbXBvcnRlZC5cbiAgICovXG4gIE5HTU9EVUxFX0lOVkFMSURfUkVFWFBPUlQgPSA2MDA0LFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCB3aXRoIGEgbWlzc2luZ1xuICAgKiBnZW5lcmljIHR5cGUgYXJndW1lbnQgaXMgcGFzc2VkIGludG8gYW4gYE5nTW9kdWxlYC5cbiAgICovXG4gIE5HTU9EVUxFX01PRFVMRV9XSVRIX1BST1ZJREVSU19NSVNTSU5HX0dFTkVSSUMgPSA2MDA1LFxuXG4gIC8qKlxuICAgKiBSYWlzZWQgd2hlbiBhbiBOZ01vZHVsZSBleHBvcnRzIG11bHRpcGxlIGRpcmVjdGl2ZXMvcGlwZXMgb2YgdGhlIHNhbWUgbmFtZSBhbmQgdGhlIGNvbXBpbGVyXG4gICAqIGF0dGVtcHRzIHRvIGdlbmVyYXRlIHByaXZhdGUgcmUtZXhwb3J0cyB3aXRoaW4gdGhlIE5nTW9kdWxlIGZpbGUuXG4gICAqL1xuICBOR01PRFVMRV9SRUVYUE9SVF9OQU1FX0NPTExJU0lPTiA9IDYwMDYsXG5cbiAgLyoqXG4gICAqIFJhaXNlZCB3aGVuIGEgZGlyZWN0aXZlL3BpcGUgaXMgcGFydCBvZiB0aGUgZGVjbGFyYXRpb25zIG9mIHR3byBvciBtb3JlIE5nTW9kdWxlcy5cbiAgICovXG4gIE5HTU9EVUxFX0RFQ0xBUkFUSU9OX05PVF9VTklRVUUgPSA2MDA3LFxuXG4gIC8qKlxuICAgKiBOb3QgYWN0dWFsbHkgcmFpc2VkIGJ5IHRoZSBjb21waWxlciwgYnV0IHJlc2VydmVkIGZvciBkb2N1bWVudGF0aW9uIG9mIGEgVmlldyBFbmdpbmUgZXJyb3Igd2hlblxuICAgKiBhIFZpZXcgRW5naW5lIGJ1aWxkIGRlcGVuZHMgb24gYW4gSXZ5LWNvbXBpbGVkIE5nTW9kdWxlLlxuICAgKi9cbiAgTkdNT0RVTEVfVkVfREVQRU5ERU5DWV9PTl9JVllfTElCID0gNjk5OSxcblxuICAvKipcbiAgICogQW4gZWxlbWVudCBuYW1lIGZhaWxlZCB2YWxpZGF0aW9uIGFnYWluc3QgdGhlIERPTSBzY2hlbWEuXG4gICAqL1xuICBTQ0hFTUFfSU5WQUxJRF9FTEVNRU5UID0gODAwMSxcblxuICAvKipcbiAgICogQW4gZWxlbWVudCdzIGF0dHJpYnV0ZSBuYW1lIGZhaWxlZCB2YWxpZGF0aW9uIGFnYWluc3QgdGhlIERPTSBzY2hlbWEuXG4gICAqL1xuICBTQ0hFTUFfSU5WQUxJRF9BVFRSSUJVVEUgPSA4MDAyLFxuXG4gIC8qKlxuICAgKiBObyBtYXRjaGluZyBkaXJlY3RpdmUgd2FzIGZvdW5kIGZvciBhIGAjcmVmPVwidGFyZ2V0XCJgIGV4cHJlc3Npb24uXG4gICAqL1xuICBNSVNTSU5HX1JFRkVSRU5DRV9UQVJHRVQgPSA4MDAzLFxuXG4gIC8qKlxuICAgKiBObyBtYXRjaGluZyBwaXBlIHdhcyBmb3VuZCBmb3IgYVxuICAgKi9cbiAgTUlTU0lOR19QSVBFID0gODAwNCxcblxuICAvKipcbiAgICogVGhlIGxlZnQtaGFuZCBzaWRlIG9mIGFuIGFzc2lnbm1lbnQgZXhwcmVzc2lvbiB3YXMgYSB0ZW1wbGF0ZSB2YXJpYWJsZS4gRWZmZWN0aXZlbHksIHRoZVxuICAgKiB0ZW1wbGF0ZSBsb29rZWQgbGlrZTpcbiAgICpcbiAgICogYGBgXG4gICAqIDxuZy10ZW1wbGF0ZSBsZXQtc29tZXRoaW5nPlxuICAgKiAgIDxidXR0b24gKGNsaWNrKT1cInNvbWV0aGluZyA9IC4uLlwiPi4uLjwvYnV0dG9uPlxuICAgKiA8L25nLXRlbXBsYXRlPlxuICAgKiBgYGBcbiAgICpcbiAgICogVGVtcGxhdGUgdmFyaWFibGVzIGFyZSByZWFkLW9ubHkuXG4gICAqL1xuICBXUklURV9UT19SRUFEX09OTFlfVkFSSUFCTEUgPSA4MDA1LFxuXG4gIC8qKlxuICAgKiBBIHRlbXBsYXRlIHZhcmlhYmxlIHdhcyBkZWNsYXJlZCB0d2ljZS4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYGh0bWxcbiAgICogPGRpdiAqbmdGb3I9XCJsZXQgaSBvZiBpdGVtczsgbGV0IGkgPSBpbmRleFwiPlxuICAgKiA8L2Rpdj5cbiAgICogYGBgXG4gICAqL1xuICBEVVBMSUNBVEVfVkFSSUFCTEVfREVDTEFSQVRJT04gPSA4MDA2LFxuXG4gIC8qKlxuICAgKiBBIHRlbXBsYXRlIGhhcyBhIHR3byB3YXkgYmluZGluZyAodHdvIGJpbmRpbmdzIGNyZWF0ZWQgYnkgYSBzaW5nbGUgc3ludGFjdGlhbCBlbGVtZW50KVxuICAgKiBpbiB3aGljaCB0aGUgaW5wdXQgYW5kIG91dHB1dCBhcmUgZ29pbmcgdG8gZGlmZmVyZW50IHBsYWNlcy5cbiAgICovXG4gIFNQTElUX1RXT19XQVlfQklORElORyA9IDgwMDcsXG5cbiAgLyoqXG4gICAqIEEgdHdvIHdheSBiaW5kaW5nIGluIGEgdGVtcGxhdGUgaGFzIGFuIGluY29ycmVjdCBzeW50YXgsXG4gICAqIHBhcmVudGhlc2VzIG91dHNpZGUgYnJhY2tldHMuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogPGRpdiAoW2Zvb10pPVwiYmFyXCIgLz5cbiAgICogYGBgXG4gICAqL1xuICBJTlZBTElEX0JBTkFOQV9JTl9CT1ggPSA4MTAxLFxuXG4gIC8qKlxuICAgKiBUaGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBlbmdpbmUgd291bGQgbmVlZCB0byBnZW5lcmF0ZSBhbiBpbmxpbmUgdHlwZSBjaGVjayBibG9jayBmb3IgYVxuICAgKiBjb21wb25lbnQsIGJ1dCB0aGUgY3VycmVudCB0eXBlLWNoZWNraW5nIGVudmlyb25tZW50IGRvZXNuJ3Qgc3VwcG9ydCBpdC5cbiAgICovXG4gIElOTElORV9UQ0JfUkVRVUlSRUQgPSA4OTAwLFxuXG4gIC8qKlxuICAgKiBUaGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBlbmdpbmUgd291bGQgbmVlZCB0byBnZW5lcmF0ZSBhbiBpbmxpbmUgdHlwZSBjb25zdHJ1Y3RvciBmb3IgYVxuICAgKiBkaXJlY3RpdmUgb3IgY29tcG9uZW50LCBidXQgdGhlIGN1cnJlbnQgdHlwZS1jaGVja2luZyBlbnZpcm9ubWVudCBkb2Vzbid0IHN1cHBvcnQgaXQuXG4gICAqL1xuICBJTkxJTkVfVFlQRV9DVE9SX1JFUVVJUkVEID0gODkwMSxcblxuICAvKipcbiAgICogQW4gaW5qZWN0YWJsZSBhbHJlYWR5IGhhcyBhIGDJtXByb3ZgIHByb3BlcnR5LlxuICAgKi9cbiAgSU5KRUNUQUJMRV9EVVBMSUNBVEVfUFJPViA9IDkwMDEsXG5cbiAgLy8gMTBYWFggZXJyb3IgY29kZXMgYXJlIHJlc2VydmVkIGZvciBkaWFnbm9zdGljcyB3aXRoIGNhdGVnb3JpZXMgb3RoZXIgdGhhblxuICAvLyBgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yYC4gVGhlc2UgZGlhZ25vc3RpY3MgYXJlIGdlbmVyYXRlZCBieSB0aGUgY29tcGlsZXIgd2hlbiBjb25maWd1cmVkXG4gIC8vIHRvIGRvIHNvIGJ5IGEgdG9vbCBzdWNoIGFzIHRoZSBMYW5ndWFnZSBTZXJ2aWNlLCBvciBieSB0aGUgTGFuZ3VhZ2UgU2VydmljZSBpdHNlbGYuXG5cbiAgLyoqXG4gICAqIFN1Z2dlc3QgdXNlcnMgdG8gZW5hYmxlIGBzdHJpY3RUZW1wbGF0ZXNgIHRvIG1ha2UgdXNlIG9mIGZ1bGwgY2FwYWJpbGl0aWVzXG4gICAqIHByb3ZpZGVkIGJ5IEFuZ3VsYXIgbGFuZ3VhZ2Ugc2VydmljZS5cbiAgICovXG4gIFNVR0dFU1RfU1RSSUNUX1RFTVBMQVRFUyA9IDEwMDAxLFxuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgdGhhdCBhIHBhcnRpY3VsYXIgc3RydWN0dXJhbCBkaXJlY3RpdmUgcHJvdmlkZXMgYWR2YW5jZWQgdHlwZSBuYXJyb3dpbmdcbiAgICogZnVuY3Rpb25hbGl0eSwgYnV0IHRoZSBjdXJyZW50IHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgY29uZmlndXJhdGlvbiBkb2VzIG5vdCBhbGxvdyBpdHMgdXNhZ2UgaW5cbiAgICogdHlwZSBpbmZlcmVuY2UuXG4gICAqL1xuICBTVUdHRVNUX1NVQk9QVElNQUxfVFlQRV9JTkZFUkVOQ0UgPSAxMDAwMixcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEJhc2UgVVJMIGZvciB0aGUgZXJyb3IgZGV0YWlscyBwYWdlLlxuICogS2VlcCB0aGlzIHZhbHVlIGluIHN5bmMgd2l0aCBhIHNpbWlsYXIgY29uc3QgaW5cbiAqIGBwYWNrYWdlcy9jb3JlL3NyYy9yZW5kZXIzL2Vycm9yX2NvZGUudHNgLlxuICovXG5leHBvcnQgY29uc3QgRVJST1JfREVUQUlMU19QQUdFX0JBU0VfVVJMID0gJ2h0dHBzOi8vYW5ndWxhci5pby9lcnJvcnMnO1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQ29udGFpbnMgYSBzZXQgb2YgZXJyb3IgbWVzc2FnZXMgdGhhdCBoYXZlIGRldGFpbGVkIGd1aWRlcyBhdCBhbmd1bGFyLmlvLlxuICogRnVsbCBsaXN0IG9mIGF2YWlsYWJsZSBlcnJvciBndWlkZXMgY2FuIGJlIGZvdW5kIGF0IGh0dHBzOi8vYW5ndWxhci5pby9lcnJvcnNcbiAqL1xuZXhwb3J0IGNvbnN0IENPTVBJTEVSX0VSUk9SU19XSVRIX0dVSURFUyA9IG5ldyBTZXQoW1xuICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCxcbiAgRXJyb3JDb2RlLklNUE9SVF9DWUNMRV9ERVRFQ1RFRCxcbiAgRXJyb3JDb2RlLlBBUkFNX01JU1NJTkdfVE9LRU4sXG4gIEVycm9yQ29kZS5TQ0hFTUFfSU5WQUxJRF9FTEVNRU5ULFxuICBFcnJvckNvZGUuU0NIRU1BX0lOVkFMSURfQVRUUklCVVRFLFxuICBFcnJvckNvZGUuTUlTU0lOR19SRUZFUkVOQ0VfVEFSR0VULFxuICBFcnJvckNvZGUuQ09NUE9ORU5UX0lOVkFMSURfU0hBRE9XX0RPTV9TRUxFQ1RPUixcbl0pO1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gbmdFcnJvckNvZGUoY29kZTogRXJyb3JDb2RlKTogbnVtYmVyIHtcbiAgcmV0dXJuIHBhcnNlSW50KCctOTknICsgY29kZSk7XG59XG4iXX0=