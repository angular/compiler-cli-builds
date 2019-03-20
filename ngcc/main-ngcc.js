#!/usr/bin/env node
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/main-ngcc", ["require", "exports", "canonical-path", "yargs", "@angular/compiler-cli/ngcc/src/main"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path = require("canonical-path");
    var yargs = require("yargs");
    var main_1 = require("@angular/compiler-cli/ngcc/src/main");
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
            describe: 'If specified then only the first matching package.json property will be compiled',
            type: 'boolean'
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
        try {
            main_1.mainNgcc({ basePath: baseSourcePath, propertiesToConsider: propertiesToConsider, targetEntryPointPath: targetEntryPointPath, compileAllFormats: compileAllFormats });
            process.exitCode = 0;
        }
        catch (e) {
            console.error(e.stack || e.message);
            process.exitCode = 1;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1uZ2NjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2MvbWFpbi1uZ2NjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVFBLHFDQUF1QztJQUN2Qyw2QkFBK0I7SUFFL0IsNERBQW9DO0lBRXBDLGtCQUFrQjtJQUNsQixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO1FBQzNCLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLElBQU0sT0FBTyxHQUNULEtBQUs7YUFDQSxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7WUFDZixRQUFRLEVBQ0oscUZBQXFGO1lBQ3pGLE9BQU8sRUFBRSxnQkFBZ0I7U0FDMUIsQ0FBQzthQUNELE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDO2FBQzFELE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDWCxLQUFLLEVBQUUsWUFBWTtZQUNuQixLQUFLLEVBQUUsSUFBSTtZQUNYLFFBQVEsRUFDSiwwRkFBMEY7Z0JBQzFGLHFFQUFxRTtnQkFDckUsNkVBQTZFO2dCQUM3RSxzSkFBc0o7U0FDM0osQ0FBQzthQUNELE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDWCxLQUFLLEVBQUUsUUFBUTtZQUNmLFFBQVEsRUFDSixzR0FBc0c7U0FDM0csQ0FBQzthQUNELE1BQU0sQ0FBQyxZQUFZLEVBQUU7WUFDcEIsUUFBUSxFQUNKLGtGQUFrRjtZQUN0RixJQUFJLEVBQUUsU0FBUztTQUNoQixDQUFDO2FBQ0QsSUFBSSxFQUFFO2FBQ04sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXJCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7WUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FDVCwrR0FBK0csQ0FBQyxDQUFDO1lBQ3JILE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakI7UUFDRCxJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3RFLElBQU0sb0JBQW9CLEdBQWEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BELElBQU0sb0JBQW9CLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUNyRSxJQUFNLGlCQUFpQixHQUFHLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2pELElBQUk7WUFDRixlQUFRLENBQ0osRUFBQyxRQUFRLEVBQUUsY0FBYyxFQUFFLG9CQUFvQixzQkFBQSxFQUFFLG9CQUFvQixzQkFBQSxFQUFFLGlCQUFpQixtQkFBQSxFQUFDLENBQUMsQ0FBQztZQUMvRixPQUFPLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztTQUN0QjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNwQyxPQUFPLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztTQUN0QjtLQUNGIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdjYW5vbmljYWwtcGF0aCc7XG5pbXBvcnQgKiBhcyB5YXJncyBmcm9tICd5YXJncyc7XG5cbmltcG9ydCB7bWFpbk5nY2N9IGZyb20gJy4vc3JjL21haW4nO1xuXG4vLyBDTEkgZW50cnkgcG9pbnRcbmlmIChyZXF1aXJlLm1haW4gPT09IG1vZHVsZSkge1xuICBjb25zdCBhcmdzID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuICBjb25zdCBvcHRpb25zID1cbiAgICAgIHlhcmdzXG4gICAgICAgICAgLm9wdGlvbigncycsIHtcbiAgICAgICAgICAgIGFsaWFzOiAnc291cmNlJyxcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdBIHBhdGggKHJlbGF0aXZlIHRvIHRoZSB3b3JraW5nIGRpcmVjdG9yeSkgb2YgdGhlIGBub2RlX21vZHVsZXNgIGZvbGRlciB0byBwcm9jZXNzLicsXG4gICAgICAgICAgICBkZWZhdWx0OiAnLi9ub2RlX21vZHVsZXMnXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdmJywge2FsaWFzOiAnZm9ybWF0cycsIGhpZGRlbjrCoHRydWUsIGFycmF5OiB0cnVlfSlcbiAgICAgICAgICAub3B0aW9uKCdwJywge1xuICAgICAgICAgICAgYWxpYXM6ICdwcm9wZXJ0aWVzJyxcbiAgICAgICAgICAgIGFycmF5OiB0cnVlLFxuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0FuIGFycmF5IG9mIG5hbWVzIG9mIHByb3BlcnRpZXMgaW4gcGFja2FnZS5qc29uIHRvIGNvbXBpbGUgKGUuZy4gYG1vZHVsZWAgb3IgYGVzMjAxNWApXFxuJyArXG4gICAgICAgICAgICAgICAgJ0VhY2ggb2YgdGhlc2UgcHJvcGVydGllcyBzaG91bGQgaG9sZCB0aGUgcGF0aCB0byBhIGJ1bmRsZS1mb3JtYXQuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0lmIHByb3ZpZGVkLCBvbmx5IHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcyBhcmUgY29uc2lkZXJlZCBmb3IgcHJvY2Vzc2luZy5cXG4nICtcbiAgICAgICAgICAgICAgICAnSWYgbm90IHByb3ZpZGVkLCBhbGwgdGhlIHN1cHBvcnRlZCBmb3JtYXQgcHJvcGVydGllcyAoZS5nLiBmZXNtMjAxNSwgZmVzbTUsIGVzMjAxNSwgZXNtMjAxNSwgZXNtNSwgbWFpbiwgbW9kdWxlKSBpbiB0aGUgcGFja2FnZS5qc29uIGFyZSBjb25zaWRlcmVkLidcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ3QnLCB7XG4gICAgICAgICAgICBhbGlhczogJ3RhcmdldCcsXG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnQSByZWxhdGl2ZSBwYXRoIChmcm9tIHRoZSBgc291cmNlYCBwYXRoKSB0byBhIHNpbmdsZSBlbnRyeS1wb2ludCB0byBwcm9jZXNzIChwbHVzIGl0cyBkZXBlbmRlbmNpZXMpLicsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdmaXJzdC1vbmx5Jywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0lmIHNwZWNpZmllZCB0aGVuIG9ubHkgdGhlIGZpcnN0IG1hdGNoaW5nIHBhY2thZ2UuanNvbiBwcm9wZXJ0eSB3aWxsIGJlIGNvbXBpbGVkJyxcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmhlbHAoKVxuICAgICAgICAgIC5wYXJzZShhcmdzKTtcblxuICBpZiAob3B0aW9uc1snZiddICYmIG9wdGlvbnNbJ2YnXS5sZW5ndGgpIHtcbiAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAnVGhlIGZvcm1hdHMgb3B0aW9uICgtZi8tLWZvcm1hdHMpIGhhcyBiZWVuIHJlbW92ZWQuIENvbnNpZGVyIHRoZSBwcm9wZXJ0aWVzIG9wdGlvbiAoLXAvLS1wcm9wZXJ0aWVzKSBpbnN0ZWFkLicpO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfVxuICBjb25zdCBiYXNlU291cmNlUGF0aCA9IHBhdGgucmVzb2x2ZShvcHRpb25zWydzJ10gfHwgJy4vbm9kZV9tb2R1bGVzJyk7XG4gIGNvbnN0IHByb3BlcnRpZXNUb0NvbnNpZGVyOiBzdHJpbmdbXSA9IG9wdGlvbnNbJ3AnXTtcbiAgY29uc3QgdGFyZ2V0RW50cnlQb2ludFBhdGggPSBvcHRpb25zWyd0J10gPyBvcHRpb25zWyd0J10gOiB1bmRlZmluZWQ7XG4gIGNvbnN0IGNvbXBpbGVBbGxGb3JtYXRzID0gIW9wdGlvbnNbJ2ZpcnN0LW9ubHknXTtcbiAgdHJ5IHtcbiAgICBtYWluTmdjYyhcbiAgICAgICAge2Jhc2VQYXRoOiBiYXNlU291cmNlUGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXIsIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBjb21waWxlQWxsRm9ybWF0c30pO1xuICAgIHByb2Nlc3MuZXhpdENvZGUgPSAwO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcihlLnN0YWNrIHx8IGUubWVzc2FnZSk7XG4gICAgcHJvY2Vzcy5leGl0Q29kZSA9IDE7XG4gIH1cbn1cbiJdfQ==