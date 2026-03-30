package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/govn_user/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TankerRepo manages tanker routes.
type TankerRepo struct{ db *pgxpool.Pool }

// NewTankerRepo constructs repo.
func NewTankerRepo(db *pgxpool.Pool) *TankerRepo { return &TankerRepo{db: db} }

// ListByDistrict returns all tanker routes in a district.
func (r *TankerRepo) ListByDistrict(ctx context.Context, district string) ([]dto.TankerResponse, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, route_name, district, villages, COALESCE(schedule,''),
                COALESCE(capacity_liters,0), status::text,
                COALESCE(assigned_driver,''), COALESCE(contact_number,''), created_at
         FROM tanker_routes WHERE district = $1 ORDER BY created_at DESC`, district,
	)
	if err != nil {
		return nil, fmt.Errorf("list tankers: %w", err)
	}
	defer rows.Close()

	var tankers []dto.TankerResponse
	for rows.Next() {
		var t dto.TankerResponse
		var villagesRaw []byte
		rows.Scan(&t.ID, &t.RouteName, &t.District, &villagesRaw, &t.Schedule,
			&t.CapacityLiters, &t.Status, &t.AssignedDriver, &t.ContactNumber, &t.CreatedAt)
		json.Unmarshal(villagesRaw, &t.Villages)
		if t.Villages == nil {
			t.Villages = []string{}
		}
		tankers = append(tankers, t)
	}
	return tankers, rows.Err()
}

// Create inserts a new tanker route scoped to district.
func (r *TankerRepo) Create(ctx context.Context, district string, createdByID int64, req dto.CreateTankerRequest) (dto.TankerResponse, error) {
	villagesJSON, _ := json.Marshal(req.Villages)
	var t dto.TankerResponse
	var villagesRaw []byte
	err := r.db.QueryRow(ctx,
		`INSERT INTO tanker_routes (route_name, district, villages, schedule, capacity_liters, assigned_driver, contact_number, created_by_id)
         VALUES ($1, $2, $3, NULLIF($4,''), NULLIF($5::int, 0), NULLIF($6,''), NULLIF($7,''), $8)
         RETURNING id, route_name, district, villages, COALESCE(schedule,''),
                   COALESCE(capacity_liters,0), status::text,
                   COALESCE(assigned_driver,''), COALESCE(contact_number,''), created_at`,
		req.RouteName, district, villagesJSON, req.Schedule, req.CapacityLiters,
		req.AssignedDriver, req.ContactNumber, createdByID,
	).Scan(&t.ID, &t.RouteName, &t.District, &villagesRaw, &t.Schedule,
		&t.CapacityLiters, &t.Status, &t.AssignedDriver, &t.ContactNumber, &t.CreatedAt)
	if err != nil {
		return t, fmt.Errorf("create tanker: %w", err)
	}
	json.Unmarshal(villagesRaw, &t.Villages)
	if t.Villages == nil {
		t.Villages = []string{}
	}
	return t, nil
}

// CountActive returns number of active tanker routes in district.
func (r *TankerRepo) CountActive(ctx context.Context, district string) (int64, error) {
	var n int64
	r.db.QueryRow(ctx, `SELECT COUNT(*) FROM tanker_routes WHERE district = $1 AND status = 'active'`, district).Scan(&n)
	return n, nil
}

// Update modifies tanker route details.
func (r *TankerRepo) Update(ctx context.Context, id int64, req dto.UpdateTankerRequest) error {
	villagesJSON, _ := json.Marshal(req.Villages)
	_, err := r.db.Exec(ctx,
		`UPDATE tanker_routes
		 SET route_name = COALESCE(NULLIF($2,''), route_name),
			 villages = CASE WHEN $3::jsonb IS NULL THEN villages ELSE $3::jsonb END,
			 schedule = COALESCE(NULLIF($4,''), schedule),
			 capacity_liters = COALESCE(NULLIF($5,0), capacity_liters),
			 assigned_driver = COALESCE(NULLIF($6,''), assigned_driver),
			 contact_number = COALESCE(NULLIF($7,''), contact_number),
			 status = COALESCE(NULLIF($8,''), status),
			 updated_at = NOW()
		 WHERE id = $1`,
		id, req.RouteName, villagesJSON, req.Schedule, req.CapacityLiters, req.AssignedDriver, req.ContactNumber, req.Status,
	)
	if err != nil {
		return fmt.Errorf("update tanker: %w", err)
	}
	return nil
}
