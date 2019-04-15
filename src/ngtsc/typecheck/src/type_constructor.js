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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor", ["require", "exports", "tslib", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    /**
     * Generate a type constructor for the given class and metadata.
     *
     * A type constructor is a specially shaped TypeScript static method, intended to be placed within
     * a directive class itself, that permits type inference of any generic type parameters of the class
     * from the types of expressions bound to inputs or outputs, and the types of elements that match
     * queries performed by the directive. It also catches any errors in the types of these expressions.
     * This method is never called at runtime, but is used in type-check blocks to construct directive
     * types.
     *
     * A type constructor for NgFor looks like:
     *
     * static ngTypeCtor<T>(init: Partial<Pick<NgForOf<T>, 'ngForOf'|'ngForTrackBy'|'ngForTemplate'>>):
     *   NgForOf<T>;
     *
     * A typical usage would be:
     *
     * NgForOf.ngTypeCtor(init: {ngForOf: ['foo', 'bar']}); // Infers a type of NgForOf<string>.
     *
     * @param node the `ClassDeclaration<ts.ClassDeclaration>` for which a type constructor will be
     * generated.
     * @param meta additional metadata required to generate the type constructor.
     * @returns a `ts.MethodDeclaration` for the type constructor.
     */
    function generateTypeCtor(node, meta) {
        // Build rawType, a `ts.TypeNode` of the class with its generic parameters passed through from
        // the definition without any type bounds. For example, if the class is
        // `FooDirective<T extends Bar>`, its rawType would be `FooDirective<T>`.
        var rawTypeArgs = node.typeParameters !== undefined ?
            node.typeParameters.map(function (param) { return ts.createTypeReferenceNode(param.name, undefined); }) :
            undefined;
        var rawType = ts.createTypeReferenceNode(node.name, rawTypeArgs);
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
        // If this constructor is being generated into a .ts file, then it needs a fake body. The body
        // is set to a return of `null!`. If the type constructor is being generated into a .d.ts file,
        // it needs no body.
        var body = undefined;
        if (meta.body) {
            body = ts.createBlock([
                ts.createReturn(ts.createNonNullExpression(ts.createNull())),
            ]);
        }
        // Create the 'init' parameter itself.
        var initParam = ts.createParameter(
        /* decorators */ undefined, 
        /* modifiers */ undefined, 
        /* dotDotDotToken */ undefined, 
        /* name */ 'init', 
        /* questionToken */ undefined, 
        /* type */ initType, 
        /* initializer */ undefined);
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
    exports.generateTypeCtor = generateTypeCtor;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jb25zdHJ1Y3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NvbnN0cnVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUtqQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0F1Qkc7SUFDSCxTQUFnQixnQkFBZ0IsQ0FDNUIsSUFBMkMsRUFBRSxJQUFzQjtRQUNyRSw4RkFBOEY7UUFDOUYsdUVBQXVFO1FBQ3ZFLHlFQUF5RTtRQUN6RSxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQWpELENBQWlELENBQUMsQ0FBQyxDQUFDO1lBQ3JGLFNBQVMsQ0FBQztRQUNkLElBQU0sT0FBTyxHQUFnQixFQUFFLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVoRixzRkFBc0Y7UUFDdEYsOEVBQThFO1FBQzlFLEVBQUU7UUFDRixrRUFBa0U7UUFDbEUsRUFBRTtRQUNGLDhGQUE4RjtRQUM5RiwrRkFBK0Y7UUFDL0YsMkJBQTJCO1FBQzNCLEVBQUU7UUFDRiw4RUFBOEU7UUFDOUUsSUFBSSxRQUFxQixDQUFDO1FBRTFCLElBQU0sSUFBSSxvQkFDTCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQ25CLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUN2QixDQUFDO1FBQ0YsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNyQiw0RkFBNEY7WUFDNUYsUUFBUSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUN6QzthQUFNO1lBQ0wsNENBQTRDO1lBQzVDLElBQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxtQkFBbUIsQ0FDdkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBckQsQ0FBcUQsQ0FBQyxDQUFDLENBQUM7WUFFNUUsNkNBQTZDO1lBQzdDLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUU3RSxtQ0FBbUM7WUFDbkMsUUFBUSxHQUFHLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1NBQzlEO1FBRUQsOEZBQThGO1FBQzlGLCtGQUErRjtRQUMvRixvQkFBb0I7UUFDcEIsSUFBSSxJQUFJLEdBQXVCLFNBQVMsQ0FBQztRQUN6QyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDYixJQUFJLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQztnQkFDcEIsRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7YUFDN0QsQ0FBQyxDQUFDO1NBQ0o7UUFFRCxzQ0FBc0M7UUFDdEMsSUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDLGVBQWU7UUFDaEMsZ0JBQWdCLENBQUMsU0FBUztRQUMxQixlQUFlLENBQUMsU0FBUztRQUN6QixvQkFBb0IsQ0FBQyxTQUFTO1FBQzlCLFVBQVUsQ0FBQyxNQUFNO1FBQ2pCLG1CQUFtQixDQUFDLFNBQVM7UUFDN0IsVUFBVSxDQUFDLFFBQVE7UUFDbkIsaUJBQWlCLENBQUMsU0FBUyxDQUFHLENBQUM7UUFFbkMsa0RBQWtEO1FBQ2xELE9BQU8sRUFBRSxDQUFDLFlBQVk7UUFDbEIsZ0JBQWdCLENBQUMsU0FBUztRQUMxQixlQUFlLENBQUEsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDL0QsbUJBQW1CLENBQUMsU0FBUztRQUM3QixVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU07UUFDdEIsbUJBQW1CLENBQUMsU0FBUztRQUM3QixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYztRQUN4QyxnQkFBZ0IsQ0FBQSxDQUFDLFNBQVMsQ0FBQztRQUMzQixVQUFVLENBQUMsT0FBTztRQUNsQixVQUFVLENBQUMsSUFBSSxDQUFHLENBQUM7SUFDekIsQ0FBQztJQXpFRCw0Q0F5RUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtUeXBlQ3Rvck1ldGFkYXRhfSBmcm9tICcuL2FwaSc7XG5cbi8qKlxuICogR2VuZXJhdGUgYSB0eXBlIGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gY2xhc3MgYW5kIG1ldGFkYXRhLlxuICpcbiAqIEEgdHlwZSBjb25zdHJ1Y3RvciBpcyBhIHNwZWNpYWxseSBzaGFwZWQgVHlwZVNjcmlwdCBzdGF0aWMgbWV0aG9kLCBpbnRlbmRlZCB0byBiZSBwbGFjZWQgd2l0aGluXG4gKiBhIGRpcmVjdGl2ZSBjbGFzcyBpdHNlbGYsIHRoYXQgcGVybWl0cyB0eXBlIGluZmVyZW5jZSBvZiBhbnkgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgb2YgdGhlIGNsYXNzXG4gKiBmcm9tIHRoZSB0eXBlcyBvZiBleHByZXNzaW9ucyBib3VuZCB0byBpbnB1dHMgb3Igb3V0cHV0cywgYW5kIHRoZSB0eXBlcyBvZiBlbGVtZW50cyB0aGF0IG1hdGNoXG4gKiBxdWVyaWVzIHBlcmZvcm1lZCBieSB0aGUgZGlyZWN0aXZlLiBJdCBhbHNvIGNhdGNoZXMgYW55IGVycm9ycyBpbiB0aGUgdHlwZXMgb2YgdGhlc2UgZXhwcmVzc2lvbnMuXG4gKiBUaGlzIG1ldGhvZCBpcyBuZXZlciBjYWxsZWQgYXQgcnVudGltZSwgYnV0IGlzIHVzZWQgaW4gdHlwZS1jaGVjayBibG9ja3MgdG8gY29uc3RydWN0IGRpcmVjdGl2ZVxuICogdHlwZXMuXG4gKlxuICogQSB0eXBlIGNvbnN0cnVjdG9yIGZvciBOZ0ZvciBsb29rcyBsaWtlOlxuICpcbiAqIHN0YXRpYyBuZ1R5cGVDdG9yPFQ+KGluaXQ6IFBhcnRpYWw8UGljazxOZ0Zvck9mPFQ+LCAnbmdGb3JPZid8J25nRm9yVHJhY2tCeSd8J25nRm9yVGVtcGxhdGUnPj4pOlxuICogICBOZ0Zvck9mPFQ+O1xuICpcbiAqIEEgdHlwaWNhbCB1c2FnZSB3b3VsZCBiZTpcbiAqXG4gKiBOZ0Zvck9mLm5nVHlwZUN0b3IoaW5pdDoge25nRm9yT2Y6IFsnZm9vJywgJ2JhciddfSk7IC8vIEluZmVycyBhIHR5cGUgb2YgTmdGb3JPZjxzdHJpbmc+LlxuICpcbiAqIEBwYXJhbSBub2RlIHRoZSBgQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPmAgZm9yIHdoaWNoIGEgdHlwZSBjb25zdHJ1Y3RvciB3aWxsIGJlXG4gKiBnZW5lcmF0ZWQuXG4gKiBAcGFyYW0gbWV0YSBhZGRpdGlvbmFsIG1ldGFkYXRhIHJlcXVpcmVkIHRvIGdlbmVyYXRlIHRoZSB0eXBlIGNvbnN0cnVjdG9yLlxuICogQHJldHVybnMgYSBgdHMuTWV0aG9kRGVjbGFyYXRpb25gIGZvciB0aGUgdHlwZSBjb25zdHJ1Y3Rvci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlVHlwZUN0b3IoXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPiwgbWV0YTogVHlwZUN0b3JNZXRhZGF0YSk6IHRzLk1ldGhvZERlY2xhcmF0aW9uIHtcbiAgLy8gQnVpbGQgcmF3VHlwZSwgYSBgdHMuVHlwZU5vZGVgIG9mIHRoZSBjbGFzcyB3aXRoIGl0cyBnZW5lcmljIHBhcmFtZXRlcnMgcGFzc2VkIHRocm91Z2ggZnJvbVxuICAvLyB0aGUgZGVmaW5pdGlvbiB3aXRob3V0IGFueSB0eXBlIGJvdW5kcy4gRm9yIGV4YW1wbGUsIGlmIHRoZSBjbGFzcyBpc1xuICAvLyBgRm9vRGlyZWN0aXZlPFQgZXh0ZW5kcyBCYXI+YCwgaXRzIHJhd1R5cGUgd291bGQgYmUgYEZvb0RpcmVjdGl2ZTxUPmAuXG4gIGNvbnN0IHJhd1R5cGVBcmdzID0gbm9kZS50eXBlUGFyYW1ldGVycyAhPT0gdW5kZWZpbmVkID9cbiAgICAgIG5vZGUudHlwZVBhcmFtZXRlcnMubWFwKHBhcmFtID0+IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKHBhcmFtLm5hbWUsIHVuZGVmaW5lZCkpIDpcbiAgICAgIHVuZGVmaW5lZDtcbiAgY29uc3QgcmF3VHlwZTogdHMuVHlwZU5vZGUgPSB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShub2RlLm5hbWUsIHJhd1R5cGVBcmdzKTtcblxuICAvLyBpbml0VHlwZSBpcyB0aGUgdHlwZSBvZiAnaW5pdCcsIHRoZSBzaW5nbGUgYXJndW1lbnQgdG8gdGhlIHR5cGUgY29uc3RydWN0b3IgbWV0aG9kLlxuICAvLyBJZiB0aGUgRGlyZWN0aXZlIGhhcyBhbnkgaW5wdXRzLCBvdXRwdXRzLCBvciBxdWVyaWVzLCBpdHMgaW5pdFR5cGUgd2lsbCBiZTpcbiAgLy9cbiAgLy8gUGFydGlhbDxQaWNrPHJhd1R5cGUsICdpbnB1dEZpZWxkJ3wnb3V0cHV0RmllbGQnfCdxdWVyeUZpZWxkJz4+XG4gIC8vXG4gIC8vIFBpY2sgaGVyZSBpcyB1c2VkIHRvIHNlbGVjdCBvbmx5IHRob3NlIGZpZWxkcyBmcm9tIHdoaWNoIHRoZSBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBvZiB0aGVcbiAgLy8gZGlyZWN0aXZlIHdpbGwgYmUgaW5mZXJyZWQuIFBhcnRpYWwgaXMgdXNlZCBiZWNhdXNlIGlucHV0cyBhcmUgb3B0aW9uYWwsIHNvIHRoZXJlIG1heSBub3QgYmVcbiAgLy8gYmluZGluZ3MgZm9yIGVhY2ggZmllbGQuXG4gIC8vXG4gIC8vIEluIHRoZSBzcGVjaWFsIGNhc2UgdGhlcmUgYXJlIG5vIGlucHV0cy9vdXRwdXRzL2V0YywgaW5pdFR5cGUgaXMgc2V0IHRvIHt9LlxuICBsZXQgaW5pdFR5cGU6IHRzLlR5cGVOb2RlO1xuXG4gIGNvbnN0IGtleXM6IHN0cmluZ1tdID0gW1xuICAgIC4uLm1ldGEuZmllbGRzLmlucHV0cyxcbiAgICAuLi5tZXRhLmZpZWxkcy5vdXRwdXRzLFxuICAgIC4uLm1ldGEuZmllbGRzLnF1ZXJpZXMsXG4gIF07XG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIC8vIFNwZWNpYWwgY2FzZSAtIG5vIGlucHV0cywgb3V0cHV0cywgb3Igb3RoZXIgZmllbGRzIHdoaWNoIGNvdWxkIGluZmx1ZW5jZSB0aGUgcmVzdWx0IHR5cGUuXG4gICAgaW5pdFR5cGUgPSB0cy5jcmVhdGVUeXBlTGl0ZXJhbE5vZGUoW10pO1xuICB9IGVsc2Uge1xuICAgIC8vIENvbnN0cnVjdCBhIHVuaW9uIG9mIGFsbCB0aGUgZmllbGQgbmFtZXMuXG4gICAgY29uc3Qga2V5VHlwZVVuaW9uID0gdHMuY3JlYXRlVW5pb25UeXBlTm9kZShcbiAgICAgICAga2V5cy5tYXAoa2V5ID0+IHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGtleSkpKSk7XG5cbiAgICAvLyBDb25zdHJ1Y3QgdGhlIFBpY2s8cmF3VHlwZSwga2V5VHlwZVVuaW9uPi5cbiAgICBjb25zdCBwaWNrVHlwZSA9IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKCdQaWNrJywgW3Jhd1R5cGUsIGtleVR5cGVVbmlvbl0pO1xuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBQYXJ0aWFsPHBpY2tUeXBlPi5cbiAgICBpbml0VHlwZSA9IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKCdQYXJ0aWFsJywgW3BpY2tUeXBlXSk7XG4gIH1cblxuICAvLyBJZiB0aGlzIGNvbnN0cnVjdG9yIGlzIGJlaW5nIGdlbmVyYXRlZCBpbnRvIGEgLnRzIGZpbGUsIHRoZW4gaXQgbmVlZHMgYSBmYWtlIGJvZHkuIFRoZSBib2R5XG4gIC8vIGlzIHNldCB0byBhIHJldHVybiBvZiBgbnVsbCFgLiBJZiB0aGUgdHlwZSBjb25zdHJ1Y3RvciBpcyBiZWluZyBnZW5lcmF0ZWQgaW50byBhIC5kLnRzIGZpbGUsXG4gIC8vIGl0IG5lZWRzIG5vIGJvZHkuXG4gIGxldCBib2R5OiB0cy5CbG9ja3x1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGlmIChtZXRhLmJvZHkpIHtcbiAgICBib2R5ID0gdHMuY3JlYXRlQmxvY2soW1xuICAgICAgdHMuY3JlYXRlUmV0dXJuKHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSkpLFxuICAgIF0pO1xuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSAnaW5pdCcgcGFyYW1ldGVyIGl0c2VsZi5cbiAgY29uc3QgaW5pdFBhcmFtID0gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyAnaW5pdCcsXG4gICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGUgKi8gaW5pdFR5cGUsXG4gICAgICAvKiBpbml0aWFsaXplciAqLyB1bmRlZmluZWQsICk7XG5cbiAgLy8gQ3JlYXRlIHRoZSB0eXBlIGNvbnN0cnVjdG9yIG1ldGhvZCBkZWNsYXJhdGlvbi5cbiAgcmV0dXJuIHRzLmNyZWF0ZU1ldGhvZChcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovW3RzLmNyZWF0ZU1vZGlmaWVyKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCldLFxuICAgICAgLyogYXN0ZXJpc2tUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBuYW1lICovIG1ldGEuZm5OYW1lLFxuICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyBub2RlLnR5cGVQYXJhbWV0ZXJzLFxuICAgICAgLyogcGFyYW1ldGVycyAqL1tpbml0UGFyYW1dLFxuICAgICAgLyogdHlwZSAqLyByYXdUeXBlLFxuICAgICAgLyogYm9keSAqLyBib2R5LCApO1xufVxuIl19