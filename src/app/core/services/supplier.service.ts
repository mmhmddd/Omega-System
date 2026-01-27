// src/app/core/services/supplier.service.ts - FIXED

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environment/environment';

/**
 * Supplier Interface
 */
export interface Supplier {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Supplier Response Interface
 */
export interface SupplierResponse {
  success: boolean;
  data: Supplier[];
}

/**
 * Supplier Service
 */
@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private apiUrl = `${environment.apiUrl}/suppliers`;

  constructor(private http: HttpClient) {}

  /**
   * Get all suppliers with error handling
   */
  getAllSuppliers(): Observable<SupplierResponse> {
    return this.http.get<SupplierResponse>(this.apiUrl).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error loading suppliers:', error);
        
        // Return empty array instead of throwing error
        // This allows the form to work even if suppliers API fails
        return of({
          success: false,
          data: []
        });
      })
    );
  }

  /**
   * Get supplier by ID
   */
  getSupplierById(id: string): Observable<{ success: boolean; data: Supplier }> {
    return this.http.get<{ success: boolean; data: Supplier }>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error loading supplier:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Search suppliers by name
   */
  searchSuppliers(searchTerm: string): Observable<SupplierResponse> {
    return this.http.get<SupplierResponse>(`${this.apiUrl}?search=${searchTerm}`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error searching suppliers:', error);
        return of({
          success: false,
          data: []
        });
      })
    );
  }
}