import { useState } from 'react';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // App state
  const [mode, setMode] = useState(''); // 'template' or 'pdf'
  const [selectedTemplate, setSelectedTemplate] = useState('naac');
  const [pdfFile, setPdfFile] = useState(null);
  const [formData, setFormData] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState('');

  const clearMessages = () => {
    setMessage('');
    setError('');
  };

  const handleCSVUpload = async (e) => {
    e.preventDefault();
    clearMessages();
    const file = e.target.elements.csvFile?.files[0];
    if (!file) return setError('Please select a CSV file.');

    setLoading(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const response = await fetch('/api/forms/upload-csv', {
        method: 'POST',
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setMessage(result.message || 'Data seeded successfully!');
      setTimeout(() => {
        clearMessages();
        setCurrentScreen(2);
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateData = async () => {
    clearMessages();
    setLoading(true);
    try {
      const response = await fetch(`/api/forms/template/${selectedTemplate}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setFormData(result.results);
      setMode('template');
      setCurrentScreen(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePdfExtract = async () => {
    if (!pdfFile) return setError("Please select a PDF file.");
    clearMessages();
    setLoading(true);
    
    const data = new FormData();
    data.append('file', pdfFile);

    try {
      const response = await fetch('/api/forms/process-pdf', {
        method: 'POST',
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setFormData(result);
      setMode('pdf');
      setCurrentScreen(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (question, newValue) => {
    setFormData(prev => prev.map(item => 
      item.question === question ? { ...item, answer: newValue, isNewlyFilled: true } : item
    ));
  };

  const handleGeneratePDF = async () => {
    clearMessages();
    setLoading(true);

    const dataMap = {};
    const unlearnedMappings = [];

    formData.forEach(item => {
      dataMap[item.question] = item.answer;
      if (item.isNewlyFilled && item.answer.trim() !== '') {
        unlearnedMappings.push({ question: item.question, answer: item.answer });
      }
    });

    try {
      if (unlearnedMappings.length > 0) {
        await fetch('/api/forms/learn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mappings: unlearnedMappings })
        });
      }

      let response;
      if (mode === 'pdf') {
        if (!pdfFile) {
          throw new Error('Please re-select the source PDF before generating output.');
        }

        const pdfGenerationData = new FormData();
        pdfGenerationData.append('file', pdfFile);
        pdfGenerationData.append('data', JSON.stringify(dataMap));

        response = await fetch('/api/forms/generate-from-pdf', {
          method: 'POST',
          body: pdfGenerationData,
        });
      } else {
        response = await fetch('/api/forms/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formType: selectedTemplate, data: dataMap })
        });
      }
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setDownloadUrl(result.downloadUrl);
      setCurrentScreen(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStepClass = (stepNum) => {
    if (stepNum === currentScreen || (stepNum === 2 && currentScreen === 3.1) || (stepNum === 2 && currentScreen === 3.2)) return 'step active';
    return 'step';
  };

  return (
    <div className="app-wrapper">
      <div className="header">
        <h1>EduSync</h1>
        <p>Unified Institutional Reporting Data System</p>
      </div>

      <div className="card">
        <div className="stepper">
          <div className={getStepClass(1)}>Step 1<br/>Upload</div>
          <div className={getStepClass(2)}>Step 2<br/>Mode</div>
          <div className={getStepClass(4)}>Step 3<br/>Autofill</div>
          <div className={getStepClass(5)}>Step 4<br/>Output</div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="message">{message}</div>}

        {/* Screen 1: Master CSV Upload */}
        {currentScreen === 1 && (
          <div className="form-group">
            <p>Upload your master institutional data (CSV) to seed the engine system.</p>
            <form onSubmit={handleCSVUpload}>
              <div className="input-row file-upload-wrapper">
                <input type="file" name="csvFile" accept=".csv" className="file-input" />
              </div>
              <div className="action-row">
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? 'Uploading...' : 'Upload Database'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setCurrentScreen(2)}>
                  Skip Upload
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Screen 2: Mode Selection */}
        {currentScreen === 2 && (
          <div className="form-group">
            <p>Select how you would like to process the upcoming form:</p>
            <div className="action-row">
              <button className="btn" onClick={() => setCurrentScreen(3.1)}>Use Template Form</button>
              <button className="btn btn-secondary" onClick={() => setCurrentScreen(3.2)}>Extract from PDF</button>
            </div>
            <div className="action-row">
              <button className="btn btn-outline" onClick={() => setCurrentScreen(1)}>Back</button>
            </div>
          </div>
        )}

        {/* Screen 3A: Template Mode */}
        {currentScreen === 3.1 && (
          <div className="form-group">
            <p>Select an agency template to immediately auto-fill known data parameters.</p>
            <div className="input-row">
              <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
                <option value="naac">NAAC Assessment Report</option>
                <option value="ugc">UGC Commission Report</option>
                <option value="nba">NBA Accreditation Report</option>
              </select>
            </div>
            <div className="action-row">
              <button className="btn" onClick={fetchTemplateData} disabled={loading}>
                {loading ? 'Fetching...' : 'Load Template'}
              </button>
              <button className="btn btn-outline" onClick={() => setCurrentScreen(2)}>Back</button>
            </div>
          </div>
        )}

        {/* Screen 3B: PDF Extraction Mode */}
        {currentScreen === 3.2 && (
          <div className="form-group">
            <p>Upload a target PDF schema to extract missing dynamic fields.</p>
            <div className="input-row file-upload-wrapper">
              <input type="file" accept=".pdf" className="file-input" onChange={(e) => setPdfFile(e.target.files[0])} />
            </div>
            <div className="action-row">
              <button className="btn" onClick={handlePdfExtract} disabled={loading}>
                {loading ? 'Extracting...' : 'Extract Data'}
              </button>
              <button className="btn btn-outline" onClick={() => setCurrentScreen(2)}>Back</button>
            </div>
          </div>
        )}

        {/* Screen 4: Autofill Verification */}
        {currentScreen === 4 && (
          <div className="form-group">
            <p>Review the mapped fields below. Missing parameters highlighted in red require human input.</p>
            
            <div className="wizard-list">
              {formData.map((item, idx) => {
                const isFound = !!item.answer;
                return (
                  <div key={idx} className={`question-row ${(isFound || item.isNewlyFilled) ? 'filled' : 'missing'}`}>
                    <div className="question-label">
                      {item.question}
                      {!isFound && !item.isNewlyFilled && <span className="status-text text-danger">* Missing Output</span>}
                      {isFound && !item.isNewlyFilled && <span className="status-text text-success">✔ Auto-Filled</span>}
                    </div>
                    <input 
                      type="text" 
                      className="question-input"
                      value={item.answer || ''} 
                      onChange={(e) => handleAnswerChange(item.question, e.target.value)}
                      readOnly={isFound && !item.isNewlyFilled} 
                      placeholder="Insert missing data..."
                    />
                  </div>
                );
              })}
            </div>

            <div className="action-row">
              <button className="btn btn-success" onClick={handleGeneratePDF} disabled={loading}>
                {loading ? 'Generating...' : 'Generate New PDF'}
              </button>
              <button className="btn btn-outline" onClick={() => setCurrentScreen(2)} disabled={loading}>
                Restart
              </button>
            </div>
          </div>
        )}

        {/* Screen 5: Success & Download */}
        {currentScreen === 5 && (
          <div className="form-group" style={{ textAlign: 'center', padding: '10px 0' }}>
            <h2 style={{ color: '#27ae60', margin: '0 0 8px 0', fontSize: '18px' }}>Synchronization Complete</h2>
            <p style={{marginBottom: '4px'}}>Your PDF has been compiled. Any newly answered keys were learned by the master matrix.</p>
            
            <a href={downloadUrl} target="_blank" rel="noreferrer" className="download-link">
              ⬇ Download Exported Format
            </a>

            <div className="action-row" style={{ justifyContent: 'center', marginTop: '20px' }}>
              <button className="btn btn-outline" onClick={() => {
                setCurrentScreen(1);
                setFormData([]);
                clearMessages();
              }}>Return to Start Node</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
