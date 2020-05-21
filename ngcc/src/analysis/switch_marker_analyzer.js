(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/switch_marker_analyzer", ["require", "exports", "@angular/compiler-cli/ngcc/src/analysis/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SwitchMarkerAnalyzer = exports.SwitchMarkerAnalyses = void 0;
    var util_1 = require("@angular/compiler-cli/ngcc/src/analysis/util");
    exports.SwitchMarkerAnalyses = Map;
    /**
     * This Analyzer will analyse the files that have an R3 switch marker in them
     * that will be replaced.
     */
    var SwitchMarkerAnalyzer = /** @class */ (function () {
        function SwitchMarkerAnalyzer(host, packagePath) {
            this.host = host;
            this.packagePath = packagePath;
        }
        /**
         * Analyze the files in the program to identify declarations that contain R3
         * switch markers.
         * @param program The program to analyze.
         * @return A map of source files to analysis objects. The map will contain only the
         * source files that had switch markers, and the analysis will contain an array of
         * the declarations in that source file that contain the marker.
         */
        SwitchMarkerAnalyzer.prototype.analyzeProgram = function (program) {
            var _this = this;
            var analyzedFiles = new exports.SwitchMarkerAnalyses();
            program.getSourceFiles()
                .filter(function (sourceFile) { return util_1.isWithinPackage(_this.packagePath, sourceFile); })
                .forEach(function (sourceFile) {
                var declarations = _this.host.getSwitchableDeclarations(sourceFile);
                if (declarations.length) {
                    analyzedFiles.set(sourceFile, { sourceFile: sourceFile, declarations: declarations });
                }
            });
            return analyzedFiles;
        };
        return SwitchMarkerAnalyzer;
    }());
    exports.SwitchMarkerAnalyzer = SwitchMarkerAnalyzer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3dpdGNoX21hcmtlcl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy9zd2l0Y2hfbWFya2VyX2FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVVBLHFFQUF1QztJQVExQixRQUFBLG9CQUFvQixHQUFHLEdBQUcsQ0FBQztJQUV4Qzs7O09BR0c7SUFDSDtRQUNFLDhCQUFvQixJQUF3QixFQUFVLFdBQTJCO1lBQTdELFNBQUksR0FBSixJQUFJLENBQW9CO1lBQVUsZ0JBQVcsR0FBWCxXQUFXLENBQWdCO1FBQUcsQ0FBQztRQUNyRjs7Ozs7OztXQU9HO1FBQ0gsNkNBQWMsR0FBZCxVQUFlLE9BQW1CO1lBQWxDLGlCQVdDO1lBVkMsSUFBTSxhQUFhLEdBQUcsSUFBSSw0QkFBb0IsRUFBRSxDQUFDO1lBQ2pELE9BQU8sQ0FBQyxjQUFjLEVBQUU7aUJBQ25CLE1BQU0sQ0FBQyxVQUFBLFVBQVUsSUFBSSxPQUFBLHNCQUFlLENBQUMsS0FBSSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsRUFBN0MsQ0FBNkMsQ0FBQztpQkFDbkUsT0FBTyxDQUFDLFVBQUEsVUFBVTtnQkFDakIsSUFBTSxZQUFZLEdBQUcsS0FBSSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDckUsSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFO29CQUN2QixhQUFhLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxFQUFDLFVBQVUsWUFBQSxFQUFFLFlBQVksY0FBQSxFQUFDLENBQUMsQ0FBQztpQkFDM0Q7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNQLE9BQU8sYUFBYSxDQUFDO1FBQ3ZCLENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUF0QkQsSUFzQkM7SUF0Qlksb0RBQW9CIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3QsIFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9ufSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge2lzV2l0aGluUGFja2FnZX0gZnJvbSAnLi91dGlsJztcblxuZXhwb3J0IGludGVyZmFjZSBTd2l0Y2hNYXJrZXJBbmFseXNpcyB7XG4gIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGU7XG4gIGRlY2xhcmF0aW9uczogU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb25bXTtcbn1cblxuZXhwb3J0IHR5cGUgU3dpdGNoTWFya2VyQW5hbHlzZXMgPSBNYXA8dHMuU291cmNlRmlsZSwgU3dpdGNoTWFya2VyQW5hbHlzaXM+O1xuZXhwb3J0IGNvbnN0IFN3aXRjaE1hcmtlckFuYWx5c2VzID0gTWFwO1xuXG4vKipcbiAqIFRoaXMgQW5hbHl6ZXIgd2lsbCBhbmFseXNlIHRoZSBmaWxlcyB0aGF0IGhhdmUgYW4gUjMgc3dpdGNoIG1hcmtlciBpbiB0aGVtXG4gKiB0aGF0IHdpbGwgYmUgcmVwbGFjZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBTd2l0Y2hNYXJrZXJBbmFseXplciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCkge31cbiAgLyoqXG4gICAqIEFuYWx5emUgdGhlIGZpbGVzIGluIHRoZSBwcm9ncmFtIHRvIGlkZW50aWZ5IGRlY2xhcmF0aW9ucyB0aGF0IGNvbnRhaW4gUjNcbiAgICogc3dpdGNoIG1hcmtlcnMuXG4gICAqIEBwYXJhbSBwcm9ncmFtIFRoZSBwcm9ncmFtIHRvIGFuYWx5emUuXG4gICAqIEByZXR1cm4gQSBtYXAgb2Ygc291cmNlIGZpbGVzIHRvIGFuYWx5c2lzIG9iamVjdHMuIFRoZSBtYXAgd2lsbCBjb250YWluIG9ubHkgdGhlXG4gICAqIHNvdXJjZSBmaWxlcyB0aGF0IGhhZCBzd2l0Y2ggbWFya2VycywgYW5kIHRoZSBhbmFseXNpcyB3aWxsIGNvbnRhaW4gYW4gYXJyYXkgb2ZcbiAgICogdGhlIGRlY2xhcmF0aW9ucyBpbiB0aGF0IHNvdXJjZSBmaWxlIHRoYXQgY29udGFpbiB0aGUgbWFya2VyLlxuICAgKi9cbiAgYW5hbHl6ZVByb2dyYW0ocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IFN3aXRjaE1hcmtlckFuYWx5c2VzIHtcbiAgICBjb25zdCBhbmFseXplZEZpbGVzID0gbmV3IFN3aXRjaE1hcmtlckFuYWx5c2VzKCk7XG4gICAgcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpXG4gICAgICAgIC5maWx0ZXIoc291cmNlRmlsZSA9PiBpc1dpdGhpblBhY2thZ2UodGhpcy5wYWNrYWdlUGF0aCwgc291cmNlRmlsZSkpXG4gICAgICAgIC5mb3JFYWNoKHNvdXJjZUZpbGUgPT4ge1xuICAgICAgICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9IHRoaXMuaG9zdC5nZXRTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKHNvdXJjZUZpbGUpO1xuICAgICAgICAgIGlmIChkZWNsYXJhdGlvbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhbmFseXplZEZpbGVzLnNldChzb3VyY2VGaWxlLCB7c291cmNlRmlsZSwgZGVjbGFyYXRpb25zfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICByZXR1cm4gYW5hbHl6ZWRGaWxlcztcbiAgfVxufVxuIl19