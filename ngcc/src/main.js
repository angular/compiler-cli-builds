/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "os", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/dts_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", "@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder", "@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder", "@angular/compiler-cli/ngcc/src/execution/analyze_entry_points", "@angular/compiler-cli/ngcc/src/execution/cluster/executor", "@angular/compiler-cli/ngcc/src/execution/create_compile_function", "@angular/compiler-cli/ngcc/src/execution/single_process_executor", "@angular/compiler-cli/ngcc/src/execution/tasks/completion", "@angular/compiler-cli/ngcc/src/locking/async_locker", "@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/index", "@angular/compiler-cli/ngcc/src/locking/sync_locker", "@angular/compiler-cli/ngcc/src/ngcc_options", "@angular/compiler-cli/ngcc/src/packages/configuration", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_manifest", "@angular/compiler-cli/ngcc/src/writing/package_json_updater"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /// <reference types="node" />
    var os = require("os");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var commonjs_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host");
    var dependency_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver");
    var dts_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dts_dependency_host");
    var esm_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    var umd_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host");
    var directory_walker_entry_point_finder_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder");
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
        var _a = ngcc_options_1.getSharedSetup(options), basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, propertiesToConsider = _a.propertiesToConsider, compileAllFormats = _a.compileAllFormats, logger = _a.logger, pathMappings = _a.pathMappings, async = _a.async, errorOnFailedEntryPoint = _a.errorOnFailedEntryPoint, enableI18nLegacyMessageIdFormat = _a.enableI18nLegacyMessageIdFormat, invalidateEntryPointManifest = _a.invalidateEntryPointManifest, fileSystem = _a.fileSystem, absBasePath = _a.absBasePath, projectPath = _a.projectPath, tsConfig = _a.tsConfig, getFileWriter = _a.getFileWriter;
        var config = new configuration_1.NgccConfiguration(fileSystem, projectPath);
        var dependencyResolver = getDependencyResolver(fileSystem, logger, config, pathMappings);
        var entryPointManifest = invalidateEntryPointManifest ?
            new entry_point_manifest_1.InvalidatingEntryPointManifest(fileSystem, config, logger) :
            new entry_point_manifest_1.EntryPointManifest(fileSystem, config, logger);
        // Bail out early if the work is already done.
        var supportedPropertiesToConsider = ensureSupportedProperties(propertiesToConsider);
        var absoluteTargetEntryPointPath = targetEntryPointPath !== undefined ? file_system_1.resolve(basePath, targetEntryPointPath) : null;
        var finder = getEntryPointFinder(fileSystem, logger, dependencyResolver, config, entryPointManifest, absBasePath, absoluteTargetEntryPointPath, pathMappings);
        if (finder instanceof targeted_entry_point_finder_1.TargetedEntryPointFinder &&
            !finder.targetNeedsProcessingOrCleaning(supportedPropertiesToConsider, compileAllFormats)) {
            logger.debug('The target entry-point has already been processed');
            return;
        }
        // Execute in parallel, if async execution is acceptable and there are more than 2 CPU cores.
        // (One CPU core is always reserved for the master process and we need at least 2 worker processes
        // in order to run tasks in parallel.)
        var inParallel = async && (os.cpus().length > 2);
        var analyzeEntryPoints = analyze_entry_points_1.getAnalyzeEntryPointsFn(logger, finder, fileSystem, supportedPropertiesToConsider, compileAllFormats, propertiesToConsider, inParallel);
        // Create an updater that will actually write to disk.
        var pkgJsonUpdater = new package_json_updater_1.DirectPackageJsonUpdater(fileSystem);
        var fileWriter = getFileWriter(pkgJsonUpdater);
        // The function for creating the `compile()` function.
        var createCompileFn = create_compile_function_1.getCreateCompileFn(fileSystem, logger, fileWriter, enableI18nLegacyMessageIdFormat, tsConfig, pathMappings);
        // The executor for actually planning and getting the work done.
        var createTaskCompletedCallback = getCreateTaskCompletedCallback(pkgJsonUpdater, errorOnFailedEntryPoint, logger, fileSystem);
        var executor = getExecutor(async, inParallel, logger, fileWriter, pkgJsonUpdater, fileSystem, config, createTaskCompletedCallback);
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
            for (var _b = tslib_1.__values(properties), _c = _b.next(); !_c.done; _c = _b.next()) {
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
            return completion_1.composeTaskCompletedCallbacks((_a = {},
                _a[0 /* Processed */] = completion_1.createMarkAsProcessedHandler(pkgJsonUpdater),
                _a[1 /* Failed */] = errorOnFailedEntryPoint ? completion_1.createThrowErrorHandler(fileSystem) :
                    completion_1.createLogErrorHandler(logger, fileSystem, taskQueue),
                _a));
        };
    }
    function getExecutor(async, inParallel, logger, fileWriter, pkgJsonUpdater, fileSystem, config, createTaskCompletedCallback) {
        var lockFile = new lock_file_with_child_process_1.LockFileWithChildProcess(fileSystem, logger);
        if (async) {
            // Execute asynchronously (either serially or in parallel)
            var _a = config.getLockingConfig(), retryAttempts = _a.retryAttempts, retryDelay = _a.retryDelay;
            var locker = new async_locker_1.AsyncLocker(lockFile, logger, retryDelay, retryAttempts);
            if (inParallel) {
                // Execute in parallel. Use up to 8 CPU cores for workers, always reserving one for master.
                var workerCount = Math.min(8, os.cpus().length - 1);
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
    function getEntryPointFinder(fs, logger, resolver, config, entryPointManifest, basePath, absoluteTargetEntryPointPath, pathMappings) {
        if (absoluteTargetEntryPointPath !== null) {
            return new targeted_entry_point_finder_1.TargetedEntryPointFinder(fs, config, logger, resolver, basePath, absoluteTargetEntryPointPath, pathMappings);
        }
        else {
            return new directory_walker_entry_point_finder_1.DirectoryWalkerEntryPointFinder(fs, config, logger, resolver, entryPointManifest, basePath, pathMappings);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhCQUE4QjtJQUU5Qix1QkFBeUI7SUFFekIsMkVBQWdGO0lBRWhGLGlIQUErRTtJQUMvRSx1R0FBc0U7SUFDdEUsdUdBQXFFO0lBQ3JFLHVHQUFxRTtJQUNyRSwrRkFBOEQ7SUFDOUQsdUdBQXFFO0lBQ3JFLDZJQUF5RztJQUV6Ryw2SEFBMEY7SUFDMUYsc0dBQXlFO0lBRXpFLHNGQUE2RDtJQUM3RCw0R0FBdUU7SUFDdkUsNEdBQTBHO0lBRTFHLHdGQUF5SjtJQUN6SixvRkFBbUQ7SUFDbkQsMEhBQWdGO0lBQ2hGLGtGQUFpRDtJQUVqRCw0RUFBOEY7SUFDOUYsdUZBQTJEO0lBQzNELG1GQUEyRjtJQUMzRixxR0FBbUc7SUFHbkcsb0dBQTRGO0lBWTVGLFNBQWdCLFFBQVEsQ0FBQyxPQUFvQjtRQUNyQyxJQUFBLDJDQWdCcUIsRUFmekIsc0JBQVEsRUFDUiw4Q0FBb0IsRUFDcEIsOENBQW9CLEVBQ3BCLHdDQUFpQixFQUNqQixrQkFBTSxFQUNOLDhCQUFZLEVBQ1osZ0JBQUssRUFDTCxvREFBdUIsRUFDdkIsb0VBQStCLEVBQy9CLDhEQUE0QixFQUM1QiwwQkFBVSxFQUNWLDRCQUFXLEVBQ1gsNEJBQVcsRUFDWCxzQkFBUSxFQUNSLGdDQUN5QixDQUFDO1FBRTVCLElBQU0sTUFBTSxHQUFHLElBQUksaUNBQWlCLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzlELElBQU0sa0JBQWtCLEdBQUcscUJBQXFCLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDM0YsSUFBTSxrQkFBa0IsR0FBRyw0QkFBNEIsQ0FBQyxDQUFDO1lBQ3JE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LEVBQ3ZGLGtCQUFzQyxFQUFFLFFBQXdCLEVBQ2hFLDRCQUFpRCxFQUNqRCxZQUFvQztRQUN0QyxJQUFJLDRCQUE0QixLQUFLLElBQUksRUFBRTtZQUN6QyxPQUFPLElBQUksc0RBQXdCLENBQy9CLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsNEJBQTRCLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDekY7YUFBTTtZQUNMLE9BQU8sSUFBSSxxRUFBK0IsQ0FDdEMsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztTQUMvRTtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHtDb21tb25Kc0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9jb21tb25qc19kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXJ9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtEdHNEZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZHRzX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0VzbURlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9lc21fZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4vZGVwZW5kZW5jaWVzL21vZHVsZV9yZXNvbHZlcic7XG5pbXBvcnQge1VtZERlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy91bWRfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGlyZWN0b3J5V2Fsa2VyRW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9lbnRyeV9wb2ludF9maW5kZXIvZGlyZWN0b3J5X3dhbGtlcl9lbnRyeV9wb2ludF9maW5kZXInO1xuaW1wb3J0IHtFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci9pbnRlcmZhY2UnO1xuaW1wb3J0IHtUYXJnZXRlZEVudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL3RhcmdldGVkX2VudHJ5X3BvaW50X2ZpbmRlcic7XG5pbXBvcnQge2dldEFuYWx5emVFbnRyeVBvaW50c0ZufSBmcm9tICcuL2V4ZWN1dGlvbi9hbmFseXplX2VudHJ5X3BvaW50cyc7XG5pbXBvcnQge0V4ZWN1dG9yfSBmcm9tICcuL2V4ZWN1dGlvbi9hcGknO1xuaW1wb3J0IHtDbHVzdGVyRXhlY3V0b3J9IGZyb20gJy4vZXhlY3V0aW9uL2NsdXN0ZXIvZXhlY3V0b3InO1xuaW1wb3J0IHtnZXRDcmVhdGVDb21waWxlRm59IGZyb20gJy4vZXhlY3V0aW9uL2NyZWF0ZV9jb21waWxlX2Z1bmN0aW9uJztcbmltcG9ydCB7U2luZ2xlUHJvY2Vzc0V4ZWN1dG9yQXN5bmMsIFNpbmdsZVByb2Nlc3NFeGVjdXRvclN5bmN9IGZyb20gJy4vZXhlY3V0aW9uL3NpbmdsZV9wcm9jZXNzX2V4ZWN1dG9yJztcbmltcG9ydCB7Q3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWV9IGZyb20gJy4vZXhlY3V0aW9uL3Rhc2tzL2FwaSc7XG5pbXBvcnQge2NvbXBvc2VUYXNrQ29tcGxldGVkQ2FsbGJhY2tzLCBjcmVhdGVMb2dFcnJvckhhbmRsZXIsIGNyZWF0ZU1hcmtBc1Byb2Nlc3NlZEhhbmRsZXIsIGNyZWF0ZVRocm93RXJyb3JIYW5kbGVyfSBmcm9tICcuL2V4ZWN1dGlvbi90YXNrcy9jb21wbGV0aW9uJztcbmltcG9ydCB7QXN5bmNMb2NrZXJ9IGZyb20gJy4vbG9ja2luZy9hc3luY19sb2NrZXInO1xuaW1wb3J0IHtMb2NrRmlsZVdpdGhDaGlsZFByb2Nlc3N9IGZyb20gJy4vbG9ja2luZy9sb2NrX2ZpbGVfd2l0aF9jaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7U3luY0xvY2tlcn0gZnJvbSAnLi9sb2NraW5nL3N5bmNfbG9ja2VyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7QXN5bmNOZ2NjT3B0aW9ucywgZ2V0U2hhcmVkU2V0dXAsIE5nY2NPcHRpb25zLCBTeW5jTmdjY09wdGlvbnN9IGZyb20gJy4vbmdjY19vcHRpb25zJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb259IGZyb20gJy4vcGFja2FnZXMvY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnRKc29uUHJvcGVydHksIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU30gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge0VudHJ5UG9pbnRNYW5pZmVzdCwgSW52YWxpZGF0aW5nRW50cnlQb2ludE1hbmlmZXN0fSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50X21hbmlmZXN0JztcbmltcG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuL3BhdGhfbWFwcGluZ3MnO1xuaW1wb3J0IHtGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuaW1wb3J0IHtEaXJlY3RQYWNrYWdlSnNvblVwZGF0ZXIsIFBhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi93cml0aW5nL3BhY2thZ2VfanNvbl91cGRhdGVyJztcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5LXBvaW50IGludG8gbmdjYyAoYU5HdWxhciBDb21wYXRpYmlsaXR5IENvbXBpbGVyKS5cbiAqXG4gKiBZb3UgY2FuIGNhbGwgdGhpcyBmdW5jdGlvbiB0byBwcm9jZXNzIG9uZSBvciBtb3JlIG5wbSBwYWNrYWdlcywgdG8gZW5zdXJlXG4gKiB0aGF0IHRoZXkgYXJlIGNvbXBhdGlibGUgd2l0aCB0aGUgaXZ5IGNvbXBpbGVyIChuZ3RzYykuXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgVGhlIG9wdGlvbnMgdGVsbGluZyBuZ2NjIHdoYXQgdG8gY29tcGlsZSBhbmQgaG93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2Mob3B0aW9uczogQXN5bmNOZ2NjT3B0aW9ucyk6IFByb21pc2U8dm9pZD47XG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2Mob3B0aW9uczogU3luY05nY2NPcHRpb25zKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhvcHRpb25zOiBOZ2NjT3B0aW9ucyk6IHZvaWR8UHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHtcbiAgICBiYXNlUGF0aCxcbiAgICB0YXJnZXRFbnRyeVBvaW50UGF0aCxcbiAgICBwcm9wZXJ0aWVzVG9Db25zaWRlcixcbiAgICBjb21waWxlQWxsRm9ybWF0cyxcbiAgICBsb2dnZXIsXG4gICAgcGF0aE1hcHBpbmdzLFxuICAgIGFzeW5jLFxuICAgIGVycm9yT25GYWlsZWRFbnRyeVBvaW50LFxuICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgaW52YWxpZGF0ZUVudHJ5UG9pbnRNYW5pZmVzdCxcbiAgICBmaWxlU3lzdGVtLFxuICAgIGFic0Jhc2VQYXRoLFxuICAgIHByb2plY3RQYXRoLFxuICAgIHRzQ29uZmlnLFxuICAgIGdldEZpbGVXcml0ZXIsXG4gIH0gPSBnZXRTaGFyZWRTZXR1cChvcHRpb25zKTtcblxuICBjb25zdCBjb25maWcgPSBuZXcgTmdjY0NvbmZpZ3VyYXRpb24oZmlsZVN5c3RlbSwgcHJvamVjdFBhdGgpO1xuICBjb25zdCBkZXBlbmRlbmN5UmVzb2x2ZXIgPSBnZXREZXBlbmRlbmN5UmVzb2x2ZXIoZmlsZVN5c3RlbSwgbG9nZ2VyLCBjb25maWcsIHBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0IGVudHJ5UG9pbnRNYW5pZmVzdCA9IGludmFsaWRhdGVFbnRyeVBvaW50TWFuaWZlc3QgP1xuICAgICAgbmV3IEludmFsaWRhdGluZ0VudHJ5UG9pbnRNYW5pZmVzdChmaWxlU3lzdGVtLCBjb25maWcsIGxvZ2dlcikgOlxuICAgICAgbmV3IEVudHJ5UG9pbnRNYW5pZmVzdChmaWxlU3lzdGVtLCBjb25maWcsIGxvZ2dlcik7XG5cbiAgLy8gQmFpbCBvdXQgZWFybHkgaWYgdGhlIHdvcmsgaXMgYWxyZWFkeSBkb25lLlxuICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciA9IGVuc3VyZVN1cHBvcnRlZFByb3BlcnRpZXMocHJvcGVydGllc1RvQ29uc2lkZXIpO1xuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID1cbiAgICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoICE9PSB1bmRlZmluZWQgPyByZXNvbHZlKGJhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCkgOiBudWxsO1xuICBjb25zdCBmaW5kZXIgPSBnZXRFbnRyeVBvaW50RmluZGVyKFxuICAgICAgZmlsZVN5c3RlbSwgbG9nZ2VyLCBkZXBlbmRlbmN5UmVzb2x2ZXIsIGNvbmZpZywgZW50cnlQb2ludE1hbmlmZXN0LCBhYnNCYXNlUGF0aCxcbiAgICAgIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIGlmIChmaW5kZXIgaW5zdGFuY2VvZiBUYXJnZXRlZEVudHJ5UG9pbnRGaW5kZXIgJiZcbiAgICAgICFmaW5kZXIudGFyZ2V0TmVlZHNQcm9jZXNzaW5nT3JDbGVhbmluZyhzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdUaGUgdGFyZ2V0IGVudHJ5LXBvaW50IGhhcyBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRXhlY3V0ZSBpbiBwYXJhbGxlbCwgaWYgYXN5bmMgZXhlY3V0aW9uIGlzIGFjY2VwdGFibGUgYW5kIHRoZXJlIGFyZSBtb3JlIHRoYW4gMiBDUFUgY29yZXMuXG4gIC8vIChPbmUgQ1BVIGNvcmUgaXMgYWx3YXlzIHJlc2VydmVkIGZvciB0aGUgbWFzdGVyIHByb2Nlc3MgYW5kIHdlIG5lZWQgYXQgbGVhc3QgMiB3b3JrZXIgcHJvY2Vzc2VzXG4gIC8vIGluIG9yZGVyIHRvIHJ1biB0YXNrcyBpbiBwYXJhbGxlbC4pXG4gIGNvbnN0IGluUGFyYWxsZWwgPSBhc3luYyAmJiAob3MuY3B1cygpLmxlbmd0aCA+IDIpO1xuXG4gIGNvbnN0IGFuYWx5emVFbnRyeVBvaW50cyA9IGdldEFuYWx5emVFbnRyeVBvaW50c0ZuKFxuICAgICAgbG9nZ2VyLCBmaW5kZXIsIGZpbGVTeXN0ZW0sIHN1cHBvcnRlZFByb3BlcnRpZXNUb0NvbnNpZGVyLCBjb21waWxlQWxsRm9ybWF0cyxcbiAgICAgIHByb3BlcnRpZXNUb0NvbnNpZGVyLCBpblBhcmFsbGVsKTtcblxuICAvLyBDcmVhdGUgYW4gdXBkYXRlciB0aGF0IHdpbGwgYWN0dWFsbHkgd3JpdGUgdG8gZGlzay5cbiAgY29uc3QgcGtnSnNvblVwZGF0ZXIgPSBuZXcgRGlyZWN0UGFja2FnZUpzb25VcGRhdGVyKGZpbGVTeXN0ZW0pO1xuICBjb25zdCBmaWxlV3JpdGVyID0gZ2V0RmlsZVdyaXRlcihwa2dKc29uVXBkYXRlcik7XG5cbiAgLy8gVGhlIGZ1bmN0aW9uIGZvciBjcmVhdGluZyB0aGUgYGNvbXBpbGUoKWAgZnVuY3Rpb24uXG4gIGNvbnN0IGNyZWF0ZUNvbXBpbGVGbiA9IGdldENyZWF0ZUNvbXBpbGVGbihcbiAgICAgIGZpbGVTeXN0ZW0sIGxvZ2dlciwgZmlsZVdyaXRlciwgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCwgdHNDb25maWcsIHBhdGhNYXBwaW5ncyk7XG5cbiAgLy8gVGhlIGV4ZWN1dG9yIGZvciBhY3R1YWxseSBwbGFubmluZyBhbmQgZ2V0dGluZyB0aGUgd29yayBkb25lLlxuICBjb25zdCBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2sgPVxuICAgICAgZ2V0Q3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKHBrZ0pzb25VcGRhdGVyLCBlcnJvck9uRmFpbGVkRW50cnlQb2ludCwgbG9nZ2VyLCBmaWxlU3lzdGVtKTtcbiAgY29uc3QgZXhlY3V0b3IgPSBnZXRFeGVjdXRvcihcbiAgICAgIGFzeW5jLCBpblBhcmFsbGVsLCBsb2dnZXIsIGZpbGVXcml0ZXIsIHBrZ0pzb25VcGRhdGVyLCBmaWxlU3lzdGVtLCBjb25maWcsXG4gICAgICBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spO1xuXG4gIHJldHVybiBleGVjdXRvci5leGVjdXRlKGFuYWx5emVFbnRyeVBvaW50cywgY3JlYXRlQ29tcGlsZUZuKTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlU3VwcG9ydGVkUHJvcGVydGllcyhwcm9wZXJ0aWVzOiBzdHJpbmdbXSk6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSB7XG4gIC8vIFNob3J0LWNpcmN1aXQgdGhlIGNhc2Ugd2hlcmUgYHByb3BlcnRpZXNgIGhhcyBmYWxsZW4gYmFjayB0byB0aGUgZGVmYXVsdCB2YWx1ZTpcbiAgLy8gYFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU2BcbiAgaWYgKHByb3BlcnRpZXMgPT09IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykgcmV0dXJuIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUztcblxuICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10gPSBbXTtcblxuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllcyBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5W10pIHtcbiAgICBpZiAoU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLmluZGV4T2YocHJvcCkgIT09IC0xKSB7XG4gICAgICBzdXBwb3J0ZWRQcm9wZXJ0aWVzLnB1c2gocHJvcCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN1cHBvcnRlZFByb3BlcnRpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgTm8gc3VwcG9ydGVkIGZvcm1hdCBwcm9wZXJ0eSB0byBjb25zaWRlciBhbW9uZyBbJHtwcm9wZXJ0aWVzLmpvaW4oJywgJyl9XS4gYCArXG4gICAgICAgIGBTdXBwb3J0ZWQgcHJvcGVydGllczogJHtTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMuam9pbignLCAnKX1gKTtcbiAgfVxuXG4gIHJldHVybiBzdXBwb3J0ZWRQcm9wZXJ0aWVzO1xufVxuXG5mdW5jdGlvbiBnZXRDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2soXG4gICAgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlciwgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQ6IGJvb2xlYW4sIGxvZ2dlcjogTG9nZ2VyLFxuICAgIGZpbGVTeXN0ZW06IEZpbGVTeXN0ZW0pOiBDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2sge1xuICByZXR1cm4gdGFza1F1ZXVlID0+IGNvbXBvc2VUYXNrQ29tcGxldGVkQ2FsbGJhY2tzKHtcbiAgICAgICAgICAgW1Rhc2tQcm9jZXNzaW5nT3V0Y29tZS5Qcm9jZXNzZWRdOiBjcmVhdGVNYXJrQXNQcm9jZXNzZWRIYW5kbGVyKHBrZ0pzb25VcGRhdGVyKSxcbiAgICAgICAgICAgW1Rhc2tQcm9jZXNzaW5nT3V0Y29tZS5GYWlsZWRdOlxuICAgICAgICAgICAgICAgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQgPyBjcmVhdGVUaHJvd0Vycm9ySGFuZGxlcihmaWxlU3lzdGVtKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUxvZ0Vycm9ySGFuZGxlcihsb2dnZXIsIGZpbGVTeXN0ZW0sIHRhc2tRdWV1ZSksXG4gICAgICAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0RXhlY3V0b3IoXG4gICAgYXN5bmM6IGJvb2xlYW4sIGluUGFyYWxsZWw6IGJvb2xlYW4sIGxvZ2dlcjogTG9nZ2VyLCBmaWxlV3JpdGVyOiBGaWxlV3JpdGVyLFxuICAgIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsIGZpbGVTeXN0ZW06IEZpbGVTeXN0ZW0sIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sXG4gICAgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrOiBDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spOiBFeGVjdXRvciB7XG4gIGNvbnN0IGxvY2tGaWxlID0gbmV3IExvY2tGaWxlV2l0aENoaWxkUHJvY2VzcyhmaWxlU3lzdGVtLCBsb2dnZXIpO1xuICBpZiAoYXN5bmMpIHtcbiAgICAvLyBFeGVjdXRlIGFzeW5jaHJvbm91c2x5IChlaXRoZXIgc2VyaWFsbHkgb3IgaW4gcGFyYWxsZWwpXG4gICAgY29uc3Qge3JldHJ5QXR0ZW1wdHMsIHJldHJ5RGVsYXl9ID0gY29uZmlnLmdldExvY2tpbmdDb25maWcoKTtcbiAgICBjb25zdCBsb2NrZXIgPSBuZXcgQXN5bmNMb2NrZXIobG9ja0ZpbGUsIGxvZ2dlciwgcmV0cnlEZWxheSwgcmV0cnlBdHRlbXB0cyk7XG4gICAgaWYgKGluUGFyYWxsZWwpIHtcbiAgICAgIC8vIEV4ZWN1dGUgaW4gcGFyYWxsZWwuIFVzZSB1cCB0byA4IENQVSBjb3JlcyBmb3Igd29ya2VycywgYWx3YXlzIHJlc2VydmluZyBvbmUgZm9yIG1hc3Rlci5cbiAgICAgIGNvbnN0IHdvcmtlckNvdW50ID0gTWF0aC5taW4oOCwgb3MuY3B1cygpLmxlbmd0aCAtIDEpO1xuICAgICAgcmV0dXJuIG5ldyBDbHVzdGVyRXhlY3V0b3IoXG4gICAgICAgICAgd29ya2VyQ291bnQsIGZpbGVTeXN0ZW0sIGxvZ2dlciwgZmlsZVdyaXRlciwgcGtnSnNvblVwZGF0ZXIsIGxvY2tlcixcbiAgICAgICAgICBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBFeGVjdXRlIHNlcmlhbGx5LCBvbiBhIHNpbmdsZSB0aHJlYWQgKGFzeW5jKS5cbiAgICAgIHJldHVybiBuZXcgU2luZ2xlUHJvY2Vzc0V4ZWN1dG9yQXN5bmMobG9nZ2VyLCBsb2NrZXIsIGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIEV4ZWN1dGUgc2VyaWFsbHksIG9uIGEgc2luZ2xlIHRocmVhZCAoc3luYykuXG4gICAgcmV0dXJuIG5ldyBTaW5nbGVQcm9jZXNzRXhlY3V0b3JTeW5jKFxuICAgICAgICBsb2dnZXIsIG5ldyBTeW5jTG9ja2VyKGxvY2tGaWxlKSwgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXREZXBlbmRlbmN5UmVzb2x2ZXIoXG4gICAgZmlsZVN5c3RlbTogRmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sXG4gICAgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3N8dW5kZWZpbmVkKTogRGVwZW5kZW5jeVJlc29sdmVyIHtcbiAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIoZmlsZVN5c3RlbSwgcGF0aE1hcHBpbmdzKTtcbiAgY29uc3QgZXNtRGVwZW5kZW5jeUhvc3QgPSBuZXcgRXNtRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCB1bWREZXBlbmRlbmN5SG9zdCA9IG5ldyBVbWREZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IGNvbW1vbkpzRGVwZW5kZW5jeUhvc3QgPSBuZXcgQ29tbW9uSnNEZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IGR0c0RlcGVuZGVuY3lIb3N0ID0gbmV3IER0c0RlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIHBhdGhNYXBwaW5ncyk7XG4gIHJldHVybiBuZXcgRGVwZW5kZW5jeVJlc29sdmVyKFxuICAgICAgZmlsZVN5c3RlbSwgbG9nZ2VyLCBjb25maWcsIHtcbiAgICAgICAgZXNtNTogZXNtRGVwZW5kZW5jeUhvc3QsXG4gICAgICAgIGVzbTIwMTU6IGVzbURlcGVuZGVuY3lIb3N0LFxuICAgICAgICB1bWQ6IHVtZERlcGVuZGVuY3lIb3N0LFxuICAgICAgICBjb21tb25qczogY29tbW9uSnNEZXBlbmRlbmN5SG9zdFxuICAgICAgfSxcbiAgICAgIGR0c0RlcGVuZGVuY3lIb3N0KTtcbn1cblxuZnVuY3Rpb24gZ2V0RW50cnlQb2ludEZpbmRlcihcbiAgICBmczogRmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIHJlc29sdmVyOiBEZXBlbmRlbmN5UmVzb2x2ZXIsIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sXG4gICAgZW50cnlQb2ludE1hbmlmZXN0OiBFbnRyeVBvaW50TWFuaWZlc3QsIGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aHxudWxsLFxuICAgIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzfHVuZGVmaW5lZCk6IEVudHJ5UG9pbnRGaW5kZXIge1xuICBpZiAoYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCAhPT0gbnVsbCkge1xuICAgIHJldHVybiBuZXcgVGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyKFxuICAgICAgICBmcywgY29uZmlnLCBsb2dnZXIsIHJlc29sdmVyLCBiYXNlUGF0aCwgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCwgcGF0aE1hcHBpbmdzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IERpcmVjdG9yeVdhbGtlckVudHJ5UG9pbnRGaW5kZXIoXG4gICAgICAgIGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGVudHJ5UG9pbnRNYW5pZmVzdCwgYmFzZVBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIH1cbn1cbiJdfQ==