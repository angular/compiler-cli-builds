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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_parameter_emitter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.requiresInlineTypeCtor = exports.generateInlineTypeCtor = exports.generateTypeCtorDeclarationFn = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var type_parameter_emitter_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_parameter_emitter");
    function generateTypeCtorDeclarationFn(node, meta, nodeTypeRef, typeParams, reflector) {
        if (requiresInlineTypeCtor(node, reflector)) {
            throw new Error(node.name.text + " requires an inline type constructor");
        }
        var rawTypeArgs = typeParams !== undefined ? generateGenericArgs(typeParams) : undefined;
        var rawType = ts.createTypeReferenceNode(nodeTypeRef, rawTypeArgs);
        var initParam = constructTypeCtorParameter(node, meta, rawType);
        var typeParameters = typeParametersWithDefaultTypes(typeParams);
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
                    /* type */
                    ts.createTypeQueryNode(ts.createQualifiedName(rawType.typeName, "ngAcceptInputType_" + key)), 
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
            initType = initType !== null ? ts.createIntersectionTypeNode([initType, coercedLiteral]) :
                coercedLiteral;
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
    function requiresInlineTypeCtor(node, host) {
        // The class requires an inline type constructor if it has generic type bounds that can not be
        // emitted into a different context.
        return !checkIfGenericTypeBoundsAreContextFree(node, host);
    }
    exports.requiresInlineTypeCtor = requiresInlineTypeCtor;
    function checkIfGenericTypeBoundsAreContextFree(node, reflector) {
        // Generic type parameters are considered context free if they can be emitted into any context.
        return new type_parameter_emitter_1.TypeParameterEmitter(node.typeParameters, reflector).canEmit();
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jb25zdHJ1Y3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NvbnN0cnVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFLakMsK0dBQThEO0lBRTlELFNBQWdCLDZCQUE2QixDQUN6QyxJQUEyQyxFQUFFLElBQXNCLEVBQUUsV0FBMEIsRUFDL0YsVUFBbUQsRUFBRSxTQUF5QjtRQUNoRixJQUFJLHNCQUFzQixDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRTtZQUMzQyxNQUFNLElBQUksS0FBSyxDQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSx5Q0FBc0MsQ0FBQyxDQUFDO1NBQzFFO1FBRUQsSUFBTSxXQUFXLEdBQUcsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUMzRixJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsdUJBQXVCLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRXJFLElBQU0sU0FBUyxHQUFHLDBCQUEwQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFbEUsSUFBTSxjQUFjLEdBQUcsOEJBQThCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFbEUsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2IsSUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLHNCQUFzQjtZQUNwQyxvQkFBb0IsQ0FBQyxjQUFjO1lBQ25DLGdCQUFnQixDQUFBLENBQUMsU0FBUyxDQUFDO1lBQzNCLFVBQVUsQ0FBQyxPQUFPLENBQ3JCLENBQUM7WUFFRixJQUFNLElBQUksR0FBRyxFQUFF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SUFBSSw2Q0FBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzVFLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0F5Q0c7SUFDSCxTQUFTLDhCQUE4QixDQUFDLE1BQ1M7UUFDL0MsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO1lBQ3hCLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBRUQsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQUEsS0FBSztZQUNyQixJQUFJLEtBQUssQ0FBQyxPQUFPLEtBQUssU0FBUyxFQUFFO2dCQUMvQixPQUFPLEVBQUUsQ0FBQyw4QkFBOEI7Z0JBQ3BDLFVBQVUsQ0FBQyxLQUFLO2dCQUNoQixVQUFVLENBQUMsS0FBSyxDQUFDLElBQUk7Z0JBQ3JCLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxVQUFVO2dCQUNqQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2FBQzNFO2lCQUFNO2dCQUNMLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtUeXBlQ3Rvck1ldGFkYXRhfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge1R5cGVQYXJhbWV0ZXJFbWl0dGVyfSBmcm9tICcuL3R5cGVfcGFyYW1ldGVyX2VtaXR0ZXInO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUeXBlQ3RvckRlY2xhcmF0aW9uRm4oXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPiwgbWV0YTogVHlwZUN0b3JNZXRhZGF0YSwgbm9kZVR5cGVSZWY6IHRzLkVudGl0eU5hbWUsXG4gICAgdHlwZVBhcmFtczogdHMuVHlwZVBhcmFtZXRlckRlY2xhcmF0aW9uW118dW5kZWZpbmVkLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KTogdHMuU3RhdGVtZW50IHtcbiAgaWYgKHJlcXVpcmVzSW5saW5lVHlwZUN0b3Iobm9kZSwgcmVmbGVjdG9yKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtub2RlLm5hbWUudGV4dH0gcmVxdWlyZXMgYW4gaW5saW5lIHR5cGUgY29uc3RydWN0b3JgKTtcbiAgfVxuXG4gIGNvbnN0IHJhd1R5cGVBcmdzID0gdHlwZVBhcmFtcyAhPT0gdW5kZWZpbmVkID8gZ2VuZXJhdGVHZW5lcmljQXJncyh0eXBlUGFyYW1zKSA6IHVuZGVmaW5lZDtcbiAgY29uc3QgcmF3VHlwZSA9IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKG5vZGVUeXBlUmVmLCByYXdUeXBlQXJncyk7XG5cbiAgY29uc3QgaW5pdFBhcmFtID0gY29uc3RydWN0VHlwZUN0b3JQYXJhbWV0ZXIobm9kZSwgbWV0YSwgcmF3VHlwZSk7XG5cbiAgY29uc3QgdHlwZVBhcmFtZXRlcnMgPSB0eXBlUGFyYW1ldGVyc1dpdGhEZWZhdWx0VHlwZXModHlwZVBhcmFtcyk7XG5cbiAgaWYgKG1ldGEuYm9keSkge1xuICAgIGNvbnN0IGZuVHlwZSA9IHRzLmNyZWF0ZUZ1bmN0aW9uVHlwZU5vZGUoXG4gICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIHR5cGVQYXJhbWV0ZXJzLFxuICAgICAgICAvKiBwYXJhbWV0ZXJzICovW2luaXRQYXJhbV0sXG4gICAgICAgIC8qIHR5cGUgKi8gcmF3VHlwZSxcbiAgICApO1xuXG4gICAgY29uc3QgZGVjbCA9IHRzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24oXG4gICAgICAgIC8qIG5hbWUgKi8gbWV0YS5mbk5hbWUsXG4gICAgICAgIC8qIHR5cGUgKi8gZm5UeXBlLFxuICAgICAgICAvKiBib2R5ICovIHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSkpO1xuICAgIGNvbnN0IGRlY2xMaXN0ID0gdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3QoW2RlY2xdLCB0cy5Ob2RlRmxhZ3MuQ29uc3QpO1xuICAgIHJldHVybiB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudChcbiAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgLyogZGVjbGFyYXRpb25MaXN0ICovIGRlY2xMaXN0KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIG1vZGlmaWVycyAqL1t0cy5jcmVhdGVNb2RpZmllcih0cy5TeW50YXhLaW5kLkRlY2xhcmVLZXl3b3JkKV0sXG4gICAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBuYW1lICovIG1ldGEuZm5OYW1lLFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB0eXBlUGFyYW1ldGVycyxcbiAgICAgICAgLyogcGFyYW1ldGVycyAqL1tpbml0UGFyYW1dLFxuICAgICAgICAvKiB0eXBlICovIHJhd1R5cGUsXG4gICAgICAgIC8qIGJvZHkgKi8gdW5kZWZpbmVkKTtcbiAgfVxufVxuXG4vKipcbiAqIEdlbmVyYXRlIGFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gY2xhc3MgYW5kIG1ldGFkYXRhLlxuICpcbiAqIEFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yIGlzIGEgc3BlY2lhbGx5IHNoYXBlZCBUeXBlU2NyaXB0IHN0YXRpYyBtZXRob2QsIGludGVuZGVkIHRvIGJlIHBsYWNlZFxuICogd2l0aGluIGEgZGlyZWN0aXZlIGNsYXNzIGl0c2VsZiwgdGhhdCBwZXJtaXRzIHR5cGUgaW5mZXJlbmNlIG9mIGFueSBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBvZlxuICogdGhlIGNsYXNzIGZyb20gdGhlIHR5cGVzIG9mIGV4cHJlc3Npb25zIGJvdW5kIHRvIGlucHV0cyBvciBvdXRwdXRzLCBhbmQgdGhlIHR5cGVzIG9mIGVsZW1lbnRzXG4gKiB0aGF0IG1hdGNoIHF1ZXJpZXMgcGVyZm9ybWVkIGJ5IHRoZSBkaXJlY3RpdmUuIEl0IGFsc28gY2F0Y2hlcyBhbnkgZXJyb3JzIGluIHRoZSB0eXBlcyBvZiB0aGVzZVxuICogZXhwcmVzc2lvbnMuIFRoaXMgbWV0aG9kIGlzIG5ldmVyIGNhbGxlZCBhdCBydW50aW1lLCBidXQgaXMgdXNlZCBpbiB0eXBlLWNoZWNrIGJsb2NrcyB0b1xuICogY29uc3RydWN0IGRpcmVjdGl2ZSB0eXBlcy5cbiAqXG4gKiBBbiBpbmxpbmUgdHlwZSBjb25zdHJ1Y3RvciBmb3IgTmdGb3IgbG9va3MgbGlrZTpcbiAqXG4gKiBzdGF0aWMgbmdUeXBlQ3RvcjxUPihpbml0OiBQaWNrPE5nRm9yT2Y8VD4sICduZ0Zvck9mJ3wnbmdGb3JUcmFja0J5J3wnbmdGb3JUZW1wbGF0ZSc+KTpcbiAqICAgTmdGb3JPZjxUPjtcbiAqXG4gKiBBIHR5cGljYWwgY29uc3RydWN0b3Igd291bGQgYmU6XG4gKlxuICogTmdGb3JPZi5uZ1R5cGVDdG9yKGluaXQ6IHtcbiAqICAgbmdGb3JPZjogWydmb28nLCAnYmFyJ10sXG4gKiAgIG5nRm9yVHJhY2tCeTogbnVsbCBhcyBhbnksXG4gKiAgIG5nRm9yVGVtcGxhdGU6IG51bGwgYXMgYW55LFxuICogfSk7IC8vIEluZmVycyBhIHR5cGUgb2YgTmdGb3JPZjxzdHJpbmc+LlxuICpcbiAqIEFueSBpbnB1dHMgZGVjbGFyZWQgb24gdGhlIHR5cGUgZm9yIHdoaWNoIG5vIHByb3BlcnR5IGJpbmRpbmcgaXMgcHJlc2VudCBhcmUgYXNzaWduZWQgYSB2YWx1ZSBvZlxuICogdHlwZSBgYW55YCwgdG8gYXZvaWQgcHJvZHVjaW5nIGFueSB0eXBlIGVycm9ycyBmb3IgdW5zZXQgaW5wdXRzLlxuICpcbiAqIElubGluZSB0eXBlIGNvbnN0cnVjdG9ycyBhcmUgdXNlZCB3aGVuIHRoZSB0eXBlIGJlaW5nIGNyZWF0ZWQgaGFzIGJvdW5kZWQgZ2VuZXJpYyB0eXBlcyB3aGljaFxuICogbWFrZSB3cml0aW5nIGEgZGVjbGFyZWQgdHlwZSBjb25zdHJ1Y3RvciAodmlhIGBnZW5lcmF0ZVR5cGVDdG9yRGVjbGFyYXRpb25GbmApIGRpZmZpY3VsdCBvclxuICogaW1wb3NzaWJsZS5cbiAqXG4gKiBAcGFyYW0gbm9kZSB0aGUgYENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj5gIGZvciB3aGljaCBhIHR5cGUgY29uc3RydWN0b3Igd2lsbCBiZVxuICogZ2VuZXJhdGVkLlxuICogQHBhcmFtIG1ldGEgYWRkaXRpb25hbCBtZXRhZGF0YSByZXF1aXJlZCB0byBnZW5lcmF0ZSB0aGUgdHlwZSBjb25zdHJ1Y3Rvci5cbiAqIEByZXR1cm5zIGEgYHRzLk1ldGhvZERlY2xhcmF0aW9uYCBmb3IgdGhlIHR5cGUgY29uc3RydWN0b3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUlubGluZVR5cGVDdG9yKFxuICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4sIG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpOiB0cy5NZXRob2REZWNsYXJhdGlvbiB7XG4gIC8vIEJ1aWxkIHJhd1R5cGUsIGEgYHRzLlR5cGVOb2RlYCBvZiB0aGUgY2xhc3Mgd2l0aCBpdHMgZ2VuZXJpYyBwYXJhbWV0ZXJzIHBhc3NlZCB0aHJvdWdoIGZyb21cbiAgLy8gdGhlIGRlZmluaXRpb24gd2l0aG91dCBhbnkgdHlwZSBib3VuZHMuIEZvciBleGFtcGxlLCBpZiB0aGUgY2xhc3MgaXNcbiAgLy8gYEZvb0RpcmVjdGl2ZTxUIGV4dGVuZHMgQmFyPmAsIGl0cyByYXdUeXBlIHdvdWxkIGJlIGBGb29EaXJlY3RpdmU8VD5gLlxuICBjb25zdCByYXdUeXBlQXJncyA9XG4gICAgICBub2RlLnR5cGVQYXJhbWV0ZXJzICE9PSB1bmRlZmluZWQgPyBnZW5lcmF0ZUdlbmVyaWNBcmdzKG5vZGUudHlwZVBhcmFtZXRlcnMpIDogdW5kZWZpbmVkO1xuICBjb25zdCByYXdUeXBlID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUobm9kZS5uYW1lLCByYXdUeXBlQXJncyk7XG5cbiAgY29uc3QgaW5pdFBhcmFtID0gY29uc3RydWN0VHlwZUN0b3JQYXJhbWV0ZXIobm9kZSwgbWV0YSwgcmF3VHlwZSk7XG5cbiAgLy8gSWYgdGhpcyBjb25zdHJ1Y3RvciBpcyBiZWluZyBnZW5lcmF0ZWQgaW50byBhIC50cyBmaWxlLCB0aGVuIGl0IG5lZWRzIGEgZmFrZSBib2R5LiBUaGUgYm9keVxuICAvLyBpcyBzZXQgdG8gYSByZXR1cm4gb2YgYG51bGwhYC4gSWYgdGhlIHR5cGUgY29uc3RydWN0b3IgaXMgYmVpbmcgZ2VuZXJhdGVkIGludG8gYSAuZC50cyBmaWxlLFxuICAvLyBpdCBuZWVkcyBubyBib2R5LlxuICBsZXQgYm9keTogdHMuQmxvY2t8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBpZiAobWV0YS5ib2R5KSB7XG4gICAgYm9keSA9IHRzLmNyZWF0ZUJsb2NrKFtcbiAgICAgIHRzLmNyZWF0ZVJldHVybih0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbih0cy5jcmVhdGVOdWxsKCkpKSxcbiAgICBdKTtcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgdHlwZSBjb25zdHJ1Y3RvciBtZXRob2QgZGVjbGFyYXRpb24uXG4gIHJldHVybiB0cy5jcmVhdGVNZXRob2QoXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqL1t0cy5jcmVhdGVNb2RpZmllcih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpXSxcbiAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyBtZXRhLmZuTmFtZSxcbiAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gdHlwZVBhcmFtZXRlcnNXaXRoRGVmYXVsdFR5cGVzKG5vZGUudHlwZVBhcmFtZXRlcnMpLFxuICAgICAgLyogcGFyYW1ldGVycyAqL1tpbml0UGFyYW1dLFxuICAgICAgLyogdHlwZSAqLyByYXdUeXBlLFxuICAgICAgLyogYm9keSAqLyBib2R5LFxuICApO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RUeXBlQ3RvclBhcmFtZXRlcihcbiAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+LCBtZXRhOiBUeXBlQ3Rvck1ldGFkYXRhLFxuICAgIHJhd1R5cGU6IHRzLlR5cGVSZWZlcmVuY2VOb2RlKTogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24ge1xuICAvLyBpbml0VHlwZSBpcyB0aGUgdHlwZSBvZiAnaW5pdCcsIHRoZSBzaW5nbGUgYXJndW1lbnQgdG8gdGhlIHR5cGUgY29uc3RydWN0b3IgbWV0aG9kLlxuICAvLyBJZiB0aGUgRGlyZWN0aXZlIGhhcyBhbnkgaW5wdXRzLCBpdHMgaW5pdFR5cGUgd2lsbCBiZTpcbiAgLy9cbiAgLy8gUGljazxyYXdUeXBlLCAnaW5wdXRBJ3wnaW5wdXRCJz5cbiAgLy9cbiAgLy8gUGljayBoZXJlIGlzIHVzZWQgdG8gc2VsZWN0IG9ubHkgdGhvc2UgZmllbGRzIGZyb20gd2hpY2ggdGhlIGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIG9mIHRoZVxuICAvLyBkaXJlY3RpdmUgd2lsbCBiZSBpbmZlcnJlZC5cbiAgLy9cbiAgLy8gSW4gdGhlIHNwZWNpYWwgY2FzZSB0aGVyZSBhcmUgbm8gaW5wdXRzLCBpbml0VHlwZSBpcyBzZXQgdG8ge30uXG4gIGxldCBpbml0VHlwZTogdHMuVHlwZU5vZGV8bnVsbCA9IG51bGw7XG5cbiAgY29uc3Qga2V5czogc3RyaW5nW10gPSBtZXRhLmZpZWxkcy5pbnB1dHM7XG4gIGNvbnN0IHBsYWluS2V5czogdHMuTGl0ZXJhbFR5cGVOb2RlW10gPSBbXTtcbiAgY29uc3QgY29lcmNlZEtleXM6IHRzLlByb3BlcnR5U2lnbmF0dXJlW10gPSBbXTtcbiAgZm9yIChjb25zdCBrZXkgb2Yga2V5cykge1xuICAgIGlmICghbWV0YS5jb2VyY2VkSW5wdXRGaWVsZHMuaGFzKGtleSkpIHtcbiAgICAgIHBsYWluS2V5cy5wdXNoKHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGtleSkpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29lcmNlZEtleXMucHVzaCh0cy5jcmVhdGVQcm9wZXJ0eVNpZ25hdHVyZShcbiAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIG5hbWUgKi8ga2V5LFxuICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIHR5cGUgKi9cbiAgICAgICAgICB0cy5jcmVhdGVUeXBlUXVlcnlOb2RlKFxuICAgICAgICAgICAgICB0cy5jcmVhdGVRdWFsaWZpZWROYW1lKHJhd1R5cGUudHlwZU5hbWUsIGBuZ0FjY2VwdElucHV0VHlwZV8ke2tleX1gKSksXG4gICAgICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gdW5kZWZpbmVkKSk7XG4gICAgfVxuICB9XG4gIGlmIChwbGFpbktleXMubGVuZ3RoID4gMCkge1xuICAgIC8vIENvbnN0cnVjdCBhIHVuaW9uIG9mIGFsbCB0aGUgZmllbGQgbmFtZXMuXG4gICAgY29uc3Qga2V5VHlwZVVuaW9uID0gdHMuY3JlYXRlVW5pb25UeXBlTm9kZShwbGFpbktleXMpO1xuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBQaWNrPHJhd1R5cGUsIGtleVR5cGVVbmlvbj4uXG4gICAgaW5pdFR5cGUgPSB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZSgnUGljaycsIFtyYXdUeXBlLCBrZXlUeXBlVW5pb25dKTtcbiAgfVxuICBpZiAoY29lcmNlZEtleXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGNvZXJjZWRMaXRlcmFsID0gdHMuY3JlYXRlVHlwZUxpdGVyYWxOb2RlKGNvZXJjZWRLZXlzKTtcblxuICAgIGluaXRUeXBlID0gaW5pdFR5cGUgIT09IG51bGwgPyB0cy5jcmVhdGVJbnRlcnNlY3Rpb25UeXBlTm9kZShbaW5pdFR5cGUsIGNvZXJjZWRMaXRlcmFsXSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2VyY2VkTGl0ZXJhbDtcbiAgfVxuXG4gIGlmIChpbml0VHlwZSA9PT0gbnVsbCkge1xuICAgIC8vIFNwZWNpYWwgY2FzZSAtIG5vIGlucHV0cywgb3V0cHV0cywgb3Igb3RoZXIgZmllbGRzIHdoaWNoIGNvdWxkIGluZmx1ZW5jZSB0aGUgcmVzdWx0IHR5cGUuXG4gICAgaW5pdFR5cGUgPSB0cy5jcmVhdGVUeXBlTGl0ZXJhbE5vZGUoW10pO1xuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSAnaW5pdCcgcGFyYW1ldGVyIGl0c2VsZi5cbiAgcmV0dXJuIHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gJ2luaXQnLFxuICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlICovIGluaXRUeXBlLFxuICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gdW5kZWZpbmVkKTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVHZW5lcmljQXJncyhwYXJhbXM6IFJlYWRvbmx5QXJyYXk8dHMuVHlwZVBhcmFtZXRlckRlY2xhcmF0aW9uPik6IHRzLlR5cGVOb2RlW10ge1xuICByZXR1cm4gcGFyYW1zLm1hcChwYXJhbSA9PiB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShwYXJhbS5uYW1lLCB1bmRlZmluZWQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlcXVpcmVzSW5saW5lVHlwZUN0b3IoXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPiwgaG9zdDogUmVmbGVjdGlvbkhvc3QpOiBib29sZWFuIHtcbiAgLy8gVGhlIGNsYXNzIHJlcXVpcmVzIGFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yIGlmIGl0IGhhcyBnZW5lcmljIHR5cGUgYm91bmRzIHRoYXQgY2FuIG5vdCBiZVxuICAvLyBlbWl0dGVkIGludG8gYSBkaWZmZXJlbnQgY29udGV4dC5cbiAgcmV0dXJuICFjaGVja0lmR2VuZXJpY1R5cGVCb3VuZHNBcmVDb250ZXh0RnJlZShub2RlLCBob3N0KTtcbn1cblxuZnVuY3Rpb24gY2hlY2tJZkdlbmVyaWNUeXBlQm91bmRzQXJlQ29udGV4dEZyZWUoXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IGJvb2xlYW4ge1xuICAvLyBHZW5lcmljIHR5cGUgcGFyYW1ldGVycyBhcmUgY29uc2lkZXJlZCBjb250ZXh0IGZyZWUgaWYgdGhleSBjYW4gYmUgZW1pdHRlZCBpbnRvIGFueSBjb250ZXh0LlxuICByZXR1cm4gbmV3IFR5cGVQYXJhbWV0ZXJFbWl0dGVyKG5vZGUudHlwZVBhcmFtZXRlcnMsIHJlZmxlY3RvcikuY2FuRW1pdCgpO1xufVxuXG4vKipcbiAqIEFkZCBhIGRlZmF1bHQgYD0gYW55YCB0byB0eXBlIHBhcmFtZXRlcnMgdGhhdCBkb24ndCBoYXZlIGEgZGVmYXVsdCB2YWx1ZSBhbHJlYWR5LlxuICpcbiAqIFR5cGVTY3JpcHQgdXNlcyB0aGUgZGVmYXVsdCB0eXBlIG9mIGEgdHlwZSBwYXJhbWV0ZXIgd2hlbmV2ZXIgaW5mZXJlbmNlIG9mIHRoYXQgcGFyYW1ldGVyIGZhaWxzLlxuICogVGhpcyBjYW4gaGFwcGVuIHdoZW4gaW5mZXJyaW5nIGEgY29tcGxleCB0eXBlIGZyb20gJ2FueScuIEZvciBleGFtcGxlLCBpZiBgTmdGb3JgJ3MgaW5mZXJlbmNlIGlzXG4gKiBkb25lIHdpdGggdGhlIFRDQiBjb2RlOlxuICpcbiAqIGBgYFxuICogY2xhc3MgTmdGb3I8VD4ge1xuICogICBuZ0Zvck9mOiBUW107XG4gKiB9XG4gKlxuICogZGVjbGFyZSBmdW5jdGlvbiBjdG9yPFQ+KG86IFBpY2s8TmdGb3I8VD4sICduZ0Zvck9mJ3wnbmdGb3JUcmFja0J5J3wnbmdGb3JUZW1wbGF0ZSc+KTogTmdGb3I8VD47XG4gKiBgYGBcbiAqXG4gKiBBbiBpbnZvY2F0aW9uIGxvb2tzIGxpa2U6XG4gKlxuICogYGBgXG4gKiB2YXIgX3QxID0gY3Rvcih7bmdGb3JPZjogWzEsIDJdLCBuZ0ZvclRyYWNrQnk6IG51bGwgYXMgYW55LCBuZ0ZvclRlbXBsYXRlOiBudWxsIGFzIGFueX0pO1xuICogYGBgXG4gKlxuICogVGhpcyBjb3JyZWN0bHkgaW5mZXJzIHRoZSB0eXBlIGBOZ0ZvcjxudW1iZXI+YCBmb3IgYF90MWAsIHNpbmNlIGBUYCBpcyBpbmZlcnJlZCBmcm9tIHRoZVxuICogYXNzaWdubWVudCBvZiB0eXBlIGBudW1iZXJbXWAgdG8gYG5nRm9yT2ZgJ3MgdHlwZSBgVFtdYC4gSG93ZXZlciwgaWYgYGFueWAgaXMgcGFzc2VkIGluc3RlYWQ6XG4gKlxuICogYGBgXG4gKiB2YXIgX3QyID0gY3Rvcih7bmdGb3JPZjogWzEsIDJdIGFzIGFueSwgbmdGb3JUcmFja0J5OiBudWxsIGFzIGFueSwgbmdGb3JUZW1wbGF0ZTogbnVsbCBhcyBhbnl9KTtcbiAqIGBgYFxuICpcbiAqIHRoZW4gaW5mZXJlbmNlIGZvciBgVGAgZmFpbHMgKGl0IGNhbm5vdCBiZSBpbmZlcnJlZCBmcm9tIGBUW10gPSBhbnlgKS4gSW4gdGhpcyBjYXNlLCBgVGAgdGFrZXNcbiAqIHRoZSB0eXBlIGB7fWAsIGFuZCBzbyBgX3QyYCBpcyBpbmZlcnJlZCBhcyBgTmdGb3I8e30+YC4gVGhpcyBpcyBvYnZpb3VzbHkgd3JvbmcuXG4gKlxuICogQWRkaW5nIGEgZGVmYXVsdCB0eXBlIHRvIHRoZSBnZW5lcmljIGRlY2xhcmF0aW9uIGluIHRoZSBjb25zdHJ1Y3RvciBzb2x2ZXMgdGhpcyBwcm9ibGVtLCBhcyB0aGVcbiAqIGRlZmF1bHQgdHlwZSB3aWxsIGJlIHVzZWQgaW4gdGhlIGV2ZW50IHRoYXQgaW5mZXJlbmNlIGZhaWxzLlxuICpcbiAqIGBgYFxuICogZGVjbGFyZSBmdW5jdGlvbiBjdG9yPFQgPSBhbnk+KG86IFBpY2s8TmdGb3I8VD4sICduZ0Zvck9mJz4pOiBOZ0ZvcjxUPjtcbiAqXG4gKiB2YXIgX3QzID0gY3Rvcih7bmdGb3JPZjogWzEsIDJdIGFzIGFueX0pO1xuICogYGBgXG4gKlxuICogVGhpcyBjb3JyZWN0bHkgaW5mZXJzIGBUYCBhcyBgYW55YCwgYW5kIHRoZXJlZm9yZSBgX3QzYCBhcyBgTmdGb3I8YW55PmAuXG4gKi9cbmZ1bmN0aW9uIHR5cGVQYXJhbWV0ZXJzV2l0aERlZmF1bHRUeXBlcyhwYXJhbXM6IFJlYWRvbmx5QXJyYXk8dHMuVHlwZVBhcmFtZXRlckRlY2xhcmF0aW9uPnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiB0cy5UeXBlUGFyYW1ldGVyRGVjbGFyYXRpb25bXXx1bmRlZmluZWQge1xuICBpZiAocGFyYW1zID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgcmV0dXJuIHBhcmFtcy5tYXAocGFyYW0gPT4ge1xuICAgIGlmIChwYXJhbS5kZWZhdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0cy51cGRhdGVUeXBlUGFyYW1ldGVyRGVjbGFyYXRpb24oXG4gICAgICAgICAgLyogbm9kZSAqLyBwYXJhbSxcbiAgICAgICAgICAvKiBuYW1lICovIHBhcmFtLm5hbWUsXG4gICAgICAgICAgLyogY29uc3RyYWludCAqLyBwYXJhbS5jb25zdHJhaW50LFxuICAgICAgICAgIC8qIGRlZmF1bHRUeXBlICovIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHBhcmFtO1xuICAgIH1cbiAgfSk7XG59XG4iXX0=