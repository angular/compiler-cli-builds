
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  GLOBAL_DEFS_FOR_TERSER,
  GLOBAL_DEFS_FOR_TERSER_WITH_AOT,
  constructorParametersDownlevelTransform
} from "./chunk-KGEMNMTH.js";
import {
  DEFAULT_ERROR_CODE,
  DecoratorType,
  DocsExtractor,
  EmitFlags,
  EntryType,
  MemberTags,
  MemberType,
  NgCompiler,
  NgCompilerHost,
  NgtscProgram,
  PatchedProgramIncrementalBuildStrategy,
  SOURCE,
  UNKNOWN_ERROR_CODE,
  calcProjectFileAndBasePath,
  createCompilerHost,
  createProgram,
  defaultGatherDiagnostics,
  exitCodeFromResult,
  formatDiagnostics,
  freshCompilationTicket,
  incrementalFromStateTicket,
  isDocEntryWithSourceInfo,
  isTsDiagnostic,
  performCompilation,
  readConfiguration
} from "./chunk-2KSGTNY4.js";
import {
  angularJitApplicationTransform,
  getDownlevelDecoratorsTransform,
  getInitializerApiJitTransform
} from "./chunk-TFIXU576.js";
import {
  OptimizeFor,
  TsCreateProgramDriver
} from "./chunk-GVXGZHIM.js";
import {
  isLocalCompilationDiagnostics
} from "./chunk-O2RMLJTP.js";
import {
  ActivePerfRecorder,
  PerfPhase
} from "./chunk-XSNUHRLJ.js";
import {
  ConsoleLogger,
  LogLevel
} from "./chunk-RT2QTF73.js";
import {
  LogicalFileSystem,
  LogicalProjectPath,
  NgtscCompilerHost,
  NodeJSFileSystem,
  absoluteFrom,
  absoluteFromSourceFile,
  basename,
  createFileSystemTsReadDirectoryFn,
  dirname,
  getFileSystem,
  getSourceFileOrError,
  isLocalRelativePath,
  isRoot,
  isRooted,
  join,
  relative,
  relativeFrom,
  resolve,
  setFileSystem,
  toRelativeImport
} from "./chunk-UJ2J6WV4.js";
import "./chunk-XI2RTGAL.js";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/version.mjs
import { Version } from "@angular/compiler";
var VERSION = new Version("19.0.0-next.10+sha-dff4de0");

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/tsc_plugin.mjs
var NgTscPlugin = class {
  get compiler() {
    if (this._compiler === null) {
      throw new Error("Lifecycle error: setupCompilation() must be called first.");
    }
    return this._compiler;
  }
  constructor(ngOptions) {
    this.ngOptions = ngOptions;
    this.name = "ngtsc";
    this.options = null;
    this.host = null;
    this._compiler = null;
    setFileSystem(new NodeJSFileSystem());
  }
  wrapHost(host, inputFiles, options) {
    this.options = { ...this.ngOptions, ...options };
    this.host = NgCompilerHost.wrap(host, inputFiles, this.options, null);
    return this.host;
  }
  setupCompilation(program, oldProgram) {
    var _a;
    const perfRecorder = ActivePerfRecorder.zeroedToNow();
    if (this.host === null || this.options === null) {
      throw new Error("Lifecycle error: setupCompilation() before wrapHost().");
    }
    this.host.postProgramCreationCleanup();
    const programDriver = new TsCreateProgramDriver(program, this.host, this.options, this.host.shimExtensionPrefixes);
    const strategy = new PatchedProgramIncrementalBuildStrategy();
    const oldState = oldProgram !== void 0 ? strategy.getIncrementalState(oldProgram) : null;
    let ticket;
    const modifiedResourceFiles = /* @__PURE__ */ new Set();
    if (this.host.getModifiedResourceFiles !== void 0) {
      for (const resourceFile of (_a = this.host.getModifiedResourceFiles()) != null ? _a : []) {
        modifiedResourceFiles.add(resolve(resourceFile));
      }
    }
    if (oldProgram === void 0 || oldState === null) {
      ticket = freshCompilationTicket(
        program,
        this.options,
        strategy,
        programDriver,
        perfRecorder,
        false,
        false
      );
    } else {
      strategy.toNextBuildStrategy().getIncrementalState(oldProgram);
      ticket = incrementalFromStateTicket(oldProgram, oldState, program, this.options, strategy, programDriver, modifiedResourceFiles, perfRecorder, false, false);
    }
    this._compiler = NgCompiler.fromTicket(ticket, this.host);
    return {
      ignoreForDiagnostics: this._compiler.ignoreForDiagnostics,
      ignoreForEmit: this._compiler.ignoreForEmit
    };
  }
  getDiagnostics(file) {
    if (file === void 0) {
      return this.compiler.getDiagnostics();
    }
    return this.compiler.getDiagnosticsForFile(file, OptimizeFor.WholeProgram);
  }
  getOptionDiagnostics() {
    return this.compiler.getOptionDiagnostics();
  }
  getNextProgram() {
    return this.compiler.getCurrentProgram();
  }
  createTransformers() {
    this.compiler.perfRecorder.phase(PerfPhase.TypeScriptEmit);
    return this.compiler.prepareEmit().transformers;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/index.mjs
setFileSystem(new NodeJSFileSystem());
export {
  ConsoleLogger,
  DEFAULT_ERROR_CODE,
  DecoratorType,
  DocsExtractor,
  EmitFlags,
  EntryType,
  GLOBAL_DEFS_FOR_TERSER,
  GLOBAL_DEFS_FOR_TERSER_WITH_AOT,
  LogLevel,
  LogicalFileSystem,
  LogicalProjectPath,
  MemberTags,
  MemberType,
  NgTscPlugin,
  NgtscCompilerHost,
  NgtscProgram,
  NodeJSFileSystem,
  OptimizeFor,
  SOURCE,
  UNKNOWN_ERROR_CODE,
  VERSION,
  absoluteFrom,
  absoluteFromSourceFile,
  angularJitApplicationTransform,
  basename,
  calcProjectFileAndBasePath,
  constructorParametersDownlevelTransform,
  createCompilerHost,
  createFileSystemTsReadDirectoryFn,
  createProgram,
  defaultGatherDiagnostics,
  dirname,
  exitCodeFromResult,
  formatDiagnostics,
  getDownlevelDecoratorsTransform,
  getFileSystem,
  getInitializerApiJitTransform,
  getSourceFileOrError,
  isDocEntryWithSourceInfo,
  isLocalCompilationDiagnostics,
  isLocalRelativePath,
  isRoot,
  isRooted,
  isTsDiagnostic,
  join,
  performCompilation,
  readConfiguration,
  relative,
  relativeFrom,
  resolve,
  setFileSystem,
  toRelativeImport
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
//# sourceMappingURL=index.js.map
