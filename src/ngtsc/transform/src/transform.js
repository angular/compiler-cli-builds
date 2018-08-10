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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0vc3JjL3RyYW5zZm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0M7SUFDL0MsK0JBQWlDO0lBSWpDLDRFQUE0RTtJQUk1RSx1RkFBb0Y7SUFFcEYsSUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWdCLENBQUM7SUFFOUMsNkJBQ0ksV0FBMkIsRUFBRSxTQUF5QixFQUN0RCxlQUFxQztRQUN2QyxPQUFPLFVBQUMsT0FBaUM7WUFDdkMsT0FBTyxVQUFDLElBQW1CO2dCQUN6QixPQUFPLHNCQUFzQixDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN4RixDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7SUFDSixDQUFDO0lBUkQsa0RBUUM7SUFFRDtRQUF5QixzQ0FBTztRQUM5QixvQkFDWSxXQUEyQixFQUFVLFNBQXlCLEVBQzlELGFBQTRCLEVBQVUsTUFBZSxFQUNyRCxZQUEwQjtZQUh0QyxZQUlFLGlCQUFPLFNBQ1I7WUFKVyxpQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFBVSxlQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUM5RCxtQkFBYSxHQUFiLGFBQWEsQ0FBZTtZQUFVLFlBQU0sR0FBTixNQUFNLENBQVM7WUFDckQsa0JBQVksR0FBWixZQUFZLENBQWM7O1FBRXRDLENBQUM7UUFFRCwwQ0FBcUIsR0FBckIsVUFBc0IsSUFBeUI7WUFBL0MsaUJBdUNDO1lBckNDLHlGQUF5RjtZQUN6RiwwQkFBMEI7WUFDMUIsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlB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Q0FBQztJQUNqQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vaG9zdCc7XG5pbXBvcnQge3JlbGF0aXZlUGF0aEJldHdlZW59IGZyb20gJy4uLy4uL3V0aWwvc3JjL3BhdGgnO1xuaW1wb3J0IHtWaXNpdExpc3RFbnRyeVJlc3VsdCwgVmlzaXRvciwgdmlzaXR9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3Zpc2l0b3InO1xuXG5pbXBvcnQge0NvbXBpbGVSZXN1bHR9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7SXZ5Q29tcGlsYXRpb259IGZyb20gJy4vY29tcGlsYXRpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVFeHByZXNzaW9uLCB0cmFuc2xhdGVTdGF0ZW1lbnR9IGZyb20gJy4vdHJhbnNsYXRvcic7XG5cbmNvbnN0IE5PX0RFQ09SQVRPUlMgPSBuZXcgU2V0PHRzLkRlY29yYXRvcj4oKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGl2eVRyYW5zZm9ybUZhY3RvcnkoXG4gICAgY29tcGlsYXRpb246IEl2eUNvbXBpbGF0aW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGNvcmVJbXBvcnRzRnJvbTogdHMuU291cmNlRmlsZSB8IG51bGwpOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6IHRzLlRyYW5zZm9ybWVyPHRzLlNvdXJjZUZpbGU+ID0+IHtcbiAgICByZXR1cm4gKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlID0+IHtcbiAgICAgIHJldHVybiB0cmFuc2Zvcm1JdnlTb3VyY2VGaWxlKGNvbXBpbGF0aW9uLCBjb250ZXh0LCByZWZsZWN0b3IsIGNvcmVJbXBvcnRzRnJvbSwgZmlsZSk7XG4gICAgfTtcbiAgfTtcbn1cblxuY2xhc3MgSXZ5VmlzaXRvciBleHRlbmRzIFZpc2l0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgY29tcGlsYXRpb246IEl2eUNvbXBpbGF0aW9uLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIsIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICB2aXNpdENsYXNzRGVjbGFyYXRpb24obm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6XG4gICAgICBWaXNpdExpc3RFbnRyeVJlc3VsdDx0cy5TdGF0ZW1lbnQsIHRzLkNsYXNzRGVjbGFyYXRpb24+IHtcbiAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBjbGFzcyBoYXMgYW4gSXZ5IGZpZWxkIHRoYXQgbmVlZHMgdG8gYmUgYWRkZWQsIGFuZCBjb21waWxlIHRoZSBmaWVsZFxuICAgIC8vIHRvIGFuIGV4cHJlc3Npb24gaWYgc28uXG4gICAgY29uc3QgcmVzID0gdGhpcy5jb21waWxhdGlvbi5jb21waWxlSXZ5RmllbGRGb3Iobm9kZSwgdGhpcy5jb25zdGFudFBvb2wpO1xuXG4gICAgaWYgKHJlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBUaGVyZSBpcyBhdCBsZWFzdCBvbmUgZmllbGQgdG8gYWRkLlxuICAgICAgY29uc3Qgc3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcbiAgICAgIGNvbnN0IG1lbWJlcnMgPSBbLi4ubm9kZS5tZW1iZXJzXTtcblxuICAgICAgcmVzLmZvckVhY2goZmllbGQgPT4ge1xuICAgICAgICAvLyBUcmFuc2xhdGUgdGhlIGluaXRpYWxpemVyIGZvciB0aGUgZmllbGQgaW50byBUUyBub2Rlcy5cbiAgICAgICAgY29uc3QgZXhwck5vZGUgPSB0cmFuc2xhdGVFeHByZXNzaW9uKGZpZWxkLmluaXRpYWxpemVyLCB0aGlzLmltcG9ydE1hbmFnZXIpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBhIHN0YXRpYyBwcm9wZXJ0eSBkZWNsYXJhdGlvbiBmb3IgdGhlIG5ldyBmaWVsZC5cbiAgICAgICAgY29uc3QgcHJvcGVydHkgPSB0cy5jcmVhdGVQcm9wZXJ0eShcbiAgICAgICAgICAgIHVuZGVmaW5lZCwgW3RzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCldLCBmaWVsZC5uYW1lLCB1bmRlZmluZWQsXG4gICAgICAgICAgICB1bmRlZmluZWQsIGV4cHJOb2RlKTtcblxuICAgICAgICBmaWVsZC5zdGF0ZW1lbnRzLm1hcChzdG10ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdG10LCB0aGlzLmltcG9ydE1hbmFnZXIpKVxuICAgICAgICAgICAgLmZvckVhY2goc3RtdCA9PiBzdGF0ZW1lbnRzLnB1c2goc3RtdCkpO1xuXG4gICAgICAgIG1lbWJlcnMucHVzaChwcm9wZXJ0eSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gUmVwbGFjZSB0aGUgY2xhc3MgZGVjbGFyYXRpb24gd2l0aCBhbiB1cGRhdGVkIHZlcnNpb24uXG4gICAgICBub2RlID0gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgICBub2RlLFxuICAgICAgICAgIC8vIFJlbW92ZSB0aGUgZGVjb3JhdG9yIHdoaWNoIHRyaWdnZXJlZCB0aGlzIGNvbXBpbGF0aW9uLCBsZWF2aW5nIHRoZSBvdGhlcnMgYWxvbmUuXG4gICAgICAgICAgbWF5YmVGaWx0ZXJEZWNvcmF0b3IoXG4gICAgICAgICAgICAgIG5vZGUuZGVjb3JhdG9ycywgdGhpcy5jb21waWxhdGlvbi5pdnlEZWNvcmF0b3JGb3Iobm9kZSkgIS5ub2RlIGFzIHRzLkRlY29yYXRvciksXG4gICAgICAgICAgbm9kZS5tb2RpZmllcnMsIG5vZGUubmFtZSwgbm9kZS50eXBlUGFyYW1ldGVycywgbm9kZS5oZXJpdGFnZUNsYXVzZXMgfHwgW10sXG4gICAgICAgICAgLy8gTWFwIG92ZXIgdGhlIGNsYXNzIG1lbWJlcnMgYW5kIHJlbW92ZSBhbnkgQW5ndWxhciBkZWNvcmF0b3JzIGZyb20gdGhlbS5cbiAgICAgICAgICBtZW1iZXJzLm1hcChtZW1iZXIgPT4gdGhpcy5fc3RyaXBBbmd1bGFyRGVjb3JhdG9ycyhtZW1iZXIpKSk7XG4gICAgICByZXR1cm4ge25vZGUsIGFmdGVyOiBzdGF0ZW1lbnRzfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge25vZGV9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhbGwgZGVjb3JhdG9ycyBvbiBhIGBEZWNsYXJhdGlvbmAgd2hpY2ggYXJlIGZyb20gQGFuZ3VsYXIvY29yZSwgb3IgYW4gZW1wdHkgc2V0IGlmIG5vbmVcbiAgICogYXJlLlxuICAgKi9cbiAgcHJpdmF0ZSBfYW5ndWxhckNvcmVEZWNvcmF0b3JzKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogU2V0PHRzLkRlY29yYXRvcj4ge1xuICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLnJlZmxlY3Rvci5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsKTtcbiAgICBpZiAoZGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIE5PX0RFQ09SQVRPUlM7XG4gICAgfVxuICAgIGNvbnN0IGNvcmVEZWNvcmF0b3JzID0gZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IHRoaXMuaXNDb3JlIHx8IGlzRnJvbUFuZ3VsYXJDb3JlKGRlYykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChkZWMgPT4gZGVjLm5vZGUgYXMgdHMuRGVjb3JhdG9yKTtcbiAgICBpZiAoY29yZURlY29yYXRvcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIG5ldyBTZXQ8dHMuRGVjb3JhdG9yPihjb3JlRGVjb3JhdG9ycyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBOT19ERUNPUkFUT1JTO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIGB0cy5Ob2RlYCwgZmlsdGVyIHRoZSBkZWNvcmF0b3JzIGFycmF5IGFuZCByZXR1cm4gYSB2ZXJzaW9uIGNvbnRhaW5pbmcgb25seSBub24tQW5ndWxhclxuICAgKiBkZWNvcmF0b3JzLlxuICAgKlxuICAgKiBJZiBhbGwgZGVjb3JhdG9ycyBhcmUgcmVtb3ZlZCAob3Igbm9uZSBleGlzdGVkIGluIHRoZSBmaXJzdCBwbGFjZSksIHRoaXMgbWV0aG9kIHJldHVybnNcbiAgICogYHVuZGVmaW5lZGAuXG4gICAqL1xuICBwcml2YXRlIF9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZTogdHMuRGVjbGFyYXRpb24pOiB0cy5Ob2RlQXJyYXk8dHMuRGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIC8vIFNob3J0Y3V0IGlmIHRoZSBub2RlIGhhcyBubyBkZWNvcmF0b3JzLlxuICAgIGlmIChub2RlLmRlY29yYXRvcnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLy8gQnVpbGQgYSBTZXQgb2YgdGhlIGRlY29yYXRvcnMgb24gdGhpcyBub2RlIGZyb20gQGFuZ3VsYXIvY29yZS5cbiAgICBjb25zdCBjb3JlRGVjb3JhdG9ycyA9IHRoaXMuX2FuZ3VsYXJDb3JlRGVjb3JhdG9ycyhub2RlKTtcblxuICAgIGlmIChjb3JlRGVjb3JhdG9ycy5zaXplID09PSBub2RlLmRlY29yYXRvcnMubGVuZ3RoKSB7XG4gICAgICAvLyBJZiBhbGwgZGVjb3JhdG9ycyBhcmUgdG8gYmUgcmVtb3ZlZCwgcmV0dXJuIGB1bmRlZmluZWRgLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKGNvcmVEZWNvcmF0b3JzLnNpemUgPT09IDApIHtcbiAgICAgIC8vIElmIG5vIGRlY29yYXRvcnMgbmVlZCB0byBiZSByZW1vdmVkLCByZXR1cm4gdGhlIG9yaWdpbmFsIGRlY29yYXRvcnMgYXJyYXkuXG4gICAgICByZXR1cm4gbm9kZS5kZWNvcmF0b3JzO1xuICAgIH1cblxuICAgIC8vIEZpbHRlciBvdXQgdGhlIGNvcmUgZGVjb3JhdG9ycy5cbiAgICBjb25zdCBmaWx0ZXJlZCA9IG5vZGUuZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+ICFjb3JlRGVjb3JhdG9ycy5oYXMoZGVjKSk7XG5cbiAgICAvLyBJZiBubyBkZWNvcmF0b3JzIHN1cnZpdmUsIHJldHVybiBgdW5kZWZpbmVkYC4gVGhpcyBjYW4gb25seSBoYXBwZW4gaWYgYSBjb3JlIGRlY29yYXRvciBpc1xuICAgIC8vIHJlcGVhdGVkIG9uIHRoZSBub2RlLlxuICAgIGlmIChmaWx0ZXJlZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgbmV3IGBOb2RlQXJyYXlgIHdpdGggdGhlIGZpbHRlcmVkIGRlY29yYXRvcnMgdGhhdCBzb3VyY2VtYXBzIGJhY2sgdG8gdGhlIG9yaWdpbmFsLlxuICAgIGNvbnN0IGFycmF5ID0gdHMuY3JlYXRlTm9kZUFycmF5KGZpbHRlcmVkKTtcbiAgICBhcnJheS5wb3MgPSBub2RlLmRlY29yYXRvcnMucG9zO1xuICAgIGFycmF5LmVuZCA9IG5vZGUuZGVjb3JhdG9ycy5lbmQ7XG4gICAgcmV0dXJuIGFycmF5O1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBBbmd1bGFyIGRlY29yYXRvcnMgZnJvbSBhIGB0cy5Ob2RlYCBpbiBhIHNoYWxsb3cgbWFubmVyLlxuICAgKlxuICAgKiBUaGlzIHdpbGwgcmVtb3ZlIGRlY29yYXRvcnMgZnJvbSBjbGFzcyBlbGVtZW50cyAoZ2V0dGVycywgc2V0dGVycywgcHJvcGVydGllcywgbWV0aG9kcykgYXMgd2VsbFxuICAgKiBhcyBwYXJhbWV0ZXJzIG9mIGNvbnN0cnVjdG9ycy5cbiAgICovXG4gIHByaXZhdGUgX3N0cmlwQW5ndWxhckRlY29yYXRvcnM8VCBleHRlbmRzIHRzLk5vZGU+KG5vZGU6IFQpOiBUIHtcbiAgICBpZiAodHMuaXNQYXJhbWV0ZXIobm9kZSkpIHtcbiAgICAgIC8vIFN0cmlwIGRlY29yYXRvcnMgZnJvbSBwYXJhbWV0ZXJzIChwcm9iYWJseSBvZiB0aGUgY29uc3RydWN0b3IpLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICAgbm9kZSwgdGhpcy5fbm9uQ29yZURlY29yYXRvcnNPbmx5KG5vZGUpLCBub2RlLm1vZGlmaWVycywgbm9kZS5kb3REb3REb3RUb2tlbixcbiAgICAgICAgICAgICAgICAgbm9kZS5uYW1lLCBub2RlLnF1ZXN0aW9uVG9rZW4sIG5vZGUudHlwZSwgbm9kZS5pbml0aWFsaXplcikgYXMgVCAmXG4gICAgICAgICAgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpICYmIG5vZGUuZGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIG1ldGhvZHMuXG4gICAgICBub2RlID0gdHMudXBkYXRlTWV0aG9kKFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLmFzdGVyaXNrVG9rZW4sXG4gICAgICAgICAgICAgICAgIG5vZGUubmFtZSwgbm9kZS5xdWVzdGlvblRva2VuLCBub2RlLnR5cGVQYXJhbWV0ZXJzLCBub2RlLnBhcmFtZXRlcnMsIG5vZGUudHlwZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5ib2R5KSBhcyBUICZcbiAgICAgICAgICB0cy5NZXRob2REZWNsYXJhdGlvbjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlEZWNsYXJhdGlvbihub2RlKSAmJiBub2RlLmRlY29yYXRvcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gU3RyaXAgZGVjb3JhdG9ycyBvZiBwcm9wZXJ0aWVzLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZVByb3BlcnR5KFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgIG5vZGUucXVlc3Rpb25Ub2tlbiwgbm9kZS50eXBlLCBub2RlLmluaXRpYWxpemVyKSBhcyBUICZcbiAgICAgICAgICB0cy5Qcm9wZXJ0eURlY2xhcmF0aW9uO1xuICAgIH0gZWxzZSBpZiAodHMuaXNHZXRBY2Nlc3Nvcihub2RlKSkge1xuICAgICAgLy8gU3RyaXAgZGVjb3JhdG9ycyBvZiBnZXR0ZXJzLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZUdldEFjY2Vzc29yKFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgIG5vZGUucGFyYW1ldGVycywgbm9kZS50eXBlLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLkdldEFjY2Vzc29yRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc1NldEFjY2Vzc29yKG5vZGUpKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIHNldHRlcnMuXG4gICAgICBub2RlID0gdHMudXBkYXRlU2V0QWNjZXNzb3IoXG4gICAgICAgICAgICAgICAgIG5vZGUsIHRoaXMuX25vbkNvcmVEZWNvcmF0b3JzT25seShub2RlKSwgbm9kZS5tb2RpZmllcnMsIG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5wYXJhbWV0ZXJzLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLlNldEFjY2Vzc29yRGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIC8vIEZvciBjb25zdHJ1Y3RvcnMsIHN0cmlwIGRlY29yYXRvcnMgb2YgdGhlIHBhcmFtZXRlcnMuXG4gICAgICBjb25zdCBwYXJhbWV0ZXJzID0gbm9kZS5wYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB0aGlzLl9zdHJpcEFuZ3VsYXJEZWNvcmF0b3JzKHBhcmFtKSk7XG4gICAgICBub2RlID1cbiAgICAgICAgICB0cy51cGRhdGVDb25zdHJ1Y3Rvcihub2RlLCBub2RlLmRlY29yYXRvcnMsIG5vZGUubW9kaWZpZXJzLCBwYXJhbWV0ZXJzLCBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb247XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xuICB9XG59XG5cbi8qKlxuICogQSB0cmFuc2Zvcm1lciB3aGljaCBvcGVyYXRlcyBvbiB0cy5Tb3VyY2VGaWxlcyBhbmQgYXBwbGllcyBjaGFuZ2VzIGZyb20gYW4gYEl2eUNvbXBpbGF0aW9uYC5cbiAqL1xuZnVuY3Rpb24gdHJhbnNmb3JtSXZ5U291cmNlRmlsZShcbiAgICBjb21waWxhdGlvbjogSXZ5Q29tcGlsYXRpb24sIGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBjb3JlSW1wb3J0c0Zyb206IHRzLlNvdXJjZUZpbGUgfCBudWxsLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IGNvbnN0YW50UG9vbCA9IG5ldyBDb25zdGFudFBvb2woKTtcbiAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKGNvcmVJbXBvcnRzRnJvbSAhPT0gbnVsbCk7XG5cbiAgLy8gUmVjdXJzaXZlbHkgc2NhbiB0aHJvdWdoIHRoZSBBU1QgYW5kIHBlcmZvcm0gYW55IHVwZGF0ZXMgcmVxdWVzdGVkIGJ5IHRoZSBJdnlDb21waWxhdGlvbi5cbiAgY29uc3QgdmlzaXRvciA9XG4gICAgICBuZXcgSXZ5VmlzaXRvcihjb21waWxhdGlvbiwgcmVmbGVjdG9yLCBpbXBvcnRNYW5hZ2VyLCBjb3JlSW1wb3J0c0Zyb20gIT09IG51bGwsIGNvbnN0YW50UG9vbCk7XG4gIGNvbnN0IHNmID0gdmlzaXQoZmlsZSwgdmlzaXRvciwgY29udGV4dCk7XG5cbiAgLy8gR2VuZXJhdGUgdGhlIGNvbnN0YW50IHN0YXRlbWVudHMgZmlyc3QsIGFzIHRoZXkgbWF5IGludm9sdmUgYWRkaW5nIGFkZGl0aW9uYWwgaW1wb3J0c1xuICAvLyB0byB0aGUgSW1wb3J0TWFuYWdlci5cbiAgY29uc3QgY29uc3RhbnRzID0gY29uc3RhbnRQb29sLnN0YXRlbWVudHMubWFwKHN0bXQgPT4gdHJhbnNsYXRlU3RhdGVtZW50KHN0bXQsIGltcG9ydE1hbmFnZXIpKTtcblxuICAvLyBHZW5lcmF0ZSB0aGUgaW1wb3J0IHN0YXRlbWVudHMgdG8gcHJlcGVuZC5cbiAgY29uc3QgYWRkZWRJbXBvcnRzID0gaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKGZpbGUuZmlsZU5hbWUsIGNvcmVJbXBvcnRzRnJvbSkubWFwKGkgPT4ge1xuICAgIHJldHVybiB0cy5jcmVhdGVJbXBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgdW5kZWZpbmVkLCB1bmRlZmluZWQsXG4gICAgICAgIHRzLmNyZWF0ZUltcG9ydENsYXVzZSh1bmRlZmluZWQsIHRzLmNyZWF0ZU5hbWVzcGFjZUltcG9ydCh0cy5jcmVhdGVJZGVudGlmaWVyKGkuYXMpKSksXG4gICAgICAgIHRzLmNyZWF0ZUxpdGVyYWwoaS5uYW1lKSk7XG4gIH0pO1xuXG4gIC8vIEZpbHRlciBvdXQgdGhlIGV4aXN0aW5nIGltcG9ydHMgYW5kIHRoZSBzb3VyY2UgZmlsZSBib2R5LiBBbGwgbmV3IHN0YXRlbWVudHNcbiAgLy8gd2lsbCBiZSBpbnNlcnRlZCBiZXR3ZWVuIHRoZW0uXG4gIGNvbnN0IGV4aXN0aW5nSW1wb3J0cyA9IHNmLnN0YXRlbWVudHMuZmlsdGVyKHN0bXQgPT4gaXNJbXBvcnRTdGF0ZW1lbnQoc3RtdCkpO1xuICBjb25zdCBib2R5ID0gc2Yuc3RhdGVtZW50cy5maWx0ZXIoc3RtdCA9PiAhaXNJbXBvcnRTdGF0ZW1lbnQoc3RtdCkpO1xuXG4gIC8vIFByZXBlbmQgaW1wb3J0cyBpZiBuZWVkZWQuXG4gIGlmIChhZGRlZEltcG9ydHMubGVuZ3RoID4gMCkge1xuICAgIHNmLnN0YXRlbWVudHMgPVxuICAgICAgICB0cy5jcmVhdGVOb2RlQXJyYXkoWy4uLmV4aXN0aW5nSW1wb3J0cywgLi4uYWRkZWRJbXBvcnRzLCAuLi5jb25zdGFudHMsIC4uLmJvZHldKTtcbiAgfVxuICByZXR1cm4gc2Y7XG59XG5cbmZ1bmN0aW9uIG1heWJlRmlsdGVyRGVjb3JhdG9yKFxuICAgIGRlY29yYXRvcnM6IHRzLk5vZGVBcnJheTx0cy5EZWNvcmF0b3I+fCB1bmRlZmluZWQsXG4gICAgdG9SZW1vdmU6IHRzLkRlY29yYXRvcik6IHRzLk5vZGVBcnJheTx0cy5EZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gIGlmIChkZWNvcmF0b3JzID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGZpbHRlcmVkID0gZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IHRzLmdldE9yaWdpbmFsTm9kZShkZWMpICE9PSB0b1JlbW92ZSk7XG4gIGlmIChmaWx0ZXJlZC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB0cy5jcmVhdGVOb2RlQXJyYXkoZmlsdGVyZWQpO1xufVxuXG5mdW5jdGlvbiBpc0Zyb21Bbmd1bGFyQ29yZShkZWNvcmF0b3I6IERlY29yYXRvcik6IGJvb2xlYW4ge1xuICByZXR1cm4gZGVjb3JhdG9yLmltcG9ydCAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJztcbn1cblxuZnVuY3Rpb24gaXNJbXBvcnRTdGF0ZW1lbnQoc3RtdDogdHMuU3RhdGVtZW50KTogYm9vbGVhbiB7XG4gIHJldHVybiB0cy5pc0ltcG9ydERlY2xhcmF0aW9uKHN0bXQpIHx8IHRzLmlzSW1wb3J0RXF1YWxzRGVjbGFyYXRpb24oc3RtdCkgfHxcbiAgICAgIHRzLmlzTmFtZXNwYWNlSW1wb3J0KHN0bXQpO1xufVxuIl19