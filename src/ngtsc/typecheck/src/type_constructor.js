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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var ts_util_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util");
    function generateTypeCtorDeclarationFn(node, meta, nodeTypeRef) {
        if (requiresInlineTypeCtor(node)) {
            throw new Error(node.name.text + " requires an inline type constructor");
        }
        var rawTypeArgs = node.typeParameters !== undefined ? generateGenericArgs(node.typeParameters) : undefined;
        var rawType = ts.createTypeReferenceNode(nodeTypeRef, rawTypeArgs);
        var initParam = constructTypeCtorParameter(node, meta, rawType);
        if (meta.body) {
            var fnType = ts.createFunctionTypeNode(
            /* typeParameters */ node.typeParameters, 
            /* parameters */ [initParam], 
            /* type */ rawType);
            var decl = ts.createVariableDeclaration(
            /* name */ meta.fnName, 
            /* type */ fnType, 
            /* body */ ts.createNonNullExpression(ts.createNull()));
            var declList = ts.createVariableDeclarationList([decl], ts.NodeFlags.Const);
            return ts.createVariableStatement(
            /* modifiers */ undefined, 
            /* declarationList */ declList);
        }
        else {
            return ts.createFunctionDeclaration(
            /* decorators */ undefined, 
            /* modifiers */ [ts.createModifier(ts.SyntaxKind.DeclareKeyword)], 
            /* asteriskToken */ undefined, 
            /* name */ meta.fnName, 
            /* typeParameters */ node.typeParameters, 
            /* parameters */ [initParam], 
            /* type */ rawType, 
            /* body */ undefined);
        }
    }
    exports.generateTypeCtorDeclarationFn = generateTypeCtorDeclarationFn;
    /**
     * Generate an inline type constructor for the given class and metadata.
     *
     * An inline type constructor is a specially shaped TypeScript static method, intended to be placed
     * within a directive class itself, that permits type inference of any generic type parameters of
     * the class from the types of expressions bound to inputs or outputs, and the types of elements
     * that match queries performed by the directive. It also catches any errors in the types of these
     * expressions. This method is never called at runtime, but is used in type-check blocks to
     * construct directive types.
     *
     * An inline type constructor for NgFor looks like:
     *
     * static ngTypeCtor<T>(init: Partial<Pick<NgForOf<T>, 'ngForOf'|'ngForTrackBy'|'ngForTemplate'>>):
     *   NgForOf<T>;
     *
     * A typical constructor would be:
     *
     * NgForOf.ngTypeCtor(init: {ngForOf: ['foo', 'bar']}); // Infers a type of NgForOf<string>.
     *
     * Inline type constructors are used when the type being created has bounded generic types which
     * make writing a declared type constructor (via `generateTypeCtorDeclarationFn`) difficult or
     * impossible.
     *
     * @param node the `ClassDeclaration<ts.ClassDeclaration>` for which a type constructor will be
     * generated.
     * @param meta additional metadata required to generate the type constructor.
     * @returns a `ts.MethodDeclaration` for the type constructor.
     */
    function generateInlineTypeCtor(node, meta) {
        // Build rawType, a `ts.TypeNode` of the class with its generic parameters passed through from
        // the definition without any type bounds. For example, if the class is
        // `FooDirective<T extends Bar>`, its rawType would be `FooDirective<T>`.
        var rawTypeArgs = node.typeParameters !== undefined ? generateGenericArgs(node.typeParameters) : undefined;
        var rawType = ts.createTypeReferenceNode(node.name, rawTypeArgs);
        var initParam = constructTypeCtorParameter(node, meta, rawType);
        // If this constructor is being generated into a .ts file, then it needs a fake body. The body
        // is set to a return of `null!`. If the type constructor is being generated into a .d.ts file,
        // it needs no body.
        var body = undefined;
        if (meta.body) {
            body = ts.createBlock([
                ts.createReturn(ts.createNonNullExpression(ts.createNull())),
            ]);
        }
        // Create the type constructor method declaration.
        return ts.createMethod(
        /* decorators */ undefined, 
        /* modifiers */ [ts.createModifier(ts.SyntaxKind.StaticKeyword)], 
        /* asteriskToken */ undefined, 
        /* name */ meta.fnName, 
        /* questionToken */ undefined, 
        /* typeParameters */ node.typeParameters, 
        /* parameters */ [initParam], 
        /* type */ rawType, 
        /* body */ body);
    }
    exports.generateInlineTypeCtor = generateInlineTypeCtor;
    function constructTypeCtorParameter(node, meta, rawType) {
        // initType is the type of 'init', the single argument to the type constructor method.
        // If the Directive has any inputs, outputs, or queries, its initType will be:
        //
        // Partial<Pick<rawType, 'inputField'|'outputField'|'queryField'>>
        //
        // Pick here is used to select only those fields from which the generic type parameters of the
        // directive will be inferred. Partial is used because inputs are optional, so there may not be
        // bindings for each field.
        //
        // In the special case there are no inputs/outputs/etc, initType is set to {}.
        var initType;
        var keys = tslib_1.__spread(meta.fields.inputs, meta.fields.outputs, meta.fields.queries);
        if (keys.length === 0) {
            // Special case - no inputs, outputs, or other fields which could influence the result type.
            initType = ts.createTypeLiteralNode([]);
        }
        else {
            // Construct a union of all the field names.
            var keyTypeUnion = ts.createUnionTypeNode(keys.map(function (key) { return ts.createLiteralTypeNode(ts.createStringLiteral(key)); }));
            // Construct the Pick<rawType, keyTypeUnion>.
            var pickType = ts.createTypeReferenceNode('Pick', [rawType, keyTypeUnion]);
            // Construct the Partial<pickType>.
            initType = ts.createTypeReferenceNode('Partial', [pickType]);
        }
        // Create the 'init' parameter itself.
        return ts.createParameter(
        /* decorators */ undefined, 
        /* modifiers */ undefined, 
        /* dotDotDotToken */ undefined, 
        /* name */ 'init', 
        /* questionToken */ undefined, 
        /* type */ initType, 
        /* initializer */ undefined);
    }
    function generateGenericArgs(params) {
        return params.map(function (param) { return ts.createTypeReferenceNode(param.name, undefined); });
    }
    function requiresInlineTypeCtor(node) {
        // The class requires an inline type constructor if it has constrained (bound) generics.
        return !ts_util_1.checkIfGenericTypesAreUnbound(node);
    }
    exports.requiresInlineTypeCtor = requiresInlineTypeCtor;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jb25zdHJ1Y3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NvbnN0cnVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUlqQyxpRkFBd0Q7SUFFeEQsU0FBZ0IsNkJBQTZCLENBQ3pDLElBQTJDLEVBQUUsSUFBc0IsRUFDbkUsV0FBNkM7UUFDL0MsSUFBSSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNoQyxNQUFNLElBQUksS0FBSyxDQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSx5Q0FBc0MsQ0FBQyxDQUFDO1NBQzFFO1FBRUQsSUFBTSxXQUFXLEdBQ2IsSUFBSSxDQUFDLGNBQWMsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQzdGLElBQU0sT0FBTyxHQUFnQixFQUFFLENBQUMsdUJBQXVCLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRWxGLElBQU0sU0FBUyxHQUFHLDBCQUEwQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFbEUsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2IsSUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLHNCQUFzQjtZQUNwQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYztZQUN4QyxnQkFBZ0IsQ0FBQSxDQUFDLFNBQVMsQ0FBQztZQUMzQixVQUFVLENBQUMsT0FBTyxDQUFHLENBQUM7WUFFMUIsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLHlCQUF5QjtZQUNyQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU07WUFDdEIs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QUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBakQsQ0FBaUQsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFFRCxTQUFnQixzQkFBc0IsQ0FBQyxJQUEyQztRQUNoRix3RkFBd0Y7UUFDeEYsT0FBTyxDQUFDLHVDQUE2QixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFIRCx3REFHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge1R5cGVDdG9yTWV0YWRhdGF9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7Y2hlY2tJZkdlbmVyaWNUeXBlc0FyZVVuYm91bmR9IGZyb20gJy4vdHNfdXRpbCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVR5cGVDdG9yRGVjbGFyYXRpb25GbihcbiAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+LCBtZXRhOiBUeXBlQ3Rvck1ldGFkYXRhLFxuICAgIG5vZGVUeXBlUmVmOiB0cy5JZGVudGlmaWVyIHwgdHMuUXVhbGlmaWVkTmFtZSk6IHRzLlN0YXRlbWVudCB7XG4gIGlmIChyZXF1aXJlc0lubGluZVR5cGVDdG9yKG5vZGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke25vZGUubmFtZS50ZXh0fSByZXF1aXJlcyBhbiBpbmxpbmUgdHlwZSBjb25zdHJ1Y3RvcmApO1xuICB9XG5cbiAgY29uc3QgcmF3VHlwZUFyZ3MgPVxuICAgICAgbm9kZS50eXBlUGFyYW1ldGVycyAhPT0gdW5kZWZpbmVkID8gZ2VuZXJhdGVHZW5lcmljQXJncyhub2RlLnR5cGVQYXJhbWV0ZXJzKSA6IHVuZGVmaW5lZDtcbiAgY29uc3QgcmF3VHlwZTogdHMuVHlwZU5vZGUgPSB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShub2RlVHlwZVJlZiwgcmF3VHlwZUFyZ3MpO1xuXG4gIGNvbnN0IGluaXRQYXJhbSA9IGNvbnN0cnVjdFR5cGVDdG9yUGFyYW1ldGVyKG5vZGUsIG1ldGEsIHJhd1R5cGUpO1xuXG4gIGlmIChtZXRhLmJvZHkpIHtcbiAgICBjb25zdCBmblR5cGUgPSB0cy5jcmVhdGVGdW5jdGlvblR5cGVOb2RlKFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyBub2RlLnR5cGVQYXJhbWV0ZXJzLFxuICAgICAgICAvKiBwYXJhbWV0ZXJzICovW2luaXRQYXJhbV0sXG4gICAgICAgIC8qIHR5cGUgKi8gcmF3VHlwZSwgKTtcblxuICAgIGNvbnN0IGRlY2wgPSB0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgICAvKiBuYW1lICovIG1ldGEuZm5OYW1lLFxuICAgICAgICAvKiB0eXBlICovIGZuVHlwZSxcbiAgICAgICAgLyogYm9keSAqLyB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbih0cy5jcmVhdGVOdWxsKCkpKTtcbiAgICBjb25zdCBkZWNsTGlzdCA9IHRzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KFtkZWNsXSwgdHMuTm9kZUZsYWdzLkNvbnN0KTtcbiAgICByZXR1cm4gdHMuY3JlYXRlVmFyaWFibGVTdGF0ZW1lbnQoXG4gICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIGRlY2xhcmF0aW9uTGlzdCAqLyBkZWNsTGlzdCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBtb2RpZmllcnMgKi9bdHMuY3JlYXRlTW9kaWZpZXIodHMuU3ludGF4S2luZC5EZWNsYXJlS2V5d29yZCldLFxuICAgICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgLyogbmFtZSAqLyBtZXRhLmZuTmFtZSxcbiAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gbm9kZS50eXBlUGFyYW1ldGVycyxcbiAgICAgICAgLyogcGFyYW1ldGVycyAqL1tpbml0UGFyYW1dLFxuICAgICAgICAvKiB0eXBlICovIHJhd1R5cGUsXG4gICAgICAgIC8qIGJvZHkgKi8gdW5kZWZpbmVkKTtcbiAgfVxufVxuXG4vKipcbiAqIEdlbmVyYXRlIGFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gY2xhc3MgYW5kIG1ldGFkYXRhLlxuICpcbiAqIEFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yIGlzIGEgc3BlY2lhbGx5IHNoYXBlZCBUeXBlU2NyaXB0IHN0YXRpYyBtZXRob2QsIGludGVuZGVkIHRvIGJlIHBsYWNlZFxuICogd2l0aGluIGEgZGlyZWN0aXZlIGNsYXNzIGl0c2VsZiwgdGhhdCBwZXJtaXRzIHR5cGUgaW5mZXJlbmNlIG9mIGFueSBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBvZlxuICogdGhlIGNsYXNzIGZyb20gdGhlIHR5cGVzIG9mIGV4cHJlc3Npb25zIGJvdW5kIHRvIGlucHV0cyBvciBvdXRwdXRzLCBhbmQgdGhlIHR5cGVzIG9mIGVsZW1lbnRzXG4gKiB0aGF0IG1hdGNoIHF1ZXJpZXMgcGVyZm9ybWVkIGJ5IHRoZSBkaXJlY3RpdmUuIEl0IGFsc28gY2F0Y2hlcyBhbnkgZXJyb3JzIGluIHRoZSB0eXBlcyBvZiB0aGVzZVxuICogZXhwcmVzc2lvbnMuIFRoaXMgbWV0aG9kIGlzIG5ldmVyIGNhbGxlZCBhdCBydW50aW1lLCBidXQgaXMgdXNlZCBpbiB0eXBlLWNoZWNrIGJsb2NrcyB0b1xuICogY29uc3RydWN0IGRpcmVjdGl2ZSB0eXBlcy5cbiAqXG4gKiBBbiBpbmxpbmUgdHlwZSBjb25zdHJ1Y3RvciBmb3IgTmdGb3IgbG9va3MgbGlrZTpcbiAqXG4gKiBzdGF0aWMgbmdUeXBlQ3RvcjxUPihpbml0OiBQYXJ0aWFsPFBpY2s8TmdGb3JPZjxUPiwgJ25nRm9yT2YnfCduZ0ZvclRyYWNrQnknfCduZ0ZvclRlbXBsYXRlJz4+KTpcbiAqICAgTmdGb3JPZjxUPjtcbiAqXG4gKiBBIHR5cGljYWwgY29uc3RydWN0b3Igd291bGQgYmU6XG4gKlxuICogTmdGb3JPZi5uZ1R5cGVDdG9yKGluaXQ6IHtuZ0Zvck9mOiBbJ2ZvbycsICdiYXInXX0pOyAvLyBJbmZlcnMgYSB0eXBlIG9mIE5nRm9yT2Y8c3RyaW5nPi5cbiAqXG4gKiBJbmxpbmUgdHlwZSBjb25zdHJ1Y3RvcnMgYXJlIHVzZWQgd2hlbiB0aGUgdHlwZSBiZWluZyBjcmVhdGVkIGhhcyBib3VuZGVkIGdlbmVyaWMgdHlwZXMgd2hpY2hcbiAqIG1ha2Ugd3JpdGluZyBhIGRlY2xhcmVkIHR5cGUgY29uc3RydWN0b3IgKHZpYSBgZ2VuZXJhdGVUeXBlQ3RvckRlY2xhcmF0aW9uRm5gKSBkaWZmaWN1bHQgb3JcbiAqIGltcG9zc2libGUuXG4gKlxuICogQHBhcmFtIG5vZGUgdGhlIGBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+YCBmb3Igd2hpY2ggYSB0eXBlIGNvbnN0cnVjdG9yIHdpbGwgYmVcbiAqIGdlbmVyYXRlZC5cbiAqIEBwYXJhbSBtZXRhIGFkZGl0aW9uYWwgbWV0YWRhdGEgcmVxdWlyZWQgdG8gZ2VuZXJhdGUgdGhlIHR5cGUgY29uc3RydWN0b3IuXG4gKiBAcmV0dXJucyBhIGB0cy5NZXRob2REZWNsYXJhdGlvbmAgZm9yIHRoZSB0eXBlIGNvbnN0cnVjdG9yLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVJbmxpbmVUeXBlQ3RvcihcbiAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+LCBtZXRhOiBUeXBlQ3Rvck1ldGFkYXRhKTogdHMuTWV0aG9kRGVjbGFyYXRpb24ge1xuICAvLyBCdWlsZCByYXdUeXBlLCBhIGB0cy5UeXBlTm9kZWAgb2YgdGhlIGNsYXNzIHdpdGggaXRzIGdlbmVyaWMgcGFyYW1ldGVycyBwYXNzZWQgdGhyb3VnaCBmcm9tXG4gIC8vIHRoZSBkZWZpbml0aW9uIHdpdGhvdXQgYW55IHR5cGUgYm91bmRzLiBGb3IgZXhhbXBsZSwgaWYgdGhlIGNsYXNzIGlzXG4gIC8vIGBGb29EaXJlY3RpdmU8VCBleHRlbmRzIEJhcj5gLCBpdHMgcmF3VHlwZSB3b3VsZCBiZSBgRm9vRGlyZWN0aXZlPFQ+YC5cbiAgY29uc3QgcmF3VHlwZUFyZ3MgPVxuICAgICAgbm9kZS50eXBlUGFyYW1ldGVycyAhPT0gdW5kZWZpbmVkID8gZ2VuZXJhdGVHZW5lcmljQXJncyhub2RlLnR5cGVQYXJhbWV0ZXJzKSA6IHVuZGVmaW5lZDtcbiAgY29uc3QgcmF3VHlwZTogdHMuVHlwZU5vZGUgPSB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShub2RlLm5hbWUsIHJhd1R5cGVBcmdzKTtcblxuICBjb25zdCBpbml0UGFyYW0gPSBjb25zdHJ1Y3RUeXBlQ3RvclBhcmFtZXRlcihub2RlLCBtZXRhLCByYXdUeXBlKTtcblxuICAvLyBJZiB0aGlzIGNvbnN0cnVjdG9yIGlzIGJlaW5nIGdlbmVyYXRlZCBpbnRvIGEgLnRzIGZpbGUsIHRoZW4gaXQgbmVlZHMgYSBmYWtlIGJvZHkuIFRoZSBib2R5XG4gIC8vIGlzIHNldCB0byBhIHJldHVybiBvZiBgbnVsbCFgLiBJZiB0aGUgdHlwZSBjb25zdHJ1Y3RvciBpcyBiZWluZyBnZW5lcmF0ZWQgaW50byBhIC5kLnRzIGZpbGUsXG4gIC8vIGl0IG5lZWRzIG5vIGJvZHkuXG4gIGxldCBib2R5OiB0cy5CbG9ja3x1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGlmIChtZXRhLmJvZHkpIHtcbiAgICBib2R5ID0gdHMuY3JlYXRlQmxvY2soW1xuICAgICAgdHMuY3JlYXRlUmV0dXJuKHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSkpLFxuICAgIF0pO1xuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSB0eXBlIGNvbnN0cnVjdG9yIG1ldGhvZCBkZWNsYXJhdGlvbi5cbiAgcmV0dXJuIHRzLmNyZWF0ZU1ldGhvZChcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovW3RzLmNyZWF0ZU1vZGlmaWVyKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCldLFxuICAgICAgLyogYXN0ZXJpc2tUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBuYW1lICovIG1ldGEuZm5OYW1lLFxuICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyBub2RlLnR5cGVQYXJhbWV0ZXJzLFxuICAgICAgLyogcGFyYW1ldGVycyAqL1tpbml0UGFyYW1dLFxuICAgICAgLyogdHlwZSAqLyByYXdUeXBlLFxuICAgICAgLyogYm9keSAqLyBib2R5LCApO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RUeXBlQ3RvclBhcmFtZXRlcihcbiAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+LCBtZXRhOiBUeXBlQ3Rvck1ldGFkYXRhLFxuICAgIHJhd1R5cGU6IHRzLlR5cGVOb2RlKTogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24ge1xuICAvLyBpbml0VHlwZSBpcyB0aGUgdHlwZSBvZiAnaW5pdCcsIHRoZSBzaW5nbGUgYXJndW1lbnQgdG8gdGhlIHR5cGUgY29uc3RydWN0b3IgbWV0aG9kLlxuICAvLyBJZiB0aGUgRGlyZWN0aXZlIGhhcyBhbnkgaW5wdXRzLCBvdXRwdXRzLCBvciBxdWVyaWVzLCBpdHMgaW5pdFR5cGUgd2lsbCBiZTpcbiAgLy9cbiAgLy8gUGFydGlhbDxQaWNrPHJhd1R5cGUsICdpbnB1dEZpZWxkJ3wnb3V0cHV0RmllbGQnfCdxdWVyeUZpZWxkJz4+XG4gIC8vXG4gIC8vIFBpY2sgaGVyZSBpcyB1c2VkIHRvIHNlbGVjdCBvbmx5IHRob3NlIGZpZWxkcyBmcm9tIHdoaWNoIHRoZSBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBvZiB0aGVcbiAgLy8gZGlyZWN0aXZlIHdpbGwgYmUgaW5mZXJyZWQuIFBhcnRpYWwgaXMgdXNlZCBiZWNhdXNlIGlucHV0cyBhcmUgb3B0aW9uYWwsIHNvIHRoZXJlIG1heSBub3QgYmVcbiAgLy8gYmluZGluZ3MgZm9yIGVhY2ggZmllbGQuXG4gIC8vXG4gIC8vIEluIHRoZSBzcGVjaWFsIGNhc2UgdGhlcmUgYXJlIG5vIGlucHV0cy9vdXRwdXRzL2V0YywgaW5pdFR5cGUgaXMgc2V0IHRvIHt9LlxuICBsZXQgaW5pdFR5cGU6IHRzLlR5cGVOb2RlO1xuXG4gIGNvbnN0IGtleXM6IHN0cmluZ1tdID0gW1xuICAgIC4uLm1ldGEuZmllbGRzLmlucHV0cyxcbiAgICAuLi5tZXRhLmZpZWxkcy5vdXRwdXRzLFxuICAgIC4uLm1ldGEuZmllbGRzLnF1ZXJpZXMsXG4gIF07XG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIC8vIFNwZWNpYWwgY2FzZSAtIG5vIGlucHV0cywgb3V0cHV0cywgb3Igb3RoZXIgZmllbGRzIHdoaWNoIGNvdWxkIGluZmx1ZW5jZSB0aGUgcmVzdWx0IHR5cGUuXG4gICAgaW5pdFR5cGUgPSB0cy5jcmVhdGVUeXBlTGl0ZXJhbE5vZGUoW10pO1xuICB9IGVsc2Uge1xuICAgIC8vIENvbnN0cnVjdCBhIHVuaW9uIG9mIGFsbCB0aGUgZmllbGQgbmFtZXMuXG4gICAgY29uc3Qga2V5VHlwZVVuaW9uID0gdHMuY3JlYXRlVW5pb25UeXBlTm9kZShcbiAgICAgICAga2V5cy5tYXAoa2V5ID0+IHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGtleSkpKSk7XG5cbiAgICAvLyBDb25zdHJ1Y3QgdGhlIFBpY2s8cmF3VHlwZSwga2V5VHlwZVVuaW9uPi5cbiAgICBjb25zdCBwaWNrVHlwZSA9IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKCdQaWNrJywgW3Jhd1R5cGUsIGtleVR5cGVVbmlvbl0pO1xuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBQYXJ0aWFsPHBpY2tUeXBlPi5cbiAgICBpbml0VHlwZSA9IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKCdQYXJ0aWFsJywgW3BpY2tUeXBlXSk7XG4gIH1cblxuICAvLyBDcmVhdGUgdGhlICdpbml0JyBwYXJhbWV0ZXIgaXRzZWxmLlxuICByZXR1cm4gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyAnaW5pdCcsXG4gICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGUgKi8gaW5pdFR5cGUsXG4gICAgICAvKiBpbml0aWFsaXplciAqLyB1bmRlZmluZWQpO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUdlbmVyaWNBcmdzKHBhcmFtczogUmVhZG9ubHlBcnJheTx0cy5UeXBlUGFyYW1ldGVyRGVjbGFyYXRpb24+KTogdHMuVHlwZU5vZGVbXSB7XG4gIHJldHVybiBwYXJhbXMubWFwKHBhcmFtID0+IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKHBhcmFtLm5hbWUsIHVuZGVmaW5lZCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVxdWlyZXNJbmxpbmVUeXBlQ3Rvcihub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+KTogYm9vbGVhbiB7XG4gIC8vIFRoZSBjbGFzcyByZXF1aXJlcyBhbiBpbmxpbmUgdHlwZSBjb25zdHJ1Y3RvciBpZiBpdCBoYXMgY29uc3RyYWluZWQgKGJvdW5kKSBnZW5lcmljcy5cbiAgcmV0dXJuICFjaGVja0lmR2VuZXJpY1R5cGVzQXJlVW5ib3VuZChub2RlKTtcbn1cbiJdfQ==