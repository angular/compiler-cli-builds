(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_emitter", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/imports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    /**
     * Determines whether the provided type can be emitted, which means that it can be safely emitted
     * into a different location.
     *
     * If this function returns true, a `TypeEmitter` should be able to succeed. Vice versa, if this
     * function returns false, then using the `TypeEmitter` should not be attempted as it is known to
     * fail.
     */
    function canEmitType(type, resolver) {
        return canEmitTypeWorker(type);
        function canEmitTypeWorker(type) {
            return visitTypeNode(type, {
                visitTypeReferenceNode: function (type) { return canEmitTypeReference(type); },
                visitArrayTypeNode: function (type) { return canEmitTypeWorker(type.elementType); },
                visitKeywordType: function () { return true; },
                visitOtherType: function () { return false; },
            });
        }
        function canEmitTypeReference(type) {
            var reference = resolver(type);
            // If the type could not be resolved, it can not be emitted.
            if (reference === null) {
                return false;
            }
            // If the type is a reference without a owning module, consider the type not to be eligible for
            // emitting.
            if (reference instanceof imports_1.Reference && !reference.hasOwningModuleGuess) {
                return false;
            }
            // The type can be emitted if either it does not have any type arguments, or all of them can be
            // emitted.
            return type.typeArguments === undefined || type.typeArguments.every(canEmitTypeWorker);
        }
    }
    exports.canEmitType = canEmitType;
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
    var TypeEmitter = /** @class */ (function () {
        function TypeEmitter(resolver, emitReference) {
            this.resolver = resolver;
            this.emitReference = emitReference;
        }
        TypeEmitter.prototype.emitType = function (type) {
            var _this = this;
            return visitTypeNode(type, {
                visitTypeReferenceNode: function (type) { return _this.emitTypeReference(type); },
                visitArrayTypeNode: function (type) { return ts.updateArrayTypeNode(type, _this.emitType(type.elementType)); },
                visitKeywordType: function (type) { return type; },
                visitOtherType: function () { throw new Error('Unable to emit a complex type'); },
            });
        };
        TypeEmitter.prototype.emitTypeReference = function (type) {
            var _this = this;
            // Determine the reference that the type corresponds with.
            var reference = this.resolver(type);
            if (reference === null) {
                throw new Error('Unable to emit an unresolved reference');
            }
            // Emit the type arguments, if any.
            var typeArguments = undefined;
            if (type.typeArguments !== undefined) {
                typeArguments = ts.createNodeArray(type.typeArguments.map(function (typeArg) { return _this.emitType(typeArg); }));
            }
            // Emit the type name.
            var typeName = type.typeName;
            if (reference instanceof imports_1.Reference) {
                if (!reference.hasOwningModuleGuess) {
                    throw new Error('A type reference to emit must be imported from an absolute module');
                }
                var emittedType = this.emitReference(reference);
                if (!ts.isTypeReferenceNode(emittedType)) {
                    throw new Error("Expected TypeReferenceNode for emitted reference, got " + ts.SyntaxKind[emittedType.kind]);
                }
                typeName = emittedType.typeName;
            }
            return ts.updateTypeReferenceNode(type, typeName, typeArguments);
        };
        return TypeEmitter;
    }());
    exports.TypeEmitter = TypeEmitter;
    function visitTypeNode(type, visitor) {
        if (ts.isTypeReferenceNode(type)) {
            return visitor.visitTypeReferenceNode(type);
        }
        else if (ts.isArrayTypeNode(type)) {
            return visitor.visitArrayTypeNode(type);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9lbWl0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL3R5cGVfZW1pdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUNqQyxtRUFBd0M7SUFjeEM7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLFdBQVcsQ0FBQyxJQUFpQixFQUFFLFFBQStCO1FBQzVFLE9BQU8saUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFL0IsU0FBUyxpQkFBaUIsQ0FBQyxJQUFpQjtZQUMxQyxPQUFPLGFBQWEsQ0FBQyxJQUFJLEVBQUU7Z0JBQ3pCLHNCQUFzQixFQUFFLFVBQUEsSUFBSSxJQUFJLE9BQUEsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQTFCLENBQTBCO2dCQUMxRCxrQkFBa0IsRUFBRSxVQUFBLElBQUksSUFBSSxPQUFBLGlCQUFpQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBbkMsQ0FBbUM7Z0JBQy9ELGdCQUFnQixFQUFFLGNBQU0sT0FBQSxJQUFJLEVBQUosQ0FBSTtnQkFDNUIsY0FBYyxFQUFFLGNBQU0sT0FBQSxLQUFLLEVBQUwsQ0FBSzthQUM1QixDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxJQUEwQjtZQUN0RCxJQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFakMsNERBQTREO1lBQzVELElBQUksU0FBUyxLQUFLLElBQUksRUFBRTtnQkFDdEIsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUVELCtGQUErRjtZQUMvRixZQUFZO1lBQ1osSUFBSSxTQUFTLFlBQVksbUJBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRTtnQkFDckUsT0FBTyxLQUFLLENBQUM7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QU8sQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM3QzthQUFNLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuQyxPQUFPLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN6QztRQUVELFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNqQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1lBQzlCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUM7WUFDbEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztZQUNqQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1lBQ2pDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUM7WUFDbEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztZQUNqQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7WUFDcEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVc7Z0JBQzVCLE9BQU8sT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQTBCLENBQUMsQ0FBQztZQUM5RDtnQkFDRSxPQUFPLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDdkM7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5cbi8qKlxuICogQSByZXNvbHZlZCB0eXBlIHJlZmVyZW5jZSBjYW4gZWl0aGVyIGJlIGEgYFJlZmVyZW5jZWAsIHRoZSBvcmlnaW5hbCBgdHMuVHlwZVJlZmVyZW5jZU5vZGVgIGl0c2VsZlxuICogb3IgbnVsbCB0byBpbmRpY2F0ZSB0aGUgbm8gcmVmZXJlbmNlIGNvdWxkIGJlIHJlc29sdmVkLlxuICovXG5leHBvcnQgdHlwZSBSZXNvbHZlZFR5cGVSZWZlcmVuY2UgPSBSZWZlcmVuY2UgfCB0cy5UeXBlUmVmZXJlbmNlTm9kZSB8IG51bGw7XG5cbi8qKlxuICogQSB0eXBlIHJlZmVyZW5jZSByZXNvbHZlciBmdW5jdGlvbiBpcyByZXNwb25zaWJsZSBmb3IgZmluZGluZyB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIHR5cGVcbiAqIHJlZmVyZW5jZSBhbmQgdmVyaWZ5aW5nIHdoZXRoZXIgaXQgY2FuIGJlIGVtaXR0ZWQuXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVSZWZlcmVuY2VSZXNvbHZlciA9ICh0eXBlOiB0cy5UeXBlUmVmZXJlbmNlTm9kZSkgPT4gUmVzb2x2ZWRUeXBlUmVmZXJlbmNlO1xuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciB0aGUgcHJvdmlkZWQgdHlwZSBjYW4gYmUgZW1pdHRlZCwgd2hpY2ggbWVhbnMgdGhhdCBpdCBjYW4gYmUgc2FmZWx5IGVtaXR0ZWRcbiAqIGludG8gYSBkaWZmZXJlbnQgbG9jYXRpb24uXG4gKlxuICogSWYgdGhpcyBmdW5jdGlvbiByZXR1cm5zIHRydWUsIGEgYFR5cGVFbWl0dGVyYCBzaG91bGQgYmUgYWJsZSB0byBzdWNjZWVkLiBWaWNlIHZlcnNhLCBpZiB0aGlzXG4gKiBmdW5jdGlvbiByZXR1cm5zIGZhbHNlLCB0aGVuIHVzaW5nIHRoZSBgVHlwZUVtaXR0ZXJgIHNob3VsZCBub3QgYmUgYXR0ZW1wdGVkIGFzIGl0IGlzIGtub3duIHRvXG4gKiBmYWlsLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FuRW1pdFR5cGUodHlwZTogdHMuVHlwZU5vZGUsIHJlc29sdmVyOiBUeXBlUmVmZXJlbmNlUmVzb2x2ZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIGNhbkVtaXRUeXBlV29ya2VyKHR5cGUpO1xuXG4gIGZ1bmN0aW9uIGNhbkVtaXRUeXBlV29ya2VyKHR5cGU6IHRzLlR5cGVOb2RlKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHZpc2l0VHlwZU5vZGUodHlwZSwge1xuICAgICAgdmlzaXRUeXBlUmVmZXJlbmNlTm9kZTogdHlwZSA9PiBjYW5FbWl0VHlwZVJlZmVyZW5jZSh0eXBlKSxcbiAgICAgIHZpc2l0QXJyYXlUeXBlTm9kZTogdHlwZSA9PiBjYW5FbWl0VHlwZVdvcmtlcih0eXBlLmVsZW1lbnRUeXBlKSxcbiAgICAgIHZpc2l0S2V5d29yZFR5cGU6ICgpID0+IHRydWUsXG4gICAgICB2aXNpdE90aGVyVHlwZTogKCkgPT4gZmFsc2UsXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjYW5FbWl0VHlwZVJlZmVyZW5jZSh0eXBlOiB0cy5UeXBlUmVmZXJlbmNlTm9kZSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHJlZmVyZW5jZSA9IHJlc29sdmVyKHR5cGUpO1xuXG4gICAgLy8gSWYgdGhlIHR5cGUgY291bGQgbm90IGJlIHJlc29sdmVkLCBpdCBjYW4gbm90IGJlIGVtaXR0ZWQuXG4gICAgaWYgKHJlZmVyZW5jZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSB0eXBlIGlzIGEgcmVmZXJlbmNlIHdpdGhvdXQgYSBvd25pbmcgbW9kdWxlLCBjb25zaWRlciB0aGUgdHlwZSBub3QgdG8gYmUgZWxpZ2libGUgZm9yXG4gICAgLy8gZW1pdHRpbmcuXG4gICAgaWYgKHJlZmVyZW5jZSBpbnN0YW5jZW9mIFJlZmVyZW5jZSAmJiAhcmVmZXJlbmNlLmhhc093bmluZ01vZHVsZUd1ZXNzKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gVGhlIHR5cGUgY2FuIGJlIGVtaXR0ZWQgaWYgZWl0aGVyIGl0IGRvZXMgbm90IGhhdmUgYW55IHR5cGUgYXJndW1lbnRzLCBvciBhbGwgb2YgdGhlbSBjYW4gYmVcbiAgICAvLyBlbWl0dGVkLlxuICAgIHJldHVybiB0eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fCB0eXBlLnR5cGVBcmd1bWVudHMuZXZlcnkoY2FuRW1pdFR5cGVXb3JrZXIpO1xuICB9XG59XG5cbi8qKlxuICogR2l2ZW4gYSBgdHMuVHlwZU5vZGVgLCB0aGlzIGNsYXNzIGRlcml2ZXMgYW4gZXF1aXZhbGVudCBgdHMuVHlwZU5vZGVgIHRoYXQgaGFzIGJlZW4gZW1pdHRlZCBpbnRvXG4gKiBhIGRpZmZlcmVudCBjb250ZXh0LlxuICpcbiAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGUgZm9sbG93aW5nIGNvZGU6XG4gKlxuICogYGBgXG4gKiBpbXBvcnQge05nSXRlcmFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuICpcbiAqIGNsYXNzIE5nRm9yT2Y8VCwgVSBleHRlbmRzIE5nSXRlcmFibGU8VD4+IHt9XG4gKiBgYGBcbiAqXG4gKiBIZXJlLCB0aGUgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgYFRgIGFuZCBgVWAgY2FuIGJlIGVtaXR0ZWQgaW50byBhIGRpZmZlcmVudCBjb250ZXh0LCBhcyB0aGVcbiAqIHR5cGUgcmVmZXJlbmNlIHRvIGBOZ0l0ZXJhYmxlYCBvcmlnaW5hdGVzIGZyb20gYW4gYWJzb2x1dGUgbW9kdWxlIGltcG9ydCBzbyB0aGF0IGl0IGNhbiBiZVxuICogZW1pdHRlZCBhbnl3aGVyZSwgdXNpbmcgdGhhdCBzYW1lIG1vZHVsZSBpbXBvcnQuIFRoZSBwcm9jZXNzIG9mIGVtaXR0aW5nIHRyYW5zbGF0ZXMgdGhlXG4gKiBgTmdJdGVyYWJsZWAgdHlwZSByZWZlcmVuY2UgdG8gYSB0eXBlIHJlZmVyZW5jZSB0aGF0IGlzIHZhbGlkIGluIHRoZSBjb250ZXh0IGluIHdoaWNoIGl0IGlzXG4gKiBlbWl0dGVkLCBmb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIGltcG9ydCAqIGFzIGkwIGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuICogaW1wb3J0ICogYXMgaTEgZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbiAqXG4gKiBjb25zdCBfY3RvcjE6IDxULCBVIGV4dGVuZHMgaTAuTmdJdGVyYWJsZTxUPj4obzogUGljazxpMS5OZ0Zvck9mPFQsIFU+LCAnbmdGb3JPZic+KTpcbiAqIGkxLk5nRm9yT2Y8VCwgVT47XG4gKiBgYGBcbiAqXG4gKiBOb3RpY2UgaG93IHRoZSB0eXBlIHJlZmVyZW5jZSBmb3IgYE5nSXRlcmFibGVgIGhhcyBiZWVuIHRyYW5zbGF0ZWQgaW50byBhIHF1YWxpZmllZCBuYW1lLFxuICogcmVmZXJyaW5nIHRvIHRoZSBuYW1lc3BhY2UgaW1wb3J0IHRoYXQgd2FzIGNyZWF0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlRW1pdHRlciB7XG4gIC8qKlxuICAgKiBSZXNvbHZlciBmdW5jdGlvbiB0aGF0IGNvbXB1dGVzIGEgYFJlZmVyZW5jZWAgY29ycmVzcG9uZGluZyB3aXRoIGEgYHRzLlR5cGVSZWZlcmVuY2VOb2RlYC5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZXI6IFR5cGVSZWZlcmVuY2VSZXNvbHZlcjtcblxuICAvKipcbiAgICogR2l2ZW4gYSBgUmVmZXJlbmNlYCwgdGhpcyBmdW5jdGlvbiBpcyByZXNwb25zaWJsZSBmb3IgdGhlIGFjdHVhbCBlbWl0dGluZyB3b3JrLiBJdCBzaG91bGRcbiAgICogcHJvZHVjZSBhIGB0cy5UeXBlTm9kZWAgdGhhdCBpcyB2YWxpZCB3aXRoaW4gdGhlIGRlc2lyZWQgY29udGV4dC5cbiAgICovXG4gIHByaXZhdGUgZW1pdFJlZmVyZW5jZTogKHJlZjogUmVmZXJlbmNlKSA9PiB0cy5UeXBlTm9kZTtcblxuICBjb25zdHJ1Y3RvcihyZXNvbHZlcjogVHlwZVJlZmVyZW5jZVJlc29sdmVyLCBlbWl0UmVmZXJlbmNlOiAocmVmOiBSZWZlcmVuY2UpID0+IHRzLlR5cGVOb2RlKSB7XG4gICAgdGhpcy5yZXNvbHZlciA9IHJlc29sdmVyO1xuICAgIHRoaXMuZW1pdFJlZmVyZW5jZSA9IGVtaXRSZWZlcmVuY2U7XG4gIH1cblxuICBlbWl0VHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IHRzLlR5cGVOb2RlIHtcbiAgICByZXR1cm4gdmlzaXRUeXBlTm9kZSh0eXBlLCB7XG4gICAgICB2aXNpdFR5cGVSZWZlcmVuY2VOb2RlOiB0eXBlID0+IHRoaXMuZW1pdFR5cGVSZWZlcmVuY2UodHlwZSksXG4gICAgICB2aXNpdEFycmF5VHlwZU5vZGU6IHR5cGUgPT4gdHMudXBkYXRlQXJyYXlUeXBlTm9kZSh0eXBlLCB0aGlzLmVtaXRUeXBlKHR5cGUuZWxlbWVudFR5cGUpKSxcbiAgICAgIHZpc2l0S2V5d29yZFR5cGU6IHR5cGUgPT4gdHlwZSxcbiAgICAgIHZpc2l0T3RoZXJUeXBlOiAoKSA9PiB7IHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGVtaXQgYSBjb21wbGV4IHR5cGUnKTsgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZW1pdFR5cGVSZWZlcmVuY2UodHlwZTogdHMuVHlwZVJlZmVyZW5jZU5vZGUpOiB0cy5UeXBlTm9kZSB7XG4gICAgLy8gRGV0ZXJtaW5lIHRoZSByZWZlcmVuY2UgdGhhdCB0aGUgdHlwZSBjb3JyZXNwb25kcyB3aXRoLlxuICAgIGNvbnN0IHJlZmVyZW5jZSA9IHRoaXMucmVzb2x2ZXIodHlwZSk7XG4gICAgaWYgKHJlZmVyZW5jZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZW1pdCBhbiB1bnJlc29sdmVkIHJlZmVyZW5jZScpO1xuICAgIH1cblxuICAgIC8vIEVtaXQgdGhlIHR5cGUgYXJndW1lbnRzLCBpZiBhbnkuXG4gICAgbGV0IHR5cGVBcmd1bWVudHM6IHRzLk5vZGVBcnJheTx0cy5UeXBlTm9kZT58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmICh0eXBlLnR5cGVBcmd1bWVudHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUFyZ3VtZW50cyA9IHRzLmNyZWF0ZU5vZGVBcnJheSh0eXBlLnR5cGVBcmd1bWVudHMubWFwKHR5cGVBcmcgPT4gdGhpcy5lbWl0VHlwZSh0eXBlQXJnKSkpO1xuICAgIH1cblxuICAgIC8vIEVtaXQgdGhlIHR5cGUgbmFtZS5cbiAgICBsZXQgdHlwZU5hbWUgPSB0eXBlLnR5cGVOYW1lO1xuICAgIGlmIChyZWZlcmVuY2UgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIGlmICghcmVmZXJlbmNlLmhhc093bmluZ01vZHVsZUd1ZXNzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQSB0eXBlIHJlZmVyZW5jZSB0byBlbWl0IG11c3QgYmUgaW1wb3J0ZWQgZnJvbSBhbiBhYnNvbHV0ZSBtb2R1bGUnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZW1pdHRlZFR5cGUgPSB0aGlzLmVtaXRSZWZlcmVuY2UocmVmZXJlbmNlKTtcbiAgICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShlbWl0dGVkVHlwZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBUeXBlUmVmZXJlbmNlTm9kZSBmb3IgZW1pdHRlZCByZWZlcmVuY2UsIGdvdCAke1xuICAgICAgICAgICAgdHMuU3ludGF4S2luZFtlbWl0dGVkVHlwZS5raW5kXX1gKTtcbiAgICAgIH1cblxuICAgICAgdHlwZU5hbWUgPSBlbWl0dGVkVHlwZS50eXBlTmFtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHMudXBkYXRlVHlwZVJlZmVyZW5jZU5vZGUodHlwZSwgdHlwZU5hbWUsIHR5cGVBcmd1bWVudHMpO1xuICB9XG59XG5cbi8qKlxuICogVmlzaXRvciBpbnRlcmZhY2UgdGhhdCBhbGxvd3MgZm9yIHVuaWZpZWQgcmVjb2duaXRpb24gb2YgdGhlIGRpZmZlcmVudCB0eXBlcyBvZiBgdHMuVHlwZU5vZGVgcyxcbiAqIHNvIHRoYXQgYHZpc2l0VHlwZU5vZGVgIGlzIGEgY2VudHJhbGl6ZWQgcGllY2Ugb2YgcmVjb2duaXRpb24gbG9naWMgdG8gYmUgdXNlZCBpbiBib3RoXG4gKiBgY2FuRW1pdFR5cGVgIGFuZCBgVHlwZUVtaXR0ZXJgLlxuICovXG5pbnRlcmZhY2UgVHlwZUVtaXR0ZXJWaXNpdG9yPFI+IHtcbiAgdmlzaXRUeXBlUmVmZXJlbmNlTm9kZSh0eXBlOiB0cy5UeXBlUmVmZXJlbmNlTm9kZSk6IFI7XG4gIHZpc2l0QXJyYXlUeXBlTm9kZSh0eXBlOiB0cy5BcnJheVR5cGVOb2RlKTogUjtcbiAgdmlzaXRLZXl3b3JkVHlwZSh0eXBlOiB0cy5LZXl3b3JkVHlwZU5vZGUpOiBSO1xuICB2aXNpdE90aGVyVHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IFI7XG59XG5cbmZ1bmN0aW9uIHZpc2l0VHlwZU5vZGU8Uj4odHlwZTogdHMuVHlwZU5vZGUsIHZpc2l0b3I6IFR5cGVFbWl0dGVyVmlzaXRvcjxSPik6IFIge1xuICBpZiAodHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlKSkge1xuICAgIHJldHVybiB2aXNpdG9yLnZpc2l0VHlwZVJlZmVyZW5jZU5vZGUodHlwZSk7XG4gIH0gZWxzZSBpZiAodHMuaXNBcnJheVR5cGVOb2RlKHR5cGUpKSB7XG4gICAgcmV0dXJuIHZpc2l0b3IudmlzaXRBcnJheVR5cGVOb2RlKHR5cGUpO1xuICB9XG5cbiAgc3dpdGNoICh0eXBlLmtpbmQpIHtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuQW55S2V5d29yZDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuVW5rbm93bktleXdvcmQ6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLk51bWJlcktleXdvcmQ6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLk9iamVjdEtleXdvcmQ6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkJvb2xlYW5LZXl3b3JkOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5TdHJpbmdLZXl3b3JkOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5VbmRlZmluZWRLZXl3b3JkOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5OdWxsS2V5d29yZDpcbiAgICAgIHJldHVybiB2aXNpdG9yLnZpc2l0S2V5d29yZFR5cGUodHlwZSBhcyB0cy5LZXl3b3JkVHlwZU5vZGUpO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gdmlzaXRvci52aXNpdE90aGVyVHlwZSh0eXBlKTtcbiAgfVxufVxuIl19