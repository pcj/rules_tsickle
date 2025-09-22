load("@bazel_skylib//lib:paths.bzl", "paths")

def _output_for_input(ctx, src):
    filename = paths.replace_extension(src.basename, ".js")
    return ctx.actions.declare_file(filename, sibling = src)

def _tsickle_action(ctx, args, inputs, outputs):
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

def _tsickle_shell_action(ctx, args, inputs, outputs):
    ctx.actions.run_shell(
        mnemonic = "TsickleCompile",
        tools = [ctx.executable._compiler],
        command = """
{var}
{compiler} {params_file}
""".format(
            compiler = ctx.executable._compiler.short_path,
            params_file = "@" + ctx.label.name,
            var = str(ctx.var),
        ),
        inputs = inputs,
        outputs = outputs,
        env = {
            "BAZEL_BINDIR": ctx.bin_dir.path,
        },
    )

def _closure_ts_library_impl(ctx):
    inputs = [] + ctx.files.srcs
    outputs = [] + [_output_for_input(ctx, f) for f in inputs]

    args = ctx.actions.args()
    args.add_all([src.short_path for src in ctx.files.srcs])
    # args.use_param_file("@%s", use_always = False)

    if True:
        _tsickle_action(ctx, args, inputs, outputs)
    else:
        _tsickle_shell_action(ctx, args, inputs, outputs)

    files = outputs
    return [DefaultInfo(
        files = depset(files),
    )]

closure_ts_library = rule(
    implementation = _closure_ts_library_impl,
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
