/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/core/api/src/public_options" />
import { ExtendedTemplateDiagnosticName } from '../../../../ngtsc/diagnostics';
/**
 * Options supported by the legacy View Engine compiler, which are still consumed by the Angular Ivy
 * compiler for backwards compatibility.
 *
 * These are expected to be removed at some point in the future.
 *
 * @publicApi
 */
export interface LegacyNgcOptions {
    /** generate all possible generated files  */
    allowEmptyCodegenFiles?: boolean;
    /**
     * Whether to type check the entire template.
     *
     * This flag currently controls a couple aspects of template type-checking, including
     * whether embedded views are checked.
     *
     * For maximum type-checking, set this to `true`, and set `strictTemplates` to `true`.
     *
     * It is an error for this flag to be `false`, while `strictTemplates` is set to `true`.
     *
     * @deprecated The `fullTemplateTypeCheck` option has been superseded by the more granular
     * `strictTemplates` family of compiler options. Usage of `fullTemplateTypeCheck` is therefore
     * deprecated, `strictTemplates` and its related options should be used instead.
     */
    fullTemplateTypeCheck?: boolean;
    /**
     * Whether to generate a flat module index of the given name and the corresponding
     * flat module metadata. This option is intended to be used when creating flat
     * modules similar to how `@angular/core` and `@angular/common` are packaged.
     * When this option is used the `package.json` for the library should refer to the
     * generated flat module index instead of the library index file. When using this
     * option only one .metadata.json file is produced that contains all the metadata
     * necessary for symbols exported from the library index.
     * In the generated .ngfactory.ts files flat module index is used to import symbols
     * including both the public API from the library index as well as shrouded internal
     * symbols.
     * By default the .ts file supplied in the `files` field is assumed to be the
     * library index. If more than one is specified, uses `libraryIndex` to select the
     * file to use. If more than one .ts file is supplied and no `libraryIndex` is supplied
     * an error is produced.
     * A flat module index .d.ts and .js will be created with the given `flatModuleOutFile`
     * name in the same location as the library index .d.ts file is emitted.
     * For example, if a library uses `public_api.ts` file as the library index of the
     * module the `tsconfig.json` `files` field would be `["public_api.ts"]`. The
     * `flatModuleOutFile` options could then be set to, for example `"index.js"`, which
     * produces `index.d.ts` and  `index.metadata.json` files. The library's
     * `package.json`'s `module` field would be `"index.js"` and the `typings` field would
     * be `"index.d.ts"`.
     */
    flatModuleOutFile?: string;
    /**
     * Preferred module id to use for importing flat module. References generated by `ngc`
     * will use this module name when importing symbols from the flat module. This is only
     * meaningful when `flatModuleOutFile` is also supplied. It is otherwise ignored.
     */
    flatModuleId?: string;
    /**
     * Always report errors a parameter is supplied whose injection type cannot
     * be determined. When this value option is not provided or is `false`, constructor
     * parameters of classes marked with `@Injectable` whose type cannot be resolved will
     * produce a warning. With this option `true`, they produce an error. When this option is
     * not provided is treated as if it were `false`.
     */
    strictInjectionParameters?: boolean;
    /**
     * Whether to remove blank text nodes from compiled templates. It is `false` by default starting
     * from Angular 6.
     */
    preserveWhitespaces?: boolean;
}
/**
 * Options which were added to the Angular Ivy compiler to support backwards compatibility with
 * existing View Engine applications.
 *
 * These are expected to be removed at some point in the future.
 *
 * @publicApi
 */
export interface NgcCompatibilityOptions {
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
     */
    enableIvy?: boolean | 'ngtsc';
}
/**
 * Options related to template type-checking and its strictness.
 *
 * @publicApi
 */
export interface StrictTemplateOptions {
    /**
     * If `true`, implies all template strictness flags below (unless individually disabled).
     *
     * This flag is a superset of the deprecated `fullTemplateTypeCheck` option.
     *
     * Defaults to `false`, even if "fullTemplateTypeCheck" is `true`.
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
     * Whether to check if the input binding attempts to assign to a restricted field (readonly,
     * private, or protected) on the directive/component.
     *
     * Defaults to `false`, even if "fullTemplateTypeCheck", "strictTemplates" and/or
     * "strictInputTypes" is set. Note that if `strictInputTypes` is not set, or set to `false`, this
     * flag has no effect.
     *
     * Tracking issue for enabling this by default: https://github.com/angular/angular/issues/38400
     */
    strictInputAccessModifiers?: boolean;
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
    /**
     * Whether to include the generic type of components when type-checking the template.
     *
     * If no component has generic type parameters, this setting has no effect.
     *
     * If a component has generic type parameters and this setting is `true`, those generic parameters
     * will be included in the context type for the template. If `false`, any generic parameters will
     * be set to `any` in the template context type.
     *
     * Defaults to `false`, even if "fullTemplateTypeCheck" is set.
     */
    strictContextGenerics?: boolean;
    /**
     * Whether object or array literals defined in templates use their inferred type, or are
     * interpreted as `any`.
     *
     * Defaults to `false` unless `fullTemplateTypeCheck` or `strictTemplates` are set.
     */
    strictLiteralTypes?: boolean;
}
/**
 * A label referring to a `ts.DiagnosticCategory` or `'suppress'`, meaning the associated diagnostic
 * should not be displayed at all.
 *
 * @publicApi
 */
export declare enum DiagnosticCategoryLabel {
    /** Treat the diagnostic as a warning, don't fail the compilation. */
    Warning = "warning",
    /** Treat the diagnostic as a hard error, fail the compilation. */
    Error = "error",
    /** Ignore the diagnostic altogether. */
    Suppress = "suppress"
}
/**
 * Options which control how diagnostics are emitted from the compiler.
 *
 * @publicApi
 */
export interface DiagnosticOptions {
    /** Options which control how diagnostics are emitted from the compiler. */
    extendedDiagnostics?: {
        /**
         * The category to use for configurable diagnostics which are not overridden by `checks`. Uses
         * `warning` by default.
         */
        defaultCategory?: DiagnosticCategoryLabel;
        /**
         * A map of each extended template diagnostic's name to its category. This can be expanded in
         * the future with more information for each check or for additional diagnostics not part of the
         * extended template diagnostics system.
         */
        checks?: {
            [Name in ExtendedTemplateDiagnosticName]?: DiagnosticCategoryLabel;
        };
    };
}
/**
 * Options which control behavior useful for "monorepo" build cases using Bazel (such as the
 * internal Google monorepo, g3).
 *
 * @publicApi
 */
export interface BazelAndG3Options {
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
     * The `.d.ts` file for NgModules contain type pointers to their declarations, imports, and
     * exports. Without this flag, the generated type definition will include
     * components/directives/pipes/NgModules that are declared or imported locally in the NgModule and
     * not necessarily exported to consumers.
     *
     * With this flag set, the type definition generated in the `.d.ts` for an NgModule will be
     * filtered to only list those types which are publicly exported by the NgModule.
     */
    onlyPublishPublicTypingsForNgModules?: boolean;
    /**
     * Insert JSDoc type annotations needed by Closure Compiler
     */
    annotateForClosureCompiler?: boolean;
}
/**
 * Options related to i18n compilation support.
 *
 * @publicApi
 */
export interface I18nOptions {
    /**
     * Locale of the imported translations
     */
    i18nInLocale?: string;
    /**
     * Export format (xlf, xlf2 or xmb) when the xi18n operation is requested.
     */
    i18nOutFormat?: string;
    /**
     * Path to the extracted message file to emit when the xi18n operation is requested.
     */
    i18nOutFile?: string;
    /**
     * Locale of the application (used when xi18n is requested).
     */
    i18nOutLocale?: string;
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
    /**
     * Whether translation variable name should contain external message id
     * (used by Closure Compiler's output of `goog.getMsg` for transition period)
     */
    i18nUseExternalIds?: boolean;
    /**
     * If templates are stored in external files (e.g. via `templateUrl`) then we need to decide
     * whether or not to normalize the line-endings (from `\r\n` to `\n`) when processing ICU
     * expressions.
     *
     * Ideally we would always normalize, but for backward compatibility this flag allows the template
     * parser to avoid normalizing line endings in ICU expressions.
     *
     * If `true` then we will normalize ICU expression line endings.
     * The default is `false`, but this will be switched in a future major release.
     */
    i18nNormalizeLineEndingsInICUs?: boolean;
}
/**
 * Options that specify compilation target.
 *
 * @publicApi
 */
export interface TargetOptions {
    /**
     * Specifies the compilation mode to use. The following modes are available:
     * - 'full': generates fully AOT compiled code using Ivy instructions.
     * - 'partial': generates code in a stable, but intermediate form suitable for publication to NPM.
     *
     * The default value is 'full'.
     */
    compilationMode?: 'full' | 'partial';
}
/**
 * Miscellaneous options that don't fall into any other category
 *
 * @publicApi
 */
export interface MiscOptions {
    /**
     * Whether the compiler should avoid generating code for classes that haven't been exported.
     * This is only active when building with `enableIvy: true`. Defaults to `true`.
     */
    compileNonExportedClasses?: boolean;
    /**
     * Disable TypeScript Version Check.
     */
    disableTypeScriptVersionCheck?: boolean;
}
