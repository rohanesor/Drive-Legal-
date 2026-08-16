# DriveLegal — AI Engineering Rules

**Project:** DriveLegal  
**Purpose:** Engineering rules for Codex, Gemini, and other AI coding agents  
**Status:** Active  
**Priority:** MUST FOLLOW

---

## 1. Source of Truth

Before modifying the project, read:

1. `PROJECT_CONTEXT.md`
2. `docs/`
3. `prompts/`
4. The latest audit/specification in `docs/specs/`
5. The relevant feature specification
6. Existing implementation related to the task

Never assume the current code matches older documentation.

The **latest audit + current code** must be checked before implementation.

---

## 2. Audit Before Implementation

Before writing code:

```text
READ
 ↓
AUDIT
 ↓
UNDERSTAND
 ↓
PLAN
 ↓
IMPLEMENT
 ↓
TEST
 ↓
REVIEW