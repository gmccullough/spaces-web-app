# Work Plan Execution Guide

This guide covers how to manage work plans through their lifecycle, from planning to completion.

📋 **Naming Standards**: See [README.md File Naming Standards](./README.md#file-naming-standards) for complete naming conventions and examples.

## Work Plan Lifecycle

Work plans follow a clear lifecycle with file naming conventions that reflect their status:

### 1. Planning Phase: TODO-*.md
- **Format**: `TODO-<descriptive-name>.md`
- **Purpose**: New work plans in planning or backlog state
- **Example**: `TODO-user-authentication-enhancement.md`

### 2. Active Development: WIP-*.md  
- **Format**: `WIP-<descriptive-name>.md`
- **Purpose**: Work that has been started and is actively in progress
- **When to use**: Rename from TODO when work begins
- **Example**: `TODO-user-authentication-enhancement.md` → `WIP-user-authentication-enhancement.md`

### 3. Completed Work: YYYYMMDD-*.md
- **Format**: `YYYYMMDD-<descriptive-name>.md` (completion date)
- **Purpose**: Completed work plans with historical record
- **When to use**: Rename from WIP when all work is finished
- **Example**: `WIP-user-authentication-enhancement.md` → `20250809-user-authentication-enhancement.md`

### Work Plan Lifecycle Workflow

1. **Create**: Start with `TODO-<descriptive-name>.md`
2. **Begin Work**: Rename to `WIP-<descriptive-name>.md` when starting implementation
3. **Track Progress**: Update phases/sections directly in the WIP file as work progresses
4. **Complete**: Rename to `YYYYMMDD-<descriptive-name>.md` when all work is finished
5. **Clean Up**: Verify that there is only one work plan with fully checked tasks inside and TODO/WIP file variants are removed.
   - Delete the prior file when copying/renaming (e.g., remove the old TODO after creating the WIP).

## Status Tracking Within Files

While work is in progress (WIP files), update the plan directly with integrated document practices:

### Progress Updates (Integrated Approach)
- ✅ **Mark completed phases** with checkboxes AND update related timeline/dependency sections
- 📝 **Add implementation notes** that cross-reference technical approach and architecture decisions
- 🔄 **Update timelines** with ripple effects on dependent phases and milestones
- ⚠️ **Document scope changes** by revising introduction, success criteria, and testing strategy
- 🔗 **Maintain consistency** between progress updates and all document sections

### WIP Update Checklist
When making any change to a WIP document:
- [ ] Does this affect the project timeline or milestones?
- [ ] Should the technical approach section be updated?
- [ ] Do completion criteria need revision?
- [ ] Are there new risks or dependencies to document?
- [ ] Does the testing strategy require updates?
- [ ] Is the introduction/scope still accurate?

## Integrated Document Editing

### 🎯 Golden Rule: Integrated Document Editing
**Every work plan edit must consider the document as a unified whole.** Changes to any section should trigger review and updates across all related sections to maintain document coherence and project integrity.

### Continuous Maintenance Reminder
- Whenever you open a work plan while kicking off or scoping new tasks, update it to reflect prior work and any newly discovered context/constraints. Treat the document as a living spec.

### Authoring Best Practices

#### Integrated Document Updates
**CRITICAL**: When editing work plans, treat the document as a cohesive whole. Changes should be integrated throughout all relevant sections, not simply appended.

#### Deep Integration Guidelines
- **Cross-Reference Updates**: When adding new phases, update timeline sections, dependency lists, and completion criteria
- **Consistency Checks**: Ensure new content aligns with existing scope, assumptions, and constraints  
- **Holistic Review**: Update executive summary, technical approach, and risk assessments to reflect changes
- **Section Harmony**: Modify introduction, implementation details, and success metrics as a unified narrative

#### Common Integration Points
- **Timeline Impact**: New features affect project phases, milestones, and delivery dates
- **Resource Allocation**: Changes influence effort estimates, skill requirements, and external dependencies
- **Risk Assessment**: New functionality introduces different technical and business risks
- **Testing Strategy**: Additional features require updated test plans, coverage analysis, and validation approaches
- **Architecture Decisions**: Feature changes may affect system design, data models, and integration patterns

#### Anti-Patterns to Avoid
- ❌ Adding sections at the end without updating earlier content
- ❌ Inserting requirements without revising technical approach
- ❌ Updating scope without adjusting timelines and resources
- ❌ Adding features without updating risk and testing sections

## Implementation Guidelines

### Before Starting Work (TODO → WIP)
1. **Validate File Naming**: Use the [File Naming Validation Checklist](#file-naming-validation-checklist) below
2. **Review Existing Tests**: Check `specs/product/[domain]/tests.md` for affected areas
3. **Plan Test Strategy**: Design test approach for new functionality
4. **Identify Dependencies**: Document test requirements and external service needs
5. **Cost Estimation**: Evaluate API usage and execution time for new tests
6. **Collect Discussion Context**: Use the discussion questions to gather decision context from the user

## File Naming Validation Checklist

Before creating or renaming work plan files:

- [ ] **Format**: Follows `TODO-<descriptive-name>.md` pattern exactly
- [ ] **Case**: Uses kebab-case (lowercase with hyphens only)
- [ ] **Length**: Descriptive name is 50 characters or less
- [ ] **Clarity**: Name clearly describes the main feature/change
- [ ] **Words**: Uses full words, not abbreviations
- [ ] **Domain**: File is in correct domain directory
- [ ] **Uniqueness**: No other file with same descriptive name exists

### During Implementation (WIP updates)
1. **Run Regression Tests**: Execute affected test suites regularly
2. **Create Tests Incrementally**: Build tests as functionality is implemented
3. **Update Documentation**: Keep test docs current with implementation
4. **Practice Integrated Editing**: Every WIP update should review and revise the entire document for consistency

#### Integrated Editing During WIP Updates
- **Before Each Update**: Review current document state and identify all sections that need revision
- **During Updates**: Make changes across all relevant sections simultaneously, not in isolation  
- **After Updates**: Verify document coherence and cross-reference accuracy
- **Regular Reviews**: Periodically assess whether the overall document structure and narrative still serves the project

### For Completion (WIP → YYYYMMDD)
All completion criteria must be met:

- [ ] **All existing tests pass** - No regressions in affected domains
- [ ] **New tests implemented and passing** - Functionality validated
- [ ] **Test documentation updated** - Coverage docs reflect new tests
- [ ] **Selective execution verified** - Domain test commands work correctly

## Test-Driven Work Plan Requirements

**IMPORTANT**: All work plans must now include comprehensive test integration to ensure quality and prevent regressions.

### Required Sections for All New Work Plans

#### 1. Tests That Must Pass for Completion
Every work plan must identify and validate existing functionality:

```markdown
## Tests That Must Pass for Completion

### [Domain] Tests (Critical functionality validation)
- `npm test -- --grep "[domain]"` - Core domain functionality
- List specific test files affected by changes
- Document cross-domain test dependencies

### Regression Prevention
- Identify all domains potentially affected by changes
- Reference domain test documentation: `specs/product/[domain]/tests.md`
- Plan regression test execution strategy
```

#### 2. New Tests Required
All new functionality must include corresponding test coverage:

```markdown
## New Tests Required

### Test Categories
- **Unit tests**: Component/service level testing (< 1 minute execution)
- **Integration tests**: Cross-component functionality (2-5 minutes)
- **End-to-end tests**: Complete user journeys (5-10 minutes)
- **Performance tests**: Load and stress testing (as needed)

### Test Dependencies
- Document external API requirements and costs
- Specify test data and environment needs
- Plan test execution strategy and frequency
```

#### 3. Test Documentation Updates
Maintain comprehensive test coverage documentation:

```markdown
## Test Documentation Updates Required

### Domain Documentation Updates
- Update `specs/product/[domain]/tests.md` with new test coverage
- Add feature coverage mapping for new functionality
- Update selective execution commands
- Document cross-domain relationships

### Test Discovery
- Add new tests to test discovery guide
- Update domain-specific test commands
- Cross-reference with product specifications
```

## File Organization & Conventions

### File Organization
- **By Domain**: Plans are organized in directories matching `/specs/product/<domain>/`
- **Cross-References**: Always link back to relevant product specifications
- **Dependencies**: Document relationships between work plans

### Conventions
- Use kebab-case for descriptive names: `user-authentication-enhancement`
- Follow [File Naming Standards](./README.md#file-naming-standards) exactly
- Include completion date when moving to final state
- Maintain links to product specs in `specs/product/<domain>/`
- Cross-reference related work plans in other domains

## Status at a Glance

- **Planning**: `TODO-*.md` files (not started)
- **Active**: `WIP-*.md` files (in progress) 
- **Completed**: `YYYYMMDD-*.md` files (done)

## Testing Framework Integration

The testing framework provides:

- **Comprehensive Test Suite**: Production-ready test coverage
- **Domain Coverage**: All product domains have test documentation
- **Cross-Domain Mapping**: Complete relationship documentation
- **Developer Tools**: Test discovery guide, templates, maintenance procedures

**Framework Documentation**:
- **Test Discovery**: `specs/product/[domain]/tests.md`
- **Domain Coverage**: `specs/product/*/tests.md`

This testing integration ensures all future development maintains high quality standards.

## Completion Criteria Validation

### Final Completion Criteria
All items must be verified before marking work plan complete:

- [ ] **Functionality**: All planned features work as specified
- [ ] **Testing**: All new and regression tests pass
- [ ] **Documentation**: All documentation updated and accurate
- [ ] **Integration**: No breaking changes to existing systems
- [ ] **Performance**: No degradation in relevant metrics

### Completion Workflow
1. **Self-Assessment**: Review all completion criteria
2. **Test Validation**: Run full test suite for affected domains
3. **Documentation Review**: Verify all docs are current
4. **Integration Check**: Confirm no breaking changes
5. **File Rename**: Move from `WIP-*.md` to `YYYYMMDD-*.md`
6. **Archive**: File becomes historical record

### Post-Completion
- Work plan becomes reference for future similar work
- Lessons learned inform future planning
- Implementation patterns establish domain conventions
- Test coverage contributes to regression prevention

## Common Execution Patterns

### Starting a New Work Plan
```bash
# 1. Create the work plan file
touch specs/work-plans/[domain]/TODO-descriptive-name.md

# 2. Fill in the work plan using creation guide template

# 3. When ready to start implementation
mv specs/work-plans/[domain]/TODO-descriptive-name.md \
   specs/work-plans/[domain]/WIP-descriptive-name.md
```

### Tracking Progress
```markdown
# Update checkboxes as work progresses
- [x] **Create** **UserService** - Centralize user management logic
- [ ] **Update** **AuthController** - Integrate with new UserService
- [ ] **Add** **User Tests** - Comprehensive test coverage

# Add implementation notes
### Implementation Notes
- UserService created with dependency injection pattern
- Discovered need for additional validation - added to scope
- Performance optimization needed for user lookup queries
```

### Completing Work
```bash
# 1. Verify all completion criteria are met
# 2. Run final test suite
npm test

# 3. Update documentation
# 4. Rename to completed status
mv specs/work-plans/[domain]/WIP-descriptive-name.md \
   specs/work-plans/[domain]/$(date +%Y%m%d)-descriptive-name.md
```

## Troubleshooting Common Issues

### Work Plan Scope Creep
**Problem**: Work plan grows beyond original scope during implementation
**Solution**: 
1. Document scope changes in "Discussion & Decision Context" section
2. Update timeline and resource estimates
3. Consider splitting into multiple work plans if scope becomes too large

### Dependency Blocking Progress
**Problem**: External dependency prevents progress on current work plan
**Solution**:
1. Document the blocking dependency clearly
2. Create separate work plan for resolving the dependency
3. Update current work plan status and timeline
4. Consider alternative approaches that don't require the dependency

### Test Failures During Implementation
**Problem**: New code breaks existing tests
**Solution**:
1. Identify root cause of test failures
2. Determine if tests need updating or code needs fixing
3. Update work plan with additional testing tasks if needed
4. Document any test changes in the testing strategy section

---
*Execution Guide - Focus: Lifecycle Management and Progress Tracking*  
*See: [Work Plan Creation Guide](./work-plan-creation-guide.md) for planning standards*
