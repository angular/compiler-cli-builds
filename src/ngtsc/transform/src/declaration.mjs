/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { ImportManager, translateType } from '../../translator';
import { addImports } from './utils';
/**
 * Keeps track of `DtsTransform`s per source file, so that it is known which source files need to
 * have their declaration file transformed.
 */
export class DtsTransformRegistry {
    constructor() {
        this.ivyDeclarationTransforms = new Map();
        this.returnTypeTransforms = new Map();
    }
    getIvyDeclarationTransform(sf) {
        if (!this.ivyDeclarationTransforms.has(sf)) {
            this.ivyDeclarationTransforms.set(sf, new IvyDeclarationDtsTransform());
        }
        return this.ivyDeclarationTransforms.get(sf);
    }
    getReturnTypeTransform(sf) {
        if (!this.returnTypeTransforms.has(sf)) {
            this.returnTypeTransforms.set(sf, new ReturnTypeTransform());
        }
        return this.returnTypeTransforms.get(sf);
    }
    /**
     * Gets the dts transforms to be applied for the given source file, or `null` if no transform is
     * necessary.
     */
    getAllTransforms(sf) {
        // No need to transform if it's not a declarations file, or if no changes have been requested
        // to the input file. Due to the way TypeScript afterDeclarations transformers work, the
        // `ts.SourceFile` path is the same as the original .ts. The only way we know it's actually a
        // declaration file is via the `isDeclarationFile` property.
        if (!sf.isDeclarationFile) {
            return null;
        }
        const originalSf = ts.getOriginalNode(sf);
        let transforms = null;
        if (this.ivyDeclarationTransforms.has(originalSf)) {
            transforms = [];
            transforms.push(this.ivyDeclarationTransforms.get(originalSf));
        }
        if (this.returnTypeTransforms.has(originalSf)) {
            transforms = transforms || [];
            transforms.push(this.returnTypeTransforms.get(originalSf));
        }
        return transforms;
    }
}
export function declarationTransformFactory(transformRegistry, importRewriter, importPrefix) {
    return (context) => {
        const transformer = new DtsTransformer(context, importRewriter, importPrefix);
        return (fileOrBundle) => {
            if (ts.isBundle(fileOrBundle)) {
                // Only attempt to transform source files.
                return fileOrBundle;
            }
            const transforms = transformRegistry.getAllTransforms(fileOrBundle);
            if (transforms === null) {
                return fileOrBundle;
            }
            return transformer.transform(fileOrBundle, transforms);
        };
    };
}
/**
 * Processes .d.ts file text and adds static field declarations, with types.
 */
class DtsTransformer {
    constructor(ctx, importRewriter, importPrefix) {
        this.ctx = ctx;
        this.importRewriter = importRewriter;
        this.importPrefix = importPrefix;
    }
    /**
     * Transform the declaration file and add any declarations which were recorded.
     */
    transform(sf, transforms) {
        const imports = new ImportManager(this.importRewriter, this.importPrefix);
        const visitor = (node) => {
            if (ts.isClassDeclaration(node)) {
                return this.transformClassDeclaration(node, transforms, imports);
            }
            else if (ts.isFunctionDeclaration(node)) {
                return this.transformFunctionDeclaration(node, transforms, imports);
            }
            else {
                // Otherwise return node as is.
                return ts.visitEachChild(node, visitor, this.ctx);
            }
        };
        // Recursively scan through the AST and process all nodes as desired.
        sf = ts.visitNode(sf, visitor);
        // Add new imports for this file.
        return addImports(imports, sf);
    }
    transformClassDeclaration(clazz, transforms, imports) {
        let elements = clazz.members;
        let elementsChanged = false;
        for (const transform of transforms) {
            if (transform.transformClassElement !== undefined) {
                for (let i = 0; i < elements.length; i++) {
                    const res = transform.transformClassElement(elements[i], imports);
                    if (res !== elements[i]) {
                        if (!elementsChanged) {
                            elements = [...elements];
                            elementsChanged = true;
                        }
                        elements[i] = res;
                    }
                }
            }
        }
        let newClazz = clazz;
        for (const transform of transforms) {
            if (transform.transformClass !== undefined) {
                // If no DtsTransform has changed the class yet, then the (possibly mutated) elements have
                // not yet been incorporated. Otherwise, `newClazz.members` holds the latest class members.
                const inputMembers = (clazz === newClazz ? elements : newClazz.members);
                newClazz = transform.transformClass(newClazz, inputMembers, imports);
            }
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
    }
    transformFunctionDeclaration(declaration, transforms, imports) {
        let newDecl = declaration;
        for (const transform of transforms) {
            if (transform.transformFunctionDeclaration !== undefined) {
                newDecl = transform.transformFunctionDeclaration(newDecl, imports);
            }
        }
        return newDecl;
    }
}
export class IvyDeclarationDtsTransform {
    constructor() {
        this.declarationFields = new Map();
    }
    addFields(decl, fields) {
        this.declarationFields.set(decl, fields);
    }
    transformClass(clazz, members, imports) {
        const original = ts.getOriginalNode(clazz);
        if (!this.declarationFields.has(original)) {
            return clazz;
        }
        const fields = this.declarationFields.get(original);
        const newMembers = fields.map(decl => {
            const modifiers = [ts.createModifier(ts.SyntaxKind.StaticKeyword)];
            const typeRef = translateType(decl.type, imports);
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
        /* heritageClauses */ clazz.heritageClauses, 
        /* members */ [...members, ...newMembers]);
    }
}
function markForEmitAsSingleLine(node) {
    ts.setEmitFlags(node, ts.EmitFlags.SingleLine);
    ts.forEachChild(node, markForEmitAsSingleLine);
}
export class ReturnTypeTransform {
    constructor() {
        this.typeReplacements = new Map();
    }
    addTypeReplacement(declaration, type) {
        this.typeReplacements.set(declaration, type);
    }
    transformClassElement(element, imports) {
        if (ts.isMethodDeclaration(element)) {
            const original = ts.getOriginalNode(element, ts.isMethodDeclaration);
            if (!this.typeReplacements.has(original)) {
                return element;
            }
            const returnType = this.typeReplacements.get(original);
            const tsReturnType = translateType(returnType, imports);
            return ts.updateMethod(element, element.decorators, element.modifiers, element.asteriskToken, element.name, element.questionToken, element.typeParameters, element.parameters, tsReturnType, element.body);
        }
        return element;
    }
    transformFunctionDeclaration(element, imports) {
        const original = ts.getOriginalNode(element);
        if (!this.typeReplacements.has(original)) {
            return element;
        }
        const returnType = this.typeReplacements.get(original);
        const tsReturnType = translateType(returnType, imports);
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
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjbGFyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvZGVjbGFyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFJakMsT0FBTyxFQUFDLGFBQWEsRUFBRSxhQUFhLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUc5RCxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sU0FBUyxDQUFDO0FBRW5DOzs7R0FHRztBQUNILE1BQU0sT0FBTyxvQkFBb0I7SUFBakM7UUFDVSw2QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBNkMsQ0FBQztRQUNoRix5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBc0MsQ0FBQztJQXlDL0UsQ0FBQztJQXZDQywwQkFBMEIsQ0FBQyxFQUFpQjtRQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUMxQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLDBCQUEwQixFQUFFLENBQUMsQ0FBQztTQUN6RTtRQUNELE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQztJQUNoRCxDQUFDO0lBRUQsc0JBQXNCLENBQUMsRUFBaUI7UUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDdEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxtQkFBbUIsRUFBRSxDQUFDLENBQUM7U0FDOUQ7UUFDRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFB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eXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7VHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7SW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlVHlwZX0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5cbmltcG9ydCB7RHRzVHJhbnNmb3JtfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2FkZEltcG9ydHN9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEtlZXBzIHRyYWNrIG9mIGBEdHNUcmFuc2Zvcm1gcyBwZXIgc291cmNlIGZpbGUsIHNvIHRoYXQgaXQgaXMga25vd24gd2hpY2ggc291cmNlIGZpbGVzIG5lZWQgdG9cbiAqIGhhdmUgdGhlaXIgZGVjbGFyYXRpb24gZmlsZSB0cmFuc2Zvcm1lZC5cbiAqL1xuZXhwb3J0IGNsYXNzIER0c1RyYW5zZm9ybVJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBpdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIEl2eURlY2xhcmF0aW9uRHRzVHJhbnNmb3JtPigpO1xuICBwcml2YXRlIHJldHVyblR5cGVUcmFuc2Zvcm1zID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBSZXR1cm5UeXBlVHJhbnNmb3JtPigpO1xuXG4gIGdldEl2eURlY2xhcmF0aW9uVHJhbnNmb3JtKHNmOiB0cy5Tb3VyY2VGaWxlKTogSXZ5RGVjbGFyYXRpb25EdHNUcmFuc2Zvcm0ge1xuICAgIGlmICghdGhpcy5pdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMuaGFzKHNmKSkge1xuICAgICAgdGhpcy5pdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMuc2V0KHNmLCBuZXcgSXZ5RGVjbGFyYXRpb25EdHNUcmFuc2Zvcm0oKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLml2eURlY2xhcmF0aW9uVHJhbnNmb3Jtcy5nZXQoc2YpITtcbiAgfVxuXG4gIGdldFJldHVyblR5cGVUcmFuc2Zvcm0oc2Y6IHRzLlNvdXJjZUZpbGUpOiBSZXR1cm5UeXBlVHJhbnNmb3JtIHtcbiAgICBpZiAoIXRoaXMucmV0dXJuVHlwZVRyYW5zZm9ybXMuaGFzKHNmKSkge1xuICAgICAgdGhpcy5yZXR1cm5UeXBlVHJhbnNmb3Jtcy5zZXQoc2YsIG5ldyBSZXR1cm5UeXBlVHJhbnNmb3JtKCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXR1cm5UeXBlVHJhbnNmb3Jtcy5nZXQoc2YpITtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBkdHMgdHJhbnNmb3JtcyB0byBiZSBhcHBsaWVkIGZvciB0aGUgZ2l2ZW4gc291cmNlIGZpbGUsIG9yIGBudWxsYCBpZiBubyB0cmFuc2Zvcm0gaXNcbiAgICogbmVjZXNzYXJ5LlxuICAgKi9cbiAgZ2V0QWxsVHJhbnNmb3JtcyhzZjogdHMuU291cmNlRmlsZSk6IER0c1RyYW5zZm9ybVtdfG51bGwge1xuICAgIC8vIE5vIG5lZWQgdG8gdHJhbnNmb3JtIGlmIGl0J3Mgbm90IGEgZGVjbGFyYXRpb25zIGZpbGUsIG9yIGlmIG5vIGNoYW5nZXMgaGF2ZSBiZWVuIHJlcXVlc3RlZFxuICAgIC8vIHRvIHRoZSBpbnB1dCBmaWxlLiBEdWUgdG8gdGhlIHdheSBUeXBlU2NyaXB0IGFmdGVyRGVjbGFyYXRpb25zIHRyYW5zZm9ybWVycyB3b3JrLCB0aGVcbiAgICAvLyBgdHMuU291cmNlRmlsZWAgcGF0aCBpcyB0aGUgc2FtZSBhcyB0aGUgb3JpZ2luYWwgLnRzLiBUaGUgb25seSB3YXkgd2Uga25vdyBpdCdzIGFjdHVhbGx5IGFcbiAgICAvLyBkZWNsYXJhdGlvbiBmaWxlIGlzIHZpYSB0aGUgYGlzRGVjbGFyYXRpb25GaWxlYCBwcm9wZXJ0eS5cbiAgICBpZiAoIXNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgb3JpZ2luYWxTZiA9IHRzLmdldE9yaWdpbmFsTm9kZShzZikgYXMgdHMuU291cmNlRmlsZTtcblxuICAgIGxldCB0cmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1bXXxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5pdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMuaGFzKG9yaWdpbmFsU2YpKSB7XG4gICAgICB0cmFuc2Zvcm1zID0gW107XG4gICAgICB0cmFuc2Zvcm1zLnB1c2godGhpcy5pdnlEZWNsYXJhdGlvblRyYW5zZm9ybXMuZ2V0KG9yaWdpbmFsU2YpISk7XG4gICAgfVxuICAgIGlmICh0aGlzLnJldHVyblR5cGVUcmFuc2Zvcm1zLmhhcyhvcmlnaW5hbFNmKSkge1xuICAgICAgdHJhbnNmb3JtcyA9IHRyYW5zZm9ybXMgfHwgW107XG4gICAgICB0cmFuc2Zvcm1zLnB1c2godGhpcy5yZXR1cm5UeXBlVHJhbnNmb3Jtcy5nZXQob3JpZ2luYWxTZikhKTtcbiAgICB9XG4gICAgcmV0dXJuIHRyYW5zZm9ybXM7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlY2xhcmF0aW9uVHJhbnNmb3JtRmFjdG9yeShcbiAgICB0cmFuc2Zvcm1SZWdpc3RyeTogRHRzVHJhbnNmb3JtUmVnaXN0cnksIGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlcixcbiAgICBpbXBvcnRQcmVmaXg/OiBzdHJpbmcpOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IER0c1RyYW5zZm9ybWVyKGNvbnRleHQsIGltcG9ydFJld3JpdGVyLCBpbXBvcnRQcmVmaXgpO1xuICAgIHJldHVybiAoZmlsZU9yQnVuZGxlKSA9PiB7XG4gICAgICBpZiAodHMuaXNCdW5kbGUoZmlsZU9yQnVuZGxlKSkge1xuICAgICAgICAvLyBPbmx5IGF0dGVtcHQgdG8gdHJhbnNmb3JtIHNvdXJjZSBmaWxlcy5cbiAgICAgICAgcmV0dXJuIGZpbGVPckJ1bmRsZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRyYW5zZm9ybXMgPSB0cmFuc2Zvcm1SZWdpc3RyeS5nZXRBbGxUcmFuc2Zvcm1zKGZpbGVPckJ1bmRsZSk7XG4gICAgICBpZiAodHJhbnNmb3JtcyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZmlsZU9yQnVuZGxlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRyYW5zZm9ybWVyLnRyYW5zZm9ybShmaWxlT3JCdW5kbGUsIHRyYW5zZm9ybXMpO1xuICAgIH07XG4gIH07XG59XG5cbi8qKlxuICogUHJvY2Vzc2VzIC5kLnRzIGZpbGUgdGV4dCBhbmQgYWRkcyBzdGF0aWMgZmllbGQgZGVjbGFyYXRpb25zLCB3aXRoIHR5cGVzLlxuICovXG5jbGFzcyBEdHNUcmFuc2Zvcm1lciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjdHg6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCwgcHJpdmF0ZSBpbXBvcnRSZXdyaXRlcjogSW1wb3J0UmV3cml0ZXIsXG4gICAgICBwcml2YXRlIGltcG9ydFByZWZpeD86IHN0cmluZykge31cblxuICAvKipcbiAgICogVHJhbnNmb3JtIHRoZSBkZWNsYXJhdGlvbiBmaWxlIGFuZCBhZGQgYW55IGRlY2xhcmF0aW9ucyB3aGljaCB3ZXJlIHJlY29yZGVkLlxuICAgKi9cbiAgdHJhbnNmb3JtKHNmOiB0cy5Tb3VyY2VGaWxlLCB0cmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1bXSk6IHRzLlNvdXJjZUZpbGUge1xuICAgIGNvbnN0IGltcG9ydHMgPSBuZXcgSW1wb3J0TWFuYWdlcih0aGlzLmltcG9ydFJld3JpdGVyLCB0aGlzLmltcG9ydFByZWZpeCk7XG5cbiAgICBjb25zdCB2aXNpdG9yOiB0cy5WaXNpdG9yID0gKG5vZGU6IHRzLk5vZGUpOiB0cy5WaXNpdFJlc3VsdDx0cy5Ob2RlPiA9PiB7XG4gICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRyYW5zZm9ybUNsYXNzRGVjbGFyYXRpb24obm9kZSwgdHJhbnNmb3JtcywgaW1wb3J0cyk7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm1GdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUsIHRyYW5zZm9ybXMsIGltcG9ydHMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlIHJldHVybiBub2RlIGFzIGlzLlxuICAgICAgICByZXR1cm4gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgdmlzaXRvciwgdGhpcy5jdHgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBSZWN1cnNpdmVseSBzY2FuIHRocm91Z2ggdGhlIEFTVCBhbmQgcHJvY2VzcyBhbGwgbm9kZXMgYXMgZGVzaXJlZC5cbiAgICBzZiA9IHRzLnZpc2l0Tm9kZShzZiwgdmlzaXRvcik7XG5cbiAgICAvLyBBZGQgbmV3IGltcG9ydHMgZm9yIHRoaXMgZmlsZS5cbiAgICByZXR1cm4gYWRkSW1wb3J0cyhpbXBvcnRzLCBzZik7XG4gIH1cblxuICBwcml2YXRlIHRyYW5zZm9ybUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgdHJhbnNmb3JtczogRHRzVHJhbnNmb3JtW10sXG4gICAgICBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogdHMuQ2xhc3NEZWNsYXJhdGlvbiB7XG4gICAgbGV0IGVsZW1lbnRzOiB0cy5DbGFzc0VsZW1lbnRbXXxSZWFkb25seUFycmF5PHRzLkNsYXNzRWxlbWVudD4gPSBjbGF6ei5tZW1iZXJzO1xuICAgIGxldCBlbGVtZW50c0NoYW5nZWQgPSBmYWxzZTtcblxuICAgIGZvciAoY29uc3QgdHJhbnNmb3JtIG9mIHRyYW5zZm9ybXMpIHtcbiAgICAgIGlmICh0cmFuc2Zvcm0udHJhbnNmb3JtQ2xhc3NFbGVtZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IHJlcyA9IHRyYW5zZm9ybS50cmFuc2Zvcm1DbGFzc0VsZW1lbnQoZWxlbWVudHNbaV0sIGltcG9ydHMpO1xuICAgICAgICAgIGlmIChyZXMgIT09IGVsZW1lbnRzW2ldKSB7XG4gICAgICAgICAgICBpZiAoIWVsZW1lbnRzQ2hhbmdlZCkge1xuICAgICAgICAgICAgICBlbGVtZW50cyA9IFsuLi5lbGVtZW50c107XG4gICAgICAgICAgICAgIGVsZW1lbnRzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAoZWxlbWVudHMgYXMgdHMuQ2xhc3NFbGVtZW50W10pW2ldID0gcmVzO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBuZXdDbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiA9IGNsYXp6O1xuXG4gICAgZm9yIChjb25zdCB0cmFuc2Zvcm0gb2YgdHJhbnNmb3Jtcykge1xuICAgICAgaWYgKHRyYW5zZm9ybS50cmFuc2Zvcm1DbGFzcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIElmIG5vIER0c1RyYW5zZm9ybSBoYXMgY2hhbmdlZCB0aGUgY2xhc3MgeWV0LCB0aGVuIHRoZSAocG9zc2libHkgbXV0YXRlZCkgZWxlbWVudHMgaGF2ZVxuICAgICAgICAvLyBub3QgeWV0IGJlZW4gaW5jb3Jwb3JhdGVkLiBPdGhlcndpc2UsIGBuZXdDbGF6ei5tZW1iZXJzYCBob2xkcyB0aGUgbGF0ZXN0IGNsYXNzIG1lbWJlcnMuXG4gICAgICAgIGNvbnN0IGlucHV0TWVtYmVycyA9IChjbGF6eiA9PT0gbmV3Q2xhenogPyBlbGVtZW50cyA6IG5ld0NsYXp6Lm1lbWJlcnMpO1xuXG4gICAgICAgIG5ld0NsYXp6ID0gdHJhbnNmb3JtLnRyYW5zZm9ybUNsYXNzKG5ld0NsYXp6LCBpbnB1dE1lbWJlcnMsIGltcG9ydHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHNvbWUgZWxlbWVudHMgaGF2ZSBiZWVuIHRyYW5zZm9ybWVkIGJ1dCB0aGUgY2xhc3MgaXRzZWxmIGhhcyBub3QgYmVlbiB0cmFuc2Zvcm1lZCwgY3JlYXRlXG4gICAgLy8gYW4gdXBkYXRlZCBjbGFzcyBkZWNsYXJhdGlvbiB3aXRoIHRoZSB1cGRhdGVkIGVsZW1lbnRzLlxuICAgIGlmIChlbGVtZW50c0NoYW5nZWQgJiYgY2xhenogPT09IG5ld0NsYXp6KSB7XG4gICAgICBuZXdDbGF6eiA9IHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgLyogbm9kZSAqLyBjbGF6eixcbiAgICAgICAgICAvKiBkZWNvcmF0b3JzICovIGNsYXp6LmRlY29yYXRvcnMsXG4gICAgICAgICAgLyogbW9kaWZpZXJzICovIGNsYXp6Lm1vZGlmaWVycyxcbiAgICAgICAgICAvKiBuYW1lICovIGNsYXp6Lm5hbWUsXG4gICAgICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gY2xhenoudHlwZVBhcmFtZXRlcnMsXG4gICAgICAgICAgLyogaGVyaXRhZ2VDbGF1c2VzICovIGNsYXp6Lmhlcml0YWdlQ2xhdXNlcyxcbiAgICAgICAgICAvKiBtZW1iZXJzICovIGVsZW1lbnRzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Q2xheno7XG4gIH1cblxuICBwcml2YXRlIHRyYW5zZm9ybUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICBkZWNsYXJhdGlvbjogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiwgdHJhbnNmb3JtczogRHRzVHJhbnNmb3JtW10sXG4gICAgICBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiB7XG4gICAgbGV0IG5ld0RlY2wgPSBkZWNsYXJhdGlvbjtcblxuICAgIGZvciAoY29uc3QgdHJhbnNmb3JtIG9mIHRyYW5zZm9ybXMpIHtcbiAgICAgIGlmICh0cmFuc2Zvcm0udHJhbnNmb3JtRnVuY3Rpb25EZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG5ld0RlY2wgPSB0cmFuc2Zvcm0udHJhbnNmb3JtRnVuY3Rpb25EZWNsYXJhdGlvbihuZXdEZWNsLCBpbXBvcnRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3RGVjbDtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEl2eURlY2xhcmF0aW9uRmllbGQge1xuICBuYW1lOiBzdHJpbmc7XG4gIHR5cGU6IFR5cGU7XG59XG5cbmV4cG9ydCBjbGFzcyBJdnlEZWNsYXJhdGlvbkR0c1RyYW5zZm9ybSBpbXBsZW1lbnRzIER0c1RyYW5zZm9ybSB7XG4gIHByaXZhdGUgZGVjbGFyYXRpb25GaWVsZHMgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIEl2eURlY2xhcmF0aW9uRmllbGRbXT4oKTtcblxuICBhZGRGaWVsZHMoZGVjbDogQ2xhc3NEZWNsYXJhdGlvbiwgZmllbGRzOiBJdnlEZWNsYXJhdGlvbkZpZWxkW10pOiB2b2lkIHtcbiAgICB0aGlzLmRlY2xhcmF0aW9uRmllbGRzLnNldChkZWNsLCBmaWVsZHMpO1xuICB9XG5cbiAgdHJhbnNmb3JtQ2xhc3MoXG4gICAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgbWVtYmVyczogUmVhZG9ubHlBcnJheTx0cy5DbGFzc0VsZW1lbnQ+LFxuICAgICAgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHRzLkNsYXNzRGVjbGFyYXRpb24ge1xuICAgIGNvbnN0IG9yaWdpbmFsID0gdHMuZ2V0T3JpZ2luYWxOb2RlKGNsYXp6KSBhcyBDbGFzc0RlY2xhcmF0aW9uO1xuXG4gICAgaWYgKCF0aGlzLmRlY2xhcmF0aW9uRmllbGRzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBjbGF6ejtcbiAgICB9XG4gICAgY29uc3QgZmllbGRzID0gdGhpcy5kZWNsYXJhdGlvbkZpZWxkcy5nZXQob3JpZ2luYWwpITtcblxuICAgIGNvbnN0IG5ld01lbWJlcnMgPSBmaWVsZHMubWFwKGRlY2wgPT4ge1xuICAgICAgY29uc3QgbW9kaWZpZXJzID0gW3RzLmNyZWF0ZU1vZGlmaWVyKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCldO1xuICAgICAgY29uc3QgdHlwZVJlZiA9IHRyYW5zbGF0ZVR5cGUoZGVjbC50eXBlLCBpbXBvcnRzKTtcbiAgICAgIG1hcmtGb3JFbWl0QXNTaW5nbGVMaW5lKHR5cGVSZWYpO1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5KFxuICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyBtb2RpZmllcnMsXG4gICAgICAgICAgLyogbmFtZSAqLyBkZWNsLm5hbWUsXG4gICAgICAgICAgLyogcXVlc3Rpb25PckV4Y2xhbWF0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIHR5cGUgKi8gdHlwZVJlZixcbiAgICAgICAgICAvKiBpbml0aWFsaXplciAqLyB1bmRlZmluZWQpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgIC8qIG5vZGUgKi8gY2xhenosXG4gICAgICAgIC8qIGRlY29yYXRvcnMgKi8gY2xhenouZGVjb3JhdG9ycyxcbiAgICAgICAgLyogbW9kaWZpZXJzICovIGNsYXp6Lm1vZGlmaWVycyxcbiAgICAgICAgLyogbmFtZSAqLyBjbGF6ei5uYW1lLFxuICAgICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyBjbGF6ei50eXBlUGFyYW1ldGVycyxcbiAgICAgICAgLyogaGVyaXRhZ2VDbGF1c2VzICovIGNsYXp6Lmhlcml0YWdlQ2xhdXNlcyxcbiAgICAgICAgLyogbWVtYmVycyAqL1suLi5tZW1iZXJzLCAuLi5uZXdNZW1iZXJzXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFya0ZvckVtaXRBc1NpbmdsZUxpbmUobm9kZTogdHMuTm9kZSkge1xuICB0cy5zZXRFbWl0RmxhZ3Mobm9kZSwgdHMuRW1pdEZsYWdzLlNpbmdsZUxpbmUpO1xuICB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgbWFya0ZvckVtaXRBc1NpbmdsZUxpbmUpO1xufVxuXG5leHBvcnQgY2xhc3MgUmV0dXJuVHlwZVRyYW5zZm9ybSBpbXBsZW1lbnRzIER0c1RyYW5zZm9ybSB7XG4gIHByaXZhdGUgdHlwZVJlcGxhY2VtZW50cyA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIFR5cGU+KCk7XG5cbiAgYWRkVHlwZVJlcGxhY2VtZW50KGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbiwgdHlwZTogVHlwZSk6IHZvaWQge1xuICAgIHRoaXMudHlwZVJlcGxhY2VtZW50cy5zZXQoZGVjbGFyYXRpb24sIHR5cGUpO1xuICB9XG5cbiAgdHJhbnNmb3JtQ2xhc3NFbGVtZW50KGVsZW1lbnQ6IHRzLkNsYXNzRWxlbWVudCwgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHRzLkNsYXNzRWxlbWVudCB7XG4gICAgaWYgKHRzLmlzTWV0aG9kRGVjbGFyYXRpb24oZWxlbWVudCkpIHtcbiAgICAgIGNvbnN0IG9yaWdpbmFsID0gdHMuZ2V0T3JpZ2luYWxOb2RlKGVsZW1lbnQsIHRzLmlzTWV0aG9kRGVjbGFyYXRpb24pO1xuICAgICAgaWYgKCF0aGlzLnR5cGVSZXBsYWNlbWVudHMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJldHVyblR5cGUgPSB0aGlzLnR5cGVSZXBsYWNlbWVudHMuZ2V0KG9yaWdpbmFsKSE7XG4gICAgICBjb25zdCB0c1JldHVyblR5cGUgPSB0cmFuc2xhdGVUeXBlKHJldHVyblR5cGUsIGltcG9ydHMpO1xuXG4gICAgICByZXR1cm4gdHMudXBkYXRlTWV0aG9kKFxuICAgICAgICAgIGVsZW1lbnQsIGVsZW1lbnQuZGVjb3JhdG9ycywgZWxlbWVudC5tb2RpZmllcnMsIGVsZW1lbnQuYXN0ZXJpc2tUb2tlbiwgZWxlbWVudC5uYW1lLFxuICAgICAgICAgIGVsZW1lbnQucXVlc3Rpb25Ub2tlbiwgZWxlbWVudC50eXBlUGFyYW1ldGVycywgZWxlbWVudC5wYXJhbWV0ZXJzLCB0c1JldHVyblR5cGUsXG4gICAgICAgICAgZWxlbWVudC5ib2R5KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuXG4gIHRyYW5zZm9ybUZ1bmN0aW9uRGVjbGFyYXRpb24oZWxlbWVudDogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiwgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6XG4gICAgICB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uIHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShlbGVtZW50KSBhcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAgIGlmICghdGhpcy50eXBlUmVwbGFjZW1lbnRzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH1cbiAgICBjb25zdCByZXR1cm5UeXBlID0gdGhpcy50eXBlUmVwbGFjZW1lbnRzLmdldChvcmlnaW5hbCkhO1xuICAgIGNvbnN0IHRzUmV0dXJuVHlwZSA9IHRyYW5zbGF0ZVR5cGUocmV0dXJuVHlwZSwgaW1wb3J0cyk7XG5cbiAgICByZXR1cm4gdHMudXBkYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgICAgLyogbm9kZSAqLyBlbGVtZW50LFxuICAgICAgICAvKiBkZWNvcmF0b3JzICovIGVsZW1lbnQuZGVjb3JhdG9ycyxcbiAgICAgICAgLyogbW9kaWZpZXJzICovIGVsZW1lbnQubW9kaWZpZXJzLFxuICAgICAgICAvKiBhc3Rlcmlza1Rva2VuICovIGVsZW1lbnQuYXN0ZXJpc2tUb2tlbixcbiAgICAgICAgLyogbmFtZSAqLyBlbGVtZW50Lm5hbWUsXG4gICAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIGVsZW1lbnQudHlwZVBhcmFtZXRlcnMsXG4gICAgICAgIC8qIHBhcmFtZXRlcnMgKi8gZWxlbWVudC5wYXJhbWV0ZXJzLFxuICAgICAgICAvKiB0eXBlICovIHRzUmV0dXJuVHlwZSxcbiAgICAgICAgLyogYm9keSAqLyBlbGVtZW50LmJvZHkpO1xuICB9XG59XG4iXX0=