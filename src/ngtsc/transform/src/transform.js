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
        define("@angular/compiler-cli/src/ngtsc/transform/src/transform", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/visitor", "@angular/compiler-cli/src/ngtsc/transform/src/translator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var visitor_1 = require("@angular/compiler-cli/src/ngtsc/util/src/visitor");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/translator");
    var NO_DECORATORS = new Set();
    function ivyTransformFactory(compilation, reflector, coreImportsFrom) {
        return function (context) {
            return function (file) {
                return transformIvySourceFile(compilation, context, reflector, coreImportsFrom, file);
            };
        };
    }
    exports.ivyTransformFactory = ivyTransformFactory;
    var IvyVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(IvyVisitor, _super);
        function IvyVisitor(compilation, reflector, importManager, isCore, constantPool) {
            var _this = _super.call(this) || this;
            _this.compilation = compilation;
            _this.reflector = reflector;
            _this.importManager = importManager;
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
                    var exprNode = translator_1.translateExpression(field.initializer, _this.importManager);
                    // Create a static property declaration for the new field.
                    var property = ts.createProperty(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], field.name, undefined, undefined, exprNode);
                    field.statements.map(function (stmt) { return translator_1.translateStatement(stmt, _this.importManager); })
                        .forEach(function (stmt) { return statements_1.push(stmt); });
                    members_1.push(property);
                });
                // Replace the class declaration with an updated version.
                node = ts.updateClassDeclaration(node, 
                // Remove the decorator which triggered this compilation, leaving the others alone.
                maybeFilterDecorator(node.decorators, this.compilation.ivyDecoratorFor(node).node), node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], 
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
    function transformIvySourceFile(compilation, context, reflector, coreImportsFrom, file) {
        var constantPool = new compiler_1.ConstantPool();
        var importManager = new translator_1.ImportManager(coreImportsFrom !== null);
        // Recursively scan through the AST and perform any updates requested by the IvyCompilation.
        var visitor = new IvyVisitor(compilation, reflector, importManager, coreImportsFrom !== null, constantPool);
        var sf = visitor_1.visit(file, visitor, context);
        // Generate the constant statements first, as they may involve adding additional imports
        // to the ImportManager.
        var constants = constantPool.statements.map(function (stmt) { return translator_1.translateStatement(stmt, importManager); });
        // Generate the import statements to prepend.
        var addedImports = importManager.getAllImports(file.fileName, coreImportsFrom).map(function (i) {
            return ts.createImportDeclaration(undefined, undefined, ts.createImportClause(undefined, ts.createNamespaceImport(ts.createIdentifier(i.as))), ts.createLiteral(i.name));
        });
        // Filter out the existing imports and the source file body. All new statements
        // will be inserted between them.
        var existingImports = sf.statements.filter(function (stmt) { return isImportStatement(stmt); });
        var body = sf.statements.filter(function (stmt) { return !isImportStatement(stmt); });
        // Prepend imports if needed.
        if (addedImports.length > 0) {
            sf.statements =
                ts.createNodeArray(tslib_1.__spread(existingImports, addedImports, constants, body));
        }
        return sf;
    }
    function maybeFilterDecorator(decorators, toRemove) {
        if (decorators === undefined) {
            return undefined;
        }
        var filtered = decorators.filter(function (dec) { return ts.getOriginalNode(dec) !== toRemove; });
        if (filtered.length === 0) {
            return undefined;
        }
        return ts.createNodeArray(filtered);
    }
    function isFromAngularCore(decorator) {
        return decorator.import !== null && decorator.import.from === '@angular/core';
    }
    function isImportStatement(stmt) {
        return ts.isImportDeclaration(stmt) || ts.isImportEqualsDeclaration(stmt) ||
            ts.isNamespaceImport(stmt);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0vc3JjL3RyYW5zZm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0M7SUFDL0MsK0JBQWlDO0lBSWpDLDRFQUE0RTtJQUk1RSx1RkFBb0Y7SUFFcEYsSUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7SUFFOUMsU0FBZ0IsbUJBQW1CLENBQy9CLFdBQTJCLEVBQUUsU0FBeUIsRUFDdEQsZUFBcUM7UUFDdkMsT0FBTyxVQUFDLE9BQWlDO1lBQ3ZDLE9BQU8sVUFBQyxJQUFtQjtnQkFDekIsT0FBTyxzQkFBc0IsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDeEYsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQVJELGtEQVFDO0lBRUQ7UUFBeUIsc0NBQU87UUFDOUIsb0JBQ1ksV0FBMkIsRUFBVSxTQUF5QixFQUM5RCxhQUE0QixFQUFVLE1BQWUsRUFDckQsWUFBMEI7WUFIdEMsWUFJRSxpQkFBTyxTQUNSO1lBSlcsaUJBQVcsR0FBWCxXQUFXLENBQWdCO1lBQVUsZUFBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDOUQsbUJBQWEsR0FBYixhQUFhLENBQWU7WUFBVSxZQUFNLEdBQU4sTUFBTSxDQUFTO1lBQ3JELGtCQUFZLEdBQVosWUFBWSxDQUFjOztRQUV0QyxDQUFDO1FBRUQsMENBQXFCLEdBQXJCLFVBQXNCLElBQXlCO1lBQS9DLGlCQXVDQztZQXJDQyx5RkFBeUY7WUFDekYsMEJBQTBCO1lBQzFCLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFF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QXlCLENBQUMsSUFBSSxDQUFDO1lBQ3JFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vaG9zdCc7XG5pbXBvcnQge3JlbGF0aXZlUGF0aEJldHdlZW59IGZyb20gJy4uLy4uL3V0aWwvc3JjL3BhdGgnO1xuaW1wb3J0IHtWaXNpdExpc3RFbnRyeVJlc3VsdCwgVmlzaXRvciwgdmlzaXR9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3Zpc2l0b3InO1xuXG5pbXBvcnQge0NvbXBpbGVSZXN1bHR9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7SXZ5Q29tcGlsYXRpb259IGZyb20gJy4vY29tcGlsYXRpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVFeHByZXNzaW9uLCB0cmFuc2xhdGVTdGF0ZW1lbnR9IGZyb20gJy4vdHJhbnNsYXRvcic7XG5cbmNvbnN0IE5PX0RFQ09SQVRPUlMgPSBuZXcgU2V0PHRzLkRlY29yYXRvcj4oKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGl2eVRyYW5zZm9ybUZhY3RvcnkoXG4gICAgY29tcGlsYXRpb246IEl2eUNvbXBpbGF0aW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGNvcmVJbXBvcnRzRnJvbTogdHMuU291cmNlRmlsZSB8IG51bGwpOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6IHRzLlRyYW5zZm9ybWVyPHRzLlNvdXJjZUZpbGU+ID0+IHtcbiAgICByZXR1cm4gKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlID0+IHtcbiAgICAgIHJldHVybiB0cmFuc2Zvcm1JdnlTb3VyY2VGaWxlKGNvbXBpbGF0aW9uLCBjb250ZXh0LCByZWZsZWN0b3IsIGNvcmVJbXBvcnRzRnJvbSwgZmlsZSk7XG4gICAgfTtcbiAgfTtcbn1cblxuY2xhc3MgSXZ5VmlzaXRvciBleHRlbmRzIFZpc2l0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgY29tcGlsYXRpb246IEl2eUNvbXBpbGF0aW9uLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIsIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICB2aXNpdENsYXNzRGVjbGFyYXRpb24obm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6XG4gICAgICBWaXNpdExpc3RFbnRyeVJlc3VsdDx0cy5TdGF0ZW1lbnQsIHRzLkNsYXNzRGVjbGFyYXRpb24+IHtcbiAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBjbGFzcyBoYXMgYW4gSXZ5IGZpZWxkIHRoYXQgbmVlZHMgdG8gYmUgYWRkZWQsIGFuZCBjb21waWxlIHRoZSBmaWVsZFxuICAgIC8vIHRvIGFuIGV4cHJlc3Npb24gaWYgc28uXG4gICAgY29uc3QgcmVzID0gdGhpcy5jb21waWxhdGlvbi5jb21waWxlSXZ5RmllbGRGb3Iobm9kZSwgdGhpcy5jb25zdGFudFBvb2wpO1xuXG4gICAgaWYgKHJlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBUaGVyZSBpcyBhdCBsZWFzdCBvbmUgZmllbGQgdG8gYWRkLlxuICAgICAgY29uc3Qgc3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcbiAgICAgIGNvbnN0IG1lbWJlcnMgPSBbLi4ubm9kZS5tZW1iZXJzXTtcblxuICAgICAgcmVzLmZvckVhY2goZmllbGQgPT4ge1xuICAgICAgICAvLyBUcmFuc2xhdGUgdGhlIGluaXRpYWxpemVyIGZvciB0aGUgZmllbGQgaW50byBUUyBub2Rlcy5cbiAgICAgICAgY29uc3QgZXhwck5vZGUgPSB0cmFuc2xhdGVFeHByZXNzaW9uKGZpZWxkLmluaXRpYWxpemVyLCB0aGlzLmltcG9ydE1hbmFnZXIpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBhIHN0YXRpYyBwcm9wZXJ0eSBkZWNsYXJhdGlvbiBmb3IgdGhlIG5ldyBmaWVsZC5cbiAgICAgICAgY29uc3QgcHJvcGVydHkgPSB0cy5jcmVhdGVQcm9wZXJ0eShcbiAgICAgICAgICAgIHVuZGVmaW5lZCwgW3RzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCldLCBmaWVsZC5uYW1lLCB1bmRlZmluZWQsXG4gICAgICAgICAgICB1bmRlZmluZWQsIGV4cHJOb2RlKTtcblxuICAgICAgICBmaWVsZC5zdGF0ZW1lbnRzLm1hcChzdG10ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdG10LCB0aGlzLmltcG9ydE1hbmFnZXIpKVxuICAgICAgICAgICAgLmZvckVhY2goc3RtdCA9PiBzdGF0ZW1lbnRzLnB1c2goc3RtdCkpO1xuXG4gICAgICAgIG1lbWJlcnMucHVzaChwcm9wZXJ0eSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gUmVwbGFjZSB0aGUgY2xhc3MgZGVjbGFyYXRpb24gd2l0aCBhbiB1cGRhdGVkIHZlcnNpb24uXG4gICAgICBub2RlID0gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgICBub2RlLFxuICAgICAgICAgIC8vIFJlbW92ZSB0aGUgZGVjb3JhdG9yIHdoaWNoIHRyaWdnZXJlZCB0aGlzIGNvbXBpbGF0aW9uLCBsZWF2aW5nIHRoZSBvdGhlcnMgYWxvbmUuXG4gICAgICAgICAgbWF5YmVGaWx0ZXJEZWNvcmF0b3IoXG4gICAgICAgICAgICAgIG5vZGUuZGVjb3JhdG9ycywgdGhpcy5jb21waWxhdGlvbi5pdnlEZWNvcmF0b3JGb3Iobm9kZSkgIS5ub2RlIGFzIHRzLkRlY29yYXRvciksXG4gICAgICAgICAgbm9kZS5tb2RpZmllcnMsIG5vZGUubmFtZSwgbm9kZS50eXBlUGFyYW1ldGVycywgbm9kZS5oZXJpdGFnZUNsYXVzZXMgfHwgW10sXG4gICAgICAgICAgLy8gTWFwIG92ZXIgdGhlIGNsYXNzIG1lbWJlcnMgYW5kIHJlbW92ZSBhbnkgQW5ndWxhciBkZWNvcmF0b3JzIGZyb20gdGhlbS5cbiAgICAgICAgICBtZW1iZXJzLm1hcChtZW1iZXIgPT4gdGhpcy5fc3RyaXBBbmd1bGFyRGVjb3JhdG9ycyhtZW1iZXIpKSk7XG4gICAgICByZXR1cm4ge25vZGUsIGFmdGVyOiBzdGF0ZW1lbnRzfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge25vZGV9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhbGwgZGVjb3JhdG9ycyBvbiBhIGBEZWNsYXJhdGlvbmAgd2hpY2ggYXJlIGZyb20gQGFuZ3VsYXIvY29yZSwgb3IgYW4gZW1wdHkgc2V0IGlmIG5vbmVcbiAgICogYXJlLlxuICAgKi9cbiAgcHJpdmF0ZSBfYW5ndWxhckNvcmVEZWNvcmF0b3JzKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogU2V0PHRzLkRlY29yYXRvcj4ge1xuICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLnJlZmxlY3Rvci5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsKTtcbiAgICBpZiAoZGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIE5PX0RFQ09SQVRPUlM7XG4gICAgfVxuICAgIGNvbnN0IGNvcmVEZWNvcmF0b3JzID0gZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IHRoaXMuaXNDb3JlIHx8IGlzRnJvbUFuZ3VsYXJDb3JlKGRlYykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChkZWMgPT4gZGVjLm5vZGUgYXMgdHMuRGVjb3JhdG9yKTtcbiAgICBpZiAoY29yZURlY29yYXRvcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIG5ldyBTZXQ8dHMuRGVjb3JhdG9yPihjb3JlRGVjb3JhdG9ycyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBOT19ERUNPUkFUT1JTO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIGB0cy5Ob2RlYCwgZmlsdGVyIHRoZSBkZWNvcmF0b3JzIGFycmF5IGFuZCByZXR1cm4gYSB2ZXJzaW9uIGNvbnRhaW5pbmcgb25seSBub24tQW5ndWxhclxuICAgKiBkZWNvcmF0b3JzLlxuICAgKlxuICAgKiBJZiBhbGwgZGVjb3JhdG9ycyBhcmUgcmVtb3ZlZCAob3Igbm9uZSBleGlzdGVkIGluIHRoZSBmaXJzdCBwbGFjZSksIHRoaXMgbWV0aG9kIHJldHVybnNcbiAgICogYHVuZGVmaW5lZGAuXG4gICAqL1xuICBwcml2YXRlIF9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZTogdHMuRGVjbGFyYXRpb24pOiB0cy5Ob2RlQXJyYXk8dHMuRGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIC8vIFNob3J0Y3V0IGlmIHRoZSBub2RlIGhhcyBubyBkZWNvcmF0b3JzLlxuICAgIGlmIChub2RlLmRlY29yYXRvcnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLy8gQnVpbGQgYSBTZXQgb2YgdGhlIGRlY29yYXRvcnMgb24gdGhpcyBub2RlIGZyb20gQGFuZ3VsYXIvY29yZS5cbiAgICBjb25zdCBjb3JlRGVjb3JhdG9ycyA9IHRoaXMuX2FuZ3VsYXJDb3JlRGVjb3JhdG9ycyhub2RlKTtcblxuICAgIGlmIChjb3JlRGVjb3JhdG9ycy5zaXplID09PSBub2RlLmRlY29yYXRvcnMubGVuZ3RoKSB7XG4gICAgICAvLyBJZiBhbGwgZGVjb3JhdG9ycyBhcmUgdG8gYmUgcmVtb3ZlZCwgcmV0dXJuIGB1bmRlZmluZWRgLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKGNvcmVEZWNvcmF0b3JzLnNpemUgPT09IDApIHtcbiAgICAgIC8vIElmIG5vIGRlY29yYXRvcnMgbmVlZCB0byBiZSByZW1vdmVkLCByZXR1cm4gdGhlIG9yaWdpbmFsIGRlY29yYXRvcnMgYXJyYXkuXG4gICAgICByZXR1cm4gbm9kZS5kZWNvcmF0b3JzO1xuICAgIH1cblxuICAgIC8vIEZpbHRlciBvdXQgdGhlIGNvcmUgZGVjb3JhdG9ycy5cbiAgICBjb25zdCBmaWx0ZXJlZCA9IG5vZGUuZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+ICFjb3JlRGVjb3JhdG9ycy5oYXMoZGVjKSk7XG5cbiAgICAvLyBJZiBubyBkZWNvcmF0b3JzIHN1cnZpdmUsIHJldHVybiBgdW5kZWZpbmVkYC4gVGhpcyBjYW4gb25seSBoYXBwZW4gaWYgYSBjb3JlIGRlY29yYXRvciBpc1xuICAgIC8vIHJlcGVhdGVkIG9uIHRoZSBub2RlLlxuICAgIGlmIChmaWx0ZXJlZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgbmV3IGBOb2RlQXJyYXlgIHdpdGggdGhlIGZpbHRlcmVkIGRlY29yYXRvcnMgdGhhdCBzb3VyY2VtYXBzIGJhY2sgdG8gdGhlIG9yaWdpbmFsLlxuICAgIGNvbnN0IGFycmF5ID0gdHMuY3JlYXRlTm9kZUFycmF5KGZpbHRlcmVkKTtcbiAgICBhcnJheS5wb3MgPSBub2RlLmRlY29yYXRvcnMucG9zO1xuICAgIGFycmF5LmVuZCA9IG5vZGUuZGVjb3JhdG9ycy5lbmQ7XG4gICAgcmV0dXJuIGFycmF5O1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBBbmd1bGFyIGRlY29yYXRvcnMgZnJvbSBhIGB0cy5Ob2RlYCBpbiBhIHNoYWxsb3cgbWFubmVyLlxuICAgKlxuICAgKiBUaGlzIHdpbGwgcmVtb3ZlIGRlY29yYXRvcnMgZnJvbSBjbGFzcyBlbGVtZW50cyAoZ2V0dGVycywgc2V0dGVycywgcHJvcGVydGllcywgbWV0aG9kcykgYXMgd2VsbFxuICAgKiBhcyBwYXJhbWV0ZXJzIG9mIGNvbnN0cnVjdG9ycy5cbiAgICovXG4gIHByaXZhdGUgX3N0cmlwQW5ndWxhckRlY29yYXRvcnM8VCBleHRlbmRzIHRzLk5vZGU+KG5vZGU6IFQpOiBUIHtcbiAgICBpZiAodHMuaXNQYXJhbWV0ZXIobm9kZSkpIHtcbiAgICAgIC8vIFN0cmlwIGRlY29yYXRvcnMgZnJvbSBwYXJhbWV0ZXJzIChwcm9iYWJseSBvZiB0aGUgY29uc3RydWN0b3IpLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgbm9kZSwgdGhpcy5fbm9uQ29yZURlY29yYXRvcnNPbmx5KG5vZGUpLCBub2RlLm1vZGlmaWVycywgbm9kZS5kb3REb3REb3RUb2tlbixcbiAgICAgICAgICAgICAgICAgbm9kZS5uYW1lLCBub2RlLnF1ZXN0aW9uVG9rZW4sIG5vZGUudHlwZSwgbm9kZS5pbml0aWFsaXplcikgYXMgVCAmXG4gICAgICAgICAgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpICYmIG5vZGUuZGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIG1ldGhvZHMuXG4gICAgICBub2RlID0gdHMudXBkYXRlTWV0aG9kKFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLmFzdGVyaXNrVG9rZW4sXG4gICAgICAgICAgICAgICAgIG5vZGUubmFtZSwgbm9kZS5xdWVzdGlvblRva2VuLCBub2RlLnR5cGVQYXJhbWV0ZXJzLCBub2RlLnBhcmFtZXRlcnMsIG5vZGUudHlwZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5ib2R5KSBhcyBUICZcbiAgICAgICAgICB0cy5NZXRob2REZWNsYXJhdGlvbjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlEZWNsYXJhdGlvbihub2RlKSAmJiBub2RlLmRlY29yYXRvcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gU3RyaXAgZGVjb3JhdG9ycyBvZiBwcm9wZXJ0aWVzLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZVByb3BlcnR5KFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgIG5vZGUucXVlc3Rpb25Ub2tlbiwgbm9kZS50eXBlLCBub2RlLmluaXRpYWxpemVyKSBhcyBUICZcbiAgICAgICAgICB0cy5Qcm9wZXJ0eURlY2xhcmF0aW9uO1xuICAgIH0gZWxzZSBpZiAodHMuaXNHZXRBY2Nlc3Nvcihub2RlKSkge1xuICAgICAgLy8gU3RyaXAgZGVjb3JhdG9ycyBvZiBnZXR0ZXJzLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZUdldEFjY2Vzc29yKFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgIG5vZGUucGFyYW1ldGVycywgbm9kZS50eXBlLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLkdldEFjY2Vzc29yRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc1NldEFjY2Vzc29yKG5vZGUpKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIHNldHRlcnMuXG4gICAgICBub2RlID0gdHMudXBkYXRlU2V0QWNjZXNzb3IoXG4gICAgICAgICAgICAgICAgIG5vZGUsIHRoaXMuX25vbkNvcmVEZWNvcmF0b3JzT25seShub2RlKSwgbm9kZS5tb2RpZmllcnMsIG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5wYXJhbWV0ZXJzLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLlNldEFjY2Vzc29yRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIC8vIEZvciBjb25zdHJ1Y3RvcnMsIHN0cmlwIGRlY29yYXRvcnMgb2YgdGhlIHBhcmFtZXRlcnMuXG4gICAgICBjb25zdCBwYXJhbWV0ZXJzID0gbm9kZS5wYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB0aGlzLl9zdHJpcEFuZ3VsYXJEZWNvcmF0b3JzKHBhcmFtKSk7XG4gICAgICBub2RlID1cbiAgICAgICAgICB0cy51cGRhdGVDb25zdHJ1Y3Rvcihub2RlLCBub2RlLmRlY29yYXRvcnMsIG5vZGUubW9kaWZpZXJzLCBwYXJhbWV0ZXJzLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb247XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xuICB9XG59XG5cbi8qKlxuICogQSB0cmFuc2Zvcm1lciB3aGljaCBvcGVyYXRlcyBvbiB0cy5Tb3VyY2VGaWxlcyBhbmQgYXBwbGllcyBjaGFuZ2VzIGZyb20gYW4gYEl2eUNvbXBpbGF0aW9uYC5cbiAqL1xuZnVuY3Rpb24gdHJhbnNmb3JtSXZ5U291cmNlRmlsZShcbiAgICBjb21waWxhdGlvbjogSXZ5Q29tcGlsYXRpb24sIGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBjb3JlSW1wb3J0c0Zyb206IHRzLlNvdXJjZUZpbGUgfCBudWxsLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IGNvbnN0YW50UG9vbCA9IG5ldyBDb25zdGFudFBvb2woKTtcbiAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKGNvcmVJbXBvcnRzRnJvbSAhPT0gbnVsbCk7XG5cbiAgLy8gUmVjdXJzaXZlbHkgc2NhbiB0aHJvdWdoIHRoZSBBU1QgYW5kIHBlcmZvcm0gYW55IHVwZGF0ZXMgcmVxdWVzdGVkIGJ5IHRoZSBJdnlDb21waWxhdGlvbi5cbiAgY29uc3QgdmlzaXRvciA9XG4gICAgICBuZXcgSXZ5VmlzaXRvcihjb21waWxhdGlvbiwgcmVmbGVjdG9yLCBpbXBvcnRNYW5hZ2VyLCBjb3JlSW1wb3J0c0Zyb20gIT09IG51bGwsIGNvbnN0YW50UG9vbCk7XG4gIGNvbnN0IHNmID0gdmlzaXQoZmlsZSwgdmlzaXRvciwgY29udGV4dCk7XG5cbiAgLy8gR2VuZXJhdGUgdGhlIGNvbnN0YW50IHN0YXRlbWVudHMgZmlyc3QsIGFzIHRoZXkgbWF5IGludm9sdmUgYWRkaW5nIGFkZGl0aW9uYWwgaW1wb3J0c1xuICAvLyB0byB0aGUgSW1wb3J0TWFuYWdlci5cbiAgY29uc3QgY29uc3RhbnRzID0gY29uc3RhbnRQb29sLnN0YXRlbWVudHMubWFwKHN0bXQgPT4gdHJhbnNsYXRlU3RhdGVtZW50KHN0bXQsIGltcG9ydE1hbmFnZXIpKTtcblxuICAvLyBHZW5lcmF0ZSB0aGUgaW1wb3J0IHN0YXRlbWVudHMgdG8gcHJlcGVuZC5cbiAgY29uc3QgYWRkZWRJbXBvcnRzID0gaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKGZpbGUuZmlsZU5hbWUsIGNvcmVJbXBvcnRzRnJvbSkubWFwKGkgPT4ge1xuICAgIHJldHVybiB0cy5jcmVhdGVJbXBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgdW5kZWZpbmVkLCB1bmRlZmluZWQsXG4gICAgICAgIHRzLmNyZWF0ZUltcG9ydENsYXVzZSh1bmRlZmluZWQsIHRzLmNyZWF0ZU5hbWVzcGFjZUltcG9ydCh0cy5jcmVhdGVJZGVudGlmaWVyKGkuYXMpKSksXG4gICAgICAgIHRzLmNyZWF0ZUxpdGVyYWwoaS5uYW1lKSk7XG4gIH0pO1xuXG4gIC8vIEZpbHRlciBvdXQgdGhlIGV4aXN0aW5nIGltcG9ydHMgYW5kIHRoZSBzb3VyY2UgZmlsZSBib2R5LiBBbGwgbmV3IHN0YXRlbWVudHNcbiAgLy8gd2lsbCBiZSBpbnNlcnRlZCBiZXR3ZWVuIHRoZW0uXG4gIGNvbnN0IGV4aXN0aW5nSW1wb3J0cyA9IHNmLnN0YXRlbWVudHMuZmlsdGVyKHN0bXQgPT4gaXNJbXBvcnRTdGF0ZW1lbnQoc3RtdCkpO1xuICBjb25zdCBib2R5ID0gc2Yuc3RhdGVtZW50cy5maWx0ZXIoc3RtdCA9PiAhaXNJbXBvcnRTdGF0ZW1lbnQoc3RtdCkpO1xuXG4gIC8vIFByZXBlbmQgaW1wb3J0cyBpZiBuZWVkZWQuXG4gIGlmIChhZGRlZEltcG9ydHMubGVuZ3RoID4gMCkge1xuICAgIHNmLnN0YXRlbWVudHMgPVxuICAgICAgICB0cy5jcmVhdGVOb2RlQXJyYXkoWy4uLmV4aXN0aW5nSW1wb3J0cywgLi4uYWRkZWRJbXBvcnRzLCAuLi5jb25zdGFudHMsIC4uLmJvZHldKTtcbiAgfVxuICByZXR1cm4gc2Y7XG59XG5cbmZ1bmN0aW9uIG1heWJlRmlsdGVyRGVjb3JhdG9yKFxuICAgIGRlY29yYXRvcnM6IHRzLk5vZGVBcnJheTx0cy5EZWNvcmF0b3I+fCB1bmRlZmluZWQsXG4gICAgdG9SZW1vdmU6IHRzLkRlY29yYXRvcik6IHRzLk5vZGVBcnJheTx0cy5EZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gIGlmIChkZWNvcmF0b3JzID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGZpbHRlcmVkID0gZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IHRzLmdldE9yaWdpbmFsTm9kZShkZWMpICE9PSB0b1JlbW92ZSk7XG4gIGlmIChmaWx0ZXJlZC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB0cy5jcmVhdGVOb2RlQXJyYXkoZmlsdGVyZWQpO1xufVxuXG5mdW5jdGlvbiBpc0Zyb21Bbmd1bGFyQ29yZShkZWNvcmF0b3I6IERlY29yYXRvcik6IGJvb2xlYW4ge1xuICByZXR1cm4gZGVjb3JhdG9yLmltcG9ydCAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJztcbn1cblxuZnVuY3Rpb24gaXNJbXBvcnRTdGF0ZW1lbnQoc3RtdDogdHMuU3RhdGVtZW50KTogYm9vbGVhbiB7XG4gIHJldHVybiB0cy5pc0ltcG9ydERlY2xhcmF0aW9uKHN0bXQpIHx8IHRzLmlzSW1wb3J0RXF1YWxzRGVjbGFyYXRpb24oc3RtdCkgfHxcbiAgICAgIHRzLmlzTmFtZXNwYWNlSW1wb3J0KHN0bXQpO1xufVxuIl19