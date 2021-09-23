(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/util", ["require", "exports", "@angular/compiler", "@angular/compiler/src/output/output_ast", "@angular/compiler-cli/linker/src/fatal_linker_error"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.extractForwardRef = exports.getDependency = exports.parseEnum = exports.wrapReference = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var o = require("@angular/compiler/src/output/output_ast");
    var fatal_linker_error_1 = require("@angular/compiler-cli/linker/src/fatal_linker_error");
    function wrapReference(wrapped) {
        return { value: wrapped, type: wrapped };
    }
    exports.wrapReference = wrapReference;
    /**
     * Parses the value of an enum from the AST value's symbol name.
     */
    function parseEnum(value, Enum) {
        var symbolName = value.getSymbolName();
        if (symbolName === null) {
            throw new fatal_linker_error_1.FatalLinkerError(value.expression, 'Expected value to have a symbol name');
        }
        var enumValue = Enum[symbolName];
        if (enumValue === undefined) {
            throw new fatal_linker_error_1.FatalLinkerError(value.expression, "Unsupported enum value for " + Enum);
        }
        return enumValue;
    }
    exports.parseEnum = parseEnum;
    /**
     * Parse a dependency structure from an AST object.
     */
    function getDependency(depObj) {
        var isAttribute = depObj.has('attribute') && depObj.getBoolean('attribute');
        var token = depObj.getOpaque('token');
        // Normally `attribute` is a string literal and so its `attributeNameType` is the same string
        // literal. If the `attribute` is some other expression, the `attributeNameType` would be the
        // `unknown` type. It is not possible to generate this when linking, since it only deals with JS
        // and not typings. When linking the existence of the `attributeNameType` only acts as a marker to
        // change the injection instruction that is generated, so we just pass the literal string
        // `"unknown"`.
        var attributeNameType = isAttribute ? o.literal('unknown') : null;
        return {
            token: token,
            attributeNameType: attributeNameType,
            host: depObj.has('host') && depObj.getBoolean('host'),
            optional: depObj.has('optional') && depObj.getBoolean('optional'),
            self: depObj.has('self') && depObj.getBoolean('self'),
            skipSelf: depObj.has('skipSelf') && depObj.getBoolean('skipSelf'),
        };
    }
    exports.getDependency = getDependency;
    /**
     * Return an `R3ProviderExpression` that represents either the extracted type reference expression
     * from a `forwardRef` function call, or the type itself.
     *
     * For example, the expression `forwardRef(function() { return FooDir; })` returns `FooDir`. Note
     * that this expression is required to be wrapped in a closure, as otherwise the forward reference
     * would be resolved before initialization.
     *
     * If there is no forwardRef call expression then we just return the opaque type.
     */
    function extractForwardRef(expr) {
        if (!expr.isCallExpression()) {
            return (0, compiler_1.createR3ProviderExpression)(expr.getOpaque(), /* isForwardRef */ false);
        }
        var callee = expr.getCallee();
        if (callee.getSymbolName() !== 'forwardRef') {
            throw new fatal_linker_error_1.FatalLinkerError(callee.expression, 'Unsupported expression, expected a `forwardRef()` call or a type reference');
        }
        var args = expr.getArguments();
        if (args.length !== 1) {
            throw new fatal_linker_error_1.FatalLinkerError(expr, 'Unsupported `forwardRef(fn)` call, expected a single argument');
        }
        var wrapperFn = args[0];
        if (!wrapperFn.isFunction()) {
            throw new fatal_linker_error_1.FatalLinkerError(wrapperFn, 'Unsupported `forwardRef(fn)` call, expected its argument to be a function');
        }
        return (0, compiler_1.createR3ProviderExpression)(wrapperFn.getFunctionReturnValue().getOpaque(), true);
    }
    exports.extractForwardRef = extractForwardRef;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9saW5rZXIvc3JjL2ZpbGVfbGlua2VyL3BhcnRpYWxfbGlua2Vycy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFtSjtJQUNuSiwyREFBNkQ7SUFHN0QsMEZBQTBEO0lBRTFELFNBQWdCLGFBQWEsQ0FBYyxPQUF1QztRQUNoRixPQUFPLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFDLENBQUM7SUFDekMsQ0FBQztJQUZELHNDQUVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixTQUFTLENBQ3JCLEtBQXFDLEVBQUUsSUFBVztRQUNwRCxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDekMsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO1lBQ3ZCLE1BQU0sSUFBSSxxQ0FBZ0IsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLHNDQUFzQyxDQUFDLENBQUM7U0FDdEY7UUFDRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBK0IsQ0FBQyxDQUFDO1FBQ3hELElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRTtZQUMzQixNQUFNLElBQUkscUNBQWdCLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxnQ0FBOEIsSUFBTSxDQUFDLENBQUM7U0FDcEY7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBWEQsOEJBV0M7SUFFRDs7T0FFRztJQUNILFNBQWdCLGFBQWEsQ0FDekIsTUFBMkQ7UUFDN0QsSUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzlFLElBQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEMsNkZBQTZGO1FBQzdGLDZGQUE2RjtRQUM3RixnR0FBZ0c7UUFDaEcsa0dBQWtHO1FBQ2xHLHlGQUF5RjtRQUN6RixlQUFlO1FBQ2YsSUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNwRSxPQUFPO1lBQ0wsS0FBSyxPQUFBO1lBQ0wsaUJBQWlCLG1CQUFBO1lBQ2pCLElBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO1lBQ3JELFFBQVEsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1lBQ2pFLElBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO1lBQ3JELFFBQVEsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1NBQ2xFLENBQUM7SUFDSixDQUFDO0lBbkJELHNDQW1CQztJQUdEOzs7Ozs7Ozs7T0FTRztJQUNILFNBQWdCLGlCQUFpQixDQUFjLElBQW9DO1FBRWpGLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsRUFBRTtZQUM1QixPQUFPLElBQUEscUNBQTBCLEVBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQy9FO1FBRUQsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hDLElBQUksTUFBTSxDQUFDLGFBQWEsRUFBRSxLQUFLLFlBQVksRUFBRTtZQUMzQyxNQUFNLElBQUkscUNBQWdCLENBQ3RCLE1BQU0sQ0FBQyxVQUFVLEVBQ2pCLDRFQUE0RSxDQUFDLENBQUM7U0FDbkY7UUFFRCxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDakMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNyQixNQUFNLElBQUkscUNBQWdCLENBQ3RCLElBQUksRUFBRSwrREFBK0QsQ0FBQyxDQUFDO1NBQzVFO1FBRUQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBb0MsQ0FBQztRQUM3RCxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQzNCLE1BQU0sSUFBSSxxQ0FBZ0IsQ0FDdEIsU0FBUyxFQUFFLDJFQUEyRSxDQUFDLENBQUM7U0FDN0Y7UUFFRCxPQUFPLElBQUEscUNBQTBCLEVBQUMsU0FBUyxDQUFDLHNCQUFzQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQTFCRCw4Q0EwQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Y3JlYXRlUjNQcm92aWRlckV4cHJlc3Npb24sIFIzRGVjbGFyZURlcGVuZGVuY3lNZXRhZGF0YSwgUjNEZXBlbmRlbmN5TWV0YWRhdGEsIFIzUHJvdmlkZXJFeHByZXNzaW9uLCBSM1JlZmVyZW5jZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgbyBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvb3V0cHV0L291dHB1dF9hc3QnO1xuXG5pbXBvcnQge0FzdE9iamVjdCwgQXN0VmFsdWV9IGZyb20gJy4uLy4uL2FzdC9hc3RfdmFsdWUnO1xuaW1wb3J0IHtGYXRhbExpbmtlckVycm9yfSBmcm9tICcuLi8uLi9mYXRhbF9saW5rZXJfZXJyb3InO1xuXG5leHBvcnQgZnVuY3Rpb24gd3JhcFJlZmVyZW5jZTxURXhwcmVzc2lvbj4od3JhcHBlZDogby5XcmFwcGVkTm9kZUV4cHI8VEV4cHJlc3Npb24+KTogUjNSZWZlcmVuY2Uge1xuICByZXR1cm4ge3ZhbHVlOiB3cmFwcGVkLCB0eXBlOiB3cmFwcGVkfTtcbn1cblxuLyoqXG4gKiBQYXJzZXMgdGhlIHZhbHVlIG9mIGFuIGVudW0gZnJvbSB0aGUgQVNUIHZhbHVlJ3Mgc3ltYm9sIG5hbWUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUVudW08VEV4cHJlc3Npb24sIFRFbnVtPihcbiAgICB2YWx1ZTogQXN0VmFsdWU8dW5rbm93biwgVEV4cHJlc3Npb24+LCBFbnVtOiBURW51bSk6IFRFbnVtW2tleW9mIFRFbnVtXSB7XG4gIGNvbnN0IHN5bWJvbE5hbWUgPSB2YWx1ZS5nZXRTeW1ib2xOYW1lKCk7XG4gIGlmIChzeW1ib2xOYW1lID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IodmFsdWUuZXhwcmVzc2lvbiwgJ0V4cGVjdGVkIHZhbHVlIHRvIGhhdmUgYSBzeW1ib2wgbmFtZScpO1xuICB9XG4gIGNvbnN0IGVudW1WYWx1ZSA9IEVudW1bc3ltYm9sTmFtZSBhcyBrZXlvZiB0eXBlb2YgRW51bV07XG4gIGlmIChlbnVtVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKHZhbHVlLmV4cHJlc3Npb24sIGBVbnN1cHBvcnRlZCBlbnVtIHZhbHVlIGZvciAke0VudW19YCk7XG4gIH1cbiAgcmV0dXJuIGVudW1WYWx1ZTtcbn1cblxuLyoqXG4gKiBQYXJzZSBhIGRlcGVuZGVuY3kgc3RydWN0dXJlIGZyb20gYW4gQVNUIG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERlcGVuZGVuY3k8VEV4cHJlc3Npb24+KFxuICAgIGRlcE9iajogQXN0T2JqZWN0PFIzRGVjbGFyZURlcGVuZGVuY3lNZXRhZGF0YSwgVEV4cHJlc3Npb24+KTogUjNEZXBlbmRlbmN5TWV0YWRhdGEge1xuICBjb25zdCBpc0F0dHJpYnV0ZSA9IGRlcE9iai5oYXMoJ2F0dHJpYnV0ZScpICYmIGRlcE9iai5nZXRCb29sZWFuKCdhdHRyaWJ1dGUnKTtcbiAgY29uc3QgdG9rZW4gPSBkZXBPYmouZ2V0T3BhcXVlKCd0b2tlbicpO1xuICAvLyBOb3JtYWxseSBgYXR0cmlidXRlYCBpcyBhIHN0cmluZyBsaXRlcmFsIGFuZCBzbyBpdHMgYGF0dHJpYnV0ZU5hbWVUeXBlYCBpcyB0aGUgc2FtZSBzdHJpbmdcbiAgLy8gbGl0ZXJhbC4gSWYgdGhlIGBhdHRyaWJ1dGVgIGlzIHNvbWUgb3RoZXIgZXhwcmVzc2lvbiwgdGhlIGBhdHRyaWJ1dGVOYW1lVHlwZWAgd291bGQgYmUgdGhlXG4gIC8vIGB1bmtub3duYCB0eXBlLiBJdCBpcyBub3QgcG9zc2libGUgdG8gZ2VuZXJhdGUgdGhpcyB3aGVuIGxpbmtpbmcsIHNpbmNlIGl0IG9ubHkgZGVhbHMgd2l0aCBKU1xuICAvLyBhbmQgbm90IHR5cGluZ3MuIFdoZW4gbGlua2luZyB0aGUgZXhpc3RlbmNlIG9mIHRoZSBgYXR0cmlidXRlTmFtZVR5cGVgIG9ubHkgYWN0cyBhcyBhIG1hcmtlciB0b1xuICAvLyBjaGFuZ2UgdGhlIGluamVjdGlvbiBpbnN0cnVjdGlvbiB0aGF0IGlzIGdlbmVyYXRlZCwgc28gd2UganVzdCBwYXNzIHRoZSBsaXRlcmFsIHN0cmluZ1xuICAvLyBgXCJ1bmtub3duXCJgLlxuICBjb25zdCBhdHRyaWJ1dGVOYW1lVHlwZSA9IGlzQXR0cmlidXRlID8gby5saXRlcmFsKCd1bmtub3duJykgOiBudWxsO1xuICByZXR1cm4ge1xuICAgIHRva2VuLFxuICAgIGF0dHJpYnV0ZU5hbWVUeXBlLFxuICAgIGhvc3Q6IGRlcE9iai5oYXMoJ2hvc3QnKSAmJiBkZXBPYmouZ2V0Qm9vbGVhbignaG9zdCcpLFxuICAgIG9wdGlvbmFsOiBkZXBPYmouaGFzKCdvcHRpb25hbCcpICYmIGRlcE9iai5nZXRCb29sZWFuKCdvcHRpb25hbCcpLFxuICAgIHNlbGY6IGRlcE9iai5oYXMoJ3NlbGYnKSAmJiBkZXBPYmouZ2V0Qm9vbGVhbignc2VsZicpLFxuICAgIHNraXBTZWxmOiBkZXBPYmouaGFzKCdza2lwU2VsZicpICYmIGRlcE9iai5nZXRCb29sZWFuKCdza2lwU2VsZicpLFxuICB9O1xufVxuXG5cbi8qKlxuICogUmV0dXJuIGFuIGBSM1Byb3ZpZGVyRXhwcmVzc2lvbmAgdGhhdCByZXByZXNlbnRzIGVpdGhlciB0aGUgZXh0cmFjdGVkIHR5cGUgcmVmZXJlbmNlIGV4cHJlc3Npb25cbiAqIGZyb20gYSBgZm9yd2FyZFJlZmAgZnVuY3Rpb24gY2FsbCwgb3IgdGhlIHR5cGUgaXRzZWxmLlxuICpcbiAqIEZvciBleGFtcGxlLCB0aGUgZXhwcmVzc2lvbiBgZm9yd2FyZFJlZihmdW5jdGlvbigpIHsgcmV0dXJuIEZvb0RpcjsgfSlgIHJldHVybnMgYEZvb0RpcmAuIE5vdGVcbiAqIHRoYXQgdGhpcyBleHByZXNzaW9uIGlzIHJlcXVpcmVkIHRvIGJlIHdyYXBwZWQgaW4gYSBjbG9zdXJlLCBhcyBvdGhlcndpc2UgdGhlIGZvcndhcmQgcmVmZXJlbmNlXG4gKiB3b3VsZCBiZSByZXNvbHZlZCBiZWZvcmUgaW5pdGlhbGl6YXRpb24uXG4gKlxuICogSWYgdGhlcmUgaXMgbm8gZm9yd2FyZFJlZiBjYWxsIGV4cHJlc3Npb24gdGhlbiB3ZSBqdXN0IHJldHVybiB0aGUgb3BhcXVlIHR5cGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0Rm9yd2FyZFJlZjxURXhwcmVzc2lvbj4oZXhwcjogQXN0VmFsdWU8dW5rbm93biwgVEV4cHJlc3Npb24+KTpcbiAgICBSM1Byb3ZpZGVyRXhwcmVzc2lvbjxvLldyYXBwZWROb2RlRXhwcjxURXhwcmVzc2lvbj4+IHtcbiAgaWYgKCFleHByLmlzQ2FsbEV4cHJlc3Npb24oKSkge1xuICAgIHJldHVybiBjcmVhdGVSM1Byb3ZpZGVyRXhwcmVzc2lvbihleHByLmdldE9wYXF1ZSgpLCAvKiBpc0ZvcndhcmRSZWYgKi8gZmFsc2UpO1xuICB9XG5cbiAgY29uc3QgY2FsbGVlID0gZXhwci5nZXRDYWxsZWUoKTtcbiAgaWYgKGNhbGxlZS5nZXRTeW1ib2xOYW1lKCkgIT09ICdmb3J3YXJkUmVmJykge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICBjYWxsZWUuZXhwcmVzc2lvbixcbiAgICAgICAgJ1Vuc3VwcG9ydGVkIGV4cHJlc3Npb24sIGV4cGVjdGVkIGEgYGZvcndhcmRSZWYoKWAgY2FsbCBvciBhIHR5cGUgcmVmZXJlbmNlJyk7XG4gIH1cblxuICBjb25zdCBhcmdzID0gZXhwci5nZXRBcmd1bWVudHMoKTtcbiAgaWYgKGFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoXG4gICAgICAgIGV4cHIsICdVbnN1cHBvcnRlZCBgZm9yd2FyZFJlZihmbilgIGNhbGwsIGV4cGVjdGVkIGEgc2luZ2xlIGFyZ3VtZW50Jyk7XG4gIH1cblxuICBjb25zdCB3cmFwcGVyRm4gPSBhcmdzWzBdIGFzIEFzdFZhbHVlPEZ1bmN0aW9uLCBURXhwcmVzc2lvbj47XG4gIGlmICghd3JhcHBlckZuLmlzRnVuY3Rpb24oKSkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICB3cmFwcGVyRm4sICdVbnN1cHBvcnRlZCBgZm9yd2FyZFJlZihmbilgIGNhbGwsIGV4cGVjdGVkIGl0cyBhcmd1bWVudCB0byBiZSBhIGZ1bmN0aW9uJyk7XG4gIH1cblxuICByZXR1cm4gY3JlYXRlUjNQcm92aWRlckV4cHJlc3Npb24od3JhcHBlckZuLmdldEZ1bmN0aW9uUmV0dXJuVmFsdWUoKS5nZXRPcGFxdWUoKSwgdHJ1ZSk7XG59XG4iXX0=