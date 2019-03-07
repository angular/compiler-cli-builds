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
        define("@angular/compiler-cli/src/transformers/compiler_host", ["require", "exports", "@angular/compiler", "path", "typescript", "@angular/compiler-cli/src/transformers/metadata_reader", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const compiler_1 = require("@angular/compiler");
    const path = require("path");
    const ts = require("typescript");
    const metadata_reader_1 = require("@angular/compiler-cli/src/transformers/metadata_reader");
    const util_1 = require("@angular/compiler-cli/src/transformers/util");
    const NODE_MODULES_PACKAGE_NAME = /node_modules\/((\w|-|\.)+|(@(\w|-|\.)+\/(\w|-|\.)+))/;
    const EXT = /(\.ts|\.d\.ts|\.js|\.jsx|\.tsx)$/;
    const CSS_PREPROCESSOR_EXT = /(\.scss|\.less|\.styl)$/;
    let augmentHostForTest = null;
    function setAugmentHostForTest(augmentation) {
        augmentHostForTest = augmentation;
    }
    exports.setAugmentHostForTest = setAugmentHostForTest;
    function createCompilerHost({ options, tsHost = ts.createCompilerHost(options, true) }) {
        if (augmentHostForTest !== null) {
            for (const name of Object.keys(augmentHostForTest)) {
                tsHost[name] = augmentHostForTest[name];
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
    class TsCompilerAotCompilerTypeCheckHostAdapter {
        constructor(rootFiles, options, context, metadataProvider, codeGenerator, librarySummaries = new Map()) {
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
            this.getDefaultLibFileName = (options) => this.context.getDefaultLibFileName(options);
            this.getCurrentDirectory = () => this.context.getCurrentDirectory();
            this.getCanonicalFileName = (fileName) => this.context.getCanonicalFileName(fileName);
            this.useCaseSensitiveFileNames = () => this.context.useCaseSensitiveFileNames();
            this.getNewLine = () => this.context.getNewLine();
            // Make sure we do not `host.realpath()` from TS as we do not want to resolve symlinks.
            // https://github.com/Microsoft/TypeScript/issues/9552
            this.realpath = (p) => p;
            this.writeFile = this.context.writeFile.bind(this.context);
            this.moduleResolutionCache = ts.createModuleResolutionCache(this.context.getCurrentDirectory(), this.context.getCanonicalFileName.bind(this.context));
            const basePath = this.options.basePath;
            this.rootDirs =
                (this.options.rootDirs || [this.options.basePath]).map(p => path.resolve(basePath, p));
            if (context.getDirectories) {
                this.getDirectories = path => context.getDirectories(path);
            }
            if (context.directoryExists) {
                this.directoryExists = directoryName => context.directoryExists(directoryName);
            }
            if (context.getCancellationToken) {
                this.getCancellationToken = () => context.getCancellationToken();
            }
            if (context.getDefaultLibLocation) {
                this.getDefaultLibLocation = () => context.getDefaultLibLocation();
            }
            if (context.resolveTypeReferenceDirectives) {
                this.resolveTypeReferenceDirectives = (names, containingFile) => context.resolveTypeReferenceDirectives(names, containingFile);
            }
            if (context.trace) {
                this.trace = s => context.trace(s);
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
                cacheMetadata: () => true,
                getSourceFileMetadata: (filePath) => {
                    const sf = this.getOriginalSourceFile(filePath);
                    return sf ? this.metadataProvider.getMetadata(sf) : undefined;
                },
                fileExists: (filePath) => this.originalFileExists(filePath),
                readFile: (filePath) => assert(this.context.readFile(filePath)),
            };
        }
        resolveModuleName(moduleName, containingFile) {
            const rm = ts.resolveModuleName(moduleName, containingFile.replace(/\\/g, '/'), this.options, this, this.moduleResolutionCache)
                .resolvedModule;
            if (rm && this.isSourceFile(rm.resolvedFileName) && util_1.DTS.test(rm.resolvedFileName)) {
                // Case: generateCodeForLibraries = true and moduleName is
                // a .d.ts file in a node_modules folder.
                // Need to set isExternalLibraryImport to false so that generated files for that file
                // are emitted.
                rm.isExternalLibraryImport = false;
            }
            return rm;
        }
        // Note: We implement this method so that TypeScript and Angular share the same
        // ts.ModuleResolutionCache
        // and that we can tell ts.Program about our different opinion about
        // ResolvedModule.isExternalLibraryImport
        // (see our isSourceFile method).
        resolveModuleNames(moduleNames, containingFile) {
            // TODO(tbosch): this seems to be a typing error in TypeScript,
            // as it contains assertions that the result contains the same number of entries
            // as the given module names.
            return moduleNames.map(moduleName => this.resolveModuleName(moduleName, containingFile));
        }
        moduleNameToFileName(m, containingFile) {
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
            const resolved = this.resolveModuleName(m, containingFile);
            return resolved ? resolved.resolvedFileName : null;
        }
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
        fileNameToModuleName(importedFile, containingFile) {
            const cacheKey = `${importedFile}:${containingFile}`;
            let moduleName = this.fileNameToModuleNameCache.get(cacheKey);
            if (moduleName != null) {
                return moduleName;
            }
            const originalImportedFile = importedFile;
            if (this.options.traceResolution) {
                console.error('fileNameToModuleName from containingFile', containingFile, 'to importedFile', importedFile);
            }
            // drop extension
            importedFile = importedFile.replace(EXT, '');
            const importedFilePackageName = getPackageName(importedFile);
            const containingFilePackageName = getPackageName(containingFile);
            if (importedFilePackageName === containingFilePackageName ||
                util_1.GENERATED_FILES.test(originalImportedFile)) {
                const rootedContainingFile = util_1.relativeToRootDirs(containingFile, this.rootDirs);
                const rootedImportedFile = util_1.relativeToRootDirs(importedFile, this.rootDirs);
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
                        const modulePath = importedFile.substring(0, importedFile.length - moduleName.length) +
                            importedFilePackageName;
                        const packageJson = require(modulePath + '/package.json');
                        const packageTypings = path.posix.join(modulePath, packageJson.typings);
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
                throw new Error(`Trying to import a source file from a node_modules package: import ${originalImportedFile} from ${containingFile}`);
            }
            this.fileNameToModuleNameCache.set(cacheKey, moduleName);
            return moduleName;
        }
        resourceNameToFileName(resourceName, containingFile) {
            // Note: we convert package paths into relative paths to be compatible with the the
            // previous implementation of UrlResolver.
            const firstChar = resourceName[0];
            if (firstChar === '/') {
                resourceName = resourceName.slice(1);
            }
            else if (firstChar !== '.') {
                resourceName = `./${resourceName}`;
            }
            let filePathWithNgResource = this.moduleNameToFileName(addNgResourceSuffix(resourceName), containingFile);
            // If the user specified styleUrl pointing to *.scss, but the Sass compiler was run before
            // Angular, then the resource may have been generated as *.css. Simply try the resolution again.
            if (!filePathWithNgResource && CSS_PREPROCESSOR_EXT.test(resourceName)) {
                const fallbackResourceName = resourceName.replace(CSS_PREPROCESSOR_EXT, '.css');
                filePathWithNgResource =
                    this.moduleNameToFileName(addNgResourceSuffix(fallbackResourceName), containingFile);
            }
            const result = filePathWithNgResource ? stripNgResourceSuffix(filePathWithNgResource) : null;
            // Used under Bazel to report more specific error with remediation advice
            if (!result && this.context.reportMissingResource) {
                this.context.reportMissingResource(resourceName);
            }
            return result;
        }
        toSummaryFileName(fileName, referringSrcFileName) {
            return this.fileNameToModuleName(fileName, referringSrcFileName);
        }
        fromSummaryFileName(fileName, referringLibFileName) {
            const resolved = this.moduleNameToFileName(fileName, referringLibFileName);
            if (!resolved) {
                throw new Error(`Could not resolve ${fileName} from ${referringLibFileName}`);
            }
            return resolved;
        }
        parseSourceSpanOf(fileName, line, character) {
            const data = this.generatedSourceFiles.get(fileName);
            if (data && data.emitCtx) {
                return data.emitCtx.spanOf(line, character);
            }
            return null;
        }
        getOriginalSourceFile(filePath, languageVersion, onError) {
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
            const sf = this.context.getSourceFile(filePath, languageVersion, onError) || null;
            this.originalSourceFiles.set(filePath, sf);
            return sf;
        }
        updateGeneratedFile(genFile) {
            if (!genFile.stmts) {
                throw new Error(`Invalid Argument: Expected a GenerateFile with statements. ${genFile.genFileUrl}`);
            }
            const oldGenFile = this.generatedSourceFiles.get(genFile.genFileUrl);
            if (!oldGenFile) {
                throw new Error(`Illegal State: previous GeneratedFile not found for ${genFile.genFileUrl}.`);
            }
            const newRefs = genFileExternalReferences(genFile);
            const oldRefs = oldGenFile.externalReferences;
            let refsAreEqual = oldRefs.size === newRefs.size;
            if (refsAreEqual) {
                newRefs.forEach(r => refsAreEqual = refsAreEqual && oldRefs.has(r));
            }
            if (!refsAreEqual) {
                throw new Error(`Illegal State: external references changed in ${genFile.genFileUrl}.\nOld: ${Array.from(oldRefs)}.\nNew: ${Array.from(newRefs)}`);
            }
            return this.addGeneratedFile(genFile, newRefs);
        }
        addGeneratedFile(genFile, externalReferences) {
            if (!genFile.stmts) {
                throw new Error(`Invalid Argument: Expected a GenerateFile with statements. ${genFile.genFileUrl}`);
            }
            const { sourceText, context } = this.emitter.emitStatementsAndContext(genFile.genFileUrl, genFile.stmts, /* preamble */ '', 
            /* emitSourceMaps */ false);
            const sf = ts.createSourceFile(genFile.genFileUrl, sourceText, this.options.target || ts.ScriptTarget.Latest);
            if ((this.options.module === ts.ModuleKind.AMD || this.options.module === ts.ModuleKind.UMD) &&
                this.context.amdModuleName) {
                const moduleName = this.context.amdModuleName(sf);
                if (moduleName)
                    sf.moduleName = moduleName;
            }
            this.generatedSourceFiles.set(genFile.genFileUrl, {
                sourceFile: sf,
                emitCtx: context, externalReferences,
            });
            return sf;
        }
        shouldGenerateFile(fileName) {
            // TODO(tbosch): allow generating files that are not in the rootDir
            // See https://github.com/angular/angular/issues/19337
            if (!util_1.isInRootDir(fileName, this.options)) {
                return { generate: false };
            }
            const genMatch = util_1.GENERATED_FILES.exec(fileName);
            if (!genMatch) {
                return { generate: false };
            }
            const [, base, genSuffix, suffix] = genMatch;
            if (suffix !== 'ts' && suffix !== 'tsx') {
                return { generate: false };
            }
            let baseFileName;
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
                baseFileName = [`${base}.ts`, `${base}.tsx`, `${base}.d.ts`].find(baseFileName => this.isSourceFile(baseFileName) && this.originalFileExists(baseFileName));
                if (!baseFileName) {
                    return { generate: false };
                }
            }
            return { generate: true, baseFileName };
        }
        shouldGenerateFilesFor(fileName) {
            // TODO(tbosch): allow generating files that are not in the rootDir
            // See https://github.com/angular/angular/issues/19337
            return !util_1.GENERATED_FILES.test(fileName) && this.isSourceFile(fileName) &&
                util_1.isInRootDir(fileName, this.options);
        }
        getSourceFile(fileName, languageVersion, onError) {
            // Note: Don't exit early in this method to make sure
            // we always have up to date references on the file!
            let genFileNames = [];
            let sf = this.getGeneratedFile(fileName);
            if (!sf) {
                const summary = this.librarySummaries.get(fileName);
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
                const cachedGenFiles = this.generatedCodeFor.get(fileName);
                if (cachedGenFiles) {
                    genFileNames = cachedGenFiles;
                }
                else {
                    if (!this.options.noResolve && this.shouldGenerateFilesFor(fileName)) {
                        genFileNames = this.codeGenerator.findGeneratedFileNames(fileName).filter(fileName => this.shouldGenerateFile(fileName).generate);
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
        }
        getGeneratedFile(fileName) {
            const genSrcFile = this.generatedSourceFiles.get(fileName);
            if (genSrcFile) {
                return genSrcFile.sourceFile;
            }
            const { generate, baseFileName } = this.shouldGenerateFile(fileName);
            if (generate) {
                const genFile = this.codeGenerator.generateFile(fileName, baseFileName);
                return this.addGeneratedFile(genFile, genFileExternalReferences(genFile));
            }
            return null;
        }
        originalFileExists(fileName) {
            let fileExists = this.originalFileExistsCache.get(fileName);
            if (fileExists == null) {
                fileExists = this.context.fileExists(fileName);
                this.originalFileExistsCache.set(fileName, fileExists);
            }
            return fileExists;
        }
        fileExists(fileName) {
            fileName = stripNgResourceSuffix(fileName);
            if (this.librarySummaries.has(fileName) || this.generatedSourceFiles.has(fileName)) {
                return true;
            }
            if (this.shouldGenerateFile(fileName).generate) {
                return true;
            }
            return this.originalFileExists(fileName);
        }
        loadSummary(filePath) {
            const summary = this.librarySummaries.get(filePath);
            if (summary) {
                return summary.text;
            }
            if (this.originalFileExists(filePath)) {
                return assert(this.context.readFile(filePath));
            }
            return null;
        }
        isSourceFile(filePath) {
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
                    const normalFilePath = path.normalize(filePath);
                    return this.flatModuleIndexNames.has(normalFilePath) ||
                        this.flatModuleIndexRedirectNames.has(normalFilePath);
                }
            }
            return true;
        }
        readFile(fileName) {
            const summary = this.librarySummaries.get(fileName);
            if (summary) {
                return summary.text;
            }
            return this.context.readFile(fileName);
        }
        getMetadataFor(filePath) {
            return metadata_reader_1.readMetadata(filePath, this.metadataReaderHost, this.metadataReaderCache);
        }
        loadResource(filePath) {
            if (this.context.readResource)
                return this.context.readResource(filePath);
            if (!this.originalFileExists(filePath)) {
                throw compiler_1.syntaxError(`Error: Resource file not found: ${filePath}`);
            }
            return assert(this.context.readFile(filePath));
        }
        getOutputName(filePath) {
            return path.relative(this.getCurrentDirectory(), filePath);
        }
        hasBundleIndex(filePath) {
            const checkBundleIndex = (directory) => {
                let result = this.flatModuleIndexCache.get(directory);
                if (result == null) {
                    if (path.basename(directory) == 'node_module') {
                        // Don't look outside the node_modules this package is installed in.
                        result = false;
                    }
                    else {
                        // A bundle index exists if the typings .d.ts file has a metadata.json that has an
                        // importAs.
                        try {
                            const packageFile = path.join(directory, 'package.json');
                            if (this.originalFileExists(packageFile)) {
                                // Once we see a package.json file, assume false until it we find the bundle index.
                                result = false;
                                const packageContent = JSON.parse(assert(this.context.readFile(packageFile)));
                                if (packageContent.typings) {
                                    const typings = path.normalize(path.join(directory, packageContent.typings));
                                    if (util_1.DTS.test(typings)) {
                                        const metadataFile = typings.replace(util_1.DTS, '.metadata.json');
                                        if (this.originalFileExists(metadataFile)) {
                                            const metadata = JSON.parse(assert(this.context.readFile(metadataFile)));
                                            if (metadata.flatModuleIndexRedirect) {
                                                this.flatModuleIndexRedirectNames.add(typings);
                                                // Note: don't set result = true,
                                                // as this would mark this folder
                                                // as having a bundleIndex too early without
                                                // filling the bundleIndexNames.
                                            }
                                            else if (metadata.importAs) {
                                                this.flatModuleIndexNames.add(typings);
                                                result = true;
                                            }
                                        }
                                    }
                                }
                            }
                            else {
                                const parent = path.dirname(directory);
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
                    this.flatModuleIndexCache.set(directory, result);
                }
                return result;
            };
            return checkBundleIndex(path.dirname(filePath));
        }
    }
    exports.TsCompilerAotCompilerTypeCheckHostAdapter = TsCompilerAotCompilerTypeCheckHostAdapter;
    function genFileExternalReferences(genFile) {
        return new Set(compiler_1.collectExternalReferences(genFile.stmts).map(er => er.moduleName));
    }
    function addReferencesToSourceFile(sf, genFileNames) {
        // Note: as we modify ts.SourceFiles we need to keep the original
        // value for `referencedFiles` around in cache the original host is caching ts.SourceFiles.
        // Note: cloning the ts.SourceFile is expensive as the nodes in have parent pointers,
        // i.e. we would also need to clone and adjust all nodes.
        let originalReferencedFiles = sf.originalReferencedFiles;
        if (!originalReferencedFiles) {
            originalReferencedFiles = sf.referencedFiles;
            sf.originalReferencedFiles = originalReferencedFiles;
        }
        const newReferencedFiles = [...originalReferencedFiles];
        genFileNames.forEach(gf => newReferencedFiles.push({ fileName: gf, pos: 0, end: 0 }));
        sf.referencedFiles = newReferencedFiles;
    }
    function getOriginalReferences(sourceFile) {
        return sourceFile && sourceFile.originalReferencedFiles;
    }
    exports.getOriginalReferences = getOriginalReferences;
    function dotRelative(from, to) {
        const rPath = path.relative(from, to).replace(/\\/g, '/');
        return rPath.startsWith('.') ? rPath : './' + rPath;
    }
    /**
     * Moves the path into `genDir` folder while preserving the `node_modules` directory.
     */
    function getPackageName(filePath) {
        const match = NODE_MODULES_PACKAGE_NAME.exec(filePath);
        return match ? match[1] : null;
    }
    function stripNodeModulesPrefix(filePath) {
        return filePath.replace(/.*node_modules\//, '');
    }
    function getNodeModulesPrefix(filePath) {
        const match = /.*node_modules\//.exec(filePath);
        return match ? match[1] : null;
    }
    function stripNgResourceSuffix(fileName) {
        return fileName.replace(/\.\$ngresource\$.*/, '');
    }
    function addNgResourceSuffix(fileName) {
        return `${fileName}.$ngresource$`;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCxnREFBdUw7SUFDdkwsNkJBQTZCO0lBQzdCLGlDQUFpQztJQU1qQyw0RkFBOEY7SUFDOUYsc0VBQTZFO0lBRTdFLE1BQU0seUJBQXlCLEdBQUcsc0RBQXNELENBQUM7SUFDekYsTUFBTSxHQUFHLEdBQUcsa0NBQWtDLENBQUM7SUFDL0MsTUFBTSxvQkFBb0IsR0FBRyx5QkFBeUIsQ0FBQztJQUV2RCxJQUFJLGtCQUFrQixHQUFvQyxJQUFJLENBQUM7SUFFL0QsU0FBZ0IscUJBQXFCLENBQUMsWUFBK0M7UUFDbkYsa0JBQWtCLEdBQUcsWUFBWSxDQUFDO0lBQ3BDLENBQUM7SUFGRCxzREFFQztJQUVELFNBQWdCLGtCQUFrQixDQUM5QixFQUFDLE9BQU8sRUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsRUFDQztRQUMxRCxJQUFJLGtCQUFrQixLQUFLLElBQUksRUFBRTtZQUMvQixLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsRUFBRTtnQkFDakQsTUFBYyxDQUFDLElBQUksQ0FBQyxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2xEO1NBQ0Y7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBVEQsZ0RBU0M7SUFpQkQsU0FBUyxNQUFNLENBQUksU0FBK0I7UUFDaEQsSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNkLHFDQUFxQztTQUN0QztRQUNELE9BQU8sU0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNI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QUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2RCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDakMsQ0FBQztJQUVELFNBQVMsc0JBQXNCLENBQUMsUUFBZ0I7UUFDOUMsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxTQUFTLG9CQUFvQixDQUFDLFFBQWdCO1FBQzVDLE1BQU0sS0FBSyxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoRCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDakMsQ0FBQztJQUVELFNBQVMscUJBQXFCLENBQUMsUUFBZ0I7UUFDN0MsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLFFBQWdCO1FBQzNDLE9BQU8sR0FBRyxRQUFRLGVBQWUsQ0FBQztJQUNwQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FvdENvbXBpbGVySG9zdCwgRW1pdHRlclZpc2l0b3JDb250ZXh0LCBFeHRlcm5hbFJlZmVyZW5jZSwgR2VuZXJhdGVkRmlsZSwgUGFyc2VTb3VyY2VTcGFuLCBUeXBlU2NyaXB0RW1pdHRlciwgY29sbGVjdEV4dGVybmFsUmVmZXJlbmNlcywgc3ludGF4RXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtUeXBlQ2hlY2tIb3N0fSBmcm9tICcuLi9kaWFnbm9zdGljcy90cmFuc2xhdGVfZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtNRVRBREFUQV9WRVJTSU9OLCBNb2R1bGVNZXRhZGF0YX0gZnJvbSAnLi4vbWV0YWRhdGEvaW5kZXgnO1xuXG5pbXBvcnQge0NvbXBpbGVySG9zdCwgQ29tcGlsZXJPcHRpb25zLCBMaWJyYXJ5U3VtbWFyeX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtNZXRhZGF0YVJlYWRlckhvc3QsIGNyZWF0ZU1ldGFkYXRhUmVhZGVyQ2FjaGUsIHJlYWRNZXRhZGF0YX0gZnJvbSAnLi9tZXRhZGF0YV9yZWFkZXInO1xuaW1wb3J0IHtEVFMsIEdFTkVSQVRFRF9GSUxFUywgaXNJblJvb3REaXIsIHJlbGF0aXZlVG9Sb290RGlyc30gZnJvbSAnLi91dGlsJztcblxuY29uc3QgTk9ERV9NT0RVTEVTX1BBQ0tBR0VfTkFNRSA9IC9ub2RlX21vZHVsZXNcXC8oKFxcd3wtfFxcLikrfChAKFxcd3wtfFxcLikrXFwvKFxcd3wtfFxcLikrKSkvO1xuY29uc3QgRVhUID0gLyhcXC50c3xcXC5kXFwudHN8XFwuanN8XFwuanN4fFxcLnRzeCkkLztcbmNvbnN0IENTU19QUkVQUk9DRVNTT1JfRVhUID0gLyhcXC5zY3NzfFxcLmxlc3N8XFwuc3R5bCkkLztcblxubGV0IGF1Z21lbnRIb3N0Rm9yVGVzdDoge1tuYW1lOiBzdHJpbmddOiBGdW5jdGlvbn18bnVsbCA9IG51bGw7XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRBdWdtZW50SG9zdEZvclRlc3QoYXVnbWVudGF0aW9uOiB7W25hbWU6IHN0cmluZ106IEZ1bmN0aW9ufSB8IG51bGwpOiB2b2lkIHtcbiAgYXVnbWVudEhvc3RGb3JUZXN0ID0gYXVnbWVudGF0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29tcGlsZXJIb3N0KFxuICAgIHtvcHRpb25zLCB0c0hvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3Qob3B0aW9ucywgdHJ1ZSl9OlxuICAgICAgICB7b3B0aW9uczogQ29tcGlsZXJPcHRpb25zLCB0c0hvc3Q/OiB0cy5Db21waWxlckhvc3R9KTogQ29tcGlsZXJIb3N0IHtcbiAgaWYgKGF1Z21lbnRIb3N0Rm9yVGVzdCAhPT0gbnVsbCkge1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhhdWdtZW50SG9zdEZvclRlc3QpKSB7XG4gICAgICAodHNIb3N0IGFzIGFueSlbbmFtZV0gPSBhdWdtZW50SG9zdEZvclRlc3RbbmFtZV07XG4gICAgfVxuICB9XG4gIHJldHVybiB0c0hvc3Q7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWV0YWRhdGFQcm92aWRlciB7XG4gIGdldE1ldGFkYXRhKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBNb2R1bGVNZXRhZGF0YXx1bmRlZmluZWQ7XG59XG5cbmludGVyZmFjZSBHZW5Tb3VyY2VGaWxlIHtcbiAgZXh0ZXJuYWxSZWZlcmVuY2VzOiBTZXQ8c3RyaW5nPjtcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZTtcbiAgZW1pdEN0eDogRW1pdHRlclZpc2l0b3JDb250ZXh0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvZGVHZW5lcmF0b3Ige1xuICBnZW5lcmF0ZUZpbGUoZ2VuRmlsZU5hbWU6IHN0cmluZywgYmFzZUZpbGVOYW1lPzogc3RyaW5nKTogR2VuZXJhdGVkRmlsZTtcbiAgZmluZEdlbmVyYXRlZEZpbGVOYW1lcyhmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nW107XG59XG5cbmZ1bmN0aW9uIGFzc2VydDxUPihjb25kaXRpb246IFQgfCBudWxsIHwgdW5kZWZpbmVkKSB7XG4gIGlmICghY29uZGl0aW9uKSB7XG4gICAgLy8gVE9ETyhjaHVja2pheik6IGRvIHRoZSByaWdodCB0aGluZ1xuICB9XG4gIHJldHVybiBjb25kaXRpb24gITtcbn1cblxuLyoqXG4gKiBJbXBsZW1lbnRzIHRoZSBmb2xsb3dpbmcgaG9zdHMgYmFzZWQgb24gYW4gYXBpLkNvbXBpbGVySG9zdDpcbiAqIC0gdHMuQ29tcGlsZXJIb3N0IHRvIGJlIGNvbnN1bWVkIGJ5IGEgdHMuUHJvZ3JhbVxuICogLSBBb3RDb21waWxlckhvc3QgZm9yIEBhbmd1bGFyL2NvbXBpbGVyXG4gKiAtIFR5cGVDaGVja0hvc3QgZm9yIG1hcHBpbmcgdHMgZXJyb3JzIHRvIG5nIGVycm9ycyAodmlhIHRyYW5zbGF0ZURpYWdub3N0aWNzKVxuICovXG5leHBvcnQgY2xhc3MgVHNDb21waWxlckFvdENvbXBpbGVyVHlwZUNoZWNrSG9zdEFkYXB0ZXIgaW1wbGVtZW50cyB0cy5Db21waWxlckhvc3QsIEFvdENvbXBpbGVySG9zdCxcbiAgICBUeXBlQ2hlY2tIb3N0IHtcbiAgcHJpdmF0ZSBtZXRhZGF0YVJlYWRlckNhY2hlID0gY3JlYXRlTWV0YWRhdGFSZWFkZXJDYWNoZSgpO1xuICBwcml2YXRlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIGZsYXRNb2R1bGVJbmRleENhY2hlID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KCk7XG4gIHByaXZhdGUgZmxhdE1vZHVsZUluZGV4TmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgcHJpdmF0ZSBmbGF0TW9kdWxlSW5kZXhSZWRpcmVjdE5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHByaXZhdGUgcm9vdERpcnM6IHN0cmluZ1tdO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdXRpb25DYWNoZTogdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlO1xuICBwcml2YXRlIG9yaWdpbmFsU291cmNlRmlsZXMgPSBuZXcgTWFwPHN0cmluZywgdHMuU291cmNlRmlsZXxudWxsPigpO1xuICBwcml2YXRlIG9yaWdpbmFsRmlsZUV4aXN0c0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KCk7XG4gIHByaXZhdGUgZ2VuZXJhdGVkU291cmNlRmlsZXMgPSBuZXcgTWFwPHN0cmluZywgR2VuU291cmNlRmlsZT4oKTtcbiAgcHJpdmF0ZSBnZW5lcmF0ZWRDb2RlRm9yID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xuICBwcml2YXRlIGVtaXR0ZXIgPSBuZXcgVHlwZVNjcmlwdEVtaXR0ZXIoKTtcbiAgcHJpdmF0ZSBtZXRhZGF0YVJlYWRlckhvc3Q6IE1ldGFkYXRhUmVhZGVySG9zdDtcblxuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgZ2V0Q2FuY2VsbGF0aW9uVG9rZW4gITogKCkgPT4gdHMuQ2FuY2VsbGF0aW9uVG9rZW47XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBnZXREZWZhdWx0TGliTG9jYXRpb24gITogKCkgPT4gc3RyaW5nO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgdHJhY2UgITogKHM6IHN0cmluZykgPT4gdm9pZDtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIGdldERpcmVjdG9yaWVzICE6IChwYXRoOiBzdHJpbmcpID0+IHN0cmluZ1tdO1xuICByZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXM/OlxuICAgICAgKG5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZykgPT4gdHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlW107XG4gIGRpcmVjdG9yeUV4aXN0cz86IChkaXJlY3RvcnlOYW1lOiBzdHJpbmcpID0+IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvb3RGaWxlczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LCBwcml2YXRlIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyxcbiAgICAgIHByaXZhdGUgY29udGV4dDogQ29tcGlsZXJIb3N0LCBwcml2YXRlIG1ldGFkYXRhUHJvdmlkZXI6IE1ldGFkYXRhUHJvdmlkZXIsXG4gICAgICBwcml2YXRlIGNvZGVHZW5lcmF0b3I6IENvZGVHZW5lcmF0b3IsXG4gICAgICBwcml2YXRlIGxpYnJhcnlTdW1tYXJpZXMgPSBuZXcgTWFwPHN0cmluZywgTGlicmFyeVN1bW1hcnk+KCkpIHtcbiAgICB0aGlzLm1vZHVsZVJlc29sdXRpb25DYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShcbiAgICAgICAgdGhpcy5jb250ZXh0LmdldEN1cnJlbnREaXJlY3RvcnkgISgpLCB0aGlzLmNvbnRleHQuZ2V0Q2Fub25pY2FsRmlsZU5hbWUuYmluZCh0aGlzLmNvbnRleHQpKTtcbiAgICBjb25zdCBiYXNlUGF0aCA9IHRoaXMub3B0aW9ucy5iYXNlUGF0aCAhO1xuICAgIHRoaXMucm9vdERpcnMgPVxuICAgICAgICAodGhpcy5vcHRpb25zLnJvb3REaXJzIHx8IFt0aGlzLm9wdGlvbnMuYmFzZVBhdGggIV0pLm1hcChwID0+IHBhdGgucmVzb2x2ZShiYXNlUGF0aCwgcCkpO1xuICAgIGlmIChjb250ZXh0LmdldERpcmVjdG9yaWVzKSB7XG4gICAgICB0aGlzLmdldERpcmVjdG9yaWVzID0gcGF0aCA9PiBjb250ZXh0LmdldERpcmVjdG9yaWVzICEocGF0aCk7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LmRpcmVjdG9yeUV4aXN0cykge1xuICAgICAgdGhpcy5kaXJlY3RvcnlFeGlzdHMgPSBkaXJlY3RvcnlOYW1lID0+IGNvbnRleHQuZGlyZWN0b3J5RXhpc3RzICEoZGlyZWN0b3J5TmFtZSk7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LmdldENhbmNlbGxhdGlvblRva2VuKSB7XG4gICAgICB0aGlzLmdldENhbmNlbGxhdGlvblRva2VuID0gKCkgPT4gY29udGV4dC5nZXRDYW5jZWxsYXRpb25Ub2tlbiAhKCk7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LmdldERlZmF1bHRMaWJMb2NhdGlvbikge1xuICAgICAgdGhpcy5nZXREZWZhdWx0TGliTG9jYXRpb24gPSAoKSA9PiBjb250ZXh0LmdldERlZmF1bHRMaWJMb2NhdGlvbiAhKCk7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LnJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcykge1xuICAgICAgLy8gQmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aXRoIFR5cGVTY3JpcHQgMi45IGFuZCBvbGRlciBzaW5jZSByZXR1cm5cbiAgICAgIC8vIHR5cGUgaGFzIGNoYW5nZWQgZnJvbSAodHMuUmVzb2x2ZWRUeXBlUmVmZXJlbmNlRGlyZWN0aXZlIHwgdW5kZWZpbmVkKVtdXG4gICAgICAvLyB0byB0cy5SZXNvbHZlZFR5cGVSZWZlcmVuY2VEaXJlY3RpdmVbXSBpbiBUeXBlc2NyaXB0IDMuMFxuICAgICAgdHlwZSB0czNSZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMgPSAobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKSA9PlxuICAgICAgICAgIHRzLlJlc29sdmVkVHlwZVJlZmVyZW5jZURpcmVjdGl2ZVtdO1xuICAgICAgdGhpcy5yZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMgPSAobmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKSA9PlxuICAgICAgICAgIChjb250ZXh0LnJlc29sdmVUeXBlUmVmZXJlbmNlRGlyZWN0aXZlcyBhcyB0czNSZXNvbHZlVHlwZVJlZmVyZW5jZURpcmVjdGl2ZXMpICEoXG4gICAgICAgICAgICAgIG5hbWVzLCBjb250YWluaW5nRmlsZSk7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LnRyYWNlKSB7XG4gICAgICB0aGlzLnRyYWNlID0gcyA9PiBjb250ZXh0LnRyYWNlICEocyk7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LmZpbGVOYW1lVG9Nb2R1bGVOYW1lKSB7XG4gICAgICB0aGlzLmZpbGVOYW1lVG9Nb2R1bGVOYW1lID0gY29udGV4dC5maWxlTmFtZVRvTW9kdWxlTmFtZS5iaW5kKGNvbnRleHQpO1xuICAgIH1cbiAgICAvLyBOb3RlOiBkb24ndCBjb3B5IG92ZXIgY29udGV4dC5tb2R1bGVOYW1lVG9GaWxlTmFtZSBhcyB3ZSBmaXJzdFxuICAgIC8vIG5vcm1hbGl6ZSB1bmRlZmluZWQgY29udGFpbmluZ0ZpbGUgdG8gYSBmaWxsZWQgY29udGFpbmluZ0ZpbGUuXG4gICAgaWYgKGNvbnRleHQucmVzb3VyY2VOYW1lVG9GaWxlTmFtZSkge1xuICAgICAgdGhpcy5yZXNvdXJjZU5hbWVUb0ZpbGVOYW1lID0gY29udGV4dC5yZXNvdXJjZU5hbWVUb0ZpbGVOYW1lLmJpbmQoY29udGV4dCk7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LnRvU3VtbWFyeUZpbGVOYW1lKSB7XG4gICAgICB0aGlzLnRvU3VtbWFyeUZpbGVOYW1lID0gY29udGV4dC50b1N1bW1hcnlGaWxlTmFtZS5iaW5kKGNvbnRleHQpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5mcm9tU3VtbWFyeUZpbGVOYW1lKSB7XG4gICAgICB0aGlzLmZyb21TdW1tYXJ5RmlsZU5hbWUgPSBjb250ZXh0LmZyb21TdW1tYXJ5RmlsZU5hbWUuYmluZChjb250ZXh0KTtcbiAgICB9XG4gICAgdGhpcy5tZXRhZGF0YVJlYWRlckhvc3QgPSB7XG4gICAgICBjYWNoZU1ldGFkYXRhOiAoKSA9PiB0cnVlLFxuICAgICAgZ2V0U291cmNlRmlsZU1ldGFkYXRhOiAoZmlsZVBhdGgpID0+IHtcbiAgICAgICAgY29uc3Qgc2YgPSB0aGlzLmdldE9yaWdpbmFsU291cmNlRmlsZShmaWxlUGF0aCk7XG4gICAgICAgIHJldHVybiBzZiA/IHRoaXMubWV0YWRhdGFQcm92aWRlci5nZXRNZXRhZGF0YShzZikgOiB1bmRlZmluZWQ7XG4gICAgICB9LFxuICAgICAgZmlsZUV4aXN0czogKGZpbGVQYXRoKSA9PiB0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhmaWxlUGF0aCksXG4gICAgICByZWFkRmlsZTogKGZpbGVQYXRoKSA9PiBhc3NlcnQodGhpcy5jb250ZXh0LnJlYWRGaWxlKGZpbGVQYXRoKSksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZU1vZHVsZU5hbWUobW9kdWxlTmFtZTogc3RyaW5nLCBjb250YWluaW5nRmlsZTogc3RyaW5nKTogdHMuUmVzb2x2ZWRNb2R1bGVcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHJtID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUoXG4gICAgICAgICAgICAgICAgICAgICBtb2R1bGVOYW1lLCBjb250YWluaW5nRmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyksIHRoaXMub3B0aW9ucywgdGhpcyxcbiAgICAgICAgICAgICAgICAgICAgIHRoaXMubW9kdWxlUmVzb2x1dGlvbkNhY2hlKVxuICAgICAgICAgICAgICAgICAgIC5yZXNvbHZlZE1vZHVsZTtcbiAgICBpZiAocm0gJiYgdGhpcy5pc1NvdXJjZUZpbGUocm0ucmVzb2x2ZWRGaWxlTmFtZSkgJiYgRFRTLnRlc3Qocm0ucmVzb2x2ZWRGaWxlTmFtZSkpIHtcbiAgICAgIC8vIENhc2U6IGdlbmVyYXRlQ29kZUZvckxpYnJhcmllcyA9IHRydWUgYW5kIG1vZHVsZU5hbWUgaXNcbiAgICAgIC8vIGEgLmQudHMgZmlsZSBpbiBhIG5vZGVfbW9kdWxlcyBmb2xkZXIuXG4gICAgICAvLyBOZWVkIHRvIHNldCBpc0V4dGVybmFsTGlicmFyeUltcG9ydCB0byBmYWxzZSBzbyB0aGF0IGdlbmVyYXRlZCBmaWxlcyBmb3IgdGhhdCBmaWxlXG4gICAgICAvLyBhcmUgZW1pdHRlZC5cbiAgICAgIHJtLmlzRXh0ZXJuYWxMaWJyYXJ5SW1wb3J0ID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBybTtcbiAgfVxuXG4gIC8vIE5vdGU6IFdlIGltcGxlbWVudCB0aGlzIG1ldGhvZCBzbyB0aGF0IFR5cGVTY3JpcHQgYW5kIEFuZ3VsYXIgc2hhcmUgdGhlIHNhbWVcbiAgLy8gdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlXG4gIC8vIGFuZCB0aGF0IHdlIGNhbiB0ZWxsIHRzLlByb2dyYW0gYWJvdXQgb3VyIGRpZmZlcmVudCBvcGluaW9uIGFib3V0XG4gIC8vIFJlc29sdmVkTW9kdWxlLmlzRXh0ZXJuYWxMaWJyYXJ5SW1wb3J0XG4gIC8vIChzZWUgb3VyIGlzU291cmNlRmlsZSBtZXRob2QpLlxuICByZXNvbHZlTW9kdWxlTmFtZXMobW9kdWxlTmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nKTogdHMuUmVzb2x2ZWRNb2R1bGVbXSB7XG4gICAgLy8gVE9ETyh0Ym9zY2gpOiB0aGlzIHNlZW1zIHRvIGJlIGEgdHlwaW5nIGVycm9yIGluIFR5cGVTY3JpcHQsXG4gICAgLy8gYXMgaXQgY29udGFpbnMgYXNzZXJ0aW9ucyB0aGF0IHRoZSByZXN1bHQgY29udGFpbnMgdGhlIHNhbWUgbnVtYmVyIG9mIGVudHJpZXNcbiAgICAvLyBhcyB0aGUgZ2l2ZW4gbW9kdWxlIG5hbWVzLlxuICAgIHJldHVybiA8dHMuUmVzb2x2ZWRNb2R1bGVbXT5tb2R1bGVOYW1lcy5tYXAoXG4gICAgICAgIG1vZHVsZU5hbWUgPT4gdGhpcy5yZXNvbHZlTW9kdWxlTmFtZShtb2R1bGVOYW1lLCBjb250YWluaW5nRmlsZSkpO1xuICB9XG5cbiAgbW9kdWxlTmFtZVRvRmlsZU5hbWUobTogc3RyaW5nLCBjb250YWluaW5nRmlsZT86IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgICBpZiAoIWNvbnRhaW5pbmdGaWxlKSB7XG4gICAgICBpZiAobS5pbmRleE9mKCcuJykgPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXNvbHV0aW9uIG9mIHJlbGF0aXZlIHBhdGhzIHJlcXVpcmVzIGEgY29udGFpbmluZyBmaWxlLicpO1xuICAgICAgfVxuICAgICAgLy8gQW55IGNvbnRhaW5pbmcgZmlsZSBnaXZlcyB0aGUgc2FtZSByZXN1bHQgZm9yIGFic29sdXRlIGltcG9ydHNcbiAgICAgIGNvbnRhaW5pbmdGaWxlID0gdGhpcy5yb290RmlsZXNbMF07XG4gICAgfVxuICAgIGlmICh0aGlzLmNvbnRleHQubW9kdWxlTmFtZVRvRmlsZU5hbWUpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbnRleHQubW9kdWxlTmFtZVRvRmlsZU5hbWUobSwgY29udGFpbmluZ0ZpbGUpO1xuICAgIH1cbiAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZU1vZHVsZU5hbWUobSwgY29udGFpbmluZ0ZpbGUpO1xuICAgIHJldHVybiByZXNvbHZlZCA/IHJlc29sdmVkLnJlc29sdmVkRmlsZU5hbWUgOiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFdlIHdhbnQgYSBtb2R1bGVJZCB0aGF0IHdpbGwgYXBwZWFyIGluIGltcG9ydCBzdGF0ZW1lbnRzIGluIHRoZSBnZW5lcmF0ZWQgY29kZVxuICAgKiB3aGljaCB3aWxsIGJlIHdyaXR0ZW4gdG8gYGNvbnRhaW5pbmdGaWxlYC5cbiAgICpcbiAgICogTm90ZSB0aGF0IHdlIGFsc28gZ2VuZXJhdGUgZmlsZXMgZm9yIGZpbGVzIGluIG5vZGVfbW9kdWxlcywgYXMgbGlicmFyaWVzXG4gICAqIG9ubHkgc2hpcCAubWV0YWRhdGEuanNvbiBmaWxlcyBidXQgbm90IHRoZSBnZW5lcmF0ZWQgY29kZS5cbiAgICpcbiAgICogTG9naWM6XG4gICAqIDEuIGlmIHRoZSBpbXBvcnRlZEZpbGUgYW5kIHRoZSBjb250YWluaW5nRmlsZSBhcmUgZnJvbSB0aGUgcHJvamVjdCBzb3VyY2VzXG4gICAqICAgIG9yIGZyb20gdGhlIHNhbWUgbm9kZV9tb2R1bGVzIHBhY2thZ2UsIHVzZSBhIHJlbGF0aXZlIHBhdGhcbiAgICogMi4gaWYgdGhlIGltcG9ydGVkRmlsZSBpcyBpbiBhIG5vZGVfbW9kdWxlcyBwYWNrYWdlLFxuICAgKiAgICB1c2UgYSBwYXRoIHRoYXQgc3RhcnRzIHdpdGggdGhlIHBhY2thZ2UgbmFtZS5cbiAgICogMy4gRXJyb3IgaWYgdGhlIGNvbnRhaW5pbmdGaWxlIGlzIGluIHRoZSBub2RlX21vZHVsZXMgcGFja2FnZVxuICAgKiAgICBhbmQgdGhlIGltcG9ydGVkRmlsZSBpcyBpbiB0aGUgcHJvamVjdCBzb3VyZXMsXG4gICAqICAgIGFzIHRoYXQgaXMgYSB2aW9sYXRpb24gb2YgdGhlIHByaW5jaXBsZSB0aGF0IG5vZGVfbW9kdWxlcyBwYWNrYWdlcyBjYW5ub3RcbiAgICogICAgaW1wb3J0IHByb2plY3Qgc291cmNlcy5cbiAgICovXG4gIGZpbGVOYW1lVG9Nb2R1bGVOYW1lKGltcG9ydGVkRmlsZTogc3RyaW5nLCBjb250YWluaW5nRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBjYWNoZUtleSA9IGAke2ltcG9ydGVkRmlsZX06JHtjb250YWluaW5nRmlsZX1gO1xuICAgIGxldCBtb2R1bGVOYW1lID0gdGhpcy5maWxlTmFtZVRvTW9kdWxlTmFtZUNhY2hlLmdldChjYWNoZUtleSk7XG4gICAgaWYgKG1vZHVsZU5hbWUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG1vZHVsZU5hbWU7XG4gICAgfVxuXG4gICAgY29uc3Qgb3JpZ2luYWxJbXBvcnRlZEZpbGUgPSBpbXBvcnRlZEZpbGU7XG4gICAgaWYgKHRoaXMub3B0aW9ucy50cmFjZVJlc29sdXRpb24pIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgJ2ZpbGVOYW1lVG9Nb2R1bGVOYW1lIGZyb20gY29udGFpbmluZ0ZpbGUnLCBjb250YWluaW5nRmlsZSwgJ3RvIGltcG9ydGVkRmlsZScsXG4gICAgICAgICAgaW1wb3J0ZWRGaWxlKTtcbiAgICB9XG5cbiAgICAvLyBkcm9wIGV4dGVuc2lvblxuICAgIGltcG9ydGVkRmlsZSA9IGltcG9ydGVkRmlsZS5yZXBsYWNlKEVYVCwgJycpO1xuICAgIGNvbnN0IGltcG9ydGVkRmlsZVBhY2thZ2VOYW1lID0gZ2V0UGFja2FnZU5hbWUoaW1wb3J0ZWRGaWxlKTtcbiAgICBjb25zdCBjb250YWluaW5nRmlsZVBhY2thZ2VOYW1lID0gZ2V0UGFja2FnZU5hbWUoY29udGFpbmluZ0ZpbGUpO1xuXG4gICAgaWYgKGltcG9ydGVkRmlsZVBhY2thZ2VOYW1lID09PSBjb250YWluaW5nRmlsZVBhY2thZ2VOYW1lIHx8XG4gICAgICAgIEdFTkVSQVRFRF9GSUxFUy50ZXN0KG9yaWdpbmFsSW1wb3J0ZWRGaWxlKSkge1xuICAgICAgY29uc3Qgcm9vdGVkQ29udGFpbmluZ0ZpbGUgPSByZWxhdGl2ZVRvUm9vdERpcnMoY29udGFpbmluZ0ZpbGUsIHRoaXMucm9vdERpcnMpO1xuICAgICAgY29uc3Qgcm9vdGVkSW1wb3J0ZWRGaWxlID0gcmVsYXRpdmVUb1Jvb3REaXJzKGltcG9ydGVkRmlsZSwgdGhpcy5yb290RGlycyk7XG5cbiAgICAgIGlmIChyb290ZWRDb250YWluaW5nRmlsZSAhPT0gY29udGFpbmluZ0ZpbGUgJiYgcm9vdGVkSW1wb3J0ZWRGaWxlICE9PSBpbXBvcnRlZEZpbGUpIHtcbiAgICAgICAgLy8gaWYgYm90aCBmaWxlcyBhcmUgY29udGFpbmVkIGluIHRoZSBgcm9vdERpcnNgLCB0aGVuIHN0cmlwIHRoZSByb290RGlyc1xuICAgICAgICBjb250YWluaW5nRmlsZSA9IHJvb3RlZENvbnRhaW5pbmdGaWxlO1xuICAgICAgICBpbXBvcnRlZEZpbGUgPSByb290ZWRJbXBvcnRlZEZpbGU7XG4gICAgICB9XG4gICAgICBtb2R1bGVOYW1lID0gZG90UmVsYXRpdmUocGF0aC5kaXJuYW1lKGNvbnRhaW5pbmdGaWxlKSwgaW1wb3J0ZWRGaWxlKTtcbiAgICB9IGVsc2UgaWYgKGltcG9ydGVkRmlsZVBhY2thZ2VOYW1lKSB7XG4gICAgICBtb2R1bGVOYW1lID0gc3RyaXBOb2RlTW9kdWxlc1ByZWZpeChpbXBvcnRlZEZpbGUpO1xuICAgICAgaWYgKG9yaWdpbmFsSW1wb3J0ZWRGaWxlLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICAgIC8vIHRoZSBtb2R1bGVOYW1lIGZvciB0aGVzZSB0eXBpbmdzIGNvdWxkIGJlIHNob3J0ZW50ZWQgdG8gdGhlIG5wbSBwYWNrYWdlIG5hbWVcbiAgICAgICAgLy8gaWYgdGhlIG5wbSBwYWNrYWdlIHR5cGluZ3MgbWF0Y2hlcyB0aGUgaW1wb3J0ZWRGaWxlXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgbW9kdWxlUGF0aCA9IGltcG9ydGVkRmlsZS5zdWJzdHJpbmcoMCwgaW1wb3J0ZWRGaWxlLmxlbmd0aCAtIG1vZHVsZU5hbWUubGVuZ3RoKSArXG4gICAgICAgICAgICAgIGltcG9ydGVkRmlsZVBhY2thZ2VOYW1lO1xuICAgICAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gcmVxdWlyZShtb2R1bGVQYXRoICsgJy9wYWNrYWdlLmpzb24nKTtcbiAgICAgICAgICBjb25zdCBwYWNrYWdlVHlwaW5ncyA9IHBhdGgucG9zaXguam9pbihtb2R1bGVQYXRoLCBwYWNrYWdlSnNvbi50eXBpbmdzKTtcbiAgICAgICAgICBpZiAocGFja2FnZVR5cGluZ3MgPT09IG9yaWdpbmFsSW1wb3J0ZWRGaWxlKSB7XG4gICAgICAgICAgICBtb2R1bGVOYW1lID0gaW1wb3J0ZWRGaWxlUGFja2FnZU5hbWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyB0aGUgYWJvdmUgcmVxdWlyZSgpIHdpbGwgdGhyb3cgaWYgdGhlcmUgaXMgbm8gcGFja2FnZS5qc29uIGZpbGVcbiAgICAgICAgICAvLyBhbmQgdGhpcyBpcyBzYWZlIHRvIGlnbm9yZSBhbmQgY29ycmVjdCB0byBrZWVwIHRoZSBsb25nZXJcbiAgICAgICAgICAvLyBtb2R1bGVOYW1lIGluIHRoaXMgY2FzZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVHJ5aW5nIHRvIGltcG9ydCBhIHNvdXJjZSBmaWxlIGZyb20gYSBub2RlX21vZHVsZXMgcGFja2FnZTogaW1wb3J0ICR7b3JpZ2luYWxJbXBvcnRlZEZpbGV9IGZyb20gJHtjb250YWluaW5nRmlsZX1gKTtcbiAgICB9XG5cbiAgICB0aGlzLmZpbGVOYW1lVG9Nb2R1bGVOYW1lQ2FjaGUuc2V0KGNhY2hlS2V5LCBtb2R1bGVOYW1lKTtcbiAgICByZXR1cm4gbW9kdWxlTmFtZTtcbiAgfVxuXG4gIHJlc291cmNlTmFtZVRvRmlsZU5hbWUocmVzb3VyY2VOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gICAgLy8gTm90ZTogd2UgY29udmVydCBwYWNrYWdlIHBhdGhzIGludG8gcmVsYXRpdmUgcGF0aHMgdG8gYmUgY29tcGF0aWJsZSB3aXRoIHRoZSB0aGVcbiAgICAvLyBwcmV2aW91cyBpbXBsZW1lbnRhdGlvbiBvZiBVcmxSZXNvbHZlci5cbiAgICBjb25zdCBmaXJzdENoYXIgPSByZXNvdXJjZU5hbWVbMF07XG4gICAgaWYgKGZpcnN0Q2hhciA9PT0gJy8nKSB7XG4gICAgICByZXNvdXJjZU5hbWUgPSByZXNvdXJjZU5hbWUuc2xpY2UoMSk7XG4gICAgfSBlbHNlIGlmIChmaXJzdENoYXIgIT09ICcuJykge1xuICAgICAgcmVzb3VyY2VOYW1lID0gYC4vJHtyZXNvdXJjZU5hbWV9YDtcbiAgICB9XG4gICAgbGV0IGZpbGVQYXRoV2l0aE5nUmVzb3VyY2UgPVxuICAgICAgICB0aGlzLm1vZHVsZU5hbWVUb0ZpbGVOYW1lKGFkZE5nUmVzb3VyY2VTdWZmaXgocmVzb3VyY2VOYW1lKSwgY29udGFpbmluZ0ZpbGUpO1xuICAgIC8vIElmIHRoZSB1c2VyIHNwZWNpZmllZCBzdHlsZVVybCBwb2ludGluZyB0byAqLnNjc3MsIGJ1dCB0aGUgU2FzcyBjb21waWxlciB3YXMgcnVuIGJlZm9yZVxuICAgIC8vIEFuZ3VsYXIsIHRoZW4gdGhlIHJlc291cmNlIG1heSBoYXZlIGJlZW4gZ2VuZXJhdGVkIGFzICouY3NzLiBTaW1wbHkgdHJ5IHRoZSByZXNvbHV0aW9uIGFnYWluLlxuICAgIGlmICghZmlsZVBhdGhXaXRoTmdSZXNvdXJjZSAmJiBDU1NfUFJFUFJPQ0VTU09SX0VYVC50ZXN0KHJlc291cmNlTmFtZSkpIHtcbiAgICAgIGNvbnN0IGZhbGxiYWNrUmVzb3VyY2VOYW1lID0gcmVzb3VyY2VOYW1lLnJlcGxhY2UoQ1NTX1BSRVBST0NFU1NPUl9FWFQsICcuY3NzJyk7XG4gICAgICBmaWxlUGF0aFdpdGhOZ1Jlc291cmNlID1cbiAgICAgICAgICB0aGlzLm1vZHVsZU5hbWVUb0ZpbGVOYW1lKGFkZE5nUmVzb3VyY2VTdWZmaXgoZmFsbGJhY2tSZXNvdXJjZU5hbWUpLCBjb250YWluaW5nRmlsZSk7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGZpbGVQYXRoV2l0aE5nUmVzb3VyY2UgPyBzdHJpcE5nUmVzb3VyY2VTdWZmaXgoZmlsZVBhdGhXaXRoTmdSZXNvdXJjZSkgOiBudWxsO1xuICAgIC8vIFVzZWQgdW5kZXIgQmF6ZWwgdG8gcmVwb3J0IG1vcmUgc3BlY2lmaWMgZXJyb3Igd2l0aCByZW1lZGlhdGlvbiBhZHZpY2VcbiAgICBpZiAoIXJlc3VsdCAmJiAodGhpcy5jb250ZXh0IGFzIGFueSkucmVwb3J0TWlzc2luZ1Jlc291cmNlKSB7XG4gICAgICAodGhpcy5jb250ZXh0IGFzIGFueSkucmVwb3J0TWlzc2luZ1Jlc291cmNlKHJlc291cmNlTmFtZSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICB0b1N1bW1hcnlGaWxlTmFtZShmaWxlTmFtZTogc3RyaW5nLCByZWZlcnJpbmdTcmNGaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5maWxlTmFtZVRvTW9kdWxlTmFtZShmaWxlTmFtZSwgcmVmZXJyaW5nU3JjRmlsZU5hbWUpO1xuICB9XG5cbiAgZnJvbVN1bW1hcnlGaWxlTmFtZShmaWxlTmFtZTogc3RyaW5nLCByZWZlcnJpbmdMaWJGaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMubW9kdWxlTmFtZVRvRmlsZU5hbWUoZmlsZU5hbWUsIHJlZmVycmluZ0xpYkZpbGVOYW1lKTtcbiAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlICR7ZmlsZU5hbWV9IGZyb20gJHtyZWZlcnJpbmdMaWJGaWxlTmFtZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc29sdmVkO1xuICB9XG5cbiAgcGFyc2VTb3VyY2VTcGFuT2YoZmlsZU5hbWU6IHN0cmluZywgbGluZTogbnVtYmVyLCBjaGFyYWN0ZXI6IG51bWJlcik6IFBhcnNlU291cmNlU3BhbnxudWxsIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZW5lcmF0ZWRTb3VyY2VGaWxlcy5nZXQoZmlsZU5hbWUpO1xuICAgIGlmIChkYXRhICYmIGRhdGEuZW1pdEN0eCkge1xuICAgICAgcmV0dXJuIGRhdGEuZW1pdEN0eC5zcGFuT2YobGluZSwgY2hhcmFjdGVyKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdldE9yaWdpbmFsU291cmNlRmlsZShcbiAgICAgIGZpbGVQYXRoOiBzdHJpbmcsIGxhbmd1YWdlVmVyc2lvbj86IHRzLlNjcmlwdFRhcmdldCxcbiAgICAgIG9uRXJyb3I/OiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgICAvLyBOb3RlOiB3ZSBuZWVkIHRoZSBleHBsaWNpdCBjaGVjayB2aWEgYGhhc2AgYXMgd2UgYWxzbyBjYWNoZSByZXN1bHRzXG4gICAgLy8gdGhhdCB3ZXJlIG51bGwgLyB1bmRlZmluZWQuXG4gICAgaWYgKHRoaXMub3JpZ2luYWxTb3VyY2VGaWxlcy5oYXMoZmlsZVBhdGgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5vcmlnaW5hbFNvdXJjZUZpbGVzLmdldChmaWxlUGF0aCkgITtcbiAgICB9XG4gICAgaWYgKCFsYW5ndWFnZVZlcnNpb24pIHtcbiAgICAgIGxhbmd1YWdlVmVyc2lvbiA9IHRoaXMub3B0aW9ucy50YXJnZXQgfHwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdDtcbiAgICB9XG4gICAgLy8gTm90ZTogVGhpcyBjYW4gYWxzbyByZXR1cm4gdW5kZWZpbmVkLFxuICAgIC8vIGFzIHRoZSBUUyB0eXBpbmdzIGFyZSBub3QgY29ycmVjdCFcbiAgICBjb25zdCBzZiA9IHRoaXMuY29udGV4dC5nZXRTb3VyY2VGaWxlKGZpbGVQYXRoLCBsYW5ndWFnZVZlcnNpb24sIG9uRXJyb3IpIHx8IG51bGw7XG4gICAgdGhpcy5vcmlnaW5hbFNvdXJjZUZpbGVzLnNldChmaWxlUGF0aCwgc2YpO1xuICAgIHJldHVybiBzZjtcbiAgfVxuXG4gIHVwZGF0ZUdlbmVyYXRlZEZpbGUoZ2VuRmlsZTogR2VuZXJhdGVkRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICAgIGlmICghZ2VuRmlsZS5zdG10cykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbnZhbGlkIEFyZ3VtZW50OiBFeHBlY3RlZCBhIEdlbmVyYXRlRmlsZSB3aXRoIHN0YXRlbWVudHMuICR7Z2VuRmlsZS5nZW5GaWxlVXJsfWApO1xuICAgIH1cbiAgICBjb25zdCBvbGRHZW5GaWxlID0gdGhpcy5nZW5lcmF0ZWRTb3VyY2VGaWxlcy5nZXQoZ2VuRmlsZS5nZW5GaWxlVXJsKTtcbiAgICBpZiAoIW9sZEdlbkZpbGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSWxsZWdhbCBTdGF0ZTogcHJldmlvdXMgR2VuZXJhdGVkRmlsZSBub3QgZm91bmQgZm9yICR7Z2VuRmlsZS5nZW5GaWxlVXJsfS5gKTtcbiAgICB9XG4gICAgY29uc3QgbmV3UmVmcyA9IGdlbkZpbGVFeHRlcm5hbFJlZmVyZW5jZXMoZ2VuRmlsZSk7XG4gICAgY29uc3Qgb2xkUmVmcyA9IG9sZEdlbkZpbGUuZXh0ZXJuYWxSZWZlcmVuY2VzO1xuICAgIGxldCByZWZzQXJlRXF1YWwgPSBvbGRSZWZzLnNpemUgPT09IG5ld1JlZnMuc2l6ZTtcbiAgICBpZiAocmVmc0FyZUVxdWFsKSB7XG4gICAgICBuZXdSZWZzLmZvckVhY2gociA9PiByZWZzQXJlRXF1YWwgPSByZWZzQXJlRXF1YWwgJiYgb2xkUmVmcy5oYXMocikpO1xuICAgIH1cbiAgICBpZiAoIXJlZnNBcmVFcXVhbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbGxlZ2FsIFN0YXRlOiBleHRlcm5hbCByZWZlcmVuY2VzIGNoYW5nZWQgaW4gJHtnZW5GaWxlLmdlbkZpbGVVcmx9Llxcbk9sZDogJHtBcnJheS5mcm9tKG9sZFJlZnMpfS5cXG5OZXc6ICR7QXJyYXkuZnJvbShuZXdSZWZzKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYWRkR2VuZXJhdGVkRmlsZShnZW5GaWxlLCBuZXdSZWZzKTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkR2VuZXJhdGVkRmlsZShnZW5GaWxlOiBHZW5lcmF0ZWRGaWxlLCBleHRlcm5hbFJlZmVyZW5jZXM6IFNldDxzdHJpbmc+KTogdHMuU291cmNlRmlsZSB7XG4gICAgaWYgKCFnZW5GaWxlLnN0bXRzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEludmFsaWQgQXJndW1lbnQ6IEV4cGVjdGVkIGEgR2VuZXJhdGVGaWxlIHdpdGggc3RhdGVtZW50cy4gJHtnZW5GaWxlLmdlbkZpbGVVcmx9YCk7XG4gICAgfVxuICAgIGNvbnN0IHtzb3VyY2VUZXh0LCBjb250ZXh0fSA9IHRoaXMuZW1pdHRlci5lbWl0U3RhdGVtZW50c0FuZENvbnRleHQoXG4gICAgICAgIGdlbkZpbGUuZ2VuRmlsZVVybCwgZ2VuRmlsZS5zdG10cywgLyogcHJlYW1ibGUgKi8gJycsXG4gICAgICAgIC8qIGVtaXRTb3VyY2VNYXBzICovIGZhbHNlKTtcbiAgICBjb25zdCBzZiA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoXG4gICAgICAgIGdlbkZpbGUuZ2VuRmlsZVVybCwgc291cmNlVGV4dCwgdGhpcy5vcHRpb25zLnRhcmdldCB8fCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0KTtcbiAgICBpZiAoKHRoaXMub3B0aW9ucy5tb2R1bGUgPT09IHRzLk1vZHVsZUtpbmQuQU1EIHx8IHRoaXMub3B0aW9ucy5tb2R1bGUgPT09IHRzLk1vZHVsZUtpbmQuVU1EKSAmJlxuICAgICAgICB0aGlzLmNvbnRleHQuYW1kTW9kdWxlTmFtZSkge1xuICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IHRoaXMuY29udGV4dC5hbWRNb2R1bGVOYW1lKHNmKTtcbiAgICAgIGlmIChtb2R1bGVOYW1lKSBzZi5tb2R1bGVOYW1lID0gbW9kdWxlTmFtZTtcbiAgICB9XG4gICAgdGhpcy5nZW5lcmF0ZWRTb3VyY2VGaWxlcy5zZXQoZ2VuRmlsZS5nZW5GaWxlVXJsLCB7XG4gICAgICBzb3VyY2VGaWxlOiBzZixcbiAgICAgIGVtaXRDdHg6IGNvbnRleHQsIGV4dGVybmFsUmVmZXJlbmNlcyxcbiAgICB9KTtcbiAgICByZXR1cm4gc2Y7XG4gIH1cblxuICBzaG91bGRHZW5lcmF0ZUZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHtnZW5lcmF0ZTogYm9vbGVhbiwgYmFzZUZpbGVOYW1lPzogc3RyaW5nfSB7XG4gICAgLy8gVE9ETyh0Ym9zY2gpOiBhbGxvdyBnZW5lcmF0aW5nIGZpbGVzIHRoYXQgYXJlIG5vdCBpbiB0aGUgcm9vdERpclxuICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy8xOTMzN1xuICAgIGlmICghaXNJblJvb3REaXIoZmlsZU5hbWUsIHRoaXMub3B0aW9ucykpIHtcbiAgICAgIHJldHVybiB7Z2VuZXJhdGU6IGZhbHNlfTtcbiAgICB9XG4gICAgY29uc3QgZ2VuTWF0Y2ggPSBHRU5FUkFURURfRklMRVMuZXhlYyhmaWxlTmFtZSk7XG4gICAgaWYgKCFnZW5NYXRjaCkge1xuICAgICAgcmV0dXJuIHtnZW5lcmF0ZTogZmFsc2V9O1xuICAgIH1cbiAgICBjb25zdCBbLCBiYXNlLCBnZW5TdWZmaXgsIHN1ZmZpeF0gPSBnZW5NYXRjaDtcbiAgICBpZiAoc3VmZml4ICE9PSAndHMnICYmIHN1ZmZpeCAhPT0gJ3RzeCcpIHtcbiAgICAgIHJldHVybiB7Z2VuZXJhdGU6IGZhbHNlfTtcbiAgICB9XG4gICAgbGV0IGJhc2VGaWxlTmFtZTogc3RyaW5nfHVuZGVmaW5lZDtcbiAgICBpZiAoZ2VuU3VmZml4LmluZGV4T2YoJ25nc3R5bGUnKSA+PSAwKSB7XG4gICAgICAvLyBOb3RlOiBuZ3N0eWxlIGZpbGVzIGhhdmUgbmFtZXMgbGlrZSBgYWZpbGUuY3NzLm5nc3R5bGUudHNgXG4gICAgICBpZiAoIXRoaXMub3JpZ2luYWxGaWxlRXhpc3RzKGJhc2UpKSB7XG4gICAgICAgIHJldHVybiB7Z2VuZXJhdGU6IGZhbHNlfTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm90ZTogb24tdGhlLWZseSBnZW5lcmF0ZWQgZmlsZXMgYWx3YXlzIGhhdmUgYSBgLnRzYCBzdWZmaXgsXG4gICAgICAvLyBidXQgdGhlIGZpbGUgZnJvbSB3aGljaCB3ZSBnZW5lcmF0ZWQgaXQgY2FuIGJlIGEgYC50c2AvIGAudHN4YC8gYC5kLnRzYFxuICAgICAgLy8gKHNlZSBvcHRpb25zLmdlbmVyYXRlQ29kZUZvckxpYnJhcmllcykuXG4gICAgICBiYXNlRmlsZU5hbWUgPSBbYCR7YmFzZX0udHNgLCBgJHtiYXNlfS50c3hgLCBgJHtiYXNlfS5kLnRzYF0uZmluZChcbiAgICAgICAgICBiYXNlRmlsZU5hbWUgPT4gdGhpcy5pc1NvdXJjZUZpbGUoYmFzZUZpbGVOYW1lKSAmJiB0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhiYXNlRmlsZU5hbWUpKTtcbiAgICAgIGlmICghYmFzZUZpbGVOYW1lKSB7XG4gICAgICAgIHJldHVybiB7Z2VuZXJhdGU6IGZhbHNlfTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtnZW5lcmF0ZTogdHJ1ZSwgYmFzZUZpbGVOYW1lfTtcbiAgfVxuXG4gIHNob3VsZEdlbmVyYXRlRmlsZXNGb3IoZmlsZU5hbWU6IHN0cmluZykge1xuICAgIC8vIFRPRE8odGJvc2NoKTogYWxsb3cgZ2VuZXJhdGluZyBmaWxlcyB0aGF0IGFyZSBub3QgaW4gdGhlIHJvb3REaXJcbiAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9pc3N1ZXMvMTkzMzdcbiAgICByZXR1cm4gIUdFTkVSQVRFRF9GSUxFUy50ZXN0KGZpbGVOYW1lKSAmJiB0aGlzLmlzU291cmNlRmlsZShmaWxlTmFtZSkgJiZcbiAgICAgICAgaXNJblJvb3REaXIoZmlsZU5hbWUsIHRoaXMub3B0aW9ucyk7XG4gIH1cblxuICBnZXRTb3VyY2VGaWxlKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQsXG4gICAgICBvbkVycm9yPzogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCk6IHRzLlNvdXJjZUZpbGUge1xuICAgIC8vIE5vdGU6IERvbid0IGV4aXQgZWFybHkgaW4gdGhpcyBtZXRob2QgdG8gbWFrZSBzdXJlXG4gICAgLy8gd2UgYWx3YXlzIGhhdmUgdXAgdG8gZGF0ZSByZWZlcmVuY2VzIG9uIHRoZSBmaWxlIVxuICAgIGxldCBnZW5GaWxlTmFtZXM6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IHNmID0gdGhpcy5nZXRHZW5lcmF0ZWRGaWxlKGZpbGVOYW1lKTtcbiAgICBpZiAoIXNmKSB7XG4gICAgICBjb25zdCBzdW1tYXJ5ID0gdGhpcy5saWJyYXJ5U3VtbWFyaWVzLmdldChmaWxlTmFtZSk7XG4gICAgICBpZiAoc3VtbWFyeSkge1xuICAgICAgICBpZiAoIXN1bW1hcnkuc291cmNlRmlsZSkge1xuICAgICAgICAgIHN1bW1hcnkuc291cmNlRmlsZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoXG4gICAgICAgICAgICAgIGZpbGVOYW1lLCBzdW1tYXJ5LnRleHQsIHRoaXMub3B0aW9ucy50YXJnZXQgfHwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCk7XG4gICAgICAgIH1cbiAgICAgICAgc2YgPSBzdW1tYXJ5LnNvdXJjZUZpbGU7XG4gICAgICAgIGdlbkZpbGVOYW1lcyA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXNmKSB7XG4gICAgICBzZiA9IHRoaXMuZ2V0T3JpZ2luYWxTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGNvbnN0IGNhY2hlZEdlbkZpbGVzID0gdGhpcy5nZW5lcmF0ZWRDb2RlRm9yLmdldChmaWxlTmFtZSk7XG4gICAgICBpZiAoY2FjaGVkR2VuRmlsZXMpIHtcbiAgICAgICAgZ2VuRmlsZU5hbWVzID0gY2FjaGVkR2VuRmlsZXM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5ub1Jlc29sdmUgJiYgdGhpcy5zaG91bGRHZW5lcmF0ZUZpbGVzRm9yKGZpbGVOYW1lKSkge1xuICAgICAgICAgIGdlbkZpbGVOYW1lcyA9IHRoaXMuY29kZUdlbmVyYXRvci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKGZpbGVOYW1lKS5maWx0ZXIoXG4gICAgICAgICAgICAgIGZpbGVOYW1lID0+IHRoaXMuc2hvdWxkR2VuZXJhdGVGaWxlKGZpbGVOYW1lKS5nZW5lcmF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5nZW5lcmF0ZWRDb2RlRm9yLnNldChmaWxlTmFtZSwgZ2VuRmlsZU5hbWVzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHNmKSB7XG4gICAgICBhZGRSZWZlcmVuY2VzVG9Tb3VyY2VGaWxlKHNmLCBnZW5GaWxlTmFtZXMpO1xuICAgIH1cbiAgICAvLyBUT0RPKHRib3NjaCk6IFR5cGVTY3JpcHQncyB0eXBpbmdzIGZvciBnZXRTb3VyY2VGaWxlIGFyZSBpbmNvcnJlY3QsXG4gICAgLy8gYXMgaXQgY2FuIHZlcnkgd2VsbCByZXR1cm4gdW5kZWZpbmVkLlxuICAgIHJldHVybiBzZiAhO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRHZW5lcmF0ZWRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICAgIGNvbnN0IGdlblNyY0ZpbGUgPSB0aGlzLmdlbmVyYXRlZFNvdXJjZUZpbGVzLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKGdlblNyY0ZpbGUpIHtcbiAgICAgIHJldHVybiBnZW5TcmNGaWxlLnNvdXJjZUZpbGU7XG4gICAgfVxuICAgIGNvbnN0IHtnZW5lcmF0ZSwgYmFzZUZpbGVOYW1lfSA9IHRoaXMuc2hvdWxkR2VuZXJhdGVGaWxlKGZpbGVOYW1lKTtcbiAgICBpZiAoZ2VuZXJhdGUpIHtcbiAgICAgIGNvbnN0IGdlbkZpbGUgPSB0aGlzLmNvZGVHZW5lcmF0b3IuZ2VuZXJhdGVGaWxlKGZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpO1xuICAgICAgcmV0dXJuIHRoaXMuYWRkR2VuZXJhdGVkRmlsZShnZW5GaWxlLCBnZW5GaWxlRXh0ZXJuYWxSZWZlcmVuY2VzKGdlbkZpbGUpKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIG9yaWdpbmFsRmlsZUV4aXN0cyhmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgbGV0IGZpbGVFeGlzdHMgPSB0aGlzLm9yaWdpbmFsRmlsZUV4aXN0c0NhY2hlLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKGZpbGVFeGlzdHMgPT0gbnVsbCkge1xuICAgICAgZmlsZUV4aXN0cyA9IHRoaXMuY29udGV4dC5maWxlRXhpc3RzKGZpbGVOYW1lKTtcbiAgICAgIHRoaXMub3JpZ2luYWxGaWxlRXhpc3RzQ2FjaGUuc2V0KGZpbGVOYW1lLCBmaWxlRXhpc3RzKTtcbiAgICB9XG4gICAgcmV0dXJuIGZpbGVFeGlzdHM7XG4gIH1cblxuICBmaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBmaWxlTmFtZSA9IHN0cmlwTmdSZXNvdXJjZVN1ZmZpeChmaWxlTmFtZSk7XG4gICAgaWYgKHRoaXMubGlicmFyeVN1bW1hcmllcy5oYXMoZmlsZU5hbWUpIHx8IHRoaXMuZ2VuZXJhdGVkU291cmNlRmlsZXMuaGFzKGZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICh0aGlzLnNob3VsZEdlbmVyYXRlRmlsZShmaWxlTmFtZSkuZ2VuZXJhdGUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMoZmlsZU5hbWUpO1xuICB9XG5cbiAgbG9hZFN1bW1hcnkoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgICBjb25zdCBzdW1tYXJ5ID0gdGhpcy5saWJyYXJ5U3VtbWFyaWVzLmdldChmaWxlUGF0aCk7XG4gICAgaWYgKHN1bW1hcnkpIHtcbiAgICAgIHJldHVybiBzdW1tYXJ5LnRleHQ7XG4gICAgfVxuICAgIGlmICh0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiBhc3NlcnQodGhpcy5jb250ZXh0LnJlYWRGaWxlKGZpbGVQYXRoKSk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgaXNTb3VyY2VGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBEb24ndCBnZW5lcmF0ZSBhbnkgZmlsZXMgbm9yIHR5cGVjaGVjayB0aGVtXG4gICAgLy8gaWYgc2tpcFRlbXBsYXRlQ29kZWdlbiBpcyBzZXQgYW5kIGZ1bGxUZW1wbGF0ZVR5cGVDaGVjayBpcyBub3QgeWV0IHNldCxcbiAgICAvLyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5za2lwVGVtcGxhdGVDb2RlZ2VuICYmICF0aGlzLm9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIElmIHdlIGhhdmUgYSBzdW1tYXJ5IGZyb20gYSBwcmV2aW91cyBjb21waWxhdGlvbixcbiAgICAvLyB0cmVhdCB0aGUgZmlsZSBuZXZlciBhcyBhIHNvdXJjZSBmaWxlLlxuICAgIGlmICh0aGlzLmxpYnJhcnlTdW1tYXJpZXMuaGFzKGZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoR0VORVJBVEVEX0ZJTEVTLnRlc3QoZmlsZVBhdGgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuZ2VuZXJhdGVDb2RlRm9yTGlicmFyaWVzID09PSBmYWxzZSAmJiBEVFMudGVzdChmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKERUUy50ZXN0KGZpbGVQYXRoKSkge1xuICAgICAgLy8gQ2hlY2sgZm9yIGEgYnVuZGxlIGluZGV4LlxuICAgICAgaWYgKHRoaXMuaGFzQnVuZGxlSW5kZXgoZmlsZVBhdGgpKSB7XG4gICAgICAgIGNvbnN0IG5vcm1hbEZpbGVQYXRoID0gcGF0aC5ub3JtYWxpemUoZmlsZVBhdGgpO1xuICAgICAgICByZXR1cm4gdGhpcy5mbGF0TW9kdWxlSW5kZXhOYW1lcy5oYXMobm9ybWFsRmlsZVBhdGgpIHx8XG4gICAgICAgICAgICB0aGlzLmZsYXRNb2R1bGVJbmRleFJlZGlyZWN0TmFtZXMuaGFzKG5vcm1hbEZpbGVQYXRoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZWFkRmlsZShmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgY29uc3Qgc3VtbWFyeSA9IHRoaXMubGlicmFyeVN1bW1hcmllcy5nZXQoZmlsZU5hbWUpO1xuICAgIGlmIChzdW1tYXJ5KSB7XG4gICAgICByZXR1cm4gc3VtbWFyeS50ZXh0O1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb250ZXh0LnJlYWRGaWxlKGZpbGVOYW1lKTtcbiAgfVxuXG4gIGdldE1ldGFkYXRhRm9yKGZpbGVQYXRoOiBzdHJpbmcpOiBNb2R1bGVNZXRhZGF0YVtdfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHJlYWRNZXRhZGF0YShmaWxlUGF0aCwgdGhpcy5tZXRhZGF0YVJlYWRlckhvc3QsIHRoaXMubWV0YWRhdGFSZWFkZXJDYWNoZSk7XG4gIH1cblxuICBsb2FkUmVzb3VyY2UoZmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPnxzdHJpbmcge1xuICAgIGlmICh0aGlzLmNvbnRleHQucmVhZFJlc291cmNlKSByZXR1cm4gdGhpcy5jb250ZXh0LnJlYWRSZXNvdXJjZShmaWxlUGF0aCk7XG4gICAgaWYgKCF0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhmaWxlUGF0aCkpIHtcbiAgICAgIHRocm93IHN5bnRheEVycm9yKGBFcnJvcjogUmVzb3VyY2UgZmlsZSBub3QgZm91bmQ6ICR7ZmlsZVBhdGh9YCk7XG4gICAgfVxuICAgIHJldHVybiBhc3NlcnQodGhpcy5jb250ZXh0LnJlYWRGaWxlKGZpbGVQYXRoKSk7XG4gIH1cblxuICBnZXRPdXRwdXROYW1lKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBwYXRoLnJlbGF0aXZlKHRoaXMuZ2V0Q3VycmVudERpcmVjdG9yeSgpLCBmaWxlUGF0aCk7XG4gIH1cblxuICBwcml2YXRlIGhhc0J1bmRsZUluZGV4KGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBjaGVja0J1bmRsZUluZGV4ID0gKGRpcmVjdG9yeTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgICBsZXQgcmVzdWx0ID0gdGhpcy5mbGF0TW9kdWxlSW5kZXhDYWNoZS5nZXQoZGlyZWN0b3J5KTtcbiAgICAgIGlmIChyZXN1bHQgPT0gbnVsbCkge1xuICAgICAgICBpZiAocGF0aC5iYXNlbmFtZShkaXJlY3RvcnkpID09ICdub2RlX21vZHVsZScpIHtcbiAgICAgICAgICAvLyBEb24ndCBsb29rIG91dHNpZGUgdGhlIG5vZGVfbW9kdWxlcyB0aGlzIHBhY2thZ2UgaXMgaW5zdGFsbGVkIGluLlxuICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEEgYnVuZGxlIGluZGV4IGV4aXN0cyBpZiB0aGUgdHlwaW5ncyAuZC50cyBmaWxlIGhhcyBhIG1ldGFkYXRhLmpzb24gdGhhdCBoYXMgYW5cbiAgICAgICAgICAvLyBpbXBvcnRBcy5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGFja2FnZUZpbGUgPSBwYXRoLmpvaW4oZGlyZWN0b3J5LCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgICAgICBpZiAodGhpcy5vcmlnaW5hbEZpbGVFeGlzdHMocGFja2FnZUZpbGUpKSB7XG4gICAgICAgICAgICAgIC8vIE9uY2Ugd2Ugc2VlIGEgcGFja2FnZS5qc29uIGZpbGUsIGFzc3VtZSBmYWxzZSB1bnRpbCBpdCB3ZSBmaW5kIHRoZSBidW5kbGUgaW5kZXguXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgICBjb25zdCBwYWNrYWdlQ29udGVudDogYW55ID0gSlNPTi5wYXJzZShhc3NlcnQodGhpcy5jb250ZXh0LnJlYWRGaWxlKHBhY2thZ2VGaWxlKSkpO1xuICAgICAgICAgICAgICBpZiAocGFja2FnZUNvbnRlbnQudHlwaW5ncykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGluZ3MgPSBwYXRoLm5vcm1hbGl6ZShwYXRoLmpvaW4oZGlyZWN0b3J5LCBwYWNrYWdlQ29udGVudC50eXBpbmdzKSk7XG4gICAgICAgICAgICAgICAgaWYgKERUUy50ZXN0KHR5cGluZ3MpKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCBtZXRhZGF0YUZpbGUgPSB0eXBpbmdzLnJlcGxhY2UoRFRTLCAnLm1ldGFkYXRhLmpzb24nKTtcbiAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9yaWdpbmFsRmlsZUV4aXN0cyhtZXRhZGF0YUZpbGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGFkYXRhID0gSlNPTi5wYXJzZShhc3NlcnQodGhpcy5jb250ZXh0LnJlYWRGaWxlKG1ldGFkYXRhRmlsZSkpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGFkYXRhLmZsYXRNb2R1bGVJbmRleFJlZGlyZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5mbGF0TW9kdWxlSW5kZXhSZWRpcmVjdE5hbWVzLmFkZCh0eXBpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBOb3RlOiBkb24ndCBzZXQgcmVzdWx0ID0gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAvLyBhcyB0aGlzIHdvdWxkIG1hcmsgdGhpcyBmb2xkZXJcbiAgICAgICAgICAgICAgICAgICAgICAvLyBhcyBoYXZpbmcgYSBidW5kbGVJbmRleCB0b28gZWFybHkgd2l0aG91dFxuICAgICAgICAgICAgICAgICAgICAgIC8vIGZpbGxpbmcgdGhlIGJ1bmRsZUluZGV4TmFtZXMuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWV0YWRhdGEuaW1wb3J0QXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZsYXRNb2R1bGVJbmRleE5hbWVzLmFkZCh0eXBpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zdCBwYXJlbnQgPSBwYXRoLmRpcm5hbWUoZGlyZWN0b3J5KTtcbiAgICAgICAgICAgICAgaWYgKHBhcmVudCAhPSBkaXJlY3RvcnkpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgdGhlIHBhcmVudCBkaXJlY3RvcnkuXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gY2hlY2tCdW5kbGVJbmRleChwYXJlbnQpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAvLyBJZiB3ZSBlbmNvdW50ZXIgYW55IGVycm9ycyBhc3N1bWUgd2UgdGhpcyBpc24ndCBhIGJ1bmRsZSBpbmRleC5cbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZsYXRNb2R1bGVJbmRleENhY2hlLnNldChkaXJlY3RvcnksIHJlc3VsdCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICByZXR1cm4gY2hlY2tCdW5kbGVJbmRleChwYXRoLmRpcm5hbWUoZmlsZVBhdGgpKTtcbiAgfVxuXG4gIGdldERlZmF1bHRMaWJGaWxlTmFtZSA9IChvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpID0+XG4gICAgICB0aGlzLmNvbnRleHQuZ2V0RGVmYXVsdExpYkZpbGVOYW1lKG9wdGlvbnMpXG4gIGdldEN1cnJlbnREaXJlY3RvcnkgPSAoKSA9PiB0aGlzLmNvbnRleHQuZ2V0Q3VycmVudERpcmVjdG9yeSgpO1xuICBnZXRDYW5vbmljYWxGaWxlTmFtZSA9IChmaWxlTmFtZTogc3RyaW5nKSA9PiB0aGlzLmNvbnRleHQuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpO1xuICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzID0gKCkgPT4gdGhpcy5jb250ZXh0LnVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTtcbiAgZ2V0TmV3TGluZSA9ICgpID0+IHRoaXMuY29udGV4dC5nZXROZXdMaW5lKCk7XG4gIC8vIE1ha2Ugc3VyZSB3ZSBkbyBub3QgYGhvc3QucmVhbHBhdGgoKWAgZnJvbSBUUyBhcyB3ZSBkbyBub3Qgd2FudCB0byByZXNvbHZlIHN5bWxpbmtzLlxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzk1NTJcbiAgcmVhbHBhdGggPSAocDogc3RyaW5nKSA9PiBwO1xuICB3cml0ZUZpbGUgPSB0aGlzLmNvbnRleHQud3JpdGVGaWxlLmJpbmQodGhpcy5jb250ZXh0KTtcbn1cblxuZnVuY3Rpb24gZ2VuRmlsZUV4dGVybmFsUmVmZXJlbmNlcyhnZW5GaWxlOiBHZW5lcmF0ZWRGaWxlKTogU2V0PHN0cmluZz4ge1xuICByZXR1cm4gbmV3IFNldChjb2xsZWN0RXh0ZXJuYWxSZWZlcmVuY2VzKGdlbkZpbGUuc3RtdHMgISkubWFwKGVyID0+IGVyLm1vZHVsZU5hbWUgISkpO1xufVxuXG5mdW5jdGlvbiBhZGRSZWZlcmVuY2VzVG9Tb3VyY2VGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlLCBnZW5GaWxlTmFtZXM6IHN0cmluZ1tdKSB7XG4gIC8vIE5vdGU6IGFzIHdlIG1vZGlmeSB0cy5Tb3VyY2VGaWxlcyB3ZSBuZWVkIHRvIGtlZXAgdGhlIG9yaWdpbmFsXG4gIC8vIHZhbHVlIGZvciBgcmVmZXJlbmNlZEZpbGVzYCBhcm91bmQgaW4gY2FjaGUgdGhlIG9yaWdpbmFsIGhvc3QgaXMgY2FjaGluZyB0cy5Tb3VyY2VGaWxlcy5cbiAgLy8gTm90ZTogY2xvbmluZyB0aGUgdHMuU291cmNlRmlsZSBpcyBleHBlbnNpdmUgYXMgdGhlIG5vZGVzIGluIGhhdmUgcGFyZW50IHBvaW50ZXJzLFxuICAvLyBpLmUuIHdlIHdvdWxkIGFsc28gbmVlZCB0byBjbG9uZSBhbmQgYWRqdXN0IGFsbCBub2Rlcy5cbiAgbGV0IG9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzOiBSZWFkb25seUFycmF5PHRzLkZpbGVSZWZlcmVuY2U+ID1cbiAgICAgIChzZiBhcyBhbnkpLm9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzO1xuICBpZiAoIW9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzKSB7XG4gICAgb3JpZ2luYWxSZWZlcmVuY2VkRmlsZXMgPSBzZi5yZWZlcmVuY2VkRmlsZXM7XG4gICAgKHNmIGFzIGFueSkub3JpZ2luYWxSZWZlcmVuY2VkRmlsZXMgPSBvcmlnaW5hbFJlZmVyZW5jZWRGaWxlcztcbiAgfVxuICBjb25zdCBuZXdSZWZlcmVuY2VkRmlsZXMgPSBbLi4ub3JpZ2luYWxSZWZlcmVuY2VkRmlsZXNdO1xuICBnZW5GaWxlTmFtZXMuZm9yRWFjaChnZiA9PiBuZXdSZWZlcmVuY2VkRmlsZXMucHVzaCh7ZmlsZU5hbWU6IGdmLCBwb3M6IDAsIGVuZDogMH0pKTtcbiAgc2YucmVmZXJlbmNlZEZpbGVzID0gbmV3UmVmZXJlbmNlZEZpbGVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0T3JpZ2luYWxSZWZlcmVuY2VzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5GaWxlUmVmZXJlbmNlW118dW5kZWZpbmVkIHtcbiAgcmV0dXJuIHNvdXJjZUZpbGUgJiYgKHNvdXJjZUZpbGUgYXMgYW55KS5vcmlnaW5hbFJlZmVyZW5jZWRGaWxlcztcbn1cblxuZnVuY3Rpb24gZG90UmVsYXRpdmUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgclBhdGg6IHN0cmluZyA9IHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgcmV0dXJuIHJQYXRoLnN0YXJ0c1dpdGgoJy4nKSA/IHJQYXRoIDogJy4vJyArIHJQYXRoO1xufVxuXG4vKipcbiAqIE1vdmVzIHRoZSBwYXRoIGludG8gYGdlbkRpcmAgZm9sZGVyIHdoaWxlIHByZXNlcnZpbmcgdGhlIGBub2RlX21vZHVsZXNgIGRpcmVjdG9yeS5cbiAqL1xuZnVuY3Rpb24gZ2V0UGFja2FnZU5hbWUoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgY29uc3QgbWF0Y2ggPSBOT0RFX01PRFVMRVNfUEFDS0FHRV9OQU1FLmV4ZWMoZmlsZVBhdGgpO1xuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFsxXSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHN0cmlwTm9kZU1vZHVsZXNQcmVmaXgoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBmaWxlUGF0aC5yZXBsYWNlKC8uKm5vZGVfbW9kdWxlc1xcLy8sICcnKTtcbn1cblxuZnVuY3Rpb24gZ2V0Tm9kZU1vZHVsZXNQcmVmaXgoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgY29uc3QgbWF0Y2ggPSAvLipub2RlX21vZHVsZXNcXC8vLmV4ZWMoZmlsZVBhdGgpO1xuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFsxXSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHN0cmlwTmdSZXNvdXJjZVN1ZmZpeChmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGZpbGVOYW1lLnJlcGxhY2UoL1xcLlxcJG5ncmVzb3VyY2VcXCQuKi8sICcnKTtcbn1cblxuZnVuY3Rpb24gYWRkTmdSZXNvdXJjZVN1ZmZpeChmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2ZpbGVOYW1lfS4kbmdyZXNvdXJjZSRgO1xufVxuIl19