import React, { useEffect, useState } from 'react';
import { UploadCloud, X, RotateCw, ZoomIn, ZoomOut, Image as ImageIcon } from 'lucide-react';

interface UploadsModuleProps {
  patientData: any;
  setPatientData: (updater: any) => void;
}

export const UploadsModule: React.FC<UploadsModuleProps> = ({
  patientData,
  setPatientData
}) => {
  const [activeUploadCategory, setActiveUploadCategory] = useState('Panoramic');
  const [remarks, setRemarks] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Lightbox View Settings
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);

  const attachments = patientData.attachments || [];
  const itemsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(attachments.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, attachments.length);
  const paginatedAttachments = attachments.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    try {
      const base64Data = await convertToBase64(file);
      const newAttachment = {
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString().split('T')[0],
        title: file.name,
        category: activeUploadCategory,
        details: remarks || 'No additional remarks.',
        url: base64Data
      };

      setPatientData((prev: any) => ({
        ...prev,
        attachments: [...(prev.attachments || []), newAttachment]
      }));
      setRemarks('');
    } catch (err) {
      console.error('File conversion failed:', err);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const deleteAttachment = (id: string) => {
    setPatientData((prev: any) => ({
      ...prev,
      attachments: prev.attachments.filter((a: any) => a.id !== id)
    }));
  };

  const openLightbox = (img: any) => {
    setSelectedImage(img);
    setRotation(0);
    setScale(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-zinc-900 font-display">Diagnostic Uploads & X-Rays</h3>
        <p className="text-xs text-zinc-500">Intraoral snapshots, panoramic scans, and reference medical clearances cataloged offline.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Drag and Drop Uploader */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Upload Category</label>
              <select
                value={activeUploadCategory}
                onChange={e => setActiveUploadCategory(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-teal-500 font-medium text-zinc-700"
              >
                <option value="Panoramic">Panoramic X-Ray</option>
                <option value="Intraoral">Intraoral Diagnostic</option>
                <option value="Before/After">Before / After Photographic</option>
                <option value="Clearance">Physician Clearances</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Remarks & Details</label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Write notes about this scan..."
                rows={3}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Dropper box */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                isDragging 
                  ? 'border-teal-500 bg-teal-50/30' 
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <input
                type="file"
                id="file-upload-input"
                className="hidden"
                onChange={e => e.target.files && handleFileUpload(e.target.files[0])}
              />
              <label htmlFor="file-upload-input" className="cursor-pointer space-y-2 block">
                <UploadCloud className="mx-auto text-zinc-400" size={32} />
                <div className="text-xs font-bold text-zinc-700">Drag & drop files here</div>
                <div className="text-[10px] text-zinc-400">or click to browse from system</div>
              </label>
            </div>
          </div>
        </div>

        {/* Uploaded Gallery Grid */}
        <div className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <h4 className="font-bold text-zinc-800 text-sm font-display mb-4 uppercase">Media Library</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {paginatedAttachments.map((img: any) => (
              <div 
                key={img.id} 
                className="group relative border border-zinc-150 rounded-xl overflow-hidden shadow-sm bg-zinc-50 hover:shadow transition-all"
              >
                <div className="aspect-[4/3] relative flex items-center justify-center bg-zinc-900 overflow-hidden cursor-pointer" onClick={() => openLightbox(img)}>
                  {img.url ? (
                    <img src={img.url} alt={img.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <ImageIcon className="text-zinc-500" size={24} />
                  )}
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-zinc-900/60 text-white rounded text-[8px] uppercase tracking-wider font-bold">
                    {img.category}
                  </span>
                </div>
                <div className="p-3 text-left">
                  <div className="text-[10px] font-bold text-zinc-800 truncate" title={img.title}>{img.title}</div>
                  <div className="text-[9px] text-zinc-400 mt-0.5 font-mono">{img.date}</div>
                  <div className="text-[9px] text-zinc-500 line-clamp-1 mt-1 font-sans">{img.details}</div>
                </div>
                <button
                  onClick={() => deleteAttachment(img.id)}
                  className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {attachments.length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-400 italic text-xs">
                No diagnostic images or references uploaded yet. Use the uploader sidebar to populate.
              </div>
            )}
          </div>
          {attachments.length > 0 && (
            <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[10px] font-semibold text-zinc-500">
                Showing {startIndex + 1}-{endIndex} of {attachments.length} media files
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                >
                  &lt; Prev
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${page === safeCurrentPage ? 'bg-teal-600 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                >
                  Next &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Zoom/Pan Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 justify-between">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800 text-white">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-teal-400">{selectedImage.category}</div>
              <div className="text-sm font-bold truncate max-w-xs">{selectedImage.title}</div>
            </div>
            <button 
              onClick={() => setSelectedImage(null)}
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Central Image Container */}
          <div className="flex-1 flex items-center justify-center overflow-hidden p-6 relative">
            <div 
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out'
              }}
              className="max-w-full max-h-[70vh] flex items-center justify-center"
            >
              {selectedImage.url && (
                <img src={selectedImage.url} alt="Lightbox Preview" className="max-w-full max-h-[70vh] object-contain rounded shadow-2xl" />
              )}
            </div>
          </div>

          {/* Controls Footer */}
          <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-center gap-4 text-white">
            <button 
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
            <button 
              onClick={() => setScale(s => Math.min(3, s + 0.25))}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <div className="h-6 w-px bg-zinc-850"></div>
            <button 
              onClick={() => setRotation(r => r + 90)}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-300 hover:text-white flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
              title="Rotate Right"
            >
              <RotateCw size={16} />
              <span>Rotate</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
