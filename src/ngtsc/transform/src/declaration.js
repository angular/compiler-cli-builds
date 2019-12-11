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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjbGFyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvZGVjbGFyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBSWpDLHlFQUE4RDtJQUc5RCw2RUFBbUM7SUFFbkM7OztPQUdHO0lBQ0g7UUFBQTtZQUNVLDZCQUF3QixHQUFHLElBQUksR0FBRyxFQUE2QyxDQUFDO1lBQ2hGLHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO1FBeUMvRSxDQUFDO1FBdkNDLHlEQUEwQixHQUExQixVQUEyQixFQUFpQjtZQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDMUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSwwQkFBMEIsRUFBRSxDQUFDLENBQUM7YUFDekU7WUFDRCxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFHLENBQUM7UUFDakQsQ0FBQztRQUVELHFEQUFzQixHQUF0QixVQUF1QixFQUFpQjtZQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDdEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxtQkFBbUIsRUFBRSxDQUFDLENBQUM7YUFDOUQ7WUFDRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFHLENBQUM7UUFDN0MsQ0FBQztRQUVEOzs7V0FHRztRQUNILCtDQUFnQixHQUFoQixVQUFpQixFQUFpQjtZQUNoQyw2RkFBNkY7WUFD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QVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsQ0FBQztRQUNILDBCQUFDO0lBQUQsQ0FBQyxBQXhERCxJQXdEQztJQXhEWSxrREFBbUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7VHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7SW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlVHlwZX0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5cbmltcG9ydCB7RHRzVHJhbnNmb3JtfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2FkZEltcG9ydHN9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEtlZXBzIHRyYWNrIG9mIGBEdHNUcmFuc2Zvcm1gcyBwZXIgc291cmNlIGZpbGUsIHNvIHRoYXQgaXQgaXMga25vd24gd2hpY2ggc291cmNlIGZpbGVzIG5lZWQgdG9cbiAqIGhhdmUgdGhlaXIgZGVjbGFyYXRpb24gZmlsZSB0cmFuc2Zvcm1lZC5cbiAqL1xuZXhwb3J0IGNsYXNzIER0c1RyYW5zZm9ybVJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBpdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIEl2eURlY2xhcmF0aW9uRHRzVHJhbnNmb3JtPigpO1xuICBwcml2YXRlIHJldHVyblR5cGVUcmFuc2Zvcm1zID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBSZXR1cm5UeXBlVHJhbnNmb3JtPigpO1xuXG4gIGdldEl2eURlY2xhcmF0aW9uVHJhbnNmb3JtKHNmOiB0cy5Tb3VyY2VGaWxlKTogSXZ5RGVjbGFyYXRpb25EdHNUcmFuc2Zvcm0ge1xuICAgIGlmICghdGhpcy5pdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMuaGFzKHNmKSkge1xuICAgICAgdGhpcy5pdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMuc2V0KHNmLCBuZXcgSXZ5RGVjbGFyYXRpb25EdHNUcmFuc2Zvcm0oKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLml2eURlY2xhcmF0aW9uVHJhbnNmb3Jtcy5nZXQoc2YpICE7XG4gIH1cblxuICBnZXRSZXR1cm5UeXBlVHJhbnNmb3JtKHNmOiB0cy5Tb3VyY2VGaWxlKTogUmV0dXJuVHlwZVRyYW5zZm9ybSB7XG4gICAgaWYgKCF0aGlzLnJldHVyblR5cGVUcmFuc2Zvcm1zLmhhcyhzZikpIHtcbiAgICAgIHRoaXMucmV0dXJuVHlwZVRyYW5zZm9ybXMuc2V0KHNmLCBuZXcgUmV0dXJuVHlwZVRyYW5zZm9ybSgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmV0dXJuVHlwZVRyYW5zZm9ybXMuZ2V0KHNmKSAhO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGR0cyB0cmFuc2Zvcm1zIHRvIGJlIGFwcGxpZWQgZm9yIHRoZSBnaXZlbiBzb3VyY2UgZmlsZSwgb3IgYG51bGxgIGlmIG5vIHRyYW5zZm9ybSBpc1xuICAgKiBuZWNlc3NhcnkuXG4gICAqL1xuICBnZXRBbGxUcmFuc2Zvcm1zKHNmOiB0cy5Tb3VyY2VGaWxlKTogRHRzVHJhbnNmb3JtW118bnVsbCB7XG4gICAgLy8gTm8gbmVlZCB0byB0cmFuc2Zvcm0gaWYgaXQncyBub3QgYSBkZWNsYXJhdGlvbnMgZmlsZSwgb3IgaWYgbm8gY2hhbmdlcyBoYXZlIGJlZW4gcmVxdWVzdGVkXG4gICAgLy8gdG8gdGhlIGlucHV0IGZpbGUuIER1ZSB0byB0aGUgd2F5IFR5cGVTY3JpcHQgYWZ0ZXJEZWNsYXJhdGlvbnMgdHJhbnNmb3JtZXJzIHdvcmssIHRoZVxuICAgIC8vIGB0cy5Tb3VyY2VGaWxlYCBwYXRoIGlzIHRoZSBzYW1lIGFzIHRoZSBvcmlnaW5hbCAudHMuIFRoZSBvbmx5IHdheSB3ZSBrbm93IGl0J3MgYWN0dWFsbHkgYVxuICAgIC8vIGRlY2xhcmF0aW9uIGZpbGUgaXMgdmlhIHRoZSBgaXNEZWNsYXJhdGlvbkZpbGVgIHByb3BlcnR5LlxuICAgIGlmICghc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBvcmlnaW5hbFNmID0gdHMuZ2V0T3JpZ2luYWxOb2RlKHNmKSBhcyB0cy5Tb3VyY2VGaWxlO1xuXG4gICAgbGV0IHRyYW5zZm9ybXM6IER0c1RyYW5zZm9ybVtdfG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLml2eURlY2xhcmF0aW9uVHJhbnNmb3Jtcy5oYXMob3JpZ2luYWxTZikpIHtcbiAgICAgIHRyYW5zZm9ybXMgPSBbXTtcbiAgICAgIHRyYW5zZm9ybXMucHVzaCh0aGlzLml2eURlY2xhcmF0aW9uVHJhbnNmb3Jtcy5nZXQob3JpZ2luYWxTZikgISk7XG4gICAgfVxuICAgIGlmICh0aGlzLnJldHVyblR5cGVUcmFuc2Zvcm1zLmhhcyhvcmlnaW5hbFNmKSkge1xuICAgICAgdHJhbnNmb3JtcyA9IHRyYW5zZm9ybXMgfHwgW107XG4gICAgICB0cmFuc2Zvcm1zLnB1c2godGhpcy5yZXR1cm5UeXBlVHJhbnNmb3Jtcy5nZXQob3JpZ2luYWxTZikgISk7XG4gICAgfVxuICAgIHJldHVybiB0cmFuc2Zvcm1zO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnkoXG4gICAgdHJhbnNmb3JtUmVnaXN0cnk6IER0c1RyYW5zZm9ybVJlZ2lzdHJ5LCBpbXBvcnRSZXdyaXRlcjogSW1wb3J0UmV3cml0ZXIsXG4gICAgaW1wb3J0UHJlZml4Pzogc3RyaW5nKTogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLkJ1bmRsZXx0cy5Tb3VyY2VGaWxlPiB7XG4gIHJldHVybiAoY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KSA9PiB7XG4gICAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgRHRzVHJhbnNmb3JtZXIoY29udGV4dCwgaW1wb3J0UmV3cml0ZXIsIGltcG9ydFByZWZpeCk7XG4gICAgcmV0dXJuIChmaWxlT3JCdW5kbGUpID0+IHtcbiAgICAgIGlmICh0cy5pc0J1bmRsZShmaWxlT3JCdW5kbGUpKSB7XG4gICAgICAgIC8vIE9ubHkgYXR0ZW1wdCB0byB0cmFuc2Zvcm0gc291cmNlIGZpbGVzLlxuICAgICAgICByZXR1cm4gZmlsZU9yQnVuZGxlO1xuICAgICAgfVxuICAgICAgY29uc3QgdHJhbnNmb3JtcyA9IHRyYW5zZm9ybVJlZ2lzdHJ5LmdldEFsbFRyYW5zZm9ybXMoZmlsZU9yQnVuZGxlKTtcbiAgICAgIGlmICh0cmFuc2Zvcm1zID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBmaWxlT3JCdW5kbGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJhbnNmb3JtZXIudHJhbnNmb3JtKGZpbGVPckJ1bmRsZSwgdHJhbnNmb3Jtcyk7XG4gICAgfTtcbiAgfTtcbn1cblxuLyoqXG4gKiBQcm9jZXNzZXMgLmQudHMgZmlsZSB0ZXh0IGFuZCBhZGRzIHN0YXRpYyBmaWVsZCBkZWNsYXJhdGlvbnMsIHdpdGggdHlwZXMuXG4gKi9cbmNsYXNzIER0c1RyYW5zZm9ybWVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGN0eDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0LCBwcml2YXRlIGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlcixcbiAgICAgIHByaXZhdGUgaW1wb3J0UHJlZml4Pzogc3RyaW5nKSB7fVxuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gdGhlIGRlY2xhcmF0aW9uIGZpbGUgYW5kIGFkZCBhbnkgZGVjbGFyYXRpb25zIHdoaWNoIHdlcmUgcmVjb3JkZWQuXG4gICAqL1xuICB0cmFuc2Zvcm0oc2Y6IHRzLlNvdXJjZUZpbGUsIHRyYW5zZm9ybXM6IER0c1RyYW5zZm9ybVtdKTogdHMuU291cmNlRmlsZSB7XG4gICAgY29uc3QgaW1wb3J0cyA9IG5ldyBJbXBvcnRNYW5hZ2VyKHRoaXMuaW1wb3J0UmV3cml0ZXIsIHRoaXMuaW1wb3J0UHJlZml4KTtcblxuICAgIGNvbnN0IHZpc2l0b3I6IHRzLlZpc2l0b3IgPSAobm9kZTogdHMuTm9kZSk6IHRzLlZpc2l0UmVzdWx0PHRzLk5vZGU+ID0+IHtcbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNmb3JtQ2xhc3NEZWNsYXJhdGlvbihub2RlLCB0cmFuc2Zvcm1zLCBpbXBvcnRzKTtcbiAgICAgIH0gZWxzZSBpZiAodHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRyYW5zZm9ybUZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZSwgdHJhbnNmb3JtcywgaW1wb3J0cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBPdGhlcndpc2UgcmV0dXJuIG5vZGUgYXMgaXMuXG4gICAgICAgIHJldHVybiB0cy52aXNpdEVhY2hDaGlsZChub2RlLCB2aXNpdG9yLCB0aGlzLmN0eCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vIFJlY3Vyc2l2ZWx5IHNjYW4gdGhyb3VnaCB0aGUgQVNUIGFuZCBwcm9jZXNzIGFsbCBub2RlcyBhcyBkZXNpcmVkLlxuICAgIHNmID0gdHMudmlzaXROb2RlKHNmLCB2aXNpdG9yKTtcblxuICAgIC8vIEFkZCBuZXcgaW1wb3J0cyBmb3IgdGhpcyBmaWxlLlxuICAgIHJldHVybiBhZGRJbXBvcnRzKGltcG9ydHMsIHNmKTtcbiAgfVxuXG4gIHByaXZhdGUgdHJhbnNmb3JtQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgIGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCB0cmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1bXSxcbiAgICAgIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiB0cy5DbGFzc0RlY2xhcmF0aW9uIHtcbiAgICBsZXQgZWxlbWVudHM6IHRzLkNsYXNzRWxlbWVudFtdfFJlYWRvbmx5QXJyYXk8dHMuQ2xhc3NFbGVtZW50PiA9IGNsYXp6Lm1lbWJlcnM7XG4gICAgbGV0IGVsZW1lbnRzQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgZm9yIChjb25zdCB0cmFuc2Zvcm0gb2YgdHJhbnNmb3Jtcykge1xuICAgICAgaWYgKHRyYW5zZm9ybS50cmFuc2Zvcm1DbGFzc0VsZW1lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgcmVzID0gdHJhbnNmb3JtLnRyYW5zZm9ybUNsYXNzRWxlbWVudChlbGVtZW50c1tpXSwgaW1wb3J0cyk7XG4gICAgICAgICAgaWYgKHJlcyAhPT0gZWxlbWVudHNbaV0pIHtcbiAgICAgICAgICAgIGlmICghZWxlbWVudHNDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgIGVsZW1lbnRzID0gWy4uLmVsZW1lbnRzXTtcbiAgICAgICAgICAgICAgZWxlbWVudHNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIChlbGVtZW50cyBhcyB0cy5DbGFzc0VsZW1lbnRbXSlbaV0gPSByZXM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IG5ld0NsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uID0gY2xheno7XG5cbiAgICBmb3IgKGNvbnN0IHRyYW5zZm9ybSBvZiB0cmFuc2Zvcm1zKSB7XG4gICAgICBpZiAodHJhbnNmb3JtLnRyYW5zZm9ybUNsYXNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gSWYgbm8gRHRzVHJhbnNmb3JtIGhhcyBjaGFuZ2VkIHRoZSBjbGFzcyB5ZXQsIHRoZW4gdGhlIChwb3NzaWJseSBtdXRhdGVkKSBlbGVtZW50cyBoYXZlXG4gICAgICAgIC8vIG5vdCB5ZXQgYmVlbiBpbmNvcnBvcmF0ZWQuIE90aGVyd2lzZSwgYG5ld0NsYXp6Lm1lbWJlcnNgIGhvbGRzIHRoZSBsYXRlc3QgY2xhc3MgbWVtYmVycy5cbiAgICAgICAgY29uc3QgaW5wdXRNZW1iZXJzID0gKGNsYXp6ID09PSBuZXdDbGF6eiA/IGVsZW1lbnRzIDogbmV3Q2xhenoubWVtYmVycyk7XG5cbiAgICAgICAgbmV3Q2xhenogPSB0cmFuc2Zvcm0udHJhbnNmb3JtQ2xhc3MobmV3Q2xhenosIGlucHV0TWVtYmVycywgaW1wb3J0cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgc29tZSBlbGVtZW50cyBoYXZlIGJlZW4gdHJhbnNmb3JtZWQgYnV0IHRoZSBjbGFzcyBpdHNlbGYgaGFzIG5vdCBiZWVuIHRyYW5zZm9ybWVkLCBjcmVhdGVcbiAgICAvLyBhbiB1cGRhdGVkIGNsYXNzIGRlY2xhcmF0aW9uIHdpdGggdGhlIHVwZGF0ZWQgZWxlbWVudHMuXG4gICAgaWYgKGVsZW1lbnRzQ2hhbmdlZCAmJiBjbGF6eiA9PT0gbmV3Q2xhenopIHtcbiAgICAgIG5ld0NsYXp6ID0gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgICAvKiBub2RlICovIGNsYXp6LFxuICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gY2xhenouZGVjb3JhdG9ycyxcbiAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gY2xhenoubW9kaWZpZXJzLFxuICAgICAgICAgIC8qIG5hbWUgKi8gY2xhenoubmFtZSxcbiAgICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyBjbGF6ei50eXBlUGFyYW1ldGVycyxcbiAgICAgICAgICAvKiBoZXJpdGFnZUNsYXVzZXMgKi8gY2xhenouaGVyaXRhZ2VDbGF1c2VzLFxuICAgICAgICAgIC8qIG1lbWJlcnMgKi8gZWxlbWVudHMpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXdDbGF6ejtcbiAgfVxuXG4gIHByaXZhdGUgdHJhbnNmb3JtRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgIGRlY2xhcmF0aW9uOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uLCB0cmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1bXSxcbiAgICAgIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uIHtcbiAgICBsZXQgbmV3RGVjbCA9IGRlY2xhcmF0aW9uO1xuXG4gICAgZm9yIChjb25zdCB0cmFuc2Zvcm0gb2YgdHJhbnNmb3Jtcykge1xuICAgICAgaWYgKHRyYW5zZm9ybS50cmFuc2Zvcm1GdW5jdGlvbkRlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbmV3RGVjbCA9IHRyYW5zZm9ybS50cmFuc2Zvcm1GdW5jdGlvbkRlY2xhcmF0aW9uKG5ld0RlY2wsIGltcG9ydHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZXdEZWNsO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSXZ5RGVjbGFyYXRpb25GaWVsZCB7XG4gIG5hbWU6IHN0cmluZztcbiAgdHlwZTogVHlwZTtcbn1cblxuZXhwb3J0IGNsYXNzIEl2eURlY2xhcmF0aW9uRHRzVHJhbnNmb3JtIGltcGxlbWVudHMgRHRzVHJhbnNmb3JtIHtcbiAgcHJpdmF0ZSBkZWNsYXJhdGlvbkZpZWxkcyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgSXZ5RGVjbGFyYXRpb25GaWVsZFtdPigpO1xuXG4gIGFkZEZpZWxkcyhkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCBmaWVsZHM6IEl2eURlY2xhcmF0aW9uRmllbGRbXSk6IHZvaWQge1xuICAgIHRoaXMuZGVjbGFyYXRpb25GaWVsZHMuc2V0KGRlY2wsIGZpZWxkcyk7XG4gIH1cblxuICB0cmFuc2Zvcm1DbGFzcyhcbiAgICAgIGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBtZW1iZXJzOiBSZWFkb25seUFycmF5PHRzLkNsYXNzRWxlbWVudD4sXG4gICAgICBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogdHMuQ2xhc3NEZWNsYXJhdGlvbiB7XG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUoY2xhenopIGFzIENsYXNzRGVjbGFyYXRpb247XG5cbiAgICBpZiAoIXRoaXMuZGVjbGFyYXRpb25GaWVsZHMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIGNsYXp6O1xuICAgIH1cbiAgICBjb25zdCBmaWVsZHMgPSB0aGlzLmRlY2xhcmF0aW9uRmllbGRzLmdldChvcmlnaW5hbCkgITtcblxuICAgIGNvbnN0IG5ld01lbWJlcnMgPSBmaWVsZHMubWFwKGRlY2wgPT4ge1xuICAgICAgY29uc3QgbW9kaWZpZXJzID0gW3RzLmNyZWF0ZU1vZGlmaWVyKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCldO1xuICAgICAgY29uc3QgdHlwZVJlZiA9IHRyYW5zbGF0ZVR5cGUoZGVjbC50eXBlLCBpbXBvcnRzKTtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eShcbiAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gbW9kaWZpZXJzLFxuICAgICAgICAgIC8qIG5hbWUgKi8gZGVjbC5uYW1lLFxuICAgICAgICAgIC8qIHF1ZXN0aW9uT3JFeGNsYW1hdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAvKiB0eXBlICovIHR5cGVSZWYsXG4gICAgICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gdW5kZWZpbmVkKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0cy51cGRhdGVDbGFzc0RlY2xhcmF0aW9uKFxuICAgICAgICAvKiBub2RlICovIGNsYXp6LFxuICAgICAgICAvKiBkZWNvcmF0b3JzICovIGNsYXp6LmRlY29yYXRvcnMsXG4gICAgICAgIC8qIG1vZGlmaWVycyAqLyBjbGF6ei5tb2RpZmllcnMsXG4gICAgICAgIC8qIG5hbWUgKi8gY2xhenoubmFtZSxcbiAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gY2xhenoudHlwZVBhcmFtZXRlcnMsXG4gICAgICAgIC8qIGhlcml0YWdlQ2xhdXNlcyAqLyBjbGF6ei5oZXJpdGFnZUNsYXVzZXMsXG4gICAgICAgIC8qIG1lbWJlcnMgKi9bLi4ubWVtYmVycywgLi4ubmV3TWVtYmVyc10pO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZXR1cm5UeXBlVHJhbnNmb3JtIGltcGxlbWVudHMgRHRzVHJhbnNmb3JtIHtcbiAgcHJpdmF0ZSB0eXBlUmVwbGFjZW1lbnRzID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgVHlwZT4oKTtcblxuICBhZGRUeXBlUmVwbGFjZW1lbnQoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uLCB0eXBlOiBUeXBlKTogdm9pZCB7XG4gICAgdGhpcy50eXBlUmVwbGFjZW1lbnRzLnNldChkZWNsYXJhdGlvbiwgdHlwZSk7XG4gIH1cblxuICB0cmFuc2Zvcm1DbGFzc0VsZW1lbnQoZWxlbWVudDogdHMuQ2xhc3NFbGVtZW50LCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogdHMuQ2xhc3NFbGVtZW50IHtcbiAgICBpZiAoIXRzLmlzTWV0aG9kU2lnbmF0dXJlKGVsZW1lbnQpKSB7XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9XG5cbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShlbGVtZW50KSBhcyB0cy5NZXRob2REZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRoaXMudHlwZVJlcGxhY2VtZW50cy5oYXMob3JpZ2luYWwpKSB7XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9XG4gICAgY29uc3QgcmV0dXJuVHlwZSA9IHRoaXMudHlwZVJlcGxhY2VtZW50cy5nZXQob3JpZ2luYWwpICE7XG4gICAgY29uc3QgdHNSZXR1cm5UeXBlID0gdHJhbnNsYXRlVHlwZShyZXR1cm5UeXBlLCBpbXBvcnRzKTtcblxuICAgIGNvbnN0IG1ldGhvZFNpZ25hdHVyZSA9IHRzLnVwZGF0ZU1ldGhvZFNpZ25hdHVyZShcbiAgICAgICAgLyogbm9kZSAqLyBlbGVtZW50LFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyBlbGVtZW50LnR5cGVQYXJhbWV0ZXJzLFxuICAgICAgICAvKiBwYXJhbWV0ZXJzICovIGVsZW1lbnQucGFyYW1ldGVycyxcbiAgICAgICAgLyogdHlwZSAqLyB0c1JldHVyblR5cGUsXG4gICAgICAgIC8qIG5hbWUgKi8gZWxlbWVudC5uYW1lLFxuICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIGVsZW1lbnQucXVlc3Rpb25Ub2tlbik7XG5cbiAgICAvLyBDb3B5IG92ZXIgYW55IG1vZGlmaWVycywgdGhlc2UgY2Fubm90IGJlIHNldCBkdXJpbmcgdGhlIGB0cy51cGRhdGVNZXRob2RTaWduYXR1cmVgIGNhbGwuXG4gICAgbWV0aG9kU2lnbmF0dXJlLm1vZGlmaWVycyA9IGVsZW1lbnQubW9kaWZpZXJzO1xuXG4gICAgLy8gQSBidWcgaW4gdGhlIFR5cGVTY3JpcHQgZGVjbGFyYXRpb24gY2F1c2VzIGB0cy5NZXRob2RTaWduYXR1cmVgIG5vdCB0byBiZSBhc3NpZ25hYmxlIHRvXG4gICAgLy8gYHRzLkNsYXNzRWxlbWVudGAuIFNpbmNlIGBlbGVtZW50YCB3YXMgYSBgdHMuTWV0aG9kU2lnbmF0dXJlYCBhbHJlYWR5LCB0cmFuc2Zvcm1pbmcgaXQgaW50b1xuICAgIC8vIHRoaXMgdHlwZSBpcyBhY3R1YWxseSBjb3JyZWN0LlxuICAgIHJldHVybiBtZXRob2RTaWduYXR1cmUgYXMgdW5rbm93biBhcyB0cy5DbGFzc0VsZW1lbnQ7XG4gIH1cblxuICB0cmFuc2Zvcm1GdW5jdGlvbkRlY2xhcmF0aW9uKGVsZW1lbnQ6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24sIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOlxuICAgICAgdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiB7XG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUoZWxlbWVudCkgYXMgdHMuRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRoaXMudHlwZVJlcGxhY2VtZW50cy5oYXMob3JpZ2luYWwpKSB7XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9XG4gICAgY29uc3QgcmV0dXJuVHlwZSA9IHRoaXMudHlwZVJlcGxhY2VtZW50cy5nZXQob3JpZ2luYWwpICE7XG4gICAgY29uc3QgdHNSZXR1cm5UeXBlID0gdHJhbnNsYXRlVHlwZShyZXR1cm5UeXBlLCBpbXBvcnRzKTtcblxuICAgIHJldHVybiB0cy51cGRhdGVGdW5jdGlvbkRlY2xhcmF0aW9uKFxuICAgICAgICAvKiBub2RlICovIGVsZW1lbnQsXG4gICAgICAgIC8qIGRlY29yYXRvcnMgKi8gZWxlbWVudC5kZWNvcmF0b3JzLFxuICAgICAgICAvKiBtb2RpZmllcnMgKi8gZWxlbWVudC5tb2RpZmllcnMsXG4gICAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gZWxlbWVudC5hc3Rlcmlza1Rva2VuLFxuICAgICAgICAvKiBuYW1lICovIGVsZW1lbnQubmFtZSxcbiAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gZWxlbWVudC50eXBlUGFyYW1ldGVycyxcbiAgICAgICAgLyogcGFyYW1ldGVycyAqLyBlbGVtZW50LnBhcmFtZXRlcnMsXG4gICAgICAgIC8qIHR5cGUgKi8gdHNSZXR1cm5UeXBlLFxuICAgICAgICAvKiBib2R5ICovIGVsZW1lbnQuYm9keSk7XG4gIH1cbn1cbiJdfQ==