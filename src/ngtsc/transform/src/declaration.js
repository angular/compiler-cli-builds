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
    exports.ReturnTypeTransform = exports.IvyDeclarationDtsTransform = exports.declarationTransformFactory = exports.DtsTransformRegistry = void 0;
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
                markForEmitAsSingleLine(typeRef);
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
    function markForEmitAsSingleLine(node) {
        ts.setEmitFlags(node, ts.EmitFlags.SingleLine);
        ts.forEachChild(node, markForEmitAsSingleLine);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjbGFyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvZGVjbGFyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUlqQyx5RUFBOEQ7SUFHOUQsNkVBQW1DO0lBRW5DOzs7T0FHRztJQUNIO1FBQUE7WUFDVSw2QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBNkMsQ0FBQztZQUNoRix5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBc0MsQ0FBQztRQXlDL0UsQ0FBQztRQXZDQyx5REFBMEIsR0FBMUIsVUFBMkIsRUFBaUI7WUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQzFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksMEJBQTBCLEVBQUUsQ0FBQyxDQUFDO2FBQ3pFO1lBQ0QsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBRSxDQUFDO1FBQ2hELENBQUM7UUFFRCxxREFBc0IsR0FBdEIsVUFBdUIsRUFBaUI7WUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ3RDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO2FBQzlEO1lBQ0QsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBRSxDQUFDO1FBQzVDLENBQUM7UUFFRDs7O1dBR0c7UUFDSCwrQ0FBZ0IsR0FBaEIsVUFBaUIsRUFBaUI7WUFDaEMsNkZBQTZGO1lBQzdGLHdGQUF3RjtZQUN4Riw2RkFBNkY7WUFDN0YsNERBQTREO1lBQzVELElBQUksQ0FBQyxFQUFFLENBQUMsaUJBQWlCLEVBQUU7Z0JBQ3pCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFNLFVBQVUsR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBa0IsQ0FBQztZQUUzRCxJQUFJLFVBQVUsR0FBd0IsSUFBSSxDQUFDO1lBQzNDLElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDakQsVUFBVSxHQUFHLEVBQUUsQ0FBQztnQkFDaEIsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRSxDQUFDLENBQUM7YUFDakU7WUFDRCxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQzdDLFVBQVUsR0FBRyxVQUFVLElBQUksRUFBRSxDQUFDO2dCQUM5QixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFFLENBQUMsQ0FBQzthQUM3RDtZQUNELE9BQU8sVUFBVSxDQUFDO1FBQ3BCLENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUEzQ0QsSUEyQ0M7SUEzQ1ksb0RBQW9CO0lBNkNqQyxTQUFnQiwyQkFBMkIsQ0FDdkMsaUJBQXVDLEVBQUUsY0FBOEIsRUFDdkUsWUFBcUI7UUFDdkIsT0FBTyxVQUFDLE9BQWlDO1lBQ3ZDLElBQU0sV0FBVyxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDOUUsT0FBTyxVQUFDLFlBQVk7Z0JBQ2xCLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBRTtvQkFDN0IsMENBQTBDO29CQUMxQyxPQUFPLFlBQVksQ0FBQztpQkFDckI7Z0JBQ0QsSUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ3BFLElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtvQkFDdkIsT0FBTyxZQUFZLENBQUM7aUJBQ3JCO2dCQUNELE9BQU8sV0FBVyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDekQsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQWpCRCxrRUFpQkM7SUFFRDs7T0FFRztJQUNIO1FBQ0Usd0JBQ1ksR0FBNkIsRUFBVSxjQUE4QixFQUNyRSxZQUFxQjtZQURyQixRQUFHLEdBQUgsR0FBRyxDQUEwQjtZQUFVLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtZQUNyRSxpQkFBWSxHQUFaLFlBQVksQ0FBUztRQUFHLENBQUM7UUFFckM7O1dBRUc7UUFDSCxrQ0FBUyxHQUFULFVBQVUsRUFBaUIsRUFBRSxVQUEwQjtZQUF2RCxpQkFtQkM7WUFsQkMsSUFBTSxPQUFPLEdBQUcsSUFBSSwwQkFBYSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBRTFFLElBQU0sT0FBTyxHQUFlLFVBQUMsSUFBYTtnQkFDeEMsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQy9CLE9BQU8sS0FBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7aUJBQ2xFO3FCQUFNLElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFO29CQUN6QyxPQUFPLEtBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUNyRTtxQkFBTTtvQkFDTCwrQkFBK0I7b0JBQy9CLE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDbkQ7WUFDSCxDQUFDLENBQUM7WUFFRixxRUFBcUU7WUFDckUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRS9CLGlDQUFpQztZQUNqQyxPQUFPLGtCQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFFTyxrREFBeUIsR0FBakMsVUFDSSxLQUEwQixFQUFFLFVBQTBCLEVBQ3RELE9BQXNCOztZQUN4QixJQUFJLFFBQVEsR0FBcUQsS0FBSyxDQUFDLE9BQU8sQ0FBQztZQUMvRSxJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUM7O2dCQUU1QixLQUF3QixJQUFBLGVBQUEsaUJBQUEsVUFBVSxDQUFBLHNDQUFBLDhEQUFFO29CQUEvQixJQUFNLFNBQVMsdUJBQUE7b0JBQ2xCLElBQUksU0FBUyxDQUFDLHFCQUFxQixLQUFLLFNBQVMsRUFBRTt3QkFDakQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7NEJBQ3hDLElBQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7NEJBQ2xFLElBQUksR0FBRyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQ0FDdkIsSUFBSSxDQUFDLGVBQWUsRUFBRTtvQ0FDcEIsUUFBUSxvQkFBTyxRQUFRLENBQUMsQ0FBQztvQ0FDekIsZUFBZSxHQUFHLElBQUksQ0FBQztpQ0FDeEI7Z0NBQ0EsUUFBOEIsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7NkJBQzFDO3lCQUNGO3FCQUNGO2lCQUNGOzs7Ozs7Ozs7WUFFRCxJQUFJLFFBQVEsR0FBd0IsS0FBSyxDQUFDOztnQkFFMUMsS0FBd0IsSUFBQSxlQUFBLGlCQUFBLFVBQVUsQ0FBQSxzQ0FBQSw4REFBRTtvQkFBL0IsSUFBTSxTQUFTLHVCQUFBO29CQUNsQixJQUFJLFNBQVMsQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFO3dCQUMxQywwRkFBMEY7d0JBQzFGLDJGQUEyRjt3QkFDM0YsSUFBTSxZQUFZLEdBQUcsQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFFeEUsUUFBUSxHQUFHLFNBQVMsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztxQkFDdEU7aUJBQ0Y7Ozs7Ozs7OztZQUVELCtGQUErRjtZQUMvRiwwREFBMEQ7WUFDMUQsSUFBSSxlQUFlLElBQUksS0FBSyxLQUFLLFFBQVEsRUFBRTtnQkFDekMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxzQkFBc0I7Z0JBQ2hDLFVBQVUsQ0FBQyxLQUFLO2dCQUNoQixnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsVUFBVTtnQkFDakMsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUMvQixVQUFVLENBQUMsS0FBSyxDQUFDLElBQUk7Z0JBQ3JCLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxjQUFjO2dCQUN6QyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsZUFBZTtnQkFDM0MsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzdCO1lBRUQsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztRQUVPLHFEQUE0QixHQUFwQyxVQUNJLFdBQW1DLEVBQUUsVUFBMEIsRUFDL0QsT0FBc0I7O1lBQ3hCLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQzs7Z0JBRTFCLEtBQXdCLElBQUEsZUFBQSxpQkFBQSxVQUFVLENBQUEsc0NBQUEsOERBQUU7b0JBQS9CLElBQU0sU0FBUyx1QkFBQTtvQkFDbEIsSUFBSSxTQUFTLENBQUMsNEJBQTRCLEtBQUssU0FBUyxFQUFFO3dCQUN4RCxPQUFPLEdBQUcsU0FBUyxDQUFDLDRCQUE0QixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztxQkFDcEU7aUJBQ0Y7Ozs7Ozs7OztZQUVELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFDSCxxQkFBQztJQUFELENBQUMsQUEzRkQsSUEyRkM7SUFPRDtRQUFBO1lBQ1Usc0JBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQTJDLENBQUM7UUFzQ2pGLENBQUM7UUFwQ0MsOENBQVMsR0FBVCxVQUFVLElBQXNCLEVBQUUsTUFBNkI7WUFDN0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUVELG1EQUFjLEdBQWQsVUFDSSxLQUEwQixFQUFFLE9BQXVDLEVBQ25FLE9BQXNCO1lBQ3hCLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFxQixDQUFDO1lBRS9ELElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUN6QyxPQUFPLEtBQUssQ0FBQzthQUNkO1lBQ0QsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUUsQ0FBQztZQUVyRCxJQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSTtnQkFDaEMsSUFBTSxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDbkUsSUFBTSxPQUFPLEdBQUcsMEJBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNsRCx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDakMsT0FBTyxFQUFFLENBQUMsY0FBYztnQkFDcEIsZ0JBQWdCLENBQUMsU0FBUztnQkFDMUIsZUFBZSxDQUFDLFNBQVM7Z0JBQ3pCLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFDcEIsZ0NBQWdDLENBQUMsU0FBUztnQkFDMUMsVUFBVSxDQUFDLE9BQU87Z0JBQ2xCLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ25DLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxFQUFFLENBQUMsc0JBQXNCO1lBQzVCLFVBQVUsQ0FBQyxLQUFLO1lBQ2hCLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxVQUFVO1lBQ2pDLGVBQWUsQ0FBQyxLQUFLLENBQUMsU0FBUztZQUMvQixVQUFVLENBQUMsS0FBSyxDQUFDLElBQUk7WUFDckIsb0JBQW9CLENBQUMsS0FBSyxDQUFDLGNBQWM7WUFDekMscUJBQXFCLENBQUMsS0FBSyxDQUFDLGVBQWUsbUJBQzFCLE9BQU8sRUFBSyxVQUFVLEVBQUUsQ0FBQztRQUNoRCxDQUFDO1FBQ0gsaUNBQUM7SUFBRCxDQUFDLEFBdkNELElBdUNDO0lBdkNZLGdFQUEwQjtJQXlDdkMsU0FBUyx1QkFBdUIsQ0FBQyxJQUFhO1FBQzVDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDL0MsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQ7UUFBQTtZQUNVLHFCQUFnQixHQUFHLElBQUksR0FBRyxFQUF3QixDQUFDO1FBdUQ3RCxDQUFDO1FBckRDLGdEQUFrQixHQUFsQixVQUFtQixXQUEyQixFQUFFLElBQVU7WUFDeEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUVELG1EQUFxQixHQUFyQixVQUFzQixPQUF3QixFQUFFLE9BQXNCO1lBQ3BFLElBQUksQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ2xDLE9BQU8sT0FBTyxDQUFDO2FBQ2hCO1lBRUQsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQXlCLENBQUM7WUFDckUsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ3hDLE9BQU8sT0FBTyxDQUFDO2FBQ2hCO1lBQ0QsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUUsQ0FBQztZQUN4RCxJQUFNLFlBQVksR0FBRywwQkFBYSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUV4RCxJQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMscUJBQXFCO1lBQzVDLFVBQVUsQ0FBQyxPQUFPO1lBQ2xCLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxjQUFjO1lBQzNDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxVQUFVO1lBQ25DLFVBQVUsQ0FBQyxZQUFZO1lBQ3ZCLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSTtZQUN2QixtQkFBbUIsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7WUFFL0MsMkZBQTJGO1lBQzNGLGVBQWUsQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztZQUU5QywwRkFBMEY7WUFDMUYsOEZBQThGO1lBQzlGLGlDQUFpQztZQUNqQyxPQUFPLGVBQTZDLENBQUM7UUFDdkQsQ0FBQztRQUVELDBEQUE0QixHQUE1QixVQUE2QixPQUErQixFQUFFLE9BQXNCO1lBRWxGLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUEyQixDQUFDO1lBQ3ZFLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUN4QyxPQUFPLE9BQU8sQ0FBQzthQUNoQjtZQUNELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFFLENBQUM7WUFDeEQsSUFBTSxZQUFZLEdBQUcsMEJBQWEsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFeEQsT0FBTyxFQUFFLENBQUMseUJBQXlCO1lBQy9CLFVBQVUsQ0FBQyxPQUFPO1lBQ2xCLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxVQUFVO1lBQ25DLGVBQWUsQ0FBQyxPQUFPLENBQUMsU0FBUztZQUNqQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsYUFBYTtZQUN6QyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUk7WUFDdkIsb0JBQW9CLENBQUMsT0FBTyxDQUFDLGNBQWM7WUFDM0MsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQVU7WUFDbkMsVUFBVSxDQUFDLFlBQVk7WUFDdkIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixDQUFDO1FBQ0gsMEJBQUM7SUFBRCxDQUFDLEFBeERELElBd0RDO0lBeERZLGtEQUFtQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtUeXBlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVUeXBlfSBmcm9tICcuLi8uLi90cmFuc2xhdG9yJztcblxuaW1wb3J0IHtEdHNUcmFuc2Zvcm19IGZyb20gJy4vYXBpJztcbmltcG9ydCB7YWRkSW1wb3J0c30gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogS2VlcHMgdHJhY2sgb2YgYER0c1RyYW5zZm9ybWBzIHBlciBzb3VyY2UgZmlsZSwgc28gdGhhdCBpdCBpcyBrbm93biB3aGljaCBzb3VyY2UgZmlsZXMgbmVlZCB0b1xuICogaGF2ZSB0aGVpciBkZWNsYXJhdGlvbiBmaWxlIHRyYW5zZm9ybWVkLlxuICovXG5leHBvcnQgY2xhc3MgRHRzVHJhbnNmb3JtUmVnaXN0cnkge1xuICBwcml2YXRlIGl2eURlY2xhcmF0aW9uVHJhbnNmb3JtcyA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgSXZ5RGVjbGFyYXRpb25EdHNUcmFuc2Zvcm0+KCk7XG4gIHByaXZhdGUgcmV0dXJuVHlwZVRyYW5zZm9ybXMgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIFJldHVyblR5cGVUcmFuc2Zvcm0+KCk7XG5cbiAgZ2V0SXZ5RGVjbGFyYXRpb25UcmFuc2Zvcm0oc2Y6IHRzLlNvdXJjZUZpbGUpOiBJdnlEZWNsYXJhdGlvbkR0c1RyYW5zZm9ybSB7XG4gICAgaWYgKCF0aGlzLml2eURlY2xhcmF0aW9uVHJhbnNmb3Jtcy5oYXMoc2YpKSB7XG4gICAgICB0aGlzLml2eURlY2xhcmF0aW9uVHJhbnNmb3Jtcy5zZXQoc2YsIG5ldyBJdnlEZWNsYXJhdGlvbkR0c1RyYW5zZm9ybSgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuaXZ5RGVjbGFyYXRpb25UcmFuc2Zvcm1zLmdldChzZikhO1xuICB9XG5cbiAgZ2V0UmV0dXJuVHlwZVRyYW5zZm9ybShzZjogdHMuU291cmNlRmlsZSk6IFJldHVyblR5cGVUcmFuc2Zvcm0ge1xuICAgIGlmICghdGhpcy5yZXR1cm5UeXBlVHJhbnNmb3Jtcy5oYXMoc2YpKSB7XG4gICAgICB0aGlzLnJldHVyblR5cGVUcmFuc2Zvcm1zLnNldChzZiwgbmV3IFJldHVyblR5cGVUcmFuc2Zvcm0oKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJldHVyblR5cGVUcmFuc2Zvcm1zLmdldChzZikhO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGR0cyB0cmFuc2Zvcm1zIHRvIGJlIGFwcGxpZWQgZm9yIHRoZSBnaXZlbiBzb3VyY2UgZmlsZSwgb3IgYG51bGxgIGlmIG5vIHRyYW5zZm9ybSBpc1xuICAgKiBuZWNlc3NhcnkuXG4gICAqL1xuICBnZXRBbGxUcmFuc2Zvcm1zKHNmOiB0cy5Tb3VyY2VGaWxlKTogRHRzVHJhbnNmb3JtW118bnVsbCB7XG4gICAgLy8gTm8gbmVlZCB0byB0cmFuc2Zvcm0gaWYgaXQncyBub3QgYSBkZWNsYXJhdGlvbnMgZmlsZSwgb3IgaWYgbm8gY2hhbmdlcyBoYXZlIGJlZW4gcmVxdWVzdGVkXG4gICAgLy8gdG8gdGhlIGlucHV0IGZpbGUuIER1ZSB0byB0aGUgd2F5IFR5cGVTY3JpcHQgYWZ0ZXJEZWNsYXJhdGlvbnMgdHJhbnNmb3JtZXJzIHdvcmssIHRoZVxuICAgIC8vIGB0cy5Tb3VyY2VGaWxlYCBwYXRoIGlzIHRoZSBzYW1lIGFzIHRoZSBvcmlnaW5hbCAudHMuIFRoZSBvbmx5IHdheSB3ZSBrbm93IGl0J3MgYWN0dWFsbHkgYVxuICAgIC8vIGRlY2xhcmF0aW9uIGZpbGUgaXMgdmlhIHRoZSBgaXNEZWNsYXJhdGlvbkZpbGVgIHByb3BlcnR5LlxuICAgIGlmICghc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBvcmlnaW5hbFNmID0gdHMuZ2V0T3JpZ2luYWxOb2RlKHNmKSBhcyB0cy5Tb3VyY2VGaWxlO1xuXG4gICAgbGV0IHRyYW5zZm9ybXM6IER0c1RyYW5zZm9ybVtdfG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLml2eURlY2xhcmF0aW9uVHJhbnNmb3Jtcy5oYXMob3JpZ2luYWxTZikpIHtcbiAgICAgIHRyYW5zZm9ybXMgPSBbXTtcbiAgICAgIHRyYW5zZm9ybXMucHVzaCh0aGlzLml2eURlY2xhcmF0aW9uVHJhbnNmb3Jtcy5nZXQob3JpZ2luYWxTZikhKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucmV0dXJuVHlwZVRyYW5zZm9ybXMuaGFzKG9yaWdpbmFsU2YpKSB7XG4gICAgICB0cmFuc2Zvcm1zID0gdHJhbnNmb3JtcyB8fCBbXTtcbiAgICAgIHRyYW5zZm9ybXMucHVzaCh0aGlzLnJldHVyblR5cGVUcmFuc2Zvcm1zLmdldChvcmlnaW5hbFNmKSEpO1xuICAgIH1cbiAgICByZXR1cm4gdHJhbnNmb3JtcztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5KFxuICAgIHRyYW5zZm9ybVJlZ2lzdHJ5OiBEdHNUcmFuc2Zvcm1SZWdpc3RyeSwgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyLFxuICAgIGltcG9ydFByZWZpeD86IHN0cmluZyk6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPiB7XG4gIHJldHVybiAoY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KSA9PiB7XG4gICAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgRHRzVHJhbnNmb3JtZXIoY29udGV4dCwgaW1wb3J0UmV3cml0ZXIsIGltcG9ydFByZWZpeCk7XG4gICAgcmV0dXJuIChmaWxlT3JCdW5kbGUpID0+IHtcbiAgICAgIGlmICh0cy5pc0J1bmRsZShmaWxlT3JCdW5kbGUpKSB7XG4gICAgICAgIC8vIE9ubHkgYXR0ZW1wdCB0byB0cmFuc2Zvcm0gc291cmNlIGZpbGVzLlxuICAgICAgICByZXR1cm4gZmlsZU9yQnVuZGxlO1xuICAgICAgfVxuICAgICAgY29uc3QgdHJhbnNmb3JtcyA9IHRyYW5zZm9ybVJlZ2lzdHJ5LmdldEFsbFRyYW5zZm9ybXMoZmlsZU9yQnVuZGxlKTtcbiAgICAgIGlmICh0cmFuc2Zvcm1zID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBmaWxlT3JCdW5kbGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJhbnNmb3JtZXIudHJhbnNmb3JtKGZpbGVPckJ1bmRsZSwgdHJhbnNmb3Jtcyk7XG4gICAgfTtcbiAgfTtcbn1cblxuLyoqXG4gKiBQcm9jZXNzZXMgLmQudHMgZmlsZSB0ZXh0IGFuZCBhZGRzIHN0YXRpYyBmaWVsZCBkZWNsYXJhdGlvbnMsIHdpdGggdHlwZXMuXG4gKi9cbmNsYXNzIER0c1RyYW5zZm9ybWVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGN0eDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0LCBwcml2YXRlIGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlcixcbiAgICAgIHByaXZhdGUgaW1wb3J0UHJlZml4Pzogc3RyaW5nKSB7fVxuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gdGhlIGRlY2xhcmF0aW9uIGZpbGUgYW5kIGFkZCBhbnkgZGVjbGFyYXRpb25zIHdoaWNoIHdlcmUgcmVjb3JkZWQuXG4gICAqL1xuICB0cmFuc2Zvcm0oc2Y6IHRzLlNvdXJjZUZpbGUsIHRyYW5zZm9ybXM6IER0c1RyYW5zZm9ybVtdKTogdHMuU291cmNlRmlsZSB7XG4gICAgY29uc3QgaW1wb3J0cyA9IG5ldyBJbXBvcnRNYW5hZ2VyKHRoaXMuaW1wb3J0UmV3cml0ZXIsIHRoaXMuaW1wb3J0UHJlZml4KTtcblxuICAgIGNvbnN0IHZpc2l0b3I6IHRzLlZpc2l0b3IgPSAobm9kZTogdHMuTm9kZSk6IHRzLlZpc2l0UmVzdWx0PHRzLk5vZGU+ID0+IHtcbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNmb3JtQ2xhc3NEZWNsYXJhdGlvbihub2RlLCB0cmFuc2Zvcm1zLCBpbXBvcnRzKTtcbiAgICAgIH0gZWxzZSBpZiAodHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRyYW5zZm9ybUZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZSwgdHJhbnNmb3JtcywgaW1wb3J0cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBPdGhlcndpc2UgcmV0dXJuIG5vZGUgYXMgaXMuXG4gICAgICAgIHJldHVybiB0cy52aXNpdEVhY2hDaGlsZChub2RlLCB2aXNpdG9yLCB0aGlzLmN0eCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vIFJlY3Vyc2l2ZWx5IHNjYW4gdGhyb3VnaCB0aGUgQVNUIGFuZCBwcm9jZXNzIGFsbCBub2RlcyBhcyBkZXNpcmVkLlxuICAgIHNmID0gdHMudmlzaXROb2RlKHNmLCB2aXNpdG9yKTtcblxuICAgIC8vIEFkZCBuZXcgaW1wb3J0cyBmb3IgdGhpcyBmaWxlLlxuICAgIHJldHVybiBhZGRJbXBvcnRzKGltcG9ydHMsIHNmKTtcbiAgfVxuXG4gIHByaXZhdGUgdHJhbnNmb3JtQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgIGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCB0cmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1bXSxcbiAgICAgIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiB0cy5DbGFzc0RlY2xhcmF0aW9uIHtcbiAgICBsZXQgZWxlbWVudHM6IHRzLkNsYXNzRWxlbWVudFtdfFJlYWRvbmx5QXJyYXk8dHMuQ2xhc3NFbGVtZW50PiA9IGNsYXp6Lm1lbWJlcnM7XG4gICAgbGV0IGVsZW1lbnRzQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgZm9yIChjb25zdCB0cmFuc2Zvcm0gb2YgdHJhbnNmb3Jtcykge1xuICAgICAgaWYgKHRyYW5zZm9ybS50cmFuc2Zvcm1DbGFzc0VsZW1lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgcmVzID0gdHJhbnNmb3JtLnRyYW5zZm9ybUNsYXNzRWxlbWVudChlbGVtZW50c1tpXSwgaW1wb3J0cyk7XG4gICAgICAgICAgaWYgKHJlcyAhPT0gZWxlbWVudHNbaV0pIHtcbiAgICAgICAgICAgIGlmICghZWxlbWVudHNDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgIGVsZW1lbnRzID0gWy4uLmVsZW1lbnRzXTtcbiAgICAgICAgICAgICAgZWxlbWVudHNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIChlbGVtZW50cyBhcyB0cy5DbGFzc0VsZW1lbnRbXSlbaV0gPSByZXM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IG5ld0NsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uID0gY2xheno7XG5cbiAgICBmb3IgKGNvbnN0IHRyYW5zZm9ybSBvZiB0cmFuc2Zvcm1zKSB7XG4gICAgICBpZiAodHJhbnNmb3JtLnRyYW5zZm9ybUNsYXNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gSWYgbm8gRHRzVHJhbnNmb3JtIGhhcyBjaGFuZ2VkIHRoZSBjbGFzcyB5ZXQsIHRoZW4gdGhlIChwb3NzaWJseSBtdXRhdGVkKSBlbGVtZW50cyBoYXZlXG4gICAgICAgIC8vIG5vdCB5ZXQgYmVlbiBpbmNvcnBvcmF0ZWQuIE90aGVyd2lzZSwgYG5ld0NsYXp6Lm1lbWJlcnNgIGhvbGRzIHRoZSBsYXRlc3QgY2xhc3MgbWVtYmVycy5cbiAgICAgICAgY29uc3QgaW5wdXRNZW1iZXJzID0gKGNsYXp6ID09PSBuZXdDbGF6eiA/IGVsZW1lbnRzIDogbmV3Q2xhenoubWVtYmVycyk7XG5cbiAgICAgICAgbmV3Q2xhenogPSB0cmFuc2Zvcm0udHJhbnNmb3JtQ2xhc3MobmV3Q2xhenosIGlucHV0TWVtYmVycywgaW1wb3J0cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgc29tZSBlbGVtZW50cyBoYXZlIGJlZW4gdHJhbnNmb3JtZWQgYnV0IHRoZSBjbGFzcyBpdHNlbGYgaGFzIG5vdCBiZWVuIHRyYW5zZm9ybWVkLCBjcmVhdGVcbiAgICAvLyBhbiB1cGRhdGVkIGNsYXNzIGRlY2xhcmF0aW9uIHdpdGggdGhlIHVwZGF0ZWQgZWxlbWVudHMuXG4gICAgaWYgKGVsZW1lbnRzQ2hhbmdlZCAmJiBjbGF6eiA9PT0gbmV3Q2xhenopIHtcbiAgICAgIG5ld0NsYXp6ID0gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgICAvKiBub2RlICovIGNsYXp6LFxuICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gY2xhenouZGVjb3JhdG9ycyxcbiAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gY2xhenoubW9kaWZpZXJzLFxuICAgICAgICAgIC8qIG5hbWUgKi8gY2xhenoubmFtZSxcbiAgICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyBjbGF6ei50eXBlUGFyYW1ldGVycyxcbiAgICAgICAgICAvKiBoZXJpdGFnZUNsYXVzZXMgKi8gY2xhenouaGVyaXRhZ2VDbGF1c2VzLFxuICAgICAgICAgIC8qIG1lbWJlcnMgKi8gZWxlbWVudHMpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXdDbGF6ejtcbiAgfVxuXG4gIHByaXZhdGUgdHJhbnNmb3JtRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgIGRlY2xhcmF0aW9uOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uLCB0cmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1bXSxcbiAgICAgIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uIHtcbiAgICBsZXQgbmV3RGVjbCA9IGRlY2xhcmF0aW9uO1xuXG4gICAgZm9yIChjb25zdCB0cmFuc2Zvcm0gb2YgdHJhbnNmb3Jtcykge1xuICAgICAgaWYgKHRyYW5zZm9ybS50cmFuc2Zvcm1GdW5jdGlvbkRlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbmV3RGVjbCA9IHRyYW5zZm9ybS50cmFuc2Zvcm1GdW5jdGlvbkRlY2xhcmF0aW9uKG5ld0RlY2wsIGltcG9ydHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZXdEZWNsO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSXZ5RGVjbGFyYXRpb25GaWVsZCB7XG4gIG5hbWU6IHN0cmluZztcbiAgdHlwZTogVHlwZTtcbn1cblxuZXhwb3J0IGNsYXNzIEl2eURlY2xhcmF0aW9uRHRzVHJhbnNmb3JtIGltcGxlbWVudHMgRHRzVHJhbnNmb3JtIHtcbiAgcHJpdmF0ZSBkZWNsYXJhdGlvbkZpZWxkcyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgSXZ5RGVjbGFyYXRpb25GaWVsZFtdPigpO1xuXG4gIGFkZEZpZWxkcyhkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCBmaWVsZHM6IEl2eURlY2xhcmF0aW9uRmllbGRbXSk6IHZvaWQge1xuICAgIHRoaXMuZGVjbGFyYXRpb25GaWVsZHMuc2V0KGRlY2wsIGZpZWxkcyk7XG4gIH1cblxuICB0cmFuc2Zvcm1DbGFzcyhcbiAgICAgIGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBtZW1iZXJzOiBSZWFkb25seUFycmF5PHRzLkNsYXNzRWxlbWVudD4sXG4gICAgICBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogdHMuQ2xhc3NEZWNsYXJhdGlvbiB7XG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUoY2xhenopIGFzIENsYXNzRGVjbGFyYXRpb247XG5cbiAgICBpZiAoIXRoaXMuZGVjbGFyYXRpb25GaWVsZHMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIGNsYXp6O1xuICAgIH1cbiAgICBjb25zdCBmaWVsZHMgPSB0aGlzLmRlY2xhcmF0aW9uRmllbGRzLmdldChvcmlnaW5hbCkhO1xuXG4gICAgY29uc3QgbmV3TWVtYmVycyA9IGZpZWxkcy5tYXAoZGVjbCA9PiB7XG4gICAgICBjb25zdCBtb2RpZmllcnMgPSBbdHMuY3JlYXRlTW9kaWZpZXIodHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKV07XG4gICAgICBjb25zdCB0eXBlUmVmID0gdHJhbnNsYXRlVHlwZShkZWNsLnR5cGUsIGltcG9ydHMpO1xuICAgICAgbWFya0ZvckVtaXRBc1NpbmdsZUxpbmUodHlwZVJlZik7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHkoXG4gICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgLyogbW9kaWZpZXJzICovIG1vZGlmaWVycyxcbiAgICAgICAgICAvKiBuYW1lICovIGRlY2wubmFtZSxcbiAgICAgICAgICAvKiBxdWVzdGlvbk9yRXhjbGFtYXRpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgLyogdHlwZSAqLyB0eXBlUmVmLFxuICAgICAgICAgIC8qIGluaXRpYWxpemVyICovIHVuZGVmaW5lZCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgLyogbm9kZSAqLyBjbGF6eixcbiAgICAgICAgLyogZGVjb3JhdG9ycyAqLyBjbGF6ei5kZWNvcmF0b3JzLFxuICAgICAgICAvKiBtb2RpZmllcnMgKi8gY2xhenoubW9kaWZpZXJzLFxuICAgICAgICAvKiBuYW1lICovIGNsYXp6Lm5hbWUsXG4gICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIGNsYXp6LnR5cGVQYXJhbWV0ZXJzLFxuICAgICAgICAvKiBoZXJpdGFnZUNsYXVzZXMgKi8gY2xhenouaGVyaXRhZ2VDbGF1c2VzLFxuICAgICAgICAvKiBtZW1iZXJzICovWy4uLm1lbWJlcnMsIC4uLm5ld01lbWJlcnNdKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBtYXJrRm9yRW1pdEFzU2luZ2xlTGluZShub2RlOiB0cy5Ob2RlKSB7XG4gIHRzLnNldEVtaXRGbGFncyhub2RlLCB0cy5FbWl0RmxhZ3MuU2luZ2xlTGluZSk7XG4gIHRzLmZvckVhY2hDaGlsZChub2RlLCBtYXJrRm9yRW1pdEFzU2luZ2xlTGluZSk7XG59XG5cbmV4cG9ydCBjbGFzcyBSZXR1cm5UeXBlVHJhbnNmb3JtIGltcGxlbWVudHMgRHRzVHJhbnNmb3JtIHtcbiAgcHJpdmF0ZSB0eXBlUmVwbGFjZW1lbnRzID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgVHlwZT4oKTtcblxuICBhZGRUeXBlUmVwbGFjZW1lbnQoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uLCB0eXBlOiBUeXBlKTogdm9pZCB7XG4gICAgdGhpcy50eXBlUmVwbGFjZW1lbnRzLnNldChkZWNsYXJhdGlvbiwgdHlwZSk7XG4gIH1cblxuICB0cmFuc2Zvcm1DbGFzc0VsZW1lbnQoZWxlbWVudDogdHMuQ2xhc3NFbGVtZW50LCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogdHMuQ2xhc3NFbGVtZW50IHtcbiAgICBpZiAoIXRzLmlzTWV0aG9kU2lnbmF0dXJlKGVsZW1lbnQpKSB7XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9XG5cbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShlbGVtZW50KSBhcyB0cy5NZXRob2REZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRoaXMudHlwZVJlcGxhY2VtZW50cy5oYXMob3JpZ2luYWwpKSB7XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9XG4gICAgY29uc3QgcmV0dXJuVHlwZSA9IHRoaXMudHlwZVJlcGxhY2VtZW50cy5nZXQob3JpZ2luYWwpITtcbiAgICBjb25zdCB0c1JldHVyblR5cGUgPSB0cmFuc2xhdGVUeXBlKHJldHVyblR5cGUsIGltcG9ydHMpO1xuXG4gICAgY29uc3QgbWV0aG9kU2lnbmF0dXJlID0gdHMudXBkYXRlTWV0aG9kU2lnbmF0dXJlKFxuICAgICAgICAvKiBub2RlICovIGVsZW1lbnQsXG4gICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIGVsZW1lbnQudHlwZVBhcmFtZXRlcnMsXG4gICAgICAgIC8qIHBhcmFtZXRlcnMgKi8gZWxlbWVudC5wYXJhbWV0ZXJzLFxuICAgICAgICAvKiB0eXBlICovIHRzUmV0dXJuVHlwZSxcbiAgICAgICAgLyogbmFtZSAqLyBlbGVtZW50Lm5hbWUsXG4gICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gZWxlbWVudC5xdWVzdGlvblRva2VuKTtcblxuICAgIC8vIENvcHkgb3ZlciBhbnkgbW9kaWZpZXJzLCB0aGVzZSBjYW5ub3QgYmUgc2V0IGR1cmluZyB0aGUgYHRzLnVwZGF0ZU1ldGhvZFNpZ25hdHVyZWAgY2FsbC5cbiAgICBtZXRob2RTaWduYXR1cmUubW9kaWZpZXJzID0gZWxlbWVudC5tb2RpZmllcnM7XG5cbiAgICAvLyBBIGJ1ZyBpbiB0aGUgVHlwZVNjcmlwdCBkZWNsYXJhdGlvbiBjYXVzZXMgYHRzLk1ldGhvZFNpZ25hdHVyZWAgbm90IHRvIGJlIGFzc2lnbmFibGUgdG9cbiAgICAvLyBgdHMuQ2xhc3NFbGVtZW50YC4gU2luY2UgYGVsZW1lbnRgIHdhcyBhIGB0cy5NZXRob2RTaWduYXR1cmVgIGFscmVhZHksIHRyYW5zZm9ybWluZyBpdCBpbnRvXG4gICAgLy8gdGhpcyB0eXBlIGlzIGFjdHVhbGx5IGNvcnJlY3QuXG4gICAgcmV0dXJuIG1ldGhvZFNpZ25hdHVyZSBhcyB1bmtub3duIGFzIHRzLkNsYXNzRWxlbWVudDtcbiAgfVxuXG4gIHRyYW5zZm9ybUZ1bmN0aW9uRGVjbGFyYXRpb24oZWxlbWVudDogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiwgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6XG4gICAgICB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uIHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShlbGVtZW50KSBhcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAgIGlmICghdGhpcy50eXBlUmVwbGFjZW1lbnRzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH1cbiAgICBjb25zdCByZXR1cm5UeXBlID0gdGhpcy50eXBlUmVwbGFjZW1lbnRzLmdldChvcmlnaW5hbCkhO1xuICAgIGNvbnN0IHRzUmV0dXJuVHlwZSA9IHRyYW5zbGF0ZVR5cGUocmV0dXJuVHlwZSwgaW1wb3J0cyk7XG5cbiAgICByZXR1cm4gdHMudXBkYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgICAgLyogbm9kZSAqLyBlbGVtZW50LFxuICAgICAgICAvKiBkZWNvcmF0b3JzICovIGVsZW1lbnQuZGVjb3JhdG9ycyxcbiAgICAgICAgLyogbW9kaWZpZXJzICovIGVsZW1lbnQubW9kaWZpZXJzLFxuICAgICAgICAvKiBhc3Rlcmlza1Rva2VuICovIGVsZW1lbnQuYXN0ZXJpc2tUb2tlbixcbiAgICAgICAgLyogbmFtZSAqLyBlbGVtZW50Lm5hbWUsXG4gICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIGVsZW1lbnQudHlwZVBhcmFtZXRlcnMsXG4gICAgICAgIC8qIHBhcmFtZXRlcnMgKi8gZWxlbWVudC5wYXJhbWV0ZXJzLFxuICAgICAgICAvKiB0eXBlICovIHRzUmV0dXJuVHlwZSxcbiAgICAgICAgLyogYm9keSAqLyBlbGVtZW50LmJvZHkpO1xuICB9XG59XG4iXX0=