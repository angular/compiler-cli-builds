(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/ngcc_options", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/perform_compile", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/logging/logger", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/path_mappings", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getSharedSetup = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var perform_compile_1 = require("@angular/compiler-cli/src/perform_compile");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    var logger_1 = require("@angular/compiler-cli/ngcc/src/logging/logger");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var path_mappings_1 = require("@angular/compiler-cli/ngcc/src/path_mappings");
    var in_place_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/in_place_file_writer");
    var new_entry_point_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer");
    /**
     * Instantiate common utilities that are always used and fix up options with defaults, as necessary.
     *
     * NOTE: Avoid eagerly instantiating anything that might not be used when running sync/async.
     */
    function getSharedSetup(options) {
        var fileSystem = file_system_1.getFileSystem();
        var absBasePath = file_system_1.absoluteFrom(options.basePath);
        var projectPath = fileSystem.dirname(absBasePath);
        var tsConfig = options.tsConfigPath !== null ? perform_compile_1.readConfiguration(options.tsConfigPath || projectPath) : null;
        var basePath = options.basePath, targetEntryPointPath = options.targetEntryPointPath, _a = options.propertiesToConsider, propertiesToConsider = _a === void 0 ? entry_point_1.SUPPORTED_FORMAT_PROPERTIES : _a, _b = options.compileAllFormats, compileAllFormats = _b === void 0 ? true : _b, _c = options.createNewEntryPointFormats, createNewEntryPointFormats = _c === void 0 ? false : _c, _d = options.logger, logger = _d === void 0 ? new console_logger_1.ConsoleLogger(logger_1.LogLevel.info) : _d, _e = options.pathMappings, pathMappings = _e === void 0 ? path_mappings_1.getPathMappingsFromTsConfig(tsConfig, projectPath) : _e, _f = options.async, async = _f === void 0 ? false : _f, _g = options.errorOnFailedEntryPoint, errorOnFailedEntryPoint = _g === void 0 ? false : _g, _h = options.enableI18nLegacyMessageIdFormat, enableI18nLegacyMessageIdFormat = _h === void 0 ? true : _h, _j = options.invalidateEntryPointManifest, invalidateEntryPointManifest = _j === void 0 ? false : _j, tsConfigPath = options.tsConfigPath;
        if (!!targetEntryPointPath) {
            // targetEntryPointPath forces us to error if an entry-point fails.
            errorOnFailedEntryPoint = true;
        }
        return {
            basePath: basePath,
            targetEntryPointPath: targetEntryPointPath,
            propertiesToConsider: propertiesToConsider,
            compileAllFormats: compileAllFormats,
            createNewEntryPointFormats: createNewEntryPointFormats,
            logger: logger,
            pathMappings: pathMappings,
            async: async,
            errorOnFailedEntryPoint: errorOnFailedEntryPoint,
            enableI18nLegacyMessageIdFormat: enableI18nLegacyMessageIdFormat,
            invalidateEntryPointManifest: invalidateEntryPointManifest,
            tsConfigPath: tsConfigPath,
            fileSystem: fileSystem,
            absBasePath: absBasePath,
            projectPath: projectPath,
            tsConfig: tsConfig,
            getFileWriter: function (pkgJsonUpdater) { return createNewEntryPointFormats ?
                new new_entry_point_file_writer_1.NewEntryPointFileWriter(fileSystem, logger, errorOnFailedEntryPoint, pkgJsonUpdater) :
                new in_place_file_writer_1.InPlaceFileWriter(fileSystem, logger, errorOnFailedEntryPoint); },
        };
    }
    exports.getSharedSetup = getSharedSetup;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19vcHRpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL25nY2Nfb3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBb0c7SUFDcEcsNkVBQWlGO0lBRWpGLHdGQUF1RDtJQUN2RCx3RUFBa0Q7SUFDbEQsbUZBQW1FO0lBQ25FLDhFQUEwRTtJQUUxRSxvR0FBaUU7SUFDakUsa0hBQThFO0lBbUk5RTs7OztPQUlHO0lBQ0gsU0FBZ0IsY0FBYyxDQUFDLE9BQW9CO1FBRWpELElBQU0sVUFBVSxHQUFHLDJCQUFhLEVBQUUsQ0FBQztRQUNuQyxJQUFNLFdBQVcsR0FBRywwQkFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxJQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3BELElBQU0sUUFBUSxHQUNWLE9BQU8sQ0FBQyxZQUFZLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxtQ0FBaUIsQ0FBQyxPQUFPLENBQUMsWUFBWSxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFHaEcsSUFBQSxRQUFRLEdBWU4sT0FBTyxTQVpELEVBQ1Isb0JBQW9CLEdBV2xCLE9BQU8scUJBWFcsRUFDcEIsS0FVRSxPQUFPLHFCQVZ5QyxFQUFsRCxvQkFBb0IsbUJBQUcseUNBQTJCLEtBQUEsRUFDbEQsS0FTRSxPQUFPLGtCQVRlLEVBQXhCLGlCQUFpQixtQkFBRyxJQUFJLEtBQUEsRUFDeEIsS0FRRSxPQUFPLDJCQVJ5QixFQUFsQywwQkFBMEIsbUJBQUcsS0FBSyxLQUFBLEVBQ2xDLEtBT0UsT0FBTyxPQVBnQyxFQUF6QyxNQUFNLG1CQUFHLElBQUksOEJBQWEsQ0FBQyxpQkFBUSxDQUFDLElBQUksQ0FBQyxLQUFBLEVBQ3pDLEtBTUUsT0FBTyxhQU53RCxFQUFqRSxZQUFZLG1CQUFHLDJDQUEyQixDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsS0FBQSxFQUNqRSxLQUtFLE9BQU8sTUFMSSxFQUFiLEtBQUssbUJBQUcsS0FBSyxLQUFBLEVBQ2IsS0FJRSxPQUFPLHdCQUpzQixFQUEvQix1QkFBdUIsbUJBQUcsS0FBSyxLQUFBLEVBQy9CLEtBR0UsT0FBTyxnQ0FINkIsRUFBdEMsK0JBQStCLG1CQUFHLElBQUksS0FBQSxFQUN0QyxLQUVFLE9BQU8sNkJBRjJCLEVBQXBDLDRCQUE0QixtQkFBRyxLQUFLLEtBQUEsRUFDcEMsWUFBWSxHQUNWLE9BQU8sYUFERyxDQUNGO1FBRVosSUFBSSxDQUFDLENBQUMsb0JBQW9CLEVBQUU7WUFDMUIsbUVBQW1FO1lBQ25FLHVCQUF1QixHQUFHLElBQUksQ0FBQztTQUNoQztRQUVELE9BQU87WUFDTCxRQUFRLFVBQUE7WUFDUixvQkFBb0Isc0JBQUE7WUFDcEIsb0JBQW9CLHNCQUFBO1lBQ3BCLGlCQUFpQixtQkFBQTtZQUNqQiwwQkFBMEIsNEJBQUE7WUFDMUIsTUFBTSxRQUFBO1lBQ04sWUFBWSxjQUFBO1lBQ1osS0FBSyxPQUFBO1lBQ0wsdUJBQXVCLHlCQUFBO1lBQ3ZCLCtCQUErQixpQ0FBQTtZQUMvQiw0QkFBNEIsOEJBQUE7WUFDNUIsWUFBWSxjQUFBO1lBQ1osVUFBVSxZQUFBO1lBQ1YsV0FBVyxhQUFBO1lBQ1gsV0FBVyxhQUFBO1lBQ1gsUUFBUSxVQUFBO1lBQ1IsYUFBYSxFQUFFLFVBQUMsY0FBa0MsSUFBSyxPQUFBLDBCQUEwQixDQUFDLENBQUM7Z0JBQy9FLElBQUkscURBQXVCLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSx1QkFBdUIsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO2dCQUMxRixJQUFJLHdDQUFpQixDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsdUJBQXVCLENBQUMsRUFGZixDQUVlO1NBQ3ZFLENBQUM7SUFDSixDQUFDO0lBakRELHdDQWlEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIEFic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBnZXRGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtQYXJzZWRDb25maWd1cmF0aW9uLCByZWFkQ29uZmlndXJhdGlvbn0gZnJvbSAnLi4vLi4vc3JjL3BlcmZvcm1fY29tcGlsZSc7XG5cbmltcG9ydCB7Q29uc29sZUxvZ2dlcn0gZnJvbSAnLi9sb2dnaW5nL2NvbnNvbGVfbG9nZ2VyJztcbmltcG9ydCB7TG9nZ2VyLCBMb2dMZXZlbH0gZnJvbSAnLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge1NVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU30gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge2dldFBhdGhNYXBwaW5nc0Zyb21Uc0NvbmZpZywgUGF0aE1hcHBpbmdzfSBmcm9tICcuL3BhdGhfbWFwcGluZ3MnO1xuaW1wb3J0IHtGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuaW1wb3J0IHtJblBsYWNlRmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7TmV3RW50cnlQb2ludEZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtQYWNrYWdlSnNvblVwZGF0ZXJ9IGZyb20gJy4vd3JpdGluZy9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5cbi8qKlxuICogVGhlIG9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSBuZ2NjIGNvbXBpbGVyIGZvciBzeW5jaHJvbm91cyBleGVjdXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3luY05nY2NPcHRpb25zIHtcbiAgLyoqIFRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBgbm9kZV9tb2R1bGVzYCBmb2xkZXIgdGhhdCBjb250YWlucyB0aGUgcGFja2FnZXMgdG8gcHJvY2Vzcy4gKi9cbiAgYmFzZVBhdGg6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHBhdGggdG8gdGhlIHByaW1hcnkgcGFja2FnZSB0byBiZSBwcm9jZXNzZWQuIElmIG5vdCBhYnNvbHV0ZSB0aGVuIGl0IG11c3QgYmUgcmVsYXRpdmUgdG9cbiAgICogYGJhc2VQYXRoYC5cbiAgICpcbiAgICogQWxsIGl0cyBkZXBlbmRlbmNpZXMgd2lsbCBuZWVkIHRvIGJlIHByb2Nlc3NlZCB0b28uXG4gICAqXG4gICAqIElmIHRoaXMgcHJvcGVydHkgaXMgcHJvdmlkZWQgdGhlbiBgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnRgIGlzIGZvcmNlZCB0byB0cnVlLlxuICAgKi9cbiAgdGFyZ2V0RW50cnlQb2ludFBhdGg/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFdoaWNoIGVudHJ5LXBvaW50IHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbiB0byBjb25zaWRlciB3aGVuIHByb2Nlc3NpbmcgYW4gZW50cnktcG9pbnQuXG4gICAqIEVhY2ggcHJvcGVydHkgc2hvdWxkIGhvbGQgYSBwYXRoIHRvIHRoZSBwYXJ0aWN1bGFyIGJ1bmRsZSBmb3JtYXQgZm9yIHRoZSBlbnRyeS1wb2ludC5cbiAgICogRGVmYXVsdHMgdG8gYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24uXG4gICAqL1xuICBwcm9wZXJ0aWVzVG9Db25zaWRlcj86IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHByb2Nlc3MgYWxsIGZvcm1hdHMgc3BlY2lmaWVkIGJ5IChgcHJvcGVydGllc1RvQ29uc2lkZXJgKSAgb3IgdG8gc3RvcCBwcm9jZXNzaW5nXG4gICAqIHRoaXMgZW50cnktcG9pbnQgYXQgdGhlIGZpcnN0IG1hdGNoaW5nIGZvcm1hdC4gRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgKi9cbiAgY29tcGlsZUFsbEZvcm1hdHM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNyZWF0ZSBuZXcgZW50cnktcG9pbnRzIGJ1bmRsZXMgcmF0aGVyIHRoYW4gb3ZlcndyaXRpbmcgdGhlIG9yaWdpbmFsIGZpbGVzLlxuICAgKi9cbiAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBQcm92aWRlIGEgbG9nZ2VyIHRoYXQgd2lsbCBiZSBjYWxsZWQgd2l0aCBsb2cgbWVzc2FnZXMuXG4gICAqL1xuICBsb2dnZXI/OiBMb2dnZXI7XG5cbiAgLyoqXG4gICAqIFBhdGhzIG1hcHBpbmcgY29uZmlndXJhdGlvbiAoYHBhdGhzYCBhbmQgYGJhc2VVcmxgKSwgYXMgZm91bmQgaW4gYHRzLkNvbXBpbGVyT3B0aW9uc2AuXG4gICAqIFRoZXNlIGFyZSB1c2VkIHRvIHJlc29sdmUgcGF0aHMgdG8gbG9jYWxseSBidWlsdCBBbmd1bGFyIGxpYnJhcmllcy5cbiAgICpcbiAgICogTm90ZSB0aGF0IGBwYXRoTWFwcGluZ3NgIHNwZWNpZmllZCBoZXJlIHRha2UgcHJlY2VkZW5jZSBvdmVyIGFueSBgcGF0aE1hcHBpbmdzYCBsb2FkZWQgZnJvbSBhXG4gICAqIFRTIGNvbmZpZyBmaWxlLlxuICAgKi9cbiAgcGF0aE1hcHBpbmdzPzogUGF0aE1hcHBpbmdzO1xuXG4gIC8qKlxuICAgKiBQcm92aWRlIGEgZmlsZS1zeXN0ZW0gc2VydmljZSB0aGF0IHdpbGwgYmUgdXNlZCBieSBuZ2NjIGZvciBhbGwgZmlsZSBpbnRlcmFjdGlvbnMuXG4gICAqL1xuICBmaWxlU3lzdGVtPzogRmlsZVN5c3RlbTtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgY29tcGlsYXRpb24gc2hvdWxkIHJ1biBhbmQgcmV0dXJuIGFzeW5jaHJvbm91c2x5LiBBbGxvd2luZyBhc3luY2hyb25vdXMgZXhlY3V0aW9uXG4gICAqIG1heSBzcGVlZCB1cCB0aGUgY29tcGlsYXRpb24gYnkgdXRpbGl6aW5nIG11bHRpcGxlIENQVSBjb3JlcyAoaWYgYXZhaWxhYmxlKS5cbiAgICpcbiAgICogRGVmYXVsdDogYGZhbHNlYCAoaS5lLiBydW4gc3luY2hyb25vdXNseSlcbiAgICovXG4gIGFzeW5jPzogZmFsc2U7XG5cbiAgLyoqXG4gICAqIFNldCB0byB0cnVlIGluIG9yZGVyIHRvIHRlcm1pbmF0ZSBpbW1lZGlhdGVseSB3aXRoIGFuIGVycm9yIGNvZGUgaWYgYW4gZW50cnktcG9pbnQgZmFpbHMgdG8gYmVcbiAgICogcHJvY2Vzc2VkLlxuICAgKlxuICAgKiBJZiBgdGFyZ2V0RW50cnlQb2ludFBhdGhgIGlzIHByb3ZpZGVkIHRoZW4gdGhpcyBwcm9wZXJ0eSBpcyBhbHdheXMgdHJ1ZSBhbmQgY2Fubm90IGJlXG4gICAqIGNoYW5nZWQuIE90aGVyd2lzZSB0aGUgZGVmYXVsdCBpcyBmYWxzZS5cbiAgICpcbiAgICogV2hlbiBzZXQgdG8gZmFsc2UsIG5nY2Mgd2lsbCBjb250aW51ZSB0byBwcm9jZXNzIGVudHJ5LXBvaW50cyBhZnRlciBhIGZhaWx1cmUuIEluIHdoaWNoIGNhc2UgaXRcbiAgICogd2lsbCBsb2cgYW4gZXJyb3IgYW5kIHJlc3VtZSBwcm9jZXNzaW5nIG90aGVyIGVudHJ5LXBvaW50cy5cbiAgICovXG4gIGVycm9yT25GYWlsZWRFbnRyeVBvaW50PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogUmVuZGVyIGAkbG9jYWxpemVgIG1lc3NhZ2VzIHdpdGggbGVnYWN5IGZvcm1hdCBpZHMuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYC4gT25seSBzZXQgdGhpcyB0byBgZmFsc2VgIGlmIHlvdSBkbyBub3Qgd2FudCBsZWdhY3kgbWVzc2FnZSBpZHMgdG9cbiAgICogYmUgcmVuZGVyZWQuIEZvciBleGFtcGxlLCBpZiB5b3UgYXJlIG5vdCB1c2luZyBsZWdhY3kgbWVzc2FnZSBpZHMgaW4geW91ciB0cmFuc2xhdGlvbiBmaWxlc1xuICAgKiBBTkQgYXJlIG5vdCBkb2luZyBjb21waWxlLXRpbWUgaW5saW5pbmcgb2YgdHJhbnNsYXRpb25zLCBpbiB3aGljaCBjYXNlIHRoZSBleHRyYSBtZXNzYWdlIGlkc1xuICAgKiB3b3VsZCBhZGQgdW53YW50ZWQgc2l6ZSB0byB0aGUgZmluYWwgc291cmNlIGJ1bmRsZS5cbiAgICpcbiAgICogSXQgaXMgc2FmZSB0byBsZWF2ZSB0aGlzIHNldCB0byB0cnVlIGlmIHlvdSBhcmUgZG9pbmcgY29tcGlsZS10aW1lIGlubGluaW5nIGJlY2F1c2UgdGhlIGV4dHJhXG4gICAqIGxlZ2FjeSBtZXNzYWdlIGlkcyB3aWxsIGFsbCBiZSBzdHJpcHBlZCBkdXJpbmcgdHJhbnNsYXRpb24uXG4gICAqL1xuICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBpbnZhbGlkYXRlIGFueSBlbnRyeS1wb2ludCBtYW5pZmVzdCBmaWxlIHRoYXQgaXMgb24gZGlzay4gSW5zdGVhZCwgd2FsayB0aGVcbiAgICogZGlyZWN0b3J5IHRyZWUgbG9va2luZyBmb3IgZW50cnktcG9pbnRzLCBhbmQgdGhlbiB3cml0ZSBhIG5ldyBlbnRyeS1wb2ludCBtYW5pZmVzdCwgaWZcbiAgICogcG9zc2libGUuXG4gICAqXG4gICAqIERlZmF1bHQ6IGBmYWxzZWAgKGkuZS4gdGhlIG1hbmlmZXN0IHdpbGwgYmUgdXNlZCBpZiBhdmFpbGFibGUpXG4gICAqL1xuICBpbnZhbGlkYXRlRW50cnlQb2ludE1hbmlmZXN0PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQW4gYWJzb2x1dGUgcGF0aCB0byBhIFRTIGNvbmZpZyBmaWxlIChlLmcuIGB0c2NvbmZpZy5qc29uYCkgb3IgYSBkaXJlY3RvcnkgY29udGFpbmluZyBvbmUsIHRoYXRcbiAgICogd2lsbCBiZSB1c2VkIHRvIGNvbmZpZ3VyZSBtb2R1bGUgcmVzb2x1dGlvbiB3aXRoIHRoaW5ncyBsaWtlIHBhdGggbWFwcGluZ3MsIGlmIG5vdCBzcGVjaWZpZWRcbiAgICogZXhwbGljaXRseSB2aWEgdGhlIGBwYXRoTWFwcGluZ3NgIHByb3BlcnR5IHRvIGBtYWluTmdjY2AuXG4gICAqXG4gICAqIElmIGB1bmRlZmluZWRgLCBuZ2NjIHdpbGwgYXR0ZW1wdCB0byBsb2FkIGEgYHRzY29uZmlnLmpzb25gIGZpbGUgZnJvbSB0aGUgZGlyZWN0b3J5IGFib3ZlIHRoZVxuICAgKiBgYmFzZVBhdGhgLlxuICAgKlxuICAgKiBJZiBgbnVsbGAsIG5nY2Mgd2lsbCBub3QgYXR0ZW1wdCB0byBsb2FkIGFueSBUUyBjb25maWcgZmlsZSBhdCBhbGwuXG4gICAqL1xuICB0c0NvbmZpZ1BhdGg/OiBzdHJpbmd8bnVsbDtcbn1cblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIgZm9yIGFzeW5jaHJvbm91cyBleGVjdXRpb24uXG4gKi9cbmV4cG9ydCB0eXBlIEFzeW5jTmdjY09wdGlvbnMgPSBPbWl0PFN5bmNOZ2NjT3B0aW9ucywgJ2FzeW5jJz4me2FzeW5jOiB0cnVlfTtcblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIuXG4gKi9cbmV4cG9ydCB0eXBlIE5nY2NPcHRpb25zID0gQXN5bmNOZ2NjT3B0aW9uc3xTeW5jTmdjY09wdGlvbnM7XG5cbmV4cG9ydCB0eXBlIE9wdGlvbmFsTmdjY09wdGlvbktleXMgPSAndGFyZ2V0RW50cnlQb2ludFBhdGgnfCd0c0NvbmZpZ1BhdGgnfCdwYXRoTWFwcGluZ3MnO1xuZXhwb3J0IHR5cGUgUmVxdWlyZWROZ2NjT3B0aW9ucyA9IFJlcXVpcmVkPE9taXQ8TmdjY09wdGlvbnMsIE9wdGlvbmFsTmdjY09wdGlvbktleXM+PjtcbmV4cG9ydCB0eXBlIE9wdGlvbmFsTmdjY09wdGlvbnMgPSBQaWNrPE5nY2NPcHRpb25zLCBPcHRpb25hbE5nY2NPcHRpb25LZXlzPjtcbmV4cG9ydCB0eXBlIFNoYXJlZFNldHVwID0ge1xuICBmaWxlU3lzdGVtOiBGaWxlU3lzdGVtOyBhYnNCYXNlUGF0aDogQWJzb2x1dGVGc1BhdGg7IHByb2plY3RQYXRoOiBBYnNvbHV0ZUZzUGF0aDtcbiAgdHNDb25maWc6IFBhcnNlZENvbmZpZ3VyYXRpb24gfCBudWxsO1xuICBnZXRGaWxlV3JpdGVyKHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIpOiBGaWxlV3JpdGVyO1xufTtcblxuLyoqXG4gKiBJbnN0YW50aWF0ZSBjb21tb24gdXRpbGl0aWVzIHRoYXQgYXJlIGFsd2F5cyB1c2VkIGFuZCBmaXggdXAgb3B0aW9ucyB3aXRoIGRlZmF1bHRzLCBhcyBuZWNlc3NhcnkuXG4gKlxuICogTk9URTogQXZvaWQgZWFnZXJseSBpbnN0YW50aWF0aW5nIGFueXRoaW5nIHRoYXQgbWlnaHQgbm90IGJlIHVzZWQgd2hlbiBydW5uaW5nIHN5bmMvYXN5bmMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTaGFyZWRTZXR1cChvcHRpb25zOiBOZ2NjT3B0aW9ucyk6IFNoYXJlZFNldHVwJlJlcXVpcmVkTmdjY09wdGlvbnMmXG4gICAgT3B0aW9uYWxOZ2NjT3B0aW9ucyB7XG4gIGNvbnN0IGZpbGVTeXN0ZW0gPSBnZXRGaWxlU3lzdGVtKCk7XG4gIGNvbnN0IGFic0Jhc2VQYXRoID0gYWJzb2x1dGVGcm9tKG9wdGlvbnMuYmFzZVBhdGgpO1xuICBjb25zdCBwcm9qZWN0UGF0aCA9IGZpbGVTeXN0ZW0uZGlybmFtZShhYnNCYXNlUGF0aCk7XG4gIGNvbnN0IHRzQ29uZmlnID1cbiAgICAgIG9wdGlvbnMudHNDb25maWdQYXRoICE9PSBudWxsID8gcmVhZENvbmZpZ3VyYXRpb24ob3B0aW9ucy50c0NvbmZpZ1BhdGggfHwgcHJvamVjdFBhdGgpIDogbnVsbDtcblxuICBsZXQge1xuICAgIGJhc2VQYXRoLFxuICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoLFxuICAgIHByb3BlcnRpZXNUb0NvbnNpZGVyID0gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzID0gdHJ1ZSxcbiAgICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IGZhbHNlLFxuICAgIGxvZ2dlciA9IG5ldyBDb25zb2xlTG9nZ2VyKExvZ0xldmVsLmluZm8pLFxuICAgIHBhdGhNYXBwaW5ncyA9IGdldFBhdGhNYXBwaW5nc0Zyb21Uc0NvbmZpZyh0c0NvbmZpZywgcHJvamVjdFBhdGgpLFxuICAgIGFzeW5jID0gZmFsc2UsXG4gICAgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQgPSBmYWxzZSxcbiAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ID0gdHJ1ZSxcbiAgICBpbnZhbGlkYXRlRW50cnlQb2ludE1hbmlmZXN0ID0gZmFsc2UsXG4gICAgdHNDb25maWdQYXRoLFxuICB9ID0gb3B0aW9ucztcblxuICBpZiAoISF0YXJnZXRFbnRyeVBvaW50UGF0aCkge1xuICAgIC8vIHRhcmdldEVudHJ5UG9pbnRQYXRoIGZvcmNlcyB1cyB0byBlcnJvciBpZiBhbiBlbnRyeS1wb2ludCBmYWlscy5cbiAgICBlcnJvck9uRmFpbGVkRW50cnlQb2ludCA9IHRydWU7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGJhc2VQYXRoLFxuICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoLFxuICAgIHByb3BlcnRpZXNUb0NvbnNpZGVyLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzLFxuICAgIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzLFxuICAgIGxvZ2dlcixcbiAgICBwYXRoTWFwcGluZ3MsXG4gICAgYXN5bmMsXG4gICAgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQsXG4gICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCxcbiAgICBpbnZhbGlkYXRlRW50cnlQb2ludE1hbmlmZXN0LFxuICAgIHRzQ29uZmlnUGF0aCxcbiAgICBmaWxlU3lzdGVtLFxuICAgIGFic0Jhc2VQYXRoLFxuICAgIHByb2plY3RQYXRoLFxuICAgIHRzQ29uZmlnLFxuICAgIGdldEZpbGVXcml0ZXI6IChwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyKSA9PiBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA/XG4gICAgICAgIG5ldyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlcihmaWxlU3lzdGVtLCBsb2dnZXIsIGVycm9yT25GYWlsZWRFbnRyeVBvaW50LCBwa2dKc29uVXBkYXRlcikgOlxuICAgICAgICBuZXcgSW5QbGFjZUZpbGVXcml0ZXIoZmlsZVN5c3RlbSwgbG9nZ2VyLCBlcnJvck9uRmFpbGVkRW50cnlQb2ludCksXG4gIH07XG59XG4iXX0=