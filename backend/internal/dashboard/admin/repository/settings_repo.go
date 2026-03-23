package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SettingsRepo struct{ db *pgxpool.Pool }

func NewSettingsRepo(db *pgxpool.Pool) *SettingsRepo { return &SettingsRepo{db: db} }

func (r *SettingsRepo) GetAll(ctx context.Context) ([]dto.SettingResponse, error) {
	rows, err := r.db.Query(
		ctx,
		`SELECT key, value, COALESCE(description,''), updated_at
		 FROM system_settings
		 ORDER BY key`,
	)
	if err != nil {
		return nil, fmt.Errorf("get settings: %w", err)
	}
	defer rows.Close()

	settings := make([]dto.SettingResponse, 0)
	for rows.Next() {
		var s dto.SettingResponse
		var raw []byte
		if err := rows.Scan(&s.Key, &raw, &s.Description, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan setting row: %w", err)
		}

		var decoded interface{}
		if len(raw) > 0 {
			if err := json.Unmarshal(raw, &decoded); err != nil {
				return nil, fmt.Errorf("decode setting value: %w", err)
			}
		}
		s.Value = decoded
		settings = append(settings, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate settings rows: %w", err)
	}

	return settings, nil
}

func (r *SettingsRepo) Upsert(ctx context.Context, key string, value interface{}, updaterID int64) error {
	encoded, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("encode setting value: %w", err)
	}

	_, err = r.db.Exec(
		ctx,
		`INSERT INTO system_settings (key, value, updated_by_id)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (key) DO UPDATE SET
		   value = EXCLUDED.value,
		   updated_by_id = EXCLUDED.updated_by_id,
		   updated_at = NOW()`,
		key,
		encoded,
		updaterID,
	)
	if err != nil {
		return fmt.Errorf("upsert setting: %w", err)
	}

	return nil
}

func (r *SettingsRepo) UpsertBatch(ctx context.Context, settings map[string]interface{}, updaterID int64) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin settings tx: %w", err)
	}

	defer func() {
		_ = tx.Rollback(ctx)
	}()

	for key, value := range settings {
		encoded, err := json.Marshal(value)
		if err != nil {
			return fmt.Errorf("encode setting value for key %q: %w", key, err)
		}

		_, err = tx.Exec(
			ctx,
			`INSERT INTO system_settings (key, value, updated_by_id)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (key) DO UPDATE SET
			   value = EXCLUDED.value,
			   updated_by_id = EXCLUDED.updated_by_id,
			   updated_at = NOW()`,
			key,
			encoded,
			updaterID,
		)
		if err != nil {
			return fmt.Errorf("upsert setting key %q: %w", key, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit settings tx: %w", err)
	}

	return nil
}
