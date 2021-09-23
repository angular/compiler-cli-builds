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
        define("@angular/compiler-cli/src/ngtsc/metadata/src/dts", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/metadata/src/api", "@angular/compiler-cli/src/ngtsc/metadata/src/property_mapping", "@angular/compiler-cli/src/ngtsc/metadata/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DtsMetadataReader = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/api");
    var property_mapping_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/property_mapping");
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
        /**
         * Read the metadata from a class that has already been compiled somehow (either it's in a .d.ts
         * file, or in a .ts file with a handwritten definition).
         *
         * @param ref `Reference` to the class of interest, with the context of how it was obtained.
         */
        DtsMetadataReader.prototype.getNgModuleMetadata = function (ref) {
            var clazz = ref.node;
            // This operation is explicitly not memoized, as it depends on `ref.ownedByModuleGuess`.
            // TODO(alxhub): investigate caching of .d.ts module metadata.
            var ngModuleDef = this.reflector.getMembersOfClass(clazz).find(function (member) { return member.name === 'ɵmod' && member.isStatic; });
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
            var _a = (0, tslib_1.__read)(ngModuleDef.type.typeArguments, 4), _ = _a[0], declarationMetadata = _a[1], importMetadata = _a[2], exportMetadata = _a[3];
            return {
                ref: ref,
                declarations: (0, util_1.extractReferencesFromType)(this.checker, declarationMetadata, ref.bestGuessOwningModule),
                exports: (0, util_1.extractReferencesFromType)(this.checker, exportMetadata, ref.bestGuessOwningModule),
                imports: (0, util_1.extractReferencesFromType)(this.checker, importMetadata, ref.bestGuessOwningModule),
                schemas: [],
                rawDeclarations: null,
            };
        };
        /**
         * Read directive (or component) metadata from a referenced class in a .d.ts file.
         */
        DtsMetadataReader.prototype.getDirectiveMetadata = function (ref) {
            var clazz = ref.node;
            var def = this.reflector.getMembersOfClass(clazz).find(function (field) { return field.isStatic && (field.name === 'ɵcmp' || field.name === 'ɵdir'); });
            if (def === undefined) {
                // No definition could be found.
                return null;
            }
            else if (def.type === null || !ts.isTypeReferenceNode(def.type) ||
                def.type.typeArguments === undefined || def.type.typeArguments.length < 2) {
                // The type metadata was the wrong shape.
                return null;
            }
            var isComponent = def.name === 'ɵcmp';
            var ctorParams = this.reflector.getConstructorParameters(clazz);
            // A directive is considered to be structural if:
            // 1) it's a directive, not a component, and
            // 2) it injects `TemplateRef`
            var isStructural = !isComponent && ctorParams !== null && ctorParams.some(function (param) {
                return param.typeValueReference.kind === 1 /* IMPORTED */ &&
                    param.typeValueReference.moduleName === '@angular/core' &&
                    param.typeValueReference.importedName === 'TemplateRef';
            });
            var inputs = property_mapping_1.ClassPropertyMapping.fromMappedObject((0, util_1.readStringMapType)(def.type.typeArguments[3]));
            var outputs = property_mapping_1.ClassPropertyMapping.fromMappedObject((0, util_1.readStringMapType)(def.type.typeArguments[4]));
            return (0, tslib_1.__assign)((0, tslib_1.__assign)({ type: api_1.MetaType.Directive, ref: ref, name: clazz.name.text, isComponent: isComponent, selector: (0, util_1.readStringType)(def.type.typeArguments[1]), exportAs: (0, util_1.readStringArrayType)(def.type.typeArguments[2]), inputs: inputs, outputs: outputs, queries: (0, util_1.readStringArrayType)(def.type.typeArguments[5]) }, (0, util_1.extractDirectiveTypeCheckMeta)(clazz, inputs, this.reflector)), { baseClass: readBaseClass(clazz, this.checker, this.reflector), isPoisoned: false, isStructural: isStructural });
        };
        /**
         * Read pipe metadata from a referenced class in a .d.ts file.
         */
        DtsMetadataReader.prototype.getPipeMetadata = function (ref) {
            var def = this.reflector.getMembersOfClass(ref.node).find(function (field) { return field.isStatic && field.name === 'ɵpipe'; });
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
            return {
                type: api_1.MetaType.Pipe,
                ref: ref,
                name: name,
                nameExpr: null,
            };
        };
        return DtsMetadataReader;
    }());
    exports.DtsMetadataReader = DtsMetadataReader;
    function readBaseClass(clazz, checker, reflector) {
        var e_1, _a;
        if (!(0, reflection_1.isNamedClassDeclaration)(clazz)) {
            // Technically this is an error in a .d.ts file, but for the purposes of finding the base class
            // it's ignored.
            return reflector.hasBaseClass(clazz) ? 'dynamic' : null;
        }
        if (clazz.heritageClauses !== undefined) {
            try {
                for (var _b = (0, tslib_1.__values)(clazz.heritageClauses), _c = _b.next(); !_c.done; _c = _b.next()) {
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
                            (0, reflection_1.isNamedClassDeclaration)(symbol.valueDeclaration)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9tZXRhZGF0YS9zcmMvZHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsbUVBQXdDO0lBQ3hDLHlFQUFtSDtJQUVuSCx3RUFBc0Y7SUFDdEYsa0dBQXdEO0lBQ3hELDBFQUF3STtJQUV4STs7O09BR0c7SUFDSDtRQUNFLDJCQUFvQixPQUF1QixFQUFVLFNBQXlCO1lBQTFELFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7UUFBRyxDQUFDO1FBRWxGOzs7OztXQUtHO1FBQ0gsK0NBQW1CLEdBQW5CLFVBQW9CLEdBQWdDO1lBQ2xELElBQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFFdkIsd0ZBQXdGO1lBQ3hGLDhEQUE4RDtZQUM5RCxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FDNUQsVUFBQSxNQUFNLElBQUksT0FBQSxNQUFNLENBQUMsSUFBSSxLQUFLLE1BQU0sSUFBSSxNQUFNLENBQUMsUUFBUSxFQUF6QyxDQUF5QyxDQUFDLENBQUM7WUFDekQsSUFBSSxXQUFXLEtBQUssU0FBUyxFQUFFO2dCQUM3QixPQUFPLElBQUksQ0FBQzthQUNiO2lCQUFNO1lBQ0gsOERBQThEO1lBQzlELFdBQVcsQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7Z0JBQ3RFLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxLQUFLLFNBQVM7Z0JBQzVDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sS0FB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QUMsS0FBSyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFO3dCQUNqRCxJQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQzt3QkFDNUMsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUNuRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7NEJBQ3hCLE9BQU8sU0FBUyxDQUFDO3lCQUNsQjs2QkFBTSxJQUFJLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUU7NEJBQzlDLE1BQU0sR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7eUJBQzNDO3dCQUNELElBQUksTUFBTSxDQUFDLGdCQUFnQixLQUFLLFNBQVM7NEJBQ3JDLElBQUEsb0NBQXVCLEVBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7NEJBQ3BELE9BQU8sSUFBSSxtQkFBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO3lCQUMvQzs2QkFBTTs0QkFDTCxPQUFPLFNBQVMsQ0FBQzt5QkFDbEI7cUJBQ0Y7aUJBQ0Y7Ozs7Ozs7OztTQUNGO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdCwgVHlwZVZhbHVlUmVmZXJlbmNlS2luZH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmltcG9ydCB7RGlyZWN0aXZlTWV0YSwgTWV0YWRhdGFSZWFkZXIsIE1ldGFUeXBlLCBOZ01vZHVsZU1ldGEsIFBpcGVNZXRhfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0NsYXNzUHJvcGVydHlNYXBwaW5nfSBmcm9tICcuL3Byb3BlcnR5X21hcHBpbmcnO1xuaW1wb3J0IHtleHRyYWN0RGlyZWN0aXZlVHlwZUNoZWNrTWV0YSwgZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZSwgcmVhZFN0cmluZ0FycmF5VHlwZSwgcmVhZFN0cmluZ01hcFR5cGUsIHJlYWRTdHJpbmdUeXBlfSBmcm9tICcuL3V0aWwnO1xuXG4vKipcbiAqIEEgYE1ldGFkYXRhUmVhZGVyYCB0aGF0IGNhbiByZWFkIG1ldGFkYXRhIGZyb20gYC5kLnRzYCBmaWxlcywgd2hpY2ggaGF2ZSBzdGF0aWMgSXZ5IHByb3BlcnRpZXNcbiAqIGZyb20gYW4gdXBzdHJlYW0gY29tcGlsYXRpb24gYWxyZWFkeS5cbiAqL1xuZXhwb3J0IGNsYXNzIER0c01ldGFkYXRhUmVhZGVyIGltcGxlbWVudHMgTWV0YWRhdGFSZWFkZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpIHt9XG5cbiAgLyoqXG4gICAqIFJlYWQgdGhlIG1ldGFkYXRhIGZyb20gYSBjbGFzcyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gY29tcGlsZWQgc29tZWhvdyAoZWl0aGVyIGl0J3MgaW4gYSAuZC50c1xuICAgKiBmaWxlLCBvciBpbiBhIC50cyBmaWxlIHdpdGggYSBoYW5kd3JpdHRlbiBkZWZpbml0aW9uKS5cbiAgICpcbiAgICogQHBhcmFtIHJlZiBgUmVmZXJlbmNlYCB0byB0aGUgY2xhc3Mgb2YgaW50ZXJlc3QsIHdpdGggdGhlIGNvbnRleHQgb2YgaG93IGl0IHdhcyBvYnRhaW5lZC5cbiAgICovXG4gIGdldE5nTW9kdWxlTWV0YWRhdGEocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiBOZ01vZHVsZU1ldGF8bnVsbCB7XG4gICAgY29uc3QgY2xhenogPSByZWYubm9kZTtcblxuICAgIC8vIFRoaXMgb3BlcmF0aW9uIGlzIGV4cGxpY2l0bHkgbm90IG1lbW9pemVkLCBhcyBpdCBkZXBlbmRzIG9uIGByZWYub3duZWRCeU1vZHVsZUd1ZXNzYC5cbiAgICAvLyBUT0RPKGFseGh1Yik6IGludmVzdGlnYXRlIGNhY2hpbmcgb2YgLmQudHMgbW9kdWxlIG1ldGFkYXRhLlxuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIG1lbWJlciA9PiBtZW1iZXIubmFtZSA9PT0gJ8m1bW9kJyAmJiBtZW1iZXIuaXNTdGF0aWMpO1xuICAgIGlmIChuZ01vZHVsZURlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICAvLyBWYWxpZGF0ZSB0aGF0IHRoZSBzaGFwZSBvZiB0aGUgbmdNb2R1bGVEZWYgdHlwZSBpcyBjb3JyZWN0LlxuICAgICAgICBuZ01vZHVsZURlZi50eXBlID09PSBudWxsIHx8ICF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKG5nTW9kdWxlRGVmLnR5cGUpIHx8XG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggIT09IDQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFJlYWQgdGhlIE1vZHVsZURhdGEgb3V0IG9mIHRoZSB0eXBlIGFyZ3VtZW50cy5cbiAgICBjb25zdCBbXywgZGVjbGFyYXRpb25NZXRhZGF0YSwgaW1wb3J0TWV0YWRhdGEsIGV4cG9ydE1ldGFkYXRhXSA9IG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cztcbiAgICByZXR1cm4ge1xuICAgICAgcmVmLFxuICAgICAgZGVjbGFyYXRpb25zOlxuICAgICAgICAgIGV4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUodGhpcy5jaGVja2VyLCBkZWNsYXJhdGlvbk1ldGFkYXRhLCByZWYuYmVzdEd1ZXNzT3duaW5nTW9kdWxlKSxcbiAgICAgIGV4cG9ydHM6IGV4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUodGhpcy5jaGVja2VyLCBleHBvcnRNZXRhZGF0YSwgcmVmLmJlc3RHdWVzc093bmluZ01vZHVsZSksXG4gICAgICBpbXBvcnRzOiBleHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKHRoaXMuY2hlY2tlciwgaW1wb3J0TWV0YWRhdGEsIHJlZi5iZXN0R3Vlc3NPd25pbmdNb2R1bGUpLFxuICAgICAgc2NoZW1hczogW10sXG4gICAgICByYXdEZWNsYXJhdGlvbnM6IG51bGwsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIGRpcmVjdGl2ZSAob3IgY29tcG9uZW50KSBtZXRhZGF0YSBmcm9tIGEgcmVmZXJlbmNlZCBjbGFzcyBpbiBhIC5kLnRzIGZpbGUuXG4gICAqL1xuICBnZXREaXJlY3RpdmVNZXRhZGF0YShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IERpcmVjdGl2ZU1ldGF8bnVsbCB7XG4gICAgY29uc3QgY2xhenogPSByZWYubm9kZTtcbiAgICBjb25zdCBkZWYgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmluZChcbiAgICAgICAgZmllbGQgPT4gZmllbGQuaXNTdGF0aWMgJiYgKGZpZWxkLm5hbWUgPT09ICfJtWNtcCcgfHwgZmllbGQubmFtZSA9PT0gJ8m1ZGlyJykpO1xuICAgIGlmIChkZWYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gTm8gZGVmaW5pdGlvbiBjb3VsZCBiZSBmb3VuZC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIGRlZi50eXBlID09PSBudWxsIHx8ICF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGRlZi50eXBlKSB8fFxuICAgICAgICBkZWYudHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgZGVmLnR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAvLyBUaGUgdHlwZSBtZXRhZGF0YSB3YXMgdGhlIHdyb25nIHNoYXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaXNDb21wb25lbnQgPSBkZWYubmFtZSA9PT0gJ8m1Y21wJztcblxuICAgIGNvbnN0IGN0b3JQYXJhbXMgPSB0aGlzLnJlZmxlY3Rvci5nZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xhenopO1xuXG4gICAgLy8gQSBkaXJlY3RpdmUgaXMgY29uc2lkZXJlZCB0byBiZSBzdHJ1Y3R1cmFsIGlmOlxuICAgIC8vIDEpIGl0J3MgYSBkaXJlY3RpdmUsIG5vdCBhIGNvbXBvbmVudCwgYW5kXG4gICAgLy8gMikgaXQgaW5qZWN0cyBgVGVtcGxhdGVSZWZgXG4gICAgY29uc3QgaXNTdHJ1Y3R1cmFsID0gIWlzQ29tcG9uZW50ICYmIGN0b3JQYXJhbXMgIT09IG51bGwgJiYgY3RvclBhcmFtcy5zb21lKHBhcmFtID0+IHtcbiAgICAgIHJldHVybiBwYXJhbS50eXBlVmFsdWVSZWZlcmVuY2Uua2luZCA9PT0gVHlwZVZhbHVlUmVmZXJlbmNlS2luZC5JTVBPUlRFRCAmJlxuICAgICAgICAgIHBhcmFtLnR5cGVWYWx1ZVJlZmVyZW5jZS5tb2R1bGVOYW1lID09PSAnQGFuZ3VsYXIvY29yZScgJiZcbiAgICAgICAgICBwYXJhbS50eXBlVmFsdWVSZWZlcmVuY2UuaW1wb3J0ZWROYW1lID09PSAnVGVtcGxhdGVSZWYnO1xuICAgIH0pO1xuXG4gICAgY29uc3QgaW5wdXRzID1cbiAgICAgICAgQ2xhc3NQcm9wZXJ0eU1hcHBpbmcuZnJvbU1hcHBlZE9iamVjdChyZWFkU3RyaW5nTWFwVHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzNdKSk7XG4gICAgY29uc3Qgb3V0cHV0cyA9XG4gICAgICAgIENsYXNzUHJvcGVydHlNYXBwaW5nLmZyb21NYXBwZWRPYmplY3QocmVhZFN0cmluZ01hcFR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1s0XSkpO1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiBNZXRhVHlwZS5EaXJlY3RpdmUsXG4gICAgICByZWYsXG4gICAgICBuYW1lOiBjbGF6ei5uYW1lLnRleHQsXG4gICAgICBpc0NvbXBvbmVudCxcbiAgICAgIHNlbGVjdG9yOiByZWFkU3RyaW5nVHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzFdKSxcbiAgICAgIGV4cG9ydEFzOiByZWFkU3RyaW5nQXJyYXlUeXBlKGRlZi50eXBlLnR5cGVBcmd1bWVudHNbMl0pLFxuICAgICAgaW5wdXRzLFxuICAgICAgb3V0cHV0cyxcbiAgICAgIHF1ZXJpZXM6IHJlYWRTdHJpbmdBcnJheVR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1s1XSksXG4gICAgICAuLi5leHRyYWN0RGlyZWN0aXZlVHlwZUNoZWNrTWV0YShjbGF6eiwgaW5wdXRzLCB0aGlzLnJlZmxlY3RvciksXG4gICAgICBiYXNlQ2xhc3M6IHJlYWRCYXNlQ2xhc3MoY2xhenosIHRoaXMuY2hlY2tlciwgdGhpcy5yZWZsZWN0b3IpLFxuICAgICAgaXNQb2lzb25lZDogZmFsc2UsXG4gICAgICBpc1N0cnVjdHVyYWwsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIHBpcGUgbWV0YWRhdGEgZnJvbSBhIHJlZmVyZW5jZWQgY2xhc3MgaW4gYSAuZC50cyBmaWxlLlxuICAgKi9cbiAgZ2V0UGlwZU1ldGFkYXRhKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogUGlwZU1ldGF8bnVsbCB7XG4gICAgY29uc3QgZGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MocmVmLm5vZGUpLmZpbmQoXG4gICAgICAgIGZpZWxkID0+IGZpZWxkLmlzU3RhdGljICYmIGZpZWxkLm5hbWUgPT09ICfJtXBpcGUnKTtcbiAgICBpZiAoZGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE5vIGRlZmluaXRpb24gY291bGQgYmUgZm91bmQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBkZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkZWYudHlwZSkgfHxcbiAgICAgICAgZGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IGRlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyBzaGFwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB0eXBlID0gZGVmLnR5cGUudHlwZUFyZ3VtZW50c1sxXTtcbiAgICBpZiAoIXRzLmlzTGl0ZXJhbFR5cGVOb2RlKHR5cGUpIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwodHlwZS5saXRlcmFsKSkge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyB0eXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IG5hbWUgPSB0eXBlLmxpdGVyYWwudGV4dDtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogTWV0YVR5cGUuUGlwZSxcbiAgICAgIHJlZixcbiAgICAgIG5hbWUsXG4gICAgICBuYW1lRXhwcjogbnVsbCxcbiAgICB9O1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRCYXNlQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KTpcbiAgICBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj58J2R5bmFtaWMnfG51bGwge1xuICBpZiAoIWlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KSkge1xuICAgIC8vIFRlY2huaWNhbGx5IHRoaXMgaXMgYW4gZXJyb3IgaW4gYSAuZC50cyBmaWxlLCBidXQgZm9yIHRoZSBwdXJwb3NlcyBvZiBmaW5kaW5nIHRoZSBiYXNlIGNsYXNzXG4gICAgLy8gaXQncyBpZ25vcmVkLlxuICAgIHJldHVybiByZWZsZWN0b3IuaGFzQmFzZUNsYXNzKGNsYXp6KSA/ICdkeW5hbWljJyA6IG51bGw7XG4gIH1cblxuICBpZiAoY2xhenouaGVyaXRhZ2VDbGF1c2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICBmb3IgKGNvbnN0IGNsYXVzZSBvZiBjbGF6ei5oZXJpdGFnZUNsYXVzZXMpIHtcbiAgICAgIGlmIChjbGF1c2UudG9rZW4gPT09IHRzLlN5bnRheEtpbmQuRXh0ZW5kc0tleXdvcmQpIHtcbiAgICAgICAgY29uc3QgYmFzZUV4cHIgPSBjbGF1c2UudHlwZXNbMF0uZXhwcmVzc2lvbjtcbiAgICAgICAgbGV0IHN5bWJvbCA9IGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihiYXNlRXhwcik7XG4gICAgICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiAnZHluYW1pYyc7XG4gICAgICAgIH0gZWxzZSBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICAgICAgICBzeW1ib2wgPSBjaGVja2VyLmdldEFsaWFzZWRTeW1ib2woc3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBSZWZlcmVuY2Uoc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiAnZHluYW1pYyc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=