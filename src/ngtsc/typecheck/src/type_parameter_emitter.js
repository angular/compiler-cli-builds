(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_parameter_emitter", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_emitter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeParameterEmitter = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var type_emitter_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_emitter");
    /**
     * See `TypeEmitter` for more information on the emitting process.
     */
    var TypeParameterEmitter = /** @class */ (function () {
        function TypeParameterEmitter(typeParameters, reflector) {
            this.typeParameters = typeParameters;
            this.reflector = reflector;
        }
        /**
         * Determines whether the type parameters can be emitted. If this returns true, then a call to
         * `emit` is known to succeed. Vice versa, if false is returned then `emit` should not be
         * called, as it would fail.
         */
        TypeParameterEmitter.prototype.canEmit = function () {
            var _this = this;
            if (this.typeParameters === undefined) {
                return true;
            }
            return this.typeParameters.every(function (typeParam) {
                return _this.canEmitType(typeParam.constraint) && _this.canEmitType(typeParam.default);
            });
        };
        TypeParameterEmitter.prototype.canEmitType = function (type) {
            var _this = this;
            if (type === undefined) {
                return true;
            }
            return (0, type_emitter_1.canEmitType)(type, function (typeReference) { return _this.resolveTypeReference(typeReference); });
        };
        /**
         * Emits the type parameters using the provided emitter function for `Reference`s.
         */
        TypeParameterEmitter.prototype.emit = function (emitReference) {
            var _this = this;
            if (this.typeParameters === undefined) {
                return undefined;
            }
            var emitter = new type_emitter_1.TypeEmitter(function (type) { return _this.resolveTypeReference(type); }, emitReference);
            return this.typeParameters.map(function (typeParam) {
                var constraint = typeParam.constraint !== undefined ? emitter.emitType(typeParam.constraint) : undefined;
                var defaultType = typeParam.default !== undefined ? emitter.emitType(typeParam.default) : undefined;
                return ts.updateTypeParameterDeclaration(
                /* node */ typeParam, 
                /* name */ typeParam.name, 
                /* constraint */ constraint, 
                /* defaultType */ defaultType);
            });
        };
        TypeParameterEmitter.prototype.resolveTypeReference = function (type) {
            var target = ts.isIdentifier(type.typeName) ? type.typeName : type.typeName.right;
            var declaration = this.reflector.getDeclarationOfIdentifier(target);
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
            var owningModule = null;
            if (declaration.viaModule !== null) {
                owningModule = {
                    specifier: declaration.viaModule,
                    resolutionContext: type.getSourceFile().fileName,
                };
            }
            // The declaration needs to be exported as a top-level export to be able to emit an import
            // statement for it. If the declaration is not exported, null is returned to prevent emit.
            if (!this.isTopLevelExport(declaration.node)) {
                return null;
            }
            return new imports_1.Reference(declaration.node, owningModule);
        };
        TypeParameterEmitter.prototype.isTopLevelExport = function (decl) {
            if (decl.parent === undefined || !ts.isSourceFile(decl.parent)) {
                // The declaration has to exist at the top-level, as the reference emitters are not capable of
                // generating imports to classes declared in a namespace.
                return false;
            }
            return this.reflector.isStaticallyExported(decl);
        };
        TypeParameterEmitter.prototype.isLocalTypeParameter = function (decl) {
            // Checking for local type parameters only occurs during resolution of type parameters, so it is
            // guaranteed that type parameters are present.
            return this.typeParameters.some(function (param) { return param === decl; });
        };
        return TypeParameterEmitter;
    }());
    exports.TypeParameterEmitter = TypeParameterEmitter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9wYXJhbWV0ZXJfZW1pdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX3BhcmFtZXRlcl9lbWl0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUVqQyxtRUFBc0Q7SUFHdEQsMkZBQStFO0lBRy9FOztPQUVHO0lBQ0g7UUFDRSw4QkFDWSxjQUFtRSxFQUNuRSxTQUF5QjtZQUR6QixtQkFBYyxHQUFkLGNBQWMsQ0FBcUQ7WUFDbkUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7UUFBRyxDQUFDO1FBRXpDOzs7O1dBSUc7UUFDSCxzQ0FBTyxHQUFQO1lBQUEsaUJBUUM7WUFQQyxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFO2dCQUNyQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxVQUFBLFNBQVM7Z0JBQ3hDLE9BQU8sS0FBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdkYsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRU8sMENBQVcsR0FBbkIsVUFBb0IsSUFBMkI7WUFBL0MsaUJBTUM7WUFMQyxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQ3RCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxPQUFPLElBQUEsMEJBQVcsRUFBQyxJQUFJLEVBQUUsVUFBQSxhQUFhLElBQUksT0FBQSxLQUFJLENBQUMsb0JBQW9CLENBQUMsYUFBYSxDQUFDLEVBQXhDLENBQXdDLENBQUMsQ0FBQztRQUN0RixDQUFDO1FBRUQ7O1dBRUc7UUFDSCxtQ0FBSSxHQUFKLFVBQUssYUFBOEM7WUFBbkQsaUJBbUJDO1lBbEJDLElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQUU7Z0JBQ3JDLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUQsSUFBTSxPQUFPLEdBQUcsSUFBSSwwQkFBVyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUEvQixDQUErQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBRXhGLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBQSxTQUFTO2dCQUN0QyxJQUFNLFVBQVUsR0FDWixTQUFTLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztnQkFDNUYsSUFBTSxXQUFXLEdBQ2IsU0FBUyxDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7Z0JBRXRGLE9BQU8sRUFBRSxDQUFDLDhCQUE4QjtnQkFDcEMsVUFBVSxDQUFDLFNBQVM7Z0JBQ3BCLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSTtnQkFDekIsZ0JBQWdCLENBQUMsVUFBVTtnQkFDM0IsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDckMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRU8sbURBQW9CLEdBQTVCLFVBQTZCLElBQTBCO1lBQ3JELElBQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztZQUNwRixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRXRFLDhGQUE4RjtZQUM5RixZQUFZO1lBQ1osSUFBSSxXQUFXLEtBQUssSUFBSSxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO2dCQUNyRCxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsNkZBQTZGO1lBQzdGLFNBQVM7WUFDVCxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQy9DLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxJQUFJLFlBQVksR0FBc0IsSUFBSSxDQUFDO1lBQzNDLElBQUksV0FBVyxDQUFDLFNBQVMsS0FBSyxJQUFJLEVBQUU7Z0JBQ2xDLFlBQVksR0FBRztvQkFDYixTQUFTLEVBQUUsV0FBVyxDQUFDLFNBQVM7b0JBQ2hDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRO2lCQUNqRCxDQUFDO2FBQ0g7WUFFRCwwRkFBMEY7WUFDMUYsMEZBQTBGO1lBQzFGLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM1QyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsT0FBTyxJQUFJLG1CQUFTLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRU8sK0NBQWdCLEdBQXhCLFVBQXlCLElBQXFCO1lBQzVDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDOUQsOEZBQThGO2dCQUM5Rix5REFBeUQ7Z0JBQ3pELE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFFRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUVPLG1EQUFvQixHQUE1QixVQUE2QixJQUFxQjtZQUNoRCxnR0FBZ0c7WUFDaEcsK0NBQStDO1lBQy9DLE9BQU8sSUFBSSxDQUFDLGNBQWUsQ0FBQyxJQUFJLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLEtBQUssSUFBSSxFQUFkLENBQWMsQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUFwR0QsSUFvR0M7SUFwR1ksb0RBQW9CIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtPd25pbmdNb2R1bGUsIFJlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0RlY2xhcmF0aW9uTm9kZSwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5pbXBvcnQge2NhbkVtaXRUeXBlLCBSZXNvbHZlZFR5cGVSZWZlcmVuY2UsIFR5cGVFbWl0dGVyfSBmcm9tICcuL3R5cGVfZW1pdHRlcic7XG5cblxuLyoqXG4gKiBTZWUgYFR5cGVFbWl0dGVyYCBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiB0aGUgZW1pdHRpbmcgcHJvY2Vzcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFR5cGVQYXJhbWV0ZXJFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHR5cGVQYXJhbWV0ZXJzOiB0cy5Ob2RlQXJyYXk8dHMuVHlwZVBhcmFtZXRlckRlY2xhcmF0aW9uPnx1bmRlZmluZWQsXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpIHt9XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hldGhlciB0aGUgdHlwZSBwYXJhbWV0ZXJzIGNhbiBiZSBlbWl0dGVkLiBJZiB0aGlzIHJldHVybnMgdHJ1ZSwgdGhlbiBhIGNhbGwgdG9cbiAgICogYGVtaXRgIGlzIGtub3duIHRvIHN1Y2NlZWQuIFZpY2UgdmVyc2EsIGlmIGZhbHNlIGlzIHJldHVybmVkIHRoZW4gYGVtaXRgIHNob3VsZCBub3QgYmVcbiAgICogY2FsbGVkLCBhcyBpdCB3b3VsZCBmYWlsLlxuICAgKi9cbiAgY2FuRW1pdCgpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy50eXBlUGFyYW1ldGVycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy50eXBlUGFyYW1ldGVycy5ldmVyeSh0eXBlUGFyYW0gPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuY2FuRW1pdFR5cGUodHlwZVBhcmFtLmNvbnN0cmFpbnQpICYmIHRoaXMuY2FuRW1pdFR5cGUodHlwZVBhcmFtLmRlZmF1bHQpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5FbWl0VHlwZSh0eXBlOiB0cy5UeXBlTm9kZXx1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgICBpZiAodHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2FuRW1pdFR5cGUodHlwZSwgdHlwZVJlZmVyZW5jZSA9PiB0aGlzLnJlc29sdmVUeXBlUmVmZXJlbmNlKHR5cGVSZWZlcmVuY2UpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbWl0cyB0aGUgdHlwZSBwYXJhbWV0ZXJzIHVzaW5nIHRoZSBwcm92aWRlZCBlbWl0dGVyIGZ1bmN0aW9uIGZvciBgUmVmZXJlbmNlYHMuXG4gICAqL1xuICBlbWl0KGVtaXRSZWZlcmVuY2U6IChyZWY6IFJlZmVyZW5jZSkgPT4gdHMuVHlwZU5vZGUpOiB0cy5UeXBlUGFyYW1ldGVyRGVjbGFyYXRpb25bXXx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLnR5cGVQYXJhbWV0ZXJzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgZW1pdHRlciA9IG5ldyBUeXBlRW1pdHRlcih0eXBlID0+IHRoaXMucmVzb2x2ZVR5cGVSZWZlcmVuY2UodHlwZSksIGVtaXRSZWZlcmVuY2UpO1xuXG4gICAgcmV0dXJuIHRoaXMudHlwZVBhcmFtZXRlcnMubWFwKHR5cGVQYXJhbSA9PiB7XG4gICAgICBjb25zdCBjb25zdHJhaW50ID1cbiAgICAgICAgICB0eXBlUGFyYW0uY29uc3RyYWludCAhPT0gdW5kZWZpbmVkID8gZW1pdHRlci5lbWl0VHlwZSh0eXBlUGFyYW0uY29uc3RyYWludCkgOiB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBkZWZhdWx0VHlwZSA9XG4gICAgICAgICAgdHlwZVBhcmFtLmRlZmF1bHQgIT09IHVuZGVmaW5lZCA/IGVtaXR0ZXIuZW1pdFR5cGUodHlwZVBhcmFtLmRlZmF1bHQpIDogdW5kZWZpbmVkO1xuXG4gICAgICByZXR1cm4gdHMudXBkYXRlVHlwZVBhcmFtZXRlckRlY2xhcmF0aW9uKFxuICAgICAgICAgIC8qIG5vZGUgKi8gdHlwZVBhcmFtLFxuICAgICAgICAgIC8qIG5hbWUgKi8gdHlwZVBhcmFtLm5hbWUsXG4gICAgICAgICAgLyogY29uc3RyYWludCAqLyBjb25zdHJhaW50LFxuICAgICAgICAgIC8qIGRlZmF1bHRUeXBlICovIGRlZmF1bHRUeXBlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZVR5cGVSZWZlcmVuY2UodHlwZTogdHMuVHlwZVJlZmVyZW5jZU5vZGUpOiBSZXNvbHZlZFR5cGVSZWZlcmVuY2Uge1xuICAgIGNvbnN0IHRhcmdldCA9IHRzLmlzSWRlbnRpZmllcih0eXBlLnR5cGVOYW1lKSA/IHR5cGUudHlwZU5hbWUgOiB0eXBlLnR5cGVOYW1lLnJpZ2h0O1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gdGhpcy5yZWZsZWN0b3IuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIodGFyZ2V0KTtcblxuICAgIC8vIElmIG5vIGRlY2xhcmF0aW9uIGNvdWxkIGJlIHJlc29sdmVkIG9yIGRvZXMgbm90IGhhdmUgYSBgdHMuRGVjbGFyYXRpb25gLCB0aGUgdHlwZSBjYW5ub3QgYmVcbiAgICAvLyByZXNvbHZlZC5cbiAgICBpZiAoZGVjbGFyYXRpb24gPT09IG51bGwgfHwgZGVjbGFyYXRpb24ubm9kZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIGRlY2xhcmF0aW9uIGNvcnJlc3BvbmRzIHdpdGggYSBsb2NhbCB0eXBlIHBhcmFtZXRlciwgdGhlIHR5cGUgcmVmZXJlbmNlIGNhbiBiZSB1c2VkXG4gICAgLy8gYXMgaXMuXG4gICAgaWYgKHRoaXMuaXNMb2NhbFR5cGVQYXJhbWV0ZXIoZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgIHJldHVybiB0eXBlO1xuICAgIH1cblxuICAgIGxldCBvd25pbmdNb2R1bGU6IE93bmluZ01vZHVsZXxudWxsID0gbnVsbDtcbiAgICBpZiAoZGVjbGFyYXRpb24udmlhTW9kdWxlICE9PSBudWxsKSB7XG4gICAgICBvd25pbmdNb2R1bGUgPSB7XG4gICAgICAgIHNwZWNpZmllcjogZGVjbGFyYXRpb24udmlhTW9kdWxlLFxuICAgICAgICByZXNvbHV0aW9uQ29udGV4dDogdHlwZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBuZWVkcyB0byBiZSBleHBvcnRlZCBhcyBhIHRvcC1sZXZlbCBleHBvcnQgdG8gYmUgYWJsZSB0byBlbWl0IGFuIGltcG9ydFxuICAgIC8vIHN0YXRlbWVudCBmb3IgaXQuIElmIHRoZSBkZWNsYXJhdGlvbiBpcyBub3QgZXhwb3J0ZWQsIG51bGwgaXMgcmV0dXJuZWQgdG8gcHJldmVudCBlbWl0LlxuICAgIGlmICghdGhpcy5pc1RvcExldmVsRXhwb3J0KGRlY2xhcmF0aW9uLm5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlZmVyZW5jZShkZWNsYXJhdGlvbi5ub2RlLCBvd25pbmdNb2R1bGUpO1xuICB9XG5cbiAgcHJpdmF0ZSBpc1RvcExldmVsRXhwb3J0KGRlY2w6IERlY2xhcmF0aW9uTm9kZSk6IGJvb2xlYW4ge1xuICAgIGlmIChkZWNsLnBhcmVudCA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc1NvdXJjZUZpbGUoZGVjbC5wYXJlbnQpKSB7XG4gICAgICAvLyBUaGUgZGVjbGFyYXRpb24gaGFzIHRvIGV4aXN0IGF0IHRoZSB0b3AtbGV2ZWwsIGFzIHRoZSByZWZlcmVuY2UgZW1pdHRlcnMgYXJlIG5vdCBjYXBhYmxlIG9mXG4gICAgICAvLyBnZW5lcmF0aW5nIGltcG9ydHMgdG8gY2xhc3NlcyBkZWNsYXJlZCBpbiBhIG5hbWVzcGFjZS5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yZWZsZWN0b3IuaXNTdGF0aWNhbGx5RXhwb3J0ZWQoZGVjbCk7XG4gIH1cblxuICBwcml2YXRlIGlzTG9jYWxUeXBlUGFyYW1ldGVyKGRlY2w6IERlY2xhcmF0aW9uTm9kZSk6IGJvb2xlYW4ge1xuICAgIC8vIENoZWNraW5nIGZvciBsb2NhbCB0eXBlIHBhcmFtZXRlcnMgb25seSBvY2N1cnMgZHVyaW5nIHJlc29sdXRpb24gb2YgdHlwZSBwYXJhbWV0ZXJzLCBzbyBpdCBpc1xuICAgIC8vIGd1YXJhbnRlZWQgdGhhdCB0eXBlIHBhcmFtZXRlcnMgYXJlIHByZXNlbnQuXG4gICAgcmV0dXJuIHRoaXMudHlwZVBhcmFtZXRlcnMhLnNvbWUocGFyYW0gPT4gcGFyYW0gPT09IGRlY2wpO1xuICB9XG59XG4iXX0=