def _closure_ts_library_impl(ctx):
    files = [] + ctx.files.srcs
    return DefaultInfo(
        files = depset(files),
    )

closure_ts_library = rule(
    implementation = _closure_ts_library_impl,
    attrs = {
        "srcs": attr.label_list(
            doc = "list of .ts files",
            allow_files = True,
            mandatory = True,
        ),
    },
)
