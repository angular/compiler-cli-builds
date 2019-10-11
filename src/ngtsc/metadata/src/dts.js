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
        define("@angular/compiler-cli/src/ngtsc/metadata/src/dts", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/metadata/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/util");
    /**
     * A `MetadataReader` that can read metadata from `.d.ts` files, which have static Ivy properties
     * from an upstream compilation already.
     */
    var DtsMetadataReader = /** @class */ (function () {
        function DtsMetadataReader(checker, reflector) {
            this.checker = checker;
            this.reflector = reflector;
        }
        DtsMetadataReader.prototype.isAbstractDirective = function (ref) {
            var meta = this.getDirectiveMetadata(ref);
            return meta !== null && meta.selector === null;
        };
        /**
         * Read the metadata from a class that has already been compiled somehow (either it's in a .d.ts
         * file, or in a .ts file with a handwritten definition).
         *
         * @param ref `Reference` to the class of interest, with the context of how it was obtained.
         */
        DtsMetadataReader.prototype.getNgModuleMetadata = function (ref) {
            var clazz = ref.node;
            var resolutionContext = clazz.getSourceFile().fileName;
            // This operation is explicitly not memoized, as it depends on `ref.ownedByModuleGuess`.
            // TODO(alxhub): investigate caching of .d.ts module metadata.
            var ngModuleDef = this.reflector.getMembersOfClass(clazz).find(function (member) { return member.name === 'ngModuleDef' && member.isStatic; });
            if (ngModuleDef === undefined) {
                return null;
            }
            else if (
            // Validate that the shape of the ngModuleDef type is correct.
            ngModuleDef.type === null || !ts.isTypeReferenceNode(ngModuleDef.type) ||
                ngModuleDef.type.typeArguments === undefined ||
                ngModuleDef.type.typeArguments.length !== 4) {
                return null;
            }
            // Read the ModuleData out of the type arguments.
            var _a = tslib_1.__read(ngModuleDef.type.typeArguments, 4), _ = _a[0], declarationMetadata = _a[1], importMetadata = _a[2], exportMetadata = _a[3];
            return {
                ref: ref,
                declarations: util_1.extractReferencesFromType(this.checker, declarationMetadata, ref.ownedByModuleGuess, resolutionContext),
                exports: util_1.extractReferencesFromType(this.checker, exportMetadata, ref.ownedByModuleGuess, resolutionContext),
                imports: util_1.extractReferencesFromType(this.checker, importMetadata, ref.ownedByModuleGuess, resolutionContext),
                schemas: [],
            };
        };
        /**
         * Read directive (or component) metadata from a referenced class in a .d.ts file.
         */
        DtsMetadataReader.prototype.getDirectiveMetadata = function (ref) {
            var clazz = ref.node;
            var def = this.reflector.getMembersOfClass(clazz).find(function (field) { return field.isStatic && (field.name === 'ɵcmp' || field.name === 'ngDirectiveDef'); });
            if (def === undefined) {
                // No definition could be found.
                return null;
            }
            else if (def.type === null || !ts.isTypeReferenceNode(def.type) ||
                def.type.typeArguments === undefined || def.type.typeArguments.length < 2) {
                // The type metadata was the wrong shape.
                return null;
            }
            var selector = util_1.readStringType(def.type.typeArguments[1]);
            if (selector === null) {
                return null;
            }
            return tslib_1.__assign({ ref: ref, name: clazz.name.text, isComponent: def.name === 'ɵcmp', selector: selector, exportAs: util_1.readStringArrayType(def.type.typeArguments[2]), inputs: util_1.readStringMapType(def.type.typeArguments[3]), outputs: util_1.readStringMapType(def.type.typeArguments[4]), queries: util_1.readStringArrayType(def.type.typeArguments[5]) }, util_1.extractDirectiveGuards(clazz, this.reflector), { baseClass: readBaseClass(clazz, this.checker, this.reflector) });
        };
        /**
         * Read pipe metadata from a referenced class in a .d.ts file.
         */
        DtsMetadataReader.prototype.getPipeMetadata = function (ref) {
            var def = this.reflector.getMembersOfClass(ref.node).find(function (field) { return field.isStatic && field.name === 'ngPipeDef'; });
            if (def === undefined) {
                // No definition could be found.
                return null;
            }
            else if (def.type === null || !ts.isTypeReferenceNode(def.type) ||
                def.type.typeArguments === undefined || def.type.typeArguments.length < 2) {
                // The type metadata was the wrong shape.
                return null;
            }
            var type = def.type.typeArguments[1];
            if (!ts.isLiteralTypeNode(type) || !ts.isStringLiteral(type.literal)) {
                // The type metadata was the wrong type.
                return null;
            }
            var name = type.literal.text;
            return { ref: ref, name: name };
        };
        return DtsMetadataReader;
    }());
    exports.DtsMetadataReader = DtsMetadataReader;
    function readBaseClass(clazz, checker, reflector) {
        var e_1, _a;
        if (!reflection_1.isNamedClassDeclaration(clazz)) {
            // Technically this is an error in a .d.ts file, but for the purposes of finding the base class
            // it's ignored.
            return reflector.hasBaseClass(clazz) ? 'dynamic' : null;
        }
        if (clazz.heritageClauses !== undefined) {
            try {
                for (var _b = tslib_1.__values(clazz.heritageClauses), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var clause = _c.value;
                    if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                        var baseExpr = clause.types[0].expression;
                        var symbol = checker.getSymbolAtLocation(baseExpr);
                        if (symbol === undefined) {
                            return 'dynamic';
                        }
                        else if (symbol.flags & ts.SymbolFlags.Alias) {
                            symbol = checker.getAliasedSymbol(symbol);
                        }
                        if (symbol.valueDeclaration !== undefined &&
                            reflection_1.isNamedClassDeclaration(symbol.valueDeclaration)) {
                            return new imports_1.Reference(symbol.valueDeclaration);
                        }
                        else {
                            return 'dynamic';
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        return null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9tZXRhZGF0YS9zcmMvZHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyxtRUFBd0M7SUFDeEMseUVBQTJGO0lBRzNGLDBFQUFpSTtJQUVqSTs7O09BR0c7SUFDSDtRQUNFLDJCQUFvQixPQUF1QixFQUFVLFNBQXlCO1lBQTFELFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7UUFBRyxDQUFDO1FBRWxGLCtDQUFtQixHQUFuQixVQUFvQixHQUFnQztZQUNsRCxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDNUMsT0FBTyxJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDO1FBQ2pELENBQUM7UUFFRDs7Ozs7V0FLRztRQUNILCtDQUFtQixHQUFuQixVQUFvQixHQUFnQztZQUNsRCxJQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ3ZCLElBQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsQ0FBQztZQUN6RCx3RkFBd0Y7WUFDeEYsOERBQThEO1lBQzlELElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUM1RCxVQUFBLE1BQU0sSUFBSSxPQUFBLE1BQU0sQ0FBQyxJQUFJLEtBQUssYUFBYSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQWhELENBQWdELENBQUMsQ0FBQztZQUNoRSxJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUU7Z0JBQzdCLE9BQU8sSUFBSSxDQUFDO2FB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QUFDLEVBQUU7NEJBQ3BELE9BQU8sSUFBSSxtQkFBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO3lCQUMvQzs2QkFBTTs0QkFDTCxPQUFPLFNBQVMsQ0FBQzt5QkFDbEI7cUJBQ0Y7aUJBQ0Y7Ozs7Ozs7OztTQUNGO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdCwgaXNOYW1lZENsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5pbXBvcnQge0RpcmVjdGl2ZU1ldGEsIE1ldGFkYXRhUmVhZGVyLCBOZ01vZHVsZU1ldGEsIFBpcGVNZXRhfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2V4dHJhY3REaXJlY3RpdmVHdWFyZHMsIGV4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUsIHJlYWRTdHJpbmdBcnJheVR5cGUsIHJlYWRTdHJpbmdNYXBUeXBlLCByZWFkU3RyaW5nVHlwZX0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBBIGBNZXRhZGF0YVJlYWRlcmAgdGhhdCBjYW4gcmVhZCBtZXRhZGF0YSBmcm9tIGAuZC50c2AgZmlsZXMsIHdoaWNoIGhhdmUgc3RhdGljIEl2eSBwcm9wZXJ0aWVzXG4gKiBmcm9tIGFuIHVwc3RyZWFtIGNvbXBpbGF0aW9uIGFscmVhZHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBEdHNNZXRhZGF0YVJlYWRlciBpbXBsZW1lbnRzIE1ldGFkYXRhUmVhZGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIGlzQWJzdHJhY3REaXJlY3RpdmUocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiBib29sZWFuIHtcbiAgICBjb25zdCBtZXRhID0gdGhpcy5nZXREaXJlY3RpdmVNZXRhZGF0YShyZWYpO1xuICAgIHJldHVybiBtZXRhICE9PSBudWxsICYmIG1ldGEuc2VsZWN0b3IgPT09IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmVhZCB0aGUgbWV0YWRhdGEgZnJvbSBhIGNsYXNzIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBjb21waWxlZCBzb21laG93IChlaXRoZXIgaXQncyBpbiBhIC5kLnRzXG4gICAqIGZpbGUsIG9yIGluIGEgLnRzIGZpbGUgd2l0aCBhIGhhbmR3cml0dGVuIGRlZmluaXRpb24pLlxuICAgKlxuICAgKiBAcGFyYW0gcmVmIGBSZWZlcmVuY2VgIHRvIHRoZSBjbGFzcyBvZiBpbnRlcmVzdCwgd2l0aCB0aGUgY29udGV4dCBvZiBob3cgaXQgd2FzIG9idGFpbmVkLlxuICAgKi9cbiAgZ2V0TmdNb2R1bGVNZXRhZGF0YShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IE5nTW9kdWxlTWV0YXxudWxsIHtcbiAgICBjb25zdCBjbGF6eiA9IHJlZi5ub2RlO1xuICAgIGNvbnN0IHJlc29sdXRpb25Db250ZXh0ID0gY2xhenouZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIC8vIFRoaXMgb3BlcmF0aW9uIGlzIGV4cGxpY2l0bHkgbm90IG1lbW9pemVkLCBhcyBpdCBkZXBlbmRzIG9uIGByZWYub3duZWRCeU1vZHVsZUd1ZXNzYC5cbiAgICAvLyBUT0RPKGFseGh1Yik6IGludmVzdGlnYXRlIGNhY2hpbmcgb2YgLmQudHMgbW9kdWxlIG1ldGFkYXRhLlxuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIG1lbWJlciA9PiBtZW1iZXIubmFtZSA9PT0gJ25nTW9kdWxlRGVmJyAmJiBtZW1iZXIuaXNTdGF0aWMpO1xuICAgIGlmIChuZ01vZHVsZURlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICAvLyBWYWxpZGF0ZSB0aGF0IHRoZSBzaGFwZSBvZiB0aGUgbmdNb2R1bGVEZWYgdHlwZSBpcyBjb3JyZWN0LlxuICAgICAgICBuZ01vZHVsZURlZi50eXBlID09PSBudWxsIHx8ICF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKG5nTW9kdWxlRGVmLnR5cGUpIHx8XG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggIT09IDQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFJlYWQgdGhlIE1vZHVsZURhdGEgb3V0IG9mIHRoZSB0eXBlIGFyZ3VtZW50cy5cbiAgICBjb25zdCBbXywgZGVjbGFyYXRpb25NZXRhZGF0YSwgaW1wb3J0TWV0YWRhdGEsIGV4cG9ydE1ldGFkYXRhXSA9IG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cztcbiAgICByZXR1cm4ge1xuICAgICAgcmVmLFxuICAgICAgZGVjbGFyYXRpb25zOiBleHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKFxuICAgICAgICAgIHRoaXMuY2hlY2tlciwgZGVjbGFyYXRpb25NZXRhZGF0YSwgcmVmLm93bmVkQnlNb2R1bGVHdWVzcywgcmVzb2x1dGlvbkNvbnRleHQpLFxuICAgICAgZXhwb3J0czogZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShcbiAgICAgICAgICB0aGlzLmNoZWNrZXIsIGV4cG9ydE1ldGFkYXRhLCByZWYub3duZWRCeU1vZHVsZUd1ZXNzLCByZXNvbHV0aW9uQ29udGV4dCksXG4gICAgICBpbXBvcnRzOiBleHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKFxuICAgICAgICAgIHRoaXMuY2hlY2tlciwgaW1wb3J0TWV0YWRhdGEsIHJlZi5vd25lZEJ5TW9kdWxlR3Vlc3MsIHJlc29sdXRpb25Db250ZXh0KSxcbiAgICAgIHNjaGVtYXM6IFtdLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUmVhZCBkaXJlY3RpdmUgKG9yIGNvbXBvbmVudCkgbWV0YWRhdGEgZnJvbSBhIHJlZmVyZW5jZWQgY2xhc3MgaW4gYSAuZC50cyBmaWxlLlxuICAgKi9cbiAgZ2V0RGlyZWN0aXZlTWV0YWRhdGEocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiBEaXJlY3RpdmVNZXRhfG51bGwge1xuICAgIGNvbnN0IGNsYXp6ID0gcmVmLm5vZGU7XG4gICAgY29uc3QgZGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIGZpZWxkID0+IGZpZWxkLmlzU3RhdGljICYmIChmaWVsZC5uYW1lID09PSAnybVjbXAnIHx8IGZpZWxkLm5hbWUgPT09ICduZ0RpcmVjdGl2ZURlZicpKTtcbiAgICBpZiAoZGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE5vIGRlZmluaXRpb24gY291bGQgYmUgZm91bmQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBkZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkZWYudHlwZSkgfHxcbiAgICAgICAgZGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IGRlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyBzaGFwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzZWxlY3RvciA9IHJlYWRTdHJpbmdUeXBlKGRlZi50eXBlLnR5cGVBcmd1bWVudHNbMV0pO1xuICAgIGlmIChzZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlZixcbiAgICAgIG5hbWU6IGNsYXp6Lm5hbWUudGV4dCxcbiAgICAgIGlzQ29tcG9uZW50OiBkZWYubmFtZSA9PT0gJ8m1Y21wJywgc2VsZWN0b3IsXG4gICAgICBleHBvcnRBczogcmVhZFN0cmluZ0FycmF5VHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzJdKSxcbiAgICAgIGlucHV0czogcmVhZFN0cmluZ01hcFR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1szXSksXG4gICAgICBvdXRwdXRzOiByZWFkU3RyaW5nTWFwVHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzRdKSxcbiAgICAgIHF1ZXJpZXM6IHJlYWRTdHJpbmdBcnJheVR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1s1XSksXG4gICAgICAuLi5leHRyYWN0RGlyZWN0aXZlR3VhcmRzKGNsYXp6LCB0aGlzLnJlZmxlY3RvciksXG4gICAgICBiYXNlQ2xhc3M6IHJlYWRCYXNlQ2xhc3MoY2xhenosIHRoaXMuY2hlY2tlciwgdGhpcy5yZWZsZWN0b3IpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUmVhZCBwaXBlIG1ldGFkYXRhIGZyb20gYSByZWZlcmVuY2VkIGNsYXNzIGluIGEgLmQudHMgZmlsZS5cbiAgICovXG4gIGdldFBpcGVNZXRhZGF0YShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IFBpcGVNZXRhfG51bGwge1xuICAgIGNvbnN0IGRlZiA9IHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKHJlZi5ub2RlKS5maW5kKFxuICAgICAgICBmaWVsZCA9PiBmaWVsZC5pc1N0YXRpYyAmJiBmaWVsZC5uYW1lID09PSAnbmdQaXBlRGVmJyk7XG4gICAgaWYgKGRlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBObyBkZWZpbml0aW9uIGNvdWxkIGJlIGZvdW5kLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgZGVmLnR5cGUgPT09IG51bGwgfHwgIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGVmLnR5cGUpIHx8XG4gICAgICAgIGRlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fCBkZWYudHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIC8vIFRoZSB0eXBlIG1ldGFkYXRhIHdhcyB0aGUgd3Jvbmcgc2hhcGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgdHlwZSA9IGRlZi50eXBlLnR5cGVBcmd1bWVudHNbMV07XG4gICAgaWYgKCF0cy5pc0xpdGVyYWxUeXBlTm9kZSh0eXBlKSB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKHR5cGUubGl0ZXJhbCkpIHtcbiAgICAgIC8vIFRoZSB0eXBlIG1ldGFkYXRhIHdhcyB0aGUgd3JvbmcgdHlwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBuYW1lID0gdHlwZS5saXRlcmFsLnRleHQ7XG4gICAgcmV0dXJuIHtyZWYsIG5hbWV9O1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRCYXNlQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KTpcbiAgICBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj58J2R5bmFtaWMnfG51bGwge1xuICBpZiAoIWlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KSkge1xuICAgIC8vIFRlY2huaWNhbGx5IHRoaXMgaXMgYW4gZXJyb3IgaW4gYSAuZC50cyBmaWxlLCBidXQgZm9yIHRoZSBwdXJwb3NlcyBvZiBmaW5kaW5nIHRoZSBiYXNlIGNsYXNzXG4gICAgLy8gaXQncyBpZ25vcmVkLlxuICAgIHJldHVybiByZWZsZWN0b3IuaGFzQmFzZUNsYXNzKGNsYXp6KSA/ICdkeW5hbWljJyA6IG51bGw7XG4gIH1cblxuICBpZiAoY2xhenouaGVyaXRhZ2VDbGF1c2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICBmb3IgKGNvbnN0IGNsYXVzZSBvZiBjbGF6ei5oZXJpdGFnZUNsYXVzZXMpIHtcbiAgICAgIGlmIChjbGF1c2UudG9rZW4gPT09IHRzLlN5bnRheEtpbmQuRXh0ZW5kc0tleXdvcmQpIHtcbiAgICAgICAgY29uc3QgYmFzZUV4cHIgPSBjbGF1c2UudHlwZXNbMF0uZXhwcmVzc2lvbjtcbiAgICAgICAgbGV0IHN5bWJvbCA9IGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihiYXNlRXhwcik7XG4gICAgICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiAnZHluYW1pYyc7XG4gICAgICAgIH0gZWxzZSBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICAgICAgICBzeW1ib2wgPSBjaGVja2VyLmdldEFsaWFzZWRTeW1ib2woc3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBSZWZlcmVuY2Uoc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiAnZHluYW1pYyc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=