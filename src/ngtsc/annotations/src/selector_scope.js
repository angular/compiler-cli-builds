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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/selector_scope", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Registry which records and correlates static analysis information of Angular types.
     *
     * Once a compilation unit's information is fed into the SelectorScopeRegistry, it can be asked to
     * produce transitive `CompilationScope`s for components.
     */
    var SelectorScopeRegistry = /** @class */ (function () {
        function SelectorScopeRegistry(checker) {
            this.checker = checker;
            /**
             *  Map of modules declared in the current compilation unit to their (local) metadata.
             */
            this._moduleToData = new Map();
            /**
             * Map of modules to their cached `CompilationScope`s.
             */
            this._compilationScopeCache = new Map();
            /**
             * Map of components/directives to their selector.
             */
            this._directiveToSelector = new Map();
            /**
             * Map of pipes to their name.
             */
            this._pipeToName = new Map();
            /**
             * Map of components/directives/pipes to their module.
             */
            this._declararedTypeToModule = new Map();
        }
        /**
         * Register a module's metadata with the registry.
         */
        SelectorScopeRegistry.prototype.registerModule = function (node, data) {
            var _this = this;
            node = ts.getOriginalNode(node);
            if (this._moduleToData.has(node)) {
                throw new Error("Module already registered: " + node.name.text);
            }
            this._moduleToData.set(node, data);
            // Register all of the module's declarations in the context map as belonging to this module.
            data.declarations.forEach(function (decl) {
                _this._declararedTypeToModule.set(ts.getOriginalNode(decl.node), node);
            });
        };
        /**
         * Register the selector of a component or directive with the registry.
         */
        SelectorScopeRegistry.prototype.registerSelector = function (node, selector) {
            node = ts.getOriginalNode(node);
            if (this._directiveToSelector.has(node)) {
                throw new Error("Selector already registered: " + node.name.text + " " + selector);
            }
            this._directiveToSelector.set(node, selector);
        };
        /**
         * Register the name of a pipe with the registry.
         */
        SelectorScopeRegistry.prototype.registerPipe = function (node, name) { this._pipeToName.set(node, name); };
        /**
         * Produce the compilation scope of a component, which is determined by the module that declares
         * it.
         */
        SelectorScopeRegistry.prototype.lookupCompilationScope = function (node) {
            var _this = this;
            node = ts.getOriginalNode(node);
            // If the component has no associated module, then it has no compilation scope.
            if (!this._declararedTypeToModule.has(node)) {
                return null;
            }
            var module = this._declararedTypeToModule.get(node);
            // Compilation scope computation is somewhat expensive, so it's cached. Check the cache for
            // the module.
            if (this._compilationScopeCache.has(module)) {
                // The compilation scope was cached.
                var scope_1 = this._compilationScopeCache.get(module);
                // The scope as cached is in terms of References, not Expressions. Converting between them
                // requires knowledge of the context file (in this case, the component node's source file).
                return convertScopeToExpressions(scope_1, node.getSourceFile());
            }
            // This is the first time the scope for this module is being computed.
            var directives = new Map();
            var pipes = new Map();
            // Process the declaration scope of the module, and lookup the selector of every declared type.
            // The initial value of ngModuleImportedFrom is 'null' which signifies that the NgModule
            // was not imported from a .d.ts source.
            this.lookupScopes(module, /* ngModuleImportedFrom */ null).compilation.forEach(function (ref) {
                var selector = _this.lookupDirectiveSelector(ts.getOriginalNode(ref.node));
                // Only directives/components with selectors get added to the scope.
                if (selector != null) {
                    directives.set(selector, ref);
                }
            });
            var scope = { directives: directives, pipes: pipes };
            // Many components may be compiled in the same scope, so cache it.
            this._compilationScopeCache.set(node, scope);
            // Convert References to Expressions in the context of the component's source file.
            return convertScopeToExpressions(scope, node.getSourceFile());
        };
        /**
         * Lookup `SelectorScopes` for a given module.
         *
         * This function assumes that if the given module was imported from an absolute path
         * (`ngModuleImportedFrom`) then all of its declarations are exported at that same path, as well
         * as imports and exports from other modules that are relatively imported.
         */
        SelectorScopeRegistry.prototype.lookupScopes = function (node, ngModuleImportedFrom) {
            var _this = this;
            var data = null;
            // Either this module was analyzed directly, or has a precompiled ngModuleDef.
            if (this._moduleToData.has(node)) {
                // The module was analyzed before, and thus its data is available.
                data = this._moduleToData.get(node);
            }
            else {
                // The module wasn't analyzed before, and probably has a precompiled ngModuleDef with a type
                // annotation that specifies the needed metadata.
                if (ngModuleImportedFrom === null) {
                    // TODO(alxhub): handle hand-compiled ngModuleDef in the current Program.
                    throw new Error("Need to read .d.ts module but ngModuleImportedFrom is unspecified");
                }
                data = this._readMetadataFromCompiledClass(node, ngModuleImportedFrom);
                // Note that data here could still be null, if the class didn't have a precompiled
                // ngModuleDef.
            }
            if (data === null) {
                throw new Error("Module not registered: " + node.name.text);
            }
            return {
                compilation: tslib_1.__spread(data.declarations, flatten(data.imports.map(function (ref) { return _this.lookupScopes(ref.node, absoluteModuleName(ref))
                    .exported; })), flatten(data.exports.filter(function (ref) { return _this._moduleToData.has(ref.node); })
                    .map(function (ref) {
                    return _this.lookupScopes(ref.node, absoluteModuleName(ref))
                        .exported;
                }))),
                exported: flatten(data.exports.map(function (ref) {
                    if (_this._moduleToData.has(ref.node)) {
                        return _this.lookupScopes(ref.node, absoluteModuleName(ref))
                            .exported;
                    }
                    else {
                        return [ref];
                    }
                })),
            };
        };
        /**
         * Lookup the selector of a component or directive class.
         *
         * Potentially this class is declared in a .d.ts file or otherwise has a manually created
         * ngComponentDef/ngDirectiveDef. In this case, the type metadata of that definition is read
         * to determine the selector.
         */
        SelectorScopeRegistry.prototype.lookupDirectiveSelector = function (node) {
            if (this._directiveToSelector.has(node)) {
                return this._directiveToSelector.get(node);
            }
            else {
                return this._readSelectorFromCompiledClass(node);
            }
        };
        SelectorScopeRegistry.prototype.lookupPipeName = function (node) {
            return this._pipeToName.get(node);
        };
        /**
         * Read the metadata from a class that has already been compiled somehow (either it's in a .d.ts
         * file, or in a .ts file with a handwritten definition).
         *
         * @param clazz the class of interest
         * @param ngModuleImportedFrom module specifier of the import path to assume for all declarations
         * stemming from this module.
         */
        SelectorScopeRegistry.prototype._readMetadataFromCompiledClass = function (clazz, ngModuleImportedFrom) {
            // This operation is explicitly not memoized, as it depends on `ngModuleImportedFrom`.
            // TODO(alxhub): investigate caching of .d.ts module metadata.
            var ngModuleDef = metadata_1.reflectStaticField(clazz, 'ngModuleDef');
            if (ngModuleDef === null) {
                return null;
            }
            else if (
            // Validate that the shape of the ngModuleDef type is correct.
            ngModuleDef.type === undefined || !ts.isTypeReferenceNode(ngModuleDef.type) ||
                ngModuleDef.type.typeArguments === undefined ||
                ngModuleDef.type.typeArguments.length !== 4) {
                return null;
            }
            // Read the ModuleData out of the type arguments.
            var _a = tslib_1.__read(ngModuleDef.type.typeArguments, 4), _ = _a[0], declarationMetadata = _a[1], importMetadata = _a[2], exportMetadata = _a[3];
            return {
                declarations: this._extractReferencesFromType(declarationMetadata, ngModuleImportedFrom),
                exports: this._extractReferencesFromType(exportMetadata, ngModuleImportedFrom),
                imports: this._extractReferencesFromType(importMetadata, ngModuleImportedFrom),
            };
        };
        /**
         * Get the selector from type metadata for a class with a precompiled ngComponentDef or
         * ngDirectiveDef.
         */
        SelectorScopeRegistry.prototype._readSelectorFromCompiledClass = function (clazz) {
            var def = metadata_1.reflectStaticField(clazz, 'ngComponentDef') || metadata_1.reflectStaticField(clazz, 'ngDirectiveDef');
            if (def === null) {
                // No definition could be found.
                return null;
            }
            else if (def.type === undefined || !ts.isTypeReferenceNode(def.type) ||
                def.type.typeArguments === undefined || def.type.typeArguments.length !== 2) {
                // The type metadata was the wrong shape.
                return null;
            }
            var type = def.type.typeArguments[1];
            if (!ts.isLiteralTypeNode(type) || !ts.isStringLiteral(type.literal)) {
                // The type metadata was the wrong type.
                return null;
            }
            return type.literal.text;
        };
        /**
         * Process a `TypeNode` which is a tuple of references to other types, and return `Reference`s to
         * them.
         *
         * This operation assumes that these types should be imported from `ngModuleImportedFrom` unless
         * they themselves were imported from another absolute path.
         */
        SelectorScopeRegistry.prototype._extractReferencesFromType = function (def, ngModuleImportedFrom) {
            var _this = this;
            if (!ts.isTupleTypeNode(def)) {
                return [];
            }
            return def.elementTypes.map(function (element) {
                if (!ts.isTypeReferenceNode(element)) {
                    throw new Error("Expected TypeReferenceNode");
                }
                var type = element.typeName;
                var _a = metadata_1.reflectTypeEntityToDeclaration(type, _this.checker), node = _a.node, from = _a.from;
                var moduleName = (from !== null && !from.startsWith('.') ? from : ngModuleImportedFrom);
                var clazz = node;
                return new metadata_1.AbsoluteReference(node, clazz.name, moduleName, clazz.name.text);
            });
        };
        return SelectorScopeRegistry;
    }());
    exports.SelectorScopeRegistry = SelectorScopeRegistry;
    function flatten(array) {
        return array.reduce(function (accum, subArray) {
            accum.push.apply(accum, tslib_1.__spread(subArray));
            return accum;
        }, []);
    }
    function absoluteModuleName(ref) {
        var name = ref.node.name.text;
        if (!(ref instanceof metadata_1.AbsoluteReference)) {
            return null;
        }
        return ref.moduleName;
    }
    function convertReferenceMap(map, context) {
        return new Map(Array.from(map.entries()).map(function (_a) {
            var _b = tslib_1.__read(_a, 2), selector = _b[0], ref = _b[1];
            return [selector, util_1.referenceToExpression(ref, context)];
        }));
    }
    function convertScopeToExpressions(scope, context) {
        var directives = convertReferenceMap(scope.directives, context);
        var pipes = convertReferenceMap(scope.pipes, context);
        return { directives: directives, pipes: pipes };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0b3Jfc2NvcGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9zZWxlY3Rvcl9zY29wZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMscUVBQWdIO0lBRWhILDZFQUE2QztJQXNDN0M7Ozs7O09BS0c7SUFDSDtRQTBCRSwrQkFBb0IsT0FBdUI7WUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUF6QjNDOztlQUVHO1lBQ0ssa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQztZQUVuRTs7ZUFFRztZQUNLLDJCQUFzQixHQUFHLElBQUksR0FBRyxFQUFvRCxDQUFDO1lBRTdGOztlQUVHO1lBQ0sseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUM7WUFFdEU7O2VBRUc7WUFDSyxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUErQixDQUFDO1lBRTdEOztlQUVHO1lBQ0ssNEJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQTRDLENBQUM7UUFFeEMsQ0FBQztRQUUvQzs7V0FFRztRQUNILDhDQUFjLEdBQWQsVUFBZSxJQUF5QixFQUFFLElBQWdCO1lBQTFELGlCQVlDO1lBWEMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUF3QixDQUFDO1lBRXZELElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0NBQThCLElBQUksQ0FBQyxJQUFLLENBQUMsSUFBTSxDQUFDLENBQUM7YUFDbEU7WUFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFbkMsNEZBQTRGO1lBQzVG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QUFDO1FBQS9DLENBQStDLENBQUMsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRCxtQ0FDSSxLQUFrQyxFQUFFLE9BQXNCO1FBQzVELElBQU0sVUFBVSxHQUFHLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbEUsSUFBTSxLQUFLLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4RCxPQUFPLEVBQUMsVUFBVSxZQUFBLEVBQUUsS0FBSyxPQUFBLEVBQUMsQ0FBQztJQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgRXh0ZXJuYWxSZWZlcmVuY2V9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlUmVmZXJlbmNlLCBSZWZlcmVuY2UsIHJlZmxlY3RTdGF0aWNGaWVsZCwgcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5cbmltcG9ydCB7cmVmZXJlbmNlVG9FeHByZXNzaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogTWV0YWRhdGEgZXh0cmFjdGVkIGZvciBhIGdpdmVuIE5nTW9kdWxlIHRoYXQgY2FuIGJlIHVzZWQgdG8gY29tcHV0ZSBzZWxlY3RvciBzY29wZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTW9kdWxlRGF0YSB7XG4gIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlW107XG4gIGltcG9ydHM6IFJlZmVyZW5jZVtdO1xuICBleHBvcnRzOiBSZWZlcmVuY2VbXTtcbn1cblxuLyoqXG4gKiBUcmFuc2l0aXZlbHkgZXhwYW5kZWQgbWFwcyBvZiBkaXJlY3RpdmVzIGFuZCBwaXBlcyB2aXNpYmxlIHRvIGEgY29tcG9uZW50IGJlaW5nIGNvbXBpbGVkIGluIHRoZVxuICogY29udGV4dCBvZiBzb21lIG1vZHVsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21waWxhdGlvblNjb3BlPFQ+IHtcbiAgZGlyZWN0aXZlczogTWFwPHN0cmluZywgVD47XG4gIHBpcGVzOiBNYXA8c3RyaW5nLCBUPjtcbn1cblxuLyoqXG4gKiBCb3RoIHRyYW5zaXRpdmVseSBleHBhbmRlZCBzY29wZXMgZm9yIGEgZ2l2ZW4gTmdNb2R1bGUuXG4gKi9cbmludGVyZmFjZSBTZWxlY3RvclNjb3BlcyB7XG4gIC8qKlxuICAgKiBTZXQgb2YgY29tcG9uZW50cywgZGlyZWN0aXZlcywgYW5kIHBpcGVzIHZpc2libGUgdG8gYWxsIGNvbXBvbmVudHMgYmVpbmcgY29tcGlsZWQgaW4gdGhlXG4gICAqIGNvbnRleHQgb2Ygc29tZSBtb2R1bGUuXG4gICAqL1xuICBjb21waWxhdGlvbjogUmVmZXJlbmNlW107XG5cbiAgLyoqXG4gICAqIFNldCBvZiBjb21wb25lbnRzLCBkaXJlY3RpdmVzLCBhbmQgcGlwZXMgYWRkZWQgdG8gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGFueSBtb2R1bGUgaW1wb3J0aW5nXG4gICAqIHNvbWUgbW9kdWxlLlxuICAgKi9cbiAgZXhwb3J0ZWQ6IFJlZmVyZW5jZVtdO1xufVxuXG4vKipcbiAqIFJlZ2lzdHJ5IHdoaWNoIHJlY29yZHMgYW5kIGNvcnJlbGF0ZXMgc3RhdGljIGFuYWx5c2lzIGluZm9ybWF0aW9uIG9mIEFuZ3VsYXIgdHlwZXMuXG4gKlxuICogT25jZSBhIGNvbXBpbGF0aW9uIHVuaXQncyBpbmZvcm1hdGlvbiBpcyBmZWQgaW50byB0aGUgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5LCBpdCBjYW4gYmUgYXNrZWQgdG9cbiAqIHByb2R1Y2UgdHJhbnNpdGl2ZSBgQ29tcGlsYXRpb25TY29wZWBzIGZvciBjb21wb25lbnRzLlxuICovXG5leHBvcnQgY2xhc3MgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5IHtcbiAgLyoqXG4gICAqICBNYXAgb2YgbW9kdWxlcyBkZWNsYXJlZCBpbiB0aGUgY3VycmVudCBjb21waWxhdGlvbiB1bml0IHRvIHRoZWlyIChsb2NhbCkgbWV0YWRhdGEuXG4gICAqL1xuICBwcml2YXRlIF9tb2R1bGVUb0RhdGEgPSBuZXcgTWFwPHRzLkNsYXNzRGVjbGFyYXRpb24sIE1vZHVsZURhdGE+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBtb2R1bGVzIHRvIHRoZWlyIGNhY2hlZCBgQ29tcGlsYXRpb25TY29wZWBzLlxuICAgKi9cbiAgcHJpdmF0ZSBfY29tcGlsYXRpb25TY29wZUNhY2hlID0gbmV3IE1hcDx0cy5DbGFzc0RlY2xhcmF0aW9uLCBDb21waWxhdGlvblNjb3BlPFJlZmVyZW5jZT4+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBjb21wb25lbnRzL2RpcmVjdGl2ZXMgdG8gdGhlaXIgc2VsZWN0b3IuXG4gICAqL1xuICBwcml2YXRlIF9kaXJlY3RpdmVUb1NlbGVjdG9yID0gbmV3IE1hcDx0cy5DbGFzc0RlY2xhcmF0aW9uLCBzdHJpbmc+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBwaXBlcyB0byB0aGVpciBuYW1lLlxuICAgKi9cbiAgcHJpdmF0ZSBfcGlwZVRvTmFtZSA9IG5ldyBNYXA8dHMuQ2xhc3NEZWNsYXJhdGlvbiwgc3RyaW5nPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgY29tcG9uZW50cy9kaXJlY3RpdmVzL3BpcGVzIHRvIHRoZWlyIG1vZHVsZS5cbiAgICovXG4gIHByaXZhdGUgX2RlY2xhcmFyZWRUeXBlVG9Nb2R1bGUgPSBuZXcgTWFwPHRzLkNsYXNzRGVjbGFyYXRpb24sIHRzLkNsYXNzRGVjbGFyYXRpb24+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcikge31cblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBtb2R1bGUncyBtZXRhZGF0YSB3aXRoIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyTW9kdWxlKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRhdGE6IE1vZHVsZURhdGEpOiB2b2lkIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkNsYXNzRGVjbGFyYXRpb247XG5cbiAgICBpZiAodGhpcy5fbW9kdWxlVG9EYXRhLmhhcyhub2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNb2R1bGUgYWxyZWFkeSByZWdpc3RlcmVkOiAke25vZGUubmFtZSEudGV4dH1gKTtcbiAgICB9XG4gICAgdGhpcy5fbW9kdWxlVG9EYXRhLnNldChub2RlLCBkYXRhKTtcblxuICAgIC8vIFJlZ2lzdGVyIGFsbCBvZiB0aGUgbW9kdWxlJ3MgZGVjbGFyYXRpb25zIGluIHRoZSBjb250ZXh0IG1hcCBhcyBiZWxvbmdpbmcgdG8gdGhpcyBtb2R1bGUuXG4gICAgZGF0YS5kZWNsYXJhdGlvbnMuZm9yRWFjaChkZWNsID0+IHtcbiAgICAgIHRoaXMuX2RlY2xhcmFyZWRUeXBlVG9Nb2R1bGUuc2V0KHRzLmdldE9yaWdpbmFsTm9kZShkZWNsLm5vZGUpIGFzIHRzLkNsYXNzRGVjbGFyYXRpb24sIG5vZGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHRoZSBzZWxlY3RvciBvZiBhIGNvbXBvbmVudCBvciBkaXJlY3RpdmUgd2l0aCB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3RlclNlbGVjdG9yKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIHNlbGVjdG9yOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkNsYXNzRGVjbGFyYXRpb247XG5cbiAgICBpZiAodGhpcy5fZGlyZWN0aXZlVG9TZWxlY3Rvci5oYXMobm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgU2VsZWN0b3IgYWxyZWFkeSByZWdpc3RlcmVkOiAke25vZGUubmFtZSEudGV4dH0gJHtzZWxlY3Rvcn1gKTtcbiAgICB9XG4gICAgdGhpcy5fZGlyZWN0aXZlVG9TZWxlY3Rvci5zZXQobm9kZSwgc2VsZWN0b3IpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHRoZSBuYW1lIG9mIGEgcGlwZSB3aXRoIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyUGlwZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBuYW1lOiBzdHJpbmcpOiB2b2lkIHsgdGhpcy5fcGlwZVRvTmFtZS5zZXQobm9kZSwgbmFtZSk7IH1cblxuICAvKipcbiAgICogUHJvZHVjZSB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgYSBjb21wb25lbnQsIHdoaWNoIGlzIGRldGVybWluZWQgYnkgdGhlIG1vZHVsZSB0aGF0IGRlY2xhcmVzXG4gICAqIGl0LlxuICAgKi9cbiAgbG9va3VwQ29tcGlsYXRpb25TY29wZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogQ29tcGlsYXRpb25TY29wZTxFeHByZXNzaW9uPnxudWxsIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkNsYXNzRGVjbGFyYXRpb247XG5cbiAgICAvLyBJZiB0aGUgY29tcG9uZW50IGhhcyBubyBhc3NvY2lhdGVkIG1vZHVsZSwgdGhlbiBpdCBoYXMgbm8gY29tcGlsYXRpb24gc2NvcGUuXG4gICAgaWYgKCF0aGlzLl9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlID0gdGhpcy5fZGVjbGFyYXJlZFR5cGVUb01vZHVsZS5nZXQobm9kZSkgITtcblxuICAgIC8vIENvbXBpbGF0aW9uIHNjb3BlIGNvbXB1dGF0aW9uIGlzIHNvbWV3aGF0IGV4cGVuc2l2ZSwgc28gaXQncyBjYWNoZWQuIENoZWNrIHRoZSBjYWNoZSBmb3JcbiAgICAvLyB0aGUgbW9kdWxlLlxuICAgIGlmICh0aGlzLl9jb21waWxhdGlvblNjb3BlQ2FjaGUuaGFzKG1vZHVsZSkpIHtcbiAgICAgIC8vIFRoZSBjb21waWxhdGlvbiBzY29wZSB3YXMgY2FjaGVkLlxuICAgICAgY29uc3Qgc2NvcGUgPSB0aGlzLl9jb21waWxhdGlvblNjb3BlQ2FjaGUuZ2V0KG1vZHVsZSkgITtcblxuICAgICAgLy8gVGhlIHNjb3BlIGFzIGNhY2hlZCBpcyBpbiB0ZXJtcyBvZiBSZWZlcmVuY2VzLCBub3QgRXhwcmVzc2lvbnMuIENvbnZlcnRpbmcgYmV0d2VlbiB0aGVtXG4gICAgICAvLyByZXF1aXJlcyBrbm93bGVkZ2Ugb2YgdGhlIGNvbnRleHQgZmlsZSAoaW4gdGhpcyBjYXNlLCB0aGUgY29tcG9uZW50IG5vZGUncyBzb3VyY2UgZmlsZSkuXG4gICAgICByZXR1cm4gY29udmVydFNjb3BlVG9FeHByZXNzaW9ucyhzY29wZSwgbm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIH1cblxuICAgIC8vIFRoaXMgaXMgdGhlIGZpcnN0IHRpbWUgdGhlIHNjb3BlIGZvciB0aGlzIG1vZHVsZSBpcyBiZWluZyBjb21wdXRlZC5cbiAgICBjb25zdCBkaXJlY3RpdmVzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZT4oKTtcbiAgICBjb25zdCBwaXBlcyA9IG5ldyBNYXA8c3RyaW5nLCBSZWZlcmVuY2U+KCk7XG5cbiAgICAvLyBQcm9jZXNzIHRoZSBkZWNsYXJhdGlvbiBzY29wZSBvZiB0aGUgbW9kdWxlLCBhbmQgbG9va3VwIHRoZSBzZWxlY3RvciBvZiBldmVyeSBkZWNsYXJlZCB0eXBlLlxuICAgIC8vIFRoZSBpbml0aWFsIHZhbHVlIG9mIG5nTW9kdWxlSW1wb3J0ZWRGcm9tIGlzICdudWxsJyB3aGljaCBzaWduaWZpZXMgdGhhdCB0aGUgTmdNb2R1bGVcbiAgICAvLyB3YXMgbm90IGltcG9ydGVkIGZyb20gYSAuZC50cyBzb3VyY2UuXG4gICAgdGhpcy5sb29rdXBTY29wZXMobW9kdWxlICEsIC8qIG5nTW9kdWxlSW1wb3J0ZWRGcm9tICovIG51bGwpLmNvbXBpbGF0aW9uLmZvckVhY2gocmVmID0+IHtcbiAgICAgIGNvbnN0IHNlbGVjdG9yID1cbiAgICAgICAgICB0aGlzLmxvb2t1cERpcmVjdGl2ZVNlbGVjdG9yKHRzLmdldE9yaWdpbmFsTm9kZShyZWYubm9kZSkgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbik7XG4gICAgICAvLyBPbmx5IGRpcmVjdGl2ZXMvY29tcG9uZW50cyB3aXRoIHNlbGVjdG9ycyBnZXQgYWRkZWQgdG8gdGhlIHNjb3BlLlxuICAgICAgaWYgKHNlbGVjdG9yICE9IG51bGwpIHtcbiAgICAgICAgZGlyZWN0aXZlcy5zZXQoc2VsZWN0b3IsIHJlZik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBzY29wZTogQ29tcGlsYXRpb25TY29wZTxSZWZlcmVuY2U+ID0ge2RpcmVjdGl2ZXMsIHBpcGVzfTtcblxuICAgIC8vIE1hbnkgY29tcG9uZW50cyBtYXkgYmUgY29tcGlsZWQgaW4gdGhlIHNhbWUgc2NvcGUsIHNvIGNhY2hlIGl0LlxuICAgIHRoaXMuX2NvbXBpbGF0aW9uU2NvcGVDYWNoZS5zZXQobm9kZSwgc2NvcGUpO1xuXG4gICAgLy8gQ29udmVydCBSZWZlcmVuY2VzIHRvIEV4cHJlc3Npb25zIGluIHRoZSBjb250ZXh0IG9mIHRoZSBjb21wb25lbnQncyBzb3VyY2UgZmlsZS5cbiAgICByZXR1cm4gY29udmVydFNjb3BlVG9FeHByZXNzaW9ucyhzY29wZSwgbm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2t1cCBgU2VsZWN0b3JTY29wZXNgIGZvciBhIGdpdmVuIG1vZHVsZS5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBhc3N1bWVzIHRoYXQgaWYgdGhlIGdpdmVuIG1vZHVsZSB3YXMgaW1wb3J0ZWQgZnJvbSBhbiBhYnNvbHV0ZSBwYXRoXG4gICAqIChgbmdNb2R1bGVJbXBvcnRlZEZyb21gKSB0aGVuIGFsbCBvZiBpdHMgZGVjbGFyYXRpb25zIGFyZSBleHBvcnRlZCBhdCB0aGF0IHNhbWUgcGF0aCwgYXMgd2VsbFxuICAgKiBhcyBpbXBvcnRzIGFuZCBleHBvcnRzIGZyb20gb3RoZXIgbW9kdWxlcyB0aGF0IGFyZSByZWxhdGl2ZWx5IGltcG9ydGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBsb29rdXBTY29wZXMobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgbmdNb2R1bGVJbXBvcnRlZEZyb206IHN0cmluZ3xudWxsKTpcbiAgICAgIFNlbGVjdG9yU2NvcGVzIHtcbiAgICBsZXQgZGF0YTogTW9kdWxlRGF0YXxudWxsID0gbnVsbDtcblxuICAgIC8vIEVpdGhlciB0aGlzIG1vZHVsZSB3YXMgYW5hbHl6ZWQgZGlyZWN0bHksIG9yIGhhcyBhIHByZWNvbXBpbGVkIG5nTW9kdWxlRGVmLlxuICAgIGlmICh0aGlzLl9tb2R1bGVUb0RhdGEuaGFzKG5vZGUpKSB7XG4gICAgICAvLyBUaGUgbW9kdWxlIHdhcyBhbmFseXplZCBiZWZvcmUsIGFuZCB0aHVzIGl0cyBkYXRhIGlzIGF2YWlsYWJsZS5cbiAgICAgIGRhdGEgPSB0aGlzLl9tb2R1bGVUb0RhdGEuZ2V0KG5vZGUpICE7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBtb2R1bGUgd2Fzbid0IGFuYWx5emVkIGJlZm9yZSwgYW5kIHByb2JhYmx5IGhhcyBhIHByZWNvbXBpbGVkIG5nTW9kdWxlRGVmIHdpdGggYSB0eXBlXG4gICAgICAvLyBhbm5vdGF0aW9uIHRoYXQgc3BlY2lmaWVzIHRoZSBuZWVkZWQgbWV0YWRhdGEuXG4gICAgICBpZiAobmdNb2R1bGVJbXBvcnRlZEZyb20gPT09IG51bGwpIHtcbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBoYW5kbGUgaGFuZC1jb21waWxlZCBuZ01vZHVsZURlZiBpbiB0aGUgY3VycmVudCBQcm9ncmFtLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5lZWQgdG8gcmVhZCAuZC50cyBtb2R1bGUgYnV0IG5nTW9kdWxlSW1wb3J0ZWRGcm9tIGlzIHVuc3BlY2lmaWVkYCk7XG4gICAgICB9XG4gICAgICBkYXRhID0gdGhpcy5fcmVhZE1ldGFkYXRhRnJvbUNvbXBpbGVkQ2xhc3Mobm9kZSwgbmdNb2R1bGVJbXBvcnRlZEZyb20pO1xuICAgICAgLy8gTm90ZSB0aGF0IGRhdGEgaGVyZSBjb3VsZCBzdGlsbCBiZSBudWxsLCBpZiB0aGUgY2xhc3MgZGlkbid0IGhhdmUgYSBwcmVjb21waWxlZFxuICAgICAgLy8gbmdNb2R1bGVEZWYuXG4gICAgfVxuXG4gICAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kdWxlIG5vdCByZWdpc3RlcmVkOiAke25vZGUubmFtZSEudGV4dH1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29tcGlsYXRpb246IFtcbiAgICAgICAgLi4uZGF0YS5kZWNsYXJhdGlvbnMsXG4gICAgICAgIC8vIEV4cGFuZCBpbXBvcnRzIHRvIHRoZSBleHBvcnRlZCBzY29wZSBvZiB0aG9zZSBpbXBvcnRzLlxuICAgICAgICAuLi5mbGF0dGVuKGRhdGEuaW1wb3J0cy5tYXAoXG4gICAgICAgICAgICByZWYgPT4gdGhpcy5sb29rdXBTY29wZXMocmVmLm5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbiwgYWJzb2x1dGVNb2R1bGVOYW1lKHJlZikpXG4gICAgICAgICAgICAgICAgICAgICAgIC5leHBvcnRlZCkpLFxuICAgICAgICAvLyBBbmQgaW5jbHVkZSB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgZXhwb3J0ZWQgbW9kdWxlcy5cbiAgICAgICAgLi4uZmxhdHRlbihcbiAgICAgICAgICAgIGRhdGEuZXhwb3J0cy5maWx0ZXIocmVmID0+IHRoaXMuX21vZHVsZVRvRGF0YS5oYXMocmVmLm5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbikpXG4gICAgICAgICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgICAgICAgcmVmID0+XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvb2t1cFNjb3BlcyhyZWYubm9kZSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhYnNvbHV0ZU1vZHVsZU5hbWUocmVmKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZXhwb3J0ZWQpKVxuICAgICAgXSxcbiAgICAgIGV4cG9ydGVkOiBmbGF0dGVuKGRhdGEuZXhwb3J0cy5tYXAocmVmID0+IHtcbiAgICAgICAgaWYgKHRoaXMuX21vZHVsZVRvRGF0YS5oYXMocmVmLm5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5sb29rdXBTY29wZXMocmVmLm5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbiwgYWJzb2x1dGVNb2R1bGVOYW1lKHJlZikpXG4gICAgICAgICAgICAgIC5leHBvcnRlZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gW3JlZl07XG4gICAgICAgIH1cbiAgICAgIH0pKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2t1cCB0aGUgc2VsZWN0b3Igb2YgYSBjb21wb25lbnQgb3IgZGlyZWN0aXZlIGNsYXNzLlxuICAgKlxuICAgKiBQb3RlbnRpYWxseSB0aGlzIGNsYXNzIGlzIGRlY2xhcmVkIGluIGEgLmQudHMgZmlsZSBvciBvdGhlcndpc2UgaGFzIGEgbWFudWFsbHkgY3JlYXRlZFxuICAgKiBuZ0NvbXBvbmVudERlZi9uZ0RpcmVjdGl2ZURlZi4gSW4gdGhpcyBjYXNlLCB0aGUgdHlwZSBtZXRhZGF0YSBvZiB0aGF0IGRlZmluaXRpb24gaXMgcmVhZFxuICAgKiB0byBkZXRlcm1pbmUgdGhlIHNlbGVjdG9yLlxuICAgKi9cbiAgcHJpdmF0ZSBsb29rdXBEaXJlY3RpdmVTZWxlY3Rvcihub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogc3RyaW5nfG51bGwge1xuICAgIGlmICh0aGlzLl9kaXJlY3RpdmVUb1NlbGVjdG9yLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2RpcmVjdGl2ZVRvU2VsZWN0b3IuZ2V0KG5vZGUpICE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLl9yZWFkU2VsZWN0b3JGcm9tQ29tcGlsZWRDbGFzcyhub2RlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGxvb2t1cFBpcGVOYW1lKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBzdHJpbmd8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5fcGlwZVRvTmFtZS5nZXQobm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogUmVhZCB0aGUgbWV0YWRhdGEgZnJvbSBhIGNsYXNzIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBjb21waWxlZCBzb21laG93IChlaXRoZXIgaXQncyBpbiBhIC5kLnRzXG4gICAqIGZpbGUsIG9yIGluIGEgLnRzIGZpbGUgd2l0aCBhIGhhbmR3cml0dGVuIGRlZmluaXRpb24pLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogdGhlIGNsYXNzIG9mIGludGVyZXN0XG4gICAqIEBwYXJhbSBuZ01vZHVsZUltcG9ydGVkRnJvbSBtb2R1bGUgc3BlY2lmaWVyIG9mIHRoZSBpbXBvcnQgcGF0aCB0byBhc3N1bWUgZm9yIGFsbCBkZWNsYXJhdGlvbnNcbiAgICogc3RlbW1pbmcgZnJvbSB0aGlzIG1vZHVsZS5cbiAgICovXG4gIHByaXZhdGUgX3JlYWRNZXRhZGF0YUZyb21Db21waWxlZENsYXNzKGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nKTpcbiAgICAgIE1vZHVsZURhdGF8bnVsbCB7XG4gICAgLy8gVGhpcyBvcGVyYXRpb24gaXMgZXhwbGljaXRseSBub3QgbWVtb2l6ZWQsIGFzIGl0IGRlcGVuZHMgb24gYG5nTW9kdWxlSW1wb3J0ZWRGcm9tYC5cbiAgICAvLyBUT0RPKGFseGh1Yik6IGludmVzdGlnYXRlIGNhY2hpbmcgb2YgLmQudHMgbW9kdWxlIG1ldGFkYXRhLlxuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gcmVmbGVjdFN0YXRpY0ZpZWxkKGNsYXp6LCAnbmdNb2R1bGVEZWYnKTtcbiAgICBpZiAobmdNb2R1bGVEZWYgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIC8vIFZhbGlkYXRlIHRoYXQgdGhlIHNoYXBlIG9mIHRoZSBuZ01vZHVsZURlZiB0eXBlIGlzIGNvcnJlY3QuXG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShuZ01vZHVsZURlZi50eXBlKSB8fFxuICAgICAgICBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoICE9PSA0KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBSZWFkIHRoZSBNb2R1bGVEYXRhIG91dCBvZiB0aGUgdHlwZSBhcmd1bWVudHMuXG4gICAgY29uc3QgW18sIGRlY2xhcmF0aW9uTWV0YWRhdGEsIGltcG9ydE1ldGFkYXRhLCBleHBvcnRNZXRhZGF0YV0gPSBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHM7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRlY2xhcmF0aW9uczogdGhpcy5fZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShkZWNsYXJhdGlvbk1ldGFkYXRhLCBuZ01vZHVsZUltcG9ydGVkRnJvbSksXG4gICAgICBleHBvcnRzOiB0aGlzLl9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKGV4cG9ydE1ldGFkYXRhLCBuZ01vZHVsZUltcG9ydGVkRnJvbSksXG4gICAgICBpbXBvcnRzOiB0aGlzLl9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKGltcG9ydE1ldGFkYXRhLCBuZ01vZHVsZUltcG9ydGVkRnJvbSksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHNlbGVjdG9yIGZyb20gdHlwZSBtZXRhZGF0YSBmb3IgYSBjbGFzcyB3aXRoIGEgcHJlY29tcGlsZWQgbmdDb21wb25lbnREZWYgb3JcbiAgICogbmdEaXJlY3RpdmVEZWYuXG4gICAqL1xuICBwcml2YXRlIF9yZWFkU2VsZWN0b3JGcm9tQ29tcGlsZWRDbGFzcyhjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICBjb25zdCBkZWYgPVxuICAgICAgICByZWZsZWN0U3RhdGljRmllbGQoY2xhenosICduZ0NvbXBvbmVudERlZicpIHx8IHJlZmxlY3RTdGF0aWNGaWVsZChjbGF6eiwgJ25nRGlyZWN0aXZlRGVmJyk7XG4gICAgaWYgKGRlZiA9PT0gbnVsbCkge1xuICAgICAgLy8gTm8gZGVmaW5pdGlvbiBjb3VsZCBiZSBmb3VuZC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIGRlZi50eXBlID09PSB1bmRlZmluZWQgfHwgIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGVmLnR5cGUpIHx8XG4gICAgICAgIGRlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fCBkZWYudHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gMikge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyBzaGFwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB0eXBlID0gZGVmLnR5cGUudHlwZUFyZ3VtZW50c1sxXTtcbiAgICBpZiAoIXRzLmlzTGl0ZXJhbFR5cGVOb2RlKHR5cGUpIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwodHlwZS5saXRlcmFsKSkge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyB0eXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0eXBlLmxpdGVyYWwudGV4dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIGEgYFR5cGVOb2RlYCB3aGljaCBpcyBhIHR1cGxlIG9mIHJlZmVyZW5jZXMgdG8gb3RoZXIgdHlwZXMsIGFuZCByZXR1cm4gYFJlZmVyZW5jZWBzIHRvXG4gICAqIHRoZW0uXG4gICAqXG4gICAqIFRoaXMgb3BlcmF0aW9uIGFzc3VtZXMgdGhhdCB0aGVzZSB0eXBlcyBzaG91bGQgYmUgaW1wb3J0ZWQgZnJvbSBgbmdNb2R1bGVJbXBvcnRlZEZyb21gIHVubGVzc1xuICAgKiB0aGV5IHRoZW1zZWx2ZXMgd2VyZSBpbXBvcnRlZCBmcm9tIGFub3RoZXIgYWJzb2x1dGUgcGF0aC5cbiAgICovXG4gIHByaXZhdGUgX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoZGVmOiB0cy5UeXBlTm9kZSwgbmdNb2R1bGVJbXBvcnRlZEZyb206IHN0cmluZyk6IFJlZmVyZW5jZVtdIHtcbiAgICBpZiAoIXRzLmlzVHVwbGVUeXBlTm9kZShkZWYpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBkZWYuZWxlbWVudFR5cGVzLm1hcChlbGVtZW50ID0+IHtcbiAgICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShlbGVtZW50KSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlYCk7XG4gICAgICB9XG4gICAgICBjb25zdCB0eXBlID0gZWxlbWVudC50eXBlTmFtZTtcbiAgICAgIGNvbnN0IHtub2RlLCBmcm9tfSA9IHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbih0eXBlLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IChmcm9tICE9PSBudWxsICYmICFmcm9tLnN0YXJ0c1dpdGgoJy4nKSA/IGZyb20gOiBuZ01vZHVsZUltcG9ydGVkRnJvbSk7XG4gICAgICBjb25zdCBjbGF6eiA9IG5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICAgIHJldHVybiBuZXcgQWJzb2x1dGVSZWZlcmVuY2Uobm9kZSwgY2xhenoubmFtZSAhLCBtb2R1bGVOYW1lLCBjbGF6ei5uYW1lICEudGV4dCk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmxhdHRlbjxUPihhcnJheTogVFtdW10pOiBUW10ge1xuICByZXR1cm4gYXJyYXkucmVkdWNlKChhY2N1bSwgc3ViQXJyYXkpID0+IHtcbiAgICBhY2N1bS5wdXNoKC4uLnN1YkFycmF5KTtcbiAgICByZXR1cm4gYWNjdW07XG4gIH0sIFtdIGFzIFRbXSk7XG59XG5cbmZ1bmN0aW9uIGFic29sdXRlTW9kdWxlTmFtZShyZWY6IFJlZmVyZW5jZSk6IHN0cmluZ3xudWxsIHtcbiAgY29uc3QgbmFtZSA9IChyZWYubm9kZSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uKS5uYW1lICEudGV4dDtcbiAgaWYgKCEocmVmIGluc3RhbmNlb2YgQWJzb2x1dGVSZWZlcmVuY2UpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHJlZi5tb2R1bGVOYW1lO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0UmVmZXJlbmNlTWFwKFxuICAgIG1hcDogTWFwPHN0cmluZywgUmVmZXJlbmNlPiwgY29udGV4dDogdHMuU291cmNlRmlsZSk6IE1hcDxzdHJpbmcsIEV4cHJlc3Npb24+IHtcbiAgcmV0dXJuIG5ldyBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPihBcnJheS5mcm9tKG1hcC5lbnRyaWVzKCkpLm1hcCgoW3NlbGVjdG9yLCByZWZdKTogW1xuICAgIHN0cmluZywgRXhwcmVzc2lvblxuICBdID0+IFtzZWxlY3RvciwgcmVmZXJlbmNlVG9FeHByZXNzaW9uKHJlZiwgY29udGV4dCldKSk7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRTY29wZVRvRXhwcmVzc2lvbnMoXG4gICAgc2NvcGU6IENvbXBpbGF0aW9uU2NvcGU8UmVmZXJlbmNlPiwgY29udGV4dDogdHMuU291cmNlRmlsZSk6IENvbXBpbGF0aW9uU2NvcGU8RXhwcmVzc2lvbj4ge1xuICBjb25zdCBkaXJlY3RpdmVzID0gY29udmVydFJlZmVyZW5jZU1hcChzY29wZS5kaXJlY3RpdmVzLCBjb250ZXh0KTtcbiAgY29uc3QgcGlwZXMgPSBjb252ZXJ0UmVmZXJlbmNlTWFwKHNjb3BlLnBpcGVzLCBjb250ZXh0KTtcbiAgcmV0dXJuIHtkaXJlY3RpdmVzLCBwaXBlc307XG59XG4iXX0=