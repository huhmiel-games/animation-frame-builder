require("esbuild").build({
    entryPoints: ["./src/script.ts"],
    bundle: true,
    sourcemap: true,
    target: 'es6',
    format: 'esm',
    minify: true,
    loader: { ".ts": "ts" },
    outfile: "./build/script.js"
})
    .then(() => console.log('\x1b[32m%s\x1b[0m', "⚡ Build Done"))
    .catch(() => process.exit(1));