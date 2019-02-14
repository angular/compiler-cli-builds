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
    function ivyTransformFactory(compilation, reflector, importRewriter, isCore) {
        return function (context) {
            return function (file) {
                return transformIvySourceFile(compilation, context, reflector, importRewriter, isCore, file);
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
    function transformIvySourceFile(compilation, context, reflector, importRewriter, isCore, file) {
        var constantPool = new compiler_1.ConstantPool();
        var importManager = new translator_1.ImportManager(importRewriter);
        // Recursively scan through the AST and perform any updates requested by the IvyCompilation.
        var visitor = new IvyVisitor(compilation, reflector, importManager, isCore, constantPool);
        var sf = visitor_1.visit(file, visitor, context);
        // Generate the constant statements first, as they may involve adding additional imports
        // to the ImportManager.
        var constants = constantPool.statements.map(function (stmt) { return translator_1.translateStatement(stmt, importManager); });
        // Add new imports for this file.
        return utils_1.addImports(importManager, sf, constants);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0vc3JjL3RyYW5zZm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0M7SUFDL0MsK0JBQWlDO0lBSWpDLHlFQUF3RjtJQUN4Riw0RUFBNEU7SUFJNUUsNkVBQW1DO0lBRW5DLElBQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUFnQixDQUFDO0lBRTlDLFNBQWdCLG1CQUFtQixDQUMvQixXQUEyQixFQUFFLFNBQXlCLEVBQUUsY0FBOEIsRUFDdEYsTUFBZTtRQUNqQixPQUFPLFVBQUMsT0FBaUM7WUFDdkMsT0FBTyxVQUFDLElBQW1CO2dCQUN6QixPQUFPLHNCQUFzQixDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0YsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQVJELGtEQVFDO0lBRUQ7UUFBeUIsc0NBQU87UUFDOUIsb0JBQ1ksV0FBMkIsRUFBVSxTQUF5QixFQUM5RCxhQUE0QixFQUFVLE1BQWUsRUFDckQsWUFBMEI7WUFIdEMsWUFJRSxpQkFBTyxTQUNSO1lBSlcsaUJBQVcsR0FBWCxXQUFXLENBQWdCO1lBQVUsZUFBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDOUQsbUJBQWEsR0FBYixhQUFhLENBQWU7WUFBVSxZQUFNLEdBQU4sTUFBTSxDQUFTO1lBQ3JELGtCQUFZLEdBQVosWUFBWSxDQUFjOztRQUV0QyxDQUFDO1FBRUQsMENBQXFCLEdBQXJCLFVBQXNCLElBQXlCO1lBQS9DLGlCQXNDQztZQXBDQyx5RkFBeUY7WUFDekYsMEJBQTBCO1lBQzFCLElBQU0sR0FBRyxHQUFHLElBQUksQ0FB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O1NBQ2xCO1FBQ0QsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxTQUFTLGlCQUFpQixDQUFDLFNBQW9CO1FBQzdDLE9BQU8sU0FBUyxDQUFDLE1BQU0sS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssZUFBZSxDQUFDO0lBQ2hGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29uc3RhbnRQb29sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0RlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVFeHByZXNzaW9uLCB0cmFuc2xhdGVTdGF0ZW1lbnR9IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtWaXNpdExpc3RFbnRyeVJlc3VsdCwgVmlzaXRvciwgdmlzaXR9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3Zpc2l0b3InO1xuXG5pbXBvcnQge0NvbXBpbGVSZXN1bHR9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7SXZ5Q29tcGlsYXRpb259IGZyb20gJy4vY29tcGlsYXRpb24nO1xuaW1wb3J0IHthZGRJbXBvcnRzfSBmcm9tICcuL3V0aWxzJztcblxuY29uc3QgTk9fREVDT1JBVE9SUyA9IG5ldyBTZXQ8dHMuRGVjb3JhdG9yPigpO1xuXG5leHBvcnQgZnVuY3Rpb24gaXZ5VHJhbnNmb3JtRmFjdG9yeShcbiAgICBjb21waWxhdGlvbjogSXZ5Q29tcGlsYXRpb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlcixcbiAgICBpc0NvcmU6IGJvb2xlYW4pOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6IHRzLlRyYW5zZm9ybWVyPHRzLlNvdXJjZUZpbGU+ID0+IHtcbiAgICByZXR1cm4gKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlID0+IHtcbiAgICAgIHJldHVybiB0cmFuc2Zvcm1JdnlTb3VyY2VGaWxlKGNvbXBpbGF0aW9uLCBjb250ZXh0LCByZWZsZWN0b3IsIGltcG9ydFJld3JpdGVyLCBpc0NvcmUsIGZpbGUpO1xuICAgIH07XG4gIH07XG59XG5cbmNsYXNzIEl2eVZpc2l0b3IgZXh0ZW5kcyBWaXNpdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNvbXBpbGF0aW9uOiBJdnlDb21waWxhdGlvbiwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJpdmF0ZSBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyLCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgdmlzaXRDbGFzc0RlY2xhcmF0aW9uKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOlxuICAgICAgVmlzaXRMaXN0RW50cnlSZXN1bHQ8dHMuU3RhdGVtZW50LCB0cy5DbGFzc0RlY2xhcmF0aW9uPiB7XG4gICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgY2xhc3MgaGFzIGFuIEl2eSBmaWVsZCB0aGF0IG5lZWRzIHRvIGJlIGFkZGVkLCBhbmQgY29tcGlsZSB0aGUgZmllbGRcbiAgICAvLyB0byBhbiBleHByZXNzaW9uIGlmIHNvLlxuICAgIGNvbnN0IHJlcyA9IHRoaXMuY29tcGlsYXRpb24uY29tcGlsZUl2eUZpZWxkRm9yKG5vZGUsIHRoaXMuY29uc3RhbnRQb29sKTtcblxuICAgIGlmIChyZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gVGhlcmUgaXMgYXQgbGVhc3Qgb25lIGZpZWxkIHRvIGFkZC5cbiAgICAgIGNvbnN0IHN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdID0gW107XG4gICAgICBjb25zdCBtZW1iZXJzID0gWy4uLm5vZGUubWVtYmVyc107XG5cbiAgICAgIHJlcy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgLy8gVHJhbnNsYXRlIHRoZSBpbml0aWFsaXplciBmb3IgdGhlIGZpZWxkIGludG8gVFMgbm9kZXMuXG4gICAgICAgIGNvbnN0IGV4cHJOb2RlID0gdHJhbnNsYXRlRXhwcmVzc2lvbihmaWVsZC5pbml0aWFsaXplciwgdGhpcy5pbXBvcnRNYW5hZ2VyKTtcblxuICAgICAgICAvLyBDcmVhdGUgYSBzdGF0aWMgcHJvcGVydHkgZGVjbGFyYXRpb24gZm9yIHRoZSBuZXcgZmllbGQuXG4gICAgICAgIGNvbnN0IHByb3BlcnR5ID0gdHMuY3JlYXRlUHJvcGVydHkoXG4gICAgICAgICAgICB1bmRlZmluZWQsIFt0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpXSwgZmllbGQubmFtZSwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgdW5kZWZpbmVkLCBleHByTm9kZSk7XG5cbiAgICAgICAgZmllbGQuc3RhdGVtZW50cy5tYXAoc3RtdCA9PiB0cmFuc2xhdGVTdGF0ZW1lbnQoc3RtdCwgdGhpcy5pbXBvcnRNYW5hZ2VyKSlcbiAgICAgICAgICAgIC5mb3JFYWNoKHN0bXQgPT4gc3RhdGVtZW50cy5wdXNoKHN0bXQpKTtcblxuICAgICAgICBtZW1iZXJzLnB1c2gocHJvcGVydHkpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFJlcGxhY2UgdGhlIGNsYXNzIGRlY2xhcmF0aW9uIHdpdGggYW4gdXBkYXRlZCB2ZXJzaW9uLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIGRlY29yYXRvciB3aGljaCB0cmlnZ2VyZWQgdGhpcyBjb21waWxhdGlvbiwgbGVhdmluZyB0aGUgb3RoZXJzIGFsb25lLlxuICAgICAgICAgIG1heWJlRmlsdGVyRGVjb3JhdG9yKG5vZGUuZGVjb3JhdG9ycywgdGhpcy5jb21waWxhdGlvbi5pdnlEZWNvcmF0b3JzRm9yKG5vZGUpKSxcbiAgICAgICAgICBub2RlLm1vZGlmaWVycywgbm9kZS5uYW1lLCBub2RlLnR5cGVQYXJhbWV0ZXJzLCBub2RlLmhlcml0YWdlQ2xhdXNlcyB8fCBbXSxcbiAgICAgICAgICAvLyBNYXAgb3ZlciB0aGUgY2xhc3MgbWVtYmVycyBhbmQgcmVtb3ZlIGFueSBBbmd1bGFyIGRlY29yYXRvcnMgZnJvbSB0aGVtLlxuICAgICAgICAgIG1lbWJlcnMubWFwKG1lbWJlciA9PiB0aGlzLl9zdHJpcEFuZ3VsYXJEZWNvcmF0b3JzKG1lbWJlcikpKTtcbiAgICAgIHJldHVybiB7bm9kZSwgYWZ0ZXI6IHN0YXRlbWVudHN9O1xuICAgIH1cblxuICAgIHJldHVybiB7bm9kZX07XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGFsbCBkZWNvcmF0b3JzIG9uIGEgYERlY2xhcmF0aW9uYCB3aGljaCBhcmUgZnJvbSBAYW5ndWxhci9jb3JlLCBvciBhbiBlbXB0eSBzZXQgaWYgbm9uZVxuICAgKiBhcmUuXG4gICAqL1xuICBwcml2YXRlIF9hbmd1bGFyQ29yZURlY29yYXRvcnMoZGVjbDogdHMuRGVjbGFyYXRpb24pOiBTZXQ8dHMuRGVjb3JhdG9yPiB7XG4gICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdG9yLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2wpO1xuICAgIGlmIChkZWNvcmF0b3JzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gTk9fREVDT1JBVE9SUztcbiAgICB9XG4gICAgY29uc3QgY29yZURlY29yYXRvcnMgPSBkZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gdGhpcy5pc0NvcmUgfHwgaXNGcm9tQW5ndWxhckNvcmUoZGVjKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGRlYyA9PiBkZWMubm9kZSBhcyB0cy5EZWNvcmF0b3IpO1xuICAgIGlmIChjb3JlRGVjb3JhdG9ycy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gbmV3IFNldDx0cy5EZWNvcmF0b3I+KGNvcmVEZWNvcmF0b3JzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIE5PX0RFQ09SQVRPUlM7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGEgYHRzLk5vZGVgLCBmaWx0ZXIgdGhlIGRlY29yYXRvcnMgYXJyYXkgYW5kIHJldHVybiBhIHZlcnNpb24gY29udGFpbmluZyBvbmx5IG5vbi1Bbmd1bGFyXG4gICAqIGRlY29yYXRvcnMuXG4gICAqXG4gICAqIElmIGFsbCBkZWNvcmF0b3JzIGFyZSByZW1vdmVkIChvciBub25lIGV4aXN0ZWQgaW4gdGhlIGZpcnN0IHBsYWNlKSwgdGhpcyBtZXRob2QgcmV0dXJuc1xuICAgKiBgdW5kZWZpbmVkYC5cbiAgICovXG4gIHByaXZhdGUgX25vbkNvcmVEZWNvcmF0b3JzT25seShub2RlOiB0cy5EZWNsYXJhdGlvbik6IHRzLk5vZGVBcnJheTx0cy5EZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gICAgLy8gU2hvcnRjdXQgaWYgdGhlIG5vZGUgaGFzIG5vIGRlY29yYXRvcnMuXG4gICAgaWYgKG5vZGUuZGVjb3JhdG9ycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICAvLyBCdWlsZCBhIFNldCBvZiB0aGUgZGVjb3JhdG9ycyBvbiB0aGlzIG5vZGUgZnJvbSBAYW5ndWxhci9jb3JlLlxuICAgIGNvbnN0IGNvcmVEZWNvcmF0b3JzID0gdGhpcy5fYW5ndWxhckNvcmVEZWNvcmF0b3JzKG5vZGUpO1xuXG4gICAgaWYgKGNvcmVEZWNvcmF0b3JzLnNpemUgPT09IG5vZGUuZGVjb3JhdG9ycy5sZW5ndGgpIHtcbiAgICAgIC8vIElmIGFsbCBkZWNvcmF0b3JzIGFyZSB0byBiZSByZW1vdmVkLCByZXR1cm4gYHVuZGVmaW5lZGAuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSBpZiAoY29yZURlY29yYXRvcnMuc2l6ZSA9PT0gMCkge1xuICAgICAgLy8gSWYgbm8gZGVjb3JhdG9ycyBuZWVkIHRvIGJlIHJlbW92ZWQsIHJldHVybiB0aGUgb3JpZ2luYWwgZGVjb3JhdG9ycyBhcnJheS5cbiAgICAgIHJldHVybiBub2RlLmRlY29yYXRvcnM7XG4gICAgfVxuXG4gICAgLy8gRmlsdGVyIG91dCB0aGUgY29yZSBkZWNvcmF0b3JzLlxuICAgIGNvbnN0IGZpbHRlcmVkID0gbm9kZS5kZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gIWNvcmVEZWNvcmF0b3JzLmhhcyhkZWMpKTtcblxuICAgIC8vIElmIG5vIGRlY29yYXRvcnMgc3Vydml2ZSwgcmV0dXJuIGB1bmRlZmluZWRgLiBUaGlzIGNhbiBvbmx5IGhhcHBlbiBpZiBhIGNvcmUgZGVjb3JhdG9yIGlzXG4gICAgLy8gcmVwZWF0ZWQgb24gdGhlIG5vZGUuXG4gICAgaWYgKGZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBuZXcgYE5vZGVBcnJheWAgd2l0aCB0aGUgZmlsdGVyZWQgZGVjb3JhdG9ycyB0aGF0IHNvdXJjZW1hcHMgYmFjayB0byB0aGUgb3JpZ2luYWwuXG4gICAgY29uc3QgYXJyYXkgPSB0cy5jcmVhdGVOb2RlQXJyYXkoZmlsdGVyZWQpO1xuICAgIGFycmF5LnBvcyA9IG5vZGUuZGVjb3JhdG9ycy5wb3M7XG4gICAgYXJyYXkuZW5kID0gbm9kZS5kZWNvcmF0b3JzLmVuZDtcbiAgICByZXR1cm4gYXJyYXk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIEFuZ3VsYXIgZGVjb3JhdG9ycyBmcm9tIGEgYHRzLk5vZGVgIGluIGEgc2hhbGxvdyBtYW5uZXIuXG4gICAqXG4gICAqIFRoaXMgd2lsbCByZW1vdmUgZGVjb3JhdG9ycyBmcm9tIGNsYXNzIGVsZW1lbnRzIChnZXR0ZXJzLCBzZXR0ZXJzLCBwcm9wZXJ0aWVzLCBtZXRob2RzKSBhcyB3ZWxsXG4gICAqIGFzIHBhcmFtZXRlcnMgb2YgY29uc3RydWN0b3JzLlxuICAgKi9cbiAgcHJpdmF0ZSBfc3RyaXBBbmd1bGFyRGVjb3JhdG9yczxUIGV4dGVuZHMgdHMuTm9kZT4obm9kZTogVCk6IFQge1xuICAgIGlmICh0cy5pc1BhcmFtZXRlcihub2RlKSkge1xuICAgICAgLy8gU3RyaXAgZGVjb3JhdG9ycyBmcm9tIHBhcmFtZXRlcnMgKHByb2JhYmx5IG9mIHRoZSBjb25zdHJ1Y3RvcikuXG4gICAgICBub2RlID0gdHMudXBkYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgICAgICBub2RlLCB0aGlzLl9ub25Db3JlRGVjb3JhdG9yc09ubHkobm9kZSksIG5vZGUubW9kaWZpZXJzLCBub2RlLmRvdERvdERvdFRva2VuLFxuICAgICAgICAgICAgICAgICBub2RlLm5hbWUsIG5vZGUucXVlc3Rpb25Ub2tlbiwgbm9kZS50eXBlLCBub2RlLmluaXRpYWxpemVyKSBhcyBUICZcbiAgICAgICAgICB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzTWV0aG9kRGVjbGFyYXRpb24obm9kZSkgJiYgbm9kZS5kZWNvcmF0b3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFN0cmlwIGRlY29yYXRvcnMgb2YgbWV0aG9kcy5cbiAgICAgIG5vZGUgPSB0cy51cGRhdGVNZXRob2QoXG4gICAgICAgICAgICAgICAgIG5vZGUsIHRoaXMuX25vbkNvcmVEZWNvcmF0b3JzT25seShub2RlKSwgbm9kZS5tb2RpZmllcnMsIG5vZGUuYXN0ZXJpc2tUb2tlbixcbiAgICAgICAgICAgICAgICAgbm9kZS5uYW1lLCBub2RlLnF1ZXN0aW9uVG9rZW4sIG5vZGUudHlwZVBhcmFtZXRlcnMsIG5vZGUucGFyYW1ldGVycywgbm9kZS50eXBlLFxuICAgICAgICAgICAgICAgICBub2RlLmJvZHkpIGFzIFQgJlxuICAgICAgICAgIHRzLk1ldGhvZERlY2xhcmF0aW9uO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQcm9wZXJ0eURlY2xhcmF0aW9uKG5vZGUpICYmIG5vZGUuZGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIHByb3BlcnRpZXMuXG4gICAgICBub2RlID0gdHMudXBkYXRlUHJvcGVydHkoXG4gICAgICAgICAgICAgICAgIG5vZGUsIHRoaXMuX25vbkNvcmVEZWNvcmF0b3JzT25seShub2RlKSwgbm9kZS5tb2RpZmllcnMsIG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5xdWVzdGlvblRva2VuLCBub2RlLnR5cGUsIG5vZGUuaW5pdGlhbGl6ZXIpIGFzIFQgJlxuICAgICAgICAgIHRzLlByb3BlcnR5RGVjbGFyYXRpb247XG4gICAgfSBlbHNlIGlmICh0cy5pc0dldEFjY2Vzc29yKG5vZGUpKSB7XG4gICAgICAvLyBTdHJpcCBkZWNvcmF0b3JzIG9mIGdldHRlcnMuXG4gICAgICBub2RlID0gdHMudXBkYXRlR2V0QWNjZXNzb3IoXG4gICAgICAgICAgICAgICAgIG5vZGUsIHRoaXMuX25vbkNvcmVEZWNvcmF0b3JzT25seShub2RlKSwgbm9kZS5tb2RpZmllcnMsIG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgbm9kZS5wYXJhbWV0ZXJzLCBub2RlLnR5cGUsIG5vZGUuYm9keSkgYXMgVCAmXG4gICAgICAgICAgdHMuR2V0QWNjZXNzb3JEZWNsYXJhdGlvbjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzU2V0QWNjZXNzb3Iobm9kZSkpIHtcbiAgICAgIC8vIFN0cmlwIGRlY29yYXRvcnMgb2Ygc2V0dGVycy5cbiAgICAgIG5vZGUgPSB0cy51cGRhdGVTZXRBY2Nlc3NvcihcbiAgICAgICAgICAgICAgICAgbm9kZSwgdGhpcy5fbm9uQ29yZURlY29yYXRvcnNPbmx5KG5vZGUpLCBub2RlLm1vZGlmaWVycywgbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICBub2RlLnBhcmFtZXRlcnMsIG5vZGUuYm9keSkgYXMgVCAmXG4gICAgICAgICAgdHMuU2V0QWNjZXNzb3JEZWNsYXJhdGlvbjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ29uc3RydWN0b3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgLy8gRm9yIGNvbnN0cnVjdG9ycywgc3RyaXAgZGVjb3JhdG9ycyBvZiB0aGUgcGFyYW1ldGVycy5cbiAgICAgIGNvbnN0IHBhcmFtZXRlcnMgPSBub2RlLnBhcmFtZXRlcnMubWFwKHBhcmFtID0+IHRoaXMuX3N0cmlwQW5ndWxhckRlY29yYXRvcnMocGFyYW0pKTtcbiAgICAgIG5vZGUgPVxuICAgICAgICAgIHRzLnVwZGF0ZUNvbnN0cnVjdG9yKG5vZGUsIG5vZGUuZGVjb3JhdG9ycywgbm9kZS5tb2RpZmllcnMsIHBhcmFtZXRlcnMsIG5vZGUuYm9keSkgYXMgVCAmXG4gICAgICAgICAgdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHRyYW5zZm9ybWVyIHdoaWNoIG9wZXJhdGVzIG9uIHRzLlNvdXJjZUZpbGVzIGFuZCBhcHBsaWVzIGNoYW5nZXMgZnJvbSBhbiBgSXZ5Q29tcGlsYXRpb25gLlxuICovXG5mdW5jdGlvbiB0cmFuc2Zvcm1JdnlTb3VyY2VGaWxlKFxuICAgIGNvbXBpbGF0aW9uOiBJdnlDb21waWxhdGlvbiwgY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0LCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlciwgaXNDb3JlOiBib29sZWFuLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IGNvbnN0YW50UG9vbCA9IG5ldyBDb25zdGFudFBvb2woKTtcbiAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKGltcG9ydFJld3JpdGVyKTtcblxuICAvLyBSZWN1cnNpdmVseSBzY2FuIHRocm91Z2ggdGhlIEFTVCBhbmQgcGVyZm9ybSBhbnkgdXBkYXRlcyByZXF1ZXN0ZWQgYnkgdGhlIEl2eUNvbXBpbGF0aW9uLlxuICBjb25zdCB2aXNpdG9yID0gbmV3IEl2eVZpc2l0b3IoY29tcGlsYXRpb24sIHJlZmxlY3RvciwgaW1wb3J0TWFuYWdlciwgaXNDb3JlLCBjb25zdGFudFBvb2wpO1xuICBjb25zdCBzZiA9IHZpc2l0KGZpbGUsIHZpc2l0b3IsIGNvbnRleHQpO1xuXG4gIC8vIEdlbmVyYXRlIHRoZSBjb25zdGFudCBzdGF0ZW1lbnRzIGZpcnN0LCBhcyB0aGV5IG1heSBpbnZvbHZlIGFkZGluZyBhZGRpdGlvbmFsIGltcG9ydHNcbiAgLy8gdG8gdGhlIEltcG9ydE1hbmFnZXIuXG4gIGNvbnN0IGNvbnN0YW50cyA9IGNvbnN0YW50UG9vbC5zdGF0ZW1lbnRzLm1hcChzdG10ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdG10LCBpbXBvcnRNYW5hZ2VyKSk7XG5cbiAgLy8gQWRkIG5ldyBpbXBvcnRzIGZvciB0aGlzIGZpbGUuXG4gIHJldHVybiBhZGRJbXBvcnRzKGltcG9ydE1hbmFnZXIsIHNmLCBjb25zdGFudHMpO1xufVxuXG5mdW5jdGlvbiBtYXliZUZpbHRlckRlY29yYXRvcihcbiAgICBkZWNvcmF0b3JzOiB0cy5Ob2RlQXJyYXk8dHMuRGVjb3JhdG9yPnwgdW5kZWZpbmVkLFxuICAgIHRvUmVtb3ZlOiB0cy5EZWNvcmF0b3JbXSk6IHRzLk5vZGVBcnJheTx0cy5EZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gIGlmIChkZWNvcmF0b3JzID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGZpbHRlcmVkID0gZGVjb3JhdG9ycy5maWx0ZXIoXG4gICAgICBkZWMgPT4gdG9SZW1vdmUuZmluZChkZWNUb1JlbW92ZSA9PiB0cy5nZXRPcmlnaW5hbE5vZGUoZGVjKSA9PT0gZGVjVG9SZW1vdmUpID09PSB1bmRlZmluZWQpO1xuICBpZiAoZmlsdGVyZWQubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdHMuY3JlYXRlTm9kZUFycmF5KGZpbHRlcmVkKTtcbn1cblxuZnVuY3Rpb24gaXNGcm9tQW5ndWxhckNvcmUoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBib29sZWFuIHtcbiAgcmV0dXJuIGRlY29yYXRvci5pbXBvcnQgIT09IG51bGwgJiYgZGVjb3JhdG9yLmltcG9ydC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZSc7XG59XG4iXX0=