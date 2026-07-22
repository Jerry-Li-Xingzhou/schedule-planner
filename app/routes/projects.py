"""Project & Task routes — hierarchical task management."""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Project, Task
from app.schemas import (
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    TaskCreate,
    TaskOut,
    TaskUpdate,
)

router = APIRouter(prefix="/api", tags=["projects"])

# ─── Projects ────────────────────────────────────────────────────────────────────


@router.get("/projects", response_model=List[ProjectOut])
def list_projects(status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(Project)
    if status:
        q = q.filter(Project.status == status)
    projects = q.order_by(Project.created_at).all()
    result = []
    for p in projects:
        tasks = db.query(Task).filter(Task.project_id == p.id).all()
        p.task_count = len(tasks)
        p.done_count = sum(1 for t in tasks if t.status == "done")
        result.append(p)
    return result


@router.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    p = Project(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/projects/{pid}", response_model=ProjectOut)
def update_project(pid: int, data: ProjectUpdate, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/projects/{pid}", status_code=204)
def delete_project(pid: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(p)
    db.commit()


# ─── Tasks ───────────────────────────────────────────────────────────────────────


def _task_to_tree(task: Task, db: Session) -> TaskOut:
    """Convert a Task ORM object to TaskOut with nested children."""
    children = (
        db.query(Task)
        .filter(Task.parent_id == task.id)
        .order_by(Task.sort_order)
        .all()
    )
    # Compute effective due date for recurring tasks
    eff_due = task.due_date
    if task.is_recurring and task.due_date and task.recurrence:
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        d = task.start_date or today
        if d < today:
            d = today
        r = task.recurrence
        for _ in range(366):
            match = False
            if r == 'daily':
                match = True
            elif r == 'weekdays':
                match = d.weekday() < 5
            elif r.startswith('weekly:'):
                days = {int(x) for x in r.split(':')[1].split(',') if x.strip()}
                match = d.weekday() in days
            elif r == 'weekly':
                match = d.weekday() == (task.due_date.weekday() if task.due_date else today.weekday())
            if match and d <= task.due_date:
                eff_due = d
                break
            d += timedelta(days=1)

    return TaskOut(
        id=task.id,
        project_id=task.project_id,
        parent_id=task.parent_id,
        title=task.title,
        note=task.note,
        category_id=task.category_id,
        status=task.status,
        priority=task.priority,
        due_date=eff_due,
        start_date=task.start_date,
        sort_order=task.sort_order,
        task_type=task.task_type or "todo",
        is_recurring=task.is_recurring,
        recurrence=task.recurrence or "",
        last_completed=task.last_completed,
        created_at=task.created_at,
        children=[_task_to_tree(c, db) for c in children],
    )


@router.get("/tasks/all", response_model=List[TaskOut])
def list_all_tasks_with_due_date(db: Session = Depends(get_db)):
    """Get all tasks with due dates (subtasks inherit parent's due date)."""
    tasks = db.query(Task).order_by(Task.due_date).all()
    result = []
    # Build parent lookup for inheritance
    parent_dates = {}
    for t in tasks:
        if t.parent_id is None and t.due_date:
            parent_dates[t.id] = t.due_date
    for t in tasks:
        if not t.due_date and t.parent_id and t.parent_id in parent_dates:
            t.due_date = parent_dates[t.parent_id]
        if t.due_date or t.is_recurring:
            result.append(t)  # Include recurring tasks even without due_date
    return result


@router.get("/projects/{pid}/tasks", response_model=List[TaskOut])
def list_tasks(pid: int, db: Session = Depends(get_db)):
    """Get tasks for a project as a tree (phases with children)."""
    # Top-level tasks (phases)
    phases = (
        db.query(Task)
        .filter(Task.project_id == pid, Task.parent_id == None)
        .order_by(Task.sort_order)
        .all()
    )
    return [_task_to_tree(p, db) for p in phases]


@router.post("/tasks", response_model=TaskOut, status_code=201)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    task = Task(**data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/tasks/{tid}", response_model=TaskOut)
def update_task(tid: int, data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == tid).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    update_data = data.model_dump(exclude_unset=True)

    # Handle recurring task completion: bump due date (if set), reset status
    # Handle recurring task completion: bump due date (if set), reset status
    if update_data.get("status") == "done" and task.is_recurring:
        task.last_completed = datetime.utcnow()
        if task.due_date:
            old_due = task.due_date
            if task.recurrence == "daily":
                task.due_date = old_due + timedelta(days=1)
            elif task.recurrence.startswith("weekly:"):
                # Custom days: "weekly:0,2,4" = Mon,Wed,Fri
                days_str = task.recurrence.split(":")[1]
                target_days = {int(d) for d in days_str.split(",") if d.strip()}
                d = old_due + timedelta(days=1)
                for _ in range(14):
                    if d.weekday() in target_days:
                        task.due_date = d
                        break
                    d += timedelta(days=1)
            elif task.recurrence == "weekly":
                task.due_date = old_due + timedelta(days=7)
            elif task.recurrence == "weekdays":
                d = old_due + timedelta(days=1)
                while d.weekday() >= 5:
                    d += timedelta(days=1)
                task.due_date = d
            elif task.recurrence == "monthly":
                task.due_date = old_due + timedelta(days=30)
        update_data.pop("status", None)
        task.status = "todo"
    # Apply remaining updates
    for k, v in update_data.items():
        setattr(task, k, v)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{tid}", status_code=204)
def delete_task(tid: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == tid).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
