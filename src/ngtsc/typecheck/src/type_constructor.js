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
    function generateTypeCtorDeclarationFn(node, meta, nodeTypeRef, config) {
        if (requiresInlineTypeCtor(node)) {
            throw new Error(node.name.text + " requires an inline type constructor");
        }
        var rawTypeArgs = node.typeParameters !== undefined ? generateGenericArgs(node.typeParameters) : undefined;
        var rawType = ts.createTypeReferenceNode(nodeTypeRef, rawTypeArgs);
        var initParam = constructTypeCtorParameter(node, meta, rawType);
        var typeParameters = typeParametersWithDefaultTypes(node.typeParameters);
        if (meta.body) {
            var fnType = ts.createFunctionTypeNode(
            /* typeParameters */ typeParameters, 
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
            /* typeParameters */ typeParameters, 
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
     * static ngTypeCtor<T>(init: Pick<NgForOf<T>, 'ngForOf'|'ngForTrackBy'|'ngForTemplate'>):
     *   NgForOf<T>;
     *
     * A typical constructor would be:
     *
     * NgForOf.ngTypeCtor(init: {
     *   ngForOf: ['foo', 'bar'],
     *   ngForTrackBy: null as any,
     *   ngForTemplate: null as any,
     * }); // Infers a type of NgForOf<string>.
     *
     * Any inputs declared on the type for which no property binding is present are assigned a value of
     * type `any`, to avoid producing any type errors for unset inputs.
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
        /* typeParameters */ typeParametersWithDefaultTypes(node.typeParameters), 
        /* parameters */ [initParam], 
        /* type */ rawType, 
        /* body */ body);
    }
    exports.generateInlineTypeCtor = generateInlineTypeCtor;
    function constructTypeCtorParameter(node, meta, rawType) {
        var e_1, _a;
        // initType is the type of 'init', the single argument to the type constructor method.
        // If the Directive has any inputs, its initType will be:
        //
        // Pick<rawType, 'inputA'|'inputB'>
        //
        // Pick here is used to select only those fields from which the generic type parameters of the
        // directive will be inferred.
        //
        // In the special case there are no inputs, initType is set to {}.
        var initType = null;
        var keys = meta.fields.inputs;
        var plainKeys = [];
        var coercedKeys = [];
        try {
            for (var keys_1 = tslib_1.__values(keys), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
                var key = keys_1_1.value;
                if (!meta.coercedInputFields.has(key)) {
                    plainKeys.push(ts.createLiteralTypeNode(ts.createStringLiteral(key)));
                }
                else {
                    coercedKeys.push(ts.createPropertySignature(
                    /* modifiers */ undefined, 
                    /* name */ key, 
                    /* questionToken */ undefined, 
                    /* type */ ts.createTypeQueryNode(ts.createQualifiedName(rawType.typeName, "ngAcceptInputType_" + key)), 
                    /* initializer */ undefined));
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (keys_1_1 && !keys_1_1.done && (_a = keys_1.return)) _a.call(keys_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (plainKeys.length > 0) {
            // Construct a union of all the field names.
            var keyTypeUnion = ts.createUnionTypeNode(plainKeys);
            // Construct the Pick<rawType, keyTypeUnion>.
            initType = ts.createTypeReferenceNode('Pick', [rawType, keyTypeUnion]);
        }
        if (coercedKeys.length > 0) {
            var coercedLiteral = ts.createTypeLiteralNode(coercedKeys);
            initType =
                initType !== null ? ts.createUnionTypeNode([initType, coercedLiteral]) : coercedLiteral;
        }
        if (initType === null) {
            // Special case - no inputs, outputs, or other fields which could influence the result type.
            initType = ts.createTypeLiteralNode([]);
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
    /**
     * Add a default `= any` to type parameters that don't have a default value already.
     *
     * TypeScript uses the default type of a type parameter whenever inference of that parameter fails.
     * This can happen when inferring a complex type from 'any'. For example, if `NgFor`'s inference is
     * done with the TCB code:
     *
     * ```
     * class NgFor<T> {
     *   ngForOf: T[];
     * }
     *
     * declare function ctor<T>(o: Pick<NgFor<T>, 'ngForOf'|'ngForTrackBy'|'ngForTemplate'>): NgFor<T>;
     * ```
     *
     * An invocation looks like:
     *
     * ```
     * var _t1 = ctor({ngForOf: [1, 2], ngForTrackBy: null as any, ngForTemplate: null as any});
     * ```
     *
     * This correctly infers the type `NgFor<number>` for `_t1`, since `T` is inferred from the
     * assignment of type `number[]` to `ngForOf`'s type `T[]`. However, if `any` is passed instead:
     *
     * ```
     * var _t2 = ctor({ngForOf: [1, 2] as any, ngForTrackBy: null as any, ngForTemplate: null as any});
     * ```
     *
     * then inference for `T` fails (it cannot be inferred from `T[] = any`). In this case, `T` takes
     * the type `{}`, and so `_t2` is inferred as `NgFor<{}>`. This is obviously wrong.
     *
     * Adding a default type to the generic declaration in the constructor solves this problem, as the
     * default type will be used in the event that inference fails.
     *
     * ```
     * declare function ctor<T = any>(o: Pick<NgFor<T>, 'ngForOf'>): NgFor<T>;
     *
     * var _t3 = ctor({ngForOf: [1, 2] as any});
     * ```
     *
     * This correctly infers `T` as `any`, and therefore `_t3` as `NgFor<any>`.
     */
    function typeParametersWithDefaultTypes(params) {
        if (params === undefined) {
            return undefined;
        }
        return params.map(function (param) {
            if (param.default === undefined) {
                return ts.updateTypeParameterDeclaration(
                /* node */ param, 
                /* name */ param.name, 
                /* constraint */ param.constraint, 
                /* defaultType */ ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
            }
            else {
                return param;
            }
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jb25zdHJ1Y3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NvbnN0cnVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUtqQyxpRkFBd0Q7SUFFeEQsU0FBZ0IsNkJBQTZCLENBQ3pDLElBQTJDLEVBQUUsSUFBc0IsRUFDbkUsV0FBNkMsRUFBRSxNQUEwQjtRQUMzRSxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLHlDQUFzQyxDQUFDLENBQUM7U0FDMUU7UUFFRCxJQUFNLFdBQVcsR0FDYixJQUFJLENBQUMsY0FBYyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDN0YsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLHVCQUF1QixDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVyRSxJQUFNLFNBQVMsR0FBRywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRWxFLElBQU0sY0FBYyxHQUFHLDhCQUE4QixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUUzRSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDYixJQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsc0JBQXNCO1lBQ3BDLG9CQUFvQixDQUFDLGNBQWM7WUFDbkMsZ0JBQWdCLENBQUEsQ0FBQyxTQUFTLENBQUM7WUFDM0IsVUFBVSxDQUFDLE9BQU8sQ0FBRyxDQUFDO1lBRTFCLElBQU0sSUFBSSxH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QU0sS0FBSyxTQUFTLEVBQUU7WUFDeEIsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFFRCxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBQSxLQUFLO1lBQ3JCLElBQUksS0FBSyxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUU7Z0JBQy9CLE9BQU8sRUFBRSxDQUFDLDhCQUE4QjtnQkFDcEMsVUFBVSxDQUFDLEtBQUs7Z0JBQ2hCLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSTtnQkFDckIsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFVBQVU7Z0JBQ2pDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7YUFDM0U7aUJBQU07Z0JBQ0wsT0FBTyxLQUFLLENBQUM7YUFDZDtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmltcG9ydCB7VHlwZUNoZWNraW5nQ29uZmlnLCBUeXBlQ3Rvck1ldGFkYXRhfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2NoZWNrSWZHZW5lcmljVHlwZXNBcmVVbmJvdW5kfSBmcm9tICcuL3RzX3V0aWwnO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUeXBlQ3RvckRlY2xhcmF0aW9uRm4oXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPiwgbWV0YTogVHlwZUN0b3JNZXRhZGF0YSxcbiAgICBub2RlVHlwZVJlZjogdHMuSWRlbnRpZmllciB8IHRzLlF1YWxpZmllZE5hbWUsIGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnKTogdHMuU3RhdGVtZW50IHtcbiAgaWYgKHJlcXVpcmVzSW5saW5lVHlwZUN0b3Iobm9kZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bm9kZS5uYW1lLnRleHR9IHJlcXVpcmVzIGFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yYCk7XG4gIH1cblxuICBjb25zdCByYXdUeXBlQXJncyA9XG4gICAgICBub2RlLnR5cGVQYXJhbWV0ZXJzICE9PSB1bmRlZmluZWQgPyBnZW5lcmF0ZUdlbmVyaWNBcmdzKG5vZGUudHlwZVBhcmFtZXRlcnMpIDogdW5kZWZpbmVkO1xuICBjb25zdCByYXdUeXBlID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUobm9kZVR5cGVSZWYsIHJhd1R5cGVBcmdzKTtcblxuICBjb25zdCBpbml0UGFyYW0gPSBjb25zdHJ1Y3RUeXBlQ3RvclBhcmFtZXRlcihub2RlLCBtZXRhLCByYXdUeXBlKTtcblxuICBjb25zdCB0eXBlUGFyYW1ldGVycyA9IHR5cGVQYXJhbWV0ZXJzV2l0aERlZmF1bHRUeXBlcyhub2RlLnR5cGVQYXJhbWV0ZXJzKTtcblxuICBpZiAobWV0YS5ib2R5KSB7XG4gICAgY29uc3QgZm5UeXBlID0gdHMuY3JlYXRlRnVuY3Rpb25UeXBlTm9kZShcbiAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gdHlwZVBhcmFtZXRlcnMsXG4gICAgICAgIC8qIHBhcmFtZXRlcnMgKi9baW5pdFBhcmFtXSxcbiAgICAgICAgLyogdHlwZSAqLyByYXdUeXBlLCApO1xuXG4gICAgY29uc3QgZGVjbCA9IHRzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24oXG4gICAgICAgIC8qIG5hbWUgKi8gbWV0YS5mbk5hbWUsXG4gICAgICAgIC8qIHR5cGUgKi8gZm5UeXBlLFxuICAgICAgICAvKiBib2R5ICovIHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSkpO1xuICAgIGNvbnN0IGRlY2xMaXN0ID0gdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3QoW2RlY2xdLCB0cy5Ob2RlRmxhZ3MuQ29uc3QpO1xuICAgIHJldHVybiB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudChcbiAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgLyogZGVjbGFyYXRpb25MaXN0ICovIGRlY2xMaXN0KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIG1vZGlmaWVycyAqL1t0cy5jcmVhdGVNb2RpZmllcih0cy5TeW50YXhLaW5kLkRlY2xhcmVLZXl3b3JkKV0sXG4gICAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBuYW1lICovIG1ldGEuZm5OYW1lLFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB0eXBlUGFyYW1ldGVycyxcbiAgICAgICAgLyogcGFyYW1ldGVycyAqL1tpbml0UGFyYW1dLFxuICAgICAgICAvKiB0eXBlICovIHJhd1R5cGUsXG4gICAgICAgIC8qIGJvZHkgKi8gdW5kZWZpbmVkKTtcbiAgfVxufVxuXG4vKipcbiAqIEdlbmVyYXRlIGFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gY2xhc3MgYW5kIG1ldGFkYXRhLlxuICpcbiAqIEFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yIGlzIGEgc3BlY2lhbGx5IHNoYXBlZCBUeXBlU2NyaXB0IHN0YXRpYyBtZXRob2QsIGludGVuZGVkIHRvIGJlIHBsYWNlZFxuICogd2l0aGluIGEgZGlyZWN0aXZlIGNsYXNzIGl0c2VsZiwgdGhhdCBwZXJtaXRzIHR5cGUgaW5mZXJlbmNlIG9mIGFueSBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBvZlxuICogdGhlIGNsYXNzIGZyb20gdGhlIHR5cGVzIG9mIGV4cHJlc3Npb25zIGJvdW5kIHRvIGlucHV0cyBvciBvdXRwdXRzLCBhbmQgdGhlIHR5cGVzIG9mIGVsZW1lbnRzXG4gKiB0aGF0IG1hdGNoIHF1ZXJpZXMgcGVyZm9ybWVkIGJ5IHRoZSBkaXJlY3RpdmUuIEl0IGFsc28gY2F0Y2hlcyBhbnkgZXJyb3JzIGluIHRoZSB0eXBlcyBvZiB0aGVzZVxuICogZXhwcmVzc2lvbnMuIFRoaXMgbWV0aG9kIGlzIG5ldmVyIGNhbGxlZCBhdCBydW50aW1lLCBidXQgaXMgdXNlZCBpbiB0eXBlLWNoZWNrIGJsb2NrcyB0b1xuICogY29uc3RydWN0IGRpcmVjdGl2ZSB0eXBlcy5cbiAqXG4gKiBBbiBpbmxpbmUgdHlwZSBjb25zdHJ1Y3RvciBmb3IgTmdGb3IgbG9va3MgbGlrZTpcbiAqXG4gKiBzdGF0aWMgbmdUeXBlQ3RvcjxUPihpbml0OiBQaWNrPE5nRm9yT2Y8VD4sICduZ0Zvck9mJ3wnbmdGb3JUcmFja0J5J3wnbmdGb3JUZW1wbGF0ZSc+KTpcbiAqICAgTmdGb3JPZjxUPjtcbiAqXG4gKiBBIHR5cGljYWwgY29uc3RydWN0b3Igd291bGQgYmU6XG4gKlxuICogTmdGb3JPZi5uZ1R5cGVDdG9yKGluaXQ6IHtcbiAqICAgbmdGb3JPZjogWydmb28nLCAnYmFyJ10sXG4gKiAgIG5nRm9yVHJhY2tCeTogbnVsbCBhcyBhbnksXG4gKiAgIG5nRm9yVGVtcGxhdGU6IG51bGwgYXMgYW55LFxuICogfSk7IC8vIEluZmVycyBhIHR5cGUgb2YgTmdGb3JPZjxzdHJpbmc+LlxuICpcbiAqIEFueSBpbnB1dHMgZGVjbGFyZWQgb24gdGhlIHR5cGUgZm9yIHdoaWNoIG5vIHByb3BlcnR5IGJpbmRpbmcgaXMgcHJlc2VudCBhcmUgYXNzaWduZWQgYSB2YWx1ZSBvZlxuICogdHlwZSBgYW55YCwgdG8gYXZvaWQgcHJvZHVjaW5nIGFueSB0eXBlIGVycm9ycyBmb3IgdW5zZXQgaW5wdXRzLlxuICpcbiAqIElubGluZSB0eXBlIGNvbnN0cnVjdG9ycyBhcmUgdXNlZCB3aGVuIHRoZSB0eXBlIGJlaW5nIGNyZWF0ZWQgaGFzIGJvdW5kZWQgZ2VuZXJpYyB0eXBlcyB3aGljaFxuICogbWFrZSB3cml0aW5nIGEgZGVjbGFyZWQgdHlwZSBjb25zdHJ1Y3RvciAodmlhIGBnZW5lcmF0ZVR5cGVDdG9yRGVjbGFyYXRpb25GbmApIGRpZmZpY3VsdCBvclxuICogaW1wb3NzaWJsZS5cbiAqXG4gKiBAcGFyYW0gbm9kZSB0aGUgYENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj5gIGZvciB3aGljaCBhIHR5cGUgY29uc3RydWN0b3Igd2lsbCBiZVxuICogZ2VuZXJhdGVkLlxuICogQHBhcmFtIG1ldGEgYWRkaXRpb25hbCBtZXRhZGF0YSByZXF1aXJlZCB0byBnZW5lcmF0ZSB0aGUgdHlwZSBjb25zdHJ1Y3Rvci5cbiAqIEByZXR1cm5zIGEgYHRzLk1ldGhvZERlY2xhcmF0aW9uYCBmb3IgdGhlIHR5cGUgY29uc3RydWN0b3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUlubGluZVR5cGVDdG9yKFxuICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4sIG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpOiB0cy5NZXRob2REZWNsYXJhdGlvbiB7XG4gIC8vIEJ1aWxkIHJhd1R5cGUsIGEgYHRzLlR5cGVOb2RlYCBvZiB0aGUgY2xhc3Mgd2l0aCBpdHMgZ2VuZXJpYyBwYXJhbWV0ZXJzIHBhc3NlZCB0aHJvdWdoIGZyb21cbiAgLy8gdGhlIGRlZmluaXRpb24gd2l0aG91dCBhbnkgdHlwZSBib3VuZHMuIEZvciBleGFtcGxlLCBpZiB0aGUgY2xhc3MgaXNcbiAgLy8gYEZvb0RpcmVjdGl2ZTxUIGV4dGVuZHMgQmFyPmAsIGl0cyByYXdUeXBlIHdvdWxkIGJlIGBGb29EaXJlY3RpdmU8VD5gLlxuICBjb25zdCByYXdUeXBlQXJncyA9XG4gICAgICBub2RlLnR5cGVQYXJhbWV0ZXJzICE9PSB1bmRlZmluZWQgPyBnZW5lcmF0ZUdlbmVyaWNBcmdzKG5vZGUudHlwZVBhcmFtZXRlcnMpIDogdW5kZWZpbmVkO1xuICBjb25zdCByYXdUeXBlID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUobm9kZS5uYW1lLCByYXdUeXBlQXJncyk7XG5cbiAgY29uc3QgaW5pdFBhcmFtID0gY29uc3RydWN0VHlwZUN0b3JQYXJhbWV0ZXIobm9kZSwgbWV0YSwgcmF3VHlwZSk7XG5cbiAgLy8gSWYgdGhpcyBjb25zdHJ1Y3RvciBpcyBiZWluZyBnZW5lcmF0ZWQgaW50byBhIC50cyBmaWxlLCB0aGVuIGl0IG5lZWRzIGEgZmFrZSBib2R5LiBUaGUgYm9keVxuICAvLyBpcyBzZXQgdG8gYSByZXR1cm4gb2YgYG51bGwhYC4gSWYgdGhlIHR5cGUgY29uc3RydWN0b3IgaXMgYmVpbmcgZ2VuZXJhdGVkIGludG8gYSAuZC50cyBmaWxlLFxuICAvLyBpdCBuZWVkcyBubyBib2R5LlxuICBsZXQgYm9keTogdHMuQmxvY2t8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBpZiAobWV0YS5ib2R5KSB7XG4gICAgYm9keSA9IHRzLmNyZWF0ZUJsb2NrKFtcbiAgICAgIHRzLmNyZWF0ZVJldHVybih0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbih0cy5jcmVhdGVOdWxsKCkpKSxcbiAgICBdKTtcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgdHlwZSBjb25zdHJ1Y3RvciBtZXRob2QgZGVjbGFyYXRpb24uXG4gIHJldHVybiB0cy5jcmVhdGVNZXRob2QoXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqL1t0cy5jcmVhdGVNb2RpZmllcih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpXSxcbiAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyBtZXRhLmZuTmFtZSxcbiAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gdHlwZVBhcmFtZXRlcnNXaXRoRGVmYXVsdFR5cGVzKG5vZGUudHlwZVBhcmFtZXRlcnMpLFxuICAgICAgLyogcGFyYW1ldGVycyAqL1tpbml0UGFyYW1dLFxuICAgICAgLyogdHlwZSAqLyByYXdUeXBlLFxuICAgICAgLyogYm9keSAqLyBib2R5LCApO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RUeXBlQ3RvclBhcmFtZXRlcihcbiAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+LCBtZXRhOiBUeXBlQ3Rvck1ldGFkYXRhLFxuICAgIHJhd1R5cGU6IHRzLlR5cGVSZWZlcmVuY2VOb2RlKTogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24ge1xuICAvLyBpbml0VHlwZSBpcyB0aGUgdHlwZSBvZiAnaW5pdCcsIHRoZSBzaW5nbGUgYXJndW1lbnQgdG8gdGhlIHR5cGUgY29uc3RydWN0b3IgbWV0aG9kLlxuICAvLyBJZiB0aGUgRGlyZWN0aXZlIGhhcyBhbnkgaW5wdXRzLCBpdHMgaW5pdFR5cGUgd2lsbCBiZTpcbiAgLy9cbiAgLy8gUGljazxyYXdUeXBlLCAnaW5wdXRBJ3wnaW5wdXRCJz5cbiAgLy9cbiAgLy8gUGljayBoZXJlIGlzIHVzZWQgdG8gc2VsZWN0IG9ubHkgdGhvc2UgZmllbGRzIGZyb20gd2hpY2ggdGhlIGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIG9mIHRoZVxuICAvLyBkaXJlY3RpdmUgd2lsbCBiZSBpbmZlcnJlZC5cbiAgLy9cbiAgLy8gSW4gdGhlIHNwZWNpYWwgY2FzZSB0aGVyZSBhcmUgbm8gaW5wdXRzLCBpbml0VHlwZSBpcyBzZXQgdG8ge30uXG4gIGxldCBpbml0VHlwZTogdHMuVHlwZU5vZGV8bnVsbCA9IG51bGw7XG5cbiAgY29uc3Qga2V5czogc3RyaW5nW10gPSBtZXRhLmZpZWxkcy5pbnB1dHM7XG4gIGNvbnN0IHBsYWluS2V5czogdHMuTGl0ZXJhbFR5cGVOb2RlW10gPSBbXTtcbiAgY29uc3QgY29lcmNlZEtleXM6IHRzLlByb3BlcnR5U2lnbmF0dXJlW10gPSBbXTtcbiAgZm9yIChjb25zdCBrZXkgb2Yga2V5cykge1xuICAgIGlmICghbWV0YS5jb2VyY2VkSW5wdXRGaWVsZHMuaGFzKGtleSkpIHtcbiAgICAgIHBsYWluS2V5cy5wdXNoKHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGtleSkpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29lcmNlZEtleXMucHVzaCh0cy5jcmVhdGVQcm9wZXJ0eVNpZ25hdHVyZShcbiAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIG5hbWUgKi8ga2V5LFxuICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIHR5cGUgKi8gdHMuY3JlYXRlVHlwZVF1ZXJ5Tm9kZShcbiAgICAgICAgICAgICAgdHMuY3JlYXRlUXVhbGlmaWVkTmFtZShyYXdUeXBlLnR5cGVOYW1lLCBgbmdBY2NlcHRJbnB1dFR5cGVfJHtrZXl9YCkpLFxuICAgICAgICAgIC8qIGluaXRpYWxpemVyICovIHVuZGVmaW5lZCkpO1xuICAgIH1cbiAgfVxuICBpZiAocGxhaW5LZXlzLmxlbmd0aCA+IDApIHtcbiAgICAvLyBDb25zdHJ1Y3QgYSB1bmlvbiBvZiBhbGwgdGhlIGZpZWxkIG5hbWVzLlxuICAgIGNvbnN0IGtleVR5cGVVbmlvbiA9IHRzLmNyZWF0ZVVuaW9uVHlwZU5vZGUocGxhaW5LZXlzKTtcblxuICAgIC8vIENvbnN0cnVjdCB0aGUgUGljazxyYXdUeXBlLCBrZXlUeXBlVW5pb24+LlxuICAgIGluaXRUeXBlID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUoJ1BpY2snLCBbcmF3VHlwZSwga2V5VHlwZVVuaW9uXSk7XG4gIH1cbiAgaWYgKGNvZXJjZWRLZXlzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBjb2VyY2VkTGl0ZXJhbCA9IHRzLmNyZWF0ZVR5cGVMaXRlcmFsTm9kZShjb2VyY2VkS2V5cyk7XG5cbiAgICBpbml0VHlwZSA9XG4gICAgICAgIGluaXRUeXBlICE9PSBudWxsID8gdHMuY3JlYXRlVW5pb25UeXBlTm9kZShbaW5pdFR5cGUsIGNvZXJjZWRMaXRlcmFsXSkgOiBjb2VyY2VkTGl0ZXJhbDtcbiAgfVxuXG4gIGlmIChpbml0VHlwZSA9PT0gbnVsbCkge1xuICAgIC8vIFNwZWNpYWwgY2FzZSAtIG5vIGlucHV0cywgb3V0cHV0cywgb3Igb3RoZXIgZmllbGRzIHdoaWNoIGNvdWxkIGluZmx1ZW5jZSB0aGUgcmVzdWx0IHR5cGUuXG4gICAgaW5pdFR5cGUgPSB0cy5jcmVhdGVUeXBlTGl0ZXJhbE5vZGUoW10pO1xuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSAnaW5pdCcgcGFyYW1ldGVyIGl0c2VsZi5cbiAgcmV0dXJuIHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gJ2luaXQnLFxuICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlICovIGluaXRUeXBlLFxuICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gdW5kZWZpbmVkKTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVHZW5lcmljQXJncyhwYXJhbXM6IFJlYWRvbmx5QXJyYXk8dHMuVHlwZVBhcmFtZXRlckRlY2xhcmF0aW9uPik6IHRzLlR5cGVOb2RlW10ge1xuICByZXR1cm4gcGFyYW1zLm1hcChwYXJhbSA9PiB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShwYXJhbS5uYW1lLCB1bmRlZmluZWQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlcXVpcmVzSW5saW5lVHlwZUN0b3Iobm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPik6IGJvb2xlYW4ge1xuICAvLyBUaGUgY2xhc3MgcmVxdWlyZXMgYW4gaW5saW5lIHR5cGUgY29uc3RydWN0b3IgaWYgaXQgaGFzIGNvbnN0cmFpbmVkIChib3VuZCkgZ2VuZXJpY3MuXG4gIHJldHVybiAhY2hlY2tJZkdlbmVyaWNUeXBlc0FyZVVuYm91bmQobm9kZSk7XG59XG5cbi8qKlxuICogQWRkIGEgZGVmYXVsdCBgPSBhbnlgIHRvIHR5cGUgcGFyYW1ldGVycyB0aGF0IGRvbid0IGhhdmUgYSBkZWZhdWx0IHZhbHVlIGFscmVhZHkuXG4gKlxuICogVHlwZVNjcmlwdCB1c2VzIHRoZSBkZWZhdWx0IHR5cGUgb2YgYSB0eXBlIHBhcmFtZXRlciB3aGVuZXZlciBpbmZlcmVuY2Ugb2YgdGhhdCBwYXJhbWV0ZXIgZmFpbHMuXG4gKiBUaGlzIGNhbiBoYXBwZW4gd2hlbiBpbmZlcnJpbmcgYSBjb21wbGV4IHR5cGUgZnJvbSAnYW55Jy4gRm9yIGV4YW1wbGUsIGlmIGBOZ0ZvcmAncyBpbmZlcmVuY2UgaXNcbiAqIGRvbmUgd2l0aCB0aGUgVENCIGNvZGU6XG4gKlxuICogYGBgXG4gKiBjbGFzcyBOZ0ZvcjxUPiB7XG4gKiAgIG5nRm9yT2Y6IFRbXTtcbiAqIH1cbiAqXG4gKiBkZWNsYXJlIGZ1bmN0aW9uIGN0b3I8VD4obzogUGljazxOZ0ZvcjxUPiwgJ25nRm9yT2YnfCduZ0ZvclRyYWNrQnknfCduZ0ZvclRlbXBsYXRlJz4pOiBOZ0ZvcjxUPjtcbiAqIGBgYFxuICpcbiAqIEFuIGludm9jYXRpb24gbG9va3MgbGlrZTpcbiAqXG4gKiBgYGBcbiAqIHZhciBfdDEgPSBjdG9yKHtuZ0Zvck9mOiBbMSwgMl0sIG5nRm9yVHJhY2tCeTogbnVsbCBhcyBhbnksIG5nRm9yVGVtcGxhdGU6IG51bGwgYXMgYW55fSk7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIGNvcnJlY3RseSBpbmZlcnMgdGhlIHR5cGUgYE5nRm9yPG51bWJlcj5gIGZvciBgX3QxYCwgc2luY2UgYFRgIGlzIGluZmVycmVkIGZyb20gdGhlXG4gKiBhc3NpZ25tZW50IG9mIHR5cGUgYG51bWJlcltdYCB0byBgbmdGb3JPZmAncyB0eXBlIGBUW11gLiBIb3dldmVyLCBpZiBgYW55YCBpcyBwYXNzZWQgaW5zdGVhZDpcbiAqXG4gKiBgYGBcbiAqIHZhciBfdDIgPSBjdG9yKHtuZ0Zvck9mOiBbMSwgMl0gYXMgYW55LCBuZ0ZvclRyYWNrQnk6IG51bGwgYXMgYW55LCBuZ0ZvclRlbXBsYXRlOiBudWxsIGFzIGFueX0pO1xuICogYGBgXG4gKlxuICogdGhlbiBpbmZlcmVuY2UgZm9yIGBUYCBmYWlscyAoaXQgY2Fubm90IGJlIGluZmVycmVkIGZyb20gYFRbXSA9IGFueWApLiBJbiB0aGlzIGNhc2UsIGBUYCB0YWtlc1xuICogdGhlIHR5cGUgYHt9YCwgYW5kIHNvIGBfdDJgIGlzIGluZmVycmVkIGFzIGBOZ0Zvcjx7fT5gLiBUaGlzIGlzIG9idmlvdXNseSB3cm9uZy5cbiAqXG4gKiBBZGRpbmcgYSBkZWZhdWx0IHR5cGUgdG8gdGhlIGdlbmVyaWMgZGVjbGFyYXRpb24gaW4gdGhlIGNvbnN0cnVjdG9yIHNvbHZlcyB0aGlzIHByb2JsZW0sIGFzIHRoZVxuICogZGVmYXVsdCB0eXBlIHdpbGwgYmUgdXNlZCBpbiB0aGUgZXZlbnQgdGhhdCBpbmZlcmVuY2UgZmFpbHMuXG4gKlxuICogYGBgXG4gKiBkZWNsYXJlIGZ1bmN0aW9uIGN0b3I8VCA9IGFueT4obzogUGljazxOZ0ZvcjxUPiwgJ25nRm9yT2YnPik6IE5nRm9yPFQ+O1xuICpcbiAqIHZhciBfdDMgPSBjdG9yKHtuZ0Zvck9mOiBbMSwgMl0gYXMgYW55fSk7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIGNvcnJlY3RseSBpbmZlcnMgYFRgIGFzIGBhbnlgLCBhbmQgdGhlcmVmb3JlIGBfdDNgIGFzIGBOZ0Zvcjxhbnk+YC5cbiAqL1xuZnVuY3Rpb24gdHlwZVBhcmFtZXRlcnNXaXRoRGVmYXVsdFR5cGVzKFxuICAgIHBhcmFtczogUmVhZG9ubHlBcnJheTx0cy5UeXBlUGFyYW1ldGVyRGVjbGFyYXRpb24+fCB1bmRlZmluZWQpOiB0cy5UeXBlUGFyYW1ldGVyRGVjbGFyYXRpb25bXXxcbiAgICB1bmRlZmluZWQge1xuICBpZiAocGFyYW1zID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgcmV0dXJuIHBhcmFtcy5tYXAocGFyYW0gPT4ge1xuICAgIGlmIChwYXJhbS5kZWZhdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0cy51cGRhdGVUeXBlUGFyYW1ldGVyRGVjbGFyYXRpb24oXG4gICAgICAgICAgLyogbm9kZSAqLyBwYXJhbSxcbiAgICAgICAgICAvKiBuYW1lICovIHBhcmFtLm5hbWUsXG4gICAgICAgICAgLyogY29uc3RyYWludCAqLyBwYXJhbS5jb25zdHJhaW50LFxuICAgICAgICAgIC8qIGRlZmF1bHRUeXBlICovIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHBhcmFtO1xuICAgIH1cbiAgfSk7XG59XG4iXX0=