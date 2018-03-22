"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const compiler_1 = require("@angular/compiler");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const translate_diagnostics_1 = require("../diagnostics/translate_diagnostics");
const index_1 = require("../metadata/index");
const api_1 = require("./api");
const compiler_host_1 = require("./compiler_host");
const inline_resources_1 = require("./inline_resources");
const lower_expressions_1 = require("./lower_expressions");
const metadata_cache_1 = require("./metadata_cache");
const node_emitter_transform_1 = require("./node_emitter_transform");
const r3_metadata_transform_1 = require("./r3_metadata_transform");
const r3_strip_decorators_1 = require("./r3_strip_decorators");
const r3_transform_1 = require("./r3_transform");
const util_1 = require("./util");
// Closure compiler transforms the form `Service.ngInjectableDef = X` into
// `Service$ngInjectableDef = X`. To prevent this transformation, such assignments need to be
// annotated with @nocollapse. Unfortunately, a bug in Typescript where comments aren't propagated
// through the TS transformations precludes adding the comment via the AST. This workaround detects
// the static assignments to R3 properties such as ngInjectableDef using a regex, as output files
// are written, and applies the annotation through regex replacement.
//
// TODO(alxhub): clean up once fix for TS transformers lands in upstream
//
// Typescript reference issue: https://github.com/Microsoft/TypeScript/issues/22497
// Pattern matching all Render3 property names.
const R3_DEF_NAME_PATTERN = ['ngInjectableDef'].join('|');
// Pattern matching `Identifier.property` where property is a Render3 property.
const R3_DEF_ACCESS_PATTERN = `[^\\s\\.()[\\]]+\.(${R3_DEF_NAME_PATTERN})`;
// Pattern matching a source line that contains a Render3 static property assignment.
// It declares two matching groups - one for the preceding whitespace, the second for the rest
// of the assignment expression.
const R3_DEF_LINE_PATTERN = `^(\\s*)(${R3_DEF_ACCESS_PATTERN} = .*)$`;
// Regex compilation of R3_DEF_LINE_PATTERN. Matching group 1 yields the whitespace preceding the
// assignment, matching group 2 gives the rest of the assignment expressions.
const R3_MATCH_DEFS = new RegExp(R3_DEF_LINE_PATTERN, 'gmu');
// Replacement string that complements R3_MATCH_DEFS. It inserts `/** @nocollapse */` before the
// assignment but after any indentation. Note that this will mess up any sourcemaps on this line
// (though there shouldn't be any, since Render3 properties are synthetic).
const R3_NOCOLLAPSE_DEFS = '$1\/** @nocollapse *\/ $2';
/**
 * Maximum number of files that are emitable via calling ts.Program.emit
 * passing individual targetSourceFiles.
 */
const MAX_FILE_COUNT_FOR_SINGLE_FILE_EMIT = 20;
/**
 * Fields to lower within metadata in render2 mode.
 */
const LOWER_FIELDS = ['useValue', 'useFactory', 'data'];
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
class AngularCompilerProgram {
    constructor(rootNames, options, host, oldProgram) {
        this.options = options;
        this.host = host;
        this._optionsDiagnostics = [];
        this.rootNames = [...rootNames];
        if ((ts.version < '2.7.2' || ts.version >= '2.8.0') && !options.disableTypeScriptVersionCheck) {
            throw new Error(`The Angular Compiler requires TypeScript >=2.7.2 and <2.8.0 but ${ts.version} was found instead.`);
        }
        this.oldTsProgram = oldProgram ? oldProgram.getTsProgram() : undefined;
        if (oldProgram) {
            this.oldProgramLibrarySummaries = oldProgram.getLibrarySummaries();
            this.oldProgramEmittedGeneratedFiles = oldProgram.getEmittedGeneratedFiles();
            this.oldProgramEmittedSourceFiles = oldProgram.getEmittedSourceFiles();
        }
        if (options.flatModuleOutFile) {
            const { host: bundleHost, indexName, errors } = index_1.createBundleIndexHost(options, this.rootNames, host);
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
        return new metadata_cache_1.MetadataCache(new index_1.MetadataCollector({ quotedNames: true }), !!this.options.strictMetadataEmit, transformers);
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
        return this.options.enableIvy === true ? this._emitRender3(parameters) :
            this._emitRender2(parameters);
    }
    _annotateR3Properties(contents) {
        return contents.replace(R3_MATCH_DEFS, R3_NOCOLLAPSE_DEFS);
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
                outData = this._annotateR3Properties(outData);
            }
            this.writeFile(outFileName, outData, writeByteOrderMark, onError, undefined, sourceFiles);
        };
        const emitOnlyDtsFiles = (emitFlags & (api_1.EmitFlags.DTS | api_1.EmitFlags.JS)) == api_1.EmitFlags.DTS;
        const tsCustomTransformers = this.calculateTransforms(
        /* genFiles */ undefined, /* partialModules */ modules, 
        /* stripDecorators */ this.reifiedDecorators, customTransformers);
        const emitResult = emitCallback({
            program: this.tsProgram,
            host: this.host,
            options: this.options,
            writeFile: writeTsFile, emitOnlyDtsFiles,
            customTransformers: tsCustomTransformers
        });
        return emitResult;
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
                    outData = this._annotateR3Properties(outData);
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
        if (this.options.enableResourceInlining) {
            beforeTs.push(inline_resources_1.getInlineResourcesTransformFactory(this.tsProgram, this.hostAdapter));
            metadataTransforms.push(new inline_resources_1.InlineResourcesMetadataTransformer(this.hostAdapter));
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
            metadataTransforms.push(new r3_metadata_transform_1.PartialModuleMetadataTransformer(partialModules));
        }
        if (stripDecorators) {
            beforeTs.push(r3_strip_decorators_1.getDecoratorStripTransformerFactory(stripDecorators, this.compiler.reflector, this.getTsProgram().getTypeChecker()));
            metadataTransforms.push(new r3_strip_decorators_1.StripDecoratorsMetadataTransformer(stripDecorators, this.compiler.reflector));
        }
        if (customTransformers && customTransformers.beforeTs) {
            beforeTs.push(...customTransformers.beforeTs);
        }
        if (metadataTransforms.length > 0) {
            this.metadataCache = this.createMetadataCache(metadataTransforms);
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
function createProgram({ rootNames, options, host, oldProgram }) {
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
        i18nFormat: options.i18nInFormat || options.i18nOutFormat, translations, missingTranslation,
        enableSummariesForJit: options.enableSummariesForJit,
        preserveWhitespaces: options.preserveWhitespaces,
        fullTemplateTypeCheck: options.fullTemplateTypeCheck,
        allowEmptyCodegenFiles: options.allowEmptyCodegenFiles,
        enableIvy: options.enableIvy,
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
 * Note: This function works on normalized paths from typescript.
 *
 * @param outDir
 * @param outSrcMappings
 */
function createSrcToOutPathMapper(outDir, sampleSrcFileName, sampleOutFileName, host = path) {
    let srcToOutPath;
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
        srcToOutPath = (srcFileName) => host.resolve(outDir, host.relative(rootDir, srcFileName));
    }
    else {
        srcToOutPath = (srcFileName) => srcFileName;
    }
    return srcToOutPath;
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
//# sourceMappingURL=program.js.map