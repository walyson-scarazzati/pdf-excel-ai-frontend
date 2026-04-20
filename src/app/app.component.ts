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
        <p class="eyebrow">Java + Spring + Angular</p>
        <h1>Extrair dados de PDF para Excel sem perder a referencia visual</h1>
        <p class="intro">
          Faz upload de PDF ou imagem, compara o original com a leitura estruturada e descarrega um ficheiro Excel.
        </p>

        <label class="upload-box">
          <span>Escolher documento</span>
          <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/tiff" (change)="onFileSelected($event)" />
        </label>

        <div class="actions">
          <button type="button" (click)="preview()" [disabled]="!selectedFile() || loading()">Analisar documento</button>
          <button type="button" class="secondary" (click)="downloadExcel()" [disabled]="!selectedFile() || loading()">Exportar Excel</button>
        </div>

        <p class="status" *ngIf="selectedFile()">Ficheiro: {{ selectedFile()?.name }}</p>
        <p class="status" *ngIf="loading()">A processar o documento...</p>
        <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>
      </section>

      <section class="results-grid" *ngIf="result() as currentResult">
        <article class="panel summary-panel wide">
          <div>
            <p class="panel-kicker">Resumo da extracao</p>
            <h2>Comparacao entre original e resultado</h2>
          </div>

          <div class="summary-metrics">
            <div class="metric-card">
              <span>Ficheiro</span>
              <strong>{{ currentResult.fileName }}</strong>
            </div>
            <div class="metric-card">
              <span>Paginas</span>
              <strong>{{ currentResult.pageCount }}</strong>
            </div>
            <div class="metric-card">
              <span>Linhas extraidas</span>
              <strong>{{ currentResult.totalRows }}</strong>
            </div>
            <div class="metric-card">
              <span>Modo</span>
              <strong>{{ currentResult.extractionMode }}</strong>
            </div>
            <div class="metric-card">
              <span>IA ativa</span>
              <strong>{{ currentResult.aiUsed ? 'Sim' : 'Nao' }}</strong>
            </div>
            <div class="metric-card">
              <span>OCR usado</span>
              <strong>{{ currentResult.ocrUsed ? 'Sim' : 'Nao' }}</strong>
            </div>
            <div class="metric-card">
              <span>Paginas renderizadas</span>
              <strong>{{ currentResult.pageImages.length }}</strong>
            </div>
          </div>
        </article>

        <article class="panel original-panel">
          <div class="panel-header">
            <div>
              <p class="panel-kicker">Original</p>
              <h2>Original renderizado</h2>
            </div>
            <p class="panel-note">As primeiras paginas ou a imagem enviada sao renderizadas para facilitar a comparacao visual.</p>
          </div>

          <div class="page-gallery" *ngIf="currentResult.pageImages.length; else noPreviewPages">
            <figure class="page-frame" *ngFor="let pageImage of currentResult.pageImages; index as pageIndex">
              <figcaption>Pagina {{ pageIndex + 1 }}</figcaption>
              <img [src]="pageImage" [alt]="'Pagina ' + (pageIndex + 1) + ' do documento original'" />
            </figure>
          </div>

          <ng-template #noPreviewPages>
            <p class="empty-state">Nao foi possivel gerar a vista previa visual do documento.</p>
          </ng-template>
        </article>

        <article class="panel text-panel">
          <div class="panel-header">
            <div>
              <p class="panel-kicker">Leitura bruta</p>
              <h2>Texto lido do PDF</h2>
            </div>
            <p class="panel-note">Este bloco ajuda a identificar quebras, perdas de contexto, falhas de OCR e ruido na extração.</p>
          </div>

          <pre>{{ currentResult.previewText }}</pre>
        </article>

        <article class="panel wide data-panel">
          <div class="panel-header">
            <div>
              <p class="panel-kicker">Resultado estruturado</p>
              <h2>Linhas preparadas para Excel</h2>
            </div>
            <p class="panel-note">Se a leitura visual e a tabela divergirem, o problema esta na extração, no OCR ou no mapeamento para Excel.</p>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Referencia</th>
                  <th>Descricao</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of currentResult.rows; index as rowIndex">
                  <td class="row-index">{{ rowIndex + 1 }}</td>
                  <td>{{ row.reference }}</td>
                  <td>{{ row.description }}</td>
                  <td>{{ row.amount }}</td>
                  <td>{{ row.date }}</td>
                  <td>{{ row.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
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
        this.errorMessage.set('Falha ao analisar o documento. Confirma se o backend esta a correr e se o OCR local esta instalado quando precisares dele.');
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
        anchor.download = 'dados-extraidos.xlsx';
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
}