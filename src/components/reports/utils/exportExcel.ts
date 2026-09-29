// @ts-nocheck
export async function exportToExcel(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return;
  // xlsx só baixa quando o usuário exporta (fica fora do bundle inicial)
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
