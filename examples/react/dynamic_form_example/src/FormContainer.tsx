import React, { useState } from 'react';
import PropTypes from 'prop-types';
import DynamicForm from './DynamicForm.tsx';

/**
 * FormContainer component that accepts an external schema and renders a dynamic form
 * 
 * @param {Object} props - Component props
 * @param {Object} props.schema - The form schema defining fields and behavior
 * @param {Object} props.initialValues - Optional initial values for the form
 * @param {Function} props.onSubmit - Function called when form is submitted successfully
 * @param {Boolean} props.showDebugInfo - Whether to show debug information
 */
const FormContainer = ({ 
  schema, 
  initialValues = {}, 
  onSubmit,
  showDebugInfo = false
}) => {
  const [formValues, setFormValues] = useState(initialValues);
  const [submittedValues, setSubmittedValues] = useState(null);

  // Handle form submission
  const handleSubmit = (values) => {
    setSubmittedValues(values);
    
    // Call external onSubmit callback
    if (onSubmit) {
      onSubmit(values);
    }
  };

  // Handle form value changes
  const handleChange = (values) => {
    setFormValues(values);
  };

  // Reset form
  const handleReset = () => {
    setFormValues(initialValues);
    setSubmittedValues(null);
  };

  return (
    <div className="w-full">
      {/* Display form header if title is provided */}
      {schema.title && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold">{schema.title}</h3>
          {schema.description && (
            <p className="text-sm text-gray-600 mt-1">{schema.description}</p>
          )}
        </div>
      )}
      
      {/* Show submission result or form */}
      {submittedValues ? (
        <div>
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 text-green-700">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-medium">Form submitted successfully!</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-md border border-gray-200 mb-6">
            <h3 className="text-md font-semibold mb-3">Submission Details</h3>
            <pre className="font-mono text-sm overflow-x-auto">
              {JSON.stringify(submittedValues, null, 2)}
            </pre>
          </div>
          
          <button
            onClick={handleReset}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Start Over
          </button>
        </div>
      ) : (
        <DynamicForm 
          schema={schema}
          initialValues={formValues}
          onSubmit={handleSubmit}
          onChange={handleChange}
          showDebugInfo={showDebugInfo}
          className="w-full"
          formClassName="space-y-4"
        />
      )}
    </div>
  );
};

// PropTypes for component
FormContainer.propTypes = {
  schema: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    fields: PropTypes.arrayOf(PropTypes.object).isRequired,
    buttonText: PropTypes.string,
    validationRules: PropTypes.arrayOf(PropTypes.object)
  }).isRequired,
  initialValues: PropTypes.object,
  onSubmit: PropTypes.func,
  showDebugInfo: PropTypes.bool
};

export default FormContainer;