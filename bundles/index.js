
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  GLOBAL_DEFS_FOR_TERSER,
  GLOBAL_DEFS_FOR_TERSER_WITH_AOT,
  constructorParametersDownlevelTransform
} from "./chunk-ACINBTQB.js";
import {
  DEFAULT_ERROR_CODE,
  EmitFlags,
  METADATA_VERSION,
  MetadataCollector,
  NgCompiler,
  NgCompilerHost,
  NgtscProgram,
  OptimizeFor,
  PatchedProgramIncrementalBuildStrategy,
  SOURCE,
  TsCreateProgramDriver,
  UNKNOWN_ERROR_CODE,
  calcProjectFileAndBasePath,
  createBundleIndexHost,
  createCompilerHost,
  createProgram,
  defaultGatherDiagnostics,
  exitCodeFromResult,
  flattenDiagnosticMessageChain,
  formatDiagnostic,
  formatDiagnosticPosition,
  formatDiagnostics,
  freshCompilationTicket,
  incrementalFromStateTicket,
  isClassMetadata,
  isConstructorMetadata,
  isFunctionMetadata,
  isInterfaceMetadata,
  isMemberMetadata,
  isMetadataError,
  isMetadataGlobalReferenceExpression,
  isMetadataImportDefaultReference,
  isMetadataImportedSymbolReferenceExpression,
  isMetadataModuleReferenceExpression,
  isMetadataSymbolicBinaryExpression,
  isMetadataSymbolicCallExpression,
  isMetadataSymbolicExpression,
  isMetadataSymbolicIfExpression,
  isMetadataSymbolicIndexExpression,
  isMetadataSymbolicPrefixExpression,
  isMetadataSymbolicReferenceExpression,
  isMetadataSymbolicSelectExpression,
  isMetadataSymbolicSpreadExpression,
  isMethodMetadata,
  isModuleMetadata,
  isNgDiagnostic,
  isTsDiagnostic,
  ngToTsDiagnostic,
  performCompilation,
  readConfiguration,
  untagAllTsFiles
} from "./chunk-VKIZ4TCJ.js";
import "./chunk-MIQ5UCHZ.js";
import "./chunk-PBA67OV4.js";
import "./chunk-S3QIIFH7.js";
import {
  ConsoleLogger,
  LogLevel
} from "./chunk-SKBLJA43.js";
import "./chunk-WYO7JO2T.js";
import {
  LogicalFileSystem,
  LogicalProjectPath,
  NgtscCompilerHost,
  NodeJSFileSystem,
  absoluteFrom,
  absoluteFromSourceFile,
  basename,
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
} from "./chunk-EP5JHXG2.js";
import {
  ActivePerfRecorder,
  PerfPhase
} from "./chunk-GLCRIILX.js";
import {
  __spreadValues
} from "./chunk-XA5IZLLC.js";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/index.mjs
import { StaticReflector, StaticSymbol } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/version.mjs
import { Version } from "@angular/compiler";
var VERSION = new Version("13.1.0-next.2+12.sha-213105c.with-local-changes");

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/tsc_plugin.mjs
var NgTscPlugin = class {
  constructor(ngOptions) {
    this.ngOptions = ngOptions;
    this.name = "ngtsc";
    this.options = null;
    this.host = null;
    this._compiler = null;
    setFileSystem(new NodeJSFileSystem());
  }
  get compiler() {
    if (this._compiler === null) {
      throw new Error("Lifecycle error: setupCompilation() must be called first.");
    }
    return this._compiler;
  }
  wrapHost(host, inputFiles, options) {
    this.options = __spreadValues(__spreadValues({}, this.ngOptions), options);
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
    untagAllTsFiles(program);
    const programDriver = new TsCreateProgramDriver(program, this.host, this.options, this.host.shimExtensionPrefixes);
    const strategy = new PatchedProgramIncrementalBuildStrategy();
    const oldState = oldProgram !== void 0 ? strategy.getIncrementalState(oldProgram) : null;
    let ticket;
    const modifiedResourceFiles = new Set();
    if (this.host.getModifiedResourceFiles !== void 0) {
      for (const resourceFile of (_a = this.host.getModifiedResourceFiles()) != null ? _a : []) {
        modifiedResourceFiles.add(resolve(resourceFile));
      }
    }
    if (oldProgram === void 0 || oldState === null) {
      ticket = freshCompilationTicket(program, this.options, strategy, programDriver, perfRecorder, false, false);
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
  EmitFlags,
  GLOBAL_DEFS_FOR_TERSER,
  GLOBAL_DEFS_FOR_TERSER_WITH_AOT,
  LogLevel,
  LogicalFileSystem,
  LogicalProjectPath,
  METADATA_VERSION,
  MetadataCollector,
  NgTscPlugin,
  NgtscCompilerHost,
  NgtscProgram,
  NodeJSFileSystem,
  OptimizeFor,
  SOURCE,
  StaticReflector,
  StaticSymbol,
  UNKNOWN_ERROR_CODE,
  VERSION,
  absoluteFrom,
  absoluteFromSourceFile,
  basename,
  calcProjectFileAndBasePath,
  constructorParametersDownlevelTransform,
  createBundleIndexHost,
  createCompilerHost,
  createProgram,
  defaultGatherDiagnostics,
  dirname,
  exitCodeFromResult,
  flattenDiagnosticMessageChain,
  formatDiagnostic,
  formatDiagnosticPosition,
  formatDiagnostics,
  getFileSystem,
  getSourceFileOrError,
  isClassMetadata,
  isConstructorMetadata,
  isFunctionMetadata,
  isInterfaceMetadata,
  isLocalRelativePath,
  isMemberMetadata,
  isMetadataError,
  isMetadataGlobalReferenceExpression,
  isMetadataImportDefaultReference,
  isMetadataImportedSymbolReferenceExpression,
  isMetadataModuleReferenceExpression,
  isMetadataSymbolicBinaryExpression,
  isMetadataSymbolicCallExpression,
  isMetadataSymbolicExpression,
  isMetadataSymbolicIfExpression,
  isMetadataSymbolicIndexExpression,
  isMetadataSymbolicPrefixExpression,
  isMetadataSymbolicReferenceExpression,
  isMetadataSymbolicSelectExpression,
  isMetadataSymbolicSpreadExpression,
  isMethodMetadata,
  isModuleMetadata,
  isNgDiagnostic,
  isRoot,
  isRooted,
  isTsDiagnostic,
  join,
  ngToTsDiagnostic,
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
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=index.js.map
