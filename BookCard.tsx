
import React from 'react';
import { Book } from '../types';
import { Trash2, Sparkles, Bookmark } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onToggleMark: (e: React.MouseEvent) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick, onDelete, onToggleMark }) => {
  return (
    <div 
      onClick={onClick}
      className="group relative cursor-pointer flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      {/* AI Summary Tooltip - Only show on desktop hover; mobile handled by tapping book */}
      {book.summary && (
        <div className="absolute bottom-[calc(100%-140px)] left-1/2 -translate-x-1/2 w-56 p-4 bg-white/95 backdrop-blur-md border border-neutral-100 shadow-2xl rounded-2xl opacity-0 translate-y-2 pointer-events-none md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-300 z-30 hidden md:block">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={12} className="text-purple-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">AI Insight</span>
          </div>
          <p className="text-[11px] text-neutral-600 leading-relaxed italic">
            "{book.summary}"
          </p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white/95"></div>
        </div>
      )}

      <div className={`relative w-full aspect-[3/4] bg-neutral-100 rounded-[24px] overflow-hidden transition-all duration-300 transform md:group-hover:-translate-y-1 
        ${book.isMarked ? 'ring-2 ring-neutral-900 ring-offset-4 shadow-xl' : 'shadow-sm hover:shadow-xl'}`}>
        
        {book.thumbnail ? (
          <img 
            src={book.thumbnail} 
            alt={book.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 bg-neutral-50">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">No Preview</span>
          </div>
        )}
        
        {/* Bookmark Button - Visible on mobile, hover-revealed on desktop */}
        <button 
          onClick={onToggleMark}
          className={`absolute top-3 left-3 p-2.5 rounded-full backdrop-blur-md transition-all duration-200 z-20 
            ${book.isMarked 
              ? 'bg-neutral-900 text-white scale-100 shadow-lg' 
              : 'bg-white/90 text-neutral-400 md:opacity-0 md:group-hover:opacity-100 hover:text-neutral-900 shadow-sm'}`}
        >
          <Bookmark size={18} fill={book.isMarked ? "currentColor" : "none"} />
        </button>

        {/* Delete Button - Visible on mobile, hover-revealed on desktop */}
        <button 
          onClick={onDelete}
          className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur-md rounded-full md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 text-red-500 hover:bg-red-50 shadow-sm z-20"
        >
          <Trash2 size={18} />
        </button>

        {/* Insight Badge for Mobile */}
        {book.summary && (
          <div className="absolute bottom-3 right-3 p-1.5 bg-purple-500 text-white rounded-full md:hidden shadow-lg animate-pulse">
            <Sparkles size={12} />
          </div>
        )}

        {/* Marked Ribbon Overlay */}
        {book.isMarked && (
          <div className="absolute inset-0 bg-neutral-900/5 pointer-events-none"></div>
        )}
      </div>
      
      <div className="mt-4 text-center px-1 w-full">
        <h3 className="text-sm font-semibold text-neutral-800 line-clamp-2 leading-tight px-2">
          {book.title}
        </h3>
        <div className="flex items-center justify-center gap-2 mt-2">
          {book.lastPage > 1 && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              P. {book.lastPage}
            </p>
          )}
          {book.isMarked && (
            <span className="text-[10px] font-black text-neutral-900 uppercase tracking-widest bg-neutral-100 px-2 py-0.5 rounded-full">Marked</span>
          )}
        </div>
      </div>
    </div>
  );
};
