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
    exports.TypeEmitter = exports.canEmitType = void 0;
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
                visitOtherType: function () {
                    throw new Error('Unable to emit a complex type');
                },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9lbWl0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL3R5cGVfZW1pdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFDakMsbUVBQXdDO0lBY3hDOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixXQUFXLENBQUMsSUFBaUIsRUFBRSxRQUErQjtRQUM1RSxPQUFPLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9CLFNBQVMsaUJBQWlCLENBQUMsSUFBaUI7WUFDMUMsT0FBTyxhQUFhLENBQUMsSUFBSSxFQUFFO2dCQUN6QixzQkFBc0IsRUFBRSxVQUFBLElBQUksSUFBSSxPQUFBLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUExQixDQUEwQjtnQkFDMUQsa0JBQWtCLEVBQUUsVUFBQSxJQUFJLElBQUksT0FBQSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQW5DLENBQW1DO2dCQUMvRCxnQkFBZ0IsRUFBRSxjQUFNLE9BQUEsSUFBSSxFQUFKLENBQUk7Z0JBQzVCLGNBQWMsRUFBRSxjQUFNLE9BQUEsS0FBSyxFQUFMLENBQUs7YUFDNUIsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELFNBQVMsb0JBQW9CLENBQUMsSUFBMEI7WUFDdEQsSUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRWpDLDREQUE0RDtZQUM1RCxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUU7Z0JBQ3RCLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFFRCwrRkFBK0Y7WUFDL0YsWUFBWTtZQUNaLElBQUksU0FBUyxZQUFZLG1CQUFTLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEVBQUU7Z0JBQ3JFLE9BQU8sS0FBSyxDQUFD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LE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM3QzthQUFNLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuQyxPQUFPLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN6QztRQUVELFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNqQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1lBQzlCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUM7WUFDbEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztZQUNqQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1lBQ2pDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUM7WUFDbEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztZQUNqQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7WUFDcEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVc7Z0JBQzVCLE9BQU8sT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQTBCLENBQUMsQ0FBQztZQUM5RDtnQkFDRSxPQUFPLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDdkM7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5cbi8qKlxuICogQSByZXNvbHZlZCB0eXBlIHJlZmVyZW5jZSBjYW4gZWl0aGVyIGJlIGEgYFJlZmVyZW5jZWAsIHRoZSBvcmlnaW5hbCBgdHMuVHlwZVJlZmVyZW5jZU5vZGVgIGl0c2VsZlxuICogb3IgbnVsbCB0byBpbmRpY2F0ZSB0aGUgbm8gcmVmZXJlbmNlIGNvdWxkIGJlIHJlc29sdmVkLlxuICovXG5leHBvcnQgdHlwZSBSZXNvbHZlZFR5cGVSZWZlcmVuY2UgPSBSZWZlcmVuY2V8dHMuVHlwZVJlZmVyZW5jZU5vZGV8bnVsbDtcblxuLyoqXG4gKiBBIHR5cGUgcmVmZXJlbmNlIHJlc29sdmVyIGZ1bmN0aW9uIGlzIHJlc3BvbnNpYmxlIGZvciBmaW5kaW5nIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgdHlwZVxuICogcmVmZXJlbmNlIGFuZCB2ZXJpZnlpbmcgd2hldGhlciBpdCBjYW4gYmUgZW1pdHRlZC5cbiAqL1xuZXhwb3J0IHR5cGUgVHlwZVJlZmVyZW5jZVJlc29sdmVyID0gKHR5cGU6IHRzLlR5cGVSZWZlcmVuY2VOb2RlKSA9PiBSZXNvbHZlZFR5cGVSZWZlcmVuY2U7XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBwcm92aWRlZCB0eXBlIGNhbiBiZSBlbWl0dGVkLCB3aGljaCBtZWFucyB0aGF0IGl0IGNhbiBiZSBzYWZlbHkgZW1pdHRlZFxuICogaW50byBhIGRpZmZlcmVudCBsb2NhdGlvbi5cbiAqXG4gKiBJZiB0aGlzIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSwgYSBgVHlwZUVtaXR0ZXJgIHNob3VsZCBiZSBhYmxlIHRvIHN1Y2NlZWQuIFZpY2UgdmVyc2EsIGlmIHRoaXNcbiAqIGZ1bmN0aW9uIHJldHVybnMgZmFsc2UsIHRoZW4gdXNpbmcgdGhlIGBUeXBlRW1pdHRlcmAgc2hvdWxkIG5vdCBiZSBhdHRlbXB0ZWQgYXMgaXQgaXMga25vd24gdG9cbiAqIGZhaWwuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYW5FbWl0VHlwZSh0eXBlOiB0cy5UeXBlTm9kZSwgcmVzb2x2ZXI6IFR5cGVSZWZlcmVuY2VSZXNvbHZlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gY2FuRW1pdFR5cGVXb3JrZXIodHlwZSk7XG5cbiAgZnVuY3Rpb24gY2FuRW1pdFR5cGVXb3JrZXIodHlwZTogdHMuVHlwZU5vZGUpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdmlzaXRUeXBlTm9kZSh0eXBlLCB7XG4gICAgICB2aXNpdFR5cGVSZWZlcmVuY2VOb2RlOiB0eXBlID0+IGNhbkVtaXRUeXBlUmVmZXJlbmNlKHR5cGUpLFxuICAgICAgdmlzaXRBcnJheVR5cGVOb2RlOiB0eXBlID0+IGNhbkVtaXRUeXBlV29ya2VyKHR5cGUuZWxlbWVudFR5cGUpLFxuICAgICAgdmlzaXRLZXl3b3JkVHlwZTogKCkgPT4gdHJ1ZSxcbiAgICAgIHZpc2l0T3RoZXJUeXBlOiAoKSA9PiBmYWxzZSxcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhbkVtaXRUeXBlUmVmZXJlbmNlKHR5cGU6IHRzLlR5cGVSZWZlcmVuY2VOb2RlKTogYm9vbGVhbiB7XG4gICAgY29uc3QgcmVmZXJlbmNlID0gcmVzb2x2ZXIodHlwZSk7XG5cbiAgICAvLyBJZiB0aGUgdHlwZSBjb3VsZCBub3QgYmUgcmVzb2x2ZWQsIGl0IGNhbiBub3QgYmUgZW1pdHRlZC5cbiAgICBpZiAocmVmZXJlbmNlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIHR5cGUgaXMgYSByZWZlcmVuY2Ugd2l0aG91dCBhIG93bmluZyBtb2R1bGUsIGNvbnNpZGVyIHRoZSB0eXBlIG5vdCB0byBiZSBlbGlnaWJsZSBmb3JcbiAgICAvLyBlbWl0dGluZy5cbiAgICBpZiAocmVmZXJlbmNlIGluc3RhbmNlb2YgUmVmZXJlbmNlICYmICFyZWZlcmVuY2UuaGFzT3duaW5nTW9kdWxlR3Vlc3MpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBUaGUgdHlwZSBjYW4gYmUgZW1pdHRlZCBpZiBlaXRoZXIgaXQgZG9lcyBub3QgaGF2ZSBhbnkgdHlwZSBhcmd1bWVudHMsIG9yIGFsbCBvZiB0aGVtIGNhbiBiZVxuICAgIC8vIGVtaXR0ZWQuXG4gICAgcmV0dXJuIHR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IHR5cGUudHlwZUFyZ3VtZW50cy5ldmVyeShjYW5FbWl0VHlwZVdvcmtlcik7XG4gIH1cbn1cblxuLyoqXG4gKiBHaXZlbiBhIGB0cy5UeXBlTm9kZWAsIHRoaXMgY2xhc3MgZGVyaXZlcyBhbiBlcXVpdmFsZW50IGB0cy5UeXBlTm9kZWAgdGhhdCBoYXMgYmVlbiBlbWl0dGVkIGludG9cbiAqIGEgZGlmZmVyZW50IGNvbnRleHQuXG4gKlxuICogRm9yIGV4YW1wbGUsIGNvbnNpZGVyIHRoZSBmb2xsb3dpbmcgY29kZTpcbiAqXG4gKiBgYGBcbiAqIGltcG9ydCB7TmdJdGVyYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG4gKlxuICogY2xhc3MgTmdGb3JPZjxULCBVIGV4dGVuZHMgTmdJdGVyYWJsZTxUPj4ge31cbiAqIGBgYFxuICpcbiAqIEhlcmUsIHRoZSBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBgVGAgYW5kIGBVYCBjYW4gYmUgZW1pdHRlZCBpbnRvIGEgZGlmZmVyZW50IGNvbnRleHQsIGFzIHRoZVxuICogdHlwZSByZWZlcmVuY2UgdG8gYE5nSXRlcmFibGVgIG9yaWdpbmF0ZXMgZnJvbSBhbiBhYnNvbHV0ZSBtb2R1bGUgaW1wb3J0IHNvIHRoYXQgaXQgY2FuIGJlXG4gKiBlbWl0dGVkIGFueXdoZXJlLCB1c2luZyB0aGF0IHNhbWUgbW9kdWxlIGltcG9ydC4gVGhlIHByb2Nlc3Mgb2YgZW1pdHRpbmcgdHJhbnNsYXRlcyB0aGVcbiAqIGBOZ0l0ZXJhYmxlYCB0eXBlIHJlZmVyZW5jZSB0byBhIHR5cGUgcmVmZXJlbmNlIHRoYXQgaXMgdmFsaWQgaW4gdGhlIGNvbnRleHQgaW4gd2hpY2ggaXQgaXNcbiAqIGVtaXR0ZWQsIGZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogaW1wb3J0ICogYXMgaTAgZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG4gKiBpbXBvcnQgKiBhcyBpMSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuICpcbiAqIGNvbnN0IF9jdG9yMTogPFQsIFUgZXh0ZW5kcyBpMC5OZ0l0ZXJhYmxlPFQ+PihvOiBQaWNrPGkxLk5nRm9yT2Y8VCwgVT4sICduZ0Zvck9mJz4pOlxuICogaTEuTmdGb3JPZjxULCBVPjtcbiAqIGBgYFxuICpcbiAqIE5vdGljZSBob3cgdGhlIHR5cGUgcmVmZXJlbmNlIGZvciBgTmdJdGVyYWJsZWAgaGFzIGJlZW4gdHJhbnNsYXRlZCBpbnRvIGEgcXVhbGlmaWVkIG5hbWUsXG4gKiByZWZlcnJpbmcgdG8gdGhlIG5hbWVzcGFjZSBpbXBvcnQgdGhhdCB3YXMgY3JlYXRlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIFR5cGVFbWl0dGVyIHtcbiAgLyoqXG4gICAqIFJlc29sdmVyIGZ1bmN0aW9uIHRoYXQgY29tcHV0ZXMgYSBgUmVmZXJlbmNlYCBjb3JyZXNwb25kaW5nIHdpdGggYSBgdHMuVHlwZVJlZmVyZW5jZU5vZGVgLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlcjogVHlwZVJlZmVyZW5jZVJlc29sdmVyO1xuXG4gIC8qKlxuICAgKiBHaXZlbiBhIGBSZWZlcmVuY2VgLCB0aGlzIGZ1bmN0aW9uIGlzIHJlc3BvbnNpYmxlIGZvciB0aGUgYWN0dWFsIGVtaXR0aW5nIHdvcmsuIEl0IHNob3VsZFxuICAgKiBwcm9kdWNlIGEgYHRzLlR5cGVOb2RlYCB0aGF0IGlzIHZhbGlkIHdpdGhpbiB0aGUgZGVzaXJlZCBjb250ZXh0LlxuICAgKi9cbiAgcHJpdmF0ZSBlbWl0UmVmZXJlbmNlOiAocmVmOiBSZWZlcmVuY2UpID0+IHRzLlR5cGVOb2RlO1xuXG4gIGNvbnN0cnVjdG9yKHJlc29sdmVyOiBUeXBlUmVmZXJlbmNlUmVzb2x2ZXIsIGVtaXRSZWZlcmVuY2U6IChyZWY6IFJlZmVyZW5jZSkgPT4gdHMuVHlwZU5vZGUpIHtcbiAgICB0aGlzLnJlc29sdmVyID0gcmVzb2x2ZXI7XG4gICAgdGhpcy5lbWl0UmVmZXJlbmNlID0gZW1pdFJlZmVyZW5jZTtcbiAgfVxuXG4gIGVtaXRUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKTogdHMuVHlwZU5vZGUge1xuICAgIHJldHVybiB2aXNpdFR5cGVOb2RlKHR5cGUsIHtcbiAgICAgIHZpc2l0VHlwZVJlZmVyZW5jZU5vZGU6IHR5cGUgPT4gdGhpcy5lbWl0VHlwZVJlZmVyZW5jZSh0eXBlKSxcbiAgICAgIHZpc2l0QXJyYXlUeXBlTm9kZTogdHlwZSA9PiB0cy51cGRhdGVBcnJheVR5cGVOb2RlKHR5cGUsIHRoaXMuZW1pdFR5cGUodHlwZS5lbGVtZW50VHlwZSkpLFxuICAgICAgdmlzaXRLZXl3b3JkVHlwZTogdHlwZSA9PiB0eXBlLFxuICAgICAgdmlzaXRPdGhlclR5cGU6ICgpID0+IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZW1pdCBhIGNvbXBsZXggdHlwZScpO1xuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZW1pdFR5cGVSZWZlcmVuY2UodHlwZTogdHMuVHlwZVJlZmVyZW5jZU5vZGUpOiB0cy5UeXBlTm9kZSB7XG4gICAgLy8gRGV0ZXJtaW5lIHRoZSByZWZlcmVuY2UgdGhhdCB0aGUgdHlwZSBjb3JyZXNwb25kcyB3aXRoLlxuICAgIGNvbnN0IHJlZmVyZW5jZSA9IHRoaXMucmVzb2x2ZXIodHlwZSk7XG4gICAgaWYgKHJlZmVyZW5jZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZW1pdCBhbiB1bnJlc29sdmVkIHJlZmVyZW5jZScpO1xuICAgIH1cblxuICAgIC8vIEVtaXQgdGhlIHR5cGUgYXJndW1lbnRzLCBpZiBhbnkuXG4gICAgbGV0IHR5cGVBcmd1bWVudHM6IHRzLk5vZGVBcnJheTx0cy5UeXBlTm9kZT58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmICh0eXBlLnR5cGVBcmd1bWVudHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUFyZ3VtZW50cyA9IHRzLmNyZWF0ZU5vZGVBcnJheSh0eXBlLnR5cGVBcmd1bWVudHMubWFwKHR5cGVBcmcgPT4gdGhpcy5lbWl0VHlwZSh0eXBlQXJnKSkpO1xuICAgIH1cblxuICAgIC8vIEVtaXQgdGhlIHR5cGUgbmFtZS5cbiAgICBsZXQgdHlwZU5hbWUgPSB0eXBlLnR5cGVOYW1lO1xuICAgIGlmIChyZWZlcmVuY2UgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIGlmICghcmVmZXJlbmNlLmhhc093bmluZ01vZHVsZUd1ZXNzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQSB0eXBlIHJlZmVyZW5jZSB0byBlbWl0IG11c3QgYmUgaW1wb3J0ZWQgZnJvbSBhbiBhYnNvbHV0ZSBtb2R1bGUnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZW1pdHRlZFR5cGUgPSB0aGlzLmVtaXRSZWZlcmVuY2UocmVmZXJlbmNlKTtcbiAgICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShlbWl0dGVkVHlwZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBUeXBlUmVmZXJlbmNlTm9kZSBmb3IgZW1pdHRlZCByZWZlcmVuY2UsIGdvdCAke1xuICAgICAgICAgICAgdHMuU3ludGF4S2luZFtlbWl0dGVkVHlwZS5raW5kXX1gKTtcbiAgICAgIH1cblxuICAgICAgdHlwZU5hbWUgPSBlbWl0dGVkVHlwZS50eXBlTmFtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHMudXBkYXRlVHlwZVJlZmVyZW5jZU5vZGUodHlwZSwgdHlwZU5hbWUsIHR5cGVBcmd1bWVudHMpO1xuICB9XG59XG5cbi8qKlxuICogVmlzaXRvciBpbnRlcmZhY2UgdGhhdCBhbGxvd3MgZm9yIHVuaWZpZWQgcmVjb2duaXRpb24gb2YgdGhlIGRpZmZlcmVudCB0eXBlcyBvZiBgdHMuVHlwZU5vZGVgcyxcbiAqIHNvIHRoYXQgYHZpc2l0VHlwZU5vZGVgIGlzIGEgY2VudHJhbGl6ZWQgcGllY2Ugb2YgcmVjb2duaXRpb24gbG9naWMgdG8gYmUgdXNlZCBpbiBib3RoXG4gKiBgY2FuRW1pdFR5cGVgIGFuZCBgVHlwZUVtaXR0ZXJgLlxuICovXG5pbnRlcmZhY2UgVHlwZUVtaXR0ZXJWaXNpdG9yPFI+IHtcbiAgdmlzaXRUeXBlUmVmZXJlbmNlTm9kZSh0eXBlOiB0cy5UeXBlUmVmZXJlbmNlTm9kZSk6IFI7XG4gIHZpc2l0QXJyYXlUeXBlTm9kZSh0eXBlOiB0cy5BcnJheVR5cGVOb2RlKTogUjtcbiAgdmlzaXRLZXl3b3JkVHlwZSh0eXBlOiB0cy5LZXl3b3JkVHlwZU5vZGUpOiBSO1xuICB2aXNpdE90aGVyVHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IFI7XG59XG5cbmZ1bmN0aW9uIHZpc2l0VHlwZU5vZGU8Uj4odHlwZTogdHMuVHlwZU5vZGUsIHZpc2l0b3I6IFR5cGVFbWl0dGVyVmlzaXRvcjxSPik6IFIge1xuICBpZiAodHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlKSkge1xuICAgIHJldHVybiB2aXNpdG9yLnZpc2l0VHlwZVJlZmVyZW5jZU5vZGUodHlwZSk7XG4gIH0gZWxzZSBpZiAodHMuaXNBcnJheVR5cGVOb2RlKHR5cGUpKSB7XG4gICAgcmV0dXJuIHZpc2l0b3IudmlzaXRBcnJheVR5cGVOb2RlKHR5cGUpO1xuICB9XG5cbiAgc3dpdGNoICh0eXBlLmtpbmQpIHtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuQW55S2V5d29yZDpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuVW5rbm93bktleXdvcmQ6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLk51bWJlcktleXdvcmQ6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLk9iamVjdEtleXdvcmQ6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkJvb2xlYW5LZXl3b3JkOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5TdHJpbmdLZXl3b3JkOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5VbmRlZmluZWRLZXl3b3JkOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5OdWxsS2V5d29yZDpcbiAgICAgIHJldHVybiB2aXNpdG9yLnZpc2l0S2V5d29yZFR5cGUodHlwZSBhcyB0cy5LZXl3b3JkVHlwZU5vZGUpO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gdmlzaXRvci52aXNpdE90aGVyVHlwZSh0eXBlKTtcbiAgfVxufVxuIl19