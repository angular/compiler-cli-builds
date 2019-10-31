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
            return translator_1.translateExpression(ngExpr, this.importManager, imports_1.NOOP_DEFAULT_IMPORT_RECORDER);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvZW52aXJvbm1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQWtGO0lBQ2xGLCtCQUFpQztJQUVqQyxtRUFBd0Y7SUFFeEYseUVBQW1GO0lBR25GLGlGQUE0QztJQUM1QyxtR0FBeUY7SUFFekY7Ozs7Ozs7Ozs7T0FVRztJQUNIO1FBZUUscUJBQ2EsTUFBMEIsRUFBWSxhQUE0QixFQUNuRSxVQUE0QixFQUFZLFdBQTBCO1lBRGpFLFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQVksa0JBQWEsR0FBYixhQUFhLENBQWU7WUFDbkUsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFBWSxnQkFBVyxHQUFYLFdBQVcsQ0FBZTtZQWhCdEUsWUFBTyxHQUFHO2dCQUNoQixRQUFRLEVBQUUsQ0FBQztnQkFDWCxRQUFRLEVBQUUsQ0FBQzthQUNaLENBQUM7WUFFTSxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQW1DLENBQUM7WUFDckQsdUJBQWtCLEdBQW1CLEVBQUUsQ0FBQztZQUUxQyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQW1DLENBQUM7WUFDckQsdUJBQWtCLEdBQW1CLEVBQUUsQ0FBQztZQUUxQyxzQkFBaUIsR0FBdUIsSUFBSSxDQUFDO1lBQzNDLHFCQUFnQixHQUFtQixFQUFFLENBQUM7UUFJaUMsQ0FBQztRQUVsRjs7Ozs7V0FLRztRQUNILGlDQUFXLEdBQVgsVUFBWSxHQUErQjtZQUN6QyxJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBdUQsQ0FBQztZQUMzRSxJQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ3pCLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzVCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFHLENBQUM7YUFDbkM7WUFFRCxJQUFJLHlDQUFzQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNoQyw0RkFBNEY7Z0JBQzVGLE1BQU07Z0JBQ04sSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbkMsSUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDaEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUN2QyxPQUFPLFlBQVksQ0FBQzthQUNyQjtpQkFBTTtnQkFDTCxJQUFNLE1BQU0sR0FBRyxVQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFJLENBQUM7Z0JBQ2pELElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQy9DLElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLEVBQUU7b0JBQ3hDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0RBQWdELE1BQU0sQ0FBQyxTQUFXLENBQUMsQ0FBQztpQkFDckY7Z0JBQ0QsSUFBTSxJQUFJLEdBQXFCO29CQUM3QixNQUFNLFFBQUE7b0JBQ04sSUFBSSxFQUFFLElBQUk7b0JBQ1YsTUFBTSxFQUFFO3dCQUNOLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7d0JBQy9CLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUM7d0JBQ2pDLHdCQUF3Qjt3QkFDeEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPO3FCQUNyQjtvQkFDRCxrQkFBa0IsRUFBRSxHQUFHLENBQUMsa0JBQWtCO2lCQUMzQyxDQUFDO2dCQUNGLElBQU0sUUFBUSxHQUFHLGdEQUE2QixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzlGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3ZDLElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMvQixPQUFPLElBQUksQ0FBQzthQUNiO1FBQ0gsQ0FBQztRQUVEOztXQUVHO1FBQ0gsOEJBQVEsR0FBUixVQUFTLEdBQXFEO1lBQzVELElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNoQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUcsQ0FBQzthQUN2QztZQUVELElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekMsSUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUksQ0FBQyxDQUFDO1lBRTFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsMkJBQWlCLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztZQUV6QyxPQUFPLFVBQVUsQ0FBQztRQUNwQixDQUFDO1FBRUQ7Ozs7O1dBS0c7UUFDSCx5Q0FBbUIsR0FBbkI7WUFDRSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxJQUFJLEVBQUU7Z0JBQ25DLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDO2FBQy9CO1lBRUQsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUMzQyxlQUFlLEVBQUUsY0FBYyxFQUFFLENBQUMsSUFBSSx5QkFBYyxDQUFDLElBQUksc0JBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVqRixJQUFNLGlCQUFpQixHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUMvRCxJQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMsOEJBQThCLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0QsSUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV2Rix1RkFBdUY7WUFDdkYsMEVBQTBFO1lBQzFFLDhDQUE4QztZQUM5QyxJQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUFFLENBQUMscUJBQXFCO2dCQUNyRSxvQkFBb0IsQ0FBQyxTQUFTO2dCQUM5QixnQkFBZ0IsQ0FBQSxDQUFDLEVBQUUsQ0FBQyxlQUFlO29CQUMvQixnQkFBZ0IsQ0FBQyxTQUFTO29CQUMxQixlQUFlLENBQUMsU0FBUztvQkFDekIsb0JBQW9CLENBQUMsU0FBUztvQkFDOUIsVUFBVSxDQUFDLElBQUk7b0JBQ2YsbUJBQW1CLENBQUMsU0FBUztvQkFDN0IsVUFBVSxDQUFDLEVBQUUsQ0FBQyxzQkFBc0I7b0JBQ2hDLG9CQUFvQixDQUFDLFNBQVM7b0JBQzlCLGdCQUFnQixDQUFBLENBQUMsRUFBRSxDQUFDLGVBQWU7d0JBQy9CLGdCQUFnQixDQUFDLFNBQVM7d0JBQzFCLGVBQWUsQ0FBQyxTQUFTO3dCQUN6QixvQkFBb0IsQ0FBQyxTQUFTO3dCQUM5QixVQUFVLENBQUMsT0FBTzt3QkFDbEIsbUJBQW1CLENBQUMsU0FBUzt3QkFDN0IsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUMvQixVQUFVLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4RSxVQUFVLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO2dCQUM5RCxVQUFVLENBQUMsV0FBVztnQkFDdEIsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXJDLGlGQUFpRjtZQUNqRixxRkFBcUY7WUFDckYsMEJBQTBCO1lBQzFCLGdGQUFnRjtZQUNoRixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUI7WUFDbkQsZ0JBQWdCLENBQUMsU0FBUztZQUMxQixlQUFlLENBQUEsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDaEUsbUJBQW1CLENBQUMsU0FBUztZQUM3QixVQUFVLENBQUMsaUJBQWlCO1lBQzVCLG9CQUFvQixDQUFBLENBQUMsZUFBZSxDQUFDO1lBQ3JDLGdCQUFnQixDQUFBLENBQUMsRUFBRSxDQUFDLGVBQWU7Z0JBQy9CLGdCQUFnQixDQUFDLFNBQVM7Z0JBQzFCLGVBQWUsQ0FBQyxTQUFTO2dCQUN6QixvQkFBb0IsQ0FBQyxTQUFTO2dCQUM5QixVQUFVLENBQUMsUUFBUTtnQkFDbkIsbUJBQW1CLENBQUMsU0FBUztnQkFDN0IsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzdCLFVBQVUsQ0FBQyxjQUFjO1lBQ3pCLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBRTNCLDBGQUEwRjtZQUMxRiwwRkFBMEY7WUFDMUYsZ0NBQWdDO1lBQ2hDLHFEQUFxRDtZQUNyRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUI7WUFDbkQsZ0JBQWdCLENBQUMsU0FBUztZQUMxQixlQUFlLENBQUEsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDaEUsbUJBQW1CLENBQUMsU0FBUztZQUM3QixVQUFVLENBQUMsaUJBQWlCO1lBQzVCLG9CQUFvQixDQUFBLENBQUMsZUFBZSxDQUFDO1lBQ3JDLGdCQUFnQixDQUFBLENBQUMsRUFBRSxDQUFDLGVBQWU7Z0JBQy9CLGdCQUFnQixDQUFDLFNBQVM7Z0JBQzFCLGVBQWUsQ0FBQyxTQUFTO2dCQUN6QixvQkFBb0IsQ0FBQyxTQUFTO2dCQUM5QixVQUFVLENBQUMsUUFBUTtnQkFDbkIsbUJBQW1CLENBQUMsU0FBUztnQkFDN0IsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQy9CLFVBQVUsQ0FBQyxjQUFjO1lBQ3pCLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBRTNCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDO1FBQ3BELENBQUM7UUFFRDs7OztXQUlHO1FBQ0gsK0JBQVMsR0FBVCxVQUFVLEdBQXFEO1lBQzdELElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFM0QsZ0ZBQWdGO1lBQ2hGLE9BQU8sZ0NBQW1CLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsc0NBQTRCLENBQUMsQ0FBQztRQUN2RixDQUFDO1FBRUQ7Ozs7V0FJRztRQUNILG1DQUFhLEdBQWIsVUFBYyxHQUFxRDtZQUNqRSxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRTNELHlGQUF5RjtZQUN6RixtRkFBbUY7WUFDbkYsT0FBTywwQkFBYSxDQUFDLElBQUkseUJBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUVEOzs7OztXQUtHO1FBQ0gsMkNBQXFCLEdBQXJCLFVBQXNCLFVBQWtCLEVBQUUsSUFBWSxFQUFFLFVBQW1CO1lBQ3pFLElBQU0sUUFBUSxHQUFHLElBQUksdUJBQVksQ0FBQyxFQUFDLFVBQVUsWUFBQSxFQUFFLElBQUksTUFBQSxFQUFDLENBQUMsQ0FBQztZQUN0RCxPQUFPLDBCQUFhLENBQUMsSUFBSSx5QkFBYyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFFRCwwQ0FBb0IsR0FBcEI7WUFDRSx3QkFDSyxJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLElBQUksQ0FBQyxrQkFBa0IsRUFDdkIsSUFBSSxDQUFDLGtCQUFrQixFQUMxQjtRQUNKLENBQUM7UUFDSCxrQkFBQztJQUFELENBQUMsQUFsTkQsSUFrTkM7SUFsTlksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvblR5cGUsIEV4dGVybmFsRXhwciwgUmVhZFZhckV4cHIsIFR5cGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge05PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVFeHByZXNzaW9uLCB0cmFuc2xhdGVUeXBlfSBmcm9tICcuLi8uLi90cmFuc2xhdG9yJztcblxuaW1wb3J0IHtUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgVHlwZUNoZWNraW5nQ29uZmlnLCBUeXBlQ3Rvck1ldGFkYXRhfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge3RzRGVjbGFyZVZhcmlhYmxlfSBmcm9tICcuL3RzX3V0aWwnO1xuaW1wb3J0IHtnZW5lcmF0ZVR5cGVDdG9yRGVjbGFyYXRpb25GbiwgcmVxdWlyZXNJbmxpbmVUeXBlQ3Rvcn0gZnJvbSAnLi90eXBlX2NvbnN0cnVjdG9yJztcblxuLyoqXG4gKiBBIGNvbnRleHQgd2hpY2ggaG9zdHMgb25lIG9yIG1vcmUgVHlwZSBDaGVjayBCbG9ja3MgKFRDQnMpLlxuICpcbiAqIEFuIGBFbnZpcm9ubWVudGAgc3VwcG9ydHMgdGhlIGdlbmVyYXRpb24gb2YgVENCcyBieSB0cmFja2luZyBuZWNlc3NhcnkgaW1wb3J0cywgZGVjbGFyYXRpb25zIG9mXG4gKiB0eXBlIGNvbnN0cnVjdG9ycywgYW5kIG90aGVyIHN0YXRlbWVudHMgYmV5b25kIHRoZSB0eXBlLWNoZWNraW5nIGNvZGUgd2l0aGluIHRoZSBUQ0IgaXRzZWxmLlxuICogVGhyb3VnaCBtZXRob2QgY2FsbHMgb24gYEVudmlyb25tZW50YCwgdGhlIFRDQiBnZW5lcmF0b3IgY2FuIHJlcXVlc3QgYHRzLkV4cHJlc3Npb25gcyB3aGljaFxuICogcmVmZXJlbmNlIGRlY2xhcmF0aW9ucyBpbiB0aGUgYEVudmlyb25tZW50YCBmb3IgdGhlc2UgYXJ0aWZhY3RzYC5cbiAqXG4gKiBgRW52aXJvbm1lbnRgIGNhbiBiZSB1c2VkIGluIGEgc3RhbmRhbG9uZSBmYXNoaW9uLCBvciBjYW4gYmUgZXh0ZW5kZWQgdG8gc3VwcG9ydCBtb3JlIHNwZWNpYWxpemVkXG4gKiB1c2FnZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEVudmlyb25tZW50IHtcbiAgcHJpdmF0ZSBuZXh0SWRzID0ge1xuICAgIHBpcGVJbnN0OiAxLFxuICAgIHR5cGVDdG9yOiAxLFxuICB9O1xuXG4gIHByaXZhdGUgdHlwZUN0b3JzID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCB0cy5FeHByZXNzaW9uPigpO1xuICBwcm90ZWN0ZWQgdHlwZUN0b3JTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIHByaXZhdGUgcGlwZUluc3RzID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCB0cy5FeHByZXNzaW9uPigpO1xuICBwcm90ZWN0ZWQgcGlwZUluc3RTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIHByaXZhdGUgb3V0cHV0SGVscGVySWRlbnQ6IHRzLklkZW50aWZpZXJ8bnVsbCA9IG51bGw7XG4gIHByb3RlY3RlZCBoZWxwZXJTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsIHByb3RlY3RlZCBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyLFxuICAgICAgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcm90ZWN0ZWQgY29udGV4dEZpbGU6IHRzLlNvdXJjZUZpbGUpIHt9XG5cbiAgLyoqXG4gICAqIEdldCBhbiBleHByZXNzaW9uIHJlZmVycmluZyB0byBhIHR5cGUgY29uc3RydWN0b3IgZm9yIHRoZSBnaXZlbiBkaXJlY3RpdmUuXG4gICAqXG4gICAqIERlcGVuZGluZyBvbiB0aGUgc2hhcGUgb2YgdGhlIGRpcmVjdGl2ZSBpdHNlbGYsIHRoaXMgY291bGQgYmUgZWl0aGVyIGEgcmVmZXJlbmNlIHRvIGEgZGVjbGFyZWRcbiAgICogdHlwZSBjb25zdHJ1Y3Rvciwgb3IgdG8gYW4gaW5saW5lIHR5cGUgY29uc3RydWN0b3IuXG4gICAqL1xuICB0eXBlQ3RvckZvcihkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZGlyUmVmID0gZGlyLnJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG4gICAgY29uc3Qgbm9kZSA9IGRpclJlZi5ub2RlO1xuICAgIGlmICh0aGlzLnR5cGVDdG9ycy5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnR5cGVDdG9ycy5nZXQobm9kZSkgITtcbiAgICB9XG5cbiAgICBpZiAocmVxdWlyZXNJbmxpbmVUeXBlQ3Rvcihub2RlKSkge1xuICAgICAgLy8gVGhlIGNvbnN0cnVjdG9yIGhhcyBhbHJlYWR5IGJlZW4gY3JlYXRlZCBpbmxpbmUsIHdlIGp1c3QgbmVlZCB0byBjb25zdHJ1Y3QgYSByZWZlcmVuY2UgdG9cbiAgICAgIC8vIGl0LlxuICAgICAgY29uc3QgcmVmID0gdGhpcy5yZWZlcmVuY2UoZGlyUmVmKTtcbiAgICAgIGNvbnN0IHR5cGVDdG9yRXhwciA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHJlZiwgJ25nVHlwZUN0b3InKTtcbiAgICAgIHRoaXMudHlwZUN0b3JzLnNldChub2RlLCB0eXBlQ3RvckV4cHIpO1xuICAgICAgcmV0dXJuIHR5cGVDdG9yRXhwcjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZm5OYW1lID0gYF9jdG9yJHt0aGlzLm5leHRJZHMudHlwZUN0b3IrK31gO1xuICAgICAgY29uc3Qgbm9kZVR5cGVSZWYgPSB0aGlzLnJlZmVyZW5jZVR5cGUoZGlyUmVmKTtcbiAgICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShub2RlVHlwZVJlZikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBUeXBlUmVmZXJlbmNlTm9kZSBmcm9tIHJlZmVyZW5jZSB0byAke2RpclJlZi5kZWJ1Z05hbWV9YCk7XG4gICAgICB9XG4gICAgICBjb25zdCBtZXRhOiBUeXBlQ3Rvck1ldGFkYXRhID0ge1xuICAgICAgICBmbk5hbWUsXG4gICAgICAgIGJvZHk6IHRydWUsXG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgIGlucHV0czogT2JqZWN0LmtleXMoZGlyLmlucHV0cyksXG4gICAgICAgICAgb3V0cHV0czogT2JqZWN0LmtleXMoZGlyLm91dHB1dHMpLFxuICAgICAgICAgIC8vIFRPRE86IHN1cHBvcnQgcXVlcmllc1xuICAgICAgICAgIHF1ZXJpZXM6IGRpci5xdWVyaWVzLFxuICAgICAgICB9LFxuICAgICAgICBjb2VyY2VkSW5wdXRGaWVsZHM6IGRpci5jb2VyY2VkSW5wdXRGaWVsZHMsXG4gICAgICB9O1xuICAgICAgY29uc3QgdHlwZUN0b3IgPSBnZW5lcmF0ZVR5cGVDdG9yRGVjbGFyYXRpb25Gbihub2RlLCBtZXRhLCBub2RlVHlwZVJlZi50eXBlTmFtZSwgdGhpcy5jb25maWcpO1xuICAgICAgdGhpcy50eXBlQ3RvclN0YXRlbWVudHMucHVzaCh0eXBlQ3Rvcik7XG4gICAgICBjb25zdCBmbklkID0gdHMuY3JlYXRlSWRlbnRpZmllcihmbk5hbWUpO1xuICAgICAgdGhpcy50eXBlQ3RvcnMuc2V0KG5vZGUsIGZuSWQpO1xuICAgICAgcmV0dXJuIGZuSWQ7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgICogR2V0IGFuIGV4cHJlc3Npb24gcmVmZXJyaW5nIHRvIGFuIGluc3RhbmNlIG9mIHRoZSBnaXZlbiBwaXBlLlxuICAgKi9cbiAgcGlwZUluc3QocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pOiB0cy5FeHByZXNzaW9uIHtcbiAgICBpZiAodGhpcy5waXBlSW5zdHMuaGFzKHJlZi5ub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMucGlwZUluc3RzLmdldChyZWYubm9kZSkgITtcbiAgICB9XG5cbiAgICBjb25zdCBwaXBlVHlwZSA9IHRoaXMucmVmZXJlbmNlVHlwZShyZWYpO1xuICAgIGNvbnN0IHBpcGVJbnN0SWQgPSB0cy5jcmVhdGVJZGVudGlmaWVyKGBfcGlwZSR7dGhpcy5uZXh0SWRzLnBpcGVJbnN0Kyt9YCk7XG5cbiAgICB0aGlzLnBpcGVJbnN0U3RhdGVtZW50cy5wdXNoKHRzRGVjbGFyZVZhcmlhYmxlKHBpcGVJbnN0SWQsIHBpcGVUeXBlKSk7XG4gICAgdGhpcy5waXBlSW5zdHMuc2V0KHJlZi5ub2RlLCBwaXBlSW5zdElkKTtcblxuICAgIHJldHVybiBwaXBlSW5zdElkO1xuICB9XG5cbiAgLyoqXG4gICAqIERlY2xhcmVzIGEgaGVscGVyIGZ1bmN0aW9uIHRvIGJlIGFibGUgdG8gY2FzdCBkaXJlY3RpdmUgb3V0cHV0cyBvZiB0eXBlIGBFdmVudEVtaXR0ZXI8VD5gIHRvXG4gICAqIGhhdmUgYW4gYWNjdXJhdGUgYHN1YnNjcmliZSgpYCBtZXRob2QgdGhhdCBwcm9wZXJseSBjYXJyaWVzIG92ZXIgdGhlIGdlbmVyaWMgdHlwZSBgVGAgaW50byB0aGVcbiAgICogbGlzdGVuZXIgZnVuY3Rpb24gcGFzc2VkIGFzIGFyZ3VtZW50IHRvIGBzdWJzY3JpYmVgLiBUaGlzIGlzIGRvbmUgdG8gd29yayBhcm91bmQgYSB0eXBpbmdcbiAgICogZGVmaWNpZW5jeSBpbiBgRXZlbnRFbWl0dGVyLnN1YnNjcmliZWAsIHdoZXJlIHRoZSBsaXN0ZW5lciBmdW5jdGlvbiBpcyB0eXBlZCBhcyBhbnkuXG4gICAqL1xuICBkZWNsYXJlT3V0cHV0SGVscGVyKCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGlmICh0aGlzLm91dHB1dEhlbHBlcklkZW50ICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5vdXRwdXRIZWxwZXJJZGVudDtcbiAgICB9XG5cbiAgICBjb25zdCBldmVudEVtaXR0ZXIgPSB0aGlzLnJlZmVyZW5jZUV4dGVybmFsVHlwZShcbiAgICAgICAgJ0Bhbmd1bGFyL2NvcmUnLCAnRXZlbnRFbWl0dGVyJywgW25ldyBFeHByZXNzaW9uVHlwZShuZXcgUmVhZFZhckV4cHIoJ1QnKSldKTtcblxuICAgIGNvbnN0IG91dHB1dEhlbHBlcklkZW50ID0gdHMuY3JlYXRlSWRlbnRpZmllcignX291dHB1dEhlbHBlcicpO1xuICAgIGNvbnN0IGdlbmVyaWNUeXBlRGVjbCA9IHRzLmNyZWF0ZVR5cGVQYXJhbWV0ZXJEZWNsYXJhdGlvbignVCcpO1xuICAgIGNvbnN0IGdlbmVyaWNUeXBlUmVmID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUoJ1QnLCAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQpO1xuXG4gICAgLy8gRGVjbGFyZSBhIHR5cGUgdGhhdCBoYXMgYSBgc3Vic2NyaWJlYCBtZXRob2QgdGhhdCBjYXJyaWVzIG92ZXIgdHlwZSBgVGAgYXMgcGFyYW1ldGVyXG4gICAgLy8gaW50byB0aGUgY2FsbGJhY2suIFRoZSBiZWxvdyBjb2RlIGdlbmVyYXRlcyB0aGUgZm9sbG93aW5nIHR5cGUgbGl0ZXJhbDpcbiAgICAvLyBge3N1YnNjcmliZShjYjogKGV2ZW50OiBUKSA9PiBhbnkpOiB2b2lkO31gXG4gICAgY29uc3Qgb2JzZXJ2YWJsZUxpa2UgPSB0cy5jcmVhdGVUeXBlTGl0ZXJhbE5vZGUoW3RzLmNyZWF0ZU1ldGhvZFNpZ25hdHVyZShcbiAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBwYXJhbWV0ZXJzICovW3RzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIG5hbWUgKi8gJ2NiJyxcbiAgICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogdHlwZSAqLyB0cy5jcmVhdGVGdW5jdGlvblR5cGVOb2RlKFxuICAgICAgICAgICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAvKiBwYXJhbWV0ZXJzICovW3RzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgLyogbmFtZSAqLyAnZXZlbnQnLFxuICAgICAgICAgICAgICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgLyogdHlwZSAqLyBnZW5lcmljVHlwZVJlZildLFxuICAgICAgICAgICAgICAgIC8qIHR5cGUgKi8gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpKV0sXG4gICAgICAgIC8qIHR5cGUgKi8gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuVm9pZEtleXdvcmQpLFxuICAgICAgICAvKiBuYW1lICovICdzdWJzY3JpYmUnLFxuICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCldKTtcblxuICAgIC8vIERlY2xhcmVzIHRoZSBmaXJzdCBzaWduYXR1cmUgb2YgYF9vdXRwdXRIZWxwZXJgIHRoYXQgbWF0Y2hlcyBhcmd1bWVudHMgb2YgdHlwZVxuICAgIC8vIGBFdmVudEVtaXR0ZXJgLCB0byBjb252ZXJ0IHRoZW0gaW50byBgb2JzZXJ2YWJsZUxpa2VgIGRlZmluZWQgYWJvdmUuIFRoZSBmb2xsb3dpbmdcbiAgICAvLyBzdGF0ZW1lbnQgaXMgZ2VuZXJhdGVkOlxuICAgIC8vIGBkZWNsYXJlIGZ1bmN0aW9uIF9vdXRwdXRIZWxwZXI8VD4ob3V0cHV0OiBFdmVudEVtaXR0ZXI8VD4pOiBvYnNlcnZhYmxlTGlrZTtgXG4gICAgdGhpcy5oZWxwZXJTdGF0ZW1lbnRzLnB1c2godHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIG1vZGlmaWVycyAqL1t0cy5jcmVhdGVNb2RpZmllcih0cy5TeW50YXhLaW5kLkRlY2xhcmVLZXl3b3JkKV0sXG4gICAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBuYW1lICovIG91dHB1dEhlbHBlcklkZW50LFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqL1tnZW5lcmljVHlwZURlY2xdLFxuICAgICAgICAvKiBwYXJhbWV0ZXJzICovW3RzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIG5hbWUgKi8gJ291dHB1dCcsXG4gICAgICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIHR5cGUgKi8gZXZlbnRFbWl0dGVyKV0sXG4gICAgICAgIC8qIHR5cGUgKi8gb2JzZXJ2YWJsZUxpa2UsXG4gICAgICAgIC8qIGJvZHkgKi8gdW5kZWZpbmVkKSk7XG5cbiAgICAvLyBEZWNsYXJlcyB0aGUgc2Vjb25kIHNpZ25hdHVyZSBvZiBgX291dHB1dEhlbHBlcmAgdGhhdCBtYXRjaGVzIGFsbCBvdGhlciBhcmd1bWVudCB0eXBlcyxcbiAgICAvLyBpLmUuIGVuc3VyZXMgdHlwZSBpZGVudGl0eSBmb3Igb3V0cHV0IHR5cGVzIG90aGVyIHRoYW4gYEV2ZW50RW1pdHRlcmAuIFRoaXMgY29ycmVzcG9uZHNcbiAgICAvLyB3aXRoIHRoZSBmb2xsb3dpbmcgc3RhdGVtZW50OlxuICAgIC8vIGBkZWNsYXJlIGZ1bmN0aW9uIF9vdXRwdXRIZWxwZXI8VD4ob3V0cHV0OiBUKTogVDtgXG4gICAgdGhpcy5oZWxwZXJTdGF0ZW1lbnRzLnB1c2godHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIG1vZGlmaWVycyAqL1t0cy5jcmVhdGVNb2RpZmllcih0cy5TeW50YXhLaW5kLkRlY2xhcmVLZXl3b3JkKV0sXG4gICAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBuYW1lICovIG91dHB1dEhlbHBlcklkZW50LFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqL1tnZW5lcmljVHlwZURlY2xdLFxuICAgICAgICAvKiBwYXJhbWV0ZXJzICovW3RzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIG5hbWUgKi8gJ291dHB1dCcsXG4gICAgICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIHR5cGUgKi8gZ2VuZXJpY1R5cGVSZWYpXSxcbiAgICAgICAgLyogdHlwZSAqLyBnZW5lcmljVHlwZVJlZixcbiAgICAgICAgLyogYm9keSAqLyB1bmRlZmluZWQpKTtcblxuICAgIHJldHVybiB0aGlzLm91dHB1dEhlbHBlcklkZW50ID0gb3V0cHV0SGVscGVySWRlbnQ7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgYSBgdHMuRXhwcmVzc2lvbmAgdGhhdCByZWZlcmVuY2VzIHRoZSBnaXZlbiBub2RlLlxuICAgKlxuICAgKiBUaGlzIG1heSBpbnZvbHZlIGltcG9ydGluZyB0aGUgbm9kZSBpbnRvIHRoZSBmaWxlIGlmIGl0J3Mgbm90IGRlY2xhcmVkIHRoZXJlIGFscmVhZHkuXG4gICAqL1xuICByZWZlcmVuY2UocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBuZ0V4cHIgPSB0aGlzLnJlZkVtaXR0ZXIuZW1pdChyZWYsIHRoaXMuY29udGV4dEZpbGUpO1xuXG4gICAgLy8gVXNlIGB0cmFuc2xhdGVFeHByZXNzaW9uYCB0byBjb252ZXJ0IHRoZSBgRXhwcmVzc2lvbmAgaW50byBhIGB0cy5FeHByZXNzaW9uYC5cbiAgICByZXR1cm4gdHJhbnNsYXRlRXhwcmVzc2lvbihuZ0V4cHIsIHRoaXMuaW1wb3J0TWFuYWdlciwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUik7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgYSBgdHMuVHlwZU5vZGVgIHRoYXQgcmVmZXJlbmNlcyB0aGUgZ2l2ZW4gbm9kZSBhcyBhIHR5cGUuXG4gICAqXG4gICAqIFRoaXMgbWF5IGludm9sdmUgaW1wb3J0aW5nIHRoZSBub2RlIGludG8gdGhlIGZpbGUgaWYgaXQncyBub3QgZGVjbGFyZWQgdGhlcmUgYWxyZWFkeS5cbiAgICovXG4gIHJlZmVyZW5jZVR5cGUocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pOiB0cy5UeXBlTm9kZSB7XG4gICAgY29uc3QgbmdFeHByID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQocmVmLCB0aGlzLmNvbnRleHRGaWxlKTtcblxuICAgIC8vIENyZWF0ZSBhbiBgRXhwcmVzc2lvblR5cGVgIGZyb20gdGhlIGBFeHByZXNzaW9uYCBhbmQgdHJhbnNsYXRlIGl0IHZpYSBgdHJhbnNsYXRlVHlwZWAuXG4gICAgLy8gVE9ETyhhbHhodWIpOiBzdXBwb3J0IHJlZmVyZW5jZXMgdG8gdHlwZXMgd2l0aCBnZW5lcmljIGFyZ3VtZW50cyBpbiBhIGNsZWFuIHdheS5cbiAgICByZXR1cm4gdHJhbnNsYXRlVHlwZShuZXcgRXhwcmVzc2lvblR5cGUobmdFeHByKSwgdGhpcy5pbXBvcnRNYW5hZ2VyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBhIGB0cy5UeXBlTm9kZWAgdGhhdCByZWZlcmVuY2VzIGEgZ2l2ZW4gdHlwZSBmcm9tIHRoZSBwcm92aWRlZCBtb2R1bGUuXG4gICAqXG4gICAqIFRoaXMgd2lsbCBpbnZvbHZlIGltcG9ydGluZyB0aGUgdHlwZSBpbnRvIHRoZSBmaWxlLCBhbmQgd2lsbCBhbHNvIGFkZCB0eXBlIHBhcmFtZXRlcnMgaWZcbiAgICogcHJvdmlkZWQuXG4gICAqL1xuICByZWZlcmVuY2VFeHRlcm5hbFR5cGUobW9kdWxlTmFtZTogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIHR5cGVQYXJhbXM/OiBUeXBlW10pOiB0cy5UeXBlTm9kZSB7XG4gICAgY29uc3QgZXh0ZXJuYWwgPSBuZXcgRXh0ZXJuYWxFeHByKHttb2R1bGVOYW1lLCBuYW1lfSk7XG4gICAgcmV0dXJuIHRyYW5zbGF0ZVR5cGUobmV3IEV4cHJlc3Npb25UeXBlKGV4dGVybmFsLCBudWxsLCB0eXBlUGFyYW1zKSwgdGhpcy5pbXBvcnRNYW5hZ2VyKTtcbiAgfVxuXG4gIGdldFByZWx1ZGVTdGF0ZW1lbnRzKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gW1xuICAgICAgLi4udGhpcy5oZWxwZXJTdGF0ZW1lbnRzLFxuICAgICAgLi4udGhpcy5waXBlSW5zdFN0YXRlbWVudHMsXG4gICAgICAuLi50aGlzLnR5cGVDdG9yU3RhdGVtZW50cyxcbiAgICBdO1xuICB9XG59XG4iXX0=