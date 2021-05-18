/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { Reference } from '../../imports';
import { canEmitType, TypeEmitter } from './type_emitter';
/**
 * See `TypeEmitter` for more information on the emitting process.
 */
export class TypeParameterEmitter {
    constructor(typeParameters, reflector) {
        this.typeParameters = typeParameters;
        this.reflector = reflector;
    }
    /**
     * Determines whether the type parameters can be emitted. If this returns true, then a call to
     * `emit` is known to succeed. Vice versa, if false is returned then `emit` should not be
     * called, as it would fail.
     */
    canEmit() {
        if (this.typeParameters === undefined) {
            return true;
        }
        return this.typeParameters.every(typeParam => {
            if (typeParam.constraint === undefined) {
                return true;
            }
            return canEmitType(typeParam.constraint, type => this.resolveTypeReference(type));
        });
    }
    /**
     * Emits the type parameters using the provided emitter function for `Reference`s.
     */
    emit(emitReference) {
        if (this.typeParameters === undefined) {
            return undefined;
        }
        const emitter = new TypeEmitter(type => this.resolveTypeReference(type), emitReference);
        return this.typeParameters.map(typeParam => {
            const constraint = typeParam.constraint !== undefined ? emitter.emitType(typeParam.constraint) : undefined;
            return ts.updateTypeParameterDeclaration(
            /* node */ typeParam, 
            /* name */ typeParam.name, 
            /* constraint */ constraint, 
            /* defaultType */ typeParam.default);
        });
    }
    resolveTypeReference(type) {
        const target = ts.isIdentifier(type.typeName) ? type.typeName : type.typeName.right;
        const declaration = this.reflector.getDeclarationOfIdentifier(target);
        // If no declaration could be resolved or does not have a `ts.Declaration`, the type cannot be
        // resolved.
        if (declaration === null || declaration.node === null) {
            return null;
        }
        // If the declaration corresponds with a local type parameter, the type reference can be used
        // as is.
        if (this.isLocalTypeParameter(declaration.node)) {
            return type;
        }
        let owningModule = null;
        if (declaration.viaModule !== null) {
            owningModule = {
                specifier: declaration.viaModule,
                resolutionContext: type.getSourceFile().fileName,
            };
        }
        return new Reference(declaration.node, owningModule);
    }
    isLocalTypeParameter(decl) {
        // Checking for local type parameters only occurs during resolution of type parameters, so it is
        // guaranteed that type parameters are present.
        return this.typeParameters.some(param => param === decl);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9wYXJhbWV0ZXJfZW1pdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX3BhcmFtZXRlcl9lbWl0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUNILE9BQU8sS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRWpDLE9BQU8sRUFBZSxTQUFTLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFHdEQsT0FBTyxFQUFDLFdBQVcsRUFBeUIsV0FBVyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHL0U7O0dBRUc7QUFDSCxNQUFNLE9BQU8sb0JBQW9CO0lBQy9CLFlBQ1ksY0FBbUUsRUFDbkUsU0FBeUI7UUFEekIsbUJBQWMsR0FBZCxjQUFjLENBQXFEO1FBQ25FLGNBQVMsR0FBVCxTQUFTLENBQWdCO0lBQUcsQ0FBQztJQUV6Qzs7OztPQUlHO0lBQ0gsT0FBTztRQUNMLElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQUU7WUFDckMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDM0MsSUFBSSxTQUFTLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFBRTtnQkFDdEMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNwRixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksQ0FBQyxhQUE4QztRQUNqRCxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFO1lBQ3JDLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFeEYsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUN6QyxNQUFNLFVBQVUsR0FDWixTQUFTLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUU1RixPQUFPLEVBQUUsQ0FBQyw4QkFBOEI7WUFDcEMsVUFBVSxDQUFDLFNBQVM7WUFDcEIsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJO1lBQ3pCLGdCQUFnQixDQUFDLFVBQVU7WUFDM0IsaUJBQWlCLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLG9CQUFvQixDQUFDLElBQTBCO1FBQ3JELE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztRQUNwRixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXRFLDhGQUE4RjtRQUM5RixZQUFZO1FBQ1osSUFBSSxXQUFXLEtBQUssSUFBSSxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO1lBQ3JELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCw2RkFBNkY7UUFDN0YsU0FBUztRQUNULElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMvQyxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsSUFBSSxZQUFZLEdBQXNCLElBQUksQ0FBQztRQUMzQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEtBQUssSUFBSSxFQUFFO1lBQ2xDLFlBQVksR0FBRztnQkFDYixTQUFTLEVBQUUsV0FBVyxDQUFDLFNBQVM7Z0JBQ2hDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRO2FBQ2pELENBQUM7U0FDSDtRQUVELE9BQU8sSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRU8sb0JBQW9CLENBQUMsSUFBcUI7UUFDaEQsZ0dBQWdHO1FBQ2hHLCtDQUErQztRQUMvQyxPQUFPLElBQUksQ0FBQyxjQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDO0lBQzVELENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7T3duaW5nTW9kdWxlLCBSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEZWNsYXJhdGlvbk5vZGUsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHtjYW5FbWl0VHlwZSwgUmVzb2x2ZWRUeXBlUmVmZXJlbmNlLCBUeXBlRW1pdHRlcn0gZnJvbSAnLi90eXBlX2VtaXR0ZXInO1xuXG5cbi8qKlxuICogU2VlIGBUeXBlRW1pdHRlcmAgZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gdGhlIGVtaXR0aW5nIHByb2Nlc3MuXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlUGFyYW1ldGVyRW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0eXBlUGFyYW1ldGVyczogdHMuTm9kZUFycmF5PHRzLlR5cGVQYXJhbWV0ZXJEZWNsYXJhdGlvbj58dW5kZWZpbmVkLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHR5cGUgcGFyYW1ldGVycyBjYW4gYmUgZW1pdHRlZC4gSWYgdGhpcyByZXR1cm5zIHRydWUsIHRoZW4gYSBjYWxsIHRvXG4gICAqIGBlbWl0YCBpcyBrbm93biB0byBzdWNjZWVkLiBWaWNlIHZlcnNhLCBpZiBmYWxzZSBpcyByZXR1cm5lZCB0aGVuIGBlbWl0YCBzaG91bGQgbm90IGJlXG4gICAqIGNhbGxlZCwgYXMgaXQgd291bGQgZmFpbC5cbiAgICovXG4gIGNhbkVtaXQoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMudHlwZVBhcmFtZXRlcnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudHlwZVBhcmFtZXRlcnMuZXZlcnkodHlwZVBhcmFtID0+IHtcbiAgICAgIGlmICh0eXBlUGFyYW0uY29uc3RyYWludCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gY2FuRW1pdFR5cGUodHlwZVBhcmFtLmNvbnN0cmFpbnQsIHR5cGUgPT4gdGhpcy5yZXNvbHZlVHlwZVJlZmVyZW5jZSh0eXBlKSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRW1pdHMgdGhlIHR5cGUgcGFyYW1ldGVycyB1c2luZyB0aGUgcHJvdmlkZWQgZW1pdHRlciBmdW5jdGlvbiBmb3IgYFJlZmVyZW5jZWBzLlxuICAgKi9cbiAgZW1pdChlbWl0UmVmZXJlbmNlOiAocmVmOiBSZWZlcmVuY2UpID0+IHRzLlR5cGVOb2RlKTogdHMuVHlwZVBhcmFtZXRlckRlY2xhcmF0aW9uW118dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy50eXBlUGFyYW1ldGVycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGVtaXR0ZXIgPSBuZXcgVHlwZUVtaXR0ZXIodHlwZSA9PiB0aGlzLnJlc29sdmVUeXBlUmVmZXJlbmNlKHR5cGUpLCBlbWl0UmVmZXJlbmNlKTtcblxuICAgIHJldHVybiB0aGlzLnR5cGVQYXJhbWV0ZXJzLm1hcCh0eXBlUGFyYW0gPT4ge1xuICAgICAgY29uc3QgY29uc3RyYWludCA9XG4gICAgICAgICAgdHlwZVBhcmFtLmNvbnN0cmFpbnQgIT09IHVuZGVmaW5lZCA/IGVtaXR0ZXIuZW1pdFR5cGUodHlwZVBhcmFtLmNvbnN0cmFpbnQpIDogdW5kZWZpbmVkO1xuXG4gICAgICByZXR1cm4gdHMudXBkYXRlVHlwZVBhcmFtZXRlckRlY2xhcmF0aW9uKFxuICAgICAgICAgIC8qIG5vZGUgKi8gdHlwZVBhcmFtLFxuICAgICAgICAgIC8qIG5hbWUgKi8gdHlwZVBhcmFtLm5hbWUsXG4gICAgICAgICAgLyogY29uc3RyYWludCAqLyBjb25zdHJhaW50LFxuICAgICAgICAgIC8qIGRlZmF1bHRUeXBlICovIHR5cGVQYXJhbS5kZWZhdWx0KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZVR5cGVSZWZlcmVuY2UodHlwZTogdHMuVHlwZVJlZmVyZW5jZU5vZGUpOiBSZXNvbHZlZFR5cGVSZWZlcmVuY2Uge1xuICAgIGNvbnN0IHRhcmdldCA9IHRzLmlzSWRlbnRpZmllcih0eXBlLnR5cGVOYW1lKSA/IHR5cGUudHlwZU5hbWUgOiB0eXBlLnR5cGVOYW1lLnJpZ2h0O1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gdGhpcy5yZWZsZWN0b3IuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIodGFyZ2V0KTtcblxuICAgIC8vIElmIG5vIGRlY2xhcmF0aW9uIGNvdWxkIGJlIHJlc29sdmVkIG9yIGRvZXMgbm90IGhhdmUgYSBgdHMuRGVjbGFyYXRpb25gLCB0aGUgdHlwZSBjYW5ub3QgYmVcbiAgICAvLyByZXNvbHZlZC5cbiAgICBpZiAoZGVjbGFyYXRpb24gPT09IG51bGwgfHwgZGVjbGFyYXRpb24ubm9kZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIGRlY2xhcmF0aW9uIGNvcnJlc3BvbmRzIHdpdGggYSBsb2NhbCB0eXBlIHBhcmFtZXRlciwgdGhlIHR5cGUgcmVmZXJlbmNlIGNhbiBiZSB1c2VkXG4gICAgLy8gYXMgaXMuXG4gICAgaWYgKHRoaXMuaXNMb2NhbFR5cGVQYXJhbWV0ZXIoZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgIHJldHVybiB0eXBlO1xuICAgIH1cblxuICAgIGxldCBvd25pbmdNb2R1bGU6IE93bmluZ01vZHVsZXxudWxsID0gbnVsbDtcbiAgICBpZiAoZGVjbGFyYXRpb24udmlhTW9kdWxlICE9PSBudWxsKSB7XG4gICAgICBvd25pbmdNb2R1bGUgPSB7XG4gICAgICAgIHNwZWNpZmllcjogZGVjbGFyYXRpb24udmlhTW9kdWxlLFxuICAgICAgICByZXNvbHV0aW9uQ29udGV4dDogdHlwZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUsXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVmZXJlbmNlKGRlY2xhcmF0aW9uLm5vZGUsIG93bmluZ01vZHVsZSk7XG4gIH1cblxuICBwcml2YXRlIGlzTG9jYWxUeXBlUGFyYW1ldGVyKGRlY2w6IERlY2xhcmF0aW9uTm9kZSk6IGJvb2xlYW4ge1xuICAgIC8vIENoZWNraW5nIGZvciBsb2NhbCB0eXBlIHBhcmFtZXRlcnMgb25seSBvY2N1cnMgZHVyaW5nIHJlc29sdXRpb24gb2YgdHlwZSBwYXJhbWV0ZXJzLCBzbyBpdCBpc1xuICAgIC8vIGd1YXJhbnRlZWQgdGhhdCB0eXBlIHBhcmFtZXRlcnMgYXJlIHByZXNlbnQuXG4gICAgcmV0dXJuIHRoaXMudHlwZVBhcmFtZXRlcnMhLnNvbWUocGFyYW0gPT4gcGFyYW0gPT09IGRlY2wpO1xuICB9XG59XG4iXX0=