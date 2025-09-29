"""closure_ts_compile runs tsickle over input srcs"""

load("@bazel_skylib//lib:paths.bzl", "paths")

ClosureTsCompileInfo = provider(doc = "info about a closure ts compile rule", fields = {
    "sources": "DepSet<File>: direct + transitive sources",
})

def _output_for_ts_input(ctx, src):
    filename = paths.replace_extension(src.basename, ".js")
    return ctx.actions.declare_file(filename, sibling = src)

def _output_for_externs(ctx):
    return ctx.actions.declare_file(ctx.label.name + ".externs.js")

def _tsickle_action(ctx):
    direct = ctx.files.srcs
    transitive = [dep[ClosureTsCompileInfo].sources for dep in ctx.attr.deps]

    args = ctx.actions.args()
    args.add_all([src.short_path for src in direct])

    env = {
        "BAZEL_BINDIR": ctx.bin_dir.path,
        "BAZEL_WORKSPACE": ctx.label.workspace_name,
        "BAZEL_PACKAGE": ctx.label.package,
    }

    direct_ts = []
    direct_dts = []
    for src in direct:
        if src.basename.endswith(".d.ts"):
            direct_dts.append(src)
        else:
            direct_ts.append(src)

    outputs = [_output_for_ts_input(ctx, f) for f in direct_ts]
    if len(direct_dts) > 0:
        externs_output = _output_for_externs(ctx)
        outputs.append(externs_output)
        env["EXTERNS_PATH"] = externs_output.short_path

    inputs = depset(direct = direct, transitive = transitive)

    ctx.actions.run(
        mnemonic = "TsickleCompile",
        executable = ctx.executable._compiler,
        arguments = [args],
        inputs = inputs,
        outputs = outputs,
        env = env,
    )

    return struct(
        inputs = inputs,
        outputs = outputs,
    )

def _closure_ts_compile_impl(ctx):
    result = _tsickle_action(ctx)

    return [
        DefaultInfo(
            files = depset(result.outputs),
        ),
        ClosureTsCompileInfo(
            sources = result.inputs,
        ),
    ]

closure_ts_compile = rule(
    implementation = _closure_ts_compile_impl,
    attrs = {
        "srcs": attr.label_list(
            doc = "list of .ts files",
            allow_files = True,
            mandatory = True,
        ),
        "deps": attr.label_list(
            doc = "list of ClosureTsCompileInfo dependencies",
            providers = [ClosureTsCompileInfo],
        ),
        "_compiler": attr.label(
            default = "//tools/tsicklecompiler",
            doc = "the tsickle driver tool",
            executable = True,
            cfg = "exec",
        ),
    },
    provides = [ClosureTsCompileInfo],
)
