import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  Code,
  Copy,
  ExternalLink,
  FileCheck,
  FileText,
  Layers,
  Search,
  Server,
  Shield,
  Sparkles,
} from 'lucide-react';
import { DocSection, PRODUCTION_DOCS } from '../../data/productionDocs';

interface DocsModalProps {
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ onClose }) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(
    PRODUCTION_DOCS[0].id
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    'Todas',
    'Arquitectura & Datos',
    'UX & Flujos',
    'Seguridad & APIs',
    'Producto & Planificación',
    'DevOps & Despliegue',
  ];

  const filteredDocs = PRODUCTION_DOCS.filter((doc) => {
    if (selectedCategory !== 'Todas' && doc.category !== selectedCategory) {
      return false;
    }
    if (
      searchQuery.trim() &&
      !doc.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !doc.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const activeDoc =
    PRODUCTION_DOCS.find((d) => d.id === selectedDocId) || PRODUCTION_DOCS[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-hidden">
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[92vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg leading-tight text-white">
                  Aula Viva — Blueprint & Entregables de Producción
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300">
                  20 Entregables
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Arquitectura, Modelo ERD, SQL DDL con RLS, APIs, Historias de Usuario y Plan de Sprint
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar: Deliverables List */}
          <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
            {/* Search & Category Filter */}
            <div className="p-3 border-b border-slate-200 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar entregables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-emerald-500"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List of 20 items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    selectedDocId === doc.id
                      ? 'bg-white text-emerald-800 border border-emerald-300 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      selectedDocId === doc.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {doc.number}
                  </span>
                  <span className="truncate">{doc.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Area: Document View */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Document Header & Copy CTA */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {activeDoc.category} • Entregable #{activeDoc.number}
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {activeDoc.title}
                </h2>
              </div>

              <button
                onClick={() => handleCopy(activeDoc.content, activeDoc.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer shrink-0"
              >
                {copiedId === activeDoc.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Sección</span>
                  </>
                )}
              </button>
            </div>

            {/* Document Body */}
            <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-mono">
              <pre className="whitespace-pre-wrap font-sans text-slate-800 bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                {activeDoc.content}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span>
            Aula Viva SaaS MVP • Diseñado para 8 estudiantes de grado 11 & 1 mentor
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
