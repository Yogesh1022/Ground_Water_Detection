package service

import "github.com/Yogesh1022/Ground_Water_Detection/backend/internal/dashboard/common_user/dto"

type ProfileService struct{}

func NewProfileService() *ProfileService { return &ProfileService{} }

func (s *ProfileService) PublicProfile() dto.ProfileResponse {
	return dto.ProfileResponse{
		ID:    0,
		Name:  "Public User",
		Role:  "citizen",
		Email: "",
	}
}
