(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/environment", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.typeCheckFilePath = exports.TypeCheckFile = void 0;
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
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var environment_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/environment");
    var type_check_block_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block");
    /**
     * An `Environment` representing the single type-checking file into which most (if not all) Type
     * Check Blocks (TCBs) will be generated.
     *
     * The `TypeCheckFile` hosts multiple TCBs and allows the sharing of declarations (e.g. type
     * constructors) between them. Rather than return such declarations via `getPreludeStatements()`, it
     * hoists them to the top of the generated `ts.SourceFile`.
     */
    var TypeCheckFile = /** @class */ (function (_super) {
        tslib_1.__extends(TypeCheckFile, _super);
        function TypeCheckFile(fileName, config, refEmitter, reflector, compilerHost) {
            var _this = _super.call(this, config, new translator_1.ImportManager(new imports_1.NoopImportRewriter(), 'i'), refEmitter, reflector, ts.createSourceFile(compilerHost.getCanonicalFileName(fileName), '', ts.ScriptTarget.Latest, true)) || this;
            _this.fileName = fileName;
            _this.nextTcbId = 1;
            _this.tcbStatements = [];
            return _this;
        }
        TypeCheckFile.prototype.addTypeCheckBlock = function (ref, meta, domSchemaChecker, oobRecorder) {
            var fnId = ts.createIdentifier("_tcb" + this.nextTcbId++);
            var fn = type_check_block_1.generateTypeCheckBlock(this, ref, fnId, meta, domSchemaChecker, oobRecorder);
            this.tcbStatements.push(fn);
        };
        TypeCheckFile.prototype.render = function () {
            var e_1, _a, e_2, _b, e_3, _c;
            var source = this.importManager.getAllImports(this.contextFile.fileName)
                .map(function (i) { return "import * as " + i.qualifier + " from '" + i.specifier + "';"; })
                .join('\n') +
                '\n\n';
            var printer = ts.createPrinter();
            source += '\n';
            try {
                for (var _d = tslib_1.__values(this.pipeInstStatements), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var stmt = _e.value;
                    source += printer.printNode(ts.EmitHint.Unspecified, stmt, this.contextFile) + '\n';
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_1) throw e_1.error; }
            }
            try {
                for (var _f = tslib_1.__values(this.typeCtorStatements), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var stmt = _g.value;
                    source += printer.printNode(ts.EmitHint.Unspecified, stmt, this.contextFile) + '\n';
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_2) throw e_2.error; }
            }
            source += '\n';
            try {
                for (var _h = tslib_1.__values(this.tcbStatements), _j = _h.next(); !_j.done; _j = _h.next()) {
                    var stmt = _j.value;
                    source += printer.printNode(ts.EmitHint.Unspecified, stmt, this.contextFile) + '\n';
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                }
                finally { if (e_3) throw e_3.error; }
            }
            // Ensure the template type-checking file is an ES module. Otherwise, it's interpreted as some
            // kind of global namespace in TS, which forces a full re-typecheck of the user's program that
            // is somehow more expensive than the initial parse.
            source += '\nexport const IS_A_MODULE = true;\n';
            return source;
        };
        TypeCheckFile.prototype.getPreludeStatements = function () {
            return [];
        };
        return TypeCheckFile;
    }(environment_1.Environment));
    exports.TypeCheckFile = TypeCheckFile;
    function typeCheckFilePath(rootDirs) {
        var shortest = rootDirs.concat([]).sort(function (a, b) { return a.length - b.length; })[0];
        return file_system_1.join(shortest, '__ng_typecheck__.ts');
    }
    exports.typeCheckFilePath = typeCheckFilePath;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL3R5cGVfY2hlY2tfZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLDJFQUF1RDtJQUN2RCxtRUFBOEU7SUFFOUUseUVBQStDO0lBSS9DLHlGQUEwQztJQUUxQyxtR0FBMEQ7SUFJMUQ7Ozs7Ozs7T0FPRztJQUNIO1FBQW1DLHlDQUFXO1FBSTVDLHVCQUNhLFFBQXdCLEVBQUUsTUFBMEIsRUFBRSxVQUE0QixFQUMzRixTQUF5QixFQUFFLFlBQTJEO1lBRjFGLFlBR0Usa0JBQ0ksTUFBTSxFQUFFLElBQUksMEJBQWEsQ0FBQyxJQUFJLDRCQUFrQixFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFDL0UsRUFBRSxDQUFDLGdCQUFnQixDQUNmLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsU0FDeEY7WUFOWSxjQUFRLEdBQVIsUUFBUSxDQUFnQjtZQUo3QixlQUFTLEdBQUcsQ0FBQyxDQUFDO1lBQ2QsbUJBQWEsR0FBbUIsRUFBRSxDQUFDOztRQVMzQyxDQUFDO1FBRUQseUNBQWlCLEdBQWpCLFVBQ0ksR0FBcUQsRUFBRSxJQUE0QixFQUNuRixnQkFBa0MsRUFBRSxXQUF3QztZQUM5RSxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsU0FBTyxJQUFJLENBQUMsU0FBUyxFQUFJLENBQUMsQ0FBQztZQUM1RCxJQUFNLEVBQUUsR0FBRyx5Q0FBc0IsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDeEYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUVELDhCQUFNLEdBQU47O1lBQ0UsSUFBSSxNQUFNLEdBQVcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUM7aUJBQ3RELEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLGlCQUFlLENBQUMsQ0FBQyxTQUFTLGVBQVUsQ0FBQyxDQUFDLFNBQVMsT0FBSSxFQUFuRCxDQUFtRCxDQUFDO2lCQUM3RCxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUNoQyxNQUFNLENBQUM7WUFDWCxJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbkMsTUFBTSxJQUFJLElBQUksQ0FBQzs7Z0JBQ2YsS0FBbUIsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxrQkFBa0IsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBdkMsSUFBTSxJQUFJLFdBQUE7b0JBQ2IsTUFBTSxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUM7aUJBQ3JGOzs7Ozs7Ozs7O2dCQUNELEtBQW1CLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsa0JBQWtCLENBQUEsZ0JBQUEsNEJBQUU7b0JBQXZDLElBQU0sSUFBSSxXQUFBO29CQUNiLE1BQU0sSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDO2lCQUNyRjs7Ozs7Ozs7O1lBQ0QsTUFBTSxJQUFJLElBQUksQ0FBQzs7Z0JBQ2YsS0FBbUIsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxhQUFhLENBQUEsZ0JBQUEsNEJBQUU7b0JBQWxDLElBQU0sSUFBSSxXQUFBO29CQUNiLE1BQU0sSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDO2lCQUNyRjs7Ozs7Ozs7O1lBRUQsOEZBQThGO1lBQzlGLDhGQUE4RjtZQUM5RixvREFBb0Q7WUFDcEQsTUFBTSxJQUFJLHNDQUFzQyxDQUFDO1lBRWpELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFFRCw0Q0FBb0IsR0FBcEI7WUFDRSxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFDSCxvQkFBQztJQUFELENBQUMsQUFsREQsQ0FBbUMseUJBQVcsR0FrRDdDO0lBbERZLHNDQUFhO0lBb0QxQixTQUFnQixpQkFBaUIsQ0FBQyxRQUEwQjtRQUMxRCxJQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLENBQUMsRUFBRSxDQUFDLElBQUssT0FBQSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQW5CLENBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RSxPQUFPLGtCQUFJLENBQUMsUUFBUSxFQUFFLHFCQUFxQixDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUhELDhDQUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgam9pbn0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOb29wSW1wb3J0UmV3cml0ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5pbXBvcnQge1R5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIFR5cGVDaGVja2luZ0NvbmZpZ30gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtEb21TY2hlbWFDaGVja2VyfSBmcm9tICcuL2RvbSc7XG5pbXBvcnQge0Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7T3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyfSBmcm9tICcuL29vYic7XG5pbXBvcnQge2dlbmVyYXRlVHlwZUNoZWNrQmxvY2t9IGZyb20gJy4vdHlwZV9jaGVja19ibG9jayc7XG5cblxuXG4vKipcbiAqIEFuIGBFbnZpcm9ubWVudGAgcmVwcmVzZW50aW5nIHRoZSBzaW5nbGUgdHlwZS1jaGVja2luZyBmaWxlIGludG8gd2hpY2ggbW9zdCAoaWYgbm90IGFsbCkgVHlwZVxuICogQ2hlY2sgQmxvY2tzIChUQ0JzKSB3aWxsIGJlIGdlbmVyYXRlZC5cbiAqXG4gKiBUaGUgYFR5cGVDaGVja0ZpbGVgIGhvc3RzIG11bHRpcGxlIFRDQnMgYW5kIGFsbG93cyB0aGUgc2hhcmluZyBvZiBkZWNsYXJhdGlvbnMgKGUuZy4gdHlwZVxuICogY29uc3RydWN0b3JzKSBiZXR3ZWVuIHRoZW0uIFJhdGhlciB0aGFuIHJldHVybiBzdWNoIGRlY2xhcmF0aW9ucyB2aWEgYGdldFByZWx1ZGVTdGF0ZW1lbnRzKClgLCBpdFxuICogaG9pc3RzIHRoZW0gdG8gdGhlIHRvcCBvZiB0aGUgZ2VuZXJhdGVkIGB0cy5Tb3VyY2VGaWxlYC5cbiAqL1xuZXhwb3J0IGNsYXNzIFR5cGVDaGVja0ZpbGUgZXh0ZW5kcyBFbnZpcm9ubWVudCB7XG4gIHByaXZhdGUgbmV4dFRjYklkID0gMTtcbiAgcHJpdmF0ZSB0Y2JTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgZmlsZU5hbWU6IEFic29sdXRlRnNQYXRoLCBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZywgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcixcbiAgICAgIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGNvbXBpbGVySG9zdDogUGljazx0cy5Db21waWxlckhvc3QsICdnZXRDYW5vbmljYWxGaWxlTmFtZSc+KSB7XG4gICAgc3VwZXIoXG4gICAgICAgIGNvbmZpZywgbmV3IEltcG9ydE1hbmFnZXIobmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpLCAnaScpLCByZWZFbWl0dGVyLCByZWZsZWN0b3IsXG4gICAgICAgIHRzLmNyZWF0ZVNvdXJjZUZpbGUoXG4gICAgICAgICAgICBjb21waWxlckhvc3QuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpLCAnJywgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSkpO1xuICB9XG5cbiAgYWRkVHlwZUNoZWNrQmxvY2soXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PiwgbWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSxcbiAgICAgIGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXIsIG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIpOiB2b2lkIHtcbiAgICBjb25zdCBmbklkID0gdHMuY3JlYXRlSWRlbnRpZmllcihgX3RjYiR7dGhpcy5uZXh0VGNiSWQrK31gKTtcbiAgICBjb25zdCBmbiA9IGdlbmVyYXRlVHlwZUNoZWNrQmxvY2sodGhpcywgcmVmLCBmbklkLCBtZXRhLCBkb21TY2hlbWFDaGVja2VyLCBvb2JSZWNvcmRlcik7XG4gICAgdGhpcy50Y2JTdGF0ZW1lbnRzLnB1c2goZm4pO1xuICB9XG5cbiAgcmVuZGVyKCk6IHN0cmluZyB7XG4gICAgbGV0IHNvdXJjZTogc3RyaW5nID0gdGhpcy5pbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHModGhpcy5jb250ZXh0RmlsZS5maWxlTmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChpID0+IGBpbXBvcnQgKiBhcyAke2kucXVhbGlmaWVyfSBmcm9tICcke2kuc3BlY2lmaWVyfSc7YClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcbicpICtcbiAgICAgICAgJ1xcblxcbic7XG4gICAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgICBzb3VyY2UgKz0gJ1xcbic7XG4gICAgZm9yIChjb25zdCBzdG10IG9mIHRoaXMucGlwZUluc3RTdGF0ZW1lbnRzKSB7XG4gICAgICBzb3VyY2UgKz0gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHN0bXQsIHRoaXMuY29udGV4dEZpbGUpICsgJ1xcbic7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc3RtdCBvZiB0aGlzLnR5cGVDdG9yU3RhdGVtZW50cykge1xuICAgICAgc291cmNlICs9IHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBzdG10LCB0aGlzLmNvbnRleHRGaWxlKSArICdcXG4nO1xuICAgIH1cbiAgICBzb3VyY2UgKz0gJ1xcbic7XG4gICAgZm9yIChjb25zdCBzdG10IG9mIHRoaXMudGNiU3RhdGVtZW50cykge1xuICAgICAgc291cmNlICs9IHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBzdG10LCB0aGlzLmNvbnRleHRGaWxlKSArICdcXG4nO1xuICAgIH1cblxuICAgIC8vIEVuc3VyZSB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBmaWxlIGlzIGFuIEVTIG1vZHVsZS4gT3RoZXJ3aXNlLCBpdCdzIGludGVycHJldGVkIGFzIHNvbWVcbiAgICAvLyBraW5kIG9mIGdsb2JhbCBuYW1lc3BhY2UgaW4gVFMsIHdoaWNoIGZvcmNlcyBhIGZ1bGwgcmUtdHlwZWNoZWNrIG9mIHRoZSB1c2VyJ3MgcHJvZ3JhbSB0aGF0XG4gICAgLy8gaXMgc29tZWhvdyBtb3JlIGV4cGVuc2l2ZSB0aGFuIHRoZSBpbml0aWFsIHBhcnNlLlxuICAgIHNvdXJjZSArPSAnXFxuZXhwb3J0IGNvbnN0IElTX0FfTU9EVUxFID0gdHJ1ZTtcXG4nO1xuXG4gICAgcmV0dXJuIHNvdXJjZTtcbiAgfVxuXG4gIGdldFByZWx1ZGVTdGF0ZW1lbnRzKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gW107XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja0ZpbGVQYXRoKHJvb3REaXJzOiBBYnNvbHV0ZUZzUGF0aFtdKTogQWJzb2x1dGVGc1BhdGgge1xuICBjb25zdCBzaG9ydGVzdCA9IHJvb3REaXJzLmNvbmNhdChbXSkuc29ydCgoYSwgYikgPT4gYS5sZW5ndGggLSBiLmxlbmd0aClbMF07XG4gIHJldHVybiBqb2luKHNob3J0ZXN0LCAnX19uZ190eXBlY2hlY2tfXy50cycpO1xufVxuIl19