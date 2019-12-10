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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlncmF0aW9uX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvYW5hbHlzaXMvbWlncmF0aW9uX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLDJFQUErRTtJQVUvRSxxRUFBMEQ7SUFFMUQ7OztPQUdHO0lBQ0g7UUFDRSw4QkFDYSxjQUFrQyxFQUFXLFFBQXdCLEVBQ3JFLFNBQTJCLEVBQVUsUUFBc0MsRUFDNUUsY0FBOEIsRUFBVSxhQUE2QixFQUNyRSxpQkFBaUQ7WUFIaEQsbUJBQWMsR0FBZCxjQUFjLENBQW9CO1lBQVcsYUFBUSxHQUFSLFFBQVEsQ0FBZ0I7WUFDckUsY0FBUyxHQUFULFNBQVMsQ0FBa0I7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUE4QjtZQUM1RSxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7WUFBVSxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7WUFDckUsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFnQztRQUFHLENBQUM7UUFFakUsdURBQXdCLEdBQXhCLFVBQXlCLEtBQXVCLEVBQUUsU0FBb0IsRUFBRSxLQUFvQjs7WUFFMUYsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFHLENBQUM7WUFDaEUsSUFBTSxnQkFBZ0IsR0FBRyx3QkFBaUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNGLElBQUksZ0JBQWdCLEtBQUssSUFBSSxFQUFFO2dCQUM3QixPQUFPO2FBQ1I7WUFFRCxJQUFJLGdCQUFnQixDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUU7O29CQUM5QyxLQUF5QixJQUFBLEtBQUEsaUJBQUEsZ0JBQWdCLENB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QUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEdBQUcsQ0FBQyxPQUFPLEVBQUUsRUFBYixDQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakUsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVCxXQUFXLEVBQUUsTUFBSSxTQUFTLENBQUMsSUFBSSxTQUFJLElBQUksTUFBRztnQkFDMUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO2dCQUN2QyxJQUFJLEVBQUUsQ0FBQzthQUNSLENBQUMsQ0FBQztTQUNKO1FBRUQsSUFBSSxPQUFPLEtBQUssQ0FBQyxXQUFXLEtBQUssUUFBUSxFQUFFO1lBQ3pDLEtBQUssQ0FBQyxXQUFXLEdBQUc7Z0JBQ2xCLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVztnQkFDOUIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRO2dCQUM3QixJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUk7Z0JBQ3JCLElBQUksRUFBRSxLQUFLO2FBQ1osQ0FBQztTQUNIO2FBQU07WUFDTCxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtnQkFDeEMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO2FBQ2hDO2lCQUFNO2dCQUNMLENBQUEsS0FBQSxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQSxDQUFDLElBQUksNEJBQUksS0FBSyxHQUFFO2FBQ3ZDO1NBQ0Y7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TWV0YWRhdGFSZWFkZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtEZWNvcmF0b3JIYW5kbGVyLCBIYW5kbGVyRmxhZ3N9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7TWlncmF0aW9uSG9zdH0gZnJvbSAnLi4vbWlncmF0aW9ucy9taWdyYXRpb24nO1xuXG5pbXBvcnQge0FuYWx5emVkQ2xhc3MsIEFuYWx5emVkRmlsZX0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2FuYWx5emVEZWNvcmF0b3JzLCBpc1dpdGhpblBhY2thZ2V9IGZyb20gJy4vdXRpbCc7XG5cbi8qKlxuICogVGhlIHN0YW5kYXJkIGltcGxlbWVudGF0aW9uIG9mIGBNaWdyYXRpb25Ib3N0YCwgd2hpY2ggaXMgY3JlYXRlZCBieSB0aGVcbiAqIGBEZWNvcmF0aW9uQW5hbHl6ZXJgLlxuICovXG5leHBvcnQgY2xhc3MgRGVmYXVsdE1pZ3JhdGlvbkhvc3QgaW1wbGVtZW50cyBNaWdyYXRpb25Ib3N0IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWZsZWN0aW9uSG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCByZWFkb25seSBtZXRhZGF0YTogTWV0YWRhdGFSZWFkZXIsXG4gICAgICByZWFkb25seSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsIHByaXZhdGUgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+W10sXG4gICAgICBwcml2YXRlIGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJpdmF0ZSBhbmFseXplZEZpbGVzOiBBbmFseXplZEZpbGVbXSxcbiAgICAgIHByaXZhdGUgZGlhZ25vc3RpY0hhbmRsZXI6IChlcnJvcjogdHMuRGlhZ25vc3RpYykgPT4gdm9pZCkge31cblxuICBpbmplY3RTeW50aGV0aWNEZWNvcmF0b3IoY2xheno6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLCBmbGFncz86IEhhbmRsZXJGbGFncyk6XG4gICAgICB2b2lkIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMucmVmbGVjdGlvbkhvc3QuZ2V0Q2xhc3NTeW1ib2woY2xhenopICE7XG4gICAgY29uc3QgbmV3QW5hbHl6ZWRDbGFzcyA9IGFuYWx5emVEZWNvcmF0b3JzKGNsYXNzU3ltYm9sLCBbZGVjb3JhdG9yXSwgdGhpcy5oYW5kbGVycywgZmxhZ3MpO1xuICAgIGlmIChuZXdBbmFseXplZENsYXNzID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKG5ld0FuYWx5emVkQ2xhc3MuZGlhZ25vc3RpY3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZm9yIChjb25zdCBkaWFnbm9zdGljIG9mIG5ld0FuYWx5emVkQ2xhc3MuZGlhZ25vc3RpY3MpIHtcbiAgICAgICAgdGhpcy5kaWFnbm9zdGljSGFuZGxlcihjcmVhdGVNaWdyYXRpb25EaWFnbm9zdGljKGRpYWdub3N0aWMsIGNsYXp6LCBkZWNvcmF0b3IpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBhbmFseXplZEZpbGUgPSBnZXRPckNyZWF0ZUFuYWx5emVkRmlsZSh0aGlzLmFuYWx5emVkRmlsZXMsIGNsYXp6LmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3Qgb2xkQW5hbHl6ZWRDbGFzcyA9IGFuYWx5emVkRmlsZS5hbmFseXplZENsYXNzZXMuZmluZChjID0+IGMuZGVjbGFyYXRpb24gPT09IGNsYXp6KTtcbiAgICBpZiAob2xkQW5hbHl6ZWRDbGFzcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBhbmFseXplZEZpbGUuYW5hbHl6ZWRDbGFzc2VzLnB1c2gobmV3QW5hbHl6ZWRDbGFzcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lcmdlQW5hbHl6ZWRDbGFzc2VzKG9sZEFuYWx5emVkQ2xhc3MsIG5ld0FuYWx5emVkQ2xhc3MpO1xuICAgIH1cbiAgfVxuXG4gIGdldEFsbERlY29yYXRvcnMoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCBzb3VyY2VGaWxlID0gY2xhenouZ2V0U291cmNlRmlsZSgpO1xuICAgIGNvbnN0IGFuYWx5emVkRmlsZSA9IHRoaXMuYW5hbHl6ZWRGaWxlcy5maW5kKGZpbGUgPT4gZmlsZS5zb3VyY2VGaWxlID09PSBzb3VyY2VGaWxlKTtcbiAgICBpZiAoYW5hbHl6ZWRGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGFuYWx5emVkQ2xhc3MgPSBhbmFseXplZEZpbGUuYW5hbHl6ZWRDbGFzc2VzLmZpbmQoYyA9PiBjLmRlY2xhcmF0aW9uID09PSBjbGF6eik7XG4gICAgaWYgKGFuYWx5emVkQ2xhc3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFuYWx5emVkQ2xhc3MuZGVjb3JhdG9ycztcbiAgfVxuXG4gIGlzSW5TY29wZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBpc1dpdGhpblBhY2thZ2UodGhpcy5lbnRyeVBvaW50UGF0aCwgY2xhenouZ2V0U291cmNlRmlsZSgpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRPckNyZWF0ZUFuYWx5emVkRmlsZShcbiAgICBhbmFseXplZEZpbGVzOiBBbmFseXplZEZpbGVbXSwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IEFuYWx5emVkRmlsZSB7XG4gIGNvbnN0IGFuYWx5emVkRmlsZSA9IGFuYWx5emVkRmlsZXMuZmluZChmaWxlID0+IGZpbGUuc291cmNlRmlsZSA9PT0gc291cmNlRmlsZSk7XG4gIGlmIChhbmFseXplZEZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBhbmFseXplZEZpbGU7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgbmV3QW5hbHl6ZWRGaWxlOiBBbmFseXplZEZpbGUgPSB7c291cmNlRmlsZSwgYW5hbHl6ZWRDbGFzc2VzOiBbXX07XG4gICAgYW5hbHl6ZWRGaWxlcy5wdXNoKG5ld0FuYWx5emVkRmlsZSk7XG4gICAgcmV0dXJuIG5ld0FuYWx5emVkRmlsZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBtZXJnZUFuYWx5emVkQ2xhc3NlcyhvbGRDbGFzczogQW5hbHl6ZWRDbGFzcywgbmV3Q2xhc3M6IEFuYWx5emVkQ2xhc3MpIHtcbiAgaWYgKG5ld0NsYXNzLmRlY29yYXRvcnMgIT09IG51bGwpIHtcbiAgICBpZiAob2xkQ2xhc3MuZGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgb2xkQ2xhc3MuZGVjb3JhdG9ycyA9IG5ld0NsYXNzLmRlY29yYXRvcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoY29uc3QgbmV3RGVjb3JhdG9yIG9mIG5ld0NsYXNzLmRlY29yYXRvcnMpIHtcbiAgICAgICAgaWYgKG9sZENsYXNzLmRlY29yYXRvcnMuc29tZShkID0+IGQubmFtZSA9PT0gbmV3RGVjb3JhdG9yLm5hbWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuTkdDQ19NSUdSQVRJT05fREVDT1JBVE9SX0lOSkVDVElPTl9FUlJPUiwgbmV3Q2xhc3MuZGVjbGFyYXRpb24sXG4gICAgICAgICAgICAgIGBBdHRlbXB0ZWQgdG8gaW5qZWN0IFwiJHtuZXdEZWNvcmF0b3IubmFtZX1cIiBkZWNvcmF0b3Igb3ZlciBhIHByZS1leGlzdGluZyBkZWNvcmF0b3Igd2l0aCB0aGUgc2FtZSBuYW1lIG9uIHRoZSBcIiR7bmV3Q2xhc3MubmFtZX1cIiBjbGFzcy5gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb2xkQ2xhc3MuZGVjb3JhdG9ycy5wdXNoKC4uLm5ld0NsYXNzLmRlY29yYXRvcnMpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChuZXdDbGFzcy5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKG9sZENsYXNzLmRpYWdub3N0aWNzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG9sZENsYXNzLmRpYWdub3N0aWNzID0gbmV3Q2xhc3MuZGlhZ25vc3RpY3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9sZENsYXNzLmRpYWdub3N0aWNzLnB1c2goLi4ubmV3Q2xhc3MuZGlhZ25vc3RpY3MpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBkaWFnbm9zdGljIGZyb20gYW5vdGhlciBvbmUsIGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgc3ludGhldGljXG4gKiBkZWNvcmF0b3IuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZU1pZ3JhdGlvbkRpYWdub3N0aWMoXG4gICAgZGlhZ25vc3RpYzogdHMuRGlhZ25vc3RpYywgc291cmNlOiB0cy5Ob2RlLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjbG9uZSA9IHsuLi5kaWFnbm9zdGljfTtcblxuICBjb25zdCBjaGFpbjogdHMuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbltdID0gW3tcbiAgICBtZXNzYWdlVGV4dDogYE9jY3VycyBmb3IgQCR7ZGVjb3JhdG9yLm5hbWV9IGRlY29yYXRvciBpbnNlcnRlZCBieSBhbiBhdXRvbWF0aWMgbWlncmF0aW9uYCxcbiAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lk1lc3NhZ2UsXG4gICAgY29kZTogMCxcbiAgfV07XG5cbiAgaWYgKGRlY29yYXRvci5hcmdzICE9PSBudWxsKSB7XG4gICAgY29uc3QgYXJncyA9IGRlY29yYXRvci5hcmdzLm1hcChhcmcgPT4gYXJnLmdldFRleHQoKSkuam9pbignLCAnKTtcbiAgICBjaGFpbi5wdXNoKHtcbiAgICAgIG1lc3NhZ2VUZXh0OiBgQCR7ZGVjb3JhdG9yLm5hbWV9KCR7YXJnc30pYCxcbiAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuTWVzc2FnZSxcbiAgICAgIGNvZGU6IDAsXG4gICAgfSk7XG4gIH1cblxuICBpZiAodHlwZW9mIGNsb25lLm1lc3NhZ2VUZXh0ID09PSAnc3RyaW5nJykge1xuICAgIGNsb25lLm1lc3NhZ2VUZXh0ID0ge1xuICAgICAgbWVzc2FnZVRleHQ6IGNsb25lLm1lc3NhZ2VUZXh0LFxuICAgICAgY2F0ZWdvcnk6IGRpYWdub3N0aWMuY2F0ZWdvcnksXG4gICAgICBjb2RlOiBkaWFnbm9zdGljLmNvZGUsXG4gICAgICBuZXh0OiBjaGFpbixcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIGlmIChjbG9uZS5tZXNzYWdlVGV4dC5uZXh0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNsb25lLm1lc3NhZ2VUZXh0Lm5leHQgPSBjaGFpbjtcbiAgICB9IGVsc2Uge1xuICAgICAgY2xvbmUubWVzc2FnZVRleHQubmV4dC5wdXNoKC4uLmNoYWluKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNsb25lO1xufVxuIl19