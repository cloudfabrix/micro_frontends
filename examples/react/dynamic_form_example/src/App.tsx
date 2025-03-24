

import React, { useState, useEffect } from 'react';
import FormContainer from './FormContainer.tsx';

/**
 * App component that loads external schemas and passes them to the FormContainer
 */
const App = ({ schema }) => {
  const [activeSchema, setActiveSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load schema when component mounts
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        setLoading(true);
        
        // In a real app, this would be an API call
        // const response = await fetch('/api/schemas/pipeline');
        // const schema = await response.json();
        
        // For demo purposes, we'll simulate a network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // This is your schema - in a real app this would come from your API
        // const schema = {
        //   title: "Pipeline Runner",
        //   description: "Configure and run data processing pipelines",
        //   fields: [
        //     {
        //       id: "pipelineType",
        //       type: "select",
        //       label: "Select Pipeline Type",
        //       options: [
        //         { value: "", label: "-- Select Type --" },
        //         { value: "published", label: "Published" },
        //         { value: "draft", label: "Draft" },
        //         { value: "inline", label: "Inline" }
        //       ],
        //       required: true,
        //       resetFields: ["pipeline", "version", "inlineCode"]
        //     },
        //     {
        //       id: "pipeline",
        //       type: "select",
        //       label: "Select Pipeline",
        //       options: [
        //         { value: "", label: "-- Select Pipeline --" },
        //         { value: "pipe1", label: "Data Processing Pipeline" },
        //         { value: "pipe2", label: "ETL Pipeline" },
        //         { value: "pipe3", label: "ML Training Pipeline" }
        //       ],
        //       required: true,
        //       dependsOn: { 
        //         field: "pipelineType", 
        //         values: ["published", "draft"] 
        //       },
        //       resetFields: ["version"]
        //     },
        //     {
        //       id: "version",
        //       type: "select",
        //       label: "Select Version",
        //       dynamicOptions: {
        //         dependsOn: "pipeline",
        //         options: {
        //           pipe1: [
        //             { value: "", label: "-- Select Version --" },
        //             { value: "v1.0.0", label: "v1.0.0" },
        //             { value: "v1.1.0", label: "v1.1.0" },
        //             { value: "v1.2.0", label: "v1.2.0" }
        //           ],
        //           pipe2: [
        //             { value: "", label: "-- Select Version --" },
        //             { value: "v2.0.0", label: "v2.0.0" },
        //             { value: "v2.0.1", label: "v2.0.1" }
        //           ],
        //           pipe3: [
        //             { value: "", label: "-- Select Version --" },
        //             { value: "v1.0.0", label: "v1.0.0" },
        //             { value: "v2.0.0", label: "v2.0.0" },
        //             { value: "v3.0.0", label: "v3.0.0" }
        //           ]
        //         }
        //       },
        //       required: true,
        //       dependsOn: { 
        //         field: "pipeline", 
        //         notEmpty: true,
        //         parentConditions: [
        //           { field: "pipelineType", values: ["published", "draft"] }
        //         ]
        //       }
        //     },
        //     {
        //       id: "inlineCode",
        //       type: "codeEditor",
        //       label: "Python Code",
        //       placeholder: "# Enter your Python code here",
        //       rows: 10,
        //       required: true,
        //       dependsOn: { 
        //         field: "pipelineType", 
        //         values: ["inline"] 
        //       },
        //       validateCode: true,
        //       helpText: "Code must include at least one function definition using 'def'"
        //     }
        //   ],
        //   buttonText: "Run Pipeline",
        //   validationRules: [
        //     {
        //       when: { field: "pipelineType", values: ["inline"] },
        //       require: ["inlineCode"]
        //     },
        //     {
        //       when: { field: "pipelineType", values: ["published", "draft"] },
        //       require: ["pipeline", "version"]
        //     }
        //   ]
        // };
        
        setActiveSchema(schema);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching schema:", err);
        setError("Failed to load schema. Please try again later.");
        setLoading(false);
      }
    };
    
    fetchSchema();
  }, []);
  
  // Handle form submission
  const handleSubmit = (values) => {
    console.log("Form submitted with values:", values);
    // In a real app, you would send this data to your API
    // await fetch('/api/pipelines/run', { method: 'POST', body: JSON.stringify(values) });
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-2 text-gray-800">Dynamic Form with External Schema</h2>
      <p className="text-gray-600 mb-6">Form is rendered based on schema loaded from an external source</p>
      
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        {loading && (
          <div className="py-10 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-3 text-gray-600">Loading form schema...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}
        
        {!loading && !error && activeSchema && (
          <FormContainer 
            schema={activeSchema}
            onSubmit={handleSubmit}
            showDebugInfo={true}
          />
        )}
      </div>
    </div>
  );
};

export default App;
