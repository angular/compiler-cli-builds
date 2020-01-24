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
        define("@angular/compiler-cli/src/ngtsc/transform/src/declaration", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/transform/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var utils_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/utils");
    /**
     * Keeps track of `DtsTransform`s per source file, so that it is known which source files need to
     * have their declaration file transformed.
     */
    var DtsTransformRegistry = /** @class */ (function () {
        function DtsTransformRegistry() {
            this.ivyDeclarationTransforms = new Map();
            this.returnTypeTransforms = new Map();
        }
        DtsTransformRegistry.prototype.getIvyDeclarationTransform = function (sf) {
            if (!this.ivyDeclarationTransforms.has(sf)) {
                this.ivyDeclarationTransforms.set(sf, new IvyDeclarationDtsTransform());
            }
            return this.ivyDeclarationTransforms.get(sf);
        };
        DtsTransformRegistry.prototype.getReturnTypeTransform = function (sf) {
            if (!this.returnTypeTransforms.has(sf)) {
                this.returnTypeTransforms.set(sf, new ReturnTypeTransform());
            }
            return this.returnTypeTransforms.get(sf);
        };
        /**
         * Gets the dts transforms to be applied for the given source file, or `null` if no transform is
         * necessary.
         */
        DtsTransformRegistry.prototype.getAllTransforms = function (sf) {
            // No need to transform if it's not a declarations file, or if no changes have been requested
            // to the input file. Due to the way TypeScript afterDeclarations transformers work, the
            // `ts.SourceFile` path is the same as the original .ts. The only way we know it's actually a
            // declaration file is via the `isDeclarationFile` property.
            if (!sf.isDeclarationFile) {
                return null;
            }
            var originalSf = ts.getOriginalNode(sf);
            var transforms = null;
            if (this.ivyDeclarationTransforms.has(originalSf)) {
                transforms = [];
                transforms.push(this.ivyDeclarationTransforms.get(originalSf));
            }
            if (this.returnTypeTransforms.has(originalSf)) {
                transforms = transforms || [];
                transforms.push(this.returnTypeTransforms.get(originalSf));
            }
            return transforms;
        };
        return DtsTransformRegistry;
    }());
    exports.DtsTransformRegistry = DtsTransformRegistry;
    function declarationTransformFactory(transformRegistry, importRewriter, importPrefix) {
        return function (context) {
            var transformer = new DtsTransformer(context, importRewriter, importPrefix);
            return function (fileOrBundle) {
                if (ts.isBundle(fileOrBundle)) {
                    // Only attempt to transform source files.
                    return fileOrBundle;
                }
                var transforms = transformRegistry.getAllTransforms(fileOrBundle);
                if (transforms === null) {
                    return fileOrBundle;
                }
                return transformer.transform(fileOrBundle, transforms);
            };
        };
    }
    exports.declarationTransformFactory = declarationTransformFactory;
    /**
     * Processes .d.ts file text and adds static field declarations, with types.
     */
    var DtsTransformer = /** @class */ (function () {
        function DtsTransformer(ctx, importRewriter, importPrefix) {
            this.ctx = ctx;
            this.importRewriter = importRewriter;
            this.importPrefix = importPrefix;
        }
        /**
         * Transform the declaration file and add any declarations which were recorded.
         */
        DtsTransformer.prototype.transform = function (sf, transforms) {
            var _this = this;
            var imports = new translator_1.ImportManager(this.importRewriter, this.importPrefix);
            var visitor = function (node) {
                if (ts.isClassDeclaration(node)) {
                    return _this.transformClassDeclaration(node, transforms, imports);
                }
                else if (ts.isFunctionDeclaration(node)) {
                    return _this.transformFunctionDeclaration(node, transforms, imports);
                }
                else {
                    // Otherwise return node as is.
                    return ts.visitEachChild(node, visitor, _this.ctx);
                }
            };
            // Recursively scan through the AST and process all nodes as desired.
            sf = ts.visitNode(sf, visitor);
            // Add new imports for this file.
            return utils_1.addImports(imports, sf);
        };
        DtsTransformer.prototype.transformClassDeclaration = function (clazz, transforms, imports) {
            var e_1, _a, e_2, _b;
            var elements = clazz.members;
            var elementsChanged = false;
            try {
                for (var transforms_1 = tslib_1.__values(transforms), transforms_1_1 = transforms_1.next(); !transforms_1_1.done; transforms_1_1 = transforms_1.next()) {
                    var transform = transforms_1_1.value;
                    if (transform.transformClassElement !== undefined) {
                        for (var i = 0; i < elements.length; i++) {
                            var res = transform.transformClassElement(elements[i], imports);
                            if (res !== elements[i]) {
                                if (!elementsChanged) {
                                    elements = tslib_1.__spread(elements);
                                    elementsChanged = true;
                                }
                                elements[i] = res;
                            }
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (transforms_1_1 && !transforms_1_1.done && (_a = transforms_1.return)) _a.call(transforms_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var newClazz = clazz;
            try {
                for (var transforms_2 = tslib_1.__values(transforms), transforms_2_1 = transforms_2.next(); !transforms_2_1.done; transforms_2_1 = transforms_2.next()) {
                    var transform = transforms_2_1.value;
                    if (transform.transformClass !== undefined) {
                        // If no DtsTransform has changed the class yet, then the (possibly mutated) elements have
                        // not yet been incorporated. Otherwise, `newClazz.members` holds the latest class members.
                        var inputMembers = (clazz === newClazz ? elements : newClazz.members);
                        newClazz = transform.transformClass(newClazz, inputMembers, imports);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (transforms_2_1 && !transforms_2_1.done && (_b = transforms_2.return)) _b.call(transforms_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
            // If some elements have been transformed but the class itself has not been transformed, create
            // an updated class declaration with the updated elements.
            if (elementsChanged && clazz === newClazz) {
                newClazz = ts.updateClassDeclaration(
                /* node */ clazz, 
                /* decorators */ clazz.decorators, 
                /* modifiers */ clazz.modifiers, 
                /* name */ clazz.name, 
                /* typeParameters */ clazz.typeParameters, 
                /* heritageClauses */ clazz.heritageClauses, 
                /* members */ elements);
            }
            return newClazz;
        };
        DtsTransformer.prototype.transformFunctionDeclaration = function (declaration, transforms, imports) {
            var e_3, _a;
            var newDecl = declaration;
            try {
                for (var transforms_3 = tslib_1.__values(transforms), transforms_3_1 = transforms_3.next(); !transforms_3_1.done; transforms_3_1 = transforms_3.next()) {
                    var transform = transforms_3_1.value;
                    if (transform.transformFunctionDeclaration !== undefined) {
                        newDecl = transform.transformFunctionDeclaration(newDecl, imports);
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (transforms_3_1 && !transforms_3_1.done && (_a = transforms_3.return)) _a.call(transforms_3);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return newDecl;
        };
        return DtsTransformer;
    }());
    var IvyDeclarationDtsTransform = /** @class */ (function () {
        function IvyDeclarationDtsTransform() {
            this.declarationFields = new Map();
        }
        IvyDeclarationDtsTransform.prototype.addFields = function (decl, fields) {
            this.declarationFields.set(decl, fields);
        };
        IvyDeclarationDtsTransform.prototype.transformClass = function (clazz, members, imports) {
            var original = ts.getOriginalNode(clazz);
            if (!this.declarationFields.has(original)) {
                return clazz;
            }
            var fields = this.declarationFields.get(original);
            var newMembers = fields.map(function (decl) {
                var modifiers = [ts.createModifier(ts.SyntaxKind.StaticKeyword)];
                var typeRef = translator_1.translateType(decl.type, imports);
                emitAsSingleLine(typeRef);
                return ts.createProperty(
                /* decorators */ undefined, 
                /* modifiers */ modifiers, 
                /* name */ decl.name, 
                /* questionOrExclamationToken */ undefined, 
                /* type */ typeRef, 
                /* initializer */ undefined);
            });
            return ts.updateClassDeclaration(
            /* node */ clazz, 
            /* decorators */ clazz.decorators, 
            /* modifiers */ clazz.modifiers, 
            /* name */ clazz.name, 
            /* typeParameters */ clazz.typeParameters, 
            /* heritageClauses */ clazz.heritageClauses, tslib_1.__spread(members, newMembers));
        };
        return IvyDeclarationDtsTransform;
    }());
    exports.IvyDeclarationDtsTransform = IvyDeclarationDtsTransform;
    function emitAsSingleLine(node) {
        ts.setEmitFlags(node, ts.EmitFlags.SingleLine);
        ts.forEachChild(node, emitAsSingleLine);
    }
    var ReturnTypeTransform = /** @class */ (function () {
        function ReturnTypeTransform() {
            this.typeReplacements = new Map();
        }
        ReturnTypeTransform.prototype.addTypeReplacement = function (declaration, type) {
            this.typeReplacements.set(declaration, type);
        };
        ReturnTypeTransform.prototype.transformClassElement = function (element, imports) {
            if (!ts.isMethodSignature(element)) {
                return element;
            }
            var original = ts.getOriginalNode(element);
            if (!this.typeReplacements.has(original)) {
                return element;
            }
            var returnType = this.typeReplacements.get(original);
            var tsReturnType = translator_1.translateType(returnType, imports);
            var methodSignature = ts.updateMethodSignature(
            /* node */ element, 
            /* typeParameters */ element.typeParameters, 
            /* parameters */ element.parameters, 
            /* type */ tsReturnType, 
            /* name */ element.name, 
            /* questionToken */ element.questionToken);
            // Copy over any modifiers, these cannot be set during the `ts.updateMethodSignature` call.
            methodSignature.modifiers = element.modifiers;
            // A bug in the TypeScript declaration causes `ts.MethodSignature` not to be assignable to
            // `ts.ClassElement`. Since `element` was a `ts.MethodSignature` already, transforming it into
            // this type is actually correct.
            return methodSignature;
        };
        ReturnTypeTransform.prototype.transformFunctionDeclaration = function (element, imports) {
            var original = ts.getOriginalNode(element);
            if (!this.typeReplacements.has(original)) {
                return element;
            }
            var returnType = this.typeReplacements.get(original);
            var tsReturnType = translator_1.translateType(returnType, imports);
            return ts.updateFunctionDeclaration(
            /* node */ element, 
            /* decorators */ element.decorators, 
            /* modifiers */ element.modifiers, 
            /* asteriskToken */ element.asteriskToken, 
            /* name */ element.name, 
            /* typeParameters */ element.typeParameters, 
            /* parameters */ element.parameters, 
            /* type */ tsReturnType, 
            /* body */ element.body);
        };
        return ReturnTypeTransform;
    }());
    exports.ReturnTypeTransform = ReturnTypeTransform;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjbGFyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvZGVjbGFyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBSWpDLHlFQUE4RDtJQUc5RCw2RUFBbUM7SUFFbkM7OztPQUdHO0lBQ0g7UUFBQTtZQUNVLDZCQUF3QixHQUFHLElBQUksR0FBRyxFQUE2QyxDQUFDO1lBQ2hGLHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO1FBeUMvRSxDQUFDO1FBdkNDLHlEQUEwQixHQUExQixVQUEyQixFQUFpQjtZQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDMUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSwwQkFBMEIsRUFBRSxDQUFDLENBQUM7YUFDekU7WUFDRCxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFHLENBQUM7UUFDakQsQ0FBQztRQUVELHFEQUFzQixHQUF0QixVQUF1QixFQUFpQjtZQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDdEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxtQkFBbUIsRUFBRSxDQUFDLENBQUM7YUFDOUQ7WUFDRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFHLENBQUM7UUFDN0MsQ0FBQztRQUVEOzs7V0FHRztRQUNILCtDQUFnQixHQUFoQixVQUFpQixFQUFpQjtZQUNoQyw2RkFBNkY7WUFD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LFVBQVU7WUFDbkMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxTQUFTO1lBQ2pDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxhQUFhO1lBQ3pDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSTtZQUN2QixvQkFBb0IsQ0FBQyxPQUFPLENBQUMsY0FBYztZQUMzQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBVTtZQUNuQyxVQUFVLENBQUMsWUFBWTtZQUN2QixVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLENBQUM7UUFDSCwwQkFBQztJQUFELENBQUMsQUF4REQsSUF3REM7SUF4RFksa0RBQW1CIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1R5cGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0ltcG9ydFJld3JpdGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZVR5cGV9IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuXG5pbXBvcnQge0R0c1RyYW5zZm9ybX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHthZGRJbXBvcnRzfSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBLZWVwcyB0cmFjayBvZiBgRHRzVHJhbnNmb3JtYHMgcGVyIHNvdXJjZSBmaWxlLCBzbyB0aGF0IGl0IGlzIGtub3duIHdoaWNoIHNvdXJjZSBmaWxlcyBuZWVkIHRvXG4gKiBoYXZlIHRoZWlyIGRlY2xhcmF0aW9uIGZpbGUgdHJhbnNmb3JtZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBEdHNUcmFuc2Zvcm1SZWdpc3RyeSB7XG4gIHByaXZhdGUgaXZ5RGVjbGFyYXRpb25UcmFuc2Zvcm1zID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBJdnlEZWNsYXJhdGlvbkR0c1RyYW5zZm9ybT4oKTtcbiAgcHJpdmF0ZSByZXR1cm5UeXBlVHJhbnNmb3JtcyA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgUmV0dXJuVHlwZVRyYW5zZm9ybT4oKTtcblxuICBnZXRJdnlEZWNsYXJhdGlvblRyYW5zZm9ybShzZjogdHMuU291cmNlRmlsZSk6IEl2eURlY2xhcmF0aW9uRHRzVHJhbnNmb3JtIHtcbiAgICBpZiAoIXRoaXMuaXZ5RGVjbGFyYXRpb25UcmFuc2Zvcm1zLmhhcyhzZikpIHtcbiAgICAgIHRoaXMuaXZ5RGVjbGFyYXRpb25UcmFuc2Zvcm1zLnNldChzZiwgbmV3IEl2eURlY2xhcmF0aW9uRHRzVHJhbnNmb3JtKCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5pdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMuZ2V0KHNmKSAhO1xuICB9XG5cbiAgZ2V0UmV0dXJuVHlwZVRyYW5zZm9ybShzZjogdHMuU291cmNlRmlsZSk6IFJldHVyblR5cGVUcmFuc2Zvcm0ge1xuICAgIGlmICghdGhpcy5yZXR1cm5UeXBlVHJhbnNmb3Jtcy5oYXMoc2YpKSB7XG4gICAgICB0aGlzLnJldHVyblR5cGVUcmFuc2Zvcm1zLnNldChzZiwgbmV3IFJldHVyblR5cGVUcmFuc2Zvcm0oKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJldHVyblR5cGVUcmFuc2Zvcm1zLmdldChzZikgITtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBkdHMgdHJhbnNmb3JtcyB0byBiZSBhcHBsaWVkIGZvciB0aGUgZ2l2ZW4gc291cmNlIGZpbGUsIG9yIGBudWxsYCBpZiBubyB0cmFuc2Zvcm0gaXNcbiAgICogbmVjZXNzYXJ5LlxuICAgKi9cbiAgZ2V0QWxsVHJhbnNmb3JtcyhzZjogdHMuU291cmNlRmlsZSk6IER0c1RyYW5zZm9ybVtdfG51bGwge1xuICAgIC8vIE5vIG5lZWQgdG8gdHJhbnNmb3JtIGlmIGl0J3Mgbm90IGEgZGVjbGFyYXRpb25zIGZpbGUsIG9yIGlmIG5vIGNoYW5nZXMgaGF2ZSBiZWVuIHJlcXVlc3RlZFxuICAgIC8vIHRvIHRoZSBpbnB1dCBmaWxlLiBEdWUgdG8gdGhlIHdheSBUeXBlU2NyaXB0IGFmdGVyRGVjbGFyYXRpb25zIHRyYW5zZm9ybWVycyB3b3JrLCB0aGVcbiAgICAvLyBgdHMuU291cmNlRmlsZWAgcGF0aCBpcyB0aGUgc2FtZSBhcyB0aGUgb3JpZ2luYWwgLnRzLiBUaGUgb25seSB3YXkgd2Uga25vdyBpdCdzIGFjdHVhbGx5IGFcbiAgICAvLyBkZWNsYXJhdGlvbiBmaWxlIGlzIHZpYSB0aGUgYGlzRGVjbGFyYXRpb25GaWxlYCBwcm9wZXJ0eS5cbiAgICBpZiAoIXNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgb3JpZ2luYWxTZiA9IHRzLmdldE9yaWdpbmFsTm9kZShzZikgYXMgdHMuU291cmNlRmlsZTtcblxuICAgIGxldCB0cmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1bXXxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5pdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMuaGFzKG9yaWdpbmFsU2YpKSB7XG4gICAgICB0cmFuc2Zvcm1zID0gW107XG4gICAgICB0cmFuc2Zvcm1zLnB1c2godGhpcy5pdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMuZ2V0KG9yaWdpbmFsU2YpICEpO1xuICAgIH1cbiAgICBpZiAodGhpcy5yZXR1cm5UeXBlVHJhbnNmb3Jtcy5oYXMob3JpZ2luYWxTZikpIHtcbiAgICAgIHRyYW5zZm9ybXMgPSB0cmFuc2Zvcm1zIHx8IFtdO1xuICAgICAgdHJhbnNmb3Jtcy5wdXNoKHRoaXMucmV0dXJuVHlwZVRyYW5zZm9ybXMuZ2V0KG9yaWdpbmFsU2YpICEpO1xuICAgIH1cbiAgICByZXR1cm4gdHJhbnNmb3JtcztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5KFxuICAgIHRyYW5zZm9ybVJlZ2lzdHJ5OiBEdHNUcmFuc2Zvcm1SZWdpc3RyeSwgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyLFxuICAgIGltcG9ydFByZWZpeD86IHN0cmluZyk6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5CdW5kbGV8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IER0c1RyYW5zZm9ybWVyKGNvbnRleHQsIGltcG9ydFJld3JpdGVyLCBpbXBvcnRQcmVmaXgpO1xuICAgIHJldHVybiAoZmlsZU9yQnVuZGxlKSA9PiB7XG4gICAgICBpZiAodHMuaXNCdW5kbGUoZmlsZU9yQnVuZGxlKSkge1xuICAgICAgICAvLyBPbmx5IGF0dGVtcHQgdG8gdHJhbnNmb3JtIHNvdXJjZSBmaWxlcy5cbiAgICAgICAgcmV0dXJuIGZpbGVPckJ1bmRsZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRyYW5zZm9ybXMgPSB0cmFuc2Zvcm1SZWdpc3RyeS5nZXRBbGxUcmFuc2Zvcm1zKGZpbGVPckJ1bmRsZSk7XG4gICAgICBpZiAodHJhbnNmb3JtcyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZmlsZU9yQnVuZGxlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRyYW5zZm9ybWVyLnRyYW5zZm9ybShmaWxlT3JCdW5kbGUsIHRyYW5zZm9ybXMpO1xuICAgIH07XG4gIH07XG59XG5cbi8qKlxuICogUHJvY2Vzc2VzIC5kLnRzIGZpbGUgdGV4dCBhbmQgYWRkcyBzdGF0aWMgZmllbGQgZGVjbGFyYXRpb25zLCB3aXRoIHR5cGVzLlxuICovXG5jbGFzcyBEdHNUcmFuc2Zvcm1lciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjdHg6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCwgcHJpdmF0ZSBpbXBvcnRSZXdyaXRlcjogSW1wb3J0UmV3cml0ZXIsXG4gICAgICBwcml2YXRlIGltcG9ydFByZWZpeD86IHN0cmluZykge31cblxuICAvKipcbiAgICogVHJhbnNmb3JtIHRoZSBkZWNsYXJhdGlvbiBmaWxlIGFuZCBhZGQgYW55IGRlY2xhcmF0aW9ucyB3aGljaCB3ZXJlIHJlY29yZGVkLlxuICAgKi9cbiAgdHJhbnNmb3JtKHNmOiB0cy5Tb3VyY2VGaWxlLCB0cmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1bXSk6IHRzLlNvdXJjZUZpbGUge1xuICAgIGNvbnN0IGltcG9ydHMgPSBuZXcgSW1wb3J0TWFuYWdlcih0aGlzLmltcG9ydFJld3JpdGVyLCB0aGlzLmltcG9ydFByZWZpeCk7XG5cbiAgICBjb25zdCB2aXNpdG9yOiB0cy5WaXNpdG9yID0gKG5vZGU6IHRzLk5vZGUpOiB0cy5WaXNpdFJlc3VsdDx0cy5Ob2RlPiA9PiB7XG4gICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRyYW5zZm9ybUNsYXNzRGVjbGFyYXRpb24obm9kZSwgdHJhbnNmb3JtcywgaW1wb3J0cyk7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm1GdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUsIHRyYW5zZm9ybXMsIGltcG9ydHMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlIHJldHVybiBub2RlIGFzIGlzLlxuICAgICAgICByZXR1cm4gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgdmlzaXRvciwgdGhpcy5jdHgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBSZWN1cnNpdmVseSBzY2FuIHRocm91Z2ggdGhlIEFTVCBhbmQgcHJvY2VzcyBhbGwgbm9kZXMgYXMgZGVzaXJlZC5cbiAgICBzZiA9IHRzLnZpc2l0Tm9kZShzZiwgdmlzaXRvcik7XG5cbiAgICAvLyBBZGQgbmV3IGltcG9ydHMgZm9yIHRoaXMgZmlsZS5cbiAgICByZXR1cm4gYWRkSW1wb3J0cyhpbXBvcnRzLCBzZik7XG4gIH1cblxuICBwcml2YXRlIHRyYW5zZm9ybUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgdHJhbnNmb3JtczogRHRzVHJhbnNmb3JtW10sXG4gICAgICBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogdHMuQ2xhc3NEZWNsYXJhdGlvbiB7XG4gICAgbGV0IGVsZW1lbnRzOiB0cy5DbGFzc0VsZW1lbnRbXXxSZWFkb25seUFycmF5PHRzLkNsYXNzRWxlbWVudD4gPSBjbGF6ei5tZW1iZXJzO1xuICAgIGxldCBlbGVtZW50c0NoYW5nZWQgPSBmYWxzZTtcblxuICAgIGZvciAoY29uc3QgdHJhbnNmb3JtIG9mIHRyYW5zZm9ybXMpIHtcbiAgICAgIGlmICh0cmFuc2Zvcm0udHJhbnNmb3JtQ2xhc3NFbGVtZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IHJlcyA9IHRyYW5zZm9ybS50cmFuc2Zvcm1DbGFzc0VsZW1lbnQoZWxlbWVudHNbaV0sIGltcG9ydHMpO1xuICAgICAgICAgIGlmIChyZXMgIT09IGVsZW1lbnRzW2ldKSB7XG4gICAgICAgICAgICBpZiAoIWVsZW1lbnRzQ2hhbmdlZCkge1xuICAgICAgICAgICAgICBlbGVtZW50cyA9IFsuLi5lbGVtZW50c107XG4gICAgICAgICAgICAgIGVsZW1lbnRzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAoZWxlbWVudHMgYXMgdHMuQ2xhc3NFbGVtZW50W10pW2ldID0gcmVzO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBuZXdDbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiA9IGNsYXp6O1xuXG4gICAgZm9yIChjb25zdCB0cmFuc2Zvcm0gb2YgdHJhbnNmb3Jtcykge1xuICAgICAgaWYgKHRyYW5zZm9ybS50cmFuc2Zvcm1DbGFzcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIElmIG5vIER0c1RyYW5zZm9ybSBoYXMgY2hhbmdlZCB0aGUgY2xhc3MgeWV0LCB0aGVuIHRoZSAocG9zc2libHkgbXV0YXRlZCkgZWxlbWVudHMgaGF2ZVxuICAgICAgICAvLyBub3QgeWV0IGJlZW4gaW5jb3Jwb3JhdGVkLiBPdGhlcndpc2UsIGBuZXdDbGF6ei5tZW1iZXJzYCBob2xkcyB0aGUgbGF0ZXN0IGNsYXNzIG1lbWJlcnMuXG4gICAgICAgIGNvbnN0IGlucHV0TWVtYmVycyA9IChjbGF6eiA9PT0gbmV3Q2xhenogPyBlbGVtZW50cyA6IG5ld0NsYXp6Lm1lbWJlcnMpO1xuXG4gICAgICAgIG5ld0NsYXp6ID0gdHJhbnNmb3JtLnRyYW5zZm9ybUNsYXNzKG5ld0NsYXp6LCBpbnB1dE1lbWJlcnMsIGltcG9ydHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHNvbWUgZWxlbWVudHMgaGF2ZSBiZWVuIHRyYW5zZm9ybWVkIGJ1dCB0aGUgY2xhc3MgaXRzZWxmIGhhcyBub3QgYmVlbiB0cmFuc2Zvcm1lZCwgY3JlYXRlXG4gICAgLy8gYW4gdXBkYXRlZCBjbGFzcyBkZWNsYXJhdGlvbiB3aXRoIHRoZSB1cGRhdGVkIGVsZW1lbnRzLlxuICAgIGlmIChlbGVtZW50c0NoYW5nZWQgJiYgY2xhenogPT09IG5ld0NsYXp6KSB7XG4gICAgICBuZXdDbGF6eiA9IHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgLyogbm9kZSAqLyBjbGF6eixcbiAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIGNsYXp6LmRlY29yYXRvcnMsXG4gICAgICAgICAgLyogbW9kaWZpZXJzICovIGNsYXp6Lm1vZGlmaWVycyxcbiAgICAgICAgICAvKiBuYW1lICovIGNsYXp6Lm5hbWUsXG4gICAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gY2xhenoudHlwZVBhcmFtZXRlcnMsXG4gICAgICAgICAgLyogaGVyaXRhZ2VDbGF1c2VzICovIGNsYXp6Lmhlcml0YWdlQ2xhdXNlcyxcbiAgICAgICAgICAvKiBtZW1iZXJzICovIGVsZW1lbnRzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Q2xheno7XG4gIH1cblxuICBwcml2YXRlIHRyYW5zZm9ybUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICBkZWNsYXJhdGlvbjogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiwgdHJhbnNmb3JtczogRHRzVHJhbnNmb3JtW10sXG4gICAgICBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiB7XG4gICAgbGV0IG5ld0RlY2wgPSBkZWNsYXJhdGlvbjtcblxuICAgIGZvciAoY29uc3QgdHJhbnNmb3JtIG9mIHRyYW5zZm9ybXMpIHtcbiAgICAgIGlmICh0cmFuc2Zvcm0udHJhbnNmb3JtRnVuY3Rpb25EZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG5ld0RlY2wgPSB0cmFuc2Zvcm0udHJhbnNmb3JtRnVuY3Rpb25EZWNsYXJhdGlvbihuZXdEZWNsLCBpbXBvcnRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3RGVjbDtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEl2eURlY2xhcmF0aW9uRmllbGQge1xuICBuYW1lOiBzdHJpbmc7XG4gIHR5cGU6IFR5cGU7XG59XG5cbmV4cG9ydCBjbGFzcyBJdnlEZWNsYXJhdGlvbkR0c1RyYW5zZm9ybSBpbXBsZW1lbnRzIER0c1RyYW5zZm9ybSB7XG4gIHByaXZhdGUgZGVjbGFyYXRpb25GaWVsZHMgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIEl2eURlY2xhcmF0aW9uRmllbGRbXT4oKTtcblxuICBhZGRGaWVsZHMoZGVjbDogQ2xhc3NEZWNsYXJhdGlvbiwgZmllbGRzOiBJdnlEZWNsYXJhdGlvbkZpZWxkW10pOiB2b2lkIHtcbiAgICB0aGlzLmRlY2xhcmF0aW9uRmllbGRzLnNldChkZWNsLCBmaWVsZHMpO1xuICB9XG5cbiAgdHJhbnNmb3JtQ2xhc3MoXG4gICAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgbWVtYmVyczogUmVhZG9ubHlBcnJheTx0cy5DbGFzc0VsZW1lbnQ+LFxuICAgICAgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHRzLkNsYXNzRGVjbGFyYXRpb24ge1xuICAgIGNvbnN0IG9yaWdpbmFsID0gdHMuZ2V0T3JpZ2luYWxOb2RlKGNsYXp6KSBhcyBDbGFzc0RlY2xhcmF0aW9uO1xuXG4gICAgaWYgKCF0aGlzLmRlY2xhcmF0aW9uRmllbGRzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBjbGF6ejtcbiAgICB9XG4gICAgY29uc3QgZmllbGRzID0gdGhpcy5kZWNsYXJhdGlvbkZpZWxkcy5nZXQob3JpZ2luYWwpICE7XG5cbiAgICBjb25zdCBuZXdNZW1iZXJzID0gZmllbGRzLm1hcChkZWNsID0+IHtcbiAgICAgIGNvbnN0IG1vZGlmaWVycyA9IFt0cy5jcmVhdGVNb2RpZmllcih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpXTtcbiAgICAgIGNvbnN0IHR5cGVSZWYgPSB0cmFuc2xhdGVUeXBlKGRlY2wudHlwZSwgaW1wb3J0cyk7XG4gICAgICBlbWl0QXNTaW5nbGVMaW5lKHR5cGVSZWYpO1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5KFxuICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyBtb2RpZmllcnMsXG4gICAgICAgICAgLyogbmFtZSAqLyBkZWNsLm5hbWUsXG4gICAgICAgICAgLyogcXVlc3Rpb25PckV4Y2xhbWF0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIHR5cGUgKi8gdHlwZVJlZixcbiAgICAgICAgICAvKiBpbml0aWFsaXplciAqLyB1bmRlZmluZWQpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgIC8qIG5vZGUgKi8gY2xhenosXG4gICAgICAgIC8qIGRlY29yYXRvcnMgKi8gY2xhenouZGVjb3JhdG9ycyxcbiAgICAgICAgLyogbW9kaWZpZXJzICovIGNsYXp6Lm1vZGlmaWVycyxcbiAgICAgICAgLyogbmFtZSAqLyBjbGF6ei5uYW1lLFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyBjbGF6ei50eXBlUGFyYW1ldGVycyxcbiAgICAgICAgLyogaGVyaXRhZ2VDbGF1c2VzICovIGNsYXp6Lmhlcml0YWdlQ2xhdXNlcyxcbiAgICAgICAgLyogbWVtYmVycyAqL1suLi5tZW1iZXJzLCAuLi5uZXdNZW1iZXJzXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW1pdEFzU2luZ2xlTGluZShub2RlOiB0cy5Ob2RlKSB7XG4gIHRzLnNldEVtaXRGbGFncyhub2RlLCB0cy5FbWl0RmxhZ3MuU2luZ2xlTGluZSk7XG4gIHRzLmZvckVhY2hDaGlsZChub2RlLCBlbWl0QXNTaW5nbGVMaW5lKTtcbn1cblxuZXhwb3J0IGNsYXNzIFJldHVyblR5cGVUcmFuc2Zvcm0gaW1wbGVtZW50cyBEdHNUcmFuc2Zvcm0ge1xuICBwcml2YXRlIHR5cGVSZXBsYWNlbWVudHMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBUeXBlPigpO1xuXG4gIGFkZFR5cGVSZXBsYWNlbWVudChkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24sIHR5cGU6IFR5cGUpOiB2b2lkIHtcbiAgICB0aGlzLnR5cGVSZXBsYWNlbWVudHMuc2V0KGRlY2xhcmF0aW9uLCB0eXBlKTtcbiAgfVxuXG4gIHRyYW5zZm9ybUNsYXNzRWxlbWVudChlbGVtZW50OiB0cy5DbGFzc0VsZW1lbnQsIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiB0cy5DbGFzc0VsZW1lbnQge1xuICAgIGlmICghdHMuaXNNZXRob2RTaWduYXR1cmUoZWxlbWVudCkpIHtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH1cblxuICAgIGNvbnN0IG9yaWdpbmFsID0gdHMuZ2V0T3JpZ2luYWxOb2RlKGVsZW1lbnQpIGFzIHRzLk1ldGhvZERlY2xhcmF0aW9uO1xuICAgIGlmICghdGhpcy50eXBlUmVwbGFjZW1lbnRzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH1cbiAgICBjb25zdCByZXR1cm5UeXBlID0gdGhpcy50eXBlUmVwbGFjZW1lbnRzLmdldChvcmlnaW5hbCkgITtcbiAgICBjb25zdCB0c1JldHVyblR5cGUgPSB0cmFuc2xhdGVUeXBlKHJldHVyblR5cGUsIGltcG9ydHMpO1xuXG4gICAgY29uc3QgbWV0aG9kU2lnbmF0dXJlID0gdHMudXBkYXRlTWV0aG9kU2lnbmF0dXJlKFxuICAgICAgICAvKiBub2RlICovIGVsZW1lbnQsXG4gICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIGVsZW1lbnQudHlwZVBhcmFtZXRlcnMsXG4gICAgICAgIC8qIHBhcmFtZXRlcnMgKi8gZWxlbWVudC5wYXJhbWV0ZXJzLFxuICAgICAgICAvKiB0eXBlICovIHRzUmV0dXJuVHlwZSxcbiAgICAgICAgLyogbmFtZSAqLyBlbGVtZW50Lm5hbWUsXG4gICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gZWxlbWVudC5xdWVzdGlvblRva2VuKTtcblxuICAgIC8vIENvcHkgb3ZlciBhbnkgbW9kaWZpZXJzLCB0aGVzZSBjYW5ub3QgYmUgc2V0IGR1cmluZyB0aGUgYHRzLnVwZGF0ZU1ldGhvZFNpZ25hdHVyZWAgY2FsbC5cbiAgICBtZXRob2RTaWduYXR1cmUubW9kaWZpZXJzID0gZWxlbWVudC5tb2RpZmllcnM7XG5cbiAgICAvLyBBIGJ1ZyBpbiB0aGUgVHlwZVNjcmlwdCBkZWNsYXJhdGlvbiBjYXVzZXMgYHRzLk1ldGhvZFNpZ25hdHVyZWAgbm90IHRvIGJlIGFzc2lnbmFibGUgdG9cbiAgICAvLyBgdHMuQ2xhc3NFbGVtZW50YC4gU2luY2UgYGVsZW1lbnRgIHdhcyBhIGB0cy5NZXRob2RTaWduYXR1cmVgIGFscmVhZHksIHRyYW5zZm9ybWluZyBpdCBpbnRvXG4gICAgLy8gdGhpcyB0eXBlIGlzIGFjdHVhbGx5IGNvcnJlY3QuXG4gICAgcmV0dXJuIG1ldGhvZFNpZ25hdHVyZSBhcyB1bmtub3duIGFzIHRzLkNsYXNzRWxlbWVudDtcbiAgfVxuXG4gIHRyYW5zZm9ybUZ1bmN0aW9uRGVjbGFyYXRpb24oZWxlbWVudDogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiwgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6XG4gICAgICB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uIHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShlbGVtZW50KSBhcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAgIGlmICghdGhpcy50eXBlUmVwbGFjZW1lbnRzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH1cbiAgICBjb25zdCByZXR1cm5UeXBlID0gdGhpcy50eXBlUmVwbGFjZW1lbnRzLmdldChvcmlnaW5hbCkgITtcbiAgICBjb25zdCB0c1JldHVyblR5cGUgPSB0cmFuc2xhdGVUeXBlKHJldHVyblR5cGUsIGltcG9ydHMpO1xuXG4gICAgcmV0dXJuIHRzLnVwZGF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAgIC8qIG5vZGUgKi8gZWxlbWVudCxcbiAgICAgICAgLyogZGVjb3JhdG9ycyAqLyBlbGVtZW50LmRlY29yYXRvcnMsXG4gICAgICAgIC8qIG1vZGlmaWVycyAqLyBlbGVtZW50Lm1vZGlmaWVycyxcbiAgICAgICAgLyogYXN0ZXJpc2tUb2tlbiAqLyBlbGVtZW50LmFzdGVyaXNrVG9rZW4sXG4gICAgICAgIC8qIG5hbWUgKi8gZWxlbWVudC5uYW1lLFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyBlbGVtZW50LnR5cGVQYXJhbWV0ZXJzLFxuICAgICAgICAvKiBwYXJhbWV0ZXJzICovIGVsZW1lbnQucGFyYW1ldGVycyxcbiAgICAgICAgLyogdHlwZSAqLyB0c1JldHVyblR5cGUsXG4gICAgICAgIC8qIGJvZHkgKi8gZWxlbWVudC5ib2R5KTtcbiAgfVxufVxuIl19