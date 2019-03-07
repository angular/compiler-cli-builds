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
        define("@angular/compiler-cli/src/transformers/program", ["require", "exports", "@angular/compiler", "fs", "path", "typescript", "@angular/compiler-cli/src/diagnostics/translate_diagnostics", "@angular/compiler-cli/src/diagnostics/typescript_version", "@angular/compiler-cli/src/metadata/index", "@angular/compiler-cli/src/ngtsc/program", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/compiler_host", "@angular/compiler-cli/src/transformers/inline_resources", "@angular/compiler-cli/src/transformers/lower_expressions", "@angular/compiler-cli/src/transformers/metadata_cache", "@angular/compiler-cli/src/transformers/nocollapse_hack", "@angular/compiler-cli/src/transformers/node_emitter_transform", "@angular/compiler-cli/src/transformers/r3_metadata_transform", "@angular/compiler-cli/src/transformers/r3_strip_decorators", "@angular/compiler-cli/src/transformers/r3_transform", "@angular/compiler-cli/src/transformers/tsc_pass_through", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const compiler_1 = require("@angular/compiler");
    const fs = require("fs");
    const path = require("path");
    const ts = require("typescript");
    const translate_diagnostics_1 = require("@angular/compiler-cli/src/diagnostics/translate_diagnostics");
    const typescript_version_1 = require("@angular/compiler-cli/src/diagnostics/typescript_version");
    const metadata_1 = require("@angular/compiler-cli/src/metadata/index");
    const program_1 = require("@angular/compiler-cli/src/ngtsc/program");
    const api_1 = require("@angular/compiler-cli/src/transformers/api");
    const compiler_host_1 = require("@angular/compiler-cli/src/transformers/compiler_host");
    const inline_resources_1 = require("@angular/compiler-cli/src/transformers/inline_resources");
    const lower_expressions_1 = require("@angular/compiler-cli/src/transformers/lower_expressions");
    const metadata_cache_1 = require("@angular/compiler-cli/src/transformers/metadata_cache");
    const nocollapse_hack_1 = require("@angular/compiler-cli/src/transformers/nocollapse_hack");
    const node_emitter_transform_1 = require("@angular/compiler-cli/src/transformers/node_emitter_transform");
    const r3_metadata_transform_1 = require("@angular/compiler-cli/src/transformers/r3_metadata_transform");
    const r3_strip_decorators_1 = require("@angular/compiler-cli/src/transformers/r3_strip_decorators");
    const r3_transform_1 = require("@angular/compiler-cli/src/transformers/r3_transform");
    const tsc_pass_through_1 = require("@angular/compiler-cli/src/transformers/tsc_pass_through");
    const util_1 = require("@angular/compiler-cli/src/transformers/util");
    /**
     * Maximum number of files that are emitable via calling ts.Program.emit
     * passing individual targetSourceFiles.
     */
    const MAX_FILE_COUNT_FOR_SINGLE_FILE_EMIT = 20;
    /**
     * Fields to lower within metadata in render2 mode.
     */
    const LOWER_FIELDS = ['useValue', 'useFactory', 'data', 'id', 'loadChildren'];
    /**
     * Fields to lower within metadata in render3 mode.
     */
    const R3_LOWER_FIELDS = [...LOWER_FIELDS, 'providers', 'imports', 'exports'];
    const R3_REIFIED_DECORATORS = [
        'Component',
        'Directive',
        'Injectable',
        'NgModule',
        'Pipe',
    ];
    const emptyModules = {
        ngModules: [],
        ngModuleByPipeOrDirective: new Map(),
        files: []
    };
    const defaultEmitCallback = ({ program, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers }) => program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
    /**
     * Minimum supported TypeScript version
     * ∀ supported typescript version v, v >= MIN_TS_VERSION
     */
    const MIN_TS_VERSION = '3.1.1';
    /**
     * Supremum of supported TypeScript versions
     * ∀ supported typescript version v, v < MAX_TS_VERSION
     * MAX_TS_VERSION is not considered as a supported TypeScript version
     */
    const MAX_TS_VERSION = '3.3.0';
    class AngularCompilerProgram {
        constructor(rootNames, options, host, oldProgram) {
            this.options = options;
            this.host = host;
            this._optionsDiagnostics = [];
            this.rootNames = [...rootNames];
            checkVersion(ts.version, MIN_TS_VERSION, MAX_TS_VERSION, options.disableTypeScriptVersionCheck);
            this.oldTsProgram = oldProgram ? oldProgram.getTsProgram() : undefined;
            if (oldProgram) {
                this.oldProgramLibrarySummaries = oldProgram.getLibrarySummaries();
                this.oldProgramEmittedGeneratedFiles = oldProgram.getEmittedGeneratedFiles();
                this.oldProgramEmittedSourceFiles = oldProgram.getEmittedSourceFiles();
            }
            if (options.flatModuleOutFile) {
                const { host: bundleHost, indexName, errors } = metadata_1.createBundleIndexHost(options, this.rootNames, host, () => this.flatModuleMetadataCache);
                if (errors) {
                    this._optionsDiagnostics.push(...errors.map(e => ({
                        category: e.category,
                        messageText: e.messageText,
                        source: api_1.SOURCE,
                        code: api_1.DEFAULT_ERROR_CODE
                    })));
                }
                else {
                    this.rootNames.push(indexName);
                    this.host = bundleHost;
                }
            }
            this.loweringMetadataTransform =
                new lower_expressions_1.LowerMetadataTransform(options.enableIvy ? R3_LOWER_FIELDS : LOWER_FIELDS);
            this.metadataCache = this.createMetadataCache([this.loweringMetadataTransform]);
        }
        createMetadataCache(transformers) {
            return new metadata_cache_1.MetadataCache(new metadata_1.MetadataCollector({ quotedNames: true }), !!this.options.strictMetadataEmit, transformers);
        }
        getLibrarySummaries() {
            const result = new Map();
            if (this.oldProgramLibrarySummaries) {
                this.oldProgramLibrarySummaries.forEach((summary, fileName) => result.set(fileName, summary));
            }
            if (this.emittedLibrarySummaries) {
                this.emittedLibrarySummaries.forEach((summary, fileName) => result.set(summary.fileName, summary));
            }
            return result;
        }
        getEmittedGeneratedFiles() {
            const result = new Map();
            if (this.oldProgramEmittedGeneratedFiles) {
                this.oldProgramEmittedGeneratedFiles.forEach((genFile, fileName) => result.set(fileName, genFile));
            }
            if (this.emittedGeneratedFiles) {
                this.emittedGeneratedFiles.forEach((genFile) => result.set(genFile.genFileUrl, genFile));
            }
            return result;
        }
        getEmittedSourceFiles() {
            const result = new Map();
            if (this.oldProgramEmittedSourceFiles) {
                this.oldProgramEmittedSourceFiles.forEach((sf, fileName) => result.set(fileName, sf));
            }
            if (this.emittedSourceFiles) {
                this.emittedSourceFiles.forEach((sf) => result.set(sf.fileName, sf));
            }
            return result;
        }
        getTsProgram() { return this.tsProgram; }
        getTsOptionDiagnostics(cancellationToken) {
            return this.tsProgram.getOptionsDiagnostics(cancellationToken);
        }
        getNgOptionDiagnostics(cancellationToken) {
            return [...this._optionsDiagnostics, ...getNgOptionDiagnostics(this.options)];
        }
        getTsSyntacticDiagnostics(sourceFile, cancellationToken) {
            return this.tsProgram.getSyntacticDiagnostics(sourceFile, cancellationToken);
        }
        getNgStructuralDiagnostics(cancellationToken) {
            return this.structuralDiagnostics;
        }
        getTsSemanticDiagnostics(sourceFile, cancellationToken) {
            const sourceFiles = sourceFile ? [sourceFile] : this.tsProgram.getSourceFiles();
            let diags = [];
            sourceFiles.forEach(sf => {
                if (!util_1.GENERATED_FILES.test(sf.fileName)) {
                    diags.push(...this.tsProgram.getSemanticDiagnostics(sf, cancellationToken));
                }
            });
            return diags;
        }
        getNgSemanticDiagnostics(fileName, cancellationToken) {
            let diags = [];
            this.tsProgram.getSourceFiles().forEach(sf => {
                if (util_1.GENERATED_FILES.test(sf.fileName) && !sf.isDeclarationFile) {
                    diags.push(...this.tsProgram.getSemanticDiagnostics(sf, cancellationToken));
                }
            });
            const { ng } = translate_diagnostics_1.translateDiagnostics(this.hostAdapter, diags);
            return ng;
        }
        loadNgStructureAsync() {
            if (this._analyzedModules) {
                throw new Error('Angular structure already loaded');
            }
            return Promise.resolve()
                .then(() => {
                const { tmpProgram, sourceFiles, tsFiles, rootNames } = this._createProgramWithBasicStubs();
                return this.compiler.loadFilesAsync(sourceFiles, tsFiles)
                    .then(({ analyzedModules, analyzedInjectables }) => {
                    if (this._analyzedModules) {
                        throw new Error('Angular structure loaded both synchronously and asynchronously');
                    }
                    this._updateProgramWithTypeCheckStubs(tmpProgram, analyzedModules, analyzedInjectables, rootNames);
                });
            })
                .catch(e => this._createProgramOnError(e));
        }
        listLazyRoutes(route) {
            // Note: Don't analyzedModules if a route is given
            // to be fast enough.
            return this.compiler.listLazyRoutes(route, route ? undefined : this.analyzedModules);
        }
        emit(parameters = {}) {
            if (this.options.enableIvy) {
                throw new Error('Cannot run legacy compiler in ngtsc mode');
            }
            return this._emitRender2(parameters);
        }
        _emitRender3({ emitFlags = api_1.EmitFlags.Default, cancellationToken, customTransformers, emitCallback = defaultEmitCallback, mergeEmitResultsCallback = mergeEmitResults, } = {}) {
            const emitStart = Date.now();
            if ((emitFlags & (api_1.EmitFlags.JS | api_1.EmitFlags.DTS | api_1.EmitFlags.Metadata | api_1.EmitFlags.Codegen)) ===
                0) {
                return { emitSkipped: true, diagnostics: [], emittedFiles: [] };
            }
            // analyzedModules and analyzedInjectables are created together. If one exists, so does the
            // other.
            const modules = this.compiler.emitAllPartialModules(this.analyzedModules, this._analyzedInjectables);
            const writeTsFile = (outFileName, outData, writeByteOrderMark, onError, sourceFiles) => {
                const sourceFile = sourceFiles && sourceFiles.length == 1 ? sourceFiles[0] : null;
                let genFile;
                if (this.options.annotateForClosureCompiler && sourceFile &&
                    util_1.TS.test(sourceFile.fileName)) {
                    outData = nocollapse_hack_1.nocollapseHack(outData);
                }
                this.writeFile(outFileName, outData, writeByteOrderMark, onError, undefined, sourceFiles);
            };
            const emitOnlyDtsFiles = (emitFlags & (api_1.EmitFlags.DTS | api_1.EmitFlags.JS)) == api_1.EmitFlags.DTS;
            const tsCustomTransformers = this.calculateTransforms(
            /* genFiles */ undefined, /* partialModules */ modules, 
            /* stripDecorators */ this.reifiedDecorators, customTransformers);
            // Restore the original references before we emit so TypeScript doesn't emit
            // a reference to the .d.ts file.
            const augmentedReferences = new Map();
            for (const sourceFile of this.tsProgram.getSourceFiles()) {
                const originalReferences = compiler_host_1.getOriginalReferences(sourceFile);
                if (originalReferences) {
                    augmentedReferences.set(sourceFile, sourceFile.referencedFiles);
                    sourceFile.referencedFiles = originalReferences;
                }
            }
            try {
                return emitCallback({
                    program: this.tsProgram,
                    host: this.host,
                    options: this.options,
                    writeFile: writeTsFile, emitOnlyDtsFiles,
                    customTransformers: tsCustomTransformers
                });
            }
            finally {
                // Restore the references back to the augmented value to ensure that the
                // checks that TypeScript makes for project structure reuse will succeed.
                for (const [sourceFile, references] of Array.from(augmentedReferences)) {
                    // TODO(chuckj): Remove any cast after updating build to 2.6
                    sourceFile.referencedFiles = references;
                }
            }
        }
        _emitRender2({ emitFlags = api_1.EmitFlags.Default, cancellationToken, customTransformers, emitCallback = defaultEmitCallback, mergeEmitResultsCallback = mergeEmitResults, } = {}) {
            const emitStart = Date.now();
            if (emitFlags & api_1.EmitFlags.I18nBundle) {
                const locale = this.options.i18nOutLocale || null;
                const file = this.options.i18nOutFile || null;
                const format = this.options.i18nOutFormat || null;
                const bundle = this.compiler.emitMessageBundle(this.analyzedModules, locale);
                i18nExtract(format, file, this.host, this.options, bundle);
            }
            if ((emitFlags & (api_1.EmitFlags.JS | api_1.EmitFlags.DTS | api_1.EmitFlags.Metadata | api_1.EmitFlags.Codegen)) ===
                0) {
                return { emitSkipped: true, diagnostics: [], emittedFiles: [] };
            }
            let { genFiles, genDiags } = this.generateFilesForEmit(emitFlags);
            if (genDiags.length) {
                return {
                    diagnostics: genDiags,
                    emitSkipped: true,
                    emittedFiles: [],
                };
            }
            this.emittedGeneratedFiles = genFiles;
            const outSrcMapping = [];
            const genFileByFileName = new Map();
            genFiles.forEach(genFile => genFileByFileName.set(genFile.genFileUrl, genFile));
            this.emittedLibrarySummaries = [];
            const emittedSourceFiles = [];
            const writeTsFile = (outFileName, outData, writeByteOrderMark, onError, sourceFiles) => {
                const sourceFile = sourceFiles && sourceFiles.length == 1 ? sourceFiles[0] : null;
                let genFile;
                if (sourceFile) {
                    outSrcMapping.push({ outFileName: outFileName, sourceFile });
                    genFile = genFileByFileName.get(sourceFile.fileName);
                    if (!sourceFile.isDeclarationFile && !util_1.GENERATED_FILES.test(sourceFile.fileName)) {
                        // Note: sourceFile is the transformed sourcefile, not the original one!
                        const originalFile = this.tsProgram.getSourceFile(sourceFile.fileName);
                        if (originalFile) {
                            emittedSourceFiles.push(originalFile);
                        }
                    }
                    if (this.options.annotateForClosureCompiler && util_1.TS.test(sourceFile.fileName)) {
                        outData = nocollapse_hack_1.nocollapseHack(outData);
                    }
                }
                this.writeFile(outFileName, outData, writeByteOrderMark, onError, genFile, sourceFiles);
            };
            const modules = this._analyzedInjectables &&
                this.compiler.emitAllPartialModules2(this._analyzedInjectables);
            const tsCustomTransformers = this.calculateTransforms(genFileByFileName, modules, /* stripDecorators */ undefined, customTransformers);
            const emitOnlyDtsFiles = (emitFlags & (api_1.EmitFlags.DTS | api_1.EmitFlags.JS)) == api_1.EmitFlags.DTS;
            // Restore the original references before we emit so TypeScript doesn't emit
            // a reference to the .d.ts file.
            const augmentedReferences = new Map();
            for (const sourceFile of this.tsProgram.getSourceFiles()) {
                const originalReferences = compiler_host_1.getOriginalReferences(sourceFile);
                if (originalReferences) {
                    augmentedReferences.set(sourceFile, sourceFile.referencedFiles);
                    sourceFile.referencedFiles = originalReferences;
                }
            }
            const genTsFiles = [];
            const genJsonFiles = [];
            genFiles.forEach(gf => {
                if (gf.stmts) {
                    genTsFiles.push(gf);
                }
                if (gf.source) {
                    genJsonFiles.push(gf);
                }
            });
            let emitResult;
            let emittedUserTsCount;
            try {
                const sourceFilesToEmit = this.getSourceFilesForEmit();
                if (sourceFilesToEmit &&
                    (sourceFilesToEmit.length + genTsFiles.length) < MAX_FILE_COUNT_FOR_SINGLE_FILE_EMIT) {
                    const fileNamesToEmit = [...sourceFilesToEmit.map(sf => sf.fileName), ...genTsFiles.map(gf => gf.genFileUrl)];
                    emitResult = mergeEmitResultsCallback(fileNamesToEmit.map((fileName) => emitResult = emitCallback({
                        program: this.tsProgram,
                        host: this.host,
                        options: this.options,
                        writeFile: writeTsFile, emitOnlyDtsFiles,
                        customTransformers: tsCustomTransformers,
                        targetSourceFile: this.tsProgram.getSourceFile(fileName),
                    })));
                    emittedUserTsCount = sourceFilesToEmit.length;
                }
                else {
                    emitResult = emitCallback({
                        program: this.tsProgram,
                        host: this.host,
                        options: this.options,
                        writeFile: writeTsFile, emitOnlyDtsFiles,
                        customTransformers: tsCustomTransformers
                    });
                    emittedUserTsCount = this.tsProgram.getSourceFiles().length - genTsFiles.length;
                }
            }
            finally {
                // Restore the references back to the augmented value to ensure that the
                // checks that TypeScript makes for project structure reuse will succeed.
                for (const [sourceFile, references] of Array.from(augmentedReferences)) {
                    // TODO(chuckj): Remove any cast after updating build to 2.6
                    sourceFile.referencedFiles = references;
                }
            }
            this.emittedSourceFiles = emittedSourceFiles;
            // Match behavior of tsc: only produce emit diagnostics if it would block
            // emit. If noEmitOnError is false, the emit will happen in spite of any
            // errors, so we should not report them.
            if (this.options.noEmitOnError === true) {
                // translate the diagnostics in the emitResult as well.
                const translatedEmitDiags = translate_diagnostics_1.translateDiagnostics(this.hostAdapter, emitResult.diagnostics);
                emitResult.diagnostics = translatedEmitDiags.ts.concat(this.structuralDiagnostics.concat(translatedEmitDiags.ng).map(util_1.ngToTsDiagnostic));
            }
            if (!outSrcMapping.length) {
                // if no files were emitted by TypeScript, also don't emit .json files
                emitResult.diagnostics =
                    emitResult.diagnostics.concat([util_1.createMessageDiagnostic(`Emitted no files.`)]);
                return emitResult;
            }
            let sampleSrcFileName;
            let sampleOutFileName;
            if (outSrcMapping.length) {
                sampleSrcFileName = outSrcMapping[0].sourceFile.fileName;
                sampleOutFileName = outSrcMapping[0].outFileName;
            }
            const srcToOutPath = createSrcToOutPathMapper(this.options.outDir, sampleSrcFileName, sampleOutFileName);
            if (emitFlags & api_1.EmitFlags.Codegen) {
                genJsonFiles.forEach(gf => {
                    const outFileName = srcToOutPath(gf.genFileUrl);
                    this.writeFile(outFileName, gf.source, false, undefined, gf);
                });
            }
            let metadataJsonCount = 0;
            if (emitFlags & api_1.EmitFlags.Metadata) {
                this.tsProgram.getSourceFiles().forEach(sf => {
                    if (!sf.isDeclarationFile && !util_1.GENERATED_FILES.test(sf.fileName)) {
                        metadataJsonCount++;
                        const metadata = this.metadataCache.getMetadata(sf);
                        if (metadata) {
                            const metadataText = JSON.stringify([metadata]);
                            const outFileName = srcToOutPath(sf.fileName.replace(/\.tsx?$/, '.metadata.json'));
                            this.writeFile(outFileName, metadataText, false, undefined, undefined, [sf]);
                        }
                    }
                });
            }
            const emitEnd = Date.now();
            if (this.options.diagnostics) {
                emitResult.diagnostics = emitResult.diagnostics.concat([util_1.createMessageDiagnostic([
                        `Emitted in ${emitEnd - emitStart}ms`,
                        `- ${emittedUserTsCount} user ts files`,
                        `- ${genTsFiles.length} generated ts files`,
                        `- ${genJsonFiles.length + metadataJsonCount} generated json files`,
                    ].join('\n'))]);
            }
            return emitResult;
        }
        // Private members
        get compiler() {
            if (!this._compiler) {
                this._createCompiler();
            }
            return this._compiler;
        }
        get hostAdapter() {
            if (!this._hostAdapter) {
                this._createCompiler();
            }
            return this._hostAdapter;
        }
        get analyzedModules() {
            if (!this._analyzedModules) {
                this.initSync();
            }
            return this._analyzedModules;
        }
        get structuralDiagnostics() {
            let diagnostics = this._structuralDiagnostics;
            if (!diagnostics) {
                this.initSync();
                diagnostics = (this._structuralDiagnostics = this._structuralDiagnostics || []);
            }
            return diagnostics;
        }
        get tsProgram() {
            if (!this._tsProgram) {
                this.initSync();
            }
            return this._tsProgram;
        }
        get reifiedDecorators() {
            if (!this._reifiedDecorators) {
                const reflector = this.compiler.reflector;
                this._reifiedDecorators = new Set(R3_REIFIED_DECORATORS.map(name => reflector.findDeclaration('@angular/core', name)));
            }
            return this._reifiedDecorators;
        }
        calculateTransforms(genFiles, partialModules, stripDecorators, customTransformers) {
            const beforeTs = [];
            const metadataTransforms = [];
            const flatModuleMetadataTransforms = [];
            if (this.options.enableResourceInlining) {
                beforeTs.push(inline_resources_1.getInlineResourcesTransformFactory(this.tsProgram, this.hostAdapter));
                const transformer = new inline_resources_1.InlineResourcesMetadataTransformer(this.hostAdapter);
                metadataTransforms.push(transformer);
                flatModuleMetadataTransforms.push(transformer);
            }
            if (!this.options.disableExpressionLowering) {
                beforeTs.push(lower_expressions_1.getExpressionLoweringTransformFactory(this.loweringMetadataTransform, this.tsProgram));
                metadataTransforms.push(this.loweringMetadataTransform);
            }
            if (genFiles) {
                beforeTs.push(node_emitter_transform_1.getAngularEmitterTransformFactory(genFiles, this.getTsProgram()));
            }
            if (partialModules) {
                beforeTs.push(r3_transform_1.getAngularClassTransformerFactory(partialModules));
                // If we have partial modules, the cached metadata might be incorrect as it doesn't reflect
                // the partial module transforms.
                const transformer = new r3_metadata_transform_1.PartialModuleMetadataTransformer(partialModules);
                metadataTransforms.push(transformer);
                flatModuleMetadataTransforms.push(transformer);
            }
            if (stripDecorators) {
                beforeTs.push(r3_strip_decorators_1.getDecoratorStripTransformerFactory(stripDecorators, this.compiler.reflector, this.getTsProgram().getTypeChecker()));
                const transformer = new r3_strip_decorators_1.StripDecoratorsMetadataTransformer(stripDecorators, this.compiler.reflector);
                metadataTransforms.push(transformer);
                flatModuleMetadataTransforms.push(transformer);
            }
            if (customTransformers && customTransformers.beforeTs) {
                beforeTs.push(...customTransformers.beforeTs);
            }
            if (metadataTransforms.length > 0) {
                this.metadataCache = this.createMetadataCache(metadataTransforms);
            }
            if (flatModuleMetadataTransforms.length > 0) {
                this.flatModuleMetadataCache = this.createMetadataCache(flatModuleMetadataTransforms);
            }
            const afterTs = customTransformers ? customTransformers.afterTs : undefined;
            return { before: beforeTs, after: afterTs };
        }
        initSync() {
            if (this._analyzedModules) {
                return;
            }
            try {
                const { tmpProgram, sourceFiles, tsFiles, rootNames } = this._createProgramWithBasicStubs();
                const { analyzedModules, analyzedInjectables } = this.compiler.loadFilesSync(sourceFiles, tsFiles);
                this._updateProgramWithTypeCheckStubs(tmpProgram, analyzedModules, analyzedInjectables, rootNames);
            }
            catch (e) {
                this._createProgramOnError(e);
            }
        }
        _createCompiler() {
            const codegen = {
                generateFile: (genFileName, baseFileName) => this._compiler.emitBasicStub(genFileName, baseFileName),
                findGeneratedFileNames: (fileName) => this._compiler.findGeneratedFileNames(fileName),
            };
            this._hostAdapter = new compiler_host_1.TsCompilerAotCompilerTypeCheckHostAdapter(this.rootNames, this.options, this.host, this.metadataCache, codegen, this.oldProgramLibrarySummaries);
            const aotOptions = getAotCompilerOptions(this.options);
            const errorCollector = (this.options.collectAllErrors || this.options.fullTemplateTypeCheck) ?
                (err) => this._addStructuralDiagnostics(err) :
                undefined;
            this._compiler = compiler_1.createAotCompiler(this._hostAdapter, aotOptions, errorCollector).compiler;
        }
        _createProgramWithBasicStubs() {
            if (this._analyzedModules) {
                throw new Error(`Internal Error: already initialized!`);
            }
            // Note: This is important to not produce a memory leak!
            const oldTsProgram = this.oldTsProgram;
            this.oldTsProgram = undefined;
            const codegen = {
                generateFile: (genFileName, baseFileName) => this.compiler.emitBasicStub(genFileName, baseFileName),
                findGeneratedFileNames: (fileName) => this.compiler.findGeneratedFileNames(fileName),
            };
            let rootNames = [...this.rootNames];
            if (this.options.generateCodeForLibraries !== false) {
                // if we should generateCodeForLibraries, never include
                // generated files in the program as otherwise we will
                // overwrite them and typescript will report the error
                // TS5055: Cannot write file ... because it would overwrite input file.
                rootNames = rootNames.filter(fn => !util_1.GENERATED_FILES.test(fn));
            }
            if (this.options.noResolve) {
                this.rootNames.forEach(rootName => {
                    if (this.hostAdapter.shouldGenerateFilesFor(rootName)) {
                        rootNames.push(...this.compiler.findGeneratedFileNames(rootName));
                    }
                });
            }
            const tmpProgram = ts.createProgram(rootNames, this.options, this.hostAdapter, oldTsProgram);
            const sourceFiles = [];
            const tsFiles = [];
            tmpProgram.getSourceFiles().forEach(sf => {
                if (this.hostAdapter.isSourceFile(sf.fileName)) {
                    sourceFiles.push(sf.fileName);
                }
                if (util_1.TS.test(sf.fileName) && !util_1.DTS.test(sf.fileName)) {
                    tsFiles.push(sf.fileName);
                }
            });
            return { tmpProgram, sourceFiles, tsFiles, rootNames };
        }
        _updateProgramWithTypeCheckStubs(tmpProgram, analyzedModules, analyzedInjectables, rootNames) {
            this._analyzedModules = analyzedModules;
            this._analyzedInjectables = analyzedInjectables;
            tmpProgram.getSourceFiles().forEach(sf => {
                if (sf.fileName.endsWith('.ngfactory.ts')) {
                    const { generate, baseFileName } = this.hostAdapter.shouldGenerateFile(sf.fileName);
                    if (generate) {
                        // Note: ! is ok as hostAdapter.shouldGenerateFile will always return a baseFileName
                        // for .ngfactory.ts files.
                        const genFile = this.compiler.emitTypeCheckStub(sf.fileName, baseFileName);
                        if (genFile) {
                            this.hostAdapter.updateGeneratedFile(genFile);
                        }
                    }
                }
            });
            this._tsProgram = ts.createProgram(rootNames, this.options, this.hostAdapter, tmpProgram);
            // Note: the new ts program should be completely reusable by TypeScript as:
            // - we cache all the files in the hostAdapter
            // - new new stubs use the exactly same imports/exports as the old once (we assert that in
            // hostAdapter.updateGeneratedFile).
            if (util_1.tsStructureIsReused(tmpProgram) !== 2 /* Completely */) {
                throw new Error(`Internal Error: The structure of the program changed during codegen.`);
            }
        }
        _createProgramOnError(e) {
            // Still fill the analyzedModules and the tsProgram
            // so that we don't cause other errors for users who e.g. want to emit the ngProgram.
            this._analyzedModules = emptyModules;
            this.oldTsProgram = undefined;
            this._hostAdapter.isSourceFile = () => false;
            this._tsProgram = ts.createProgram(this.rootNames, this.options, this.hostAdapter);
            if (compiler_1.isSyntaxError(e)) {
                this._addStructuralDiagnostics(e);
                return;
            }
            throw e;
        }
        _addStructuralDiagnostics(error) {
            const diagnostics = this._structuralDiagnostics || (this._structuralDiagnostics = []);
            if (compiler_1.isSyntaxError(error)) {
                diagnostics.push(...syntaxErrorToDiagnostics(error));
            }
            else {
                diagnostics.push({
                    messageText: error.toString(),
                    category: ts.DiagnosticCategory.Error,
                    source: api_1.SOURCE,
                    code: api_1.DEFAULT_ERROR_CODE
                });
            }
        }
        // Note: this returns a ts.Diagnostic so that we
        // can return errors in a ts.EmitResult
        generateFilesForEmit(emitFlags) {
            try {
                if (!(emitFlags & api_1.EmitFlags.Codegen)) {
                    return { genFiles: [], genDiags: [] };
                }
                // TODO(tbosch): allow generating files that are not in the rootDir
                // See https://github.com/angular/angular/issues/19337
                let genFiles = this.compiler.emitAllImpls(this.analyzedModules)
                    .filter(genFile => util_1.isInRootDir(genFile.genFileUrl, this.options));
                if (this.oldProgramEmittedGeneratedFiles) {
                    const oldProgramEmittedGeneratedFiles = this.oldProgramEmittedGeneratedFiles;
                    genFiles = genFiles.filter(genFile => {
                        const oldGenFile = oldProgramEmittedGeneratedFiles.get(genFile.genFileUrl);
                        return !oldGenFile || !genFile.isEquivalent(oldGenFile);
                    });
                }
                return { genFiles, genDiags: [] };
            }
            catch (e) {
                // TODO(tbosch): check whether we can actually have syntax errors here,
                // as we already parsed the metadata and templates before to create the type check block.
                if (compiler_1.isSyntaxError(e)) {
                    const genDiags = [{
                            file: undefined,
                            start: undefined,
                            length: undefined,
                            messageText: e.message,
                            category: ts.DiagnosticCategory.Error,
                            source: api_1.SOURCE,
                            code: api_1.DEFAULT_ERROR_CODE
                        }];
                    return { genFiles: [], genDiags };
                }
                throw e;
            }
        }
        /**
         * Returns undefined if all files should be emitted.
         */
        getSourceFilesForEmit() {
            // TODO(tbosch): if one of the files contains a `const enum`
            // always emit all files -> return undefined!
            let sourceFilesToEmit = this.tsProgram.getSourceFiles().filter(sf => { return !sf.isDeclarationFile && !util_1.GENERATED_FILES.test(sf.fileName); });
            if (this.oldProgramEmittedSourceFiles) {
                sourceFilesToEmit = sourceFilesToEmit.filter(sf => {
                    const oldFile = this.oldProgramEmittedSourceFiles.get(sf.fileName);
                    return sf !== oldFile;
                });
            }
            return sourceFilesToEmit;
        }
        writeFile(outFileName, outData, writeByteOrderMark, onError, genFile, sourceFiles) {
            // collect emittedLibrarySummaries
            let baseFile;
            if (genFile) {
                baseFile = this.tsProgram.getSourceFile(genFile.srcFileUrl);
                if (baseFile) {
                    if (!this.emittedLibrarySummaries) {
                        this.emittedLibrarySummaries = [];
                    }
                    if (genFile.genFileUrl.endsWith('.ngsummary.json') && baseFile.fileName.endsWith('.d.ts')) {
                        this.emittedLibrarySummaries.push({
                            fileName: baseFile.fileName,
                            text: baseFile.text,
                            sourceFile: baseFile,
                        });
                        this.emittedLibrarySummaries.push({ fileName: genFile.genFileUrl, text: outData });
                        if (!this.options.declaration) {
                            // If we don't emit declarations, still record an empty .ngfactory.d.ts file,
                            // as we might need it later on for resolving module names from summaries.
                            const ngFactoryDts = genFile.genFileUrl.substring(0, genFile.genFileUrl.length - 15) + '.ngfactory.d.ts';
                            this.emittedLibrarySummaries.push({ fileName: ngFactoryDts, text: '' });
                        }
                    }
                    else if (outFileName.endsWith('.d.ts') && baseFile.fileName.endsWith('.d.ts')) {
                        const dtsSourceFilePath = genFile.genFileUrl.replace(/\.ts$/, '.d.ts');
                        // Note: Don't use sourceFiles here as the created .d.ts has a path in the outDir,
                        // but we need one that is next to the .ts file
                        this.emittedLibrarySummaries.push({ fileName: dtsSourceFilePath, text: outData });
                    }
                }
            }
            // Filter out generated files for which we didn't generate code.
            // This can happen as the stub calculation is not completely exact.
            // Note: sourceFile refers to the .ngfactory.ts / .ngsummary.ts file
            // node_emitter_transform already set the file contents to be empty,
            //  so this code only needs to skip the file if !allowEmptyCodegenFiles.
            const isGenerated = util_1.GENERATED_FILES.test(outFileName);
            if (isGenerated && !this.options.allowEmptyCodegenFiles &&
                (!genFile || !genFile.stmts || genFile.stmts.length === 0)) {
                return;
            }
            if (baseFile) {
                sourceFiles = sourceFiles ? [...sourceFiles, baseFile] : [baseFile];
            }
            // TODO: remove any when TS 2.4 support is removed.
            this.host.writeFile(outFileName, outData, writeByteOrderMark, onError, sourceFiles);
        }
    }
    /**
     * Checks whether a given version ∈ [minVersion, maxVersion[
     * An error will be thrown if the following statements are simultaneously true:
     * - the given version ∉ [minVersion, maxVersion[,
     * - the result of the version check is not meant to be bypassed (the parameter disableVersionCheck
     * is false)
     *
     * @param version The version on which the check will be performed
     * @param minVersion The lower bound version. A valid version needs to be greater than minVersion
     * @param maxVersion The upper bound version. A valid version needs to be strictly less than
     * maxVersion
     * @param disableVersionCheck Indicates whether version check should be bypassed
     *
     * @throws Will throw an error if the following statements are simultaneously true:
     * - the given version ∉ [minVersion, maxVersion[,
     * - the result of the version check is not meant to be bypassed (the parameter disableVersionCheck
     * is false)
     */
    function checkVersion(version, minVersion, maxVersion, disableVersionCheck) {
        if ((typescript_version_1.compareVersions(version, minVersion) < 0 || typescript_version_1.compareVersions(version, maxVersion) >= 0) &&
            !disableVersionCheck) {
            throw new Error(`The Angular Compiler requires TypeScript >=${minVersion} and <${maxVersion} but ${version} was found instead.`);
        }
    }
    exports.checkVersion = checkVersion;
    function createProgram({ rootNames, options, host, oldProgram }) {
        if (options.enableIvy === true) {
            return new program_1.NgtscProgram(rootNames, options, host, oldProgram);
        }
        else if (options.enableIvy === 'tsc') {
            return new tsc_pass_through_1.TscPassThroughProgram(rootNames, options, host, oldProgram);
        }
        return new AngularCompilerProgram(rootNames, options, host, oldProgram);
    }
    exports.createProgram = createProgram;
    // Compute the AotCompiler options
    function getAotCompilerOptions(options) {
        let missingTranslation = compiler_1.core.MissingTranslationStrategy.Warning;
        switch (options.i18nInMissingTranslations) {
            case 'ignore':
                missingTranslation = compiler_1.core.MissingTranslationStrategy.Ignore;
                break;
            case 'error':
                missingTranslation = compiler_1.core.MissingTranslationStrategy.Error;
                break;
        }
        let translations = '';
        if (options.i18nInFile) {
            if (!options.i18nInLocale) {
                throw new Error(`The translation file (${options.i18nInFile}) locale must be provided.`);
            }
            translations = fs.readFileSync(options.i18nInFile, 'utf8');
        }
        else {
            // No translations are provided, ignore any errors
            // We still go through i18n to remove i18n attributes
            missingTranslation = compiler_1.core.MissingTranslationStrategy.Ignore;
        }
        return {
            locale: options.i18nInLocale,
            i18nFormat: options.i18nInFormat || options.i18nOutFormat,
            i18nUseExternalIds: options.i18nUseExternalIds, translations, missingTranslation,
            enableSummariesForJit: options.enableSummariesForJit,
            preserveWhitespaces: options.preserveWhitespaces,
            fullTemplateTypeCheck: options.fullTemplateTypeCheck,
            allowEmptyCodegenFiles: options.allowEmptyCodegenFiles,
            enableIvy: options.enableIvy,
            createExternalSymbolFactoryReexports: options.createExternalSymbolFactoryReexports,
        };
    }
    function getNgOptionDiagnostics(options) {
        if (options.annotationsAs) {
            switch (options.annotationsAs) {
                case 'decorators':
                case 'static fields':
                    break;
                default:
                    return [{
                            messageText: 'Angular compiler options "annotationsAs" only supports "static fields" and "decorators"',
                            category: ts.DiagnosticCategory.Error,
                            source: api_1.SOURCE,
                            code: api_1.DEFAULT_ERROR_CODE
                        }];
            }
        }
        return [];
    }
    function normalizeSeparators(path) {
        return path.replace(/\\/g, '/');
    }
    /**
     * Returns a function that can adjust a path from source path to out path,
     * based on an existing mapping from source to out path.
     *
     * TODO(tbosch): talk to the TypeScript team to expose their logic for calculating the `rootDir`
     * if none was specified.
     *
     * Note: This function works on normalized paths from typescript but should always return
     * POSIX normalized paths for output paths.
     */
    function createSrcToOutPathMapper(outDir, sampleSrcFileName, sampleOutFileName, host = path) {
        if (outDir) {
            let path = {}; // Ensure we error if we use `path` instead of `host`.
            if (sampleSrcFileName == null || sampleOutFileName == null) {
                throw new Error(`Can't calculate the rootDir without a sample srcFileName / outFileName. `);
            }
            const srcFileDir = normalizeSeparators(host.dirname(sampleSrcFileName));
            const outFileDir = normalizeSeparators(host.dirname(sampleOutFileName));
            if (srcFileDir === outFileDir) {
                return (srcFileName) => srcFileName;
            }
            // calculate the common suffix, stopping
            // at `outDir`.
            const srcDirParts = srcFileDir.split('/');
            const outDirParts = normalizeSeparators(host.relative(outDir, outFileDir)).split('/');
            let i = 0;
            while (i < Math.min(srcDirParts.length, outDirParts.length) &&
                srcDirParts[srcDirParts.length - 1 - i] === outDirParts[outDirParts.length - 1 - i])
                i++;
            const rootDir = srcDirParts.slice(0, srcDirParts.length - i).join('/');
            return (srcFileName) => {
                // Note: Before we return the mapped output path, we need to normalize the path delimiters
                // because the output path is usually passed to TypeScript which sometimes only expects
                // posix normalized paths (e.g. if a custom compiler host is used)
                return normalizeSeparators(host.resolve(outDir, host.relative(rootDir, srcFileName)));
            };
        }
        else {
            // Note: Before we return the output path, we need to normalize the path delimiters because
            // the output path is usually passed to TypeScript which only passes around posix
            // normalized paths (e.g. if a custom compiler host is used)
            return (srcFileName) => normalizeSeparators(srcFileName);
        }
    }
    exports.createSrcToOutPathMapper = createSrcToOutPathMapper;
    function i18nExtract(formatName, outFile, host, options, bundle) {
        formatName = formatName || 'xlf';
        // Checks the format and returns the extension
        const ext = i18nGetExtension(formatName);
        const content = i18nSerialize(bundle, formatName, options);
        const dstFile = outFile || `messages.${ext}`;
        const dstPath = path.resolve(options.outDir || options.basePath, dstFile);
        host.writeFile(dstPath, content, false, undefined, []);
        return [dstPath];
    }
    exports.i18nExtract = i18nExtract;
    function i18nSerialize(bundle, formatName, options) {
        const format = formatName.toLowerCase();
        let serializer;
        switch (format) {
            case 'xmb':
                serializer = new compiler_1.Xmb();
                break;
            case 'xliff2':
            case 'xlf2':
                serializer = new compiler_1.Xliff2();
                break;
            case 'xlf':
            case 'xliff':
            default:
                serializer = new compiler_1.Xliff();
        }
        return bundle.write(serializer, getPathNormalizer(options.basePath));
    }
    exports.i18nSerialize = i18nSerialize;
    function getPathNormalizer(basePath) {
        // normalize source paths by removing the base path and always using "/" as a separator
        return (sourcePath) => {
            sourcePath = basePath ? path.relative(basePath, sourcePath) : sourcePath;
            return sourcePath.split(path.sep).join('/');
        };
    }
    function i18nGetExtension(formatName) {
        const format = formatName.toLowerCase();
        switch (format) {
            case 'xmb':
                return 'xmb';
            case 'xlf':
            case 'xlif':
            case 'xliff':
            case 'xlf2':
            case 'xliff2':
                return 'xlf';
        }
        throw new Error(`Unsupported format "${formatName}"`);
    }
    exports.i18nGetExtension = i18nGetExtension;
    function mergeEmitResults(emitResults) {
        const diagnostics = [];
        let emitSkipped = false;
        const emittedFiles = [];
        for (const er of emitResults) {
            diagnostics.push(...er.diagnostics);
            emitSkipped = emitSkipped || er.emitSkipped;
            emittedFiles.push(...(er.emittedFiles || []));
        }
        return { diagnostics, emitSkipped, emittedFiles };
    }
    function diagnosticSourceOfSpan(span) {
        // For diagnostics, TypeScript only uses the fileName and text properties.
        // The redundant '()' are here is to avoid having clang-format breaking the line incorrectly.
        return { fileName: span.start.file.url, text: span.start.file.content };
    }
    function diagnosticSourceOfFileName(fileName, program) {
        const sourceFile = program.getSourceFile(fileName);
        if (sourceFile)
            return sourceFile;
        // If we are reporting diagnostics for a source file that is not in the project then we need
        // to fake a source file so the diagnostic formatting routines can emit the file name.
        // The redundant '()' are here is to avoid having clang-format breaking the line incorrectly.
        return { fileName, text: '' };
    }
    function diagnosticChainFromFormattedDiagnosticChain(chain) {
        return {
            messageText: chain.message,
            next: chain.next && diagnosticChainFromFormattedDiagnosticChain(chain.next),
            position: chain.position
        };
    }
    function syntaxErrorToDiagnostics(error) {
        const parserErrors = compiler_1.getParseErrors(error);
        if (parserErrors && parserErrors.length) {
            return parserErrors.map(e => ({
                messageText: e.contextualMessage(),
                file: diagnosticSourceOfSpan(e.span),
                start: e.span.start.offset,
                length: e.span.end.offset - e.span.start.offset,
                category: ts.DiagnosticCategory.Error,
                source: api_1.SOURCE,
                code: api_1.DEFAULT_ERROR_CODE
            }));
        }
        else if (compiler_1.isFormattedError(error)) {
            return [{
                    messageText: error.message,
                    chain: error.chain && diagnosticChainFromFormattedDiagnosticChain(error.chain),
                    category: ts.DiagnosticCategory.Error,
                    source: api_1.SOURCE,
                    code: api_1.DEFAULT_ERROR_CODE,
                    position: error.position
                }];
        }
        // Produce a Diagnostic anyway since we know for sure `error` is a SyntaxError
        return [{
                messageText: error.message,
                category: ts.DiagnosticCategory.Error,
                code: api_1.DEFAULT_ERROR_CODE,
                source: api_1.SOURCE,
            }];
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL3Byb2dyYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCxnREFBc1o7SUFDdFoseUJBQXlCO0lBQ3pCLDZCQUE2QjtJQUM3QixpQ0FBaUM7SUFFakMsdUdBQXlGO0lBQ3pGLGlHQUFrRTtJQUNsRSx1RUFBcUY7SUFDckYscUVBQThDO0lBRTlDLG9FQUFvUDtJQUNwUCx3RkFBZ0g7SUFDaEgsOEZBQTBHO0lBQzFHLGdHQUFrRztJQUNsRywwRkFBb0U7SUFDcEUsNEZBQWlEO0lBQ2pELDBHQUEyRTtJQUMzRSx3R0FBeUU7SUFDekUsb0dBQThHO0lBQzlHLHNGQUFpRTtJQUNqRSw4RkFBeUQ7SUFDekQsc0VBQTJKO0lBRzNKOzs7T0FHRztJQUNILE1BQU0sbUNBQW1DLEdBQUcsRUFBRSxDQUFDO0lBRy9DOztPQUVHO0lBQ0gsTUFBTSxZQUFZLEdBQUcsQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFFOUU7O09BRUc7SUFDSCxNQUFNLGVBQWUsR0FBRyxDQUFDLEdBQUcsWUFBWSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFFN0UsTUFBTSxxQkFBcUIsR0FBRztRQUM1QixXQUFXO1FBQ1gsV0FBVztRQUNYLFlBQVk7UUFDWixVQUFVO1FBQ1YsTUFBTTtLQUNQLENBQUM7SUFFRixNQUFNLFlBQVksR0FBc0I7UUFDdEMsU0FBUyxFQUFFLEVBQUU7UUFDYix5QkFBeUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtRQUNwQyxLQUFLLEVBQUUsRUFBRTtLQUNWLENBQUM7SUFFRixNQUFNLG1CQUFtQixHQUNyQixDQUFDLEVBQUMsT0FBTyxFQUFFLGdC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QUM5RSxPQUFPLENBQUM7Z0JBQ04sV0FBVyxFQUFFLEtBQUssQ0FBQyxPQUFPO2dCQUMxQixRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUs7Z0JBQ3JDLElBQUksRUFBRSx3QkFBa0I7Z0JBQ3hCLE1BQU0sRUFBRSxZQUFNO2FBQ2YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FvdENvbXBpbGVyLCBBb3RDb21waWxlckhvc3QsIEFvdENvbXBpbGVyT3B0aW9ucywgRW1pdHRlclZpc2l0b3JDb250ZXh0LCBGb3JtYXR0ZWRNZXNzYWdlQ2hhaW4sIEdlbmVyYXRlZEZpbGUsIE1lc3NhZ2VCdW5kbGUsIE5nQW5hbHl6ZWRGaWxlLCBOZ0FuYWx5emVkRmlsZVdpdGhJbmplY3RhYmxlcywgTmdBbmFseXplZE1vZHVsZXMsIFBhcnNlU291cmNlU3BhbiwgUGFydGlhbE1vZHVsZSwgUG9zaXRpb24sIFNlcmlhbGl6ZXIsIFN0YXRpY1N5bWJvbCwgVHlwZVNjcmlwdEVtaXR0ZXIsIFhsaWZmLCBYbGlmZjIsIFhtYiwgY29yZSwgY3JlYXRlQW90Q29tcGlsZXIsIGdldFBhcnNlRXJyb3JzLCBpc0Zvcm1hdHRlZEVycm9yLCBpc1N5bnRheEVycm9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7VHlwZUNoZWNrSG9zdCwgdHJhbnNsYXRlRGlhZ25vc3RpY3N9IGZyb20gJy4uL2RpYWdub3N0aWNzL3RyYW5zbGF0ZV9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2NvbXBhcmVWZXJzaW9uc30gZnJvbSAnLi4vZGlhZ25vc3RpY3MvdHlwZXNjcmlwdF92ZXJzaW9uJztcbmltcG9ydCB7TWV0YWRhdGFDb2xsZWN0b3IsIE1vZHVsZU1ldGFkYXRhLCBjcmVhdGVCdW5kbGVJbmRleEhvc3R9IGZyb20gJy4uL21ldGFkYXRhJztcbmltcG9ydCB7Tmd0c2NQcm9ncmFtfSBmcm9tICcuLi9uZ3RzYy9wcm9ncmFtJztcblxuaW1wb3J0IHtDb21waWxlckhvc3QsIENvbXBpbGVyT3B0aW9ucywgQ3VzdG9tVHJhbnNmb3JtZXJzLCBERUZBVUxUX0VSUk9SX0NPREUsIERpYWdub3N0aWMsIERpYWdub3N0aWNNZXNzYWdlQ2hhaW4sIEVtaXRGbGFncywgTGF6eVJvdXRlLCBMaWJyYXJ5U3VtbWFyeSwgUHJvZ3JhbSwgU09VUkNFLCBUc0VtaXRBcmd1bWVudHMsIFRzRW1pdENhbGxiYWNrLCBUc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFja30gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtDb2RlR2VuZXJhdG9yLCBUc0NvbXBpbGVyQW90Q29tcGlsZXJUeXBlQ2hlY2tIb3N0QWRhcHRlciwgZ2V0T3JpZ2luYWxSZWZlcmVuY2VzfSBmcm9tICcuL2NvbXBpbGVyX2hvc3QnO1xuaW1wb3J0IHtJbmxpbmVSZXNvdXJjZXNNZXRhZGF0YVRyYW5zZm9ybWVyLCBnZXRJbmxpbmVSZXNvdXJjZXNUcmFuc2Zvcm1GYWN0b3J5fSBmcm9tICcuL2lubGluZV9yZXNvdXJjZXMnO1xuaW1wb3J0IHtMb3dlck1ldGFkYXRhVHJhbnNmb3JtLCBnZXRFeHByZXNzaW9uTG93ZXJpbmdUcmFuc2Zvcm1GYWN0b3J5fSBmcm9tICcuL2xvd2VyX2V4cHJlc3Npb25zJztcbmltcG9ydCB7TWV0YWRhdGFDYWNoZSwgTWV0YWRhdGFUcmFuc2Zvcm1lcn0gZnJvbSAnLi9tZXRhZGF0YV9jYWNoZSc7XG5pbXBvcnQge25vY29sbGFwc2VIYWNrfSBmcm9tICcuL25vY29sbGFwc2VfaGFjayc7XG5pbXBvcnQge2dldEFuZ3VsYXJFbWl0dGVyVHJhbnNmb3JtRmFjdG9yeX0gZnJvbSAnLi9ub2RlX2VtaXR0ZXJfdHJhbnNmb3JtJztcbmltcG9ydCB7UGFydGlhbE1vZHVsZU1ldGFkYXRhVHJhbnNmb3JtZXJ9IGZyb20gJy4vcjNfbWV0YWRhdGFfdHJhbnNmb3JtJztcbmltcG9ydCB7U3RyaXBEZWNvcmF0b3JzTWV0YWRhdGFUcmFuc2Zvcm1lciwgZ2V0RGVjb3JhdG9yU3RyaXBUcmFuc2Zvcm1lckZhY3Rvcnl9IGZyb20gJy4vcjNfc3RyaXBfZGVjb3JhdG9ycyc7XG5pbXBvcnQge2dldEFuZ3VsYXJDbGFzc1RyYW5zZm9ybWVyRmFjdG9yeX0gZnJvbSAnLi9yM190cmFuc2Zvcm0nO1xuaW1wb3J0IHtUc2NQYXNzVGhyb3VnaFByb2dyYW19IGZyb20gJy4vdHNjX3Bhc3NfdGhyb3VnaCc7XG5pbXBvcnQge0RUUywgR0VORVJBVEVEX0ZJTEVTLCBTdHJ1Y3R1cmVJc1JldXNlZCwgVFMsIGNyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljLCBpc0luUm9vdERpciwgbmdUb1RzRGlhZ25vc3RpYywgdHNTdHJ1Y3R1cmVJc1JldXNlZCwgdXNlckVycm9yfSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogTWF4aW11bSBudW1iZXIgb2YgZmlsZXMgdGhhdCBhcmUgZW1pdGFibGUgdmlhIGNhbGxpbmcgdHMuUHJvZ3JhbS5lbWl0XG4gKiBwYXNzaW5nIGluZGl2aWR1YWwgdGFyZ2V0U291cmNlRmlsZXMuXG4gKi9cbmNvbnN0IE1BWF9GSUxFX0NPVU5UX0ZPUl9TSU5HTEVfRklMRV9FTUlUID0gMjA7XG5cblxuLyoqXG4gKiBGaWVsZHMgdG8gbG93ZXIgd2l0aGluIG1ldGFkYXRhIGluIHJlbmRlcjIgbW9kZS5cbiAqL1xuY29uc3QgTE9XRVJfRklFTERTID0gWyd1c2VWYWx1ZScsICd1c2VGYWN0b3J5JywgJ2RhdGEnLCAnaWQnLCAnbG9hZENoaWxkcmVuJ107XG5cbi8qKlxuICogRmllbGRzIHRvIGxvd2VyIHdpdGhpbiBtZXRhZGF0YSBpbiByZW5kZXIzIG1vZGUuXG4gKi9cbmNvbnN0IFIzX0xPV0VSX0ZJRUxEUyA9IFsuLi5MT1dFUl9GSUVMRFMsICdwcm92aWRlcnMnLCAnaW1wb3J0cycsICdleHBvcnRzJ107XG5cbmNvbnN0IFIzX1JFSUZJRURfREVDT1JBVE9SUyA9IFtcbiAgJ0NvbXBvbmVudCcsXG4gICdEaXJlY3RpdmUnLFxuICAnSW5qZWN0YWJsZScsXG4gICdOZ01vZHVsZScsXG4gICdQaXBlJyxcbl07XG5cbmNvbnN0IGVtcHR5TW9kdWxlczogTmdBbmFseXplZE1vZHVsZXMgPSB7XG4gIG5nTW9kdWxlczogW10sXG4gIG5nTW9kdWxlQnlQaXBlT3JEaXJlY3RpdmU6IG5ldyBNYXAoKSxcbiAgZmlsZXM6IFtdXG59O1xuXG5jb25zdCBkZWZhdWx0RW1pdENhbGxiYWNrOiBUc0VtaXRDYWxsYmFjayA9XG4gICAgKHtwcm9ncmFtLCB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzfSkgPT5cbiAgICAgICAgcHJvZ3JhbS5lbWl0KFxuICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcywgY3VzdG9tVHJhbnNmb3JtZXJzKTtcblxuLyoqXG4gKiBNaW5pbXVtIHN1cHBvcnRlZCBUeXBlU2NyaXB0IHZlcnNpb25cbiAqIOKIgCBzdXBwb3J0ZWQgdHlwZXNjcmlwdCB2ZXJzaW9uIHYsIHYgPj0gTUlOX1RTX1ZFUlNJT05cbiAqL1xuY29uc3QgTUlOX1RTX1ZFUlNJT04gPSAnMy4xLjEnO1xuXG4vKipcbiAqIFN1cHJlbXVtIG9mIHN1cHBvcnRlZCBUeXBlU2NyaXB0IHZlcnNpb25zXG4gKiDiiIAgc3VwcG9ydGVkIHR5cGVzY3JpcHQgdmVyc2lvbiB2LCB2IDwgTUFYX1RTX1ZFUlNJT05cbiAqIE1BWF9UU19WRVJTSU9OIGlzIG5vdCBjb25zaWRlcmVkIGFzIGEgc3VwcG9ydGVkIFR5cGVTY3JpcHQgdmVyc2lvblxuICovXG5jb25zdCBNQVhfVFNfVkVSU0lPTiA9ICczLjMuMCc7XG5cbmNsYXNzIEFuZ3VsYXJDb21waWxlclByb2dyYW0gaW1wbGVtZW50cyBQcm9ncmFtIHtcbiAgcHJpdmF0ZSByb290TmFtZXM6IHN0cmluZ1tdO1xuICBwcml2YXRlIG1ldGFkYXRhQ2FjaGU6IE1ldGFkYXRhQ2FjaGU7XG4gIC8vIE1ldGFkYXRhIGNhY2hlIHVzZWQgZXhjbHVzaXZlbHkgZm9yIHRoZSBmbGF0IG1vZHVsZSBpbmRleFxuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBmbGF0TW9kdWxlTWV0YWRhdGFDYWNoZSAhOiBNZXRhZGF0YUNhY2hlO1xuICBwcml2YXRlIGxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm06IExvd2VyTWV0YWRhdGFUcmFuc2Zvcm07XG4gIHByaXZhdGUgb2xkUHJvZ3JhbUxpYnJhcnlTdW1tYXJpZXM6IE1hcDxzdHJpbmcsIExpYnJhcnlTdW1tYXJ5Pnx1bmRlZmluZWQ7XG4gIHByaXZhdGUgb2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlczogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT58dW5kZWZpbmVkO1xuICBwcml2YXRlIG9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXM6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+fHVuZGVmaW5lZDtcbiAgLy8gTm90ZTogVGhpcyB3aWxsIGJlIGNsZWFyZWQgb3V0IGFzIHNvb24gYXMgd2UgY3JlYXRlIHRoZSBfdHNQcm9ncmFtXG4gIHByaXZhdGUgb2xkVHNQcm9ncmFtOiB0cy5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBlbWl0dGVkTGlicmFyeVN1bW1hcmllczogTGlicmFyeVN1bW1hcnlbXXx1bmRlZmluZWQ7XG4gIHByaXZhdGUgZW1pdHRlZEdlbmVyYXRlZEZpbGVzOiBHZW5lcmF0ZWRGaWxlW118dW5kZWZpbmVkO1xuICBwcml2YXRlIGVtaXR0ZWRTb3VyY2VGaWxlczogdHMuU291cmNlRmlsZVtdfHVuZGVmaW5lZDtcblxuICAvLyBMYXppbHkgaW5pdGlhbGl6ZWQgZmllbGRzXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIF9jb21waWxlciAhOiBBb3RDb21waWxlcjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX2hvc3RBZGFwdGVyICE6IFRzQ29tcGlsZXJBb3RDb21waWxlclR5cGVDaGVja0hvc3RBZGFwdGVyO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBfdHNQcm9ncmFtICE6IHRzLlByb2dyYW07XG4gIHByaXZhdGUgX2FuYWx5emVkTW9kdWxlczogTmdBbmFseXplZE1vZHVsZXN8dW5kZWZpbmVkO1xuICBwcml2YXRlIF9hbmFseXplZEluamVjdGFibGVzOiBOZ0FuYWx5emVkRmlsZVdpdGhJbmplY3RhYmxlc1tdfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfc3RydWN0dXJhbERpYWdub3N0aWNzOiBEaWFnbm9zdGljW118dW5kZWZpbmVkO1xuICBwcml2YXRlIF9wcm9ncmFtV2l0aFN0dWJzOiB0cy5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfb3B0aW9uc0RpYWdub3N0aWNzOiBEaWFnbm9zdGljW10gPSBbXTtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX3JlaWZpZWREZWNvcmF0b3JzICE6IFNldDxTdGF0aWNTeW1ib2w+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcm9vdE5hbWVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sIHByaXZhdGUgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBob3N0OiBDb21waWxlckhvc3QsIG9sZFByb2dyYW0/OiBQcm9ncmFtKSB7XG4gICAgdGhpcy5yb290TmFtZXMgPSBbLi4ucm9vdE5hbWVzXTtcblxuICAgIGNoZWNrVmVyc2lvbih0cy52ZXJzaW9uLCBNSU5fVFNfVkVSU0lPTiwgTUFYX1RTX1ZFUlNJT04sIG9wdGlvbnMuZGlzYWJsZVR5cGVTY3JpcHRWZXJzaW9uQ2hlY2spO1xuXG4gICAgdGhpcy5vbGRUc1Byb2dyYW0gPSBvbGRQcm9ncmFtID8gb2xkUHJvZ3JhbS5nZXRUc1Byb2dyYW0oKSA6IHVuZGVmaW5lZDtcbiAgICBpZiAob2xkUHJvZ3JhbSkge1xuICAgICAgdGhpcy5vbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllcyA9IG9sZFByb2dyYW0uZ2V0TGlicmFyeVN1bW1hcmllcygpO1xuICAgICAgdGhpcy5vbGRQcm9ncmFtRW1pdHRlZEdlbmVyYXRlZEZpbGVzID0gb2xkUHJvZ3JhbS5nZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlcyA9IG9sZFByb2dyYW0uZ2V0RW1pdHRlZFNvdXJjZUZpbGVzKCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZmxhdE1vZHVsZU91dEZpbGUpIHtcbiAgICAgIGNvbnN0IHtob3N0OiBidW5kbGVIb3N0LCBpbmRleE5hbWUsIGVycm9yc30gPVxuICAgICAgICAgIGNyZWF0ZUJ1bmRsZUluZGV4SG9zdChvcHRpb25zLCB0aGlzLnJvb3ROYW1lcywgaG9zdCwgKCkgPT4gdGhpcy5mbGF0TW9kdWxlTWV0YWRhdGFDYWNoZSk7XG4gICAgICBpZiAoZXJyb3JzKSB7XG4gICAgICAgIHRoaXMuX29wdGlvbnNEaWFnbm9zdGljcy5wdXNoKC4uLmVycm9ycy5tYXAoZSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlVGV4dDogZS5tZXNzYWdlVGV4dCBhcyBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJvb3ROYW1lcy5wdXNoKGluZGV4TmFtZSAhKTtcbiAgICAgICAgdGhpcy5ob3N0ID0gYnVuZGxlSG9zdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm0gPVxuICAgICAgICBuZXcgTG93ZXJNZXRhZGF0YVRyYW5zZm9ybShvcHRpb25zLmVuYWJsZUl2eSA/IFIzX0xPV0VSX0ZJRUxEUyA6IExPV0VSX0ZJRUxEUyk7XG4gICAgdGhpcy5tZXRhZGF0YUNhY2hlID0gdGhpcy5jcmVhdGVNZXRhZGF0YUNhY2hlKFt0aGlzLmxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm1dKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlTWV0YWRhdGFDYWNoZSh0cmFuc2Zvcm1lcnM6IE1ldGFkYXRhVHJhbnNmb3JtZXJbXSkge1xuICAgIHJldHVybiBuZXcgTWV0YWRhdGFDYWNoZShcbiAgICAgICAgbmV3IE1ldGFkYXRhQ29sbGVjdG9yKHtxdW90ZWROYW1lczogdHJ1ZX0pLCAhIXRoaXMub3B0aW9ucy5zdHJpY3RNZXRhZGF0YUVtaXQsXG4gICAgICAgIHRyYW5zZm9ybWVycyk7XG4gIH1cblxuICBnZXRMaWJyYXJ5U3VtbWFyaWVzKCk6IE1hcDxzdHJpbmcsIExpYnJhcnlTdW1tYXJ5PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcDxzdHJpbmcsIExpYnJhcnlTdW1tYXJ5PigpO1xuICAgIGlmICh0aGlzLm9sZFByb2dyYW1MaWJyYXJ5U3VtbWFyaWVzKSB7XG4gICAgICB0aGlzLm9sZFByb2dyYW1MaWJyYXJ5U3VtbWFyaWVzLmZvckVhY2goKHN1bW1hcnksIGZpbGVOYW1lKSA9PiByZXN1bHQuc2V0KGZpbGVOYW1lLCBzdW1tYXJ5KSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzKSB7XG4gICAgICB0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzLmZvckVhY2goXG4gICAgICAgICAgKHN1bW1hcnksIGZpbGVOYW1lKSA9PiByZXN1bHQuc2V0KHN1bW1hcnkuZmlsZU5hbWUsIHN1bW1hcnkpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldEVtaXR0ZWRHZW5lcmF0ZWRGaWxlcygpOiBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcDxzdHJpbmcsIEdlbmVyYXRlZEZpbGU+KCk7XG4gICAgaWYgKHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcykge1xuICAgICAgdGhpcy5vbGRQcm9ncmFtRW1pdHRlZEdlbmVyYXRlZEZpbGVzLmZvckVhY2goXG4gICAgICAgICAgKGdlbkZpbGUsIGZpbGVOYW1lKSA9PiByZXN1bHQuc2V0KGZpbGVOYW1lLCBnZW5GaWxlKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmVtaXR0ZWRHZW5lcmF0ZWRGaWxlcykge1xuICAgICAgdGhpcy5lbWl0dGVkR2VuZXJhdGVkRmlsZXMuZm9yRWFjaCgoZ2VuRmlsZSkgPT4gcmVzdWx0LnNldChnZW5GaWxlLmdlbkZpbGVVcmwsIGdlbkZpbGUpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldEVtaXR0ZWRTb3VyY2VGaWxlcygpOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+KCk7XG4gICAgaWYgKHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlcykge1xuICAgICAgdGhpcy5vbGRQcm9ncmFtRW1pdHRlZFNvdXJjZUZpbGVzLmZvckVhY2goKHNmLCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChmaWxlTmFtZSwgc2YpKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZW1pdHRlZFNvdXJjZUZpbGVzKSB7XG4gICAgICB0aGlzLmVtaXR0ZWRTb3VyY2VGaWxlcy5mb3JFYWNoKChzZikgPT4gcmVzdWx0LnNldChzZi5maWxlTmFtZSwgc2YpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldFRzUHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHsgcmV0dXJuIHRoaXMudHNQcm9ncmFtOyB9XG5cbiAgZ2V0VHNPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKSB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldE9wdGlvbnNEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gWy4uLnRoaXMuX29wdGlvbnNEaWFnbm9zdGljcywgLi4uZ2V0TmdPcHRpb25EaWFnbm9zdGljcyh0aGlzLm9wdGlvbnMpXTtcbiAgfVxuXG4gIGdldFRzU3ludGFjdGljRGlhZ25vc3RpY3Moc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuKTtcbiAgfVxuXG4gIGdldE5nU3RydWN0dXJhbERpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy5zdHJ1Y3R1cmFsRGlhZ25vc3RpY3M7XG4gIH1cblxuICBnZXRUc1NlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgY29uc3Qgc291cmNlRmlsZXMgPSBzb3VyY2VGaWxlID8gW3NvdXJjZUZpbGVdIDogdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKTtcbiAgICBsZXQgZGlhZ3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIHNvdXJjZUZpbGVzLmZvckVhY2goc2YgPT4ge1xuICAgICAgaWYgKCFHRU5FUkFURURfRklMRVMudGVzdChzZi5maWxlTmFtZSkpIHtcbiAgICAgICAgZGlhZ3MucHVzaCguLi50aGlzLnRzUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNmLCBjYW5jZWxsYXRpb25Ub2tlbikpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBkaWFncztcbiAgfVxuXG4gIGdldE5nU2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZT86IHN0cmluZywgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbik6XG4gICAgICBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICBsZXQgZGlhZ3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzZiA9PiB7XG4gICAgICBpZiAoR0VORVJBVEVEX0ZJTEVTLnRlc3Qoc2YuZmlsZU5hbWUpICYmICFzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICBkaWFncy5wdXNoKC4uLnRoaXMudHNQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc2YsIGNhbmNlbGxhdGlvblRva2VuKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY29uc3Qge25nfSA9IHRyYW5zbGF0ZURpYWdub3N0aWNzKHRoaXMuaG9zdEFkYXB0ZXIsIGRpYWdzKTtcbiAgICByZXR1cm4gbmc7XG4gIH1cblxuICBsb2FkTmdTdHJ1Y3R1cmVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5fYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FuZ3VsYXIgc3RydWN0dXJlIGFscmVhZHkgbG9hZGVkJyk7XG4gICAgfVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgY29uc3Qge3RtcFByb2dyYW0sIHNvdXJjZUZpbGVzLCB0c0ZpbGVzLCByb290TmFtZXN9ID0gdGhpcy5fY3JlYXRlUHJvZ3JhbVdpdGhCYXNpY1N0dWJzKCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZXIubG9hZEZpbGVzQXN5bmMoc291cmNlRmlsZXMsIHRzRmlsZXMpXG4gICAgICAgICAgICAgIC50aGVuKCh7YW5hbHl6ZWRNb2R1bGVzLCBhbmFseXplZEluamVjdGFibGVzfSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9hbmFseXplZE1vZHVsZXMpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQW5ndWxhciBzdHJ1Y3R1cmUgbG9hZGVkIGJvdGggc3luY2hyb25vdXNseSBhbmQgYXN5bmNocm9ub3VzbHknKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlUHJvZ3JhbVdpdGhUeXBlQ2hlY2tTdHVicyhcbiAgICAgICAgICAgICAgICAgICAgdG1wUHJvZ3JhbSwgYW5hbHl6ZWRNb2R1bGVzLCBhbmFseXplZEluamVjdGFibGVzLCByb290TmFtZXMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGUgPT4gdGhpcy5fY3JlYXRlUHJvZ3JhbU9uRXJyb3IoZSkpO1xuICB9XG5cbiAgbGlzdExhenlSb3V0ZXMocm91dGU/OiBzdHJpbmcpOiBMYXp5Um91dGVbXSB7XG4gICAgLy8gTm90ZTogRG9uJ3QgYW5hbHl6ZWRNb2R1bGVzIGlmIGEgcm91dGUgaXMgZ2l2ZW5cbiAgICAvLyB0byBiZSBmYXN0IGVub3VnaC5cbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5saXN0TGF6eVJvdXRlcyhyb3V0ZSwgcm91dGUgPyB1bmRlZmluZWQgOiB0aGlzLmFuYWx5emVkTW9kdWxlcyk7XG4gIH1cblxuICBlbWl0KHBhcmFtZXRlcnM6IHtcbiAgICBlbWl0RmxhZ3M/OiBFbWl0RmxhZ3MsXG4gICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbixcbiAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgZW1pdENhbGxiYWNrPzogVHNFbWl0Q2FsbGJhY2ssXG4gICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2ssXG4gIH0gPSB7fSk6IHRzLkVtaXRSZXN1bHQge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZW5hYmxlSXZ5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBydW4gbGVnYWN5IGNvbXBpbGVyIGluIG5ndHNjIG1vZGUnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2VtaXRSZW5kZXIyKHBhcmFtZXRlcnMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZW1pdFJlbmRlcjMoXG4gICAgICB7XG4gICAgICAgICAgZW1pdEZsYWdzID0gRW1pdEZsYWdzLkRlZmF1bHQsIGNhbmNlbGxhdGlvblRva2VuLCBjdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgICAgICAgZW1pdENhbGxiYWNrID0gZGVmYXVsdEVtaXRDYWxsYmFjaywgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrID0gbWVyZ2VFbWl0UmVzdWx0cyxcbiAgICAgIH06IHtcbiAgICAgICAgZW1pdEZsYWdzPzogRW1pdEZsYWdzLFxuICAgICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuLFxuICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgICAgIGVtaXRDYWxsYmFjaz86IFRzRW1pdENhbGxiYWNrLFxuICAgICAgICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2s/OiBUc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayxcbiAgICAgIH0gPSB7fSk6IHRzLkVtaXRSZXN1bHQge1xuICAgIGNvbnN0IGVtaXRTdGFydCA9IERhdGUubm93KCk7XG4gICAgaWYgKChlbWl0RmxhZ3MgJiAoRW1pdEZsYWdzLkpTIHwgRW1pdEZsYWdzLkRUUyB8IEVtaXRGbGFncy5NZXRhZGF0YSB8IEVtaXRGbGFncy5Db2RlZ2VuKSkgPT09XG4gICAgICAgIDApIHtcbiAgICAgIHJldHVybiB7ZW1pdFNraXBwZWQ6IHRydWUsIGRpYWdub3N0aWNzOiBbXSwgZW1pdHRlZEZpbGVzOiBbXX07XG4gICAgfVxuXG4gICAgLy8gYW5hbHl6ZWRNb2R1bGVzIGFuZCBhbmFseXplZEluamVjdGFibGVzIGFyZSBjcmVhdGVkIHRvZ2V0aGVyLiBJZiBvbmUgZXhpc3RzLCBzbyBkb2VzIHRoZVxuICAgIC8vIG90aGVyLlxuICAgIGNvbnN0IG1vZHVsZXMgPVxuICAgICAgICB0aGlzLmNvbXBpbGVyLmVtaXRBbGxQYXJ0aWFsTW9kdWxlcyh0aGlzLmFuYWx5emVkTW9kdWxlcywgdGhpcy5fYW5hbHl6ZWRJbmplY3RhYmxlcyAhKTtcblxuICAgIGNvbnN0IHdyaXRlVHNGaWxlOiB0cy5Xcml0ZUZpbGVDYWxsYmFjayA9XG4gICAgICAgIChvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yPywgc291cmNlRmlsZXM/KSA9PiB7XG4gICAgICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHNvdXJjZUZpbGVzICYmIHNvdXJjZUZpbGVzLmxlbmd0aCA9PSAxID8gc291cmNlRmlsZXNbMF0gOiBudWxsO1xuICAgICAgICAgIGxldCBnZW5GaWxlOiBHZW5lcmF0ZWRGaWxlfHVuZGVmaW5lZDtcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyICYmIHNvdXJjZUZpbGUgJiZcbiAgICAgICAgICAgICAgVFMudGVzdChzb3VyY2VGaWxlLmZpbGVOYW1lKSkge1xuICAgICAgICAgICAgb3V0RGF0YSA9IG5vY29sbGFwc2VIYWNrKG91dERhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLndyaXRlRmlsZShvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCB1bmRlZmluZWQsIHNvdXJjZUZpbGVzKTtcbiAgICAgICAgfTtcblxuICAgIGNvbnN0IGVtaXRPbmx5RHRzRmlsZXMgPSAoZW1pdEZsYWdzICYgKEVtaXRGbGFncy5EVFMgfCBFbWl0RmxhZ3MuSlMpKSA9PSBFbWl0RmxhZ3MuRFRTO1xuXG4gICAgY29uc3QgdHNDdXN0b21UcmFuc2Zvcm1lcnMgPSB0aGlzLmNhbGN1bGF0ZVRyYW5zZm9ybXMoXG4gICAgICAgIC8qIGdlbkZpbGVzICovIHVuZGVmaW5lZCwgLyogcGFydGlhbE1vZHVsZXMgKi8gbW9kdWxlcyxcbiAgICAgICAgLyogc3RyaXBEZWNvcmF0b3JzICovIHRoaXMucmVpZmllZERlY29yYXRvcnMsIGN1c3RvbVRyYW5zZm9ybWVycyk7XG5cblxuICAgIC8vIFJlc3RvcmUgdGhlIG9yaWdpbmFsIHJlZmVyZW5jZXMgYmVmb3JlIHdlIGVtaXQgc28gVHlwZVNjcmlwdCBkb2Vzbid0IGVtaXRcbiAgICAvLyBhIHJlZmVyZW5jZSB0byB0aGUgLmQudHMgZmlsZS5cbiAgICBjb25zdCBhdWdtZW50ZWRSZWZlcmVuY2VzID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBSZWFkb25seUFycmF5PHRzLkZpbGVSZWZlcmVuY2U+PigpO1xuICAgIGZvciAoY29uc3Qgc291cmNlRmlsZSBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBjb25zdCBvcmlnaW5hbFJlZmVyZW5jZXMgPSBnZXRPcmlnaW5hbFJlZmVyZW5jZXMoc291cmNlRmlsZSk7XG4gICAgICBpZiAob3JpZ2luYWxSZWZlcmVuY2VzKSB7XG4gICAgICAgIGF1Z21lbnRlZFJlZmVyZW5jZXMuc2V0KHNvdXJjZUZpbGUsIHNvdXJjZUZpbGUucmVmZXJlbmNlZEZpbGVzKTtcbiAgICAgICAgc291cmNlRmlsZS5yZWZlcmVuY2VkRmlsZXMgPSBvcmlnaW5hbFJlZmVyZW5jZXM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBlbWl0Q2FsbGJhY2soe1xuICAgICAgICBwcm9ncmFtOiB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgICAgaG9zdDogdGhpcy5ob3N0LFxuICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgIHdyaXRlRmlsZTogd3JpdGVUc0ZpbGUsIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICAgIGN1c3RvbVRyYW5zZm9ybWVyczogdHNDdXN0b21UcmFuc2Zvcm1lcnNcbiAgICAgIH0pO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAvLyBSZXN0b3JlIHRoZSByZWZlcmVuY2VzIGJhY2sgdG8gdGhlIGF1Z21lbnRlZCB2YWx1ZSB0byBlbnN1cmUgdGhhdCB0aGVcbiAgICAgIC8vIGNoZWNrcyB0aGF0IFR5cGVTY3JpcHQgbWFrZXMgZm9yIHByb2plY3Qgc3RydWN0dXJlIHJldXNlIHdpbGwgc3VjY2VlZC5cbiAgICAgIGZvciAoY29uc3QgW3NvdXJjZUZpbGUsIHJlZmVyZW5jZXNdIG9mIEFycmF5LmZyb20oYXVnbWVudGVkUmVmZXJlbmNlcykpIHtcbiAgICAgICAgLy8gVE9ETyhjaHVja2opOiBSZW1vdmUgYW55IGNhc3QgYWZ0ZXIgdXBkYXRpbmcgYnVpbGQgdG8gMi42XG4gICAgICAgIChzb3VyY2VGaWxlIGFzIGFueSkucmVmZXJlbmNlZEZpbGVzID0gcmVmZXJlbmNlcztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9lbWl0UmVuZGVyMihcbiAgICAgIHtcbiAgICAgICAgICBlbWl0RmxhZ3MgPSBFbWl0RmxhZ3MuRGVmYXVsdCwgY2FuY2VsbGF0aW9uVG9rZW4sIGN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICAgICAgICBlbWl0Q2FsbGJhY2sgPSBkZWZhdWx0RW1pdENhbGxiYWNrLCBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2sgPSBtZXJnZUVtaXRSZXN1bHRzLFxuICAgICAgfToge1xuICAgICAgICBlbWl0RmxhZ3M/OiBFbWl0RmxhZ3MsXG4gICAgICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgICAgIGN1c3RvbVRyYW5zZm9ybWVycz86IEN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICAgICAgZW1pdENhbGxiYWNrPzogVHNFbWl0Q2FsbGJhY2ssXG4gICAgICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IFRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLFxuICAgICAgfSA9IHt9KTogdHMuRW1pdFJlc3VsdCB7XG4gICAgY29uc3QgZW1pdFN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICBpZiAoZW1pdEZsYWdzICYgRW1pdEZsYWdzLkkxOG5CdW5kbGUpIHtcbiAgICAgIGNvbnN0IGxvY2FsZSA9IHRoaXMub3B0aW9ucy5pMThuT3V0TG9jYWxlIHx8IG51bGw7XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy5vcHRpb25zLmkxOG5PdXRGaWxlIHx8IG51bGw7XG4gICAgICBjb25zdCBmb3JtYXQgPSB0aGlzLm9wdGlvbnMuaTE4bk91dEZvcm1hdCB8fCBudWxsO1xuICAgICAgY29uc3QgYnVuZGxlID0gdGhpcy5jb21waWxlci5lbWl0TWVzc2FnZUJ1bmRsZSh0aGlzLmFuYWx5emVkTW9kdWxlcywgbG9jYWxlKTtcbiAgICAgIGkxOG5FeHRyYWN0KGZvcm1hdCwgZmlsZSwgdGhpcy5ob3N0LCB0aGlzLm9wdGlvbnMsIGJ1bmRsZSk7XG4gICAgfVxuICAgIGlmICgoZW1pdEZsYWdzICYgKEVtaXRGbGFncy5KUyB8IEVtaXRGbGFncy5EVFMgfCBFbWl0RmxhZ3MuTWV0YWRhdGEgfCBFbWl0RmxhZ3MuQ29kZWdlbikpID09PVxuICAgICAgICAwKSB7XG4gICAgICByZXR1cm4ge2VtaXRTa2lwcGVkOiB0cnVlLCBkaWFnbm9zdGljczogW10sIGVtaXR0ZWRGaWxlczogW119O1xuICAgIH1cbiAgICBsZXQge2dlbkZpbGVzLCBnZW5EaWFnc30gPSB0aGlzLmdlbmVyYXRlRmlsZXNGb3JFbWl0KGVtaXRGbGFncyk7XG4gICAgaWYgKGdlbkRpYWdzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGlhZ25vc3RpY3M6IGdlbkRpYWdzLFxuICAgICAgICBlbWl0U2tpcHBlZDogdHJ1ZSxcbiAgICAgICAgZW1pdHRlZEZpbGVzOiBbXSxcbiAgICAgIH07XG4gICAgfVxuICAgIHRoaXMuZW1pdHRlZEdlbmVyYXRlZEZpbGVzID0gZ2VuRmlsZXM7XG4gICAgY29uc3Qgb3V0U3JjTWFwcGluZzogQXJyYXk8e3NvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIG91dEZpbGVOYW1lOiBzdHJpbmd9PiA9IFtdO1xuICAgIGNvbnN0IGdlbkZpbGVCeUZpbGVOYW1lID0gbmV3IE1hcDxzdHJpbmcsIEdlbmVyYXRlZEZpbGU+KCk7XG4gICAgZ2VuRmlsZXMuZm9yRWFjaChnZW5GaWxlID0+IGdlbkZpbGVCeUZpbGVOYW1lLnNldChnZW5GaWxlLmdlbkZpbGVVcmwsIGdlbkZpbGUpKTtcbiAgICB0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzID0gW107XG4gICAgY29uc3QgZW1pdHRlZFNvdXJjZUZpbGVzID0gW10gYXMgdHMuU291cmNlRmlsZVtdO1xuICAgIGNvbnN0IHdyaXRlVHNGaWxlOiB0cy5Xcml0ZUZpbGVDYWxsYmFjayA9XG4gICAgICAgIChvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yPywgc291cmNlRmlsZXM/KSA9PiB7XG4gICAgICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHNvdXJjZUZpbGVzICYmIHNvdXJjZUZpbGVzLmxlbmd0aCA9PSAxID8gc291cmNlRmlsZXNbMF0gOiBudWxsO1xuICAgICAgICAgIGxldCBnZW5GaWxlOiBHZW5lcmF0ZWRGaWxlfHVuZGVmaW5lZDtcbiAgICAgICAgICBpZiAoc291cmNlRmlsZSkge1xuICAgICAgICAgICAgb3V0U3JjTWFwcGluZy5wdXNoKHtvdXRGaWxlTmFtZTogb3V0RmlsZU5hbWUsIHNvdXJjZUZpbGV9KTtcbiAgICAgICAgICAgIGdlbkZpbGUgPSBnZW5GaWxlQnlGaWxlTmFtZS5nZXQoc291cmNlRmlsZS5maWxlTmFtZSk7XG4gICAgICAgICAgICBpZiAoIXNvdXJjZUZpbGUuaXNEZWNsYXJhdGlvbkZpbGUgJiYgIUdFTkVSQVRFRF9GSUxFUy50ZXN0KHNvdXJjZUZpbGUuZmlsZU5hbWUpKSB7XG4gICAgICAgICAgICAgIC8vIE5vdGU6IHNvdXJjZUZpbGUgaXMgdGhlIHRyYW5zZm9ybWVkIHNvdXJjZWZpbGUsIG5vdCB0aGUgb3JpZ2luYWwgb25lIVxuICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbEZpbGUgPSB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgICAgICAgICAgICBpZiAob3JpZ2luYWxGaWxlKSB7XG4gICAgICAgICAgICAgICAgZW1pdHRlZFNvdXJjZUZpbGVzLnB1c2gob3JpZ2luYWxGaWxlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciAmJiBUUy50ZXN0KHNvdXJjZUZpbGUuZmlsZU5hbWUpKSB7XG4gICAgICAgICAgICAgIG91dERhdGEgPSBub2NvbGxhcHNlSGFjayhvdXREYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy53cml0ZUZpbGUob3V0RmlsZU5hbWUsIG91dERhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgZ2VuRmlsZSwgc291cmNlRmlsZXMpO1xuICAgICAgICB9O1xuXG4gICAgY29uc3QgbW9kdWxlcyA9IHRoaXMuX2FuYWx5emVkSW5qZWN0YWJsZXMgJiZcbiAgICAgICAgdGhpcy5jb21waWxlci5lbWl0QWxsUGFydGlhbE1vZHVsZXMyKHRoaXMuX2FuYWx5emVkSW5qZWN0YWJsZXMpO1xuXG4gICAgY29uc3QgdHNDdXN0b21UcmFuc2Zvcm1lcnMgPSB0aGlzLmNhbGN1bGF0ZVRyYW5zZm9ybXMoXG4gICAgICAgIGdlbkZpbGVCeUZpbGVOYW1lLCBtb2R1bGVzLCAvKiBzdHJpcERlY29yYXRvcnMgKi8gdW5kZWZpbmVkLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuICAgIGNvbnN0IGVtaXRPbmx5RHRzRmlsZXMgPSAoZW1pdEZsYWdzICYgKEVtaXRGbGFncy5EVFMgfCBFbWl0RmxhZ3MuSlMpKSA9PSBFbWl0RmxhZ3MuRFRTO1xuICAgIC8vIFJlc3RvcmUgdGhlIG9yaWdpbmFsIHJlZmVyZW5jZXMgYmVmb3JlIHdlIGVtaXQgc28gVHlwZVNjcmlwdCBkb2Vzbid0IGVtaXRcbiAgICAvLyBhIHJlZmVyZW5jZSB0byB0aGUgLmQudHMgZmlsZS5cbiAgICBjb25zdCBhdWdtZW50ZWRSZWZlcmVuY2VzID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBSZWFkb25seUFycmF5PHRzLkZpbGVSZWZlcmVuY2U+PigpO1xuICAgIGZvciAoY29uc3Qgc291cmNlRmlsZSBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBjb25zdCBvcmlnaW5hbFJlZmVyZW5jZXMgPSBnZXRPcmlnaW5hbFJlZmVyZW5jZXMoc291cmNlRmlsZSk7XG4gICAgICBpZiAob3JpZ2luYWxSZWZlcmVuY2VzKSB7XG4gICAgICAgIGF1Z21lbnRlZFJlZmVyZW5jZXMuc2V0KHNvdXJjZUZpbGUsIHNvdXJjZUZpbGUucmVmZXJlbmNlZEZpbGVzKTtcbiAgICAgICAgc291cmNlRmlsZS5yZWZlcmVuY2VkRmlsZXMgPSBvcmlnaW5hbFJlZmVyZW5jZXM7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGdlblRzRmlsZXM6IEdlbmVyYXRlZEZpbGVbXSA9IFtdO1xuICAgIGNvbnN0IGdlbkpzb25GaWxlczogR2VuZXJhdGVkRmlsZVtdID0gW107XG4gICAgZ2VuRmlsZXMuZm9yRWFjaChnZiA9PiB7XG4gICAgICBpZiAoZ2Yuc3RtdHMpIHtcbiAgICAgICAgZ2VuVHNGaWxlcy5wdXNoKGdmKTtcbiAgICAgIH1cbiAgICAgIGlmIChnZi5zb3VyY2UpIHtcbiAgICAgICAgZ2VuSnNvbkZpbGVzLnB1c2goZ2YpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGxldCBlbWl0UmVzdWx0OiB0cy5FbWl0UmVzdWx0O1xuICAgIGxldCBlbWl0dGVkVXNlclRzQ291bnQ6IG51bWJlcjtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc291cmNlRmlsZXNUb0VtaXQgPSB0aGlzLmdldFNvdXJjZUZpbGVzRm9yRW1pdCgpO1xuICAgICAgaWYgKHNvdXJjZUZpbGVzVG9FbWl0ICYmXG4gICAgICAgICAgKHNvdXJjZUZpbGVzVG9FbWl0Lmxlbmd0aCArIGdlblRzRmlsZXMubGVuZ3RoKSA8IE1BWF9GSUxFX0NPVU5UX0ZPUl9TSU5HTEVfRklMRV9FTUlUKSB7XG4gICAgICAgIGNvbnN0IGZpbGVOYW1lc1RvRW1pdCA9XG4gICAgICAgICAgICBbLi4uc291cmNlRmlsZXNUb0VtaXQubWFwKHNmID0+IHNmLmZpbGVOYW1lKSwgLi4uZ2VuVHNGaWxlcy5tYXAoZ2YgPT4gZ2YuZ2VuRmlsZVVybCldO1xuICAgICAgICBlbWl0UmVzdWx0ID0gbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrKFxuICAgICAgICAgICAgZmlsZU5hbWVzVG9FbWl0Lm1hcCgoZmlsZU5hbWUpID0+IGVtaXRSZXN1bHQgPSBlbWl0Q2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3Q6IHRoaXMuaG9zdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVGaWxlOiB3cml0ZVRzRmlsZSwgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM6IHRzQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGU6IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpO1xuICAgICAgICBlbWl0dGVkVXNlclRzQ291bnQgPSBzb3VyY2VGaWxlc1RvRW1pdC5sZW5ndGg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbWl0UmVzdWx0ID0gZW1pdENhbGxiYWNrKHtcbiAgICAgICAgICBwcm9ncmFtOiB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgICAgICBob3N0OiB0aGlzLmhvc3QsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIHdyaXRlRmlsZTogd3JpdGVUc0ZpbGUsIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzOiB0c0N1c3RvbVRyYW5zZm9ybWVyc1xuICAgICAgICB9KTtcbiAgICAgICAgZW1pdHRlZFVzZXJUc0NvdW50ID0gdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5sZW5ndGggLSBnZW5Uc0ZpbGVzLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgLy8gUmVzdG9yZSB0aGUgcmVmZXJlbmNlcyBiYWNrIHRvIHRoZSBhdWdtZW50ZWQgdmFsdWUgdG8gZW5zdXJlIHRoYXQgdGhlXG4gICAgICAvLyBjaGVja3MgdGhhdCBUeXBlU2NyaXB0IG1ha2VzIGZvciBwcm9qZWN0IHN0cnVjdHVyZSByZXVzZSB3aWxsIHN1Y2NlZWQuXG4gICAgICBmb3IgKGNvbnN0IFtzb3VyY2VGaWxlLCByZWZlcmVuY2VzXSBvZiBBcnJheS5mcm9tKGF1Z21lbnRlZFJlZmVyZW5jZXMpKSB7XG4gICAgICAgIC8vIFRPRE8oY2h1Y2tqKTogUmVtb3ZlIGFueSBjYXN0IGFmdGVyIHVwZGF0aW5nIGJ1aWxkIHRvIDIuNlxuICAgICAgICAoc291cmNlRmlsZSBhcyBhbnkpLnJlZmVyZW5jZWRGaWxlcyA9IHJlZmVyZW5jZXM7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuZW1pdHRlZFNvdXJjZUZpbGVzID0gZW1pdHRlZFNvdXJjZUZpbGVzO1xuXG4gICAgLy8gTWF0Y2ggYmVoYXZpb3Igb2YgdHNjOiBvbmx5IHByb2R1Y2UgZW1pdCBkaWFnbm9zdGljcyBpZiBpdCB3b3VsZCBibG9ja1xuICAgIC8vIGVtaXQuIElmIG5vRW1pdE9uRXJyb3IgaXMgZmFsc2UsIHRoZSBlbWl0IHdpbGwgaGFwcGVuIGluIHNwaXRlIG9mIGFueVxuICAgIC8vIGVycm9ycywgc28gd2Ugc2hvdWxkIG5vdCByZXBvcnQgdGhlbS5cbiAgICBpZiAodGhpcy5vcHRpb25zLm5vRW1pdE9uRXJyb3IgPT09IHRydWUpIHtcbiAgICAgIC8vIHRyYW5zbGF0ZSB0aGUgZGlhZ25vc3RpY3MgaW4gdGhlIGVtaXRSZXN1bHQgYXMgd2VsbC5cbiAgICAgIGNvbnN0IHRyYW5zbGF0ZWRFbWl0RGlhZ3MgPSB0cmFuc2xhdGVEaWFnbm9zdGljcyh0aGlzLmhvc3RBZGFwdGVyLCBlbWl0UmVzdWx0LmRpYWdub3N0aWNzKTtcbiAgICAgIGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MgPSB0cmFuc2xhdGVkRW1pdERpYWdzLnRzLmNvbmNhdChcbiAgICAgICAgICB0aGlzLnN0cnVjdHVyYWxEaWFnbm9zdGljcy5jb25jYXQodHJhbnNsYXRlZEVtaXREaWFncy5uZykubWFwKG5nVG9Uc0RpYWdub3N0aWMpKTtcbiAgICB9XG5cbiAgICBpZiAoIW91dFNyY01hcHBpbmcubGVuZ3RoKSB7XG4gICAgICAvLyBpZiBubyBmaWxlcyB3ZXJlIGVtaXR0ZWQgYnkgVHlwZVNjcmlwdCwgYWxzbyBkb24ndCBlbWl0IC5qc29uIGZpbGVzXG4gICAgICBlbWl0UmVzdWx0LmRpYWdub3N0aWNzID1cbiAgICAgICAgICBlbWl0UmVzdWx0LmRpYWdub3N0aWNzLmNvbmNhdChbY3JlYXRlTWVzc2FnZURpYWdub3N0aWMoYEVtaXR0ZWQgbm8gZmlsZXMuYCldKTtcbiAgICAgIHJldHVybiBlbWl0UmVzdWx0O1xuICAgIH1cblxuICAgIGxldCBzYW1wbGVTcmNGaWxlTmFtZTogc3RyaW5nfHVuZGVmaW5lZDtcbiAgICBsZXQgc2FtcGxlT3V0RmlsZU5hbWU6IHN0cmluZ3x1bmRlZmluZWQ7XG4gICAgaWYgKG91dFNyY01hcHBpbmcubGVuZ3RoKSB7XG4gICAgICBzYW1wbGVTcmNGaWxlTmFtZSA9IG91dFNyY01hcHBpbmdbMF0uc291cmNlRmlsZS5maWxlTmFtZTtcbiAgICAgIHNhbXBsZU91dEZpbGVOYW1lID0gb3V0U3JjTWFwcGluZ1swXS5vdXRGaWxlTmFtZTtcbiAgICB9XG4gICAgY29uc3Qgc3JjVG9PdXRQYXRoID1cbiAgICAgICAgY3JlYXRlU3JjVG9PdXRQYXRoTWFwcGVyKHRoaXMub3B0aW9ucy5vdXREaXIsIHNhbXBsZVNyY0ZpbGVOYW1lLCBzYW1wbGVPdXRGaWxlTmFtZSk7XG4gICAgaWYgKGVtaXRGbGFncyAmIEVtaXRGbGFncy5Db2RlZ2VuKSB7XG4gICAgICBnZW5Kc29uRmlsZXMuZm9yRWFjaChnZiA9PiB7XG4gICAgICAgIGNvbnN0IG91dEZpbGVOYW1lID0gc3JjVG9PdXRQYXRoKGdmLmdlbkZpbGVVcmwpO1xuICAgICAgICB0aGlzLndyaXRlRmlsZShvdXRGaWxlTmFtZSwgZ2Yuc291cmNlICEsIGZhbHNlLCB1bmRlZmluZWQsIGdmKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBsZXQgbWV0YWRhdGFKc29uQ291bnQgPSAwO1xuICAgIGlmIChlbWl0RmxhZ3MgJiBFbWl0RmxhZ3MuTWV0YWRhdGEpIHtcbiAgICAgIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzZiA9PiB7XG4gICAgICAgIGlmICghc2YuaXNEZWNsYXJhdGlvbkZpbGUgJiYgIUdFTkVSQVRFRF9GSUxFUy50ZXN0KHNmLmZpbGVOYW1lKSkge1xuICAgICAgICAgIG1ldGFkYXRhSnNvbkNvdW50Kys7XG4gICAgICAgICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhQ2FjaGUuZ2V0TWV0YWRhdGEoc2YpO1xuICAgICAgICAgIGlmIChtZXRhZGF0YSkge1xuICAgICAgICAgICAgY29uc3QgbWV0YWRhdGFUZXh0ID0gSlNPTi5zdHJpbmdpZnkoW21ldGFkYXRhXSk7XG4gICAgICAgICAgICBjb25zdCBvdXRGaWxlTmFtZSA9IHNyY1RvT3V0UGF0aChzZi5maWxlTmFtZS5yZXBsYWNlKC9cXC50c3g/JC8sICcubWV0YWRhdGEuanNvbicpKTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVGaWxlKG91dEZpbGVOYW1lLCBtZXRhZGF0YVRleHQsIGZhbHNlLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgW3NmXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3QgZW1pdEVuZCA9IERhdGUubm93KCk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kaWFnbm9zdGljcykge1xuICAgICAgZW1pdFJlc3VsdC5kaWFnbm9zdGljcyA9IGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MuY29uY2F0KFtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYyhbXG4gICAgICAgIGBFbWl0dGVkIGluICR7ZW1pdEVuZCAtIGVtaXRTdGFydH1tc2AsXG4gICAgICAgIGAtICR7ZW1pdHRlZFVzZXJUc0NvdW50fSB1c2VyIHRzIGZpbGVzYCxcbiAgICAgICAgYC0gJHtnZW5Uc0ZpbGVzLmxlbmd0aH0gZ2VuZXJhdGVkIHRzIGZpbGVzYCxcbiAgICAgICAgYC0gJHtnZW5Kc29uRmlsZXMubGVuZ3RoICsgbWV0YWRhdGFKc29uQ291bnR9IGdlbmVyYXRlZCBqc29uIGZpbGVzYCxcbiAgICAgIF0uam9pbignXFxuJykpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVtaXRSZXN1bHQ7XG4gIH1cblxuICAvLyBQcml2YXRlIG1lbWJlcnNcbiAgcHJpdmF0ZSBnZXQgY29tcGlsZXIoKTogQW90Q29tcGlsZXIge1xuICAgIGlmICghdGhpcy5fY29tcGlsZXIpIHtcbiAgICAgIHRoaXMuX2NyZWF0ZUNvbXBpbGVyKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb21waWxlciAhO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgaG9zdEFkYXB0ZXIoKTogVHNDb21waWxlckFvdENvbXBpbGVyVHlwZUNoZWNrSG9zdEFkYXB0ZXIge1xuICAgIGlmICghdGhpcy5faG9zdEFkYXB0ZXIpIHtcbiAgICAgIHRoaXMuX2NyZWF0ZUNvbXBpbGVyKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ob3N0QWRhcHRlciAhO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgYW5hbHl6ZWRNb2R1bGVzKCk6IE5nQW5hbHl6ZWRNb2R1bGVzIHtcbiAgICBpZiAoIXRoaXMuX2FuYWx5emVkTW9kdWxlcykge1xuICAgICAgdGhpcy5pbml0U3luYygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fYW5hbHl6ZWRNb2R1bGVzICE7XG4gIH1cblxuICBwcml2YXRlIGdldCBzdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoKTogUmVhZG9ubHlBcnJheTxEaWFnbm9zdGljPiB7XG4gICAgbGV0IGRpYWdub3N0aWNzID0gdGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzO1xuICAgIGlmICghZGlhZ25vc3RpY3MpIHtcbiAgICAgIHRoaXMuaW5pdFN5bmMoKTtcbiAgICAgIGRpYWdub3N0aWNzID0gKHRoaXMuX3N0cnVjdHVyYWxEaWFnbm9zdGljcyA9IHRoaXMuX3N0cnVjdHVyYWxEaWFnbm9zdGljcyB8fCBbXSk7XG4gICAgfVxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHRzUHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICBpZiAoIXRoaXMuX3RzUHJvZ3JhbSkge1xuICAgICAgdGhpcy5pbml0U3luYygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fdHNQcm9ncmFtICE7XG4gIH1cblxuICBwcml2YXRlIGdldCByZWlmaWVkRGVjb3JhdG9ycygpOiBTZXQ8U3RhdGljU3ltYm9sPiB7XG4gICAgaWYgKCF0aGlzLl9yZWlmaWVkRGVjb3JhdG9ycykge1xuICAgICAgY29uc3QgcmVmbGVjdG9yID0gdGhpcy5jb21waWxlci5yZWZsZWN0b3I7XG4gICAgICB0aGlzLl9yZWlmaWVkRGVjb3JhdG9ycyA9IG5ldyBTZXQoXG4gICAgICAgICAgUjNfUkVJRklFRF9ERUNPUkFUT1JTLm1hcChuYW1lID0+IHJlZmxlY3Rvci5maW5kRGVjbGFyYXRpb24oJ0Bhbmd1bGFyL2NvcmUnLCBuYW1lKSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcmVpZmllZERlY29yYXRvcnM7XG4gIH1cblxuICBwcml2YXRlIGNhbGN1bGF0ZVRyYW5zZm9ybXMoXG4gICAgICBnZW5GaWxlczogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT58dW5kZWZpbmVkLCBwYXJ0aWFsTW9kdWxlczogUGFydGlhbE1vZHVsZVtdfHVuZGVmaW5lZCxcbiAgICAgIHN0cmlwRGVjb3JhdG9yczogU2V0PFN0YXRpY1N5bWJvbD58dW5kZWZpbmVkLFxuICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogQ3VzdG9tVHJhbnNmb3JtZXJzKTogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzIHtcbiAgICBjb25zdCBiZWZvcmVUczogQXJyYXk8dHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+PiA9IFtdO1xuICAgIGNvbnN0IG1ldGFkYXRhVHJhbnNmb3JtczogTWV0YWRhdGFUcmFuc2Zvcm1lcltdID0gW107XG4gICAgY29uc3QgZmxhdE1vZHVsZU1ldGFkYXRhVHJhbnNmb3JtczogTWV0YWRhdGFUcmFuc2Zvcm1lcltdID0gW107XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lbmFibGVSZXNvdXJjZUlubGluaW5nKSB7XG4gICAgICBiZWZvcmVUcy5wdXNoKGdldElubGluZVJlc291cmNlc1RyYW5zZm9ybUZhY3RvcnkodGhpcy50c1Byb2dyYW0sIHRoaXMuaG9zdEFkYXB0ZXIpKTtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IElubGluZVJlc291cmNlc01ldGFkYXRhVHJhbnNmb3JtZXIodGhpcy5ob3N0QWRhcHRlcik7XG4gICAgICBtZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgICBmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zLnB1c2godHJhbnNmb3JtZXIpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVFeHByZXNzaW9uTG93ZXJpbmcpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goXG4gICAgICAgICAgZ2V0RXhwcmVzc2lvbkxvd2VyaW5nVHJhbnNmb3JtRmFjdG9yeSh0aGlzLmxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm0sIHRoaXMudHNQcm9ncmFtKSk7XG4gICAgICBtZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0aGlzLmxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm0pO1xuICAgIH1cbiAgICBpZiAoZ2VuRmlsZXMpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goZ2V0QW5ndWxhckVtaXR0ZXJUcmFuc2Zvcm1GYWN0b3J5KGdlbkZpbGVzLCB0aGlzLmdldFRzUHJvZ3JhbSgpKSk7XG4gICAgfVxuICAgIGlmIChwYXJ0aWFsTW9kdWxlcykge1xuICAgICAgYmVmb3JlVHMucHVzaChnZXRBbmd1bGFyQ2xhc3NUcmFuc2Zvcm1lckZhY3RvcnkocGFydGlhbE1vZHVsZXMpKTtcblxuICAgICAgLy8gSWYgd2UgaGF2ZSBwYXJ0aWFsIG1vZHVsZXMsIHRoZSBjYWNoZWQgbWV0YWRhdGEgbWlnaHQgYmUgaW5jb3JyZWN0IGFzIGl0IGRvZXNuJ3QgcmVmbGVjdFxuICAgICAgLy8gdGhlIHBhcnRpYWwgbW9kdWxlIHRyYW5zZm9ybXMuXG4gICAgICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBQYXJ0aWFsTW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1lcihwYXJ0aWFsTW9kdWxlcyk7XG4gICAgICBtZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgICBmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zLnB1c2godHJhbnNmb3JtZXIpO1xuICAgIH1cblxuICAgIGlmIChzdHJpcERlY29yYXRvcnMpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goZ2V0RGVjb3JhdG9yU3RyaXBUcmFuc2Zvcm1lckZhY3RvcnkoXG4gICAgICAgICAgc3RyaXBEZWNvcmF0b3JzLCB0aGlzLmNvbXBpbGVyLnJlZmxlY3RvciwgdGhpcy5nZXRUc1Byb2dyYW0oKS5nZXRUeXBlQ2hlY2tlcigpKSk7XG4gICAgICBjb25zdCB0cmFuc2Zvcm1lciA9XG4gICAgICAgICAgbmV3IFN0cmlwRGVjb3JhdG9yc01ldGFkYXRhVHJhbnNmb3JtZXIoc3RyaXBEZWNvcmF0b3JzLCB0aGlzLmNvbXBpbGVyLnJlZmxlY3Rvcik7XG4gICAgICBtZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgICBmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zLnB1c2godHJhbnNmb3JtZXIpO1xuICAgIH1cblxuICAgIGlmIChjdXN0b21UcmFuc2Zvcm1lcnMgJiYgY3VzdG9tVHJhbnNmb3JtZXJzLmJlZm9yZVRzKSB7XG4gICAgICBiZWZvcmVUcy5wdXNoKC4uLmN1c3RvbVRyYW5zZm9ybWVycy5iZWZvcmVUcyk7XG4gICAgfVxuICAgIGlmIChtZXRhZGF0YVRyYW5zZm9ybXMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5tZXRhZGF0YUNhY2hlID0gdGhpcy5jcmVhdGVNZXRhZGF0YUNhY2hlKG1ldGFkYXRhVHJhbnNmb3Jtcyk7XG4gICAgfVxuICAgIGlmIChmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuZmxhdE1vZHVsZU1ldGFkYXRhQ2FjaGUgPSB0aGlzLmNyZWF0ZU1ldGFkYXRhQ2FjaGUoZmxhdE1vZHVsZU1ldGFkYXRhVHJhbnNmb3Jtcyk7XG4gICAgfVxuICAgIGNvbnN0IGFmdGVyVHMgPSBjdXN0b21UcmFuc2Zvcm1lcnMgPyBjdXN0b21UcmFuc2Zvcm1lcnMuYWZ0ZXJUcyA6IHVuZGVmaW5lZDtcbiAgICByZXR1cm4ge2JlZm9yZTogYmVmb3JlVHMsIGFmdGVyOiBhZnRlclRzfTtcbiAgfVxuXG4gIHByaXZhdGUgaW5pdFN5bmMoKSB7XG4gICAgaWYgKHRoaXMuX2FuYWx5emVkTW9kdWxlcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3Qge3RtcFByb2dyYW0sIHNvdXJjZUZpbGVzLCB0c0ZpbGVzLCByb290TmFtZXN9ID0gdGhpcy5fY3JlYXRlUHJvZ3JhbVdpdGhCYXNpY1N0dWJzKCk7XG4gICAgICBjb25zdCB7YW5hbHl6ZWRNb2R1bGVzLCBhbmFseXplZEluamVjdGFibGVzfSA9XG4gICAgICAgICAgdGhpcy5jb21waWxlci5sb2FkRmlsZXNTeW5jKHNvdXJjZUZpbGVzLCB0c0ZpbGVzKTtcbiAgICAgIHRoaXMuX3VwZGF0ZVByb2dyYW1XaXRoVHlwZUNoZWNrU3R1YnMoXG4gICAgICAgICAgdG1wUHJvZ3JhbSwgYW5hbHl6ZWRNb2R1bGVzLCBhbmFseXplZEluamVjdGFibGVzLCByb290TmFtZXMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMuX2NyZWF0ZVByb2dyYW1PbkVycm9yKGUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZUNvbXBpbGVyKCkge1xuICAgIGNvbnN0IGNvZGVnZW46IENvZGVHZW5lcmF0b3IgPSB7XG4gICAgICBnZW5lcmF0ZUZpbGU6IChnZW5GaWxlTmFtZSwgYmFzZUZpbGVOYW1lKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tcGlsZXIuZW1pdEJhc2ljU3R1YihnZW5GaWxlTmFtZSwgYmFzZUZpbGVOYW1lKSxcbiAgICAgIGZpbmRHZW5lcmF0ZWRGaWxlTmFtZXM6IChmaWxlTmFtZSkgPT4gdGhpcy5fY29tcGlsZXIuZmluZEdlbmVyYXRlZEZpbGVOYW1lcyhmaWxlTmFtZSksXG4gICAgfTtcblxuICAgIHRoaXMuX2hvc3RBZGFwdGVyID0gbmV3IFRzQ29tcGlsZXJBb3RDb21waWxlclR5cGVDaGVja0hvc3RBZGFwdGVyKFxuICAgICAgICB0aGlzLnJvb3ROYW1lcywgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QsIHRoaXMubWV0YWRhdGFDYWNoZSwgY29kZWdlbixcbiAgICAgICAgdGhpcy5vbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllcyk7XG4gICAgY29uc3QgYW90T3B0aW9ucyA9IGdldEFvdENvbXBpbGVyT3B0aW9ucyh0aGlzLm9wdGlvbnMpO1xuICAgIGNvbnN0IGVycm9yQ29sbGVjdG9yID0gKHRoaXMub3B0aW9ucy5jb2xsZWN0QWxsRXJyb3JzIHx8IHRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spID9cbiAgICAgICAgKGVycjogYW55KSA9PiB0aGlzLl9hZGRTdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoZXJyKSA6XG4gICAgICAgIHVuZGVmaW5lZDtcbiAgICB0aGlzLl9jb21waWxlciA9IGNyZWF0ZUFvdENvbXBpbGVyKHRoaXMuX2hvc3RBZGFwdGVyLCBhb3RPcHRpb25zLCBlcnJvckNvbGxlY3RvcikuY29tcGlsZXI7XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVQcm9ncmFtV2l0aEJhc2ljU3R1YnMoKToge1xuICAgIHRtcFByb2dyYW06IHRzLlByb2dyYW0sXG4gICAgcm9vdE5hbWVzOiBzdHJpbmdbXSxcbiAgICBzb3VyY2VGaWxlczogc3RyaW5nW10sXG4gICAgdHNGaWxlczogc3RyaW5nW10sXG4gIH0ge1xuICAgIGlmICh0aGlzLl9hbmFseXplZE1vZHVsZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6IGFscmVhZHkgaW5pdGlhbGl6ZWQhYCk7XG4gICAgfVxuICAgIC8vIE5vdGU6IFRoaXMgaXMgaW1wb3J0YW50IHRvIG5vdCBwcm9kdWNlIGEgbWVtb3J5IGxlYWshXG4gICAgY29uc3Qgb2xkVHNQcm9ncmFtID0gdGhpcy5vbGRUc1Byb2dyYW07XG4gICAgdGhpcy5vbGRUc1Byb2dyYW0gPSB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCBjb2RlZ2VuOiBDb2RlR2VuZXJhdG9yID0ge1xuICAgICAgZ2VuZXJhdGVGaWxlOiAoZ2VuRmlsZU5hbWUsIGJhc2VGaWxlTmFtZSkgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tcGlsZXIuZW1pdEJhc2ljU3R1YihnZW5GaWxlTmFtZSwgYmFzZUZpbGVOYW1lKSxcbiAgICAgIGZpbmRHZW5lcmF0ZWRGaWxlTmFtZXM6IChmaWxlTmFtZSkgPT4gdGhpcy5jb21waWxlci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKGZpbGVOYW1lKSxcbiAgICB9O1xuXG5cbiAgICBsZXQgcm9vdE5hbWVzID0gWy4uLnRoaXMucm9vdE5hbWVzXTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmdlbmVyYXRlQ29kZUZvckxpYnJhcmllcyAhPT0gZmFsc2UpIHtcbiAgICAgIC8vIGlmIHdlIHNob3VsZCBnZW5lcmF0ZUNvZGVGb3JMaWJyYXJpZXMsIG5ldmVyIGluY2x1ZGVcbiAgICAgIC8vIGdlbmVyYXRlZCBmaWxlcyBpbiB0aGUgcHJvZ3JhbSBhcyBvdGhlcndpc2Ugd2Ugd2lsbFxuICAgICAgLy8gb3ZlcndyaXRlIHRoZW0gYW5kIHR5cGVzY3JpcHQgd2lsbCByZXBvcnQgdGhlIGVycm9yXG4gICAgICAvLyBUUzUwNTU6IENhbm5vdCB3cml0ZSBmaWxlIC4uLiBiZWNhdXNlIGl0IHdvdWxkIG92ZXJ3cml0ZSBpbnB1dCBmaWxlLlxuICAgICAgcm9vdE5hbWVzID0gcm9vdE5hbWVzLmZpbHRlcihmbiA9PiAhR0VORVJBVEVEX0ZJTEVTLnRlc3QoZm4pKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5ub1Jlc29sdmUpIHtcbiAgICAgIHRoaXMucm9vdE5hbWVzLmZvckVhY2gocm9vdE5hbWUgPT4ge1xuICAgICAgICBpZiAodGhpcy5ob3N0QWRhcHRlci5zaG91bGRHZW5lcmF0ZUZpbGVzRm9yKHJvb3ROYW1lKSkge1xuICAgICAgICAgIHJvb3ROYW1lcy5wdXNoKC4uLnRoaXMuY29tcGlsZXIuZmluZEdlbmVyYXRlZEZpbGVOYW1lcyhyb290TmFtZSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCB0bXBQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShyb290TmFtZXMsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0QWRhcHRlciwgb2xkVHNQcm9ncmFtKTtcbiAgICBjb25zdCBzb3VyY2VGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCB0c0ZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIHRtcFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNmID0+IHtcbiAgICAgIGlmICh0aGlzLmhvc3RBZGFwdGVyLmlzU291cmNlRmlsZShzZi5maWxlTmFtZSkpIHtcbiAgICAgICAgc291cmNlRmlsZXMucHVzaChzZi5maWxlTmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAoVFMudGVzdChzZi5maWxlTmFtZSkgJiYgIURUUy50ZXN0KHNmLmZpbGVOYW1lKSkge1xuICAgICAgICB0c0ZpbGVzLnB1c2goc2YuZmlsZU5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB7dG1wUHJvZ3JhbSwgc291cmNlRmlsZXMsIHRzRmlsZXMsIHJvb3ROYW1lc307XG4gIH1cblxuICBwcml2YXRlIF91cGRhdGVQcm9ncmFtV2l0aFR5cGVDaGVja1N0dWJzKFxuICAgICAgdG1wUHJvZ3JhbTogdHMuUHJvZ3JhbSwgYW5hbHl6ZWRNb2R1bGVzOiBOZ0FuYWx5emVkTW9kdWxlcyxcbiAgICAgIGFuYWx5emVkSW5qZWN0YWJsZXM6IE5nQW5hbHl6ZWRGaWxlV2l0aEluamVjdGFibGVzW10sIHJvb3ROYW1lczogc3RyaW5nW10pIHtcbiAgICB0aGlzLl9hbmFseXplZE1vZHVsZXMgPSBhbmFseXplZE1vZHVsZXM7XG4gICAgdGhpcy5fYW5hbHl6ZWRJbmplY3RhYmxlcyA9IGFuYWx5emVkSW5qZWN0YWJsZXM7XG4gICAgdG1wUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc2YgPT4ge1xuICAgICAgaWYgKHNmLmZpbGVOYW1lLmVuZHNXaXRoKCcubmdmYWN0b3J5LnRzJykpIHtcbiAgICAgICAgY29uc3Qge2dlbmVyYXRlLCBiYXNlRmlsZU5hbWV9ID0gdGhpcy5ob3N0QWRhcHRlci5zaG91bGRHZW5lcmF0ZUZpbGUoc2YuZmlsZU5hbWUpO1xuICAgICAgICBpZiAoZ2VuZXJhdGUpIHtcbiAgICAgICAgICAvLyBOb3RlOiAhIGlzIG9rIGFzIGhvc3RBZGFwdGVyLnNob3VsZEdlbmVyYXRlRmlsZSB3aWxsIGFsd2F5cyByZXR1cm4gYSBiYXNlRmlsZU5hbWVcbiAgICAgICAgICAvLyBmb3IgLm5nZmFjdG9yeS50cyBmaWxlcy5cbiAgICAgICAgICBjb25zdCBnZW5GaWxlID0gdGhpcy5jb21waWxlci5lbWl0VHlwZUNoZWNrU3R1YihzZi5maWxlTmFtZSwgYmFzZUZpbGVOYW1lICEpO1xuICAgICAgICAgIGlmIChnZW5GaWxlKSB7XG4gICAgICAgICAgICB0aGlzLmhvc3RBZGFwdGVyLnVwZGF0ZUdlbmVyYXRlZEZpbGUoZ2VuRmlsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5fdHNQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShyb290TmFtZXMsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0QWRhcHRlciwgdG1wUHJvZ3JhbSk7XG4gICAgLy8gTm90ZTogdGhlIG5ldyB0cyBwcm9ncmFtIHNob3VsZCBiZSBjb21wbGV0ZWx5IHJldXNhYmxlIGJ5IFR5cGVTY3JpcHQgYXM6XG4gICAgLy8gLSB3ZSBjYWNoZSBhbGwgdGhlIGZpbGVzIGluIHRoZSBob3N0QWRhcHRlclxuICAgIC8vIC0gbmV3IG5ldyBzdHVicyB1c2UgdGhlIGV4YWN0bHkgc2FtZSBpbXBvcnRzL2V4cG9ydHMgYXMgdGhlIG9sZCBvbmNlICh3ZSBhc3NlcnQgdGhhdCBpblxuICAgIC8vIGhvc3RBZGFwdGVyLnVwZGF0ZUdlbmVyYXRlZEZpbGUpLlxuICAgIGlmICh0c1N0cnVjdHVyZUlzUmV1c2VkKHRtcFByb2dyYW0pICE9PSBTdHJ1Y3R1cmVJc1JldXNlZC5Db21wbGV0ZWx5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludGVybmFsIEVycm9yOiBUaGUgc3RydWN0dXJlIG9mIHRoZSBwcm9ncmFtIGNoYW5nZWQgZHVyaW5nIGNvZGVnZW4uYCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfY3JlYXRlUHJvZ3JhbU9uRXJyb3IoZTogYW55KSB7XG4gICAgLy8gU3RpbGwgZmlsbCB0aGUgYW5hbHl6ZWRNb2R1bGVzIGFuZCB0aGUgdHNQcm9ncmFtXG4gICAgLy8gc28gdGhhdCB3ZSBkb24ndCBjYXVzZSBvdGhlciBlcnJvcnMgZm9yIHVzZXJzIHdobyBlLmcuIHdhbnQgdG8gZW1pdCB0aGUgbmdQcm9ncmFtLlxuICAgIHRoaXMuX2FuYWx5emVkTW9kdWxlcyA9IGVtcHR5TW9kdWxlcztcbiAgICB0aGlzLm9sZFRzUHJvZ3JhbSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9ob3N0QWRhcHRlci5pc1NvdXJjZUZpbGUgPSAoKSA9PiBmYWxzZTtcbiAgICB0aGlzLl90c1Byb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHRoaXMucm9vdE5hbWVzLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdEFkYXB0ZXIpO1xuICAgIGlmIChpc1N5bnRheEVycm9yKGUpKSB7XG4gICAgICB0aGlzLl9hZGRTdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH1cblxuICBwcml2YXRlIF9hZGRTdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoZXJyb3I6IEVycm9yKSB7XG4gICAgY29uc3QgZGlhZ25vc3RpY3MgPSB0aGlzLl9zdHJ1Y3R1cmFsRGlhZ25vc3RpY3MgfHwgKHRoaXMuX3N0cnVjdHVyYWxEaWFnbm9zdGljcyA9IFtdKTtcbiAgICBpZiAoaXNTeW50YXhFcnJvcihlcnJvcikpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uc3ludGF4RXJyb3JUb0RpYWdub3N0aWNzKGVycm9yKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICBtZXNzYWdlVGV4dDogZXJyb3IudG9TdHJpbmcoKSxcbiAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gTm90ZTogdGhpcyByZXR1cm5zIGEgdHMuRGlhZ25vc3RpYyBzbyB0aGF0IHdlXG4gIC8vIGNhbiByZXR1cm4gZXJyb3JzIGluIGEgdHMuRW1pdFJlc3VsdFxuICBwcml2YXRlIGdlbmVyYXRlRmlsZXNGb3JFbWl0KGVtaXRGbGFnczogRW1pdEZsYWdzKTpcbiAgICAgIHtnZW5GaWxlczogR2VuZXJhdGVkRmlsZVtdLCBnZW5EaWFnczogdHMuRGlhZ25vc3RpY1tdfSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghKGVtaXRGbGFncyAmIEVtaXRGbGFncy5Db2RlZ2VuKSkge1xuICAgICAgICByZXR1cm4ge2dlbkZpbGVzOiBbXSwgZ2VuRGlhZ3M6IFtdfTtcbiAgICAgIH1cbiAgICAgIC8vIFRPRE8odGJvc2NoKTogYWxsb3cgZ2VuZXJhdGluZyBmaWxlcyB0aGF0IGFyZSBub3QgaW4gdGhlIHJvb3REaXJcbiAgICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy8xOTMzN1xuICAgICAgbGV0IGdlbkZpbGVzID0gdGhpcy5jb21waWxlci5lbWl0QWxsSW1wbHModGhpcy5hbmFseXplZE1vZHVsZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihnZW5GaWxlID0+IGlzSW5Sb290RGlyKGdlbkZpbGUuZ2VuRmlsZVVybCwgdGhpcy5vcHRpb25zKSk7XG4gICAgICBpZiAodGhpcy5vbGRQcm9ncmFtRW1pdHRlZEdlbmVyYXRlZEZpbGVzKSB7XG4gICAgICAgIGNvbnN0IG9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMgPSB0aGlzLm9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXM7XG4gICAgICAgIGdlbkZpbGVzID0gZ2VuRmlsZXMuZmlsdGVyKGdlbkZpbGUgPT4ge1xuICAgICAgICAgIGNvbnN0IG9sZEdlbkZpbGUgPSBvbGRQcm9ncmFtRW1pdHRlZEdlbmVyYXRlZEZpbGVzLmdldChnZW5GaWxlLmdlbkZpbGVVcmwpO1xuICAgICAgICAgIHJldHVybiAhb2xkR2VuRmlsZSB8fCAhZ2VuRmlsZS5pc0VxdWl2YWxlbnQob2xkR2VuRmlsZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtnZW5GaWxlcywgZ2VuRGlhZ3M6IFtdfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBUT0RPKHRib3NjaCk6IGNoZWNrIHdoZXRoZXIgd2UgY2FuIGFjdHVhbGx5IGhhdmUgc3ludGF4IGVycm9ycyBoZXJlLFxuICAgICAgLy8gYXMgd2UgYWxyZWFkeSBwYXJzZWQgdGhlIG1ldGFkYXRhIGFuZCB0ZW1wbGF0ZXMgYmVmb3JlIHRvIGNyZWF0ZSB0aGUgdHlwZSBjaGVjayBibG9jay5cbiAgICAgIGlmIChpc1N5bnRheEVycm9yKGUpKSB7XG4gICAgICAgIGNvbnN0IGdlbkRpYWdzOiB0cy5EaWFnbm9zdGljW10gPSBbe1xuICAgICAgICAgIGZpbGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICBzdGFydDogdW5kZWZpbmVkLFxuICAgICAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgICAgIG1lc3NhZ2VUZXh0OiBlLm1lc3NhZ2UsXG4gICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREVcbiAgICAgICAgfV07XG4gICAgICAgIHJldHVybiB7Z2VuRmlsZXM6IFtdLCBnZW5EaWFnc307XG4gICAgICB9XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHVuZGVmaW5lZCBpZiBhbGwgZmlsZXMgc2hvdWxkIGJlIGVtaXR0ZWQuXG4gICAqL1xuICBwcml2YXRlIGdldFNvdXJjZUZpbGVzRm9yRW1pdCgpOiB0cy5Tb3VyY2VGaWxlW118dW5kZWZpbmVkIHtcbiAgICAvLyBUT0RPKHRib3NjaCk6IGlmIG9uZSBvZiB0aGUgZmlsZXMgY29udGFpbnMgYSBgY29uc3QgZW51bWBcbiAgICAvLyBhbHdheXMgZW1pdCBhbGwgZmlsZXMgLT4gcmV0dXJuIHVuZGVmaW5lZCFcbiAgICBsZXQgc291cmNlRmlsZXNUb0VtaXQgPSB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbHRlcihcbiAgICAgICAgc2YgPT4geyByZXR1cm4gIXNmLmlzRGVjbGFyYXRpb25GaWxlICYmICFHRU5FUkFURURfRklMRVMudGVzdChzZi5maWxlTmFtZSk7IH0pO1xuICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMpIHtcbiAgICAgIHNvdXJjZUZpbGVzVG9FbWl0ID0gc291cmNlRmlsZXNUb0VtaXQuZmlsdGVyKHNmID0+IHtcbiAgICAgICAgY29uc3Qgb2xkRmlsZSA9IHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlcyAhLmdldChzZi5maWxlTmFtZSk7XG4gICAgICAgIHJldHVybiBzZiAhPT0gb2xkRmlsZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc291cmNlRmlsZXNUb0VtaXQ7XG4gIH1cblxuICBwcml2YXRlIHdyaXRlRmlsZShcbiAgICAgIG91dEZpbGVOYW1lOiBzdHJpbmcsIG91dERhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgb25FcnJvcj86IChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQsIGdlbkZpbGU/OiBHZW5lcmF0ZWRGaWxlLFxuICAgICAgc291cmNlRmlsZXM/OiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+KSB7XG4gICAgLy8gY29sbGVjdCBlbWl0dGVkTGlicmFyeVN1bW1hcmllc1xuICAgIGxldCBiYXNlRmlsZTogdHMuU291cmNlRmlsZXx1bmRlZmluZWQ7XG4gICAgaWYgKGdlbkZpbGUpIHtcbiAgICAgIGJhc2VGaWxlID0gdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZShnZW5GaWxlLnNyY0ZpbGVVcmwpO1xuICAgICAgaWYgKGJhc2VGaWxlKSB7XG4gICAgICAgIGlmICghdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcykge1xuICAgICAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZ2VuRmlsZS5nZW5GaWxlVXJsLmVuZHNXaXRoKCcubmdzdW1tYXJ5Lmpzb24nKSAmJiBiYXNlRmlsZS5maWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMucHVzaCh7XG4gICAgICAgICAgICBmaWxlTmFtZTogYmFzZUZpbGUuZmlsZU5hbWUsXG4gICAgICAgICAgICB0ZXh0OiBiYXNlRmlsZS50ZXh0LFxuICAgICAgICAgICAgc291cmNlRmlsZTogYmFzZUZpbGUsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5wdXNoKHtmaWxlTmFtZTogZ2VuRmlsZS5nZW5GaWxlVXJsLCB0ZXh0OiBvdXREYXRhfSk7XG4gICAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuZGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgIC8vIElmIHdlIGRvbid0IGVtaXQgZGVjbGFyYXRpb25zLCBzdGlsbCByZWNvcmQgYW4gZW1wdHkgLm5nZmFjdG9yeS5kLnRzIGZpbGUsXG4gICAgICAgICAgICAvLyBhcyB3ZSBtaWdodCBuZWVkIGl0IGxhdGVyIG9uIGZvciByZXNvbHZpbmcgbW9kdWxlIG5hbWVzIGZyb20gc3VtbWFyaWVzLlxuICAgICAgICAgICAgY29uc3QgbmdGYWN0b3J5RHRzID1cbiAgICAgICAgICAgICAgICBnZW5GaWxlLmdlbkZpbGVVcmwuc3Vic3RyaW5nKDAsIGdlbkZpbGUuZ2VuRmlsZVVybC5sZW5ndGggLSAxNSkgKyAnLm5nZmFjdG9yeS5kLnRzJztcbiAgICAgICAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMucHVzaCh7ZmlsZU5hbWU6IG5nRmFjdG9yeUR0cywgdGV4dDogJyd9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAob3V0RmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJykgJiYgYmFzZUZpbGUuZmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJykpIHtcbiAgICAgICAgICBjb25zdCBkdHNTb3VyY2VGaWxlUGF0aCA9IGdlbkZpbGUuZ2VuRmlsZVVybC5yZXBsYWNlKC9cXC50cyQvLCAnLmQudHMnKTtcbiAgICAgICAgICAvLyBOb3RlOiBEb24ndCB1c2Ugc291cmNlRmlsZXMgaGVyZSBhcyB0aGUgY3JlYXRlZCAuZC50cyBoYXMgYSBwYXRoIGluIHRoZSBvdXREaXIsXG4gICAgICAgICAgLy8gYnV0IHdlIG5lZWQgb25lIHRoYXQgaXMgbmV4dCB0byB0aGUgLnRzIGZpbGVcbiAgICAgICAgICB0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzLnB1c2goe2ZpbGVOYW1lOiBkdHNTb3VyY2VGaWxlUGF0aCwgdGV4dDogb3V0RGF0YX0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEZpbHRlciBvdXQgZ2VuZXJhdGVkIGZpbGVzIGZvciB3aGljaCB3ZSBkaWRuJ3QgZ2VuZXJhdGUgY29kZS5cbiAgICAvLyBUaGlzIGNhbiBoYXBwZW4gYXMgdGhlIHN0dWIgY2FsY3VsYXRpb24gaXMgbm90IGNvbXBsZXRlbHkgZXhhY3QuXG4gICAgLy8gTm90ZTogc291cmNlRmlsZSByZWZlcnMgdG8gdGhlIC5uZ2ZhY3RvcnkudHMgLyAubmdzdW1tYXJ5LnRzIGZpbGVcbiAgICAvLyBub2RlX2VtaXR0ZXJfdHJhbnNmb3JtIGFscmVhZHkgc2V0IHRoZSBmaWxlIGNvbnRlbnRzIHRvIGJlIGVtcHR5LFxuICAgIC8vICBzbyB0aGlzIGNvZGUgb25seSBuZWVkcyB0byBza2lwIHRoZSBmaWxlIGlmICFhbGxvd0VtcHR5Q29kZWdlbkZpbGVzLlxuICAgIGNvbnN0IGlzR2VuZXJhdGVkID0gR0VORVJBVEVEX0ZJTEVTLnRlc3Qob3V0RmlsZU5hbWUpO1xuICAgIGlmIChpc0dlbmVyYXRlZCAmJiAhdGhpcy5vcHRpb25zLmFsbG93RW1wdHlDb2RlZ2VuRmlsZXMgJiZcbiAgICAgICAgKCFnZW5GaWxlIHx8ICFnZW5GaWxlLnN0bXRzIHx8IGdlbkZpbGUuc3RtdHMubGVuZ3RoID09PSAwKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoYmFzZUZpbGUpIHtcbiAgICAgIHNvdXJjZUZpbGVzID0gc291cmNlRmlsZXMgPyBbLi4uc291cmNlRmlsZXMsIGJhc2VGaWxlXSA6IFtiYXNlRmlsZV07XG4gICAgfVxuICAgIC8vIFRPRE86IHJlbW92ZSBhbnkgd2hlbiBUUyAyLjQgc3VwcG9ydCBpcyByZW1vdmVkLlxuICAgIHRoaXMuaG9zdC53cml0ZUZpbGUob3V0RmlsZU5hbWUsIG91dERhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMgYXMgYW55KTtcbiAgfVxufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgZ2l2ZW4gdmVyc2lvbiDiiIggW21pblZlcnNpb24sIG1heFZlcnNpb25bXG4gKiBBbiBlcnJvciB3aWxsIGJlIHRocm93biBpZiB0aGUgZm9sbG93aW5nIHN0YXRlbWVudHMgYXJlIHNpbXVsdGFuZW91c2x5IHRydWU6XG4gKiAtIHRoZSBnaXZlbiB2ZXJzaW9uIOKIiSBbbWluVmVyc2lvbiwgbWF4VmVyc2lvblssXG4gKiAtIHRoZSByZXN1bHQgb2YgdGhlIHZlcnNpb24gY2hlY2sgaXMgbm90IG1lYW50IHRvIGJlIGJ5cGFzc2VkICh0aGUgcGFyYW1ldGVyIGRpc2FibGVWZXJzaW9uQ2hlY2tcbiAqIGlzIGZhbHNlKVxuICpcbiAqIEBwYXJhbSB2ZXJzaW9uIFRoZSB2ZXJzaW9uIG9uIHdoaWNoIHRoZSBjaGVjayB3aWxsIGJlIHBlcmZvcm1lZFxuICogQHBhcmFtIG1pblZlcnNpb24gVGhlIGxvd2VyIGJvdW5kIHZlcnNpb24uIEEgdmFsaWQgdmVyc2lvbiBuZWVkcyB0byBiZSBncmVhdGVyIHRoYW4gbWluVmVyc2lvblxuICogQHBhcmFtIG1heFZlcnNpb24gVGhlIHVwcGVyIGJvdW5kIHZlcnNpb24uIEEgdmFsaWQgdmVyc2lvbiBuZWVkcyB0byBiZSBzdHJpY3RseSBsZXNzIHRoYW5cbiAqIG1heFZlcnNpb25cbiAqIEBwYXJhbSBkaXNhYmxlVmVyc2lvbkNoZWNrIEluZGljYXRlcyB3aGV0aGVyIHZlcnNpb24gY2hlY2sgc2hvdWxkIGJlIGJ5cGFzc2VkXG4gKlxuICogQHRocm93cyBXaWxsIHRocm93IGFuIGVycm9yIGlmIHRoZSBmb2xsb3dpbmcgc3RhdGVtZW50cyBhcmUgc2ltdWx0YW5lb3VzbHkgdHJ1ZTpcbiAqIC0gdGhlIGdpdmVuIHZlcnNpb24g4oiJIFttaW5WZXJzaW9uLCBtYXhWZXJzaW9uWyxcbiAqIC0gdGhlIHJlc3VsdCBvZiB0aGUgdmVyc2lvbiBjaGVjayBpcyBub3QgbWVhbnQgdG8gYmUgYnlwYXNzZWQgKHRoZSBwYXJhbWV0ZXIgZGlzYWJsZVZlcnNpb25DaGVja1xuICogaXMgZmFsc2UpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja1ZlcnNpb24oXG4gICAgdmVyc2lvbjogc3RyaW5nLCBtaW5WZXJzaW9uOiBzdHJpbmcsIG1heFZlcnNpb246IHN0cmluZyxcbiAgICBkaXNhYmxlVmVyc2lvbkNoZWNrOiBib29sZWFuIHwgdW5kZWZpbmVkKSB7XG4gIGlmICgoY29tcGFyZVZlcnNpb25zKHZlcnNpb24sIG1pblZlcnNpb24pIDwgMCB8fCBjb21wYXJlVmVyc2lvbnModmVyc2lvbiwgbWF4VmVyc2lvbikgPj0gMCkgJiZcbiAgICAgICFkaXNhYmxlVmVyc2lvbkNoZWNrKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVGhlIEFuZ3VsYXIgQ29tcGlsZXIgcmVxdWlyZXMgVHlwZVNjcmlwdCA+PSR7bWluVmVyc2lvbn0gYW5kIDwke21heFZlcnNpb259IGJ1dCAke3ZlcnNpb259IHdhcyBmb3VuZCBpbnN0ZWFkLmApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm9ncmFtKHtyb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIG9sZFByb2dyYW19OiB7XG4gIHJvb3ROYW1lczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsXG4gIGhvc3Q6IENvbXBpbGVySG9zdCwgb2xkUHJvZ3JhbT86IFByb2dyYW1cbn0pOiBQcm9ncmFtIHtcbiAgaWYgKG9wdGlvbnMuZW5hYmxlSXZ5ID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIG5ldyBOZ3RzY1Byb2dyYW0ocm9vdE5hbWVzLCBvcHRpb25zLCBob3N0LCBvbGRQcm9ncmFtKTtcbiAgfSBlbHNlIGlmIChvcHRpb25zLmVuYWJsZUl2eSA9PT0gJ3RzYycpIHtcbiAgICByZXR1cm4gbmV3IFRzY1Bhc3NUaHJvdWdoUHJvZ3JhbShyb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIG9sZFByb2dyYW0pO1xuICB9XG4gIHJldHVybiBuZXcgQW5ndWxhckNvbXBpbGVyUHJvZ3JhbShyb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIG9sZFByb2dyYW0pO1xufVxuXG4vLyBDb21wdXRlIHRoZSBBb3RDb21waWxlciBvcHRpb25zXG5mdW5jdGlvbiBnZXRBb3RDb21waWxlck9wdGlvbnMob3B0aW9uczogQ29tcGlsZXJPcHRpb25zKTogQW90Q29tcGlsZXJPcHRpb25zIHtcbiAgbGV0IG1pc3NpbmdUcmFuc2xhdGlvbiA9IGNvcmUuTWlzc2luZ1RyYW5zbGF0aW9uU3RyYXRlZ3kuV2FybmluZztcblxuICBzd2l0Y2ggKG9wdGlvbnMuaTE4bkluTWlzc2luZ1RyYW5zbGF0aW9ucykge1xuICAgIGNhc2UgJ2lnbm9yZSc6XG4gICAgICBtaXNzaW5nVHJhbnNsYXRpb24gPSBjb3JlLk1pc3NpbmdUcmFuc2xhdGlvblN0cmF0ZWd5Lklnbm9yZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgIG1pc3NpbmdUcmFuc2xhdGlvbiA9IGNvcmUuTWlzc2luZ1RyYW5zbGF0aW9uU3RyYXRlZ3kuRXJyb3I7XG4gICAgICBicmVhaztcbiAgfVxuXG4gIGxldCB0cmFuc2xhdGlvbnM6IHN0cmluZyA9ICcnO1xuXG4gIGlmIChvcHRpb25zLmkxOG5JbkZpbGUpIHtcbiAgICBpZiAoIW9wdGlvbnMuaTE4bkluTG9jYWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSB0cmFuc2xhdGlvbiBmaWxlICgke29wdGlvbnMuaTE4bkluRmlsZX0pIGxvY2FsZSBtdXN0IGJlIHByb3ZpZGVkLmApO1xuICAgIH1cbiAgICB0cmFuc2xhdGlvbnMgPSBmcy5yZWFkRmlsZVN5bmMob3B0aW9ucy5pMThuSW5GaWxlLCAndXRmOCcpO1xuICB9IGVsc2Uge1xuICAgIC8vIE5vIHRyYW5zbGF0aW9ucyBhcmUgcHJvdmlkZWQsIGlnbm9yZSBhbnkgZXJyb3JzXG4gICAgLy8gV2Ugc3RpbGwgZ28gdGhyb3VnaCBpMThuIHRvIHJlbW92ZSBpMThuIGF0dHJpYnV0ZXNcbiAgICBtaXNzaW5nVHJhbnNsYXRpb24gPSBjb3JlLk1pc3NpbmdUcmFuc2xhdGlvblN0cmF0ZWd5Lklnbm9yZTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbG9jYWxlOiBvcHRpb25zLmkxOG5JbkxvY2FsZSxcbiAgICBpMThuRm9ybWF0OiBvcHRpb25zLmkxOG5JbkZvcm1hdCB8fCBvcHRpb25zLmkxOG5PdXRGb3JtYXQsXG4gICAgaTE4blVzZUV4dGVybmFsSWRzOiBvcHRpb25zLmkxOG5Vc2VFeHRlcm5hbElkcywgdHJhbnNsYXRpb25zLCBtaXNzaW5nVHJhbnNsYXRpb24sXG4gICAgZW5hYmxlU3VtbWFyaWVzRm9ySml0OiBvcHRpb25zLmVuYWJsZVN1bW1hcmllc0ZvckppdCxcbiAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBvcHRpb25zLnByZXNlcnZlV2hpdGVzcGFjZXMsXG4gICAgZnVsbFRlbXBsYXRlVHlwZUNoZWNrOiBvcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjayxcbiAgICBhbGxvd0VtcHR5Q29kZWdlbkZpbGVzOiBvcHRpb25zLmFsbG93RW1wdHlDb2RlZ2VuRmlsZXMsXG4gICAgZW5hYmxlSXZ5OiBvcHRpb25zLmVuYWJsZUl2eSxcbiAgICBjcmVhdGVFeHRlcm5hbFN5bWJvbEZhY3RvcnlSZWV4cG9ydHM6IG9wdGlvbnMuY3JlYXRlRXh0ZXJuYWxTeW1ib2xGYWN0b3J5UmVleHBvcnRzLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXROZ09wdGlvbkRpYWdub3N0aWNzKG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyk6IFJlYWRvbmx5QXJyYXk8RGlhZ25vc3RpYz4ge1xuICBpZiAob3B0aW9ucy5hbm5vdGF0aW9uc0FzKSB7XG4gICAgc3dpdGNoIChvcHRpb25zLmFubm90YXRpb25zQXMpIHtcbiAgICAgIGNhc2UgJ2RlY29yYXRvcnMnOlxuICAgICAgY2FzZSAnc3RhdGljIGZpZWxkcyc6XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIFt7XG4gICAgICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgICAgICdBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbnMgXCJhbm5vdGF0aW9uc0FzXCIgb25seSBzdXBwb3J0cyBcInN0YXRpYyBmaWVsZHNcIiBhbmQgXCJkZWNvcmF0b3JzXCInLFxuICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICAgICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFXG4gICAgICAgIH1dO1xuICAgIH1cbiAgfVxuICByZXR1cm4gW107XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVNlcGFyYXRvcnMocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGNhbiBhZGp1c3QgYSBwYXRoIGZyb20gc291cmNlIHBhdGggdG8gb3V0IHBhdGgsXG4gKiBiYXNlZCBvbiBhbiBleGlzdGluZyBtYXBwaW5nIGZyb20gc291cmNlIHRvIG91dCBwYXRoLlxuICpcbiAqIFRPRE8odGJvc2NoKTogdGFsayB0byB0aGUgVHlwZVNjcmlwdCB0ZWFtIHRvIGV4cG9zZSB0aGVpciBsb2dpYyBmb3IgY2FsY3VsYXRpbmcgdGhlIGByb290RGlyYFxuICogaWYgbm9uZSB3YXMgc3BlY2lmaWVkLlxuICpcbiAqIE5vdGU6IFRoaXMgZnVuY3Rpb24gd29ya3Mgb24gbm9ybWFsaXplZCBwYXRocyBmcm9tIHR5cGVzY3JpcHQgYnV0IHNob3VsZCBhbHdheXMgcmV0dXJuXG4gKiBQT1NJWCBub3JtYWxpemVkIHBhdGhzIGZvciBvdXRwdXQgcGF0aHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTcmNUb091dFBhdGhNYXBwZXIoXG4gICAgb3V0RGlyOiBzdHJpbmcgfCB1bmRlZmluZWQsIHNhbXBsZVNyY0ZpbGVOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgc2FtcGxlT3V0RmlsZU5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgaG9zdDoge1xuICAgICAgZGlybmFtZTogdHlwZW9mIHBhdGguZGlybmFtZSxcbiAgICAgIHJlc29sdmU6IHR5cGVvZiBwYXRoLnJlc29sdmUsXG4gICAgICByZWxhdGl2ZTogdHlwZW9mIHBhdGgucmVsYXRpdmVcbiAgICB9ID0gcGF0aCk6IChzcmNGaWxlTmFtZTogc3RyaW5nKSA9PiBzdHJpbmcge1xuICBpZiAob3V0RGlyKSB7XG4gICAgbGV0IHBhdGg6IHt9ID0ge307ICAvLyBFbnN1cmUgd2UgZXJyb3IgaWYgd2UgdXNlIGBwYXRoYCBpbnN0ZWFkIG9mIGBob3N0YC5cbiAgICBpZiAoc2FtcGxlU3JjRmlsZU5hbWUgPT0gbnVsbCB8fCBzYW1wbGVPdXRGaWxlTmFtZSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IGNhbGN1bGF0ZSB0aGUgcm9vdERpciB3aXRob3V0IGEgc2FtcGxlIHNyY0ZpbGVOYW1lIC8gb3V0RmlsZU5hbWUuIGApO1xuICAgIH1cbiAgICBjb25zdCBzcmNGaWxlRGlyID0gbm9ybWFsaXplU2VwYXJhdG9ycyhob3N0LmRpcm5hbWUoc2FtcGxlU3JjRmlsZU5hbWUpKTtcbiAgICBjb25zdCBvdXRGaWxlRGlyID0gbm9ybWFsaXplU2VwYXJhdG9ycyhob3N0LmRpcm5hbWUoc2FtcGxlT3V0RmlsZU5hbWUpKTtcbiAgICBpZiAoc3JjRmlsZURpciA9PT0gb3V0RmlsZURpcikge1xuICAgICAgcmV0dXJuIChzcmNGaWxlTmFtZSkgPT4gc3JjRmlsZU5hbWU7XG4gICAgfVxuICAgIC8vIGNhbGN1bGF0ZSB0aGUgY29tbW9uIHN1ZmZpeCwgc3RvcHBpbmdcbiAgICAvLyBhdCBgb3V0RGlyYC5cbiAgICBjb25zdCBzcmNEaXJQYXJ0cyA9IHNyY0ZpbGVEaXIuc3BsaXQoJy8nKTtcbiAgICBjb25zdCBvdXREaXJQYXJ0cyA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMoaG9zdC5yZWxhdGl2ZShvdXREaXIsIG91dEZpbGVEaXIpKS5zcGxpdCgnLycpO1xuICAgIGxldCBpID0gMDtcbiAgICB3aGlsZSAoaSA8IE1hdGgubWluKHNyY0RpclBhcnRzLmxlbmd0aCwgb3V0RGlyUGFydHMubGVuZ3RoKSAmJlxuICAgICAgICAgICBzcmNEaXJQYXJ0c1tzcmNEaXJQYXJ0cy5sZW5ndGggLSAxIC0gaV0gPT09IG91dERpclBhcnRzW291dERpclBhcnRzLmxlbmd0aCAtIDEgLSBpXSlcbiAgICAgIGkrKztcbiAgICBjb25zdCByb290RGlyID0gc3JjRGlyUGFydHMuc2xpY2UoMCwgc3JjRGlyUGFydHMubGVuZ3RoIC0gaSkuam9pbignLycpO1xuICAgIHJldHVybiAoc3JjRmlsZU5hbWUpID0+IHtcbiAgICAgIC8vIE5vdGU6IEJlZm9yZSB3ZSByZXR1cm4gdGhlIG1hcHBlZCBvdXRwdXQgcGF0aCwgd2UgbmVlZCB0byBub3JtYWxpemUgdGhlIHBhdGggZGVsaW1pdGVyc1xuICAgICAgLy8gYmVjYXVzZSB0aGUgb3V0cHV0IHBhdGggaXMgdXN1YWxseSBwYXNzZWQgdG8gVHlwZVNjcmlwdCB3aGljaCBzb21ldGltZXMgb25seSBleHBlY3RzXG4gICAgICAvLyBwb3NpeCBub3JtYWxpemVkIHBhdGhzIChlLmcuIGlmIGEgY3VzdG9tIGNvbXBpbGVyIGhvc3QgaXMgdXNlZClcbiAgICAgIHJldHVybiBub3JtYWxpemVTZXBhcmF0b3JzKGhvc3QucmVzb2x2ZShvdXREaXIsIGhvc3QucmVsYXRpdmUocm9vdERpciwgc3JjRmlsZU5hbWUpKSk7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICAvLyBOb3RlOiBCZWZvcmUgd2UgcmV0dXJuIHRoZSBvdXRwdXQgcGF0aCwgd2UgbmVlZCB0byBub3JtYWxpemUgdGhlIHBhdGggZGVsaW1pdGVycyBiZWNhdXNlXG4gICAgLy8gdGhlIG91dHB1dCBwYXRoIGlzIHVzdWFsbHkgcGFzc2VkIHRvIFR5cGVTY3JpcHQgd2hpY2ggb25seSBwYXNzZXMgYXJvdW5kIHBvc2l4XG4gICAgLy8gbm9ybWFsaXplZCBwYXRocyAoZS5nLiBpZiBhIGN1c3RvbSBjb21waWxlciBob3N0IGlzIHVzZWQpXG4gICAgcmV0dXJuIChzcmNGaWxlTmFtZSkgPT4gbm9ybWFsaXplU2VwYXJhdG9ycyhzcmNGaWxlTmFtZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGkxOG5FeHRyYWN0KFxuICAgIGZvcm1hdE5hbWU6IHN0cmluZyB8IG51bGwsIG91dEZpbGU6IHN0cmluZyB8IG51bGwsIGhvc3Q6IHRzLkNvbXBpbGVySG9zdCxcbiAgICBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsIGJ1bmRsZTogTWVzc2FnZUJ1bmRsZSk6IHN0cmluZ1tdIHtcbiAgZm9ybWF0TmFtZSA9IGZvcm1hdE5hbWUgfHwgJ3hsZic7XG4gIC8vIENoZWNrcyB0aGUgZm9ybWF0IGFuZCByZXR1cm5zIHRoZSBleHRlbnNpb25cbiAgY29uc3QgZXh0ID0gaTE4bkdldEV4dGVuc2lvbihmb3JtYXROYW1lKTtcbiAgY29uc3QgY29udGVudCA9IGkxOG5TZXJpYWxpemUoYnVuZGxlLCBmb3JtYXROYW1lLCBvcHRpb25zKTtcbiAgY29uc3QgZHN0RmlsZSA9IG91dEZpbGUgfHwgYG1lc3NhZ2VzLiR7ZXh0fWA7XG4gIGNvbnN0IGRzdFBhdGggPSBwYXRoLnJlc29sdmUob3B0aW9ucy5vdXREaXIgfHwgb3B0aW9ucy5iYXNlUGF0aCAhLCBkc3RGaWxlKTtcbiAgaG9zdC53cml0ZUZpbGUoZHN0UGF0aCwgY29udGVudCwgZmFsc2UsIHVuZGVmaW5lZCwgW10pO1xuICByZXR1cm4gW2RzdFBhdGhdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaTE4blNlcmlhbGl6ZShcbiAgICBidW5kbGU6IE1lc3NhZ2VCdW5kbGUsIGZvcm1hdE5hbWU6IHN0cmluZywgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3QgZm9ybWF0ID0gZm9ybWF0TmFtZS50b0xvd2VyQ2FzZSgpO1xuICBsZXQgc2VyaWFsaXplcjogU2VyaWFsaXplcjtcblxuICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgIGNhc2UgJ3htYic6XG4gICAgICBzZXJpYWxpemVyID0gbmV3IFhtYigpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAneGxpZmYyJzpcbiAgICBjYXNlICd4bGYyJzpcbiAgICAgIHNlcmlhbGl6ZXIgPSBuZXcgWGxpZmYyKCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICd4bGYnOlxuICAgIGNhc2UgJ3hsaWZmJzpcbiAgICBkZWZhdWx0OlxuICAgICAgc2VyaWFsaXplciA9IG5ldyBYbGlmZigpO1xuICB9XG5cbiAgcmV0dXJuIGJ1bmRsZS53cml0ZShzZXJpYWxpemVyLCBnZXRQYXRoTm9ybWFsaXplcihvcHRpb25zLmJhc2VQYXRoKSk7XG59XG5cbmZ1bmN0aW9uIGdldFBhdGhOb3JtYWxpemVyKGJhc2VQYXRoPzogc3RyaW5nKSB7XG4gIC8vIG5vcm1hbGl6ZSBzb3VyY2UgcGF0aHMgYnkgcmVtb3ZpbmcgdGhlIGJhc2UgcGF0aCBhbmQgYWx3YXlzIHVzaW5nIFwiL1wiIGFzIGEgc2VwYXJhdG9yXG4gIHJldHVybiAoc291cmNlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgc291cmNlUGF0aCA9IGJhc2VQYXRoID8gcGF0aC5yZWxhdGl2ZShiYXNlUGF0aCwgc291cmNlUGF0aCkgOiBzb3VyY2VQYXRoO1xuICAgIHJldHVybiBzb3VyY2VQYXRoLnNwbGl0KHBhdGguc2VwKS5qb2luKCcvJyk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpMThuR2V0RXh0ZW5zaW9uKGZvcm1hdE5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGZvcm1hdCA9IGZvcm1hdE5hbWUudG9Mb3dlckNhc2UoKTtcblxuICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgIGNhc2UgJ3htYic6XG4gICAgICByZXR1cm4gJ3htYic7XG4gICAgY2FzZSAneGxmJzpcbiAgICBjYXNlICd4bGlmJzpcbiAgICBjYXNlICd4bGlmZic6XG4gICAgY2FzZSAneGxmMic6XG4gICAgY2FzZSAneGxpZmYyJzpcbiAgICAgIHJldHVybiAneGxmJztcbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgZm9ybWF0IFwiJHtmb3JtYXROYW1lfVwiYCk7XG59XG5cbmZ1bmN0aW9uIG1lcmdlRW1pdFJlc3VsdHMoZW1pdFJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSk6IHRzLkVtaXRSZXN1bHQge1xuICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIGxldCBlbWl0U2tpcHBlZCA9IGZhbHNlO1xuICBjb25zdCBlbWl0dGVkRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgZXIgb2YgZW1pdFJlc3VsdHMpIHtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmVyLmRpYWdub3N0aWNzKTtcbiAgICBlbWl0U2tpcHBlZCA9IGVtaXRTa2lwcGVkIHx8IGVyLmVtaXRTa2lwcGVkO1xuICAgIGVtaXR0ZWRGaWxlcy5wdXNoKC4uLihlci5lbWl0dGVkRmlsZXMgfHwgW10pKTtcbiAgfVxuICByZXR1cm4ge2RpYWdub3N0aWNzLCBlbWl0U2tpcHBlZCwgZW1pdHRlZEZpbGVzfTtcbn1cblxuZnVuY3Rpb24gZGlhZ25vc3RpY1NvdXJjZU9mU3BhbihzcGFuOiBQYXJzZVNvdXJjZVNwYW4pOiB0cy5Tb3VyY2VGaWxlIHtcbiAgLy8gRm9yIGRpYWdub3N0aWNzLCBUeXBlU2NyaXB0IG9ubHkgdXNlcyB0aGUgZmlsZU5hbWUgYW5kIHRleHQgcHJvcGVydGllcy5cbiAgLy8gVGhlIHJlZHVuZGFudCAnKCknIGFyZSBoZXJlIGlzIHRvIGF2b2lkIGhhdmluZyBjbGFuZy1mb3JtYXQgYnJlYWtpbmcgdGhlIGxpbmUgaW5jb3JyZWN0bHkuXG4gIHJldHVybiAoeyBmaWxlTmFtZTogc3Bhbi5zdGFydC5maWxlLnVybCwgdGV4dDogc3Bhbi5zdGFydC5maWxlLmNvbnRlbnQgfSBhcyBhbnkpO1xufVxuXG5mdW5jdGlvbiBkaWFnbm9zdGljU291cmNlT2ZGaWxlTmFtZShmaWxlTmFtZTogc3RyaW5nLCBwcm9ncmFtOiB0cy5Qcm9ncmFtKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IHNvdXJjZUZpbGUgPSBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICBpZiAoc291cmNlRmlsZSkgcmV0dXJuIHNvdXJjZUZpbGU7XG5cbiAgLy8gSWYgd2UgYXJlIHJlcG9ydGluZyBkaWFnbm9zdGljcyBmb3IgYSBzb3VyY2UgZmlsZSB0aGF0IGlzIG5vdCBpbiB0aGUgcHJvamVjdCB0aGVuIHdlIG5lZWRcbiAgLy8gdG8gZmFrZSBhIHNvdXJjZSBmaWxlIHNvIHRoZSBkaWFnbm9zdGljIGZvcm1hdHRpbmcgcm91dGluZXMgY2FuIGVtaXQgdGhlIGZpbGUgbmFtZS5cbiAgLy8gVGhlIHJlZHVuZGFudCAnKCknIGFyZSBoZXJlIGlzIHRvIGF2b2lkIGhhdmluZyBjbGFuZy1mb3JtYXQgYnJlYWtpbmcgdGhlIGxpbmUgaW5jb3JyZWN0bHkuXG4gIHJldHVybiAoeyBmaWxlTmFtZSwgdGV4dDogJycgfSBhcyBhbnkpO1xufVxuXG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNDaGFpbkZyb21Gb3JtYXR0ZWREaWFnbm9zdGljQ2hhaW4oY2hhaW46IEZvcm1hdHRlZE1lc3NhZ2VDaGFpbik6XG4gICAgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIHJldHVybiB7XG4gICAgbWVzc2FnZVRleHQ6IGNoYWluLm1lc3NhZ2UsXG4gICAgbmV4dDogY2hhaW4ubmV4dCAmJiBkaWFnbm9zdGljQ2hhaW5Gcm9tRm9ybWF0dGVkRGlhZ25vc3RpY0NoYWluKGNoYWluLm5leHQpLFxuICAgIHBvc2l0aW9uOiBjaGFpbi5wb3NpdGlvblxuICB9O1xufVxuXG5mdW5jdGlvbiBzeW50YXhFcnJvclRvRGlhZ25vc3RpY3MoZXJyb3I6IEVycm9yKTogRGlhZ25vc3RpY1tdIHtcbiAgY29uc3QgcGFyc2VyRXJyb3JzID0gZ2V0UGFyc2VFcnJvcnMoZXJyb3IpO1xuICBpZiAocGFyc2VyRXJyb3JzICYmIHBhcnNlckVycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4gcGFyc2VyRXJyb3JzLm1hcDxEaWFnbm9zdGljPihlID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlVGV4dDogZS5jb250ZXh0dWFsTWVzc2FnZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZTogZGlhZ25vc3RpY1NvdXJjZU9mU3BhbihlLnNwYW4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IGUuc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZW5ndGg6IGUuc3Bhbi5lbmQub2Zmc2V0IC0gZS5zcGFuLnN0YXJ0Lm9mZnNldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgfSBlbHNlIGlmIChpc0Zvcm1hdHRlZEVycm9yKGVycm9yKSkge1xuICAgIHJldHVybiBbe1xuICAgICAgbWVzc2FnZVRleHQ6IGVycm9yLm1lc3NhZ2UsXG4gICAgICBjaGFpbjogZXJyb3IuY2hhaW4gJiYgZGlhZ25vc3RpY0NoYWluRnJvbUZvcm1hdHRlZERpYWdub3N0aWNDaGFpbihlcnJvci5jaGFpbiksXG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREUsXG4gICAgICBwb3NpdGlvbjogZXJyb3IucG9zaXRpb25cbiAgICB9XTtcbiAgfVxuICAvLyBQcm9kdWNlIGEgRGlhZ25vc3RpYyBhbnl3YXkgc2luY2Ugd2Uga25vdyBmb3Igc3VyZSBgZXJyb3JgIGlzIGEgU3ludGF4RXJyb3JcbiAgcmV0dXJuIFt7XG4gICAgbWVzc2FnZVRleHQ6IGVycm9yLm1lc3NhZ2UsXG4gICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREUsXG4gICAgc291cmNlOiBTT1VSQ0UsXG4gIH1dO1xufVxuIl19