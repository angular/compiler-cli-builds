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
        define("@angular/compiler-cli/src/transformers/compiler_host", ["require", "exports", "tslib", "@angular/compiler", "path", "typescript", "@angular/compiler-cli/src/transformers/metadata_reader", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var path = require("path");
    var ts = require("typescript");
    var metadata_reader_1 = require("@angular/compiler-cli/src/transformers/metadata_reader");
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    var NODE_MODULES_PACKAGE_NAME = /node_modules\/((\w|-|\.)+|(@(\w|-|\.)+\/(\w|-|\.)+))/;
    var EXT = /(\.ts|\.d\.ts|\.js|\.jsx|\.tsx)$/;
    var CSS_PREPROCESSOR_EXT = /(\.scss|\.less|\.styl)$/;
    var augmentHostForTest = null;
    function setAugmentHostForTest(augmentation) {
        augmentHostForTest = augmentation;
    }
    exports.setAugmentHostForTest = setAugmentHostForTest;
    function createCompilerHost(_a) {
        var options = _a.options, _b = _a.tsHost, tsHost = _b === void 0 ? ts.createCompilerHost(options, true) : _b;
        var e_1, _c;
        if (augmentHostForTest !== null) {
            try {
                for (var _d = tslib_1.__values(Object.keys(augmentHostForTest)), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var name = _e.value;
                    tsHost[name] = augmentHostForTest[name];
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                }
                finally { if (e_1) throw e_1.error; }
            }
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
            this.realpath = function (p) { return p; };
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
            if (context.resolveTypeReferenceDirectives) {
                this.resolveTypeReferenceDirectives = function (names, containingFile) {
                    return context.resolveTypeReferenceDirectives(names, containingFile);
                };
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
                    catch (_a) {
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
            // If the user specified styleUrl pointing to *.scss, but the Sass compiler was run before
            // Angular, then the resource may have been generated as *.css. Simply try the resolution again.
            if (!filePathWithNgResource && CSS_PREPROCESSOR_EXT.test(resourceName)) {
                var fallbackResourceName = resourceName.replace(CSS_PREPROCESSOR_EXT, '.css');
                filePathWithNgResource =
                    this.moduleNameToFileName(addNgResourceSuffix(fallbackResourceName), containingFile);
            }
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
                        catch (_a) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXVMO0lBQ3ZMLDJCQUE2QjtJQUM3QiwrQkFBaUM7SUFNakMsMEZBQThGO0lBQzlGLG9FQUE2RTtJQUU3RSxJQUFNLHlCQUF5QixHQUFHLHNEQUFzRCxDQUFDO0lBQ3pGLElBQU0sR0FBRyxHQUFHLGtDQUFrQyxDQUFDO0lBQy9DLElBQU0sb0JBQW9CLEdBQUcseUJBQXlCLENBQUM7SUFFdkQsSUFBSSxrQkFBa0IsR0FBb0MsSUFBSSxDQUFDO0lBRS9ELFNBQWdCLHFCQUFxQixDQUFDLFlBQStDO1FBQ25GLGtCQUFrQixHQUFHLFlBQVksQ0FBQztJQUNwQyxDQUFDO0lBRkQsc0RBRUM7SUFFRCxTQUFnQixrQkFBa0IsQ0FDOUIsRUFDd0Q7WUFEdkQsb0JBQU8sRUFBRSxjQUE2QyxFQUE3QyxrRUFBNkM7O1FBRXpELElBQUksa0JBQWtCLEtBQUssSUFBSSxFQUFFOztnQkFDL0IsS0FBbUIsSUFBQSxLQUFBLGlCQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBL0MsSUFBTSxJQUFJLFdBQUE7b0JBQ1osTUFBYyxDQUFDLElBQUksQ0FBQyxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNsRDs7Ozs7Ozs7O1NBQ0Y7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBVEQsZ0RBU0M7SUFpQkQsU0FBUyxNQUFNLENBQUksU0FBK0I7UUFDaEQsSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNkLHFDQUFxQztTQUN0QztRQUNELE9BQU8sU0FBVyxDQUFDO0lBQ3JCLENBQUM7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LENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBQ3RELENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsY0FBYyxDQUFDLFFBQWdCO1FBQ3RDLElBQU0sS0FBSyxHQUFHLHlCQUF5QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2RCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDakMsQ0FBQztJQUVELFNBQVMsc0JBQXNCLENBQUMsUUFBZ0I7UUFDOUMsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxTQUFTLG9CQUFvQixDQUFDLFFBQWdCO1FBQzVDLElBQU0sS0FBSyxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoRCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDakMsQ0FBQztJQUVELFNBQVMscUJBQXFCLENBQUMsUUFBZ0I7UUFDN0MsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLFFBQWdCO1FBQzNDLE9BQVUsUUFBUSxrQkFBZSxDQUFDO0lBQ3BDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QW90Q29tcGlsZXJIb3N0LCBFbWl0dGVyVmlzaXRvckNvbnRleHQsIEV4dGVybmFsUmVmZXJlbmNlLCBHZW5lcmF0ZWRGaWxlLCBQYXJzZVNvdXJjZVNwYW4sIFR5cGVTY3JpcHRFbWl0dGVyLCBjb2xsZWN0RXh0ZXJuYWxSZWZlcmVuY2VzLCBzeW50YXhFcnJvcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1R5cGVDaGVja0hvc3R9IGZyb20gJy4uL2RpYWdub3N0aWNzL3RyYW5zbGF0ZV9kaWFnbm9zdGljcyc7XG5pbXBvcnQge01FVEFEQVRBX1ZFUlNJT04sIE1vZHVsZU1ldGFkYXRhfSBmcm9tICcuLi9tZXRhZGF0YS9pbmRleCc7XG5cbmltcG9ydCB7Q29tcGlsZXJIb3N0LCBDb21waWxlck9wdGlvbnMsIExpYnJhcnlTdW1tYXJ5fSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge01ldGFkYXRhUmVhZGVySG9zdCwgY3JlYXRlTWV0YWRhdGFSZWFkZXJDYWNoZSwgcmVhZE1ldGFkYXRhfSBmcm9tICcuL21ldGFkYXRhX3JlYWRlcic7XG5pbXBvcnQge0RUUywgR0VORVJBVEVEX0ZJTEVTLCBpc0luUm9vdERpciwgcmVsYXRpdmVUb1Jvb3REaXJzfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBOT0RFX01PRFVMRVNfUEFDS0FHRV9OQU1FID0gL25vZGVfbW9kdWxlc1xcLygoXFx3fC18XFwuKSt8KEAoXFx3fC18XFwuKStcXC8oXFx3fC18XFwuKSspKS87XG5jb25zdCBFWFQgPSAvKFxcLnRzfFxcLmRcXC50c3xcXC5qc3xcXC5qc3h8XFwudHN4KSQvO1xuY29uc3QgQ1NTX1BSRVBST0NFU1NPUl9FWFQgPSAvKFxcLnNjc3N8XFwubGVzc3xcXC5zdHlsKSQvO1xuXG5sZXQgYXVnbWVudEhvc3RGb3JUZXN0OiB7W25hbWU6IHN0cmluZ106IEZ1bmN0aW9ufXxudWxsID0gbnVsbDtcblxuZXhwb3J0IGZ1bmN0aW9uIHNldEF1Z21lbnRIb3N0Rm9yVGVzdChhdWdtZW50YXRpb246IHtbbmFtZTogc3RyaW5nXTogRnVuY3Rpb259IHwgbnVsbCk6IHZvaWQge1xuICBhdWdtZW50SG9zdEZvclRlc3QgPSBhdWdtZW50YXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDb21waWxlckhvc3QoXG4gICAge29wdGlvbnMsIHRzSG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChvcHRpb25zLCB0cnVlKX06XG4gICAgICAgIHtvcHRpb25zOiBDb21waWxlck9wdGlvbnMsIHRzSG9zdD86IHRzLkNvbXBpbGVySG9zdH0pOiBDb21waWxlckhvc3Qge1xuICBpZiAoYXVnbWVudEhvc3RGb3JUZXN0ICE9PSBudWxsKSB7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGF1Z21lbnRIb3N0Rm9yVGVzdCkpIHtcbiAgICAgICh0c0hvc3QgYXMgYW55KVtuYW1lXSA9IGF1Z21lbnRIb3N0Rm9yVGVzdFtuYW1lXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRzSG9zdDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNZXRhZGF0YVByb3ZpZGVyIHtcbiAgZ2V0TWV0YWRhdGEoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE1vZHVsZU1ldGFkYXRhfHVuZGVmaW5lZDtcbn1cblxuaW50ZXJmYWNlIEdlblNvdXJjZUZpbGUge1xuICBleHRlcm5hbFJlZmVyZW5jZXM6IFNldDxzdHJpbmc+O1xuICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlO1xuICBlbWl0Q3R4OiBFbWl0dGVyVmlzaXRvckNvbnRleHQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29kZUdlbmVyYXRvciB7XG4gIGdlbmVyYXRlRmlsZShnZW5GaWxlTmFtZTogc3RyaW5nLCBiYXNlRmlsZU5hbWU/OiBzdHJpbmcpOiBHZW5lcmF0ZWRGaWxlO1xuICBmaW5kR2VuZXJhdGVkRmlsZU5hbWVzKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmdbXTtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0PFQ+KGNvbmRpdGlvbjogVCB8IG51bGwgfCB1bmRlZmluZWQpIHtcbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICAvLyBUT0RPKGNodWNramF6KTogZG8gdGhlIHJpZ2h0IHRoaW5nXG4gIH1cbiAgcmV0dXJuIGNvbmRpdGlvbiAhO1xufVxuXG4vKipcbiAqIEltcGxlbWVudHMgdGhlIGZvbGxvd2luZyBob3N0cyBiYXNlZCBvbiBhbiBhcGkuQ29tcGlsZXJIb3N0OlxuICogLSB0cy5Db21waWxlckhvc3QgdG8gYmUgY29uc3VtZWQgYnkgYSB0cy5Qcm9ncmFtXG4gKiAtIEFvdENvbXBpbGVySG9zdCBmb3IgQGFuZ3VsYXIvY29tcGlsZXJcbiAqIC0gVHlwZUNoZWNrSG9zdCBmb3IgbWFwcGluZyB0cyBlcnJvcnMgdG8gbmcgZXJyb3JzICh2aWEgdHJhbnNsYXRlRGlhZ25vc3RpY3MpXG4gKi9cbmV4cG9ydCBjbGFzcyBUc0NvbXBpbGVyQW90Q29tcGlsZXJUeXBlQ2hlY2tIb3N0QWRhcHRlciBpbXBsZW1lbnRzIHRzLkNvbXBpbGVySG9zdCwgQW90Q29tcGlsZXJIb3N0LFxuICAgIFR5cGVDaGVja0hvc3Qge1xuICBwcml2YXRlIG1ldGFkYXRhUmVhZGVyQ2FjaGUgPSBjcmVhdGVNZXRhZGF0YVJlYWRlckNhY2hlKCk7XG4gIHByaXZhdGUgZmlsZU5hbWVUb01vZHVsZU5hbWVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIHByaXZhdGUgZmxhdE1vZHVsZUluZGV4Q2FjaGUgPSBuZXcgTWFwPHN0cmluZywgYm9vbGVhbj4oKTtcbiAgcHJpdmF0ZSBmbGF0TW9kdWxlSW5kZXhOYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBwcml2YXRlIGZsYXRNb2R1bGVJbmRleFJlZGlyZWN0TmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgcHJpdmF0ZSByb290RGlyczogc3RyaW5nW107XG4gIHByaXZhdGUgbW9kdWxlUmVzb2x1dGlvbkNhY2hlOiB0cy5Nb2R1bGVSZXNvbHV0aW9uQ2FjaGU7XG4gIHByaXZhdGUgb3JpZ2luYWxTb3VyY2VGaWxlcyA9IG5ldyBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlfG51bGw+KCk7XG4gIHByaXZhdGUgb3JpZ2luYWxGaWxlRXhpc3RzQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgYm9vbGVhbj4oKTtcbiAgcHJpdmF0ZSBnZW5lcmF0ZWRTb3VyY2VGaWxlcyA9IG5ldyBNYXA8c3RyaW5nLCBHZW5Tb3VyY2VGaWxlPigpO1xuICBwcml2YXRlIGdlbmVyYXRlZENvZGVGb3IgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7XG4gIHByaXZhdGUgZW1pdHRlciA9IG5ldyBUeXBlU2NyaXB0RW1pdHRlcigpO1xuICBwcml2YXRlIG1ldGFkYXRhUmVhZGVySG9zdDogTWV0YWRhdGFSZWFkZXJIb3N0O1xuXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBnZXRDYW5jZWxsYXRpb25Ub2tlbiAhOiAoKSA9PiB0cy5DYW5jZWxsYXRpb25Ub2tlbjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIGdldERlZmF1bHRMaWJMb2NhdGlvbiAhOiAoKSA9PiBzdHJpbmc7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICB0cmFjZSAhOiAoczogc3RyaW5nKSA9PiB2b2lkO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgZ2V0RGlyZWN0b3JpZXMgITogKHBhdGg6IHN0cmluZykgPT4gc3RyaW5nW107XG4gIHJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcz86XG4gICAgICAobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKSA9PiB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXTtcbiAgZGlyZWN0b3J5RXhpc3RzPzogKGRpcmVjdG9yeU5hbWU6IHN0cmluZykgPT4gYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm9vdEZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sIHByaXZhdGUgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBjb250ZXh0OiBDb21waWxlckhvc3QsIHByaXZhdGUgbWV0YWRhdGFQcm92aWRlcjogTWV0YWRhdGFQcm92aWRlcixcbiAgICAgIHByaXZhdGUgY29kZUdlbmVyYXRvcjogQ29kZUdlbmVyYXRvcixcbiAgICAgIHByaXZhdGUgbGlicmFyeVN1bW1hcmllcyA9IG5ldyBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4oKSkge1xuICAgIHRoaXMubW9kdWxlUmVzb2x1dGlvbkNhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKFxuICAgICAgICB0aGlzLmNvbnRleHQuZ2V0Q3VycmVudERpcmVjdG9yeSAhKCksIHRoaXMuY29udGV4dC5nZXRDYW5vbmljYWxGaWxlTmFtZS5iaW5kKHRoaXMuY29udGV4dCkpO1xuICAgIGNvbnN0IGJhc2VQYXRoID0gdGhpcy5vcHRpb25zLmJhc2VQYXRoICE7XG4gICAgdGhpcy5yb290RGlycyA9XG4gICAgICAgICh0aGlzLm9wdGlvbnMucm9vdERpcnMgfHwgW3RoaXMub3B0aW9ucy5iYXNlUGF0aCAhXSkubWFwKHAgPT4gcGF0aC5yZXNvbHZlKGJhc2VQYXRoLCBwKSk7XG4gICAgaWYgKGNvbnRleHQuZ2V0RGlyZWN0b3JpZXMpIHtcbiAgICAgIHRoaXMuZ2V0RGlyZWN0b3JpZXMgPSBwYXRoID0+IGNvbnRleHQuZ2V0RGlyZWN0b3JpZXMgIShwYXRoKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQuZGlyZWN0b3J5RXhpc3RzKSB7XG4gICAgICB0aGlzLmRpcmVjdG9yeUV4aXN0cyA9IGRpcmVjdG9yeU5hbWUgPT4gY29udGV4dC5kaXJlY3RvcnlFeGlzdHMgIShkaXJlY3RvcnlOYW1lKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQuZ2V0Q2FuY2VsbGF0aW9uVG9rZW4pIHtcbiAgICAgIHRoaXMuZ2V0Q2FuY2VsbGF0aW9uVG9rZW4gPSAoKSA9PiBjb250ZXh0LmdldENhbmNlbGxhdGlvblRva2VuICEoKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQuZ2V0RGVmYXVsdExpYkxvY2F0aW9uKSB7XG4gICAgICB0aGlzLmdldERlZmF1bHRMaWJMb2NhdGlvbiA9ICgpID0+IGNvbnRleHQuZ2V0RGVmYXVsdExpYkxvY2F0aW9uICEoKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQucmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzKSB7XG4gICAgICAvLyBCYWNrd2FyZCBjb21wYXRpYmlsaXR5IHdpdGggVHlwZVNjcmlwdCAyLjkgYW5kIG9sZGVyIHNpbmNlIHJldHVyblxuICAgICAgLy8gdHlwZSBoYXMgY2hhbmdlZCBmcm9tICh0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmUgfCB1bmRlZmluZWQpW11cbiAgICAgIC8vIHRvIHRzLlJlc29sdmVkVHlwZVJlZmVyZW5jZURpcmVjdGl2ZVtdIGluIFR5cGVzY3JpcHQgMy4wXG4gICAgICB0eXBlIHRzM1Jlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcyA9IChuYW1lczogc3RyaW5nW10sIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpID0+XG4gICAgICAgICAgdHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlW107XG4gICAgICB0aGlzLnJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcyA9IChuYW1lczogc3RyaW5nW10sIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpID0+XG4gICAgICAgICAgKGNvbnRleHQucmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzIGFzIHRzM1Jlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcykgIShcbiAgICAgICAgICAgICAgbmFtZXMsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQudHJhY2UpIHtcbiAgICAgIHRoaXMudHJhY2UgPSBzID0+IGNvbnRleHQudHJhY2UgIShzKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQuZmlsZU5hbWVUb01vZHVsZU5hbWUpIHtcbiAgICAgIHRoaXMuZmlsZU5hbWVUb01vZHVsZU5hbWUgPSBjb250ZXh0LmZpbGVOYW1lVG9Nb2R1bGVOYW1lLmJpbmQoY29udGV4dCk7XG4gICAgfVxuICAgIC8vIE5vdGU6IGRvbid0IGNvcHkgb3ZlciBjb250ZXh0Lm1vZHVsZU5hbWVUb0ZpbGVOYW1lIGFzIHdlIGZpcnN0XG4gICAgLy8gbm9ybWFsaXplIHVuZGVmaW5lZCBjb250YWluaW5nRmlsZSB0byBhIGZpbGxlZCBjb250YWluaW5nRmlsZS5cbiAgICBpZiAoY29udGV4dC5yZXNvdXJjZU5hbWVUb0ZpbGVOYW1lKSB7XG4gICAgICB0aGlzLnJlc291cmNlTmFtZVRvRmlsZU5hbWUgPSBjb250ZXh0LnJlc291cmNlTmFtZVRvRmlsZU5hbWUuYmluZChjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQudG9TdW1tYXJ5RmlsZU5hbWUpIHtcbiAgICAgIHRoaXMudG9TdW1tYXJ5RmlsZU5hbWUgPSBjb250ZXh0LnRvU3VtbWFyeUZpbGVOYW1lLmJpbmQoY29udGV4dCk7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LmZyb21TdW1tYXJ5RmlsZU5hbWUpIHtcbiAgICAgIHRoaXMuZnJvbVN1bW1hcnlGaWxlTmFtZSA9IGNvbnRleHQuZnJvbVN1bW1hcnlGaWxlTmFtZS5iaW5kKGNvbnRleHQpO1xuICAgIH1cbiAgICB0aGlzLm1ldGFkYXRhUmVhZGVySG9zdCA9IHtcbiAgICAgIGNhY2hlTWV0YWRhdGE6ICgpID0+IHRydWUsXG4gICAgICBnZXRTb3VyY2VGaWxlTWV0YWRhdGE6IChmaWxlUGF0aCkgPT4ge1xuICAgICAgICBjb25zdCBzZiA9IHRoaXMuZ2V0T3JpZ2luYWxTb3VyY2VGaWxlKGZpbGVQYXRoKTtcbiAgICAgICAgcmV0dXJuIHNmID8gdGhpcy5tZXRhZGF0YVByb3ZpZGVyLmdldE1ldGFkYXRhKHNmKSA6IHVuZGVmaW5lZDtcbiAgICAgIH0sXG4gICAgICBmaWxlRXhpc3RzOiAoZmlsZVBhdGgpID0+IHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVQYXRoKSxcbiAgICAgIHJlYWRGaWxlOiAoZmlsZVBhdGgpID0+IGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZVBhdGgpKSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlTW9kdWxlTmFtZShtb2R1bGVOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiB0cy5SZXNvbHZlZE1vZHVsZVxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgcm0gPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShcbiAgICAgICAgICAgICAgICAgICAgIG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKSwgdGhpcy5vcHRpb25zLCB0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2R1bGVSZXNvbHV0aW9uQ2FjaGUpXG4gICAgICAgICAgICAgICAgICAgLnJlc29sdmVkTW9kdWxlO1xuICAgIGlmIChybSAmJiB0aGlzLmlzU291cmNlRmlsZShybS5yZXNvbHZlZEZpbGVOYW1lKSAmJiBEVFMudGVzdChybS5yZXNvbHZlZEZpbGVOYW1lKSkge1xuICAgICAgLy8gQ2FzZTogZ2VuZXJhdGVDb2RlRm9yTGlicmFyaWVzID0gdHJ1ZSBhbmQgbW9kdWxlTmFtZSBpc1xuICAgICAgLy8gYSAuZC50cyBmaWxlIGluIGEgbm9kZV9tb2R1bGVzIGZvbGRlci5cbiAgICAgIC8vIE5lZWQgdG8gc2V0IGlzRXh0ZXJuYWxMaWJyYXJ5SW1wb3J0IHRvIGZhbHNlIHNvIHRoYXQgZ2VuZXJhdGVkIGZpbGVzIGZvciB0aGF0IGZpbGVcbiAgICAgIC8vIGFyZSBlbWl0dGVkLlxuICAgICAgcm0uaXNFeHRlcm5hbExpYnJhcnlJbXBvcnQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHJtO1xuICB9XG5cbiAgLy8gTm90ZTogV2UgaW1wbGVtZW50IHRoaXMgbWV0aG9kIHNvIHRoYXQgVHlwZVNjcmlwdCBhbmQgQW5ndWxhciBzaGFyZSB0aGUgc2FtZVxuICAvLyB0cy5Nb2R1bGVSZXNvbHV0aW9uQ2FjaGVcbiAgLy8gYW5kIHRoYXQgd2UgY2FuIHRlbGwgdHMuUHJvZ3JhbSBhYm91dCBvdXIgZGlmZmVyZW50IG9waW5pb24gYWJvdXRcbiAgLy8gUmVzb2x2ZWRNb2R1bGUuaXNFeHRlcm5hbExpYnJhcnlJbXBvcnRcbiAgLy8gKHNlZSBvdXIgaXNTb3VyY2VGaWxlIG1ldGhvZCkuXG4gIHJlc29sdmVNb2R1bGVOYW1lcyhtb2R1bGVOYW1lczogc3RyaW5nW10sIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiB0cy5SZXNvbHZlZE1vZHVsZVtdIHtcbiAgICAvLyBUT0RPKHRib3NjaCk6IHRoaXMgc2VlbXMgdG8gYmUgYSB0eXBpbmcgZXJyb3IgaW4gVHlwZVNjcmlwdCxcbiAgICAvLyBhcyBpdCBjb250YWlucyBhc3NlcnRpb25zIHRoYXQgdGhlIHJlc3VsdCBjb250YWlucyB0aGUgc2FtZSBudW1iZXIgb2YgZW50cmllc1xuICAgIC8vIGFzIHRoZSBnaXZlbiBtb2R1bGUgbmFtZXMuXG4gICAgcmV0dXJuIDx0cy5SZXNvbHZlZE1vZHVsZVtdPm1vZHVsZU5hbWVzLm1hcChcbiAgICAgICAgbW9kdWxlTmFtZSA9PiB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlKSk7XG4gIH1cblxuICBtb2R1bGVOYW1lVG9GaWxlTmFtZShtOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlPzogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICAgIGlmICghY29udGFpbmluZ0ZpbGUpIHtcbiAgICAgIGlmIChtLmluZGV4T2YoJy4nKSA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Jlc29sdXRpb24gb2YgcmVsYXRpdmUgcGF0aHMgcmVxdWlyZXMgYSBjb250YWluaW5nIGZpbGUuJyk7XG4gICAgICB9XG4gICAgICAvLyBBbnkgY29udGFpbmluZyBmaWxlIGdpdmVzIHRoZSBzYW1lIHJlc3VsdCBmb3IgYWJzb2x1dGUgaW1wb3J0c1xuICAgICAgY29udGFpbmluZ0ZpbGUgPSB0aGlzLnJvb3RGaWxlc1swXTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY29udGV4dC5tb2R1bGVOYW1lVG9GaWxlTmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5tb2R1bGVOYW1lVG9GaWxlTmFtZShtLCBjb250YWluaW5nRmlsZSk7XG4gICAgfVxuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlTW9kdWxlTmFtZShtLCBjb250YWluaW5nRmlsZSk7XG4gICAgcmV0dXJuIHJlc29sdmVkID8gcmVzb2x2ZWQucmVzb2x2ZWRGaWxlTmFtZSA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogV2Ugd2FudCBhIG1vZHVsZUlkIHRoYXQgd2lsbCBhcHBlYXIgaW4gaW1wb3J0IHN0YXRlbWVudHMgaW4gdGhlIGdlbmVyYXRlZCBjb2RlXG4gICAqIHdoaWNoIHdpbGwgYmUgd3JpdHRlbiB0byBgY29udGFpbmluZ0ZpbGVgLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgd2UgYWxzbyBnZW5lcmF0ZSBmaWxlcyBmb3IgZmlsZXMgaW4gbm9kZV9tb2R1bGVzLCBhcyBsaWJyYXJpZXNcbiAgICogb25seSBzaGlwIC5tZXRhZGF0YS5qc29uIGZpbGVzIGJ1dCBub3QgdGhlIGdlbmVyYXRlZCBjb2RlLlxuICAgKlxuICAgKiBMb2dpYzpcbiAgICogMS4gaWYgdGhlIGltcG9ydGVkRmlsZSBhbmQgdGhlIGNvbnRhaW5pbmdGaWxlIGFyZSBmcm9tIHRoZSBwcm9qZWN0IHNvdXJjZXNcbiAgICogICAgb3IgZnJvbSB0aGUgc2FtZSBub2RlX21vZHVsZXMgcGFja2FnZSwgdXNlIGEgcmVsYXRpdmUgcGF0aFxuICAgKiAyLiBpZiB0aGUgaW1wb3J0ZWRGaWxlIGlzIGluIGEgbm9kZV9tb2R1bGVzIHBhY2thZ2UsXG4gICAqICAgIHVzZSBhIHBhdGggdGhhdCBzdGFydHMgd2l0aCB0aGUgcGFja2FnZSBuYW1lLlxuICAgKiAzLiBFcnJvciBpZiB0aGUgY29udGFpbmluZ0ZpbGUgaXMgaW4gdGhlIG5vZGVfbW9kdWxlcyBwYWNrYWdlXG4gICAqICAgIGFuZCB0aGUgaW1wb3J0ZWRGaWxlIGlzIGluIHRoZSBwcm9qZWN0IHNvdXJlcyxcbiAgICogICAgYXMgdGhhdCBpcyBhIHZpb2xhdGlvbiBvZiB0aGUgcHJpbmNpcGxlIHRoYXQgbm9kZV9tb2R1bGVzIHBhY2thZ2VzIGNhbm5vdFxuICAgKiAgICBpbXBvcnQgcHJvamVjdCBzb3VyY2VzLlxuICAgKi9cbiAgZmlsZU5hbWVUb01vZHVsZU5hbWUoaW1wb3J0ZWRGaWxlOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gYCR7aW1wb3J0ZWRGaWxlfToke2NvbnRhaW5pbmdGaWxlfWA7XG4gICAgbGV0IG1vZHVsZU5hbWUgPSB0aGlzLmZpbGVOYW1lVG9Nb2R1bGVOYW1lQ2FjaGUuZ2V0KGNhY2hlS2V5KTtcbiAgICBpZiAobW9kdWxlTmFtZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gbW9kdWxlTmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCBvcmlnaW5hbEltcG9ydGVkRmlsZSA9IGltcG9ydGVkRmlsZTtcbiAgICBpZiAodGhpcy5vcHRpb25zLnRyYWNlUmVzb2x1dGlvbikge1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAnZmlsZU5hbWVUb01vZHVsZU5hbWUgZnJvbSBjb250YWluaW5nRmlsZScsIGNvbnRhaW5pbmdGaWxlLCAndG8gaW1wb3J0ZWRGaWxlJyxcbiAgICAgICAgICBpbXBvcnRlZEZpbGUpO1xuICAgIH1cblxuICAgIC8vIGRyb3AgZXh0ZW5zaW9uXG4gICAgaW1wb3J0ZWRGaWxlID0gaW1wb3J0ZWRGaWxlLnJlcGxhY2UoRVhULCAnJyk7XG4gICAgY29uc3QgaW1wb3J0ZWRGaWxlUGFja2FnZU5hbWUgPSBnZXRQYWNrYWdlTmFtZShpbXBvcnRlZEZpbGUpO1xuICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlUGFja2FnZU5hbWUgPSBnZXRQYWNrYWdlTmFtZShjb250YWluaW5nRmlsZSk7XG5cbiAgICBpZiAoaW1wb3J0ZWRGaWxlUGFja2FnZU5hbWUgPT09IGNvbnRhaW5pbmdGaWxlUGFja2FnZU5hbWUgfHxcbiAgICAgICAgR0VORVJBVEVEX0ZJTEVTLnRlc3Qob3JpZ2luYWxJbXBvcnRlZEZpbGUpKSB7XG4gICAgICBjb25zdCByb290ZWRDb250YWluaW5nRmlsZSA9IHJlbGF0aXZlVG9Sb290RGlycyhjb250YWluaW5nRmlsZSwgdGhpcy5yb290RGlycyk7XG4gICAgICBjb25zdCByb290ZWRJbXBvcnRlZEZpbGUgPSByZWxhdGl2ZVRvUm9vdERpcnMoaW1wb3J0ZWRGaWxlLCB0aGlzLnJvb3REaXJzKTtcblxuICAgICAgaWYgKHJvb3RlZENvbnRhaW5pbmdGaWxlICE9PSBjb250YWluaW5nRmlsZSAmJiByb290ZWRJbXBvcnRlZEZpbGUgIT09IGltcG9ydGVkRmlsZSkge1xuICAgICAgICAvLyBpZiBib3RoIGZpbGVzIGFyZSBjb250YWluZWQgaW4gdGhlIGByb290RGlyc2AsIHRoZW4gc3RyaXAgdGhlIHJvb3REaXJzXG4gICAgICAgIGNvbnRhaW5pbmdGaWxlID0gcm9vdGVkQ29udGFpbmluZ0ZpbGU7XG4gICAgICAgIGltcG9ydGVkRmlsZSA9IHJvb3RlZEltcG9ydGVkRmlsZTtcbiAgICAgIH1cbiAgICAgIG1vZHVsZU5hbWUgPSBkb3RSZWxhdGl2ZShwYXRoLmRpcm5hbWUoY29udGFpbmluZ0ZpbGUpLCBpbXBvcnRlZEZpbGUpO1xuICAgIH0gZWxzZSBpZiAoaW1wb3J0ZWRGaWxlUGFja2FnZU5hbWUpIHtcbiAgICAgIG1vZHVsZU5hbWUgPSBzdHJpcE5vZGVNb2R1bGVzUHJlZml4KGltcG9ydGVkRmlsZSk7XG4gICAgICBpZiAob3JpZ2luYWxJbXBvcnRlZEZpbGUuZW5kc1dpdGgoJy5kLnRzJykpIHtcbiAgICAgICAgLy8gdGhlIG1vZHVsZU5hbWUgZm9yIHRoZXNlIHR5cGluZ3MgY291bGQgYmUgc2hvcnRlbnRlZCB0byB0aGUgbnBtIHBhY2thZ2UgbmFtZVxuICAgICAgICAvLyBpZiB0aGUgbnBtIHBhY2thZ2UgdHlwaW5ncyBtYXRjaGVzIHRoZSBpbXBvcnRlZEZpbGVcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBtb2R1bGVQYXRoID0gaW1wb3J0ZWRGaWxlLnN1YnN0cmluZygwLCBpbXBvcnRlZEZpbGUubGVuZ3RoIC0gbW9kdWxlTmFtZS5sZW5ndGgpICtcbiAgICAgICAgICAgICAgaW1wb3J0ZWRGaWxlUGFja2FnZU5hbWU7XG4gICAgICAgICAgY29uc3QgcGFja2FnZUpzb24gPSByZXF1aXJlKG1vZHVsZVBhdGggKyAnL3BhY2thZ2UuanNvbicpO1xuICAgICAgICAgIGNvbnN0IHBhY2thZ2VUeXBpbmdzID0gcGF0aC5wb3NpeC5qb2luKG1vZHVsZVBhdGgsIHBhY2thZ2VKc29uLnR5cGluZ3MpO1xuICAgICAgICAgIGlmIChwYWNrYWdlVHlwaW5ncyA9PT0gb3JpZ2luYWxJbXBvcnRlZEZpbGUpIHtcbiAgICAgICAgICAgIG1vZHVsZU5hbWUgPSBpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIHRoZSBhYm92ZSByZXF1aXJlKCkgd2lsbCB0aHJvdyBpZiB0aGVyZSBpcyBubyBwYWNrYWdlLmpzb24gZmlsZVxuICAgICAgICAgIC8vIGFuZCB0aGlzIGlzIHNhZmUgdG8gaWdub3JlIGFuZCBjb3JyZWN0IHRvIGtlZXAgdGhlIGxvbmdlclxuICAgICAgICAgIC8vIG1vZHVsZU5hbWUgaW4gdGhpcyBjYXNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBUcnlpbmcgdG8gaW1wb3J0IGEgc291cmNlIGZpbGUgZnJvbSBhIG5vZGVfbW9kdWxlcyBwYWNrYWdlOiBpbXBvcnQgJHtvcmlnaW5hbEltcG9ydGVkRmlsZX0gZnJvbSAke2NvbnRhaW5pbmdGaWxlfWApO1xuICAgIH1cblxuICAgIHRoaXMuZmlsZU5hbWVUb01vZHVsZU5hbWVDYWNoZS5zZXQoY2FjaGVLZXksIG1vZHVsZU5hbWUpO1xuICAgIHJldHVybiBtb2R1bGVOYW1lO1xuICB9XG5cbiAgcmVzb3VyY2VOYW1lVG9GaWxlTmFtZShyZXNvdXJjZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgICAvLyBOb3RlOiB3ZSBjb252ZXJ0IHBhY2thZ2UgcGF0aHMgaW50byByZWxhdGl2ZSBwYXRocyB0byBiZSBjb21wYXRpYmxlIHdpdGggdGhlIHRoZVxuICAgIC8vIHByZXZpb3VzIGltcGxlbWVudGF0aW9uIG9mIFVybFJlc29sdmVyLlxuICAgIGNvbnN0IGZpcnN0Q2hhciA9IHJlc291cmNlTmFtZVswXTtcbiAgICBpZiAoZmlyc3RDaGFyID09PSAnLycpIHtcbiAgICAgIHJlc291cmNlTmFtZSA9IHJlc291cmNlTmFtZS5zbGljZSgxKTtcbiAgICB9IGVsc2UgaWYgKGZpcnN0Q2hhciAhPT0gJy4nKSB7XG4gICAgICByZXNvdXJjZU5hbWUgPSBgLi8ke3Jlc291cmNlTmFtZX1gO1xuICAgIH1cbiAgICBsZXQgZmlsZVBhdGhXaXRoTmdSZXNvdXJjZSA9XG4gICAgICAgIHRoaXMubW9kdWxlTmFtZVRvRmlsZU5hbWUoYWRkTmdSZXNvdXJjZVN1ZmZpeChyZXNvdXJjZU5hbWUpLCBjb250YWluaW5nRmlsZSk7XG4gICAgLy8gSWYgdGhlIHVzZXIgc3BlY2lmaWVkIHN0eWxlVXJsIHBvaW50aW5nIHRvICouc2NzcywgYnV0IHRoZSBTYXNzIGNvbXBpbGVyIHdhcyBydW4gYmVmb3JlXG4gICAgLy8gQW5ndWxhciwgdGhlbiB0aGUgcmVzb3VyY2UgbWF5IGhhdmUgYmVlbiBnZW5lcmF0ZWQgYXMgKi5jc3MuIFNpbXBseSB0cnkgdGhlIHJlc29sdXRpb24gYWdhaW4uXG4gICAgaWYgKCFmaWxlUGF0aFdpdGhOZ1Jlc291cmNlICYmIENTU19QUkVQUk9DRVNTT1JfRVhULnRlc3QocmVzb3VyY2VOYW1lKSkge1xuICAgICAgY29uc3QgZmFsbGJhY2tSZXNvdXJjZU5hbWUgPSByZXNvdXJjZU5hbWUucmVwbGFjZShDU1NfUFJFUFJPQ0VTU09SX0VYVCwgJy5jc3MnKTtcbiAgICAgIGZpbGVQYXRoV2l0aE5nUmVzb3VyY2UgPVxuICAgICAgICAgIHRoaXMubW9kdWxlTmFtZVRvRmlsZU5hbWUoYWRkTmdSZXNvdXJjZVN1ZmZpeChmYWxsYmFja1Jlc291cmNlTmFtZSksIGNvbnRhaW5pbmdGaWxlKTtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gZmlsZVBhdGhXaXRoTmdSZXNvdXJjZSA/IHN0cmlwTmdSZXNvdXJjZVN1ZmZpeChmaWxlUGF0aFdpdGhOZ1Jlc291cmNlKSA6IG51bGw7XG4gICAgLy8gVXNlZCB1bmRlciBCYXplbCB0byByZXBvcnQgbW9yZSBzcGVjaWZpYyBlcnJvciB3aXRoIHJlbWVkaWF0aW9uIGFkdmljZVxuICAgIGlmICghcmVzdWx0ICYmICh0aGlzLmNvbnRleHQgYXMgYW55KS5yZXBvcnRNaXNzaW5nUmVzb3VyY2UpIHtcbiAgICAgICh0aGlzLmNvbnRleHQgYXMgYW55KS5yZXBvcnRNaXNzaW5nUmVzb3VyY2UocmVzb3VyY2VOYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHRvU3VtbWFyeUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcsIHJlZmVycmluZ1NyY0ZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmZpbGVOYW1lVG9Nb2R1bGVOYW1lKGZpbGVOYW1lLCByZWZlcnJpbmdTcmNGaWxlTmFtZSk7XG4gIH1cblxuICBmcm9tU3VtbWFyeUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcsIHJlZmVycmluZ0xpYkZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5tb2R1bGVOYW1lVG9GaWxlTmFtZShmaWxlTmFtZSwgcmVmZXJyaW5nTGliRmlsZU5hbWUpO1xuICAgIGlmICghcmVzb2x2ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgJHtmaWxlTmFtZX0gZnJvbSAke3JlZmVycmluZ0xpYkZpbGVOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gIH1cblxuICBwYXJzZVNvdXJjZVNwYW5PZihmaWxlTmFtZTogc3RyaW5nLCBsaW5lOiBudW1iZXIsIGNoYXJhY3RlcjogbnVtYmVyKTogUGFyc2VTb3VyY2VTcGFufG51bGwge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdlbmVyYXRlZFNvdXJjZUZpbGVzLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKGRhdGEgJiYgZGF0YS5lbWl0Q3R4KSB7XG4gICAgICByZXR1cm4gZGF0YS5lbWl0Q3R4LnNwYW5PZihsaW5lLCBjaGFyYWN0ZXIpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0T3JpZ2luYWxTb3VyY2VGaWxlKFxuICAgICAgZmlsZVBhdGg6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uPzogdHMuU2NyaXB0VGFyZ2V0LFxuICAgICAgb25FcnJvcj86ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQpOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICAgIC8vIE5vdGU6IHdlIG5lZWQgdGhlIGV4cGxpY2l0IGNoZWNrIHZpYSBgaGFzYCBhcyB3ZSBhbHNvIGNhY2hlIHJlc3VsdHNcbiAgICAvLyB0aGF0IHdlcmUgbnVsbCAvIHVuZGVmaW5lZC5cbiAgICBpZiAodGhpcy5vcmlnaW5hbFNvdXJjZUZpbGVzLmhhcyhmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiB0aGlzLm9yaWdpbmFsU291cmNlRmlsZXMuZ2V0KGZpbGVQYXRoKSAhO1xuICAgIH1cbiAgICBpZiAoIWxhbmd1YWdlVmVyc2lvbikge1xuICAgICAgbGFuZ3VhZ2VWZXJzaW9uID0gdGhpcy5vcHRpb25zLnRhcmdldCB8fCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0O1xuICAgIH1cbiAgICAvLyBOb3RlOiBUaGlzIGNhbiBhbHNvIHJldHVybiB1bmRlZmluZWQsXG4gICAgLy8gYXMgdGhlIFRTIHR5cGluZ3MgYXJlIG5vdCBjb3JyZWN0IVxuICAgIGNvbnN0IHNmID0gdGhpcy5jb250ZXh0LmdldFNvdXJjZUZpbGUoZmlsZVBhdGgsIGxhbmd1YWdlVmVyc2lvbiwgb25FcnJvcikgfHwgbnVsbDtcbiAgICB0aGlzLm9yaWdpbmFsU291cmNlRmlsZXMuc2V0KGZpbGVQYXRoLCBzZik7XG4gICAgcmV0dXJuIHNmO1xuICB9XG5cbiAgdXBkYXRlR2VuZXJhdGVkRmlsZShnZW5GaWxlOiBHZW5lcmF0ZWRGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gICAgaWYgKCFnZW5GaWxlLnN0bXRzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEludmFsaWQgQXJndW1lbnQ6IEV4cGVjdGVkIGEgR2VuZXJhdGVGaWxlIHdpdGggc3RhdGVtZW50cy4gJHtnZW5GaWxlLmdlbkZpbGVVcmx9YCk7XG4gICAgfVxuICAgIGNvbnN0IG9sZEdlbkZpbGUgPSB0aGlzLmdlbmVyYXRlZFNvdXJjZUZpbGVzLmdldChnZW5GaWxlLmdlbkZpbGVVcmwpO1xuICAgIGlmICghb2xkR2VuRmlsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbGxlZ2FsIFN0YXRlOiBwcmV2aW91cyBHZW5lcmF0ZWRGaWxlIG5vdCBmb3VuZCBmb3IgJHtnZW5GaWxlLmdlbkZpbGVVcmx9LmApO1xuICAgIH1cbiAgICBjb25zdCBuZXdSZWZzID0gZ2VuRmlsZUV4dGVybmFsUmVmZXJlbmNlcyhnZW5GaWxlKTtcbiAgICBjb25zdCBvbGRSZWZzID0gb2xkR2VuRmlsZS5leHRlcm5hbFJlZmVyZW5jZXM7XG4gICAgbGV0IHJlZnNBcmVFcXVhbCA9IG9sZFJlZnMuc2l6ZSA9PT0gbmV3UmVmcy5zaXplO1xuICAgIGlmIChyZWZzQXJlRXF1YWwpIHtcbiAgICAgIG5ld1JlZnMuZm9yRWFjaChyID0+IHJlZnNBcmVFcXVhbCA9IHJlZnNBcmVFcXVhbCAmJiBvbGRSZWZzLmhhcyhyKSk7XG4gICAgfVxuICAgIGlmICghcmVmc0FyZUVxdWFsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYElsbGVnYWwgU3RhdGU6IGV4dGVybmFsIHJlZmVyZW5jZXMgY2hhbmdlZCBpbiAke2dlbkZpbGUuZ2VuRmlsZVVybH0uXFxuT2xkOiAke0FycmF5LmZyb20ob2xkUmVmcyl9Llxcbk5ldzogJHtBcnJheS5mcm9tKG5ld1JlZnMpfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hZGRHZW5lcmF0ZWRGaWxlKGdlbkZpbGUsIG5ld1JlZnMpO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRHZW5lcmF0ZWRGaWxlKGdlbkZpbGU6IEdlbmVyYXRlZEZpbGUsIGV4dGVybmFsUmVmZXJlbmNlczogU2V0PHN0cmluZz4pOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICBpZiAoIWdlbkZpbGUuc3RtdHMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgSW52YWxpZCBBcmd1bWVudDogRXhwZWN0ZWQgYSBHZW5lcmF0ZUZpbGUgd2l0aCBzdGF0ZW1lbnRzLiAke2dlbkZpbGUuZ2VuRmlsZVVybH1gKTtcbiAgICB9XG4gICAgY29uc3Qge3NvdXJjZVRleHQsIGNvbnRleHR9ID0gdGhpcy5lbWl0dGVyLmVtaXRTdGF0ZW1lbnRzQW5kQ29udGV4dChcbiAgICAgICAgZ2VuRmlsZS5nZW5GaWxlVXJsLCBnZW5GaWxlLnN0bXRzLCAvKiBwcmVhbWJsZSAqLyAnJyxcbiAgICAgICAgLyogZW1pdFNvdXJjZU1hcHMgKi8gZmFsc2UpO1xuICAgIGNvbnN0IHNmID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgZ2VuRmlsZS5nZW5GaWxlVXJsLCBzb3VyY2VUZXh0LCB0aGlzLm9wdGlvbnMudGFyZ2V0IHx8IHRzLlNjcmlwdFRhcmdldC5MYXRlc3QpO1xuICAgIGlmICgodGhpcy5vcHRpb25zLm1vZHVsZSA9PT0gdHMuTW9kdWxlS2luZC5BTUQgfHwgdGhpcy5vcHRpb25zLm1vZHVsZSA9PT0gdHMuTW9kdWxlS2luZC5VTUQpICYmXG4gICAgICAgIHRoaXMuY29udGV4dC5hbWRNb2R1bGVOYW1lKSB7XG4gICAgICBjb25zdCBtb2R1bGVOYW1lID0gdGhpcy5jb250ZXh0LmFtZE1vZHVsZU5hbWUoc2YpO1xuICAgICAgaWYgKG1vZHVsZU5hbWUpIHNmLm1vZHVsZU5hbWUgPSBtb2R1bGVOYW1lO1xuICAgIH1cbiAgICB0aGlzLmdlbmVyYXRlZFNvdXJjZUZpbGVzLnNldChnZW5GaWxlLmdlbkZpbGVVcmwsIHtcbiAgICAgIHNvdXJjZUZpbGU6IHNmLFxuICAgICAgZW1pdEN0eDogY29udGV4dCwgZXh0ZXJuYWxSZWZlcmVuY2VzLFxuICAgIH0pO1xuICAgIHJldHVybiBzZjtcbiAgfVxuXG4gIHNob3VsZEdlbmVyYXRlRmlsZShmaWxlTmFtZTogc3RyaW5nKToge2dlbmVyYXRlOiBib29sZWFuLCBiYXNlRmlsZU5hbWU/OiBzdHJpbmd9IHtcbiAgICAvLyBUT0RPKHRib3NjaCk6IGFsbG93IGdlbmVyYXRpbmcgZmlsZXMgdGhhdCBhcmUgbm90IGluIHRoZSByb290RGlyXG4gICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzE5MzM3XG4gICAgaWYgKCFpc0luUm9vdERpcihmaWxlTmFtZSwgdGhpcy5vcHRpb25zKSkge1xuICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgIH1cbiAgICBjb25zdCBnZW5NYXRjaCA9IEdFTkVSQVRFRF9GSUxFUy5leGVjKGZpbGVOYW1lKTtcbiAgICBpZiAoIWdlbk1hdGNoKSB7XG4gICAgICByZXR1cm4ge2dlbmVyYXRlOiBmYWxzZX07XG4gICAgfVxuICAgIGNvbnN0IFssIGJhc2UsIGdlblN1ZmZpeCwgc3VmZml4XSA9IGdlbk1hdGNoO1xuICAgIGlmIChzdWZmaXggIT09ICd0cycgJiYgc3VmZml4ICE9PSAndHN4Jykge1xuICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgIH1cbiAgICBsZXQgYmFzZUZpbGVOYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICAgIGlmIChnZW5TdWZmaXguaW5kZXhPZignbmdzdHlsZScpID49IDApIHtcbiAgICAgIC8vIE5vdGU6IG5nc3R5bGUgZmlsZXMgaGF2ZSBuYW1lcyBsaWtlIGBhZmlsZS5jc3MubmdzdHlsZS50c2BcbiAgICAgIGlmICghdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMoYmFzZSkpIHtcbiAgICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb3RlOiBvbi10aGUtZmx5IGdlbmVyYXRlZCBmaWxlcyBhbHdheXMgaGF2ZSBhIGAudHNgIHN1ZmZpeCxcbiAgICAgIC8vIGJ1dCB0aGUgZmlsZSBmcm9tIHdoaWNoIHdlIGdlbmVyYXRlZCBpdCBjYW4gYmUgYSBgLnRzYC8gYC50c3hgLyBgLmQudHNgXG4gICAgICAvLyAoc2VlIG9wdGlvbnMuZ2VuZXJhdGVDb2RlRm9yTGlicmFyaWVzKS5cbiAgICAgIGJhc2VGaWxlTmFtZSA9IFtgJHtiYXNlfS50c2AsIGAke2Jhc2V9LnRzeGAsIGAke2Jhc2V9LmQudHNgXS5maW5kKFxuICAgICAgICAgIGJhc2VGaWxlTmFtZSA9PiB0aGlzLmlzU291cmNlRmlsZShiYXNlRmlsZU5hbWUpICYmIHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGJhc2VGaWxlTmFtZSkpO1xuICAgICAgaWYgKCFiYXNlRmlsZU5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge2dlbmVyYXRlOiB0cnVlLCBiYXNlRmlsZU5hbWV9O1xuICB9XG5cbiAgc2hvdWxkR2VuZXJhdGVGaWxlc0ZvcihmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgLy8gVE9ETyh0Ym9zY2gpOiBhbGxvdyBnZW5lcmF0aW5nIGZpbGVzIHRoYXQgYXJlIG5vdCBpbiB0aGUgcm9vdERpclxuICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy8xOTMzN1xuICAgIHJldHVybiAhR0VORVJBVEVEX0ZJTEVTLnRlc3QoZmlsZU5hbWUpICYmIHRoaXMuaXNTb3VyY2VGaWxlKGZpbGVOYW1lKSAmJlxuICAgICAgICBpc0luUm9vdERpcihmaWxlTmFtZSwgdGhpcy5vcHRpb25zKTtcbiAgfVxuXG4gIGdldFNvdXJjZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCxcbiAgICAgIG9uRXJyb3I/OiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkKTogdHMuU291cmNlRmlsZSB7XG4gICAgLy8gTm90ZTogRG9uJ3QgZXhpdCBlYXJseSBpbiB0aGlzIG1ldGhvZCB0byBtYWtlIHN1cmVcbiAgICAvLyB3ZSBhbHdheXMgaGF2ZSB1cCB0byBkYXRlIHJlZmVyZW5jZXMgb24gdGhlIGZpbGUhXG4gICAgbGV0IGdlbkZpbGVOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgc2YgPSB0aGlzLmdldEdlbmVyYXRlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGlmICghc2YpIHtcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLmxpYnJhcnlTdW1tYXJpZXMuZ2V0KGZpbGVOYW1lKTtcbiAgICAgIGlmIChzdW1tYXJ5KSB7XG4gICAgICAgIGlmICghc3VtbWFyeS5zb3VyY2VGaWxlKSB7XG4gICAgICAgICAgc3VtbWFyeS5zb3VyY2VGaWxlID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgICAgICAgZmlsZU5hbWUsIHN1bW1hcnkudGV4dCwgdGhpcy5vcHRpb25zLnRhcmdldCB8fCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0KTtcbiAgICAgICAgfVxuICAgICAgICBzZiA9IHN1bW1hcnkuc291cmNlRmlsZTtcbiAgICAgICAgZ2VuRmlsZU5hbWVzID0gW107XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghc2YpIHtcbiAgICAgIHNmID0gdGhpcy5nZXRPcmlnaW5hbFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgY29uc3QgY2FjaGVkR2VuRmlsZXMgPSB0aGlzLmdlbmVyYXRlZENvZGVGb3IuZ2V0KGZpbGVOYW1lKTtcbiAgICAgIGlmIChjYWNoZWRHZW5GaWxlcykge1xuICAgICAgICBnZW5GaWxlTmFtZXMgPSBjYWNoZWRHZW5GaWxlcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLm5vUmVzb2x2ZSAmJiB0aGlzLnNob3VsZEdlbmVyYXRlRmlsZXNGb3IoZmlsZU5hbWUpKSB7XG4gICAgICAgICAgZ2VuRmlsZU5hbWVzID0gdGhpcy5jb2RlR2VuZXJhdG9yLmZpbmRHZW5lcmF0ZWRGaWxlTmFtZXMoZmlsZU5hbWUpLmZpbHRlcihcbiAgICAgICAgICAgICAgZmlsZU5hbWUgPT4gdGhpcy5zaG91bGRHZW5lcmF0ZUZpbGUoZmlsZU5hbWUpLmdlbmVyYXRlKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmdlbmVyYXRlZENvZGVGb3Iuc2V0KGZpbGVOYW1lLCBnZW5GaWxlTmFtZXMpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2YpIHtcbiAgICAgIGFkZFJlZmVyZW5jZXNUb1NvdXJjZUZpbGUoc2YsIGdlbkZpbGVOYW1lcyk7XG4gICAgfVxuICAgIC8vIFRPRE8odGJvc2NoKTogVHlwZVNjcmlwdCdzIHR5cGluZ3MgZm9yIGdldFNvdXJjZUZpbGUgYXJlIGluY29ycmVjdCxcbiAgICAvLyBhcyBpdCBjYW4gdmVyeSB3ZWxsIHJldHVybiB1bmRlZmluZWQuXG4gICAgcmV0dXJuIHNmICE7XG4gIH1cblxuICBwcml2YXRlIGdldEdlbmVyYXRlZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgY29uc3QgZ2VuU3JjRmlsZSA9IHRoaXMuZ2VuZXJhdGVkU291cmNlRmlsZXMuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoZ2VuU3JjRmlsZSkge1xuICAgICAgcmV0dXJuIGdlblNyY0ZpbGUuc291cmNlRmlsZTtcbiAgICB9XG4gICAgY29uc3Qge2dlbmVyYXRlLCBiYXNlRmlsZU5hbWV9ID0gdGhpcy5zaG91bGRHZW5lcmF0ZUZpbGUoZmlsZU5hbWUpO1xuICAgIGlmIChnZW5lcmF0ZSkge1xuICAgICAgY29uc3QgZ2VuRmlsZSA9IHRoaXMuY29kZUdlbmVyYXRvci5nZW5lcmF0ZUZpbGUoZmlsZU5hbWUsIGJhc2VGaWxlTmFtZSk7XG4gICAgICByZXR1cm4gdGhpcy5hZGRHZW5lcmF0ZWRGaWxlKGdlbkZpbGUsIGdlbkZpbGVFeHRlcm5hbFJlZmVyZW5jZXMoZ2VuRmlsZSkpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgb3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBsZXQgZmlsZUV4aXN0cyA9IHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzQ2FjaGUuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoZmlsZUV4aXN0cyA9PSBudWxsKSB7XG4gICAgICBmaWxlRXhpc3RzID0gdGhpcy5jb250ZXh0LmZpbGVFeGlzdHMoZmlsZU5hbWUpO1xuICAgICAgdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHNDYWNoZS5zZXQoZmlsZU5hbWUsIGZpbGVFeGlzdHMpO1xuICAgIH1cbiAgICByZXR1cm4gZmlsZUV4aXN0cztcbiAgfVxuXG4gIGZpbGVFeGlzdHMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGZpbGVOYW1lID0gc3RyaXBOZ1Jlc291cmNlU3VmZml4KGZpbGVOYW1lKTtcbiAgICBpZiAodGhpcy5saWJyYXJ5U3VtbWFyaWVzLmhhcyhmaWxlTmFtZSkgfHwgdGhpcy5nZW5lcmF0ZWRTb3VyY2VGaWxlcy5oYXMoZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc2hvdWxkR2VuZXJhdGVGaWxlKGZpbGVOYW1lKS5nZW5lcmF0ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhmaWxlTmFtZSk7XG4gIH1cblxuICBsb2FkU3VtbWFyeShmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLmxpYnJhcnlTdW1tYXJpZXMuZ2V0KGZpbGVQYXRoKTtcbiAgICBpZiAoc3VtbWFyeSkge1xuICAgICAgcmV0dXJuIHN1bW1hcnkudGV4dDtcbiAgICB9XG4gICAgaWYgKHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZVBhdGgpKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpc1NvdXJjZUZpbGUoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIERvbid0IGdlbmVyYXRlIGFueSBmaWxlcyBub3IgdHlwZWNoZWNrIHRoZW1cbiAgICAvLyBpZiBza2lwVGVtcGxhdGVDb2RlZ2VuIGlzIHNldCBhbmQgZnVsbFRlbXBsYXRlVHlwZUNoZWNrIGlzIG5vdCB5ZXQgc2V0LFxuICAgIC8vIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAgICBpZiAodGhpcy5vcHRpb25zLnNraXBUZW1wbGF0ZUNvZGVnZW4gJiYgIXRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSWYgd2UgaGF2ZSBhIHN1bW1hcnkgZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uLFxuICAgIC8vIHRyZWF0IHRoZSBmaWxlIG5ldmVyIGFzIGEgc291cmNlIGZpbGUuXG4gICAgaWYgKHRoaXMubGlicmFyeVN1bW1hcmllcy5oYXMoZmlsZVBhdGgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChHRU5FUkFURURfRklMRVMudGVzdChmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5nZW5lcmF0ZUNvZGVGb3JMaWJyYXJpZXMgPT09IGZhbHNlICYmIERUUy50ZXN0KGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoRFRTLnRlc3QoZmlsZVBhdGgpKSB7XG4gICAgICAvLyBDaGVjayBmb3IgYSBidW5kbGUgaW5kZXguXG4gICAgICBpZiAodGhpcy5oYXNCdW5kbGVJbmRleChmaWxlUGF0aCkpIHtcbiAgICAgICAgY29uc3Qgbm9ybWFsRmlsZVBhdGggPSBwYXRoLm5vcm1hbGl6ZShmaWxlUGF0aCk7XG4gICAgICAgIHJldHVybiB0aGlzLmZsYXRNb2R1bGVJbmRleE5hbWVzLmhhcyhub3JtYWxGaWxlUGF0aCkgfHxcbiAgICAgICAgICAgIHRoaXMuZmxhdE1vZHVsZUluZGV4UmVkaXJlY3ROYW1lcy5oYXMobm9ybWFsRmlsZVBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJlYWRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdW1tYXJ5ID0gdGhpcy5saWJyYXJ5U3VtbWFyaWVzLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKHN1bW1hcnkpIHtcbiAgICAgIHJldHVybiBzdW1tYXJ5LnRleHQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0TWV0YWRhdGFGb3IoZmlsZVBhdGg6IHN0cmluZyk6IE1vZHVsZU1ldGFkYXRhW118dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gcmVhZE1ldGFkYXRhKGZpbGVQYXRoLCB0aGlzLm1ldGFkYXRhUmVhZGVySG9zdCwgdGhpcy5tZXRhZGF0YVJlYWRlckNhY2hlKTtcbiAgfVxuXG4gIGxvYWRSZXNvdXJjZShmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+fHN0cmluZyB7XG4gICAgaWYgKHRoaXMuY29udGV4dC5yZWFkUmVzb3VyY2UpIHJldHVybiB0aGlzLmNvbnRleHQucmVhZFJlc291cmNlKGZpbGVQYXRoKTtcbiAgICBpZiAoIXRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVQYXRoKSkge1xuICAgICAgdGhyb3cgc3ludGF4RXJyb3IoYEVycm9yOiBSZXNvdXJjZSBmaWxlIG5vdCBmb3VuZDogJHtmaWxlUGF0aH1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZVBhdGgpKTtcbiAgfVxuXG4gIGdldE91dHB1dE5hbWUoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHBhdGgucmVsYXRpdmUodGhpcy5nZXRDdXJyZW50RGlyZWN0b3J5KCksIGZpbGVQYXRoKTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzQnVuZGxlSW5kZXgoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGNoZWNrQnVuZGxlSW5kZXggPSAoZGlyZWN0b3J5OiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICAgIGxldCByZXN1bHQgPSB0aGlzLmZsYXRNb2R1bGVJbmRleENhY2hlLmdldChkaXJlY3RvcnkpO1xuICAgICAgaWYgKHJlc3VsdCA9PSBudWxsKSB7XG4gICAgICAgIGlmIChwYXRoLmJhc2VuYW1lKGRpcmVjdG9yeSkgPT0gJ25vZGVfbW9kdWxlJykge1xuICAgICAgICAgIC8vIERvbid0IGxvb2sgb3V0c2lkZSB0aGUgbm9kZV9tb2R1bGVzIHRoaXMgcGFja2FnZSBpcyBpbnN0YWxsZWQgaW4uXG4gICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gQSBidW5kbGUgaW5kZXggZXhpc3RzIGlmIHRoZSB0eXBpbmdzIC5kLnRzIGZpbGUgaGFzIGEgbWV0YWRhdGEuanNvbiB0aGF0IGhhcyBhblxuICAgICAgICAgIC8vIGltcG9ydEFzLlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwYWNrYWdlRmlsZSA9IHBhdGguam9pbihkaXJlY3RvcnksICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgICAgIGlmICh0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhwYWNrYWdlRmlsZSkpIHtcbiAgICAgICAgICAgICAgLy8gT25jZSB3ZSBzZWUgYSBwYWNrYWdlLmpzb24gZmlsZSwgYXNzdW1lIGZhbHNlIHVudGlsIGl0IHdlIGZpbmQgdGhlIGJ1bmRsZSBpbmRleC5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VDb250ZW50OiBhbnkgPSBKU09OLnBhcnNlKGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUocGFja2FnZUZpbGUpKSk7XG4gICAgICAgICAgICAgIGlmIChwYWNrYWdlQ29udGVudC50eXBpbmdzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHlwaW5ncyA9IHBhdGgubm9ybWFsaXplKHBhdGguam9pbihkaXJlY3RvcnksIHBhY2thZ2VDb250ZW50LnR5cGluZ3MpKTtcbiAgICAgICAgICAgICAgICBpZiAoRFRTLnRlc3QodHlwaW5ncykpIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGFkYXRhRmlsZSA9IHR5cGluZ3MucmVwbGFjZShEVFMsICcubWV0YWRhdGEuanNvbicpO1xuICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKG1ldGFkYXRhRmlsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWV0YWRhdGEgPSBKU09OLnBhcnNlKGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUobWV0YWRhdGFGaWxlKSkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWV0YWRhdGEuZmxhdE1vZHVsZUluZGV4UmVkaXJlY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZsYXRNb2R1bGVJbmRleFJlZGlyZWN0TmFtZXMuYWRkKHR5cGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgIC8vIE5vdGU6IGRvbid0IHNldCByZXN1bHQgPSB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIC8vIGFzIHRoaXMgd291bGQgbWFyayB0aGlzIGZvbGRlclxuICAgICAgICAgICAgICAgICAgICAgIC8vIGFzIGhhdmluZyBhIGJ1bmRsZUluZGV4IHRvbyBlYXJseSB3aXRob3V0XG4gICAgICAgICAgICAgICAgICAgICAgLy8gZmlsbGluZyB0aGUgYnVuZGxlSW5kZXhOYW1lcy5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZXRhZGF0YS5pbXBvcnRBcykge1xuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmxhdE1vZHVsZUluZGV4TmFtZXMuYWRkKHR5cGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHBhdGguZGlybmFtZShkaXJlY3RvcnkpO1xuICAgICAgICAgICAgICBpZiAocGFyZW50ICE9IGRpcmVjdG9yeSkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSB0aGUgcGFyZW50IGRpcmVjdG9yeS5cbiAgICAgICAgICAgICAgICByZXN1bHQgPSBjaGVja0J1bmRsZUluZGV4KHBhcmVudCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIElmIHdlIGVuY291bnRlciBhbnkgZXJyb3JzIGFzc3VtZSB3ZSB0aGlzIGlzbid0IGEgYnVuZGxlIGluZGV4LlxuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmxhdE1vZHVsZUluZGV4Q2FjaGUuc2V0KGRpcmVjdG9yeSwgcmVzdWx0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIHJldHVybiBjaGVja0J1bmRsZUluZGV4KHBhdGguZGlybmFtZShmaWxlUGF0aCkpO1xuICB9XG5cbiAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lID0gKG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucykgPT5cbiAgICAgIHRoaXMuY29udGV4dC5nZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9ucylcbiAgZ2V0Q3VycmVudERpcmVjdG9yeSA9ICgpID0+IHRoaXMuY29udGV4dC5nZXRDdXJyZW50RGlyZWN0b3J5KCk7XG4gIGdldENhbm9uaWNhbEZpbGVOYW1lID0gKGZpbGVOYW1lOiBzdHJpbmcpID0+IHRoaXMuY29udGV4dC5nZXRDYW5vbmljYWxGaWxlTmFtZShmaWxlTmFtZSk7XG4gIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMgPSAoKSA9PiB0aGlzLmNvbnRleHQudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpO1xuICBnZXROZXdMaW5lID0gKCkgPT4gdGhpcy5jb250ZXh0LmdldE5ld0xpbmUoKTtcbiAgLy8gTWFrZSBzdXJlIHdlIGRvIG5vdCBgaG9zdC5yZWFscGF0aCgpYCBmcm9tIFRTIGFzIHdlIGRvIG5vdCB3YW50IHRvIHJlc29sdmUgc3ltbGlua3MuXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvOTU1MlxuICByZWFscGF0aCA9IChwOiBzdHJpbmcpID0+IHA7XG4gIHdyaXRlRmlsZSA9IHRoaXMuY29udGV4dC53cml0ZUZpbGUuYmluZCh0aGlzLmNvbnRleHQpO1xufVxuXG5mdW5jdGlvbiBnZW5GaWxlRXh0ZXJuYWxSZWZlcmVuY2VzKGdlbkZpbGU6IEdlbmVyYXRlZEZpbGUpOiBTZXQ8c3RyaW5nPiB7XG4gIHJldHVybiBuZXcgU2V0KGNvbGxlY3RFeHRlcm5hbFJlZmVyZW5jZXMoZ2VuRmlsZS5zdG10cyAhKS5tYXAoZXIgPT4gZXIubW9kdWxlTmFtZSAhKSk7XG59XG5cbmZ1bmN0aW9uIGFkZFJlZmVyZW5jZXNUb1NvdXJjZUZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUsIGdlbkZpbGVOYW1lczogc3RyaW5nW10pIHtcbiAgLy8gTm90ZTogYXMgd2UgbW9kaWZ5IHRzLlNvdXJjZUZpbGVzIHdlIG5lZWQgdG8ga2VlcCB0aGUgb3JpZ2luYWxcbiAgLy8gdmFsdWUgZm9yIGByZWZlcmVuY2VkRmlsZXNgIGFyb3VuZCBpbiBjYWNoZSB0aGUgb3JpZ2luYWwgaG9zdCBpcyBjYWNoaW5nIHRzLlNvdXJjZUZpbGVzLlxuICAvLyBOb3RlOiBjbG9uaW5nIHRoZSB0cy5Tb3VyY2VGaWxlIGlzIGV4cGVuc2l2ZSBhcyB0aGUgbm9kZXMgaW4gaGF2ZSBwYXJlbnQgcG9pbnRlcnMsXG4gIC8vIGkuZS4gd2Ugd291bGQgYWxzbyBuZWVkIHRvIGNsb25lIGFuZCBhZGp1c3QgYWxsIG5vZGVzLlxuICBsZXQgb3JpZ2luYWxSZWZlcmVuY2VkRmlsZXM6IFJlYWRvbmx5QXJyYXk8dHMuRmlsZVJlZmVyZW5jZT4gPVxuICAgICAgKHNmIGFzIGFueSkub3JpZ2luYWxSZWZlcmVuY2VkRmlsZXM7XG4gIGlmICghb3JpZ2luYWxSZWZlcmVuY2VkRmlsZXMpIHtcbiAgICBvcmlnaW5hbFJlZmVyZW5jZWRGaWxlcyA9IHNmLnJlZmVyZW5jZWRGaWxlcztcbiAgICAoc2YgYXMgYW55KS5vcmlnaW5hbFJlZmVyZW5jZWRGaWxlcyA9IG9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzO1xuICB9XG4gIGNvbnN0IG5ld1JlZmVyZW5jZWRGaWxlcyA9IFsuLi5vcmlnaW5hbFJlZmVyZW5jZWRGaWxlc107XG4gIGdlbkZpbGVOYW1lcy5mb3JFYWNoKGdmID0+IG5ld1JlZmVyZW5jZWRGaWxlcy5wdXNoKHtmaWxlTmFtZTogZ2YsIHBvczogMCwgZW5kOiAwfSkpO1xuICBzZi5yZWZlcmVuY2VkRmlsZXMgPSBuZXdSZWZlcmVuY2VkRmlsZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRPcmlnaW5hbFJlZmVyZW5jZXMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLkZpbGVSZWZlcmVuY2VbXXx1bmRlZmluZWQge1xuICByZXR1cm4gc291cmNlRmlsZSAmJiAoc291cmNlRmlsZSBhcyBhbnkpLm9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzO1xufVxuXG5mdW5jdGlvbiBkb3RSZWxhdGl2ZShmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCByUGF0aDogc3RyaW5nID0gcGF0aC5yZWxhdGl2ZShmcm9tLCB0bykucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICByZXR1cm4gclBhdGguc3RhcnRzV2l0aCgnLicpID8gclBhdGggOiAnLi8nICsgclBhdGg7XG59XG5cbi8qKlxuICogTW92ZXMgdGhlIHBhdGggaW50byBgZ2VuRGlyYCBmb2xkZXIgd2hpbGUgcHJlc2VydmluZyB0aGUgYG5vZGVfbW9kdWxlc2AgZGlyZWN0b3J5LlxuICovXG5mdW5jdGlvbiBnZXRQYWNrYWdlTmFtZShmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICBjb25zdCBtYXRjaCA9IE5PREVfTU9EVUxFU19QQUNLQUdFX05BTUUuZXhlYyhmaWxlUGF0aCk7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzFdIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gc3RyaXBOb2RlTW9kdWxlc1ByZWZpeChmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGZpbGVQYXRoLnJlcGxhY2UoLy4qbm9kZV9tb2R1bGVzXFwvLywgJycpO1xufVxuXG5mdW5jdGlvbiBnZXROb2RlTW9kdWxlc1ByZWZpeChmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICBjb25zdCBtYXRjaCA9IC8uKm5vZGVfbW9kdWxlc1xcLy8uZXhlYyhmaWxlUGF0aCk7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzFdIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gc3RyaXBOZ1Jlc291cmNlU3VmZml4KGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZmlsZU5hbWUucmVwbGFjZSgvXFwuXFwkbmdyZXNvdXJjZVxcJC4qLywgJycpO1xufVxuXG5mdW5jdGlvbiBhZGROZ1Jlc291cmNlU3VmZml4KGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7ZmlsZU5hbWV9LiRuZ3Jlc291cmNlJGA7XG59XG4iXX0=