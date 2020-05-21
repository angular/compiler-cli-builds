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
        define("@angular/compiler-cli/src/transformers/compiler_host", ["require", "exports", "tslib", "@angular/compiler", "path", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/transformers/metadata_reader", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getOriginalReferences = exports.TsCompilerAotCompilerTypeCheckHostAdapter = exports.createCompilerHost = exports.setWrapHostForTest = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var path = require("path");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var metadata_reader_1 = require("@angular/compiler-cli/src/transformers/metadata_reader");
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    var NODE_MODULES_PACKAGE_NAME = /node_modules\/((\w|-|\.)+|(@(\w|-|\.)+\/(\w|-|\.)+))/;
    var EXT = /(\.ts|\.d\.ts|\.js|\.jsx|\.tsx)$/;
    var CSS_PREPROCESSOR_EXT = /(\.scss|\.sass|\.less|\.styl)$/;
    var wrapHostForTest = null;
    function setWrapHostForTest(wrapFn) {
        wrapHostForTest = wrapFn;
    }
    exports.setWrapHostForTest = setWrapHostForTest;
    function createCompilerHost(_a) {
        var options = _a.options, _b = _a.tsHost, tsHost = _b === void 0 ? ts.createCompilerHost(options, true) : _b;
        if (wrapHostForTest !== null) {
            tsHost = wrapHostForTest(tsHost);
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
            var _this = this;
            if (librarySummaries === void 0) { librarySummaries = new Map(); }
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
                        var packageTypings = file_system_1.join(modulePath, packageJson.typings);
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
            if (this.options.module === ts.ModuleKind.AMD || this.options.module === ts.ModuleKind.UMD) {
                if (this.context.amdModuleName) {
                    var moduleName = this.context.amdModuleName(sf);
                    if (moduleName)
                        sf.moduleName = moduleName;
                }
                else if (/node_modules/.test(genFile.genFileUrl)) {
                    // If we are generating an ngModule file under node_modules, we know the right module name
                    // We don't need the host to supply a function in this case.
                    sf.moduleName = stripNodeModulesPrefix(genFile.genFileUrl.replace(EXT, ''));
                }
            }
            this.generatedSourceFiles.set(genFile.genFileUrl, {
                sourceFile: sf,
                emitCtx: context,
                externalReferences: externalReferences,
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
                    // TypeScript doesn't allow returning redirect source files. To avoid unforseen errors we
                    // return the original source file instead of the redirect target.
                    var redirectInfo = sf.redirectInfo;
                    if (redirectInfo !== undefined) {
                        sf = redirectInfo.unredirected;
                    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFvSztJQUNwSywyQkFBNkI7SUFDN0IsK0JBQWlDO0lBSWpDLDJFQUEwQztJQUcxQywwRkFBOEY7SUFDOUYsb0VBQTZFO0lBRTdFLElBQU0seUJBQXlCLEdBQUcsc0RBQXNELENBQUM7SUFDekYsSUFBTSxHQUFHLEdBQUcsa0NBQWtDLENBQUM7SUFDL0MsSUFBTSxvQkFBb0IsR0FBRyxnQ0FBZ0MsQ0FBQztJQUU5RCxJQUFJLGVBQWUsR0FBc0QsSUFBSSxDQUFDO0lBRTlFLFNBQWdCLGtCQUFrQixDQUFDLE1BQ0k7UUFDckMsZUFBZSxHQUFHLE1BQU0sQ0FBQztJQUMzQixDQUFDO0lBSEQsZ0RBR0M7SUFFRCxTQUFnQixrQkFBa0IsQ0FDOUIsRUFDd0Q7WUFEdkQsT0FBTyxhQUFBLEVBQUUsY0FBNkMsRUFBN0MsTUFBTSxtQkFBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFBO1FBRXpELElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtZQUM1QixNQUFNLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ2xDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQVBELGdEQU9DO0lBaUJELFNBQVMsTUFBTSxDQUFJLFNBQTJCO1FBQzVDLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDZCxxQ0FBcUM7U0FDdEM7UUFDRCxPQUFPLFNBQVUsQ0FBQztJQUNwQixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSDtRQTRCRSxtREFDWSxTQUFnQyxFQUFVLE9BQXdCLEVBQ2xFLE9BQXFCLEVBQVUsZ0JBQWtD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Q0FBQztJQUVELFNBQVMsb0JBQW9CLENBQUMsUUFBZ0I7UUFDNUMsSUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hELE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNqQyxDQUFDO0lBRUQsU0FBUyxxQkFBcUIsQ0FBQyxRQUFnQjtRQUM3QyxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELFNBQVMsbUJBQW1CLENBQUMsUUFBZ0I7UUFDM0MsT0FBVSxRQUFRLGtCQUFlLENBQUM7SUFDcEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBb3RDb21waWxlckhvc3QsIGNvbGxlY3RFeHRlcm5hbFJlZmVyZW5jZXMsIEVtaXR0ZXJWaXNpdG9yQ29udGV4dCwgR2VuZXJhdGVkRmlsZSwgUGFyc2VTb3VyY2VTcGFuLCBzeW50YXhFcnJvciwgVHlwZVNjcmlwdEVtaXR0ZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtUeXBlQ2hlY2tIb3N0fSBmcm9tICcuLi9kaWFnbm9zdGljcy90cmFuc2xhdGVfZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtNb2R1bGVNZXRhZGF0YX0gZnJvbSAnLi4vbWV0YWRhdGEvaW5kZXgnO1xuaW1wb3J0IHtqb2lufSBmcm9tICcuLi9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7Q29tcGlsZXJIb3N0LCBDb21waWxlck9wdGlvbnMsIExpYnJhcnlTdW1tYXJ5fSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2NyZWF0ZU1ldGFkYXRhUmVhZGVyQ2FjaGUsIE1ldGFkYXRhUmVhZGVySG9zdCwgcmVhZE1ldGFkYXRhfSBmcm9tICcuL21ldGFkYXRhX3JlYWRlcic7XG5pbXBvcnQge0RUUywgR0VORVJBVEVEX0ZJTEVTLCBpc0luUm9vdERpciwgcmVsYXRpdmVUb1Jvb3REaXJzfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBOT0RFX01PRFVMRVNfUEFDS0FHRV9OQU1FID0gL25vZGVfbW9kdWxlc1xcLygoXFx3fC18XFwuKSt8KEAoXFx3fC18XFwuKStcXC8oXFx3fC18XFwuKSspKS87XG5jb25zdCBFWFQgPSAvKFxcLnRzfFxcLmRcXC50c3xcXC5qc3xcXC5qc3h8XFwudHN4KSQvO1xuY29uc3QgQ1NTX1BSRVBST0NFU1NPUl9FWFQgPSAvKFxcLnNjc3N8XFwuc2Fzc3xcXC5sZXNzfFxcLnN0eWwpJC87XG5cbmxldCB3cmFwSG9zdEZvclRlc3Q6ICgoaG9zdDogdHMuQ29tcGlsZXJIb3N0KSA9PiB0cy5Db21waWxlckhvc3QpfG51bGwgPSBudWxsO1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0V3JhcEhvc3RGb3JUZXN0KHdyYXBGbjogKChob3N0OiB0cy5Db21waWxlckhvc3QpID0+IHRzLkNvbXBpbGVySG9zdCl8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwpOiB2b2lkIHtcbiAgd3JhcEhvc3RGb3JUZXN0ID0gd3JhcEZuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29tcGlsZXJIb3N0KFxuICAgIHtvcHRpb25zLCB0c0hvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3Qob3B0aW9ucywgdHJ1ZSl9OlxuICAgICAgICB7b3B0aW9uczogQ29tcGlsZXJPcHRpb25zLCB0c0hvc3Q/OiB0cy5Db21waWxlckhvc3R9KTogQ29tcGlsZXJIb3N0IHtcbiAgaWYgKHdyYXBIb3N0Rm9yVGVzdCAhPT0gbnVsbCkge1xuICAgIHRzSG9zdCA9IHdyYXBIb3N0Rm9yVGVzdCh0c0hvc3QpO1xuICB9XG4gIHJldHVybiB0c0hvc3Q7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWV0YWRhdGFQcm92aWRlciB7XG4gIGdldE1ldGFkYXRhKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBNb2R1bGVNZXRhZGF0YXx1bmRlZmluZWQ7XG59XG5cbmludGVyZmFjZSBHZW5Tb3VyY2VGaWxlIHtcbiAgZXh0ZXJuYWxSZWZlcmVuY2VzOiBTZXQ8c3RyaW5nPjtcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZTtcbiAgZW1pdEN0eDogRW1pdHRlclZpc2l0b3JDb250ZXh0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvZGVHZW5lcmF0b3Ige1xuICBnZW5lcmF0ZUZpbGUoZ2VuRmlsZU5hbWU6IHN0cmluZywgYmFzZUZpbGVOYW1lPzogc3RyaW5nKTogR2VuZXJhdGVkRmlsZTtcbiAgZmluZEdlbmVyYXRlZEZpbGVOYW1lcyhmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nW107XG59XG5cbmZ1bmN0aW9uIGFzc2VydDxUPihjb25kaXRpb246IFR8bnVsbHx1bmRlZmluZWQpIHtcbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICAvLyBUT0RPKGNodWNramF6KTogZG8gdGhlIHJpZ2h0IHRoaW5nXG4gIH1cbiAgcmV0dXJuIGNvbmRpdGlvbiE7XG59XG5cbi8qKlxuICogSW1wbGVtZW50cyB0aGUgZm9sbG93aW5nIGhvc3RzIGJhc2VkIG9uIGFuIGFwaS5Db21waWxlckhvc3Q6XG4gKiAtIHRzLkNvbXBpbGVySG9zdCB0byBiZSBjb25zdW1lZCBieSBhIHRzLlByb2dyYW1cbiAqIC0gQW90Q29tcGlsZXJIb3N0IGZvciBAYW5ndWxhci9jb21waWxlclxuICogLSBUeXBlQ2hlY2tIb3N0IGZvciBtYXBwaW5nIHRzIGVycm9ycyB0byBuZyBlcnJvcnMgKHZpYSB0cmFuc2xhdGVEaWFnbm9zdGljcylcbiAqL1xuZXhwb3J0IGNsYXNzIFRzQ29tcGlsZXJBb3RDb21waWxlclR5cGVDaGVja0hvc3RBZGFwdGVyIGltcGxlbWVudHMgdHMuQ29tcGlsZXJIb3N0LCBBb3RDb21waWxlckhvc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBUeXBlQ2hlY2tIb3N0IHtcbiAgcHJpdmF0ZSBtZXRhZGF0YVJlYWRlckNhY2hlID0gY3JlYXRlTWV0YWRhdGFSZWFkZXJDYWNoZSgpO1xuICBwcml2YXRlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIGZsYXRNb2R1bGVJbmRleENhY2hlID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KCk7XG4gIHByaXZhdGUgZmxhdE1vZHVsZUluZGV4TmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgcHJpdmF0ZSBmbGF0TW9kdWxlSW5kZXhSZWRpcmVjdE5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHByaXZhdGUgcm9vdERpcnM6IHN0cmluZ1tdO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdXRpb25DYWNoZTogdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlO1xuICBwcml2YXRlIG9yaWdpbmFsU291cmNlRmlsZXMgPSBuZXcgTWFwPHN0cmluZywgdHMuU291cmNlRmlsZXxudWxsPigpO1xuICBwcml2YXRlIG9yaWdpbmFsRmlsZUV4aXN0c0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KCk7XG4gIHByaXZhdGUgZ2VuZXJhdGVkU291cmNlRmlsZXMgPSBuZXcgTWFwPHN0cmluZywgR2VuU291cmNlRmlsZT4oKTtcbiAgcHJpdmF0ZSBnZW5lcmF0ZWRDb2RlRm9yID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xuICBwcml2YXRlIGVtaXR0ZXIgPSBuZXcgVHlwZVNjcmlwdEVtaXR0ZXIoKTtcbiAgcHJpdmF0ZSBtZXRhZGF0YVJlYWRlckhvc3Q6IE1ldGFkYXRhUmVhZGVySG9zdDtcblxuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgZ2V0Q2FuY2VsbGF0aW9uVG9rZW4hOiAoKSA9PiB0cy5DYW5jZWxsYXRpb25Ub2tlbjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIGdldERlZmF1bHRMaWJMb2NhdGlvbiE6ICgpID0+IHN0cmluZztcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHRyYWNlITogKHM6IHN0cmluZykgPT4gdm9pZDtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIGdldERpcmVjdG9yaWVzITogKHBhdGg6IHN0cmluZykgPT4gc3RyaW5nW107XG4gIHJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcz86XG4gICAgICAobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKSA9PiB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXTtcbiAgZGlyZWN0b3J5RXhpc3RzPzogKGRpcmVjdG9yeU5hbWU6IHN0cmluZykgPT4gYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm9vdEZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sIHByaXZhdGUgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBjb250ZXh0OiBDb21waWxlckhvc3QsIHByaXZhdGUgbWV0YWRhdGFQcm92aWRlcjogTWV0YWRhdGFQcm92aWRlcixcbiAgICAgIHByaXZhdGUgY29kZUdlbmVyYXRvcjogQ29kZUdlbmVyYXRvcixcbiAgICAgIHByaXZhdGUgbGlicmFyeVN1bW1hcmllcyA9IG5ldyBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4oKSkge1xuICAgIHRoaXMubW9kdWxlUmVzb2x1dGlvbkNhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKFxuICAgICAgICB0aGlzLmNvbnRleHQuZ2V0Q3VycmVudERpcmVjdG9yeSEoKSwgdGhpcy5jb250ZXh0LmdldENhbm9uaWNhbEZpbGVOYW1lLmJpbmQodGhpcy5jb250ZXh0KSk7XG4gICAgY29uc3QgYmFzZVBhdGggPSB0aGlzLm9wdGlvbnMuYmFzZVBhdGghO1xuICAgIHRoaXMucm9vdERpcnMgPVxuICAgICAgICAodGhpcy5vcHRpb25zLnJvb3REaXJzIHx8IFt0aGlzLm9wdGlvbnMuYmFzZVBhdGghXSkubWFwKHAgPT4gcGF0aC5yZXNvbHZlKGJhc2VQYXRoLCBwKSk7XG4gICAgaWYgKGNvbnRleHQuZ2V0RGlyZWN0b3JpZXMpIHtcbiAgICAgIHRoaXMuZ2V0RGlyZWN0b3JpZXMgPSBwYXRoID0+IGNvbnRleHQuZ2V0RGlyZWN0b3JpZXMhKHBhdGgpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5kaXJlY3RvcnlFeGlzdHMpIHtcbiAgICAgIHRoaXMuZGlyZWN0b3J5RXhpc3RzID0gZGlyZWN0b3J5TmFtZSA9PiBjb250ZXh0LmRpcmVjdG9yeUV4aXN0cyEoZGlyZWN0b3J5TmFtZSk7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LmdldENhbmNlbGxhdGlvblRva2VuKSB7XG4gICAgICB0aGlzLmdldENhbmNlbGxhdGlvblRva2VuID0gKCkgPT4gY29udGV4dC5nZXRDYW5jZWxsYXRpb25Ub2tlbiEoKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQuZ2V0RGVmYXVsdExpYkxvY2F0aW9uKSB7XG4gICAgICB0aGlzLmdldERlZmF1bHRMaWJMb2NhdGlvbiA9ICgpID0+IGNvbnRleHQuZ2V0RGVmYXVsdExpYkxvY2F0aW9uISgpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5yZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMpIHtcbiAgICAgIC8vIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBUeXBlU2NyaXB0IDIuOSBhbmQgb2xkZXIgc2luY2UgcmV0dXJuXG4gICAgICAvLyB0eXBlIGhhcyBjaGFuZ2VkIGZyb20gKHRzLlJlc29sdmVkVHlwZVJlZmVyZW5jZURpcmVjdGl2ZSB8IHVuZGVmaW5lZClbXVxuICAgICAgLy8gdG8gdHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlW10gaW4gVHlwZXNjcmlwdCAzLjBcbiAgICAgIHR5cGUgdHMzUmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzID0gKG5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZykgPT5cbiAgICAgICAgICB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXTtcbiAgICAgIHRoaXMucmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzID0gKG5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZykgPT5cbiAgICAgICAgICAoY29udGV4dC5yZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMgYXMgdHMzUmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzKSFcbiAgICAgICAgICAobmFtZXMsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQudHJhY2UpIHtcbiAgICAgIHRoaXMudHJhY2UgPSBzID0+IGNvbnRleHQudHJhY2UhKHMpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5maWxlTmFtZVRvTW9kdWxlTmFtZSkge1xuICAgICAgdGhpcy5maWxlTmFtZVRvTW9kdWxlTmFtZSA9IGNvbnRleHQuZmlsZU5hbWVUb01vZHVsZU5hbWUuYmluZChjb250ZXh0KTtcbiAgICB9XG4gICAgLy8gTm90ZTogZG9uJ3QgY29weSBvdmVyIGNvbnRleHQubW9kdWxlTmFtZVRvRmlsZU5hbWUgYXMgd2UgZmlyc3RcbiAgICAvLyBub3JtYWxpemUgdW5kZWZpbmVkIGNvbnRhaW5pbmdGaWxlIHRvIGEgZmlsbGVkIGNvbnRhaW5pbmdGaWxlLlxuICAgIGlmIChjb250ZXh0LnJlc291cmNlTmFtZVRvRmlsZU5hbWUpIHtcbiAgICAgIHRoaXMucmVzb3VyY2VOYW1lVG9GaWxlTmFtZSA9IGNvbnRleHQucmVzb3VyY2VOYW1lVG9GaWxlTmFtZS5iaW5kKGNvbnRleHQpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC50b1N1bW1hcnlGaWxlTmFtZSkge1xuICAgICAgdGhpcy50b1N1bW1hcnlGaWxlTmFtZSA9IGNvbnRleHQudG9TdW1tYXJ5RmlsZU5hbWUuYmluZChjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQuZnJvbVN1bW1hcnlGaWxlTmFtZSkge1xuICAgICAgdGhpcy5mcm9tU3VtbWFyeUZpbGVOYW1lID0gY29udGV4dC5mcm9tU3VtbWFyeUZpbGVOYW1lLmJpbmQoY29udGV4dCk7XG4gICAgfVxuICAgIHRoaXMubWV0YWRhdGFSZWFkZXJIb3N0ID0ge1xuICAgICAgY2FjaGVNZXRhZGF0YTogKCkgPT4gdHJ1ZSxcbiAgICAgIGdldFNvdXJjZUZpbGVNZXRhZGF0YTogKGZpbGVQYXRoKSA9PiB7XG4gICAgICAgIGNvbnN0IHNmID0gdGhpcy5nZXRPcmlnaW5hbFNvdXJjZUZpbGUoZmlsZVBhdGgpO1xuICAgICAgICByZXR1cm4gc2YgPyB0aGlzLm1ldGFkYXRhUHJvdmlkZXIuZ2V0TWV0YWRhdGEoc2YpIDogdW5kZWZpbmVkO1xuICAgICAgfSxcbiAgICAgIGZpbGVFeGlzdHM6IChmaWxlUGF0aCkgPT4gdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMoZmlsZVBhdGgpLFxuICAgICAgcmVhZEZpbGU6IChmaWxlUGF0aCkgPT4gYXNzZXJ0KHRoaXMuY29udGV4dC5yZWFkRmlsZShmaWxlUGF0aCkpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVNb2R1bGVOYW1lKG1vZHVsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHRzLlJlc29sdmVkTW9kdWxlXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBybSA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKFxuICAgICAgICAgICAgICAgICAgICAgbW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLCB0aGlzLm9wdGlvbnMsIHRoaXMsXG4gICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZHVsZVJlc29sdXRpb25DYWNoZSlcbiAgICAgICAgICAgICAgICAgICAucmVzb2x2ZWRNb2R1bGU7XG4gICAgaWYgKHJtICYmIHRoaXMuaXNTb3VyY2VGaWxlKHJtLnJlc29sdmVkRmlsZU5hbWUpICYmIERUUy50ZXN0KHJtLnJlc29sdmVkRmlsZU5hbWUpKSB7XG4gICAgICAvLyBDYXNlOiBnZW5lcmF0ZUNvZGVGb3JMaWJyYXJpZXMgPSB0cnVlIGFuZCBtb2R1bGVOYW1lIGlzXG4gICAgICAvLyBhIC5kLnRzIGZpbGUgaW4gYSBub2RlX21vZHVsZXMgZm9sZGVyLlxuICAgICAgLy8gTmVlZCB0byBzZXQgaXNFeHRlcm5hbExpYnJhcnlJbXBvcnQgdG8gZmFsc2Ugc28gdGhhdCBnZW5lcmF0ZWQgZmlsZXMgZm9yIHRoYXQgZmlsZVxuICAgICAgLy8gYXJlIGVtaXR0ZWQuXG4gICAgICBybS5pc0V4dGVybmFsTGlicmFyeUltcG9ydCA9IGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gcm07XG4gIH1cblxuICAvLyBOb3RlOiBXZSBpbXBsZW1lbnQgdGhpcyBtZXRob2Qgc28gdGhhdCBUeXBlU2NyaXB0IGFuZCBBbmd1bGFyIHNoYXJlIHRoZSBzYW1lXG4gIC8vIHRzLk1vZHVsZVJlc29sdXRpb25DYWNoZVxuICAvLyBhbmQgdGhhdCB3ZSBjYW4gdGVsbCB0cy5Qcm9ncmFtIGFib3V0IG91ciBkaWZmZXJlbnQgb3BpbmlvbiBhYm91dFxuICAvLyBSZXNvbHZlZE1vZHVsZS5pc0V4dGVybmFsTGlicmFyeUltcG9ydFxuICAvLyAoc2VlIG91ciBpc1NvdXJjZUZpbGUgbWV0aG9kKS5cbiAgcmVzb2x2ZU1vZHVsZU5hbWVzKG1vZHVsZU5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHRzLlJlc29sdmVkTW9kdWxlW10ge1xuICAgIC8vIFRPRE8odGJvc2NoKTogdGhpcyBzZWVtcyB0byBiZSBhIHR5cGluZyBlcnJvciBpbiBUeXBlU2NyaXB0LFxuICAgIC8vIGFzIGl0IGNvbnRhaW5zIGFzc2VydGlvbnMgdGhhdCB0aGUgcmVzdWx0IGNvbnRhaW5zIHRoZSBzYW1lIG51bWJlciBvZiBlbnRyaWVzXG4gICAgLy8gYXMgdGhlIGdpdmVuIG1vZHVsZSBuYW1lcy5cbiAgICByZXR1cm4gPHRzLlJlc29sdmVkTW9kdWxlW10+bW9kdWxlTmFtZXMubWFwKFxuICAgICAgICBtb2R1bGVOYW1lID0+IHRoaXMucmVzb2x2ZU1vZHVsZU5hbWUobW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUpKTtcbiAgfVxuXG4gIG1vZHVsZU5hbWVUb0ZpbGVOYW1lKG06IHN0cmluZywgY29udGFpbmluZ0ZpbGU/OiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKCFjb250YWluaW5nRmlsZSkge1xuICAgICAgaWYgKG0uaW5kZXhPZignLicpID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVzb2x1dGlvbiBvZiByZWxhdGl2ZSBwYXRocyByZXF1aXJlcyBhIGNvbnRhaW5pbmcgZmlsZS4nKTtcbiAgICAgIH1cbiAgICAgIC8vIEFueSBjb250YWluaW5nIGZpbGUgZ2l2ZXMgdGhlIHNhbWUgcmVzdWx0IGZvciBhYnNvbHV0ZSBpbXBvcnRzXG4gICAgICBjb250YWluaW5nRmlsZSA9IHRoaXMucm9vdEZpbGVzWzBdO1xuICAgIH1cbiAgICBpZiAodGhpcy5jb250ZXh0Lm1vZHVsZU5hbWVUb0ZpbGVOYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb250ZXh0Lm1vZHVsZU5hbWVUb0ZpbGVOYW1lKG0sIGNvbnRhaW5pbmdGaWxlKTtcbiAgICB9XG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKG0sIGNvbnRhaW5pbmdGaWxlKTtcbiAgICByZXR1cm4gcmVzb2x2ZWQgPyByZXNvbHZlZC5yZXNvbHZlZEZpbGVOYW1lIDogbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBXZSB3YW50IGEgbW9kdWxlSWQgdGhhdCB3aWxsIGFwcGVhciBpbiBpbXBvcnQgc3RhdGVtZW50cyBpbiB0aGUgZ2VuZXJhdGVkIGNvZGVcbiAgICogd2hpY2ggd2lsbCBiZSB3cml0dGVuIHRvIGBjb250YWluaW5nRmlsZWAuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB3ZSBhbHNvIGdlbmVyYXRlIGZpbGVzIGZvciBmaWxlcyBpbiBub2RlX21vZHVsZXMsIGFzIGxpYnJhcmllc1xuICAgKiBvbmx5IHNoaXAgLm1ldGFkYXRhLmpzb24gZmlsZXMgYnV0IG5vdCB0aGUgZ2VuZXJhdGVkIGNvZGUuXG4gICAqXG4gICAqIExvZ2ljOlxuICAgKiAxLiBpZiB0aGUgaW1wb3J0ZWRGaWxlIGFuZCB0aGUgY29udGFpbmluZ0ZpbGUgYXJlIGZyb20gdGhlIHByb2plY3Qgc291cmNlc1xuICAgKiAgICBvciBmcm9tIHRoZSBzYW1lIG5vZGVfbW9kdWxlcyBwYWNrYWdlLCB1c2UgYSByZWxhdGl2ZSBwYXRoXG4gICAqIDIuIGlmIHRoZSBpbXBvcnRlZEZpbGUgaXMgaW4gYSBub2RlX21vZHVsZXMgcGFja2FnZSxcbiAgICogICAgdXNlIGEgcGF0aCB0aGF0IHN0YXJ0cyB3aXRoIHRoZSBwYWNrYWdlIG5hbWUuXG4gICAqIDMuIEVycm9yIGlmIHRoZSBjb250YWluaW5nRmlsZSBpcyBpbiB0aGUgbm9kZV9tb2R1bGVzIHBhY2thZ2VcbiAgICogICAgYW5kIHRoZSBpbXBvcnRlZEZpbGUgaXMgaW4gdGhlIHByb2plY3Qgc291cmVzLFxuICAgKiAgICBhcyB0aGF0IGlzIGEgdmlvbGF0aW9uIG9mIHRoZSBwcmluY2lwbGUgdGhhdCBub2RlX21vZHVsZXMgcGFja2FnZXMgY2Fubm90XG4gICAqICAgIGltcG9ydCBwcm9qZWN0IHNvdXJjZXMuXG4gICAqL1xuICBmaWxlTmFtZVRvTW9kdWxlTmFtZShpbXBvcnRlZEZpbGU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgY2FjaGVLZXkgPSBgJHtpbXBvcnRlZEZpbGV9OiR7Y29udGFpbmluZ0ZpbGV9YDtcbiAgICBsZXQgbW9kdWxlTmFtZSA9IHRoaXMuZmlsZU5hbWVUb01vZHVsZU5hbWVDYWNoZS5nZXQoY2FjaGVLZXkpO1xuICAgIGlmIChtb2R1bGVOYW1lICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBtb2R1bGVOYW1lO1xuICAgIH1cblxuICAgIGNvbnN0IG9yaWdpbmFsSW1wb3J0ZWRGaWxlID0gaW1wb3J0ZWRGaWxlO1xuICAgIGlmICh0aGlzLm9wdGlvbnMudHJhY2VSZXNvbHV0aW9uKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICdmaWxlTmFtZVRvTW9kdWxlTmFtZSBmcm9tIGNvbnRhaW5pbmdGaWxlJywgY29udGFpbmluZ0ZpbGUsICd0byBpbXBvcnRlZEZpbGUnLFxuICAgICAgICAgIGltcG9ydGVkRmlsZSk7XG4gICAgfVxuXG4gICAgLy8gZHJvcCBleHRlbnNpb25cbiAgICBpbXBvcnRlZEZpbGUgPSBpbXBvcnRlZEZpbGUucmVwbGFjZShFWFQsICcnKTtcbiAgICBjb25zdCBpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZSA9IGdldFBhY2thZ2VOYW1lKGltcG9ydGVkRmlsZSk7XG4gICAgY29uc3QgY29udGFpbmluZ0ZpbGVQYWNrYWdlTmFtZSA9IGdldFBhY2thZ2VOYW1lKGNvbnRhaW5pbmdGaWxlKTtcblxuICAgIGlmIChpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZSA9PT0gY29udGFpbmluZ0ZpbGVQYWNrYWdlTmFtZSB8fFxuICAgICAgICBHRU5FUkFURURfRklMRVMudGVzdChvcmlnaW5hbEltcG9ydGVkRmlsZSkpIHtcbiAgICAgIGNvbnN0IHJvb3RlZENvbnRhaW5pbmdGaWxlID0gcmVsYXRpdmVUb1Jvb3REaXJzKGNvbnRhaW5pbmdGaWxlLCB0aGlzLnJvb3REaXJzKTtcbiAgICAgIGNvbnN0IHJvb3RlZEltcG9ydGVkRmlsZSA9IHJlbGF0aXZlVG9Sb290RGlycyhpbXBvcnRlZEZpbGUsIHRoaXMucm9vdERpcnMpO1xuXG4gICAgICBpZiAocm9vdGVkQ29udGFpbmluZ0ZpbGUgIT09IGNvbnRhaW5pbmdGaWxlICYmIHJvb3RlZEltcG9ydGVkRmlsZSAhPT0gaW1wb3J0ZWRGaWxlKSB7XG4gICAgICAgIC8vIGlmIGJvdGggZmlsZXMgYXJlIGNvbnRhaW5lZCBpbiB0aGUgYHJvb3REaXJzYCwgdGhlbiBzdHJpcCB0aGUgcm9vdERpcnNcbiAgICAgICAgY29udGFpbmluZ0ZpbGUgPSByb290ZWRDb250YWluaW5nRmlsZTtcbiAgICAgICAgaW1wb3J0ZWRGaWxlID0gcm9vdGVkSW1wb3J0ZWRGaWxlO1xuICAgICAgfVxuICAgICAgbW9kdWxlTmFtZSA9IGRvdFJlbGF0aXZlKHBhdGguZGlybmFtZShjb250YWluaW5nRmlsZSksIGltcG9ydGVkRmlsZSk7XG4gICAgfSBlbHNlIGlmIChpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZSkge1xuICAgICAgbW9kdWxlTmFtZSA9IHN0cmlwTm9kZU1vZHVsZXNQcmVmaXgoaW1wb3J0ZWRGaWxlKTtcbiAgICAgIGlmIChvcmlnaW5hbEltcG9ydGVkRmlsZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAvLyB0aGUgbW9kdWxlTmFtZSBmb3IgdGhlc2UgdHlwaW5ncyBjb3VsZCBiZSBzaG9ydGVudGVkIHRvIHRoZSBucG0gcGFja2FnZSBuYW1lXG4gICAgICAgIC8vIGlmIHRoZSBucG0gcGFja2FnZSB0eXBpbmdzIG1hdGNoZXMgdGhlIGltcG9ydGVkRmlsZVxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG1vZHVsZVBhdGggPSBpbXBvcnRlZEZpbGUuc3Vic3RyaW5nKDAsIGltcG9ydGVkRmlsZS5sZW5ndGggLSBtb2R1bGVOYW1lLmxlbmd0aCkgK1xuICAgICAgICAgICAgICBpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZTtcbiAgICAgICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IHJlcXVpcmUobW9kdWxlUGF0aCArICcvcGFja2FnZS5qc29uJyk7XG4gICAgICAgICAgY29uc3QgcGFja2FnZVR5cGluZ3MgPSBqb2luKG1vZHVsZVBhdGgsIHBhY2thZ2VKc29uLnR5cGluZ3MpO1xuICAgICAgICAgIGlmIChwYWNrYWdlVHlwaW5ncyA9PT0gb3JpZ2luYWxJbXBvcnRlZEZpbGUpIHtcbiAgICAgICAgICAgIG1vZHVsZU5hbWUgPSBpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIHRoZSBhYm92ZSByZXF1aXJlKCkgd2lsbCB0aHJvdyBpZiB0aGVyZSBpcyBubyBwYWNrYWdlLmpzb24gZmlsZVxuICAgICAgICAgIC8vIGFuZCB0aGlzIGlzIHNhZmUgdG8gaWdub3JlIGFuZCBjb3JyZWN0IHRvIGtlZXAgdGhlIGxvbmdlclxuICAgICAgICAgIC8vIG1vZHVsZU5hbWUgaW4gdGhpcyBjYXNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUcnlpbmcgdG8gaW1wb3J0IGEgc291cmNlIGZpbGUgZnJvbSBhIG5vZGVfbW9kdWxlcyBwYWNrYWdlOiBpbXBvcnQgJHtcbiAgICAgICAgICBvcmlnaW5hbEltcG9ydGVkRmlsZX0gZnJvbSAke2NvbnRhaW5pbmdGaWxlfWApO1xuICAgIH1cblxuICAgIHRoaXMuZmlsZU5hbWVUb01vZHVsZU5hbWVDYWNoZS5zZXQoY2FjaGVLZXksIG1vZHVsZU5hbWUpO1xuICAgIHJldHVybiBtb2R1bGVOYW1lO1xuICB9XG5cbiAgcmVzb3VyY2VOYW1lVG9GaWxlTmFtZShyZXNvdXJjZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgICAvLyBOb3RlOiB3ZSBjb252ZXJ0IHBhY2thZ2UgcGF0aHMgaW50byByZWxhdGl2ZSBwYXRocyB0byBiZSBjb21wYXRpYmxlIHdpdGggdGhlIHRoZVxuICAgIC8vIHByZXZpb3VzIGltcGxlbWVudGF0aW9uIG9mIFVybFJlc29sdmVyLlxuICAgIGNvbnN0IGZpcnN0Q2hhciA9IHJlc291cmNlTmFtZVswXTtcbiAgICBpZiAoZmlyc3RDaGFyID09PSAnLycpIHtcbiAgICAgIHJlc291cmNlTmFtZSA9IHJlc291cmNlTmFtZS5zbGljZSgxKTtcbiAgICB9IGVsc2UgaWYgKGZpcnN0Q2hhciAhPT0gJy4nKSB7XG4gICAgICByZXNvdXJjZU5hbWUgPSBgLi8ke3Jlc291cmNlTmFtZX1gO1xuICAgIH1cbiAgICBsZXQgZmlsZVBhdGhXaXRoTmdSZXNvdXJjZSA9XG4gICAgICAgIHRoaXMubW9kdWxlTmFtZVRvRmlsZU5hbWUoYWRkTmdSZXNvdXJjZVN1ZmZpeChyZXNvdXJjZU5hbWUpLCBjb250YWluaW5nRmlsZSk7XG4gICAgLy8gSWYgdGhlIHVzZXIgc3BlY2lmaWVkIHN0eWxlVXJsIHBvaW50aW5nIHRvICouc2NzcywgYnV0IHRoZSBTYXNzIGNvbXBpbGVyIHdhcyBydW4gYmVmb3JlXG4gICAgLy8gQW5ndWxhciwgdGhlbiB0aGUgcmVzb3VyY2UgbWF5IGhhdmUgYmVlbiBnZW5lcmF0ZWQgYXMgKi5jc3MuIFNpbXBseSB0cnkgdGhlIHJlc29sdXRpb24gYWdhaW4uXG4gICAgaWYgKCFmaWxlUGF0aFdpdGhOZ1Jlc291cmNlICYmIENTU19QUkVQUk9DRVNTT1JfRVhULnRlc3QocmVzb3VyY2VOYW1lKSkge1xuICAgICAgY29uc3QgZmFsbGJhY2tSZXNvdXJjZU5hbWUgPSByZXNvdXJjZU5hbWUucmVwbGFjZShDU1NfUFJFUFJPQ0VTU09SX0VYVCwgJy5jc3MnKTtcbiAgICAgIGZpbGVQYXRoV2l0aE5nUmVzb3VyY2UgPVxuICAgICAgICAgIHRoaXMubW9kdWxlTmFtZVRvRmlsZU5hbWUoYWRkTmdSZXNvdXJjZVN1ZmZpeChmYWxsYmFja1Jlc291cmNlTmFtZSksIGNvbnRhaW5pbmdGaWxlKTtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gZmlsZVBhdGhXaXRoTmdSZXNvdXJjZSA/IHN0cmlwTmdSZXNvdXJjZVN1ZmZpeChmaWxlUGF0aFdpdGhOZ1Jlc291cmNlKSA6IG51bGw7XG4gICAgLy8gVXNlZCB1bmRlciBCYXplbCB0byByZXBvcnQgbW9yZSBzcGVjaWZpYyBlcnJvciB3aXRoIHJlbWVkaWF0aW9uIGFkdmljZVxuICAgIGlmICghcmVzdWx0ICYmICh0aGlzLmNvbnRleHQgYXMgYW55KS5yZXBvcnRNaXNzaW5nUmVzb3VyY2UpIHtcbiAgICAgICh0aGlzLmNvbnRleHQgYXMgYW55KS5yZXBvcnRNaXNzaW5nUmVzb3VyY2UocmVzb3VyY2VOYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHRvU3VtbWFyeUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcsIHJlZmVycmluZ1NyY0ZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmZpbGVOYW1lVG9Nb2R1bGVOYW1lKGZpbGVOYW1lLCByZWZlcnJpbmdTcmNGaWxlTmFtZSk7XG4gIH1cblxuICBmcm9tU3VtbWFyeUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcsIHJlZmVycmluZ0xpYkZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5tb2R1bGVOYW1lVG9GaWxlTmFtZShmaWxlTmFtZSwgcmVmZXJyaW5nTGliRmlsZU5hbWUpO1xuICAgIGlmICghcmVzb2x2ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgJHtmaWxlTmFtZX0gZnJvbSAke3JlZmVycmluZ0xpYkZpbGVOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gIH1cblxuICBwYXJzZVNvdXJjZVNwYW5PZihmaWxlTmFtZTogc3RyaW5nLCBsaW5lOiBudW1iZXIsIGNoYXJhY3RlcjogbnVtYmVyKTogUGFyc2VTb3VyY2VTcGFufG51bGwge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdlbmVyYXRlZFNvdXJjZUZpbGVzLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKGRhdGEgJiYgZGF0YS5lbWl0Q3R4KSB7XG4gICAgICByZXR1cm4gZGF0YS5lbWl0Q3R4LnNwYW5PZihsaW5lLCBjaGFyYWN0ZXIpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0T3JpZ2luYWxTb3VyY2VGaWxlKFxuICAgICAgZmlsZVBhdGg6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uPzogdHMuU2NyaXB0VGFyZ2V0LFxuICAgICAgb25FcnJvcj86ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQpOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICAgIC8vIE5vdGU6IHdlIG5lZWQgdGhlIGV4cGxpY2l0IGNoZWNrIHZpYSBgaGFzYCBhcyB3ZSBhbHNvIGNhY2hlIHJlc3VsdHNcbiAgICAvLyB0aGF0IHdlcmUgbnVsbCAvIHVuZGVmaW5lZC5cbiAgICBpZiAodGhpcy5vcmlnaW5hbFNvdXJjZUZpbGVzLmhhcyhmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiB0aGlzLm9yaWdpbmFsU291cmNlRmlsZXMuZ2V0KGZpbGVQYXRoKSE7XG4gICAgfVxuICAgIGlmICghbGFuZ3VhZ2VWZXJzaW9uKSB7XG4gICAgICBsYW5ndWFnZVZlcnNpb24gPSB0aGlzLm9wdGlvbnMudGFyZ2V0IHx8IHRzLlNjcmlwdFRhcmdldC5MYXRlc3Q7XG4gICAgfVxuICAgIC8vIE5vdGU6IFRoaXMgY2FuIGFsc28gcmV0dXJuIHVuZGVmaW5lZCxcbiAgICAvLyBhcyB0aGUgVFMgdHlwaW5ncyBhcmUgbm90IGNvcnJlY3QhXG4gICAgY29uc3Qgc2YgPSB0aGlzLmNvbnRleHQuZ2V0U291cmNlRmlsZShmaWxlUGF0aCwgbGFuZ3VhZ2VWZXJzaW9uLCBvbkVycm9yKSB8fCBudWxsO1xuICAgIHRoaXMub3JpZ2luYWxTb3VyY2VGaWxlcy5zZXQoZmlsZVBhdGgsIHNmKTtcbiAgICByZXR1cm4gc2Y7XG4gIH1cblxuICB1cGRhdGVHZW5lcmF0ZWRGaWxlKGdlbkZpbGU6IEdlbmVyYXRlZEZpbGUpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICBpZiAoIWdlbkZpbGUuc3RtdHMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgSW52YWxpZCBBcmd1bWVudDogRXhwZWN0ZWQgYSBHZW5lcmF0ZUZpbGUgd2l0aCBzdGF0ZW1lbnRzLiAke2dlbkZpbGUuZ2VuRmlsZVVybH1gKTtcbiAgICB9XG4gICAgY29uc3Qgb2xkR2VuRmlsZSA9IHRoaXMuZ2VuZXJhdGVkU291cmNlRmlsZXMuZ2V0KGdlbkZpbGUuZ2VuRmlsZVVybCk7XG4gICAgaWYgKCFvbGRHZW5GaWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYElsbGVnYWwgU3RhdGU6IHByZXZpb3VzIEdlbmVyYXRlZEZpbGUgbm90IGZvdW5kIGZvciAke2dlbkZpbGUuZ2VuRmlsZVVybH0uYCk7XG4gICAgfVxuICAgIGNvbnN0IG5ld1JlZnMgPSBnZW5GaWxlRXh0ZXJuYWxSZWZlcmVuY2VzKGdlbkZpbGUpO1xuICAgIGNvbnN0IG9sZFJlZnMgPSBvbGRHZW5GaWxlLmV4dGVybmFsUmVmZXJlbmNlcztcbiAgICBsZXQgcmVmc0FyZUVxdWFsID0gb2xkUmVmcy5zaXplID09PSBuZXdSZWZzLnNpemU7XG4gICAgaWYgKHJlZnNBcmVFcXVhbCkge1xuICAgICAgbmV3UmVmcy5mb3JFYWNoKHIgPT4gcmVmc0FyZUVxdWFsID0gcmVmc0FyZUVxdWFsICYmIG9sZFJlZnMuaGFzKHIpKTtcbiAgICB9XG4gICAgaWYgKCFyZWZzQXJlRXF1YWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSWxsZWdhbCBTdGF0ZTogZXh0ZXJuYWwgcmVmZXJlbmNlcyBjaGFuZ2VkIGluICR7Z2VuRmlsZS5nZW5GaWxlVXJsfS5cXG5PbGQ6ICR7XG4gICAgICAgICAgQXJyYXkuZnJvbShvbGRSZWZzKX0uXFxuTmV3OiAke0FycmF5LmZyb20obmV3UmVmcyl9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFkZEdlbmVyYXRlZEZpbGUoZ2VuRmlsZSwgbmV3UmVmcyk7XG4gIH1cblxuICBwcml2YXRlIGFkZEdlbmVyYXRlZEZpbGUoZ2VuRmlsZTogR2VuZXJhdGVkRmlsZSwgZXh0ZXJuYWxSZWZlcmVuY2VzOiBTZXQ8c3RyaW5nPik6IHRzLlNvdXJjZUZpbGUge1xuICAgIGlmICghZ2VuRmlsZS5zdG10cykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbnZhbGlkIEFyZ3VtZW50OiBFeHBlY3RlZCBhIEdlbmVyYXRlRmlsZSB3aXRoIHN0YXRlbWVudHMuICR7Z2VuRmlsZS5nZW5GaWxlVXJsfWApO1xuICAgIH1cbiAgICBjb25zdCB7c291cmNlVGV4dCwgY29udGV4dH0gPSB0aGlzLmVtaXR0ZXIuZW1pdFN0YXRlbWVudHNBbmRDb250ZXh0KFxuICAgICAgICBnZW5GaWxlLmdlbkZpbGVVcmwsIGdlbkZpbGUuc3RtdHMsIC8qIHByZWFtYmxlICovICcnLFxuICAgICAgICAvKiBlbWl0U291cmNlTWFwcyAqLyBmYWxzZSk7XG4gICAgY29uc3Qgc2YgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICBnZW5GaWxlLmdlbkZpbGVVcmwsIHNvdXJjZVRleHQsIHRoaXMub3B0aW9ucy50YXJnZXQgfHwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5tb2R1bGUgPT09IHRzLk1vZHVsZUtpbmQuQU1EIHx8IHRoaXMub3B0aW9ucy5tb2R1bGUgPT09IHRzLk1vZHVsZUtpbmQuVU1EKSB7XG4gICAgICBpZiAodGhpcy5jb250ZXh0LmFtZE1vZHVsZU5hbWUpIHtcbiAgICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IHRoaXMuY29udGV4dC5hbWRNb2R1bGVOYW1lKHNmKTtcbiAgICAgICAgaWYgKG1vZHVsZU5hbWUpIHNmLm1vZHVsZU5hbWUgPSBtb2R1bGVOYW1lO1xuICAgICAgfSBlbHNlIGlmICgvbm9kZV9tb2R1bGVzLy50ZXN0KGdlbkZpbGUuZ2VuRmlsZVVybCkpIHtcbiAgICAgICAgLy8gSWYgd2UgYXJlIGdlbmVyYXRpbmcgYW4gbmdNb2R1bGUgZmlsZSB1bmRlciBub2RlX21vZHVsZXMsIHdlIGtub3cgdGhlIHJpZ2h0IG1vZHVsZSBuYW1lXG4gICAgICAgIC8vIFdlIGRvbid0IG5lZWQgdGhlIGhvc3QgdG8gc3VwcGx5IGEgZnVuY3Rpb24gaW4gdGhpcyBjYXNlLlxuICAgICAgICBzZi5tb2R1bGVOYW1lID0gc3RyaXBOb2RlTW9kdWxlc1ByZWZpeChnZW5GaWxlLmdlbkZpbGVVcmwucmVwbGFjZShFWFQsICcnKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuZ2VuZXJhdGVkU291cmNlRmlsZXMuc2V0KGdlbkZpbGUuZ2VuRmlsZVVybCwge1xuICAgICAgc291cmNlRmlsZTogc2YsXG4gICAgICBlbWl0Q3R4OiBjb250ZXh0LFxuICAgICAgZXh0ZXJuYWxSZWZlcmVuY2VzLFxuICAgIH0pO1xuICAgIHJldHVybiBzZjtcbiAgfVxuXG4gIHNob3VsZEdlbmVyYXRlRmlsZShmaWxlTmFtZTogc3RyaW5nKToge2dlbmVyYXRlOiBib29sZWFuLCBiYXNlRmlsZU5hbWU/OiBzdHJpbmd9IHtcbiAgICAvLyBUT0RPKHRib3NjaCk6IGFsbG93IGdlbmVyYXRpbmcgZmlsZXMgdGhhdCBhcmUgbm90IGluIHRoZSByb290RGlyXG4gICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzE5MzM3XG4gICAgaWYgKCFpc0luUm9vdERpcihmaWxlTmFtZSwgdGhpcy5vcHRpb25zKSkge1xuICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgIH1cbiAgICBjb25zdCBnZW5NYXRjaCA9IEdFTkVSQVRFRF9GSUxFUy5leGVjKGZpbGVOYW1lKTtcbiAgICBpZiAoIWdlbk1hdGNoKSB7XG4gICAgICByZXR1cm4ge2dlbmVyYXRlOiBmYWxzZX07XG4gICAgfVxuICAgIGNvbnN0IFssIGJhc2UsIGdlblN1ZmZpeCwgc3VmZml4XSA9IGdlbk1hdGNoO1xuICAgIGlmIChzdWZmaXggIT09ICd0cycgJiYgc3VmZml4ICE9PSAndHN4Jykge1xuICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgIH1cbiAgICBsZXQgYmFzZUZpbGVOYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICAgIGlmIChnZW5TdWZmaXguaW5kZXhPZignbmdzdHlsZScpID49IDApIHtcbiAgICAgIC8vIE5vdGU6IG5nc3R5bGUgZmlsZXMgaGF2ZSBuYW1lcyBsaWtlIGBhZmlsZS5jc3MubmdzdHlsZS50c2BcbiAgICAgIGlmICghdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMoYmFzZSkpIHtcbiAgICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb3RlOiBvbi10aGUtZmx5IGdlbmVyYXRlZCBmaWxlcyBhbHdheXMgaGF2ZSBhIGAudHNgIHN1ZmZpeCxcbiAgICAgIC8vIGJ1dCB0aGUgZmlsZSBmcm9tIHdoaWNoIHdlIGdlbmVyYXRlZCBpdCBjYW4gYmUgYSBgLnRzYC8gYC50c3hgLyBgLmQudHNgXG4gICAgICAvLyAoc2VlIG9wdGlvbnMuZ2VuZXJhdGVDb2RlRm9yTGlicmFyaWVzKS5cbiAgICAgIGJhc2VGaWxlTmFtZSA9IFtgJHtiYXNlfS50c2AsIGAke2Jhc2V9LnRzeGAsIGAke2Jhc2V9LmQudHNgXS5maW5kKFxuICAgICAgICAgIGJhc2VGaWxlTmFtZSA9PiB0aGlzLmlzU291cmNlRmlsZShiYXNlRmlsZU5hbWUpICYmIHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGJhc2VGaWxlTmFtZSkpO1xuICAgICAgaWYgKCFiYXNlRmlsZU5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge2dlbmVyYXRlOiB0cnVlLCBiYXNlRmlsZU5hbWV9O1xuICB9XG5cbiAgc2hvdWxkR2VuZXJhdGVGaWxlc0ZvcihmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgLy8gVE9ETyh0Ym9zY2gpOiBhbGxvdyBnZW5lcmF0aW5nIGZpbGVzIHRoYXQgYXJlIG5vdCBpbiB0aGUgcm9vdERpclxuICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy8xOTMzN1xuICAgIHJldHVybiAhR0VORVJBVEVEX0ZJTEVTLnRlc3QoZmlsZU5hbWUpICYmIHRoaXMuaXNTb3VyY2VGaWxlKGZpbGVOYW1lKSAmJlxuICAgICAgICBpc0luUm9vdERpcihmaWxlTmFtZSwgdGhpcy5vcHRpb25zKTtcbiAgfVxuXG4gIGdldFNvdXJjZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCxcbiAgICAgIG9uRXJyb3I/OiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkKTogdHMuU291cmNlRmlsZSB7XG4gICAgLy8gTm90ZTogRG9uJ3QgZXhpdCBlYXJseSBpbiB0aGlzIG1ldGhvZCB0byBtYWtlIHN1cmVcbiAgICAvLyB3ZSBhbHdheXMgaGF2ZSB1cCB0byBkYXRlIHJlZmVyZW5jZXMgb24gdGhlIGZpbGUhXG4gICAgbGV0IGdlbkZpbGVOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgc2YgPSB0aGlzLmdldEdlbmVyYXRlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGlmICghc2YpIHtcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLmxpYnJhcnlTdW1tYXJpZXMuZ2V0KGZpbGVOYW1lKTtcbiAgICAgIGlmIChzdW1tYXJ5KSB7XG4gICAgICAgIGlmICghc3VtbWFyeS5zb3VyY2VGaWxlKSB7XG4gICAgICAgICAgc3VtbWFyeS5zb3VyY2VGaWxlID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgICAgICAgZmlsZU5hbWUsIHN1bW1hcnkudGV4dCwgdGhpcy5vcHRpb25zLnRhcmdldCB8fCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0KTtcbiAgICAgICAgfVxuICAgICAgICBzZiA9IHN1bW1hcnkuc291cmNlRmlsZTtcbiAgICAgICAgLy8gVHlwZVNjcmlwdCBkb2Vzbid0IGFsbG93IHJldHVybmluZyByZWRpcmVjdCBzb3VyY2UgZmlsZXMuIFRvIGF2b2lkIHVuZm9yc2VlbiBlcnJvcnMgd2VcbiAgICAgICAgLy8gcmV0dXJuIHRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZSBpbnN0ZWFkIG9mIHRoZSByZWRpcmVjdCB0YXJnZXQuXG4gICAgICAgIGNvbnN0IHJlZGlyZWN0SW5mbyA9IChzZiBhcyBhbnkpLnJlZGlyZWN0SW5mbztcbiAgICAgICAgaWYgKHJlZGlyZWN0SW5mbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgc2YgPSByZWRpcmVjdEluZm8udW5yZWRpcmVjdGVkO1xuICAgICAgICB9XG4gICAgICAgIGdlbkZpbGVOYW1lcyA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXNmKSB7XG4gICAgICBzZiA9IHRoaXMuZ2V0T3JpZ2luYWxTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGNvbnN0IGNhY2hlZEdlbkZpbGVzID0gdGhpcy5nZW5lcmF0ZWRDb2RlRm9yLmdldChmaWxlTmFtZSk7XG4gICAgICBpZiAoY2FjaGVkR2VuRmlsZXMpIHtcbiAgICAgICAgZ2VuRmlsZU5hbWVzID0gY2FjaGVkR2VuRmlsZXM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5ub1Jlc29sdmUgJiYgdGhpcy5zaG91bGRHZW5lcmF0ZUZpbGVzRm9yKGZpbGVOYW1lKSkge1xuICAgICAgICAgIGdlbkZpbGVOYW1lcyA9IHRoaXMuY29kZUdlbmVyYXRvci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKGZpbGVOYW1lKS5maWx0ZXIoXG4gICAgICAgICAgICAgIGZpbGVOYW1lID0+IHRoaXMuc2hvdWxkR2VuZXJhdGVGaWxlKGZpbGVOYW1lKS5nZW5lcmF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5nZW5lcmF0ZWRDb2RlRm9yLnNldChmaWxlTmFtZSwgZ2VuRmlsZU5hbWVzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHNmKSB7XG4gICAgICBhZGRSZWZlcmVuY2VzVG9Tb3VyY2VGaWxlKHNmLCBnZW5GaWxlTmFtZXMpO1xuICAgIH1cbiAgICAvLyBUT0RPKHRib3NjaCk6IFR5cGVTY3JpcHQncyB0eXBpbmdzIGZvciBnZXRTb3VyY2VGaWxlIGFyZSBpbmNvcnJlY3QsXG4gICAgLy8gYXMgaXQgY2FuIHZlcnkgd2VsbCByZXR1cm4gdW5kZWZpbmVkLlxuICAgIHJldHVybiBzZiE7XG4gIH1cblxuICBwcml2YXRlIGdldEdlbmVyYXRlZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgY29uc3QgZ2VuU3JjRmlsZSA9IHRoaXMuZ2VuZXJhdGVkU291cmNlRmlsZXMuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoZ2VuU3JjRmlsZSkge1xuICAgICAgcmV0dXJuIGdlblNyY0ZpbGUuc291cmNlRmlsZTtcbiAgICB9XG4gICAgY29uc3Qge2dlbmVyYXRlLCBiYXNlRmlsZU5hbWV9ID0gdGhpcy5zaG91bGRHZW5lcmF0ZUZpbGUoZmlsZU5hbWUpO1xuICAgIGlmIChnZW5lcmF0ZSkge1xuICAgICAgY29uc3QgZ2VuRmlsZSA9IHRoaXMuY29kZUdlbmVyYXRvci5nZW5lcmF0ZUZpbGUoZmlsZU5hbWUsIGJhc2VGaWxlTmFtZSk7XG4gICAgICByZXR1cm4gdGhpcy5hZGRHZW5lcmF0ZWRGaWxlKGdlbkZpbGUsIGdlbkZpbGVFeHRlcm5hbFJlZmVyZW5jZXMoZ2VuRmlsZSkpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgb3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBsZXQgZmlsZUV4aXN0cyA9IHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzQ2FjaGUuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoZmlsZUV4aXN0cyA9PSBudWxsKSB7XG4gICAgICBmaWxlRXhpc3RzID0gdGhpcy5jb250ZXh0LmZpbGVFeGlzdHMoZmlsZU5hbWUpO1xuICAgICAgdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHNDYWNoZS5zZXQoZmlsZU5hbWUsIGZpbGVFeGlzdHMpO1xuICAgIH1cbiAgICByZXR1cm4gZmlsZUV4aXN0cztcbiAgfVxuXG4gIGZpbGVFeGlzdHMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGZpbGVOYW1lID0gc3RyaXBOZ1Jlc291cmNlU3VmZml4KGZpbGVOYW1lKTtcbiAgICBpZiAodGhpcy5saWJyYXJ5U3VtbWFyaWVzLmhhcyhmaWxlTmFtZSkgfHwgdGhpcy5nZW5lcmF0ZWRTb3VyY2VGaWxlcy5oYXMoZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc2hvdWxkR2VuZXJhdGVGaWxlKGZpbGVOYW1lKS5nZW5lcmF0ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhmaWxlTmFtZSk7XG4gIH1cblxuICBsb2FkU3VtbWFyeShmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLmxpYnJhcnlTdW1tYXJpZXMuZ2V0KGZpbGVQYXRoKTtcbiAgICBpZiAoc3VtbWFyeSkge1xuICAgICAgcmV0dXJuIHN1bW1hcnkudGV4dDtcbiAgICB9XG4gICAgaWYgKHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZVBhdGgpKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpc1NvdXJjZUZpbGUoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIERvbid0IGdlbmVyYXRlIGFueSBmaWxlcyBub3IgdHlwZWNoZWNrIHRoZW1cbiAgICAvLyBpZiBza2lwVGVtcGxhdGVDb2RlZ2VuIGlzIHNldCBhbmQgZnVsbFRlbXBsYXRlVHlwZUNoZWNrIGlzIG5vdCB5ZXQgc2V0LFxuICAgIC8vIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAgICBpZiAodGhpcy5vcHRpb25zLnNraXBUZW1wbGF0ZUNvZGVnZW4gJiYgIXRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSWYgd2UgaGF2ZSBhIHN1bW1hcnkgZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uLFxuICAgIC8vIHRyZWF0IHRoZSBmaWxlIG5ldmVyIGFzIGEgc291cmNlIGZpbGUuXG4gICAgaWYgKHRoaXMubGlicmFyeVN1bW1hcmllcy5oYXMoZmlsZVBhdGgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChHRU5FUkFURURfRklMRVMudGVzdChmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5nZW5lcmF0ZUNvZGVGb3JMaWJyYXJpZXMgPT09IGZhbHNlICYmIERUUy50ZXN0KGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoRFRTLnRlc3QoZmlsZVBhdGgpKSB7XG4gICAgICAvLyBDaGVjayBmb3IgYSBidW5kbGUgaW5kZXguXG4gICAgICBpZiAodGhpcy5oYXNCdW5kbGVJbmRleChmaWxlUGF0aCkpIHtcbiAgICAgICAgY29uc3Qgbm9ybWFsRmlsZVBhdGggPSBwYXRoLm5vcm1hbGl6ZShmaWxlUGF0aCk7XG4gICAgICAgIHJldHVybiB0aGlzLmZsYXRNb2R1bGVJbmRleE5hbWVzLmhhcyhub3JtYWxGaWxlUGF0aCkgfHxcbiAgICAgICAgICAgIHRoaXMuZmxhdE1vZHVsZUluZGV4UmVkaXJlY3ROYW1lcy5oYXMobm9ybWFsRmlsZVBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJlYWRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdW1tYXJ5ID0gdGhpcy5saWJyYXJ5U3VtbWFyaWVzLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKHN1bW1hcnkpIHtcbiAgICAgIHJldHVybiBzdW1tYXJ5LnRleHQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0TWV0YWRhdGFGb3IoZmlsZVBhdGg6IHN0cmluZyk6IE1vZHVsZU1ldGFkYXRhW118dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gcmVhZE1ldGFkYXRhKGZpbGVQYXRoLCB0aGlzLm1ldGFkYXRhUmVhZGVySG9zdCwgdGhpcy5tZXRhZGF0YVJlYWRlckNhY2hlKTtcbiAgfVxuXG4gIGxvYWRSZXNvdXJjZShmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+fHN0cmluZyB7XG4gICAgaWYgKHRoaXMuY29udGV4dC5yZWFkUmVzb3VyY2UpIHJldHVybiB0aGlzLmNvbnRleHQucmVhZFJlc291cmNlKGZpbGVQYXRoKTtcbiAgICBpZiAoIXRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVQYXRoKSkge1xuICAgICAgdGhyb3cgc3ludGF4RXJyb3IoYEVycm9yOiBSZXNvdXJjZSBmaWxlIG5vdCBmb3VuZDogJHtmaWxlUGF0aH1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZVBhdGgpKTtcbiAgfVxuXG4gIGdldE91dHB1dE5hbWUoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHBhdGgucmVsYXRpdmUodGhpcy5nZXRDdXJyZW50RGlyZWN0b3J5KCksIGZpbGVQYXRoKTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzQnVuZGxlSW5kZXgoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGNoZWNrQnVuZGxlSW5kZXggPSAoZGlyZWN0b3J5OiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICAgIGxldCByZXN1bHQgPSB0aGlzLmZsYXRNb2R1bGVJbmRleENhY2hlLmdldChkaXJlY3RvcnkpO1xuICAgICAgaWYgKHJlc3VsdCA9PSBudWxsKSB7XG4gICAgICAgIGlmIChwYXRoLmJhc2VuYW1lKGRpcmVjdG9yeSkgPT0gJ25vZGVfbW9kdWxlJykge1xuICAgICAgICAgIC8vIERvbid0IGxvb2sgb3V0c2lkZSB0aGUgbm9kZV9tb2R1bGVzIHRoaXMgcGFja2FnZSBpcyBpbnN0YWxsZWQgaW4uXG4gICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gQSBidW5kbGUgaW5kZXggZXhpc3RzIGlmIHRoZSB0eXBpbmdzIC5kLnRzIGZpbGUgaGFzIGEgbWV0YWRhdGEuanNvbiB0aGF0IGhhcyBhblxuICAgICAgICAgIC8vIGltcG9ydEFzLlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwYWNrYWdlRmlsZSA9IHBhdGguam9pbihkaXJlY3RvcnksICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgICAgIGlmICh0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhwYWNrYWdlRmlsZSkpIHtcbiAgICAgICAgICAgICAgLy8gT25jZSB3ZSBzZWUgYSBwYWNrYWdlLmpzb24gZmlsZSwgYXNzdW1lIGZhbHNlIHVudGlsIGl0IHdlIGZpbmQgdGhlIGJ1bmRsZSBpbmRleC5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VDb250ZW50OiBhbnkgPSBKU09OLnBhcnNlKGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUocGFja2FnZUZpbGUpKSk7XG4gICAgICAgICAgICAgIGlmIChwYWNrYWdlQ29udGVudC50eXBpbmdzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHlwaW5ncyA9IHBhdGgubm9ybWFsaXplKHBhdGguam9pbihkaXJlY3RvcnksIHBhY2thZ2VDb250ZW50LnR5cGluZ3MpKTtcbiAgICAgICAgICAgICAgICBpZiAoRFRTLnRlc3QodHlwaW5ncykpIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGFkYXRhRmlsZSA9IHR5cGluZ3MucmVwbGFjZShEVFMsICcubWV0YWRhdGEuanNvbicpO1xuICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKG1ldGFkYXRhRmlsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWV0YWRhdGEgPSBKU09OLnBhcnNlKGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUobWV0YWRhdGFGaWxlKSkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWV0YWRhdGEuZmxhdE1vZHVsZUluZGV4UmVkaXJlY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZsYXRNb2R1bGVJbmRleFJlZGlyZWN0TmFtZXMuYWRkKHR5cGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgIC8vIE5vdGU6IGRvbid0IHNldCByZXN1bHQgPSB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIC8vIGFzIHRoaXMgd291bGQgbWFyayB0aGlzIGZvbGRlclxuICAgICAgICAgICAgICAgICAgICAgIC8vIGFzIGhhdmluZyBhIGJ1bmRsZUluZGV4IHRvbyBlYXJseSB3aXRob3V0XG4gICAgICAgICAgICAgICAgICAgICAgLy8gZmlsbGluZyB0aGUgYnVuZGxlSW5kZXhOYW1lcy5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZXRhZGF0YS5pbXBvcnRBcykge1xuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmxhdE1vZHVsZUluZGV4TmFtZXMuYWRkKHR5cGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHBhdGguZGlybmFtZShkaXJlY3RvcnkpO1xuICAgICAgICAgICAgICBpZiAocGFyZW50ICE9IGRpcmVjdG9yeSkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSB0aGUgcGFyZW50IGRpcmVjdG9yeS5cbiAgICAgICAgICAgICAgICByZXN1bHQgPSBjaGVja0J1bmRsZUluZGV4KHBhcmVudCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIElmIHdlIGVuY291bnRlciBhbnkgZXJyb3JzIGFzc3VtZSB3ZSB0aGlzIGlzbid0IGEgYnVuZGxlIGluZGV4LlxuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmxhdE1vZHVsZUluZGV4Q2FjaGUuc2V0KGRpcmVjdG9yeSwgcmVzdWx0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIHJldHVybiBjaGVja0J1bmRsZUluZGV4KHBhdGguZGlybmFtZShmaWxlUGF0aCkpO1xuICB9XG5cbiAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lID0gKG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucykgPT5cbiAgICAgIHRoaXMuY29udGV4dC5nZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9ucylcbiAgZ2V0Q3VycmVudERpcmVjdG9yeSA9ICgpID0+IHRoaXMuY29udGV4dC5nZXRDdXJyZW50RGlyZWN0b3J5KCk7XG4gIGdldENhbm9uaWNhbEZpbGVOYW1lID0gKGZpbGVOYW1lOiBzdHJpbmcpID0+IHRoaXMuY29udGV4dC5nZXRDYW5vbmljYWxGaWxlTmFtZShmaWxlTmFtZSk7XG4gIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMgPSAoKSA9PiB0aGlzLmNvbnRleHQudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpO1xuICBnZXROZXdMaW5lID0gKCkgPT4gdGhpcy5jb250ZXh0LmdldE5ld0xpbmUoKTtcbiAgLy8gTWFrZSBzdXJlIHdlIGRvIG5vdCBgaG9zdC5yZWFscGF0aCgpYCBmcm9tIFRTIGFzIHdlIGRvIG5vdCB3YW50IHRvIHJlc29sdmUgc3ltbGlua3MuXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvOTU1MlxuICByZWFscGF0aCA9IChwOiBzdHJpbmcpID0+IHA7XG4gIHdyaXRlRmlsZSA9IHRoaXMuY29udGV4dC53cml0ZUZpbGUuYmluZCh0aGlzLmNvbnRleHQpO1xufVxuXG5mdW5jdGlvbiBnZW5GaWxlRXh0ZXJuYWxSZWZlcmVuY2VzKGdlbkZpbGU6IEdlbmVyYXRlZEZpbGUpOiBTZXQ8c3RyaW5nPiB7XG4gIHJldHVybiBuZXcgU2V0KGNvbGxlY3RFeHRlcm5hbFJlZmVyZW5jZXMoZ2VuRmlsZS5zdG10cyEpLm1hcChlciA9PiBlci5tb2R1bGVOYW1lISkpO1xufVxuXG5mdW5jdGlvbiBhZGRSZWZlcmVuY2VzVG9Tb3VyY2VGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlLCBnZW5GaWxlTmFtZXM6IHN0cmluZ1tdKSB7XG4gIC8vIE5vdGU6IGFzIHdlIG1vZGlmeSB0cy5Tb3VyY2VGaWxlcyB3ZSBuZWVkIHRvIGtlZXAgdGhlIG9yaWdpbmFsXG4gIC8vIHZhbHVlIGZvciBgcmVmZXJlbmNlZEZpbGVzYCBhcm91bmQgaW4gY2FjaGUgdGhlIG9yaWdpbmFsIGhvc3QgaXMgY2FjaGluZyB0cy5Tb3VyY2VGaWxlcy5cbiAgLy8gTm90ZTogY2xvbmluZyB0aGUgdHMuU291cmNlRmlsZSBpcyBleHBlbnNpdmUgYXMgdGhlIG5vZGVzIGluIGhhdmUgcGFyZW50IHBvaW50ZXJzLFxuICAvLyBpLmUuIHdlIHdvdWxkIGFsc28gbmVlZCB0byBjbG9uZSBhbmQgYWRqdXN0IGFsbCBub2Rlcy5cbiAgbGV0IG9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzOiBSZWFkb25seUFycmF5PHRzLkZpbGVSZWZlcmVuY2U+ID1cbiAgICAgIChzZiBhcyBhbnkpLm9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzO1xuICBpZiAoIW9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzKSB7XG4gICAgb3JpZ2luYWxSZWZlcmVuY2VkRmlsZXMgPSBzZi5yZWZlcmVuY2VkRmlsZXM7XG4gICAgKHNmIGFzIGFueSkub3JpZ2luYWxSZWZlcmVuY2VkRmlsZXMgPSBvcmlnaW5hbFJlZmVyZW5jZWRGaWxlcztcbiAgfVxuICBjb25zdCBuZXdSZWZlcmVuY2VkRmlsZXMgPSBbLi4ub3JpZ2luYWxSZWZlcmVuY2VkRmlsZXNdO1xuICBnZW5GaWxlTmFtZXMuZm9yRWFjaChnZiA9PiBuZXdSZWZlcmVuY2VkRmlsZXMucHVzaCh7ZmlsZU5hbWU6IGdmLCBwb3M6IDAsIGVuZDogMH0pKTtcbiAgc2YucmVmZXJlbmNlZEZpbGVzID0gbmV3UmVmZXJlbmNlZEZpbGVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0T3JpZ2luYWxSZWZlcmVuY2VzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5GaWxlUmVmZXJlbmNlW118dW5kZWZpbmVkIHtcbiAgcmV0dXJuIHNvdXJjZUZpbGUgJiYgKHNvdXJjZUZpbGUgYXMgYW55KS5vcmlnaW5hbFJlZmVyZW5jZWRGaWxlcztcbn1cblxuZnVuY3Rpb24gZG90UmVsYXRpdmUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgclBhdGg6IHN0cmluZyA9IHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgcmV0dXJuIHJQYXRoLnN0YXJ0c1dpdGgoJy4nKSA/IHJQYXRoIDogJy4vJyArIHJQYXRoO1xufVxuXG4vKipcbiAqIE1vdmVzIHRoZSBwYXRoIGludG8gYGdlbkRpcmAgZm9sZGVyIHdoaWxlIHByZXNlcnZpbmcgdGhlIGBub2RlX21vZHVsZXNgIGRpcmVjdG9yeS5cbiAqL1xuZnVuY3Rpb24gZ2V0UGFja2FnZU5hbWUoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgY29uc3QgbWF0Y2ggPSBOT0RFX01PRFVMRVNfUEFDS0FHRV9OQU1FLmV4ZWMoZmlsZVBhdGgpO1xuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFsxXSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHN0cmlwTm9kZU1vZHVsZXNQcmVmaXgoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBmaWxlUGF0aC5yZXBsYWNlKC8uKm5vZGVfbW9kdWxlc1xcLy8sICcnKTtcbn1cblxuZnVuY3Rpb24gZ2V0Tm9kZU1vZHVsZXNQcmVmaXgoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgY29uc3QgbWF0Y2ggPSAvLipub2RlX21vZHVsZXNcXC8vLmV4ZWMoZmlsZVBhdGgpO1xuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFsxXSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHN0cmlwTmdSZXNvdXJjZVN1ZmZpeChmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGZpbGVOYW1lLnJlcGxhY2UoL1xcLlxcJG5ncmVzb3VyY2VcXCQuKi8sICcnKTtcbn1cblxuZnVuY3Rpb24gYWRkTmdSZXNvdXJjZVN1ZmZpeChmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2ZpbGVOYW1lfS4kbmdyZXNvdXJjZSRgO1xufVxuIl19