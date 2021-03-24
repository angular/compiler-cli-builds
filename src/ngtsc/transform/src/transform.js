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
            var translateOptions = {
                recordWrappedNodeExpr: this.recordWrappedNodeExpr,
                annotateForClosureCompiler: this.isClosureCompilerEnabled,
            };
            // There is at least one field to add.
            var statements = [];
            var members = tslib_1.__spreadArray([], tslib_1.__read(node.members));
            try {
                for (var _b = tslib_1.__values(this.classCompilationMap.get(node)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var field = _c.value;
                    // Translate the initializer for the field into TS nodes.
                    var exprNode = translator_1.translateExpression(field.initializer, this.importManager, translateOptions);
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
                    field.statements.map(function (stmt) { return translator_1.translateStatement(stmt, _this.importManager, translateOptions); })
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
            annotateForClosureCompiler: isClosureCompilerEnabled,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0vc3JjL3RyYW5zZm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQStDO0lBQy9DLCtCQUFpQztJQUdqQyw2REFBbUQ7SUFFbkQseUVBQW9JO0lBQ3BJLDRFQUE0RTtJQUk1RSw2RUFBbUM7SUFFbkMsSUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7SUFFOUMsSUFBTSw0QkFBNEIsR0FBRyxzQkFBc0IsQ0FBQztJQVc1RCxTQUFnQixtQkFBbUIsQ0FDL0IsV0FBMEIsRUFBRSxTQUF5QixFQUFFLGNBQThCLEVBQ3JGLHFCQUE0QyxFQUFFLElBQWtCLEVBQUUsTUFBZSxFQUNqRix3QkFBaUM7UUFDbkMsSUFBTSxxQkFBcUIsR0FBRyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3RFLE9BQU8sVUFBQyxPQUFpQztZQUN2QyxPQUFPLFVBQUMsSUFBbUI7Z0JBQ3pCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FDZixnQkFBUyxDQUFDLE9BQU8sRUFDakIsY0FBTSxPQUFBLHNCQUFzQixDQUN4QixXQUFXLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFDN0Qsd0JBQXdCLEVBQUUscUJBQXFCLENBQUMsRUFGOUMsQ0FFOEMsQ0FBQyxDQUFDO1lBQzVELENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQztJQUNKLENBQUM7SUFkRCxrREFjQztJQUVEOzs7O09BSUc7SUFDSDtRQUFvQyxpREFBTztRQUd6QywrQkFBb0IsV0FBMEIsRUFBVSxZQUEwQjtZQUFsRixZQUNFLGlCQUFPLFNBQ1I7WUFGbUIsaUJBQVcsR0FBWCxXQUFXLENBQWU7WUFB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ekIscUJBQXFCLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDbEQ7UUFDSCxDQUFDLENBQUM7SUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29uc3RhbnRQb29sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIEltcG9ydFJld3JpdGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7UGVyZlBoYXNlLCBQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgUmVjb3JkV3JhcHBlZE5vZGVFeHByRm4sIHRyYW5zbGF0ZUV4cHJlc3Npb24sIHRyYW5zbGF0ZVN0YXRlbWVudCwgVHJhbnNsYXRvck9wdGlvbnN9IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuaW1wb3J0IHt2aXNpdCwgVmlzaXRMaXN0RW50cnlSZXN1bHQsIFZpc2l0b3J9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3Zpc2l0b3InO1xuXG5pbXBvcnQge0NvbXBpbGVSZXN1bHR9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7VHJhaXRDb21waWxlcn0gZnJvbSAnLi9jb21waWxhdGlvbic7XG5pbXBvcnQge2FkZEltcG9ydHN9IGZyb20gJy4vdXRpbHMnO1xuXG5jb25zdCBOT19ERUNPUkFUT1JTID0gbmV3IFNldDx0cy5EZWNvcmF0b3I+KCk7XG5cbmNvbnN0IENMT1NVUkVfRklMRV9PVkVSVklFV19SRUdFWFAgPSAvXFxzK0BmaWxlb3ZlcnZpZXdcXHMrL2k7XG5cbi8qKlxuICogTWV0YWRhdGEgdG8gc3VwcG9ydCBAZmlsZW92ZXJ2aWV3IGJsb2NrcyAoQ2xvc3VyZSBhbm5vdGF0aW9ucykgZXh0cmFjdGluZy9yZXN0b3JpbmcuXG4gKi9cbmludGVyZmFjZSBGaWxlT3ZlcnZpZXdNZXRhIHtcbiAgY29tbWVudHM6IHRzLlN5bnRoZXNpemVkQ29tbWVudFtdO1xuICBob3N0OiB0cy5TdGF0ZW1lbnQ7XG4gIHRyYWlsaW5nOiBib29sZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXZ5VHJhbnNmb3JtRmFjdG9yeShcbiAgICBjb21waWxhdGlvbjogVHJhaXRDb21waWxlciwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyLFxuICAgIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLCBwZXJmOiBQZXJmUmVjb3JkZXIsIGlzQ29yZTogYm9vbGVhbixcbiAgICBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW4pOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4ge1xuICBjb25zdCByZWNvcmRXcmFwcGVkTm9kZUV4cHIgPSBjcmVhdGVSZWNvcmRlckZuKGRlZmF1bHRJbXBvcnRSZWNvcmRlcik7XG4gIHJldHVybiAoY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KTogdHMuVHJhbnNmb3JtZXI8dHMuU291cmNlRmlsZT4gPT4ge1xuICAgIHJldHVybiAoZmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUgPT4ge1xuICAgICAgcmV0dXJuIHBlcmYuaW5QaGFzZShcbiAgICAgICAgICBQZXJmUGhhc2UuQ29tcGlsZSxcbiAgICAgICAgICAoKSA9PiB0cmFuc2Zvcm1JdnlTb3VyY2VGaWxlKFxuICAgICAgICAgICAgICBjb21waWxhdGlvbiwgY29udGV4dCwgcmVmbGVjdG9yLCBpbXBvcnRSZXdyaXRlciwgZmlsZSwgaXNDb3JlLFxuICAgICAgICAgICAgICBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQsIHJlY29yZFdyYXBwZWROb2RlRXhwcikpO1xuICAgIH07XG4gIH07XG59XG5cbi8qKlxuICogVmlzaXRzIGFsbCBjbGFzc2VzLCBwZXJmb3JtcyBJdnkgY29tcGlsYXRpb24gd2hlcmUgQW5ndWxhciBkZWNvcmF0b3JzIGFyZSBwcmVzZW50IGFuZCBjb2xsZWN0c1xuICogcmVzdWx0IGluIGEgTWFwIHRoYXQgYXNzb2NpYXRlcyBhIHRzLkNsYXNzRGVjbGFyYXRpb24gd2l0aCBJdnkgY29tcGlsYXRpb24gcmVzdWx0cy4gVGhpcyB2aXNpdG9yXG4gKiBkb2VzIE5PVCBwZXJmb3JtIGFueSBUUyB0cmFuc2Zvcm1hdGlvbnMuXG4gKi9cbmNsYXNzIEl2eUNvbXBpbGF0aW9uVmlzaXRvciBleHRlbmRzIFZpc2l0b3Ige1xuICBwdWJsaWMgY2xhc3NDb21waWxhdGlvbk1hcCA9IG5ldyBNYXA8dHMuQ2xhc3NEZWNsYXJhdGlvbiwgQ29tcGlsZVJlc3VsdFtdPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY29tcGlsYXRpb246IFRyYWl0Q29tcGlsZXIsIHByaXZhdGUgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgdmlzaXRDbGFzc0RlY2xhcmF0aW9uKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOlxuICAgICAgVmlzaXRMaXN0RW50cnlSZXN1bHQ8dHMuU3RhdGVtZW50LCB0cy5DbGFzc0RlY2xhcmF0aW9uPiB7XG4gICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgY2xhc3MgaGFzIGFuIEl2eSBmaWVsZCB0aGF0IG5lZWRzIHRvIGJlIGFkZGVkLCBhbmQgY29tcGlsZSB0aGUgZmllbGRcbiAgICAvLyB0byBhbiBleHByZXNzaW9uIGlmIHNvLlxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuY29tcGlsYXRpb24uY29tcGlsZShub2RlLCB0aGlzLmNvbnN0YW50UG9vbCk7XG4gICAgaWYgKHJlc3VsdCAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jbGFzc0NvbXBpbGF0aW9uTWFwLnNldChub2RlLCByZXN1bHQpO1xuICAgIH1cbiAgICByZXR1cm4ge25vZGV9O1xuICB9XG59XG5cbi8qKlxuICogVmlzaXRzIGFsbCBjbGFzc2VzIGFuZCBwZXJmb3JtcyB0cmFuc2Zvcm1hdGlvbiBvZiBjb3JyZXNwb25kaW5nIFRTIG5vZGVzIGJhc2VkIG9uIHRoZSBJdnlcbiAqIGNvbXBpbGF0aW9uIHJlc3VsdHMgKHByb3ZpZGVkIGFzIGFuIGFyZ3VtZW50KS5cbiAqL1xuY2xhc3MgSXZ5VHJhbnNmb3JtYXRpb25WaXNpdG9yIGV4dGVuZHMgVmlzaXRvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjb21waWxhdGlvbjogVHJhaXRDb21waWxlcixcbiAgICAgIHByaXZhdGUgY2xhc3NDb21waWxhdGlvbk1hcDogTWFwPHRzLkNsYXNzRGVjbGFyYXRpb24sIENvbXBpbGVSZXN1bHRbXT4sXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlcixcbiAgICAgIHByaXZhdGUgcmVjb3JkV3JhcHBlZE5vZGVFeHByOiBSZWNvcmRXcmFwcGVkTm9kZUV4cHJGbjx0cy5FeHByZXNzaW9uPixcbiAgICAgIHByaXZhdGUgaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuLCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICB2aXNpdENsYXNzRGVjbGFyYXRpb24obm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6XG4gICAgICBWaXNpdExpc3RFbnRyeVJlc3VsdDx0cy5TdGF0ZW1lbnQsIHRzLkNsYXNzRGVjbGFyYXRpb24+IHtcbiAgICAvLyBJZiB0aGlzIGNsYXNzIGlzIG5vdCByZWdpc3RlcmVkIGluIHRoZSBtYXAsIGl0IG1lYW5zIHRoYXQgaXQgZG9lc24ndCBoYXZlIEFuZ3VsYXIgZGVjb3JhdG9ycyxcbiAgICAvLyB0aHVzIG5vIGZ1cnRoZXIgcHJvY2Vzc2luZyBpcyByZXF1aXJlZC5cbiAgICBpZiAoIXRoaXMuY2xhc3NDb21waWxhdGlvbk1hcC5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB7bm9kZX07XG4gICAgfVxuXG4gICAgY29uc3QgdHJhbnNsYXRlT3B0aW9uczogVHJhbnNsYXRvck9wdGlvbnM8dHMuRXhwcmVzc2lvbj4gPSB7XG4gICAgICByZWNvcmRXcmFwcGVkTm9kZUV4cHI6IHRoaXMucmVjb3JkV3JhcHBlZE5vZGVFeHByLFxuICAgICAgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IHRoaXMuaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkLFxuICAgIH07XG5cbiAgICAvLyBUaGVyZSBpcyBhdCBsZWFzdCBvbmUgZmllbGQgdG8gYWRkLlxuICAgIGNvbnN0IHN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdID0gW107XG4gICAgY29uc3QgbWVtYmVycyA9IFsuLi5ub2RlLm1lbWJlcnNdO1xuXG4gICAgZm9yIChjb25zdCBmaWVsZCBvZiB0aGlzLmNsYXNzQ29tcGlsYXRpb25NYXAuZ2V0KG5vZGUpISkge1xuICAgICAgLy8gVHJhbnNsYXRlIHRoZSBpbml0aWFsaXplciBmb3IgdGhlIGZpZWxkIGludG8gVFMgbm9kZXMuXG4gICAgICBjb25zdCBleHByTm9kZSA9IHRyYW5zbGF0ZUV4cHJlc3Npb24oZmllbGQuaW5pdGlhbGl6ZXIsIHRoaXMuaW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlT3B0aW9ucyk7XG5cbiAgICAgIC8vIENyZWF0ZSBhIHN0YXRpYyBwcm9wZXJ0eSBkZWNsYXJhdGlvbiBmb3IgdGhlIG5ldyBmaWVsZC5cbiAgICAgIGNvbnN0IHByb3BlcnR5ID0gdHMuY3JlYXRlUHJvcGVydHkoXG4gICAgICAgICAgdW5kZWZpbmVkLCBbdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKV0sIGZpZWxkLm5hbWUsIHVuZGVmaW5lZCxcbiAgICAgICAgICB1bmRlZmluZWQsIGV4cHJOb2RlKTtcblxuICAgICAgaWYgKHRoaXMuaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkKSB7XG4gICAgICAgIC8vIENsb3N1cmUgY29tcGlsZXIgdHJhbnNmb3JtcyB0aGUgZm9ybSBgU2VydmljZS7JtXByb3YgPSBYYCBpbnRvIGBTZXJ2aWNlJMm1cHJvdiA9IFhgLiBUb1xuICAgICAgICAvLyBwcmV2ZW50IHRoaXMgdHJhbnNmb3JtYXRpb24sIHN1Y2ggYXNzaWdubWVudHMgbmVlZCB0byBiZSBhbm5vdGF0ZWQgd2l0aCBAbm9jb2xsYXBzZS5cbiAgICAgICAgLy8gTm90ZSB0aGF0IHRzaWNrbGUgaXMgdHlwaWNhbGx5IHJlc3BvbnNpYmxlIGZvciBhZGRpbmcgc3VjaCBhbm5vdGF0aW9ucywgaG93ZXZlciBpdFxuICAgICAgICAvLyBkb2Vzbid0IHlldCBoYW5kbGUgc3ludGhldGljIGZpZWxkcyBhZGRlZCBkdXJpbmcgb3RoZXIgdHJhbnNmb3JtYXRpb25zLlxuICAgICAgICB0cy5hZGRTeW50aGV0aWNMZWFkaW5nQ29tbWVudChcbiAgICAgICAgICAgIHByb3BlcnR5LCB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEsICcqIEBub2NvbGxhcHNlICcsXG4gICAgICAgICAgICAvKiBoYXNUcmFpbGluZ05ld0xpbmUgKi8gZmFsc2UpO1xuICAgICAgfVxuXG4gICAgICBmaWVsZC5zdGF0ZW1lbnRzLm1hcChzdG10ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdG10LCB0aGlzLmltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZU9wdGlvbnMpKVxuICAgICAgICAgIC5mb3JFYWNoKHN0bXQgPT4gc3RhdGVtZW50cy5wdXNoKHN0bXQpKTtcblxuICAgICAgbWVtYmVycy5wdXNoKHByb3BlcnR5KTtcbiAgICB9XG5cbiAgICAvLyBSZXBsYWNlIHRoZSBjbGFzcyBkZWNsYXJhdGlvbiB3aXRoIGFuIHVwZGF0ZWQgdmVyc2lvbi5cbiAgICBub2RlID0gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgbm9kZSxcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBkZWNvcmF0b3Igd2hpY2ggdHJpZ2dlcmVkIHRoaXMgY29tcGlsYXRpb24sIGxlYXZpbmcgdGhlIG90aGVycyBhbG9uZS5cbiAgICAgICAgbWF5YmVGaWx0ZXJEZWNvcmF0b3Iobm9kZS5kZWNvcmF0b3JzLCB0aGlzLmNvbXBpbGF0aW9uLmRlY29yYXRvcnNGb3Iobm9kZSkpLCBub2RlLm1vZGlmaWVycyxcbiAgICAgICAgbm9kZS5uYW1lLCBub2RlLnR5cGVQYXJhbWV0ZXJzLCBub2RlLmhlcml0YWdlQ2xhdXNlcyB8fCBbXSxcbiAgICAgICAgLy8gTWFwIG92ZXIgdGhlIGNsYXNzIG1lbWJlcnMgYW5kIHJlbW92ZSBhbnkgQW5ndWxhciBkZWNvcmF0b3JzIGZyb20gdGhlbS5cbiAgICAgICAgbWVtYmVycy5tYXAobWVtYmVyID0+IHRoaXMuX3N0cmlwQW5ndWxhckRlY29yYXRvcnMobWVtYmVyKSkpO1xuICAgIHJldHVybiB7bm9kZSwgYWZ0ZXI6IHN0YXRlbWVudHN9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhbGwgZGVjb3JhdG9ycyBvbiBhIGBEZWNsYXJhdGlvbmAgd2hpY2ggYXJlIGZyb20gQGFuZ3VsYXIvY29yZSwgb3IgYW4gZW1wdHkgc2V0IGlmIG5vbmVcbiAgICogYXJlLlxuICAgKi9cbiAgcHJpdmF0ZSBfYW5ndWxhckNvcmVEZWNvcmF0b3JzKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogU2V0PHRzLkRlY29yYXRvcj4ge1xuICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLnJlZmxlY3Rvci5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsKTtcbiAgICBpZiAoZGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIE5PX0RFQ09SQVRPUlM7XG4gICAgfVxuICAgIGNvbnN0IGNvcmVEZWNvcmF0b3JzID0gZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IHRoaXMuaXNDb3JlIHx8IGlzRnJvbUFuZ3VsYXJDb3JlKGRlYykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChkZWMgPT4gZGVjLm5vZGUgYXMgdHMuRGVjb3JhdG9yKTtcbiAgICBpZiAoY29yZURlY29yYXRvcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIG5ldyBTZXQ8dHMuRGVjb3JhdG9yPihjb3JlRGVjb3JhdG9ycyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBOT19ERUNPUkFUT1JTO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIGB0cy5Ob2RlYCwgZmlsdGVyIHRoZSBkZWNvcmF0b3JzIGFycmF5IGFuZCByZXR1cm4gYSB2ZXJzaW9uIGNvbnRhaW5pbmcgb25seSBub24tQW5ndWxhclxuICAgKiBkZWNvcmF0b3JzLlxuICAgKlxuICAgKiBJZiBhbGwgZGVjb3JhdG9ycyBhcmUgcmVtb3ZlZCAob3Igbm9uZSBleGlzdGVkIGluIHRoZSBmaXJzdCBwbGFjZSksIHRoaXMgbWV0aG9kIHJldHVybnNcbiAgICogYHVuZGVmaW5lZGAuXG4gICAqL1xuICBwcml2YXRlIF9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZTogdHMuRGVjbGFyYXRpb24pOiB0cy5Ob2RlQXJyYXk8dHMuRGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIC8vIFNob3J0Y3V0IGlmIHRoZSBub2RlIGhhcyBubyBkZWNvcmF0b3JzLlxuICAgIGlmIChub2RlLmRlY29yYXRvcnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLy8gQnVpbGQgYSBTZXQgb2YgdGhlIGRlY29yYXRvcnMgb24gdGhpcyBub2RlIGZyb20gQGFuZ3VsYXIvY29yZS5cbiAgICBjb25zdCBjb3JlRGVjb3JhdG9ycyA9IHRoaXMuX2FuZ3VsYXJDb3JlRGVjb3JhdG9ycyhub2RlKTtcblxuICAgIGlmIChjb3JlRGVjb3JhdG9ycy5zaXplID09PSBub2RlLmRlY29yYXRvcnMubGVuZ3RoKSB7XG4gICAgICAvLyBJZiBhbGwgZGVjb3JhdG9ycyBhcmUgdG8gYmUgcmVtb3ZlZCwgcmV0dXJuIGB1bmRlZmluZWRgLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKGNvcmVEZWNvcmF0b3JzLnNpemUgPT09IDApIHtcbiAgICAgIC8vIElmIG5vIGRlY29yYXRvcnMgbmVlZCB0byBiZSByZW1vdmVkLCByZXR1cm4gdGhlIG9yaWdpbmFsIGRlY29yYXRvcnMgYXJyYXkuXG4gICAgICByZXR1cm4gbm9kZS5kZWNvcmF0b3JzO1xuICAgIH1cblxuICAgIC8vIEZpbHRlciBvdXQgdGhlIGNvcmUgZGVjb3JhdG9ycy5cbiAgICBjb25zdCBmaWx0ZXJlZCA9IG5vZGUuZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+ICFjb3JlRGVjb3JhdG9ycy5oYXMoZGVjKSk7XG5cbiAgICAvLyBJZiBubyBkZWNvcmF0b3JzIHN1cnZpdmUsIHJldHVybiBgdW5kZWZpbmVkYC4gVGhpcyBjYW4gb25seSBoYXBwZW4gaWYgYSBjb3JlIGRlY29yYXRvciBpc1xuICAgIC8vIHJlcGVhdGVkIG9uIHRoZSBub2RlLlxuICAgIGlmIChmaWx0ZXJlZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgbmV3IGBOb2RlQXJyYXlgIHdpdGggdGhlIGZpbHRlcmVkIGRlY29yYXRvcnMgdGhhdCBzb3VyY2VtYXBzIGJhY2sgdG8gdGhlIG9yaWdpbmFsLlxuICAgIGNvbnN0IGFycmF5ID0gdHMuY3JlYXRlTm9kZUFycmF5KGZpbHRlcmVkKTtcbiAgICAoYXJyYXkucG9zIGFzIG51bWJlcikgPSBub2RlLmRlY29yYXRvcnMucG9zO1xuICAgIChhcnJheS5lbmQgYXMgbnVtYmVyKSA9IG5vZGUuZGVjb3JhdG9ycy5lbmQ7XG4gICAgcmV0dXJuIGFycmF5O1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBBbmd1bGFyIGRlY29yYXRvcnMgZnJvbSBhIGB0cy5Ob2RlYCBpbiBhIHNoYWxsb3cgbWFubmVyLlxuICAgKlxuICAgKiBUaGlzIHdpbGwgcmVtb3ZlIGRlY29yYXRvcnMgZnJvbSBjbGFzcyBlbGVtZW50cyAoZ2V0dGVycywgc2V0dGVycywgcHJvcGVydGllcywgbWV0aG9kcykgYXMgd2VsbFxuICAgKiBhcyBwYXJhbWV0ZXJzIG9mIGNvbnN0cnVjdG9ycy5cbiAgICovXG4gIHByaXZhdGUgX3N0cmlwQW5ndWxhckRlY29yYXRvcnM8VCBleHRlbmRzIHRzLk5vZGU+KG5vZGU6IFQpOiBUIHtcbiAgICBpZiAodHMuaXNQYXJhbWV0ZXIobm9kZSkpIHtcbiAgICAgIC8vIFN0cmlwIGRlY29yYXRvcnMgZnJvbSBwYXJhbWV0ZXJzIChwcm9iYWJseSBvZiB0aGUgY29uc3RydWN0b3IpLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgbm9kZSwgdGhpcy5fbm9uQ29yZURlY29yYXRvcnNPbmx5KG5vZGUpLCBub2RlLm1vZGlmaWVycywgbm9kZS5kb3REb3REb3RUb2tlbixcbiAgICAgICAgICAgICAgICAgbm9kZS5uYW1lLCBub2RlLnF1ZXN0aW9uVG9rZW4sIG5vZGUudHlwZSwgbm9kZS5pbml0aWFsaXplcikgYXMgVCAmXG4gICAgICAgICAgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpICYmIG5vZGUuZGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIG1ldGhvZHMuXG4gICAgICBub2RlID0gdHMudXBkYXRlTWV0aG9kKFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLmFzdGVyaXNrVG9rZW4sXG4gICAgICAgICAgICAgICAgIG5vZGUubmFtZSwgbm9kZS5xdWVzdGlvblRva2VuLCBub2RlLnR5cGVQYXJhbWV0ZXJzLCBub2RlLnBhcmFtZXRlcnMsIG5vZGUudHlwZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5ib2R5KSBhcyBUICZcbiAgICAgICAgICB0cy5NZXRob2REZWNsYXJhdGlvbjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlEZWNsYXJhdGlvbihub2RlKSAmJiBub2RlLmRlY29yYXRvcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gU3RyaXAgZGVjb3JhdG9ycyBvZiBwcm9wZXJ0aWVzLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZVByb3BlcnR5KFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgIG5vZGUucXVlc3Rpb25Ub2tlbiwgbm9kZS50eXBlLCBub2RlLmluaXRpYWxpemVyKSBhcyBUICZcbiAgICAgICAgICB0cy5Qcm9wZXJ0eURlY2xhcmF0aW9uO1xuICAgIH0gZWxzZSBpZiAodHMuaXNHZXRBY2Nlc3Nvcihub2RlKSkge1xuICAgICAgLy8gU3RyaXAgZGVjb3JhdG9ycyBvZiBnZXR0ZXJzLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZUdldEFjY2Vzc29yKFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgIG5vZGUucGFyYW1ldGVycywgbm9kZS50eXBlLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLkdldEFjY2Vzc29yRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc1NldEFjY2Vzc29yKG5vZGUpKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIHNldHRlcnMuXG4gICAgICBub2RlID0gdHMudXBkYXRlU2V0QWNjZXNzb3IoXG4gICAgICAgICAgICAgICAgIG5vZGUsIHRoaXMuX25vbkNvcmVEZWNvcmF0b3JzT25seShub2RlKSwgbm9kZS5tb2RpZmllcnMsIG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5wYXJhbWV0ZXJzLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLlNldEFjY2Vzc29yRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIC8vIEZvciBjb25zdHJ1Y3RvcnMsIHN0cmlwIGRlY29yYXRvcnMgb2YgdGhlIHBhcmFtZXRlcnMuXG4gICAgICBjb25zdCBwYXJhbWV0ZXJzID0gbm9kZS5wYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB0aGlzLl9zdHJpcEFuZ3VsYXJEZWNvcmF0b3JzKHBhcmFtKSk7XG4gICAgICBub2RlID1cbiAgICAgICAgICB0cy51cGRhdGVDb25zdHJ1Y3Rvcihub2RlLCBub2RlLmRlY29yYXRvcnMsIG5vZGUubW9kaWZpZXJzLCBwYXJhbWV0ZXJzLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb247XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xuICB9XG59XG5cbi8qKlxuICogQSB0cmFuc2Zvcm1lciB3aGljaCBvcGVyYXRlcyBvbiB0cy5Tb3VyY2VGaWxlcyBhbmQgYXBwbGllcyBjaGFuZ2VzIGZyb20gYW4gYEl2eUNvbXBpbGF0aW9uYC5cbiAqL1xuZnVuY3Rpb24gdHJhbnNmb3JtSXZ5U291cmNlRmlsZShcbiAgICBjb21waWxhdGlvbjogVHJhaXRDb21waWxlciwgY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0LCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlciwgZmlsZTogdHMuU291cmNlRmlsZSwgaXNDb3JlOiBib29sZWFuLFxuICAgIGlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZDogYm9vbGVhbixcbiAgICByZWNvcmRXcmFwcGVkTm9kZUV4cHI6IFJlY29yZFdyYXBwZWROb2RlRXhwckZuPHRzLkV4cHJlc3Npb24+KTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IGNvbnN0YW50UG9vbCA9IG5ldyBDb25zdGFudFBvb2woaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkKTtcbiAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKGltcG9ydFJld3JpdGVyKTtcblxuICAvLyBUaGUgdHJhbnNmb3JtYXRpb24gcHJvY2VzcyBjb25zaXN0cyBvZiAyIHN0ZXBzOlxuICAvL1xuICAvLyAgMS4gVmlzaXQgYWxsIGNsYXNzZXMsIHBlcmZvcm0gY29tcGlsYXRpb24gYW5kIGNvbGxlY3QgdGhlIHJlc3VsdHMuXG4gIC8vICAyLiBQZXJmb3JtIGFjdHVhbCB0cmFuc2Zvcm1hdGlvbiBvZiByZXF1aXJlZCBUUyBub2RlcyB1c2luZyBjb21waWxhdGlvbiByZXN1bHRzIGZyb20gdGhlIGZpcnN0XG4gIC8vICAgICBzdGVwLlxuICAvL1xuICAvLyBUaGlzIGlzIG5lZWRlZCB0byBoYXZlIGFsbCBgby5FeHByZXNzaW9uYHMgZ2VuZXJhdGVkIGJlZm9yZSBhbnkgVFMgdHJhbnNmb3JtcyBoYXBwZW4uIFRoaXNcbiAgLy8gYWxsb3dzIGBDb25zdGFudFBvb2xgIHRvIHByb3Blcmx5IGlkZW50aWZ5IGV4cHJlc3Npb25zIHRoYXQgY2FuIGJlIHNoYXJlZCBhY3Jvc3MgbXVsdGlwbGVcbiAgLy8gY29tcG9uZW50cyBkZWNsYXJlZCBpbiB0aGUgc2FtZSBmaWxlLlxuXG4gIC8vIFN0ZXAgMS4gR28gdGhvdWdoIGFsbCBjbGFzc2VzIGluIEFTVCwgcGVyZm9ybSBjb21waWxhdGlvbiBhbmQgY29sbGVjdCB0aGUgcmVzdWx0cy5cbiAgY29uc3QgY29tcGlsYXRpb25WaXNpdG9yID0gbmV3IEl2eUNvbXBpbGF0aW9uVmlzaXRvcihjb21waWxhdGlvbiwgY29uc3RhbnRQb29sKTtcbiAgdmlzaXQoZmlsZSwgY29tcGlsYXRpb25WaXNpdG9yLCBjb250ZXh0KTtcblxuICAvLyBTdGVwIDIuIFNjYW4gdGhyb3VnaCB0aGUgQVNUIGFnYWluIGFuZCBwZXJmb3JtIHRyYW5zZm9ybWF0aW9ucyBiYXNlZCBvbiBJdnkgY29tcGlsYXRpb25cbiAgLy8gcmVzdWx0cyBvYnRhaW5lZCBhdCBTdGVwIDEuXG4gIGNvbnN0IHRyYW5zZm9ybWF0aW9uVmlzaXRvciA9IG5ldyBJdnlUcmFuc2Zvcm1hdGlvblZpc2l0b3IoXG4gICAgICBjb21waWxhdGlvbiwgY29tcGlsYXRpb25WaXNpdG9yLmNsYXNzQ29tcGlsYXRpb25NYXAsIHJlZmxlY3RvciwgaW1wb3J0TWFuYWdlcixcbiAgICAgIHJlY29yZFdyYXBwZWROb2RlRXhwciwgaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkLCBpc0NvcmUpO1xuICBsZXQgc2YgPSB2aXNpdChmaWxlLCB0cmFuc2Zvcm1hdGlvblZpc2l0b3IsIGNvbnRleHQpO1xuXG4gIC8vIEdlbmVyYXRlIHRoZSBjb25zdGFudCBzdGF0ZW1lbnRzIGZpcnN0LCBhcyB0aGV5IG1heSBpbnZvbHZlIGFkZGluZyBhZGRpdGlvbmFsIGltcG9ydHNcbiAgLy8gdG8gdGhlIEltcG9ydE1hbmFnZXIuXG4gIGNvbnN0IGRvd25sZXZlbFRyYW5zbGF0ZWRDb2RlID0gZ2V0TG9jYWxpemVDb21waWxlVGFyZ2V0KGNvbnRleHQpIDwgdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNTtcbiAgY29uc3QgY29uc3RhbnRzID1cbiAgICAgIGNvbnN0YW50UG9vbC5zdGF0ZW1lbnRzLm1hcChzdG10ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdG10LCBpbXBvcnRNYW5hZ2VyLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRXcmFwcGVkTm9kZUV4cHIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb3dubGV2ZWxUYWdnZWRUZW1wbGF0ZXM6IGRvd25sZXZlbFRyYW5zbGF0ZWRDb2RlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG93bmxldmVsVmFyaWFibGVEZWNsYXJhdGlvbnM6IGRvd25sZXZlbFRyYW5zbGF0ZWRDb2RlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG5cbiAgLy8gUHJlc2VydmUgQGZpbGVvdmVydmlldyBjb21tZW50cyByZXF1aXJlZCBieSBDbG9zdXJlLCBzaW5jZSB0aGUgbG9jYXRpb24gbWlnaHQgY2hhbmdlIGFzIGFcbiAgLy8gcmVzdWx0IG9mIGFkZGluZyBleHRyYSBpbXBvcnRzIGFuZCBjb25zdGFudCBwb29sIHN0YXRlbWVudHMuXG4gIGNvbnN0IGZpbGVPdmVydmlld01ldGEgPSBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQgPyBnZXRGaWxlT3ZlcnZpZXdDb21tZW50KHNmLnN0YXRlbWVudHMpIDogbnVsbDtcblxuICAvLyBBZGQgbmV3IGltcG9ydHMgZm9yIHRoaXMgZmlsZS5cbiAgc2YgPSBhZGRJbXBvcnRzKGltcG9ydE1hbmFnZXIsIHNmLCBjb25zdGFudHMpO1xuXG4gIGlmIChmaWxlT3ZlcnZpZXdNZXRhICE9PSBudWxsKSB7XG4gICAgc2V0RmlsZU92ZXJ2aWV3Q29tbWVudChzZiwgZmlsZU92ZXJ2aWV3TWV0YSk7XG4gIH1cblxuICByZXR1cm4gc2Y7XG59XG5cbi8qKlxuICogQ29tcHV0ZSB0aGUgY29ycmVjdCB0YXJnZXQgb3V0cHV0IGZvciBgJGxvY2FsaXplYCBtZXNzYWdlcyBnZW5lcmF0ZWQgYnkgQW5ndWxhclxuICpcbiAqIEluIHNvbWUgdmVyc2lvbnMgb2YgVHlwZVNjcmlwdCwgdGhlIHRyYW5zZm9ybWF0aW9uIG9mIHN5bnRoZXRpYyBgJGxvY2FsaXplYCB0YWdnZWQgdGVtcGxhdGVcbiAqIGxpdGVyYWxzIGlzIGJyb2tlbi4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzg0ODVcbiAqXG4gKiBIZXJlIHdlIGNvbXB1dGUgd2hhdCB0aGUgZXhwZWN0ZWQgZmluYWwgb3V0cHV0IHRhcmdldCBvZiB0aGUgY29tcGlsYXRpb24gd2lsbFxuICogYmUgc28gdGhhdCB3ZSBjYW4gZ2VuZXJhdGUgRVM1IGNvbXBsaWFudCBgJGxvY2FsaXplYCBjYWxscyBpbnN0ZWFkIG9mIHJlbHlpbmcgdXBvbiBUUyB0byBkbyB0aGVcbiAqIGRvd25sZXZlbGluZyBmb3IgdXMuXG4gKi9cbmZ1bmN0aW9uIGdldExvY2FsaXplQ29tcGlsZVRhcmdldChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpOlxuICAgIEV4Y2x1ZGU8dHMuU2NyaXB0VGFyZ2V0LCB0cy5TY3JpcHRUYXJnZXQuSlNPTj4ge1xuICBjb25zdCB0YXJnZXQgPSBjb250ZXh0LmdldENvbXBpbGVyT3B0aW9ucygpLnRhcmdldCB8fCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1O1xuICByZXR1cm4gdGFyZ2V0ICE9PSB0cy5TY3JpcHRUYXJnZXQuSlNPTiA/IHRhcmdldCA6IHRzLlNjcmlwdFRhcmdldC5FUzIwMTU7XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVPdmVydmlld0NvbW1lbnQoc3RhdGVtZW50czogdHMuTm9kZUFycmF5PHRzLlN0YXRlbWVudD4pOiBGaWxlT3ZlcnZpZXdNZXRhfG51bGwge1xuICBpZiAoc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgaG9zdCA9IHN0YXRlbWVudHNbMF07XG4gICAgbGV0IHRyYWlsaW5nID0gZmFsc2U7XG4gICAgbGV0IGNvbW1lbnRzID0gdHMuZ2V0U3ludGhldGljTGVhZGluZ0NvbW1lbnRzKGhvc3QpO1xuICAgIC8vIElmIEBmaWxlb3ZlcnZpZXcgdGFnIGlzIG5vdCBmb3VuZCBpbiBzb3VyY2UgZmlsZSwgdHNpY2tsZSBwcm9kdWNlcyBmYWtlIG5vZGUgd2l0aCB0cmFpbGluZ1xuICAgIC8vIGNvbW1lbnQgYW5kIGluamVjdCBpdCBhdCB0aGUgdmVyeSBiZWdpbm5pbmcgb2YgdGhlIGdlbmVyYXRlZCBmaWxlLiBTbyB3ZSBuZWVkIHRvIGNoZWNrIGZvclxuICAgIC8vIGxlYWRpbmcgYXMgd2VsbCBhcyB0cmFpbGluZyBjb21tZW50cy5cbiAgICBpZiAoIWNvbW1lbnRzIHx8IGNvbW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuICAgICAgY29tbWVudHMgPSB0cy5nZXRTeW50aGV0aWNUcmFpbGluZ0NvbW1lbnRzKGhvc3QpO1xuICAgIH1cbiAgICBpZiAoY29tbWVudHMgJiYgY29tbWVudHMubGVuZ3RoID4gMCAmJiBDTE9TVVJFX0ZJTEVfT1ZFUlZJRVdfUkVHRVhQLnRlc3QoY29tbWVudHNbMF0udGV4dCkpIHtcbiAgICAgIHJldHVybiB7Y29tbWVudHMsIGhvc3QsIHRyYWlsaW5nfTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHNldEZpbGVPdmVydmlld0NvbW1lbnQoc2Y6IHRzLlNvdXJjZUZpbGUsIGZpbGVvdmVydmlldzogRmlsZU92ZXJ2aWV3TWV0YSk6IHZvaWQge1xuICBjb25zdCB7Y29tbWVudHMsIGhvc3QsIHRyYWlsaW5nfSA9IGZpbGVvdmVydmlldztcbiAgLy8gSWYgaG9zdCBzdGF0ZW1lbnQgaXMgbm8gbG9uZ2VyIHRoZSBmaXJzdCBvbmUsIGl0IG1lYW5zIHRoYXQgZXh0cmEgc3RhdGVtZW50cyB3ZXJlIGFkZGVkIGF0IHRoZVxuICAvLyB2ZXJ5IGJlZ2lubmluZywgc28gd2UgbmVlZCB0byByZWxvY2F0ZSBAZmlsZW92ZXJ2aWV3IGNvbW1lbnQgYW5kIGNsZWFudXAgdGhlIG9yaWdpbmFsIHN0YXRlbWVudFxuICAvLyB0aGF0IGhvc3RlZCBpdC5cbiAgaWYgKHNmLnN0YXRlbWVudHMubGVuZ3RoID4gMCAmJiBob3N0ICE9PSBzZi5zdGF0ZW1lbnRzWzBdKSB7XG4gICAgaWYgKHRyYWlsaW5nKSB7XG4gICAgICB0cy5zZXRTeW50aGV0aWNUcmFpbGluZ0NvbW1lbnRzKGhvc3QsIHVuZGVmaW5lZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRzLnNldFN5bnRoZXRpY0xlYWRpbmdDb21tZW50cyhob3N0LCB1bmRlZmluZWQpO1xuICAgIH1cbiAgICB0cy5zZXRTeW50aGV0aWNMZWFkaW5nQ29tbWVudHMoc2Yuc3RhdGVtZW50c1swXSwgY29tbWVudHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1heWJlRmlsdGVyRGVjb3JhdG9yKFxuICAgIGRlY29yYXRvcnM6IHRzLk5vZGVBcnJheTx0cy5EZWNvcmF0b3I+fHVuZGVmaW5lZCxcbiAgICB0b1JlbW92ZTogdHMuRGVjb3JhdG9yW10pOiB0cy5Ob2RlQXJyYXk8dHMuRGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICBpZiAoZGVjb3JhdG9ycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBmaWx0ZXJlZCA9IGRlY29yYXRvcnMuZmlsdGVyKFxuICAgICAgZGVjID0+IHRvUmVtb3ZlLmZpbmQoZGVjVG9SZW1vdmUgPT4gdHMuZ2V0T3JpZ2luYWxOb2RlKGRlYykgPT09IGRlY1RvUmVtb3ZlKSA9PT0gdW5kZWZpbmVkKTtcbiAgaWYgKGZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHRzLmNyZWF0ZU5vZGVBcnJheShmaWx0ZXJlZCk7XG59XG5cbmZ1bmN0aW9uIGlzRnJvbUFuZ3VsYXJDb3JlKGRlY29yYXRvcjogRGVjb3JhdG9yKTogYm9vbGVhbiB7XG4gIHJldHVybiBkZWNvcmF0b3IuaW1wb3J0ICE9PSBudWxsICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVSZWNvcmRlckZuKGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyKTpcbiAgICBSZWNvcmRXcmFwcGVkTm9kZUV4cHJGbjx0cy5FeHByZXNzaW9uPiB7XG4gIHJldHVybiBleHByID0+IHtcbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKGV4cHIpKSB7XG4gICAgICBkZWZhdWx0SW1wb3J0UmVjb3JkZXIucmVjb3JkVXNlZElkZW50aWZpZXIoZXhwcik7XG4gICAgfVxuICB9O1xufVxuIl19