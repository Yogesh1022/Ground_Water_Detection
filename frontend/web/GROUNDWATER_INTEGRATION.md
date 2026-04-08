/**
 * GROUNDWATER READINGS FRONTEND INTEGRATION GUIDE
 * 
 * This document outlines how to integrate the Groundwater Readings component
 * into your React application.
 * 
 * ## Files Created:
 * 
 * 1. src/services/api/groundwater.ts
 *    - API service for fetching groundwater readings
 *    - Defines TypeScript interfaces for type safety
 *    - Handles filter parameters
 * 
 * 2. src/hooks/useGroundwaterReadings.ts
 *    - Custom React hook for managing groundwater readings state
 *    - Handles loading, error, and pagination state
 *    - Provides methods for updating filters and pagination
 * 
 * 3. src/components/feedback/GroundwaterReadingsTable.tsx
 *    - Main table component with full functionality
 *    - Features:
 *      ✓ Paginated display (10, 20, 50, 100 items per page)
 *      ✓ District filtering
 *      ✓ Date range filtering
 *      ✓ Sorting by multiple fields (click column headers)
 *      ✓ Real-time loading states
 *      ✓ Error handling
 *      ✓ Responsive design with Tailwind CSS
 *      ✓ Icons from lucide-react
 * 
 * 4. src/pages/GroundwaterReadingsPage.tsx
 *    - Page wrapper for the table component
 * 
 * ## Integration Steps:
 * 
 * ### Step 1: Add Route
 * 
 * In your main App.tsx or Router configuration, add this route:
 * 
 * ```typescript
 * import GroundwaterReadingsPage from "./pages/GroundwaterReadingsPage";
 * 
 * // Inside your Routes component:
 * <Route path="/groundwater-readings" element={<GroundwaterReadingsPage />} />
 * ```
 * 
 * ### Step 2: Add Navigation Link
 * 
 * Add a link in your navigation menu:
 * 
 * ```typescript
 * import { Link } from "react-router-dom";
 * 
 * <Link to="/groundwater-readings" className="nav-link">
 *   Groundwater Data
 * </Link>
 * ```
 * 
 * ### Step 3: Verify API Connection
 * 
 * Check that VITE_API_BASE_URL is correctly set in your .env file:
 * 
 * ```
 * VITE_API_BASE_URL=http://localhost:8080/api/v1/common-user
 * ```
 * 
 * For production, update accordingly:
 * 
 * ```
 * VITE_API_BASE_URL=https://api.yourdomain.com/api/v1/common-user
 * ```
 * 
 * ### Step 4: Start Frontend Dev Server
 * 
 * ```bash
 * cd frontend/web
 * npm run dev
 * ```
 * 
 * ## Usage Examples:
 * 
 * ### Basic Usage - Display Table
 * 
 * ```typescript
 * import { GroundwaterReadingsTable } from "../components/feedback/GroundwaterReadingsTable";
 * 
 * function MyPage() {
 *   return <GroundwaterReadingsTable />;
 * }
 * ```
 * 
 * ### Advanced Usage - Custom Hook
 * 
 * ```typescript
 * import { useGroundwaterReadings } from "../hooks/useGroundwaterReadings";
 * 
 * function CustomComponent() {
 *   const {
 *     readings,
 *     loading,
 *     error,
 *     totalItems,
 *     setFilters,
 *     setPage,
 *   } = useGroundwaterReadings({
 *     district: "Amravati",
 *     limit: 50,
 *   });
 * 
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 * 
 *   return (
 *     <div>
 *       <h1>Found {totalItems} readings</h1>
 *       <ul>
 *         {readings.map(reading => (
 *           <li key={reading.id}>{reading.well_name}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 * 
 * ### Using API Service Directly
 * 
 * ```typescript
 * import { fetchGroundwaterReadings } from "../services/api/groundwater";
 * 
 * async function loadData() {
 *   try {
 *     const response = await fetchGroundwaterReadings({
 *       district: "Akola",
 *       page: 1,
 *       limit: 20,
 *       sort_by: "depth_mbgl",
 *       sort_order: "ASC",
 *     });
 *     console.log(response.data);
 *   } catch (error) {
 *     console.error(error);
 *   }
 * }
 * ```
 * 
 * ## Features Explanation:
 * 
 * ### Pagination
 * - Default page size: 20 items
 * - Max page size: 100 items
 * - Navigation buttons: First, Previous, Next, Last
 * - Displays current page and total pages
 * 
 * ### Filtering
 * - **District**: Select from 11 Vidarbha districts
 * - **Start Date**: Filter readings from a specific date
 * - **End Date**: Filter readings until a specific date
 * - **Items per Page**: Choose 10, 20, 50, or 100 items
 * 
 * ### Sorting
 * - Click column headers to sort:
 *   - Well ID
 *   - Reading Date (default)
 *   - Depth (m)
 *   - Rainfall (mm)
 * - Click again to toggle between ascending/descending
 * - Visual indicators (↑↓) show active sort
 * 
 * ### Caching
 * - Results are cached for 5 minutes on the backend
 * - Cache headers show HIT/MISS status
 * - Manual refresh button available
 * 
 * ## Data Fields Displayed:
 * 
 * | Field | Type | Description |
 * |-------|------|-------------|
 * | Well | string | Well identifier (VID_AKO_0001, etc) |
 * | District | string | District name |
 * | Date | date | Reading date |
 * | Depth (m) | number | Water depth in metres below ground |
 * | Rainfall (mm) | number | Monthly rainfall |
 * | Temperature (°C) | number | Average temperature |
 * | Humidity (%) | number | Relative humidity |
 * | Season | badge | Season (kharif/rabi/summer) |
 * 
 * ## Styling:
 * 
 * - All components use Tailwind CSS
 * - Responsive design (mobile, tablet, desktop)
 * - Color scheme:
 *   - Primary: Blue (actions, highlights)
 *   - Seasonal badges: Green (kharif), Blue (rabi), Yellow (summer)
 *   - Errors: Red
 * 
 * ## Environment Variables:
 * 
 * Create a `.env` file in `frontend/web/`:
 * 
 * ```
 * VITE_API_BASE_URL=http://localhost:8080/api/v1/common-user
 * VITE_API_CLIENT=fetch
 * ```
 * 
 * Options for VITE_API_CLIENT: "fetch" (default) or "axios"
 * 
 * ## Testing:
 * 
 * 1. Verify backend is running: `http://localhost:8080/api/v1/common-user/groundwater-readings`
 * 2. Navigate to the groundwater readings page
 * 3. Test filters:
 *    - Select a district
 *    - Pick a date range
 *    - Change page size
 *    - Click sort headers
 * 4. Verify data loads and displays correctly
 * 5. Check browser DevTools Network tab for API calls
 * 
 * ## Troubleshooting:
 * 
 * **Issue: "failed to list groundwater readings"**
 * - Check backend is running on port 8080
 * - Verify VITE_API_BASE_URL is correct
 * - Check browser console for CORS errors
 * 
 * **Issue: No districts in filter dropdown**
 * - The districts list is hardcoded in the hook
 * - To make it dynamic, create a `/districts` API endpoint
 * 
 * **Issue: Filters not working**
 * - Clear browser cache and localStorage
 * - Check that start_date/end_date format is YYYY-MM-DD
 * - Verify backend accepts the filter parameters
 * 
 * **Issue: Slow pagination**
 * - Reduce page size (default 20 is recommended)
 * - Add date range filters to narrow results
 * - Check backend database indexes on well_id and reading_date
 * 
 * ## Performance Tips:
 * 
 * 1. Use date filters for large date ranges
 * 2. Keep page size to 20-50 items
 * 3. Backend caches results for 5 minutes
 * 4. Consider implementing infinite scroll for better UX
 * 5. Memoize table rows to prevent unnecessary re-renders
 * 
 * ## Future Enhancements:
 * 
 * - [ ] Export to CSV feature
 * - [ ] Advanced charting/visualization
 * - [ ] Well detail modal
 * - [ ] Infinite scroll pagination
 * - [ ] Saved filters/favorites
 * - [ ] Real-time data updates via WebSocket
 * - [ ] Download historical data
 * - [ ] Risk level indicator badges
 * 
 * ## Support:
 * 
 * For issues or questions:
 * 1. Check API endpoint: GET /api/v1/common-user/groundwater-readings
 * 2. Review backend logs for errors
 * 3. Verify database connection: 650 wells, 83,850 readings
 */
