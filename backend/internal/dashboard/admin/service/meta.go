package service

import "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/admin/dto"

func buildPagedMeta(page, limit int, totalItems int64) dto.PagedMeta {
	totalPages := 0
	if totalItems > 0 {
		totalPages = int((totalItems + int64(limit) - 1) / int64(limit))
	}

	return dto.PagedMeta{
		Page:       page,
		Limit:      limit,
		TotalItems: totalItems,
		TotalPages: totalPages,
	}
}
