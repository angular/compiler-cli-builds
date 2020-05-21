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
        define("@angular/compiler-cli/src/ngtsc/transform/src/transform", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/util/src/visitor", "@angular/compiler-cli/src/ngtsc/transform/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ivyTransformFactory = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var visitor_1 = require("@angular/compiler-cli/src/ngtsc/util/src/visitor");
    var utils_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/utils");
    var NO_DECORATORS = new Set();
    var CLOSURE_FILE_OVERVIEW_REGEXP = /\s+@fileoverview\s+/i;
    function ivyTransformFactory(compilation, reflector, importRewriter, defaultImportRecorder, isCore, isClosureCompilerEnabled) {
        return function (context) {
            return function (file) {
                return transformIvySourceFile(compilation, context, reflector, importRewriter, file, isCore, isClosureCompilerEnabled, defaultImportRecorder);
            };
        };
    }
    exports.ivyTransformFactory = ivyTransformFactory;
    var IvyVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(IvyVisitor, _super);
        function IvyVisitor(compilation, reflector, importManager, defaultImportRecorder, isClosureCompilerEnabled, isCore, constantPool) {
            var _this = _super.call(this) || this;
            _this.compilation = compilation;
            _this.reflector = reflector;
            _this.importManager = importManager;
            _this.defaultImportRecorder = defaultImportRecorder;
            _this.isClosureCompilerEnabled = isClosureCompilerEnabled;
            _this.isCore = isCore;
            _this.constantPool = constantPool;
            return _this;
        }
        IvyVisitor.prototype.visitClassDeclaration = function (node) {
            var _this = this;
            // Determine if this class has an Ivy field that needs to be added, and compile the field
            // to an expression if so.
            var res = this.compilation.compile(node, this.constantPool);
            if (res !== null) {
                // There is at least one field to add.
                var statements_1 = [];
                var members_1 = tslib_1.__spread(node.members);
                res.forEach(function (field) {
                    // Translate the initializer for the field into TS nodes.
                    var exprNode = translator_1.translateExpression(field.initializer, _this.importManager, _this.defaultImportRecorder, ts.ScriptTarget.ES2015);
                    // Create a static property declaration for the new field.
                    var property = ts.createProperty(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], field.name, undefined, undefined, exprNode);
                    if (_this.isClosureCompilerEnabled) {
                        // Closure compiler transforms the form `Service.ɵprov = X` into `Service$ɵprov = X`. To
                        // prevent this transformation, such assignments need to be annotated with @nocollapse.
                        // Note that tsickle is typically responsible for adding such annotations, however it
                        // doesn't yet handle synthetic fields added during other transformations.
                        ts.addSyntheticLeadingComment(property, ts.SyntaxKind.MultiLineCommentTrivia, '* @nocollapse ', 
                        /* hasTrailingNewLine */ false);
                    }
                    field.statements
                        .map(function (stmt) { return translator_1.translateStatement(stmt, _this.importManager, _this.defaultImportRecorder, ts.ScriptTarget.ES2015); })
                        .forEach(function (stmt) { return statements_1.push(stmt); });
                    members_1.push(property);
                });
                // Replace the class declaration with an updated version.
                node = ts.updateClassDeclaration(node, 
                // Remove the decorator which triggered this compilation, leaving the others alone.
                maybeFilterDecorator(node.decorators, this.compilation.decoratorsFor(node)), node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], 
                // Map over the class members and remove any Angular decorators from them.
                members_1.map(function (member) { return _this._stripAngularDecorators(member); }));
                return { node: node, after: statements_1 };
            }
            return { node: node };
        };
        /**
         * Return all decorators on a `Declaration` which are from @angular/core, or an empty set if none
         * are.
         */
        IvyVisitor.prototype._angularCoreDecorators = function (decl) {
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
        IvyVisitor.prototype._nonCoreDecoratorsOnly = function (node) {
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
        IvyVisitor.prototype._stripAngularDecorators = function (node) {
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
        return IvyVisitor;
    }(visitor_1.Visitor));
    /**
     * A transformer which operates on ts.SourceFiles and applies changes from an `IvyCompilation`.
     */
    function transformIvySourceFile(compilation, context, reflector, importRewriter, file, isCore, isClosureCompilerEnabled, defaultImportRecorder) {
        var constantPool = new compiler_1.ConstantPool();
        var importManager = new translator_1.ImportManager(importRewriter);
        // Recursively scan through the AST and perform any updates requested by the IvyCompilation.
        var visitor = new IvyVisitor(compilation, reflector, importManager, defaultImportRecorder, isClosureCompilerEnabled, isCore, constantPool);
        var sf = visitor_1.visit(file, visitor, context);
        // Generate the constant statements first, as they may involve adding additional imports
        // to the ImportManager.
        var constants = constantPool.statements.map(function (stmt) { return translator_1.translateStatement(stmt, importManager, defaultImportRecorder, getLocalizeCompileTarget(context)); });
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0vc3JjL3RyYW5zZm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQStDO0lBQy9DLCtCQUFpQztJQUlqQyx5RUFBd0Y7SUFDeEYsNEVBQTRFO0lBRzVFLDZFQUFtQztJQUVuQyxJQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBZ0IsQ0FBQztJQUU5QyxJQUFNLDRCQUE0QixHQUFHLHNCQUFzQixDQUFDO0lBVzVELFNBQWdCLG1CQUFtQixDQUMvQixXQUEwQixFQUFFLFNBQXlCLEVBQUUsY0FBOEIsRUFDckYscUJBQTRDLEVBQUUsTUFBZSxFQUM3RCx3QkFBaUM7UUFDbkMsT0FBTyxVQUFDLE9BQWlDO1lBQ3ZDLE9BQU8sVUFBQyxJQUFtQjtnQkFDekIsT0FBTyxzQkFBc0IsQ0FDekIsV0FBVyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsd0JBQXdCLEVBQ3ZGLHFCQUFxQixDQUFDLENBQUM7WUFDN0IsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQVhELGtEQVdDO0lBRUQ7UUFBeUIsc0NBQU87UUFDOUIsb0JBQ1ksV0FBMEIsRUFBVSxTQUF5QixFQUM3RCxhQUE0QixFQUFVLHFCQUE0QyxFQUNsRix3QkFBaUMsRUFBVSxNQUFlLEVBQzFELFlBQTBCO1lBSnRDLFlBS0UsaUJBQU8sU0FDUjtZQUxXLGlCQUFXLEdBQVgsV0FBVyxDQUFlO1lBQVUsZUFBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDN0QsbUJBQWEsR0FBYixhQUFhLENBQWU7WUFBVSwyQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1lBQ2xGLDhCQUF3QixHQUF4Qix3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QUFRLENBQUMsQ0FBQztTQUM1RDtJQUNILENBQUM7SUFFRCxTQUFTLG9CQUFvQixDQUN6QixVQUFnRCxFQUNoRCxRQUF3QjtRQUMxQixJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUU7WUFDNUIsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFDRCxJQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUM5QixVQUFBLEdBQUcsSUFBSSxPQUFBLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBQSxXQUFXLElBQUksT0FBQSxFQUFFLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLFdBQVcsRUFBdkMsQ0FBdUMsQ0FBQyxLQUFLLFNBQVMsRUFBbkYsQ0FBbUYsQ0FBQyxDQUFDO1FBQ2hHLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDekIsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFDRCxPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVELFNBQVMsaUJBQWlCLENBQUMsU0FBb0I7UUFDN0MsT0FBTyxTQUFTLENBQUMsTUFBTSxLQUFLLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxlQUFlLENBQUM7SUFDaEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgSW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlRXhwcmVzc2lvbiwgdHJhbnNsYXRlU3RhdGVtZW50fSBmcm9tICcuLi8uLi90cmFuc2xhdG9yJztcbmltcG9ydCB7dmlzaXQsIFZpc2l0TGlzdEVudHJ5UmVzdWx0LCBWaXNpdG9yfSBmcm9tICcuLi8uLi91dGlsL3NyYy92aXNpdG9yJztcblxuaW1wb3J0IHtUcmFpdENvbXBpbGVyfSBmcm9tICcuL2NvbXBpbGF0aW9uJztcbmltcG9ydCB7YWRkSW1wb3J0c30gZnJvbSAnLi91dGlscyc7XG5cbmNvbnN0IE5PX0RFQ09SQVRPUlMgPSBuZXcgU2V0PHRzLkRlY29yYXRvcj4oKTtcblxuY29uc3QgQ0xPU1VSRV9GSUxFX09WRVJWSUVXX1JFR0VYUCA9IC9cXHMrQGZpbGVvdmVydmlld1xccysvaTtcblxuLyoqXG4gKiBNZXRhZGF0YSB0byBzdXBwb3J0IEBmaWxlb3ZlcnZpZXcgYmxvY2tzIChDbG9zdXJlIGFubm90YXRpb25zKSBleHRyYWN0aW5nL3Jlc3RvcmluZy5cbiAqL1xuaW50ZXJmYWNlIEZpbGVPdmVydmlld01ldGEge1xuICBjb21tZW50czogdHMuU3ludGhlc2l6ZWRDb21tZW50W107XG4gIGhvc3Q6IHRzLlN0YXRlbWVudDtcbiAgdHJhaWxpbmc6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpdnlUcmFuc2Zvcm1GYWN0b3J5KFxuICAgIGNvbXBpbGF0aW9uOiBUcmFpdENvbXBpbGVyLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBpbXBvcnRSZXdyaXRlcjogSW1wb3J0UmV3cml0ZXIsXG4gICAgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZTogYm9vbGVhbixcbiAgICBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW4pOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6IHRzLlRyYW5zZm9ybWVyPHRzLlNvdXJjZUZpbGU+ID0+IHtcbiAgICByZXR1cm4gKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlID0+IHtcbiAgICAgIHJldHVybiB0cmFuc2Zvcm1JdnlTb3VyY2VGaWxlKFxuICAgICAgICAgIGNvbXBpbGF0aW9uLCBjb250ZXh0LCByZWZsZWN0b3IsIGltcG9ydFJld3JpdGVyLCBmaWxlLCBpc0NvcmUsIGlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZCxcbiAgICAgICAgICBkZWZhdWx0SW1wb3J0UmVjb3JkZXIpO1xuICAgIH07XG4gIH07XG59XG5cbmNsYXNzIEl2eVZpc2l0b3IgZXh0ZW5kcyBWaXNpdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNvbXBpbGF0aW9uOiBUcmFpdENvbXBpbGVyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIsIHByaXZhdGUgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgICBwcml2YXRlIGlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZDogYm9vbGVhbiwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIHZpc2l0Q2xhc3NEZWNsYXJhdGlvbihub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTpcbiAgICAgIFZpc2l0TGlzdEVudHJ5UmVzdWx0PHRzLlN0YXRlbWVudCwgdHMuQ2xhc3NEZWNsYXJhdGlvbj4ge1xuICAgIC8vIERldGVybWluZSBpZiB0aGlzIGNsYXNzIGhhcyBhbiBJdnkgZmllbGQgdGhhdCBuZWVkcyB0byBiZSBhZGRlZCwgYW5kIGNvbXBpbGUgdGhlIGZpZWxkXG4gICAgLy8gdG8gYW4gZXhwcmVzc2lvbiBpZiBzby5cbiAgICBjb25zdCByZXMgPSB0aGlzLmNvbXBpbGF0aW9uLmNvbXBpbGUobm9kZSwgdGhpcy5jb25zdGFudFBvb2wpO1xuXG4gICAgaWYgKHJlcyAhPT0gbnVsbCkge1xuICAgICAgLy8gVGhlcmUgaXMgYXQgbGVhc3Qgb25lIGZpZWxkIHRvIGFkZC5cbiAgICAgIGNvbnN0IHN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdID0gW107XG4gICAgICBjb25zdCBtZW1iZXJzID0gWy4uLm5vZGUubWVtYmVyc107XG5cbiAgICAgIHJlcy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgLy8gVHJhbnNsYXRlIHRoZSBpbml0aWFsaXplciBmb3IgdGhlIGZpZWxkIGludG8gVFMgbm9kZXMuXG4gICAgICAgIGNvbnN0IGV4cHJOb2RlID0gdHJhbnNsYXRlRXhwcmVzc2lvbihcbiAgICAgICAgICAgIGZpZWxkLmluaXRpYWxpemVyLCB0aGlzLmltcG9ydE1hbmFnZXIsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgICAgICAgICAgdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGEgc3RhdGljIHByb3BlcnR5IGRlY2xhcmF0aW9uIGZvciB0aGUgbmV3IGZpZWxkLlxuICAgICAgICBjb25zdCBwcm9wZXJ0eSA9IHRzLmNyZWF0ZVByb3BlcnR5KFxuICAgICAgICAgICAgdW5kZWZpbmVkLCBbdHMuY3JlYXRlVG9rZW4odHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKV0sIGZpZWxkLm5hbWUsIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHVuZGVmaW5lZCwgZXhwck5vZGUpO1xuXG4gICAgICAgIGlmICh0aGlzLmlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZCkge1xuICAgICAgICAgIC8vIENsb3N1cmUgY29tcGlsZXIgdHJhbnNmb3JtcyB0aGUgZm9ybSBgU2VydmljZS7JtXByb3YgPSBYYCBpbnRvIGBTZXJ2aWNlJMm1cHJvdiA9IFhgLiBUb1xuICAgICAgICAgIC8vIHByZXZlbnQgdGhpcyB0cmFuc2Zvcm1hdGlvbiwgc3VjaCBhc3NpZ25tZW50cyBuZWVkIHRvIGJlIGFubm90YXRlZCB3aXRoIEBub2NvbGxhcHNlLlxuICAgICAgICAgIC8vIE5vdGUgdGhhdCB0c2lja2xlIGlzIHR5cGljYWxseSByZXNwb25zaWJsZSBmb3IgYWRkaW5nIHN1Y2ggYW5ub3RhdGlvbnMsIGhvd2V2ZXIgaXRcbiAgICAgICAgICAvLyBkb2Vzbid0IHlldCBoYW5kbGUgc3ludGhldGljIGZpZWxkcyBhZGRlZCBkdXJpbmcgb3RoZXIgdHJhbnNmb3JtYXRpb25zLlxuICAgICAgICAgIHRzLmFkZFN5bnRoZXRpY0xlYWRpbmdDb21tZW50KFxuICAgICAgICAgICAgICBwcm9wZXJ0eSwgdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCAnKiBAbm9jb2xsYXBzZSAnLFxuICAgICAgICAgICAgICAvKiBoYXNUcmFpbGluZ05ld0xpbmUgKi8gZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgZmllbGQuc3RhdGVtZW50c1xuICAgICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgICBzdG10ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChcbiAgICAgICAgICAgICAgICAgICAgc3RtdCwgdGhpcy5pbXBvcnRNYW5hZ2VyLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSkpXG4gICAgICAgICAgICAuZm9yRWFjaChzdG10ID0+IHN0YXRlbWVudHMucHVzaChzdG10KSk7XG5cbiAgICAgICAgbWVtYmVycy5wdXNoKHByb3BlcnR5KTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBSZXBsYWNlIHRoZSBjbGFzcyBkZWNsYXJhdGlvbiB3aXRoIGFuIHVwZGF0ZWQgdmVyc2lvbi5cbiAgICAgIG5vZGUgPSB0cy51cGRhdGVDbGFzc0RlY2xhcmF0aW9uKFxuICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZSBkZWNvcmF0b3Igd2hpY2ggdHJpZ2dlcmVkIHRoaXMgY29tcGlsYXRpb24sIGxlYXZpbmcgdGhlIG90aGVycyBhbG9uZS5cbiAgICAgICAgICBtYXliZUZpbHRlckRlY29yYXRvcihub2RlLmRlY29yYXRvcnMsIHRoaXMuY29tcGlsYXRpb24uZGVjb3JhdG9yc0Zvcihub2RlKSksXG4gICAgICAgICAgbm9kZS5tb2RpZmllcnMsIG5vZGUubmFtZSwgbm9kZS50eXBlUGFyYW1ldGVycywgbm9kZS5oZXJpdGFnZUNsYXVzZXMgfHwgW10sXG4gICAgICAgICAgLy8gTWFwIG92ZXIgdGhlIGNsYXNzIG1lbWJlcnMgYW5kIHJlbW92ZSBhbnkgQW5ndWxhciBkZWNvcmF0b3JzIGZyb20gdGhlbS5cbiAgICAgICAgICBtZW1iZXJzLm1hcChtZW1iZXIgPT4gdGhpcy5fc3RyaXBBbmd1bGFyRGVjb3JhdG9ycyhtZW1iZXIpKSk7XG4gICAgICByZXR1cm4ge25vZGUsIGFmdGVyOiBzdGF0ZW1lbnRzfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge25vZGV9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhbGwgZGVjb3JhdG9ycyBvbiBhIGBEZWNsYXJhdGlvbmAgd2hpY2ggYXJlIGZyb20gQGFuZ3VsYXIvY29yZSwgb3IgYW4gZW1wdHkgc2V0IGlmIG5vbmVcbiAgICogYXJlLlxuICAgKi9cbiAgcHJpdmF0ZSBfYW5ndWxhckNvcmVEZWNvcmF0b3JzKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogU2V0PHRzLkRlY29yYXRvcj4ge1xuICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLnJlZmxlY3Rvci5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsKTtcbiAgICBpZiAoZGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIE5PX0RFQ09SQVRPUlM7XG4gICAgfVxuICAgIGNvbnN0IGNvcmVEZWNvcmF0b3JzID0gZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IHRoaXMuaXNDb3JlIHx8IGlzRnJvbUFuZ3VsYXJDb3JlKGRlYykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChkZWMgPT4gZGVjLm5vZGUgYXMgdHMuRGVjb3JhdG9yKTtcbiAgICBpZiAoY29yZURlY29yYXRvcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIG5ldyBTZXQ8dHMuRGVjb3JhdG9yPihjb3JlRGVjb3JhdG9ycyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBOT19ERUNPUkFUT1JTO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIGB0cy5Ob2RlYCwgZmlsdGVyIHRoZSBkZWNvcmF0b3JzIGFycmF5IGFuZCByZXR1cm4gYSB2ZXJzaW9uIGNvbnRhaW5pbmcgb25seSBub24tQW5ndWxhclxuICAgKiBkZWNvcmF0b3JzLlxuICAgKlxuICAgKiBJZiBhbGwgZGVjb3JhdG9ycyBhcmUgcmVtb3ZlZCAob3Igbm9uZSBleGlzdGVkIGluIHRoZSBmaXJzdCBwbGFjZSksIHRoaXMgbWV0aG9kIHJldHVybnNcbiAgICogYHVuZGVmaW5lZGAuXG4gICAqL1xuICBwcml2YXRlIF9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZTogdHMuRGVjbGFyYXRpb24pOiB0cy5Ob2RlQXJyYXk8dHMuRGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIC8vIFNob3J0Y3V0IGlmIHRoZSBub2RlIGhhcyBubyBkZWNvcmF0b3JzLlxuICAgIGlmIChub2RlLmRlY29yYXRvcnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLy8gQnVpbGQgYSBTZXQgb2YgdGhlIGRlY29yYXRvcnMgb24gdGhpcyBub2RlIGZyb20gQGFuZ3VsYXIvY29yZS5cbiAgICBjb25zdCBjb3JlRGVjb3JhdG9ycyA9IHRoaXMuX2FuZ3VsYXJDb3JlRGVjb3JhdG9ycyhub2RlKTtcblxuICAgIGlmIChjb3JlRGVjb3JhdG9ycy5zaXplID09PSBub2RlLmRlY29yYXRvcnMubGVuZ3RoKSB7XG4gICAgICAvLyBJZiBhbGwgZGVjb3JhdG9ycyBhcmUgdG8gYmUgcmVtb3ZlZCwgcmV0dXJuIGB1bmRlZmluZWRgLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKGNvcmVEZWNvcmF0b3JzLnNpemUgPT09IDApIHtcbiAgICAgIC8vIElmIG5vIGRlY29yYXRvcnMgbmVlZCB0byBiZSByZW1vdmVkLCByZXR1cm4gdGhlIG9yaWdpbmFsIGRlY29yYXRvcnMgYXJyYXkuXG4gICAgICByZXR1cm4gbm9kZS5kZWNvcmF0b3JzO1xuICAgIH1cblxuICAgIC8vIEZpbHRlciBvdXQgdGhlIGNvcmUgZGVjb3JhdG9ycy5cbiAgICBjb25zdCBmaWx0ZXJlZCA9IG5vZGUuZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+ICFjb3JlRGVjb3JhdG9ycy5oYXMoZGVjKSk7XG5cbiAgICAvLyBJZiBubyBkZWNvcmF0b3JzIHN1cnZpdmUsIHJldHVybiBgdW5kZWZpbmVkYC4gVGhpcyBjYW4gb25seSBoYXBwZW4gaWYgYSBjb3JlIGRlY29yYXRvciBpc1xuICAgIC8vIHJlcGVhdGVkIG9uIHRoZSBub2RlLlxuICAgIGlmIChmaWx0ZXJlZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgbmV3IGBOb2RlQXJyYXlgIHdpdGggdGhlIGZpbHRlcmVkIGRlY29yYXRvcnMgdGhhdCBzb3VyY2VtYXBzIGJhY2sgdG8gdGhlIG9yaWdpbmFsLlxuICAgIGNvbnN0IGFycmF5ID0gdHMuY3JlYXRlTm9kZUFycmF5KGZpbHRlcmVkKTtcbiAgICBhcnJheS5wb3MgPSBub2RlLmRlY29yYXRvcnMucG9zO1xuICAgIGFycmF5LmVuZCA9IG5vZGUuZGVjb3JhdG9ycy5lbmQ7XG4gICAgcmV0dXJuIGFycmF5O1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBBbmd1bGFyIGRlY29yYXRvcnMgZnJvbSBhIGB0cy5Ob2RlYCBpbiBhIHNoYWxsb3cgbWFubmVyLlxuICAgKlxuICAgKiBUaGlzIHdpbGwgcmVtb3ZlIGRlY29yYXRvcnMgZnJvbSBjbGFzcyBlbGVtZW50cyAoZ2V0dGVycywgc2V0dGVycywgcHJvcGVydGllcywgbWV0aG9kcykgYXMgd2VsbFxuICAgKiBhcyBwYXJhbWV0ZXJzIG9mIGNvbnN0cnVjdG9ycy5cbiAgICovXG4gIHByaXZhdGUgX3N0cmlwQW5ndWxhckRlY29yYXRvcnM8VCBleHRlbmRzIHRzLk5vZGU+KG5vZGU6IFQpOiBUIHtcbiAgICBpZiAodHMuaXNQYXJhbWV0ZXIobm9kZSkpIHtcbiAgICAgIC8vIFN0cmlwIGRlY29yYXRvcnMgZnJvbSBwYXJhbWV0ZXJzIChwcm9iYWJseSBvZiB0aGUgY29uc3RydWN0b3IpLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgbm9kZSwgdGhpcy5fbm9uQ29yZURlY29yYXRvcnNPbmx5KG5vZGUpLCBub2RlLm1vZGlmaWVycywgbm9kZS5kb3REb3REb3RUb2tlbixcbiAgICAgICAgICAgICAgICAgbm9kZS5uYW1lLCBub2RlLnF1ZXN0aW9uVG9rZW4sIG5vZGUudHlwZSwgbm9kZS5pbml0aWFsaXplcikgYXMgVCAmXG4gICAgICAgICAgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpICYmIG5vZGUuZGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIG1ldGhvZHMuXG4gICAgICBub2RlID0gdHMudXBkYXRlTWV0aG9kKFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLmFzdGVyaXNrVG9rZW4sXG4gICAgICAgICAgICAgICAgIG5vZGUubmFtZSwgbm9kZS5xdWVzdGlvblRva2VuLCBub2RlLnR5cGVQYXJhbWV0ZXJzLCBub2RlLnBhcmFtZXRlcnMsIG5vZGUudHlwZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5ib2R5KSBhcyBUICZcbiAgICAgICAgICB0cy5NZXRob2REZWNsYXJhdGlvbjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlEZWNsYXJhdGlvbihub2RlKSAmJiBub2RlLmRlY29yYXRvcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gU3RyaXAgZGVjb3JhdG9ycyBvZiBwcm9wZXJ0aWVzLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZVByb3BlcnR5KFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgIG5vZGUucXVlc3Rpb25Ub2tlbiwgbm9kZS50eXBlLCBub2RlLmluaXRpYWxpemVyKSBhcyBUICZcbiAgICAgICAgICB0cy5Qcm9wZXJ0eURlY2xhcmF0aW9uO1xuICAgIH0gZWxzZSBpZiAodHMuaXNHZXRBY2Nlc3Nvcihub2RlKSkge1xuICAgICAgLy8gU3RyaXAgZGVjb3JhdG9ycyBvZiBnZXR0ZXJzLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZUdldEFjY2Vzc29yKFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgIG5vZGUucGFyYW1ldGVycywgbm9kZS50eXBlLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLkdldEFjY2Vzc29yRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc1NldEFjY2Vzc29yKG5vZGUpKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIHNldHRlcnMuXG4gICAgICBub2RlID0gdHMudXBkYXRlU2V0QWNjZXNzb3IoXG4gICAgICAgICAgICAgICAgIG5vZGUsIHRoaXMuX25vbkNvcmVEZWNvcmF0b3JzT25seShub2RlKSwgbm9kZS5tb2RpZmllcnMsIG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5wYXJhbWV0ZXJzLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLlNldEFjY2Vzc29yRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIC8vIEZvciBjb25zdHJ1Y3RvcnMsIHN0cmlwIGRlY29yYXRvcnMgb2YgdGhlIHBhcmFtZXRlcnMuXG4gICAgICBjb25zdCBwYXJhbWV0ZXJzID0gbm9kZS5wYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB0aGlzLl9zdHJpcEFuZ3VsYXJEZWNvcmF0b3JzKHBhcmFtKSk7XG4gICAgICBub2RlID1cbiAgICAgICAgICB0cy51cGRhdGVDb25zdHJ1Y3Rvcihub2RlLCBub2RlLmRlY29yYXRvcnMsIG5vZGUubW9kaWZpZXJzLCBwYXJhbWV0ZXJzLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb247XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xuICB9XG59XG5cbi8qKlxuICogQSB0cmFuc2Zvcm1lciB3aGljaCBvcGVyYXRlcyBvbiB0cy5Tb3VyY2VGaWxlcyBhbmQgYXBwbGllcyBjaGFuZ2VzIGZyb20gYW4gYEl2eUNvbXBpbGF0aW9uYC5cbiAqL1xuZnVuY3Rpb24gdHJhbnNmb3JtSXZ5U291cmNlRmlsZShcbiAgICBjb21waWxhdGlvbjogVHJhaXRDb21waWxlciwgY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0LCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlciwgZmlsZTogdHMuU291cmNlRmlsZSwgaXNDb3JlOiBib29sZWFuLFxuICAgIGlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZDogYm9vbGVhbixcbiAgICBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcik6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCBjb25zdGFudFBvb2wgPSBuZXcgQ29uc3RhbnRQb29sKCk7XG4gIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihpbXBvcnRSZXdyaXRlcik7XG5cbiAgLy8gUmVjdXJzaXZlbHkgc2NhbiB0aHJvdWdoIHRoZSBBU1QgYW5kIHBlcmZvcm0gYW55IHVwZGF0ZXMgcmVxdWVzdGVkIGJ5IHRoZSBJdnlDb21waWxhdGlvbi5cbiAgY29uc3QgdmlzaXRvciA9IG5ldyBJdnlWaXNpdG9yKFxuICAgICAgY29tcGlsYXRpb24sIHJlZmxlY3RvciwgaW1wb3J0TWFuYWdlciwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQsXG4gICAgICBpc0NvcmUsIGNvbnN0YW50UG9vbCk7XG4gIGxldCBzZiA9IHZpc2l0KGZpbGUsIHZpc2l0b3IsIGNvbnRleHQpO1xuXG4gIC8vIEdlbmVyYXRlIHRoZSBjb25zdGFudCBzdGF0ZW1lbnRzIGZpcnN0LCBhcyB0aGV5IG1heSBpbnZvbHZlIGFkZGluZyBhZGRpdGlvbmFsIGltcG9ydHNcbiAgLy8gdG8gdGhlIEltcG9ydE1hbmFnZXIuXG4gIGNvbnN0IGNvbnN0YW50cyA9IGNvbnN0YW50UG9vbC5zdGF0ZW1lbnRzLm1hcChcbiAgICAgIHN0bXQgPT4gdHJhbnNsYXRlU3RhdGVtZW50KFxuICAgICAgICAgIHN0bXQsIGltcG9ydE1hbmFnZXIsIGRlZmF1bHRJbXBvcnRSZWNvcmRlciwgZ2V0TG9jYWxpemVDb21waWxlVGFyZ2V0KGNvbnRleHQpKSk7XG5cbiAgLy8gUHJlc2VydmUgQGZpbGVvdmVydmlldyBjb21tZW50cyByZXF1aXJlZCBieSBDbG9zdXJlLCBzaW5jZSB0aGUgbG9jYXRpb24gbWlnaHQgY2hhbmdlIGFzIGFcbiAgLy8gcmVzdWx0IG9mIGFkZGluZyBleHRyYSBpbXBvcnRzIGFuZCBjb25zdGFudCBwb29sIHN0YXRlbWVudHMuXG4gIGNvbnN0IGZpbGVPdmVydmlld01ldGEgPSBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQgPyBnZXRGaWxlT3ZlcnZpZXdDb21tZW50KHNmLnN0YXRlbWVudHMpIDogbnVsbDtcblxuICAvLyBBZGQgbmV3IGltcG9ydHMgZm9yIHRoaXMgZmlsZS5cbiAgc2YgPSBhZGRJbXBvcnRzKGltcG9ydE1hbmFnZXIsIHNmLCBjb25zdGFudHMpO1xuXG4gIGlmIChmaWxlT3ZlcnZpZXdNZXRhICE9PSBudWxsKSB7XG4gICAgc2V0RmlsZU92ZXJ2aWV3Q29tbWVudChzZiwgZmlsZU92ZXJ2aWV3TWV0YSk7XG4gIH1cblxuICByZXR1cm4gc2Y7XG59XG5cbi8qKlxuICogQ29tcHV0ZSB0aGUgY29ycmVjdCB0YXJnZXQgb3V0cHV0IGZvciBgJGxvY2FsaXplYCBtZXNzYWdlcyBnZW5lcmF0ZWQgYnkgQW5ndWxhclxuICpcbiAqIEluIHNvbWUgdmVyc2lvbnMgb2YgVHlwZVNjcmlwdCwgdGhlIHRyYW5zZm9ybWF0aW9uIG9mIHN5bnRoZXRpYyBgJGxvY2FsaXplYCB0YWdnZWQgdGVtcGxhdGVcbiAqIGxpdGVyYWxzIGlzIGJyb2tlbi4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzg0ODVcbiAqXG4gKiBIZXJlIHdlIGNvbXB1dGUgd2hhdCB0aGUgZXhwZWN0ZWQgZmluYWwgb3V0cHV0IHRhcmdldCBvZiB0aGUgY29tcGlsYXRpb24gd2lsbFxuICogYmUgc28gdGhhdCB3ZSBjYW4gZ2VuZXJhdGUgRVM1IGNvbXBsaWFudCBgJGxvY2FsaXplYCBjYWxscyBpbnN0ZWFkIG9mIHJlbHlpbmcgdXBvbiBUUyB0byBkbyB0aGVcbiAqIGRvd25sZXZlbGluZyBmb3IgdXMuXG4gKi9cbmZ1bmN0aW9uIGdldExvY2FsaXplQ29tcGlsZVRhcmdldChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpOlxuICAgIEV4Y2x1ZGU8dHMuU2NyaXB0VGFyZ2V0LCB0cy5TY3JpcHRUYXJnZXQuSlNPTj4ge1xuICBjb25zdCB0YXJnZXQgPSBjb250ZXh0LmdldENvbXBpbGVyT3B0aW9ucygpLnRhcmdldCB8fCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1O1xuICByZXR1cm4gdGFyZ2V0ICE9PSB0cy5TY3JpcHRUYXJnZXQuSlNPTiA/IHRhcmdldCA6IHRzLlNjcmlwdFRhcmdldC5FUzIwMTU7XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVPdmVydmlld0NvbW1lbnQoc3RhdGVtZW50czogdHMuTm9kZUFycmF5PHRzLlN0YXRlbWVudD4pOiBGaWxlT3ZlcnZpZXdNZXRhfG51bGwge1xuICBpZiAoc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgaG9zdCA9IHN0YXRlbWVudHNbMF07XG4gICAgbGV0IHRyYWlsaW5nID0gZmFsc2U7XG4gICAgbGV0IGNvbW1lbnRzID0gdHMuZ2V0U3ludGhldGljTGVhZGluZ0NvbW1lbnRzKGhvc3QpO1xuICAgIC8vIElmIEBmaWxlb3ZlcnZpZXcgdGFnIGlzIG5vdCBmb3VuZCBpbiBzb3VyY2UgZmlsZSwgdHNpY2tsZSBwcm9kdWNlcyBmYWtlIG5vZGUgd2l0aCB0cmFpbGluZ1xuICAgIC8vIGNvbW1lbnQgYW5kIGluamVjdCBpdCBhdCB0aGUgdmVyeSBiZWdpbm5pbmcgb2YgdGhlIGdlbmVyYXRlZCBmaWxlLiBTbyB3ZSBuZWVkIHRvIGNoZWNrIGZvclxuICAgIC8vIGxlYWRpbmcgYXMgd2VsbCBhcyB0cmFpbGluZyBjb21tZW50cy5cbiAgICBpZiAoIWNvbW1lbnRzIHx8IGNvbW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuICAgICAgY29tbWVudHMgPSB0cy5nZXRTeW50aGV0aWNUcmFpbGluZ0NvbW1lbnRzKGhvc3QpO1xuICAgIH1cbiAgICBpZiAoY29tbWVudHMgJiYgY29tbWVudHMubGVuZ3RoID4gMCAmJiBDTE9TVVJFX0ZJTEVfT1ZFUlZJRVdfUkVHRVhQLnRlc3QoY29tbWVudHNbMF0udGV4dCkpIHtcbiAgICAgIHJldHVybiB7Y29tbWVudHMsIGhvc3QsIHRyYWlsaW5nfTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHNldEZpbGVPdmVydmlld0NvbW1lbnQoc2Y6IHRzLlNvdXJjZUZpbGUsIGZpbGVvdmVydmlldzogRmlsZU92ZXJ2aWV3TWV0YSk6IHZvaWQge1xuICBjb25zdCB7Y29tbWVudHMsIGhvc3QsIHRyYWlsaW5nfSA9IGZpbGVvdmVydmlldztcbiAgLy8gSWYgaG9zdCBzdGF0ZW1lbnQgaXMgbm8gbG9uZ2VyIHRoZSBmaXJzdCBvbmUsIGl0IG1lYW5zIHRoYXQgZXh0cmEgc3RhdGVtZW50cyB3ZXJlIGFkZGVkIGF0IHRoZVxuICAvLyB2ZXJ5IGJlZ2lubmluZywgc28gd2UgbmVlZCB0byByZWxvY2F0ZSBAZmlsZW92ZXJ2aWV3IGNvbW1lbnQgYW5kIGNsZWFudXAgdGhlIG9yaWdpbmFsIHN0YXRlbWVudFxuICAvLyB0aGF0IGhvc3RlZCBpdC5cbiAgaWYgKHNmLnN0YXRlbWVudHMubGVuZ3RoID4gMCAmJiBob3N0ICE9PSBzZi5zdGF0ZW1lbnRzWzBdKSB7XG4gICAgaWYgKHRyYWlsaW5nKSB7XG4gICAgICB0cy5zZXRTeW50aGV0aWNUcmFpbGluZ0NvbW1lbnRzKGhvc3QsIHVuZGVmaW5lZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRzLnNldFN5bnRoZXRpY0xlYWRpbmdDb21tZW50cyhob3N0LCB1bmRlZmluZWQpO1xuICAgIH1cbiAgICB0cy5zZXRTeW50aGV0aWNMZWFkaW5nQ29tbWVudHMoc2Yuc3RhdGVtZW50c1swXSwgY29tbWVudHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1heWJlRmlsdGVyRGVjb3JhdG9yKFxuICAgIGRlY29yYXRvcnM6IHRzLk5vZGVBcnJheTx0cy5EZWNvcmF0b3I+fHVuZGVmaW5lZCxcbiAgICB0b1JlbW92ZTogdHMuRGVjb3JhdG9yW10pOiB0cy5Ob2RlQXJyYXk8dHMuRGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICBpZiAoZGVjb3JhdG9ycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBmaWx0ZXJlZCA9IGRlY29yYXRvcnMuZmlsdGVyKFxuICAgICAgZGVjID0+IHRvUmVtb3ZlLmZpbmQoZGVjVG9SZW1vdmUgPT4gdHMuZ2V0T3JpZ2luYWxOb2RlKGRlYykgPT09IGRlY1RvUmVtb3ZlKSA9PT0gdW5kZWZpbmVkKTtcbiAgaWYgKGZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHRzLmNyZWF0ZU5vZGVBcnJheShmaWx0ZXJlZCk7XG59XG5cbmZ1bmN0aW9uIGlzRnJvbUFuZ3VsYXJDb3JlKGRlY29yYXRvcjogRGVjb3JhdG9yKTogYm9vbGVhbiB7XG4gIHJldHVybiBkZWNvcmF0b3IuaW1wb3J0ICE9PSBudWxsICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xufVxuIl19