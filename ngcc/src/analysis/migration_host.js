(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/migration_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/ngcc/src/analysis/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DefaultMigrationHost = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
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
                for (var migratedTraits_1 = tslib_1.__values(migratedTraits), migratedTraits_1_1 = migratedTraits_1.next(); !migratedTraits_1_1.done; migratedTraits_1_1 = migratedTraits_1.next()) {
                    var trait = migratedTraits_1_1.value;
                    if (trait.state === transform_1.TraitState.ERRORED) {
                        trait.diagnostics =
                            trait.diagnostics.map(function (diag) { return createMigrationDiagnostic(diag, clazz, decorator); });
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
            return util_1.isWithinPackage(this.entryPointPath, clazz.getSourceFile());
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
        var clone = tslib_1.__assign({}, diagnostic);
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
                (_a = clone.messageText.next).push.apply(_a, tslib_1.__spread(chain));
            }
        }
        return clone;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlncmF0aW9uX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvYW5hbHlzaXMvbWlncmF0aW9uX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQU1qQyx1RUFBc0U7SUFLdEUscUVBQXVDO0lBRXZDOztPQUVHO0lBQ0g7UUFDRSw4QkFDYSxjQUFrQyxFQUFXLFFBQXdCLEVBQ3JFLFNBQTJCLEVBQVUsUUFBMkIsRUFDakUsY0FBOEI7WUFGN0IsbUJBQWMsR0FBZCxjQUFjLENBQW9CO1lBQVcsYUFBUSxHQUFSLFFBQVEsQ0FBZ0I7WUFDckUsY0FBUyxHQUFULFNBQVMsQ0FBa0I7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFtQjtZQUNqRSxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFBRyxDQUFDO1FBRTlDLHVEQUF3QixHQUF4QixVQUF5QixLQUF1QixFQUFFLFNBQW9CLEVBQUUsS0FBb0I7O1lBRTFGLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQzs7Z0JBRXZGLEtBQW9CLElBQUEsbUJBQUEsaUJBQUEsY0FBYyxDQUFBLDhDQUFBLDBFQUFFO29CQUEvQixJQUFNLEtBQUssMkJBQUE7b0JBQ2QsSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLHNCQUFVLENBQUMsT0FBTyxFQUFFO3dCQUN0QyxLQUFLLENBQUMsV0FBVzs0QkFDYixLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLHlCQUF5QixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQWpELENBQWlELENBQUMsQ0FBQztxQkFDdEY7aUJBQ0Y7Ozs7Ozs7OztRQUNILENBQUM7UUFFRCwrQ0FBZ0IsR0FBaEIsVUFBaUIsS0FBdUI7WUFDdEMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFRCx3Q0FBUyxHQUFULFVBQVUsS0FBdUI7WUFDL0IsT0FBTyxzQkFBZSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7UUFDckUsQ0FBQztRQUNILDJCQUFDO0lBQUQsQ0FBQyxBQXpCRCxJQXlCQztJQXpCWSxvREFBb0I7SUEyQmpDOzs7T0FHRztJQUNILFNBQVMseUJBQXlCLENBQzlCLFVBQXlCLEVBQUUsTUFBZSxFQUFFLFNBQW9COztRQUNsRSxJQUFNLEtBQUssd0JBQU8sVUFBVSxDQUFDLENBQUM7UUFFOUIsSUFBTSxLQUFLLEdBQWdDLENBQUM7Z0JBQzFDLFdBQVcsRUFBRSxpQkFBZSxTQUFTLENBQUMsSUFBSSxrREFBK0M7Z0JBQ3pGLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTztnQkFDdkMsSUFBSSxFQUFFLENBQUM7YUFDUixDQUFDLENBQUM7UUFFSCxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO1lBQzNCLElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFiLENBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqRSxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNULFdBQVcsRUFBRSxNQUFJLFNBQVMsQ0FBQyxJQUFJLFNBQUksSUFBSSxNQUFHO2dCQUMxQyxRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU87Z0JBQ3ZDLElBQUksRUFBRSxDQUFDO2FBQ1IsQ0FBQyxDQUFDO1NBQ0o7UUFFRCxJQUFJLE9BQU8sS0FBSyxDQUFDLFdBQVcsS0FBSyxRQUFRLEVBQUU7WUFDekMsS0FBSyxDQUFDLFdBQVcsR0FBRztnQkFDbEIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO2dCQUM5QixRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7Z0JBQzdCLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSTtnQkFDckIsSUFBSSxFQUFFLEtBQUs7YUFDWixDQUFDO1NBQ0g7YUFBTTtZQUNMLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO2dCQUN4QyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7YUFDaEM7aUJBQU07Z0JBQ0wsQ0FBQSxLQUFBLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFBLENBQUMsSUFBSSw0QkFBSSxLQUFLLEdBQUU7YUFDdkM7U0FDRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtNZXRhZGF0YVJlYWRlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL21ldGFkYXRhJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjb3JhdG9yfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0hhbmRsZXJGbGFncywgVHJhaXRTdGF0ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtNaWdyYXRpb25Ib3N0fSBmcm9tICcuLi9taWdyYXRpb25zL21pZ3JhdGlvbic7XG5cbmltcG9ydCB7TmdjY1RyYWl0Q29tcGlsZXJ9IGZyb20gJy4vbmdjY190cmFpdF9jb21waWxlcic7XG5pbXBvcnQge2lzV2l0aGluUGFja2FnZX0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBUaGUgc3RhbmRhcmQgaW1wbGVtZW50YXRpb24gb2YgYE1pZ3JhdGlvbkhvc3RgLCB3aGljaCBpcyBjcmVhdGVkIGJ5IHRoZSBgRGVjb3JhdGlvbkFuYWx5emVyYC5cbiAqL1xuZXhwb3J0IGNsYXNzIERlZmF1bHRNaWdyYXRpb25Ib3N0IGltcGxlbWVudHMgTWlncmF0aW9uSG9zdCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgcmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcmVhZG9ubHkgbWV0YWRhdGE6IE1ldGFkYXRhUmVhZGVyLFxuICAgICAgcmVhZG9ubHkgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLCBwcml2YXRlIGNvbXBpbGVyOiBOZ2NjVHJhaXRDb21waWxlcixcbiAgICAgIHByaXZhdGUgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKSB7fVxuXG4gIGluamVjdFN5bnRoZXRpY0RlY29yYXRvcihjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGZsYWdzPzogSGFuZGxlckZsYWdzKTpcbiAgICAgIHZvaWQge1xuICAgIGNvbnN0IG1pZ3JhdGVkVHJhaXRzID0gdGhpcy5jb21waWxlci5pbmplY3RTeW50aGV0aWNEZWNvcmF0b3IoY2xhenosIGRlY29yYXRvciwgZmxhZ3MpO1xuXG4gICAgZm9yIChjb25zdCB0cmFpdCBvZiBtaWdyYXRlZFRyYWl0cykge1xuICAgICAgaWYgKHRyYWl0LnN0YXRlID09PSBUcmFpdFN0YXRlLkVSUk9SRUQpIHtcbiAgICAgICAgdHJhaXQuZGlhZ25vc3RpY3MgPVxuICAgICAgICAgICAgdHJhaXQuZGlhZ25vc3RpY3MubWFwKGRpYWcgPT4gY3JlYXRlTWlncmF0aW9uRGlhZ25vc3RpYyhkaWFnLCBjbGF6eiwgZGVjb3JhdG9yKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0QWxsRGVjb3JhdG9ycyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IERlY29yYXRvcltdfG51bGwge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldEFsbERlY29yYXRvcnMoY2xhenopO1xuICB9XG5cbiAgaXNJblNjb3BlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGlzV2l0aGluUGFja2FnZSh0aGlzLmVudHJ5UG9pbnRQYXRoLCBjbGF6ei5nZXRTb3VyY2VGaWxlKCkpO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGRpYWdub3N0aWMgZnJvbSBhbm90aGVyIG9uZSwgY29udGFpbmluZyBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIGFib3V0IHRoZSBzeW50aGV0aWNcbiAqIGRlY29yYXRvci5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlTWlncmF0aW9uRGlhZ25vc3RpYyhcbiAgICBkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljLCBzb3VyY2U6IHRzLk5vZGUsIGRlY29yYXRvcjogRGVjb3JhdG9yKTogdHMuRGlhZ25vc3RpYyB7XG4gIGNvbnN0IGNsb25lID0gey4uLmRpYWdub3N0aWN9O1xuXG4gIGNvbnN0IGNoYWluOiB0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluW10gPSBbe1xuICAgIG1lc3NhZ2VUZXh0OiBgT2NjdXJzIGZvciBAJHtkZWNvcmF0b3IubmFtZX0gZGVjb3JhdG9yIGluc2VydGVkIGJ5IGFuIGF1dG9tYXRpYyBtaWdyYXRpb25gLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuTWVzc2FnZSxcbiAgICBjb2RlOiAwLFxuICB9XTtcblxuICBpZiAoZGVjb3JhdG9yLmFyZ3MgIT09IG51bGwpIHtcbiAgICBjb25zdCBhcmdzID0gZGVjb3JhdG9yLmFyZ3MubWFwKGFyZyA9PiBhcmcuZ2V0VGV4dCgpKS5qb2luKCcsICcpO1xuICAgIGNoYWluLnB1c2goe1xuICAgICAgbWVzc2FnZVRleHQ6IGBAJHtkZWNvcmF0b3IubmFtZX0oJHthcmdzfSlgLFxuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlLFxuICAgICAgY29kZTogMCxcbiAgICB9KTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgY2xvbmUubWVzc2FnZVRleHQgPT09ICdzdHJpbmcnKSB7XG4gICAgY2xvbmUubWVzc2FnZVRleHQgPSB7XG4gICAgICBtZXNzYWdlVGV4dDogY2xvbmUubWVzc2FnZVRleHQsXG4gICAgICBjYXRlZ29yeTogZGlhZ25vc3RpYy5jYXRlZ29yeSxcbiAgICAgIGNvZGU6IGRpYWdub3N0aWMuY29kZSxcbiAgICAgIG5leHQ6IGNoYWluLFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgaWYgKGNsb25lLm1lc3NhZ2VUZXh0Lm5leHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xvbmUubWVzc2FnZVRleHQubmV4dCA9IGNoYWluO1xuICAgIH0gZWxzZSB7XG4gICAgICBjbG9uZS5tZXNzYWdlVGV4dC5uZXh0LnB1c2goLi4uY2hhaW4pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY2xvbmU7XG59XG4iXX0=