/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/transformers/api" />
import { ParseSourceSpan, Position } from '@angular/compiler';
import * as ts from 'typescript';
export declare const DEFAULT_ERROR_CODE = 100;
export declare const UNKNOWN_ERROR_CODE = 500;
export declare const SOURCE: "angular";
export interface DiagnosticMessageChain {
    messageText: string;
    position?: Position;
    next?: DiagnosticMessageChain[];
}
export interface Diagnostic {
    messageText: string;
    span?: ParseSourceSpan;
    position?: Position;
    chain?: DiagnosticMessageChain;
    category: ts.DiagnosticCategory;
    code: number;
    source: 'angular';
}
export declare function isTsDiagnostic(diagnostic: any): diagnostic is ts.Diagnostic;
export declare function isNgDiagnostic(diagnostic: any): diagnostic is Diagnostic;
export interface CompilerOptions extends ts.CompilerOptions {
    genDir?: string;
    basePath?: string;
    skipMetadataEmit?: boolean;
    strictMetadataEmit?: boolean;
    skipTemplateCodegen?: boolean;
    strictInjectionParameters?: boolean;
    flatModuleOutFile?: string;
    flatModuleId?: string;
    flatModulePrivateSymbolPrefix?: string;
    generateCodeForLibraries?: boolean;
    /**
     * Whether to type check the entire template.
     *
     * This flag currently controls a couple aspects of template type-checking, including
     * whether embedded views are checked.
     *
     * For maximum type-checking, set this to `true`, and set `strictTemplates` to `true`.
     *
     * It is an error for this flag to be `false`, while `strictTemplates` is set to `true`.
     */
    fullTemplateTypeCheck?: boolean;
    /**
     * If `true`, implies all template strictness flags below (unless individually disabled).
     *
     * Has no effect unless `fullTemplateTypeCheck` is also enabled.
     *
     * Defaults to `false`, even if "fullTemplateTypeCheck" is set.
     */
    strictTemplates?: boolean;
    /**
     * Whether to check the type of a binding to a directive/component input against the type of the
     * field on the directive/component.
     *
     * For example, if this is `false` then the expression `[input]="expr"` will have `expr` type-
     * checked, but not the assignment of the resulting type to the `input` property of whichever
     * directive or component is receiving the binding. If set to `true`, both sides of the assignment
     * are checked.
     *
     * Defaults to `false`, even if "fullTemplateTypeCheck" is set.
     */
    strictInputTypes?: boolean;
    /**
     * Whether to use strict null types for input bindings for directives.
     *
     * If this is `true`, applications that are compiled with TypeScript's `strictNullChecks` enabled
     * will produce type errors for bindings which can evaluate to `undefined` or `null` where the
     * inputs's type does not include `undefined` or `null` in its type. If set to `false`, all
     * binding expressions are wrapped in a non-null assertion operator to effectively disable strict
     * null checks.
     *
     * Defaults to `false`, even if "fullTemplateTypeCheck" is set. Note that if `strictInputTypes` is
     * not set, or set to `false`, this flag has no effect.
     */
    strictNullInputTypes?: boolean;
    /**
     * Whether to check text attributes that happen to be consumed by a directive or component.
     *
     * For example, in a template containing `<input matInput disabled>` the `disabled` attribute ends
     * up being consumed as an input with type `boolean` by the `matInput` directive. At runtime, the
     * input will be set to the attribute's string value, which is an empty string for attributes
     * without a value, so with this flag set to `true`, an error would be reported. If set to
     * `false`, text attributes will never report an error.
     *
     * Defaults to `false`, even if "fullTemplateTypeCheck" is set. Note that if `strictInputTypes` is
     * not set, or set to `false`, this flag has no effect.
     */
    strictAttributeTypes?: boolean;
    /**
     * Whether to use a strict type for null-safe navigation operations.
     *
     * If this is `false`, then the return type of `a?.b` or `a?()` will be `any`. If set to `true`,
     * then the return type of `a?.b` for example will be the same as the type of the ternary
     * expression `a != null ? a.b : a`.
     *
     * Defaults to `false`, even if "fullTemplateTypeCheck" is set.
     */
    strictSafeNavigationTypes?: boolean;
    /**
     * Whether to infer the type of local references.
     *
     * If this is `true`, the type of a `#ref` variable on a DOM node in the template will be
     * determined by the type of `document.createElement` for the given DOM node. If set to `false`,
     * the type of `ref` for DOM nodes will be `any`.
     *
     * Defaults to `false`, even if "fullTemplateTypeCheck" is set.
     */
    strictDomLocalRefTypes?: boolean;
    /**
     * Whether to infer the type of the `$event` variable in event bindings for directive outputs or
     * animation events.
     *
     * If this is `true`, the type of `$event` will be inferred based on the generic type of
     * `EventEmitter`/`Subject` of the output. If set to `false`, the `$event` variable will be of
     * type `any`.
     *
     * Defaults to `false`, even if "fullTemplateTypeCheck" is set.
     */
    strictOutputEventTypes?: boolean;
    /**
     * Whether to infer the type of the `$event` variable in event bindings to DOM events.
     *
     * If this is `true`, the type of `$event` will be inferred based on TypeScript's
     * `HTMLElementEventMap`, with a fallback to the native `Event` type. If set to `false`, the
     * `$event` variable will be of type `any`.
     *
     * Defaults to `false`, even if "fullTemplateTypeCheck" is set.
     */
    strictDomEventTypes?: boolean;
    _useHostForImportGeneration?: boolean;
    annotateForClosureCompiler?: boolean;
    annotationsAs?: 'decorators' | 'static fields';
    trace?: boolean;
    disableExpressionLowering?: boolean;
    disableTypeScriptVersionCheck?: boolean;
    i18nOutLocale?: string;
    i18nOutFormat?: string;
    i18nOutFile?: string;
    i18nInFormat?: string;
    i18nInLocale?: string;
    i18nInFile?: string;
    i18nInMissingTranslations?: 'error' | 'warning' | 'ignore';
    i18nUseExternalIds?: boolean;
    /**
     * Render `$localize` messages with legacy format ids.
     *
     * This is only active if we are building with `enableIvy: true`.
     * The default value for now is `true`.
     *
     * Use this option when use are using the `$localize` based localization messages but
     * have not migrated the translation files to use the new `$localize` message id format.
     */
    enableI18nLegacyMessageIdFormat?: boolean;
    preserveWhitespaces?: boolean;
    /** generate all possible generated files  */
    allowEmptyCodegenFiles?: boolean;
    /**
     * Whether to generate .ngsummary.ts files that allow to use AOTed artifacts
     * in JIT mode. This is off by default.
     */
    enableSummariesForJit?: boolean;
    /**
     * Whether to replace the `templateUrl` and `styleUrls` property in all
     * @Component decorators with inlined contents in `template` and `styles`
     * properties.
     * When enabled, the .js output of ngc will have no lazy-loaded `templateUrl`
     * or `styleUrl`s. Note that this requires that resources be available to
     * load statically at compile-time.
     */
    enableResourceInlining?: boolean;
    /**
     * Controls whether ngtsc will emit `.ngfactory.js` shims for each compiled `.ts` file.
     *
     * These shims support legacy imports from `ngfactory` files, by exporting a factory shim
     * for each component or NgModule in the original `.ts` file.
     */
    generateNgFactoryShims?: boolean;
    /**
     * Controls whether ngtsc will emit `.ngsummary.js` shims for each compiled `.ts` file.
     *
     * These shims support legacy imports from `ngsummary` files, by exporting an empty object
     * for each NgModule in the original `.ts` file. The only purpose of summaries is to feed them to
     * `TestBed`, which is a no-op in Ivy.
     */
    generateNgSummaryShims?: boolean;
    /**
     * Tells the compiler to generate definitions using the Render3 style code generation.
     * This option defaults to `true`.
     *
     * Acceptable values are as follows:
     *
     * `false` - run ngc normally
     * `true` - run the ngtsc compiler instead of the normal ngc compiler
     * `ngtsc` - alias for `true`
     *
     * @publicApi
     */
    enableIvy?: boolean | 'ngtsc';
    /**
     * Whether NGC should generate re-exports for external symbols which are referenced
     * in Angular metadata (e.g. @Component, @Inject, @ViewChild). This can be enabled in
     * order to avoid dynamically generated module dependencies which can break strict
     * dependency enforcements. This is not enabled by default.
     * Read more about this here: https://github.com/angular/angular/issues/25644.
     */
    createExternalSymbolFactoryReexports?: boolean;
    /**
     * Enables the generation of alias re-exports of directives/pipes that are visible from an
     * NgModule from that NgModule's file.
     *
     * This option should be disabled for application builds or for Angular Package Format libraries
     * (where NgModules along with their directives/pipes are exported via a single entrypoint).
     *
     * For other library compilations which are intended to be path-mapped into an application build
     * (or another library), enabling this option enables the resulting deep imports to work
     * correctly.
     *
     * A consumer of such a path-mapped library will write an import like:
     *
     * ```typescript
     * import {LibModule} from 'lib/deep/path/to/module';
     * ```
     *
     * The compiler will attempt to generate imports of directives/pipes from that same module
     * specifier (the compiler does not rewrite the user's given import path, unlike View Engine).
     *
     * ```typescript
     * import {LibDir, LibCmp, LibPipe} from 'lib/deep/path/to/module';
     * ```
     *
     * It would be burdensome for users to have to re-export all directives/pipes alongside each
     * NgModule to support this import model. Enabling this option tells the compiler to generate
     * private re-exports alongside the NgModule of all the directives/pipes it makes available, to
     * support these future imports.
     */
    generateDeepReexports?: boolean;
    /**
     * Whether the compiler should avoid generating code for classes that haven't been exported.
     * This is only active when building with `enableIvy: true`. Defaults to `true`.
     */
    compileNonExportedClasses?: boolean;
}
export interface CompilerHost extends ts.CompilerHost {
    /**
     * Converts a module name that is used in an `import` to a file path.
     * I.e. `path/to/containingFile.ts` containing `import {...} from 'module-name'`.
     */
    moduleNameToFileName?(moduleName: string, containingFile: string): string | null;
    /**
     * Converts a file path to a module name that can be used as an `import ...`
     * I.e. `path/to/importedFile.ts` should be imported by `path/to/containingFile.ts`.
     */
    fileNameToModuleName?(importedFilePath: string, containingFilePath: string): string;
    /**
     * Converts a file path for a resource that is used in a source file or another resource
     * into a filepath.
     */
    resourceNameToFileName?(resourceName: string, containingFilePath: string): string | null;
    /**
     * Converts a file name into a representation that should be stored in a summary file.
     * This has to include changing the suffix as well.
     * E.g.
     * `some_file.ts` -> `some_file.d.ts`
     *
     * @param referringSrcFileName the soure file that refers to fileName
     */
    toSummaryFileName?(fileName: string, referringSrcFileName: string): string;
    /**
     * Converts a fileName that was processed by `toSummaryFileName` back into a real fileName
     * given the fileName of the library that is referrig to it.
     */
    fromSummaryFileName?(fileName: string, referringLibFileName: string): string;
    /**
     * Load a referenced resource either statically or asynchronously. If the host returns a
     * `Promise<string>` it is assumed the user of the corresponding `Program` will call
     * `loadNgStructureAsync()`. Returning  `Promise<string>` outside `loadNgStructureAsync()` will
     * cause a diagnostics diagnostic error or an exception to be thrown.
     */
    readResource?(fileName: string): Promise<string> | string;
    /**
     * Produce an AMD module name for the source file. Used in Bazel.
     *
     * An AMD module can have an arbitrary name, so that it is require'd by name
     * rather than by path. See http://requirejs.org/docs/whyamd.html#namedmodules
     */
    amdModuleName?(sf: ts.SourceFile): string | undefined;
    /**
     * Get the absolute paths to the changed files that triggered the current compilation
     * or `undefined` if this is not an incremental build.
     */
    getModifiedResourceFiles?(): Set<string> | undefined;
}
export declare enum EmitFlags {
    DTS = 1,
    JS = 2,
    Metadata = 4,
    I18nBundle = 8,
    Codegen = 16,
    Default = 19,
    All = 31
}
export interface CustomTransformers {
    beforeTs?: ts.TransformerFactory<ts.SourceFile>[];
    afterTs?: ts.TransformerFactory<ts.SourceFile>[];
}
export interface TsEmitArguments {
    program: ts.Program;
    host: CompilerHost;
    options: CompilerOptions;
    targetSourceFile?: ts.SourceFile;
    writeFile?: ts.WriteFileCallback;
    cancellationToken?: ts.CancellationToken;
    emitOnlyDtsFiles?: boolean;
    customTransformers?: ts.CustomTransformers;
}
export interface TsEmitCallback {
    (args: TsEmitArguments): ts.EmitResult;
}
export interface TsMergeEmitResultsCallback {
    (results: ts.EmitResult[]): ts.EmitResult;
}
export interface LibrarySummary {
    fileName: string;
    text: string;
    sourceFile?: ts.SourceFile;
}
export interface LazyRoute {
    route: string;
    module: {
        name: string;
        filePath: string;
    };
    referencedModule: {
        name: string;
        filePath: string;
    };
}
export interface Program {
    /**
     * Retrieve the TypeScript program used to produce semantic diagnostics and emit the sources.
     *
     * Angular structural information is required to produce the program.
     */
    getTsProgram(): ts.Program;
    /**
     * Retrieve options diagnostics for the TypeScript options used to create the program. This is
     * faster than calling `getTsProgram().getOptionsDiagnostics()` since it does not need to
     * collect Angular structural information to produce the errors.
     */
    getTsOptionDiagnostics(cancellationToken?: ts.CancellationToken): ReadonlyArray<ts.Diagnostic>;
    /**
     * Retrieve options diagnostics for the Angular options used to create the program.
     */
    getNgOptionDiagnostics(cancellationToken?: ts.CancellationToken): ReadonlyArray<ts.Diagnostic | Diagnostic>;
    /**
     * Retrieve the syntax diagnostics from TypeScript. This is faster than calling
     * `getTsProgram().getSyntacticDiagnostics()` since it does not need to collect Angular structural
     * information to produce the errors.
     */
    getTsSyntacticDiagnostics(sourceFile?: ts.SourceFile, cancellationToken?: ts.CancellationToken): ReadonlyArray<ts.Diagnostic>;
    /**
     * Retrieve the diagnostics for the structure of an Angular application is correctly formed.
     * This includes validating Angular annotations and the syntax of referenced and imbedded HTML
     * and CSS.
     *
     * Note it is important to displaying TypeScript semantic diagnostics along with Angular
     * structural diagnostics as an error in the program structure might cause errors detected in
     * semantic analysis and a semantic error might cause errors in specifying the program structure.
     *
     * Angular structural information is required to produce these diagnostics.
     */
    getNgStructuralDiagnostics(cancellationToken?: ts.CancellationToken): ReadonlyArray<Diagnostic>;
    /**
     * Retrieve the semantic diagnostics from TypeScript. This is equivalent to calling
     * `getTsProgram().getSemanticDiagnostics()` directly and is included for completeness.
     */
    getTsSemanticDiagnostics(sourceFile?: ts.SourceFile, cancellationToken?: ts.CancellationToken): ReadonlyArray<ts.Diagnostic>;
    /**
     * Retrieve the Angular semantic diagnostics.
     *
     * Angular structural information is required to produce these diagnostics.
     */
    getNgSemanticDiagnostics(fileName?: string, cancellationToken?: ts.CancellationToken): ReadonlyArray<ts.Diagnostic | Diagnostic>;
    /**
     * Load Angular structural information asynchronously. If this method is not called then the
     * Angular structural information, including referenced HTML and CSS files, are loaded
     * synchronously. If the supplied Angular compiler host returns a promise from `loadResource()`
     * will produce a diagnostic error message or, `getTsProgram()` or `emit` to throw.
     */
    loadNgStructureAsync(): Promise<void>;
    /**
     * Returns the lazy routes in the program.
     * @param entryRoute A reference to an NgModule like `someModule#name`. If given,
     *              will recursively analyze routes starting from this symbol only.
     *              Otherwise will list all routes for all NgModules in the program/
     */
    listLazyRoutes(entryRoute?: string): LazyRoute[];
    /**
     * Emit the files requested by emitFlags implied by the program.
     *
     * Angular structural information is required to emit files.
     */
    emit({ emitFlags, cancellationToken, customTransformers, emitCallback, mergeEmitResultsCallback }?: {
        emitFlags?: EmitFlags;
        cancellationToken?: ts.CancellationToken;
        customTransformers?: CustomTransformers;
        emitCallback?: TsEmitCallback;
        mergeEmitResultsCallback?: TsMergeEmitResultsCallback;
    }): ts.EmitResult;
    /**
     * Returns the .d.ts / .ngsummary.json / .ngfactory.d.ts files of libraries that have been emitted
     * in this program or previous programs with paths that emulate the fact that these libraries
     * have been compiled before with no outDir.
     */
    getLibrarySummaries(): Map<string, LibrarySummary>;
}
