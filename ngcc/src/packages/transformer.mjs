/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { TypeScriptReflectionHost } from '../../../src/ngtsc/reflection';
import { DecorationAnalyzer } from '../analysis/decoration_analyzer';
import { ModuleWithProvidersAnalyzer } from '../analysis/module_with_providers_analyzer';
import { NgccReferencesRegistry } from '../analysis/ngcc_references_registry';
import { PrivateDeclarationsAnalyzer } from '../analysis/private_declarations_analyzer';
import { SwitchMarkerAnalyzer } from '../analysis/switch_marker_analyzer';
import { DtsProcessing } from '../execution/tasks/api';
import { CommonJsReflectionHost } from '../host/commonjs_host';
import { DelegatingReflectionHost } from '../host/delegating_host';
import { Esm2015ReflectionHost } from '../host/esm2015_host';
import { Esm5ReflectionHost } from '../host/esm5_host';
import { UmdReflectionHost } from '../host/umd_host';
import { CommonJsRenderingFormatter } from '../rendering/commonjs_rendering_formatter';
import { DtsRenderer } from '../rendering/dts_renderer';
import { Esm5RenderingFormatter } from '../rendering/esm5_rendering_formatter';
import { EsmRenderingFormatter } from '../rendering/esm_rendering_formatter';
import { Renderer } from '../rendering/renderer';
import { UmdRenderingFormatter } from '../rendering/umd_rendering_formatter';
/**
 * A Package is stored in a directory on disk and that directory can contain one or more package
 * formats - e.g. fesm2015, UMD, etc. Additionally, each package provides typings (`.d.ts` files).
 *
 * Each of these formats exposes one or more entry points, which are source files that need to be
 * parsed to identify the decorated exported classes that need to be analyzed and compiled by one or
 * more `DecoratorHandler` objects.
 *
 * Each entry point to a package is identified by a `package.json` which contains properties that
 * indicate what formatted bundles are accessible via this end-point.
 *
 * Each bundle is identified by a root `SourceFile` that can be parsed and analyzed to
 * identify classes that need to be transformed; and then finally rendered and written to disk.
 *
 * Along with the source files, the corresponding source maps (either inline or external) and
 * `.d.ts` files are transformed accordingly.
 *
 * - Flat file packages have all the classes in a single file.
 * - Other packages may re-export classes from other non-entry point files.
 * - Some formats may contain multiple "modules" in a single file.
 */
export class Transformer {
    constructor(fs, logger, tsConfig = null) {
        this.fs = fs;
        this.logger = logger;
        this.tsConfig = tsConfig;
    }
    /**
     * Transform the source (and typings) files of a bundle.
     * @param bundle the bundle to transform.
     * @returns information about the files that were transformed.
     */
    transform(bundle) {
        const ngccReflectionHost = this.getHost(bundle);
        const tsReflectionHost = new TypeScriptReflectionHost(bundle.src.program.getTypeChecker());
        const reflectionHost = new DelegatingReflectionHost(tsReflectionHost, ngccReflectionHost);
        // Parse and analyze the files.
        const { decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses, diagnostics } = this.analyzeProgram(reflectionHost, bundle);
        // Bail if the analysis produced any errors.
        if (hasErrors(diagnostics)) {
            return { success: false, diagnostics };
        }
        // Transform the source files and source maps.
        let renderedFiles = [];
        if (bundle.dtsProcessing !== DtsProcessing.Only) {
            // Render the transformed JavaScript files only if we are not doing "typings-only" processing.
            const srcFormatter = this.getRenderingFormatter(ngccReflectionHost, bundle);
            const renderer = new Renderer(reflectionHost, srcFormatter, this.fs, this.logger, bundle, this.tsConfig);
            renderedFiles = renderer.renderProgram(decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses);
        }
        if (bundle.dts) {
            const dtsFormatter = new EsmRenderingFormatter(this.fs, reflectionHost, bundle.isCore);
            const dtsRenderer = new DtsRenderer(dtsFormatter, this.fs, this.logger, reflectionHost, bundle);
            const renderedDtsFiles = dtsRenderer.renderProgram(decorationAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses);
            renderedFiles = renderedFiles.concat(renderedDtsFiles);
        }
        return { success: true, diagnostics, transformedFiles: renderedFiles };
    }
    getHost(bundle) {
        switch (bundle.format) {
            case 'esm2015':
                return new Esm2015ReflectionHost(this.logger, bundle.isCore, bundle.src, bundle.dts);
            case 'esm5':
                return new Esm5ReflectionHost(this.logger, bundle.isCore, bundle.src, bundle.dts);
            case 'umd':
                return new UmdReflectionHost(this.logger, bundle.isCore, bundle.src, bundle.dts);
            case 'commonjs':
                return new CommonJsReflectionHost(this.logger, bundle.isCore, bundle.src, bundle.dts);
            default:
                throw new Error(`Reflection host for "${bundle.format}" not yet implemented.`);
        }
    }
    getRenderingFormatter(host, bundle) {
        switch (bundle.format) {
            case 'esm2015':
                return new EsmRenderingFormatter(this.fs, host, bundle.isCore);
            case 'esm5':
                return new Esm5RenderingFormatter(this.fs, host, bundle.isCore);
            case 'umd':
                if (!(host instanceof UmdReflectionHost)) {
                    throw new Error('UmdRenderer requires a UmdReflectionHost');
                }
                return new UmdRenderingFormatter(this.fs, host, bundle.isCore);
            case 'commonjs':
                return new CommonJsRenderingFormatter(this.fs, host, bundle.isCore);
            default:
                throw new Error(`Renderer for "${bundle.format}" not yet implemented.`);
        }
    }
    analyzeProgram(reflectionHost, bundle) {
        const referencesRegistry = new NgccReferencesRegistry(reflectionHost);
        const switchMarkerAnalyzer = new SwitchMarkerAnalyzer(reflectionHost, bundle.entryPoint.packagePath);
        const switchMarkerAnalyses = switchMarkerAnalyzer.analyzeProgram(bundle.src.program);
        const diagnostics = [];
        const decorationAnalyzer = new DecorationAnalyzer(this.fs, bundle, reflectionHost, referencesRegistry, diagnostic => diagnostics.push(diagnostic), this.tsConfig);
        const decorationAnalyses = decorationAnalyzer.analyzeProgram();
        const moduleWithProvidersAnalyzer = new ModuleWithProvidersAnalyzer(reflectionHost, bundle.src.program.getTypeChecker(), referencesRegistry, bundle.dts !== null);
        const moduleWithProvidersAnalyses = moduleWithProvidersAnalyzer &&
            moduleWithProvidersAnalyzer.analyzeProgram(bundle.src.program);
        const privateDeclarationsAnalyzer = new PrivateDeclarationsAnalyzer(reflectionHost, referencesRegistry);
        const privateDeclarationsAnalyses = privateDeclarationsAnalyzer.analyzeProgram(bundle.src.program);
        return {
            decorationAnalyses,
            switchMarkerAnalyses,
            privateDeclarationsAnalyses,
            moduleWithProvidersAnalyses,
            diagnostics
        };
    }
}
export function hasErrors(diagnostics) {
    return diagnostics.some(d => d.category === ts.DiagnosticCategory.Error);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBQ0gsT0FBTyxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFLakMsT0FBTyxFQUFDLHdCQUF3QixFQUFDLE1BQU0sK0JBQStCLENBQUM7QUFDdkUsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0saUNBQWlDLENBQUM7QUFDbkUsT0FBTyxFQUE4QiwyQkFBMkIsRUFBQyxNQUFNLDRDQUE0QyxDQUFDO0FBQ3BILE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLHNDQUFzQyxDQUFDO0FBQzVFLE9BQU8sRUFBYSwyQkFBMkIsRUFBQyxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xHLE9BQU8sRUFBdUIsb0JBQW9CLEVBQUMsTUFBTSxvQ0FBb0MsQ0FBQztBQUU5RixPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDckQsT0FBTyxFQUFDLHNCQUFzQixFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDN0QsT0FBTyxFQUFDLHdCQUF3QixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDakUsT0FBTyxFQUFDLHFCQUFxQixFQUFDLE1BQU0sc0JBQXNCLENBQUM7QUFDM0QsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFFckQsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDbkQsT0FBTyxFQUFDLDBCQUEwQixFQUFDLE1BQU0sMkNBQTJDLENBQUM7QUFDckYsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBQ3RELE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLHVDQUF1QyxDQUFDO0FBQzdFLE9B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QUFJLENBQUMsQ0FBQztRQUN6QixNQUFNLDJCQUEyQixHQUFHLDJCQUEyQjtZQUMzRCwyQkFBMkIsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVuRSxNQUFNLDJCQUEyQixHQUM3QixJQUFJLDJCQUEyQixDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sMkJBQTJCLEdBQzdCLDJCQUEyQixDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRW5FLE9BQU87WUFDTCxrQkFBa0I7WUFDbEIsb0JBQW9CO1lBQ3BCLDJCQUEyQjtZQUMzQiwyQkFBMkI7WUFDM0IsV0FBVztTQUNaLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLFVBQVUsU0FBUyxDQUFDLFdBQTRCO0lBQ3BELE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUssRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1BhcnNlZENvbmZpZ3VyYXRpb259IGZyb20gJy4uLy4uLy4uJztcbmltcG9ydCB7UmVhZG9ubHlGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9sb2dnaW5nJztcbmltcG9ydCB7VHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0RlY29yYXRpb25BbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvZGVjb3JhdGlvbl9hbmFseXplcic7XG5pbXBvcnQge01vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcywgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9tb2R1bGVfd2l0aF9wcm92aWRlcnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtOZ2NjUmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi9hbmFseXNpcy9uZ2NjX3JlZmVyZW5jZXNfcmVnaXN0cnknO1xuaW1wb3J0IHtFeHBvcnRJbmZvLCBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL3ByaXZhdGVfZGVjbGFyYXRpb25zX2FuYWx5emVyJztcbmltcG9ydCB7U3dpdGNoTWFya2VyQW5hbHlzZXMsIFN3aXRjaE1hcmtlckFuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9zd2l0Y2hfbWFya2VyX2FuYWx5emVyJztcbmltcG9ydCB7Q29tcGlsZWRGaWxlfSBmcm9tICcuLi9hbmFseXNpcy90eXBlcyc7XG5pbXBvcnQge0R0c1Byb2Nlc3Npbmd9IGZyb20gJy4uL2V4ZWN1dGlvbi90YXNrcy9hcGknO1xuaW1wb3J0IHtDb21tb25Kc1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2NvbW1vbmpzX2hvc3QnO1xuaW1wb3J0IHtEZWxlZ2F0aW5nUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZGVsZWdhdGluZ19ob3N0JztcbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTIwMTVfaG9zdCc7XG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9lc201X2hvc3QnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7VW1kUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvdW1kX2hvc3QnO1xuaW1wb3J0IHtDb21tb25Kc1JlbmRlcmluZ0Zvcm1hdHRlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2NvbW1vbmpzX3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtEdHNSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2R0c19yZW5kZXJlcic7XG5pbXBvcnQge0VzbTVSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc201X3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtFc21SZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc21fcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge1JlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvcmVuZGVyZXInO1xuaW1wb3J0IHtSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7VW1kUmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuLi9yZW5kZXJpbmcvdW1kX3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtGaWxlVG9Xcml0ZX0gZnJvbSAnLi4vcmVuZGVyaW5nL3V0aWxzJztcblxuaW1wb3J0IHtFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5cbmV4cG9ydCB0eXBlIFRyYW5zZm9ybVJlc3VsdCA9IHtcbiAgc3VjY2VzczogdHJ1ZTsgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXTsgdHJhbnNmb3JtZWRGaWxlczogRmlsZVRvV3JpdGVbXTtcbn18e1xuICBzdWNjZXNzOiBmYWxzZTtcbiAgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXTtcbn07XG5cbi8qKlxuICogQSBQYWNrYWdlIGlzIHN0b3JlZCBpbiBhIGRpcmVjdG9yeSBvbiBkaXNrIGFuZCB0aGF0IGRpcmVjdG9yeSBjYW4gY29udGFpbiBvbmUgb3IgbW9yZSBwYWNrYWdlXG4gKiBmb3JtYXRzIC0gZS5nLiBmZXNtMjAxNSwgVU1ELCBldGMuIEFkZGl0aW9uYWxseSwgZWFjaCBwYWNrYWdlIHByb3ZpZGVzIHR5cGluZ3MgKGAuZC50c2AgZmlsZXMpLlxuICpcbiAqIEVhY2ggb2YgdGhlc2UgZm9ybWF0cyBleHBvc2VzIG9uZSBvciBtb3JlIGVudHJ5IHBvaW50cywgd2hpY2ggYXJlIHNvdXJjZSBmaWxlcyB0aGF0IG5lZWQgdG8gYmVcbiAqIHBhcnNlZCB0byBpZGVudGlmeSB0aGUgZGVjb3JhdGVkIGV4cG9ydGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIGFuYWx5emVkIGFuZCBjb21waWxlZCBieSBvbmUgb3JcbiAqIG1vcmUgYERlY29yYXRvckhhbmRsZXJgIG9iamVjdHMuXG4gKlxuICogRWFjaCBlbnRyeSBwb2ludCB0byBhIHBhY2thZ2UgaXMgaWRlbnRpZmllZCBieSBhIGBwYWNrYWdlLmpzb25gIHdoaWNoIGNvbnRhaW5zIHByb3BlcnRpZXMgdGhhdFxuICogaW5kaWNhdGUgd2hhdCBmb3JtYXR0ZWQgYnVuZGxlcyBhcmUgYWNjZXNzaWJsZSB2aWEgdGhpcyBlbmQtcG9pbnQuXG4gKlxuICogRWFjaCBidW5kbGUgaXMgaWRlbnRpZmllZCBieSBhIHJvb3QgYFNvdXJjZUZpbGVgIHRoYXQgY2FuIGJlIHBhcnNlZCBhbmQgYW5hbHl6ZWQgdG9cbiAqIGlkZW50aWZ5IGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkOyBhbmQgdGhlbiBmaW5hbGx5IHJlbmRlcmVkIGFuZCB3cml0dGVuIHRvIGRpc2suXG4gKlxuICogQWxvbmcgd2l0aCB0aGUgc291cmNlIGZpbGVzLCB0aGUgY29ycmVzcG9uZGluZyBzb3VyY2UgbWFwcyAoZWl0aGVyIGlubGluZSBvciBleHRlcm5hbCkgYW5kXG4gKiBgLmQudHNgIGZpbGVzIGFyZSB0cmFuc2Zvcm1lZCBhY2NvcmRpbmdseS5cbiAqXG4gKiAtIEZsYXQgZmlsZSBwYWNrYWdlcyBoYXZlIGFsbCB0aGUgY2xhc3NlcyBpbiBhIHNpbmdsZSBmaWxlLlxuICogLSBPdGhlciBwYWNrYWdlcyBtYXkgcmUtZXhwb3J0IGNsYXNzZXMgZnJvbSBvdGhlciBub24tZW50cnkgcG9pbnQgZmlsZXMuXG4gKiAtIFNvbWUgZm9ybWF0cyBtYXkgY29udGFpbiBtdWx0aXBsZSBcIm1vZHVsZXNcIiBpbiBhIHNpbmdsZSBmaWxlLlxuICovXG5leHBvcnQgY2xhc3MgVHJhbnNmb3JtZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZnM6IFJlYWRvbmx5RmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcixcbiAgICAgIHByaXZhdGUgdHNDb25maWc6IFBhcnNlZENvbmZpZ3VyYXRpb258bnVsbCA9IG51bGwpIHt9XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybSB0aGUgc291cmNlIChhbmQgdHlwaW5ncykgZmlsZXMgb2YgYSBidW5kbGUuXG4gICAqIEBwYXJhbSBidW5kbGUgdGhlIGJ1bmRsZSB0byB0cmFuc2Zvcm0uXG4gICAqIEByZXR1cm5zIGluZm9ybWF0aW9uIGFib3V0IHRoZSBmaWxlcyB0aGF0IHdlcmUgdHJhbnNmb3JtZWQuXG4gICAqL1xuICB0cmFuc2Zvcm0oYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKTogVHJhbnNmb3JtUmVzdWx0IHtcbiAgICBjb25zdCBuZ2NjUmVmbGVjdGlvbkhvc3QgPSB0aGlzLmdldEhvc3QoYnVuZGxlKTtcbiAgICBjb25zdCB0c1JlZmxlY3Rpb25Ib3N0ID0gbmV3IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdChidW5kbGUuc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgY29uc3QgcmVmbGVjdGlvbkhvc3QgPSBuZXcgRGVsZWdhdGluZ1JlZmxlY3Rpb25Ib3N0KHRzUmVmbGVjdGlvbkhvc3QsIG5nY2NSZWZsZWN0aW9uSG9zdCk7XG5cbiAgICAvLyBQYXJzZSBhbmQgYW5hbHl6ZSB0aGUgZmlsZXMuXG4gICAgY29uc3Qge1xuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLFxuICAgICAgc3dpdGNoTWFya2VyQW5hbHlzZXMsXG4gICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsXG4gICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMsXG4gICAgICBkaWFnbm9zdGljc1xuICAgIH0gPSB0aGlzLmFuYWx5emVQcm9ncmFtKHJlZmxlY3Rpb25Ib3N0LCBidW5kbGUpO1xuXG4gICAgLy8gQmFpbCBpZiB0aGUgYW5hbHlzaXMgcHJvZHVjZWQgYW55IGVycm9ycy5cbiAgICBpZiAoaGFzRXJyb3JzKGRpYWdub3N0aWNzKSkge1xuICAgICAgcmV0dXJuIHtzdWNjZXNzOiBmYWxzZSwgZGlhZ25vc3RpY3N9O1xuICAgIH1cblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgc291cmNlIGZpbGVzIGFuZCBzb3VyY2UgbWFwcy5cbiAgICBsZXQgcmVuZGVyZWRGaWxlczogRmlsZVRvV3JpdGVbXSA9IFtdO1xuXG4gICAgaWYgKGJ1bmRsZS5kdHNQcm9jZXNzaW5nICE9PSBEdHNQcm9jZXNzaW5nLk9ubHkpIHtcbiAgICAgIC8vIFJlbmRlciB0aGUgdHJhbnNmb3JtZWQgSmF2YVNjcmlwdCBmaWxlcyBvbmx5IGlmIHdlIGFyZSBub3QgZG9pbmcgXCJ0eXBpbmdzLW9ubHlcIiBwcm9jZXNzaW5nLlxuICAgICAgY29uc3Qgc3JjRm9ybWF0dGVyID0gdGhpcy5nZXRSZW5kZXJpbmdGb3JtYXR0ZXIobmdjY1JlZmxlY3Rpb25Ib3N0LCBidW5kbGUpO1xuICAgICAgY29uc3QgcmVuZGVyZXIgPVxuICAgICAgICAgIG5ldyBSZW5kZXJlcihyZWZsZWN0aW9uSG9zdCwgc3JjRm9ybWF0dGVyLCB0aGlzLmZzLCB0aGlzLmxvZ2dlciwgYnVuZGxlLCB0aGlzLnRzQ29uZmlnKTtcbiAgICAgIHJlbmRlcmVkRmlsZXMgPSByZW5kZXJlci5yZW5kZXJQcm9ncmFtKFxuICAgICAgICAgIGRlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyk7XG4gICAgfVxuXG4gICAgaWYgKGJ1bmRsZS5kdHMpIHtcbiAgICAgIGNvbnN0IGR0c0Zvcm1hdHRlciA9IG5ldyBFc21SZW5kZXJpbmdGb3JtYXR0ZXIodGhpcy5mcywgcmVmbGVjdGlvbkhvc3QsIGJ1bmRsZS5pc0NvcmUpO1xuICAgICAgY29uc3QgZHRzUmVuZGVyZXIgPVxuICAgICAgICAgIG5ldyBEdHNSZW5kZXJlcihkdHNGb3JtYXR0ZXIsIHRoaXMuZnMsIHRoaXMubG9nZ2VyLCByZWZsZWN0aW9uSG9zdCwgYnVuZGxlKTtcbiAgICAgIGNvbnN0IHJlbmRlcmVkRHRzRmlsZXMgPSBkdHNSZW5kZXJlci5yZW5kZXJQcm9ncmFtKFxuICAgICAgICAgIGRlY29yYXRpb25BbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLCBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMpO1xuICAgICAgcmVuZGVyZWRGaWxlcyA9IHJlbmRlcmVkRmlsZXMuY29uY2F0KHJlbmRlcmVkRHRzRmlsZXMpO1xuICAgIH1cblxuICAgIHJldHVybiB7c3VjY2VzczogdHJ1ZSwgZGlhZ25vc3RpY3MsIHRyYW5zZm9ybWVkRmlsZXM6IHJlbmRlcmVkRmlsZXN9O1xuICB9XG5cbiAgZ2V0SG9zdChidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICAgIHN3aXRjaCAoYnVuZGxlLmZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0KHRoaXMubG9nZ2VyLCBidW5kbGUuaXNDb3JlLCBidW5kbGUuc3JjLCBidW5kbGUuZHRzKTtcbiAgICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTVSZWZsZWN0aW9uSG9zdCh0aGlzLmxvZ2dlciwgYnVuZGxlLmlzQ29yZSwgYnVuZGxlLnNyYywgYnVuZGxlLmR0cyk7XG4gICAgICBjYXNlICd1bWQnOlxuICAgICAgICByZXR1cm4gbmV3IFVtZFJlZmxlY3Rpb25Ib3N0KHRoaXMubG9nZ2VyLCBidW5kbGUuaXNDb3JlLCBidW5kbGUuc3JjLCBidW5kbGUuZHRzKTtcbiAgICAgIGNhc2UgJ2NvbW1vbmpzJzpcbiAgICAgICAgcmV0dXJuIG5ldyBDb21tb25Kc1JlZmxlY3Rpb25Ib3N0KHRoaXMubG9nZ2VyLCBidW5kbGUuaXNDb3JlLCBidW5kbGUuc3JjLCBidW5kbGUuZHRzKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVmbGVjdGlvbiBob3N0IGZvciBcIiR7YnVuZGxlLmZvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGdldFJlbmRlcmluZ0Zvcm1hdHRlcihob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSk6IFJlbmRlcmluZ0Zvcm1hdHRlciB7XG4gICAgc3dpdGNoIChidW5kbGUuZm9ybWF0KSB7XG4gICAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc21SZW5kZXJpbmdGb3JtYXR0ZXIodGhpcy5mcywgaG9zdCwgYnVuZGxlLmlzQ29yZSk7XG4gICAgICBjYXNlICdlc201JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc201UmVuZGVyaW5nRm9ybWF0dGVyKHRoaXMuZnMsIGhvc3QsIGJ1bmRsZS5pc0NvcmUpO1xuICAgICAgY2FzZSAndW1kJzpcbiAgICAgICAgaWYgKCEoaG9zdCBpbnN0YW5jZW9mIFVtZFJlZmxlY3Rpb25Ib3N0KSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW1kUmVuZGVyZXIgcmVxdWlyZXMgYSBVbWRSZWZsZWN0aW9uSG9zdCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgVW1kUmVuZGVyaW5nRm9ybWF0dGVyKHRoaXMuZnMsIGhvc3QsIGJ1bmRsZS5pc0NvcmUpO1xuICAgICAgY2FzZSAnY29tbW9uanMnOlxuICAgICAgICByZXR1cm4gbmV3IENvbW1vbkpzUmVuZGVyaW5nRm9ybWF0dGVyKHRoaXMuZnMsIGhvc3QsIGJ1bmRsZS5pc0NvcmUpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZW5kZXJlciBmb3IgXCIke2J1bmRsZS5mb3JtYXR9XCIgbm90IHlldCBpbXBsZW1lbnRlZC5gKTtcbiAgICB9XG4gIH1cblxuICBhbmFseXplUHJvZ3JhbShyZWZsZWN0aW9uSG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiBQcm9ncmFtQW5hbHlzZXMge1xuICAgIGNvbnN0IHJlZmVyZW5jZXNSZWdpc3RyeSA9IG5ldyBOZ2NjUmVmZXJlbmNlc1JlZ2lzdHJ5KHJlZmxlY3Rpb25Ib3N0KTtcblxuICAgIGNvbnN0IHN3aXRjaE1hcmtlckFuYWx5emVyID1cbiAgICAgICAgbmV3IFN3aXRjaE1hcmtlckFuYWx5emVyKHJlZmxlY3Rpb25Ib3N0LCBidW5kbGUuZW50cnlQb2ludC5wYWNrYWdlUGF0aCk7XG4gICAgY29uc3Qgc3dpdGNoTWFya2VyQW5hbHlzZXMgPSBzd2l0Y2hNYXJrZXJBbmFseXplci5hbmFseXplUHJvZ3JhbShidW5kbGUuc3JjLnByb2dyYW0pO1xuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGNvbnN0IGRlY29yYXRpb25BbmFseXplciA9IG5ldyBEZWNvcmF0aW9uQW5hbHl6ZXIoXG4gICAgICAgIHRoaXMuZnMsIGJ1bmRsZSwgcmVmbGVjdGlvbkhvc3QsIHJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgICAgZGlhZ25vc3RpYyA9PiBkaWFnbm9zdGljcy5wdXNoKGRpYWdub3N0aWMpLCB0aGlzLnRzQ29uZmlnKTtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHlzZXMgPSBkZWNvcmF0aW9uQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oKTtcblxuICAgIGNvbnN0IG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplciA9IG5ldyBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIoXG4gICAgICAgIHJlZmxlY3Rpb25Ib3N0LCBidW5kbGUuc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSwgcmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgICBidW5kbGUuZHRzICE9PSBudWxsKTtcbiAgICBjb25zdCBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMgPSBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIgJiZcbiAgICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG5cbiAgICBjb25zdCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHl6ZXIgPVxuICAgICAgICBuZXcgUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyKHJlZmxlY3Rpb25Ib3N0LCByZWZlcmVuY2VzUmVnaXN0cnkpO1xuICAgIGNvbnN0IHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyA9XG4gICAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplci5hbmFseXplUHJvZ3JhbShidW5kbGUuc3JjLnByb2dyYW0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRlY29yYXRpb25BbmFseXNlcyxcbiAgICAgIHN3aXRjaE1hcmtlckFuYWx5c2VzLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzLFxuICAgICAgZGlhZ25vc3RpY3NcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNFcnJvcnMoZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSkge1xuICByZXR1cm4gZGlhZ25vc3RpY3Muc29tZShkID0+IGQuY2F0ZWdvcnkgPT09IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcik7XG59XG5cbmludGVyZmFjZSBQcm9ncmFtQW5hbHlzZXMge1xuICBkZWNvcmF0aW9uQW5hbHlzZXM6IE1hcDx0cy5Tb3VyY2VGaWxlLCBDb21waWxlZEZpbGU+O1xuICBzd2l0Y2hNYXJrZXJBbmFseXNlczogU3dpdGNoTWFya2VyQW5hbHlzZXM7XG4gIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogRXhwb3J0SW5mb1tdO1xuICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXM6IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc3xudWxsO1xuICBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdO1xufVxuIl19