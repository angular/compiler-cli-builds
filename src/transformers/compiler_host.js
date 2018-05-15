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
        define("@angular/compiler-cli/src/transformers/compiler_host", ["require", "exports", "tslib", "@angular/compiler", "path", "typescript", "@angular/compiler-cli/src/ngtsc/compiler_host", "@angular/compiler-cli/src/transformers/metadata_reader", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var path = require("path");
    var ts = require("typescript");
    var compiler_host_1 = require("@angular/compiler-cli/src/ngtsc/compiler_host");
    var metadata_reader_1 = require("@angular/compiler-cli/src/transformers/metadata_reader");
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    var NODE_MODULES_PACKAGE_NAME = /node_modules\/((\w|-)+|(@(\w|-)+\/(\w|-)+))/;
    var EXT = /(\.ts|\.d\.ts|\.js|\.jsx|\.tsx)$/;
    function createCompilerHost(_a) {
        var options = _a.options, _b = _a.tsHost, tsHost = _b === void 0 ? ts.createCompilerHost(options, true) : _b;
        if (options.enableIvy) {
            return new compiler_host_1.NgtscCompilerHost(tsHost);
        }
        return tsHost;
    }
    exports.createCompilerHost = createCompilerHost;
    function assert(condition) {
        if (!condition) {
            // TODO(chuckjaz): do the right thing
        }
        return condition;
    }
    /**
     * Implements the following hosts based on an api.CompilerHost:
     * - ts.CompilerHost to be consumed by a ts.Program
     * - AotCompilerHost for @angular/compiler
     * - TypeCheckHost for mapping ts errors to ng errors (via translateDiagnostics)
     */
    var TsCompilerAotCompilerTypeCheckHostAdapter = /** @class */ (function () {
        function TsCompilerAotCompilerTypeCheckHostAdapter(rootFiles, options, context, metadataProvider, codeGenerator, librarySummaries) {
            if (librarySummaries === void 0) { librarySummaries = new Map(); }
            var _this = this;
            this.rootFiles = rootFiles;
            this.options = options;
            this.context = context;
            this.metadataProvider = metadataProvider;
            this.codeGenerator = codeGenerator;
            this.librarySummaries = librarySummaries;
            this.metadataReaderCache = metadata_reader_1.createMetadataReaderCache();
            this.fileNameToModuleNameCache = new Map();
            this.flatModuleIndexCache = new Map();
            this.flatModuleIndexNames = new Set();
            this.flatModuleIndexRedirectNames = new Set();
            this.originalSourceFiles = new Map();
            this.originalFileExistsCache = new Map();
            this.generatedSourceFiles = new Map();
            this.generatedCodeFor = new Map();
            this.emitter = new compiler_1.TypeScriptEmitter();
            this.getDefaultLibFileName = function (options) {
                return _this.context.getDefaultLibFileName(options);
            };
            this.getCurrentDirectory = function () { return _this.context.getCurrentDirectory(); };
            this.getCanonicalFileName = function (fileName) { return _this.context.getCanonicalFileName(fileName); };
            this.useCaseSensitiveFileNames = function () { return _this.context.useCaseSensitiveFileNames(); };
            this.getNewLine = function () { return _this.context.getNewLine(); };
            // Make sure we do not `host.realpath()` from TS as we do not want to resolve symlinks.
            // https://github.com/Microsoft/TypeScript/issues/9552
            this.realPath = function (p) { return p; };
            this.writeFile = this.context.writeFile.bind(this.context);
            this.moduleResolutionCache = ts.createModuleResolutionCache(this.context.getCurrentDirectory(), this.context.getCanonicalFileName.bind(this.context));
            var basePath = this.options.basePath;
            this.rootDirs =
                (this.options.rootDirs || [this.options.basePath]).map(function (p) { return path.resolve(basePath, p); });
            if (context.getDirectories) {
                this.getDirectories = function (path) { return context.getDirectories(path); };
            }
            if (context.directoryExists) {
                this.directoryExists = function (directoryName) { return context.directoryExists(directoryName); };
            }
            if (context.getCancellationToken) {
                this.getCancellationToken = function () { return context.getCancellationToken(); };
            }
            if (context.getDefaultLibLocation) {
                this.getDefaultLibLocation = function () { return context.getDefaultLibLocation(); };
            }
            if (context.trace) {
                this.trace = function (s) { return context.trace(s); };
            }
            if (context.fileNameToModuleName) {
                this.fileNameToModuleName = context.fileNameToModuleName.bind(context);
            }
            // Note: don't copy over context.moduleNameToFileName as we first
            // normalize undefined containingFile to a filled containingFile.
            if (context.resourceNameToFileName) {
                this.resourceNameToFileName = context.resourceNameToFileName.bind(context);
            }
            if (context.toSummaryFileName) {
                this.toSummaryFileName = context.toSummaryFileName.bind(context);
            }
            if (context.fromSummaryFileName) {
                this.fromSummaryFileName = context.fromSummaryFileName.bind(context);
            }
            this.metadataReaderHost = {
                cacheMetadata: function () { return true; },
                getSourceFileMetadata: function (filePath) {
                    var sf = _this.getOriginalSourceFile(filePath);
                    return sf ? _this.metadataProvider.getMetadata(sf) : undefined;
                },
                fileExists: function (filePath) { return _this.originalFileExists(filePath); },
                readFile: function (filePath) { return assert(_this.context.readFile(filePath)); },
            };
        }
        TsCompilerAotCompilerTypeCheckHostAdapter.prototype.resolveModuleName = function (moduleName, containingFile) {
            var rm = ts.resolveModuleName(moduleName, containingFile.replace(/\\/g, '/'), this.options, this, this.moduleResolutionCache)
                .resolvedModule;
            if (rm && this.isSourceFile(rm.resolvedFileName) && util_1.DTS.test(rm.resolvedFileName)) {
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
            var cacheKey = importedFile + ":" + containingFile;
            var moduleName = this.fileNameToModuleNameCache.get(cacheKey);
            if (moduleName != null) {
                return moduleName;
            }
            var originalImportedFile = importedFile;
            if (this.options.traceResolution) {
                console.error('fileNameToModuleName from containingFile', containingFile, 'to importedFile', importedFile);
            }
            // drop extension
            importedFile = importedFile.replace(EXT, '');
            var importedFilePackageName = getPackageName(importedFile);
            var containingFilePackageName = getPackageName(containingFile);
            if (importedFilePackageName === containingFilePackageName ||
                util_1.GENERATED_FILES.test(originalImportedFile)) {
                var rootedContainingFile = util_1.relativeToRootDirs(containingFile, this.rootDirs);
                var rootedImportedFile = util_1.relativeToRootDirs(importedFile, this.rootDirs);
                if (rootedContainingFile !== containingFile && rootedImportedFile !== importedFile) {
                    // if both files are contained in the `rootDirs`, then strip the rootDirs
                    containingFile = rootedContainingFile;
                    importedFile = rootedImportedFile;
                }
                moduleName = dotRelative(path.dirname(containingFile), importedFile);
            }
            else if (importedFilePackageName) {
                moduleName = stripNodeModulesPrefix(importedFile);
                if (originalImportedFile.endsWith('.d.ts')) {
                    // the moduleName for these typings could be shortented to the npm package name
                    // if the npm package typings matches the importedFile
                    try {
                        var modulePath = importedFile.substring(0, importedFile.length - moduleName.length) +
                            importedFilePackageName;
                        var packageJson = require(modulePath + '/package.json');
                        var packageTypings = path.posix.join(modulePath, packageJson.typings);
                        if (packageTypings === originalImportedFile) {
                            moduleName = importedFilePackageName;
                        }
                    }
                    catch (e) {
                        // the above require() will throw if there is no package.json file
                        // and this is safe to ignore and correct to keep the longer
                        // moduleName in this case
                    }
                }
            }
            else {
                throw new Error("Trying to import a source file from a node_modules package: import " + originalImportedFile + " from " + containingFile);
            }
            this.fileNameToModuleNameCache.set(cacheKey, moduleName);
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
            var result = filePathWithNgResource ? stripNgResourceSuffix(filePathWithNgResource) : null;
            // Used under Bazel to report more specific error with remediation advice
            if (!result && this.context.reportMissingResource) {
                this.context.reportMissingResource(resourceName);
            }
            return result;
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
            var _a = this.emitter.emitStatementsAndContext(genFile.genFileUrl, genFile.stmts, /* preamble */ '', 
            /* emitSourceMaps */ false), sourceText = _a.sourceText, context = _a.context;
            var sf = ts.createSourceFile(genFile.genFileUrl, sourceText, this.options.target || ts.ScriptTarget.Latest);
            if ((this.options.module === ts.ModuleKind.AMD || this.options.module === ts.ModuleKind.UMD) &&
                this.context.amdModuleName) {
                var moduleName = this.context.amdModuleName(sf);
                if (moduleName)
                    sf.moduleName = moduleName;
            }
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
            if (!util_1.isInRootDir(fileName, this.options)) {
                return { generate: false };
            }
            var genMatch = util_1.GENERATED_FILES.exec(fileName);
            if (!genMatch) {
                return { generate: false };
            }
            var _a = tslib_1.__read(genMatch, 4), base = _a[1], genSuffix = _a[2], suffix = _a[3];
            if (suffix !== 'ts' && suffix !== 'tsx') {
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
                // but the file from which we generated it can be a `.ts`/ `.tsx`/ `.d.ts`
                // (see options.generateCodeForLibraries).
                baseFileName = [base + ".ts", base + ".tsx", base + ".d.ts"].find(function (baseFileName) { return _this.isSourceFile(baseFileName) && _this.originalFileExists(baseFileName); });
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
                util_1.isInRootDir(fileName, this.options);
        };
        TsCompilerAotCompilerTypeCheckHostAdapter.prototype.getSourceFile = function (fileName, languageVersion, onError) {
            var _this = this;
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
                        genFileNames = this.codeGenerator.findGeneratedFileNames(fileName).filter(function (fileName) { return _this.shouldGenerateFile(fileName).generate; });
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
            if (this.originalFileExists(filePath)) {
                return assert(this.context.readFile(filePath));
            }
            return null;
        };
        TsCompilerAotCompilerTypeCheckHostAdapter.prototype.isSourceFile = function (filePath) {
            // Don't generate any files nor typecheck them
            // if skipTemplateCodegen is set and fullTemplateTypeCheck is not yet set,
            // for backwards compatibility.
            if (this.options.skipTemplateCodegen && !this.options.fullTemplateTypeCheck) {
                return false;
            }
            // If we have a summary from a previous compilation,
            // treat the file never as a source file.
            if (this.librarySummaries.has(filePath)) {
                return false;
            }
            if (util_1.GENERATED_FILES.test(filePath)) {
                return false;
            }
            if (this.options.generateCodeForLibraries === false && util_1.DTS.test(filePath)) {
                return false;
            }
            if (util_1.DTS.test(filePath)) {
                // Check for a bundle index.
                if (this.hasBundleIndex(filePath)) {
                    var normalFilePath = path.normalize(filePath);
                    return this.flatModuleIndexNames.has(normalFilePath) ||
                        this.flatModuleIndexRedirectNames.has(normalFilePath);
                }
            }
            return true;
        };
        TsCompilerAotCompilerTypeCheckHostAdapter.prototype.readFile = function (fileName) {
            var summary = this.librarySummaries.get(fileName);
            if (summary) {
                return summary.text;
            }
            return this.context.readFile(fileName);
        };
        TsCompilerAotCompilerTypeCheckHostAdapter.prototype.getMetadataFor = function (filePath) {
            return metadata_reader_1.readMetadata(filePath, this.metadataReaderHost, this.metadataReaderCache);
        };
        TsCompilerAotCompilerTypeCheckHostAdapter.prototype.loadResource = function (filePath) {
            if (this.context.readResource)
                return this.context.readResource(filePath);
            if (!this.originalFileExists(filePath)) {
                throw compiler_1.syntaxError("Error: Resource file not found: " + filePath);
            }
            return assert(this.context.readFile(filePath));
        };
        TsCompilerAotCompilerTypeCheckHostAdapter.prototype.getOutputName = function (filePath) {
            return path.relative(this.getCurrentDirectory(), filePath);
        };
        TsCompilerAotCompilerTypeCheckHostAdapter.prototype.hasBundleIndex = function (filePath) {
            var _this = this;
            var checkBundleIndex = function (directory) {
                var result = _this.flatModuleIndexCache.get(directory);
                if (result == null) {
                    if (path.basename(directory) == 'node_module') {
                        // Don't look outside the node_modules this package is installed in.
                        result = false;
                    }
                    else {
                        // A bundle index exists if the typings .d.ts file has a metadata.json that has an
                        // importAs.
                        try {
                            var packageFile = path.join(directory, 'package.json');
                            if (_this.originalFileExists(packageFile)) {
                                // Once we see a package.json file, assume false until it we find the bundle index.
                                result = false;
                                var packageContent = JSON.parse(assert(_this.context.readFile(packageFile)));
                                if (packageContent.typings) {
                                    var typings = path.normalize(path.join(directory, packageContent.typings));
                                    if (util_1.DTS.test(typings)) {
                                        var metadataFile = typings.replace(util_1.DTS, '.metadata.json');
                                        if (_this.originalFileExists(metadataFile)) {
                                            var metadata = JSON.parse(assert(_this.context.readFile(metadataFile)));
                                            if (metadata.flatModuleIndexRedirect) {
                                                _this.flatModuleIndexRedirectNames.add(typings);
                                                // Note: don't set result = true,
                                                // as this would mark this folder
                                                // as having a bundleIndex too early without
                                                // filling the bundleIndexNames.
                                            }
                                            else if (metadata.importAs) {
                                                _this.flatModuleIndexNames.add(typings);
                                                result = true;
                                            }
                                        }
                                    }
                                }
                            }
                            else {
                                var parent = path.dirname(directory);
                                if (parent != directory) {
                                    // Try the parent directory.
                                    result = checkBundleIndex(parent);
                                }
                                else {
                                    result = false;
                                }
                            }
                        }
                        catch (e) {
                            // If we encounter any errors assume we this isn't a bundle index.
                            result = false;
                        }
                    }
                    _this.flatModuleIndexCache.set(directory, result);
                }
                return result;
            };
            return checkBundleIndex(path.dirname(filePath));
        };
        return TsCompilerAotCompilerTypeCheckHostAdapter;
    }());
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
        var newReferencedFiles = tslib_1.__spread(originalReferencedFiles);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXVMO0lBQ3ZMLDJCQUE2QjtJQUM3QiwrQkFBaUM7SUFJakMsK0VBQXlEO0lBR3pELDBGQUE4RjtJQUM5RixvRUFBNkU7SUFFN0UsSUFBTSx5QkFBeUIsR0FBRyw2Q0FBNkMsQ0FBQztJQUNoRixJQUFNLEdBQUcsR0FBRyxrQ0FBa0MsQ0FBQztJQUUvQyw0QkFDSSxFQUN3RDtZQUR2RCxvQkFBTyxFQUFFLGNBQTZDLEVBQTdDLGtFQUE2QztRQUV6RCxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUU7WUFDckIsT0FBTyxJQUFJLGlDQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3RDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQVBELGdEQU9DO0lBaUJELGdCQUFtQixTQUErQjtRQUNoRCxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ2QscUNBQXFDO1NBQ3RDO1FBQ0QsT0FBTyxTQUFXLENBQUM7SUFDckIsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0g7UUFzQkUsbURBQ1ksU0FBZ0MsRUFBVSxPQUF3QixFQUNsRSxPQUFxQixFQUFVLGdCQUFrQyxFQUNqRSxhQUE0QixFQUM1QixnQkFBb0Q7WUFBcEQsaUNBQUEsRUFBQSx1QkFBdUIsR0FBRyxFQUEwQjtZQUpoRSxpQkFnREM7WUEvQ1csY0FBUyxHQUFULFNBQVMsQ0FBdUI7WUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFpQjtZQUNsRSxZQUFPLEdBQVAsT0FBTyxDQUFjO1lBQVUscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtZQUNqRSxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtZQUM1Qixx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QVEsa0JBQWUsQ0FBQztJQUNwQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FvdENvbXBpbGVySG9zdCwgRW1pdHRlclZpc2l0b3JDb250ZXh0LCBFeHRlcm5hbFJlZmVyZW5jZSwgR2VuZXJhdGVkRmlsZSwgUGFyc2VTb3VyY2VTcGFuLCBUeXBlU2NyaXB0RW1pdHRlciwgY29sbGVjdEV4dGVybmFsUmVmZXJlbmNlcywgc3ludGF4RXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtUeXBlQ2hlY2tIb3N0fSBmcm9tICcuLi9kaWFnbm9zdGljcy90cmFuc2xhdGVfZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtNRVRBREFUQV9WRVJTSU9OLCBNb2R1bGVNZXRhZGF0YX0gZnJvbSAnLi4vbWV0YWRhdGEvaW5kZXgnO1xuaW1wb3J0IHtOZ3RzY0NvbXBpbGVySG9zdH0gZnJvbSAnLi4vbmd0c2MvY29tcGlsZXJfaG9zdCc7XG5cbmltcG9ydCB7Q29tcGlsZXJIb3N0LCBDb21waWxlck9wdGlvbnMsIExpYnJhcnlTdW1tYXJ5fSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge01ldGFkYXRhUmVhZGVySG9zdCwgY3JlYXRlTWV0YWRhdGFSZWFkZXJDYWNoZSwgcmVhZE1ldGFkYXRhfSBmcm9tICcuL21ldGFkYXRhX3JlYWRlcic7XG5pbXBvcnQge0RUUywgR0VORVJBVEVEX0ZJTEVTLCBpc0luUm9vdERpciwgcmVsYXRpdmVUb1Jvb3REaXJzfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBOT0RFX01PRFVMRVNfUEFDS0FHRV9OQU1FID0gL25vZGVfbW9kdWxlc1xcLygoXFx3fC0pK3woQChcXHd8LSkrXFwvKFxcd3wtKSspKS87XG5jb25zdCBFWFQgPSAvKFxcLnRzfFxcLmRcXC50c3xcXC5qc3xcXC5qc3h8XFwudHN4KSQvO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29tcGlsZXJIb3N0KFxuICAgIHtvcHRpb25zLCB0c0hvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3Qob3B0aW9ucywgdHJ1ZSl9OlxuICAgICAgICB7b3B0aW9uczogQ29tcGlsZXJPcHRpb25zLCB0c0hvc3Q/OiB0cy5Db21waWxlckhvc3R9KTogQ29tcGlsZXJIb3N0IHtcbiAgaWYgKG9wdGlvbnMuZW5hYmxlSXZ5KSB7XG4gICAgcmV0dXJuIG5ldyBOZ3RzY0NvbXBpbGVySG9zdCh0c0hvc3QpO1xuICB9XG4gIHJldHVybiB0c0hvc3Q7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWV0YWRhdGFQcm92aWRlciB7XG4gIGdldE1ldGFkYXRhKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBNb2R1bGVNZXRhZGF0YXx1bmRlZmluZWQ7XG59XG5cbmludGVyZmFjZSBHZW5Tb3VyY2VGaWxlIHtcbiAgZXh0ZXJuYWxSZWZlcmVuY2VzOiBTZXQ8c3RyaW5nPjtcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZTtcbiAgZW1pdEN0eDogRW1pdHRlclZpc2l0b3JDb250ZXh0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvZGVHZW5lcmF0b3Ige1xuICBnZW5lcmF0ZUZpbGUoZ2VuRmlsZU5hbWU6IHN0cmluZywgYmFzZUZpbGVOYW1lPzogc3RyaW5nKTogR2VuZXJhdGVkRmlsZTtcbiAgZmluZEdlbmVyYXRlZEZpbGVOYW1lcyhmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nW107XG59XG5cbmZ1bmN0aW9uIGFzc2VydDxUPihjb25kaXRpb246IFQgfCBudWxsIHwgdW5kZWZpbmVkKSB7XG4gIGlmICghY29uZGl0aW9uKSB7XG4gICAgLy8gVE9ETyhjaHVja2pheik6IGRvIHRoZSByaWdodCB0aGluZ1xuICB9XG4gIHJldHVybiBjb25kaXRpb24gITtcbn1cblxuLyoqXG4gKiBJbXBsZW1lbnRzIHRoZSBmb2xsb3dpbmcgaG9zdHMgYmFzZWQgb24gYW4gYXBpLkNvbXBpbGVySG9zdDpcbiAqIC0gdHMuQ29tcGlsZXJIb3N0IHRvIGJlIGNvbnN1bWVkIGJ5IGEgdHMuUHJvZ3JhbVxuICogLSBBb3RDb21waWxlckhvc3QgZm9yIEBhbmd1bGFyL2NvbXBpbGVyXG4gKiAtIFR5cGVDaGVja0hvc3QgZm9yIG1hcHBpbmcgdHMgZXJyb3JzIHRvIG5nIGVycm9ycyAodmlhIHRyYW5zbGF0ZURpYWdub3N0aWNzKVxuICovXG5leHBvcnQgY2xhc3MgVHNDb21waWxlckFvdENvbXBpbGVyVHlwZUNoZWNrSG9zdEFkYXB0ZXIgaW1wbGVtZW50cyB0cy5Db21waWxlckhvc3QsIEFvdENvbXBpbGVySG9zdCxcbiAgICBUeXBlQ2hlY2tIb3N0IHtcbiAgcHJpdmF0ZSBtZXRhZGF0YVJlYWRlckNhY2hlID0gY3JlYXRlTWV0YWRhdGFSZWFkZXJDYWNoZSgpO1xuICBwcml2YXRlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIGZsYXRNb2R1bGVJbmRleENhY2hlID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KCk7XG4gIHByaXZhdGUgZmxhdE1vZHVsZUluZGV4TmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgcHJpdmF0ZSBmbGF0TW9kdWxlSW5kZXhSZWRpcmVjdE5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHByaXZhdGUgcm9vdERpcnM6IHN0cmluZ1tdO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdXRpb25DYWNoZTogdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlO1xuICBwcml2YXRlIG9yaWdpbmFsU291cmNlRmlsZXMgPSBuZXcgTWFwPHN0cmluZywgdHMuU291cmNlRmlsZXxudWxsPigpO1xuICBwcml2YXRlIG9yaWdpbmFsRmlsZUV4aXN0c0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KCk7XG4gIHByaXZhdGUgZ2VuZXJhdGVkU291cmNlRmlsZXMgPSBuZXcgTWFwPHN0cmluZywgR2VuU291cmNlRmlsZT4oKTtcbiAgcHJpdmF0ZSBnZW5lcmF0ZWRDb2RlRm9yID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xuICBwcml2YXRlIGVtaXR0ZXIgPSBuZXcgVHlwZVNjcmlwdEVtaXR0ZXIoKTtcbiAgcHJpdmF0ZSBtZXRhZGF0YVJlYWRlckhvc3Q6IE1ldGFkYXRhUmVhZGVySG9zdDtcblxuICBnZXRDYW5jZWxsYXRpb25Ub2tlbjogKCkgPT4gdHMuQ2FuY2VsbGF0aW9uVG9rZW47XG4gIGdldERlZmF1bHRMaWJMb2NhdGlvbjogKCkgPT4gc3RyaW5nO1xuICB0cmFjZTogKHM6IHN0cmluZykgPT4gdm9pZDtcbiAgZ2V0RGlyZWN0b3JpZXM6IChwYXRoOiBzdHJpbmcpID0+IHN0cmluZ1tdO1xuICBkaXJlY3RvcnlFeGlzdHM/OiAoZGlyZWN0b3J5TmFtZTogc3RyaW5nKSA9PiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb290RmlsZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiwgcHJpdmF0ZSBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsXG4gICAgICBwcml2YXRlIGNvbnRleHQ6IENvbXBpbGVySG9zdCwgcHJpdmF0ZSBtZXRhZGF0YVByb3ZpZGVyOiBNZXRhZGF0YVByb3ZpZGVyLFxuICAgICAgcHJpdmF0ZSBjb2RlR2VuZXJhdG9yOiBDb2RlR2VuZXJhdG9yLFxuICAgICAgcHJpdmF0ZSBsaWJyYXJ5U3VtbWFyaWVzID0gbmV3IE1hcDxzdHJpbmcsIExpYnJhcnlTdW1tYXJ5PigpKSB7XG4gICAgdGhpcy5tb2R1bGVSZXNvbHV0aW9uQ2FjaGUgPSB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUoXG4gICAgICAgIHRoaXMuY29udGV4dC5nZXRDdXJyZW50RGlyZWN0b3J5ICEoKSwgdGhpcy5jb250ZXh0LmdldENhbm9uaWNhbEZpbGVOYW1lLmJpbmQodGhpcy5jb250ZXh0KSk7XG4gICAgY29uc3QgYmFzZVBhdGggPSB0aGlzLm9wdGlvbnMuYmFzZVBhdGggITtcbiAgICB0aGlzLnJvb3REaXJzID1cbiAgICAgICAgKHRoaXMub3B0aW9ucy5yb290RGlycyB8fCBbdGhpcy5vcHRpb25zLmJhc2VQYXRoICFdKS5tYXAocCA9PiBwYXRoLnJlc29sdmUoYmFzZVBhdGgsIHApKTtcbiAgICBpZiAoY29udGV4dC5nZXREaXJlY3Rvcmllcykge1xuICAgICAgdGhpcy5nZXREaXJlY3RvcmllcyA9IHBhdGggPT4gY29udGV4dC5nZXREaXJlY3RvcmllcyAhKHBhdGgpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5kaXJlY3RvcnlFeGlzdHMpIHtcbiAgICAgIHRoaXMuZGlyZWN0b3J5RXhpc3RzID0gZGlyZWN0b3J5TmFtZSA9PiBjb250ZXh0LmRpcmVjdG9yeUV4aXN0cyAhKGRpcmVjdG9yeU5hbWUpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5nZXRDYW5jZWxsYXRpb25Ub2tlbikge1xuICAgICAgdGhpcy5nZXRDYW5jZWxsYXRpb25Ub2tlbiA9ICgpID0+IGNvbnRleHQuZ2V0Q2FuY2VsbGF0aW9uVG9rZW4gISgpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5nZXREZWZhdWx0TGliTG9jYXRpb24pIHtcbiAgICAgIHRoaXMuZ2V0RGVmYXVsdExpYkxvY2F0aW9uID0gKCkgPT4gY29udGV4dC5nZXREZWZhdWx0TGliTG9jYXRpb24gISgpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC50cmFjZSkge1xuICAgICAgdGhpcy50cmFjZSA9IHMgPT4gY29udGV4dC50cmFjZSAhKHMpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5maWxlTmFtZVRvTW9kdWxlTmFtZSkge1xuICAgICAgdGhpcy5maWxlTmFtZVRvTW9kdWxlTmFtZSA9IGNvbnRleHQuZmlsZU5hbWVUb01vZHVsZU5hbWUuYmluZChjb250ZXh0KTtcbiAgICB9XG4gICAgLy8gTm90ZTogZG9uJ3QgY29weSBvdmVyIGNvbnRleHQubW9kdWxlTmFtZVRvRmlsZU5hbWUgYXMgd2UgZmlyc3RcbiAgICAvLyBub3JtYWxpemUgdW5kZWZpbmVkIGNvbnRhaW5pbmdGaWxlIHRvIGEgZmlsbGVkIGNvbnRhaW5pbmdGaWxlLlxuICAgIGlmIChjb250ZXh0LnJlc291cmNlTmFtZVRvRmlsZU5hbWUpIHtcbiAgICAgIHRoaXMucmVzb3VyY2VOYW1lVG9GaWxlTmFtZSA9IGNvbnRleHQucmVzb3VyY2VOYW1lVG9GaWxlTmFtZS5iaW5kKGNvbnRleHQpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC50b1N1bW1hcnlGaWxlTmFtZSkge1xuICAgICAgdGhpcy50b1N1bW1hcnlGaWxlTmFtZSA9IGNvbnRleHQudG9TdW1tYXJ5RmlsZU5hbWUuYmluZChjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQuZnJvbVN1bW1hcnlGaWxlTmFtZSkge1xuICAgICAgdGhpcy5mcm9tU3VtbWFyeUZpbGVOYW1lID0gY29udGV4dC5mcm9tU3VtbWFyeUZpbGVOYW1lLmJpbmQoY29udGV4dCk7XG4gICAgfVxuICAgIHRoaXMubWV0YWRhdGFSZWFkZXJIb3N0ID0ge1xuICAgICAgY2FjaGVNZXRhZGF0YTogKCkgPT4gdHJ1ZSxcbiAgICAgIGdldFNvdXJjZUZpbGVNZXRhZGF0YTogKGZpbGVQYXRoKSA9PiB7XG4gICAgICAgIGNvbnN0IHNmID0gdGhpcy5nZXRPcmlnaW5hbFNvdXJjZUZpbGUoZmlsZVBhdGgpO1xuICAgICAgICByZXR1cm4gc2YgPyB0aGlzLm1ldGFkYXRhUHJvdmlkZXIuZ2V0TWV0YWRhdGEoc2YpIDogdW5kZWZpbmVkO1xuICAgICAgfSxcbiAgICAgIGZpbGVFeGlzdHM6IChmaWxlUGF0aCkgPT4gdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMoZmlsZVBhdGgpLFxuICAgICAgcmVhZEZpbGU6IChmaWxlUGF0aCkgPT4gYXNzZXJ0KHRoaXMuY29udGV4dC5yZWFkRmlsZShmaWxlUGF0aCkpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVNb2R1bGVOYW1lKG1vZHVsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHRzLlJlc29sdmVkTW9kdWxlXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBybSA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKFxuICAgICAgICAgICAgICAgICAgICAgbW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLCB0aGlzLm9wdGlvbnMsIHRoaXMsXG4gICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZHVsZVJlc29sdXRpb25DYWNoZSlcbiAgICAgICAgICAgICAgICAgICAucmVzb2x2ZWRNb2R1bGU7XG4gICAgaWYgKHJtICYmIHRoaXMuaXNTb3VyY2VGaWxlKHJtLnJlc29sdmVkRmlsZU5hbWUpICYmIERUUy50ZXN0KHJtLnJlc29sdmVkRmlsZU5hbWUpKSB7XG4gICAgICAvLyBDYXNlOiBnZW5lcmF0ZUNvZGVGb3JMaWJyYXJpZXMgPSB0cnVlIGFuZCBtb2R1bGVOYW1lIGlzXG4gICAgICAvLyBhIC5kLnRzIGZpbGUgaW4gYSBub2RlX21vZHVsZXMgZm9sZGVyLlxuICAgICAgLy8gTmVlZCB0byBzZXQgaXNFeHRlcm5hbExpYnJhcnlJbXBvcnQgdG8gZmFsc2Ugc28gdGhhdCBnZW5lcmF0ZWQgZmlsZXMgZm9yIHRoYXQgZmlsZVxuICAgICAgLy8gYXJlIGVtaXR0ZWQuXG4gICAgICBybS5pc0V4dGVybmFsTGlicmFyeUltcG9ydCA9IGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gcm07XG4gIH1cblxuICAvLyBOb3RlOiBXZSBpbXBsZW1lbnQgdGhpcyBtZXRob2Qgc28gdGhhdCBUeXBlU2NyaXB0IGFuZCBBbmd1bGFyIHNoYXJlIHRoZSBzYW1lXG4gIC8vIHRzLk1vZHVsZVJlc29sdXRpb25DYWNoZVxuICAvLyBhbmQgdGhhdCB3ZSBjYW4gdGVsbCB0cy5Qcm9ncmFtIGFib3V0IG91ciBkaWZmZXJlbnQgb3BpbmlvbiBhYm91dFxuICAvLyBSZXNvbHZlZE1vZHVsZS5pc0V4dGVybmFsTGlicmFyeUltcG9ydFxuICAvLyAoc2VlIG91ciBpc1NvdXJjZUZpbGUgbWV0aG9kKS5cbiAgcmVzb2x2ZU1vZHVsZU5hbWVzKG1vZHVsZU5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHRzLlJlc29sdmVkTW9kdWxlW10ge1xuICAgIC8vIFRPRE8odGJvc2NoKTogdGhpcyBzZWVtcyB0byBiZSBhIHR5cGluZyBlcnJvciBpbiBUeXBlU2NyaXB0LFxuICAgIC8vIGFzIGl0IGNvbnRhaW5zIGFzc2VydGlvbnMgdGhhdCB0aGUgcmVzdWx0IGNvbnRhaW5zIHRoZSBzYW1lIG51bWJlciBvZiBlbnRyaWVzXG4gICAgLy8gYXMgdGhlIGdpdmVuIG1vZHVsZSBuYW1lcy5cbiAgICByZXR1cm4gPHRzLlJlc29sdmVkTW9kdWxlW10+bW9kdWxlTmFtZXMubWFwKFxuICAgICAgICBtb2R1bGVOYW1lID0+IHRoaXMucmVzb2x2ZU1vZHVsZU5hbWUobW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUpKTtcbiAgfVxuXG4gIG1vZHVsZU5hbWVUb0ZpbGVOYW1lKG06IHN0cmluZywgY29udGFpbmluZ0ZpbGU/OiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKCFjb250YWluaW5nRmlsZSkge1xuICAgICAgaWYgKG0uaW5kZXhPZignLicpID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVzb2x1dGlvbiBvZiByZWxhdGl2ZSBwYXRocyByZXF1aXJlcyBhIGNvbnRhaW5pbmcgZmlsZS4nKTtcbiAgICAgIH1cbiAgICAgIC8vIEFueSBjb250YWluaW5nIGZpbGUgZ2l2ZXMgdGhlIHNhbWUgcmVzdWx0IGZvciBhYnNvbHV0ZSBpbXBvcnRzXG4gICAgICBjb250YWluaW5nRmlsZSA9IHRoaXMucm9vdEZpbGVzWzBdO1xuICAgIH1cbiAgICBpZiAodGhpcy5jb250ZXh0Lm1vZHVsZU5hbWVUb0ZpbGVOYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb250ZXh0Lm1vZHVsZU5hbWVUb0ZpbGVOYW1lKG0sIGNvbnRhaW5pbmdGaWxlKTtcbiAgICB9XG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKG0sIGNvbnRhaW5pbmdGaWxlKTtcbiAgICByZXR1cm4gcmVzb2x2ZWQgPyByZXNvbHZlZC5yZXNvbHZlZEZpbGVOYW1lIDogbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBXZSB3YW50IGEgbW9kdWxlSWQgdGhhdCB3aWxsIGFwcGVhciBpbiBpbXBvcnQgc3RhdGVtZW50cyBpbiB0aGUgZ2VuZXJhdGVkIGNvZGVcbiAgICogd2hpY2ggd2lsbCBiZSB3cml0dGVuIHRvIGBjb250YWluaW5nRmlsZWAuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB3ZSBhbHNvIGdlbmVyYXRlIGZpbGVzIGZvciBmaWxlcyBpbiBub2RlX21vZHVsZXMsIGFzIGxpYnJhcmllc1xuICAgKiBvbmx5IHNoaXAgLm1ldGFkYXRhLmpzb24gZmlsZXMgYnV0IG5vdCB0aGUgZ2VuZXJhdGVkIGNvZGUuXG4gICAqXG4gICAqIExvZ2ljOlxuICAgKiAxLiBpZiB0aGUgaW1wb3J0ZWRGaWxlIGFuZCB0aGUgY29udGFpbmluZ0ZpbGUgYXJlIGZyb20gdGhlIHByb2plY3Qgc291cmNlc1xuICAgKiAgICBvciBmcm9tIHRoZSBzYW1lIG5vZGVfbW9kdWxlcyBwYWNrYWdlLCB1c2UgYSByZWxhdGl2ZSBwYXRoXG4gICAqIDIuIGlmIHRoZSBpbXBvcnRlZEZpbGUgaXMgaW4gYSBub2RlX21vZHVsZXMgcGFja2FnZSxcbiAgICogICAgdXNlIGEgcGF0aCB0aGF0IHN0YXJ0cyB3aXRoIHRoZSBwYWNrYWdlIG5hbWUuXG4gICAqIDMuIEVycm9yIGlmIHRoZSBjb250YWluaW5nRmlsZSBpcyBpbiB0aGUgbm9kZV9tb2R1bGVzIHBhY2thZ2VcbiAgICogICAgYW5kIHRoZSBpbXBvcnRlZEZpbGUgaXMgaW4gdGhlIHByb2plY3Qgc291cmVzLFxuICAgKiAgICBhcyB0aGF0IGlzIGEgdmlvbGF0aW9uIG9mIHRoZSBwcmluY2lwbGUgdGhhdCBub2RlX21vZHVsZXMgcGFja2FnZXMgY2Fubm90XG4gICAqICAgIGltcG9ydCBwcm9qZWN0IHNvdXJjZXMuXG4gICAqL1xuICBmaWxlTmFtZVRvTW9kdWxlTmFtZShpbXBvcnRlZEZpbGU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgY2FjaGVLZXkgPSBgJHtpbXBvcnRlZEZpbGV9OiR7Y29udGFpbmluZ0ZpbGV9YDtcbiAgICBsZXQgbW9kdWxlTmFtZSA9IHRoaXMuZmlsZU5hbWVUb01vZHVsZU5hbWVDYWNoZS5nZXQoY2FjaGVLZXkpO1xuICAgIGlmIChtb2R1bGVOYW1lICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBtb2R1bGVOYW1lO1xuICAgIH1cblxuICAgIGNvbnN0IG9yaWdpbmFsSW1wb3J0ZWRGaWxlID0gaW1wb3J0ZWRGaWxlO1xuICAgIGlmICh0aGlzLm9wdGlvbnMudHJhY2VSZXNvbHV0aW9uKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICdmaWxlTmFtZVRvTW9kdWxlTmFtZSBmcm9tIGNvbnRhaW5pbmdGaWxlJywgY29udGFpbmluZ0ZpbGUsICd0byBpbXBvcnRlZEZpbGUnLFxuICAgICAgICAgIGltcG9ydGVkRmlsZSk7XG4gICAgfVxuXG4gICAgLy8gZHJvcCBleHRlbnNpb25cbiAgICBpbXBvcnRlZEZpbGUgPSBpbXBvcnRlZEZpbGUucmVwbGFjZShFWFQsICcnKTtcbiAgICBjb25zdCBpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZSA9IGdldFBhY2thZ2VOYW1lKGltcG9ydGVkRmlsZSk7XG4gICAgY29uc3QgY29udGFpbmluZ0ZpbGVQYWNrYWdlTmFtZSA9IGdldFBhY2thZ2VOYW1lKGNvbnRhaW5pbmdGaWxlKTtcblxuICAgIGlmIChpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZSA9PT0gY29udGFpbmluZ0ZpbGVQYWNrYWdlTmFtZSB8fFxuICAgICAgICBHRU5FUkFURURfRklMRVMudGVzdChvcmlnaW5hbEltcG9ydGVkRmlsZSkpIHtcbiAgICAgIGNvbnN0IHJvb3RlZENvbnRhaW5pbmdGaWxlID0gcmVsYXRpdmVUb1Jvb3REaXJzKGNvbnRhaW5pbmdGaWxlLCB0aGlzLnJvb3REaXJzKTtcbiAgICAgIGNvbnN0IHJvb3RlZEltcG9ydGVkRmlsZSA9IHJlbGF0aXZlVG9Sb290RGlycyhpbXBvcnRlZEZpbGUsIHRoaXMucm9vdERpcnMpO1xuXG4gICAgICBpZiAocm9vdGVkQ29udGFpbmluZ0ZpbGUgIT09IGNvbnRhaW5pbmdGaWxlICYmIHJvb3RlZEltcG9ydGVkRmlsZSAhPT0gaW1wb3J0ZWRGaWxlKSB7XG4gICAgICAgIC8vIGlmIGJvdGggZmlsZXMgYXJlIGNvbnRhaW5lZCBpbiB0aGUgYHJvb3REaXJzYCwgdGhlbiBzdHJpcCB0aGUgcm9vdERpcnNcbiAgICAgICAgY29udGFpbmluZ0ZpbGUgPSByb290ZWRDb250YWluaW5nRmlsZTtcbiAgICAgICAgaW1wb3J0ZWRGaWxlID0gcm9vdGVkSW1wb3J0ZWRGaWxlO1xuICAgICAgfVxuICAgICAgbW9kdWxlTmFtZSA9IGRvdFJlbGF0aXZlKHBhdGguZGlybmFtZShjb250YWluaW5nRmlsZSksIGltcG9ydGVkRmlsZSk7XG4gICAgfSBlbHNlIGlmIChpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZSkge1xuICAgICAgbW9kdWxlTmFtZSA9IHN0cmlwTm9kZU1vZHVsZXNQcmVmaXgoaW1wb3J0ZWRGaWxlKTtcbiAgICAgIGlmIChvcmlnaW5hbEltcG9ydGVkRmlsZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAvLyB0aGUgbW9kdWxlTmFtZSBmb3IgdGhlc2UgdHlwaW5ncyBjb3VsZCBiZSBzaG9ydGVudGVkIHRvIHRoZSBucG0gcGFja2FnZSBuYW1lXG4gICAgICAgIC8vIGlmIHRoZSBucG0gcGFja2FnZSB0eXBpbmdzIG1hdGNoZXMgdGhlIGltcG9ydGVkRmlsZVxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG1vZHVsZVBhdGggPSBpbXBvcnRlZEZpbGUuc3Vic3RyaW5nKDAsIGltcG9ydGVkRmlsZS5sZW5ndGggLSBtb2R1bGVOYW1lLmxlbmd0aCkgK1xuICAgICAgICAgICAgICBpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZTtcbiAgICAgICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IHJlcXVpcmUobW9kdWxlUGF0aCArICcvcGFja2FnZS5qc29uJyk7XG4gICAgICAgICAgY29uc3QgcGFja2FnZVR5cGluZ3MgPSBwYXRoLnBvc2l4LmpvaW4obW9kdWxlUGF0aCwgcGFja2FnZUpzb24udHlwaW5ncyk7XG4gICAgICAgICAgaWYgKHBhY2thZ2VUeXBpbmdzID09PSBvcmlnaW5hbEltcG9ydGVkRmlsZSkge1xuICAgICAgICAgICAgbW9kdWxlTmFtZSA9IGltcG9ydGVkRmlsZVBhY2thZ2VOYW1lO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIHRoZSBhYm92ZSByZXF1aXJlKCkgd2lsbCB0aHJvdyBpZiB0aGVyZSBpcyBubyBwYWNrYWdlLmpzb24gZmlsZVxuICAgICAgICAgIC8vIGFuZCB0aGlzIGlzIHNhZmUgdG8gaWdub3JlIGFuZCBjb3JyZWN0IHRvIGtlZXAgdGhlIGxvbmdlclxuICAgICAgICAgIC8vIG1vZHVsZU5hbWUgaW4gdGhpcyBjYXNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBUcnlpbmcgdG8gaW1wb3J0IGEgc291cmNlIGZpbGUgZnJvbSBhIG5vZGVfbW9kdWxlcyBwYWNrYWdlOiBpbXBvcnQgJHtvcmlnaW5hbEltcG9ydGVkRmlsZX0gZnJvbSAke2NvbnRhaW5pbmdGaWxlfWApO1xuICAgIH1cblxuICAgIHRoaXMuZmlsZU5hbWVUb01vZHVsZU5hbWVDYWNoZS5zZXQoY2FjaGVLZXksIG1vZHVsZU5hbWUpO1xuICAgIHJldHVybiBtb2R1bGVOYW1lO1xuICB9XG5cbiAgcmVzb3VyY2VOYW1lVG9GaWxlTmFtZShyZXNvdXJjZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgICAvLyBOb3RlOiB3ZSBjb252ZXJ0IHBhY2thZ2UgcGF0aHMgaW50byByZWxhdGl2ZSBwYXRocyB0byBiZSBjb21wYXRpYmxlIHdpdGggdGhlIHRoZVxuICAgIC8vIHByZXZpb3VzIGltcGxlbWVudGF0aW9uIG9mIFVybFJlc29sdmVyLlxuICAgIGNvbnN0IGZpcnN0Q2hhciA9IHJlc291cmNlTmFtZVswXTtcbiAgICBpZiAoZmlyc3RDaGFyID09PSAnLycpIHtcbiAgICAgIHJlc291cmNlTmFtZSA9IHJlc291cmNlTmFtZS5zbGljZSgxKTtcbiAgICB9IGVsc2UgaWYgKGZpcnN0Q2hhciAhPT0gJy4nKSB7XG4gICAgICByZXNvdXJjZU5hbWUgPSBgLi8ke3Jlc291cmNlTmFtZX1gO1xuICAgIH1cbiAgICBjb25zdCBmaWxlUGF0aFdpdGhOZ1Jlc291cmNlID1cbiAgICAgICAgdGhpcy5tb2R1bGVOYW1lVG9GaWxlTmFtZShhZGROZ1Jlc291cmNlU3VmZml4KHJlc291cmNlTmFtZSksIGNvbnRhaW5pbmdGaWxlKTtcbiAgICBjb25zdCByZXN1bHQgPSBmaWxlUGF0aFdpdGhOZ1Jlc291cmNlID8gc3RyaXBOZ1Jlc291cmNlU3VmZml4KGZpbGVQYXRoV2l0aE5nUmVzb3VyY2UpIDogbnVsbDtcbiAgICAvLyBVc2VkIHVuZGVyIEJhemVsIHRvIHJlcG9ydCBtb3JlIHNwZWNpZmljIGVycm9yIHdpdGggcmVtZWRpYXRpb24gYWR2aWNlXG4gICAgaWYgKCFyZXN1bHQgJiYgKHRoaXMuY29udGV4dCBhcyBhbnkpLnJlcG9ydE1pc3NpbmdSZXNvdXJjZSkge1xuICAgICAgKHRoaXMuY29udGV4dCBhcyBhbnkpLnJlcG9ydE1pc3NpbmdSZXNvdXJjZShyZXNvdXJjZU5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgdG9TdW1tYXJ5RmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZywgcmVmZXJyaW5nU3JjRmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZmlsZU5hbWVUb01vZHVsZU5hbWUoZmlsZU5hbWUsIHJlZmVycmluZ1NyY0ZpbGVOYW1lKTtcbiAgfVxuXG4gIGZyb21TdW1tYXJ5RmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZywgcmVmZXJyaW5nTGliRmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLm1vZHVsZU5hbWVUb0ZpbGVOYW1lKGZpbGVOYW1lLCByZWZlcnJpbmdMaWJGaWxlTmFtZSk7XG4gICAgaWYgKCFyZXNvbHZlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcmVzb2x2ZSAke2ZpbGVOYW1lfSBmcm9tICR7cmVmZXJyaW5nTGliRmlsZU5hbWV9YCk7XG4gICAgfVxuICAgIHJldHVybiByZXNvbHZlZDtcbiAgfVxuXG4gIHBhcnNlU291cmNlU3Bhbk9mKGZpbGVOYW1lOiBzdHJpbmcsIGxpbmU6IG51bWJlciwgY2hhcmFjdGVyOiBudW1iZXIpOiBQYXJzZVNvdXJjZVNwYW58bnVsbCB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2VuZXJhdGVkU291cmNlRmlsZXMuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoZGF0YSAmJiBkYXRhLmVtaXRDdHgpIHtcbiAgICAgIHJldHVybiBkYXRhLmVtaXRDdHguc3Bhbk9mKGxpbmUsIGNoYXJhY3Rlcik7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRPcmlnaW5hbFNvdXJjZUZpbGUoXG4gICAgICBmaWxlUGF0aDogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb24/OiB0cy5TY3JpcHRUYXJnZXQsXG4gICAgICBvbkVycm9yPzogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgLy8gTm90ZTogd2UgbmVlZCB0aGUgZXhwbGljaXQgY2hlY2sgdmlhIGBoYXNgIGFzIHdlIGFsc28gY2FjaGUgcmVzdWx0c1xuICAgIC8vIHRoYXQgd2VyZSBudWxsIC8gdW5kZWZpbmVkLlxuICAgIGlmICh0aGlzLm9yaWdpbmFsU291cmNlRmlsZXMuaGFzKGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIHRoaXMub3JpZ2luYWxTb3VyY2VGaWxlcy5nZXQoZmlsZVBhdGgpICE7XG4gICAgfVxuICAgIGlmICghbGFuZ3VhZ2VWZXJzaW9uKSB7XG4gICAgICBsYW5ndWFnZVZlcnNpb24gPSB0aGlzLm9wdGlvbnMudGFyZ2V0IHx8IHRzLlNjcmlwdFRhcmdldC5MYXRlc3Q7XG4gICAgfVxuICAgIC8vIE5vdGU6IFRoaXMgY2FuIGFsc28gcmV0dXJuIHVuZGVmaW5lZCxcbiAgICAvLyBhcyB0aGUgVFMgdHlwaW5ncyBhcmUgbm90IGNvcnJlY3QhXG4gICAgY29uc3Qgc2YgPSB0aGlzLmNvbnRleHQuZ2V0U291cmNlRmlsZShmaWxlUGF0aCwgbGFuZ3VhZ2VWZXJzaW9uLCBvbkVycm9yKSB8fCBudWxsO1xuICAgIHRoaXMub3JpZ2luYWxTb3VyY2VGaWxlcy5zZXQoZmlsZVBhdGgsIHNmKTtcbiAgICByZXR1cm4gc2Y7XG4gIH1cblxuICB1cGRhdGVHZW5lcmF0ZWRGaWxlKGdlbkZpbGU6IEdlbmVyYXRlZEZpbGUpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICBpZiAoIWdlbkZpbGUuc3RtdHMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgSW52YWxpZCBBcmd1bWVudDogRXhwZWN0ZWQgYSBHZW5lcmF0ZUZpbGUgd2l0aCBzdGF0ZW1lbnRzLiAke2dlbkZpbGUuZ2VuRmlsZVVybH1gKTtcbiAgICB9XG4gICAgY29uc3Qgb2xkR2VuRmlsZSA9IHRoaXMuZ2VuZXJhdGVkU291cmNlRmlsZXMuZ2V0KGdlbkZpbGUuZ2VuRmlsZVVybCk7XG4gICAgaWYgKCFvbGRHZW5GaWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYElsbGVnYWwgU3RhdGU6IHByZXZpb3VzIEdlbmVyYXRlZEZpbGUgbm90IGZvdW5kIGZvciAke2dlbkZpbGUuZ2VuRmlsZVVybH0uYCk7XG4gICAgfVxuICAgIGNvbnN0IG5ld1JlZnMgPSBnZW5GaWxlRXh0ZXJuYWxSZWZlcmVuY2VzKGdlbkZpbGUpO1xuICAgIGNvbnN0IG9sZFJlZnMgPSBvbGRHZW5GaWxlLmV4dGVybmFsUmVmZXJlbmNlcztcbiAgICBsZXQgcmVmc0FyZUVxdWFsID0gb2xkUmVmcy5zaXplID09PSBuZXdSZWZzLnNpemU7XG4gICAgaWYgKHJlZnNBcmVFcXVhbCkge1xuICAgICAgbmV3UmVmcy5mb3JFYWNoKHIgPT4gcmVmc0FyZUVxdWFsID0gcmVmc0FyZUVxdWFsICYmIG9sZFJlZnMuaGFzKHIpKTtcbiAgICB9XG4gICAgaWYgKCFyZWZzQXJlRXF1YWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgSWxsZWdhbCBTdGF0ZTogZXh0ZXJuYWwgcmVmZXJlbmNlcyBjaGFuZ2VkIGluICR7Z2VuRmlsZS5nZW5GaWxlVXJsfS5cXG5PbGQ6ICR7QXJyYXkuZnJvbShvbGRSZWZzKX0uXFxuTmV3OiAke0FycmF5LmZyb20obmV3UmVmcyl9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFkZEdlbmVyYXRlZEZpbGUoZ2VuRmlsZSwgbmV3UmVmcyk7XG4gIH1cblxuICBwcml2YXRlIGFkZEdlbmVyYXRlZEZpbGUoZ2VuRmlsZTogR2VuZXJhdGVkRmlsZSwgZXh0ZXJuYWxSZWZlcmVuY2VzOiBTZXQ8c3RyaW5nPik6IHRzLlNvdXJjZUZpbGUge1xuICAgIGlmICghZ2VuRmlsZS5zdG10cykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbnZhbGlkIEFyZ3VtZW50OiBFeHBlY3RlZCBhIEdlbmVyYXRlRmlsZSB3aXRoIHN0YXRlbWVudHMuICR7Z2VuRmlsZS5nZW5GaWxlVXJsfWApO1xuICAgIH1cbiAgICBjb25zdCB7c291cmNlVGV4dCwgY29udGV4dH0gPSB0aGlzLmVtaXR0ZXIuZW1pdFN0YXRlbWVudHNBbmRDb250ZXh0KFxuICAgICAgICBnZW5GaWxlLmdlbkZpbGVVcmwsIGdlbkZpbGUuc3RtdHMsIC8qIHByZWFtYmxlICovICcnLFxuICAgICAgICAvKiBlbWl0U291cmNlTWFwcyAqLyBmYWxzZSk7XG4gICAgY29uc3Qgc2YgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICBnZW5GaWxlLmdlbkZpbGVVcmwsIHNvdXJjZVRleHQsIHRoaXMub3B0aW9ucy50YXJnZXQgfHwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCk7XG4gICAgaWYgKCh0aGlzLm9wdGlvbnMubW9kdWxlID09PSB0cy5Nb2R1bGVLaW5kLkFNRCB8fCB0aGlzLm9wdGlvbnMubW9kdWxlID09PSB0cy5Nb2R1bGVLaW5kLlVNRCkgJiZcbiAgICAgICAgdGhpcy5jb250ZXh0LmFtZE1vZHVsZU5hbWUpIHtcbiAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSB0aGlzLmNvbnRleHQuYW1kTW9kdWxlTmFtZShzZik7XG4gICAgICBpZiAobW9kdWxlTmFtZSkgc2YubW9kdWxlTmFtZSA9IG1vZHVsZU5hbWU7XG4gICAgfVxuICAgIHRoaXMuZ2VuZXJhdGVkU291cmNlRmlsZXMuc2V0KGdlbkZpbGUuZ2VuRmlsZVVybCwge1xuICAgICAgc291cmNlRmlsZTogc2YsXG4gICAgICBlbWl0Q3R4OiBjb250ZXh0LCBleHRlcm5hbFJlZmVyZW5jZXMsXG4gICAgfSk7XG4gICAgcmV0dXJuIHNmO1xuICB9XG5cbiAgc2hvdWxkR2VuZXJhdGVGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiB7Z2VuZXJhdGU6IGJvb2xlYW4sIGJhc2VGaWxlTmFtZT86IHN0cmluZ30ge1xuICAgIC8vIFRPRE8odGJvc2NoKTogYWxsb3cgZ2VuZXJhdGluZyBmaWxlcyB0aGF0IGFyZSBub3QgaW4gdGhlIHJvb3REaXJcbiAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9pc3N1ZXMvMTkzMzdcbiAgICBpZiAoIWlzSW5Sb290RGlyKGZpbGVOYW1lLCB0aGlzLm9wdGlvbnMpKSB7XG4gICAgICByZXR1cm4ge2dlbmVyYXRlOiBmYWxzZX07XG4gICAgfVxuICAgIGNvbnN0IGdlbk1hdGNoID0gR0VORVJBVEVEX0ZJTEVTLmV4ZWMoZmlsZU5hbWUpO1xuICAgIGlmICghZ2VuTWF0Y2gpIHtcbiAgICAgIHJldHVybiB7Z2VuZXJhdGU6IGZhbHNlfTtcbiAgICB9XG4gICAgY29uc3QgWywgYmFzZSwgZ2VuU3VmZml4LCBzdWZmaXhdID0gZ2VuTWF0Y2g7XG4gICAgaWYgKHN1ZmZpeCAhPT0gJ3RzJyAmJiBzdWZmaXggIT09ICd0c3gnKSB7XG4gICAgICByZXR1cm4ge2dlbmVyYXRlOiBmYWxzZX07XG4gICAgfVxuICAgIGxldCBiYXNlRmlsZU5hbWU6IHN0cmluZ3x1bmRlZmluZWQ7XG4gICAgaWYgKGdlblN1ZmZpeC5pbmRleE9mKCduZ3N0eWxlJykgPj0gMCkge1xuICAgICAgLy8gTm90ZTogbmdzdHlsZSBmaWxlcyBoYXZlIG5hbWVzIGxpa2UgYGFmaWxlLmNzcy5uZ3N0eWxlLnRzYFxuICAgICAgaWYgKCF0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhiYXNlKSkge1xuICAgICAgICByZXR1cm4ge2dlbmVyYXRlOiBmYWxzZX07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5vdGU6IG9uLXRoZS1mbHkgZ2VuZXJhdGVkIGZpbGVzIGFsd2F5cyBoYXZlIGEgYC50c2Agc3VmZml4LFxuICAgICAgLy8gYnV0IHRoZSBmaWxlIGZyb20gd2hpY2ggd2UgZ2VuZXJhdGVkIGl0IGNhbiBiZSBhIGAudHNgLyBgLnRzeGAvIGAuZC50c2BcbiAgICAgIC8vIChzZWUgb3B0aW9ucy5nZW5lcmF0ZUNvZGVGb3JMaWJyYXJpZXMpLlxuICAgICAgYmFzZUZpbGVOYW1lID0gW2Ake2Jhc2V9LnRzYCwgYCR7YmFzZX0udHN4YCwgYCR7YmFzZX0uZC50c2BdLmZpbmQoXG4gICAgICAgICAgYmFzZUZpbGVOYW1lID0+IHRoaXMuaXNTb3VyY2VGaWxlKGJhc2VGaWxlTmFtZSkgJiYgdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMoYmFzZUZpbGVOYW1lKSk7XG4gICAgICBpZiAoIWJhc2VGaWxlTmFtZSkge1xuICAgICAgICByZXR1cm4ge2dlbmVyYXRlOiBmYWxzZX07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7Z2VuZXJhdGU6IHRydWUsIGJhc2VGaWxlTmFtZX07XG4gIH1cblxuICBzaG91bGRHZW5lcmF0ZUZpbGVzRm9yKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICAvLyBUT0RPKHRib3NjaCk6IGFsbG93IGdlbmVyYXRpbmcgZmlsZXMgdGhhdCBhcmUgbm90IGluIHRoZSByb290RGlyXG4gICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzE5MzM3XG4gICAgcmV0dXJuICFHRU5FUkFURURfRklMRVMudGVzdChmaWxlTmFtZSkgJiYgdGhpcy5pc1NvdXJjZUZpbGUoZmlsZU5hbWUpICYmXG4gICAgICAgIGlzSW5Sb290RGlyKGZpbGVOYW1lLCB0aGlzLm9wdGlvbnMpO1xuICB9XG5cbiAgZ2V0U291cmNlRmlsZShcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIGxhbmd1YWdlVmVyc2lvbjogdHMuU2NyaXB0VGFyZ2V0LFxuICAgICAgb25FcnJvcj86ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICAvLyBOb3RlOiBEb24ndCBleGl0IGVhcmx5IGluIHRoaXMgbWV0aG9kIHRvIG1ha2Ugc3VyZVxuICAgIC8vIHdlIGFsd2F5cyBoYXZlIHVwIHRvIGRhdGUgcmVmZXJlbmNlcyBvbiB0aGUgZmlsZSFcbiAgICBsZXQgZ2VuRmlsZU5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBzZiA9IHRoaXMuZ2V0R2VuZXJhdGVkRmlsZShmaWxlTmFtZSk7XG4gICAgaWYgKCFzZikge1xuICAgICAgY29uc3Qgc3VtbWFyeSA9IHRoaXMubGlicmFyeVN1bW1hcmllcy5nZXQoZmlsZU5hbWUpO1xuICAgICAgaWYgKHN1bW1hcnkpIHtcbiAgICAgICAgaWYgKCFzdW1tYXJ5LnNvdXJjZUZpbGUpIHtcbiAgICAgICAgICBzdW1tYXJ5LnNvdXJjZUZpbGUgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICAgICAgICBmaWxlTmFtZSwgc3VtbWFyeS50ZXh0LCB0aGlzLm9wdGlvbnMudGFyZ2V0IHx8IHRzLlNjcmlwdFRhcmdldC5MYXRlc3QpO1xuICAgICAgICB9XG4gICAgICAgIHNmID0gc3VtbWFyeS5zb3VyY2VGaWxlO1xuICAgICAgICBnZW5GaWxlTmFtZXMgPSBbXTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFzZikge1xuICAgICAgc2YgPSB0aGlzLmdldE9yaWdpbmFsU291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBjb25zdCBjYWNoZWRHZW5GaWxlcyA9IHRoaXMuZ2VuZXJhdGVkQ29kZUZvci5nZXQoZmlsZU5hbWUpO1xuICAgICAgaWYgKGNhY2hlZEdlbkZpbGVzKSB7XG4gICAgICAgIGdlbkZpbGVOYW1lcyA9IGNhY2hlZEdlbkZpbGVzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMubm9SZXNvbHZlICYmIHRoaXMuc2hvdWxkR2VuZXJhdGVGaWxlc0ZvcihmaWxlTmFtZSkpIHtcbiAgICAgICAgICBnZW5GaWxlTmFtZXMgPSB0aGlzLmNvZGVHZW5lcmF0b3IuZmluZEdlbmVyYXRlZEZpbGVOYW1lcyhmaWxlTmFtZSkuZmlsdGVyKFxuICAgICAgICAgICAgICBmaWxlTmFtZSA9PiB0aGlzLnNob3VsZEdlbmVyYXRlRmlsZShmaWxlTmFtZSkuZ2VuZXJhdGUpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZ2VuZXJhdGVkQ29kZUZvci5zZXQoZmlsZU5hbWUsIGdlbkZpbGVOYW1lcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChzZikge1xuICAgICAgYWRkUmVmZXJlbmNlc1RvU291cmNlRmlsZShzZiwgZ2VuRmlsZU5hbWVzKTtcbiAgICB9XG4gICAgLy8gVE9ETyh0Ym9zY2gpOiBUeXBlU2NyaXB0J3MgdHlwaW5ncyBmb3IgZ2V0U291cmNlRmlsZSBhcmUgaW5jb3JyZWN0LFxuICAgIC8vIGFzIGl0IGNhbiB2ZXJ5IHdlbGwgcmV0dXJuIHVuZGVmaW5lZC5cbiAgICByZXR1cm4gc2YgITtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0R2VuZXJhdGVkRmlsZShmaWxlTmFtZTogc3RyaW5nKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgICBjb25zdCBnZW5TcmNGaWxlID0gdGhpcy5nZW5lcmF0ZWRTb3VyY2VGaWxlcy5nZXQoZmlsZU5hbWUpO1xuICAgIGlmIChnZW5TcmNGaWxlKSB7XG4gICAgICByZXR1cm4gZ2VuU3JjRmlsZS5zb3VyY2VGaWxlO1xuICAgIH1cbiAgICBjb25zdCB7Z2VuZXJhdGUsIGJhc2VGaWxlTmFtZX0gPSB0aGlzLnNob3VsZEdlbmVyYXRlRmlsZShmaWxlTmFtZSk7XG4gICAgaWYgKGdlbmVyYXRlKSB7XG4gICAgICBjb25zdCBnZW5GaWxlID0gdGhpcy5jb2RlR2VuZXJhdG9yLmdlbmVyYXRlRmlsZShmaWxlTmFtZSwgYmFzZUZpbGVOYW1lKTtcbiAgICAgIHJldHVybiB0aGlzLmFkZEdlbmVyYXRlZEZpbGUoZ2VuRmlsZSwgZ2VuRmlsZUV4dGVybmFsUmVmZXJlbmNlcyhnZW5GaWxlKSk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBvcmlnaW5hbEZpbGVFeGlzdHMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGxldCBmaWxlRXhpc3RzID0gdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHNDYWNoZS5nZXQoZmlsZU5hbWUpO1xuICAgIGlmIChmaWxlRXhpc3RzID09IG51bGwpIHtcbiAgICAgIGZpbGVFeGlzdHMgPSB0aGlzLmNvbnRleHQuZmlsZUV4aXN0cyhmaWxlTmFtZSk7XG4gICAgICB0aGlzLm9yaWdpbmFsRmlsZUV4aXN0c0NhY2hlLnNldChmaWxlTmFtZSwgZmlsZUV4aXN0cyk7XG4gICAgfVxuICAgIHJldHVybiBmaWxlRXhpc3RzO1xuICB9XG5cbiAgZmlsZUV4aXN0cyhmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgZmlsZU5hbWUgPSBzdHJpcE5nUmVzb3VyY2VTdWZmaXgoZmlsZU5hbWUpO1xuICAgIGlmICh0aGlzLmxpYnJhcnlTdW1tYXJpZXMuaGFzKGZpbGVOYW1lKSB8fCB0aGlzLmdlbmVyYXRlZFNvdXJjZUZpbGVzLmhhcyhmaWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAodGhpcy5zaG91bGRHZW5lcmF0ZUZpbGUoZmlsZU5hbWUpLmdlbmVyYXRlKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVOYW1lKTtcbiAgfVxuXG4gIGxvYWRTdW1tYXJ5KGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3Qgc3VtbWFyeSA9IHRoaXMubGlicmFyeVN1bW1hcmllcy5nZXQoZmlsZVBhdGgpO1xuICAgIGlmIChzdW1tYXJ5KSB7XG4gICAgICByZXR1cm4gc3VtbWFyeS50ZXh0O1xuICAgIH1cbiAgICBpZiAodGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMoZmlsZVBhdGgpKSB7XG4gICAgICByZXR1cm4gYXNzZXJ0KHRoaXMuY29udGV4dC5yZWFkRmlsZShmaWxlUGF0aCkpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlzU291cmNlRmlsZShmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgLy8gRG9uJ3QgZ2VuZXJhdGUgYW55IGZpbGVzIG5vciB0eXBlY2hlY2sgdGhlbVxuICAgIC8vIGlmIHNraXBUZW1wbGF0ZUNvZGVnZW4gaXMgc2V0IGFuZCBmdWxsVGVtcGxhdGVUeXBlQ2hlY2sgaXMgbm90IHlldCBzZXQsXG4gICAgLy8gZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuICAgIGlmICh0aGlzLm9wdGlvbnMuc2tpcFRlbXBsYXRlQ29kZWdlbiAmJiAhdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJZiB3ZSBoYXZlIGEgc3VtbWFyeSBmcm9tIGEgcHJldmlvdXMgY29tcGlsYXRpb24sXG4gICAgLy8gdHJlYXQgdGhlIGZpbGUgbmV2ZXIgYXMgYSBzb3VyY2UgZmlsZS5cbiAgICBpZiAodGhpcy5saWJyYXJ5U3VtbWFyaWVzLmhhcyhmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKEdFTkVSQVRFRF9GSUxFUy50ZXN0KGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmdlbmVyYXRlQ29kZUZvckxpYnJhcmllcyA9PT0gZmFsc2UgJiYgRFRTLnRlc3QoZmlsZVBhdGgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChEVFMudGVzdChmaWxlUGF0aCkpIHtcbiAgICAgIC8vIENoZWNrIGZvciBhIGJ1bmRsZSBpbmRleC5cbiAgICAgIGlmICh0aGlzLmhhc0J1bmRsZUluZGV4KGZpbGVQYXRoKSkge1xuICAgICAgICBjb25zdCBub3JtYWxGaWxlUGF0aCA9IHBhdGgubm9ybWFsaXplKGZpbGVQYXRoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmxhdE1vZHVsZUluZGV4TmFtZXMuaGFzKG5vcm1hbEZpbGVQYXRoKSB8fFxuICAgICAgICAgICAgdGhpcy5mbGF0TW9kdWxlSW5kZXhSZWRpcmVjdE5hbWVzLmhhcyhub3JtYWxGaWxlUGF0aCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmVhZEZpbGUoZmlsZU5hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLmxpYnJhcnlTdW1tYXJpZXMuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoc3VtbWFyeSkge1xuICAgICAgcmV0dXJuIHN1bW1hcnkudGV4dDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29udGV4dC5yZWFkRmlsZShmaWxlTmFtZSk7XG4gIH1cblxuICBnZXRNZXRhZGF0YUZvcihmaWxlUGF0aDogc3RyaW5nKTogTW9kdWxlTWV0YWRhdGFbXXx1bmRlZmluZWQge1xuICAgIHJldHVybiByZWFkTWV0YWRhdGEoZmlsZVBhdGgsIHRoaXMubWV0YWRhdGFSZWFkZXJIb3N0LCB0aGlzLm1ldGFkYXRhUmVhZGVyQ2FjaGUpO1xuICB9XG5cbiAgbG9hZFJlc291cmNlKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz58c3RyaW5nIHtcbiAgICBpZiAodGhpcy5jb250ZXh0LnJlYWRSZXNvdXJjZSkgcmV0dXJuIHRoaXMuY29udGV4dC5yZWFkUmVzb3VyY2UoZmlsZVBhdGgpO1xuICAgIGlmICghdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMoZmlsZVBhdGgpKSB7XG4gICAgICB0aHJvdyBzeW50YXhFcnJvcihgRXJyb3I6IFJlc291cmNlIGZpbGUgbm90IGZvdW5kOiAke2ZpbGVQYXRofWApO1xuICAgIH1cbiAgICByZXR1cm4gYXNzZXJ0KHRoaXMuY29udGV4dC5yZWFkRmlsZShmaWxlUGF0aCkpO1xuICB9XG5cbiAgZ2V0T3V0cHV0TmFtZShmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcGF0aC5yZWxhdGl2ZSh0aGlzLmdldEN1cnJlbnREaXJlY3RvcnkoKSwgZmlsZVBhdGgpO1xuICB9XG5cbiAgcHJpdmF0ZSBoYXNCdW5kbGVJbmRleChmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgY2hlY2tCdW5kbGVJbmRleCA9IChkaXJlY3Rvcnk6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xuICAgICAgbGV0IHJlc3VsdCA9IHRoaXMuZmxhdE1vZHVsZUluZGV4Q2FjaGUuZ2V0KGRpcmVjdG9yeSk7XG4gICAgICBpZiAocmVzdWx0ID09IG51bGwpIHtcbiAgICAgICAgaWYgKHBhdGguYmFzZW5hbWUoZGlyZWN0b3J5KSA9PSAnbm9kZV9tb2R1bGUnKSB7XG4gICAgICAgICAgLy8gRG9uJ3QgbG9vayBvdXRzaWRlIHRoZSBub2RlX21vZHVsZXMgdGhpcyBwYWNrYWdlIGlzIGluc3RhbGxlZCBpbi5cbiAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBBIGJ1bmRsZSBpbmRleCBleGlzdHMgaWYgdGhlIHR5cGluZ3MgLmQudHMgZmlsZSBoYXMgYSBtZXRhZGF0YS5qc29uIHRoYXQgaGFzIGFuXG4gICAgICAgICAgLy8gaW1wb3J0QXMuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VGaWxlID0gcGF0aC5qb2luKGRpcmVjdG9yeSwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgICAgICAgaWYgKHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKHBhY2thZ2VGaWxlKSkge1xuICAgICAgICAgICAgICAvLyBPbmNlIHdlIHNlZSBhIHBhY2thZ2UuanNvbiBmaWxlLCBhc3N1bWUgZmFsc2UgdW50aWwgaXQgd2UgZmluZCB0aGUgYnVuZGxlIGluZGV4LlxuICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgY29uc3QgcGFja2FnZUNvbnRlbnQ6IGFueSA9IEpTT04ucGFyc2UoYXNzZXJ0KHRoaXMuY29udGV4dC5yZWFkRmlsZShwYWNrYWdlRmlsZSkpKTtcbiAgICAgICAgICAgICAgaWYgKHBhY2thZ2VDb250ZW50LnR5cGluZ3MpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0eXBpbmdzID0gcGF0aC5ub3JtYWxpemUocGF0aC5qb2luKGRpcmVjdG9yeSwgcGFja2FnZUNvbnRlbnQudHlwaW5ncykpO1xuICAgICAgICAgICAgICAgIGlmIChEVFMudGVzdCh0eXBpbmdzKSkge1xuICAgICAgICAgICAgICAgICAgY29uc3QgbWV0YWRhdGFGaWxlID0gdHlwaW5ncy5yZXBsYWNlKERUUywgJy5tZXRhZGF0YS5qc29uJyk7XG4gICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMobWV0YWRhdGFGaWxlKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXRhZGF0YSA9IEpTT04ucGFyc2UoYXNzZXJ0KHRoaXMuY29udGV4dC5yZWFkRmlsZShtZXRhZGF0YUZpbGUpKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXRhZGF0YS5mbGF0TW9kdWxlSW5kZXhSZWRpcmVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmxhdE1vZHVsZUluZGV4UmVkaXJlY3ROYW1lcy5hZGQodHlwaW5ncyk7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gTm90ZTogZG9uJ3Qgc2V0IHJlc3VsdCA9IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgLy8gYXMgdGhpcyB3b3VsZCBtYXJrIHRoaXMgZm9sZGVyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gYXMgaGF2aW5nIGEgYnVuZGxlSW5kZXggdG9vIGVhcmx5IHdpdGhvdXRcbiAgICAgICAgICAgICAgICAgICAgICAvLyBmaWxsaW5nIHRoZSBidW5kbGVJbmRleE5hbWVzLlxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1ldGFkYXRhLmltcG9ydEFzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5mbGF0TW9kdWxlSW5kZXhOYW1lcy5hZGQodHlwaW5ncyk7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gcGF0aC5kaXJuYW1lKGRpcmVjdG9yeSk7XG4gICAgICAgICAgICAgIGlmIChwYXJlbnQgIT0gZGlyZWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IHRoZSBwYXJlbnQgZGlyZWN0b3J5LlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGNoZWNrQnVuZGxlSW5kZXgocGFyZW50KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIElmIHdlIGVuY291bnRlciBhbnkgZXJyb3JzIGFzc3VtZSB3ZSB0aGlzIGlzbid0IGEgYnVuZGxlIGluZGV4LlxuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmxhdE1vZHVsZUluZGV4Q2FjaGUuc2V0KGRpcmVjdG9yeSwgcmVzdWx0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIHJldHVybiBjaGVja0J1bmRsZUluZGV4KHBhdGguZGlybmFtZShmaWxlUGF0aCkpO1xuICB9XG5cbiAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lID0gKG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucykgPT5cbiAgICAgIHRoaXMuY29udGV4dC5nZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9ucylcbiAgZ2V0Q3VycmVudERpcmVjdG9yeSA9ICgpID0+IHRoaXMuY29udGV4dC5nZXRDdXJyZW50RGlyZWN0b3J5KCk7XG4gIGdldENhbm9uaWNhbEZpbGVOYW1lID0gKGZpbGVOYW1lOiBzdHJpbmcpID0+IHRoaXMuY29udGV4dC5nZXRDYW5vbmljYWxGaWxlTmFtZShmaWxlTmFtZSk7XG4gIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMgPSAoKSA9PiB0aGlzLmNvbnRleHQudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpO1xuICBnZXROZXdMaW5lID0gKCkgPT4gdGhpcy5jb250ZXh0LmdldE5ld0xpbmUoKTtcbiAgLy8gTWFrZSBzdXJlIHdlIGRvIG5vdCBgaG9zdC5yZWFscGF0aCgpYCBmcm9tIFRTIGFzIHdlIGRvIG5vdCB3YW50IHRvIHJlc29sdmUgc3ltbGlua3MuXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvOTU1MlxuICByZWFsUGF0aCA9IChwOiBzdHJpbmcpID0+IHA7XG4gIHdyaXRlRmlsZSA9IHRoaXMuY29udGV4dC53cml0ZUZpbGUuYmluZCh0aGlzLmNvbnRleHQpO1xufVxuXG5mdW5jdGlvbiBnZW5GaWxlRXh0ZXJuYWxSZWZlcmVuY2VzKGdlbkZpbGU6IEdlbmVyYXRlZEZpbGUpOiBTZXQ8c3RyaW5nPiB7XG4gIHJldHVybiBuZXcgU2V0KGNvbGxlY3RFeHRlcm5hbFJlZmVyZW5jZXMoZ2VuRmlsZS5zdG10cyAhKS5tYXAoZXIgPT4gZXIubW9kdWxlTmFtZSAhKSk7XG59XG5cbmZ1bmN0aW9uIGFkZFJlZmVyZW5jZXNUb1NvdXJjZUZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUsIGdlbkZpbGVOYW1lczogc3RyaW5nW10pIHtcbiAgLy8gTm90ZTogYXMgd2UgbW9kaWZ5IHRzLlNvdXJjZUZpbGVzIHdlIG5lZWQgdG8ga2VlcCB0aGUgb3JpZ2luYWxcbiAgLy8gdmFsdWUgZm9yIGByZWZlcmVuY2VkRmlsZXNgIGFyb3VuZCBpbiBjYWNoZSB0aGUgb3JpZ2luYWwgaG9zdCBpcyBjYWNoaW5nIHRzLlNvdXJjZUZpbGVzLlxuICAvLyBOb3RlOiBjbG9uaW5nIHRoZSB0cy5Tb3VyY2VGaWxlIGlzIGV4cGVuc2l2ZSBhcyB0aGUgbm9kZXMgaW4gaGF2ZSBwYXJlbnQgcG9pbnRlcnMsXG4gIC8vIGkuZS4gd2Ugd291bGQgYWxzbyBuZWVkIHRvIGNsb25lIGFuZCBhZGp1c3QgYWxsIG5vZGVzLlxuICBsZXQgb3JpZ2luYWxSZWZlcmVuY2VkRmlsZXM6IFJlYWRvbmx5QXJyYXk8dHMuRmlsZVJlZmVyZW5jZT4gPVxuICAgICAgKHNmIGFzIGFueSkub3JpZ2luYWxSZWZlcmVuY2VkRmlsZXM7XG4gIGlmICghb3JpZ2luYWxSZWZlcmVuY2VkRmlsZXMpIHtcbiAgICBvcmlnaW5hbFJlZmVyZW5jZWRGaWxlcyA9IHNmLnJlZmVyZW5jZWRGaWxlcztcbiAgICAoc2YgYXMgYW55KS5vcmlnaW5hbFJlZmVyZW5jZWRGaWxlcyA9IG9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzO1xuICB9XG4gIGNvbnN0IG5ld1JlZmVyZW5jZWRGaWxlcyA9IFsuLi5vcmlnaW5hbFJlZmVyZW5jZWRGaWxlc107XG4gIGdlbkZpbGVOYW1lcy5mb3JFYWNoKGdmID0+IG5ld1JlZmVyZW5jZWRGaWxlcy5wdXNoKHtmaWxlTmFtZTogZ2YsIHBvczogMCwgZW5kOiAwfSkpO1xuICBzZi5yZWZlcmVuY2VkRmlsZXMgPSBuZXdSZWZlcmVuY2VkRmlsZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRPcmlnaW5hbFJlZmVyZW5jZXMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLkZpbGVSZWZlcmVuY2VbXXx1bmRlZmluZWQge1xuICByZXR1cm4gc291cmNlRmlsZSAmJiAoc291cmNlRmlsZSBhcyBhbnkpLm9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzO1xufVxuXG5mdW5jdGlvbiBkb3RSZWxhdGl2ZShmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCByUGF0aDogc3RyaW5nID0gcGF0aC5yZWxhdGl2ZShmcm9tLCB0bykucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICByZXR1cm4gclBhdGguc3RhcnRzV2l0aCgnLicpID8gclBhdGggOiAnLi8nICsgclBhdGg7XG59XG5cbi8qKlxuICogTW92ZXMgdGhlIHBhdGggaW50byBgZ2VuRGlyYCBmb2xkZXIgd2hpbGUgcHJlc2VydmluZyB0aGUgYG5vZGVfbW9kdWxlc2AgZGlyZWN0b3J5LlxuICovXG5mdW5jdGlvbiBnZXRQYWNrYWdlTmFtZShmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICBjb25zdCBtYXRjaCA9IE5PREVfTU9EVUxFU19QQUNLQUdFX05BTUUuZXhlYyhmaWxlUGF0aCk7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzFdIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gc3RyaXBOb2RlTW9kdWxlc1ByZWZpeChmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGZpbGVQYXRoLnJlcGxhY2UoLy4qbm9kZV9tb2R1bGVzXFwvLywgJycpO1xufVxuXG5mdW5jdGlvbiBnZXROb2RlTW9kdWxlc1ByZWZpeChmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICBjb25zdCBtYXRjaCA9IC8uKm5vZGVfbW9kdWxlc1xcLy8uZXhlYyhmaWxlUGF0aCk7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzFdIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gc3RyaXBOZ1Jlc291cmNlU3VmZml4KGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZmlsZU5hbWUucmVwbGFjZSgvXFwuXFwkbmdyZXNvdXJjZVxcJC4qLywgJycpO1xufVxuXG5mdW5jdGlvbiBhZGROZ1Jlc291cmNlU3VmZml4KGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7ZmlsZU5hbWV9LiRuZ3Jlc291cmNlJGA7XG59XG4iXX0=