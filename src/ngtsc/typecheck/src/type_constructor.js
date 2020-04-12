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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_parameter_emitter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jb25zdHJ1Y3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NvbnN0cnVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUtqQywrR0FBOEQ7SUFFOUQsU0FBZ0IsNkJBQTZCLENBQ3pDLElBQTJDLEVBQUUsSUFBc0IsRUFBRSxXQUEwQixFQUMvRixVQUFxRCxFQUNyRCxTQUF5QjtRQUMzQixJQUFJLHNCQUFzQixDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRTtZQUMzQyxNQUFNLElBQUksS0FBSyxDQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSx5Q0FBc0MsQ0FBQyxDQUFDO1NBQzFFO1FBRUQsSUFBTSxXQUFXLEdBQUcsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUMzRixJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsdUJBQXVCLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRXJFLElBQU0sU0FBUyxHQUFHLDBCQUEwQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFbEUsSUFBTSxjQUFjLEdBQUcsOEJBQThCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFbEUsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2IsSUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLHNCQUFzQjtZQUNwQyxvQkFBb0IsQ0FBQyxjQUFjO1lBQ25DLGdCQUFnQixDQUFBLENBQUMsU0FBUyxDQUFDO1lBQzNCLFVBQVUsQ0FBQyxPQUFPLENBQUcsQ0FBQztZQUUxQixJQUFNLElBQUksR0FBRyxFQUFF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QUFJLDZDQUFvQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDNUUsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXlDRztJQUNILFNBQVMsOEJBQThCLENBQ25DLE1BQTZEO1FBRS9ELElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtZQUN4QixPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUVELE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEtBQUs7WUFDckIsSUFBSSxLQUFLLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBRTtnQkFDL0IsT0FBTyxFQUFFLENBQUMsOEJBQThCO2dCQUNwQyxVQUFVLENBQUMsS0FBSztnQkFDaEIsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJO2dCQUNyQixnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsVUFBVTtnQkFDakMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzthQUMzRTtpQkFBTTtnQkFDTCxPQUFPLEtBQUssQ0FBQzthQUNkO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmltcG9ydCB7VHlwZUN0b3JNZXRhZGF0YX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtUeXBlUGFyYW1ldGVyRW1pdHRlcn0gZnJvbSAnLi90eXBlX3BhcmFtZXRlcl9lbWl0dGVyJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlVHlwZUN0b3JEZWNsYXJhdGlvbkZuKFxuICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4sIG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEsIG5vZGVUeXBlUmVmOiB0cy5FbnRpdHlOYW1lLFxuICAgIHR5cGVQYXJhbXM6IHRzLlR5cGVQYXJhbWV0ZXJEZWNsYXJhdGlvbltdIHwgdW5kZWZpbmVkLFxuICAgIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiB0cy5TdGF0ZW1lbnQge1xuICBpZiAocmVxdWlyZXNJbmxpbmVUeXBlQ3Rvcihub2RlLCByZWZsZWN0b3IpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke25vZGUubmFtZS50ZXh0fSByZXF1aXJlcyBhbiBpbmxpbmUgdHlwZSBjb25zdHJ1Y3RvcmApO1xuICB9XG5cbiAgY29uc3QgcmF3VHlwZUFyZ3MgPSB0eXBlUGFyYW1zICE9PSB1bmRlZmluZWQgPyBnZW5lcmF0ZUdlbmVyaWNBcmdzKHR5cGVQYXJhbXMpIDogdW5kZWZpbmVkO1xuICBjb25zdCByYXdUeXBlID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUobm9kZVR5cGVSZWYsIHJhd1R5cGVBcmdzKTtcblxuICBjb25zdCBpbml0UGFyYW0gPSBjb25zdHJ1Y3RUeXBlQ3RvclBhcmFtZXRlcihub2RlLCBtZXRhLCByYXdUeXBlKTtcblxuICBjb25zdCB0eXBlUGFyYW1ldGVycyA9IHR5cGVQYXJhbWV0ZXJzV2l0aERlZmF1bHRUeXBlcyh0eXBlUGFyYW1zKTtcblxuICBpZiAobWV0YS5ib2R5KSB7XG4gICAgY29uc3QgZm5UeXBlID0gdHMuY3JlYXRlRnVuY3Rpb25UeXBlTm9kZShcbiAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gdHlwZVBhcmFtZXRlcnMsXG4gICAgICAgIC8qIHBhcmFtZXRlcnMgKi9baW5pdFBhcmFtXSxcbiAgICAgICAgLyogdHlwZSAqLyByYXdUeXBlLCApO1xuXG4gICAgY29uc3QgZGVjbCA9IHRzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24oXG4gICAgICAgIC8qIG5hbWUgKi8gbWV0YS5mbk5hbWUsXG4gICAgICAgIC8qIHR5cGUgKi8gZm5UeXBlLFxuICAgICAgICAvKiBib2R5ICovIHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSkpO1xuICAgIGNvbnN0IGRlY2xMaXN0ID0gdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3QoW2RlY2xdLCB0cy5Ob2RlRmxhZ3MuQ29uc3QpO1xuICAgIHJldHVybiB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudChcbiAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgLyogZGVjbGFyYXRpb25MaXN0ICovIGRlY2xMaXN0KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIG1vZGlmaWVycyAqL1t0cy5jcmVhdGVNb2RpZmllcih0cy5TeW50YXhLaW5kLkRlY2xhcmVLZXl3b3JkKV0sXG4gICAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBuYW1lICovIG1ldGEuZm5OYW1lLFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB0eXBlUGFyYW1ldGVycyxcbiAgICAgICAgLyogcGFyYW1ldGVycyAqL1tpbml0UGFyYW1dLFxuICAgICAgICAvKiB0eXBlICovIHJhd1R5cGUsXG4gICAgICAgIC8qIGJvZHkgKi8gdW5kZWZpbmVkKTtcbiAgfVxufVxuXG4vKipcbiAqIEdlbmVyYXRlIGFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gY2xhc3MgYW5kIG1ldGFkYXRhLlxuICpcbiAqIEFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yIGlzIGEgc3BlY2lhbGx5IHNoYXBlZCBUeXBlU2NyaXB0IHN0YXRpYyBtZXRob2QsIGludGVuZGVkIHRvIGJlIHBsYWNlZFxuICogd2l0aGluIGEgZGlyZWN0aXZlIGNsYXNzIGl0c2VsZiwgdGhhdCBwZXJtaXRzIHR5cGUgaW5mZXJlbmNlIG9mIGFueSBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBvZlxuICogdGhlIGNsYXNzIGZyb20gdGhlIHR5cGVzIG9mIGV4cHJlc3Npb25zIGJvdW5kIHRvIGlucHV0cyBvciBvdXRwdXRzLCBhbmQgdGhlIHR5cGVzIG9mIGVsZW1lbnRzXG4gKiB0aGF0IG1hdGNoIHF1ZXJpZXMgcGVyZm9ybWVkIGJ5IHRoZSBkaXJlY3RpdmUuIEl0IGFsc28gY2F0Y2hlcyBhbnkgZXJyb3JzIGluIHRoZSB0eXBlcyBvZiB0aGVzZVxuICogZXhwcmVzc2lvbnMuIFRoaXMgbWV0aG9kIGlzIG5ldmVyIGNhbGxlZCBhdCBydW50aW1lLCBidXQgaXMgdXNlZCBpbiB0eXBlLWNoZWNrIGJsb2NrcyB0b1xuICogY29uc3RydWN0IGRpcmVjdGl2ZSB0eXBlcy5cbiAqXG4gKiBBbiBpbmxpbmUgdHlwZSBjb25zdHJ1Y3RvciBmb3IgTmdGb3IgbG9va3MgbGlrZTpcbiAqXG4gKiBzdGF0aWMgbmdUeXBlQ3RvcjxUPihpbml0OiBQaWNrPE5nRm9yT2Y8VD4sICduZ0Zvck9mJ3wnbmdGb3JUcmFja0J5J3wnbmdGb3JUZW1wbGF0ZSc+KTpcbiAqICAgTmdGb3JPZjxUPjtcbiAqXG4gKiBBIHR5cGljYWwgY29uc3RydWN0b3Igd291bGQgYmU6XG4gKlxuICogTmdGb3JPZi5uZ1R5cGVDdG9yKGluaXQ6IHtcbiAqICAgbmdGb3JPZjogWydmb28nLCAnYmFyJ10sXG4gKiAgIG5nRm9yVHJhY2tCeTogbnVsbCBhcyBhbnksXG4gKiAgIG5nRm9yVGVtcGxhdGU6IG51bGwgYXMgYW55LFxuICogfSk7IC8vIEluZmVycyBhIHR5cGUgb2YgTmdGb3JPZjxzdHJpbmc+LlxuICpcbiAqIEFueSBpbnB1dHMgZGVjbGFyZWQgb24gdGhlIHR5cGUgZm9yIHdoaWNoIG5vIHByb3BlcnR5IGJpbmRpbmcgaXMgcHJlc2VudCBhcmUgYXNzaWduZWQgYSB2YWx1ZSBvZlxuICogdHlwZSBgYW55YCwgdG8gYXZvaWQgcHJvZHVjaW5nIGFueSB0eXBlIGVycm9ycyBmb3IgdW5zZXQgaW5wdXRzLlxuICpcbiAqIElubGluZSB0eXBlIGNvbnN0cnVjdG9ycyBhcmUgdXNlZCB3aGVuIHRoZSB0eXBlIGJlaW5nIGNyZWF0ZWQgaGFzIGJvdW5kZWQgZ2VuZXJpYyB0eXBlcyB3aGljaFxuICogbWFrZSB3cml0aW5nIGEgZGVjbGFyZWQgdHlwZSBjb25zdHJ1Y3RvciAodmlhIGBnZW5lcmF0ZVR5cGVDdG9yRGVjbGFyYXRpb25GbmApIGRpZmZpY3VsdCBvclxuICogaW1wb3NzaWJsZS5cbiAqXG4gKiBAcGFyYW0gbm9kZSB0aGUgYENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj5gIGZvciB3aGljaCBhIHR5cGUgY29uc3RydWN0b3Igd2lsbCBiZVxuICogZ2VuZXJhdGVkLlxuICogQHBhcmFtIG1ldGEgYWRkaXRpb25hbCBtZXRhZGF0YSByZXF1aXJlZCB0byBnZW5lcmF0ZSB0aGUgdHlwZSBjb25zdHJ1Y3Rvci5cbiAqIEByZXR1cm5zIGEgYHRzLk1ldGhvZERlY2xhcmF0aW9uYCBmb3IgdGhlIHR5cGUgY29uc3RydWN0b3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUlubGluZVR5cGVDdG9yKFxuICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4sIG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpOiB0cy5NZXRob2REZWNsYXJhdGlvbiB7XG4gIC8vIEJ1aWxkIHJhd1R5cGUsIGEgYHRzLlR5cGVOb2RlYCBvZiB0aGUgY2xhc3Mgd2l0aCBpdHMgZ2VuZXJpYyBwYXJhbWV0ZXJzIHBhc3NlZCB0aHJvdWdoIGZyb21cbiAgLy8gdGhlIGRlZmluaXRpb24gd2l0aG91dCBhbnkgdHlwZSBib3VuZHMuIEZvciBleGFtcGxlLCBpZiB0aGUgY2xhc3MgaXNcbiAgLy8gYEZvb0RpcmVjdGl2ZTxUIGV4dGVuZHMgQmFyPmAsIGl0cyByYXdUeXBlIHdvdWxkIGJlIGBGb29EaXJlY3RpdmU8VD5gLlxuICBjb25zdCByYXdUeXBlQXJncyA9XG4gICAgICBub2RlLnR5cGVQYXJhbWV0ZXJzICE9PSB1bmRlZmluZWQgPyBnZW5lcmF0ZUdlbmVyaWNBcmdzKG5vZGUudHlwZVBhcmFtZXRlcnMpIDogdW5kZWZpbmVkO1xuICBjb25zdCByYXdUeXBlID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUobm9kZS5uYW1lLCByYXdUeXBlQXJncyk7XG5cbiAgY29uc3QgaW5pdFBhcmFtID0gY29uc3RydWN0VHlwZUN0b3JQYXJhbWV0ZXIobm9kZSwgbWV0YSwgcmF3VHlwZSk7XG5cbiAgLy8gSWYgdGhpcyBjb25zdHJ1Y3RvciBpcyBiZWluZyBnZW5lcmF0ZWQgaW50byBhIC50cyBmaWxlLCB0aGVuIGl0IG5lZWRzIGEgZmFrZSBib2R5LiBUaGUgYm9keVxuICAvLyBpcyBzZXQgdG8gYSByZXR1cm4gb2YgYG51bGwhYC4gSWYgdGhlIHR5cGUgY29uc3RydWN0b3IgaXMgYmVpbmcgZ2VuZXJhdGVkIGludG8gYSAuZC50cyBmaWxlLFxuICAvLyBpdCBuZWVkcyBubyBib2R5LlxuICBsZXQgYm9keTogdHMuQmxvY2t8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBpZiAobWV0YS5ib2R5KSB7XG4gICAgYm9keSA9IHRzLmNyZWF0ZUJsb2NrKFtcbiAgICAgIHRzLmNyZWF0ZVJldHVybih0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbih0cy5jcmVhdGVOdWxsKCkpKSxcbiAgICBdKTtcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgdHlwZSBjb25zdHJ1Y3RvciBtZXRob2QgZGVjbGFyYXRpb24uXG4gIHJldHVybiB0cy5jcmVhdGVNZXRob2QoXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqL1t0cy5jcmVhdGVNb2RpZmllcih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpXSxcbiAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyBtZXRhLmZuTmFtZSxcbiAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gdHlwZVBhcmFtZXRlcnNXaXRoRGVmYXVsdFR5cGVzKG5vZGUudHlwZVBhcmFtZXRlcnMpLFxuICAgICAgLyogcGFyYW1ldGVycyAqL1tpbml0UGFyYW1dLFxuICAgICAgLyogdHlwZSAqLyByYXdUeXBlLFxuICAgICAgLyogYm9keSAqLyBib2R5LCApO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RUeXBlQ3RvclBhcmFtZXRlcihcbiAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+LCBtZXRhOiBUeXBlQ3Rvck1ldGFkYXRhLFxuICAgIHJhd1R5cGU6IHRzLlR5cGVSZWZlcmVuY2VOb2RlKTogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24ge1xuICAvLyBpbml0VHlwZSBpcyB0aGUgdHlwZSBvZiAnaW5pdCcsIHRoZSBzaW5nbGUgYXJndW1lbnQgdG8gdGhlIHR5cGUgY29uc3RydWN0b3IgbWV0aG9kLlxuICAvLyBJZiB0aGUgRGlyZWN0aXZlIGhhcyBhbnkgaW5wdXRzLCBpdHMgaW5pdFR5cGUgd2lsbCBiZTpcbiAgLy9cbiAgLy8gUGljazxyYXdUeXBlLCAnaW5wdXRBJ3wnaW5wdXRCJz5cbiAgLy9cbiAgLy8gUGljayBoZXJlIGlzIHVzZWQgdG8gc2VsZWN0IG9ubHkgdGhvc2UgZmllbGRzIGZyb20gd2hpY2ggdGhlIGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIG9mIHRoZVxuICAvLyBkaXJlY3RpdmUgd2lsbCBiZSBpbmZlcnJlZC5cbiAgLy9cbiAgLy8gSW4gdGhlIHNwZWNpYWwgY2FzZSB0aGVyZSBhcmUgbm8gaW5wdXRzLCBpbml0VHlwZSBpcyBzZXQgdG8ge30uXG4gIGxldCBpbml0VHlwZTogdHMuVHlwZU5vZGV8bnVsbCA9IG51bGw7XG5cbiAgY29uc3Qga2V5czogc3RyaW5nW10gPSBtZXRhLmZpZWxkcy5pbnB1dHM7XG4gIGNvbnN0IHBsYWluS2V5czogdHMuTGl0ZXJhbFR5cGVOb2RlW10gPSBbXTtcbiAgY29uc3QgY29lcmNlZEtleXM6IHRzLlByb3BlcnR5U2lnbmF0dXJlW10gPSBbXTtcbiAgZm9yIChjb25zdCBrZXkgb2Yga2V5cykge1xuICAgIGlmICghbWV0YS5jb2VyY2VkSW5wdXRGaWVsZHMuaGFzKGtleSkpIHtcbiAgICAgIHBsYWluS2V5cy5wdXNoKHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGtleSkpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29lcmNlZEtleXMucHVzaCh0cy5jcmVhdGVQcm9wZXJ0eVNpZ25hdHVyZShcbiAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIG5hbWUgKi8ga2V5LFxuICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIHR5cGUgKi9cbiAgICAgICAgICB0cy5jcmVhdGVUeXBlUXVlcnlOb2RlKFxuICAgICAgICAgICAgICB0cy5jcmVhdGVRdWFsaWZpZWROYW1lKHJhd1R5cGUudHlwZU5hbWUsIGBuZ0FjY2VwdElucHV0VHlwZV8ke2tleX1gKSksXG4gICAgICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gdW5kZWZpbmVkKSk7XG4gICAgfVxuICB9XG4gIGlmIChwbGFpbktleXMubGVuZ3RoID4gMCkge1xuICAgIC8vIENvbnN0cnVjdCBhIHVuaW9uIG9mIGFsbCB0aGUgZmllbGQgbmFtZXMuXG4gICAgY29uc3Qga2V5VHlwZVVuaW9uID0gdHMuY3JlYXRlVW5pb25UeXBlTm9kZShwbGFpbktleXMpO1xuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBQaWNrPHJhd1R5cGUsIGtleVR5cGVVbmlvbj4uXG4gICAgaW5pdFR5cGUgPSB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZSgnUGljaycsIFtyYXdUeXBlLCBrZXlUeXBlVW5pb25dKTtcbiAgfVxuICBpZiAoY29lcmNlZEtleXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGNvZXJjZWRMaXRlcmFsID0gdHMuY3JlYXRlVHlwZUxpdGVyYWxOb2RlKGNvZXJjZWRLZXlzKTtcblxuICAgIGluaXRUeXBlID1cbiAgICAgICAgaW5pdFR5cGUgIT09IG51bGwgPyB0cy5jcmVhdGVVbmlvblR5cGVOb2RlKFtpbml0VHlwZSwgY29lcmNlZExpdGVyYWxdKSA6IGNvZXJjZWRMaXRlcmFsO1xuICB9XG5cbiAgaWYgKGluaXRUeXBlID09PSBudWxsKSB7XG4gICAgLy8gU3BlY2lhbCBjYXNlIC0gbm8gaW5wdXRzLCBvdXRwdXRzLCBvciBvdGhlciBmaWVsZHMgd2hpY2ggY291bGQgaW5mbHVlbmNlIHRoZSByZXN1bHQgdHlwZS5cbiAgICBpbml0VHlwZSA9IHRzLmNyZWF0ZVR5cGVMaXRlcmFsTm9kZShbXSk7XG4gIH1cblxuICAvLyBDcmVhdGUgdGhlICdpbml0JyBwYXJhbWV0ZXIgaXRzZWxmLlxuICByZXR1cm4gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyAnaW5pdCcsXG4gICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGUgKi8gaW5pdFR5cGUsXG4gICAgICAvKiBpbml0aWFsaXplciAqLyB1bmRlZmluZWQpO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUdlbmVyaWNBcmdzKHBhcmFtczogUmVhZG9ubHlBcnJheTx0cy5UeXBlUGFyYW1ldGVyRGVjbGFyYXRpb24+KTogdHMuVHlwZU5vZGVbXSB7XG4gIHJldHVybiBwYXJhbXMubWFwKHBhcmFtID0+IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKHBhcmFtLm5hbWUsIHVuZGVmaW5lZCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVxdWlyZXNJbmxpbmVUeXBlQ3RvcihcbiAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+LCBob3N0OiBSZWZsZWN0aW9uSG9zdCk6IGJvb2xlYW4ge1xuICAvLyBUaGUgY2xhc3MgcmVxdWlyZXMgYW4gaW5saW5lIHR5cGUgY29uc3RydWN0b3IgaWYgaXQgaGFzIGdlbmVyaWMgdHlwZSBib3VuZHMgdGhhdCBjYW4gbm90IGJlXG4gIC8vIGVtaXR0ZWQgaW50byBhIGRpZmZlcmVudCBjb250ZXh0LlxuICByZXR1cm4gIWNoZWNrSWZHZW5lcmljVHlwZUJvdW5kc0FyZUNvbnRleHRGcmVlKG5vZGUsIGhvc3QpO1xufVxuXG5mdW5jdGlvbiBjaGVja0lmR2VuZXJpY1R5cGVCb3VuZHNBcmVDb250ZXh0RnJlZShcbiAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+LCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KTogYm9vbGVhbiB7XG4gIC8vIEdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIGFyZSBjb25zaWRlcmVkIGNvbnRleHQgZnJlZSBpZiB0aGV5IGNhbiBiZSBlbWl0dGVkIGludG8gYW55IGNvbnRleHQuXG4gIHJldHVybiBuZXcgVHlwZVBhcmFtZXRlckVtaXR0ZXIobm9kZS50eXBlUGFyYW1ldGVycywgcmVmbGVjdG9yKS5jYW5FbWl0KCk7XG59XG5cbi8qKlxuICogQWRkIGEgZGVmYXVsdCBgPSBhbnlgIHRvIHR5cGUgcGFyYW1ldGVycyB0aGF0IGRvbid0IGhhdmUgYSBkZWZhdWx0IHZhbHVlIGFscmVhZHkuXG4gKlxuICogVHlwZVNjcmlwdCB1c2VzIHRoZSBkZWZhdWx0IHR5cGUgb2YgYSB0eXBlIHBhcmFtZXRlciB3aGVuZXZlciBpbmZlcmVuY2Ugb2YgdGhhdCBwYXJhbWV0ZXIgZmFpbHMuXG4gKiBUaGlzIGNhbiBoYXBwZW4gd2hlbiBpbmZlcnJpbmcgYSBjb21wbGV4IHR5cGUgZnJvbSAnYW55Jy4gRm9yIGV4YW1wbGUsIGlmIGBOZ0ZvcmAncyBpbmZlcmVuY2UgaXNcbiAqIGRvbmUgd2l0aCB0aGUgVENCIGNvZGU6XG4gKlxuICogYGBgXG4gKiBjbGFzcyBOZ0ZvcjxUPiB7XG4gKiAgIG5nRm9yT2Y6IFRbXTtcbiAqIH1cbiAqXG4gKiBkZWNsYXJlIGZ1bmN0aW9uIGN0b3I8VD4obzogUGljazxOZ0ZvcjxUPiwgJ25nRm9yT2YnfCduZ0ZvclRyYWNrQnknfCduZ0ZvclRlbXBsYXRlJz4pOiBOZ0ZvcjxUPjtcbiAqIGBgYFxuICpcbiAqIEFuIGludm9jYXRpb24gbG9va3MgbGlrZTpcbiAqXG4gKiBgYGBcbiAqIHZhciBfdDEgPSBjdG9yKHtuZ0Zvck9mOiBbMSwgMl0sIG5nRm9yVHJhY2tCeTogbnVsbCBhcyBhbnksIG5nRm9yVGVtcGxhdGU6IG51bGwgYXMgYW55fSk7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIGNvcnJlY3RseSBpbmZlcnMgdGhlIHR5cGUgYE5nRm9yPG51bWJlcj5gIGZvciBgX3QxYCwgc2luY2UgYFRgIGlzIGluZmVycmVkIGZyb20gdGhlXG4gKiBhc3NpZ25tZW50IG9mIHR5cGUgYG51bWJlcltdYCB0byBgbmdGb3JPZmAncyB0eXBlIGBUW11gLiBIb3dldmVyLCBpZiBgYW55YCBpcyBwYXNzZWQgaW5zdGVhZDpcbiAqXG4gKiBgYGBcbiAqIHZhciBfdDIgPSBjdG9yKHtuZ0Zvck9mOiBbMSwgMl0gYXMgYW55LCBuZ0ZvclRyYWNrQnk6IG51bGwgYXMgYW55LCBuZ0ZvclRlbXBsYXRlOiBudWxsIGFzIGFueX0pO1xuICogYGBgXG4gKlxuICogdGhlbiBpbmZlcmVuY2UgZm9yIGBUYCBmYWlscyAoaXQgY2Fubm90IGJlIGluZmVycmVkIGZyb20gYFRbXSA9IGFueWApLiBJbiB0aGlzIGNhc2UsIGBUYCB0YWtlc1xuICogdGhlIHR5cGUgYHt9YCwgYW5kIHNvIGBfdDJgIGlzIGluZmVycmVkIGFzIGBOZ0Zvcjx7fT5gLiBUaGlzIGlzIG9idmlvdXNseSB3cm9uZy5cbiAqXG4gKiBBZGRpbmcgYSBkZWZhdWx0IHR5cGUgdG8gdGhlIGdlbmVyaWMgZGVjbGFyYXRpb24gaW4gdGhlIGNvbnN0cnVjdG9yIHNvbHZlcyB0aGlzIHByb2JsZW0sIGFzIHRoZVxuICogZGVmYXVsdCB0eXBlIHdpbGwgYmUgdXNlZCBpbiB0aGUgZXZlbnQgdGhhdCBpbmZlcmVuY2UgZmFpbHMuXG4gKlxuICogYGBgXG4gKiBkZWNsYXJlIGZ1bmN0aW9uIGN0b3I8VCA9IGFueT4obzogUGljazxOZ0ZvcjxUPiwgJ25nRm9yT2YnPik6IE5nRm9yPFQ+O1xuICpcbiAqIHZhciBfdDMgPSBjdG9yKHtuZ0Zvck9mOiBbMSwgMl0gYXMgYW55fSk7XG4gKiBgYGBcbiAqXG4gKiBUaGlzIGNvcnJlY3RseSBpbmZlcnMgYFRgIGFzIGBhbnlgLCBhbmQgdGhlcmVmb3JlIGBfdDNgIGFzIGBOZ0Zvcjxhbnk+YC5cbiAqL1xuZnVuY3Rpb24gdHlwZVBhcmFtZXRlcnNXaXRoRGVmYXVsdFR5cGVzKFxuICAgIHBhcmFtczogUmVhZG9ubHlBcnJheTx0cy5UeXBlUGFyYW1ldGVyRGVjbGFyYXRpb24+fCB1bmRlZmluZWQpOiB0cy5UeXBlUGFyYW1ldGVyRGVjbGFyYXRpb25bXXxcbiAgICB1bmRlZmluZWQge1xuICBpZiAocGFyYW1zID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgcmV0dXJuIHBhcmFtcy5tYXAocGFyYW0gPT4ge1xuICAgIGlmIChwYXJhbS5kZWZhdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0cy51cGRhdGVUeXBlUGFyYW1ldGVyRGVjbGFyYXRpb24oXG4gICAgICAgICAgLyogbm9kZSAqLyBwYXJhbSxcbiAgICAgICAgICAvKiBuYW1lICovIHBhcmFtLm5hbWUsXG4gICAgICAgICAgLyogY29uc3RyYWludCAqLyBwYXJhbS5jb25zdHJhaW50LFxuICAgICAgICAgIC8qIGRlZmF1bHRUeXBlICovIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHBhcmFtO1xuICAgIH1cbiAgfSk7XG59XG4iXX0=