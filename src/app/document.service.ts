import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ExtractedRow {
  reference: string;
  description: string;
  amount: string;
  date: string;
  notes: string;
}

export interface ExtractionResult {
  fileName: string;
  pageCount: number;
  totalRows: number;
  rows: ExtractedRow[];
  pageImages: string[];
  aiUsed: boolean;
  ocrUsed: boolean;
  extractionMode: string;
  previewText: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly baseUrl = `${this.resolveApiBaseUrl()}/documents`;

  constructor(private readonly http: HttpClient) {}

  private resolveApiBaseUrl(): string {
    const runtimeConfig = (window as Window & {
      __APP_CONFIG__?: { apiBaseUrl?: string };
    }).__APP_CONFIG__;

    return runtimeConfig?.apiBaseUrl?.replace(/\/$/, '') || 'http://localhost:8081/api';
  }

  preview(file: File): Observable<ExtractionResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ExtractionResult>(`${this.baseUrl}/preview`, formData);
  }

  export(file: File): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/export`, formData, {
      responseType: 'blob'
    });
  }
}