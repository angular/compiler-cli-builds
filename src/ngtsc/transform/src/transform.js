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
        function IvyVisitor(compilation, reflector, importManager, defaultImportRecorder, isCore, constantPool) {
            var _this = _super.call(this) || this;
            _this.compilation = compilation;
            _this.reflector = reflector;
            _this.importManager = importManager;
            _this.defaultImportRecorder = defaultImportRecorder;
            _this.isCore = isCore;
            _this.constantPool = constantPool;
            return _this;
        }
        IvyVisitor.prototype.visitClassDeclaration = function (node) {
            var _this = this;
            // Determine if this class has an Ivy field that needs to be added, and compile the field
            // to an expression if so.
            var res = this.compilation.compileIvyFieldFor(node, this.constantPool);
            if (res !== undefined) {
                // There is at least one field to add.
                var statements_1 = [];
                var members_1 = tslib_1.__spread(node.members);
                res.forEach(function (field) {
                    // Translate the initializer for the field into TS nodes.
                    var exprNode = translator_1.translateExpression(field.initializer, _this.importManager, _this.defaultImportRecorder, ts.ScriptTarget.ES2015);
                    // Create a static property declaration for the new field.
                    var property = ts.createProperty(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], field.name, undefined, undefined, exprNode);
                    field.statements
                        .map(function (stmt) { return translator_1.translateStatement(stmt, _this.importManager, _this.defaultImportRecorder, ts.ScriptTarget.ES2015); })
                        .forEach(function (stmt) { return statements_1.push(stmt); });
                    members_1.push(property);
                });
                // Replace the class declaration with an updated version.
                node = ts.updateClassDeclaration(node, 
                // Remove the decorator which triggered this compilation, leaving the others alone.
                maybeFilterDecorator(node.decorators, this.compilation.ivyDecoratorsFor(node)), node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], 
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
        var visitor = new IvyVisitor(compilation, reflector, importManager, defaultImportRecorder, isCore, constantPool);
        var sf = visitor_1.visit(file, visitor, context);
        // Generate the constant statements first, as they may involve adding additional imports
        // to the ImportManager.
        var constants = constantPool.statements.map(function (stmt) {
            return translator_1.translateStatement(stmt, importManager, defaultImportRecorder, ts.ScriptTarget.ES2015);
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0vc3JjL3RyYW5zZm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0M7SUFDL0MsK0JBQWlDO0lBSWpDLHlFQUF3RjtJQUN4Riw0RUFBNEU7SUFHNUUsNkVBQW1DO0lBRW5DLElBQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUFnQixDQUFDO0lBRTlDLElBQU0sNEJBQTRCLEdBQUcsc0JBQXNCLENBQUM7SUFXNUQsU0FBZ0IsbUJBQW1CLENBQy9CLFdBQTJCLEVBQUUsU0FBeUIsRUFBRSxjQUE4QixFQUN0RixxQkFBNEMsRUFBRSxNQUFlLEVBQzdELHdCQUFpQztRQUNuQyxPQUFPLFVBQUMsT0FBaUM7WUFDdkMsT0FBTyxVQUFDLElBQW1CO2dCQUN6QixPQUFPLHNCQUFzQixDQUN6QixXQUFXLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsRUFDdkYscUJBQXFCLENBQUMsQ0FBQztZQUM3QixDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7SUFDSixDQUFDO0lBWEQsa0RBV0M7SUFFRDtRQUF5QixzQ0FBTztRQUM5QixvQkFDWSxXQUEyQixFQUFVLFNBQXlCLEVBQzlELGFBQTRCLEVBQVUscUJBQTRDLEVBQ2xGLE1BQWUsRUFBVSxZQUEwQjtZQUgvRCxZQUlFLGlCQUFPLFNBQ1I7WUFKVyxpQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFBVSxlQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUM5RCxtQkFBYSxHQUFiLGFBQWEsQ0FBZTtZQUFVLDJCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7WUFDbEYsWUFBTSxHQUFOLE1BQU0sQ0FBUztZQUFVLGtC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Iiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVmYXVsdEltcG9ydFJlY29yZGVyLCBJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0RlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVFeHByZXNzaW9uLCB0cmFuc2xhdGVTdGF0ZW1lbnR9IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtWaXNpdExpc3RFbnRyeVJlc3VsdCwgVmlzaXRvciwgdmlzaXR9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3Zpc2l0b3InO1xuXG5pbXBvcnQge0l2eUNvbXBpbGF0aW9ufSBmcm9tICcuL2NvbXBpbGF0aW9uJztcbmltcG9ydCB7YWRkSW1wb3J0c30gZnJvbSAnLi91dGlscyc7XG5cbmNvbnN0IE5PX0RFQ09SQVRPUlMgPSBuZXcgU2V0PHRzLkRlY29yYXRvcj4oKTtcblxuY29uc3QgQ0xPU1VSRV9GSUxFX09WRVJWSUVXX1JFR0VYUCA9IC9cXHMrQGZpbGVvdmVydmlld1xccysvaTtcblxuLyoqXG4gKiBNZXRhZGF0YSB0byBzdXBwb3J0IEBmaWxlb3ZlcnZpZXcgYmxvY2tzIChDbG9zdXJlIGFubm90YXRpb25zKSBleHRyYWN0aW5nL3Jlc3RvcmluZy5cbiAqL1xuaW50ZXJmYWNlIEZpbGVPdmVydmlld01ldGEge1xuICBjb21tZW50czogdHMuU3ludGhlc2l6ZWRDb21tZW50W107XG4gIGhvc3Q6IHRzLlN0YXRlbWVudDtcbiAgdHJhaWxpbmc6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpdnlUcmFuc2Zvcm1GYWN0b3J5KFxuICAgIGNvbXBpbGF0aW9uOiBJdnlDb21waWxhdGlvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyLFxuICAgIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmU6IGJvb2xlYW4sXG4gICAgaXNDbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuKTogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpOiB0cy5UcmFuc2Zvcm1lcjx0cy5Tb3VyY2VGaWxlPiA9PiB7XG4gICAgcmV0dXJuIChmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSA9PiB7XG4gICAgICByZXR1cm4gdHJhbnNmb3JtSXZ5U291cmNlRmlsZShcbiAgICAgICAgICBjb21waWxhdGlvbiwgY29udGV4dCwgcmVmbGVjdG9yLCBpbXBvcnRSZXdyaXRlciwgZmlsZSwgaXNDb3JlLCBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQsXG4gICAgICAgICAgZGVmYXVsdEltcG9ydFJlY29yZGVyKTtcbiAgICB9O1xuICB9O1xufVxuXG5jbGFzcyBJdnlWaXNpdG9yIGV4dGVuZHMgVmlzaXRvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjb21waWxhdGlvbjogSXZ5Q29tcGlsYXRpb24sIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlciwgcHJpdmF0ZSBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICAgIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLCBwcml2YXRlIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIHZpc2l0Q2xhc3NEZWNsYXJhdGlvbihub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTpcbiAgICAgIFZpc2l0TGlzdEVudHJ5UmVzdWx0PHRzLlN0YXRlbWVudCwgdHMuQ2xhc3NEZWNsYXJhdGlvbj4ge1xuICAgIC8vIERldGVybWluZSBpZiB0aGlzIGNsYXNzIGhhcyBhbiBJdnkgZmllbGQgdGhhdCBuZWVkcyB0byBiZSBhZGRlZCwgYW5kIGNvbXBpbGUgdGhlIGZpZWxkXG4gICAgLy8gdG8gYW4gZXhwcmVzc2lvbiBpZiBzby5cbiAgICBjb25zdCByZXMgPSB0aGlzLmNvbXBpbGF0aW9uLmNvbXBpbGVJdnlGaWVsZEZvcihub2RlLCB0aGlzLmNvbnN0YW50UG9vbCk7XG5cbiAgICBpZiAocmVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFRoZXJlIGlzIGF0IGxlYXN0IG9uZSBmaWVsZCB0byBhZGQuXG4gICAgICBjb25zdCBzdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuICAgICAgY29uc3QgbWVtYmVycyA9IFsuLi5ub2RlLm1lbWJlcnNdO1xuXG4gICAgICByZXMuZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgIC8vIFRyYW5zbGF0ZSB0aGUgaW5pdGlhbGl6ZXIgZm9yIHRoZSBmaWVsZCBpbnRvIFRTIG5vZGVzLlxuICAgICAgICBjb25zdCBleHByTm9kZSA9IHRyYW5zbGF0ZUV4cHJlc3Npb24oXG4gICAgICAgICAgICBmaWVsZC5pbml0aWFsaXplciwgdGhpcy5pbXBvcnRNYW5hZ2VyLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICAgICAgICAgIHRzLlNjcmlwdFRhcmdldC5FUzIwMTUpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBhIHN0YXRpYyBwcm9wZXJ0eSBkZWNsYXJhdGlvbiBmb3IgdGhlIG5ldyBmaWVsZC5cbiAgICAgICAgY29uc3QgcHJvcGVydHkgPSB0cy5jcmVhdGVQcm9wZXJ0eShcbiAgICAgICAgICAgIHVuZGVmaW5lZCwgW3RzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCldLCBmaWVsZC5uYW1lLCB1bmRlZmluZWQsXG4gICAgICAgICAgICB1bmRlZmluZWQsIGV4cHJOb2RlKTtcblxuICAgICAgICBmaWVsZC5zdGF0ZW1lbnRzXG4gICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgIHN0bXQgPT4gdHJhbnNsYXRlU3RhdGVtZW50KFxuICAgICAgICAgICAgICAgICAgICBzdG10LCB0aGlzLmltcG9ydE1hbmFnZXIsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1KSlcbiAgICAgICAgICAgIC5mb3JFYWNoKHN0bXQgPT4gc3RhdGVtZW50cy5wdXNoKHN0bXQpKTtcblxuICAgICAgICBtZW1iZXJzLnB1c2gocHJvcGVydHkpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFJlcGxhY2UgdGhlIGNsYXNzIGRlY2xhcmF0aW9uIHdpdGggYW4gdXBkYXRlZCB2ZXJzaW9uLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIGRlY29yYXRvciB3aGljaCB0cmlnZ2VyZWQgdGhpcyBjb21waWxhdGlvbiwgbGVhdmluZyB0aGUgb3RoZXJzIGFsb25lLlxuICAgICAgICAgIG1heWJlRmlsdGVyRGVjb3JhdG9yKG5vZGUuZGVjb3JhdG9ycywgdGhpcy5jb21waWxhdGlvbi5pdnlEZWNvcmF0b3JzRm9yKG5vZGUpKSxcbiAgICAgICAgICBub2RlLm1vZGlmaWVycywgbm9kZS5uYW1lLCBub2RlLnR5cGVQYXJhbWV0ZXJzLCBub2RlLmhlcml0YWdlQ2xhdXNlcyB8fCBbXSxcbiAgICAgICAgICAvLyBNYXAgb3ZlciB0aGUgY2xhc3MgbWVtYmVycyBhbmQgcmVtb3ZlIGFueSBBbmd1bGFyIGRlY29yYXRvcnMgZnJvbSB0aGVtLlxuICAgICAgICAgIG1lbWJlcnMubWFwKG1lbWJlciA9PiB0aGlzLl9zdHJpcEFuZ3VsYXJEZWNvcmF0b3JzKG1lbWJlcikpKTtcbiAgICAgIHJldHVybiB7bm9kZSwgYWZ0ZXI6IHN0YXRlbWVudHN9O1xuICAgIH1cblxuICAgIHJldHVybiB7bm9kZX07XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGFsbCBkZWNvcmF0b3JzIG9uIGEgYERlY2xhcmF0aW9uYCB3aGljaCBhcmUgZnJvbSBAYW5ndWxhci9jb3JlLCBvciBhbiBlbXB0eSBzZXQgaWYgbm9uZVxuICAgKiBhcmUuXG4gICAqL1xuICBwcml2YXRlIF9hbmd1bGFyQ29yZURlY29yYXRvcnMoZGVjbDogdHMuRGVjbGFyYXRpb24pOiBTZXQ8dHMuRGVjb3JhdG9yPiB7XG4gICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdG9yLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2wpO1xuICAgIGlmIChkZWNvcmF0b3JzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gTk9fREVDT1JBVE9SUztcbiAgICB9XG4gICAgY29uc3QgY29yZURlY29yYXRvcnMgPSBkZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gdGhpcy5pc0NvcmUgfHwgaXNGcm9tQW5ndWxhckNvcmUoZGVjKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGRlYyA9PiBkZWMubm9kZSBhcyB0cy5EZWNvcmF0b3IpO1xuICAgIGlmIChjb3JlRGVjb3JhdG9ycy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gbmV3IFNldDx0cy5EZWNvcmF0b3I+KGNvcmVEZWNvcmF0b3JzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIE5PX0RFQ09SQVRPUlM7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGEgYHRzLk5vZGVgLCBmaWx0ZXIgdGhlIGRlY29yYXRvcnMgYXJyYXkgYW5kIHJldHVybiBhIHZlcnNpb24gY29udGFpbmluZyBvbmx5IG5vbi1Bbmd1bGFyXG4gICAqIGRlY29yYXRvcnMuXG4gICAqXG4gICAqIElmIGFsbCBkZWNvcmF0b3JzIGFyZSByZW1vdmVkIChvciBub25lIGV4aXN0ZWQgaW4gdGhlIGZpcnN0IHBsYWNlKSwgdGhpcyBtZXRob2QgcmV0dXJuc1xuICAgKiBgdW5kZWZpbmVkYC5cbiAgICovXG4gIHByaXZhdGUgX25vbkNvcmVEZWNvcmF0b3JzT25seShub2RlOiB0cy5EZWNsYXJhdGlvbik6IHRzLk5vZGVBcnJheTx0cy5EZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gICAgLy8gU2hvcnRjdXQgaWYgdGhlIG5vZGUgaGFzIG5vIGRlY29yYXRvcnMuXG4gICAgaWYgKG5vZGUuZGVjb3JhdG9ycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICAvLyBCdWlsZCBhIFNldCBvZiB0aGUgZGVjb3JhdG9ycyBvbiB0aGlzIG5vZGUgZnJvbSBAYW5ndWxhci9jb3JlLlxuICAgIGNvbnN0IGNvcmVEZWNvcmF0b3JzID0gdGhpcy5fYW5ndWxhckNvcmVEZWNvcmF0b3JzKG5vZGUpO1xuXG4gICAgaWYgKGNvcmVEZWNvcmF0b3JzLnNpemUgPT09IG5vZGUuZGVjb3JhdG9ycy5sZW5ndGgpIHtcbiAgICAgIC8vIElmIGFsbCBkZWNvcmF0b3JzIGFyZSB0byBiZSByZW1vdmVkLCByZXR1cm4gYHVuZGVmaW5lZGAuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSBpZiAoY29yZURlY29yYXRvcnMuc2l6ZSA9PT0gMCkge1xuICAgICAgLy8gSWYgbm8gZGVjb3JhdG9ycyBuZWVkIHRvIGJlIHJlbW92ZWQsIHJldHVybiB0aGUgb3JpZ2luYWwgZGVjb3JhdG9ycyBhcnJheS5cbiAgICAgIHJldHVybiBub2RlLmRlY29yYXRvcnM7XG4gICAgfVxuXG4gICAgLy8gRmlsdGVyIG91dCB0aGUgY29yZSBkZWNvcmF0b3JzLlxuICAgIGNvbnN0IGZpbHRlcmVkID0gbm9kZS5kZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gIWNvcmVEZWNvcmF0b3JzLmhhcyhkZWMpKTtcblxuICAgIC8vIElmIG5vIGRlY29yYXRvcnMgc3Vydml2ZSwgcmV0dXJuIGB1bmRlZmluZWRgLiBUaGlzIGNhbiBvbmx5IGhhcHBlbiBpZiBhIGNvcmUgZGVjb3JhdG9yIGlzXG4gICAgLy8gcmVwZWF0ZWQgb24gdGhlIG5vZGUuXG4gICAgaWYgKGZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBuZXcgYE5vZGVBcnJheWAgd2l0aCB0aGUgZmlsdGVyZWQgZGVjb3JhdG9ycyB0aGF0IHNvdXJjZW1hcHMgYmFjayB0byB0aGUgb3JpZ2luYWwuXG4gICAgY29uc3QgYXJyYXkgPSB0cy5jcmVhdGVOb2RlQXJyYXkoZmlsdGVyZWQpO1xuICAgIGFycmF5LnBvcyA9IG5vZGUuZGVjb3JhdG9ycy5wb3M7XG4gICAgYXJyYXkuZW5kID0gbm9kZS5kZWNvcmF0b3JzLmVuZDtcbiAgICByZXR1cm4gYXJyYXk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIEFuZ3VsYXIgZGVjb3JhdG9ycyBmcm9tIGEgYHRzLk5vZGVgIGluIGEgc2hhbGxvdyBtYW5uZXIuXG4gICAqXG4gICAqIFRoaXMgd2lsbCByZW1vdmUgZGVjb3JhdG9ycyBmcm9tIGNsYXNzIGVsZW1lbnRzIChnZXR0ZXJzLCBzZXR0ZXJzLCBwcm9wZXJ0aWVzLCBtZXRob2RzKSBhcyB3ZWxsXG4gICAqIGFzIHBhcmFtZXRlcnMgb2YgY29uc3RydWN0b3JzLlxuICAgKi9cbiAgcHJpdmF0ZSBfc3RyaXBBbmd1bGFyRGVjb3JhdG9yczxUIGV4dGVuZHMgdHMuTm9kZT4obm9kZTogVCk6IFQge1xuICAgIGlmICh0cy5pc1BhcmFtZXRlcihub2RlKSkge1xuICAgICAgLy8gU3RyaXAgZGVjb3JhdG9ycyBmcm9tIHBhcmFtZXRlcnMgKHByb2JhYmx5IG9mIHRoZSBjb25zdHJ1Y3RvcikuXG4gICAgICBub2RlID0gdHMudXBkYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLmRvdERvdERvdFRva2VuLFxuICAgICAgICAgICAgICAgICBub2RlLm5hbWUsIG5vZGUucXVlc3Rpb25Ub2tlbiwgbm9kZS50eXBlLCBub2RlLmluaXRpYWxpemVyKSBhcyBUICZcbiAgICAgICAgICB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzTWV0aG9kRGVjbGFyYXRpb24obm9kZSkgJiYgbm9kZS5kZWNvcmF0b3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFN0cmlwIGRlY29yYXRvcnMgb2YgbWV0aG9kcy5cbiAgICAgIG5vZGUgPSB0cy51cGRhdGVNZXRob2QoXG4gICAgICAgICAgICAgICAgIG5vZGUsIHRoaXMuX25vbkNvcmVEZWNvcmF0b3JzT25seShub2RlKSwgbm9kZS5tb2RpZmllcnMsIG5vZGUuYXN0ZXJpc2tUb2tlbixcbiAgICAgICAgICAgICAgICAgbm9kZS5uYW1lLCBub2RlLnF1ZXN0aW9uVG9rZW4sIG5vZGUudHlwZVBhcmFtZXRlcnMsIG5vZGUucGFyYW1ldGVycywgbm9kZS50eXBlLFxuICAgICAgICAgICAgICAgICBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLk1ldGhvZERlY2xhcmF0aW9uO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQcm9wZXJ0eURlY2xhcmF0aW9uKG5vZGUpICYmIG5vZGUuZGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIHByb3BlcnRpZXMuXG4gICAgICBub2RlID0gdHMudXBkYXRlUHJvcGVydHkoXG4gICAgICAgICAgICAgICAgIG5vZGUsIHRoaXMuX25vbkNvcmVEZWNvcmF0b3JzT25seShub2RlKSwgbm9kZS5tb2RpZmllcnMsIG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5xdWVzdGlvblRva2VuLCBub2RlLnR5cGUsIG5vZGUuaW5pdGlhbGl6ZXIpIGFzIFQgJlxuICAgICAgICAgIHRzLlByb3BlcnR5RGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc0dldEFjY2Vzc29yKG5vZGUpKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIGdldHRlcnMuXG4gICAgICBub2RlID0gdHMudXBkYXRlR2V0QWNjZXNzb3IoXG4gICAgICAgICAgICAgICAgIG5vZGUsIHRoaXMuX25vbkNvcmVEZWNvcmF0b3JzT25seShub2RlKSwgbm9kZS5tb2RpZmllcnMsIG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5wYXJhbWV0ZXJzLCBub2RlLnR5cGUsIG5vZGUuYm9keSkgYXMgVCAmXG4gICAgICAgICAgdHMuR2V0QWNjZXNzb3JEZWNsYXJhdGlvbjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzU2V0QWNjZXNzb3Iobm9kZSkpIHtcbiAgICAgIC8vIFN0cmlwIGRlY29yYXRvcnMgb2Ygc2V0dGVycy5cbiAgICAgIG5vZGUgPSB0cy51cGRhdGVTZXRBY2Nlc3NvcihcbiAgICAgICAgICAgICAgICAgbm9kZSwgdGhpcy5fbm9uQ29yZURlY29yYXRvcnNPbmx5KG5vZGUpLCBub2RlLm1vZGlmaWVycywgbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICBub2RlLnBhcmFtZXRlcnMsIG5vZGUuYm9keSkgYXMgVCAmXG4gICAgICAgICAgdHMuU2V0QWNjZXNzb3JEZWNsYXJhdGlvbjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ29uc3RydWN0b3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgLy8gRm9yIGNvbnN0cnVjdG9ycywgc3RyaXAgZGVjb3JhdG9ycyBvZiB0aGUgcGFyYW1ldGVycy5cbiAgICAgIGNvbnN0IHBhcmFtZXRlcnMgPSBub2RlLnBhcmFtZXRlcnMubWFwKHBhcmFtID0+IHRoaXMuX3N0cmlwQW5ndWxhckRlY29yYXRvcnMocGFyYW0pKTtcbiAgICAgIG5vZGUgPVxuICAgICAgICAgIHRzLnVwZGF0ZUNvbnN0cnVjdG9yKG5vZGUsIG5vZGUuZGVjb3JhdG9ycywgbm9kZS5tb2RpZmllcnMsIHBhcmFtZXRlcnMsIG5vZGUuYm9keSkgYXMgVCAmXG4gICAgICAgICAgdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHRyYW5zZm9ybWVyIHdoaWNoIG9wZXJhdGVzIG9uIHRzLlNvdXJjZUZpbGVzIGFuZCBhcHBsaWVzIGNoYW5nZXMgZnJvbSBhbiBgSXZ5Q29tcGlsYXRpb25gLlxuICovXG5mdW5jdGlvbiB0cmFuc2Zvcm1JdnlTb3VyY2VGaWxlKFxuICAgIGNvbXBpbGF0aW9uOiBJdnlDb21waWxhdGlvbiwgY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0LCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlciwgZmlsZTogdHMuU291cmNlRmlsZSwgaXNDb3JlOiBib29sZWFuLFxuICAgIGlzQ2xvc3VyZUNvbXBpbGVyRW5hYmxlZDogYm9vbGVhbixcbiAgICBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcik6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCBjb25zdGFudFBvb2wgPSBuZXcgQ29uc3RhbnRQb29sKCk7XG4gIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihpbXBvcnRSZXdyaXRlcik7XG5cbiAgLy8gUmVjdXJzaXZlbHkgc2NhbiB0aHJvdWdoIHRoZSBBU1QgYW5kIHBlcmZvcm0gYW55IHVwZGF0ZXMgcmVxdWVzdGVkIGJ5IHRoZSBJdnlDb21waWxhdGlvbi5cbiAgY29uc3QgdmlzaXRvciA9IG5ldyBJdnlWaXNpdG9yKFxuICAgICAgY29tcGlsYXRpb24sIHJlZmxlY3RvciwgaW1wb3J0TWFuYWdlciwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUsIGNvbnN0YW50UG9vbCk7XG4gIGxldCBzZiA9IHZpc2l0KGZpbGUsIHZpc2l0b3IsIGNvbnRleHQpO1xuXG4gIC8vIEdlbmVyYXRlIHRoZSBjb25zdGFudCBzdGF0ZW1lbnRzIGZpcnN0LCBhcyB0aGV5IG1heSBpbnZvbHZlIGFkZGluZyBhZGRpdGlvbmFsIGltcG9ydHNcbiAgLy8gdG8gdGhlIEltcG9ydE1hbmFnZXIuXG4gIGNvbnN0IGNvbnN0YW50cyA9IGNvbnN0YW50UG9vbC5zdGF0ZW1lbnRzLm1hcChcbiAgICAgIHN0bXQgPT5cbiAgICAgICAgICB0cmFuc2xhdGVTdGF0ZW1lbnQoc3RtdCwgaW1wb3J0TWFuYWdlciwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1KSk7XG5cbiAgLy8gUHJlc2VydmUgQGZpbGVvdmVydmlldyBjb21tZW50cyByZXF1aXJlZCBieSBDbG9zdXJlLCBzaW5jZSB0aGUgbG9jYXRpb24gbWlnaHQgY2hhbmdlIGFzIGFcbiAgLy8gcmVzdWx0IG9mIGFkZGluZyBleHRyYSBpbXBvcnRzIGFuZCBjb25zdGFudCBwb29sIHN0YXRlbWVudHMuXG4gIGNvbnN0IGZpbGVPdmVydmlld01ldGEgPSBpc0Nsb3N1cmVDb21waWxlckVuYWJsZWQgPyBnZXRGaWxlT3ZlcnZpZXdDb21tZW50KHNmLnN0YXRlbWVudHMpIDogbnVsbDtcblxuICAvLyBBZGQgbmV3IGltcG9ydHMgZm9yIHRoaXMgZmlsZS5cbiAgc2YgPSBhZGRJbXBvcnRzKGltcG9ydE1hbmFnZXIsIHNmLCBjb25zdGFudHMpO1xuXG4gIGlmIChmaWxlT3ZlcnZpZXdNZXRhICE9PSBudWxsKSB7XG4gICAgc2V0RmlsZU92ZXJ2aWV3Q29tbWVudChzZiwgZmlsZU92ZXJ2aWV3TWV0YSk7XG4gIH1cblxuICByZXR1cm4gc2Y7XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVPdmVydmlld0NvbW1lbnQoc3RhdGVtZW50czogdHMuTm9kZUFycmF5PHRzLlN0YXRlbWVudD4pOiBGaWxlT3ZlcnZpZXdNZXRhfG51bGwge1xuICBpZiAoc3RhdGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgaG9zdCA9IHN0YXRlbWVudHNbMF07XG4gICAgbGV0IHRyYWlsaW5nID0gZmFsc2U7XG4gICAgbGV0IGNvbW1lbnRzID0gdHMuZ2V0U3ludGhldGljTGVhZGluZ0NvbW1lbnRzKGhvc3QpO1xuICAgIC8vIElmIEBmaWxlb3ZlcnZpZXcgdGFnIGlzIG5vdCBmb3VuZCBpbiBzb3VyY2UgZmlsZSwgdHNpY2tsZSBwcm9kdWNlcyBmYWtlIG5vZGUgd2l0aCB0cmFpbGluZ1xuICAgIC8vIGNvbW1lbnQgYW5kIGluamVjdCBpdCBhdCB0aGUgdmVyeSBiZWdpbm5pbmcgb2YgdGhlIGdlbmVyYXRlZCBmaWxlLiBTbyB3ZSBuZWVkIHRvIGNoZWNrIGZvclxuICAgIC8vIGxlYWRpbmcgYXMgd2VsbCBhcyB0cmFpbGluZyBjb21tZW50cy5cbiAgICBpZiAoIWNvbW1lbnRzIHx8IGNvbW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuICAgICAgY29tbWVudHMgPSB0cy5nZXRTeW50aGV0aWNUcmFpbGluZ0NvbW1lbnRzKGhvc3QpO1xuICAgIH1cbiAgICBpZiAoY29tbWVudHMgJiYgY29tbWVudHMubGVuZ3RoID4gMCAmJiBDTE9TVVJFX0ZJTEVfT1ZFUlZJRVdfUkVHRVhQLnRlc3QoY29tbWVudHNbMF0udGV4dCkpIHtcbiAgICAgIHJldHVybiB7Y29tbWVudHMsIGhvc3QsIHRyYWlsaW5nfTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHNldEZpbGVPdmVydmlld0NvbW1lbnQoc2Y6IHRzLlNvdXJjZUZpbGUsIGZpbGVvdmVydmlldzogRmlsZU92ZXJ2aWV3TWV0YSk6IHZvaWQge1xuICBjb25zdCB7Y29tbWVudHMsIGhvc3QsIHRyYWlsaW5nfSA9IGZpbGVvdmVydmlldztcbiAgLy8gSWYgaG9zdCBzdGF0ZW1lbnQgaXMgbm8gbG9uZ2VyIHRoZSBmaXJzdCBvbmUsIGl0IG1lYW5zIHRoYXQgZXh0cmEgc3RhdGVtZW50cyB3ZXJlIGFkZGVkIGF0IHRoZVxuICAvLyB2ZXJ5IGJlZ2lubmluZywgc28gd2UgbmVlZCB0byByZWxvY2F0ZSBAZmlsZW92ZXJ2aWV3IGNvbW1lbnQgYW5kIGNsZWFudXAgdGhlIG9yaWdpbmFsIHN0YXRlbWVudFxuICAvLyB0aGF0IGhvc3RlZCBpdC5cbiAgaWYgKHNmLnN0YXRlbWVudHMubGVuZ3RoID4gMCAmJiBob3N0ICE9PSBzZi5zdGF0ZW1lbnRzWzBdKSB7XG4gICAgaWYgKHRyYWlsaW5nKSB7XG4gICAgICB0cy5zZXRTeW50aGV0aWNUcmFpbGluZ0NvbW1lbnRzKGhvc3QsIHVuZGVmaW5lZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRzLnNldFN5bnRoZXRpY0xlYWRpbmdDb21tZW50cyhob3N0LCB1bmRlZmluZWQpO1xuICAgIH1cbiAgICB0cy5zZXRTeW50aGV0aWNMZWFkaW5nQ29tbWVudHMoc2Yuc3RhdGVtZW50c1swXSwgY29tbWVudHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1heWJlRmlsdGVyRGVjb3JhdG9yKFxuICAgIGRlY29yYXRvcnM6IHRzLk5vZGVBcnJheTx0cy5EZWNvcmF0b3I+fCB1bmRlZmluZWQsXG4gICAgdG9SZW1vdmU6IHRzLkRlY29yYXRvcltdKTogdHMuTm9kZUFycmF5PHRzLkRlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgaWYgKGRlY29yYXRvcnMgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgZmlsdGVyZWQgPSBkZWNvcmF0b3JzLmZpbHRlcihcbiAgICAgIGRlYyA9PiB0b1JlbW92ZS5maW5kKGRlY1RvUmVtb3ZlID0+IHRzLmdldE9yaWdpbmFsTm9kZShkZWMpID09PSBkZWNUb1JlbW92ZSkgPT09IHVuZGVmaW5lZCk7XG4gIGlmIChmaWx0ZXJlZC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB0cy5jcmVhdGVOb2RlQXJyYXkoZmlsdGVyZWQpO1xufVxuXG5mdW5jdGlvbiBpc0Zyb21Bbmd1bGFyQ29yZShkZWNvcmF0b3I6IERlY29yYXRvcik6IGJvb2xlYW4ge1xuICByZXR1cm4gZGVjb3JhdG9yLmltcG9ydCAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJztcbn1cbiJdfQ==