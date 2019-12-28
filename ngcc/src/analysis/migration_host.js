(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/migration_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/ngcc/src/analysis/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var util_1 = require("@angular/compiler-cli/ngcc/src/analysis/util");
    /**
     * The standard implementation of `MigrationHost`, which is created by the
     * `DecorationAnalyzer`.
     */
    var DefaultMigrationHost = /** @class */ (function () {
        function DefaultMigrationHost(reflectionHost, metadata, evaluator, handlers, entryPointPath, analyzedFiles, diagnosticHandler) {
            this.reflectionHost = reflectionHost;
            this.metadata = metadata;
            this.evaluator = evaluator;
            this.handlers = handlers;
            this.entryPointPath = entryPointPath;
            this.analyzedFiles = analyzedFiles;
            this.diagnosticHandler = diagnosticHandler;
        }
        DefaultMigrationHost.prototype.injectSyntheticDecorator = function (clazz, decorator, flags) {
            var e_1, _a;
            var classSymbol = this.reflectionHost.getClassSymbol(clazz);
            var newAnalyzedClass = util_1.analyzeDecorators(classSymbol, [decorator], this.handlers, flags);
            if (newAnalyzedClass === null) {
                return;
            }
            if (newAnalyzedClass.diagnostics !== undefined) {
                try {
                    for (var _b = tslib_1.__values(newAnalyzedClass.diagnostics), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var diagnostic = _c.value;
                        this.diagnosticHandler(createMigrationDiagnostic(diagnostic, clazz, decorator));
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            var analyzedFile = getOrCreateAnalyzedFile(this.analyzedFiles, clazz.getSourceFile());
            var oldAnalyzedClass = analyzedFile.analyzedClasses.find(function (c) { return c.declaration === clazz; });
            if (oldAnalyzedClass === undefined) {
                analyzedFile.analyzedClasses.push(newAnalyzedClass);
            }
            else {
                mergeAnalyzedClasses(oldAnalyzedClass, newAnalyzedClass);
            }
        };
        DefaultMigrationHost.prototype.getAllDecorators = function (clazz) {
            var sourceFile = clazz.getSourceFile();
            var analyzedFile = this.analyzedFiles.find(function (file) { return file.sourceFile === sourceFile; });
            if (analyzedFile === undefined) {
                return null;
            }
            var analyzedClass = analyzedFile.analyzedClasses.find(function (c) { return c.declaration === clazz; });
            if (analyzedClass === undefined) {
                return null;
            }
            return analyzedClass.decorators;
        };
        DefaultMigrationHost.prototype.isInScope = function (clazz) {
            return util_1.isWithinPackage(this.entryPointPath, clazz.getSourceFile());
        };
        return DefaultMigrationHost;
    }());
    exports.DefaultMigrationHost = DefaultMigrationHost;
    function getOrCreateAnalyzedFile(analyzedFiles, sourceFile) {
        var analyzedFile = analyzedFiles.find(function (file) { return file.sourceFile === sourceFile; });
        if (analyzedFile !== undefined) {
            return analyzedFile;
        }
        else {
            var newAnalyzedFile = { sourceFile: sourceFile, analyzedClasses: [] };
            analyzedFiles.push(newAnalyzedFile);
            return newAnalyzedFile;
        }
    }
    function mergeAnalyzedClasses(oldClass, newClass) {
        var e_2, _a, _b, _c;
        if (newClass.decorators !== null) {
            if (oldClass.decorators === null) {
                oldClass.decorators = newClass.decorators;
            }
            else {
                var _loop_1 = function (newDecorator) {
                    if (oldClass.decorators.some(function (d) { return d.name === newDecorator.name; })) {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.NGCC_MIGRATION_DECORATOR_INJECTION_ERROR, newClass.declaration, "Attempted to inject \"" + newDecorator.name + "\" decorator over a pre-existing decorator with the same name on the \"" + newClass.name + "\" class.");
                    }
                };
                try {
                    for (var _d = tslib_1.__values(newClass.decorators), _e = _d.next(); !_e.done; _e = _d.next()) {
                        var newDecorator = _e.value;
                        _loop_1(newDecorator);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                (_b = oldClass.decorators).push.apply(_b, tslib_1.__spread(newClass.decorators));
            }
        }
        if (newClass.diagnostics !== undefined) {
            if (oldClass.diagnostics === undefined) {
                oldClass.diagnostics = newClass.diagnostics;
            }
            else {
                (_c = oldClass.diagnostics).push.apply(_c, tslib_1.__spread(newClass.diagnostics));
            }
        }
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlncmF0aW9uX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvYW5hbHlzaXMvbWlncmF0aW9uX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLDJFQUErRTtJQVUvRSxxRUFBMEQ7SUFFMUQ7OztPQUdHO0lBQ0g7UUFDRSw4QkFDYSxjQUFrQyxFQUFXLFFBQXdCLEVBQ3JFLFNBQTJCLEVBQzVCLFFBQXVELEVBQ3ZELGNBQThCLEVBQVUsYUFBNkIsRUFDckUsaUJBQWlEO1lBSmhELG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtZQUFXLGFBQVEsR0FBUixRQUFRLENBQWdCO1lBQ3JFLGNBQVMsR0FBVCxTQUFTLENBQWtCO1lBQzVCLGFBQVEsR0FBUixRQUFRLENBQStDO1lBQ3ZELG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtZQUFVLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtZQUNyRSxzQkFBaUIsR0FBakIsaUJBQWlCLENBQWdDO1FBQUcsQ0FBQztRQUVqRSx1REFBd0IsR0FBeEIsVUFBeUIsS0FBdUIsRUFBRSxTQUFvQixFQUFFLEtBQW9COztZQUUxRixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUcsQ0FBQztZQUNoRSxJQUFNLGdCQUFnQixHQUFHLHdCQUFpQixDQUFDLFdBQVcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0YsSUFBSSxnQkFBZ0IsS0FBSyxJQUFJLEVBQUU7Z0JBQzdCLE9BQU87YUFDUjtZQUVELElBQUksZ0JBQWdCLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRTs7b0JBQzlDLEtBQXlCLElBQUEsS0FBQSxpQkFBQSxnQkFBZ0Is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R0FBRyxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFiLENBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqRSxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNULFdBQVcsRUFBRSxNQUFJLFNBQVMsQ0FBQyxJQUFJLFNBQUksSUFBSSxNQUFHO2dCQUMxQyxRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU87Z0JBQ3ZDLElBQUksRUFBRSxDQUFDO2FBQ1IsQ0FBQyxDQUFDO1NBQ0o7UUFFRCxJQUFJLE9BQU8sS0FBSyxDQUFDLFdBQVcsS0FBSyxRQUFRLEVBQUU7WUFDekMsS0FBSyxDQUFDLFdBQVcsR0FBRztnQkFDbEIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO2dCQUM5QixRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7Z0JBQzdCLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSTtnQkFDckIsSUFBSSxFQUFFLEtBQUs7YUFDWixDQUFDO1NBQ0g7YUFBTTtZQUNMLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO2dCQUN4QyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7YUFDaEM7aUJBQU07Z0JBQ0wsQ0FBQSxLQUFBLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFBLENBQUMsSUFBSSw0QkFBSSxLQUFLLEdBQUU7YUFDdkM7U0FDRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtNZXRhZGF0YVJlYWRlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL21ldGFkYXRhJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjb3JhdG9yfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0RlY29yYXRvckhhbmRsZXIsIEhhbmRsZXJGbGFnc30gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtNaWdyYXRpb25Ib3N0fSBmcm9tICcuLi9taWdyYXRpb25zL21pZ3JhdGlvbic7XG5cbmltcG9ydCB7QW5hbHl6ZWRDbGFzcywgQW5hbHl6ZWRGaWxlfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7YW5hbHl6ZURlY29yYXRvcnMsIGlzV2l0aGluUGFja2FnZX0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBUaGUgc3RhbmRhcmQgaW1wbGVtZW50YXRpb24gb2YgYE1pZ3JhdGlvbkhvc3RgLCB3aGljaCBpcyBjcmVhdGVkIGJ5IHRoZVxuICogYERlY29yYXRpb25BbmFseXplcmAuXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWZhdWx0TWlncmF0aW9uSG9zdCBpbXBsZW1lbnRzIE1pZ3JhdGlvbkhvc3Qge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IHJlZmxlY3Rpb25Ib3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIHJlYWRvbmx5IG1ldGFkYXRhOiBNZXRhZGF0YVJlYWRlcixcbiAgICAgIHJlYWRvbmx5IGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICAgIHByaXZhdGUgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj5bXSxcbiAgICAgIHByaXZhdGUgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoLCBwcml2YXRlIGFuYWx5emVkRmlsZXM6IEFuYWx5emVkRmlsZVtdLFxuICAgICAgcHJpdmF0ZSBkaWFnbm9zdGljSGFuZGxlcjogKGVycm9yOiB0cy5EaWFnbm9zdGljKSA9PiB2b2lkKSB7fVxuXG4gIGluamVjdFN5bnRoZXRpY0RlY29yYXRvcihjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGZsYWdzPzogSGFuZGxlckZsYWdzKTpcbiAgICAgIHZvaWQge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5yZWZsZWN0aW9uSG9zdC5nZXRDbGFzc1N5bWJvbChjbGF6eikgITtcbiAgICBjb25zdCBuZXdBbmFseXplZENsYXNzID0gYW5hbHl6ZURlY29yYXRvcnMoY2xhc3NTeW1ib2wsIFtkZWNvcmF0b3JdLCB0aGlzLmhhbmRsZXJzLCBmbGFncyk7XG4gICAgaWYgKG5ld0FuYWx5emVkQ2xhc3MgPT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAobmV3QW5hbHl6ZWRDbGFzcy5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBmb3IgKGNvbnN0IGRpYWdub3N0aWMgb2YgbmV3QW5hbHl6ZWRDbGFzcy5kaWFnbm9zdGljcykge1xuICAgICAgICB0aGlzLmRpYWdub3N0aWNIYW5kbGVyKGNyZWF0ZU1pZ3JhdGlvbkRpYWdub3N0aWMoZGlhZ25vc3RpYywgY2xhenosIGRlY29yYXRvcikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGFuYWx5emVkRmlsZSA9IGdldE9yQ3JlYXRlQW5hbHl6ZWRGaWxlKHRoaXMuYW5hbHl6ZWRGaWxlcywgY2xhenouZ2V0U291cmNlRmlsZSgpKTtcbiAgICBjb25zdCBvbGRBbmFseXplZENsYXNzID0gYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5maW5kKGMgPT4gYy5kZWNsYXJhdGlvbiA9PT0gY2xhenopO1xuICAgIGlmIChvbGRBbmFseXplZENsYXNzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGFuYWx5emVkRmlsZS5hbmFseXplZENsYXNzZXMucHVzaChuZXdBbmFseXplZENsYXNzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVyZ2VBbmFseXplZENsYXNzZXMob2xkQW5hbHl6ZWRDbGFzcywgbmV3QW5hbHl6ZWRDbGFzcyk7XG4gICAgfVxuICB9XG5cbiAgZ2V0QWxsRGVjb3JhdG9ycyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSBjbGF6ei5nZXRTb3VyY2VGaWxlKCk7XG4gICAgY29uc3QgYW5hbHl6ZWRGaWxlID0gdGhpcy5hbmFseXplZEZpbGVzLmZpbmQoZmlsZSA9PiBmaWxlLnNvdXJjZUZpbGUgPT09IHNvdXJjZUZpbGUpO1xuICAgIGlmIChhbmFseXplZEZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgYW5hbHl6ZWRDbGFzcyA9IGFuYWx5emVkRmlsZS5hbmFseXplZENsYXNzZXMuZmluZChjID0+IGMuZGVjbGFyYXRpb24gPT09IGNsYXp6KTtcbiAgICBpZiAoYW5hbHl6ZWRDbGFzcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gYW5hbHl6ZWRDbGFzcy5kZWNvcmF0b3JzO1xuICB9XG5cbiAgaXNJblNjb3BlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGlzV2l0aGluUGFja2FnZSh0aGlzLmVudHJ5UG9pbnRQYXRoLCBjbGF6ei5nZXRTb3VyY2VGaWxlKCkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldE9yQ3JlYXRlQW5hbHl6ZWRGaWxlKFxuICAgIGFuYWx5emVkRmlsZXM6IEFuYWx5emVkRmlsZVtdLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogQW5hbHl6ZWRGaWxlIHtcbiAgY29uc3QgYW5hbHl6ZWRGaWxlID0gYW5hbHl6ZWRGaWxlcy5maW5kKGZpbGUgPT4gZmlsZS5zb3VyY2VGaWxlID09PSBzb3VyY2VGaWxlKTtcbiAgaWYgKGFuYWx5emVkRmlsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGFuYWx5emVkRmlsZTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBuZXdBbmFseXplZEZpbGU6IEFuYWx5emVkRmlsZSA9IHtzb3VyY2VGaWxlLCBhbmFseXplZENsYXNzZXM6IFtdfTtcbiAgICBhbmFseXplZEZpbGVzLnB1c2gobmV3QW5hbHl6ZWRGaWxlKTtcbiAgICByZXR1cm4gbmV3QW5hbHl6ZWRGaWxlO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1lcmdlQW5hbHl6ZWRDbGFzc2VzKG9sZENsYXNzOiBBbmFseXplZENsYXNzLCBuZXdDbGFzczogQW5hbHl6ZWRDbGFzcykge1xuICBpZiAobmV3Q2xhc3MuZGVjb3JhdG9ycyAhPT0gbnVsbCkge1xuICAgIGlmIChvbGRDbGFzcy5kZWNvcmF0b3JzID09PSBudWxsKSB7XG4gICAgICBvbGRDbGFzcy5kZWNvcmF0b3JzID0gbmV3Q2xhc3MuZGVjb3JhdG9ycztcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChjb25zdCBuZXdEZWNvcmF0b3Igb2YgbmV3Q2xhc3MuZGVjb3JhdG9ycykge1xuICAgICAgICBpZiAob2xkQ2xhc3MuZGVjb3JhdG9ycy5zb21lKGQgPT4gZC5uYW1lID09PSBuZXdEZWNvcmF0b3IubmFtZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5OR0NDX01JR1JBVElPTl9ERUNPUkFUT1JfSU5KRUNUSU9OX0VSUk9SLCBuZXdDbGFzcy5kZWNsYXJhdGlvbixcbiAgICAgICAgICAgICAgYEF0dGVtcHRlZCB0byBpbmplY3QgXCIke25ld0RlY29yYXRvci5uYW1lfVwiIGRlY29yYXRvciBvdmVyIGEgcHJlLWV4aXN0aW5nIGRlY29yYXRvciB3aXRoIHRoZSBzYW1lIG5hbWUgb24gdGhlIFwiJHtuZXdDbGFzcy5uYW1lfVwiIGNsYXNzLmApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvbGRDbGFzcy5kZWNvcmF0b3JzLnB1c2goLi4ubmV3Q2xhc3MuZGVjb3JhdG9ycyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKG5ld0NsYXNzLmRpYWdub3N0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAob2xkQ2xhc3MuZGlhZ25vc3RpY3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgb2xkQ2xhc3MuZGlhZ25vc3RpY3MgPSBuZXdDbGFzcy5kaWFnbm9zdGljcztcbiAgICB9IGVsc2Uge1xuICAgICAgb2xkQ2xhc3MuZGlhZ25vc3RpY3MucHVzaCguLi5uZXdDbGFzcy5kaWFnbm9zdGljcyk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGRpYWdub3N0aWMgZnJvbSBhbm90aGVyIG9uZSwgY29udGFpbmluZyBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIGFib3V0IHRoZSBzeW50aGV0aWNcbiAqIGRlY29yYXRvci5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlTWlncmF0aW9uRGlhZ25vc3RpYyhcbiAgICBkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljLCBzb3VyY2U6IHRzLk5vZGUsIGRlY29yYXRvcjogRGVjb3JhdG9yKTogdHMuRGlhZ25vc3RpYyB7XG4gIGNvbnN0IGNsb25lID0gey4uLmRpYWdub3N0aWN9O1xuXG4gIGNvbnN0IGNoYWluOiB0cy5EaWFnbm9zdGljTWVzc2FnZUNoYWluW10gPSBbe1xuICAgIG1lc3NhZ2VUZXh0OiBgT2NjdXJzIGZvciBAJHtkZWNvcmF0b3IubmFtZX0gZGVjb3JhdG9yIGluc2VydGVkIGJ5IGFuIGF1dG9tYXRpYyBtaWdyYXRpb25gLFxuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuTWVzc2FnZSxcbiAgICBjb2RlOiAwLFxuICB9XTtcblxuICBpZiAoZGVjb3JhdG9yLmFyZ3MgIT09IG51bGwpIHtcbiAgICBjb25zdCBhcmdzID0gZGVjb3JhdG9yLmFyZ3MubWFwKGFyZyA9PiBhcmcuZ2V0VGV4dCgpKS5qb2luKCcsICcpO1xuICAgIGNoYWluLnB1c2goe1xuICAgICAgbWVzc2FnZVRleHQ6IGBAJHtkZWNvcmF0b3IubmFtZX0oJHthcmdzfSlgLFxuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlLFxuICAgICAgY29kZTogMCxcbiAgICB9KTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgY2xvbmUubWVzc2FnZVRleHQgPT09ICdzdHJpbmcnKSB7XG4gICAgY2xvbmUubWVzc2FnZVRleHQgPSB7XG4gICAgICBtZXNzYWdlVGV4dDogY2xvbmUubWVzc2FnZVRleHQsXG4gICAgICBjYXRlZ29yeTogZGlhZ25vc3RpYy5jYXRlZ29yeSxcbiAgICAgIGNvZGU6IGRpYWdub3N0aWMuY29kZSxcbiAgICAgIG5leHQ6IGNoYWluLFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgaWYgKGNsb25lLm1lc3NhZ2VUZXh0Lm5leHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xvbmUubWVzc2FnZVRleHQubmV4dCA9IGNoYWluO1xuICAgIH0gZWxzZSB7XG4gICAgICBjbG9uZS5tZXNzYWdlVGV4dC5uZXh0LnB1c2goLi4uY2hhaW4pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY2xvbmU7XG59XG4iXX0=