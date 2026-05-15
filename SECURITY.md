# Security policy

## Supported versions

Only the latest minor release of **modelfile-syntax** receives security updates. Older versions may be patched at the maintainer's discretion.

| Version | Supported |
| ------- | --------- |
| `0.1.x` | yes       |
| `< 0.1` | no        |

## Reporting a vulnerability

This extension runs entirely in the VSCode extension host with **no network access, no `child_process` spawns, and no filesystem writes outside of editor APIs**. The attack surface is narrow but not zero — for example, a maliciously crafted Modelfile could in theory trigger pathological regex behavior in the parser or grammar.

To report a vulnerability:

1. **Do not** file a public GitHub issue.
2. Email the maintainer via the contact form on [ahnafnafee.dev](https://www.ahnafnafee.dev), or use [GitHub's private vulnerability reporting](https://github.com/ahnafnafee/modelfile-syntax/security/advisories/new).
3. Include: extension version, editor (VSCode/VSCodium/Cursor/Windsurf/vscode.dev), reproduction steps, and the impact you observed.

You can expect an acknowledgement within 7 days. Confirmed vulnerabilities will be patched in the next minor release, with credit to the reporter (unless anonymity is requested).

## Out of scope

- General code-quality issues — file a normal issue or PR.
- Vulnerabilities in third-party dependencies — please report upstream first; we will track via Dependabot.
- Vulnerabilities in the Ollama runtime itself — report to [ollama/ollama](https://github.com/ollama/ollama/security).
