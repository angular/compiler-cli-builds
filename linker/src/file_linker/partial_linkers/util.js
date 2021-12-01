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
            return compiler_1.createMayBeForwardRefExpression(expr.getOpaque(), 0 /* None */);
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
        return compiler_1.createMayBeForwardRefExpression(wrapperFn.getFunctionReturnValue().getOpaque(), 2 /* Unwrapped */);
    }
    exports.extractForwardRef = extractForwardRef;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9saW5rZXIvc3JjL2ZpbGVfbGlua2VyL3BhcnRpYWxfbGlua2Vycy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFpTDtJQUNqTCwyREFBNkQ7SUFHN0QsMEZBQTBEO0lBRTFELFNBQWdCLGFBQWEsQ0FBYyxPQUF1QztRQUNoRixPQUFPLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFDLENBQUM7SUFDekMsQ0FBQztJQUZELHNDQUVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixTQUFTLENBQ3JCLEtBQXFDLEVBQUUsSUFBVztRQUNwRCxJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDekMsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO1lBQ3ZCLE1BQU0sSUFBSSxxQ0FBZ0IsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLHNDQUFzQyxDQUFDLENBQUM7U0FDdEY7UUFDRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBK0IsQ0FBQyxDQUFDO1FBQ3hELElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRTtZQUMzQixNQUFNLElBQUkscUNBQWdCLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxnQ0FBOEIsSUFBTSxDQUFDLENBQUM7U0FDcEY7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBWEQsOEJBV0M7SUFFRDs7T0FFRztJQUNILFNBQWdCLGFBQWEsQ0FDekIsTUFBMkQ7UUFDN0QsSUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzlFLElBQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEMsNkZBQTZGO1FBQzdGLDZGQUE2RjtRQUM3RixnR0FBZ0c7UUFDaEcsa0dBQWtHO1FBQ2xHLHlGQUF5RjtRQUN6RixlQUFlO1FBQ2YsSUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNwRSxPQUFPO1lBQ0wsS0FBSyxPQUFBO1lBQ0wsaUJBQWlCLG1CQUFBO1lBQ2pCLElBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO1lBQ3JELFFBQVEsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1lBQ2pFLElBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO1lBQ3JELFFBQVEsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1NBQ2xFLENBQUM7SUFDSixDQUFDO0lBbkJELHNDQW1CQztJQUdEOzs7Ozs7Ozs7T0FTRztJQUNILFNBQWdCLGlCQUFpQixDQUFjLElBQW9DO1FBRWpGLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsRUFBRTtZQUM1QixPQUFPLDBDQUErQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsZUFBMEIsQ0FBQztTQUNuRjtRQUVELElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQyxJQUFJLE1BQU0sQ0FBQyxhQUFhLEVBQUUsS0FBSyxZQUFZLEVBQUU7WUFDM0MsTUFBTSxJQUFJLHFDQUFnQixDQUN0QixNQUFNLENBQUMsVUFBVSxFQUNqQiw0RUFBNEUsQ0FBQyxDQUFDO1NBQ25GO1FBRUQsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ2pDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDckIsTUFBTSxJQUFJLHFDQUFnQixDQUN0QixJQUFJLEVBQUUsK0RBQStELENBQUMsQ0FBQztTQUM1RTtRQUVELElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQW9DLENBQUM7UUFDN0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUMzQixNQUFNLElBQUkscUNBQWdCLENBQ3RCLFNBQVMsRUFBRSwyRUFBMkUsQ0FBQyxDQUFDO1NBQzdGO1FBRUQsT0FBTywwQ0FBK0IsQ0FDbEMsU0FBUyxDQUFDLHNCQUFzQixFQUFFLENBQUMsU0FBUyxFQUFFLG9CQUErQixDQUFDO0lBQ3BGLENBQUM7SUEzQkQsOENBMkJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2NyZWF0ZU1heUJlRm9yd2FyZFJlZkV4cHJlc3Npb24sIEZvcndhcmRSZWZIYW5kbGluZywgTWF5YmVGb3J3YXJkUmVmRXhwcmVzc2lvbiwgUjNEZWNsYXJlRGVwZW5kZW5jeU1ldGFkYXRhLCBSM0RlcGVuZGVuY3lNZXRhZGF0YSwgUjNSZWZlcmVuY2V9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIG8gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL291dHB1dC9vdXRwdXRfYXN0JztcblxuaW1wb3J0IHtBc3RPYmplY3QsIEFzdFZhbHVlfSBmcm9tICcuLi8uLi9hc3QvYXN0X3ZhbHVlJztcbmltcG9ydCB7RmF0YWxMaW5rZXJFcnJvcn0gZnJvbSAnLi4vLi4vZmF0YWxfbGlua2VyX2Vycm9yJztcblxuZXhwb3J0IGZ1bmN0aW9uIHdyYXBSZWZlcmVuY2U8VEV4cHJlc3Npb24+KHdyYXBwZWQ6IG8uV3JhcHBlZE5vZGVFeHByPFRFeHByZXNzaW9uPik6IFIzUmVmZXJlbmNlIHtcbiAgcmV0dXJuIHt2YWx1ZTogd3JhcHBlZCwgdHlwZTogd3JhcHBlZH07XG59XG5cbi8qKlxuICogUGFyc2VzIHRoZSB2YWx1ZSBvZiBhbiBlbnVtIGZyb20gdGhlIEFTVCB2YWx1ZSdzIHN5bWJvbCBuYW1lLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VFbnVtPFRFeHByZXNzaW9uLCBURW51bT4oXG4gICAgdmFsdWU6IEFzdFZhbHVlPHVua25vd24sIFRFeHByZXNzaW9uPiwgRW51bTogVEVudW0pOiBURW51bVtrZXlvZiBURW51bV0ge1xuICBjb25zdCBzeW1ib2xOYW1lID0gdmFsdWUuZ2V0U3ltYm9sTmFtZSgpO1xuICBpZiAoc3ltYm9sTmFtZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKHZhbHVlLmV4cHJlc3Npb24sICdFeHBlY3RlZCB2YWx1ZSB0byBoYXZlIGEgc3ltYm9sIG5hbWUnKTtcbiAgfVxuICBjb25zdCBlbnVtVmFsdWUgPSBFbnVtW3N5bWJvbE5hbWUgYXMga2V5b2YgdHlwZW9mIEVudW1dO1xuICBpZiAoZW51bVZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcih2YWx1ZS5leHByZXNzaW9uLCBgVW5zdXBwb3J0ZWQgZW51bSB2YWx1ZSBmb3IgJHtFbnVtfWApO1xuICB9XG4gIHJldHVybiBlbnVtVmFsdWU7XG59XG5cbi8qKlxuICogUGFyc2UgYSBkZXBlbmRlbmN5IHN0cnVjdHVyZSBmcm9tIGFuIEFTVCBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREZXBlbmRlbmN5PFRFeHByZXNzaW9uPihcbiAgICBkZXBPYmo6IEFzdE9iamVjdDxSM0RlY2xhcmVEZXBlbmRlbmN5TWV0YWRhdGEsIFRFeHByZXNzaW9uPik6IFIzRGVwZW5kZW5jeU1ldGFkYXRhIHtcbiAgY29uc3QgaXNBdHRyaWJ1dGUgPSBkZXBPYmouaGFzKCdhdHRyaWJ1dGUnKSAmJiBkZXBPYmouZ2V0Qm9vbGVhbignYXR0cmlidXRlJyk7XG4gIGNvbnN0IHRva2VuID0gZGVwT2JqLmdldE9wYXF1ZSgndG9rZW4nKTtcbiAgLy8gTm9ybWFsbHkgYGF0dHJpYnV0ZWAgaXMgYSBzdHJpbmcgbGl0ZXJhbCBhbmQgc28gaXRzIGBhdHRyaWJ1dGVOYW1lVHlwZWAgaXMgdGhlIHNhbWUgc3RyaW5nXG4gIC8vIGxpdGVyYWwuIElmIHRoZSBgYXR0cmlidXRlYCBpcyBzb21lIG90aGVyIGV4cHJlc3Npb24sIHRoZSBgYXR0cmlidXRlTmFtZVR5cGVgIHdvdWxkIGJlIHRoZVxuICAvLyBgdW5rbm93bmAgdHlwZS4gSXQgaXMgbm90IHBvc3NpYmxlIHRvIGdlbmVyYXRlIHRoaXMgd2hlbiBsaW5raW5nLCBzaW5jZSBpdCBvbmx5IGRlYWxzIHdpdGggSlNcbiAgLy8gYW5kIG5vdCB0eXBpbmdzLiBXaGVuIGxpbmtpbmcgdGhlIGV4aXN0ZW5jZSBvZiB0aGUgYGF0dHJpYnV0ZU5hbWVUeXBlYCBvbmx5IGFjdHMgYXMgYSBtYXJrZXIgdG9cbiAgLy8gY2hhbmdlIHRoZSBpbmplY3Rpb24gaW5zdHJ1Y3Rpb24gdGhhdCBpcyBnZW5lcmF0ZWQsIHNvIHdlIGp1c3QgcGFzcyB0aGUgbGl0ZXJhbCBzdHJpbmdcbiAgLy8gYFwidW5rbm93blwiYC5cbiAgY29uc3QgYXR0cmlidXRlTmFtZVR5cGUgPSBpc0F0dHJpYnV0ZSA/IG8ubGl0ZXJhbCgndW5rbm93bicpIDogbnVsbDtcbiAgcmV0dXJuIHtcbiAgICB0b2tlbixcbiAgICBhdHRyaWJ1dGVOYW1lVHlwZSxcbiAgICBob3N0OiBkZXBPYmouaGFzKCdob3N0JykgJiYgZGVwT2JqLmdldEJvb2xlYW4oJ2hvc3QnKSxcbiAgICBvcHRpb25hbDogZGVwT2JqLmhhcygnb3B0aW9uYWwnKSAmJiBkZXBPYmouZ2V0Qm9vbGVhbignb3B0aW9uYWwnKSxcbiAgICBzZWxmOiBkZXBPYmouaGFzKCdzZWxmJykgJiYgZGVwT2JqLmdldEJvb2xlYW4oJ3NlbGYnKSxcbiAgICBza2lwU2VsZjogZGVwT2JqLmhhcygnc2tpcFNlbGYnKSAmJiBkZXBPYmouZ2V0Qm9vbGVhbignc2tpcFNlbGYnKSxcbiAgfTtcbn1cblxuXG4vKipcbiAqIFJldHVybiBhbiBgUjNQcm92aWRlckV4cHJlc3Npb25gIHRoYXQgcmVwcmVzZW50cyBlaXRoZXIgdGhlIGV4dHJhY3RlZCB0eXBlIHJlZmVyZW5jZSBleHByZXNzaW9uXG4gKiBmcm9tIGEgYGZvcndhcmRSZWZgIGZ1bmN0aW9uIGNhbGwsIG9yIHRoZSB0eXBlIGl0c2VsZi5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGV4cHJlc3Npb24gYGZvcndhcmRSZWYoZnVuY3Rpb24oKSB7IHJldHVybiBGb29EaXI7IH0pYCByZXR1cm5zIGBGb29EaXJgLiBOb3RlXG4gKiB0aGF0IHRoaXMgZXhwcmVzc2lvbiBpcyByZXF1aXJlZCB0byBiZSB3cmFwcGVkIGluIGEgY2xvc3VyZSwgYXMgb3RoZXJ3aXNlIHRoZSBmb3J3YXJkIHJlZmVyZW5jZVxuICogd291bGQgYmUgcmVzb2x2ZWQgYmVmb3JlIGluaXRpYWxpemF0aW9uLlxuICpcbiAqIElmIHRoZXJlIGlzIG5vIGZvcndhcmRSZWYgY2FsbCBleHByZXNzaW9uIHRoZW4gd2UganVzdCByZXR1cm4gdGhlIG9wYXF1ZSB0eXBlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEZvcndhcmRSZWY8VEV4cHJlc3Npb24+KGV4cHI6IEFzdFZhbHVlPHVua25vd24sIFRFeHByZXNzaW9uPik6XG4gICAgTWF5YmVGb3J3YXJkUmVmRXhwcmVzc2lvbjxvLldyYXBwZWROb2RlRXhwcjxURXhwcmVzc2lvbj4+IHtcbiAgaWYgKCFleHByLmlzQ2FsbEV4cHJlc3Npb24oKSkge1xuICAgIHJldHVybiBjcmVhdGVNYXlCZUZvcndhcmRSZWZFeHByZXNzaW9uKGV4cHIuZ2V0T3BhcXVlKCksIEZvcndhcmRSZWZIYW5kbGluZy5Ob25lKTtcbiAgfVxuXG4gIGNvbnN0IGNhbGxlZSA9IGV4cHIuZ2V0Q2FsbGVlKCk7XG4gIGlmIChjYWxsZWUuZ2V0U3ltYm9sTmFtZSgpICE9PSAnZm9yd2FyZFJlZicpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgY2FsbGVlLmV4cHJlc3Npb24sXG4gICAgICAgICdVbnN1cHBvcnRlZCBleHByZXNzaW9uLCBleHBlY3RlZCBhIGBmb3J3YXJkUmVmKClgIGNhbGwgb3IgYSB0eXBlIHJlZmVyZW5jZScpO1xuICB9XG5cbiAgY29uc3QgYXJncyA9IGV4cHIuZ2V0QXJndW1lbnRzKCk7XG4gIGlmIChhcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICBleHByLCAnVW5zdXBwb3J0ZWQgYGZvcndhcmRSZWYoZm4pYCBjYWxsLCBleHBlY3RlZCBhIHNpbmdsZSBhcmd1bWVudCcpO1xuICB9XG5cbiAgY29uc3Qgd3JhcHBlckZuID0gYXJnc1swXSBhcyBBc3RWYWx1ZTxGdW5jdGlvbiwgVEV4cHJlc3Npb24+O1xuICBpZiAoIXdyYXBwZXJGbi5pc0Z1bmN0aW9uKCkpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgd3JhcHBlckZuLCAnVW5zdXBwb3J0ZWQgYGZvcndhcmRSZWYoZm4pYCBjYWxsLCBleHBlY3RlZCBpdHMgYXJndW1lbnQgdG8gYmUgYSBmdW5jdGlvbicpO1xuICB9XG5cbiAgcmV0dXJuIGNyZWF0ZU1heUJlRm9yd2FyZFJlZkV4cHJlc3Npb24oXG4gICAgICB3cmFwcGVyRm4uZ2V0RnVuY3Rpb25SZXR1cm5WYWx1ZSgpLmdldE9wYXF1ZSgpLCBGb3J3YXJkUmVmSGFuZGxpbmcuVW53cmFwcGVkKTtcbn1cbiJdfQ==