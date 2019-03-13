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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/host", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * A `ts.CompilerHost` which augments source files with type checking code from a
     * `TypeCheckContext`.
     */
    var TypeCheckProgramHost = /** @class */ (function () {
        function TypeCheckProgramHost(program, delegate, context) {
            var _this = this;
            this.delegate = delegate;
            this.context = context;
            /**
             * Map of source file names to `ts.SourceFile` instances.
             *
             * This is prepopulated with all the old source files, and updated as files are augmented.
             */
            this.sfCache = new Map();
            /**
             * Tracks those files in `sfCache` which have been augmented with type checking information
             * already.
             */
            this.augmentedSourceFiles = new Set();
            // The `TypeCheckContext` uses object identity for `ts.SourceFile`s to track which files need
            // type checking code inserted. Additionally, the operation of getting a source file should be
            // as efficient as possible. To support both of these requirements, all of the program's
            // source files are loaded into the cache up front.
            program.getSourceFiles().forEach(function (file) { _this.sfCache.set(file.fileName, file); });
            if (delegate.getDirectories !== undefined) {
                this.getDirectories = function (path) { return delegate.getDirectories(path); };
            }
        }
        TypeCheckProgramHost.prototype.getSourceFile = function (fileName, languageVersion, onError, shouldCreateNewSourceFile) {
            // Look in the cache for the source file.
            var sf = this.sfCache.get(fileName);
            if (sf === undefined) {
                // There should be no cache misses, but just in case, delegate getSourceFile in the event of
                // a cache miss.
                sf = this.delegate.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
                sf && this.sfCache.set(fileName, sf);
            }
            if (sf !== undefined) {
                // Maybe augment the file with type checking code via the `TypeCheckContext`.
                if (!this.augmentedSourceFiles.has(sf)) {
                    sf = this.context.transform(sf);
                    this.sfCache.set(fileName, sf);
                    this.augmentedSourceFiles.add(sf);
                }
                return sf;
            }
            else {
                return undefined;
            }
        };
        // The rest of the methods simply delegate to the underlying `ts.CompilerHost`.
        TypeCheckProgramHost.prototype.getDefaultLibFileName = function (options) {
            return this.delegate.getDefaultLibFileName(options);
        };
        TypeCheckProgramHost.prototype.writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
            return this.delegate.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
        };
        TypeCheckProgramHost.prototype.getCurrentDirectory = function () { return this.delegate.getCurrentDirectory(); };
        TypeCheckProgramHost.prototype.getCanonicalFileName = function (fileName) {
            return this.delegate.getCanonicalFileName(fileName);
        };
        TypeCheckProgramHost.prototype.useCaseSensitiveFileNames = function () { return this.delegate.useCaseSensitiveFileNames(); };
        TypeCheckProgramHost.prototype.getNewLine = function () { return this.delegate.getNewLine(); };
        TypeCheckProgramHost.prototype.fileExists = function (fileName) { return this.delegate.fileExists(fileName); };
        TypeCheckProgramHost.prototype.readFile = function (fileName) { return this.delegate.readFile(fileName); };
        return TypeCheckProgramHost;
    }());
    exports.TypeCheckProgramHost = TypeCheckProgramHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBS0g7OztPQUdHO0lBQ0g7UUFjRSw4QkFDSSxPQUFtQixFQUFVLFFBQXlCLEVBQVUsT0FBeUI7WUFEN0YsaUJBV0M7WUFWZ0MsYUFBUSxHQUFSLFFBQVEsQ0FBaUI7WUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFrQjtZQWQ3Rjs7OztlQUlHO1lBQ0ssWUFBTyxHQUFHLElBQUksR0FBRyxFQUF5QixDQUFDO1lBRW5EOzs7ZUFHRztZQUNLLHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1lBSXRELDZGQUE2RjtZQUM3Riw4RkFBOEY7WUFDOUYsd0ZBQXdGO1lBQ3hGLG1EQUFtRDtZQUNuRCxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSSxJQUFNLEtBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVyRixJQUFJLFFBQVEsQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFO2dCQUN6QyxJQUFJLENBQUMsY0FBYyxHQUFHLFVBQUMsSUFBWSxJQUFLLE9BQUEsUUFBUSxDQUFDLGNBQWdCLENBQUMsSUFBSSxDQUFDLEVBQS9CLENBQStCLENBQUM7YUFDekU7UUFDSCxDQUFDO1FBRUQsNENBQWEsR0FBYixVQUNJLFFBQWdCLEVBQUUsZUFBZ0MsRUFDbEQsT0FBK0MsRUFDL0MseUJBQTZDO1lBQy9DLHlDQUF5QztZQUN6QyxJQUFJLEVBQUUsR0FBNEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDN0QsSUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFO2dCQUNwQiw0RkFBNEY7Z0JBQzVGLGdCQUFnQjtnQkFDaEIsRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUM1QixRQUFRLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO2dCQUNuRSxFQUFFLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQ3RDO1lBQ0QsSUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFO2dCQUNwQiw2RUFBNkU7Z0JBQzdFLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO29CQUN0QyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ2hDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDL0IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztpQkFDbkM7Z0JBQ0QsT0FBTyxFQUFFLENBQUM7YUFDWDtpQkFBTTtnQkFDTCxPQUFPLFNBQVMsQ0FBQzthQUNsQjtRQUNILENBQUM7UUFFRCwrRUFBK0U7UUFFL0Usb0RBQXFCLEdBQXJCLFVBQXNCLE9BQTJCO1lBQy9DLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsd0NBQVMsR0FBVCxVQUNJLFFBQWdCLEVBQUUsSUFBWSxFQUFFLGtCQUEyQixFQUMzRCxPQUE4QyxFQUM5QyxXQUF5QztZQUMzQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFFRCxrREFBbUIsR0FBbkIsY0FBZ0MsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBSTdFLG1EQUFvQixHQUFwQixVQUFxQixRQUFnQjtZQUNuQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUVELHdEQUF5QixHQUF6QixjQUF1QyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFMUYseUNBQVUsR0FBVixjQUF1QixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNELHlDQUFVLEdBQVYsVUFBVyxRQUFnQixJQUFhLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBGLHVDQUFRLEdBQVIsVUFBUyxRQUFnQixJQUFzQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRiwyQkFBQztJQUFELENBQUMsQUFqRkQsSUFpRkM7SUFqRlksb0RBQW9CIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7VHlwZUNoZWNrQ29udGV4dH0gZnJvbSAnLi9jb250ZXh0JztcblxuLyoqXG4gKiBBIGB0cy5Db21waWxlckhvc3RgIHdoaWNoIGF1Z21lbnRzIHNvdXJjZSBmaWxlcyB3aXRoIHR5cGUgY2hlY2tpbmcgY29kZSBmcm9tIGFcbiAqIGBUeXBlQ2hlY2tDb250ZXh0YC5cbiAqL1xuZXhwb3J0IGNsYXNzIFR5cGVDaGVja1Byb2dyYW1Ib3N0IGltcGxlbWVudHMgdHMuQ29tcGlsZXJIb3N0IHtcbiAgLyoqXG4gICAqIE1hcCBvZiBzb3VyY2UgZmlsZSBuYW1lcyB0byBgdHMuU291cmNlRmlsZWAgaW5zdGFuY2VzLlxuICAgKlxuICAgKiBUaGlzIGlzIHByZXBvcHVsYXRlZCB3aXRoIGFsbCB0aGUgb2xkIHNvdXJjZSBmaWxlcywgYW5kIHVwZGF0ZWQgYXMgZmlsZXMgYXJlIGF1Z21lbnRlZC5cbiAgICovXG4gIHByaXZhdGUgc2ZDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3MgdGhvc2UgZmlsZXMgaW4gYHNmQ2FjaGVgIHdoaWNoIGhhdmUgYmVlbiBhdWdtZW50ZWQgd2l0aCB0eXBlIGNoZWNraW5nIGluZm9ybWF0aW9uXG4gICAqIGFscmVhZHkuXG4gICAqL1xuICBwcml2YXRlIGF1Z21lbnRlZFNvdXJjZUZpbGVzID0gbmV3IFNldDx0cy5Tb3VyY2VGaWxlPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgcHJpdmF0ZSBkZWxlZ2F0ZTogdHMuQ29tcGlsZXJIb3N0LCBwcml2YXRlIGNvbnRleHQ6IFR5cGVDaGVja0NvbnRleHQpIHtcbiAgICAvLyBUaGUgYFR5cGVDaGVja0NvbnRleHRgIHVzZXMgb2JqZWN0IGlkZW50aXR5IGZvciBgdHMuU291cmNlRmlsZWBzIHRvIHRyYWNrIHdoaWNoIGZpbGVzIG5lZWRcbiAgICAvLyB0eXBlIGNoZWNraW5nIGNvZGUgaW5zZXJ0ZWQuIEFkZGl0aW9uYWxseSwgdGhlIG9wZXJhdGlvbiBvZiBnZXR0aW5nIGEgc291cmNlIGZpbGUgc2hvdWxkIGJlXG4gICAgLy8gYXMgZWZmaWNpZW50IGFzIHBvc3NpYmxlLiBUbyBzdXBwb3J0IGJvdGggb2YgdGhlc2UgcmVxdWlyZW1lbnRzLCBhbGwgb2YgdGhlIHByb2dyYW0nc1xuICAgIC8vIHNvdXJjZSBmaWxlcyBhcmUgbG9hZGVkIGludG8gdGhlIGNhY2hlIHVwIGZyb250LlxuICAgIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKGZpbGUgPT4geyB0aGlzLnNmQ2FjaGUuc2V0KGZpbGUuZmlsZU5hbWUsIGZpbGUpOyB9KTtcblxuICAgIGlmIChkZWxlZ2F0ZS5nZXREaXJlY3RvcmllcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmdldERpcmVjdG9yaWVzID0gKHBhdGg6IHN0cmluZykgPT4gZGVsZWdhdGUuZ2V0RGlyZWN0b3JpZXMgIShwYXRoKTtcbiAgICB9XG4gIH1cblxuICBnZXRTb3VyY2VGaWxlKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQsXG4gICAgICBvbkVycm9yPzogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCxcbiAgICAgIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGU/OiBib29sZWFufHVuZGVmaW5lZCk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICAvLyBMb29rIGluIHRoZSBjYWNoZSBmb3IgdGhlIHNvdXJjZSBmaWxlLlxuICAgIGxldCBzZjogdHMuU291cmNlRmlsZXx1bmRlZmluZWQgPSB0aGlzLnNmQ2FjaGUuZ2V0KGZpbGVOYW1lKTtcbiAgICBpZiAoc2YgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gVGhlcmUgc2hvdWxkIGJlIG5vIGNhY2hlIG1pc3NlcywgYnV0IGp1c3QgaW4gY2FzZSwgZGVsZWdhdGUgZ2V0U291cmNlRmlsZSBpbiB0aGUgZXZlbnQgb2ZcbiAgICAgIC8vIGEgY2FjaGUgbWlzcy5cbiAgICAgIHNmID0gdGhpcy5kZWxlZ2F0ZS5nZXRTb3VyY2VGaWxlKFxuICAgICAgICAgIGZpbGVOYW1lLCBsYW5ndWFnZVZlcnNpb24sIG9uRXJyb3IsIHNob3VsZENyZWF0ZU5ld1NvdXJjZUZpbGUpO1xuICAgICAgc2YgJiYgdGhpcy5zZkNhY2hlLnNldChmaWxlTmFtZSwgc2YpO1xuICAgIH1cbiAgICBpZiAoc2YgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gTWF5YmUgYXVnbWVudCB0aGUgZmlsZSB3aXRoIHR5cGUgY2hlY2tpbmcgY29kZSB2aWEgdGhlIGBUeXBlQ2hlY2tDb250ZXh0YC5cbiAgICAgIGlmICghdGhpcy5hdWdtZW50ZWRTb3VyY2VGaWxlcy5oYXMoc2YpKSB7XG4gICAgICAgIHNmID0gdGhpcy5jb250ZXh0LnRyYW5zZm9ybShzZik7XG4gICAgICAgIHRoaXMuc2ZDYWNoZS5zZXQoZmlsZU5hbWUsIHNmKTtcbiAgICAgICAgdGhpcy5hdWdtZW50ZWRTb3VyY2VGaWxlcy5hZGQoc2YpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHNmO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRoZSByZXN0IG9mIHRoZSBtZXRob2RzIHNpbXBseSBkZWxlZ2F0ZSB0byB0aGUgdW5kZXJseWluZyBgdHMuQ29tcGlsZXJIb3N0YC5cblxuICBnZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9ucyk7XG4gIH1cblxuICB3cml0ZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBkYXRhOiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgIG9uRXJyb3I6ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQsXG4gICAgICBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPik6IHZvaWQge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLndyaXRlRmlsZShmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gIH1cblxuICBnZXRDdXJyZW50RGlyZWN0b3J5KCk6IHN0cmluZyB7IHJldHVybiB0aGlzLmRlbGVnYXRlLmdldEN1cnJlbnREaXJlY3RvcnkoKTsgfVxuXG4gIGdldERpcmVjdG9yaWVzPzogKHBhdGg6IHN0cmluZykgPT4gc3RyaW5nW107XG5cbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpO1xuICB9XG5cbiAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOyB9XG5cbiAgZ2V0TmV3TGluZSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXROZXdMaW5lKCk7IH1cblxuICBmaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZmlsZUV4aXN0cyhmaWxlTmFtZSk7IH1cblxuICByZWFkRmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nfHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLmRlbGVnYXRlLnJlYWRGaWxlKGZpbGVOYW1lKTsgfVxufSJdfQ==