
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  getInitializerApiJitTransform
} from "../chunk-UGKSO7XM.js";
import {
  ImportedSymbolsTracker,
  TypeScriptReflectionHost
} from "../chunk-6JVXY2BY.js";
import "../chunk-2RWOSWE5.js";
import {
  InvalidFileSystem,
  absoluteFrom,
  basename,
  dirname,
  getFileSystem,
  resolve,
  setFileSystem
} from "../chunk-UTWH365F.js";
import {
  NodeJSFileSystem
} from "../chunk-KWAGEHJJ.js";
import "../chunk-IEBNHER4.js";

// packages/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system.js
var MockFileSystem = class {
  _isCaseSensitive;
  _fileTree = {};
  _cwd;
  constructor(_isCaseSensitive = false, cwd = "/") {
    this._isCaseSensitive = _isCaseSensitive;
    this._cwd = this.normalize(cwd);
  }
  isCaseSensitive() {
    return this._isCaseSensitive;
  }
  exists(path) {
    return this.findFromPath(path).entity !== null;
  }
  readFile(path) {
    const { entity } = this.findFromPath(path);
    if (isFile(entity)) {
      if (entity instanceof Uint8Array) {
        return new TextDecoder().decode(entity);
      }
      return entity.toString();
    } else {
      throw new MockFileSystemError("ENOENT", path, `File "${path}" does not exist.`);
    }
  }
  readFileBuffer(path) {
    const { entity } = this.findFromPath(path);
    if (isFile(entity)) {
      if (entity instanceof Uint8Array) {
        return entity;
      }
      const encoder = new TextEncoder();
      return encoder.encode(entity);
    } else {
      throw new MockFileSystemError("ENOENT", path, `File "${path}" does not exist.`);
    }
  }
  writeFile(path, data, exclusive = false) {
    const [folderPath, basename2] = this.splitIntoFolderAndFile(path);
    const { entity } = this.findFromPath(folderPath);
    if (entity === null || !isFolder(entity)) {
      throw new MockFileSystemError("ENOENT", path, `Unable to write file "${path}". The containing folder does not exist.`);
    }
    if (exclusive && entity[basename2] !== void 0) {
      throw new MockFileSystemError("EEXIST", path, `Unable to exclusively write file "${path}". The file already exists.`);
    }
    entity[basename2] = data;
  }
  removeFile(path) {
    const [folderPath, basename2] = this.splitIntoFolderAndFile(path);
    const { entity } = this.findFromPath(folderPath);
    if (entity === null || !isFolder(entity)) {
      throw new MockFileSystemError("ENOENT", path, `Unable to remove file "${path}". The containing folder does not exist.`);
    }
    if (isFolder(entity[basename2])) {
      throw new MockFileSystemError("EISDIR", path, `Unable to remove file "${path}". The path to remove is a folder.`);
    }
    delete entity[basename2];
  }
  symlink(target, path) {
    const [folderPath, basename2] = this.splitIntoFolderAndFile(path);
    const { entity } = this.findFromPath(folderPath);
    if (entity === null || !isFolder(entity)) {
      throw new MockFileSystemError("ENOENT", path, `Unable to create symlink at "${path}". The containing folder does not exist.`);
    }
    entity[basename2] = new SymLink(target);
  }
  readdir(path) {
    const { entity } = this.findFromPath(path);
    if (entity === null) {
      throw new MockFileSystemError("ENOENT", path, `Unable to read directory "${path}". It does not exist.`);
    }
    if (isFile(entity)) {
      throw new MockFileSystemError("ENOTDIR", path, `Unable to read directory "${path}". It is a file.`);
    }
    return Object.keys(entity);
  }
  lstat(path) {
    const { entity } = this.findFromPath(path);
    if (entity === null) {
      throw new MockFileSystemError("ENOENT", path, `File "${path}" does not exist.`);
    }
    return new MockFileStats(entity);
  }
  stat(path) {
    const { entity } = this.findFromPath(path, { followSymLinks: true });
    if (entity === null) {
      throw new MockFileSystemError("ENOENT", path, `File "${path}" does not exist.`);
    }
    return new MockFileStats(entity);
  }
  copyFile(from, to) {
    this.writeFile(to, this.readFile(from));
  }
  moveFile(from, to) {
    this.writeFile(to, this.readFile(from));
    const result = this.findFromPath(dirname(from));
    const folder = result.entity;
    const name = basename(from);
    delete folder[name];
  }
  ensureDir(path) {
    const segments = this.splitPath(path).map((segment) => this.getCanonicalPath(segment));
    segments[0] = "";
    if (segments.length > 1 && segments[segments.length - 1] === "") {
      segments.pop();
    }
    let current = this._fileTree;
    for (const segment of segments) {
      if (isFile(current[segment])) {
        throw new Error(`Folder already exists as a file.`);
      }
      if (!current[segment]) {
        current[segment] = {};
      }
      current = current[segment];
    }
    return current;
  }
  removeDeep(path) {
    const [folderPath, basename2] = this.splitIntoFolderAndFile(path);
    const { entity } = this.findFromPath(folderPath);
    if (entity === null || !isFolder(entity)) {
      throw new MockFileSystemError("ENOENT", path, `Unable to remove folder "${path}". The containing folder does not exist.`);
    }
    delete entity[basename2];
  }
  isRoot(path) {
    return this.dirname(path) === path;
  }
  extname(path) {
    const match = /.+(\.[^.]*)$/.exec(path);
    return match !== null ? match[1] : "";
  }
  realpath(filePath) {
    const result = this.findFromPath(filePath, { followSymLinks: true });
    if (result.entity === null) {
      throw new MockFileSystemError("ENOENT", filePath, `Unable to find the real path of "${filePath}". It does not exist.`);
    } else {
      return result.path;
    }
  }
  pwd() {
    return this._cwd;
  }
  chdir(path) {
    this._cwd = this.normalize(path);
  }
  getDefaultLibLocation() {
    let path = "node_modules/typescript/lib";
    let resolvedPath = this.resolve(path);
    const topLevelNodeModules = this.resolve("/" + path);
    while (resolvedPath !== topLevelNodeModules) {
      if (this.exists(resolvedPath)) {
        return resolvedPath;
      }
      path = "../" + path;
      resolvedPath = this.resolve(path);
    }
    return topLevelNodeModules;
  }
  dump() {
    const { entity } = this.findFromPath(this.resolve("/"));
    if (entity === null || !isFolder(entity)) {
      return {};
    }
    return this.cloneFolder(entity);
  }
  init(folder) {
    this.mount(this.resolve("/"), folder);
  }
  mount(path, folder) {
    if (this.exists(path)) {
      throw new Error(`Unable to mount in '${path}' as it already exists.`);
    }
    const mountFolder = this.ensureDir(path);
    this.copyInto(folder, mountFolder);
  }
  cloneFolder(folder) {
    const clone = {};
    this.copyInto(folder, clone);
    return clone;
  }
  copyInto(from, to) {
    for (const path in from) {
      const canonicalPath = this.getCanonicalPath(path);
      Object.defineProperty(to, canonicalPath, {
        configurable: true,
        enumerable: true,
        get: () => {
          const item = from[path];
          let cloned;
          if (isSymLink(item)) {
            cloned = new SymLink(this.getCanonicalPath(item.path));
          } else if (isFolder(item)) {
            cloned = this.cloneFolder(item);
          } else {
            cloned = item;
          }
          Object.defineProperty(to, canonicalPath, {
            configurable: true,
            enumerable: true,
            value: cloned,
            writable: true
          });
          return cloned;
        },
        set: (value) => {
          Object.defineProperty(to, canonicalPath, {
            configurable: true,
            enumerable: true,
            value,
            writable: true
          });
        }
      });
    }
  }
  findFromPath(path, options) {
    const followSymLinks = !!options && options.followSymLinks;
    const segments = this.splitPath(path);
    if (segments.length > 1 && segments[segments.length - 1] === "") {
      segments.pop();
    }
    segments[0] = "";
    let current = this._fileTree;
    while (segments.length) {
      current = current[this.getCanonicalPath(segments.shift())];
      if (current === void 0) {
        return { path, entity: null };
      }
      if (segments.length > 0) {
        if (isFile(current)) {
          current = null;
          break;
        }
        if (isSymLink(current)) {
          return this.findFromPath(resolve(current.path, ...segments), { followSymLinks });
        }
      }
      if (isFile(current)) {
        break;
      }
      if (isSymLink(current)) {
        if (followSymLinks) {
          return this.findFromPath(resolve(current.path, ...segments), { followSymLinks });
        } else {
          break;
        }
      }
    }
    return { path, entity: current };
  }
  splitIntoFolderAndFile(path) {
    const segments = this.splitPath(this.getCanonicalPath(path));
    const file = segments.pop();
    return [path.substring(0, path.length - file.length - 1), file];
  }
  getCanonicalPath(p3) {
    return this.isCaseSensitive() ? p3 : p3.toLowerCase();
  }
};
var SymLink = class {
  path;
  constructor(path) {
    this.path = path;
  }
};
var MockFileStats = class {
  entity;
  constructor(entity) {
    this.entity = entity;
  }
  isFile() {
    return isFile(this.entity);
  }
  isDirectory() {
    return isFolder(this.entity);
  }
  isSymbolicLink() {
    return isSymLink(this.entity);
  }
};
var MockFileSystemError = class extends Error {
  code;
  path;
  constructor(code, path, message) {
    super(message);
    this.code = code;
    this.path = path;
  }
};
function isFile(item) {
  return item instanceof Uint8Array || typeof item === "string";
}
function isSymLink(item) {
  return item instanceof SymLink;
}
function isFolder(item) {
  return item !== null && !isFile(item) && !isSymLink(item);
}

// packages/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_native.js
import * as os from "os";
var isWindows = os.platform?.() === "win32";
var MockFileSystemNative = class extends MockFileSystem {
  constructor(cwd = "/") {
    super(void 0, cwd);
  }
  // Delegate to the real NodeJSFileSystem for these path related methods
  resolve(...paths) {
    return NodeJSFileSystem.prototype.resolve.call(this, this.pwd(), ...paths);
  }
  dirname(file) {
    return NodeJSFileSystem.prototype.dirname.call(this, file);
  }
  join(basePath, ...paths) {
    return NodeJSFileSystem.prototype.join.call(this, basePath, ...paths);
  }
  relative(from, to) {
    return NodeJSFileSystem.prototype.relative.call(this, from, to);
  }
  basename(filePath, extension) {
    return NodeJSFileSystem.prototype.basename.call(this, filePath, extension);
  }
  isCaseSensitive() {
    return NodeJSFileSystem.prototype.isCaseSensitive.call(this);
  }
  isRooted(path) {
    return NodeJSFileSystem.prototype.isRooted.call(this, path);
  }
  isRoot(path) {
    return NodeJSFileSystem.prototype.isRoot.call(this, path);
  }
  normalize(path) {
    if (isWindows) {
      path = path.replace(/^[\/\\]/i, "C:/");
    }
    return NodeJSFileSystem.prototype.normalize.call(this, path);
  }
  splitPath(path) {
    return path.split(/[\\\/]/);
  }
};

// packages/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_posix.js
import * as p from "path";
var MockFileSystemPosix = class extends MockFileSystem {
  resolve(...paths) {
    const resolved = p.posix.resolve(this.pwd(), ...paths);
    return this.normalize(resolved);
  }
  dirname(file) {
    return this.normalize(p.posix.dirname(file));
  }
  join(basePath, ...paths) {
    return this.normalize(p.posix.join(basePath, ...paths));
  }
  relative(from, to) {
    return this.normalize(p.posix.relative(from, to));
  }
  basename(filePath, extension) {
    return p.posix.basename(filePath, extension);
  }
  isRooted(path) {
    return path.startsWith("/");
  }
  splitPath(path) {
    return path.split("/");
  }
  normalize(path) {
    return path.replace(/^[a-z]:\//i, "/").replace(/\\/g, "/");
  }
};

// packages/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_windows.js
import * as p2 from "path";
var MockFileSystemWindows = class extends MockFileSystem {
  resolve(...paths) {
    const resolved = p2.win32.resolve(this.pwd(), ...paths);
    return this.normalize(resolved);
  }
  dirname(path) {
    return this.normalize(p2.win32.dirname(path));
  }
  join(basePath, ...paths) {
    return this.normalize(p2.win32.join(basePath, ...paths));
  }
  relative(from, to) {
    return this.normalize(p2.win32.relative(from, to));
  }
  basename(filePath, extension) {
    return p2.win32.basename(filePath, extension);
  }
  isRooted(path) {
    return /^([A-Z]:)?([\\\/]|$)/i.test(path);
  }
  splitPath(path) {
    return path.split(/[\\\/]/);
  }
  normalize(path) {
    return path.replace(/^[\/\\]/i, "C:/").replace(/\\/g, "/");
  }
};

// packages/compiler-cli/src/ngtsc/file_system/testing/src/ngp_known_failures.js
function isNgpSkipEnabled() {
  return process.env["NG_COMPILER_BACKEND"] === "ngp" && process.env["NGP_RUN_KNOWN_FAILURES"] !== "1";
}
function shouldSkipInNgp(fullSpecName) {
  if (!isNgpSkipEnabled()) {
    return false;
  }
  const normalized = fullSpecName.replace(/\s+/g, " ").trim();
  return NGP_KNOWN_TYPECHECK_FAILURES.has(normalized) || NGP_REQUIRES_TYPE_CHECKER.has(normalized) || NGP_KNOWN_NGTSC_FAILURES.has(normalized) || NGP_POTENTIAL_BREAKING_CHANGES.has(normalized);
}
var NGP_KNOWN_TYPECHECK_FAILURES = /* @__PURE__ */ new Set([
  "template parse failures should handle TypeScript parse failures gracefully",
  "template parse failures should handle non-Error failures gracefully",
  // The tests below check a pattern that is not allowed (private inputs/outputs). The reason they
  // pass with ngtsc is that the tests are set up in a way that bypasses some validations.
  // TODO(crisbeto): clean up these tests since they aren't testing a valid pattern.
  "input signal type-check diagnostics allow access to private input if modifiers are explicitly ignored",
  "input signal type-check diagnostics allow access to private input if modifiers are explicitly ignored, but error if not assignable",
  "input signal type-check diagnostics disallows access to private input",
  "input signal type-check diagnostics with `--strict` allow access to private input if modifiers are explicitly ignored",
  "input signal type-check diagnostics with `--strict` allow access to private input if modifiers are explicitly ignored, but error if not assignable",
  "input signal type-check diagnostics with `--strict` disallows access to private input",
  "model inputs type-check diagnostics allow access to private input if modifiers are explicitly ignored",
  "model inputs type-check diagnostics allow access to private model if modifiers are explicitly ignored, but error if not assignable",
  "model inputs type-check diagnostics allows access to private output",
  "model inputs type-check diagnostics allows access to protected output",
  "model inputs type-check diagnostics disallows access to private model",
  "model inputs type-check diagnostics with `--strict` allow access to private input if modifiers are explicitly ignored",
  "model inputs type-check diagnostics with `--strict` allow access to private model if modifiers are explicitly ignored, but error if not assignable",
  "model inputs type-check diagnostics with `--strict` allows access to private output",
  "model inputs type-check diagnostics with `--strict` allows access to protected output",
  "model inputs type-check diagnostics with `--strict` disallows access to private model"
]);
var NGP_REQUIRES_TYPE_CHECKER = /* @__PURE__ */ new Set([
  // Detecting writes to read-only `@let` or `@for` variables in two-way bindings (NG8005)
  // requires a TypeChecker (`isSignalReference`) to distinguish non-signal variables from
  // `WritableSignal` variables (since `[(dir)]="signalVar"` is valid).
  "ngtsc type checking @let declarations should not be able to write to let declaration in a two-way binding",
  "ngtsc type checking for loop blocks should not be able to write to loop template variables in a two-way binding",
  // TypeChecker-backed extended template diagnostics (#673, #677) in
  // `//packages/compiler-cli/src/ngtsc/typecheck/extended/test/checks/*:test_ngp` and `ngtsc_spec`.
  "ngtsc extended template checks should produce nullish coalescing not nullable warning",
  "@let declarations should produce a warning when a signal aliased via @let is not invoked in interpolation",
  "@let declarations should produce a warning when a signal aliased via @let is used in @if",
  "@let declarations should produce a warning when a signal aliased via @let is used in a bound attribute",
  "@let declarations should produce a warning when an instance property of a signal aliased via @let is accessed in interpolation",
  "NullishCoalescingNotNullableCheck does not warn for pipe arguments when parens are used",
  "NullishCoalescingNotNullableCheck should produce nullish coalescing warning",
  "NullishCoalescingNotNullableCheck should produce nullish coalescing warning for classes with inline TCBs",
  "NullishCoalescingNotNullableCheck should respect configured diagnostic category",
  'NullishCoalescingNotNullableCheck warns for pipe arguments which are likely configured incorrectly (?? operates on "format" here)',
  "OptionalChainNotNullableCheck should produce optional chain warning for classes with inline TCBs",
  "OptionalChainNotNullableCheck should produce optional chain warning for indexed access",
  "OptionalChainNotNullableCheck should produce optional chain warning for method call",
  "OptionalChainNotNullableCheck should produce optional chain warning for property access",
  "OptionalChainNotNullableCheck should respect configured diagnostic category",
  "Uninvoked function in text interpolation compiler check should produce a warning when a function is not invoked in text interpolation",
  "Uninvoked function in text interpolation compiler check should produce a warning when a property method is not invoked in text interpolation (with and without safe navigation)",
  "UninvokedFunctionInEventBindingFactoryCheck should produce a diagnostic when a function in a chain is not invoked",
  "UninvokedFunctionInEventBindingFactoryCheck should produce a diagnostic when a function in a function is not invoked",
  "UninvokedFunctionInEventBindingFactoryCheck should produce a diagnostic when a function in an event binding is not invoked",
  "UninvokedFunctionInEventBindingFactoryCheck should produce a diagnostic when a function is not",
  "UninvokedFunctionInEventBindingFactoryCheck should produce a diagnostic when a function that returns a function is not invoked",
  "UninvokedFunctionInEventBindingFactoryCheck should produce a diagnostic when a nested function in a conditional is not invoked",
  "UninvokedFunctionInEventBindingFactoryCheck should produce a diagnostic when a nested function in an event binding is not invoked",
  "UninvokedFunctionInEventBindingFactoryCheck should produce a diagnostic when a nested function that uses key read in an event binding is not invoked",
  "UninvokedFunctionInEventBindingFactoryCheck should produce a diagnostic when no function in a conditional is not invoked",
  "UninvokedTrackFunctionCheck should produce a diagnostic when a track function in a @for block is not invoked",
  "UninvokedTrackFunctionCheck should produce a warning when track is a method on an item",
  "UninvokedTrackFunctionCheck should produce a warning when track is a regular function on an object",
  "UninvokedTrackFunctionCheck should produce a warning when track is an arrow function property on component",
  "should produce a warning if the template contains a directive with the same input name, but on a different node",
  "should produce a warning when a computed signal is not invoked",
  "should produce a warning when a model signal is not invoked",
  "should produce a warning when a property named 'asReadonly' of a not invoked signal is used in an @if control flow expression (negate=false)",
  "should produce a warning when a property named 'asReadonly' of a not invoked signal is used in an @if control flow expression (negate=true)",
  "should produce a warning when a property named 'asReadonly' of a not invoked signal is used in an @switch control flow (negate=false)",
  "should produce a warning when a property named 'asReadonly' of a not invoked signal is used in an @switch control flow (negate=true)",
  "should produce a warning when a property named 'asReadonly' of a not invoked signal is used in interpolation",
  "should produce a warning when a property named 'length' of a not invoked signal is used in an @if control flow expression (negate=false)",
  "should produce a warning when a property named 'length' of a not invoked signal is used in an @if control flow expression (negate=true)",
  "should produce a warning when a property named 'length' of a not invoked signal is used in an @switch control flow (negate=false)",
  "should produce a warning when a property named 'length' of a not invoked signal is used in an @switch control flow (negate=true)",
  "should produce a warning when a property named 'length' of a not invoked signal is used in interpolation",
  "should produce a warning when a property named 'name' of a not invoked signal is used in an @if control flow expression (negate=false)",
  "should produce a warning when a property named 'name' of a not invoked signal is used in an @if control flow expression (negate=true)",
  "should produce a warning when a property named 'name' of a not invoked signal is used in an @switch control flow (negate=false)",
  "should produce a warning when a property named 'name' of a not invoked signal is used in an @switch control flow (negate=true)",
  "should produce a warning when a property named 'name' of a not invoked signal is used in interpolation",
  "should produce a warning when a property named 'prototype' of a not invoked signal is used in an @if control flow expression (negate=false)",
  "should produce a warning when a property named 'prototype' of a not invoked signal is used in an @if control flow expression (negate=true)",
  "should produce a warning when a property named 'prototype' of a not invoked signal is used in an @switch control flow (negate=false)",
  "should produce a warning when a property named 'prototype' of a not invoked signal is used in an @switch control flow (negate=true)",
  "should produce a warning when a property named 'prototype' of a not invoked signal is used in interpolation",
  "should produce a warning when a property named 'set' of a not invoked signal is used in an @if control flow expression (negate=false)",
  "should produce a warning when a property named 'set' of a not invoked signal is used in an @if control flow expression (negate=true)",
  "should produce a warning when a property named 'set' of a not invoked signal is used in an @switch control flow (negate=false)",
  "should produce a warning when a property named 'set' of a not invoked signal is used in an @switch control flow (negate=true)",
  "should produce a warning when a property named 'set' of a not invoked signal is used in interpolation",
  "should produce a warning when a property named 'update' of a not invoked signal is used in an @if control flow expression (negate=false)",
  "should produce a warning when a property named 'update' of a not invoked signal is used in an @if control flow expression (negate=true)",
  "should produce a warning when a property named 'update' of a not invoked signal is used in an @switch control flow (negate=false)",
  "should produce a warning when a property named 'update' of a not invoked signal is used in an @switch control flow (negate=true)",
  "should produce a warning when a property named 'update' of a not invoked signal is used in interpolation",
  "should produce a warning when a readonly signal is not invoked",
  "should produce a warning when a required input signal is not invoked",
  "should produce a warning when a required model signal is not invoked",
  "should produce a warning when a signal in a nested property read is not invoked",
  "should produce a warning when a signal is not invoked",
  "should produce a warning when a signal is not invoked in a conditional style binding branch",
  "should produce a warning when a signal is not invoked in a non-null asserted style binding expression",
  "should produce a warning when a signal is not invoked in a parenthesized style binding expression",
  "should produce a warning when a signal is not invoked in a prefixed-not property binding expression",
  "should produce a warning when a signal is not invoked in an svg:ng-template",
  "should produce a warning when an input signal is not invoked",
  "should produce a warning when nested signal is not invoked on interpolated binding",
  "should produce a warning when signal is invoked in attribute binding interpolation",
  "should produce a warning when signal is not invoked on interpolated binding",
  "should produce a warning when signal isn't invoked on animation binding",
  "should produce a warning when signal isn't invoked on attribute binding",
  "should produce a warning when signal isn't invoked on class binding",
  "should produce a warning when signal isn't invoked on dom property binding",
  "should produce a warning when signal isn't invoked on style binding",
  "should produce optional chain warning for chained property access"
]);
var NGP_POTENTIAL_BREAKING_CHANGES = /* @__PURE__ */ new Set([
  // Aligning the debug info shape can cause a different overload to
  // match for signal inputs which in turn causes breakages.
  "Debug Info Typescript tranformation afterRenderEffect should insert debug info into afterRenderEffect function if imported from angular core",
  "Debug Info Typescript tranformation afterRenderEffect should insert debug info into afterRenderEffect function in a property assignment",
  "Debug Info Typescript tranformation afterRenderEffect should insert debug info into afterRenderEffect function with a phase spec",
  "Debug Info Typescript tranformation afterRenderEffect should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation afterRenderEffect should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation computed Property Assignment Case should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation computed Property Assignment Case should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation computed Property Declaration Case should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation computed Property Declaration Case should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation computed Variable Declaration Case should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation computed Variable Declaration Case should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation computed should insert debug info into computed function if imported from angular core",
  "Debug Info Typescript tranformation contentChild .required should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation contentChild should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation contentChild should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation contentChildren should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation contentChildren should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation effect should insert debug info into effect function if imported from angular core",
  "Debug Info Typescript tranformation effect should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation effect should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation httpResource Property Assignment Case should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation httpResource Property Assignment Case should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation httpResource Property Declaration Case should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation httpResource Property Declaration Case should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation httpResource Variable Declaration Case should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation httpResource Variable Declaration Case should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation input .required should insert debug info into .required",
  "Debug Info Typescript tranformation input .required should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation input should insert debug info into input function if imported from angular core",
  "Debug Info Typescript tranformation linkedSignal Property Assignment Case should insert debug info into linkedSignal with a computation object",
  "Debug Info Typescript tranformation linkedSignal Property Assignment Case should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation linkedSignal Property Assignment Case should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation linkedSignal Property Declaration Case should insert debug info into linkedSignal with a computation object",
  "Debug Info Typescript tranformation linkedSignal Property Declaration Case should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation linkedSignal Property Declaration Case should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation linkedSignal Variable Declaration Case should insert debug info into linkedSignal with a computation object",
  "Debug Info Typescript tranformation linkedSignal Variable Declaration Case should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation linkedSignal Variable Declaration Case should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation linkedSignal should insert debug info into linkedSignal function if imported from angular core",
  "Debug Info Typescript tranformation model .required should insert debug info into .required",
  "Debug Info Typescript tranformation model .required should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation model should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation signal Property Assignment Case should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation signal Property Assignment Case should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation signal Property Declaration Case should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation signal Property Declaration Case should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation signal Variable Declaration Case should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation signal Variable Declaration Case should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation viewChild .required should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation viewChild should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation viewChild should tree-shake away debug info if in prod mode",
  "Debug Info Typescript tranformation viewChildren should not tree-shake away debug info if in dev mode",
  "Debug Info Typescript tranformation viewChildren should tree-shake away debug info if in prod mode",
  // Design difference, not a bug: when an imported transform function's parameter type references
  // another symbol imported in the external declaration file (rather than a self-contained type),
  // ngp emits `Parameters<typeof i1.transformFn>[0]` instead of re-importing the external symbol.
  "ngtsc behavioral tests input transforms should compile an input with an external transform function",
  "ngtsc behavioral tests input transforms should compile an input with using an ambient type in the transform function",
  // Design difference, not a bug: on an `@Inject` parameter whose type is imported from another
  // file, ngp emits `type: undefined` in `ɵsetClassMetadata` in both compilation modes. Single-file
  // analysis cannot tell an imported class from an imported interface (ngtsc can, via the type
  // checker), and withholding the type is safe because DI uses the `@Inject` token. The
  // cross-file pass deliberately does not upgrade these so that both modes keep the same runtime
  // imports; see the `@Inject` rule in `ng-analyze/src/analyzer/mod.rs`. These specs assert the
  // ngtsc shape (`type: ImportedClass` and a surviving import) for such a parameter.
  "ngtsc behavioral tests should use imported types in setClassMetadata if they can be represented as values",
  "ngtsc behavioral tests should use imported types in setClassMetadata if they can be represented as values and imported as `* as foo`",
  "ngtsc behavioral tests should preserve the types of non-const enums in setClassMetadata",
  // Flat module index generation (`flatModuleOutFile` and `flatModuleId`) is a legacy View Engine
  // feature that won't be ported to ngp for the time being.
  "ngtsc behavioral tests flat module indices should determine the flat module entry-point within multiple root files",
  "ngtsc behavioral tests flat module indices should generate a basic flat module index",
  "ngtsc behavioral tests flat module indices should generate a flat module with an id",
  "ngtsc behavioral tests flat module indices should generate a proper flat module index file when nested",
  "ngtsc behavioral tests flat module indices should report an error when a deeply visible directive is not exported",
  "ngtsc behavioral tests flat module indices should report an error when a deeply visible module is not exported",
  "ngtsc behavioral tests flat module indices should report an error when a flat module index is requested but no entrypoint can be determined",
  "ngtsc behavioral tests flat module indices should report an error when a visible directive is not exported",
  "ngtsc behavioral tests flat module indices should report an error when a visible host directive is not exported",
  // These tests depend on compiler flags that aren't relevant for ngp
  // (`_useHostForImportAndAliasGeneration` and `generateDeepReexports`).
  "ngtsc behavioral tests NgModule export aliasing should escape unusual characters in aliased filenames",
  "ngtsc behavioral tests NgModule export aliasing should use an alias to import a directive from a deep dependency when _useHostForImportAndAliasGeneration is set",
  "ngtsc behavioral tests NgModule export aliasing should write alias ES2015 exports for NgModule exported directives when _useHostForImportAndAliasGeneration is set",
  "ngtsc behavioral tests aliasing re-exports should error when two directives with the same declared name are exported from the same NgModule",
  "ngtsc behavioral tests aliasing re-exports should not error when two directives with the same declared name are exported from the same NgModule, but one is exported from the file directly",
  "ngtsc behavioral tests aliasing re-exports should re-export a directive from a different file under a private symbol name",
  "ngtsc behavioral tests aliasing re-exports should re-export a directive from an exported NgModule under a private symbol name",
  // For the time being we aren't implementing selectorless in ngp. Also some of the analysis depends on
  // the parsed template which hasn't been ported to Rust at the time of writing.
  "selectorless should be able to alias imports of selectorless dependencies",
  "selectorless should be able to use default imports as selectorless dependencies",
  "selectorless should check input bindings coming from host directives on component nodes",
  "selectorless should check input bindings coming from host directives on directive nodes",
  "selectorless should check output bindings coming from host directives on component nodes",
  "selectorless should check output bindings coming from host directives on directive nodes",
  "selectorless should check required inputs of selectorless components",
  "selectorless should check required inputs of selectorless directives",
  "selectorless should check that selectorless component reference is a component class",
  "selectorless should check that selectorless component references are standalone",
  "selectorless should check that selectorless directive reference is a directive class",
  "selectorless should check that selectorless directive references are standalone",
  "selectorless should check that the component using selectorless syntax is standalone",
  "selectorless should check the input bindings of selectorless components",
  "selectorless should check the input bindings of selectorless directives",
  "selectorless should check the input bindings of selectorless directives imported from an external library",
  "selectorless should check the output bindings of selectorless components",
  "selectorless should check the output bindings of selectorless directives",
  "selectorless should defer selectorless symbols",
  "selectorless should emit references to selectorless dependencies defined in the same function",
  "selectorless should emit references to selectorless symbols",
  "selectorless should generate metadata for a pipe without a name",
  "selectorless should import capitalized pipes from external modules implicitly",
  "selectorless should import capitalized pipes implicitly",
  "selectorless should not allow a `deferredImports` object in a selectorless component",
  "selectorless should not allow an `imports` array in a selectorless component",
  "selectorless should pick the dependency closest to the class",
  "selectorless should report unclaimed inputs on directive nodes as errors",
  "selectorless should report unclaimed outputs on directive nodes as errors",
  "selectorless should resolve local reference to selectorless component",
  "selectorless should resolve local reference to selectorless directive",
  "selectorless should treat unclaimed inputs as DOM property bindings on component nodes",
  "selectorless should treat unclaimed outputs as DOM events on component nodes",
  // Tests TypeScript `structureIsReused` across in-memory ngtsc incremental compilations.
  "ngtsc type checking stability should allow for complete program reuse during incremental compilations"
]);
var NGP_KNOWN_NGTSC_FAILURES = /* @__PURE__ */ new Set([
  "import generation should report an error when a library entry-point does not export the symbol",
  "import generation should report an error when using a directive outside of rootDirs",
  "local compilation @defer should handle `@Component.imports` field",
  "local compilation @defer should handle defer blocks that rely on deps from `deferredImports` and `imports`",
  "local compilation @defer should produce a diagnostic in case imports with symbols used in `deferredImports` can not be removed",
  "local compilation @defer should support importing multiple deferrable deps from a single file and use them within `@Component.deferrableImports` field",
  "local compilation LOCAL_COMPILATION_UNRESOLVED_CONST errors should show correct error message when using an external symbol for @Directive.exportAs argument",
  "local compilation LOCAL_COMPILATION_UNRESOLVED_CONST errors should show correct error message when using an external symbol for component @HostBinding's argument",
  "local compilation LOCAL_COMPILATION_UNRESOLVED_CONST errors should show correct error message when using an external symbol for component @HostListener's event name argument",
  "local compilation LOCAL_COMPILATION_UNRESOLVED_CONST errors should show correct error message when using an external symbol for component selector",
  "local compilation LOCAL_COMPILATION_UNRESOLVED_CONST errors should show correct error message when using an external symbol for component styles",
  "local compilation LOCAL_COMPILATION_UNRESOLVED_CONST errors should show correct error message when using an external symbol for component styles array",
  "local compilation LOCAL_COMPILATION_UNRESOLVED_CONST errors should show correct error message when using an external symbol for component template",
  "local compilation LOCAL_COMPILATION_UNRESOLVED_CONST errors should show correct error message when using an external symbol for directive @HostBinding's argument",
  "local compilation LOCAL_COMPILATION_UNRESOLVED_CONST errors should show correct error message when using an external symbol for directive @HostListener's event name argument",
  "local compilation constructor injection should guard unresolvable constructor parameter types in class metadata",
  "local compilation constructor injection should include injector types with all possible import/injection styles into component factory",
  "local compilation constructor injection should include injector types with all possible import/injection styles into directive factory",
  "local compilation constructor injection should include injector types with all possible import/injection styles into injectable factory",
  "local compilation constructor injection should include injector types with all possible import/injection styles into ng module factory",
  "local compilation constructor injection should include injector types with all possible import/injection styles into pipe factory",
  "local compilation constructor injection should include injector types with all possible import/injection styles into standalone component factory",
  "local compilation constructor injection should include injector types with all possible import/injection styles into standalone directive factory",
  "local compilation constructor injection should include injector types with all possible import/injection styles into standalone pipe factory",
  "local compilation custom decorator should produce diagnostic for each custom decorator",
  "local compilation extra imports generation should include NgModule external imports as global imports - case of multiple nested imports including named and namespace imports",
  "local compilation extra imports generation should include NgModule namespace external import as global import",
  "local compilation extra imports generation should include extra import for the local component dependencies (component, directive and pipe)",
  "local compilation extra imports generation should include global imports only in the eligible files",
  "local compilation extra imports generation should include nested NgModule external import as global import - case of named import",
  "local compilation extra imports generation should include nested NgModule external import as global import - case of namespace import",
  "local compilation extra imports generation should only include NgModule external import as global import",
  "local compilation host directives should generate component hostDirectives definition without input and output",
  "local compilation host directives should generate hostDirectives definition with forward references of local directives",
  "local compilation host directives should produce fatal diagnostics for host directives with forward references of externally imported directive",
  "local compilation input transform should generate input info for inline transform function",
  "local compilation input transform should not check inline function param type",
  "ngtsc @defer block @Component.deferredImports block-specific deferredImports mapping should report error when defer block has no name parameter but deferredImports is an object",
  "ngtsc @defer block @Component.deferredImports block-specific deferredImports mapping should report error when name parameter references missing block in deferredImports",
  "ngtsc @defer block block-specific deferredImports type checking should report an error when a pipe declared in a keyed block is used in an unnamed defer block",
  "ngtsc behavioral tests cycle detection should detect a simple cycle and fatally error if doing partial-compilation",
  "ngtsc compilation of standalone types component-side should compile a standalone component in a cycle with its module",
  "ngtsc incremental compilation (semantic changes) NgModule declarations should not recompile components when a non-matching directive is added in scope",
  "ngtsc incremental compilation (semantic changes) NgModule declarations should recompile components when a matching directive is added in the direct scope",
  "ngtsc incremental compilation (semantic changes) NgModule declarations should recompile components when a matching directive is added in the transitive scope",
  "ngtsc incremental compilation (semantic changes) NgModule declarations should recompile components when a matching directive is removed from the direct scope",
  "ngtsc incremental compilation (semantic changes) NgModule declarations should recompile components when a matching directive is removed from the transitive scope",
  "ngtsc incremental compilation (semantic changes) changes to public api should not recompile components that do not use a changed directive",
  "ngtsc incremental compilation (semantic changes) changes to public api should not recompile dependent components when public api is unchanged",
  "ngtsc incremental compilation (semantic changes) changes to public api should recompile dependent components when an input becomes required",
  "ngtsc incremental compilation (semantic changes) external declarations should not recompile components that use external declarations that are not changed",
  "ngtsc incremental compilation (semantic changes) remote scoping should not recompile an NgModule nor component when remote scoping is unaffected",
  "ngtsc incremental compilation (semantic changes) remote scoping should recompile an NgModule when a remotely scoped component's scope is changed",
  "ngtsc incremental compilation (semantic changes) remote scoping should recompile an NgModule when its set of remotely scoped components changes",
  "ngtsc incremental compilation (semantic changes) should correctly emit components when public API changes during a broken program",
  "ngtsc incremental compilation (semantic changes) symbol identity should not recompile components that use a local directive",
  "ngtsc incremental compilation (semantic changes) symbol identity should not recompile components when a component is changed into a directive",
  "ngtsc incremental compilation (semantic changes) symbol identity should not recompile components when a directive is changed into a component",
  "ngtsc incremental compilation (template typecheck) program re-use should completely re-use structure when an inline constructor generic directive starts using input signals",
  "ngtsc incremental compilation (template typecheck) program re-use should completely re-use structure when the first signal input is introduced",
  "ngtsc incremental compilation should allow incremental compilation with redirected source files",
  "ngtsc incremental compilation should rebuild components that have changed",
  "ngtsc incremental compilation should rebuild components where their NgModule declared dependencies have changed",
  "ngtsc incremental compilation should rebuild components where their NgModule has changed",
  "ngtsc incremental compilation should rebuild components whose imported dependencies have changed",
  "ngtsc incremental compilation should rebuild components whose partial-evaluation dependencies have changed",
  "ngtsc incremental compilation should rebuild components whose templates have changed",
  "ngtsc incremental compilation should rebuild full NgModule scope when a dependency of a declaration has changed",
  "ngtsc incremental compilation should rebuild only a Component (but with the correct CompilationScope) if its template has changed",
  "ngtsc incremental compilation should skip unchanged services",
  "ngtsc incremental compilation template type-checking inline operations should not re-emit files that need inline type constructors",
  "ngtsc incremental compilation template type-checking should retain default imports that have been converted into a value expression",
  "ngtsc incremental compilation with errors chained errors should remember a change to a TS file across broken builds",
  "ngtsc incremental compilation with errors chained errors should remember a change to a template file across broken builds",
  "ngtsc incremental compilation with errors should emit all files after an error on the initial build",
  "ngtsc incremental compilation with errors should emit dependent files even in the face of an error",
  "ngtsc incremental compilation with errors should emit files introduced at the same time as an unrelated error",
  "ngtsc incremental compilation with errors should handle an error in an unrelated file",
  "ngtsc incremental compilation with errors should recover from an error even across multiple NgModules",
  "ngtsc incremental compilation with errors should recover from an error in a component that is part of a module",
  "ngtsc incremental compilation with errors should recover from an error in a component's metadata",
  "ngtsc type checking @let declarations should produce a single diagnostic if a @let declaration invokes itself",
  "ngtsc type checking @let declarations should produce a single diagnostic if a @let declaration refers to properties on itself",
  "ngtsc type checking @let declarations should report @let declaration used in the expression of a @if block before it is defined",
  "ngtsc type checking for loop blocks should not allow usages of aliased `if` block variables inside the tracking expression",
  "ngtsc type checking for loop blocks should not allow usages of local references outside of the template in the tracking expression",
  "ngtsc type checking for loop blocks should not allow usages of local references within the same template inside the tracking expression",
  "ngtsc type checking for loop blocks should not allow usages of parent loop variables inside the tracking expression",
  "ngtsc type checking for loop blocks should not allow usages of parent template variables inside the tracking expression"
]);

// packages/compiler-cli/src/ngtsc/file_system/testing/src/test_helper.js
import ts from "typescript";
var FS_NATIVE = "Native";
var FS_OS_X = "OS/X";
var FS_UNIX = "Unix";
var FS_WINDOWS = "Windows";
var FS_ALL = [FS_OS_X, FS_WINDOWS, FS_UNIX, FS_NATIVE];
function runInEachFileSystemFn(callback) {
  FS_ALL.forEach((os2) => runInFileSystem(os2, callback, false));
}
var counter = 0;
function runInFileSystem(os2, callback, error) {
  describe(`<<FileSystem: ${os2}>>/${counter++}`, () => {
    beforeEach(() => initMockFileSystem(os2));
    afterEach(() => setFileSystem(new InvalidFileSystem()));
    if (isNgpSkipEnabled()) {
      const origDescribe = globalThis.describe;
      const origIt = globalThis.it;
      const suiteStack = [];
      globalThis.describe = (description, specDefinitions) => {
        return origDescribe(description, () => {
          suiteStack.push(description);
          try {
            specDefinitions();
          } finally {
            suiteStack.pop();
          }
        });
      };
      globalThis.it = (expectation, assertion, timeout) => {
        const fullName = [...suiteStack, expectation].join(" ").replace(/\s+/g, " ").trim();
        if (shouldSkipInNgp(fullName)) {
          return globalThis.xit(expectation, assertion, timeout);
        }
        return origIt(expectation, assertion, timeout);
      };
      try {
        callback(os2);
      } finally {
        globalThis.describe = origDescribe;
        globalThis.it = origIt;
      }
    } else {
      callback(os2);
    }
    if (error) {
      afterAll(() => {
        throw new Error(`runInFileSystem limited to ${os2}, cannot pass`);
      });
    }
  });
}
var runInEachFileSystem = runInEachFileSystemFn;
runInEachFileSystem.native = (callback) => runInFileSystem(FS_NATIVE, callback, true);
runInEachFileSystem.osX = (callback) => runInFileSystem(FS_OS_X, callback, true);
runInEachFileSystem.unix = (callback) => runInFileSystem(FS_UNIX, callback, true);
runInEachFileSystem.windows = (callback) => runInFileSystem(FS_WINDOWS, callback, true);
var mockFileSystemLocked = false;
function initMockFileSystem(os2, cwd) {
  if (mockFileSystemLocked) {
    return getFileSystem();
  }
  const fs = createMockFileSystem(os2, cwd);
  setFileSystem(fs);
  monkeyPatchTypeScript(fs);
  return fs;
}
function createMockFileSystem(os2, cwd) {
  switch (os2) {
    case "OS/X":
      return new MockFileSystemPosix(
        /* isCaseSensitive */
        false,
        cwd
      );
    case "Unix":
      return new MockFileSystemPosix(
        /* isCaseSensitive */
        true,
        cwd
      );
    case "Windows":
      return new MockFileSystemWindows(
        /* isCaseSensitive*/
        false,
        cwd
      );
    case "Native":
      return new MockFileSystemNative(cwd);
    default:
      throw new Error("FileSystem not supported");
  }
}
function monkeyPatchTypeScript(fs) {
  ts.sys.fileExists = (path) => {
    const absPath = fs.resolve(path);
    return fs.exists(absPath) && fs.stat(absPath).isFile();
  };
  ts.sys.getCurrentDirectory = () => fs.pwd();
  ts.sys.getDirectories = getDirectories;
  ts.sys.readFile = fs.readFile.bind(fs);
  ts.sys.resolvePath = fs.resolve.bind(fs);
  ts.sys.writeFile = fs.writeFile.bind(fs);
  ts.sys.directoryExists = directoryExists;
  ts.sys.readDirectory = readDirectory;
  function getDirectories(path) {
    return fs.readdir(absoluteFrom(path)).filter((p3) => fs.stat(fs.resolve(path, p3)).isDirectory());
  }
  function getFileSystemEntries(path) {
    const files = [];
    const directories = [];
    const absPath = fs.resolve(path);
    const entries = fs.readdir(absPath);
    for (const entry of entries) {
      if (entry == "." || entry === "..") {
        continue;
      }
      const absPath2 = fs.resolve(path, entry);
      const stat = fs.stat(absPath2);
      if (stat.isDirectory()) {
        directories.push(absPath2);
      } else if (stat.isFile()) {
        files.push(absPath2);
      }
    }
    return { files, directories };
  }
  function realPath(path) {
    return fs.realpath(fs.resolve(path));
  }
  function directoryExists(path) {
    const absPath = fs.resolve(path);
    return fs.exists(absPath) && fs.stat(absPath).isDirectory();
  }
  const tsMatchFiles = ts.matchFiles;
  function readDirectory(path, extensions, excludes, includes, depth) {
    return tsMatchFiles(path, extensions, excludes, includes, fs.isCaseSensitive(), fs.pwd(), depth, getFileSystemEntries, realPath, directoryExists);
  }
}
export {
  ImportedSymbolsTracker,
  MockFileSystem,
  TypeScriptReflectionHost,
  getInitializerApiJitTransform,
  initMockFileSystem
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
//# sourceMappingURL=testing.js.map
