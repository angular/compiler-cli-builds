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
                    }
                };
                var typeCtor = type_constructor_1.generateTypeCtorDeclarationFn(node, meta, nodeTypeRef.typeName);
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
         * Generate a `ts.TypeNode` that references a given type from '@angular/core'.
         *
         * This will involve importing the type into the file, and will also add a number of generic type
         * parameters (using `any`) as requested.
         */
        Environment.prototype.referenceCoreType = function (name, typeParamCount) {
            if (typeParamCount === void 0) { typeParamCount = 0; }
            var external = new compiler_1.ExternalExpr({
                moduleName: '@angular/core',
                name: name,
            });
            var typeParams = null;
            if (typeParamCount > 0) {
                typeParams = [];
                for (var i = 0; i < typeParamCount; i++) {
                    typeParams.push(compiler_1.DYNAMIC_TYPE);
                }
            }
            return translator_1.translateType(new compiler_1.ExpressionType(external, null, typeParams), this.importManager);
        };
        Environment.prototype.getPreludeStatements = function () {
            return tslib_1.__spread(this.pipeInstStatements, this.typeCtorStatements);
        };
        return Environment;
    }());
    exports.Environment = Environment;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvZW52aXJvbm1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQW1GO0lBQ25GLCtCQUFpQztJQUVqQyxtRUFBd0Y7SUFFeEYseUVBQW1GO0lBR25GLGlGQUE0QztJQUM1QyxtR0FBeUY7SUFFekY7Ozs7Ozs7Ozs7T0FVRztJQUNIO1FBWUUscUJBQ2EsTUFBMEIsRUFBWSxhQUE0QixFQUNuRSxVQUE0QixFQUFZLFdBQTBCO1lBRGpFLFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQVksa0JBQWEsR0FBYixhQUFhLENBQWU7WUFDbkUsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFBWSxnQkFBVyxHQUFYLFdBQVcsQ0FBZTtZQWJ0RSxZQUFPLEdBQUc7Z0JBQ2hCLFFBQVEsRUFBRSxDQUFDO2dCQUNYLFFBQVEsRUFBRSxDQUFDO2FBQ1osQ0FBQztZQUVNLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQztZQUNyRCx1QkFBa0IsR0FBbUIsRUFBRSxDQUFDO1lBRTFDLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQztZQUNyRCx1QkFBa0IsR0FBbUIsRUFBRSxDQUFDO1FBSStCLENBQUM7UUFFbEY7Ozs7O1dBS0c7UUFDSCxpQ0FBVyxHQUFYLFVBQVksR0FBK0I7WUFDekMsSUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQXVELENBQUM7WUFDM0UsSUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztZQUN6QixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM1QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElB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bGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0RZTkFNSUNfVFlQRSwgRXhwcmVzc2lvblR5cGUsIEV4dGVybmFsRXhwciwgVHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Tk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZUV4cHJlc3Npb24sIHRyYW5zbGF0ZVR5cGV9IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuXG5pbXBvcnQge1R5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBUeXBlQ2hlY2tpbmdDb25maWcsIFR5cGVDdG9yTWV0YWRhdGF9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7dHNEZWNsYXJlVmFyaWFibGV9IGZyb20gJy4vdHNfdXRpbCc7XG5pbXBvcnQge2dlbmVyYXRlVHlwZUN0b3JEZWNsYXJhdGlvbkZuLCByZXF1aXJlc0lubGluZVR5cGVDdG9yfSBmcm9tICcuL3R5cGVfY29uc3RydWN0b3InO1xuXG4vKipcbiAqIEEgY29udGV4dCB3aGljaCBob3N0cyBvbmUgb3IgbW9yZSBUeXBlIENoZWNrIEJsb2NrcyAoVENCcykuXG4gKlxuICogQW4gYEVudmlyb25tZW50YCBzdXBwb3J0cyB0aGUgZ2VuZXJhdGlvbiBvZiBUQ0JzIGJ5IHRyYWNraW5nIG5lY2Vzc2FyeSBpbXBvcnRzLCBkZWNsYXJhdGlvbnMgb2ZcbiAqIHR5cGUgY29uc3RydWN0b3JzLCBhbmQgb3RoZXIgc3RhdGVtZW50cyBiZXlvbmQgdGhlIHR5cGUtY2hlY2tpbmcgY29kZSB3aXRoaW4gdGhlIFRDQiBpdHNlbGYuXG4gKiBUaHJvdWdoIG1ldGhvZCBjYWxscyBvbiBgRW52aXJvbm1lbnRgLCB0aGUgVENCIGdlbmVyYXRvciBjYW4gcmVxdWVzdCBgdHMuRXhwcmVzc2lvbmBzIHdoaWNoXG4gKiByZWZlcmVuY2UgZGVjbGFyYXRpb25zIGluIHRoZSBgRW52aXJvbm1lbnRgIGZvciB0aGVzZSBhcnRpZmFjdHNgLlxuICpcbiAqIGBFbnZpcm9ubWVudGAgY2FuIGJlIHVzZWQgaW4gYSBzdGFuZGFsb25lIGZhc2hpb24sIG9yIGNhbiBiZSBleHRlbmRlZCB0byBzdXBwb3J0IG1vcmUgc3BlY2lhbGl6ZWRcbiAqIHVzYWdlLlxuICovXG5leHBvcnQgY2xhc3MgRW52aXJvbm1lbnQge1xuICBwcml2YXRlIG5leHRJZHMgPSB7XG4gICAgcGlwZUluc3Q6IDEsXG4gICAgdHlwZUN0b3I6IDEsXG4gIH07XG5cbiAgcHJpdmF0ZSB0eXBlQ3RvcnMgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIHRzLkV4cHJlc3Npb24+KCk7XG4gIHByb3RlY3RlZCB0eXBlQ3RvclN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdID0gW107XG5cbiAgcHJpdmF0ZSBwaXBlSW5zdHMgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIHRzLkV4cHJlc3Npb24+KCk7XG4gIHByb3RlY3RlZCBwaXBlSW5zdFN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZywgcHJvdGVjdGVkIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIsXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByb3RlY3RlZCBjb250ZXh0RmlsZTogdHMuU291cmNlRmlsZSkge31cblxuICAvKipcbiAgICogR2V0IGFuIGV4cHJlc3Npb24gcmVmZXJyaW5nIHRvIGEgdHlwZSBjb25zdHJ1Y3RvciBmb3IgdGhlIGdpdmVuIGRpcmVjdGl2ZS5cbiAgICpcbiAgICogRGVwZW5kaW5nIG9uIHRoZSBzaGFwZSBvZiB0aGUgZGlyZWN0aXZlIGl0c2VsZiwgdGhpcyBjb3VsZCBiZSBlaXRoZXIgYSByZWZlcmVuY2UgdG8gYSBkZWNsYXJlZFxuICAgKiB0eXBlIGNvbnN0cnVjdG9yLCBvciB0byBhbiBpbmxpbmUgdHlwZSBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIHR5cGVDdG9yRm9yKGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBkaXJSZWYgPSBkaXIucmVmIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PjtcbiAgICBjb25zdCBub2RlID0gZGlyUmVmLm5vZGU7XG4gICAgaWYgKHRoaXMudHlwZUN0b3JzLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudHlwZUN0b3JzLmdldChub2RlKSAhO1xuICAgIH1cblxuICAgIGlmIChyZXF1aXJlc0lubGluZVR5cGVDdG9yKG5vZGUpKSB7XG4gICAgICAvLyBUaGUgY29uc3RydWN0b3IgaGFzIGFscmVhZHkgYmVlbiBjcmVhdGVkIGlubGluZSwgd2UganVzdCBuZWVkIHRvIGNvbnN0cnVjdCBhIHJlZmVyZW5jZSB0b1xuICAgICAgLy8gaXQuXG4gICAgICBjb25zdCByZWYgPSB0aGlzLnJlZmVyZW5jZShkaXJSZWYpO1xuICAgICAgY29uc3QgdHlwZUN0b3JFeHByID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MocmVmLCAnbmdUeXBlQ3RvcicpO1xuICAgICAgdGhpcy50eXBlQ3RvcnMuc2V0KG5vZGUsIHR5cGVDdG9yRXhwcik7XG4gICAgICByZXR1cm4gdHlwZUN0b3JFeHByO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBmbk5hbWUgPSBgX2N0b3Ike3RoaXMubmV4dElkcy50eXBlQ3RvcisrfWA7XG4gICAgICBjb25zdCBub2RlVHlwZVJlZiA9IHRoaXMucmVmZXJlbmNlVHlwZShkaXJSZWYpO1xuICAgICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKG5vZGVUeXBlUmVmKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlIGZyb20gcmVmZXJlbmNlIHRvICR7ZGlyUmVmLmRlYnVnTmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEgPSB7XG4gICAgICAgIGZuTmFtZSxcbiAgICAgICAgYm9keTogdHJ1ZSxcbiAgICAgICAgZmllbGRzOiB7XG4gICAgICAgICAgaW5wdXRzOiBPYmplY3Qua2V5cyhkaXIuaW5wdXRzKSxcbiAgICAgICAgICBvdXRwdXRzOiBPYmplY3Qua2V5cyhkaXIub3V0cHV0cyksXG4gICAgICAgICAgLy8gVE9ETzogc3VwcG9ydCBxdWVyaWVzXG4gICAgICAgICAgcXVlcmllczogZGlyLnF1ZXJpZXMsXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjb25zdCB0eXBlQ3RvciA9IGdlbmVyYXRlVHlwZUN0b3JEZWNsYXJhdGlvbkZuKG5vZGUsIG1ldGEsIG5vZGVUeXBlUmVmLnR5cGVOYW1lKTtcbiAgICAgIHRoaXMudHlwZUN0b3JTdGF0ZW1lbnRzLnB1c2godHlwZUN0b3IpO1xuICAgICAgY29uc3QgZm5JZCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIoZm5OYW1lKTtcbiAgICAgIHRoaXMudHlwZUN0b3JzLnNldChub2RlLCBmbklkKTtcbiAgICAgIHJldHVybiBmbklkO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEdldCBhbiBleHByZXNzaW9uIHJlZmVycmluZyB0byBhbiBpbnN0YW5jZSBvZiB0aGUgZ2l2ZW4gcGlwZS5cbiAgICovXG4gIHBpcGVJbnN0KHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgaWYgKHRoaXMucGlwZUluc3RzLmhhcyhyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnBpcGVJbnN0cy5nZXQocmVmLm5vZGUpICE7XG4gICAgfVxuXG4gICAgY29uc3QgcGlwZVR5cGUgPSB0aGlzLnJlZmVyZW5jZVR5cGUocmVmKTtcbiAgICBjb25zdCBwaXBlSW5zdElkID0gdHMuY3JlYXRlSWRlbnRpZmllcihgX3BpcGUke3RoaXMubmV4dElkcy5waXBlSW5zdCsrfWApO1xuXG4gICAgdGhpcy5waXBlSW5zdFN0YXRlbWVudHMucHVzaCh0c0RlY2xhcmVWYXJpYWJsZShwaXBlSW5zdElkLCBwaXBlVHlwZSkpO1xuICAgIHRoaXMucGlwZUluc3RzLnNldChyZWYubm9kZSwgcGlwZUluc3RJZCk7XG5cbiAgICByZXR1cm4gcGlwZUluc3RJZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBhIGB0cy5FeHByZXNzaW9uYCB0aGF0IHJlZmVyZW5jZXMgdGhlIGdpdmVuIG5vZGUuXG4gICAqXG4gICAqIFRoaXMgbWF5IGludm9sdmUgaW1wb3J0aW5nIHRoZSBub2RlIGludG8gdGhlIGZpbGUgaWYgaXQncyBub3QgZGVjbGFyZWQgdGhlcmUgYWxyZWFkeS5cbiAgICovXG4gIHJlZmVyZW5jZShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pik6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IG5nRXhwciA9IHRoaXMucmVmRW1pdHRlci5lbWl0KHJlZiwgdGhpcy5jb250ZXh0RmlsZSk7XG5cbiAgICAvLyBVc2UgYHRyYW5zbGF0ZUV4cHJlc3Npb25gIHRvIGNvbnZlcnQgdGhlIGBFeHByZXNzaW9uYCBpbnRvIGEgYHRzLkV4cHJlc3Npb25gLlxuICAgIHJldHVybiB0cmFuc2xhdGVFeHByZXNzaW9uKG5nRXhwciwgdGhpcy5pbXBvcnRNYW5hZ2VyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBhIGB0cy5UeXBlTm9kZWAgdGhhdCByZWZlcmVuY2VzIHRoZSBnaXZlbiBub2RlIGFzIGEgdHlwZS5cbiAgICpcbiAgICogVGhpcyBtYXkgaW52b2x2ZSBpbXBvcnRpbmcgdGhlIG5vZGUgaW50byB0aGUgZmlsZSBpZiBpdCdzIG5vdCBkZWNsYXJlZCB0aGVyZSBhbHJlYWR5LlxuICAgKi9cbiAgcmVmZXJlbmNlVHlwZShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pik6IHRzLlR5cGVOb2RlIHtcbiAgICBjb25zdCBuZ0V4cHIgPSB0aGlzLnJlZkVtaXR0ZXIuZW1pdChyZWYsIHRoaXMuY29udGV4dEZpbGUpO1xuXG4gICAgLy8gQ3JlYXRlIGFuIGBFeHByZXNzaW9uVHlwZWAgZnJvbSB0aGUgYEV4cHJlc3Npb25gIGFuZCB0cmFuc2xhdGUgaXQgdmlhIGB0cmFuc2xhdGVUeXBlYC5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHN1cHBvcnQgcmVmZXJlbmNlcyB0byB0eXBlcyB3aXRoIGdlbmVyaWMgYXJndW1lbnRzIGluIGEgY2xlYW4gd2F5LlxuICAgIHJldHVybiB0cmFuc2xhdGVUeXBlKG5ldyBFeHByZXNzaW9uVHlwZShuZ0V4cHIpLCB0aGlzLmltcG9ydE1hbmFnZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGEgYHRzLlR5cGVOb2RlYCB0aGF0IHJlZmVyZW5jZXMgYSBnaXZlbiB0eXBlIGZyb20gJ0Bhbmd1bGFyL2NvcmUnLlxuICAgKlxuICAgKiBUaGlzIHdpbGwgaW52b2x2ZSBpbXBvcnRpbmcgdGhlIHR5cGUgaW50byB0aGUgZmlsZSwgYW5kIHdpbGwgYWxzbyBhZGQgYSBudW1iZXIgb2YgZ2VuZXJpYyB0eXBlXG4gICAqIHBhcmFtZXRlcnMgKHVzaW5nIGBhbnlgKSBhcyByZXF1ZXN0ZWQuXG4gICAqL1xuICByZWZlcmVuY2VDb3JlVHlwZShuYW1lOiBzdHJpbmcsIHR5cGVQYXJhbUNvdW50OiBudW1iZXIgPSAwKTogdHMuVHlwZU5vZGUge1xuICAgIGNvbnN0IGV4dGVybmFsID0gbmV3IEV4dGVybmFsRXhwcih7XG4gICAgICBtb2R1bGVOYW1lOiAnQGFuZ3VsYXIvY29yZScsXG4gICAgICBuYW1lLFxuICAgIH0pO1xuICAgIGxldCB0eXBlUGFyYW1zOiBUeXBlW118bnVsbCA9IG51bGw7XG4gICAgaWYgKHR5cGVQYXJhbUNvdW50ID4gMCkge1xuICAgICAgdHlwZVBhcmFtcyA9IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0eXBlUGFyYW1Db3VudDsgaSsrKSB7XG4gICAgICAgIHR5cGVQYXJhbXMucHVzaChEWU5BTUlDX1RZUEUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJhbnNsYXRlVHlwZShuZXcgRXhwcmVzc2lvblR5cGUoZXh0ZXJuYWwsIG51bGwsIHR5cGVQYXJhbXMpLCB0aGlzLmltcG9ydE1hbmFnZXIpO1xuICB9XG5cbiAgZ2V0UHJlbHVkZVN0YXRlbWVudHMoKTogdHMuU3RhdGVtZW50W10ge1xuICAgIHJldHVybiBbXG4gICAgICAuLi50aGlzLnBpcGVJbnN0U3RhdGVtZW50cyxcbiAgICAgIC4uLnRoaXMudHlwZUN0b3JTdGF0ZW1lbnRzLFxuICAgIF07XG4gIH1cbn1cbiJdfQ==