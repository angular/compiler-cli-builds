/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as os from 'os';
import { absoluteFrom, getFileSystem } from '../../src/ngtsc/file_system';
import { ConsoleLogger, LogLevel } from '../../src/ngtsc/logging';
import { readConfiguration } from '../../src/perform_compile';
import { SUPPORTED_FORMAT_PROPERTIES } from './packages/entry_point';
import { getPathMappingsFromTsConfig } from './path_mappings';
import { InPlaceFileWriter } from './writing/in_place_file_writer';
import { NewEntryPointFileWriter } from './writing/new_entry_point_file_writer';
/**
 * Instantiate common utilities that are always used and fix up options with defaults, as necessary.
 *
 * NOTE: Avoid eagerly instantiating anything that might not be used when running sync/async.
 */
export function getSharedSetup(options) {
    const fileSystem = getFileSystem();
    const absBasePath = absoluteFrom(options.basePath);
    const projectPath = fileSystem.dirname(absBasePath);
    const tsConfig = options.tsConfigPath !== null ? getTsConfig(options.tsConfigPath || projectPath) : null;
    let { basePath, targetEntryPointPath, propertiesToConsider = SUPPORTED_FORMAT_PROPERTIES, typingsOnly = false, compileAllFormats = true, createNewEntryPointFormats = false, logger = new ConsoleLogger(LogLevel.info), pathMappings = getPathMappingsFromTsConfig(fileSystem, tsConfig, projectPath), async = false, errorOnFailedEntryPoint = false, enableI18nLegacyMessageIdFormat = true, invalidateEntryPointManifest = false, tsConfigPath, } = options;
    if (!!targetEntryPointPath) {
        // targetEntryPointPath forces us to error if an entry-point fails.
        errorOnFailedEntryPoint = true;
    }
    if (typingsOnly) {
        // If we only want to process the typings then we do not want to waste time trying to process
        // multiple JS formats.
        compileAllFormats = false;
    }
    checkForSolutionStyleTsConfig(fileSystem, logger, projectPath, options.tsConfigPath, tsConfig);
    return {
        basePath,
        targetEntryPointPath,
        propertiesToConsider,
        typingsOnly,
        compileAllFormats,
        createNewEntryPointFormats,
        logger,
        pathMappings,
        async,
        errorOnFailedEntryPoint,
        enableI18nLegacyMessageIdFormat,
        invalidateEntryPointManifest,
        tsConfigPath,
        fileSystem,
        absBasePath,
        projectPath,
        tsConfig,
        getFileWriter: (pkgJsonUpdater) => createNewEntryPointFormats ?
            new NewEntryPointFileWriter(fileSystem, logger, errorOnFailedEntryPoint, pkgJsonUpdater) :
            new InPlaceFileWriter(fileSystem, logger, errorOnFailedEntryPoint),
    };
}
let tsConfigCache = null;
let tsConfigPathCache = null;
/**
 * Get the parsed configuration object for the given `tsConfigPath`.
 *
 * This function will cache the previous parsed configuration object to avoid unnecessary processing
 * of the tsconfig.json in the case that it is requested repeatedly.
 *
 * This makes the assumption, which is true as of writing, that the contents of tsconfig.json and
 * its dependencies will not change during the life of the process running ngcc.
 */
function getTsConfig(tsConfigPath) {
    if (tsConfigPath !== tsConfigPathCache) {
        tsConfigPathCache = tsConfigPath;
        tsConfigCache = readConfiguration(tsConfigPath);
    }
    return tsConfigCache;
}
export function clearTsConfigCache() {
    tsConfigPathCache = null;
    tsConfigCache = null;
}
function checkForSolutionStyleTsConfig(fileSystem, logger, projectPath, tsConfigPath, tsConfig) {
    if (tsConfigPath !== null && !tsConfigPath && tsConfig !== null &&
        tsConfig.rootNames.length === 0 && tsConfig.projectReferences !== undefined &&
        tsConfig.projectReferences.length > 0) {
        logger.warn(`The inferred tsconfig file "${tsConfig.project}" appears to be "solution-style" ` +
            `since it contains no root files but does contain project references.\n` +
            `This is probably not wanted, since ngcc is unable to infer settings like "paths" mappings from such a file.\n` +
            `Perhaps you should have explicitly specified one of the referenced projects using the --tsconfig option. For example:\n\n` +
            tsConfig.projectReferences.map(ref => `  ngcc ... --tsconfig "${ref.originalPath}"\n`)
                .join('') +
            `\nFind out more about solution-style tsconfig at https://devblogs.microsoft.com/typescript/announcing-typescript-3-9/#solution-style-tsconfig.\n` +
            `If you did intend to use this file, then you can hide this warning by providing it explicitly:\n\n` +
            `  ngcc ... --tsconfig "${fileSystem.relative(projectPath, tsConfig.project)}"`);
    }
}
/**
 * Determines the maximum number of workers to use for parallel execution. This can be set using the
 * NGCC_MAX_WORKERS environment variable, or is computed based on the number of available CPUs. One
 * CPU core is always reserved for the master process, so we take the number of CPUs minus one, with
 * a maximum of 4 workers. We don't scale the number of workers beyond 4 by default, as it takes
 * considerably more memory and CPU cycles while not offering a substantial improvement in time.
 */
export function getMaxNumberOfWorkers() {
    const maxWorkers = process.env.NGCC_MAX_WORKERS;
    if (maxWorkers === undefined) {
        // Use up to 4 CPU cores for workers, always reserving one for master.
        return Math.max(1, Math.min(4, os.cpus().length - 1));
    }
    const numericMaxWorkers = +maxWorkers.trim();
    if (!Number.isInteger(numericMaxWorkers)) {
        throw new Error('NGCC_MAX_WORKERS should be an integer.');
    }
    else if (numericMaxWorkers < 1) {
        throw new Error('NGCC_MAX_WORKERS should be at least 1.');
    }
    return numericMaxWorkers;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19vcHRpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL25nY2Nfb3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFDSCxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUV6QixPQUFPLEVBQUMsWUFBWSxFQUE4QixhQUFhLEVBQW1CLE1BQU0sNkJBQTZCLENBQUM7QUFDdEgsT0FBTyxFQUFDLGFBQWEsRUFBVSxRQUFRLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUN4RSxPQUFPLEVBQXNCLGlCQUFpQixFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFFakYsT0FBTyxFQUFDLDJCQUEyQixFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDbkUsT0FBTyxFQUFDLDJCQUEyQixFQUFlLE1BQU0saUJBQWlCLENBQUM7QUFFMUUsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sZ0NBQWdDLENBQUM7QUFDakUsT0FBTyxFQUFDLHVCQUF1QixFQUFDLE1BQU0sdUNBQXVDLENBQUM7QUF3SjlFOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsY0FBYyxDQUFDLE9BQW9CO0lBRWpELE1BQU0sVUFBVSxHQUFHLGFBQWEsRUFBRSxDQUFDO0lBQ25DLE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbkQsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNwRCxNQUFNLFFBQVEsR0FDVixPQUFPLENBQUMsWUFBWSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUU1RixJQUFJLEVBQ0YsUUFBUSxFQUNSLG9CQUFvQixFQUNw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RywwQkFBMEIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN0RjtBQUNILENBQUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxNQUFNLFVBQVUscUJBQXFCO0lBQ25DLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUM7SUFDaEQsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO1FBQzVCLHNFQUFzRTtRQUN0RSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN2RDtJQUVELE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsRUFBRTtRQUN4QyxNQUFNLElBQUksS0FBSyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7S0FDM0Q7U0FBTSxJQUFJLGlCQUFpQixHQUFHLENBQUMsRUFBRTtRQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7S0FDM0Q7SUFDRCxPQUFPLGlCQUFpQixDQUFDO0FBQzNCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb20sIEFic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBnZXRGaWxlU3lzdGVtLCBQYXRoTWFuaXB1bGF0aW9ufSBmcm9tICcuLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDb25zb2xlTG9nZ2VyLCBMb2dnZXIsIExvZ0xldmVsfSBmcm9tICcuLi8uLi9zcmMvbmd0c2MvbG9nZ2luZyc7XG5pbXBvcnQge1BhcnNlZENvbmZpZ3VyYXRpb24sIHJlYWRDb25maWd1cmF0aW9ufSBmcm9tICcuLi8uLi9zcmMvcGVyZm9ybV9jb21waWxlJztcblxuaW1wb3J0IHtTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVN9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtnZXRQYXRoTWFwcGluZ3NGcm9tVHNDb25maWcsIFBhdGhNYXBwaW5nc30gZnJvbSAnLi9wYXRoX21hcHBpbmdzJztcbmltcG9ydCB7RmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7SW5QbGFjZUZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9pbl9wbGFjZV9maWxlX3dyaXRlcic7XG5pbXBvcnQge05ld0VudHJ5UG9pbnRGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvbmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7UGFja2FnZUpzb25VcGRhdGVyfSBmcm9tICcuL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlciBmb3Igc3luY2hyb25vdXMgZXhlY3V0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN5bmNOZ2NjT3B0aW9ucyB7XG4gIC8qKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRoYXQgY29udGFpbnMgdGhlIHBhY2thZ2VzIHRvIHByb2Nlc3MuICovXG4gIGJhc2VQYXRoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBwYXRoIHRvIHRoZSBwcmltYXJ5IHBhY2thZ2UgdG8gYmUgcHJvY2Vzc2VkLiBJZiBub3QgYWJzb2x1dGUgdGhlbiBpdCBtdXN0IGJlIHJlbGF0aXZlIHRvXG4gICAqIGBiYXNlUGF0aGAuXG4gICAqXG4gICAqIEFsbCBpdHMgZGVwZW5kZW5jaWVzIHdpbGwgbmVlZCB0byBiZSBwcm9jZXNzZWQgdG9vLlxuICAgKlxuICAgKiBJZiB0aGlzIHByb3BlcnR5IGlzIHByb3ZpZGVkIHRoZW4gYGVycm9yT25GYWlsZWRFbnRyeVBvaW50YCBpcyBmb3JjZWQgdG8gdHJ1ZS5cbiAgICovXG4gIHRhcmdldEVudHJ5UG9pbnRQYXRoPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGljaCBlbnRyeS1wb2ludCBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24gdG8gY29uc2lkZXIgd2hlbiBwcm9jZXNzaW5nIGFuIGVudHJ5LXBvaW50LlxuICAgKiBFYWNoIHByb3BlcnR5IHNob3VsZCBob2xkIGEgcGF0aCB0byB0aGUgcGFydGljdWxhciBidW5kbGUgZm9ybWF0IGZvciB0aGUgZW50cnktcG9pbnQuXG4gICAqIERlZmF1bHRzIHRvIGFsbCB0aGUgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uLlxuICAgKi9cbiAgcHJvcGVydGllc1RvQ29uc2lkZXI/OiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogV2hldGhlciB0byBvbmx5IHByb2Nlc3MgdGhlIHR5cGluZ3MgZmlsZXMgZm9yIHRoaXMgZW50cnktcG9pbnQuXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZnVsIHdoZW4gcnVubmluZyBuZ2NjIG9ubHkgdG8gcHJvdmlkZSB0eXBpbmdzIGZpbGVzIHRvIGRvd25zdHJlYW0gdG9vbGluZyBzdWNoIGFzXG4gICAqIHRoZSBBbmd1bGFyIExhbmd1YWdlIFNlcnZpY2Ugb3IgbmctcGFja2Fnci4gRGVmYXVsdHMgdG8gYGZhbHNlYC5cbiAgICpcbiAgICogSWYgdGhpcyBpcyBzZXQgdG8gYHRydWVgIHRoZW4gYGNvbXBpbGVBbGxGb3JtYXRzYCBpcyBmb3JjZWQgdG8gYGZhbHNlYC5cbiAgICovXG4gIHR5cGluZ3NPbmx5PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBwcm9jZXNzIGFsbCBmb3JtYXRzIHNwZWNpZmllZCBieSAoYHByb3BlcnRpZXNUb0NvbnNpZGVyYCkgIG9yIHRvIHN0b3AgcHJvY2Vzc2luZ1xuICAgKiB0aGlzIGVudHJ5LXBvaW50IGF0IHRoZSBmaXJzdCBtYXRjaGluZyBmb3JtYXQuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGB0cnVlYCwgYnV0IGlzIGZvcmNlZCB0byBgZmFsc2VgIGlmIGB0eXBpbmdzT25seWAgaXMgYHRydWVgLlxuICAgKi9cbiAgY29tcGlsZUFsbEZvcm1hdHM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNyZWF0ZSBuZXcgZW50cnktcG9pbnRzIGJ1bmRsZXMgcmF0aGVyIHRoYW4gb3ZlcndyaXRpbmcgdGhlIG9yaWdpbmFsIGZpbGVzLlxuICAgKi9cbiAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBQcm92aWRlIGEgbG9nZ2VyIHRoYXQgd2lsbCBiZSBjYWxsZWQgd2l0aCBsb2cgbWVzc2FnZXMuXG4gICAqL1xuICBsb2dnZXI/OiBMb2dnZXI7XG5cbiAgLyoqXG4gICAqIFBhdGhzIG1hcHBpbmcgY29uZmlndXJhdGlvbiAoYHBhdGhzYCBhbmQgYGJhc2VVcmxgKSwgYXMgZm91bmQgaW4gYHRzLkNvbXBpbGVyT3B0aW9uc2AuXG4gICAqIFRoZXNlIGFyZSB1c2VkIHRvIHJlc29sdmUgcGF0aHMgdG8gbG9jYWxseSBidWlsdCBBbmd1bGFyIGxpYnJhcmllcy5cbiAgICpcbiAgICogTm90ZSB0aGF0IGBwYXRoTWFwcGluZ3NgIHNwZWNpZmllZCBoZXJlIHRha2UgcHJlY2VkZW5jZSBvdmVyIGFueSBgcGF0aE1hcHBpbmdzYCBsb2FkZWQgZnJvbSBhXG4gICAqIFRTIGNvbmZpZyBmaWxlLlxuICAgKi9cbiAgcGF0aE1hcHBpbmdzPzogUGF0aE1hcHBpbmdzO1xuXG4gIC8qKlxuICAgKiBQcm92aWRlIGEgZmlsZS1zeXN0ZW0gc2VydmljZSB0aGF0IHdpbGwgYmUgdXNlZCBieSBuZ2NjIGZvciBhbGwgZmlsZSBpbnRlcmFjdGlvbnMuXG4gICAqL1xuICBmaWxlU3lzdGVtPzogRmlsZVN5c3RlbTtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgY29tcGlsYXRpb24gc2hvdWxkIHJ1biBhbmQgcmV0dXJuIGFzeW5jaHJvbm91c2x5LiBBbGxvd2luZyBhc3luY2hyb25vdXMgZXhlY3V0aW9uXG4gICAqIG1heSBzcGVlZCB1cCB0aGUgY29tcGlsYXRpb24gYnkgdXRpbGl6aW5nIG11bHRpcGxlIENQVSBjb3JlcyAoaWYgYXZhaWxhYmxlKS5cbiAgICpcbiAgICogRGVmYXVsdDogYGZhbHNlYCAoaS5lLiBydW4gc3luY2hyb25vdXNseSlcbiAgICovXG4gIGFzeW5jPzogZmFsc2U7XG5cbiAgLyoqXG4gICAqIFNldCB0byB0cnVlIGluIG9yZGVyIHRvIHRlcm1pbmF0ZSBpbW1lZGlhdGVseSB3aXRoIGFuIGVycm9yIGNvZGUgaWYgYW4gZW50cnktcG9pbnQgZmFpbHMgdG8gYmVcbiAgICogcHJvY2Vzc2VkLlxuICAgKlxuICAgKiBJZiBgdGFyZ2V0RW50cnlQb2ludFBhdGhgIGlzIHByb3ZpZGVkIHRoZW4gdGhpcyBwcm9wZXJ0eSBpcyBhbHdheXMgdHJ1ZSBhbmQgY2Fubm90IGJlXG4gICAqIGNoYW5nZWQuIE90aGVyd2lzZSB0aGUgZGVmYXVsdCBpcyBmYWxzZS5cbiAgICpcbiAgICogV2hlbiBzZXQgdG8gZmFsc2UsIG5nY2Mgd2lsbCBjb250aW51ZSB0byBwcm9jZXNzIGVudHJ5LXBvaW50cyBhZnRlciBhIGZhaWx1cmUuIEluIHdoaWNoIGNhc2UgaXRcbiAgICogd2lsbCBsb2cgYW4gZXJyb3IgYW5kIHJlc3VtZSBwcm9jZXNzaW5nIG90aGVyIGVudHJ5LXBvaW50cy5cbiAgICovXG4gIGVycm9yT25GYWlsZWRFbnRyeVBvaW50PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogUmVuZGVyIGAkbG9jYWxpemVgIG1lc3NhZ2VzIHdpdGggbGVnYWN5IGZvcm1hdCBpZHMuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYC4gT25seSBzZXQgdGhpcyB0byBgZmFsc2VgIGlmIHlvdSBkbyBub3Qgd2FudCBsZWdhY3kgbWVzc2FnZSBpZHMgdG9cbiAgICogYmUgcmVuZGVyZWQuIEZvciBleGFtcGxlLCBpZiB5b3UgYXJlIG5vdCB1c2luZyBsZWdhY3kgbWVzc2FnZSBpZHMgaW4geW91ciB0cmFuc2xhdGlvbiBmaWxlc1xuICAgKiBBTkQgYXJlIG5vdCBkb2luZyBjb21waWxlLXRpbWUgaW5saW5pbmcgb2YgdHJhbnNsYXRpb25zLCBpbiB3aGljaCBjYXNlIHRoZSBleHRyYSBtZXNzYWdlIGlkc1xuICAgKiB3b3VsZCBhZGQgdW53YW50ZWQgc2l6ZSB0byB0aGUgZmluYWwgc291cmNlIGJ1bmRsZS5cbiAgICpcbiAgICogSXQgaXMgc2FmZSB0byBsZWF2ZSB0aGlzIHNldCB0byB0cnVlIGlmIHlvdSBhcmUgZG9pbmcgY29tcGlsZS10aW1lIGlubGluaW5nIGJlY2F1c2UgdGhlIGV4dHJhXG4gICAqIGxlZ2FjeSBtZXNzYWdlIGlkcyB3aWxsIGFsbCBiZSBzdHJpcHBlZCBkdXJpbmcgdHJhbnNsYXRpb24uXG4gICAqL1xuICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBpbnZhbGlkYXRlIGFueSBlbnRyeS1wb2ludCBtYW5pZmVzdCBmaWxlIHRoYXQgaXMgb24gZGlzay4gSW5zdGVhZCwgd2FsayB0aGVcbiAgICogZGlyZWN0b3J5IHRyZWUgbG9va2luZyBmb3IgZW50cnktcG9pbnRzLCBhbmQgdGhlbiB3cml0ZSBhIG5ldyBlbnRyeS1wb2ludCBtYW5pZmVzdCwgaWZcbiAgICogcG9zc2libGUuXG4gICAqXG4gICAqIERlZmF1bHQ6IGBmYWxzZWAgKGkuZS4gdGhlIG1hbmlmZXN0IHdpbGwgYmUgdXNlZCBpZiBhdmFpbGFibGUpXG4gICAqL1xuICBpbnZhbGlkYXRlRW50cnlQb2ludE1hbmlmZXN0PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQW4gYWJzb2x1dGUgcGF0aCB0byBhIFRTIGNvbmZpZyBmaWxlIChlLmcuIGB0c2NvbmZpZy5qc29uYCkgb3IgYSBkaXJlY3RvcnkgY29udGFpbmluZyBvbmUsIHRoYXRcbiAgICogd2lsbCBiZSB1c2VkIHRvIGNvbmZpZ3VyZSBtb2R1bGUgcmVzb2x1dGlvbiB3aXRoIHRoaW5ncyBsaWtlIHBhdGggbWFwcGluZ3MsIGlmIG5vdCBzcGVjaWZpZWRcbiAgICogZXhwbGljaXRseSB2aWEgdGhlIGBwYXRoTWFwcGluZ3NgIHByb3BlcnR5IHRvIGBtYWluTmdjY2AuXG4gICAqXG4gICAqIElmIGB1bmRlZmluZWRgLCBuZ2NjIHdpbGwgYXR0ZW1wdCB0byBsb2FkIGEgYHRzY29uZmlnLmpzb25gIGZpbGUgZnJvbSB0aGUgZGlyZWN0b3J5IGFib3ZlIHRoZVxuICAgKiBgYmFzZVBhdGhgLlxuICAgKlxuICAgKiBJZiBgbnVsbGAsIG5nY2Mgd2lsbCBub3QgYXR0ZW1wdCB0byBsb2FkIGFueSBUUyBjb25maWcgZmlsZSBhdCBhbGwuXG4gICAqL1xuICB0c0NvbmZpZ1BhdGg/OiBzdHJpbmd8bnVsbDtcblxuICAvKipcbiAgICogVXNlIHRoZSBwcm9ncmFtIGRlZmluZWQgaW4gdGhlIGxvYWRlZCB0c2NvbmZpZy5qc29uIChpZiBhdmFpbGFibGUgLSBzZWVcbiAgICogYHRzQ29uZmlnUGF0aGAgb3B0aW9uKSB0byBpZGVudGlmeSB0aGUgZW50cnktcG9pbnRzIHRoYXQgc2hvdWxkIGJlIHByb2Nlc3NlZC5cbiAgICogSWYgdGhpcyBpcyBzZXQgdG8gYHRydWVgIHRoZW4gb25seSB0aGUgZW50cnktcG9pbnRzIHJlYWNoYWJsZSBmcm9tIHRoZSBnaXZlblxuICAgKiBwcm9ncmFtIChhbmQgdGhlaXIgZGVwZW5kZW5jaWVzKSB3aWxsIGJlIHByb2Nlc3NlZC5cbiAgICovXG4gIGZpbmRFbnRyeVBvaW50c0Zyb21Uc0NvbmZpZ1Byb2dyYW0/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlciBmb3IgYXN5bmNocm9ub3VzIGV4ZWN1dGlvbi5cbiAqL1xuZXhwb3J0IHR5cGUgQXN5bmNOZ2NjT3B0aW9ucyA9IE9taXQ8U3luY05nY2NPcHRpb25zLCAnYXN5bmMnPiZ7YXN5bmM6IHRydWV9O1xuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlci5cbiAqL1xuZXhwb3J0IHR5cGUgTmdjY09wdGlvbnMgPSBBc3luY05nY2NPcHRpb25zfFN5bmNOZ2NjT3B0aW9ucztcblxuZXhwb3J0IHR5cGUgT3B0aW9uYWxOZ2NjT3B0aW9uS2V5cyA9XG4gICAgJ3RhcmdldEVudHJ5UG9pbnRQYXRoJ3wndHNDb25maWdQYXRoJ3wncGF0aE1hcHBpbmdzJ3wnZmluZEVudHJ5UG9pbnRzRnJvbVRzQ29uZmlnUHJvZ3JhbSc7XG5leHBvcnQgdHlwZSBSZXF1aXJlZE5nY2NPcHRpb25zID0gUmVxdWlyZWQ8T21pdDxOZ2NjT3B0aW9ucywgT3B0aW9uYWxOZ2NjT3B0aW9uS2V5cz4+O1xuZXhwb3J0IHR5cGUgT3B0aW9uYWxOZ2NjT3B0aW9ucyA9IFBpY2s8TmdjY09wdGlvbnMsIE9wdGlvbmFsTmdjY09wdGlvbktleXM+O1xuZXhwb3J0IHR5cGUgU2hhcmVkU2V0dXAgPSB7XG4gIGZpbGVTeXN0ZW06IEZpbGVTeXN0ZW07IGFic0Jhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aDsgcHJvamVjdFBhdGg6IEFic29sdXRlRnNQYXRoO1xuICB0c0NvbmZpZzogUGFyc2VkQ29uZmlndXJhdGlvbiB8IG51bGw7XG4gIGdldEZpbGVXcml0ZXIocGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlcik6IEZpbGVXcml0ZXI7XG59O1xuXG4vKipcbiAqIEluc3RhbnRpYXRlIGNvbW1vbiB1dGlsaXRpZXMgdGhhdCBhcmUgYWx3YXlzIHVzZWQgYW5kIGZpeCB1cCBvcHRpb25zIHdpdGggZGVmYXVsdHMsIGFzIG5lY2Vzc2FyeS5cbiAqXG4gKiBOT1RFOiBBdm9pZCBlYWdlcmx5IGluc3RhbnRpYXRpbmcgYW55dGhpbmcgdGhhdCBtaWdodCBub3QgYmUgdXNlZCB3aGVuIHJ1bm5pbmcgc3luYy9hc3luYy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNoYXJlZFNldHVwKG9wdGlvbnM6IE5nY2NPcHRpb25zKTogU2hhcmVkU2V0dXAmUmVxdWlyZWROZ2NjT3B0aW9ucyZcbiAgICBPcHRpb25hbE5nY2NPcHRpb25zIHtcbiAgY29uc3QgZmlsZVN5c3RlbSA9IGdldEZpbGVTeXN0ZW0oKTtcbiAgY29uc3QgYWJzQmFzZVBhdGggPSBhYnNvbHV0ZUZyb20ob3B0aW9ucy5iYXNlUGF0aCk7XG4gIGNvbnN0IHByb2plY3RQYXRoID0gZmlsZVN5c3RlbS5kaXJuYW1lKGFic0Jhc2VQYXRoKTtcbiAgY29uc3QgdHNDb25maWcgPVxuICAgICAgb3B0aW9ucy50c0NvbmZpZ1BhdGggIT09IG51bGwgPyBnZXRUc0NvbmZpZyhvcHRpb25zLnRzQ29uZmlnUGF0aCB8fCBwcm9qZWN0UGF0aCkgOiBudWxsO1xuXG4gIGxldCB7XG4gICAgYmFzZVBhdGgsXG4gICAgdGFyZ2V0RW50cnlQb2ludFBhdGgsXG4gICAgcHJvcGVydGllc1RvQ29uc2lkZXIgPSBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMsXG4gICAgdHlwaW5nc09ubHkgPSBmYWxzZSxcbiAgICBjb21waWxlQWxsRm9ybWF0cyA9IHRydWUsXG4gICAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMgPSBmYWxzZSxcbiAgICBsb2dnZXIgPSBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbC5pbmZvKSxcbiAgICBwYXRoTWFwcGluZ3MgPSBnZXRQYXRoTWFwcGluZ3NGcm9tVHNDb25maWcoZmlsZVN5c3RlbSwgdHNDb25maWcsIHByb2plY3RQYXRoKSxcbiAgICBhc3luYyA9IGZhbHNlLFxuICAgIGVycm9yT25GYWlsZWRFbnRyeVBvaW50ID0gZmFsc2UsXG4gICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCA9IHRydWUsXG4gICAgaW52YWxpZGF0ZUVudHJ5UG9pbnRNYW5pZmVzdCA9IGZhbHNlLFxuICAgIHRzQ29uZmlnUGF0aCxcbiAgfSA9IG9wdGlvbnM7XG5cbiAgaWYgKCEhdGFyZ2V0RW50cnlQb2ludFBhdGgpIHtcbiAgICAvLyB0YXJnZXRFbnRyeVBvaW50UGF0aCBmb3JjZXMgdXMgdG8gZXJyb3IgaWYgYW4gZW50cnktcG9pbnQgZmFpbHMuXG4gICAgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQgPSB0cnVlO1xuICB9XG5cbiAgaWYgKHR5cGluZ3NPbmx5KSB7XG4gICAgLy8gSWYgd2Ugb25seSB3YW50IHRvIHByb2Nlc3MgdGhlIHR5cGluZ3MgdGhlbiB3ZSBkbyBub3Qgd2FudCB0byB3YXN0ZSB0aW1lIHRyeWluZyB0byBwcm9jZXNzXG4gICAgLy8gbXVsdGlwbGUgSlMgZm9ybWF0cy5cbiAgICBjb21waWxlQWxsRm9ybWF0cyA9IGZhbHNlO1xuICB9XG5cbiAgY2hlY2tGb3JTb2x1dGlvblN0eWxlVHNDb25maWcoZmlsZVN5c3RlbSwgbG9nZ2VyLCBwcm9qZWN0UGF0aCwgb3B0aW9ucy50c0NvbmZpZ1BhdGgsIHRzQ29uZmlnKTtcblxuICByZXR1cm4ge1xuICAgIGJhc2VQYXRoLFxuICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoLFxuICAgIHByb3BlcnRpZXNUb0NvbnNpZGVyLFxuICAgIHR5cGluZ3NPbmx5LFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzLFxuICAgIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzLFxuICAgIGxvZ2dlcixcbiAgICBwYXRoTWFwcGluZ3MsXG4gICAgYXN5bmMsXG4gICAgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQsXG4gICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCxcbiAgICBpbnZhbGlkYXRlRW50cnlQb2ludE1hbmlmZXN0LFxuICAgIHRzQ29uZmlnUGF0aCxcbiAgICBmaWxlU3lzdGVtLFxuICAgIGFic0Jhc2VQYXRoLFxuICAgIHByb2plY3RQYXRoLFxuICAgIHRzQ29uZmlnLFxuICAgIGdldEZpbGVXcml0ZXI6IChwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyKSA9PiBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA/XG4gICAgICAgIG5ldyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlcihmaWxlU3lzdGVtLCBsb2dnZXIsIGVycm9yT25GYWlsZWRFbnRyeVBvaW50LCBwa2dKc29uVXBkYXRlcikgOlxuICAgICAgICBuZXcgSW5QbGFjZUZpbGVXcml0ZXIoZmlsZVN5c3RlbSwgbG9nZ2VyLCBlcnJvck9uRmFpbGVkRW50cnlQb2ludCksXG4gIH07XG59XG5cbmxldCB0c0NvbmZpZ0NhY2hlOiBQYXJzZWRDb25maWd1cmF0aW9ufG51bGwgPSBudWxsO1xubGV0IHRzQ29uZmlnUGF0aENhY2hlOiBzdHJpbmd8bnVsbCA9IG51bGw7XG5cbi8qKlxuICogR2V0IHRoZSBwYXJzZWQgY29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRoZSBnaXZlbiBgdHNDb25maWdQYXRoYC5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdpbGwgY2FjaGUgdGhlIHByZXZpb3VzIHBhcnNlZCBjb25maWd1cmF0aW9uIG9iamVjdCB0byBhdm9pZCB1bm5lY2Vzc2FyeSBwcm9jZXNzaW5nXG4gKiBvZiB0aGUgdHNjb25maWcuanNvbiBpbiB0aGUgY2FzZSB0aGF0IGl0IGlzIHJlcXVlc3RlZCByZXBlYXRlZGx5LlxuICpcbiAqIFRoaXMgbWFrZXMgdGhlIGFzc3VtcHRpb24sIHdoaWNoIGlzIHRydWUgYXMgb2Ygd3JpdGluZywgdGhhdCB0aGUgY29udGVudHMgb2YgdHNjb25maWcuanNvbiBhbmRcbiAqIGl0cyBkZXBlbmRlbmNpZXMgd2lsbCBub3QgY2hhbmdlIGR1cmluZyB0aGUgbGlmZSBvZiB0aGUgcHJvY2VzcyBydW5uaW5nIG5nY2MuXG4gKi9cbmZ1bmN0aW9uIGdldFRzQ29uZmlnKHRzQ29uZmlnUGF0aDogc3RyaW5nKTogUGFyc2VkQ29uZmlndXJhdGlvbnxudWxsIHtcbiAgaWYgKHRzQ29uZmlnUGF0aCAhPT0gdHNDb25maWdQYXRoQ2FjaGUpIHtcbiAgICB0c0NvbmZpZ1BhdGhDYWNoZSA9IHRzQ29uZmlnUGF0aDtcbiAgICB0c0NvbmZpZ0NhY2hlID0gcmVhZENvbmZpZ3VyYXRpb24odHNDb25maWdQYXRoKTtcbiAgfVxuICByZXR1cm4gdHNDb25maWdDYWNoZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyVHNDb25maWdDYWNoZSgpIHtcbiAgdHNDb25maWdQYXRoQ2FjaGUgPSBudWxsO1xuICB0c0NvbmZpZ0NhY2hlID0gbnVsbDtcbn1cblxuZnVuY3Rpb24gY2hlY2tGb3JTb2x1dGlvblN0eWxlVHNDb25maWcoXG4gICAgZmlsZVN5c3RlbTogUGF0aE1hbmlwdWxhdGlvbiwgbG9nZ2VyOiBMb2dnZXIsIHByb2plY3RQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICB0c0NvbmZpZ1BhdGg6IHN0cmluZ3xudWxsfHVuZGVmaW5lZCwgdHNDb25maWc6IFBhcnNlZENvbmZpZ3VyYXRpb258bnVsbCk6IHZvaWQge1xuICBpZiAodHNDb25maWdQYXRoICE9PSBudWxsICYmICF0c0NvbmZpZ1BhdGggJiYgdHNDb25maWcgIT09IG51bGwgJiZcbiAgICAgIHRzQ29uZmlnLnJvb3ROYW1lcy5sZW5ndGggPT09IDAgJiYgdHNDb25maWcucHJvamVjdFJlZmVyZW5jZXMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgdHNDb25maWcucHJvamVjdFJlZmVyZW5jZXMubGVuZ3RoID4gMCkge1xuICAgIGxvZ2dlci53YXJuKFxuICAgICAgICBgVGhlIGluZmVycmVkIHRzY29uZmlnIGZpbGUgXCIke3RzQ29uZmlnLnByb2plY3R9XCIgYXBwZWFycyB0byBiZSBcInNvbHV0aW9uLXN0eWxlXCIgYCArXG4gICAgICAgIGBzaW5jZSBpdCBjb250YWlucyBubyByb290IGZpbGVzIGJ1dCBkb2VzIGNvbnRhaW4gcHJvamVjdCByZWZlcmVuY2VzLlxcbmAgK1xuICAgICAgICBgVGhpcyBpcyBwcm9iYWJseSBub3Qgd2FudGVkLCBzaW5jZSBuZ2NjIGlzIHVuYWJsZSB0byBpbmZlciBzZXR0aW5ncyBsaWtlIFwicGF0aHNcIiBtYXBwaW5ncyBmcm9tIHN1Y2ggYSBmaWxlLlxcbmAgK1xuICAgICAgICBgUGVyaGFwcyB5b3Ugc2hvdWxkIGhhdmUgZXhwbGljaXRseSBzcGVjaWZpZWQgb25lIG9mIHRoZSByZWZlcmVuY2VkIHByb2plY3RzIHVzaW5nIHRoZSAtLXRzY29uZmlnIG9wdGlvbi4gRm9yIGV4YW1wbGU6XFxuXFxuYCArXG4gICAgICAgIHRzQ29uZmlnLnByb2plY3RSZWZlcmVuY2VzLm1hcChyZWYgPT4gYCAgbmdjYyAuLi4gLS10c2NvbmZpZyBcIiR7cmVmLm9yaWdpbmFsUGF0aH1cIlxcbmApXG4gICAgICAgICAgICAuam9pbignJykgK1xuICAgICAgICBgXFxuRmluZCBvdXQgbW9yZSBhYm91dCBzb2x1dGlvbi1zdHlsZSB0c2NvbmZpZyBhdCBodHRwczovL2RldmJsb2dzLm1pY3Jvc29mdC5jb20vdHlwZXNjcmlwdC9hbm5vdW5jaW5nLXR5cGVzY3JpcHQtMy05LyNzb2x1dGlvbi1zdHlsZS10c2NvbmZpZy5cXG5gICtcbiAgICAgICAgYElmIHlvdSBkaWQgaW50ZW5kIHRvIHVzZSB0aGlzIGZpbGUsIHRoZW4geW91IGNhbiBoaWRlIHRoaXMgd2FybmluZyBieSBwcm92aWRpbmcgaXQgZXhwbGljaXRseTpcXG5cXG5gICtcbiAgICAgICAgYCAgbmdjYyAuLi4gLS10c2NvbmZpZyBcIiR7ZmlsZVN5c3RlbS5yZWxhdGl2ZShwcm9qZWN0UGF0aCwgdHNDb25maWcucHJvamVjdCl9XCJgKTtcbiAgfVxufVxuXG4vKipcbiAqIERldGVybWluZXMgdGhlIG1heGltdW0gbnVtYmVyIG9mIHdvcmtlcnMgdG8gdXNlIGZvciBwYXJhbGxlbCBleGVjdXRpb24uIFRoaXMgY2FuIGJlIHNldCB1c2luZyB0aGVcbiAqIE5HQ0NfTUFYX1dPUktFUlMgZW52aXJvbm1lbnQgdmFyaWFibGUsIG9yIGlzIGNvbXB1dGVkIGJhc2VkIG9uIHRoZSBudW1iZXIgb2YgYXZhaWxhYmxlIENQVXMuIE9uZVxuICogQ1BVIGNvcmUgaXMgYWx3YXlzIHJlc2VydmVkIGZvciB0aGUgbWFzdGVyIHByb2Nlc3MsIHNvIHdlIHRha2UgdGhlIG51bWJlciBvZiBDUFVzIG1pbnVzIG9uZSwgd2l0aFxuICogYSBtYXhpbXVtIG9mIDQgd29ya2Vycy4gV2UgZG9uJ3Qgc2NhbGUgdGhlIG51bWJlciBvZiB3b3JrZXJzIGJleW9uZCA0IGJ5IGRlZmF1bHQsIGFzIGl0IHRha2VzXG4gKiBjb25zaWRlcmFibHkgbW9yZSBtZW1vcnkgYW5kIENQVSBjeWNsZXMgd2hpbGUgbm90IG9mZmVyaW5nIGEgc3Vic3RhbnRpYWwgaW1wcm92ZW1lbnQgaW4gdGltZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE1heE51bWJlck9mV29ya2VycygpOiBudW1iZXIge1xuICBjb25zdCBtYXhXb3JrZXJzID0gcHJvY2Vzcy5lbnYuTkdDQ19NQVhfV09SS0VSUztcbiAgaWYgKG1heFdvcmtlcnMgPT09IHVuZGVmaW5lZCkge1xuICAgIC8vIFVzZSB1cCB0byA0IENQVSBjb3JlcyBmb3Igd29ya2VycywgYWx3YXlzIHJlc2VydmluZyBvbmUgZm9yIG1hc3Rlci5cbiAgICByZXR1cm4gTWF0aC5tYXgoMSwgTWF0aC5taW4oNCwgb3MuY3B1cygpLmxlbmd0aCAtIDEpKTtcbiAgfVxuXG4gIGNvbnN0IG51bWVyaWNNYXhXb3JrZXJzID0gK21heFdvcmtlcnMudHJpbSgpO1xuICBpZiAoIU51bWJlci5pc0ludGVnZXIobnVtZXJpY01heFdvcmtlcnMpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOR0NDX01BWF9XT1JLRVJTIHNob3VsZCBiZSBhbiBpbnRlZ2VyLicpO1xuICB9IGVsc2UgaWYgKG51bWVyaWNNYXhXb3JrZXJzIDwgMSkge1xuICAgIHRocm93IG5ldyBFcnJvcignTkdDQ19NQVhfV09SS0VSUyBzaG91bGQgYmUgYXQgbGVhc3QgMS4nKTtcbiAgfVxuICByZXR1cm4gbnVtZXJpY01heFdvcmtlcnM7XG59XG4iXX0=