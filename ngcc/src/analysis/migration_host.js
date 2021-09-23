(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/migration_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/ngcc/src/analysis/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DefaultMigrationHost = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var util_1 = require("@angular/compiler-cli/ngcc/src/analysis/util");
    /**
     * The standard implementation of `MigrationHost`, which is created by the `DecorationAnalyzer`.
     */
    var DefaultMigrationHost = /** @class */ (function () {
        function DefaultMigrationHost(reflectionHost, metadata, evaluator, compiler, entryPointPath) {
            this.reflectionHost = reflectionHost;
            this.metadata = metadata;
            this.evaluator = evaluator;
            this.compiler = compiler;
            this.entryPointPath = entryPointPath;
        }
        DefaultMigrationHost.prototype.injectSyntheticDecorator = function (clazz, decorator, flags) {
            var e_1, _a;
            var migratedTraits = this.compiler.injectSyntheticDecorator(clazz, decorator, flags);
            try {
                for (var migratedTraits_1 = (0, tslib_1.__values)(migratedTraits), migratedTraits_1_1 = migratedTraits_1.next(); !migratedTraits_1_1.done; migratedTraits_1_1 = migratedTraits_1.next()) {
                    var trait = migratedTraits_1_1.value;
                    if ((trait.state === transform_1.TraitState.Analyzed || trait.state === transform_1.TraitState.Resolved) &&
                        trait.analysisDiagnostics !== null) {
                        trait.analysisDiagnostics = trait.analysisDiagnostics.map(function (diag) { return createMigrationDiagnostic(diag, clazz, decorator); });
                    }
                    if (trait.state === transform_1.TraitState.Resolved && trait.resolveDiagnostics !== null) {
                        trait.resolveDiagnostics =
                            trait.resolveDiagnostics.map(function (diag) { return createMigrationDiagnostic(diag, clazz, decorator); });
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (migratedTraits_1_1 && !migratedTraits_1_1.done && (_a = migratedTraits_1.return)) _a.call(migratedTraits_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        DefaultMigrationHost.prototype.getAllDecorators = function (clazz) {
            return this.compiler.getAllDecorators(clazz);
        };
        DefaultMigrationHost.prototype.isInScope = function (clazz) {
            return (0, util_1.isWithinPackage)(this.entryPointPath, (0, file_system_1.absoluteFromSourceFile)(clazz.getSourceFile()));
        };
        return DefaultMigrationHost;
    }());
    exports.DefaultMigrationHost = DefaultMigrationHost;
    /**
     * Creates a diagnostic from another one, containing additional information about the synthetic
     * decorator.
     */
    function createMigrationDiagnostic(diagnostic, source, decorator) {
        var _a;
        var clone = (0, tslib_1.__assign)({}, diagnostic);
        var chain = [{
                messageText: "Occurs for @" + decorator.name + " decorator inserted by an automatic migration",
                category: ts.DiagnosticCategory.Message,
                code: 0,
            }];
        if (decorator.args !== null) {
            var args = decorator.args.map(function (arg) { return arg.getText(); }).join(', ');
            chain.push({
                messageText: "@" + decorator.name + "(" + args + ")",
                category: ts.DiagnosticCategory.Message,
                code: 0,
            });
        }
        if (typeof clone.messageText === 'string') {
            clone.messageText = {
                messageText: clone.messageText,
                category: diagnostic.category,
                code: diagnostic.code,
                next: chain,
            };
        }
        else {
            if (clone.messageText.next === undefined) {
                clone.messageText.next = chain;
            }
            else {
                (_a = clone.messageText.next).push.apply(_a, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(chain), false));
            }
        }
        return clone;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlncmF0aW9uX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvYW5hbHlzaXMvbWlncmF0aW9uX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUVqQywyRUFBc0Y7SUFJdEYsdUVBQXNFO0lBS3RFLHFFQUF1QztJQUV2Qzs7T0FFRztJQUNIO1FBQ0UsOEJBQ2EsY0FBa0MsRUFBVyxRQUF3QixFQUNyRSxTQUEyQixFQUFVLFFBQTJCLEVBQ2pFLGNBQThCO1lBRjdCLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtZQUFXLGFBQVEsR0FBUixRQUFRLENBQWdCO1lBQ3JFLGNBQVMsR0FBVCxTQUFTLENBQWtCO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7WUFDakUsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQUcsQ0FBQztRQUU5Qyx1REFBd0IsR0FBeEIsVUFBeUIsS0FBdUIsRUFBRSxTQUFvQixFQUFFLEtBQW9COztZQUUxRixJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7O2dCQUV2RixLQUFvQixJQUFBLG1CQUFBLHNCQUFBLGNBQWMsQ0FBQSw4Q0FBQSwwRUFBRTtvQkFBL0IsSUFBTSxLQUFLLDJCQUFBO29CQUNkLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLHNCQUFVLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssc0JBQVUsQ0FBQyxRQUFRLENBQUM7d0JBQzVFLEtBQUssQ0FBQyxtQkFBbUIsS0FBSyxJQUFJLEVBQUU7d0JBQ3RDLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxLQUFLLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUNyRCxVQUFBLElBQUksSUFBSSxPQUFBLHlCQUF5QixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQWpELENBQWlELENBQUMsQ0FBQztxQkFDaEU7b0JBQ0QsSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLHNCQUFVLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsS0FBSyxJQUFJLEVBQUU7d0JBQzVFLEtBQUssQ0FBQyxrQkFBa0I7NEJBQ3BCLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFqRCxDQUFpRCxDQUFDLENBQUM7cUJBQzdGO2lCQUNGOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBRUQsK0NBQWdCLEdBQWhCLFVBQWlCLEtBQXVCO1lBQ3RDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBRUQsd0NBQVMsR0FBVCxVQUFVLEtBQXVCO1lBQy9CLE9BQU8sSUFBQSxzQkFBZSxFQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBQSxvQ0FBc0IsRUFBQyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdGLENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUE5QkQsSUE4QkM7SUE5Qlksb0RBQW9CO0lBZ0NqQzs7O09BR0c7SUFDSCxTQUFTLHlCQUF5QixDQUM5QixVQUF5QixFQUFFLE1BQWUsRUFBRSxTQUFvQjs7UUFDbEUsSUFBTSxLQUFLLDZCQUFPLFVBQVUsQ0FBQyxDQUFDO1FBRTlCLElBQU0sS0FBSyxHQUFnQyxDQUFDO2dCQUMxQyxXQUFXLEVBQUUsaUJBQWUsU0FBUyxDQUFDLElBQUksa0RBQStDO2dCQUN6RixRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU87Z0JBQ3ZDLElBQUksRUFBRSxDQUFDO2FBQ1IsQ0FBQyxDQUFDO1FBRUgsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtZQUMzQixJQUFNLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEdBQUcsQ0FBQyxPQUFPLEVBQUUsRUFBYixDQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakUsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVCxXQUFXLEVBQUUsTUFBSSxTQUFTLENBQUMsSUFBSSxTQUFJLElBQUksTUFBRztnQkFDMUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO2dCQUN2QyxJQUFJLEVBQUUsQ0FBQzthQUNSLENBQUMsQ0FBQztTQUNKO1FBRUQsSUFBSSxPQUFPLEtBQUssQ0FBQyxXQUFXLEtBQUssUUFBUSxFQUFFO1lBQ3pDLEtBQUssQ0FBQyxXQUFXLEdBQUc7Z0JBQ2xCLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVztnQkFDOUIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRO2dCQUM3QixJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUk7Z0JBQ3JCLElBQUksRUFBRSxLQUFLO2FBQ1osQ0FBQztTQUNIO2FBQU07WUFDTCxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtnQkFDeEMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO2FBQ2hDO2lCQUFNO2dCQUNMLENBQUEsS0FBQSxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQSxDQUFDLElBQUksOERBQUksS0FBSyxXQUFFO2FBQ3ZDO1NBQ0Y7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtNZXRhZGF0YVJlYWRlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL21ldGFkYXRhJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjb3JhdG9yfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0hhbmRsZXJGbGFncywgVHJhaXRTdGF0ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtNaWdyYXRpb25Ib3N0fSBmcm9tICcuLi9taWdyYXRpb25zL21pZ3JhdGlvbic7XG5cbmltcG9ydCB7TmdjY1RyYWl0Q29tcGlsZXJ9IGZyb20gJy4vbmdjY190cmFpdF9jb21waWxlcic7XG5pbXBvcnQge2lzV2l0aGluUGFja2FnZX0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBUaGUgc3RhbmRhcmQgaW1wbGVtZW50YXRpb24gb2YgYE1pZ3JhdGlvbkhvc3RgLCB3aGljaCBpcyBjcmVhdGVkIGJ5IHRoZSBgRGVjb3JhdGlvbkFuYWx5emVyYC5cbiAqL1xuZXhwb3J0IGNsYXNzIERlZmF1bHRNaWdyYXRpb25Ib3N0IGltcGxlbWVudHMgTWlncmF0aW9uSG9zdCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgcmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcmVhZG9ubHkgbWV0YWRhdGE6IE1ldGFkYXRhUmVhZGVyLFxuICAgICAgcmVhZG9ubHkgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLCBwcml2YXRlIGNvbXBpbGVyOiBOZ2NjVHJhaXRDb21waWxlcixcbiAgICAgIHByaXZhdGUgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKSB7fVxuXG4gIGluamVjdFN5bnRoZXRpY0RlY29yYXRvcihjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGZsYWdzPzogSGFuZGxlckZsYWdzKTpcbiAgICAgIHZvaWQge1xuICAgIGNvbnN0IG1pZ3JhdGVkVHJhaXRzID0gdGhpcy5jb21waWxlci5pbmplY3RTeW50aGV0aWNEZWNvcmF0b3IoY2xhenosIGRlY29yYXRvciwgZmxhZ3MpO1xuXG4gICAgZm9yIChjb25zdCB0cmFpdCBvZiBtaWdyYXRlZFRyYWl0cykge1xuICAgICAgaWYgKCh0cmFpdC5zdGF0ZSA9PT0gVHJhaXRTdGF0ZS5BbmFseXplZCB8fCB0cmFpdC5zdGF0ZSA9PT0gVHJhaXRTdGF0ZS5SZXNvbHZlZCkgJiZcbiAgICAgICAgICB0cmFpdC5hbmFseXNpc0RpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICAgIHRyYWl0LmFuYWx5c2lzRGlhZ25vc3RpY3MgPSB0cmFpdC5hbmFseXNpc0RpYWdub3N0aWNzLm1hcChcbiAgICAgICAgICAgIGRpYWcgPT4gY3JlYXRlTWlncmF0aW9uRGlhZ25vc3RpYyhkaWFnLCBjbGF6eiwgZGVjb3JhdG9yKSk7XG4gICAgICB9XG4gICAgICBpZiAodHJhaXQuc3RhdGUgPT09IFRyYWl0U3RhdGUuUmVzb2x2ZWQgJiYgdHJhaXQucmVzb2x2ZURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICAgIHRyYWl0LnJlc29sdmVEaWFnbm9zdGljcyA9XG4gICAgICAgICAgICB0cmFpdC5yZXNvbHZlRGlhZ25vc3RpY3MubWFwKGRpYWcgPT4gY3JlYXRlTWlncmF0aW9uRGlhZ25vc3RpYyhkaWFnLCBjbGF6eiwgZGVjb3JhdG9yKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0QWxsRGVjb3JhdG9ycyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IERlY29yYXRvcltdfG51bGwge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldEFsbERlY29yYXRvcnMoY2xhenopO1xuICB9XG5cbiAgaXNJblNjb3BlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGlzV2l0aGluUGFja2FnZSh0aGlzLmVudHJ5UG9pbnRQYXRoLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGNsYXp6LmdldFNvdXJjZUZpbGUoKSkpO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGRpYWdub3N0aWMgZnJvbSBhbm90aGVyIG9uZSwgY29udGFpbmluZyBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIGFib3V0IHRoZSBzeW50aGV0aWNcbiAqIGRlY29yYXRvci5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlTWlncmF0aW9uRGlhZ25vc3RpYyhcbiAgICBkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljLCBzb3VyY2U6IHRzLk5vZGUsIGRlY29yYXRvcjogRGVjb3JhdG9yKTogdHMuRGlhZ25vc3RpYyB7XG4gIGNvbnN0IGNsb25lID0gey4uLmRpYWdub3N0aWN9O1xuXG4gIGNvbnN0IGNoYWluOiB0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluW10gPSBbe1xuICAgIG1lc3NhZ2VUZXh0OiBgT2NjdXJzIGZvciBAJHtkZWNvcmF0b3IubmFtZX0gZGVjb3JhdG9yIGluc2VydGVkIGJ5IGFuIGF1dG9tYXRpYyBtaWdyYXRpb25gLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuTWVzc2FnZSxcbiAgICBjb2RlOiAwLFxuICB9XTtcblxuICBpZiAoZGVjb3JhdG9yLmFyZ3MgIT09IG51bGwpIHtcbiAgICBjb25zdCBhcmdzID0gZGVjb3JhdG9yLmFyZ3MubWFwKGFyZyA9PiBhcmcuZ2V0VGV4dCgpKS5qb2luKCcsICcpO1xuICAgIGNoYWluLnB1c2goe1xuICAgICAgbWVzc2FnZVRleHQ6IGBAJHtkZWNvcmF0b3IubmFtZX0oJHthcmdzfSlgLFxuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlLFxuICAgICAgY29kZTogMCxcbiAgICB9KTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgY2xvbmUubWVzc2FnZVRleHQgPT09ICdzdHJpbmcnKSB7XG4gICAgY2xvbmUubWVzc2FnZVRleHQgPSB7XG4gICAgICBtZXNzYWdlVGV4dDogY2xvbmUubWVzc2FnZVRleHQsXG4gICAgICBjYXRlZ29yeTogZGlhZ25vc3RpYy5jYXRlZ29yeSxcbiAgICAgIGNvZGU6IGRpYWdub3N0aWMuY29kZSxcbiAgICAgIG5leHQ6IGNoYWluLFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgaWYgKGNsb25lLm1lc3NhZ2VUZXh0Lm5leHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xvbmUubWVzc2FnZVRleHQubmV4dCA9IGNoYWluO1xuICAgIH0gZWxzZSB7XG4gICAgICBjbG9uZS5tZXNzYWdlVGV4dC5uZXh0LnB1c2goLi4uY2hhaW4pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY2xvbmU7XG59XG4iXX0=