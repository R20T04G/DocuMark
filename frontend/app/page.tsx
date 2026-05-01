'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [response, setResponse] = useState<string>('');

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Note: We are hitting your exact .NET port here
      const res = await fetch('http://localhost:5152/api/convert', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse('Upload failed. Check the console and ensure the backend is running.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
      <div className="p-8 bg-gray-800 rounded-lg shadow-xl flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold">DocuMark Uploader</h1>
        
        <input 
          type="file" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border p-2 rounded"
        />
        
        <button 
          onClick={handleUpload}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold transition-colors"
        >
          Convert to Markdown
        </button>

        {response && (
          <pre className="mt-4 p-4 bg-black rounded text-green-400 text-sm overflow-x-auto w-full max-w-md">
            {response}
          </pre>
        )}
      </div>
    </main>
  );
}