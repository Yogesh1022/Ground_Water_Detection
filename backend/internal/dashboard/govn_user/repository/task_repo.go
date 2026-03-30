package repository

import (
	"context"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TaskRepo manages task assignments.
type TaskRepo struct{ db *pgxpool.Pool }

// NewTaskRepo constructs repo.
func NewTaskRepo(db *pgxpool.Pool) *TaskRepo { return &TaskRepo{db: db} }

// Create inserts a new task assignment.
func (r *TaskRepo) Create(ctx context.Context, assignedByID int64, req dto.CreateTaskRequest) (dto.TaskResponse, error) {
	var t dto.TaskResponse
	var dueDate *string
	if req.DueDate != "" {
		dueDate = &req.DueDate
	}

	err := r.db.QueryRow(ctx,
		`INSERT INTO task_assignments (complaint_id, assignee_officer_id, assigned_by_id, priority, notes, due_date)
         VALUES ($1, $2, $3, $4, NULLIF($5,''), $6::date)
         RETURNING id, complaint_id, assignee_officer_id,
                   (SELECT name FROM users WHERE id = $2),
                   priority::text, status::text,
                   COALESCE(notes,''), COALESCE(due_date::text,''), created_at`,
		req.ComplaintID, req.AssigneeOfficerID, assignedByID, req.Priority, req.Notes, dueDate,
	).Scan(&t.ID, &t.ComplaintID, &t.AssigneeOfficerID, &t.AssigneeName,
		&t.Priority, &t.Status, &t.Notes, &t.DueDate, &t.CreatedAt)
	if err != nil {
		return t, fmt.Errorf("create task: %w", err)
	}
	return t, nil
}

// UpdateStatus updates task status and optional notes.
func (r *TaskRepo) UpdateStatus(ctx context.Context, id int64, req dto.UpdateTaskRequest) error {
	var err error
	if req.Status == "completed" {
		_, err = r.db.Exec(ctx,
			`UPDATE task_assignments SET status = $2, notes = COALESCE(NULLIF($3,''), notes), completed_at = NOW() WHERE id = $1`,
			id, req.Status, req.Notes)
	} else {
		_, err = r.db.Exec(ctx,
			`UPDATE task_assignments SET status = $2, notes = COALESCE(NULLIF($3,''), notes) WHERE id = $1`,
			id, req.Status, req.Notes)
	}
	if err != nil {
		return fmt.Errorf("update task: %w", err)
	}
	return nil
}

// GetByID fetches a task.
func (r *TaskRepo) GetByID(ctx context.Context, id int64) (dto.TaskResponse, error) {
	var t dto.TaskResponse
	err := r.db.QueryRow(ctx,
		`SELECT ta.id, ta.complaint_id, ta.assignee_officer_id,
                u.name, ta.priority::text, ta.status::text,
                COALESCE(ta.notes,''), COALESCE(ta.due_date::text,''), ta.created_at
         FROM task_assignments ta
         JOIN users u ON u.id = ta.assignee_officer_id
         WHERE ta.id = $1`, id,
	).Scan(&t.ID, &t.ComplaintID, &t.AssigneeOfficerID, &t.AssigneeName,
		&t.Priority, &t.Status, &t.Notes, &t.DueDate, &t.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return t, fmt.Errorf("task not found")
		}
		return t, fmt.Errorf("get task: %w", err)
	}
	return t, nil
}

// GetWorkload aggregates workload per officer within a district.
func (r *TaskRepo) GetWorkload(ctx context.Context, district string) ([]dto.WorkloadEntry, error) {
	rows, err := r.db.Query(ctx,
		`SELECT u.id, u.name,
                COUNT(*) FILTER (WHERE ta.status = 'pending')     AS pending,
                COUNT(*) FILTER (WHERE ta.status = 'in_progress') AS in_progress,
                COUNT(*) FILTER (WHERE ta.status = 'completed')   AS completed,
                COUNT(*)                                          AS total
         FROM task_assignments ta
         JOIN users u ON u.id = ta.assignee_officer_id
         WHERE u.district = $1 AND u.role = 'gov'
         GROUP BY u.id, u.name
         ORDER BY total DESC`, district,
	)
	if err != nil {
		return nil, fmt.Errorf("workload: %w", err)
	}
	defer rows.Close()

	var workload []dto.WorkloadEntry
	for rows.Next() {
		var w dto.WorkloadEntry
		rows.Scan(&w.OfficerID, &w.OfficerName, &w.Pending, &w.InProgress, &w.Completed, &w.Total)
		workload = append(workload, w)
	}
	return workload, rows.Err()
}

// CountPending counts pending/in_progress tasks in a district.
func (r *TaskRepo) CountPending(ctx context.Context, district string) (int64, error) {
	var n int64
	r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM task_assignments ta
         JOIN users u ON u.id = ta.assignee_officer_id
         WHERE u.district = $1 AND ta.status IN ('pending', 'in_progress')`, district,
	).Scan(&n)
	return n, nil
}

// ListByDistrict returns paged tasks for officers in a district.
func (r *TaskRepo) ListByDistrict(ctx context.Context, district string, q dto.PaginationQuery) ([]dto.TaskResponse, int64, error) {
	var total int64
	r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM task_assignments ta JOIN users u ON u.id = ta.assignee_officer_id WHERE u.district = $1`, district,
	).Scan(&total)

	rows, err := r.db.Query(ctx,
		`SELECT ta.id, ta.complaint_id, ta.assignee_officer_id, u.name, ta.priority::text, ta.status::text,
				COALESCE(ta.notes,''), COALESCE(ta.due_date::text,''), ta.created_at
		 FROM task_assignments ta
		 JOIN users u ON u.id = ta.assignee_officer_id
		 WHERE u.district = $1
		 ORDER BY ta.created_at DESC
		 LIMIT $2 OFFSET $3`,
		district, q.Limit, q.Offset(),
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list tasks: %w", err)
	}
	defer rows.Close()

	var tasks []dto.TaskResponse
	for rows.Next() {
		var t dto.TaskResponse
		rows.Scan(&t.ID, &t.ComplaintID, &t.AssigneeOfficerID, &t.AssigneeName,
			&t.Priority, &t.Status, &t.Notes, &t.DueDate, &t.CreatedAt)
		tasks = append(tasks, t)
	}
	return tasks, total, rows.Err()
}

// Reassign updates the assignee of a task.
func (r *TaskRepo) Reassign(ctx context.Context, id, newAssignee int64, notes string) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE task_assignments
		 SET assignee_officer_id = $2, notes = COALESCE(NULLIF($3,''), notes), updated_at = NOW()
		 WHERE id = $1`, id, newAssignee, notes,
	)
	if err != nil {
		return fmt.Errorf("reassign task: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("task not found")
	}
	return nil
}
