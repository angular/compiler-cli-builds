/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
            this.metadataReaderCache = (0, metadata_reader_1.createMetadataReaderCache)();
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
                var rootedContainingFile = (0, util_1.relativeToRootDirs)(containingFile, this.rootDirs);
                var rootedImportedFile = (0, util_1.relativeToRootDirs)(importedFile, this.rootDirs);
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
                        var packageTypings = (0, file_system_1.join)(modulePath, packageJson.typings);
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
            if (!(0, util_1.isInRootDir)(fileName, this.options)) {
                return { generate: false };
            }
            var genMatch = util_1.GENERATED_FILES.exec(fileName);
            if (!genMatch) {
                return { generate: false };
            }
            var _a = (0, tslib_1.__read)(genMatch, 4), base = _a[1], genSuffix = _a[2], suffix = _a[3];
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
                (0, util_1.isInRootDir)(fileName, this.options);
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
            return (0, metadata_reader_1.readMetadata)(filePath, this.metadataReaderHost, this.metadataReaderCache);
        };
        TsCompilerAotCompilerTypeCheckHostAdapter.prototype.loadResource = function (filePath) {
            if (this.context.readResource)
                return this.context.readResource(filePath);
            if (!this.originalFileExists(filePath)) {
                throw (0, compiler_1.syntaxError)("Error: Resource file not found: " + filePath);
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
        return new Set((0, compiler_1.collectExternalReferences)(genFile.stmts).map(function (er) { return er.moduleName; }));
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
        var newReferencedFiles = (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(originalReferencedFiles), false);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFvSztJQUNwSywyQkFBNkI7SUFDN0IsK0JBQWlDO0lBSWpDLDJFQUEwQztJQUcxQywwRkFBOEY7SUFDOUYsb0VBQTZFO0lBRTdFLElBQU0seUJBQXlCLEdBQUcsc0RBQXNELENBQUM7SUFDekYsSUFBTSxHQUFHLEdBQUcsa0NBQWtDLENBQUM7SUFDL0MsSUFBTSxvQkFBb0IsR0FBRyxnQ0FBZ0MsQ0FBQztJQUU5RCxJQUFJLGVBQWUsR0FBc0QsSUFBSSxDQUFDO0lBRTlFLFNBQWdCLGtCQUFrQixDQUFDLE1BQ0k7UUFDckMsZUFBZSxHQUFHLE1BQU0sQ0FBQztJQUMzQixDQUFDO0lBSEQsZ0RBR0M7SUFFRCxTQUFnQixrQkFBa0IsQ0FDOUIsRUFDd0Q7WUFEdkQsT0FBTyxhQUFBLEVBQUUsY0FBNkMsRUFBN0MsTUFBTSxtQkFBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFBO1FBRXpELElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtZQUM1QixNQUFNLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ2xDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQVBELGdEQU9DO0lBaUJELFNBQVMsTUFBTSxDQUFJLFNBQTJCO1FBQzVDLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDZCxxQ0FBcUM7U0FDdEM7UUFDRCxPQUFPLFNBQVUsQ0FBQztJQUNwQixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSDtRQTRCRSxtREFDWSxTQUFnQyxFQUFVLE9BQXdCLEVBQ2xFLE9BQXFCLEVBQVUsZ0JBQWtDLEVBQ2pFLGFBQTRCLEVBQzVCLGdCQUFvRDtZQUpoRSxpQkEwREM7WUF0RFcsaUNBQUEsRUFBQSx1QkFBdUIsR0FBRyxFQUEwQjtZQUhwRCxjQUFTLEdBQVQsU0FBUyxDQUF1QjtZQUFVLFlBQU8sR0FBUCxPQUFPLENBQWlCO1lBQ2xFLFlBQU8sR0FBUCxPQUFPLENBQWM7WUFBVSxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1lBQ2pFLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1lBQzVCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBb0M7WUE5QnhELHdCQUFtQixHQUFHLElBQUEsMkNBQXlCLEdBQUUsQ0FBQztZQUNsRCw4QkFBeUIsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUN0RCx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQztZQUNsRCx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1lBQ3pDLGlDQUE0QixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7WUFHakQsd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUM7WUFDNUQsNEJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQW1CLENBQUM7WUFDckQseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUM7WUFDeEQscUJBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7WUFDL0MsWUFBTyxHQUFHLElBQUksNEJBQWlCLEVBQUUsQ0FBQztZQXFpQjFDLDBCQUFxQixHQUFHLFVBQUMsT0FBMkI7Z0JBQ2hELE9BQUEsS0FBSSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUM7WUFBM0MsQ0FBMkMsQ0FBQTtZQUMvQyx3QkFBbUIsR0FBRyxjQUFNLE9BQUEsS0FBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxFQUFsQyxDQUFrQyxDQUFDO1lBQy9ELHlCQUFvQixHQUFHLFVBQUMsUUFBZ0IsSUFBSyxPQUFBLEtBQUksQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLEVBQTNDLENBQTJDLENBQUM7WUFDekYsOEJBQXlCLEdBQUcsY0FBTSxPQUFBLEtBQUksQ0FBQyxPQUFPLENBQUMseUJBQXlCLEVBQUUsRUFBeEMsQ0FBd0MsQ0FBQztZQUMzRSxlQUFVLEdBQUcsY0FBTSxPQUFBLEtBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQXpCLENBQXlCLENBQUM7WUFDN0MsdUZBQXVGO1lBQ3ZGLHNEQUFzRDtZQUN0RCxhQUFRLEdBQUcsVUFBQyxDQUFTLElBQUssT0FBQSxDQUFDLEVBQUQsQ0FBQyxDQUFDO1lBQzVCLGNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBMWhCcEQsSUFBSSxDQUFDLHFCQUFxQixHQUFHLEVBQUUsQ0FBQywyQkFBMkIsQ0FDdkQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBb0IsRUFBRSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQy9GLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUyxDQUFDO1lBQ3hDLElBQUksQ0FBQyxRQUFRO2dCQUNULENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQXpCLENBQXlCLENBQUMsQ0FBQztZQUM1RixJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyxjQUFjLEdBQUcsVUFBQSxJQUFJLElBQUksT0FBQSxPQUFPLENBQUMsY0FBZSxDQUFDLElBQUksQ0FBQyxFQUE3QixDQUE2QixDQUFDO2FBQzdEO1lBQ0QsSUFBSSxPQUFPLENBQUMsZUFBZSxFQUFFO2dCQUMzQixJQUFJLENBQUMsZUFBZSxHQUFHLFVBQUEsYUFBYSxJQUFJLE9BQUEsT0FBTyxDQUFDLGVBQWdCLENBQUMsYUFBYSxDQUFDLEVBQXZDLENBQXVDLENBQUM7YUFDakY7WUFDRCxJQUFJLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRTtnQkFDaEMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLGNBQU0sT0FBQSxPQUFPLENBQUMsb0JBQXFCLEVBQUUsRUFBL0IsQ0FBK0IsQ0FBQzthQUNuRTtZQUNELElBQUksT0FBTyxDQUFDLHFCQUFxQixFQUFFO2dCQUNqQyxJQUFJLENBQUMscUJBQXFCLEdBQUcsY0FBTSxPQUFBLE9BQU8sQ0FBQyxxQkFBc0IsRUFBRSxFQUFoQyxDQUFnQyxDQUFDO2FBQ3JFO1lBQ0QsSUFBSSxPQUFPLENBQUMsOEJBQThCLEVBQUU7Z0JBTTFDLElBQUksQ0FBQyw4QkFBOEIsR0FBRyxVQUFDLEtBQWUsRUFBRSxjQUFzQjtvQkFDMUUsT0FBQyxPQUFPLENBQUMsOEJBQXFFLENBQzdFLEtBQUssRUFBRSxjQUFjLENBQUM7Z0JBRHZCLENBQ3VCLENBQUM7YUFDN0I7WUFDRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUU7Z0JBQ2pCLElBQUksQ0FBQyxLQUFLLEdBQUcsVUFBQSxDQUFDLElBQUksT0FBQSxPQUFPLENBQUMsS0FBTSxDQUFDLENBQUMsQ0FBQyxFQUFqQixDQUFpQixDQUFDO2FBQ3JDO1lBQ0QsSUFBSSxPQUFPLENBQUMsb0JBQW9CLEVBQUU7Z0JBQ2hDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3hFO1lBQ0QsaUVBQWlFO1lBQ2pFLGlFQUFpRTtZQUNqRSxJQUFJLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRTtnQkFDbEMsSUFBSSxDQUFDLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDNUU7WUFDRCxJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRTtnQkFDN0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDbEU7WUFDRCxJQUFJLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRTtnQkFDL0IsSUFBSSxDQUFDLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDdEU7WUFDRCxJQUFJLENBQUMsa0JBQWtCLEdBQUc7Z0JBQ3hCLGFBQWEsRUFBRSxjQUFNLE9BQUEsSUFBSSxFQUFKLENBQUk7Z0JBQ3pCLHFCQUFxQixFQUFFLFVBQUMsUUFBUTtvQkFDOUIsSUFBTSxFQUFFLEdBQUcsS0FBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNoRCxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO2dCQUNoRSxDQUFDO2dCQUNELFVBQVUsRUFBRSxVQUFDLFFBQVEsSUFBSyxPQUFBLEtBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsRUFBakMsQ0FBaUM7Z0JBQzNELFFBQVEsRUFBRSxVQUFDLFFBQVEsSUFBSyxPQUFBLE1BQU0sQ0FBQyxLQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUF2QyxDQUF1QzthQUNoRSxDQUFDO1FBQ0osQ0FBQztRQUVPLHFFQUFpQixHQUF6QixVQUEwQixVQUFrQixFQUFFLGNBQXNCO1lBRWxFLElBQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FDZCxVQUFVLEVBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQ2xFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztpQkFDNUIsY0FBYyxDQUFDO1lBQy9CLElBQUksRUFBRSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksVUFBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtnQkFDakYsMERBQTBEO2dCQUMxRCx5Q0FBeUM7Z0JBQ3pDLHFGQUFxRjtnQkFDckYsZUFBZTtnQkFDZixFQUFFLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFDO2FBQ3BDO1lBQ0QsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO1FBRUQsK0VBQStFO1FBQy9FLDJCQUEyQjtRQUMzQixvRUFBb0U7UUFDcEUseUNBQXlDO1FBQ3pDLGlDQUFpQztRQUNqQyxzRUFBa0IsR0FBbEIsVUFBbUIsV0FBcUIsRUFBRSxjQUFzQjtZQUFoRSxpQkFNQztZQUxDLCtEQUErRDtZQUMvRCxnRkFBZ0Y7WUFDaEYsNkJBQTZCO1lBQzdCLE9BQTRCLFdBQVcsQ0FBQyxHQUFHLENBQ3ZDLFVBQUEsVUFBVSxJQUFJLE9BQUEsS0FBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsRUFBbEQsQ0FBa0QsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFRCx3RUFBb0IsR0FBcEIsVUFBcUIsQ0FBUyxFQUFFLGNBQXVCO1lBQ3JELElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ25CLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsMERBQTBELENBQUMsQ0FBQztpQkFDN0U7Z0JBQ0QsaUVBQWlFO2dCQUNqRSxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNwQztZQUNELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRTtnQkFDckMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQzthQUM3RDtZQUNELElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDM0QsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3JELENBQUM7UUFFRDs7Ozs7Ozs7Ozs7Ozs7OztXQWdCRztRQUNILHdFQUFvQixHQUFwQixVQUFxQixZQUFvQixFQUFFLGNBQXNCO1lBQy9ELElBQU0sUUFBUSxHQUFNLFlBQVksU0FBSSxjQUFnQixDQUFDO1lBQ3JELElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDOUQsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFO2dCQUN0QixPQUFPLFVBQVUsQ0FBQzthQUNuQjtZQUVELElBQU0sb0JBQW9CLEdBQUcsWUFBWSxDQUFDO1lBQzFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUU7Z0JBQ2hDLE9BQU8sQ0FBQyxLQUFLLENBQ1QsMENBQTBDLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUM3RSxZQUFZLENBQUMsQ0FBQzthQUNuQjtZQUVELGlCQUFpQjtZQUNqQixZQUFZLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDN0MsSUFBTSx1QkFBdUIsR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDN0QsSUFBTSx5QkFBeUIsR0FBRyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFakUsSUFBSSx1QkFBdUIsS0FBSyx5QkFBeUI7Z0JBQ3JELHNCQUFlLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEVBQUU7Z0JBQzlDLElBQU0sb0JBQW9CLEdBQUcsSUFBQSx5QkFBa0IsRUFBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMvRSxJQUFNLGtCQUFrQixHQUFHLElBQUEseUJBQWtCLEVBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFFM0UsSUFBSSxvQkFBb0IsS0FBSyxjQUFjLElBQUksa0JBQWtCLEtBQUssWUFBWSxFQUFFO29CQUNsRix5RUFBeUU7b0JBQ3pFLGNBQWMsR0FBRyxvQkFBb0IsQ0FBQztvQkFDdEMsWUFBWSxHQUFHLGtCQUFrQixDQUFDO2lCQUNuQztnQkFDRCxVQUFVLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7YUFDdEU7aUJBQU0sSUFBSSx1QkFBdUIsRUFBRTtnQkFDbEMsVUFBVSxHQUFHLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUNsRCxJQUFJLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtvQkFDMUMsK0VBQStFO29CQUMvRSxzREFBc0Q7b0JBQ3RELElBQUk7d0JBQ0YsSUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDOzRCQUNqRix1QkFBdUIsQ0FBQzt3QkFDNUIsSUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFVBQVUsR0FBRyxlQUFlLENBQUMsQ0FBQzt3QkFDMUQsSUFBTSxjQUFjLEdBQUcsSUFBQSxrQkFBSSxFQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQzdELElBQUksY0FBYyxLQUFLLG9CQUFvQixFQUFFOzRCQUMzQyxVQUFVLEdBQUcsdUJBQXVCLENBQUM7eUJBQ3RDO3FCQUNGO29CQUFDLFdBQU07d0JBQ04sa0VBQWtFO3dCQUNsRSw0REFBNEQ7d0JBQzVELDBCQUEwQjtxQkFDM0I7aUJBQ0Y7YUFDRjtpQkFBTTtnQkFDTCxNQUFNLElBQUksS0FBSyxDQUFDLHdFQUNaLG9CQUFvQixjQUFTLGNBQWdCLENBQUMsQ0FBQzthQUNwRDtZQUVELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3pELE9BQU8sVUFBVSxDQUFDO1FBQ3BCLENBQUM7UUFFRCwwRUFBc0IsR0FBdEIsVUFBdUIsWUFBb0IsRUFBRSxjQUFzQjtZQUNqRSxtRkFBbUY7WUFDbkYsMENBQTBDO1lBQzFDLElBQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQyxJQUFJLFNBQVMsS0FBSyxHQUFHLEVBQUU7Z0JBQ3JCLFlBQVksR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3RDO2lCQUFNLElBQUksU0FBUyxLQUFLLEdBQUcsRUFBRTtnQkFDNUIsWUFBWSxHQUFHLE9BQUssWUFBYyxDQUFDO2FBQ3BDO1lBQ0QsSUFBSSxzQkFBc0IsR0FDdEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ2pGLDBGQUEwRjtZQUMxRixnR0FBZ0c7WUFDaEcsSUFBSSxDQUFDLHNCQUFzQixJQUFJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRTtnQkFDdEUsSUFBTSxvQkFBb0IsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNoRixzQkFBc0I7b0JBQ2xCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDO2FBQzFGO1lBQ0QsSUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUM3Rix5RUFBeUU7WUFDekUsSUFBSSxDQUFDLE1BQU0sSUFBSyxJQUFJLENBQUMsT0FBZSxDQUFDLHFCQUFxQixFQUFFO2dCQUN6RCxJQUFJLENBQUMsT0FBZSxDQUFDLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFDO2FBQzNEO1lBQ0QsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUVELHFFQUFpQixHQUFqQixVQUFrQixRQUFnQixFQUFFLG9CQUE0QjtZQUM5RCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBRUQsdUVBQW1CLEdBQW5CLFVBQW9CLFFBQWdCLEVBQUUsb0JBQTRCO1lBQ2hFLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztZQUMzRSxJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXFCLFFBQVEsY0FBUyxvQkFBc0IsQ0FBQyxDQUFDO2FBQy9FO1lBQ0QsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztRQUVELHFFQUFpQixHQUFqQixVQUFrQixRQUFnQixFQUFFLElBQVksRUFBRSxTQUFpQjtZQUNqRSxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JELElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7Z0JBQ3hCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2FBQzdDO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRU8seUVBQXFCLEdBQTdCLFVBQ0ksUUFBZ0IsRUFBRSxlQUFpQyxFQUNuRCxPQUErQztZQUNqRCxzRUFBc0U7WUFDdEUsOEJBQThCO1lBQzlCLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDMUMsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBRSxDQUFDO2FBQ2hEO1lBQ0QsSUFBSSxDQUFDLGVBQWUsRUFBRTtnQkFDcEIsZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO2FBQ2pFO1lBQ0Qsd0NBQXdDO1lBQ3hDLHFDQUFxQztZQUNyQyxJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsZUFBZSxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQztZQUNsRixJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMzQyxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFFRCx1RUFBbUIsR0FBbkIsVUFBb0IsT0FBc0I7WUFDeEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUU7Z0JBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQ1gsZ0VBQThELE9BQU8sQ0FBQyxVQUFZLENBQUMsQ0FBQzthQUN6RjtZQUNELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3JFLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyx5REFBdUQsT0FBTyxDQUFDLFVBQVUsTUFBRyxDQUFDLENBQUM7YUFDL0Y7WUFDRCxJQUFNLE9BQU8sR0FBRyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuRCxJQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsa0JBQWtCLENBQUM7WUFDOUMsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ2pELElBQUksWUFBWSxFQUFFO2dCQUNoQixPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsWUFBWSxHQUFHLFlBQVksSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUE3QyxDQUE2QyxDQUFDLENBQUM7YUFDckU7WUFDRCxJQUFJLENBQUMsWUFBWSxFQUFFO2dCQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLG1EQUFpRCxPQUFPLENBQUMsVUFBVSxnQkFDL0UsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQVcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUcsQ0FBQyxDQUFDO2FBQzFEO1lBQ0QsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFFTyxvRUFBZ0IsR0FBeEIsVUFBeUIsT0FBc0IsRUFBRSxrQkFBK0I7WUFDOUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUU7Z0JBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQ1gsZ0VBQThELE9BQU8sQ0FBQyxVQUFZLENBQUMsQ0FBQzthQUN6RjtZQUNLLElBQUEsS0FBd0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsQ0FDL0QsT0FBTyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxFQUFFO1lBQ3BELG9CQUFvQixDQUFDLEtBQUssQ0FBQyxFQUZ4QixVQUFVLGdCQUFBLEVBQUUsT0FBTyxhQUVLLENBQUM7WUFDaEMsSUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUMxQixPQUFPLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25GLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQzFGLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUU7b0JBQzlCLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNsRCxJQUFJLFVBQVU7d0JBQUUsRUFBRSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7aUJBQzVDO3FCQUFNLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ2xELDBGQUEwRjtvQkFDMUYsNERBQTREO29CQUM1RCxFQUFFLENBQUMsVUFBVSxHQUFHLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUM3RTthQUNGO1lBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFO2dCQUNoRCxVQUFVLEVBQUUsRUFBRTtnQkFDZCxPQUFPLEVBQUUsT0FBTztnQkFDaEIsa0JBQWtCLG9CQUFBO2FBQ25CLENBQUMsQ0FBQztZQUNILE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQztRQUVELHNFQUFrQixHQUFsQixVQUFtQixRQUFnQjtZQUFuQyxpQkErQkM7WUE5QkMsbUVBQW1FO1lBQ25FLHNEQUFzRDtZQUN0RCxJQUFJLENBQUMsSUFBQSxrQkFBVyxFQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ3hDLE9BQU8sRUFBQyxRQUFRLEVBQUUsS0FBSyxFQUFDLENBQUM7YUFDMUI7WUFDRCxJQUFNLFFBQVEsR0FBRyxzQkFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNoRCxJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUNiLE9BQU8sRUFBQyxRQUFRLEVBQUUsS0FBSyxFQUFDLENBQUM7YUFDMUI7WUFDSyxJQUFBLEtBQUEsb0JBQThCLFFBQVEsSUFBQSxFQUFuQyxJQUFJLFFBQUEsRUFBRSxTQUFTLFFBQUEsRUFBRSxNQUFNLFFBQVksQ0FBQztZQUM3QyxJQUFJLE1BQU0sS0FBSyxJQUFJLElBQUksTUFBTSxLQUFLLEtBQUssRUFBRTtnQkFDdkMsT0FBTyxFQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUMsQ0FBQzthQUMxQjtZQUNELElBQUksWUFBOEIsQ0FBQztZQUNuQyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNyQyw2REFBNkQ7Z0JBQzdELElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2xDLE9BQU8sRUFBQyxRQUFRLEVBQUUsS0FBSyxFQUFDLENBQUM7aUJBQzFCO2FBQ0Y7aUJBQU07Z0JBQ0wsK0RBQStEO2dCQUMvRCwwRUFBMEU7Z0JBQzFFLDBDQUEwQztnQkFDMUMsWUFBWSxHQUFHLENBQUksSUFBSSxRQUFLLEVBQUssSUFBSSxTQUFNLEVBQUssSUFBSSxVQUFPLENBQUMsQ0FBQyxJQUFJLENBQzdELFVBQUEsWUFBWSxJQUFJLE9BQUEsS0FBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxLQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEVBQXhFLENBQXdFLENBQUMsQ0FBQztnQkFDOUYsSUFBSSxDQUFDLFlBQVksRUFBRTtvQkFDakIsT0FBTyxFQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUMsQ0FBQztpQkFDMUI7YUFDRjtZQUNELE9BQU8sRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLFlBQVksY0FBQSxFQUFDLENBQUM7UUFDeEMsQ0FBQztRQUVELDBFQUFzQixHQUF0QixVQUF1QixRQUFnQjtZQUNyQyxtRUFBbUU7WUFDbkUsc0RBQXNEO1lBQ3RELE9BQU8sQ0FBQyxzQkFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQztnQkFDakUsSUFBQSxrQkFBVyxFQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUVELGlFQUFhLEdBQWIsVUFDSSxRQUFnQixFQUFFLGVBQWdDLEVBQ2xELE9BQStDO1lBRm5ELGlCQTJDQztZQXhDQyxxREFBcUQ7WUFDckQsb0RBQW9EO1lBQ3BELElBQUksWUFBWSxHQUFhLEVBQUUsQ0FBQztZQUNoQyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLEVBQUUsRUFBRTtnQkFDUCxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNwRCxJQUFJLE9BQU8sRUFBRTtvQkFDWCxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRTt3QkFDdkIsT0FBTyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQ3BDLFFBQVEsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7cUJBQzVFO29CQUNELEVBQUUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO29CQUN4Qix5RkFBeUY7b0JBQ3pGLGtFQUFrRTtvQkFDbEUsSUFBTSxZQUFZLEdBQUksRUFBVSxDQUFDLFlBQVksQ0FBQztvQkFDOUMsSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFO3dCQUM5QixFQUFFLEdBQUcsWUFBWSxDQUFDLFlBQVksQ0FBQztxQkFDaEM7b0JBQ0QsWUFBWSxHQUFHLEVBQUUsQ0FBQztpQkFDbkI7YUFDRjtZQUNELElBQUksQ0FBQyxFQUFFLEVBQUU7Z0JBQ1AsRUFBRSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDMUMsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDM0QsSUFBSSxjQUFjLEVBQUU7b0JBQ2xCLFlBQVksR0FBRyxjQUFjLENBQUM7aUJBQy9CO3FCQUFNO29CQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLEVBQUU7d0JBQ3BFLFlBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FDckUsVUFBQSxRQUFRLElBQUksT0FBQSxLQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxFQUExQyxDQUEwQyxDQUFDLENBQUM7cUJBQzdEO29CQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO2lCQUNuRDthQUNGO1lBQ0QsSUFBSSxFQUFFLEVBQUU7Z0JBQ04seUJBQXlCLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO2FBQzdDO1lBQ0Qsc0VBQXNFO1lBQ3RFLHdDQUF3QztZQUN4QyxPQUFPLEVBQUcsQ0FBQztRQUNiLENBQUM7UUFFTyxvRUFBZ0IsR0FBeEIsVUFBeUIsUUFBZ0I7WUFDdkMsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzRCxJQUFJLFVBQVUsRUFBRTtnQkFDZCxPQUFPLFVBQVUsQ0FBQyxVQUFVLENBQUM7YUFDOUI7WUFDSyxJQUFBLEtBQTJCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsRUFBM0QsUUFBUSxjQUFBLEVBQUUsWUFBWSxrQkFBcUMsQ0FBQztZQUNuRSxJQUFJLFFBQVEsRUFBRTtnQkFDWixJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQ3hFLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQzNFO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRU8sc0VBQWtCLEdBQTFCLFVBQTJCLFFBQWdCO1lBQ3pDLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUQsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFO2dCQUN0QixVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQy9DLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2FBQ3hEO1lBQ0QsT0FBTyxVQUFVLENBQUM7UUFDcEIsQ0FBQztRQUVELDhEQUFVLEdBQVYsVUFBVyxRQUFnQjtZQUN6QixRQUFRLEdBQUcscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDM0MsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ2xGLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLEVBQUU7Z0JBQzlDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQsK0RBQVcsR0FBWCxVQUFZLFFBQWdCO1lBQzFCLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDcEQsSUFBSSxPQUFPLEVBQUU7Z0JBQ1gsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDO2FBQ3JCO1lBQ0QsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ3JDLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7YUFDaEQ7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCxnRUFBWSxHQUFaLFVBQWEsUUFBZ0I7WUFDM0IsOENBQThDO1lBQzlDLDBFQUEwRTtZQUMxRSwrQkFBK0I7WUFDL0IsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRTtnQkFDM0UsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUNELG9EQUFvRDtZQUNwRCx5Q0FBeUM7WUFDekMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUN2QyxPQUFPLEtBQUssQ0FBQzthQUNkO1lBQ0QsSUFBSSxzQkFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDbEMsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUNELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsS0FBSyxLQUFLLElBQUksVUFBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDekUsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUNELElBQUksVUFBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDdEIsNEJBQTRCO2dCQUM1QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ2pDLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ2hELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUM7d0JBQ2hELElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7aUJBQzNEO2FBQ0Y7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCw0REFBUSxHQUFSLFVBQVMsUUFBZ0I7WUFDdkIsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNwRCxJQUFJLE9BQU8sRUFBRTtnQkFDWCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUM7YUFDckI7WUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFFRCxrRUFBYyxHQUFkLFVBQWUsUUFBZ0I7WUFDN0IsT0FBTyxJQUFBLDhCQUFZLEVBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNuRixDQUFDO1FBRUQsZ0VBQVksR0FBWixVQUFhLFFBQWdCO1lBQzNCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZO2dCQUFFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDMUUsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDdEMsTUFBTSxJQUFBLHNCQUFXLEVBQUMscUNBQW1DLFFBQVUsQ0FBQyxDQUFDO2FBQ2xFO1lBQ0QsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBRUQsaUVBQWEsR0FBYixVQUFjLFFBQWdCO1lBQzVCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRU8sa0VBQWMsR0FBdEIsVUFBdUIsUUFBZ0I7WUFBdkMsaUJBeURDO1lBeERDLElBQU0sZ0JBQWdCLEdBQUcsVUFBQyxTQUFpQjtnQkFDekMsSUFBSSxNQUFNLEdBQUcsS0FBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdEQsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO29CQUNsQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFFO3dCQUM3QyxvRUFBb0U7d0JBQ3BFLE1BQU0sR0FBRyxLQUFLLENBQUM7cUJBQ2hCO3lCQUFNO3dCQUNMLGtGQUFrRjt3QkFDbEYsWUFBWTt3QkFDWixJQUFJOzRCQUNGLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDOzRCQUN6RCxJQUFJLEtBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsRUFBRTtnQ0FDeEMsbUZBQW1GO2dDQUNuRixNQUFNLEdBQUcsS0FBSyxDQUFDO2dDQUNmLElBQU0sY0FBYyxHQUNoQixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFzQixDQUFDO2dDQUNoRixJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUU7b0NBQzFCLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0NBQzdFLElBQUksVUFBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTt3Q0FDckIsSUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFHLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQzt3Q0FDNUQsSUFBSSxLQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEVBQUU7NENBQ3pDLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQ2hCLENBQUM7NENBQ3hELElBQUksUUFBUSxDQUFDLHVCQUF1QixFQUFFO2dEQUNwQyxLQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dEQUMvQyxpQ0FBaUM7Z0RBQ2pDLGlDQUFpQztnREFDakMsNENBQTRDO2dEQUM1QyxnQ0FBZ0M7NkNBQ2pDO2lEQUFNLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRTtnREFDNUIsS0FBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztnREFDdkMsTUFBTSxHQUFHLElBQUksQ0FBQzs2Q0FDZjt5Q0FDRjtxQ0FDRjtpQ0FDRjs2QkFDRjtpQ0FBTTtnQ0FDTCxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dDQUN2QyxJQUFJLE1BQU0sSUFBSSxTQUFTLEVBQUU7b0NBQ3ZCLDRCQUE0QjtvQ0FDNUIsTUFBTSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO2lDQUNuQztxQ0FBTTtvQ0FDTCxNQUFNLEdBQUcsS0FBSyxDQUFDO2lDQUNoQjs2QkFDRjt5QkFDRjt3QkFBQyxXQUFNOzRCQUNOLGtFQUFrRTs0QkFDbEUsTUFBTSxHQUFHLEtBQUssQ0FBQzt5QkFDaEI7cUJBQ0Y7b0JBQ0QsS0FBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7aUJBQ2xEO2dCQUNELE9BQU8sTUFBTSxDQUFDO1lBQ2hCLENBQUMsQ0FBQztZQUVGLE9BQU8sZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFZSCxnREFBQztJQUFELENBQUMsQUE1akJELElBNGpCQztJQTVqQlksOEZBQXlDO0lBOGpCdEQsU0FBUyx5QkFBeUIsQ0FBQyxPQUFzQjtRQUN2RCxPQUFPLElBQUksR0FBRyxDQUFDLElBQUEsb0NBQXlCLEVBQUMsT0FBTyxDQUFDLEtBQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLEVBQUUsQ0FBQyxVQUFXLEVBQWQsQ0FBYyxDQUFDLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBRUQsU0FBUyx5QkFBeUIsQ0FBQyxFQUFpQixFQUFFLFlBQXNCO1FBQzFFLGlFQUFpRTtRQUNqRSwyRkFBMkY7UUFDM0YscUZBQXFGO1FBQ3JGLHlEQUF5RDtRQUN6RCxJQUFJLHVCQUF1QixHQUN0QixFQUFVLENBQUMsdUJBQXVCLENBQUM7UUFDeEMsSUFBSSxDQUFDLHVCQUF1QixFQUFFO1lBQzVCLHVCQUF1QixHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUM7WUFDNUMsRUFBVSxDQUFDLHVCQUF1QixHQUFHLHVCQUF1QixDQUFDO1NBQy9EO1FBQ0QsSUFBTSxrQkFBa0Isc0RBQU8sdUJBQXVCLFNBQUMsQ0FBQztRQUN4RCxZQUFZLENBQUMsT0FBTyxDQUFDLFVBQUEsRUFBRSxJQUFJLE9BQUEsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUF2RCxDQUF1RCxDQUFDLENBQUM7UUFDcEYsRUFBRSxDQUFDLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQztJQUMxQyxDQUFDO0lBRUQsU0FBZ0IscUJBQXFCLENBQUMsVUFBeUI7UUFDN0QsT0FBTyxVQUFVLElBQUssVUFBa0IsQ0FBQyx1QkFBdUIsQ0FBQztJQUNuRSxDQUFDO0lBRkQsc0RBRUM7SUFFRCxTQUFTLFdBQVcsQ0FBQyxJQUFZLEVBQUUsRUFBVTtRQUMzQyxJQUFNLEtBQUssR0FBVyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBQ3RELENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsY0FBYyxDQUFDLFFBQWdCO1FBQ3RDLElBQU0sS0FBSyxHQUFHLHlCQUF5QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2RCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDakMsQ0FBQztJQUVELFNBQVMsc0JBQXNCLENBQUMsUUFBZ0I7UUFDOUMsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxTQUFTLG9CQUFvQixDQUFDLFFBQWdCO1FBQzVDLElBQU0sS0FBSyxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoRCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDakMsQ0FBQztJQUVELFNBQVMscUJBQXFCLENBQUMsUUFBZ0I7UUFDN0MsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLFFBQWdCO1FBQzNDLE9BQVUsUUFBUSxrQkFBZSxDQUFDO0lBQ3BDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBb3RDb21waWxlckhvc3QsIGNvbGxlY3RFeHRlcm5hbFJlZmVyZW5jZXMsIEVtaXR0ZXJWaXNpdG9yQ29udGV4dCwgR2VuZXJhdGVkRmlsZSwgUGFyc2VTb3VyY2VTcGFuLCBzeW50YXhFcnJvciwgVHlwZVNjcmlwdEVtaXR0ZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtUeXBlQ2hlY2tIb3N0fSBmcm9tICcuLi9kaWFnbm9zdGljcy90cmFuc2xhdGVfZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtNb2R1bGVNZXRhZGF0YX0gZnJvbSAnLi4vbWV0YWRhdGEvaW5kZXgnO1xuaW1wb3J0IHtqb2lufSBmcm9tICcuLi9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7Q29tcGlsZXJIb3N0LCBDb21waWxlck9wdGlvbnMsIExpYnJhcnlTdW1tYXJ5fSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2NyZWF0ZU1ldGFkYXRhUmVhZGVyQ2FjaGUsIE1ldGFkYXRhUmVhZGVySG9zdCwgcmVhZE1ldGFkYXRhfSBmcm9tICcuL21ldGFkYXRhX3JlYWRlcic7XG5pbXBvcnQge0RUUywgR0VORVJBVEVEX0ZJTEVTLCBpc0luUm9vdERpciwgcmVsYXRpdmVUb1Jvb3REaXJzfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBOT0RFX01PRFVMRVNfUEFDS0FHRV9OQU1FID0gL25vZGVfbW9kdWxlc1xcLygoXFx3fC18XFwuKSt8KEAoXFx3fC18XFwuKStcXC8oXFx3fC18XFwuKSspKS87XG5jb25zdCBFWFQgPSAvKFxcLnRzfFxcLmRcXC50c3xcXC5qc3xcXC5qc3h8XFwudHN4KSQvO1xuY29uc3QgQ1NTX1BSRVBST0NFU1NPUl9FWFQgPSAvKFxcLnNjc3N8XFwuc2Fzc3xcXC5sZXNzfFxcLnN0eWwpJC87XG5cbmxldCB3cmFwSG9zdEZvclRlc3Q6ICgoaG9zdDogdHMuQ29tcGlsZXJIb3N0KSA9PiB0cy5Db21waWxlckhvc3QpfG51bGwgPSBudWxsO1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0V3JhcEhvc3RGb3JUZXN0KHdyYXBGbjogKChob3N0OiB0cy5Db21waWxlckhvc3QpID0+IHRzLkNvbXBpbGVySG9zdCl8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwpOiB2b2lkIHtcbiAgd3JhcEhvc3RGb3JUZXN0ID0gd3JhcEZuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29tcGlsZXJIb3N0KFxuICAgIHtvcHRpb25zLCB0c0hvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3Qob3B0aW9ucywgdHJ1ZSl9OlxuICAgICAgICB7b3B0aW9uczogQ29tcGlsZXJPcHRpb25zLCB0c0hvc3Q/OiB0cy5Db21waWxlckhvc3R9KTogQ29tcGlsZXJIb3N0IHtcbiAgaWYgKHdyYXBIb3N0Rm9yVGVzdCAhPT0gbnVsbCkge1xuICAgIHRzSG9zdCA9IHdyYXBIb3N0Rm9yVGVzdCh0c0hvc3QpO1xuICB9XG4gIHJldHVybiB0c0hvc3Q7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWV0YWRhdGFQcm92aWRlciB7XG4gIGdldE1ldGFkYXRhKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBNb2R1bGVNZXRhZGF0YXx1bmRlZmluZWQ7XG59XG5cbmludGVyZmFjZSBHZW5Tb3VyY2VGaWxlIHtcbiAgZXh0ZXJuYWxSZWZlcmVuY2VzOiBTZXQ8c3RyaW5nPjtcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZTtcbiAgZW1pdEN0eDogRW1pdHRlclZpc2l0b3JDb250ZXh0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvZGVHZW5lcmF0b3Ige1xuICBnZW5lcmF0ZUZpbGUoZ2VuRmlsZU5hbWU6IHN0cmluZywgYmFzZUZpbGVOYW1lPzogc3RyaW5nKTogR2VuZXJhdGVkRmlsZTtcbiAgZmluZEdlbmVyYXRlZEZpbGVOYW1lcyhmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nW107XG59XG5cbmZ1bmN0aW9uIGFzc2VydDxUPihjb25kaXRpb246IFR8bnVsbHx1bmRlZmluZWQpIHtcbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICAvLyBUT0RPKGNodWNramF6KTogZG8gdGhlIHJpZ2h0IHRoaW5nXG4gIH1cbiAgcmV0dXJuIGNvbmRpdGlvbiE7XG59XG5cbi8qKlxuICogSW1wbGVtZW50cyB0aGUgZm9sbG93aW5nIGhvc3RzIGJhc2VkIG9uIGFuIGFwaS5Db21waWxlckhvc3Q6XG4gKiAtIHRzLkNvbXBpbGVySG9zdCB0byBiZSBjb25zdW1lZCBieSBhIHRzLlByb2dyYW1cbiAqIC0gQW90Q29tcGlsZXJIb3N0IGZvciBAYW5ndWxhci9jb21waWxlclxuICogLSBUeXBlQ2hlY2tIb3N0IGZvciBtYXBwaW5nIHRzIGVycm9ycyB0byBuZyBlcnJvcnMgKHZpYSB0cmFuc2xhdGVEaWFnbm9zdGljcylcbiAqL1xuZXhwb3J0IGNsYXNzIFRzQ29tcGlsZXJBb3RDb21waWxlclR5cGVDaGVja0hvc3RBZGFwdGVyIGltcGxlbWVudHMgdHMuQ29tcGlsZXJIb3N0LCBBb3RDb21waWxlckhvc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBUeXBlQ2hlY2tIb3N0IHtcbiAgcHJpdmF0ZSBtZXRhZGF0YVJlYWRlckNhY2hlID0gY3JlYXRlTWV0YWRhdGFSZWFkZXJDYWNoZSgpO1xuICBwcml2YXRlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIGZsYXRNb2R1bGVJbmRleENhY2hlID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KCk7XG4gIHByaXZhdGUgZmxhdE1vZHVsZUluZGV4TmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgcHJpdmF0ZSBmbGF0TW9kdWxlSW5kZXhSZWRpcmVjdE5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHByaXZhdGUgcm9vdERpcnM6IHN0cmluZ1tdO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdXRpb25DYWNoZTogdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlO1xuICBwcml2YXRlIG9yaWdpbmFsU291cmNlRmlsZXMgPSBuZXcgTWFwPHN0cmluZywgdHMuU291cmNlRmlsZXxudWxsPigpO1xuICBwcml2YXRlIG9yaWdpbmFsRmlsZUV4aXN0c0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KCk7XG4gIHByaXZhdGUgZ2VuZXJhdGVkU291cmNlRmlsZXMgPSBuZXcgTWFwPHN0cmluZywgR2VuU291cmNlRmlsZT4oKTtcbiAgcHJpdmF0ZSBnZW5lcmF0ZWRDb2RlRm9yID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xuICBwcml2YXRlIGVtaXR0ZXIgPSBuZXcgVHlwZVNjcmlwdEVtaXR0ZXIoKTtcbiAgcHJpdmF0ZSBtZXRhZGF0YVJlYWRlckhvc3Q6IE1ldGFkYXRhUmVhZGVySG9zdDtcblxuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgZ2V0Q2FuY2VsbGF0aW9uVG9rZW4hOiAoKSA9PiB0cy5DYW5jZWxsYXRpb25Ub2tlbjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIGdldERlZmF1bHRMaWJMb2NhdGlvbiE6ICgpID0+IHN0cmluZztcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHRyYWNlITogKHM6IHN0cmluZykgPT4gdm9pZDtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIGdldERpcmVjdG9yaWVzITogKHBhdGg6IHN0cmluZykgPT4gc3RyaW5nW107XG4gIHJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcz86XG4gICAgICAobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKSA9PiB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXTtcbiAgZGlyZWN0b3J5RXhpc3RzPzogKGRpcmVjdG9yeU5hbWU6IHN0cmluZykgPT4gYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm9vdEZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sIHByaXZhdGUgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBjb250ZXh0OiBDb21waWxlckhvc3QsIHByaXZhdGUgbWV0YWRhdGFQcm92aWRlcjogTWV0YWRhdGFQcm92aWRlcixcbiAgICAgIHByaXZhdGUgY29kZUdlbmVyYXRvcjogQ29kZUdlbmVyYXRvcixcbiAgICAgIHByaXZhdGUgbGlicmFyeVN1bW1hcmllcyA9IG5ldyBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4oKSkge1xuICAgIHRoaXMubW9kdWxlUmVzb2x1dGlvbkNhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKFxuICAgICAgICB0aGlzLmNvbnRleHQuZ2V0Q3VycmVudERpcmVjdG9yeSEoKSwgdGhpcy5jb250ZXh0LmdldENhbm9uaWNhbEZpbGVOYW1lLmJpbmQodGhpcy5jb250ZXh0KSk7XG4gICAgY29uc3QgYmFzZVBhdGggPSB0aGlzLm9wdGlvbnMuYmFzZVBhdGghO1xuICAgIHRoaXMucm9vdERpcnMgPVxuICAgICAgICAodGhpcy5vcHRpb25zLnJvb3REaXJzIHx8IFt0aGlzLm9wdGlvbnMuYmFzZVBhdGghXSkubWFwKHAgPT4gcGF0aC5yZXNvbHZlKGJhc2VQYXRoLCBwKSk7XG4gICAgaWYgKGNvbnRleHQuZ2V0RGlyZWN0b3JpZXMpIHtcbiAgICAgIHRoaXMuZ2V0RGlyZWN0b3JpZXMgPSBwYXRoID0+IGNvbnRleHQuZ2V0RGlyZWN0b3JpZXMhKHBhdGgpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5kaXJlY3RvcnlFeGlzdHMpIHtcbiAgICAgIHRoaXMuZGlyZWN0b3J5RXhpc3RzID0gZGlyZWN0b3J5TmFtZSA9PiBjb250ZXh0LmRpcmVjdG9yeUV4aXN0cyEoZGlyZWN0b3J5TmFtZSk7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LmdldENhbmNlbGxhdGlvblRva2VuKSB7XG4gICAgICB0aGlzLmdldENhbmNlbGxhdGlvblRva2VuID0gKCkgPT4gY29udGV4dC5nZXRDYW5jZWxsYXRpb25Ub2tlbiEoKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQuZ2V0RGVmYXVsdExpYkxvY2F0aW9uKSB7XG4gICAgICB0aGlzLmdldERlZmF1bHRMaWJMb2NhdGlvbiA9ICgpID0+IGNvbnRleHQuZ2V0RGVmYXVsdExpYkxvY2F0aW9uISgpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5yZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMpIHtcbiAgICAgIC8vIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBUeXBlU2NyaXB0IDIuOSBhbmQgb2xkZXIgc2luY2UgcmV0dXJuXG4gICAgICAvLyB0eXBlIGhhcyBjaGFuZ2VkIGZyb20gKHRzLlJlc29sdmVkVHlwZVJlZmVyZW5jZURpcmVjdGl2ZSB8IHVuZGVmaW5lZClbXVxuICAgICAgLy8gdG8gdHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlW10gaW4gVHlwZXNjcmlwdCAzLjBcbiAgICAgIHR5cGUgdHMzUmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzID0gKG5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZykgPT5cbiAgICAgICAgICB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXTtcbiAgICAgIHRoaXMucmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzID0gKG5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZykgPT5cbiAgICAgICAgICAoY29udGV4dC5yZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMgYXMgdHMzUmVzb2x2ZVR5cGVSZWZlcmVuY2VEaXJlY3RpdmVzKSFcbiAgICAgICAgICAobmFtZXMsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQudHJhY2UpIHtcbiAgICAgIHRoaXMudHJhY2UgPSBzID0+IGNvbnRleHQudHJhY2UhKHMpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5maWxlTmFtZVRvTW9kdWxlTmFtZSkge1xuICAgICAgdGhpcy5maWxlTmFtZVRvTW9kdWxlTmFtZSA9IGNvbnRleHQuZmlsZU5hbWVUb01vZHVsZU5hbWUuYmluZChjb250ZXh0KTtcbiAgICB9XG4gICAgLy8gTm90ZTogZG9uJ3QgY29weSBvdmVyIGNvbnRleHQubW9kdWxlTmFtZVRvRmlsZU5hbWUgYXMgd2UgZmlyc3RcbiAgICAvLyBub3JtYWxpemUgdW5kZWZpbmVkIGNvbnRhaW5pbmdGaWxlIHRvIGEgZmlsbGVkIGNvbnRhaW5pbmdGaWxlLlxuICAgIGlmIChjb250ZXh0LnJlc291cmNlTmFtZVRvRmlsZU5hbWUpIHtcbiAgICAgIHRoaXMucmVzb3VyY2VOYW1lVG9GaWxlTmFtZSA9IGNvbnRleHQucmVzb3VyY2VOYW1lVG9GaWxlTmFtZS5iaW5kKGNvbnRleHQpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC50b1N1bW1hcnlGaWxlTmFtZSkge1xuICAgICAgdGhpcy50b1N1bW1hcnlGaWxlTmFtZSA9IGNvbnRleHQudG9TdW1tYXJ5RmlsZU5hbWUuYmluZChjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKGNvbnRleHQuZnJvbVN1bW1hcnlGaWxlTmFtZSkge1xuICAgICAgdGhpcy5mcm9tU3VtbWFyeUZpbGVOYW1lID0gY29udGV4dC5mcm9tU3VtbWFyeUZpbGVOYW1lLmJpbmQoY29udGV4dCk7XG4gICAgfVxuICAgIHRoaXMubWV0YWRhdGFSZWFkZXJIb3N0ID0ge1xuICAgICAgY2FjaGVNZXRhZGF0YTogKCkgPT4gdHJ1ZSxcbiAgICAgIGdldFNvdXJjZUZpbGVNZXRhZGF0YTogKGZpbGVQYXRoKSA9PiB7XG4gICAgICAgIGNvbnN0IHNmID0gdGhpcy5nZXRPcmlnaW5hbFNvdXJjZUZpbGUoZmlsZVBhdGgpO1xuICAgICAgICByZXR1cm4gc2YgPyB0aGlzLm1ldGFkYXRhUHJvdmlkZXIuZ2V0TWV0YWRhdGEoc2YpIDogdW5kZWZpbmVkO1xuICAgICAgfSxcbiAgICAgIGZpbGVFeGlzdHM6IChmaWxlUGF0aCkgPT4gdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMoZmlsZVBhdGgpLFxuICAgICAgcmVhZEZpbGU6IChmaWxlUGF0aCkgPT4gYXNzZXJ0KHRoaXMuY29udGV4dC5yZWFkRmlsZShmaWxlUGF0aCkpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVNb2R1bGVOYW1lKG1vZHVsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHRzLlJlc29sdmVkTW9kdWxlXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBybSA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKFxuICAgICAgICAgICAgICAgICAgICAgbW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLCB0aGlzLm9wdGlvbnMsIHRoaXMsXG4gICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZHVsZVJlc29sdXRpb25DYWNoZSlcbiAgICAgICAgICAgICAgICAgICAucmVzb2x2ZWRNb2R1bGU7XG4gICAgaWYgKHJtICYmIHRoaXMuaXNTb3VyY2VGaWxlKHJtLnJlc29sdmVkRmlsZU5hbWUpICYmIERUUy50ZXN0KHJtLnJlc29sdmVkRmlsZU5hbWUpKSB7XG4gICAgICAvLyBDYXNlOiBnZW5lcmF0ZUNvZGVGb3JMaWJyYXJpZXMgPSB0cnVlIGFuZCBtb2R1bGVOYW1lIGlzXG4gICAgICAvLyBhIC5kLnRzIGZpbGUgaW4gYSBub2RlX21vZHVsZXMgZm9sZGVyLlxuICAgICAgLy8gTmVlZCB0byBzZXQgaXNFeHRlcm5hbExpYnJhcnlJbXBvcnQgdG8gZmFsc2Ugc28gdGhhdCBnZW5lcmF0ZWQgZmlsZXMgZm9yIHRoYXQgZmlsZVxuICAgICAgLy8gYXJlIGVtaXR0ZWQuXG4gICAgICBybS5pc0V4dGVybmFsTGlicmFyeUltcG9ydCA9IGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gcm07XG4gIH1cblxuICAvLyBOb3RlOiBXZSBpbXBsZW1lbnQgdGhpcyBtZXRob2Qgc28gdGhhdCBUeXBlU2NyaXB0IGFuZCBBbmd1bGFyIHNoYXJlIHRoZSBzYW1lXG4gIC8vIHRzLk1vZHVsZVJlc29sdXRpb25DYWNoZVxuICAvLyBhbmQgdGhhdCB3ZSBjYW4gdGVsbCB0cy5Qcm9ncmFtIGFib3V0IG91ciBkaWZmZXJlbnQgb3BpbmlvbiBhYm91dFxuICAvLyBSZXNvbHZlZE1vZHVsZS5pc0V4dGVybmFsTGlicmFyeUltcG9ydFxuICAvLyAoc2VlIG91ciBpc1NvdXJjZUZpbGUgbWV0aG9kKS5cbiAgcmVzb2x2ZU1vZHVsZU5hbWVzKG1vZHVsZU5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHRzLlJlc29sdmVkTW9kdWxlW10ge1xuICAgIC8vIFRPRE8odGJvc2NoKTogdGhpcyBzZWVtcyB0byBiZSBhIHR5cGluZyBlcnJvciBpbiBUeXBlU2NyaXB0LFxuICAgIC8vIGFzIGl0IGNvbnRhaW5zIGFzc2VydGlvbnMgdGhhdCB0aGUgcmVzdWx0IGNvbnRhaW5zIHRoZSBzYW1lIG51bWJlciBvZiBlbnRyaWVzXG4gICAgLy8gYXMgdGhlIGdpdmVuIG1vZHVsZSBuYW1lcy5cbiAgICByZXR1cm4gPHRzLlJlc29sdmVkTW9kdWxlW10+bW9kdWxlTmFtZXMubWFwKFxuICAgICAgICBtb2R1bGVOYW1lID0+IHRoaXMucmVzb2x2ZU1vZHVsZU5hbWUobW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUpKTtcbiAgfVxuXG4gIG1vZHVsZU5hbWVUb0ZpbGVOYW1lKG06IHN0cmluZywgY29udGFpbmluZ0ZpbGU/OiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKCFjb250YWluaW5nRmlsZSkge1xuICAgICAgaWYgKG0uaW5kZXhPZignLicpID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVzb2x1dGlvbiBvZiByZWxhdGl2ZSBwYXRocyByZXF1aXJlcyBhIGNvbnRhaW5pbmcgZmlsZS4nKTtcbiAgICAgIH1cbiAgICAgIC8vIEFueSBjb250YWluaW5nIGZpbGUgZ2l2ZXMgdGhlIHNhbWUgcmVzdWx0IGZvciBhYnNvbHV0ZSBpbXBvcnRzXG4gICAgICBjb250YWluaW5nRmlsZSA9IHRoaXMucm9vdEZpbGVzWzBdO1xuICAgIH1cbiAgICBpZiAodGhpcy5jb250ZXh0Lm1vZHVsZU5hbWVUb0ZpbGVOYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb250ZXh0Lm1vZHVsZU5hbWVUb0ZpbGVOYW1lKG0sIGNvbnRhaW5pbmdGaWxlKTtcbiAgICB9XG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKG0sIGNvbnRhaW5pbmdGaWxlKTtcbiAgICByZXR1cm4gcmVzb2x2ZWQgPyByZXNvbHZlZC5yZXNvbHZlZEZpbGVOYW1lIDogbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBXZSB3YW50IGEgbW9kdWxlSWQgdGhhdCB3aWxsIGFwcGVhciBpbiBpbXBvcnQgc3RhdGVtZW50cyBpbiB0aGUgZ2VuZXJhdGVkIGNvZGVcbiAgICogd2hpY2ggd2lsbCBiZSB3cml0dGVuIHRvIGBjb250YWluaW5nRmlsZWAuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB3ZSBhbHNvIGdlbmVyYXRlIGZpbGVzIGZvciBmaWxlcyBpbiBub2RlX21vZHVsZXMsIGFzIGxpYnJhcmllc1xuICAgKiBvbmx5IHNoaXAgLm1ldGFkYXRhLmpzb24gZmlsZXMgYnV0IG5vdCB0aGUgZ2VuZXJhdGVkIGNvZGUuXG4gICAqXG4gICAqIExvZ2ljOlxuICAgKiAxLiBpZiB0aGUgaW1wb3J0ZWRGaWxlIGFuZCB0aGUgY29udGFpbmluZ0ZpbGUgYXJlIGZyb20gdGhlIHByb2plY3Qgc291cmNlc1xuICAgKiAgICBvciBmcm9tIHRoZSBzYW1lIG5vZGVfbW9kdWxlcyBwYWNrYWdlLCB1c2UgYSByZWxhdGl2ZSBwYXRoXG4gICAqIDIuIGlmIHRoZSBpbXBvcnRlZEZpbGUgaXMgaW4gYSBub2RlX21vZHVsZXMgcGFja2FnZSxcbiAgICogICAgdXNlIGEgcGF0aCB0aGF0IHN0YXJ0cyB3aXRoIHRoZSBwYWNrYWdlIG5hbWUuXG4gICAqIDMuIEVycm9yIGlmIHRoZSBjb250YWluaW5nRmlsZSBpcyBpbiB0aGUgbm9kZV9tb2R1bGVzIHBhY2thZ2VcbiAgICogICAgYW5kIHRoZSBpbXBvcnRlZEZpbGUgaXMgaW4gdGhlIHByb2plY3Qgc291cmVzLFxuICAgKiAgICBhcyB0aGF0IGlzIGEgdmlvbGF0aW9uIG9mIHRoZSBwcmluY2lwbGUgdGhhdCBub2RlX21vZHVsZXMgcGFja2FnZXMgY2Fubm90XG4gICAqICAgIGltcG9ydCBwcm9qZWN0IHNvdXJjZXMuXG4gICAqL1xuICBmaWxlTmFtZVRvTW9kdWxlTmFtZShpbXBvcnRlZEZpbGU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgY2FjaGVLZXkgPSBgJHtpbXBvcnRlZEZpbGV9OiR7Y29udGFpbmluZ0ZpbGV9YDtcbiAgICBsZXQgbW9kdWxlTmFtZSA9IHRoaXMuZmlsZU5hbWVUb01vZHVsZU5hbWVDYWNoZS5nZXQoY2FjaGVLZXkpO1xuICAgIGlmIChtb2R1bGVOYW1lICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBtb2R1bGVOYW1lO1xuICAgIH1cblxuICAgIGNvbnN0IG9yaWdpbmFsSW1wb3J0ZWRGaWxlID0gaW1wb3J0ZWRGaWxlO1xuICAgIGlmICh0aGlzLm9wdGlvbnMudHJhY2VSZXNvbHV0aW9uKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICdmaWxlTmFtZVRvTW9kdWxlTmFtZSBmcm9tIGNvbnRhaW5pbmdGaWxlJywgY29udGFpbmluZ0ZpbGUsICd0byBpbXBvcnRlZEZpbGUnLFxuICAgICAgICAgIGltcG9ydGVkRmlsZSk7XG4gICAgfVxuXG4gICAgLy8gZHJvcCBleHRlbnNpb25cbiAgICBpbXBvcnRlZEZpbGUgPSBpbXBvcnRlZEZpbGUucmVwbGFjZShFWFQsICcnKTtcbiAgICBjb25zdCBpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZSA9IGdldFBhY2thZ2VOYW1lKGltcG9ydGVkRmlsZSk7XG4gICAgY29uc3QgY29udGFpbmluZ0ZpbGVQYWNrYWdlTmFtZSA9IGdldFBhY2thZ2VOYW1lKGNvbnRhaW5pbmdGaWxlKTtcblxuICAgIGlmIChpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZSA9PT0gY29udGFpbmluZ0ZpbGVQYWNrYWdlTmFtZSB8fFxuICAgICAgICBHRU5FUkFURURfRklMRVMudGVzdChvcmlnaW5hbEltcG9ydGVkRmlsZSkpIHtcbiAgICAgIGNvbnN0IHJvb3RlZENvbnRhaW5pbmdGaWxlID0gcmVsYXRpdmVUb1Jvb3REaXJzKGNvbnRhaW5pbmdGaWxlLCB0aGlzLnJvb3REaXJzKTtcbiAgICAgIGNvbnN0IHJvb3RlZEltcG9ydGVkRmlsZSA9IHJlbGF0aXZlVG9Sb290RGlycyhpbXBvcnRlZEZpbGUsIHRoaXMucm9vdERpcnMpO1xuXG4gICAgICBpZiAocm9vdGVkQ29udGFpbmluZ0ZpbGUgIT09IGNvbnRhaW5pbmdGaWxlICYmIHJvb3RlZEltcG9ydGVkRmlsZSAhPT0gaW1wb3J0ZWRGaWxlKSB7XG4gICAgICAgIC8vIGlmIGJvdGggZmlsZXMgYXJlIGNvbnRhaW5lZCBpbiB0aGUgYHJvb3REaXJzYCwgdGhlbiBzdHJpcCB0aGUgcm9vdERpcnNcbiAgICAgICAgY29udGFpbmluZ0ZpbGUgPSByb290ZWRDb250YWluaW5nRmlsZTtcbiAgICAgICAgaW1wb3J0ZWRGaWxlID0gcm9vdGVkSW1wb3J0ZWRGaWxlO1xuICAgICAgfVxuICAgICAgbW9kdWxlTmFtZSA9IGRvdFJlbGF0aXZlKHBhdGguZGlybmFtZShjb250YWluaW5nRmlsZSksIGltcG9ydGVkRmlsZSk7XG4gICAgfSBlbHNlIGlmIChpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZSkge1xuICAgICAgbW9kdWxlTmFtZSA9IHN0cmlwTm9kZU1vZHVsZXNQcmVmaXgoaW1wb3J0ZWRGaWxlKTtcbiAgICAgIGlmIChvcmlnaW5hbEltcG9ydGVkRmlsZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAvLyB0aGUgbW9kdWxlTmFtZSBmb3IgdGhlc2UgdHlwaW5ncyBjb3VsZCBiZSBzaG9ydGVudGVkIHRvIHRoZSBucG0gcGFja2FnZSBuYW1lXG4gICAgICAgIC8vIGlmIHRoZSBucG0gcGFja2FnZSB0eXBpbmdzIG1hdGNoZXMgdGhlIGltcG9ydGVkRmlsZVxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG1vZHVsZVBhdGggPSBpbXBvcnRlZEZpbGUuc3Vic3RyaW5nKDAsIGltcG9ydGVkRmlsZS5sZW5ndGggLSBtb2R1bGVOYW1lLmxlbmd0aCkgK1xuICAgICAgICAgICAgICBpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZTtcbiAgICAgICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IHJlcXVpcmUobW9kdWxlUGF0aCArICcvcGFja2FnZS5qc29uJyk7XG4gICAgICAgICAgY29uc3QgcGFja2FnZVR5cGluZ3MgPSBqb2luKG1vZHVsZVBhdGgsIHBhY2thZ2VKc29uLnR5cGluZ3MpO1xuICAgICAgICAgIGlmIChwYWNrYWdlVHlwaW5ncyA9PT0gb3JpZ2luYWxJbXBvcnRlZEZpbGUpIHtcbiAgICAgICAgICAgIG1vZHVsZU5hbWUgPSBpbXBvcnRlZEZpbGVQYWNrYWdlTmFtZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIHRoZSBhYm92ZSByZXF1aXJlKCkgd2lsbCB0aHJvdyBpZiB0aGVyZSBpcyBubyBwYWNrYWdlLmpzb24gZmlsZVxuICAgICAgICAgIC8vIGFuZCB0aGlzIGlzIHNhZmUgdG8gaWdub3JlIGFuZCBjb3JyZWN0IHRvIGtlZXAgdGhlIGxvbmdlclxuICAgICAgICAgIC8vIG1vZHVsZU5hbWUgaW4gdGhpcyBjYXNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUcnlpbmcgdG8gaW1wb3J0IGEgc291cmNlIGZpbGUgZnJvbSBhIG5vZGVfbW9kdWxlcyBwYWNrYWdlOiBpbXBvcnQgJHtcbiAgICAgICAgICBvcmlnaW5hbEltcG9ydGVkRmlsZX0gZnJvbSAke2NvbnRhaW5pbmdGaWxlfWApO1xuICAgIH1cblxuICAgIHRoaXMuZmlsZU5hbWVUb01vZHVsZU5hbWVDYWNoZS5zZXQoY2FjaGVLZXksIG1vZHVsZU5hbWUpO1xuICAgIHJldHVybiBtb2R1bGVOYW1lO1xuICB9XG5cbiAgcmVzb3VyY2VOYW1lVG9GaWxlTmFtZShyZXNvdXJjZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgICAvLyBOb3RlOiB3ZSBjb252ZXJ0IHBhY2thZ2UgcGF0aHMgaW50byByZWxhdGl2ZSBwYXRocyB0byBiZSBjb21wYXRpYmxlIHdpdGggdGhlIHRoZVxuICAgIC8vIHByZXZpb3VzIGltcGxlbWVudGF0aW9uIG9mIFVybFJlc29sdmVyLlxuICAgIGNvbnN0IGZpcnN0Q2hhciA9IHJlc291cmNlTmFtZVswXTtcbiAgICBpZiAoZmlyc3RDaGFyID09PSAnLycpIHtcbiAgICAgIHJlc291cmNlTmFtZSA9IHJlc291cmNlTmFtZS5zbGljZSgxKTtcbiAgICB9IGVsc2UgaWYgKGZpcnN0Q2hhciAhPT0gJy4nKSB7XG4gICAgICByZXNvdXJjZU5hbWUgPSBgLi8ke3Jlc291cmNlTmFtZX1gO1xuICAgIH1cbiAgICBsZXQgZmlsZVBhdGhXaXRoTmdSZXNvdXJjZSA9XG4gICAgICAgIHRoaXMubW9kdWxlTmFtZVRvRmlsZU5hbWUoYWRkTmdSZXNvdXJjZVN1ZmZpeChyZXNvdXJjZU5hbWUpLCBjb250YWluaW5nRmlsZSk7XG4gICAgLy8gSWYgdGhlIHVzZXIgc3BlY2lmaWVkIHN0eWxlVXJsIHBvaW50aW5nIHRvICouc2NzcywgYnV0IHRoZSBTYXNzIGNvbXBpbGVyIHdhcyBydW4gYmVmb3JlXG4gICAgLy8gQW5ndWxhciwgdGhlbiB0aGUgcmVzb3VyY2UgbWF5IGhhdmUgYmVlbiBnZW5lcmF0ZWQgYXMgKi5jc3MuIFNpbXBseSB0cnkgdGhlIHJlc29sdXRpb24gYWdhaW4uXG4gICAgaWYgKCFmaWxlUGF0aFdpdGhOZ1Jlc291cmNlICYmIENTU19QUkVQUk9DRVNTT1JfRVhULnRlc3QocmVzb3VyY2VOYW1lKSkge1xuICAgICAgY29uc3QgZmFsbGJhY2tSZXNvdXJjZU5hbWUgPSByZXNvdXJjZU5hbWUucmVwbGFjZShDU1NfUFJFUFJPQ0VTU09SX0VYVCwgJy5jc3MnKTtcbiAgICAgIGZpbGVQYXRoV2l0aE5nUmVzb3VyY2UgPVxuICAgICAgICAgIHRoaXMubW9kdWxlTmFtZVRvRmlsZU5hbWUoYWRkTmdSZXNvdXJjZVN1ZmZpeChmYWxsYmFja1Jlc291cmNlTmFtZSksIGNvbnRhaW5pbmdGaWxlKTtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gZmlsZVBhdGhXaXRoTmdSZXNvdXJjZSA/IHN0cmlwTmdSZXNvdXJjZVN1ZmZpeChmaWxlUGF0aFdpdGhOZ1Jlc291cmNlKSA6IG51bGw7XG4gICAgLy8gVXNlZCB1bmRlciBCYXplbCB0byByZXBvcnQgbW9yZSBzcGVjaWZpYyBlcnJvciB3aXRoIHJlbWVkaWF0aW9uIGFkdmljZVxuICAgIGlmICghcmVzdWx0ICYmICh0aGlzLmNvbnRleHQgYXMgYW55KS5yZXBvcnRNaXNzaW5nUmVzb3VyY2UpIHtcbiAgICAgICh0aGlzLmNvbnRleHQgYXMgYW55KS5yZXBvcnRNaXNzaW5nUmVzb3VyY2UocmVzb3VyY2VOYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHRvU3VtbWFyeUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcsIHJlZmVycmluZ1NyY0ZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmZpbGVOYW1lVG9Nb2R1bGVOYW1lKGZpbGVOYW1lLCByZWZlcnJpbmdTcmNGaWxlTmFtZSk7XG4gIH1cblxuICBmcm9tU3VtbWFyeUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcsIHJlZmVycmluZ0xpYkZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5tb2R1bGVOYW1lVG9GaWxlTmFtZShmaWxlTmFtZSwgcmVmZXJyaW5nTGliRmlsZU5hbWUpO1xuICAgIGlmICghcmVzb2x2ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgJHtmaWxlTmFtZX0gZnJvbSAke3JlZmVycmluZ0xpYkZpbGVOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gIH1cblxuICBwYXJzZVNvdXJjZVNwYW5PZihmaWxlTmFtZTogc3RyaW5nLCBsaW5lOiBudW1iZXIsIGNoYXJhY3RlcjogbnVtYmVyKTogUGFyc2VTb3VyY2VTcGFufG51bGwge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdlbmVyYXRlZFNvdXJjZUZpbGVzLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKGRhdGEgJiYgZGF0YS5lbWl0Q3R4KSB7XG4gICAgICByZXR1cm4gZGF0YS5lbWl0Q3R4LnNwYW5PZihsaW5lLCBjaGFyYWN0ZXIpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0T3JpZ2luYWxTb3VyY2VGaWxlKFxuICAgICAgZmlsZVBhdGg6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uPzogdHMuU2NyaXB0VGFyZ2V0LFxuICAgICAgb25FcnJvcj86ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQpOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICAgIC8vIE5vdGU6IHdlIG5lZWQgdGhlIGV4cGxpY2l0IGNoZWNrIHZpYSBgaGFzYCBhcyB3ZSBhbHNvIGNhY2hlIHJlc3VsdHNcbiAgICAvLyB0aGF0IHdlcmUgbnVsbCAvIHVuZGVmaW5lZC5cbiAgICBpZiAodGhpcy5vcmlnaW5hbFNvdXJjZUZpbGVzLmhhcyhmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiB0aGlzLm9yaWdpbmFsU291cmNlRmlsZXMuZ2V0KGZpbGVQYXRoKSE7XG4gICAgfVxuICAgIGlmICghbGFuZ3VhZ2VWZXJzaW9uKSB7XG4gICAgICBsYW5ndWFnZVZlcnNpb24gPSB0aGlzLm9wdGlvbnMudGFyZ2V0IHx8IHRzLlNjcmlwdFRhcmdldC5MYXRlc3Q7XG4gICAgfVxuICAgIC8vIE5vdGU6IFRoaXMgY2FuIGFsc28gcmV0dXJuIHVuZGVmaW5lZCxcbiAgICAvLyBhcyB0aGUgVFMgdHlwaW5ncyBhcmUgbm90IGNvcnJlY3QhXG4gICAgY29uc3Qgc2YgPSB0aGlzLmNvbnRleHQuZ2V0U291cmNlRmlsZShmaWxlUGF0aCwgbGFuZ3VhZ2VWZXJzaW9uLCBvbkVycm9yKSB8fCBudWxsO1xuICAgIHRoaXMub3JpZ2luYWxTb3VyY2VGaWxlcy5zZXQoZmlsZVBhdGgsIHNmKTtcbiAgICByZXR1cm4gc2Y7XG4gIH1cblxuICB1cGRhdGVHZW5lcmF0ZWRGaWxlKGdlbkZpbGU6IEdlbmVyYXRlZEZpbGUpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICBpZiAoIWdlbkZpbGUuc3RtdHMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgSW52YWxpZCBBcmd1bWVudDogRXhwZWN0ZWQgYSBHZW5lcmF0ZUZpbGUgd2l0aCBzdGF0ZW1lbnRzLiAke2dlbkZpbGUuZ2VuRmlsZVVybH1gKTtcbiAgICB9XG4gICAgY29uc3Qgb2xkR2VuRmlsZSA9IHRoaXMuZ2VuZXJhdGVkU291cmNlRmlsZXMuZ2V0KGdlbkZpbGUuZ2VuRmlsZVVybCk7XG4gICAgaWYgKCFvbGRHZW5GaWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYElsbGVnYWwgU3RhdGU6IHByZXZpb3VzIEdlbmVyYXRlZEZpbGUgbm90IGZvdW5kIGZvciAke2dlbkZpbGUuZ2VuRmlsZVVybH0uYCk7XG4gICAgfVxuICAgIGNvbnN0IG5ld1JlZnMgPSBnZW5GaWxlRXh0ZXJuYWxSZWZlcmVuY2VzKGdlbkZpbGUpO1xuICAgIGNvbnN0IG9sZFJlZnMgPSBvbGRHZW5GaWxlLmV4dGVybmFsUmVmZXJlbmNlcztcbiAgICBsZXQgcmVmc0FyZUVxdWFsID0gb2xkUmVmcy5zaXplID09PSBuZXdSZWZzLnNpemU7XG4gICAgaWYgKHJlZnNBcmVFcXVhbCkge1xuICAgICAgbmV3UmVmcy5mb3JFYWNoKHIgPT4gcmVmc0FyZUVxdWFsID0gcmVmc0FyZUVxdWFsICYmIG9sZFJlZnMuaGFzKHIpKTtcbiAgICB9XG4gICAgaWYgKCFyZWZzQXJlRXF1YWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSWxsZWdhbCBTdGF0ZTogZXh0ZXJuYWwgcmVmZXJlbmNlcyBjaGFuZ2VkIGluICR7Z2VuRmlsZS5nZW5GaWxlVXJsfS5cXG5PbGQ6ICR7XG4gICAgICAgICAgQXJyYXkuZnJvbShvbGRSZWZzKX0uXFxuTmV3OiAke0FycmF5LmZyb20obmV3UmVmcyl9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFkZEdlbmVyYXRlZEZpbGUoZ2VuRmlsZSwgbmV3UmVmcyk7XG4gIH1cblxuICBwcml2YXRlIGFkZEdlbmVyYXRlZEZpbGUoZ2VuRmlsZTogR2VuZXJhdGVkRmlsZSwgZXh0ZXJuYWxSZWZlcmVuY2VzOiBTZXQ8c3RyaW5nPik6IHRzLlNvdXJjZUZpbGUge1xuICAgIGlmICghZ2VuRmlsZS5zdG10cykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbnZhbGlkIEFyZ3VtZW50OiBFeHBlY3RlZCBhIEdlbmVyYXRlRmlsZSB3aXRoIHN0YXRlbWVudHMuICR7Z2VuRmlsZS5nZW5GaWxlVXJsfWApO1xuICAgIH1cbiAgICBjb25zdCB7c291cmNlVGV4dCwgY29udGV4dH0gPSB0aGlzLmVtaXR0ZXIuZW1pdFN0YXRlbWVudHNBbmRDb250ZXh0KFxuICAgICAgICBnZW5GaWxlLmdlbkZpbGVVcmwsIGdlbkZpbGUuc3RtdHMsIC8qIHByZWFtYmxlICovICcnLFxuICAgICAgICAvKiBlbWl0U291cmNlTWFwcyAqLyBmYWxzZSk7XG4gICAgY29uc3Qgc2YgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICBnZW5GaWxlLmdlbkZpbGVVcmwsIHNvdXJjZVRleHQsIHRoaXMub3B0aW9ucy50YXJnZXQgfHwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5tb2R1bGUgPT09IHRzLk1vZHVsZUtpbmQuQU1EIHx8IHRoaXMub3B0aW9ucy5tb2R1bGUgPT09IHRzLk1vZHVsZUtpbmQuVU1EKSB7XG4gICAgICBpZiAodGhpcy5jb250ZXh0LmFtZE1vZHVsZU5hbWUpIHtcbiAgICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IHRoaXMuY29udGV4dC5hbWRNb2R1bGVOYW1lKHNmKTtcbiAgICAgICAgaWYgKG1vZHVsZU5hbWUpIHNmLm1vZHVsZU5hbWUgPSBtb2R1bGVOYW1lO1xuICAgICAgfSBlbHNlIGlmICgvbm9kZV9tb2R1bGVzLy50ZXN0KGdlbkZpbGUuZ2VuRmlsZVVybCkpIHtcbiAgICAgICAgLy8gSWYgd2UgYXJlIGdlbmVyYXRpbmcgYW4gbmdNb2R1bGUgZmlsZSB1bmRlciBub2RlX21vZHVsZXMsIHdlIGtub3cgdGhlIHJpZ2h0IG1vZHVsZSBuYW1lXG4gICAgICAgIC8vIFdlIGRvbid0IG5lZWQgdGhlIGhvc3QgdG8gc3VwcGx5IGEgZnVuY3Rpb24gaW4gdGhpcyBjYXNlLlxuICAgICAgICBzZi5tb2R1bGVOYW1lID0gc3RyaXBOb2RlTW9kdWxlc1ByZWZpeChnZW5GaWxlLmdlbkZpbGVVcmwucmVwbGFjZShFWFQsICcnKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuZ2VuZXJhdGVkU291cmNlRmlsZXMuc2V0KGdlbkZpbGUuZ2VuRmlsZVVybCwge1xuICAgICAgc291cmNlRmlsZTogc2YsXG4gICAgICBlbWl0Q3R4OiBjb250ZXh0LFxuICAgICAgZXh0ZXJuYWxSZWZlcmVuY2VzLFxuICAgIH0pO1xuICAgIHJldHVybiBzZjtcbiAgfVxuXG4gIHNob3VsZEdlbmVyYXRlRmlsZShmaWxlTmFtZTogc3RyaW5nKToge2dlbmVyYXRlOiBib29sZWFuLCBiYXNlRmlsZU5hbWU/OiBzdHJpbmd9IHtcbiAgICAvLyBUT0RPKHRib3NjaCk6IGFsbG93IGdlbmVyYXRpbmcgZmlsZXMgdGhhdCBhcmUgbm90IGluIHRoZSByb290RGlyXG4gICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzE5MzM3XG4gICAgaWYgKCFpc0luUm9vdERpcihmaWxlTmFtZSwgdGhpcy5vcHRpb25zKSkge1xuICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgIH1cbiAgICBjb25zdCBnZW5NYXRjaCA9IEdFTkVSQVRFRF9GSUxFUy5leGVjKGZpbGVOYW1lKTtcbiAgICBpZiAoIWdlbk1hdGNoKSB7XG4gICAgICByZXR1cm4ge2dlbmVyYXRlOiBmYWxzZX07XG4gICAgfVxuICAgIGNvbnN0IFssIGJhc2UsIGdlblN1ZmZpeCwgc3VmZml4XSA9IGdlbk1hdGNoO1xuICAgIGlmIChzdWZmaXggIT09ICd0cycgJiYgc3VmZml4ICE9PSAndHN4Jykge1xuICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgIH1cbiAgICBsZXQgYmFzZUZpbGVOYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICAgIGlmIChnZW5TdWZmaXguaW5kZXhPZignbmdzdHlsZScpID49IDApIHtcbiAgICAgIC8vIE5vdGU6IG5nc3R5bGUgZmlsZXMgaGF2ZSBuYW1lcyBsaWtlIGBhZmlsZS5jc3MubmdzdHlsZS50c2BcbiAgICAgIGlmICghdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMoYmFzZSkpIHtcbiAgICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb3RlOiBvbi10aGUtZmx5IGdlbmVyYXRlZCBmaWxlcyBhbHdheXMgaGF2ZSBhIGAudHNgIHN1ZmZpeCxcbiAgICAgIC8vIGJ1dCB0aGUgZmlsZSBmcm9tIHdoaWNoIHdlIGdlbmVyYXRlZCBpdCBjYW4gYmUgYSBgLnRzYC8gYC50c3hgLyBgLmQudHNgXG4gICAgICAvLyAoc2VlIG9wdGlvbnMuZ2VuZXJhdGVDb2RlRm9yTGlicmFyaWVzKS5cbiAgICAgIGJhc2VGaWxlTmFtZSA9IFtgJHtiYXNlfS50c2AsIGAke2Jhc2V9LnRzeGAsIGAke2Jhc2V9LmQudHNgXS5maW5kKFxuICAgICAgICAgIGJhc2VGaWxlTmFtZSA9PiB0aGlzLmlzU291cmNlRmlsZShiYXNlRmlsZU5hbWUpICYmIHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGJhc2VGaWxlTmFtZSkpO1xuICAgICAgaWYgKCFiYXNlRmlsZU5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge2dlbmVyYXRlOiB0cnVlLCBiYXNlRmlsZU5hbWV9O1xuICB9XG5cbiAgc2hvdWxkR2VuZXJhdGVGaWxlc0ZvcihmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgLy8gVE9ETyh0Ym9zY2gpOiBhbGxvdyBnZW5lcmF0aW5nIGZpbGVzIHRoYXQgYXJlIG5vdCBpbiB0aGUgcm9vdERpclxuICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy8xOTMzN1xuICAgIHJldHVybiAhR0VORVJBVEVEX0ZJTEVTLnRlc3QoZmlsZU5hbWUpICYmIHRoaXMuaXNTb3VyY2VGaWxlKGZpbGVOYW1lKSAmJlxuICAgICAgICBpc0luUm9vdERpcihmaWxlTmFtZSwgdGhpcy5vcHRpb25zKTtcbiAgfVxuXG4gIGdldFNvdXJjZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCxcbiAgICAgIG9uRXJyb3I/OiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkKTogdHMuU291cmNlRmlsZSB7XG4gICAgLy8gTm90ZTogRG9uJ3QgZXhpdCBlYXJseSBpbiB0aGlzIG1ldGhvZCB0byBtYWtlIHN1cmVcbiAgICAvLyB3ZSBhbHdheXMgaGF2ZSB1cCB0byBkYXRlIHJlZmVyZW5jZXMgb24gdGhlIGZpbGUhXG4gICAgbGV0IGdlbkZpbGVOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgc2YgPSB0aGlzLmdldEdlbmVyYXRlZEZpbGUoZmlsZU5hbWUpO1xuICAgIGlmICghc2YpIHtcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLmxpYnJhcnlTdW1tYXJpZXMuZ2V0KGZpbGVOYW1lKTtcbiAgICAgIGlmIChzdW1tYXJ5KSB7XG4gICAgICAgIGlmICghc3VtbWFyeS5zb3VyY2VGaWxlKSB7XG4gICAgICAgICAgc3VtbWFyeS5zb3VyY2VGaWxlID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgICAgICAgZmlsZU5hbWUsIHN1bW1hcnkudGV4dCwgdGhpcy5vcHRpb25zLnRhcmdldCB8fCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0KTtcbiAgICAgICAgfVxuICAgICAgICBzZiA9IHN1bW1hcnkuc291cmNlRmlsZTtcbiAgICAgICAgLy8gVHlwZVNjcmlwdCBkb2Vzbid0IGFsbG93IHJldHVybmluZyByZWRpcmVjdCBzb3VyY2UgZmlsZXMuIFRvIGF2b2lkIHVuZm9yc2VlbiBlcnJvcnMgd2VcbiAgICAgICAgLy8gcmV0dXJuIHRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZSBpbnN0ZWFkIG9mIHRoZSByZWRpcmVjdCB0YXJnZXQuXG4gICAgICAgIGNvbnN0IHJlZGlyZWN0SW5mbyA9IChzZiBhcyBhbnkpLnJlZGlyZWN0SW5mbztcbiAgICAgICAgaWYgKHJlZGlyZWN0SW5mbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgc2YgPSByZWRpcmVjdEluZm8udW5yZWRpcmVjdGVkO1xuICAgICAgICB9XG4gICAgICAgIGdlbkZpbGVOYW1lcyA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXNmKSB7XG4gICAgICBzZiA9IHRoaXMuZ2V0T3JpZ2luYWxTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGNvbnN0IGNhY2hlZEdlbkZpbGVzID0gdGhpcy5nZW5lcmF0ZWRDb2RlRm9yLmdldChmaWxlTmFtZSk7XG4gICAgICBpZiAoY2FjaGVkR2VuRmlsZXMpIHtcbiAgICAgICAgZ2VuRmlsZU5hbWVzID0gY2FjaGVkR2VuRmlsZXM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5ub1Jlc29sdmUgJiYgdGhpcy5zaG91bGRHZW5lcmF0ZUZpbGVzRm9yKGZpbGVOYW1lKSkge1xuICAgICAgICAgIGdlbkZpbGVOYW1lcyA9IHRoaXMuY29kZUdlbmVyYXRvci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKGZpbGVOYW1lKS5maWx0ZXIoXG4gICAgICAgICAgICAgIGZpbGVOYW1lID0+IHRoaXMuc2hvdWxkR2VuZXJhdGVGaWxlKGZpbGVOYW1lKS5nZW5lcmF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5nZW5lcmF0ZWRDb2RlRm9yLnNldChmaWxlTmFtZSwgZ2VuRmlsZU5hbWVzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHNmKSB7XG4gICAgICBhZGRSZWZlcmVuY2VzVG9Tb3VyY2VGaWxlKHNmLCBnZW5GaWxlTmFtZXMpO1xuICAgIH1cbiAgICAvLyBUT0RPKHRib3NjaCk6IFR5cGVTY3JpcHQncyB0eXBpbmdzIGZvciBnZXRTb3VyY2VGaWxlIGFyZSBpbmNvcnJlY3QsXG4gICAgLy8gYXMgaXQgY2FuIHZlcnkgd2VsbCByZXR1cm4gdW5kZWZpbmVkLlxuICAgIHJldHVybiBzZiE7XG4gIH1cblxuICBwcml2YXRlIGdldEdlbmVyYXRlZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgY29uc3QgZ2VuU3JjRmlsZSA9IHRoaXMuZ2VuZXJhdGVkU291cmNlRmlsZXMuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoZ2VuU3JjRmlsZSkge1xuICAgICAgcmV0dXJuIGdlblNyY0ZpbGUuc291cmNlRmlsZTtcbiAgICB9XG4gICAgY29uc3Qge2dlbmVyYXRlLCBiYXNlRmlsZU5hbWV9ID0gdGhpcy5zaG91bGRHZW5lcmF0ZUZpbGUoZmlsZU5hbWUpO1xuICAgIGlmIChnZW5lcmF0ZSkge1xuICAgICAgY29uc3QgZ2VuRmlsZSA9IHRoaXMuY29kZUdlbmVyYXRvci5nZW5lcmF0ZUZpbGUoZmlsZU5hbWUsIGJhc2VGaWxlTmFtZSk7XG4gICAgICByZXR1cm4gdGhpcy5hZGRHZW5lcmF0ZWRGaWxlKGdlbkZpbGUsIGdlbkZpbGVFeHRlcm5hbFJlZmVyZW5jZXMoZ2VuRmlsZSkpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgb3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBsZXQgZmlsZUV4aXN0cyA9IHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzQ2FjaGUuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoZmlsZUV4aXN0cyA9PSBudWxsKSB7XG4gICAgICBmaWxlRXhpc3RzID0gdGhpcy5jb250ZXh0LmZpbGVFeGlzdHMoZmlsZU5hbWUpO1xuICAgICAgdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHNDYWNoZS5zZXQoZmlsZU5hbWUsIGZpbGVFeGlzdHMpO1xuICAgIH1cbiAgICByZXR1cm4gZmlsZUV4aXN0cztcbiAgfVxuXG4gIGZpbGVFeGlzdHMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGZpbGVOYW1lID0gc3RyaXBOZ1Jlc291cmNlU3VmZml4KGZpbGVOYW1lKTtcbiAgICBpZiAodGhpcy5saWJyYXJ5U3VtbWFyaWVzLmhhcyhmaWxlTmFtZSkgfHwgdGhpcy5nZW5lcmF0ZWRTb3VyY2VGaWxlcy5oYXMoZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc2hvdWxkR2VuZXJhdGVGaWxlKGZpbGVOYW1lKS5nZW5lcmF0ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhmaWxlTmFtZSk7XG4gIH1cblxuICBsb2FkU3VtbWFyeShmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLmxpYnJhcnlTdW1tYXJpZXMuZ2V0KGZpbGVQYXRoKTtcbiAgICBpZiAoc3VtbWFyeSkge1xuICAgICAgcmV0dXJuIHN1bW1hcnkudGV4dDtcbiAgICB9XG4gICAgaWYgKHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZVBhdGgpKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpc1NvdXJjZUZpbGUoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIERvbid0IGdlbmVyYXRlIGFueSBmaWxlcyBub3IgdHlwZWNoZWNrIHRoZW1cbiAgICAvLyBpZiBza2lwVGVtcGxhdGVDb2RlZ2VuIGlzIHNldCBhbmQgZnVsbFRlbXBsYXRlVHlwZUNoZWNrIGlzIG5vdCB5ZXQgc2V0LFxuICAgIC8vIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAgICBpZiAodGhpcy5vcHRpb25zLnNraXBUZW1wbGF0ZUNvZGVnZW4gJiYgIXRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSWYgd2UgaGF2ZSBhIHN1bW1hcnkgZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uLFxuICAgIC8vIHRyZWF0IHRoZSBmaWxlIG5ldmVyIGFzIGEgc291cmNlIGZpbGUuXG4gICAgaWYgKHRoaXMubGlicmFyeVN1bW1hcmllcy5oYXMoZmlsZVBhdGgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChHRU5FUkFURURfRklMRVMudGVzdChmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5nZW5lcmF0ZUNvZGVGb3JMaWJyYXJpZXMgPT09IGZhbHNlICYmIERUUy50ZXN0KGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoRFRTLnRlc3QoZmlsZVBhdGgpKSB7XG4gICAgICAvLyBDaGVjayBmb3IgYSBidW5kbGUgaW5kZXguXG4gICAgICBpZiAodGhpcy5oYXNCdW5kbGVJbmRleChmaWxlUGF0aCkpIHtcbiAgICAgICAgY29uc3Qgbm9ybWFsRmlsZVBhdGggPSBwYXRoLm5vcm1hbGl6ZShmaWxlUGF0aCk7XG4gICAgICAgIHJldHVybiB0aGlzLmZsYXRNb2R1bGVJbmRleE5hbWVzLmhhcyhub3JtYWxGaWxlUGF0aCkgfHxcbiAgICAgICAgICAgIHRoaXMuZmxhdE1vZHVsZUluZGV4UmVkaXJlY3ROYW1lcy5oYXMobm9ybWFsRmlsZVBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJlYWRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdW1tYXJ5ID0gdGhpcy5saWJyYXJ5U3VtbWFyaWVzLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKHN1bW1hcnkpIHtcbiAgICAgIHJldHVybiBzdW1tYXJ5LnRleHQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0TWV0YWRhdGFGb3IoZmlsZVBhdGg6IHN0cmluZyk6IE1vZHVsZU1ldGFkYXRhW118dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gcmVhZE1ldGFkYXRhKGZpbGVQYXRoLCB0aGlzLm1ldGFkYXRhUmVhZGVySG9zdCwgdGhpcy5tZXRhZGF0YVJlYWRlckNhY2hlKTtcbiAgfVxuXG4gIGxvYWRSZXNvdXJjZShmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+fHN0cmluZyB7XG4gICAgaWYgKHRoaXMuY29udGV4dC5yZWFkUmVzb3VyY2UpIHJldHVybiB0aGlzLmNvbnRleHQucmVhZFJlc291cmNlKGZpbGVQYXRoKTtcbiAgICBpZiAoIXRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGZpbGVQYXRoKSkge1xuICAgICAgdGhyb3cgc3ludGF4RXJyb3IoYEVycm9yOiBSZXNvdXJjZSBmaWxlIG5vdCBmb3VuZDogJHtmaWxlUGF0aH1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGFzc2VydCh0aGlzLmNvbnRleHQucmVhZEZpbGUoZmlsZVBhdGgpKTtcbiAgfVxuXG4gIGdldE91dHB1dE5hbWUoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHBhdGgucmVsYXRpdmUodGhpcy5nZXRDdXJyZW50RGlyZWN0b3J5KCksIGZpbGVQYXRoKTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzQnVuZGxlSW5kZXgoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGNoZWNrQnVuZGxlSW5kZXggPSAoZGlyZWN0b3J5OiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICAgIGxldCByZXN1bHQgPSB0aGlzLmZsYXRNb2R1bGVJbmRleENhY2hlLmdldChkaXJlY3RvcnkpO1xuICAgICAgaWYgKHJlc3VsdCA9PSBudWxsKSB7XG4gICAgICAgIGlmIChwYXRoLmJhc2VuYW1lKGRpcmVjdG9yeSkgPT0gJ25vZGVfbW9kdWxlJykge1xuICAgICAgICAgIC8vIERvbid0IGxvb2sgb3V0c2lkZSB0aGUgbm9kZV9tb2R1bGVzIHRoaXMgcGFja2FnZSBpcyBpbnN0YWxsZWQgaW4uXG4gICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gQSBidW5kbGUgaW5kZXggZXhpc3RzIGlmIHRoZSB0eXBpbmdzIC5kLnRzIGZpbGUgaGFzIGEgbWV0YWRhdGEuanNvbiB0aGF0IGhhcyBhblxuICAgICAgICAgIC8vIGltcG9ydEFzLlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwYWNrYWdlRmlsZSA9IHBhdGguam9pbihkaXJlY3RvcnksICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgICAgIGlmICh0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhwYWNrYWdlRmlsZSkpIHtcbiAgICAgICAgICAgICAgLy8gT25jZSB3ZSBzZWUgYSBwYWNrYWdlLmpzb24gZmlsZSwgYXNzdW1lIGZhbHNlIHVudGlsIGl0IHdlIGZpbmQgdGhlIGJ1bmRsZSBpbmRleC5cbiAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VDb250ZW50ID1cbiAgICAgICAgICAgICAgICAgIEpTT04ucGFyc2UoYXNzZXJ0KHRoaXMuY29udGV4dC5yZWFkRmlsZShwYWNrYWdlRmlsZSkpKSBhcyB7dHlwaW5nczogc3RyaW5nfTtcbiAgICAgICAgICAgICAgaWYgKHBhY2thZ2VDb250ZW50LnR5cGluZ3MpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0eXBpbmdzID0gcGF0aC5ub3JtYWxpemUocGF0aC5qb2luKGRpcmVjdG9yeSwgcGFja2FnZUNvbnRlbnQudHlwaW5ncykpO1xuICAgICAgICAgICAgICAgIGlmIChEVFMudGVzdCh0eXBpbmdzKSkge1xuICAgICAgICAgICAgICAgICAgY29uc3QgbWV0YWRhdGFGaWxlID0gdHlwaW5ncy5yZXBsYWNlKERUUywgJy5tZXRhZGF0YS5qc29uJyk7XG4gICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMobWV0YWRhdGFGaWxlKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXRhZGF0YSA9IEpTT04ucGFyc2UoYXNzZXJ0KHRoaXMuY29udGV4dC5yZWFkRmlsZShtZXRhZGF0YUZpbGUpKSkgYXNcbiAgICAgICAgICAgICAgICAgICAgICAgIHtmbGF0TW9kdWxlSW5kZXhSZWRpcmVjdDogc3RyaW5nLCBpbXBvcnRBczogc3RyaW5nfTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGFkYXRhLmZsYXRNb2R1bGVJbmRleFJlZGlyZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5mbGF0TW9kdWxlSW5kZXhSZWRpcmVjdE5hbWVzLmFkZCh0eXBpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBOb3RlOiBkb24ndCBzZXQgcmVzdWx0ID0gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAvLyBhcyB0aGlzIHdvdWxkIG1hcmsgdGhpcyBmb2xkZXJcbiAgICAgICAgICAgICAgICAgICAgICAvLyBhcyBoYXZpbmcgYSBidW5kbGVJbmRleCB0b28gZWFybHkgd2l0aG91dFxuICAgICAgICAgICAgICAgICAgICAgIC8vIGZpbGxpbmcgdGhlIGJ1bmRsZUluZGV4TmFtZXMuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWV0YWRhdGEuaW1wb3J0QXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZsYXRNb2R1bGVJbmRleE5hbWVzLmFkZCh0eXBpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zdCBwYXJlbnQgPSBwYXRoLmRpcm5hbWUoZGlyZWN0b3J5KTtcbiAgICAgICAgICAgICAgaWYgKHBhcmVudCAhPSBkaXJlY3RvcnkpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgdGhlIHBhcmVudCBkaXJlY3RvcnkuXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gY2hlY2tCdW5kbGVJbmRleChwYXJlbnQpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAvLyBJZiB3ZSBlbmNvdW50ZXIgYW55IGVycm9ycyBhc3N1bWUgd2UgdGhpcyBpc24ndCBhIGJ1bmRsZSBpbmRleC5cbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZsYXRNb2R1bGVJbmRleENhY2hlLnNldChkaXJlY3RvcnksIHJlc3VsdCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICByZXR1cm4gY2hlY2tCdW5kbGVJbmRleChwYXRoLmRpcm5hbWUoZmlsZVBhdGgpKTtcbiAgfVxuXG4gIGdldERlZmF1bHRMaWJGaWxlTmFtZSA9IChvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpID0+XG4gICAgICB0aGlzLmNvbnRleHQuZ2V0RGVmYXVsdExpYkZpbGVOYW1lKG9wdGlvbnMpXG4gIGdldEN1cnJlbnREaXJlY3RvcnkgPSAoKSA9PiB0aGlzLmNvbnRleHQuZ2V0Q3VycmVudERpcmVjdG9yeSgpO1xuICBnZXRDYW5vbmljYWxGaWxlTmFtZSA9IChmaWxlTmFtZTogc3RyaW5nKSA9PiB0aGlzLmNvbnRleHQuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpO1xuICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzID0gKCkgPT4gdGhpcy5jb250ZXh0LnVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTtcbiAgZ2V0TmV3TGluZSA9ICgpID0+IHRoaXMuY29udGV4dC5nZXROZXdMaW5lKCk7XG4gIC8vIE1ha2Ugc3VyZSB3ZSBkbyBub3QgYGhvc3QucmVhbHBhdGgoKWAgZnJvbSBUUyBhcyB3ZSBkbyBub3Qgd2FudCB0byByZXNvbHZlIHN5bWxpbmtzLlxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzk1NTJcbiAgcmVhbHBhdGggPSAocDogc3RyaW5nKSA9PiBwO1xuICB3cml0ZUZpbGUgPSB0aGlzLmNvbnRleHQud3JpdGVGaWxlLmJpbmQodGhpcy5jb250ZXh0KTtcbn1cblxuZnVuY3Rpb24gZ2VuRmlsZUV4dGVybmFsUmVmZXJlbmNlcyhnZW5GaWxlOiBHZW5lcmF0ZWRGaWxlKTogU2V0PHN0cmluZz4ge1xuICByZXR1cm4gbmV3IFNldChjb2xsZWN0RXh0ZXJuYWxSZWZlcmVuY2VzKGdlbkZpbGUuc3RtdHMhKS5tYXAoZXIgPT4gZXIubW9kdWxlTmFtZSEpKTtcbn1cblxuZnVuY3Rpb24gYWRkUmVmZXJlbmNlc1RvU291cmNlRmlsZShzZjogdHMuU291cmNlRmlsZSwgZ2VuRmlsZU5hbWVzOiBzdHJpbmdbXSkge1xuICAvLyBOb3RlOiBhcyB3ZSBtb2RpZnkgdHMuU291cmNlRmlsZXMgd2UgbmVlZCB0byBrZWVwIHRoZSBvcmlnaW5hbFxuICAvLyB2YWx1ZSBmb3IgYHJlZmVyZW5jZWRGaWxlc2AgYXJvdW5kIGluIGNhY2hlIHRoZSBvcmlnaW5hbCBob3N0IGlzIGNhY2hpbmcgdHMuU291cmNlRmlsZXMuXG4gIC8vIE5vdGU6IGNsb25pbmcgdGhlIHRzLlNvdXJjZUZpbGUgaXMgZXhwZW5zaXZlIGFzIHRoZSBub2RlcyBpbiBoYXZlIHBhcmVudCBwb2ludGVycyxcbiAgLy8gaS5lLiB3ZSB3b3VsZCBhbHNvIG5lZWQgdG8gY2xvbmUgYW5kIGFkanVzdCBhbGwgbm9kZXMuXG4gIGxldCBvcmlnaW5hbFJlZmVyZW5jZWRGaWxlczogUmVhZG9ubHlBcnJheTx0cy5GaWxlUmVmZXJlbmNlPiA9XG4gICAgICAoc2YgYXMgYW55KS5vcmlnaW5hbFJlZmVyZW5jZWRGaWxlcztcbiAgaWYgKCFvcmlnaW5hbFJlZmVyZW5jZWRGaWxlcykge1xuICAgIG9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzID0gc2YucmVmZXJlbmNlZEZpbGVzO1xuICAgIChzZiBhcyBhbnkpLm9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzID0gb3JpZ2luYWxSZWZlcmVuY2VkRmlsZXM7XG4gIH1cbiAgY29uc3QgbmV3UmVmZXJlbmNlZEZpbGVzID0gWy4uLm9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzXTtcbiAgZ2VuRmlsZU5hbWVzLmZvckVhY2goZ2YgPT4gbmV3UmVmZXJlbmNlZEZpbGVzLnB1c2goe2ZpbGVOYW1lOiBnZiwgcG9zOiAwLCBlbmQ6IDB9KSk7XG4gIHNmLnJlZmVyZW5jZWRGaWxlcyA9IG5ld1JlZmVyZW5jZWRGaWxlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE9yaWdpbmFsUmVmZXJlbmNlcyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuRmlsZVJlZmVyZW5jZVtdfHVuZGVmaW5lZCB7XG4gIHJldHVybiBzb3VyY2VGaWxlICYmIChzb3VyY2VGaWxlIGFzIGFueSkub3JpZ2luYWxSZWZlcmVuY2VkRmlsZXM7XG59XG5cbmZ1bmN0aW9uIGRvdFJlbGF0aXZlKGZyb206IHN0cmluZywgdG86IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHJQYXRoOiBzdHJpbmcgPSBwYXRoLnJlbGF0aXZlKGZyb20sIHRvKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIHJldHVybiByUGF0aC5zdGFydHNXaXRoKCcuJykgPyByUGF0aCA6ICcuLycgKyByUGF0aDtcbn1cblxuLyoqXG4gKiBNb3ZlcyB0aGUgcGF0aCBpbnRvIGBnZW5EaXJgIGZvbGRlciB3aGlsZSBwcmVzZXJ2aW5nIHRoZSBgbm9kZV9tb2R1bGVzYCBkaXJlY3RvcnkuXG4gKi9cbmZ1bmN0aW9uIGdldFBhY2thZ2VOYW1lKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gIGNvbnN0IG1hdGNoID0gTk9ERV9NT0RVTEVTX1BBQ0tBR0VfTkFNRS5leGVjKGZpbGVQYXRoKTtcbiAgcmV0dXJuIG1hdGNoID8gbWF0Y2hbMV0gOiBudWxsO1xufVxuXG5mdW5jdGlvbiBzdHJpcE5vZGVNb2R1bGVzUHJlZml4KGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZmlsZVBhdGgucmVwbGFjZSgvLipub2RlX21vZHVsZXNcXC8vLCAnJyk7XG59XG5cbmZ1bmN0aW9uIGdldE5vZGVNb2R1bGVzUHJlZml4KGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gIGNvbnN0IG1hdGNoID0gLy4qbm9kZV9tb2R1bGVzXFwvLy5leGVjKGZpbGVQYXRoKTtcbiAgcmV0dXJuIG1hdGNoID8gbWF0Y2hbMV0gOiBudWxsO1xufVxuXG5mdW5jdGlvbiBzdHJpcE5nUmVzb3VyY2VTdWZmaXgoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBmaWxlTmFtZS5yZXBsYWNlKC9cXC5cXCRuZ3Jlc291cmNlXFwkLiovLCAnJyk7XG59XG5cbmZ1bmN0aW9uIGFkZE5nUmVzb3VyY2VTdWZmaXgoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHtmaWxlTmFtZX0uJG5ncmVzb3VyY2UkYDtcbn1cbiJdfQ==