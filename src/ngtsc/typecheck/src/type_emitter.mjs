/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { Reference } from '../../imports';
/**
 * Determines whether the provided type can be emitted, which means that it can be safely emitted
 * into a different location.
 *
 * If this function returns true, a `TypeEmitter` should be able to succeed. Vice versa, if this
 * function returns false, then using the `TypeEmitter` should not be attempted as it is known to
 * fail.
 */
export function canEmitType(type, resolver) {
    return canEmitTypeWorker(type);
    function canEmitTypeWorker(type) {
        return visitTypeNode(type, {
            visitTypeReferenceNode: type => canEmitTypeReference(type),
            visitArrayTypeNode: type => canEmitTypeWorker(type.elementType),
            visitKeywordType: () => true,
            visitLiteralType: () => true,
            visitOtherType: () => false,
        });
    }
    function canEmitTypeReference(type) {
        const reference = resolver(type);
        // If the type could not be resolved, it can not be emitted.
        if (reference === null) {
            return false;
        }
        // If the type is a reference without a owning module, consider the type not to be eligible for
        // emitting.
        if (reference instanceof Reference && !reference.hasOwningModuleGuess) {
            return false;
        }
        // The type can be emitted if either it does not have any type arguments, or all of them can be
        // emitted.
        return type.typeArguments === undefined || type.typeArguments.every(canEmitTypeWorker);
    }
}
/**
 * Given a `ts.TypeNode`, this class derives an equivalent `ts.TypeNode` that has been emitted into
 * a different context.
 *
 * For example, consider the following code:
 *
 * ```
 * import {NgIterable} from '@angular/core';
 *
 * class NgForOf<T, U extends NgIterable<T>> {}
 * ```
 *
 * Here, the generic type parameters `T` and `U` can be emitted into a different context, as the
 * type reference to `NgIterable` originates from an absolute module import so that it can be
 * emitted anywhere, using that same module import. The process of emitting translates the
 * `NgIterable` type reference to a type reference that is valid in the context in which it is
 * emitted, for example:
 *
 * ```
 * import * as i0 from '@angular/core';
 * import * as i1 from '@angular/common';
 *
 * const _ctor1: <T, U extends i0.NgIterable<T>>(o: Pick<i1.NgForOf<T, U>, 'ngForOf'>):
 * i1.NgForOf<T, U>;
 * ```
 *
 * Notice how the type reference for `NgIterable` has been translated into a qualified name,
 * referring to the namespace import that was created.
 */
export class TypeEmitter {
    constructor(resolver, emitReference) {
        this.resolver = resolver;
        this.emitReference = emitReference;
    }
    emitType(type) {
        return visitTypeNode(type, {
            visitTypeReferenceNode: type => this.emitTypeReference(type),
            visitArrayTypeNode: type => ts.updateArrayTypeNode(type, this.emitType(type.elementType)),
            visitKeywordType: type => type,
            visitLiteralType: type => type,
            visitOtherType: () => {
                throw new Error('Unable to emit a complex type');
            },
        });
    }
    emitTypeReference(type) {
        // Determine the reference that the type corresponds with.
        const reference = this.resolver(type);
        if (reference === null) {
            throw new Error('Unable to emit an unresolved reference');
        }
        // Emit the type arguments, if any.
        let typeArguments = undefined;
        if (type.typeArguments !== undefined) {
            typeArguments = ts.createNodeArray(type.typeArguments.map(typeArg => this.emitType(typeArg)));
        }
        // Emit the type name.
        let typeName = type.typeName;
        if (reference instanceof Reference) {
            if (!reference.hasOwningModuleGuess) {
                throw new Error('A type reference to emit must be imported from an absolute module');
            }
            const emittedType = this.emitReference(reference);
            if (!ts.isTypeReferenceNode(emittedType)) {
                throw new Error(`Expected TypeReferenceNode for emitted reference, got ${ts.SyntaxKind[emittedType.kind]}`);
            }
            typeName = emittedType.typeName;
        }
        return ts.updateTypeReferenceNode(type, typeName, typeArguments);
    }
}
function visitTypeNode(type, visitor) {
    if (ts.isTypeReferenceNode(type)) {
        return visitor.visitTypeReferenceNode(type);
    }
    else if (ts.isArrayTypeNode(type)) {
        return visitor.visitArrayTypeNode(type);
    }
    else if (ts.isLiteralTypeNode(type)) {
        return visitor.visitLiteralType(type);
    }
    switch (type.kind) {
        case ts.SyntaxKind.AnyKeyword:
        case ts.SyntaxKind.UnknownKeyword:
        case ts.SyntaxKind.NumberKeyword:
        case ts.SyntaxKind.ObjectKeyword:
        case ts.SyntaxKind.BooleanKeyword:
        case ts.SyntaxKind.StringKeyword:
        case ts.SyntaxKind.UndefinedKeyword:
        case ts.SyntaxKind.NullKeyword:
            return visitor.visitKeywordType(type);
        default:
            return visitor.visitOtherType(type);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9lbWl0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL3R5cGVfZW1pdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFDSCxPQUFPLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNqQyxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBY3hDOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsV0FBVyxDQUFDLElBQWlCLEVBQUUsUUFBK0I7SUFDNUUsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUUvQixTQUFTLGlCQUFpQixDQUFDLElBQWlCO1FBQzFDLE9BQU8sYUFBYSxDQUFDLElBQUksRUFBRTtZQUN6QixzQkFBc0IsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQztZQUMxRCxrQkFBa0IsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7WUFDL0QsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSTtZQUM1QixnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1lBQzVCLGNBQWMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLO1NBQzVCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxTQUFTLG9CQUFvQixDQUFDLElBQTBCO1FBQ3RELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVqQyw0REFBNEQ7UUFDNUQsSUFBSSxTQUFTLEtBQUssSUFBSSxFQUFFO1lBQ3RCLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFFRCwrRkFBK0Y7UUFDL0YsWUFBWTtRQUNaLElBQUksU0FBUyxZQUFZLFNBQVMsSUFBSSxDQUFDLFNB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S0FDN0M7U0FBTSxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDbkMsT0FBTyxPQUFPLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDekM7U0FBTSxJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNyQyxPQUFPLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUN2QztJQUVELFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRTtRQUNqQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1FBQzlCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUM7UUFDbEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztRQUNqQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1FBQ2pDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUM7UUFDbEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztRQUNqQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7UUFDcEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVc7WUFDNUIsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBMEIsQ0FBQyxDQUFDO1FBQzlEO1lBQ0UsT0FBTyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3ZDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5cbi8qKlxuICogQSByZXNvbHZlZCB0eXBlIHJlZmVyZW5jZSBjYW4gZWl0aGVyIGJlIGEgYFJlZmVyZW5jZWAsIHRoZSBvcmlnaW5hbCBgdHMuVHlwZVJlZmVyZW5jZU5vZGVgIGl0c2VsZlxuICogb3IgbnVsbCB0byBpbmRpY2F0ZSB0aGUgbm8gcmVmZXJlbmNlIGNvdWxkIGJlIHJlc29sdmVkLlxuICovXG5leHBvcnQgdHlwZSBSZXNvbHZlZFR5cGVSZWZlcmVuY2UgPSBSZWZlcmVuY2V8dHMuVHlwZVJlZmVyZW5jZU5vZGV8bnVsbDtcblxuLyoqXG4gKiBBIHR5cGUgcmVmZXJlbmNlIHJlc29sdmVyIGZ1bmN0aW9uIGlzIHJlc3BvbnNpYmxlIGZvciBmaW5kaW5nIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgdHlwZVxuICogcmVmZXJlbmNlIGFuZCB2ZXJpZnlpbmcgd2hldGhlciBpdCBjYW4gYmUgZW1pdHRlZC5cbiAqL1xuZXhwb3J0IHR5cGUgVHlwZVJlZmVyZW5jZVJlc29sdmVyID0gKHR5cGU6IHRzLlR5cGVSZWZlcmVuY2VOb2RlKSA9PiBSZXNvbHZlZFR5cGVSZWZlcmVuY2U7XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBwcm92aWRlZCB0eXBlIGNhbiBiZSBlbWl0dGVkLCB3aGljaCBtZWFucyB0aGF0IGl0IGNhbiBiZSBzYWZlbHkgZW1pdHRlZFxuICogaW50byBhIGRpZmZlcmVudCBsb2NhdGlvbi5cbiAqXG4gKiBJZiB0aGlzIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSwgYSBgVHlwZUVtaXR0ZXJgIHNob3VsZCBiZSBhYmxlIHRvIHN1Y2NlZWQuIFZpY2UgdmVyc2EsIGlmIHRoaXNcbiAqIGZ1bmN0aW9uIHJldHVybnMgZmFsc2UsIHRoZW4gdXNpbmcgdGhlIGBUeXBlRW1pdHRlcmAgc2hvdWxkIG5vdCBiZSBhdHRlbXB0ZWQgYXMgaXQgaXMga25vd24gdG9cbiAqIGZhaWwuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYW5FbWl0VHlwZSh0eXBlOiB0cy5UeXBlTm9kZSwgcmVzb2x2ZXI6IFR5cGVSZWZlcmVuY2VSZXNvbHZlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gY2FuRW1pdFR5cGVXb3JrZXIodHlwZSk7XG5cbiAgZnVuY3Rpb24gY2FuRW1pdFR5cGVXb3JrZXIodHlwZTogdHMuVHlwZU5vZGUpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdmlzaXRUeXBlTm9kZSh0eXBlLCB7XG4gICAgICB2aXNpdFR5cGVSZWZlcmVuY2VOb2RlOiB0eXBlID0+IGNhbkVtaXRUeXBlUmVmZXJlbmNlKHR5cGUpLFxuICAgICAgdmlzaXRBcnJheVR5cGVOb2RlOiB0eXBlID0+IGNhbkVtaXRUeXBlV29ya2VyKHR5cGUuZWxlbWVudFR5cGUpLFxuICAgICAgdmlzaXRLZXl3b3JkVHlwZTogKCkgPT4gdHJ1ZSxcbiAgICAgIHZpc2l0TGl0ZXJhbFR5cGU6ICgpID0+IHRydWUsXG4gICAgICB2aXNpdE90aGVyVHlwZTogKCkgPT4gZmFsc2UsXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjYW5FbWl0VHlwZVJlZmVyZW5jZSh0eXBlOiB0cy5UeXBlUmVmZXJlbmNlTm9kZSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHJlZmVyZW5jZSA9IHJlc29sdmVyKHR5cGUpO1xuXG4gICAgLy8gSWYgdGhlIHR5cGUgY291bGQgbm90IGJlIHJlc29sdmVkLCBpdCBjYW4gbm90IGJlIGVtaXR0ZWQuXG4gICAgaWYgKHJlZmVyZW5jZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSB0eXBlIGlzIGEgcmVmZXJlbmNlIHdpdGhvdXQgYSBvd25pbmcgbW9kdWxlLCBjb25zaWRlciB0aGUgdHlwZSBub3QgdG8gYmUgZWxpZ2libGUgZm9yXG4gICAgLy8gZW1pdHRpbmcuXG4gICAgaWYgKHJlZmVyZW5jZSBpbnN0YW5jZW9mIFJlZmVyZW5jZSAmJiAhcmVmZXJlbmNlLmhhc093bmluZ01vZHVsZUd1ZXNzKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gVGhlIHR5cGUgY2FuIGJlIGVtaXR0ZWQgaWYgZWl0aGVyIGl0IGRvZXMgbm90IGhhdmUgYW55IHR5cGUgYXJndW1lbnRzLCBvciBhbGwgb2YgdGhlbSBjYW4gYmVcbiAgICAvLyBlbWl0dGVkLlxuICAgIHJldHVybiB0eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fCB0eXBlLnR5cGVBcmd1bWVudHMuZXZlcnkoY2FuRW1pdFR5cGVXb3JrZXIpO1xuICB9XG59XG5cbi8qKlxuICogR2l2ZW4gYSBgdHMuVHlwZU5vZGVgLCB0aGlzIGNsYXNzIGRlcml2ZXMgYW4gZXF1aXZhbGVudCBgdHMuVHlwZU5vZGVgIHRoYXQgaGFzIGJlZW4gZW1pdHRlZCBpbnRvXG4gKiBhIGRpZmZlcmVudCBjb250ZXh0LlxuICpcbiAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGUgZm9sbG93aW5nIGNvZGU6XG4gKlxuICogYGBgXG4gKiBpbXBvcnQge05nSXRlcmFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuICpcbiAqIGNsYXNzIE5nRm9yT2Y8VCwgVSBleHRlbmRzIE5nSXRlcmFibGU8VD4+IHt9XG4gKiBgYGBcbiAqXG4gKiBIZXJlLCB0aGUgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgYFRgIGFuZCBgVWAgY2FuIGJlIGVtaXR0ZWQgaW50byBhIGRpZmZlcmVudCBjb250ZXh0LCBhcyB0aGVcbiAqIHR5cGUgcmVmZXJlbmNlIHRvIGBOZ0l0ZXJhYmxlYCBvcmlnaW5hdGVzIGZyb20gYW4gYWJzb2x1dGUgbW9kdWxlIGltcG9ydCBzbyB0aGF0IGl0IGNhbiBiZVxuICogZW1pdHRlZCBhbnl3aGVyZSwgdXNpbmcgdGhhdCBzYW1lIG1vZHVsZSBpbXBvcnQuIFRoZSBwcm9jZXNzIG9mIGVtaXR0aW5nIHRyYW5zbGF0ZXMgdGhlXG4gKiBgTmdJdGVyYWJsZWAgdHlwZSByZWZlcmVuY2UgdG8gYSB0eXBlIHJlZmVyZW5jZSB0aGF0IGlzIHZhbGlkIGluIHRoZSBjb250ZXh0IGluIHdoaWNoIGl0IGlzXG4gKiBlbWl0dGVkLCBmb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIGltcG9ydCAqIGFzIGkwIGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuICogaW1wb3J0ICogYXMgaTEgZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbiAqXG4gKiBjb25zdCBfY3RvcjE6IDxULCBVIGV4dGVuZHMgaTAuTmdJdGVyYWJsZTxUPj4obzogUGljazxpMS5OZ0Zvck9mPFQsIFU+LCAnbmdGb3JPZic+KTpcbiAqIGkxLk5nRm9yT2Y8VCwgVT47XG4gKiBgYGBcbiAqXG4gKiBOb3RpY2UgaG93IHRoZSB0eXBlIHJlZmVyZW5jZSBmb3IgYE5nSXRlcmFibGVgIGhhcyBiZWVuIHRyYW5zbGF0ZWQgaW50byBhIHF1YWxpZmllZCBuYW1lLFxuICogcmVmZXJyaW5nIHRvIHRoZSBuYW1lc3BhY2UgaW1wb3J0IHRoYXQgd2FzIGNyZWF0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlRW1pdHRlciB7XG4gIC8qKlxuICAgKiBSZXNvbHZlciBmdW5jdGlvbiB0aGF0IGNvbXB1dGVzIGEgYFJlZmVyZW5jZWAgY29ycmVzcG9uZGluZyB3aXRoIGEgYHRzLlR5cGVSZWZlcmVuY2VOb2RlYC5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZXI6IFR5cGVSZWZlcmVuY2VSZXNvbHZlcjtcblxuICAvKipcbiAgICogR2l2ZW4gYSBgUmVmZXJlbmNlYCwgdGhpcyBmdW5jdGlvbiBpcyByZXNwb25zaWJsZSBmb3IgdGhlIGFjdHVhbCBlbWl0dGluZyB3b3JrLiBJdCBzaG91bGRcbiAgICogcHJvZHVjZSBhIGB0cy5UeXBlTm9kZWAgdGhhdCBpcyB2YWxpZCB3aXRoaW4gdGhlIGRlc2lyZWQgY29udGV4dC5cbiAgICovXG4gIHByaXZhdGUgZW1pdFJlZmVyZW5jZTogKHJlZjogUmVmZXJlbmNlKSA9PiB0cy5UeXBlTm9kZTtcblxuICBjb25zdHJ1Y3RvcihyZXNvbHZlcjogVHlwZVJlZmVyZW5jZVJlc29sdmVyLCBlbWl0UmVmZXJlbmNlOiAocmVmOiBSZWZlcmVuY2UpID0+IHRzLlR5cGVOb2RlKSB7XG4gICAgdGhpcy5yZXNvbHZlciA9IHJlc29sdmVyO1xuICAgIHRoaXMuZW1pdFJlZmVyZW5jZSA9IGVtaXRSZWZlcmVuY2U7XG4gIH1cblxuICBlbWl0VHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IHRzLlR5cGVOb2RlIHtcbiAgICByZXR1cm4gdmlzaXRUeXBlTm9kZSh0eXBlLCB7XG4gICAgICB2aXNpdFR5cGVSZWZlcmVuY2VOb2RlOiB0eXBlID0+IHRoaXMuZW1pdFR5cGVSZWZlcmVuY2UodHlwZSksXG4gICAgICB2aXNpdEFycmF5VHlwZU5vZGU6IHR5cGUgPT4gdHMudXBkYXRlQXJyYXlUeXBlTm9kZSh0eXBlLCB0aGlzLmVtaXRUeXBlKHR5cGUuZWxlbWVudFR5cGUpKSxcbiAgICAgIHZpc2l0S2V5d29yZFR5cGU6IHR5cGUgPT4gdHlwZSxcbiAgICAgIHZpc2l0TGl0ZXJhbFR5cGU6IHR5cGUgPT4gdHlwZSxcbiAgICAgIHZpc2l0T3RoZXJUeXBlOiAoKSA9PiB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGVtaXQgYSBjb21wbGV4IHR5cGUnKTtcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGVtaXRUeXBlUmVmZXJlbmNlKHR5cGU6IHRzLlR5cGVSZWZlcmVuY2VOb2RlKTogdHMuVHlwZU5vZGUge1xuICAgIC8vIERldGVybWluZSB0aGUgcmVmZXJlbmNlIHRoYXQgdGhlIHR5cGUgY29ycmVzcG9uZHMgd2l0aC5cbiAgICBjb25zdCByZWZlcmVuY2UgPSB0aGlzLnJlc29sdmVyKHR5cGUpO1xuICAgIGlmIChyZWZlcmVuY2UgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGVtaXQgYW4gdW5yZXNvbHZlZCByZWZlcmVuY2UnKTtcbiAgICB9XG5cbiAgICAvLyBFbWl0IHRoZSB0eXBlIGFyZ3VtZW50cywgaWYgYW55LlxuICAgIGxldCB0eXBlQXJndW1lbnRzOiB0cy5Ob2RlQXJyYXk8dHMuVHlwZU5vZGU+fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAodHlwZS50eXBlQXJndW1lbnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVBcmd1bWVudHMgPSB0cy5jcmVhdGVOb2RlQXJyYXkodHlwZS50eXBlQXJndW1lbnRzLm1hcCh0eXBlQXJnID0+IHRoaXMuZW1pdFR5cGUodHlwZUFyZykpKTtcbiAgICB9XG5cbiAgICAvLyBFbWl0IHRoZSB0eXBlIG5hbWUuXG4gICAgbGV0IHR5cGVOYW1lID0gdHlwZS50eXBlTmFtZTtcbiAgICBpZiAocmVmZXJlbmNlIGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgICBpZiAoIXJlZmVyZW5jZS5oYXNPd25pbmdNb2R1bGVHdWVzcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0EgdHlwZSByZWZlcmVuY2UgdG8gZW1pdCBtdXN0IGJlIGltcG9ydGVkIGZyb20gYW4gYWJzb2x1dGUgbW9kdWxlJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGVtaXR0ZWRUeXBlID0gdGhpcy5lbWl0UmVmZXJlbmNlKHJlZmVyZW5jZSk7XG4gICAgICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZW1pdHRlZFR5cGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgVHlwZVJlZmVyZW5jZU5vZGUgZm9yIGVtaXR0ZWQgcmVmZXJlbmNlLCBnb3QgJHtcbiAgICAgICAgICAgIHRzLlN5bnRheEtpbmRbZW1pdHRlZFR5cGUua2luZF19YCk7XG4gICAgICB9XG5cbiAgICAgIHR5cGVOYW1lID0gZW1pdHRlZFR5cGUudHlwZU5hbWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRzLnVwZGF0ZVR5cGVSZWZlcmVuY2VOb2RlKHR5cGUsIHR5cGVOYW1lLCB0eXBlQXJndW1lbnRzKTtcbiAgfVxufVxuXG4vKipcbiAqIFZpc2l0b3IgaW50ZXJmYWNlIHRoYXQgYWxsb3dzIGZvciB1bmlmaWVkIHJlY29nbml0aW9uIG9mIHRoZSBkaWZmZXJlbnQgdHlwZXMgb2YgYHRzLlR5cGVOb2RlYHMsXG4gKiBzbyB0aGF0IGB2aXNpdFR5cGVOb2RlYCBpcyBhIGNlbnRyYWxpemVkIHBpZWNlIG9mIHJlY29nbml0aW9uIGxvZ2ljIHRvIGJlIHVzZWQgaW4gYm90aFxuICogYGNhbkVtaXRUeXBlYCBhbmQgYFR5cGVFbWl0dGVyYC5cbiAqL1xuaW50ZXJmYWNlIFR5cGVFbWl0dGVyVmlzaXRvcjxSPiB7XG4gIHZpc2l0VHlwZVJlZmVyZW5jZU5vZGUodHlwZTogdHMuVHlwZVJlZmVyZW5jZU5vZGUpOiBSO1xuICB2aXNpdEFycmF5VHlwZU5vZGUodHlwZTogdHMuQXJyYXlUeXBlTm9kZSk6IFI7XG4gIHZpc2l0S2V5d29yZFR5cGUodHlwZTogdHMuS2V5d29yZFR5cGVOb2RlKTogUjtcbiAgdmlzaXRMaXRlcmFsVHlwZSh0eXBlOiB0cy5MaXRlcmFsVHlwZU5vZGUpOiBSO1xuICB2aXNpdE90aGVyVHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IFI7XG59XG5cbmZ1bmN0aW9uIHZpc2l0VHlwZU5vZGU8Uj4odHlwZTogdHMuVHlwZU5vZGUsIHZpc2l0b3I6IFR5cGVFbWl0dGVyVmlzaXRvcjxSPik6IFIge1xuICBpZiAodHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlKSkge1xuICAgIHJldHVybiB2aXNpdG9yLnZpc2l0VHlwZVJlZmVyZW5jZU5vZGUodHlwZSk7XG4gIH0gZWxzZSBpZiAodHMuaXNBcnJheVR5cGVOb2RlKHR5cGUpKSB7XG4gICAgcmV0dXJuIHZpc2l0b3IudmlzaXRBcnJheVR5cGVOb2RlKHR5cGUpO1xuICB9IGVsc2UgaWYgKHRzLmlzTGl0ZXJhbFR5cGVOb2RlKHR5cGUpKSB7XG4gICAgcmV0dXJuIHZpc2l0b3IudmlzaXRMaXRlcmFsVHlwZSh0eXBlKTtcbiAgfVxuXG4gIHN3aXRjaCAodHlwZS5raW5kKSB7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkFueUtleXdvcmQ6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlVua25vd25LZXl3b3JkOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5OdW1iZXJLZXl3b3JkOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5PYmplY3RLZXl3b3JkOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5Cb29sZWFuS2V5d29yZDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuU3RyaW5nS2V5d29yZDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuVW5kZWZpbmVkS2V5d29yZDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuTnVsbEtleXdvcmQ6XG4gICAgICByZXR1cm4gdmlzaXRvci52aXNpdEtleXdvcmRUeXBlKHR5cGUgYXMgdHMuS2V5d29yZFR5cGVOb2RlKTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXRPdGhlclR5cGUodHlwZSk7XG4gIH1cbn1cbiJdfQ==