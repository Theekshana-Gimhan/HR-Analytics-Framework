# Planning Documents

## 📋 Master Document

**[PROJECT_PLAN.md](PROJECT_PLAN.md)** - **START HERE**

This is the single source of truth for all project planning, combining:
- Sprint timeline & milestones
- Complete task inventory with owners
- Current state assessment
- Risk register
- Communication processes
- Success metrics

Last Updated: February 10, 2026

---

## 🗂️ Legacy Documents (Can be Archived/Deleted)

The following documents have been **consolidated into PROJECT_PLAN.md**:

1. **TEAM_TASKS.md** - Task assignments (now in PROJECT_PLAN § Complete Task Inventory)
2. **EXECUTION_PLAN.md** - Sprint timeline (now in PROJECT_PLAN § Sprint Timeline)
3. **NEXT_DEVELOPMENT_PLAN.md** - Status report (now in PROJECT_PLAN § Current State Assessment)

### What to Do With Them?

**Option 1: Delete** (Recommended)
```powershell
Remove-Item TEAM_TASKS.md, EXECUTION_PLAN.md, NEXT_DEVELOPMENT_PLAN.md
```

**Option 2: Archive**
```powershell
mkdir archive
Move-Item TEAM_TASKS.md, EXECUTION_PLAN.md, NEXT_DEVELOPMENT_PLAN.md -Destination archive/
```

**Option 3: Keep for Reference**
Just leave them, but **only update PROJECT_PLAN.md** going forward.

---

## 📝 Usage Guidelines

### When to Update PROJECT_PLAN.md

- ✅ **Daily**: Update task statuses as work completes
- ✅ **Weekly**: Update sprint progress, risk register
- ✅ **Sprint End**: Add retrospective notes, update metrics

### Sections to Keep Current

1. **Executive Dashboard** - Update weekly
2. **Task Inventory** - Update as tasks complete
3. **Current State Assessment** - Update when features ship
4. **Risk Register** - Update when risks change
5. **Next Actions** - Update weekly

### Sections That Rarely Change

- Team Roles & Responsibilities
- Communication & Governance
- Success Metrics
- Important Dates

---

## 🔄 Quick Reference

| Need to... | Go to Section... |
|------------|------------------|
| See overall progress | § Executive Dashboard |
| Check sprint deadlines | § Sprint Timeline |
| Find task owner | § Complete Task Inventory |
| Review what's working | § Current State Assessment |
| Check launch blockers | § Critical Path Analysis |
| Understand risks | § Risk Register |
| Plan this week | § Next Actions |

---

*Maintained by PM Team*
