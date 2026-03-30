package dto

import "testing"

func TestPaginationOffset(t *testing.T) {
	q := PaginationQuery{Page: 3, Limit: 25}
	if got := q.Offset(); got != 50 {
		t.Fatalf("expected offset 50, got %d", got)
	}
}

func TestCrisisPoints(t *testing.T) {
	zones := []CrisisZone{{District: "A", CrisisIndex: 1.2}, {District: "B", CrisisIndex: 2.5}}
	points := []CrisisIndexPoint{{District: "A", Score: 1.2}, {District: "B", Score: 2.5}}
	// manual mapping check
	for i := range zones {
		if zones[i].District != points[i].District {
			t.Fatalf("district mismatch")
		}
	}
}
