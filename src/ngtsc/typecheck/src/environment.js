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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/environment", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_parameter_emitter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var ts_util_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util");
    var type_constructor_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor");
    var type_parameter_emitter_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_parameter_emitter");
    /**
     * A context which hosts one or more Type Check Blocks (TCBs).
     *
     * An `Environment` supports the generation of TCBs by tracking necessary imports, declarations of
     * type constructors, and other statements beyond the type-checking code within the TCB itself.
     * Through method calls on `Environment`, the TCB generator can request `ts.Expression`s which
     * reference declarations in the `Environment` for these artifacts`.
     *
     * `Environment` can be used in a standalone fashion, or can be extended to support more specialized
     * usage.
     */
    var Environment = /** @class */ (function () {
        function Environment(config, importManager, refEmitter, reflector, contextFile) {
            this.config = config;
            this.importManager = importManager;
            this.refEmitter = refEmitter;
            this.reflector = reflector;
            this.contextFile = contextFile;
            this.nextIds = {
                pipeInst: 1,
                typeCtor: 1,
            };
            this.typeCtors = new Map();
            this.typeCtorStatements = [];
            this.pipeInsts = new Map();
            this.pipeInstStatements = [];
            this.outputHelperIdent = null;
            this.helperStatements = [];
        }
        /**
         * Get an expression referring to a type constructor for the given directive.
         *
         * Depending on the shape of the directive itself, this could be either a reference to a declared
         * type constructor, or to an inline type constructor.
         */
        Environment.prototype.typeCtorFor = function (dir) {
            var dirRef = dir.ref;
            var node = dirRef.node;
            if (this.typeCtors.has(node)) {
                return this.typeCtors.get(node);
            }
            if (type_constructor_1.requiresInlineTypeCtor(node, this.reflector)) {
                // The constructor has already been created inline, we just need to construct a reference to
                // it.
                var ref = this.reference(dirRef);
                var typeCtorExpr = ts.createPropertyAccess(ref, 'ngTypeCtor');
                this.typeCtors.set(node, typeCtorExpr);
                return typeCtorExpr;
            }
            else {
                var fnName = "_ctor" + this.nextIds.typeCtor++;
                var nodeTypeRef = this.referenceType(dirRef);
                if (!ts.isTypeReferenceNode(nodeTypeRef)) {
                    throw new Error("Expected TypeReferenceNode from reference to " + dirRef.debugName);
                }
                var meta = {
                    fnName: fnName,
                    body: true,
                    fields: {
                        inputs: Object.keys(dir.inputs),
                        outputs: Object.keys(dir.outputs),
                        // TODO: support queries
                        queries: dir.queries,
                    },
                    coercedInputFields: dir.coercedInputFields,
                };
                var typeParams = this.emitTypeParameters(node);
                var typeCtor = type_constructor_1.generateTypeCtorDeclarationFn(node, meta, nodeTypeRef.typeName, typeParams, this.reflector);
                this.typeCtorStatements.push(typeCtor);
                var fnId = ts.createIdentifier(fnName);
                this.typeCtors.set(node, fnId);
                return fnId;
            }
        };
        /*
         * Get an expression referring to an instance of the given pipe.
         */
        Environment.prototype.pipeInst = function (ref) {
            if (this.pipeInsts.has(ref.node)) {
                return this.pipeInsts.get(ref.node);
            }
            var pipeType = this.referenceType(ref);
            var pipeInstId = ts.createIdentifier("_pipe" + this.nextIds.pipeInst++);
            this.pipeInstStatements.push(ts_util_1.tsDeclareVariable(pipeInstId, pipeType));
            this.pipeInsts.set(ref.node, pipeInstId);
            return pipeInstId;
        };
        /**
         * Declares a helper function to be able to cast directive outputs of type `EventEmitter<T>` to
         * have an accurate `subscribe()` method that properly carries over the generic type `T` into the
         * listener function passed as argument to `subscribe`. This is done to work around a typing
         * deficiency in `EventEmitter.subscribe`, where the listener function is typed as any.
         */
        Environment.prototype.declareOutputHelper = function () {
            if (this.outputHelperIdent !== null) {
                return this.outputHelperIdent;
            }
            var outputHelperIdent = ts.createIdentifier('_outputHelper');
            var genericTypeDecl = ts.createTypeParameterDeclaration('T');
            var genericTypeRef = ts.createTypeReferenceNode('T', /* typeParameters */ undefined);
            var eventEmitter = this.referenceExternalType('@angular/core', 'EventEmitter', [new compiler_1.ExpressionType(new compiler_1.WrappedNodeExpr(genericTypeRef))]);
            // Declare a type that has a `subscribe` method that carries over type `T` as parameter
            // into the callback. The below code generates the following type literal:
            // `{subscribe(cb: (event: T) => any): void;}`
            var observableLike = ts.createTypeLiteralNode([ts.createMethodSignature(
                /* typeParameters */ undefined, 
                /* parameters */ [ts.createParameter(
                    /* decorators */ undefined, 
                    /* modifiers */ undefined, 
                    /* dotDotDotToken */ undefined, 
                    /* name */ 'cb', 
                    /* questionToken */ undefined, 
                    /* type */ ts.createFunctionTypeNode(
                    /* typeParameters */ undefined, 
                    /* parameters */ [ts.createParameter(
                        /* decorators */ undefined, 
                        /* modifiers */ undefined, 
                        /* dotDotDotToken */ undefined, 
                        /* name */ 'event', 
                        /* questionToken */ undefined, 
                        /* type */ genericTypeRef)], 
                    /* type */ ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)))], 
                /* type */ ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword), 
                /* name */ 'subscribe', 
                /* questionToken */ undefined)]);
            // Declares the first signature of `_outputHelper` that matches arguments of type
            // `EventEmitter`, to convert them into `observableLike` defined above. The following
            // statement is generated:
            // `declare function _outputHelper<T>(output: EventEmitter<T>): observableLike;`
            this.helperStatements.push(ts.createFunctionDeclaration(
            /* decorators */ undefined, 
            /* modifiers */ [ts.createModifier(ts.SyntaxKind.DeclareKeyword)], 
            /* asteriskToken */ undefined, 
            /* name */ outputHelperIdent, 
            /* typeParameters */ [genericTypeDecl], 
            /* parameters */ [ts.createParameter(
                /* decorators */ undefined, 
                /* modifiers */ undefined, 
                /* dotDotDotToken */ undefined, 
                /* name */ 'output', 
                /* questionToken */ undefined, 
                /* type */ eventEmitter)], 
            /* type */ observableLike, 
            /* body */ undefined));
            // Declares the second signature of `_outputHelper` that matches all other argument types,
            // i.e. ensures type identity for output types other than `EventEmitter`. This corresponds
            // with the following statement:
            // `declare function _outputHelper<T>(output: T): T;`
            this.helperStatements.push(ts.createFunctionDeclaration(
            /* decorators */ undefined, 
            /* modifiers */ [ts.createModifier(ts.SyntaxKind.DeclareKeyword)], 
            /* asteriskToken */ undefined, 
            /* name */ outputHelperIdent, 
            /* typeParameters */ [genericTypeDecl], 
            /* parameters */ [ts.createParameter(
                /* decorators */ undefined, 
                /* modifiers */ undefined, 
                /* dotDotDotToken */ undefined, 
                /* name */ 'output', 
                /* questionToken */ undefined, 
                /* type */ genericTypeRef)], 
            /* type */ genericTypeRef, 
            /* body */ undefined));
            return this.outputHelperIdent = outputHelperIdent;
        };
        /**
         * Generate a `ts.Expression` that references the given node.
         *
         * This may involve importing the node into the file if it's not declared there already.
         */
        Environment.prototype.reference = function (ref) {
            var ngExpr = this.refEmitter.emit(ref, this.contextFile);
            // Use `translateExpression` to convert the `Expression` into a `ts.Expression`.
            return translator_1.translateExpression(ngExpr, this.importManager, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, ts.ScriptTarget.ES2015);
        };
        /**
         * Generate a `ts.TypeNode` that references the given node as a type.
         *
         * This may involve importing the node into the file if it's not declared there already.
         */
        Environment.prototype.referenceType = function (ref) {
            var ngExpr = this.refEmitter.emit(ref, this.contextFile);
            // Create an `ExpressionType` from the `Expression` and translate it via `translateType`.
            // TODO(alxhub): support references to types with generic arguments in a clean way.
            return translator_1.translateType(new compiler_1.ExpressionType(ngExpr), this.importManager);
        };
        Environment.prototype.emitTypeParameters = function (declaration) {
            var _this = this;
            var emitter = new type_parameter_emitter_1.TypeParameterEmitter(declaration.typeParameters, this.reflector);
            return emitter.emit(function (ref) { return _this.referenceType(ref); });
        };
        /**
         * Generate a `ts.TypeNode` that references a given type from the provided module.
         *
         * This will involve importing the type into the file, and will also add type parameters if
         * provided.
         */
        Environment.prototype.referenceExternalType = function (moduleName, name, typeParams) {
            var external = new compiler_1.ExternalExpr({ moduleName: moduleName, name: name });
            return translator_1.translateType(new compiler_1.ExpressionType(external, null, typeParams), this.importManager);
        };
        Environment.prototype.getPreludeStatements = function () {
            return tslib_1.__spread(this.helperStatements, this.pipeInstStatements, this.typeCtorStatements);
        };
        return Environment;
    }());
    exports.Environment = Environment;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvZW52aXJvbm1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXNGO0lBQ3RGLCtCQUFpQztJQUVqQyxtRUFBd0Y7SUFFeEYseUVBQW1GO0lBR25GLGlGQUE0QztJQUM1QyxtR0FBeUY7SUFDekYsK0dBQThEO0lBRTlEOzs7Ozs7Ozs7O09BVUc7SUFDSDtRQWVFLHFCQUNhLE1BQTBCLEVBQVksYUFBNEIsRUFDbkUsVUFBNEIsRUFBVSxTQUF5QixFQUM3RCxXQUEwQjtZQUYzQixXQUFNLEdBQU4sTUFBTSxDQUFvQjtZQUFZLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1lBQ25FLGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDN0QsZ0JBQVcsR0FBWCxXQUFXLENBQWU7WUFqQmhDLFlBQU8sR0FBRztnQkFDaEIsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsUUFBUSxFQUFFLENBQUM7YUFDWixDQUFDO1lBRU0sY0FBUyxHQUFHLElBQUksR0FBRyxFQUFtQyxDQUFDO1lBQ3JELHVCQUFrQixHQUFtQixFQUFFLENBQUM7WUFFMUMsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFtQyxDQUFDO1lBQ3JELHVCQUFrQixHQUFtQixFQUFFLENBQUM7WUFFMUMsc0JBQWlCLEdBQXVCLElBQUksQ0FBQztZQUMzQyxxQkFBZ0IsR0FBbUIsRUFBRSxDQUFDO1FBS0wsQ0FBQztRQUU1Qzs7Ozs7V0FLRztRQUNILGlDQUFXLEdBQVgsVUFBWSxHQUErQjtZQUN6QyxJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBdUQsQ0FBQztZQUMzRSxJQUFNLElBQUksR0FBRyxNQUFNLENBQUMs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QUFDLFdBQVcsQ0FBQyxDQUFDO1lBRTNELHlGQUF5RjtZQUN6RixtRkFBbUY7WUFDbkYsT0FBTywwQkFBYSxDQUFDLElBQUkseUJBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUVPLHdDQUFrQixHQUExQixVQUEyQixXQUFrRDtZQUE3RSxpQkFJQztZQUZDLElBQU0sT0FBTyxHQUFHLElBQUksNkNBQW9CLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDckYsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsS0FBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBdkIsQ0FBdUIsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFFRDs7Ozs7V0FLRztRQUNILDJDQUFxQixHQUFyQixVQUFzQixVQUFrQixFQUFFLElBQVksRUFBRSxVQUFtQjtZQUN6RSxJQUFNLFFBQVEsR0FBRyxJQUFJLHVCQUFZLENBQUMsRUFBQyxVQUFVLFlBQUEsRUFBRSxJQUFJLE1BQUEsRUFBQyxDQUFDLENBQUM7WUFDdEQsT0FBTywwQkFBYSxDQUFDLElBQUkseUJBQWMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMzRixDQUFDO1FBRUQsMENBQW9CLEdBQXBCO1lBQ0Usd0JBQ0ssSUFBSSxDQUFDLGdCQUFnQixFQUNyQixJQUFJLENBQUMsa0JBQWtCLEVBQ3ZCLElBQUksQ0FBQyxrQkFBa0IsRUFDMUI7UUFDSixDQUFDO1FBQ0gsa0JBQUM7SUFBRCxDQUFDLEFBNU5ELElBNE5DO0lBNU5ZLGtDQUFXIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb25UeXBlLCBFeHRlcm5hbEV4cHIsIFR5cGUsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Tk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVFeHByZXNzaW9uLCB0cmFuc2xhdGVUeXBlfSBmcm9tICcuLi8uLi90cmFuc2xhdG9yJztcblxuaW1wb3J0IHtUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgVHlwZUNoZWNraW5nQ29uZmlnLCBUeXBlQ3Rvck1ldGFkYXRhfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge3RzRGVjbGFyZVZhcmlhYmxlfSBmcm9tICcuL3RzX3V0aWwnO1xuaW1wb3J0IHtnZW5lcmF0ZVR5cGVDdG9yRGVjbGFyYXRpb25GbiwgcmVxdWlyZXNJbmxpbmVUeXBlQ3Rvcn0gZnJvbSAnLi90eXBlX2NvbnN0cnVjdG9yJztcbmltcG9ydCB7VHlwZVBhcmFtZXRlckVtaXR0ZXJ9IGZyb20gJy4vdHlwZV9wYXJhbWV0ZXJfZW1pdHRlcic7XG5cbi8qKlxuICogQSBjb250ZXh0IHdoaWNoIGhvc3RzIG9uZSBvciBtb3JlIFR5cGUgQ2hlY2sgQmxvY2tzIChUQ0JzKS5cbiAqXG4gKiBBbiBgRW52aXJvbm1lbnRgIHN1cHBvcnRzIHRoZSBnZW5lcmF0aW9uIG9mIFRDQnMgYnkgdHJhY2tpbmcgbmVjZXNzYXJ5IGltcG9ydHMsIGRlY2xhcmF0aW9ucyBvZlxuICogdHlwZSBjb25zdHJ1Y3RvcnMsIGFuZCBvdGhlciBzdGF0ZW1lbnRzIGJleW9uZCB0aGUgdHlwZS1jaGVja2luZyBjb2RlIHdpdGhpbiB0aGUgVENCIGl0c2VsZi5cbiAqIFRocm91Z2ggbWV0aG9kIGNhbGxzIG9uIGBFbnZpcm9ubWVudGAsIHRoZSBUQ0IgZ2VuZXJhdG9yIGNhbiByZXF1ZXN0IGB0cy5FeHByZXNzaW9uYHMgd2hpY2hcbiAqIHJlZmVyZW5jZSBkZWNsYXJhdGlvbnMgaW4gdGhlIGBFbnZpcm9ubWVudGAgZm9yIHRoZXNlIGFydGlmYWN0c2AuXG4gKlxuICogYEVudmlyb25tZW50YCBjYW4gYmUgdXNlZCBpbiBhIHN0YW5kYWxvbmUgZmFzaGlvbiwgb3IgY2FuIGJlIGV4dGVuZGVkIHRvIHN1cHBvcnQgbW9yZSBzcGVjaWFsaXplZFxuICogdXNhZ2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBFbnZpcm9ubWVudCB7XG4gIHByaXZhdGUgbmV4dElkcyA9IHtcbiAgICBwaXBlSW5zdDogMSxcbiAgICB0eXBlQ3RvcjogMSxcbiAgfTtcblxuICBwcml2YXRlIHR5cGVDdG9ycyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgdHMuRXhwcmVzc2lvbj4oKTtcbiAgcHJvdGVjdGVkIHR5cGVDdG9yU3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcblxuICBwcml2YXRlIHBpcGVJbnN0cyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgdHMuRXhwcmVzc2lvbj4oKTtcbiAgcHJvdGVjdGVkIHBpcGVJbnN0U3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcblxuICBwcml2YXRlIG91dHB1dEhlbHBlcklkZW50OiB0cy5JZGVudGlmaWVyfG51bGwgPSBudWxsO1xuICBwcm90ZWN0ZWQgaGVscGVyU3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnLCBwcm90ZWN0ZWQgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlcixcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJvdGVjdGVkIGNvbnRleHRGaWxlOiB0cy5Tb3VyY2VGaWxlKSB7fVxuXG4gIC8qKlxuICAgKiBHZXQgYW4gZXhwcmVzc2lvbiByZWZlcnJpbmcgdG8gYSB0eXBlIGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gZGlyZWN0aXZlLlxuICAgKlxuICAgKiBEZXBlbmRpbmcgb24gdGhlIHNoYXBlIG9mIHRoZSBkaXJlY3RpdmUgaXRzZWxmLCB0aGlzIGNvdWxkIGJlIGVpdGhlciBhIHJlZmVyZW5jZSB0byBhIGRlY2xhcmVkXG4gICAqIHR5cGUgY29uc3RydWN0b3IsIG9yIHRvIGFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgdHlwZUN0b3JGb3IoZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGRpclJlZiA9IGRpci5yZWYgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+O1xuICAgIGNvbnN0IG5vZGUgPSBkaXJSZWYubm9kZTtcbiAgICBpZiAodGhpcy50eXBlQ3RvcnMuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy50eXBlQ3RvcnMuZ2V0KG5vZGUpICE7XG4gICAgfVxuXG4gICAgaWYgKHJlcXVpcmVzSW5saW5lVHlwZUN0b3Iobm9kZSwgdGhpcy5yZWZsZWN0b3IpKSB7XG4gICAgICAvLyBUaGUgY29uc3RydWN0b3IgaGFzIGFscmVhZHkgYmVlbiBjcmVhdGVkIGlubGluZSwgd2UganVzdCBuZWVkIHRvIGNvbnN0cnVjdCBhIHJlZmVyZW5jZSB0b1xuICAgICAgLy8gaXQuXG4gICAgICBjb25zdCByZWYgPSB0aGlzLnJlZmVyZW5jZShkaXJSZWYpO1xuICAgICAgY29uc3QgdHlwZUN0b3JFeHByID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MocmVmLCAnbmdUeXBlQ3RvcicpO1xuICAgICAgdGhpcy50eXBlQ3RvcnMuc2V0KG5vZGUsIHR5cGVDdG9yRXhwcik7XG4gICAgICByZXR1cm4gdHlwZUN0b3JFeHByO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBmbk5hbWUgPSBgX2N0b3Ike3RoaXMubmV4dElkcy50eXBlQ3RvcisrfWA7XG4gICAgICBjb25zdCBub2RlVHlwZVJlZiA9IHRoaXMucmVmZXJlbmNlVHlwZShkaXJSZWYpO1xuICAgICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKG5vZGVUeXBlUmVmKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlIGZyb20gcmVmZXJlbmNlIHRvICR7ZGlyUmVmLmRlYnVnTmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEgPSB7XG4gICAgICAgIGZuTmFtZSxcbiAgICAgICAgYm9keTogdHJ1ZSxcbiAgICAgICAgZmllbGRzOiB7XG4gICAgICAgICAgaW5wdXRzOiBPYmplY3Qua2V5cyhkaXIuaW5wdXRzKSxcbiAgICAgICAgICBvdXRwdXRzOiBPYmplY3Qua2V5cyhkaXIub3V0cHV0cyksXG4gICAgICAgICAgLy8gVE9ETzogc3VwcG9ydCBxdWVyaWVzXG4gICAgICAgICAgcXVlcmllczogZGlyLnF1ZXJpZXMsXG4gICAgICAgIH0sXG4gICAgICAgIGNvZXJjZWRJbnB1dEZpZWxkczogZGlyLmNvZXJjZWRJbnB1dEZpZWxkcyxcbiAgICAgIH07XG4gICAgICBjb25zdCB0eXBlUGFyYW1zID0gdGhpcy5lbWl0VHlwZVBhcmFtZXRlcnMobm9kZSk7XG4gICAgICBjb25zdCB0eXBlQ3RvciA9IGdlbmVyYXRlVHlwZUN0b3JEZWNsYXJhdGlvbkZuKFxuICAgICAgICAgIG5vZGUsIG1ldGEsIG5vZGVUeXBlUmVmLnR5cGVOYW1lLCB0eXBlUGFyYW1zLCB0aGlzLnJlZmxlY3Rvcik7XG4gICAgICB0aGlzLnR5cGVDdG9yU3RhdGVtZW50cy5wdXNoKHR5cGVDdG9yKTtcbiAgICAgIGNvbnN0IGZuSWQgPSB0cy5jcmVhdGVJZGVudGlmaWVyKGZuTmFtZSk7XG4gICAgICB0aGlzLnR5cGVDdG9ycy5zZXQobm9kZSwgZm5JZCk7XG4gICAgICByZXR1cm4gZm5JZDtcbiAgICB9XG4gIH1cblxuICAvKlxuICAgKiBHZXQgYW4gZXhwcmVzc2lvbiByZWZlcnJpbmcgdG8gYW4gaW5zdGFuY2Ugb2YgdGhlIGdpdmVuIHBpcGUuXG4gICAqL1xuICBwaXBlSW5zdChyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pik6IHRzLkV4cHJlc3Npb24ge1xuICAgIGlmICh0aGlzLnBpcGVJbnN0cy5oYXMocmVmLm5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5waXBlSW5zdHMuZ2V0KHJlZi5ub2RlKSAhO1xuICAgIH1cblxuICAgIGNvbnN0IHBpcGVUeXBlID0gdGhpcy5yZWZlcmVuY2VUeXBlKHJlZik7XG4gICAgY29uc3QgcGlwZUluc3RJZCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIoYF9waXBlJHt0aGlzLm5leHRJZHMucGlwZUluc3QrK31gKTtcblxuICAgIHRoaXMucGlwZUluc3RTdGF0ZW1lbnRzLnB1c2godHNEZWNsYXJlVmFyaWFibGUocGlwZUluc3RJZCwgcGlwZVR5cGUpKTtcbiAgICB0aGlzLnBpcGVJbnN0cy5zZXQocmVmLm5vZGUsIHBpcGVJbnN0SWQpO1xuXG4gICAgcmV0dXJuIHBpcGVJbnN0SWQ7XG4gIH1cblxuICAvKipcbiAgICogRGVjbGFyZXMgYSBoZWxwZXIgZnVuY3Rpb24gdG8gYmUgYWJsZSB0byBjYXN0IGRpcmVjdGl2ZSBvdXRwdXRzIG9mIHR5cGUgYEV2ZW50RW1pdHRlcjxUPmAgdG9cbiAgICogaGF2ZSBhbiBhY2N1cmF0ZSBgc3Vic2NyaWJlKClgIG1ldGhvZCB0aGF0IHByb3Blcmx5IGNhcnJpZXMgb3ZlciB0aGUgZ2VuZXJpYyB0eXBlIGBUYCBpbnRvIHRoZVxuICAgKiBsaXN0ZW5lciBmdW5jdGlvbiBwYXNzZWQgYXMgYXJndW1lbnQgdG8gYHN1YnNjcmliZWAuIFRoaXMgaXMgZG9uZSB0byB3b3JrIGFyb3VuZCBhIHR5cGluZ1xuICAgKiBkZWZpY2llbmN5IGluIGBFdmVudEVtaXR0ZXIuc3Vic2NyaWJlYCwgd2hlcmUgdGhlIGxpc3RlbmVyIGZ1bmN0aW9uIGlzIHR5cGVkIGFzIGFueS5cbiAgICovXG4gIGRlY2xhcmVPdXRwdXRIZWxwZXIoKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgaWYgKHRoaXMub3V0cHV0SGVscGVySWRlbnQgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLm91dHB1dEhlbHBlcklkZW50O1xuICAgIH1cblxuICAgIGNvbnN0IG91dHB1dEhlbHBlcklkZW50ID0gdHMuY3JlYXRlSWRlbnRpZmllcignX291dHB1dEhlbHBlcicpO1xuICAgIGNvbnN0IGdlbmVyaWNUeXBlRGVjbCA9IHRzLmNyZWF0ZVR5cGVQYXJhbWV0ZXJEZWNsYXJhdGlvbignVCcpO1xuICAgIGNvbnN0IGdlbmVyaWNUeXBlUmVmID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUoJ1QnLCAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQpO1xuXG4gICAgY29uc3QgZXZlbnRFbWl0dGVyID0gdGhpcy5yZWZlcmVuY2VFeHRlcm5hbFR5cGUoXG4gICAgICAgICdAYW5ndWxhci9jb3JlJywgJ0V2ZW50RW1pdHRlcicsIFtuZXcgRXhwcmVzc2lvblR5cGUobmV3IFdyYXBwZWROb2RlRXhwcihnZW5lcmljVHlwZVJlZikpXSk7XG5cbiAgICAvLyBEZWNsYXJlIGEgdHlwZSB0aGF0IGhhcyBhIGBzdWJzY3JpYmVgIG1ldGhvZCB0aGF0IGNhcnJpZXMgb3ZlciB0eXBlIGBUYCBhcyBwYXJhbWV0ZXJcbiAgICAvLyBpbnRvIHRoZSBjYWxsYmFjay4gVGhlIGJlbG93IGNvZGUgZ2VuZXJhdGVzIHRoZSBmb2xsb3dpbmcgdHlwZSBsaXRlcmFsOlxuICAgIC8vIGB7c3Vic2NyaWJlKGNiOiAoZXZlbnQ6IFQpID0+IGFueSk6IHZvaWQ7fWBcbiAgICBjb25zdCBvYnNlcnZhYmxlTGlrZSA9IHRzLmNyZWF0ZVR5cGVMaXRlcmFsTm9kZShbdHMuY3JlYXRlTWV0aG9kU2lnbmF0dXJlKFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIHBhcmFtZXRlcnMgKi9bdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogbmFtZSAqLyAnY2InLFxuICAgICAgICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiB0eXBlICovIHRzLmNyZWF0ZUZ1bmN0aW9uVHlwZU5vZGUoXG4gICAgICAgICAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIC8qIHBhcmFtZXRlcnMgKi9bdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAvKiBuYW1lICovICdldmVudCcsXG4gICAgICAgICAgICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAvKiB0eXBlICovIGdlbmVyaWNUeXBlUmVmKV0sXG4gICAgICAgICAgICAgICAgLyogdHlwZSAqLyB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSkpXSxcbiAgICAgICAgLyogdHlwZSAqLyB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5Wb2lkS2V5d29yZCksXG4gICAgICAgIC8qIG5hbWUgKi8gJ3N1YnNjcmliZScsXG4gICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkKV0pO1xuXG4gICAgLy8gRGVjbGFyZXMgdGhlIGZpcnN0IHNpZ25hdHVyZSBvZiBgX291dHB1dEhlbHBlcmAgdGhhdCBtYXRjaGVzIGFyZ3VtZW50cyBvZiB0eXBlXG4gICAgLy8gYEV2ZW50RW1pdHRlcmAsIHRvIGNvbnZlcnQgdGhlbSBpbnRvIGBvYnNlcnZhYmxlTGlrZWAgZGVmaW5lZCBhYm92ZS4gVGhlIGZvbGxvd2luZ1xuICAgIC8vIHN0YXRlbWVudCBpcyBnZW5lcmF0ZWQ6XG4gICAgLy8gYGRlY2xhcmUgZnVuY3Rpb24gX291dHB1dEhlbHBlcjxUPihvdXRwdXQ6IEV2ZW50RW1pdHRlcjxUPik6IG9ic2VydmFibGVMaWtlO2BcbiAgICB0aGlzLmhlbHBlclN0YXRlbWVudHMucHVzaCh0cy5jcmVhdGVGdW5jdGlvbkRlY2xhcmF0aW9uKFxuICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgLyogbW9kaWZpZXJzICovW3RzLmNyZWF0ZU1vZGlmaWVyKHRzLlN5bnRheEtpbmQuRGVjbGFyZUtleXdvcmQpXSxcbiAgICAgICAgLyogYXN0ZXJpc2tUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIG5hbWUgKi8gb3V0cHV0SGVscGVySWRlbnQsXG4gICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovW2dlbmVyaWNUeXBlRGVjbF0sXG4gICAgICAgIC8qIHBhcmFtZXRlcnMgKi9bdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogbmFtZSAqLyAnb3V0cHV0JyxcbiAgICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogdHlwZSAqLyBldmVudEVtaXR0ZXIpXSxcbiAgICAgICAgLyogdHlwZSAqLyBvYnNlcnZhYmxlTGlrZSxcbiAgICAgICAgLyogYm9keSAqLyB1bmRlZmluZWQpKTtcblxuICAgIC8vIERlY2xhcmVzIHRoZSBzZWNvbmQgc2lnbmF0dXJlIG9mIGBfb3V0cHV0SGVscGVyYCB0aGF0IG1hdGNoZXMgYWxsIG90aGVyIGFyZ3VtZW50IHR5cGVzLFxuICAgIC8vIGkuZS4gZW5zdXJlcyB0eXBlIGlkZW50aXR5IGZvciBvdXRwdXQgdHlwZXMgb3RoZXIgdGhhbiBgRXZlbnRFbWl0dGVyYC4gVGhpcyBjb3JyZXNwb25kc1xuICAgIC8vIHdpdGggdGhlIGZvbGxvd2luZyBzdGF0ZW1lbnQ6XG4gICAgLy8gYGRlY2xhcmUgZnVuY3Rpb24gX291dHB1dEhlbHBlcjxUPihvdXRwdXQ6IFQpOiBUO2BcbiAgICB0aGlzLmhlbHBlclN0YXRlbWVudHMucHVzaCh0cy5jcmVhdGVGdW5jdGlvbkRlY2xhcmF0aW9uKFxuICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgLyogbW9kaWZpZXJzICovW3RzLmNyZWF0ZU1vZGlmaWVyKHRzLlN5bnRheEtpbmQuRGVjbGFyZUtleXdvcmQpXSxcbiAgICAgICAgLyogYXN0ZXJpc2tUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIG5hbWUgKi8gb3V0cHV0SGVscGVySWRlbnQsXG4gICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovW2dlbmVyaWNUeXBlRGVjbF0sXG4gICAgICAgIC8qIHBhcmFtZXRlcnMgKi9bdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogbmFtZSAqLyAnb3V0cHV0JyxcbiAgICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogdHlwZSAqLyBnZW5lcmljVHlwZVJlZildLFxuICAgICAgICAvKiB0eXBlICovIGdlbmVyaWNUeXBlUmVmLFxuICAgICAgICAvKiBib2R5ICovIHVuZGVmaW5lZCkpO1xuXG4gICAgcmV0dXJuIHRoaXMub3V0cHV0SGVscGVySWRlbnQgPSBvdXRwdXRIZWxwZXJJZGVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBhIGB0cy5FeHByZXNzaW9uYCB0aGF0IHJlZmVyZW5jZXMgdGhlIGdpdmVuIG5vZGUuXG4gICAqXG4gICAqIFRoaXMgbWF5IGludm9sdmUgaW1wb3J0aW5nIHRoZSBub2RlIGludG8gdGhlIGZpbGUgaWYgaXQncyBub3QgZGVjbGFyZWQgdGhlcmUgYWxyZWFkeS5cbiAgICovXG4gIHJlZmVyZW5jZShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pik6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IG5nRXhwciA9IHRoaXMucmVmRW1pdHRlci5lbWl0KHJlZiwgdGhpcy5jb250ZXh0RmlsZSk7XG5cbiAgICAvLyBVc2UgYHRyYW5zbGF0ZUV4cHJlc3Npb25gIHRvIGNvbnZlcnQgdGhlIGBFeHByZXNzaW9uYCBpbnRvIGEgYHRzLkV4cHJlc3Npb25gLlxuICAgIHJldHVybiB0cmFuc2xhdGVFeHByZXNzaW9uKFxuICAgICAgICBuZ0V4cHIsIHRoaXMuaW1wb3J0TWFuYWdlciwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSk7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgYSBgdHMuVHlwZU5vZGVgIHRoYXQgcmVmZXJlbmNlcyB0aGUgZ2l2ZW4gbm9kZSBhcyBhIHR5cGUuXG4gICAqXG4gICAqIFRoaXMgbWF5IGludm9sdmUgaW1wb3J0aW5nIHRoZSBub2RlIGludG8gdGhlIGZpbGUgaWYgaXQncyBub3QgZGVjbGFyZWQgdGhlcmUgYWxyZWFkeS5cbiAgICovXG4gIHJlZmVyZW5jZVR5cGUocmVmOiBSZWZlcmVuY2UpOiB0cy5UeXBlTm9kZSB7XG4gICAgY29uc3QgbmdFeHByID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQocmVmLCB0aGlzLmNvbnRleHRGaWxlKTtcblxuICAgIC8vIENyZWF0ZSBhbiBgRXhwcmVzc2lvblR5cGVgIGZyb20gdGhlIGBFeHByZXNzaW9uYCBhbmQgdHJhbnNsYXRlIGl0IHZpYSBgdHJhbnNsYXRlVHlwZWAuXG4gICAgLy8gVE9ETyhhbHhodWIpOiBzdXBwb3J0IHJlZmVyZW5jZXMgdG8gdHlwZXMgd2l0aCBnZW5lcmljIGFyZ3VtZW50cyBpbiBhIGNsZWFuIHdheS5cbiAgICByZXR1cm4gdHJhbnNsYXRlVHlwZShuZXcgRXhwcmVzc2lvblR5cGUobmdFeHByKSwgdGhpcy5pbXBvcnRNYW5hZ2VyKTtcbiAgfVxuXG4gIHByaXZhdGUgZW1pdFR5cGVQYXJhbWV0ZXJzKGRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+KTpcbiAgICAgIHRzLlR5cGVQYXJhbWV0ZXJEZWNsYXJhdGlvbltdfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZW1pdHRlciA9IG5ldyBUeXBlUGFyYW1ldGVyRW1pdHRlcihkZWNsYXJhdGlvbi50eXBlUGFyYW1ldGVycywgdGhpcy5yZWZsZWN0b3IpO1xuICAgIHJldHVybiBlbWl0dGVyLmVtaXQocmVmID0+IHRoaXMucmVmZXJlbmNlVHlwZShyZWYpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBhIGB0cy5UeXBlTm9kZWAgdGhhdCByZWZlcmVuY2VzIGEgZ2l2ZW4gdHlwZSBmcm9tIHRoZSBwcm92aWRlZCBtb2R1bGUuXG4gICAqXG4gICAqIFRoaXMgd2lsbCBpbnZvbHZlIGltcG9ydGluZyB0aGUgdHlwZSBpbnRvIHRoZSBmaWxlLCBhbmQgd2lsbCBhbHNvIGFkZCB0eXBlIHBhcmFtZXRlcnMgaWZcbiAgICogcHJvdmlkZWQuXG4gICAqL1xuICByZWZlcmVuY2VFeHRlcm5hbFR5cGUobW9kdWxlTmFtZTogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIHR5cGVQYXJhbXM/OiBUeXBlW10pOiB0cy5UeXBlTm9kZSB7XG4gICAgY29uc3QgZXh0ZXJuYWwgPSBuZXcgRXh0ZXJuYWxFeHByKHttb2R1bGVOYW1lLCBuYW1lfSk7XG4gICAgcmV0dXJuIHRyYW5zbGF0ZVR5cGUobmV3IEV4cHJlc3Npb25UeXBlKGV4dGVybmFsLCBudWxsLCB0eXBlUGFyYW1zKSwgdGhpcy5pbXBvcnRNYW5hZ2VyKTtcbiAgfVxuXG4gIGdldFByZWx1ZGVTdGF0ZW1lbnRzKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gW1xuICAgICAgLi4udGhpcy5oZWxwZXJTdGF0ZW1lbnRzLFxuICAgICAgLi4udGhpcy5waXBlSW5zdFN0YXRlbWVudHMsXG4gICAgICAuLi50aGlzLnR5cGVDdG9yU3RhdGVtZW50cyxcbiAgICBdO1xuICB9XG59XG4iXX0=