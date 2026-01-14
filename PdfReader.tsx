
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Book } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, X, Sparkles, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { updateLastPage } from '../services/dbService';

interface PdfReaderProps {
  book: Book;
  onClose: () => void;
}

interface PageProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  onVisible: (pageNumber: number) => void;
}

const PdfPage: React.FC<PageProps> = ({ pdfDoc, pageNumber, scale, onVisible }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: scale * (window.devicePixelRatio || 1) });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const normalViewport = page.getViewport({ scale: scale });
      canvas.style.width = `${normalViewport.width}px`;
      canvas.style.height = `${normalViewport.height}px`;

      renderTaskRef.current = page.render({ canvasContext: context, viewport, canvas });
      await renderTaskRef.current.promise;
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error(`Error rendering page ${pageNumber}:`, err);
      }
    }
  }, [pdfDoc, pageNumber, scale]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onVisible(pageNumber);
            renderPage();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [renderPage, pageNumber, onVisible]);

  return (
    <div 
      ref={containerRef} 
      className="snap-start flex flex-col items-center py-4 md:py-8 w-full min-h-[50vh]"
      id={`page-${pageNumber}`}
    >
      <div className="bg-white shadow-xl relative transition-transform duration-300">
        <canvas ref={canvasRef} className="max-w-none" />
      </div>
      <div className="mt-4 text-[10px] text-neutral-300 uppercase tracking-widest font-bold">
        {pageNumber}
      </div>
    </div>
  );
};

export const PdfReader: React.FC<PdfReaderProps> = ({ book, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(book.lastPage || 1);
  const [loading, setLoading] = useState<boolean>(true);
  const [scale, setScale] = useState<number>(1.0);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const arrayBuffer = await book.blob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setLoading(false);
      }
    };
    loadPdf();
  }, [book]);

  useEffect(() => {
    if (!loading && pdfDoc && !initialScrollDone.current && containerRef.current) {
      const pageEl = document.getElementById(`page-${book.lastPage || 1}`);
      if (pageEl) {
        pageEl.scrollIntoView();
        initialScrollDone.current = true;
      }
    }
  }, [loading, pdfDoc, book.lastPage]);

  const handlePageVisible = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    updateLastPage(book.id, pageNumber);
  }, [book.id]);

  const scrollToPage = (pageNumber: number) => {
    const target = Math.max(1, Math.min(pageNumber, numPages));
    const el = document.getElementById(`page-${target}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.4));
  const resetZoom = () => setScale(1.0);

  const toggleControls = (e: React.MouseEvent) => {
    // Only toggle if clicking the background, not buttons
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.pdf-page-container')) {
      setShowControls(!showControls);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col h-screen overflow-hidden animate-in fade-in duration-300">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 flex items-center justify-between px-4 md:px-6 py-4 border-b border-neutral-100 bg-white/95 backdrop-blur-xl z-30 transition-transform duration-500 ease-in-out ${showControls ? 'translate-y-0' : '-translate-y-full'}`}>
        <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-full transition-colors text-neutral-600">
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center max-w-[50%]">
          <h2 className="text-[13px] font-bold truncate text-neutral-800 w-full text-center tracking-tight">{book.title}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest tabular-nums">
              Page {currentPage} / {numPages}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 md:gap-1">
          <button onClick={zoomOut} className="p-2 hover:bg-neutral-50 rounded-lg text-neutral-500" title="Zoom Out">
            <ZoomOut size={18} />
          </button>
          <button onClick={zoomIn} className="p-2 hover:bg-neutral-50 rounded-lg text-neutral-500" title="Zoom In">
            <ZoomIn size={18} />
          </button>
          <button onClick={resetZoom} className="hidden sm:block p-2 hover:bg-neutral-50 rounded-lg text-neutral-500" title="Reset Zoom">
            <Maximize size={18} />
          </button>
        </div>
      </header>

      {/* Main Reader Scroll Container */}
      <div 
        ref={containerRef}
        onClick={toggleControls}
        className="flex-1 overflow-y-auto overflow-x-auto bg-neutral-50 scroll-smooth snap-y snap-proximity relative"
        style={{ scrollBehavior: 'smooth' }}
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center bg-white">
            <div className="w-10 h-10 border-2 border-neutral-100 border-t-neutral-900 rounded-full animate-spin"></div>
            <p className="mt-4 text-[10px] font-black text-neutral-300 uppercase tracking-[0.2em]">Reading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center min-w-max min-h-full py-20">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
              pdfDoc && (
                <div key={pageNumber} className="pdf-page-container">
                  <PdfPage 
                    pdfDoc={pdfDoc}
                    pageNumber={pageNumber}
                    scale={scale}
                    onVisible={handlePageVisible}
                  />
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <footer className={`fixed bottom-0 left-0 right-0 px-4 md:px-6 py-4 border-t border-neutral-100 flex items-center justify-between bg-white/95 backdrop-blur-xl z-30 transition-transform duration-500 ease-in-out ${showControls ? 'translate-y-0' : 'translate-y-full'}`}>
        <button 
          disabled={currentPage <= 1}
          onClick={() => scrollToPage(currentPage - 1)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 text-white rounded-2xl disabled:opacity-20 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Prev</span>
        </button>
        
        <div className="flex items-center gap-4">
          <div className="text-[11px] font-bold text-neutral-400 tabular-nums bg-neutral-50 px-3 py-1.5 rounded-full">
            {Math.round(scale * 100)}%
          </div>
          {book.summary && (
            <div className="group relative">
              <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 px-4 py-2.5 rounded-full hover:bg-purple-100 transition-colors">
                <Sparkles size={12} />
                <span className="hidden sm:inline">Insights</span>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 md:w-80 p-6 bg-white border border-neutral-100 shadow-[0_32px_64px_rgba(0,0,0,0.18)] rounded-[32px] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none transition-all duration-300 z-50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                    <Sparkles size={14} className="text-purple-500" />
                  </div>
                  <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">AI Synthesis</span>
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed italic font-medium">
                  "{book.summary}"
                </p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white"></div>
              </div>
            </div>
          )}
        </div>

        <button 
          disabled={currentPage >= numPages}
          onClick={() => scrollToPage(currentPage + 1)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 text-white rounded-2xl disabled:opacity-20 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={14} />
        </button>
      </footer>
    </div>
  );
};
