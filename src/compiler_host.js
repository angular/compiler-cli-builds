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
var EXT = /(\.ts|\.d\.ts|\.js|\.jsx|\.tsx)$/;
var DTS = /\.d\.ts$/;
var NODE_MODULES = '/node_modules/';
var IS_GENERATED = /\.(ngfactory|css(\.shim)?)$/;
var CompilerHost = (function () {
    function CompilerHost(program, compilerHost, options, context) {
        this.program = program;
        this.compilerHost = compilerHost;
        this.options = options;
        this.metadataCollector = new tsc_wrapped_1.MetadataCollector();
        this.resolverCache = new Map();
        // normalize the path so that it never ends with '/'.
        this.basePath = path.normalize(path.join(this.options.basePath, '.')).replace(/\\/g, '/');
        this.genDir = path.normalize(path.join(this.options.genDir, '.')).replace(/\\/g, '/');
        this.context = context || new NodeCompilerHostContext(compilerHost);
        var genPath = path.relative(this.basePath, this.genDir);
        this.isGenDirChildOfRootDir = genPath === '' || !genPath.startsWith('..');
    }
    // We use absolute paths on disk as canonical.
    CompilerHost.prototype.getCanonicalFileName = function (fileName) { return fileName; };
    CompilerHost.prototype.moduleNameToFileName = function (m, containingFile) {
        if (!containingFile || !containingFile.length) {
            if (m.indexOf('.') === 0) {
                throw new Error('Resolution of relative paths requires a containing file.');
            }
            // Any containing file gives the same result for absolute imports
            containingFile = this.getCanonicalFileName(path.join(this.basePath, 'index.ts'));
        }
        m = m.replace(EXT, '');
        var resolved = ts.resolveModuleName(m, containingFile.replace(/\\/g, '/'), this.options, this.context)
            .resolvedModule;
        return resolved ? this.getCanonicalFileName(resolved.resolvedFileName) : null;
    };
    ;
    /**
     * We want a moduleId that will appear in import statements in the generated code.
     * These need to be in a form that system.js can load, so absolute file paths don't work.
     *
     * The `containingFile` is always in the `genDir`, where as the `importedFile` can be in
     * `genDir`, `node_module` or `basePath`.  The `importedFile` is either a generated file or
     * existing file.
     *
     *               | genDir   | node_module |  rootDir
     * --------------+----------+-------------+----------
     * generated     | relative |   relative  |   n/a
     * existing file |   n/a    |   absolute  |  relative(*)
     *
     * NOTE: (*) the relative path is computed depending on `isGenDirChildOfRootDir`.
     */
    CompilerHost.prototype.fileNameToModuleName = function (importedFile, containingFile) {
        // If a file does not yet exist (because we compile it later), we still need to
        // assume it exists it so that the `resolve` method works!
        if (!this.compilerHost.fileExists(importedFile)) {
            this.context.assumeFileExists(importedFile);
        }
        containingFile = this.rewriteGenDirPath(containingFile);
        var containingDir = path.dirname(containingFile);
        // drop extension
        importedFile = importedFile.replace(EXT, '');
        var nodeModulesIndex = importedFile.indexOf(NODE_MODULES);
        var importModule = nodeModulesIndex === -1 ?
            null :
            importedFile.substring(nodeModulesIndex + NODE_MODULES.length);
        var isGeneratedFile = IS_GENERATED.test(importedFile);
        if (isGeneratedFile) {
            // rewrite to genDir path
            if (importModule) {
                // it is generated, therefore we do a relative path to the factory
                return this.dotRelative(containingDir, this.genDir + NODE_MODULES + importModule);
            }
            else {
                // assume that import is also in `genDir`
                importedFile = this.rewriteGenDirPath(importedFile);
                return this.dotRelative(containingDir, importedFile);
            }
        }
        else {
            // user code import
            if (importModule) {
                return importModule;
            }
            else {
                if (!this.isGenDirChildOfRootDir) {
                    // assume that they are on top of each other.
                    importedFile = importedFile.replace(this.basePath, this.genDir);
                }
                return this.dotRelative(containingDir, importedFile);
            }
        }
    };
    CompilerHost.prototype.dotRelative = function (from, to) {
        var rPath = path.relative(from, to).replace(/\\/g, '/');
        return rPath.startsWith('.') ? rPath : './' + rPath;
    };
    /**
     * Moves the path into `genDir` folder while preserving the `node_modules` directory.
     */
    CompilerHost.prototype.rewriteGenDirPath = function (filepath) {
        var nodeModulesIndex = filepath.indexOf(NODE_MODULES);
        if (nodeModulesIndex !== -1) {
            // If we are in node_modulse, transplant them into `genDir`.
            return path.join(this.genDir, filepath.substring(nodeModulesIndex));
        }
        else {
            // pretend that containing file is on top of the `genDir` to normalize the paths.
            // we apply the `genDir` => `rootDir` delta through `rootDirPrefix` later.
            return filepath.replace(this.basePath, this.genDir);
        }
    };
    CompilerHost.prototype.getSourceFile = function (filePath) {
        var sf = this.program.getSourceFile(filePath);
        if (!sf) {
            if (this.context.fileExists(filePath)) {
                var sourceText = this.context.readFile(filePath);
                return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
            }
            throw new Error("Source file " + filePath + " not present in program.");
        }
        return sf;
    };
    CompilerHost.prototype.getMetadataFor = function (filePath) {
        if (!this.context.fileExists(filePath)) {
            // If the file doesn't exists then we cannot return metadata for the file.
            // This will occur if the user refernced a declared module for which no file
            // exists for the module (i.e. jQuery or angularjs).
            return;
        }
        if (DTS.test(filePath)) {
            var metadataPath = filePath.replace(DTS, '.metadata.json');
            if (this.context.fileExists(metadataPath)) {
                return this.readMetadata(metadataPath, filePath);
            }
        }
        else {
            var sf = this.getSourceFile(filePath);
            var metadata = this.metadataCollector.getMetadata(sf);
            return metadata ? [metadata] : [];
        }
    };
    CompilerHost.prototype.readMetadata = function (filePath, dtsFilePath) {
        var metadatas = this.resolverCache.get(filePath);
        if (metadatas) {
            return metadatas;
        }
        try {
            var metadataOrMetadatas = JSON.parse(this.context.readFile(filePath));
            var metadatas_1 = metadataOrMetadatas ?
                (Array.isArray(metadataOrMetadatas) ? metadataOrMetadatas : [metadataOrMetadatas]) :
                [];
            var v1Metadata = metadatas_1.find(function (m) { return m['version'] === 1; });
            var v2Metadata = metadatas_1.find(function (m) { return m['version'] === 2; });
            if (!v2Metadata && v1Metadata) {
                // patch up v1 to v2 by merging the metadata with metadata collected from the d.ts file
                // as the only difference between the versions is whether all exports are contained in
                // the metadata and the `extends` clause.
                v2Metadata = { '__symbolic': 'module', 'version': 2, 'metadata': {} };
                if (v1Metadata.exports) {
                    v2Metadata.exports = v1Metadata.exports;
                }
                for (var prop in v1Metadata.metadata) {
                    v2Metadata.metadata[prop] = v1Metadata.metadata[prop];
                }
                var sourceText = this.context.readFile(dtsFilePath);
                var exports_1 = this.metadataCollector.getMetadata(this.getSourceFile(dtsFilePath));
                if (exports_1) {
                    for (var prop in exports_1.metadata) {
                        if (!v2Metadata.metadata[prop]) {
                            v2Metadata.metadata[prop] = exports_1.metadata[prop];
                        }
                    }
                }
                metadatas_1.push(v2Metadata);
            }
            this.resolverCache.set(filePath, metadatas_1);
            return metadatas_1;
        }
        catch (e) {
            console.error("Failed to read JSON file " + filePath);
            throw e;
        }
    };
    CompilerHost.prototype.loadResource = function (filePath) { return this.context.readResource(filePath); };
    return CompilerHost;
}());
exports.CompilerHost = CompilerHost;
var NodeCompilerHostContext = (function () {
    function NodeCompilerHostContext(host) {
        this.host = host;
        this.assumedExists = {};
    }
    NodeCompilerHostContext.prototype.fileExists = function (fileName) {
        return this.assumedExists[fileName] || this.host.fileExists(fileName);
    };
    NodeCompilerHostContext.prototype.directoryExists = function (directoryName) {
        try {
            return fs.statSync(directoryName).isDirectory();
        }
        catch (e) {
            return false;
        }
    };
    NodeCompilerHostContext.prototype.readFile = function (fileName) { return fs.readFileSync(fileName, 'utf8'); };
    NodeCompilerHostContext.prototype.readResource = function (s) {
        if (!this.host.fileExists(s)) {
            // TODO: We should really have a test for error cases like this!
            throw new Error("Compilation failed. Resource file not found: " + s);
        }
        return Promise.resolve(this.host.readFile(s));
    };
    NodeCompilerHostContext.prototype.assumeFileExists = function (fileName) { this.assumedExists[fileName] = true; };
    return NodeCompilerHostContext;
}());
exports.NodeCompilerHostContext = NodeCompilerHostContext;
//# sourceMappingURL=compiler_host.js.map