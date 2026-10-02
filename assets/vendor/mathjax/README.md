# Vendored MathJax compatibility asset

This directory contains the locally vendored browser component used by the
current offline-validated build.

- component: `tex-svg-full.js`
- version: MathJax 3.2.1 (`mathjax-full` package)
- purpose: TeX input + SVG output with the extensions needed by the technical
  documentation, including custom macros and colour support
- license: Apache-2.0; see `LICENSE`

The MPX architecture targets MathJax 4 for the production dependency refresh.
The page/content contract intentionally avoids version-specific APIs so this
vendored compatibility component can be replaced by the MathJax 4 equivalent
without changing the scientific Markdown sources.
