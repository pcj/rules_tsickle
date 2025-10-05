# rules_tsickle

## What?

`rules_tsickle` provides a `closure_ts_compile` rule that transforms `.ts` files
into closure-annotated `.js` files.  It contains a vendored copy of
<https://github.com/angular/tsickle> (which was archived in May 2025).

## Why?

The primary reason `rules_tsickle` was created was to perform `.ts` to `.js`
translation of <https://github.com/google/safevalues> for
<https://github.com/google/closure-templates/tree/master/javascript>.  Several
of the `soyutils` files in that repo have closure dependencies like:

```js
goog.require('google3.third_party.javascript.safevalues.index');
```

No open-source copy of the translated `.js` files could be located, so
`rules_tsickle` was created to perform that translation.

## How?

To use `rules_tsickle` in your own bazel workspace (lookup most recent version):

```py
bazel_dep("rules_tsickle", version = "0.0.0")
```

Then, in a package containing `.ts` and/or `.d.ts` files:

```py
load("//rules:defs.bzl", "closure_ts_compile")

closure_ts_compile(
    name = "index",
    srcs = ["index.ts"],
)
```

`bazel build :index` will:

- download npm deps and prepare the `js_binary` tsickle runner
  (`//tools/tsicklecompiler`).
- run the tool, which roughly works as follows:
  - prepare an internal/minimal `tsconfig.json` configuration.
  - runs `tsc` over the inputs to generate a `ts.Program`
  - runs tsickle over the `ts.Program` to AST-rewrite/transform it.
  - emits the transformed `.js` files.
- output files:
  - each `{basename}.ts` will produce an equivalent `{basename}.js` file
  - if any `.d.ts` files are present, a single `{name}-externs.js` file will be
    produced.

`closure_ts_compile` can take `deps` on other `closure_ts_compile` rules.  The
source `.ts` files will be made available to `tsc`.  Only direct `.ts` files in
the primary rule will emitted.

### Versioning

The `rules_tsickle` initial version is `1.0.0` not because of a long history of
development, but because it is anticipated this repo will not see a large amount
of future development.
