# VAZHI Rebuild — Codebase Inventory Map

This inventory details files flagged for deletion or consolidation to streamline the repository before the VAZHI rebuild.

---

## 1. Candidate Files Dependency Mapping

### Android & Build Sandbox
#### `android_obsolete/`
- **Imports**: None.
- **Calls**: None.
- **Reachable**: No (defunct folder).
- **Required for VAZHI**: No.
- **Classification**: **DELETE**

#### `index_obsolete.js`
- **Imports**: None.
- **Calls**: None.
- **Reachable**: No.
- **Required for VAZHI**: No.
- **Classification**: **DELETE**

#### `package-lock_obsolete.json`
- **Imports**: None.
- **Calls**: None.
- **Reachable**: No.
- **Required for VAZHI**: No.
- **Classification**: **DELETE**

### Workflows & CI Configs
#### NumPy in `.github/workflows/android.yml`
- **Imports**: None.
- **Calls**: Run step in CI workflow.
- **Reachable**: Checked in GitHub Actions.
- **Required for VAZHI**: No ( numpy was for mobile Python bindings, which are now removed).
- **Classification**: **DELETE (Workflow line item)**

### Package Dependencies
#### `convex` in `frontend/package.json`
- **Imports**: None (Convex bindings have been removed from frontend typescript imports).
- **Calls**: None.
- **Reachable**: No.
- **Required for VAZHI**: No.
- **Classification**: **DELETE (package.json entry)**
