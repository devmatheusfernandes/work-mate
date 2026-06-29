"use client";

import dynamic from "next/dynamic";

const ExcelViewer = dynamic(
  () => import("./excel-viewer").then((mod) => mod.ExcelViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center p-20 border border-border/40 rounded-2xl bg-muted/5 h-[60vh]">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Carregando visualizador...</p>
      </div>
    ),
  }
);

interface ExcelViewerWrapperProps {
  fileUrl: string;
  noteId: string;
}

export function ExcelViewerWrapper({ fileUrl, noteId }: ExcelViewerWrapperProps) {
  return <ExcelViewer fileUrl={fileUrl} noteId={noteId} />;
}
