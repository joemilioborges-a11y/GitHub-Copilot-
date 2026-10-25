import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, DailyMetric, AdminPlatformWithdrawalRecord, AdminPixTransferRecord } from '../types';

interface PdfExportData {
  transactions: Transaction[];
  dailyMetrics: DailyMetric[];
  adminWithdrawals: AdminPlatformWithdrawalRecord[];
  creatorTransfers: AdminPixTransferRecord[];
  totalRevenueBrl: number;
  totalPlatformProfitBrl: number;
  adminAvailableProfit: number;
  totalGlobalRegistered: number;
  monitoredCreatorsPayoutBrl: number;
}

export const exportAdminReportPdf = ({
  transactions,
  dailyMetrics,
  adminWithdrawals,
  creatorTransfers,
  totalRevenueBrl,
  totalPlatformProfitBrl,
  adminAvailableProfit,
  totalGlobalRegistered,
  monitoredCreatorsPayoutBrl,
}: PdfExportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const nowFormatted = new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });

  // Page width is 210mm, margins 14mm
  const marginX = 14;

  // 1. Header Banner
  doc.setFillColor(15, 15, 26); // #0f0f1a
  doc.rect(0, 0, 210, 32, 'F');

  // Accent gradient line
  doc.setFillColor(245, 158, 11); // Amber 500
  doc.rect(0, 31, 210, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('JHOBS 18+ • RELATÓRIO FINANCEIRO & MÉTRICAS', marginX, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(
    `Auditoria Oficial Contábil & Operacional • Jhobs VIP Intermediações Ltda (CNPJ: 48.912.304/0001-89)`,
    marginX,
    20
  );
  doc.text(`Gerado pelo Administrador Master em: ${nowFormatted} • Sistema Bacen SPI`, marginX, 26);

  // 2. Summary KPI Cards
  let currentY = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. RESUMO EXECUTIVO DA PLATAFORMA', marginX, currentY);

  currentY += 4;

  const kpis = [
    { label: 'Receita Bruta Total', value: `R$ ${totalRevenueBrl.toFixed(2).replace('.', ',')}` },
    { label: 'Lucro Líquido (30%)', value: `R$ ${totalPlatformProfitBrl.toFixed(2).replace('.', ',')}` },
    { label: 'Saldo Disponível', value: `R$ ${adminAvailableProfit.toFixed(2).replace('.', ',')}` },
    { label: 'Usuários Cadastrados', value: totalGlobalRegistered.toLocaleString('pt-BR') },
  ];

  const cardWidth = 43;
  const cardHeight = 16;
  const cardGap = 3;

  kpis.forEach((kpi, idx) => {
    const xPos = marginX + idx * (cardWidth + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(xPos, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, xPos + 3, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, xPos + 3, currentY + 12);
  });

  currentY += cardHeight + 8;

  // 3. Daily Metrics Table (Last 7 Days)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('2. MÉTRICAS DIÁRIAS DE PERFORMANCE (ÚLTIMOS 7 DIAS)', marginX, currentY);
  currentY += 2;

  const dailyTableRows = dailyMetrics.map((m) => [
    `${m.dayLabel} (${m.date})`,
    m.activeUsers.toLocaleString('pt-BR'),
    m.pageViews.toLocaleString('pt-BR'),
    `R$ ${m.revenueBrl.toFixed(2).replace('.', ',')}`,
    `${m.creditsSold.toLocaleString('pt-BR')} 💎`,
    `${m.avgCreditsSpent || 28} 💎/usr`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Dia / Data', 'DAU (Ativos)', 'Visualizações', 'Receita Diária', 'Créditos Vendidos', 'Média Gasto/User']],
    body: dailyTableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [16, 185, 129], // Emerald 500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: marginX, right: marginX },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 4. Histórico de Saques e Contas Transferidas (Destino Exato)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('3. HISTÓRICO DE SAQUES E CONTAS TRANSFERIDAS (PIX / TED)', marginX, currentY);
  currentY += 2;

  const withdrawalRows: string[][] = [];

  // Add admin withdrawals
  adminWithdrawals.forEach((w) => {
    withdrawalRows.push([
      w.id,
      w.adminName || 'Admin Jhobs',
      w.bankName.split(' ')[0],
      w.accountHolder || 'Jhobs Participações',
      w.pixKey || w.cpfCnpjMasked || 'Ag 0001 / CC 892019-3',
      w.paymentMethod.toUpperCase(),
      `R$ ${w.amountBrl.toFixed(2).replace('.', ',')}`,
      w.timestamp,
      'LIQUIDADO',
    ]);
  });

  // Add creator transfers
  creatorTransfers.forEach((c) => {
    withdrawalRows.push([
      c.id,
      c.userName,
      c.bankName.split(' ')[0],
      c.accountHolder || c.userName,
      `${c.pixKey} (${c.pixKeyType.toUpperCase()})`,
      'PIX',
      `R$ ${c.amountBrl.toFixed(2).replace('.', ',')}`,
      c.timestamp,
      'LIQUIDADO',
    ]);
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Protocolo', 'Titular / Destinatário', 'Banco', 'Nome na Conta', 'Conta / Chave Transferida', 'Modal.', 'Valor (R$)', 'Data / Hora', 'Status']],
    body: withdrawalRows.slice(0, 10), // Limit to top 10 on page 1/2
    theme: 'grid',
    headStyles: {
      fillColor: [245, 158, 11], // Amber 500
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [30, 41, 59],
    },
    margin: { left: marginX, right: marginX },
  });

  // Check if we need page 2 for transactions
  doc.addPage();

  // Page 2 Header
  doc.setFillColor(15, 15, 26);
  doc.rect(0, 0, 210, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('JHOBS 18+ • HISTÓRICO GERAL DE TRANSAÇÕES AUDITADAS', marginX, 13);

  currentY = 28;

  // 5. Transactions Table
  const transactionRows = transactions.slice(0, 25).map((t) => [
    t.id,
    t.userName || 'Membro VIP',
    t.description || t.type,
    t.type.toUpperCase(),
    t.amountBrl !== undefined ? `R$ ${t.amountBrl.toFixed(2).replace('.', ',')}` : 'R$ 0,00',
    `${t.amountCredits} 💎`,
    t.timestamp ? new Date(t.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Recente',
    (t.status || 'concluído').toUpperCase(),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['ID Transação', 'Usuário', 'Descrição / Pacote', 'Tipo', 'Valor (R$)', 'Créditos', 'Data / Hora', 'Status']],
    body: transactionRows,
    theme: 'striped',
    headStyles: {
      fillColor: [99, 102, 241], // Indigo 500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
    },
    margin: { left: marginX, right: marginX },
  });

  // Page numbering and footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      `Jhobs 18+ VIP Intermediações • Documento confidencial • Página ${i} de ${pageCount}`,
      marginX,
      290
    );
    doc.text('Conformidade BACEN SPI / Banco Central do Brasil', 210 - marginX - 60, 290);
  }

  // Trigger download
  const fileName = `Relatorio_Financeiro_Jhobs_18_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
};
