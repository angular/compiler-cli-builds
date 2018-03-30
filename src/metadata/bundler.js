"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const path = require("path");
const ts = require("typescript");
const collector_1 = require("../metadata/collector");
const schema_1 = require("../metadata/schema");
// The character set used to produce private names.
const PRIVATE_NAME_CHARS = 'abcdefghijklmnopqrstuvwxyz';
class MetadataBundler {
    constructor(root, importAs, host, privateSymbolPrefix) {
        this.root = root;
        this.importAs = importAs;
        this.host = host;
        this.symbolMap = new Map();
        this.metadataCache = new Map();
        this.exports = new Map();
        this.rootModule = `./${path.basename(root)}`;
        this.privateSymbolPrefix = (privateSymbolPrefix || '').replace(/\W/g, '_');
    }
    getMetadataBundle() {
        // Export the root module. This also collects the transitive closure of all values referenced by
        // the exports.
        const exportedSymbols = this.exportAll(this.rootModule);
        this.canonicalizeSymbols(exportedSymbols);
        // TODO: exports? e.g. a module re-exports a symbol from another bundle
        const metadata = this.getEntries(exportedSymbols);
        const privates = Array.from(this.symbolMap.values())
            .filter(s => s.referenced && s.isPrivate)
            .map(s => ({
            privateName: s.privateName,
            name: s.declaration.name,
            module: s.declaration.module
        }));
        const origins = Array.from(this.symbolMap.values())
            .filter(s => s.referenced && !s.reexport)
            .reduce((p, s) => {
            p[s.isPrivate ? s.privateName : s.name] = s.declaration.module;
            return p;
        }, {});
        const exports = this.getReExports(exportedSymbols);
        return {
            metadata: {
                __symbolic: 'module',
                version: schema_1.METADATA_VERSION,
                exports: exports.length ? exports : undefined, metadata, origins,
                importAs: this.importAs
            },
            privates
        };
    }
    static resolveModule(importName, from) {
        return resolveModule(importName, from);
    }
    getMetadata(moduleName) {
        let result = this.metadataCache.get(moduleName);
        if (!result) {
            if (moduleName.startsWith('.')) {
                const fullModuleName = resolveModule(moduleName, this.root);
                result = this.host.getMetadataFor(fullModuleName);
            }
            this.metadataCache.set(moduleName, result);
        }
        return result;
    }
    exportAll(moduleName) {
        const module = this.getMetadata(moduleName);
        let result = this.exports.get(moduleName);
        if (result) {
            return result;
        }
        result = [];
        const exportSymbol = (exportedSymbol, exportAs) => {
            const symbol = this.symbolOf(moduleName, exportAs);
            result.push(symbol);
            exportedSymbol.reexportedAs = symbol;
            symbol.exports = exportedSymbol;
        };
        // Export all the symbols defined in this module.
        if (module && module.metadata) {
            for (let key in module.metadata) {
                const data = module.metadata[key];
                if (schema_1.isMetadataImportedSymbolReferenceExpression(data)) {
                    // This is a re-export of an imported symbol. Record this as a re-export.
                    const exportFrom = resolveModule(data.module, moduleName);
                    this.exportAll(exportFrom);
                    const symbol = this.symbolOf(exportFrom, data.name);
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
            for (const exportDeclaration of module.exports) {
                const exportFrom = resolveModule(exportDeclaration.from, moduleName);
                // Record all the exports from the module even if we don't use it directly.
                const exportedSymbols = this.exportAll(exportFrom);
                if (exportDeclaration.export) {
                    // Re-export all the named exports from a module.
                    for (const exportItem of exportDeclaration.export) {
                        const name = typeof exportItem == 'string' ? exportItem : exportItem.name;
                        const exportAs = typeof exportItem == 'string' ? exportItem : exportItem.as;
                        const symbol = this.symbolOf(exportFrom, name);
                        if (exportedSymbols && exportedSymbols.length == 1 && exportedSymbols[0].reexport &&
                            exportedSymbols[0].name == '*') {
                            // This is a named export from a module we have no metadata about. Record the named
                            // export as a re-export.
                            symbol.reexport = true;
                        }
                        exportSymbol(this.symbolOf(exportFrom, name), exportAs);
                    }
                }
                else {
                    // Re-export all the symbols from the module
                    const exportedSymbols = this.exportAll(exportFrom);
                    for (const exportedSymbol of exportedSymbols) {
                        const name = exportedSymbol.name;
                        exportSymbol(exportedSymbol, name);
                    }
                }
            }
        }
        if (!module) {
            // If no metadata is found for this import then it is considered external to the
            // library and should be recorded as a re-export in the final metadata if it is
            // eventually re-exported.
            const symbol = this.symbolOf(moduleName, '*');
            symbol.reexport = true;
            result.push(symbol);
        }
        this.exports.set(moduleName, result);
        return result;
    }
    /**
     * Fill in the canonicalSymbol which is the symbol that should be imported by factories.
     * The canonical symbol is the one exported by the index file for the bundle or definition
     * symbol for private symbols that are not exported by bundle index.
     */
    canonicalizeSymbols(exportedSymbols) {
        const symbols = Array.from(this.symbolMap.values());
        this.exported = new Set(exportedSymbols);
        symbols.forEach(this.canonicalizeSymbol, this);
    }
    canonicalizeSymbol(symbol) {
        const rootExport = getRootExport(symbol);
        const declaration = getSymbolDeclaration(symbol);
        const isPrivate = !this.exported.has(rootExport);
        const canonicalSymbol = isPrivate ? declaration : rootExport;
        symbol.isPrivate = isPrivate;
        symbol.declaration = declaration;
        symbol.canonicalSymbol = canonicalSymbol;
        symbol.reexport = declaration.reexport;
    }
    getEntries(exportedSymbols) {
        const result = {};
        const exportedNames = new Set(exportedSymbols.map(s => s.name));
        let privateName = 0;
        function newPrivateName(prefix) {
            while (true) {
                let digits = [];
                let index = privateName++;
                let base = PRIVATE_NAME_CHARS;
                while (!digits.length || index > 0) {
                    digits.unshift(base[index % base.length]);
                    index = Math.floor(index / base.length);
                }
                const result = `\u0275${prefix}${digits.join('')}`;
                if (!exportedNames.has(result))
                    return result;
            }
        }
        exportedSymbols.forEach(symbol => this.convertSymbol(symbol));
        const symbolsMap = new Map();
        Array.from(this.symbolMap.values()).forEach(symbol => {
            if (symbol.referenced && !symbol.reexport) {
                let name = symbol.name;
                const identifier = `${symbol.declaration.module}:${symbol.declaration.name}`;
                if (symbol.isPrivate && !symbol.privateName) {
                    name = newPrivateName(this.privateSymbolPrefix);
                    symbol.privateName = name;
                }
                if (symbolsMap.has(identifier)) {
                    const names = symbolsMap.get(identifier);
                    names.push(name);
                }
                else {
                    symbolsMap.set(identifier, [name]);
                }
                result[name] = symbol.value;
            }
        });
        // check for duplicated entries
        symbolsMap.forEach((names, identifier) => {
            if (names.length > 1) {
                const [module, declaredName] = identifier.split(':');
                // prefer the export that uses the declared name (if any)
                let reference = names.indexOf(declaredName);
                if (reference === -1) {
                    reference = 0;
                }
                // keep one entry and replace the others by references
                names.forEach((name, i) => {
                    if (i !== reference) {
                        result[name] = { __symbolic: 'reference', name: names[reference] };
                    }
                });
            }
        });
        return result;
    }
    getReExports(exportedSymbols) {
        const modules = new Map();
        const exportAlls = new Set();
        for (const symbol of exportedSymbols) {
            if (symbol.reexport) {
                // symbol.declaration is guaranteed to be defined during the phase this method is called.
                const declaration = symbol.declaration;
                const module = declaration.module;
                if (declaration.name == '*') {
                    // Reexport all the symbols.
                    exportAlls.add(declaration.module);
                }
                else {
                    // Re-export the symbol as the exported name.
                    let entry = modules.get(module);
                    if (!entry) {
                        entry = [];
                        modules.set(module, entry);
                    }
                    const as = symbol.name;
                    const name = declaration.name;
                    entry.push({ name, as });
                }
            }
        }
        return [
            ...Array.from(exportAlls.values()).map(from => ({ from })),
            ...Array.from(modules.entries()).map(([from, exports]) => ({ export: exports, from }))
        ];
    }
    convertSymbol(symbol) {
        // canonicalSymbol is ensured to be defined before this is called.
        const canonicalSymbol = symbol.canonicalSymbol;
        if (!canonicalSymbol.referenced) {
            canonicalSymbol.referenced = true;
            // declaration is ensured to be definded before this method is called.
            const declaration = canonicalSymbol.declaration;
            const module = this.getMetadata(declaration.module);
            if (module) {
                const value = module.metadata[declaration.name];
                if (value && !declaration.name.startsWith('___')) {
                    canonicalSymbol.value = this.convertEntry(declaration.module, value);
                }
            }
        }
    }
    convertEntry(moduleName, value) {
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
    }
    convertClass(moduleName, value) {
        return {
            __symbolic: 'class',
            arity: value.arity,
            extends: this.convertExpression(moduleName, value.extends),
            decorators: value.decorators && value.decorators.map(d => this.convertExpression(moduleName, d)),
            members: this.convertMembers(moduleName, value.members),
            statics: value.statics && this.convertStatics(moduleName, value.statics)
        };
    }
    convertMembers(moduleName, members) {
        const result = {};
        for (const name in members) {
            const value = members[name];
            result[name] = value.map(v => this.convertMember(moduleName, v));
        }
        return result;
    }
    convertMember(moduleName, member) {
        const result = { __symbolic: member.__symbolic };
        result.decorators =
            member.decorators && member.decorators.map(d => this.convertExpression(moduleName, d));
        if (schema_1.isMethodMetadata(member)) {
            result.parameterDecorators = member.parameterDecorators &&
                member.parameterDecorators.map(d => d && d.map(p => this.convertExpression(moduleName, p)));
            if (schema_1.isConstructorMetadata(member)) {
                if (member.parameters) {
                    result.parameters =
                        member.parameters.map(p => this.convertExpression(moduleName, p));
                }
            }
        }
        return result;
    }
    convertStatics(moduleName, statics) {
        let result = {};
        for (const key in statics) {
            const value = statics[key];
            result[key] = schema_1.isFunctionMetadata(value) ? this.convertFunction(moduleName, value) : value;
        }
        return result;
    }
    convertFunction(moduleName, value) {
        return {
            __symbolic: 'function',
            parameters: value.parameters,
            defaults: value.defaults && value.defaults.map(v => this.convertValue(moduleName, v)),
            value: this.convertValue(moduleName, value.value)
        };
    }
    convertValue(moduleName, value) {
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
            return value.map(v => this.convertValue(moduleName, v));
        }
        // Otherwise it is a metadata object.
        const object = value;
        const result = {};
        for (const key in object) {
            result[key] = this.convertValue(moduleName, object[key]);
        }
        return result;
    }
    convertExpression(moduleName, value) {
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
    }
    convertError(module, value) {
        return {
            __symbolic: 'error',
            message: value.message,
            line: value.line,
            character: value.character,
            context: value.context, module
        };
    }
    convertReference(moduleName, value) {
        const createReference = (symbol) => {
            const declaration = symbol.declaration;
            if (declaration.module.startsWith('.')) {
                // Reference to a symbol defined in the module. Ensure it is converted then return a
                // references to the final symbol.
                this.convertSymbol(symbol);
                return {
                    __symbolic: 'reference',
                    get name() {
                        // Resolved lazily because private names are assigned late.
                        const canonicalSymbol = symbol.canonicalSymbol;
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
            const metadata = this.getMetadata(moduleName);
            if (metadata && metadata.metadata && metadata.metadata[value.name]) {
                // Reference to a symbol defined in the module
                return createReference(this.canonicalSymbolOf(moduleName, value.name));
            }
            // If a reference has arguments, the arguments need to be converted.
            if (value.arguments) {
                return {
                    __symbolic: 'reference',
                    name: value.name,
                    arguments: value.arguments.map(a => this.convertValue(moduleName, a))
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
                const referencedModule = resolveModule(value.module, moduleName);
                const referencedName = value.name;
                return createReference(this.canonicalSymbolOf(referencedModule, referencedName));
            }
            // Value is a reference to a symbol defined outside the module.
            if (value.arguments) {
                // If a reference has arguments the arguments need to be converted.
                return {
                    __symbolic: 'reference',
                    name: value.name,
                    module: value.module,
                    arguments: value.arguments.map(a => this.convertValue(moduleName, a))
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
    }
    convertExpressionNode(moduleName, value) {
        const result = { __symbolic: value.__symbolic };
        for (const key in value) {
            result[key] = this.convertValue(moduleName, value[key]);
        }
        return result;
    }
    symbolOf(module, name) {
        const symbolKey = `${module}:${name}`;
        let symbol = this.symbolMap.get(symbolKey);
        if (!symbol) {
            symbol = { module, name };
            this.symbolMap.set(symbolKey, symbol);
        }
        return symbol;
    }
    canonicalSymbolOf(module, name) {
        // Ensure the module has been seen.
        this.exportAll(module);
        const symbol = this.symbolOf(module, name);
        if (!symbol.canonicalSymbol) {
            this.canonicalizeSymbol(symbol);
        }
        return symbol;
    }
}
exports.MetadataBundler = MetadataBundler;
class CompilerHostAdapter {
    constructor(host) {
        this.host = host;
        this.collector = new collector_1.MetadataCollector();
    }
    getMetadataFor(fileName) {
        if (!this.host.fileExists(fileName + '.ts'))
            return undefined;
        const sourceFile = this.host.getSourceFile(fileName + '.ts', ts.ScriptTarget.Latest);
        return sourceFile && this.collector.getMetadata(sourceFile);
    }
}
exports.CompilerHostAdapter = CompilerHostAdapter;
function resolveModule(importName, from) {
    if (importName.startsWith('.') && from) {
        let normalPath = path.normalize(path.join(path.dirname(from), importName));
        if (!normalPath.startsWith('.') && from.startsWith('.')) {
            // path.normalize() preserves leading '../' but not './'. This adds it back.
            normalPath = `.${path.sep}${normalPath}`;
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
//# sourceMappingURL=bundler.js.map