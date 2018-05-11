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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXVMO0lBQ3ZMLDJCQUE2QjtJQUM3QiwrQkFBaUM7SUFJakMsK0VBQXlEO0lBR3pELDBGQUE4RjtJQUM5RixvRUFBNkU7SUFFN0UsSUFBTSx5QkFBeUIsR0FBRyw2Q0FBNkMsQ0FBQztJQUNoRixJQUFNLEdBQUcsR0FBRyxrQ0FBa0MsQ0FBQztJQUUvQyw0QkFDSSxFQUN3RDtZQUR2RCxvQkFBTyxFQUFFLGNBQTZDLEVBQTdDLGtFQUE2QztRQUV6RCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUN0QixNQUFNLENBQUMsSUFBSSxpQ0FBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBUEQsZ0RBT0M7SUFpQkQsZ0JBQW1CLFNBQStCO1FBQ2hELEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNmLHFDQUFxQztRQUN2QyxDQUFDO1FBQ0QsTUFBTSxDQUFDLFNBQVcsQ0FBQztJQUNyQixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSDtRQXNCRSxtREFDWSxTQUFnQyxFQUFVLE9BQXdCLEVBQ2xFLE9BQXFCLEVBQVUsZ0JBQWtDLEVBQ2pFLGFBQTRCLEVBQzVCLGdCQUFvRDtZQUFwRCxpQ0FBQSxFQUFBLHVCQUF1QixHQUFHLEVBQTBCO1lBSmhFLGlCQWdEQztZQS9DVyxjQUFTLEdBQVQsU0FBUyxDQUF1QjtZQUFVLFlBQU8sR0FBUCxPQUFPLENBQWlCO1lBQ2xFLFlBQU8sR0FBUCxPQUFPLENBQWM7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O0lBRUQ7O09BRUc7SUFDSCx3QkFBd0IsUUFBZ0I7UUFDdEMsSUFBTSxLQUFLLEdBQUcseUJBQXlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ2pDLENBQUM7SUFFRCxnQ0FBZ0MsUUFBZ0I7UUFDOUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVELDhCQUE4QixRQUFnQjtRQUM1QyxJQUFNLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDakMsQ0FBQztJQUVELCtCQUErQixRQUFnQjtRQUM3QyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQsNkJBQTZCLFFBQWdCO1FBQzNDLE1BQU0sQ0FBSSxRQUFRLGtCQUFlLENBQUM7SUFDcEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBb3RDb21waWxlckhvc3QsIEVtaXR0ZXJWaXNpdG9yQ29udGV4dCwgRXh0ZXJuYWxSZWZlcmVuY2UsIEdlbmVyYXRlZEZpbGUsIFBhcnNlU291cmNlU3BhbiwgVHlwZVNjcmlwdEVtaXR0ZXIsIGNvbGxlY3RFeHRlcm5hbFJlZmVyZW5jZXMsIHN5bnRheEVycm9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7VHlwZUNoZWNrSG9zdH0gZnJvbSAnLi4vZGlhZ25vc3RpY3MvdHJhbnNsYXRlX2RpYWdub3N0aWNzJztcbmltcG9ydCB7TUVUQURBVEFfVkVSU0lPTiwgTW9kdWxlTWV0YWRhdGF9IGZyb20gJy4uL21ldGFkYXRhL2luZGV4JztcbmltcG9ydCB7Tmd0c2NDb21waWxlckhvc3R9IGZyb20gJy4uL25ndHNjL2NvbXBpbGVyX2hvc3QnO1xuXG5pbXBvcnQge0NvbXBpbGVySG9zdCwgQ29tcGlsZXJPcHRpb25zLCBMaWJyYXJ5U3VtbWFyeX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtNZXRhZGF0YVJlYWRlckhvc3QsIGNyZWF0ZU1ldGFkYXRhUmVhZGVyQ2FjaGUsIHJlYWRNZXRhZGF0YX0gZnJvbSAnLi9tZXRhZGF0YV9yZWFkZXInO1xuaW1wb3J0IHtEVFMsIEdFTkVSQVRFRF9GSUxFUywgaXNJblJvb3REaXIsIHJlbGF0aXZlVG9Sb290RGlyc30gZnJvbSAnLi91dGlsJztcblxuY29uc3QgTk9ERV9NT0RVTEVTX1BBQ0tBR0VfTkFNRSA9IC9ub2RlX21vZHVsZXNcXC8oKFxcd3wtKSt8KEAoXFx3fC0pK1xcLyhcXHd8LSkrKSkvO1xuY29uc3QgRVhUID0gLyhcXC50c3xcXC5kXFwudHN8XFwuanN8XFwuanN4fFxcLnRzeCkkLztcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbXBpbGVySG9zdChcbiAgICB7b3B0aW9ucywgdHNIb3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KG9wdGlvbnMsIHRydWUpfTpcbiAgICAgICAge29wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgdHNIb3N0PzogdHMuQ29tcGlsZXJIb3N0fSk6IENvbXBpbGVySG9zdCB7XG4gIGlmIChvcHRpb25zLmVuYWJsZUl2eSkge1xuICAgIHJldHVybiBuZXcgTmd0c2NDb21waWxlckhvc3QodHNIb3N0KTtcbiAgfVxuICByZXR1cm4gdHNIb3N0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1ldGFkYXRhUHJvdmlkZXIge1xuICBnZXRNZXRhZGF0YShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogTW9kdWxlTWV0YWRhdGF8dW5kZWZpbmVkO1xufVxuXG5pbnRlcmZhY2UgR2VuU291cmNlRmlsZSB7XG4gIGV4dGVybmFsUmVmZXJlbmNlczogU2V0PHN0cmluZz47XG4gIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGU7XG4gIGVtaXRDdHg6IEVtaXR0ZXJWaXNpdG9yQ29udGV4dDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb2RlR2VuZXJhdG9yIHtcbiAgZ2VuZXJhdGVGaWxlKGdlbkZpbGVOYW1lOiBzdHJpbmcsIGJhc2VGaWxlTmFtZT86IHN0cmluZyk6IEdlbmVyYXRlZEZpbGU7XG4gIGZpbmRHZW5lcmF0ZWRGaWxlTmFtZXMoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZ1tdO1xufVxuXG5mdW5jdGlvbiBhc3NlcnQ8VD4oY29uZGl0aW9uOiBUIHwgbnVsbCB8IHVuZGVmaW5lZCkge1xuICBpZiAoIWNvbmRpdGlvbikge1xuICAgIC8vIFRPRE8oY2h1Y2tqYXopOiBkbyB0aGUgcmlnaHQgdGhpbmdcbiAgfVxuICByZXR1cm4gY29uZGl0aW9uICE7XG59XG5cbi8qKlxuICogSW1wbGVtZW50cyB0aGUgZm9sbG93aW5nIGhvc3RzIGJhc2VkIG9uIGFuIGFwaS5Db21waWxlckhvc3Q6XG4gKiAtIHRzLkNvbXBpbGVySG9zdCB0byBiZSBjb25zdW1lZCBieSBhIHRzLlByb2dyYW1cbiAqIC0gQW90Q29tcGlsZXJIb3N0IGZvciBAYW5ndWxhci9jb21waWxlclxuICogLSBUeXBlQ2hlY2tIb3N0IGZvciBtYXBwaW5nIHRzIGVycm9ycyB0byBuZyBlcnJvcnMgKHZpYSB0cmFuc2xhdGVEaWFnbm9zdGljcylcbiAqL1xuZXhwb3J0IGNsYXNzIFRzQ29tcGlsZXJBb3RDb21waWxlclR5cGVDaGVja0hvc3RBZGFwdGVyIGltcGxlbWVudHMgdHMuQ29tcGlsZXJIb3N0LCBBb3RDb21waWxlckhvc3QsXG4gICAgVHlwZUNoZWNrSG9zdCB7XG4gIHByaXZhdGUgbWV0YWRhdGFSZWFkZXJDYWNoZSA9IGNyZWF0ZU1ldGFkYXRhUmVhZGVyQ2FjaGUoKTtcbiAgcHJpdmF0ZSBmaWxlTmFtZVRvTW9kdWxlTmFtZUNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgcHJpdmF0ZSBmbGF0TW9kdWxlSW5kZXhDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBib29sZWFuPigpO1xuICBwcml2YXRlIGZsYXRNb2R1bGVJbmRleE5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHByaXZhdGUgZmxhdE1vZHVsZUluZGV4UmVkaXJlY3ROYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBwcml2YXRlIHJvb3REaXJzOiBzdHJpbmdbXTtcbiAgcHJpdmF0ZSBtb2R1bGVSZXNvbHV0aW9uQ2FjaGU6IHRzLk1vZHVsZVJlc29sdXRpb25DYWNoZTtcbiAgcHJpdmF0ZSBvcmlnaW5hbFNvdXJjZUZpbGVzID0gbmV3IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGV8bnVsbD4oKTtcbiAgcHJpdmF0ZSBvcmlnaW5hbEZpbGVFeGlzdHNDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBib29sZWFuPigpO1xuICBwcml2YXRlIGdlbmVyYXRlZFNvdXJjZUZpbGVzID0gbmV3IE1hcDxzdHJpbmcsIEdlblNvdXJjZUZpbGU+KCk7XG4gIHByaXZhdGUgZ2VuZXJhdGVkQ29kZUZvciA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcbiAgcHJpdmF0ZSBlbWl0dGVyID0gbmV3IFR5cGVTY3JpcHRFbWl0dGVyKCk7XG4gIHByaXZhdGUgbWV0YWRhdGFSZWFkZXJIb3N0OiBNZXRhZGF0YVJlYWRlckhvc3Q7XG5cbiAgZ2V0Q2FuY2VsbGF0aW9uVG9rZW46ICgpID0+IHRzLkNhbmNlbGxhdGlvblRva2VuO1xuICBnZXREZWZhdWx0TGliTG9jYXRpb246ICgpID0+IHN0cmluZztcbiAgdHJhY2U6IChzOiBzdHJpbmcpID0+IHZvaWQ7XG4gIGdldERpcmVjdG9yaWVzOiAocGF0aDogc3RyaW5nKSA9PiBzdHJpbmdbXTtcbiAgZGlyZWN0b3J5RXhpc3RzPzogKGRpcmVjdG9yeU5hbWU6IHN0cmluZykgPT4gYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm9vdEZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sIHByaXZhdGUgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBjb250ZXh0OiBDb21waWxlckhvc3QsIHByaXZhdGUgbWV0YWRhdGFQcm92aWRlcjogTWV0YWRhdGFQcm92aWRlcixcbiAgICAgIHByaXZhdGUgY29kZUdlbmVyYXRvcjogQ29kZUdlbmVyYXRvcixcbiAgICAgIHByaXZhdGUgbGlicmFyeVN1bW1hcmllcyA9IG5ldyBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4oKSkge1xuICAgIHRoaXMubW9kdWxlUmVzb2x1dGlvbkNhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKFxuICAgICAgICB0aGlzLmNvbnRleHQuZ2V0Q3VycmVudERpcmVjdG9yeSAhKCksIHRoaXMuY29udGV4dC5nZXRDYW5vbmljYWxGaWxlTmFtZS5iaW5kKHRoaXMuY29udGV4dCkpO1xuICAgIGNvbnN0IGJhc2VQYXRoID0gdGhpcy5vcHRpb25zLmJhc2VQYXRoICE7XG4gICAgdGhpcy5yb290RGlycyA9XG4gICAgICAgICh0aGlzLm9wdGlvbnMucm9vdERpcnMgfHwgW3RoaXMub3B0aW9ucy5iYXNlUGF0aCAhXSkubWFwKHAgPT4gcGF0aC5yZXNvbHZlKGJhc2VQYXRoLCBwKSk7XG4gICAgaWYgKGNvbnRleHQuZ2V0RGlyZWN0b3JpZXMpIHtcbiAgICAgIHRoaXMuZ2V0RGlyZWN0b3JpZXMgPSBwYXRoID0+IGNvbnRleHQuZ2V0RGlyZWN0b3JpZXMgIShwYXRoKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQuZGlyZWN0b3J5RXhpc3RzKSB7XG4gICAgICB0aGlzLmRpcmVjdG9yeUV4aXN0cyA9IGRpcmVjdG9yeU5hbWUgPT4gY29udGV4dC5kaXJlY3RvcnlFeGlzdHMgIShkaXJlY3RvcnlOYW1lKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQuZ2V0Q2FuY2VsbGF0aW9uVG9rZW4pIHtcbiAgICAgIHRoaXMuZ2V0Q2FuY2VsbGF0aW9uVG9rZW4gPSAoKSA9PiBjb250ZXh0LmdldENhbmNlbGxhdGlvblRva2VuICEoKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQuZ2V0RGVmYXVsdExpYkxvY2F0aW9uKSB7XG4gICAgICB0aGlzLmdldERlZmF1bHRMaWJMb2NhdGlvbiA9ICgpID0+IGNvbnRleHQuZ2V0RGVmYXVsdExpYkxvY2F0aW9uICEoKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQudHJhY2UpIHtcbiAgICAgIHRoaXMudHJhY2UgPSBzID0+IGNvbnRleHQudHJhY2UgIShzKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQuZmlsZU5hbWVUb01vZHVsZU5hbWUpIHtcbiAgICAgIHRoaXMuZmlsZU5hbWVUb01vZHVsZU5hbWUgPSBjb250ZXh0LmZpbGVOYW1lVG9Nb2R1bGVOYW1lLmJpbmQoY29udGV4dCk7XG4gICAgfVxuICAgIC8vIE5vdGU6IGRvbid0IGNvcHkgb3ZlciBjb250ZXh0Lm1vZHVsZU5hbWVUb0ZpbGVOYW1lIGFzIHdlIGZpcnN0XG4gICAgLy8gbm9ybWFsaXplIHVuZGVmaW5lZCBjb250YWluaW5nRmlsZSB0byBhIGZpbGxlZCBjb250YWluaW5nRmlsZS5cbiAgICBpZiAoY29udGV4dC5yZXNvdXJjZU5hbWVUb0ZpbGVOYW1lKSB7XG4gICAgICB0aGlzLnJlc291cmNlTmFtZVRvRmlsZU5hbWUgPSBjb250ZXh0LnJlc291cmNlTmFtZVRvRmlsZU5hbWUuYmluZChjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQudG9TdW1tYXJ5RmlsZU5hbWUpIHtcbiAgICAgIHRoaXMudG9TdW1tYXJ5RmlsZU5hbWUgPSBjb250ZXh0LnRvU3VtbWFyeUZpbGVOYW1lLmJpbmQoY29udGV4dCk7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LmZyb21TdW1tYXJ5RmlsZU5hbWUpIHtcbiAgICAgIHRoaXMuZnJvbVN1bW1hcnlGaWxlTmFtZSA9IGNvbnRleHQuZnJvbVN1bW1hcnlGaWxlTmFtZS5iaW5kKGNvbnRleHQpO1xuICAgIH1cbiAgICB0aGlzLm1ldGFkYXRhUmVhZGVySG9zdCA9IHtcbiAgICAgIGNhY2hlTWV0YWRhdGE6ICgpID0+IHRydWUsXG4gICAgICBnZXRTb3VyY2VGaWxlTWV0YWRhdGE6IChmaWxlUGF0aCkgPT4ge1xuICAgICAgICBjb25zdCBzZiA9IHRoaXMuZ2V0T3JpZ2luYWxTb3VyY2VGaWxlKGZpbGVQYXRoKTtcbiAgICAgICAgcmV0dXJuIHNmID8gdGhpcy5tZXRhZGF0YVByb3ZpZGVyLmdldE1ldGFkYXRhKHNmKSA6IHVuZGVmaW5lZDtcbiAgICAgIH0sXG4gICAgICBmaWxlRXhpc3RzOiAoZmlsZVBhdGgpID0+IHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVQYXRoKSxcbiAgICAgIHJlYWRGaWxlOiAoZmlsZVBhdGgpID0+IGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZVBhdGgpKSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlTW9kdWxlTmFtZShtb2R1bGVOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiB0cy5SZXNvbHZlZE1vZHVsZVxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgcm0gPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShcbiAgICAgICAgICAgICAgICAgICAgIG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKSwgdGhpcy5vcHRpb25zLCB0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2R1bGVSZXNvbHV0aW9uQ2FjaGUpXG4gICAgICAgICAgICAgICAgICAgLnJlc29sdmVkTW9kdWxlO1xuICAgIGlmIChybSAmJiB0aGlzLmlzU291cmNlRmlsZShybS5yZXNvbHZlZEZpbGVOYW1lKSAmJiBEVFMudGVzdChybS5yZXNvbHZlZEZpbGVOYW1lKSkge1xuICAgICAgLy8gQ2FzZTogZ2VuZXJhdGVDb2RlRm9yTGlicmFyaWVzID0gdHJ1ZSBhbmQgbW9kdWxlTmFtZSBpc1xuICAgICAgLy8gYSAuZC50cyBmaWxlIGluIGEgbm9kZV9tb2R1bGVzIGZvbGRlci5cbiAgICAgIC8vIE5lZWQgdG8gc2V0IGlzRXh0ZXJuYWxMaWJyYXJ5SW1wb3J0IHRvIGZhbHNlIHNvIHRoYXQgZ2VuZXJhdGVkIGZpbGVzIGZvciB0aGF0IGZpbGVcbiAgICAgIC8vIGFyZSBlbWl0dGVkLlxuICAgICAgcm0uaXNFeHRlcm5hbExpYnJhcnlJbXBvcnQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHJtO1xuICB9XG5cbiAgLy8gTm90ZTogV2UgaW1wbGVtZW50IHRoaXMgbWV0aG9kIHNvIHRoYXQgVHlwZVNjcmlwdCBhbmQgQW5ndWxhciBzaGFyZSB0aGUgc2FtZVxuICAvLyB0cy5Nb2R1bGVSZXNvbHV0aW9uQ2FjaGVcbiAgLy8gYW5kIHRoYXQgd2UgY2FuIHRlbGwgdHMuUHJvZ3JhbSBhYm91dCBvdXIgZGlmZmVyZW50IG9waW5pb24gYWJvdXRcbiAgLy8gUmVzb2x2ZWRNb2R1bGUuaXNFeHRlcm5hbExpYnJhcnlJbXBvcnRcbiAgLy8gKHNlZSBvdXIgaXNTb3VyY2VGaWxlIG1ldGhvZCkuXG4gIHJlc29sdmVNb2R1bGVOYW1lcyhtb2R1bGVOYW1lczogc3RyaW5nW10sIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiB0cy5SZXNvbHZlZE1vZHVsZVtdIHtcbiAgICAvLyBUT0RPKHRib3NjaCk6IHRoaXMgc2VlbXMgdG8gYmUgYSB0eXBpbmcgZXJyb3IgaW4gVHlwZVNjcmlwdCxcbiAgICAvLyBhcyBpdCBjb250YWlucyBhc3NlcnRpb25zIHRoYXQgdGhlIHJlc3VsdCBjb250YWlucyB0aGUgc2FtZSBudW1iZXIgb2YgZW50cmllc1xuICAgIC8vIGFzIHRoZSBnaXZlbiBtb2R1bGUgbmFtZXMuXG4gICAgcmV0dXJuIDx0cy5SZXNvbHZlZE1vZHVsZVtdPm1vZHVsZU5hbWVzLm1hcChcbiAgICAgICAgbW9kdWxlTmFtZSA9PiB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlKSk7XG4gIH1cblxuICBtb2R1bGVOYW1lVG9GaWxlTmFtZShtOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlPzogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICAgIGlmICghY29udGFpbmluZ0ZpbGUpIHtcbiAgICAgIGlmIChtLmluZGV4T2YoJy4nKSA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Jlc29sdXRpb24gb2YgcmVsYXRpdmUgcGF0aHMgcmVxdWlyZXMgYSBjb250YWluaW5nIGZpbGUuJyk7XG4gICAgICB9XG4gICAgICAvLyBBbnkgY29udGFpbmluZyBmaWxlIGdpdmVzIHRoZSBzYW1lIHJlc3VsdCBmb3IgYWJzb2x1dGUgaW1wb3J0c1xuICAgICAgY29udGFpbmluZ0ZpbGUgPSB0aGlzLnJvb3RGaWxlc1swXTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY29udGV4dC5tb2R1bGVOYW1lVG9GaWxlTmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5tb2R1bGVOYW1lVG9GaWxlTmFtZShtLCBjb250YWluaW5nRmlsZSk7XG4gICAgfVxuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlTW9kdWxlTmFtZShtLCBjb250YWluaW5nRmlsZSk7XG4gICAgcmV0dXJuIHJlc29sdmVkID8gcmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZSA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogV2Ugd2FudCBhIG1vZHVsZUlkIHRoYXQgd2lsbCBhcHBlYXIgaW4gaW1wb3J0IHN0YXRlbWVudHMgaW4gdGhlIGdlbmVyYXRlZCBjb2RlXG4gICAqIHdoaWNoIHdpbGwgYmUgd3JpdHRlbiB0byBgY29udGFpbmluZ0ZpbGVgLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgd2UgYWxzbyBnZW5lcmF0ZSBmaWxlcyBmb3IgZmlsZXMgaW4gbm9kZV9tb2R1bGVzLCBhcyBsaWJyYXJpZXNcbiAgICogb25seSBzaGlwIC5tZXRhZGF0YS5qc29uIGZpbGVzIGJ1dCBub3QgdGhlIGdlbmVyYXRlZCBjb2RlLlxuICAgKlxuICAgKiBMb2dpYzpcbiAgICogMS4gaWYgdGhlIGltcG9ydGVkRmlsZSBhbmQgdGhlIGNvbnRhaW5pbmdGaWxlIGFyZSBmcm9tIHRoZSBwcm9qZWN0IHNvdXJjZXNcbiAgICogICAgb3IgZnJvbSB0aGUgc2FtZSBub2RlX21vZHVsZXMgcGFja2FnZSwgdXNlIGEgcmVsYXRpdmUgcGF0aFxuICAgKiAyLiBpZiB0aGUgaW1wb3J0ZWRGaWxlIGlzIGluIGEgbm9kZV9tb2R1bGVzIHBhY2thZ2UsXG4gICAqICAgIHVzZSBhIHBhdGggdGhhdCBzdGFydHMgd2l0aCB0aGUgcGFja2FnZSBuYW1lLlxuICAgKiAzLiBFcnJvciBpZiB0aGUgY29udGFpbmluZ0ZpbGUgaXMgaW4gdGhlIG5vZGVfbW9kdWxlcyBwYWNrYWdlXG4gICAqICAgIGFuZCB0aGUgaW1wb3J0ZWRGaWxlIGlzIGluIHRoZSBwcm9qZWN0IHNvdXJlcyxcbiAgICogICAgYXMgdGhhdCBpcyBhIHZpb2xhdGlvbiBvZiB0aGUgcHJpbmNpcGxlIHRoYXQgbm9kZV9tb2R1bGVzIHBhY2thZ2VzIGNhbm5vdFxuICAgKiAgICBpbXBvcnQgcHJvamVjdCBzb3VyY2VzLlxuICAgKi9cbiAgZmlsZU5hbWVUb01vZHVsZU5hbWUoaW1wb3J0ZWRGaWxlOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gYCR7aW1wb3J0ZWRGaWxlfToke2NvbnRhaW5pbmdGaWxlfWA7XG4gICAgbGV0IG1vZHVsZU5hbWUgPSB0aGlzLmZpbGVOYW1lVG9Nb2R1bGVOYW1lQ2FjaGUuZ2V0KGNhY2hlS2V5KTtcbiAgICBpZiAobW9kdWxlTmFtZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gbW9kdWxlTmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCBvcmlnaW5hbEltcG9ydGVkRmlsZSA9IGltcG9ydGVkRmlsZTtcbiAgICBpZiAodGhpcy5vcHRpb25zLnRyYWNlUmVzb2x1dGlvbikge1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAnZmlsZU5hbWVUb01vZHVsZU5hbWUgZnJvbSBjb250YWluaW5nRmlsZScsIGNvbnRhaW5pbmdGaWxlLCAndG8gaW1wb3J0ZWRGaWxlJyxcbiAgICAgICAgICBpbXBvcnRlZEZpbGUpO1xuICAgIH1cblxuICAgIC8vIGRyb3AgZXh0ZW5zaW9uXG4gICAgaW1wb3J0ZWRGaWxlID0gaW1wb3J0ZWRGaWxlLnJlcGxhY2UoRVhULCAnJyk7XG4gICAgY29uc3QgaW1wb3J0ZWRGaWxlUGFja2FnZU5hbWUgPSBnZXRQYWNrYWdlTmFtZShpbXBvcnRlZEZpbGUpO1xuICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlUGFja2FnZU5hbWUgPSBnZXRQYWNrYWdlTmFtZShjb250YWluaW5nRmlsZSk7XG5cbiAgICBpZiAoaW1wb3J0ZWRGaWxlUGFja2FnZU5hbWUgPT09IGNvbnRhaW5pbmdGaWxlUGFja2FnZU5hbWUgfHxcbiAgICAgICAgR0VORVJBVEVEX0ZJTEVTLnRlc3Qob3JpZ2luYWxJbXBvcnRlZEZpbGUpKSB7XG4gICAgICBjb25zdCByb290ZWRDb250YWluaW5nRmlsZSA9IHJlbGF0aXZlVG9Sb290RGlycyhjb250YWluaW5nRmlsZSwgdGhpcy5yb290RGlycyk7XG4gICAgICBjb25zdCByb290ZWRJbXBvcnRlZEZpbGUgPSByZWxhdGl2ZVRvUm9vdERpcnMoaW1wb3J0ZWRGaWxlLCB0aGlzLnJvb3REaXJzKTtcblxuICAgICAgaWYgKHJvb3RlZENvbnRhaW5pbmdGaWxlICE9PSBjb250YWluaW5nRmlsZSAmJiByb290ZWRJbXBvcnRlZEZpbGUgIT09IGltcG9ydGVkRmlsZSkge1xuICAgICAgICAvLyBpZiBib3RoIGZpbGVzIGFyZSBjb250YWluZWQgaW4gdGhlIGByb290RGlyc2AsIHRoZW4gc3RyaXAgdGhlIHJvb3REaXJzXG4gICAgICAgIGNvbnRhaW5pbmdGaWxlID0gcm9vdGVkQ29udGFpbmluZ0ZpbGU7XG4gICAgICAgIGltcG9ydGVkRmlsZSA9IHJvb3RlZEltcG9ydGVkRmlsZTtcbiAgICAgIH1cbiAgICAgIG1vZHVsZU5hbWUgPSBkb3RSZWxhdGl2ZShwYXRoLmRpcm5hbWUoY29udGFpbmluZ0ZpbGUpLCBpbXBvcnRlZEZpbGUpO1xuICAgIH0gZWxzZSBpZiAoaW1wb3J0ZWRGaWxlUGFja2FnZU5hbWUpIHtcbiAgICAgIG1vZHVsZU5hbWUgPSBzdHJpcE5vZGVNb2R1bGVzUHJlZml4KGltcG9ydGVkRmlsZSk7XG4gICAgICBpZiAob3JpZ2luYWxJbXBvcnRlZEZpbGUuZW5kc1dpdGgoJy5kLnRzJykpIHtcbiAgICAgICAgLy8gdGhlIG1vZHVsZU5hbWUgZm9yIHRoZXNlIHR5cGluZ3MgY291bGQgYmUgc2hvcnRlbnRlZCB0byB0aGUgbnBtIHBhY2thZ2UgbmFtZVxuICAgICAgICAvLyBpZiB0aGUgbnBtIHBhY2thZ2UgdHlwaW5ncyBtYXRjaGVzIHRoZSBpbXBvcnRlZEZpbGVcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBtb2R1bGVQYXRoID0gaW1wb3J0ZWRGaWxlLnN1YnN0cmluZygwLCBpbXBvcnRlZEZpbGUubGVuZ3RoIC0gbW9kdWxlTmFtZS5sZW5ndGgpICtcbiAgICAgICAgICAgICAgaW1wb3J0ZWRGaWxlUGFja2FnZU5hbWU7XG4gICAgICAgICAgY29uc3QgcGFja2FnZUpzb24gPSByZXF1aXJlKG1vZHVsZVBhdGggKyAnL3BhY2thZ2UuanNvbicpO1xuICAgICAgICAgIGNvbnN0IHBhY2thZ2VUeXBpbmdzID0gcGF0aC5wb3NpeC5qb2luKG1vZHVsZVBhdGgsIHBhY2thZ2VKc29uLnR5cGluZ3MpO1xuICAgICAgICAgIGlmIChwYWNrYWdlVHlwaW5ncyA9PT0gb3JpZ2luYWxJbXBvcnRlZEZpbGUpIHtcbiAgICAgICAgICAgIG1vZHVsZU5hbWUgPSBpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyB0aGUgYWJvdmUgcmVxdWlyZSgpIHdpbGwgdGhyb3cgaWYgdGhlcmUgaXMgbm8gcGFja2FnZS5qc29uIGZpbGVcbiAgICAgICAgICAvLyBhbmQgdGhpcyBpcyBzYWZlIHRvIGlnbm9yZSBhbmQgY29ycmVjdCB0byBrZWVwIHRoZSBsb25nZXJcbiAgICAgICAgICAvLyBtb2R1bGVOYW1lIGluIHRoaXMgY2FzZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVHJ5aW5nIHRvIGltcG9ydCBhIHNvdXJjZSBmaWxlIGZyb20gYSBub2RlX21vZHVsZXMgcGFja2FnZTogaW1wb3J0ICR7b3JpZ2luYWxJbXBvcnRlZEZpbGV9IGZyb20gJHtjb250YWluaW5nRmlsZX1gKTtcbiAgICB9XG5cbiAgICB0aGlzLmZpbGVOYW1lVG9Nb2R1bGVOYW1lQ2FjaGUuc2V0KGNhY2hlS2V5LCBtb2R1bGVOYW1lKTtcbiAgICByZXR1cm4gbW9kdWxlTmFtZTtcbiAgfVxuXG4gIHJlc291cmNlTmFtZVRvRmlsZU5hbWUocmVzb3VyY2VOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gICAgLy8gTm90ZTogd2UgY29udmVydCBwYWNrYWdlIHBhdGhzIGludG8gcmVsYXRpdmUgcGF0aHMgdG8gYmUgY29tcGF0aWJsZSB3aXRoIHRoZSB0aGVcbiAgICAvLyBwcmV2aW91cyBpbXBsZW1lbnRhdGlvbiBvZiBVcmxSZXNvbHZlci5cbiAgICBjb25zdCBmaXJzdENoYXIgPSByZXNvdXJjZU5hbWVbMF07XG4gICAgaWYgKGZpcnN0Q2hhciA9PT0gJy8nKSB7XG4gICAgICByZXNvdXJjZU5hbWUgPSByZXNvdXJjZU5hbWUuc2xpY2UoMSk7XG4gICAgfSBlbHNlIGlmIChmaXJzdENoYXIgIT09ICcuJykge1xuICAgICAgcmVzb3VyY2VOYW1lID0gYC4vJHtyZXNvdXJjZU5hbWV9YDtcbiAgICB9XG4gICAgY29uc3QgZmlsZVBhdGhXaXRoTmdSZXNvdXJjZSA9XG4gICAgICAgIHRoaXMubW9kdWxlTmFtZVRvRmlsZU5hbWUoYWRkTmdSZXNvdXJjZVN1ZmZpeChyZXNvdXJjZU5hbWUpLCBjb250YWluaW5nRmlsZSk7XG4gICAgY29uc3QgcmVzdWx0ID0gZmlsZVBhdGhXaXRoTmdSZXNvdXJjZSA/IHN0cmlwTmdSZXNvdXJjZVN1ZmZpeChmaWxlUGF0aFdpdGhOZ1Jlc291cmNlKSA6IG51bGw7XG4gICAgLy8gVXNlZCB1bmRlciBCYXplbCB0byByZXBvcnQgbW9yZSBzcGVjaWZpYyBlcnJvciB3aXRoIHJlbWVkaWF0aW9uIGFkdmljZVxuICAgIGlmICghcmVzdWx0ICYmICh0aGlzLmNvbnRleHQgYXMgYW55KS5yZXBvcnRNaXNzaW5nUmVzb3VyY2UpIHtcbiAgICAgICh0aGlzLmNvbnRleHQgYXMgYW55KS5yZXBvcnRNaXNzaW5nUmVzb3VyY2UocmVzb3VyY2VOYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHRvU3VtbWFyeUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcsIHJlZmVycmluZ1NyY0ZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmZpbGVOYW1lVG9Nb2R1bGVOYW1lKGZpbGVOYW1lLCByZWZlcnJpbmdTcmNGaWxlTmFtZSk7XG4gIH1cblxuICBmcm9tU3VtbWFyeUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcsIHJlZmVycmluZ0xpYkZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5tb2R1bGVOYW1lVG9GaWxlTmFtZShmaWxlTmFtZSwgcmVmZXJyaW5nTGliRmlsZU5hbWUpO1xuICAgIGlmICghcmVzb2x2ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgJHtmaWxlTmFtZX0gZnJvbSAke3JlZmVycmluZ0xpYkZpbGVOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gIH1cblxuICBwYXJzZVNvdXJjZVNwYW5PZihmaWxlTmFtZTogc3RyaW5nLCBsaW5lOiBudW1iZXIsIGNoYXJhY3RlcjogbnVtYmVyKTogUGFyc2VTb3VyY2VTcGFufG51bGwge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdlbmVyYXRlZFNvdXJjZUZpbGVzLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKGRhdGEgJiYgZGF0YS5lbWl0Q3R4KSB7XG4gICAgICByZXR1cm4gZGF0YS5lbWl0Q3R4LnNwYW5PZihsaW5lLCBjaGFyYWN0ZXIpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0T3JpZ2luYWxTb3VyY2VGaWxlKFxuICAgICAgZmlsZVBhdGg6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uPzogdHMuU2NyaXB0VGFyZ2V0LFxuICAgICAgb25FcnJvcj86ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQpOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICAgIC8vIE5vdGU6IHdlIG5lZWQgdGhlIGV4cGxpY2l0IGNoZWNrIHZpYSBgaGFzYCBhcyB3ZSBhbHNvIGNhY2hlIHJlc3VsdHNcbiAgICAvLyB0aGF0IHdlcmUgbnVsbCAvIHVuZGVmaW5lZC5cbiAgICBpZiAodGhpcy5vcmlnaW5hbFNvdXJjZUZpbGVzLmhhcyhmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiB0aGlzLm9yaWdpbmFsU291cmNlRmlsZXMuZ2V0KGZpbGVQYXRoKSAhO1xuICAgIH1cbiAgICBpZiAoIWxhbmd1YWdlVmVyc2lvbikge1xuICAgICAgbGFuZ3VhZ2VWZXJzaW9uID0gdGhpcy5vcHRpb25zLnRhcmdldCB8fCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0O1xuICAgIH1cbiAgICAvLyBOb3RlOiBUaGlzIGNhbiBhbHNvIHJldHVybiB1bmRlZmluZWQsXG4gICAgLy8gYXMgdGhlIFRTIHR5cGluZ3MgYXJlIG5vdCBjb3JyZWN0IVxuICAgIGNvbnN0IHNmID0gdGhpcy5jb250ZXh0LmdldFNvdXJjZUZpbGUoZmlsZVBhdGgsIGxhbmd1YWdlVmVyc2lvbiwgb25FcnJvcikgfHwgbnVsbDtcbiAgICB0aGlzLm9yaWdpbmFsU291cmNlRmlsZXMuc2V0KGZpbGVQYXRoLCBzZik7XG4gICAgcmV0dXJuIHNmO1xuICB9XG5cbiAgdXBkYXRlR2VuZXJhdGVkRmlsZShnZW5GaWxlOiBHZW5lcmF0ZWRGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gICAgaWYgKCFnZW5GaWxlLnN0bXRzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEludmFsaWQgQXJndW1lbnQ6IEV4cGVjdGVkIGEgR2VuZXJhdGVGaWxlIHdpdGggc3RhdGVtZW50cy4gJHtnZW5GaWxlLmdlbkZpbGVVcmx9YCk7XG4gICAgfVxuICAgIGNvbnN0IG9sZEdlbkZpbGUgPSB0aGlzLmdlbmVyYXRlZFNvdXJjZUZpbGVzLmdldChnZW5GaWxlLmdlbkZpbGVVcmwpO1xuICAgIGlmICghb2xkR2VuRmlsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbGxlZ2FsIFN0YXRlOiBwcmV2aW91cyBHZW5lcmF0ZWRGaWxlIG5vdCBmb3VuZCBmb3IgJHtnZW5GaWxlLmdlbkZpbGVVcmx9LmApO1xuICAgIH1cbiAgICBjb25zdCBuZXdSZWZzID0gZ2VuRmlsZUV4dGVybmFsUmVmZXJlbmNlcyhnZW5GaWxlKTtcbiAgICBjb25zdCBvbGRSZWZzID0gb2xkR2VuRmlsZS5leHRlcm5hbFJlZmVyZW5jZXM7XG4gICAgbGV0IHJlZnNBcmVFcXVhbCA9IG9sZFJlZnMuc2l6ZSA9PT0gbmV3UmVmcy5zaXplO1xuICAgIGlmIChyZWZzQXJlRXF1YWwpIHtcbiAgICAgIG5ld1JlZnMuZm9yRWFjaChyID0+IHJlZnNBcmVFcXVhbCA9IHJlZnNBcmVFcXVhbCAmJiBvbGRSZWZzLmhhcyhyKSk7XG4gICAgfVxuICAgIGlmICghcmVmc0FyZUVxdWFsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYElsbGVnYWwgU3RhdGU6IGV4dGVybmFsIHJlZmVyZW5jZXMgY2hhbmdlZCBpbiAke2dlbkZpbGUuZ2VuRmlsZVVybH0uXFxuT2xkOiAke0FycmF5LmZyb20ob2xkUmVmcyl9Llxcbk5ldzogJHtBcnJheS5mcm9tKG5ld1JlZnMpfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hZGRHZW5lcmF0ZWRGaWxlKGdlbkZpbGUsIG5ld1JlZnMpO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRHZW5lcmF0ZWRGaWxlKGdlbkZpbGU6IEdlbmVyYXRlZEZpbGUsIGV4dGVybmFsUmVmZXJlbmNlczogU2V0PHN0cmluZz4pOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICBpZiAoIWdlbkZpbGUuc3RtdHMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgSW52YWxpZCBBcmd1bWVudDogRXhwZWN0ZWQgYSBHZW5lcmF0ZUZpbGUgd2l0aCBzdGF0ZW1lbnRzLiAke2dlbkZpbGUuZ2VuRmlsZVVybH1gKTtcbiAgICB9XG4gICAgY29uc3Qge3NvdXJjZVRleHQsIGNvbnRleHR9ID0gdGhpcy5lbWl0dGVyLmVtaXRTdGF0ZW1lbnRzQW5kQ29udGV4dChcbiAgICAgICAgZ2VuRmlsZS5nZW5GaWxlVXJsLCBnZW5GaWxlLnN0bXRzLCAvKiBwcmVhbWJsZSAqLyAnJyxcbiAgICAgICAgLyogZW1pdFNvdXJjZU1hcHMgKi8gZmFsc2UpO1xuICAgIGNvbnN0IHNmID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgZ2VuRmlsZS5nZW5GaWxlVXJsLCBzb3VyY2VUZXh0LCB0aGlzLm9wdGlvbnMudGFyZ2V0IHx8IHRzLlNjcmlwdFRhcmdldC5MYXRlc3QpO1xuICAgIGlmICgodGhpcy5vcHRpb25zLm1vZHVsZSA9PT0gdHMuTW9kdWxlS2luZC5BTUQgfHwgdGhpcy5vcHRpb25zLm1vZHVsZSA9PT0gdHMuTW9kdWxlS2luZC5VTUQpICYmXG4gICAgICAgIHRoaXMuY29udGV4dC5hbWRNb2R1bGVOYW1lKSB7XG4gICAgICBjb25zdCBtb2R1bGVOYW1lID0gdGhpcy5jb250ZXh0LmFtZE1vZHVsZU5hbWUoc2YpO1xuICAgICAgaWYgKG1vZHVsZU5hbWUpIHNmLm1vZHVsZU5hbWUgPSBtb2R1bGVOYW1lO1xuICAgIH1cbiAgICB0aGlzLmdlbmVyYXRlZFNvdXJjZUZpbGVzLnNldChnZW5GaWxlLmdlbkZpbGVVcmwsIHtcbiAgICAgIHNvdXJjZUZpbGU6IHNmLFxuICAgICAgZW1pdEN0eDogY29udGV4dCwgZXh0ZXJuYWxSZWZlcmVuY2VzLFxuICAgIH0pO1xuICAgIHJldHVybiBzZjtcbiAgfVxuXG4gIHNob3VsZEdlbmVyYXRlRmlsZShmaWxlTmFtZTogc3RyaW5nKToge2dlbmVyYXRlOiBib29sZWFuLCBiYXNlRmlsZU5hbWU/OiBzdHJpbmd9IHtcbiAgICAvLyBUT0RPKHRib3NjaCk6IGFsbG93IGdlbmVyYXRpbmcgZmlsZXMgdGhhdCBhcmUgbm90IGluIHRoZSByb290RGlyXG4gICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzE5MzM3XG4gICAgaWYgKCFpc0luUm9vdERpcihmaWxlTmFtZSwgdGhpcy5vcHRpb25zKSkge1xuICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgIH1cbiAgICBjb25zdCBnZW5NYXRjaCA9IEdFTkVSQVRFRF9GSUxFUy5leGVjKGZpbGVOYW1lKTtcbiAgICBpZiAoIWdlbk1hdGNoKSB7XG4gICAgICByZXR1cm4ge2dlbmVyYXRlOiBmYWxzZX07XG4gICAgfVxuICAgIGNvbnN0IFssIGJhc2UsIGdlblN1ZmZpeCwgc3VmZml4XSA9IGdlbk1hdGNoO1xuICAgIGlmIChzdWZmaXggIT09ICd0cycgJiYgc3VmZml4ICE9PSAndHN4Jykge1xuICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgIH1cbiAgICBsZXQgYmFzZUZpbGVOYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICAgIGlmIChnZW5TdWZmaXguaW5kZXhPZignbmdzdHlsZScpID49IDApIHtcbiAgICAgIC8vIE5vdGU6IG5nc3R5bGUgZmlsZXMgaGF2ZSBuYW1lcyBsaWtlIGBhZmlsZS5jc3MubmdzdHlsZS50c2BcbiAgICAgIGlmICghdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMoYmFzZSkpIHtcbiAgICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb3RlOiBvbi10aGUtZmx5IGdlbmVyYXRlZCBmaWxlcyBhbHdheXMgaGF2ZSBhIGAudHNgIHN1ZmZpeCxcbiAgICAgIC8vIGJ1dCB0aGUgZmlsZSBmcm9tIHdoaWNoIHdlIGdlbmVyYXRlZCBpdCBjYW4gYmUgYSBgLnRzYC8gYC50c3hgLyBgLmQudHNgXG4gICAgICAvLyAoc2VlIG9wdGlvbnMuZ2VuZXJhdGVDb2RlRm9yTGlicmFyaWVzKS5cbiAgICAgIGJhc2VGaWxlTmFtZSA9IFtgJHtiYXNlfS50c2AsIGAke2Jhc2V9LnRzeGAsIGAke2Jhc2V9LmQudHNgXS5maW5kKFxuICAgICAgICAgIGJhc2VGaWxlTmFtZSA9PiB0aGlzLmlzU291cmNlRmlsZShiYXNlRmlsZU5hbWUpICYmIHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGJhc2VGaWxlTmFtZSkpO1xuICAgICAgaWYgKCFiYXNlRmlsZU5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge2dlbmVyYXRlOiB0cnVlLCBiYXNlRmlsZU5hbWV9O1xuICB9XG5cbiAgc2hvdWxkR2VuZXJhdGVGaWxlc0ZvcihmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgLy8gVE9ETyh0Ym9zY2gpOiBhbGxvdyBnZW5lcmF0aW5nIGZpbGVzIHRoYXQgYXJlIG5vdCBpbiB0aGUgcm9vdERpclxuICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy8xOTMzN1xuICAgIHJldHVybiAhR0VORVJBVEVEX0ZJTEVTLnRlc3QoZmlsZU5hbWUpICYmIHRoaXMuaXNTb3VyY2VGaWxlKGZpbGVOYW1lKSAmJlxuICAgICAgICBpc0luUm9vdERpcihmaWxlTmFtZSwgdGhpcy5vcHRpb25zKTtcbiAgfVxuXG4gIGdldFNvdXJjZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCxcbiAgICAgIG9uRXJyb3I/OiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkKTogdHMuU291cmNlRmlsZSB7XG4gICAgLy8gTm90ZTogRG9uJ3QgZXhpdCBlYXJseSBpbiB0aGlzIG1ldGhvZCB0byBtYWtlIHN1cmVcbiAgICAvLyB3ZSBhbHdheXMgaGF2ZSB1cCB0byBkYXRlIHJlZmVyZW5jZXMgb24gdGhlIGZpbGUhXG4gICAgbGV0IGdlbkZpbGVOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgc2YgPSB0aGlzLmdldEdlbmVyYXRlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGlmICghc2YpIHtcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLmxpYnJhcnlTdW1tYXJpZXMuZ2V0KGZpbGVOYW1lKTtcbiAgICAgIGlmIChzdW1tYXJ5KSB7XG4gICAgICAgIGlmICghc3VtbWFyeS5zb3VyY2VGaWxlKSB7XG4gICAgICAgICAgc3VtbWFyeS5zb3VyY2VGaWxlID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgICAgICAgZmlsZU5hbWUsIHN1bW1hcnkudGV4dCwgdGhpcy5vcHRpb25zLnRhcmdldCB8fCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0KTtcbiAgICAgICAgfVxuICAgICAgICBzZiA9IHN1bW1hcnkuc291cmNlRmlsZTtcbiAgICAgICAgZ2VuRmlsZU5hbWVzID0gW107XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghc2YpIHtcbiAgICAgIHNmID0gdGhpcy5nZXRPcmlnaW5hbFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgY29uc3QgY2FjaGVkR2VuRmlsZXMgPSB0aGlzLmdlbmVyYXRlZENvZGVGb3IuZ2V0KGZpbGVOYW1lKTtcbiAgICAgIGlmIChjYWNoZWRHZW5GaWxlcykge1xuICAgICAgICBnZW5GaWxlTmFtZXMgPSBjYWNoZWRHZW5GaWxlcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLm5vUmVzb2x2ZSAmJiB0aGlzLnNob3VsZEdlbmVyYXRlRmlsZXNGb3IoZmlsZU5hbWUpKSB7XG4gICAgICAgICAgZ2VuRmlsZU5hbWVzID0gdGhpcy5jb2RlR2VuZXJhdG9yLmZpbmRHZW5lcmF0ZWRGaWxlTmFtZXMoZmlsZU5hbWUpLmZpbHRlcihcbiAgICAgICAgICAgICAgZmlsZU5hbWUgPT4gdGhpcy5zaG91bGRHZW5lcmF0ZUZpbGUoZmlsZU5hbWUpLmdlbmVyYXRlKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmdlbmVyYXRlZENvZGVGb3Iuc2V0KGZpbGVOYW1lLCBnZW5GaWxlTmFtZXMpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2YpIHtcbiAgICAgIGFkZFJlZmVyZW5jZXNUb1NvdXJjZUZpbGUoc2YsIGdlbkZpbGVOYW1lcyk7XG4gICAgfVxuICAgIC8vIFRPRE8odGJvc2NoKTogVHlwZVNjcmlwdCdzIHR5cGluZ3MgZm9yIGdldFNvdXJjZUZpbGUgYXJlIGluY29ycmVjdCxcbiAgICAvLyBhcyBpdCBjYW4gdmVyeSB3ZWxsIHJldHVybiB1bmRlZmluZWQuXG4gICAgcmV0dXJuIHNmICE7XG4gIH1cblxuICBwcml2YXRlIGdldEdlbmVyYXRlZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgY29uc3QgZ2VuU3JjRmlsZSA9IHRoaXMuZ2VuZXJhdGVkU291cmNlRmlsZXMuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoZ2VuU3JjRmlsZSkge1xuICAgICAgcmV0dXJuIGdlblNyY0ZpbGUuc291cmNlRmlsZTtcbiAgICB9XG4gICAgY29uc3Qge2dlbmVyYXRlLCBiYXNlRmlsZU5hbWV9ID0gdGhpcy5zaG91bGRHZW5lcmF0ZUZpbGUoZmlsZU5hbWUpO1xuICAgIGlmIChnZW5lcmF0ZSkge1xuICAgICAgY29uc3QgZ2VuRmlsZSA9IHRoaXMuY29kZUdlbmVyYXRvci5nZW5lcmF0ZUZpbGUoZmlsZU5hbWUsIGJhc2VGaWxlTmFtZSk7XG4gICAgICByZXR1cm4gdGhpcy5hZGRHZW5lcmF0ZWRGaWxlKGdlbkZpbGUsIGdlbkZpbGVFeHRlcm5hbFJlZmVyZW5jZXMoZ2VuRmlsZSkpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgb3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBsZXQgZmlsZUV4aXN0cyA9IHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzQ2FjaGUuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoZmlsZUV4aXN0cyA9PSBudWxsKSB7XG4gICAgICBmaWxlRXhpc3RzID0gdGhpcy5jb250ZXh0LmZpbGVFeGlzdHMoZmlsZU5hbWUpO1xuICAgICAgdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHNDYWNoZS5zZXQoZmlsZU5hbWUsIGZpbGVFeGlzdHMpO1xuICAgIH1cbiAgICByZXR1cm4gZmlsZUV4aXN0cztcbiAgfVxuXG4gIGZpbGVFeGlzdHMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGZpbGVOYW1lID0gc3RyaXBOZ1Jlc291cmNlU3VmZml4KGZpbGVOYW1lKTtcbiAgICBpZiAodGhpcy5saWJyYXJ5U3VtbWFyaWVzLmhhcyhmaWxlTmFtZSkgfHwgdGhpcy5nZW5lcmF0ZWRTb3VyY2VGaWxlcy5oYXMoZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc2hvdWxkR2VuZXJhdGVGaWxlKGZpbGVOYW1lKS5nZW5lcmF0ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhmaWxlTmFtZSk7XG4gIH1cblxuICBsb2FkU3VtbWFyeShmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLmxpYnJhcnlTdW1tYXJpZXMuZ2V0KGZpbGVQYXRoKTtcbiAgICBpZiAoc3VtbWFyeSkge1xuICAgICAgcmV0dXJuIHN1bW1hcnkudGV4dDtcbiAgICB9XG4gICAgaWYgKHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZVBhdGgpKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpc1NvdXJjZUZpbGUoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIERvbid0IGdlbmVyYXRlIGFueSBmaWxlcyBub3IgdHlwZWNoZWNrIHRoZW1cbiAgICAvLyBpZiBza2lwVGVtcGxhdGVDb2RlZ2VuIGlzIHNldCBhbmQgZnVsbFRlbXBsYXRlVHlwZUNoZWNrIGlzIG5vdCB5ZXQgc2V0LFxuICAgIC8vIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAgICBpZiAodGhpcy5vcHRpb25zLnNraXBUZW1wbGF0ZUNvZGVnZW4gJiYgIXRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSWYgd2UgaGF2ZSBhIHN1bW1hcnkgZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uLFxuICAgIC8vIHRyZWF0IHRoZSBmaWxlIG5ldmVyIGFzIGEgc291cmNlIGZpbGUuXG4gICAgaWYgKHRoaXMubGlicmFyeVN1bW1hcmllcy5oYXMoZmlsZVBhdGgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChHRU5FUkFURURfRklMRVMudGVzdChmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5nZW5lcmF0ZUNvZGVGb3JMaWJyYXJpZXMgPT09IGZhbHNlICYmIERUUy50ZXN0KGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoRFRTLnRlc3QoZmlsZVBhdGgpKSB7XG4gICAgICAvLyBDaGVjayBmb3IgYSBidW5kbGUgaW5kZXguXG4gICAgICBpZiAodGhpcy5oYXNCdW5kbGVJbmRleChmaWxlUGF0aCkpIHtcbiAgICAgICAgY29uc3Qgbm9ybWFsRmlsZVBhdGggPSBwYXRoLm5vcm1hbGl6ZShmaWxlUGF0aCk7XG4gICAgICAgIHJldHVybiB0aGlzLmZsYXRNb2R1bGVJbmRleE5hbWVzLmhhcyhub3JtYWxGaWxlUGF0aCkgfHxcbiAgICAgICAgICAgIHRoaXMuZmxhdE1vZHVsZUluZGV4UmVkaXJlY3ROYW1lcy5oYXMobm9ybWFsRmlsZVBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJlYWRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdW1tYXJ5ID0gdGhpcy5saWJyYXJ5U3VtbWFyaWVzLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKHN1bW1hcnkpIHtcbiAgICAgIHJldHVybiBzdW1tYXJ5LnRleHQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0TWV0YWRhdGFGb3IoZmlsZVBhdGg6IHN0cmluZyk6IE1vZHVsZU1ldGFkYXRhW118dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gcmVhZE1ldGFkYXRhKGZpbGVQYXRoLCB0aGlzLm1ldGFkYXRhUmVhZGVySG9zdCwgdGhpcy5tZXRhZGF0YVJlYWRlckNhY2hlKTtcbiAgfVxuXG4gIGxvYWRSZXNvdXJjZShmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+fHN0cmluZyB7XG4gICAgaWYgKHRoaXMuY29udGV4dC5yZWFkUmVzb3VyY2UpIHJldHVybiB0aGlzLmNvbnRleHQucmVhZFJlc291cmNlKGZpbGVQYXRoKTtcbiAgICBpZiAoIXRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVQYXRoKSkge1xuICAgICAgdGhyb3cgc3ludGF4RXJyb3IoYEVycm9yOiBSZXNvdXJjZSBmaWxlIG5vdCBmb3VuZDogJHtmaWxlUGF0aH1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZVBhdGgpKTtcbiAgfVxuXG4gIGdldE91dHB1dE5hbWUoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHBhdGgucmVsYXRpdmUodGhpcy5nZXRDdXJyZW50RGlyZWN0b3J5KCksIGZpbGVQYXRoKTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzQnVuZGxlSW5kZXgoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGNoZWNrQnVuZGxlSW5kZXggPSAoZGlyZWN0b3J5OiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICAgIGxldCByZXN1bHQgPSB0aGlzLmZsYXRNb2R1bGVJbmRleENhY2hlLmdldChkaXJlY3RvcnkpO1xuICAgICAgaWYgKHJlc3VsdCA9PSBudWxsKSB7XG4gICAgICAgIGlmIChwYXRoLmJhc2VuYW1lKGRpcmVjdG9yeSkgPT0gJ25vZGVfbW9kdWxlJykge1xuICAgICAgICAgIC8vIERvbid0IGxvb2sgb3V0c2lkZSB0aGUgbm9kZV9tb2R1bGVzIHRoaXMgcGFja2FnZSBpcyBpbnN0YWxsZWQgaW4uXG4gICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gQSBidW5kbGUgaW5kZXggZXhpc3RzIGlmIHRoZSB0eXBpbmdzIC5kLnRzIGZpbGUgaGFzIGEgbWV0YWRhdGEuanNvbiB0aGF0IGhhcyBhblxuICAgICAgICAgIC8vIGltcG9ydEFzLlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwYWNrYWdlRmlsZSA9IHBhdGguam9pbihkaXJlY3RvcnksICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgICAgIGlmICh0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhwYWNrYWdlRmlsZSkpIHtcbiAgICAgICAgICAgICAgLy8gT25jZSB3ZSBzZWUgYSBwYWNrYWdlLmpzb24gZmlsZSwgYXNzdW1lIGZhbHNlIHVudGlsIGl0IHdlIGZpbmQgdGhlIGJ1bmRsZSBpbmRleC5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VDb250ZW50OiBhbnkgPSBKU09OLnBhcnNlKGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUocGFja2FnZUZpbGUpKSk7XG4gICAgICAgICAgICAgIGlmIChwYWNrYWdlQ29udGVudC50eXBpbmdzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHlwaW5ncyA9IHBhdGgubm9ybWFsaXplKHBhdGguam9pbihkaXJlY3RvcnksIHBhY2thZ2VDb250ZW50LnR5cGluZ3MpKTtcbiAgICAgICAgICAgICAgICBpZiAoRFRTLnRlc3QodHlwaW5ncykpIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGFkYXRhRmlsZSA9IHR5cGluZ3MucmVwbGFjZShEVFMsICcubWV0YWRhdGEuanNvbicpO1xuICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKG1ldGFkYXRhRmlsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWV0YWRhdGEgPSBKU09OLnBhcnNlKGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUobWV0YWRhdGFGaWxlKSkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWV0YWRhdGEuZmxhdE1vZHVsZUluZGV4UmVkaXJlY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZsYXRNb2R1bGVJbmRleFJlZGlyZWN0TmFtZXMuYWRkKHR5cGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgIC8vIE5vdGU6IGRvbid0IHNldCByZXN1bHQgPSB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIC8vIGFzIHRoaXMgd291bGQgbWFyayB0aGlzIGZvbGRlclxuICAgICAgICAgICAgICAgICAgICAgIC8vIGFzIGhhdmluZyBhIGJ1bmRsZUluZGV4IHRvbyBlYXJseSB3aXRob3V0XG4gICAgICAgICAgICAgICAgICAgICAgLy8gZmlsbGluZyB0aGUgYnVuZGxlSW5kZXhOYW1lcy5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZXRhZGF0YS5pbXBvcnRBcykge1xuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmxhdE1vZHVsZUluZGV4TmFtZXMuYWRkKHR5cGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHBhdGguZGlybmFtZShkaXJlY3RvcnkpO1xuICAgICAgICAgICAgICBpZiAocGFyZW50ICE9IGRpcmVjdG9yeSkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSB0aGUgcGFyZW50IGRpcmVjdG9yeS5cbiAgICAgICAgICAgICAgICByZXN1bHQgPSBjaGVja0J1bmRsZUluZGV4KHBhcmVudCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSBlbmNvdW50ZXIgYW55IGVycm9ycyBhc3N1bWUgd2UgdGhpcyBpc24ndCBhIGJ1bmRsZSBpbmRleC5cbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZsYXRNb2R1bGVJbmRleENhY2hlLnNldChkaXJlY3RvcnksIHJlc3VsdCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICByZXR1cm4gY2hlY2tCdW5kbGVJbmRleChwYXRoLmRpcm5hbWUoZmlsZVBhdGgpKTtcbiAgfVxuXG4gIGdldERlZmF1bHRMaWJGaWxlTmFtZSA9IChvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpID0+XG4gICAgICB0aGlzLmNvbnRleHQuZ2V0RGVmYXVsdExpYkZpbGVOYW1lKG9wdGlvbnMpXG4gIGdldEN1cnJlbnREaXJlY3RvcnkgPSAoKSA9PiB0aGlzLmNvbnRleHQuZ2V0Q3VycmVudERpcmVjdG9yeSgpO1xuICBnZXRDYW5vbmljYWxGaWxlTmFtZSA9IChmaWxlTmFtZTogc3RyaW5nKSA9PiB0aGlzLmNvbnRleHQuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpO1xuICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzID0gKCkgPT4gdGhpcy5jb250ZXh0LnVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTtcbiAgZ2V0TmV3TGluZSA9ICgpID0+IHRoaXMuY29udGV4dC5nZXROZXdMaW5lKCk7XG4gIC8vIE1ha2Ugc3VyZSB3ZSBkbyBub3QgYGhvc3QucmVhbHBhdGgoKWAgZnJvbSBUUyBhcyB3ZSBkbyBub3Qgd2FudCB0byByZXNvbHZlIHN5bWxpbmtzLlxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzk1NTJcbiAgcmVhbFBhdGggPSAocDogc3RyaW5nKSA9PiBwO1xuICB3cml0ZUZpbGUgPSB0aGlzLmNvbnRleHQud3JpdGVGaWxlLmJpbmQodGhpcy5jb250ZXh0KTtcbn1cblxuZnVuY3Rpb24gZ2VuRmlsZUV4dGVybmFsUmVmZXJlbmNlcyhnZW5GaWxlOiBHZW5lcmF0ZWRGaWxlKTogU2V0PHN0cmluZz4ge1xuICByZXR1cm4gbmV3IFNldChjb2xsZWN0RXh0ZXJuYWxSZWZlcmVuY2VzKGdlbkZpbGUuc3RtdHMgISkubWFwKGVyID0+IGVyLm1vZHVsZU5hbWUgISkpO1xufVxuXG5mdW5jdGlvbiBhZGRSZWZlcmVuY2VzVG9Tb3VyY2VGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlLCBnZW5GaWxlTmFtZXM6IHN0cmluZ1tdKSB7XG4gIC8vIE5vdGU6IGFzIHdlIG1vZGlmeSB0cy5Tb3VyY2VGaWxlcyB3ZSBuZWVkIHRvIGtlZXAgdGhlIG9yaWdpbmFsXG4gIC8vIHZhbHVlIGZvciBgcmVmZXJlbmNlZEZpbGVzYCBhcm91bmQgaW4gY2FjaGUgdGhlIG9yaWdpbmFsIGhvc3QgaXMgY2FjaGluZyB0cy5Tb3VyY2VGaWxlcy5cbiAgLy8gTm90ZTogY2xvbmluZyB0aGUgdHMuU291cmNlRmlsZSBpcyBleHBlbnNpdmUgYXMgdGhlIG5vZGVzIGluIGhhdmUgcGFyZW50IHBvaW50ZXJzLFxuICAvLyBpLmUuIHdlIHdvdWxkIGFsc28gbmVlZCB0byBjbG9uZSBhbmQgYWRqdXN0IGFsbCBub2Rlcy5cbiAgbGV0IG9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzOiBSZWFkb25seUFycmF5PHRzLkZpbGVSZWZlcmVuY2U+ID1cbiAgICAgIChzZiBhcyBhbnkpLm9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzO1xuICBpZiAoIW9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzKSB7XG4gICAgb3JpZ2luYWxSZWZlcmVuY2VkRmlsZXMgPSBzZi5yZWZlcmVuY2VkRmlsZXM7XG4gICAgKHNmIGFzIGFueSkub3JpZ2luYWxSZWZlcmVuY2VkRmlsZXMgPSBvcmlnaW5hbFJlZmVyZW5jZWRGaWxlcztcbiAgfVxuICBjb25zdCBuZXdSZWZlcmVuY2VkRmlsZXMgPSBbLi4ub3JpZ2luYWxSZWZlcmVuY2VkRmlsZXNdO1xuICBnZW5GaWxlTmFtZXMuZm9yRWFjaChnZiA9PiBuZXdSZWZlcmVuY2VkRmlsZXMucHVzaCh7ZmlsZU5hbWU6IGdmLCBwb3M6IDAsIGVuZDogMH0pKTtcbiAgc2YucmVmZXJlbmNlZEZpbGVzID0gbmV3UmVmZXJlbmNlZEZpbGVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0T3JpZ2luYWxSZWZlcmVuY2VzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5GaWxlUmVmZXJlbmNlW118dW5kZWZpbmVkIHtcbiAgcmV0dXJuIHNvdXJjZUZpbGUgJiYgKHNvdXJjZUZpbGUgYXMgYW55KS5vcmlnaW5hbFJlZmVyZW5jZWRGaWxlcztcbn1cblxuZnVuY3Rpb24gZG90UmVsYXRpdmUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgclBhdGg6IHN0cmluZyA9IHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgcmV0dXJuIHJQYXRoLnN0YXJ0c1dpdGgoJy4nKSA/IHJQYXRoIDogJy4vJyArIHJQYXRoO1xufVxuXG4vKipcbiAqIE1vdmVzIHRoZSBwYXRoIGludG8gYGdlbkRpcmAgZm9sZGVyIHdoaWxlIHByZXNlcnZpbmcgdGhlIGBub2RlX21vZHVsZXNgIGRpcmVjdG9yeS5cbiAqL1xuZnVuY3Rpb24gZ2V0UGFja2FnZU5hbWUoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgY29uc3QgbWF0Y2ggPSBOT0RFX01PRFVMRVNfUEFDS0FHRV9OQU1FLmV4ZWMoZmlsZVBhdGgpO1xuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFsxXSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHN0cmlwTm9kZU1vZHVsZXNQcmVmaXgoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBmaWxlUGF0aC5yZXBsYWNlKC8uKm5vZGVfbW9kdWxlc1xcLy8sICcnKTtcbn1cblxuZnVuY3Rpb24gZ2V0Tm9kZU1vZHVsZXNQcmVmaXgoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgY29uc3QgbWF0Y2ggPSAvLipub2RlX21vZHVsZXNcXC8vLmV4ZWMoZmlsZVBhdGgpO1xuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFsxXSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHN0cmlwTmdSZXNvdXJjZVN1ZmZpeChmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGZpbGVOYW1lLnJlcGxhY2UoL1xcLlxcJG5ncmVzb3VyY2VcXCQuKi8sICcnKTtcbn1cblxuZnVuY3Rpb24gYWRkTmdSZXNvdXJjZVN1ZmZpeChmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2ZpbGVOYW1lfS4kbmdyZXNvdXJjZSRgO1xufVxuIl19