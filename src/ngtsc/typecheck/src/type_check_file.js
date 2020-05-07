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
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
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
            var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
            var source = this.importManager.getAllImports(this.contextFile.fileName)
                .map(function (i) { return "import * as " + i.qualifier + " from '" + i.specifier + "';"; })
                .join('\n') +
                '\n\n';
            var printer = ts.createPrinter();
            source += '\n';
            try {
                for (var _e = tslib_1.__values(this.helperStatements), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var stmt = _f.value;
                    source += printer.printNode(ts.EmitHint.Unspecified, stmt, this.contextFile) + '\n';
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            try {
                for (var _g = tslib_1.__values(this.pipeInstStatements), _h = _g.next(); !_h.done; _h = _g.next()) {
                    var stmt = _h.value;
                    source += printer.printNode(ts.EmitHint.Unspecified, stmt, this.contextFile) + '\n';
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                for (var _j = tslib_1.__values(this.typeCtorStatements), _k = _j.next(); !_k.done; _k = _j.next()) {
                    var stmt = _k.value;
                    source += printer.printNode(ts.EmitHint.Unspecified, stmt, this.contextFile) + '\n';
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                }
                finally { if (e_3) throw e_3.error; }
            }
            source += '\n';
            try {
                for (var _l = tslib_1.__values(this.tcbStatements), _m = _l.next(); !_m.done; _m = _l.next()) {
                    var stmt = _m.value;
                    source += printer.printNode(ts.EmitHint.Unspecified, stmt, this.contextFile) + '\n';
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
                }
                finally { if (e_4) throw e_4.error; }
            }
            // Ensure the template type-checking file is an ES module. Otherwise, it's interpreted as some
            // kind of global namespace in TS, which forces a full re-typecheck of the user's program that
            // is somehow more expensive than the initial parse.
            source += '\nexport const IS_A_MODULE = true;\n';
            return ts.createSourceFile(this.contextFile.fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL3R5cGVfY2hlY2tfZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFFakMsMkVBQXVEO0lBQ3ZELG1FQUE4RTtJQUU5RSx5RUFBK0M7SUFJL0MseUZBQTBDO0lBRTFDLG1HQUEwRDtJQUkxRDs7Ozs7OztPQU9HO0lBQ0g7UUFBbUMseUNBQVc7UUFJNUMsdUJBQ2EsUUFBd0IsRUFBRSxNQUEwQixFQUFFLFVBQTRCLEVBQzNGLFNBQXlCLEVBQUUsWUFBNkI7WUFGNUQsWUFHRSxrQkFDSSxNQUFNLEVBQUUsSUFBSSwwQkFBYSxDQUFDLElBQUksNEJBQWtCLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUMvRSxFQUFFLENBQUMsZ0JBQWdCLENBQ2YsWUFBWSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxTQUN4RjtZQU5ZLGNBQVEsR0FBUixRQUFRLENBQWdCO1lBSjdCLGVBQVMsR0FBRyxDQUFDLENBQUM7WUFDZCxtQkFBYSxHQUFtQixFQUFFLENBQUM7O1FBUzNDLENBQUM7UUFFRCx5Q0FBaUIsR0FBakIsVUFDSSxHQUFxRCxFQUFFLElBQTRCLEVBQ25GLGdCQUFrQyxFQUFFLFdBQXdDO1lBQzlFLElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFPLElBQUksQ0FBQyxTQUFTLEVBQUksQ0FBQyxDQUFDO1lBQzVELElBQU0sRUFBRSxHQUFHLHlDQUFzQixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxF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QUMsQ0FBQyxDQUFDO1FBQzVFLE9BQU8sa0JBQUksQ0FBQyxRQUFRLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBSEQsOENBR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgam9pbn0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOb29wSW1wb3J0UmV3cml0ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5cbmltcG9ydCB7VHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgVHlwZUNoZWNraW5nQ29uZmlnfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0RvbVNjaGVtYUNoZWNrZXJ9IGZyb20gJy4vZG9tJztcbmltcG9ydCB7RW52aXJvbm1lbnR9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuaW1wb3J0IHtPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXJ9IGZyb20gJy4vb29iJztcbmltcG9ydCB7Z2VuZXJhdGVUeXBlQ2hlY2tCbG9ja30gZnJvbSAnLi90eXBlX2NoZWNrX2Jsb2NrJztcblxuXG5cbi8qKlxuICogQW4gYEVudmlyb25tZW50YCByZXByZXNlbnRpbmcgdGhlIHNpbmdsZSB0eXBlLWNoZWNraW5nIGZpbGUgaW50byB3aGljaCBtb3N0IChpZiBub3QgYWxsKSBUeXBlXG4gKiBDaGVjayBCbG9ja3MgKFRDQnMpIHdpbGwgYmUgZ2VuZXJhdGVkLlxuICpcbiAqIFRoZSBgVHlwZUNoZWNrRmlsZWAgaG9zdHMgbXVsdGlwbGUgVENCcyBhbmQgYWxsb3dzIHRoZSBzaGFyaW5nIG9mIGRlY2xhcmF0aW9ucyAoZS5nLiB0eXBlXG4gKiBjb25zdHJ1Y3RvcnMpIGJldHdlZW4gdGhlbS4gUmF0aGVyIHRoYW4gcmV0dXJuIHN1Y2ggZGVjbGFyYXRpb25zIHZpYSBgZ2V0UHJlbHVkZVN0YXRlbWVudHMoKWAsIGl0XG4gKiBob2lzdHMgdGhlbSB0byB0aGUgdG9wIG9mIHRoZSBnZW5lcmF0ZWQgYHRzLlNvdXJjZUZpbGVgLlxuICovXG5leHBvcnQgY2xhc3MgVHlwZUNoZWNrRmlsZSBleHRlbmRzIEVudmlyb25tZW50IHtcbiAgcHJpdmF0ZSBuZXh0VGNiSWQgPSAxO1xuICBwcml2YXRlIHRjYlN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBmaWxlTmFtZTogQWJzb2x1dGVGc1BhdGgsIGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLFxuICAgICAgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgY29tcGlsZXJIb3N0OiB0cy5Db21waWxlckhvc3QpIHtcbiAgICBzdXBlcihcbiAgICAgICAgY29uZmlnLCBuZXcgSW1wb3J0TWFuYWdlcihuZXcgTm9vcEltcG9ydFJld3JpdGVyKCksICdpJyksIHJlZkVtaXR0ZXIsIHJlZmxlY3RvcixcbiAgICAgICAgdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgICAgIGNvbXBpbGVySG9zdC5nZXRDYW5vbmljYWxGaWxlTmFtZShmaWxlTmFtZSksICcnLCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlKSk7XG4gIH1cblxuICBhZGRUeXBlQ2hlY2tCbG9jayhcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LCBtZXRhOiBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhLFxuICAgICAgZG9tU2NoZW1hQ2hlY2tlcjogRG9tU2NoZW1hQ2hlY2tlciwgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcik6IHZvaWQge1xuICAgIGNvbnN0IGZuSWQgPSB0cy5jcmVhdGVJZGVudGlmaWVyKGBfdGNiJHt0aGlzLm5leHRUY2JJZCsrfWApO1xuICAgIGNvbnN0IGZuID0gZ2VuZXJhdGVUeXBlQ2hlY2tCbG9jayh0aGlzLCByZWYsIGZuSWQsIG1ldGEsIGRvbVNjaGVtYUNoZWNrZXIsIG9vYlJlY29yZGVyKTtcbiAgICB0aGlzLnRjYlN0YXRlbWVudHMucHVzaChmbik7XG4gIH1cblxuICByZW5kZXIoKTogdHMuU291cmNlRmlsZSB7XG4gICAgbGV0IHNvdXJjZTogc3RyaW5nID0gdGhpcy5pbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHModGhpcy5jb250ZXh0RmlsZS5maWxlTmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChpID0+IGBpbXBvcnQgKiBhcyAke2kucXVhbGlmaWVyfSBmcm9tICcke2kuc3BlY2lmaWVyfSc7YClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcbicpICtcbiAgICAgICAgJ1xcblxcbic7XG4gICAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgICBzb3VyY2UgKz0gJ1xcbic7XG4gICAgZm9yIChjb25zdCBzdG10IG9mIHRoaXMuaGVscGVyU3RhdGVtZW50cykge1xuICAgICAgc291cmNlICs9IHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBzdG10LCB0aGlzLmNvbnRleHRGaWxlKSArICdcXG4nO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHN0bXQgb2YgdGhpcy5waXBlSW5zdFN0YXRlbWVudHMpIHtcbiAgICAgIHNvdXJjZSArPSBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgc3RtdCwgdGhpcy5jb250ZXh0RmlsZSkgKyAnXFxuJztcbiAgICB9XG4gICAgZm9yIChjb25zdCBzdG10IG9mIHRoaXMudHlwZUN0b3JTdGF0ZW1lbnRzKSB7XG4gICAgICBzb3VyY2UgKz0gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHN0bXQsIHRoaXMuY29udGV4dEZpbGUpICsgJ1xcbic7XG4gICAgfVxuICAgIHNvdXJjZSArPSAnXFxuJztcbiAgICBmb3IgKGNvbnN0IHN0bXQgb2YgdGhpcy50Y2JTdGF0ZW1lbnRzKSB7XG4gICAgICBzb3VyY2UgKz0gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHN0bXQsIHRoaXMuY29udGV4dEZpbGUpICsgJ1xcbic7XG4gICAgfVxuXG4gICAgLy8gRW5zdXJlIHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGZpbGUgaXMgYW4gRVMgbW9kdWxlLiBPdGhlcndpc2UsIGl0J3MgaW50ZXJwcmV0ZWQgYXMgc29tZVxuICAgIC8vIGtpbmQgb2YgZ2xvYmFsIG5hbWVzcGFjZSBpbiBUUywgd2hpY2ggZm9yY2VzIGEgZnVsbCByZS10eXBlY2hlY2sgb2YgdGhlIHVzZXIncyBwcm9ncmFtIHRoYXRcbiAgICAvLyBpcyBzb21laG93IG1vcmUgZXhwZW5zaXZlIHRoYW4gdGhlIGluaXRpYWwgcGFyc2UuXG4gICAgc291cmNlICs9ICdcXG5leHBvcnQgY29uc3QgSVNfQV9NT0RVTEUgPSB0cnVlO1xcbic7XG5cbiAgICByZXR1cm4gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgdGhpcy5jb250ZXh0RmlsZS5maWxlTmFtZSwgc291cmNlLCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTKTtcbiAgfVxuXG4gIGdldFByZWx1ZGVTdGF0ZW1lbnRzKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gW107XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVDaGVja0ZpbGVQYXRoKHJvb3REaXJzOiBBYnNvbHV0ZUZzUGF0aFtdKTogQWJzb2x1dGVGc1BhdGgge1xuICBjb25zdCBzaG9ydGVzdCA9IHJvb3REaXJzLmNvbmNhdChbXSkuc29ydCgoYSwgYikgPT4gYS5sZW5ndGggLSBiLmxlbmd0aClbMF07XG4gIHJldHVybiBqb2luKHNob3J0ZXN0LCAnX19uZ190eXBlY2hlY2tfXy50cycpO1xufVxuIl19