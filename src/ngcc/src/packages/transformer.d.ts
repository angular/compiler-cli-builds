/// <amd-module name="@angular/compiler-cli/src/ngcc/src/packages/transformer" />
import { NgccReflectionHost } from '../host/ngcc_host';
import { FileInfo, Renderer } from '../rendering/renderer';
import { EntryPoint } from './entry_point';
import { EntryPointBundle } from './entry_point_bundle';
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
export declare class Transformer {
    private sourcePath;
    private targetPath;
    constructor(sourcePath: string, targetPath: string);
    /**
     * Transform the source (and typings) files of a bundle.
     * @param bundle the bundle to transform.
     */
    transform(entryPoint: EntryPoint, isCore: boolean, bundle: EntryPointBundle): void;
    getHost(isCore: boolean, bundle: EntryPointBundle): NgccReflectionHost;
    getRenderer(host: NgccReflectionHost, isCore: boolean, bundle: EntryPointBundle): Renderer;
    analyzeProgram(reflectionHost: NgccReflectionHost, isCore: boolean, bundle: EntryPointBundle): {
        decorationAnalyses: Map<import("../../../../../../external/ngdeps/node_modules/typescript/lib/typescript").SourceFile, import("@angular/compiler-cli/src/ngcc/src/analysis/decoration_analyzer").CompiledFile>;
        switchMarkerAnalyses: Map<import("../../../../../../external/ngdeps/node_modules/typescript/lib/typescript").SourceFile, import("@angular/compiler-cli/src/ngcc/src/analysis/switch_marker_analyzer").SwitchMarkerAnalysis>;
        privateDeclarationsAnalyses: import("@angular/compiler-cli/src/ngcc/src/analysis/private_declarations_analyzer").ExportInfo[];
    };
    writeFile(file: FileInfo): void;
}
