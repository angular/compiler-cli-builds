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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/selector_scope", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Registry which records and correlates static analysis information of Angular types.
     *
     * Once a compilation unit's information is fed into the SelectorScopeRegistry, it can be asked to
     * produce transitive `CompilationScope`s for components.
     */
    var SelectorScopeRegistry = /** @class */ (function () {
        function SelectorScopeRegistry(checker, reflector, resolver) {
            this.checker = checker;
            this.reflector = reflector;
            this.resolver = resolver;
            /**
             *  Map of modules declared in the current compilation unit to their (local) metadata.
             */
            this._moduleToData = new Map();
            /**
             * Map of modules to their cached `CompilationScope`s.
             */
            this._compilationScopeCache = new Map();
            /**
             * Map of components/directives to their metadata.
             */
            this._directiveToMetadata = new Map();
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
                throw new Error("Module already registered: " + reflection_1.reflectNameOfDeclaration(node));
            }
            this._moduleToData.set(node, data);
            // Register all of the module's declarations in the context map as belonging to this module.
            data.declarations.forEach(function (decl) {
                _this._declararedTypeToModule.set(ts.getOriginalNode(decl.node), node);
            });
        };
        /**
         * Register the metadata of a component or directive with the registry.
         */
        SelectorScopeRegistry.prototype.registerDirective = function (node, metadata) {
            node = ts.getOriginalNode(node);
            if (this._directiveToMetadata.has(node)) {
                throw new Error("Selector already registered: " + reflection_1.reflectNameOfDeclaration(node) + " " + metadata.selector);
            }
            this._directiveToMetadata.set(node, metadata);
        };
        /**
         * Register the name of a pipe with the registry.
         */
        SelectorScopeRegistry.prototype.registerPipe = function (node, name) {
            node = ts.getOriginalNode(node);
            this._pipeToName.set(node, name);
        };
        SelectorScopeRegistry.prototype.lookupCompilationScopeAsRefs = function (node) {
            var e_1, _a;
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
                return scope_1;
            }
            // This is the first time the scope for this module is being computed.
            var directives = [];
            var pipes = new Map();
            // Tracks which declarations already appear in the `CompilationScope`.
            var seenSet = new Set();
            try {
                // Process the declaration scope of the module, and lookup the selector of every declared type.
                // The initial value of ngModuleImportedFrom is 'null' which signifies that the NgModule
                // was not imported from a .d.ts source.
                for (var _b = tslib_1.__values(this
                    .lookupScopesOrDie(module, /* ngModuleImportedFrom */ null, node.getSourceFile().fileName)
                    .compilation), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var ref = _c.value;
                    var node_1 = ts.getOriginalNode(ref.node);
                    // Track whether this `ts.Declaration` has been seen before.
                    if (seenSet.has(node_1)) {
                        continue;
                    }
                    else {
                        seenSet.add(node_1);
                    }
                    // Either the node represents a directive or a pipe. Look for both.
                    var metadata = this.lookupDirectiveMetadata(ref);
                    // Only directives/components with selectors get added to the scope.
                    if (metadata !== null) {
                        directives.push(tslib_1.__assign({}, metadata, { directive: ref }));
                    }
                    else {
                        var name_1 = this.lookupPipeName(node_1);
                        if (name_1 !== null) {
                            pipes.set(name_1, ref);
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
            var scope = { directives: directives, pipes: pipes };
            // Many components may be compiled in the same scope, so cache it.
            this._compilationScopeCache.set(node, scope);
            // Convert References to Expressions in the context of the component's source file.
            return scope;
        };
        /**
         * Produce the compilation scope of a component, which is determined by the module that declares
         * it.
         */
        SelectorScopeRegistry.prototype.lookupCompilationScope = function (node) {
            var scope = this.lookupCompilationScopeAsRefs(node);
            return scope !== null ? convertScopeToExpressions(scope, node) : null;
        };
        SelectorScopeRegistry.prototype.lookupScopesOrDie = function (node, ngModuleImportedFrom, resolutionContext) {
            var result = this.lookupScopes(node, ngModuleImportedFrom, resolutionContext);
            if (result === null) {
                throw new Error("Module not found: " + reflection_1.reflectNameOfDeclaration(node));
            }
            return result;
        };
        /**
         * Lookup `SelectorScopes` for a given module.
         *
         * This function assumes that if the given module was imported from an absolute path
         * (`ngModuleImportedFrom`) then all of its declarations are exported at that same path, as well
         * as imports and exports from other modules that are relatively imported.
         */
        SelectorScopeRegistry.prototype.lookupScopes = function (node, ngModuleImportedFrom, resolutionContext) {
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
                data = this._readModuleDataFromCompiledClass(node, ngModuleImportedFrom, resolutionContext);
                // Note that data here could still be null, if the class didn't have a precompiled
                // ngModuleDef.
            }
            if (data === null) {
                return null;
            }
            var context = node.getSourceFile().fileName;
            return {
                compilation: tslib_1.__spread(data.declarations, flatten(data.imports.map(function (ref) {
                    return _this.lookupScopesOrDie(ref.node, absoluteModuleName(ref), context)
                        .exported;
                })), flatten(data.exports
                    .map(function (ref) { return _this.lookupScopes(ref.node, absoluteModuleName(ref), context); })
                    .filter(function (scope) { return scope !== null; })
                    .map(function (scope) { return scope.exported; }))),
                exported: flatten(data.exports.map(function (ref) {
                    var scope = _this.lookupScopes(ref.node, absoluteModuleName(ref), context);
                    if (scope !== null) {
                        return scope.exported;
                    }
                    else {
                        return [ref];
                    }
                })),
            };
        };
        /**
         * Lookup the metadata of a component or directive class.
         *
         * Potentially this class is declared in a .d.ts file or otherwise has a manually created
         * ngComponentDef/ngDirectiveDef. In this case, the type metadata of that definition is read
         * to determine the metadata.
         */
        SelectorScopeRegistry.prototype.lookupDirectiveMetadata = function (ref) {
            var node = ts.getOriginalNode(ref.node);
            if (this._directiveToMetadata.has(node)) {
                return this._directiveToMetadata.get(node);
            }
            else {
                return this._readMetadataFromCompiledClass(ref);
            }
        };
        SelectorScopeRegistry.prototype.lookupPipeName = function (node) {
            if (this._pipeToName.has(node)) {
                return this._pipeToName.get(node);
            }
            else {
                return this._readNameFromCompiledClass(node);
            }
        };
        /**
         * Read the metadata from a class that has already been compiled somehow (either it's in a .d.ts
         * file, or in a .ts file with a handwritten definition).
         *
         * @param clazz the class of interest
         * @param ngModuleImportedFrom module specifier of the import path to assume for all declarations
         * stemming from this module.
         */
        SelectorScopeRegistry.prototype._readModuleDataFromCompiledClass = function (clazz, ngModuleImportedFrom, resolutionContext) {
            // This operation is explicitly not memoized, as it depends on `ngModuleImportedFrom`.
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
                declarations: this._extractReferencesFromType(declarationMetadata, ngModuleImportedFrom, resolutionContext),
                exports: this._extractReferencesFromType(exportMetadata, ngModuleImportedFrom, resolutionContext),
                imports: this._extractReferencesFromType(importMetadata, ngModuleImportedFrom, resolutionContext),
            };
        };
        /**
         * Get the selector from type metadata for a class with a precompiled ngComponentDef or
         * ngDirectiveDef.
         */
        SelectorScopeRegistry.prototype._readMetadataFromCompiledClass = function (ref) {
            var clazz = ts.getOriginalNode(ref.node);
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
            var selector = readStringType(def.type.typeArguments[1]);
            if (selector === null) {
                return null;
            }
            return tslib_1.__assign({ ref: ref, name: clazz.name.text, directive: ref, isComponent: def.name === 'ngComponentDef', selector: selector, exportAs: readStringArrayType(def.type.typeArguments[2]), inputs: readStringMapType(def.type.typeArguments[3]), outputs: readStringMapType(def.type.typeArguments[4]), queries: readStringArrayType(def.type.typeArguments[5]) }, util_1.extractDirectiveGuards(clazz, this.reflector));
        };
        /**
         * Get the selector from type metadata for a class with a precompiled ngComponentDef or
         * ngDirectiveDef.
         */
        SelectorScopeRegistry.prototype._readNameFromCompiledClass = function (clazz) {
            var def = this.reflector.getMembersOfClass(clazz).find(function (field) { return field.isStatic && field.name === 'ngPipeDef'; });
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
            return type.literal.text;
        };
        /**
         * Process a `TypeNode` which is a tuple of references to other types, and return `Reference`s to
         * them.
         *
         * This operation assumes that these types should be imported from `ngModuleImportedFrom` unless
         * they themselves were imported from another absolute path.
         */
        SelectorScopeRegistry.prototype._extractReferencesFromType = function (def, ngModuleImportedFrom, resolutionContext) {
            var _this = this;
            if (!ts.isTupleTypeNode(def)) {
                return [];
            }
            return def.elementTypes.map(function (element) {
                if (!ts.isTypeQueryNode(element)) {
                    throw new Error("Expected TypeQueryNode");
                }
                var type = element.exprName;
                if (ngModuleImportedFrom !== null) {
                    var _a = reflection_1.reflectTypeEntityToDeclaration(type, _this.checker), node = _a.node, from = _a.from;
                    var moduleName = (from !== null && !from.startsWith('.') ? from : ngModuleImportedFrom);
                    return _this.resolver.resolve(node, moduleName, resolutionContext);
                }
                else {
                    var node = reflection_1.reflectTypeEntityToDeclaration(type, _this.checker).node;
                    return _this.resolver.resolve(node, null, resolutionContext);
                }
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
        if (!(ref instanceof imports_1.AbsoluteReference)) {
            return null;
        }
        return ref.moduleName;
    }
    function convertDirectiveReferenceList(input, context) {
        return input.map(function (meta) {
            var directive = meta.directive.toExpression(context);
            if (directive === null) {
                throw new Error("Could not write expression to reference " + meta.directive.node);
            }
            return tslib_1.__assign({}, meta, { directive: directive });
        });
    }
    function convertPipeReferenceMap(map, context) {
        var newMap = new Map();
        map.forEach(function (meta, selector) {
            var pipe = meta.toExpression(context);
            if (pipe === null) {
                throw new Error("Could not write expression to reference " + meta.node);
            }
            newMap.set(selector, pipe);
        });
        return newMap;
    }
    function convertScopeToExpressions(scope, context) {
        var sourceContext = ts.getOriginalNode(context).getSourceFile();
        var directives = convertDirectiveReferenceList(scope.directives, sourceContext);
        var pipes = convertPipeReferenceMap(scope.pipes, sourceContext);
        var declPointer = maybeUnwrapNameOfDeclaration(context);
        var containsForwardDecls = false;
        directives.forEach(function (meta) {
            containsForwardDecls = containsForwardDecls ||
                isExpressionForwardReference(meta.directive, declPointer, sourceContext);
        });
        !containsForwardDecls && pipes.forEach(function (expr) {
            containsForwardDecls =
                containsForwardDecls || isExpressionForwardReference(expr, declPointer, sourceContext);
        });
        return { directives: directives, pipes: pipes, containsForwardDecls: containsForwardDecls };
    }
    function isExpressionForwardReference(expr, context, contextSource) {
        if (isWrappedTsNodeExpr(expr)) {
            var node = ts.getOriginalNode(expr.node);
            return node.getSourceFile() === contextSource && context.pos < node.pos;
        }
        return false;
    }
    function isWrappedTsNodeExpr(expr) {
        return expr instanceof compiler_1.WrappedNodeExpr;
    }
    function maybeUnwrapNameOfDeclaration(decl) {
        if ((ts.isClassDeclaration(decl) || ts.isVariableDeclaration(decl)) && decl.name !== undefined &&
            ts.isIdentifier(decl.name)) {
            return decl.name;
        }
        return decl;
    }
    function readStringType(type) {
        if (!ts.isLiteralTypeNode(type) || !ts.isStringLiteral(type.literal)) {
            return null;
        }
        return type.literal.text;
    }
    function readStringMapType(type) {
        if (!ts.isTypeLiteralNode(type)) {
            return {};
        }
        var obj = {};
        type.members.forEach(function (member) {
            if (!ts.isPropertySignature(member) || member.type === undefined || member.name === undefined ||
                !ts.isStringLiteral(member.name)) {
                return;
            }
            var value = readStringType(member.type);
            if (value === null) {
                return null;
            }
            obj[member.name.text] = value;
        });
        return obj;
    }
    function readStringArrayType(type) {
        if (!ts.isTupleTypeNode(type)) {
            return [];
        }
        var res = [];
        type.elementTypes.forEach(function (el) {
            if (!ts.isLiteralTypeNode(el) || !ts.isStringLiteral(el.literal)) {
                return;
            }
            res.push(el.literal.text);
        });
        return res;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0b3Jfc2NvcGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9zZWxlY3Rvcl9zY29wZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBOEQ7SUFDOUQsK0JBQWlDO0lBRWpDLG1FQUFpRztJQUNqRyx5RUFBMEk7SUFHMUksNkVBQThDO0lBNEM5Qzs7Ozs7T0FLRztJQUNIO1FBMEJFLCtCQUNZLE9BQXVCLEVBQVUsU0FBeUIsRUFDMUQsUUFBMkI7WUFEM0IsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMxRCxhQUFRLEdBQVIsUUFBUSxDQUFtQjtZQTNCdkM7O2VBRUc7WUFDSyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1lBRTlEOztlQUVHO1lBQ0ssMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQStDLENBQUM7WUFFeEY7O2VBRUc7WUFDSyx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBNkMsQ0FBQztZQUVwRjs7ZUFFRztZQUNLLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7WUFFeEQ7O2VBRUc7WUFDSyw0QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQztRQUlsQyxDQUFDO1FBRTNDOztXQUVHO1FBQ0gsOENBQWMsR0FBZCxVQUFlLElBQW9CLEVBQUUsSUFBZ0I7WUFBckQsaUJBWUM7WUFYQyxJQUFJLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQW1CLENBQUM7WUFFbEQsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FBOEIscUNBQXdCLENBQUMsSUFBSSxD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LENBQUM7U0FDWDtRQUNELElBQU0sR0FBRyxHQUFhLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxVQUFBLEVBQUU7WUFDMUIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNoRSxPQUFPO2FBQ1I7WUFDRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZVJlZmVyZW5jZSwgUmVmZXJlbmNlLCBSZWZlcmVuY2VSZXNvbHZlciwgUmVzb2x2ZWRSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdElkZW50aWZpZXJPZkRlY2xhcmF0aW9uLCByZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24sIHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge1R5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfSBmcm9tICcuLi8uLi90eXBlY2hlY2snO1xuXG5pbXBvcnQge2V4dHJhY3REaXJlY3RpdmVHdWFyZHN9IGZyb20gJy4vdXRpbCc7XG5cblxuLyoqXG4gKiBNZXRhZGF0YSBleHRyYWN0ZWQgZm9yIGEgZ2l2ZW4gTmdNb2R1bGUgdGhhdCBjYW4gYmUgdXNlZCB0byBjb21wdXRlIHNlbGVjdG9yIHNjb3Blcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNb2R1bGVEYXRhIHtcbiAgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W107XG4gIGltcG9ydHM6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXTtcbiAgZXhwb3J0czogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdO1xufVxuXG4vKipcbiAqIFRyYW5zaXRpdmVseSBleHBhbmRlZCBtYXBzIG9mIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHZpc2libGUgdG8gYSBjb21wb25lbnQgYmVpbmcgY29tcGlsZWQgaW4gdGhlXG4gKiBjb250ZXh0IG9mIHNvbWUgbW9kdWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGF0aW9uU2NvcGU8VD4ge1xuICBkaXJlY3RpdmVzOiBTY29wZURpcmVjdGl2ZTxUPltdO1xuICBwaXBlczogTWFwPHN0cmluZywgVD47XG4gIGNvbnRhaW5zRm9yd2FyZERlY2xzPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTY29wZURpcmVjdGl2ZTxUPiBleHRlbmRzIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhIHtcbiAgc2VsZWN0b3I6IHN0cmluZztcbiAgZGlyZWN0aXZlOiBUO1xufVxuXG4vKipcbiAqIEJvdGggdHJhbnNpdGl2ZWx5IGV4cGFuZGVkIHNjb3BlcyBmb3IgYSBnaXZlbiBOZ01vZHVsZS5cbiAqL1xuaW50ZXJmYWNlIFNlbGVjdG9yU2NvcGVzIHtcbiAgLyoqXG4gICAqIFNldCBvZiBjb21wb25lbnRzLCBkaXJlY3RpdmVzLCBhbmQgcGlwZXMgdmlzaWJsZSB0byBhbGwgY29tcG9uZW50cyBiZWluZyBjb21waWxlZCBpbiB0aGVcbiAgICogY29udGV4dCBvZiBzb21lIG1vZHVsZS5cbiAgICovXG4gIGNvbXBpbGF0aW9uOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W107XG5cbiAgLyoqXG4gICAqIFNldCBvZiBjb21wb25lbnRzLCBkaXJlY3RpdmVzLCBhbmQgcGlwZXMgYWRkZWQgdG8gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGFueSBtb2R1bGUgaW1wb3J0aW5nXG4gICAqIHNvbWUgbW9kdWxlLlxuICAgKi9cbiAgZXhwb3J0ZWQ6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXTtcbn1cblxuLyoqXG4gKiBSZWdpc3RyeSB3aGljaCByZWNvcmRzIGFuZCBjb3JyZWxhdGVzIHN0YXRpYyBhbmFseXNpcyBpbmZvcm1hdGlvbiBvZiBBbmd1bGFyIHR5cGVzLlxuICpcbiAqIE9uY2UgYSBjb21waWxhdGlvbiB1bml0J3MgaW5mb3JtYXRpb24gaXMgZmVkIGludG8gdGhlIFNlbGVjdG9yU2NvcGVSZWdpc3RyeSwgaXQgY2FuIGJlIGFza2VkIHRvXG4gKiBwcm9kdWNlIHRyYW5zaXRpdmUgYENvbXBpbGF0aW9uU2NvcGVgcyBmb3IgY29tcG9uZW50cy5cbiAqL1xuZXhwb3J0IGNsYXNzIFNlbGVjdG9yU2NvcGVSZWdpc3RyeSB7XG4gIC8qKlxuICAgKiAgTWFwIG9mIG1vZHVsZXMgZGVjbGFyZWQgaW4gdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gdW5pdCB0byB0aGVpciAobG9jYWwpIG1ldGFkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBfbW9kdWxlVG9EYXRhID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgTW9kdWxlRGF0YT4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIG1vZHVsZXMgdG8gdGhlaXIgY2FjaGVkIGBDb21waWxhdGlvblNjb3BlYHMuXG4gICAqL1xuICBwcml2YXRlIF9jb21waWxhdGlvblNjb3BlQ2FjaGUgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBDb21waWxhdGlvblNjb3BlPFJlZmVyZW5jZT4+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBjb21wb25lbnRzL2RpcmVjdGl2ZXMgdG8gdGhlaXIgbWV0YWRhdGEuXG4gICAqL1xuICBwcml2YXRlIF9kaXJlY3RpdmVUb01ldGFkYXRhID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgU2NvcGVEaXJlY3RpdmU8UmVmZXJlbmNlPj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIHBpcGVzIHRvIHRoZWlyIG5hbWUuXG4gICAqL1xuICBwcml2YXRlIF9waXBlVG9OYW1lID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgc3RyaW5nPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgY29tcG9uZW50cy9kaXJlY3RpdmVzL3BpcGVzIHRvIHRoZWlyIG1vZHVsZS5cbiAgICovXG4gIHByaXZhdGUgX2RlY2xhcmFyZWRUeXBlVG9Nb2R1bGUgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCB0cy5EZWNsYXJhdGlvbj4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgcmVzb2x2ZXI6IFJlZmVyZW5jZVJlc29sdmVyKSB7fVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIG1vZHVsZSdzIG1ldGFkYXRhIHdpdGggdGhlIHJlZ2lzdHJ5LlxuICAgKi9cbiAgcmVnaXN0ZXJNb2R1bGUobm9kZTogdHMuRGVjbGFyYXRpb24sIGRhdGE6IE1vZHVsZURhdGEpOiB2b2lkIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgaWYgKHRoaXMuX21vZHVsZVRvRGF0YS5oYXMobm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kdWxlIGFscmVhZHkgcmVnaXN0ZXJlZDogJHtyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24obm9kZSl9YCk7XG4gICAgfVxuICAgIHRoaXMuX21vZHVsZVRvRGF0YS5zZXQobm9kZSwgZGF0YSk7XG5cbiAgICAvLyBSZWdpc3RlciBhbGwgb2YgdGhlIG1vZHVsZSdzIGRlY2xhcmF0aW9ucyBpbiB0aGUgY29udGV4dCBtYXAgYXMgYmVsb25naW5nIHRvIHRoaXMgbW9kdWxlLlxuICAgIGRhdGEuZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbCA9PiB7XG4gICAgICB0aGlzLl9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlLnNldCh0cy5nZXRPcmlnaW5hbE5vZGUoZGVjbC5ub2RlKSBhcyB0cy5EZWNsYXJhdGlvbiwgbm9kZSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgdGhlIG1ldGFkYXRhIG9mIGEgY29tcG9uZW50IG9yIGRpcmVjdGl2ZSB3aXRoIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyRGlyZWN0aXZlKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBtZXRhZGF0YTogU2NvcGVEaXJlY3RpdmU8UmVmZXJlbmNlPik6IHZvaWQge1xuICAgIG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICBpZiAodGhpcy5fZGlyZWN0aXZlVG9NZXRhZGF0YS5oYXMobm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgU2VsZWN0b3IgYWxyZWFkeSByZWdpc3RlcmVkOiAke3JlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbihub2RlKX0gJHttZXRhZGF0YS5zZWxlY3Rvcn1gKTtcbiAgICB9XG4gICAgdGhpcy5fZGlyZWN0aXZlVG9NZXRhZGF0YS5zZXQobm9kZSwgbWV0YWRhdGEpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHRoZSBuYW1lIG9mIGEgcGlwZSB3aXRoIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyUGlwZShub2RlOiB0cy5EZWNsYXJhdGlvbiwgbmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgIHRoaXMuX3BpcGVUb05hbWUuc2V0KG5vZGUsIG5hbWUpO1xuICB9XG5cbiAgbG9va3VwQ29tcGlsYXRpb25TY29wZUFzUmVmcyhub2RlOiB0cy5EZWNsYXJhdGlvbik6IENvbXBpbGF0aW9uU2NvcGU8UmVmZXJlbmNlPnxudWxsIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgLy8gSWYgdGhlIGNvbXBvbmVudCBoYXMgbm8gYXNzb2NpYXRlZCBtb2R1bGUsIHRoZW4gaXQgaGFzIG5vIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGlmICghdGhpcy5fZGVjbGFyYXJlZFR5cGVUb01vZHVsZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZSA9IHRoaXMuX2RlY2xhcmFyZWRUeXBlVG9Nb2R1bGUuZ2V0KG5vZGUpICE7XG5cbiAgICAvLyBDb21waWxhdGlvbiBzY29wZSBjb21wdXRhdGlvbiBpcyBzb21ld2hhdCBleHBlbnNpdmUsIHNvIGl0J3MgY2FjaGVkLiBDaGVjayB0aGUgY2FjaGUgZm9yXG4gICAgLy8gdGhlIG1vZHVsZS5cbiAgICBpZiAodGhpcy5fY29tcGlsYXRpb25TY29wZUNhY2hlLmhhcyhtb2R1bGUpKSB7XG4gICAgICAvLyBUaGUgY29tcGlsYXRpb24gc2NvcGUgd2FzIGNhY2hlZC5cbiAgICAgIGNvbnN0IHNjb3BlID0gdGhpcy5fY29tcGlsYXRpb25TY29wZUNhY2hlLmdldChtb2R1bGUpICE7XG5cbiAgICAgIC8vIFRoZSBzY29wZSBhcyBjYWNoZWQgaXMgaW4gdGVybXMgb2YgUmVmZXJlbmNlcywgbm90IEV4cHJlc3Npb25zLiBDb252ZXJ0aW5nIGJldHdlZW4gdGhlbVxuICAgICAgLy8gcmVxdWlyZXMga25vd2xlZGdlIG9mIHRoZSBjb250ZXh0IGZpbGUgKGluIHRoaXMgY2FzZSwgdGhlIGNvbXBvbmVudCBub2RlJ3Mgc291cmNlIGZpbGUpLlxuICAgICAgcmV0dXJuIHNjb3BlO1xuICAgIH1cblxuICAgIC8vIFRoaXMgaXMgdGhlIGZpcnN0IHRpbWUgdGhlIHNjb3BlIGZvciB0aGlzIG1vZHVsZSBpcyBiZWluZyBjb21wdXRlZC5cbiAgICBjb25zdCBkaXJlY3RpdmVzOiBTY29wZURpcmVjdGl2ZTxSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+PltdID0gW107XG4gICAgY29uc3QgcGlwZXMgPSBuZXcgTWFwPHN0cmluZywgUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPj4oKTtcblxuICAgIC8vIFRyYWNrcyB3aGljaCBkZWNsYXJhdGlvbnMgYWxyZWFkeSBhcHBlYXIgaW4gdGhlIGBDb21waWxhdGlvblNjb3BlYC5cbiAgICBjb25zdCBzZWVuU2V0ID0gbmV3IFNldDx0cy5EZWNsYXJhdGlvbj4oKTtcblxuICAgIC8vIFByb2Nlc3MgdGhlIGRlY2xhcmF0aW9uIHNjb3BlIG9mIHRoZSBtb2R1bGUsIGFuZCBsb29rdXAgdGhlIHNlbGVjdG9yIG9mIGV2ZXJ5IGRlY2xhcmVkIHR5cGUuXG4gICAgLy8gVGhlIGluaXRpYWwgdmFsdWUgb2YgbmdNb2R1bGVJbXBvcnRlZEZyb20gaXMgJ251bGwnIHdoaWNoIHNpZ25pZmllcyB0aGF0IHRoZSBOZ01vZHVsZVxuICAgIC8vIHdhcyBub3QgaW1wb3J0ZWQgZnJvbSBhIC5kLnRzIHNvdXJjZS5cbiAgICBmb3IgKGNvbnN0IHJlZiBvZiB0aGlzXG4gICAgICAgICAgICAgLmxvb2t1cFNjb3Blc09yRGllKFxuICAgICAgICAgICAgICAgICBtb2R1bGUgISwgLyogbmdNb2R1bGVJbXBvcnRlZEZyb20gKi8gbnVsbCwgbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUpXG4gICAgICAgICAgICAgLmNvbXBpbGF0aW9uKSB7XG4gICAgICBjb25zdCBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKHJlZi5ub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgICAgLy8gVHJhY2sgd2hldGhlciB0aGlzIGB0cy5EZWNsYXJhdGlvbmAgaGFzIGJlZW4gc2VlbiBiZWZvcmUuXG4gICAgICBpZiAoc2VlblNldC5oYXMobm9kZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWVuU2V0LmFkZChub2RlKTtcbiAgICAgIH1cblxuICAgICAgLy8gRWl0aGVyIHRoZSBub2RlIHJlcHJlc2VudHMgYSBkaXJlY3RpdmUgb3IgYSBwaXBlLiBMb29rIGZvciBib3RoLlxuICAgICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLmxvb2t1cERpcmVjdGl2ZU1ldGFkYXRhKHJlZik7XG4gICAgICAvLyBPbmx5IGRpcmVjdGl2ZXMvY29tcG9uZW50cyB3aXRoIHNlbGVjdG9ycyBnZXQgYWRkZWQgdG8gdGhlIHNjb3BlLlxuICAgICAgaWYgKG1ldGFkYXRhICE9PSBudWxsKSB7XG4gICAgICAgIGRpcmVjdGl2ZXMucHVzaCh7Li4ubWV0YWRhdGEsIGRpcmVjdGl2ZTogcmVmfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5sb29rdXBQaXBlTmFtZShub2RlKTtcbiAgICAgICAgaWYgKG5hbWUgIT09IG51bGwpIHtcbiAgICAgICAgICBwaXBlcy5zZXQobmFtZSwgcmVmKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHNjb3BlOiBDb21waWxhdGlvblNjb3BlPFJlZmVyZW5jZT4gPSB7ZGlyZWN0aXZlcywgcGlwZXN9O1xuXG4gICAgLy8gTWFueSBjb21wb25lbnRzIG1heSBiZSBjb21waWxlZCBpbiB0aGUgc2FtZSBzY29wZSwgc28gY2FjaGUgaXQuXG4gICAgdGhpcy5fY29tcGlsYXRpb25TY29wZUNhY2hlLnNldChub2RlLCBzY29wZSk7XG5cbiAgICAvLyBDb252ZXJ0IFJlZmVyZW5jZXMgdG8gRXhwcmVzc2lvbnMgaW4gdGhlIGNvbnRleHQgb2YgdGhlIGNvbXBvbmVudCdzIHNvdXJjZSBmaWxlLlxuICAgIHJldHVybiBzY29wZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9kdWNlIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBhIGNvbXBvbmVudCwgd2hpY2ggaXMgZGV0ZXJtaW5lZCBieSB0aGUgbW9kdWxlIHRoYXQgZGVjbGFyZXNcbiAgICogaXQuXG4gICAqL1xuICBsb29rdXBDb21waWxhdGlvblNjb3BlKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogQ29tcGlsYXRpb25TY29wZTxFeHByZXNzaW9uPnxudWxsIHtcbiAgICBjb25zdCBzY29wZSA9IHRoaXMubG9va3VwQ29tcGlsYXRpb25TY29wZUFzUmVmcyhub2RlKTtcbiAgICByZXR1cm4gc2NvcGUgIT09IG51bGwgPyBjb252ZXJ0U2NvcGVUb0V4cHJlc3Npb25zKHNjb3BlLCBub2RlKSA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGxvb2t1cFNjb3Blc09yRGllKFxuICAgICAgbm9kZTogdHMuRGVjbGFyYXRpb24sIG5nTW9kdWxlSW1wb3J0ZWRGcm9tOiBzdHJpbmd8bnVsbCxcbiAgICAgIHJlc29sdXRpb25Db250ZXh0OiBzdHJpbmcpOiBTZWxlY3RvclNjb3BlcyB7XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5sb29rdXBTY29wZXMobm9kZSwgbmdNb2R1bGVJbXBvcnRlZEZyb20sIHJlc29sdXRpb25Db250ZXh0KTtcbiAgICBpZiAocmVzdWx0ID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1vZHVsZSBub3QgZm91bmQ6ICR7cmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKG5vZGUpfWApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2t1cCBgU2VsZWN0b3JTY29wZXNgIGZvciBhIGdpdmVuIG1vZHVsZS5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBhc3N1bWVzIHRoYXQgaWYgdGhlIGdpdmVuIG1vZHVsZSB3YXMgaW1wb3J0ZWQgZnJvbSBhbiBhYnNvbHV0ZSBwYXRoXG4gICAqIChgbmdNb2R1bGVJbXBvcnRlZEZyb21gKSB0aGVuIGFsbCBvZiBpdHMgZGVjbGFyYXRpb25zIGFyZSBleHBvcnRlZCBhdCB0aGF0IHNhbWUgcGF0aCwgYXMgd2VsbFxuICAgKiBhcyBpbXBvcnRzIGFuZCBleHBvcnRzIGZyb20gb3RoZXIgbW9kdWxlcyB0aGF0IGFyZSByZWxhdGl2ZWx5IGltcG9ydGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBsb29rdXBTY29wZXMoXG4gICAgICBub2RlOiB0cy5EZWNsYXJhdGlvbiwgbmdNb2R1bGVJbXBvcnRlZEZyb206IHN0cmluZ3xudWxsLFxuICAgICAgcmVzb2x1dGlvbkNvbnRleHQ6IHN0cmluZyk6IFNlbGVjdG9yU2NvcGVzfG51bGwge1xuICAgIGxldCBkYXRhOiBNb2R1bGVEYXRhfG51bGwgPSBudWxsO1xuXG4gICAgLy8gRWl0aGVyIHRoaXMgbW9kdWxlIHdhcyBhbmFseXplZCBkaXJlY3RseSwgb3IgaGFzIGEgcHJlY29tcGlsZWQgbmdNb2R1bGVEZWYuXG4gICAgaWYgKHRoaXMuX21vZHVsZVRvRGF0YS5oYXMobm9kZSkpIHtcbiAgICAgIC8vIFRoZSBtb2R1bGUgd2FzIGFuYWx5emVkIGJlZm9yZSwgYW5kIHRodXMgaXRzIGRhdGEgaXMgYXZhaWxhYmxlLlxuICAgICAgZGF0YSA9IHRoaXMuX21vZHVsZVRvRGF0YS5nZXQobm9kZSkgITtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIG1vZHVsZSB3YXNuJ3QgYW5hbHl6ZWQgYmVmb3JlLCBhbmQgcHJvYmFibHkgaGFzIGEgcHJlY29tcGlsZWQgbmdNb2R1bGVEZWYgd2l0aCBhIHR5cGVcbiAgICAgIC8vIGFubm90YXRpb24gdGhhdCBzcGVjaWZpZXMgdGhlIG5lZWRlZCBtZXRhZGF0YS5cbiAgICAgIGRhdGEgPSB0aGlzLl9yZWFkTW9kdWxlRGF0YUZyb21Db21waWxlZENsYXNzKG5vZGUsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tLCByZXNvbHV0aW9uQ29udGV4dCk7XG4gICAgICAvLyBOb3RlIHRoYXQgZGF0YSBoZXJlIGNvdWxkIHN0aWxsIGJlIG51bGwsIGlmIHRoZSBjbGFzcyBkaWRuJ3QgaGF2ZSBhIHByZWNvbXBpbGVkXG4gICAgICAvLyBuZ01vZHVsZURlZi5cbiAgICB9XG5cbiAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgY29udGV4dCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbXBpbGF0aW9uOiBbXG4gICAgICAgIC4uLmRhdGEuZGVjbGFyYXRpb25zLFxuICAgICAgICAvLyBFeHBhbmQgaW1wb3J0cyB0byB0aGUgZXhwb3J0ZWQgc2NvcGUgb2YgdGhvc2UgaW1wb3J0cy5cbiAgICAgICAgLi4uZmxhdHRlbihkYXRhLmltcG9ydHMubWFwKFxuICAgICAgICAgICAgcmVmID0+XG4gICAgICAgICAgICAgICAgdGhpcy5sb29rdXBTY29wZXNPckRpZShyZWYubm9kZSBhcyB0cy5EZWNsYXJhdGlvbiwgYWJzb2x1dGVNb2R1bGVOYW1lKHJlZiksIGNvbnRleHQpXG4gICAgICAgICAgICAgICAgICAgIC5leHBvcnRlZCkpLFxuICAgICAgICAvLyBBbmQgaW5jbHVkZSB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgZXhwb3J0ZWQgbW9kdWxlcy5cbiAgICAgICAgLi4uZmxhdHRlbihcbiAgICAgICAgICAgIGRhdGEuZXhwb3J0c1xuICAgICAgICAgICAgICAgIC5tYXAoXG4gICAgICAgICAgICAgICAgICAgIHJlZiA9PiB0aGlzLmxvb2t1cFNjb3BlcyhcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZi5ub2RlIGFzIHRzLkRlY2xhcmF0aW9uLCBhYnNvbHV0ZU1vZHVsZU5hbWUocmVmKSwgY29udGV4dCkpXG4gICAgICAgICAgICAgICAgLmZpbHRlcigoc2NvcGU6IFNlbGVjdG9yU2NvcGVzIHwgbnVsbCk6IHNjb3BlIGlzIFNlbGVjdG9yU2NvcGVzID0+IHNjb3BlICE9PSBudWxsKVxuICAgICAgICAgICAgICAgIC5tYXAoc2NvcGUgPT4gc2NvcGUuZXhwb3J0ZWQpKVxuICAgICAgXSxcbiAgICAgIGV4cG9ydGVkOiBmbGF0dGVuKGRhdGEuZXhwb3J0cy5tYXAocmVmID0+IHtcbiAgICAgICAgY29uc3Qgc2NvcGUgPVxuICAgICAgICAgICAgdGhpcy5sb29rdXBTY29wZXMocmVmLm5vZGUgYXMgdHMuRGVjbGFyYXRpb24sIGFic29sdXRlTW9kdWxlTmFtZShyZWYpLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHNjb3BlLmV4cG9ydGVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBbcmVmXTtcbiAgICAgICAgfVxuICAgICAgfSkpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTG9va3VwIHRoZSBtZXRhZGF0YSBvZiBhIGNvbXBvbmVudCBvciBkaXJlY3RpdmUgY2xhc3MuXG4gICAqXG4gICAqIFBvdGVudGlhbGx5IHRoaXMgY2xhc3MgaXMgZGVjbGFyZWQgaW4gYSAuZC50cyBmaWxlIG9yIG90aGVyd2lzZSBoYXMgYSBtYW51YWxseSBjcmVhdGVkXG4gICAqIG5nQ29tcG9uZW50RGVmL25nRGlyZWN0aXZlRGVmLiBJbiB0aGlzIGNhc2UsIHRoZSB0eXBlIG1ldGFkYXRhIG9mIHRoYXQgZGVmaW5pdGlvbiBpcyByZWFkXG4gICAqIHRvIGRldGVybWluZSB0aGUgbWV0YWRhdGEuXG4gICAqL1xuICBwcml2YXRlIGxvb2t1cERpcmVjdGl2ZU1ldGFkYXRhKHJlZjogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPik6IFNjb3BlRGlyZWN0aXZlPFJlZmVyZW5jZT58bnVsbCB7XG4gICAgY29uc3Qgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShyZWYubm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG4gICAgaWYgKHRoaXMuX2RpcmVjdGl2ZVRvTWV0YWRhdGEuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZGlyZWN0aXZlVG9NZXRhZGF0YS5nZXQobm9kZSkgITtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3JlYWRNZXRhZGF0YUZyb21Db21waWxlZENsYXNzKHJlZiBhcyBSZWZlcmVuY2U8dHMuQ2xhc3NEZWNsYXJhdGlvbj4pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbG9va3VwUGlwZU5hbWUobm9kZTogdHMuRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKHRoaXMuX3BpcGVUb05hbWUuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGlwZVRvTmFtZS5nZXQobm9kZSkgITtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3JlYWROYW1lRnJvbUNvbXBpbGVkQ2xhc3Mobm9kZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlYWQgdGhlIG1ldGFkYXRhIGZyb20gYSBjbGFzcyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gY29tcGlsZWQgc29tZWhvdyAoZWl0aGVyIGl0J3MgaW4gYSAuZC50c1xuICAgKiBmaWxlLCBvciBpbiBhIC50cyBmaWxlIHdpdGggYSBoYW5kd3JpdHRlbiBkZWZpbml0aW9uKS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IHRoZSBjbGFzcyBvZiBpbnRlcmVzdFxuICAgKiBAcGFyYW0gbmdNb2R1bGVJbXBvcnRlZEZyb20gbW9kdWxlIHNwZWNpZmllciBvZiB0aGUgaW1wb3J0IHBhdGggdG8gYXNzdW1lIGZvciBhbGwgZGVjbGFyYXRpb25zXG4gICAqIHN0ZW1taW5nIGZyb20gdGhpcyBtb2R1bGUuXG4gICAqL1xuICBwcml2YXRlIF9yZWFkTW9kdWxlRGF0YUZyb21Db21waWxlZENsYXNzKFxuICAgICAgY2xheno6IHRzLkRlY2xhcmF0aW9uLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nfG51bGwsXG4gICAgICByZXNvbHV0aW9uQ29udGV4dDogc3RyaW5nKTogTW9kdWxlRGF0YXxudWxsIHtcbiAgICAvLyBUaGlzIG9wZXJhdGlvbiBpcyBleHBsaWNpdGx5IG5vdCBtZW1vaXplZCwgYXMgaXQgZGVwZW5kcyBvbiBgbmdNb2R1bGVJbXBvcnRlZEZyb21gLlxuICAgIC8vIFRPRE8oYWx4aHViKTogaW52ZXN0aWdhdGUgY2FjaGluZyBvZiAuZC50cyBtb2R1bGUgbWV0YWRhdGEuXG4gICAgY29uc3QgbmdNb2R1bGVEZWYgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmluZChcbiAgICAgICAgbWVtYmVyID0+IG1lbWJlci5uYW1lID09PSAnbmdNb2R1bGVEZWYnICYmIG1lbWJlci5pc1N0YXRpYyk7XG4gICAgaWYgKG5nTW9kdWxlRGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIC8vIFZhbGlkYXRlIHRoYXQgdGhlIHNoYXBlIG9mIHRoZSBuZ01vZHVsZURlZiB0eXBlIGlzIGNvcnJlY3QuXG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUgPT09IG51bGwgfHwgIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUobmdNb2R1bGVEZWYudHlwZSkgfHxcbiAgICAgICAgbmdNb2R1bGVEZWYudHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgbmdNb2R1bGVEZWYudHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gNCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gUmVhZCB0aGUgTW9kdWxlRGF0YSBvdXQgb2YgdGhlIHR5cGUgYXJndW1lbnRzLlxuICAgIGNvbnN0IFtfLCBkZWNsYXJhdGlvbk1ldGFkYXRhLCBpbXBvcnRNZXRhZGF0YSwgZXhwb3J0TWV0YWRhdGFdID0gbmdNb2R1bGVEZWYudHlwZS50eXBlQXJndW1lbnRzO1xuICAgIHJldHVybiB7XG4gICAgICBkZWNsYXJhdGlvbnM6IHRoaXMuX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoXG4gICAgICAgICAgZGVjbGFyYXRpb25NZXRhZGF0YSwgbmdNb2R1bGVJbXBvcnRlZEZyb20sIHJlc29sdXRpb25Db250ZXh0KSxcbiAgICAgIGV4cG9ydHM6XG4gICAgICAgICAgdGhpcy5fZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShleHBvcnRNZXRhZGF0YSwgbmdNb2R1bGVJbXBvcnRlZEZyb20sIHJlc29sdXRpb25Db250ZXh0KSxcbiAgICAgIGltcG9ydHM6XG4gICAgICAgICAgdGhpcy5fZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShpbXBvcnRNZXRhZGF0YSwgbmdNb2R1bGVJbXBvcnRlZEZyb20sIHJlc29sdXRpb25Db250ZXh0KSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc2VsZWN0b3IgZnJvbSB0eXBlIG1ldGFkYXRhIGZvciBhIGNsYXNzIHdpdGggYSBwcmVjb21waWxlZCBuZ0NvbXBvbmVudERlZiBvclxuICAgKiBuZ0RpcmVjdGl2ZURlZi5cbiAgICovXG4gIHByaXZhdGUgX3JlYWRNZXRhZGF0YUZyb21Db21waWxlZENsYXNzKHJlZjogUmVmZXJlbmNlPHRzLkNsYXNzRGVjbGFyYXRpb24+KTpcbiAgICAgIFNjb3BlRGlyZWN0aXZlPFJlZmVyZW5jZT58bnVsbCB7XG4gICAgY29uc3QgY2xhenogPSB0cy5nZXRPcmlnaW5hbE5vZGUocmVmLm5vZGUpIGFzIHRzLkNsYXNzRGVjbGFyYXRpb247XG4gICAgY29uc3QgZGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIGZpZWxkID0+XG4gICAgICAgICAgICBmaWVsZC5pc1N0YXRpYyAmJiAoZmllbGQubmFtZSA9PT0gJ25nQ29tcG9uZW50RGVmJyB8fCBmaWVsZC5uYW1lID09PSAnbmdEaXJlY3RpdmVEZWYnKSk7XG4gICAgaWYgKGRlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBObyBkZWZpbml0aW9uIGNvdWxkIGJlIGZvdW5kLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgZGVmLnR5cGUgPT09IG51bGwgfHwgIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGVmLnR5cGUpIHx8XG4gICAgICAgIGRlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fCBkZWYudHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIC8vIFRoZSB0eXBlIG1ldGFkYXRhIHdhcyB0aGUgd3Jvbmcgc2hhcGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc2VsZWN0b3IgPSByZWFkU3RyaW5nVHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzFdKTtcbiAgICBpZiAoc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICByZWYsXG4gICAgICBuYW1lOiBjbGF6ei5uYW1lICEudGV4dCxcbiAgICAgIGRpcmVjdGl2ZTogcmVmLFxuICAgICAgaXNDb21wb25lbnQ6IGRlZi5uYW1lID09PSAnbmdDb21wb25lbnREZWYnLCBzZWxlY3RvcixcbiAgICAgIGV4cG9ydEFzOiByZWFkU3RyaW5nQXJyYXlUeXBlKGRlZi50eXBlLnR5cGVBcmd1bWVudHNbMl0pLFxuICAgICAgaW5wdXRzOiByZWFkU3RyaW5nTWFwVHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzNdKSxcbiAgICAgIG91dHB1dHM6IHJlYWRTdHJpbmdNYXBUeXBlKGRlZi50eXBlLnR5cGVBcmd1bWVudHNbNF0pLFxuICAgICAgcXVlcmllczogcmVhZFN0cmluZ0FycmF5VHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzVdKSxcbiAgICAgIC4uLmV4dHJhY3REaXJlY3RpdmVHdWFyZHMoY2xhenosIHRoaXMucmVmbGVjdG9yKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc2VsZWN0b3IgZnJvbSB0eXBlIG1ldGFkYXRhIGZvciBhIGNsYXNzIHdpdGggYSBwcmVjb21waWxlZCBuZ0NvbXBvbmVudERlZiBvclxuICAgKiBuZ0RpcmVjdGl2ZURlZi5cbiAgICovXG4gIHByaXZhdGUgX3JlYWROYW1lRnJvbUNvbXBpbGVkQ2xhc3MoY2xheno6IHRzLkRlY2xhcmF0aW9uKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IGRlZiA9IHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KS5maW5kKFxuICAgICAgICBmaWVsZCA9PiBmaWVsZC5pc1N0YXRpYyAmJiBmaWVsZC5uYW1lID09PSAnbmdQaXBlRGVmJyk7XG4gICAgaWYgKGRlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBObyBkZWZpbml0aW9uIGNvdWxkIGJlIGZvdW5kLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgZGVmLnR5cGUgPT09IG51bGwgfHwgIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGVmLnR5cGUpIHx8XG4gICAgICAgIGRlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fCBkZWYudHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIC8vIFRoZSB0eXBlIG1ldGFkYXRhIHdhcyB0aGUgd3Jvbmcgc2hhcGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgdHlwZSA9IGRlZi50eXBlLnR5cGVBcmd1bWVudHNbMV07XG4gICAgaWYgKCF0cy5pc0xpdGVyYWxUeXBlTm9kZSh0eXBlKSB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKHR5cGUubGl0ZXJhbCkpIHtcbiAgICAgIC8vIFRoZSB0eXBlIG1ldGFkYXRhIHdhcyB0aGUgd3JvbmcgdHlwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZS5saXRlcmFsLnRleHQ7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2VzcyBhIGBUeXBlTm9kZWAgd2hpY2ggaXMgYSB0dXBsZSBvZiByZWZlcmVuY2VzIHRvIG90aGVyIHR5cGVzLCBhbmQgcmV0dXJuIGBSZWZlcmVuY2VgcyB0b1xuICAgKiB0aGVtLlxuICAgKlxuICAgKiBUaGlzIG9wZXJhdGlvbiBhc3N1bWVzIHRoYXQgdGhlc2UgdHlwZXMgc2hvdWxkIGJlIGltcG9ydGVkIGZyb20gYG5nTW9kdWxlSW1wb3J0ZWRGcm9tYCB1bmxlc3NcbiAgICogdGhleSB0aGVtc2VsdmVzIHdlcmUgaW1wb3J0ZWQgZnJvbSBhbm90aGVyIGFic29sdXRlIHBhdGguXG4gICAqL1xuICBwcml2YXRlIF9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKFxuICAgICAgZGVmOiB0cy5UeXBlTm9kZSwgbmdNb2R1bGVJbXBvcnRlZEZyb206IHN0cmluZ3xudWxsLFxuICAgICAgcmVzb2x1dGlvbkNvbnRleHQ6IHN0cmluZyk6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXSB7XG4gICAgaWYgKCF0cy5pc1R1cGxlVHlwZU5vZGUoZGVmKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gZGVmLmVsZW1lbnRUeXBlcy5tYXAoZWxlbWVudCA9PiB7XG4gICAgICBpZiAoIXRzLmlzVHlwZVF1ZXJ5Tm9kZShlbGVtZW50KSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIFR5cGVRdWVyeU5vZGVgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHR5cGUgPSBlbGVtZW50LmV4cHJOYW1lO1xuICAgICAgaWYgKG5nTW9kdWxlSW1wb3J0ZWRGcm9tICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHtub2RlLCBmcm9tfSA9IHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbih0eXBlLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgICBjb25zdCBtb2R1bGVOYW1lID0gKGZyb20gIT09IG51bGwgJiYgIWZyb20uc3RhcnRzV2l0aCgnLicpID8gZnJvbSA6IG5nTW9kdWxlSW1wb3J0ZWRGcm9tKTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZXIucmVzb2x2ZShub2RlLCBtb2R1bGVOYW1lLCByZXNvbHV0aW9uQ29udGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB7bm9kZX0gPSByZWZsZWN0VHlwZUVudGl0eVRvRGVjbGFyYXRpb24odHlwZSwgdGhpcy5jaGVja2VyKTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZXIucmVzb2x2ZShub2RlLCBudWxsLCByZXNvbHV0aW9uQ29udGV4dCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmxhdHRlbjxUPihhcnJheTogVFtdW10pOiBUW10ge1xuICByZXR1cm4gYXJyYXkucmVkdWNlKChhY2N1bSwgc3ViQXJyYXkpID0+IHtcbiAgICBhY2N1bS5wdXNoKC4uLnN1YkFycmF5KTtcbiAgICByZXR1cm4gYWNjdW07XG4gIH0sIFtdIGFzIFRbXSk7XG59XG5cbmZ1bmN0aW9uIGFic29sdXRlTW9kdWxlTmFtZShyZWY6IFJlZmVyZW5jZSk6IHN0cmluZ3xudWxsIHtcbiAgaWYgKCEocmVmIGluc3RhbmNlb2YgQWJzb2x1dGVSZWZlcmVuY2UpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHJlZi5tb2R1bGVOYW1lO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0RGlyZWN0aXZlUmVmZXJlbmNlTGlzdChcbiAgICBpbnB1dDogU2NvcGVEaXJlY3RpdmU8UmVmZXJlbmNlPltdLCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogU2NvcGVEaXJlY3RpdmU8RXhwcmVzc2lvbj5bXSB7XG4gIHJldHVybiBpbnB1dC5tYXAobWV0YSA9PiB7XG4gICAgY29uc3QgZGlyZWN0aXZlID0gbWV0YS5kaXJlY3RpdmUudG9FeHByZXNzaW9uKGNvbnRleHQpO1xuICAgIGlmIChkaXJlY3RpdmUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHdyaXRlIGV4cHJlc3Npb24gdG8gcmVmZXJlbmNlICR7bWV0YS5kaXJlY3RpdmUubm9kZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHsuLi5tZXRhLCBkaXJlY3RpdmV9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY29udmVydFBpcGVSZWZlcmVuY2VNYXAoXG4gICAgbWFwOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogTWFwPHN0cmluZywgRXhwcmVzc2lvbj4ge1xuICBjb25zdCBuZXdNYXAgPSBuZXcgTWFwPHN0cmluZywgRXhwcmVzc2lvbj4oKTtcbiAgbWFwLmZvckVhY2goKG1ldGEsIHNlbGVjdG9yKSA9PiB7XG4gICAgY29uc3QgcGlwZSA9IG1ldGEudG9FeHByZXNzaW9uKGNvbnRleHQpO1xuICAgIGlmIChwaXBlID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCB3cml0ZSBleHByZXNzaW9uIHRvIHJlZmVyZW5jZSAke21ldGEubm9kZX1gKTtcbiAgICB9XG4gICAgbmV3TWFwLnNldChzZWxlY3RvciwgcGlwZSk7XG4gIH0pO1xuICByZXR1cm4gbmV3TWFwO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0U2NvcGVUb0V4cHJlc3Npb25zKFxuICAgIHNjb3BlOiBDb21waWxhdGlvblNjb3BlPFJlZmVyZW5jZT4sIGNvbnRleHQ6IHRzLkRlY2xhcmF0aW9uKTogQ29tcGlsYXRpb25TY29wZTxFeHByZXNzaW9uPiB7XG4gIGNvbnN0IHNvdXJjZUNvbnRleHQgPSB0cy5nZXRPcmlnaW5hbE5vZGUoY29udGV4dCkuZ2V0U291cmNlRmlsZSgpO1xuICBjb25zdCBkaXJlY3RpdmVzID0gY29udmVydERpcmVjdGl2ZVJlZmVyZW5jZUxpc3Qoc2NvcGUuZGlyZWN0aXZlcywgc291cmNlQ29udGV4dCk7XG4gIGNvbnN0IHBpcGVzID0gY29udmVydFBpcGVSZWZlcmVuY2VNYXAoc2NvcGUucGlwZXMsIHNvdXJjZUNvbnRleHQpO1xuICBjb25zdCBkZWNsUG9pbnRlciA9IG1heWJlVW53cmFwTmFtZU9mRGVjbGFyYXRpb24oY29udGV4dCk7XG4gIGxldCBjb250YWluc0ZvcndhcmREZWNscyA9IGZhbHNlO1xuICBkaXJlY3RpdmVzLmZvckVhY2gobWV0YSA9PiB7XG4gICAgY29udGFpbnNGb3J3YXJkRGVjbHMgPSBjb250YWluc0ZvcndhcmREZWNscyB8fFxuICAgICAgICBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKG1ldGEuZGlyZWN0aXZlLCBkZWNsUG9pbnRlciwgc291cmNlQ29udGV4dCk7XG4gIH0pO1xuICAhY29udGFpbnNGb3J3YXJkRGVjbHMgJiYgcGlwZXMuZm9yRWFjaChleHByID0+IHtcbiAgICBjb250YWluc0ZvcndhcmREZWNscyA9XG4gICAgICAgIGNvbnRhaW5zRm9yd2FyZERlY2xzIHx8IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UoZXhwciwgZGVjbFBvaW50ZXIsIHNvdXJjZUNvbnRleHQpO1xuICB9KTtcbiAgcmV0dXJuIHtkaXJlY3RpdmVzLCBwaXBlcywgY29udGFpbnNGb3J3YXJkRGVjbHN9O1xufVxuXG5mdW5jdGlvbiBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKFxuICAgIGV4cHI6IEV4cHJlc3Npb24sIGNvbnRleHQ6IHRzLk5vZGUsIGNvbnRleHRTb3VyY2U6IHRzLlNvdXJjZUZpbGUpOiBib29sZWFuIHtcbiAgaWYgKGlzV3JhcHBlZFRzTm9kZUV4cHIoZXhwcikpIHtcbiAgICBjb25zdCBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKGV4cHIubm9kZSk7XG4gICAgcmV0dXJuIG5vZGUuZ2V0U291cmNlRmlsZSgpID09PSBjb250ZXh0U291cmNlICYmIGNvbnRleHQucG9zIDwgbm9kZS5wb3M7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc1dyYXBwZWRUc05vZGVFeHByKGV4cHI6IEV4cHJlc3Npb24pOiBleHByIGlzIFdyYXBwZWROb2RlRXhwcjx0cy5Ob2RlPiB7XG4gIHJldHVybiBleHByIGluc3RhbmNlb2YgV3JhcHBlZE5vZGVFeHByO1xufVxuXG5mdW5jdGlvbiBtYXliZVVud3JhcE5hbWVPZkRlY2xhcmF0aW9uKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogdHMuRGVjbGFyYXRpb258dHMuSWRlbnRpZmllciB7XG4gIGlmICgodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY2wpIHx8IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsKSkgJiYgZGVjbC5uYW1lICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpKSB7XG4gICAgcmV0dXJuIGRlY2wubmFtZTtcbiAgfVxuICByZXR1cm4gZGVjbDtcbn1cblxuZnVuY3Rpb24gcmVhZFN0cmluZ1R5cGUodHlwZTogdHMuVHlwZU5vZGUpOiBzdHJpbmd8bnVsbCB7XG4gIGlmICghdHMuaXNMaXRlcmFsVHlwZU5vZGUodHlwZSkgfHwgIXRzLmlzU3RyaW5nTGl0ZXJhbCh0eXBlLmxpdGVyYWwpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHR5cGUubGl0ZXJhbC50ZXh0O1xufVxuXG5mdW5jdGlvbiByZWFkU3RyaW5nTWFwVHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgaWYgKCF0cy5pc1R5cGVMaXRlcmFsTm9kZSh0eXBlKSkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuICBjb25zdCBvYmo6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIHR5cGUubWVtYmVycy5mb3JFYWNoKG1lbWJlciA9PiB7XG4gICAgaWYgKCF0cy5pc1Byb3BlcnR5U2lnbmF0dXJlKG1lbWJlcikgfHwgbWVtYmVyLnR5cGUgPT09IHVuZGVmaW5lZCB8fCBtZW1iZXIubmFtZSA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICF0cy5pc1N0cmluZ0xpdGVyYWwobWVtYmVyLm5hbWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHZhbHVlID0gcmVhZFN0cmluZ1R5cGUobWVtYmVyLnR5cGUpO1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIG9ialttZW1iZXIubmFtZS50ZXh0XSA9IHZhbHVlO1xuICB9KTtcbiAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gcmVhZFN0cmluZ0FycmF5VHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IHN0cmluZ1tdIHtcbiAgaWYgKCF0cy5pc1R1cGxlVHlwZU5vZGUodHlwZSkpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgY29uc3QgcmVzOiBzdHJpbmdbXSA9IFtdO1xuICB0eXBlLmVsZW1lbnRUeXBlcy5mb3JFYWNoKGVsID0+IHtcbiAgICBpZiAoIXRzLmlzTGl0ZXJhbFR5cGVOb2RlKGVsKSB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKGVsLmxpdGVyYWwpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlcy5wdXNoKGVsLmxpdGVyYWwudGV4dCk7XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuIl19