"""closure_ts_compile runs tsickle over input srcs"""

load("@bazel_skylib//lib:paths.bzl", "paths")

def _output_for_ts_input(ctx, src):
    filename = paths.replace_extension(src.basename, ".js")
    return ctx.actions.declare_file(filename, sibling = src)

def _output_for_externs(ctx):
    return ctx.actions.declare_file(ctx.label.name + ".externs.js")

def _tsickle_action(ctx):
    args = ctx.actions.args()
    args.add_all([src.short_path for src in ctx.files.srcs])

    env = {
        "BAZEL_BINDIR": ctx.bin_dir.path,
        "BAZEL_WORKSPACE": ctx.label.workspace_name,
        "BAZEL_PACKAGE": ctx.label.package,
    }

    ts_inputs = []
    d_ts_inputs = []
    for src in ctx.files.srcs:
        if src.basename.endswith(".d.ts"):
            d_ts_inputs.append(src)
        else:
            ts_inputs.append(src)

    outputs = [_output_for_ts_input(ctx, f) for f in ts_inputs]
    if len(d_ts_inputs) > 0:
        externs_output = _output_for_externs(ctx)
        outputs.append(externs_output)
        env["EXTERNS_PATH"] = externs_output.short_path

    ctx.actions.run(
        mnemonic = "TsickleCompile",
        executable = ctx.executable._compiler,
        arguments = [args],
        inputs = ts_inputs + d_ts_inputs,
        outputs = outputs,
        env = env,
    )

    return outputs

def _closure_ts_compile_impl(ctx):
    outputs = _tsickle_action(ctx)

    return [DefaultInfo(
        files = depset(outputs),
    )]

closure_ts_compile = rule(
    implementation = _closure_ts_compile_impl,
    attrs = {
        "srcs": attr.label_list(
            doc = "list of .ts files",
            allow_files = True,
            mandatory = True,
        ),
        "_compiler": attr.label(
            default = "//tools/tsicklecompiler",
            doc = "the tsickle driver tool",
            executable = True,
            cfg = "exec",
        ),
    },
)
