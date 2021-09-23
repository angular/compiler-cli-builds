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
        define("@angular/compiler-cli/src/ngtsc/transform/src/declaration", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/transform/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IvyDeclarationDtsTransform = exports.declarationTransformFactory = exports.DtsTransformRegistry = void 0;
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
        }
        DtsTransformRegistry.prototype.getIvyDeclarationTransform = function (sf) {
            if (!this.ivyDeclarationTransforms.has(sf)) {
                this.ivyDeclarationTransforms.set(sf, new IvyDeclarationDtsTransform());
            }
            return this.ivyDeclarationTransforms.get(sf);
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
            return (0, utils_1.addImports)(imports, sf);
        };
        DtsTransformer.prototype.transformClassDeclaration = function (clazz, transforms, imports) {
            var e_1, _a, e_2, _b;
            var elements = clazz.members;
            var elementsChanged = false;
            try {
                for (var transforms_1 = (0, tslib_1.__values)(transforms), transforms_1_1 = transforms_1.next(); !transforms_1_1.done; transforms_1_1 = transforms_1.next()) {
                    var transform = transforms_1_1.value;
                    if (transform.transformClassElement !== undefined) {
                        for (var i = 0; i < elements.length; i++) {
                            var res = transform.transformClassElement(elements[i], imports);
                            if (res !== elements[i]) {
                                if (!elementsChanged) {
                                    elements = (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(elements), false);
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
                for (var transforms_2 = (0, tslib_1.__values)(transforms), transforms_2_1 = transforms_2.next(); !transforms_2_1.done; transforms_2_1 = transforms_2.next()) {
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
                for (var transforms_3 = (0, tslib_1.__values)(transforms), transforms_3_1 = transforms_3.next(); !transforms_3_1.done; transforms_3_1 = transforms_3.next()) {
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
                var typeRef = (0, translator_1.translateType)(decl.type, imports);
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
            /* heritageClauses */ clazz.heritageClauses, (0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(members), false), (0, tslib_1.__read)(newMembers), false));
        };
        return IvyDeclarationDtsTransform;
    }());
    exports.IvyDeclarationDtsTransform = IvyDeclarationDtsTransform;
    function markForEmitAsSingleLine(node) {
        ts.setEmitFlags(node, ts.EmitFlags.SingleLine);
        ts.forEachChild(node, markForEmitAsSingleLine);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjbGFyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvZGVjbGFyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUlqQyx5RUFBOEQ7SUFHOUQsNkVBQW1DO0lBRW5DOzs7T0FHRztJQUNIO1FBQUE7WUFDVSw2QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBNkMsQ0FBQztRQThCMUYsQ0FBQztRQTVCQyx5REFBMEIsR0FBMUIsVUFBMkIsRUFBaUI7WUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQzFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksMEJBQTBCLEVBQUUsQ0FBQyxDQUFDO2FBQ3pFO1lBQ0QsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBRSxDQUFDO1FBQ2hELENBQUM7UUFFRDs7O1dBR0c7UUFDSCwrQ0FBZ0IsR0FBaEIsVUFBaUIsRUFBaUI7WUFDaEMsNkZBQTZGO1lBQzdGLHdGQUF3RjtZQUN4Riw2RkFBNkY7WUFDN0YsNERBQTREO1lBQzVELElBQUksQ0FBQyxFQUFFLENBQUMsaUJBQWlCLEVBQUU7Z0JBQ3pCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFNLFVBQVUsR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBa0IsQ0FBQztZQUUzRCxJQUFJLFVBQVUsR0FBd0IsSUFBSSxDQUFDO1lBQzNDLElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDakQsVUFBVSxHQUFHLEVBQUUsQ0FBQztnQkFDaEIsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRSxDQUFDLENBQUM7YUFDakU7WUFDRCxPQUFPLFVBQVUsQ0FBQztRQUNwQixDQUFDO1FBQ0gsMkJBQUM7SUFBRCxDQUFDLEFBL0JELElBK0JDO0lBL0JZLG9EQUFvQjtJQWlDakMsU0FBZ0IsMkJBQTJCLENBQ3ZDLGlCQUF1QyxFQUFFLGNBQThCLEVBQ3ZFLFlBQXFCO1FBQ3ZCLE9BQU8sVUFBQyxPQUFpQztZQUN2QyxJQUFNLFdBQVcsR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQzlFLE9BQU8sVUFBQyxZQUFZO2dCQUNsQixJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUU7b0JBQzdCLDBDQUEwQztvQkFDMUMsT0FBTyxZQUFZLENBQUM7aUJBQ3JCO2dCQUNELElBQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUNwRSxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7b0JBQ3ZCLE9BQU8sWUFBWSxDQUFDO2lCQUNyQjtnQkFDRCxPQUFPLFdBQVcsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3pELENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQztJQUNKLENBQUM7SUFqQkQsa0VBaUJDO0lBRUQ7O09BRUc7SUFDSDtRQUNFLHdCQUNZLEdBQTZCLEVBQVUsY0FBOEIsRUFDckUsWUFBcUI7WUFEckIsUUFBRyxHQUFILEdBQUcsQ0FBMEI7WUFBVSxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7WUFDckUsaUJBQVksR0FBWixZQUFZLENBQVM7UUFBRyxDQUFDO1FBRXJDOztXQUVHO1FBQ0gsa0NBQVMsR0FBVCxVQUFVLEVBQWlCLEVBQUUsVUFBMEI7WUFBdkQsaUJBbUJDO1lBbEJDLElBQU0sT0FBTyxHQUFHLElBQUksMEJBQWEsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUUxRSxJQUFNLE9BQU8sR0FBZSxVQUFDLElBQWE7Z0JBQ3hDLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFO29CQUMvQixPQUFPLEtBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUNsRTtxQkFBTSxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDekMsT0FBTyxLQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztpQkFDckU7cUJBQU07b0JBQ0wsK0JBQStCO29CQUMvQixPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ25EO1lBQ0gsQ0FBQyxDQUFDO1lBRUYscUVBQXFFO1lBQ3JFLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUUvQixpQ0FBaUM7WUFDakMsT0FBTyxJQUFBLGtCQUFVLEVBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFFTyxrREFBeUIsR0FBakMsVUFDSSxLQUEwQixFQUFFLFVBQTBCLEVBQ3RELE9BQXNCOztZQUN4QixJQUFJLFFBQVEsR0FBcUQsS0FBSyxDQUFDLE9BQU8sQ0FBQztZQUMvRSxJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUM7O2dCQUU1QixLQUF3QixJQUFBLGVBQUEsc0JBQUEsVUFBVSxDQUFBLHNDQUFBLDhEQUFFO29CQUEvQixJQUFNLFNBQVMsdUJBQUE7b0JBQ2xCLElBQUksU0FBUyxDQUFDLHFCQUFxQixLQUFLLFNBQVMsRUFBRTt3QkFDakQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7NEJBQ3hDLElBQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7NEJBQ2xFLElBQUksR0FBRyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQ0FDdkIsSUFBSSxDQUFDLGVBQWUsRUFBRTtvQ0FDcEIsUUFBUSxzREFBTyxRQUFRLFNBQUMsQ0FBQztvQ0FDekIsZUFBZSxHQUFHLElBQUksQ0FBQztpQ0FDeEI7Z0NBQ0EsUUFBOEIsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7NkJBQzFDO3lCQUNGO3FCQUNGO2lCQUNGOzs7Ozs7Ozs7WUFFRCxJQUFJLFFBQVEsR0FBd0IsS0FBSyxDQUFDOztnQkFFMUMsS0FBd0IsSUFBQSxlQUFBLHNCQUFBLFVBQVUsQ0FBQSxzQ0FBQSw4REFBRTtvQkFBL0IsSUFBTSxTQUFTLHVCQUFBO29CQUNsQixJQUFJLFNBQVMsQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFO3dCQUMxQywwRkFBMEY7d0JBQzFGLDJGQUEyRjt3QkFDM0YsSUFBTSxZQUFZLEdBQUcsQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFFeEUsUUFBUSxHQUFHLFNBQVMsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztxQkFDdEU7aUJBQ0Y7Ozs7Ozs7OztZQUVELCtGQUErRjtZQUMvRiwwREFBMEQ7WUFDMUQsSUFBSSxlQUFlLElBQUksS0FBSyxLQUFLLFFBQVEsRUFBRTtnQkFDekMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxzQkFBc0I7Z0JBQ2hDLFVBQVUsQ0FBQyxLQUFLO2dCQUNoQixnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsVUFBVTtnQkFDakMsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUMvQixVQUFVLENBQUMsS0FBSyxDQUFDLElBQUk7Z0JBQ3JCLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxjQUFjO2dCQUN6QyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsZUFBZTtnQkFDM0MsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzdCO1lBRUQsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztRQUVPLHFEQUE0QixHQUFwQyxVQUNJLFdBQW1DLEVBQUUsVUFBMEIsRUFDL0QsT0FBc0I7O1lBQ3hCLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQzs7Z0JBRTFCLEtBQXdCLElBQUEsZUFBQSxzQkFBQSxVQUFVLENBQUEsc0NBQUEsOERBQUU7b0JBQS9CLElBQU0sU0FBUyx1QkFBQTtvQkFDbEIsSUFBSSxTQUFTLENBQUMsNEJBQTRCLEtBQUssU0FBUyxFQUFFO3dCQUN4RCxPQUFPLEdBQUcsU0FBUyxDQUFDLDRCQUE0QixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztxQkFDcEU7aUJBQ0Y7Ozs7Ozs7OztZQUVELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFDSCxxQkFBQztJQUFELENBQUMsQUEzRkQsSUEyRkM7SUFPRDtRQUFBO1lBQ1Usc0JBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQTJDLENBQUM7UUFzQ2pGLENBQUM7UUFwQ0MsOENBQVMsR0FBVCxVQUFVLElBQXNCLEVBQUUsTUFBNkI7WUFDN0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUVELG1EQUFjLEdBQWQsVUFDSSxLQUEwQixFQUFFLE9BQXVDLEVBQ25FLE9BQXNCO1lBQ3hCLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFxQixDQUFDO1lBRS9ELElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUN6QyxPQUFPLEtBQUssQ0FBQzthQUNkO1lBQ0QsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUUsQ0FBQztZQUVyRCxJQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSTtnQkFDaEMsSUFBTSxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDbkUsSUFBTSxPQUFPLEdBQUcsSUFBQSwwQkFBYSxFQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ2xELHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNqQyxPQUFPLEVBQUUsQ0FBQyxjQUFjO2dCQUNwQixnQkFBZ0IsQ0FBQyxTQUFTO2dCQUMxQixlQUFlLENBQUMsU0FBUztnQkFDekIsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUNwQixnQ0FBZ0MsQ0FBQyxTQUFTO2dCQUMxQyxVQUFVLENBQUMsT0FBTztnQkFDbEIsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbkMsQ0FBQyxDQUFDLENBQUM7WUFFSCxPQUFPLEVBQUUsQ0FBQyxzQkFBc0I7WUFDNUIsVUFBVSxDQUFDLEtBQUs7WUFDaEIsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFVBQVU7WUFDakMsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTO1lBQy9CLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSTtZQUNyQixvQkFBb0IsQ0FBQyxLQUFLLENBQUMsY0FBYztZQUN6QyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsZUFBZSxnRkFDMUIsT0FBTywrQkFBSyxVQUFVLFVBQUUsQ0FBQztRQUNoRCxDQUFDO1FBQ0gsaUNBQUM7SUFBRCxDQUFDLEFBdkNELElBdUNDO0lBdkNZLGdFQUEwQjtJQXlDdkMsU0FBUyx1QkFBdUIsQ0FBQyxJQUFhO1FBQzVDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDL0MsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUNqRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7VHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7SW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlVHlwZX0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5cbmltcG9ydCB7RHRzVHJhbnNmb3JtfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2FkZEltcG9ydHN9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEtlZXBzIHRyYWNrIG9mIGBEdHNUcmFuc2Zvcm1gcyBwZXIgc291cmNlIGZpbGUsIHNvIHRoYXQgaXQgaXMga25vd24gd2hpY2ggc291cmNlIGZpbGVzIG5lZWQgdG9cbiAqIGhhdmUgdGhlaXIgZGVjbGFyYXRpb24gZmlsZSB0cmFuc2Zvcm1lZC5cbiAqL1xuZXhwb3J0IGNsYXNzIER0c1RyYW5zZm9ybVJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBpdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIEl2eURlY2xhcmF0aW9uRHRzVHJhbnNmb3JtPigpO1xuXG4gIGdldEl2eURlY2xhcmF0aW9uVHJhbnNmb3JtKHNmOiB0cy5Tb3VyY2VGaWxlKTogSXZ5RGVjbGFyYXRpb25EdHNUcmFuc2Zvcm0ge1xuICAgIGlmICghdGhpcy5pdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMuaGFzKHNmKSkge1xuICAgICAgdGhpcy5pdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMuc2V0KHNmLCBuZXcgSXZ5RGVjbGFyYXRpb25EdHNUcmFuc2Zvcm0oKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLml2eURlY2xhcmF0aW9uVHJhbnNmb3Jtcy5nZXQoc2YpITtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBkdHMgdHJhbnNmb3JtcyB0byBiZSBhcHBsaWVkIGZvciB0aGUgZ2l2ZW4gc291cmNlIGZpbGUsIG9yIGBudWxsYCBpZiBubyB0cmFuc2Zvcm0gaXNcbiAgICogbmVjZXNzYXJ5LlxuICAgKi9cbiAgZ2V0QWxsVHJhbnNmb3JtcyhzZjogdHMuU291cmNlRmlsZSk6IER0c1RyYW5zZm9ybVtdfG51bGwge1xuICAgIC8vIE5vIG5lZWQgdG8gdHJhbnNmb3JtIGlmIGl0J3Mgbm90IGEgZGVjbGFyYXRpb25zIGZpbGUsIG9yIGlmIG5vIGNoYW5nZXMgaGF2ZSBiZWVuIHJlcXVlc3RlZFxuICAgIC8vIHRvIHRoZSBpbnB1dCBmaWxlLiBEdWUgdG8gdGhlIHdheSBUeXBlU2NyaXB0IGFmdGVyRGVjbGFyYXRpb25zIHRyYW5zZm9ybWVycyB3b3JrLCB0aGVcbiAgICAvLyBgdHMuU291cmNlRmlsZWAgcGF0aCBpcyB0aGUgc2FtZSBhcyB0aGUgb3JpZ2luYWwgLnRzLiBUaGUgb25seSB3YXkgd2Uga25vdyBpdCdzIGFjdHVhbGx5IGFcbiAgICAvLyBkZWNsYXJhdGlvbiBmaWxlIGlzIHZpYSB0aGUgYGlzRGVjbGFyYXRpb25GaWxlYCBwcm9wZXJ0eS5cbiAgICBpZiAoIXNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgb3JpZ2luYWxTZiA9IHRzLmdldE9yaWdpbmFsTm9kZShzZikgYXMgdHMuU291cmNlRmlsZTtcblxuICAgIGxldCB0cmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1bXXxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5pdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMuaGFzKG9yaWdpbmFsU2YpKSB7XG4gICAgICB0cmFuc2Zvcm1zID0gW107XG4gICAgICB0cmFuc2Zvcm1zLnB1c2godGhpcy5pdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMuZ2V0KG9yaWdpbmFsU2YpISk7XG4gICAgfVxuICAgIHJldHVybiB0cmFuc2Zvcm1zO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnkoXG4gICAgdHJhbnNmb3JtUmVnaXN0cnk6IER0c1RyYW5zZm9ybVJlZ2lzdHJ5LCBpbXBvcnRSZXdyaXRlcjogSW1wb3J0UmV3cml0ZXIsXG4gICAgaW1wb3J0UHJlZml4Pzogc3RyaW5nKTogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpID0+IHtcbiAgICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBEdHNUcmFuc2Zvcm1lcihjb250ZXh0LCBpbXBvcnRSZXdyaXRlciwgaW1wb3J0UHJlZml4KTtcbiAgICByZXR1cm4gKGZpbGVPckJ1bmRsZSkgPT4ge1xuICAgICAgaWYgKHRzLmlzQnVuZGxlKGZpbGVPckJ1bmRsZSkpIHtcbiAgICAgICAgLy8gT25seSBhdHRlbXB0IHRvIHRyYW5zZm9ybSBzb3VyY2UgZmlsZXMuXG4gICAgICAgIHJldHVybiBmaWxlT3JCdW5kbGU7XG4gICAgICB9XG4gICAgICBjb25zdCB0cmFuc2Zvcm1zID0gdHJhbnNmb3JtUmVnaXN0cnkuZ2V0QWxsVHJhbnNmb3JtcyhmaWxlT3JCdW5kbGUpO1xuICAgICAgaWYgKHRyYW5zZm9ybXMgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGZpbGVPckJ1bmRsZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cmFuc2Zvcm1lci50cmFuc2Zvcm0oZmlsZU9yQnVuZGxlLCB0cmFuc2Zvcm1zKTtcbiAgICB9O1xuICB9O1xufVxuXG4vKipcbiAqIFByb2Nlc3NlcyAuZC50cyBmaWxlIHRleHQgYW5kIGFkZHMgc3RhdGljIGZpZWxkIGRlY2xhcmF0aW9ucywgd2l0aCB0eXBlcy5cbiAqL1xuY2xhc3MgRHRzVHJhbnNmb3JtZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgY3R4OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQsIHByaXZhdGUgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyLFxuICAgICAgcHJpdmF0ZSBpbXBvcnRQcmVmaXg/OiBzdHJpbmcpIHt9XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybSB0aGUgZGVjbGFyYXRpb24gZmlsZSBhbmQgYWRkIGFueSBkZWNsYXJhdGlvbnMgd2hpY2ggd2VyZSByZWNvcmRlZC5cbiAgICovXG4gIHRyYW5zZm9ybShzZjogdHMuU291cmNlRmlsZSwgdHJhbnNmb3JtczogRHRzVHJhbnNmb3JtW10pOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICBjb25zdCBpbXBvcnRzID0gbmV3IEltcG9ydE1hbmFnZXIodGhpcy5pbXBvcnRSZXdyaXRlciwgdGhpcy5pbXBvcnRQcmVmaXgpO1xuXG4gICAgY29uc3QgdmlzaXRvcjogdHMuVmlzaXRvciA9IChub2RlOiB0cy5Ob2RlKTogdHMuVmlzaXRSZXN1bHQ8dHMuTm9kZT4gPT4ge1xuICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm1DbGFzc0RlY2xhcmF0aW9uKG5vZGUsIHRyYW5zZm9ybXMsIGltcG9ydHMpO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNmb3JtRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlLCB0cmFuc2Zvcm1zLCBpbXBvcnRzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSByZXR1cm4gbm9kZSBhcyBpcy5cbiAgICAgICAgcmV0dXJuIHRzLnZpc2l0RWFjaENoaWxkKG5vZGUsIHZpc2l0b3IsIHRoaXMuY3R4KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gUmVjdXJzaXZlbHkgc2NhbiB0aHJvdWdoIHRoZSBBU1QgYW5kIHByb2Nlc3MgYWxsIG5vZGVzIGFzIGRlc2lyZWQuXG4gICAgc2YgPSB0cy52aXNpdE5vZGUoc2YsIHZpc2l0b3IpO1xuXG4gICAgLy8gQWRkIG5ldyBpbXBvcnRzIGZvciB0aGlzIGZpbGUuXG4gICAgcmV0dXJuIGFkZEltcG9ydHMoaW1wb3J0cywgc2YpO1xuICB9XG5cbiAgcHJpdmF0ZSB0cmFuc2Zvcm1DbGFzc0RlY2xhcmF0aW9uKFxuICAgICAgY2xheno6IHRzLkNsYXNzRGVjbGFyYXRpb24sIHRyYW5zZm9ybXM6IER0c1RyYW5zZm9ybVtdLFxuICAgICAgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHRzLkNsYXNzRGVjbGFyYXRpb24ge1xuICAgIGxldCBlbGVtZW50czogdHMuQ2xhc3NFbGVtZW50W118UmVhZG9ubHlBcnJheTx0cy5DbGFzc0VsZW1lbnQ+ID0gY2xhenoubWVtYmVycztcbiAgICBsZXQgZWxlbWVudHNDaGFuZ2VkID0gZmFsc2U7XG5cbiAgICBmb3IgKGNvbnN0IHRyYW5zZm9ybSBvZiB0cmFuc2Zvcm1zKSB7XG4gICAgICBpZiAodHJhbnNmb3JtLnRyYW5zZm9ybUNsYXNzRWxlbWVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCByZXMgPSB0cmFuc2Zvcm0udHJhbnNmb3JtQ2xhc3NFbGVtZW50KGVsZW1lbnRzW2ldLCBpbXBvcnRzKTtcbiAgICAgICAgICBpZiAocmVzICE9PSBlbGVtZW50c1tpXSkge1xuICAgICAgICAgICAgaWYgKCFlbGVtZW50c0NoYW5nZWQpIHtcbiAgICAgICAgICAgICAgZWxlbWVudHMgPSBbLi4uZWxlbWVudHNdO1xuICAgICAgICAgICAgICBlbGVtZW50c0NoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKGVsZW1lbnRzIGFzIHRzLkNsYXNzRWxlbWVudFtdKVtpXSA9IHJlcztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgbmV3Q2xheno6IHRzLkNsYXNzRGVjbGFyYXRpb24gPSBjbGF6ejtcblxuICAgIGZvciAoY29uc3QgdHJhbnNmb3JtIG9mIHRyYW5zZm9ybXMpIHtcbiAgICAgIGlmICh0cmFuc2Zvcm0udHJhbnNmb3JtQ2xhc3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBJZiBubyBEdHNUcmFuc2Zvcm0gaGFzIGNoYW5nZWQgdGhlIGNsYXNzIHlldCwgdGhlbiB0aGUgKHBvc3NpYmx5IG11dGF0ZWQpIGVsZW1lbnRzIGhhdmVcbiAgICAgICAgLy8gbm90IHlldCBiZWVuIGluY29ycG9yYXRlZC4gT3RoZXJ3aXNlLCBgbmV3Q2xhenoubWVtYmVyc2AgaG9sZHMgdGhlIGxhdGVzdCBjbGFzcyBtZW1iZXJzLlxuICAgICAgICBjb25zdCBpbnB1dE1lbWJlcnMgPSAoY2xhenogPT09IG5ld0NsYXp6ID8gZWxlbWVudHMgOiBuZXdDbGF6ei5tZW1iZXJzKTtcblxuICAgICAgICBuZXdDbGF6eiA9IHRyYW5zZm9ybS50cmFuc2Zvcm1DbGFzcyhuZXdDbGF6eiwgaW5wdXRNZW1iZXJzLCBpbXBvcnRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiBzb21lIGVsZW1lbnRzIGhhdmUgYmVlbiB0cmFuc2Zvcm1lZCBidXQgdGhlIGNsYXNzIGl0c2VsZiBoYXMgbm90IGJlZW4gdHJhbnNmb3JtZWQsIGNyZWF0ZVxuICAgIC8vIGFuIHVwZGF0ZWQgY2xhc3MgZGVjbGFyYXRpb24gd2l0aCB0aGUgdXBkYXRlZCBlbGVtZW50cy5cbiAgICBpZiAoZWxlbWVudHNDaGFuZ2VkICYmIGNsYXp6ID09PSBuZXdDbGF6eikge1xuICAgICAgbmV3Q2xhenogPSB0cy51cGRhdGVDbGFzc0RlY2xhcmF0aW9uKFxuICAgICAgICAgIC8qIG5vZGUgKi8gY2xhenosXG4gICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyBjbGF6ei5kZWNvcmF0b3JzLFxuICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyBjbGF6ei5tb2RpZmllcnMsXG4gICAgICAgICAgLyogbmFtZSAqLyBjbGF6ei5uYW1lLFxuICAgICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIGNsYXp6LnR5cGVQYXJhbWV0ZXJzLFxuICAgICAgICAgIC8qIGhlcml0YWdlQ2xhdXNlcyAqLyBjbGF6ei5oZXJpdGFnZUNsYXVzZXMsXG4gICAgICAgICAgLyogbWVtYmVycyAqLyBlbGVtZW50cyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld0NsYXp6O1xuICB9XG5cbiAgcHJpdmF0ZSB0cmFuc2Zvcm1GdW5jdGlvbkRlY2xhcmF0aW9uKFxuICAgICAgZGVjbGFyYXRpb246IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24sIHRyYW5zZm9ybXM6IER0c1RyYW5zZm9ybVtdLFxuICAgICAgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24ge1xuICAgIGxldCBuZXdEZWNsID0gZGVjbGFyYXRpb247XG5cbiAgICBmb3IgKGNvbnN0IHRyYW5zZm9ybSBvZiB0cmFuc2Zvcm1zKSB7XG4gICAgICBpZiAodHJhbnNmb3JtLnRyYW5zZm9ybUZ1bmN0aW9uRGVjbGFyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBuZXdEZWNsID0gdHJhbnNmb3JtLnRyYW5zZm9ybUZ1bmN0aW9uRGVjbGFyYXRpb24obmV3RGVjbCwgaW1wb3J0cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld0RlY2w7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBJdnlEZWNsYXJhdGlvbkZpZWxkIHtcbiAgbmFtZTogc3RyaW5nO1xuICB0eXBlOiBUeXBlO1xufVxuXG5leHBvcnQgY2xhc3MgSXZ5RGVjbGFyYXRpb25EdHNUcmFuc2Zvcm0gaW1wbGVtZW50cyBEdHNUcmFuc2Zvcm0ge1xuICBwcml2YXRlIGRlY2xhcmF0aW9uRmllbGRzID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBJdnlEZWNsYXJhdGlvbkZpZWxkW10+KCk7XG5cbiAgYWRkRmllbGRzKGRlY2w6IENsYXNzRGVjbGFyYXRpb24sIGZpZWxkczogSXZ5RGVjbGFyYXRpb25GaWVsZFtdKTogdm9pZCB7XG4gICAgdGhpcy5kZWNsYXJhdGlvbkZpZWxkcy5zZXQoZGVjbCwgZmllbGRzKTtcbiAgfVxuXG4gIHRyYW5zZm9ybUNsYXNzKFxuICAgICAgY2xheno6IHRzLkNsYXNzRGVjbGFyYXRpb24sIG1lbWJlcnM6IFJlYWRvbmx5QXJyYXk8dHMuQ2xhc3NFbGVtZW50PixcbiAgICAgIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiB0cy5DbGFzc0RlY2xhcmF0aW9uIHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShjbGF6eikgYXMgQ2xhc3NEZWNsYXJhdGlvbjtcblxuICAgIGlmICghdGhpcy5kZWNsYXJhdGlvbkZpZWxkcy5oYXMob3JpZ2luYWwpKSB7XG4gICAgICByZXR1cm4gY2xheno7XG4gICAgfVxuICAgIGNvbnN0IGZpZWxkcyA9IHRoaXMuZGVjbGFyYXRpb25GaWVsZHMuZ2V0KG9yaWdpbmFsKSE7XG5cbiAgICBjb25zdCBuZXdNZW1iZXJzID0gZmllbGRzLm1hcChkZWNsID0+IHtcbiAgICAgIGNvbnN0IG1vZGlmaWVycyA9IFt0cy5jcmVhdGVNb2RpZmllcih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpXTtcbiAgICAgIGNvbnN0IHR5cGVSZWYgPSB0cmFuc2xhdGVUeXBlKGRlY2wudHlwZSwgaW1wb3J0cyk7XG4gICAgICBtYXJrRm9yRW1pdEFzU2luZ2xlTGluZSh0eXBlUmVmKTtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eShcbiAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gbW9kaWZpZXJzLFxuICAgICAgICAgIC8qIG5hbWUgKi8gZGVjbC5uYW1lLFxuICAgICAgICAgIC8qIHF1ZXN0aW9uT3JFeGNsYW1hdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAvKiB0eXBlICovIHR5cGVSZWYsXG4gICAgICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gdW5kZWZpbmVkKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0cy51cGRhdGVDbGFzc0RlY2xhcmF0aW9uKFxuICAgICAgICAvKiBub2RlICovIGNsYXp6LFxuICAgICAgICAvKiBkZWNvcmF0b3JzICovIGNsYXp6LmRlY29yYXRvcnMsXG4gICAgICAgIC8qIG1vZGlmaWVycyAqLyBjbGF6ei5tb2RpZmllcnMsXG4gICAgICAgIC8qIG5hbWUgKi8gY2xhenoubmFtZSxcbiAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gY2xhenoudHlwZVBhcmFtZXRlcnMsXG4gICAgICAgIC8qIGhlcml0YWdlQ2xhdXNlcyAqLyBjbGF6ei5oZXJpdGFnZUNsYXVzZXMsXG4gICAgICAgIC8qIG1lbWJlcnMgKi9bLi4ubWVtYmVycywgLi4ubmV3TWVtYmVyc10pO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1hcmtGb3JFbWl0QXNTaW5nbGVMaW5lKG5vZGU6IHRzLk5vZGUpIHtcbiAgdHMuc2V0RW1pdEZsYWdzKG5vZGUsIHRzLkVtaXRGbGFncy5TaW5nbGVMaW5lKTtcbiAgdHMuZm9yRWFjaENoaWxkKG5vZGUsIG1hcmtGb3JFbWl0QXNTaW5nbGVMaW5lKTtcbn1cbiJdfQ==