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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/environment", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_parameter_emitter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Environment = void 0;
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
                        inputs: dir.inputs.classPropertyNames,
                        outputs: dir.outputs.classPropertyNames,
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
                    /* type */
                    ts.createFunctionTypeNode(
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
            // Disable aliasing for imports generated in a template type-checking context, as there is no
            // guarantee that any alias re-exports exist in the .d.ts files. It's safe to use direct imports
            // in these cases as there is no strict dependency checking during the template type-checking
            // pass.
            var ngExpr = this.refEmitter.emit(ref, this.contextFile, imports_1.ImportFlags.NoAliasing);
            // Use `translateExpression` to convert the `Expression` into a `ts.Expression`.
            return translator_1.translateExpression(ngExpr, this.importManager, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, ts.ScriptTarget.ES2015);
        };
        /**
         * Generate a `ts.TypeNode` that references the given node as a type.
         *
         * This may involve importing the node into the file if it's not declared there already.
         */
        Environment.prototype.referenceType = function (ref) {
            var ngExpr = this.refEmitter.emit(ref, this.contextFile, imports_1.ImportFlags.NoAliasing | imports_1.ImportFlags.AllowTypeImports);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvZW52aXJvbm1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFzRjtJQUN0RiwrQkFBaUM7SUFFakMsbUVBQXFHO0lBRXJHLHlFQUFtRjtJQUduRixpRkFBNEM7SUFDNUMsbUdBQXlGO0lBQ3pGLCtHQUE4RDtJQUU5RDs7Ozs7Ozs7OztPQVVHO0lBQ0g7UUFlRSxxQkFDYSxNQUEwQixFQUFZLGFBQTRCLEVBQ25FLFVBQTRCLEVBQVUsU0FBeUIsRUFDN0QsV0FBMEI7WUFGM0IsV0FBTSxHQUFOLE1BQU0sQ0FBb0I7WUFBWSxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtZQUNuRSxlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQzdELGdCQUFXLEdBQVgsV0FBVyxDQUFlO1lBakJoQyxZQUFPLEdBQUc7Z0JBQ2hCLFFBQVEsRUFBRSxDQUFDO2dCQUNYLFFBQVEsRUFBRSxDQUFDO2FBQ1osQ0FBQztZQUVNLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQztZQUNyRCx1QkFBa0IsR0FBbUIsRUFBRSxDQUFDO1lBRTFDLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQztZQUNyRCx1QkFBa0IsR0FBbUIsRUFBRSxDQUFDO1lBRTFDLHNCQUFpQixHQUF1QixJQUFJLENBQUM7WUFDM0MscUJBQWdCLEdBQW1CLEVBQUUsQ0FBQztRQUtMLENBQUM7UUFFNUM7Ozs7O1dBS0c7UUFDSCxpQ0FBVyxHQUFYLFVBQVksR0FBK0I7WUFDekMsSUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQXVELENBQUM7WUFDM0UsSUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFD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QGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb25UeXBlLCBFeHRlcm5hbEV4cHIsIFR5cGUsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7SW1wb3J0RmxhZ3MsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlRXhwcmVzc2lvbiwgdHJhbnNsYXRlVHlwZX0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5pbXBvcnQge1R5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBUeXBlQ2hlY2tpbmdDb25maWcsIFR5cGVDdG9yTWV0YWRhdGF9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7dHNEZWNsYXJlVmFyaWFibGV9IGZyb20gJy4vdHNfdXRpbCc7XG5pbXBvcnQge2dlbmVyYXRlVHlwZUN0b3JEZWNsYXJhdGlvbkZuLCByZXF1aXJlc0lubGluZVR5cGVDdG9yfSBmcm9tICcuL3R5cGVfY29uc3RydWN0b3InO1xuaW1wb3J0IHtUeXBlUGFyYW1ldGVyRW1pdHRlcn0gZnJvbSAnLi90eXBlX3BhcmFtZXRlcl9lbWl0dGVyJztcblxuLyoqXG4gKiBBIGNvbnRleHQgd2hpY2ggaG9zdHMgb25lIG9yIG1vcmUgVHlwZSBDaGVjayBCbG9ja3MgKFRDQnMpLlxuICpcbiAqIEFuIGBFbnZpcm9ubWVudGAgc3VwcG9ydHMgdGhlIGdlbmVyYXRpb24gb2YgVENCcyBieSB0cmFja2luZyBuZWNlc3NhcnkgaW1wb3J0cywgZGVjbGFyYXRpb25zIG9mXG4gKiB0eXBlIGNvbnN0cnVjdG9ycywgYW5kIG90aGVyIHN0YXRlbWVudHMgYmV5b25kIHRoZSB0eXBlLWNoZWNraW5nIGNvZGUgd2l0aGluIHRoZSBUQ0IgaXRzZWxmLlxuICogVGhyb3VnaCBtZXRob2QgY2FsbHMgb24gYEVudmlyb25tZW50YCwgdGhlIFRDQiBnZW5lcmF0b3IgY2FuIHJlcXVlc3QgYHRzLkV4cHJlc3Npb25gcyB3aGljaFxuICogcmVmZXJlbmNlIGRlY2xhcmF0aW9ucyBpbiB0aGUgYEVudmlyb25tZW50YCBmb3IgdGhlc2UgYXJ0aWZhY3RzYC5cbiAqXG4gKiBgRW52aXJvbm1lbnRgIGNhbiBiZSB1c2VkIGluIGEgc3RhbmRhbG9uZSBmYXNoaW9uLCBvciBjYW4gYmUgZXh0ZW5kZWQgdG8gc3VwcG9ydCBtb3JlIHNwZWNpYWxpemVkXG4gKiB1c2FnZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEVudmlyb25tZW50IHtcbiAgcHJpdmF0ZSBuZXh0SWRzID0ge1xuICAgIHBpcGVJbnN0OiAxLFxuICAgIHR5cGVDdG9yOiAxLFxuICB9O1xuXG4gIHByaXZhdGUgdHlwZUN0b3JzID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCB0cy5FeHByZXNzaW9uPigpO1xuICBwcm90ZWN0ZWQgdHlwZUN0b3JTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIHByaXZhdGUgcGlwZUluc3RzID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCB0cy5FeHByZXNzaW9uPigpO1xuICBwcm90ZWN0ZWQgcGlwZUluc3RTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIHByaXZhdGUgb3V0cHV0SGVscGVySWRlbnQ6IHRzLklkZW50aWZpZXJ8bnVsbCA9IG51bGw7XG4gIHByb3RlY3RlZCBoZWxwZXJTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsIHByb3RlY3RlZCBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyLFxuICAgICAgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcm90ZWN0ZWQgY29udGV4dEZpbGU6IHRzLlNvdXJjZUZpbGUpIHt9XG5cbiAgLyoqXG4gICAqIEdldCBhbiBleHByZXNzaW9uIHJlZmVycmluZyB0byBhIHR5cGUgY29uc3RydWN0b3IgZm9yIHRoZSBnaXZlbiBkaXJlY3RpdmUuXG4gICAqXG4gICAqIERlcGVuZGluZyBvbiB0aGUgc2hhcGUgb2YgdGhlIGRpcmVjdGl2ZSBpdHNlbGYsIHRoaXMgY291bGQgYmUgZWl0aGVyIGEgcmVmZXJlbmNlIHRvIGEgZGVjbGFyZWRcbiAgICogdHlwZSBjb25zdHJ1Y3Rvciwgb3IgdG8gYW4gaW5saW5lIHR5cGUgY29uc3RydWN0b3IuXG4gICAqL1xuICB0eXBlQ3RvckZvcihkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZGlyUmVmID0gZGlyLnJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG4gICAgY29uc3Qgbm9kZSA9IGRpclJlZi5ub2RlO1xuICAgIGlmICh0aGlzLnR5cGVDdG9ycy5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnR5cGVDdG9ycy5nZXQobm9kZSkhO1xuICAgIH1cblxuICAgIGlmIChyZXF1aXJlc0lubGluZVR5cGVDdG9yKG5vZGUsIHRoaXMucmVmbGVjdG9yKSkge1xuICAgICAgLy8gVGhlIGNvbnN0cnVjdG9yIGhhcyBhbHJlYWR5IGJlZW4gY3JlYXRlZCBpbmxpbmUsIHdlIGp1c3QgbmVlZCB0byBjb25zdHJ1Y3QgYSByZWZlcmVuY2UgdG9cbiAgICAgIC8vIGl0LlxuICAgICAgY29uc3QgcmVmID0gdGhpcy5yZWZlcmVuY2UoZGlyUmVmKTtcbiAgICAgIGNvbnN0IHR5cGVDdG9yRXhwciA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHJlZiwgJ25nVHlwZUN0b3InKTtcbiAgICAgIHRoaXMudHlwZUN0b3JzLnNldChub2RlLCB0eXBlQ3RvckV4cHIpO1xuICAgICAgcmV0dXJuIHR5cGVDdG9yRXhwcjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZm5OYW1lID0gYF9jdG9yJHt0aGlzLm5leHRJZHMudHlwZUN0b3IrK31gO1xuICAgICAgY29uc3Qgbm9kZVR5cGVSZWYgPSB0aGlzLnJlZmVyZW5jZVR5cGUoZGlyUmVmKTtcbiAgICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShub2RlVHlwZVJlZikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBUeXBlUmVmZXJlbmNlTm9kZSBmcm9tIHJlZmVyZW5jZSB0byAke2RpclJlZi5kZWJ1Z05hbWV9YCk7XG4gICAgICB9XG4gICAgICBjb25zdCBtZXRhOiBUeXBlQ3Rvck1ldGFkYXRhID0ge1xuICAgICAgICBmbk5hbWUsXG4gICAgICAgIGJvZHk6IHRydWUsXG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgIGlucHV0czogZGlyLmlucHV0cy5jbGFzc1Byb3BlcnR5TmFtZXMsXG4gICAgICAgICAgb3V0cHV0czogZGlyLm91dHB1dHMuY2xhc3NQcm9wZXJ0eU5hbWVzLFxuICAgICAgICAgIC8vIFRPRE86IHN1cHBvcnQgcXVlcmllc1xuICAgICAgICAgIHF1ZXJpZXM6IGRpci5xdWVyaWVzLFxuICAgICAgICB9LFxuICAgICAgICBjb2VyY2VkSW5wdXRGaWVsZHM6IGRpci5jb2VyY2VkSW5wdXRGaWVsZHMsXG4gICAgICB9O1xuICAgICAgY29uc3QgdHlwZVBhcmFtcyA9IHRoaXMuZW1pdFR5cGVQYXJhbWV0ZXJzKG5vZGUpO1xuICAgICAgY29uc3QgdHlwZUN0b3IgPSBnZW5lcmF0ZVR5cGVDdG9yRGVjbGFyYXRpb25GbihcbiAgICAgICAgICBub2RlLCBtZXRhLCBub2RlVHlwZVJlZi50eXBlTmFtZSwgdHlwZVBhcmFtcywgdGhpcy5yZWZsZWN0b3IpO1xuICAgICAgdGhpcy50eXBlQ3RvclN0YXRlbWVudHMucHVzaCh0eXBlQ3Rvcik7XG4gICAgICBjb25zdCBmbklkID0gdHMuY3JlYXRlSWRlbnRpZmllcihmbk5hbWUpO1xuICAgICAgdGhpcy50eXBlQ3RvcnMuc2V0KG5vZGUsIGZuSWQpO1xuICAgICAgcmV0dXJuIGZuSWQ7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgICogR2V0IGFuIGV4cHJlc3Npb24gcmVmZXJyaW5nIHRvIGFuIGluc3RhbmNlIG9mIHRoZSBnaXZlbiBwaXBlLlxuICAgKi9cbiAgcGlwZUluc3QocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pOiB0cy5FeHByZXNzaW9uIHtcbiAgICBpZiAodGhpcy5waXBlSW5zdHMuaGFzKHJlZi5ub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMucGlwZUluc3RzLmdldChyZWYubm9kZSkhO1xuICAgIH1cblxuICAgIGNvbnN0IHBpcGVUeXBlID0gdGhpcy5yZWZlcmVuY2VUeXBlKHJlZik7XG4gICAgY29uc3QgcGlwZUluc3RJZCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIoYF9waXBlJHt0aGlzLm5leHRJZHMucGlwZUluc3QrK31gKTtcblxuICAgIHRoaXMucGlwZUluc3RTdGF0ZW1lbnRzLnB1c2godHNEZWNsYXJlVmFyaWFibGUocGlwZUluc3RJZCwgcGlwZVR5cGUpKTtcbiAgICB0aGlzLnBpcGVJbnN0cy5zZXQocmVmLm5vZGUsIHBpcGVJbnN0SWQpO1xuXG4gICAgcmV0dXJuIHBpcGVJbnN0SWQ7XG4gIH1cblxuICAvKipcbiAgICogRGVjbGFyZXMgYSBoZWxwZXIgZnVuY3Rpb24gdG8gYmUgYWJsZSB0byBjYXN0IGRpcmVjdGl2ZSBvdXRwdXRzIG9mIHR5cGUgYEV2ZW50RW1pdHRlcjxUPmAgdG9cbiAgICogaGF2ZSBhbiBhY2N1cmF0ZSBgc3Vic2NyaWJlKClgIG1ldGhvZCB0aGF0IHByb3Blcmx5IGNhcnJpZXMgb3ZlciB0aGUgZ2VuZXJpYyB0eXBlIGBUYCBpbnRvIHRoZVxuICAgKiBsaXN0ZW5lciBmdW5jdGlvbiBwYXNzZWQgYXMgYXJndW1lbnQgdG8gYHN1YnNjcmliZWAuIFRoaXMgaXMgZG9uZSB0byB3b3JrIGFyb3VuZCBhIHR5cGluZ1xuICAgKiBkZWZpY2llbmN5IGluIGBFdmVudEVtaXR0ZXIuc3Vic2NyaWJlYCwgd2hlcmUgdGhlIGxpc3RlbmVyIGZ1bmN0aW9uIGlzIHR5cGVkIGFzIGFueS5cbiAgICovXG4gIGRlY2xhcmVPdXRwdXRIZWxwZXIoKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgaWYgKHRoaXMub3V0cHV0SGVscGVySWRlbnQgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLm91dHB1dEhlbHBlcklkZW50O1xuICAgIH1cblxuICAgIGNvbnN0IG91dHB1dEhlbHBlcklkZW50ID0gdHMuY3JlYXRlSWRlbnRpZmllcignX291dHB1dEhlbHBlcicpO1xuICAgIGNvbnN0IGdlbmVyaWNUeXBlRGVjbCA9IHRzLmNyZWF0ZVR5cGVQYXJhbWV0ZXJEZWNsYXJhdGlvbignVCcpO1xuICAgIGNvbnN0IGdlbmVyaWNUeXBlUmVmID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUoJ1QnLCAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQpO1xuXG4gICAgY29uc3QgZXZlbnRFbWl0dGVyID0gdGhpcy5yZWZlcmVuY2VFeHRlcm5hbFR5cGUoXG4gICAgICAgICdAYW5ndWxhci9jb3JlJywgJ0V2ZW50RW1pdHRlcicsIFtuZXcgRXhwcmVzc2lvblR5cGUobmV3IFdyYXBwZWROb2RlRXhwcihnZW5lcmljVHlwZVJlZikpXSk7XG5cbiAgICAvLyBEZWNsYXJlIGEgdHlwZSB0aGF0IGhhcyBhIGBzdWJzY3JpYmVgIG1ldGhvZCB0aGF0IGNhcnJpZXMgb3ZlciB0eXBlIGBUYCBhcyBwYXJhbWV0ZXJcbiAgICAvLyBpbnRvIHRoZSBjYWxsYmFjay4gVGhlIGJlbG93IGNvZGUgZ2VuZXJhdGVzIHRoZSBmb2xsb3dpbmcgdHlwZSBsaXRlcmFsOlxuICAgIC8vIGB7c3Vic2NyaWJlKGNiOiAoZXZlbnQ6IFQpID0+IGFueSk6IHZvaWQ7fWBcbiAgICBjb25zdCBvYnNlcnZhYmxlTGlrZSA9IHRzLmNyZWF0ZVR5cGVMaXRlcmFsTm9kZShbdHMuY3JlYXRlTWV0aG9kU2lnbmF0dXJlKFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIHBhcmFtZXRlcnMgKi9bdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogbmFtZSAqLyAnY2InLFxuICAgICAgICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiB0eXBlICovXG4gICAgICAgICAgICB0cy5jcmVhdGVGdW5jdGlvblR5cGVOb2RlKFxuICAgICAgICAgICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAvKiBwYXJhbWV0ZXJzICovW3RzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgLyogbmFtZSAqLyAnZXZlbnQnLFxuICAgICAgICAgICAgICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgLyogdHlwZSAqLyBnZW5lcmljVHlwZVJlZildLFxuICAgICAgICAgICAgICAgIC8qIHR5cGUgKi8gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpKV0sXG4gICAgICAgIC8qIHR5cGUgKi8gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuVm9pZEtleXdvcmQpLFxuICAgICAgICAvKiBuYW1lICovICdzdWJzY3JpYmUnLFxuICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCldKTtcblxuICAgIC8vIERlY2xhcmVzIHRoZSBmaXJzdCBzaWduYXR1cmUgb2YgYF9vdXRwdXRIZWxwZXJgIHRoYXQgbWF0Y2hlcyBhcmd1bWVudHMgb2YgdHlwZVxuICAgIC8vIGBFdmVudEVtaXR0ZXJgLCB0byBjb252ZXJ0IHRoZW0gaW50byBgb2JzZXJ2YWJsZUxpa2VgIGRlZmluZWQgYWJvdmUuIFRoZSBmb2xsb3dpbmdcbiAgICAvLyBzdGF0ZW1lbnQgaXMgZ2VuZXJhdGVkOlxuICAgIC8vIGBkZWNsYXJlIGZ1bmN0aW9uIF9vdXRwdXRIZWxwZXI8VD4ob3V0cHV0OiBFdmVudEVtaXR0ZXI8VD4pOiBvYnNlcnZhYmxlTGlrZTtgXG4gICAgdGhpcy5oZWxwZXJTdGF0ZW1lbnRzLnB1c2godHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIG1vZGlmaWVycyAqL1t0cy5jcmVhdGVNb2RpZmllcih0cy5TeW50YXhLaW5kLkRlY2xhcmVLZXl3b3JkKV0sXG4gICAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBuYW1lICovIG91dHB1dEhlbHBlcklkZW50LFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqL1tnZW5lcmljVHlwZURlY2xdLFxuICAgICAgICAvKiBwYXJhbWV0ZXJzICovW3RzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIG5hbWUgKi8gJ291dHB1dCcsXG4gICAgICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIHR5cGUgKi8gZXZlbnRFbWl0dGVyKV0sXG4gICAgICAgIC8qIHR5cGUgKi8gb2JzZXJ2YWJsZUxpa2UsXG4gICAgICAgIC8qIGJvZHkgKi8gdW5kZWZpbmVkKSk7XG5cbiAgICAvLyBEZWNsYXJlcyB0aGUgc2Vjb25kIHNpZ25hdHVyZSBvZiBgX291dHB1dEhlbHBlcmAgdGhhdCBtYXRjaGVzIGFsbCBvdGhlciBhcmd1bWVudCB0eXBlcyxcbiAgICAvLyBpLmUuIGVuc3VyZXMgdHlwZSBpZGVudGl0eSBmb3Igb3V0cHV0IHR5cGVzIG90aGVyIHRoYW4gYEV2ZW50RW1pdHRlcmAuIFRoaXMgY29ycmVzcG9uZHNcbiAgICAvLyB3aXRoIHRoZSBmb2xsb3dpbmcgc3RhdGVtZW50OlxuICAgIC8vIGBkZWNsYXJlIGZ1bmN0aW9uIF9vdXRwdXRIZWxwZXI8VD4ob3V0cHV0OiBUKTogVDtgXG4gICAgdGhpcy5oZWxwZXJTdGF0ZW1lbnRzLnB1c2godHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIG1vZGlmaWVycyAqL1t0cy5jcmVhdGVNb2RpZmllcih0cy5TeW50YXhLaW5kLkRlY2xhcmVLZXl3b3JkKV0sXG4gICAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBuYW1lICovIG91dHB1dEhlbHBlcklkZW50LFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqL1tnZW5lcmljVHlwZURlY2xdLFxuICAgICAgICAvKiBwYXJhbWV0ZXJzICovW3RzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIG5hbWUgKi8gJ291dHB1dCcsXG4gICAgICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIHR5cGUgKi8gZ2VuZXJpY1R5cGVSZWYpXSxcbiAgICAgICAgLyogdHlwZSAqLyBnZW5lcmljVHlwZVJlZixcbiAgICAgICAgLyogYm9keSAqLyB1bmRlZmluZWQpKTtcblxuICAgIHJldHVybiB0aGlzLm91dHB1dEhlbHBlcklkZW50ID0gb3V0cHV0SGVscGVySWRlbnQ7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgYSBgdHMuRXhwcmVzc2lvbmAgdGhhdCByZWZlcmVuY2VzIHRoZSBnaXZlbiBub2RlLlxuICAgKlxuICAgKiBUaGlzIG1heSBpbnZvbHZlIGltcG9ydGluZyB0aGUgbm9kZSBpbnRvIHRoZSBmaWxlIGlmIGl0J3Mgbm90IGRlY2xhcmVkIHRoZXJlIGFscmVhZHkuXG4gICAqL1xuICByZWZlcmVuY2UocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pOiB0cy5FeHByZXNzaW9uIHtcbiAgICAvLyBEaXNhYmxlIGFsaWFzaW5nIGZvciBpbXBvcnRzIGdlbmVyYXRlZCBpbiBhIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgY29udGV4dCwgYXMgdGhlcmUgaXMgbm9cbiAgICAvLyBndWFyYW50ZWUgdGhhdCBhbnkgYWxpYXMgcmUtZXhwb3J0cyBleGlzdCBpbiB0aGUgLmQudHMgZmlsZXMuIEl0J3Mgc2FmZSB0byB1c2UgZGlyZWN0IGltcG9ydHNcbiAgICAvLyBpbiB0aGVzZSBjYXNlcyBhcyB0aGVyZSBpcyBubyBzdHJpY3QgZGVwZW5kZW5jeSBjaGVja2luZyBkdXJpbmcgdGhlIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmdcbiAgICAvLyBwYXNzLlxuICAgIGNvbnN0IG5nRXhwciA9IHRoaXMucmVmRW1pdHRlci5lbWl0KHJlZiwgdGhpcy5jb250ZXh0RmlsZSwgSW1wb3J0RmxhZ3MuTm9BbGlhc2luZyk7XG5cbiAgICAvLyBVc2UgYHRyYW5zbGF0ZUV4cHJlc3Npb25gIHRvIGNvbnZlcnQgdGhlIGBFeHByZXNzaW9uYCBpbnRvIGEgYHRzLkV4cHJlc3Npb25gLlxuICAgIHJldHVybiB0cmFuc2xhdGVFeHByZXNzaW9uKFxuICAgICAgICBuZ0V4cHIsIHRoaXMuaW1wb3J0TWFuYWdlciwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSk7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgYSBgdHMuVHlwZU5vZGVgIHRoYXQgcmVmZXJlbmNlcyB0aGUgZ2l2ZW4gbm9kZSBhcyBhIHR5cGUuXG4gICAqXG4gICAqIFRoaXMgbWF5IGludm9sdmUgaW1wb3J0aW5nIHRoZSBub2RlIGludG8gdGhlIGZpbGUgaWYgaXQncyBub3QgZGVjbGFyZWQgdGhlcmUgYWxyZWFkeS5cbiAgICovXG4gIHJlZmVyZW5jZVR5cGUocmVmOiBSZWZlcmVuY2UpOiB0cy5UeXBlTm9kZSB7XG4gICAgY29uc3QgbmdFeHByID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQoXG4gICAgICAgIHJlZiwgdGhpcy5jb250ZXh0RmlsZSwgSW1wb3J0RmxhZ3MuTm9BbGlhc2luZyB8IEltcG9ydEZsYWdzLkFsbG93VHlwZUltcG9ydHMpO1xuXG4gICAgLy8gQ3JlYXRlIGFuIGBFeHByZXNzaW9uVHlwZWAgZnJvbSB0aGUgYEV4cHJlc3Npb25gIGFuZCB0cmFuc2xhdGUgaXQgdmlhIGB0cmFuc2xhdGVUeXBlYC5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHN1cHBvcnQgcmVmZXJlbmNlcyB0byB0eXBlcyB3aXRoIGdlbmVyaWMgYXJndW1lbnRzIGluIGEgY2xlYW4gd2F5LlxuICAgIHJldHVybiB0cmFuc2xhdGVUeXBlKG5ldyBFeHByZXNzaW9uVHlwZShuZ0V4cHIpLCB0aGlzLmltcG9ydE1hbmFnZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbWl0VHlwZVBhcmFtZXRlcnMoZGVjbGFyYXRpb246IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4pOlxuICAgICAgdHMuVHlwZVBhcmFtZXRlckRlY2xhcmF0aW9uW118dW5kZWZpbmVkIHtcbiAgICBjb25zdCBlbWl0dGVyID0gbmV3IFR5cGVQYXJhbWV0ZXJFbWl0dGVyKGRlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzLCB0aGlzLnJlZmxlY3Rvcik7XG4gICAgcmV0dXJuIGVtaXR0ZXIuZW1pdChyZWYgPT4gdGhpcy5yZWZlcmVuY2VUeXBlKHJlZikpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGEgYHRzLlR5cGVOb2RlYCB0aGF0IHJlZmVyZW5jZXMgYSBnaXZlbiB0eXBlIGZyb20gdGhlIHByb3ZpZGVkIG1vZHVsZS5cbiAgICpcbiAgICogVGhpcyB3aWxsIGludm9sdmUgaW1wb3J0aW5nIHRoZSB0eXBlIGludG8gdGhlIGZpbGUsIGFuZCB3aWxsIGFsc28gYWRkIHR5cGUgcGFyYW1ldGVycyBpZlxuICAgKiBwcm92aWRlZC5cbiAgICovXG4gIHJlZmVyZW5jZUV4dGVybmFsVHlwZShtb2R1bGVOYW1lOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgdHlwZVBhcmFtcz86IFR5cGVbXSk6IHRzLlR5cGVOb2RlIHtcbiAgICBjb25zdCBleHRlcm5hbCA9IG5ldyBFeHRlcm5hbEV4cHIoe21vZHVsZU5hbWUsIG5hbWV9KTtcbiAgICByZXR1cm4gdHJhbnNsYXRlVHlwZShuZXcgRXhwcmVzc2lvblR5cGUoZXh0ZXJuYWwsIG51bGwsIHR5cGVQYXJhbXMpLCB0aGlzLmltcG9ydE1hbmFnZXIpO1xuICB9XG5cbiAgZ2V0UHJlbHVkZVN0YXRlbWVudHMoKTogdHMuU3RhdGVtZW50W10ge1xuICAgIHJldHVybiBbXG4gICAgICAuLi50aGlzLmhlbHBlclN0YXRlbWVudHMsXG4gICAgICAuLi50aGlzLnBpcGVJbnN0U3RhdGVtZW50cyxcbiAgICAgIC4uLnRoaXMudHlwZUN0b3JTdGF0ZW1lbnRzLFxuICAgIF07XG4gIH1cbn1cbiJdfQ==