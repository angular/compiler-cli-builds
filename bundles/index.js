
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
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
} from "./chunk-TFJ2HFCB.js";
import {
  ConsoleLogger,
  LogLevel
} from "./chunk-6HOSNZU5.js";
import {
  angularJitApplicationTransform,
  getDownlevelDecoratorsTransform,
  getInitializerApiJitTransform
} from "./chunk-2WL2LMYD.js";
import {
  ActivePerfRecorder,
  ErrorCode,
  OptimizeFor,
  PerfPhase,
  TsCreateProgramDriver,
  isLocalCompilationDiagnostics,
  ngErrorCode
} from "./chunk-NR7S7ISS.js";
import "./chunk-I2BHWRAU.js";
import {
  InvalidFileSystem,
  LogicalFileSystem,
  LogicalProjectPath,
  NgtscCompilerHost,
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
} from "./chunk-GWZQLAGK.js";
import {
  NodeJSFileSystem
} from "./chunk-XYYEESKY.js";
import "./chunk-G7GFT6BU.js";

// packages/compiler-cli/src/version.js
import { Version } from "@angular/compiler";
var VERSION = new Version("20.3.4+sha-5f4f624");

// packages/compiler-cli/private/tooling.js
var GLOBAL_DEFS_FOR_TERSER = {
  ngDevMode: false,
  ngI18nClosureMode: false
};
var GLOBAL_DEFS_FOR_TERSER_WITH_AOT = {
  ...GLOBAL_DEFS_FOR_TERSER,
  ngJitMode: false
};
var constructorParametersDownlevelTransform = (program, isCore = false) => {
  return angularJitApplicationTransform(program, isCore);
};

// packages/compiler-cli/src/ngtsc/tsc_plugin.js
var NgTscPlugin = class {
  ngOptions;
  name = "ngtsc";
  options = null;
  host = null;
  _compiler = null;
  get compiler() {
    if (this._compiler === null) {
      throw new Error("Lifecycle error: setupCompilation() must be called first.");
    }
    return this._compiler;
  }
  constructor(ngOptions) {
    this.ngOptions = ngOptions;
    setFileSystem(new NodeJSFileSystem());
  }
  wrapHost(host, inputFiles, options) {
    this.options = { ...this.ngOptions, ...options };
    this.host = NgCompilerHost.wrap(
      host,
      inputFiles,
      this.options,
      /* oldProgram */
      null
    );
    return this.host;
  }
  setupCompilation(program, oldProgram) {
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
      for (const resourceFile of this.host.getModifiedResourceFiles() ?? []) {
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
        /* enableTemplateTypeChecker */
        false,
        /* usePoisonedData */
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

// packages/compiler-cli/index.ts
setFileSystem(new NodeJSFileSystem());
export {
  ConsoleLogger,
  DEFAULT_ERROR_CODE,
  DecoratorType,
  DocsExtractor,
  EmitFlags,
  EntryType,
  ErrorCode,
  GLOBAL_DEFS_FOR_TERSER,
  GLOBAL_DEFS_FOR_TERSER_WITH_AOT,
  InvalidFileSystem,
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
  ngErrorCode,
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
