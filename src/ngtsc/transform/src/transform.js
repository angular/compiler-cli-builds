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
        define("@angular/compiler-cli/src/ngtsc/transform/src/transform", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/util/src/visitor", "@angular/compiler-cli/src/ngtsc/transform/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ivyTransformFactory = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var visitor_1 = require("@angular/compiler-cli/src/ngtsc/util/src/visitor");
    var utils_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/utils");
    var NO_DECORATORS = new Set();
    var CLOSURE_FILE_OVERVIEW_REGEXP = /\s+@fileoverview\s+/i;
    function ivyTransformFactory(compilation, reflector, importRewriter, defaultImportRecorder, perf, isCore, isClosureCompilerEnabled) {
        var recordWrappedNodeExpr = createRecorderFn(defaultImportRecorder);
        return function (context) {
            return function (file) {
                return perf.inPhase(perf_1.PerfPhase.Compile, function () { return transformIvySourceFile(compilation, context, reflector, importRewriter, file, isCore, isClosureCompilerEnabled, recordWrappedNodeExpr); });
            };
        };
    }
    exports.ivyTransformFactory = ivyTransformFactory;
    /**
     * Visits all classes, performs Ivy compilation where Angular decorators are present and collects
     * result in a Map that associates a ts.ClassDeclaration with Ivy compilation results. This visitor
     * does NOT perform any TS transformations.
     */
    var IvyCompilationVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(IvyCompilationVisitor, _super);
        function IvyCompilationVisitor(compilation, constantPool) {
            var _this = _super.call(this) || this;
            _this.compilation = compilation;
            _this.constantPool = constantPool;
            _this.classCompilationMap = new Map();
            return _this;
        }
        IvyCompilationVisitor.prototype.visitClassDeclaration = function (node) {
            // Determine if this class has an Ivy field that needs to be added, and compile the field
            // to an expression if so.
            var result = this.compilation.compile(node, this.constantPool);
            if (result !== null) {
                this.classCompilationMap.set(node, result);
            }
            return { node: node };
        };
        return IvyCompilationVisitor;
    }(visitor_1.Visitor));
    /**
     * Visits all classes and performs transformation of corresponding TS nodes based on the Ivy
     * compilation results (provided as an argument).
     */
    var IvyTransformationVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(IvyTransformationVisitor, _super);
        function IvyTransformationVisitor(compilation, classCompilationMap, reflector, importManager, recordWrappedNodeExpr, isClosureCompilerEnabled, isCore) {
            var _this = _super.call(this) || this;
            _this.compilation = compilation;
            _this.classCompilationMap = classCompilationMap;
            _this.reflector = reflector;
            _this.importManager = importManager;
            _this.recordWrappedNodeExpr = recordWrappedNodeExpr;
            _this.isClosureCompilerEnabled = isClosureCompilerEnabled;
            _this.isCore = isCore;
            return _this;
        }
        IvyTransformationVisitor.prototype.visitClassDeclaration = function (node) {
            var e_1, _a;
            var _this = this;
            // If this class is not registered in the map, it means that it doesn't have Angular decorators,
            // thus no further processing is required.
            if (!this.classCompilationMap.has(node)) {
                return { node: node };
            }
            // There is at least one field to add.
            var statements = [];
            var members = tslib_1.__spread(node.members);
            try {
                for (var _b = tslib_1.__values(this.classCompilationMap.get(node)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var field = _c.value;
                    // Translate the initializer for the field into TS nodes.
                    var exprNode = translator_1.translateExpression(field.initializer, this.importManager, { recordWrappedNodeExpr: this.recordWrappedNodeExpr });
                    // Create a static property declaration for the new field.
                    var property = ts.createProperty(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], field.name, undefined, undefined, exprNode);
                    if (this.isClosureCompilerEnabled) {
                        // Closure compiler transforms the form `Service.ɵprov = X` into `Service$ɵprov = X`. To
                        // prevent this transformation, such assignments need to be annotated with @nocollapse.
                        // Note that tsickle is typically responsible for adding such annotations, however it
                        // doesn't yet handle synthetic fields added during other transformations.
                        ts.addSyntheticLeadingComment(property, ts.SyntaxKind.MultiLineCommentTrivia, '* @nocollapse ', 
                        /* hasTrailingNewLine */ false);
                    }
                    field.statements
                        .map(function (stmt) { return translator_1.translateStatement(stmt, _this.importManager, { recordWrappedNodeExpr: _this.recordWrappedNodeExpr }); })
                        .forEach(function (stmt) { return statements.push(stmt); });
                    members.push(property);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // Replace the class declaration with an updated version.
            node = ts.updateClassDeclaration(node, 
            // Remove the decorator which triggered this compilation, leaving the others alone.
            maybeFilterDecorator(node.decorators, this.compilation.decoratorsFor(node)), node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], 
            // Map over the class members and remove any Angular decorators from them.
            members.map(function (member) { return _this._stripAngularDecorators(member); }));
            return { node: node, after: statements };
        };
        /**
         * Return all decorators on a `Declaration` which are from @angular/core, or an empty set if none
         * are.
         */
        IvyTransformationVisitor.prototype._angularCoreDecorators = function (decl) {
            var _this = this;
            var decorators = this.reflector.getDecoratorsOfDeclaration(decl);
            if (decorators === null) {
                return NO_DECORATORS;
            }
            var coreDecorators = decorators.filter(function (dec) { return _this.isCore || isFromAngularCore(dec); })
                .map(function (dec) { return dec.node; });
            if (coreDecorators.length > 0) {
                return new Set(coreDecorators);
            }
            else {
                return NO_DECORATORS;
            }
        };
        /**
         * Given a `ts.Node`, filter the decorators array and return a version containing only non-Angular
         * decorators.
         *
         * If all decorators are removed (or none existed in the first place), this method returns
         * `undefined`.
         */
        IvyTransformationVisitor.prototype._nonCoreDecoratorsOnly = function (node) {
            // Shortcut if the node has no decorators.
            if (node.decorators === undefined) {
                return undefined;
            }
            // Build a Set of the decorators on this node from @angular/core.
            var coreDecorators = this._angularCoreDecorators(node);
            if (coreDecorators.size === node.decorators.length) {
                // If all decorators are to be removed, return `undefined`.
                return undefined;
            }
            else if (coreDecorators.size === 0) {
                // If no decorators need to be removed, return the original decorators array.
                return node.decorators;
            }
            // Filter out the core decorators.
            var filtered = node.decorators.filter(function (dec) { return !coreDecorators.has(dec); });
            // If no decorators survive, return `undefined`. This can only happen if a core decorator is
            // repeated on the node.
            if (filtered.length === 0) {
                return undefined;
            }
            // Create a new `NodeArray` with the filtered decorators that sourcemaps back to the original.
            var array = ts.createNodeArray(filtered);
            array.pos = node.decorators.pos;
            array.end = node.decorators.end;
            return array;
        };
        /**
         * Remove Angular decorators from a `ts.Node` in a shallow manner.
         *
         * This will remove decorators from class elements (getters, setters, properties, methods) as well
         * as parameters of constructors.
         */
        IvyTransformationVisitor.prototype._stripAngularDecorators = function (node) {
            var _this = this;
            if (ts.isParameter(node)) {
                // Strip decorators from parameters (probably of the constructor).
                node = ts.updateParameter(node, this._nonCoreDecoratorsOnly(node), node.modifiers, node.dotDotDotToken, node.name, node.questionToken, node.type, node.initializer);
            }
            else if (ts.isMethodDeclaration(node) && node.decorators !== undefined) {
                // Strip decorators of methods.
                node = ts.updateMethod(node, this._nonCoreDecoratorsOnly(node), node.modifiers, node.asteriskToken, node.name, node.questionToken, node.typeParameters, node.parameters, node.type, node.body);
            }
            else if (ts.isPropertyDeclaration(node) && node.decorators !== undefined) {
                // Strip decorators of properties.
                node = ts.updateProperty(node, this._nonCoreDecoratorsOnly(node), node.modifiers, node.name, node.questionToken, node.type, node.initializer);
            }
            else if (ts.isGetAccessor(node)) {
                // Strip decorators of getters.
                node = ts.updateGetAccessor(node, this._nonCoreDecoratorsOnly(node), node.modifiers, node.name, node.parameters, node.type, node.body);
            }
            else if (ts.isSetAccessor(node)) {
                // Strip decorators of setters.
                node = ts.updateSetAccessor(node, this._nonCoreDecoratorsOnly(node), node.modifiers, node.name, node.parameters, node.body);
            }
            else if (ts.isConstructorDeclaration(node)) {
                // For constructors, strip decorators of the parameters.
                var parameters = node.parameters.map(function (param) { return _this._stripAngularDecorators(param); });
                node =
                    ts.updateConstructor(node, node.decorators, node.modifiers, parameters, node.body);
            }
            return node;
        };
        return IvyTransformationVisitor;
    }(visitor_1.Visitor));
    /**
     * A transformer which operates on ts.SourceFiles and applies changes from an `IvyCompilation`.
     */
    function transformIvySourceFile(compilation, context, reflector, importRewriter, file, isCore, isClosureCompilerEnabled, recordWrappedNodeExpr) {
        var constantPool = new compiler_1.ConstantPool(isClosureCompilerEnabled);
        var importManager = new translator_1.ImportManager(importRewriter);
        // The transformation process consists of 2 steps:
        //
        //  1. Visit all classes, perform compilation and collect the results.
        //  2. Perform actual transformation of required TS nodes using compilation results from the first
        //     step.
        //
        // This is needed to have all `o.Expression`s generated before any TS transforms happen. This
        // allows `ConstantPool` to properly identify expressions that can be shared across multiple
        // components declared in the same file.
        // Step 1. Go though all classes in AST, perform compilation and collect the results.
        var compilationVisitor = new IvyCompilationVisitor(compilation, constantPool);
        visitor_1.visit(file, compilationVisitor, context);
        // Step 2. Scan through the AST again and perform transformations based on Ivy compilation
        // results obtained at Step 1.
        var transformationVisitor = new IvyTransformationVisitor(compilation, compilationVisitor.classCompilationMap, reflector, importManager, recordWrappedNodeExpr, isClosureCompilerEnabled, isCore);
        var sf = visitor_1.visit(file, transformationVisitor, context);
        // Generate the constant statements first, as they may involve adding additional imports
        // to the ImportManager.
        var downlevelTranslatedCode = getLocalizeCompileTarget(context) < ts.ScriptTarget.ES2015;
        var constants = constantPool.statements.map(function (stmt) { return translator_1.translateStatement(stmt, importManager, {
            recordWrappedNodeExpr: recordWrappedNodeExpr,
            downlevelTaggedTemplates: downlevelTranslatedCode,
            downlevelVariableDeclarations: downlevelTranslatedCode,
        }); });
        // Preserve @fileoverview comments required by Closure, since the location might change as a
        // result of adding extra imports and constant pool statements.
        var fileOverviewMeta = isClosureCompilerEnabled ? getFileOverviewComment(sf.statements) : null;
        // Add new imports for this file.
        sf = utils_1.addImports(importManager, sf, constants);
        if (fileOverviewMeta !== null) {
            setFileOverviewComment(sf, fileOverviewMeta);
        }
        return sf;
    }
    /**
     * Compute the correct target output for `$localize` messages generated by Angular
     *
     * In some versions of TypeScript, the transformation of synthetic `$localize` tagged template
     * literals is broken. See https://github.com/microsoft/TypeScript/issues/38485
     *
     * Here we compute what the expected final output target of the compilation will
     * be so that we can generate ES5 compliant `$localize` calls instead of relying upon TS to do the
     * downleveling for us.
     */
    function getLocalizeCompileTarget(context) {
        var target = context.getCompilerOptions().target || ts.ScriptTarget.ES2015;
        return target !== ts.ScriptTarget.JSON ? target : ts.ScriptTarget.ES2015;
    }
    function getFileOverviewComment(statements) {
        if (statements.length > 0) {
            var host = statements[0];
            var trailing = false;
            var comments = ts.getSyntheticLeadingComments(host);
            // If @fileoverview tag is not found in source file, tsickle produces fake node with trailing
            // comment and inject it at the very beginning of the generated file. So we need to check for
            // leading as well as trailing comments.
            if (!comments || comments.length === 0) {
                trailing = true;
                comments = ts.getSyntheticTrailingComments(host);
            }
            if (comments && comments.length > 0 && CLOSURE_FILE_OVERVIEW_REGEXP.test(comments[0].text)) {
                return { comments: comments, host: host, trailing: trailing };
            }
        }
        return null;
    }
    function setFileOverviewComment(sf, fileoverview) {
        var comments = fileoverview.comments, host = fileoverview.host, trailing = fileoverview.trailing;
        // If host statement is no longer the first one, it means that extra statements were added at the
        // very beginning, so we need to relocate @fileoverview comment and cleanup the original statement
        // that hosted it.
        if (sf.statements.length > 0 && host !== sf.statements[0]) {
            if (trailing) {
                ts.setSyntheticTrailingComments(host, undefined);
            }
            else {
                ts.setSyntheticLeadingComments(host, undefined);
            }
            ts.setSyntheticLeadingComments(sf.statements[0], comments);
        }
    }
    function maybeFilterDecorator(decorators, toRemove) {
        if (decorators === undefined) {
            return undefined;
        }
        var filtered = decorators.filter(function (dec) { return toRemove.find(function (decToRemove) { return ts.getOriginalNode(dec) === decToRemove; }) === undefined; });
        if (filtered.length === 0) {
            return undefined;
        }
        return ts.createNodeArray(filtered);
    }
    function isFromAngularCore(decorator) {
        return decorator.import !== null && decorator.import.from === '@angular/core';
    }
    function createRecorderFn(defaultImportRecorder) {
        return function (expr) {
            if (ts.isIdentifier(expr)) {
                defaultImportRecorder.recordUsedIdentifier(expr);
            }
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0vc3JjL3RyYW5zZm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQStDO0lBQy9DLCtCQUFpQztJQUdqQyw2REFBbUQ7SUFFbkQseUVBQWlIO0lBQ2pILDRFQUE0RTtJQUk1RSw2RUFBbUM7SUFFbkMsSUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7SUFFOUMsSUFBTSw0QkFBNEIsR0FBRyxzQkFBc0IsQ0FBQztJQVc1RCxTQUFnQixtQkFBbUIsQ0FDL0IsV0FBMEIsRUFBRSxTQUF5QixFQUFFLGNBQThCLEVBQ3JGLHFCQUE0QyxFQUFFLElBQWtCLEVBQUUsTUFBZSxFQUNqRix3QkFBaUM7UUFDbkMsSUFBTSxxQkFBcUIsR0FBRyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3RFLE9BQU8sVUFBQyxPQUFpQztZQUN2QyxPQUFPLFVBQUMsSUFBbUI7Z0JBQ3pCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FDZixnQkFBUyxDQUFDLE9BQU8sRUFDakIsY0FBTSxPQUFBLHNCQUFzQixDQUN4QixXQUFXLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFDN0Qsd0JBQXdCLEVBQUUscUJBQXFCLENBQUMsRUFGOUMsQ0FFOEMsQ0FBQyxDQUFDO1lBQzVELENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQztJQUNKLENBQUM7SUFkRCxrREFjQztJQUVEOzs7O09BSUc7SUFDSDtRQUFvQyxpREFBTztRQUd6QywrQkFBb0IsV0FBMEIsRUFBVSxZQUEwQjtZQUFsRixZQUNFLGlCQUFPLFNBQ1I7WUFGbUIsaUJBQVcsR0FBWCxXQUFXLENBQWU7WUFB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SUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29uc3RhbnRQb29sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIEltcG9ydFJld3JpdGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7UGVyZlBoYXNlLCBQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgUmVjb3JkV3JhcHBlZE5vZGVFeHByRm4sIHRyYW5zbGF0ZUV4cHJlc3Npb24sIHRyYW5zbGF0ZVN0YXRlbWVudH0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5pbXBvcnQge3Zpc2l0LCBWaXNpdExpc3RFbnRyeVJlc3VsdCwgVmlzaXRvcn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdmlzaXRvcic7XG5cbmltcG9ydCB7Q29tcGlsZVJlc3VsdH0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtUcmFpdENvbXBpbGVyfSBmcm9tICcuL2NvbXBpbGF0aW9uJztcbmltcG9ydCB7YWRkSW1wb3J0c30gZnJvbSAnLi91dGlscyc7XG5cbmNvbnN0IE5PX0RFQ09SQVRPUlMgPSBuZXcgU2V0PHRzLkRlY29yYXRvcj4oKTtcblxuY29uc3QgQ0xPU1VSRV9GSUxFX09WRVJWSUVXX1JFR0VYUCA9IC9cXHMrQGZpbGVvdmVydmlld1xccysvaTtcblxuLyoqXG4gKiBNZXRhZGF0YSB0byBzdXBwb3J0IEBmaWxlb3ZlcnZpZXcgYmxvY2tzIChDbG9zdXJlIGFubm90YXRpb25zKSBleHRyYWN0aW5nL3Jlc3RvcmluZy5cbiAqL1xuaW50ZXJmYWNlIEZpbGVPdmVydmlld01ldGEge1xuICBjb21tZW50czogdHMuU3ludGhlc2l6ZWRDb21tZW50W107XG4gIGhvc3Q6IHRzLlN0YXRlbWVudDtcbiAgdHJhaWxpbmc6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpdnlUcmFuc2Zvcm1GYWN0b3J5KFxuICAgIGNvbXBpbGF0aW9uOiBUcmFpdENvbXBpbGVyLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBpbXBvcnRSZXdyaXRlcjogSW1wb3J0UmV3cml0ZXIsXG4gICAgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHBlcmY6IFBlcmZSZWNvcmRlciwgaXNDb3JlOiBib29sZWFuLFxuICAgIGlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZDogYm9vbGVhbik6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPiB7XG4gIGNvbnN0IHJlY29yZFdyYXBwZWROb2RlRXhwciA9IGNyZWF0ZVJlY29yZGVyRm4oZGVmYXVsdEltcG9ydFJlY29yZGVyKTtcbiAgcmV0dXJuIChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpOiB0cy5UcmFuc2Zvcm1lcjx0cy5Tb3VyY2VGaWxlPiA9PiB7XG4gICAgcmV0dXJuIChmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSA9PiB7XG4gICAgICByZXR1cm4gcGVyZi5pblBoYXNlKFxuICAgICAgICAgIFBlcmZQaGFzZS5Db21waWxlLFxuICAgICAgICAgICgpID0+IHRyYW5zZm9ybUl2eVNvdXJjZUZpbGUoXG4gICAgICAgICAgICAgIGNvbXBpbGF0aW9uLCBjb250ZXh0LCByZWZsZWN0b3IsIGltcG9ydFJld3JpdGVyLCBmaWxlLCBpc0NvcmUsXG4gICAgICAgICAgICAgIGlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZCwgcmVjb3JkV3JhcHBlZE5vZGVFeHByKSk7XG4gICAgfTtcbiAgfTtcbn1cblxuLyoqXG4gKiBWaXNpdHMgYWxsIGNsYXNzZXMsIHBlcmZvcm1zIEl2eSBjb21waWxhdGlvbiB3aGVyZSBBbmd1bGFyIGRlY29yYXRvcnMgYXJlIHByZXNlbnQgYW5kIGNvbGxlY3RzXG4gKiByZXN1bHQgaW4gYSBNYXAgdGhhdCBhc3NvY2lhdGVzIGEgdHMuQ2xhc3NEZWNsYXJhdGlvbiB3aXRoIEl2eSBjb21waWxhdGlvbiByZXN1bHRzLiBUaGlzIHZpc2l0b3JcbiAqIGRvZXMgTk9UIHBlcmZvcm0gYW55IFRTIHRyYW5zZm9ybWF0aW9ucy5cbiAqL1xuY2xhc3MgSXZ5Q29tcGlsYXRpb25WaXNpdG9yIGV4dGVuZHMgVmlzaXRvciB7XG4gIHB1YmxpYyBjbGFzc0NvbXBpbGF0aW9uTWFwID0gbmV3IE1hcDx0cy5DbGFzc0RlY2xhcmF0aW9uLCBDb21waWxlUmVzdWx0W10+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjb21waWxhdGlvbjogVHJhaXRDb21waWxlciwgcHJpdmF0ZSBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICB2aXNpdENsYXNzRGVjbGFyYXRpb24obm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6XG4gICAgICBWaXNpdExpc3RFbnRyeVJlc3VsdDx0cy5TdGF0ZW1lbnQsIHRzLkNsYXNzRGVjbGFyYXRpb24+IHtcbiAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBjbGFzcyBoYXMgYW4gSXZ5IGZpZWxkIHRoYXQgbmVlZHMgdG8gYmUgYWRkZWQsIGFuZCBjb21waWxlIHRoZSBmaWVsZFxuICAgIC8vIHRvIGFuIGV4cHJlc3Npb24gaWYgc28uXG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5jb21waWxhdGlvbi5jb21waWxlKG5vZGUsIHRoaXMuY29uc3RhbnRQb29sKTtcbiAgICBpZiAocmVzdWx0ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmNsYXNzQ29tcGlsYXRpb25NYXAuc2V0KG5vZGUsIHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiB7bm9kZX07XG4gIH1cbn1cblxuLyoqXG4gKiBWaXNpdHMgYWxsIGNsYXNzZXMgYW5kIHBlcmZvcm1zIHRyYW5zZm9ybWF0aW9uIG9mIGNvcnJlc3BvbmRpbmcgVFMgbm9kZXMgYmFzZWQgb24gdGhlIEl2eVxuICogY29tcGlsYXRpb24gcmVzdWx0cyAocHJvdmlkZWQgYXMgYW4gYXJndW1lbnQpLlxuICovXG5jbGFzcyBJdnlUcmFuc2Zvcm1hdGlvblZpc2l0b3IgZXh0ZW5kcyBWaXNpdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNvbXBpbGF0aW9uOiBUcmFpdENvbXBpbGVyLFxuICAgICAgcHJpdmF0ZSBjbGFzc0NvbXBpbGF0aW9uTWFwOiBNYXA8dHMuQ2xhc3NEZWNsYXJhdGlvbiwgQ29tcGlsZVJlc3VsdFtdPixcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyLFxuICAgICAgcHJpdmF0ZSByZWNvcmRXcmFwcGVkTm9kZUV4cHI6IFJlY29yZFdyYXBwZWROb2RlRXhwckZuPHRzLkV4cHJlc3Npb24+LFxuICAgICAgcHJpdmF0ZSBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW4sIHByaXZhdGUgaXNDb3JlOiBib29sZWFuKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIHZpc2l0Q2xhc3NEZWNsYXJhdGlvbihub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTpcbiAgICAgIFZpc2l0TGlzdEVudHJ5UmVzdWx0PHRzLlN0YXRlbWVudCwgdHMuQ2xhc3NEZWNsYXJhdGlvbj4ge1xuICAgIC8vIElmIHRoaXMgY2xhc3MgaXMgbm90IHJlZ2lzdGVyZWQgaW4gdGhlIG1hcCwgaXQgbWVhbnMgdGhhdCBpdCBkb2Vzbid0IGhhdmUgQW5ndWxhciBkZWNvcmF0b3JzLFxuICAgIC8vIHRodXMgbm8gZnVydGhlciBwcm9jZXNzaW5nIGlzIHJlcXVpcmVkLlxuICAgIGlmICghdGhpcy5jbGFzc0NvbXBpbGF0aW9uTWFwLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHtub2RlfTtcbiAgICB9XG5cbiAgICAvLyBUaGVyZSBpcyBhdCBsZWFzdCBvbmUgZmllbGQgdG8gYWRkLlxuICAgIGNvbnN0IHN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdID0gW107XG4gICAgY29uc3QgbWVtYmVycyA9IFsuLi5ub2RlLm1lbWJlcnNdO1xuXG4gICAgZm9yIChjb25zdCBmaWVsZCBvZiB0aGlzLmNsYXNzQ29tcGlsYXRpb25NYXAuZ2V0KG5vZGUpISkge1xuICAgICAgLy8gVHJhbnNsYXRlIHRoZSBpbml0aWFsaXplciBmb3IgdGhlIGZpZWxkIGludG8gVFMgbm9kZXMuXG4gICAgICBjb25zdCBleHByTm9kZSA9IHRyYW5zbGF0ZUV4cHJlc3Npb24oXG4gICAgICAgICAgZmllbGQuaW5pdGlhbGl6ZXIsIHRoaXMuaW1wb3J0TWFuYWdlcixcbiAgICAgICAgICB7cmVjb3JkV3JhcHBlZE5vZGVFeHByOiB0aGlzLnJlY29yZFdyYXBwZWROb2RlRXhwcn0pO1xuXG4gICAgICAvLyBDcmVhdGUgYSBzdGF0aWMgcHJvcGVydHkgZGVjbGFyYXRpb24gZm9yIHRoZSBuZXcgZmllbGQuXG4gICAgICBjb25zdCBwcm9wZXJ0eSA9IHRzLmNyZWF0ZVByb3BlcnR5KFxuICAgICAgICAgIHVuZGVmaW5lZCwgW3RzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCldLCBmaWVsZC5uYW1lLCB1bmRlZmluZWQsXG4gICAgICAgICAgdW5kZWZpbmVkLCBleHByTm9kZSk7XG5cbiAgICAgIGlmICh0aGlzLmlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZCkge1xuICAgICAgICAvLyBDbG9zdXJlIGNvbXBpbGVyIHRyYW5zZm9ybXMgdGhlIGZvcm0gYFNlcnZpY2UuybVwcm92ID0gWGAgaW50byBgU2VydmljZSTJtXByb3YgPSBYYC4gVG9cbiAgICAgICAgLy8gcHJldmVudCB0aGlzIHRyYW5zZm9ybWF0aW9uLCBzdWNoIGFzc2lnbm1lbnRzIG5lZWQgdG8gYmUgYW5ub3RhdGVkIHdpdGggQG5vY29sbGFwc2UuXG4gICAgICAgIC8vIE5vdGUgdGhhdCB0c2lja2xlIGlzIHR5cGljYWxseSByZXNwb25zaWJsZSBmb3IgYWRkaW5nIHN1Y2ggYW5ub3RhdGlvbnMsIGhvd2V2ZXIgaXRcbiAgICAgICAgLy8gZG9lc24ndCB5ZXQgaGFuZGxlIHN5bnRoZXRpYyBmaWVsZHMgYWRkZWQgZHVyaW5nIG90aGVyIHRyYW5zZm9ybWF0aW9ucy5cbiAgICAgICAgdHMuYWRkU3ludGhldGljTGVhZGluZ0NvbW1lbnQoXG4gICAgICAgICAgICBwcm9wZXJ0eSwgdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCAnKiBAbm9jb2xsYXBzZSAnLFxuICAgICAgICAgICAgLyogaGFzVHJhaWxpbmdOZXdMaW5lICovIGZhbHNlKTtcbiAgICAgIH1cblxuICAgICAgZmllbGQuc3RhdGVtZW50c1xuICAgICAgICAgIC5tYXAoXG4gICAgICAgICAgICAgIHN0bXQgPT4gdHJhbnNsYXRlU3RhdGVtZW50KFxuICAgICAgICAgICAgICAgICAgc3RtdCwgdGhpcy5pbXBvcnRNYW5hZ2VyLCB7cmVjb3JkV3JhcHBlZE5vZGVFeHByOiB0aGlzLnJlY29yZFdyYXBwZWROb2RlRXhwcn0pKVxuICAgICAgICAgIC5mb3JFYWNoKHN0bXQgPT4gc3RhdGVtZW50cy5wdXNoKHN0bXQpKTtcblxuICAgICAgbWVtYmVycy5wdXNoKHByb3BlcnR5KTtcbiAgICB9XG5cbiAgICAvLyBSZXBsYWNlIHRoZSBjbGFzcyBkZWNsYXJhdGlvbiB3aXRoIGFuIHVwZGF0ZWQgdmVyc2lvbi5cbiAgICBub2RlID0gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgbm9kZSxcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBkZWNvcmF0b3Igd2hpY2ggdHJpZ2dlcmVkIHRoaXMgY29tcGlsYXRpb24sIGxlYXZpbmcgdGhlIG90aGVycyBhbG9uZS5cbiAgICAgICAgbWF5YmVGaWx0ZXJEZWNvcmF0b3Iobm9kZS5kZWNvcmF0b3JzLCB0aGlzLmNvbXBpbGF0aW9uLmRlY29yYXRvcnNGb3Iobm9kZSkpLCBub2RlLm1vZGlmaWVycyxcbiAgICAgICAgbm9kZS5uYW1lLCBub2RlLnR5cGVQYXJhbWV0ZXJzLCBub2RlLmhlcml0YWdlQ2xhdXNlcyB8fCBbXSxcbiAgICAgICAgLy8gTWFwIG92ZXIgdGhlIGNsYXNzIG1lbWJlcnMgYW5kIHJlbW92ZSBhbnkgQW5ndWxhciBkZWNvcmF0b3JzIGZyb20gdGhlbS5cbiAgICAgICAgbWVtYmVycy5tYXAobWVtYmVyID0+IHRoaXMuX3N0cmlwQW5ndWxhckRlY29yYXRvcnMobWVtYmVyKSkpO1xuICAgIHJldHVybiB7bm9kZSwgYWZ0ZXI6IHN0YXRlbWVudHN9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhbGwgZGVjb3JhdG9ycyBvbiBhIGBEZWNsYXJhdGlvbmAgd2hpY2ggYXJlIGZyb20gQGFuZ3VsYXIvY29yZSwgb3IgYW4gZW1wdHkgc2V0IGlmIG5vbmVcbiAgICogYXJlLlxuICAgKi9cbiAgcHJpdmF0ZSBfYW5ndWxhckNvcmVEZWNvcmF0b3JzKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogU2V0PHRzLkRlY29yYXRvcj4ge1xuICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLnJlZmxlY3Rvci5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsKTtcbiAgICBpZiAoZGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIE5PX0RFQ09SQVRPUlM7XG4gICAgfVxuICAgIGNvbnN0IGNvcmVEZWNvcmF0b3JzID0gZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IHRoaXMuaXNDb3JlIHx8IGlzRnJvbUFuZ3VsYXJDb3JlKGRlYykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChkZWMgPT4gZGVjLm5vZGUgYXMgdHMuRGVjb3JhdG9yKTtcbiAgICBpZiAoY29yZURlY29yYXRvcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIG5ldyBTZXQ8dHMuRGVjb3JhdG9yPihjb3JlRGVjb3JhdG9ycyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBOT19ERUNPUkFUT1JTO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIGB0cy5Ob2RlYCwgZmlsdGVyIHRoZSBkZWNvcmF0b3JzIGFycmF5IGFuZCByZXR1cm4gYSB2ZXJzaW9uIGNvbnRhaW5pbmcgb25seSBub24tQW5ndWxhclxuICAgKiBkZWNvcmF0b3JzLlxuICAgKlxuICAgKiBJZiBhbGwgZGVjb3JhdG9ycyBhcmUgcmVtb3ZlZCAob3Igbm9uZSBleGlzdGVkIGluIHRoZSBmaXJzdCBwbGFjZSksIHRoaXMgbWV0aG9kIHJldHVybnNcbiAgICogYHVuZGVmaW5lZGAuXG4gICAqL1xuICBwcml2YXRlIF9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZTogdHMuRGVjbGFyYXRpb24pOiB0cy5Ob2RlQXJyYXk8dHMuRGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIC8vIFNob3J0Y3V0IGlmIHRoZSBub2RlIGhhcyBubyBkZWNvcmF0b3JzLlxuICAgIGlmIChub2RlLmRlY29yYXRvcnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLy8gQnVpbGQgYSBTZXQgb2YgdGhlIGRlY29yYXRvcnMgb24gdGhpcyBub2RlIGZyb20gQGFuZ3VsYXIvY29yZS5cbiAgICBjb25zdCBjb3JlRGVjb3JhdG9ycyA9IHRoaXMuX2FuZ3VsYXJDb3JlRGVjb3JhdG9ycyhub2RlKTtcblxuICAgIGlmIChjb3JlRGVjb3JhdG9ycy5zaXplID09PSBub2RlLmRlY29yYXRvcnMubGVuZ3RoKSB7XG4gICAgICAvLyBJZiBhbGwgZGVjb3JhdG9ycyBhcmUgdG8gYmUgcmVtb3ZlZCwgcmV0dXJuIGB1bmRlZmluZWRgLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKGNvcmVEZWNvcmF0b3JzLnNpemUgPT09IDApIHtcbiAgICAgIC8vIElmIG5vIGRlY29yYXRvcnMgbmVlZCB0byBiZSByZW1vdmVkLCByZXR1cm4gdGhlIG9yaWdpbmFsIGRlY29yYXRvcnMgYXJyYXkuXG4gICAgICByZXR1cm4gbm9kZS5kZWNvcmF0b3JzO1xuICAgIH1cblxuICAgIC8vIEZpbHRlciBvdXQgdGhlIGNvcmUgZGVjb3JhdG9ycy5cbiAgICBjb25zdCBmaWx0ZXJlZCA9IG5vZGUuZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+ICFjb3JlRGVjb3JhdG9ycy5oYXMoZGVjKSk7XG5cbiAgICAvLyBJZiBubyBkZWNvcmF0b3JzIHN1cnZpdmUsIHJldHVybiBgdW5kZWZpbmVkYC4gVGhpcyBjYW4gb25seSBoYXBwZW4gaWYgYSBjb3JlIGRlY29yYXRvciBpc1xuICAgIC8vIHJlcGVhdGVkIG9uIHRoZSBub2RlLlxuICAgIGlmIChmaWx0ZXJlZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgbmV3IGBOb2RlQXJyYXlgIHdpdGggdGhlIGZpbHRlcmVkIGRlY29yYXRvcnMgdGhhdCBzb3VyY2VtYXBzIGJhY2sgdG8gdGhlIG9yaWdpbmFsLlxuICAgIGNvbnN0IGFycmF5ID0gdHMuY3JlYXRlTm9kZUFycmF5KGZpbHRlcmVkKTtcbiAgICAoYXJyYXkucG9zIGFzIG51bWJlcikgPSBub2RlLmRlY29yYXRvcnMucG9zO1xuICAgIChhcnJheS5lbmQgYXMgbnVtYmVyKSA9IG5vZGUuZGVjb3JhdG9ycy5lbmQ7XG4gICAgcmV0dXJuIGFycmF5O1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBBbmd1bGFyIGRlY29yYXRvcnMgZnJvbSBhIGB0cy5Ob2RlYCBpbiBhIHNoYWxsb3cgbWFubmVyLlxuICAgKlxuICAgKiBUaGlzIHdpbGwgcmVtb3ZlIGRlY29yYXRvcnMgZnJvbSBjbGFzcyBlbGVtZW50cyAoZ2V0dGVycywgc2V0dGVycywgcHJvcGVydGllcywgbWV0aG9kcykgYXMgd2VsbFxuICAgKiBhcyBwYXJhbWV0ZXJzIG9mIGNvbnN0cnVjdG9ycy5cbiAgICovXG4gIHByaXZhdGUgX3N0cmlwQW5ndWxhckRlY29yYXRvcnM8VCBleHRlbmRzIHRzLk5vZGU+KG5vZGU6IFQpOiBUIHtcbiAgICBpZiAodHMuaXNQYXJhbWV0ZXIobm9kZSkpIHtcbiAgICAgIC8vIFN0cmlwIGRlY29yYXRvcnMgZnJvbSBwYXJhbWV0ZXJzIChwcm9iYWJseSBvZiB0aGUgY29uc3RydWN0b3IpLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgbm9kZSwgdGhpcy5fbm9uQ29yZURlY29yYXRvcnNPbmx5KG5vZGUpLCBub2RlLm1vZGlmaWVycywgbm9kZS5kb3REb3REb3RUb2tlbixcbiAgICAgICAgICAgICAgICAgbm9kZS5uYW1lLCBub2RlLnF1ZXN0aW9uVG9rZW4sIG5vZGUudHlwZSwgbm9kZS5pbml0aWFsaXplcikgYXMgVCAmXG4gICAgICAgICAgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpICYmIG5vZGUuZGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIG1ldGhvZHMuXG4gICAgICBub2RlID0gdHMudXBkYXRlTWV0aG9kKFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLmFzdGVyaXNrVG9rZW4sXG4gICAgICAgICAgICAgICAgIG5vZGUubmFtZSwgbm9kZS5xdWVzdGlvblRva2VuLCBub2RlLnR5cGVQYXJhbWV0ZXJzLCBub2RlLnBhcmFtZXRlcnMsIG5vZGUudHlwZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5ib2R5KSBhcyBUICZcbiAgICAgICAgICB0cy5NZXRob2REZWNsYXJhdGlvbjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlEZWNsYXJhdGlvbihub2RlKSAmJiBub2RlLmRlY29yYXRvcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gU3RyaXAgZGVjb3JhdG9ycyBvZiBwcm9wZXJ0aWVzLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZVByb3BlcnR5KFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgIG5vZGUucXVlc3Rpb25Ub2tlbiwgbm9kZS50eXBlLCBub2RlLmluaXRpYWxpemVyKSBhcyBUICZcbiAgICAgICAgICB0cy5Qcm9wZXJ0eURlY2xhcmF0aW9uO1xuICAgIH0gZWxzZSBpZiAodHMuaXNHZXRBY2Nlc3Nvcihub2RlKSkge1xuICAgICAgLy8gU3RyaXAgZGVjb3JhdG9ycyBvZiBnZXR0ZXJzLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZUdldEFjY2Vzc29yKFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgIG5vZGUucGFyYW1ldGVycywgbm9kZS50eXBlLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLkdldEFjY2Vzc29yRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc1NldEFjY2Vzc29yKG5vZGUpKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIHNldHRlcnMuXG4gICAgICBub2RlID0gdHMudXBkYXRlU2V0QWNjZXNzb3IoXG4gICAgICAgICAgICAgICAgIG5vZGUsIHRoaXMuX25vbkNvcmVEZWNvcmF0b3JzT25seShub2RlKSwgbm9kZS5tb2RpZmllcnMsIG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5wYXJhbWV0ZXJzLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLlNldEFjY2Vzc29yRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIC8vIEZvciBjb25zdHJ1Y3RvcnMsIHN0cmlwIGRlY29yYXRvcnMgb2YgdGhlIHBhcmFtZXRlcnMuXG4gICAgICBjb25zdCBwYXJhbWV0ZXJzID0gbm9kZS5wYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB0aGlzLl9zdHJpcEFuZ3VsYXJEZWNvcmF0b3JzKHBhcmFtKSk7XG4gICAgICBub2RlID1cbiAgICAgICAgICB0cy51cGRhdGVDb25zdHJ1Y3Rvcihub2RlLCBub2RlLmRlY29yYXRvcnMsIG5vZGUubW9kaWZpZXJzLCBwYXJhbWV0ZXJzLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb247XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xuICB9XG59XG5cbi8qKlxuICogQSB0cmFuc2Zvcm1lciB3aGljaCBvcGVyYXRlcyBvbiB0cy5Tb3VyY2VGaWxlcyBhbmQgYXBwbGllcyBjaGFuZ2VzIGZyb20gYW4gYEl2eUNvbXBpbGF0aW9uYC5cbiAqL1xuZnVuY3Rpb24gdHJhbnNmb3JtSXZ5U291cmNlRmlsZShcbiAgICBjb21waWxhdGlvbjogVHJhaXRDb21waWxlciwgY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0LCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlciwgZmlsZTogdHMuU291cmNlRmlsZSwgaXNDb3JlOiBib29sZWFuLFxuICAgIGlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZDogYm9vbGVhbixcbiAgICByZWNvcmRXcmFwcGVkTm9kZUV4cHI6IFJlY29yZFdyYXBwZWROb2RlRXhwckZuPHRzLkV4cHJlc3Npb24+KTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IGNvbnN0YW50UG9vbCA9IG5ldyBDb25zdGFudFBvb2woaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkKTtcbiAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKGltcG9ydFJld3JpdGVyKTtcblxuICAvLyBUaGUgdHJhbnNmb3JtYXRpb24gcHJvY2VzcyBjb25zaXN0cyBvZiAyIHN0ZXBzOlxuICAvL1xuICAvLyAgMS4gVmlzaXQgYWxsIGNsYXNzZXMsIHBlcmZvcm0gY29tcGlsYXRpb24gYW5kIGNvbGxlY3QgdGhlIHJlc3VsdHMuXG4gIC8vICAyLiBQZXJmb3JtIGFjdHVhbCB0cmFuc2Zvcm1hdGlvbiBvZiByZXF1aXJlZCBUUyBub2RlcyB1c2luZyBjb21waWxhdGlvbiByZXN1bHRzIGZyb20gdGhlIGZpcnN0XG4gIC8vICAgICBzdGVwLlxuICAvL1xuICAvLyBUaGlzIGlzIG5lZWRlZCB0byBoYXZlIGFsbCBgby5FeHByZXNzaW9uYHMgZ2VuZXJhdGVkIGJlZm9yZSBhbnkgVFMgdHJhbnNmb3JtcyBoYXBwZW4uIFRoaXNcbiAgLy8gYWxsb3dzIGBDb25zdGFudFBvb2xgIHRvIHByb3Blcmx5IGlkZW50aWZ5IGV4cHJlc3Npb25zIHRoYXQgY2FuIGJlIHNoYXJlZCBhY3Jvc3MgbXVsdGlwbGVcbiAgLy8gY29tcG9uZW50cyBkZWNsYXJlZCBpbiB0aGUgc2FtZSBmaWxlLlxuXG4gIC8vIFN0ZXAgMS4gR28gdGhvdWdoIGFsbCBjbGFzc2VzIGluIEFTVCwgcGVyZm9ybSBjb21waWxhdGlvbiBhbmQgY29sbGVjdCB0aGUgcmVzdWx0cy5cbiAgY29uc3QgY29tcGlsYXRpb25WaXNpdG9yID0gbmV3IEl2eUNvbXBpbGF0aW9uVmlzaXRvcihjb21waWxhdGlvbiwgY29uc3RhbnRQb29sKTtcbiAgdmlzaXQoZmlsZSwgY29tcGlsYXRpb25WaXNpdG9yLCBjb250ZXh0KTtcblxuICAvLyBTdGVwIDIuIFNjYW4gdGhyb3VnaCB0aGUgQVNUIGFnYWluIGFuZCBwZXJmb3JtIHRyYW5zZm9ybWF0aW9ucyBiYXNlZCBvbiBJdnkgY29tcGlsYXRpb25cbiAgLy8gcmVzdWx0cyBvYnRhaW5lZCBhdCBTdGVwIDEuXG4gIGNvbnN0IHRyYW5zZm9ybWF0aW9uVmlzaXRvciA9IG5ldyBJdnlUcmFuc2Zvcm1hdGlvblZpc2l0b3IoXG4gICAgICBjb21waWxhdGlvbiwgY29tcGlsYXRpb25WaXNpdG9yLmNsYXNzQ29tcGlsYXRpb25NYXAsIHJlZmxlY3RvciwgaW1wb3J0TWFuYWdlcixcbiAgICAgIHJlY29yZFdyYXBwZWROb2RlRXhwciwgaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkLCBpc0NvcmUpO1xuICBsZXQgc2YgPSB2aXNpdChmaWxlLCB0cmFuc2Zvcm1hdGlvblZpc2l0b3IsIGNvbnRleHQpO1xuXG4gIC8vIEdlbmVyYXRlIHRoZSBjb25zdGFudCBzdGF0ZW1lbnRzIGZpcnN0LCBhcyB0aGV5IG1heSBpbnZvbHZlIGFkZGluZyBhZGRpdGlvbmFsIGltcG9ydHNcbiAgLy8gdG8gdGhlIEltcG9ydE1hbmFnZXIuXG4gIGNvbnN0IGRvd25sZXZlbFRyYW5zbGF0ZWRDb2RlID0gZ2V0TG9jYWxpemVDb21waWxlVGFyZ2V0KGNvbnRleHQpIDwgdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNTtcbiAgY29uc3QgY29uc3RhbnRzID1cbiAgICAgIGNvbnN0YW50UG9vbC5zdGF0ZW1lbnRzLm1hcChzdG10ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdG10LCBpbXBvcnRNYW5hZ2VyLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRXcmFwcGVkTm9kZUV4cHIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb3dubGV2ZWxUYWdnZWRUZW1wbGF0ZXM6IGRvd25sZXZlbFRyYW5zbGF0ZWRDb2RlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG93bmxldmVsVmFyaWFibGVEZWNsYXJhdGlvbnM6IGRvd25sZXZlbFRyYW5zbGF0ZWRDb2RlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcblxuICAvLyBQcmVzZXJ2ZSBAZmlsZW92ZXJ2aWV3IGNvbW1lbnRzIHJlcXVpcmVkIGJ5IENsb3N1cmUsIHNpbmNlIHRoZSBsb2NhdGlvbiBtaWdodCBjaGFuZ2UgYXMgYVxuICAvLyByZXN1bHQgb2YgYWRkaW5nIGV4dHJhIGltcG9ydHMgYW5kIGNvbnN0YW50IHBvb2wgc3RhdGVtZW50cy5cbiAgY29uc3QgZmlsZU92ZXJ2aWV3TWV0YSA9IGlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZCA/IGdldEZpbGVPdmVydmlld0NvbW1lbnQoc2Yuc3RhdGVtZW50cykgOiBudWxsO1xuXG4gIC8vIEFkZCBuZXcgaW1wb3J0cyBmb3IgdGhpcyBmaWxlLlxuICBzZiA9IGFkZEltcG9ydHMoaW1wb3J0TWFuYWdlciwgc2YsIGNvbnN0YW50cyk7XG5cbiAgaWYgKGZpbGVPdmVydmlld01ldGEgIT09IG51bGwpIHtcbiAgICBzZXRGaWxlT3ZlcnZpZXdDb21tZW50KHNmLCBmaWxlT3ZlcnZpZXdNZXRhKTtcbiAgfVxuXG4gIHJldHVybiBzZjtcbn1cblxuLyoqXG4gKiBDb21wdXRlIHRoZSBjb3JyZWN0IHRhcmdldCBvdXRwdXQgZm9yIGAkbG9jYWxpemVgIG1lc3NhZ2VzIGdlbmVyYXRlZCBieSBBbmd1bGFyXG4gKlxuICogSW4gc29tZSB2ZXJzaW9ucyBvZiBUeXBlU2NyaXB0LCB0aGUgdHJhbnNmb3JtYXRpb24gb2Ygc3ludGhldGljIGAkbG9jYWxpemVgIHRhZ2dlZCB0ZW1wbGF0ZVxuICogbGl0ZXJhbHMgaXMgYnJva2VuLiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zODQ4NVxuICpcbiAqIEhlcmUgd2UgY29tcHV0ZSB3aGF0IHRoZSBleHBlY3RlZCBmaW5hbCBvdXRwdXQgdGFyZ2V0IG9mIHRoZSBjb21waWxhdGlvbiB3aWxsXG4gKiBiZSBzbyB0aGF0IHdlIGNhbiBnZW5lcmF0ZSBFUzUgY29tcGxpYW50IGAkbG9jYWxpemVgIGNhbGxzIGluc3RlYWQgb2YgcmVseWluZyB1cG9uIFRTIHRvIGRvIHRoZVxuICogZG93bmxldmVsaW5nIGZvciB1cy5cbiAqL1xuZnVuY3Rpb24gZ2V0TG9jYWxpemVDb21waWxlVGFyZ2V0KGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6XG4gICAgRXhjbHVkZTx0cy5TY3JpcHRUYXJnZXQsIHRzLlNjcmlwdFRhcmdldC5KU09OPiB7XG4gIGNvbnN0IHRhcmdldCA9IGNvbnRleHQuZ2V0Q29tcGlsZXJPcHRpb25zKCkudGFyZ2V0IHx8IHRzLlNjcmlwdFRhcmdldC5FUzIwMTU7XG4gIHJldHVybiB0YXJnZXQgIT09IHRzLlNjcmlwdFRhcmdldC5KU09OID8gdGFyZ2V0IDogdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNTtcbn1cblxuZnVuY3Rpb24gZ2V0RmlsZU92ZXJ2aWV3Q29tbWVudChzdGF0ZW1lbnRzOiB0cy5Ob2RlQXJyYXk8dHMuU3RhdGVtZW50Pik6IEZpbGVPdmVydmlld01ldGF8bnVsbCB7XG4gIGlmIChzdGF0ZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBob3N0ID0gc3RhdGVtZW50c1swXTtcbiAgICBsZXQgdHJhaWxpbmcgPSBmYWxzZTtcbiAgICBsZXQgY29tbWVudHMgPSB0cy5nZXRTeW50aGV0aWNMZWFkaW5nQ29tbWVudHMoaG9zdCk7XG4gICAgLy8gSWYgQGZpbGVvdmVydmlldyB0YWcgaXMgbm90IGZvdW5kIGluIHNvdXJjZSBmaWxlLCB0c2lja2xlIHByb2R1Y2VzIGZha2Ugbm9kZSB3aXRoIHRyYWlsaW5nXG4gICAgLy8gY29tbWVudCBhbmQgaW5qZWN0IGl0IGF0IHRoZSB2ZXJ5IGJlZ2lubmluZyBvZiB0aGUgZ2VuZXJhdGVkIGZpbGUuIFNvIHdlIG5lZWQgdG8gY2hlY2sgZm9yXG4gICAgLy8gbGVhZGluZyBhcyB3ZWxsIGFzIHRyYWlsaW5nIGNvbW1lbnRzLlxuICAgIGlmICghY29tbWVudHMgfHwgY29tbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0cmFpbGluZyA9IHRydWU7XG4gICAgICBjb21tZW50cyA9IHRzLmdldFN5bnRoZXRpY1RyYWlsaW5nQ29tbWVudHMoaG9zdCk7XG4gICAgfVxuICAgIGlmIChjb21tZW50cyAmJiBjb21tZW50cy5sZW5ndGggPiAwICYmIENMT1NVUkVfRklMRV9PVkVSVklFV19SRUdFWFAudGVzdChjb21tZW50c1swXS50ZXh0KSkge1xuICAgICAgcmV0dXJuIHtjb21tZW50cywgaG9zdCwgdHJhaWxpbmd9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gc2V0RmlsZU92ZXJ2aWV3Q29tbWVudChzZjogdHMuU291cmNlRmlsZSwgZmlsZW92ZXJ2aWV3OiBGaWxlT3ZlcnZpZXdNZXRhKTogdm9pZCB7XG4gIGNvbnN0IHtjb21tZW50cywgaG9zdCwgdHJhaWxpbmd9ID0gZmlsZW92ZXJ2aWV3O1xuICAvLyBJZiBob3N0IHN0YXRlbWVudCBpcyBubyBsb25nZXIgdGhlIGZpcnN0IG9uZSwgaXQgbWVhbnMgdGhhdCBleHRyYSBzdGF0ZW1lbnRzIHdlcmUgYWRkZWQgYXQgdGhlXG4gIC8vIHZlcnkgYmVnaW5uaW5nLCBzbyB3ZSBuZWVkIHRvIHJlbG9jYXRlIEBmaWxlb3ZlcnZpZXcgY29tbWVudCBhbmQgY2xlYW51cCB0aGUgb3JpZ2luYWwgc3RhdGVtZW50XG4gIC8vIHRoYXQgaG9zdGVkIGl0LlxuICBpZiAoc2Yuc3RhdGVtZW50cy5sZW5ndGggPiAwICYmIGhvc3QgIT09IHNmLnN0YXRlbWVudHNbMF0pIHtcbiAgICBpZiAodHJhaWxpbmcpIHtcbiAgICAgIHRzLnNldFN5bnRoZXRpY1RyYWlsaW5nQ29tbWVudHMoaG9zdCwgdW5kZWZpbmVkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHMuc2V0U3ludGhldGljTGVhZGluZ0NvbW1lbnRzKGhvc3QsIHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIHRzLnNldFN5bnRoZXRpY0xlYWRpbmdDb21tZW50cyhzZi5zdGF0ZW1lbnRzWzBdLCBjb21tZW50cyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWF5YmVGaWx0ZXJEZWNvcmF0b3IoXG4gICAgZGVjb3JhdG9yczogdHMuTm9kZUFycmF5PHRzLkRlY29yYXRvcj58dW5kZWZpbmVkLFxuICAgIHRvUmVtb3ZlOiB0cy5EZWNvcmF0b3JbXSk6IHRzLk5vZGVBcnJheTx0cy5EZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gIGlmIChkZWNvcmF0b3JzID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGZpbHRlcmVkID0gZGVjb3JhdG9ycy5maWx0ZXIoXG4gICAgICBkZWMgPT4gdG9SZW1vdmUuZmluZChkZWNUb1JlbW92ZSA9PiB0cy5nZXRPcmlnaW5hbE5vZGUoZGVjKSA9PT0gZGVjVG9SZW1vdmUpID09PSB1bmRlZmluZWQpO1xuICBpZiAoZmlsdGVyZWQubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdHMuY3JlYXRlTm9kZUFycmF5KGZpbHRlcmVkKTtcbn1cblxuZnVuY3Rpb24gaXNGcm9tQW5ndWxhckNvcmUoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBib29sZWFuIHtcbiAgcmV0dXJuIGRlY29yYXRvci5pbXBvcnQgIT09IG51bGwgJiYgZGVjb3JhdG9yLmltcG9ydC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZSc7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVJlY29yZGVyRm4oZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIpOlxuICAgIFJlY29yZFdyYXBwZWROb2RlRXhwckZuPHRzLkV4cHJlc3Npb24+IHtcbiAgcmV0dXJuIGV4cHIgPT4ge1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZXhwcikpIHtcbiAgICAgIGRlZmF1bHRJbXBvcnRSZWNvcmRlci5yZWNvcmRVc2VkSWRlbnRpZmllcihleHByKTtcbiAgICB9XG4gIH07XG59XG4iXX0=