---
description: LLM coding agent context gathering
---

**THIS IS READ-ONLY OPERATION, DON'T MAKE ANY CHANGE**


## User Input

```text
$ARGUMENTS
```

# Repository Context Scanner - Instructions for LLM Coding Agent

## Overview
This file provides step-by-step instructions for an LLM coding agent to scan and understand the current repository's context, structure, and purpose.

---

## Step 1: Find and Read Agent-Specific Documentation

First, search for and read any of the following files (in order of priority):

1. **agents.md** - General agent instructions
2. **Claude.md** - Claude-specific instructions  
3. **gemini.md** - Gemini-specific instructions

These files typically contain:
- Project-specific guidelines
- Coding conventions
- Agent behavior rules
- Repository-specific instructions

**Action:** Read the contents of whichever file(s) exist in the root directory.

---

## Step 2: Scan README Documentation

Next, locate and read the **README.md** file in the repository root. This file should contain:

- Project description and purpose
- Installation instructions
- Usage examples
- Contributing guidelines
- Key features overview

**Action:** Parse the README.md to understand the project's high-level goals and functionality.

---

## Step 3: Analyze Code Structure and Entrypoint

Identify the project's code structure by:

1. **Determine the project type:**
   - JavaScript/TypeScript (Node.js)
   - Python
   - Go
   - Rust
   - Other

2. **Find the entrypoint:**
   - `package.json` → look for `main`, `bin`, or `scripts`
   - `pyproject.toml` or `setup.py` → look for `main` or entry points
   - `Cargo.toml` → look for `[[bin]]` sections
   - `Makefile` → look for default targets
   - Look for `index.js`, `main.py`, `main.go`, etc.

3. **Scan the entrypoint file** to understand:
   - How the application starts
   - Key dependencies imported
   - Main functions/modules used
   - Configuration loading

---

## Step 4: Scan the Rest of the Code

After understanding the entrypoint, proceed to scan the remaining codebase:

1. **Directory structure:** Map out the folder hierarchy
2. **Source files:** Identify main source code files
3. **Configuration files:** Note any config files (`.env`, `config.*`, etc.)
4. **Dependencies:** Review package.json, requirements.txt, or equivalent
5. **Test files:** Identify test structure (if applicable)
6. **Documentation files:** Check for additional docs (CONTRIBUTING.md, CHANGELOG.md, etc.)

**Action:** Build a comprehensive map of the codebase structure and key files.

---

## Step 5: Scan Latest 10 Commits

To understand the progress and recent work done on the repository, scan the **latest 10 commits**:

1. **Retrieve commit history:**
   - Run `git log -10` or equivalent command
   - Note the commit hashes, dates, and authors

2. **Analyze each commit for:**
   - **Commit message:** What work was done
   - **Files changed:** Which files were modified
   - **Nature of changes:** New features, bug fixes, refactoring, documentation, etc.

3. **Identify patterns:**
   - What area of the project is currently being worked on
   - Recent focus (e.g., frontend, backend, testing, docs)
   - Active branches or milestones
   - Any ongoing development threads

4. **Track progress:**
   - Is there a clear direction or roadmap?
   - Are there any incomplete features?
   - What's the current development velocity?

**Action:** Build a timeline of recent work to understand the current state and direction of the project.

---

## Step 6: Scan for SPECKIT Topics

Finally, search for any **SPECKIT** related content in the repository:

1. **Look for speckit-related files:**
   - `speckit.md`
   - `.speckit/` directory
   - `speckit/` directory
   - Files containing "speckit" in the name

2. **Check for SPECKIT topics in:**
   - Documentation files
   - Configuration files
   - Code comments or docstrings
   - GitHub topics/tags

3. **If SPECKIT content is found:**
   - Read and parse the specifications
   - Note any specific requirements or standards defined
   - Understand how SPECKIT relates to this project

---

## Summary Checklist

Please use **todo** tools to track the progress of scaning this repository

- [ ] Found and read agent-specific docs (agents.md / Claude.md / gemini.md)
- [ ] Scanned README.md for project overview
- [ ] Identified project type and language
- [ ] Located and analyzed entrypoint
- [ ] Mapped overall code structure
- [ ] Scanned remaining code files
- [ ] Scanned latest 10 commits for work progress
- [ ] Searched for and analyzed SPECKIT topics

---

## Output

After completing all steps, provide a comprehensive summary including:

1. **Project Description:** What the repository is about
2. **Project Type:** Language, framework, and key technologies
3. **Code Structure:** Overview of directory layout
4. **Entrypoint:** How the application starts
5. **Key Components:** Important modules or files
6. **Recent Progress:** Summary of the latest 10 commits and current work direction
7. **SPECKIT Topics:** Any SPECKIT-related specifications found
8. **Additional Notes:** Any other relevant context

---

*Generated for LLM coding agent context gathering*
