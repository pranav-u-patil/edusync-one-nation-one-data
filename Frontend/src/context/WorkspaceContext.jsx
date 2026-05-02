import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import client from '../api/client';

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const [session, setSessionState] = useState(() => {
    // Restore session from localStorage on mount
    const stored = localStorage.getItem('edusync_session');
    return stored ? JSON.parse(stored) : null;
  });
  const [templates, setTemplates] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedTemplate, setSelectedTemplateState] = useState(() => {
    const stored = localStorage.getItem('edusync_selected_template');
    return stored ? JSON.parse(stored) : null;
  });
  const [mappings, setMappings] = useState([]);
  const [generatedReport, setGeneratedReport] = useState(null);

  // Persist session to localStorage whenever it changes
  const setSession = (newSession) => {
    setSessionState(newSession);
    if (newSession) {
      localStorage.setItem('edusync_session', JSON.stringify(newSession));
    } else {
      localStorage.removeItem('edusync_session');
    }
  };

  const setSelectedTemplate = (template) => {
    setSelectedTemplateState(template);
    if (template) {
      localStorage.setItem('edusync_selected_template', JSON.stringify(template));
    } else {
      localStorage.removeItem('edusync_selected_template');
    }
  };

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

        const fetchedTemplates = templatesResponse.data.templates || [];
        setTemplates(fetchedTemplates);
        setFields(fieldsResponse.data.fields || []);

        // If we have a stored template, try to find it in the fresh list to get latest fields
        const storedTemplate = localStorage.getItem('edusync_selected_template');
        if (storedTemplate) {
          const parsed = JSON.parse(storedTemplate);
          const fresh = fetchedTemplates.find(t => t.id === parsed.id || t._id === parsed._id);
          if (fresh) setSelectedTemplateState(fresh);
        }
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
