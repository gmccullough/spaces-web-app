# Work Plans

Implementation plans organized by domain, following a clear lifecycle from planning to completion.

## Quick Start

### Creating Work Plans
👉 **[Work Plan Creation Guide](./work-plan-creation-guide.md)**
- Fidelity standards and quality requirements
- Required sections and templates
- Discussion collection process
- Quality control checklists

### Executing Work Plans  
👉 **[Work Plan Execution Guide](./work-plan-execution-guide.md)**
- Lifecycle management (TODO → WIP → Complete)
- Progress tracking and integrated editing
- Testing requirements and completion criteria

## Work Plan Lifecycle

Work plans follow a clear naming convention that reflects their status:

| Status | Format | Purpose | Example |
|--------|---------|----------|---------|
| **Planning** | `TODO-<descriptive-name>.md` | New work plans in backlog | `TODO-user-authentication-enhancement.md` |
| **Active** | `WIP-<descriptive-name>.md` | Work in progress | `WIP-user-authentication-enhancement.md` |
| **Complete** | `YYYYMMDD-<descriptive-name>.md` | Finished work with date | `20250809-user-authentication-enhancement.md` |

### Renaming & Cleanup (Important)
- When you copy/rename a work plan to advance its lifecycle (e.g., `TODO-…` → `WIP-…`, `WIP-…` → `YYYYMMDD-…`), delete the prior file to avoid duplication.
- After renaming, re-open the document and perform an integrated review to ensure all sections reflect current state.

## File Naming Standards

### Required Format
- **Planning**: `TODO-<descriptive-name>.md`
- **Active**: `WIP-<descriptive-name>.md` 
- **Complete**: `YYYYMMDD-<descriptive-name>.md`

### Naming Rules
- Use **kebab-case** (lowercase with hyphens): `user-authentication-enhancement`
- Use **full words** not abbreviations: `authentication` not `auth`
- Be **descriptive but concise**: capture the main feature/change
- **Maximum 50 characters** for the descriptive name portion
- Use **completion date** (YYYYMMDD) when moving to final state

### Examples
✅ **Good**: `TODO-multi-attribute-content-insights-enhancement.md`
✅ **Good**: `WIP-openai-service-domain-refactor.md`
✅ **Good**: `20250809-user-authentication-enhancement.md`

❌ **Avoid**: `TODO-user-auth.md` (abbreviated)
❌ **Avoid**: `TODO_User_Authentication.md` (wrong case/separators)
❌ **Avoid**: `TODO-fix-stuff.md` (too vague)

## Directory Organization

Work plans are organized by domain, matching the structure in `/specs/product/`:

```
work-plans/
├── [domain-1]/           # Domain-specific work plans
├── [domain-2]/           # Another domain's work plans
├── [domain-3]/           # Additional domain work plans
└── [other-domains]/      # More domains as needed
```

## Status at a Glance

### Current Work Status
- **Planning** (`TODO-*.md`): Work plans ready to be started
- **Active** (`WIP-*.md`): Work currently in progress  
- **Completed** (`YYYYMMDD-*.md`): Finished work with historical record

### Finding Work Plans
- **By Status**: Look for `TODO-`, `WIP-`, or date-prefixed files
- **By Domain**: Navigate to relevant domain directories
- **Cross-References**: Plans link to product specs in `/specs/product/<domain>/`

## Key Principles

### Quality Standards
- **Implementation-Ready**: Work plans provide actionable checklists, not high-level aspirations
- **Testing Integration**: All plans include comprehensive test coverage requirements
- **Decision Context**: Plans capture alternatives considered and timing rationale

### Lifecycle Management
- **Integrated Editing**: Updates consider the entire document, not just individual sections
- **Progress Tracking**: WIP files are updated in real-time with implementation progress
- **Completion Criteria**: Clear, measurable criteria for marking work complete

### Ongoing Maintenance Guidance
- Whenever you read an existing work plan to start or scope new tasks, update it to reflect prior work and newly discovered context. Treat the document as a living spec.

### Documentation Standards
- **Cross-References**: Plans link to relevant product specifications
- **Domain Alignment**: Consistent with established patterns in each domain
- **Test Framework Integration**: Leverages existing testing infrastructure

## Quick Reference Commands

### File Operations
```bash
# Start work (rename TODO to WIP)
mv TODO-descriptive-name.md WIP-descriptive-name.md

# Complete work (rename WIP to dated)
mv WIP-descriptive-name.md $(date +%Y%m%d)-descriptive-name.md
```

### Test Execution
```bash
# Run domain-specific tests
npm test -- --grep "[domain]"
# or
pytest tests/[domain]/

# Run all tests
npm test
# or
pytest
```

## Getting Help

- **Creation Questions**: See [Work Plan Creation Guide](./work-plan-creation-guide.md)
- **Execution Questions**: See [Work Plan Execution Guide](./work-plan-execution-guide.md)
- **Domain Specs**: `/specs/product/<domain>/`
- **Architecture Context**: `/specs/architecture/`

---
*Work Plans Overview - Navigate to detailed guides for specific workflows*
