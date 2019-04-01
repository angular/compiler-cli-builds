#!/usr/bin/env node
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/main-ngcc", ["require", "exports", "canonical-path", "yargs", "@angular/compiler-cli/ngcc/src/main", "@angular/compiler-cli/ngcc/src/logging/console_logger"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path = require("canonical-path");
    var yargs = require("yargs");
    var main_1 = require("@angular/compiler-cli/ngcc/src/main");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    // CLI entry point
    if (require.main === module) {
        var args = process.argv.slice(2);
        var options = yargs
            .option('s', {
            alias: 'source',
            describe: 'A path (relative to the working directory) of the `node_modules` folder to process.',
            default: './node_modules'
        })
            .option('f', { alias: 'formats', hidden: true, array: true })
            .option('p', {
            alias: 'properties',
            array: true,
            describe: 'An array of names of properties in package.json to compile (e.g. `module` or `es2015`)\n' +
                'Each of these properties should hold the path to a bundle-format.\n' +
                'If provided, only the specified properties are considered for processing.\n' +
                'If not provided, all the supported format properties (e.g. fesm2015, fesm5, es2015, esm2015, esm5, main, module) in the package.json are considered.'
        })
            .option('t', {
            alias: 'target',
            describe: 'A relative path (from the `source` path) to a single entry-point to process (plus its dependencies).',
        })
            .option('first-only', {
            describe: 'If specified then only the first matching package.json property will be compiled.',
            type: 'boolean'
        })
            .option('l', {
            alias: 'loglevel',
            describe: 'The lowest severity logging message that should be output.',
            choices: ['debug', 'info', 'warn', 'error'],
        })
            .help()
            .parse(args);
        if (options['f'] && options['f'].length) {
            console.error('The formats option (-f/--formats) has been removed. Consider the properties option (-p/--properties) instead.');
            process.exit(1);
        }
        var baseSourcePath = path.resolve(options['s'] || './node_modules');
        var propertiesToConsider = options['p'];
        var targetEntryPointPath = options['t'] ? options['t'] : undefined;
        var compileAllFormats = !options['first-only'];
        var logLevel = options['l'];
        try {
            main_1.mainNgcc({
                basePath: baseSourcePath,
                propertiesToConsider: propertiesToConsider,
                targetEntryPointPath: targetEntryPointPath,
                compileAllFormats: compileAllFormats,
                logger: new console_logger_1.ConsoleLogger(console_logger_1.LogLevel[logLevel]),
            });
            process.exitCode = 0;
        }
        catch (e) {
            console.error(e.stack || e.message);
            process.exitCode = 1;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1uZ2NjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2MvbWFpbi1uZ2NjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVFBLHFDQUF1QztJQUN2Qyw2QkFBK0I7SUFFL0IsNERBQW9DO0lBQ3BDLHdGQUFxRTtJQUVyRSxrQkFBa0I7SUFDbEIsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtRQUMzQixJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFNLE9BQU8sR0FDVCxLQUFLO2FBQ0EsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1lBQ2YsUUFBUSxFQUNKLHFGQUFxRjtZQUN6RixPQUFPLEVBQUUsZ0JBQWdCO1NBQzFCLENBQUM7YUFDRCxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQzthQUMxRCxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFlBQVk7WUFDbkIsS0FBSyxFQUFFLElBQUk7WUFDWCxRQUFRLEVBQ0osMEZBQTBGO2dCQUMxRixxRUFBcUU7Z0JBQ3JFLDZFQUE2RTtnQkFDN0Usc0pBQXNKO1NBQzNKLENBQUM7YUFDRCxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7WUFDZixRQUFRLEVBQ0osc0dBQXNHO1NBQzNHLENBQUM7YUFDRCxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQ3BCLFFBQVEsRUFDSixtRkFBbUY7WUFDdkYsSUFBSSxFQUFFLFNBQVM7U0FDaEIsQ0FBQzthQUNELE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDWCxLQUFLLEVBQUUsVUFBVTtZQUNqQixRQUFRLEVBQUUsNERBQTREO1lBQ3RFLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQztTQUM1QyxDQUFDO2FBQ0QsSUFBSSxFQUFFO2FBQ04sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXJCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7WUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FDVCwrR0FBK0csQ0FBQyxDQUFDO1lBQ3JILE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakI7UUFDRCxJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3RFLElBQU0sb0JBQW9CLEdBQWEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BELElBQU0sb0JBQW9CLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUNyRSxJQUFNLGlCQUFpQixHQUFHLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2pELElBQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQTBCLENBQUM7UUFDdkQsSUFBSTtZQUNGLGVBQVEsQ0FBQztnQkFDUCxRQUFRLEVBQUUsY0FBYztnQkFDeEIsb0JBQW9CLHNCQUFBO2dCQUNwQixvQkFBb0Isc0JBQUE7Z0JBQ3BCLGlCQUFpQixtQkFBQTtnQkFDakIsTUFBTSxFQUFFLElBQUksOEJBQWEsQ0FBQyx5QkFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzlDLENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1NBQ3RCO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3BDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1NBQ3RCO0tBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCAqIGFzIHlhcmdzIGZyb20gJ3lhcmdzJztcblxuaW1wb3J0IHttYWluTmdjY30gZnJvbSAnLi9zcmMvbWFpbic7XG5pbXBvcnQge0NvbnNvbGVMb2dnZXIsIExvZ0xldmVsfSBmcm9tICcuL3NyYy9sb2dnaW5nL2NvbnNvbGVfbG9nZ2VyJztcblxuLy8gQ0xJIGVudHJ5IHBvaW50XG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgY29uc3QgYXJncyA9IHByb2Nlc3MuYXJndi5zbGljZSgyKTtcbiAgY29uc3Qgb3B0aW9ucyA9XG4gICAgICB5YXJnc1xuICAgICAgICAgIC5vcHRpb24oJ3MnLCB7XG4gICAgICAgICAgICBhbGlhczogJ3NvdXJjZScsXG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnQSBwYXRoIChyZWxhdGl2ZSB0byB0aGUgd29ya2luZyBkaXJlY3RvcnkpIG9mIHRoZSBgbm9kZV9tb2R1bGVzYCBmb2xkZXIgdG8gcHJvY2Vzcy4nLFxuICAgICAgICAgICAgZGVmYXVsdDogJy4vbm9kZV9tb2R1bGVzJ1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignZicsIHthbGlhczogJ2Zvcm1hdHMnLCBoaWRkZW46wqB0cnVlLCBhcnJheTogdHJ1ZX0pXG4gICAgICAgICAgLm9wdGlvbigncCcsIHtcbiAgICAgICAgICAgIGFsaWFzOiAncHJvcGVydGllcycsXG4gICAgICAgICAgICBhcnJheTogdHJ1ZSxcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdBbiBhcnJheSBvZiBuYW1lcyBvZiBwcm9wZXJ0aWVzIGluIHBhY2thZ2UuanNvbiB0byBjb21waWxlIChlLmcuIGBtb2R1bGVgIG9yIGBlczIwMTVgKVxcbicgK1xuICAgICAgICAgICAgICAgICdFYWNoIG9mIHRoZXNlIHByb3BlcnRpZXMgc2hvdWxkIGhvbGQgdGhlIHBhdGggdG8gYSBidW5kbGUtZm9ybWF0LlxcbicgK1xuICAgICAgICAgICAgICAgICdJZiBwcm92aWRlZCwgb25seSB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMgYXJlIGNvbnNpZGVyZWQgZm9yIHByb2Nlc3NpbmcuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0lmIG5vdCBwcm92aWRlZCwgYWxsIHRoZSBzdXBwb3J0ZWQgZm9ybWF0IHByb3BlcnRpZXMgKGUuZy4gZmVzbTIwMTUsIGZlc201LCBlczIwMTUsIGVzbTIwMTUsIGVzbTUsIG1haW4sIG1vZHVsZSkgaW4gdGhlIHBhY2thZ2UuanNvbiBhcmUgY29uc2lkZXJlZC4nXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCd0Jywge1xuICAgICAgICAgICAgYWxpYXM6ICd0YXJnZXQnLFxuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0EgcmVsYXRpdmUgcGF0aCAoZnJvbSB0aGUgYHNvdXJjZWAgcGF0aCkgdG8gYSBzaW5nbGUgZW50cnktcG9pbnQgdG8gcHJvY2VzcyAocGx1cyBpdHMgZGVwZW5kZW5jaWVzKS4nLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignZmlyc3Qtb25seScsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdJZiBzcGVjaWZpZWQgdGhlbiBvbmx5IHRoZSBmaXJzdCBtYXRjaGluZyBwYWNrYWdlLmpzb24gcHJvcGVydHkgd2lsbCBiZSBjb21waWxlZC4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdsJywge1xuICAgICAgICAgICAgYWxpYXM6ICdsb2dsZXZlbCcsXG4gICAgICAgICAgICBkZXNjcmliZTogJ1RoZSBsb3dlc3Qgc2V2ZXJpdHkgbG9nZ2luZyBtZXNzYWdlIHRoYXQgc2hvdWxkIGJlIG91dHB1dC4nLFxuICAgICAgICAgICAgY2hvaWNlczogWydkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5oZWxwKClcbiAgICAgICAgICAucGFyc2UoYXJncyk7XG5cbiAgaWYgKG9wdGlvbnNbJ2YnXSAmJiBvcHRpb25zWydmJ10ubGVuZ3RoKSB7XG4gICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgJ1RoZSBmb3JtYXRzIG9wdGlvbiAoLWYvLS1mb3JtYXRzKSBoYXMgYmVlbiByZW1vdmVkLiBDb25zaWRlciB0aGUgcHJvcGVydGllcyBvcHRpb24gKC1wLy0tcHJvcGVydGllcykgaW5zdGVhZC4nKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cbiAgY29uc3QgYmFzZVNvdXJjZVBhdGggPSBwYXRoLnJlc29sdmUob3B0aW9uc1sncyddIHx8ICcuL25vZGVfbW9kdWxlcycpO1xuICBjb25zdCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogc3RyaW5nW10gPSBvcHRpb25zWydwJ107XG4gIGNvbnN0IHRhcmdldEVudHJ5UG9pbnRQYXRoID0gb3B0aW9uc1sndCddID8gb3B0aW9uc1sndCddIDogdW5kZWZpbmVkO1xuICBjb25zdCBjb21waWxlQWxsRm9ybWF0cyA9ICFvcHRpb25zWydmaXJzdC1vbmx5J107XG4gIGNvbnN0IGxvZ0xldmVsID0gb3B0aW9uc1snbCddIGFzIGtleW9mIHR5cGVvZiBMb2dMZXZlbDtcbiAgdHJ5IHtcbiAgICBtYWluTmdjYyh7XG4gICAgICBiYXNlUGF0aDogYmFzZVNvdXJjZVBhdGgsXG4gICAgICBwcm9wZXJ0aWVzVG9Db25zaWRlcixcbiAgICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoLFxuICAgICAgY29tcGlsZUFsbEZvcm1hdHMsXG4gICAgICBsb2dnZXI6IG5ldyBDb25zb2xlTG9nZ2VyKExvZ0xldmVsW2xvZ0xldmVsXSksXG4gICAgfSk7XG4gICAgcHJvY2Vzcy5leGl0Q29kZSA9IDA7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGUuc3RhY2sgfHwgZS5tZXNzYWdlKTtcbiAgICBwcm9jZXNzLmV4aXRDb2RlID0gMTtcbiAgfVxufVxuIl19