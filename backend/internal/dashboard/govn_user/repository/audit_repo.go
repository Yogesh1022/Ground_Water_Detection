package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AuditRepo writes and lists audit log entries for gov officers.
type AuditRepo struct{ db *pgxpool.Pool }

// NewAuditRepo creates a new audit repository.
func NewAuditRepo(db *pgxpool.Pool) *AuditRepo { return &AuditRepo{db: db} }

// WriteLog inserts an audit log entry.
func (r *AuditRepo) WriteLog(
	ctx context.Context,
	actorID int64, actorRole, action, targetTable string,
	targetID int64, details interface{}, ip, requestID string,
) error {
	detailsJSON, _ := json.Marshal(details)
	_, err := r.db.Exec(ctx,
		`INSERT INTO audit_log (actor_id, actor_role, action, target_table, target_id, details, ip_address, request_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8)`,
		actorID, actorRole, action, targetTable, targetID, detailsJSON, ip, requestID,
	)
	return err
}

// ListByDistrict returns audit entries for gov role with optional action filter.
func (r *AuditRepo) ListByDistrict(ctx context.Context, district string, q dto.ActivityLogQuery) ([]dto.ActivityEntry, int64, error) {
	where := "WHERE al.actor_role = 'gov'"
	args := []interface{}{}
	i := 1
	if district != "" {
		where += fmt.Sprintf(" AND u.district = $%d", i)
		args = append(args, district)
		i++
	}
	if q.Action != "" {
		where += fmt.Sprintf(" AND al.action = $%d", i)
		args = append(args, q.Action)
		i++
	}
	if q.Actor != "" {
		where += fmt.Sprintf(" AND u.name ILIKE $%d", i)
		args = append(args, "%"+q.Actor+"%")
		i++
	}
	if q.From != "" {
		where += fmt.Sprintf(" AND al.created_at >= $%d", i)
		args = append(args, q.From)
		i++
	}
	if q.To != "" {
		where += fmt.Sprintf(" AND al.created_at <= $%d", i)
		args = append(args, q.To)
		i++
	}

	var total int64
	r.db.QueryRow(ctx, "SELECT COUNT(*) FROM audit_log al LEFT JOIN users u ON u.id = al.actor_id "+where, args...).Scan(&total)

	args = append(args, q.Limit, q.Offset())
	rows, err := r.db.Query(ctx,
		`SELECT al.id, COALESCE(al.actor_id,0), COALESCE(al.actor_role::text,''),
				al.action, COALESCE(al.target_table,''), COALESCE(al.target_id,0),
				COALESCE(al.details,'{}'), al.created_at
		 FROM audit_log al
		 LEFT JOIN users u ON u.id = al.actor_id
		 `+where+
			fmt.Sprintf(" ORDER BY al.created_at DESC LIMIT $%d OFFSET $%d", i, i+1),
		args...,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var entries []dto.ActivityEntry
	for rows.Next() {
		var e dto.ActivityEntry
		var detailsRaw []byte
		rows.Scan(&e.ID, &e.ActorID, &e.ActorRole, &e.Action, &e.TargetTable, &e.TargetID, &detailsRaw, &e.CreatedAt)
		json.Unmarshal(detailsRaw, &e.Details)
		entries = append(entries, e)
	}
	return entries, total, rows.Err()
}

// GetRecentFeed returns compact activity feed for overview widgets.
func (r *AuditRepo) GetRecentFeed(ctx context.Context, district string, limit int) ([]dto.RecentActivityEntry, error) {
	rows, err := r.db.Query(ctx,
		`SELECT al.created_at, COALESCE(u.name,'System'), al.action, COALESCE(al.target_table,''), COALESCE(al.details,'{}')
		 FROM audit_log al
		 LEFT JOIN users u ON u.id = al.actor_id
		 WHERE ($1 = '' OR u.district = $1)
		 ORDER BY al.created_at DESC
		 LIMIT $2`, district, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("recent feed: %w", err)
	}
	defer rows.Close()

	var feed []dto.RecentActivityEntry
	for rows.Next() {
		var e dto.RecentActivityEntry
		var created time.Time
		var detailsRaw []byte
		rows.Scan(&created, &e.Actor, &e.Action, &e.Target, &detailsRaw)
		json.Unmarshal(detailsRaw, &e.Details)
		e.Timestamp = created.Format(time.RFC3339)
		feed = append(feed, e)
	}
	return feed, rows.Err()
}

// ListComplaintHistory returns audit events for a specific complaint scoped to district.
func (r *AuditRepo) ListComplaintHistory(ctx context.Context, district string, complaintID int64) ([]dto.ActivityEntry, error) {
	rows, err := r.db.Query(ctx,
		`SELECT al.id, COALESCE(al.actor_id,0), COALESCE(al.actor_role::text,''), al.action,
				COALESCE(al.target_table,''), COALESCE(al.target_id,0), COALESCE(al.details,'{}'), al.created_at
		 FROM audit_log al
		 LEFT JOIN users u ON u.id = al.actor_id
		 WHERE al.target_table = 'complaints' AND al.target_id = $1
		   AND ($2 = '' OR u.district = $2)
		 ORDER BY al.created_at DESC`, complaintID, district,
	)
	if err != nil {
		return nil, fmt.Errorf("complaint history: %w", err)
	}
	defer rows.Close()

	var entries []dto.ActivityEntry
	for rows.Next() {
		var e dto.ActivityEntry
		var detailsRaw []byte
		rows.Scan(&e.ID, &e.ActorID, &e.ActorRole, &e.Action, &e.TargetTable, &e.TargetID, &detailsRaw, &e.CreatedAt)
		json.Unmarshal(detailsRaw, &e.Details)
		entries = append(entries, e)
	}
	return entries, rows.Err()
}
