import { useState, useEffect } from "react";
import {
  fetchGroundwaterReadings,
  GroundwaterReading,
  GroundwaterReadingFilters,
} from "../services/api/groundwater";

interface UseGroundwaterReadingsResult {
  readings: GroundwaterReading[];
  loading: boolean;
  error: string | null;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  filters: GroundwaterReadingFilters;
  setFilters: (filters: GroundwaterReadingFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refetch: () => Promise<void>;
}

export function useGroundwaterReadings(
  initialFilters: GroundwaterReadingFilters = {}
): UseGroundwaterReadingsResult {
  const [readings, setReadings] = useState<GroundwaterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<GroundwaterReadingFilters>({
    page: 1,
    limit: 20,
    sort_by: "reading_date",
    sort_order: "DESC",
    ...initialFilters,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchGroundwaterReadings(filters);
      setReadings(response.data);
      setTotalItems(response.meta.total_items);
      setTotalPages(response.meta.total_pages);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch groundwater readings";
      setError(errorMessage);
      setReadings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  return {
    readings,
    loading,
    error,
    totalItems,
    totalPages,
    currentPage: filters.page || 1,
    pageSize: filters.limit || 20,
    filters,
    setFilters: (newFilters) =>
      setFilters((prev) => ({ ...prev, ...newFilters, page: 1 })),
    setPage: (page) => setFilters((prev) => ({ ...prev, page })),
    setPageSize: (size) => setFilters((prev) => ({ ...prev, limit: size, page: 1 })),
    refetch: fetchData,
  };
}
