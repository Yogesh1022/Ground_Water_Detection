package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ComplaintRepo handles complaint persistence for gov officers.
type ComplaintRepo struct{ db *pgxpool.Pool }

// NewComplaintRepo constructs the complaint repository.
func NewComplaintRepo(db *pgxpool.Pool) *ComplaintRepo { return &ComplaintRepo{db: db} }

// ListByDistrict returns paged complaints filtered by district and optional filters.
func (r *ComplaintRepo) ListByDistrict(ctx context.Context, district string, q dto.ComplaintListQuery) ([]dto.ComplaintResponse, int64, error) {
	where := "WHERE district = $1"
	args := []interface{}{district}
	i := 2
	if q.Status != "" {
		where += fmt.Sprintf(" AND status = $%d", i)
		args = append(args, q.Status)
		i++
	}
	if q.Severity != "" {
		where += fmt.Sprintf(" AND severity = $%d", i)
		args = append(args, q.Severity)
		i++
	}
	if q.Type != "" {
		where += fmt.Sprintf(" AND type = $%d", i)
		args = append(args, q.Type)
		i++
	}
	if q.Priority != "" {
		// priority mirrors severity in current schema
		where += fmt.Sprintf(" AND severity = $%d", i)
		args = append(args, strings.ToLower(q.Priority))
		i++
	}
	if q.Q != "" {
		where += fmt.Sprintf(" AND (tracking_number ILIKE $%d OR village ILIKE $%d OR description ILIKE $%d)", i, i+1, i+2)
		like := "%" + q.Q + "%"
		args = append(args, like, like, like)
		i += 3
	}
	if q.FromDate != "" {
		where += fmt.Sprintf(" AND created_at >= $%d", i)
		args = append(args, q.FromDate)
		i++
	}
	if q.ToDate != "" {
		where += fmt.Sprintf(" AND created_at <= $%d", i)
		args = append(args, q.ToDate)
		i++
	}

	var total int64
	r.db.QueryRow(ctx, "SELECT COUNT(*) FROM complaints "+where, args...).Scan(&total)

	args = append(args, q.Limit, q.Offset())
	rows, err := r.db.Query(ctx,
		`SELECT id, tracking_number, type, district, COALESCE(taluka,''), COALESCE(village,''),
			severity::text, severity::text AS priority, description, status::text,
			assigned_officer_id, COALESCE(escalation_note,''), created_at, updated_at
		 FROM complaints `+where+
			fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, i, i+1),
		args...,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list complaints: %w", err)
	}
	defer rows.Close()

	var complaints []dto.ComplaintResponse
	for rows.Next() {
		var c dto.ComplaintResponse
		rows.Scan(&c.ID, &c.TrackingNumber, &c.Type, &c.District, &c.Taluka, &c.Village,
			&c.Severity, &c.Priority, &c.Description, &c.Status, &c.AssignedOfficerID,
			&c.EscalationNote, &c.CreatedAt, &c.UpdatedAt)
		complaints = append(complaints, c)
	}
	return complaints, total, rows.Err()
}

// GetByID returns a complaint by primary key.
func (r *ComplaintRepo) GetByID(ctx context.Context, id int64) (dto.ComplaintResponse, error) {
	var c dto.ComplaintResponse
	err := r.db.QueryRow(ctx,
		`SELECT id, tracking_number, type, district, COALESCE(taluka,''), COALESCE(village,''),
				severity::text, severity::text AS priority, description, status::text,
				assigned_officer_id, COALESCE(escalation_note,''), created_at, updated_at
		 FROM complaints WHERE id = $1`, id,
	).Scan(&c.ID, &c.TrackingNumber, &c.Type, &c.District, &c.Taluka, &c.Village,
		&c.Severity, &c.Priority, &c.Description, &c.Status, &c.AssignedOfficerID,
		&c.EscalationNote, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return c, fmt.Errorf("complaint not found")
		}
		return c, fmt.Errorf("get complaint: %w", err)
	}
	return c, nil
}

// Assign updates a complaint with an assigned officer and sets status to in_review.
func (r *ComplaintRepo) Assign(ctx context.Context, id, officerID int64, note string) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE complaints SET status = 'in_review', assigned_officer_id = $2
         WHERE id = $1`, id, officerID,
	)
	if err != nil {
		return fmt.Errorf("assign complaint: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("complaint not found")
	}
	return nil
}

// UpdateStatus transitions complaint status (resolves or escalates, etc.).
func (r *ComplaintRepo) UpdateStatus(ctx context.Context, id int64, status, escalationNote string) error {
	var err error
	if status == "resolved" {
		_, err = r.db.Exec(ctx,
			`UPDATE complaints SET status = $2, resolved_at = NOW() WHERE id = $1`, id, status)
	} else {
		_, err = r.db.Exec(ctx,
			`UPDATE complaints SET status = $2, escalation_note = NULLIF($3,'') WHERE id = $1`,
			id, status, escalationNote)
	}
	if err != nil {
		return fmt.Errorf("update complaint status: %w", err)
	}
	return nil
}

// CountByStatus returns counts per status for a district.
func (r *ComplaintRepo) CountByStatus(ctx context.Context, district string) (map[string]int64, error) {
	rows, err := r.db.Query(ctx,
		`SELECT status::text, COUNT(*) FROM complaints WHERE district = $1 GROUP BY status`, district)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	counts := map[string]int64{}
	for rows.Next() {
		var status string
		var n int64
		rows.Scan(&status, &n)
		counts[status] = n
	}
	return counts, rows.Err()
}

// CountByCategory returns counts grouped by complaint type for charts.
func (r *ComplaintRepo) CountByCategory(ctx context.Context, district string) ([]dto.CategoryCount, error) {
	rows, err := r.db.Query(ctx,
		`SELECT type, COUNT(*) FROM complaints WHERE district = $1 GROUP BY type ORDER BY COUNT(*) DESC`, district)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []dto.CategoryCount
	for rows.Next() {
		var c dto.CategoryCount
		rows.Scan(&c.Category, &c.Count)
		out = append(out, c)
	}
	return out, rows.Err()
}

// GetPriorityRequests returns high-priority recent complaints.
func (r *ComplaintRepo) GetPriorityRequests(ctx context.Context, district string, limit int) ([]dto.PriorityRequest, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tracking_number, description, COALESCE(village,''), severity::text, status::text,
				COALESCE((SELECT name FROM users WHERE id = assigned_officer_id),'') AS assignee,
				created_at
		 FROM complaints
		 WHERE district = $1 AND severity IN ('high','critical')
		 ORDER BY severity DESC, created_at DESC
		 LIMIT $2`, district, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("priority requests: %w", err)
	}
	defer rows.Close()

	var out []dto.PriorityRequest
	for rows.Next() {
		var p dto.PriorityRequest
		var created time.Time
		rows.Scan(&p.ID, &p.TrackingNo, &p.Issue, &p.Village, &p.Priority, &p.Status, &p.AssignedTo, &created)
		p.SubmittedAt = created.Format(time.RFC3339)
		out = append(out, p)
	}
	return out, rows.Err()
}
