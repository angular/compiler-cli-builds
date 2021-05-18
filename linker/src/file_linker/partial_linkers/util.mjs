/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createR3ProviderExpression } from '@angular/compiler';
import * as o from '@angular/compiler/src/output/output_ast';
import { FatalLinkerError } from '../../fatal_linker_error';
export function wrapReference(wrapped) {
    return { value: wrapped, type: wrapped };
}
/**
 * Parses the value of an enum from the AST value's symbol name.
 */
export function parseEnum(value, Enum) {
    const symbolName = value.getSymbolName();
    if (symbolName === null) {
        throw new FatalLinkerError(value.expression, 'Expected value to have a symbol name');
    }
    const enumValue = Enum[symbolName];
    if (enumValue === undefined) {
        throw new FatalLinkerError(value.expression, `Unsupported enum value for ${Enum}`);
    }
    return enumValue;
}
/**
 * Parse a dependency structure from an AST object.
 */
export function getDependency(depObj) {
    const isAttribute = depObj.has('attribute') && depObj.getBoolean('attribute');
    const token = depObj.getOpaque('token');
    // Normally `attribute` is a string literal and so its `attributeNameType` is the same string
    // literal. If the `attribute` is some other expression, the `attributeNameType` would be the
    // `unknown` type. It is not possible to generate this when linking, since it only deals with JS
    // and not typings. When linking the existence of the `attributeNameType` only acts as a marker to
    // change the injection instruction that is generated, so we just pass the literal string
    // `"unknown"`.
    const attributeNameType = isAttribute ? o.literal('unknown') : null;
    return {
        token,
        attributeNameType,
        host: depObj.has('host') && depObj.getBoolean('host'),
        optional: depObj.has('optional') && depObj.getBoolean('optional'),
        self: depObj.has('self') && depObj.getBoolean('self'),
        skipSelf: depObj.has('skipSelf') && depObj.getBoolean('skipSelf'),
    };
}
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
export function extractForwardRef(expr) {
    if (!expr.isCallExpression()) {
        return createR3ProviderExpression(expr.getOpaque(), /* isForwardRef */ false);
    }
    const callee = expr.getCallee();
    if (callee.getSymbolName() !== 'forwardRef') {
        throw new FatalLinkerError(callee.expression, 'Unsupported expression, expected a `forwardRef()` call or a type reference');
    }
    const args = expr.getArguments();
    if (args.length !== 1) {
        throw new FatalLinkerError(expr, 'Unsupported `forwardRef(fn)` call, expected a single argument');
    }
    const wrapperFn = args[0];
    if (!wrapperFn.isFunction()) {
        throw new FatalLinkerError(wrapperFn, 'Unsupported `forwardRef(fn)` call, expected its argument to be a function');
    }
    return createR3ProviderExpression(wrapperFn.getFunctionReturnValue().getOpaque(), true);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9saW5rZXIvc3JjL2ZpbGVfbGlua2VyL3BhcnRpYWxfbGlua2Vycy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUNILE9BQU8sRUFBQywwQkFBMEIsRUFBdUYsTUFBTSxtQkFBbUIsQ0FBQztBQUNuSixPQUFPLEtBQUssQ0FBQyxNQUFNLHlDQUF5QyxDQUFDO0FBRzdELE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBRTFELE1BQU0sVUFBVSxhQUFhLENBQWMsT0FBdUM7SUFDaEYsT0FBTyxFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBQyxDQUFDO0FBQ3pDLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxTQUFTLENBQ3JCLEtBQXFDLEVBQUUsSUFBVztJQUNwRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDekMsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO1FBQ3ZCLE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLHNDQUFzQyxDQUFDLENBQUM7S0FDdEY7SUFDRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBK0IsQ0FBQyxDQUFDO0lBQ3hELElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRTtRQUMzQixNQUFNLElBQUksZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSw4QkFBOEIsSUFBSSxFQUFFLENBQUMsQ0FBQztLQUNwRjtJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxhQUFhLENBQ3pCLE1BQTJEO0lBQzdELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM5RSxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3hDLDZGQUE2RjtJQUM3Riw2RkFBNkY7SUFDN0YsZ0dBQWdHO0lBQ2hHLGtHQUFrRztJQUNsRyx5RkFBeUY7SUFDekYsZUFBZTtJQUNmLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDcEUsT0FBTztRQUNMLEtBQUs7UUFDTCxpQkFBaUI7UUFDakIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7UUFDckQsUUFBUSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7UUFDakUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7UUFDckQsUUFBUSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7S0FDbEUsQ0FBQztBQUNKLENBQUM7QUFHRDs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQWMsSUFBb0M7SUFFakYsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFO1FBQzVCLE9BQU8sMEJBQTBCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQy9FO0lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2hDLElBQUksTUFBTSxDQUFDLGFBQWEsRUFBRSxLQUFLLFlBQVksRUFBRTtRQUMzQyxNQUFNLElBQUksZ0JBQWdCLENBQ3RCLE1BQU0sQ0FBQyxVQUFVLEVBQ2pCLDRFQUE0RSxDQUFDLENBQUM7S0FDbkY7SUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDakMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUNyQixNQUFNLElBQUksZ0JBQWdCLENBQ3RCLElBQUksRUFBRSwrREFBK0QsQ0FBQyxDQUFDO0tBQzVFO0lBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBb0MsQ0FBQztJQUM3RCxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxFQUFFO1FBQzNCLE1BQU0sSUFBSSxnQkFBZ0IsQ0FDdEIsU0FBUyxFQUFFLDJFQUEyRSxDQUFDLENBQUM7S0FDN0Y7SUFFRCxPQUFPLDBCQUEwQixDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzFGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Y3JlYXRlUjNQcm92aWRlckV4cHJlc3Npb24sIFIzRGVjbGFyZURlcGVuZGVuY3lNZXRhZGF0YSwgUjNEZXBlbmRlbmN5TWV0YWRhdGEsIFIzUHJvdmlkZXJFeHByZXNzaW9uLCBSM1JlZmVyZW5jZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgbyBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvb3V0cHV0L291dHB1dF9hc3QnO1xuXG5pbXBvcnQge0FzdE9iamVjdCwgQXN0VmFsdWV9IGZyb20gJy4uLy4uL2FzdC9hc3RfdmFsdWUnO1xuaW1wb3J0IHtGYXRhbExpbmtlckVycm9yfSBmcm9tICcuLi8uLi9mYXRhbF9saW5rZXJfZXJyb3InO1xuXG5leHBvcnQgZnVuY3Rpb24gd3JhcFJlZmVyZW5jZTxURXhwcmVzc2lvbj4od3JhcHBlZDogby5XcmFwcGVkTm9kZUV4cHI8VEV4cHJlc3Npb24+KTogUjNSZWZlcmVuY2Uge1xuICByZXR1cm4ge3ZhbHVlOiB3cmFwcGVkLCB0eXBlOiB3cmFwcGVkfTtcbn1cblxuLyoqXG4gKiBQYXJzZXMgdGhlIHZhbHVlIG9mIGFuIGVudW0gZnJvbSB0aGUgQVNUIHZhbHVlJ3Mgc3ltYm9sIG5hbWUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUVudW08VEV4cHJlc3Npb24sIFRFbnVtPihcbiAgICB2YWx1ZTogQXN0VmFsdWU8dW5rbm93biwgVEV4cHJlc3Npb24+LCBFbnVtOiBURW51bSk6IFRFbnVtW2tleW9mIFRFbnVtXSB7XG4gIGNvbnN0IHN5bWJvbE5hbWUgPSB2YWx1ZS5nZXRTeW1ib2xOYW1lKCk7XG4gIGlmIChzeW1ib2xOYW1lID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IodmFsdWUuZXhwcmVzc2lvbiwgJ0V4cGVjdGVkIHZhbHVlIHRvIGhhdmUgYSBzeW1ib2wgbmFtZScpO1xuICB9XG4gIGNvbnN0IGVudW1WYWx1ZSA9IEVudW1bc3ltYm9sTmFtZSBhcyBrZXlvZiB0eXBlb2YgRW51bV07XG4gIGlmIChlbnVtVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKHZhbHVlLmV4cHJlc3Npb24sIGBVbnN1cHBvcnRlZCBlbnVtIHZhbHVlIGZvciAke0VudW19YCk7XG4gIH1cbiAgcmV0dXJuIGVudW1WYWx1ZTtcbn1cblxuLyoqXG4gKiBQYXJzZSBhIGRlcGVuZGVuY3kgc3RydWN0dXJlIGZyb20gYW4gQVNUIG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERlcGVuZGVuY3k8VEV4cHJlc3Npb24+KFxuICAgIGRlcE9iajogQXN0T2JqZWN0PFIzRGVjbGFyZURlcGVuZGVuY3lNZXRhZGF0YSwgVEV4cHJlc3Npb24+KTogUjNEZXBlbmRlbmN5TWV0YWRhdGEge1xuICBjb25zdCBpc0F0dHJpYnV0ZSA9IGRlcE9iai5oYXMoJ2F0dHJpYnV0ZScpICYmIGRlcE9iai5nZXRCb29sZWFuKCdhdHRyaWJ1dGUnKTtcbiAgY29uc3QgdG9rZW4gPSBkZXBPYmouZ2V0T3BhcXVlKCd0b2tlbicpO1xuICAvLyBOb3JtYWxseSBgYXR0cmlidXRlYCBpcyBhIHN0cmluZyBsaXRlcmFsIGFuZCBzbyBpdHMgYGF0dHJpYnV0ZU5hbWVUeXBlYCBpcyB0aGUgc2FtZSBzdHJpbmdcbiAgLy8gbGl0ZXJhbC4gSWYgdGhlIGBhdHRyaWJ1dGVgIGlzIHNvbWUgb3RoZXIgZXhwcmVzc2lvbiwgdGhlIGBhdHRyaWJ1dGVOYW1lVHlwZWAgd291bGQgYmUgdGhlXG4gIC8vIGB1bmtub3duYCB0eXBlLiBJdCBpcyBub3QgcG9zc2libGUgdG8gZ2VuZXJhdGUgdGhpcyB3aGVuIGxpbmtpbmcsIHNpbmNlIGl0IG9ubHkgZGVhbHMgd2l0aCBKU1xuICAvLyBhbmQgbm90IHR5cGluZ3MuIFdoZW4gbGlua2luZyB0aGUgZXhpc3RlbmNlIG9mIHRoZSBgYXR0cmlidXRlTmFtZVR5cGVgIG9ubHkgYWN0cyBhcyBhIG1hcmtlciB0b1xuICAvLyBjaGFuZ2UgdGhlIGluamVjdGlvbiBpbnN0cnVjdGlvbiB0aGF0IGlzIGdlbmVyYXRlZCwgc28gd2UganVzdCBwYXNzIHRoZSBsaXRlcmFsIHN0cmluZ1xuICAvLyBgXCJ1bmtub3duXCJgLlxuICBjb25zdCBhdHRyaWJ1dGVOYW1lVHlwZSA9IGlzQXR0cmlidXRlID8gby5saXRlcmFsKCd1bmtub3duJykgOiBudWxsO1xuICByZXR1cm4ge1xuICAgIHRva2VuLFxuICAgIGF0dHJpYnV0ZU5hbWVUeXBlLFxuICAgIGhvc3Q6IGRlcE9iai5oYXMoJ2hvc3QnKSAmJiBkZXBPYmouZ2V0Qm9vbGVhbignaG9zdCcpLFxuICAgIG9wdGlvbmFsOiBkZXBPYmouaGFzKCdvcHRpb25hbCcpICYmIGRlcE9iai5nZXRCb29sZWFuKCdvcHRpb25hbCcpLFxuICAgIHNlbGY6IGRlcE9iai5oYXMoJ3NlbGYnKSAmJiBkZXBPYmouZ2V0Qm9vbGVhbignc2VsZicpLFxuICAgIHNraXBTZWxmOiBkZXBPYmouaGFzKCdza2lwU2VsZicpICYmIGRlcE9iai5nZXRCb29sZWFuKCdza2lwU2VsZicpLFxuICB9O1xufVxuXG5cbi8qKlxuICogUmV0dXJuIGFuIGBSM1Byb3ZpZGVyRXhwcmVzc2lvbmAgdGhhdCByZXByZXNlbnRzIGVpdGhlciB0aGUgZXh0cmFjdGVkIHR5cGUgcmVmZXJlbmNlIGV4cHJlc3Npb25cbiAqIGZyb20gYSBgZm9yd2FyZFJlZmAgZnVuY3Rpb24gY2FsbCwgb3IgdGhlIHR5cGUgaXRzZWxmLlxuICpcbiAqIEZvciBleGFtcGxlLCB0aGUgZXhwcmVzc2lvbiBgZm9yd2FyZFJlZihmdW5jdGlvbigpIHsgcmV0dXJuIEZvb0RpcjsgfSlgIHJldHVybnMgYEZvb0RpcmAuIE5vdGVcbiAqIHRoYXQgdGhpcyBleHByZXNzaW9uIGlzIHJlcXVpcmVkIHRvIGJlIHdyYXBwZWQgaW4gYSBjbG9zdXJlLCBhcyBvdGhlcndpc2UgdGhlIGZvcndhcmQgcmVmZXJlbmNlXG4gKiB3b3VsZCBiZSByZXNvbHZlZCBiZWZvcmUgaW5pdGlhbGl6YXRpb24uXG4gKlxuICogSWYgdGhlcmUgaXMgbm8gZm9yd2FyZFJlZiBjYWxsIGV4cHJlc3Npb24gdGhlbiB3ZSBqdXN0IHJldHVybiB0aGUgb3BhcXVlIHR5cGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0Rm9yd2FyZFJlZjxURXhwcmVzc2lvbj4oZXhwcjogQXN0VmFsdWU8dW5rbm93biwgVEV4cHJlc3Npb24+KTpcbiAgICBSM1Byb3ZpZGVyRXhwcmVzc2lvbjxvLldyYXBwZWROb2RlRXhwcjxURXhwcmVzc2lvbj4+IHtcbiAgaWYgKCFleHByLmlzQ2FsbEV4cHJlc3Npb24oKSkge1xuICAgIHJldHVybiBjcmVhdGVSM1Byb3ZpZGVyRXhwcmVzc2lvbihleHByLmdldE9wYXF1ZSgpLCAvKiBpc0ZvcndhcmRSZWYgKi8gZmFsc2UpO1xuICB9XG5cbiAgY29uc3QgY2FsbGVlID0gZXhwci5nZXRDYWxsZWUoKTtcbiAgaWYgKGNhbGxlZS5nZXRTeW1ib2xOYW1lKCkgIT09ICdmb3J3YXJkUmVmJykge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICBjYWxsZWUuZXhwcmVzc2lvbixcbiAgICAgICAgJ1Vuc3VwcG9ydGVkIGV4cHJlc3Npb24sIGV4cGVjdGVkIGEgYGZvcndhcmRSZWYoKWAgY2FsbCBvciBhIHR5cGUgcmVmZXJlbmNlJyk7XG4gIH1cblxuICBjb25zdCBhcmdzID0gZXhwci5nZXRBcmd1bWVudHMoKTtcbiAgaWYgKGFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoXG4gICAgICAgIGV4cHIsICdVbnN1cHBvcnRlZCBgZm9yd2FyZFJlZihmbilgIGNhbGwsIGV4cGVjdGVkIGEgc2luZ2xlIGFyZ3VtZW50Jyk7XG4gIH1cblxuICBjb25zdCB3cmFwcGVyRm4gPSBhcmdzWzBdIGFzIEFzdFZhbHVlPEZ1bmN0aW9uLCBURXhwcmVzc2lvbj47XG4gIGlmICghd3JhcHBlckZuLmlzRnVuY3Rpb24oKSkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICB3cmFwcGVyRm4sICdVbnN1cHBvcnRlZCBgZm9yd2FyZFJlZihmbilgIGNhbGwsIGV4cGVjdGVkIGl0cyBhcmd1bWVudCB0byBiZSBhIGZ1bmN0aW9uJyk7XG4gIH1cblxuICByZXR1cm4gY3JlYXRlUjNQcm92aWRlckV4cHJlc3Npb24od3JhcHBlckZuLmdldEZ1bmN0aW9uUmV0dXJuVmFsdWUoKS5nZXRPcGFxdWUoKSwgdHJ1ZSk7XG59XG4iXX0=