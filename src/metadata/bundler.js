(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/metadata/bundler", ["require", "exports", "tslib", "path", "typescript", "@angular/compiler-cli/src/metadata/collector", "@angular/compiler-cli/src/metadata/schema"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var path = require("path");
    var ts = require("typescript");
    var collector_1 = require("@angular/compiler-cli/src/metadata/collector");
    var schema_1 = require("@angular/compiler-cli/src/metadata/schema");
    // The character set used to produce private names.
    var PRIVATE_NAME_CHARS = 'abcdefghijklmnopqrstuvwxyz';
    var MetadataBundler = /** @class */ (function () {
        function MetadataBundler(root, importAs, host, privateSymbolPrefix) {
            this.root = root;
            this.importAs = importAs;
            this.host = host;
            this.symbolMap = new Map();
            this.metadataCache = new Map();
            this.exports = new Map();
            this.rootModule = "./" + path.basename(root);
            this.privateSymbolPrefix = (privateSymbolPrefix || '').replace(/\W/g, '_');
        }
        MetadataBundler.prototype.getMetadataBundle = function () {
            // Export the root module. This also collects the transitive closure of all values referenced by
            // the exports.
            var exportedSymbols = this.exportAll(this.rootModule);
            this.canonicalizeSymbols(exportedSymbols);
            // TODO: exports? e.g. a module re-exports a symbol from another bundle
            var metadata = this.getEntries(exportedSymbols);
            var privates = Array.from(this.symbolMap.values())
                .filter(function (s) { return s.referenced && s.isPrivate; })
                .map(function (s) { return ({
                privateName: s.privateName,
                name: s.declaration.name,
                module: s.declaration.module
            }); });
            var origins = Array.from(this.symbolMap.values())
                .filter(function (s) { return s.referenced && !s.reexport; })
                .reduce(function (p, s) {
                p[s.isPrivate ? s.privateName : s.name] = s.declaration.module;
                return p;
            }, {});
            var exports = this.getReExports(exportedSymbols);
            return {
                metadata: {
                    __symbolic: 'module',
                    version: schema_1.METADATA_VERSION,
                    exports: exports.length ? exports : undefined, metadata: metadata, origins: origins,
                    importAs: this.importAs
                },
                privates: privates
            };
        };
        MetadataBundler.resolveModule = function (importName, from) {
            return resolveModule(importName, from);
        };
        MetadataBundler.prototype.getMetadata = function (moduleName) {
            var result = this.metadataCache.get(moduleName);
            if (!result) {
                if (moduleName.startsWith('.')) {
                    var fullModuleName = resolveModule(moduleName, this.root);
                    result = this.host.getMetadataFor(fullModuleName, this.root);
                }
                this.metadataCache.set(moduleName, result);
            }
            return result;
        };
        MetadataBundler.prototype.exportAll = function (moduleName) {
            var _this = this;
            var e_1, _a, e_2, _b, e_3, _c;
            var module = this.getMetadata(moduleName);
            var result = this.exports.get(moduleName);
            if (result) {
                return result;
            }
            result = [];
            var exportSymbol = function (exportedSymbol, exportAs) {
                var symbol = _this.symbolOf(moduleName, exportAs);
                result.push(symbol);
                exportedSymbol.reexportedAs = symbol;
                symbol.exports = exportedSymbol;
            };
            // Export all the symbols defined in this module.
            if (module && module.metadata) {
                for (var key in module.metadata) {
                    var data = module.metadata[key];
                    if (schema_1.isMetadataImportedSymbolReferenceExpression(data)) {
                        // This is a re-export of an imported symbol. Record this as a re-export.
                        var exportFrom = resolveModule(data.module, moduleName);
                        this.exportAll(exportFrom);
                        var symbol = this.symbolOf(exportFrom, data.name);
                        exportSymbol(symbol, key);
                    }
                    else {
                        // Record that this symbol is exported by this module.
                        result.push(this.symbolOf(moduleName, key));
                    }
                }
            }
            // Export all the re-exports from this module
            if (module && module.exports) {
                var unnamedModuleExportsIdx = 0;
                try {
                    for (var _d = tslib_1.__values(module.exports), _e = _d.next(); !_e.done; _e = _d.next()) {
                        var exportDeclaration = _e.value;
                        var exportFrom = resolveModule(exportDeclaration.from, moduleName);
                        // Record all the exports from the module even if we don't use it directly.
                        var exportedSymbols = this.exportAll(exportFrom);
                        if (exportDeclaration.export) {
                            try {
                                // Re-export all the named exports from a module.
                                for (var _f = tslib_1.__values(exportDeclaration.export), _g = _f.next(); !_g.done; _g = _f.next()) {
                                    var exportItem = _g.value;
                                    var name = typeof exportItem == 'string' ? exportItem : exportItem.name;
                                    var exportAs = typeof exportItem == 'string' ? exportItem : exportItem.as;
                                    var symbol = this.symbolOf(exportFrom, name);
                                    if (exportedSymbols && exportedSymbols.length == 1 && exportedSymbols[0].reexport &&
                                        exportedSymbols[0].name == '*') {
                                        // This is a named export from a module we have no metadata about. Record the named
                                        // export as a re-export.
                                        symbol.reexport = true;
                                    }
                                    exportSymbol(this.symbolOf(exportFrom, name), exportAs);
                                }
                            }
                            catch (e_2_1) { e_2 = { error: e_2_1 }; }
                            finally {
                                try {
                                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                                }
                                finally { if (e_2) throw e_2.error; }
                            }
                        }
                        else {
                            // Re-export all the symbols from the module
                            var exportedSymbols_2 = this.exportAll(exportFrom);
                            try {
                                for (var exportedSymbols_1 = tslib_1.__values(exportedSymbols_2), exportedSymbols_1_1 = exportedSymbols_1.next(); !exportedSymbols_1_1.done; exportedSymbols_1_1 = exportedSymbols_1.next()) {
                                    var exportedSymbol = exportedSymbols_1_1.value;
                                    // In case the exported symbol does not have a name, we need to give it an unique
                                    // name for the current module. This is necessary because there can be multiple
                                    // unnamed re-exports in a given module.
                                    var name = exportedSymbol.name === '*' ?
                                        "unnamed_reexport_" + unnamedModuleExportsIdx++ :
                                        exportedSymbol.name;
                                    exportSymbol(exportedSymbol, name);
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (exportedSymbols_1_1 && !exportedSymbols_1_1.done && (_c = exportedSymbols_1.return)) _c.call(exportedSymbols_1);
                                }
                                finally { if (e_3) throw e_3.error; }
                            }
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            if (!module) {
                // If no metadata is found for this import then it is considered external to the
                // library and should be recorded as a re-export in the final metadata if it is
                // eventually re-exported.
                var symbol = this.symbolOf(moduleName, '*');
                symbol.reexport = true;
                result.push(symbol);
            }
            this.exports.set(moduleName, result);
            return result;
        };
        /**
         * Fill in the canonicalSymbol which is the symbol that should be imported by factories.
         * The canonical symbol is the one exported by the index file for the bundle or definition
         * symbol for private symbols that are not exported by bundle index.
         */
        MetadataBundler.prototype.canonicalizeSymbols = function (exportedSymbols) {
            var symbols = Array.from(this.symbolMap.values());
            this.exported = new Set(exportedSymbols);
            symbols.forEach(this.canonicalizeSymbol, this);
        };
        MetadataBundler.prototype.canonicalizeSymbol = function (symbol) {
            var rootExport = getRootExport(symbol);
            var declaration = getSymbolDeclaration(symbol);
            var isPrivate = !this.exported.has(rootExport);
            var canonicalSymbol = isPrivate ? declaration : rootExport;
            symbol.isPrivate = isPrivate;
            symbol.declaration = declaration;
            symbol.canonicalSymbol = canonicalSymbol;
            symbol.reexport = declaration.reexport;
        };
        MetadataBundler.prototype.getEntries = function (exportedSymbols) {
            var _this = this;
            var result = {};
            var exportedNames = new Set(exportedSymbols.map(function (s) { return s.name; }));
            var privateName = 0;
            function newPrivateName(prefix) {
                while (true) {
                    var digits = [];
                    var index = privateName++;
                    var base = PRIVATE_NAME_CHARS;
                    while (!digits.length || index > 0) {
                        digits.unshift(base[index % base.length]);
                        index = Math.floor(index / base.length);
                    }
                    var result_1 = "\u0275" + prefix + digits.join('');
                    if (!exportedNames.has(result_1))
                        return result_1;
                }
            }
            exportedSymbols.forEach(function (symbol) { return _this.convertSymbol(symbol); });
            var symbolsMap = new Map();
            Array.from(this.symbolMap.values()).forEach(function (symbol) {
                if (symbol.referenced && !symbol.reexport) {
                    var name = symbol.name;
                    var identifier = symbol.declaration.module + ":" + symbol.declaration.name;
                    if (symbol.isPrivate && !symbol.privateName) {
                        name = newPrivateName(_this.privateSymbolPrefix);
                        symbol.privateName = name;
                    }
                    if (symbolsMap.has(identifier)) {
                        var names = symbolsMap.get(identifier);
                        names.push(name);
                    }
                    else {
                        symbolsMap.set(identifier, [name]);
                    }
                    result[name] = symbol.value;
                }
            });
            // check for duplicated entries
            symbolsMap.forEach(function (names, identifier) {
                if (names.length > 1) {
                    var _a = tslib_1.__read(identifier.split(':'), 2), module_1 = _a[0], declaredName = _a[1];
                    // prefer the export that uses the declared name (if any)
                    var reference_1 = names.indexOf(declaredName);
                    if (reference_1 === -1) {
                        reference_1 = 0;
                    }
                    // keep one entry and replace the others by references
                    names.forEach(function (name, i) {
                        if (i !== reference_1) {
                            result[name] = { __symbolic: 'reference', name: names[reference_1] };
                        }
                    });
                }
            });
            return result;
        };
        MetadataBundler.prototype.getReExports = function (exportedSymbols) {
            var e_4, _a;
            var modules = new Map();
            var exportAlls = new Set();
            try {
                for (var exportedSymbols_3 = tslib_1.__values(exportedSymbols), exportedSymbols_3_1 = exportedSymbols_3.next(); !exportedSymbols_3_1.done; exportedSymbols_3_1 = exportedSymbols_3.next()) {
                    var symbol = exportedSymbols_3_1.value;
                    if (symbol.reexport) {
                        // symbol.declaration is guaranteed to be defined during the phase this method is called.
                        var declaration = symbol.declaration;
                        var module_2 = declaration.module;
                        if (declaration.name == '*') {
                            // Reexport all the symbols.
                            exportAlls.add(declaration.module);
                        }
                        else {
                            // Re-export the symbol as the exported name.
                            var entry = modules.get(module_2);
                            if (!entry) {
                                entry = [];
                                modules.set(module_2, entry);
                            }
                            var as = symbol.name;
                            var name = declaration.name;
                            entry.push({ name: name, as: as });
                        }
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (exportedSymbols_3_1 && !exportedSymbols_3_1.done && (_a = exportedSymbols_3.return)) _a.call(exportedSymbols_3);
                }
                finally { if (e_4) throw e_4.error; }
            }
            return tslib_1.__spread(Array.from(exportAlls.values()).map(function (from) { return ({ from: from }); }), Array.from(modules.entries()).map(function (_a) {
                var _b = tslib_1.__read(_a, 2), from = _b[0], exports = _b[1];
                return ({ export: exports, from: from });
            }));
        };
        MetadataBundler.prototype.convertSymbol = function (symbol) {
            // canonicalSymbol is ensured to be defined before this is called.
            var canonicalSymbol = symbol.canonicalSymbol;
            if (!canonicalSymbol.referenced) {
                canonicalSymbol.referenced = true;
                // declaration is ensured to be definded before this method is called.
                var declaration = canonicalSymbol.declaration;
                var module_3 = this.getMetadata(declaration.module);
                if (module_3) {
                    var value = module_3.metadata[declaration.name];
                    if (value && !declaration.name.startsWith('___')) {
                        canonicalSymbol.value = this.convertEntry(declaration.module, value);
                    }
                }
            }
        };
        MetadataBundler.prototype.convertEntry = function (moduleName, value) {
            if (schema_1.isClassMetadata(value)) {
                return this.convertClass(moduleName, value);
            }
            if (schema_1.isFunctionMetadata(value)) {
                return this.convertFunction(moduleName, value);
            }
            if (schema_1.isInterfaceMetadata(value)) {
                return value;
            }
            return this.convertValue(moduleName, value);
        };
        MetadataBundler.prototype.convertClass = function (moduleName, value) {
            var _this = this;
            return {
                __symbolic: 'class',
                arity: value.arity,
                extends: this.convertExpression(moduleName, value.extends),
                decorators: value.decorators && value.decorators.map(function (d) { return _this.convertExpression(moduleName, d); }),
                members: this.convertMembers(moduleName, value.members),
                statics: value.statics && this.convertStatics(moduleName, value.statics)
            };
        };
        MetadataBundler.prototype.convertMembers = function (moduleName, members) {
            var _this = this;
            var result = {};
            for (var name in members) {
                var value = members[name];
                result[name] = value.map(function (v) { return _this.convertMember(moduleName, v); });
            }
            return result;
        };
        MetadataBundler.prototype.convertMember = function (moduleName, member) {
            var _this = this;
            var result = { __symbolic: member.__symbolic };
            result.decorators =
                member.decorators && member.decorators.map(function (d) { return _this.convertExpression(moduleName, d); });
            if (schema_1.isMethodMetadata(member)) {
                result.parameterDecorators = member.parameterDecorators &&
                    member.parameterDecorators.map(function (d) { return d && d.map(function (p) { return _this.convertExpression(moduleName, p); }); });
                if (schema_1.isConstructorMetadata(member)) {
                    if (member.parameters) {
                        result.parameters =
                            member.parameters.map(function (p) { return _this.convertExpression(moduleName, p); });
                    }
                }
            }
            return result;
        };
        MetadataBundler.prototype.convertStatics = function (moduleName, statics) {
            var result = {};
            for (var key in statics) {
                var value = statics[key];
                if (schema_1.isFunctionMetadata(value)) {
                    result[key] = this.convertFunction(moduleName, value);
                }
                else if (schema_1.isMetadataSymbolicCallExpression(value)) {
                    // Class members can also contain static members that call a function with module
                    // references. e.g. "static ngInjectableDef = ΔdefineInjectable(..)". We also need to
                    // convert these module references because otherwise these resolve to non-existent files.
                    result[key] = this.convertValue(moduleName, value);
                }
                else {
                    result[key] = value;
                }
            }
            return result;
        };
        MetadataBundler.prototype.convertFunction = function (moduleName, value) {
            var _this = this;
            return {
                __symbolic: 'function',
                parameters: value.parameters,
                defaults: value.defaults && value.defaults.map(function (v) { return _this.convertValue(moduleName, v); }),
                value: this.convertValue(moduleName, value.value)
            };
        };
        MetadataBundler.prototype.convertValue = function (moduleName, value) {
            var _this = this;
            if (isPrimitive(value)) {
                return value;
            }
            if (schema_1.isMetadataError(value)) {
                return this.convertError(moduleName, value);
            }
            if (schema_1.isMetadataSymbolicExpression(value)) {
                return this.convertExpression(moduleName, value);
            }
            if (Array.isArray(value)) {
                return value.map(function (v) { return _this.convertValue(moduleName, v); });
            }
            // Otherwise it is a metadata object.
            var object = value;
            var result = {};
            for (var key in object) {
                result[key] = this.convertValue(moduleName, object[key]);
            }
            return result;
        };
        MetadataBundler.prototype.convertExpression = function (moduleName, value) {
            if (value) {
                switch (value.__symbolic) {
                    case 'error':
                        return this.convertError(moduleName, value);
                    case 'reference':
                        return this.convertReference(moduleName, value);
                    default:
                        return this.convertExpressionNode(moduleName, value);
                }
            }
            return value;
        };
        MetadataBundler.prototype.convertError = function (module, value) {
            return {
                __symbolic: 'error',
                message: value.message,
                line: value.line,
                character: value.character,
                context: value.context, module: module
            };
        };
        MetadataBundler.prototype.convertReference = function (moduleName, value) {
            var _this = this;
            var createReference = function (symbol) {
                var declaration = symbol.declaration;
                if (declaration.module.startsWith('.')) {
                    // Reference to a symbol defined in the module. Ensure it is converted then return a
                    // references to the final symbol.
                    _this.convertSymbol(symbol);
                    return {
                        __symbolic: 'reference',
                        get name() {
                            // Resolved lazily because private names are assigned late.
                            var canonicalSymbol = symbol.canonicalSymbol;
                            if (canonicalSymbol.isPrivate == null) {
                                throw Error('Invalid state: isPrivate was not initialized');
                            }
                            return canonicalSymbol.isPrivate ? canonicalSymbol.privateName : canonicalSymbol.name;
                        }
                    };
                }
                else {
                    // The symbol was a re-exported symbol from another module. Return a reference to the
                    // original imported symbol.
                    return { __symbolic: 'reference', name: declaration.name, module: declaration.module };
                }
            };
            if (schema_1.isMetadataGlobalReferenceExpression(value)) {
                var metadata = this.getMetadata(moduleName);
                if (metadata && metadata.metadata && metadata.metadata[value.name]) {
                    // Reference to a symbol defined in the module
                    return createReference(this.canonicalSymbolOf(moduleName, value.name));
                }
                // If a reference has arguments, the arguments need to be converted.
                if (value.arguments) {
                    return {
                        __symbolic: 'reference',
                        name: value.name,
                        arguments: value.arguments.map(function (a) { return _this.convertValue(moduleName, a); })
                    };
                }
                // Global references without arguments (such as to Math or JSON) are unmodified.
                return value;
            }
            if (schema_1.isMetadataImportedSymbolReferenceExpression(value)) {
                // References to imported symbols are separated into two, references to bundled modules and
                // references to modules external to the bundle. If the module reference is relative it is
                // assumed to be in the bundle. If it is Global it is assumed to be outside the bundle.
                // References to symbols outside the bundle are left unmodified. References to symbol inside
                // the bundle need to be converted to a bundle import reference reachable from the bundle
                // index.
                if (value.module.startsWith('.')) {
                    // Reference is to a symbol defined inside the module. Convert the reference to a reference
                    // to the canonical symbol.
                    var referencedModule = resolveModule(value.module, moduleName);
                    var referencedName = value.name;
                    return createReference(this.canonicalSymbolOf(referencedModule, referencedName));
                }
                // Value is a reference to a symbol defined outside the module.
                if (value.arguments) {
                    // If a reference has arguments the arguments need to be converted.
                    return {
                        __symbolic: 'reference',
                        name: value.name,
                        module: value.module,
                        arguments: value.arguments.map(function (a) { return _this.convertValue(moduleName, a); })
                    };
                }
                return value;
            }
            if (schema_1.isMetadataModuleReferenceExpression(value)) {
                // Cannot support references to bundled modules as the internal modules of a bundle are erased
                // by the bundler.
                if (value.module.startsWith('.')) {
                    return {
                        __symbolic: 'error',
                        message: 'Unsupported bundled module reference',
                        context: { module: value.module }
                    };
                }
                // References to unbundled modules are unmodified.
                return value;
            }
        };
        MetadataBundler.prototype.convertExpressionNode = function (moduleName, value) {
            var result = { __symbolic: value.__symbolic };
            for (var key in value) {
                result[key] = this.convertValue(moduleName, value[key]);
            }
            return result;
        };
        MetadataBundler.prototype.symbolOf = function (module, name) {
            var symbolKey = module + ":" + name;
            var symbol = this.symbolMap.get(symbolKey);
            if (!symbol) {
                symbol = { module: module, name: name };
                this.symbolMap.set(symbolKey, symbol);
            }
            return symbol;
        };
        MetadataBundler.prototype.canonicalSymbolOf = function (module, name) {
            // Ensure the module has been seen.
            this.exportAll(module);
            var symbol = this.symbolOf(module, name);
            if (!symbol.canonicalSymbol) {
                this.canonicalizeSymbol(symbol);
            }
            return symbol;
        };
        return MetadataBundler;
    }());
    exports.MetadataBundler = MetadataBundler;
    var CompilerHostAdapter = /** @class */ (function () {
        function CompilerHostAdapter(host, cache, options) {
            this.host = host;
            this.cache = cache;
            this.options = options;
            this.collector = new collector_1.MetadataCollector();
        }
        CompilerHostAdapter.prototype.getMetadataFor = function (fileName, containingFile) {
            var resolvedModule = ts.resolveModuleName(fileName, containingFile, this.options, this.host).resolvedModule;
            var sourceFile;
            if (resolvedModule) {
                var resolvedFileName = resolvedModule.resolvedFileName;
                if (resolvedModule.extension !== '.ts') {
                    resolvedFileName = resolvedFileName.replace(/(\.d\.ts|\.js)$/, '.ts');
                }
                sourceFile = this.host.getSourceFile(resolvedFileName, ts.ScriptTarget.Latest);
            }
            else {
                // If typescript is unable to resolve the file, fallback on old behavior
                if (!this.host.fileExists(fileName + '.ts'))
                    return undefined;
                sourceFile = this.host.getSourceFile(fileName + '.ts', ts.ScriptTarget.Latest);
            }
            // If there is a metadata cache, use it to get the metadata for this source file. Otherwise,
            // fall back on the locally created MetadataCollector.
            if (!sourceFile) {
                return undefined;
            }
            else if (this.cache) {
                return this.cache.getMetadata(sourceFile);
            }
            else {
                return this.collector.getMetadata(sourceFile);
            }
        };
        return CompilerHostAdapter;
    }());
    exports.CompilerHostAdapter = CompilerHostAdapter;
    function resolveModule(importName, from) {
        if (importName.startsWith('.') && from) {
            var normalPath = path.normalize(path.join(path.dirname(from), importName));
            if (!normalPath.startsWith('.') && from.startsWith('.')) {
                // path.normalize() preserves leading '../' but not './'. This adds it back.
                normalPath = "." + path.sep + normalPath;
            }
            // Replace windows path delimiters with forward-slashes. Otherwise the paths are not
            // TypeScript compatible when building the bundle.
            return normalPath.replace(/\\/g, '/');
        }
        return importName;
    }
    function isPrimitive(o) {
        return o === null || (typeof o !== 'function' && typeof o !== 'object');
    }
    function getRootExport(symbol) {
        return symbol.reexportedAs ? getRootExport(symbol.reexportedAs) : symbol;
    }
    function getSymbolDeclaration(symbol) {
        return symbol.exports ? getSymbolDeclaration(symbol.exports) : symbol;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbWV0YWRhdGEvYnVuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBSWpDLDBFQUE4QztJQUM5QyxvRUFBNGxCO0lBSTVsQixtREFBbUQ7SUFDbkQsSUFBTSxrQkFBa0IsR0FBRyw0QkFBNEIsQ0FBQztJQWdFeEQ7UUFTRSx5QkFDWSxJQUFZLEVBQVUsUUFBMEIsRUFBVSxJQUF5QixFQUMzRixtQkFBNEI7WUFEcEIsU0FBSSxHQUFKLElBQUksQ0FBUTtZQUFVLGFBQVEsR0FBUixRQUFRLENBQWtCO1lBQVUsU0FBSSxHQUFKLElBQUksQ0FBcUI7WUFUdkYsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBQ3RDLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQW9DLENBQUM7WUFDNUQsWUFBTyxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1lBUzVDLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBRyxDQUFDO1lBQzdDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLG1CQUFtQixJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUVELDJDQUFpQixHQUFqQjtZQUNFLGdHQUFnRztZQUNoRyxlQUFlO1lBQ2YsSUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDeEQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzFDLHVFQUF1RTtZQUN2RSxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxD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TUFBYztRQUNuQyxPQUFPLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUMzRSxDQUFDO0lBRUQsU0FBUyxvQkFBb0IsQ0FBQyxNQUFjO1FBQzFDLE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDeEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtNZXRhZGF0YUNhY2hlfSBmcm9tICcuLi90cmFuc2Zvcm1lcnMvbWV0YWRhdGFfY2FjaGUnO1xuXG5pbXBvcnQge01ldGFkYXRhQ29sbGVjdG9yfSBmcm9tICcuL2NvbGxlY3Rvcic7XG5pbXBvcnQge0NsYXNzTWV0YWRhdGEsIENvbnN0cnVjdG9yTWV0YWRhdGEsIEZ1bmN0aW9uTWV0YWRhdGEsIE1FVEFEQVRBX1ZFUlNJT04sIE1lbWJlck1ldGFkYXRhLCBNZXRhZGF0YUVudHJ5LCBNZXRhZGF0YUVycm9yLCBNZXRhZGF0YU1hcCwgTWV0YWRhdGFPYmplY3QsIE1ldGFkYXRhU3ltYm9saWNFeHByZXNzaW9uLCBNZXRhZGF0YVN5bWJvbGljUmVmZXJlbmNlRXhwcmVzc2lvbiwgTWV0YWRhdGFWYWx1ZSwgTWV0aG9kTWV0YWRhdGEsIE1vZHVsZUV4cG9ydE1ldGFkYXRhLCBNb2R1bGVNZXRhZGF0YSwgaXNDbGFzc01ldGFkYXRhLCBpc0NvbnN0cnVjdG9yTWV0YWRhdGEsIGlzRnVuY3Rpb25NZXRhZGF0YSwgaXNJbnRlcmZhY2VNZXRhZGF0YSwgaXNNZXRhZGF0YUVycm9yLCBpc01ldGFkYXRhR2xvYmFsUmVmZXJlbmNlRXhwcmVzc2lvbiwgaXNNZXRhZGF0YUltcG9ydGVkU3ltYm9sUmVmZXJlbmNlRXhwcmVzc2lvbiwgaXNNZXRhZGF0YU1vZHVsZVJlZmVyZW5jZUV4cHJlc3Npb24sIGlzTWV0YWRhdGFTeW1ib2xpY0NhbGxFeHByZXNzaW9uLCBpc01ldGFkYXRhU3ltYm9saWNFeHByZXNzaW9uLCBpc01ldGhvZE1ldGFkYXRhfSBmcm9tICcuL3NjaGVtYSc7XG5cblxuXG4vLyBUaGUgY2hhcmFjdGVyIHNldCB1c2VkIHRvIHByb2R1Y2UgcHJpdmF0ZSBuYW1lcy5cbmNvbnN0IFBSSVZBVEVfTkFNRV9DSEFSUyA9ICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eic7XG5cbmludGVyZmFjZSBTeW1ib2wge1xuICBtb2R1bGU6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuXG4gIC8vIFByb2R1Y2VkIGJ5IGluZGlyZWN0bHkgYnkgZXhwb3J0QWxsKCkgZm9yIHN5bWJvbHMgcmUtZXhwb3J0IGFub3RoZXIgc3ltYm9sLlxuICBleHBvcnRzPzogU3ltYm9sO1xuXG4gIC8vIFByb2R1Y2VkIGJ5IGluZGlyZWN0bHkgYnkgZXhwb3J0QWxsKCkgZm9yIHN5bWJvbHMgYXJlIHJlLWV4cG9ydGVkIGJ5IGFub3RoZXIgc3ltYm9sLlxuICByZWV4cG9ydGVkQXM/OiBTeW1ib2w7XG5cbiAgLy8gUHJvZHVjZWQgYnkgY2Fub25pY2FsaXplU3ltYm9scygpIGZvciBhbGwgc3ltYm9scy4gQSBzeW1ib2wgaXMgcHJpdmF0ZSBpZiBpdCBpcyBub3RcbiAgLy8gZXhwb3J0ZWQgYnkgdGhlIGluZGV4LlxuICBpc1ByaXZhdGU/OiBib29sZWFuO1xuXG4gIC8vIFByb2R1Y2VkIGJ5IGNhbm9uaWNhbGl6ZVN5bWJvbHMoKSBmb3IgYWxsIHN5bWJvbHMuIFRoaXMgaXMgdGhlIG9uZSBzeW1ib2wgdGhhdFxuICAvLyByZXNwcmVzZW50cyBhbGwgb3RoZXIgc3ltYm9scyBhbmQgaXMgdGhlIG9ubHkgc3ltYm9sIHRoYXQsIGFtb25nIGFsbCB0aGUgcmUtZXhwb3J0ZWRcbiAgLy8gYWxpYXNlcywgd2hvc2UgZmllbGRzIGNhbiBiZSB0cnVzdGVkIHRvIGNvbnRhaW4gdGhlIGNvcnJlY3QgaW5mb3JtYXRpb24uXG4gIC8vIEZvciBwcml2YXRlIHN5bWJvbHMgdGhpcyBpcyB0aGUgZGVjbGFyYXRpb24gc3ltYm9sLiBGb3IgcHVibGljIHN5bWJvbHMgdGhpcyBpcyB0aGVcbiAgLy8gc3ltYm9sIHRoYXQgaXMgZXhwb3J0ZWQuXG4gIGNhbm9uaWNhbFN5bWJvbD86IFN5bWJvbDtcblxuICAvLyBQcm9kdWNlZCBieSBjYW5vbmljYWxpemVTeW1ib2xzKCkgZm9yIGFsbCBzeW1ib2xzLiBUaGlzIHRoZSBzeW1ib2wgdGhhdCBvcmlnaW5hbGx5XG4gIC8vIGRlY2xhcmVkIHRoZSB2YWx1ZSBhbmQgc2hvdWxkIGJlIHVzZWQgdG8gZmV0Y2ggdGhlIHZhbHVlLlxuICBkZWNsYXJhdGlvbj86IFN5bWJvbDtcblxuICAvLyBBIHN5bWJvbCBpcyByZWZlcmVuY2VkIGlmIGl0IGlzIGV4cG9ydGVkIGZyb20gaW5kZXggb3IgcmVmZXJlbmNlZCBieSB0aGUgdmFsdWUgb2ZcbiAgLy8gYSByZWZlcmVuY2VkIHN5bWJvbCdzIHZhbHVlLlxuICByZWZlcmVuY2VkPzogYm9vbGVhbjtcblxuICAvLyBBIHN5bWJvbCBpcyBtYXJrZWQgYXMgYSByZS1leHBvcnQgdGhlIHN5bWJvbCB3YXMgcmV4cG9ydGVkIGZyb20gYSBtb2R1bGUgdGhhdCBpc1xuICAvLyBub3QgcGFydCBvZiB0aGUgZmxhdCBtb2R1bGUgYnVuZGxlLlxuICByZWV4cG9ydD86IGJvb2xlYW47XG5cbiAgLy8gT25seSB2YWxpZCBmb3IgcmVmZXJlbmNlZCBjYW5vbmljYWwgc3ltYm9scy4gUHJvZHVjZXMgYnkgY29udmVydFN5bWJvbHMoKS5cbiAgdmFsdWU/OiBNZXRhZGF0YUVudHJ5O1xuXG4gIC8vIE9ubHkgdmFsaWQgZm9yIHJlZmVyZW5jZWQgcHJpdmF0ZSBzeW1ib2xzLiBJdCBpcyB0aGUgbmFtZSB0byB1c2UgdG8gaW1wb3J0IHRoZSBzeW1ib2wgZnJvbVxuICAvLyB0aGUgYnVuZGxlIGluZGV4LiBQcm9kdWNlIGJ5IGFzc2lnblByaXZhdGVOYW1lcygpO1xuICBwcml2YXRlTmFtZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCdW5kbGVFbnRyaWVzIHsgW25hbWU6IHN0cmluZ106IE1ldGFkYXRhRW50cnk7IH1cblxuZXhwb3J0IGludGVyZmFjZSBCdW5kbGVQcml2YXRlRW50cnkge1xuICBwcml2YXRlTmFtZTogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIG1vZHVsZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJ1bmRsZWRNb2R1bGUge1xuICBtZXRhZGF0YTogTW9kdWxlTWV0YWRhdGE7XG4gIHByaXZhdGVzOiBCdW5kbGVQcml2YXRlRW50cnlbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNZXRhZGF0YUJ1bmRsZXJIb3N0IHtcbiAgZ2V0TWV0YWRhdGFGb3IobW9kdWxlTmFtZTogc3RyaW5nLCBjb250YWluaW5nRmlsZTogc3RyaW5nKTogTW9kdWxlTWV0YWRhdGF8dW5kZWZpbmVkO1xufVxuXG50eXBlIFN0YXRpY3NNZXRhZGF0YSA9IHtcbiAgW25hbWU6IHN0cmluZ106IE1ldGFkYXRhVmFsdWUgfCBGdW5jdGlvbk1ldGFkYXRhO1xufTtcblxuZXhwb3J0IGNsYXNzIE1ldGFkYXRhQnVuZGxlciB7XG4gIHByaXZhdGUgc3ltYm9sTWFwID0gbmV3IE1hcDxzdHJpbmcsIFN5bWJvbD4oKTtcbiAgcHJpdmF0ZSBtZXRhZGF0YUNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIE1vZHVsZU1ldGFkYXRhfHVuZGVmaW5lZD4oKTtcbiAgcHJpdmF0ZSBleHBvcnRzID0gbmV3IE1hcDxzdHJpbmcsIFN5bWJvbFtdPigpO1xuICBwcml2YXRlIHJvb3RNb2R1bGU6IHN0cmluZztcbiAgcHJpdmF0ZSBwcml2YXRlU3ltYm9sUHJlZml4OiBzdHJpbmc7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIGV4cG9ydGVkICE6IFNldDxTeW1ib2w+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb290OiBzdHJpbmcsIHByaXZhdGUgaW1wb3J0QXM6IHN0cmluZ3x1bmRlZmluZWQsIHByaXZhdGUgaG9zdDogTWV0YWRhdGFCdW5kbGVySG9zdCxcbiAgICAgIHByaXZhdGVTeW1ib2xQcmVmaXg/OiBzdHJpbmcpIHtcbiAgICB0aGlzLnJvb3RNb2R1bGUgPSBgLi8ke3BhdGguYmFzZW5hbWUocm9vdCl9YDtcbiAgICB0aGlzLnByaXZhdGVTeW1ib2xQcmVmaXggPSAocHJpdmF0ZVN5bWJvbFByZWZpeCB8fCAnJykucmVwbGFjZSgvXFxXL2csICdfJyk7XG4gIH1cblxuICBnZXRNZXRhZGF0YUJ1bmRsZSgpOiBCdW5kbGVkTW9kdWxlIHtcbiAgICAvLyBFeHBvcnQgdGhlIHJvb3QgbW9kdWxlLiBUaGlzIGFsc28gY29sbGVjdHMgdGhlIHRyYW5zaXRpdmUgY2xvc3VyZSBvZiBhbGwgdmFsdWVzIHJlZmVyZW5jZWQgYnlcbiAgICAvLyB0aGUgZXhwb3J0cy5cbiAgICBjb25zdCBleHBvcnRlZFN5bWJvbHMgPSB0aGlzLmV4cG9ydEFsbCh0aGlzLnJvb3RNb2R1bGUpO1xuICAgIHRoaXMuY2Fub25pY2FsaXplU3ltYm9scyhleHBvcnRlZFN5bWJvbHMpO1xuICAgIC8vIFRPRE86IGV4cG9ydHM/IGUuZy4gYSBtb2R1bGUgcmUtZXhwb3J0cyBhIHN5bWJvbCBmcm9tIGFub3RoZXIgYnVuZGxlXG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLmdldEVudHJpZXMoZXhwb3J0ZWRTeW1ib2xzKTtcbiAgICBjb25zdCBwcml2YXRlcyA9IEFycmF5LmZyb20odGhpcy5zeW1ib2xNYXAudmFsdWVzKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihzID0+IHMucmVmZXJlbmNlZCAmJiBzLmlzUHJpdmF0ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKHMgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpdmF0ZU5hbWU6IHMucHJpdmF0ZU5hbWUgISxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcy5kZWNsYXJhdGlvbiAhLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZHVsZTogcy5kZWNsYXJhdGlvbiAhLm1vZHVsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgIGNvbnN0IG9yaWdpbnMgPSBBcnJheS5mcm9tKHRoaXMuc3ltYm9sTWFwLnZhbHVlcygpKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihzID0+IHMucmVmZXJlbmNlZCAmJiAhcy5yZWV4cG9ydClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZWR1Y2U8e1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9PigocCwgcykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBwW3MuaXNQcml2YXRlID8gcy5wcml2YXRlTmFtZSAhIDogcy5uYW1lXSA9IHMuZGVjbGFyYXRpb24gIS5tb2R1bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwge30pO1xuICAgIGNvbnN0IGV4cG9ydHMgPSB0aGlzLmdldFJlRXhwb3J0cyhleHBvcnRlZFN5bWJvbHMpO1xuICAgIHJldHVybiB7XG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBfX3N5bWJvbGljOiAnbW9kdWxlJyxcbiAgICAgICAgdmVyc2lvbjogTUVUQURBVEFfVkVSU0lPTixcbiAgICAgICAgZXhwb3J0czogZXhwb3J0cy5sZW5ndGggPyBleHBvcnRzIDogdW5kZWZpbmVkLCBtZXRhZGF0YSwgb3JpZ2lucyxcbiAgICAgICAgaW1wb3J0QXM6IHRoaXMuaW1wb3J0QXMgIVxuICAgICAgfSxcbiAgICAgIHByaXZhdGVzXG4gICAgfTtcbiAgfVxuXG4gIHN0YXRpYyByZXNvbHZlTW9kdWxlKGltcG9ydE5hbWU6IHN0cmluZywgZnJvbTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcmVzb2x2ZU1vZHVsZShpbXBvcnROYW1lLCBmcm9tKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0TWV0YWRhdGEobW9kdWxlTmFtZTogc3RyaW5nKTogTW9kdWxlTWV0YWRhdGF8dW5kZWZpbmVkIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpcy5tZXRhZGF0YUNhY2hlLmdldChtb2R1bGVOYW1lKTtcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgaWYgKG1vZHVsZU5hbWUuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgIGNvbnN0IGZ1bGxNb2R1bGVOYW1lID0gcmVzb2x2ZU1vZHVsZShtb2R1bGVOYW1lLCB0aGlzLnJvb3QpO1xuICAgICAgICByZXN1bHQgPSB0aGlzLmhvc3QuZ2V0TWV0YWRhdGFGb3IoZnVsbE1vZHVsZU5hbWUsIHRoaXMucm9vdCk7XG4gICAgICB9XG4gICAgICB0aGlzLm1ldGFkYXRhQ2FjaGUuc2V0KG1vZHVsZU5hbWUsIHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIGV4cG9ydEFsbChtb2R1bGVOYW1lOiBzdHJpbmcpOiBTeW1ib2xbXSB7XG4gICAgY29uc3QgbW9kdWxlID0gdGhpcy5nZXRNZXRhZGF0YShtb2R1bGVOYW1lKTtcbiAgICBsZXQgcmVzdWx0ID0gdGhpcy5leHBvcnRzLmdldChtb2R1bGVOYW1lKTtcblxuICAgIGlmIChyZXN1bHQpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgcmVzdWx0ID0gW107XG5cbiAgICBjb25zdCBleHBvcnRTeW1ib2wgPSAoZXhwb3J0ZWRTeW1ib2w6IFN5bWJvbCwgZXhwb3J0QXM6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5zeW1ib2xPZihtb2R1bGVOYW1lLCBleHBvcnRBcyk7XG4gICAgICByZXN1bHQgIS5wdXNoKHN5bWJvbCk7XG4gICAgICBleHBvcnRlZFN5bWJvbC5yZWV4cG9ydGVkQXMgPSBzeW1ib2w7XG4gICAgICBzeW1ib2wuZXhwb3J0cyA9IGV4cG9ydGVkU3ltYm9sO1xuICAgIH07XG5cbiAgICAvLyBFeHBvcnQgYWxsIHRoZSBzeW1ib2xzIGRlZmluZWQgaW4gdGhpcyBtb2R1bGUuXG4gICAgaWYgKG1vZHVsZSAmJiBtb2R1bGUubWV0YWRhdGEpIHtcbiAgICAgIGZvciAobGV0IGtleSBpbiBtb2R1bGUubWV0YWRhdGEpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IG1vZHVsZS5tZXRhZGF0YVtrZXldO1xuICAgICAgICBpZiAoaXNNZXRhZGF0YUltcG9ydGVkU3ltYm9sUmVmZXJlbmNlRXhwcmVzc2lvbihkYXRhKSkge1xuICAgICAgICAgIC8vIFRoaXMgaXMgYSByZS1leHBvcnQgb2YgYW4gaW1wb3J0ZWQgc3ltYm9sLiBSZWNvcmQgdGhpcyBhcyBhIHJlLWV4cG9ydC5cbiAgICAgICAgICBjb25zdCBleHBvcnRGcm9tID0gcmVzb2x2ZU1vZHVsZShkYXRhLm1vZHVsZSwgbW9kdWxlTmFtZSk7XG4gICAgICAgICAgdGhpcy5leHBvcnRBbGwoZXhwb3J0RnJvbSk7XG4gICAgICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5zeW1ib2xPZihleHBvcnRGcm9tLCBkYXRhLm5hbWUpO1xuICAgICAgICAgIGV4cG9ydFN5bWJvbChzeW1ib2wsIGtleSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gUmVjb3JkIHRoYXQgdGhpcyBzeW1ib2wgaXMgZXhwb3J0ZWQgYnkgdGhpcyBtb2R1bGUuXG4gICAgICAgICAgcmVzdWx0LnB1c2godGhpcy5zeW1ib2xPZihtb2R1bGVOYW1lLCBrZXkpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEV4cG9ydCBhbGwgdGhlIHJlLWV4cG9ydHMgZnJvbSB0aGlzIG1vZHVsZVxuICAgIGlmIChtb2R1bGUgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGxldCB1bm5hbWVkTW9kdWxlRXhwb3J0c0lkeCA9IDA7XG4gICAgICBmb3IgKGNvbnN0IGV4cG9ydERlY2xhcmF0aW9uIG9mIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIGNvbnN0IGV4cG9ydEZyb20gPSByZXNvbHZlTW9kdWxlKGV4cG9ydERlY2xhcmF0aW9uLmZyb20sIG1vZHVsZU5hbWUpO1xuICAgICAgICAvLyBSZWNvcmQgYWxsIHRoZSBleHBvcnRzIGZyb20gdGhlIG1vZHVsZSBldmVuIGlmIHdlIGRvbid0IHVzZSBpdCBkaXJlY3RseS5cbiAgICAgICAgY29uc3QgZXhwb3J0ZWRTeW1ib2xzID0gdGhpcy5leHBvcnRBbGwoZXhwb3J0RnJvbSk7XG4gICAgICAgIGlmIChleHBvcnREZWNsYXJhdGlvbi5leHBvcnQpIHtcbiAgICAgICAgICAvLyBSZS1leHBvcnQgYWxsIHRoZSBuYW1lZCBleHBvcnRzIGZyb20gYSBtb2R1bGUuXG4gICAgICAgICAgZm9yIChjb25zdCBleHBvcnRJdGVtIG9mIGV4cG9ydERlY2xhcmF0aW9uLmV4cG9ydCkge1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IHR5cGVvZiBleHBvcnRJdGVtID09ICdzdHJpbmcnID8gZXhwb3J0SXRlbSA6IGV4cG9ydEl0ZW0ubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGV4cG9ydEFzID0gdHlwZW9mIGV4cG9ydEl0ZW0gPT0gJ3N0cmluZycgPyBleHBvcnRJdGVtIDogZXhwb3J0SXRlbS5hcztcbiAgICAgICAgICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuc3ltYm9sT2YoZXhwb3J0RnJvbSwgbmFtZSk7XG4gICAgICAgICAgICBpZiAoZXhwb3J0ZWRTeW1ib2xzICYmIGV4cG9ydGVkU3ltYm9scy5sZW5ndGggPT0gMSAmJiBleHBvcnRlZFN5bWJvbHNbMF0ucmVleHBvcnQgJiZcbiAgICAgICAgICAgICAgICBleHBvcnRlZFN5bWJvbHNbMF0ubmFtZSA9PSAnKicpIHtcbiAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIG5hbWVkIGV4cG9ydCBmcm9tIGEgbW9kdWxlIHdlIGhhdmUgbm8gbWV0YWRhdGEgYWJvdXQuIFJlY29yZCB0aGUgbmFtZWRcbiAgICAgICAgICAgICAgLy8gZXhwb3J0IGFzIGEgcmUtZXhwb3J0LlxuICAgICAgICAgICAgICBzeW1ib2wucmVleHBvcnQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXhwb3J0U3ltYm9sKHRoaXMuc3ltYm9sT2YoZXhwb3J0RnJvbSwgbmFtZSksIGV4cG9ydEFzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gUmUtZXhwb3J0IGFsbCB0aGUgc3ltYm9scyBmcm9tIHRoZSBtb2R1bGVcbiAgICAgICAgICBjb25zdCBleHBvcnRlZFN5bWJvbHMgPSB0aGlzLmV4cG9ydEFsbChleHBvcnRGcm9tKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGV4cG9ydGVkU3ltYm9sIG9mIGV4cG9ydGVkU3ltYm9scykge1xuICAgICAgICAgICAgLy8gSW4gY2FzZSB0aGUgZXhwb3J0ZWQgc3ltYm9sIGRvZXMgbm90IGhhdmUgYSBuYW1lLCB3ZSBuZWVkIHRvIGdpdmUgaXQgYW4gdW5pcXVlXG4gICAgICAgICAgICAvLyBuYW1lIGZvciB0aGUgY3VycmVudCBtb2R1bGUuIFRoaXMgaXMgbmVjZXNzYXJ5IGJlY2F1c2UgdGhlcmUgY2FuIGJlIG11bHRpcGxlXG4gICAgICAgICAgICAvLyB1bm5hbWVkIHJlLWV4cG9ydHMgaW4gYSBnaXZlbiBtb2R1bGUuXG4gICAgICAgICAgICBjb25zdCBuYW1lID0gZXhwb3J0ZWRTeW1ib2wubmFtZSA9PT0gJyonID9cbiAgICAgICAgICAgICAgICBgdW5uYW1lZF9yZWV4cG9ydF8ke3VubmFtZWRNb2R1bGVFeHBvcnRzSWR4Kyt9YCA6XG4gICAgICAgICAgICAgICAgZXhwb3J0ZWRTeW1ib2wubmFtZTtcbiAgICAgICAgICAgIGV4cG9ydFN5bWJvbChleHBvcnRlZFN5bWJvbCwgbmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFtb2R1bGUpIHtcbiAgICAgIC8vIElmIG5vIG1ldGFkYXRhIGlzIGZvdW5kIGZvciB0aGlzIGltcG9ydCB0aGVuIGl0IGlzIGNvbnNpZGVyZWQgZXh0ZXJuYWwgdG8gdGhlXG4gICAgICAvLyBsaWJyYXJ5IGFuZCBzaG91bGQgYmUgcmVjb3JkZWQgYXMgYSByZS1leHBvcnQgaW4gdGhlIGZpbmFsIG1ldGFkYXRhIGlmIGl0IGlzXG4gICAgICAvLyBldmVudHVhbGx5IHJlLWV4cG9ydGVkLlxuICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5zeW1ib2xPZihtb2R1bGVOYW1lLCAnKicpO1xuICAgICAgc3ltYm9sLnJlZXhwb3J0ID0gdHJ1ZTtcbiAgICAgIHJlc3VsdC5wdXNoKHN5bWJvbCk7XG4gICAgfVxuICAgIHRoaXMuZXhwb3J0cy5zZXQobW9kdWxlTmFtZSwgcmVzdWx0KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogRmlsbCBpbiB0aGUgY2Fub25pY2FsU3ltYm9sIHdoaWNoIGlzIHRoZSBzeW1ib2wgdGhhdCBzaG91bGQgYmUgaW1wb3J0ZWQgYnkgZmFjdG9yaWVzLlxuICAgKiBUaGUgY2Fub25pY2FsIHN5bWJvbCBpcyB0aGUgb25lIGV4cG9ydGVkIGJ5IHRoZSBpbmRleCBmaWxlIGZvciB0aGUgYnVuZGxlIG9yIGRlZmluaXRpb25cbiAgICogc3ltYm9sIGZvciBwcml2YXRlIHN5bWJvbHMgdGhhdCBhcmUgbm90IGV4cG9ydGVkIGJ5IGJ1bmRsZSBpbmRleC5cbiAgICovXG4gIHByaXZhdGUgY2Fub25pY2FsaXplU3ltYm9scyhleHBvcnRlZFN5bWJvbHM6IFN5bWJvbFtdKSB7XG4gICAgY29uc3Qgc3ltYm9scyA9IEFycmF5LmZyb20odGhpcy5zeW1ib2xNYXAudmFsdWVzKCkpO1xuICAgIHRoaXMuZXhwb3J0ZWQgPSBuZXcgU2V0KGV4cG9ydGVkU3ltYm9scyk7XG4gICAgc3ltYm9scy5mb3JFYWNoKHRoaXMuY2Fub25pY2FsaXplU3ltYm9sLCB0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgY2Fub25pY2FsaXplU3ltYm9sKHN5bWJvbDogU3ltYm9sKSB7XG4gICAgY29uc3Qgcm9vdEV4cG9ydCA9IGdldFJvb3RFeHBvcnQoc3ltYm9sKTtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGdldFN5bWJvbERlY2xhcmF0aW9uKHN5bWJvbCk7XG4gICAgY29uc3QgaXNQcml2YXRlID0gIXRoaXMuZXhwb3J0ZWQuaGFzKHJvb3RFeHBvcnQpO1xuICAgIGNvbnN0IGNhbm9uaWNhbFN5bWJvbCA9IGlzUHJpdmF0ZSA/IGRlY2xhcmF0aW9uIDogcm9vdEV4cG9ydDtcbiAgICBzeW1ib2wuaXNQcml2YXRlID0gaXNQcml2YXRlO1xuICAgIHN5bWJvbC5kZWNsYXJhdGlvbiA9IGRlY2xhcmF0aW9uO1xuICAgIHN5bWJvbC5jYW5vbmljYWxTeW1ib2wgPSBjYW5vbmljYWxTeW1ib2w7XG4gICAgc3ltYm9sLnJlZXhwb3J0ID0gZGVjbGFyYXRpb24ucmVleHBvcnQ7XG4gIH1cblxuICBwcml2YXRlIGdldEVudHJpZXMoZXhwb3J0ZWRTeW1ib2xzOiBTeW1ib2xbXSk6IEJ1bmRsZUVudHJpZXMge1xuICAgIGNvbnN0IHJlc3VsdDogQnVuZGxlRW50cmllcyA9IHt9O1xuXG4gICAgY29uc3QgZXhwb3J0ZWROYW1lcyA9IG5ldyBTZXQoZXhwb3J0ZWRTeW1ib2xzLm1hcChzID0+IHMubmFtZSkpO1xuICAgIGxldCBwcml2YXRlTmFtZSA9IDA7XG5cbiAgICBmdW5jdGlvbiBuZXdQcml2YXRlTmFtZShwcmVmaXg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBsZXQgZGlnaXRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBsZXQgaW5kZXggPSBwcml2YXRlTmFtZSsrO1xuICAgICAgICBsZXQgYmFzZSA9IFBSSVZBVEVfTkFNRV9DSEFSUztcbiAgICAgICAgd2hpbGUgKCFkaWdpdHMubGVuZ3RoIHx8IGluZGV4ID4gMCkge1xuICAgICAgICAgIGRpZ2l0cy51bnNoaWZ0KGJhc2VbaW5kZXggJSBiYXNlLmxlbmd0aF0pO1xuICAgICAgICAgIGluZGV4ID0gTWF0aC5mbG9vcihpbmRleCAvIGJhc2UubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBgXFx1MDI3NSR7cHJlZml4fSR7ZGlnaXRzLmpvaW4oJycpfWA7XG4gICAgICAgIGlmICghZXhwb3J0ZWROYW1lcy5oYXMocmVzdWx0KSkgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBleHBvcnRlZFN5bWJvbHMuZm9yRWFjaChzeW1ib2wgPT4gdGhpcy5jb252ZXJ0U3ltYm9sKHN5bWJvbCkpO1xuXG4gICAgY29uc3Qgc3ltYm9sc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcbiAgICBBcnJheS5mcm9tKHRoaXMuc3ltYm9sTWFwLnZhbHVlcygpKS5mb3JFYWNoKHN5bWJvbCA9PiB7XG4gICAgICBpZiAoc3ltYm9sLnJlZmVyZW5jZWQgJiYgIXN5bWJvbC5yZWV4cG9ydCkge1xuICAgICAgICBsZXQgbmFtZSA9IHN5bWJvbC5uYW1lO1xuICAgICAgICBjb25zdCBpZGVudGlmaWVyID0gYCR7c3ltYm9sLmRlY2xhcmF0aW9uIS5tb2R1bGV9OiR7c3ltYm9sLmRlY2xhcmF0aW9uICEubmFtZX1gO1xuICAgICAgICBpZiAoc3ltYm9sLmlzUHJpdmF0ZSAmJiAhc3ltYm9sLnByaXZhdGVOYW1lKSB7XG4gICAgICAgICAgbmFtZSA9IG5ld1ByaXZhdGVOYW1lKHRoaXMucHJpdmF0ZVN5bWJvbFByZWZpeCk7XG4gICAgICAgICAgc3ltYm9sLnByaXZhdGVOYW1lID0gbmFtZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3ltYm9sc01hcC5oYXMoaWRlbnRpZmllcikpIHtcbiAgICAgICAgICBjb25zdCBuYW1lcyA9IHN5bWJvbHNNYXAuZ2V0KGlkZW50aWZpZXIpO1xuICAgICAgICAgIG5hbWVzICEucHVzaChuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzeW1ib2xzTWFwLnNldChpZGVudGlmaWVyLCBbbmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdFtuYW1lXSA9IHN5bWJvbC52YWx1ZSAhO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gY2hlY2sgZm9yIGR1cGxpY2F0ZWQgZW50cmllc1xuICAgIHN5bWJvbHNNYXAuZm9yRWFjaCgobmFtZXM6IHN0cmluZ1tdLCBpZGVudGlmaWVyOiBzdHJpbmcpID0+IHtcbiAgICAgIGlmIChuYW1lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGNvbnN0IFttb2R1bGUsIGRlY2xhcmVkTmFtZV0gPSBpZGVudGlmaWVyLnNwbGl0KCc6Jyk7XG4gICAgICAgIC8vIHByZWZlciB0aGUgZXhwb3J0IHRoYXQgdXNlcyB0aGUgZGVjbGFyZWQgbmFtZSAoaWYgYW55KVxuICAgICAgICBsZXQgcmVmZXJlbmNlID0gbmFtZXMuaW5kZXhPZihkZWNsYXJlZE5hbWUpO1xuICAgICAgICBpZiAocmVmZXJlbmNlID09PSAtMSkge1xuICAgICAgICAgIHJlZmVyZW5jZSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBrZWVwIG9uZSBlbnRyeSBhbmQgcmVwbGFjZSB0aGUgb3RoZXJzIGJ5IHJlZmVyZW5jZXNcbiAgICAgICAgbmFtZXMuZm9yRWFjaCgobmFtZTogc3RyaW5nLCBpOiBudW1iZXIpID0+IHtcbiAgICAgICAgICBpZiAoaSAhPT0gcmVmZXJlbmNlKSB7XG4gICAgICAgICAgICByZXN1bHRbbmFtZV0gPSB7X19zeW1ib2xpYzogJ3JlZmVyZW5jZScsIG5hbWU6IG5hbWVzW3JlZmVyZW5jZV19O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZUV4cG9ydHMoZXhwb3J0ZWRTeW1ib2xzOiBTeW1ib2xbXSk6IE1vZHVsZUV4cG9ydE1ldGFkYXRhW10ge1xuICAgIHR5cGUgRXhwb3J0Q2xhdXNlID0ge25hbWU6IHN0cmluZywgYXM6IHN0cmluZ31bXTtcbiAgICBjb25zdCBtb2R1bGVzID0gbmV3IE1hcDxzdHJpbmcsIEV4cG9ydENsYXVzZT4oKTtcbiAgICBjb25zdCBleHBvcnRBbGxzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBzeW1ib2wgb2YgZXhwb3J0ZWRTeW1ib2xzKSB7XG4gICAgICBpZiAoc3ltYm9sLnJlZXhwb3J0KSB7XG4gICAgICAgIC8vIHN5bWJvbC5kZWNsYXJhdGlvbiBpcyBndWFyYW50ZWVkIHRvIGJlIGRlZmluZWQgZHVyaW5nIHRoZSBwaGFzZSB0aGlzIG1ldGhvZCBpcyBjYWxsZWQuXG4gICAgICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gc3ltYm9sLmRlY2xhcmF0aW9uICE7XG4gICAgICAgIGNvbnN0IG1vZHVsZSA9IGRlY2xhcmF0aW9uLm1vZHVsZTtcbiAgICAgICAgaWYgKGRlY2xhcmF0aW9uICEubmFtZSA9PSAnKicpIHtcbiAgICAgICAgICAvLyBSZWV4cG9ydCBhbGwgdGhlIHN5bWJvbHMuXG4gICAgICAgICAgZXhwb3J0QWxscy5hZGQoZGVjbGFyYXRpb24ubW9kdWxlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBSZS1leHBvcnQgdGhlIHN5bWJvbCBhcyB0aGUgZXhwb3J0ZWQgbmFtZS5cbiAgICAgICAgICBsZXQgZW50cnkgPSBtb2R1bGVzLmdldChtb2R1bGUpO1xuICAgICAgICAgIGlmICghZW50cnkpIHtcbiAgICAgICAgICAgIGVudHJ5ID0gW107XG4gICAgICAgICAgICBtb2R1bGVzLnNldChtb2R1bGUsIGVudHJ5KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgYXMgPSBzeW1ib2wubmFtZTtcbiAgICAgICAgICBjb25zdCBuYW1lID0gZGVjbGFyYXRpb24ubmFtZTtcbiAgICAgICAgICBlbnRyeS5wdXNoKHtuYW1lLCBhc30pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbXG4gICAgICAuLi5BcnJheS5mcm9tKGV4cG9ydEFsbHMudmFsdWVzKCkpLm1hcChmcm9tID0+ICh7ZnJvbX0pKSxcbiAgICAgIC4uLkFycmF5LmZyb20obW9kdWxlcy5lbnRyaWVzKCkpLm1hcCgoW2Zyb20sIGV4cG9ydHNdKSA9PiAoe2V4cG9ydDogZXhwb3J0cywgZnJvbX0pKVxuICAgIF07XG4gIH1cblxuICBwcml2YXRlIGNvbnZlcnRTeW1ib2woc3ltYm9sOiBTeW1ib2wpIHtcbiAgICAvLyBjYW5vbmljYWxTeW1ib2wgaXMgZW5zdXJlZCB0byBiZSBkZWZpbmVkIGJlZm9yZSB0aGlzIGlzIGNhbGxlZC5cbiAgICBjb25zdCBjYW5vbmljYWxTeW1ib2wgPSBzeW1ib2wuY2Fub25pY2FsU3ltYm9sICE7XG5cbiAgICBpZiAoIWNhbm9uaWNhbFN5bWJvbC5yZWZlcmVuY2VkKSB7XG4gICAgICBjYW5vbmljYWxTeW1ib2wucmVmZXJlbmNlZCA9IHRydWU7XG4gICAgICAvLyBkZWNsYXJhdGlvbiBpcyBlbnN1cmVkIHRvIGJlIGRlZmluZGVkIGJlZm9yZSB0aGlzIG1ldGhvZCBpcyBjYWxsZWQuXG4gICAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGNhbm9uaWNhbFN5bWJvbC5kZWNsYXJhdGlvbiAhO1xuICAgICAgY29uc3QgbW9kdWxlID0gdGhpcy5nZXRNZXRhZGF0YShkZWNsYXJhdGlvbi5tb2R1bGUpO1xuICAgICAgaWYgKG1vZHVsZSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IG1vZHVsZS5tZXRhZGF0YVtkZWNsYXJhdGlvbi5uYW1lXTtcbiAgICAgICAgaWYgKHZhbHVlICYmICFkZWNsYXJhdGlvbi5uYW1lLnN0YXJ0c1dpdGgoJ19fXycpKSB7XG4gICAgICAgICAgY2Fub25pY2FsU3ltYm9sLnZhbHVlID0gdGhpcy5jb252ZXJ0RW50cnkoZGVjbGFyYXRpb24ubW9kdWxlLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvbnZlcnRFbnRyeShtb2R1bGVOYW1lOiBzdHJpbmcsIHZhbHVlOiBNZXRhZGF0YUVudHJ5KTogTWV0YWRhdGFFbnRyeSB7XG4gICAgaWYgKGlzQ2xhc3NNZXRhZGF0YSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbnZlcnRDbGFzcyhtb2R1bGVOYW1lLCB2YWx1ZSk7XG4gICAgfVxuICAgIGlmIChpc0Z1bmN0aW9uTWV0YWRhdGEodmFsdWUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb252ZXJ0RnVuY3Rpb24obW9kdWxlTmFtZSwgdmFsdWUpO1xuICAgIH1cbiAgICBpZiAoaXNJbnRlcmZhY2VNZXRhZGF0YSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29udmVydFZhbHVlKG1vZHVsZU5hbWUsIHZhbHVlKTtcbiAgfVxuXG4gIHByaXZhdGUgY29udmVydENsYXNzKG1vZHVsZU5hbWU6IHN0cmluZywgdmFsdWU6IENsYXNzTWV0YWRhdGEpOiBDbGFzc01ldGFkYXRhIHtcbiAgICByZXR1cm4ge1xuICAgICAgX19zeW1ib2xpYzogJ2NsYXNzJyxcbiAgICAgIGFyaXR5OiB2YWx1ZS5hcml0eSxcbiAgICAgIGV4dGVuZHM6IHRoaXMuY29udmVydEV4cHJlc3Npb24obW9kdWxlTmFtZSwgdmFsdWUuZXh0ZW5kcykgISxcbiAgICAgIGRlY29yYXRvcnM6XG4gICAgICAgICAgdmFsdWUuZGVjb3JhdG9ycyAmJiB2YWx1ZS5kZWNvcmF0b3JzLm1hcChkID0+IHRoaXMuY29udmVydEV4cHJlc3Npb24obW9kdWxlTmFtZSwgZCkgISksXG4gICAgICBtZW1iZXJzOiB0aGlzLmNvbnZlcnRNZW1iZXJzKG1vZHVsZU5hbWUsIHZhbHVlLm1lbWJlcnMgISksXG4gICAgICBzdGF0aWNzOiB2YWx1ZS5zdGF0aWNzICYmIHRoaXMuY29udmVydFN0YXRpY3MobW9kdWxlTmFtZSwgdmFsdWUuc3RhdGljcylcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjb252ZXJ0TWVtYmVycyhtb2R1bGVOYW1lOiBzdHJpbmcsIG1lbWJlcnM6IE1ldGFkYXRhTWFwKTogTWV0YWRhdGFNYXAge1xuICAgIGNvbnN0IHJlc3VsdDogTWV0YWRhdGFNYXAgPSB7fTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgaW4gbWVtYmVycykge1xuICAgICAgY29uc3QgdmFsdWUgPSBtZW1iZXJzW25hbWVdO1xuICAgICAgcmVzdWx0W25hbWVdID0gdmFsdWUubWFwKHYgPT4gdGhpcy5jb252ZXJ0TWVtYmVyKG1vZHVsZU5hbWUsIHYpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgY29udmVydE1lbWJlcihtb2R1bGVOYW1lOiBzdHJpbmcsIG1lbWJlcjogTWVtYmVyTWV0YWRhdGEpIHtcbiAgICBjb25zdCByZXN1bHQ6IE1lbWJlck1ldGFkYXRhID0ge19fc3ltYm9saWM6IG1lbWJlci5fX3N5bWJvbGljfTtcbiAgICByZXN1bHQuZGVjb3JhdG9ycyA9XG4gICAgICAgIG1lbWJlci5kZWNvcmF0b3JzICYmIG1lbWJlci5kZWNvcmF0b3JzLm1hcChkID0+IHRoaXMuY29udmVydEV4cHJlc3Npb24obW9kdWxlTmFtZSwgZCkgISk7XG4gICAgaWYgKGlzTWV0aG9kTWV0YWRhdGEobWVtYmVyKSkge1xuICAgICAgKHJlc3VsdCBhcyBNZXRob2RNZXRhZGF0YSkucGFyYW1ldGVyRGVjb3JhdG9ycyA9IG1lbWJlci5wYXJhbWV0ZXJEZWNvcmF0b3JzICYmXG4gICAgICAgICAgbWVtYmVyLnBhcmFtZXRlckRlY29yYXRvcnMubWFwKFxuICAgICAgICAgICAgICBkID0+IGQgJiYgZC5tYXAocCA9PiB0aGlzLmNvbnZlcnRFeHByZXNzaW9uKG1vZHVsZU5hbWUsIHApICEpKTtcbiAgICAgIGlmIChpc0NvbnN0cnVjdG9yTWV0YWRhdGEobWVtYmVyKSkge1xuICAgICAgICBpZiAobWVtYmVyLnBhcmFtZXRlcnMpIHtcbiAgICAgICAgICAocmVzdWx0IGFzIENvbnN0cnVjdG9yTWV0YWRhdGEpLnBhcmFtZXRlcnMgPVxuICAgICAgICAgICAgICBtZW1iZXIucGFyYW1ldGVycy5tYXAocCA9PiB0aGlzLmNvbnZlcnRFeHByZXNzaW9uKG1vZHVsZU5hbWUsIHApKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSBjb252ZXJ0U3RhdGljcyhtb2R1bGVOYW1lOiBzdHJpbmcsIHN0YXRpY3M6IFN0YXRpY3NNZXRhZGF0YSk6IFN0YXRpY3NNZXRhZGF0YSB7XG4gICAgbGV0IHJlc3VsdDogU3RhdGljc01ldGFkYXRhID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgaW4gc3RhdGljcykge1xuICAgICAgY29uc3QgdmFsdWUgPSBzdGF0aWNzW2tleV07XG5cbiAgICAgIGlmIChpc0Z1bmN0aW9uTWV0YWRhdGEodmFsdWUpKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdGhpcy5jb252ZXJ0RnVuY3Rpb24obW9kdWxlTmFtZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChpc01ldGFkYXRhU3ltYm9saWNDYWxsRXhwcmVzc2lvbih2YWx1ZSkpIHtcbiAgICAgICAgLy8gQ2xhc3MgbWVtYmVycyBjYW4gYWxzbyBjb250YWluIHN0YXRpYyBtZW1iZXJzIHRoYXQgY2FsbCBhIGZ1bmN0aW9uIHdpdGggbW9kdWxlXG4gICAgICAgIC8vIHJlZmVyZW5jZXMuIGUuZy4gXCJzdGF0aWMgbmdJbmplY3RhYmxlRGVmID0gzpRkZWZpbmVJbmplY3RhYmxlKC4uKVwiLiBXZSBhbHNvIG5lZWQgdG9cbiAgICAgICAgLy8gY29udmVydCB0aGVzZSBtb2R1bGUgcmVmZXJlbmNlcyBiZWNhdXNlIG90aGVyd2lzZSB0aGVzZSByZXNvbHZlIHRvIG5vbi1leGlzdGVudCBmaWxlcy5cbiAgICAgICAgcmVzdWx0W2tleV0gPSB0aGlzLmNvbnZlcnRWYWx1ZShtb2R1bGVOYW1lLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSBjb252ZXJ0RnVuY3Rpb24obW9kdWxlTmFtZTogc3RyaW5nLCB2YWx1ZTogRnVuY3Rpb25NZXRhZGF0YSk6IEZ1bmN0aW9uTWV0YWRhdGEge1xuICAgIHJldHVybiB7XG4gICAgICBfX3N5bWJvbGljOiAnZnVuY3Rpb24nLFxuICAgICAgcGFyYW1ldGVyczogdmFsdWUucGFyYW1ldGVycyxcbiAgICAgIGRlZmF1bHRzOiB2YWx1ZS5kZWZhdWx0cyAmJiB2YWx1ZS5kZWZhdWx0cy5tYXAodiA9PiB0aGlzLmNvbnZlcnRWYWx1ZShtb2R1bGVOYW1lLCB2KSksXG4gICAgICB2YWx1ZTogdGhpcy5jb252ZXJ0VmFsdWUobW9kdWxlTmFtZSwgdmFsdWUudmFsdWUpXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgY29udmVydFZhbHVlKG1vZHVsZU5hbWU6IHN0cmluZywgdmFsdWU6IE1ldGFkYXRhVmFsdWUpOiBNZXRhZGF0YVZhbHVlIHtcbiAgICBpZiAoaXNQcmltaXRpdmUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGlmIChpc01ldGFkYXRhRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb252ZXJ0RXJyb3IobW9kdWxlTmFtZSwgdmFsdWUpO1xuICAgIH1cbiAgICBpZiAoaXNNZXRhZGF0YVN5bWJvbGljRXhwcmVzc2lvbih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbnZlcnRFeHByZXNzaW9uKG1vZHVsZU5hbWUsIHZhbHVlKSAhO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB2YWx1ZS5tYXAodiA9PiB0aGlzLmNvbnZlcnRWYWx1ZShtb2R1bGVOYW1lLCB2KSk7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlIGl0IGlzIGEgbWV0YWRhdGEgb2JqZWN0LlxuICAgIGNvbnN0IG9iamVjdCA9IHZhbHVlIGFzIE1ldGFkYXRhT2JqZWN0O1xuICAgIGNvbnN0IHJlc3VsdDogTWV0YWRhdGFPYmplY3QgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgIHJlc3VsdFtrZXldID0gdGhpcy5jb252ZXJ0VmFsdWUobW9kdWxlTmFtZSwgb2JqZWN0W2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSBjb252ZXJ0RXhwcmVzc2lvbihcbiAgICAgIG1vZHVsZU5hbWU6IHN0cmluZywgdmFsdWU6IE1ldGFkYXRhU3ltYm9saWNFeHByZXNzaW9ufE1ldGFkYXRhRXJyb3J8bnVsbHxcbiAgICAgIHVuZGVmaW5lZCk6IE1ldGFkYXRhU3ltYm9saWNFeHByZXNzaW9ufE1ldGFkYXRhRXJyb3J8dW5kZWZpbmVkfG51bGwge1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgc3dpdGNoICh2YWx1ZS5fX3N5bWJvbGljKSB7XG4gICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICByZXR1cm4gdGhpcy5jb252ZXJ0RXJyb3IobW9kdWxlTmFtZSwgdmFsdWUgYXMgTWV0YWRhdGFFcnJvcik7XG4gICAgICAgIGNhc2UgJ3JlZmVyZW5jZSc6XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY29udmVydFJlZmVyZW5jZShtb2R1bGVOYW1lLCB2YWx1ZSBhcyBNZXRhZGF0YVN5bWJvbGljUmVmZXJlbmNlRXhwcmVzc2lvbik7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY29udmVydEV4cHJlc3Npb25Ob2RlKG1vZHVsZU5hbWUsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgcHJpdmF0ZSBjb252ZXJ0RXJyb3IobW9kdWxlOiBzdHJpbmcsIHZhbHVlOiBNZXRhZGF0YUVycm9yKTogTWV0YWRhdGFFcnJvciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIF9fc3ltYm9saWM6ICdlcnJvcicsXG4gICAgICBtZXNzYWdlOiB2YWx1ZS5tZXNzYWdlLFxuICAgICAgbGluZTogdmFsdWUubGluZSxcbiAgICAgIGNoYXJhY3RlcjogdmFsdWUuY2hhcmFjdGVyLFxuICAgICAgY29udGV4dDogdmFsdWUuY29udGV4dCwgbW9kdWxlXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgY29udmVydFJlZmVyZW5jZShtb2R1bGVOYW1lOiBzdHJpbmcsIHZhbHVlOiBNZXRhZGF0YVN5bWJvbGljUmVmZXJlbmNlRXhwcmVzc2lvbik6XG4gICAgICBNZXRhZGF0YVN5bWJvbGljUmVmZXJlbmNlRXhwcmVzc2lvbnxNZXRhZGF0YUVycm9yfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY3JlYXRlUmVmZXJlbmNlID0gKHN5bWJvbDogU3ltYm9sKTogTWV0YWRhdGFTeW1ib2xpY1JlZmVyZW5jZUV4cHJlc3Npb24gPT4ge1xuICAgICAgY29uc3QgZGVjbGFyYXRpb24gPSBzeW1ib2wuZGVjbGFyYXRpb24gITtcbiAgICAgIGlmIChkZWNsYXJhdGlvbi5tb2R1bGUuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgIC8vIFJlZmVyZW5jZSB0byBhIHN5bWJvbCBkZWZpbmVkIGluIHRoZSBtb2R1bGUuIEVuc3VyZSBpdCBpcyBjb252ZXJ0ZWQgdGhlbiByZXR1cm4gYVxuICAgICAgICAvLyByZWZlcmVuY2VzIHRvIHRoZSBmaW5hbCBzeW1ib2wuXG4gICAgICAgIHRoaXMuY29udmVydFN5bWJvbChzeW1ib2wpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIF9fc3ltYm9saWM6ICdyZWZlcmVuY2UnLFxuICAgICAgICAgIGdldCBuYW1lKCkge1xuICAgICAgICAgICAgLy8gUmVzb2x2ZWQgbGF6aWx5IGJlY2F1c2UgcHJpdmF0ZSBuYW1lcyBhcmUgYXNzaWduZWQgbGF0ZS5cbiAgICAgICAgICAgIGNvbnN0IGNhbm9uaWNhbFN5bWJvbCA9IHN5bWJvbC5jYW5vbmljYWxTeW1ib2wgITtcbiAgICAgICAgICAgIGlmIChjYW5vbmljYWxTeW1ib2wuaXNQcml2YXRlID09IG51bGwpIHtcbiAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ0ludmFsaWQgc3RhdGU6IGlzUHJpdmF0ZSB3YXMgbm90IGluaXRpYWxpemVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY2Fub25pY2FsU3ltYm9sLmlzUHJpdmF0ZSA/IGNhbm9uaWNhbFN5bWJvbC5wcml2YXRlTmFtZSAhIDogY2Fub25pY2FsU3ltYm9sLm5hbWU7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhlIHN5bWJvbCB3YXMgYSByZS1leHBvcnRlZCBzeW1ib2wgZnJvbSBhbm90aGVyIG1vZHVsZS4gUmV0dXJuIGEgcmVmZXJlbmNlIHRvIHRoZVxuICAgICAgICAvLyBvcmlnaW5hbCBpbXBvcnRlZCBzeW1ib2wuXG4gICAgICAgIHJldHVybiB7X19zeW1ib2xpYzogJ3JlZmVyZW5jZScsIG5hbWU6IGRlY2xhcmF0aW9uLm5hbWUsIG1vZHVsZTogZGVjbGFyYXRpb24ubW9kdWxlfTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGlzTWV0YWRhdGFHbG9iYWxSZWZlcmVuY2VFeHByZXNzaW9uKHZhbHVlKSkge1xuICAgICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLmdldE1ldGFkYXRhKG1vZHVsZU5hbWUpO1xuICAgICAgaWYgKG1ldGFkYXRhICYmIG1ldGFkYXRhLm1ldGFkYXRhICYmIG1ldGFkYXRhLm1ldGFkYXRhW3ZhbHVlLm5hbWVdKSB7XG4gICAgICAgIC8vIFJlZmVyZW5jZSB0byBhIHN5bWJvbCBkZWZpbmVkIGluIHRoZSBtb2R1bGVcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVJlZmVyZW5jZSh0aGlzLmNhbm9uaWNhbFN5bWJvbE9mKG1vZHVsZU5hbWUsIHZhbHVlLm5hbWUpKTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgYSByZWZlcmVuY2UgaGFzIGFyZ3VtZW50cywgdGhlIGFyZ3VtZW50cyBuZWVkIHRvIGJlIGNvbnZlcnRlZC5cbiAgICAgIGlmICh2YWx1ZS5hcmd1bWVudHMpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBfX3N5bWJvbGljOiAncmVmZXJlbmNlJyxcbiAgICAgICAgICBuYW1lOiB2YWx1ZS5uYW1lLFxuICAgICAgICAgIGFyZ3VtZW50czogdmFsdWUuYXJndW1lbnRzLm1hcChhID0+IHRoaXMuY29udmVydFZhbHVlKG1vZHVsZU5hbWUsIGEpKVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLyBHbG9iYWwgcmVmZXJlbmNlcyB3aXRob3V0IGFyZ3VtZW50cyAoc3VjaCBhcyB0byBNYXRoIG9yIEpTT04pIGFyZSB1bm1vZGlmaWVkLlxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIGlmIChpc01ldGFkYXRhSW1wb3J0ZWRTeW1ib2xSZWZlcmVuY2VFeHByZXNzaW9uKHZhbHVlKSkge1xuICAgICAgLy8gUmVmZXJlbmNlcyB0byBpbXBvcnRlZCBzeW1ib2xzIGFyZSBzZXBhcmF0ZWQgaW50byB0d28sIHJlZmVyZW5jZXMgdG8gYnVuZGxlZCBtb2R1bGVzIGFuZFxuICAgICAgLy8gcmVmZXJlbmNlcyB0byBtb2R1bGVzIGV4dGVybmFsIHRvIHRoZSBidW5kbGUuIElmIHRoZSBtb2R1bGUgcmVmZXJlbmNlIGlzIHJlbGF0aXZlIGl0IGlzXG4gICAgICAvLyBhc3N1bWVkIHRvIGJlIGluIHRoZSBidW5kbGUuIElmIGl0IGlzIEdsb2JhbCBpdCBpcyBhc3N1bWVkIHRvIGJlIG91dHNpZGUgdGhlIGJ1bmRsZS5cbiAgICAgIC8vIFJlZmVyZW5jZXMgdG8gc3ltYm9scyBvdXRzaWRlIHRoZSBidW5kbGUgYXJlIGxlZnQgdW5tb2RpZmllZC4gUmVmZXJlbmNlcyB0byBzeW1ib2wgaW5zaWRlXG4gICAgICAvLyB0aGUgYnVuZGxlIG5lZWQgdG8gYmUgY29udmVydGVkIHRvIGEgYnVuZGxlIGltcG9ydCByZWZlcmVuY2UgcmVhY2hhYmxlIGZyb20gdGhlIGJ1bmRsZVxuICAgICAgLy8gaW5kZXguXG5cbiAgICAgIGlmICh2YWx1ZS5tb2R1bGUuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgIC8vIFJlZmVyZW5jZSBpcyB0byBhIHN5bWJvbCBkZWZpbmVkIGluc2lkZSB0aGUgbW9kdWxlLiBDb252ZXJ0IHRoZSByZWZlcmVuY2UgdG8gYSByZWZlcmVuY2VcbiAgICAgICAgLy8gdG8gdGhlIGNhbm9uaWNhbCBzeW1ib2wuXG4gICAgICAgIGNvbnN0IHJlZmVyZW5jZWRNb2R1bGUgPSByZXNvbHZlTW9kdWxlKHZhbHVlLm1vZHVsZSwgbW9kdWxlTmFtZSk7XG4gICAgICAgIGNvbnN0IHJlZmVyZW5jZWROYW1lID0gdmFsdWUubmFtZTtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVJlZmVyZW5jZSh0aGlzLmNhbm9uaWNhbFN5bWJvbE9mKHJlZmVyZW5jZWRNb2R1bGUsIHJlZmVyZW5jZWROYW1lKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFZhbHVlIGlzIGEgcmVmZXJlbmNlIHRvIGEgc3ltYm9sIGRlZmluZWQgb3V0c2lkZSB0aGUgbW9kdWxlLlxuICAgICAgaWYgKHZhbHVlLmFyZ3VtZW50cykge1xuICAgICAgICAvLyBJZiBhIHJlZmVyZW5jZSBoYXMgYXJndW1lbnRzIHRoZSBhcmd1bWVudHMgbmVlZCB0byBiZSBjb252ZXJ0ZWQuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgX19zeW1ib2xpYzogJ3JlZmVyZW5jZScsXG4gICAgICAgICAgbmFtZTogdmFsdWUubmFtZSxcbiAgICAgICAgICBtb2R1bGU6IHZhbHVlLm1vZHVsZSxcbiAgICAgICAgICBhcmd1bWVudHM6IHZhbHVlLmFyZ3VtZW50cy5tYXAoYSA9PiB0aGlzLmNvbnZlcnRWYWx1ZShtb2R1bGVOYW1lLCBhKSlcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBpZiAoaXNNZXRhZGF0YU1vZHVsZVJlZmVyZW5jZUV4cHJlc3Npb24odmFsdWUpKSB7XG4gICAgICAvLyBDYW5ub3Qgc3VwcG9ydCByZWZlcmVuY2VzIHRvIGJ1bmRsZWQgbW9kdWxlcyBhcyB0aGUgaW50ZXJuYWwgbW9kdWxlcyBvZiBhIGJ1bmRsZSBhcmUgZXJhc2VkXG4gICAgICAvLyBieSB0aGUgYnVuZGxlci5cbiAgICAgIGlmICh2YWx1ZS5tb2R1bGUuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgX19zeW1ib2xpYzogJ2Vycm9yJyxcbiAgICAgICAgICBtZXNzYWdlOiAnVW5zdXBwb3J0ZWQgYnVuZGxlZCBtb2R1bGUgcmVmZXJlbmNlJyxcbiAgICAgICAgICBjb250ZXh0OiB7bW9kdWxlOiB2YWx1ZS5tb2R1bGV9XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIFJlZmVyZW5jZXMgdG8gdW5idW5kbGVkIG1vZHVsZXMgYXJlIHVubW9kaWZpZWQuXG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjb252ZXJ0RXhwcmVzc2lvbk5vZGUobW9kdWxlTmFtZTogc3RyaW5nLCB2YWx1ZTogTWV0YWRhdGFTeW1ib2xpY0V4cHJlc3Npb24pOlxuICAgICAgTWV0YWRhdGFTeW1ib2xpY0V4cHJlc3Npb24ge1xuICAgIGNvbnN0IHJlc3VsdDogTWV0YWRhdGFTeW1ib2xpY0V4cHJlc3Npb24gPSB7IF9fc3ltYm9saWM6IHZhbHVlLl9fc3ltYm9saWMgfSBhcyBhbnk7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIChyZXN1bHQgYXMgYW55KVtrZXldID0gdGhpcy5jb252ZXJ0VmFsdWUobW9kdWxlTmFtZSwgKHZhbHVlIGFzIGFueSlba2V5XSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIHN5bWJvbE9mKG1vZHVsZTogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBTeW1ib2wge1xuICAgIGNvbnN0IHN5bWJvbEtleSA9IGAke21vZHVsZX06JHtuYW1lfWA7XG4gICAgbGV0IHN5bWJvbCA9IHRoaXMuc3ltYm9sTWFwLmdldChzeW1ib2xLZXkpO1xuICAgIGlmICghc3ltYm9sKSB7XG4gICAgICBzeW1ib2wgPSB7bW9kdWxlLCBuYW1lfTtcbiAgICAgIHRoaXMuc3ltYm9sTWFwLnNldChzeW1ib2xLZXksIHN5bWJvbCk7XG4gICAgfVxuICAgIHJldHVybiBzeW1ib2w7XG4gIH1cblxuICBwcml2YXRlIGNhbm9uaWNhbFN5bWJvbE9mKG1vZHVsZTogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBTeW1ib2wge1xuICAgIC8vIEVuc3VyZSB0aGUgbW9kdWxlIGhhcyBiZWVuIHNlZW4uXG4gICAgdGhpcy5leHBvcnRBbGwobW9kdWxlKTtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnN5bWJvbE9mKG1vZHVsZSwgbmFtZSk7XG4gICAgaWYgKCFzeW1ib2wuY2Fub25pY2FsU3ltYm9sKSB7XG4gICAgICB0aGlzLmNhbm9uaWNhbGl6ZVN5bWJvbChzeW1ib2wpO1xuICAgIH1cbiAgICByZXR1cm4gc3ltYm9sO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDb21waWxlckhvc3RBZGFwdGVyIGltcGxlbWVudHMgTWV0YWRhdGFCdW5kbGVySG9zdCB7XG4gIHByaXZhdGUgY29sbGVjdG9yID0gbmV3IE1ldGFkYXRhQ29sbGVjdG9yKCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhvc3Q6IHRzLkNvbXBpbGVySG9zdCwgcHJpdmF0ZSBjYWNoZTogTWV0YWRhdGFDYWNoZXxudWxsLFxuICAgICAgcHJpdmF0ZSBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpIHt9XG5cbiAgZ2V0TWV0YWRhdGFGb3IoZmlsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IE1vZHVsZU1ldGFkYXRhfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qge3Jlc29sdmVkTW9kdWxlfSA9XG4gICAgICAgIHRzLnJlc29sdmVNb2R1bGVOYW1lKGZpbGVOYW1lLCBjb250YWluaW5nRmlsZSwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QpO1xuXG4gICAgbGV0IHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkO1xuICAgIGlmIChyZXNvbHZlZE1vZHVsZSkge1xuICAgICAgbGV0IHtyZXNvbHZlZEZpbGVOYW1lfSA9IHJlc29sdmVkTW9kdWxlO1xuICAgICAgaWYgKHJlc29sdmVkTW9kdWxlLmV4dGVuc2lvbiAhPT0gJy50cycpIHtcbiAgICAgICAgcmVzb2x2ZWRGaWxlTmFtZSA9IHJlc29sdmVkRmlsZU5hbWUucmVwbGFjZSgvKFxcLmRcXC50c3xcXC5qcykkLywgJy50cycpO1xuICAgICAgfVxuICAgICAgc291cmNlRmlsZSA9IHRoaXMuaG9zdC5nZXRTb3VyY2VGaWxlKHJlc29sdmVkRmlsZU5hbWUsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0eXBlc2NyaXB0IGlzIHVuYWJsZSB0byByZXNvbHZlIHRoZSBmaWxlLCBmYWxsYmFjayBvbiBvbGQgYmVoYXZpb3JcbiAgICAgIGlmICghdGhpcy5ob3N0LmZpbGVFeGlzdHMoZmlsZU5hbWUgKyAnLnRzJykpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICBzb3VyY2VGaWxlID0gdGhpcy5ob3N0LmdldFNvdXJjZUZpbGUoZmlsZU5hbWUgKyAnLnRzJywgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUgaXMgYSBtZXRhZGF0YSBjYWNoZSwgdXNlIGl0IHRvIGdldCB0aGUgbWV0YWRhdGEgZm9yIHRoaXMgc291cmNlIGZpbGUuIE90aGVyd2lzZSxcbiAgICAvLyBmYWxsIGJhY2sgb24gdGhlIGxvY2FsbHkgY3JlYXRlZCBNZXRhZGF0YUNvbGxlY3Rvci5cbiAgICBpZiAoIXNvdXJjZUZpbGUpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNhY2hlKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXRNZXRhZGF0YShzb3VyY2VGaWxlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY29sbGVjdG9yLmdldE1ldGFkYXRhKHNvdXJjZUZpbGUpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByZXNvbHZlTW9kdWxlKGltcG9ydE5hbWU6IHN0cmluZywgZnJvbTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGltcG9ydE5hbWUuc3RhcnRzV2l0aCgnLicpICYmIGZyb20pIHtcbiAgICBsZXQgbm9ybWFsUGF0aCA9IHBhdGgubm9ybWFsaXplKHBhdGguam9pbihwYXRoLmRpcm5hbWUoZnJvbSksIGltcG9ydE5hbWUpKTtcbiAgICBpZiAoIW5vcm1hbFBhdGguc3RhcnRzV2l0aCgnLicpICYmIGZyb20uc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAvLyBwYXRoLm5vcm1hbGl6ZSgpIHByZXNlcnZlcyBsZWFkaW5nICcuLi8nIGJ1dCBub3QgJy4vJy4gVGhpcyBhZGRzIGl0IGJhY2suXG4gICAgICBub3JtYWxQYXRoID0gYC4ke3BhdGguc2VwfSR7bm9ybWFsUGF0aH1gO1xuICAgIH1cbiAgICAvLyBSZXBsYWNlIHdpbmRvd3MgcGF0aCBkZWxpbWl0ZXJzIHdpdGggZm9yd2FyZC1zbGFzaGVzLiBPdGhlcndpc2UgdGhlIHBhdGhzIGFyZSBub3RcbiAgICAvLyBUeXBlU2NyaXB0IGNvbXBhdGlibGUgd2hlbiBidWlsZGluZyB0aGUgYnVuZGxlLlxuICAgIHJldHVybiBub3JtYWxQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgfVxuICByZXR1cm4gaW1wb3J0TmFtZTtcbn1cblxuZnVuY3Rpb24gaXNQcmltaXRpdmUobzogYW55KTogbyBpcyBib29sZWFufHN0cmluZ3xudW1iZXIge1xuICByZXR1cm4gbyA9PT0gbnVsbCB8fCAodHlwZW9mIG8gIT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIG8gIT09ICdvYmplY3QnKTtcbn1cblxuZnVuY3Rpb24gZ2V0Um9vdEV4cG9ydChzeW1ib2w6IFN5bWJvbCk6IFN5bWJvbCB7XG4gIHJldHVybiBzeW1ib2wucmVleHBvcnRlZEFzID8gZ2V0Um9vdEV4cG9ydChzeW1ib2wucmVleHBvcnRlZEFzKSA6IHN5bWJvbDtcbn1cblxuZnVuY3Rpb24gZ2V0U3ltYm9sRGVjbGFyYXRpb24oc3ltYm9sOiBTeW1ib2wpOiBTeW1ib2wge1xuICByZXR1cm4gc3ltYm9sLmV4cG9ydHMgPyBnZXRTeW1ib2xEZWNsYXJhdGlvbihzeW1ib2wuZXhwb3J0cykgOiBzeW1ib2w7XG59XG4iXX0=