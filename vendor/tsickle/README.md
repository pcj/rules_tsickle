# Tsickle - TypeScript to Closure Translator

This is a vendored copy of <[https://](https://github.com/angular/tsickle/commit/2129d363a0562b7ca1acdf55945c22b7d16539a3)> with the following changes:

- `BUILD.bazel` file added to expose the `tsconfig.json` file.
- `src/BUILD.bazel` file added to expose the srcs as a `ts_project`.
- Change to `src/googmodule.ts`: the function `tryFindAmbientModuleWithoutAugmentations` seems to be an angular-google-internal function.  It has been stubbed out to always return `undefined`.
