import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import client from '../api/client';

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [generatedReport, setGeneratedReport] = useState(null);

  useEffect(() => {
    const hydrateWorkspace = async () => {
      if (!localStorage.getItem('edusync_token')) {
        return;
      }

      try {
        const [templatesResponse, fieldsResponse] = await Promise.all([
          client.get('/templates'),
          client.get('/fields'),
        ]);

        setTemplates(templatesResponse.data.templates || []);
        setFields(fieldsResponse.data.fields || []);
      } catch (error) {
        // Hydration is best-effort; protected pages will surface API errors.
      }
    };

    hydrateWorkspace();
  }, []);

  const value = useMemo(
    () => ({
      session,
      setSession,
      templates,
      setTemplates,
      fields,
      setFields,
      selectedTemplate,
      setSelectedTemplate,
      mappings,
      setMappings,
      generatedReport,
      setGeneratedReport,
    }),
    [session, templates, fields, selectedTemplate, mappings, generatedReport]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used inside WorkspaceProvider');
  }
  return context;
};
