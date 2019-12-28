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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/environment", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor"], factory);
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
        function Environment(config, importManager, refEmitter, contextFile) {
            this.config = config;
            this.importManager = importManager;
            this.refEmitter = refEmitter;
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
            if (type_constructor_1.requiresInlineTypeCtor(node)) {
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
                var typeCtor = type_constructor_1.generateTypeCtorDeclarationFn(node, meta, nodeTypeRef.typeName, this.config);
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
            var eventEmitter = this.referenceExternalType('@angular/core', 'EventEmitter', [new compiler_1.ExpressionType(new compiler_1.ReadVarExpr('T'))]);
            var outputHelperIdent = ts.createIdentifier('_outputHelper');
            var genericTypeDecl = ts.createTypeParameterDeclaration('T');
            var genericTypeRef = ts.createTypeReferenceNode('T', /* typeParameters */ undefined);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvZW52aXJvbm1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQWtGO0lBQ2xGLCtCQUFpQztJQUVqQyxtRUFBd0Y7SUFFeEYseUVBQW1GO0lBR25GLGlGQUE0QztJQUM1QyxtR0FBeUY7SUFFekY7Ozs7Ozs7Ozs7T0FVRztJQUNIO1FBZUUscUJBQ2EsTUFBMEIsRUFBWSxhQUE0QixFQUNuRSxVQUE0QixFQUFZLFdBQTBCO1lBRGpFLFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQVksa0JBQWEsR0FBYixhQUFhLENBQWU7WUFDbkUsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFBWSxnQkFBVyxHQUFYLFdBQVcsQ0FBZTtZQWhCdEUsWUFBTyxHQUFHO2dCQUNoQixRQUFRLEVBQUUsQ0FBQztnQkFDWCxRQUFRLEVBQUUsQ0FBQzthQUNaLENBQUM7WUFFTSxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQW1DLENBQUM7WUFDckQsdUJBQWtCLEdBQW1CLEVBQUUsQ0FBQztZQUUxQyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQW1DLENBQUM7WUFDckQsdUJBQWtCLEdBQW1CLEVBQUUsQ0FBQztZQUUxQyxzQkFBaUIsR0FBdUIsSUFBSSxDQUFDO1lBQzNDLHFCQUFnQixHQUFtQixFQUFFLENBQUM7UUFJaUMsQ0FBQztRQUVsRjs7Ozs7V0FLRztRQUNILGlDQUFXLEdBQVgsVUFBWSxHQUErQjtZQUN6QyxJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBdUQsQ0FBQztZQUMzRSxJQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ3pCLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMs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Ozs7V0FLRztRQUNILDJDQUFxQixHQUFyQixVQUFzQixVQUFrQixFQUFFLElBQVksRUFBRSxVQUFtQjtZQUN6RSxJQUFNLFFBQVEsR0FBRyxJQUFJLHVCQUFZLENBQUMsRUFBQyxVQUFVLFlBQUEsRUFBRSxJQUFJLE1BQUEsRUFBQyxDQUFDLENBQUM7WUFDdEQsT0FBTywwQkFBYSxDQUFDLElBQUkseUJBQWMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMzRixDQUFDO1FBRUQsMENBQW9CLEdBQXBCO1lBQ0Usd0JBQ0ssSUFBSSxDQUFDLGdCQUFnQixFQUNyQixJQUFJLENBQUMsa0JBQWtCLEVBQ3ZCLElBQUksQ0FBQyxrQkFBa0IsRUFDMUI7UUFDSixDQUFDO1FBQ0gsa0JBQUM7SUFBRCxDQUFDLEFBbk5ELElBbU5DO0lBbk5ZLGtDQUFXIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb25UeXBlLCBFeHRlcm5hbEV4cHIsIFJlYWRWYXJFeHByLCBUeXBlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlRXhwcmVzc2lvbiwgdHJhbnNsYXRlVHlwZX0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5cbmltcG9ydCB7VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIFR5cGVDaGVja2luZ0NvbmZpZywgVHlwZUN0b3JNZXRhZGF0YX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHt0c0RlY2xhcmVWYXJpYWJsZX0gZnJvbSAnLi90c191dGlsJztcbmltcG9ydCB7Z2VuZXJhdGVUeXBlQ3RvckRlY2xhcmF0aW9uRm4sIHJlcXVpcmVzSW5saW5lVHlwZUN0b3J9IGZyb20gJy4vdHlwZV9jb25zdHJ1Y3Rvcic7XG5cbi8qKlxuICogQSBjb250ZXh0IHdoaWNoIGhvc3RzIG9uZSBvciBtb3JlIFR5cGUgQ2hlY2sgQmxvY2tzIChUQ0JzKS5cbiAqXG4gKiBBbiBgRW52aXJvbm1lbnRgIHN1cHBvcnRzIHRoZSBnZW5lcmF0aW9uIG9mIFRDQnMgYnkgdHJhY2tpbmcgbmVjZXNzYXJ5IGltcG9ydHMsIGRlY2xhcmF0aW9ucyBvZlxuICogdHlwZSBjb25zdHJ1Y3RvcnMsIGFuZCBvdGhlciBzdGF0ZW1lbnRzIGJleW9uZCB0aGUgdHlwZS1jaGVja2luZyBjb2RlIHdpdGhpbiB0aGUgVENCIGl0c2VsZi5cbiAqIFRocm91Z2ggbWV0aG9kIGNhbGxzIG9uIGBFbnZpcm9ubWVudGAsIHRoZSBUQ0IgZ2VuZXJhdG9yIGNhbiByZXF1ZXN0IGB0cy5FeHByZXNzaW9uYHMgd2hpY2hcbiAqIHJlZmVyZW5jZSBkZWNsYXJhdGlvbnMgaW4gdGhlIGBFbnZpcm9ubWVudGAgZm9yIHRoZXNlIGFydGlmYWN0c2AuXG4gKlxuICogYEVudmlyb25tZW50YCBjYW4gYmUgdXNlZCBpbiBhIHN0YW5kYWxvbmUgZmFzaGlvbiwgb3IgY2FuIGJlIGV4dGVuZGVkIHRvIHN1cHBvcnQgbW9yZSBzcGVjaWFsaXplZFxuICogdXNhZ2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBFbnZpcm9ubWVudCB7XG4gIHByaXZhdGUgbmV4dElkcyA9IHtcbiAgICBwaXBlSW5zdDogMSxcbiAgICB0eXBlQ3RvcjogMSxcbiAgfTtcblxuICBwcml2YXRlIHR5cGVDdG9ycyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgdHMuRXhwcmVzc2lvbj4oKTtcbiAgcHJvdGVjdGVkIHR5cGVDdG9yU3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcblxuICBwcml2YXRlIHBpcGVJbnN0cyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgdHMuRXhwcmVzc2lvbj4oKTtcbiAgcHJvdGVjdGVkIHBpcGVJbnN0U3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcblxuICBwcml2YXRlIG91dHB1dEhlbHBlcklkZW50OiB0cy5JZGVudGlmaWVyfG51bGwgPSBudWxsO1xuICBwcm90ZWN0ZWQgaGVscGVyU3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnLCBwcm90ZWN0ZWQgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlcixcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJvdGVjdGVkIGNvbnRleHRGaWxlOiB0cy5Tb3VyY2VGaWxlKSB7fVxuXG4gIC8qKlxuICAgKiBHZXQgYW4gZXhwcmVzc2lvbiByZWZlcnJpbmcgdG8gYSB0eXBlIGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gZGlyZWN0aXZlLlxuICAgKlxuICAgKiBEZXBlbmRpbmcgb24gdGhlIHNoYXBlIG9mIHRoZSBkaXJlY3RpdmUgaXRzZWxmLCB0aGlzIGNvdWxkIGJlIGVpdGhlciBhIHJlZmVyZW5jZSB0byBhIGRlY2xhcmVkXG4gICAqIHR5cGUgY29uc3RydWN0b3IsIG9yIHRvIGFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgdHlwZUN0b3JGb3IoZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGRpclJlZiA9IGRpci5yZWYgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+O1xuICAgIGNvbnN0IG5vZGUgPSBkaXJSZWYubm9kZTtcbiAgICBpZiAodGhpcy50eXBlQ3RvcnMuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy50eXBlQ3RvcnMuZ2V0KG5vZGUpICE7XG4gICAgfVxuXG4gICAgaWYgKHJlcXVpcmVzSW5saW5lVHlwZUN0b3Iobm9kZSkpIHtcbiAgICAgIC8vIFRoZSBjb25zdHJ1Y3RvciBoYXMgYWxyZWFkeSBiZWVuIGNyZWF0ZWQgaW5saW5lLCB3ZSBqdXN0IG5lZWQgdG8gY29uc3RydWN0IGEgcmVmZXJlbmNlIHRvXG4gICAgICAvLyBpdC5cbiAgICAgIGNvbnN0IHJlZiA9IHRoaXMucmVmZXJlbmNlKGRpclJlZik7XG4gICAgICBjb25zdCB0eXBlQ3RvckV4cHIgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhyZWYsICduZ1R5cGVDdG9yJyk7XG4gICAgICB0aGlzLnR5cGVDdG9ycy5zZXQobm9kZSwgdHlwZUN0b3JFeHByKTtcbiAgICAgIHJldHVybiB0eXBlQ3RvckV4cHI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGZuTmFtZSA9IGBfY3RvciR7dGhpcy5uZXh0SWRzLnR5cGVDdG9yKyt9YDtcbiAgICAgIGNvbnN0IG5vZGVUeXBlUmVmID0gdGhpcy5yZWZlcmVuY2VUeXBlKGRpclJlZik7XG4gICAgICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUobm9kZVR5cGVSZWYpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgVHlwZVJlZmVyZW5jZU5vZGUgZnJvbSByZWZlcmVuY2UgdG8gJHtkaXJSZWYuZGVidWdOYW1lfWApO1xuICAgICAgfVxuICAgICAgY29uc3QgbWV0YTogVHlwZUN0b3JNZXRhZGF0YSA9IHtcbiAgICAgICAgZm5OYW1lLFxuICAgICAgICBib2R5OiB0cnVlLFxuICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICBpbnB1dHM6IE9iamVjdC5rZXlzKGRpci5pbnB1dHMpLFxuICAgICAgICAgIG91dHB1dHM6IE9iamVjdC5rZXlzKGRpci5vdXRwdXRzKSxcbiAgICAgICAgICAvLyBUT0RPOiBzdXBwb3J0IHF1ZXJpZXNcbiAgICAgICAgICBxdWVyaWVzOiBkaXIucXVlcmllcyxcbiAgICAgICAgfSxcbiAgICAgICAgY29lcmNlZElucHV0RmllbGRzOiBkaXIuY29lcmNlZElucHV0RmllbGRzLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IHR5cGVDdG9yID0gZ2VuZXJhdGVUeXBlQ3RvckRlY2xhcmF0aW9uRm4obm9kZSwgbWV0YSwgbm9kZVR5cGVSZWYudHlwZU5hbWUsIHRoaXMuY29uZmlnKTtcbiAgICAgIHRoaXMudHlwZUN0b3JTdGF0ZW1lbnRzLnB1c2godHlwZUN0b3IpO1xuICAgICAgY29uc3QgZm5JZCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIoZm5OYW1lKTtcbiAgICAgIHRoaXMudHlwZUN0b3JzLnNldChub2RlLCBmbklkKTtcbiAgICAgIHJldHVybiBmbklkO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEdldCBhbiBleHByZXNzaW9uIHJlZmVycmluZyB0byBhbiBpbnN0YW5jZSBvZiB0aGUgZ2l2ZW4gcGlwZS5cbiAgICovXG4gIHBpcGVJbnN0KHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgaWYgKHRoaXMucGlwZUluc3RzLmhhcyhyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnBpcGVJbnN0cy5nZXQocmVmLm5vZGUpICE7XG4gICAgfVxuXG4gICAgY29uc3QgcGlwZVR5cGUgPSB0aGlzLnJlZmVyZW5jZVR5cGUocmVmKTtcbiAgICBjb25zdCBwaXBlSW5zdElkID0gdHMuY3JlYXRlSWRlbnRpZmllcihgX3BpcGUke3RoaXMubmV4dElkcy5waXBlSW5zdCsrfWApO1xuXG4gICAgdGhpcy5waXBlSW5zdFN0YXRlbWVudHMucHVzaCh0c0RlY2xhcmVWYXJpYWJsZShwaXBlSW5zdElkLCBwaXBlVHlwZSkpO1xuICAgIHRoaXMucGlwZUluc3RzLnNldChyZWYubm9kZSwgcGlwZUluc3RJZCk7XG5cbiAgICByZXR1cm4gcGlwZUluc3RJZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWNsYXJlcyBhIGhlbHBlciBmdW5jdGlvbiB0byBiZSBhYmxlIHRvIGNhc3QgZGlyZWN0aXZlIG91dHB1dHMgb2YgdHlwZSBgRXZlbnRFbWl0dGVyPFQ+YCB0b1xuICAgKiBoYXZlIGFuIGFjY3VyYXRlIGBzdWJzY3JpYmUoKWAgbWV0aG9kIHRoYXQgcHJvcGVybHkgY2FycmllcyBvdmVyIHRoZSBnZW5lcmljIHR5cGUgYFRgIGludG8gdGhlXG4gICAqIGxpc3RlbmVyIGZ1bmN0aW9uIHBhc3NlZCBhcyBhcmd1bWVudCB0byBgc3Vic2NyaWJlYC4gVGhpcyBpcyBkb25lIHRvIHdvcmsgYXJvdW5kIGEgdHlwaW5nXG4gICAqIGRlZmljaWVuY3kgaW4gYEV2ZW50RW1pdHRlci5zdWJzY3JpYmVgLCB3aGVyZSB0aGUgbGlzdGVuZXIgZnVuY3Rpb24gaXMgdHlwZWQgYXMgYW55LlxuICAgKi9cbiAgZGVjbGFyZU91dHB1dEhlbHBlcigpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBpZiAodGhpcy5vdXRwdXRIZWxwZXJJZGVudCAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMub3V0cHV0SGVscGVySWRlbnQ7XG4gICAgfVxuXG4gICAgY29uc3QgZXZlbnRFbWl0dGVyID0gdGhpcy5yZWZlcmVuY2VFeHRlcm5hbFR5cGUoXG4gICAgICAgICdAYW5ndWxhci9jb3JlJywgJ0V2ZW50RW1pdHRlcicsIFtuZXcgRXhwcmVzc2lvblR5cGUobmV3IFJlYWRWYXJFeHByKCdUJykpXSk7XG5cbiAgICBjb25zdCBvdXRwdXRIZWxwZXJJZGVudCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIoJ19vdXRwdXRIZWxwZXInKTtcbiAgICBjb25zdCBnZW5lcmljVHlwZURlY2wgPSB0cy5jcmVhdGVUeXBlUGFyYW1ldGVyRGVjbGFyYXRpb24oJ1QnKTtcbiAgICBjb25zdCBnZW5lcmljVHlwZVJlZiA9IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKCdUJywgLyogdHlwZVBhcmFtZXRlcnMgKi8gdW5kZWZpbmVkKTtcblxuICAgIC8vIERlY2xhcmUgYSB0eXBlIHRoYXQgaGFzIGEgYHN1YnNjcmliZWAgbWV0aG9kIHRoYXQgY2FycmllcyBvdmVyIHR5cGUgYFRgIGFzIHBhcmFtZXRlclxuICAgIC8vIGludG8gdGhlIGNhbGxiYWNrLiBUaGUgYmVsb3cgY29kZSBnZW5lcmF0ZXMgdGhlIGZvbGxvd2luZyB0eXBlIGxpdGVyYWw6XG4gICAgLy8gYHtzdWJzY3JpYmUoY2I6IChldmVudDogVCkgPT4gYW55KTogdm9pZDt9YFxuICAgIGNvbnN0IG9ic2VydmFibGVMaWtlID0gdHMuY3JlYXRlVHlwZUxpdGVyYWxOb2RlKFt0cy5jcmVhdGVNZXRob2RTaWduYXR1cmUoXG4gICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgLyogcGFyYW1ldGVycyAqL1t0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBuYW1lICovICdjYicsXG4gICAgICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIHR5cGUgKi8gdHMuY3JlYXRlRnVuY3Rpb25UeXBlTm9kZShcbiAgICAgICAgICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgLyogcGFyYW1ldGVycyAqL1t0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIC8qIG5hbWUgKi8gJ2V2ZW50JyxcbiAgICAgICAgICAgICAgICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIC8qIHR5cGUgKi8gZ2VuZXJpY1R5cGVSZWYpXSxcbiAgICAgICAgICAgICAgICAvKiB0eXBlICovIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKSldLFxuICAgICAgICAvKiB0eXBlICovIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLlZvaWRLZXl3b3JkKSxcbiAgICAgICAgLyogbmFtZSAqLyAnc3Vic2NyaWJlJyxcbiAgICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQpXSk7XG5cbiAgICAvLyBEZWNsYXJlcyB0aGUgZmlyc3Qgc2lnbmF0dXJlIG9mIGBfb3V0cHV0SGVscGVyYCB0aGF0IG1hdGNoZXMgYXJndW1lbnRzIG9mIHR5cGVcbiAgICAvLyBgRXZlbnRFbWl0dGVyYCwgdG8gY29udmVydCB0aGVtIGludG8gYG9ic2VydmFibGVMaWtlYCBkZWZpbmVkIGFib3ZlLiBUaGUgZm9sbG93aW5nXG4gICAgLy8gc3RhdGVtZW50IGlzIGdlbmVyYXRlZDpcbiAgICAvLyBgZGVjbGFyZSBmdW5jdGlvbiBfb3V0cHV0SGVscGVyPFQ+KG91dHB1dDogRXZlbnRFbWl0dGVyPFQ+KTogb2JzZXJ2YWJsZUxpa2U7YFxuICAgIHRoaXMuaGVscGVyU3RhdGVtZW50cy5wdXNoKHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBtb2RpZmllcnMgKi9bdHMuY3JlYXRlTW9kaWZpZXIodHMuU3ludGF4S2luZC5EZWNsYXJlS2V5d29yZCldLFxuICAgICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgLyogbmFtZSAqLyBvdXRwdXRIZWxwZXJJZGVudCxcbiAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi9bZ2VuZXJpY1R5cGVEZWNsXSxcbiAgICAgICAgLyogcGFyYW1ldGVycyAqL1t0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBuYW1lICovICdvdXRwdXQnLFxuICAgICAgICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiB0eXBlICovIGV2ZW50RW1pdHRlcildLFxuICAgICAgICAvKiB0eXBlICovIG9ic2VydmFibGVMaWtlLFxuICAgICAgICAvKiBib2R5ICovIHVuZGVmaW5lZCkpO1xuXG4gICAgLy8gRGVjbGFyZXMgdGhlIHNlY29uZCBzaWduYXR1cmUgb2YgYF9vdXRwdXRIZWxwZXJgIHRoYXQgbWF0Y2hlcyBhbGwgb3RoZXIgYXJndW1lbnQgdHlwZXMsXG4gICAgLy8gaS5lLiBlbnN1cmVzIHR5cGUgaWRlbnRpdHkgZm9yIG91dHB1dCB0eXBlcyBvdGhlciB0aGFuIGBFdmVudEVtaXR0ZXJgLiBUaGlzIGNvcnJlc3BvbmRzXG4gICAgLy8gd2l0aCB0aGUgZm9sbG93aW5nIHN0YXRlbWVudDpcbiAgICAvLyBgZGVjbGFyZSBmdW5jdGlvbiBfb3V0cHV0SGVscGVyPFQ+KG91dHB1dDogVCk6IFQ7YFxuICAgIHRoaXMuaGVscGVyU3RhdGVtZW50cy5wdXNoKHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBtb2RpZmllcnMgKi9bdHMuY3JlYXRlTW9kaWZpZXIodHMuU3ludGF4S2luZC5EZWNsYXJlS2V5d29yZCldLFxuICAgICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgLyogbmFtZSAqLyBvdXRwdXRIZWxwZXJJZGVudCxcbiAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi9bZ2VuZXJpY1R5cGVEZWNsXSxcbiAgICAgICAgLyogcGFyYW1ldGVycyAqL1t0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBuYW1lICovICdvdXRwdXQnLFxuICAgICAgICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiB0eXBlICovIGdlbmVyaWNUeXBlUmVmKV0sXG4gICAgICAgIC8qIHR5cGUgKi8gZ2VuZXJpY1R5cGVSZWYsXG4gICAgICAgIC8qIGJvZHkgKi8gdW5kZWZpbmVkKSk7XG5cbiAgICByZXR1cm4gdGhpcy5vdXRwdXRIZWxwZXJJZGVudCA9IG91dHB1dEhlbHBlcklkZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGEgYHRzLkV4cHJlc3Npb25gIHRoYXQgcmVmZXJlbmNlcyB0aGUgZ2l2ZW4gbm9kZS5cbiAgICpcbiAgICogVGhpcyBtYXkgaW52b2x2ZSBpbXBvcnRpbmcgdGhlIG5vZGUgaW50byB0aGUgZmlsZSBpZiBpdCdzIG5vdCBkZWNsYXJlZCB0aGVyZSBhbHJlYWR5LlxuICAgKi9cbiAgcmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgbmdFeHByID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQocmVmLCB0aGlzLmNvbnRleHRGaWxlKTtcblxuICAgIC8vIFVzZSBgdHJhbnNsYXRlRXhwcmVzc2lvbmAgdG8gY29udmVydCB0aGUgYEV4cHJlc3Npb25gIGludG8gYSBgdHMuRXhwcmVzc2lvbmAuXG4gICAgcmV0dXJuIHRyYW5zbGF0ZUV4cHJlc3Npb24oXG4gICAgICAgIG5nRXhwciwgdGhpcy5pbXBvcnRNYW5hZ2VyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBhIGB0cy5UeXBlTm9kZWAgdGhhdCByZWZlcmVuY2VzIHRoZSBnaXZlbiBub2RlIGFzIGEgdHlwZS5cbiAgICpcbiAgICogVGhpcyBtYXkgaW52b2x2ZSBpbXBvcnRpbmcgdGhlIG5vZGUgaW50byB0aGUgZmlsZSBpZiBpdCdzIG5vdCBkZWNsYXJlZCB0aGVyZSBhbHJlYWR5LlxuICAgKi9cbiAgcmVmZXJlbmNlVHlwZShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pik6IHRzLlR5cGVOb2RlIHtcbiAgICBjb25zdCBuZ0V4cHIgPSB0aGlzLnJlZkVtaXR0ZXIuZW1pdChyZWYsIHRoaXMuY29udGV4dEZpbGUpO1xuXG4gICAgLy8gQ3JlYXRlIGFuIGBFeHByZXNzaW9uVHlwZWAgZnJvbSB0aGUgYEV4cHJlc3Npb25gIGFuZCB0cmFuc2xhdGUgaXQgdmlhIGB0cmFuc2xhdGVUeXBlYC5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHN1cHBvcnQgcmVmZXJlbmNlcyB0byB0eXBlcyB3aXRoIGdlbmVyaWMgYXJndW1lbnRzIGluIGEgY2xlYW4gd2F5LlxuICAgIHJldHVybiB0cmFuc2xhdGVUeXBlKG5ldyBFeHByZXNzaW9uVHlwZShuZ0V4cHIpLCB0aGlzLmltcG9ydE1hbmFnZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGEgYHRzLlR5cGVOb2RlYCB0aGF0IHJlZmVyZW5jZXMgYSBnaXZlbiB0eXBlIGZyb20gdGhlIHByb3ZpZGVkIG1vZHVsZS5cbiAgICpcbiAgICogVGhpcyB3aWxsIGludm9sdmUgaW1wb3J0aW5nIHRoZSB0eXBlIGludG8gdGhlIGZpbGUsIGFuZCB3aWxsIGFsc28gYWRkIHR5cGUgcGFyYW1ldGVycyBpZlxuICAgKiBwcm92aWRlZC5cbiAgICovXG4gIHJlZmVyZW5jZUV4dGVybmFsVHlwZShtb2R1bGVOYW1lOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgdHlwZVBhcmFtcz86IFR5cGVbXSk6IHRzLlR5cGVOb2RlIHtcbiAgICBjb25zdCBleHRlcm5hbCA9IG5ldyBFeHRlcm5hbEV4cHIoe21vZHVsZU5hbWUsIG5hbWV9KTtcbiAgICByZXR1cm4gdHJhbnNsYXRlVHlwZShuZXcgRXhwcmVzc2lvblR5cGUoZXh0ZXJuYWwsIG51bGwsIHR5cGVQYXJhbXMpLCB0aGlzLmltcG9ydE1hbmFnZXIpO1xuICB9XG5cbiAgZ2V0UHJlbHVkZVN0YXRlbWVudHMoKTogdHMuU3RhdGVtZW50W10ge1xuICAgIHJldHVybiBbXG4gICAgICAuLi50aGlzLmhlbHBlclN0YXRlbWVudHMsXG4gICAgICAuLi50aGlzLnBpcGVJbnN0U3RhdGVtZW50cyxcbiAgICAgIC4uLnRoaXMudHlwZUN0b3JTdGF0ZW1lbnRzLFxuICAgIF07XG4gIH1cbn1cbiJdfQ==