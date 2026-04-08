import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  AlertCircle,
  Loader,
} from "lucide-react";
import { useGroundwaterReadings } from "../hooks/useGroundwaterReadings";
import { listAllDistricts } from "../services/api/groundwater";

type SortField = "reading_date" | "well_id" | "depth_mbgl" | "rainfall_mm";

export function GroundwaterReadingsTable() {
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [sortField, setSortField] = useState<SortField>("reading_date");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  const {
    readings,
    loading,
    error,
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    setFilters,
    setPage,
    setPageSize,
    refetch,
  } = useGroundwaterReadings({
    district: selectedDistrict,
    start_date: dateRange.start,
    end_date: dateRange.end,
    sort_by: sortField,
    sort_order: sortOrder,
  });

  // Load districts on mount
  React.useEffect(() => {
    listAllDistricts().then(setDistricts);
  }, []);

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDistrict(e.target.value);
  };

  const handleDateChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "start" | "end"
  ) => {
    setDateRange((prev) => ({
      ...prev,
      [type]: e.target.value,
    }));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortField(field);
      setSortOrder("DESC");
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(parseInt(e.target.value));
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === "DESC" ? (
      <ChevronDown className="w-4 h-4 ml-1 inline" />
    ) : (
      <ChevronUp className="w-4 h-4 ml-1 inline" />
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Groundwater Readings</h1>
        <button
          onClick={refetch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader className="w-4 h-4 animate-spin" />}
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* District Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              District
            </label>
            <select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Districts</option>
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleDateChange(e, "start")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleDateChange(e, "end")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Page Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Items per Page
            </label>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Table */}
      {!loading && readings.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th
                    onClick={() => handleSort("well_id")}
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                  >
                    Well {renderSortIcon("well_id")}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    District
                  </th>
                  <th
                    onClick={() => handleSort("reading_date")}
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                  >
                    Date {renderSortIcon("reading_date")}
                  </th>
                  <th
                    onClick={() => handleSort("depth_mbgl")}
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                  >
                    Depth (m) {renderSortIcon("depth_mbgl")}
                  </th>
                  <th
                    onClick={() => handleSort("rainfall_mm")}
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                  >
                    Rainfall (mm) {renderSortIcon("rainfall_mm")}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Temperature (°C)
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Humidity (%)
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Season
                  </th>
                </tr>
              </thead>
              <tbody>
                {readings.map((reading, index) => (
                  <tr
                    key={reading.id}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {reading.well_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {reading.district}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(reading.reading_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {reading.depth_mbgl !== null
                        ? reading.depth_mbgl.toFixed(2)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {reading.rainfall_mm !== null
                        ? reading.rainfall_mm.toFixed(2)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {reading.temperature_avg !== null
                        ? reading.temperature_avg.toFixed(1)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {reading.humidity !== null ? reading.humidity.toFixed(1) : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          reading.season === "kharif"
                            ? "bg-green-100 text-green-800"
                            : reading.season === "rabi"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {reading.season}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span>{" "}
              to{" "}
              <span className="font-semibold">
                {Math.min(currentPage * pageSize, totalItems)}
              </span>{" "}
              of <span className="font-semibold">{totalItems}</span> records
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={currentPage === 1 || loading}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center px-4 text-sm font-medium text-gray-900">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={currentPage === totalPages || loading}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && readings.length === 0 && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-600">No groundwater readings found.</p>
        </div>
      )}
    </div>
  );
}
