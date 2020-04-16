/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <reference types="node" />
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/cluster/worker", ["require", "exports", "tslib", "cluster", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/command_line_options", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/logging/logger", "@angular/compiler-cli/ngcc/src/ngcc_options", "@angular/compiler-cli/ngcc/src/execution/create_compile_function", "@angular/compiler-cli/ngcc/src/execution/tasks/utils", "@angular/compiler-cli/ngcc/src/execution/cluster/package_json_updater", "@angular/compiler-cli/ngcc/src/execution/cluster/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var cluster = require("cluster");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var command_line_options_1 = require("@angular/compiler-cli/ngcc/src/command_line_options");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    var logger_1 = require("@angular/compiler-cli/ngcc/src/logging/logger");
    var ngcc_options_1 = require("@angular/compiler-cli/ngcc/src/ngcc_options");
    var create_compile_function_1 = require("@angular/compiler-cli/ngcc/src/execution/create_compile_function");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/utils");
    var package_json_updater_1 = require("@angular/compiler-cli/ngcc/src/execution/cluster/package_json_updater");
    var utils_2 = require("@angular/compiler-cli/ngcc/src/execution/cluster/utils");
    // Cluster worker entry point
    if (require.main === module) {
        (function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var _a, _b, createNewEntryPointFormats, _c, logger, pathMappings, _d, errorOnFailedEntryPoint, _e, enableI18nLegacyMessageIdFormat, fileSystem, tsConfig, pkgJsonUpdater, createCompileFn, e_1;
            return tslib_1.__generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        process.title = 'ngcc (worker)';
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 3, , 4]);
                        file_system_1.setFileSystem(new file_system_1.CachedFileSystem(new file_system_1.NodeJSFileSystem()));
                        _a = ngcc_options_1.getSharedSetup(command_line_options_1.parseCommandLineOptions(process.argv.slice(2))), _b = _a.createNewEntryPointFormats, createNewEntryPointFormats = _b === void 0 ? false : _b, _c = _a.logger, logger = _c === void 0 ? new console_logger_1.ConsoleLogger(logger_1.LogLevel.info) : _c, pathMappings = _a.pathMappings, _d = _a.errorOnFailedEntryPoint, errorOnFailedEntryPoint = _d === void 0 ? false : _d, _e = _a.enableI18nLegacyMessageIdFormat, enableI18nLegacyMessageIdFormat = _e === void 0 ? true : _e, fileSystem = _a.fileSystem, tsConfig = _a.tsConfig;
                        pkgJsonUpdater = new package_json_updater_1.ClusterWorkerPackageJsonUpdater();
                        createCompileFn = create_compile_function_1.getCreateCompileFn(fileSystem, logger, pkgJsonUpdater, createNewEntryPointFormats, errorOnFailedEntryPoint, enableI18nLegacyMessageIdFormat, tsConfig, pathMappings);
                        return [4 /*yield*/, startWorker(logger, createCompileFn)];
                    case 2:
                        _f.sent();
                        process.exitCode = 0;
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _f.sent();
                        console.error(e_1.stack || e_1.message);
                        process.exit(1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); })();
    }
    function startWorker(logger, createCompileFn) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var compile;
            return tslib_1.__generator(this, function (_a) {
                if (cluster.isMaster) {
                    throw new Error('Tried to run cluster worker on the master process.');
                }
                compile = createCompileFn(function (_task, outcome, message) { return utils_2.sendMessageToMaster({ type: 'task-completed', outcome: outcome, message: message }); });
                // Listen for `ProcessTaskMessage`s and process tasks.
                cluster.worker.on('message', function (msg) {
                    try {
                        switch (msg.type) {
                            case 'process-task':
                                logger.debug("[Worker #" + cluster.worker.id + "] Processing task: " + utils_1.stringifyTask(msg.task));
                                return compile(msg.task);
                            default:
                                throw new Error("[Worker #" + cluster.worker.id + "] Invalid message received: " + JSON.stringify(msg));
                        }
                    }
                    catch (err) {
                        utils_2.sendMessageToMaster({
                            type: 'error',
                            error: (err instanceof Error) ? (err.stack || err.message) : err,
                        });
                    }
                });
                // Return a promise that is never resolved.
                return [2 /*return*/, new Promise(function () { return undefined; })];
            });
        });
    }
    exports.startWorker = startWorker;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi9jbHVzdGVyL3dvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFDSCw4QkFBOEI7Ozs7Ozs7Ozs7Ozs7SUFFOUIsaUNBQW1DO0lBRW5DLDJFQUFvRztJQUNwRyw0RkFBbUU7SUFDbkUsd0ZBQTJEO0lBQzNELHdFQUFzRDtJQUN0RCw0RUFBa0Q7SUFFbEQsNEdBQThEO0lBQzlELDhFQUE2QztJQUc3Qyw4R0FBdUU7SUFDdkUsZ0ZBQTRDO0lBRTVDLDZCQUE2QjtJQUM3QixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO1FBQzNCLENBQUM7Ozs7O3dCQUNDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsZUFBZSxDQUFDOzs7O3dCQUc5QiwyQkFBYSxDQUFDLElBQUksOEJBQWdCLENBQUMsSUFBSSw4QkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFFdEQsS0FRRiw2QkFBYyxDQUFDLDhDQUF1QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFQaEUsa0NBQWtDLEVBQWxDLDBCQUEwQixtQkFBRyxLQUFLLEtBQUEsRUFDbEMsY0FBeUMsRUFBekMsTUFBTSxtQkFBRyxJQUFJLDhCQUFhLENBQUMsaUJBQVEsQ0FBQyxJQUFJLENBQUMsS0FBQSxFQUN6QyxZQUFZLGtCQUFBLEVBQ1osK0JBQStCLEVBQS9CLHVCQUF1QixtQkFBRyxLQUFLLEtBQUEsRUFDL0IsdUNBQXNDLEVBQXRDLCtCQUErQixtQkFBRyxJQUFJLEtBQUEsRUFDdEMsVUFBVSxnQkFBQSxFQUNWLFFBQVEsY0FBQSxDQUN5RDt3QkFLN0QsY0FBYyxHQUFHLElBQUksc0RBQStCLEVBQUUsQ0FBQzt3QkFHdkQsZUFBZSxHQUFHLDRDQUFrQixDQUN0QyxVQUFVLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSwwQkFBMEIsRUFBRSx1QkFBdUIsRUFDdkYsK0JBQStCLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO3dCQUU3RCxxQkFBTSxXQUFXLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxFQUFBOzt3QkFBMUMsU0FBMEMsQ0FBQzt3QkFDM0MsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7Ozs7d0JBRXJCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBQyxDQUFDLEtBQUssSUFBSSxHQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ3BDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Ozs7O2FBRW5CLENBQUMsRUFBRSxDQUFDO0tBQ047SUFFRCxTQUFzQixXQUFXLENBQUMsTUFBYyxFQUFFLGVBQWdDOzs7O2dCQUNoRixJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUU7b0JBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsb0RBQW9ELENBQUMsQ0FBQztpQkFDdkU7Z0JBRUssT0FBTyxHQUFHLGVBQWUsQ0FDM0IsVUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sSUFBSyxPQUFBLDJCQUFtQixDQUFDLEVBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sU0FBQSxFQUFFLE9BQU8sU0FBQSxFQUFDLENBQUMsRUFBL0QsQ0FBK0QsQ0FBQyxDQUFDO2dCQUdsRyxzREFBc0Q7Z0JBQ3RELE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFDLEdBQW9CO29CQUNoRCxJQUFJO3dCQUNGLFFBQVEsR0FBRyxDQUFDLElBQUksRUFBRTs0QkFDaEIsS0FBSyxjQUFjO2dDQUNqQixNQUFNLENBQUMsS0FBSyxDQUNSLGNBQVksT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLDJCQUFzQixxQkFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDO2dDQUNsRixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQzNCO2dDQUNFLE1BQU0sSUFBSSxLQUFLLENBQ1gsY0FBWSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsb0NBQStCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFHLENBQUMsQ0FBQzt5QkFDMUY7cUJBQ0Y7b0JBQUMsT0FBTyxHQUFHLEVBQUU7d0JBQ1osMkJBQW1CLENBQUM7NEJBQ2xCLElBQUksRUFBRSxPQUFPOzRCQUNiLEtBQUssRUFBRSxDQUFDLEdBQUcsWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRzt5QkFDakUsQ0FBQyxDQUFDO3FCQUNKO2dCQUNILENBQUMsQ0FBQyxDQUFDO2dCQUVILDJDQUEyQztnQkFDM0Msc0JBQU8sSUFBSSxPQUFPLENBQUMsY0FBTSxPQUFBLFNBQVMsRUFBVCxDQUFTLENBQUMsRUFBQzs7O0tBQ3JDO0lBL0JELGtDQStCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmltcG9ydCAqIGFzIGNsdXN0ZXIgZnJvbSAnY2x1c3Rlcic7XG5cbmltcG9ydCB7Q2FjaGVkRmlsZVN5c3RlbSwgTm9kZUpTRmlsZVN5c3RlbSwgc2V0RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7cGFyc2VDb21tYW5kTGluZU9wdGlvbnN9IGZyb20gJy4uLy4uL2NvbW1hbmRfbGluZV9vcHRpb25zJztcbmltcG9ydCB7Q29uc29sZUxvZ2dlcn0gZnJvbSAnLi4vLi4vbG9nZ2luZy9jb25zb2xlX2xvZ2dlcic7XG5pbXBvcnQge0xvZ2dlciwgTG9nTGV2ZWx9IGZyb20gJy4uLy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7Z2V0U2hhcmVkU2V0dXB9IGZyb20gJy4uLy4uL25nY2Nfb3B0aW9ucyc7XG5pbXBvcnQge0NyZWF0ZUNvbXBpbGVGbn0gZnJvbSAnLi4vYXBpJztcbmltcG9ydCB7Z2V0Q3JlYXRlQ29tcGlsZUZufSBmcm9tICcuLi9jcmVhdGVfY29tcGlsZV9mdW5jdGlvbic7XG5pbXBvcnQge3N0cmluZ2lmeVRhc2t9IGZyb20gJy4uL3Rhc2tzL3V0aWxzJztcblxuaW1wb3J0IHtNZXNzYWdlVG9Xb3JrZXJ9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7Q2x1c3RlcldvcmtlclBhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5pbXBvcnQge3NlbmRNZXNzYWdlVG9NYXN0ZXJ9IGZyb20gJy4vdXRpbHMnO1xuXG4vLyBDbHVzdGVyIHdvcmtlciBlbnRyeSBwb2ludFxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIChhc3luYyAoKSA9PiB7XG4gICAgcHJvY2Vzcy50aXRsZSA9ICduZ2NjICh3b3JrZXIpJztcblxuICAgIHRyeSB7XG4gICAgICBzZXRGaWxlU3lzdGVtKG5ldyBDYWNoZWRGaWxlU3lzdGVtKG5ldyBOb2RlSlNGaWxlU3lzdGVtKCkpKTtcblxuICAgICAgY29uc3Qge1xuICAgICAgICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IGZhbHNlLFxuICAgICAgICBsb2dnZXIgPSBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbC5pbmZvKSxcbiAgICAgICAgcGF0aE1hcHBpbmdzLFxuICAgICAgICBlcnJvck9uRmFpbGVkRW50cnlQb2ludCA9IGZhbHNlLFxuICAgICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ID0gdHJ1ZSxcbiAgICAgICAgZmlsZVN5c3RlbSxcbiAgICAgICAgdHNDb25maWdcbiAgICAgIH0gPSBnZXRTaGFyZWRTZXR1cChwYXJzZUNvbW1hbmRMaW5lT3B0aW9ucyhwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpKTtcblxuICAgICAgLy8gTk9URTogVG8gYXZvaWQgZmlsZSBjb3JydXB0aW9uLCBgbmdjY2AgaW52b2NhdGlvbiBvbmx5IGNyZWF0ZXMgX29uZV8gaW5zdGFuY2Ugb2ZcbiAgICAgIC8vIGBQYWNrYWdlSnNvblVwZGF0ZXJgIHRoYXQgYWN0dWFsbHkgd3JpdGVzIHRvIGRpc2sgKGFjcm9zcyBhbGwgcHJvY2Vzc2VzKS5cbiAgICAgIC8vIEluIGNsdXN0ZXIgd29ya2VycyB3ZSB1c2UgYSBgUGFja2FnZUpzb25VcGRhdGVyYCB0aGF0IGRlbGVnYXRlcyB0byB0aGUgY2x1c3RlciBtYXN0ZXIuXG4gICAgICBjb25zdCBwa2dKc29uVXBkYXRlciA9IG5ldyBDbHVzdGVyV29ya2VyUGFja2FnZUpzb25VcGRhdGVyKCk7XG5cbiAgICAgIC8vIFRoZSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgdGhlIGBjb21waWxlKClgIGZ1bmN0aW9uLlxuICAgICAgY29uc3QgY3JlYXRlQ29tcGlsZUZuID0gZ2V0Q3JlYXRlQ29tcGlsZUZuKFxuICAgICAgICAgIGZpbGVTeXN0ZW0sIGxvZ2dlciwgcGtnSnNvblVwZGF0ZXIsIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzLCBlcnJvck9uRmFpbGVkRW50cnlQb2ludCxcbiAgICAgICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0LCB0c0NvbmZpZywgcGF0aE1hcHBpbmdzKTtcblxuICAgICAgYXdhaXQgc3RhcnRXb3JrZXIobG9nZ2VyLCBjcmVhdGVDb21waWxlRm4pO1xuICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IDA7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihlLnN0YWNrIHx8IGUubWVzc2FnZSk7XG4gICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgfVxuICB9KSgpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhcnRXb3JrZXIobG9nZ2VyOiBMb2dnZXIsIGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChjbHVzdGVyLmlzTWFzdGVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUcmllZCB0byBydW4gY2x1c3RlciB3b3JrZXIgb24gdGhlIG1hc3RlciBwcm9jZXNzLicpO1xuICB9XG5cbiAgY29uc3QgY29tcGlsZSA9IGNyZWF0ZUNvbXBpbGVGbihcbiAgICAgIChfdGFzaywgb3V0Y29tZSwgbWVzc2FnZSkgPT4gc2VuZE1lc3NhZ2VUb01hc3Rlcih7dHlwZTogJ3Rhc2stY29tcGxldGVkJywgb3V0Y29tZSwgbWVzc2FnZX0pKTtcblxuXG4gIC8vIExpc3RlbiBmb3IgYFByb2Nlc3NUYXNrTWVzc2FnZWBzIGFuZCBwcm9jZXNzIHRhc2tzLlxuICBjbHVzdGVyLndvcmtlci5vbignbWVzc2FnZScsIChtc2c6IE1lc3NhZ2VUb1dvcmtlcikgPT4ge1xuICAgIHRyeSB7XG4gICAgICBzd2l0Y2ggKG1zZy50eXBlKSB7XG4gICAgICAgIGNhc2UgJ3Byb2Nlc3MtdGFzayc6XG4gICAgICAgICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICAgICAgICBgW1dvcmtlciAjJHtjbHVzdGVyLndvcmtlci5pZH1dIFByb2Nlc3NpbmcgdGFzazogJHtzdHJpbmdpZnlUYXNrKG1zZy50YXNrKX1gKTtcbiAgICAgICAgICByZXR1cm4gY29tcGlsZShtc2cudGFzayk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgW1dvcmtlciAjJHtjbHVzdGVyLndvcmtlci5pZH1dIEludmFsaWQgbWVzc2FnZSByZWNlaXZlZDogJHtKU09OLnN0cmluZ2lmeShtc2cpfWApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgc2VuZE1lc3NhZ2VUb01hc3Rlcih7XG4gICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIGVycm9yOiAoZXJyIGluc3RhbmNlb2YgRXJyb3IpID8gKGVyci5zdGFjayB8fCBlcnIubWVzc2FnZSkgOiBlcnIsXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIFJldHVybiBhIHByb21pc2UgdGhhdCBpcyBuZXZlciByZXNvbHZlZC5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKCgpID0+IHVuZGVmaW5lZCk7XG59Il19