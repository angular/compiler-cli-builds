(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/migration_host", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/ngcc/src/analysis/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var util_1 = require("@angular/compiler-cli/ngcc/src/analysis/util");
    /**
     * The standard implementation of `MigrationHost`, which is created by the
     * `DecorationAnalyzer`.
     */
    var DefaultMigrationHost = /** @class */ (function () {
        function DefaultMigrationHost(reflectionHost, metadata, evaluator, handlers, entryPointPath, analyzedFiles) {
            this.reflectionHost = reflectionHost;
            this.metadata = metadata;
            this.evaluator = evaluator;
            this.handlers = handlers;
            this.entryPointPath = entryPointPath;
            this.analyzedFiles = analyzedFiles;
        }
        DefaultMigrationHost.prototype.injectSyntheticDecorator = function (clazz, decorator, flags) {
            var classSymbol = this.reflectionHost.getClassSymbol(clazz);
            var newAnalyzedClass = util_1.analyzeDecorators(classSymbol, [decorator], this.handlers, flags);
            if (newAnalyzedClass === null) {
                return;
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
        var e_1, _a, _b, _c;
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
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                    }
                    finally { if (e_1) throw e_1.error; }
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlncmF0aW9uX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvYW5hbHlzaXMvbWlncmF0aW9uX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBU0EsMkVBQStFO0lBVS9FLHFFQUEwRDtJQUUxRDs7O09BR0c7SUFDSDtRQUNFLDhCQUNhLGNBQWtDLEVBQVcsUUFBd0IsRUFDckUsU0FBMkIsRUFBVSxRQUFzQyxFQUM1RSxjQUE4QixFQUFVLGFBQTZCO1lBRnBFLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtZQUFXLGFBQVEsR0FBUixRQUFRLENBQWdCO1lBQ3JFLGNBQVMsR0FBVCxTQUFTLENBQWtCO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBOEI7WUFDNUUsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1lBQVUsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQUcsQ0FBQztRQUVyRix1REFBd0IsR0FBeEIsVUFBeUIsS0FBdUIsRUFBRSxTQUFvQixFQUFFLEtBQW9CO1lBRTFGLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBRyxDQUFDO1lBQ2hFLElBQU0sZ0JBQWdCLEdBQUcsd0JBQWlCLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMzRixJQUFJLGdCQUFnQixLQUFLLElBQUksRUFBRTtnQkFDN0IsT0FBTzthQUNSO1lBRUQsSUFBTSxZQUFZLEdBQUcsdUJBQXVCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztZQUN4RixJQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEs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USxDQUFDLFVBQVUsR0FBRTthQUNsRDtTQUNGO1FBRUQsSUFBSSxRQUFRLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRTtZQUN0QyxJQUFJLFFBQVEsQ0FBQyxXQUFXLEtBQUssU0FBUyxFQUFFO2dCQUN0QyxRQUFRLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUM7YUFDN0M7aUJBQU07Z0JBQ0wsQ0FBQSxLQUFBLFFBQVEsQ0FBQyxXQUFXLENBQUEsQ0FBQyxJQUFJLDRCQUFJLFFBQVEsQ0FBQyxXQUFXLEdBQUU7YUFDcEQ7U0FDRjtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TWV0YWRhdGFSZWFkZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtEZWNvcmF0b3JIYW5kbGVyLCBIYW5kbGVyRmxhZ3N9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7TWlncmF0aW9uSG9zdH0gZnJvbSAnLi4vbWlncmF0aW9ucy9taWdyYXRpb24nO1xuXG5pbXBvcnQge0FuYWx5emVkQ2xhc3MsIEFuYWx5emVkRmlsZX0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2FuYWx5emVEZWNvcmF0b3JzLCBpc1dpdGhpblBhY2thZ2V9IGZyb20gJy4vdXRpbCc7XG5cbi8qKlxuICogVGhlIHN0YW5kYXJkIGltcGxlbWVudGF0aW9uIG9mIGBNaWdyYXRpb25Ib3N0YCwgd2hpY2ggaXMgY3JlYXRlZCBieSB0aGVcbiAqIGBEZWNvcmF0aW9uQW5hbHl6ZXJgLlxuICovXG5leHBvcnQgY2xhc3MgRGVmYXVsdE1pZ3JhdGlvbkhvc3QgaW1wbGVtZW50cyBNaWdyYXRpb25Ib3N0IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWZsZWN0aW9uSG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCByZWFkb25seSBtZXRhZGF0YTogTWV0YWRhdGFSZWFkZXIsXG4gICAgICByZWFkb25seSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsIHByaXZhdGUgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+W10sXG4gICAgICBwcml2YXRlIGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJpdmF0ZSBhbmFseXplZEZpbGVzOiBBbmFseXplZEZpbGVbXSkge31cblxuICBpbmplY3RTeW50aGV0aWNEZWNvcmF0b3IoY2xheno6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLCBmbGFncz86IEhhbmRsZXJGbGFncyk6XG4gICAgICB2b2lkIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMucmVmbGVjdGlvbkhvc3QuZ2V0Q2xhc3NTeW1ib2woY2xhenopICE7XG4gICAgY29uc3QgbmV3QW5hbHl6ZWRDbGFzcyA9IGFuYWx5emVEZWNvcmF0b3JzKGNsYXNzU3ltYm9sLCBbZGVjb3JhdG9yXSwgdGhpcy5oYW5kbGVycywgZmxhZ3MpO1xuICAgIGlmIChuZXdBbmFseXplZENsYXNzID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYW5hbHl6ZWRGaWxlID0gZ2V0T3JDcmVhdGVBbmFseXplZEZpbGUodGhpcy5hbmFseXplZEZpbGVzLCBjbGF6ei5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGNvbnN0IG9sZEFuYWx5emVkQ2xhc3MgPSBhbmFseXplZEZpbGUuYW5hbHl6ZWRDbGFzc2VzLmZpbmQoYyA9PiBjLmRlY2xhcmF0aW9uID09PSBjbGF6eik7XG4gICAgaWYgKG9sZEFuYWx5emVkQ2xhc3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5wdXNoKG5ld0FuYWx5emVkQ2xhc3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICBtZXJnZUFuYWx5emVkQ2xhc3NlcyhvbGRBbmFseXplZENsYXNzLCBuZXdBbmFseXplZENsYXNzKTtcbiAgICB9XG4gIH1cblxuICBnZXRBbGxEZWNvcmF0b3JzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3Qgc291cmNlRmlsZSA9IGNsYXp6LmdldFNvdXJjZUZpbGUoKTtcbiAgICBjb25zdCBhbmFseXplZEZpbGUgPSB0aGlzLmFuYWx5emVkRmlsZXMuZmluZChmaWxlID0+IGZpbGUuc291cmNlRmlsZSA9PT0gc291cmNlRmlsZSk7XG4gICAgaWYgKGFuYWx5emVkRmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBhbmFseXplZENsYXNzID0gYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5maW5kKGMgPT4gYy5kZWNsYXJhdGlvbiA9PT0gY2xhenopO1xuICAgIGlmIChhbmFseXplZENsYXNzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBhbmFseXplZENsYXNzLmRlY29yYXRvcnM7XG4gIH1cblxuICBpc0luU2NvcGUoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICByZXR1cm4gaXNXaXRoaW5QYWNrYWdlKHRoaXMuZW50cnlQb2ludFBhdGgsIGNsYXp6LmdldFNvdXJjZUZpbGUoKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0T3JDcmVhdGVBbmFseXplZEZpbGUoXG4gICAgYW5hbHl6ZWRGaWxlczogQW5hbHl6ZWRGaWxlW10sIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBBbmFseXplZEZpbGUge1xuICBjb25zdCBhbmFseXplZEZpbGUgPSBhbmFseXplZEZpbGVzLmZpbmQoZmlsZSA9PiBmaWxlLnNvdXJjZUZpbGUgPT09IHNvdXJjZUZpbGUpO1xuICBpZiAoYW5hbHl6ZWRGaWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gYW5hbHl6ZWRGaWxlO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IG5ld0FuYWx5emVkRmlsZTogQW5hbHl6ZWRGaWxlID0ge3NvdXJjZUZpbGUsIGFuYWx5emVkQ2xhc3NlczogW119O1xuICAgIGFuYWx5emVkRmlsZXMucHVzaChuZXdBbmFseXplZEZpbGUpO1xuICAgIHJldHVybiBuZXdBbmFseXplZEZpbGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWVyZ2VBbmFseXplZENsYXNzZXMob2xkQ2xhc3M6IEFuYWx5emVkQ2xhc3MsIG5ld0NsYXNzOiBBbmFseXplZENsYXNzKSB7XG4gIGlmIChuZXdDbGFzcy5kZWNvcmF0b3JzICE9PSBudWxsKSB7XG4gICAgaWYgKG9sZENsYXNzLmRlY29yYXRvcnMgPT09IG51bGwpIHtcbiAgICAgIG9sZENsYXNzLmRlY29yYXRvcnMgPSBuZXdDbGFzcy5kZWNvcmF0b3JzO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGNvbnN0IG5ld0RlY29yYXRvciBvZiBuZXdDbGFzcy5kZWNvcmF0b3JzKSB7XG4gICAgICAgIGlmIChvbGRDbGFzcy5kZWNvcmF0b3JzLnNvbWUoZCA9PiBkLm5hbWUgPT09IG5ld0RlY29yYXRvci5uYW1lKSkge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLk5HQ0NfTUlHUkFUSU9OX0RFQ09SQVRPUl9JTkpFQ1RJT05fRVJST1IsIG5ld0NsYXNzLmRlY2xhcmF0aW9uLFxuICAgICAgICAgICAgICBgQXR0ZW1wdGVkIHRvIGluamVjdCBcIiR7bmV3RGVjb3JhdG9yLm5hbWV9XCIgZGVjb3JhdG9yIG92ZXIgYSBwcmUtZXhpc3RpbmcgZGVjb3JhdG9yIHdpdGggdGhlIHNhbWUgbmFtZSBvbiB0aGUgXCIke25ld0NsYXNzLm5hbWV9XCIgY2xhc3MuYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG9sZENsYXNzLmRlY29yYXRvcnMucHVzaCguLi5uZXdDbGFzcy5kZWNvcmF0b3JzKTtcbiAgICB9XG4gIH1cblxuICBpZiAobmV3Q2xhc3MuZGlhZ25vc3RpY3MgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChvbGRDbGFzcy5kaWFnbm9zdGljcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBvbGRDbGFzcy5kaWFnbm9zdGljcyA9IG5ld0NsYXNzLmRpYWdub3N0aWNzO1xuICAgIH0gZWxzZSB7XG4gICAgICBvbGRDbGFzcy5kaWFnbm9zdGljcy5wdXNoKC4uLm5ld0NsYXNzLmRpYWdub3N0aWNzKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==