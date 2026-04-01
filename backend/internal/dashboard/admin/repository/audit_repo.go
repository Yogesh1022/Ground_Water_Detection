package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditRepo struct{ db *pgxpool.Pool }

func NewAuditRepo(db *pgxpool.Pool) *AuditRepo { return &AuditRepo{db: db} }

func (r *AuditRepo) WriteLog(
	ctx context.Context,
	actorID int64,
	actorRole, action, targetTable string,
	targetID int64,
	details interface{},
	ip,
	requestID string,
) error {
	detailsJSON, err := json.Marshal(details)
	if err != nil {
		return fmt.Errorf("marshal audit details: %w", err)
	}

	_, err = r.db.Exec(
		ctx,
		`INSERT INTO audit_log (actor_id, actor_role, action, target_table, target_id, details, ip_address, request_id)
		 VALUES ($1, NULLIF($2,'')::user_role, $3, $4, $5, $6, NULLIF($7,'')::inet, NULLIF($8,''))`,
		actorID,
		actorRole,
		action,
		targetTable,
		targetID,
		detailsJSON,
		ip,
		requestID,
	)
	if err != nil {
		return fmt.Errorf("insert audit log: %w", err)
	}

	return nil
}

func (r *AuditRepo) List(ctx context.Context, q dto.AuditLogQuery) ([]dto.AuditLogEntry, int64, error) {
	q.PaginationQuery.Normalize()

	where := "WHERE 1=1"
	args := []interface{}{}
	idx := 1

	if q.ActorID > 0 {
		where += fmt.Sprintf(" AND actor_id = $%d", idx)
		args = append(args, q.ActorID)
		idx++
	}
	if q.Action != "" {
		where += fmt.Sprintf(" AND action = $%d", idx)
		args = append(args, q.Action)
		idx++
	}
	if q.TargetTable != "" {
		where += fmt.Sprintf(" AND target_table = $%d", idx)
		args = append(args, q.TargetTable)
		idx++
	}

	if q.StartDate != "" {
		start, err := parseDateBoundary(q.StartDate, false)
		if err != nil {
			return nil, 0, fmt.Errorf("invalid start_date: %w", err)
		}
		where += fmt.Sprintf(" AND created_at >= $%d", idx)
		args = append(args, start)
		idx++
	}
	if q.EndDate != "" {
		end, comparator, err := parseEndDateBoundary(q.EndDate)
		if err != nil {
			return nil, 0, fmt.Errorf("invalid end_date: %w", err)
		}
		where += fmt.Sprintf(" AND created_at %s $%d", comparator, idx)
		args = append(args, end)
		idx++
	}

	var total int64
	if err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM audit_log "+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count audit logs: %w", err)
	}

	args = append(args, q.Limit, q.Offset())
	rows, err := r.db.Query(
		ctx,
		`SELECT id, COALESCE(actor_id,0), COALESCE(actor_role::text,''), action,
		        COALESCE(target_table,''), COALESCE(target_id,0), COALESCE(details,'{}'::jsonb),
		        COALESCE(ip_address::text,''), created_at
		 FROM audit_log `+where+fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, idx, idx+1),
		args...,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list audit logs: %w", err)
	}
	defer rows.Close()

	entries := make([]dto.AuditLogEntry, 0, q.Limit)
	for rows.Next() {
		var e dto.AuditLogEntry
		var detailsRaw []byte
		if err := rows.Scan(
			&e.ID,
			&e.ActorID,
			&e.ActorRole,
			&e.Action,
			&e.TargetTable,
			&e.TargetID,
			&detailsRaw,
			&e.IPAddress,
			&e.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan audit row: %w", err)
		}

		var decoded interface{}
		if len(detailsRaw) > 0 {
			if err := json.Unmarshal(detailsRaw, &decoded); err != nil {
				return nil, 0, fmt.Errorf("decode audit details: %w", err)
			}
		}
		e.Details = decoded
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate audit rows: %w", err)
	}

	return entries, total, nil
}

func parseDateBoundary(raw string, inclusiveEnd bool) (time.Time, error) {
	v := strings.TrimSpace(raw)
	if v == "" {
		return time.Time{}, fmt.Errorf("empty date")
	}

	if t, err := time.Parse("2006-01-02", v); err == nil {
		if inclusiveEnd {
			return t.AddDate(0, 0, 1), nil
		}
		return t, nil
	}

	t, err := time.Parse(time.RFC3339, v)
	if err != nil {
		return time.Time{}, fmt.Errorf("expected YYYY-MM-DD or RFC3339")
	}

	if inclusiveEnd {
		return t, nil
	}
	return t, nil
}

func parseEndDateBoundary(raw string) (time.Time, string, error) {
	v := strings.TrimSpace(raw)
	if v == "" {
		return time.Time{}, "", fmt.Errorf("empty date")
	}

	if t, err := time.Parse("2006-01-02", v); err == nil {
		return t.AddDate(0, 0, 1), "<", nil
	}

	t, err := time.Parse(time.RFC3339, v)
	if err != nil {
		return time.Time{}, "", fmt.Errorf("expected YYYY-MM-DD or RFC3339")
	}

	return t, "<=", nil
}
