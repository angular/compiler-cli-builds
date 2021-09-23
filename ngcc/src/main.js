/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/dts_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", "@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder", "@angular/compiler-cli/ngcc/src/entry_point_finder/entry_point_collector", "@angular/compiler-cli/ngcc/src/entry_point_finder/program_based_entry_point_finder", "@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder", "@angular/compiler-cli/ngcc/src/execution/analyze_entry_points", "@angular/compiler-cli/ngcc/src/execution/cluster/executor", "@angular/compiler-cli/ngcc/src/execution/create_compile_function", "@angular/compiler-cli/ngcc/src/execution/single_process_executor", "@angular/compiler-cli/ngcc/src/execution/tasks/completion", "@angular/compiler-cli/ngcc/src/locking/async_locker", "@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/index", "@angular/compiler-cli/ngcc/src/locking/sync_locker", "@angular/compiler-cli/ngcc/src/ngcc_options", "@angular/compiler-cli/ngcc/src/packages/configuration", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_manifest", "@angular/compiler-cli/ngcc/src/writing/package_json_updater"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.mainNgcc = void 0;
    var tslib_1 = require("tslib");
    var commonjs_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host");
    var dependency_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver");
    var dts_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dts_dependency_host");
    var esm_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    var umd_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host");
    var directory_walker_entry_point_finder_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder");
    var entry_point_collector_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/entry_point_collector");
    var program_based_entry_point_finder_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/program_based_entry_point_finder");
    var targeted_entry_point_finder_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder");
    var analyze_entry_points_1 = require("@angular/compiler-cli/ngcc/src/execution/analyze_entry_points");
    var executor_1 = require("@angular/compiler-cli/ngcc/src/execution/cluster/executor");
    var create_compile_function_1 = require("@angular/compiler-cli/ngcc/src/execution/create_compile_function");
    var single_process_executor_1 = require("@angular/compiler-cli/ngcc/src/execution/single_process_executor");
    var completion_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/completion");
    var async_locker_1 = require("@angular/compiler-cli/ngcc/src/locking/async_locker");
    var lock_file_with_child_process_1 = require("@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/index");
    var sync_locker_1 = require("@angular/compiler-cli/ngcc/src/locking/sync_locker");
    var ngcc_options_1 = require("@angular/compiler-cli/ngcc/src/ngcc_options");
    var configuration_1 = require("@angular/compiler-cli/ngcc/src/packages/configuration");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var entry_point_manifest_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point_manifest");
    var package_json_updater_1 = require("@angular/compiler-cli/ngcc/src/writing/package_json_updater");
    function mainNgcc(options) {
        var _a = (0, ngcc_options_1.getSharedSetup)(options), basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, propertiesToConsider = _a.propertiesToConsider, typingsOnly = _a.typingsOnly, compileAllFormats = _a.compileAllFormats, logger = _a.logger, pathMappings = _a.pathMappings, async = _a.async, errorOnFailedEntryPoint = _a.errorOnFailedEntryPoint, enableI18nLegacyMessageIdFormat = _a.enableI18nLegacyMessageIdFormat, invalidateEntryPointManifest = _a.invalidateEntryPointManifest, fileSystem = _a.fileSystem, absBasePath = _a.absBasePath, projectPath = _a.projectPath, tsConfig = _a.tsConfig, getFileWriter = _a.getFileWriter;
        var config = new configuration_1.NgccConfiguration(fileSystem, projectPath);
        var dependencyResolver = getDependencyResolver(fileSystem, logger, config, pathMappings);
        var entryPointManifest = invalidateEntryPointManifest ?
            new entry_point_manifest_1.InvalidatingEntryPointManifest(fileSystem, config, logger) :
            new entry_point_manifest_1.EntryPointManifest(fileSystem, config, logger);
        // Bail out early if the work is already done.
        var supportedPropertiesToConsider = ensureSupportedProperties(propertiesToConsider);
        var absoluteTargetEntryPointPath = targetEntryPointPath !== undefined ?
            fileSystem.resolve(basePath, targetEntryPointPath) :
            null;
        var finder = getEntryPointFinder(fileSystem, logger, dependencyResolver, config, entryPointManifest, absBasePath, absoluteTargetEntryPointPath, pathMappings, options.findEntryPointsFromTsConfigProgram ? tsConfig : null, projectPath);
        if (finder instanceof targeted_entry_point_finder_1.TargetedEntryPointFinder &&
            !finder.targetNeedsProcessingOrCleaning(supportedPropertiesToConsider, compileAllFormats)) {
            logger.debug('The target entry-point has already been processed');
            return;
        }
        // Determine the number of workers to use and whether ngcc should run in parallel.
        var workerCount = async ? (0, ngcc_options_1.getMaxNumberOfWorkers)() : 1;
        var inParallel = workerCount > 1;
        var analyzeEntryPoints = (0, analyze_entry_points_1.getAnalyzeEntryPointsFn)(logger, finder, fileSystem, supportedPropertiesToConsider, typingsOnly, compileAllFormats, propertiesToConsider, inParallel);
        // Create an updater that will actually write to disk.
        var pkgJsonUpdater = new package_json_updater_1.DirectPackageJsonUpdater(fileSystem);
        var fileWriter = getFileWriter(pkgJsonUpdater);
        // The function for creating the `compile()` function.
        var createCompileFn = (0, create_compile_function_1.getCreateCompileFn)(fileSystem, logger, fileWriter, enableI18nLegacyMessageIdFormat, tsConfig, pathMappings);
        // The executor for actually planning and getting the work done.
        var createTaskCompletedCallback = getCreateTaskCompletedCallback(pkgJsonUpdater, errorOnFailedEntryPoint, logger, fileSystem);
        var executor = getExecutor(async, workerCount, logger, fileWriter, pkgJsonUpdater, fileSystem, config, createTaskCompletedCallback);
        return executor.execute(analyzeEntryPoints, createCompileFn);
    }
    exports.mainNgcc = mainNgcc;
    function ensureSupportedProperties(properties) {
        var e_1, _a;
        // Short-circuit the case where `properties` has fallen back to the default value:
        // `SUPPORTED_FORMAT_PROPERTIES`
        if (properties === entry_point_1.SUPPORTED_FORMAT_PROPERTIES)
            return entry_point_1.SUPPORTED_FORMAT_PROPERTIES;
        var supportedProperties = [];
        try {
            for (var _b = (0, tslib_1.__values)(properties), _c = _b.next(); !_c.done; _c = _b.next()) {
                var prop = _c.value;
                if (entry_point_1.SUPPORTED_FORMAT_PROPERTIES.indexOf(prop) !== -1) {
                    supportedProperties.push(prop);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (supportedProperties.length === 0) {
            throw new Error("No supported format property to consider among [" + properties.join(', ') + "]. " +
                ("Supported properties: " + entry_point_1.SUPPORTED_FORMAT_PROPERTIES.join(', ')));
        }
        return supportedProperties;
    }
    function getCreateTaskCompletedCallback(pkgJsonUpdater, errorOnFailedEntryPoint, logger, fileSystem) {
        return function (taskQueue) {
            var _a;
            return (0, completion_1.composeTaskCompletedCallbacks)((_a = {},
                _a[0 /* Processed */] = (0, completion_1.createMarkAsProcessedHandler)(fileSystem, pkgJsonUpdater),
                _a[1 /* Failed */] = errorOnFailedEntryPoint ? (0, completion_1.createThrowErrorHandler)(fileSystem) :
                    (0, completion_1.createLogErrorHandler)(logger, fileSystem, taskQueue),
                _a));
        };
    }
    function getExecutor(async, workerCount, logger, fileWriter, pkgJsonUpdater, fileSystem, config, createTaskCompletedCallback) {
        var lockFile = new lock_file_with_child_process_1.LockFileWithChildProcess(fileSystem, logger);
        if (async) {
            // Execute asynchronously (either serially or in parallel)
            var _a = config.getLockingConfig(), retryAttempts = _a.retryAttempts, retryDelay = _a.retryDelay;
            var locker = new async_locker_1.AsyncLocker(lockFile, logger, retryDelay, retryAttempts);
            if (workerCount > 1) {
                // Execute in parallel.
                return new executor_1.ClusterExecutor(workerCount, fileSystem, logger, fileWriter, pkgJsonUpdater, locker, createTaskCompletedCallback);
            }
            else {
                // Execute serially, on a single thread (async).
                return new single_process_executor_1.SingleProcessExecutorAsync(logger, locker, createTaskCompletedCallback);
            }
        }
        else {
            // Execute serially, on a single thread (sync).
            return new single_process_executor_1.SingleProcessExecutorSync(logger, new sync_locker_1.SyncLocker(lockFile), createTaskCompletedCallback);
        }
    }
    function getDependencyResolver(fileSystem, logger, config, pathMappings) {
        var moduleResolver = new module_resolver_1.ModuleResolver(fileSystem, pathMappings);
        var esmDependencyHost = new esm_dependency_host_1.EsmDependencyHost(fileSystem, moduleResolver);
        var umdDependencyHost = new umd_dependency_host_1.UmdDependencyHost(fileSystem, moduleResolver);
        var commonJsDependencyHost = new commonjs_dependency_host_1.CommonJsDependencyHost(fileSystem, moduleResolver);
        var dtsDependencyHost = new dts_dependency_host_1.DtsDependencyHost(fileSystem, pathMappings);
        return new dependency_resolver_1.DependencyResolver(fileSystem, logger, config, {
            esm5: esmDependencyHost,
            esm2015: esmDependencyHost,
            umd: umdDependencyHost,
            commonjs: commonJsDependencyHost
        }, dtsDependencyHost);
    }
    function getEntryPointFinder(fs, logger, resolver, config, entryPointManifest, basePath, absoluteTargetEntryPointPath, pathMappings, tsConfig, projectPath) {
        if (absoluteTargetEntryPointPath !== null) {
            return new targeted_entry_point_finder_1.TargetedEntryPointFinder(fs, config, logger, resolver, basePath, pathMappings, absoluteTargetEntryPointPath);
        }
        else {
            var entryPointCollector = new entry_point_collector_1.EntryPointCollector(fs, config, logger, resolver);
            if (tsConfig !== null) {
                return new program_based_entry_point_finder_1.ProgramBasedEntryPointFinder(fs, config, logger, resolver, entryPointCollector, entryPointManifest, basePath, tsConfig, projectPath);
            }
            else {
                return new directory_walker_entry_point_finder_1.DirectoryWalkerEntryPointFinder(logger, resolver, entryPointCollector, entryPointManifest, basePath, pathMappings);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFRSCxpSEFBK0U7SUFDL0UsdUdBQXNFO0lBQ3RFLHVHQUFxRTtJQUNyRSx1R0FBcUU7SUFDckUsK0ZBQThEO0lBQzlELHVHQUFxRTtJQUNyRSw2SUFBeUc7SUFDekcsaUhBQStFO0lBRS9FLHVJQUFtRztJQUNuRyw2SEFBMEY7SUFDMUYsc0dBQXlFO0lBRXpFLHNGQUE2RDtJQUM3RCw0R0FBdUU7SUFDdkUsNEdBQTBHO0lBRTFHLHdGQUF5SjtJQUN6SixvRkFBbUQ7SUFDbkQsMEhBQWdGO0lBQ2hGLGtGQUFpRDtJQUNqRCw0RUFBd0c7SUFDeEcsdUZBQTJEO0lBQzNELG1GQUEyRjtJQUMzRixxR0FBbUc7SUFHbkcsb0dBQTRGO0lBWTVGLFNBQWdCLFFBQVEsQ0FBQyxPQUF5QztRQUMxRCxJQUFBLEtBaUJGLElBQUEsNkJBQWMsRUFBQyxPQUFPLENBQUMsRUFoQnpCLFFBQVEsY0FBQSxFQUNSLG9CQUFvQiwwQkFBQSxFQUNwQixvQkFBb0IsMEJBQUEsRUFDcEIsV0FBVyxpQkFBQSxFQUNYLGlCQUFpQix1QkFBQSxFQUNqQixNQUFNLFlBQUEsRUFDTixZQUFZLGtCQUFBLEVBQ1osS0FBSyxXQUFBLEVBQ0wsdUJBQXVCLDZCQUFBLEVBQ3ZCLCtCQUErQixxQ0FBQSxFQUMvQiw0QkFBNEIsa0NBQUEsRUFDNUIsVUFBVSxnQkFBQSxFQUNWLFdBQVcsaUJBQUEsRUFDWCxXQUFXLGlCQUFBLEVBQ1gsUUFBUSxjQUFBLEVBQ1IsYUFBYSxtQkFDWSxDQUFDO1FBRTVCLElBQU0sTUFBTSxHQUFHLElBQUksaUNBQWlCLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzlELElBQU0sa0JBQWtCLEdB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QzFCLElBQUksRUFBRSxpQkFBaUI7WUFDdkIsT0FBTyxFQUFFLGlCQUFpQjtZQUMxQixHQUFHLEVBQUUsaUJBQWlCO1lBQ3RCLFFBQVEsRUFBRSxzQkFBc0I7U0FDakMsRUFDRCxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUN4QixFQUFzQixFQUFFLE1BQWMsRUFBRSxRQUE0QixFQUFFLE1BQXlCLEVBQy9GLGtCQUFzQyxFQUFFLFFBQXdCLEVBQ2hFLDRCQUFpRCxFQUFFLFlBQW9DLEVBQ3ZGLFFBQWtDLEVBQUUsV0FBMkI7UUFDakUsSUFBSSw0QkFBNEIsS0FBSyxJQUFJLEVBQUU7WUFDekMsT0FBTyxJQUFJLHNEQUF3QixDQUMvQixFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO1NBQ3pGO2FBQU07WUFDTCxJQUFNLG1CQUFtQixHQUFHLElBQUksMkNBQW1CLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDbEYsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO2dCQUNyQixPQUFPLElBQUksK0RBQTRCLENBQ25DLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUN6RixXQUFXLENBQUMsQ0FBQzthQUNsQjtpQkFBTTtnQkFDTCxPQUFPLElBQUkscUVBQStCLENBQ3RDLE1BQU0sRUFBRSxRQUFRLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO2FBQ3hGO1NBQ0Y7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIFJlYWRvbmx5RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi8uLi9zcmMvbmd0c2MvbG9nZ2luZyc7XG5pbXBvcnQge1BhcnNlZENvbmZpZ3VyYXRpb259IGZyb20gJy4uLy4uL3NyYy9wZXJmb3JtX2NvbXBpbGUnO1xuXG5pbXBvcnQge0NvbW1vbkpzRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2NvbW1vbmpzX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0RlcGVuZGVuY3lSZXNvbHZlcn0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlcic7XG5pbXBvcnQge0R0c0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9kdHNfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RXNtRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2VzbV9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtNb2R1bGVSZXNvbHZlcn0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvbW9kdWxlX3Jlc29sdmVyJztcbmltcG9ydCB7VW1kRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL3VtZF9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci9kaXJlY3Rvcnlfd2Fsa2VyX2VudHJ5X3BvaW50X2ZpbmRlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRDb2xsZWN0b3J9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL2VudHJ5X3BvaW50X2NvbGxlY3Rvcic7XG5pbXBvcnQge0VudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL2ludGVyZmFjZSc7XG5pbXBvcnQge1Byb2dyYW1CYXNlZEVudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL3Byb2dyYW1fYmFzZWRfZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7VGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci90YXJnZXRlZF9lbnRyeV9wb2ludF9maW5kZXInO1xuaW1wb3J0IHtnZXRBbmFseXplRW50cnlQb2ludHNGbn0gZnJvbSAnLi9leGVjdXRpb24vYW5hbHl6ZV9lbnRyeV9wb2ludHMnO1xuaW1wb3J0IHtFeGVjdXRvcn0gZnJvbSAnLi9leGVjdXRpb24vYXBpJztcbmltcG9ydCB7Q2x1c3RlckV4ZWN1dG9yfSBmcm9tICcuL2V4ZWN1dGlvbi9jbHVzdGVyL2V4ZWN1dG9yJztcbmltcG9ydCB7Z2V0Q3JlYXRlQ29tcGlsZUZufSBmcm9tICcuL2V4ZWN1dGlvbi9jcmVhdGVfY29tcGlsZV9mdW5jdGlvbic7XG5pbXBvcnQge1NpbmdsZVByb2Nlc3NFeGVjdXRvckFzeW5jLCBTaW5nbGVQcm9jZXNzRXhlY3V0b3JTeW5jfSBmcm9tICcuL2V4ZWN1dGlvbi9zaW5nbGVfcHJvY2Vzc19leGVjdXRvcic7XG5pbXBvcnQge0NyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lfSBmcm9tICcuL2V4ZWN1dGlvbi90YXNrcy9hcGknO1xuaW1wb3J0IHtjb21wb3NlVGFza0NvbXBsZXRlZENhbGxiYWNrcywgY3JlYXRlTG9nRXJyb3JIYW5kbGVyLCBjcmVhdGVNYXJrQXNQcm9jZXNzZWRIYW5kbGVyLCBjcmVhdGVUaHJvd0Vycm9ySGFuZGxlcn0gZnJvbSAnLi9leGVjdXRpb24vdGFza3MvY29tcGxldGlvbic7XG5pbXBvcnQge0FzeW5jTG9ja2VyfSBmcm9tICcuL2xvY2tpbmcvYXN5bmNfbG9ja2VyJztcbmltcG9ydCB7TG9ja0ZpbGVXaXRoQ2hpbGRQcm9jZXNzfSBmcm9tICcuL2xvY2tpbmcvbG9ja19maWxlX3dpdGhfY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQge1N5bmNMb2NrZXJ9IGZyb20gJy4vbG9ja2luZy9zeW5jX2xvY2tlcic7XG5pbXBvcnQge0FzeW5jTmdjY09wdGlvbnMsIGdldE1heE51bWJlck9mV29ya2VycywgZ2V0U2hhcmVkU2V0dXAsIFN5bmNOZ2NjT3B0aW9uc30gZnJvbSAnLi9uZ2NjX29wdGlvbnMnO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbn0gZnJvbSAnLi9wYWNrYWdlcy9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTfSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7RW50cnlQb2ludE1hbmlmZXN0LCBJbnZhbGlkYXRpbmdFbnRyeVBvaW50TWFuaWZlc3R9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfbWFuaWZlc3QnO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4vcGF0aF9tYXBwaW5ncyc7XG5pbXBvcnQge0ZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9maWxlX3dyaXRlcic7XG5pbXBvcnQge0RpcmVjdFBhY2thZ2VKc29uVXBkYXRlciwgUGFja2FnZUpzb25VcGRhdGVyfSBmcm9tICcuL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnktcG9pbnQgaW50byBuZ2NjIChhTkd1bGFyIENvbXBhdGliaWxpdHkgQ29tcGlsZXIpLlxuICpcbiAqIFlvdSBjYW4gY2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHByb2Nlc3Mgb25lIG9yIG1vcmUgbnBtIHBhY2thZ2VzLCB0byBlbnN1cmVcbiAqIHRoYXQgdGhleSBhcmUgY29tcGF0aWJsZSB3aXRoIHRoZSBpdnkgY29tcGlsZXIgKG5ndHNjKS5cbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyBUaGUgb3B0aW9ucyB0ZWxsaW5nIG5nY2Mgd2hhdCB0byBjb21waWxlIGFuZCBob3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYzxUIGV4dGVuZHMgQXN5bmNOZ2NjT3B0aW9uc3xTeW5jTmdjY09wdGlvbnM+KG9wdGlvbnM6IFQpOlxuICAgIFQgZXh0ZW5kcyBBc3luY05nY2NPcHRpb25zID8gUHJvbWlzZTx2b2lkPjogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhvcHRpb25zOiBBc3luY05nY2NPcHRpb25zfFN5bmNOZ2NjT3B0aW9ucyk6IHZvaWR8UHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHtcbiAgICBiYXNlUGF0aCxcbiAgICB0YXJnZXRFbnRyeVBvaW50UGF0aCxcbiAgICBwcm9wZXJ0aWVzVG9Db25zaWRlcixcbiAgICB0eXBpbmdzT25seSxcbiAgICBjb21waWxlQWxsRm9ybWF0cyxcbiAgICBsb2dnZXIsXG4gICAgcGF0aE1hcHBpbmdzLFxuICAgIGFzeW5jLFxuICAgIGVycm9yT25GYWlsZWRFbnRyeVBvaW50LFxuICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgaW52YWxpZGF0ZUVudHJ5UG9pbnRNYW5pZmVzdCxcbiAgICBmaWxlU3lzdGVtLFxuICAgIGFic0Jhc2VQYXRoLFxuICAgIHByb2plY3RQYXRoLFxuICAgIHRzQ29uZmlnLFxuICAgIGdldEZpbGVXcml0ZXIsXG4gIH0gPSBnZXRTaGFyZWRTZXR1cChvcHRpb25zKTtcblxuICBjb25zdCBjb25maWcgPSBuZXcgTmdjY0NvbmZpZ3VyYXRpb24oZmlsZVN5c3RlbSwgcHJvamVjdFBhdGgpO1xuICBjb25zdCBkZXBlbmRlbmN5UmVzb2x2ZXIgPSBnZXREZXBlbmRlbmN5UmVzb2x2ZXIoZmlsZVN5c3RlbSwgbG9nZ2VyLCBjb25maWcsIHBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0IGVudHJ5UG9pbnRNYW5pZmVzdCA9IGludmFsaWRhdGVFbnRyeVBvaW50TWFuaWZlc3QgP1xuICAgICAgbmV3IEludmFsaWRhdGluZ0VudHJ5UG9pbnRNYW5pZmVzdChmaWxlU3lzdGVtLCBjb25maWcsIGxvZ2dlcikgOlxuICAgICAgbmV3IEVudHJ5UG9pbnRNYW5pZmVzdChmaWxlU3lzdGVtLCBjb25maWcsIGxvZ2dlcik7XG5cbiAgLy8gQmFpbCBvdXQgZWFybHkgaWYgdGhlIHdvcmsgaXMgYWxyZWFkeSBkb25lLlxuICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciA9IGVuc3VyZVN1cHBvcnRlZFByb3BlcnRpZXMocHJvcGVydGllc1RvQ29uc2lkZXIpO1xuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID0gdGFyZ2V0RW50cnlQb2ludFBhdGggIT09IHVuZGVmaW5lZCA/XG4gICAgICBmaWxlU3lzdGVtLnJlc29sdmUoYmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoKSA6XG4gICAgICBudWxsO1xuICBjb25zdCBmaW5kZXIgPSBnZXRFbnRyeVBvaW50RmluZGVyKFxuICAgICAgZmlsZVN5c3RlbSwgbG9nZ2VyLCBkZXBlbmRlbmN5UmVzb2x2ZXIsIGNvbmZpZywgZW50cnlQb2ludE1hbmlmZXN0LCBhYnNCYXNlUGF0aCxcbiAgICAgIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHBhdGhNYXBwaW5ncyxcbiAgICAgIG9wdGlvbnMuZmluZEVudHJ5UG9pbnRzRnJvbVRzQ29uZmlnUHJvZ3JhbSA/IHRzQ29uZmlnIDogbnVsbCwgcHJvamVjdFBhdGgpO1xuICBpZiAoZmluZGVyIGluc3RhbmNlb2YgVGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyICYmXG4gICAgICAhZmluZGVyLnRhcmdldE5lZWRzUHJvY2Vzc2luZ09yQ2xlYW5pbmcoc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIsIGNvbXBpbGVBbGxGb3JtYXRzKSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnVGhlIHRhcmdldCBlbnRyeS1wb2ludCBoYXMgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCcpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIERldGVybWluZSB0aGUgbnVtYmVyIG9mIHdvcmtlcnMgdG8gdXNlIGFuZCB3aGV0aGVyIG5nY2Mgc2hvdWxkIHJ1biBpbiBwYXJhbGxlbC5cbiAgY29uc3Qgd29ya2VyQ291bnQgPSBhc3luYyA/IGdldE1heE51bWJlck9mV29ya2VycygpIDogMTtcbiAgY29uc3QgaW5QYXJhbGxlbCA9IHdvcmtlckNvdW50ID4gMTtcblxuICBjb25zdCBhbmFseXplRW50cnlQb2ludHMgPSBnZXRBbmFseXplRW50cnlQb2ludHNGbihcbiAgICAgIGxvZ2dlciwgZmluZGVyLCBmaWxlU3lzdGVtLCBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciwgdHlwaW5nc09ubHksIGNvbXBpbGVBbGxGb3JtYXRzLFxuICAgICAgcHJvcGVydGllc1RvQ29uc2lkZXIsIGluUGFyYWxsZWwpO1xuXG4gIC8vIENyZWF0ZSBhbiB1cGRhdGVyIHRoYXQgd2lsbCBhY3R1YWxseSB3cml0ZSB0byBkaXNrLlxuICBjb25zdCBwa2dKc29uVXBkYXRlciA9IG5ldyBEaXJlY3RQYWNrYWdlSnNvblVwZGF0ZXIoZmlsZVN5c3RlbSk7XG4gIGNvbnN0IGZpbGVXcml0ZXIgPSBnZXRGaWxlV3JpdGVyKHBrZ0pzb25VcGRhdGVyKTtcblxuICAvLyBUaGUgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIHRoZSBgY29tcGlsZSgpYCBmdW5jdGlvbi5cbiAgY29uc3QgY3JlYXRlQ29tcGlsZUZuID0gZ2V0Q3JlYXRlQ29tcGlsZUZuKFxuICAgICAgZmlsZVN5c3RlbSwgbG9nZ2VyLCBmaWxlV3JpdGVyLCBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0LCB0c0NvbmZpZywgcGF0aE1hcHBpbmdzKTtcblxuICAvLyBUaGUgZXhlY3V0b3IgZm9yIGFjdHVhbGx5IHBsYW5uaW5nIGFuZCBnZXR0aW5nIHRoZSB3b3JrIGRvbmUuXG4gIGNvbnN0IGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayA9XG4gICAgICBnZXRDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2socGtnSnNvblVwZGF0ZXIsIGVycm9yT25GYWlsZWRFbnRyeVBvaW50LCBsb2dnZXIsIGZpbGVTeXN0ZW0pO1xuICBjb25zdCBleGVjdXRvciA9IGdldEV4ZWN1dG9yKFxuICAgICAgYXN5bmMsIHdvcmtlckNvdW50LCBsb2dnZXIsIGZpbGVXcml0ZXIsIHBrZ0pzb25VcGRhdGVyLCBmaWxlU3lzdGVtLCBjb25maWcsXG4gICAgICBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spO1xuXG4gIHJldHVybiBleGVjdXRvci5leGVjdXRlKGFuYWx5emVFbnRyeVBvaW50cywgY3JlYXRlQ29tcGlsZUZuKTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlU3VwcG9ydGVkUHJvcGVydGllcyhwcm9wZXJ0aWVzOiBzdHJpbmdbXSk6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSB7XG4gIC8vIFNob3J0LWNpcmN1aXQgdGhlIGNhc2Ugd2hlcmUgYHByb3BlcnRpZXNgIGhhcyBmYWxsZW4gYmFjayB0byB0aGUgZGVmYXVsdCB2YWx1ZTpcbiAgLy8gYFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU2BcbiAgaWYgKHByb3BlcnRpZXMgPT09IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykgcmV0dXJuIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUztcblxuICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10gPSBbXTtcblxuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllcyBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5W10pIHtcbiAgICBpZiAoU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLmluZGV4T2YocHJvcCkgIT09IC0xKSB7XG4gICAgICBzdXBwb3J0ZWRQcm9wZXJ0aWVzLnB1c2gocHJvcCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN1cHBvcnRlZFByb3BlcnRpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgTm8gc3VwcG9ydGVkIGZvcm1hdCBwcm9wZXJ0eSB0byBjb25zaWRlciBhbW9uZyBbJHtwcm9wZXJ0aWVzLmpvaW4oJywgJyl9XS4gYCArXG4gICAgICAgIGBTdXBwb3J0ZWQgcHJvcGVydGllczogJHtTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMuam9pbignLCAnKX1gKTtcbiAgfVxuXG4gIHJldHVybiBzdXBwb3J0ZWRQcm9wZXJ0aWVzO1xufVxuXG5mdW5jdGlvbiBnZXRDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2soXG4gICAgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlciwgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQ6IGJvb2xlYW4sIGxvZ2dlcjogTG9nZ2VyLFxuICAgIGZpbGVTeXN0ZW06IFJlYWRvbmx5RmlsZVN5c3RlbSk6IENyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayB7XG4gIHJldHVybiB0YXNrUXVldWUgPT4gY29tcG9zZVRhc2tDb21wbGV0ZWRDYWxsYmFja3Moe1xuICAgICAgICAgICBbVGFza1Byb2Nlc3NpbmdPdXRjb21lLlByb2Nlc3NlZF06XG4gICAgICAgICAgICAgICBjcmVhdGVNYXJrQXNQcm9jZXNzZWRIYW5kbGVyKGZpbGVTeXN0ZW0sIHBrZ0pzb25VcGRhdGVyKSxcbiAgICAgICAgICAgW1Rhc2tQcm9jZXNzaW5nT3V0Y29tZS5GYWlsZWRdOlxuICAgICAgICAgICAgICAgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQgPyBjcmVhdGVUaHJvd0Vycm9ySGFuZGxlcihmaWxlU3lzdGVtKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUxvZ0Vycm9ySGFuZGxlcihsb2dnZXIsIGZpbGVTeXN0ZW0sIHRhc2tRdWV1ZSksXG4gICAgICAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0RXhlY3V0b3IoXG4gICAgYXN5bmM6IGJvb2xlYW4sIHdvcmtlckNvdW50OiBudW1iZXIsIGxvZ2dlcjogTG9nZ2VyLCBmaWxlV3JpdGVyOiBGaWxlV3JpdGVyLFxuICAgIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsIGZpbGVTeXN0ZW06IEZpbGVTeXN0ZW0sIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sXG4gICAgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrOiBDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spOiBFeGVjdXRvciB7XG4gIGNvbnN0IGxvY2tGaWxlID0gbmV3IExvY2tGaWxlV2l0aENoaWxkUHJvY2VzcyhmaWxlU3lzdGVtLCBsb2dnZXIpO1xuICBpZiAoYXN5bmMpIHtcbiAgICAvLyBFeGVjdXRlIGFzeW5jaHJvbm91c2x5IChlaXRoZXIgc2VyaWFsbHkgb3IgaW4gcGFyYWxsZWwpXG4gICAgY29uc3Qge3JldHJ5QXR0ZW1wdHMsIHJldHJ5RGVsYXl9ID0gY29uZmlnLmdldExvY2tpbmdDb25maWcoKTtcbiAgICBjb25zdCBsb2NrZXIgPSBuZXcgQXN5bmNMb2NrZXIobG9ja0ZpbGUsIGxvZ2dlciwgcmV0cnlEZWxheSwgcmV0cnlBdHRlbXB0cyk7XG4gICAgaWYgKHdvcmtlckNvdW50ID4gMSkge1xuICAgICAgLy8gRXhlY3V0ZSBpbiBwYXJhbGxlbC5cbiAgICAgIHJldHVybiBuZXcgQ2x1c3RlckV4ZWN1dG9yKFxuICAgICAgICAgIHdvcmtlckNvdW50LCBmaWxlU3lzdGVtLCBsb2dnZXIsIGZpbGVXcml0ZXIsIHBrZ0pzb25VcGRhdGVyLCBsb2NrZXIsXG4gICAgICAgICAgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRXhlY3V0ZSBzZXJpYWxseSwgb24gYSBzaW5nbGUgdGhyZWFkIChhc3luYykuXG4gICAgICByZXR1cm4gbmV3IFNpbmdsZVByb2Nlc3NFeGVjdXRvckFzeW5jKGxvZ2dlciwgbG9ja2VyLCBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBFeGVjdXRlIHNlcmlhbGx5LCBvbiBhIHNpbmdsZSB0aHJlYWQgKHN5bmMpLlxuICAgIHJldHVybiBuZXcgU2luZ2xlUHJvY2Vzc0V4ZWN1dG9yU3luYyhcbiAgICAgICAgbG9nZ2VyLCBuZXcgU3luY0xvY2tlcihsb2NrRmlsZSksIGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RGVwZW5kZW5jeVJlc29sdmVyKFxuICAgIGZpbGVTeXN0ZW06IFJlYWRvbmx5RmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sXG4gICAgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3N8dW5kZWZpbmVkKTogRGVwZW5kZW5jeVJlc29sdmVyIHtcbiAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIoZmlsZVN5c3RlbSwgcGF0aE1hcHBpbmdzKTtcbiAgY29uc3QgZXNtRGVwZW5kZW5jeUhvc3QgPSBuZXcgRXNtRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCB1bWREZXBlbmRlbmN5SG9zdCA9IG5ldyBVbWREZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IGNvbW1vbkpzRGVwZW5kZW5jeUhvc3QgPSBuZXcgQ29tbW9uSnNEZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IGR0c0RlcGVuZGVuY3lIb3N0ID0gbmV3IER0c0RlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIHBhdGhNYXBwaW5ncyk7XG4gIHJldHVybiBuZXcgRGVwZW5kZW5jeVJlc29sdmVyKFxuICAgICAgZmlsZVN5c3RlbSwgbG9nZ2VyLCBjb25maWcsIHtcbiAgICAgICAgZXNtNTogZXNtRGVwZW5kZW5jeUhvc3QsXG4gICAgICAgIGVzbTIwMTU6IGVzbURlcGVuZGVuY3lIb3N0LFxuICAgICAgICB1bWQ6IHVtZERlcGVuZGVuY3lIb3N0LFxuICAgICAgICBjb21tb25qczogY29tbW9uSnNEZXBlbmRlbmN5SG9zdFxuICAgICAgfSxcbiAgICAgIGR0c0RlcGVuZGVuY3lIb3N0KTtcbn1cblxuZnVuY3Rpb24gZ2V0RW50cnlQb2ludEZpbmRlcihcbiAgICBmczogUmVhZG9ubHlGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlciwgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbixcbiAgICBlbnRyeVBvaW50TWFuaWZlc3Q6IEVudHJ5UG9pbnRNYW5pZmVzdCwgYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRofG51bGwsIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzfHVuZGVmaW5lZCxcbiAgICB0c0NvbmZpZzogUGFyc2VkQ29uZmlndXJhdGlvbnxudWxsLCBwcm9qZWN0UGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50RmluZGVyIHtcbiAgaWYgKGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGggIT09IG51bGwpIHtcbiAgICByZXR1cm4gbmV3IFRhcmdldGVkRW50cnlQb2ludEZpbmRlcihcbiAgICAgICAgZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgYmFzZVBhdGgsIHBhdGhNYXBwaW5ncywgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZW50cnlQb2ludENvbGxlY3RvciA9IG5ldyBFbnRyeVBvaW50Q29sbGVjdG9yKGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIpO1xuICAgIGlmICh0c0NvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9ncmFtQmFzZWRFbnRyeVBvaW50RmluZGVyKFxuICAgICAgICAgIGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGVudHJ5UG9pbnRDb2xsZWN0b3IsIGVudHJ5UG9pbnRNYW5pZmVzdCwgYmFzZVBhdGgsIHRzQ29uZmlnLFxuICAgICAgICAgIHByb2plY3RQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5ldyBEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyKFxuICAgICAgICAgIGxvZ2dlciwgcmVzb2x2ZXIsIGVudHJ5UG9pbnRDb2xsZWN0b3IsIGVudHJ5UG9pbnRNYW5pZmVzdCwgYmFzZVBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gICAgfVxuICB9XG59XG4iXX0=