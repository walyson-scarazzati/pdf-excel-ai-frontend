import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { DocumentService, ExtractionResult } from './document.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="page-shell">
      <section class="hero-card">
        <p class="eyebrow">Extrator de Extratos Bancários</p>
        <h1>Converter PDF e CSV de Extrato Bancário para Excel</h1>
        <p class="intro">
          Faça upload de um PDF de extrato bancário ou arquivo CSV e exporte para Excel formatado.
        </p>

        <label class="upload-box">
          <span>Escolher documento (PDF ou CSV)</span>
          <input type="file" accept="application/pdf,.csv,text/csv" (change)="onFileSelected($event)" />
        </label>

        <div class="actions">
          <button type="button" (click)="preview()" [disabled]="!selectedFile() || loading()">Analisar documento</button>
          <button type="button" class="secondary" (click)="downloadExcel()" [disabled]="!selectedFile() || loading()">Exportar Excel</button>
        </div>

        <p class="status" *ngIf="selectedFile()">Arquivo: {{ selectedFile()?.name }}</p>
        <p class="status" *ngIf="loading()">Processando documento...</p>
        <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>
      </section>

      <section class="data-section" *ngIf="result() as currentResult">
        <div class="info-bar" *ngIf="currentResult.accountInfo || currentResult.extractPeriod">
          <div class="info-item" *ngIf="currentResult.accountInfo">
            <span>{{ currentResult.accountInfo }}</span>
          </div>
          <div class="info-item" *ngIf="currentResult.extractPeriod">
            <span>Período: {{ currentResult.extractPeriod }}</span>
          </div>
        </div>

        <div class="totals-bar">
          <div class="total-item">
            <span>Lançamentos</span>
            <strong>{{ currentResult.totalRows }}</strong>
          </div>
          <div class="total-item total-credit">
            <span>Total Créditos</span>
            <strong>{{ totalCredit() }}</strong>
          </div>
          <div class="total-item total-debit">
            <span>Total Débitos</span>
            <strong>{{ totalDebit() }}</strong>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Débito</th>
                <th>Crédito</th>
                <th>Cód. Histórico</th>
                <th>Complemento</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of currentResult.rows; index as rowIndex"
                  [class.row-debit]="row.debit"
                  [class.row-credit]="row.credit && !row.debit">
                <td class="row-index">{{ rowIndex + 1 }}</td>
                <td class="col-date">{{ row.date }}</td>
                <td class="col-value">{{ row.value }}</td>
                <td class="col-debit">{{ row.debit }}</td>
                <td class="col-credit">{{ row.credit }}</td>
                <td class="col-history-code">{{ row.historyCode }}</td>
                <td class="col-complement">{{ row.complement }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent {
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly result = signal<ExtractionResult | null>(null);

  constructor(private readonly documentService: DocumentService) {}

  protected totalCredit(): string {
    const rows = this.result()?.rows ?? [];
    const total = rows
      .map((row) => this.parseAmount(row.credit))
      .reduce((sum, amount) => sum + amount, 0);

    return this.formatCurrency(total);
  }

  protected totalDebit(): string {
    const rows = this.result()?.rows ?? [];
    const total = rows
      .map((row) => this.parseAmount(row.debit))
      .reduce((sum, amount) => sum + amount, 0);

    return this.formatCurrency(total);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    this.selectedFile.set(file);
    this.result.set(null);
    this.errorMessage.set('');
  }

  protected preview(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.documentService.preview(file).subscribe({
      next: (response) => {
        this.result.set(response);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Falha ao analisar o documento. Verifique se o backend está rodando.');
        this.loading.set(false);
      }
    });
  }

  protected downloadExcel(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.documentService.export(file).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'extrato-bancario.xlsx';
        anchor.click();
        window.URL.revokeObjectURL(url);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Falha ao gerar o Excel.');
        this.loading.set(false);
      }
    });
  }

  private parseAmount(amount: string): number {
    if (!amount) {
      return 0;
    }

    const normalizedAmount = amount.replace(/[^\d,.-]/g, '');
    if (!normalizedAmount) {
      return 0;
    }

    const lastComma = normalizedAmount.lastIndexOf(',');
    const lastDot = normalizedAmount.lastIndexOf('.');
    let canonicalAmount = normalizedAmount;

    if (lastComma > lastDot) {
      // Formato brasileiro: 1.234,56
      canonicalAmount = normalizedAmount.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma && (normalizedAmount.match(/\./g)?.length ?? 0) > 1) {
      // Múltiplos pontos = separador de milhares
      canonicalAmount = normalizedAmount.replace(/\./g, '');
    } else {
      // Formato US ou sem separador de milhares
      canonicalAmount = normalizedAmount.replace(/,/g, '');
    }

    const parsed = Number(canonicalAmount);
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
  }

  private formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}