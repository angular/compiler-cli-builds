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
        var _a = ngcc_options_1.getSharedSetup(options), basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, propertiesToConsider = _a.propertiesToConsider, compileAllFormats = _a.compileAllFormats, createNewEntryPointFormats = _a.createNewEntryPointFormats, logger = _a.logger, pathMappings = _a.pathMappings, async = _a.async, errorOnFailedEntryPoint = _a.errorOnFailedEntryPoint, enableI18nLegacyMessageIdFormat = _a.enableI18nLegacyMessageIdFormat, invalidateEntryPointManifest = _a.invalidateEntryPointManifest, fileSystem = _a.fileSystem, absBasePath = _a.absBasePath, projectPath = _a.projectPath, tsConfig = _a.tsConfig;
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
        // Execute in parallel, if async execution is acceptable and there are more than 1 CPU cores.
        var inParallel = async && (os.cpus().length > 1);
        var analyzeEntryPoints = analyze_entry_points_1.getAnalyzeEntryPointsFn(logger, finder, fileSystem, supportedPropertiesToConsider, compileAllFormats, propertiesToConsider, inParallel);
        // Create an updater that will actually write to disk. In
        var pkgJsonUpdater = new package_json_updater_1.DirectPackageJsonUpdater(fileSystem);
        // The function for creating the `compile()` function.
        var createCompileFn = create_compile_function_1.getCreateCompileFn(fileSystem, logger, pkgJsonUpdater, createNewEntryPointFormats, errorOnFailedEntryPoint, enableI18nLegacyMessageIdFormat, tsConfig, pathMappings);
        // The executor for actually planning and getting the work done.
        var createTaskCompletedCallback = getCreateTaskCompletedCallback(pkgJsonUpdater, errorOnFailedEntryPoint, logger, fileSystem);
        var executor = getExecutor(async, inParallel, logger, pkgJsonUpdater, fileSystem, createTaskCompletedCallback);
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
    function getExecutor(async, inParallel, logger, pkgJsonUpdater, fileSystem, createTaskCompletedCallback) {
        var lockFile = new lock_file_with_child_process_1.LockFileWithChildProcess(fileSystem, logger);
        if (async) {
            // Execute asynchronously (either serially or in parallel)
            var locker = new async_locker_1.AsyncLocker(lockFile, logger, 500, 50);
            if (inParallel) {
                // Execute in parallel. Use up to 8 CPU cores for workers, always reserving one for master.
                var workerCount = Math.min(8, os.cpus().length - 1);
                return new executor_1.ClusterExecutor(workerCount, fileSystem, logger, pkgJsonUpdater, locker, createTaskCompletedCallback);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhCQUE4QjtJQUU5Qix1QkFBeUI7SUFFekIsMkVBQWdGO0lBRWhGLGlIQUErRTtJQUMvRSx1R0FBc0U7SUFDdEUsdUdBQXFFO0lBQ3JFLHVHQUFxRTtJQUNyRSwrRkFBOEQ7SUFDOUQsdUdBQXFFO0lBQ3JFLDZJQUF5RztJQUV6Ryw2SEFBMEY7SUFDMUYsc0dBQXlFO0lBRXpFLHNGQUE2RDtJQUM3RCw0R0FBdUU7SUFDdkUsNEdBQTBHO0lBRTFHLHdGQUF5SjtJQUN6SixvRkFBbUQ7SUFDbkQsMEhBQWdGO0lBQ2hGLGtGQUFpRDtJQUVqRCw0RUFBNEc7SUFDNUcsdUZBQTJEO0lBQzNELG1GQUEyRjtJQUMzRixxR0FBbUc7SUFDbkcsb0dBQTRGO0lBWTVGLFNBQWdCLFFBQVEsQ0FBQyxPQUFvQjtRQUNyQyxJQUFBLDJDQWdCcUIsRUFmekIsc0JBQVEsRUFDUiw4Q0FBb0IsRUFDcEIsOENBQW9CLEVBQ3BCLHdDQUFpQixFQUNqQiwwREFBMEIsRUFDMUIsa0JBQU0sRUFDTiw4QkFBWSxFQUNaLGdCQUFLLEVBQ0wsb0RBQXVCLEVBQ3ZCLG9FQUErQixFQUMvQiw4REFBNEIsRUFDNUIsMEJBQVUsRUFDViw0QkFBVyxFQUNYLDRCQUFXLEVBQ1gsc0JBQ3lCLENBQUM7UUFFNUIsSUFBTSxNQUFNLEdBQUcsSUFBSSxpQ0FBaUIsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDOUQsSUFBTSxrQkFBa0IsR0FBRyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUMzRixJQUFNLGtCQUFrQixHQUFHLDRCQUE0QixDQUFDLENBQUM7WUFD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RUFBRSxRQUFRLEVBQUUsNEJBQTRCLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDekY7YUFBTTtZQUNMLE9BQU8sSUFBSSxxRUFBK0IsQ0FDdEMsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztTQUMvRTtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHtDb21tb25Kc0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9jb21tb25qc19kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXJ9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtEdHNEZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZHRzX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0VzbURlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9lc21fZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4vZGVwZW5kZW5jaWVzL21vZHVsZV9yZXNvbHZlcic7XG5pbXBvcnQge1VtZERlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy91bWRfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGlyZWN0b3J5V2Fsa2VyRW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9lbnRyeV9wb2ludF9maW5kZXIvZGlyZWN0b3J5X3dhbGtlcl9lbnRyeV9wb2ludF9maW5kZXInO1xuaW1wb3J0IHtFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci9pbnRlcmZhY2UnO1xuaW1wb3J0IHtUYXJnZXRlZEVudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL3RhcmdldGVkX2VudHJ5X3BvaW50X2ZpbmRlcic7XG5pbXBvcnQge2dldEFuYWx5emVFbnRyeVBvaW50c0ZufSBmcm9tICcuL2V4ZWN1dGlvbi9hbmFseXplX2VudHJ5X3BvaW50cyc7XG5pbXBvcnQge0V4ZWN1dG9yfSBmcm9tICcuL2V4ZWN1dGlvbi9hcGknO1xuaW1wb3J0IHtDbHVzdGVyRXhlY3V0b3J9IGZyb20gJy4vZXhlY3V0aW9uL2NsdXN0ZXIvZXhlY3V0b3InO1xuaW1wb3J0IHtnZXRDcmVhdGVDb21waWxlRm59IGZyb20gJy4vZXhlY3V0aW9uL2NyZWF0ZV9jb21waWxlX2Z1bmN0aW9uJztcbmltcG9ydCB7U2luZ2xlUHJvY2Vzc0V4ZWN1dG9yQXN5bmMsIFNpbmdsZVByb2Nlc3NFeGVjdXRvclN5bmN9IGZyb20gJy4vZXhlY3V0aW9uL3NpbmdsZV9wcm9jZXNzX2V4ZWN1dG9yJztcbmltcG9ydCB7Q3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWV9IGZyb20gJy4vZXhlY3V0aW9uL3Rhc2tzL2FwaSc7XG5pbXBvcnQge2NvbXBvc2VUYXNrQ29tcGxldGVkQ2FsbGJhY2tzLCBjcmVhdGVMb2dFcnJvckhhbmRsZXIsIGNyZWF0ZU1hcmtBc1Byb2Nlc3NlZEhhbmRsZXIsIGNyZWF0ZVRocm93RXJyb3JIYW5kbGVyfSBmcm9tICcuL2V4ZWN1dGlvbi90YXNrcy9jb21wbGV0aW9uJztcbmltcG9ydCB7QXN5bmNMb2NrZXJ9IGZyb20gJy4vbG9ja2luZy9hc3luY19sb2NrZXInO1xuaW1wb3J0IHtMb2NrRmlsZVdpdGhDaGlsZFByb2Nlc3N9IGZyb20gJy4vbG9ja2luZy9sb2NrX2ZpbGVfd2l0aF9jaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7U3luY0xvY2tlcn0gZnJvbSAnLi9sb2NraW5nL3N5bmNfbG9ja2VyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7QXN5bmNOZ2NjT3B0aW9ucywgZ2V0U2hhcmVkU2V0dXAsIE5nY2NPcHRpb25zLCBQYXRoTWFwcGluZ3MsIFN5bmNOZ2NjT3B0aW9uc30gZnJvbSAnLi9uZ2NjX29wdGlvbnMnO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbn0gZnJvbSAnLi9wYWNrYWdlcy9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTfSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7RW50cnlQb2ludE1hbmlmZXN0LCBJbnZhbGlkYXRpbmdFbnRyeVBvaW50TWFuaWZlc3R9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfbWFuaWZlc3QnO1xuaW1wb3J0IHtEaXJlY3RQYWNrYWdlSnNvblVwZGF0ZXIsIFBhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi93cml0aW5nL3BhY2thZ2VfanNvbl91cGRhdGVyJztcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5LXBvaW50IGludG8gbmdjYyAoYU5HdWxhciBDb21wYXRpYmlsaXR5IENvbXBpbGVyKS5cbiAqXG4gKiBZb3UgY2FuIGNhbGwgdGhpcyBmdW5jdGlvbiB0byBwcm9jZXNzIG9uZSBvciBtb3JlIG5wbSBwYWNrYWdlcywgdG8gZW5zdXJlXG4gKiB0aGF0IHRoZXkgYXJlIGNvbXBhdGlibGUgd2l0aCB0aGUgaXZ5IGNvbXBpbGVyIChuZ3RzYykuXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgVGhlIG9wdGlvbnMgdGVsbGluZyBuZ2NjIHdoYXQgdG8gY29tcGlsZSBhbmQgaG93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2Mob3B0aW9uczogQXN5bmNOZ2NjT3B0aW9ucyk6IFByb21pc2U8dm9pZD47XG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2Mob3B0aW9uczogU3luY05nY2NPcHRpb25zKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhvcHRpb25zOiBOZ2NjT3B0aW9ucyk6IHZvaWR8UHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHtcbiAgICBiYXNlUGF0aCxcbiAgICB0YXJnZXRFbnRyeVBvaW50UGF0aCxcbiAgICBwcm9wZXJ0aWVzVG9Db25zaWRlcixcbiAgICBjb21waWxlQWxsRm9ybWF0cyxcbiAgICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyxcbiAgICBsb2dnZXIsXG4gICAgcGF0aE1hcHBpbmdzLFxuICAgIGFzeW5jLFxuICAgIGVycm9yT25GYWlsZWRFbnRyeVBvaW50LFxuICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgaW52YWxpZGF0ZUVudHJ5UG9pbnRNYW5pZmVzdCxcbiAgICBmaWxlU3lzdGVtLFxuICAgIGFic0Jhc2VQYXRoLFxuICAgIHByb2plY3RQYXRoLFxuICAgIHRzQ29uZmlnXG4gIH0gPSBnZXRTaGFyZWRTZXR1cChvcHRpb25zKTtcblxuICBjb25zdCBjb25maWcgPSBuZXcgTmdjY0NvbmZpZ3VyYXRpb24oZmlsZVN5c3RlbSwgcHJvamVjdFBhdGgpO1xuICBjb25zdCBkZXBlbmRlbmN5UmVzb2x2ZXIgPSBnZXREZXBlbmRlbmN5UmVzb2x2ZXIoZmlsZVN5c3RlbSwgbG9nZ2VyLCBjb25maWcsIHBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0IGVudHJ5UG9pbnRNYW5pZmVzdCA9IGludmFsaWRhdGVFbnRyeVBvaW50TWFuaWZlc3QgP1xuICAgICAgbmV3IEludmFsaWRhdGluZ0VudHJ5UG9pbnRNYW5pZmVzdChmaWxlU3lzdGVtLCBjb25maWcsIGxvZ2dlcikgOlxuICAgICAgbmV3IEVudHJ5UG9pbnRNYW5pZmVzdChmaWxlU3lzdGVtLCBjb25maWcsIGxvZ2dlcik7XG5cbiAgLy8gQmFpbCBvdXQgZWFybHkgaWYgdGhlIHdvcmsgaXMgYWxyZWFkeSBkb25lLlxuICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciA9IGVuc3VyZVN1cHBvcnRlZFByb3BlcnRpZXMocHJvcGVydGllc1RvQ29uc2lkZXIpO1xuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID1cbiAgICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoICE9PSB1bmRlZmluZWQgPyByZXNvbHZlKGJhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCkgOiBudWxsO1xuICBjb25zdCBmaW5kZXIgPSBnZXRFbnRyeVBvaW50RmluZGVyKFxuICAgICAgZmlsZVN5c3RlbSwgbG9nZ2VyLCBkZXBlbmRlbmN5UmVzb2x2ZXIsIGNvbmZpZywgZW50cnlQb2ludE1hbmlmZXN0LCBhYnNCYXNlUGF0aCxcbiAgICAgIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIGlmIChmaW5kZXIgaW5zdGFuY2VvZiBUYXJnZXRlZEVudHJ5UG9pbnRGaW5kZXIgJiZcbiAgICAgICFmaW5kZXIudGFyZ2V0TmVlZHNQcm9jZXNzaW5nT3JDbGVhbmluZyhzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdUaGUgdGFyZ2V0IGVudHJ5LXBvaW50IGhhcyBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRXhlY3V0ZSBpbiBwYXJhbGxlbCwgaWYgYXN5bmMgZXhlY3V0aW9uIGlzIGFjY2VwdGFibGUgYW5kIHRoZXJlIGFyZSBtb3JlIHRoYW4gMSBDUFUgY29yZXMuXG4gIGNvbnN0IGluUGFyYWxsZWwgPSBhc3luYyAmJiAob3MuY3B1cygpLmxlbmd0aCA+IDEpO1xuXG4gIGNvbnN0IGFuYWx5emVFbnRyeVBvaW50cyA9IGdldEFuYWx5emVFbnRyeVBvaW50c0ZuKFxuICAgICAgbG9nZ2VyLCBmaW5kZXIsIGZpbGVTeXN0ZW0sIHN1cHBvcnRlZFByb3BlcnRpZXNUb0NvbnNpZGVyLCBjb21waWxlQWxsRm9ybWF0cyxcbiAgICAgIHByb3BlcnRpZXNUb0NvbnNpZGVyLCBpblBhcmFsbGVsKTtcblxuICAvLyBDcmVhdGUgYW4gdXBkYXRlciB0aGF0IHdpbGwgYWN0dWFsbHkgd3JpdGUgdG8gZGlzay4gSW5cbiAgY29uc3QgcGtnSnNvblVwZGF0ZXIgPSBuZXcgRGlyZWN0UGFja2FnZUpzb25VcGRhdGVyKGZpbGVTeXN0ZW0pO1xuXG4gIC8vIFRoZSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgdGhlIGBjb21waWxlKClgIGZ1bmN0aW9uLlxuICBjb25zdCBjcmVhdGVDb21waWxlRm4gPSBnZXRDcmVhdGVDb21waWxlRm4oXG4gICAgICBmaWxlU3lzdGVtLCBsb2dnZXIsIHBrZ0pzb25VcGRhdGVyLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cywgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQsXG4gICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0LCB0c0NvbmZpZywgcGF0aE1hcHBpbmdzKTtcblxuICAvLyBUaGUgZXhlY3V0b3IgZm9yIGFjdHVhbGx5IHBsYW5uaW5nIGFuZCBnZXR0aW5nIHRoZSB3b3JrIGRvbmUuXG4gIGNvbnN0IGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayA9XG4gICAgICBnZXRDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2socGtnSnNvblVwZGF0ZXIsIGVycm9yT25GYWlsZWRFbnRyeVBvaW50LCBsb2dnZXIsIGZpbGVTeXN0ZW0pO1xuICBjb25zdCBleGVjdXRvciA9IGdldEV4ZWN1dG9yKFxuICAgICAgYXN5bmMsIGluUGFyYWxsZWwsIGxvZ2dlciwgcGtnSnNvblVwZGF0ZXIsIGZpbGVTeXN0ZW0sIGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayk7XG5cbiAgcmV0dXJuIGV4ZWN1dG9yLmV4ZWN1dGUoYW5hbHl6ZUVudHJ5UG9pbnRzLCBjcmVhdGVDb21waWxlRm4pO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVTdXBwb3J0ZWRQcm9wZXJ0aWVzKHByb3BlcnRpZXM6IHN0cmluZ1tdKTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdIHtcbiAgLy8gU2hvcnQtY2lyY3VpdCB0aGUgY2FzZSB3aGVyZSBgcHJvcGVydGllc2AgaGFzIGZhbGxlbiBiYWNrIHRvIHRoZSBkZWZhdWx0IHZhbHVlOlxuICAvLyBgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTYFxuICBpZiAocHJvcGVydGllcyA9PT0gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTKSByZXR1cm4gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTO1xuXG4gIGNvbnN0IHN1cHBvcnRlZFByb3BlcnRpZXM6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzIGFzIEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSkge1xuICAgIGlmIChTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMuaW5kZXhPZihwcm9wKSAhPT0gLTEpIHtcbiAgICAgIHN1cHBvcnRlZFByb3BlcnRpZXMucHVzaChwcm9wKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc3VwcG9ydGVkUHJvcGVydGllcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBObyBzdXBwb3J0ZWQgZm9ybWF0IHByb3BlcnR5IHRvIGNvbnNpZGVyIGFtb25nIFske3Byb3BlcnRpZXMuam9pbignLCAnKX1dLiBgICtcbiAgICAgICAgYFN1cHBvcnRlZCBwcm9wZXJ0aWVzOiAke1NVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUy5qb2luKCcsICcpfWApO1xuICB9XG5cbiAgcmV0dXJuIHN1cHBvcnRlZFByb3BlcnRpZXM7XG59XG5cbmZ1bmN0aW9uIGdldENyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayhcbiAgICBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLCBlcnJvck9uRmFpbGVkRW50cnlQb2ludDogYm9vbGVhbiwgbG9nZ2VyOiBMb2dnZXIsXG4gICAgZmlsZVN5c3RlbTogRmlsZVN5c3RlbSk6IENyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayB7XG4gIHJldHVybiB0YXNrUXVldWUgPT4gY29tcG9zZVRhc2tDb21wbGV0ZWRDYWxsYmFja3Moe1xuICAgICAgICAgICBbVGFza1Byb2Nlc3NpbmdPdXRjb21lLlByb2Nlc3NlZF06IGNyZWF0ZU1hcmtBc1Byb2Nlc3NlZEhhbmRsZXIocGtnSnNvblVwZGF0ZXIpLFxuICAgICAgICAgICBbVGFza1Byb2Nlc3NpbmdPdXRjb21lLkZhaWxlZF06XG4gICAgICAgICAgICAgICBlcnJvck9uRmFpbGVkRW50cnlQb2ludCA/IGNyZWF0ZVRocm93RXJyb3JIYW5kbGVyKGZpbGVTeXN0ZW0pIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlTG9nRXJyb3JIYW5kbGVyKGxvZ2dlciwgZmlsZVN5c3RlbSwgdGFza1F1ZXVlKSxcbiAgICAgICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRFeGVjdXRvcihcbiAgICBhc3luYzogYm9vbGVhbiwgaW5QYXJhbGxlbDogYm9vbGVhbiwgbG9nZ2VyOiBMb2dnZXIsIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsXG4gICAgZmlsZVN5c3RlbTogRmlsZVN5c3RlbSwgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrOiBDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spOiBFeGVjdXRvciB7XG4gIGNvbnN0IGxvY2tGaWxlID0gbmV3IExvY2tGaWxlV2l0aENoaWxkUHJvY2VzcyhmaWxlU3lzdGVtLCBsb2dnZXIpO1xuICBpZiAoYXN5bmMpIHtcbiAgICAvLyBFeGVjdXRlIGFzeW5jaHJvbm91c2x5IChlaXRoZXIgc2VyaWFsbHkgb3IgaW4gcGFyYWxsZWwpXG4gICAgY29uc3QgbG9ja2VyID0gbmV3IEFzeW5jTG9ja2VyKGxvY2tGaWxlLCBsb2dnZXIsIDUwMCwgNTApO1xuICAgIGlmIChpblBhcmFsbGVsKSB7XG4gICAgICAvLyBFeGVjdXRlIGluIHBhcmFsbGVsLiBVc2UgdXAgdG8gOCBDUFUgY29yZXMgZm9yIHdvcmtlcnMsIGFsd2F5cyByZXNlcnZpbmcgb25lIGZvciBtYXN0ZXIuXG4gICAgICBjb25zdCB3b3JrZXJDb3VudCA9IE1hdGgubWluKDgsIG9zLmNwdXMoKS5sZW5ndGggLSAxKTtcbiAgICAgIHJldHVybiBuZXcgQ2x1c3RlckV4ZWN1dG9yKFxuICAgICAgICAgIHdvcmtlckNvdW50LCBmaWxlU3lzdGVtLCBsb2dnZXIsIHBrZ0pzb25VcGRhdGVyLCBsb2NrZXIsIGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEV4ZWN1dGUgc2VyaWFsbHksIG9uIGEgc2luZ2xlIHRocmVhZCAoYXN5bmMpLlxuICAgICAgcmV0dXJuIG5ldyBTaW5nbGVQcm9jZXNzRXhlY3V0b3JBc3luYyhsb2dnZXIsIGxvY2tlciwgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gRXhlY3V0ZSBzZXJpYWxseSwgb24gYSBzaW5nbGUgdGhyZWFkIChzeW5jKS5cbiAgICByZXR1cm4gbmV3IFNpbmdsZVByb2Nlc3NFeGVjdXRvclN5bmMoXG4gICAgICAgIGxvZ2dlciwgbmV3IFN5bmNMb2NrZXIobG9ja0ZpbGUpLCBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldERlcGVuZGVuY3lSZXNvbHZlcihcbiAgICBmaWxlU3lzdGVtOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbixcbiAgICBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5nc3x1bmRlZmluZWQpOiBEZXBlbmRlbmN5UmVzb2x2ZXIge1xuICBjb25zdCBtb2R1bGVSZXNvbHZlciA9IG5ldyBNb2R1bGVSZXNvbHZlcihmaWxlU3lzdGVtLCBwYXRoTWFwcGluZ3MpO1xuICBjb25zdCBlc21EZXBlbmRlbmN5SG9zdCA9IG5ldyBFc21EZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IHVtZERlcGVuZGVuY3lIb3N0ID0gbmV3IFVtZERlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgY29uc3QgY29tbW9uSnNEZXBlbmRlbmN5SG9zdCA9IG5ldyBDb21tb25Kc0RlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgY29uc3QgZHRzRGVwZW5kZW5jeUhvc3QgPSBuZXcgRHRzRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgcGF0aE1hcHBpbmdzKTtcbiAgcmV0dXJuIG5ldyBEZXBlbmRlbmN5UmVzb2x2ZXIoXG4gICAgICBmaWxlU3lzdGVtLCBsb2dnZXIsIGNvbmZpZywge1xuICAgICAgICBlc201OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICAgICAgZXNtMjAxNTogZXNtRGVwZW5kZW5jeUhvc3QsXG4gICAgICAgIHVtZDogdW1kRGVwZW5kZW5jeUhvc3QsXG4gICAgICAgIGNvbW1vbmpzOiBjb21tb25Kc0RlcGVuZGVuY3lIb3N0XG4gICAgICB9LFxuICAgICAgZHRzRGVwZW5kZW5jeUhvc3QpO1xufVxuXG5mdW5jdGlvbiBnZXRFbnRyeVBvaW50RmluZGVyKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlciwgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbixcbiAgICBlbnRyeVBvaW50TWFuaWZlc3Q6IEVudHJ5UG9pbnRNYW5pZmVzdCwgYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRofG51bGwsXG4gICAgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3N8dW5kZWZpbmVkKTogRW50cnlQb2ludEZpbmRlciB7XG4gIGlmIChhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIG5ldyBUYXJnZXRlZEVudHJ5UG9pbnRGaW5kZXIoXG4gICAgICAgIGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGJhc2VQYXRoLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwYXRoTWFwcGluZ3MpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgRGlyZWN0b3J5V2Fsa2VyRW50cnlQb2ludEZpbmRlcihcbiAgICAgICAgZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgZW50cnlQb2ludE1hbmlmZXN0LCBiYXNlUGF0aCwgcGF0aE1hcHBpbmdzKTtcbiAgfVxufVxuIl19