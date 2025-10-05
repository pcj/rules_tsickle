# rules_tsickle

## What?

`rules_tsickle` provides the `closure_ts_compile` rule that transforms `.ts`
files into closure-annotated `.js` files.  It contains a vendored copy of
<https://github.com/angular/tsickle> that has been archived.

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

A `bazel build :index` will:

- build the `js_binary` tsickle runner (`//tools/tsicklecompiler`).
- run the tool, which roughly works as follows:
  - prepare in internal/minimal `tsconfig.json` configuration.
  - runs `tsc` over the inputs to generate a `ts.Program`
  - runs tsickle over the `ts.Program` to AST-rewrite it
  - emits the final generated `.js` files.
