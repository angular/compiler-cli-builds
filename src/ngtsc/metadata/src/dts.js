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
            var def = this.reflector.getMembersOfClass(clazz).find(function (field) {
                return field.isStatic && (field.name === 'ngComponentDef' || field.name === 'ngDirectiveDef');
            });
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
            return tslib_1.__assign({ ref: ref, name: clazz.name.text, isComponent: def.name === 'ngComponentDef', selector: selector, exportAs: util_1.readStringArrayType(def.type.typeArguments[2]), inputs: util_1.readStringMapType(def.type.typeArguments[3]), outputs: util_1.readStringMapType(def.type.typeArguments[4]), queries: util_1.readStringArrayType(def.type.typeArguments[5]) }, util_1.extractDirectiveGuards(clazz, this.reflector), { baseClass: readBaseClass(clazz, this.checker, this.reflector) });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9tZXRhZGF0YS9zcmMvZHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyxtRUFBd0M7SUFDeEMseUVBQTJGO0lBRzNGLDBFQUFpSTtJQUVqSTs7O09BR0c7SUFDSDtRQUNFLDJCQUFvQixPQUF1QixFQUFVLFNBQXlCO1lBQTFELFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7UUFBRyxDQUFDO1FBRWxGLCtDQUFtQixHQUFuQixVQUFvQixHQUFnQztZQUNsRCxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDNUMsT0FBTyxJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDO1FBQ2pELENBQUM7UUFFRDs7Ozs7V0FLRztRQUNILCtDQUFtQixHQUFuQixVQUFvQixHQUFnQztZQUNsRCxJQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ3ZCLElBQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsQ0FBQztZQUN6RCx3RkFBd0Y7WUFDeEYsOERBQThEO1lBQzlELElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUM1RCxVQUFBLE1BQU0sSUFBSSxPQUFBLE1BQU0sQ0FBQyxJQUFJLEtBQUssYUFBYSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQWhELENBQWdELENBQUMsQ0FBQztZQUNoRSxJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUU7Z0JBQzdCLE9BQU8sSUFBSSxDQUFDO2FB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QWdCLENBQUMsRUFBRTs0QkFDcEQsT0FBTyxJQUFJLG1CQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7eUJBQy9DOzZCQUFNOzRCQUNMLE9BQU8sU0FBUyxDQUFDO3lCQUNsQjtxQkFDRjtpQkFDRjs7Ozs7Ozs7O1NBQ0Y7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0LCBpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmltcG9ydCB7RGlyZWN0aXZlTWV0YSwgTWV0YWRhdGFSZWFkZXIsIE5nTW9kdWxlTWV0YSwgUGlwZU1ldGF9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7ZXh0cmFjdERpcmVjdGl2ZUd1YXJkcywgZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZSwgcmVhZFN0cmluZ0FycmF5VHlwZSwgcmVhZFN0cmluZ01hcFR5cGUsIHJlYWRTdHJpbmdUeXBlfSBmcm9tICcuL3V0aWwnO1xuXG4vKipcbiAqIEEgYE1ldGFkYXRhUmVhZGVyYCB0aGF0IGNhbiByZWFkIG1ldGFkYXRhIGZyb20gYC5kLnRzYCBmaWxlcywgd2hpY2ggaGF2ZSBzdGF0aWMgSXZ5IHByb3BlcnRpZXNcbiAqIGZyb20gYW4gdXBzdHJlYW0gY29tcGlsYXRpb24gYWxyZWFkeS5cbiAqL1xuZXhwb3J0IGNsYXNzIER0c01ldGFkYXRhUmVhZGVyIGltcGxlbWVudHMgTWV0YWRhdGFSZWFkZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpIHt9XG5cbiAgaXNBYnN0cmFjdERpcmVjdGl2ZShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IG1ldGEgPSB0aGlzLmdldERpcmVjdGl2ZU1ldGFkYXRhKHJlZik7XG4gICAgcmV0dXJuIG1ldGEgIT09IG51bGwgJiYgbWV0YS5zZWxlY3RvciA9PT0gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIHRoZSBtZXRhZGF0YSBmcm9tIGEgY2xhc3MgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGNvbXBpbGVkIHNvbWVob3cgKGVpdGhlciBpdCdzIGluIGEgLmQudHNcbiAgICogZmlsZSwgb3IgaW4gYSAudHMgZmlsZSB3aXRoIGEgaGFuZHdyaXR0ZW4gZGVmaW5pdGlvbikuXG4gICAqXG4gICAqIEBwYXJhbSByZWYgYFJlZmVyZW5jZWAgdG8gdGhlIGNsYXNzIG9mIGludGVyZXN0LCB3aXRoIHRoZSBjb250ZXh0IG9mIGhvdyBpdCB3YXMgb2J0YWluZWQuXG4gICAqL1xuICBnZXROZ01vZHVsZU1ldGFkYXRhKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogTmdNb2R1bGVNZXRhfG51bGwge1xuICAgIGNvbnN0IGNsYXp6ID0gcmVmLm5vZGU7XG4gICAgY29uc3QgcmVzb2x1dGlvbkNvbnRleHQgPSBjbGF6ei5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgLy8gVGhpcyBvcGVyYXRpb24gaXMgZXhwbGljaXRseSBub3QgbWVtb2l6ZWQsIGFzIGl0IGRlcGVuZHMgb24gYHJlZi5vd25lZEJ5TW9kdWxlR3Vlc3NgLlxuICAgIC8vIFRPRE8oYWx4aHViKTogaW52ZXN0aWdhdGUgY2FjaGluZyBvZiAuZC50cyBtb2R1bGUgbWV0YWRhdGEuXG4gICAgY29uc3QgbmdNb2R1bGVEZWYgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmluZChcbiAgICAgICAgbWVtYmVyID0+IG1lbWJlci5uYW1lID09PSAnbmdNb2R1bGVEZWYnICYmIG1lbWJlci5pc1N0YXRpYyk7XG4gICAgaWYgKG5nTW9kdWxlRGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIC8vIFZhbGlkYXRlIHRoYXQgdGhlIHNoYXBlIG9mIHRoZSBuZ01vZHVsZURlZiB0eXBlIGlzIGNvcnJlY3QuXG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUgPT09IG51bGwgfHwgIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUobmdNb2R1bGVEZWYudHlwZSkgfHxcbiAgICAgICAgbmdNb2R1bGVEZWYudHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgbmdNb2R1bGVEZWYudHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gNCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gUmVhZCB0aGUgTW9kdWxlRGF0YSBvdXQgb2YgdGhlIHR5cGUgYXJndW1lbnRzLlxuICAgIGNvbnN0IFtfLCBkZWNsYXJhdGlvbk1ldGFkYXRhLCBpbXBvcnRNZXRhZGF0YSwgZXhwb3J0TWV0YWRhdGFdID0gbmdNb2R1bGVEZWYudHlwZS50eXBlQXJndW1lbnRzO1xuICAgIHJldHVybiB7XG4gICAgICByZWYsXG4gICAgICBkZWNsYXJhdGlvbnM6IGV4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoXG4gICAgICAgICAgdGhpcy5jaGVja2VyLCBkZWNsYXJhdGlvbk1ldGFkYXRhLCByZWYub3duZWRCeU1vZHVsZUd1ZXNzLCByZXNvbHV0aW9uQ29udGV4dCksXG4gICAgICBleHBvcnRzOiBleHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKFxuICAgICAgICAgIHRoaXMuY2hlY2tlciwgZXhwb3J0TWV0YWRhdGEsIHJlZi5vd25lZEJ5TW9kdWxlR3Vlc3MsIHJlc29sdXRpb25Db250ZXh0KSxcbiAgICAgIGltcG9ydHM6IGV4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoXG4gICAgICAgICAgdGhpcy5jaGVja2VyLCBpbXBvcnRNZXRhZGF0YSwgcmVmLm93bmVkQnlNb2R1bGVHdWVzcywgcmVzb2x1dGlvbkNvbnRleHQpLFxuICAgICAgc2NoZW1hczogW10sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIGRpcmVjdGl2ZSAob3IgY29tcG9uZW50KSBtZXRhZGF0YSBmcm9tIGEgcmVmZXJlbmNlZCBjbGFzcyBpbiBhIC5kLnRzIGZpbGUuXG4gICAqL1xuICBnZXREaXJlY3RpdmVNZXRhZGF0YShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IERpcmVjdGl2ZU1ldGF8bnVsbCB7XG4gICAgY29uc3QgY2xhenogPSByZWYubm9kZTtcbiAgICBjb25zdCBkZWYgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmluZChcbiAgICAgICAgZmllbGQgPT5cbiAgICAgICAgICAgIGZpZWxkLmlzU3RhdGljICYmIChmaWVsZC5uYW1lID09PSAnbmdDb21wb25lbnREZWYnIHx8IGZpZWxkLm5hbWUgPT09ICduZ0RpcmVjdGl2ZURlZicpKTtcbiAgICBpZiAoZGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE5vIGRlZmluaXRpb24gY291bGQgYmUgZm91bmQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBkZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkZWYudHlwZSkgfHxcbiAgICAgICAgZGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IGRlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyBzaGFwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzZWxlY3RvciA9IHJlYWRTdHJpbmdUeXBlKGRlZi50eXBlLnR5cGVBcmd1bWVudHNbMV0pO1xuICAgIGlmIChzZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlZixcbiAgICAgIG5hbWU6IGNsYXp6Lm5hbWUudGV4dCxcbiAgICAgIGlzQ29tcG9uZW50OiBkZWYubmFtZSA9PT0gJ25nQ29tcG9uZW50RGVmJywgc2VsZWN0b3IsXG4gICAgICBleHBvcnRBczogcmVhZFN0cmluZ0FycmF5VHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzJdKSxcbiAgICAgIGlucHV0czogcmVhZFN0cmluZ01hcFR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1szXSksXG4gICAgICBvdXRwdXRzOiByZWFkU3RyaW5nTWFwVHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzRdKSxcbiAgICAgIHF1ZXJpZXM6IHJlYWRTdHJpbmdBcnJheVR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1s1XSksXG4gICAgICAuLi5leHRyYWN0RGlyZWN0aXZlR3VhcmRzKGNsYXp6LCB0aGlzLnJlZmxlY3RvciksXG4gICAgICBiYXNlQ2xhc3M6IHJlYWRCYXNlQ2xhc3MoY2xhenosIHRoaXMuY2hlY2tlciwgdGhpcy5yZWZsZWN0b3IpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUmVhZCBwaXBlIG1ldGFkYXRhIGZyb20gYSByZWZlcmVuY2VkIGNsYXNzIGluIGEgLmQudHMgZmlsZS5cbiAgICovXG4gIGdldFBpcGVNZXRhZGF0YShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IFBpcGVNZXRhfG51bGwge1xuICAgIGNvbnN0IGRlZiA9IHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKHJlZi5ub2RlKS5maW5kKFxuICAgICAgICBmaWVsZCA9PiBmaWVsZC5pc1N0YXRpYyAmJiBmaWVsZC5uYW1lID09PSAnbmdQaXBlRGVmJyk7XG4gICAgaWYgKGRlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBObyBkZWZpbml0aW9uIGNvdWxkIGJlIGZvdW5kLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgZGVmLnR5cGUgPT09IG51bGwgfHwgIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGVmLnR5cGUpIHx8XG4gICAgICAgIGRlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fCBkZWYudHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIC8vIFRoZSB0eXBlIG1ldGFkYXRhIHdhcyB0aGUgd3Jvbmcgc2hhcGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgdHlwZSA9IGRlZi50eXBlLnR5cGVBcmd1bWVudHNbMV07XG4gICAgaWYgKCF0cy5pc0xpdGVyYWxUeXBlTm9kZSh0eXBlKSB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKHR5cGUubGl0ZXJhbCkpIHtcbiAgICAgIC8vIFRoZSB0eXBlIG1ldGFkYXRhIHdhcyB0aGUgd3JvbmcgdHlwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBuYW1lID0gdHlwZS5saXRlcmFsLnRleHQ7XG4gICAgcmV0dXJuIHtyZWYsIG5hbWV9O1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRCYXNlQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KTpcbiAgICBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj58J2R5bmFtaWMnfG51bGwge1xuICBpZiAoIWlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KSkge1xuICAgIC8vIFRlY2huaWNhbGx5IHRoaXMgaXMgYW4gZXJyb3IgaW4gYSAuZC50cyBmaWxlLCBidXQgZm9yIHRoZSBwdXJwb3NlcyBvZiBmaW5kaW5nIHRoZSBiYXNlIGNsYXNzXG4gICAgLy8gaXQncyBpZ25vcmVkLlxuICAgIHJldHVybiByZWZsZWN0b3IuaGFzQmFzZUNsYXNzKGNsYXp6KSA/ICdkeW5hbWljJyA6IG51bGw7XG4gIH1cblxuICBpZiAoY2xhenouaGVyaXRhZ2VDbGF1c2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICBmb3IgKGNvbnN0IGNsYXVzZSBvZiBjbGF6ei5oZXJpdGFnZUNsYXVzZXMpIHtcbiAgICAgIGlmIChjbGF1c2UudG9rZW4gPT09IHRzLlN5bnRheEtpbmQuRXh0ZW5kc0tleXdvcmQpIHtcbiAgICAgICAgY29uc3QgYmFzZUV4cHIgPSBjbGF1c2UudHlwZXNbMF0uZXhwcmVzc2lvbjtcbiAgICAgICAgbGV0IHN5bWJvbCA9IGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihiYXNlRXhwcik7XG4gICAgICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiAnZHluYW1pYyc7XG4gICAgICAgIH0gZWxzZSBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICAgICAgICBzeW1ib2wgPSBjaGVja2VyLmdldEFsaWFzZWRTeW1ib2woc3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBSZWZlcmVuY2Uoc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiAnZHluYW1pYyc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=