import React, { useState, useEffect, useRef } from 'react';
import { Plus, Library as LibraryIcon, Search, Github, Loader2, Bookmark } from 'lucide-react';
import { Book } from './types';
// Sửa lỗi Case-Sensitivity: Đảm bảo 'components' viết thường khớp với thư mục vật lý
import { BookCard } from './components/BookCard';
import { PdfReader } from './components/PdfReader';
import { getAllBooks, saveBook, deleteBook, toggleMarkBook } from './services/dbService';
import { generateThumbnail, extractTextForSummary } from './services/pdfService';
import { getBookSummary } from './services/geminiService';

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMarked, setShowOnlyMarked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const storedBooks = await getAllBooks();
      setBooks(storedBooks);
    } catch (error) {
      console.error("Failed to load library:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      alert("Vui lòng chọn file PDF hợp lệ.");
      return;
    }

    setIsUploading(true);
    try {
      const id = typeof crypto.randomUUID === 'function' 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
        
      const title = file.name.replace(/\.[^/.]+$/, "");
      
      let thumbnail: string | undefined;
      try {
        thumbnail = await generateThumbnail(file);
      } catch (e) {
        console.warn("Không thể tạo ảnh thu nhỏ", e);
      }
      
      let summary: string | undefined;
      try {
        const previewText = await extractTextForSummary(file);
        if (previewText) {
          summary = await getBookSummary(previewText);
        }
      } catch (e) {
        console.warn("AI không thể tóm tắt nội dung", e);
      }

      const newBook: Book = {
        id,
        title,
        fileName: file.name,
        blob: file,
        thumbnail,
        lastPage: 1,
        addedAt: Date.now(),
        summary,
        isMarked: false
      };

      await saveBook(newBook);
      await loadLibrary();
    } catch (error) {
      console.error("Upload thất bại:", error);
      alert("Không thể thêm sách. Bộ nhớ trình duyệt có thể đã đầy.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteBook = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Bạn có muốn xóa cuốn sách này khỏi thư viện?")) {
      try {
        await deleteBook(id);
        await loadLibrary();
      } catch (error) {
        console.error("Lỗi xóa sách:", error);
      }
    }
  };

  const handleToggleMark = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await toggleMarkBook(id);
      await loadLibrary();
    } catch (error) {
      console.error("Lỗi đánh dấu:", error);
    }
  };

  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMarked = showOnlyMarked ? b.isMarked : true;
    return matchesSearch && matchesMarked;
  });

  const markedCount = books.filter(b => b.isMarked).length;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl px-4 md:px-10 pt-8 pb-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-neutral-900">Bookii</h1>
            <p className="text-[10px] md:text-xs text-neutral-400 font-black uppercase tracking-[0.3em] mt-1">Reader Studio</p>
          </div>
          <div className="flex items-center gap-3">
            {isUploading && (
              <div className="flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-full">
                <Loader2 size={14} className="animate-spin text-neutral-900" />
                <span className="hidden sm:inline text-[10px] font-black text-neutral-900 uppercase tracking-widest">Processing</span>
              </div>
            )}
            <a href="https://github.com" target="_blank" rel="noreferrer" className="p-3 bg-neutral-50 rounded-full text-neutral-400">
              <Github size={20} />
            </a>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm sách..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border-none rounded-[20px] py-4 md:py-5 pl-14 pr-4 text-sm font-medium focus:ring-2 focus:ring-neutral-200 outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => setShowOnlyMarked(!showOnlyMarked)}
            className={`flex items-center justify-center gap-2.5 px-8 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all
              ${showOnlyMarked ? 'bg-neutral-900 text-white shadow-xl' : 'bg-neutral-50 text-neutral-400'}`}
          >
            <Bookmark size={16} fill={showOnlyMarked ? "currentColor" : "none"} />
            <span>Đã đánh dấu ({markedCount})</span>
          </button>
        </div>
      </header>

      {/* Grid Content */}
      <main className="px-4 md:px-10">
        {books.length === 0 && !isUploading ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <div className="w-24 h-24 bg-neutral-50 rounded-[40px] flex items-center justify-center mb-8 rotate-12">
              <LibraryIcon className="text-neutral-200" size={40} />
            </div>
            <h2 className="text-xl font-bold text-neutral-800">Thư viện trống</h2>
            <p className="text-sm text-neutral-400 mt-3 max-w-[220px]">Tải lên file PDF đầu tiên để bắt đầu trải nghiệm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-6 gap-y-12">
            {filteredBooks.map((book) => (
              <BookCard 
                key={book.id} 
                book={book} 
                onClick={() => setCurrentBook(book)}
                onDelete={(e) => handleDeleteBook(e, book.id)}
                onToggleMark={(e) => handleToggleMark(e, book.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-6 md:bottom-10 md:right-10 z-40">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="application/pdf" />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-16 h-16 md:w-20 md:h-20 bg-neutral-900 text-white rounded-3xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:bg-neutral-400"
        >
          {isUploading ? <Loader2 size={32} className="animate-spin" /> : <Plus size={32} strokeWidth={3} />}
        </button>
      </div>

      {/* Reader Overlay */}
      {currentBook && (
        <PdfReader 
          book={currentBook} 
          onClose={() => {
            setCurrentBook(null);
            loadLibrary();
          }} 
        />
      )}
    </div>
  );
};

export default App;