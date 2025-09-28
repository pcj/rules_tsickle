load("@bazel_skylib//lib:paths.bzl", "paths")

def _output_for_input(ctx, src):
    filename = paths.replace_extension(src.basename, ".js")
    return ctx.actions.declare_file(filename, sibling = src)

def _tsickle_config_action(ctx):
    # Should conform with TsickleHostConfig interface
    config = struct(
        rootModulePath = "",
        es5Mode = True,
        ignoreWarningsPath = [],
        typeBlackListPaths = [],
        unknownTypesPaths = [],
    )

    ctx.actions.write(
        output = ctx.outputs.tsickle_config,
        content = json.encode_indent(config, prefix = "", indent = "  "),
    )

def _tsickle_action(ctx):
    args = ctx.actions.args()
    args.add_all([src.short_path for src in ctx.files.srcs])

    inputs = [ctx.file.tsconfig, ctx.outputs.tsickle_config] + ctx.files.srcs
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
            "TSICKLE_CONFIG_FILE": ctx.outputs.tsickle_config.short_path,
            "TS_CONFIG_FILE": ctx.file.tsconfig.short_path,
        },
    )

    return outputs

def _closure_ts_library_impl(ctx):
    _tsickle_config_action(ctx)

    output_files = [ctx.outputs.tsickle_config]
    output_files.extend(_tsickle_action(ctx))

    return [DefaultInfo(
        files = depset(output_files),
    )]

closure_ts_library = rule(
    implementation = _closure_ts_library_impl,
    attrs = {
        "srcs": attr.label_list(
            doc = "list of .ts files",
            allow_files = True,
            mandatory = True,
        ),
        "tsconfig": attr.label(
            doc = "the tsconfig.json file",
            allow_single_file = True,
            mandatory = True,
        ),
        "_compiler": attr.label(
            default = "//tools/tsicklecompiler",
            doc = "the tsickle driver tool",
            executable = True,
            cfg = "exec",
        ),
    },
    outputs = {
        "tsickle_config": "%{name}.tsickle.json",
    },
)
