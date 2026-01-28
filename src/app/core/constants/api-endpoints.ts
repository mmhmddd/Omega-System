import { environment } from "../../../environment/environment";

export const API_ENDPOINTS = {
  // ============================================
  // AUTHENTICATION ENDPOINTS
  // ============================================
  AUTH: {
    LOGIN: `${environment.apiUrl}/auth/login`,
    REGISTER: `${environment.apiUrl}/auth/register`,
    FORGET_PASSWORD: `${environment.apiUrl}/auth/forgot-password`,
    RESET_PASSWORD: `${environment.apiUrl}/auth/reset-password`,
    CHANGE_PASSWORD: `${environment.apiUrl}/auth/change-password`,
    ME: `${environment.apiUrl}/auth/me`,
    VERIFY_TOKEN: `${environment.apiUrl}/auth/verify-token`,
  },

  // ============================================
  // USERS MANAGEMENT ENDPOINTS
  // ============================================
  USERS: {
    GET_ALL: `${environment.apiUrl}/users`,
    GET_BY_ID: (id: string) => `${environment.apiUrl}/users/${id}`,
    CREATE: `${environment.apiUrl}/users`,
    UPDATE: (id: string) => `${environment.apiUrl}/users/${id}`,
    DELETE: (id: string) => `${environment.apiUrl}/users/${id}`,
    UPDATE_ROLE: (id: string) => `${environment.apiUrl}/users/${id}/role`,
    TOGGLE_ACTIVE: (id: string) => `${environment.apiUrl}/users/${id}/toggle-active`,
    CHECK_USERNAME: (username: string) => `${environment.apiUrl}/users/check/username/${username}`,
    UPDATE_USERNAME: (id: string) => `${environment.apiUrl}/users/${id}/username`,
    UPDATE_SYSTEM_ACCESS: (id: string) => `${environment.apiUrl}/users/${id}/system-access`,
    UPDATE_ROUTE_ACCESS: (id: string) => `${environment.apiUrl}/users/${id}/route-access`,
    GET_AVAILABLE_ROUTES: `${environment.apiUrl}/users/available-routes`
  },

  // ============================================
  // ITEMS MANAGEMENT ENDPOINTS
  // ============================================
  ITEMS: {
    GET_ALL: `${environment.apiUrl}/items`,
    GET_BY_ID: (id: string) => `${environment.apiUrl}/items/${id}`,
    CREATE: `${environment.apiUrl}/items`,
    UPDATE: (id: string) => `${environment.apiUrl}/items/${id}`,
    DELETE: (id: string) => `${environment.apiUrl}/items/${id}`,
    GET_SIMPLE: `${environment.apiUrl}/items/simple`
  },

  // ============================================
  // SUPPLIERS MANAGEMENT ENDPOINTS
  // ============================================
  SUPPLIERS: {
    GET_ALL: `${environment.apiUrl}/suppliers`,
    GET_BY_ID: (id: string) => `${environment.apiUrl}/suppliers/${id}`,
    CREATE: `${environment.apiUrl}/suppliers`,
    UPDATE: (id: string) => `${environment.apiUrl}/suppliers/${id}`,
    DELETE: (id: string) => `${environment.apiUrl}/suppliers/${id}`,
    UPDATE_STATUS: (id: string) => `${environment.apiUrl}/suppliers/${id}/status`,
    SEARCH: `${environment.apiUrl}/suppliers/search`,
    GET_STATISTICS: `${environment.apiUrl}/suppliers/statistics`,
    GET_BY_MATERIAL: (materialType: string) => `${environment.apiUrl}/suppliers/material/${materialType}`,
    BULK_IMPORT: `${environment.apiUrl}/suppliers/bulk-import`
  },

  // ============================================
  // PRICE QUOTES ENDPOINTS
  // ============================================
  PRICE_QUOTES: {
    GET_ALL: `${environment.apiUrl}/price-quotes`,
    GET_BY_ID: (id: string) => `${environment.apiUrl}/price-quotes/${id}`,
    CREATE: `${environment.apiUrl}/price-quotes`,
    UPDATE: (id: string) => `${environment.apiUrl}/price-quotes/${id}`,
    DELETE: (id: string) => `${environment.apiUrl}/price-quotes/${id}`,
    GET_MY_LATEST: `${environment.apiUrl}/price-quotes/my-latest`,
    DOWNLOAD_PDF: (id: string) => `${environment.apiUrl}/price-quotes/${id}/pdf`
  },

  // ============================================
  // MATERIAL REQUEST ENDPOINTS
  // ============================================
  MATERIAL_REQUESTS: {
    GET_ALL: `${environment.apiUrl}/materials`,
    GET_BY_ID: (id: string) => `${environment.apiUrl}/materials/${id}`,
    CREATE: `${environment.apiUrl}/materials`,
    UPDATE: (id: string) => `${environment.apiUrl}/materials/${id}`,
    DELETE: (id: string) => `${environment.apiUrl}/materials/${id}`,
    GET_STATS: `${environment.apiUrl}/materials/stats`,
    RESET_COUNTER: `${environment.apiUrl}/materials/reset-counter`,
    GENERATE_PDF: (id: string) => `${environment.apiUrl}/materials/${id}/generate-pdf`,
    DOWNLOAD_PDF: (id: string) => `${environment.apiUrl}/materials/${id}/download-pdf`
  },

  // ============================================
  // PURCHASE ORDERS ENDPOINTS
  // ============================================
  PURCHASES: {
    GET_ALL: `${environment.apiUrl}/purchases`,
    GET_BY_ID: (id: string) => `${environment.apiUrl}/purchases/${id}`,
    CREATE: `${environment.apiUrl}/purchases`,
    UPDATE: (id: string) => `${environment.apiUrl}/purchases/${id}`,
    DELETE: (id: string) => `${environment.apiUrl}/purchases/${id}`,
    GET_STATS: `${environment.apiUrl}/purchases/stats`,
    RESET_COUNTER: `${environment.apiUrl}/purchases/reset-counter`,
    GENERATE_PDF: (id: string) => `${environment.apiUrl}/purchases/${id}/generate-pdf`,
    DOWNLOAD_PDF: (id: string) => `${environment.apiUrl}/purchases/${id}/download-pdf`
  },

  // ============================================
  // RFQ (REQUEST FOR QUOTATION) ENDPOINTS
  // ============================================
  RFQ: {
    GET_ALL: `${environment.apiUrl}/rfqs`,
    GET_BY_ID: (id: string) => `${environment.apiUrl}/rfqs/${id}`,
    CREATE: `${environment.apiUrl}/rfqs`,
    UPDATE: (id: string) => `${environment.apiUrl}/rfqs/${id}`,
    DELETE: (id: string) => `${environment.apiUrl}/rfqs/${id}`,
    GET_STATS: `${environment.apiUrl}/rfqs/stats`,
    RESET_COUNTER: `${environment.apiUrl}/rfqs/reset-counter`,
    GENERATE_PDF: (id: string) => `${environment.apiUrl}/rfqs/${id}/generate-pdf`,
    DOWNLOAD_PDF: (id: string) => `${environment.apiUrl}/rfqs/${id}/download-pdf`
  },

  // ============================================
  // RECEIPTS ENDPOINTS
  // ============================================
  RECEIPTS: {
    GET_ALL: `${environment.apiUrl}/receipts`,
    GET_BY_ID: (id: string) => `${environment.apiUrl}/receipts/${id}`,
    GET_BY_NUMBER: (receiptNumber: string) => `${environment.apiUrl}/receipts/number/${receiptNumber}`,
    CREATE: `${environment.apiUrl}/receipts`,
    UPDATE: (id: string) => `${environment.apiUrl}/receipts/${id}`,
    DELETE: (id: string) => `${environment.apiUrl}/receipts/${id}`,
    GET_STATS: `${environment.apiUrl}/receipts/stats`,
    RESET_COUNTER: `${environment.apiUrl}/receipts/reset-counter`,
    GENERATE_PDF: (id: string) => `${environment.apiUrl}/receipts/${id}/generate-pdf`,
    DOWNLOAD_PDF: (id: string) => `${environment.apiUrl}/receipts/${id}/download-pdf`
  },

  // ============================================
  // SECRETARIAT USER FORMS ENDPOINTS
  // ============================================
  SECRETARIAT_USER: {
    CREATE_FORM: `${environment.apiUrl}/user-forms`,
    GET_MY_FORMS: `${environment.apiUrl}/user-forms/my-forms`,
    GET_ALL_FORMS: `${environment.apiUrl}/user-forms/all`,
    GET_FORM_BY_ID: (id: string) => `${environment.apiUrl}/user-forms/${id}`,
    DOWNLOAD_PDF: (id: string) => `${environment.apiUrl}/user-forms/${id}/pdf`,
    GET_NOTIFICATIONS: `${environment.apiUrl}/user-forms/notifications/all`,
    MARK_NOTIFICATION_READ: (id: string) => `${environment.apiUrl}/user-forms/notifications/${id}/read`,
    MARK_ALL_NOTIFICATIONS_READ: `${environment.apiUrl}/user-forms/notifications/mark-all-read`,
    GET_FORM_TYPES: `${environment.apiUrl}/user-forms/form-types/list`
  },

  // ============================================
  // SECRETARIAT MANAGEMENT ENDPOINTS
  // ============================================
  SECRETARIAT: {
    CREATE_FORM: `${environment.apiUrl}/secretariat/forms`,
    GET_ALL_FORMS: `${environment.apiUrl}/secretariat/forms`,
    GET_FORM_BY_ID: (id: string) => `${environment.apiUrl}/secretariat/forms/${id}`,
    UPDATE_FORM_STATUS: (id: string) => `${environment.apiUrl}/secretariat/forms/${id}/status`,
    DELETE_FORM: (id: string) => `${environment.apiUrl}/secretariat/forms/${id}`,
    DOWNLOAD_PDF: (id: string) => `${environment.apiUrl}/secretariat/forms/${id}/pdf`,
    GET_FORM_TYPES: `${environment.apiUrl}/secretariat/form-types`
  },

  // ============================================
  // SYSTEM MANAGEMENT ENDPOINTS
  // ============================================
  SYSTEM: {
    GET_STATS: `${environment.apiUrl}/system/stats`,
    REINDEX_USERS: `${environment.apiUrl}/system/reindex`,
    FULL_RESET: `${environment.apiUrl}/system/reset`,
    RESET_COUNTER: `${environment.apiUrl}/system/reset-counter`
  },

  // ============================================
  // CUTTING (LASER CUTTING MANAGEMENT) ENDPOINTS
  // ============================================
  CUTTING: {
    GET_ALL: `${environment.apiUrl}/cutting`,
    GET_BY_ID: (id: string) => `${environment.apiUrl}/cutting/${id}`,
    CREATE: `${environment.apiUrl}/cutting`,
    UPDATE: (id: string) => `${environment.apiUrl}/cutting/${id}`,
    DELETE: (id: string) => `${environment.apiUrl}/cutting/${id}`,
    GET_STATISTICS: `${environment.apiUrl}/cutting/statistics`,
    UPDATE_STATUS: (id: string) => `${environment.apiUrl}/cutting/${id}/status`,
    DOWNLOAD_FILE: (id: string) => `${environment.apiUrl}/cutting/download/${id}`,
    TRACK: (id: string) =>`${environment.apiUrl}/cutting/${id}/track`
  },

  // ============================================
  // FILE MANAGEMENT ENDPOINTS
  // ============================================
  FILE_MANAGEMENT: {
    GET_ALL: `${environment.apiUrl}/file-management`,
    GET_BY_ID: (id: string) => `${environment.apiUrl}/file-management/${id}`,
    GET_STATISTICS: `${environment.apiUrl}/file-management/statistics`,
    GET_TYPES: `${environment.apiUrl}/file-management/types`,
    DOWNLOAD: (id: string) => `${environment.apiUrl}/file-management/${id}/download`,
    PREVIEW: (id: string) => `${environment.apiUrl}/file-management/${id}/preview`,
    DELETE: (id: string) => `${environment.apiUrl}/file-management/${id}`,
    BULK_DELETE: `${environment.apiUrl}/file-management/bulk-delete`,
    EXPORT_LIST: `${environment.apiUrl}/file-management/export/list`
  }
};

// ============================================
// Helper function to build URLs with query parameters
// ============================================
export class ApiUrlBuilder {
  /**
   * Build URL with query parameters
   * @param baseUrl - Base URL
   * @param params - Query parameters object
   * @returns Complete URL with query string
   */
  static buildQueryUrl(baseUrl: string, params: Record<string, any>): string {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Build URL with pagination
   * @param baseUrl - Base URL
   * @param page - Page number
   * @param limit - Items per page
   * @returns Complete URL with pagination parameters
   */
  static buildPaginatedUrl(
    baseUrl: string,
    page: number = 1,
    limit: number = 10
  ): string {
    return this.buildQueryUrl(baseUrl, { page, limit });
  }

  /**
   * Build URL with search parameter
   * @param baseUrl - Base URL
   * @param search - Search query
   * @param page - Page number (optional)
   * @param limit - Items per page (optional)
   * @returns Complete URL with search and pagination parameters
   */
  static buildSearchUrl(
    baseUrl: string,
    search: string,
    page?: number,
    limit?: number
  ): string {
    const params: Record<string, any> = { search };
    if (page) params["page"] = page;
    if (limit) params["limit"] = limit;
    return this.buildQueryUrl(baseUrl, params);
  }
}

// ============================================
// Export for convenience
// ============================================
export default API_ENDPOINTS;
