"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var compiler_1 = require("@angular/compiler");
var path = require("path");
var ts = require("typescript");
var compiler_host_1 = require("../compiler_host");
var util_1 = require("./util");
var NODE_MODULES_PACKAGE_NAME = /node_modules\/((\w|-)+|(@(\w|-)+\/(\w|-)+))/;
var DTS = /\.d\.ts$/;
var EXT = /(\.ts|\.d\.ts|\.js|\.jsx|\.tsx)$/;
function createCompilerHost(_a) {
    var options = _a.options, _b = _a.tsHost, tsHost = _b === void 0 ? ts.createCompilerHost(options, true) : _b;
    return tsHost;
}
exports.createCompilerHost = createCompilerHost;
/**
 * Implements the following hosts based on an api.CompilerHost:
 * - ts.CompilerHost to be consumed by a ts.Program
 * - AotCompilerHost for @angular/compiler
 * - TypeCheckHost for mapping ts errors to ng errors (via translateDiagnostics)
 */
var TsCompilerAotCompilerTypeCheckHostAdapter = (function (_super) {
    __extends(TsCompilerAotCompilerTypeCheckHostAdapter, _super);
    function TsCompilerAotCompilerTypeCheckHostAdapter(rootFiles, options, context, metadataProvider, codeGenerator, librarySummaries) {
        if (librarySummaries === void 0) { librarySummaries = new Map(); }
        var _this = _super.call(this, options, context) || this;
        _this.rootFiles = rootFiles;
        _this.metadataProvider = metadataProvider;
        _this.codeGenerator = codeGenerator;
        _this.librarySummaries = librarySummaries;
        _this.originalSourceFiles = new Map();
        _this.originalFileExistsCache = new Map();
        _this.generatedSourceFiles = new Map();
        _this.generatedCodeFor = new Map();
        _this.emitter = new compiler_1.TypeScriptEmitter();
        _this.getDefaultLibFileName = function (options) {
            return _this.context.getDefaultLibFileName(options);
        };
        _this.getCurrentDirectory = function () { return _this.context.getCurrentDirectory(); };
        _this.getCanonicalFileName = function (fileName) { return _this.context.getCanonicalFileName(fileName); };
        _this.useCaseSensitiveFileNames = function () { return _this.context.useCaseSensitiveFileNames(); };
        _this.getNewLine = function () { return _this.context.getNewLine(); };
        // Make sure we do not `host.realpath()` from TS as we do not want to resolve symlinks.
        // https://github.com/Microsoft/TypeScript/issues/9552
        _this.realPath = function (p) { return p; };
        _this.writeFile = _this.context.writeFile.bind(_this.context);
        _this.moduleResolutionCache = ts.createModuleResolutionCache(_this.context.getCurrentDirectory(), _this.context.getCanonicalFileName.bind(_this.context));
        var basePath = _this.options.basePath;
        _this.rootDirs =
            (_this.options.rootDirs || [_this.options.basePath]).map(function (p) { return path.resolve(basePath, p); });
        if (context.getDirectories) {
            _this.getDirectories = function (path) { return context.getDirectories(path); };
        }
        if (context.directoryExists) {
            _this.directoryExists = function (directoryName) { return context.directoryExists(directoryName); };
        }
        if (context.getCancellationToken) {
            _this.getCancellationToken = function () { return context.getCancellationToken(); };
        }
        if (context.getDefaultLibLocation) {
            _this.getDefaultLibLocation = function () { return context.getDefaultLibLocation(); };
        }
        if (context.trace) {
            _this.trace = function (s) { return context.trace(s); };
        }
        if (context.fileNameToModuleName) {
            _this.fileNameToModuleName = context.fileNameToModuleName.bind(context);
        }
        // Note: don't copy over context.moduleNameToFileName as we first
        // normalize undefined containingFile to a filled containingFile.
        if (context.resourceNameToFileName) {
            _this.resourceNameToFileName = context.resourceNameToFileName.bind(context);
        }
        if (context.toSummaryFileName) {
            _this.toSummaryFileName = context.toSummaryFileName.bind(context);
        }
        if (context.fromSummaryFileName) {
            _this.fromSummaryFileName = context.fromSummaryFileName.bind(context);
        }
        return _this;
    }
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.resolveModuleName = function (moduleName, containingFile) {
        var rm = ts.resolveModuleName(moduleName, containingFile, this.options, this, this.moduleResolutionCache)
            .resolvedModule;
        if (rm && this.isSourceFile(rm.resolvedFileName)) {
            // Case: generateCodeForLibraries = true and moduleName is
            // a .d.ts file in a node_modules folder.
            // Need to set isExternalLibraryImport to false so that generated files for that file
            // are emitted.
            rm.isExternalLibraryImport = false;
        }
        return rm;
    };
    // Note: We implement this method so that TypeScript and Angular share the same
    // ts.ModuleResolutionCache
    // and that we can tell ts.Program about our different opinion about
    // ResolvedModule.isExternalLibraryImport
    // (see our isSourceFile method).
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.resolveModuleNames = function (moduleNames, containingFile) {
        var _this = this;
        // TODO(tbosch): this seems to be a typing error in TypeScript,
        // as it contains assertions that the result contains the same number of entries
        // as the given module names.
        return moduleNames.map(function (moduleName) { return _this.resolveModuleName(moduleName, containingFile); });
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.moduleNameToFileName = function (m, containingFile) {
        if (!containingFile) {
            if (m.indexOf('.') === 0) {
                throw new Error('Resolution of relative paths requires a containing file.');
            }
            // Any containing file gives the same result for absolute imports
            containingFile = this.rootFiles[0];
        }
        if (this.context.moduleNameToFileName) {
            return this.context.moduleNameToFileName(m, containingFile);
        }
        var resolved = this.resolveModuleName(m, containingFile);
        return resolved ? resolved.resolvedFileName : null;
    };
    /**
     * We want a moduleId that will appear in import statements in the generated code
     * which will be written to `containingFile`.
     *
     * Note that we also generate files for files in node_modules, as libraries
     * only ship .metadata.json files but not the generated code.
     *
     * Logic:
     * 1. if the importedFile and the containingFile are from the project sources
     *    or from the same node_modules package, use a relative path
     * 2. if the importedFile is in a node_modules package,
     *    use a path that starts with the package name.
     * 3. Error if the containingFile is in the node_modules package
     *    and the importedFile is in the project soures,
     *    as that is a violation of the principle that node_modules packages cannot
     *    import project sources.
     */
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.fileNameToModuleName = function (importedFile, containingFile) {
        var originalImportedFile = importedFile;
        if (this.options.traceResolution) {
            console.error('fileNameToModuleName from containingFile', containingFile, 'to importedFile', importedFile);
        }
        // drop extension
        importedFile = importedFile.replace(EXT, '');
        var importedFilePackagName = getPackageName(importedFile);
        var containingFilePackageName = getPackageName(containingFile);
        var moduleName;
        if (importedFilePackagName === containingFilePackageName) {
            var rootedContainingFile = relativeToRootDirs(containingFile, this.rootDirs);
            var rootedImportedFile = relativeToRootDirs(importedFile, this.rootDirs);
            if (rootedContainingFile !== containingFile && rootedImportedFile !== importedFile) {
                // if both files are contained in the `rootDirs`, then strip the rootDirs
                containingFile = rootedContainingFile;
                importedFile = rootedImportedFile;
            }
            moduleName = dotRelative(path.dirname(containingFile), importedFile);
        }
        else if (importedFilePackagName) {
            moduleName = stripNodeModulesPrefix(importedFile);
        }
        else {
            throw new Error("Trying to import a source file from a node_modules package: import " + originalImportedFile + " from " + containingFile);
        }
        return moduleName;
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.resourceNameToFileName = function (resourceName, containingFile) {
        // Note: we convert package paths into relative paths to be compatible with the the
        // previous implementation of UrlResolver.
        var firstChar = resourceName[0];
        if (firstChar === '/') {
            resourceName = resourceName.slice(1);
        }
        else if (firstChar !== '.') {
            resourceName = "./" + resourceName;
        }
        var filePathWithNgResource = this.moduleNameToFileName(addNgResourceSuffix(resourceName), containingFile);
        return filePathWithNgResource ? stripNgResourceSuffix(filePathWithNgResource) : null;
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.toSummaryFileName = function (fileName, referringSrcFileName) {
        return this.fileNameToModuleName(fileName, referringSrcFileName);
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.fromSummaryFileName = function (fileName, referringLibFileName) {
        var resolved = this.moduleNameToFileName(fileName, referringLibFileName);
        if (!resolved) {
            throw new Error("Could not resolve " + fileName + " from " + referringLibFileName);
        }
        return resolved;
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.parseSourceSpanOf = function (fileName, line, character) {
        var data = this.generatedSourceFiles.get(fileName);
        if (data && data.emitCtx) {
            return data.emitCtx.spanOf(line, character);
        }
        return null;
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.getOriginalSourceFile = function (filePath, languageVersion, onError) {
        // Note: we need the explicit check via `has` as we also cache results
        // that were null / undefined.
        if (this.originalSourceFiles.has(filePath)) {
            return this.originalSourceFiles.get(filePath);
        }
        if (!languageVersion) {
            languageVersion = this.options.target || ts.ScriptTarget.Latest;
        }
        // Note: This can also return undefined,
        // as the TS typings are not correct!
        var sf = this.context.getSourceFile(filePath, languageVersion, onError) || null;
        this.originalSourceFiles.set(filePath, sf);
        return sf;
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.getMetadataForSourceFile = function (filePath) {
        var sf = this.getOriginalSourceFile(filePath);
        if (!sf) {
            return undefined;
        }
        return this.metadataProvider.getMetadata(sf);
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.updateGeneratedFile = function (genFile) {
        if (!genFile.stmts) {
            throw new Error("Invalid Argument: Expected a GenerateFile with statements. " + genFile.genFileUrl);
        }
        var oldGenFile = this.generatedSourceFiles.get(genFile.genFileUrl);
        if (!oldGenFile) {
            throw new Error("Illegal State: previous GeneratedFile not found for " + genFile.genFileUrl + ".");
        }
        var newRefs = genFileExternalReferences(genFile);
        var oldRefs = oldGenFile.externalReferences;
        var refsAreEqual = oldRefs.size === newRefs.size;
        if (refsAreEqual) {
            newRefs.forEach(function (r) { return refsAreEqual = refsAreEqual && oldRefs.has(r); });
        }
        if (!refsAreEqual) {
            throw new Error("Illegal State: external references changed in " + genFile.genFileUrl + ".\nOld: " + Array.from(oldRefs) + ".\nNew: " + Array.from(newRefs));
        }
        return this.addGeneratedFile(genFile, newRefs);
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.addGeneratedFile = function (genFile, externalReferences) {
        if (!genFile.stmts) {
            throw new Error("Invalid Argument: Expected a GenerateFile with statements. " + genFile.genFileUrl);
        }
        var _a = this.emitter.emitStatementsAndContext(genFile.srcFileUrl, genFile.genFileUrl, genFile.stmts, /* preamble */ '', 
        /* emitSourceMaps */ false), sourceText = _a.sourceText, context = _a.context;
        var sf = ts.createSourceFile(genFile.genFileUrl, sourceText, this.options.target || ts.ScriptTarget.Latest);
        this.generatedSourceFiles.set(genFile.genFileUrl, {
            sourceFile: sf,
            emitCtx: context, externalReferences: externalReferences,
        });
        return sf;
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.shouldGenerateFile = function (fileName) {
        var _this = this;
        // TODO(tbosch): allow generating files that are not in the rootDir
        // See https://github.com/angular/angular/issues/19337
        if (this.options.rootDir && !pathStartsWithPrefix(this.options.rootDir, fileName)) {
            return { generate: false };
        }
        var genMatch = util_1.GENERATED_FILES.exec(fileName);
        if (!genMatch) {
            return { generate: false };
        }
        var base = genMatch[1], genSuffix = genMatch[2], suffix = genMatch[3];
        if (suffix !== 'ts') {
            return { generate: false };
        }
        var baseFileName;
        if (genSuffix.indexOf('ngstyle') >= 0) {
            // Note: ngstyle files have names like `afile.css.ngstyle.ts`
            if (!this.originalFileExists(base)) {
                return { generate: false };
            }
        }
        else {
            // Note: on-the-fly generated files always have a `.ts` suffix,
            // but the file from which we generated it can be a `.ts`/ `.d.ts`
            // (see options.generateCodeForLibraries).
            baseFileName = [base + ".ts", base + ".d.ts"].find(function (baseFileName) { return _this.isSourceFile(baseFileName) && _this.originalFileExists(baseFileName); });
            if (!baseFileName) {
                return { generate: false };
            }
        }
        return { generate: true, baseFileName: baseFileName };
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.shouldGenerateFilesFor = function (fileName) {
        // TODO(tbosch): allow generating files that are not in the rootDir
        // See https://github.com/angular/angular/issues/19337
        return !util_1.GENERATED_FILES.test(fileName) && this.isSourceFile(fileName) &&
            (!this.options.rootDir || pathStartsWithPrefix(this.options.rootDir, fileName));
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.getSourceFile = function (fileName, languageVersion, onError) {
        // Note: Don't exit early in this method to make sure
        // we always have up to date references on the file!
        var genFileNames = [];
        var sf = this.getGeneratedFile(fileName);
        if (!sf) {
            var summary = this.librarySummaries.get(fileName);
            if (summary) {
                if (!summary.sourceFile) {
                    summary.sourceFile = ts.createSourceFile(fileName, summary.text, this.options.target || ts.ScriptTarget.Latest);
                }
                sf = summary.sourceFile;
                genFileNames = [];
            }
        }
        if (!sf) {
            sf = this.getOriginalSourceFile(fileName);
            var cachedGenFiles = this.generatedCodeFor.get(fileName);
            if (cachedGenFiles) {
                genFileNames = cachedGenFiles;
            }
            else {
                if (!this.options.noResolve && this.shouldGenerateFilesFor(fileName)) {
                    genFileNames = this.codeGenerator.findGeneratedFileNames(fileName);
                }
                this.generatedCodeFor.set(fileName, genFileNames);
            }
        }
        if (sf) {
            addReferencesToSourceFile(sf, genFileNames);
        }
        // TODO(tbosch): TypeScript's typings for getSourceFile are incorrect,
        // as it can very well return undefined.
        return sf;
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.getGeneratedFile = function (fileName) {
        var genSrcFile = this.generatedSourceFiles.get(fileName);
        if (genSrcFile) {
            return genSrcFile.sourceFile;
        }
        var _a = this.shouldGenerateFile(fileName), generate = _a.generate, baseFileName = _a.baseFileName;
        if (generate) {
            var genFile = this.codeGenerator.generateFile(fileName, baseFileName);
            return this.addGeneratedFile(genFile, genFileExternalReferences(genFile));
        }
        return null;
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.originalFileExists = function (fileName) {
        var fileExists = this.originalFileExistsCache.get(fileName);
        if (fileExists == null) {
            fileExists = this.context.fileExists(fileName);
            this.originalFileExistsCache.set(fileName, fileExists);
        }
        return fileExists;
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.fileExists = function (fileName) {
        fileName = stripNgResourceSuffix(fileName);
        if (this.librarySummaries.has(fileName) || this.generatedSourceFiles.has(fileName)) {
            return true;
        }
        if (this.shouldGenerateFile(fileName).generate) {
            return true;
        }
        return this.originalFileExists(fileName);
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.loadSummary = function (filePath) {
        var summary = this.librarySummaries.get(filePath);
        if (summary) {
            return summary.text;
        }
        return _super.prototype.loadSummary.call(this, filePath);
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.isSourceFile = function (filePath) {
        // If we have a summary from a previous compilation,
        // treat the file never as a source file.
        if (this.librarySummaries.has(filePath)) {
            return false;
        }
        return _super.prototype.isSourceFile.call(this, filePath);
    };
    TsCompilerAotCompilerTypeCheckHostAdapter.prototype.readFile = function (fileName) {
        var summary = this.librarySummaries.get(fileName);
        if (summary) {
            return summary.text;
        }
        return this.context.readFile(fileName);
    };
    return TsCompilerAotCompilerTypeCheckHostAdapter;
}(compiler_host_1.BaseAotCompilerHost));
exports.TsCompilerAotCompilerTypeCheckHostAdapter = TsCompilerAotCompilerTypeCheckHostAdapter;
function genFileExternalReferences(genFile) {
    return new Set(compiler_1.collectExternalReferences(genFile.stmts).map(function (er) { return er.moduleName; }));
}
function addReferencesToSourceFile(sf, genFileNames) {
    // Note: as we modify ts.SourceFiles we need to keep the original
    // value for `referencedFiles` around in cache the original host is caching ts.SourceFiles.
    // Note: cloning the ts.SourceFile is expensive as the nodes in have parent pointers,
    // i.e. we would also need to clone and adjust all nodes.
    var originalReferencedFiles = sf.originalReferencedFiles;
    if (!originalReferencedFiles) {
        originalReferencedFiles = sf.referencedFiles;
        sf.originalReferencedFiles = originalReferencedFiles;
    }
    var newReferencedFiles = originalReferencedFiles.slice();
    genFileNames.forEach(function (gf) { return newReferencedFiles.push({ fileName: gf, pos: 0, end: 0 }); });
    sf.referencedFiles = newReferencedFiles;
}
function getOriginalReferences(sourceFile) {
    return sourceFile && sourceFile.originalReferencedFiles;
}
exports.getOriginalReferences = getOriginalReferences;
function dotRelative(from, to) {
    var rPath = path.relative(from, to).replace(/\\/g, '/');
    return rPath.startsWith('.') ? rPath : './' + rPath;
}
/**
 * Moves the path into `genDir` folder while preserving the `node_modules` directory.
 */
function getPackageName(filePath) {
    var match = NODE_MODULES_PACKAGE_NAME.exec(filePath);
    return match ? match[1] : null;
}
function relativeToRootDirs(filePath, rootDirs) {
    if (!filePath)
        return filePath;
    for (var _i = 0, _a = rootDirs || []; _i < _a.length; _i++) {
        var dir = _a[_i];
        var rel = pathStartsWithPrefix(dir, filePath);
        if (rel) {
            return rel;
        }
    }
    return filePath;
}
exports.relativeToRootDirs = relativeToRootDirs;
function pathStartsWithPrefix(prefix, fullPath) {
    var rel = path.relative(prefix, fullPath);
    return rel.startsWith('..') ? null : rel;
}
function stripNodeModulesPrefix(filePath) {
    return filePath.replace(/.*node_modules\//, '');
}
function getNodeModulesPrefix(filePath) {
    var match = /.*node_modules\//.exec(filePath);
    return match ? match[1] : null;
}
function stripNgResourceSuffix(fileName) {
    return fileName.replace(/\.\$ngresource\$.*/, '');
}
function addNgResourceSuffix(fileName) {
    return fileName + ".$ngresource$";
}
//# sourceMappingURL=compiler_host.js.map