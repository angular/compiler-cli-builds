/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
"use strict";
var tsc_wrapped_1 = require('@angular/tsc-wrapped');
var fs = require('fs');
var path = require('path');
var ts = require('typescript');
var compiler_private_1 = require('./compiler_private');
var static_reflector_1 = require('./static_reflector');
var EXT = /(\.ts|\.d\.ts|\.js|\.jsx|\.tsx)$/;
var DTS = /\.d\.ts$/;
var ReflectorHost = (function () {
    function ReflectorHost(program, compilerHost, options, context) {
        this.program = program;
        this.compilerHost = compilerHost;
        this.options = options;
        this.metadataCollector = new tsc_wrapped_1.MetadataCollector();
        this.typeCache = new Map();
        this.resolverCache = new Map();
        this.context = context || new NodeReflectorHostContext();
    }
    ReflectorHost.prototype.angularImportLocations = function () {
        return {
            coreDecorators: '@angular/core/src/metadata',
            diDecorators: '@angular/core/src/di/decorators',
            diMetadata: '@angular/core/src/di/metadata',
            diOpaqueToken: '@angular/core/src/di/opaque_token',
            animationMetadata: '@angular/core/src/animation/metadata',
            provider: '@angular/core/src/di/provider'
        };
    };
    ReflectorHost.prototype.resolve = function (m, containingFile) {
        var resolved = ts.resolveModuleName(m, containingFile, this.options, this.context).resolvedModule;
        return resolved ? resolved.resolvedFileName : null;
    };
    ;
    ReflectorHost.prototype.normalizeAssetUrl = function (url) {
        var assetUrl = compiler_private_1.AssetUrl.parse(url);
        return assetUrl ? assetUrl.packageName + "/" + assetUrl.modulePath : null;
    };
    ReflectorHost.prototype.resolveAssetUrl = function (url, containingFile) {
        var assetUrl = this.normalizeAssetUrl(url);
        if (assetUrl) {
            return this.resolve(assetUrl, containingFile);
        }
        return url;
    };
    /**
     * We want a moduleId that will appear in import statements in the generated code.
     * These need to be in a form that system.js can load, so absolute file paths don't work.
     * Relativize the paths by checking candidate prefixes of the absolute path, to see if
     * they are resolvable by the moduleResolution strategy from the CompilerHost.
     */
    ReflectorHost.prototype.getImportPath = function (containingFile, importedFile) {
        importedFile = this.resolveAssetUrl(importedFile, containingFile);
        containingFile = this.resolveAssetUrl(containingFile, '');
        // If a file does not yet exist (because we compile it later), we still need to
        // assume it exists it so that the `resolve` method works!
        if (!this.compilerHost.fileExists(importedFile)) {
            this.context.assumeFileExists(importedFile);
        }
        var importModuleName = importedFile.replace(EXT, '');
        var parts = importModuleName.split(path.sep).filter(function (p) { return !!p; });
        for (var index = parts.length - 1; index >= 0; index--) {
            var candidate_1 = parts.slice(index, parts.length).join(path.sep);
            if (this.resolve('.' + path.sep + candidate_1, containingFile) === importedFile) {
                return "./" + candidate_1;
            }
            if (this.resolve(candidate_1, containingFile) === importedFile) {
                return candidate_1;
            }
        }
        // Try a relative import
        var candidate = path.relative(path.dirname(containingFile), importModuleName);
        if (this.resolve(candidate, containingFile) === importedFile) {
            return candidate;
        }
        throw new Error("Unable to find any resolvable import for " + importedFile + " relative to " + containingFile);
    };
    ReflectorHost.prototype.findDeclaration = function (module, symbolName, containingFile, containingModule) {
        if (!containingFile || !containingFile.length) {
            if (module.indexOf('.') === 0) {
                throw new Error('Resolution of relative paths requires a containing file.');
            }
            // Any containing file gives the same result for absolute imports
            containingFile = path.join(this.options.basePath, 'index.ts');
        }
        try {
            var assetUrl = this.normalizeAssetUrl(module);
            if (assetUrl) {
                module = assetUrl;
            }
            var filePath = this.resolve(module, containingFile);
            if (!filePath) {
                // If the file cannot be found the module is probably referencing a declared module
                // for which there is no disambiguating file and we also don't need to track
                // re-exports. Just use the module name.
                return this.getStaticSymbol(module, symbolName);
            }
            var tc = this.program.getTypeChecker();
            var sf = this.program.getSourceFile(filePath);
            if (!sf || !sf.symbol) {
                // The source file was not needed in the compile but we do need the values from
                // the corresponding .ts files stored in the .metadata.json file. Check the file
                // for exports to see if the file is exported.
                return this.resolveExportedSymbol(filePath, symbolName) ||
                    this.getStaticSymbol(filePath, symbolName);
            }
            var symbol = tc.getExportsOfModule(sf.symbol).find(function (m) { return m.name === symbolName; });
            if (!symbol) {
                throw new Error("can't find symbol " + symbolName + " exported from module " + filePath);
            }
            if (symbol &&
                symbol.flags & ts.SymbolFlags.Alias) {
                symbol = tc.getAliasedSymbol(symbol);
            }
            var declaration = symbol.getDeclarations()[0];
            var declarationFile = declaration.getSourceFile().fileName;
            return this.getStaticSymbol(declarationFile, symbol.getName());
        }
        catch (e) {
            console.error("can't resolve module " + module + " from " + containingFile);
            throw e;
        }
    };
    /**
     * getStaticSymbol produces a Type whose metadata is known but whose implementation is not loaded.
     * All types passed to the StaticResolver should be pseudo-types returned by this method.
     *
     * @param declarationFile the absolute path of the file where the symbol is declared
     * @param name the name of the type.
     */
    ReflectorHost.prototype.getStaticSymbol = function (declarationFile, name) {
        var key = "\"" + declarationFile + "\"." + name;
        var result = this.typeCache.get(key);
        if (!result) {
            result = new static_reflector_1.StaticSymbol(declarationFile, name);
            this.typeCache.set(key, result);
        }
        return result;
    };
    ReflectorHost.prototype.getMetadataFor = function (filePath) {
        if (!this.context.fileExists(filePath)) {
            // If the file doesn't exists then we cannot return metadata for the file.
            // This will occur if the user refernced a declared module for which no file
            // exists for the module (i.e. jQuery or angularjs).
            return;
        }
        if (DTS.test(filePath)) {
            var metadataPath = filePath.replace(DTS, '.metadata.json');
            if (this.context.fileExists(metadataPath)) {
                return this.readMetadata(metadataPath);
            }
        }
        else {
            var sf = this.program.getSourceFile(filePath);
            if (!sf) {
                throw new Error("Source file " + filePath + " not present in program.");
            }
            return this.metadataCollector.getMetadata(sf);
        }
    };
    ReflectorHost.prototype.readMetadata = function (filePath) {
        try {
            return this.resolverCache.get(filePath) || JSON.parse(this.context.readFile(filePath));
        }
        catch (e) {
            console.error("Failed to read JSON file " + filePath);
            throw e;
        }
    };
    ReflectorHost.prototype.getResolverMetadata = function (filePath) {
        var metadata = this.resolverCache.get(filePath);
        if (!metadata) {
            metadata = this.getMetadataFor(filePath);
            this.resolverCache.set(filePath, metadata);
        }
        return metadata;
    };
    ReflectorHost.prototype.resolveExportedSymbol = function (filePath, symbolName) {
        var _this = this;
        var resolveModule = function (moduleName) {
            var resolvedModulePath = _this.resolve(moduleName, filePath);
            if (!resolvedModulePath) {
                throw new Error("Could not resolve module '" + moduleName + "' relative to file " + filePath);
            }
            return resolvedModulePath;
        };
        var metadata = this.getResolverMetadata(filePath);
        if (metadata) {
            // If we have metadata for the symbol, this is the original exporting location.
            if (metadata.metadata[symbolName]) {
                return this.getStaticSymbol(filePath, symbolName);
            }
            // If no, try to find the symbol in one of the re-export location
            if (metadata.exports) {
                // Try and find the symbol in the list of explicitly re-exported symbols.
                for (var _i = 0, _a = metadata.exports; _i < _a.length; _i++) {
                    var moduleExport = _a[_i];
                    if (moduleExport.export) {
                        var exportSymbol = moduleExport.export.find(function (symbol) {
                            if (typeof symbol === 'string') {
                                return symbol == symbolName;
                            }
                            else {
                                return symbol.as == symbolName;
                            }
                        });
                        if (exportSymbol) {
                            var symName = symbolName;
                            if (typeof exportSymbol !== 'string') {
                                symName = exportSymbol.name;
                            }
                            return this.resolveExportedSymbol(resolveModule(moduleExport.from), symName);
                        }
                    }
                }
                // Try to find the symbol via export * directives.
                for (var _b = 0, _c = metadata.exports; _b < _c.length; _b++) {
                    var moduleExport = _c[_b];
                    if (!moduleExport.export) {
                        var resolvedModule = resolveModule(moduleExport.from);
                        var candidateSymbol = this.resolveExportedSymbol(resolvedModule, symbolName);
                        if (candidateSymbol)
                            return candidateSymbol;
                    }
                }
            }
        }
        return null;
    };
    return ReflectorHost;
}());
exports.ReflectorHost = ReflectorHost;
var NodeReflectorHostContext = (function () {
    function NodeReflectorHostContext() {
        this.assumedExists = {};
    }
    NodeReflectorHostContext.prototype.fileExists = function (fileName) {
        return this.assumedExists[fileName] || fs.existsSync(fileName);
    };
    NodeReflectorHostContext.prototype.directoryExists = function (directoryName) {
        try {
            return fs.statSync(directoryName).isDirectory();
        }
        catch (e) {
            return false;
        }
    };
    NodeReflectorHostContext.prototype.readFile = function (fileName) { return fs.readFileSync(fileName, 'utf8'); };
    NodeReflectorHostContext.prototype.assumeFileExists = function (fileName) { this.assumedExists[fileName] = true; };
    return NodeReflectorHostContext;
}());
exports.NodeReflectorHostContext = NodeReflectorHostContext;
//# sourceMappingURL=reflector_host.js.map