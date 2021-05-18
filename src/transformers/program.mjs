/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { core, createAotCompiler, getMissingNgModuleMetadataErrorData, getParseErrors, isFormattedError, isSyntaxError, Xliff, Xliff2, Xmb } from '@angular/compiler';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { translateDiagnostics } from '../diagnostics/translate_diagnostics';
import { createBundleIndexHost, MetadataCollector } from '../metadata';
import { isAngularCorePackage } from '../ngtsc/core/src/compiler';
import { NgtscProgram } from '../ngtsc/program';
import { TypeScriptReflectionHost } from '../ngtsc/reflection';
import { verifySupportedTypeScriptVersion } from '../typescript_support';
import { DEFAULT_ERROR_CODE, EmitFlags, SOURCE } from './api';
import { getOriginalReferences, TsCompilerAotCompilerTypeCheckHostAdapter } from './compiler_host';
import { getDownlevelDecoratorsTransform } from './downlevel_decorators_transform';
import { getInlineResourcesTransformFactory, InlineResourcesMetadataTransformer } from './inline_resources';
import { getExpressionLoweringTransformFactory, LowerMetadataTransform } from './lower_expressions';
import { MetadataCache } from './metadata_cache';
import { getAngularEmitterTransformFactory } from './node_emitter_transform';
import { PartialModuleMetadataTransformer } from './r3_metadata_transform';
import { getAngularClassTransformerFactory } from './r3_transform';
import { createMessageDiagnostic, DTS, GENERATED_FILES, isInRootDir, ngToTsDiagnostic, TS, tsStructureIsReused } from './util';
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
/**
 * Installs a handler for testing purposes to allow inspection of the temporary program.
 */
let tempProgramHandlerForTest = null;
export function setTempProgramHandlerForTest(handler) {
    tempProgramHandlerForTest = handler;
}
export function resetTempProgramHandlerForTest() {
    tempProgramHandlerForTest = null;
}
const emptyModules = {
    ngModules: [],
    ngModuleByPipeOrDirective: new Map(),
    files: []
};
const defaultEmitCallback = ({ program, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers }) => program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
class AngularCompilerProgram {
    constructor(rootNames, options, host, oldProgram) {
        this.options = options;
        this.host = host;
        this._optionsDiagnostics = [];
        this._transformTsDiagnostics = [];
        this._isCompilingAngularCore = null;
        this.rootNames = [...rootNames];
        if (!options.disableTypeScriptVersionCheck) {
            verifySupportedTypeScriptVersion();
        }
        this.oldTsProgram = oldProgram ? oldProgram.getTsProgram() : undefined;
        if (oldProgram) {
            this.oldProgramLibrarySummaries = oldProgram.getLibrarySummaries();
            this.oldProgramEmittedGeneratedFiles = oldProgram.getEmittedGeneratedFiles();
            this.oldProgramEmittedSourceFiles = oldProgram.getEmittedSourceFiles();
        }
        if (options.flatModuleOutFile) {
            const { host: bundleHost, indexName, errors } = createBundleIndexHost(options, this.rootNames, host, () => this.flatModuleMetadataCache);
            if (errors) {
                this._optionsDiagnostics.push(...errors.map(e => ({
                    category: e.category,
                    messageText: e.messageText,
                    source: SOURCE,
                    code: DEFAULT_ERROR_CODE
                })));
            }
            else {
                this.rootNames.push(indexName);
                this.host = bundleHost;
            }
        }
        this.loweringMetadataTransform =
            new LowerMetadataTransform(options.enableIvy !== false ? R3_LOWER_FIELDS : LOWER_FIELDS);
        this.metadataCache = this.createMetadataCache([this.loweringMetadataTransform]);
    }
    createMetadataCache(transformers) {
        return new MetadataCache(new MetadataCollector({ quotedNames: true }), !!this.options.strictMetadataEmit, transformers);
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
    getTsProgram() {
        return this.tsProgram;
    }
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
            if (!GENERATED_FILES.test(sf.fileName)) {
                diags.push(...this.tsProgram.getSemanticDiagnostics(sf, cancellationToken));
            }
        });
        return diags;
    }
    getNgSemanticDiagnostics(fileName, cancellationToken) {
        let diags = [];
        this.tsProgram.getSourceFiles().forEach(sf => {
            if (GENERATED_FILES.test(sf.fileName) && !sf.isDeclarationFile) {
                diags.push(...this.tsProgram.getSemanticDiagnostics(sf, cancellationToken));
            }
        });
        const { ng } = translateDiagnostics(this.hostAdapter, diags);
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
        if (this.options.enableIvy !== false) {
            throw new Error('Cannot run legacy compiler in ngtsc mode');
        }
        return this._emitRender2(parameters);
    }
    _emitRender2({ emitFlags = EmitFlags.Default, cancellationToken, customTransformers, emitCallback = defaultEmitCallback, mergeEmitResultsCallback = mergeEmitResults, } = {}) {
        const emitStart = Date.now();
        if (emitFlags & EmitFlags.I18nBundle) {
            const locale = this.options.i18nOutLocale || null;
            const file = this.options.i18nOutFile || null;
            const format = this.options.i18nOutFormat || null;
            const bundle = this.compiler.emitMessageBundle(this.analyzedModules, locale);
            i18nExtract(format, file, this.host, this.options, bundle);
        }
        if ((emitFlags & (EmitFlags.JS | EmitFlags.DTS | EmitFlags.Metadata | EmitFlags.Codegen)) ===
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
        this._transformTsDiagnostics = [];
        const emittedSourceFiles = [];
        const writeTsFile = (outFileName, outData, writeByteOrderMark, onError, sourceFiles) => {
            const sourceFile = sourceFiles && sourceFiles.length == 1 ? sourceFiles[0] : null;
            let genFile;
            if (sourceFile) {
                outSrcMapping.push({ outFileName: outFileName, sourceFile });
                genFile = genFileByFileName.get(sourceFile.fileName);
                if (!sourceFile.isDeclarationFile && !GENERATED_FILES.test(sourceFile.fileName)) {
                    // Note: sourceFile is the transformed sourcefile, not the original one!
                    const originalFile = this.tsProgram.getSourceFile(sourceFile.fileName);
                    if (originalFile) {
                        emittedSourceFiles.push(originalFile);
                    }
                }
            }
            this.writeFile(outFileName, outData, writeByteOrderMark, onError, genFile, sourceFiles);
        };
        const modules = this._analyzedInjectables &&
            this.compiler.emitAllPartialModules2(this._analyzedInjectables);
        const tsCustomTransformers = this.calculateTransforms(genFileByFileName, modules, customTransformers);
        const emitOnlyDtsFiles = (emitFlags & (EmitFlags.DTS | EmitFlags.JS)) == EmitFlags.DTS;
        // Restore the original references before we emit so TypeScript doesn't emit
        // a reference to the .d.ts file.
        const augmentedReferences = new Map();
        for (const sourceFile of this.tsProgram.getSourceFiles()) {
            const originalReferences = getOriginalReferences(sourceFile);
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
                    writeFile: writeTsFile,
                    emitOnlyDtsFiles,
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
                    writeFile: writeTsFile,
                    emitOnlyDtsFiles,
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
        if (emitResult && this.options.noEmitOnError === true) {
            // translate the diagnostics in the emitResult as well.
            const translatedEmitDiags = translateDiagnostics(this.hostAdapter, emitResult.diagnostics);
            emitResult.diagnostics = translatedEmitDiags.ts.concat(this.structuralDiagnostics.concat(translatedEmitDiags.ng).map(ngToTsDiagnostic));
        }
        if (emitResult && !outSrcMapping.length) {
            // if no files were emitted by TypeScript, also don't emit .json files
            emitResult.diagnostics =
                emitResult.diagnostics.concat([createMessageDiagnostic(`Emitted no files.`)]);
            return emitResult;
        }
        let sampleSrcFileName;
        let sampleOutFileName;
        if (outSrcMapping.length) {
            sampleSrcFileName = outSrcMapping[0].sourceFile.fileName;
            sampleOutFileName = outSrcMapping[0].outFileName;
        }
        const srcToOutPath = createSrcToOutPathMapper(this.options.outDir, sampleSrcFileName, sampleOutFileName);
        if (emitFlags & EmitFlags.Codegen) {
            genJsonFiles.forEach(gf => {
                const outFileName = srcToOutPath(gf.genFileUrl);
                this.writeFile(outFileName, gf.source, false, undefined, gf);
            });
        }
        let metadataJsonCount = 0;
        if (emitFlags & EmitFlags.Metadata) {
            this.tsProgram.getSourceFiles().forEach(sf => {
                if (!sf.isDeclarationFile && !GENERATED_FILES.test(sf.fileName)) {
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
        if (emitResult && this.options.diagnostics) {
            emitResult.diagnostics = emitResult.diagnostics.concat([createMessageDiagnostic([
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
    /** Whether the program is compiling the Angular core package. */
    get isCompilingAngularCore() {
        if (this._isCompilingAngularCore !== null) {
            return this._isCompilingAngularCore;
        }
        return this._isCompilingAngularCore = isAngularCorePackage(this.tsProgram);
    }
    calculateTransforms(genFiles, partialModules, customTransformers) {
        const beforeTs = [];
        const metadataTransforms = [];
        const flatModuleMetadataTransforms = [];
        const annotateForClosureCompiler = this.options.annotateForClosureCompiler || false;
        if (this.options.enableResourceInlining) {
            beforeTs.push(getInlineResourcesTransformFactory(this.tsProgram, this.hostAdapter));
            const transformer = new InlineResourcesMetadataTransformer(this.hostAdapter);
            metadataTransforms.push(transformer);
            flatModuleMetadataTransforms.push(transformer);
        }
        if (!this.options.disableExpressionLowering) {
            beforeTs.push(getExpressionLoweringTransformFactory(this.loweringMetadataTransform, this.tsProgram));
            metadataTransforms.push(this.loweringMetadataTransform);
        }
        if (genFiles) {
            beforeTs.push(getAngularEmitterTransformFactory(genFiles, this.getTsProgram(), annotateForClosureCompiler));
        }
        if (partialModules) {
            beforeTs.push(getAngularClassTransformerFactory(partialModules, annotateForClosureCompiler));
            // If we have partial modules, the cached metadata might be incorrect as it doesn't reflect
            // the partial module transforms.
            const transformer = new PartialModuleMetadataTransformer(partialModules);
            metadataTransforms.push(transformer);
            flatModuleMetadataTransforms.push(transformer);
        }
        if (customTransformers && customTransformers.beforeTs) {
            beforeTs.push(...customTransformers.beforeTs);
        }
        // If decorators should be converted to static fields (enabled by default), we set up
        // the decorator downlevel transform. Note that we set it up as last transform as that
        // allows custom transformers to strip Angular decorators without having to deal with
        // identifying static properties. e.g. it's more difficult handling `<..>.decorators`
        // or `<..>.ctorParameters` compared to the `ts.Decorator` AST nodes.
        if (this.options.annotationsAs !== 'decorators') {
            const typeChecker = this.getTsProgram().getTypeChecker();
            const reflectionHost = new TypeScriptReflectionHost(typeChecker);
            // Similarly to how we handled tsickle decorator downleveling in the past, we just
            // ignore diagnostics that have been collected by the transformer. These are
            // non-significant failures that shouldn't prevent apps from compiling.
            beforeTs.push(getDownlevelDecoratorsTransform(typeChecker, reflectionHost, [], this.isCompilingAngularCore, annotateForClosureCompiler, 
            /* skipClassDecorators */ false));
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
        this._hostAdapter = new TsCompilerAotCompilerTypeCheckHostAdapter(this.rootNames, this.options, this.host, this.metadataCache, codegen, this.oldProgramLibrarySummaries);
        const aotOptions = getAotCompilerOptions(this.options);
        const errorCollector = (this.options.collectAllErrors || this.options.fullTemplateTypeCheck) ?
            (err) => this._addStructuralDiagnostics(err) :
            undefined;
        this._compiler = createAotCompiler(this._hostAdapter, aotOptions, errorCollector).compiler;
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
            rootNames = rootNames.filter(fn => !GENERATED_FILES.test(fn));
        }
        if (this.options.noResolve) {
            this.rootNames.forEach(rootName => {
                if (this.hostAdapter.shouldGenerateFilesFor(rootName)) {
                    rootNames.push(...this.compiler.findGeneratedFileNames(rootName));
                }
            });
        }
        const tmpProgram = ts.createProgram(rootNames, this.options, this.hostAdapter, oldTsProgram);
        if (tempProgramHandlerForTest !== null) {
            tempProgramHandlerForTest(tmpProgram);
        }
        const sourceFiles = [];
        const tsFiles = [];
        tmpProgram.getSourceFiles().forEach(sf => {
            if (this.hostAdapter.isSourceFile(sf.fileName)) {
                sourceFiles.push(sf.fileName);
            }
            if (TS.test(sf.fileName) && !DTS.test(sf.fileName)) {
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
        if (tsStructureIsReused(this._tsProgram) !== 2 /* Completely */) {
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
        if (isSyntaxError(e)) {
            this._addStructuralDiagnostics(e);
            return;
        }
        throw e;
    }
    _addStructuralDiagnostics(error) {
        const diagnostics = this._structuralDiagnostics || (this._structuralDiagnostics = []);
        if (isSyntaxError(error)) {
            diagnostics.push(...syntaxErrorToDiagnostics(error, this.tsProgram));
        }
        else {
            diagnostics.push({
                messageText: error.toString(),
                category: ts.DiagnosticCategory.Error,
                source: SOURCE,
                code: DEFAULT_ERROR_CODE
            });
        }
    }
    // Note: this returns a ts.Diagnostic so that we
    // can return errors in a ts.EmitResult
    generateFilesForEmit(emitFlags) {
        try {
            if (!(emitFlags & EmitFlags.Codegen)) {
                return { genFiles: [], genDiags: [] };
            }
            // TODO(tbosch): allow generating files that are not in the rootDir
            // See https://github.com/angular/angular/issues/19337
            let genFiles = this.compiler.emitAllImpls(this.analyzedModules)
                .filter(genFile => isInRootDir(genFile.genFileUrl, this.options));
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
            if (isSyntaxError(e)) {
                const genDiags = [{
                        file: undefined,
                        start: undefined,
                        length: undefined,
                        messageText: e.message,
                        category: ts.DiagnosticCategory.Error,
                        source: SOURCE,
                        code: DEFAULT_ERROR_CODE
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
        let sourceFilesToEmit = this.tsProgram.getSourceFiles().filter(sf => {
            return !sf.isDeclarationFile && !GENERATED_FILES.test(sf.fileName);
        });
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
        const isGenerated = GENERATED_FILES.test(outFileName);
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
export function createProgram({ rootNames, options, host, oldProgram }) {
    if (options.enableIvy !== false) {
        return new NgtscProgram(rootNames, options, host, oldProgram);
    }
    else {
        return new AngularCompilerProgram(rootNames, options, host, oldProgram);
    }
}
// Compute the AotCompiler options
function getAotCompilerOptions(options) {
    let missingTranslation = core.MissingTranslationStrategy.Warning;
    switch (options.i18nInMissingTranslations) {
        case 'ignore':
            missingTranslation = core.MissingTranslationStrategy.Ignore;
            break;
        case 'error':
            missingTranslation = core.MissingTranslationStrategy.Error;
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
        missingTranslation = core.MissingTranslationStrategy.Ignore;
    }
    return {
        locale: options.i18nInLocale,
        i18nFormat: options.i18nInFormat || options.i18nOutFormat,
        i18nUseExternalIds: options.i18nUseExternalIds,
        translations,
        missingTranslation,
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
                        source: SOURCE,
                        code: DEFAULT_ERROR_CODE
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
export function createSrcToOutPathMapper(outDir, sampleSrcFileName, sampleOutFileName, host = path) {
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
export function i18nExtract(formatName, outFile, host, options, bundle) {
    formatName = formatName || 'xlf';
    // Checks the format and returns the extension
    const ext = i18nGetExtension(formatName);
    const content = i18nSerialize(bundle, formatName, options);
    const dstFile = outFile || `messages.${ext}`;
    const dstPath = path.resolve(options.outDir || options.basePath, dstFile);
    host.writeFile(dstPath, content, false, undefined, []);
    return [dstPath];
}
export function i18nSerialize(bundle, formatName, options) {
    const format = formatName.toLowerCase();
    let serializer;
    switch (format) {
        case 'xmb':
            serializer = new Xmb();
            break;
        case 'xliff2':
        case 'xlf2':
            serializer = new Xliff2();
            break;
        case 'xlf':
        case 'xliff':
        default:
            serializer = new Xliff();
    }
    return bundle.write(serializer, getPathNormalizer(options.basePath));
}
function getPathNormalizer(basePath) {
    // normalize source paths by removing the base path and always using "/" as a separator
    return (sourcePath) => {
        sourcePath = basePath ? path.relative(basePath, sourcePath) : sourcePath;
        return sourcePath.split(path.sep).join('/');
    };
}
export function i18nGetExtension(formatName) {
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
        next: chain.next && chain.next.map(diagnosticChainFromFormattedDiagnosticChain),
        position: chain.position
    };
}
function syntaxErrorToDiagnostics(error, program) {
    const parserErrors = getParseErrors(error);
    if (parserErrors && parserErrors.length) {
        return parserErrors.map(e => ({
            messageText: e.contextualMessage(),
            file: diagnosticSourceOfSpan(e.span),
            start: e.span.start.offset,
            length: e.span.end.offset - e.span.start.offset,
            category: ts.DiagnosticCategory.Error,
            source: SOURCE,
            code: DEFAULT_ERROR_CODE
        }));
    }
    else if (isFormattedError(error)) {
        return [{
                messageText: error.message,
                chain: error.chain && diagnosticChainFromFormattedDiagnosticChain(error.chain),
                category: ts.DiagnosticCategory.Error,
                source: SOURCE,
                code: DEFAULT_ERROR_CODE,
                position: error.position
            }];
    }
    const ngModuleErrorData = getMissingNgModuleMetadataErrorData(error);
    if (ngModuleErrorData !== null) {
        // This error represents the import or export of an `NgModule` that didn't have valid metadata.
        // This _might_ happen because the NgModule in question is an Ivy-compiled library, and we want
        // to show a more useful error if that's the case.
        const ngModuleClass = getDtsClass(program, ngModuleErrorData.fileName, ngModuleErrorData.className);
        if (ngModuleClass !== null && isIvyNgModule(ngModuleClass)) {
            return [{
                    messageText: `The NgModule '${ngModuleErrorData.className}' in '${ngModuleErrorData
                        .fileName}' is imported by this compilation, but appears to be part of a library compiled for Angular Ivy. This may occur because:

  1) the library was processed with 'ngcc'. Removing and reinstalling node_modules may fix this problem.

  2) the library was published for Angular Ivy and v12+ applications only. Check its peer dependencies carefully and ensure that you're using a compatible version of Angular.

See https://angular.io/errors/NG6999 for more information.
`,
                    category: ts.DiagnosticCategory.Error,
                    code: DEFAULT_ERROR_CODE,
                    source: SOURCE,
                }];
        }
    }
    // Produce a Diagnostic anyway since we know for sure `error` is a SyntaxError
    return [{
            messageText: error.message,
            category: ts.DiagnosticCategory.Error,
            code: DEFAULT_ERROR_CODE,
            source: SOURCE,
        }];
}
function getDtsClass(program, fileName, className) {
    const sf = program.getSourceFile(fileName);
    if (sf === undefined || !sf.isDeclarationFile) {
        return null;
    }
    for (const stmt of sf.statements) {
        if (!ts.isClassDeclaration(stmt)) {
            continue;
        }
        if (stmt.name === undefined || stmt.name.text !== className) {
            continue;
        }
        return stmt;
    }
    // No classes found that matched the given name.
    return null;
}
function isIvyNgModule(clazz) {
    for (const member of clazz.members) {
        if (!ts.isPropertyDeclaration(member)) {
            continue;
        }
        if (ts.isIdentifier(member.name) && member.name.text === 'ɵmod') {
            return true;
        }
    }
    // No Ivy 'ɵmod' property found.
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL3Byb2dyYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFrQyxJQUFJLEVBQUUsaUJBQWlCLEVBQXdDLG1DQUFtQyxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQStHLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDeFYsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFakMsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sc0NBQXNDLENBQUM7QUFDMUUsT0FBTyxFQUFDLHFCQUFxQixFQUFFLGlCQUFpQixFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ3JFLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUM5QyxPQUFPLEVBQUMsd0JBQXdCLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM3RCxPQUFPLEVBQUMsZ0NBQWdDLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUV2RSxPQUFPLEVBQW9ELGtCQUFrQixFQUFzQyxTQUFTLEVBQXNDLE1BQU0sRUFBNkMsTUFBTSxPQUFPLENBQUM7QUFDbk8sT0FBTyxFQUFnQixxQkFBcUIsRUFBRSx5Q0FBeUMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ2hILE9BQU8sRUFBQywrQkFBK0IsRUFBQyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pGLE9BQU8sRUFBQyxrQ0FBa0MsRUFBRSxrQ0FBa0MsRUFBQyxN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RUFBRSxLQUFLLFNBQVMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRTtRQUM3QyxPQUFPLElBQUksQ0FBQztLQUNiO0lBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxFQUFFLENBQUMsVUFBVSxFQUFFO1FBQ2hDLElBQUksQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDaEMsU0FBUztTQUNWO1FBQ0QsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7WUFDM0QsU0FBUztTQUNWO1FBRUQsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVELGdEQUFnRDtJQUNoRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxLQUEwQjtJQUMvQyxLQUFLLE1BQU0sTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUU7UUFDbEMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNyQyxTQUFTO1NBQ1Y7UUFDRCxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtZQUMvRCxPQUFPLElBQUksQ0FBQztTQUNiO0tBQ0Y7SUFFRCxnQ0FBZ0M7SUFDaEMsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBb3RDb21waWxlciwgQW90Q29tcGlsZXJPcHRpb25zLCBjb3JlLCBjcmVhdGVBb3RDb21waWxlciwgRm9ybWF0dGVkTWVzc2FnZUNoYWluLCBHZW5lcmF0ZWRGaWxlLCBnZXRNaXNzaW5nTmdNb2R1bGVNZXRhZGF0YUVycm9yRGF0YSwgZ2V0UGFyc2VFcnJvcnMsIGlzRm9ybWF0dGVkRXJyb3IsIGlzU3ludGF4RXJyb3IsIE1lc3NhZ2VCdW5kbGUsIE5nQW5hbHl6ZWRGaWxlV2l0aEluamVjdGFibGVzLCBOZ0FuYWx5emVkTW9kdWxlcywgUGFyc2VTb3VyY2VTcGFuLCBQYXJ0aWFsTW9kdWxlLCBTZXJpYWxpemVyLCBYbGlmZiwgWGxpZmYyLCBYbWJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHt0cmFuc2xhdGVEaWFnbm9zdGljc30gZnJvbSAnLi4vZGlhZ25vc3RpY3MvdHJhbnNsYXRlX2RpYWdub3N0aWNzJztcbmltcG9ydCB7Y3JlYXRlQnVuZGxlSW5kZXhIb3N0LCBNZXRhZGF0YUNvbGxlY3Rvcn0gZnJvbSAnLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtpc0FuZ3VsYXJDb3JlUGFja2FnZX0gZnJvbSAnLi4vbmd0c2MvY29yZS9zcmMvY29tcGlsZXInO1xuaW1wb3J0IHtOZ3RzY1Byb2dyYW19IGZyb20gJy4uL25ndHNjL3Byb2dyYW0nO1xuaW1wb3J0IHtUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHt2ZXJpZnlTdXBwb3J0ZWRUeXBlU2NyaXB0VmVyc2lvbn0gZnJvbSAnLi4vdHlwZXNjcmlwdF9zdXBwb3J0JztcblxuaW1wb3J0IHtDb21waWxlckhvc3QsIENvbXBpbGVyT3B0aW9ucywgQ3VzdG9tVHJhbnNmb3JtZXJzLCBERUZBVUxUX0VSUk9SX0NPREUsIERpYWdub3N0aWMsIERpYWdub3N0aWNNZXNzYWdlQ2hhaW4sIEVtaXRGbGFncywgTGF6eVJvdXRlLCBMaWJyYXJ5U3VtbWFyeSwgUHJvZ3JhbSwgU09VUkNFLCBUc0VtaXRDYWxsYmFjaywgVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2t9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7Q29kZUdlbmVyYXRvciwgZ2V0T3JpZ2luYWxSZWZlcmVuY2VzLCBUc0NvbXBpbGVyQW90Q29tcGlsZXJUeXBlQ2hlY2tIb3N0QWRhcHRlcn0gZnJvbSAnLi9jb21waWxlcl9ob3N0JztcbmltcG9ydCB7Z2V0RG93bmxldmVsRGVjb3JhdG9yc1RyYW5zZm9ybX0gZnJvbSAnLi9kb3dubGV2ZWxfZGVjb3JhdG9yc190cmFuc2Zvcm0nO1xuaW1wb3J0IHtnZXRJbmxpbmVSZXNvdXJjZXNUcmFuc2Zvcm1GYWN0b3J5LCBJbmxpbmVSZXNvdXJjZXNNZXRhZGF0YVRyYW5zZm9ybWVyfSBmcm9tICcuL2lubGluZV9yZXNvdXJjZXMnO1xuaW1wb3J0IHtnZXRFeHByZXNzaW9uTG93ZXJpbmdUcmFuc2Zvcm1GYWN0b3J5LCBMb3dlck1ldGFkYXRhVHJhbnNmb3JtfSBmcm9tICcuL2xvd2VyX2V4cHJlc3Npb25zJztcbmltcG9ydCB7TWV0YWRhdGFDYWNoZSwgTWV0YWRhdGFUcmFuc2Zvcm1lcn0gZnJvbSAnLi9tZXRhZGF0YV9jYWNoZSc7XG5pbXBvcnQge2dldEFuZ3VsYXJFbWl0dGVyVHJhbnNmb3JtRmFjdG9yeX0gZnJvbSAnLi9ub2RlX2VtaXR0ZXJfdHJhbnNmb3JtJztcbmltcG9ydCB7UGFydGlhbE1vZHVsZU1ldGFkYXRhVHJhbnNmb3JtZXJ9IGZyb20gJy4vcjNfbWV0YWRhdGFfdHJhbnNmb3JtJztcbmltcG9ydCB7Z2V0QW5ndWxhckNsYXNzVHJhbnNmb3JtZXJGYWN0b3J5fSBmcm9tICcuL3IzX3RyYW5zZm9ybSc7XG5pbXBvcnQge2NyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljLCBEVFMsIEdFTkVSQVRFRF9GSUxFUywgaXNJblJvb3REaXIsIG5nVG9Uc0RpYWdub3N0aWMsIFN0cnVjdHVyZUlzUmV1c2VkLCBUUywgdHNTdHJ1Y3R1cmVJc1JldXNlZH0gZnJvbSAnLi91dGlsJztcblxuXG4vKipcbiAqIE1heGltdW0gbnVtYmVyIG9mIGZpbGVzIHRoYXQgYXJlIGVtaXRhYmxlIHZpYSBjYWxsaW5nIHRzLlByb2dyYW0uZW1pdFxuICogcGFzc2luZyBpbmRpdmlkdWFsIHRhcmdldFNvdXJjZUZpbGVzLlxuICovXG5jb25zdCBNQVhfRklMRV9DT1VOVF9GT1JfU0lOR0xFX0ZJTEVfRU1JVCA9IDIwO1xuXG5cbi8qKlxuICogRmllbGRzIHRvIGxvd2VyIHdpdGhpbiBtZXRhZGF0YSBpbiByZW5kZXIyIG1vZGUuXG4gKi9cbmNvbnN0IExPV0VSX0ZJRUxEUyA9IFsndXNlVmFsdWUnLCAndXNlRmFjdG9yeScsICdkYXRhJywgJ2lkJywgJ2xvYWRDaGlsZHJlbiddO1xuXG4vKipcbiAqIEZpZWxkcyB0byBsb3dlciB3aXRoaW4gbWV0YWRhdGEgaW4gcmVuZGVyMyBtb2RlLlxuICovXG5jb25zdCBSM19MT1dFUl9GSUVMRFMgPSBbLi4uTE9XRVJfRklFTERTLCAncHJvdmlkZXJzJywgJ2ltcG9ydHMnLCAnZXhwb3J0cyddO1xuXG4vKipcbiAqIEluc3RhbGxzIGEgaGFuZGxlciBmb3IgdGVzdGluZyBwdXJwb3NlcyB0byBhbGxvdyBpbnNwZWN0aW9uIG9mIHRoZSB0ZW1wb3JhcnkgcHJvZ3JhbS5cbiAqL1xubGV0IHRlbXBQcm9ncmFtSGFuZGxlckZvclRlc3Q6ICgocHJvZ3JhbTogdHMuUHJvZ3JhbSkgPT4gdm9pZCl8bnVsbCA9IG51bGw7XG5leHBvcnQgZnVuY3Rpb24gc2V0VGVtcFByb2dyYW1IYW5kbGVyRm9yVGVzdChoYW5kbGVyOiAocHJvZ3JhbTogdHMuUHJvZ3JhbSkgPT4gdm9pZCk6IHZvaWQge1xuICB0ZW1wUHJvZ3JhbUhhbmRsZXJGb3JUZXN0ID0gaGFuZGxlcjtcbn1cbmV4cG9ydCBmdW5jdGlvbiByZXNldFRlbXBQcm9ncmFtSGFuZGxlckZvclRlc3QoKTogdm9pZCB7XG4gIHRlbXBQcm9ncmFtSGFuZGxlckZvclRlc3QgPSBudWxsO1xufVxuXG5jb25zdCBlbXB0eU1vZHVsZXM6IE5nQW5hbHl6ZWRNb2R1bGVzID0ge1xuICBuZ01vZHVsZXM6IFtdLFxuICBuZ01vZHVsZUJ5UGlwZU9yRGlyZWN0aXZlOiBuZXcgTWFwKCksXG4gIGZpbGVzOiBbXVxufTtcblxuY29uc3QgZGVmYXVsdEVtaXRDYWxsYmFjazogVHNFbWl0Q2FsbGJhY2sgPSAoe1xuICBwcm9ncmFtLFxuICB0YXJnZXRTb3VyY2VGaWxlLFxuICB3cml0ZUZpbGUsXG4gIGNhbmNlbGxhdGlvblRva2VuLFxuICBlbWl0T25seUR0c0ZpbGVzLFxuICBjdXN0b21UcmFuc2Zvcm1lcnNcbn0pID0+XG4gICAgcHJvZ3JhbS5lbWl0KFxuICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuXG5jbGFzcyBBbmd1bGFyQ29tcGlsZXJQcm9ncmFtIGltcGxlbWVudHMgUHJvZ3JhbSB7XG4gIHByaXZhdGUgcm9vdE5hbWVzOiBzdHJpbmdbXTtcbiAgcHJpdmF0ZSBtZXRhZGF0YUNhY2hlOiBNZXRhZGF0YUNhY2hlO1xuICAvLyBNZXRhZGF0YSBjYWNoZSB1c2VkIGV4Y2x1c2l2ZWx5IGZvciB0aGUgZmxhdCBtb2R1bGUgaW5kZXhcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgZmxhdE1vZHVsZU1ldGFkYXRhQ2FjaGUhOiBNZXRhZGF0YUNhY2hlO1xuICBwcml2YXRlIGxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm06IExvd2VyTWV0YWRhdGFUcmFuc2Zvcm07XG4gIHByaXZhdGUgb2xkUHJvZ3JhbUxpYnJhcnlTdW1tYXJpZXM6IE1hcDxzdHJpbmcsIExpYnJhcnlTdW1tYXJ5Pnx1bmRlZmluZWQ7XG4gIHByaXZhdGUgb2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlczogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT58dW5kZWZpbmVkO1xuICBwcml2YXRlIG9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXM6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+fHVuZGVmaW5lZDtcbiAgLy8gTm90ZTogVGhpcyB3aWxsIGJlIGNsZWFyZWQgb3V0IGFzIHNvb24gYXMgd2UgY3JlYXRlIHRoZSBfdHNQcm9ncmFtXG4gIHByaXZhdGUgb2xkVHNQcm9ncmFtOiB0cy5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBlbWl0dGVkTGlicmFyeVN1bW1hcmllczogTGlicmFyeVN1bW1hcnlbXXx1bmRlZmluZWQ7XG4gIHByaXZhdGUgZW1pdHRlZEdlbmVyYXRlZEZpbGVzOiBHZW5lcmF0ZWRGaWxlW118dW5kZWZpbmVkO1xuICBwcml2YXRlIGVtaXR0ZWRTb3VyY2VGaWxlczogdHMuU291cmNlRmlsZVtdfHVuZGVmaW5lZDtcblxuICAvLyBMYXppbHkgaW5pdGlhbGl6ZWQgZmllbGRzXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIF9jb21waWxlciE6IEFvdENvbXBpbGVyO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBfaG9zdEFkYXB0ZXIhOiBUc0NvbXBpbGVyQW90Q29tcGlsZXJUeXBlQ2hlY2tIb3N0QWRhcHRlcjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX3RzUHJvZ3JhbSE6IHRzLlByb2dyYW07XG4gIHByaXZhdGUgX2FuYWx5emVkTW9kdWxlczogTmdBbmFseXplZE1vZHVsZXN8dW5kZWZpbmVkO1xuICBwcml2YXRlIF9hbmFseXplZEluamVjdGFibGVzOiBOZ0FuYWx5emVkRmlsZVdpdGhJbmplY3RhYmxlc1tdfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfc3RydWN0dXJhbERpYWdub3N0aWNzOiBEaWFnbm9zdGljW118dW5kZWZpbmVkO1xuICBwcml2YXRlIF9wcm9ncmFtV2l0aFN0dWJzOiB0cy5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfb3B0aW9uc0RpYWdub3N0aWNzOiBEaWFnbm9zdGljW10gPSBbXTtcbiAgcHJpdmF0ZSBfdHJhbnNmb3JtVHNEaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByb290TmFtZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiwgcHJpdmF0ZSBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsXG4gICAgICBwcml2YXRlIGhvc3Q6IENvbXBpbGVySG9zdCwgb2xkUHJvZ3JhbT86IFByb2dyYW0pIHtcbiAgICB0aGlzLnJvb3ROYW1lcyA9IFsuLi5yb290TmFtZXNdO1xuXG4gICAgaWYgKCFvcHRpb25zLmRpc2FibGVUeXBlU2NyaXB0VmVyc2lvbkNoZWNrKSB7XG4gICAgICB2ZXJpZnlTdXBwb3J0ZWRUeXBlU2NyaXB0VmVyc2lvbigpO1xuICAgIH1cblxuICAgIHRoaXMub2xkVHNQcm9ncmFtID0gb2xkUHJvZ3JhbSA/IG9sZFByb2dyYW0uZ2V0VHNQcm9ncmFtKCkgOiB1bmRlZmluZWQ7XG4gICAgaWYgKG9sZFByb2dyYW0pIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUxpYnJhcnlTdW1tYXJpZXMgPSBvbGRQcm9ncmFtLmdldExpYnJhcnlTdW1tYXJpZXMoKTtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcyA9IG9sZFByb2dyYW0uZ2V0RW1pdHRlZEdlbmVyYXRlZEZpbGVzKCk7XG4gICAgICB0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMgPSBvbGRQcm9ncmFtLmdldEVtaXR0ZWRTb3VyY2VGaWxlcygpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlKSB7XG4gICAgICBjb25zdCB7aG9zdDogYnVuZGxlSG9zdCwgaW5kZXhOYW1lLCBlcnJvcnN9ID1cbiAgICAgICAgICBjcmVhdGVCdW5kbGVJbmRleEhvc3Qob3B0aW9ucywgdGhpcy5yb290TmFtZXMsIGhvc3QsICgpID0+IHRoaXMuZmxhdE1vZHVsZU1ldGFkYXRhQ2FjaGUpO1xuICAgICAgaWYgKGVycm9ycykge1xuICAgICAgICB0aGlzLl9vcHRpb25zRGlhZ25vc3RpY3MucHVzaCguLi5lcnJvcnMubWFwKGUgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVRleHQ6IGUubWVzc2FnZVRleHQgYXMgc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yb290TmFtZXMucHVzaChpbmRleE5hbWUhKTtcbiAgICAgICAgdGhpcy5ob3N0ID0gYnVuZGxlSG9zdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm0gPVxuICAgICAgICBuZXcgTG93ZXJNZXRhZGF0YVRyYW5zZm9ybShvcHRpb25zLmVuYWJsZUl2eSAhPT0gZmFsc2UgPyBSM19MT1dFUl9GSUVMRFMgOiBMT1dFUl9GSUVMRFMpO1xuICAgIHRoaXMubWV0YWRhdGFDYWNoZSA9IHRoaXMuY3JlYXRlTWV0YWRhdGFDYWNoZShbdGhpcy5sb3dlcmluZ01ldGFkYXRhVHJhbnNmb3JtXSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZU1ldGFkYXRhQ2FjaGUodHJhbnNmb3JtZXJzOiBNZXRhZGF0YVRyYW5zZm9ybWVyW10pIHtcbiAgICByZXR1cm4gbmV3IE1ldGFkYXRhQ2FjaGUoXG4gICAgICAgIG5ldyBNZXRhZGF0YUNvbGxlY3Rvcih7cXVvdGVkTmFtZXM6IHRydWV9KSwgISF0aGlzLm9wdGlvbnMuc3RyaWN0TWV0YWRhdGFFbWl0LFxuICAgICAgICB0cmFuc2Zvcm1lcnMpO1xuICB9XG5cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT4oKTtcbiAgICBpZiAodGhpcy5vbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllcykge1xuICAgICAgdGhpcy5vbGRQcm9ncmFtTGlicmFyeVN1bW1hcmllcy5mb3JFYWNoKChzdW1tYXJ5LCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChmaWxlTmFtZSwgc3VtbWFyeSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcykge1xuICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5mb3JFYWNoKFxuICAgICAgICAgIChzdW1tYXJ5LCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChzdW1tYXJ5LmZpbGVOYW1lLCBzdW1tYXJ5KSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPigpO1xuICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcy5mb3JFYWNoKFxuICAgICAgICAgIChnZW5GaWxlLCBmaWxlTmFtZSkgPT4gcmVzdWx0LnNldChmaWxlTmFtZSwgZ2VuRmlsZSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgIHRoaXMuZW1pdHRlZEdlbmVyYXRlZEZpbGVzLmZvckVhY2goKGdlbkZpbGUpID0+IHJlc3VsdC5zZXQoZ2VuRmlsZS5nZW5GaWxlVXJsLCBnZW5GaWxlKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRFbWl0dGVkU291cmNlRmlsZXMoKTogTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPigpO1xuICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMpIHtcbiAgICAgIHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRTb3VyY2VGaWxlcy5mb3JFYWNoKChzZiwgZmlsZU5hbWUpID0+IHJlc3VsdC5zZXQoZmlsZU5hbWUsIHNmKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmVtaXR0ZWRTb3VyY2VGaWxlcykge1xuICAgICAgdGhpcy5lbWl0dGVkU291cmNlRmlsZXMuZm9yRWFjaCgoc2YpID0+IHJlc3VsdC5zZXQoc2YuZmlsZU5hbWUsIHNmKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtO1xuICB9XG5cbiAgZ2V0VHNPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKSB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldE9wdGlvbnNEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gWy4uLnRoaXMuX29wdGlvbnNEaWFnbm9zdGljcywgLi4uZ2V0TmdPcHRpb25EaWFnbm9zdGljcyh0aGlzLm9wdGlvbnMpXTtcbiAgfVxuXG4gIGdldFRzU3ludGFjdGljRGlhZ25vc3RpY3Moc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuKTtcbiAgfVxuXG4gIGdldE5nU3RydWN0dXJhbERpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy5zdHJ1Y3R1cmFsRGlhZ25vc3RpY3M7XG4gIH1cblxuICBnZXRUc1NlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgY29uc3Qgc291cmNlRmlsZXMgPSBzb3VyY2VGaWxlID8gW3NvdXJjZUZpbGVdIDogdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKTtcbiAgICBsZXQgZGlhZ3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIHNvdXJjZUZpbGVzLmZvckVhY2goc2YgPT4ge1xuICAgICAgaWYgKCFHRU5FUkFURURfRklMRVMudGVzdChzZi5maWxlTmFtZSkpIHtcbiAgICAgICAgZGlhZ3MucHVzaCguLi50aGlzLnRzUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNmLCBjYW5jZWxsYXRpb25Ub2tlbikpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBkaWFncztcbiAgfVxuXG4gIGdldE5nU2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZT86IHN0cmluZywgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbik6XG4gICAgICBSZWFkb25seUFycmF5PERpYWdub3N0aWM+IHtcbiAgICBsZXQgZGlhZ3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzZiA9PiB7XG4gICAgICBpZiAoR0VORVJBVEVEX0ZJTEVTLnRlc3Qoc2YuZmlsZU5hbWUpICYmICFzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICBkaWFncy5wdXNoKC4uLnRoaXMudHNQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc2YsIGNhbmNlbGxhdGlvblRva2VuKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY29uc3Qge25nfSA9IHRyYW5zbGF0ZURpYWdub3N0aWNzKHRoaXMuaG9zdEFkYXB0ZXIsIGRpYWdzKTtcbiAgICByZXR1cm4gbmc7XG4gIH1cblxuICBsb2FkTmdTdHJ1Y3R1cmVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5fYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FuZ3VsYXIgc3RydWN0dXJlIGFscmVhZHkgbG9hZGVkJyk7XG4gICAgfVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgY29uc3Qge3RtcFByb2dyYW0sIHNvdXJjZUZpbGVzLCB0c0ZpbGVzLCByb290TmFtZXN9ID0gdGhpcy5fY3JlYXRlUHJvZ3JhbVdpdGhCYXNpY1N0dWJzKCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZXIubG9hZEZpbGVzQXN5bmMoc291cmNlRmlsZXMsIHRzRmlsZXMpXG4gICAgICAgICAgICAgIC50aGVuKCh7YW5hbHl6ZWRNb2R1bGVzLCBhbmFseXplZEluamVjdGFibGVzfSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9hbmFseXplZE1vZHVsZXMpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQW5ndWxhciBzdHJ1Y3R1cmUgbG9hZGVkIGJvdGggc3luY2hyb25vdXNseSBhbmQgYXN5bmNocm9ub3VzbHknKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fdXBkYXRlUHJvZ3JhbVdpdGhUeXBlQ2hlY2tTdHVicyhcbiAgICAgICAgICAgICAgICAgICAgdG1wUHJvZ3JhbSwgYW5hbHl6ZWRNb2R1bGVzLCBhbmFseXplZEluamVjdGFibGVzLCByb290TmFtZXMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGUgPT4gdGhpcy5fY3JlYXRlUHJvZ3JhbU9uRXJyb3IoZSkpO1xuICB9XG5cbiAgbGlzdExhenlSb3V0ZXMocm91dGU/OiBzdHJpbmcpOiBMYXp5Um91dGVbXSB7XG4gICAgLy8gTm90ZTogRG9uJ3QgYW5hbHl6ZWRNb2R1bGVzIGlmIGEgcm91dGUgaXMgZ2l2ZW5cbiAgICAvLyB0byBiZSBmYXN0IGVub3VnaC5cbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5saXN0TGF6eVJvdXRlcyhyb3V0ZSwgcm91dGUgPyB1bmRlZmluZWQgOiB0aGlzLmFuYWx5emVkTW9kdWxlcyk7XG4gIH1cblxuICBlbWl0KHBhcmFtZXRlcnM6IHtcbiAgICBlbWl0RmxhZ3M/OiBFbWl0RmxhZ3MsXG4gICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbixcbiAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgZW1pdENhbGxiYWNrPzogVHNFbWl0Q2FsbGJhY2ssXG4gICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2ssXG4gIH0gPSB7fSk6IHRzLkVtaXRSZXN1bHQge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZW5hYmxlSXZ5ICE9PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgcnVuIGxlZ2FjeSBjb21waWxlciBpbiBuZ3RzYyBtb2RlJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9lbWl0UmVuZGVyMihwYXJhbWV0ZXJzKTtcbiAgfVxuXG4gIHByaXZhdGUgX2VtaXRSZW5kZXIyKHtcbiAgICBlbWl0RmxhZ3MgPSBFbWl0RmxhZ3MuRGVmYXVsdCxcbiAgICBjYW5jZWxsYXRpb25Ub2tlbixcbiAgICBjdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgZW1pdENhbGxiYWNrID0gZGVmYXVsdEVtaXRDYWxsYmFjayxcbiAgICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2sgPSBtZXJnZUVtaXRSZXN1bHRzLFxuICB9OiB7XG4gICAgZW1pdEZsYWdzPzogRW1pdEZsYWdzLFxuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgIGVtaXRDYWxsYmFjaz86IFRzRW1pdENhbGxiYWNrLFxuICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IFRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLFxuICB9ID0ge30pOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBjb25zdCBlbWl0U3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIGlmIChlbWl0RmxhZ3MgJiBFbWl0RmxhZ3MuSTE4bkJ1bmRsZSkge1xuICAgICAgY29uc3QgbG9jYWxlID0gdGhpcy5vcHRpb25zLmkxOG5PdXRMb2NhbGUgfHwgbnVsbDtcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLm9wdGlvbnMuaTE4bk91dEZpbGUgfHwgbnVsbDtcbiAgICAgIGNvbnN0IGZvcm1hdCA9IHRoaXMub3B0aW9ucy5pMThuT3V0Rm9ybWF0IHx8IG51bGw7XG4gICAgICBjb25zdCBidW5kbGUgPSB0aGlzLmNvbXBpbGVyLmVtaXRNZXNzYWdlQnVuZGxlKHRoaXMuYW5hbHl6ZWRNb2R1bGVzLCBsb2NhbGUpO1xuICAgICAgaTE4bkV4dHJhY3QoZm9ybWF0LCBmaWxlLCB0aGlzLmhvc3QsIHRoaXMub3B0aW9ucywgYnVuZGxlKTtcbiAgICB9XG4gICAgaWYgKChlbWl0RmxhZ3MgJiAoRW1pdEZsYWdzLkpTIHwgRW1pdEZsYWdzLkRUUyB8IEVtaXRGbGFncy5NZXRhZGF0YSB8IEVtaXRGbGFncy5Db2RlZ2VuKSkgPT09XG4gICAgICAgIDApIHtcbiAgICAgIHJldHVybiB7ZW1pdFNraXBwZWQ6IHRydWUsIGRpYWdub3N0aWNzOiBbXSwgZW1pdHRlZEZpbGVzOiBbXX07XG4gICAgfVxuICAgIGxldCB7Z2VuRmlsZXMsIGdlbkRpYWdzfSA9IHRoaXMuZ2VuZXJhdGVGaWxlc0ZvckVtaXQoZW1pdEZsYWdzKTtcbiAgICBpZiAoZ2VuRGlhZ3MubGVuZ3RoKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkaWFnbm9zdGljczogZ2VuRGlhZ3MsXG4gICAgICAgIGVtaXRTa2lwcGVkOiB0cnVlLFxuICAgICAgICBlbWl0dGVkRmlsZXM6IFtdLFxuICAgICAgfTtcbiAgICB9XG4gICAgdGhpcy5lbWl0dGVkR2VuZXJhdGVkRmlsZXMgPSBnZW5GaWxlcztcbiAgICBjb25zdCBvdXRTcmNNYXBwaW5nOiBBcnJheTx7c291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgb3V0RmlsZU5hbWU6IHN0cmluZ30+ID0gW107XG4gICAgY29uc3QgZ2VuRmlsZUJ5RmlsZU5hbWUgPSBuZXcgTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4oKTtcbiAgICBnZW5GaWxlcy5mb3JFYWNoKGdlbkZpbGUgPT4gZ2VuRmlsZUJ5RmlsZU5hbWUuc2V0KGdlbkZpbGUuZ2VuRmlsZVVybCwgZ2VuRmlsZSkpO1xuICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMgPSBbXTtcbiAgICB0aGlzLl90cmFuc2Zvcm1Uc0RpYWdub3N0aWNzID0gW107XG4gICAgY29uc3QgZW1pdHRlZFNvdXJjZUZpbGVzID0gW10gYXMgdHMuU291cmNlRmlsZVtdO1xuICAgIGNvbnN0IHdyaXRlVHNGaWxlOiB0cy5Xcml0ZUZpbGVDYWxsYmFjayA9XG4gICAgICAgIChvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yPywgc291cmNlRmlsZXM/KSA9PiB7XG4gICAgICAgICAgY29uc3Qgc291cmNlRmlsZSA9IHNvdXJjZUZpbGVzICYmIHNvdXJjZUZpbGVzLmxlbmd0aCA9PSAxID8gc291cmNlRmlsZXNbMF0gOiBudWxsO1xuICAgICAgICAgIGxldCBnZW5GaWxlOiBHZW5lcmF0ZWRGaWxlfHVuZGVmaW5lZDtcbiAgICAgICAgICBpZiAoc291cmNlRmlsZSkge1xuICAgICAgICAgICAgb3V0U3JjTWFwcGluZy5wdXNoKHtvdXRGaWxlTmFtZTogb3V0RmlsZU5hbWUsIHNvdXJjZUZpbGV9KTtcbiAgICAgICAgICAgIGdlbkZpbGUgPSBnZW5GaWxlQnlGaWxlTmFtZS5nZXQoc291cmNlRmlsZS5maWxlTmFtZSk7XG4gICAgICAgICAgICBpZiAoIXNvdXJjZUZpbGUuaXNEZWNsYXJhdGlvbkZpbGUgJiYgIUdFTkVSQVRFRF9GSUxFUy50ZXN0KHNvdXJjZUZpbGUuZmlsZU5hbWUpKSB7XG4gICAgICAgICAgICAgIC8vIE5vdGU6IHNvdXJjZUZpbGUgaXMgdGhlIHRyYW5zZm9ybWVkIHNvdXJjZWZpbGUsIG5vdCB0aGUgb3JpZ2luYWwgb25lIVxuICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbEZpbGUgPSB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgICAgICAgICAgICBpZiAob3JpZ2luYWxGaWxlKSB7XG4gICAgICAgICAgICAgICAgZW1pdHRlZFNvdXJjZUZpbGVzLnB1c2gob3JpZ2luYWxGaWxlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLndyaXRlRmlsZShvdXRGaWxlTmFtZSwgb3V0RGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBnZW5GaWxlLCBzb3VyY2VGaWxlcyk7XG4gICAgICAgIH07XG5cbiAgICBjb25zdCBtb2R1bGVzID0gdGhpcy5fYW5hbHl6ZWRJbmplY3RhYmxlcyAmJlxuICAgICAgICB0aGlzLmNvbXBpbGVyLmVtaXRBbGxQYXJ0aWFsTW9kdWxlczIodGhpcy5fYW5hbHl6ZWRJbmplY3RhYmxlcyk7XG5cbiAgICBjb25zdCB0c0N1c3RvbVRyYW5zZm9ybWVycyA9XG4gICAgICAgIHRoaXMuY2FsY3VsYXRlVHJhbnNmb3JtcyhnZW5GaWxlQnlGaWxlTmFtZSwgbW9kdWxlcywgY3VzdG9tVHJhbnNmb3JtZXJzKTtcbiAgICBjb25zdCBlbWl0T25seUR0c0ZpbGVzID0gKGVtaXRGbGFncyAmIChFbWl0RmxhZ3MuRFRTIHwgRW1pdEZsYWdzLkpTKSkgPT0gRW1pdEZsYWdzLkRUUztcbiAgICAvLyBSZXN0b3JlIHRoZSBvcmlnaW5hbCByZWZlcmVuY2VzIGJlZm9yZSB3ZSBlbWl0IHNvIFR5cGVTY3JpcHQgZG9lc24ndCBlbWl0XG4gICAgLy8gYSByZWZlcmVuY2UgdG8gdGhlIC5kLnRzIGZpbGUuXG4gICAgY29uc3QgYXVnbWVudGVkUmVmZXJlbmNlcyA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgUmVhZG9ubHlBcnJheTx0cy5GaWxlUmVmZXJlbmNlPj4oKTtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZUZpbGUgb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgY29uc3Qgb3JpZ2luYWxSZWZlcmVuY2VzID0gZ2V0T3JpZ2luYWxSZWZlcmVuY2VzKHNvdXJjZUZpbGUpO1xuICAgICAgaWYgKG9yaWdpbmFsUmVmZXJlbmNlcykge1xuICAgICAgICBhdWdtZW50ZWRSZWZlcmVuY2VzLnNldChzb3VyY2VGaWxlLCBzb3VyY2VGaWxlLnJlZmVyZW5jZWRGaWxlcyk7XG4gICAgICAgIHNvdXJjZUZpbGUucmVmZXJlbmNlZEZpbGVzID0gb3JpZ2luYWxSZWZlcmVuY2VzO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBnZW5Uc0ZpbGVzOiBHZW5lcmF0ZWRGaWxlW10gPSBbXTtcbiAgICBjb25zdCBnZW5Kc29uRmlsZXM6IEdlbmVyYXRlZEZpbGVbXSA9IFtdO1xuICAgIGdlbkZpbGVzLmZvckVhY2goZ2YgPT4ge1xuICAgICAgaWYgKGdmLnN0bXRzKSB7XG4gICAgICAgIGdlblRzRmlsZXMucHVzaChnZik7XG4gICAgICB9XG4gICAgICBpZiAoZ2Yuc291cmNlKSB7XG4gICAgICAgIGdlbkpzb25GaWxlcy5wdXNoKGdmKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBsZXQgZW1pdFJlc3VsdDogdHMuRW1pdFJlc3VsdDtcbiAgICBsZXQgZW1pdHRlZFVzZXJUc0NvdW50OiBudW1iZXI7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNvdXJjZUZpbGVzVG9FbWl0ID0gdGhpcy5nZXRTb3VyY2VGaWxlc0ZvckVtaXQoKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlc1RvRW1pdCAmJlxuICAgICAgICAgIChzb3VyY2VGaWxlc1RvRW1pdC5sZW5ndGggKyBnZW5Uc0ZpbGVzLmxlbmd0aCkgPCBNQVhfRklMRV9DT1VOVF9GT1JfU0lOR0xFX0ZJTEVfRU1JVCkge1xuICAgICAgICBjb25zdCBmaWxlTmFtZXNUb0VtaXQgPVxuICAgICAgICAgICAgWy4uLnNvdXJjZUZpbGVzVG9FbWl0Lm1hcChzZiA9PiBzZi5maWxlTmFtZSksIC4uLmdlblRzRmlsZXMubWFwKGdmID0+IGdmLmdlbkZpbGVVcmwpXTtcbiAgICAgICAgZW1pdFJlc3VsdCA9IG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayhcbiAgICAgICAgICAgIGZpbGVOYW1lc1RvRW1pdC5tYXAoKGZpbGVOYW1lKSA9PiBlbWl0UmVzdWx0ID0gZW1pdENhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmFtOiB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0OiB0aGlzLmhvc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZTogd3JpdGVUc0ZpbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM6IHRzQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGU6IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpO1xuICAgICAgICBlbWl0dGVkVXNlclRzQ291bnQgPSBzb3VyY2VGaWxlc1RvRW1pdC5sZW5ndGg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbWl0UmVzdWx0ID0gZW1pdENhbGxiYWNrKHtcbiAgICAgICAgICBwcm9ncmFtOiB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgICAgICBob3N0OiB0aGlzLmhvc3QsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIHdyaXRlRmlsZTogd3JpdGVUc0ZpbGUsXG4gICAgICAgICAgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM6IHRzQ3VzdG9tVHJhbnNmb3JtZXJzXG4gICAgICAgIH0pO1xuICAgICAgICBlbWl0dGVkVXNlclRzQ291bnQgPSB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmxlbmd0aCAtIGdlblRzRmlsZXMubGVuZ3RoO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICAvLyBSZXN0b3JlIHRoZSByZWZlcmVuY2VzIGJhY2sgdG8gdGhlIGF1Z21lbnRlZCB2YWx1ZSB0byBlbnN1cmUgdGhhdCB0aGVcbiAgICAgIC8vIGNoZWNrcyB0aGF0IFR5cGVTY3JpcHQgbWFrZXMgZm9yIHByb2plY3Qgc3RydWN0dXJlIHJldXNlIHdpbGwgc3VjY2VlZC5cbiAgICAgIGZvciAoY29uc3QgW3NvdXJjZUZpbGUsIHJlZmVyZW5jZXNdIG9mIEFycmF5LmZyb20oYXVnbWVudGVkUmVmZXJlbmNlcykpIHtcbiAgICAgICAgLy8gVE9ETyhjaHVja2opOiBSZW1vdmUgYW55IGNhc3QgYWZ0ZXIgdXBkYXRpbmcgYnVpbGQgdG8gMi42XG4gICAgICAgIChzb3VyY2VGaWxlIGFzIGFueSkucmVmZXJlbmNlZEZpbGVzID0gcmVmZXJlbmNlcztcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5lbWl0dGVkU291cmNlRmlsZXMgPSBlbWl0dGVkU291cmNlRmlsZXM7XG5cbiAgICAvLyBNYXRjaCBiZWhhdmlvciBvZiB0c2M6IG9ubHkgcHJvZHVjZSBlbWl0IGRpYWdub3N0aWNzIGlmIGl0IHdvdWxkIGJsb2NrXG4gICAgLy8gZW1pdC4gSWYgbm9FbWl0T25FcnJvciBpcyBmYWxzZSwgdGhlIGVtaXQgd2lsbCBoYXBwZW4gaW4gc3BpdGUgb2YgYW55XG4gICAgLy8gZXJyb3JzLCBzbyB3ZSBzaG91bGQgbm90IHJlcG9ydCB0aGVtLlxuICAgIGlmIChlbWl0UmVzdWx0ICYmIHRoaXMub3B0aW9ucy5ub0VtaXRPbkVycm9yID09PSB0cnVlKSB7XG4gICAgICAvLyB0cmFuc2xhdGUgdGhlIGRpYWdub3N0aWNzIGluIHRoZSBlbWl0UmVzdWx0IGFzIHdlbGwuXG4gICAgICBjb25zdCB0cmFuc2xhdGVkRW1pdERpYWdzID0gdHJhbnNsYXRlRGlhZ25vc3RpY3ModGhpcy5ob3N0QWRhcHRlciwgZW1pdFJlc3VsdC5kaWFnbm9zdGljcyk7XG4gICAgICBlbWl0UmVzdWx0LmRpYWdub3N0aWNzID0gdHJhbnNsYXRlZEVtaXREaWFncy50cy5jb25jYXQoXG4gICAgICAgICAgdGhpcy5zdHJ1Y3R1cmFsRGlhZ25vc3RpY3MuY29uY2F0KHRyYW5zbGF0ZWRFbWl0RGlhZ3MubmcpLm1hcChuZ1RvVHNEaWFnbm9zdGljKSk7XG4gICAgfVxuXG4gICAgaWYgKGVtaXRSZXN1bHQgJiYgIW91dFNyY01hcHBpbmcubGVuZ3RoKSB7XG4gICAgICAvLyBpZiBubyBmaWxlcyB3ZXJlIGVtaXR0ZWQgYnkgVHlwZVNjcmlwdCwgYWxzbyBkb24ndCBlbWl0IC5qc29uIGZpbGVzXG4gICAgICBlbWl0UmVzdWx0LmRpYWdub3N0aWNzID1cbiAgICAgICAgICBlbWl0UmVzdWx0LmRpYWdub3N0aWNzLmNvbmNhdChbY3JlYXRlTWVzc2FnZURpYWdub3N0aWMoYEVtaXR0ZWQgbm8gZmlsZXMuYCldKTtcbiAgICAgIHJldHVybiBlbWl0UmVzdWx0O1xuICAgIH1cblxuICAgIGxldCBzYW1wbGVTcmNGaWxlTmFtZTogc3RyaW5nfHVuZGVmaW5lZDtcbiAgICBsZXQgc2FtcGxlT3V0RmlsZU5hbWU6IHN0cmluZ3x1bmRlZmluZWQ7XG4gICAgaWYgKG91dFNyY01hcHBpbmcubGVuZ3RoKSB7XG4gICAgICBzYW1wbGVTcmNGaWxlTmFtZSA9IG91dFNyY01hcHBpbmdbMF0uc291cmNlRmlsZS5maWxlTmFtZTtcbiAgICAgIHNhbXBsZU91dEZpbGVOYW1lID0gb3V0U3JjTWFwcGluZ1swXS5vdXRGaWxlTmFtZTtcbiAgICB9XG4gICAgY29uc3Qgc3JjVG9PdXRQYXRoID1cbiAgICAgICAgY3JlYXRlU3JjVG9PdXRQYXRoTWFwcGVyKHRoaXMub3B0aW9ucy5vdXREaXIsIHNhbXBsZVNyY0ZpbGVOYW1lLCBzYW1wbGVPdXRGaWxlTmFtZSk7XG4gICAgaWYgKGVtaXRGbGFncyAmIEVtaXRGbGFncy5Db2RlZ2VuKSB7XG4gICAgICBnZW5Kc29uRmlsZXMuZm9yRWFjaChnZiA9PiB7XG4gICAgICAgIGNvbnN0IG91dEZpbGVOYW1lID0gc3JjVG9PdXRQYXRoKGdmLmdlbkZpbGVVcmwpO1xuICAgICAgICB0aGlzLndyaXRlRmlsZShvdXRGaWxlTmFtZSwgZ2Yuc291cmNlISwgZmFsc2UsIHVuZGVmaW5lZCwgZ2YpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGxldCBtZXRhZGF0YUpzb25Db3VudCA9IDA7XG4gICAgaWYgKGVtaXRGbGFncyAmIEVtaXRGbGFncy5NZXRhZGF0YSkge1xuICAgICAgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNmID0+IHtcbiAgICAgICAgaWYgKCFzZi5pc0RlY2xhcmF0aW9uRmlsZSAmJiAhR0VORVJBVEVEX0ZJTEVTLnRlc3Qoc2YuZmlsZU5hbWUpKSB7XG4gICAgICAgICAgbWV0YWRhdGFKc29uQ291bnQrKztcbiAgICAgICAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubWV0YWRhdGFDYWNoZS5nZXRNZXRhZGF0YShzZik7XG4gICAgICAgICAgaWYgKG1ldGFkYXRhKSB7XG4gICAgICAgICAgICBjb25zdCBtZXRhZGF0YVRleHQgPSBKU09OLnN0cmluZ2lmeShbbWV0YWRhdGFdKTtcbiAgICAgICAgICAgIGNvbnN0IG91dEZpbGVOYW1lID0gc3JjVG9PdXRQYXRoKHNmLmZpbGVOYW1lLnJlcGxhY2UoL1xcLnRzeD8kLywgJy5tZXRhZGF0YS5qc29uJykpO1xuICAgICAgICAgICAgdGhpcy53cml0ZUZpbGUob3V0RmlsZU5hbWUsIG1ldGFkYXRhVGV4dCwgZmFsc2UsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBbc2ZdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCBlbWl0RW5kID0gRGF0ZS5ub3coKTtcbiAgICBpZiAoZW1pdFJlc3VsdCAmJiB0aGlzLm9wdGlvbnMuZGlhZ25vc3RpY3MpIHtcbiAgICAgIGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MgPSBlbWl0UmVzdWx0LmRpYWdub3N0aWNzLmNvbmNhdChbY3JlYXRlTWVzc2FnZURpYWdub3N0aWMoW1xuICAgICAgICBgRW1pdHRlZCBpbiAke2VtaXRFbmQgLSBlbWl0U3RhcnR9bXNgLFxuICAgICAgICBgLSAke2VtaXR0ZWRVc2VyVHNDb3VudH0gdXNlciB0cyBmaWxlc2AsXG4gICAgICAgIGAtICR7Z2VuVHNGaWxlcy5sZW5ndGh9IGdlbmVyYXRlZCB0cyBmaWxlc2AsXG4gICAgICAgIGAtICR7Z2VuSnNvbkZpbGVzLmxlbmd0aCArIG1ldGFkYXRhSnNvbkNvdW50fSBnZW5lcmF0ZWQganNvbiBmaWxlc2AsXG4gICAgICBdLmpvaW4oJ1xcbicpKV0pO1xuICAgIH1cblxuICAgIHJldHVybiBlbWl0UmVzdWx0O1xuICB9XG5cbiAgLy8gUHJpdmF0ZSBtZW1iZXJzXG4gIHByaXZhdGUgZ2V0IGNvbXBpbGVyKCk6IEFvdENvbXBpbGVyIHtcbiAgICBpZiAoIXRoaXMuX2NvbXBpbGVyKSB7XG4gICAgICB0aGlzLl9jcmVhdGVDb21waWxlcigpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY29tcGlsZXIhO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgaG9zdEFkYXB0ZXIoKTogVHNDb21waWxlckFvdENvbXBpbGVyVHlwZUNoZWNrSG9zdEFkYXB0ZXIge1xuICAgIGlmICghdGhpcy5faG9zdEFkYXB0ZXIpIHtcbiAgICAgIHRoaXMuX2NyZWF0ZUNvbXBpbGVyKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ob3N0QWRhcHRlciE7XG4gIH1cblxuICBwcml2YXRlIGdldCBhbmFseXplZE1vZHVsZXMoKTogTmdBbmFseXplZE1vZHVsZXMge1xuICAgIGlmICghdGhpcy5fYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICB0aGlzLmluaXRTeW5jKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9hbmFseXplZE1vZHVsZXMhO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgc3RydWN0dXJhbERpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8RGlhZ25vc3RpYz4ge1xuICAgIGxldCBkaWFnbm9zdGljcyA9IHRoaXMuX3N0cnVjdHVyYWxEaWFnbm9zdGljcztcbiAgICBpZiAoIWRpYWdub3N0aWNzKSB7XG4gICAgICB0aGlzLmluaXRTeW5jKCk7XG4gICAgICBkaWFnbm9zdGljcyA9ICh0aGlzLl9zdHJ1Y3R1cmFsRGlhZ25vc3RpY3MgPSB0aGlzLl9zdHJ1Y3R1cmFsRGlhZ25vc3RpY3MgfHwgW10pO1xuICAgIH1cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIGdldCB0c1Byb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgaWYgKCF0aGlzLl90c1Byb2dyYW0pIHtcbiAgICAgIHRoaXMuaW5pdFN5bmMoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3RzUHJvZ3JhbSE7XG4gIH1cblxuICAvKiogV2hldGhlciB0aGUgcHJvZ3JhbSBpcyBjb21waWxpbmcgdGhlIEFuZ3VsYXIgY29yZSBwYWNrYWdlLiAqL1xuICBwcml2YXRlIGdldCBpc0NvbXBpbGluZ0FuZ3VsYXJDb3JlKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9pc0NvbXBpbGluZ0FuZ3VsYXJDb3JlICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5faXNDb21waWxpbmdBbmd1bGFyQ29yZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2lzQ29tcGlsaW5nQW5ndWxhckNvcmUgPSBpc0FuZ3VsYXJDb3JlUGFja2FnZSh0aGlzLnRzUHJvZ3JhbSk7XG4gIH1cbiAgcHJpdmF0ZSBfaXNDb21waWxpbmdBbmd1bGFyQ29yZTogYm9vbGVhbnxudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGNhbGN1bGF0ZVRyYW5zZm9ybXMoXG4gICAgICBnZW5GaWxlczogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT58dW5kZWZpbmVkLCBwYXJ0aWFsTW9kdWxlczogUGFydGlhbE1vZHVsZVtdfHVuZGVmaW5lZCxcbiAgICAgIGN1c3RvbVRyYW5zZm9ybWVycz86IEN1c3RvbVRyYW5zZm9ybWVycyk6IHRzLkN1c3RvbVRyYW5zZm9ybWVycyB7XG4gICAgY29uc3QgYmVmb3JlVHM6IEFycmF5PHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPj4gPSBbXTtcbiAgICBjb25zdCBtZXRhZGF0YVRyYW5zZm9ybXM6IE1ldGFkYXRhVHJhbnNmb3JtZXJbXSA9IFtdO1xuICAgIGNvbnN0IGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXM6IE1ldGFkYXRhVHJhbnNmb3JtZXJbXSA9IFtdO1xuICAgIGNvbnN0IGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyID0gdGhpcy5vcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyIHx8IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5lbmFibGVSZXNvdXJjZUlubGluaW5nKSB7XG4gICAgICBiZWZvcmVUcy5wdXNoKGdldElubGluZVJlc291cmNlc1RyYW5zZm9ybUZhY3RvcnkodGhpcy50c1Byb2dyYW0sIHRoaXMuaG9zdEFkYXB0ZXIpKTtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IElubGluZVJlc291cmNlc01ldGFkYXRhVHJhbnNmb3JtZXIodGhpcy5ob3N0QWRhcHRlcik7XG4gICAgICBtZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgICBmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zLnB1c2godHJhbnNmb3JtZXIpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVFeHByZXNzaW9uTG93ZXJpbmcpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goXG4gICAgICAgICAgZ2V0RXhwcmVzc2lvbkxvd2VyaW5nVHJhbnNmb3JtRmFjdG9yeSh0aGlzLmxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm0sIHRoaXMudHNQcm9ncmFtKSk7XG4gICAgICBtZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0aGlzLmxvd2VyaW5nTWV0YWRhdGFUcmFuc2Zvcm0pO1xuICAgIH1cbiAgICBpZiAoZ2VuRmlsZXMpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goZ2V0QW5ndWxhckVtaXR0ZXJUcmFuc2Zvcm1GYWN0b3J5KFxuICAgICAgICAgIGdlbkZpbGVzLCB0aGlzLmdldFRzUHJvZ3JhbSgpLCBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcikpO1xuICAgIH1cbiAgICBpZiAocGFydGlhbE1vZHVsZXMpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goZ2V0QW5ndWxhckNsYXNzVHJhbnNmb3JtZXJGYWN0b3J5KHBhcnRpYWxNb2R1bGVzLCBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcikpO1xuXG4gICAgICAvLyBJZiB3ZSBoYXZlIHBhcnRpYWwgbW9kdWxlcywgdGhlIGNhY2hlZCBtZXRhZGF0YSBtaWdodCBiZSBpbmNvcnJlY3QgYXMgaXQgZG9lc24ndCByZWZsZWN0XG4gICAgICAvLyB0aGUgcGFydGlhbCBtb2R1bGUgdHJhbnNmb3Jtcy5cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IFBhcnRpYWxNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybWVyKHBhcnRpYWxNb2R1bGVzKTtcbiAgICAgIG1ldGFkYXRhVHJhbnNmb3Jtcy5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICAgIGZsYXRNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybXMucHVzaCh0cmFuc2Zvcm1lcik7XG4gICAgfVxuXG4gICAgaWYgKGN1c3RvbVRyYW5zZm9ybWVycyAmJiBjdXN0b21UcmFuc2Zvcm1lcnMuYmVmb3JlVHMpIHtcbiAgICAgIGJlZm9yZVRzLnB1c2goLi4uY3VzdG9tVHJhbnNmb3JtZXJzLmJlZm9yZVRzKTtcbiAgICB9XG5cbiAgICAvLyBJZiBkZWNvcmF0b3JzIHNob3VsZCBiZSBjb252ZXJ0ZWQgdG8gc3RhdGljIGZpZWxkcyAoZW5hYmxlZCBieSBkZWZhdWx0KSwgd2Ugc2V0IHVwXG4gICAgLy8gdGhlIGRlY29yYXRvciBkb3dubGV2ZWwgdHJhbnNmb3JtLiBOb3RlIHRoYXQgd2Ugc2V0IGl0IHVwIGFzIGxhc3QgdHJhbnNmb3JtIGFzIHRoYXRcbiAgICAvLyBhbGxvd3MgY3VzdG9tIHRyYW5zZm9ybWVycyB0byBzdHJpcCBBbmd1bGFyIGRlY29yYXRvcnMgd2l0aG91dCBoYXZpbmcgdG8gZGVhbCB3aXRoXG4gICAgLy8gaWRlbnRpZnlpbmcgc3RhdGljIHByb3BlcnRpZXMuIGUuZy4gaXQncyBtb3JlIGRpZmZpY3VsdCBoYW5kbGluZyBgPC4uPi5kZWNvcmF0b3JzYFxuICAgIC8vIG9yIGA8Li4+LmN0b3JQYXJhbWV0ZXJzYCBjb21wYXJlZCB0byB0aGUgYHRzLkRlY29yYXRvcmAgQVNUIG5vZGVzLlxuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5ub3RhdGlvbnNBcyAhPT0gJ2RlY29yYXRvcnMnKSB7XG4gICAgICBjb25zdCB0eXBlQ2hlY2tlciA9IHRoaXMuZ2V0VHNQcm9ncmFtKCkuZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICAgIGNvbnN0IHJlZmxlY3Rpb25Ib3N0ID0gbmV3IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCh0eXBlQ2hlY2tlcik7XG4gICAgICAvLyBTaW1pbGFybHkgdG8gaG93IHdlIGhhbmRsZWQgdHNpY2tsZSBkZWNvcmF0b3IgZG93bmxldmVsaW5nIGluIHRoZSBwYXN0LCB3ZSBqdXN0XG4gICAgICAvLyBpZ25vcmUgZGlhZ25vc3RpY3MgdGhhdCBoYXZlIGJlZW4gY29sbGVjdGVkIGJ5IHRoZSB0cmFuc2Zvcm1lci4gVGhlc2UgYXJlXG4gICAgICAvLyBub24tc2lnbmlmaWNhbnQgZmFpbHVyZXMgdGhhdCBzaG91bGRuJ3QgcHJldmVudCBhcHBzIGZyb20gY29tcGlsaW5nLlxuICAgICAgYmVmb3JlVHMucHVzaChnZXREb3dubGV2ZWxEZWNvcmF0b3JzVHJhbnNmb3JtKFxuICAgICAgICAgIHR5cGVDaGVja2VyLCByZWZsZWN0aW9uSG9zdCwgW10sIHRoaXMuaXNDb21waWxpbmdBbmd1bGFyQ29yZSwgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIsXG4gICAgICAgICAgLyogc2tpcENsYXNzRGVjb3JhdG9ycyAqLyBmYWxzZSkpO1xuICAgIH1cblxuICAgIGlmIChtZXRhZGF0YVRyYW5zZm9ybXMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5tZXRhZGF0YUNhY2hlID0gdGhpcy5jcmVhdGVNZXRhZGF0YUNhY2hlKG1ldGFkYXRhVHJhbnNmb3Jtcyk7XG4gICAgfVxuICAgIGlmIChmbGF0TW9kdWxlTWV0YWRhdGFUcmFuc2Zvcm1zLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuZmxhdE1vZHVsZU1ldGFkYXRhQ2FjaGUgPSB0aGlzLmNyZWF0ZU1ldGFkYXRhQ2FjaGUoZmxhdE1vZHVsZU1ldGFkYXRhVHJhbnNmb3Jtcyk7XG4gICAgfVxuICAgIGNvbnN0IGFmdGVyVHMgPSBjdXN0b21UcmFuc2Zvcm1lcnMgPyBjdXN0b21UcmFuc2Zvcm1lcnMuYWZ0ZXJUcyA6IHVuZGVmaW5lZDtcbiAgICByZXR1cm4ge2JlZm9yZTogYmVmb3JlVHMsIGFmdGVyOiBhZnRlclRzfTtcbiAgfVxuXG4gIHByaXZhdGUgaW5pdFN5bmMoKSB7XG4gICAgaWYgKHRoaXMuX2FuYWx5emVkTW9kdWxlcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3Qge3RtcFByb2dyYW0sIHNvdXJjZUZpbGVzLCB0c0ZpbGVzLCByb290TmFtZXN9ID0gdGhpcy5fY3JlYXRlUHJvZ3JhbVdpdGhCYXNpY1N0dWJzKCk7XG4gICAgICBjb25zdCB7YW5hbHl6ZWRNb2R1bGVzLCBhbmFseXplZEluamVjdGFibGVzfSA9XG4gICAgICAgICAgdGhpcy5jb21waWxlci5sb2FkRmlsZXNTeW5jKHNvdXJjZUZpbGVzLCB0c0ZpbGVzKTtcbiAgICAgIHRoaXMuX3VwZGF0ZVByb2dyYW1XaXRoVHlwZUNoZWNrU3R1YnMoXG4gICAgICAgICAgdG1wUHJvZ3JhbSwgYW5hbHl6ZWRNb2R1bGVzLCBhbmFseXplZEluamVjdGFibGVzLCByb290TmFtZXMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMuX2NyZWF0ZVByb2dyYW1PbkVycm9yKGUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZUNvbXBpbGVyKCkge1xuICAgIGNvbnN0IGNvZGVnZW46IENvZGVHZW5lcmF0b3IgPSB7XG4gICAgICBnZW5lcmF0ZUZpbGU6IChnZW5GaWxlTmFtZSwgYmFzZUZpbGVOYW1lKSA9PlxuICAgICAgICAgIHRoaXMuX2NvbXBpbGVyLmVtaXRCYXNpY1N0dWIoZ2VuRmlsZU5hbWUsIGJhc2VGaWxlTmFtZSksXG4gICAgICBmaW5kR2VuZXJhdGVkRmlsZU5hbWVzOiAoZmlsZU5hbWUpID0+IHRoaXMuX2NvbXBpbGVyLmZpbmRHZW5lcmF0ZWRGaWxlTmFtZXMoZmlsZU5hbWUpLFxuICAgIH07XG5cbiAgICB0aGlzLl9ob3N0QWRhcHRlciA9IG5ldyBUc0NvbXBpbGVyQW90Q29tcGlsZXJUeXBlQ2hlY2tIb3N0QWRhcHRlcihcbiAgICAgICAgdGhpcy5yb290TmFtZXMsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0LCB0aGlzLm1ldGFkYXRhQ2FjaGUsIGNvZGVnZW4sXG4gICAgICAgIHRoaXMub2xkUHJvZ3JhbUxpYnJhcnlTdW1tYXJpZXMpO1xuICAgIGNvbnN0IGFvdE9wdGlvbnMgPSBnZXRBb3RDb21waWxlck9wdGlvbnModGhpcy5vcHRpb25zKTtcbiAgICBjb25zdCBlcnJvckNvbGxlY3RvciA9ICh0aGlzLm9wdGlvbnMuY29sbGVjdEFsbEVycm9ycyB8fCB0aGlzLm9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrKSA/XG4gICAgICAgIChlcnI6IGFueSkgPT4gdGhpcy5fYWRkU3RydWN0dXJhbERpYWdub3N0aWNzKGVycikgOlxuICAgICAgICB1bmRlZmluZWQ7XG4gICAgdGhpcy5fY29tcGlsZXIgPSBjcmVhdGVBb3RDb21waWxlcih0aGlzLl9ob3N0QWRhcHRlciwgYW90T3B0aW9ucywgZXJyb3JDb2xsZWN0b3IpLmNvbXBpbGVyO1xuICB9XG5cbiAgcHJpdmF0ZSBfY3JlYXRlUHJvZ3JhbVdpdGhCYXNpY1N0dWJzKCk6IHtcbiAgICB0bXBQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgIHJvb3ROYW1lczogc3RyaW5nW10sXG4gICAgc291cmNlRmlsZXM6IHN0cmluZ1tdLFxuICAgIHRzRmlsZXM6IHN0cmluZ1tdLFxuICB9IHtcbiAgICBpZiAodGhpcy5fYW5hbHl6ZWRNb2R1bGVzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludGVybmFsIEVycm9yOiBhbHJlYWR5IGluaXRpYWxpemVkIWApO1xuICAgIH1cbiAgICAvLyBOb3RlOiBUaGlzIGlzIGltcG9ydGFudCB0byBub3QgcHJvZHVjZSBhIG1lbW9yeSBsZWFrIVxuICAgIGNvbnN0IG9sZFRzUHJvZ3JhbSA9IHRoaXMub2xkVHNQcm9ncmFtO1xuICAgIHRoaXMub2xkVHNQcm9ncmFtID0gdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgY29kZWdlbjogQ29kZUdlbmVyYXRvciA9IHtcbiAgICAgIGdlbmVyYXRlRmlsZTogKGdlbkZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpID0+XG4gICAgICAgICAgdGhpcy5jb21waWxlci5lbWl0QmFzaWNTdHViKGdlbkZpbGVOYW1lLCBiYXNlRmlsZU5hbWUpLFxuICAgICAgZmluZEdlbmVyYXRlZEZpbGVOYW1lczogKGZpbGVOYW1lKSA9PiB0aGlzLmNvbXBpbGVyLmZpbmRHZW5lcmF0ZWRGaWxlTmFtZXMoZmlsZU5hbWUpLFxuICAgIH07XG5cblxuICAgIGxldCByb290TmFtZXMgPSBbLi4udGhpcy5yb290TmFtZXNdO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZ2VuZXJhdGVDb2RlRm9yTGlicmFyaWVzICE9PSBmYWxzZSkge1xuICAgICAgLy8gaWYgd2Ugc2hvdWxkIGdlbmVyYXRlQ29kZUZvckxpYnJhcmllcywgbmV2ZXIgaW5jbHVkZVxuICAgICAgLy8gZ2VuZXJhdGVkIGZpbGVzIGluIHRoZSBwcm9ncmFtIGFzIG90aGVyd2lzZSB3ZSB3aWxsXG4gICAgICAvLyBvdmVyd3JpdGUgdGhlbSBhbmQgdHlwZXNjcmlwdCB3aWxsIHJlcG9ydCB0aGUgZXJyb3JcbiAgICAgIC8vIFRTNTA1NTogQ2Fubm90IHdyaXRlIGZpbGUgLi4uIGJlY2F1c2UgaXQgd291bGQgb3ZlcndyaXRlIGlucHV0IGZpbGUuXG4gICAgICByb290TmFtZXMgPSByb290TmFtZXMuZmlsdGVyKGZuID0+ICFHRU5FUkFURURfRklMRVMudGVzdChmbikpO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLm5vUmVzb2x2ZSkge1xuICAgICAgdGhpcy5yb290TmFtZXMuZm9yRWFjaChyb290TmFtZSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmhvc3RBZGFwdGVyLnNob3VsZEdlbmVyYXRlRmlsZXNGb3Iocm9vdE5hbWUpKSB7XG4gICAgICAgICAgcm9vdE5hbWVzLnB1c2goLi4udGhpcy5jb21waWxlci5maW5kR2VuZXJhdGVkRmlsZU5hbWVzKHJvb3ROYW1lKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHRtcFByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3ROYW1lcywgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3RBZGFwdGVyLCBvbGRUc1Byb2dyYW0pO1xuICAgIGlmICh0ZW1wUHJvZ3JhbUhhbmRsZXJGb3JUZXN0ICE9PSBudWxsKSB7XG4gICAgICB0ZW1wUHJvZ3JhbUhhbmRsZXJGb3JUZXN0KHRtcFByb2dyYW0pO1xuICAgIH1cbiAgICBjb25zdCBzb3VyY2VGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCB0c0ZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIHRtcFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNmID0+IHtcbiAgICAgIGlmICh0aGlzLmhvc3RBZGFwdGVyLmlzU291cmNlRmlsZShzZi5maWxlTmFtZSkpIHtcbiAgICAgICAgc291cmNlRmlsZXMucHVzaChzZi5maWxlTmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAoVFMudGVzdChzZi5maWxlTmFtZSkgJiYgIURUUy50ZXN0KHNmLmZpbGVOYW1lKSkge1xuICAgICAgICB0c0ZpbGVzLnB1c2goc2YuZmlsZU5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB7dG1wUHJvZ3JhbSwgc291cmNlRmlsZXMsIHRzRmlsZXMsIHJvb3ROYW1lc307XG4gIH1cblxuICBwcml2YXRlIF91cGRhdGVQcm9ncmFtV2l0aFR5cGVDaGVja1N0dWJzKFxuICAgICAgdG1wUHJvZ3JhbTogdHMuUHJvZ3JhbSwgYW5hbHl6ZWRNb2R1bGVzOiBOZ0FuYWx5emVkTW9kdWxlcyxcbiAgICAgIGFuYWx5emVkSW5qZWN0YWJsZXM6IE5nQW5hbHl6ZWRGaWxlV2l0aEluamVjdGFibGVzW10sIHJvb3ROYW1lczogc3RyaW5nW10pIHtcbiAgICB0aGlzLl9hbmFseXplZE1vZHVsZXMgPSBhbmFseXplZE1vZHVsZXM7XG4gICAgdGhpcy5fYW5hbHl6ZWRJbmplY3RhYmxlcyA9IGFuYWx5emVkSW5qZWN0YWJsZXM7XG4gICAgdG1wUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc2YgPT4ge1xuICAgICAgaWYgKHNmLmZpbGVOYW1lLmVuZHNXaXRoKCcubmdmYWN0b3J5LnRzJykpIHtcbiAgICAgICAgY29uc3Qge2dlbmVyYXRlLCBiYXNlRmlsZU5hbWV9ID0gdGhpcy5ob3N0QWRhcHRlci5zaG91bGRHZW5lcmF0ZUZpbGUoc2YuZmlsZU5hbWUpO1xuICAgICAgICBpZiAoZ2VuZXJhdGUpIHtcbiAgICAgICAgICAvLyBOb3RlOiAhIGlzIG9rIGFzIGhvc3RBZGFwdGVyLnNob3VsZEdlbmVyYXRlRmlsZSB3aWxsIGFsd2F5cyByZXR1cm4gYSBiYXNlRmlsZU5hbWVcbiAgICAgICAgICAvLyBmb3IgLm5nZmFjdG9yeS50cyBmaWxlcy5cbiAgICAgICAgICBjb25zdCBnZW5GaWxlID0gdGhpcy5jb21waWxlci5lbWl0VHlwZUNoZWNrU3R1YihzZi5maWxlTmFtZSwgYmFzZUZpbGVOYW1lISk7XG4gICAgICAgICAgaWYgKGdlbkZpbGUpIHtcbiAgICAgICAgICAgIHRoaXMuaG9zdEFkYXB0ZXIudXBkYXRlR2VuZXJhdGVkRmlsZShnZW5GaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLl90c1Byb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3ROYW1lcywgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3RBZGFwdGVyLCB0bXBQcm9ncmFtKTtcbiAgICAvLyBOb3RlOiB0aGUgbmV3IHRzIHByb2dyYW0gc2hvdWxkIGJlIGNvbXBsZXRlbHkgcmV1c2FibGUgYnkgVHlwZVNjcmlwdCBhczpcbiAgICAvLyAtIHdlIGNhY2hlIGFsbCB0aGUgZmlsZXMgaW4gdGhlIGhvc3RBZGFwdGVyXG4gICAgLy8gLSBuZXcgbmV3IHN0dWJzIHVzZSB0aGUgZXhhY3RseSBzYW1lIGltcG9ydHMvZXhwb3J0cyBhcyB0aGUgb2xkIG9uY2UgKHdlIGFzc2VydCB0aGF0IGluXG4gICAgLy8gaG9zdEFkYXB0ZXIudXBkYXRlR2VuZXJhdGVkRmlsZSkuXG4gICAgaWYgKHRzU3RydWN0dXJlSXNSZXVzZWQodGhpcy5fdHNQcm9ncmFtKSAhPT0gU3RydWN0dXJlSXNSZXVzZWQuQ29tcGxldGVseSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcm5hbCBFcnJvcjogVGhlIHN0cnVjdHVyZSBvZiB0aGUgcHJvZ3JhbSBjaGFuZ2VkIGR1cmluZyBjb2RlZ2VuLmApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZVByb2dyYW1PbkVycm9yKGU6IGFueSkge1xuICAgIC8vIFN0aWxsIGZpbGwgdGhlIGFuYWx5emVkTW9kdWxlcyBhbmQgdGhlIHRzUHJvZ3JhbVxuICAgIC8vIHNvIHRoYXQgd2UgZG9uJ3QgY2F1c2Ugb3RoZXIgZXJyb3JzIGZvciB1c2VycyB3aG8gZS5nLiB3YW50IHRvIGVtaXQgdGhlIG5nUHJvZ3JhbS5cbiAgICB0aGlzLl9hbmFseXplZE1vZHVsZXMgPSBlbXB0eU1vZHVsZXM7XG4gICAgdGhpcy5vbGRUc1Byb2dyYW0gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5faG9zdEFkYXB0ZXIuaXNTb3VyY2VGaWxlID0gKCkgPT4gZmFsc2U7XG4gICAgdGhpcy5fdHNQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbSh0aGlzLnJvb3ROYW1lcywgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3RBZGFwdGVyKTtcbiAgICBpZiAoaXNTeW50YXhFcnJvcihlKSkge1xuICAgICAgdGhpcy5fYWRkU3RydWN0dXJhbERpYWdub3N0aWNzKGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgcHJpdmF0ZSBfYWRkU3RydWN0dXJhbERpYWdub3N0aWNzKGVycm9yOiBFcnJvcikge1xuICAgIGNvbnN0IGRpYWdub3N0aWNzID0gdGhpcy5fc3RydWN0dXJhbERpYWdub3N0aWNzIHx8ICh0aGlzLl9zdHJ1Y3R1cmFsRGlhZ25vc3RpY3MgPSBbXSk7XG4gICAgaWYgKGlzU3ludGF4RXJyb3IoZXJyb3IpKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnN5bnRheEVycm9yVG9EaWFnbm9zdGljcyhlcnJvciwgdGhpcy50c1Byb2dyYW0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgIG1lc3NhZ2VUZXh0OiBlcnJvci50b1N0cmluZygpLFxuICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBOb3RlOiB0aGlzIHJldHVybnMgYSB0cy5EaWFnbm9zdGljIHNvIHRoYXQgd2VcbiAgLy8gY2FuIHJldHVybiBlcnJvcnMgaW4gYSB0cy5FbWl0UmVzdWx0XG4gIHByaXZhdGUgZ2VuZXJhdGVGaWxlc0ZvckVtaXQoZW1pdEZsYWdzOiBFbWl0RmxhZ3MpOlxuICAgICAge2dlbkZpbGVzOiBHZW5lcmF0ZWRGaWxlW10sIGdlbkRpYWdzOiB0cy5EaWFnbm9zdGljW119IHtcbiAgICB0cnkge1xuICAgICAgaWYgKCEoZW1pdEZsYWdzICYgRW1pdEZsYWdzLkNvZGVnZW4pKSB7XG4gICAgICAgIHJldHVybiB7Z2VuRmlsZXM6IFtdLCBnZW5EaWFnczogW119O1xuICAgICAgfVxuICAgICAgLy8gVE9ETyh0Ym9zY2gpOiBhbGxvdyBnZW5lcmF0aW5nIGZpbGVzIHRoYXQgYXJlIG5vdCBpbiB0aGUgcm9vdERpclxuICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzE5MzM3XG4gICAgICBsZXQgZ2VuRmlsZXMgPSB0aGlzLmNvbXBpbGVyLmVtaXRBbGxJbXBscyh0aGlzLmFuYWx5emVkTW9kdWxlcylcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGdlbkZpbGUgPT4gaXNJblJvb3REaXIoZ2VuRmlsZS5nZW5GaWxlVXJsLCB0aGlzLm9wdGlvbnMpKTtcbiAgICAgIGlmICh0aGlzLm9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMpIHtcbiAgICAgICAgY29uc3Qgb2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcyA9IHRoaXMub2xkUHJvZ3JhbUVtaXR0ZWRHZW5lcmF0ZWRGaWxlcztcbiAgICAgICAgZ2VuRmlsZXMgPSBnZW5GaWxlcy5maWx0ZXIoZ2VuRmlsZSA9PiB7XG4gICAgICAgICAgY29uc3Qgb2xkR2VuRmlsZSA9IG9sZFByb2dyYW1FbWl0dGVkR2VuZXJhdGVkRmlsZXMuZ2V0KGdlbkZpbGUuZ2VuRmlsZVVybCk7XG4gICAgICAgICAgcmV0dXJuICFvbGRHZW5GaWxlIHx8ICFnZW5GaWxlLmlzRXF1aXZhbGVudChvbGRHZW5GaWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4ge2dlbkZpbGVzLCBnZW5EaWFnczogW119O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIFRPRE8odGJvc2NoKTogY2hlY2sgd2hldGhlciB3ZSBjYW4gYWN0dWFsbHkgaGF2ZSBzeW50YXggZXJyb3JzIGhlcmUsXG4gICAgICAvLyBhcyB3ZSBhbHJlYWR5IHBhcnNlZCB0aGUgbWV0YWRhdGEgYW5kIHRlbXBsYXRlcyBiZWZvcmUgdG8gY3JlYXRlIHRoZSB0eXBlIGNoZWNrIGJsb2NrLlxuICAgICAgaWYgKGlzU3ludGF4RXJyb3IoZSkpIHtcbiAgICAgICAgY29uc3QgZ2VuRGlhZ3M6IHRzLkRpYWdub3N0aWNbXSA9IFt7XG4gICAgICAgICAgZmlsZTogdW5kZWZpbmVkLFxuICAgICAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6IGUubWVzc2FnZSxcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIHNvdXJjZTogU09VUkNFLFxuICAgICAgICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICB9XTtcbiAgICAgICAgcmV0dXJuIHtnZW5GaWxlczogW10sIGdlbkRpYWdzfTtcbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdW5kZWZpbmVkIGlmIGFsbCBmaWxlcyBzaG91bGQgYmUgZW1pdHRlZC5cbiAgICovXG4gIHByaXZhdGUgZ2V0U291cmNlRmlsZXNGb3JFbWl0KCk6IHRzLlNvdXJjZUZpbGVbXXx1bmRlZmluZWQge1xuICAgIC8vIFRPRE8odGJvc2NoKTogaWYgb25lIG9mIHRoZSBmaWxlcyBjb250YWlucyBhIGBjb25zdCBlbnVtYFxuICAgIC8vIGFsd2F5cyBlbWl0IGFsbCBmaWxlcyAtPiByZXR1cm4gdW5kZWZpbmVkIVxuICAgIGxldCBzb3VyY2VGaWxlc1RvRW1pdCA9IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmlsdGVyKHNmID0+IHtcbiAgICAgIHJldHVybiAhc2YuaXNEZWNsYXJhdGlvbkZpbGUgJiYgIUdFTkVSQVRFRF9GSUxFUy50ZXN0KHNmLmZpbGVOYW1lKTtcbiAgICB9KTtcbiAgICBpZiAodGhpcy5vbGRQcm9ncmFtRW1pdHRlZFNvdXJjZUZpbGVzKSB7XG4gICAgICBzb3VyY2VGaWxlc1RvRW1pdCA9IHNvdXJjZUZpbGVzVG9FbWl0LmZpbHRlcihzZiA9PiB7XG4gICAgICAgIGNvbnN0IG9sZEZpbGUgPSB0aGlzLm9sZFByb2dyYW1FbWl0dGVkU291cmNlRmlsZXMhLmdldChzZi5maWxlTmFtZSk7XG4gICAgICAgIHJldHVybiBzZiAhPT0gb2xkRmlsZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc291cmNlRmlsZXNUb0VtaXQ7XG4gIH1cblxuICBwcml2YXRlIHdyaXRlRmlsZShcbiAgICAgIG91dEZpbGVOYW1lOiBzdHJpbmcsIG91dERhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgb25FcnJvcj86IChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQsIGdlbkZpbGU/OiBHZW5lcmF0ZWRGaWxlLFxuICAgICAgc291cmNlRmlsZXM/OiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+KSB7XG4gICAgLy8gY29sbGVjdCBlbWl0dGVkTGlicmFyeVN1bW1hcmllc1xuICAgIGxldCBiYXNlRmlsZTogdHMuU291cmNlRmlsZXx1bmRlZmluZWQ7XG4gICAgaWYgKGdlbkZpbGUpIHtcbiAgICAgIGJhc2VGaWxlID0gdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZShnZW5GaWxlLnNyY0ZpbGVVcmwpO1xuICAgICAgaWYgKGJhc2VGaWxlKSB7XG4gICAgICAgIGlmICghdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcykge1xuICAgICAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZ2VuRmlsZS5nZW5GaWxlVXJsLmVuZHNXaXRoKCcubmdzdW1tYXJ5Lmpzb24nKSAmJiBiYXNlRmlsZS5maWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMucHVzaCh7XG4gICAgICAgICAgICBmaWxlTmFtZTogYmFzZUZpbGUuZmlsZU5hbWUsXG4gICAgICAgICAgICB0ZXh0OiBiYXNlRmlsZS50ZXh0LFxuICAgICAgICAgICAgc291cmNlRmlsZTogYmFzZUZpbGUsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5lbWl0dGVkTGlicmFyeVN1bW1hcmllcy5wdXNoKHtmaWxlTmFtZTogZ2VuRmlsZS5nZW5GaWxlVXJsLCB0ZXh0OiBvdXREYXRhfSk7XG4gICAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuZGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgIC8vIElmIHdlIGRvbid0IGVtaXQgZGVjbGFyYXRpb25zLCBzdGlsbCByZWNvcmQgYW4gZW1wdHkgLm5nZmFjdG9yeS5kLnRzIGZpbGUsXG4gICAgICAgICAgICAvLyBhcyB3ZSBtaWdodCBuZWVkIGl0IGxhdGVyIG9uIGZvciByZXNvbHZpbmcgbW9kdWxlIG5hbWVzIGZyb20gc3VtbWFyaWVzLlxuICAgICAgICAgICAgY29uc3QgbmdGYWN0b3J5RHRzID1cbiAgICAgICAgICAgICAgICBnZW5GaWxlLmdlbkZpbGVVcmwuc3Vic3RyaW5nKDAsIGdlbkZpbGUuZ2VuRmlsZVVybC5sZW5ndGggLSAxNSkgKyAnLm5nZmFjdG9yeS5kLnRzJztcbiAgICAgICAgICAgIHRoaXMuZW1pdHRlZExpYnJhcnlTdW1tYXJpZXMucHVzaCh7ZmlsZU5hbWU6IG5nRmFjdG9yeUR0cywgdGV4dDogJyd9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAob3V0RmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJykgJiYgYmFzZUZpbGUuZmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJykpIHtcbiAgICAgICAgICBjb25zdCBkdHNTb3VyY2VGaWxlUGF0aCA9IGdlbkZpbGUuZ2VuRmlsZVVybC5yZXBsYWNlKC9cXC50cyQvLCAnLmQudHMnKTtcbiAgICAgICAgICAvLyBOb3RlOiBEb24ndCB1c2Ugc291cmNlRmlsZXMgaGVyZSBhcyB0aGUgY3JlYXRlZCAuZC50cyBoYXMgYSBwYXRoIGluIHRoZSBvdXREaXIsXG4gICAgICAgICAgLy8gYnV0IHdlIG5lZWQgb25lIHRoYXQgaXMgbmV4dCB0byB0aGUgLnRzIGZpbGVcbiAgICAgICAgICB0aGlzLmVtaXR0ZWRMaWJyYXJ5U3VtbWFyaWVzLnB1c2goe2ZpbGVOYW1lOiBkdHNTb3VyY2VGaWxlUGF0aCwgdGV4dDogb3V0RGF0YX0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEZpbHRlciBvdXQgZ2VuZXJhdGVkIGZpbGVzIGZvciB3aGljaCB3ZSBkaWRuJ3QgZ2VuZXJhdGUgY29kZS5cbiAgICAvLyBUaGlzIGNhbiBoYXBwZW4gYXMgdGhlIHN0dWIgY2FsY3VsYXRpb24gaXMgbm90IGNvbXBsZXRlbHkgZXhhY3QuXG4gICAgLy8gTm90ZTogc291cmNlRmlsZSByZWZlcnMgdG8gdGhlIC5uZ2ZhY3RvcnkudHMgLyAubmdzdW1tYXJ5LnRzIGZpbGVcbiAgICAvLyBub2RlX2VtaXR0ZXJfdHJhbnNmb3JtIGFscmVhZHkgc2V0IHRoZSBmaWxlIGNvbnRlbnRzIHRvIGJlIGVtcHR5LFxuICAgIC8vICBzbyB0aGlzIGNvZGUgb25seSBuZWVkcyB0byBza2lwIHRoZSBmaWxlIGlmICFhbGxvd0VtcHR5Q29kZWdlbkZpbGVzLlxuICAgIGNvbnN0IGlzR2VuZXJhdGVkID0gR0VORVJBVEVEX0ZJTEVTLnRlc3Qob3V0RmlsZU5hbWUpO1xuICAgIGlmIChpc0dlbmVyYXRlZCAmJiAhdGhpcy5vcHRpb25zLmFsbG93RW1wdHlDb2RlZ2VuRmlsZXMgJiZcbiAgICAgICAgKCFnZW5GaWxlIHx8ICFnZW5GaWxlLnN0bXRzIHx8IGdlbkZpbGUuc3RtdHMubGVuZ3RoID09PSAwKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoYmFzZUZpbGUpIHtcbiAgICAgIHNvdXJjZUZpbGVzID0gc291cmNlRmlsZXMgPyBbLi4uc291cmNlRmlsZXMsIGJhc2VGaWxlXSA6IFtiYXNlRmlsZV07XG4gICAgfVxuICAgIC8vIFRPRE86IHJlbW92ZSBhbnkgd2hlbiBUUyAyLjQgc3VwcG9ydCBpcyByZW1vdmVkLlxuICAgIHRoaXMuaG9zdC53cml0ZUZpbGUob3V0RmlsZU5hbWUsIG91dERhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMgYXMgYW55KTtcbiAgfVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm9ncmFtKHtyb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIG9sZFByb2dyYW19OiB7XG4gIHJvb3ROYW1lczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsXG4gIGhvc3Q6IENvbXBpbGVySG9zdCxcbiAgb2xkUHJvZ3JhbT86IFByb2dyYW1cbn0pOiBQcm9ncmFtIHtcbiAgaWYgKG9wdGlvbnMuZW5hYmxlSXZ5ICE9PSBmYWxzZSkge1xuICAgIHJldHVybiBuZXcgTmd0c2NQcm9ncmFtKHJvb3ROYW1lcywgb3B0aW9ucywgaG9zdCwgb2xkUHJvZ3JhbSBhcyBOZ3RzY1Byb2dyYW0gfCB1bmRlZmluZWQpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgQW5ndWxhckNvbXBpbGVyUHJvZ3JhbShyb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIG9sZFByb2dyYW0pO1xuICB9XG59XG5cbi8vIENvbXB1dGUgdGhlIEFvdENvbXBpbGVyIG9wdGlvbnNcbmZ1bmN0aW9uIGdldEFvdENvbXBpbGVyT3B0aW9ucyhvcHRpb25zOiBDb21waWxlck9wdGlvbnMpOiBBb3RDb21waWxlck9wdGlvbnMge1xuICBsZXQgbWlzc2luZ1RyYW5zbGF0aW9uID0gY29yZS5NaXNzaW5nVHJhbnNsYXRpb25TdHJhdGVneS5XYXJuaW5nO1xuXG4gIHN3aXRjaCAob3B0aW9ucy5pMThuSW5NaXNzaW5nVHJhbnNsYXRpb25zKSB7XG4gICAgY2FzZSAnaWdub3JlJzpcbiAgICAgIG1pc3NpbmdUcmFuc2xhdGlvbiA9IGNvcmUuTWlzc2luZ1RyYW5zbGF0aW9uU3RyYXRlZ3kuSWdub3JlO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZXJyb3InOlxuICAgICAgbWlzc2luZ1RyYW5zbGF0aW9uID0gY29yZS5NaXNzaW5nVHJhbnNsYXRpb25TdHJhdGVneS5FcnJvcjtcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgbGV0IHRyYW5zbGF0aW9uczogc3RyaW5nID0gJyc7XG5cbiAgaWYgKG9wdGlvbnMuaTE4bkluRmlsZSkge1xuICAgIGlmICghb3B0aW9ucy5pMThuSW5Mb2NhbGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHRyYW5zbGF0aW9uIGZpbGUgKCR7b3B0aW9ucy5pMThuSW5GaWxlfSkgbG9jYWxlIG11c3QgYmUgcHJvdmlkZWQuYCk7XG4gICAgfVxuICAgIHRyYW5zbGF0aW9ucyA9IGZzLnJlYWRGaWxlU3luYyhvcHRpb25zLmkxOG5JbkZpbGUsICd1dGY4Jyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTm8gdHJhbnNsYXRpb25zIGFyZSBwcm92aWRlZCwgaWdub3JlIGFueSBlcnJvcnNcbiAgICAvLyBXZSBzdGlsbCBnbyB0aHJvdWdoIGkxOG4gdG8gcmVtb3ZlIGkxOG4gYXR0cmlidXRlc1xuICAgIG1pc3NpbmdUcmFuc2xhdGlvbiA9IGNvcmUuTWlzc2luZ1RyYW5zbGF0aW9uU3RyYXRlZ3kuSWdub3JlO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBsb2NhbGU6IG9wdGlvbnMuaTE4bkluTG9jYWxlLFxuICAgIGkxOG5Gb3JtYXQ6IG9wdGlvbnMuaTE4bkluRm9ybWF0IHx8IG9wdGlvbnMuaTE4bk91dEZvcm1hdCxcbiAgICBpMThuVXNlRXh0ZXJuYWxJZHM6IG9wdGlvbnMuaTE4blVzZUV4dGVybmFsSWRzLFxuICAgIHRyYW5zbGF0aW9ucyxcbiAgICBtaXNzaW5nVHJhbnNsYXRpb24sXG4gICAgZW5hYmxlU3VtbWFyaWVzRm9ySml0OiBvcHRpb25zLmVuYWJsZVN1bW1hcmllc0ZvckppdCxcbiAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBvcHRpb25zLnByZXNlcnZlV2hpdGVzcGFjZXMsXG4gICAgZnVsbFRlbXBsYXRlVHlwZUNoZWNrOiBvcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjayxcbiAgICBhbGxvd0VtcHR5Q29kZWdlbkZpbGVzOiBvcHRpb25zLmFsbG93RW1wdHlDb2RlZ2VuRmlsZXMsXG4gICAgZW5hYmxlSXZ5OiBvcHRpb25zLmVuYWJsZUl2eSxcbiAgICBjcmVhdGVFeHRlcm5hbFN5bWJvbEZhY3RvcnlSZWV4cG9ydHM6IG9wdGlvbnMuY3JlYXRlRXh0ZXJuYWxTeW1ib2xGYWN0b3J5UmVleHBvcnRzLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXROZ09wdGlvbkRpYWdub3N0aWNzKG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyk6IFJlYWRvbmx5QXJyYXk8RGlhZ25vc3RpYz4ge1xuICBpZiAob3B0aW9ucy5hbm5vdGF0aW9uc0FzKSB7XG4gICAgc3dpdGNoIChvcHRpb25zLmFubm90YXRpb25zQXMpIHtcbiAgICAgIGNhc2UgJ2RlY29yYXRvcnMnOlxuICAgICAgY2FzZSAnc3RhdGljIGZpZWxkcyc6XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIFt7XG4gICAgICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgICAgICdBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbnMgXCJhbm5vdGF0aW9uc0FzXCIgb25seSBzdXBwb3J0cyBcInN0YXRpYyBmaWVsZHNcIiBhbmQgXCJkZWNvcmF0b3JzXCInLFxuICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICAgICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFXG4gICAgICAgIH1dO1xuICAgIH1cbiAgfVxuICByZXR1cm4gW107XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVNlcGFyYXRvcnMocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGNhbiBhZGp1c3QgYSBwYXRoIGZyb20gc291cmNlIHBhdGggdG8gb3V0IHBhdGgsXG4gKiBiYXNlZCBvbiBhbiBleGlzdGluZyBtYXBwaW5nIGZyb20gc291cmNlIHRvIG91dCBwYXRoLlxuICpcbiAqIFRPRE8odGJvc2NoKTogdGFsayB0byB0aGUgVHlwZVNjcmlwdCB0ZWFtIHRvIGV4cG9zZSB0aGVpciBsb2dpYyBmb3IgY2FsY3VsYXRpbmcgdGhlIGByb290RGlyYFxuICogaWYgbm9uZSB3YXMgc3BlY2lmaWVkLlxuICpcbiAqIE5vdGU6IFRoaXMgZnVuY3Rpb24gd29ya3Mgb24gbm9ybWFsaXplZCBwYXRocyBmcm9tIHR5cGVzY3JpcHQgYnV0IHNob3VsZCBhbHdheXMgcmV0dXJuXG4gKiBQT1NJWCBub3JtYWxpemVkIHBhdGhzIGZvciBvdXRwdXQgcGF0aHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTcmNUb091dFBhdGhNYXBwZXIoXG4gICAgb3V0RGlyOiBzdHJpbmd8dW5kZWZpbmVkLCBzYW1wbGVTcmNGaWxlTmFtZTogc3RyaW5nfHVuZGVmaW5lZCxcbiAgICBzYW1wbGVPdXRGaWxlTmFtZTogc3RyaW5nfHVuZGVmaW5lZCwgaG9zdDoge1xuICAgICAgZGlybmFtZTogdHlwZW9mIHBhdGguZGlybmFtZSxcbiAgICAgIHJlc29sdmU6IHR5cGVvZiBwYXRoLnJlc29sdmUsXG4gICAgICByZWxhdGl2ZTogdHlwZW9mIHBhdGgucmVsYXRpdmVcbiAgICB9ID0gcGF0aCk6IChzcmNGaWxlTmFtZTogc3RyaW5nKSA9PiBzdHJpbmcge1xuICBpZiAob3V0RGlyKSB7XG4gICAgbGV0IHBhdGg6IHt9ID0ge307ICAvLyBFbnN1cmUgd2UgZXJyb3IgaWYgd2UgdXNlIGBwYXRoYCBpbnN0ZWFkIG9mIGBob3N0YC5cbiAgICBpZiAoc2FtcGxlU3JjRmlsZU5hbWUgPT0gbnVsbCB8fCBzYW1wbGVPdXRGaWxlTmFtZSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IGNhbGN1bGF0ZSB0aGUgcm9vdERpciB3aXRob3V0IGEgc2FtcGxlIHNyY0ZpbGVOYW1lIC8gb3V0RmlsZU5hbWUuIGApO1xuICAgIH1cbiAgICBjb25zdCBzcmNGaWxlRGlyID0gbm9ybWFsaXplU2VwYXJhdG9ycyhob3N0LmRpcm5hbWUoc2FtcGxlU3JjRmlsZU5hbWUpKTtcbiAgICBjb25zdCBvdXRGaWxlRGlyID0gbm9ybWFsaXplU2VwYXJhdG9ycyhob3N0LmRpcm5hbWUoc2FtcGxlT3V0RmlsZU5hbWUpKTtcbiAgICBpZiAoc3JjRmlsZURpciA9PT0gb3V0RmlsZURpcikge1xuICAgICAgcmV0dXJuIChzcmNGaWxlTmFtZSkgPT4gc3JjRmlsZU5hbWU7XG4gICAgfVxuICAgIC8vIGNhbGN1bGF0ZSB0aGUgY29tbW9uIHN1ZmZpeCwgc3RvcHBpbmdcbiAgICAvLyBhdCBgb3V0RGlyYC5cbiAgICBjb25zdCBzcmNEaXJQYXJ0cyA9IHNyY0ZpbGVEaXIuc3BsaXQoJy8nKTtcbiAgICBjb25zdCBvdXREaXJQYXJ0cyA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMoaG9zdC5yZWxhdGl2ZShvdXREaXIsIG91dEZpbGVEaXIpKS5zcGxpdCgnLycpO1xuICAgIGxldCBpID0gMDtcbiAgICB3aGlsZSAoaSA8IE1hdGgubWluKHNyY0RpclBhcnRzLmxlbmd0aCwgb3V0RGlyUGFydHMubGVuZ3RoKSAmJlxuICAgICAgICAgICBzcmNEaXJQYXJ0c1tzcmNEaXJQYXJ0cy5sZW5ndGggLSAxIC0gaV0gPT09IG91dERpclBhcnRzW291dERpclBhcnRzLmxlbmd0aCAtIDEgLSBpXSlcbiAgICAgIGkrKztcbiAgICBjb25zdCByb290RGlyID0gc3JjRGlyUGFydHMuc2xpY2UoMCwgc3JjRGlyUGFydHMubGVuZ3RoIC0gaSkuam9pbignLycpO1xuICAgIHJldHVybiAoc3JjRmlsZU5hbWUpID0+IHtcbiAgICAgIC8vIE5vdGU6IEJlZm9yZSB3ZSByZXR1cm4gdGhlIG1hcHBlZCBvdXRwdXQgcGF0aCwgd2UgbmVlZCB0byBub3JtYWxpemUgdGhlIHBhdGggZGVsaW1pdGVyc1xuICAgICAgLy8gYmVjYXVzZSB0aGUgb3V0cHV0IHBhdGggaXMgdXN1YWxseSBwYXNzZWQgdG8gVHlwZVNjcmlwdCB3aGljaCBzb21ldGltZXMgb25seSBleHBlY3RzXG4gICAgICAvLyBwb3NpeCBub3JtYWxpemVkIHBhdGhzIChlLmcuIGlmIGEgY3VzdG9tIGNvbXBpbGVyIGhvc3QgaXMgdXNlZClcbiAgICAgIHJldHVybiBub3JtYWxpemVTZXBhcmF0b3JzKGhvc3QucmVzb2x2ZShvdXREaXIsIGhvc3QucmVsYXRpdmUocm9vdERpciwgc3JjRmlsZU5hbWUpKSk7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICAvLyBOb3RlOiBCZWZvcmUgd2UgcmV0dXJuIHRoZSBvdXRwdXQgcGF0aCwgd2UgbmVlZCB0byBub3JtYWxpemUgdGhlIHBhdGggZGVsaW1pdGVycyBiZWNhdXNlXG4gICAgLy8gdGhlIG91dHB1dCBwYXRoIGlzIHVzdWFsbHkgcGFzc2VkIHRvIFR5cGVTY3JpcHQgd2hpY2ggb25seSBwYXNzZXMgYXJvdW5kIHBvc2l4XG4gICAgLy8gbm9ybWFsaXplZCBwYXRocyAoZS5nLiBpZiBhIGN1c3RvbSBjb21waWxlciBob3N0IGlzIHVzZWQpXG4gICAgcmV0dXJuIChzcmNGaWxlTmFtZSkgPT4gbm9ybWFsaXplU2VwYXJhdG9ycyhzcmNGaWxlTmFtZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGkxOG5FeHRyYWN0KFxuICAgIGZvcm1hdE5hbWU6IHN0cmluZ3xudWxsLCBvdXRGaWxlOiBzdHJpbmd8bnVsbCwgaG9zdDogdHMuQ29tcGlsZXJIb3N0LCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsXG4gICAgYnVuZGxlOiBNZXNzYWdlQnVuZGxlKTogc3RyaW5nW10ge1xuICBmb3JtYXROYW1lID0gZm9ybWF0TmFtZSB8fCAneGxmJztcbiAgLy8gQ2hlY2tzIHRoZSBmb3JtYXQgYW5kIHJldHVybnMgdGhlIGV4dGVuc2lvblxuICBjb25zdCBleHQgPSBpMThuR2V0RXh0ZW5zaW9uKGZvcm1hdE5hbWUpO1xuICBjb25zdCBjb250ZW50ID0gaTE4blNlcmlhbGl6ZShidW5kbGUsIGZvcm1hdE5hbWUsIG9wdGlvbnMpO1xuICBjb25zdCBkc3RGaWxlID0gb3V0RmlsZSB8fCBgbWVzc2FnZXMuJHtleHR9YDtcbiAgY29uc3QgZHN0UGF0aCA9IHBhdGgucmVzb2x2ZShvcHRpb25zLm91dERpciB8fCBvcHRpb25zLmJhc2VQYXRoISwgZHN0RmlsZSk7XG4gIGhvc3Qud3JpdGVGaWxlKGRzdFBhdGgsIGNvbnRlbnQsIGZhbHNlLCB1bmRlZmluZWQsIFtdKTtcbiAgcmV0dXJuIFtkc3RQYXRoXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGkxOG5TZXJpYWxpemUoXG4gICAgYnVuZGxlOiBNZXNzYWdlQnVuZGxlLCBmb3JtYXROYW1lOiBzdHJpbmcsIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyk6IHN0cmluZyB7XG4gIGNvbnN0IGZvcm1hdCA9IGZvcm1hdE5hbWUudG9Mb3dlckNhc2UoKTtcbiAgbGV0IHNlcmlhbGl6ZXI6IFNlcmlhbGl6ZXI7XG5cbiAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICBjYXNlICd4bWInOlxuICAgICAgc2VyaWFsaXplciA9IG5ldyBYbWIoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3hsaWZmMic6XG4gICAgY2FzZSAneGxmMic6XG4gICAgICBzZXJpYWxpemVyID0gbmV3IFhsaWZmMigpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAneGxmJzpcbiAgICBjYXNlICd4bGlmZic6XG4gICAgZGVmYXVsdDpcbiAgICAgIHNlcmlhbGl6ZXIgPSBuZXcgWGxpZmYoKTtcbiAgfVxuXG4gIHJldHVybiBidW5kbGUud3JpdGUoc2VyaWFsaXplciwgZ2V0UGF0aE5vcm1hbGl6ZXIob3B0aW9ucy5iYXNlUGF0aCkpO1xufVxuXG5mdW5jdGlvbiBnZXRQYXRoTm9ybWFsaXplcihiYXNlUGF0aD86IHN0cmluZykge1xuICAvLyBub3JtYWxpemUgc291cmNlIHBhdGhzIGJ5IHJlbW92aW5nIHRoZSBiYXNlIHBhdGggYW5kIGFsd2F5cyB1c2luZyBcIi9cIiBhcyBhIHNlcGFyYXRvclxuICByZXR1cm4gKHNvdXJjZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIHNvdXJjZVBhdGggPSBiYXNlUGF0aCA/IHBhdGgucmVsYXRpdmUoYmFzZVBhdGgsIHNvdXJjZVBhdGgpIDogc291cmNlUGF0aDtcbiAgICByZXR1cm4gc291cmNlUGF0aC5zcGxpdChwYXRoLnNlcCkuam9pbignLycpO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaTE4bkdldEV4dGVuc2lvbihmb3JtYXROYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBmb3JtYXQgPSBmb3JtYXROYW1lLnRvTG93ZXJDYXNlKCk7XG5cbiAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICBjYXNlICd4bWInOlxuICAgICAgcmV0dXJuICd4bWInO1xuICAgIGNhc2UgJ3hsZic6XG4gICAgY2FzZSAneGxpZic6XG4gICAgY2FzZSAneGxpZmYnOlxuICAgIGNhc2UgJ3hsZjInOlxuICAgIGNhc2UgJ3hsaWZmMic6XG4gICAgICByZXR1cm4gJ3hsZic7XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGZvcm1hdCBcIiR7Zm9ybWF0TmFtZX1cImApO1xufVxuXG5mdW5jdGlvbiBtZXJnZUVtaXRSZXN1bHRzKGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10pOiB0cy5FbWl0UmVzdWx0IHtcbiAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBsZXQgZW1pdFNraXBwZWQgPSBmYWxzZTtcbiAgY29uc3QgZW1pdHRlZEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVyIG9mIGVtaXRSZXN1bHRzKSB7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5lci5kaWFnbm9zdGljcyk7XG4gICAgZW1pdFNraXBwZWQgPSBlbWl0U2tpcHBlZCB8fCBlci5lbWl0U2tpcHBlZDtcbiAgICBlbWl0dGVkRmlsZXMucHVzaCguLi4oZXIuZW1pdHRlZEZpbGVzIHx8IFtdKSk7XG4gIH1cbiAgcmV0dXJuIHtkaWFnbm9zdGljcywgZW1pdFNraXBwZWQsIGVtaXR0ZWRGaWxlc307XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNTb3VyY2VPZlNwYW4oc3BhbjogUGFyc2VTb3VyY2VTcGFuKTogdHMuU291cmNlRmlsZSB7XG4gIC8vIEZvciBkaWFnbm9zdGljcywgVHlwZVNjcmlwdCBvbmx5IHVzZXMgdGhlIGZpbGVOYW1lIGFuZCB0ZXh0IHByb3BlcnRpZXMuXG4gIC8vIFRoZSByZWR1bmRhbnQgJygpJyBhcmUgaGVyZSBpcyB0byBhdm9pZCBoYXZpbmcgY2xhbmctZm9ybWF0IGJyZWFraW5nIHRoZSBsaW5lIGluY29ycmVjdGx5LlxuICByZXR1cm4gKHtmaWxlTmFtZTogc3Bhbi5zdGFydC5maWxlLnVybCwgdGV4dDogc3Bhbi5zdGFydC5maWxlLmNvbnRlbnR9IGFzIGFueSk7XG59XG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNTb3VyY2VPZkZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcsIHByb2dyYW06IHRzLlByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlIHtcbiAgY29uc3Qgc291cmNlRmlsZSA9IHByb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gIGlmIChzb3VyY2VGaWxlKSByZXR1cm4gc291cmNlRmlsZTtcblxuICAvLyBJZiB3ZSBhcmUgcmVwb3J0aW5nIGRpYWdub3N0aWNzIGZvciBhIHNvdXJjZSBmaWxlIHRoYXQgaXMgbm90IGluIHRoZSBwcm9qZWN0IHRoZW4gd2UgbmVlZFxuICAvLyB0byBmYWtlIGEgc291cmNlIGZpbGUgc28gdGhlIGRpYWdub3N0aWMgZm9ybWF0dGluZyByb3V0aW5lcyBjYW4gZW1pdCB0aGUgZmlsZSBuYW1lLlxuICAvLyBUaGUgcmVkdW5kYW50ICcoKScgYXJlIGhlcmUgaXMgdG8gYXZvaWQgaGF2aW5nIGNsYW5nLWZvcm1hdCBicmVha2luZyB0aGUgbGluZSBpbmNvcnJlY3RseS5cbiAgcmV0dXJuICh7ZmlsZU5hbWUsIHRleHQ6ICcnfSBhcyBhbnkpO1xufVxuXG5cbmZ1bmN0aW9uIGRpYWdub3N0aWNDaGFpbkZyb21Gb3JtYXR0ZWREaWFnbm9zdGljQ2hhaW4oY2hhaW46IEZvcm1hdHRlZE1lc3NhZ2VDaGFpbik6XG4gICAgRGlhZ25vc3RpY01lc3NhZ2VDaGFpbiB7XG4gIHJldHVybiB7XG4gICAgbWVzc2FnZVRleHQ6IGNoYWluLm1lc3NhZ2UsXG4gICAgbmV4dDogY2hhaW4ubmV4dCAmJiBjaGFpbi5uZXh0Lm1hcChkaWFnbm9zdGljQ2hhaW5Gcm9tRm9ybWF0dGVkRGlhZ25vc3RpY0NoYWluKSxcbiAgICBwb3NpdGlvbjogY2hhaW4ucG9zaXRpb25cbiAgfTtcbn1cblxuZnVuY3Rpb24gc3ludGF4RXJyb3JUb0RpYWdub3N0aWNzKGVycm9yOiBFcnJvciwgcHJvZ3JhbTogdHMuUHJvZ3JhbSk6IERpYWdub3N0aWNbXSB7XG4gIGNvbnN0IHBhcnNlckVycm9ycyA9IGdldFBhcnNlRXJyb3JzKGVycm9yKTtcbiAgaWYgKHBhcnNlckVycm9ycyAmJiBwYXJzZXJFcnJvcnMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHBhcnNlckVycm9ycy5tYXA8RGlhZ25vc3RpYz4oZSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVRleHQ6IGUuY29udGV4dHVhbE1lc3NhZ2UoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IGRpYWdub3N0aWNTb3VyY2VPZlNwYW4oZS5zcGFuKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBlLnNwYW4uc3RhcnQub2Zmc2V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVuZ3RoOiBlLnNwYW4uZW5kLm9mZnNldCAtIGUuc3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBTT1VSQ0UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBERUZBVUxUX0VSUk9SX0NPREVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gIH0gZWxzZSBpZiAoaXNGb3JtYXR0ZWRFcnJvcihlcnJvcikpIHtcbiAgICByZXR1cm4gW3tcbiAgICAgIG1lc3NhZ2VUZXh0OiBlcnJvci5tZXNzYWdlLFxuICAgICAgY2hhaW46IGVycm9yLmNoYWluICYmIGRpYWdub3N0aWNDaGFpbkZyb21Gb3JtYXR0ZWREaWFnbm9zdGljQ2hhaW4oZXJyb3IuY2hhaW4pLFxuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgIHNvdXJjZTogU09VUkNFLFxuICAgICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFLFxuICAgICAgcG9zaXRpb246IGVycm9yLnBvc2l0aW9uXG4gICAgfV07XG4gIH1cblxuICBjb25zdCBuZ01vZHVsZUVycm9yRGF0YSA9IGdldE1pc3NpbmdOZ01vZHVsZU1ldGFkYXRhRXJyb3JEYXRhKGVycm9yKTtcbiAgaWYgKG5nTW9kdWxlRXJyb3JEYXRhICE9PSBudWxsKSB7XG4gICAgLy8gVGhpcyBlcnJvciByZXByZXNlbnRzIHRoZSBpbXBvcnQgb3IgZXhwb3J0IG9mIGFuIGBOZ01vZHVsZWAgdGhhdCBkaWRuJ3QgaGF2ZSB2YWxpZCBtZXRhZGF0YS5cbiAgICAvLyBUaGlzIF9taWdodF8gaGFwcGVuIGJlY2F1c2UgdGhlIE5nTW9kdWxlIGluIHF1ZXN0aW9uIGlzIGFuIEl2eS1jb21waWxlZCBsaWJyYXJ5LCBhbmQgd2Ugd2FudFxuICAgIC8vIHRvIHNob3cgYSBtb3JlIHVzZWZ1bCBlcnJvciBpZiB0aGF0J3MgdGhlIGNhc2UuXG4gICAgY29uc3QgbmdNb2R1bGVDbGFzcyA9XG4gICAgICAgIGdldER0c0NsYXNzKHByb2dyYW0sIG5nTW9kdWxlRXJyb3JEYXRhLmZpbGVOYW1lLCBuZ01vZHVsZUVycm9yRGF0YS5jbGFzc05hbWUpO1xuICAgIGlmIChuZ01vZHVsZUNsYXNzICE9PSBudWxsICYmIGlzSXZ5TmdNb2R1bGUobmdNb2R1bGVDbGFzcykpIHtcbiAgICAgIHJldHVybiBbe1xuICAgICAgICBtZXNzYWdlVGV4dDogYFRoZSBOZ01vZHVsZSAnJHtuZ01vZHVsZUVycm9yRGF0YS5jbGFzc05hbWV9JyBpbiAnJHtcbiAgICAgICAgICAgIG5nTW9kdWxlRXJyb3JEYXRhXG4gICAgICAgICAgICAgICAgLmZpbGVOYW1lfScgaXMgaW1wb3J0ZWQgYnkgdGhpcyBjb21waWxhdGlvbiwgYnV0IGFwcGVhcnMgdG8gYmUgcGFydCBvZiBhIGxpYnJhcnkgY29tcGlsZWQgZm9yIEFuZ3VsYXIgSXZ5LiBUaGlzIG1heSBvY2N1ciBiZWNhdXNlOlxuXG4gIDEpIHRoZSBsaWJyYXJ5IHdhcyBwcm9jZXNzZWQgd2l0aCAnbmdjYycuIFJlbW92aW5nIGFuZCByZWluc3RhbGxpbmcgbm9kZV9tb2R1bGVzIG1heSBmaXggdGhpcyBwcm9ibGVtLlxuXG4gIDIpIHRoZSBsaWJyYXJ5IHdhcyBwdWJsaXNoZWQgZm9yIEFuZ3VsYXIgSXZ5IGFuZCB2MTIrIGFwcGxpY2F0aW9ucyBvbmx5LiBDaGVjayBpdHMgcGVlciBkZXBlbmRlbmNpZXMgY2FyZWZ1bGx5IGFuZCBlbnN1cmUgdGhhdCB5b3UncmUgdXNpbmcgYSBjb21wYXRpYmxlIHZlcnNpb24gb2YgQW5ndWxhci5cblxuU2VlIGh0dHBzOi8vYW5ndWxhci5pby9lcnJvcnMvTkc2OTk5IGZvciBtb3JlIGluZm9ybWF0aW9uLlxuYCxcbiAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFLFxuICAgICAgICBzb3VyY2U6IFNPVVJDRSxcbiAgICAgIH1dO1xuICAgIH1cbiAgfVxuXG4gIC8vIFByb2R1Y2UgYSBEaWFnbm9zdGljIGFueXdheSBzaW5jZSB3ZSBrbm93IGZvciBzdXJlIGBlcnJvcmAgaXMgYSBTeW50YXhFcnJvclxuICByZXR1cm4gW3tcbiAgICBtZXNzYWdlVGV4dDogZXJyb3IubWVzc2FnZSxcbiAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERSxcbiAgICBzb3VyY2U6IFNPVVJDRSxcbiAgfV07XG59XG5cbmZ1bmN0aW9uIGdldER0c0NsYXNzKHByb2dyYW06IHRzLlByb2dyYW0sIGZpbGVOYW1lOiBzdHJpbmcsIGNsYXNzTmFtZTogc3RyaW5nKTogdHMuQ2xhc3NEZWNsYXJhdGlvbnxcbiAgICBudWxsIHtcbiAgY29uc3Qgc2YgPSBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICBpZiAoc2YgPT09IHVuZGVmaW5lZCB8fCAhc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBmb3IgKGNvbnN0IHN0bXQgb2Ygc2Yuc3RhdGVtZW50cykge1xuICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN0bXQpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKHN0bXQubmFtZSA9PT0gdW5kZWZpbmVkIHx8IHN0bXQubmFtZS50ZXh0ICE9PSBjbGFzc05hbWUpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJldHVybiBzdG10O1xuICB9XG5cbiAgLy8gTm8gY2xhc3NlcyBmb3VuZCB0aGF0IG1hdGNoZWQgdGhlIGdpdmVuIG5hbWUuXG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBpc0l2eU5nTW9kdWxlKGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIGZvciAoY29uc3QgbWVtYmVyIG9mIGNsYXp6Lm1lbWJlcnMpIHtcbiAgICBpZiAoIXRzLmlzUHJvcGVydHlEZWNsYXJhdGlvbihtZW1iZXIpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihtZW1iZXIubmFtZSkgJiYgbWVtYmVyLm5hbWUudGV4dCA9PT0gJ8m1bW9kJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgLy8gTm8gSXZ5ICfJtW1vZCcgcHJvcGVydHkgZm91bmQuXG4gIHJldHVybiBmYWxzZTtcbn0iXX0=