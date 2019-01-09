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
            return tslib_1.__assign({ ref: ref, name: clazz.name.text, directive: ref, isComponent: def.name === 'ngComponentDef', selector: selector, exportAs: readStringType(def.type.typeArguments[2]), inputs: readStringMapType(def.type.typeArguments[3]), outputs: readStringMapType(def.type.typeArguments[4]), queries: readStringArrayType(def.type.typeArguments[5]) }, util_1.extractDirectiveGuards(clazz, this.reflector));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0b3Jfc2NvcGUuanMiLCJzb3VyY2VSb290IjoiLi4vLi4vLi4vLi4vLi4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9zZWxlY3Rvcl9zY29wZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBOEQ7SUFDOUQsK0JBQWlDO0lBRWpDLG1FQUFpRztJQUNqRyx5RUFBMEk7SUFHMUksNkVBQThDO0lBNEM5Qzs7Ozs7T0FLRztJQUNIO1FBMEJFLCtCQUNZLE9BQXVCLEVBQVUsU0FBeUIsRUFDMUQsUUFBMkI7WUFEM0IsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMxRCxhQUFRLEdBQVIsUUFBUSxDQUFtQjtZQTNCdkM7O2VBRUc7WUFDSyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1lBRTlEOztlQUVHO1lBQ0ssMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQStDLENBQUM7WUFFeEY7O2VBRUc7WUFDSyx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBNkMsQ0FBQztZQUVwRjs7ZUFFRztZQUNLLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7WUFFeEQ7O2VBRUc7WUFDSyw0QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQztRQUlsQyxDQUFDO1FBRTNDOztXQUVHO1FBQ0gsOENBQWMsR0FBZCxVQUFlLElBQW9CLEVBQUUsSUFBZ0I7WUFBckQsaUJBWUM7WUFYQyxJQUFJLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQW1CLENBQUM7WUFFbEQsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FBOEIscUNBQXdCLENBQUMsSUFBSSxDQUFHLENBQUMsQ0FB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RCxJQUFNLEdBQUcsR0FBYSxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBQSxFQUFFO1lBQzFCLElBQUksQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDaEUsT0FBTzthQUNSO1lBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVSZWZlcmVuY2UsIFJlZmVyZW5jZSwgUmVmZXJlbmNlUmVzb2x2ZXIsIFJlc29sdmVkUmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7UmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbiwgcmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uLCByZWZsZWN0VHlwZUVudGl0eVRvRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YX0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcblxuaW1wb3J0IHtleHRyYWN0RGlyZWN0aXZlR3VhcmRzfSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogTWV0YWRhdGEgZXh0cmFjdGVkIGZvciBhIGdpdmVuIE5nTW9kdWxlIHRoYXQgY2FuIGJlIHVzZWQgdG8gY29tcHV0ZSBzZWxlY3RvciBzY29wZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTW9kdWxlRGF0YSB7XG4gIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdO1xuICBpbXBvcnRzOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W107XG4gIGV4cG9ydHM6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXTtcbn1cblxuLyoqXG4gKiBUcmFuc2l0aXZlbHkgZXhwYW5kZWQgbWFwcyBvZiBkaXJlY3RpdmVzIGFuZCBwaXBlcyB2aXNpYmxlIHRvIGEgY29tcG9uZW50IGJlaW5nIGNvbXBpbGVkIGluIHRoZVxuICogY29udGV4dCBvZiBzb21lIG1vZHVsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21waWxhdGlvblNjb3BlPFQ+IHtcbiAgZGlyZWN0aXZlczogU2NvcGVEaXJlY3RpdmU8VD5bXTtcbiAgcGlwZXM6IE1hcDxzdHJpbmcsIFQ+O1xuICBjb250YWluc0ZvcndhcmREZWNscz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2NvcGVEaXJlY3RpdmU8VD4gZXh0ZW5kcyBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSB7XG4gIHNlbGVjdG9yOiBzdHJpbmc7XG4gIGRpcmVjdGl2ZTogVDtcbn1cblxuLyoqXG4gKiBCb3RoIHRyYW5zaXRpdmVseSBleHBhbmRlZCBzY29wZXMgZm9yIGEgZ2l2ZW4gTmdNb2R1bGUuXG4gKi9cbmludGVyZmFjZSBTZWxlY3RvclNjb3BlcyB7XG4gIC8qKlxuICAgKiBTZXQgb2YgY29tcG9uZW50cywgZGlyZWN0aXZlcywgYW5kIHBpcGVzIHZpc2libGUgdG8gYWxsIGNvbXBvbmVudHMgYmVpbmcgY29tcGlsZWQgaW4gdGhlXG4gICAqIGNvbnRleHQgb2Ygc29tZSBtb2R1bGUuXG4gICAqL1xuICBjb21waWxhdGlvbjogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgY29tcG9uZW50cywgZGlyZWN0aXZlcywgYW5kIHBpcGVzIGFkZGVkIHRvIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBhbnkgbW9kdWxlIGltcG9ydGluZ1xuICAgKiBzb21lIG1vZHVsZS5cbiAgICovXG4gIGV4cG9ydGVkOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W107XG59XG5cbi8qKlxuICogUmVnaXN0cnkgd2hpY2ggcmVjb3JkcyBhbmQgY29ycmVsYXRlcyBzdGF0aWMgYW5hbHlzaXMgaW5mb3JtYXRpb24gb2YgQW5ndWxhciB0eXBlcy5cbiAqXG4gKiBPbmNlIGEgY29tcGlsYXRpb24gdW5pdCdzIGluZm9ybWF0aW9uIGlzIGZlZCBpbnRvIHRoZSBTZWxlY3RvclNjb3BlUmVnaXN0cnksIGl0IGNhbiBiZSBhc2tlZCB0b1xuICogcHJvZHVjZSB0cmFuc2l0aXZlIGBDb21waWxhdGlvblNjb3BlYHMgZm9yIGNvbXBvbmVudHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBTZWxlY3RvclNjb3BlUmVnaXN0cnkge1xuICAvKipcbiAgICogIE1hcCBvZiBtb2R1bGVzIGRlY2xhcmVkIGluIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgdG8gdGhlaXIgKGxvY2FsKSBtZXRhZGF0YS5cbiAgICovXG4gIHByaXZhdGUgX21vZHVsZVRvRGF0YSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIE1vZHVsZURhdGE+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBtb2R1bGVzIHRvIHRoZWlyIGNhY2hlZCBgQ29tcGlsYXRpb25TY29wZWBzLlxuICAgKi9cbiAgcHJpdmF0ZSBfY29tcGlsYXRpb25TY29wZUNhY2hlID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgQ29tcGlsYXRpb25TY29wZTxSZWZlcmVuY2U+PigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgY29tcG9uZW50cy9kaXJlY3RpdmVzIHRvIHRoZWlyIG1ldGFkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBfZGlyZWN0aXZlVG9NZXRhZGF0YSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIFNjb3BlRGlyZWN0aXZlPFJlZmVyZW5jZT4+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBwaXBlcyB0byB0aGVpciBuYW1lLlxuICAgKi9cbiAgcHJpdmF0ZSBfcGlwZVRvTmFtZSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIGNvbXBvbmVudHMvZGlyZWN0aXZlcy9waXBlcyB0byB0aGVpciBtb2R1bGUuXG4gICAqL1xuICBwcml2YXRlIF9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIHJlc29sdmVyOiBSZWZlcmVuY2VSZXNvbHZlcikge31cblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBtb2R1bGUncyBtZXRhZGF0YSB3aXRoIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyTW9kdWxlKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBkYXRhOiBNb2R1bGVEYXRhKTogdm9pZCB7XG4gICAgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgIGlmICh0aGlzLl9tb2R1bGVUb0RhdGEuaGFzKG5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1vZHVsZSBhbHJlYWR5IHJlZ2lzdGVyZWQ6ICR7cmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKG5vZGUpfWApO1xuICAgIH1cbiAgICB0aGlzLl9tb2R1bGVUb0RhdGEuc2V0KG5vZGUsIGRhdGEpO1xuXG4gICAgLy8gUmVnaXN0ZXIgYWxsIG9mIHRoZSBtb2R1bGUncyBkZWNsYXJhdGlvbnMgaW4gdGhlIGNvbnRleHQgbWFwIGFzIGJlbG9uZ2luZyB0byB0aGlzIG1vZHVsZS5cbiAgICBkYXRhLmRlY2xhcmF0aW9ucy5mb3JFYWNoKGRlY2wgPT4ge1xuICAgICAgdGhpcy5fZGVjbGFyYXJlZFR5cGVUb01vZHVsZS5zZXQodHMuZ2V0T3JpZ2luYWxOb2RlKGRlY2wubm9kZSkgYXMgdHMuRGVjbGFyYXRpb24sIG5vZGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHRoZSBtZXRhZGF0YSBvZiBhIGNvbXBvbmVudCBvciBkaXJlY3RpdmUgd2l0aCB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3RlckRpcmVjdGl2ZShub2RlOiB0cy5EZWNsYXJhdGlvbiwgbWV0YWRhdGE6IFNjb3BlRGlyZWN0aXZlPFJlZmVyZW5jZT4pOiB2b2lkIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgaWYgKHRoaXMuX2RpcmVjdGl2ZVRvTWV0YWRhdGEuaGFzKG5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFNlbGVjdG9yIGFscmVhZHkgcmVnaXN0ZXJlZDogJHtyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24obm9kZSl9ICR7bWV0YWRhdGEuc2VsZWN0b3J9YCk7XG4gICAgfVxuICAgIHRoaXMuX2RpcmVjdGl2ZVRvTWV0YWRhdGEuc2V0KG5vZGUsIG1ldGFkYXRhKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciB0aGUgbmFtZSBvZiBhIHBpcGUgd2l0aCB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3RlclBpcGUobm9kZTogdHMuRGVjbGFyYXRpb24sIG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgIG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICB0aGlzLl9waXBlVG9OYW1lLnNldChub2RlLCBuYW1lKTtcbiAgfVxuXG4gIGxvb2t1cENvbXBpbGF0aW9uU2NvcGVBc1JlZnMobm9kZTogdHMuRGVjbGFyYXRpb24pOiBDb21waWxhdGlvblNjb3BlPFJlZmVyZW5jZT58bnVsbCB7XG4gICAgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgIC8vIElmIHRoZSBjb21wb25lbnQgaGFzIG5vIGFzc29jaWF0ZWQgbW9kdWxlLCB0aGVuIGl0IGhhcyBubyBjb21waWxhdGlvbiBzY29wZS5cbiAgICBpZiAoIXRoaXMuX2RlY2xhcmFyZWRUeXBlVG9Nb2R1bGUuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGUgPSB0aGlzLl9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlLmdldChub2RlKSAhO1xuXG4gICAgLy8gQ29tcGlsYXRpb24gc2NvcGUgY29tcHV0YXRpb24gaXMgc29tZXdoYXQgZXhwZW5zaXZlLCBzbyBpdCdzIGNhY2hlZC4gQ2hlY2sgdGhlIGNhY2hlIGZvclxuICAgIC8vIHRoZSBtb2R1bGUuXG4gICAgaWYgKHRoaXMuX2NvbXBpbGF0aW9uU2NvcGVDYWNoZS5oYXMobW9kdWxlKSkge1xuICAgICAgLy8gVGhlIGNvbXBpbGF0aW9uIHNjb3BlIHdhcyBjYWNoZWQuXG4gICAgICBjb25zdCBzY29wZSA9IHRoaXMuX2NvbXBpbGF0aW9uU2NvcGVDYWNoZS5nZXQobW9kdWxlKSAhO1xuXG4gICAgICAvLyBUaGUgc2NvcGUgYXMgY2FjaGVkIGlzIGluIHRlcm1zIG9mIFJlZmVyZW5jZXMsIG5vdCBFeHByZXNzaW9ucy4gQ29udmVydGluZyBiZXR3ZWVuIHRoZW1cbiAgICAgIC8vIHJlcXVpcmVzIGtub3dsZWRnZSBvZiB0aGUgY29udGV4dCBmaWxlIChpbiB0aGlzIGNhc2UsIHRoZSBjb21wb25lbnQgbm9kZSdzIHNvdXJjZSBmaWxlKS5cbiAgICAgIHJldHVybiBzY29wZTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIGlzIHRoZSBmaXJzdCB0aW1lIHRoZSBzY29wZSBmb3IgdGhpcyBtb2R1bGUgaXMgYmVpbmcgY29tcHV0ZWQuXG4gICAgY29uc3QgZGlyZWN0aXZlczogU2NvcGVEaXJlY3RpdmU8UmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPj5bXSA9IFtdO1xuICAgIGNvbnN0IHBpcGVzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4+KCk7XG5cbiAgICAvLyBUcmFja3Mgd2hpY2ggZGVjbGFyYXRpb25zIGFscmVhZHkgYXBwZWFyIGluIHRoZSBgQ29tcGlsYXRpb25TY29wZWAuXG4gICAgY29uc3Qgc2VlblNldCA9IG5ldyBTZXQ8dHMuRGVjbGFyYXRpb24+KCk7XG5cbiAgICAvLyBQcm9jZXNzIHRoZSBkZWNsYXJhdGlvbiBzY29wZSBvZiB0aGUgbW9kdWxlLCBhbmQgbG9va3VwIHRoZSBzZWxlY3RvciBvZiBldmVyeSBkZWNsYXJlZCB0eXBlLlxuICAgIC8vIFRoZSBpbml0aWFsIHZhbHVlIG9mIG5nTW9kdWxlSW1wb3J0ZWRGcm9tIGlzICdudWxsJyB3aGljaCBzaWduaWZpZXMgdGhhdCB0aGUgTmdNb2R1bGVcbiAgICAvLyB3YXMgbm90IGltcG9ydGVkIGZyb20gYSAuZC50cyBzb3VyY2UuXG4gICAgZm9yIChjb25zdCByZWYgb2YgdGhpc1xuICAgICAgICAgICAgIC5sb29rdXBTY29wZXNPckRpZShcbiAgICAgICAgICAgICAgICAgbW9kdWxlICEsIC8qIG5nTW9kdWxlSW1wb3J0ZWRGcm9tICovIG51bGwsIG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lKVxuICAgICAgICAgICAgIC5jb21waWxhdGlvbikge1xuICAgICAgY29uc3Qgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShyZWYubm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICAgIC8vIFRyYWNrIHdoZXRoZXIgdGhpcyBgdHMuRGVjbGFyYXRpb25gIGhhcyBiZWVuIHNlZW4gYmVmb3JlLlxuICAgICAgaWYgKHNlZW5TZXQuaGFzKG5vZGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VlblNldC5hZGQobm9kZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEVpdGhlciB0aGUgbm9kZSByZXByZXNlbnRzIGEgZGlyZWN0aXZlIG9yIGEgcGlwZS4gTG9vayBmb3IgYm90aC5cbiAgICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5sb29rdXBEaXJlY3RpdmVNZXRhZGF0YShyZWYpO1xuICAgICAgLy8gT25seSBkaXJlY3RpdmVzL2NvbXBvbmVudHMgd2l0aCBzZWxlY3RvcnMgZ2V0IGFkZGVkIHRvIHRoZSBzY29wZS5cbiAgICAgIGlmIChtZXRhZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICBkaXJlY3RpdmVzLnB1c2goey4uLm1ldGFkYXRhLCBkaXJlY3RpdmU6IHJlZn0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgbmFtZSA9IHRoaXMubG9va3VwUGlwZU5hbWUobm9kZSk7XG4gICAgICAgIGlmIChuYW1lICE9PSBudWxsKSB7XG4gICAgICAgICAgcGlwZXMuc2V0KG5hbWUsIHJlZik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzY29wZTogQ29tcGlsYXRpb25TY29wZTxSZWZlcmVuY2U+ID0ge2RpcmVjdGl2ZXMsIHBpcGVzfTtcblxuICAgIC8vIE1hbnkgY29tcG9uZW50cyBtYXkgYmUgY29tcGlsZWQgaW4gdGhlIHNhbWUgc2NvcGUsIHNvIGNhY2hlIGl0LlxuICAgIHRoaXMuX2NvbXBpbGF0aW9uU2NvcGVDYWNoZS5zZXQobm9kZSwgc2NvcGUpO1xuXG4gICAgLy8gQ29udmVydCBSZWZlcmVuY2VzIHRvIEV4cHJlc3Npb25zIGluIHRoZSBjb250ZXh0IG9mIHRoZSBjb21wb25lbnQncyBzb3VyY2UgZmlsZS5cbiAgICByZXR1cm4gc2NvcGU7XG4gIH1cblxuICAvKipcbiAgICogUHJvZHVjZSB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgYSBjb21wb25lbnQsIHdoaWNoIGlzIGRldGVybWluZWQgYnkgdGhlIG1vZHVsZSB0aGF0IGRlY2xhcmVzXG4gICAqIGl0LlxuICAgKi9cbiAgbG9va3VwQ29tcGlsYXRpb25TY29wZShub2RlOiB0cy5EZWNsYXJhdGlvbik6IENvbXBpbGF0aW9uU2NvcGU8RXhwcmVzc2lvbj58bnVsbCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmxvb2t1cENvbXBpbGF0aW9uU2NvcGVBc1JlZnMobm9kZSk7XG4gICAgcmV0dXJuIHNjb3BlICE9PSBudWxsID8gY29udmVydFNjb3BlVG9FeHByZXNzaW9ucyhzY29wZSwgbm9kZSkgOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBsb29rdXBTY29wZXNPckRpZShcbiAgICAgIG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nfG51bGwsXG4gICAgICByZXNvbHV0aW9uQ29udGV4dDogc3RyaW5nKTogU2VsZWN0b3JTY29wZXMge1xuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMubG9va3VwU2NvcGVzKG5vZGUsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tLCByZXNvbHV0aW9uQ29udGV4dCk7XG4gICAgaWYgKHJlc3VsdCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNb2R1bGUgbm90IGZvdW5kOiAke3JlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbihub2RlKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rdXAgYFNlbGVjdG9yU2NvcGVzYCBmb3IgYSBnaXZlbiBtb2R1bGUuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gYXNzdW1lcyB0aGF0IGlmIHRoZSBnaXZlbiBtb2R1bGUgd2FzIGltcG9ydGVkIGZyb20gYW4gYWJzb2x1dGUgcGF0aFxuICAgKiAoYG5nTW9kdWxlSW1wb3J0ZWRGcm9tYCkgdGhlbiBhbGwgb2YgaXRzIGRlY2xhcmF0aW9ucyBhcmUgZXhwb3J0ZWQgYXQgdGhhdCBzYW1lIHBhdGgsIGFzIHdlbGxcbiAgICogYXMgaW1wb3J0cyBhbmQgZXhwb3J0cyBmcm9tIG90aGVyIG1vZHVsZXMgdGhhdCBhcmUgcmVsYXRpdmVseSBpbXBvcnRlZC5cbiAgICovXG4gIHByaXZhdGUgbG9va3VwU2NvcGVzKFxuICAgICAgbm9kZTogdHMuRGVjbGFyYXRpb24sIG5nTW9kdWxlSW1wb3J0ZWRGcm9tOiBzdHJpbmd8bnVsbCxcbiAgICAgIHJlc29sdXRpb25Db250ZXh0OiBzdHJpbmcpOiBTZWxlY3RvclNjb3Blc3xudWxsIHtcbiAgICBsZXQgZGF0YTogTW9kdWxlRGF0YXxudWxsID0gbnVsbDtcblxuICAgIC8vIEVpdGhlciB0aGlzIG1vZHVsZSB3YXMgYW5hbHl6ZWQgZGlyZWN0bHksIG9yIGhhcyBhIHByZWNvbXBpbGVkIG5nTW9kdWxlRGVmLlxuICAgIGlmICh0aGlzLl9tb2R1bGVUb0RhdGEuaGFzKG5vZGUpKSB7XG4gICAgICAvLyBUaGUgbW9kdWxlIHdhcyBhbmFseXplZCBiZWZvcmUsIGFuZCB0aHVzIGl0cyBkYXRhIGlzIGF2YWlsYWJsZS5cbiAgICAgIGRhdGEgPSB0aGlzLl9tb2R1bGVUb0RhdGEuZ2V0KG5vZGUpICE7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBtb2R1bGUgd2Fzbid0IGFuYWx5emVkIGJlZm9yZSwgYW5kIHByb2JhYmx5IGhhcyBhIHByZWNvbXBpbGVkIG5nTW9kdWxlRGVmIHdpdGggYSB0eXBlXG4gICAgICAvLyBhbm5vdGF0aW9uIHRoYXQgc3BlY2lmaWVzIHRoZSBuZWVkZWQgbWV0YWRhdGEuXG4gICAgICBkYXRhID0gdGhpcy5fcmVhZE1vZHVsZURhdGFGcm9tQ29tcGlsZWRDbGFzcyhub2RlLCBuZ01vZHVsZUltcG9ydGVkRnJvbSwgcmVzb2x1dGlvbkNvbnRleHQpO1xuICAgICAgLy8gTm90ZSB0aGF0IGRhdGEgaGVyZSBjb3VsZCBzdGlsbCBiZSBudWxsLCBpZiB0aGUgY2xhc3MgZGlkbid0IGhhdmUgYSBwcmVjb21waWxlZFxuICAgICAgLy8gbmdNb2R1bGVEZWYuXG4gICAgfVxuXG4gICAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnRleHQgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcblxuICAgIHJldHVybiB7XG4gICAgICBjb21waWxhdGlvbjogW1xuICAgICAgICAuLi5kYXRhLmRlY2xhcmF0aW9ucyxcbiAgICAgICAgLy8gRXhwYW5kIGltcG9ydHMgdG8gdGhlIGV4cG9ydGVkIHNjb3BlIG9mIHRob3NlIGltcG9ydHMuXG4gICAgICAgIC4uLmZsYXR0ZW4oZGF0YS5pbXBvcnRzLm1hcChcbiAgICAgICAgICAgIHJlZiA9PlxuICAgICAgICAgICAgICAgIHRoaXMubG9va3VwU2NvcGVzT3JEaWUocmVmLm5vZGUgYXMgdHMuRGVjbGFyYXRpb24sIGFic29sdXRlTW9kdWxlTmFtZShyZWYpLCBjb250ZXh0KVxuICAgICAgICAgICAgICAgICAgICAuZXhwb3J0ZWQpKSxcbiAgICAgICAgLy8gQW5kIGluY2x1ZGUgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGV4cG9ydGVkIG1vZHVsZXMuXG4gICAgICAgIC4uLmZsYXR0ZW4oXG4gICAgICAgICAgICBkYXRhLmV4cG9ydHNcbiAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICByZWYgPT4gdGhpcy5sb29rdXBTY29wZXMoXG4gICAgICAgICAgICAgICAgICAgICAgICByZWYubm9kZSBhcyB0cy5EZWNsYXJhdGlvbiwgYWJzb2x1dGVNb2R1bGVOYW1lKHJlZiksIGNvbnRleHQpKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoKHNjb3BlOiBTZWxlY3RvclNjb3BlcyB8IG51bGwpOiBzY29wZSBpcyBTZWxlY3RvclNjb3BlcyA9PiBzY29wZSAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAubWFwKHNjb3BlID0+IHNjb3BlLmV4cG9ydGVkKSlcbiAgICAgIF0sXG4gICAgICBleHBvcnRlZDogZmxhdHRlbihkYXRhLmV4cG9ydHMubWFwKHJlZiA9PiB7XG4gICAgICAgIGNvbnN0IHNjb3BlID1cbiAgICAgICAgICAgIHRoaXMubG9va3VwU2NvcGVzKHJlZi5ub2RlIGFzIHRzLkRlY2xhcmF0aW9uLCBhYnNvbHV0ZU1vZHVsZU5hbWUocmVmKSwgY29udGV4dCk7XG4gICAgICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBzY29wZS5leHBvcnRlZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gW3JlZl07XG4gICAgICAgIH1cbiAgICAgIH0pKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2t1cCB0aGUgbWV0YWRhdGEgb2YgYSBjb21wb25lbnQgb3IgZGlyZWN0aXZlIGNsYXNzLlxuICAgKlxuICAgKiBQb3RlbnRpYWxseSB0aGlzIGNsYXNzIGlzIGRlY2xhcmVkIGluIGEgLmQudHMgZmlsZSBvciBvdGhlcndpc2UgaGFzIGEgbWFudWFsbHkgY3JlYXRlZFxuICAgKiBuZ0NvbXBvbmVudERlZi9uZ0RpcmVjdGl2ZURlZi4gSW4gdGhpcyBjYXNlLCB0aGUgdHlwZSBtZXRhZGF0YSBvZiB0aGF0IGRlZmluaXRpb24gaXMgcmVhZFxuICAgKiB0byBkZXRlcm1pbmUgdGhlIG1ldGFkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBsb29rdXBEaXJlY3RpdmVNZXRhZGF0YShyZWY6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4pOiBTY29wZURpcmVjdGl2ZTxSZWZlcmVuY2U+fG51bGwge1xuICAgIGNvbnN0IG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUocmVmLm5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuICAgIGlmICh0aGlzLl9kaXJlY3RpdmVUb01ldGFkYXRhLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2RpcmVjdGl2ZVRvTWV0YWRhdGEuZ2V0KG5vZGUpICE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLl9yZWFkTWV0YWRhdGFGcm9tQ29tcGlsZWRDbGFzcyhyZWYgYXMgUmVmZXJlbmNlPHRzLkNsYXNzRGVjbGFyYXRpb24+KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGxvb2t1cFBpcGVOYW1lKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogc3RyaW5nfG51bGwge1xuICAgIGlmICh0aGlzLl9waXBlVG9OYW1lLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BpcGVUb05hbWUuZ2V0KG5vZGUpICE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLl9yZWFkTmFtZUZyb21Db21waWxlZENsYXNzKG5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIHRoZSBtZXRhZGF0YSBmcm9tIGEgY2xhc3MgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGNvbXBpbGVkIHNvbWVob3cgKGVpdGhlciBpdCdzIGluIGEgLmQudHNcbiAgICogZmlsZSwgb3IgaW4gYSAudHMgZmlsZSB3aXRoIGEgaGFuZHdyaXR0ZW4gZGVmaW5pdGlvbikuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiB0aGUgY2xhc3Mgb2YgaW50ZXJlc3RcbiAgICogQHBhcmFtIG5nTW9kdWxlSW1wb3J0ZWRGcm9tIG1vZHVsZSBzcGVjaWZpZXIgb2YgdGhlIGltcG9ydCBwYXRoIHRvIGFzc3VtZSBmb3IgYWxsIGRlY2xhcmF0aW9uc1xuICAgKiBzdGVtbWluZyBmcm9tIHRoaXMgbW9kdWxlLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVhZE1vZHVsZURhdGFGcm9tQ29tcGlsZWRDbGFzcyhcbiAgICAgIGNsYXp6OiB0cy5EZWNsYXJhdGlvbiwgbmdNb2R1bGVJbXBvcnRlZEZyb206IHN0cmluZ3xudWxsLFxuICAgICAgcmVzb2x1dGlvbkNvbnRleHQ6IHN0cmluZyk6IE1vZHVsZURhdGF8bnVsbCB7XG4gICAgLy8gVGhpcyBvcGVyYXRpb24gaXMgZXhwbGljaXRseSBub3QgbWVtb2l6ZWQsIGFzIGl0IGRlcGVuZHMgb24gYG5nTW9kdWxlSW1wb3J0ZWRGcm9tYC5cbiAgICAvLyBUT0RPKGFseGh1Yik6IGludmVzdGlnYXRlIGNhY2hpbmcgb2YgLmQudHMgbW9kdWxlIG1ldGFkYXRhLlxuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIG1lbWJlciA9PiBtZW1iZXIubmFtZSA9PT0gJ25nTW9kdWxlRGVmJyAmJiBtZW1iZXIuaXNTdGF0aWMpO1xuICAgIGlmIChuZ01vZHVsZURlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICAvLyBWYWxpZGF0ZSB0aGF0IHRoZSBzaGFwZSBvZiB0aGUgbmdNb2R1bGVEZWYgdHlwZSBpcyBjb3JyZWN0LlxuICAgICAgICBuZ01vZHVsZURlZi50eXBlID09PSBudWxsIHx8ICF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKG5nTW9kdWxlRGVmLnR5cGUpIHx8XG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggIT09IDQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFJlYWQgdGhlIE1vZHVsZURhdGEgb3V0IG9mIHRoZSB0eXBlIGFyZ3VtZW50cy5cbiAgICBjb25zdCBbXywgZGVjbGFyYXRpb25NZXRhZGF0YSwgaW1wb3J0TWV0YWRhdGEsIGV4cG9ydE1ldGFkYXRhXSA9IG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cztcbiAgICByZXR1cm4ge1xuICAgICAgZGVjbGFyYXRpb25zOiB0aGlzLl9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKFxuICAgICAgICAgIGRlY2xhcmF0aW9uTWV0YWRhdGEsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tLCByZXNvbHV0aW9uQ29udGV4dCksXG4gICAgICBleHBvcnRzOlxuICAgICAgICAgIHRoaXMuX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoZXhwb3J0TWV0YWRhdGEsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tLCByZXNvbHV0aW9uQ29udGV4dCksXG4gICAgICBpbXBvcnRzOlxuICAgICAgICAgIHRoaXMuX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoaW1wb3J0TWV0YWRhdGEsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tLCByZXNvbHV0aW9uQ29udGV4dCksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHNlbGVjdG9yIGZyb20gdHlwZSBtZXRhZGF0YSBmb3IgYSBjbGFzcyB3aXRoIGEgcHJlY29tcGlsZWQgbmdDb21wb25lbnREZWYgb3JcbiAgICogbmdEaXJlY3RpdmVEZWYuXG4gICAqL1xuICBwcml2YXRlIF9yZWFkTWV0YWRhdGFGcm9tQ29tcGlsZWRDbGFzcyhyZWY6IFJlZmVyZW5jZTx0cy5DbGFzc0RlY2xhcmF0aW9uPik6XG4gICAgICBTY29wZURpcmVjdGl2ZTxSZWZlcmVuY2U+fG51bGwge1xuICAgIGNvbnN0IGNsYXp6ID0gdHMuZ2V0T3JpZ2luYWxOb2RlKHJlZi5ub2RlKSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uO1xuICAgIGNvbnN0IGRlZiA9IHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KS5maW5kKFxuICAgICAgICBmaWVsZCA9PlxuICAgICAgICAgICAgZmllbGQuaXNTdGF0aWMgJiYgKGZpZWxkLm5hbWUgPT09ICduZ0NvbXBvbmVudERlZicgfHwgZmllbGQubmFtZSA9PT0gJ25nRGlyZWN0aXZlRGVmJykpO1xuICAgIGlmIChkZWYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gTm8gZGVmaW5pdGlvbiBjb3VsZCBiZSBmb3VuZC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIGRlZi50eXBlID09PSBudWxsIHx8ICF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGRlZi50eXBlKSB8fFxuICAgICAgICBkZWYudHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgZGVmLnR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAvLyBUaGUgdHlwZSBtZXRhZGF0YSB3YXMgdGhlIHdyb25nIHNoYXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHNlbGVjdG9yID0gcmVhZFN0cmluZ1R5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1sxXSk7XG4gICAgaWYgKHNlbGVjdG9yID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcmVmLFxuICAgICAgbmFtZTogY2xhenoubmFtZSAhLnRleHQsXG4gICAgICBkaXJlY3RpdmU6IHJlZixcbiAgICAgIGlzQ29tcG9uZW50OiBkZWYubmFtZSA9PT0gJ25nQ29tcG9uZW50RGVmJywgc2VsZWN0b3IsXG4gICAgICBleHBvcnRBczogcmVhZFN0cmluZ1R5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1syXSksXG4gICAgICBpbnB1dHM6IHJlYWRTdHJpbmdNYXBUeXBlKGRlZi50eXBlLnR5cGVBcmd1bWVudHNbM10pLFxuICAgICAgb3V0cHV0czogcmVhZFN0cmluZ01hcFR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1s0XSksXG4gICAgICBxdWVyaWVzOiByZWFkU3RyaW5nQXJyYXlUeXBlKGRlZi50eXBlLnR5cGVBcmd1bWVudHNbNV0pLFxuICAgICAgLi4uZXh0cmFjdERpcmVjdGl2ZUd1YXJkcyhjbGF6eiwgdGhpcy5yZWZsZWN0b3IpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBzZWxlY3RvciBmcm9tIHR5cGUgbWV0YWRhdGEgZm9yIGEgY2xhc3Mgd2l0aCBhIHByZWNvbXBpbGVkIG5nQ29tcG9uZW50RGVmIG9yXG4gICAqIG5nRGlyZWN0aXZlRGVmLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVhZE5hbWVGcm9tQ29tcGlsZWRDbGFzcyhjbGF6ejogdHMuRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3QgZGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIGZpZWxkID0+IGZpZWxkLmlzU3RhdGljICYmIGZpZWxkLm5hbWUgPT09ICduZ1BpcGVEZWYnKTtcbiAgICBpZiAoZGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE5vIGRlZmluaXRpb24gY291bGQgYmUgZm91bmQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBkZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkZWYudHlwZSkgfHxcbiAgICAgICAgZGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IGRlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyBzaGFwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB0eXBlID0gZGVmLnR5cGUudHlwZUFyZ3VtZW50c1sxXTtcbiAgICBpZiAoIXRzLmlzTGl0ZXJhbFR5cGVOb2RlKHR5cGUpIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwodHlwZS5saXRlcmFsKSkge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyB0eXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0eXBlLmxpdGVyYWwudGV4dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIGEgYFR5cGVOb2RlYCB3aGljaCBpcyBhIHR1cGxlIG9mIHJlZmVyZW5jZXMgdG8gb3RoZXIgdHlwZXMsIGFuZCByZXR1cm4gYFJlZmVyZW5jZWBzIHRvXG4gICAqIHRoZW0uXG4gICAqXG4gICAqIFRoaXMgb3BlcmF0aW9uIGFzc3VtZXMgdGhhdCB0aGVzZSB0eXBlcyBzaG91bGQgYmUgaW1wb3J0ZWQgZnJvbSBgbmdNb2R1bGVJbXBvcnRlZEZyb21gIHVubGVzc1xuICAgKiB0aGV5IHRoZW1zZWx2ZXMgd2VyZSBpbXBvcnRlZCBmcm9tIGFub3RoZXIgYWJzb2x1dGUgcGF0aC5cbiAgICovXG4gIHByaXZhdGUgX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoXG4gICAgICBkZWY6IHRzLlR5cGVOb2RlLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nfG51bGwsXG4gICAgICByZXNvbHV0aW9uQ29udGV4dDogc3RyaW5nKTogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdIHtcbiAgICBpZiAoIXRzLmlzVHVwbGVUeXBlTm9kZShkZWYpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBkZWYuZWxlbWVudFR5cGVzLm1hcChlbGVtZW50ID0+IHtcbiAgICAgIGlmICghdHMuaXNUeXBlUXVlcnlOb2RlKGVsZW1lbnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgVHlwZVF1ZXJ5Tm9kZWApO1xuICAgICAgfVxuICAgICAgY29uc3QgdHlwZSA9IGVsZW1lbnQuZXhwck5hbWU7XG4gICAgICBpZiAobmdNb2R1bGVJbXBvcnRlZEZyb20gIT09IG51bGwpIHtcbiAgICAgICAgY29uc3Qge25vZGUsIGZyb219ID0gcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9uKHR5cGUsIHRoaXMuY2hlY2tlcik7XG4gICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSAoZnJvbSAhPT0gbnVsbCAmJiAhZnJvbS5zdGFydHNXaXRoKCcuJykgPyBmcm9tIDogbmdNb2R1bGVJbXBvcnRlZEZyb20pO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlci5yZXNvbHZlKG5vZGUsIG1vZHVsZU5hbWUsIHJlc29sdXRpb25Db250ZXh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHtub2RlfSA9IHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbih0eXBlLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlci5yZXNvbHZlKG5vZGUsIG51bGwsIHJlc29sdXRpb25Db250ZXh0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmbGF0dGVuPFQ+KGFycmF5OiBUW11bXSk6IFRbXSB7XG4gIHJldHVybiBhcnJheS5yZWR1Y2UoKGFjY3VtLCBzdWJBcnJheSkgPT4ge1xuICAgIGFjY3VtLnB1c2goLi4uc3ViQXJyYXkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfSwgW10gYXMgVFtdKTtcbn1cblxuZnVuY3Rpb24gYWJzb2x1dGVNb2R1bGVOYW1lKHJlZjogUmVmZXJlbmNlKTogc3RyaW5nfG51bGwge1xuICBpZiAoIShyZWYgaW5zdGFuY2VvZiBBYnNvbHV0ZVJlZmVyZW5jZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gcmVmLm1vZHVsZU5hbWU7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnREaXJlY3RpdmVSZWZlcmVuY2VMaXN0KFxuICAgIGlucHV0OiBTY29wZURpcmVjdGl2ZTxSZWZlcmVuY2U+W10sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBTY29wZURpcmVjdGl2ZTxFeHByZXNzaW9uPltdIHtcbiAgcmV0dXJuIGlucHV0Lm1hcChtZXRhID0+IHtcbiAgICBjb25zdCBkaXJlY3RpdmUgPSBtZXRhLmRpcmVjdGl2ZS50b0V4cHJlc3Npb24oY29udGV4dCk7XG4gICAgaWYgKGRpcmVjdGl2ZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3Qgd3JpdGUgZXhwcmVzc2lvbiB0byByZWZlcmVuY2UgJHttZXRhLmRpcmVjdGl2ZS5ub2RlfWApO1xuICAgIH1cbiAgICByZXR1cm4gey4uLm1ldGEsIGRpcmVjdGl2ZX07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0UGlwZVJlZmVyZW5jZU1hcChcbiAgICBtYXA6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPiB7XG4gIGNvbnN0IG5ld01hcCA9IG5ldyBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPigpO1xuICBtYXAuZm9yRWFjaCgobWV0YSwgc2VsZWN0b3IpID0+IHtcbiAgICBjb25zdCBwaXBlID0gbWV0YS50b0V4cHJlc3Npb24oY29udGV4dCk7XG4gICAgaWYgKHBpcGUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHdyaXRlIGV4cHJlc3Npb24gdG8gcmVmZXJlbmNlICR7bWV0YS5ub2RlfWApO1xuICAgIH1cbiAgICBuZXdNYXAuc2V0KHNlbGVjdG9yLCBwaXBlKTtcbiAgfSk7XG4gIHJldHVybiBuZXdNYXA7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRTY29wZVRvRXhwcmVzc2lvbnMoXG4gICAgc2NvcGU6IENvbXBpbGF0aW9uU2NvcGU8UmVmZXJlbmNlPiwgY29udGV4dDogdHMuRGVjbGFyYXRpb24pOiBDb21waWxhdGlvblNjb3BlPEV4cHJlc3Npb24+IHtcbiAgY29uc3Qgc291cmNlQ29udGV4dCA9IHRzLmdldE9yaWdpbmFsTm9kZShjb250ZXh0KS5nZXRTb3VyY2VGaWxlKCk7XG4gIGNvbnN0IGRpcmVjdGl2ZXMgPSBjb252ZXJ0RGlyZWN0aXZlUmVmZXJlbmNlTGlzdChzY29wZS5kaXJlY3RpdmVzLCBzb3VyY2VDb250ZXh0KTtcbiAgY29uc3QgcGlwZXMgPSBjb252ZXJ0UGlwZVJlZmVyZW5jZU1hcChzY29wZS5waXBlcywgc291cmNlQ29udGV4dCk7XG4gIGNvbnN0IGRlY2xQb2ludGVyID0gbWF5YmVVbndyYXBOYW1lT2ZEZWNsYXJhdGlvbihjb250ZXh0KTtcbiAgbGV0IGNvbnRhaW5zRm9yd2FyZERlY2xzID0gZmFsc2U7XG4gIGRpcmVjdGl2ZXMuZm9yRWFjaChtZXRhID0+IHtcbiAgICBjb250YWluc0ZvcndhcmREZWNscyA9IGNvbnRhaW5zRm9yd2FyZERlY2xzIHx8XG4gICAgICAgIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UobWV0YS5kaXJlY3RpdmUsIGRlY2xQb2ludGVyLCBzb3VyY2VDb250ZXh0KTtcbiAgfSk7XG4gICFjb250YWluc0ZvcndhcmREZWNscyAmJiBwaXBlcy5mb3JFYWNoKGV4cHIgPT4ge1xuICAgIGNvbnRhaW5zRm9yd2FyZERlY2xzID1cbiAgICAgICAgY29udGFpbnNGb3J3YXJkRGVjbHMgfHwgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShleHByLCBkZWNsUG9pbnRlciwgc291cmNlQ29udGV4dCk7XG4gIH0pO1xuICByZXR1cm4ge2RpcmVjdGl2ZXMsIHBpcGVzLCBjb250YWluc0ZvcndhcmREZWNsc307XG59XG5cbmZ1bmN0aW9uIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UoXG4gICAgZXhwcjogRXhwcmVzc2lvbiwgY29udGV4dDogdHMuTm9kZSwgY29udGV4dFNvdXJjZTogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICBpZiAoaXNXcmFwcGVkVHNOb2RlRXhwcihleHByKSkge1xuICAgIGNvbnN0IG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUoZXhwci5ub2RlKTtcbiAgICByZXR1cm4gbm9kZS5nZXRTb3VyY2VGaWxlKCkgPT09IGNvbnRleHRTb3VyY2UgJiYgY29udGV4dC5wb3MgPCBub2RlLnBvcztcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzV3JhcHBlZFRzTm9kZUV4cHIoZXhwcjogRXhwcmVzc2lvbik6IGV4cHIgaXMgV3JhcHBlZE5vZGVFeHByPHRzLk5vZGU+IHtcbiAgcmV0dXJuIGV4cHIgaW5zdGFuY2VvZiBXcmFwcGVkTm9kZUV4cHI7XG59XG5cbmZ1bmN0aW9uIG1heWJlVW53cmFwTmFtZU9mRGVjbGFyYXRpb24oZGVjbDogdHMuRGVjbGFyYXRpb24pOiB0cy5EZWNsYXJhdGlvbnx0cy5JZGVudGlmaWVyIHtcbiAgaWYgKCh0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjbCkgfHwgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2wpKSAmJiBkZWNsLm5hbWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkpIHtcbiAgICByZXR1cm4gZGVjbC5uYW1lO1xuICB9XG4gIHJldHVybiBkZWNsO1xufVxuXG5mdW5jdGlvbiByZWFkU3RyaW5nVHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IHN0cmluZ3xudWxsIHtcbiAgaWYgKCF0cy5pc0xpdGVyYWxUeXBlTm9kZSh0eXBlKSB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKHR5cGUubGl0ZXJhbCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gdHlwZS5saXRlcmFsLnRleHQ7XG59XG5cbmZ1bmN0aW9uIHJlYWRTdHJpbmdNYXBUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKToge1trZXk6IHN0cmluZ106IHN0cmluZ30ge1xuICBpZiAoIXRzLmlzVHlwZUxpdGVyYWxOb2RlKHR5cGUpKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG4gIGNvbnN0IG9iajoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgdHlwZS5tZW1iZXJzLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICBpZiAoIXRzLmlzUHJvcGVydHlTaWduYXR1cmUobWVtYmVyKSB8fCBtZW1iZXIudHlwZSA9PT0gdW5kZWZpbmVkIHx8IG1lbWJlci5uYW1lID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIXRzLmlzU3RyaW5nTGl0ZXJhbChtZW1iZXIubmFtZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdmFsdWUgPSByZWFkU3RyaW5nVHlwZShtZW1iZXIudHlwZSk7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgb2JqW21lbWJlci5uYW1lLnRleHRdID0gdmFsdWU7XG4gIH0pO1xuICByZXR1cm4gb2JqO1xufVxuXG5mdW5jdGlvbiByZWFkU3RyaW5nQXJyYXlUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKTogc3RyaW5nW10ge1xuICBpZiAoIXRzLmlzVHVwbGVUeXBlTm9kZSh0eXBlKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCByZXM6IHN0cmluZ1tdID0gW107XG4gIHR5cGUuZWxlbWVudFR5cGVzLmZvckVhY2goZWwgPT4ge1xuICAgIGlmICghdHMuaXNMaXRlcmFsVHlwZU5vZGUoZWwpIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwoZWwubGl0ZXJhbCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLnB1c2goZWwubGl0ZXJhbC50ZXh0KTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG4iXX0=