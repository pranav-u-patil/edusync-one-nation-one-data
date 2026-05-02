import { useWorkspace } from '../context/WorkspaceContext';

export const ReportOutputPage = () => {
  const { generatedReport } = useWorkspace();

  const forceDownload = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = url.split('/').pop() || 'report';
      
      link.href = objectUrl;
      link.download = filename;
      
      // Specifically set type for PDFs to help some browsers
      if (filename.endsWith('.pdf')) {
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        link.href = window.URL.createObjectURL(pdfBlob);
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-700">Report Output</div>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Preview and download</h1>
      </section>

      {generatedReport ? (
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-soft">
            <iframe title="Generated report" srcDoc={generatedReport.html} className="h-[80vh] w-full rounded-[1.25rem] border-0 bg-white" />
          </div>
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Download</div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{generatedReport.report?.templateName}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">A persisted report record was saved in MongoDB.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={generatedReport.downloadUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-50">
                Open preview
              </a>
              <button
                type="button"
                onClick={() => forceDownload(generatedReport.downloadUrl)}
                className="inline-flex rounded-2xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-400"
              >
                Download file
              </button>
            </div>
            {generatedReport.missingFields?.length ? (
              <div className="mt-6 rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-900">
                Missing values: {generatedReport.missingFields.join(', ')}
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600 shadow-soft">
          Generate a report from the autofill page to see the preview here.
        </div>
      )}
    </div>
  );
};
