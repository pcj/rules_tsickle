load("@bazel_skylib//lib:paths.bzl", "paths")

def _output_for_input(ctx, src):
    filename = paths.replace_extension(src.basename, ".js")
    return ctx.actions.declare_file(filename, sibling = src)

def _tsickle_action(ctx):
    args = ctx.actions.args()
    args.add_all([src.short_path for src in ctx.files.srcs])

    inputs = ctx.files.srcs
    outputs = [_output_for_input(ctx, f) for f in ctx.files.srcs]

    ctx.actions.run(
        mnemonic = "TsickleCompile",
        executable = ctx.executable._compiler,
        arguments = [args],
        inputs = inputs,
        outputs = outputs,
        env = {
            "BAZEL_BINDIR": ctx.bin_dir.path,
            "BAZEL_WORKSPACE": ctx.label.workspace_name,
            "BAZEL_PACKAGE": ctx.label.package,
        },
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
