"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Loader2, FileSpreadsheet, AlertCircle, Plus, Save, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ExcelViewerProps {
  fileUrl: string;
  noteId: string;
}

interface SheetData {
  name: string;
  rows: unknown[][];
}

export function ExcelViewer({ fileUrl, noteId }: ExcelViewerProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // States for editing
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editedSheets, setEditedSheets] = useState<SheetData[]>([]);

  useEffect(() => {
    async function loadExcel() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error("Não foi possível carregar o arquivo da planilha.");
        }

        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });

        const parsedSheets: SheetData[] = workbook.SheetNames.map((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          // Converte a aba em uma matriz bidimensional (linhas e colunas)
          const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
          return {
            name: sheetName,
            rows,
          };
        });

        setSheets(parsedSheets);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao processar planilha client-side:", err);
        setError(err instanceof Error ? err.message : "Erro ao carregar os dados da planilha.");
        setLoading(false);
      }
    }

    loadExcel();
  }, [fileUrl]);

  const handleStartEdit = () => {
    // Deep copy sheets to editedSheets
    const copy = sheets.map((s) => ({
      name: s.name,
      rows: s.rows.map((r) => (r ? [...r] : [])),
    }));
    setEditedSheets(copy);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedSheets([]);
  };

  const handleCellChange = (sheetIndex: number, rowIndex: number, colIndex: number, val: string) => {
    setEditedSheets((prev) => {
      return prev.map((sheet, sIdx) => {
        if (sIdx !== sheetIndex) return sheet;
        const updatedRows = [...sheet.rows];
        const row = [...(updatedRows[rowIndex] || [])];

        // Pad row elements if colIndex is beyond its current length
        while (row.length <= colIndex) {
          row.push("");
        }

        row[colIndex] = val;
        updatedRows[rowIndex] = row;
        return {
          ...sheet,
          rows: updatedRows,
        };
      });
    });
  };

  const handleAddNewRow = () => {
    setEditedSheets((prev) => {
      return prev.map((sheet, sIdx) => {
        if (sIdx !== activeSheetIndex) return sheet;
        return {
          ...sheet,
          rows: [...sheet.rows, []],
        };
      });
    });
  };

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);

      // 1. Criar novo workbook via SheetJS
      const wb = XLSX.utils.book_new();
      editedSheets.forEach((sheet) => {
        const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });

      // 2. Escrever o workbook em formato binário XLSX
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const fileBlob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Obter o nome do arquivo original da URL ou usar um padrão
      let fileName = "planilha.xlsx";
      try {
        const decodedUrl = decodeURIComponent(fileUrl);
        const urlParts = decodedUrl.split("/");
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart && lastPart.includes(".")) {
          fileName = lastPart;
        }
      } catch (e) {
        console.warn("Não foi possível inferir o nome original do arquivo:", e);
      }

      const file = new File([fileBlob], fileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // 3. Enviar o arquivo para a API /api/notes/update-excel via FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("noteId", noteId);

      const toastId = toast.loading("Salvando alterações...");
      const response = await fetch("/api/notes/update-excel", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar alterações no servidor.");
      }

      toast.success("Planilha atualizada com sucesso!", { id: toastId });

      // 4. Atualizar o estado local com os novos dados
      setSheets(editedSheets);
      setIsEditing(false);
    } catch (err) {
      console.error("Erro ao salvar planilha:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 border border-border/40 rounded-2xl bg-muted/5 h-[60vh]">
        <Loader2 className="size-8 text-primary animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Carregando planilha e preparando dados...</p>
      </div>
    );
  }

  if (error || sheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-destructive/30 rounded-2xl bg-destructive/5 max-w-lg mx-auto">
        <AlertCircle className="size-10 text-destructive mb-3" />
        <h3 className="text-base font-bold text-foreground">Erro ao carregar planilha</h3>
        <p className="text-sm text-muted-foreground mt-1">{error || "Nenhum dado encontrado na planilha."}</p>
      </div>
    );
  }

  const activeSheet = isEditing ? editedSheets[activeSheetIndex] : sheets[activeSheetIndex];
  const maxColumns = activeSheet
    ? Math.max(...activeSheet.rows.map((row) => (row ? row.length : 0)), 0)
    : 0;

  // No modo de edição, exibe uma coluna extra à direita para preenchimento
  const colsCount = isEditing ? maxColumns + 1 : maxColumns;

  return (
    <div className="flex flex-col flex-1 w-full bg-card border border-border/40 rounded-2xl overflow-hidden shadow-none">
      {/* Header bar with Tab selector & Edit controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-muted/20 border-b border-border/40 p-2 gap-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              disabled={isSaving}
              onClick={() => setActiveSheetIndex(index)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                index === activeSheetIndex
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <FileSpreadsheet className="inline size-3.5 mr-1" />
              {sheet.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isEditing ? (
            <>
              <button
                onClick={handleAddNewRow}
                disabled={isSaving}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/60 text-foreground transition-colors cursor-pointer"
              >
                <Plus className="size-3.5 mr-1" />
                Nova Linha
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/60 text-foreground transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 transition-colors cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="size-3.5 mr-1" />
                    Salvar
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 transition-colors cursor-pointer"
            >
              <Edit3 className="size-3.5 mr-1" />
              Editar Planilha
            </button>
          )}
        </div>
      </div>

      {/* Grid container with independent scrolls */}
      <div className="flex-1 overflow-auto max-h-[70vh] min-h-[400px]">
        {activeSheet.rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Aba vazia
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-xs text-foreground/90">
            <thead>
              <tr className="bg-muted/30 border-b border-border/40">
                {/* Index Column Indicator */}
                <th className="sticky top-0 left-0 bg-muted/60 border-r border-border/40 p-2 text-center text-muted-foreground font-mono w-10 select-none z-30">
                  #
                </th>
                {Array.from({ length: colsCount }).map((_, colIndex) => {
                  // Converte o index numérico em letras A, B, C, ... AA, AB, etc.
                  let temp = colIndex;
                  let letter = "";
                  while (temp >= 0) {
                    letter = String.fromCharCode((temp % 26) + 65) + letter;
                    temp = Math.floor(temp / 26) - 1;
                  }
                  return (
                    <th
                      key={colIndex}
                      className="sticky top-0 bg-muted/40 border-r border-border/40 p-2 font-mono text-center text-muted-foreground select-none min-w-[120px] z-20"
                    >
                      {letter}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {activeSheet.rows.map((row, rowIndex) => {
                const typedRow = row as unknown[];
                return (
                  <tr
                    key={rowIndex}
                    className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                  >
                    {/* Row index indicator */}
                    <td className="sticky left-0 bg-muted/40 border-r border-border/40 p-2 font-mono text-center text-muted-foreground select-none z-10">
                      {rowIndex + 1}
                    </td>
                    {Array.from({ length: colsCount }).map((_, colIndex) => {
                      const value = typedRow ? typedRow[colIndex] : undefined;
                      return (
                        <td
                          key={colIndex}
                          className="border-r border-border/20 p-0 min-w-[120px] max-w-[300px]"
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={value !== undefined ? String(value) : ""}
                              disabled={isSaving}
                              onChange={(e) =>
                                handleCellChange(activeSheetIndex, rowIndex, colIndex, e.target.value)
                              }
                              className="w-full h-full bg-transparent border-none outline-none focus:bg-muted/40 px-2 py-2 text-xs focus:ring-1 focus:ring-primary/20"
                            />
                          ) : (
                            <div
                              className="px-2 py-2 truncate"
                              title={value !== undefined ? String(value) : ""}
                            >
                              {value !== undefined ? String(value) : ""}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
