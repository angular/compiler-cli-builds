/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { intersects, Range, SemVer } from 'semver';
import { createGetSourceFile } from '../get_source_file';
import { PartialClassMetadataLinkerVersion1 } from './partial_class_metadata_linker_1';
import { PartialComponentLinkerVersion1 } from './partial_component_linker_1';
import { PartialDirectiveLinkerVersion1 } from './partial_directive_linker_1';
import { PartialFactoryLinkerVersion1 } from './partial_factory_linker_1';
import { PartialInjectableLinkerVersion1 } from './partial_injectable_linker_1';
import { PartialInjectorLinkerVersion1 } from './partial_injector_linker_1';
import { PartialNgModuleLinkerVersion1 } from './partial_ng_module_linker_1';
import { PartialPipeLinkerVersion1 } from './partial_pipe_linker_1';
export const ɵɵngDeclareDirective = 'ɵɵngDeclareDirective';
export const ɵɵngDeclareClassMetadata = 'ɵɵngDeclareClassMetadata';
export const ɵɵngDeclareComponent = 'ɵɵngDeclareComponent';
export const ɵɵngDeclareFactory = 'ɵɵngDeclareFactory';
export const ɵɵngDeclareInjectable = 'ɵɵngDeclareInjectable';
export const ɵɵngDeclareInjector = 'ɵɵngDeclareInjector';
export const ɵɵngDeclareNgModule = 'ɵɵngDeclareNgModule';
export const ɵɵngDeclarePipe = 'ɵɵngDeclarePipe';
export const declarationFunctions = [
    ɵɵngDeclareDirective, ɵɵngDeclareClassMetadata, ɵɵngDeclareComponent, ɵɵngDeclareFactory,
    ɵɵngDeclareInjectable, ɵɵngDeclareInjector, ɵɵngDeclareNgModule, ɵɵngDeclarePipe
];
/**
 * Create a mapping between partial-declaration call name and collections of partial-linkers.
 *
 * Each collection of partial-linkers will contain a version range that will be matched against the
 * `minVersion` of the partial-declaration. (Additionally, a partial-linker may modify its behaviour
 * internally based on the `version` property of the declaration.)
 *
 * Versions should be sorted in ascending order. The most recent partial-linker will be used as the
 * fallback linker if none of the other version ranges match. For example:
 *
 * ```
 * {range: getRange('<=', '13.0.0'), linker PartialDirectiveLinkerVersion2(...) },
 * {range: getRange('<=', '13.1.0'), linker PartialDirectiveLinkerVersion3(...) },
 * {range: getRange('<=', '14.0.0'), linker PartialDirectiveLinkerVersion4(...) },
 * {range: LATEST_VERSION_RANGE, linker: new PartialDirectiveLinkerVersion1(...)},
 * ```
 *
 * If the `LATEST_VERSION_RANGE` is `<=15.0.0` then the fallback linker would be
 * `PartialDirectiveLinkerVersion1` for any version greater than `15.0.0`.
 *
 * When there is a change to a declaration interface that requires a new partial-linker, the
 * `minVersion` of the partial-declaration should be updated, the new linker implementation should
 * be added to the end of the collection, and the version of the previous linker should be updated.
 */
export function createLinkerMap(environment, sourceUrl, code) {
    const linkers = new Map();
    const LATEST_VERSION_RANGE = getRange('<=', '12.1.0-next.2+62.sha-ef33806');
    linkers.set(ɵɵngDeclareDirective, [
        { range: LATEST_VERSION_RANGE, linker: new PartialDirectiveLinkerVersion1(sourceUrl, code) },
    ]);
    linkers.set(ɵɵngDeclareClassMetadata, [
        { range: LATEST_VERSION_RANGE, linker: new PartialClassMetadataLinkerVersion1() },
    ]);
    linkers.set(ɵɵngDeclareComponent, [
        {
            range: LATEST_VERSION_RANGE,
            linker: new PartialComponentLinkerVersion1(createGetSourceFile(sourceUrl, code, environment.sourceFileLoader), sourceUrl, code)
        },
    ]);
    linkers.set(ɵɵngDeclareFactory, [
        { range: LATEST_VERSION_RANGE, linker: new PartialFactoryLinkerVersion1() },
    ]);
    linkers.set(ɵɵngDeclareInjectable, [
        { range: LATEST_VERSION_RANGE, linker: new PartialInjectableLinkerVersion1() },
    ]);
    linkers.set(ɵɵngDeclareInjector, [
        { range: LATEST_VERSION_RANGE, linker: new PartialInjectorLinkerVersion1() },
    ]);
    linkers.set(ɵɵngDeclareNgModule, [
        {
            range: LATEST_VERSION_RANGE,
            linker: new PartialNgModuleLinkerVersion1(environment.options.linkerJitMode)
        },
    ]);
    linkers.set(ɵɵngDeclarePipe, [
        { range: LATEST_VERSION_RANGE, linker: new PartialPipeLinkerVersion1() },
    ]);
    return linkers;
}
/**
 * A helper that selects the appropriate `PartialLinker` for a given declaration.
 *
 * The selection is made from a database of linker instances, chosen if their given semver range
 * satisfies the `minVersion` of the partial declaration to be linked.
 *
 * Note that the ranges are checked in order, and the first matching range will be selected. So
 * ranges should be most restrictive first. In practice, since ranges are always `<=X.Y.Z` this
 * means that ranges should be in ascending order.
 *
 * Note that any "pre-release" versions are stripped from ranges. Therefore if a `minVersion` is
 * `11.1.0-next.1` then this would match `11.1.0-next.2` and also `12.0.0-next.1`. (This is
 * different to standard semver range checking, where pre-release versions do not cross full version
 * boundaries.)
 */
export class PartialLinkerSelector {
    constructor(linkers, logger, unknownDeclarationVersionHandling) {
        this.linkers = linkers;
        this.logger = logger;
        this.unknownDeclarationVersionHandling = unknownDeclarationVersionHandling;
    }
    /**
     * Returns true if there are `PartialLinker` classes that can handle functions with this name.
     */
    supportsDeclaration(functionName) {
        return this.linkers.has(functionName);
    }
    /**
     * Returns the `PartialLinker` that can handle functions with the given name and version.
     * Throws an error if there is none.
     */
    getLinker(functionName, minVersion, version) {
        if (!this.linkers.has(functionName)) {
            throw new Error(`Unknown partial declaration function ${functionName}.`);
        }
        const linkerRanges = this.linkers.get(functionName);
        if (version === '12.1.0-next.2+62.sha-ef33806') {
            // Special case if the `version` is the same as the current compiler version.
            // This helps with compliance tests where the version placeholders have not been replaced.
            return linkerRanges[linkerRanges.length - 1].linker;
        }
        const declarationRange = getRange('>=', minVersion);
        for (const { range: linkerRange, linker } of linkerRanges) {
            if (intersects(declarationRange, linkerRange)) {
                return linker;
            }
        }
        const message = `This application depends upon a library published using Angular version ${version}, ` +
            `which requires Angular version ${minVersion} or newer to work correctly.\n` +
            `Consider upgrading your application to use a more recent version of Angular.`;
        if (this.unknownDeclarationVersionHandling === 'error') {
            throw new Error(message);
        }
        else if (this.unknownDeclarationVersionHandling === 'warn') {
            this.logger.warn(`${message}\nAttempting to continue using this version of Angular.`);
        }
        // No linker was matched for this declaration, so just use the most recent one.
        return linkerRanges[linkerRanges.length - 1].linker;
    }
}
/**
 * Compute a semver Range from the `version` and comparator.
 *
 * The range is computed as any version greater/less than or equal to the given `versionStr`
 * depending upon the `comparator` (ignoring any prerelease versions).
 *
 * @param comparator a string that determines whether the version specifies a minimum or a maximum
 *     range.
 * @param versionStr the version given in the partial declaration
 * @returns A semver range for the provided `version` and comparator.
 */
function getRange(comparator, versionStr) {
    const version = new SemVer(versionStr);
    // Wipe out any prerelease versions
    version.prerelease = [];
    return new Range(`${comparator}${version.format()}`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9saW5rZXJfc2VsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9saW5rZXJfc2VsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBQ0gsT0FBTyxFQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFDLE1BQU0sUUFBUSxDQUFDO0FBSWpELE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBR3ZELE9BQU8sRUFBQyxrQ0FBa0MsRUFBQyxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JGLE9BQU8sRUFBQyw4QkFBOEIsRUFBQyxNQUFNLDhCQUE4QixDQUFDO0FBQzVFLE9BQU8sRUFBQyw4QkFBOEIsRUFBQyxNQUFNLDhCQUE4QixDQUFDO0FBQzVFLE9BQU8sRUFBQyw0QkFBNEIsRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBQ3hFLE9BQU8sRUFBQywrQkFBK0IsRUFBQyxNQUFNLCtCQUErQixDQUFDO0FBQzlFLE9BQU8sRUFBQyw2QkFBNkIsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBRTFFLE9BQU8sRUFBQyw2QkFBNkIsRUFBQyxNQUFNLDhCQUE4QixDQUFDO0FBQzNFLE9BQU8sRUFBQyx5QkFBeUIsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBRWxFLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLHNCQUFzQixDQUFDO0FBQzNELE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLDBCQUEwQixDQUFDO0FBQ25FLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLHNCQUFzQixDQUFDO0FBQzNELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDO0FBQ3ZELE1BQU0sQ0FBQyxNQUFNLHFC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Tyx5REFBeUQsQ0FBQyxDQUFDO1NBQ3ZGO1FBRUQsK0VBQStFO1FBQy9FLE9BQU8sWUFBWSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQ3RELENBQUM7Q0FDRjtBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFDSCxTQUFTLFFBQVEsQ0FBQyxVQUFxQixFQUFFLFVBQWtCO0lBQ3pELE1BQU0sT0FBTyxHQUFHLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3ZDLG1DQUFtQztJQUNuQyxPQUFPLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztJQUN4QixPQUFPLElBQUksS0FBSyxDQUFDLEdBQUcsVUFBVSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDdkQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtpbnRlcnNlY3RzLCBSYW5nZSwgU2VtVmVyfSBmcm9tICdzZW12ZXInO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uLy4uLy4uL3NyYy9uZ3RzYy9sb2dnaW5nJztcbmltcG9ydCB7Y3JlYXRlR2V0U291cmNlRmlsZX0gZnJvbSAnLi4vZ2V0X3NvdXJjZV9maWxlJztcbmltcG9ydCB7TGlua2VyRW52aXJvbm1lbnR9IGZyb20gJy4uL2xpbmtlcl9lbnZpcm9ubWVudCc7XG5cbmltcG9ydCB7UGFydGlhbENsYXNzTWV0YWRhdGFMaW5rZXJWZXJzaW9uMX0gZnJvbSAnLi9wYXJ0aWFsX2NsYXNzX21ldGFkYXRhX2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbENvbXBvbmVudExpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfY29tcG9uZW50X2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbERpcmVjdGl2ZUxpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfZGlyZWN0aXZlX2xpbmtlcl8xJztcbmltcG9ydCB7UGFydGlhbEZhY3RvcnlMaW5rZXJWZXJzaW9uMX0gZnJvbSAnLi9wYXJ0aWFsX2ZhY3RvcnlfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsSW5qZWN0YWJsZUxpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfaW5qZWN0YWJsZV9saW5rZXJfMSc7XG5pbXBvcnQge1BhcnRpYWxJbmplY3RvckxpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfaW5qZWN0b3JfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsTGlua2VyfSBmcm9tICcuL3BhcnRpYWxfbGlua2VyJztcbmltcG9ydCB7UGFydGlhbE5nTW9kdWxlTGlua2VyVmVyc2lvbjF9IGZyb20gJy4vcGFydGlhbF9uZ19tb2R1bGVfbGlua2VyXzEnO1xuaW1wb3J0IHtQYXJ0aWFsUGlwZUxpbmtlclZlcnNpb24xfSBmcm9tICcuL3BhcnRpYWxfcGlwZV9saW5rZXJfMSc7XG5cbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlRGlyZWN0aXZlID0gJ8m1ybVuZ0RlY2xhcmVEaXJlY3RpdmUnO1xuZXhwb3J0IGNvbnN0IMm1ybVuZ0RlY2xhcmVDbGFzc01ldGFkYXRhID0gJ8m1ybVuZ0RlY2xhcmVDbGFzc01ldGFkYXRhJztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlQ29tcG9uZW50ID0gJ8m1ybVuZ0RlY2xhcmVDb21wb25lbnQnO1xuZXhwb3J0IGNvbnN0IMm1ybVuZ0RlY2xhcmVGYWN0b3J5ID0gJ8m1ybVuZ0RlY2xhcmVGYWN0b3J5JztcbmV4cG9ydCBjb25zdCDJtcm1bmdEZWNsYXJlSW5qZWN0YWJsZSA9ICfJtcm1bmdEZWNsYXJlSW5qZWN0YWJsZSc7XG5leHBvcnQgY29uc3QgybXJtW5nRGVjbGFyZUluamVjdG9yID0gJ8m1ybVuZ0RlY2xhcmVJbmplY3Rvcic7XG5leHBvcnQgY29uc3QgybXJtW5nRGVjbGFyZU5nTW9kdWxlID0gJ8m1ybVuZ0RlY2xhcmVOZ01vZHVsZSc7XG5leHBvcnQgY29uc3QgybXJtW5nRGVjbGFyZVBpcGUgPSAnybXJtW5nRGVjbGFyZVBpcGUnO1xuZXhwb3J0IGNvbnN0IGRlY2xhcmF0aW9uRnVuY3Rpb25zID0gW1xuICDJtcm1bmdEZWNsYXJlRGlyZWN0aXZlLCDJtcm1bmdEZWNsYXJlQ2xhc3NNZXRhZGF0YSwgybXJtW5nRGVjbGFyZUNvbXBvbmVudCwgybXJtW5nRGVjbGFyZUZhY3RvcnksXG4gIMm1ybVuZ0RlY2xhcmVJbmplY3RhYmxlLCDJtcm1bmdEZWNsYXJlSW5qZWN0b3IsIMm1ybVuZ0RlY2xhcmVOZ01vZHVsZSwgybXJtW5nRGVjbGFyZVBpcGVcbl07XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGlua2VyUmFuZ2U8VEV4cHJlc3Npb24+IHtcbiAgcmFuZ2U6IFJhbmdlO1xuICBsaW5rZXI6IFBhcnRpYWxMaW5rZXI8VEV4cHJlc3Npb24+O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIG1hcHBpbmcgYmV0d2VlbiBwYXJ0aWFsLWRlY2xhcmF0aW9uIGNhbGwgbmFtZSBhbmQgY29sbGVjdGlvbnMgb2YgcGFydGlhbC1saW5rZXJzLlxuICpcbiAqIEVhY2ggY29sbGVjdGlvbiBvZiBwYXJ0aWFsLWxpbmtlcnMgd2lsbCBjb250YWluIGEgdmVyc2lvbiByYW5nZSB0aGF0IHdpbGwgYmUgbWF0Y2hlZCBhZ2FpbnN0IHRoZVxuICogYG1pblZlcnNpb25gIG9mIHRoZSBwYXJ0aWFsLWRlY2xhcmF0aW9uLiAoQWRkaXRpb25hbGx5LCBhIHBhcnRpYWwtbGlua2VyIG1heSBtb2RpZnkgaXRzIGJlaGF2aW91clxuICogaW50ZXJuYWxseSBiYXNlZCBvbiB0aGUgYHZlcnNpb25gIHByb3BlcnR5IG9mIHRoZSBkZWNsYXJhdGlvbi4pXG4gKlxuICogVmVyc2lvbnMgc2hvdWxkIGJlIHNvcnRlZCBpbiBhc2NlbmRpbmcgb3JkZXIuIFRoZSBtb3N0IHJlY2VudCBwYXJ0aWFsLWxpbmtlciB3aWxsIGJlIHVzZWQgYXMgdGhlXG4gKiBmYWxsYmFjayBsaW5rZXIgaWYgbm9uZSBvZiB0aGUgb3RoZXIgdmVyc2lvbiByYW5nZXMgbWF0Y2guIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICoge3JhbmdlOiBnZXRSYW5nZSgnPD0nLCAnMTMuMC4wJyksIGxpbmtlciBQYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjIoLi4uKSB9LFxuICoge3JhbmdlOiBnZXRSYW5nZSgnPD0nLCAnMTMuMS4wJyksIGxpbmtlciBQYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjMoLi4uKSB9LFxuICoge3JhbmdlOiBnZXRSYW5nZSgnPD0nLCAnMTQuMC4wJyksIGxpbmtlciBQYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjQoLi4uKSB9LFxuICoge3JhbmdlOiBMQVRFU1RfVkVSU0lPTl9SQU5HRSwgbGlua2VyOiBuZXcgUGFydGlhbERpcmVjdGl2ZUxpbmtlclZlcnNpb24xKC4uLil9LFxuICogYGBgXG4gKlxuICogSWYgdGhlIGBMQVRFU1RfVkVSU0lPTl9SQU5HRWAgaXMgYDw9MTUuMC4wYCB0aGVuIHRoZSBmYWxsYmFjayBsaW5rZXIgd291bGQgYmVcbiAqIGBQYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjFgIGZvciBhbnkgdmVyc2lvbiBncmVhdGVyIHRoYW4gYDE1LjAuMGAuXG4gKlxuICogV2hlbiB0aGVyZSBpcyBhIGNoYW5nZSB0byBhIGRlY2xhcmF0aW9uIGludGVyZmFjZSB0aGF0IHJlcXVpcmVzIGEgbmV3IHBhcnRpYWwtbGlua2VyLCB0aGVcbiAqIGBtaW5WZXJzaW9uYCBvZiB0aGUgcGFydGlhbC1kZWNsYXJhdGlvbiBzaG91bGQgYmUgdXBkYXRlZCwgdGhlIG5ldyBsaW5rZXIgaW1wbGVtZW50YXRpb24gc2hvdWxkXG4gKiBiZSBhZGRlZCB0byB0aGUgZW5kIG9mIHRoZSBjb2xsZWN0aW9uLCBhbmQgdGhlIHZlcnNpb24gb2YgdGhlIHByZXZpb3VzIGxpbmtlciBzaG91bGQgYmUgdXBkYXRlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxpbmtlck1hcDxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4oXG4gICAgZW52aXJvbm1lbnQ6IExpbmtlckVudmlyb25tZW50PFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPiwgc291cmNlVXJsOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICBjb2RlOiBzdHJpbmcpOiBNYXA8c3RyaW5nLCBMaW5rZXJSYW5nZTxURXhwcmVzc2lvbj5bXT4ge1xuICBjb25zdCBsaW5rZXJzID0gbmV3IE1hcDxzdHJpbmcsIExpbmtlclJhbmdlPFRFeHByZXNzaW9uPltdPigpO1xuICBjb25zdCBMQVRFU1RfVkVSU0lPTl9SQU5HRSA9IGdldFJhbmdlKCc8PScsICcwLjAuMC1QTEFDRUhPTERFUicpO1xuXG4gIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVEaXJlY3RpdmUsIFtcbiAgICB7cmFuZ2U6IExBVEVTVF9WRVJTSU9OX1JBTkdFLCBsaW5rZXI6IG5ldyBQYXJ0aWFsRGlyZWN0aXZlTGlua2VyVmVyc2lvbjEoc291cmNlVXJsLCBjb2RlKX0sXG4gIF0pO1xuICBsaW5rZXJzLnNldCjJtcm1bmdEZWNsYXJlQ2xhc3NNZXRhZGF0YSwgW1xuICAgIHtyYW5nZTogTEFURVNUX1ZFUlNJT05fUkFOR0UsIGxpbmtlcjogbmV3IFBhcnRpYWxDbGFzc01ldGFkYXRhTGlua2VyVmVyc2lvbjEoKX0sXG4gIF0pO1xuICBsaW5rZXJzLnNldCjJtcm1bmdEZWNsYXJlQ29tcG9uZW50LCBbXG4gICAge1xuICAgICAgcmFuZ2U6IExBVEVTVF9WRVJTSU9OX1JBTkdFLFxuICAgICAgbGlua2VyOiBuZXcgUGFydGlhbENvbXBvbmVudExpbmtlclZlcnNpb24xKFxuICAgICAgICAgIGNyZWF0ZUdldFNvdXJjZUZpbGUoc291cmNlVXJsLCBjb2RlLCBlbnZpcm9ubWVudC5zb3VyY2VGaWxlTG9hZGVyKSwgc291cmNlVXJsLCBjb2RlKVxuICAgIH0sXG4gIF0pO1xuICBsaW5rZXJzLnNldCjJtcm1bmdEZWNsYXJlRmFjdG9yeSwgW1xuICAgIHtyYW5nZTogTEFURVNUX1ZFUlNJT05fUkFOR0UsIGxpbmtlcjogbmV3IFBhcnRpYWxGYWN0b3J5TGlua2VyVmVyc2lvbjEoKX0sXG4gIF0pO1xuICBsaW5rZXJzLnNldCjJtcm1bmdEZWNsYXJlSW5qZWN0YWJsZSwgW1xuICAgIHtyYW5nZTogTEFURVNUX1ZFUlNJT05fUkFOR0UsIGxpbmtlcjogbmV3IFBhcnRpYWxJbmplY3RhYmxlTGlua2VyVmVyc2lvbjEoKX0sXG4gIF0pO1xuICBsaW5rZXJzLnNldCjJtcm1bmdEZWNsYXJlSW5qZWN0b3IsIFtcbiAgICB7cmFuZ2U6IExBVEVTVF9WRVJTSU9OX1JBTkdFLCBsaW5rZXI6IG5ldyBQYXJ0aWFsSW5qZWN0b3JMaW5rZXJWZXJzaW9uMSgpfSxcbiAgXSk7XG4gIGxpbmtlcnMuc2V0KMm1ybVuZ0RlY2xhcmVOZ01vZHVsZSwgW1xuICAgIHtcbiAgICAgIHJhbmdlOiBMQVRFU1RfVkVSU0lPTl9SQU5HRSxcbiAgICAgIGxpbmtlcjogbmV3IFBhcnRpYWxOZ01vZHVsZUxpbmtlclZlcnNpb24xKGVudmlyb25tZW50Lm9wdGlvbnMubGlua2VySml0TW9kZSlcbiAgICB9LFxuICBdKTtcbiAgbGlua2Vycy5zZXQoybXJtW5nRGVjbGFyZVBpcGUsIFtcbiAgICB7cmFuZ2U6IExBVEVTVF9WRVJTSU9OX1JBTkdFLCBsaW5rZXI6IG5ldyBQYXJ0aWFsUGlwZUxpbmtlclZlcnNpb24xKCl9LFxuICBdKTtcblxuICByZXR1cm4gbGlua2Vycztcbn1cblxuLyoqXG4gKiBBIGhlbHBlciB0aGF0IHNlbGVjdHMgdGhlIGFwcHJvcHJpYXRlIGBQYXJ0aWFsTGlua2VyYCBmb3IgYSBnaXZlbiBkZWNsYXJhdGlvbi5cbiAqXG4gKiBUaGUgc2VsZWN0aW9uIGlzIG1hZGUgZnJvbSBhIGRhdGFiYXNlIG9mIGxpbmtlciBpbnN0YW5jZXMsIGNob3NlbiBpZiB0aGVpciBnaXZlbiBzZW12ZXIgcmFuZ2VcbiAqIHNhdGlzZmllcyB0aGUgYG1pblZlcnNpb25gIG9mIHRoZSBwYXJ0aWFsIGRlY2xhcmF0aW9uIHRvIGJlIGxpbmtlZC5cbiAqXG4gKiBOb3RlIHRoYXQgdGhlIHJhbmdlcyBhcmUgY2hlY2tlZCBpbiBvcmRlciwgYW5kIHRoZSBmaXJzdCBtYXRjaGluZyByYW5nZSB3aWxsIGJlIHNlbGVjdGVkLiBTb1xuICogcmFuZ2VzIHNob3VsZCBiZSBtb3N0IHJlc3RyaWN0aXZlIGZpcnN0LiBJbiBwcmFjdGljZSwgc2luY2UgcmFuZ2VzIGFyZSBhbHdheXMgYDw9WC5ZLlpgIHRoaXNcbiAqIG1lYW5zIHRoYXQgcmFuZ2VzIHNob3VsZCBiZSBpbiBhc2NlbmRpbmcgb3JkZXIuXG4gKlxuICogTm90ZSB0aGF0IGFueSBcInByZS1yZWxlYXNlXCIgdmVyc2lvbnMgYXJlIHN0cmlwcGVkIGZyb20gcmFuZ2VzLiBUaGVyZWZvcmUgaWYgYSBgbWluVmVyc2lvbmAgaXNcbiAqIGAxMS4xLjAtbmV4dC4xYCB0aGVuIHRoaXMgd291bGQgbWF0Y2ggYDExLjEuMC1uZXh0LjJgIGFuZCBhbHNvIGAxMi4wLjAtbmV4dC4xYC4gKFRoaXMgaXNcbiAqIGRpZmZlcmVudCB0byBzdGFuZGFyZCBzZW12ZXIgcmFuZ2UgY2hlY2tpbmcsIHdoZXJlIHByZS1yZWxlYXNlIHZlcnNpb25zIGRvIG5vdCBjcm9zcyBmdWxsIHZlcnNpb25cbiAqIGJvdW5kYXJpZXMuKVxuICovXG5leHBvcnQgY2xhc3MgUGFydGlhbExpbmtlclNlbGVjdG9yPFRFeHByZXNzaW9uPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBsaW5rZXJzOiBNYXA8c3RyaW5nLCBMaW5rZXJSYW5nZTxURXhwcmVzc2lvbj5bXT4sXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB1bmtub3duRGVjbGFyYXRpb25WZXJzaW9uSGFuZGxpbmc6ICdpZ25vcmUnfCd3YXJuJ3wnZXJyb3InKSB7fVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlcmUgYXJlIGBQYXJ0aWFsTGlua2VyYCBjbGFzc2VzIHRoYXQgY2FuIGhhbmRsZSBmdW5jdGlvbnMgd2l0aCB0aGlzIG5hbWUuXG4gICAqL1xuICBzdXBwb3J0c0RlY2xhcmF0aW9uKGZ1bmN0aW9uTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubGlua2Vycy5oYXMoZnVuY3Rpb25OYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBgUGFydGlhbExpbmtlcmAgdGhhdCBjYW4gaGFuZGxlIGZ1bmN0aW9ucyB3aXRoIHRoZSBnaXZlbiBuYW1lIGFuZCB2ZXJzaW9uLlxuICAgKiBUaHJvd3MgYW4gZXJyb3IgaWYgdGhlcmUgaXMgbm9uZS5cbiAgICovXG4gIGdldExpbmtlcihmdW5jdGlvbk5hbWU6IHN0cmluZywgbWluVmVyc2lvbjogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcpOiBQYXJ0aWFsTGlua2VyPFRFeHByZXNzaW9uPiB7XG4gICAgaWYgKCF0aGlzLmxpbmtlcnMuaGFzKGZ1bmN0aW9uTmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwYXJ0aWFsIGRlY2xhcmF0aW9uIGZ1bmN0aW9uICR7ZnVuY3Rpb25OYW1lfS5gKTtcbiAgICB9XG4gICAgY29uc3QgbGlua2VyUmFuZ2VzID0gdGhpcy5saW5rZXJzLmdldChmdW5jdGlvbk5hbWUpITtcblxuICAgIGlmICh2ZXJzaW9uID09PSAnMC4wLjAtUExBQ0VIT0xERVInKSB7XG4gICAgICAvLyBTcGVjaWFsIGNhc2UgaWYgdGhlIGB2ZXJzaW9uYCBpcyB0aGUgc2FtZSBhcyB0aGUgY3VycmVudCBjb21waWxlciB2ZXJzaW9uLlxuICAgICAgLy8gVGhpcyBoZWxwcyB3aXRoIGNvbXBsaWFuY2UgdGVzdHMgd2hlcmUgdGhlIHZlcnNpb24gcGxhY2Vob2xkZXJzIGhhdmUgbm90IGJlZW4gcmVwbGFjZWQuXG4gICAgICByZXR1cm4gbGlua2VyUmFuZ2VzW2xpbmtlclJhbmdlcy5sZW5ndGggLSAxXS5saW5rZXI7XG4gICAgfVxuXG4gICAgY29uc3QgZGVjbGFyYXRpb25SYW5nZSA9IGdldFJhbmdlKCc+PScsIG1pblZlcnNpb24pO1xuICAgIGZvciAoY29uc3Qge3JhbmdlOiBsaW5rZXJSYW5nZSwgbGlua2VyfSBvZiBsaW5rZXJSYW5nZXMpIHtcbiAgICAgIGlmIChpbnRlcnNlY3RzKGRlY2xhcmF0aW9uUmFuZ2UsIGxpbmtlclJhbmdlKSkge1xuICAgICAgICByZXR1cm4gbGlua2VyO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG1lc3NhZ2UgPVxuICAgICAgICBgVGhpcyBhcHBsaWNhdGlvbiBkZXBlbmRzIHVwb24gYSBsaWJyYXJ5IHB1Ymxpc2hlZCB1c2luZyBBbmd1bGFyIHZlcnNpb24gJHt2ZXJzaW9ufSwgYCArXG4gICAgICAgIGB3aGljaCByZXF1aXJlcyBBbmd1bGFyIHZlcnNpb24gJHttaW5WZXJzaW9ufSBvciBuZXdlciB0byB3b3JrIGNvcnJlY3RseS5cXG5gICtcbiAgICAgICAgYENvbnNpZGVyIHVwZ3JhZGluZyB5b3VyIGFwcGxpY2F0aW9uIHRvIHVzZSBhIG1vcmUgcmVjZW50IHZlcnNpb24gb2YgQW5ndWxhci5gO1xuXG4gICAgaWYgKHRoaXMudW5rbm93bkRlY2xhcmF0aW9uVmVyc2lvbkhhbmRsaW5nID09PSAnZXJyb3InKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnVua25vd25EZWNsYXJhdGlvblZlcnNpb25IYW5kbGluZyA9PT0gJ3dhcm4nKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKGAke21lc3NhZ2V9XFxuQXR0ZW1wdGluZyB0byBjb250aW51ZSB1c2luZyB0aGlzIHZlcnNpb24gb2YgQW5ndWxhci5gKTtcbiAgICB9XG5cbiAgICAvLyBObyBsaW5rZXIgd2FzIG1hdGNoZWQgZm9yIHRoaXMgZGVjbGFyYXRpb24sIHNvIGp1c3QgdXNlIHRoZSBtb3N0IHJlY2VudCBvbmUuXG4gICAgcmV0dXJuIGxpbmtlclJhbmdlc1tsaW5rZXJSYW5nZXMubGVuZ3RoIC0gMV0ubGlua2VyO1xuICB9XG59XG5cbi8qKlxuICogQ29tcHV0ZSBhIHNlbXZlciBSYW5nZSBmcm9tIHRoZSBgdmVyc2lvbmAgYW5kIGNvbXBhcmF0b3IuXG4gKlxuICogVGhlIHJhbmdlIGlzIGNvbXB1dGVkIGFzIGFueSB2ZXJzaW9uIGdyZWF0ZXIvbGVzcyB0aGFuIG9yIGVxdWFsIHRvIHRoZSBnaXZlbiBgdmVyc2lvblN0cmBcbiAqIGRlcGVuZGluZyB1cG9uIHRoZSBgY29tcGFyYXRvcmAgKGlnbm9yaW5nIGFueSBwcmVyZWxlYXNlIHZlcnNpb25zKS5cbiAqXG4gKiBAcGFyYW0gY29tcGFyYXRvciBhIHN0cmluZyB0aGF0IGRldGVybWluZXMgd2hldGhlciB0aGUgdmVyc2lvbiBzcGVjaWZpZXMgYSBtaW5pbXVtIG9yIGEgbWF4aW11bVxuICogICAgIHJhbmdlLlxuICogQHBhcmFtIHZlcnNpb25TdHIgdGhlIHZlcnNpb24gZ2l2ZW4gaW4gdGhlIHBhcnRpYWwgZGVjbGFyYXRpb25cbiAqIEByZXR1cm5zIEEgc2VtdmVyIHJhbmdlIGZvciB0aGUgcHJvdmlkZWQgYHZlcnNpb25gIGFuZCBjb21wYXJhdG9yLlxuICovXG5mdW5jdGlvbiBnZXRSYW5nZShjb21wYXJhdG9yOiAnPD0nfCc+PScsIHZlcnNpb25TdHI6IHN0cmluZyk6IFJhbmdlIHtcbiAgY29uc3QgdmVyc2lvbiA9IG5ldyBTZW1WZXIodmVyc2lvblN0cik7XG4gIC8vIFdpcGUgb3V0IGFueSBwcmVyZWxlYXNlIHZlcnNpb25zXG4gIHZlcnNpb24ucHJlcmVsZWFzZSA9IFtdO1xuICByZXR1cm4gbmV3IFJhbmdlKGAke2NvbXBhcmF0b3J9JHt2ZXJzaW9uLmZvcm1hdCgpfWApO1xufVxuIl19